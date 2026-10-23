// One read-only admission of the already chosen r20 window; no service instance.
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
let fetchAttemptCount = 0;
globalThis.fetch = async () => { fetchAttemptCount++; throw new Error("read_only_admission_fetch_forbidden"); };
const { DISPLAY_RASTER_GRID } = await import("@starward/coordinate-system");
const { readTerrainFixedInventory, readTerrainFixedAsset } = await import("../../../../workers/miniapp-api/src/terrain-fixed-publication.ts");
const { terrainWindowRequest, terrainFixedRequest, terrainRequestKey, TERRAIN_RENDER_VERSION } = await import("../../../../workers/miniapp-api/src/terrain-request.ts");
const { validateTerrainPublication, validateTerrainAsset, terrainRequestIsCovered } = await import("../../../../workers/miniapp-api/src/terrain-publication.ts");
type Publication = ReturnType<typeof validateTerrainPublication>;
type Request = ReturnType<typeof terrainWindowRequest>;
type Status = "PUBLISHED_EXACT" | "CACHE_COMPLETE" | "MISSING" | "INVALID";
type Result = { status: Status; publication?: Publication; requiredFiles: Map<string, number>; expiredCount?: number; unavailableSourceCount?: number; partialPixelCount?: number };

const workspace = path.resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
if (path.resolve(process.cwd()) !== workspace || process.argv.length !== 4) throw new Error("admission_scope_invalid");
const publicationRoot = process.argv[2], originalProofFile = process.argv[3];
if (!path.isAbsolute(publicationRoot) || !path.isAbsolute(originalProofFile)) throw new Error("absolute_read_inputs_required");
const selectedPublicationSha256 = path.basename(publicationRoot);
if (!/^[a-f0-9]{64}$/u.test(selectedPublicationSha256)) throw new Error("selected_publication_identity_invalid");
const cacheRoot = path.join(tmpdir(), `starward-terrain-${hash(process.cwd()).slice(0, 12)}-${TERRAIN_RENDER_VERSION}`);
const started = Date.now(), ttlMs = 24 * 60 * 60_000;
const watched = new Map<string, { size: number; mtimeMs: number; ctimeMs: number }>();
async function watch(file: string, maximumBytes: number) {
  const value = await stat(file);
  if (!value.isFile() || value.size > maximumBytes) throw new Error("admission_input_size_invalid");
  if (!watched.has(file)) watched.set(file, { size: value.size, mtimeMs: value.mtimeMs, ctimeMs: value.ctimeMs });
  return value;
}
const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";
const complete = (value: Publication) => value.validPixelCount === value.image.width * value.image.height
  && !value.unavailableSourceTiles.length && !value.sourceIssues?.length;
function checkIdentity(value: Publication, request: Request) {
  const actual = value.fixedWindow ? terrainWindowRequest(value.fixedWindow) : value.fixedRaster ? terrainFixedRequest(value.fixedRaster) : null;
  if (!actual || terrainRequestKey(actual) !== terrainRequestKey(request) || !terrainRequestIsCovered(value, request))
    throw new Error("admission_request_identity_invalid");
}

await watch(originalProofFile, 1024 * 1024);
const originalProofBytes = await readFile(originalProofFile);
const original = validateTerrainPublication(JSON.parse(originalProofBytes.toString("utf8")));
const window = { grid: DISPLAY_RASTER_GRID, tilePixels: 256 as const, zoom: 12, x: 3344, y: 1782, columns: 2, rows: 2 };
const windowRequest = terrainWindowRequest(window);
checkIdentity(original, windowRequest);
const originalFinalSha256 = "494729bb12cfd4209552f43fe44417abed79e475f00b286c1f47f8125745dd9f";
if (original.image.sha256 !== originalFinalSha256 || !complete(original)) throw new Error("original_r20_identity_invalid");
const originalImageFile = path.join(path.dirname(originalProofFile), "new-fine.png");
await watch(originalImageFile, original.image.byteSize);
validateTerrainAsset(await readFile(originalImageFile), original);

const inventoryFile = path.join(publicationRoot, "inventory.json");
let inventory: Awaited<ReturnType<typeof readTerrainFixedInventory>> | undefined;
let inventorySha256: string | null = null, inventoryInvalidCount = 0, inventoryMissingCount = 0;
try {
  await watch(inventoryFile, 2 * 1024 * 1024);
  inventory = await readTerrainFixedInventory(publicationRoot);
  inventorySha256 = hash(await readFile(inventoryFile));
} catch (error) {
  if (missing(error)) inventoryMissingCount = 1;
  else inventoryInvalidCount = 1;
}
async function admit(request: Request): Promise<Result> {
  const requiredFiles = new Map<string, number>();
  if (inventoryInvalidCount || inventoryMissingCount) return { status: "INVALID", requiredFiles };
  const key = terrainRequestKey(request), entry = inventory!.assets.find(value => value.key === key);
  if (entry) {
    try {
      const proofFile = path.join(publicationRoot, entry.file + ".json"), imageFile = path.join(publicationRoot, entry.file);
      const proofStat = await watch(proofFile, 1024 * 1024), imageStat = await watch(imageFile, 25 * 1024 * 1024);
      const { publication } = await readTerrainFixedAsset(publicationRoot, entry);
      checkIdentity(publication, request);
      requiredFiles.set(proofFile, proofStat.size); requiredFiles.set(imageFile, imageStat.size);
      return { status: "PUBLISHED_EXACT", publication, requiredFiles,
        unavailableSourceCount: publication.unavailableSourceTiles.length, partialPixelCount: complete(publication) ? 0 : 1 };
    } catch { return { status: "INVALID", requiredFiles }; }
  }
  try {
    const pointerFile = path.join(cacheRoot, key + ".json");
    const pointerStat = await watch(pointerFile, 1024 * 1024);
    if (started - pointerStat.mtimeMs > ttlMs) return { status: "MISSING", requiredFiles, expiredCount: 1 };
    const pointer = validateTerrainPublication(JSON.parse(await readFile(pointerFile, "utf8")));
    checkIdentity(pointer, request);
    if (pointer.sourceIssues?.some(issue => issue.reason !== "NOT_FOUND")) return { status: "INVALID", requiredFiles };
    if (pointer.unavailableSourceTiles.length || !complete(pointer)) return { status: "MISSING", requiredFiles,
      unavailableSourceCount: pointer.unavailableSourceTiles.length, partialPixelCount: 1 };
    const proofFile = path.join(cacheRoot, pointer.image.file + ".json"), imageFile = path.join(cacheRoot, pointer.image.file);
    const proofStat = await watch(proofFile, 1024 * 1024), imageStat = await watch(imageFile, 25 * 1024 * 1024);
    const proofBytes = await readFile(proofFile);
    const { publication } = await readTerrainFixedAsset(cacheRoot, { key, file: pointer.image.file, publicationSha256: hash(proofBytes) });
    checkIdentity(publication, request);
    if (publication.publicationId !== pointer.publicationId || !complete(publication)) throw new Error("cache_proof_conflict");
    requiredFiles.set(pointerFile, pointerStat.size); requiredFiles.set(proofFile, proofStat.size); requiredFiles.set(imageFile, imageStat.size);
    return { status: "CACHE_COMPLETE", publication, requiredFiles };
  } catch (error) { return { status: missing(error) ? "MISSING" : "INVALID", requiredFiles }; }
}

const requests = [windowRequest, ...original.fixedWindow!.cells.map(cell => terrainFixedRequest({
  grid: DISPLAY_RASTER_GRID, tilePixels: 256, zoom: 12, x: cell.x, y: cell.y, span: 1 }))];
// Five serial admissions bound memory and avoid any broad cache/disk scan.
const admitted: Result[] = [];
for (const request of requests) admitted.push(await admit(request));
const selectedWindow = admitted[0].publication;
const cellIdentityMatchCount = admitted.slice(1).filter((result, index) => {
  const expected = selectedWindow?.fixedWindow?.cells[index];
  return Boolean(expected && result.publication?.publicationId === expected.publicationId && result.publication?.image.file === expected.file);
}).length;
const originalCellIdentityMatchCount = admitted.slice(1).filter((result, index) => {
  const expected = original.fixedWindow!.cells[index];
  return result.publication?.publicationId === expected.publicationId && result.publication?.image.file === expected.file;
}).length;
let changedDuringReadCount = 0;
for (const [file, before] of watched) {
  try { const after = await stat(file); if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) changedDuringReadCount++; }
  catch { changedDuringReadCount++; }
}
const validCellCount = admitted.slice(1).filter(value => value.publication && complete(value.publication)).length;
const files = new Map<string, number>();
for (const result of admitted) for (const [file, bytes] of result.requiredFiles) files.set(file, bytes);
if (inventory && watched.has(inventoryFile)) files.set(inventoryFile, watched.get(inventoryFile)!.size);
const status: Status = inventoryInvalidCount || inventoryMissingCount || changedDuringReadCount || fetchAttemptCount
  || admitted.some(value => value.status === "INVALID") || selectedWindow && cellIdentityMatchCount !== 4 ? "INVALID"
  : selectedWindow && complete(selectedWindow) && validCellCount === 4
    ? admitted[0].status : "MISSING";
const result = {
  status, requiredCellCount: 4, validCellCount, cellIdentityMatchCount, originalCellIdentityMatchCount,
  publishedExactCount: admitted.filter(value => value.status === "PUBLISHED_EXACT").length,
  cacheCompleteCount: admitted.filter(value => value.status === "CACHE_COMPLETE").length,
  missingCount: admitted.filter(value => value.status === "MISSING").length,
  invalidCount: admitted.filter(value => value.status === "INVALID").length,
  expiredCount: admitted.reduce((sum, value) => sum + (value.expiredCount ?? 0), 0),
  unavailableSourceCount: admitted.reduce((sum, value) => sum + (value.unavailableSourceCount ?? 0), 0),
  partialPixelCount: admitted.reduce((sum, value) => sum + (value.partialPixelCount ?? 0), 0),
  inventoryInvalidCount, inventoryMissingCount, changedDuringReadCount, fetchAttemptCount,
  selectedPublicationSha256, inventorySha256, originalFinalSha256,
  finalSha256: selectedWindow?.image.sha256 ?? null,
  originalFinalMatchCount: selectedWindow?.image.sha256 === originalFinalSha256 ? 1 : 0,
  originalProofSha256: hash(originalProofBytes),
  requiredFileCount: files.size, requiredFileBytes: [...files.values()].reduce((sum, bytes) => sum + bytes, 0),
  checkedFileCount: watched.size,
  products: admitted.map((value, ordinal) => ({ ordinal, status: value.status, imageSha256: value.publication?.image.sha256 ?? null,
    fileCount: value.requiredFiles.size, fileBytes: [...value.requiredFiles.values()].reduce((sum, bytes) => sum + bytes, 0),
    expiredCount: value.expiredCount ?? 0 })),
};
const output = fileURLToPath(new URL("../terrain-current-publication-admission-20261023.json", import.meta.url));
await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result, null, 2));
