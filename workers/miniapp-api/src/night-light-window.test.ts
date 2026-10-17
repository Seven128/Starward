import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { PNG } from "pngjs";
import Fastify from "fastify";
import { fastifyDeploymentOptions } from "./release-metadata.ts";
import { displayRasterWindowBounds, WEB_MERCATOR_CIRCUMFERENCE_M, type DisplayRasterWindow } from "@starward/coordinate-system";
import { NIGHT_LIGHT_FIXED_SCALE as policy, type SourceSummary } from "@starward/miniapp-contracts";
import { NightLightService } from "./night-light-service.ts";
import type { FixedNightLightDataset, FixedNightLightRaster } from "./night-light-publication.ts";

const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const canonical = (value: any): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value !== null && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const window = (zoom: number, x: number, y: number): DisplayRasterWindow => ({ grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256, zoom, x, y, columns: 1, rows: 1 });

async function fixture(run: (input: { service: NightLightService; fresh: () => NightLightService; root: string; directory: string; proofs: FixedNightLightRaster[] }) => Promise<void>, sparse = false) {
  const root = await mkdtemp(path.join(tmpdir(), "starward-nightlight-window-")), version = "eog-fixed-window-test-v2", directory = path.join(root, version);
  await mkdir(directory);
  const source: SourceSummary = { id: `eog-vnl:${version}`, kind: "TEST_FIXTURE", provider: "test", title: "Synthetic fixed image composition",
    sourceUrl: "https://example.test/source", license: "test", licenseUrl: "https://example.test/license", publishedAt: null, retrievedAt: null,
    validFrom: "2025-01-01T00:00:00Z", validTo: null, state: "FRESH", confidence: null, precision: "Unit fixture only", limitations: [] };
  const proofs: FixedNightLightRaster[] = [], assets: any[] = [];
  const units = sparse ? [[11, 1672, 890, 0], [11, 1674, 890, 4]] : [[11, 1672, 890, 0], [11, 1673, 890, 4], [10, 836, 445, 1], [10, 837, 445, 3]];
  for (const [zoom, x, y, band] of units) {
    const w = window(zoom, x, y), png = new PNG({ width: 256, height: 256 }), color = policy.bands[band].color;
    const rgba = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)).concat(policy.alpha);
    for (let pixel = 0; pixel < 256 * 256; pixel++) png.data.set(rgba, pixel * 4);
    const bytes = PNG.sync.write(png), imageHash = hash(bytes);
    const sourceSet = { datasetVersion: version, radianceSha256: "a".repeat(64), coverageSha256: "b".repeat(64), policySha256: "c".repeat(64), geometrySha256: hash(JSON.stringify(w)),
      ...(zoom === 10 ? { numericalEngine: { algorithm: "geos-dense-physical-area-intersection-v1" as const, shapelyVersion: "2.1.2", geosVersion: "3.13.1", sourceSha256: hash("unit-test-area-owner") } } : {}) };
    // This fixture exercises image selection/reading only; it makes no claim
    // about numeric TIFF or publisher correctness (covered by Python/PG tests).
    const numericHash = "d".repeat(64), identity = hash(canonical(sourceSet)), file = `nightlight-v2-${hash(`${identity}:${imageHash}:${numericHash}`)}.png`;
    const step = WEB_MERCATOR_CIRCUMFERENCE_M / (256 * 2 ** zoom);
    const proof: FixedNightLightRaster = { schemaVersion: "starward-fixed-nightlight-raster-v2", releaseState: "PREPARED", datasetVersion: version,
      publicationId: `nightlight:${identity}:${imageHash}:${numericHash}`, source, sourceSet, methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policy,
      derivation: zoom === 10 ? "GEOS_PHYSICAL_AREA_INTERSECTION" : "GDAL_PHYSICAL_AREA_SUM", cells: [], image: { file, bytes: bytes.length, sha256: imageHash, width: 256, height: 256 },
      numeric: { file: file + ".numbers.tif", bytes: 100, sha256: numericHash, format: "GEOTIFF_FLOAT64_DEFLATE_V1",
        bands: ["radianceMean", "validAreaFraction", "sourceMissingAreaFraction", "insufficientCoverageAreaFraction", "publishedAreaFraction", "qualityMask"], coordinates: "derived-GCJ-Mercator-metres", pixelInterpretation: "AREA" },
      unit: policy.unit, statistic: policy.statistics.map,
      grid: { grid: w.grid, window: w, width: 256, height: 256, boundsGcj02: displayRasterWindowBounds(w),
        affine: [step, 0, (x / 2 ** zoom - .5) * WEB_MERCATOR_CIRCUMFERENCE_M, 0, -step, (.5 - y / 2 ** zoom) * WEB_MERCATOR_CIRCUMFERENCE_M] },
      quality: { policyVersion: policy.qualityPolicy.version, minimumCloudFreeObservations: 3, validPixelCount: 65536, validZeroPixelCount: band === 0 ? 65536 : 0,
        pixelCount: 65536, maximumAreaExcessFraction: 0, qualityMaskCounts: { "1": 65536, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 } } };
    const raw = JSON.stringify(proof); await writeFile(path.join(directory, file), bytes); await writeFile(path.join(directory, file + ".json"), raw);
    proofs.push(proof); assets.push({ key: `${zoom}-${x}-${y}-1-1`, file, proofBytes: Buffer.byteLength(raw), proofSha256: hash(raw) });
  }
  const inventory = { schemaVersion: "starward-fixed-nightlight-inventory-v1", releaseState: "SEALED", datasetVersion: version,
    methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policySha256: "c".repeat(64), createdAt: "2026-10-17T00:00:00Z",
    publicationVersion: `nightlight-fixed:${hash(canonical({ datasetVersion: version, policySha256: "c".repeat(64), assets }))}`, assets };
  const raw = JSON.stringify(inventory); await writeFile(path.join(directory, "inventory.json"), raw);
  const dataset: FixedNightLightDataset = { datasetVersion: version, radianceSha256: "a".repeat(64), coverageSha256: "b".repeat(64), source,
    payload: { schemaVersion: 2, datasetVersion: version, methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policy, policySha256: "c".repeat(64),
      minimumCloudFreeObservations: 3, source, rasterInventory: { sha256: hash(raw), publicationVersion: inventory.publicationVersion, assetCount: assets.length } } };
  const services: NightLightService[] = [], fresh = () => {
    const service = new NightLightService({ async getPublishedDarkSkyDataset(v) { return v === version ? dataset : null; } }, root); services.push(service); return service;
  };
  try { await run({ service: fresh(), fresh, root, directory, proofs }); }
  finally { services.forEach(service => service.close()); assert.equal(path.dirname(root), path.resolve(tmpdir())); await rm(root, { recursive: true, force: true }); }
}

function view(w: DisplayRasterWindow, span: number) {
  const b = displayRasterWindowBounds(w), dx = b.east - b.west, dy = b.north - b.south;
  return { west: b.west + dx * .2, east: b.west + dx * (span - .2), south: b.south + dy * .3, north: b.north - dy * .3 };
}
const imageFile = (layer: any) => path.basename(layer.raster.imageUrl);

test("cross-cell night-light views copy published pixels and survive cache loss through their immutable URL", async () => fixture(async ({ service, fresh, proofs }) => {
  const bounds = view(window(11, 1672, 890), 2), layer = await service.layer(proofs[0].datasetVersion, bounds); assert.ok(layer?.raster);
  assert.deepEqual(layer.raster.boundsGcj02, displayRasterWindowBounds({ ...window(11, 1672, 890), columns: 2 }));
  const asset = await service.asset(proofs[0].datasetVersion, imageFile(layer)); assert.ok(asset);
  const png = PNG.sync.read(asset.bytes); assert.equal(png.width, 512); assert.equal(png.height, 256);
  for (let cell = 0; cell < 2; cell++) {
    const original = await service.asset(proofs[cell].datasetVersion, proofs[cell].image.file); assert.ok(original);
    const rgba = PNG.sync.read(original.bytes).data;
    for (let row = 0; row < 256; row++) assert.ok(png.data.subarray((row * 512 + cell * 256) * 4, (row * 512 + (cell + 1) * 256) * 4).equals(rgba.subarray(row * 1024, (row + 1) * 1024)));
  }
  assert.equal(layer.state, "FRESH"); assert.equal(layer.raster.validPixelCount, 131072);
  const cold = fresh(); assert.deepEqual((await cold.asset(proofs[0].datasetVersion, imageFile(layer)))?.bytes, asset.bytes);
  const nearby = await cold.layer(proofs[0].datasetVersion, { ...bounds, west: bounds.west + .001 });
  assert.equal(nearby?.raster?.imageUrl, layer.raster.imageUrl);
}));

test("wide views choose published coarser numerical cells; a window URL cannot change its pinned image or inventory hash", async () => fixture(async ({ service, proofs }) => {
  const layer = await service.layer(proofs[0].datasetVersion, view(window(10, 836, 445), 2)); assert.ok(layer?.raster);
  assert.deepEqual(layer.raster.boundsGcj02, displayRasterWindowBounds({ ...window(10, 836, 445), columns: 2 }));
  const asset = await service.asset(proofs[0].datasetVersion, imageFile(layer)); assert.ok(asset);
  assert.equal(PNG.sync.read(asset.bytes).width, 512);
  assert.equal(await service.asset(proofs[0].datasetVersion, imageFile(layer).replace(/-[a-f0-9]{64}\.png$/u, `-${"0".repeat(64)}.png`)), null);
  assert.equal(await service.asset(proofs[0].datasetVersion, imageFile(layer).replace(/-[a-f0-9]{64}-([a-f0-9]{64})\.png$/u, `-${"0".repeat(64)}-$1.png`)), null);
  const broad = await service.layer(proofs[0].datasetVersion, { west: 70, east: 140, south: 10, north: 55 });
  assert.equal(broad?.state, "PARTIAL"); assert.deepEqual(broad?.raster?.boundsGcj02, layer.raster.boundsGcj02);
  assert.equal(broad?.raster?.imageUrl, layer.raster.imageUrl, "a very wide view remains bounded to the actual published footprint");
}));

test("a missing fixed cell remains transparent and unpublished rather than stretching its neighbour", async () => fixture(async ({ service, proofs }) => {
  const layer = await service.layer(proofs[0].datasetVersion, view(window(11, 1672, 890), 3)); assert.ok(layer?.raster);
  assert.equal(layer.state, "PARTIAL"); assert.equal(layer.raster.qualitySummary.unpublishedPixels, 65536);
  assert.equal(layer.raster.validPixelCount, 131072); assert.equal(layer.raster.pixelCount, 196608);
  const asset = await service.asset(proofs[0].datasetVersion, imageFile(layer)); assert.ok(asset);
  const png = PNG.sync.read(asset.bytes); assert.equal(png.width, 768);
  for (let row = 0; row < 256; row++) assert.ok(png.data.subarray((row * 768 + 256) * 4, (row * 768 + 512) * 4).equals(Buffer.alloc(1024)));
  const outside = await service.layer(proofs[0].datasetVersion, { west: 70, east: 71, south: 20, north: 21 }); assert.equal(outside?.state, "UNAVAILABLE");
}, true));

test("a changed published child fails the whole requested view and can recover; cancelled reads do not install it", async () => fixture(async ({ service, proofs, directory }) => {
  const file = path.join(directory, proofs[1].image.file), bytes = await readFile(file), changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
  await writeFile(file, changed);
  const bounds = view(window(11, 1672, 890), 2);
  await assert.rejects(service.layer(proofs[0].datasetVersion, bounds), /nightlight_file_hash_invalid/u);
  await writeFile(file, bytes);
  const cancelled = new AbortController(); cancelled.abort(new Error("consumer_cancelled"));
  await assert.rejects(service.layer(proofs[0].datasetVersion, bounds, cancelled.signal), /consumer_cancelled/u);
  assert.equal((await service.layer(proofs[0].datasetVersion, bounds))?.raster?.validPixelCount, 131072);
}));

test("the production HTTP router serves the generated composed asset URL with its actual pinned bytes", async () => fixture(async ({ service, proofs }) => {
  const layer = await service.layer(proofs[0].datasetVersion, view(window(11, 1672, 890), 2)); assert.ok(layer?.raster);
  const app = Fastify(fastifyDeploymentOptions({ origins: [], trustedProxyCidrs: [] }));
  app.get<{ Params: { datasetVersion: string; file: string } }>("/v2/night-light/assets/:datasetVersion/:file", async (request, reply) => {
    const asset = await service.asset(request.params.datasetVersion, request.params.file);
    return asset ? reply.type("image/png").send(asset.bytes) : reply.code(404).send();
  });
  try {
    const response = await app.inject({ method: "GET", url: layer.raster.imageUrl });
    assert.equal(response.statusCode, 200);
    assert.equal(hash(response.rawPayload), layer.raster.imageSha256);
    assert.equal(response.rawPayload.length, layer.raster.imageBytes);
  } finally { await app.close(); }
}));
