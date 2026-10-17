// Offline ICRS -> FITS sample lookup, using the adopted HEALPix implementation.
// Input: row-major little-endian (RA degrees, Dec degrees) doubles.
// Output: row-major little-endian (NESTED tile, FITS column, FITS row) uint32s.
import { ang2PixNest, bitDecombine } from "healpix-ts";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Arbitrary continuous-region chunks share the same adopted cell/orientation
 * owner. Bound only each exchange buffer; no whole-image resolution ceiling. */
export function lookupHipsCoordinates(world, order) {
 if (!Number.isInteger(order) || order < 0 || order > 8 || !Buffer.isBuffer(world) ||
     world.length === 0 || world.length % 16 || world.length / 16 > 512 ** 2)
   throw new Error("allwise_lookup_profile_invalid");
 const count = world.length / 16, lookup = Buffer.alloc(count * 12);
 for (let i = 0; i < count; i++) {
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
 return lookup;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const order = Number(process.argv[2]), profile = process.argv[3];
 // Preserve the historical square protocol. New callers pass bounded chunks.
 const world = readFileSync(0);
 if (profile !== '--samples' && (![8,256,512].includes(Number(profile)) || world.length !== Number(profile) ** 2 * 16))
   throw new Error("allwise_lookup_coordinates_invalid");
 writeFileSync(1, lookupHipsCoordinates(world, order));
}
