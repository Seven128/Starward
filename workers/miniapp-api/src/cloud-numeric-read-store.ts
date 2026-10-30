import type { CloudNumericFrame } from "@starward/miniapp-contracts";
import { SharedReadPool } from "./shared-read-pool.ts";

export interface CloudNumericReadIdentity {
  manifestSha256: string;
  frameIndex: number;
  valuesSha256: string;
  maskSha256: string;
}
export interface CloudNumericReadBudget {
  /** Independent waiting frame keys; same-key readers share one queue entry. */
  maxQueued?: number;
  maximumCachedBytes?: number;
}
type Admission = {
  signal: AbortSignal;
  grant: (release: () => void) => void;
  reject: (reason: unknown) => void;
  cancel: () => void;
};
const hash = (value: string) => /^[a-f0-9]{64}$/u.test(value);
const error = (code: string) => new Error(`cloud_publication_${code}`);

/** Process-local, cross-run numeric work owner. Two active frame reads retain
 * the previous admission limit. Queue 8 and cache 8 MiB are bounded development
 * defaults (four measured ~1.93 MB frames), not production capacity claims.
 * Callbacks must settle only after all of their owned file operations drain. */
export class CloudNumericReadStore {
  private readonly shared = new SharedReadPool<CloudNumericFrame>(() => error("read_cancelled"));
  private readonly cache = new Map<string, { frame: CloudNumericFrame; bytes: number }>();
  private readonly work = new Set<Promise<CloudNumericFrame>>();
  private readonly queue: Admission[] = [];
  private readonly maxQueued: number;
  private readonly maximumCachedBytes: number;
  private cachedBytes = 0;
  private active = 0;
  private closed: Error | null = null;
  private draining: Promise<void> | null = null;

  constructor(budget: CloudNumericReadBudget = {}) {
    this.maxQueued = budget.maxQueued ?? 8;
    this.maximumCachedBytes = budget.maximumCachedBytes ?? 8 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxQueued) || this.maxQueued < 0
      || !Number.isSafeInteger(this.maximumCachedBytes) || this.maximumCachedBytes < 0)
      throw error("read_budget_invalid");
  }

  async read(identity: CloudNumericReadIdentity, read: (controller: AbortController) => Promise<CloudNumericFrame>, signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (this.closed) throw this.closed;
    if (!hash(identity.manifestSha256) || !hash(identity.valuesSha256) || !hash(identity.maskSha256)
      || !Number.isSafeInteger(identity.frameIndex) || identity.frameIndex < 0) throw error("read_identity_invalid");
    const key = `${identity.manifestSha256}:${identity.frameIndex}:${identity.valuesSha256}:${identity.maskSha256}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key); this.cache.set(key, cached);
      return cached.frame;
    }
    return this.shared.run(key, controller => {
      const operation = this.perform(key, read, controller);
      this.work.add(operation);
      void operation.then(() => this.work.delete(operation), () => this.work.delete(operation));
      return operation;
    }, signal);
  }

  private async perform(key: string, read: (controller: AbortController) => Promise<CloudNumericFrame>, controller: AbortController) {
    const release = await this.admit(controller.signal);
    try {
      controller.signal.throwIfAborted();
      const frame = await read(controller);
      controller.signal.throwIfAborted();
      if (this.closed) throw this.closed;
      // Count actual retained backing stores, not only a potentially tiny view.
      const buffers = new Set([frame.values.buffer, frame.mask.buffer]);
      const bytes = [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
      if (bytes <= this.maximumCachedBytes) {
        while (this.cachedBytes + bytes > this.maximumCachedBytes && this.cache.size) {
          const oldest = this.cache.keys().next().value!;
          this.cachedBytes -= this.cache.get(oldest)!.bytes;
          this.cache.delete(oldest);
        }
        this.cache.set(key, { frame, bytes });
        this.cachedBytes += bytes;
      }
      return frame;
    } finally { release(); }
  }

  private admit(signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted();
    if (this.closed) throw this.closed;
    if (this.active < 2 && this.queue.length === 0) {
      this.active++;
      return Promise.resolve(this.releaseOnce());
    }
    if (this.queue.length >= this.maxQueued) throw error("read_queue_full");
    return new Promise((grant, reject) => {
      const entry: Admission = { signal, grant, reject, cancel: () => {
        const at = this.queue.indexOf(entry);
        if (at < 0) return;
        this.queue.splice(at, 1);
        signal.removeEventListener("abort", entry.cancel);
        reject(signal.reason);
      } };
      this.queue.push(entry);
      signal.addEventListener("abort", entry.cancel, { once: true });
      if (signal.aborted) entry.cancel();
    });
  }

  private releaseOnce() {
    let released = false;
    return () => {
      if (released) return;
      released = true; this.active--;
      while (!this.closed && this.active < 2 && this.queue.length) {
        const next = this.queue.shift()!;
        next.signal.removeEventListener("abort", next.cancel);
        if (next.signal.aborted) { next.reject(next.signal.reason); continue; }
        this.active++;
        next.grant(this.releaseOnce());
      }
    };
  }

  /** The registry owns an injected store and may await real file drain at shutdown. */
  close(): Promise<void> {
    if (this.draining) return this.draining;
    this.closed = error("read_store_closed");
    this.shared.close(this.closed);
    this.cache.clear(); this.cachedBytes = 0;
    this.draining = Promise.allSettled([...this.work]).then(() => undefined);
    return this.draining;
  }
}
