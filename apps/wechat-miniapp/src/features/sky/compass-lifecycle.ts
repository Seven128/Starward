export interface CompassEvent {
  direction: number;
  accuracy: number | string;
}
type Listener = (event: CompassEvent) => void;
interface CompassPort {
  onCompassChange(listener: Listener): void;
  offCompassChange(listener: Listener): void;
  startCompass(): Promise<unknown>;
  stopCompass(): Promise<unknown>;
}

type Session = { owner: object; listener: Listener; failed: (error: unknown) => void };

function nativeCoordinator(port: CompassPort) {
  let desired: Session | null = null;
  let installed: { owner: object; listener: Listener } | null = null;
  let mayBeRunning = false;
  let tail = Promise.resolve();

  const release = async () => {
    // Preserve uncertain ownership on failure so the next request retries cleanup.
    let detachError: unknown;
    if (installed) {
      try { port.offCompassChange(installed.listener); installed = null; }
      catch (error) { detachError = error; }
    }
    if (mayBeRunning) {
      await port.stopCompass();
      mayBeRunning = false;
    }
    if (installed) throw detachError;
  };
  const enqueue = (operation: () => Promise<void>) => {
    const task = tail.then(operation);
    tail = task.catch(() => undefined);
    return task;
  };

  return {
    active(owner: object) { return desired?.owner === owner; },
    isCurrent(owner: object, listener: Listener) { return desired?.owner === owner && desired.listener === listener; },
    start(owner: object, listener: Listener, failed: (error: unknown) => void): Promise<void> {
      if (desired?.owner === owner) return tail;
      const session = { owner, listener, failed };
      desired = session;
      return enqueue(async () => {
        if (desired !== session) return;
        try {
          await release();
          if (desired !== session) return;
          installed = { owner, listener: (event) => { if (desired === session) listener(event); } };
          port.onCompassChange(installed.listener);
          mayBeRunning = true;
          await port.startCompass();
          // Native start has no cancellation handle; compensate after it settles.
          if (desired !== session) await release();
        } catch (error) {
          if (desired === session) {
            desired = null;
            failed(error);
          }
          try { await release(); } catch { /* ownership remains uncertain */ }
        }
      });
    },
    stop(owner: object): Promise<boolean> {
      if (desired?.owner === owner) desired = null;
      return enqueue(async () => {
        // A late cleanup from an old page must not stop its replacement page.
        if (installed?.owner === owner || (mayBeRunning && !installed)) await release();
      }).then(() => true, () => false);
    },
  };
}

// Native compass state is shared by pages using the same public platform port.
const coordinators = new WeakMap<CompassPort, ReturnType<typeof nativeCoordinator>>();
export function createCompassLifecycle(port: CompassPort) {
  let shared = coordinators.get(port);
  if (!shared) { shared = nativeCoordinator(port); coordinators.set(port, shared); }
  const coordinator = shared;
  const owner = {};
  return {
    get active() { return coordinator.active(owner); },
    isCurrent(listener: Listener) { return coordinator.isCurrent(owner, listener); },
    start(listener: Listener, failed: (error: unknown) => void) { return coordinator.start(owner, listener, failed); },
    stop() { return coordinator.stop(owner); },
  };
}
