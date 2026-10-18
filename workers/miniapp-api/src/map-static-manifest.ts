import { createHash } from "node:crypto";

export type MapStaticDescriptor = { file: string; bytes: number; sha256: string };
export type MapStaticRecord = { route: string; bytes: number; sha256: string; headers: Record<string, string> };
export type MapStaticSource = {
  family: "terrain" | "night-light"; publicationVersion: string; datasetVersion?: string;
  metadata: MapStaticDescriptor[];
  displayWindowTargets?: { name: string; boundsGcj02: { west: number; east: number; south: number; north: number } }[];
};
export type MapStaticManifest = {
  schemaVersion: "starward-map-static-export-v1"; publicationHash: string;
  sources: MapStaticSource[]; records: MapStaticRecord[];
};

const fail = (code: string): never => { throw new Error(`map_static_${code}`); };
const exact = (value: any, keys: string[]) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
export const mapStaticHash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Shared sealed declaration only. Runtime and operator retain their own file,
 * database, activation and delivery policies; this hash never publishes data. */
export const mapStaticSourceId = (source: MapStaticSource) => `${source.family}/${source.publicationVersion.split(":")[1]}${source.displayWindowTargets ? "/" + mapStaticHash(JSON.stringify(source.displayWindowTargets)) : ""}`;

export function validMapStaticRoute(route: unknown): route is string {
  return typeof route === "string" && (/^\/v2\/terrain\/assets\/terrarium-cn-v2-(?:fixed|window)-[0-9a-f-]+\.png$/u.test(route) ||
    /^\/v2\/night-light\/assets\/[a-z0-9][a-z0-9._-]{2,127}\/nightlight-v2-(?:[a-f0-9]{64}|window-\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]-[a-f0-9]{64}-[a-f0-9]{64})\.png$/u.test(route));
}

export function assertMapStaticRecord(value: unknown): MapStaticRecord {
  const record = value as MapStaticRecord;
  if (!exact(record, ["route", "bytes", "sha256", "headers"]) || !validMapStaticRoute(record.route) ||
      !Number.isSafeInteger(record.bytes) || record.bytes < 1 || record.bytes > 16 * 1024 * 1024 || !hash(record.sha256)) fail("record_invalid");
  const name = record.route.startsWith("/v2/terrain/") ? "x-starward-terrain-publication" : "x-starward-night-light-publication";
  if (!exact(record.headers, ["content-type", "cache-control", "x-content-type-options", name]) ||
      record.headers["content-type"] !== "image/png" || record.headers["cache-control"] !== "public, max-age=604800, immutable" ||
      record.headers["x-content-type-options"] !== "nosniff" ||
      !(name === "x-starward-terrain-publication" ? /^terrain:terrarium-cn-v2-(?:fixed|window)-[0-9-]+:[a-f0-9]{64}:[a-f0-9]{64}$/u :
        /^(?:nightlight:[a-f0-9]{64}:[a-f0-9]{64}:[a-f0-9]{64}|nightlight-window:[a-f0-9]{64})$/u).test(record.headers[name])) fail("header_invalid");
  return record;
}

export function assertMapStaticManifest(value: unknown): MapStaticManifest {
  const index = value as MapStaticManifest;
  if (!exact(index, ["schemaVersion", "publicationHash", "sources", "records"]) || index.schemaVersion !== "starward-map-static-export-v1" ||
      !Array.isArray(index.sources) || !index.sources.length || !Array.isArray(index.records) || !index.records.length ||
      mapStaticHash(JSON.stringify({ sources: index.sources, records: index.records })) !== index.publicationHash) fail("index_invalid");
  const records = index.records.map(record => assertMapStaticRecord(record));
  const sorted = [...records].sort((a, b) => a.route < b.route ? -1 : a.route > b.route ? 1 : 0);
  if (new Set(records.map(record => record.route)).size !== index.records.length ||
      JSON.stringify(index.records) !== JSON.stringify(sorted)) fail("index_invalid");
  const ids = new Set<string>();
  for (const source of index.sources) {
    if (!exact(source, source.family === "terrain" ? ["family", "publicationVersion", "metadata"] : ["family", "publicationVersion", "datasetVersion", "metadata", ...(source.displayWindowTargets ? ["displayWindowTargets"] : [])]) ||
        !["terrain", "night-light"].includes(source.family) ||
        !(source.family === "terrain" ? /^terrain-fixed:[a-f0-9]{64}$/u : /^nightlight-fixed:[a-f0-9]{64}$/u).test(source.publicationVersion) ||
        !Array.isArray(source.metadata) || !source.metadata.length || ids.has(mapStaticSourceId(source))) fail("source_invalid");
    ids.add(mapStaticSourceId(source));
    for (const entry of source.metadata) if (!exact(entry, ["file", "bytes", "sha256"]) ||
        !/^(?:inventory\.json|published-record\.json|[a-z0-9][a-z0-9.-]*\.png\.json)$/u.test(entry.file) ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > 2 * 1024 * 1024 || !hash(entry.sha256)) fail("source_invalid");
    if (new Set(source.metadata.map(entry => entry.file)).size !== source.metadata.length) fail("source_invalid");
  }
  return index;
}
