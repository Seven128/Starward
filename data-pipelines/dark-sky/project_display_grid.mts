/** Offline numerical warp geometry. Reuse the actual project GCJ transform;
 * no Python copy of its distortion footprint or inverse iteration. */
import { readFile, mkdir, writeFile, link, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { endianness } from "node:os";
import { wgs84ToGcj02RasterBranches, gcj02ToWgs84RasterBranches, displayRasterWindowBounds, DISPLAY_RASTER_GRID,
  WEB_MERCATOR_CIRCUMFERENCE_M, latitudeForMercatorY, mercatorY, type DisplayRasterWindow } from "@starward/coordinate-system";

export interface NightLightWarpSpec {
  schemaVersion: "starward-nightlight-warp-input-v1";
  source: { width: number; height: number; west: number; north: number; longitudeStep: number; latitudeStep: number };
  /** Numerical quadrature only; original radiance/quality are constant within a source pixel. */
  sourceSubdivision?: number;
  window: DisplayRasterWindow;
}
const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const radians = Math.PI / 180;
const sourceFootprintInputLimit = 4 * 1024 * 1024;

type SourceFootprint = { west: number; south: number; east: number; north: number };
type InverseBranches = ReturnType<typeof gcj02ToWgs84RasterBranches>;

/** The geometry producer and input declaration must use precisely the same
 * pixel corners and continuous inverse branches. No per-window array is kept
 * by declaration; the actual warp owns its numerical arrays separately. */
function forEachTargetCorner(window: DisplayRasterWindow, visit: (index: number, branches: InverseBranches) => void) {
  const width = window.columns * 256, height = window.rows * 256, worldPixels = 256 * 2 ** window.zoom;
  for (let row = 0; row <= height; row++) for (let column = 0; column <= width; column++) {
    visit(row * (width + 1) + column, gcj02ToWgs84RasterBranches({ system: "GCJ-02",
      lon: (window.x * 256 + column) / worldPixels * 360 - 180,
      lat: latitudeForMercatorY((window.y * 256 + row) / worldPixels) }));
  }
}

function assertSourceFootprintParts(value: unknown): asserts value is DisplayRasterWindow[][] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4096) throw new Error("nightlight_source_footprint_parts_invalid");
  let encodedBytes = 2 + value.length - 1;
  // Admit the entire declaration before its first potentially expensive corner
  // traversal. A bad later part cannot leave earlier generated output behind.
  for (const part of value) {
    if (!Array.isArray(part) || part.length < 1 || part.length > 4096) throw new Error("nightlight_source_footprint_parts_invalid");
    encodedBytes += 2 + part.length - 1;
    for (const window of part) {
      if (!window || typeof window !== "object" || Array.isArray(window) ||
        Object.keys(window).sort().join() !== "columns,grid,rows,tilePixels,x,y,zoom")
        throw new Error("nightlight_source_footprint_window_invalid");
      try { displayRasterWindowBounds(window); }
      catch { throw new Error("nightlight_source_footprint_window_invalid"); }
      encodedBytes += Buffer.byteLength(JSON.stringify(window));
      if (encodedBytes > sourceFootprintInputLimit) throw new Error("nightlight_source_footprint_input_budget_exceeded");
    }
  }
}

/** Conservative WGS84 support for each explicitly supplied part. Both inverse
 * branches matter at the GCJ footprint edge; this is neither a country outline
 * nor a claim of source-pixel resolution, available data or published coverage. */
export function nightLightSourceFootprints(value: unknown): SourceFootprint[] {
  assertSourceFootprintParts(value);
  return value.map(part => {
    const bounds: SourceFootprint = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity };
    const include = (point: InverseBranches["identity"]) => {
      bounds.west = Math.min(bounds.west, point.lon); bounds.east = Math.max(bounds.east, point.lon);
      bounds.south = Math.min(bounds.south, point.lat); bounds.north = Math.max(bounds.north, point.lat);
    };
    for (const window of part) forEachTargetCorner(window, (_index, branches) => {
      include(branches.shifted); include(branches.identity);
    });
    return bounds;
  });
}

export async function declareNightLightSourceFootprints(value: unknown) {
  const parts = nightLightSourceFootprints(value);
  const sources = ["data-pipelines/dark-sky/project_display_grid.mts", "packages/coordinate-system/src/index.ts",
    "packages/coordinate-system/src/raster-grid.ts", "packages/coordinate-system/src/mercator.ts"];
  const sourceBindings = Object.fromEntries(await Promise.all(sources.map(async file =>
    [file, sha(await readFile(new URL(`../../${file}`, import.meta.url)))])));
  return { parts, sourceBindings };
}
type GridFile = { file: string; sha256: string; bytes: number };
const sourceKeys = ["sourceX", "sourceY", "identityX", "identityY"] as const;

async function immutableWrite(file: string, bytes: Buffer | string) {
  try { await writeFile(file, bytes, { flag: "wx" }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!(await readFile(file)).equals(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes))) throw new Error("nightlight_immutable_geometry_conflict");
  }
}

async function checkedSourceFiles(directory: string, files: Record<string, GridFile>, size: number) {
  for (const key of sourceKeys) {
    const item = files?.[key], file = path.join(directory, `${key}.f64`);
    if (!item || item.file !== `${key}.f64` || item.bytes !== size || !/^[a-f0-9]{64}$/u.test(item.sha256)) throw new Error("nightlight_source_grid_cache_invalid");
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== size || sha(await readFile(file)) !== item.sha256) throw new Error("nightlight_source_grid_cache_invalid");
  }
}

export async function projectNightLightGrid(spec: NightLightWarpSpec, directory: string, options: { sourceCacheDirectory?: string } = {}) {
  const original = spec.source, subdivision = spec.sourceSubdivision ?? 1, window = spec.window;
  if (!Number.isInteger(subdivision) || subdivision < 1 || subdivision > 256) throw new Error("nightlight_warp_subdivision_invalid");
  const s = { ...original, width: original.width * subdivision, height: original.height * subdivision,
    longitudeStep: original.longitudeStep / subdivision, latitudeStep: original.latitudeStep / subdivision };
  const boundsGcj02 = displayRasterWindowBounds(window);
  if (endianness() !== "LE" || spec.schemaVersion !== "starward-nightlight-warp-input-v1" || !path.isAbsolute(directory)
    || window.grid !== DISPLAY_RASTER_GRID || !Number.isInteger(s.width) || !Number.isInteger(s.height)
    || s.width < 2 || s.height < 2 || s.width * s.height > 2402 ** 2
    || ![s.west, s.north, s.longitudeStep, s.latitudeStep].every(Number.isFinite)
    || s.longitudeStep <= 0 || s.latitudeStep >= 0 || s.width * s.longitudeStep > 10.01 || -s.height * s.latitudeStep > 10.01
    || s.west < -180 || s.west + s.width * s.longitudeStep > 180
    || s.north > 85 || s.north + s.height * s.latitudeStep < -85) throw new Error("nightlight_warp_spec_invalid");
  if (options.sourceCacheDirectory && !path.isAbsolute(options.sourceCacheDirectory)) throw new Error("nightlight_source_grid_cache_path_invalid");
  const coordinateSource = await readFile(new URL("../../packages/coordinate-system/src/index.ts", import.meta.url));
  const gridSource = await readFile(new URL("../../packages/coordinate-system/src/raster-grid.ts", import.meta.url));
  const mercatorSource = await readFile(new URL("../../packages/coordinate-system/src/mercator.ts", import.meta.url));
  const projectionSource = await readFile(new URL(import.meta.url));
  const sourceIdentity = { source: s, originalSource: original, sourceSubdivision: subdivision,
    projectionSourceSha256: sha(projectionSource), coordinateSourceSha256: sha(coordinateSource), rasterGridSourceSha256: sha(gridSource),
    mercatorSourceSha256: sha(mercatorSource) };
  const cacheDirectory = options.sourceCacheDirectory && path.join(options.sourceCacheDirectory, sha(JSON.stringify(sourceIdentity)));
  const sourceDirectory = cacheDirectory || directory;
  await mkdir(sourceDirectory, { recursive: true });
  const files: Record<string, GridFile> = {};
  let cached = false;
  if (cacheDirectory) {
    let record: { schemaVersion: string; identity: unknown; files: Record<string, GridFile> } | undefined;
    try {
      const marker = path.join(cacheDirectory, "source-grid.json"), info = await lstat(marker);
      if (!info.isFile() || info.size > 16_384) throw new Error("nightlight_source_grid_cache_invalid");
      record = JSON.parse(await readFile(marker, "utf8"));
    } catch (error) {
      // Only an unsealed first generation may be resumed. Missing files below
      // a sealed marker are an invalid cache, not permission to replace data.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (record !== undefined) {
      if (record?.schemaVersion !== "starward-nightlight-source-grid-v1" || JSON.stringify(record.identity) !== JSON.stringify(sourceIdentity)) throw new Error("nightlight_source_grid_cache_invalid");
      try { await checkedSourceFiles(cacheDirectory, record.files, s.width * s.height * 8); }
      catch { throw new Error("nightlight_source_grid_cache_invalid"); }
      for (const key of sourceKeys) files[key] = record.files[key];
      cached = true;
    }
  }
  if (!cached) {
    const sourceX = new Float64Array(s.width * s.height), sourceY = new Float64Array(sourceX.length);
    const identityX = new Float64Array(sourceX.length), identityY = new Float64Array(sourceX.length);
    // GDAL uses top-left source pixel corners. Cache only this window-independent
    // dense geometry; radiance, coverage and target areas are never cached here.
    for (let row = 0; row < s.height; row++) for (let column = 0; column < s.width; column++) {
      const branches = wgs84ToGcj02RasterBranches({ system: "WGS84", lat: s.north + row * s.latitudeStep, lon: s.west + column * s.longitudeStep });
      const point = branches.shifted, at = row * s.width + column;
      sourceX[at] = point.lon / 360 * WEB_MERCATOR_CIRCUMFERENCE_M;
      sourceY[at] = (0.5 - mercatorY(point.lat)) * WEB_MERCATOR_CIRCUMFERENCE_M;
      identityX[at] = branches.identity.lon / 360 * WEB_MERCATOR_CIRCUMFERENCE_M;
      identityY[at] = (0.5 - mercatorY(branches.identity.lat)) * WEB_MERCATOR_CIRCUMFERENCE_M;
    }
    for (const [key, values] of Object.entries({ sourceX, sourceY, identityX, identityY })) {
      const file = `${key}.f64`, bytes = Buffer.from(values.buffer);
      await immutableWrite(path.join(sourceDirectory, file), bytes);
      files[key] = { file, sha256: sha(bytes), bytes: bytes.length };
    }
    if (cacheDirectory) await immutableWrite(path.join(cacheDirectory, "source-grid.json"), JSON.stringify({
      schemaVersion: "starward-nightlight-source-grid-v1", identity: sourceIdentity, files }, null, 2) + "\n");
  }
  await mkdir(directory, { recursive: true });
  if (cacheDirectory) for (const key of sourceKeys) {
    const source = path.join(cacheDirectory, files[key]!.file), target = path.join(directory, files[key]!.file);
    try { await link(source, target); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const a = await lstat(source, { bigint: true }), b = await lstat(target, { bigint: true });
      if (a.dev !== b.dev || a.ino !== b.ino) throw new Error("nightlight_source_grid_link_conflict");
    }
  }
  const width = window.columns * 256, height = window.rows * 256;
  const worldPixels = 256 * 2 ** window.zoom;
  const cornersLon = new Float64Array((width + 1) * (height + 1)), cornersSinLat = new Float64Array(cornersLon.length);
  const identityLon = new Float64Array(cornersLon.length), identitySinLat = new Float64Array(cornersLon.length);
  forEachTargetCorner(window, (at, branches) => {
    const point = branches.shifted;
    cornersLon[at] = point.lon * radians; cornersSinLat[at] = Math.sin(point.lat * radians);
    identityLon[at] = branches.identity.lon * radians; identitySinLat[at] = Math.sin(branches.identity.lat * radians);
  });
  const targetArea = new Float64Array(width * height);
  const targetBranch = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const a = row * (width + 1) + column, b = a + 1, d = a + width + 1, c = d + 1;
    const polygon = [a, b, c, d]; let twiceArea = 0;
    const selected = gcj02ToWgs84RasterBranches({ system: "GCJ-02", lon: (window.x * 256 + column + .5) / worldPixels * 360 - 180,
      lat: latitudeForMercatorY((window.y * 256 + row + .5) / worldPixels) }).selected;
    targetBranch[row * width + column] = selected === "SHIFTED" ? 1 : 0;
    const lon = selected === "SHIFTED" ? cornersLon : identityLon, sinLat = selected === "SHIFTED" ? cornersSinLat : identitySinLat;
    for (let edge = 0; edge < 4; edge++) {
      const from = polygon[edge]!, to = polygon[(edge + 1) % 4]!;
      twiceArea += (lon[to]! - lon[from]!) * (sinLat[from]! + sinLat[to]!);
    }
    targetArea[row * width + column] = Math.abs(twiceArea) / 2;
  }
  for (const [key, values] of Object.entries({ targetArea, targetBranch })) {
    const file = `${key}.${key === "targetBranch" ? "u8" : "f64"}`, bytes = Buffer.from(values.buffer);
    await immutableWrite(path.join(directory, file), bytes);
    files[key] = { file, sha256: sha(bytes), bytes: bytes.length };
  }
  const metadata = { schemaVersion: "starward-nightlight-warp-grid-v1", grid: DISPLAY_RASTER_GRID, source: s,
    originalSource: original, sourceSubdivision: subdivision, window,
    transform: "shared-gcj02-dense-geolocation-separated-branches-v3", projectionSourceSha256: sha(projectionSource), coordinateSourceSha256: sha(coordinateSource),
    rasterGridSourceSha256: sha(gridSource), mercatorSourceSha256: sha(mercatorSource), inputSha256: sha(JSON.stringify(spec)), width, height, boundsGcj02,
    // These are projected GCJ display coordinates, not a WGS84 EPSG:3857 asset.
    projectedUnits: "derived-GCJ-Mercator-metres", sourceGeolocationConvention: "TOP_LEFT_CORNER",
    area: "spherical-steradians-four-inverse-corners-v1", byteOrder: "little-endian",
    affine: [WEB_MERCATOR_CIRCUMFERENCE_M / worldPixels, 0,
      (window.x / 2 ** window.zoom - 0.5) * WEB_MERCATOR_CIRCUMFERENCE_M, 0,
      -WEB_MERCATOR_CIRCUMFERENCE_M / worldPixels, (0.5 - window.y / 2 ** window.zoom) * WEB_MERCATOR_CIRCUMFERENCE_M], files };
  await immutableWrite(path.join(directory, "warp-grid.json"), JSON.stringify(metadata, null, 2) + "\n");
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--source-footprints") {
    const chunks: Buffer[] = []; let bytes = 0;
    for await (const chunk of process.stdin) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += value.length;
      if (bytes > sourceFootprintInputLimit) throw new Error("nightlight_source_footprint_input_budget_exceeded");
      chunks.push(value);
    }
    console.log(JSON.stringify(await declareNightLightSourceFootprints(JSON.parse(Buffer.concat(chunks).toString("utf8")))));
  } else {
    if (![4, 6].includes(args.length) || args[0] !== "--spec" || args[2] !== "--output" || !path.isAbsolute(args[1]!)
      || args.length === 6 && (args[4] !== "--source-cache" || !path.isAbsolute(args[5]!))) throw new Error("nightlight_projection_arguments_invalid");
    const result = await projectNightLightGrid(JSON.parse(await readFile(args[1]!, "utf8")), args[3]!, { sourceCacheDirectory: args[5] });
    console.log(JSON.stringify({ width: result.width, height: result.height, transform: result.transform }));
  }
}
