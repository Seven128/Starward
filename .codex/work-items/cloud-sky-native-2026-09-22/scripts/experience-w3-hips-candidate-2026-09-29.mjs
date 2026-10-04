// Offline source lookup for a bounded candidate; production HEALPix library.
import { ang2PixNest, bitDecombine, pixcoord2VecNest } from "healpix-ts";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const planPath = resolve(process.argv[2]);
const root = dirname(planPath);
const output = resolve(root, "candidate-lookup.json");
assert(!existsSync(output), "preserve_previous_candidate_lookup");
const plan = JSON.parse(readFileSync(planPath, "utf8"));
assert(plan.objectRef === "M:42" && plan.profiles.length === 3 && plan.tileWidth === 512);
const profiles = [];
for (const profile of plan.profiles) {
  const world = readFileSync(resolve(root, profile.worldFile));
  assert.equal(createHash("sha256").update(world).digest("hex"), profile.worldSha256);
  assert.equal(world.length, profile.pixels ** 2 * 16);
  const lookup = Buffer.alloc(profile.pixels ** 2 * 12);
  const counts = new Map();
  for (let i = 0; i < profile.pixels ** 2; i++) {
    const ra = world.readDoubleLE(i * 16), dec = world.readDoubleLE(i * 16 + 8);
    const deep = ang2PixNest(2 ** (profile.sourceOrder + 9), (90 - dec) * Math.PI / 180, ra * Math.PI / 180);
    const tile = Math.floor(deep / 512 ** 2);
    const { x: ne, y: nw } = bitDecombine(deep % 512 ** 2);
    assert(ne >= 0 && ne < 512 && nw >= 0 && nw < 512);
    lookup.writeUInt32LE(tile, i * 12);
    lookup.writeUInt32LE(nw, i * 12 + 4);
    // CDS packaging: JPEG column=nw, row=ne; FITS rows run oppositely.
    lookup.writeUInt32LE(511 - ne, i * 12 + 8);
    counts.set(tile, (counts.get(tile) ?? 0) + 1);
  }
  const filename = `m42-${profile.level.toLowerCase()}-lookup.bin`;
  writeFileSync(resolve(root, filename), lookup);
  profiles.push({ level: profile.level, sourceOrder: profile.sourceOrder, lookupFile: filename,
    lookupSha256: createHash("sha256").update(lookup).digest("hex"),
    tiles: [...counts].sort(([a], [b]) => a - b).map(([pixel, samples]) => ({ pixel, samples,
      path: `Norder${profile.sourceOrder}/Dir${Math.floor(pixel / 10000) * 10000}/Npix${pixel}.fits` })) });
}
// An independent Atlas WCS comparison can use exact production tile geometry.
const sample = Buffer.alloc(64 ** 2 * 16);
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  const q = pixcoord2VecNest(256, 343034, (y * 8 + .5) / 512, (x * 8 + .5) / 512);
  const at = (y * 64 + x) * 16;
  sample.writeDoubleLE((Math.atan2(q[1], q[0]) * 180 / Math.PI + 360) % 360, at);
  sample.writeDoubleLE(Math.asin(q[2]) * 180 / Math.PI, at + 8);
}
writeFileSync(resolve(root, "m42-source-tile-world.bin"), sample);
const result = { library: "healpix-ts 1.1.0 (existing adopted library)", sampling: "nearest NESTED cell at order+9; no filling or averaging across missing cells", profiles };
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(profiles.map(p => ({ level: p.level, order: p.sourceOrder, tiles: p.tiles.length, samples: p.tiles.reduce((s, t) => s + t.samples, 0) }))));
