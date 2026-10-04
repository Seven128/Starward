import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { SDSS_OPTICAL_PUBLICATIONS, assertSdssScienceOpticalManifest, type SdssScienceOpticalManifest } from "@starward/miniapp-contracts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";
import { createSyntheticSdssSciencePublication } from "./test-fixtures/sdss-science-publication.ts";

const digest = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const temporary = () => mkdtempSync(join(tmpdir(), "starward-science-transport-"));
function cleanup(directory: string) {
  assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
  assert.match(basename(directory), /^starward-science-transport-/u);
  rmSync(directory, { recursive: true }); // Only these regenerated, owned test files.
}

test("explicit optical hashes isolate same-object science archives from old default discovery and sources", async () => {
  const directory = temporary();
  try {
    const firstDir = join(directory, "first"), nextDir = join(directory, "next"); mkdirSync(firstDir); mkdirSync(nextDir);
    const first = createSyntheticSdssSciencePublication(firstDir), next = createSyntheticSdssSciencePublication(nextDir, "synthetic-next-v2");
    const service = new SdssOpticalImageryService({ sciencePublications: [first, next].map(p => ({ reference: "M:51", expectedHash: p.expectedHash, manifestUrl: p.manifestUrl })) });
    for (const candidate of [first, next]) {
      const manifest = service.manifest(candidate.expectedHash); assertSdssScienceOpticalManifest(manifest, "M:51", candidate.expectedHash);
      for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
        const a: SdssScienceOpticalManifest["levels"]["DETAIL"] = manifest.levels[level];
        const result = await service.getByFile(candidate.expectedHash, a.file);
        assert.equal(result.contentType, "image/png"); assert.equal(digest(result.bytes), a.sha256); assert.equal(result.bytes.length, a.bytes);
        assert.equal(result.fieldDegrees, a.fieldDegrees); assert.deepEqual(result.bytes, readFileSync(join(candidate === first ? firstDir : nextDir, a.file)));
      }
      const source = service.source("M:51", candidate.expectedHash)!;
      assert.equal(source.id, `optical-imagery:${candidate.value.publicationId}:${candidate.expectedHash}`);
      assert.match(source.precision!, /PNG/u); assert.ok(source.limitations?.some(line => line.includes("不是探测器伪影")));
      assert.throws(() => service.source("M:82", candidate.expectedHash), /not_found/u);
      assert.throws(() => service.getByFile(candidate.expectedHash, "source-science-g.npy"), /not_found/u);
      assert.throws(() => service.getByFile(candidate.expectedHash, "receipt.json"), /not_found/u);
    }
    const old = service.currentManifest(); assert.equal(old.publicationHash, SDSS_OPTICAL_PUBLICATIONS["M:51"].publicationHash);
    assert.equal(service.publicationHash(), old.publicationHash); assert.equal((await service.get("M:51", "DETAIL")).contentType, "image/jpeg");
    assert.equal(service.source("M:51")!.id, `optical-imagery:${old.publicationId}:${old.publicationHash}`);
    assert.equal(service.source("M:31"), null);
    assert.throws(() => service.source("M:51", "0".repeat(64)), /not_found/u);
    assert.throws(() => new SdssOpticalImageryService().manifest(first.expectedHash), /not_found/u);
    const returned = service.manifest(first.expectedHash); returned.source.credit = "caller mutation";
    assert.notEqual(service.manifest(first.expectedHash).source.credit, returned.source.credit);
  } finally { cleanup(directory); }
});

test("internal descriptors reject remote, duplicate and foreign identities and copy mutable locators", () => {
  const directory = temporary();
  try {
    const fixture = createSyntheticSdssSciencePublication(directory), descriptor = { reference: "M:51", expectedHash: fixture.expectedHash, manifestUrl: fixture.manifestUrl };
    for (const changed of [{ ...descriptor, expectedHash: "bad" }, { ...descriptor, expectedHash: SDSS_OPTICAL_PUBLICATIONS["M:51"].publicationHash },
      { ...descriptor, reference: "M:51/../x" }, { ...descriptor, manifestUrl: new URL("https://example.invalid/manifest.json") },
      { ...descriptor, manifestUrl: new URL(fixture.manifestUrl.href + "?x=1") }])
      assert.throws(() => new SdssOpticalImageryService({ sciencePublications: [changed] }), /descriptor_invalid/u);
    assert.throws(() => new SdssOpticalImageryService({ sciencePublications: [descriptor, descriptor] }), /descriptor_invalid/u);
    const service = new SdssOpticalImageryService({ sciencePublications: [descriptor] }); descriptor.manifestUrl.pathname = "/unrelated.json";
    assert.equal(service.manifest(fixture.expectedHash).publicationHash, fixture.expectedHash);
  } finally { cleanup(directory); }
});

test("failed science metadata is not cached and cannot silently replace another reference or hash", () => {
  const directory = temporary();
  try {
    const fixture = createSyntheticSdssSciencePublication(directory), original = readFileSync(fixture.manifestUrl);
    const service = new SdssOpticalImageryService({ sciencePublications: [{ reference: "M:51", expectedHash: fixture.expectedHash, manifestUrl: fixture.manifestUrl }] });
    fixture.value.source.credit += " changed"; fixture.save();
    assert.throws(() => service.manifest(fixture.expectedHash), /publication_invalid/u);
    writeFileSync(fixture.manifestUrl, original); assert.equal(service.manifest(fixture.expectedHash).publicationHash, fixture.expectedHash);
    fixture.value.center.raDeg += 2e-7; const shifted = fixture.save();
    const offCenter = new SdssOpticalImageryService({ sciencePublications: [{ reference: "M:51", expectedHash: shifted, manifestUrl: fixture.manifestUrl }] });
    assert.throws(() => offCenter.manifest(shifted), /catalog_registration_invalid/u);
    const foreign = new SdssOpticalImageryService({ sciencePublications: [{ reference: "M:82", expectedHash: fixture.expectedHash, manifestUrl: fixture.manifestUrl }] });
    assert.throws(() => foreign.manifest(fixture.expectedHash), /publication_invalid/u);
  } finally { cleanup(directory); }
});

test("science PNG reads reject changed bytes and freshly pinned wrong geometry or encoding", async () => {
  const directory = temporary();
  try {
    const fixture = createSyntheticSdssSciencePublication(directory), asset = fixture.value.levels.DETAIL, file = join(directory, asset.file), original = readFileSync(file);
    const input = (expectedHash: string) => ({ sciencePublications: [{ reference: "M:51", expectedHash, manifestUrl: fixture.manifestUrl }] });
    const originalService = new SdssOpticalImageryService(input(fixture.expectedHash)); originalService.manifest(fixture.expectedHash);
    const changed = Buffer.from(original); changed[changed.length - 1] ^= 1; writeFileSync(file, changed);
    await assert.rejects(originalService.getByFile(fixture.expectedHash, asset.file), /asset_invalid/u);
    for (const change of [(b: Buffer) => { b[0] = 0; }, (b: Buffer) => b.writeUInt32BE(511, 16),
      (b: Buffer) => { b[25] = 2; }, (b: Buffer) => { b[28] = 1; }, (b: Buffer) => { b[b.length - 8] = 0; }]) {
      const bytes = Buffer.from(original); change(bytes); writeFileSync(file, bytes); asset.sha256 = digest(bytes); asset.bytes = bytes.length;
      const hash = fixture.save(), service = new SdssOpticalImageryService(input(hash)); service.manifest(hash);
      await assert.rejects(service.getByFile(hash, asset.file), /asset_invalid/u);
    }
    writeFileSync(file, original); assert.equal((await originalService.getByFile(fixture.expectedHash, asset.file)).contentType, "image/png");
  } finally { cleanup(directory); }
});
