import { tsImport } from "tsx/esm/api";
import { lstat } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { readPlainSkyFile, skyStaticHash as hash } from "./sky-static-bundle.mjs";
import { isPublicMapSource } from "./map-publication-source.mjs";

let owners;
const publicationOwners = () => owners ??= Promise.all([
  tsImport("../../workers/miniapp-api/src/night-light-sharded-publication.ts", import.meta.url),
  tsImport("../../workers/miniapp-api/src/night-light-publication.ts", import.meta.url),
  tsImport("../../workers/miniapp-api/src/night-light-display-image.ts", import.meta.url),
  tsImport("../../packages/miniapp-contracts/src/index.ts", import.meta.url),
  tsImport("../../workers/miniapp-api/src/night-light-window.ts", import.meta.url),
  tsImport("../../workers/miniapp-api/src/map-static-manifest.ts", import.meta.url),
  tsImport("../../packages/coordinate-system/src/index.ts", import.meta.url),
]);
const fail = code => { throw new Error(`map_static_eog_${code}`); };
const descriptor = (file, bytes) => ({ file, bytes: bytes.length, sha256: hash(bytes) });
const exact = (value, names) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join() === names.slice().sort().join();

async function pinned(directory, record, maximum) {
  if (!path.isAbsolute(directory ?? "") || !record || typeof record.file !== "string" || path.isAbsolute(record.file) ||
      record.file.includes(":") || record.file.includes("\\") || record.file.split("/").some(part => !part || part === "." || part === "..") ||
      !Number.isSafeInteger(record.bytes) || record.bytes < 1 || record.bytes > maximum || !/^[a-f0-9]{64}$/u.test(record.sha256)) fail("descriptor_invalid");
  const info = await lstat(path.join(directory, record.file));
  if (!info.isFile() || info.isSymbolicLink() || info.size !== record.bytes) fail("file_type_or_size_invalid");
  const raw = await readPlainSkyFile(directory, record.file);
  if (raw.length !== record.bytes || hash(raw) !== record.sha256) fail("file_identity_invalid");
  return raw;
}

/** Offline, complete traversal of an explicitly pinned prepared set. Runtime
 * discovery remains root -> coordinate shard -> one proof. No numerical TIFF,
 * source original, database or public readiness is involved. Explicit finite
 * targets may compose already qualified image cells through the shared owner. */
export async function readEogMapPublication({ directory, nightLightSharded, displayWindowTargets, signal = new AbortController().signal }) {
  signal.throwIfAborted();
  if (!exact(nightLightSharded, ["file", "bytes", "sha256"]) || nightLightSharded.file !== "index.json") fail("root_pin_required");
  const [{ ShardedNightLightPublication }, light, display, contracts, windows, declaration, coordinates] = await publicationOwners();
  if (displayWindowTargets !== undefined) declaration.assertMapStaticDisplayWindowTargets(displayWindowTargets);
  const raw = await pinned(directory, nightLightSharded, 4 * 1024 * 1024), index = JSON.parse(raw.toString("utf8"));
  const reader = new ShardedNightLightPublication(directory, nightLightSharded);
  const metadata = [], records = [], expected = new Map(), seen = new Set(), counts = {
    assets: 0, numericBytes: 0, legacyPngBytes: 0, displayPngBytes: 0, proofBytes: 0,
  };
  const add = (file, bytes) => metadata.push({ ...descriptor(file, bytes), sourceDirectory: directory });
  try {
    const checked = await reader.metadata();
    if (!isPublicMapSource(checked.source) || !exact(index, ["schemaVersion", "releaseState", "datasetVersion", "methodVersion", "styleVersion",
      "policySha256", "radianceSha256", "coverageSha256", "minimumCloudFreeObservations", "source", "grid", "tilePixels", "shardTileSpan",
      "coverage", "indexVersion", "availableZooms", "parts", "shards", "totals"])) fail("source_invalid");
    add("index.json", raw);
    // Part inventories are an offline completeness cross-check, never a runtime
    // discovery fallback. Their original bytes are retained as control material.
    for (const [part, declared] of Object.entries(index.parts)) {
      if (!exact(declared, ["publicationVersion", "sourceManifestSha256", "inventory", "displayInventory", "aoiWgs84", "requestedAoiWgs84", "assetCount"])) fail("part_contract_invalid");
      const inventoryRaw = await pinned(directory, declared.inventory, 2 * 1024 * 1024);
      const displayRaw = await pinned(directory, declared.displayInventory, 2 * 1024 * 1024);
      add(declared.inventory.file, inventoryRaw); add(declared.displayInventory.file, displayRaw);
      const dataset = light.fixedNightLightDataset({ datasetVersion: checked.datasetVersion, source: checked.source,
        radianceSha256: checked.radianceSha256, coverageSha256: checked.coverageSha256,
        payload: { schemaVersion: 2, datasetVersion: checked.datasetVersion, methodVersion: checked.methodVersion,
          styleVersion: checked.styleVersion, policy: contracts.NIGHT_LIGHT_FIXED_SCALE, policySha256: checked.policySha256,
          minimumCloudFreeObservations: checked.minimumCloudFreeObservations, source: checked.source,
          aoi: declared.aoiWgs84, rasterInventory: { sha256: part, publicationVersion: declared.publicationVersion, assetCount: declared.assetCount } } });
      if (!dataset) fail("part_contract_invalid");
      const inventory = await light.readFixedNightLightInventory(path.join(directory, "parts", part), dataset);
      const displays = JSON.parse(displayRaw.toString("utf8"));
      if (!exact(displays, ["schemaVersion", "releaseState", "datasetVersion", "sourceInventorySha256", "styleVersion", "assets"]) ||
          displays.schemaVersion !== "starward-nightlight-offline-display-v1" || displays.releaseState !== "SEALED" ||
          displays.datasetVersion !== checked.datasetVersion || displays.sourceInventorySha256 !== part ||
          displays.styleVersion !== contracts.NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion || !Array.isArray(displays.assets) ||
          displays.assets.length !== inventory.assets.length) fail("part_display_invalid");
      const byKey = new Map();
      for (const item of displays.assets) {
        if (typeof item?.key !== "string" || byKey.has(item.key)) fail("part_display_invalid");
        byKey.set(item.key, item);
      }
      for (const asset of inventory.assets) {
        if (expected.has(asset.key) || !byKey.has(asset.key)) fail("part_window_invalid");
        expected.set(asset.key, { part, asset, display: byKey.get(asset.key) });
      }
    }
    for (const [shardKey, shardRecord] of Object.entries(index.shards)) {
      signal.throwIfAborted();
      const shardRaw = await pinned(directory, shardRecord, 2 * 1024 * 1024), shard = JSON.parse(shardRaw.toString("utf8"));
      add(shardRecord.file, shardRaw);
      if (!exact(shard, ["schemaVersion", "datasetVersion", "shardKey", "assets"]) ||
          shard.schemaVersion !== "starward-sharded-nightlight-assets-v1" || shard.datasetVersion !== checked.datasetVersion ||
          shard.shardKey !== shardKey || !shard.assets || Array.isArray(shard.assets) ||
          Object.keys(shard.assets).length !== shardRecord.assetCount) fail("shard_invalid");
      for (const [key, entry] of Object.entries(shard.assets)) {
        const original = expected.get(key);
        if (!exact(entry, ["part", "publicationId", "window", "boundsGcj02", "quality", "proof", "image", "numeric", "display"]) ||
            !original || seen.has(key) || entry.part !== original.part) fail("window_set_invalid");
        seen.add(key);
        const prepared = await reader.window(key, signal);
        if (!prepared || original.asset.file !== prepared.proof.image.file ||
            original.asset.proofBytes !== entry.proof.bytes || original.asset.proofSha256 !== entry.proof.sha256 ||
            original.display.sourcePublicationId !== prepared.proof.publicationId ||
            !isDeepStrictEqual(original.display.image, prepared.displayProof.image) ||
            !isDeepStrictEqual(original.display.proof, { ...entry.display.proof, file: prepared.displayProof.image.file + ".json" })) fail("part_window_invalid");
        const proofRaw = await pinned(directory, entry.proof, 1024 * 1024);
        const displayProofRaw = await pinned(directory, entry.display.proof, 1024 * 1024);
        const sourceBytes = await pinned(directory, prepared.sourceImage, 16 * 1024 * 1024);
        const imageBytes = await pinned(directory, prepared.displayImage, 16 * 1024 * 1024);
        display.validateNightLightContrastDisplay({ proof: prepared.proof, bytes: sourceBytes }, prepared.displayProof, imageBytes, prepared.part, signal);
        // Both PNG copies below are controls for repeatable pixel validation;
        // only the final contrast PNG enters the public files/ object set.
        add(entry.proof.file, proofRaw); add(entry.display.proof.file, displayProofRaw);
        add(prepared.sourceImage.file, sourceBytes); add(prepared.displayImage.file, imageBytes);
        records.push({ route: `/v2/night-light/assets/${checked.datasetVersion}/${prepared.displayProof.image.file}`,
          ...descriptor(prepared.displayImage.file, imageBytes), sourceDirectory: directory,
          headers: { "content-type": "image/png", "cache-control": "public, max-age=604800, immutable", "x-content-type-options": "nosniff",
            "x-starward-night-light-publication": prepared.displayProof.publicationId } });
        counts.assets++; counts.numericBytes += prepared.proof.numeric.bytes;
        counts.legacyPngBytes += sourceBytes.length; counts.displayPngBytes += imageBytes.length;
        counts.proofBytes += proofRaw.length + displayProofRaw.length;
      }
    }
    if (seen.size !== expected.size || !isDeepStrictEqual(counts, checked.totals)) fail("complete_set_invalid");
    const preparedTargets = new Set();
    for (const target of displayWindowTargets ?? []) {
      signal.throwIfAborted();
      // Unlike legacy compatibility clipping, a declared target must keep its
      // complete requested coverage and cannot turn unpublished cells into mask 5.
      const window = windows.nightLightWindowForLevels(checked.availableZooms, target.boundsGcj02);
      if (!window) fail("window_target_unpublished");
      windows.validateNightLightWindow(window);
      const key = coordinates.displayRasterWindowKey(window);
      if (preparedTargets.has(key)) continue;
      preparedTargets.add(key);
      const cover = await reader.coveringWindow(key, signal);
      if (cover?.proof.grid.window.zoom === window.zoom) continue;
      const proofs = [], directories = new Map();
      for (let row = 0; row < window.rows; row++) for (let column = 0; column < window.columns; column++) {
        const unitKey = coordinates.displayRasterWindowKey({ ...window, x: window.x + column, y: window.y + row, columns: 1, rows: 1 });
        const unit = await reader.window(unitKey, signal);
        if (!unit) fail("window_target_unpublished");
        proofs.push(unit.proof);
        directories.set(unit.proof, path.join(directory, "parts", unit.part));
      }
      const produce = async () => {
        signal.throwIfAborted();
        const source = await windows.composeNightLightWindow(proof => directories.get(proof), nightLightSharded.sha256, proofs, window, signal);
        if (!source) fail("window_target_unpublished");
        const final = display.projectNightLightDisplay(source, nightLightSharded.sha256, contracts.NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion, signal);
        display.validateNightLightContrastDisplay(source, final.proof, final.bytes, nightLightSharded.sha256, signal);
        return { source, final };
      };
      // Only descriptors/proofs persist across targets. Copying requests one
      // bounded image at a time; no nationwide PNG array or numeric work exists.
      const result = await produce();
      for (const kind of ["source", "final"]) {
        const item = result[kind], file = `windows/${item.proof.image.file}`;
        const proofBytes = Buffer.from(JSON.stringify(item.proof) + "\n");
        metadata.push({ ...descriptor(file + ".json", proofBytes), data: proofBytes });
        metadata.push({ ...descriptor(file, item.bytes), readBytes: async () => (await produce())[kind].bytes });
      }
      records.push({ route: `/v2/night-light/assets/${checked.datasetVersion}/${result.final.proof.image.file}`,
        ...descriptor(`windows/${result.final.proof.image.file}`, result.final.bytes), readBytes: async () => (await produce()).final.bytes,
        headers: { "content-type": "image/png", "cache-control": "public, max-age=604800, immutable", "x-content-type-options": "nosniff",
          "x-starward-night-light-publication": result.final.proof.publicationId } });
    }
    if (!(await pinned(directory, nightLightSharded, 4 * 1024 * 1024)).equals(raw)) fail("source_changed");
    return { family: "night-light", publicationVersion: checked.indexVersion, datasetVersion: checked.datasetVersion,
      admission: "DEVELOPMENT_ONLY", ...(displayWindowTargets ? { displayWindowTargets } : {}), metadata, records };
  } finally { reader.close(); }
}
