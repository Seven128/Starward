import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";
import { displayRasterWindowBounds, type DisplayRasterWindow } from "@starward/coordinate-system";
import { NIGHT_LIGHT_FIXED_SCALE } from "@starward/miniapp-contracts";
import { NightLightService } from "./night-light-service.ts";
import type { ShardedNightLightDataset } from "./night-light-publication.ts";

const window: DisplayRasterWindow = { grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256,
  zoom: 11, x: 1672, y: 890, columns: 2, rows: 1 };
const bounds = displayRasterWindowBounds(window);
const target = { name: "cross-part prepared consumer fixture", boundsGcj02: {
  west: bounds.west + .001, east: bounds.east - .001, south: bounds.south + .001, north: bounds.north - .001 } };

async function fixture(run: (input: { root: string; bundle: any; record: ShardedNightLightDataset;
  final: any; fresh: (published?: () => ShardedNightLightDataset | null) => NightLightService }) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), "starward-sharded-prepared-")), services: NightLightService[] = [];
  try {
    const [{ shardedNightLightFixture }, { prepareMapStaticBundle }] = await Promise.all([
      import(new URL("../../../tools/deployment/map-static-test-support.mjs", import.meta.url).href),
      import(new URL("../../../tools/deployment/map-static-bundle.mjs", import.meta.url).href),
    ]);
    const input = await shardedNightLightFixture(root, { cells: [
      { firstColumn: 0, bandIndex: 0 }, { firstColumn: 1, bandIndex: 4, missingPixels: 13 },
    ] });
    const bundle = await prepareMapStaticBundle({ publications: [{ ...input, displayWindowTargets: [target] }],
      outputDirectory: path.join(root, "sealed") });
    const index = input.index;
    const record: ShardedNightLightDataset = { datasetVersion: index.datasetVersion,
      radianceSha256: index.radianceSha256, coverageSha256: index.coverageSha256, source: index.source,
      payload: { schemaVersion: 3, datasetVersion: index.datasetVersion, productName: index.source.title,
        dataYear: 2025, source: index.source, methodVersion: index.methodVersion, styleVersion: index.styleVersion,
        policy: NIGHT_LIGHT_FIXED_SCALE, policySha256: index.policySha256,
        minimumCloudFreeObservations: index.minimumCloudFreeObservations,
        shardedIndex: { ...input.nightLightSharded, file: "index.json", indexVersion: index.indexVersion },
        coverage: "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY", radianceUnit: "nW/cm²/sr", calibratedSkyClass: false } };
    await cp(input.directory, path.join(root, record.datasetVersion), { recursive: true });
    const fresh = (published = () => record as ShardedNightLightDataset | null) => {
      const service = new NightLightService({ async getPublishedDarkSkyDataset(version) {
        return version === record.datasetVersion ? published() : null;
      } }, root, { directory: bundle.directory, publicationHash: bundle.publicationHash });
      services.push(service); return service;
    };
    const final = bundle.records.find((item: any) => item.route.includes(`window-11-1672-890-2-1-${input.nightLightSharded.sha256}-`));
    assert.ok(final, "the actual exporter must supply the derived window");
    await run({ root, bundle, record, final, fresh });
  } finally {
    services.forEach(service => service.close());
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("starward-sharded-prepared-"));
    await rm(root, { recursive: true, force: true });
  }
}

test("the DB-bound prepared consumer reads actual cross-part pixels without live composition or source-image reads", async t => fixture(async input => {
  const { record, final, bundle } = input;
  const expected = await readFile(path.join(bundle.directory, `files${final.route}`));
  let current: ShardedNightLightDataset | null = null;
  const service = input.fresh(() => current);
  assert.equal(await service.preparedDisplayWindow(record.datasetVersion, window), null);
  current = structuredClone(record);
  const encode = t.mock.method(PNG.sync, "write", () => { throw new Error("live_png_encoding_forbidden"); });
  const decode = t.mock.method(PNG.sync, "read", () => { throw new Error("live_png_decoding_forbidden"); });
  const original = fs.readFile;
  const reads: string[] = [];
  fs.readFile = (async (file: any, ...args: any[]) => {
    const name = String(file).replaceAll("\\", "/");
    assert.ok(!name.endsWith(".tif") && !(name.includes("/parts/") && name.endsWith(".png")),
      "runtime reads only selected metadata and the sealed final PNG");
    reads.push(name);
    return (original as any)(file, ...args);
  }) as typeof fs.readFile;
  syncBuiltinESMExports();
  try {
    const result = await service.preparedDisplayWindow(record.datasetVersion, window); assert.ok(result);
    assert.deepEqual(result.bytes, expected);
    assert.equal(result.authority, "PREPARED_ONLY"); assert.equal("imageUrl" in result, false);
    assert.deepEqual(result.proof.grid.window, window); assert.deepEqual(result.proof.grid.boundsGcj02, bounds);
    assert.equal(result.proof.quality.pixelCount, 131072); assert.equal(result.proof.quality.validPixelCount, 131059);
    assert.equal(result.proof.quality.qualityMaskCounts["5"], 13);
    assert.equal(result.proof.quality.validZeroPixelCount, 65536);
    assert.equal(reads.filter(file => file.endsWith(".png")).length, 1);
    assert.equal(encode.mock.callCount(), 0); assert.equal(decode.mock.callCount(), 0);
    await assert.rejects(service.layer(record.datasetVersion, bounds), /nightlight_sharded_static_delivery_capability_not_ready/u);
    await assert.rejects(service.asset(record.datasetVersion, result.proof.image.file), /nightlight_sharded_static_delivery_capability_not_ready/u);
    current.radianceSha256 = "0".repeat(64);
    await assert.rejects(service.preparedDisplayWindow(record.datasetVersion, window), /nightlight_sharded_database_root_mismatch/u);
    current = structuredClone(record);
    const aborted = new AbortController(); aborted.abort(new Error("consumer_cancelled"));
    await assert.rejects(service.preparedDisplayWindow(record.datasetVersion, window, aborted.signal), /consumer_cancelled/u);
    service.close();
    await assert.rejects(service.preparedDisplayWindow(record.datasetVersion, window), /nightlight_service_closed/u);
  } finally { fs.readFile = original; syncBuiltinESMExports(); }
}));

test("a damaged declared derived PNG fails instead of falling through to another prepared result", async () => fixture(async ({ bundle, record, final, fresh }) => {
  const { mapStaticSourceId } = await import("./map-static-manifest.ts");
  const source = bundle.sources.find((value: any) => value.displayWindowTargets);
  const file = path.join(bundle.directory, "publications", mapStaticSourceId(source), "windows", final.route.split("/").at(-1));
  const bytes = await readFile(file), damaged = Buffer.from(bytes); damaged[damaged.length - 1] ^= 1;
  await writeFile(file, damaged);
  await assert.rejects(fresh().preparedDisplayWindow(record.datasetVersion, window), /nightlight_prepared_file_identity_invalid/u);
}));
