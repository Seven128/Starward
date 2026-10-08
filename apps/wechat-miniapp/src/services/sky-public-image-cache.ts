import type { SkyEncodedImage } from "./sky-image-bytes";
import { matchesSkyFileBytes, sameSkyEncodedFileBinding, skyEncodedFileBinding, type SkyEncodedFile } from "./sky-public-file-bytes";

export interface PublicSkyImageDescriptor extends SkyEncodedImage {
  /** Hash of the approved server environment, never an account/cache key. */
  environment: string;
  url: string;
}
export type PublicSkyFileDescriptor = SkyEncodedFile & { environment: string; url: string };
export interface SkyPublicImageLease {
  filePath: string;
  isCurrent(): boolean;
  onRetire(handler: () => void): () => void;
  release(): void;
}
export interface SkyPublicImageAcquisition { promise: Promise<SkyPublicImageLease>; cancel(): void }
export interface SkyPublicImageFileSystem {
  mkdir(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  size(path: string): Promise<number>;
  read(path: string, length: number): Promise<ArrayBuffer>;
  write(path: string, data: ArrayBuffer): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Idempotent for a missing file; other native errors must reject. */
  remove(path: string): Promise<void>;
}
export interface SkyPublicImageTransfer {
  promise: Promise<ArrayBuffer>;
  cancel(): void;
}
type Entry = SkyEncodedFile & {
  environment: string;
  file: string;
  last: number;
  refs: number;
  retired: boolean;
  listeners: Set<() => void>;
};
interface Pending {
  asset: PublicSkyFileDescriptor;
  epoch: number;
  waiters: Set<{ resolve(lease: SkyPublicImageLease): void; reject(error: Error): void }>;
  cancelled: boolean;
  transfer?: SkyPublicImageTransfer;
}
const HASH = /^[a-f0-9]{64}$/;
const FILE = /^[a-f0-9]{64}-[a-f0-9]{64}-[a-z0-9_]+-[1-9]\d*\.(?:png|jpg|json)$/;
// Older image-only owners sweep this disposable namespace on boot/clear.
// Committed catalog bytes retain their JSON descriptor and v2 inventory; the
// name permits rollback cleanup without masquerading as a PNG/JPEG file.
const CATALOG_FILE = /^stage-catalog_[a-f0-9]{64}_[a-f0-9]{64}_[a-z0-9_]+-[1-9]\d*$/;
const STAGING = /^stage-[a-z0-9_]+-[1-9]\d*$/;
const INDEX_STAGING = /^index-[a-z0-9_]+-[1-9]\d*\.stage$/;
const INDEX = "index-v2.json", LEGACY_INDEX = "index-v1.json";
const MAX_INDEX_BYTES = 256 * 1024;
const error = (code: string) => new Error(`sky_public_image_${code}`);
const key = (asset: Pick<PublicSkyFileDescriptor, "environment" | "sha256" | "format">) =>
  `${asset.environment}:${asset.sha256}:${asset.format}`;
const catalogFile = (asset: Pick<PublicSkyFileDescriptor, "environment" | "sha256">, id: string) =>
  `stage-catalog_${asset.environment}_${asset.sha256}_${id}`;
const boundFile = (asset: SkyEncodedFile & { environment: string }, file: string) =>
  asset.format === "json" && CATALOG_FILE.test(file) ? file.startsWith(`stage-catalog_${asset.environment}_${asset.sha256}_`) :
    FILE.test(file) && file.startsWith(`${asset.environment}-${asset.sha256}-`) &&
    file.endsWith(asset.format === "png" ? ".png" : asset.format === "json" ? ".json" : ".jpg");
const ascii = (text: string) => Uint8Array.from(text, c => c.charCodeAt(0)).buffer;
const text = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), v => String.fromCharCode(v)).join("");
function validAsset(value: SkyEncodedFile & { environment: string }, max: number) {
  if (!HASH.test(value.environment) || !HASH.test(value.sha256) || !Number.isSafeInteger(value.bytes) ||
    value.bytes < 1 || value.bytes > max) return false;
  if (value.format === "json") return !("width" in value) && !("height" in value);
  return (value.format === "png" || value.format === "jpeg") && value.bytes >= 24 && Number.isSafeInteger(value.width) &&
    Number.isSafeInteger(value.height) && value.width > 0 && value.height > 0 &&
    value.width <= 8192 && value.height <= 8192 && value.width * value.height <= 16 * 1024 * 1024;
}

/** One owner of public encoded files. Canvas/GPU owners hold leases, never
 * remove paths. Actual native I/O occupies its slot until its promise settles.
 * Committed paths retain attempt identity, so an old callback cannot delete a
 * replacement of the same content after clear/cancellation. */
export function createSkyPublicImageCache(deps: {
  fs: SkyPublicImageFileSystem;
  root: string;
  byteBudget: number;
  maxFileBytes: number;
  session: string;
  transfer(asset: PublicSkyFileDescriptor): SkyPublicImageTransfer;
  now?: () => number;
  cleanupWaitMs?: number;
}) {
  if (!/^[a-z0-9_]+$/.test(deps.session) || !deps.root || !Number.isSafeInteger(deps.byteBudget) ||
    deps.byteBudget < 24 || deps.maxFileBytes > deps.byteBudget || deps.maxFileBytes < 24) throw error("config_invalid");
  const root = deps.root.replace(/\/+$/, ""), path = (file: string) => `${root}/${file}`;
  const now = deps.now ?? Date.now, entries = new Map<string, Entry>(), retired = new Set<Entry>();
  const pending = new Map<string, Pending>(), queue: Pending[] = [], garbage = new Map<string, number>();
  let epoch = 0, sequence = 0, running = 0, reserved = 0, failures = 0;
  const abort = (job: Pending) => {
    try { job.transfer?.cancel(); return true; }
    catch { failures++; return false; }
  };
  let mutations: Promise<unknown> = Promise.resolve();
  const serial = <T>(run: () => Promise<T>): Promise<T> => {
    const result = mutations.then(run); mutations = result.catch(() => undefined); return result;
  };
  const ownFile = (name: string) => FILE.test(name) || STAGING.test(name) || INDEX_STAGING.test(name);
  const remove = async (file: string) => {
    try { await deps.fs.remove(path(file)); garbage.delete(file); return true; }
    catch {
      failures++;
      if (![...entries.values(), ...retired].some(entry => entry.file === file)) {
        let size = INDEX_STAGING.test(file) ? MAX_INDEX_BYTES : deps.maxFileBytes;
        try { size = await deps.fs.size(path(file)); } catch { /* Reserve conservatively when native stat fails. */ }
        garbage.set(file, size);
      }
      return false;
    }
  };
  const bytesUsed = () => [...entries.values(), ...retired].reduce((n, entry) => n + entry.bytes, 0) +
    [...garbage.values()].reduce((n, bytes) => n + bytes, 0);
  const readExact = async (file: string, length: number) => {
    if (!Number.isSafeInteger(length) || length < 1 || await deps.fs.size(path(file)) !== length) throw error("read_size");
    const data = await deps.fs.read(path(file), length);
    if (data.byteLength !== length || await deps.fs.size(path(file)) !== length) throw error("read_size");
    return data;
  };
  const persist = async () => {
    const snapshot = epoch, file = `index-${deps.session}-${++sequence}.stage`;
    const body = ascii(JSON.stringify({ version: 2, entries: [...entries.values()].map(({ refs, retired: _retired, listeners: _listeners, ...entry }) => entry) }));
    if (body.byteLength > MAX_INDEX_BYTES) throw error("index_limit");
    try {
      await deps.fs.write(path(file), body);
      if (text(await readExact(file, body.byteLength)) !== text(body)) throw error("index_readback");
      if (snapshot !== epoch) throw error("cancelled");
      await deps.fs.rename(path(file), path(INDEX));
      if (text(await readExact(INDEX, body.byteLength)) !== text(body)) throw error("index_readback");
      if (snapshot !== epoch) throw error("cancelled");
    } finally { await remove(file); }
  };
  // Concurrent warm touches before the next serialized snapshot share its
  // durable index write. A touch after that snapshot starts needs a new write.
  // Leases still wait for their snapshot's verified atomic commit.
  let warmAccessWrite: Promise<void> | undefined;
  const persistWarmAccess = () => warmAccessWrite ??= serial(async () => {
    warmAccessWrite = undefined;
    await persist();
  });
  const initialize = async (bootEpoch: number) => {
    try { await deps.fs.mkdir(root); } catch { /* Existing directory is verified by the listing. */ }
    const files = await deps.fs.list(root);
    try {
      // Upgrade the known image-only inventory without orphan promotion. Once
      // v2 exists, an invalid v2 must never resurrect a stale v1 pointer.
      const sourceIndex = files.includes(INDEX) ? INDEX : LEGACY_INDEX;
      const indexSize = await deps.fs.size(path(sourceIndex));
      if (indexSize > MAX_INDEX_BYTES) throw error("index_limit");
      const value = JSON.parse(text(await readExact(sourceIndex, indexSize))) as { version?: unknown; entries?: unknown };
      if (value.version !== (sourceIndex === INDEX ? 2 : 1) || !Array.isArray(value.entries) || value.entries.length > 4096) throw error("index_invalid");
      const restored = new Map<string, Entry>();
      for (const raw of value.entries) {
        const entry = raw as Entry;
        if (!entry || !validAsset(entry, deps.maxFileBytes) || sourceIndex === LEGACY_INDEX && entry.format === "json" || typeof entry.file !== "string" || !boundFile(entry, entry.file) ||
          !Number.isFinite(entry.last) || entry.last < 0 || restored.has(key(entry))) throw error("index_invalid");
        if (files.includes(entry.file)) restored.set(key(entry), { environment: entry.environment, ...skyEncodedFileBinding(entry),
          file: entry.file, last: entry.last, refs: 0, retired: false, listeners: new Set() });
      }
      if (epoch === bootEpoch) for (const [k, entry] of restored) entries.set(k, entry);
    } catch { /* Missing/invalid index never promotes an orphan file to a hit. */ }
    // A previous v2 cache used .json, invisible to the image-only rollback's
    // cleanup/budget. Move those owned files before admitting any lease. Rename
    // changes no source bytes and every later acquisition still verifies them.
    for (const entry of entries.values()) if (entry.format === "json" && entry.file.endsWith(".json")) {
      const file = catalogFile(entry, `${deps.session}-${++sequence}`);
      await deps.fs.rename(path(entry.file), path(file)); entry.file = file;
      if (epoch !== bootEpoch) throw error("cancelled");
    }
    const kept = new Set([...entries.values()].map(entry => entry.file));
    for (const file of files) if (ownFile(file) && !kept.has(file)) await remove(file);
    // Old schema-compatible inventories still obey the current policy before
    // any warm lease is issued. Pending jobs have not started reading yet.
    await room(0, false);
    await persist();
    // The obsolete pointer owns no data after the complete v2 commit. A failed
    // removal is accounted conservatively and retried through existing room().
    if (files.includes(LEGACY_INDEX)) await remove(LEGACY_INDEX);
  };
  let initializationFailed = false;
  const firstBootEpoch = epoch;
  let boot = serial(() => initialize(firstBootEpoch));
  const observeBoot = (attempt: Promise<void>) => {
    void attempt.catch(() => { if (boot === attempt) initializationFailed = true; });
  };
  observeBoot(boot);
  const ensureBoot = (restore = true) => {
    if (initializationFailed) {
      initializationFailed = false;
      // No successful acquisition can exist after a failed initial boot.
      entries.clear();
      const scheduledEpoch = restore ? epoch : -1;
      boot = serial(() => initialize(scheduledEpoch)); observeBoot(boot);
    }
    return boot;
  };
  const retire = (entry: Entry) => {
    entries.delete(key(entry)); entry.retired = true; retired.add(entry);
    for (const listener of [...entry.listeners]) { try { listener(); } catch { failures++; } }
  };
  const reap = async (entry: Entry) => {
    if (entry.refs || !entry.retired) return;
    if (await remove(entry.file)) retired.delete(entry);
  };
  const lease = (entry: Entry): SkyPublicImageLease => {
    entry.refs++; let active = true;
    const listeners = new Set<() => void>();
    return { filePath: path(entry.file), isCurrent: () => active && !entry.retired,
      onRetire(handler) {
        if (!active || entry.retired) { handler(); return () => {}; }
        listeners.add(handler); entry.listeners.add(handler);
        return () => { listeners.delete(handler); entry.listeners.delete(handler); };
      }, release() {
      if (!active) return; active = false; entry.refs--;
      for (const listener of listeners) entry.listeners.delete(listener); listeners.clear();
      if (entry.retired) void serial(() => reap(entry)).catch(() => { failures++; });
    } };
  };
  async function room(bytes: number, protectPending = true) {
    for (const file of [...garbage.keys()]) await remove(file);
    for (const entry of retired) await reap(entry);
    for (const entry of [...entries.values()].sort((a, b) => a.last - b.last)) {
      if (bytesUsed() + reserved + bytes <= deps.byteBudget) break;
      if (!entry.refs && (!protectPending || !pending.has(key(entry)))) { retire(entry); await reap(entry); }
    }
    if (bytesUsed() + reserved + bytes > deps.byteBudget) throw error("quota");
  }
  const current = (job: Pending) => !job.cancelled && job.epoch === epoch && job.waiters.size > 0;
  const assertCurrent = (job: Pending) => { if (!current(job)) throw error("cancelled"); };
  const run = async (job: Pending): Promise<Entry> => {
    await ensureBoot(); assertCurrent(job);
    const k = key(job.asset);
    const existing = entries.get(k);
    if (existing) {
      if (!sameSkyEncodedFileBinding(existing, job.asset))
        throw error("descriptor_conflict");
      // A pending job protects its file from LRU while readback is in flight.
      try {
        if (!matchesSkyFileBytes(await readExact(existing.file, job.asset.bytes), job.asset)) throw error("corrupt");
        assertCurrent(job); existing.last = now();
        await persistWarmAccess(); assertCurrent(job); return existing;
      } catch (cause) {
        if (!current(job)) throw cause;
        await serial(async () => { retire(existing); await reap(existing); await persist(); });
      }
    }
    let held = false;
    const id = `${deps.session}-${++sequence}`, staged = `stage-${id}`;
    const file = job.asset.format === "json" ? catalogFile(job.asset, id) :
      `${job.asset.environment}-${job.asset.sha256}-${id}.${job.asset.format === "png" ? "png" : "jpg"}`;
    try {
      await serial(async () => { assertCurrent(job); await room(job.asset.bytes); reserved += job.asset.bytes; held = true; await persist(); });
      assertCurrent(job); job.transfer = deps.transfer(job.asset);
      const data = await job.transfer.promise; assertCurrent(job);
      if (!matchesSkyFileBytes(data, job.asset)) throw error("content_invalid");
      return await serial(async () => {
        assertCurrent(job);
        await deps.fs.write(path(staged), data); assertCurrent(job);
        if (!matchesSkyFileBytes(await readExact(staged, job.asset.bytes), job.asset)) throw error("write_readback");
        assertCurrent(job); await deps.fs.rename(path(staged), path(file)); assertCurrent(job);
        if (!matchesSkyFileBytes(await readExact(file, job.asset.bytes), job.asset)) throw error("commit_readback");
        assertCurrent(job);
        const entry: Entry = { environment: job.asset.environment, ...skyEncodedFileBinding(job.asset), file, last: now(), refs: 0,
          retired: false, listeners: new Set() };
        entries.set(k, entry); reserved -= job.asset.bytes; held = false;
        try { await persist(); assertCurrent(job); }
        catch (cause) { retire(entry); await reap(entry); throw cause; }
        return entry;
      });
    } finally {
      await serial(async () => {
        if (held) { reserved -= job.asset.bytes; held = false; }
        await remove(staged);
        if (![...entries.values(), ...retired].some(entry => entry.file === file)) await remove(file);
      });
    }
  };
  const pump = () => {
    while (running < 2 && queue.length) {
      const job = queue.shift()!;
      if (!current(job)) { if (pending.get(key(job.asset)) === job) pending.delete(key(job.asset)); continue; }
      running++;
      void run(job).then(entry => {
        const deliver = current(job);
        job.cancelled = true;
        if (pending.get(key(job.asset)) === job) pending.delete(key(job.asset));
        if (!deliver) return;
        for (const waiter of job.waiters) waiter.resolve(lease(entry));
      }, cause => {
        job.cancelled = true;
        if (pending.get(key(job.asset)) === job) pending.delete(key(job.asset));
        for (const waiter of job.waiters) waiter.reject(cause instanceof Error ? cause : error("failed"));
      }).finally(() => {
        job.waiters.clear(); running--;
        if (pending.get(key(job.asset)) === job) pending.delete(key(job.asset)); pump();
      });
    }
  };
  return {
    ready: () => ensureBoot(),
    acquire(asset: PublicSkyFileDescriptor): SkyPublicImageAcquisition {
      let settled = false, cancelled = false, owned: SkyPublicImageLease | undefined;
      let resolve!: (value: SkyPublicImageLease) => void, reject!: (cause: Error) => void;
      const promise = new Promise<SkyPublicImageLease>((yes, no) => { resolve = yes; reject = no; });
      const waiter = { resolve(value: SkyPublicImageLease) { if (settled) { value.release(); return; } settled = true; owned = value; resolve(value); },
        reject(cause: Error) { if (!settled) { settled = true; reject(cause); } } };
      if (!validAsset(asset, deps.maxFileBytes) || typeof asset.url !== "string" || !asset.url) {
        waiter.reject(error("descriptor_invalid")); return { promise, cancel() {} };
      }
      const k = key(asset); let job = pending.get(k);
      if (job && !sameSkyEncodedFileBinding(job.asset, asset)) {
        waiter.reject(error("descriptor_conflict")); return { promise, cancel() {} };
      }
      if (!job || !current(job)) {
        job = { asset, epoch, waiters: new Set(), cancelled: false }; pending.set(k, job); queue.push(job);
      }
      const target = job; target.waiters.add(waiter); pump();
      return { promise, cancel() {
        if (cancelled) return; cancelled = true;
        if (owned) { owned.release(); owned = undefined; return; }
        target.waiters.delete(waiter); waiter.reject(error("cancelled"));
        if (!target.waiters.size && !target.cancelled) { target.cancelled = true; abort(target); }
      } };
    },
    async clear(): Promise<{ status: "complete" | "partial" | "pending"; files: number }> {
      epoch++;
      const cancelledJobs = [...pending.values()];
      for (const job of cancelledJobs) {
        job.cancelled = true;
        for (const waiter of job.waiters) waiter.reject(error("cancelled")); job.waiters.clear();
      }
      pending.clear(); queue.length = 0;
      for (const entry of [...entries.values()]) retire(entry);
      // Fence every consumer before invoking native abort callbacks. A throwing
      // abort must not interrupt retirement or cancellation of independent jobs.
      // Unsettled native I/O continues to own its running slot and reservation.
      let abortFailed = false;
      for (const job of cancelledJobs) if (!abort(job)) abortFailed = true;
      const initialized = ensureBoot(false);
      const cleanup = serial(async () => {
        try { await initialized; } catch (cause) {
          // clear may advance the epoch while boot writes its index. That
          // cancelled old transaction is expected; this ordered cleanup still
          // commits the empty current inventory. Other boot/I/O failures remain
          // failures and may recover only through the existing explicit retry.
          if (!(cause instanceof Error) || cause.message !== "sky_public_image_cancelled") throw cause;
        }
        for (const entry of retired) await reap(entry);
        for (const file of [...garbage.keys()]) await remove(file);
        await persist();
        return { status: abortFailed || retired.size || garbage.size ? "partial" as const : "complete" as const, files: retired.size + garbage.size };
      });
      // New acquisitions/ready callers share this cleanup, including when the
      // old boot was cancelled. A rejected old boot must not strand the owner
      // after successful clear or let a new acquisition bypass its file fence.
      initializationFailed = false;
      boot = cleanup.then(() => undefined); observeBoot(boot);
      // A native write cannot be aborted. Report pending without waiting for a
      // stuck callback; its unique attempt and epoch prohibit late publication.
      if (running) { void cleanup.catch(() => { failures++; }); return { status: "pending", files: retired.size }; }
      // Boot/unlink/index I/O may also be unabortable, even with zero image
      // acquisitions. The UI gets an honest pending result within a bound;
      // cleanup retains ownership and continues until actual callbacks settle.
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ status: "pending", files: retired.size + garbage.size }), deps.cleanupWaitMs ?? 2_000);
        void cleanup.then(value => { clearTimeout(timer); resolve(value); }, cause => { clearTimeout(timer); reject(cause); });
      });
    },
    inspect: () => ({ entries: entries.size, leased: [...entries.values(), ...retired].reduce((n, e) => n + e.refs, 0),
      bytes: bytesUsed(), reserved, running, pending: pending.size, retired: retired.size, failures, epoch }),
  };
}

export interface SkyPublicImageDemand {
  isCurrent(): boolean;
  onRetire(handler: () => void): () => void;
  release(): void;
}
