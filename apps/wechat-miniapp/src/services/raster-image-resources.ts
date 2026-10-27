import { MiniappRequestCancelled } from "./request-lifecycle";
import { reportRuntimeError } from './runtime-error';

export interface RasterImageDescriptor {
  key: string;
  url: string;
  expectedBytes?: number;
  expectedSha256?: string;
}
export interface RasterImageFile {
  path: string; bytes: number; sha256?: string;
  /** An owned file can still require disposal after stat/integrity failure. */
  integrityError?: Error;
}
export interface RasterImageAdapter {
  /** Files left in this owner's namespace by a previous process. */
  recover?(): Promise<RasterImageFile[]>;
  download(input: RasterImageDescriptor, signal: AbortSignal, maximumBytes: number): Promise<RasterImageFile>;
  remove(path: string): Promise<void>;
}
interface Reader { active: boolean; settled: boolean; resolve(file: RasterImageFile): void; reject(error: unknown): void }
interface Entry {
  input: RasterImageDescriptor;
  readers: Set<Reader>;
  controller: AbortController;
  state: "queued" | "loading" | "ready";
  file: RasterImageFile | null;
  pins: number;
  used: number;
  retired: boolean;
  removing: boolean;
  cleanupFailed: boolean;
}

/** Public Map raster files, with separate JS readers and native installation
 * pins. Metadata, dataset validity and business retry remain with callers. */
export function createRasterImageResources(adapter: RasterImageAdapter, limits: {
  maximumFiles: number; maximumBytes: number; maximumConcurrent: number;
}) {
  if (![limits.maximumFiles, limits.maximumBytes, limits.maximumConcurrent].every(value => Number.isSafeInteger(value) && value > 0))
    throw new Error("raster_image_limits_invalid");
  const current = new Map<string, Entry>(), files = new Map<string, Entry>(), physicalSizes = new Map<string, number>(), entries = new Set<Entry>();
  let readyBytes = 0, active = 0, sequence = 0, closed = false;
  const snapshot = () => ({ entries: entries.size, readyBytes, activeDownloads: active,
    queued: [...entries].filter(entry => entry.state === 'queued').length,
    nativePins: [...entries].reduce((sum, entry) => sum + entry.pins, 0),
    failedRemovals: [...entries].filter(entry => entry.cleanupFailed).length,
    activeReaders: [...entries].reduce((sum, entry) => sum + entry.readers.size, 0),
    physicalFiles: physicalSizes.size });
  let serial: Promise<unknown> = Promise.resolve();
  const mutate = <T>(action: () => T | Promise<T>) => {
    const result = serial.then(action); serial = result.catch(() => undefined); return result;
  };
  const cancelled = () => new MiniappRequestCancelled("superseded");
  const detach = (entry: Entry) => {
    if (current.get(entry.input.key) === entry) current.delete(entry.input.key);
    entries.delete(entry);
  };
  const rejectReaders = (entry: Entry, error: unknown) => {
    for (const reader of entry.readers) if (!reader.settled) { reader.settled = true; reader.reject(error); }
  };
  const ownFile = (entry: Entry, file: RasterImageFile) => {
    const previousBytes = physicalSizes.get(file.path) ?? 0;
    const actualBytes = Math.max(previousBytes, file.bytes);
    readyBytes += actualBytes - previousBytes; physicalSizes.set(file.path, actualBytes);
    entry.file = file; entry.state = "ready";
    if (!files.has(file.path)) files.set(file.path, entry);
  };
  const remove = async (entry: Entry) => {
    if (!entry.file || entry.pins || entry.readers.size || entry.removing) return false;
    const path = entry.file.path;
    const aliases = [...entries].filter(other => other !== entry && other.file?.path === path);
    if (aliases.some(other => other.pins || other.readers.size)) {
      detach(entry); if (files.get(path) === entry) files.set(path, aliases[0]!); return true;
    }
    entry.removing = true;
    aliases.forEach(other => { other.removing = true; });
    try {
      await adapter.remove(path);
      readyBytes -= physicalSizes.get(path)!; physicalSizes.delete(path); files.delete(path);
      detach(entry); aliases.forEach(detach); return true;
    } catch (error) {
      entry.cleanupFailed = true;
      reportRuntimeError('request', 'raster_image_remove_failed', error, { stage: 'file_remove', resource: 'map_raster' });
      return false;
    }
    finally { entry.removing = false; aliases.forEach(other => { other.removing = false; }); }
  };
  const makeRoom = async (additionalFiles: number, additionalBytes: number) => {
    // Failed unlink keeps its file accounted for, but a later admission can
    // retry. Bound this admission by physical path, including idle aliases.
    const failedPaths = new Set<string>();
    while (entries.size + additionalFiles > limits.maximumFiles || readyBytes + additionalBytes > limits.maximumBytes) {
      const idle = [...entries].filter(entry => entry.file && !entry.pins && !entry.readers.size
        && !failedPaths.has(entry.file.path) && !entry.removing)
        .sort((a, b) => a.used - b.used)[0];
      if (!idle) throw Object.assign(new Error("raster_image_budget_busy"), { budget: snapshot() });
      const path = idle.file!.path;
      if (!await remove(idle)) failedPaths.add(path);
    }
  };
  let initialized = !adapter.recover;
  const initialize = async () => {
    if (initialized) return;
    const recovered = await adapter.recover!();
    for (const file of recovered) {
      const entry: Entry = { input: { key: file.path, url: "recovered" }, file: null, state: "ready",
        readers: new Set(), controller: new AbortController(), pins: 0, used: 0,
        retired: true, removing: false, cleanupFailed: false };
      entries.add(entry); ownFile(entry, file);
    }
    initialized = true;
    // No old-process native handle is a current lease. Failed removals remain
    // counted and retry through the normal bounded admission path.
    for (const entry of entries) await remove(entry);
  };
  const retireAbandoned = (entry: Entry) => {
    if (entry.readers.size || entry.pins || entry.state === "ready") return;
    entry.retired = true;
    if (current.get(entry.input.key) === entry) current.delete(entry.input.key);
    entry.controller.abort();
    if (entry.state === "queued") detach(entry);
  };
  const discardDownloaded = async (entry: Entry, file: RasterImageFile) => {
    // Keep failed deletions counted and owned. A failed unlink is not absence.
    ownFile(entry, file); entry.retired = true;
    if (current.get(entry.input.key) === entry) current.delete(entry.input.key);
    await remove(entry);
  };
  const drain = () => {
    if (closed) return;
    for (const entry of entries) {
      if (active >= limits.maximumConcurrent) break;
      if (entry.state !== "queued" || entry.retired || !entry.readers.size) continue;
      entry.state = "loading"; active++;
      void Promise.resolve().then(() => adapter.download(entry.input, entry.controller.signal, limits.maximumBytes)).then(file => mutate(async () => {
        if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !file.path) {
          rejectReaders(entry, file.integrityError ?? new Error("raster_image_file_invalid")); entry.readers.clear();
          if (file.path) await discardDownloaded(entry, { path: file.path, bytes: limits.maximumBytes });
          else detach(entry);
          return;
        }
        if (entry.retired || entry.controller.signal.aborted || !entry.readers.size || closed) {
          await discardDownloaded(entry, file); return;
        }
        try {
          if (file.integrityError) throw file.integrityError;
          if (file.bytes === 0) throw new Error("raster_image_file_invalid");
          if (file.bytes > limits.maximumBytes || (entry.input.expectedBytes !== undefined && file.bytes !== entry.input.expectedBytes))
            throw new Error("raster_image_size_mismatch");
          if (entry.input.expectedSha256 && file.sha256 !== entry.input.expectedSha256) throw new Error("raster_image_hash_mismatch");
          const alias = files.get(file.path)?.file;
          if (alias && (alias.bytes !== file.bytes || !file.sha256 || alias.sha256 !== file.sha256))
            throw new Error("raster_image_file_path_conflict");
          await makeRoom(0, Math.max(0, file.bytes - (physicalSizes.get(file.path) ?? 0)));
        } catch (error) {
          rejectReaders(entry, error); entry.readers.clear(); await discardDownloaded(entry, file); return;
        }
        ownFile(entry, file);
        for (const reader of entry.readers) if (reader.active && !reader.settled) { reader.settled = true; reader.resolve(file); }
      })).catch(error => mutate(() => {
        rejectReaders(entry, entry.controller.signal.aborted ? cancelled() : error);
        entry.readers.clear(); if (!entry.file) detach(entry);
      })).finally(() => { active--; drain(); });
    }
  };

  const acquire = (input: RasterImageDescriptor, signal?: AbortSignal) => {
    let entry: Entry | undefined;
    let resolve!: (file: RasterImageFile) => void, reject!: (error: unknown) => void;
    const promise = new Promise<RasterImageFile>((yes, no) => { resolve = yes; reject = no; });
    const reader: Reader = { active: true, settled: false, resolve, reject };
    const release = () => {
      if (!reader.active) return;
      reader.active = false; signal?.removeEventListener("abort", release);
      if (!reader.settled) { reader.settled = true; reader.reject(cancelled()); }
      if (entry) { entry.readers.delete(reader); retireAbandoned(entry); }
      void mutate(async () => {
        if (entry?.retired && entry.file) await remove(entry);
        drain();
      });
    };
    signal?.addEventListener("abort", release, { once: true });
    void mutate(async () => {
      if (!reader.active || signal?.aborted) { release(); return; }
      if (closed) throw new Error("raster_image_resources_closed");
      await initialize();
      if (!reader.active || signal?.aborted) { release(); return; }
      if (closed) throw new Error("raster_image_resources_closed");
      if (!input.key || !input.url || (input.expectedBytes !== undefined && (!Number.isSafeInteger(input.expectedBytes)
        || input.expectedBytes <= 0 || input.expectedBytes > limits.maximumBytes))
        || (input.expectedSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(input.expectedSha256))) throw new Error("raster_image_descriptor_invalid");
      entry = current.get(input.key);
      if (entry && (entry.input.url !== input.url
        || (entry.input.expectedSha256 && input.expectedSha256 && entry.input.expectedSha256 !== input.expectedSha256)
        || (entry.input.expectedBytes && input.expectedBytes && entry.input.expectedBytes !== input.expectedBytes)))
        throw new Error("raster_image_identity_conflict");
      if (entry?.file && ((input.expectedBytes !== undefined && entry.file.bytes !== input.expectedBytes)
        || (input.expectedSha256 !== undefined && entry.file.sha256 !== input.expectedSha256))) {
        entry.retired = true; current.delete(input.key); entry = undefined;
      }
      if (!entry) {
        await makeRoom(1, 0);
        if (!reader.active || signal?.aborted) { release(); return; }
        entry = { input: { ...input }, readers: new Set(), controller: new AbortController(), state: "queued", file: null,
          pins: 0, used: ++sequence, retired: false, removing: false, cleanupFailed: false };
        current.set(input.key, entry); entries.add(entry);
      } else Object.assign(entry.input, input);
      entry.used = ++sequence; entry.readers.add(reader);
      if (entry.file) { reader.settled = true; reader.resolve(entry.file); }
      drain();
    }).catch(error => { if (!reader.settled) { reader.settled = true; reader.reject(error); } release(); });
    return { promise, release };
  };
  const retainPath = (path: string) => {
    const entry = files.get(path);
    if (!entry || entry.removing) throw new Error("raster_image_file_not_owned");
    entry.pins++; entry.used = ++sequence;
    let released = false;
    return () => {
      if (released) return; released = true; entry.pins--;
      void mutate(async () => { if (entry.retired || closed) await remove(entry); drain(); });
    };
  };
  return {
    acquire, retainPath,
    invalidate(key: string, path?: string | null) {
      const entry = current.get(key);
      if (!entry || (path && entry.file?.path !== path)) return;
      entry.retired = true; current.delete(key); retireAbandoned(entry);
      void mutate(async () => { await remove(entry); drain(); });
    },
    snapshot,
    async close() {
      closed = true;
      for (const entry of entries) { entry.retired = true; rejectReaders(entry, cancelled()); entry.readers.clear(); entry.controller.abort(); }
      await mutate(async () => { for (const entry of entries) { if (entry.file) await remove(entry); else if (entry.state === "queued") detach(entry); } });
      return { retainedPinnedFiles: [...entries].filter(entry => entry.pins > 0).length,
        failedRemovals: [...entries].filter(entry => entry.cleanupFailed).length };
    },
  };
}
