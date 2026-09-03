export interface CompassEvent {
  direction: number;
  accuracy: number | string;
}
export interface DeviceMotionEvent {
  /**
   * WeChat reports alpha/beta/gamma in radians. The page converts them at its
   * observation boundary; this port only preserves the native values.
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
};

function supportsDeviceMotion(port: CompassPort): boolean {
  return (
    typeof port.onDeviceMotionChange === "function" &&
    typeof port.offDeviceMotionChange === "function" &&
    typeof port.startDeviceMotionListening === "function" &&
    typeof port.stopDeviceMotionListening === "function"
  );
}

function startDeviceMotion(port: CompassPort): Promise<void> {
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
        interval: "ui",
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

async function stopDeviceMotion(port: CompassPort): Promise<void> {
  await port.stopDeviceMotionListening!();
}

function nativeCoordinator(port: CompassPort, initialRequireDeviceMotion: boolean) {
  let requireDeviceMotion = initialRequireDeviceMotion;
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

    if (installedMotion) {
      try {
        port.offDeviceMotionChange!(installedMotion.listener);
        installedMotion = null;
      } catch (error) {
        releaseFailed = true;
        releaseError ??= error;
      }
    }
    if (installed) {
      try {
        port.offCompassChange(installed.listener);
        installed = null;
      } catch (error) {
        releaseFailed = true;
        releaseError ??= error;
      }
    }
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
    configure(options: { requireDeviceMotion?: boolean }) {
      requireDeviceMotion = requireDeviceMotion || options.requireDeviceMotion === true;
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
    ): Promise<void> {
      if (desired?.owner === owner) return tail;

      const session: Session = motionListener
        ? { owner, listener, motionListener, failed }
        : { owner, listener, failed };
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

          installed = {
            owner,
            listener: (event) => {
              if (desired === session) listener(event);
            },
          };
          port.onCompassChange(installed.listener);
          mayBeRunning = true;

          if (session.motionListener && supportsDeviceMotion(port)) {
            installedMotion = {
              owner,
              listener: (event) => {
                if (desired === session) session.motionListener!(event);
              },
            };
            port.onDeviceMotionChange!(installedMotion.listener);
            motionMayBeRunning = true;
            await startDeviceMotion(port);
          }

          await port.startCompass();
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
  options: { requireDeviceMotion?: boolean } = {},
) {
  let shared = coordinators.get(port);
  if (!shared) {
    shared = nativeCoordinator(port, options.requireDeviceMotion === true);
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
      return coordinator.start(owner, listener, failed, motionListener);
    },
    stop() {
      return coordinator.stop(owner);
    },
  };
}
