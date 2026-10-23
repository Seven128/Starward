// Task-scoped admission of exactly the r20 final and its four referenced cells.
// Optional explicit preparation copies admitted original products to a new
// static publication. No source request, runtime-cache write or pointer refresh.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { DISPLAY_RASTER_GRID, displayRasterWindowForBounds } from "@starward/coordinate-system";
import { readTerrainFixedInventory, readTerrainFixedAsset } from "../../../../workers/miniapp-api/src/terrain-fixed-publication.ts";
import { terrainFixedRequest, terrainWindowRequest, terrainRequestKey } from "../../../../workers/miniapp-api/src/terrain-request.ts";
import { terrainRequestIsCovered, validateTerrainPublication, validateTerrainAsset } from "../../../../workers/miniapp-api/src/terrain-publication.ts";

let fetchAttemptCount = 0;
globalThis.fetch = async () => { fetchAttemptCount++; throw new Error("historical_reuse_fetch_forbidden"); };
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const [evidenceRoot, publishedRoot, operation] = process.argv.slice(2);
assert.ok(process.argv.length === 4 || process.argv.length === 5 && operation === "--prepare");
assert.ok(path.isAbsolute(evidenceRoot!) && path.isAbsolute(publishedRoot!));
const preparationRoot = "D:/dev/Starward-data/preparations/terrain-r20-reuse-20261023";
await assert.rejects(stat(preparationRoot), (error: NodeJS.ErrnoException) => error.code === "ENOENT");
const startedAt = Date.now();
const watched = new Map<string, { bytes: number; sha256: string; mtimeMs: number; ctimeMs: number }>();
async function read(file: string, maximum = 1024 * 1024) {
  const info = await stat(file);
  assert.ok(info.isFile() && info.size <= maximum);
  const bytes = await readFile(file);
  const current = { bytes: bytes.length, sha256: sha(bytes), mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs };
  const existing = watched.get(file);
  if (existing) assert.deepEqual(current, existing, "original changed during repeated admission");
  else watched.set(file, current);
  return bytes;
}
const preservationFile = path.join(evidenceRoot!, "local-preservation-manifest.json");
const preservation = JSON.parse((await read(preservationFile)).toString("utf8"));
const finalProofBytes = await read(path.join(evidenceRoot!, "new-fine.metadata.json"));
const final = validateTerrainPublication(JSON.parse(finalProofBytes.toString("utf8")));
assert.equal(final.image.sha256, "494729bb12cfd4209552f43fe44417abed79e475f00b286c1f47f8125745dd9f");
const request = terrainWindowRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom: 12, x: 3344, y: 1782, columns: 2, rows: 2 });
assert.equal(terrainRequestKey(terrainWindowRequest(final.fixedWindow!)), terrainRequestKey(request));
assert.ok(terrainRequestIsCovered(final, request));
const complete = (publication: typeof final) => publication.validPixelCount === publication.image.width * publication.image.height
  && !publication.sourceIssues?.length && !publication.unavailableSourceTiles.length;
assert.ok(complete(final));
const finalBytes = validateTerrainAsset(await read(path.join(evidenceRoot!, "new-fine.png")), final);
const finalPixels = PNG.sync.read(finalBytes, { checkCRC: true });
const originalProofRecord = preservation.originals.find((value: { name: string }) => value.name === "new-fine.metadata.json");
const originalImageRecord = preservation.originals.find((value: { name: string }) => value.name === "new-fine.png");
assert.equal(sha(finalProofBytes), originalProofRecord.sourceSha256);
assert.equal(sha(finalBytes), originalImageRecord.sourceSha256);
const historicalCache = path.dirname(originalProofRecord.source);
assert.equal(path.dirname(originalImageRecord.source), historicalCache);
assert.ok((await read(originalProofRecord.source)).equals(finalProofBytes));
assert.ok((await read(originalImageRecord.source)).equals(finalBytes));
const windowPointer = path.join(historicalCache, terrainRequestKey(request) + ".json");
const windowPointerProof = validateTerrainPublication(JSON.parse((await read(windowPointer)).toString("utf8")));
assert.equal(windowPointerProof.publicationId, final.publicationId);
assert.equal(sha(JSON.stringify(windowPointerProof)), sha(JSON.stringify(final)));

const inventoryFile = path.join(publishedRoot!, "inventory.json");
const inventoryBytes = await read(inventoryFile, 2 * 1024 * 1024);
const inventory = await readTerrainFixedInventory(publishedRoot!);
assert.equal(inventory.publicationVersion, "terrain-fixed:c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722");
assert.equal(sha(inventoryBytes), "f8903922eb14702d5de6325c903fac296bbc69d94019c9d7844ee03ac71ea774");
const products: Record<string, unknown>[] = [];
const productFiles = new Map<string, { proof: string; image: string; expectedProofSha256: string }>();
productFiles.set(terrainRequestKey(request), { proof: originalProofRecord.source,
  image: originalImageRecord.source, expectedProofSha256: originalProofRecord.sourceSha256 });
let comparedPixels = 0, differingChannels = 0, expiredHistoricalPointerCount = 0;
for (const [ordinal, cell] of final.fixedWindow!.cells.entries()) {
  const cellRequest = terrainFixedRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom: 12, x: cell.x, y: cell.y, span: 1 });
  const key = terrainRequestKey(cellRequest);
  const current = inventory.assets.find(value => value.key === key && value.file === cell.file);
  const directory = current ? publishedRoot! : historicalCache;
  const proofFile = path.join(directory, cell.file + ".json"), imageFile = path.join(directory, cell.file);
  const proof = await read(proofFile), bytes = await read(imageFile);
  const admitted = await readTerrainFixedAsset(directory, current ?? { key, file: cell.file, publicationSha256: sha(proof) });
  assert.equal(admitted.publication.publicationId, cell.publicationId);
  assert.equal(terrainRequestKey(terrainFixedRequest(admitted.publication.fixedRaster!)), key);
  assert.ok(terrainRequestIsCovered(admitted.publication, cellRequest) && complete(admitted.publication));
  assert.ok(admitted.bytes.equals(bytes));
  let pointerAgeMs: number | null = null;
  if (!current) {
    const pointerFile = path.join(directory, key + ".json");
    const pointer = validateTerrainPublication(JSON.parse((await read(pointerFile)).toString("utf8")));
    assert.equal(pointer.publicationId, cell.publicationId);
    assert.equal(sha(JSON.stringify(pointer)), sha(JSON.stringify(admitted.publication)));
    pointerAgeMs = startedAt - watched.get(pointerFile)!.mtimeMs;
    if (pointerAgeMs > 24 * 60 * 60_000) expiredHistoricalPointerCount++;
  }
  const pixels = PNG.sync.read(bytes, { checkCRC: true });
  const xOffset = (cell.x - final.fixedWindow!.x) * 256, yOffset = (cell.y - final.fixedWindow!.y) * 256;
  for (let row = 0; row < 256; row++) for (let column = 0; column < 256; column++) {
    const sourceOffset = (row * 256 + column) * 4;
    const windowOffset = ((row + yOffset) * 512 + column + xOffset) * 4;
    for (let channel = 0; channel < 4; channel++) if (pixels.data[sourceOffset + channel] !== finalPixels.data[windowOffset + channel]) differingChannels++;
    comparedPixels++;
  }
  products.push({ ordinal, key, origin: current ? "PUBLISHED_EXACT" : "HISTORICAL_COMPLETE_EXPIRED_CACHE",
    publicationId: admitted.publication.publicationId, imageSha256: admitted.publication.image.sha256,
    proofSha256: sha(proof), bytes: bytes.length, proofBytes: proof.length,
    pointerAgeMs, derivedAt: admitted.publication.derivedAt, sourceIssues: admitted.publication.sourceIssues,
    unavailableSourceTiles: admitted.publication.unavailableSourceTiles, validPixelCount: admitted.publication.validPixelCount });
  productFiles.set(key, { proof: proofFile, image: imageFile, expectedProofSha256: sha(proof) });
}
assert.equal(differingChannels, 0);
let preparation: Record<string, unknown> | null = null;
if (operation === "--prepare") {
  const { publishFixedTerrain } = await import("../../../../data-pipelines/terrain/publish_fixed_terrain.mts");
  const output = path.join(preparationRoot, "publication"), unusedCache = path.join(preparationRoot, "unused-cache");
  // Preserve all existing current targets/products, including preview parents.
  // Declaring only r20 would demote unrelated current products to retained URLs.
  for (const entry of inventory.assets) if (!productFiles.has(entry.key)) productFiles.set(entry.key, {
    proof: path.join(publishedRoot!, entry.file + ".json"), image: path.join(publishedRoot!, entry.file),
    expectedProofSha256: entry.publicationSha256 });
  const targets = [...inventory.targets, { name: "r20 west-pan original complete window", boundsGcj02: final.boundsGcj02 }];
  assert.equal(terrainRequestKey(terrainWindowRequest(displayRasterWindowForBounds(final.boundsGcj02))), terrainRequestKey(request));
  let preparedProductReads = 0;
  const preparedInventory = await publishFixedTerrain({ output, cache: unusedCache, previous: publishedRoot, targets,
    preparedProduct: async input => {
      preparedProductReads++;
      const declared = productFiles.get(terrainRequestKey(input));
      assert.ok(declared, "undeclared historical product request");
      const proof = await read(declared.proof), bytes = await read(declared.image);
      assert.equal(sha(proof), declared.expectedProofSha256);
      await assert.rejects(stat(path.join(output, "inventory.json")), { code: "ENOENT" });
      return { proof, bytes };
    } });
  const outputInventoryBytes = await readFile(path.join(output, "inventory.json"));
  const readback = await readTerrainFixedInventory(output);
  assert.deepEqual(preparedInventory, readback);
  assert.equal(readback.assets.length, 17);
  assert.equal(readback.retainedAssets?.length ?? 0, 0);
  let preservedCurrentCount = 0, outputPngBytes = 0, outputProofBytes = 0;
  for (const entry of readback.assets) {
    const { publication, bytes } = await readTerrainFixedAsset(output, entry);
    assert.ok(complete(publication));
    const declared = productFiles.get(entry.key)!;
    const proof = await readFile(path.join(output, entry.file + ".json"));
    assert.equal(sha(proof), declared.expectedProofSha256);
    assert.equal(sha(bytes), watched.get(declared.image)!.sha256);
    outputPngBytes += bytes.length; outputProofBytes += proof.length;
    const previous = inventory.assets.find(value => value.key === entry.key);
    if (previous) { assert.deepEqual(entry, previous); preservedCurrentCount++; }
  }
  assert.equal(preservedCurrentCount, inventory.assets.length);
  await assert.rejects(stat(unusedCache), { code: "ENOENT" });
  assert.equal((await readdir(output)).length, 35);
  const inventoryStat = await stat(path.join(output, "inventory.json"));
  for (const entry of readback.assets) {
    assert.ok((await stat(path.join(output, entry.file))).mtimeMs <= inventoryStat.mtimeMs);
    assert.ok((await stat(path.join(output, entry.file + ".json"))).mtimeMs <= inventoryStat.mtimeMs);
  }
  preparation = { output, publicationVersion: readback.publicationVersion, inventorySha256: sha(outputInventoryBytes),
    targets: targets.length, currentAssets: readback.assets.length, retainedAssets: 0, preservedCurrentCount,
    preparedProductReads, outputFileCount: 35, outputPngBytes, outputProofBytes,
    outputInventoryBytes: outputInventoryBytes.length, outputBytes: outputPngBytes + outputProofBytes + outputInventoryBytes.length,
    runtimeCacheCreated: false, originalProofsByteIdentical: true, sourceFetchAttemptCount: fetchAttemptCount };
}
let changedDuringReadCount = 0;
for (const [file, before] of watched) {
  const after = await stat(file);
  if (after.size !== before.bytes || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) changedDuringReadCount++;
}
assert.equal(changedDuringReadCount, 0);
assert.equal(fetchAttemptCount, 0);
const publicSummary = { status: preparation ? "STATIC_PREPARATION_COMPLETE_UNACTIVATED" : "HISTORICAL_PRODUCTS_COMPLETE_PUBLISHER_INGESTION_GAP", requiredCellCount: 4,
  validCellCount: products.length, publishedExactCellCount: products.filter(value => value.origin === "PUBLISHED_EXACT").length,
  historicalCompleteCellCount: products.filter(value => value.origin !== "PUBLISHED_EXACT").length,
  expiredHistoricalPointerCount, finalPointerExpired: startedAt - watched.get(windowPointer)!.mtimeMs > 24 * 60 * 60_000,
  finalSha256: final.image.sha256, finalProofSha256: sha(finalProofBytes), comparedPixels, differingChannels,
  selectedPublicationVersion: inventory.publicationVersion, inventorySha256: sha(inventoryBytes),
  checkedFileCount: watched.size, checkedFileBytes: [...watched.values()].reduce((sum, value) => sum + value.bytes, 0),
  changedDuringReadCount, fetchAttemptCount, preparationCreated: Boolean(preparation), publisherInvoked: Boolean(preparation), preparation };
const resultFile = path.join(evidenceRoot!, operation === "--prepare" ? "historical-product-reuse-preparation-20261023.private.json"
  : "historical-product-reuse-20261023.private.json");
await writeFile(resultFile, JSON.stringify({ ...publicSummary, startedAt, historicalCache, publishedRoot,
  products, files: [...watched].map(([file, value]) => ({ file, ...value })) }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ ...publicSummary, privateResultSha256: sha(await readFile(resultFile)) }, null, 2));
