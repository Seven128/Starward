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
export async function nightLightFixture(root, { columns = 1, firstColumn = 0, bandIndex = 0, missingPixels = 0 } = {}) {
  const [{ NIGHT_LIGHT_FIXED_SCALE: policy }, coordinates] = await Promise.all([
    tsImport("../../packages/miniapp-contracts/src/index.ts", import.meta.url),
    tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url),
  ]);
  const version = "synthetic-eog-map-static-v2", directory = path.join(root, version); await mkdir(directory);
  const source = { id: `eog-vnl:${version}`, kind: "TEST_FIXTURE", provider: "test", title: "Synthetic Map static fixture",
    sourceUrl: "https://example.test/source", license: "test", licenseUrl: "https://example.test/license", publishedAt: null, retrievedAt: null,
    validFrom: "2025-01-01T00:00:00.000Z", validTo: "2025-12-31T23:59:59.999Z", state: "FRESH", confidence: null, precision: "Unit fixture only", limitations: [] };
  const assets = [];
  for (let column = 0; column < columns; column++) {
  const w = { grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256, zoom: 11, x: 1672 + firstColumn + column, y: 890, columns: 1, rows: 1 };
  const png = new PNG({ width: 256, height: 256 });
  const color = policy.bands[bandIndex].color, rgba = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)).concat(policy.alpha);
  for (let pixel = missingPixels; pixel < 256 * 256; pixel++) png.data.set(rgba, pixel * 4);
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
    quality: { policyVersion: policy.qualityPolicy.version, minimumCloudFreeObservations: 3, validPixelCount: 65536 - missingPixels,
      validZeroPixelCount: bandIndex === 0 ? 65536 - missingPixels : 0,
      pixelCount: 65536, maximumAreaExcessFraction: 0, qualityMaskCounts: { "1": 65536 - missingPixels, "2": 0, "3": 0, "4": 0, "5": missingPixels, "6": 0 } } };
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

/** Synthetic numeric data goes through the actual finite display producer.
 * It remains DEVELOPMENT_ONLY and is never an upload/ready fixture. */
export async function cloudFixture(root) {
  const [{ createCloudPublicationFixture }, { prepareCloudDisplayWindows }, coordinates] = await Promise.all([
    tsImport("../../workers/miniapp-api/src/test-fixtures/cloud-publication-fixture.ts", import.meta.url),
    tsImport("../../data-pipelines/cloud/prepare_tcc_display.mts", import.meta.url),
    tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url),
  ]);
  const numeric = await createCloudPublicationFixture();
  try {
    const directory = path.join(root, "cloud-display"); await mkdir(directory);
    const window = coordinates.displayRasterWindowForBounds({ west: 113.01, east: 113.08, south: 22.92, north: 22.99 });
    const produced = await prepareCloudDisplayWindows({ directory: numeric.directory, manifestSha256: numeric.manifestSha256,
      output: directory, windows: [window], selectedTimes: ["2026-10-27T00:00:00Z", "2026-10-27T01:30:00Z"],
      execution: { deadlineAt: new Date(Date.now() + 30_000).toISOString(), maximumConcurrent: 1,
        maximumQueued: 0, maximumOutputBytes: 4 * 1024 * 1024 } });
    return { family: "cloud", directory, cloudSource: { directory: numeric.directory, manifestSha256: numeric.manifestSha256 },
      manifest: numeric.manifest, inventory: produced.inventory, dispose: () => numeric.dispose() };
  } catch (error) { await numeric.dispose(); throw error; }
}

/** Prepared EOG static boundary only. Reuses the original public image fixture
 * and contrast producer; no source original, numerical TIFF or DB is provided. */
export async function shardedNightLightFixture(root, { displayMutation, qualityMutation = false, cells = [{}] } = {}) {
  const inputRoot = path.join(root, "sharded-source"); await mkdir(inputRoot);
  const [{ readFile }, display, contracts] = await Promise.all([
    import("node:fs/promises"),
    tsImport("../../workers/miniapp-api/src/night-light-display-image.ts", import.meta.url),
    tsImport("../../packages/miniapp-contracts/src/index.ts", import.meta.url),
  ]);
  const directory = path.join(root, "sharded-publication"); await mkdir(directory);
  const write = async (file, value) => { await mkdir(path.dirname(path.join(directory, file)), { recursive: true }); await writeFile(path.join(directory, file), value); };
  const descriptor = (file, value) => ({ file, bytes: value.length, sha256: hash(value) });
  const parts = {}, shards = {}, entries = [], proofs = [], totals = { assets: 0, numericBytes: 0, legacyPngBytes: 0, displayPngBytes: 0, proofBytes: 0 };
  for (const [number, cell] of cells.entries()) {
    const partRoot = path.join(inputRoot, String(number)); await mkdir(partRoot);
    const original = await nightLightFixture(partRoot, cell);
    let inventoryRaw = await readFile(path.join(original.directory, "inventory.json"));
    const inventory = JSON.parse(inventoryRaw), sourceEntry = inventory.assets[0], file = sourceEntry.file;
    let proofRaw = await readFile(path.join(original.directory, file + ".json")); const proof = JSON.parse(proofRaw);
    if (qualityMutation) {
      proof.quality.validPixelCount--; proof.quality.validZeroPixelCount--;
      proof.quality.qualityMaskCounts["1"]--; proof.quality.qualityMaskCounts["5"]++;
      proofRaw = Buffer.from(JSON.stringify(proof));
      sourceEntry.proofBytes = proofRaw.length; sourceEntry.proofSha256 = hash(proofRaw);
      inventory.publicationVersion = "nightlight-fixed:" + hash(canonical({ datasetVersion: inventory.datasetVersion,
        policySha256: inventory.policySha256, assets: inventory.assets }));
      inventoryRaw = Buffer.from(JSON.stringify(inventory));
    }
    const part = hash(inventoryRaw);
    const sourceBytes = await readFile(path.join(original.directory, file));
    const projected = display.projectNightLightDisplay({ proof, bytes: sourceBytes }, part, contracts.NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, new AbortController().signal);
    let bytes = projected.bytes;
    if (displayMutation === "pixel") { const png = PNG.sync.read(bytes); png.data[0] ^= 1; bytes = PNG.sync.write(png); }
    if (displayMutation === "crc") { bytes = Buffer.from(bytes); bytes[29] ^= 1; }
    const displayProof = display.nightLightContrastView(proof, part, { bytes: bytes.length, sha256: hash(bytes) });
    const displayProofRaw = Buffer.from(JSON.stringify(displayProof) + "\n");
    const displayEntry = { key: sourceEntry.key, sourcePublicationId: proof.publicationId, image: displayProof.image,
      proof: descriptor(displayProof.image.file + ".json", displayProofRaw) };
    const displayInventoryRaw = Buffer.from(JSON.stringify({ schemaVersion: "starward-nightlight-offline-display-v1", releaseState: "SEALED",
      datasetVersion: proof.datasetVersion, sourceInventorySha256: part, styleVersion: displayProof.styleVersion, assets: [displayEntry] }) + "\n");
    const prefix = `parts/${part}/`, w = proof.grid.window, shardKey = `${w.zoom}/${Math.floor(w.x / 16)}/${Math.floor(w.y / 16)}`;
    const entry = { part, publicationId: proof.publicationId, window: w, boundsGcj02: proof.grid.boundsGcj02, quality: proof.quality,
      proof: descriptor(prefix + file + ".json", proofRaw), image: { ...proof.image, file: prefix + file },
      numeric: { ...proof.numeric, file: prefix + proof.numeric.file }, display: { styleVersion: displayProof.styleVersion,
        publicationId: displayProof.publicationId, image: { ...displayProof.image, file: prefix + "display/" + displayProof.image.file },
        proof: { ...displayEntry.proof, file: prefix + "display/" + displayEntry.proof.file } } };
    const aoi = { west: 113.68, south: 22.68, east: 114.32, north: 23.32 };
    if (parts[part] || shards[shardKey]?.[sourceEntry.key]) throw new Error("synthetic_eog_duplicate_cell");
    parts[part] = { publicationVersion: inventory.publicationVersion, sourceManifestSha256: "e".repeat(64),
      inventory: descriptor(prefix + "inventory.json", inventoryRaw), displayInventory: descriptor(prefix + "display/display-inventory.json", displayInventoryRaw),
      aoiWgs84: aoi, requestedAoiWgs84: aoi, assetCount: 1 };
    (shards[shardKey] ??= {})[sourceEntry.key] = entry;
    entries.push(entry); proofs.push(proof);
    totals.assets++; totals.numericBytes += proof.numeric.bytes; totals.legacyPngBytes += sourceBytes.length;
    totals.displayPngBytes += bytes.length; totals.proofBytes += proofRaw.length + displayProofRaw.length;
    for (const [file, raw] of [[prefix + "inventory.json", inventoryRaw], [prefix + "display/display-inventory.json", displayInventoryRaw],
      [entry.proof.file, proofRaw], [entry.image.file, sourceBytes], [entry.display.proof.file, displayProofRaw], [entry.display.image.file, bytes]]) await write(file, raw);
  }
  const proof = proofs[0], w = proof.grid.window, shardRecords = {};
  for (const [shardKey, assets] of Object.entries(shards)) {
    const raw = Buffer.from(canonical({ schemaVersion: "starward-sharded-nightlight-assets-v1", datasetVersion: proof.datasetVersion, shardKey, assets }) + "\n");
    shardRecords[shardKey] = { ...descriptor(`shards/${shardKey}.json`, raw), assetCount: Object.keys(assets).length };
    await write(`shards/${shardKey}.json`, raw);
  }
  const index = { schemaVersion: "starward-sharded-nightlight-index-v1", releaseState: "SEALED", datasetVersion: proof.datasetVersion,
    methodVersion: proof.methodVersion, styleVersion: proof.styleVersion, policySha256: proof.sourceSet.policySha256,
    radianceSha256: proof.sourceSet.radianceSha256, coverageSha256: proof.sourceSet.coverageSha256,
    minimumCloudFreeObservations: 3, source: proof.source, grid: w.grid, tilePixels: 256, shardTileSpan: 16,
    coverage: "DECLARED_SOURCE_AOIS_WITH_PER_PIXEL_QUALITY", availableZooms: [w.zoom],
    parts, shards: shardRecords, totals };
  index.indexVersion = "nightlight-sharded:" + hash(canonical(index));
  const indexRaw = Buffer.from(canonical(index) + "\n");
  await write("index.json", indexRaw);
  return { family: "night-light", directory, nightLightSharded: descriptor("index.json", indexRaw), index, entry: entries[0], entries, proofs };
}
