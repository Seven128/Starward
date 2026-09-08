import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createBoundDevelopmentObserver, redactDevelopmentValue, observerCli } from "./development-observer.mjs";

test("native layout executes scoped selectors, strips data and rejects route races and broad results", async () => {
  const h = fakeProgram(); let route = { route: h.page.path }, changed = false, count = 1;
  h.page.$$ = () => assert.fail("native layout must not depend on Page.*");
  h.program.evaluate = (fn, ...args) => vm.runInNewContext(`(${fn.toString()})(...args)`, {
    args, getCurrentPages: () => [route], wx: { createSelectorQuery: () => {
      const selections = [];
      return { selectAll(value) { selections.push(value); return this; }, boundingClientRect() { return this; },
        exec(callback) { if (changed) route = { route: h.page.path };
          callback(selections.map(() => Array.from({ length: count }, () => ({ left: 1, top: 2, width: 280, height: 160, dataset: { token: "private" } })))); } };
    } },
  });
  const observer = await createBoundDevelopmentObserver(h.program, receipt);
  await assert.rejects(observer.layout(["#canvas"]), /expected_page_required/u);
  const result = await observer.layout(["#canvas"], { expectedPage: h.page.path });
  assert.equal(result.elements[0].elements[0].width, 280);
  assert.equal(JSON.stringify(result).includes("private"), false);
  count = 9; await assert.rejects(observer.layout(["#canvas"], { expectedPage: h.page.path }), /selection_too_broad/u);
  count = 1; changed = true;
  await assert.rejects(observer.layout(["#canvas"], { expectedPage: h.page.path }), /page_changed_during_read/u);
  observer.disconnect();
});

function fakeProgram() {
  const program = new EventEmitter();
  const calls = [];
  let state = "pending", count = 1, taps = 0, disconnected = 0, screenshotActive = 0, maxScreenshots = 0;
  const element = {
    attribute: async key => key === "data-state" ? state : "safe",
    text: async () => "天气正常 token=hidden-value", size: async () => ({ width: "120", height: "44" }),
    tap: async () => { taps++; state = "ready"; }, input: async () => { state = "input"; },
  };
  const page = { path: "pages/fixture/index", $$: async select => { calls.push(select); return Array.from({ length: count }, () => element); } };
  program.connection = { send: async method => { calls.push(method); return {}; }, dispose: () => { disconnected++; } };
  program.currentPage = async () => page;
  program.navigateTo = async route => { calls.push(route); };
  program.disconnect = () => { disconnected++; };
  program.close = () => assert.fail("observer must never close an IDE");
  program.screenshot = async () => {
    screenshotActive++; maxScreenshots = Math.max(maxScreenshots, screenshotActive);
    await new Promise(resolve => setTimeout(resolve, 10)); screenshotActive--;
    return Buffer.from([137,80,78,71,13,10,26,10,0]).toString("base64");
  };
  return { program, page, element, calls,
    setCount: value => { count = value; }, setState: value => { state = value; },
    counts: () => ({ taps, disconnected, maxScreenshots }),
  };
}

test("unavailable optional logs do not prevent initial observation and timeout never replays enable", async () => {
  const h = fakeProgram(); let enables = 0;
  h.program.connection.send = async () => { enables++; return new Promise(() => {}); };
  const observer = await createBoundDevelopmentObserver(h.program, receipt, { operationTimeoutMs: 20 });
  assert.equal((await observer.status()).connected, true);
  assert.equal(enables, 0);
  await assert.rejects(observer.enableConsole(), /operation_deadline/u);
  assert.equal(enables, 1);
  await assert.rejects(observer.enableConsole(), /disconnected/u);
  assert.equal(enables, 1);
});

test("native layout waiting follows observed geometry, preserves serialization and rejects unsupported conditions", async () => {
  const h = fakeProgram(); let reads = 0;
  h.page.$$ = () => assert.fail("layout waiting must not query Page.*");
  h.program.evaluate = async () => ({ elements: [{ count: 1, elements: [{ width: ++reads > 1 ? 280 : 0, height: 160 }] }] });
  const observer = await createBoundDevelopmentObserver(h.program, receipt);
  assert.throws(() => observer.waitFor({ selector: "#canvas", read: "layout", attribute: "data-state", expectedPage: h.page.path }), /condition_invalid/u);
  const waiting = observer.waitFor({ selector: "#canvas", read: "layout", minimumWidth: 280, expectedPage: h.page.path, timeoutMs: 1000 });
  const navigation = observer.navigateTo("/pages/after/index");
  const result = await waiting;
  assert.equal(result.elements[0].elements[0].width, 280);
  assert.equal(reads, 2);
  await navigation;
  assert.equal(h.calls.at(-1), "/pages/after/index");
  await assert.rejects(observer.waitFor({ selector: "#canvas", read: "layout", minimumWidth: 281, expectedPage: h.page.path, timeoutMs: 30 }), /condition_timeout/u);
  observer.disconnect();
});
const receipt = { projectPath: "synthetic fixture", port: 9420 };

test("one bound observer batches stable selectors and condition waiting without navigation or page data dumps", async () => {
  const h = fakeProgram();
  const observer = await createBoundDevelopmentObserver(h.program, receipt);
  const snapshot = await observer.snapshot([{ selector: "[data-control=ready]", text: true, attributes: ["data-state"] }, { selector: ".size", size: true }], { expectedPage: h.page.path });
  assert.equal(snapshot.scope, "development_observation");
  assert.equal(snapshot.elements.length, 2);
  assert.equal(snapshot.elements[0].elements[0].text.includes("hidden-value"), false);
  setTimeout(() => h.setState("ready"), 10);
  const ready = await observer.waitFor({ selector: ".ready", attribute: "data-state", equals: "ready", expectedPage: h.page.path, timeoutMs: 500 });
  assert.equal(ready.elements[0].elements[0].attributes["data-state"], "ready");
  assert.equal(h.calls.filter(call => call === "App.enableLog").length, 0);
  await Promise.all([observer.enableConsole(), observer.enableConsole()]);
  assert.equal(h.calls.filter(call => call === "App.enableLog").length, 1);
  assert.equal(h.calls.some(call => call.startsWith("/")), false);
  observer.disconnect(); assert.equal(h.counts().disconnected, 1);
});

test("tap and input require an exact active page and one selected element, and never retry a failed mutation", async () => {
  const h = fakeProgram(), observer = await createBoundDevelopmentObserver(h.program, receipt);
  await assert.rejects(observer.tap(".button"), /expected_page_required/u);
  await assert.rejects(observer.tap(".button", { expectedPage: "different/page" }), /expected_page_not_active/u);
  h.setCount(2); await assert.rejects(observer.tap(".button", { expectedPage: h.page.path }), /not_unique/u);
  assert.equal(h.counts().taps, 0);
  h.setCount(1); await observer.tap(".button", { expectedPage: h.page.path });
  assert.equal(h.counts().taps, 1);
  let attempts = 0;
  h.element.tap = async () => { attempts++; throw Error("Connection closed secret=must-not-escape"); };
  await assert.rejects(observer.tap(".button", { expectedPage: h.page.path }), error => {
    assert.match(error.message, /^development_observer_operation_failed_/u);
    assert.match(error.diagnostic, /Connection closed/u);
    assert.equal(JSON.stringify(error).includes("must-not-escape"), false);
    return true;
  });
  await assert.rejects(observer.tap(".button", { expectedPage: h.page.path }), /disconnected/u);
  assert.equal(attempts, 1);
  assert.equal(h.counts().disconnected, 1);
});

test("operation deadlines disconnect instead of replaying or allowing queued actions", async () => {
  const h = fakeProgram(); let taps = 0;
  h.element.tap = () => { taps++; return new Promise(() => {}); };
  const observer = await createBoundDevelopmentObserver(h.program, receipt, { operationTimeoutMs: 15 });
  const first = observer.tap(".button", { expectedPage: h.page.path });
  const second = observer.tap(".button", { expectedPage: h.page.path });
  const results = await Promise.allSettled([first, second]);
  assert.ok(results.every(result => result.status === "rejected"));
  assert.equal(taps, 1);
  assert.equal(h.counts().disconnected, 1);
});

test("screenshots run serially, save exclusively and never close the user's IDE", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-observer-test-"));
  const h = fakeProgram(), observer = await createBoundDevelopmentObserver(h.program, receipt);
  try {
    const first = path.join(directory, "first.png"), second = path.join(directory, "second.png");
    await Promise.all([observer.screenshot(first), observer.screenshot(second)]);
    assert.equal(h.counts().maxScreenshots, 1);
    assert.equal((await readFile(first)).length, 9);
    await assert.rejects(observer.screenshot(first));
    assert.equal((await readFile(first)).length, 9);
  } finally { observer.disconnect(); await rm(directory, { recursive: true, force: true }); }
});

test("console output is bounded and redacts structured secrets, coordinates and common message formats", async () => {
  const h = fakeProgram(), observer = await createBoundDevelopmentObserver(h.program, receipt);
  for (let i = 0; i < 100; i++) h.program.emit("console", { level: "warn", message: 'authorization: Bearer abcdefghijk token="secret-token" user@example.com 13812345678 22.12345,114.12345', data: { accessToken: "another-secret", longitude: 114.12345 } });
  const logs = observer.console(), text = JSON.stringify(logs);
  assert.equal(logs.length, 80);
  for (const secret of ["abcdefghijk", "secret-token", "another-secret", "user@example.com", "13812345678", "22.12345", "114.12345"]) assert.equal(text.includes(secret), false, secret);
  assert.ok(Buffer.byteLength(text) < 80 * 5000);
  assert.equal(redactDevelopmentValue({ password: "secret" }).password, "[redacted]");
  observer.disconnect(); assert.equal(h.program.listenerCount("console"), 0);
});

test("identity loss and route change stop observation before a side effect", async () => {
  const h = fakeProgram(); let revoked = false;
  const observer = await createBoundDevelopmentObserver(h.program, receipt, { verify: async () => { if (revoked) throw Error("development_observer_session_identity_changed"); } });
  revoked = true;
  await assert.rejects(observer.tap(".button", { expectedPage: h.page.path }), /identity_changed/u);
  assert.equal(h.counts().taps, 0);
  assert.equal(h.counts().disconnected, 1);
});

test("help is import-safe and exposes no cloud, evaluate or automatic relaunch command", async () => {
  const help = await observerCli(["--help"]);
  assert.deepEqual(help.commands, ["status", "layout", "snapshot", "wait", "screenshot"]);
  await assert.rejects(observerCli(["evaluate"]), /unknown_command/u);
  const h = fakeProgram(); h.program.currentPage = async () => undefined;
  const observer = await createBoundDevelopmentObserver(h.program, receipt);
  assert.equal((await observer.status()).path, null);
  assert.equal(h.calls.length, 0);
  await observer.navigateTo("/pages/fixture/index");
  assert.equal(h.calls.at(-1), "/pages/fixture/index");
  observer.disconnect();
});
