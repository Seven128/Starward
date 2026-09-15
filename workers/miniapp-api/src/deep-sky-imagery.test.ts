import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "starward-allwise-"));
  await mkdir(join(root, "M-31"));
  for (const level of ["overview", "medium", "detail"])
    await writeFile(join(root, "M-31", `M-31-${level}.jpg`), jpeg);
  const level = { fieldDegrees: 4, pixels: 512,
    sha256: createHash("sha256").update(jpeg).digest("hex"), bytes: jpeg.length, validFraction: 1 };
  const manifest = {
    schemaVersion: "allwise-w3-deep-sky-publication-v1", publicationId: "trial",
    catalogVersion: "opengc-messier-deep-sky.v20260501",
    catalogSha256: "fixture",
    source: { band: "W3", wavelengthMicrometers: 12 },
    processing: { runtimeNetwork: "forbidden", orientation: "north-up/east-left" }, entryCount: 1,
    entries: [{ objectRef: "M:31", center: { raDeg: 10.684791666666666, decDeg: 41.26905555555555, frame: "ICRS J2000" }, orientation: "north-up/east-left", levels: {
      OVERVIEW: { ...level, file: "M-31/M-31-overview.jpg", pixels: 256 },
      MEDIUM: { ...level, file: "M-31/M-31-medium.jpg" },
      DETAIL: { ...level, file: "M-31/M-31-detail.jpg", fieldDegrees: 1.9 },
    } }],
  };
  const manifestPath = join(root, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  return { root, manifestPath, manifestUrl: pathToFileURL(manifestPath) };
}

test("published AllWISE service reads a verified local W3 asset without a runtime transport", async () => {
  const { manifestUrl } = await fixture();
  const result = await new DeepSkyImageryService(manifestUrl).get("M:31", "MEDIUM");
  assert.deepEqual(result.bytes, jpeg);
  assert.equal(result.fieldDegrees, 4);
  assert.equal(result.pixelSize, 512);
  assert.equal(result.sourceLabel, "NASA/IPAC IRSA - AllWISE W3 12um");
});

test("default publication serves representative galaxy and nebula detail assets", async () => {
  const service = new DeepSkyImageryService();
  const results = await Promise.all(["M:31", "M:42", "M:101"].map(reference => service.get(reference, "DETAIL")));
  for (const result of results) {
    assert.ok(result.bytes.length > 1_000);
    assert.equal(result.pixelSize, 512);
    assert.equal(result.sourceLabel, "NASA/IPAC IRSA - AllWISE W3 12um");
  }
  assert.equal(new Set(results.map(result => createHash("sha256").update(result.bytes).digest("hex"))).size, results.length);
});

test("publication rejects missing identities, invalid levels, cross-object paths, traversal, and altered bytes", async () => {
  const absent = await fixture();
  const service = new DeepSkyImageryService(absent.manifestUrl);
  await assert.rejects(service.get("M:42"), /not_published/u);
  await assert.rejects(service.get("M:31", "FULL"), /level_invalid/u);
  const traversal = await fixture();
  const value = JSON.parse(await readFile(traversal.manifestPath, "utf8"));
  value.entries[0].levels.MEDIUM.file = "../outside.jpg";
  await writeFile(traversal.manifestPath, JSON.stringify(value));
  await assert.rejects(new DeepSkyImageryService(traversal.manifestUrl).get("M:31"), /publication_invalid/u);
  const crossed = await fixture();
  const crossedValue = JSON.parse(await readFile(crossed.manifestPath, "utf8"));
  crossedValue.entries[0].levels.MEDIUM.file = "M-42/M-42-medium.jpg";
  await writeFile(crossed.manifestPath, JSON.stringify(crossedValue));
  await assert.rejects(new DeepSkyImageryService(crossed.manifestUrl).get("M:31"), /publication_invalid/u);
  const altered = await fixture();
  await writeFile(join(altered.root, "M-31", "M-31-medium.jpg"), Buffer.from([0xff, 0xd8, 1, 0xff, 0xd9]));
  await assert.rejects(new DeepSkyImageryService(altered.manifestUrl).get("M:31"), /asset_invalid/u);
});
