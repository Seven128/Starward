import { createProtectedDirectoryBoundary } from "./protected-directory.mjs";

// The Engine v1.42 type selector excludes OCI/container/volume inventories.
// Negotiate the known v1.42-v1.51 contract even on a newer compatible server.
export const hostCacheLimits = Object.freeze({ minimumApi: 42, maximumApi: 51, records: 64, parents: 4,
  rawRecords: 2048, rawBytes: 2 * 1024 * 1024, reportBytes: 48 * 1024, deadlineMs: 49_000 });
const hostCacheCodes = Object.freeze([null, "not_observed", "platform_unsupported", "path_invalid", "directory_invalid", "ownership_invalid", "permissions_invalid", "changed", "missing", "permission_denied", "read_failed", "deadline_exceeded", "tool_unavailable", "tool_failed", "tool_timeout", "output_invalid", "output_exceeded", "endpoint_unsupported", "socket_invalid", "storage_root_unsupported", "api_unsupported", "http_failed", "scope_invalid", "category_missing"]);

// Fixed GETs over one selected local socket. No redirects, proxy, arbitrary
// URL, Docker session/bootstrap or request body is supported by this adapter.
export async function readDockerCacheJson(http, socketPath, route, { timeout, maxBytes }) {
  const anchored = typeof socketPath === "string" ? /^\/proc\/self\/fd\/(0|[1-9]\d*)\/docker\.sock$/u.exec(socketPath) : null;
  const heldSocket = anchored && Number.isSafeInteger(Number(anchored[1])) && Number(anchored[1]) <= 2_147_483_647;
  if ((!["/var/run/docker.sock", "/run/docker.sock"].includes(socketPath) && !heldSocket)
    || !/^\/(?:version|v1\.(?:4[2-9]|5[01])\/(?:info|system\/df\?type=build-cache))$/u.test(route)
    || !Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 15_000
    || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > hostCacheLimits.rawBytes) throw new Error("scope_invalid");
  return new Promise((resolve, reject) => {
    let request, response, settled = false, length = 0;
    const chunks = [];
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      response?.destroy(); request?.destroy();
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error("tool_timeout")), timeout);
    try {
      request = http.request({ socketPath, path: route, method: "GET", agent: false, headers: { accept: "application/json", connection: "close" } }, incoming => {
        response = incoming;
        if (incoming.statusCode !== 200) { finish(new Error("http_failed")); return; }
        incoming.on("error", () => finish(new Error("read_failed")));
        incoming.on("aborted", () => finish(new Error("read_failed")));
        incoming.on("data", chunk => {
          length += chunk.length;
          if (length > maxBytes) finish(new Error("output_exceeded"));
          else if (!settled) chunks.push(chunk);
        });
        incoming.on("end", () => {
          if (settled) return;
          try { finish(null, JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)))); }
          catch { finish(new Error("output_invalid")); }
        });
      });
      request.on("error", error => finish(new Error(["EACCES", "EPERM"].includes(error?.code) ? "permission_denied" : error?.code === "ENOENT" ? "missing" : "read_failed")));
      request.end();
    } catch { finish(new Error("read_failed")); }
  });
}

// This projection is also applied independently to the SSH response. Raw IDs,
// descriptions, labels, paths, plugin/registry info and errors never leave it.
export function sanitizeHostCacheReport(report) {
  const fail = () => { throw new Error("host_cache_report_invalid"); };
  const state = value => {
    if (!value || !["observed", "unknown", "failed"].includes(value.status) || !hostCacheCodes.includes(value.code)
      || (value.status === "observed") !== (value.code === null)) fail();
    return { status: value.status, code: value.code };
  };
  const hash = value => value === null || typeof value === "string" && /^[a-f0-9]{64}$/u.test(value) ? value : fail();
  const integer = value => value === null || Number.isSafeInteger(value) && value >= 0 ? value : fail();
  const bool = value => value === null || typeof value === "boolean" ? value : fail();
  const version = value => value === null || typeof value === "string" && /^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.+-]+)?$/u.test(value) && value.length <= 64 ? value : fail();
  const api = value => value === null || typeof value === "string" && /^1\.\d{1,3}$/u.test(value) ? value : fail();
  const time = value => {
    if (value === null) return null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u.test(value) || !Number.isFinite(Date.parse(value))) fail();
    const day = value.slice(0, 10), dayAt = Date.parse(day + "T00:00:00Z");
    if (!Number.isFinite(dayAt) || new Date(dayAt).toISOString().slice(0, 10) !== day) fail();
    return value;
  };
  const types = ["internal", "frontend", "source.local", "source.git.checkout", "exec.cachemount", "regular"];
  const drivers = ["aufs", "btrfs", "devicemapper", "overlay", "overlay2", "overlayfs", "vfs", "zfs", "fuse-overlayfs"];
  const absent = (group, fields) => { if (group.status !== "observed" && fields.some(key => group[key] !== null)) fail(); };
  if (report?.status !== "observed" || report.evidenceScope !== "HOST_DOCKER_CACHE_RECORDS_ONLY" || report.snapshot !== "NON_ATOMIC"
    || report.referenceCompleteness !== "UNVERIFIED" || report.ownershipQualification !== "UNVERIFIED" || report.cleanupAuthorization !== "NONE") fail();
  if (report.builder?.scope !== "ENGINE_INTEGRATED_CACHE_ONLY" || report.builder.driver !== null || report.builder.activeBuildCount !== null
    || report.builder.qualification !== "UNVERIFIED") fail();
  const endpoint = { ...state(report.endpoint), socketSha256: hash(report.endpoint.socketSha256) };
  absent(endpoint, ["socketSha256"]); if (endpoint.status === "observed" && endpoint.socketSha256 === null) fail();
  const engine = { ...state(report.engine), version: version(report.engine.version), maximumApi: api(report.engine.maximumApi), minimumApi: api(report.engine.minimumApi), selectedApi: api(report.engine.selectedApi) };
  absent(engine, ["version", "maximumApi", "minimumApi", "selectedApi"]);
  if (engine.status === "observed") {
    if ([engine.version, engine.maximumApi, engine.minimumApi].some(value => value === null)) fail();
    const maximum = Number(engine.maximumApi.slice(2)), minimum = Number(engine.minimumApi.slice(2)), selected = engine.selectedApi === null ? null : Number(engine.selectedApi.slice(2));
    const expected = Math.min(maximum, hostCacheLimits.maximumApi);
    if (minimum > maximum || selected !== (expected >= hostCacheLimits.minimumApi && expected >= minimum ? expected : null)) fail();
  }
  const daemon = { ...state(report.daemon), identitySha256: hash(report.daemon.identitySha256), storageRootSha256: hash(report.daemon.storageRootSha256), storageDriver: report.daemon.storageDriver };
  if (daemon.storageDriver !== null && !drivers.includes(daemon.storageDriver)) fail();
  absent(daemon, ["identitySha256", "storageRootSha256", "storageDriver"]);
  if (daemon.status === "observed" && (daemon.identitySha256 === null || engine.status !== "observed" || engine.selectedApi === null || endpoint.status !== "observed")) fail();
  const storage = { ...state(report.storage), sameFilesystemAsRelease: bool(report.storage.sameFilesystemAsRelease) };
  absent(storage, ["sameFilesystemAsRelease"]); if (storage.status === "observed" && storage.sameFilesystemAsRelease === null) fail();
  const source = report.cache;
  const cache = { ...state(source), reportedCount: integer(source.reportedCount), returnedCount: integer(source.returnedCount), omittedCount: integer(source.omittedCount), responseSha256: hash(source.responseSha256), records: [] };
  if (!Array.isArray(source.records) || source.records.length > hostCacheLimits.records) fail();
  const seen = new Set(); let last = "";
  for (const row of source.records) {
    const value = { idSha256: hash(row.idSha256), type: row.type, inUse: bool(row.inUse), shared: bool(row.shared), sizeBytes: integer(row.sizeBytes),
      createdAt: time(row.createdAt), lastUsedAt: time(row.lastUsedAt), usageCount: integer(row.usageCount), descriptionSha256: hash(row.descriptionSha256),
      parentCount: integer(row.parentCount), parentsSha256: row.parentsSha256 };
    if (!value.idSha256 || value.idSha256 <= last || seen.has(value.idSha256) || value.type !== null && !types.includes(value.type)) fail();
    last = value.idSha256; seen.add(last);
    if (value.parentsSha256 !== null) {
      if (!Array.isArray(value.parentsSha256) || value.parentsSha256.length > hostCacheLimits.parents || value.parentsSha256.some(item => !hash(item))
        || value.parentCount === null || value.parentsSha256.length !== Math.min(value.parentCount, hostCacheLimits.parents)
        || new Set(value.parentsSha256).size !== value.parentsSha256.length || value.parentsSha256.some((item, index, array) => index > 0 && item <= array[index - 1])) fail();
      value.parentsSha256 = [...value.parentsSha256];
    } else if (value.parentCount !== null) fail();
    cache.records.push(value);
  }
  if (cache.status === "observed") {
    if (daemon.status !== "observed" || [cache.reportedCount, cache.returnedCount, cache.omittedCount, cache.responseSha256].some(value => value === null)
      || cache.reportedCount > hostCacheLimits.rawRecords || cache.returnedCount !== cache.records.length || cache.returnedCount !== Math.min(cache.reportedCount, hostCacheLimits.records)
      || cache.omittedCount !== cache.reportedCount - cache.returnedCount) fail();
  } else if (cache.records.length || [cache.reportedCount, cache.returnedCount, cache.omittedCount, cache.responseSha256].some(value => value !== null)) fail();
  const result = { status: "observed", evidenceScope: "HOST_DOCKER_CACHE_RECORDS_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED", ownershipQualification: "UNVERIFIED", cleanupAuthorization: "NONE",
    builder: { scope: "ENGINE_INTEGRATED_CACHE_ONLY", driver: null, activeBuildCount: null, qualification: "UNVERIFIED" }, endpoint, engine, daemon, storage, cache, observation: state(report.observation) };
  if (Buffer.byteLength(JSON.stringify(result)) > hostCacheLimits.reportBytes) fail();
  return result;
}

export async function hostCacheProbe(paths, { fs, constants, path, createProtectedDirectoryBoundary: directoryBoundary, execute, readJson, createHash, platform, uid, now }) {
  const deadline = now() + hostCacheLimits.deadlineMs;
  const empty = () => ({ status: "unknown", code: "not_observed" });
  const emptyEndpoint = code => ({ ...empty(), code, socketSha256: null });
  const emptyEngine = code => ({ ...empty(), code, version: null, maximumApi: null, minimumApi: null, selectedApi: null });
  const emptyDaemon = code => ({ ...empty(), code, identitySha256: null, storageRootSha256: null, storageDriver: null });
  const emptyStorage = code => ({ ...empty(), code, sameFilesystemAsRelease: null });
  const emptyCache = code => ({ ...empty(), code, reportedCount: null, returnedCount: null, omittedCount: null, responseSha256: null, records: [] });
  const report = { status: "observed", evidenceScope: "HOST_DOCKER_CACHE_RECORDS_ONLY", snapshot: "NON_ATOMIC", referenceCompleteness: "UNVERIFIED", ownershipQualification: "UNVERIFIED", cleanupAuthorization: "NONE",
    builder: { scope: "ENGINE_INTEGRATED_CACHE_ONLY", driver: null, activeBuildCount: null, qualification: "UNVERIFIED" },
    endpoint: emptyEndpoint("not_observed"), engine: emptyEngine("not_observed"), daemon: emptyDaemon("not_observed"), storage: emptyStorage("not_observed"), cache: emptyCache("not_observed"), observation: empty() };
  const fail = code => { throw new Error(code); };
  const failure = error => hostCacheCodes.includes(error?.message) && error.message !== null ? error.message
    : ["EACCES", "EPERM"].includes(error?.code) ? "permission_denied" : error?.code === "ENOENT" ? "missing" : "read_failed";
  const hash = value => createHash("sha256").update(value).digest("hex");
  const text = value => typeof value === "string" && value.length > 0 && value.length <= 4096 && !/[\u0000-\u001f\u007f]/u.test(value);
  const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const bool = value => typeof value === "boolean" ? value : null;
  const time = value => {
    if (typeof value !== "string" || value.startsWith("0001-01-01T00:00:00") || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u.test(value) || !Number.isFinite(Date.parse(value))) return null;
    return new Date(Date.parse(value.slice(0, 10) + "T00:00:00Z")).toISOString().slice(0, 10) === value.slice(0, 10) ? value : null;
  };
  const remaining = (maximum = 15_000) => { const value = Math.floor(deadline - now()); if (value <= 0) fail("deadline_exceeded"); return Math.min(value, maximum); };
  const dirs = directoryBoundary({ fs, constants, path, uid });
  // The endpoint and storage directories have separate qualification: a storage
  // observation may fail without revoking a safely held local daemon endpoint.
  const socketDirs = directoryBoundary({ fs, constants, path, uid });
  let release, storageRoot, socketPath, canonicalSocketPath, anchoredSocketPath, socketAlias, socketBefore, identityBefore, versionBefore, socketFailure;
  const socket = async selected => {
    const value = await fs.lstat(selected, { bigint: true });
    if (!value.isSocket() || value.isSymbolicLink() || value.uid !== 0n && value.uid !== BigInt(uid) || (value.mode & 0o002n) !== 0n) fail("socket_invalid");
    return value;
  };
  const sameSocket = (a, b) => ["dev", "ino", "mode", "uid", "gid", "nlink"].every(key => a[key] === b[key]);
  const verifySocket = async () => {
    if (socketFailure) fail(socketFailure);
    try {
      remaining(); await socketDirs.recheckAll();
      if (await fs.realpath(socketPath) !== canonicalSocketPath) fail("changed");
      if (socketAlias) {
        const current = await fs.lstat("/var/run", { bigint: true });
        if (!sameSocket(socketAlias.stat, current) || await fs.readlink("/var/run") !== socketAlias.target) fail("changed");
      }
      if (!sameSocket(socketBefore, await socket(socketPath)) || !sameSocket(socketBefore, await socket(anchoredSocketPath))) fail("changed");
      remaining();
    } catch (error) {
      socketFailure = failure(error); report.endpoint = emptyEndpoint(socketFailure); throw new Error(socketFailure);
    }
  };
  const get = async (route, milliseconds, bytes) => {
    await verifySocket();
    const result = await readJson(anchoredSocketPath, route, { timeout: remaining(milliseconds), maxBytes: bytes });
    await verifySocket();
    remaining(); if (!result || typeof result !== "object" || Array.isArray(result)) fail("output_invalid");
    return result;
  };
  const engine = value => {
    if (!text(value.Version) || value.Version.length > 64 || !/^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.+-]+)?$/u.test(value.Version)
      || !/^1\.\d{1,3}$/u.test(value.ApiVersion) || !/^1\.\d{1,3}$/u.test(value.MinAPIVersion) || value.Os !== "linux") fail("output_invalid");
    const maximum = Number(value.ApiVersion.slice(2)), minimum = Number(value.MinAPIVersion.slice(2));
    if (minimum > maximum) fail("output_invalid");
    const selected = Math.min(maximum, hostCacheLimits.maximumApi);
    return { status: "observed", code: null, version: value.Version, maximumApi: value.ApiVersion, minimumApi: value.MinAPIVersion,
      selectedApi: selected >= hostCacheLimits.minimumApi && selected >= minimum ? `1.${selected}` : null };
  };
  const daemon = value => {
    if (!text(value.ID) || value.ID.length > 256) fail("output_invalid");
    const root = text(value.DockerRootDir) && value.DockerRootDir.startsWith("/") ? value.DockerRootDir : null;
    const drivers = ["aufs", "btrfs", "devicemapper", "overlay", "overlay2", "overlayfs", "vfs", "zfs", "fuse-overlayfs"];
    return { status: "observed", code: null, identitySha256: hash(value.ID), storageRootSha256: root ? hash(root) : null,
      storageDriver: drivers.includes(value.Driver) ? value.Driver : null };
  };
  try {
    if (platform !== "linux" || !Number.isSafeInteger(uid) || uid < 0 || !["O_NOFOLLOW", "O_NONBLOCK", "O_DIRECTORY"].every(key => Number.isInteger(constants[key]) && constants[key] > 0)) fail("platform_unsupported");
    if (!Array.isArray(paths) || paths.length !== 4 || !paths.every(dirs.canonical)) fail("path_invalid");
    try { release = await dirs.hold(paths[1]); } catch (error) { report.storage = emptyStorage(failure(error)); }
    try {
      let output;
      try {
        output = execute("docker", ["context", "inspect", "--format", "{{json .Endpoints.docker.Host}}"], {
          encoding: "utf8", timeout: remaining(3_000), killSignal: "SIGKILL", maxBuffer: 4_096,
          env: { PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", LC_ALL: "C" }, stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error) {
        if (error?.message === "deadline_exceeded") throw error;
        if (error?.code === "ENOENT") fail("tool_unavailable");
        if (["EACCES", "EPERM"].includes(error?.code)) fail("permission_denied");
        if (error?.code === "ETIMEDOUT" || error?.signal === "SIGKILL") fail(now() >= deadline ? "deadline_exceeded" : "tool_timeout");
        if (["ENOBUFS", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"].includes(error?.code)) fail("output_exceeded");
        fail("tool_failed");
      }
      remaining(); if (typeof output !== "string") fail("output_invalid");
      if (Buffer.byteLength(output) > 4096) fail("output_exceeded");
      let endpoint; try { endpoint = JSON.parse(output); } catch { fail("output_invalid"); }
      if (!["unix:///var/run/docker.sock", "unix:///run/docker.sock"].includes(endpoint)) fail("endpoint_unsupported");
      socketPath = endpoint.slice("unix://".length);
      canonicalSocketPath = await fs.realpath(socketPath);
      if ((socketPath === "/run/docker.sock" && canonicalSocketPath !== socketPath)
        || (socketPath === "/var/run/docker.sock" && ![socketPath, "/run/docker.sock"].includes(canonicalSocketPath))) fail("endpoint_unsupported");
      if (socketPath === "/var/run/docker.sock") {
        await socketDirs.hold("/var");
        const parent = await fs.lstat("/var/run", { bigint: true });
        if (parent.isSymbolicLink()) {
          const target = await fs.readlink("/var/run");
          if (canonicalSocketPath !== "/run/docker.sock" || !["/run", "../run"].includes(target)) fail("endpoint_unsupported");
          if (parent.uid !== 0n && parent.uid !== BigInt(uid)) fail("ownership_invalid");
          socketAlias = { stat: parent, target };
        } else if (!parent.isDirectory() || canonicalSocketPath !== socketPath) fail("directory_invalid");
      }
      const parent = await socketDirs.hold(path.dirname(canonicalSocketPath));
      anchoredSocketPath = `/proc/self/fd/${parent.handle.fd}/docker.sock`;
      socketBefore = await socket(socketPath);
      if (!sameSocket(socketBefore, await socket(anchoredSocketPath))) fail("changed");
      await verifySocket();
      report.endpoint = { status: "observed", code: null, socketSha256: hash(canonicalSocketPath) };
    } catch (error) {
      const code = failure(error);
      report.endpoint = emptyEndpoint(code); throw new Error(code);
    }
    versionBefore = engine(await get("/version", 4_000, 16_384)); report.engine = versionBefore;
    if (!versionBefore.selectedApi) fail("api_unsupported");
    const prefix = `/v${versionBefore.selectedApi}`;
    const info = await get(prefix + "/info", 5_000, 131_072);
    identityBefore = daemon(info); report.daemon = identityBefore;
    // Only the fixed ordinary Linux Docker root is considered for filesystem
    // relevance. No configured arbitrary storage path is followed or read.
    if (release && info.DockerRootDir === "/var/lib/docker") {
      try { storageRoot = await dirs.hold("/var/lib/docker"); report.storage = { status: "observed", code: null, sameFilesystemAsRelease: storageRoot.stat.dev === release.stat.dev }; }
      catch (error) { report.storage = emptyStorage(failure(error)); }
    } else if (release) report.storage = emptyStorage("storage_root_unsupported");
    try {
      const payload = await get(prefix + "/system/df?type=build-cache", 15_000, hostCacheLimits.rawBytes);
      if (["Images", "Containers", "Volumes"].some(key => payload[key] !== undefined && payload[key] !== null && (!Array.isArray(payload[key]) || payload[key].length > 0))) fail("scope_invalid");
      if (!Array.isArray(payload.BuildCache)) fail("category_missing");
      if (payload.BuildCache.length > hostCacheLimits.rawRecords) fail("output_exceeded");
      const ids = new Set(), projected = [], types = ["internal", "frontend", "source.local", "source.git.checkout", "exec.cachemount", "regular"];
      for (const row of payload.BuildCache) {
        if (!row || typeof row !== "object" || !text(row.ID) || row.ID.length > 256 || ids.has(row.ID)) fail("output_invalid");
        ids.add(row.ID);
        const parents = Array.isArray(row.Parents) && row.Parents.every(value => text(value) && value.length <= 256) && new Set(row.Parents).size === row.Parents.length ? row.Parents.map(hash).sort() : null;
        projected.push({ idSha256: hash(row.ID), type: types.includes(row.Type) ? row.Type : null, inUse: bool(row.InUse), shared: bool(row.Shared), sizeBytes: integer(row.Size),
          createdAt: time(row.CreatedAt), lastUsedAt: time(row.LastUsedAt), usageCount: integer(row.UsageCount),
          descriptionSha256: typeof row.Description === "string" && row.Description.length <= 16_384 ? hash(row.Description) : null,
          parentCount: parents?.length ?? null, parentsSha256: parents ? parents.slice(0, hostCacheLimits.parents) : null });
      }
      projected.sort((a, b) => a.idSha256 < b.idSha256 ? -1 : a.idSha256 > b.idSha256 ? 1 : 0);
      if (new Set(projected.map(row => row.idSha256)).size !== projected.length) fail("output_invalid");
      report.cache = { status: "observed", code: null, reportedCount: projected.length, returnedCount: Math.min(projected.length, hostCacheLimits.records), omittedCount: Math.max(0, projected.length - hostCacheLimits.records), responseSha256: hash(JSON.stringify(payload)), records: projected.slice(0, hostCacheLimits.records) };
      if (Buffer.byteLength(JSON.stringify(report)) > hostCacheLimits.reportBytes) report.cache = emptyCache("output_exceeded");
    } catch (error) { report.cache = emptyCache(failure(error)); }
    try {
      const versionAfter = engine(await get("/version", 4_000, 16_384));
      const identityAfter = daemon(await get(prefix + "/info", 5_000, 131_072));
      if (JSON.stringify(versionAfter) !== JSON.stringify(versionBefore) || JSON.stringify(identityAfter) !== JSON.stringify(identityBefore)) fail("changed");
      report.observation = { status: "observed", code: null };
    } catch (error) {
      const code = failure(error); report.daemon = emptyDaemon(code); report.cache = emptyCache(code); report.storage = emptyStorage(code); report.observation = { status: "unknown", code };
    }
    try { await dirs.recheckAll(); } catch (error) { report.storage = emptyStorage(failure(error)); }
    try { await verifySocket(); } catch (error) {
      const code = failure(error); report.daemon = emptyDaemon(code); report.cache = emptyCache(code); report.storage = emptyStorage(code); report.observation = { status: "unknown", code };
    }
  } catch (error) {
    const code = failure(error);
    if (report.engine.status !== "observed") report.engine = emptyEngine(code);
    if (report.daemon.status !== "observed") report.daemon = emptyDaemon(code);
    report.cache = emptyCache(code); report.observation = { status: "unknown", code };
  } finally {
    try { await socketDirs.close(); } catch {
      report.endpoint = emptyEndpoint("read_failed"); report.daemon = emptyDaemon("read_failed"); report.cache = emptyCache("read_failed"); report.storage = emptyStorage("read_failed"); report.observation = { status: "unknown", code: "read_failed" };
    }
    try { await dirs.close(); } catch { report.observation = { status: "unknown", code: "read_failed" }; }
  }
  return report;
}

export function hostCacheSucceeded(report) {
  try {
    const clean = sanitizeHostCacheReport(report);
    return [clean.endpoint, clean.engine, clean.daemon, clean.cache, clean.observation].every(group => group.status === "observed");
  } catch { return false; }
}

// GNU timeout also covers stalled filesystem operations. Cancellation bounds
// userspace only; it cannot promise cancellation of daemon work already begun.
export const hostCacheScript = `#!/bin/sh
set -eu
if ! command -v timeout >/dev/null 2>&1; then
  printf '%s\\n' 'host_cache_timeout_unavailable' >&2
  exit 65
fi
if timeout --signal=KILL 50s node --input-type=module - "$@" 2>/dev/null <<'STARWARD_FIXED_HOST_CACHE_PROBE'
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const hostCacheLimits = ${JSON.stringify(hostCacheLimits)};
const hostCacheCodes = ${JSON.stringify(hostCacheCodes)};
const readDockerCacheJson = (${readDockerCacheJson.toString()});
try {
  const report = await (${hostCacheProbe.toString()})(process.argv.slice(2), {
    fs, constants, path: path.posix, createProtectedDirectoryBoundary: (${createProtectedDirectoryBoundary.toString()}),
    execute: (command, args, options) => execFileSync(command, args, options),
    readJson: (socket, route, options) => readDockerCacheJson(http, socket, route, options), createHash,
    platform: process.platform, uid: process.geteuid?.(), now: () => performance.now(),
  });
  console.log(JSON.stringify((${sanitizeHostCacheReport.toString()})(report)));
} catch { process.exitCode = 65; }
STARWARD_FIXED_HOST_CACHE_PROBE
then
  exit 0
else
  result=$?
  case "$result" in
    124|137) printf '%s\\n' 'host_cache_deadline_exceeded' >&2 ;;
    *) printf '%s\\n' 'host_cache_failed' >&2 ;;
  esac
  exit 65
fi
`;
