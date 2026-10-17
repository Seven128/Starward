type Read<T> = { controller: AbortController; consumers: Set<symbol>; promise: Promise<T> };

/** In-flight identity and consumer cancellation only. Domain owners retain
 * admission limits, deadlines, completed caches and publication validation. */
export class SharedReadPool<T> {
  private readonly jobs = new Map<string, Read<T>>();
  private closed: Error | null = null;

  constructor(private readonly cancellation: () => Error) {}

  async run(key: string, read: (controller: AbortController) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.closed) throw this.closed;
    signal?.throwIfAborted();
    let job = this.jobs.get(key);
    if (job?.controller.signal.aborted) {
      // Do not inherit an abandoned reader or take a second domain slot before
      // it settles. A waiting successor may still cancel independently.
      const settled = job.promise.then(() => undefined, () => undefined);
      await new Promise<void>((resolve, reject) => {
        const cancel = () => { signal?.removeEventListener("abort", cancel); reject(signal?.reason); };
        signal?.addEventListener("abort", cancel, { once: true });
        settled.then(() => { signal?.removeEventListener("abort", cancel); resolve(); });
        if (signal?.aborted) cancel();
      });
      return this.run(key, read, signal);
    }
    if (!job) {
      const controller = new AbortController();
      const promise = Promise.resolve().then(() => { controller.signal.throwIfAborted(); return read(controller); });
      const owned: Read<T> = { controller, consumers: new Set(), promise: promise.finally(() => {
        if (this.jobs.get(key) === owned) this.jobs.delete(key);
      }) };
      this.jobs.set(key, owned); job = owned;
    }
    const shared = job, consumer = Symbol();
    shared.consumers.add(consumer);
    return new Promise<T>((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        signal?.removeEventListener("abort", cancel);
        shared.controller.signal.removeEventListener("abort", cancel);
        shared.consumers.delete(consumer);
      };
      const cancel = () => {
        if (finished) return; finished = true; cleanup();
        const reason = signal?.aborted ? signal.reason : shared.controller.signal.reason;
        if (shared.consumers.size === 0 && !shared.controller.signal.aborted) shared.controller.abort(this.cancellation());
        reject(reason);
      };
      signal?.addEventListener("abort", cancel, { once: true });
      shared.controller.signal.addEventListener("abort", cancel, { once: true });
      shared.promise.then(value => {
        if (finished) return; finished = true; cleanup(); resolve(value);
      }, error => { if (finished) return; finished = true; cleanup(); reject(error); });
      if (signal?.aborted || shared.controller.signal.aborted) cancel();
    });
  }

  close(reason: Error) {
    this.closed ??= reason;
    for (const job of this.jobs.values()) job.controller.abort(reason);
  }
}
