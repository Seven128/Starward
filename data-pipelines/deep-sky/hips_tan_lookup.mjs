// Offline ICRS -> FITS sample lookup, using the adopted HEALPix implementation.
// Input: row-major little-endian (RA degrees, Dec degrees) doubles.
// Output: row-major little-endian (NESTED tile, FITS column, FITS row) uint32s.
import { ang2PixNest, bitDecombine } from "healpix-ts";
import { readFileSync, writeFileSync } from "node:fs";

const [order, pixels] = process.argv.slice(2).map(Number);
if (!Number.isInteger(order) || order < 0 || order > 8 || (pixels !== 256 && pixels !== 512))
  throw new Error("allwise_lookup_profile_invalid");
const world = readFileSync(0);
if (world.length !== pixels ** 2 * 16) throw new Error("allwise_lookup_coordinates_invalid");
const lookup = Buffer.alloc(pixels ** 2 * 12);
for (let i = 0; i < pixels ** 2; i++) {
  const ra = world.readDoubleLE(i * 16), dec = world.readDoubleLE(i * 16 + 8);
  if (!Number.isFinite(ra) || !Number.isFinite(dec) || ra < 0 || ra >= 360 || dec < -90 || dec > 90)
    throw new Error("allwise_lookup_coordinates_invalid");
  const cell = ang2PixNest(2 ** (order + 9), (90 - dec) * Math.PI / 180, ra * Math.PI / 180);
  const tile = Math.floor(cell / 512 ** 2);
  const { x: ne, y: nw } = bitDecombine(cell % 512 ** 2);
  lookup.writeUInt32LE(tile, i * 12);
  // HiPS image column is NW, row is NE; FITS reverses the image row.
  lookup.writeUInt32LE(nw, i * 12 + 4);
  lookup.writeUInt32LE(511 - ne, i * 12 + 8);
}
writeFileSync(1, lookup);
