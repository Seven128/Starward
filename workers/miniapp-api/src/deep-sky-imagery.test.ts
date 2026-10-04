import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { assertDeepSkyImageDiscovery } from "@starward/miniapp-contracts";

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

test("new image opt-in and painted-image source binding retain both legacy publication offers", async () => {
  const { root, manifestPath, manifestUrl } = await fixture();
  const v1 = JSON.parse(await readFile(manifestPath, "utf8"));
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const v1Hash = hash(v1);
  const v2 = structuredClone(v1);
  v2.schemaVersion = "allwise-w3-deep-sky-publication-v2";
  v2.previousPublicationHash = v1Hash;
  for (const asset of Object.values(v2.entries[0].levels) as Array<Record<string, unknown>>) {
    asset.validFraction = null;
    asset.coverageState = "NOT_MEASURED";
  }
  const v2Hash = hash(v2);
  await mkdir(join(root, "publications"));
  await writeFile(join(root, "publications", `${v1Hash}.json`), JSON.stringify(v1));
  await writeFile(join(root, "publications", `${v2Hash}.json`), JSON.stringify(v2));
  const v3 = structuredClone(v2);
  v3.schemaVersion = "allwise-w3-deep-sky-publication-v3";
  delete v3.previousPublicationHash;
  v3.previousPublicationHashes = [v2Hash, v1Hash];
  v3.legacyPublicationHash = v2Hash;
  v3.publicationId = "trial-source-finite";
  v3.entries[0].levels.DETAIL.fieldDegrees = 1.5;
  await writeFile(manifestPath, JSON.stringify(v3));
  const service = new DeepSkyImageryService(manifestUrl);
  assert.equal((await service.get("M:31", "DETAIL")).fieldDegrees, 1.9,
    "an old client keeps its JPEG publication without opting in");
  const current = await service.get("M:31", "DETAIL", undefined, "source-finite-v3");
  assert.equal(current.fieldDegrees, 1.5);
  assert.equal(current.publicationHash, hash(v3));
  assert.equal(service.manifest(v1Hash).schemaVersion, v1.schemaVersion);
  assert.equal(service.manifest(v2Hash).schemaVersion, v2.schemaVersion);
  assert.equal((await service.get("M:31", "DETAIL", v1Hash, "source-finite-v3")).fieldDegrees, 1.9,
    "a bound old source always returns its own image despite the new opt-in");
  await assert.rejects(service.get("M:31", "DETAIL", "0".repeat(64), "source-finite-v3"), /not_found/u);
});

test("unmeasured JPEG coverage is distinct from full coverage and preserves the previous publication", async () => {
  const { root, manifestPath, manifestUrl } = await fixture();
  const previous = JSON.parse(await readFile(manifestPath, "utf8"));
  const previousHash = createHash("sha256").update(JSON.stringify(previous)).digest("hex");
  await mkdir(join(root, "publications"));
  await writeFile(join(root, "publications", `${previousHash}.json`), JSON.stringify(previous));
  const current = structuredClone(previous);
  current.schemaVersion = "allwise-w3-deep-sky-publication-v2";
  current.previousPublicationHash = previousHash;
  for (const asset of Object.values(current.entries[0].levels) as Array<Record<string, unknown>>) {
    asset.validFraction = null;
    asset.coverageState = "NOT_MEASURED";
  }
  await writeFile(manifestPath, JSON.stringify(current));
  const service = new DeepSkyImageryService(manifestUrl);
  assert.deepEqual((await service.get("M:31", "DETAIL")).bytes, jpeg);
  const historical = service.manifest(previousHash);
  assert.equal(historical.schemaVersion, previous.schemaVersion);
  assert.equal(historical.entries[0]!.levels.DETAIL.validFraction, 1);
  assert.deepEqual((await service.get("M:31", "DETAIL", previousHash)).bytes, jpeg);
  assert.equal(historical.entries[0]!.levels.DETAIL.downloadUrl,
    `/v2/celestial-objects/M%3A31/image?level=DETAIL&publicationHash=${previousHash}`);
  const forged = structuredClone(current);
  forged.entries[0].levels.DETAIL.validFraction = 1;
  await writeFile(manifestPath, JSON.stringify(forged));
  await assert.rejects(new DeepSkyImageryService(manifestUrl).get("M:31"), /publication_invalid/u);
  await writeFile(manifestPath, JSON.stringify(current));
  previous.entries[0].levels.DETAIL.fieldDegrees = .3;
  await writeFile(join(root, "publications", `${previousHash}.json`), JSON.stringify(previous));
  const recovery = new DeepSkyImageryService(manifestUrl);
  assert.throws(() => recovery.manifest(previousHash), /not_found/u);
  assert.deepEqual((await recovery.get("M:31", "DETAIL")).bytes, jpeg,
    "a damaged historical offer cannot remove independently valid current imagery");
  previous.entries[0].levels.DETAIL.fieldDegrees = 1.9;
  await writeFile(join(root, "publications", `${previousHash}.json`), JSON.stringify(previous));
  assert.equal(recovery.manifest(previousHash).publicationHash, previousHash,
    "failed historical metadata is not cached against a later recovery");
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

test("catalog facts survive a missing image publication and recover its actual provenance without stale caching", async () => {
  const { manifestUrl, manifestPath } = await fixture();
  const full = JSON.parse(await readFile(new URL("../assets/deep-sky/manifest.json", import.meta.url), "utf8"));
  const local = JSON.parse(await readFile(manifestPath, "utf8"));
  Object.assign(local, { source: full.source, distribution: full.distribution, processing: full.processing });
  await writeFile(manifestPath, "invalid publication");
  const images = new DeepSkyImageryService(manifestUrl);
  const objects = new CelestialObjectInformationService(images);
  const before = objects.get("M:31");
  assert.equal(before.data.kind, "GALAXY");
  assert.ok(before.sources.some(source => source.provider.includes("OpenNGC")));
  assert.ok(!before.sources.some(source => source.id.startsWith("imagery:")));
  await writeFile(manifestPath, JSON.stringify(local));
  const after = objects.get("M:31");
  assert.ok(after.sources.some(source => source.id.startsWith("imagery:trial:")));
  assert.notEqual(after.etag, before.etag);
  assert.notEqual(after.data.contentRevision, before.data.contentRevision);
  assert.deepEqual((await images.get("M:31")).bytes, jpeg);
  assert.ok(!objects.get("M:42").sources.some(source => source.id.startsWith("imagery:")),
    "an independently valid catalog object must not inherit another publication's image credit");
});

test("current selected discovery precedes bytes, validates identity and keeps caller mutations out of publication state", () => {
  const service = new DeepSkyImageryService();
  // Discovery may read the publication metadata, never the image-byte owner.
  (service as unknown as { readAsset(): never }).readAsset = () => { throw new Error("unexpected_image_read"); };
  const selected = service.discovery("M:42");
  assertDeepSkyImageDiscovery(selected, "M:42");
  assert.equal(selected.source.id, selected.sourceId);
  assert.equal(selected.levels.DETAIL.format, "png");
  assert.equal(selected.levels.DETAIL.sourceFiniteMask?.missingPixels, 5095);
  const originalField = selected.levels.DETAIL.fieldDegrees;
  selected.levels.DETAIL.fieldDegrees = 8;
  selected.center.raDeg = 0;
  selected.source.limitations = [];
  assert.equal(service.discovery("M:42").levels.DETAIL.fieldDegrees, originalField);
  assert.notEqual(service.discovery("M:42").center.raDeg, 0);
  assert.ok(service.discovery("M:42").source.limitations.length > 0);
  assert.throws(() => service.discovery("M:45"), /not_published/u);
  for (const mutate of [
    (d: typeof selected) => { d.objectRef = "M:31"; },
    (d: typeof selected) => { d.levels.DETAIL.downloadUrl += "?other=1"; },
    (d: typeof selected) => { d.levels.DETAIL.sourceFiniteMask!.finitePixels++; },
    (d: typeof selected) => { d.levels.DETAIL.validFraction = 1 as never; },
    (d: typeof selected) => { d.levels.DETAIL.displaySupport!.sourceSha256 = "0".repeat(64); },
    (d: typeof selected) => { d.levels.DETAIL.width = 256; },
  ]) {
    const invalid = structuredClone(service.discovery("M:42")); mutate(invalid);
    assert.throws(() => assertDeepSkyImageDiscovery(invalid, "M:42"), /discovery_/u);
  }
});

test("immutable W3 archive metadata stays at its own snapshot despite identical bytes and current legacy refinement", async () => {
  const service = new DeepSkyImageryService(), current = service.discovery("M:42");
  const previousHash = "87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073";
  const old = service.manifest(previousHash).entries.find(entry => entry.objectRef === "M:42")!;
  const legacy = await service.get("M:42", "DETAIL", previousHash);
  const immutable = await service.getByFile(previousHash, old.levels.DETAIL.file);
  const now = await service.getByFile(current.publicationHash, current.levels.DETAIL.file);
  assert.deepEqual(immutable.bytes, now.bytes);
  assert.equal(immutable.publicationHash, previousHash);
  assert.equal(immutable.descriptor.displaySupport, undefined);
  assert.equal(immutable.displaySupport, undefined);
  assert.deepEqual(legacy.displaySupport, current.levels.DETAIL.displaySupport, "the old endpoint keeps its compatibility refinement");
  // A tempting getByFile→legacy-get delegation leaks current metadata despite
  // exact byte/pub matches. The actual snapshot oracle must detect that error.
  const incorrect = { ...immutable, displaySupport: legacy.displaySupport,
    descriptor: { ...immutable.descriptor, displaySupport: legacy.displaySupport } };
  assert.throws(() => assert.deepEqual(incorrect.descriptor.displaySupport, old.levels.DETAIL.displaySupport), /Expected values/u);
  for (const file of ["../manifest.json", "M-31/M-42-detail.jpg", old.levels.DETAIL.file + "?level=DETAIL", "M-42/raw.fits"])
    await assert.rejects(service.getByFile(previousHash, file), /not_found/u);
  await assert.rejects(service.getByFile("0".repeat(64), old.levels.DETAIL.file), /not_found/u);
});
