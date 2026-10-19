import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { constants } from "node:fs";
import * as nativeFs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProtectedDirectoryBoundary } from "./protected-directory.mjs";
import { hostStorageProbe, hostStorageScript, sanitizeHostStorageReport, hostStorageSucceeded } from "./host-storage-diagnostics.mjs";

const protectedPaths = ["/srv/private-inbox", "/srv/private-release", "/srv/private-candidates", "/srv/private-base.env"];
const privateNeedles = /PRIVATE_|private-|\/srv|\/proc|device|DockerRootDir|imageName|secret|token|stderr/iu;

function fixture() {
  return {
    entries: {
      "/": { ino: 1, uid: 0, mode: 0o40755 }, "/srv": { ino: 2, uid: 0, mode: 0o40755 },
      "/srv/private-inbox": { ino: 3 }, "/srv/private-release": { ino: 4 }, "/srv/private-candidates": { ino: 5, dev: 2 },
    },
    docker: [
      { Type: "Images", TotalCount: "12", Active: "5", Size: "5.45GB", Reclaimable: "3.12GB (57%)", PRIVATE_secret: "PRIVATE_payload" },
      { Type: "Containers", TotalCount: "6", Active: "3", Size: "28.2MB", Reclaimable: "1.9MB (6%)" },
      { Type: "Local Volumes", TotalCount: "8", Active: "8", Size: "755.2MB", Reclaimable: "0B (0%)" },
      { Type: "Build Cache", TotalCount: "0", Active: "0", Size: "0B", Reclaimable: "0B" },
    ],
    duBytes: { INBOX: 32768, RELEASE: 196608, CANDIDATE: 40960 },
    mutations: [], failures: [], paths: protectedPaths,
  };
}

// An actual directory descriptor is required for every df/du child. The fake
// rejects pathname children, file reads, arbitrary tools and an fd merely
// mentioned in a path without a matching inherited stdio entry.
function fakeBoundary(configuration) {
  const entries = structuredClone(configuration.entries), events = [], calls = new Map(), handles = new Map();
  let nextFd = 100, time = 0;
  const failure = code => Object.assign(new Error("PRIVATE_native_error"), { code });
  const invoke = (method, selected) => {
    const key = `${method}:${selected}`, count = (calls.get(key) ?? 0) + 1; calls.set(key, count);
    events.push({ method, selected });
    for (const mutation of configuration.mutations ?? []) {
      if (mutation.method !== method || mutation.path !== selected || mutation.call !== count) continue;
      if (mutation.remove) delete entries[mutation.target ?? selected];
      else if (mutation.replace) entries[mutation.target ?? selected] = structuredClone(mutation.replace);
      else Object.assign(entries[mutation.target ?? selected], mutation.patch);
      if (mutation.error) throw failure(mutation.error);
    }
  };
  const stat = entry => ({
    dev: BigInt(entry.dev ?? 1), ino: BigInt(entry.ino ?? 9999), uid: BigInt(entry.uid ?? 1000), gid: BigInt(entry.gid ?? 1000),
    mode: BigInt(entry.mode ?? 0o40700), nlink: BigInt(entry.nlink ?? 2),
    isDirectory: () => !entry.type || entry.type === "directory", isSymbolicLink: () => entry.type === "symlink",
  });
  const C = { O_RDONLY: 0, O_NOFOLLOW: 131072, O_NONBLOCK: 2048, O_DIRECTORY: 65536 };
  const fs = {
    async lstat(selected, options) {
      invoke("lstat", selected); if (options?.bigint !== true) throw failure("forbidden_stat");
      if (!entries[selected]) throw failure("ENOENT");
      return stat(entries[selected]);
    },
    async open(selected, flags) {
      const anchored = selected;
      if (selected !== "/") {
        const match = selected.match(/^\/proc\/self\/fd\/(\d+)\/([A-Za-z0-9._-]+)$/u), parent = match && handles.get(Number(match[1]));
        if (!parent || parent.closed || [".", ".."].includes(match[2])) throw failure("unanchored_open");
        selected = parent.selected === "/" ? "/" + match[2] : parent.selected + "/" + match[2];
      }
      invoke("open", selected); const entry = entries[selected]; if (!entry) throw failure("ENOENT");
      if (flags !== (C.O_RDONLY | C.O_DIRECTORY | C.O_NOFOLLOW | C.O_NONBLOCK)) throw failure("unbounded_open");
      if (entry.type === "symlink") throw failure("ELOOP");
      const record = { selected, entry, anchored, closed: false }, fd = nextFd++; handles.set(fd, record);
      return { fd, async stat(options) { invoke("fstat", selected); if (record.closed || options?.bigint !== true) throw failure("EBADF"); return stat(entry); },
        async close() { invoke("close", selected); record.closed = true; } };
    },
  };
  const execute = (command, args, options) => {
    events.push({ method: "execute", command, args, options });
    const index = events.filter(event => event.method === "execute" && event.command === command).length;
    if (!["df", "du", "docker"].includes(command)) throw failure("forbidden_tool");
    if (options.encoding !== "utf8" || options.killSignal !== "SIGKILL" || options.env.LC_ALL !== "C" || Object.keys(options.env).sort().join() !== "LC_ALL,PATH" || options.stdio.slice(0, 3).join() !== "ignore,pipe,pipe") throw failure("forbidden_options");
    if (!Number.isInteger(options.timeout) || options.timeout <= 0 || options.timeout > ({ df: 3000, du: 8000, docker: 15000 })[command] || options.maxBuffer !== (command === "docker" ? 16384 : 4096)) throw failure("unbounded_process");
    let held;
    if (command !== "docker") {
      held = handles.get(options.stdio[3]);
      if (options.stdio.length !== 4 || !held || held.closed || args.at(-1) !== "/proc/self/fd/3/.") throw failure("unbound_child_directory");
    } else if (options.stdio.length !== 3) throw failure("unexpected_descriptor");
    invoke(command, held?.selected ?? "daemon");
    const selectedFailure = (configuration.failures ?? []).find(item => item.command === command && (!item.call || item.call === index));
    if (selectedFailure) {
      if (selectedFailure.elapsed) time += Math.min(selectedFailure.elapsed, options.timeout);
      throw Object.assign(new Error("PRIVATE_tool_error /srv/private-other PRIVATE_token"), { code: selectedFailure.code, signal: selectedFailure.signal, stdout: "PRIVATE_stdout", stderr: "PRIVATE_stderr" });
    }
    time += configuration.durations?.[command] ?? 1;
    if (command === "df") {
      if (args.join("|") !== "-B1|--output=size,used,avail|--|/proc/self/fd/3/." || held.selected !== configuration.paths[1]) throw failure("forbidden_df");
      return configuration.dfOutput ?? "   1B-blocks      Used        Avail\n 42949672960 39000000000 2000000000\n";
    }
    if (command === "du") {
      if (args.join("|") !== "-P|-x|-B1|-s|--|/proc/self/fd/3/.") throw failure("forbidden_du");
      const key = ["INBOX", "RELEASE", "CANDIDATE"][configuration.paths.indexOf(held.selected)];
      return configuration.duOutput ?? `${configuration.duBytes[key]}\t/proc/self/fd/3/.\n`;
    }
    if (args.join("|") !== "system|df|--format|{{json .}}") throw failure("forbidden_docker");
    return configuration.dockerOutput ?? configuration.docker.map(value => JSON.stringify(value)).join("\n") + "\n";
  };
  return { fs, constants: C, execute, now: () => time, events, handles, entries };
}

async function observe(configuration = fixture(), patch = {}) {
  const boundary = fakeBoundary(configuration);
  const report = sanitizeHostStorageReport(await hostStorageProbe(configuration.paths, {
    ...boundary, path: path.posix, createProtectedDirectoryBoundary, platform: "linux", uid: 1000, ...patch,
  }));
  return { report, boundary };
}

test("fixed allocation and Docker classes stay separate and do not qualify a low-space host", async () => {
  const { report, boundary } = await observe();
  assert.equal(hostStorageSucceeded(report), true);
  assert.equal(report.filesystem.availableBytes, 2_000_000_000);
  assert.equal(report.filesystem.totalBytes, 42_949_672_960);
  assert.deepEqual(Object.values(report.directories).map(group => [group.allocatedBytes, group.sameFilesystemAsRelease]), [[32768, true], [196608, true], [40960, false]]);
  assert.equal(report.docker.Images.total, 12); assert.equal(report.docker.Images.active, 5);
  assert.equal(report.docker.Images.reclaimable, "3.12GB (57%)");
  assert.equal(report.cleanupAuthorization, "NONE"); assert.equal(report.referenceCompleteness, "UNVERIFIED"); assert.equal(report.snapshot, "NON_ATOMIC");
  assert.doesNotMatch(JSON.stringify(report), privateNeedles);
  assert.equal(boundary.events.filter(event => event.method === "execute").length, 5);
  assert.equal(boundary.events.some(event => event.selected === protectedPaths[3]), false, "the base descriptor is not read or statted");
  assert.ok([...boundary.handles.values()].every(handle => handle.closed));
});

test("tool absence, permission, timeout and excess output are bounded unknown observations", async () => {
  for (const [command, code, signal, expected] of [
    ["df", "ENOENT", undefined, "tool_unavailable"], ["du", "EACCES", undefined, "tool_permission_denied"],
    ["du", "ETIMEDOUT", "SIGKILL", "tool_timeout"], ["docker", "ENOBUFS", undefined, "output_exceeded"],
    ["docker", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", undefined, "output_exceeded"], ["docker", undefined, undefined, "tool_failed"],
  ]) {
    const f = fixture(); f.failures.push({ command, code, signal, call: 1 });
    const { report, boundary } = await observe(f);
    assert.equal((command === "df" ? report.filesystem : command === "du" ? report.directories.INBOX : report.docker).code, expected);
    assert.equal(report.directories.CANDIDATE.status, "observed");
    assert.equal(command === "docker" ? report.filesystem.status : report.docker.status, "observed");
    assert.equal(hostStorageSucceeded(report), false); assert.doesNotMatch(JSON.stringify(report), privateNeedles);
    assert.ok([...boundary.handles.values()].every(handle => handle.closed));
  }
  const f = fixture(); f.duOutput = "PRIVATE_".repeat(700);
  const report = (await observe(f)).report;
  assert.equal(report.directories.INBOX.code, "output_exceeded"); assert.equal(report.filesystem.status, "observed");
});

test("fixed numeric and native rounded formats reject forged precision, overflow and extra columns", async () => {
  for (const output of [
    "1B-blocks Used Avail\n42949672960 -1 100\n", "1B-blocks Used Avail\n42949672960 39000000000 9007199254740992\n",
    "1B-blocks Used Avail\n42949672960 39000000000 100 PRIVATE_DEVICE\n", "1B-blocks Used Avail\n100 101 0\n", "PRIVATE_error",
  ]) {
    const f = fixture(); f.dfOutput = output; const { report } = await observe(f);
    assert.equal(report.filesystem.code, "output_invalid"); assert.equal(report.filesystem.availableBytes, null);
    assert.equal(report.docker.status, "observed");
  }
  for (const patch of [
    { TotalCount: "9007199254740992" }, { Active: "13" }, { TotalCount: "01" }, { Size: "12GB PRIVATE_credential" },
    { Size: "1e9B" }, { Reclaimable: "3.12GB (101%)" }, { Reclaimable: "3.12GB (99%) PRIVATE_credential" },
  ]) {
    const f = fixture(); Object.assign(f.docker[0], patch); const { report } = await observe(f);
    assert.equal(report.docker.Images.code, "output_invalid"); assert.equal(report.docker.Images.total, null);
    assert.equal(report.docker.Containers.status, "observed"); assert.equal(report.filesystem.status, "observed");
    assert.doesNotMatch(JSON.stringify(report), privateNeedles);
  }
});

test("missing, duplicate, malformed and unknown Docker rows preserve independent valid classes", async () => {
  for (const mode of ["missing", "duplicate", "malformed", "unknown"]) {
    const f = fixture();
    if (mode === "missing") f.docker.splice(0, 1);
    if (mode === "duplicate") f.docker.push({ ...f.docker[0] });
    if (mode === "malformed") f.dockerOutput = f.docker.slice(1).map(row => JSON.stringify(row)).join("\n") + "\nPRIVATE_BAD_JSON\n";
    if (mode === "unknown") f.docker.push({ Type: "PRIVATE_arbitrary", Size: "PRIVATE_payload" });
    const { report } = await observe(f);
    assert.equal(report.docker.status, "unknown"); assert.equal(report.docker.Containers.status, "observed");
    assert.equal(report.docker.Images.status, mode === "unknown" ? "observed" : "unknown");
    assert.equal(hostStorageSucceeded(report), false); assert.doesNotMatch(JSON.stringify(report), privateNeedles);
  }
});

test("unsafe or missing roots are not handed to children and do not erase unrelated aggregates", async () => {
  for (const [selected, patch, expected] of [
    [protectedPaths[0], { type: "symlink" }, "directory_invalid"], [protectedPaths[0], { uid: 1234 }, "ownership_invalid"],
    [protectedPaths[0], { mode: 0o40777 }, "permissions_invalid"], [protectedPaths[1], { type: "file" }, "directory_invalid"],
  ]) {
    const f = fixture(); Object.assign(f.entries[selected], patch); const { report, boundary } = await observe(f);
    assert.equal(report.directories[selected === protectedPaths[0] ? "INBOX" : "RELEASE"].code, expected);
    assert.equal(report.docker.status, "observed"); assert.equal(report.directories.CANDIDATE.status, "observed");
    assert.equal(boundary.events.some(event => ["df", "du"].includes(event.method) && event.selected === selected), false);
    if (selected === protectedPaths[1]) {
      assert.equal(report.filesystem.code, expected); assert.equal(report.directories.CANDIDATE.sameFilesystemAsRelease, null);
    }
  }
  const f = fixture(); delete f.entries[protectedPaths[0]];
  assert.equal((await observe(f)).report.directories.INBOX.code, "missing");
});

test("directory replacement or mode changes invalidate allocation and release-device comparisons", async () => {
  for (const [key, patch] of [["INBOX", { ino: 999 }], ["RELEASE", { mode: 0o40777 }]]) {
    const f = fixture(), selected = protectedPaths[["INBOX", "RELEASE", "CANDIDATE"].indexOf(key)];
    f.mutations.push({ method: "du", path: selected, call: 1, patch });
    const { report, boundary } = await observe(f);
    assert.equal(report.directories[key].status, "unknown"); assert.equal(report.directories[key].allocatedBytes, null);
    assert.equal(report.observation.status, "unknown"); assert.equal(report.docker.status, "observed");
    if (key === "RELEASE") {
      assert.equal(report.filesystem.status, "unknown"); assert.ok(Object.values(report.directories).every(row => row.sameFilesystemAsRelease === null));
    } else assert.equal(report.filesystem.status, "observed");
    assert.ok([...boundary.handles.values()].every(handle => handle.closed));
  }
  const f = fixture(); f.mutations.push({ method: "open", path: protectedPaths[0], call: 1, replace: { ino: 555, type: "directory" } });
  const { report } = await observe(f); assert.equal(report.directories.INBOX.code, "changed"); assert.equal(report.docker.status, "observed");
});

test("resource close failures remain explicitly unknown after otherwise valid reads", async () => {
  const f = fixture(); f.mutations.push({ method: "close", path: protectedPaths[0], call: 1, error: "EIO", patch: {} });
  const { report, boundary } = await observe(f);
  assert.equal(report.observation.code, "read_failed"); assert.equal(report.filesystem.status, "observed");
  assert.equal(hostStorageSucceeded(report), false);
  assert.equal(boundary.events.filter(event => event.method === "close").length, boundary.handles.size, "close failures do not skip remaining handles");
});

test("remaining deadline limits later children and never retries or substitutes unknown with zero", async () => {
  let calls = 0;
  const { report, boundary } = await observe(fixture(), { now: () => calls++ === 0 ? 0 : calls < 4 ? 46_000 : 49_000 });
  const commands = boundary.events.filter(event => event.method === "execute");
  assert.equal(commands.length, 1); assert.equal(commands[0].options.timeout, 3000);
  assert.equal(report.directories.INBOX.code, "deadline_exceeded"); assert.equal(report.directories.INBOX.allocatedBytes, null);
  assert.equal(report.docker.code, "deadline_exceeded"); assert.equal(hostStorageSucceeded(report), false);
});

test("fixed path arity and supported platform checks make no filesystem or tool observations", async () => {
  for (const paths of [[], [...protectedPaths, "/srv/PRIVATE_extra"], [...protectedPaths.slice(0, 3), "/srv/../PRIVATE.env"], ["/", ...protectedPaths.slice(1)], ["/srv//inbox", ...protectedPaths.slice(1)]]) {
    const f = fixture(); f.paths = paths; const { report, boundary } = await observe(f);
    assert.equal(report.observation.code, "path_invalid"); assert.equal(boundary.events.length, 0);
  }
  const { report, boundary } = await observe(fixture(), { platform: "win32" });
  assert.equal(report.observation.code, "platform_unsupported"); assert.equal(boundary.events.length, 0);
});

test("the runner drops undeclared fields and rejects contradictory, incomplete or private output", async () => {
  const { report } = await observe();
  const polluted = structuredClone(report); polluted.privatePath = protectedPaths[0]; polluted.filesystem.device = "PRIVATE_device";
  polluted.directories.INBOX.path = protectedPaths[0]; polluted.docker.Images.imageName = "PRIVATE_image";
  assert.deepEqual(sanitizeHostStorageReport(polluted), report);
  for (const patch of [
    { cleanupAuthorization: "ALLOWED" }, { snapshot: "ATOMIC" }, { referenceCompleteness: "VERIFIED" },
    { filesystem: { ...report.filesystem, totalBytes: 1 } }, { filesystem: { ...report.filesystem, availableBytes: "PRIVATE" } },
    { directories: { ...report.directories, INBOX: { ...report.directories.INBOX, status: "unknown", code: "changed" } } },
    { directories: { ...report.directories, RELEASE: { ...report.directories.RELEASE, sameFilesystemAsRelease: false } } },
    { docker: { ...report.docker, Images: { ...report.docker.Images, reclaimable: "3GB PRIVATE_token" } } },
    { docker: { ...report.docker, Images: { status: "unknown", code: "category_missing", total: null, active: null, size: null, reclaimable: null } } },
    { docker: { ...report.docker, status: "unknown", code: "category_missing" } },
    { docker: { ...report.docker, status: "unknown", code: "tool_timeout" } },
    { observation: { status: "unknown", code: "PRIVATE_error" } },
  ]) assert.throws(() => sanitizeHostStorageReport({ ...report, ...patch }), /^Error: host_storage_report_invalid$/u);
  for (const incomplete of [undefined, null, {}, { ...report, directories: undefined }, { ...report, docker: undefined }, { ...report, filesystem: { status: "observed", code: null } }]) assert.equal(hostStorageSucceeded(incomplete), false);
  const unknownComparison = structuredClone(report); unknownComparison.directories.INBOX.sameFilesystemAsRelease = null;
  assert.equal(hostStorageSucceeded(unknownComparison), false);
});

test("the actual emitted self-contained module uses only admitted builtins and inherited directory children", async () => {
  assert.match(hostStorageScript, /timeout --signal=KILL 50s node --input-type=module - "\$@"/u);
  assert.match(hostStorageScript, /host_storage_timeout_unavailable/u); assert.match(hostStorageScript, /host_storage_deadline_exceeded/u);
  const source = hostStorageScript.split("<<'STARWARD_FIXED_HOST_STORAGE_PROBE'\n")[1].split("\nSTARWARD_FIXED_HOST_STORAGE_PROBE")[0];
  assert.equal(spawnSync(process.execPath, ["--check", "--input-type=module"], { input: source, encoding: "utf8", windowsHide: true }).status, 0);
  assert.doesNotMatch(source, /readFile|writeFile|mkdir|unlink|opendir|docker exec|Config\.Env|fetch\(|eval\(|pg\.Client/u);
  for (const variant of ["normal", "missing_root", "docker_timeout", "unsafe_root"]) {
    const f = fixture();
    if (variant === "missing_root") delete f.entries[protectedPaths[0]];
    if (variant === "docker_timeout") f.failures.push({ command: "docker", code: "ETIMEDOUT", signal: "SIGKILL" });
    if (variant === "unsafe_root") f.entries[protectedPaths[1]].mode = 0o40777;
    const driver = `import vm from 'node:vm'; import path from 'node:path';
      const boundary=(${fakeBoundary.toString()})(${JSON.stringify(f)}), lines=[];
      const processFake={argv:['node','-',...${JSON.stringify(protectedPaths)}],platform:'linux',geteuid:()=>1000};
      const context=vm.createContext({Buffer,process:processFake,performance:{now:boundary.now},console:{log:value=>lines.push(value)}});
      const program=new vm.SourceTextModule(${JSON.stringify(source)},{context});
      const modules={
        'node:fs/promises':new vm.SyntheticModule(['lstat','open'],function(){for(const key of ['lstat','open'])this.setExport(key,boundary.fs[key]);},{context}),
        'node:fs':new vm.SyntheticModule(['constants'],function(){this.setExport('constants',boundary.constants);},{context}),
        'node:path':new vm.SyntheticModule(['default'],function(){this.setExport('default',path);},{context}),
        'node:child_process':new vm.SyntheticModule(['execFileSync'],function(){this.setExport('execFileSync',boundary.execute);},{context}),
      };
      await program.link(specifier=>{if(!modules[specifier])throw Error('unapproved import');return modules[specifier];});await program.evaluate();
      process.stdout.write(JSON.stringify({lines,exitCode:processFake.exitCode??0,allClosed:[...boundary.handles.values()].every(value=>value.closed)}));`;
    const result = spawnSync(process.execPath, ["--experimental-vm-modules", "--input-type=module"], { input: driver, encoding: "utf8", timeout: 10_000, maxBuffer: 128 * 1024, windowsHide: true });
    assert.equal(result.status, 0, result.stderr); const output = JSON.parse(result.stdout);
    assert.equal(output.exitCode, 0); assert.equal(output.lines.length, 1); assert.equal(output.allClosed, true);
    const report = sanitizeHostStorageReport(JSON.parse(output.lines[0]));
    assert.equal(hostStorageSucceeded(report), variant === "normal"); assert.doesNotMatch(output.lines[0], privateNeedles);
  }
});

test("native Linux df/du smoke passes the held parent descriptor as child fd3 without invoking Docker", async t => {
  if (process.platform !== "linux") {
    const { report } = await observe(fixture(), { platform: process.platform }); assert.equal(report.observation.code, "platform_unsupported");
    t.diagnostic("This Windows run verifies fail-closed platform selection; Linux CI must execute the real inherited-FD df/du branch.");
    return;
  }
  const directory = await nativeFs.mkdtemp(path.join(os.homedir(), ".starward-storage-test-"));
  t.after(() => nativeFs.rm(directory, { recursive: true, force: true }));
  await nativeFs.chmod(directory, 0o700);
  const children = [];
  for (const name of ["inbox", "release", "candidate"]) {
    const selected = path.join(directory, name); await nativeFs.mkdir(selected, { mode: 0o700 });
    await nativeFs.writeFile(path.join(selected, "data"), Buffer.alloc(8192), { mode: 0o600 }); children.push(selected);
  }
  await nativeFs.symlink(children[0], path.join(children[1], "unfollowed-link"));
  const expectedAllocation = [];
  for (const selected of children) {
    // The oracle uses the allocated block counts of this fixed small fixture,
    // not du output or apparent file lengths, and deliberately excludes the
    // linked directory's contents.
    const names = [selected, path.join(selected, "data")];
    if (selected === children[1]) names.push(path.join(selected, "unfollowed-link"));
    const stats = await Promise.all(names.map(name => nativeFs.lstat(name, { bigint: true })));
    expectedAllocation.push(Number(stats.reduce((total, value) => total + value.blocks * 512n, 0n)));
  }
  const calls = [];
  const execute = (command, args, options) => {
    calls.push({ command, args, options });
    if (command === "docker") throw Object.assign(new Error("Docker intentionally unavailable in smoke"), { code: "ENOENT" });
    assert.ok(["df", "du"].includes(command)); assert.equal(options.stdio.length, 4); assert.ok(Number.isInteger(options.stdio[3]));
    return execFileSync(command, args, options);
  };
  const report = sanitizeHostStorageReport(await hostStorageProbe([...children, path.join(directory, "unread-base.env")], {
    fs: nativeFs, constants, path: path.posix, createProtectedDirectoryBoundary, execute, platform: "linux", uid: process.geteuid(), now: () => performance.now(),
  }));
  assert.equal(report.filesystem.status, "observed"); assert.ok(report.filesystem.totalBytes > 0);
  assert.ok(Object.values(report.directories).every(group => group.status === "observed" && group.allocatedBytes >= 8192 && group.sameFilesystemAsRelease === true));
  assert.deepEqual(Object.values(report.directories).map(group => group.allocatedBytes), expectedAllocation);
  assert.equal(report.docker.code, "tool_unavailable"); assert.equal(report.observation.status, "observed");
  assert.equal(calls.filter(call => call.command === "du").length, 3); assert.equal(hostStorageSucceeded(report), false);
});

test("the native Linux shell wrapper exposes only fixed failure codes when timeout is missing or fails", async t => {
  if (process.platform !== "linux") {
    t.diagnostic("The shell privacy/exit-code check requires Linux; the exact inner program is exercised by fake builtins on every host.");
    return;
  }
  const directory = await nativeFs.mkdtemp(path.join(os.homedir(), ".starward-storage-shell-test-"));
  t.after(() => nativeFs.rm(directory, { recursive: true, force: true }));
  const absent = spawnSync("/bin/sh", ["-s", "--", ...protectedPaths], { input: hostStorageScript, encoding: "utf8", env: { PATH: directory }, timeout: 3000, maxBuffer: 4096 });
  assert.equal(absent.status, 65); assert.equal(absent.stdout, ""); assert.equal(absent.stderr, "host_storage_timeout_unavailable\n");
  const shim = path.join(directory, "timeout");
  for (const [status, expected] of [[124, "host_storage_deadline_exceeded"], [137, "host_storage_deadline_exceeded"], [2, "host_storage_failed"]]) {
    await nativeFs.writeFile(shim, `#!/bin/sh\nprintf '%s\\n' 'PRIVATE_native_error /srv/private-path' >&2\nexit ${status}\n`, { mode: 0o700 });
    const result = spawnSync("/bin/sh", ["-s", "--", ...protectedPaths], { input: hostStorageScript, encoding: "utf8", env: { PATH: directory }, timeout: 3000, maxBuffer: 4096 });
    assert.equal(result.status, 65); assert.equal(result.stdout, ""); assert.equal(result.stderr, `${expected}\n`);
  }
});
