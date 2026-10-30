import { createHash } from "node:crypto";
import { displayRasterWindowForBounds } from "@starward/coordinate-system";

export type MapStaticDescriptor = { file: string; bytes: number; sha256: string };
export type MapStaticRecord = { route: string; bytes: number; sha256: string; headers: Record<string, string> };
export type MapStaticFamily = "terrain" | "night-light" | "cloud";
export type MapStaticSource = {
  family: MapStaticFamily; publicationVersion: string; datasetVersion?: string;
  metadata: MapStaticDescriptor[];
  displayWindowTargets?: { name: string; boundsGcj02: { west: number; east: number; south: number; north: number } }[];
  /** Prepared cloud and sharded EOG have no qualified-upload variant. Their
   * development admission is part of the sealed identity, not a display flag. */
  admission?: "DEVELOPMENT_ONLY";
  sourceManifestSha256?: string;
};
export type MapStaticManifest = {
  schemaVersion: "starward-map-static-export-v1"; publicationHash: string;
  sources: MapStaticSource[]; records: MapStaticRecord[];
};
export type MapStaticSourceIdentity = Omit<MapStaticSource, "metadata">;

const fail = (code: string): never => { throw new Error(`map_static_${code}`); };
const exact = (value: any, keys: string[]) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
export const mapStaticHash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Shared sealed declaration only. Runtime and operator retain their own file,
 * database, activation and delivery policies; this hash never publishes data. */
export const mapStaticSourceId = (source: MapStaticSourceIdentity) => `${source.family}/${source.publicationVersion.split(":")[1]}${source.displayWindowTargets ? "/" + mapStaticHash(JSON.stringify(source.displayWindowTargets)) : ""}`;
export const isShardedMapNightLightSource = (source: Pick<MapStaticSource, "family" | "publicationVersion">) =>
  source.family === "night-light" && /^nightlight-sharded:[a-f0-9]{64}$/u.test(source.publicationVersion);
export const isMapNightLightContrastRoute = (route: string) => route.startsWith("/v2/night-light/") && route.split("/").at(-1)!.startsWith("nightlight-contrast-v1-window-");

/** The same finite declaration enters preparation, sealing and restoration. */
export function assertMapStaticDisplayWindowTargets(value: unknown): NonNullable<MapStaticSource["displayWindowTargets"]> {
  if (!Array.isArray(value) || !value.length || value.length > 16) return fail("window_targets_invalid");
  for (const target of value) {
    if (!exact(target, ["name", "boundsGcj02"]) || typeof target.name !== "string" || !target.name.trim() || target.name.length > 120 ||
      !exact(target.boundsGcj02, ["west", "east", "south", "north"])) fail("window_targets_invalid");
    try { displayRasterWindowForBounds(target.boundsGcj02); } catch { fail("window_targets_invalid"); }
  }
  return value;
}

export function validMapStaticRoute(route: unknown): route is string {
  return typeof route === "string" && (/^\/v2\/terrain\/assets\/terrarium-cn-v2-(?:fixed|window)-[0-9a-f-]+\.png$/u.test(route) ||
    /^\/v2\/night-light\/assets\/[a-z0-9][a-z0-9._-]{2,127}\/nightlight-(?:v2-(?:[a-f0-9]{64}|window-\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]-[a-f0-9]{64}-[a-f0-9]{64})|contrast-v1-window-\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]-[a-f0-9]{64}-[a-f0-9]{64})\.png$/u.test(route) ||
    /^\/v2\/cloud\/assets\/[a-f0-9]{64}\/cloud-[a-f0-9]{64}\.png$/u.test(route));
}

export function mapStaticRouteFamily(route: unknown): MapStaticFamily {
  if (!validMapStaticRoute(route)) fail("route_invalid");
  return (route as string).startsWith("/v2/terrain/") ? "terrain" : (route as string).startsWith("/v2/cloud/") ? "cloud" : "night-light";
}

export function assertMapStaticRecord(value: unknown): MapStaticRecord {
  const record = value as MapStaticRecord;
  if (!exact(record, ["route", "bytes", "sha256", "headers"]) || !validMapStaticRoute(record.route) ||
      !Number.isSafeInteger(record.bytes) || record.bytes < 1 || record.bytes > 16 * 1024 * 1024 || !hash(record.sha256)) fail("record_invalid");
  const family = mapStaticRouteFamily(record.route);
  const name = family === "terrain" ? "x-starward-terrain-publication" : family === "cloud" ? "x-starward-cloud-publication" : "x-starward-night-light-publication";
  if (!exact(record.headers, ["content-type", "cache-control", "x-content-type-options", name]) ||
      record.headers["content-type"] !== "image/png" || record.headers["cache-control"] !== "public, max-age=604800, immutable" ||
      record.headers["x-content-type-options"] !== "nosniff" ||
      !(family === "terrain" ? /^terrain:terrarium-cn-v2-(?:fixed|window)-[0-9-]+:[a-f0-9]{64}:[a-f0-9]{64}$/u :
        family === "cloud" ? /^cloud-display:[a-f0-9]{64}$/u :
        isMapNightLightContrastRoute(record.route) ? /^nightlight-display:[a-f0-9]{64}$/u :
        /^(?:nightlight:[a-f0-9]{64}:[a-f0-9]{64}:[a-f0-9]{64}|nightlight-window:[a-f0-9]{64})$/u).test(record.headers[name])) fail("header_invalid");
  if (family === "cloud" && record.headers[name] !== `cloud-display:${record.route.split("/").at(-1)!.slice(6, -4)}`) fail("header_invalid");
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
    if (!source || typeof source !== "object" || Array.isArray(source)) fail("source_invalid");
    const { metadata, ...identity } = source;
    assertMapStaticSourceIdentity(identity);
    assertMapStaticMetadata(identity, metadata);
    if (ids.has(mapStaticSourceId(source))) fail("source_invalid");
    ids.add(mapStaticSourceId(source));
    if (source.family === "cloud" && source.metadata.find(entry => entry.file === "source-manifest.json")?.sha256 !== source.sourceManifestSha256) fail("source_invalid");
    if (isShardedMapNightLightSource(source) && !source.metadata.some(entry => entry.file === "index.json")) fail("source_invalid");
  }
  return index;
}

/** Shared by the historical flat seal and the bounded directory. Admission is
 * still sealed source identity; changing layout cannot qualify a source. */
export function assertMapStaticSourceIdentity(value: unknown): MapStaticSourceIdentity {
  const source = value as MapStaticSourceIdentity;
  if (!source || typeof source !== "object" || Array.isArray(source)) fail("source_invalid");
  const shardedLight = isShardedMapNightLightSource(source);
  if (!exact(source, source.family === "terrain" ? ["family", "publicationVersion"] : source.family === "cloud"
    ? ["family", "publicationVersion", "admission", "sourceManifestSha256"]
    : shardedLight ? ["family", "publicationVersion", "datasetVersion", "admission", ...(source.displayWindowTargets ? ["displayWindowTargets"] : [])]
    : ["family", "publicationVersion", "datasetVersion", ...(source.displayWindowTargets ? ["displayWindowTargets"] : [])]) ||
    !["terrain", "night-light", "cloud"].includes(source.family) ||
    !(source.family === "terrain" ? /^terrain-fixed:[a-f0-9]{64}$/u : source.family === "cloud" ? /^cloud-display-inventory:[a-f0-9]{64}$/u : /^nightlight-(?:fixed|sharded):[a-f0-9]{64}$/u).test(source.publicationVersion)) fail("source_invalid");
  if (source.family === "cloud" && (source.admission !== "DEVELOPMENT_ONLY" || !hash(source.sourceManifestSha256))) fail("source_invalid");
  if (shardedLight && (source.admission !== "DEVELOPMENT_ONLY" || typeof source.datasetVersion !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(source.datasetVersion))) fail("source_invalid");
  if (source.displayWindowTargets !== undefined) assertMapStaticDisplayWindowTargets(source.displayWindowTargets);
  return source;
}

export function assertMapStaticMetadata(source: MapStaticSourceIdentity, entries: unknown): MapStaticDescriptor[] {
  if (!Array.isArray(entries) || !entries.length) fail("source_invalid");
  const metadata = entries as MapStaticDescriptor[];
  const shardedLight = isShardedMapNightLightSource(source);
  for (const entry of metadata) if (!exact(entry, ["file", "bytes", "sha256"]) ||
        !(shardedLight ? /^(?:index\.json|shards\/\d{1,2}\/\d{1,4}\/\d{1,4}\.json|parts\/[a-f0-9]{64}\/(?:inventory\.json|nightlight-v2-[a-f0-9]{64}\.png(?:\.json)?|display\/(?:display-inventory\.json|nightlight-contrast-v1-window-\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]-[a-f0-9]{64}-[a-f0-9]{64}\.png(?:\.json)?)))$/u.test(entry.file) ||
          !!source.displayWindowTargets && /^windows\/nightlight-(?:v2-window|contrast-v1-window)-\d{1,2}-\d{1,4}-\d{1,4}-[1-3]-[1-3]-[a-f0-9]{64}-[a-f0-9]{64}\.png(?:\.json)?$/u.test(entry.file) :
          source.family === "cloud" ? /^(?:inventory\.json|source-manifest\.json|cloud-[a-f0-9]{64}\.png\.json)$/u.test(entry.file) :
          /^(?:inventory\.json|published-record\.json|[a-z0-9][a-z0-9.-]*\.png\.json)$/u.test(entry.file)) ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > (shardedLight && entry.file.endsWith(".png") ? 16 :
          shardedLight && entry.file === "index.json" ? 4 : 2) * 1024 * 1024 || !hash(entry.sha256)) fail("source_invalid");
  if (new Set(metadata.map(entry => entry.file)).size !== metadata.length) fail("source_invalid");
  return metadata;
}
