import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { gcj02ToWgs84, mercatorY, latitudeForMercatorY, WEB_MERCATOR_CIRCUMFERENCE_M } from "@starward/coordinate-system";
import { terrainReliefRgba } from "./terrain-relief.ts";
import { terrainRequestKey, TERRAIN_SUPPORTED_BOUNDS, TERRAIN_VIEWPORT_RENDER_VERSION, type TerrainRenderer } from "./terrain-request.ts";
import { validateTerrainPublication, terrariumAttribution, TERRARIUM_LICENSE_URL,
  TERRARIUM_MODIFIED_NOTICE, TERRARIUM_LIABILITY_NOTICE, type TerrainPublicationSourceObject } from "./terrain-publication.ts";

const size = 512, tileSize = 256, ttlMs = 24 * 60 * 60_000;
const sourceRoot = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium";
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
type Tile = { elevations: Float32Array; source: TerrainPublicationSourceObject; at: number };

/** Bounded, completed source tiles belong to one TerrainService. An abandoned
 * request never leaves a shared pending tile or source job for its successor. */
export function createTerrainViewportRenderer(transport: typeof fetch = fetch) {
  const completed = new Map<string, Tile>();
  let closed = false;

  async function readTile(z: number, x: number, y: number, signal: AbortSignal, budget: { bytes: number }): Promise<Tile> {
    const key = `${z}/${x}/${y}`, cached = completed.get(key);
    if (cached && Date.now() - cached.at < ttlMs) {
      completed.delete(key); completed.set(key, cached); return cached;
    }
    completed.delete(key);
    const url = `${sourceRoot}/${key}.png`;
    const response = await transport(url, { signal, redirect: "error" });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`terrain_source_http_${response.status}`); }
    const etag = response.headers.get("etag");
    const header = response.headers.get("x-amz-meta-x-imagery-sources") ?? response.headers.get("x-imagery-sources");
    const contributors = header && header.length <= 65536 ? header.split(",").map(value => value.trim()).filter(Boolean) : [];
    try {
      if (!etag || contributors.length > 512) throw new Error("terrain_source_identity_invalid");
      terrariumAttribution(contributors); // Unknown contributors are not silently licensed by geography.
    } catch (error) { await response.body?.cancel(); throw error; }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("terrain_source_body_missing");
    const chunks: Buffer[] = []; let length = 0;
    try {
      for (;;) {
        signal.throwIfAborted();
        const next = await reader.read();
        if (next.done) break;
        length += next.value.byteLength; budget.bytes += next.value.byteLength;
        if (length > 2 * 1024 * 1024 || budget.bytes > 24 * 1024 * 1024) throw new Error("terrain_source_budget_exceeded");
        chunks.push(Buffer.from(next.value));
      }
    } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
    finally { reader.releaseLock(); }
    signal.throwIfAborted();
    const bytes = Buffer.concat(chunks);
    // Check dimensions before decoding an external PNG; no oversized allocation.
    if (bytes.length < 33 || bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a"
      || bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(16) !== tileSize || bytes.readUInt32BE(20) !== tileSize)
      throw new Error("terrain_source_png_invalid");
    const png = PNG.sync.read(bytes, { checkCRC: true });
    const elevations = new Float32Array(tileSize * tileSize);
    for (let index = 0; index < elevations.length; index++) {
      const p = index * 4;
      elevations[index] = png.data[p + 3] === 255 ? png.data[p] * 256 + png.data[p + 1] + png.data[p + 2] / 256 - 32768 : Number.NaN;
    }
    const tile: Tile = { at: Date.now(), elevations, source: { tileId: `terrarium/${key}`, url, sha256: hash(bytes),
      byteSize: bytes.length, etag, hashScope: "FULL_FILE", contributors } };
    signal.throwIfAborted();
    if (!closed) {
      completed.set(key, tile);
      while (completed.size > 16) completed.delete(completed.keys().next().value!);
    }
    return tile;
  }

  const render: TerrainRenderer = async (input, signal) => {
    if (closed) throw new Error("terrain_service_closed");
    if (!input.viewportBounds) throw new Error("terrain_viewport_renderer_requires_bounds");
    const b = input.viewportBounds, count = size * size;
    const northY = mercatorY(b.north), spanY = mercatorY(b.south) - northY, spanX = (b.east - b.west) / 360;
    const latitudes = new Float64Array(count), longitudes = new Float64Array(count), supported = new Uint8Array(count);
    const sourceBounds = [Infinity, Infinity, -Infinity, -Infinity];
    for (let row = 0; row < size; row++) {
      signal.throwIfAborted();
      const latitude = latitudeForMercatorY(northY + row / (size - 1) * spanY);
      for (let column = 0; column < size; column++) {
        const longitude = b.west + column / (size - 1) * (b.east - b.west), index = row * size + column;
        const s = TERRAIN_SUPPORTED_BOUNDS;
        if (longitude < s.west || longitude > s.east || latitude < s.south || latitude > s.north) continue;
        const point = gcj02ToWgs84({ system: "GCJ-02", lat: latitude, lon: longitude });
        const x = (point.lon + 180) / 360, y = mercatorY(point.lat);
        supported[index] = 1; longitudes[index] = x; latitudes[index] = y;
        sourceBounds[0] = Math.min(sourceBounds[0], x); sourceBounds[1] = Math.min(sourceBounds[1], y);
        sourceBounds[2] = Math.max(sourceBounds[2], x); sourceBounds[3] = Math.max(sourceBounds[3], y);
      }
    }
    if (!Number.isFinite(sourceBounds[0])) return null;
    // Native SRTM has nominal ~30 m sampling. Higher zooms would only oversample
    // it. Coarsen until the whole rectangle fits the existing 12-source limit.
    let z = Math.max(0, Math.min(12, Math.ceil(Math.log2(Math.max(size / spanX, size / spanY) / tileSize))));
    const windowAt = (level: number) => {
      const pixels = tileSize * 2 ** level, last = 2 ** level - 1;
      const tileIndex = (position: number, high: boolean) => Math.max(0, Math.min(last, Math.floor((Math.floor(position * pixels - 0.5) + (high ? 1 : 0)) / tileSize)));
      return { left: tileIndex(sourceBounds[0], false), top: tileIndex(sourceBounds[1], false),
        right: tileIndex(sourceBounds[2], true), bottom: tileIndex(sourceBounds[3], true) };
    };
    let window = windowAt(z);
    while ((window.right - window.left + 1) * (window.bottom - window.top + 1) > 12 && z > 0) window = windowAt(--z);
    const pending: Array<{ x: number; y: number }> = [];
    for (let y = window.top; y <= window.bottom; y++) for (let x = window.left; x <= window.right; x++) pending.push({ x, y });
    const budget = { bytes: 0 }, tiles = new Map<string, Tile>(), sources: TerrainPublicationSourceObject[] = [], unavailable: string[] = [];
    const sourceIssues: { tileId: string; reason: "NOT_FOUND" | "READ_FAILED" | "UNSUPPORTED_SOURCE" }[] = [];
    const results = await Promise.allSettled(pending.map(({ x, y }) => readTile(z, x, y, signal, budget)));
    signal.throwIfAborted();
    results.forEach((result, index) => {
      const { x, y } = pending[index], key = `${x}/${y}`;
      if (result.status === "fulfilled") { tiles.set(key, result.value); sources.push(result.value.source); }
      else {
        const tileId = `terrarium/${z}/${key}`;
        unavailable.push(tileId);
        sourceIssues.push({ tileId, reason: result.reason instanceof Error && result.reason.message === "terrain_source_http_404" ? "NOT_FOUND"
          : result.reason instanceof Error && result.reason.message === "terrain_source_contributors_unsupported" ? "UNSUPPORTED_SOURCE" : "READ_FAILED" });
      }
    });
    const elevations = new Float32Array(count).fill(Number.NaN), worldPixels = tileSize * 2 ** z;
    const sample = (x: number, y: number) => tiles.get(`${Math.floor(x / tileSize)}/${Math.floor(y / tileSize)}`)?.elevations[(y % tileSize) * tileSize + x % tileSize] ?? Number.NaN;
    let valid = 0, minimum = Infinity, maximum = -Infinity;
    for (let index = 0; index < count; index++) {
      if (!supported[index]) continue;
      const px = longitudes[index] * worldPixels - 0.5, py = latitudes[index] * worldPixels - 0.5;
      const x = Math.floor(px), y = Math.floor(py), fx = px - x, fy = py - y;
      const values = [sample(x, y), sample(x + 1, y), sample(x, y + 1), sample(x + 1, y + 1)];
      if (!values.every(Number.isFinite)) continue;
      const value = (values[0] * (1 - fx) + values[1] * fx) * (1 - fy) + (values[2] * (1 - fx) + values[3] * fx) * fy;
      elevations[index] = value; valid++; minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
    }
    if (!valid) {
      if (sourceIssues.some(issue => issue.reason !== "NOT_FOUND")) throw new Error("terrain_sources_failed");
      return null;
    }
    const spacing = (row: number) => {
      const latitude = latitudeForMercatorY(northY + row / (size - 1) * spanY);
      const metres = WEB_MERCATOR_CIRCUMFERENCE_M * Math.cos(latitude * Math.PI / 180) / (size - 1);
      return { x: spanX * metres, y: spanY * metres };
    };
    const rgba = terrainReliefRgba(elevations, size, spacing, [112, 139, 104]);
    for (let index = 0; index < count; index++) if (!supported[index]) rgba[index * 4 + 3] = 0;
    signal.throwIfAborted();
    const png = new PNG({ width: size, height: size }); png.data.set(rgba);
    const bytes = PNG.sync.write(png), imageSha256 = hash(bytes), centreSpacing = spacing((size - 1) / 2);
    return { bytes, publication: validateTerrainPublication({
      schemaVersion: "starward-terrain-publication-v3", publicationId: `terrain:${TERRAIN_VIEWPORT_RENDER_VERSION}:${imageSha256}`,
      dataset: `Terrain Tiles Terrarium / source pyramid z${z}`, sourceProvider: "Mapzen / Linux Foundation · USGS / NOAA",
      license: "SRTM / GMTED2010 / ETOPO1：各来源使用与署名说明", licenseUrl: TERRARIUM_LICENSE_URL, doi: null,
      attributionNotice: terrariumAttribution(sources.flatMap(source => source.contributors!)), modifiedProductNotice: TERRARIUM_MODIFIED_NOTICE,
      derivation: "按当前地图视窗逐像素从GCJ-02转换至WGS84，在Web Mercator瓦片金字塔中双线性取样；按每行真实横纵米间隔计算Horn坡度及Igor方向阴影，2倍视觉增强。影像不是实景光照或海拔色带；来源SHA-256校验完整PNG。",
      sourceResolution: "随视野选取的地形金字塔；SRTM标称约30m，GMTED2010/ETOPO1更粗，放大不增加原始细节",
      derivedResolutionM: Math.round(Math.max(centreSpacing.x, centreSpacing.y) * 10) / 10,
      derivedAt: new Date().toISOString(), coordinateSystem: "GCJ02", transformVersion: "starward-coordinate-system-gcj02-mercator-v1",
      centerGcj02: input.center, maximumRadiusKm: null, boundsGcj02: b,
      elevationM: { minimum: Math.round(minimum * 10) / 10, maximum: Math.round(maximum * 10) / 10 },
      validPixelPercent: Math.round(valid / count * 10000) / 100,
      image: { file: `${terrainRequestKey(input)}-${imageSha256}.png`, sha256: imageSha256, byteSize: bytes.length, width: size, height: size },
      imageStyle: "RELIEF_OVERLAY", sources, unavailableSourceTiles: unavailable, sourceIssues,
      limitations: [TERRARIUM_LIABILITY_NOTICE,
        "来源为历史地形汇编，非实时更新；SRTM约2000年、GMTED2010约2010年、ETOPO1约2009年，局部可能含建筑、植被及重采样/海岸接缝误差。",
        "包含ETOPO1海底高程，真实负值保留；不是水深导航或现场遮挡测量。阴影深浅不表示精确海拔。",
        "按当前地图整幅视窗派生，平坦处透明，灰色斜纹为范围内缺测。当前仅提供既定国内技术覆盖范围，范围外透明且未认证覆盖。",
        `当前影像有效高程占比${Math.round(valid / count * 10000) / 100}%；派生横纵像素间隔约${Math.round(centreSpacing.x)} / ${Math.round(centreSpacing.y)}m，非原始采样精度。`],
    }) };
  };
  return { render, close: () => { closed = true; completed.clear(); } };
}
