import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSkyStaticContains, assertSkyStaticImageArtifact, assertSkyStaticIndex, mergeSkyStaticBundles, readPlainSkyFile,
  skyStaticDeliveryFragment, skyStaticHash, validateSkyStaticBundle } from "./sky-static-bundle.mjs";

const fail = code => { throw new Error(`sky_backup_${code}`); };
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const keys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
const within = (parent, child) => { const relative = path.relative(parent, child);
  return !relative || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)); };

export function assertSkyStaticBackup(record) {
  const complete = record?.schemaVersion === "starward-sky-static-backup-v2";
  if (!keys(record, ["schemaVersion", "scope", "directory", "publicationHash", "files", "bytes", "indexSha256", "fragmentSha256", "inventorySha256",
    ...(complete ? ["sourceMetadataSha256"] : [])]) ||
    !["starward-sky-static-backup-v1", "starward-sky-static-backup-v2"].includes(record.schemaVersion) || record.scope !== "RETAINED_PUBLIC_URL_UNION" ||
    !hash(record.publicationHash) || record.directory !== `sky-public-${record.publicationHash}` ||
    !hash(record.indexSha256) || !hash(record.fragmentSha256) || !hash(record.inventorySha256) || (complete && !hash(record.sourceMetadataSha256)) ||
    !Number.isSafeInteger(record.files) || record.files < 1 || !Number.isSafeInteger(record.bytes) || record.bytes < 1)
    fail("record_invalid");
  return record;
}

/** Version the application backup only when it actually includes Sky bytes.
 * Legacy DB v1 is never inferred to contain public imagery or client history. */
export function verifiedBackupSkyRecord(manifest) {
  if (manifest?.schemaVersion === "starward-verified-backup-v1" && !Object.hasOwn(manifest, "skyStaticBackup")) return null;
  if (manifest?.schemaVersion !== "starward-verified-backup-v2") fail("manifest_schema_invalid");
  return assertSkyStaticBackup(manifest.skyStaticBackup);
}

function assertInventory(pointer, publicationHash) {
  if (!keys(pointer, ["schemaVersion", "generation", "publicationHash", "sources"]) ||
    pointer.schemaVersion !== "starward-sky-static-prepared-inventory-v1" ||
    !/^generation-[a-f0-9-]{36}$/.test(pointer.generation) || pointer.publicationHash !== publicationHash ||
    !Array.isArray(pointer.sources) || !pointer.sources.length) fail("inventory_invalid");
  const identities = new Set(), directories = new Set();
  for (const source of pointer.sources) {
    const identity = `${source?.revision}:${source?.imageDigest}`;
    if (!keys(source, ["directory", "revision", "imageDigest", "imagePublicationHash"]) ||
      !/^source-[a-f0-9-]{36}$/.test(source.directory) || !/^[a-f0-9]{40}$/.test(source.revision) ||
      !/^sha256:[a-f0-9]{64}$/.test(source.imageDigest) || !hash(source.imagePublicationHash) ||
      identities.has(identity) || directories.has(source.directory)) fail("inventory_invalid");
    identities.add(identity); directories.add(source.directory);
  }
  return pointer;
}

function parseSourceJson(bytes) {
  try { return JSON.parse(bytes.toString("utf8")); } catch { fail("source_metadata_invalid"); }
}

function sourceMetadataReadback(bytes, pointer, bundle, inventorySha256) {
  const archive = parseSourceJson(bytes);
  if (!keys(archive, ["schemaVersion", "inventorySha256", "sources"]) ||
      archive.schemaVersion !== "starward-sky-static-source-archive-v1" || archive.inventorySha256 !== inventorySha256 ||
      !Array.isArray(archive.sources) || archive.sources.length !== pointer.sources.length) fail("source_metadata_invalid");
  const decode = text => {
    if (typeof text !== "string" || !text) fail("source_metadata_invalid");
    const result = Buffer.from(text, "base64");
    if (result.toString("base64") !== text) fail("source_metadata_invalid");
    return result;
  };
  const sources = [], routes = new Set();
  for (let i = 0; i < archive.sources.length; i++) {
    const entry = archive.sources[i], original = pointer.sources[i];
    if (!keys(entry, ["directory", "indexBase64", "fragmentBase64", "artifactBase64"]) || entry.directory !== original.directory)
      fail("source_metadata_invalid");
    const indexBytes = decode(entry.indexBase64), fragmentBytes = decode(entry.fragmentBase64), artifactBytes = decode(entry.artifactBase64);
    const index = assertSkyStaticIndex(parseSourceJson(indexBytes)), artifact = parseSourceJson(artifactBytes);
    if (index.publicationHash !== original.imagePublicationHash) fail("source_identity_mismatch");
    if (!fragmentBytes.equals(Buffer.from(skyStaticDeliveryFragment(index.records)))) fail("source_metadata_invalid");
    assertSkyStaticImageArtifact(artifact, { revision: original.revision, publicationHash: original.imagePublicationHash, indexBytes, fragmentBytes });
    assertSkyStaticContains(bundle, index);
    for (const entry of index.records) routes.add(entry.route);
    sources.push(Object.freeze({ directory: original.directory, index, indexBytes, fragmentBytes, artifactBytes }));
  }
  if (routes.size !== bundle.records.length) fail("source_union_mismatch");
  return Object.freeze(sources);
}

function sourceMetadataBytes(sourceMetadata, pointer, bundle, inventorySha256) {
  if (!Array.isArray(sourceMetadata) || sourceMetadata.length !== pointer.sources.length) fail("source_metadata_invalid");
  const sources = sourceMetadata.map((entry, i) => {
    if (!keys(entry, ["directory", "indexBytes", "fragmentBytes", "artifactBytes"]) || entry.directory !== pointer.sources[i].directory ||
      !Buffer.isBuffer(entry.indexBytes) || !Buffer.isBuffer(entry.fragmentBytes) || !Buffer.isBuffer(entry.artifactBytes)) fail("source_metadata_invalid");
    return { directory: entry.directory, indexBase64: entry.indexBytes.toString("base64"),
      fragmentBase64: entry.fragmentBytes.toString("base64"), artifactBase64: entry.artifactBytes.toString("base64") };
  });
  const bytes = Buffer.from(JSON.stringify({ schemaVersion: "starward-sky-static-source-archive-v1", inventorySha256, sources }) + "\n");
  sourceMetadataReadback(bytes, pointer, bundle, inventorySha256);
  return bytes;
}

/** One file at a time through the existing writer, never a second exporter.
 * The lease-owning caller has already validated OCI source admission. This
 * snapshot records retained URLs; it does not identify the running release. */
export async function createSkyStaticBackup({ bundleDirectory, inventoryBytes, backupDirectory, sourceMetadata }) {
  if (!path.isAbsolute(backupDirectory ?? "") || within(bundleDirectory, backupDirectory) || within(backupDirectory, bundleDirectory))
    fail("directory_invalid");
  const source = await validateSkyStaticBundle(bundleDirectory);
  const pointer = assertInventory(JSON.parse(inventoryBytes.toString("utf8")), source.publicationHash), inventorySha256 = skyStaticHash(inventoryBytes);
  const metadataBytes = sourceMetadata === undefined ? null : sourceMetadataBytes(sourceMetadata, pointer, source, inventorySha256);
  const record = assertSkyStaticBackup({ schemaVersion: metadataBytes ? "starward-sky-static-backup-v2" : "starward-sky-static-backup-v1", scope: "RETAINED_PUBLIC_URL_UNION",
    directory: `sky-public-${source.publicationHash}`, publicationHash: source.publicationHash, files: source.files, bytes: source.bytes,
    indexSha256: skyStaticHash(await readPlainSkyFile(bundleDirectory, "index.json")),
    fragmentSha256: skyStaticHash(await readPlainSkyFile(bundleDirectory, "delivery.caddy")), inventorySha256,
    ...(metadataBytes ? { sourceMetadataSha256: skyStaticHash(metadataBytes) } : {}) });
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
  if (comparable(await realpath(backupDirectory)) !== comparable(path.resolve(backupDirectory))) fail("directory_invalid");
  const container = path.join(backupDirectory, record.directory);
  let exists = false;
  try { const metadata = await lstat(container); if (!metadata.isDirectory() || metadata.isSymbolicLink()) fail("directory_invalid"); exists = true; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!exists) await mergeSkyStaticBundles({ directories: [bundleDirectory], outputDirectory: container });
  // A new source image may publish the same URL union. Reuse its data while
  // retaining each exact inventory seal in a small immutable sidecar.
  const sidecar = `inventory-${record.inventorySha256}.json`;
  try { await writeFile(path.join(container, sidecar), inventoryBytes, { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  if (metadataBytes) {
    try { await writeFile(path.join(container, `sources-${record.sourceMetadataSha256}.json`), metadataBytes, { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  await readSkyStaticBackup({ backupDirectory, record });
  const after = await validateSkyStaticBundle(bundleDirectory);
  if (after.publicationHash !== record.publicationHash) fail("source_changed");
  return Object.freeze({ record, reusedPayload: exists });
}

export async function readSkyStaticBackup({ backupDirectory, record }) {
  assertSkyStaticBackup(record);
  if (!path.isAbsolute(backupDirectory ?? "")) fail("directory_invalid");
  const relative = `${record.directory}/publication`, directory = path.join(backupDirectory, relative);
  const index = await readPlainSkyFile(backupDirectory, `${relative}/index.json`);
  const fragment = await readPlainSkyFile(backupDirectory, `${relative}/delivery.caddy`);
  const inventoryBytes = await readPlainSkyFile(backupDirectory, `${record.directory}/inventory-${record.inventorySha256}.json`);
  if (skyStaticHash(index) !== record.indexSha256 || skyStaticHash(fragment) !== record.fragmentSha256 ||
    skyStaticHash(inventoryBytes) !== record.inventorySha256) fail("metadata_identity_mismatch");
  const bundle = await validateSkyStaticBundle(directory);
  if (bundle.publicationHash !== record.publicationHash || bundle.files !== record.files || bundle.bytes !== record.bytes)
    fail("publication_identity_mismatch");
  const inventory = assertInventory(JSON.parse(inventoryBytes.toString("utf8")), record.publicationHash);
  let sourceMetadata = null;
  if (record.schemaVersion === "starward-sky-static-backup-v2") {
    const metadataBytes = await readPlainSkyFile(backupDirectory, `${record.directory}/sources-${record.sourceMetadataSha256}.json`);
    if (skyStaticHash(metadataBytes) !== record.sourceMetadataSha256) fail("source_metadata_identity_mismatch");
    sourceMetadata = sourceMetadataReadback(metadataBytes, inventory, bundle, record.inventorySha256);
  }
  return Object.freeze({ bundle, inventory, record, sourceMetadata });
}

/** Explicit isolated restore. It never overwrites a live store, imports a new
 * OCI image, changes the current pointer, or restores database/private files. */
export async function restoreSkyStaticBackup({ backupDirectory, record, outputDirectory, confirmPublicationHash }) {
  assertSkyStaticBackup(record);
  if (confirmPublicationHash !== record.publicationHash) fail("publication_confirmation_required");
  if (!path.isAbsolute(outputDirectory ?? "") || path.resolve(outputDirectory) === path.parse(path.resolve(outputDirectory)).root ||
    within(backupDirectory, outputDirectory) || within(outputDirectory, backupDirectory)) fail("restore_directory_invalid");
  const { bundle } = await readSkyStaticBackup({ backupDirectory, record });
  const copied = await mergeSkyStaticBundles({ directories: [bundle.directory], outputDirectory });
  const restored = await validateSkyStaticBundle(copied.output);
  if (restored.publicationHash !== record.publicationHash || restored.files !== record.files || restored.bytes !== record.bytes ||
    skyStaticHash(await readPlainSkyFile(restored.directory, "index.json")) !== record.indexSha256 ||
    skyStaticHash(await readPlainSkyFile(restored.directory, "delivery.caddy")) !== record.fragmentSha256) fail("restore_identity_mismatch");
  return Object.freeze({ status: "RESTORED_ISOLATED_PUBLIC_URLS", directory: restored.directory,
    publicationHash: restored.publicationHash, files: restored.files, bytes: restored.bytes, runtimeApplied: false });
}
