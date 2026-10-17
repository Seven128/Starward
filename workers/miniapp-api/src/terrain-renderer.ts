import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readCopernicusElevationWindow } from "./copernicus-elevation.ts";
import { PNG } from "pngjs";
import { terrainReliefRgba } from "./terrain-relief.ts";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import type { TerrainElevationColorEncoding } from "@starward/miniapp-contracts";
import { terrainBounds, terrainRenderVersion, terrainRequestKey, TERRAIN_LEGACY_MAP_RENDER_VERSION,
  type RenderedTerrain, type TerrainRenderRequest } from "./terrain-request.ts";
export { normalizeTerrainRequest, terrainBounds, terrainRequestKey, TERRAIN_RENDER_VERSION,
  TERRAIN_LEGACY_MAP_RENDER_VERSION, TERRAIN_MAP_RENDER_VERSION,
  type RenderedTerrain, type TerrainRenderer, type TerrainRenderRequest } from "./terrain-request.ts";
import { COPERNICUS_DEM_DOI, COPERNICUS_DEM_LICENSE_URL, COPERNICUS_DEM_SOURCE_NOTICE,
  COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE, COPERNICUS_DEM_LIABILITY_NOTICE,
  validateTerrainPublication, type TerrainPublication, type TerrainPublicationSourceObject } from "./terrain-publication.ts";

const size = 512;
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
let encodingPromise: Promise<Omit<TerrainElevationColorEncoding, "imageSha256">> | undefined;

/** One licensed DSM sampling path. Spot retains elevation colour; the Map
 * consumes a separate relief overlay suitable for compositing on a basemap. */
export async function renderTerrain(input: TerrainRenderRequest, signal: AbortSignal, transport: typeof fetch = fetch): Promise<RenderedTerrain | null> {
  if (input.viewportBounds) throw new Error("terrain_radius_renderer_requires_radius");
  const bounds = terrainBounds(input), count = size * size;
  const latitudes = new Float64Array(count), longitudes = new Float64Array(count);
  const elevations = new Float32Array(count).fill(Number.NaN);
  const sourceBounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (let row = 0; row < size; row++) {
    signal.throwIfAborted();
    for (let column = 0; column < size; column++) {
      const point = gcj02ToWgs84({ system: "GCJ-02", lat: bounds.north - row * (bounds.north - bounds.south) / (size - 1),
        lon: bounds.west + column * (bounds.east - bounds.west) / (size - 1) });
      const index = row * size + column;
      latitudes[index] = point.lat; longitudes[index] = point.lon;
      sourceBounds[0] = Math.min(sourceBounds[0], point.lon); sourceBounds[1] = Math.min(sourceBounds[1], point.lat);
      sourceBounds[2] = Math.max(sourceBounds[2], point.lon); sourceBounds[3] = Math.max(sourceBounds[3], point.lat);
    }
  }
  const budget = { bytes: 0 }, pending: Array<{lat: number; lon: number}> = [];
  for (let lat = Math.floor(sourceBounds[1]); lat <= Math.floor(sourceBounds[3]); lat++)
    for (let lon = Math.floor(sourceBounds[0]); lon <= Math.floor(sourceBounds[2]); lon++) {
      if (pending.length >= 12) throw new Error("terrain_source_extent_invalid");
      pending.push({ lat, lon });
    }
  const tiles = await Promise.allSettled(pending.map(({ lat, lon }) => readCopernicusElevationWindow(lat, lon, sourceBounds,
    (sourceBounds[3] - sourceBounds[1]) / (size - 1), signal, budget, transport)));
  signal.throwIfAborted();
  const sources: TerrainPublicationSourceObject[] = [], unavailable: string[] = [];
  tiles.forEach((result, tileIndex) => {
    if (result.status === "rejected") { unavailable.push(`${pending[tileIndex].lat},${pending[tileIndex].lon}`); return; }
    const tile = result.value;
    sources.push(tile.source);
    for (let index = 0; index < count; index++) {
      const x = Math.floor((longitudes[index] - tile.west) / tile.pixelX) - tile.left;
      const y = Math.floor((latitudes[index] - tile.north) / tile.pixelY) - tile.top;
      if (x < 0 || y < 0 || x >= tile.width || y >= tile.height) continue;
      const value = Number(tile.values[y * tile.width + x]);
      if (Number.isFinite(value) && value !== tile.noData) elevations[index] = value;
    }
  });
  let valid = 0, minimum = Infinity, maximum = -Infinity, sum = 0;
  for (const value of elevations) if (Number.isFinite(value)) { valid++; sum += value; minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }
  if (!valid) {
    const failure = tiles.find(result => result.status === "rejected" && !String(result.reason).includes("terrain_source_http_404"));
    if (failure?.status === "rejected") throw new Error("terrain_sources_failed", { cause: failure.reason });
    return null;
  }
  const encoding = await (encodingPromise ??= readFile(new URL("../assets/terrain/elevation-color.json", import.meta.url), "utf8").then(text => JSON.parse(text)));
  const bytesPerPixel = input.radiusKm * 2000 / (size - 1), fallback = sum / valid;
  const sample = (row: number, column: number) => {
    const value = elevations[clamp(row, 0, size - 1) * size + clamp(column, 0, size - 1)];
    return Number.isFinite(value) ? value : fallback;
  };
  const png = new PNG({ width: size, height: size });
  if (input.purpose === "MAP") {
    png.data.set(terrainReliefRgba(elevations, size, bytesPerPixel, encoding.highRgb, input.renderVersion === TERRAIN_LEGACY_MAP_RENDER_VERSION));
  } else for (let row = 0; row < size; row++) {
    signal.throwIfAborted();
    for (let column = 0; column < size; column++) {
      const index = row * size + column, value = elevations[index];
      if (!Number.isFinite(value)) continue;
      const dx = (sample(row, column + 1) - sample(row, column - 1)) / ((column === 0 || column === size - 1 ? 1 : 2) * bytesPerPixel);
      const dy = (sample(row + 1, column) - sample(row - 1, column)) / ((row === 0 || row === size - 1 ? 1 : 2) * bytesPerPixel);
      const slope = Math.PI / 2 - Math.atan(Math.hypot(dx, dy)), aspect = Math.atan2(-dx, dy);
      const shade = clamp((Math.sin(42 * Math.PI / 180) * Math.sin(slope) + Math.cos(42 * Math.PI / 180) * Math.cos(slope) * Math.cos(315 * Math.PI / 180 - aspect) + 0.18) / 1.18, 0, 1);
      const normalized = clamp((value - encoding.minimumM) / (encoding.maximumM - encoding.minimumM), 0, 1);
      for (let channel = 0; channel < 3; channel++) png.data[index * 4 + channel] = clamp(Math.floor((encoding.lowRgb[channel] * (1 - normalized) + encoding.highRgb[channel] * normalized) * (0.67 + 0.42 * shade)), 0, 255);
      png.data[index * 4 + 3] = encoding.alpha;
    }
  }
  const bytes = PNG.sync.write(png), imageSha256 = hash(bytes);
  const publication: TerrainPublication = {
    schemaVersion: "starward-terrain-publication-v2", publicationId: `terrain:${terrainRenderVersion(input)}:${imageSha256}`,
    dataset: "Copernicus DEM GLO-30 Public AWS COG 2021", sourceProvider: "Copernicus Programme / AWS Open Data",
    license: "Copernicus DEM GLO-30 free worldwide licence", licenseUrl: COPERNICUS_DEM_LICENSE_URL, doi: COPERNICUS_DEM_DOI,
    attributionNotice: COPERNICUS_DEM_SOURCE_NOTICE, modifiedProductNotice: COPERNICUS_DEM_MODIFIED_PRODUCT_NOTICE,
    derivation: input.purpose === "MAP"
      ? "Starward从真实WGS84 DSM按GCJ-02逐像素取样，采用Horn坡度和Igor坡向阴影表达地势，阴影使用2倍视觉增强及对比度映射；平坦区域透明，灰色斜纹表示缺测。阴影不是实景光照或精确海拔色带。来源校验绑定实际读取的HTTP字节范围及对象ETag，不是全文件哈希。"
      : "Starward从真实WGS84 DSM按GCJ-02逐像素取样，派生高程基色、合成山体阴影及透明缺测像素。来源校验绑定实际读取的HTTP字节范围及对象ETag，不是全文件哈希。",
    sourceResolution: "1 arc-second (approximately 30 m)", derivedResolutionM: Math.round(bytesPerPixel * 10) / 10,
    derivedAt: new Date().toISOString(), coordinateSystem: "GCJ02", transformVersion: "starward-coordinate-system-gcj02-grid-v2",
    centerGcj02: { latitude: input.center.latitude, longitude: input.center.longitude }, maximumRadiusKm: input.radiusKm,
    boundsGcj02: bounds, elevationM: { minimum: Math.round(minimum * 10) / 10, maximum: Math.round(maximum * 10) / 10 },
    validPixelPercent: Math.round(valid / count * 10000) / 100,
    image: { file: `${terrainRequestKey(input)}-${imageSha256}.png`, sha256: imageSha256, byteSize: bytes.length, width: size, height: size },
    imageStyle: input.purpose === "MAP" ? "RELIEF_OVERLAY" : "ELEVATION_COLOR",
    ...(input.purpose === "MAP" ? {} : { elevationColorEncoding: { ...encoding, imageSha256 } }), sources, unavailableSourceTiles: unavailable,
    limitations: [COPERNICUS_DEM_LIABILITY_NOTICE, input.purpose === "MAP"
      ? "按当前位置和查看半径读取公开地形源；平坦区域透明以保留底图，灰色斜纹为未取得或无效源数据，不能解释为平地。阴影深浅不表示精确海拔。"
      : "按当前位置和查看半径读取公开地形源；透明像素为未取得或无效源数据，不能解释为平地。",
      "Copernicus DEM是2011至2015年获取的数字表面模型，可能包含建筑、基础设施和植被；不是裸地模型或现场遮挡测量。",
      "派生图的像素间隔不代表原始采样更精细或逐点精度；大范围查看使用源产品的既有平均重采样概览。"],
  };
  return { publication: validateTerrainPublication(publication), bytes };
}
