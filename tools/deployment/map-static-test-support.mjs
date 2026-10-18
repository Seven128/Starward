import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { tsImport } from "tsx/esm/api";
import { PNG } from "pngjs";
import { skyStaticHash as hash } from "./sky-static-bundle.mjs";
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value !== null && typeof value === "object" ?
  `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);

/** Public, synthetic source transport through the real terrain producer. */
export async function terrainFixture(root, offset = 0, previous) {
  const [{ TerrainService }, { createTerrainViewportRenderer }, { publishFixedTerrain }, coordinates] = await Promise.all([
    tsImport("../../workers/miniapp-api/src/terrain-service.ts", import.meta.url),
    tsImport("../../workers/miniapp-api/src/terrain-viewport-renderer.ts", import.meta.url),
    tsImport("../../data-pipelines/terrain/publish_fixed_terrain.mts", import.meta.url),
    tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url),
  ]);
  const bounds = coordinates.displayRasterBounds({ grid: coordinates.DISPLAY_RASTER_GRID, zoom: 12, x: 3344, y: 1700, span: 1, tilePixels: 256 });
  const dx = bounds.east - bounds.west, dy = bounds.north - bounds.south;
  const target = { name: "synthetic Map deployment fixture", boundsGcj02: { west: bounds.west + dx * .2, east: bounds.east - dx * .2,
    south: bounds.south + dy * .2, north: bounds.north - dy * .2 } };
  const transport = async url => {
    const [, , x, y] = /\/(\d+)\/(\d+)\/(\d+)\.png$/u.exec(String(url));
    const png = new PNG({ width: 256, height: 256 });
    for (let row = 0; row < 256; row++) for (let column = 0; column < 256; column++) {
      const h = 32768 + offset + (Number(x) * 256 + column) / 8 - (Number(y) * 256 + row) / 4;
      png.data.set([Math.floor(h / 256), Math.floor(h) % 256, Math.round(h % 1 * 256), 255], (row * 256 + column) * 4);
    }
    return new Response(PNG.sync.write(png), { headers: { etag: `"synthetic-${offset}"`, "x-amz-meta-x-imagery-sources": "srtm/test.tif" } });
  };
  const cache = path.join(root, `terrain-cache-${offset}`), directory = path.join(root, `terrain-release-${offset}`);
  const renderer = createTerrainViewportRenderer(transport), terrain = new TerrainService({ directory: cache, renderer: renderer.render });
  try { await terrain.getPublication({ purpose: "MAP", center: { system: "GCJ02", latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2 }, viewportBounds: target.boundsGcj02 }); }
  finally { terrain.close(); renderer.close(); }
  const inventory = await publishFixedTerrain({ output: directory, cache, previous, targets: [target] });
  return { family: "terrain", directory, inventory };
}

/** Same bounded image-selection fixture contract as night-light-window tests.
 * It deliberately supplies no scientific TIFF and makes no numeric/source claim. */
export async function nightLightFixture(root, { columns = 1 } = {}) {
  const [{ NIGHT_LIGHT_FIXED_SCALE: policy }, coordinates] = await Promise.all([
    tsImport("../../packages/miniapp-contracts/src/index.ts", import.meta.url),
    tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url),
  ]);
  const version = "synthetic-eog-map-static-v2", directory = path.join(root, version); await mkdir(directory);
  const source = { id: `eog-vnl:${version}`, kind: "TEST_FIXTURE", provider: "test", title: "Synthetic Map static fixture",
    sourceUrl: "https://example.test/source", license: "test", licenseUrl: "https://example.test/license", publishedAt: null, retrievedAt: null,
    validFrom: "2025-01-01T00:00:00Z", validTo: null, state: "FRESH", confidence: null, precision: "Unit fixture only", limitations: [] };
  const assets = [];
  for (let column = 0; column < columns; column++) {
  const w = { grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256, zoom: 11, x: 1672 + column, y: 890, columns: 1, rows: 1 };
  const png = new PNG({ width: 256, height: 256 });
  for (let pixel = 0; pixel < 256 * 256; pixel++) png.data.set([135, 113, 74, policy.alpha], pixel * 4);
  const bytes = PNG.sync.write(png), imageHash = hash(bytes), numericHash = "d".repeat(64);
  const sourceSet = { datasetVersion: version, radianceSha256: "a".repeat(64), coverageSha256: "b".repeat(64), policySha256: "c".repeat(64), geometrySha256: hash(JSON.stringify(w)) };
  const identity = hash(canonical(sourceSet)), file = `nightlight-v2-${hash(`${identity}:${imageHash}:${numericHash}`)}.png`;
  const step = coordinates.WEB_MERCATOR_CIRCUMFERENCE_M / (256 * 2 ** w.zoom);
  const proof = { schemaVersion: "starward-fixed-nightlight-raster-v2", releaseState: "PREPARED", datasetVersion: version,
    publicationId: `nightlight:${identity}:${imageHash}:${numericHash}`, source, sourceSet, methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policy,
    derivation: "GDAL_PHYSICAL_AREA_SUM", cells: [], image: { file, bytes: bytes.length, sha256: imageHash, width: 256, height: 256 },
    numeric: { file: file + ".numbers.tif", bytes: 100, sha256: numericHash, format: "GEOTIFF_FLOAT64_DEFLATE_V1",
      bands: ["radianceMean", "validAreaFraction", "sourceMissingAreaFraction", "insufficientCoverageAreaFraction", "publishedAreaFraction", "qualityMask"], coordinates: "derived-GCJ-Mercator-metres", pixelInterpretation: "AREA" },
    unit: policy.unit, statistic: policy.statistics.map,
    grid: { grid: w.grid, window: w, width: 256, height: 256, boundsGcj02: coordinates.displayRasterWindowBounds(w),
      affine: [step, 0, (w.x / 2 ** w.zoom - .5) * coordinates.WEB_MERCATOR_CIRCUMFERENCE_M, 0, -step, (.5 - w.y / 2 ** w.zoom) * coordinates.WEB_MERCATOR_CIRCUMFERENCE_M] },
    quality: { policyVersion: policy.qualityPolicy.version, minimumCloudFreeObservations: 3, validPixelCount: 65536, validZeroPixelCount: 65536,
      pixelCount: 65536, maximumAreaExcessFraction: 0, qualityMaskCounts: { "1": 65536, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 } } };
  const rawProof = JSON.stringify(proof); await writeFile(path.join(directory, file), bytes); await writeFile(path.join(directory, file + ".json"), rawProof);
  assets.push({ key: `11-${w.x}-890-1-1`, file, proofBytes: Buffer.byteLength(rawProof), proofSha256: hash(rawProof) });
  }
  const inventory = { schemaVersion: "starward-fixed-nightlight-inventory-v1", releaseState: "SEALED", datasetVersion: version,
    methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policySha256: "c".repeat(64), createdAt: "2026-10-17T00:00:00Z",
    publicationVersion: `nightlight-fixed:${hash(canonical({ datasetVersion: version, policySha256: "c".repeat(64), assets }))}`, assets };
  const rawInventory = JSON.stringify(inventory); await writeFile(path.join(directory, "inventory.json"), rawInventory);
  const record = { datasetVersion: version, radianceSha256: "a".repeat(64), coverageSha256: "b".repeat(64), source,
    payload: { schemaVersion: 2, datasetVersion: version, methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, policy, policySha256: "c".repeat(64),
      minimumCloudFreeObservations: 3, source, rasterInventory: { sha256: hash(rawInventory), publicationVersion: inventory.publicationVersion, assetCount: assets.length } } };
  return { family: "night-light", directory, publishedRecord: { state: "PUBLISHED", record }, inventory };
}
