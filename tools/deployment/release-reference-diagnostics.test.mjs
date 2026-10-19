import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as nativeFs from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseEnvironmentText } from "./env-file.mjs";
import { apiIdentityProbe } from "./runtime-diagnostics.mjs";
import { createProtectedDirectoryBoundary } from "./protected-directory.mjs";
import { releaseReferenceProbe, releaseReferenceScript, sanitizeReleaseReferenceReport, releaseReferenceSucceeded } from "./release-reference-diagnostics.mjs";

const currentRevision = "a".repeat(40), currentDigest = `sha256:${"b".repeat(64)}`;
const stoppedRevision = "c".repeat(40), stoppedDigest = `sha256:${"d".repeat(64)}`;
const root = "/srv/private-starward", receipts = `${root}/receipts`, basePath = `${root}/base.env`;
const releaseRoot = "/srv/releases", candidateRoot = "/srv/candidates";
const candidatePath = `${candidateRoot}/${currentRevision}/34771917251-1/deploy.env`;
const currentReceiptPath = `${receipts}/operator-preview-00000000-0000-4000-8000-000000000001.json`;
const failedReceiptPath = `${receipts}/operator-preview-00000000-0000-4000-8000-000000000002.json`;
const pointerPath = `${receipts}/operator-preview-current.json`;
const protectedPaths = ["/srv/inbox", releaseRoot, candidateRoot, basePath];
const privateNeedles = /PRIVATE_|private-registry|PRIVATE-OPERATOR|private-lane|192\.0\.2\.55|"(?:deployEnvPath|sourceRoot|receiptPath|operator|repository|id)":/u;

function fixture() {
  const entries = {};
  const addDirectory = selected => {
    const parts = selected.split("/").filter(Boolean); let current = "/";
    entries["/"] ??= { type: "directory", uid: 0, mode: 0o40755 };
    for (const part of parts) { current = current === "/" ? current + part : current + "/" + part; entries[current] ??= { type: "directory" }; }
  };
  const addFile = (selected, value) => { addDirectory(path.posix.dirname(selected)); entries[selected] = { type: "file", text: typeof value === "string" ? value : JSON.stringify(value) }; };
  const receipt = (patch = {}) => ({ schemaVersion: "starward-operator-preview-operation-v1", operation: "deploy", status: "succeeded", environment: "staging", productionQualified: false,
    revision: currentRevision, imageDigest: currentDigest, writersStopped: false, operator: "PRIVATE-OPERATOR", steps: [], backupManifestPath: `${root}/backups/PRIVATE_BACKUP.json`, ...patch });
  const base = `STARWARD_ENVIRONMENT=staging\nCOMPOSE_PROJECT_NAME=starward-staging\nSTARWARD_IMAGE_REPOSITORY=private-registry.invalid/private-starward\nSTARWARD_RECEIPT_DIRECTORY=${receipts}\nSTARWARD_API_DOMAIN=192.0.2.55\nSTARWARD_OPERATOR_PREVIEW_TOKEN=PRIVATE_TOKEN\nSTARWARD_API_ENV_FILE=${root}/private-lane-api.env\n`;
  addFile(basePath, base);
  addFile(candidatePath, base + `STARWARD_RELEASE_REVISION=${currentRevision}\nSTARWARD_IMAGE_DIGEST=${currentDigest}\nSTARWARD_IMAGE_REF=private-registry.invalid/private-starward@${currentDigest}\nSTARWARD_RELEASED_AT=2026-08-11T00:00:00.000Z\n`);
  addFile(pointerPath, { deployEnvPath: candidatePath, sourceRoot: `${releaseRoot}/control/${currentRevision}`, receiptPath: currentReceiptPath, revision: currentRevision, imageDigest: currentDigest,
    skyStaticDelivery: { PRIVATE_STATIC: "not qualification" } });
  addFile(currentReceiptPath, receipt());
  addFile(failedReceiptPath, receipt({ status: "failed", revision: stoppedRevision, imageDigest: stoppedDigest, writersStopped: true, failedStep: "start-writers", errorCode: "deployment_process_failed:preview-start-writers:1" }));
  addFile(`${receipts}/operator-preview-00000000-0000-4000-8000-000000000003.json`, receipt({ operation: "check", revision: stoppedRevision, imageDigest: stoppedDigest }));
  addFile(`${receipts}/operator-preview.lock`, "PRIVATE_LOCK_DOES_NOT_PROVE_PROCESS_LIVE");
  addDirectory(`${releaseRoot}/control/${currentRevision}`); addDirectory(candidateRoot);
  return { entries, identityRows: [{ id: "1".repeat(64), state: "exited", running: false, userMatches: true, projectMatches: true, serviceMatches: true,
    revision: stoppedRevision, imageReference: `private-registry.invalid/private-starward@${stoppedDigest}` }], mutations: [], paths: protectedPaths };
}

// A deliberately narrow Linux filesystem and Docker oracle. Every fake call is
// observable; arbitrary process commands, lane reads and file writes fail.
// This same function is linked into the exact generated host module below.
function fakeBoundary(configuration) {
  const entries = structuredClone(configuration.entries), events = [], calls = new Map();
  const handles = new Map(); let nextFd = 100;
  for (const [index, entry] of Object.values(entries).entries()) { entry.ino ??= index + 1; entry.dev ??= 1; entry.mtimeNs ??= 1; entry.ctimeNs ??= 1; }
  const failure = code => Object.assign(new Error("PRIVATE_filesystem_error"), { code });
  const invoke = (method, selected, extra) => {
    events.push({ method, selected, ...extra }); const key = `${method}:${selected}`, count = (calls.get(key) ?? 0) + 1; calls.set(key, count);
    for (const mutation of configuration.mutations ?? []) {
      if (mutation.method !== method || mutation.path !== selected || mutation.call !== count) continue;
      if (mutation.remove) delete entries[mutation.target ?? selected];
      else if (mutation.replace) entries[mutation.target ?? selected] = structuredClone(mutation.replace);
      else Object.assign(entries[mutation.target ?? selected], mutation.patch);
      if (mutation.error) throw failure(mutation.error);
    }
  };
  const stat = entry => {
    const bytes = Buffer.from(entry.bytes ?? entry.text ?? "");
    return { dev: BigInt(entry.dev ?? 1), ino: BigInt(entry.ino ?? 9999), mode: BigInt(entry.mode ?? (entry.type === "directory" ? 0o40700 : 0o100600)),
      uid: BigInt(entry.uid ?? 1000), gid: BigInt(entry.gid ?? 1000), nlink: BigInt(entry.nlink ?? (entry.type === "directory" ? 2 : 1)), size: BigInt(entry.size ?? bytes.length),
      mtimeNs: BigInt(entry.mtimeNs ?? 1), ctimeNs: BigInt(entry.ctimeNs ?? 1), isFile: () => entry.type === "file", isDirectory: () => entry.type === "directory", isSymbolicLink: () => entry.type === "symlink" };
  };
  const C = { O_RDONLY: 0, O_NOFOLLOW: 131072, O_NONBLOCK: 2048, O_DIRECTORY: 65536 };
  const resolveDescriptor = selected => {
    if (!selected.startsWith("/proc/self/fd/")) return selected;
    const match = selected.match(/^\/proc\/self\/fd\/(\d+)\/(.+)$/u), parent = match && handles.get(Number(match[1]));
    if (!parent || parent.closed || parent.entry.type !== "directory") throw failure("EBADF");
    const suffix = match[2] === "." ? "" : match[2];
    if (suffix.includes("/") || suffix === "..") throw failure("unanchored_operation");
    return suffix ? (parent.selected === "/" ? "/" + suffix : parent.selected + "/" + suffix) : parent.selected;
  };
  const fs = {
    async lstat(selected, options) { invoke("lstat", selected); if (options?.bigint !== true) throw failure("unbounded_stat"); if (!entries[selected]) throw failure("ENOENT"); return stat(entries[selected]); },
    async open(selected, flags) {
      const anchored = selected; selected = resolveDescriptor(selected);
      invoke("open", selected, { flags, anchored }); const entry = entries[selected]; if (!entry) throw failure("ENOENT");
      if ((flags & C.O_NOFOLLOW) === 0 || (flags & C.O_NONBLOCK) === 0 || (entry.type === "directory" && (flags & C.O_DIRECTORY) === 0)) throw failure("unbounded_open");
      if (selected !== "/" && !anchored.startsWith("/proc/self/fd/")) throw failure("unanchored_open");
      if (entry.type === "symlink") throw failure("ELOOP");
      let closed = false; const fd = nextFd++, record = { selected, entry, closed: false }; handles.set(fd, record);
      return {
        fd,
        async stat(options) { invoke("fstat", selected); if (closed || options?.bigint !== true) throw failure("EBADF"); return stat(entry); },
        async read(buffer, offset, length, position) {
          invoke("read", selected, { length, position }); if (closed || entry.type !== "file" || length > 262145) throw failure("forbidden_read");
          const bytes = Buffer.from(entry.bytes ?? entry.text ?? ""); const count = Math.max(0, Math.min(length, bytes.length - position));
          events.at(-1).bytesRead = count;
          bytes.copy(buffer, offset, position, position + count); return { bytesRead: count, buffer };
        },
        async close() { events.push({ method: "close", selected }); closed = true; record.closed = true; },
      };
    },
    async opendir(selected) {
      if (!selected.startsWith("/proc/self/fd/")) throw failure("unanchored_opendir");
      selected = resolveDescriptor(selected);
      invoke("opendir", selected); const prefix = selected + "/";
      const names = Object.keys(entries).filter(key => key.startsWith(prefix) && !key.slice(prefix.length).includes("/")).map(key => key.slice(prefix.length));
      let closed = false;
      return { async *[Symbol.asyncIterator]() { try { for (const name of names) yield { name }; } finally { closed = true; } }, async close() { if (closed) throw failure("ERR_DIR_CLOSED"); closed = true; } };
    },
  };
  let identityPass = 0;
  const execute = args => {
    events.push({ method: "docker", args });
    if (args[0] === "ps" && args.includes("--all")) identityPass += 1;
    const rows = identityPass > 1 && configuration.secondIdentityRows ? configuration.secondIdentityRows : configuration.identityRows;
    if (args[0] === "ps") {
      if (args.slice(-4).join("|") !== "--filter|label=com.docker.compose.project=starward-staging|--filter|label=com.docker.compose.service=api") throw failure("forbidden_selector");
      return (args.includes("--all") ? rows : rows.filter(row => row.running)).map(row => row.id).join("\n");
    }
    if (args[0] === "inspect" && args[1] === "--format" && !/Config\.Env|\.Mounts/u.test(args[2]) && args.slice(3).join() === rows.map(row => row.id).join()) return rows.map(row => JSON.stringify(row)).join("\n");
    throw failure("forbidden_docker_operation");
  };
  return { fs, constants: C, execute, events, entries };
}

async function observe(configuration = fixture(), patch = {}) {
  const boundary = fakeBoundary(configuration);
  const report = sanitizeReleaseReferenceReport(await releaseReferenceProbe(configuration.paths, { ...boundary, path: path.posix, createHash, parseEnvironmentText, apiIdentityProbe, createProtectedDirectoryBoundary, platform: "linux", uid: 1000, ...patch }));
  return { report, boundary };
}
const updateJson = (f, selected, patch) => { f.entries[selected].text = JSON.stringify({ ...JSON.parse(f.entries[selected].text), ...patch }); };

test("current historical success and unique stopped failure bind separately through the fixed chain", async () => {
  const { report, boundary } = await observe();
  assert.equal(releaseReferenceSucceeded(report), true);
  assert.equal(report.current.revision, currentRevision); assert.equal(report.stoppedApi.revision, stoppedRevision);
  assert.equal(report.current.receiptStatus, "succeeded"); assert.equal(report.current.approvedRepositoryMatches, true);
  assert.equal(report.failedDeployReceipts.observedFileCount, 3); assert.equal(report.failedDeployReceipts.matchingCount, 1);
  assert.deepEqual(report.failedDeployReceipts.matches.map(value => [value.failedStep, value.errorCode, value.writersStopped, value.backupManifestDeclared]), [["start-writers", "deployment_process_failed", true, true]]);
  assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.snapshot, "NON_ATOMIC");
  assert.doesNotMatch(JSON.stringify(report), privateNeedles);
  assert.ok(boundary.events.every(event => !event.selected || !/private-lane|backups|operator-preview\.lock/u.test(event.selected)));
  assert.deepEqual(new Set(boundary.events.filter(event => event.method === "docker").map(event => event.args[0])), new Set(["ps", "inspect"]));
  assert.equal(boundary.events.filter(event => event.method === "docker").length, 6);
});

test("v2 remains an identity observation and multiple matching failures retain all observed receipts", async () => {
  const f = fixture();
  updateJson(f, currentReceiptPath, { schemaVersion: "starward-operator-preview-operation-v2", skyStaticDelivery: { PRIVATE_STATIC: "not verified" } });
  f.entries[`${receipts}/operator-preview-00000000-0000-4000-8000-000000000004.json`] = { ...f.entries[failedReceiptPath], text: JSON.stringify({ ...JSON.parse(f.entries[failedReceiptPath].text), failedStep: "migration", errorCode: "PRIVATE_SECRET_ERROR" }) };
  const { report } = await observe(f);
  assert.equal(report.current.schemaVersion, "starward-operator-preview-operation-v2");
  assert.equal(report.failedDeployReceipts.matchingCount, 2);
  assert.deepEqual(report.failedDeployReceipts.matches.map(value => value.failedStep), ["start-writers", "migration"]);
  assert.equal(report.failedDeployReceipts.matches[1].errorCode, "unclassified");
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_|skyStatic|health|productionQualified/u);
});

test("no current retains valid stopped failure observations, with no prepared-candidate fallback", async () => {
  const f = fixture(); delete f.entries[pointerPath];
  const { report, boundary } = await observe(f);
  assert.equal(report.current.status, "unknown"); assert.equal(report.current.code, "missing");
  assert.equal(report.failedDeployReceipts.status, "observed"); assert.equal(report.failedDeployReceipts.matchingCount, 1);
  assert.equal(releaseReferenceSucceeded(report), false);
  assert.equal(boundary.events.some(event => event.selected === candidatePath), false);
});

test("absent, running, nonunique and metadata-free API targets never invent failed receipt associations", async () => {
  for (const variant of ["absent", "running", "nonunique", "no_metadata", "wrong_user"]) {
    const f = fixture();
    if (variant === "absent") f.identityRows = [];
    if (variant === "running") Object.assign(f.identityRows[0], { state: "running", running: true });
    if (variant === "nonunique") f.identityRows.push({ ...f.identityRows[0], id: "2".repeat(64) });
    if (variant === "no_metadata") f.identityRows[0].revision = "PRIVATE_MALFORMED";
    if (variant === "wrong_user") f.identityRows[0].userMatches = false;
    const { report, boundary } = await observe(f);
    assert.equal(report.current.status, "observed", variant);
    assert.equal(report.stoppedApi.status, "unknown", variant);
    assert.equal(report.failedDeployReceipts.status, "unknown", variant);
    assert.equal(report.failedDeployReceipts.matchingCount, null, variant);
    assert.deepEqual(report.failedDeployReceipts.matches, [], variant);
    assert.equal(boundary.events.some(event => event.selected === failedReceiptPath), false, variant);
    assert.equal(releaseReferenceSucceeded(report), false);
  }
});

test("current identities, repository, source path and status must agree without reading escaped paths", async () => {
  const cases = [
    [pointerPath, { sourceRoot: `${releaseRoot}/control/${stoppedRevision}` }, "pointer_invalid"],
    [pointerPath, { receiptPath: `${root}/operator-preview-00000000-0000-4000-8000-000000000001.json` }, "pointer_invalid"],
    [pointerPath, { deployEnvPath: `${candidateRoot}-outside/deploy.env` }, "pointer_invalid"],
    [currentReceiptPath, { status: "failed" }, "receipt_invalid"],
    [currentReceiptPath, { environment: "production" }, "receipt_invalid"],
    [currentReceiptPath, { productionQualified: true }, "receipt_invalid"],
    [currentReceiptPath, { revision: stoppedRevision }, "receipt_invalid"],
  ];
  for (const [selected, patch, expected] of cases) {
    const f = fixture(); updateJson(f, selected, patch); const { report } = await observe(f);
    assert.equal(report.current.status, "unknown"); assert.equal(report.current.code, expected);
    assert.equal(report.base.status, "observed");
    assert.doesNotMatch(JSON.stringify(report), privateNeedles);
  }
  for (const [key, value] of [["STARWARD_IMAGE_REPOSITORY", "other.invalid/PRIVATE_REPO"], ["STARWARD_IMAGE_DIGEST", stoppedDigest], ["COMPOSE_PROJECT_NAME", "starward-other"]]) {
    const f = fixture(); f.entries[candidatePath].text = f.entries[candidatePath].text.replace(new RegExp(`^${key}=.*$`, "mu"), `${key}=${value}`);
    const { report } = await observe(f); assert.equal(report.current.code, "candidate_invalid");
  }
});

test("ordinary single-link files, Linux ownership and ancestor permissions are required before bytes are read", async () => {
  for (const [selected, patch, expected] of [
    [basePath, { type: "symlink" }, "file_invalid"], [basePath, { type: "fifo" }, "file_invalid"],
    [basePath, { nlink: 2 }, "file_invalid"], [basePath, { uid: 12345 }, "ownership_invalid"], [basePath, { mode: 0o100622 }, "permissions_invalid"],
    [root, { type: "symlink" }, "directory_invalid"], [root, { uid: 12345 }, "ownership_invalid"], [root, { mode: 0o40777 }, "permissions_invalid"],
  ]) {
    const f = fixture(); Object.assign(f.entries[selected], patch); const { report, boundary } = await observe(f);
    assert.equal(report.base.status, "unknown"); assert.equal(report.base.code, expected);
    assert.equal(boundary.events.some(event => event.method === "read" && event.selected === basePath), false);
    assert.equal(report.stoppedApi.status, "observed");
  }
});

test("open replacement, short reads, fstat changes and final same-metadata byte changes remain unknown", async () => {
  const cases = [
    { method: "open", path: candidatePath, call: 1, replace: { type: "file", text: "PRIVATE_REPLACEMENT", ino: 999 } },
    { method: "fstat", path: candidatePath, call: 2, patch: { mtimeNs: 2 } },
    { method: "read", path: candidatePath, call: 1, patch: { text: "short" } },
    { method: "read", path: candidatePath, call: 3, patch: { text: fixture().entries[candidatePath].text.replace("2026-08-11", "2026-08-12") } },
  ];
  for (const mutation of cases) {
    const f = fixture(); f.mutations.push(mutation); const { report } = await observe(f);
    assert.equal(report.current.status, "unknown"); assert.equal(report.current.code, "changed");
    assert.equal(report.stoppedApi.status, "observed");
  }
});

test("receipt directory changes and changing API identity invalidate correlation, without losing independent base", async () => {
  const f = fixture();
  f.mutations.push({ method: "opendir", path: receipts, call: 2, target: `${receipts}/new-private-state`, replace: { type: "file", text: "PRIVATE_NEW" } });
  const changedDirectory = (await observe(f)).report;
  assert.equal(changedDirectory.current.status, "observed"); assert.equal(changedDirectory.failedDeployReceipts.matchingCount, null);
  assert.equal(changedDirectory.observation.code, "changed"); assert.equal(changedDirectory.base.status, "observed");
  const unsafeReports = [];
  for (const patch of [{ mode: 0o40777 }, { ino: 55555 }]) {
    const unsafe = fixture(); unsafe.mutations.push({ method: "opendir", path: receipts, call: 2, patch });
    unsafeReports.push((await observe(unsafe)).report);
  }
  assert.deepEqual(unsafeReports.map(report => report.current.status), ["unknown", "unknown"]);
  assert.deepEqual(unsafeReports.map(report => report.current.code), ["permissions_invalid", "changed"]);
  assert.ok(unsafeReports.every(report => report.failedDeployReceipts.matchingCount === null));
  const g = fixture(); g.secondIdentityRows = [{ ...g.identityRows[0], revision: "e".repeat(40) }];
  const changedIdentity = (await observe(g)).report;
  assert.equal(changedIdentity.current.status, "observed"); assert.equal(changedIdentity.stoppedApi.code, "identity_changed");
  assert.equal(changedIdentity.failedDeployReceipts.matchingCount, null); assert.equal(changedIdentity.observation.code, "identity_changed");
});

test("size, file count and directory budgets produce partial unknown rather than false zero", async () => {
  const tooLarge = fixture(); tooLarge.entries[basePath].size = 262145;
  assert.equal((await observe(tooLarge)).report.base.code, "budget_exceeded");
  const many = fixture();
  for (let index = 4; index <= 130; index += 1) many.entries[`${receipts}/operator-preview-00000000-0000-4000-8000-${String(index).padStart(12, "0")}.json`] = { ...many.entries[failedReceiptPath] };
  const report = (await observe(many)).report;
  assert.equal(report.current.status, "observed"); assert.equal(report.failedDeployReceipts.code, "budget_exceeded");
  assert.equal(report.failedDeployReceipts.matchingCount, null); assert.deepEqual(report.failedDeployReceipts.matches, []);
  const crowded = fixture(); for (let index = 0; index < 512; index += 1) crowded.entries[`${receipts}/unselected-${index}`] = { type: "file", text: "" };
  const crowdedReport = (await observe(crowded)).report;
  assert.equal(crowdedReport.current.status, "observed"); assert.equal(crowdedReport.failedDeployReceipts.code, "budget_exceeded");
  assert.equal(crowdedReport.failedDeployReceipts.matchingCount, null); assert.equal(releaseReferenceSucceeded(crowdedReport), false);
});

test("total byte budget caps actual reads, including final byte rechecks", async () => {
  const f = fixture();
  const value = { ...JSON.parse(f.entries[failedReceiptPath].text), ignoredPrivate: "x".repeat(74000) };
  for (let index = 4; index <= 125; index += 1) f.entries[`${receipts}/operator-preview-00000000-0000-4000-8000-${String(index).padStart(12, "0")}.json`] = { type: "file", text: JSON.stringify(value) };
  const { report, boundary } = await observe(f);
  assert.equal(report.failedDeployReceipts.status, "unknown"); assert.equal(report.failedDeployReceipts.matchingCount, null);
  assert.equal(report.base.status, "observed"); assert.equal(report.current.status, "observed");
  assert.equal(report.observation.code, "budget_exceeded");
  assert.equal(boundary.events.filter(event => event.method === "read").reduce((sum, event) => sum + event.bytesRead, 0), 8388608);
});

test("unreadable or malformed unrelated receipts preserve a valid match but make the total unknown", async () => {
  for (const mode of ["malformed", "permission", "missing"]) {
    const f = fixture(); const target = `${receipts}/operator-preview-00000000-0000-4000-8000-000000000003.json`;
    if (mode === "malformed") f.entries[target].text = "PRIVATE_BAD_JSON";
    if (mode === "permission") f.mutations.push({ method: "open", path: target, call: 1, patch: {}, error: "EACCES" });
    if (mode === "missing") f.mutations.push({ method: "open", path: target, call: 1, remove: true });
    const { report } = await observe(f);
    assert.equal(report.current.status, "observed");
    assert.equal(report.failedDeployReceipts.status, "unknown"); assert.equal(report.failedDeployReceipts.matchingCount, null);
    assert.equal(report.failedDeployReceipts.matches.length, 1);
    assert.doesNotMatch(JSON.stringify(report), privateNeedles);
  }
});

test("untrusted receipt step and error strings are fixed classifications, never regex-pass-through", async () => {
  for (const errorCode of ["private_token_looks_like_a_code", "operator_preview_private_token", "deployment_process_failed:private_token:1", "deployment_process_error:preview-start-writers:PRIVATE", "deployment_process_failed:preview-start-writers:PRIVATE"]) {
    const f = fixture(); updateJson(f, failedReceiptPath, { failedStep: "private-token-is-a-step", errorCode });
    const { report } = await observe(f);
    assert.equal(report.failedDeployReceipts.matches[0].failedStep, "unclassified");
    assert.equal(report.failedDeployReceipts.matches[0].errorCode, "unclassified");
    assert.doesNotMatch(JSON.stringify(report), /private[_-]token|PRIVATE/u);
  }
});

test("runner sanitizer rejects contradictions and unsafe strings and drops every undeclared field", async () => {
  const { report } = await observe();
  const polluted = structuredClone(report); polluted.private = "PRIVATE_EXTRA"; polluted.base.path = basePath;
  polluted.current.operator = "PRIVATE_OPERATOR"; polluted.failedDeployReceipts.matches[0].receiptPath = failedReceiptPath;
  assert.deepEqual(sanitizeReleaseReferenceReport(polluted), report);
  for (const patch of [
    { referenceCompleteness: "VERIFIED" }, { current: { ...report.current, revision: "PRIVATE" } },
    { current: { ...report.current, approvedRepositoryMatches: false } }, { base: { ...report.base, status: "unknown", code: "changed" } },
    { failedDeployReceipts: { ...report.failedDeployReceipts, matchingCount: 0 } },
    { failedDeployReceipts: { ...report.failedDeployReceipts, matches: [{ ...report.failedDeployReceipts.matches[0], errorCode: "PRIVATE" }] } },
    { stoppedApi: { ...report.stoppedApi, runningContainerCount: 1 } }, { observation: { status: "unknown", code: "PRIVATE" } },
  ]) assert.throws(() => sanitizeReleaseReferenceReport({ ...report, ...patch }), /^Error: release_reference_report_invalid$/u);
  for (const incomplete of [undefined, null, {}, { ...report, current: undefined }, { ...report, current: { status: "observed", code: null } },
    { ...report, observation: { status: "unknown", code: "changed" } }]) assert.equal(releaseReferenceSucceeded(incomplete), false);
});

test("non-string JSON identities and malformed UTF-8 stay local unknowns", async () => {
  for (const [selected, patch] of [[pointerPath, { revision: [currentRevision] }], [currentReceiptPath, { imageDigest: [currentDigest] }], [failedReceiptPath, { revision: [stoppedRevision] }]]) {
    const f = fixture(); updateJson(f, selected, patch); const { report } = await observe(f);
    assert.equal(report.base.status, "observed"); assert.equal(releaseReferenceSucceeded(report), false);
  }
  const f = fixture(); f.entries[basePath].bytes = [255];
  assert.equal((await observe(f)).report.base.code, "text_invalid");
});

test("fixed path arity and non-Linux hosts fail without filesystem or Docker calls", async () => {
  for (const patch of [{ paths: [] }, { paths: [...protectedPaths, "PRIVATE_EXTRA"] }, { paths: [...protectedPaths.slice(0, 3), "/srv/../private.env"] }, { paths: [...protectedPaths.slice(0, 3), "/srv//private.env"] }]) {
    const { report, boundary } = await observe({ ...fixture(), ...patch }); assert.equal(report.base.code, "path_invalid"); assert.equal(boundary.events.length, 0);
  }
  const { report, boundary } = await observe(fixture(), { platform: "win32" }); assert.equal(report.base.code, "platform_unsupported"); assert.equal(boundary.events.length, 0);
});

test("shared environment parser retains quoted, escaped, export and failure semantics when embedded", () => {
  const text = '\uFEFF# ignored\n export A="quoted\\nline\\tend\\\\"\n B=\'literal\\n\'\nC=plain=value\n';
  const parsed = parseEnvironmentText(text);
  assert.equal(parsed.A, "quoted\nline\tend\\"); assert.equal(parsed.B, "literal\\n"); assert.equal(parsed.C, "plain=value");
  assert.equal(Object.getPrototypeOf(parsed), null); assert.equal(Object.isFrozen(parsed), true);
  for (const [input, expected] of [["A=1\nA=2", "environment_file_duplicate_key"], ["bad=1", "environment_file_key_invalid"], ["missing", "environment_file_line_invalid"], ['A="missing', "environment_file_quote_invalid"]]) assert.throws(() => parseEnvironmentText(input), new RegExp(expected, "u"));
  const standalone = Function(`return (${parseEnvironmentText.toString()})`)();
  assert.deepEqual(standalone(text), parsed);
});

test("actual generated self-contained host module runs through fake builtins, with no repository or Docker execution", async () => {
  assert.match(releaseReferenceScript, /node --input-type=module - "\$@"/u);
  const source = releaseReferenceScript.split("<<'STARWARD_FIXED_RELEASE_REFERENCE_PROBE'\n")[1].split("\nSTARWARD_FIXED_RELEASE_REFERENCE_PROBE")[0];
  assert.equal(spawnSync(process.execPath, ["--check", "--input-type=module"], { input: source, encoding: "utf8", windowsHide: true }).status, 0);
  assert.equal(/docker exec|writeFile|mkdir|unlink|readFile|(?:^|\n)\s*source\s|eval\(|fetch\(|pg\.Client|Config\.Env/u.test(source), false, "generated program must keep its fixed read-only boundary");
  for (const variant of ["normal", "missing_current", "unsafe_permissions"]) {
    const f = fixture(); if (variant === "missing_current") delete f.entries[pointerPath]; if (variant === "unsafe_permissions") f.entries[basePath].mode = 0o100666;
    const driver = `import vm from 'node:vm'; import path from 'node:path'; import {createHash} from 'node:crypto';
      const boundary = (${fakeBoundary.toString()})(${JSON.stringify(f)});
      const lines=[], errors=[]; const processFake={argv:['node','-',...${JSON.stringify(protectedPaths)}], platform:'linux', geteuid:()=>1000, stderr:{write:value=>errors.push(value)}};
      const context=vm.createContext({Buffer,TextDecoder,process:processFake,console:{log:value=>lines.push(value)}});
      const program=new vm.SourceTextModule(${JSON.stringify(source)}, {context});
      const modules={
        'node:fs/promises':new vm.SyntheticModule(['lstat','open','opendir'],function(){for(const key of ['lstat','open','opendir'])this.setExport(key,boundary.fs[key]);},{context}),
        'node:fs':new vm.SyntheticModule(['constants'],function(){this.setExport('constants',boundary.constants);},{context}),
        'node:path':new vm.SyntheticModule(['default'],function(){this.setExport('default',path);},{context}),
        'node:crypto':new vm.SyntheticModule(['createHash'],function(){this.setExport('createHash',createHash);},{context}),
        'node:child_process':new vm.SyntheticModule(['execFileSync'],function(){this.setExport('execFileSync',(command,args,options)=>{if(command!=='docker'||options.timeout!==10000||options.maxBuffer!==32768)throw Error('forbidden');return boundary.execute(args);});},{context}),
      };
      await program.link(specifier=>{if(!modules[specifier])throw Error('unapproved import');return modules[specifier];});await program.evaluate();
      process.stdout.write(JSON.stringify({lines,errors,exitCode:processFake.exitCode??0,events:boundary.events.map(value=>value.method)}));`;
    const result = spawnSync(process.execPath, ["--experimental-vm-modules", "--input-type=module"], { input: driver, encoding: "utf8", timeout: 10_000, maxBuffer: 128 * 1024, windowsHide: true });
    assert.equal(result.status, 0, result.stderr); const output = JSON.parse(result.stdout);
    assert.equal(output.exitCode, 0); assert.deepEqual(output.errors, []); assert.equal(output.lines.length, 1);
    const report = sanitizeReleaseReferenceReport(JSON.parse(output.lines[0]));
    assert.equal(releaseReferenceSucceeded(report), variant === "normal");
    assert.doesNotMatch(output.lines[0], privateNeedles);
  }
});

test("native filesystem smoke distinguishes Linux enforcement from Windows unsupported behavior", async t => {
  if (process.platform !== "linux") {
    const { report } = await observe(fixture(), { platform: process.platform });
    assert.equal(report.base.code, "platform_unsupported");
    t.diagnostic("Windows execution verifies fail-closed host selection only; Linux O_NOFOLLOW, inode and permission enforcement need a Linux run.");
    return;
  }
  // Linux-only smoke observes an ordinary, freshly owned file through the real
  // no-follow/nonblocking boundary. It never connects to Docker or a service.
  const directory = await nativeFs.mkdtemp(path.join(os.homedir(), ".starward-reference-test-"));
  t.after(() => nativeFs.rm(directory, { recursive: true, force: true }));
  await nativeFs.chmod(directory, 0o700);
  const file = path.join(directory, "base.env"); await nativeFs.writeFile(file, "STARWARD_ENVIRONMENT=production\n", { mode: 0o600 });
  const identity = () => ({ matchingContainerCount: 0, runningContainerCount: 0, singleMatchingContainer: null });
  const report = sanitizeReleaseReferenceReport(await releaseReferenceProbe([directory, directory, directory, file], {
    fs: nativeFs, constants, path: path.posix, createHash, parseEnvironmentText, apiIdentityProbe: identity, createProtectedDirectoryBoundary, execute: () => assert.fail("Docker forbidden"), platform: "linux", uid: process.geteuid(),
  }));
  assert.equal(report.base.code, "base_invalid"); assert.equal(report.current.code, "base_unavailable");
});
