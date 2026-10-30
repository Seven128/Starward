import { assertMapStaticManifest, assertMapStaticMetadata, assertMapStaticRecord, assertMapStaticSourceIdentity,
  mapStaticHash, mapStaticSourceId, validMapStaticRoute,
  type MapStaticDescriptor, type MapStaticManifest, type MapStaticRecord, type MapStaticSource,
  type MapStaticSourceIdentity } from "./map-static-manifest.ts";

// Reuse the existing publication metadata read ceilings. These are admission
// limits, not claims about nationwide capacity or the chosen display specs.
export const MAP_STATIC_PAGE_BYTES = 2 * 1024 * 1024;
export const MAP_STATIC_ROOT_BYTES = 4 * 1024 * 1024;
type Page = MapStaticDescriptor & { first: string; last: string; count: number };
export type MapStaticSourceReference = MapStaticSourceIdentity & { metadataPages: Page[] };
export type MapStaticDirectory = {
  schemaVersion: "starward-map-static-export-v2"; publicationHash: string;
  sources: MapStaticSourceReference[]; recordPages: Page[];
};
export type MapStaticIndex = MapStaticManifest | MapStaticDirectory;
export type MapStaticSelectedSource = MapStaticSource | MapStaticSourceReference;
export type MapStaticIndexRead = (file: string, maximum: number, signal: AbortSignal,
  descriptor?: Pick<MapStaticDescriptor, "bytes" | "sha256">) => Promise<Buffer>;
const fail = (code: string): never => { throw new Error(`map_static_${code}`); };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const exact = (value: any, names: string[]) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === names.slice().sort().join();

function pages(value: unknown, namespace: string): asserts value is Page[] {
  if (!Array.isArray(value) || !value.length) fail("pages_invalid");
  let previous: string | undefined;
  for (const page of value as Page[]) {
    if (!exact(page, ["file", "bytes", "sha256", "first", "last", "count"]) ||
      !/^[a-f0-9]{64}$/u.test(page.sha256) || page.file !== `${namespace}/${page.sha256}.json` ||
      !Number.isSafeInteger(page.bytes) || page.bytes < 2 || page.bytes > MAP_STATIC_PAGE_BYTES ||
      !Number.isSafeInteger(page.count) || page.count < 1 || typeof page.first !== "string" || !page.first ||
      typeof page.last !== "string" || page.last < page.first || previous !== undefined && previous >= page.first) fail("pages_invalid");
    previous = page.last;
  }
}

export function assertMapStaticIndex(value: unknown): MapStaticIndex {
  if ((value as MapStaticManifest)?.schemaVersion === "starward-map-static-export-v1") return assertMapStaticManifest(value);
  const index = value as MapStaticDirectory;
  if (!exact(index, ["schemaVersion", "publicationHash", "sources", "recordPages"]) ||
    index.schemaVersion !== "starward-map-static-export-v2" || !Array.isArray(index.sources) || !index.sources.length ||
    Buffer.byteLength(JSON.stringify(index)) > MAP_STATIC_ROOT_BYTES ||
    mapStaticHash(JSON.stringify({ sources: index.sources, recordPages: index.recordPages })) !== index.publicationHash) fail("index_invalid");
  const ids = new Set<string>();
  for (const source of index.sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) fail("source_invalid");
    const { metadataPages, ...identity } = source;
    assertMapStaticSourceIdentity(identity);
    const id = mapStaticSourceId(identity);
    if (ids.has(id)) fail("source_invalid");
    ids.add(id); pages(metadataPages, `catalog/${id}`);
  }
  pages(index.recordPages, "records");
  return index;
}

async function readPage<T>(page: Page, read: MapStaticIndexRead, signal: AbortSignal, key: (entry: T) => string): Promise<T[]> {
  const bytes = await read(page.file, MAP_STATIC_PAGE_BYTES, signal, page);
  signal.throwIfAborted();
  if (bytes.length !== page.bytes || bytes.length > MAP_STATIC_PAGE_BYTES || mapStaticHash(bytes) !== page.sha256) fail("page_identity_invalid");
  const entries = JSON.parse(bytes.toString("utf8")) as T[];
  if (!Array.isArray(entries) || entries.length !== page.count || key(entries[0]!) !== page.first ||
    key(entries.at(-1)!) !== page.last || entries.some((entry, i) => i > 0 && key(entries[i - 1]!) >= key(entry))) fail("page_range_invalid");
  return entries;
}

/** Binary lookup only traverses page descriptors, never another source's
 * entries. Prefix reads are needed by the existing immutable window filenames. */
function matchingPages(entries: Page[], first: string, last = first) {
  let low = 0, high = entries.length;
  while (low < high) { const mid = (low + high) >>> 1; if (entries[mid]!.last < first) low = mid + 1; else high = mid; }
  const selected: Page[] = [];
  for (let i = low; i < entries.length && entries[i]!.first <= last; i++) selected.push(entries[i]!);
  return selected;
}

/** One pinned export, with a shared root and uncached bounded data pages.
 * No second registry/current pointer, image processing or publish authority. */
export class MapStaticPublicationIndex {
  private pending: Promise<MapStaticIndex> | undefined;
  private readonly lifetime = new AbortController();
  constructor(private readonly read: MapStaticIndexRead, private readonly publicationHash: string,
    private readonly ownerFail: (code: string) => never = fail) {}

  root() {
    this.lifetime.signal.throwIfAborted();
    this.pending ??= (async () => {
      const raw = await this.read("index.json", 16 * 1024 * 1024, this.lifetime.signal);
      if (raw.length > 16 * 1024 * 1024) fail("index_invalid");
      const index = assertMapStaticIndex(JSON.parse(raw.toString("utf8")));
      if (index.publicationHash !== this.publicationHash) this.ownerFail("publication_mismatch");
      this.lifetime.signal.throwIfAborted();
      return index;
    })().catch(error => { this.pending = undefined; throw error; });
    return this.pending;
  }

  async metadata(source: MapStaticSelectedSource, name: string, signal: AbortSignal, prefix = false) {
    signal.throwIfAborted();
    const root = await this.root();
    if (!root.sources.includes(source as MapStaticSource & MapStaticSourceReference)) fail("source_not_selected");
    const combined = AbortSignal.any([signal, this.lifetime.signal]);
    combined.throwIfAborted();
    const matches = (entry: MapStaticDescriptor) => prefix ? entry.file.startsWith(name) : entry.file === name;
    if ("metadata" in source) return source.metadata.filter(matches);
    const result: MapStaticDescriptor[] = [];
    for (const page of matchingPages(source.metadataPages, name, prefix ? name + "\uffff" : name)) {
      const entries = await readPage<MapStaticDescriptor>(page, this.read, combined, entry => entry?.file);
      result.push(...assertMapStaticMetadata(source, entries).filter(matches));
    }
    combined.throwIfAborted();
    return result;
  }

  async record(route: string, signal: AbortSignal): Promise<MapStaticRecord | undefined> {
    if (!validMapStaticRoute(route)) fail("route_invalid");
    signal.throwIfAborted();
    const root = await this.root(), combined = AbortSignal.any([signal, this.lifetime.signal]);
    combined.throwIfAborted();
    if (root.schemaVersion === "starward-map-static-export-v1") return root.records.find(record => record.route === route);
    const page = matchingPages(root.recordPages, route)[0];
    if (!page) return undefined;
    const entries = await readPage<MapStaticRecord>(page, this.read, combined, entry => entry?.route);
    entries.forEach(assertMapStaticRecord); combined.throwIfAborted();
    return entries.find(record => record.route === route);
  }

  close(reason: Error) { this.lifetime.abort(reason); this.pending = undefined; }
}

/** Complete traversal belongs only to operator admission/recovery. Runtime
 * owners use the directory above and retain their own domain checks. */
export async function expandMapStaticIndex(index: MapStaticIndex, read: MapStaticIndexRead, signal: AbortSignal): Promise<MapStaticManifest> {
  if (index.schemaVersion === "starward-map-static-export-v1") return index;
  const sources: MapStaticSource[] = [], records: MapStaticRecord[] = [];
  for (const { metadataPages, ...source } of index.sources) {
    const metadata: MapStaticDescriptor[] = [];
    for (const page of metadataPages) metadata.push(...await readPage<MapStaticDescriptor>(page, read, signal, entry => entry?.file));
    sources.push({ ...source, metadata });
  }
  for (const page of index.recordPages) records.push(...await readPage<MapStaticRecord>(page, read, signal, entry => entry?.route));
  const content = { sources, records };
  return assertMapStaticManifest({ schemaVersion: "starward-map-static-export-v1", publicationHash: mapStaticHash(JSON.stringify(content)), ...content });
}

/** The existing exporter calls this after complete scientific/source admission.
 * Only one serialized page is held while writing; originals are not rewritten. */
export async function partitionMapStaticManifest(manifest: MapStaticManifest, write: (file: string, bytes: Buffer) => Promise<void>) {
  assertMapStaticManifest(manifest);
  async function partition<T>(items: T[], key: (entry: T) => string, namespace: string): Promise<Page[]> {
    const result: Page[] = [];
    let pending: string[] = [], size = 2, first = "", last = "";
    async function flush() {
      if (!pending.length) return;
      const bytes = Buffer.from("[" + pending.join(",") + "]"), sha256 = mapStaticHash(bytes), file = `${namespace}/${sha256}.json`;
      await write(file, bytes); result.push({ file, bytes: bytes.length, sha256, first, last, count: pending.length });
      pending = []; size = 2;
    }
    for (const entry of [...items].sort((a, b) => compare(key(a), key(b)))) {
      const text = JSON.stringify(entry), length = Buffer.byteLength(text);
      if (length + 2 > MAP_STATIC_PAGE_BYTES) fail("entry_too_large");
      if (size + length + (pending.length ? 1 : 0) > MAP_STATIC_PAGE_BYTES) await flush();
      if (!pending.length) first = key(entry);
      last = key(entry); size += length + (pending.length ? 1 : 0); pending.push(text);
    }
    await flush(); return result;
  }
  const sources: MapStaticSourceReference[] = [];
  for (const { metadata, ...identity } of manifest.sources) sources.push({ ...identity,
    metadataPages: await partition(metadata, entry => entry.file, `catalog/${mapStaticSourceId(identity)}`) });
  const content = { sources, recordPages: await partition(manifest.records, entry => entry.route, "records") };
  const index = { schemaVersion: "starward-map-static-export-v2" as const,
    publicationHash: mapStaticHash(JSON.stringify(content)), ...content };
  assertMapStaticIndex(index); return index;
}
