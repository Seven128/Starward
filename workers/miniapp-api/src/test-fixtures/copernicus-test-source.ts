import { writeArrayBuffer } from "geotiff";

/** Synthetic numerical GeoTIFF for source/legacy compatibility checks only. */
export function copernicusTestSource(options: { overview?: boolean } = {}) {
  const width = 100, height = 100, values = new Float32Array(width * height);
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++)
    values[row * width + column] = 200 + column * 4 - row * 2;
  values[41 * width + 5] = -32767;
  let bytes = Buffer.from(writeArrayBuffer(values, {
    width, height, ModelPixelScale: [0.01, 0.01, 0], ModelTiepoint: [0, 0, 0, 114, 23, 0],
    GeographicTypeGeoKey: 4326, GTRasterTypeGeoKey: 1, GDAL_NODATA: "-32767\0",
  }));
  if (options.overview) bytes = appendUnreferencedOverview(bytes);
  const requests: { url: string; start: number; end: number }[] = [];
  const transport = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input), range = new Headers(init?.headers).get("range");
    if (!url.includes("Copernicus_DSM_COG_10_N22_00_E114_00_DEM")) throw new Error("unexpected_synthetic_source_tile");
    const match = /^bytes=(\d+)-(\d+)$/u.exec(range ?? "");
    if (!match) throw new Error("synthetic_source_requires_range");
    const start = Number(match[1]), end = Math.min(Number(match[2]), bytes.length - 1);
    requests.push({ url, start, end });
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206, headers: { etag: '"synthetic-cog"', "content-range": `bytes ${start}-${end}/${bytes.length}` },
    });
  }) as typeof fetch;
  return { transport, requests, bytes };
}

/** A real second TIFF IFD, with affine/geokey tags omitted as in COG overviews.
 * Keep the default fixture bytes untouched for the legacy PNG hash checks. */
function appendUnreferencedOverview(base: Buffer) {
  const overview = Buffer.from(writeArrayBuffer(new Float32Array(50 * 50).fill(123), {
    width: 50, height: 50, GeographicTypeGeoKey: 4326,
  }));
  const little = overview.toString("ascii", 0, 2) === "II";
  const u16 = (buffer: Buffer, at: number) => little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at);
  const u32 = (buffer: Buffer, at: number) => little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at);
  const put16 = (buffer: Buffer, value: number, at: number) => little ? buffer.writeUInt16LE(value, at) : buffer.writeUInt16BE(value, at);
  const put32 = (buffer: Buffer, value: number, at: number) => little ? buffer.writeUInt32LE(value, at) : buffer.writeUInt32BE(value, at);
  assertClassicTiff(base); assertClassicTiff(overview);
  if (base.toString("ascii", 0, 2) !== overview.toString("ascii", 0, 2)) throw new Error("fixture_tiff_endian_mismatch");
  const ifd = u32(overview, 4), count = u16(overview, ifd);
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
  const removed = new Set([33550, 33922, 34264, 34735, 34736, 34737]);
  const entries: Buffer[] = [];
  for (let index = 0; index < count; index++) {
    const entry = Buffer.from(overview.subarray(ifd + 2 + index * 12, ifd + 14 + index * 12));
    const tag = u16(entry, 0), type = u16(entry, 2), length = u32(entry, 4);
    if (removed.has(tag)) continue;
    if (!sizes[type]) throw new Error("fixture_tiff_unknown_type");
    if (tag === 273) {
      if (type !== 4 || length !== 1) throw new Error("fixture_overview_requires_single_strip");
      put32(entry, u32(entry, 8) + base.length, 8);
    } else if (sizes[type] * length > 4) put32(entry, u32(entry, 8) + base.length, 8);
    entries.push(entry);
  }
  put16(overview, entries.length, ifd);
  entries.forEach((entry, index) => entry.copy(overview, ifd + 2 + index * 12));
  put32(overview, 0, ifd + 2 + entries.length * 12);
  const firstIfd = u32(base, 4);
  put32(base, base.length + ifd, firstIfd + 2 + u16(base, firstIfd) * 12);
  return Buffer.concat([base, overview]);
}

function assertClassicTiff(buffer: Buffer) {
  const version = buffer.toString("ascii", 0, 2) === "II" ? buffer.readUInt16LE(2) : buffer.readUInt16BE(2);
  if (version !== 42) throw new Error("fixture_requires_classic_tiff");
}
