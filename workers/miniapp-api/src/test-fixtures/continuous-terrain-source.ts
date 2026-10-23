import { PNG } from "pngjs";

/** The existing fixed-raster fixture's continuous slope crosses source edges. */
export function continuousTerrainTestSource() {
  let reads = 0;
  const transport: typeof fetch = async url => {
    reads++;
    const match = /\/(\d+)\/(\d+)\/(\d+)\.png$/u.exec(String(url))!;
    const x = Number(match[2]), y = Number(match[3]);
    const png = new PNG({ width: 256, height: 256 });
    for (let row = 0; row < 256; row++) for (let column = 0; column < 256; column++) {
      const h = 32768 + (x * 256 + column) / 8 - (y * 256 + row) / 4;
      png.data.set([Math.floor(h / 256), Math.floor(h) % 256, Math.round(h % 1 * 256), 255], (row * 256 + column) * 4);
    }
    return new Response(new Uint8Array(PNG.sync.write(png)), { headers: { etag: '"test"', "x-amz-meta-x-imagery-sources": "srtm/test.tif" } });
  };
  return { transport, reads: () => reads };
}
