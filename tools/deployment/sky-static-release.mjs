import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeExecutor, runProcess } from "./compose-runtime.mjs";
import { publicIpTlsOptions } from "./operator-preview-tls.mjs";
import { assertSkyStaticContains, assertSkyStaticImageArtifact, mergeSkyStaticBundles, readPlainSkyFile, skyStaticFilePath, skyStaticHash, validateSkyStaticBundle, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { createSkyStaticBackup, readSkyStaticBackup, verifiedBackupSkyRecord } from "./sky-static-backup.mjs";

const fail = (code) => { throw new Error(`sky_static_${code}`); };
const keys = (value, expected) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join("\0") === [...expected].sort().join("\0");
const hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const sourceName = (value) => typeof value === "string" && /^source-[a-f0-9-]{36}$/.test(value);
const generationName = (value) => typeof value === "string" && /^generation-[a-f0-9-]{36}$/.test(value);
const leasedStores = new WeakMap();
const releasePreparations = new WeakMap();
const releaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Move the existing Sky release preflight before its application backup.
 * Empty stores are populated only by the exact candidate OCI producer; the
 * resulting retained union is prepared, never asserted to be old current. */
export async function prepareSkyStaticRelease({ validation, deploy, deployEnvPath, execute = runProcess }) {
  if (!selectedStore(validation, deploy)) return null;
  if (!path.isAbsolute(deployEnvPath ?? "")) fail("release_environment_path_invalid");
  const descriptorSha256 = skyStaticHash(await readFile(deployEnvPath));
  const run = composeExecutor({ composePath: path.join(releaseRoot, "infrastructure/deployment/compose.yml"),
    deployEnvPath, cwd: releaseRoot, execute });
  const steps = [];
  for (const [name, args, step] of [["compose-version", ["version"], "release-compose-version"],
    ["compose-config", ["config", "--quiet"], "release-compose-config"], ["image-pull", ["pull"], "release-image-pull"]]) {
    run({ args, step });
    steps.push(Object.freeze({ name, status: "passed", executionPhase: "BEFORE_VERIFIED_BACKUP" }));
  }
  const delivery = await prepareSkyStaticDelivery({ validation, deploy, execute });
  try {
    if (skyStaticHash(await readFile(deployEnvPath)) !== descriptorSha256) fail("release_preparation_changed");
    releasePreparations.set(delivery, Object.freeze({ deployEnvPath: path.resolve(deployEnvPath),
      revision: validation.revision, imageDigest: validation.imageDigest, descriptorSha256, steps }));
    return delivery;
  } catch (error) {
    await delivery.dispose(); throw error;
  }
}

/** In-process handoff only: revalidate the live original lease, source seals,
 * union, identity and overlay. A JSON assertion cannot skip a real preflight. */
export async function reuseSkyStaticRelease({ validation, deploy, deployEnvPath, delivery }) {
  const directory = selectedStore(validation, deploy), prepared = releasePreparations.get(delivery);
  if (!directory || !prepared || prepared.deployEnvPath !== path.resolve(deployEnvPath) ||
    prepared.revision !== validation.revision || prepared.imageDigest !== validation.imageDigest ||
    leasedStores.get(delivery.dispose) !== directory) fail("release_preparation_invalid");
  if (skyStaticHash(await readFile(deployEnvPath)) !== prepared.descriptorSha256) fail("release_preparation_changed");
  const state = await inventory(directory);
  if (!state) fail("inventory_missing");
  const originalIdentity = assertSkyStaticDeliveryIdentity(delivery.identity, validation);
  const canonical = await deliveryResult({ directory, state, validation, dispose: delivery.dispose });
  if (delivery.directory !== canonical.directory || JSON.stringify(delivery.overlayPaths) !== JSON.stringify(canonical.overlayPaths) ||
    Object.keys(originalIdentity).some(key => originalIdentity[key] !== canonical.identity[key])) fail("release_preparation_changed");
  return Object.freeze({ delivery: canonical, steps: prepared.steps });
}

export function assertSkyStaticDeliveryIdentity(value, { revision, imageDigest } = {}) {
  if (!keys(value, ["schemaVersion", "imagePublicationHash", "deliveryPublicationHash", "revision", "imageDigest", "files", "bytes"]) ||
    value.schemaVersion !== "starward-sky-static-delivery-v1" || !hash(value.imagePublicationHash) || !hash(value.deliveryPublicationHash) ||
    !/^[a-f0-9]{40}$/.test(value.revision) || !/^sha256:[a-f0-9]{64}$/.test(value.imageDigest) ||
    !Number.isSafeInteger(value.files) || value.files < 1 || !Number.isSafeInteger(value.bytes) || value.bytes < 1 ||
    (revision !== undefined && value.revision !== revision) || (imageDigest !== undefined && value.imageDigest !== imageDigest)) fail("delivery_identity_invalid");
  return Object.freeze({ ...value });
}

function selectedStore(validation, deploy) {
  const directory = deploy.STARWARD_SKY_STATIC_DIRECTORY;
  if (directory === undefined || directory === "") return null;
  if (!path.isAbsolute(directory) || /[\0\r\n]/.test(directory) ||
    !validation.operations?.skyStaticDirectory || path.resolve(validation.operations.skyStaticDirectory) !== path.resolve(directory)) fail("store_invalid");
  return path.resolve(directory);
}

async function leaseStore(directory, create) {
  if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) fail("store_invalid");
  const lockPath = path.join(directory, "preparation.lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch (error) { if (error.code === "EEXIST") fail("store_locked_verify_owner_before_unlocking"); throw error; }
  try { await lock.writeFile(JSON.stringify({ schemaVersion: "starward-sky-static-lease-v1", pid: process.pid, startedAt: new Date().toISOString() })); }
  catch (error) { await lock.close(); await unlink(lockPath); throw error; }
  let released = false;
  const dispose = async () => {
    if (released) return;
    released = true;
    leasedStores.delete(dispose);
    try { await lock.close(); } finally { await unlink(lockPath); }
  };
  leasedStores.set(dispose, directory);
  return dispose;
}

/** Capture the retained union, not a guessed production current. Preview
 * reuses its active delivery lease; standalone backup acquires that same lease.
 * No Docker, service restart, publication adoption or pointer mutation. */
export async function captureSkyStaticBackup({ validation, deploy, delivery }) {
  const directory = selectedStore(validation, deploy);
  if (!directory) {
    if (delivery) fail("backup_unconfigured_delivery");
    return null;
  }
  if (delivery && (leasedStores.get(delivery.dispose) !== directory ||
    path.dirname(path.dirname(path.resolve(delivery.directory))) !== directory)) fail("backup_delivery_lease_invalid");
  const dispose = delivery ? null : await leaseStore(directory, false);
  try {
    const state = await inventory(directory);
    if (!state) fail("inventory_missing");
    const pointerBytes = await readPlainSkyFile(directory, "prepared-inventory.json");
    const sourceMetadata = [];
    for (const source of state.pointer.sources) sourceMetadata.push({ directory: source.directory,
      indexBytes: await readPlainSkyFile(directory, `${source.directory}/publication/index.json`),
      fragmentBytes: await readPlainSkyFile(directory, `${source.directory}/publication/delivery.caddy`),
      artifactBytes: await readPlainSkyFile(directory, `${source.directory}/publication/image-artifact.json`) });
    const result = await createSkyStaticBackup({ bundleDirectory: state.bundle.directory, inventoryBytes: pointerBytes,
      backupDirectory: validation.operations.backupDirectory, sourceMetadata });
    for (const source of sourceMetadata) for (const [file, bytes] of [["index.json", source.indexBytes],
      ["delivery.caddy", source.fragmentBytes], ["image-artifact.json", source.artifactBytes]])
      if (!bytes.equals(await readPlainSkyFile(directory, `${source.directory}/publication/${file}`))) fail("backup_source_metadata_changed");
    if (!pointerBytes.equals(await readPlainSkyFile(directory, "prepared-inventory.json"))) fail("backup_inventory_changed");
    return result.record;
  } finally { await dispose?.(); }
}

async function sourceArtifact(directory, revision) {
  const bundle = await validateSkyStaticBundle(directory);
  const artifact = JSON.parse((await readPlainSkyFile(directory, "image-artifact.json")).toString("utf8"));
  assertSkyStaticImageArtifact(artifact, { revision, publicationHash: bundle.publicationHash,
    indexBytes: await readPlainSkyFile(directory, "index.json"), fragmentBytes: await readPlainSkyFile(directory, "delivery.caddy") });
  return bundle;
}

async function inventory(directory) {
  let bytes;
  try { bytes = await readPlainSkyFile(directory, "prepared-inventory.json"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const pointer = JSON.parse(bytes.toString("utf8"));
  if (!keys(pointer, ["schemaVersion", "generation", "publicationHash", "sources"]) ||
    pointer.schemaVersion !== "starward-sky-static-prepared-inventory-v1" || !generationName(pointer.generation) ||
    !hash(pointer.publicationHash) || !Array.isArray(pointer.sources) || !pointer.sources.length) fail("inventory_invalid");
  const bundle = await validateSkyStaticBundle(path.join(directory, pointer.generation, "publication"));
  if (bundle.publicationHash !== pointer.publicationHash) fail("inventory_invalid");
  const identities = new Set(), admittedRoutes = new Set();
  for (const source of pointer.sources) {
    if (!keys(source, ["directory", "revision", "imageDigest", "imagePublicationHash"]) || !sourceName(source.directory) ||
      !/^[a-f0-9]{40}$/.test(source.revision) || !/^sha256:[a-f0-9]{64}$/.test(source.imageDigest) || !hash(source.imagePublicationHash)) fail("inventory_invalid");
    const key = `${source.imageDigest}:${source.revision}`;
    if (identities.has(key)) fail("inventory_invalid");
    identities.add(key);
    const included = await sourceArtifact(path.join(directory, source.directory, "publication"), source.revision);
    if (included.publicationHash !== source.imagePublicationHash) fail("inventory_source_mismatch");
    assertSkyStaticContains(bundle, included);
    for (const record of included.records) admittedRoutes.add(record.route);
  }
  // Membership in a syntactically valid union is not approval. Every route
  // must come from one of the retained, bound image publications.
  if (admittedRoutes.size !== bundle.records.length) fail("inventory_source_mismatch");
  return { pointer, bundle };
}

function inspectImageRevision({ validation, deploy, execute }) {
  if (!deploy.STARWARD_IMAGE_REF?.endsWith(`@${validation.imageDigest}`)) fail("image_reference_invalid");
  const inspected = execute({ command: "docker", args: ["image", "inspect", deploy.STARWARD_IMAGE_REF, "--format", '{{ index .Config.Labels "org.opencontainers.image.revision" }}'], step: "sky-static-image-revision", timeout: 60_000 });
  if (inspected.stdout.toString("utf8").trim() !== validation.revision) fail("image_revision_mismatch");
}

async function extractImageArtifact({ directory, validation, deploy, execute }) {
  inspectImageRevision({ validation, deploy, execute });
  const call = (args, step) => execute({ command: "docker", args, step, timeout: 60_000 });
  const owner = randomUUID(), name = `starward-sky-artifact-${owner}`;
  const target = path.join(directory, `source-${randomUUID()}`);
  await mkdir(target, { mode: 0o700 });
  let createAttempted = false;
  let originalFailure;
  try {
    createAttempted = true;
    call(["create", "--pull", "never", "--name", name, "--label", `starward.sky-artifact-owner=${owner}`, "--entrypoint", "/bin/true", deploy.STARWARD_IMAGE_REF], "sky-static-artifact-container");
    // This container never runs. The only admitted new bytes come from the
    // build-time approved-publication producer in the exact release image.
    call(["cp", `${name}:/app/sky-public/publication`, path.join(target, "publication")], "sky-static-artifact-copy");
    const bundle = await sourceArtifact(path.join(target, "publication"), validation.revision);
    return { source: { directory: path.basename(target), revision: validation.revision,
      imageDigest: validation.imageDigest, imagePublicationHash: bundle.publicationHash }, bundle };
  } catch (cause) {
    originalFailure = cause;
    throw cause;
  } finally {
    if (createAttempted) {
      // A lost CLI result can follow a successful create. Discover only this
      // invocation's exact name+owner label; an empty successful list proves
      // absence, while a daemon/list failure leaves cleanup explicitly unverified.
      let selected;
      try {
        selected = call(["container", "ls", "--all", "--filter", `name=^/${name}$`, "--filter", `label=starward.sky-artifact-owner=${owner}`, "--format", "{{.ID}}"], "sky-static-artifact-container-discovery").stdout.toString("utf8").trim();
        if (selected && !/^[a-f0-9]{12,64}$/.test(selected)) fail("artifact_cleanup_unverified");
        if (selected) call(["rm", selected], "sky-static-artifact-container-cleanup");
      } catch (cause) {
        throw new Error("sky_static_artifact_cleanup_unverified", { cause: new AggregateError([originalFailure, cause].filter(Boolean), "sky_static_artifact_operation_and_cleanup_failed") });
      }
    }
  }
}

async function deliveryResult({ directory, state, validation, dispose, createOverlay = false }) {
  const source = state.pointer.sources.find((entry) => entry.revision === validation.revision && entry.imageDigest === validation.imageDigest);
  if (!source) fail("image_artifact_not_prepared");
  const identity = assertSkyStaticDeliveryIdentity({ schemaVersion: "starward-sky-static-delivery-v1",
    revision: validation.revision, imageDigest: validation.imageDigest, imagePublicationHash: source.imagePublicationHash,
    deliveryPublicationHash: state.bundle.publicationHash, files: state.bundle.files, bytes: state.bundle.bytes }, validation);
  const overlayPath = path.join(directory, state.pointer.generation, "compose.sky-static.yml");
  const text = `services:\n  caddy:\n    volumes:\n      - type: bind\n        source: ${JSON.stringify(state.bundle.directory)}\n        target: /srv/sky-public\n        read_only: true\n        bind:\n          create_host_path: false\n      - type: bind\n        source: ${JSON.stringify(path.join(state.bundle.directory, "delivery.caddy"))}\n        target: /etc/caddy/sky-static-delivery.caddy\n        read_only: true\n        bind:\n          create_host_path: false\n`;
  // The same immutable generation always has the same overlay. Never replace
  // an existing overlay, even on a reused inventory or rollback.
  if (createOverlay) {
    try { await writeFile(overlayPath, text, { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST" || (await readPlainSkyFile(path.dirname(overlayPath), path.basename(overlayPath))).toString("utf8") !== text) throw error; }
  }
  if ((await readPlainSkyFile(path.dirname(overlayPath), path.basename(overlayPath))).toString("utf8") !== text) fail("overlay_readback_failed");
  return Object.freeze({ overlayPaths: [overlayPath], directory: state.bundle.directory, records: state.bundle.records, identity, dispose });
}

async function writePreparedInventory({ directory, state, validation, dispose }) {
  const stage = path.join(directory, `.inventory-${randomUUID()}.tmp`), text = JSON.stringify(state.pointer, null, 2) + "\n";
  await writeFile(stage, text, { flag: "wx", mode: 0o600 });
  if ((await readFile(stage, "utf8")) !== text) fail("inventory_readback_failed");
  // Read back the immutable overlay before publishing the prepared pointer.
  await deliveryResult({ directory, state, validation, dispose, createOverlay: true });
  await rename(stage, path.join(directory, "prepared-inventory.json"));
}

/** Preparation records a retained approved inventory, not a successful release.
 * Its lease lasts through caller convergence/verification/failure cleanup. */
export async function prepareSkyStaticDelivery({ validation, deploy, execute = runProcess }) {
  const directory = selectedStore(validation, deploy);
  if (!directory) return null;
  const dispose = await leaseStore(directory, true);
  try {
    const prior = await inventory(directory);
    const known = prior?.pointer.sources.find((source) => source.revision === validation.revision && source.imageDigest === validation.imageDigest);
    if (known) {
      // Exact OCI identity is immutable. The retained source has already been
      // fully revalidated by inventory(); do not recopy 23MB of identical
      // files or leave an unused source directory on every retry/rollback.
      inspectImageRevision({ validation, deploy, execute });
      return await deliveryResult({ directory, state: prior, validation, dispose });
    }
    const extracted = await extractImageArtifact({ directory, validation, deploy, execute });
    const generation = `generation-${randomUUID()}`;
    const merged = await mergeSkyStaticBundles({ directories: [...(prior ? [prior.bundle.directory] : []), extracted.bundle.directory], outputDirectory: path.join(directory, generation) });
    const pointer = { schemaVersion: "starward-sky-static-prepared-inventory-v1", generation,
      publicationHash: merged.publicationHash, sources: [...(prior?.pointer.sources ?? []), extracted.source] };
    const state = { pointer, bundle: await validateSkyStaticBundle(merged.output) };
    await writePreparedInventory({ directory, state, validation, dispose });
    return await deliveryResult({ directory, state, validation, dispose });
  } catch (error) { await dispose(); throw error; }
}

/** Explicit fresh managed preparation. New snapshots restore recorded source
 * metadata; legacy public-only snapshots still need original cached OCI. No
 * image pull, live mount/current switch, prior receipt or source fabrication. */
export async function restoreManagedSkyStaticBackup({ validation, deploy, record, outputDirectory, confirmPublicationHash, execute = runProcess }) {
  if (confirmPublicationHash !== record?.publicationHash) fail("restore_publication_confirmation_required");
  const directory = path.resolve(outputDirectory ?? ""), backupDirectory = validation.operations.backupDirectory;
  const within = (parent, child) => { const relative = path.relative(parent, child);
    return !relative || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)); };
  if (!path.isAbsolute(outputDirectory ?? "") || directory === path.parse(directory).root ||
      within(backupDirectory, directory) || within(directory, backupDirectory) ||
      (validation.operations.skyStaticDirectory && (within(validation.operations.skyStaticDirectory, directory) || within(directory, validation.operations.skyStaticDirectory))))
    fail("restore_directory_invalid");
  const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
  if (comparable(await realpath(path.dirname(directory))) !== comparable(path.dirname(directory))) fail("restore_directory_invalid");
  const snapshot = await readSkyStaticBackup({ backupDirectory, record });
  const archivedRoutes = new Set(snapshot.bundle.records.map(entry => entry.route));
  if (!snapshot.sourceMetadata && !/^[a-z0-9.-]+(?::[0-9]+)?(?:\/[a-z0-9._-]+)+$/.test(validation.imageRepository ?? "")) fail("restore_image_repository_invalid");
  // Nonrecursive exclusive creation: preserve every existing directory/file.
  try { await mkdir(directory, { mode: 0o700 }); }
  catch (error) { if (error.code === "EEXIST") fail("restore_directory_exists"); throw error; }
  const dispose = await leaseStore(directory, false);
  try {
    const sources = [], directories = []; let selectedValidation;
    for (let i = 0; i < snapshot.inventory.sources.length; i++) {
      const original = snapshot.inventory.sources[i];
      selectedValidation = { ...validation, revision: original.revision, imageDigest: original.imageDigest };
      let extracted;
      if (snapshot.sourceMetadata) {
        const metadata = snapshot.sourceMetadata[i], name = `source-${randomUUID()}`;
        const written = await writeSkyStaticBundle(path.join(directory, name), (async function* () {
          for (const entry of metadata.index.records) yield { route: entry.route, headers: entry.headers,
            bytes: await readPlainSkyFile(snapshot.bundle.directory, skyStaticFilePath(entry.route, archivedRoutes)) };
        })(), { indexBytes: metadata.indexBytes, fragmentBytes: metadata.fragmentBytes });
        await writeFile(path.join(written.output, "image-artifact.json"), metadata.artifactBytes, { flag: "wx", mode: 0o600 });
        extracted = { source: { ...original, directory: name }, bundle: await sourceArtifact(written.output, original.revision) };
      } else {
        const sourceDeploy = { ...deploy, STARWARD_IMAGE_REF: `${validation.imageRepository}@${original.imageDigest}` };
        extracted = await extractImageArtifact({ directory, validation: selectedValidation, deploy: sourceDeploy, execute });
      }
      if (extracted.source.imagePublicationHash !== original.imagePublicationHash) fail("restore_original_source_mismatch");
      assertSkyStaticContains(snapshot.bundle, extracted.bundle);
      sources.push(extracted.source); directories.push(extracted.bundle.directory);
    }
    const generation = `generation-${randomUUID()}`;
    const merged = await mergeSkyStaticBundles({ directories, outputDirectory: path.join(directory, generation) });
    const bundle = await validateSkyStaticBundle(merged.output);
    if (bundle.publicationHash !== record.publicationHash || bundle.files !== record.files || bundle.bytes !== record.bytes) fail("restore_publication_mismatch");
    assertSkyStaticContains(bundle, snapshot.bundle); assertSkyStaticContains(snapshot.bundle, bundle);
    // Backup metadata/data may not drift while original sources are resolved.
    await readSkyStaticBackup({ backupDirectory, record });
    const state = { pointer: { schemaVersion: "starward-sky-static-prepared-inventory-v1", generation,
      publicationHash: bundle.publicationHash, sources }, bundle };
    await writePreparedInventory({ directory, state, validation: selectedValidation, dispose });
    const current = await inventory(directory);
    const delivery = await deliveryResult({ directory, state: current, validation: selectedValidation, dispose });
    return Object.freeze({ status: "RESTORED_MANAGED_PREPARED_STORE", storeDirectory: directory, directory: delivery.directory,
      generation, publicationHash: bundle.publicationHash, sources: sources.length, files: bundle.files, bytes: bundle.bytes,
      overlayPaths: delivery.overlayPaths, sourceAdmission: snapshot.sourceMetadata ? "VERIFIED_BACKUP_RESTORED_ORIGINAL_METADATA" : "ORIGINAL_CACHED_OCI_REVALIDATED", runtimeApplied: false });
  } finally { await dispose(); }
}

/** Non-deploy preview operations resolve the last successful current receipt,
 * never a newer prepared generation. Check requires a live matching mount;
 * stopped-edge maintenance retains a recorded selection without claiming live
 * service. No pull, extraction, pointer publication or service mutation. */
export async function loadSkyStaticDelivery({ validation, deploy, operation = "check", execute = runProcess }) {
  const directory = selectedStore(validation, deploy);
  if (!directory) return null;
  const dispose = await leaseStore(directory, false);
  try {
    const state = await inventory(directory);
    if (!state) fail("inventory_missing");
    if (!["check", "stop", "backup", "inspect-backups", "maintain-backups"].includes(operation)) fail("load_operation_invalid");
    const pointerBytes = await readPlainSkyFile(directory, "prepared-inventory.json");
    const roots = (await readdir(directory)).filter(generationName);
    const receipts = await inspectSkyReceiptReferences({ directory, state, validation, roots, currentOnly: true });
    const selected = receipts.currentDelivery;
    if (!selected) fail("load_current_binding_missing");
    assertSkyStaticDeliveryIdentity(selected.identity, validation);
    const runtime = await inspectRunningSkyMount({ directory, state, deploy, execute });
    const generation = receipts.report.currentPointer.generation;
    if (runtime.status === "OBSERVED_RUNNING_MOUNT") {
      if (runtime.generation !== generation || runtime.publicationHash !== selected.identity.deliveryPublicationHash)
        fail("load_current_runtime_mismatch");
    } else if (runtime.status !== "NO_RUNNING_CADDY_OBSERVED" || operation === "check") fail("load_runtime_not_observed");
    if (!pointerBytes.equals(await readPlainSkyFile(directory, "prepared-inventory.json")) ||
      JSON.stringify(runtime) !== JSON.stringify(await inspectRunningSkyMount({ directory, state, deploy, execute })))
      fail("load_changed_during_inspection");
    await receipts.verifyUnchanged();
    return Object.freeze({ ...selected, dispose, observation: {
      basis: runtime.status === "OBSERVED_RUNNING_MOUNT" ? "CURRENT_RECEIPT_AND_RUNNING_MOUNT" : "CURRENT_RECEIPT_WITHOUT_RUNNING_CADDY",
      currentPointer: receipts.report.currentPointer, runtime,
      preparedGenerationMatches: generation === state.pointer.generation,
      meaning: "Selection at load time under the managed lease, not historical acceptance, reference completeness or a database/Sky backup claim." } });
  } catch (error) { await dispose(); throw error; }
}

/** Retention dry-run only. The existing operation lease prevents concurrent
 * preparation; no publication, pointer, stage or unknown file is removed.
 * Explicit references are operator observations, not proof of a complete
 * running/release/rollback/backup inventory. Absence never authorizes deletion. */
export async function inspectSkyStaticRetention({ validation, deploy, references = [], observeRuntime = false, observeReceipts = false, observeBackups = false, execute = runProcess }) {
  const directory = selectedStore(validation, deploy);
  if (!directory) return null;
  const kinds = new Set(["RUNNING", "RELEASE", "ROLLBACK", "BACKUP"]);
  if (!Array.isArray(references) || references.some((ref) => !keys(ref, ["kind", "directory"]) ||
    !kinds.has(ref.kind) || (!generationName(ref.directory) && !sourceName(ref.directory)))) fail("retention_reference_invalid");
  if (typeof observeRuntime !== "boolean" || typeof observeReceipts !== "boolean" || typeof observeBackups !== "boolean") fail("retention_runtime_option_invalid");
  const dispose = await leaseStore(directory, false);
  try {
    const comparable = (value) => process.platform === "win32" ? value.toLowerCase() : value;
    if (comparable(await realpath(directory)) !== comparable(directory)) fail("store_invalid");
    const snapshot = async () => {
      const files = [], directories = [];
      async function walk(relative) {
        for (const name of (await readdir(path.join(directory, relative))).sort()) {
          const child = relative ? `${relative}/${name}` : name;
          if (child === "preparation.lock") continue; // This invocation's live lease, not retained disk.
          const info = await lstat(path.join(directory, child));
          if (info.isSymbolicLink()) fail("retention_file_type_invalid");
          if (info.isDirectory()) { directories.push(child); await walk(child); }
          else if (info.isFile() && Number.isSafeInteger(info.size)) files.push({ path: child, bytes: info.size,
            device: info.dev, inode: info.ino, modified: info.mtimeMs, changed: info.ctimeMs });
          else fail("retention_file_type_invalid");
        }
      }
      await walk("");
      return { files, directories };
    };
    const before = await snapshot();
    const state = await inventory(directory); // Reuse exact source seals, union admission and old-URL checks.
    const runtime = observeRuntime ? await inspectRunningSkyMount({ directory, state, deploy, execute }) : null;
    const receipts = observeReceipts ? await inspectSkyReceiptReferences({ directory, state, validation, roots: before.directories.filter(generationName) }) : null;
    const pointerBytes = state ? await readPlainSkyFile(directory, "prepared-inventory.json") : null;
    const roots = [...new Set([...before.files.map(file => file.path.split("/")[0]),
      ...before.directories.map(name => name.split("/")[0])])].sort();
    const backups = observeBackups ? await inspectSkyBackupReferences({ directory, state, validation, deploy, roots }) : null;
    for (const ref of references) if (!before.directories.includes(ref.directory)) fail("retention_reference_missing");
    const retainedSources = new Map((state?.pointer.sources ?? []).map(source => [source.directory, source]));
    const entries = roots.map(name => {
      const selected = before.files.filter(file => file.path === name || file.path.startsWith(name + "/"));
      const refs = [...new Set(references.filter(ref => ref.directory === name).map(ref => ref.kind))].sort();
      const reasons = [];
      if (name === state?.pointer.generation) reasons.push("CURRENT_PREPARED_GENERATION");
      if (retainedSources.has(name)) reasons.push("CURRENT_INVENTORY_SOURCE");
      if (name === "prepared-inventory.json") reasons.push("CURRENT_INVENTORY_POINTER");
      if (name === runtime?.generation) reasons.push("OBSERVED_RUNNING_MOUNT");
      if (receipts) reasons.push(...new Set(receipts.references.filter(ref => ref.directory === name).map(ref => `BOUND_${ref.kind}_REFERENCE`)));
      if (backups?.references.some(ref => ref.directory === name)) reasons.push("BOUND_BACKUP_REFERENCE");
      reasons.push(...refs.map(kind => `DECLARED_${kind}_REFERENCE`));
      const kind = generationName(name) ? "GENERATION" : sourceName(name) ? "SOURCE" :
        /^\.inventory-[a-f0-9-]{36}\.tmp$/.test(name) ? "POINTER_STAGE" : "UNCLASSIFIED";
      return { name, kind, files: selected.length, logicalBytes: selected.reduce((sum, file) => sum + file.bytes, 0),
        stages: before.directories.filter(child => child.startsWith(name + "/") &&
          /^\.building-[a-f0-9-]{36}$/.test(child.split("/").at(-1))),
        disposition: reasons.length ? "RETAIN" : "RETAIN_PENDING_REFERENCE_REVIEW", reasons,
        ...(retainedSources.has(name) ? { image: retainedSources.get(name) } : {}) };
    });
    if (JSON.stringify(before) !== JSON.stringify(await snapshot()) || (pointerBytes &&
      !pointerBytes.equals(await readPlainSkyFile(directory, "prepared-inventory.json")))) fail("retention_changed_during_inspection");
    if (runtime && JSON.stringify(runtime) !== JSON.stringify(await inspectRunningSkyMount({ directory, state, deploy, execute })))
      fail("retention_runtime_changed_during_inspection");
    await receipts?.verifyUnchanged();
    await backups?.verifyUnchanged();
    return Object.freeze({ schemaVersion: "starward-sky-static-retention-review-v1", directory, mode: "DRY_RUN",
      inventory: state ? { generation: state.pointer.generation, publicationHash: state.bundle.publicationHash,
        sources: state.pointer.sources.length, publishedFiles: state.bundle.files, publishedPayloadBytes: state.bundle.bytes,
        pointerSha256: skyStaticHash(pointerBytes) } : null,
      entries, files: before.files.length, logicalBytes: before.files.reduce((sum, file) => sum + file.bytes, 0),
      physicalAllocatedBytes: null, deletableBytes: null, referenceCompleteness: "UNVERIFIED", leaseExcluded: true,
      ...(observeRuntime ? { runtime } : {}),
      ...(observeReceipts ? { receiptEvidence: receipts.report,
        runtimeMatchesCurrentPointer: runtime?.generation && receipts.report.currentPointer?.generation
          ? runtime.generation === receipts.report.currentPointer.generation : null } : {}),
      ...(observeBackups ? { backupEvidence: backups.report } : {}),
      meaning: "Logical file lengths include duplicated source/generation payloads, metadata and failed stages; they are not unique payload or allocated disk. Current inventory/source URLs and declared references stay retained. Other generations/stages need actual mount, release, rollback, backup and compatibility review; age or an absent reference is not deletion approval. External images, logs, database, backups and remaining host capacity are outside this store." });
  } finally { await dispose(); }
}

/** Local verified backup references only. Public snapshot integrity is checked;
 * DB-only v1, other lanes and missing store references stay explicit. Neither
 * this selected directory nor its DB expiry proves full Sky retention. */
async function inspectSkyBackupReferences({ directory, state, validation, deploy, roots }) {
  const backupDirectory = validation.operations?.backupDirectory;
  if (!path.isAbsolute(backupDirectory ?? "") || !["staging", "production"].includes(validation.environment) ||
    !deploy.COMPOSE_PROJECT_NAME || !Number.isSafeInteger(validation.operations.maxBackupBytes)) fail("retention_backup_source_invalid");
  const within = value => !value || (value !== ".." && !value.startsWith(`..${path.sep}`) && !path.isAbsolute(value));
  if (within(path.relative(directory, backupDirectory)) || within(path.relative(backupDirectory, directory))) fail("retention_backup_source_invalid");
  const names = async () => {
    try { return (await readdir(backupDirectory)).filter(name => name.endsWith(".pgdump.enc.manifest.json")).sort(); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  };
  const selected = await names();
  if (selected === null) return { references: [], report: { status: "NO_LOCAL_BACKUP_DIRECTORY_OBSERVED", records: [], referenceCompleteness: "UNVERIFIED" },
    async verifyUnchanged() { if (await names() !== null) fail("retention_backups_changed_during_inspection"); } };
  const raw = new Map(), encrypted = new Map(), snapshots = new Map(), records = [], references = [];
  const verifyEncrypted = async (file, manifest) => {
    const name = manifest.encrypted?.fileName;
    if (typeof name !== "string" || path.basename(name) !== name || file !== `${name}.manifest.json` ||
      !hash(manifest.encrypted?.sha256) || !Number.isSafeInteger(manifest.encrypted.byteLength) || manifest.encrypted.byteLength < 1 ||
      manifest.encrypted.byteLength > validation.operations.maxBackupBytes + 4096) fail("retention_backup_encrypted_invalid");
    const info = await lstat(path.join(backupDirectory, name));
    if (!info.isFile() || info.isSymbolicLink() || info.size !== manifest.encrypted.byteLength) fail("retention_backup_encrypted_invalid");
    if (skyStaticHash(await readPlainSkyFile(backupDirectory, name)) !== manifest.encrypted.sha256) fail("retention_backup_encrypted_invalid");
    encrypted.set(file, manifest);
  };
  for (const file of selected) {
    const bytes = await readPlainSkyFile(backupDirectory, file); raw.set(file, bytes);
    let manifest;
    try { manifest = JSON.parse(bytes.toString("utf8")); } catch { fail("retention_backup_manifest_invalid"); }
    const record = { file, sha256: skyStaticHash(bytes), schemaVersion: manifest.schemaVersion, binding: "UNSUPPORTED_BACKUP_SCHEMA" };
    if (manifest.environment !== validation.environment || manifest.composeProject !== deploy.COMPOSE_PROJECT_NAME) {
      record.binding = "OTHER_ENVIRONMENT_OR_PROJECT"; records.push(record); continue;
    }
    if (!["starward-verified-backup-v1", "starward-verified-backup-v2"].includes(manifest.schemaVersion)) { records.push(record); continue; }
    if (manifest.status !== "verified" || manifest.restore?.status !== "restored_and_verified" || manifest.restore?.temporaryDatabaseDropped !== true ||
      !/^[a-f0-9]{40}$/.test(manifest.releaseRevision ?? "") || !/^sha256:[a-f0-9]{64}$/.test(manifest.releaseImageDigest ?? "") ||
      !Number.isFinite(Date.parse(manifest.createdAt)) || !Number.isFinite(Date.parse(manifest.verifiedAt))) fail("retention_backup_manifest_invalid");
    await verifyEncrypted(file, manifest);
    const component = verifiedBackupSkyRecord(manifest);
    record.binding = "LEGACY_DB_ONLY_WITHOUT_SKY_BINDING";
    if (component) {
      const key = skyStaticHash(JSON.stringify(component));
      if (!snapshots.has(key)) snapshots.set(key, await readSkyStaticBackup({ backupDirectory, record: component }));
      const snapshot = snapshots.get(key), generations = [], sources = [];
      for (const generation of roots.filter(generationName)) {
        let index;
        try { index = JSON.parse((await readPlainSkyFile(directory, `${generation}/publication/index.json`)).toString("utf8")); }
        catch (error) { if (error.code === "ENOENT" || error instanceof SyntaxError) continue; throw error; }
        if (index.publicationHash !== component.publicationHash) continue;
        const bundle = await validateSkyStaticBundle(path.join(directory, generation, "publication"));
        assertSkyStaticContains(snapshot.bundle, bundle); assertSkyStaticContains(bundle, snapshot.bundle);
        generations.push(generation);
      }
      for (const image of snapshot.inventory.sources) {
        const source = state?.pointer.sources.find(entry => entry.revision === image.revision && entry.imageDigest === image.imageDigest &&
          entry.imagePublicationHash === image.imagePublicationHash);
        if (source) sources.push(source.directory);
      }
      record.binding = generations.length && sources.length === snapshot.inventory.sources.length
        ? "BOUND_RECORDED_BACKUP_REFERENCE" : "VALID_SNAPSHOT_WITH_MISSING_STORE_REFERENCES";
      Object.assign(record, { publicationHash: component.publicationHash, files: component.files, bytes: component.bytes,
        generations, sources, missingSourceReferences: snapshot.inventory.sources.length - sources.length });
      for (const name of [...generations, ...sources]) references.push({ directory: name });
    }
    records.push(record);
  }
  return { references, report: { status: "SELECTED_LOCAL_BACKUPS_OBSERVED", records, referenceCompleteness: "UNVERIFIED",
    meaning: "Only manifests in the configured local backup directory. Snapshots preserve public URL bytes and headers, not deployment/current, off-host backup or supported-client completeness. DB expiry does not delete Sky snapshots." },
    async verifyUnchanged() {
      if (JSON.stringify(selected) !== JSON.stringify(await names())) fail("retention_backups_changed_during_inspection");
      for (const [file, bytes] of raw) if (!bytes.equals(await readPlainSkyFile(backupDirectory, file))) fail("retention_backups_changed_during_inspection");
      for (const [file, manifest] of encrypted) await verifyEncrypted(file, manifest);
      for (const snapshot of snapshots.values()) await readSkyStaticBackup({ backupDirectory, record: snapshot.record });
    } };
}

/** Bind existing receipt bytes, not new release/backup qualification. Legacy
 * and incomplete records remain explicit; all absent references still retain.
 * Private env paths, operator names, domains and receipt bodies stay private. */
async function inspectSkyReceiptReferences({ directory, state, validation, roots, currentOnly = false }) {
  const receiptDirectory = validation.operations?.receiptDirectory;
  if (typeof receiptDirectory !== "string" || !path.isAbsolute(receiptDirectory) ||
    !["staging", "production"].includes(validation.environment)) fail("retention_receipt_source_invalid");
  const relative = path.relative(directory, receiptDirectory), reverse = path.relative(receiptDirectory, directory);
  const within = value => !value || (value !== ".." && !value.startsWith(`..${path.sep}`) && !path.isAbsolute(value));
  if (within(relative) || within(reverse)) fail("retention_receipt_source_invalid");
  const selectedNames = async () => {
    const names = (await readdir(receiptDirectory)).filter(name =>
    name === "operator-preview-current.json" || /^operator-preview-[a-f0-9-]{36}\.json$/.test(name) ||
    /^(?:staging|production)-[a-zA-Z0-9-]+\.release\.json$/.test(name)).sort();
    if (!currentOnly) return names;
    if (!names.includes("operator-preview-current.json")) fail("load_current_pointer_missing");
    let pointer;
    try { pointer = JSON.parse((await readPlainSkyFile(receiptDirectory, "operator-preview-current.json")).toString("utf8")); }
    catch (error) { if (error instanceof SyntaxError) fail("retention_current_pointer_invalid"); throw error; }
    if (typeof pointer?.receiptPath !== "string" || !path.isAbsolute(pointer.receiptPath) ||
      path.resolve(path.dirname(pointer.receiptPath)) !== path.resolve(receiptDirectory) ||
      !names.includes(path.basename(pointer.receiptPath)) || path.basename(pointer.receiptPath) === "operator-preview-current.json")
      fail("retention_current_pointer_invalid");
    return ["operator-preview-current.json", path.basename(pointer.receiptPath)].sort();
  };
  const names = await selectedNames(), raw = new Map(), records = [], references = [];
  for (const name of names) raw.set(name, await readPlainSkyFile(receiptDirectory, name));
  const decoded = name => { try { return JSON.parse(raw.get(name).toString("utf8")); } catch { fail("retention_receipt_invalid"); } };
  const generations = new Map();
  for (const name of roots) {
    let index;
    try { index = JSON.parse((await readPlainSkyFile(directory, `${name}/publication/index.json`)).toString("utf8")); }
    catch (error) { if (error.code === "ENOENT" || error instanceof SyntaxError) continue; throw error; }
    if (hash(index?.publicationHash)) generations.set(name, index.publicationHash);
  }
  const bound = new Map(), bundleCache = new Map();
  for (const file of names.filter(name => name !== "operator-preview-current.json")) {
    const receipt = decoded(file), schema = receipt?.schemaVersion;
    const preview = schema === "starward-operator-preview-operation-v2" || schema === "starward-operator-preview-operation-v1";
    const release = schema === "starward-release-receipt-v2" || schema === "starward-release-receipt-v1";
    if ((!preview && !release) || receipt.environment !== validation.environment ||
      (preview && !/^operator-preview-/.test(file)) || (release && !file.startsWith(`${receipt.environment}-`)) ||
      (preview && (receipt.environment !== "staging" || receipt.productionQualified !== false)) ||
      (preview && !["deploy", "check", "stop", "backup", "inspect-backups", "maintain-backups"].includes(receipt.operation)) ||
      !["succeeded", "failed", "running"].includes(receipt.status) || !/^[a-f0-9]{40}$/.test(receipt.revision ?? "") ||
      !/^sha256:[a-f0-9]{64}$/.test(receipt.imageDigest ?? "")) fail("retention_receipt_invalid");
    if (schema.endsWith("-v2") && (!Object.hasOwn(receipt, "skyStaticDelivery") ||
      (receipt.status === "succeeded" && receipt.skyStaticDelivery == null))) fail("retention_receipt_delivery_missing");
    const record = { file, sha256: skyStaticHash(raw.get(file)), schemaVersion: schema, status: receipt.status,
      revision: receipt.revision, imageDigest: receipt.imageDigest,
      binding: schema.endsWith("-v1") ? "LEGACY_WITHOUT_SKY_BINDING" : "NO_SKY_DELIVERY_BINDING" };
    if (schema.endsWith("-v2") && receipt.skyStaticDelivery != null) {
      const identity = assertSkyStaticDeliveryIdentity(receipt.skyStaticDelivery, receipt);
      if (receipt.status === "succeeded") {
        if (!Array.isArray(receipt.steps) || new Set(receipt.steps.map(s => s?.name)).size !== receipt.steps.length)
          fail("retention_receipt_steps_invalid");
        const steps = new Map(receipt.steps.map(s => [s?.name, s]));
        for (const name of release || receipt.operation === "deploy" ?
          ["sky-static-preparation", "sky-static-compose-config", "sky-static-verification"] :
          receipt.operation === "check" ? ["sky-static-load", "sky-static-verification"] : ["sky-static-load"])
          if (steps.get(name)?.status !== "passed") fail("retention_receipt_steps_invalid");
        if (release || ["deploy", "check"].includes(receipt.operation)) {
          const checked = steps.get("sky-static-verification").result;
          const checkedIdentity = assertSkyStaticDeliveryIdentity(checked?.identity, receipt);
          if (checked.status !== "passed" || checked.checkedFiles !== identity.files || checked.checkedBytes !== identity.bytes ||
            Object.keys(identity).some(key => checkedIdentity[key] !== identity[key]) ||
            (preview && checked.unauthorizedStatus !== 404)) fail("retention_receipt_verification_invalid");
        }
      }
      const source = state?.pointer.sources.find(s => s.revision === identity.revision && s.imageDigest === identity.imageDigest &&
        s.imagePublicationHash === identity.imagePublicationHash);
      if (!source) fail("retention_receipt_source_missing");
      const sourceBundle = await sourceArtifact(path.join(directory, source.directory, "publication"), source.revision);
      const matched = [];
      for (const [generation, publicationHash] of generations) {
        if (publicationHash !== identity.deliveryPublicationHash) continue;
        if (!bundleCache.has(generation)) bundleCache.set(generation, await validateSkyStaticBundle(path.join(directory, generation, "publication")));
        const bundle = bundleCache.get(generation);
        if (bundle.files !== identity.files || bundle.bytes !== identity.bytes) fail("retention_receipt_delivery_mismatch");
        assertSkyStaticContains(state.bundle, bundle); assertSkyStaticContains(bundle, sourceBundle);
        matched.push(generation);
      }
      if (!matched.length) fail("retention_receipt_generation_missing");
      record.binding = receipt.status === "succeeded" ? "BOUND_RECORDED_REFERENCE" : "BOUND_UNSUCCESSFUL_REFERENCE";
      record.source = source.directory; record.generations = matched;
      const kind = release ? "RELEASE_RECEIPT" : "OPERATION_RECEIPT";
      for (const item of [source.directory, ...matched]) references.push({ kind, directory: item });
      bound.set(file, { receipt, identity, record });
    }
    records.push(record);
  }
  let currentPointer = null, currentDelivery = null;
  if (raw.has("operator-preview-current.json")) {
    const pointer = decoded("operator-preview-current.json");
    if (typeof pointer?.receiptPath !== "string" || !path.isAbsolute(pointer.receiptPath) ||
      path.resolve(path.dirname(pointer.receiptPath)) !== path.resolve(receiptDirectory)) fail("retention_current_pointer_invalid");
    const file = path.basename(pointer.receiptPath), record = records.find(r => r.file === file);
    const receipt = record && decoded(file);
    if (!receipt || !receipt.schemaVersion.startsWith("starward-operator-preview-operation-") || receipt.status !== "succeeded" ||
      receipt.operation !== "deploy" || pointer.revision !== receipt.revision || pointer.imageDigest !== receipt.imageDigest)
      fail("retention_current_pointer_invalid");
    currentPointer = { file: "operator-preview-current.json", sha256: skyStaticHash(raw.get("operator-preview-current.json")),
      receiptFile: file, binding: "LEGACY_WITHOUT_SKY_BINDING", generation: null };
    if (pointer.skyStaticDelivery != null || receipt.skyStaticDelivery != null) {
      const selected = bound.get(file), identity = assertSkyStaticDeliveryIdentity(pointer.skyStaticDelivery, receipt);
      if (!selected || Object.keys(identity).some(key => identity[key] !== selected.identity[key]) ||
        !Array.isArray(pointer.skyStaticOverlayPaths) || pointer.skyStaticOverlayPaths.length !== 1 ||
        typeof pointer.skyStaticOverlayPaths[0] !== "string" || !path.isAbsolute(pointer.skyStaticOverlayPaths[0])) fail("retention_current_pointer_invalid");
      const overlay = path.resolve(pointer.skyStaticOverlayPaths[0]), generation = path.basename(path.dirname(overlay));
      if (path.dirname(path.dirname(overlay)) !== directory || path.basename(overlay) !== "compose.sky-static.yml" ||
        !selected.record.generations.includes(generation)) fail("retention_current_pointer_invalid");
      // Reuse exact overlay text/identity readback; no creation or publishing.
      const delivery = await deliveryResult({ directory, state: { pointer: { ...state.pointer, generation }, bundle: bundleCache.get(generation) },
        validation: receipt, dispose: async () => {} });
      if (Object.keys(identity).some(key => delivery.identity[key] !== identity[key])) fail("retention_current_pointer_invalid");
      currentDelivery = delivery;
      currentPointer.binding = "BOUND_RECORDED_REFERENCE"; currentPointer.generation = generation;
      references.push({ kind: "CURRENT_POINTER", directory: generation });
    }
  }
  return {
    references, currentDelivery,
    report: { records, currentPointer, referenceCompleteness: "UNVERIFIED",
      meaning: "Stable plain receipt files bound to admitted immutable sources/generations are recorded references, not live mounts or independent proof of prior delivery. Legacy/no-binding/unsuccessful records remain explicit. Historical releases retain possible rollback resources; no separate rollback or Sky-backup receipt contract is inferred from database backup v1." },
    async verifyUnchanged() {
      if (JSON.stringify(names) !== JSON.stringify(await selectedNames())) fail("retention_receipts_changed_during_inspection");
      for (const [file, bytes] of raw) if (!bytes.equals(await readPlainSkyFile(receiptDirectory, file))) fail("retention_receipts_changed_during_inspection");
    },
  };
}

/** Docker observations only, scoped to one validated Compose project's live
 * Caddy. A newer prepared pointer is never substituted for the actual mount.
 * No config/env inspection, service mutation or receipt/backup completeness. */
async function inspectRunningSkyMount({ directory, state, deploy, execute }) {
  const project = deploy.COMPOSE_PROJECT_NAME;
  if (typeof project !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(project)) fail("retention_runtime_project_invalid");
  const call = (args, step) => execute({ command: "docker", args, step, timeout: 15_000, maxBuffer: 64 * 1024 });
  const output = call(["container", "ls", "--filter", `label=com.docker.compose.project=${project}`,
    "--filter", "label=com.docker.compose.service=caddy", "--format", "{{.ID}}"], "sky-static-retention-runtime-discovery").stdout.toString("utf8").trim();
  const ids = output ? output.split(/\s+/) : [];
  if (ids.length > 1 || ids.some(id => !/^[a-f0-9]{12,64}$/.test(id))) fail("retention_runtime_container_ambiguous");
  if (!ids.length) return { status: "NO_RUNNING_CADDY_OBSERVED", generation: null, referenceCompleteness: "UNVERIFIED" };
  let value;
  try {
    const format = '{"id":{{json .Id}},"running":{{json .State.Running}},"mounts":{{json .Mounts}}}';
    value = JSON.parse(call(["container", "inspect", ids[0], "--format", format], "sky-static-retention-runtime-mounts").stdout.toString("utf8"));
  } catch { fail("retention_runtime_inspection_invalid"); }
  if (!keys(value, ["id", "running", "mounts"]) || !/^[a-f0-9]{64}$/.test(value.id) ||
    !value.id.startsWith(ids[0]) || value.running !== true || !Array.isArray(value.mounts)) fail("retention_runtime_inspection_invalid");
  const publicMounts = value.mounts.filter(m => m?.Destination === "/srv/sky-public");
  const fragments = value.mounts.filter(m => m?.Destination === "/etc/caddy/sky-static-delivery.caddy");
  if (!publicMounts.length) return { status: "STATIC_PUBLICATION_NOT_MOUNTED", containerId: value.id, generation: null,
    referenceCompleteness: "UNVERIFIED" };
  if (publicMounts.length !== 1 || fragments.length !== 1) fail("retention_runtime_mount_invalid");
  const [mount] = publicMounts, [fragment] = fragments;
  for (const m of [mount, fragment]) if (m.Type !== "bind" || m.RW !== false ||
    typeof m.Source !== "string" || !path.isAbsolute(m.Source) || /[\0\r\n]/.test(m.Source)) fail("retention_runtime_mount_invalid");
  const publication = path.resolve(mount.Source), generation = path.basename(path.dirname(publication));
  if (!generationName(generation) || path.basename(publication) !== "publication" ||
    path.dirname(path.dirname(publication)) !== directory || path.resolve(fragment.Source) !== path.join(publication, "delivery.caddy"))
    fail("retention_runtime_mount_outside_store");
  // The same plain-file owner rejects linked parents/foreign source routes.
  const bundle = await validateSkyStaticBundle(publication);
  if (!state) fail("retention_runtime_inventory_missing");
  assertSkyStaticContains(state.bundle, bundle);
  return { status: "OBSERVED_RUNNING_MOUNT", containerId: value.id, generation, publicationHash: bundle.publicationHash,
    preparedGenerationMatches: generation === state.pointer.generation, readOnly: true, referenceCompleteness: "UNVERIFIED" };
}

function requestBytes(url, { headers, method, maximumBytes, preview }) {
  return new Promise((resolve, reject) => {
    const options = preview ? publicIpTlsOptions(url.hostname) : {};
    let deadline;
    const rejectRequest = (error) => { clearTimeout(deadline); reject(error); };
    const request = https.request(url, { ...options, headers, method, timeout: 15_000 }, (response) => {
      const chunks = []; let count = 0;
      response.on("data", (chunk) => {
        count += chunk.length;
        if (count > maximumBytes) { request.destroy(new Error("sky_static_http_body_too_large")); return; }
        chunks.push(chunk);
      });
      response.on("error", rejectRequest);
      response.on("end", () => {
        clearTimeout(deadline);
        resolve({ status: response.statusCode, headers: new Headers(response.headers), bytes: Buffer.concat(chunks) });
      });
    });
    // The socket timeout only limits inactivity. Bound the entire connection
    // and body too, including peers that keep sending small periodic chunks.
    deadline = setTimeout(() => request.destroy(new Error("sky_static_http_timeout")), 15_000);
    request.on("timeout", () => request.destroy(new Error("sky_static_http_timeout")));
    request.on("error", rejectRequest);
    request.end();
  });
}

/** Exact byte/header verification and a delivery-only marker prevent identical
 * API fallback bytes from being mistaken for proven static service. */
export async function verifySkyStaticDelivery({ delivery, validation, deploy, fetchImpl }) {
  if (!delivery) return null;
  const identity = assertSkyStaticDeliveryIdentity(delivery.identity, validation);
  const bundle = await validateSkyStaticBundle(delivery.directory);
  if (bundle.publicationHash !== identity.deliveryPublicationHash || bundle.files !== identity.files || bundle.bytes !== identity.bytes) fail("delivery_changed");
  const preview = Boolean(deploy.STARWARD_OPERATOR_PREVIEW_TOKEN);
  const base = `https://${validation.domain}`;
  const request = async (route, { authorized = true, method = "GET", maximumBytes } = {}) => {
    const headers = { "Accept-Encoding": "identity", ...(preview && authorized ? { "X-Starward-Operator-Preview": deploy.STARWARD_OPERATOR_PREVIEW_TOKEN } : {}) };
    if (!fetchImpl) return requestBytes(new URL(base + route), { headers, method, maximumBytes, preview });
    const response = await fetchImpl(base + route, { headers, method, redirect: "error", signal: AbortSignal.timeout(15_000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maximumBytes) fail("http_body_too_large");
    return { status: response.status, headers: response.headers, bytes };
  };
  let unauthorizedStatus = null;
  if (preview) {
    const denied = await request(bundle.records[0].route, { authorized: false, maximumBytes: 65536 });
    if (denied.status !== 404) fail("preview_static_not_guarded");
    unauthorizedStatus = denied.status;
  }
  let checkedFiles = 0, checkedBytes = 0;
  for (const record of bundle.records) {
    const result = await request(record.route, { maximumBytes: record.bytes });
    if (result.status !== 200 || result.headers.get("x-starward-sky-delivery") !== "static" ||
      result.bytes.length !== record.bytes || skyStaticHash(result.bytes) !== record.sha256) fail("http_identity_mismatch");
    for (const [key, value] of Object.entries(record.headers)) if (result.headers.get(key) !== value) fail("http_header_mismatch");
    checkedFiles += 1; checkedBytes += result.bytes.length;
  }
  const head = await request(bundle.records[0].route, { method: "HEAD", maximumBytes: 0 });
  if (head.status !== 200 || head.bytes.length !== 0 || head.headers.get("x-starward-sky-delivery") !== "static") fail("http_head_invalid");
  for (const [key, value] of Object.entries(bundle.records[0].headers)) if (head.headers.get(key) !== value) fail("http_head_header_mismatch");
  return Object.freeze({ status: "passed", identity, checkedFiles, checkedBytes, unauthorizedStatus });
}
