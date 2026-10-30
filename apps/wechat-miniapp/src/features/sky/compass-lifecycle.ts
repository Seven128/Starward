import { reportRuntimeError } from "../../services/runtime-error";

export interface CompassEvent {
  direction: number;
  accuracy: number | string;
}
export interface DeviceMotionEvent {
  /**
   * WeChat's public contract reports radians. The page observation boundary
   * also normalizes Android clients that emit equivalent degree ranges; this
   * port preserves native values so that decision stays at the edge.
   */
  alpha: number;
  beta: number;
  gamma: number;
}

type CompassListener = (event: CompassEvent) => void;
type MotionListener = (event: DeviceMotionEvent) => void;

export interface DeviceMotionStartOptions {
  interval?: "game" | "ui" | "normal";
  success?: (result?: unknown) => void;
  fail?: (error: unknown) => void;
}

export interface CompassPort {
  onCompassChange(listener: CompassListener): void;
  offCompassChange(listener: CompassListener): void;
  startCompass(): Promise<unknown>;
  stopCompass(): Promise<unknown>;
  onDeviceMotionChange?: (listener: MotionListener) => void;
  offDeviceMotionChange?: (listener: MotionListener) => void;
  startDeviceMotionListening?: (
    options: DeviceMotionStartOptions,
  ) => void | Promise<unknown>;
  stopDeviceMotionListening?: () => void | Promise<unknown>;
}

type Session = {
  owner: object;
  listener: CompassListener;
  motionListener?: MotionListener;
  failed: (error: unknown) => void;
  motionInterval?: DeviceMotionStartOptions["interval"];
  compassOptional?: boolean;
  compassUnavailable?: (error: unknown) => void;
};

function supportsDeviceMotion(port: CompassPort): boolean {
  return (
    typeof port.onDeviceMotionChange === "function" &&
    typeof port.offDeviceMotionChange === "function" &&
    typeof port.startDeviceMotionListening === "function" &&
    typeof port.stopDeviceMotionListening === "function"
  );
}

function startDeviceMotion(port: CompassPort, interval: DeviceMotionStartOptions["interval"] = "ui"): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const succeed = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const fail = (error: unknown) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    try {
      const result = port.startDeviceMotionListening!({
        interval,
        success: succeed,
        fail,
      });
      if (
        result &&
        typeof (result as PromiseLike<unknown>).then === "function"
      ) {
        void (result as PromiseLike<unknown>).then(succeed, fail);
      }
    } catch (error) {
      fail(error);
    }
  });
}

function orientationErrorDetail(error: unknown) {
  return error instanceof Error
    ? error.message
    : error && typeof error === "object" && "errMsg" in error
      ? String((error as { errMsg?: unknown }).errMsg ?? "")
      : String(error ?? "");
}

function orientationStartError(stage: "device_motion" | "compass", error: unknown) {
  const detail = orientationErrorDetail(error);
  return Object.assign(new Error(`${stage}_start_failed:${detail}`), { cause: error });
}

function compassAlreadyActive(error: unknown) {
  return /already|duplicate/u.test(orientationErrorDetail(error).toLowerCase());
}

export function orientationStartFailureDiagnostic(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  const stage = message.startsWith("device_motion_start_failed:")
    ? "device_motion_start_failed"
    : message.startsWith("compass_start_failed:")
      ? "compass_start_failed"
      : "orientation_start_failed";
  const reason = /permission|authorize|auth|den(?:y|ied)/u.test(message)
    ? "permission_denied"
    : /already|duplicate/u.test(message)
      ? "already_active"
      : /not support|unsupported|unavailable/u.test(message)
        ? "unsupported"
        : /frequen|too many/u.test(message)
          ? "too_frequent"
          : /system/u.test(message)
            ? "system_error"
            : "unknown";
  const numericCode = message.match(/(?:err(?:or)?code\D*|code\D*)(-?\d{3,})/u)?.[1];
  return `${stage}:${reason}${numericCode ? `:code_${numericCode}` : ""}`;
}

async function stopDeviceMotion(port: CompassPort): Promise<void> {
  await port.stopDeviceMotionListening!();
}

// Cached by the long-lived native port. Prototype methods must remain outside
// controller creation even when the compressor inlines the lifecycle factory.
class NativeCompassCoordinator {
  private desired: Session | null = null;
  private installed: { owner: object; listener: CompassListener } | null = null;
  private installedMotion: { owner: object; listener: MotionListener } | null = null;
  private mayBeRunning = false;
  private motionMayBeRunning = false;
  private tail = Promise.resolve();

  constructor(
    private readonly port: CompassPort,
    private requireDeviceMotion: boolean,
    private listenerStartsCompass: boolean,
  ) {}

  private async release() {
    // Preserve uncertain ownership on failure so the next request retries cleanup.
    let releaseError: unknown;
    let releaseFailed = false;
    const failedRelease = (stage: string, error: unknown) => {
      releaseFailed = true;
      releaseError ??= error;
      reportRuntimeError("native", "sky_orientation_release_failed", error, { stage });
    };

    // Removing the last WeChat listener can disable its native stream. Stop
    // first and await acknowledgement. A failed stop retains its listener so
    // detachment cannot disable the stream behind the next cleanup retry.
    // `desired` already invalidates callbacks during cancellation/replacement.
    if (this.motionMayBeRunning) {
      try {
        await stopDeviceMotion(this.port);
        this.motionMayBeRunning = false;
      } catch (error) {
        failedRelease("device_motion_stop", error);
      }
    }
    if (this.mayBeRunning) {
      try {
        await this.port.stopCompass();
        this.mayBeRunning = false;
      } catch (error) {
        failedRelease("compass_stop", error);
      }
    }

    if (this.installedMotion && !this.motionMayBeRunning) {
      try {
        this.port.offDeviceMotionChange!(this.installedMotion.listener);
        this.installedMotion = null;
      } catch (error) {
        failedRelease("device_motion_unlisten", error);
      }
    }
    if (this.installed && !this.mayBeRunning) {
      try {
        this.port.offCompassChange(this.installed.listener);
        this.installed = null;
      } catch (error) {
        failedRelease("compass_unlisten", error);
      }
    }

    if (releaseFailed) {
      throw releaseError ?? new Error("orientation_release_failed");
    }
  }

  private enqueue(operation: () => Promise<void>) {
    const task = this.tail.then(operation);
    this.tail = task.catch(() => undefined);
    return task;
  }

  configure(options: { requireDeviceMotion?: boolean; listenerStartsCompass?: boolean }) {
    this.requireDeviceMotion = this.requireDeviceMotion || options.requireDeviceMotion === true;
    this.listenerStartsCompass = this.listenerStartsCompass || options.listenerStartsCompass === true;
  }
  active(owner: object) {
    return this.desired?.owner === owner;
  }
  isCurrent(owner: object, listener: CompassListener) {
    return this.desired?.owner === owner && this.desired.listener === listener;
  }
  isCurrentMotion(owner: object, listener: MotionListener) {
    return this.desired?.owner === owner && this.desired.motionListener === listener;
  }
  start(
    owner: object,
    listener: CompassListener,
    failed: (error: unknown) => void,
    motionListener?: MotionListener,
    sessionOptions: Pick<Session, "motionInterval" | "compassOptional" | "compassUnavailable"> = {},
  ): Promise<void> {
    if (this.desired?.owner === owner) return this.tail;

    const session: Session = motionListener
      ? { owner, listener, motionListener, failed, ...sessionOptions }
      : { owner, listener, failed, ...sessionOptions };
    this.desired = session;
    return this.enqueue(async () => {
      if (this.desired !== session) return;
      try {
        await this.release();
        if (this.desired !== session) return;

        const motionRequired = this.requireDeviceMotion;
        if (
          motionRequired &&
          (!session.motionListener || !supportsDeviceMotion(this.port))
        ) {
          throw new Error("device_motion_unavailable");
        }

        if (session.motionListener && supportsDeviceMotion(this.port)) {
          this.installedMotion = {
            owner,
            listener: (event) => {
              if (this.desired === session) session.motionListener!(event);
            },
          };
          this.port.onDeviceMotionChange!(this.installedMotion.listener);
          this.motionMayBeRunning = true;
          try {
            await startDeviceMotion(this.port, session.motionInterval);
          } catch (error) {
            throw orientationStartError("device_motion", error);
          }
          if (this.desired !== session) {
            await this.release();
            return;
          }
        }

        if (!this.listenerStartsCompass) {
          try {
            await this.port.startCompass();
          } catch (error) {
            // Some clients report a duplicate when listener registration
            // has already resumed the stream before the explicit restart.
            if (!compassAlreadyActive(error)) {
              // A valid full-attitude stream can use the compass solely
              // for quality metadata. Its failure must not stop motion.
              if (session.compassOptional && this.installedMotion && this.desired === session) {
                reportRuntimeError("native", "sky_compass_start_failed", error, { stage: "optional_compass" });
                session.compassUnavailable?.(error);
                return;
              }
              throw orientationStartError("compass", error);
            }
          }
          this.mayBeRunning = true;
        }

        // WeChat's listener registration can itself start the compass.  An
        // explicit start must therefore happen first, otherwise the two
        // starts race and some Android clients return an opaque `fail`.
        this.installed = {
          owner,
          listener: (event) => {
            if (this.desired === session) listener(event);
          },
        };
        this.port.onCompassChange(this.installed.listener);
        this.mayBeRunning = true;
        // Native starts have no cancellation handle; compensate after they settle.
        if (this.desired !== session) await this.release();
      } catch (error) {
        reportRuntimeError("native", "sky_orientation_start_failed", error,
          { stage: orientationStartFailureDiagnostic(error) });
        if (this.desired === session) {
          this.desired = null;
          failed(error);
        }
        try {
          await this.release();
        } catch {
          // Ownership remains uncertain; the next request retries cleanup.
        }
      }
    });
  }
  stop(owner: object): Promise<boolean> {
    if (this.desired?.owner === owner) this.desired = null;
    return this.enqueue(async () => {
      // A late cleanup from an old page must not stop its replacement page.
      if (
        this.installed?.owner === owner ||
        this.installedMotion?.owner === owner ||
        (this.mayBeRunning && !this.installed) ||
        (this.motionMayBeRunning && !this.installedMotion)
      ) {
        await this.release();
      }
    }).then(
      () => true,
      () => false,
    );
  }
}

// Native orientation state is shared by pages using the same public platform port.
const coordinators = new WeakMap<
  CompassPort,
  NativeCompassCoordinator
>();

export function createCompassLifecycle(
  port: CompassPort,
  options: { requireDeviceMotion?: boolean; listenerStartsCompass?: boolean;
    motionInterval?: DeviceMotionStartOptions["interval"]; compassOptional?: boolean;
    compassUnavailable?: (error: unknown) => void } = {},
) {
  let shared = coordinators.get(port);
  if (!shared) {
    shared = new NativeCompassCoordinator(
      port,
      options.requireDeviceMotion === true,
      options.listenerStartsCompass === true,
    );
    coordinators.set(port, shared);
  } else {
    shared.configure(options);
  }
  const coordinator = shared;
  const owner = {};
  return {
    get active() {
      return coordinator.active(owner);
    },
    isCurrent(listener: CompassListener) {
      return coordinator.isCurrent(owner, listener);
    },
    isCurrentMotion(listener: MotionListener) {
      return coordinator.isCurrentMotion(owner, listener);
    },
    start(
      listener: CompassListener,
      failed: (error: unknown) => void,
      motionListener?: MotionListener,
    ) {
      return coordinator.start(owner, listener, failed, motionListener, options);
    },
    stop() {
      return coordinator.stop(owner);
    },
  };
}
