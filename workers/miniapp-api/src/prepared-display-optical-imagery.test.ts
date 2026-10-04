import "reflect-metadata";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import test from "node:test";
import { assertPreparedRenderedOpticalManifest, assertPreparedOpticalManifest } from "@starward/miniapp-contracts";
import { PreparedOpticalImageryService } from "./prepared-optical-imagery.ts";
import { createSyntheticPreparedDisplayOpticalPublication } from "./test-fixtures/prepared-display-optical-publication.ts";

test("Prepared wire family admits display identity, preserves ancestry and discloses the separately credited guard", async () => {
  const directory = mkdtempSync(join(tmpdir(), "starward-prepared-display-"));
  try {
    const fixture = createSyntheticPreparedDisplayOpticalPublication(directory);
    const service = new PreparedOpticalImageryService([{ reference: "M:51", expectedHash: fixture.expectedHash,
      manifestUrl: fixture.manifestUrl }]);
    const manifest = service.manifest(fixture.expectedHash);
    assertPreparedRenderedOpticalManifest(manifest, "M:51", fixture.expectedHash);
    assert.throws(() => assertPreparedOpticalManifest(manifest, "M:51", fixture.expectedHash));
    assert.equal(manifest.imageVersion, "prepared-display-optical-v1");
    if (manifest.imageVersion !== "prepared-display-optical-v1") throw new Error("display missing");
    assert.equal(manifest.parent.publicationHash, fixture.value.parent.publicationHash);
    assert.equal(manifest.master.scientificValidity, "UNKNOWN");
    const source = service.source("M:51", fixture.expectedHash);
    assert.match(source.title, /显示估计/u);
    assert.ok(source.attribution!.statements.includes(fixture.value.source.credit));
    assert.ok(source.attribution!.statements.some(row => row.includes(fixture.value.processing.geometryExclusion.credit)));
    assert.ok(source.limitations.some(row => row.includes("负值显示截零")));
    const fields = [];
    for await (const asset of service.publishedAssets()) fields.push(asset);
    assert.equal(fields.length, 3);
    assert.ok(fields.every(row => row.publicationHash === fixture.expectedHash && row.contentType === "image/png"));
    assert.throws(() => service.getByFile(fixture.expectedHash, "background.npy"), /not_found/u);
    assert.throws(() => new PreparedOpticalImageryService().manifest(fixture.expectedHash), /not_found/u);
    fixture.value.processing.negativeChannelPixels[0]++; const changedHash = fixture.save();
    assert.throws(() => new PreparedOpticalImageryService([{ reference: "M:51", expectedHash: changedHash,
      manifestUrl: fixture.manifestUrl }]).manifest(changedHash));
  } finally {
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
    assert.match(basename(directory), /^starward-prepared-display-/u);
    rmSync(directory, { recursive: true }); // Only owned, regenerated fixture files.
  }
});
