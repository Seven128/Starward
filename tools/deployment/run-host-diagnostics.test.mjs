import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { diagnoseHost, diagnosticSucceeded } from "./run-host-diagnostics.mjs";
import { identityScript, runtimeScript } from "./runtime-diagnostics.mjs";
import { releaseReferenceScript } from "./release-reference-diagnostics.mjs";
import { hostStorageScript } from "./host-storage-diagnostics.mjs";

const env = {
  SSH_HOST: "host.example.invalid", SSH_PORT: "22", SSH_USER: "operator",
  REMOTE_INBOX: "/srv/inbox", REMOTE_RELEASE_ROOT: "/srv/releases",
  REMOTE_CANDIDATE_ROOT: "/srv/candidates", REMOTE_BASE_DEPLOY_ENV: "/srv/private/base.env",
  SSH_PRIVATE_KEY: "test-private-key-never-report", SSH_KNOWN_HOSTS: "test-host-trust-never-report",
};
const ready = { status: "ready", checkedAt: "2026-09-13T16:00:00Z", os: "ubuntu-24.04", architecture: "x86_64", cpu: 4, memoryKiB: 4000000, availableDiskKiB: 11000000, node: "24.16.0", docker: "29.5.3", compose: "v2.40.3" };
const protectedEnv = (values = env) => ({
  SSH_CONNECTION: JSON.stringify(Object.fromEntries(Object.entries(values).filter(([name]) => !["SSH_PRIVATE_KEY", "SSH_KNOWN_HOSTS"].includes(name)))),
  SSH_PRIVATE_KEY: values.SSH_PRIVATE_KEY,
  SSH_KNOWN_HOSTS: values.SSH_KNOWN_HOSTS,
});
function referenceReport() {
  const hash = "a".repeat(64), revision = "a".repeat(40), digest = `sha256:${hash}`;
  return { status: "observed", evidenceScope: "STAGING_RELEASE_REFERENCES_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED",
    base: { status: "observed", code: null, sha256: hash, environmentMatches: true, projectMatches: true },
    current: { status: "observed", code: null, pointerSha256: hash, receiptSha256: hash, candidateSha256: hash,
      schemaVersion: "starward-operator-preview-operation-v1", operation: "deploy", receiptStatus: "succeeded", revision, imageDigest: digest,
      identityMatches: true, approvedRepositoryMatches: true, sourceRootMatches: true, backupManifestDeclared: false },
    stoppedApi: { status: "observed", code: null, matchingContainerCount: 1, runningContainerCount: 0, revision, imageDigest: digest, state: "exited" },
    failedDeployReceipts: { status: "observed", code: null, observedFileCount: 1, matchingCount: 0, revision, imageDigest: digest, matches: [] },
    observation: { status: "observed", code: null } };
}

function storageReport() {
  const ok = { status: "observed", code: null };
  const directory = { ...ok, allocatedBytes: 4096, sameFilesystemAsRelease: true };
  const category = { ...ok, total: 0, active: 0, size: "0B", reclaimable: "0B (0%)" };
  return { status: "observed", evidenceScope: "HOST_STORAGE_AGGREGATES_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED", cleanupAuthorization: "NONE",
    filesystem: { ...ok, totalBytes: 42949672960, usedBytes: 39000000000, availableBytes: 2000000000 },
    directories: { INBOX: { ...directory }, RELEASE: { ...directory }, CANDIDATE: { ...directory } },
    docker: { ...ok, Images: { ...category }, Containers: { ...category }, LocalVolumes: { ...category }, BuildCache: { ...category } },
    observation: { ...ok } };
}

test("diagnostics sends only the existing preflight with pinned trust and cleans ephemeral credentials", () => {
  let keyPath;
  const actual = diagnoseHost(protectedEnv(), (command, args, options) => {
    assert.equal(command, "ssh");
    keyPath = args[1];
    assert.equal(readFileSync(keyPath, "utf8"), `${env.SSH_PRIVATE_KEY}\n`);
    assert.equal(readFileSync(join(dirname(keyPath), "known_hosts"), "utf8"), `${env.SSH_KNOWN_HOSTS}\n`);
    if (process.platform !== "win32") assert.equal(statSync(keyPath).mode & 0o777, 0o600);
    for (const option of ["IdentitiesOnly=yes", "StrictHostKeyChecking=yes", "BatchMode=yes", "ConnectTimeout=10"]) assert.ok(args.includes(option));
    assert.equal(args.at(-1), "sh -s -- '/srv/inbox' '/srv/releases' '/srv/candidates' '/srv/private/base.env'");
    assert.equal(options.input, readFileSync("infrastructure/deployment/host-preflight.sh", "utf8"));
    assert.equal(options.env.SSH_PRIVATE_KEY, undefined);
    assert.equal(options.env.SSH_KNOWN_HOSTS, undefined);
    assert.equal(options.env.SSH_HOST, undefined);
    assert.equal(options.env.SSH_CONNECTION, undefined);
    assert.equal(options.timeout, 60000);
    assert.ok(args.includes("GlobalKnownHostsFile=/dev/null"));
    assert.equal(args[args.indexOf("-F") + 1], "/dev/null");
    return { status: 0, stdout: JSON.stringify({ ...ready, unwanted: env.SSH_PRIVATE_KEY }) };
  });
  assert.deepEqual(actual, ready);
  assert.equal(existsSync(dirname(keyPath)), false);
});

test("invalid connection inputs are rejected before files or SSH exist", () => {
  const root = mkdtempSync(join(tmpdir(), "starward-diagnostic-test-"));
  try {
    for (const patch of [
      { SSH_HOST: "-oProxyCommand=bad" }, { SSH_USER: "operator;echo bad" },
      { SSH_PORT: "0" }, { SSH_PORT: "65536" }, { SSH_PRIVATE_KEY: "" },
      { SSH_KNOWN_HOSTS: "" }, { REMOTE_INBOX: "/srv/'$(bad)'" },
      { REMOTE_INBOX: "/srv/../private" }, { REMOTE_BASE_DEPLOY_ENV: "relative" },
    ]) assert.deepEqual(diagnoseHost(protectedEnv({ ...env, ...patch }), () => assert.fail("must not invoke SSH"), root), { status: "failed", code: "diagnostic_configuration_invalid" });
    for (const SSH_CONNECTION of [undefined, "bad JSON", "null", "[]", "{}"])
      assert.deepEqual(diagnoseHost({ ...protectedEnv(), SSH_CONNECTION }, () => assert.fail("must not invoke SSH"), root), { status: "failed", code: "diagnostic_configuration_invalid" });
    assert.deepEqual(readdirSync(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("failure reports never expose SSH errors, remote paths, credentials or unsolicited stdout", () => {
  for (const [result, code] of [
    [{ status: 65, stderr: `host_preflight_directory_invalid:${env.REMOTE_INBOX}`, stdout: env.SSH_PRIVATE_KEY }, "host_preflight_directory_invalid"],
    [{ status: 65, stderr: "host_preflight_memory_below_3584_mib" }, "host_preflight_memory_below_3584_mib"],
    [{ status: 65, stderr: "host_preflight_disk_below_10_gib" }, "host_preflight_disk_below_10_gib"],
    [{ status: 255, stderr: `${env.SSH_USER}@${env.SSH_HOST}: ${env.SSH_PRIVATE_KEY}` }, "diagnostic_ssh_failed"],
    [{ status: 65, stderr: "host_preflight_invented:private" }, "diagnostic_ssh_failed"],
    [{ status: null, error: new Error(env.SSH_PRIVATE_KEY) }, "diagnostic_transport_interrupted"],
    [{ status: 0, stdout: env.SSH_PRIVATE_KEY }, "diagnostic_execution_failed"],
    [{ status: 0, stdout: JSON.stringify({ ...ready, docker: env.SSH_PRIVATE_KEY }) }, "diagnostic_response_invalid"],
    [{ status: 0, stdout: JSON.stringify({ ...ready, cpu: env.SSH_PRIVATE_KEY }) }, "diagnostic_response_invalid"],
  ]) {
    let directory;
    const report = diagnoseHost(protectedEnv(), (_command, args) => { directory = dirname(args[1]); return result; });
    assert.deepEqual(report, { status: "failed", code });
    assert.equal(existsSync(directory), false);
  }
  let directory;
  assert.deepEqual(diagnoseHost(protectedEnv(), (_command, args) => {
    directory = dirname(args[1]); throw new Error(env.SSH_PRIVATE_KEY);
  }), { status: "failed", code: "diagnostic_execution_failed" });
  assert.equal(existsSync(directory), false);
});

test("runtime mode sends only the fixed staging probe and arbitrary modes cannot execute", () => {
  const report = { status: "observed", runtimeEnvironment: "staging", configState: "failed", databaseState: "failed", revision: null, healthStatus: null };
  const result = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "runtime" }, (_command, _args, options) => {
    assert.equal(options.input, runtimeScript);
    return { status: 0, stdout: JSON.stringify({ ...report, secret: env.SSH_PRIVATE_KEY }) };
  });
  assert.deepEqual(result, report);
  for (const DIAGNOSTIC_MODE of ["anything else", "constructor", "__proto__", "toString", "release-reference --path /private",
    { toString() { assert.fail("must not coerce mode"); } }])
    assert.deepEqual(diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE }, () => assert.fail("must not execute")), { status: "failed", code: "diagnostic_configuration_invalid" });
});

test("identity mode reuses protected SSH and returns only the fixed aggregate projection", () => {
  const report = { status: "observed", evidenceScope: "STAGING_CONTAINER_IDENTITY_ONLY", matchingContainerCount: 1, runningContainerCount: 0,
    stateCounts: { created: 0, restarting: 0, running: 0, removing: 0, paused: 0, exited: 1, dead: 0 }, selectedContainer: null,
    singleMatchingContainer: { state: "exited", running: false, userMatches: true, projectMatches: true, serviceMatches: true,
      revision: "a".repeat(40), imageReferenceDigest: `sha256:${"b".repeat(64)}` } };
  let directory;
  const result = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "identity" }, (_command, args, options) => {
    directory = dirname(args[1]);
    assert.equal(options.input, identityScript);
    assert.ok(args.includes("StrictHostKeyChecking=yes"));
    assert.equal(options.env.SSH_CONNECTION, undefined);
    assert.equal(options.env.SSH_PRIVATE_KEY, undefined);
    return { status: 0, stdout: JSON.stringify({ ...report, privateExtra: env.SSH_PRIVATE_KEY }) };
  });
  assert.deepEqual(result, report);
  assert.equal(diagnosticSucceeded(result), false);
  assert.equal(existsSync(directory), false);
});

test("identity failures discard remote stdout, errors and invalid projected values", () => {
  for (const [result, code] of [
    [{ status: 65, stderr: `runtime_diagnostic_identity_changed:${env.REMOTE_INBOX}`, stdout: env.SSH_PRIVATE_KEY }, "runtime_diagnostic_identity_changed"],
    [{ status: 65, stderr: `runtime_diagnostic_identity_failed:${env.SSH_PRIVATE_KEY}` }, "runtime_diagnostic_identity_failed"],
    [{ status: 65, stderr: "runtime_diagnostic_identity_invented:private" }, "diagnostic_ssh_failed"],
    [{ status: 0, stdout: JSON.stringify({ status: "observed", evidenceScope: "STAGING_CONTAINER_IDENTITY_ONLY", matchingContainerCount: env.SSH_PRIVATE_KEY }) }, "diagnostic_execution_failed"],
  ]) {
    const report = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "identity" }, () => result);
    assert.deepEqual(report, { status: "failed", code });
    assert.doesNotMatch(JSON.stringify(report), /test-private-key|\/srv\//u);
  }
});

test("release-reference uses fixed protected paths and returns only bounded metadata", () => {
  const report = referenceReport();
  let directory;
  const actual = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "release-reference" }, (command, args, options) => {
    assert.equal(command, "ssh");
    directory = dirname(args[1]);
    assert.equal(args.at(-1), "sh -s -- '/srv/inbox' '/srv/releases' '/srv/candidates' '/srv/private/base.env'");
    assert.equal(options.input, releaseReferenceScript);
    assert.equal(options.timeout, 60000);
    assert.equal(options.maxBuffer, 64 * 1024);
    assert.equal(options.env.SSH_CONNECTION, undefined);
    assert.equal(options.env.REMOTE_BASE_DEPLOY_ENV, undefined);
    assert.equal(options.env.SSH_PRIVATE_KEY, undefined);
    return { status: 0, stdout: JSON.stringify({ ...report, secret: env.SSH_PRIVATE_KEY,
      current: { ...report.current, sourceRoot: env.REMOTE_RELEASE_ROOT, deployEnvPath: env.REMOTE_BASE_DEPLOY_ENV } }) };
  });
  assert.deepEqual(actual, report);
  assert.equal(diagnosticSucceeded(actual), true); // Metadata observation, no availability or complete-reference claim.
  assert.equal(actual.stoppedApi.runningContainerCount, 0);
  assert.equal(actual.referenceCompleteness, "UNVERIFIED");
  assert.equal(existsSync(directory), false);
});

test("release-reference preserves partial observations without claiming completion", () => {
  const report = referenceReport();
  report.current = { ...report.current, status: "unknown", code: "missing" };
  const actual = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "release-reference" }, () => ({ status: 0, stdout: JSON.stringify(report) }));
  assert.deepEqual(actual, report);
  assert.equal(diagnosticSucceeded(actual), false);
  assert.deepEqual(actual.stoppedApi, report.stoppedApi);
  assert.equal(diagnosticSucceeded({ evidenceScope: "STAGING_RELEASE_REFERENCES_ONLY" }), false);
});

test("release-reference failures and forged report fields cannot export private strings", () => {
  const forged = referenceReport();
  forged.current.code = env.SSH_PRIVATE_KEY;
  for (const [result, expected] of [
    [{ status: 65, stderr: `release_reference_failed:${env.REMOTE_BASE_DEPLOY_ENV}`, stdout: env.SSH_PRIVATE_KEY }, "release_reference_failed"],
    [{ status: 65, stderr: "release_reference_invented:private", stdout: env.SSH_PRIVATE_KEY }, "diagnostic_ssh_failed"],
    [{ status: 0, stdout: JSON.stringify(forged) }, "diagnostic_execution_failed"],
  ]) {
    const actual = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "release-reference" }, () => result);
    assert.deepEqual(actual, { status: "failed", code: expected });
    assert.doesNotMatch(JSON.stringify(actual), /test-private-key|\/srv\//u);
  }
});

test("a completed observation cannot make an unavailable readiness endpoint green", () => {
  const report = { status: "observed", runtimeEnvironment: "staging", configState: "ready", databaseState: "ready", healthStatus: 200 };
  assert.equal(diagnosticSucceeded(report), true);
  for (const healthStatus of [null, 503]) assert.equal(diagnosticSucceeded({ ...report, healthStatus }), false);
});

test("host-storage reuses bounded trusted SSH and projects aggregates without capacity readiness", () => {
  const report = storageReport();
  let directory;
  const actual = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "host-storage" }, (command, args, options) => {
    assert.equal(command, "ssh");
    directory = dirname(args[1]);
    assert.equal(options.input, hostStorageScript);
    assert.equal(args.at(-1), "sh -s -- '/srv/inbox' '/srv/releases' '/srv/candidates' '/srv/private/base.env'");
    assert.ok(args.includes("StrictHostKeyChecking=yes"));
    assert.equal(options.timeout, 60000);
    assert.equal(options.maxBuffer, 64 * 1024);
    for (const key of ["SSH_CONNECTION", "SSH_PRIVATE_KEY", "SSH_KNOWN_HOSTS", "REMOTE_BASE_DEPLOY_ENV"])
      assert.equal(options.env[key], undefined);
    return { status: 0, stdout: JSON.stringify({ ...report, privateExtra: env.SSH_PRIVATE_KEY,
      filesystem: { ...report.filesystem, device: env.REMOTE_RELEASE_ROOT },
      docker: { ...report.docker, repository: env.SSH_PRIVATE_KEY } }) };
  });
  assert.deepEqual(actual, report);
  assert.equal(diagnosticSucceeded(actual), true); // Aggregate completion, with only 2 GB available.
  assert.equal(actual.cleanupAuthorization, "NONE");
  assert.equal(actual.referenceCompleteness, "UNVERIFIED");
  assert.equal(existsSync(directory), false);
});

test("host-storage partial failures preserve independent numbers without completing the observation", () => {
  const report = storageReport();
  report.directories.CANDIDATE = { status: "unknown", code: "tool_timeout", allocatedBytes: null, sameFilesystemAsRelease: null };
  const actual = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "host-storage" }, () => ({ status: 0, stdout: JSON.stringify(report) }));
  assert.deepEqual(actual, report);
  assert.deepEqual(actual.filesystem, storageReport().filesystem);
  assert.equal(diagnosticSucceeded(actual), false);
  assert.equal(diagnosticSucceeded({ evidenceScope: "HOST_STORAGE_AGGREGATES_ONLY" }), false);
});

test("host-storage normalizes shell boundaries and rejects arbitrary remote report values", () => {
  const forged = storageReport();
  forged.docker.Images.size = env.SSH_PRIVATE_KEY;
  for (const [result, code] of [
    ...["host_storage_timeout_unavailable", "host_storage_deadline_exceeded", "host_storage_failed"].map(code =>
      [{ status: 65, stderr: `${code}:${env.REMOTE_INBOX}`, stdout: env.SSH_PRIVATE_KEY }, code]),
    [{ status: 65, stderr: "host_storage_invented:private", stdout: env.SSH_PRIVATE_KEY }, "diagnostic_ssh_failed"],
    [{ status: 0, stdout: JSON.stringify(forged) }, "diagnostic_execution_failed"],
  ]) {
    const actual = diagnoseHost({ ...protectedEnv(), DIAGNOSTIC_MODE: "host-storage" }, () => result);
    assert.deepEqual(actual, { status: "failed", code });
    assert.doesNotMatch(JSON.stringify(actual), /test-private-key|\/srv\//u);
  }
});
