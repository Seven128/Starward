import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { copyFixedRasterCell } from "./fixed-raster-image.ts";
import { latitudeForMercatorY } from "@starward/coordinate-system";
import { terrainFixedRequest, terrainLocationIsSupported, terrainRequestKey, TERRAIN_SUPPORTED_BOUNDS,
  TERRAIN_WINDOW_RENDER_VERSION, type TerrainRenderRequest, type RenderedTerrain } from "./terrain-request.ts";
import { terrainSourceSetHash, validateTerrainPublication, terrariumAttribution,
  type TerrainPublicationSourceObject, type TerrainPublication } from "./terrain-publication.ts";

/** Copy already-shaded fixed cells, without resampling colours or recomputing
 * numeric terrain. The existing source/cache/reader owner resolves each cell. */
export async function renderTerrainWindow(input: TerrainRenderRequest, parentSignal: AbortSignal,
  resolve: (request: TerrainRenderRequest, signal: AbortSignal) => Promise<RenderedTerrain | null>): Promise<RenderedTerrain | null> {
  const window = input.fixedWindow;
  if (!window || !input.viewportBounds) throw new Error("terrain_window_required");
  const lifetime = new AbortController(), signal = AbortSignal.any([parentSignal, lifetime.signal]);
  const width = window.columns * 256, height = window.rows * 256, png = new PNG({ width, height });
  const cells: NonNullable<TerrainPublication["fixedWindow"]>["cells"] = [];
  const sources = new Map<string, TerrainPublicationSourceObject>(), issues = new Map<string, "NOT_FOUND" | "READ_FAILED" | "UNSUPPORTED_SOURCE">();
  let reference: TerrainPublication | null = null, validPixels = 0, minimum = Infinity, maximum = -Infinity;
  const resolutions: number[] = [];
  // Two readers advance as each cell finishes, even if an earlier cell is
  // slower. Cached cells between new cells must not serialize their I/O.
  // Results are consumed in geographic order; the existing at-most-3x3 window
  // bounds the ready results, and the service owns the two-source global limit.
  const readCell = async (index: number) => {
    const x = window.x + index % window.columns, y = window.y + Math.floor(index / window.columns);
    const request = terrainFixedRequest({ grid: window.grid, zoom: window.zoom, x, y, span: 1, tilePixels: 256 });
    if (!terrainLocationIsSupported(request)) return { result: null, failure: "NOT_FOUND" as const, supported: false };
    try { return { result: await resolve(request, signal), failure: "NOT_FOUND" as const, supported: true }; }
    catch { return { result: null, failure: "READ_FAILED" as const, supported: true }; }
  };
  const count = window.columns * window.rows;
  const pending = new Map<number, ReturnType<typeof readCell>>();
  let next = 0;
  const startNext = () => {
    if (next >= count || signal.aborted) return;
    const index = next++;
    pending.set(index, readCell(index).then(result => { startNext(); return result; }));
  };
  try {
  startNext(); startNext();
  for (let row = 0; row < window.rows; row++) for (let column = 0; column < window.columns; column++) {
    signal.throwIfAborted();
    const x = window.x + column, y = window.y + row;
    const index = row * window.columns + column;
    const { result, failure, supported } = await pending.get(index)!;
    pending.delete(index); signal.throwIfAborted();
    cells.push({ x, y, publicationId: result?.publication.publicationId ?? null, file: result?.publication.image.file ?? null });
    if (result) {
      const publication = result.publication;
      if (!publication.fixedRaster || publication.fixedRaster.span !== 1) throw new Error("terrain_window_cell_invalid");
      copyFixedRasterCell(png, result.bytes, column, row);
      reference ??= publication;
      validPixels += publication.validPixelCount ?? publication.validPixelPercent / 100 * 256 * 256;
      minimum = Math.min(minimum, publication.elevationM.minimum); maximum = Math.max(maximum, publication.elevationM.maximum);
      resolutions.push(publication.derivedResolutionM);
      for (const source of publication.sources) {
        const previous = sources.get(source.tileId);
        if (previous && previous.sha256 !== source.sha256) throw new Error("terrain_source_snapshot_conflict");
        sources.set(source.tileId, source);
      }
      for (const issue of publication.sourceIssues ?? []) issues.set(issue.tileId, issue.reason);
    } else if (supported) {
      issues.set(`fixed/${window.zoom}/${x}/${y}`, failure);
      for (let pixelRow = 0; pixelRow < 256; pixelRow++) {
        const latitude = latitudeForMercatorY((y + (pixelRow + 0.5) / 256) / 2 ** window.zoom);
        for (let pixelColumn = 0; pixelColumn < 256; pixelColumn++) {
          const longitude = (x + (pixelColumn + 0.5) / 256) / 2 ** window.zoom * 360 - 180, b = TERRAIN_SUPPORTED_BOUNDS;
          if (longitude < b.west || longitude > b.east || latitude < b.south || latitude > b.north) continue;
          const stripe = (x * 256 + pixelColumn + y * 256 + pixelRow) % 12 < 2;
          png.data.set([125, 130, 125, stripe ? 90 : 0], ((row * 256 + pixelRow) * width + column * 256 + pixelColumn) * 4);
        }
      }
    }
  }
  if (!reference) {
    if ([...issues.values()].some(reason => reason !== "NOT_FOUND")) throw new Error("terrain_sources_failed");
    return null;
  }
  const sourceList = [...sources.values()].sort((a, b) => a.tileId.localeCompare(b.tileId, "en"));
  // A composed view keeps the existing aggregate input-byte budget as well as
  // each fixed cell's 12-source/24-MiB and two-active-derivation limits.
  if (sourceList.reduce((total, source) => total + source.byteSize, 0) > 24 * 1024 * 1024) throw new Error("terrain_source_budget_exceeded");
  const bytes = PNG.sync.write(png), sha256 = createHash("sha256").update(bytes).digest("hex");
  const sourceIssues = [...issues].map(([tileId, reason]) => ({ tileId, reason }));
  const sourceSetSha256 = terrainSourceSetHash(sourceList, sourceIssues);
  const { fixedRaster: _cellGrid, ...base } = reference;
  return { bytes, publication: validateTerrainPublication({ ...base,
    publicationId: `terrain:${terrainRequestKey(input)}:${sourceSetSha256}:${sha256}`, derivedAt: new Date().toISOString(),
    fixedWindow: { ...window, haloPixels: 1, sourceSetSha256, styleVersion: "horn-igor-relief-v3", cells },
    centerGcj02: input.center, boundsGcj02: input.viewportBounds,
    derivation: "固定GCJ-02 Mercator显示小块逐像素反算WGS84，以1像素halo计算坡度阴影；当前矩形仅逐字节拼接这些已发布小块，不重采样颜色、不改变数值高程。不是EPSG:3857数值源。",
    validPixelCount: Math.round(validPixels), validPixelPercent: Math.round(validPixels / (width * height) * 10000) / 100,
    elevationM: { minimum, maximum }, derivedResolutionM: Math.max(...resolutions),
    attributionNotice: terrariumAttribution(sourceList.flatMap(source => source.contributors!)),
    sources: sourceList, unavailableSourceTiles: [...issues.keys()], sourceIssues,
    image: { file: `${terrainRequestKey(input)}-${sourceSetSha256}-${sha256}.png`, sha256, byteSize: bytes.length, width, height },
    limitations: [...reference.limitations.filter(limit => !limit.startsWith("当前影像有效高程占比")),
      `当前组合影像有效高程占比${Math.round(validPixels / (width * height) * 10000) / 100}%；仅已获源小块有效，缺测小块保留缺测。`],
  }) };
  } finally {
    // A failed composition must retire its look-ahead consumer too. Other
    // windows sharing that cell keep their own reader and are not cancelled.
    lifetime.abort(new Error("terrain_window_finished"));
  }
}
