import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { assertSdssCalibratedOpticalManifest, assertSdssScienceOpticalManifest,
  SDSS_OPTICAL_PUBLICATIONS, SDSS_OPTICAL_LEVELS } from "@starward/miniapp-contracts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";
import { createSyntheticSdssDisplayPublication } from "./test-fixtures/sdss-display-publication.ts";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "starward-display-transport-"));
  const candidate = createSyntheticSdssDisplayPublication(directory);
  const descriptor = { reference: "M:51", expectedHash: candidate.expectedHash, manifestUrl: candidate.manifestUrl };
  return { directory, candidate, descriptor, cleanup() {
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.match(basename(directory), /^starward-display-transport-/u);
    rmSync(directory, { recursive: true }); // Exclusively regenerated, verified test scope.
  } };
}

test("explicit calibrated display intent preserves science-only admission and all old discovery", async () => {
  const f = fixture();
  try {
    const owner = new SdssOpticalImageryService({ calibratedPublications: [f.descriptor] });
    const manifest = owner.manifest(f.candidate.expectedHash);
    assertSdssCalibratedOpticalManifest(manifest, "M:51", f.candidate.expectedHash);
    assert.equal(manifest.imageVersion, "sdss-display-optical-v1");
    assert.throws(() => assertSdssScienceOpticalManifest(manifest, "M:51", f.candidate.expectedHash));
    assert.throws(() => new SdssOpticalImageryService({ sciencePublications: [f.descriptor] }).manifest(f.candidate.expectedHash));
    assert.equal(new SdssOpticalImageryService().hasRegisteredPublicationHash(f.candidate.expectedHash), false);
    assert.throws(() => new SdssOpticalImageryService().manifest(f.candidate.expectedHash), /not_found/u);
    assert.equal(owner.currentManifest().publicationHash, SDSS_OPTICAL_PUBLICATIONS["M:51"].publicationHash);
    assert.equal((await owner.get("M:51", "DETAIL")).contentType, "image/jpeg");
    assert.throws(() => new SdssOpticalImageryService({ sciencePublications: [f.descriptor], calibratedPublications: [f.descriptor] }), /descriptor_invalid/u);
    const source = owner.source("M:51", f.candidate.expectedHash)!;
    assert.equal(source.id, `optical-imagery:${manifest.publicationId}:${manifest.publicationHash}`);
    assert.match(source.precision!, /显示估计.*不是新的科学测量/u);
    assert(source.limitations?.some(line => line.includes(manifest.publicationHash)));
    assert(source.limitations?.some(line => line.includes("共同样本可用度和冻结配色保持")));
    assert.throws(() => owner.source("M:82", f.candidate.expectedHash), /not_found/u);
    for (const level of SDSS_OPTICAL_LEVELS) {
      const image = await owner.getByFile(manifest.publicationHash, manifest.levels[level].file);
      assert.equal(image.contentType, "image/png");
      assert.deepEqual(image.bytes, readFileSync(join(f.directory, manifest.levels[level].file)));
    }
    for (const file of ["science-g.npy", "execution-receipt.json", "../manifest.json"])
      assert.throws(() => owner.getByFile(manifest.publicationHash, file), /not_found/u);
    const images = []; for await (const image of owner.publishedAssets()) images.push(image);
    assert.equal(images.length, 21);
    assert.equal(images.filter(image => image.publicationHash === manifest.publicationHash).length, 3);
  } finally { f.cleanup(); }
});

test("a display descriptor never caches rejected metadata, foreign objects or incompatible fresh hashes", () => {
  const f = fixture();
  try {
    const original = readFileSync(f.candidate.manifestUrl);
    const owner = new SdssOpticalImageryService({ calibratedPublications: [f.descriptor] });
    f.candidate.value.display.estimateRole = "NEW_MEASUREMENTS" as any; f.candidate.save();
    assert.throws(() => owner.manifest(f.descriptor.expectedHash), /publication_invalid/u);
    const fresh = new SdssOpticalImageryService({ calibratedPublications: [{ ...f.descriptor, expectedHash: f.candidate.save() }] });
    assert.throws(() => fresh.manifest(f.candidate.save()), /publication_invalid/u);
    writeFileSync(f.candidate.manifestUrl, original);
    assert.equal(owner.manifest(f.descriptor.expectedHash).publicationHash, f.descriptor.expectedHash);
    const returned = owner.manifest(f.descriptor.expectedHash); returned.source.credit = "caller mutation";
    assert.notEqual(owner.manifest(f.descriptor.expectedHash).source.credit, returned.source.credit);
    assert.throws(() => new SdssOpticalImageryService({ calibratedPublications: [{ ...f.descriptor, reference: "M:82" }] }).manifest(f.descriptor.expectedHash));
  } finally { f.cleanup(); }
});

test("new display shares the byte gate: changed PNG is rejected and restoration is retryable", async () => {
  const f = fixture();
  try {
    const owner = new SdssOpticalImageryService({ calibratedPublications: [f.descriptor] });
    const a = owner.manifest(f.descriptor.expectedHash).levels.DETAIL, path = join(f.directory, a.file);
    const original = readFileSync(path), changed = Buffer.from(original); changed[changed.length - 1] ^= 1;
    writeFileSync(path, changed);
    await assert.rejects(owner.getByFile(f.descriptor.expectedHash, a.file), /asset_invalid/u);
    writeFileSync(path, original);
    assert.deepEqual((await owner.getByFile(f.descriptor.expectedHash, a.file)).bytes, original);
  } finally { f.cleanup(); }
});
