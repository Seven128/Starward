import { tsImport } from "tsx/esm/api";
import { readPlainSkyFile, skyStaticHash } from "./sky-static-bundle.mjs";

// Reuse the real Map publication validators. The deployment adapter does not
// render terrain, compose numerical light cells, choose coverage or activate DB
// rows. tsImport keeps ordinary deployment tests independent of a global loader.
let owners;
const publicationOwners = () => owners ??= Promise.all([
  tsImport("../../workers/miniapp-api/src/terrain-fixed-publication.ts", import.meta.url),
  tsImport("../../workers/miniapp-api/src/night-light-publication.ts", import.meta.url),
  tsImport("../../workers/miniapp-api/src/night-light-window.ts", import.meta.url),
]);
const fail = code => { throw new Error(`map_static_${code}`); };
const payloadFields = new Set(["schemaVersion", "datasetVersion", "methodVersion", "styleVersion", "policy", "policySha256", "minimumCloudFreeObservations", "source", "rasterInventory",
  "aoi", "dataYear", "productName", "radianceUnit", "calibratedSkyClass"]);
const sourceFields = new Set(["attribution", "id", "kind", "provider", "title", "sourceUrl", "license", "licenseUrl", "publishedAt", "retrievedAt", "validFrom", "validTo", "state", "confidence", "precision", "limitations"]);
const descriptor = (file, bytes) => ({ file, bytes: bytes.length, sha256: skyStaticHash(bytes) });
const headers = (family, publicationId) => ({ "content-type": "image/png",
  "cache-control": "public, max-age=604800, immutable", "x-content-type-options": "nosniff",
  [family === "terrain" ? "x-starward-terrain-publication" : "x-starward-night-light-publication"]: publicationId });

/** These inputs are the existing publication inventories and their proof files,
 * not a hand-maintained object list. Night-light additionally requires an
 * explicit PUBLISHED DB-record export; its bytes alone never establish that a
 * selected runtime database has activated it. No secrets/private input is read. */
export async function readMapPublication({ family, directory, publishedRecord, displayWindowTargets }) {
  const [terrain, light, windows] = await publicationOwners();
  const inventoryBytes = await readPlainSkyFile(directory, "inventory.json");
  const metadata = [{ ...descriptor("inventory.json", inventoryBytes), sourceDirectory: directory }];
  const records = [];
  let inventory;
  if (family === "terrain") {
    if (publishedRecord !== undefined || displayWindowTargets !== undefined) fail("terrain_record_invalid");
    inventory = await terrain.readTerrainFixedInventory(directory);
    for (const entry of [...inventory.assets, ...(inventory.retainedAssets ?? [])]) {
      const proof = await readPlainSkyFile(directory, entry.file + ".json");
      const image = await readPlainSkyFile(directory, entry.file);
      // Check all paths before validators read them; a symlink/junction cannot
      // make an export include bytes outside the operator-selected publication.
      const asset = await terrain.readTerrainFixedAsset(directory, entry);
      if (!image.equals(asset.bytes)) fail("source_changed");
      metadata.push({ ...descriptor(entry.file + ".json", proof), sourceDirectory: directory });
      records.push({ route: `/v2/terrain/assets/${entry.file}`, ...descriptor(entry.file, image), sourceDirectory: directory,
        headers: headers(family, asset.publication.publicationId) });
    }
  } else if (family === "night-light") {
    if (publishedRecord?.state !== "PUBLISHED" || !publishedRecord.record) fail("published_record_required");
    const dataset = light.fixedNightLightDataset(publishedRecord.record);
    if (!dataset) fail("night_light_schema_unsupported");
    // Reject hidden/private side fields before copying the original public
    // dataset contract. The DB export is not credentials or an arbitrary row.
    if (Object.keys(publishedRecord).sort().join() !== "record,state" ||
        Object.keys(publishedRecord.record).sort().join() !== "coverageSha256,datasetVersion,payload,radianceSha256,source" ||
        Object.keys(publishedRecord.record.payload).some(name => !payloadFields.has(name)) ||
        Object.keys(publishedRecord.record.source).some(name => !sourceFields.has(name)) ||
        publishedRecord.record.source.attribution && Object.keys(publishedRecord.record.source.attribution).sort().join() !== "name,statements,url") fail("published_record_invalid");
    const recordBytes = Buffer.from(JSON.stringify(publishedRecord, null, 2) + "\n");
    metadata.push({ ...descriptor("published-record.json", recordBytes), data: recordBytes });
    inventory = await light.readFixedNightLightInventory(directory, dataset);
    const proofs = [];
    for (const entry of inventory.assets) {
      const proofBytes = await readPlainSkyFile(directory, entry.file + ".json");
      const image = await readPlainSkyFile(directory, entry.file);
      const proof = await light.readFixedNightLightProof(directory, dataset, entry);
      proofs.push(proof);
      const checked = await light.readFixedNightLightImage(directory, proof);
      if (!image.equals(checked)) fail("source_changed");
      metadata.push({ ...descriptor(entry.file + ".json", proofBytes), sourceDirectory: directory });
      records.push({ route: `/v2/night-light/assets/${dataset.datasetVersion}/${entry.file}`, ...descriptor(entry.file, image), sourceDirectory: directory,
        headers: headers(family, proof.publicationId) });
    }
    if (displayWindowTargets !== undefined) {
      if (!Array.isArray(displayWindowTargets) || !displayWindowTargets.length || displayWindowTargets.length > 16 ||
          displayWindowTargets.some(target => !target || Object.keys(target).sort().join() !== "boundsGcj02,name" ||
            typeof target.name !== "string" || !target.name.trim() || target.name.length > 120)) fail("window_targets_invalid");
      const prepared = new Set(records.map(record => record.file));
      for (const target of displayWindowTargets) {
        const window = windows.nightLightWindowForBounds(proofs, target.boundsGcj02);
        // A finite preparation never claims missing data was published.
        if (!window) fail("window_target_unpublished");
        const read = () => windows.composeNightLightWindow(directory, dataset.payload.rasterInventory.sha256, proofs, window, new AbortController().signal);
        const result = await read();
        if (!result) fail("window_target_unpublished");
        if (prepared.has(result.proof.image.file)) continue;
        prepared.add(result.proof.image.file);
        const proofBytes = Buffer.from(JSON.stringify(result.proof, null, 2) + "\n");
        metadata.push({ ...descriptor(result.proof.image.file + ".json", proofBytes), data: proofBytes });
        records.push({ route: `/v2/night-light/assets/${dataset.datasetVersion}/${result.proof.image.file}`,
          ...descriptor(result.proof.image.file, result.bytes), readBytes: async () => (await read()).bytes,
          headers: headers(family, result.proof.publicationId) });
      }
    }
  } else fail("family_invalid");
  return { family, publicationVersion: inventory.publicationVersion,
    ...(family === "night-light" ? { datasetVersion: inventory.datasetVersion } : {}),
    ...(displayWindowTargets ? { displayWindowTargets } : {}),
    metadata, records };
}
