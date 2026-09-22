import type { ApiEnvelope } from "@starward/miniapp-contracts";

export const RESPONSE_CACHE_STORAGE_KEY = "starward.wechat-miniapp.response-cache.current";
const CHUNK_PREFIX = "starward.wechat-miniapp.response-cache.chunk.";
export const MAX_STALE_AGE_MS = 30 * 60_000;
export const RESPONSE_CACHE_LIMITS = Object.freeze({
  entries: 24,
  memoryBytes: 6 * 1024 * 1024,
  persistedBytes: 3 * 1024 * 1024,
  persistedItemBytes: 2 * 1024 * 1024,
  chunkBytes: 240 * 1024,
});

export interface CachedResponse {
  envelope: ApiEnvelope<unknown>;
  storedAt: number;
  readonly text: string;
}
interface MemoryEntry extends CachedResponse { bytes: number }
interface RequestFence { key: string; valid: boolean; release(): void }
interface DiskEntry {
  id: string;
  storedAt: number;
  bytes: number;
  storageBytes: number;
  chunks: number;
  checksum: number;
}
interface Storage {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, data: unknown): void;
  removeStorageSync(key: string): void;
  getStorageInfoSync(): { keys: string[] };
  setStorage(options: { key: string; data: string }): Promise<unknown>;
}

export function isResponseEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ApiEnvelope<unknown>>;
  return item.apiVersion === "v2" && typeof item.generatedAt === "string" &&
    typeof item.requestId === "string" && typeof item.etag === "string" &&
    Array.isArray(item.warnings) && Array.isArray(item.sources);
}

/** WEAPP has no guaranteed TextEncoder. Count UTF-8, including surrogate pairs. */
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0x7f) bytes++;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function checksum(text: string): number {
  // Accidental corruption detector, not an authenticity/security primitive.
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

function splitChunks(text: string): string[] {
  const parts: string[] = [];
  let start = 0, offset = 0, bytes = 0;
  while (offset < text.length) {
    const code = text.charCodeAt(offset);
    const pair = code >= 0xd800 && code <= 0xdbff && text.charCodeAt(offset + 1) >= 0xdc00 && text.charCodeAt(offset + 1) <= 0xdfff;
    const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : pair ? 4 : 3;
    if (bytes + size > RESPONSE_CACHE_LIMITS.chunkBytes) {
      parts.push(text.slice(start, offset));
      start = offset;
      bytes = 0;
    }
    bytes += size;
    offset += pair ? 2 : 1;
  }
  if (offset > start) parts.push(text.slice(start));
  return parts;
}

function chunkKey(entry: DiskEntry, index: number) { return CHUNK_PREFIX + entry.id + "." + index; }

// This response embeds GeoAPI fields licensed for live use, not storage.
const noStoreKey = (key: string) => key.startsWith("spot-recent-weather:");

/**
 * One conditional-response cache, with a larger memory budget than offline disk.
 * Bodies are copy-on-write asynchronous chunks; the small manifest is the only
 * synchronous commit point. Invalidation changes that pointer before returning,
 * so pending body writes can never publish a deleted account or invalidated key.
 * Only the requested body is read on restart; no full-cache JSON rewrite occurs.
 */
export function createResponseCache(storage: Storage, now = Date.now) {
  const memory = new Map<string, MemoryEntry>();
  let disk = new Map<string, DiskEntry>();
  const dirty = new Set<string>();
  // Only live HTTP requests retain fences. The writer's global generation is
  // separate: an unrelated prefix purge must not revoke a valid response.
  const requests = new Set<RequestFence>();
  let loaded = false, generation = 0, serial = 0;
  let cleanupFailed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;

  const fresh = (storedAt: number) => Number.isFinite(storedAt) && storedAt <= now() && now() - storedAt <= MAX_STALE_AGE_MS;
  const remove = (key: string) => {
    try { storage.removeStorageSync(key); return true; }
    catch { cleanupFailed = true; return false; }
  };
  const removeChunks = (entry: DiskEntry) => { for (let i = 0; i < entry.chunks; i++) remove(chunkKey(entry, i)); };
  const commit = (next: Map<string, DiskEntry>) => {
    storage.setStorageSync(RESPONSE_CACHE_STORAGE_KEY, { schemaVersion: 2, entries: [...next] });
    disk = next;
  };
  function boundMemory() {
    let bytes = 0, count = 0;
    for (const [key, item] of [...memory].sort((a, b) => b[1].storedAt - a[1].storedAt)) {
      if (!fresh(item.storedAt) || ++count > RESPONSE_CACHE_LIMITS.entries || bytes + item.bytes > RESPONSE_CACHE_LIMITS.memoryBytes) {
        memory.delete(key);
        dirty.delete(key);
      } else bytes += item.bytes;
    }
  }
  function boundDisk(entries: Map<string, DiskEntry>) {
    let bytes = 0, count = 0;
    for (const [key, item] of [...entries].sort((a, b) => b[1].storedAt - a[1].storedAt)) {
      if (++count > RESPONSE_CACHE_LIMITS.entries || bytes + item.storageBytes > RESPONSE_CACHE_LIMITS.persistedBytes) entries.delete(key);
      else bytes += item.storageBytes;
    }
  }
  function schedule() {
    if (timer || running) return;
    timer = setTimeout(() => { timer = undefined; void flush(); }, 0);
  }
  function load() {
    if (loaded) return;
    loaded = true;
    try {
      const value = storage.getStorageSync(RESPONSE_CACHE_STORAGE_KEY) as { schemaVersion?: number; entries?: unknown } | undefined;
      if (value && Array.isArray(value.entries)) {
        if (value.schemaVersion === 1) {
          // Legacy payload stays intact until the first complete v2 batch commit.
          for (const row of value.entries.slice(0, RESPONSE_CACHE_LIMITS.entries)) {
            if (!Array.isArray(row) || typeof row[0] !== "string" || !row[1] || !fresh(row[1].storedAt) || !isResponseEnvelope(row[1].envelope)) continue;
            const text = JSON.stringify(row[1].envelope);
            const bytes = utf8Bytes(text);
            if (bytes <= RESPONSE_CACHE_LIMITS.memoryBytes) {
              memory.set(row[0], { envelope: row[1].envelope, storedAt: row[1].storedAt, text, bytes });
              dirty.add(row[0]);
            }
          }
          boundMemory();
          if (dirty.size) schedule();
        } else if (value.schemaVersion === 2) {
          let bytes = 0;
          for (const row of value.entries.slice(0, RESPONSE_CACHE_LIMITS.entries)) {
            if (!Array.isArray(row) || typeof row[0] !== "string" || row[0].length > 4096) continue;
            const item = row[1] as DiskEntry | undefined;
            if (!item || !/^[a-z0-9-]{1,90}$/u.test(item.id) || !fresh(item.storedAt) ||
              !Number.isInteger(item.bytes) || item.bytes <= 0 || item.bytes > RESPONSE_CACHE_LIMITS.persistedItemBytes ||
              !Number.isInteger(item.storageBytes) || item.storageBytes < item.bytes || item.storageBytes > RESPONSE_CACHE_LIMITS.persistedItemBytes ||
              !Number.isInteger(item.chunks) || item.chunks < 1 || item.chunks > 9 || !Number.isInteger(item.checksum) ||
              bytes + item.storageBytes > RESPONSE_CACHE_LIMITS.persistedBytes) continue;
            disk.set(row[0], item);
            bytes += item.storageBytes;
          }
        }
      }
      // Crash leftovers, expired and rejected descriptors never become bodies.
      const active = new Set([...disk.values()].flatMap(item => Array.from({ length: item.chunks }, (_, i) => chunkKey(item, i))));
      for (const key of storage.getStorageInfoSync().keys) if (key.startsWith(CHUNK_PREFIX) && !active.has(key)) remove(key);
      // Retire both legacy whole-body entries and v2 chunks from older builds.
      if (Array.isArray(value?.entries) && value.entries.some(row => Array.isArray(row) && typeof row[0] === "string" && noStoreKey(row[0]))) invalidate(noStoreKey);
    } catch { /* Missing/corrupt cache is a miss, never invented product data. */ }
  }

  function invalidate(matches?: (key: string) => boolean) {
    load();
    const selected = matches ?? (() => true);
    // A full explicit retry also attempts leftover owned chunks from an earlier
    // failed purge; only this sweep can clear the incomplete-cleanup state.
    if (!matches) cleanupFailed = false;
    generation++;
    for (const request of requests) if (selected(request.key)) request.valid = false;
    for (const key of memory.keys()) if (selected(key)) { memory.delete(key); dirty.delete(key); }
    const previous = disk;
    const next = new Map([...disk].filter(([key]) => !selected(key)));
    try { commit(next); } catch {
      // Removing the pointer also disables legacy migration after a failed purge.
      remove(RESPONSE_CACHE_STORAGE_KEY);
      disk = new Map();
    }
    for (const [key, item] of previous) if (!disk.has(key)) removeChunks(item);
    // A clear of an uncommitted legacy cache must remove its single old payload.
    if (!disk.size && !dirty.size) remove(RESPONSE_CACHE_STORAGE_KEY);
    if (!matches) {
      try {
        for (const key of storage.getStorageInfoSync().keys)
          if (key.startsWith(CHUNK_PREFIX)) remove(key);
      } catch { cleanupFailed = true; }
    }
    return !cleanupFailed;
  }

  function get(key: string): CachedResponse | undefined {
    load();
    if (noStoreKey(key)) return undefined;
    const current = memory.get(key);
    if (current && fresh(current.storedAt)) return current;
    if (current) memory.delete(key);
    const item = disk.get(key);
    if (!item) return undefined;
    try {
      if (!fresh(item.storedAt)) throw new Error("expired");
      const chunks: string[] = [];
      for (let i = 0; i < item.chunks; i++) {
        const part = storage.getStorageSync(chunkKey(item, i));
        if (typeof part !== "string" || utf8Bytes(part) > RESPONSE_CACHE_LIMITS.chunkBytes) throw new Error("invalid chunk");
        chunks.push(part);
      }
      const text = chunks.join("");
      if (utf8Bytes(text) !== item.bytes || checksum(text) !== item.checksum) throw new Error("corrupt body");
      const envelope: unknown = JSON.parse(text);
      if (!isResponseEnvelope(envelope)) throw new Error("invalid envelope");
      const restored = { envelope, storedAt: item.storedAt, text, bytes: item.bytes };
      memory.set(key, restored);
      boundMemory();
      return restored;
    } catch { invalidate(candidate => candidate === key); return undefined; }
  }

  function currentFence(key: string, fence: RequestFence) {
    return fence.valid && fence.key === key;
  }

  function set(key: string, envelope: ApiEnvelope<unknown>, fence?: RequestFence) {
    load();
    if (noStoreKey(key)) return;
    if ((fence && !currentFence(key, fence)) || key.length > 4096) return;
    try {
      const text = JSON.stringify(envelope);
      const bytes = utf8Bytes(text);
      if (bytes > RESPONSE_CACHE_LIMITS.memoryBytes) return;
      memory.set(key, { envelope, storedAt: now(), text, bytes });
      dirty.add(key);
      boundMemory();
      schedule();
    } catch { /* A network success does not depend on JSON/cache capacity. */ }
  }

  async function persistBatch() {
    const epoch = generation;
    const batch = new Map<string, { item: MemoryEntry; descriptor: DiskEntry; chunks: string[] }>();
    const next = new Map([...disk].filter(([, item]) => fresh(item.storedAt)));
    for (const key of dirty) {
      const item = memory.get(key);
      next.delete(key);
      if (!item || !fresh(item.storedAt) || item.bytes > RESPONSE_CACHE_LIMITS.persistedItemBytes) continue;
      const chunks = splitChunks(item.text);
      // Native serialization escapes each string; budget the actual stored form.
      const storageBytes = chunks.reduce((sum, part) => sum + utf8Bytes(JSON.stringify(part)), 0);
      if (storageBytes > RESPONSE_CACHE_LIMITS.persistedItemBytes) continue;
      const descriptor = { id: now().toString(36) + "-" + (++serial).toString(36) + "-" + Math.random().toString(36).slice(2), storedAt: item.storedAt,
        bytes: item.bytes, storageBytes, chunks: chunks.length, checksum: checksum(item.text) };
      batch.set(key, { item, descriptor, chunks });
      next.set(key, descriptor);
    }
    dirty.clear();
    boundDisk(next);
    const written: DiskEntry[] = [];
    try {
      for (const [key, value] of batch) {
        if (!next.has(key)) continue;
        written.push(value.descriptor);
        for (let i = 0; i < value.chunks.length; i++) {
          await storage.setStorage({ key: chunkKey(value.descriptor, i), data: value.chunks[i]! });
          if (epoch !== generation) return;
        }
      }
      if (epoch !== generation) return;
      // A newer successful response while I/O was pending supersedes this body.
      for (const [key, value] of batch) if (memory.get(key) !== value.item) {
        const previous = disk.get(key);
        if (previous && fresh(previous.storedAt)) next.set(key, previous);
        else next.delete(key);
      }
      boundDisk(next);
      const previous = disk;
      commit(next);
      for (const [key, item] of previous) if (disk.get(key) !== item) removeChunks(item);
    } catch { /* Atomic old manifest remains usable on full/failed storage. */ }
    finally {
      for (const item of written) if (![...disk.values()].includes(item)) removeChunks(item);
      // A purge fences the whole native write generation. Keep unrelated latest
      // entries queued, while removed/superseded identities stay absent.
      if (epoch !== generation) for (const [key, value] of batch) {
        if (memory.get(key) === value.item) dirty.add(key);
      }
    }
  }

  async function flush(): Promise<void> {
    load();
    if (timer) { clearTimeout(timer); timer = undefined; }
    if (running) { await running; if (dirty.size) await flush(); return; }
    running = (async () => { while (dirty.size) await persistBatch(); })();
    try { await running; } finally { running = undefined; if (dirty.size) schedule(); }
  }

  return {
    load, get, set, invalidate, flush,
    beginRequest: (key: string): RequestFence => {
      load();
      const fence: RequestFence = { key, valid: true, release: () => { requests.delete(fence); } };
      requests.add(fence);
      return fence;
    },
    isCurrent: (key: string, item: CachedResponse, fence: RequestFence) => {
      if (!currentFence(key, fence)) return false;
      const current = get(key);
      return current !== undefined && current.storedAt === item.storedAt && current.text === item.text;
    },
    cleanupComplete: () => !cleanupFailed,
    clear: () => invalidate(),
    removeScope: async (userId: string) => {
      invalidate(key => key.endsWith(":" + userId));
      await flush();
      return !cleanupFailed;
    },
  };
}
