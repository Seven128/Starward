import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { createProtectedDirectoryBoundary } from "./protected-directory.mjs";
import { hostCacheLimits, hostCacheProbe, hostCacheScript, hostCacheSucceeded, readDockerCacheJson, sanitizeHostCacheReport } from "./host-cache-diagnostics.mjs";

const paths = ["/srv/private-inbox", "/srv/private-release", "/srv/private-candidates", "/srv/private-base.env"];
const C = { O_RDONLY: 0, O_NOFOLLOW: 131072, O_NONBLOCK: 2048, O_DIRECTORY: 65536 };
const hash = value => createHash("sha256").update(value).digest("hex");
const row = (id = "PRIVATE_cache_a") => ({ ID: id, Type: "source.local", InUse: false, Shared: true, Size: 0,
  CreatedAt: "2026-10-01T11:22:33.123456789+08:00", LastUsedAt: null, UsageCount: 0, Description: "PRIVATE_description contains /srv/private-source and PRIVATE_token", Parents: [] });

function fixture(patch = {}) {
  const events = [], handles = new Map(); let fd = 10, clock = 0, versions = 0, infos = 0, socketReads = 0;
  const entries = new Map(["/", "/srv", paths[0], paths[1], paths[2], "/var", "/var/lib", "/var/lib/docker", "/run", "/var/run"].map((name, index) => [name, { ino: index + 1, dev: 1, mode: name.startsWith("/srv/private") ? 0o40700 : 0o40755 }]));
  entries.set("/run", { ...entries.get("/run"), mode: patch.parentMode ?? 0o40755, uid: patch.parentUid ?? 0 });
  entries.set("/var", { ...entries.get("/var"), mode: patch.varMode ?? 0o40755 });
  if (!patch.ordinaryVarRun) entries.set("/var/run", { ...entries.get("/var/run"), type: "symlink", mode: 0o120777 });
  const stat = entry => ({ dev: BigInt(entry.dev ?? 1), ino: BigInt(entry.ino), uid: BigInt(entry.uid ?? 0), gid: BigInt(entry.gid ?? 0), mode: BigInt(entry.mode), nlink: 1n,
    isSymbolicLink: () => entry.type === "symlink", isDirectory: () => !entry.type, isSocket: () => entry.type === "socket" });
  const fs = {
    async lstat(selected, options) {
      assert.equal(options.bigint, true); events.push(["lstat", selected]);
      const anchored = selected.match(/^\/proc\/self\/fd\/(\d+)\/docker\.sock$/u);
      if (anchored) {
        const parent = handles.get(Number(anchored[1])); assert.ok(parent && !parent.closed);
        selected = path.posix.join(parent.selected, "docker.sock");
      }
      if (["/var/run/docker.sock", "/run/docker.sock"].includes(selected)) {
        socketReads += 1;
        if (patch.socketMissing) throw Object.assign(new Error("PRIVATE_socket_missing"), { code: "ENOENT" });
        return stat({ ino: patch.socketChanged && socketReads > 1 ? 91 : 90, mode: patch.socketMode ?? 0o140660, type: patch.socketType ?? "socket" });
      }
      if (patch.storageDenied && selected === "/var/lib/docker") throw Object.assign(new Error("PRIVATE_permission_error"), { code: "EACCES" });
      if (patch.releaseChanged && infos > 1 && selected === paths[1]) return stat({ ...entries.get(selected), ino: 199 });
      if (patch.parentChanged && infos > 1 && selected === "/run") return stat({ ...entries.get(selected), ino: 299 });
      if (!entries.has(selected)) throw Object.assign(new Error("PRIVATE_missing_error"), { code: "ENOENT" });
      return stat(entries.get(selected));
    },
    async realpath(selected) {
      events.push(["realpath", selected]);
      if (patch.canonicalSocket) return patch.canonicalSocket;
      if (selected === "/var/run/docker.sock") return patch.ordinaryVarRun ? selected : "/run/docker.sock";
      return selected;
    },
    async readlink(selected) {
      assert.equal(selected, "/var/run"); events.push(["readlink", selected]);
      return patch.aliasChanged && infos > 1 ? "/tmp/PRIVATE_foreign" : patch.aliasTarget ?? "/run";
    },
    async open(selected, flags) {
      assert.equal(flags, C.O_DIRECTORY | C.O_NOFOLLOW | C.O_NONBLOCK | C.O_RDONLY);
      if (selected !== "/") {
        const match = selected.match(/^\/proc\/self\/fd\/(\d+)\/([^/]+)$/u);
        assert.ok(match); const parent = handles.get(Number(match[1])); assert.ok(parent && !parent.closed);
        selected = path.posix.join(parent.selected, match[2]);
      }
      const entry = entries.get(selected); assert.ok(entry); const key = fd++;
      const record = { selected, closed: false }; handles.set(key, record); events.push(["open", selected]);
      return { fd: key, async stat(options) { assert.equal(options.bigint, true); assert.equal(record.closed, false); return stat(entry); }, async close() {
        record.closed = true; events.push(["close", selected]);
        if (patch.parentCloseFailure && selected === "/run") throw new Error("PRIVATE_close_failure");
      } };
    },
  };
  const version = { Version: "29.5.3", ApiVersion: "1.56", MinAPIVersion: "1.44", Os: "linux", Components: [{ Details: { PRIVATE_token: "PRIVATE_registry" } }] };
  const info = { ID: "PRIVATE_daemon_id", DockerRootDir: "/var/lib/docker", Driver: "overlay2", RegistryConfig: { PRIVATE_token: "PRIVATE_registry" }, Plugins: ["PRIVATE_plugin"] };
  const execute = (command, args, options) => {
    assert.equal(command, "docker"); assert.deepEqual(args, ["context", "inspect", "--format", "{{json .Endpoints.docker.Host}}"]);
    assert.deepEqual(Object.keys(options.env).sort(), ["LC_ALL", "PATH"]);
    assert.deepEqual(options.stdio, ["ignore", "pipe", "pipe"]); assert.equal(options.maxBuffer, 4096);
    assert.ok(options.timeout > 0 && options.timeout <= 3000); assert.equal(options.killSignal, "SIGKILL");
    events.push(["execute", command, args]); if (patch.executeError) throw patch.executeError;
    clock += patch.executeDuration ?? 1;
    return patch.endpointOutput ?? JSON.stringify(patch.endpoint ?? "unix:///var/run/docker.sock") + "\n";
  };
  const readJson = async (socket, route, options) => {
    const anchored = socket.match(/^\/proc\/self\/fd\/(\d+)\/docker\.sock$/u); assert.ok(anchored);
    const held = handles.get(Number(anchored[1])); assert.ok(held && !held.closed);
    assert.equal(held.selected, patch.ordinaryVarRun ? "/var/run" : "/run");
    assert.ok(options.timeout > 0 && options.timeout <= 15000); events.push(["socket-get", socket, held.selected]);
    events.push(["get", route, options]); clock += patch.readDuration ?? 1;
    if (route === "/version") {
      assert.equal(options.maxBytes, 16384); versions += 1;
      return { ...version, ...patch.version, ...(versions > 1 ? patch.versionAfter : {}) };
    }
    assert.equal(route.split("/")[1], "v" + (patch.selectedApi ?? "1.51"));
    if (route.endsWith("/info")) { infos += 1; assert.equal(options.maxBytes, 131072); if (infos > 1 && patch.infoAfterError) throw patch.infoAfterError; return { ...info, ...patch.info, ...(infos > 1 ? patch.infoAfter : {}) }; }
    assert.equal(route, "/v" + (patch.selectedApi ?? "1.51") + "/system/df?type=build-cache"); assert.equal(options.maxBytes, hostCacheLimits.rawBytes);
    if (patch.cacheError) throw patch.cacheError;
    return patch.payload ?? { BuildCache: [row(), { ...row("PRIVATE_cache_b"), InUse: true, Shared: false, Size: 1024, Parents: ["PRIVATE_cache_a"] }], Images: null, Containers: null, Volumes: null };
  };
  return { fs, constants: C, path: path.posix, createProtectedDirectoryBoundary, execute, readJson, createHash, platform: "linux", uid: 1000, now: () => clock, events, handles };
}
async function observe(patch) {
  const driver = fixture(patch);
  const raw = await hostCacheProbe(paths, driver);
  const report = sanitizeHostCacheReport(raw);
  assert.ok([...driver.handles.values()].every(handle => handle.closed));
  return { report, driver };
}

test("one bounded Engine-cache read preserves exact values and negotiated compatibility without ownership claims", async () => {
  const { report, driver } = await observe();
  assert.equal(hostCacheSucceeded(report), true); assert.equal(report.engine.selectedApi, "1.51");
  assert.equal(report.engine.maximumApi, "1.56"); assert.equal(report.storage.sameFilesystemAsRelease, true);
  assert.equal(report.cache.reportedCount, 2); assert.equal(report.cache.returnedCount, 2); assert.equal(report.cache.omittedCount, 0);
  const zero = report.cache.records.find(item => item.idSha256 === hash("PRIVATE_cache_a"));
  assert.equal(zero.sizeBytes, 0); assert.equal(zero.inUse, false); assert.equal(zero.shared, true); assert.equal(zero.usageCount, 0);
  assert.equal(zero.createdAt, "2026-10-01T11:22:33.123456789+08:00"); assert.equal(zero.lastUsedAt, null); assert.deepEqual(zero.parentsSha256, []);
  const child = report.cache.records.find(item => item.idSha256 === hash("PRIVATE_cache_b")); assert.deepEqual(child.parentsSha256, [zero.idSha256]);
  assert.equal(report.builder.activeBuildCount, null); assert.equal(report.builder.driver, null);
  assert.equal(report.snapshot, "NON_ATOMIC"); assert.equal(report.ownershipQualification, "UNVERIFIED"); assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.cleanupAuthorization, "NONE");
  assert.equal(driver.events.filter(event => event[0] === "get" && event[1].includes("/system/df")).length, 1);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_|\/srv|\/var|RegistryConfig|Plugins|Description|DockerRootDir/u);
  assert.equal(driver.events.some(event => event[1] === paths[3]), false);
});

test("fixed socket layouts use a live held-parent descriptor for every GET and release all parents", async () => {
  for (const patch of [{}, { endpoint: "unix:///run/docker.sock" }, { ordinaryVarRun: true }, { aliasTarget: "../run" }]) {
    const { report, driver } = await observe(patch);
    assert.equal(hostCacheSucceeded(report), true);
    const canonical = patch.ordinaryVarRun ? "/var/run/docker.sock" : "/run/docker.sock";
    assert.equal(report.endpoint.socketSha256, hash(canonical));
    const gets = driver.events.filter(event => event[0] === "socket-get");
    assert.equal(gets.length, 5);
    assert.ok(gets.every(event => /^\/proc\/self\/fd\/\d+\/docker\.sock$/u.test(event[1])));
    assert.equal(driver.events.some(event => event[0] === "open" && event[1] === path.posix.dirname(canonical)), true);
  }
});

test("foreign canonical paths, nonstandard aliases and unsafe parents dispatch no daemon GET", async () => {
  for (const patch of [{ canonicalSocket: "/tmp/PRIVATE_foreign/docker.sock" }, { aliasTarget: "/tmp/PRIVATE_indirect" },
    { parentMode: 0o40777 }, { parentUid: 2000 }, { varMode: 0o40775 }]) {
    const { report, driver } = await observe(patch);
    assert.equal(hostCacheSucceeded(report), false); assert.equal(report.endpoint.status, "unknown");
    assert.equal(report.cache.status, "unknown"); assert.equal(driver.events.some(event => event[0] === "get"), false);
    assert.doesNotMatch(JSON.stringify(report), /PRIVATE_|\/tmp/u);
  }
});

test("late socket-parent or alias replacement withdraws endpoint/cache qualification and close failure cannot complete", async () => {
  for (const patch of [{ parentChanged: true }, { aliasChanged: true }, { parentCloseFailure: true }]) {
    const { report, driver } = await observe(patch);
    assert.equal(hostCacheSucceeded(report), false); assert.equal(report.endpoint.status, "unknown");
    assert.equal(report.daemon.status, "unknown"); assert.equal(report.cache.status, "unknown");
    assert.equal(report.observation.status, "unknown"); assert.deepEqual(report.cache.records, []);
    assert.ok([...driver.handles.values()].every(handle => handle.closed));
  }
});

test("unsupported endpoints, socket identities and API windows stop before a cache or foreign daemon query", async () => {
  for (const patch of [{ endpoint: "tcp://PRIVATE_remote:2376" }, { endpoint: "unix:///tmp/PRIVATE_socket" }, { socketMode: 0o140666 }, { socketType: "symlink" }]) {
    const { report, driver } = await observe(patch); assert.equal(hostCacheSucceeded(report), false); assert.equal(report.endpoint.status, "unknown");
    assert.equal(driver.events.some(event => event[0] === "get"), false);
  }
  for (const version of [{ ApiVersion: "1.41", MinAPIVersion: "1.24" }, { ApiVersion: "1.56", MinAPIVersion: "1.52" }]) {
    const { report, driver } = await observe({ version });
    assert.equal(report.engine.status, "observed"); assert.equal(report.engine.selectedApi, null); assert.equal(report.cache.code, "api_unsupported");
    assert.equal(driver.events.filter(event => event[0] === "get").length, 1);
  }
  const compatible = await observe({ version: { ApiVersion: "1.44", MinAPIVersion: "1.24" }, selectedApi: "1.44" });
  assert.equal(compatible.report.engine.selectedApi, "1.44"); assert.equal(hostCacheSucceeded(compatible.report), true);
  const absentSocket = await observe({ socketMissing: true }); assert.equal(absentSocket.report.endpoint.code, "missing");
  const absentTool = await observe({ executeError: Object.assign(new Error("PRIVATE_tool_error"), { code: "ENOENT" }) }); assert.equal(absentTool.report.endpoint.code, "tool_unavailable");
  const invalidMetadata = await observe({ endpointOutput: "PRIVATE_invalid_json" }); assert.equal(invalidMetadata.report.endpoint.code, "output_invalid");
});

test("absent cache, duplicate IDs and an ignored type filter stay unknown rather than empty", async () => {
  for (const payload of [{}, { BuildCache: null }, { BuildCache: [row(), row()] }, { BuildCache: [row()], Images: [{ ID: "PRIVATE_oci" }] }, { BuildCache: [row()], Volumes: "PRIVATE_volume" }]) {
    const { report } = await observe({ payload }); assert.equal(hostCacheSucceeded(report), false);
    assert.equal(report.daemon.status, "observed"); assert.equal(report.cache.status, "unknown");
    assert.equal(report.cache.reportedCount, null); assert.deepEqual(report.cache.records, []);
  }
  const { report } = await observe({ payload: { BuildCache: [] } }); assert.equal(hostCacheSucceeded(report), true);
  assert.equal(report.cache.reportedCount, 0); assert.equal(report.cache.returnedCount, 0);
});

test("unsupported individual fields retain independent data without manufacturing zero or parent completeness", async () => {
  const { report } = await observe({ payload: { BuildCache: [{ ...row(), InUse: undefined, Shared: undefined, Size: Number.MAX_SAFE_INTEGER + 1, LastUsedAt: "2026-02-30T00:00:00Z", Parents: null, UsageCount: "0" }] } });
  const actual = report.cache.records[0]; assert.equal(actual.inUse, null); assert.equal(actual.shared, null); assert.equal(actual.sizeBytes, null);
  assert.equal(actual.lastUsedAt, null); assert.equal(actual.usageCount, null); assert.equal(actual.parentCount, null); assert.equal(actual.parentsSha256, null);
  assert.equal(actual.createdAt, row().CreatedAt); assert.equal(report.cache.reportedCount, 1);
  for (const description of ["", "PRIVATE_multiline\nPRIVATE_secret"]){
    const hashed = await observe({ payload: { BuildCache: [{ ...row(), Description: description }] } });
    assert.equal(hashed.report.cache.records[0].descriptionSha256, hash(description));
    assert.doesNotMatch(JSON.stringify(hashed.report), /PRIVATE_/u);
  }
});

test("daemon, negotiated identity or socket changes withdraw the cache snapshot while unrelated filesystem failure preserves it", async () => {
  for (const patch of [{ infoAfter: { ID: "PRIVATE_replacement" } }, { versionAfter: { Version: "29.5.4" } }, { socketChanged: true }, { infoAfterError: new Error("PRIVATE_network_failure") }]) {
    const { report } = await observe(patch); assert.equal(hostCacheSucceeded(report), false);
    assert.equal(report.daemon.status, "unknown"); assert.equal(report.cache.status, "unknown"); assert.deepEqual(report.cache.records, []);
    assert.equal(report.observation.status, "unknown");
  }
  for (const patch of [{ storageDenied: true }, { releaseChanged: true }, { info: { DockerRootDir: "/PRIVATE_custom_storage" } }]) {
    const { report } = await observe(patch); assert.equal(report.storage.status, "unknown"); assert.equal(report.storage.sameFilesystemAsRelease, null);
    assert.equal(report.cache.status, "observed"); assert.equal(report.cache.reportedCount, 2);
  }
});

test("record/parent/output budgets form an explicit bounded subset inside the original SSH envelope", async () => {
  const records = Array.from({ length: hostCacheLimits.records + 1 }, (_, index) => ({ ...row("PRIVATE_cache_" + index), Parents: ["p0", "p1", "p2", "p3", "p4"], LastUsedAt: "2026-10-24T13:44:55.123456789Z", UsageCount: Number.MAX_SAFE_INTEGER, Size: Number.MAX_SAFE_INTEGER }));
  const { report } = await observe({ payload: { BuildCache: records } });
  assert.equal(report.cache.returnedCount, hostCacheLimits.records); assert.equal(report.cache.omittedCount, 1);
  assert.ok(report.cache.records.every(item => item.parentCount === 5 && item.parentsSha256.length === hostCacheLimits.parents));
  assert.ok(Buffer.byteLength(JSON.stringify(report)) <= hostCacheLimits.reportBytes);
  assert.ok(Buffer.byteLength(JSON.stringify(report)) < 64 * 1024);
  assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.cleanupAuthorization, "NONE");
  const oversized = await observe({ payload: { BuildCache: Array.from({ length: hostCacheLimits.rawRecords + 1 }, (_, index) => row("PRIVATE_" + index)) } });
  assert.equal(oversized.report.cache.code, "output_exceeded"); assert.equal(oversized.report.daemon.status, "observed");
  const timeout = await observe({ readDuration: 49_001 }); assert.equal(timeout.report.cache.code, "deadline_exceeded");
  const bodyLimit = await observe({ cacheError: new Error("output_exceeded") }); assert.equal(bodyLimit.report.cache.code, "output_exceeded");
});

test("SSH projection rejects forged qualifications/fields and strips unsolicited payload", async () => {
  const { report } = await observe();
  const stripped = sanitizeHostCacheReport({ ...report, PRIVATE_extra: "PRIVATE_secret", daemon: { ...report.daemon, rawPath: "PRIVATE_private" }, cache: { ...report.cache, records: report.cache.records.map(item => ({ ...item, PRIVATE_description: "PRIVATE_secret" })) } });
  assert.deepEqual(stripped, report);
  for (const change of [value => value.cleanupAuthorization = "ALLOW", value => value.ownershipQualification = "OWNED", value => value.builder.activeBuildCount = 0,
    value => value.cache.records[0].idSha256 = "PRIVATE_secret", value => value.cache.records[0].sizeBytes = -1,
    value => value.cache.returnedCount++, value => value.cache.records.push(value.cache.records[0]), value => value.engine.selectedApi = "1.56"] ) {
    const forged = structuredClone(report); change(forged); assert.throws(() => sanitizeHostCacheReport(forged)); assert.equal(hostCacheSucceeded(forged), false);
  }
});

function fakeHttp({ status = 200, payload = '{}', neverRespond = false, error } = {}) {
  const calls = [], objects = [];
  const http = { request(options, callback) {
    calls.push(options); const request = new EventEmitter(), response = new EventEmitter();
    request.destroy = () => { request.destroyed = true; }; response.destroy = () => { response.destroyed = true; };
    request.end = () => queueMicrotask(() => {
      if (error) { request.emit("error", error); return; } if (neverRespond) return;
      response.statusCode = status; callback(response); if (!response.destroyed) { response.emit("data", Buffer.isBuffer(payload) ? payload : Buffer.from(payload)); response.emit("end"); }
    });
    objects.push({ request, response }); return request;
  } };
  return { http, calls, objects };
}
test("actual HTTP adapter only sends fixed GETs and closes failed/oversized/timed-out streams", async () => {
  const driver = fakeHttp({ payload: '{"BuildCache":[]}' });
  assert.deepEqual(await readDockerCacheJson(driver.http, "/var/run/docker.sock", "/v1.51/system/df?type=build-cache", { timeout: 1000, maxBytes: 100 }), { BuildCache: [] });
  assert.equal(driver.calls[0].method, "GET"); assert.equal(driver.calls[0].agent, false); assert.equal(driver.calls[0].socketPath, "/var/run/docker.sock");
  assert.equal(driver.objects[0].request.destroyed, true); assert.equal(driver.objects[0].response.destroyed, true);
  const anchored = fakeHttp();
  assert.deepEqual(await readDockerCacheJson(anchored.http, "/proc/self/fd/42/docker.sock", "/version", { timeout: 100, maxBytes: 100 }), {});
  assert.equal(anchored.calls[0].socketPath, "/proc/self/fd/42/docker.sock");
  assert.equal(anchored.objects[0].request.destroyed, true); assert.equal(anchored.objects[0].response.destroyed, true);
  for (const [setup, code] of [[{ payload: 'x'.repeat(101) }, "output_exceeded"], [{ status: 302 }, "http_failed"], [{ payload: "PRIVATE_invalid_json" }, "output_invalid"], [{ payload: Buffer.from([255]) }, "output_invalid"], [{ neverRespond: true }, "tool_timeout"], [{ error: new Error("PRIVATE_error") }, "read_failed"]]) {
    const failed = fakeHttp(setup);
    await assert.rejects(readDockerCacheJson(failed.http, "/var/run/docker.sock", "/version", { timeout: 10, maxBytes: 100 }), error => error.message === code);
    assert.equal(failed.objects[0].request.destroyed, true);
  }
  for (const [socket, route] of [["tcp://PRIVATE_host", "/version"], ["/proc/self/fd/-1/docker.sock", "/version"], ["/proc/self/fd/2147483648/docker.sock", "/version"],
    ["/proc/self/fd/42/PRIVATE_other.sock", "/version"], ["/var/run/docker.sock", "/containers/json"], ["/var/run/docker.sock", "/v1.52/system/df?type=build-cache"], ["/var/run/docker.sock", "/v1.51/system/df"]])
    await assert.rejects(readDockerCacheJson({ request() { assert.fail("no request"); } }, socket, route, { timeout: 100, maxBytes: 100 }), /scope_invalid/u);
});

test("generated program compiles and embeds the same protected boundary and adapters", () => {
  const marker = "STARWARD_FIXED_HOST_CACHE_PROBE";
  const body = hostCacheScript.slice(hostCacheScript.indexOf("import * as fs"), hostCacheScript.indexOf("\n" + marker + "\nthen"));
  const result = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], { input: body, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(hostCacheScript.includes(createProtectedDirectoryBoundary.toString())); assert.ok(hostCacheScript.includes(readDockerCacheJson.toString()));
  assert.ok(hostCacheScript.includes("timeout --signal=KILL 50s"));
});

test("the new fixed mode is selectable through the existing main-only staging read-only workflow", () => {
  const workflow = YAML.parse(readFileSync(new URL("../../.github/workflows/backend-diagnostics.yml", import.meta.url), "utf8"));
  assert.ok(workflow.on.workflow_dispatch.inputs.mode.options.includes("host-cache"));
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.concurrency.group, "backend-diagnostics"); assert.equal(workflow.concurrency["cancel-in-progress"], false);
  const job = workflow.jobs.inspect; assert.equal(job.if, "${{ github.ref == 'refs/heads/main' }}"); assert.equal(job.environment, "staging");
  const run = job.steps.find(step => step.run); assert.equal(run.run, "node tools/deployment/run-host-diagnostics.mjs");
  assert.equal(run.env.SSH_CONNECTION, "${{ secrets.STARWARD_DIAGNOSTIC_CONNECTION }}");
});
