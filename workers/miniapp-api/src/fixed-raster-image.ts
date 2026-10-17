import { PNG } from "pngjs";

/** Shared fixed display-cell operation for terrain and annual night-light.
 * Copy complete 256px RGBA cells; never scale or average shaded/coloured pixels. */
export function copyFixedRasterCell(target: PNG, bytes: Buffer, column: number, row: number) {
  if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || row < 0
    || (column + 1) * 256 > target.width || (row + 1) * 256 > target.height) throw new Error("fixed_raster_cell_placement_invalid");
  const rgba = PNG.sync.read(bytes, { checkCRC: true });
  if (rgba.width !== 256 || rgba.height !== 256) throw new Error("fixed_raster_cell_dimensions_invalid");
  for (let pixelRow = 0; pixelRow < 256; pixelRow++) rgba.data.copy(target.data,
    ((row * 256 + pixelRow) * target.width + column * 256) * 4, pixelRow * 1024, (pixelRow + 1) * 1024);
}
