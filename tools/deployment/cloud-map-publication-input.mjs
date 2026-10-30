import { tsImport } from "tsx/esm/api";
import { PNG } from "pngjs";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { readPlainSkyFile, skyStaticHash as hash } from "./sky-static-bundle.mjs";

let owners;
const publicationOwners = () => owners ??= Promise.all([
  tsImport("../../workers/miniapp-api/src/cloud-publication.ts", import.meta.url),
  tsImport("../../packages/miniapp-contracts/src/cloud-display.ts", import.meta.url),
]);
const fail = code => { throw new Error(`map_static_cloud_${code}`); };
const descriptor = (file, bytes) => ({ file, bytes: bytes.length, sha256: hash(bytes) });
async function boundedFile(directory, file, maximum) {
  if (!path.isAbsolute(directory ?? "")) fail("path_not_absolute");
  const info = await lstat(path.join(directory, file));
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > maximum) fail("file_type_or_size_invalid");
  const bytes = await readPlainSkyFile(directory, file);
  if (bytes.length !== info.size || bytes.length > maximum) fail("source_changed");
  return bytes;
}

/** Local static preparation only. A numeric manifest and display pixels do not
 * establish one source group, nationwide products or a formal publication.
 * The original Map upload owner rejects this sealed DEVELOPMENT_ONLY family. */
export async function readCloudMapPublication({ directory, cloudSource }) {
  const [numeric, display] = await publicationOwners();
  if (cloudSource !== undefined && (!cloudSource || typeof cloudSource !== "object" || Array.isArray(cloudSource) ||
      Object.keys(cloudSource).sort().join() !== "directory,manifestSha256" ||
      typeof cloudSource.directory !== "string" || !/^[a-f0-9]{64}$/u.test(cloudSource.manifestSha256))) fail("source_invalid");
  // An original preparation selects an explicit source. A sealed recovery reads
  // exactly its copied control file, never a pointer or a latest publication.
  const sourceRaw = cloudSource ? await boundedFile(cloudSource.directory, "manifest.json", 256 * 1024)
    : await boundedFile(directory, "source-manifest.json", 256 * 1024);
  if (sourceRaw.length > 256 * 1024 || cloudSource && hash(sourceRaw) !== cloudSource.manifestSha256) fail("source_identity_invalid");
  const manifestSha256 = hash(sourceRaw), manifest = numeric.assertCloudBatch(JSON.parse(sourceRaw.toString("utf8")));
  const source = { ...manifest, manifestSha256 };
  const inventoryRaw = await boundedFile(directory, "inventory.json", 2 * 1024 * 1024);
  if (inventoryRaw.length > 2 * 1024 * 1024) fail("inventory_too_large");
  const inventory = display.assertCloudDisplayInventory(JSON.parse(inventoryRaw.toString("utf8")), source);
  const metadata = [{ ...descriptor("inventory.json", inventoryRaw), sourceDirectory: directory },
    { ...descriptor("source-manifest.json", sourceRaw), data: sourceRaw }];
  const records = [];
  for (const entry of inventory.records) {
    const proofRaw = await boundedFile(directory, entry.file + ".json", 2 * 1024 * 1024);
    if (proofRaw.length > 2 * 1024 * 1024 || hash(proofRaw) !== entry.proofSha256) fail("proof_identity_invalid");
    const proof = display.assertCloudDisplayProof(JSON.parse(proofRaw.toString("utf8")), source);
    display.assertCloudDisplayRecord(entry, proof);
    const image = await boundedFile(directory, entry.file, 16 * 1024 * 1024);
    if (image.length !== proof.image.bytes || hash(image) !== proof.image.sha256) fail("image_identity_invalid");
    // Full validation is a publication responsibility. No API request executes
    // this offline adapter or PNG decoding; it produces no new image bytes.
    if (image.length < 33 || !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        image.readUInt32BE(8) !== 13 || image.toString("ascii", 12, 16) !== "IHDR" ||
        image.readUInt32BE(16) !== proof.width || image.readUInt32BE(20) !== proof.height || image[24] !== 8 || image[25] !== 6)
      fail("image_geometry_invalid");
    let decoded;
    try { decoded = PNG.sync.read(image, { checkCRC: true }); } catch { fail("image_png_invalid"); }
    if (decoded.width !== proof.width || decoded.height !== proof.height) fail("image_geometry_invalid");
    let valid = 0;
    for (let index = 3; index < decoded.data.length; index += 4) if (decoded.data[index] !== 0) valid++;
    if (valid !== proof.validPixels || decoded.width * decoded.height - valid !== proof.missingPixels) fail("image_quality_invalid");
    metadata.push({ ...descriptor(entry.file + ".json", proofRaw), sourceDirectory: directory });
    records.push({ route: `/v2/cloud/assets/${manifestSha256}/${entry.file}`, ...descriptor(entry.file, image), sourceDirectory: directory,
      headers: { "content-type": "image/png", "cache-control": "public, max-age=604800, immutable", "x-content-type-options": "nosniff",
        "x-starward-cloud-publication": proof.publicationId } });
  }
  return { family: "cloud", publicationVersion: inventory.publicationId, admission: "DEVELOPMENT_ONLY", sourceManifestSha256: manifestSha256,
    metadata, records };
}
