import { mkdir, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import { readPlainSkyFile, skyStaticHash } from "./sky-static-bundle.mjs";
import { readMapPublication } from "./map-publication-inputs.mjs";

const { validMapStaticRoute, mapStaticRouteFamily, assertMapStaticRecord, assertMapStaticManifest: assertIndex, mapStaticSourceId: sourceId,
  isShardedMapNightLightSource: shardedLight, isMapNightLightContrastRoute } =
  await tsImport("../../workers/miniapp-api/src/map-static-manifest.ts", import.meta.url);
const { assertMapStaticIndex, expandMapStaticIndex, partitionMapStaticManifest } =
  await tsImport("../../workers/miniapp-api/src/map-static-index.ts", import.meta.url);
export { validMapStaticRoute, mapStaticRouteFamily, assertMapStaticRecord };
const fail = code => { throw new Error(`map_static_${code}`); };
const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
const within = (parent, child) => { const rel = path.relative(comparable(parent), comparable(child));
  return !rel || rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = values => values.sort((a, b) => a.route < b.route ? -1 : a.route > b.route ? 1 : 0);

/** Exact public Map routes only. Inventory/proofs/DB-record provenance remain
 * sealed local control material, outside the web root; unknown routes fall back
 * to the importing site's API. No source processing happens in this fragment. */
export function mapStaticDeliveryFragment(records) {
  const lines = ["# Generated Map final products. Import before API fallback; mount sealed files read-only at /srv/map-public."];
  records.forEach(assertMapStaticRecord);
  // New cloud pixels have an OSS origin, never a business-host delivery route.
  // Their local prepared records are deliberately absent from this fragment.
  records.filter(record => !record.route.startsWith("/v2/cloud/") && !isMapNightLightContrastRoute(record.route)).forEach((record, index) => {
    lines.push(`@map_published_${index} {`, "\tmethod GET HEAD", `\tpath ${record.route}`,
      "\tfile {", "\t\troot /srv/map-public/files", "\t\ttry_files {path}", "\t}", "}",
      `handle @map_published_${index} {`, "\tlog_append map_delivery static", "\theader {", "\t\tx-starward-map-delivery static");
    for (const [name, value] of Object.entries(record.headers)) lines.push(`\t\t${name} ${JSON.stringify(value)}`);
    lines.push("\t}", "\tfile_server {", "\t\troot /srv/map-public/files", "\t\tdisable_canonical_uris", "\t}", "}");
  });
  return lines.join("\n") + "\n";
}
const publicRecord = input => ({ route: input.route, bytes: input.bytes, sha256: input.sha256, headers: input.headers });
const metadataDescriptor = ({ data: _data, readBytes: _readBytes, sourceDirectory: _directory, ...entry }) => entry;

/** Re-admit copied inventories/proofs with the original domain validators and
 * require their exact URL/byte/header union. Rehashing the derived index cannot
 * authorize arbitrary routes, changed proofs or a new data/source family. */
export async function validateMapStaticBundle(directory) {
  if (!path.isAbsolute(directory ?? "")) fail("path_not_absolute");
  const sealedIndex = assertMapStaticIndex(JSON.parse((await readPlainSkyFile(directory, "index.json")).toString("utf8")));
  const index = await expandMapStaticIndex(sealedIndex, async (file, maximum, signal) => {
    signal.throwIfAborted();
    const bytes = await readPlainSkyFile(directory, file);
    if (bytes.length > maximum) fail("page_identity_invalid");
    return bytes;
  }, new AbortController().signal);
  const expected = new Map();
  for (const source of index.sources) {
    const root = `publications/${sourceId(source)}`;
    for (const entry of source.metadata) {
      const bytes = await readPlainSkyFile(directory, `${root}/${entry.file}`);
      if (bytes.length !== entry.bytes || skyStaticHash(bytes) !== entry.sha256) fail("source_changed");
    }
    // The validators read images beside their proofs. The sealed copy uses the
    // ordinary Map publication layout; files/ contains the HTTP copy only.
    const publication = await readMapPublication({ family: source.family, directory: path.join(directory, root),
      ...(shardedLight(source) ? { nightLightSharded: source.metadata.find(entry => entry.file === "index.json") } : source.family === "night-light" ? { publishedRecord: JSON.parse((await readPlainSkyFile(directory, `${root}/published-record.json`)).toString("utf8")) } : {}),
      ...(source.displayWindowTargets ? { displayWindowTargets: source.displayWindowTargets } : {}) });
    const described = { family: publication.family, publicationVersion: publication.publicationVersion,
      ...(publication.datasetVersion ? { datasetVersion: publication.datasetVersion } : {}),
      ...(publication.family === "cloud" ? { admission: publication.admission, sourceManifestSha256: publication.sourceManifestSha256 } :
        shardedLight(publication) ? { admission: publication.admission } : {}),
      ...(publication.displayWindowTargets ? { displayWindowTargets: publication.displayWindowTargets } : {}),
      metadata: publication.metadata.map(metadataDescriptor) };
    if (sealedIndex.schemaVersion === "starward-map-static-export-v2") described.metadata.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
    if (!same(described, source)) fail("source_changed");
    for (const input of publication.records) {
      const record = publicRecord(input), previous = expected.get(record.route);
      if (previous && !same(previous, record)) fail("history_conflict");
      expected.set(record.route, record);
      const bytes = await readPlainSkyFile(directory, `files${record.route}`);
      if (bytes.length !== input.bytes || skyStaticHash(bytes) !== input.sha256) fail("file_identity_mismatch");
    }
  }
  if (!same(sorted([...expected.values()]), index.records)) fail("index_source_mismatch");
  if (!(await readPlainSkyFile(directory, "delivery.caddy")).equals(Buffer.from(mapStaticDeliveryFragment(index.records)))) fail("fragment_mismatch");
  return Object.freeze({ directory: path.resolve(directory), ...index, schemaVersion: sealedIndex.schemaVersion,
    publicationHash: sealedIndex.publicationHash, files: index.records.length,
    bytes: index.records.reduce((sum, record) => sum + record.bytes, 0), sourceAdmission: "MAP_PUBLICATION_CONTRACTS_AND_DECLARED_PUBLISHED_RECORD",
    runtimeActivated: false });
}

export async function prepareMapStaticBundle({ publications, previousDirectories = [], outputDirectory, indexLayout }) {
  if (!path.isAbsolute(outputDirectory ?? "") || !Array.isArray(publications) || !Array.isArray(previousDirectories) ||
      !publications.length && !previousDirectories.length || indexLayout !== undefined && !["flat", "partitioned"].includes(indexLayout)) fail("input_invalid");
  const output = path.resolve(outputDirectory);
  if (output === path.parse(output).root || comparable(await realpath(path.dirname(output))) !== comparable(path.dirname(output))) fail("output_invalid");
  const inputs = [], previousBundles = [];
  for (const directory of previousDirectories) previousBundles.push(await validateMapStaticBundle(directory));
  for (const publication of publications) {
    if (!path.isAbsolute(publication.directory ?? "")) fail("path_not_absolute");
    inputs.push(await readMapPublication(publication));
  }
  for (const directory of [...publications.map(input => input.directory), ...previousDirectories])
    if (within(path.resolve(directory), output) || within(output, path.resolve(directory))) fail("output_overlaps_source");
  const partitioned = indexLayout === "partitioned" || indexLayout !== "flat" &&
    (inputs.some(input => shardedLight(input) || input.family === "cloud") || previousBundles.some(bundle =>
      bundle.schemaVersion === "starward-map-static-export-v2" || bundle.sources.some(source => shardedLight(source) || source.family === "cloud")));
  // Flat output remains for exact legacy recovery; new nationwide families use
  // bounded metadata/route pages by default. No runtime activation occurs here.
  const orderedSource = source => partitioned ? { ...source, metadata: [...source.metadata].sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0) } : source;
  const copied = new Map(), sources = new Map(), records = new Map();
  function addFile(file, input) {
    const previous = copied.get(file);
    if (previous && (previous.bytes !== input.bytes || previous.sha256 !== input.sha256)) fail("history_conflict");
    copied.set(file, input);
  }
  for (const bundle of previousBundles) {
    for (const entry of bundle.sources) {
      const source = orderedSource(entry);
      const id = sourceId(source), previous = sources.get(id);
      if (previous && !same(previous, source)) fail("history_conflict");
      sources.set(id, source);
      for (const entry of source.metadata) addFile(`publications/${id}/${entry.file}`, { ...entry, sourceDirectory: bundle.directory, file: `publications/${id}/${entry.file}` });
    }
    for (const record of bundle.records) {
      const previous = records.get(record.route);
      if (previous && !same(previous, record)) fail("history_conflict");
      records.set(record.route, record);
      addFile(`files${record.route}`, { ...record, sourceDirectory: bundle.directory, file: `files${record.route}` });
      // Each source's domain reader needs its inventory-listed image path.
      for (const source of bundle.sources) if (!shardedLight(source) && source.metadata.some(entry => entry.file === record.route.split("/").at(-1) + ".json"))
        addFile(`publications/${sourceId(source)}/${record.route.split("/").at(-1)}`, copied.get(`files${record.route}`));
    }
  }
  for (const input of inputs) {
    const source = orderedSource({ family: input.family, publicationVersion: input.publicationVersion,
      ...(input.datasetVersion ? { datasetVersion: input.datasetVersion } : {}),
      ...(input.family === "cloud" ? { admission: input.admission, sourceManifestSha256: input.sourceManifestSha256 } :
        shardedLight(input) ? { admission: input.admission } : {}),
      ...(input.displayWindowTargets ? { displayWindowTargets: input.displayWindowTargets } : {}), metadata: input.metadata.map(metadataDescriptor) });
    const id = sourceId(source), prior = sources.get(id);
    if (prior && !same(prior, source)) fail("history_conflict");
    sources.set(id, source);
    for (const entry of input.metadata) addFile(`publications/${id}/${entry.file}`, entry);
    for (const item of input.records) {
      const record = assertMapStaticRecord(publicRecord(item)), previous = records.get(record.route);
      if (previous && !same(previous, record)) fail("history_conflict");
      records.set(record.route, record); addFile(`files${record.route}`, item);
      // Sharded EOG keeps original nested image paths in its sealed controls;
      // those images already appear in metadata for repeatable RGBA validation.
      if (!shardedLight(input)) addFile(`publications/${id}/${record.route.split("/").at(-1)}`, item);
    }
  }
  const content = { sources: [...sources.values()].sort((a, b) => sourceId(a).localeCompare(sourceId(b), "en")), records: sorted([...records.values()]) };
  const flatIndex = assertIndex({ schemaVersion: "starward-map-static-export-v1", publicationHash: skyStaticHash(JSON.stringify(content)), ...content });
  await mkdir(output, { mode: 0o700 });
  const stage = path.join(output, `.preparing-${randomUUID()}`); await mkdir(stage);
  // Only one bounded PNG/proof is held while copying, even when a retained
  // inventory grows. Do not accumulate a publication's images in memory.
  for (const [file, input] of copied) {
    const bytes = input.data ?? (input.readBytes ? await input.readBytes() : await readPlainSkyFile(input.sourceDirectory, input.file));
    if (bytes.length !== input.bytes || skyStaticHash(bytes) !== input.sha256) fail("source_changed");
    const target = path.join(stage, file); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  const index = partitioned ? await partitionMapStaticManifest(flatIndex, async (file, bytes) => {
    const target = path.join(stage, file); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }) : flatIndex;
  await writeFile(path.join(stage, "index.json"), JSON.stringify(index, null, partitioned ? undefined : 2) + "\n", { flag: "wx" });
  await writeFile(path.join(stage, "delivery.caddy"), mapStaticDeliveryFragment(flatIndex.records), { flag: "wx" });
  await validateMapStaticBundle(stage);
  // Inventory-last followed by same-volume rename; failed staging remains for
  // diagnosis. An old completed bundle/current reference is never rewritten.
  const directory = path.join(output, "publication"); await rename(stage, directory);
  return validateMapStaticBundle(directory);
}

/** Discovery is read-only. It returns precisely this sealed source set; the
 * terrain runtime path and separately published night-light DB row still need
 * their existing environment activation owners. No public current pointer is
 * invented and no historical URL is deleted. */
export async function discoverMapStaticBundle({ directory, publicationHash }) {
  const bundle = await validateMapStaticBundle(directory);
  if (bundle.publicationHash !== publicationHash) fail("publication_mismatch");
  return { publicationHash, schemaVersion: bundle.schemaVersion, directory: bundle.directory, files: bundle.files, bytes: bundle.bytes,
    sources: bundle.sources.map(({ metadata: _metadata, ...source }) => ({ ...source,
      metadataDirectory: path.join(bundle.directory, "publications", sourceId(source)) })), runtimeActivated: false };
}

/** Fresh isolated restoration of static delivery only. Scientific numeric TIFFs,
 * the selected runtime DB state and its activation are separate existing owners.
 * Repeated recovery selects a fresh output; it never overwrites a retained URL. */
export async function restoreMapStaticBundle({ bundleDirectory, outputDirectory, publicationHash }) {
  const source = await discoverMapStaticBundle({ directory: bundleDirectory, publicationHash });
  const restored = await prepareMapStaticBundle({ publications: [], previousDirectories: [source.directory], outputDirectory,
    indexLayout: source.schemaVersion === "starward-map-static-export-v1" ? "flat" : "partitioned" });
  if (restored.publicationHash !== publicationHash) fail("restore_identity_mismatch");
  return { ...await discoverMapStaticBundle({ directory: restored.directory, publicationHash }), status: "RESTORED_ISOLATED_MAP_STATIC_BUNDLE",
    scientificNumericDataRestored: false, databaseRestored: false };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const option = key => { const i = process.argv.indexOf(key); return i < 0 ? null : process.argv[i + 1]; };
  try {
    // One existing terrain publication and optional existing published DB-record
    // export. This is selection of owners, never a manual filename manifest.
    const publications = [];
    const displayWindowTargets = process.argv.includes("--display-windows-for-terrain") ?
      JSON.parse((await readPlainSkyFile(option("--terrain"), "inventory.json")).toString("utf8")).targets : undefined;
    if (option("--terrain")) publications.push({ family: "terrain", directory: option("--terrain") });
    if (option("--cloud-display")) {
      const directory = option("--cloud-source"), manifestSha256 = option("--cloud-source-manifest-sha256");
      if (!directory || !path.isAbsolute(directory) || !/^[a-f0-9]{64}$/u.test(manifestSha256 ?? "")) fail("cloud_source_required");
      publications.push({ family: "cloud", directory: option("--cloud-display"), cloudSource: { directory, manifestSha256 } });
    }
    if (option("--night-light")) {
      const recordPath = option("--published-record");
      if (!recordPath || !path.isAbsolute(recordPath)) fail("published_record_required");
      publications.push({ family: "night-light", directory: option("--night-light"),
        publishedRecord: JSON.parse((await readPlainSkyFile(path.dirname(recordPath), path.basename(recordPath))).toString("utf8")),
        ...(displayWindowTargets ? { displayWindowTargets } : {}) });
    }
    if (option("--night-light-sharded")) {
      const sha256 = option("--night-light-index-sha256"), bytes = Number(option("--night-light-index-bytes"));
      if (!/^[a-f0-9]{64}$/u.test(sha256 ?? "") || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > 4 * 1024 * 1024) fail("sharded_root_pin_required");
      publications.push({ family: "night-light", directory: option("--night-light-sharded"), nightLightSharded: { file: "index.json", bytes, sha256 },
        ...(displayWindowTargets ? { displayWindowTargets } : {}) });
    }
    const result = await prepareMapStaticBundle({ publications, outputDirectory: option("--output"),
      previousDirectories: option("--previous") ? [option("--previous")] : [] });
    process.stdout.write(JSON.stringify(await discoverMapStaticBundle({ directory: result.directory, publicationHash: result.publicationHash })) + "\n");
  } catch (error) { process.stderr.write(JSON.stringify({ status: "FAILED", code: error.message?.startsWith("map_static_") ? error.message : "map_static_admission_failed" }) + "\n"); process.exitCode = 1; }
}
