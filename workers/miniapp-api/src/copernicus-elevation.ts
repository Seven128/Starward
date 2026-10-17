import { createHash } from "node:crypto";
import { fromCustomClient } from "geotiff";
import type { TerrainPublicationSourceObject, TerrainSourceRange } from "./terrain-publication.ts";

const sourceRoot = "https://copernicus-dem-30m.s3.amazonaws.com";
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Fixed public source; callers cannot supply an upstream URL. Range proofs
 * bind the bytes actually consumed and the S3 object ETag, not a full-file hash. */
export async function readCopernicusElevationWindow(lat: number, lon: number, bounds: number[], resolution: number,
  signal: AbortSignal, budget: { bytes: number; nativeSamples?: number; maximumNativeSamples?: number },
  transport: typeof fetch, selection: "DISPLAY" | "NATIVE" = "DISPLAY") {
  const tileId = `Copernicus_DSM_COG_10_N${String(lat).padStart(2, "0")}_00_E${String(lon).padStart(3, "0")}_00_DEM`;
  const url = `${sourceRoot}/${tileId}/${tileId}.tif`;
  const ranges = new Map<string, TerrainSourceRange>();
  let etag: string | null = null, objectSize = 0;
  let sourceError: unknown;
  function fail(message: string): never { sourceError = new Error(message); throw sourceError; }
  const retainError = (error: unknown): never => { sourceError = error; throw error; };
  async function discard(response: Response, message: string): Promise<never> {
    // Rejecting headers must also stop a server that ignored Range or exceeded
    // the byte budget from continuing to transfer an unconsumed response.
    try { await response.body?.cancel(); } catch {}
    return fail(message);
  }
  const client: Parameters<typeof fromCustomClient>[0] = { url, async request(options = {}) {
    signal.throwIfAborted();
    const headers = new Headers(options.headers);
    if (etag) headers.set("If-Match", etag);
    const response = await transport(url, { headers, signal, redirect: "error" }).catch(retainError);
    if (response.status !== 206) return discard(response, `terrain_source_http_${response.status}`);
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/u.exec(response.headers.get("content-range") ?? "");
    const currentEtag = response.headers.get("etag");
    if (!match || !currentEtag || (etag !== null && etag !== currentEtag)) return discard(response, "terrain_source_identity_invalid");
    etag = currentEtag;
    objectSize = Number(match[3]);
    const length = Number(match[2]) - Number(match[1]) + 1;
    budget.bytes += length;
    if (budget.bytes > 24 * 1024 * 1024) return discard(response, "terrain_source_budget_exceeded");
    const data = await response.arrayBuffer().catch(retainError);
    signal.throwIfAborted();
    if (data.byteLength !== length) fail("terrain_source_length_invalid");
    ranges.set(`${match[1]}:${length}`, { offset: Number(match[1]), byteSize: length, sha256: hash(Buffer.from(data)) });
    return { status: response.status, ok: true, getHeader: name => response.headers.get(name) ?? undefined, getData: async () => data };
  } };
  const sourceOptions = { allowFullFile: false, blockSize: 65536, cacheSize: 32 };
  let tiff: Awaited<ReturnType<typeof fromCustomClient>> | undefined;
  try {
    tiff = await fromCustomClient(client, sourceOptions, signal);
    const firstImage = await tiff.getImage();
    let image = firstImage;
    // Use an existing COG overview only when its sampling is finer than the
    // requested output. Near views retain the original approximately 30 m grid.
    const count = await tiff.getImageCount();
    for (let level = 1; selection === "DISPLAY" && level < count; level++) {
      const candidate = await tiff.getImage(level);
      if (Math.abs(candidate.getResolution(firstImage)[1]) > resolution) break;
      image = candidate;
    }
    const [west, south, east, north] = firstImage.getBoundingBox();
    const [pixelX, pixelY] = image.getResolution(firstImage);
    const halo = selection === "NATIVE" ? 1 : 0;
    const left = clamp(Math.floor((Math.max(west, bounds[0]) - west) / pixelX) - halo, 0, image.getWidth());
    const right = clamp(Math.ceil((Math.min(east, bounds[2]) - west) / pixelX) + halo, 0, image.getWidth());
    const top = clamp(Math.floor((north - Math.min(north, bounds[3])) / -pixelY) - halo, 0, image.getHeight());
    const bottom = clamp(Math.ceil((north - Math.max(south, bounds[1])) / -pixelY) + halo, 0, image.getHeight());
    if (right <= left || bottom <= top) throw new Error("terrain_source_window_empty");
    if (selection === "NATIVE") {
      if (firstImage.getSamplesPerPixel() !== 1 || firstImage.getBitsPerSample(0) !== 32 || firstImage.getSampleFormat(0) !== 3
        || firstImage.getGeoKeys()?.GeographicTypeGeoKey !== 4326)
        throw new Error("terrain_native_sample_format_changed");
      const samples = (budget.nativeSamples ?? 0) + (right - left) * (bottom - top);
      if (budget.maximumNativeSamples !== undefined && samples > budget.maximumNativeSamples)
        throw new Error("terrain_native_sample_budget_exceeded");
      budget.nativeSamples = samples;
    }
    const values = await image.readRasters({ window: [left, top, right, bottom], samples: [0], interleave: true, signal });
    const proof = [...ranges.values()].sort((a, b) => a.offset - b.offset || a.byteSize - b.byteSize);
    const source: TerrainPublicationSourceObject = { tileId, url, sha256: hash(JSON.stringify(proof)), byteSize: objectSize, etag,
      hashScope: "RETRIEVED_RANGES", ranges: proof };
    return { source, values, left, top, width: right - left, height: bottom - top,
      west, north, pixelX, pixelY, noData: firstImage.getGDALNoData(),
      // GeoTIFF.js returns the raw tiepoint; Point and Area have different sample-centre offsets.
      // Overview images may omit affine tags; the base grid owns georeferencing.
      origin: firstImage.getOrigin(), pixelIsArea: firstImage.pixelIsArea(),
      nativeResolution: firstImage.getResolution(), selection };
  } catch (error) {
    signal.throwIfAborted();
    // GeoTIFF's blocked source wraps transport errors as "Request failed".
    // Preserve the source boundary's 404/budget/identity meaning for callers.
    throw sourceError ?? error;
  } finally { await tiff?.close(); }
}
