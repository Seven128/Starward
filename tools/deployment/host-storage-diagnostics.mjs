import { createProtectedDirectoryBoundary } from "./protected-directory.mjs";

// Fixed aggregate observation. Filesystem allocation, du allocation and Docker
// rounded estimates have different coverage and must never be added together or
// treated as a deletion/host-readiness decision. No file payload is read here.
export async function hostStorageProbe(paths, { fs, constants, path, createProtectedDirectoryBoundary: directoryBoundary, execute, platform, uid, now }) {
  const deadline = now() + 49_000;
  const roots = ["INBOX", "RELEASE", "CANDIDATE"];
  const classes = { Images: "Images", Containers: "Containers", "Local Volumes": "LocalVolumes", "Build Cache": "BuildCache" };
  const empty = () => ({ status: "unknown", code: "not_observed" });
  const emptyDirectory = () => ({ ...empty(), allocatedBytes: null, sameFilesystemAsRelease: null });
  const emptyClass = () => ({ ...empty(), total: null, active: null, size: null, reclaimable: null });
  const report = {
    status: "observed", evidenceScope: "HOST_STORAGE_AGGREGATES_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED", cleanupAuthorization: "NONE",
    filesystem: { ...empty(), totalBytes: null, usedBytes: null, availableBytes: null },
    directories: { INBOX: emptyDirectory(), RELEASE: emptyDirectory(), CANDIDATE: emptyDirectory() },
    docker: { ...empty(), Images: emptyClass(), Containers: emptyClass(), LocalVolumes: emptyClass(), BuildCache: emptyClass() },
    observation: empty(),
  };
  const fail = code => { throw new Error(code); };
  const mark = (target, code, status = "unknown") => { target.status = status; target.code = code; };
  const failure = error => {
    const own = ["path_invalid", "directory_invalid", "ownership_invalid", "permissions_invalid", "changed", "deadline_exceeded", "output_invalid", "output_exceeded"];
    if (own.includes(error?.message)) return error.message;
    if (error?.code === "ENOENT") return "missing";
    if (["EACCES", "EPERM"].includes(error?.code)) return "permission_denied";
    return "read_failed";
  };
  const dirs = directoryBoundary({ fs, constants, path, uid });
  const groups = [report.filesystem, ...Object.values(report.directories), report.docker, ...Object.values(classes).map(key => report.docker[key]), report.observation];
  if (platform !== "linux" || !Number.isSafeInteger(uid) || uid < 0 || !["O_NOFOLLOW", "O_NONBLOCK", "O_DIRECTORY"].every(key => Number.isInteger(constants[key]) && constants[key] > 0)) {
    for (const group of groups) mark(group, "platform_unsupported", "failed");
    return report;
  }
  // Preserve the existing four-path transport shape; the base descriptor is
  // validated syntactically only and is never opened or read by this probe.
  if (!Array.isArray(paths) || paths.length !== 4 || !paths.every(dirs.canonical)) {
    for (const group of groups) mark(group, "path_invalid", "failed");
    return report;
  }
  const number = value => {
    if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(value)) fail("output_invalid");
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 0) fail("output_invalid");
    return result;
  };
  const count = value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : number(value);
  const sizePattern = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:B|kB|MB|GB|TB|PB|EB)$/u;
  const reclaimablePattern = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:B|kB|MB|GB|TB|PB|EB)(?: \((?:0|[1-9][0-9]?|100)%\))?$/u;
  const run = (command, args, milliseconds, bytes, held) => {
    const remaining = Math.floor(deadline - now());
    if (remaining <= 0) fail("deadline_exceeded");
    try {
      const result = execute(command, args, {
        encoding: "utf8", timeout: Math.min(milliseconds, remaining), killSignal: "SIGKILL", maxBuffer: bytes,
        env: { PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", LC_ALL: "C" },
        stdio: held ? ["ignore", "pipe", "pipe", held.handle.fd] : ["ignore", "pipe", "pipe"],
      });
      if (typeof result !== "string") fail("output_invalid");
      if (Buffer.byteLength(result, "utf8") > bytes) fail("output_exceeded");
      if (now() > deadline) fail("deadline_exceeded");
      return result;
    } catch (error) {
      if (["output_invalid", "output_exceeded", "deadline_exceeded"].includes(error?.message)) throw error;
      if (error?.code === "ENOENT") fail("tool_unavailable");
      if (["EACCES", "EPERM"].includes(error?.code)) fail("tool_permission_denied");
      if (error?.code === "ETIMEDOUT" || error?.signal === "SIGKILL") fail(now() >= deadline ? "deadline_exceeded" : "tool_timeout");
      if (error?.code === "ENOBUFS" || error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") fail("output_exceeded");
      fail("tool_failed");
    }
  };
  const commandFailure = error => ["tool_unavailable", "tool_permission_denied", "tool_timeout", "tool_failed"].includes(error?.message) ? error.message : failure(error);
  const heldRoots = new Map(), invalidRoots = new Map();
  const directoryUnknown = (key, code) => Object.assign(report.directories[key], { status: "unknown", code, allocatedBytes: null, sameFilesystemAsRelease: null });
  const filesystemUnknown = code => Object.assign(report.filesystem, { status: "unknown", code, totalBytes: null, usedBytes: null, availableBytes: null });
  try {
    // Obtain each root independently, preserving useful observations when an
    // unrelated deployment root is absent or unsafe.
    for (const [index, key] of roots.entries()) {
      try { heldRoots.set(key, await dirs.hold(paths[index])); }
      catch (error) { const code = failure(error); invalidRoots.set(key, code); directoryUnknown(key, code); }
    }
    const release = heldRoots.get("RELEASE");
    if (!release) filesystemUnknown(invalidRoots.get("RELEASE"));
    else {
      try {
        await dirs.hold(paths[1]);
        const output = run("df", ["-B1", "--output=size,used,avail", "--", "/proc/self/fd/3/."], 3_000, 4_096, release);
        const match = output.match(/^\s*1B-blocks\s+Used\s+Avail\s*\r?\n\s*(\d+)\s+(\d+)\s+(\d+)\s*\r?\n?$/u);
        if (!match) fail("output_invalid");
        const [totalBytes, usedBytes, availableBytes] = match.slice(1).map(number);
        if (usedBytes > totalBytes || availableBytes > totalBytes) fail("output_invalid");
        await dirs.hold(paths[1]);
        Object.assign(report.filesystem, { status: "observed", code: null, totalBytes, usedBytes, availableBytes });
      } catch (error) { filesystemUnknown(commandFailure(error)); }
    }
    for (const [index, key] of roots.entries()) {
      const held = heldRoots.get(key);
      if (!held) continue;
      try {
        await dirs.hold(paths[index]);
        const output = run("du", ["-P", "-x", "-B1", "-s", "--", "/proc/self/fd/3/."], 8_000, 4_096, held);
        const match = output.match(/^(\d+)[\t ]+\/proc\/self\/fd\/3\/\.\r?\n?$/u);
        if (!match) fail("output_invalid");
        const allocatedBytes = number(match[1]);
        await dirs.hold(paths[index]);
        Object.assign(report.directories[key], { status: "observed", code: null, allocatedBytes, sameFilesystemAsRelease: release ? held.stat.dev === release.stat.dev : null });
      } catch (error) { const code = commandFailure(error); invalidRoots.set(key, code); directoryUnknown(key, code); }
    }
    try {
      const output = run("docker", ["system", "df", "--format", "{{json .}}"], 15_000, 16_384);
      const lines = output.trim() ? output.trim().split(/\r?\n/u) : [];
      const seen = new Set();
      let invalid = false;
      for (const line of lines) {
        let value;
        try { value = JSON.parse(line); } catch { invalid = true; continue; }
        if (!value || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(classes, value.Type)) { invalid = true; continue; }
        const key = classes[value.Type], group = report.docker[key];
        if (seen.has(key)) { Object.assign(group, { ...emptyClass(), code: "output_invalid" }); invalid = true; continue; }
        seen.add(key);
        try {
          const total = count(value.TotalCount), active = count(value.Active);
          if (active > total || typeof value.Size !== "string" || value.Size.length > 48 || !sizePattern.test(value.Size) || typeof value.Reclaimable !== "string" || value.Reclaimable.length > 56 || !reclaimablePattern.test(value.Reclaimable)) fail("output_invalid");
          Object.assign(group, { status: "observed", code: null, total, active, size: value.Size, reclaimable: value.Reclaimable });
        } catch { mark(group, "output_invalid"); invalid = true; }
      }
      for (const key of Object.values(classes)) if (!seen.has(key)) mark(report.docker[key], "category_missing");
      const complete = Object.values(classes).every(key => report.docker[key].status === "observed");
      mark(report.docker, invalid ? "output_invalid" : complete ? null : "category_missing", invalid || !complete ? "unknown" : "observed");
    } catch (error) {
      const code = commandFailure(error); mark(report.docker, code);
      for (const key of Object.values(classes)) mark(report.docker[key], code);
    }
    // Only directory identity, owner and mode are stable enough to recheck;
    // descendant mutations remain possible and the snapshot stays NON_ATOMIC.
    let observationFailure = null;
    for (const [index, key] of roots.entries()) {
      if (!heldRoots.has(key)) continue;
      try { await dirs.hold(paths[index]); }
      catch (error) {
        const code = failure(error); observationFailure ??= code; invalidRoots.set(key, code); directoryUnknown(key, code);
        if (key === "RELEASE") filesystemUnknown(code);
      }
    }
    if (invalidRoots.has("RELEASE")) {
      // A failed du does not invalidate df's independent observation. Only a
      // failed identity recheck removes a previously observed release device.
      try { if (release) await dirs.hold(paths[1]); }
      catch {
        for (const key of roots) report.directories[key].sameFilesystemAsRelease = null;
      }
    }
    mark(report.observation, observationFailure, observationFailure ? "unknown" : "observed");
    return report;
  } finally {
    try { await dirs.close(); }
    catch { mark(report.observation, "read_failed"); }
  }
}

// The runner reconstructs this projection independently. Never carry through
// stderr, paths, devices, IDs, names, Docker JSON extras or arbitrary error text.
export function sanitizeHostStorageReport(report) {
  const fail = () => { throw new Error("host_storage_report_invalid"); };
  const codes = [null, "not_observed", "platform_unsupported", "path_invalid", "directory_invalid", "ownership_invalid", "permissions_invalid", "changed", "missing", "permission_denied", "read_failed", "deadline_exceeded", "tool_unavailable", "tool_permission_denied", "tool_timeout", "tool_failed", "output_invalid", "output_exceeded", "category_missing"];
  const status = value => {
    if (!value || !["observed", "unknown", "failed"].includes(value.status) || !codes.includes(value.code) || ((value.status === "observed") !== (value.code === null))) fail();
    return { status: value.status, code: value.code };
  };
  const integer = value => value === null || (Number.isSafeInteger(value) && value >= 0) ? value : fail();
  const bool = value => value === null || typeof value === "boolean" ? value : fail();
  const native = (value, reclaimable = false) => {
    const pattern = reclaimable ? /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:B|kB|MB|GB|TB|PB|EB)(?: \((?:0|[1-9][0-9]?|100)%\))?$/u : /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:B|kB|MB|GB|TB|PB|EB)$/u;
    return value === null || (typeof value === "string" && value.length <= (reclaimable ? 56 : 48) && pattern.test(value)) ? value : fail();
  };
  if (report?.status !== "observed" || report.evidenceScope !== "HOST_STORAGE_AGGREGATES_ONLY" || report.snapshot !== "NON_ATOMIC" || report.referenceCompleteness !== "UNVERIFIED" || report.cleanupAuthorization !== "NONE") fail();
  const filesystem = { ...status(report.filesystem), totalBytes: integer(report.filesystem.totalBytes), usedBytes: integer(report.filesystem.usedBytes), availableBytes: integer(report.filesystem.availableBytes) };
  const directories = {}, docker = { ...status(report.docker) };
  const hasData = value => Object.entries(value).some(([key, field]) => !["status", "code"].includes(key) && field !== null);
  if (filesystem.status === "observed" ? [filesystem.totalBytes, filesystem.usedBytes, filesystem.availableBytes].some(value => value === null) || filesystem.usedBytes > filesystem.totalBytes || filesystem.availableBytes > filesystem.totalBytes : hasData(filesystem)) fail();
  for (const key of ["INBOX", "RELEASE", "CANDIDATE"]) {
    const source = report.directories?.[key];
    const group = { ...status(source), allocatedBytes: integer(source.allocatedBytes), sameFilesystemAsRelease: bool(source.sameFilesystemAsRelease) };
    if (group.status === "observed" ? group.allocatedBytes === null : hasData(group)) fail();
    directories[key] = group;
  }
  for (const key of ["Images", "Containers", "LocalVolumes", "BuildCache"]) {
    const source = report.docker[key];
    const group = { ...status(source), total: integer(source.total), active: integer(source.active), size: native(source.size), reclaimable: native(source.reclaimable, true) };
    if (group.status === "observed" ? [group.total, group.active, group.size, group.reclaimable].some(value => value === null) || group.active > group.total : hasData(group)) fail();
    docker[key] = group;
  }
  if (directories.RELEASE.sameFilesystemAsRelease === false) fail();
  const categories = ["Images", "Containers", "LocalVolumes", "BuildCache"].map(key => docker[key]);
  if (docker.status === "observed" && !categories.every(group => group.status === "observed")) fail();
  if (docker.code === "category_missing" && !categories.some(group => group.status === "unknown" && group.code === "category_missing")) fail();
  if (["tool_unavailable", "tool_permission_denied", "tool_timeout", "tool_failed", "output_exceeded", "deadline_exceeded", "platform_unsupported", "path_invalid"].includes(docker.code) && !categories.every(group => group.status === docker.status && group.code === docker.code)) fail();
  return { status: "observed", evidenceScope: "HOST_STORAGE_AGGREGATES_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED", cleanupAuthorization: "NONE", filesystem, directories, docker, observation: status(report.observation) };
}

export function hostStorageSucceeded(report) {
  try {
    const clean = sanitizeHostStorageReport(report);
    return [clean.filesystem, ...Object.values(clean.directories), clean.docker, clean.observation].every(group => group.status === "observed" && group.code === null) &&
      Object.values(clean.directories).every(group => typeof group.sameFilesystemAsRelease === "boolean") && clean.directories.RELEASE.sameFilesystemAsRelease === true;
  } catch { return false; }
}

// GNU timeout bounds this diagnostic process, including a stalled filesystem
// call. Killing its userspace process cannot promise cancellation of kernel I/O
// or work already submitted to the Docker daemon. Stderr is fixed codes only.
export const hostStorageScript = `#!/bin/sh
set -eu
if ! command -v timeout >/dev/null 2>&1; then
  printf '%s\\n' 'host_storage_timeout_unavailable' >&2
  exit 65
fi
if timeout --signal=KILL 50s node --input-type=module - "$@" 2>/dev/null <<'STARWARD_FIXED_HOST_STORAGE_PROBE'
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
try {
  const report = await (${hostStorageProbe.toString()})(process.argv.slice(2), {
    fs, constants, path: path.posix, createProtectedDirectoryBoundary: (${createProtectedDirectoryBoundary.toString()}),
    execute: (command, args, options) => execFileSync(command, args, options),
    platform: process.platform, uid: process.geteuid?.(), now: () => performance.now(),
  });
  console.log(JSON.stringify((${sanitizeHostStorageReport.toString()})(report)));
} catch {
  process.exitCode = 65;
}
STARWARD_FIXED_HOST_STORAGE_PROBE
then
  exit 0
else
  result=$?
  case "$result" in
    124|137) printf '%s\\n' 'host_storage_deadline_exceeded' >&2 ;;
    *) printf '%s\\n' 'host_storage_failed' >&2 ;;
  esac
  exit 65
fi
`;
