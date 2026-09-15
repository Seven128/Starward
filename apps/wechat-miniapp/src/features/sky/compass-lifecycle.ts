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
  return new Error(`${stage}_start_failed:${detail}`);
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

function nativeCoordinator(
  port: CompassPort,
  initialRequireDeviceMotion: boolean,
  initialListenerStartsCompass: boolean,
) {
  let requireDeviceMotion = initialRequireDeviceMotion;
  let listenerStartsCompass = initialListenerStartsCompass;
  let desired: Session | null = null;
  let installed: { owner: object; listener: CompassListener } | null = null;
  let installedMotion: { owner: object; listener: MotionListener } | null = null;
  let mayBeRunning = false;
  let motionMayBeRunning = false;
  let tail = Promise.resolve();

  const release = async () => {
    // Preserve uncertain ownership on failure so the next request retries cleanup.
    let releaseError: unknown;
    let releaseFailed = false;

    // Removing the last WeChat listener can disable its native stream. Stop
    // first and await acknowledgement. A failed stop retains its listener so
    // detachment cannot disable the stream behind the next cleanup retry.
    // `desired` already invalidates callbacks during cancellation/replacement.
    if (motionMayBeRunning) {
      try {
        await stopDeviceMotion(port);
        motionMayBeRunning = false;
      } catch (error) {
        releaseFailed = true;
        releaseError ??= error;
      }
    }
    if (mayBeRunning) {
      try {
        await port.stopCompass();
        mayBeRunning = false;
      } catch (error) {
        releaseFailed = true;
        releaseError ??= error;
      }
    }

    if (installedMotion && !motionMayBeRunning) {
      try {
        port.offDeviceMotionChange!(installedMotion.listener);
        installedMotion = null;
      } catch (error) {
        releaseFailed = true;
        releaseError ??= error;
      }
    }
    if (installed && !mayBeRunning) {
      try {
        port.offCompassChange(installed.listener);
        installed = null;
      } catch (error) {
        releaseFailed = true;
        releaseError ??= error;
      }
    }

    if (releaseFailed) {
      throw releaseError ?? new Error("orientation_release_failed");
    }
  };

  const enqueue = (operation: () => Promise<void>) => {
    const task = tail.then(operation);
    tail = task.catch(() => undefined);
    return task;
  };

  return {
    configure(options: { requireDeviceMotion?: boolean; listenerStartsCompass?: boolean }) {
      requireDeviceMotion = requireDeviceMotion || options.requireDeviceMotion === true;
      listenerStartsCompass = listenerStartsCompass || options.listenerStartsCompass === true;
    },
    active(owner: object) {
      return desired?.owner === owner;
    },
    isCurrent(owner: object, listener: CompassListener) {
      return desired?.owner === owner && desired.listener === listener;
    },
    isCurrentMotion(owner: object, listener: MotionListener) {
      return desired?.owner === owner && desired.motionListener === listener;
    },
    start(
      owner: object,
      listener: CompassListener,
      failed: (error: unknown) => void,
      motionListener?: MotionListener,
      sessionOptions: Pick<Session, "motionInterval" | "compassOptional" | "compassUnavailable"> = {},
    ): Promise<void> {
      if (desired?.owner === owner) return tail;

      const session: Session = motionListener
        ? { owner, listener, motionListener, failed, ...sessionOptions }
        : { owner, listener, failed, ...sessionOptions };
      desired = session;
      return enqueue(async () => {
        if (desired !== session) return;
        try {
          await release();
          if (desired !== session) return;

          const motionRequired = requireDeviceMotion;
          if (
            motionRequired &&
            (!session.motionListener || !supportsDeviceMotion(port))
          ) {
            throw new Error("device_motion_unavailable");
          }

          if (session.motionListener && supportsDeviceMotion(port)) {
            installedMotion = {
              owner,
              listener: (event) => {
                if (desired === session) session.motionListener!(event);
              },
            };
            port.onDeviceMotionChange!(installedMotion.listener);
            motionMayBeRunning = true;
            try {
              await startDeviceMotion(port, session.motionInterval);
            } catch (error) {
              throw orientationStartError("device_motion", error);
            }
            if (desired !== session) {
              await release();
              return;
            }
          }

          if (!listenerStartsCompass) {
            try {
              await port.startCompass();
            } catch (error) {
              // Some clients report a duplicate when listener registration
              // has already resumed the stream before the explicit restart.
              if (!compassAlreadyActive(error)) {
                // A valid full-attitude stream can use the compass solely
                // for quality metadata. Its failure must not stop motion.
                if (session.compassOptional && installedMotion && desired === session) {
                  session.compassUnavailable?.(error);
                  return;
                }
                throw orientationStartError("compass", error);
              }
            }
            mayBeRunning = true;
          }

          // WeChat's listener registration can itself start the compass.  An
          // explicit start must therefore happen first, otherwise the two
          // starts race and some Android clients return an opaque `fail`.
          installed = {
            owner,
            listener: (event) => {
              if (desired === session) listener(event);
            },
          };
          port.onCompassChange(installed.listener);
          mayBeRunning = true;
          // Native starts have no cancellation handle; compensate after they settle.
          if (desired !== session) await release();
        } catch (error) {
          if (desired === session) {
            desired = null;
            failed(error);
          }
          try {
            await release();
          } catch {
            // Ownership remains uncertain; the next request retries cleanup.
          }
        }
      });
    },
    stop(owner: object): Promise<boolean> {
      if (desired?.owner === owner) desired = null;
      return enqueue(async () => {
        // A late cleanup from an old page must not stop its replacement page.
        if (
          installed?.owner === owner ||
          installedMotion?.owner === owner ||
          (mayBeRunning && !installed) ||
          (motionMayBeRunning && !installedMotion)
        ) {
          await release();
        }
      }).then(
        () => true,
        () => false,
      );
    },
  };
}

// Native orientation state is shared by pages using the same public platform port.
const coordinators = new WeakMap<
  CompassPort,
  ReturnType<typeof nativeCoordinator>
>();

export function createCompassLifecycle(
  port: CompassPort,
  options: { requireDeviceMotion?: boolean; listenerStartsCompass?: boolean;
    motionInterval?: DeviceMotionStartOptions["interval"]; compassOptional?: boolean;
    compassUnavailable?: (error: unknown) => void } = {},
) {
  let shared = coordinators.get(port);
  if (!shared) {
    shared = nativeCoordinator(
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
