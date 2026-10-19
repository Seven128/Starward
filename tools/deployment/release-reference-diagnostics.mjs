import { parseEnvironmentText } from "./env-file.mjs";
import { apiIdentityProbe } from "./runtime-diagnostics.mjs";

// This is a bounded observation of an existing preview lane, not a release
// validator, backup inspector, OCI retention inventory or recovery action.
// Dependencies are explicit so the exact emitted host program can be exercised
// through fake filesystem/Docker boundaries without invoking either service.
export async function releaseReferenceProbe(paths, { fs, constants, path, createHash, parseEnvironmentText: parseEnv, apiIdentityProbe: identityProbe, execute, platform, uid }) {
  const budgets = { fileBytes: 262144, directoryEntries: 512, receiptFiles: 128, totalReadBytes: 8388608 };
  const revisionPattern = /^[a-f0-9]{40}$/u;
  const digestPattern = /^sha256:[a-f0-9]{64}$/u;
  const validRevision = value => typeof value === "string" && revisionPattern.test(value);
  const validDigest = value => typeof value === "string" && digestPattern.test(value);
  const receiptNamePattern = /^operator-preview-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.json$/u;
  const steps = ["lock", "compose-config", "existing-data-services", "immutable-image-pull", "image-source-identity", "sky-static-preparation", "sky-static-compose-config", "stop-edge-and-writers", "verified-backup", "migration", "start-writers", "start-edge", "healthy-services-private-ports", "public-ip-certificate", "guarded-ip-readiness", "sky-static-verification", "persist-receipt", "publish-current-pointer"];
  const errorCodes = ["operator_preview_unexpected_failure", "operator_preview_image_revision_mismatch", "operator_preview_service_not_running", "operator_preview_service_not_healthy", "operator_preview_live_port_exposure", "operator_preview_readiness_http_failed", "operator_preview_readiness_identity_mismatch", "operator_preview_unauthorized_request_not_denied", "operator_preview_response_too_large", "operator_preview_response_failed", "operator_preview_request_timeout", "operator_preview_tls_or_request_failed", "operator_preview_project_mismatch", "operator_preview_image_mismatch", "operator_preview_rendered_identity_mismatch"];
  const report = {
    status: "observed", evidenceScope: "STAGING_RELEASE_REFERENCES_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED",
    base: { status: "unknown", code: "not_observed", sha256: null, environmentMatches: null, projectMatches: null },
    current: { status: "unknown", code: "not_observed", pointerSha256: null, receiptSha256: null, candidateSha256: null, schemaVersion: null, operation: null, receiptStatus: null, revision: null, imageDigest: null, identityMatches: null, approvedRepositoryMatches: null, sourceRootMatches: null, backupManifestDeclared: null },
    stoppedApi: { status: "unknown", code: "not_observed", matchingContainerCount: null, runningContainerCount: null, revision: null, imageDigest: null, state: null },
    failedDeployReceipts: { status: "unknown", code: "not_observed", observedFileCount: null, matchingCount: null, revision: null, imageDigest: null, matches: [] },
    observation: { status: "unknown", code: "not_observed" },
  };
  const fail = code => { throw new Error(code); };
  const failure = (error, fallback = "read_failed") => {
    const own = ["path_invalid", "file_invalid", "directory_invalid", "ownership_invalid", "permissions_invalid", "budget_exceeded", "changed", "base_invalid", "pointer_invalid", "receipt_invalid", "candidate_invalid", "source_invalid", "text_invalid"];
    return own.includes(error?.message) ? error.message : error?.code === "ENOENT" ? "missing" : ["EACCES", "EPERM"].includes(error?.code) ? "permission_denied" : fallback;
  };
  const mark = (target, code, status = "unknown") => { target.status = status; target.code = code; };
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  const canonical = selected => typeof selected === "string" && selected.length <= 4096 && /^\/[A-Za-z0-9._/-]+$/u.test(selected) && selected !== "/" && path.normalize(selected) === selected && selected.split("/").length <= 64 && !selected.split("/").some(part => part === "." || part === "..");
  const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const same = (first, second, file = false) => {
    const keys = file ? ["dev", "ino", "mode", "uid", "gid", "nlink", "size", "mtimeNs", "ctimeNs"] : ["dev", "ino", "mode", "uid", "gid", "nlink"];
    return keys.every(key => first[key] === second[key]);
  };
  const check = (stat, type) => {
    if (stat.isSymbolicLink() || !(type === "file" ? stat.isFile() : stat.isDirectory()) || (type === "file" && stat.nlink !== 1n)) fail(`${type}_invalid`);
    if (stat.uid !== 0n && stat.uid !== BigInt(uid)) fail("ownership_invalid");
    if ((stat.mode & 0o022n) !== 0n) fail("permissions_invalid");
    if (type === "file" && (stat.size < 0n || stat.size > BigInt(budgets.fileBytes))) fail("budget_exceeded");
  };
  const files = new Map(), directories = new Map();
  const currentDependencies = new Set(), receiptDependencies = new Set();
  let readBytes = 0, readLimit = budgets.totalReadBytes, basePath, receiptDirectory, directoryNames, directoryFingerprint, firstIdentity;
  const secureDirectories = async selected => {
    let directory = "/", parent;
    for (const component of ["", ...selected.split("/").slice(1)]) {
      if (component) directory = path.join(directory, component);
      const before = await fs.lstat(directory, { bigint: true });
      check(before, "directory");
      const old = directories.get(directory);
      if (old) {
        const held = await old.handle.stat({ bigint: true }); check(held, "directory");
        if (!same(old.stat, before) || !same(old.stat, held)) fail("changed");
        parent = old;
      } else {
        // Each last component is opened without following links through a held
        // directory descriptor. /proc/self/fd is a fixed Linux descriptor alias,
        // not another caller-selected root or a fallback to pathname traversal.
        const anchored = parent ? `/proc/self/fd/${parent.handle.fd}/${component}` : "/";
        const handle = await fs.open(anchored, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const stat = await handle.stat({ bigint: true }); check(stat, "directory");
          const after = await fs.lstat(directory, { bigint: true }); check(after, "directory");
          if (!Number.isInteger(handle.fd) || handle.fd < 0 || !same(before, stat) || !same(stat, after)) fail("changed");
          parent = { stat, handle }; directories.set(directory, parent);
        } catch (error) { await handle.close(); throw error; }
      }
    }
    return parent;
  };
  const read = async (selected, final = false) => {
    if (!canonical(selected)) fail("path_invalid");
    if (!final && files.has(selected)) return files.get(selected);
    const parent = await secureDirectories(path.dirname(selected));
    const before = await fs.lstat(selected, { bigint: true });
    check(before, "file");
    const handle = await fs.open(`/proc/self/fd/${parent.handle.fd}/${path.basename(selected)}`, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const opened = await handle.stat({ bigint: true });
      check(opened, "file");
      if (!same(before, opened, true)) fail("changed");
      const buffer = Buffer.alloc(Number(opened.size) + 1);
      let offset = 0;
      while (offset < buffer.length) {
        const length = Math.min(buffer.length - offset, readLimit - readBytes);
        if (length <= 0) fail("budget_exceeded");
        const { bytesRead } = await handle.read(buffer, offset, length, offset);
        if (!Number.isSafeInteger(bytesRead) || bytesRead < 0 || bytesRead > length) fail("read_failed");
        readBytes += bytesRead;
        if (readBytes > budgets.totalReadBytes) fail("budget_exceeded");
        if (!bytesRead) break;
        offset += bytesRead;
      }
      const afterHandle = await handle.stat({ bigint: true });
      const afterPath = await fs.lstat(selected, { bigint: true });
      check(afterHandle, "file"); check(afterPath, "file");
      if (offset !== Number(opened.size) || !same(opened, afterHandle, true) || !same(opened, afterPath, true)) fail("changed");
      await secureDirectories(path.dirname(selected));
      const bytes = buffer.subarray(0, offset), value = { bytes, stat: opened, sha256: hash(bytes) };
      if (!final) files.set(selected, value);
      return value;
    } finally { await handle.close(); }
  };
  const text = bytes => { try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("text_invalid"); } };
  const json = bytes => { try { const value = JSON.parse(text(bytes)); if (!record(value)) fail("receipt_invalid"); return value; } catch { fail("receipt_invalid"); } };
  const environment = bytes => { try { return parseEnv(text(bytes)); } catch { fail("text_invalid"); } };
  const names = async selected => {
    const selectedDirectory = await secureDirectories(selected);
    const before = await fs.lstat(selected, { bigint: true });
    const opened = await selectedDirectory.handle.stat({ bigint: true }); check(opened, "directory");
    if (!same(before, opened, true)) fail("changed");
    const entries = [], directory = await fs.opendir(`/proc/self/fd/${selectedDirectory.handle.fd}/.`);
    try {
      for await (const entry of directory) {
        entries.push(entry.name);
        if (entries.length > budgets.directoryEntries) fail("budget_exceeded");
      }
    } finally { await directory.close().catch(error => { if (error?.code !== "ERR_DIR_CLOSED") throw error; }); }
    const after = await fs.lstat(selected, { bigint: true }); check(after, "directory");
    if (!same(opened, await selectedDirectory.handle.stat({ bigint: true }), true) || !same(opened, after, true)) fail("changed");
    return { entries: entries.sort(), stat: opened };
  };
  const parseReceipt = (value, expectedStatus) => {
    if (!record(value) || !["starward-operator-preview-operation-v1", "starward-operator-preview-operation-v2"].includes(value.schemaVersion) ||
        value.environment !== "staging" || value.productionQualified !== false || !["deploy", "check", "stop", "backup", "inspect-backups", "maintain-backups"].includes(value.operation) ||
        (expectedStatus && value.operation !== "deploy") ||
        !["succeeded", "failed", "running"].includes(value.status) || (expectedStatus && value.status !== expectedStatus) ||
        !validRevision(value.revision) || !validDigest(value.imageDigest) || typeof value.writersStopped !== "boolean" ||
        (Object.hasOwn(value, "backupManifestPath") && !canonical(value.backupManifestPath))) fail("receipt_invalid");
    return value;
  };
  const observedIdentity = () => {
    const value = identityProbe(execute);
    const row = value.singleMatchingContainer;
    report.stoppedApi.matchingContainerCount = value.matchingContainerCount;
    report.stoppedApi.runningContainerCount = value.runningContainerCount;
    if (value.matchingContainerCount !== 1 || value.runningContainerCount !== 0 || !row || row.running ||
        !["created", "exited", "dead"].includes(row.state) || !row.userMatches || !validRevision(row.revision) || !validDigest(row.imageReferenceDigest)) {
      mark(report.stoppedApi, "stopped_target_unavailable");
    } else {
      Object.assign(report.stoppedApi, { status: "observed", code: null, revision: row.revision, imageDigest: row.imageReferenceDigest, state: row.state });
    }
    return value;
  };
  if (platform !== "linux" || !Number.isSafeInteger(uid) || uid < 0 || !["O_NOFOLLOW", "O_NONBLOCK", "O_DIRECTORY"].every(key => Number.isInteger(constants[key]) && constants[key] > 0)) {
    for (const target of [report.base, report.current, report.stoppedApi, report.failedDeployReceipts, report.observation]) mark(target, "platform_unsupported", "failed");
    return report;
  }
  if (!Array.isArray(paths) || paths.length !== 4 || !paths.every(canonical)) {
    for (const target of [report.base, report.current, report.stoppedApi, report.failedDeployReceipts, report.observation]) mark(target, "path_invalid", "failed");
    return report;
  }
  try {
  const [, releaseRoot, candidateRoot, selectedBase] = paths;
  basePath = selectedBase;
  try { firstIdentity = observedIdentity(); }
  catch { mark(report.stoppedApi, "identity_failed", "failed"); }
  let base;
  try {
    await secureDirectories(releaseRoot); await secureDirectories(candidateRoot);
    const value = await read(basePath); base = environment(value.bytes);
    if (base.STARWARD_ENVIRONMENT !== "staging" || base.COMPOSE_PROJECT_NAME !== "starward-staging" ||
        !/^[a-z0-9.-]+(?::[0-9]+)?(?:\/[a-z0-9._-]+)+$/u.test(base.STARWARD_IMAGE_REPOSITORY ?? "") || !canonical(base.STARWARD_RECEIPT_DIRECTORY)) fail("base_invalid");
    receiptDirectory = base.STARWARD_RECEIPT_DIRECTORY;
    Object.assign(report.base, { status: "observed", code: null, sha256: value.sha256, environmentMatches: true, projectMatches: true });
  } catch (error) { mark(report.base, failure(error)); }
  if (report.base.status === "observed") {
    // A fixed pointer chain does not require enumerating unrelated receipts.
    // Keep its observation independent of the optional historical batch.
    try {
      currentDependencies.add(basePath);
      const pointerPath = path.join(receiptDirectory, "operator-preview-current.json"); currentDependencies.add(pointerPath);
      const pointerRecord = await read(pointerPath), pointer = json(pointerRecord.bytes);
      if (!validRevision(pointer.revision) || !validDigest(pointer.imageDigest) || !canonical(pointer.receiptPath) ||
          path.dirname(pointer.receiptPath) !== receiptDirectory || !receiptNamePattern.test(path.basename(pointer.receiptPath)) ||
          !canonical(pointer.deployEnvPath) ||
          !pointer.deployEnvPath.startsWith(candidateRoot + "/") || path.basename(pointer.deployEnvPath) !== "deploy.env" ||
          pointer.sourceRoot !== path.join(releaseRoot, "control", pointer.revision)) fail("pointer_invalid");
      currentDependencies.add(pointer.receiptPath); currentDependencies.add(pointer.deployEnvPath);
      const receiptRecord = await read(pointer.receiptPath), receipt = parseReceipt(json(receiptRecord.bytes), "succeeded");
      if (receipt.revision !== pointer.revision || receipt.imageDigest !== pointer.imageDigest || receipt.writersStopped !== false) fail("receipt_invalid");
      const candidateRecord = await read(pointer.deployEnvPath), candidate = environment(candidateRecord.bytes);
      if (candidate.STARWARD_ENVIRONMENT !== "staging" || candidate.COMPOSE_PROJECT_NAME !== "starward-staging" ||
          candidate.STARWARD_RECEIPT_DIRECTORY !== receiptDirectory || candidate.STARWARD_RELEASE_REVISION !== pointer.revision ||
          candidate.STARWARD_IMAGE_DIGEST !== pointer.imageDigest || candidate.STARWARD_IMAGE_REPOSITORY !== base.STARWARD_IMAGE_REPOSITORY ||
          candidate.STARWARD_IMAGE_REF !== `${base.STARWARD_IMAGE_REPOSITORY}@${pointer.imageDigest}` ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(candidate.STARWARD_RELEASED_AT ?? "") || !Number.isFinite(Date.parse(candidate.STARWARD_RELEASED_AT))) fail("candidate_invalid");
      await secureDirectories(pointer.sourceRoot);
      Object.assign(report.current, { status: "observed", code: null, pointerSha256: pointerRecord.sha256, receiptSha256: receiptRecord.sha256, candidateSha256: candidateRecord.sha256,
        schemaVersion: receipt.schemaVersion, operation: "deploy", receiptStatus: "succeeded", revision: receipt.revision, imageDigest: receipt.imageDigest,
        identityMatches: true, approvedRepositoryMatches: true, sourceRootMatches: true, backupManifestDeclared: Object.hasOwn(receipt, "backupManifestPath") });
    } catch (error) { mark(report.current, failure(error)); }
    // Reserve the existing fixed-chain byte rechecks before the batch can
    // consume the shared budget. EOF headroom is included; no limit grows.
    readLimit -= [...currentDependencies].reduce((total, selected) => total + (files.has(selected) ? files.get(selected).bytes.length + 1 : 0), 0);
    if (report.stoppedApi.status !== "observed") mark(report.failedDeployReceipts, "stopped_identity_unavailable");
    else {
      try {
        const result = await names(receiptDirectory);
        directoryNames = result.entries; directoryFingerprint = result.stat;
      } catch (error) { mark(report.failedDeployReceipts, failure(error)); }
      if (directoryNames) {
        const selected = directoryNames.filter(name => receiptNamePattern.test(name));
        report.failedDeployReceipts.observedFileCount = selected.length;
        report.failedDeployReceipts.revision = report.stoppedApi.revision; report.failedDeployReceipts.imageDigest = report.stoppedApi.imageDigest;
        receiptDependencies.add(basePath);
        if (selected.length > budgets.receiptFiles) mark(report.failedDeployReceipts, "budget_exceeded");
        else {
          let receiptFailure = null;
          for (const name of selected) {
            const selectedPath = path.join(receiptDirectory, name); receiptDependencies.add(selectedPath);
            try {
              const value = await read(selectedPath), receipt = parseReceipt(json(value.bytes));
              // Other existing preview operations and schemas are not candidate
              // deploy references. Malformed JSON remains an observation gap.
              if (receipt.operation !== "deploy") continue;
              if (receipt.status !== "failed" || receipt.revision !== report.stoppedApi.revision || receipt.imageDigest !== report.stoppedApi.imageDigest) continue;
              const knownStep = steps.includes(receipt.failedStep) ? receipt.failedStep : "unclassified";
              let errorCode = errorCodes.includes(receipt.errorCode) ? receipt.errorCode : "unclassified";
              const processSteps = ["preview-compose-config", "preview-image-pull", "preview-image-revision", "preview-static-compose-config", "preview-stop-writers", "preview-migration", "preview-start-writers", "preview-start-edge", "preview-container-state"];
              if (typeof receipt.errorCode === "string") {
                const parts = receipt.errorCode.split(":");
                if (parts.length === 3 && processSteps.includes(parts[1])) {
                  if (parts[0] === "deployment_process_failed" && (/^(?:0|[1-9][0-9]{0,2})$/u.test(parts[2]) || parts[2] === "signal")) errorCode = "deployment_process_failed";
                  if (parts[0] === "deployment_process_error" && ["EACCES", "ENOENT", "ETIMEDOUT", "ENOBUFS", "EPIPE", "spawn"].includes(parts[2])) errorCode = "deployment_process_error";
                }
              }
              report.failedDeployReceipts.matches.push({ schemaVersion: receipt.schemaVersion, failedStep: knownStep, errorCode, writersStopped: receipt.writersStopped,
                backupManifestDeclared: Object.hasOwn(receipt, "backupManifestPath"), sha256: value.sha256 });
            } catch (error) { receiptFailure ??= failure(error); }
          }
          if (receiptFailure) mark(report.failedDeployReceipts, receiptFailure);
          else Object.assign(report.failedDeployReceipts, { status: "observed", code: null, matchingCount: report.failedDeployReceipts.matches.length });
        }
      }
    }
  } else {
    mark(report.current, "base_unavailable"); mark(report.failedDeployReceipts, "base_unavailable");
  }
  let observationFailure = null;
  const changedFiles = new Map();
  readLimit = budgets.totalReadBytes;
  for (const [selected, previous] of files) {
    try { const after = await read(selected, true); if (!same(previous.stat, after.stat, true) || !previous.bytes.equals(after.bytes)) fail("changed"); }
    catch (error) { changedFiles.set(selected, failure(error)); observationFailure ??= failure(error); }
  }
  if (directoryNames) {
    try {
      const after = await names(receiptDirectory);
      if (!same(directoryFingerprint, after.stat, true) || JSON.stringify(directoryNames) !== JSON.stringify(after.entries)) fail("changed");
    } catch (error) {
      observationFailure ??= failure(error);
      mark(report.failedDeployReceipts, failure(error)); report.failedDeployReceipts.matchingCount = null;
    }
  }
  // Recheck shared safety after enumeration as well: an unrelated new name
  // leaves fixed files valid, but replaced or writable directories do not.
  try {
    for (const [selected, previous] of directories) {
      const after = await fs.lstat(selected, { bigint: true }); check(after, "directory");
      const held = await previous.handle.stat({ bigint: true }); check(held, "directory");
      if (!same(previous.stat, after) || !same(previous.stat, held)) fail("changed");
    }
  } catch (error) {
    observationFailure ??= failure(error);
    if (report.current.status === "observed") mark(report.current, failure(error));
    mark(report.failedDeployReceipts, failure(error)); report.failedDeployReceipts.matchingCount = null;
  }
  if (changedFiles.has(basePath)) mark(report.base, changedFiles.get(basePath));
  const currentFailure = [...currentDependencies].find(selected => changedFiles.has(selected));
  if (currentFailure) mark(report.current, changedFiles.get(currentFailure));
  const receiptFailure = [...receiptDependencies].find(selected => changedFiles.has(selected));
  if (receiptFailure) { mark(report.failedDeployReceipts, changedFiles.get(receiptFailure)); report.failedDeployReceipts.matchingCount = null; }
  if (firstIdentity) {
    try {
      if (JSON.stringify(firstIdentity) !== JSON.stringify(identityProbe(execute))) fail("changed");
    } catch {
      mark(report.stoppedApi, "identity_changed"); mark(report.failedDeployReceipts, "identity_changed"); report.failedDeployReceipts.matchingCount = null;
      observationFailure ??= "identity_changed";
    }
  }
  mark(report.observation, observationFailure, observationFailure ? "unknown" : "observed");
  return report;
  } finally {
    for (const { handle } of [...directories.values()].reverse()) {
      try { await handle.close(); }
      catch { mark(report.observation, "read_failed"); }
    }
  }
}

// Independent runner output boundary. It reconstructs only admitted fields;
// paths, operators, repositories, tokens, raw JSON and parser errors stay private.
export function sanitizeReleaseReferenceReport(report) {
  const fail = () => { throw new Error("release_reference_report_invalid"); };
  const codes = [null, "not_observed", "path_invalid", "file_invalid", "directory_invalid", "ownership_invalid", "permissions_invalid", "budget_exceeded", "changed", "base_invalid", "pointer_invalid", "receipt_invalid", "candidate_invalid", "source_invalid", "text_invalid", "read_failed", "missing", "permission_denied", "platform_unsupported", "identity_failed", "stopped_target_unavailable", "stopped_identity_unavailable", "base_unavailable", "identity_changed"];
  const schemas = ["starward-operator-preview-operation-v1", "starward-operator-preview-operation-v2"];
  const steps = ["unclassified", "lock", "compose-config", "existing-data-services", "immutable-image-pull", "image-source-identity", "sky-static-preparation", "sky-static-compose-config", "stop-edge-and-writers", "verified-backup", "migration", "start-writers", "start-edge", "healthy-services-private-ports", "public-ip-certificate", "guarded-ip-readiness", "sky-static-verification", "persist-receipt", "publish-current-pointer"];
  const errorCodes = ["unclassified", "deployment_process_failed", "deployment_process_error", "operator_preview_unexpected_failure", "operator_preview_image_revision_mismatch", "operator_preview_service_not_running", "operator_preview_service_not_healthy", "operator_preview_live_port_exposure", "operator_preview_readiness_http_failed", "operator_preview_readiness_identity_mismatch", "operator_preview_unauthorized_request_not_denied", "operator_preview_response_too_large", "operator_preview_response_failed", "operator_preview_request_timeout", "operator_preview_tls_or_request_failed", "operator_preview_project_mismatch", "operator_preview_image_mismatch", "operator_preview_rendered_identity_mismatch"];
  const status = value => { if (!value || !["observed", "unknown", "failed"].includes(value.status) || !codes.includes(value.code) || ((value.status === "observed") !== (value.code === null))) fail(); return { status: value.status, code: value.code }; };
  const match = (value, pattern) => value === null ? null : typeof value === "string" && pattern.test(value) ? value : fail();
  const bool = value => value === null || typeof value === "boolean" ? value : fail();
  const count = (value, maximum = 1_000_000) => value === null ? null : Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : fail();
  const sha = value => match(value, /^[a-f0-9]{64}$/u), revision = value => match(value, /^[a-f0-9]{40}$/u), digest = value => match(value, /^sha256:[a-f0-9]{64}$/u);
  const enumeration = (value, allowed) => value === null || allowed.includes(value) ? value : fail();
  if (report?.status !== "observed" || report.evidenceScope !== "STAGING_RELEASE_REFERENCES_ONLY" || report.snapshot !== "NON_ATOMIC" || report.referenceCompleteness !== "UNVERIFIED") fail();
  const base = { ...status(report.base), sha256: sha(report.base.sha256), environmentMatches: bool(report.base.environmentMatches), projectMatches: bool(report.base.projectMatches) };
  const current = { ...status(report.current), pointerSha256: sha(report.current.pointerSha256), receiptSha256: sha(report.current.receiptSha256), candidateSha256: sha(report.current.candidateSha256),
    schemaVersion: enumeration(report.current.schemaVersion, schemas), operation: enumeration(report.current.operation, ["deploy"]), receiptStatus: enumeration(report.current.receiptStatus, ["succeeded"]),
    revision: revision(report.current.revision), imageDigest: digest(report.current.imageDigest), identityMatches: bool(report.current.identityMatches), approvedRepositoryMatches: bool(report.current.approvedRepositoryMatches), sourceRootMatches: bool(report.current.sourceRootMatches), backupManifestDeclared: bool(report.current.backupManifestDeclared) };
  const stoppedApi = { ...status(report.stoppedApi), matchingContainerCount: count(report.stoppedApi.matchingContainerCount), runningContainerCount: count(report.stoppedApi.runningContainerCount),
    revision: revision(report.stoppedApi.revision), imageDigest: digest(report.stoppedApi.imageDigest), state: enumeration(report.stoppedApi.state, ["created", "exited", "dead"]) };
  const source = report.failedDeployReceipts;
  if (!Array.isArray(source?.matches) || source.matches.length > 128) fail();
  const failedDeployReceipts = { ...status(source), observedFileCount: count(source.observedFileCount, 512), matchingCount: count(source.matchingCount, 128), revision: revision(source.revision), imageDigest: digest(source.imageDigest),
    matches: source.matches.map(value => {
      if (!schemas.includes(value?.schemaVersion) || !steps.includes(value.failedStep) || !errorCodes.includes(value.errorCode) || typeof value.writersStopped !== "boolean" || typeof value.backupManifestDeclared !== "boolean" || sha(value.sha256) === null) fail();
      return { schemaVersion: value.schemaVersion, failedStep: value.failedStep, errorCode: value.errorCode, writersStopped: value.writersStopped, backupManifestDeclared: value.backupManifestDeclared, sha256: value.sha256 };
    }) };
  if (base.status === "observed" && (!base.sha256 || base.environmentMatches !== true || base.projectMatches !== true)) fail();
  if (current.status === "observed" && (base.status !== "observed" || Object.entries(current).some(([key, value]) => key !== "code" && value === null) ||
      [current.identityMatches, current.approvedRepositoryMatches, current.sourceRootMatches].some(value => value !== true))) fail();
  if ((stoppedApi.runningContainerCount !== null && (stoppedApi.matchingContainerCount === null || stoppedApi.runningContainerCount > stoppedApi.matchingContainerCount)) ||
      (stoppedApi.status === "observed" && (stoppedApi.matchingContainerCount !== 1 || stoppedApi.runningContainerCount !== 0 || !stoppedApi.revision || !stoppedApi.imageDigest || !stoppedApi.state))) fail();
  if (failedDeployReceipts.status === "observed" && (base.status !== "observed" || stoppedApi.status !== "observed" || failedDeployReceipts.observedFileCount === null || failedDeployReceipts.observedFileCount > 128 ||
      failedDeployReceipts.matchingCount !== failedDeployReceipts.matches.length || failedDeployReceipts.matchingCount > failedDeployReceipts.observedFileCount ||
      failedDeployReceipts.revision !== stoppedApi.revision || failedDeployReceipts.imageDigest !== stoppedApi.imageDigest)) fail();
  if (failedDeployReceipts.status !== "observed" && failedDeployReceipts.matchingCount !== null) fail();
  return { status: "observed", evidenceScope: "STAGING_RELEASE_REFERENCES_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED", base, current, stoppedApi, failedDeployReceipts, observation: status(report.observation) };
}

export function releaseReferenceSucceeded(report) {
  try {
    const clean = sanitizeReleaseReferenceReport(report);
    return [clean.base, clean.current, clean.stoppedApi, clean.failedDeployReceipts, clean.observation].every(value => value.status === "observed" && value.code === null);
  } catch { return false; }
}

export const releaseReferenceScript = `#!/bin/sh
set -eu
node --input-type=module - "$@" <<'STARWARD_FIXED_RELEASE_REFERENCE_PROBE'
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
try {
  const report = await (${releaseReferenceProbe.toString()})(process.argv.slice(2), {
    fs, constants, path: path.posix, createHash, parseEnvironmentText: (${parseEnvironmentText.toString()}), apiIdentityProbe: (${apiIdentityProbe.toString()}),
    execute: args => execFileSync('docker', args, {encoding:'utf8',timeout:10000,maxBuffer:32768,stdio:['ignore','pipe','pipe']}),
    platform: process.platform, uid: process.geteuid?.(),
  });
  console.log(JSON.stringify((${sanitizeReleaseReferenceReport.toString()})(report)));
} catch {
  process.stderr.write('release_reference_failed\\n');
  process.exitCode = 65;
}
STARWARD_FIXED_RELEASE_REFERENCE_PROBE
`;
