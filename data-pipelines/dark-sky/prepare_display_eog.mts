/** Offline final display preparation, using the same product mapping as the API.
 * This does not publish a database record or replace any source image URL. */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_FIXED_SCALE } from "@starward/miniapp-contracts";
import { projectNightLightDisplay, nightLightContrastView, validateNightLightContrastDisplay } from "../../workers/miniapp-api/src/night-light-display-image.ts";
import type { NightLightView } from "../../workers/miniapp-api/src/night-light-window.ts";
import { readFixedNightLightInventory, readFixedNightLightProof, readFixedNightLightImage,
  type FixedNightLightDataset, type FixedNightLightInventory, type FixedNightLightRaster } from "../../workers/miniapp-api/src/night-light-publication.ts";

const hash = (raw: Buffer | string) => createHash("sha256").update(raw).digest("hex");
async function immutable(file: string, bytes: Buffer | string) {
  try { await writeFile(file, bytes, { flag: "wx" }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!(await readFile(file)).equals(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)))
      throw new Error("nightlight_immutable_display_conflict");
  }
}

async function preparedSource(manifestPath: string) {
  const directory = path.dirname(path.resolve(manifestPath));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 2 || manifest.fixedRaster?.inventory?.file !== "inventory.json")
    throw new Error("nightlight_display_manifest_invalid");
  const inventoryBytes = await readFile(path.join(directory, "inventory.json"));
  if (inventoryBytes.length > 2 * 1024 * 1024 || hash(inventoryBytes) !== manifest.fixedRaster.inventory.sha256)
    throw new Error("nightlight_display_inventory_invalid");
  const inventory = JSON.parse(inventoryBytes.toString("utf8")) as FixedNightLightInventory;
  const first = inventory.assets?.[0];
  if (!first || !/^nightlight-v2-[a-f0-9]{64}\.png$/u.test(first.file) || !Number.isInteger(first.proofBytes)
    || first.proofBytes < 1 || first.proofBytes > 1024 * 1024) throw new Error("nightlight_display_inventory_invalid");
  const firstPath = path.join(directory, first.file + ".json");
  if ((await stat(firstPath)).size !== first.proofBytes) throw new Error("nightlight_display_proof_invalid");
  const firstBytes = await readFile(firstPath);
  if (hash(firstBytes) !== first.proofSha256) throw new Error("nightlight_display_proof_invalid");
  const firstProof = JSON.parse(firstBytes.toString("utf8")) as FixedNightLightRaster;
  // These are read-only validation inputs, not a fabricated PUBLISHED DB row.
  const dataset = { datasetVersion: manifest.datasetVersion, radianceSha256: manifest.radiance.sha256,
    coverageSha256: manifest.cloudFreeCoverage.sha256, source: firstProof.source,
    payload: { schemaVersion: 2, datasetVersion: manifest.datasetVersion,
      methodVersion: NIGHT_LIGHT_FIXED_SCALE.methodVersion, styleVersion: NIGHT_LIGHT_FIXED_SCALE.styleVersion,
      policy: NIGHT_LIGHT_FIXED_SCALE, policySha256: manifest.fixedRaster.policySha256,
      aoi: manifest.aoi,
      minimumCloudFreeObservations: manifest.minimumCloudFreeObservations, source: firstProof.source,
      rasterInventory: { sha256: hash(inventoryBytes), publicationVersion: inventory.publicationVersion,
        assetCount: inventory.assets.length } } } as FixedNightLightDataset;
  const checked = await readFixedNightLightInventory(directory, dataset);
  return { directory, dataset, checked, inventorySha256: hash(inventoryBytes) };
}

export async function prepareNightLightDisplays(manifestPath: string, output: string) {
  const { directory, dataset, checked, inventorySha256 } = await preparedSource(manifestPath);
  await mkdir(output, { recursive: true });
  const entries = [];
  const signal = new AbortController().signal;
  for (const entry of checked.assets) {
    const proof = await readFixedNightLightProof(directory, dataset, entry);
    // The runtime's supported few-window budget remains unchanged.
    if (proof.grid.window.columns > 3 || proof.grid.window.rows > 3)
      throw new Error("nightlight_display_window_budget_exceeded");
    const bytes = await readFixedNightLightImage(directory, proof, signal);
    const display = projectNightLightDisplay({ proof, bytes }, inventorySha256, NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, signal);
    const proofBytes = Buffer.from(JSON.stringify(display.proof) + "\n");
    await immutable(path.join(output, display.proof.image.file), display.bytes);
    await immutable(path.join(output, display.proof.image.file + ".json"), proofBytes);
    entries.push({ key: entry.key, sourcePublicationId: proof.publicationId, image: display.proof.image,
      proof: { file: display.proof.image.file + ".json", bytes: proofBytes.length, sha256: hash(proofBytes) } });
  }
  const result = { schemaVersion: "starward-nightlight-offline-display-v1", releaseState: "SEALED",
    datasetVersion: dataset.datasetVersion, sourceInventorySha256: inventorySha256,
    styleVersion: NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, assets: entries };
  await immutable(path.join(output, "display-inventory.json"), JSON.stringify(result) + "\n");
  return { status: "prepared", assetCount: entries.length, sourceInventorySha256: inventorySha256, databasePublication: false };
}

type DisplayValidationPart = { manifest: string; displayDirectory: string;
  displayInventory: { bytes: number; sha256: string } };

async function checkedDisplayFile(directory: string, file: string, descriptor: { bytes: number; sha256: string }, maximum: number) {
  if (!Number.isSafeInteger(descriptor?.bytes) || descriptor.bytes < 1 || descriptor.bytes > maximum
    || !/^[a-f0-9]{64}$/u.test(descriptor.sha256)) throw new Error("nightlight_display_descriptor_invalid");
  const target = path.join(directory, file);
  if ((await stat(target)).size !== descriptor.bytes) throw new Error("nightlight_display_file_size_invalid");
  const bytes = await readFile(target);
  if (bytes.length !== descriptor.bytes || hash(bytes) !== descriptor.sha256) throw new Error("nightlight_display_file_hash_invalid");
  return bytes;
}

/** One offline validation process over existing parts. It never calls the
 * producer, creates an output directory, encodes pixels or writes a file. */
export async function validateNightLightDisplayParts(parts: readonly DisplayValidationPart[]) {
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 4096) throw new Error("nightlight_display_parts_invalid");
  const signal = new AbortController().signal;
  let assets = 0;
  for (const part of parts) {
    if (!part || Object.keys(part).sort().join() !== "displayDirectory,displayInventory,manifest"
      || !path.isAbsolute(part.manifest ?? "") || !path.isAbsolute(part.displayDirectory ?? ""))
      throw new Error("nightlight_display_part_invalid");
    const { directory, dataset, checked, inventorySha256 } = await preparedSource(part.manifest);
    const inventory = JSON.parse((await checkedDisplayFile(part.displayDirectory, "display-inventory.json", part.displayInventory,
      2 * 1024 * 1024)).toString("utf8"));
    if (inventory?.schemaVersion !== "starward-nightlight-offline-display-v1" || inventory.releaseState !== "SEALED"
      || inventory.datasetVersion !== dataset.datasetVersion || inventory.sourceInventorySha256 !== inventorySha256
      || inventory.styleVersion !== NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion || !Array.isArray(inventory.assets)
      || inventory.assets.length !== checked.assets.length) throw new Error("nightlight_display_inventory_invalid");
    const entries = new Map<string, any>();
    for (const entry of inventory.assets) {
      if (typeof entry?.key !== "string" || entries.has(entry.key)) throw new Error("nightlight_display_inventory_invalid");
      entries.set(entry.key, entry);
    }
    for (const entry of checked.assets) {
      const proof = await readFixedNightLightProof(directory, dataset, entry), display = entries.get(entry.key);
      if (!display || display.sourcePublicationId !== proof.publicationId) throw new Error("nightlight_display_source_invalid");
      const expected = nightLightContrastView(proof, inventorySha256, display.image);
      if (!isDeepStrictEqual(display.image, expected.image) || display.proof?.file !== expected.image.file + ".json")
        throw new Error("nightlight_display_identity_invalid");
      const displayProof = JSON.parse((await checkedDisplayFile(part.displayDirectory, display.proof.file, display.proof,
        1024 * 1024)).toString("utf8")) as NightLightView;
      const [sourceBytes, bytes] = await Promise.all([readFixedNightLightImage(directory, proof, signal),
        checkedDisplayFile(part.displayDirectory, expected.image.file, display.image, 16 * 1024 * 1024)]);
      validateNightLightContrastDisplay({ proof, bytes: sourceBytes }, displayProof, bytes, inventorySha256, signal);
      assets++;
    }
  }
  return { status: "validated", authority: "PREPARED_ONLY", partCount: parts.length, assetCount: assets,
    databasePublication: false, imageFilesWritten: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--validate-parts") {
    const chunks: Buffer[] = []; let bytes = 0;
    for await (const chunk of process.stdin) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += value.length;
      if (bytes > 4 * 1024 * 1024) throw new Error("nightlight_display_validation_input_budget_exceeded");
      chunks.push(value);
    }
    console.log(JSON.stringify(await validateNightLightDisplayParts(JSON.parse(Buffer.concat(chunks).toString("utf8")))));
  } else {
    if (args.length !== 4 || args[0] !== "--manifest" || args[2] !== "--output") throw new Error("nightlight_display_arguments_invalid");
    console.log(JSON.stringify(await prepareNightLightDisplays(path.resolve(args[1]!), path.resolve(args[3]!))));
  }
}
