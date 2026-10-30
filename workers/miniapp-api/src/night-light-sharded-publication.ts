import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds, mercatorY,
  type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_FIXED_SCALE, type Gcj02Point, type SourceSummary } from "@starward/miniapp-contracts";
import { fixedNightLightDataset, validateFixedNightLightProof, readFixedNightLightPixel,
  type FixedNightLightRaster } from "./night-light-publication.ts";
import { nightLightContrastView } from "./night-light-display-image.ts";
import type { NightLightView } from "./night-light-window.ts";

const ROOT_LIMIT = 4 * 1024 * 1024, SHARD_LIMIT = 2 * 1024 * 1024;
const PROOF_LIMIT = 1024 * 1024, IMAGE_LIMIT = 16 * 1024 * 1024;
const hashPattern = /^[a-f0-9]{64}$/u;
const fixedImagePattern = /^nightlight-v2-[a-f0-9]{64}\.png$/u;
const hash = (raw: Buffer | string) => createHash("sha256").update(raw).digest("hex");
function fail(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(`nightlight_sharded_${code}`);
}
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;

/** The Python v1 producer's canonical JSON keeps numeric tokens such as 113.0.
 * Node's JSON source access preserves those tokens without inventing another
 * floating-point formatter. Object sorting remains the producer's ASCII-key
 * protocol; strings are never searched/replaced or stripped of whitespace. */
function canonicalIndexCore(raw: Buffer) {
  const text = raw.toString("utf8"), json = JSON as unknown as { rawJSON?: (source: string) => unknown };
  fail(typeof json.rawJSON === "function", "canonical_protocol_unsupported");
  // JSON.parse already checked grammar. Check members with a JSON-aware walk:
  // quoted commas/braces and escaped quotes are data, never structural tokens.
  const frames: { object: boolean; expectingKey: boolean; keys: Set<string> }[] = [];
  for (let i = 0; i < text.length; i++) {
    const token = text[i];
    if (token === '"') {
      const start = i++;
      while (i < text.length) { if (text[i] === "\\") { i += 2; continue; } if (text[i] === '"') break; i++; }
      const frame = frames.at(-1);
      if (frame?.object && frame.expectingKey) {
        const key = JSON.parse(text.slice(start, i + 1)) as string;
        fail(!frame.keys.has(key), "duplicate_member"); frame.keys.add(key); frame.expectingKey = false;
      }
    } else if (token === "{" || token === "[") frames.push({ object: token === "{", expectingKey: token === "{", keys: new Set() });
    else if (token === "}" || token === "]") frames.pop();
    else if (token === ",") { const frame = frames.at(-1); if (frame?.object) frame.expectingKey = true; }
  }
  const tokenTree = JSON.parse(text, (_key: string, value: any, context?: { source?: string }) => {
    if (context?.source !== undefined) return json.rawJSON!(context.source);
    if (object(value)) return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    return value;
  });
  fail(object(tokenTree) && Object.hasOwn(tokenTree, "indexVersion"), "index_version_invalid");
  const { indexVersion: _version, ...core } = tokenTree;
  return JSON.stringify(core);
}

export type ShardedNightLightFile = { file: string; bytes: number; sha256: string };
type Part = { publicationVersion: string; sourceManifestSha256: string; inventory: ShardedNightLightFile;
  displayInventory: ShardedNightLightFile; aoiWgs84: RasterBounds; requestedAoiWgs84: RasterBounds; assetCount: number };
type Entry = { part: string; publicationId: string; window: DisplayRasterWindow; boundsGcj02: RasterBounds;
  quality: FixedNightLightRaster["quality"]; proof: ShardedNightLightFile;
  image: FixedNightLightRaster["image"]; numeric: FixedNightLightRaster["numeric"];
  display: { styleVersion: typeof NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion; publicationId: string;
    image: ShardedNightLightFile; proof: ShardedNightLightFile } };
type Index = { schemaVersion: "starward-sharded-nightlight-index-v1"; releaseState: "SEALED";
  datasetVersion: string; methodVersion: string; styleVersion: string; policySha256: string;
  radianceSha256: string; coverageSha256: string; minimumCloudFreeObservations: number; source: SourceSummary;
  grid: typeof DISPLAY_RASTER_GRID; tilePixels: 256; shardTileSpan: 16;
  coverage: "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY"; indexVersion: string;
  availableZooms: number[]; parts: Record<string, Part>; shards: Record<string, ShardedNightLightFile & { assetCount: number }>;
  totals: { assets: number; numericBytes: number; legacyPngBytes: number; displayPngBytes: number; proofBytes: number } };

/** File discovery only. Source rights, full source hashes, DB publication and
 * public object readback remain the original publisher's responsibilities. */
export type PreparedShardedNightLightWindow = {
  authority: "PREPARED_ONLY"; indexVersion: string; indexSha256: string; key: string; part: string;
  proof: FixedNightLightRaster; displayProof: NightLightView;
  sourceImage: ShardedNightLightFile; numeric: ShardedNightLightFile; displayImage: ShardedNightLightFile;
};

function descriptor(value: unknown, maximum: number): asserts value is ShardedNightLightFile {
  fail(object(value) && typeof value.file === "string" && value.file.length > 0
    && !value.file.includes("\\") && !value.file.includes(":") && !path.isAbsolute(value.file)
    && value.file.split("/").every(part => part !== "" && part !== "." && part !== "..")
    && integer(value.bytes, 1, maximum) && hashPattern.test(value.sha256), "descriptor_invalid");
}

function bounds(value: unknown): value is RasterBounds {
  return object(value) && [value.west, value.south, value.east, value.north].every(Number.isFinite)
    && value.west >= -180 && value.east <= 180 && value.south > -85.051129 && value.north < 85.051129
    && value.west < value.east && value.south < value.north;
}

function windowForKey(key: string): DisplayRasterWindow {
  const match = typeof key === "string" && /^(\d+)-(\d+)-(\d+)-([1-3])-([1-3])$/u.exec(key);
  fail(match, "window_invalid");
  const [zoom, x, y, columns, rows] = match.slice(1).map(Number) as [number, number, number, number, number];
  fail(integer(zoom, 0, 12) && integer(x, 0) && integer(y, 0) && x + columns <= 2 ** zoom && y + rows <= 2 ** zoom
    && [zoom, x, y, columns, rows].join("-") === key, "window_invalid");
  return { grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom, x, y, columns, rows };
}
const shardFor = (window: DisplayRasterWindow) => `${window.zoom}/${Math.floor(window.x / 16)}/${Math.floor(window.y / 16)}`;

function validateIndex(value: unknown, raw: Buffer): Index {
  fail(object(value) && value.schemaVersion === "starward-sharded-nightlight-index-v1" && value.releaseState === "SEALED"
    && /^[a-z0-9][a-z0-9._-]{2,127}$/u.test(value.datasetVersion)
    && value.methodVersion === NIGHT_LIGHT_FIXED_SCALE.methodVersion && value.styleVersion === NIGHT_LIGHT_FIXED_SCALE.styleVersion
    && [value.policySha256, value.radianceSha256, value.coverageSha256].every(item => typeof item === "string" && hashPattern.test(item))
    && integer(value.minimumCloudFreeObservations, 1, 366) && object(value.source) && value.source.id === `eog-vnl:${value.datasetVersion}`
    && value.grid === DISPLAY_RASTER_GRID && value.tilePixels === 256 && value.shardTileSpan === 16
    && value.coverage === "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY"
    && Array.isArray(value.availableZooms) && value.availableZooms.length > 0 && value.availableZooms.length <= 13
    && value.availableZooms.every((zoom: unknown, i: number) => integer(zoom, 0, 12)
      && (i === 0 || (zoom as number) > value.availableZooms[i - 1]))
    && object(value.parts) && object(value.shards) && object(value.totals), "root_invalid");
  const index = value as Index;
  const parts = Object.entries(index.parts);
  fail(parts.length > 0 && parts.length <= 4096, "parts_invalid");
  let partAssets = 0;
  for (const [id, part] of parts) {
    fail(hashPattern.test(id) && object(part) && /^nightlight-fixed:[a-f0-9]{64}$/u.test(part.publicationVersion)
      && hashPattern.test(part.sourceManifestSha256) && integer(part.assetCount, 1, 4096)
      && bounds(part.aoiWgs84) && bounds(part.requestedAoiWgs84), "part_invalid");
    descriptor(part.inventory, SHARD_LIMIT); descriptor(part.displayInventory, SHARD_LIMIT);
    fail(part.inventory.file === `parts/${id}/inventory.json` && part.inventory.sha256 === id
      && part.displayInventory.file === `parts/${id}/display/display-inventory.json`, "part_invalid");
    partAssets += part.assetCount;
  }
  const shards = Object.entries(index.shards), zooms = new Set<number>();
  fail(shards.length > 0, "shards_invalid");
  let shardAssets = 0;
  for (const [key, record] of shards) {
    const match = /^(\d+)\/(\d+)\/(\d+)$/u.exec(key);
    fail(match, "shard_invalid");
    const [zoom, x, y] = match.slice(1).map(Number) as [number, number, number];
    fail(integer(zoom, 0, 12) && integer(x, 0, Math.floor((2 ** zoom - 1) / 16))
      && integer(y, 0, Math.floor((2 ** zoom - 1) / 16)) && [zoom, x, y].join("/") === key
      && index.availableZooms.includes(zoom) && object(record) && integer(record.assetCount, 1), "shard_invalid");
    descriptor(record, SHARD_LIMIT);
    fail(record.file === `shards/${key}.json`, "shard_invalid");
    shardAssets += record.assetCount; zooms.add(zoom);
  }
  fail(isDeepStrictEqual([...zooms].sort((a, b) => a - b), index.availableZooms)
    && Object.keys(index.totals).sort().join() === "assets,displayPngBytes,legacyPngBytes,numericBytes,proofBytes"
    && Object.values(index.totals).every(count => integer(count, 1)) && partAssets === index.totals.assets && shardAssets === partAssets,
  "totals_invalid");
  fail(/^nightlight-sharded:[a-f0-9]{64}$/u.test(index.indexVersion)
    && index.indexVersion === `nightlight-sharded:${hash(canonicalIndexCore(raw))}`, "index_version_invalid");
  return index;
}

/** One immutable root and bounded coordinate shards. No nationwide
 * proof list, global TIFF read, image processing, activation or public URL. */
export class ShardedNightLightPublication {
  private readonly lifetime = new AbortController();
  private indexPromise: Promise<Index> | undefined;
  private readonly pin: ShardedNightLightFile;

  constructor(private readonly directory: string, pin: ShardedNightLightFile) {
    fail(path.isAbsolute(directory), "directory_invalid"); descriptor(pin, ROOT_LIMIT);
    fail(pin.file === "index.json", "root_descriptor_invalid");
    this.pin = { ...pin };
  }

  private active(signal?: AbortSignal) { this.lifetime.signal.throwIfAborted(); signal?.throwIfAborted(); }

  private async checkedPath(file: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const root = path.resolve(this.directory);
    fail(comparable(await realpath(root)) === comparable(root), "path_invalid");
    const rootInfo = await lstat(root);
    fail(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), "path_invalid");
    let selected = root;
    const parts = file.split("/");
    for (const [i, part] of parts.entries()) {
      signal.throwIfAborted(); selected = path.join(selected, part);
      const info = await lstat(selected);
      fail(!info.isSymbolicLink() && (i === parts.length - 1 ? info.isFile() : info.isDirectory()), "path_invalid");
    }
    return selected;
  }

  private async read(record: ShardedNightLightFile, maximum: number, signal: AbortSignal) {
    descriptor(record, maximum); signal.throwIfAborted();
    try {
      const file = await this.checkedPath(record.file, signal), info = await lstat(file);
      fail(info.size === record.bytes, "file_size_invalid");
      const raw = await readFile(file, { signal }); signal.throwIfAborted();
      fail(raw.length === record.bytes && hash(raw) === record.sha256, "file_hash_invalid");
      return raw;
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof Error && error.message.startsWith("nightlight_sharded_")) throw error;
      throw new Error((error as NodeJS.ErrnoException).code === "ENOENT" ? "nightlight_sharded_declared_file_missing" : "nightlight_sharded_file_read_failed");
    }
  }

  private async index(signal?: AbortSignal) {
    this.active(signal);
    this.indexPromise ??= this.read(this.pin, ROOT_LIMIT, this.lifetime.signal).then(raw => validateIndex(JSON.parse(raw.toString("utf8")), raw))
      .catch(error => { this.indexPromise = undefined; throw error; });
    const result = await this.indexPromise; this.active(signal); return result;
  }

  async metadata(signal?: AbortSignal) {
    const index = await this.index(signal);
    return { authority: "PREPARED_ONLY" as const, datasetVersion: index.datasetVersion, indexVersion: index.indexVersion,
      index: { ...this.pin }, availableZooms: [...index.availableZooms], coverage: index.coverage,
      partCount: Object.keys(index.parts).length, shardCount: Object.keys(index.shards).length,
      totals: { ...index.totals }, source: structuredClone(index.source),
      radianceSha256: index.radianceSha256, coverageSha256: index.coverageSha256,
      methodVersion: index.methodVersion, styleVersion: index.styleVersion, policySha256: index.policySha256,
      minimumCloudFreeObservations: index.minimumCloudFreeObservations };
  }

  async window(key: string, signal?: AbortSignal): Promise<PreparedShardedNightLightWindow | null> {
    this.active(signal);
    const requested = windowForKey(key), index = await this.index(signal);
    const combined = signal ? AbortSignal.any([signal, this.lifetime.signal]) : this.lifetime.signal;
    const assets = await this.readShard(index, shardFor(requested), combined), entry = assets?.[key];
    this.active(signal);
    return entry === undefined ? null : this.readWindow(index, key, requested, entry, combined);
  }

  /** Reuse a complete prepared cover of this fixed request, without cropping or
   * relabeling its actual window/LOD. At each zoom, prefer smaller area, then
   * north/west origin, columns and rows. Only 1..3-cell windows are candidates:
   * at most 36 keys and four coordinate shards per zoom (13 zooms maximum).
   * A declared corrupt product fails admission; it is not absent coverage. */
  async coveringWindow(key: string, signal?: AbortSignal): Promise<PreparedShardedNightLightWindow | null> {
    this.active(signal);
    const requested = windowForKey(key), index = await this.index(signal);
    const combined = signal ? AbortSignal.any([signal, this.lifetime.signal]) : this.lifetime.signal;
    for (const zoom of [...index.availableZooms].reverse()) {
      if (zoom > requested.zoom) continue;
      const divisor = 2 ** (requested.zoom - zoom), count = 2 ** zoom;
      const left = Math.floor(requested.x / divisor), right = Math.ceil((requested.x + requested.columns) / divisor);
      const top = Math.floor(requested.y / divisor), bottom = Math.ceil((requested.y + requested.rows) / divisor);
      const candidates: DisplayRasterWindow[] = [];
      for (let columns = right - left; columns <= 3; columns++) {
        for (let rows = bottom - top; rows <= 3; rows++) {
          for (let y = Math.max(0, bottom - rows); y <= Math.min(top, count - rows); y++) {
            for (let x = Math.max(0, right - columns); x <= Math.min(left, count - columns); x++) {
              candidates.push({ grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom, x, y, columns, rows });
            }
          }
        }
      }
      candidates.sort((a, b) => a.columns * a.rows - b.columns * b.rows || a.y - b.y || a.x - b.x
        || a.columns - b.columns || a.rows - b.rows);
      // Request-local only: no retained asset inventory/cache and no rereads of
      // the same shard while examining this zoom's bounded origin neighborhood.
      const shards = new Map<string, Record<string, Entry> | null>();
      for (const candidate of candidates) {
        combined.throwIfAborted();
        const candidateKey = `${zoom}-${candidate.x}-${candidate.y}-${candidate.columns}-${candidate.rows}`;
        const shardKey = shardFor(candidate);
        if (!shards.has(shardKey)) shards.set(shardKey, await this.readShard(index, shardKey, combined));
        const entry = shards.get(shardKey)?.[candidateKey];
        if (entry !== undefined) return this.readWindow(index, candidateKey, candidate, entry, combined);
      }
    }
    this.active(signal); return null;
  }

  private async readShard(index: Index, shardKey: string, signal: AbortSignal): Promise<Record<string, Entry> | null> {
    signal.throwIfAborted();
    const selected = index.shards[shardKey];
    if (!selected) return null;
    const shard = JSON.parse((await this.read(selected, SHARD_LIMIT, signal)).toString("utf8"));
    fail(object(shard) && shard.schemaVersion === "starward-sharded-nightlight-assets-v1" && shard.datasetVersion === index.datasetVersion
      && shard.shardKey === shardKey && object(shard.assets) && Object.keys(shard.assets).length === selected.assetCount, "shard_identity_invalid");
    // Parse only this bounded shard; other shard/proof files are never opened.
    for (const candidate of Object.keys(shard.assets)) fail(shardFor(windowForKey(candidate)) === shardKey, "shard_window_invalid");
    return shard.assets;
  }

  private async readWindow(index: Index, key: string, requested: DisplayRasterWindow, entry: Entry,
    signal: AbortSignal): Promise<PreparedShardedNightLightWindow> {
    signal.throwIfAborted();
    fail(object(entry) && typeof entry.part === "string" && hashPattern.test(entry.part) && object(index.parts[entry.part])
      && isDeepStrictEqual(entry.window, requested) && isDeepStrictEqual(entry.boundsGcj02, displayRasterWindowBounds(requested)), "entry_invalid");
    const part = index.parts[entry.part], prefix = `parts/${entry.part}/`;
    fail(part, "entry_invalid");
    descriptor(entry.proof, PROOF_LIMIT); descriptor(entry.image, IMAGE_LIMIT);
    descriptor(entry.numeric, requested.columns * requested.rows * 256 * 256 * 6 * 8 + PROOF_LIMIT);
    const file = path.posix.basename(entry.image.file);
    fail(fixedImagePattern.test(file) && entry.image.file === prefix + file && entry.proof.file === prefix + file + ".json"
      && entry.numeric.file === prefix + file + ".numbers.tif", "entry_paths_invalid");
    // Same validation contract as the original preparer/reader, not a synthetic
    // PUBLISHED row or authority to switch the active database dataset.
    const partContract = fixedNightLightDataset({ datasetVersion: index.datasetVersion, radianceSha256: index.radianceSha256,
      coverageSha256: index.coverageSha256, source: index.source, payload: { schemaVersion: 2, datasetVersion: index.datasetVersion,
        methodVersion: index.methodVersion, styleVersion: index.styleVersion, policy: NIGHT_LIGHT_FIXED_SCALE,
        policySha256: index.policySha256, minimumCloudFreeObservations: index.minimumCloudFreeObservations,
        source: index.source, aoi: part.aoiWgs84, rasterInventory: { sha256: entry.part,
          publicationVersion: part.publicationVersion, assetCount: part.assetCount } } });
    fail(partContract, "part_contract_invalid");
    const proof = validateFixedNightLightProof(JSON.parse((await this.read(entry.proof, PROOF_LIMIT, signal)).toString("utf8")), partContract,
      { key, file });
    fail(proof.publicationId === entry.publicationId && isDeepStrictEqual(proof.quality, entry.quality)
      && isDeepStrictEqual(proof.image, { ...entry.image, file })
      && isDeepStrictEqual(proof.numeric, { ...entry.numeric, file: file + ".numbers.tif" }), "entry_proof_mismatch");
    fail(object(entry.display) && entry.display.styleVersion === NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, "display_invalid");
    descriptor(entry.display.proof, PROOF_LIMIT); descriptor(entry.display.image, IMAGE_LIMIT);
    const displayProof = JSON.parse((await this.read(entry.display.proof, PROOF_LIMIT, signal)).toString("utf8"));
    const expected = nightLightContrastView(proof, entry.part, entry.display.image);
    fail(isDeepStrictEqual(displayProof, expected) && entry.display.publicationId === expected.publicationId
      && entry.display.image.file === prefix + "display/" + expected.image.file
      && entry.display.proof.file === entry.display.image.file + ".json"
      && entry.display.image.bytes === expected.image.bytes && entry.display.image.sha256 === expected.image.sha256, "display_proof_mismatch");
    this.active(signal);
    return { authority: "PREPARED_ONLY", indexVersion: index.indexVersion, indexSha256: this.pin.sha256, key, part: entry.part,
      proof, displayProof, sourceImage: { ...entry.image }, numeric: { ...entry.numeric }, displayImage: { ...entry.display.image } };
  }

  async pixel(point: Gcj02Point, signal?: AbortSignal) {
    this.active(signal);
    fail(point.system === "GCJ02" && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && Math.abs(point.latitude) < 85.051129 && Math.abs(point.longitude) <= 180, "point_invalid");
    const index = await this.index(signal);
    // One direct coordinate key per declared LOD; never scan assets or parts.
    for (const zoom of [...index.availableZooms].reverse()) {
      const x = Math.floor((point.longitude + 180) / 360 * 2 ** zoom), y = Math.floor(mercatorY(point.latitude) * 2 ** zoom);
      if (x < 0 || y < 0 || x >= 2 ** zoom || y >= 2 ** zoom) continue;
      const prepared = await this.window(`${zoom}-${x}-${y}-1-1`, signal);
      if (!prepared) continue;
      const combined = signal ? AbortSignal.any([signal, this.lifetime.signal]) : this.lifetime.signal;
      // Preserve the existing six-band/one-pixel TIFF reader and its quality
      // meaning. This is a projected map pixel, not a Spot's native 3x3 statistic.
      try {
        await this.checkedPath(prepared.numeric.file, combined);
        const result = await readFixedNightLightPixel(path.join(this.directory, "parts", prepared.part), prepared.proof, point, combined);
        this.active(signal); return result;
      } catch (error) {
        combined.throwIfAborted();
        if (error instanceof Error && error.message.startsWith("nightlight_")) throw error;
        throw new Error((error as NodeJS.ErrnoException).code === "ENOENT"
          ? "nightlight_sharded_declared_file_missing" : "nightlight_sharded_numeric_read_failed");
      }
    }
    return null;
  }

  async display(key: string, signal?: AbortSignal) {
    const prepared = await this.window(key, signal);
    this.active(signal);
    return prepared ? this.readDisplay(prepared, signal) : null;
  }

  async coveringDisplay(key: string, signal?: AbortSignal) {
    const prepared = await this.coveringWindow(key, signal);
    this.active(signal);
    return prepared ? this.readDisplay(prepared, signal) : null;
  }

  private async readDisplay(prepared: PreparedShardedNightLightWindow, signal?: AbortSignal) {
    this.active(signal);
    const combined = signal ? AbortSignal.any([signal, this.lifetime.signal]) : this.lifetime.signal;
    const bytes = await this.read(prepared.displayImage, IMAGE_LIMIT, combined), image = prepared.displayProof.image;
    fail(bytes.length >= 33 && bytes.toString("hex", 0, 8) === "89504e470d0a1a0a" && bytes.toString("ascii", 12, 16) === "IHDR"
      && bytes.readUInt32BE(16) === image.width && bytes.readUInt32BE(20) === image.height, "display_image_invalid");
    this.active(signal); return { prepared, bytes };
  }

  close() { this.lifetime.abort(new Error("nightlight_sharded_closed")); this.indexPromise = undefined; }
}
