import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { readFixedNightLightProof, type FixedNightLightDataset, type FixedNightLightInventory } from "./night-light-publication.ts";

const hash = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
  : JSON.stringify(value);

test("the shared proof reader admits explicit source-core v3 and rejects incomplete, ambiguous or unbounded variants", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "starward-nightlight-chunk-proof-"));
  try {
    const { nightLightFixture } = await import(new URL("../../../tools/deployment/map-static-test-support.mjs", import.meta.url).href);
    const fixture = await nightLightFixture(root), dataset = fixture.publishedRecord.record as FixedNightLightDataset;
    const oldEntry = fixture.inventory.assets[0] as FixedNightLightInventory["assets"][number];
    const old = await readFixedNightLightProof(fixture.directory, dataset, oldEntry);
    const preparation = { algorithm: "bounded-source-core-physical-mass-v1", adapterSha256: hash("test-adapter"), numericOwnerSha256: hash("test-numeric-owner") };
    const source = { width: 4, height: 4, west: 113, north: 23, longitudeStep: .1, latitudeStep: -.1 };
    dataset.payload.aoi = { west: 113, north: 23, east: 113.4, south: 22.6 };
    // This is a public structural contract fixture only. The Python preparer
    // integration supplies actual geometry, six-band TIFF and image evidence.
    const next = { ...structuredClone(old), schemaVersion: "starward-fixed-nightlight-raster-v3",
      derivation: "GEOS_PHYSICAL_AREA_CHUNKED_INTERSECTION",
      sourceSet: { ...old.sourceSet, preparation, numericalEngine: { algorithm: "geos-dense-physical-area-intersection-v1",
        shapelyVersion: "2.1.2", geosVersion: "3.13.1", sourceSha256: hash("test-area-owner") } },
      grid: { ...old.grid, schemaVersion: "starward-nightlight-warp-grid-v2", byteOrder: "little-endian", sourceGeolocationConvention: "TOP_LEFT_CORNER",
        originalSource: source, source, sourceSubdivision: 1, preparation,
        files: { targetArea: { file: "targetArea.f64", bytes: 65536 * 8, sha256: hash("test-area") }, targetBranch: { file: "targetBranch.u8", bytes: 65536, sha256: hash("test-branch") } },
        sourceChunks: [
          { sourceWindow: [0, 0, 3, 4], origin: [0, 0], core: [0, 0, 4, 2], geometry: { file: "chunks/0-0/warp-grid.json", bytes: 2048, sha256: hash("test-left-geometry") } },
          { sourceWindow: [2, 0, 2, 4], origin: [0, 2], core: [0, 0, 4, 2], geometry: { file: "chunks/0-2/warp-grid.json", bytes: 2048, sha256: hash("test-right-geometry") } },
        ] } };
    async function read(proof: typeof next) {
      const identity = hash(canonical(proof.sourceSet)), file = `nightlight-v2-${hash(`${identity}:${proof.image.sha256}:${proof.numeric.sha256}`)}.png`;
      proof.image.file = file; proof.numeric.file = file + ".numbers.tif";
      proof.publicationId = `nightlight:${identity}:${proof.image.sha256}:${proof.numeric.sha256}`;
      const raw = JSON.stringify(proof);
      await writeFile(path.join(fixture.directory, file + ".json"), raw);
      return readFixedNightLightProof(fixture.directory, dataset, { key: oldEntry.key, file, proofBytes: Buffer.byteLength(raw), proofSha256: hash(raw) });
    }
    const admitted = await read(structuredClone(next));
    assert.equal(admitted.schemaVersion, "starward-fixed-nightlight-raster-v3");
    assert.deepEqual(admitted.numeric.bands, old.numeric.bands);
    assert.deepEqual(admitted.quality, old.quality);
    for (const scenario of ["gap", "overlap", "equal-area-overlap", "halo", "descriptor", "oversize", "owner", "version", "legacy-disguise"] as const) {
      const proof = structuredClone(next);
      if (scenario === "gap") proof.grid.sourceChunks.pop();
      if (scenario === "overlap") proof.grid.sourceChunks[1] = structuredClone(proof.grid.sourceChunks[0]);
      if (scenario === "equal-area-overlap") {
        proof.grid.sourceChunks[0].sourceWindow[2] = 4; proof.grid.sourceChunks[0].core[3] = 3;
        proof.grid.sourceChunks[1].core[3] = 1;
      }
      if (scenario === "halo") proof.grid.sourceChunks[0].sourceWindow[2]--;
      if (scenario === "descriptor") proof.grid.sourceChunks[0].geometry.file = "../untrusted.json";
      if (scenario === "oversize") proof.grid.sourceChunks[0].geometry.bytes = 16 * 1024 + 1;
      if (scenario === "owner") proof.sourceSet.preparation = { ...preparation, numericOwnerSha256: "invalid" };
      if (scenario === "version") proof.grid.schemaVersion = "starward-nightlight-warp-grid-v99";
      if (scenario === "legacy-disguise") proof.schemaVersion = "starward-fixed-nightlight-raster-v2";
      await assert.rejects(read(proof), /nightlight_(?:chunked_geometry|proof_grid)_invalid/u, scenario);
    }
    assert.deepEqual(await readFixedNightLightProof(fixture.directory, dataset, oldEntry), old, "new admission cannot rewrite the old v2 proof");
  } finally {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("starward-nightlight-chunk-proof-"));
    await rm(root, { recursive: true, force: true });
  }
});
