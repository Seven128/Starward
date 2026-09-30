import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { classifyDevelopmentWatcherTree, classifyDevelopmentWatchers, developmentOptions, startDevelopmentAutomation, validateObserverReceipt } from "./development-automation.mjs";
import { connectDevelopmentObserver } from "./development-observer.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-auto-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectPath = path.join(directory, "project");
  await mkdir(path.join(projectPath, "weapp"), { recursive: true });
  await writeFile(path.join(projectPath, "project.config.json"), JSON.stringify({ compileType: "miniprogram", miniprogramRoot: "weapp/", appid: "synthetic-public-id" }));
  const receiptFile = path.join(directory, "receipt.json");
  let launched = false, killed = 0, connected = 0;
  const commands = [];
  const owner = { pid: process.pid, startedAt: "synthetic-owner-start" };
  const listener = { pid: 12345, startedAt: "synthetic-listener-start" };
  const inspect = async () => ({ owner, listener: launched ? listener : null, projectBound: launched });
  const spawn = (file, args, options) => {
    commands.push({ file, args, options }); launched = true;
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.exitCode = null;
    child.kill = () => { killed++; child.exitCode = 0; };
    return child;
  };
  const options = { receiptFile, inspect, spawn, canListen: async () => true,
    resolveCli: async () => ({ file: path.join(directory, "official", "node.exe"), prefix: ["official-cli.js"] }), timeoutMs: 50 };
  const sdk = {
    launcher: { connectTool: async () => {
      connected++;
      const program = new EventEmitter();
      program.connection = { send: async () => ({}), dispose: () => {} };
      program.checkVersion = async () => {};
      program.disconnect = () => {};
      program.currentPage = async () => ({ path: "pages/fixture/index" });
      return program;
    } },
  };
  return { directory, projectPath, receiptFile, commands, owner, listener, inspect, options, sdk,
    counts: () => ({ killed, connected }), setLaunched: value => { launched = value; } };
}

test("development options make automation explicit and reject port conflicts or unknown flags", () => {
  assert.deepEqual(developmentOptions([]), { apiPort: 8787, automationPort: null, noOpen: false, memory: false });
  assert.deepEqual(developmentOptions(["--automation-port", "9420", "--memory"]), { apiPort: 8787, automationPort: 9420, noOpen: false, memory: true });
  for (const args of [["--automation-port"], ["--automation-port", "0"], ["--automation-port", "8787"], ["--automation-port", "9420", "--no-open"], ["--unknown"]]) assert.throws(() => developmentOptions(args));
});

test("watcher binding permits only the exact candidate and selected renderer's exact internal directory", () => {
  const project = path.resolve("synthetic-fixture");
  const internal = path.resolve("synthetic-user-data", "selected-profile", "WeappLocalData");
  assert.deepEqual(classifyDevelopmentWatchers([project, internal, internal], project, [internal]), {
    candidateCount: 1, internalCount: 2, unknownCount: 0, bound: true,
  });
  for (const other of [path.resolve("other-project"), path.dirname(internal), path.join(internal, "nested-project"),
    path.resolve("synthetic-user-data", "other-profile", "WeappLocalData"), null]) {
    const result = classifyDevelopmentWatchers([project, internal, other], project, [internal]);
    assert.equal(result.bound, false);
    assert.equal(result.unknownCount, 1);
  }
  assert.equal(classifyDevelopmentWatchers([internal], project, [internal]).bound, false);
});

test("another renderer's project does not poison this port, but same-renderer and global ambiguity fail closed", () => {
  const project = path.resolve("selected-project"), other = path.resolve("other-project"), internal = path.resolve("selected-profile", "WeappLocalData");
  const processes = [
    { pid: 1, parentPid: 0 }, { pid: 100, parentPid: 1 }, { pid: 200, parentPid: 1 },
    { pid: 101, parentPid: 100, watcherPath: project }, { pid: 102, parentPid: 100, watcherPath: internal },
    { pid: 201, parentPid: 200, watcherPath: other },
  ];
  assert.deepEqual(classifyDevelopmentWatcherTree(processes, 100, project, [internal]), {
    candidateCount: 1, internalCount: 1, unknownCount: 0, bound: true,
  });
  assert.equal(classifyDevelopmentWatcherTree(processes, 1, project, [internal]).bound, false);
  const sameRenderer = processes.map(row => row.pid === 201 ? { ...row, parentPid: 100 } : row);
  const ambiguous = classifyDevelopmentWatcherTree(sameRenderer, 100, project, [internal]);
  assert.equal(ambiguous.bound, false);
  assert.equal(ambiguous.unknownCount, 1);
});

test("launch binds only its free port and exact project; cleanup removes only its receipt/CLI", async t => {
  const h = await fixture(t);
  const session = await startDevelopmentAutomation(h.projectPath, 9420, h.options);
  const receipt = JSON.parse(await readFile(h.receiptFile, "utf8"));
  assert.equal(receipt.phase, "ready");
  assert.deepEqual(receipt.owner, h.owner); assert.deepEqual(receipt.listener, h.listener);
  assert.equal(h.commands.length, 1);
  assert.deepEqual(h.commands[0].args, ["official-cli.js", "auto", "--project", h.projectPath, "--auto-port", "9420", "--trust-project"]);
  assert.equal(h.commands[0].options.shell, false);
  assert.equal(h.commands[0].options.windowsHide, true);
  await validateObserverReceipt(h.projectPath, 9420, { receiptFile: h.receiptFile, resolveCli: h.options.resolveCli, inspect: h.inspect });
  await session.cleanup();
  await assert.rejects(readFile(h.receiptFile));
  assert.equal(h.counts().killed, 1);
});

test("an occupied port or live owner is never adopted or displaced", async t => {
  const h = await fixture(t);
  await assert.rejects(startDevelopmentAutomation(h.projectPath, 9420, { ...h.options, canListen: async () => false }), /port_in_use/u);
  assert.equal(h.commands.length, 0);
  const session = await startDevelopmentAutomation(h.projectPath, 9420, h.options);
  h.setLaunched(false);
  await assert.rejects(startDevelopmentAutomation(h.projectPath, 9420, h.options), /owner_still_running/u);
  assert.equal(h.commands.length, 1);
  assert.equal(h.counts().killed, 0);
  await session.cleanup();
});

test("PID reuse, different listener, project drift and ambiguous binding reject attach", async t => {
  const h = await fixture(t);
  const session = await startDevelopmentAutomation(h.projectPath, 9420, h.options);
  for (const actual of [
    { owner: { ...h.owner, startedAt: "after-reboot" }, listener: h.listener, projectBound: true },
    { owner: h.owner, listener: { ...h.listener, startedAt: "restarted" }, projectBound: true },
    { owner: h.owner, listener: { ...h.listener, pid: 54321 }, projectBound: true },
    { owner: h.owner, listener: h.listener, projectBound: false },
  ]) await assert.rejects(validateObserverReceipt(h.projectPath, 9420, { receiptFile: h.receiptFile, resolveCli: h.options.resolveCli, inspect: async () => actual }), /owner_or_project_changed/u);
  await assert.rejects(validateObserverReceipt(h.projectPath, 9421, { receiptFile: h.receiptFile, resolveCli: h.options.resolveCli, inspect: h.inspect }), /identity_changed/u);
  await writeFile(path.join(h.projectPath, "project.config.json"), JSON.stringify({ compileType: "miniprogram", miniprogramRoot: "weapp/", appid: "changed" }));
  await assert.rejects(validateObserverReceipt(h.projectPath, 9420, { receiptFile: h.receiptFile, resolveCli: h.options.resolveCli, inspect: h.inspect }), /identity_changed/u);
  await session.cleanup();
});

test("startup failure or cancellation revokes the receipt without any IDE close operation", async t => {
  for (const reason of ["cancel", "failed", "timeout"]) {
    const h = await fixture(t), controller = new AbortController();
    await assert.rejects(startDevelopmentAutomation(h.projectPath, 9420, {
      ...h.options, timeoutMs: 1, signal: controller.signal,
      ...(reason === "timeout" ? { inspect: async () => ({ owner: h.owner, listener: null, projectBound: false }) } : {}),
      onStarted: () => { if (reason === "cancel") controller.abort(); },
      spawn: (...args) => {
        const child = h.options.spawn(...args);
        if (reason === "failed") child.exitCode = 1;
        return child;
      },
    }));
    await assert.rejects(readFile(h.receiptFile));
    assert.ok(h.commands.every(command => !command.args.some(arg => ["quit", "close", "reLaunch"].includes(arg))));
  }
});

test("repeated/concurrent attaches reuse one client and explicit disconnect permits a fresh attach", async t => {
  const h = await fixture(t), session = await startDevelopmentAutomation(h.projectPath, 9420, h.options);
  const dependencies = { automator: h.sdk, validateReceipt: (projectPath, port) => validateObserverReceipt(projectPath, port, { receiptFile: h.receiptFile, resolveCli: h.options.resolveCli, inspect: h.inspect }) };
  const options = { projectPath: h.projectPath, automationPort: 9420, receiptFile: h.receiptFile };
  const [first, second] = await Promise.all([connectDevelopmentObserver(options, dependencies), connectDevelopmentObserver(options, dependencies)]);
  assert.equal(first, second); assert.equal(h.counts().connected, 1);
  first.disconnect();
  const third = await connectDevelopmentObserver(options, dependencies);
  assert.notEqual(third, first); assert.equal(h.counts().connected, 2);
  third.disconnect(); await session.cleanup();
});

test("the actual warm entry tears down owned children/receipt on startup failure and signals", async () => {
  const source = await readFile(new URL("./start-development-session.mjs", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("warm.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const script = parsed.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(parsed)).join("\n")
    .replaceAll("import.meta.url", JSON.stringify(new URL("./start-development-session.mjs", import.meta.url).href));
  for (const scenario of ["api-failure", "redirected-output", "auto-failure", "signal"]) {
    const host = new EventEmitter();
    host.argv = ["node", "warm.mjs", "--memory", "--automation-port", "9420"];
    host.env = {}; host.execPath = process.execPath; host.platform = "win32";
    let now = 0, cleanupCalls = 0;
    const started = [], stopped = [], events = [];
    const expectedOutput = path.resolve(fileURLToPath(new URL("../../apps/wechat-miniapp/dist/weapp", import.meta.url)));
    host.stdout = { write: () => host.emit("SIGINT") };
    const sandbox = {
      process: host, path, fileURLToPath, AbortController, nodeEnvironment: (_node, env) => env,
      Date: { now: () => now },
      developmentOptions, canListen: async () => true,
      realpath: async value => scenario === "redirected-output" && value === expectedOutput ? path.join(expectedOutput, "redirect") : value,
      access: async () => {},
      rm: async (value, options) => {
        assert.equal(value, expectedOutput);
        assert.equal(options.recursive, true); assert.equal(options.force, true);
        events.push("reset");
      },
      fetch: async () => { if (scenario === "api-failure") { now = 90_001; throw Error("synthetic API unavailable"); } return { ok: true }; },
      setTimeout: callback => { queueMicrotask(callback); return 1; },
      setInterval: callback => { queueMicrotask(callback); return 1; }, clearInterval: () => {},
      spawn: (_file, args) => {
        started.push(args[2]);
        events.push(args[2]);
        const child = new EventEmitter(); child.pid = 1000 + started.length;
        return child;
      },
      spawnSync: (command, args) => { assert.equal(command, "taskkill"); stopped.push(Number(args[1])); return { status: 0 }; },
      startDevelopmentAutomation: async (_project, _port, options) => {
        const cleanup = async () => { cleanupCalls++; };
        options.onStarted(cleanup);
        if (scenario === "auto-failure") throw Error("synthetic auto failure");
        return { port: 9420, receiptFile: "synthetic-receipt", cleanup };
      },
    };
    const run = vm.runInNewContext(`(async () => { ${script} })()`, sandbox);
    if (scenario === "signal") await run; else await assert.rejects(run);
    assert.deepEqual(stopped, started.map((_, index) => index + 1001), scenario);
    const earlyFailure = ["api-failure", "redirected-output"].includes(scenario);
    assert.equal(cleanupCalls, earlyFailure ? 0 : 1, scenario);
    if (earlyFailure) {
      assert.equal(events.includes("reset"), false);
      assert.equal(events.includes("dev:miniapp:weapp"), false);
    } else {
      assert.equal(events.filter(event => event === "reset").length, 1);
      assert.ok(events.indexOf("reset") < events.indexOf("dev:miniapp:weapp"));
    }
    assert.equal(host.listenerCount("SIGINT"), 0);
    assert.equal(host.listenerCount("SIGTERM"), 0);
  }
});
