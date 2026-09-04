import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import { AdbDevice, deviceSummary, foregroundActivity, verifyFocusedWindow, normalizedPoint, pngSize, runTool } from "./device-adb.mjs";
import { startSession, withSession, stopSession, loadSession, deviceBinding, assertCapture, externalDirectory } from "./device-session.mjs";
import { automationEndpoint, inspectRuntime } from "./device-runtime.mjs";
import { main, parseArguments } from "./device-test.mjs";
import { terminalQrPng, remoteProgressConsumer, remoteDeadline } from "./device-qr.mjs";

import { activity, permissionsActivity, systemLocationActivity, permissionHistory, png } from "./device-test-fixtures.mjs";

const testAppId = ["wx", "1234567890abcdef"].join("");

async function project(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-device-fixture-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "weapp"));
  await writeFile(path.join(directory, "project.config.json"), JSON.stringify({ compileType: "miniprogram", appid: testAppId, miniprogramRoot: "weapp" }));
  await writeFile(path.join(directory, "weapp", "app.json"), JSON.stringify({ pages: ["pages/map/index"] }));
  return directory;
}
async function session(t) {
  const state = await startSession(await project(t));
  t.after(() => rm(state.directory, { recursive: true, force: true }));
  return state;
}
function adbDriver({ changed = false, permissions = false, osLocation = false, systemPackage = true } = {}) {
  const calls = [];
  const driver = new AdbDevice("fixture-adb", async (_file, args) => {
    calls.push(args);
    if (args.join(" ") === "version") return Buffer.from("Android Debug Bridge version 1.0.41");
    if (args.join(" ") === "devices -l") return Buffer.from("List of devices attached\nprivate-serial device product:test\n");
    if (args.join(" ") === "-d get-state") return Buffer.from("device\n");
    if (args.join(" ") === "-d get-serialno") return Buffer.from("private-serial\n");
    const command = args.slice(2).join(" ");
    if (command === "shell dumpsys activity activities") return Buffer.from(osLocation ? permissionHistory().replaceAll(permissionsActivity, systemLocationActivity) : permissions ? permissionHistory() : `mResumedActivity: ActivityRecord{abc u0 ${activity} t1}`);
    if (command === "shell dumpsys window windows") return Buffer.from(`mCurrentFocus=Window{abc u0 ${osLocation ? systemLocationActivity : permissions ? permissionsActivity : activity}}`);
    if (command === "shell dumpsys package com.android.permissioncontroller") return Buffer.from(systemPackage ? "pkgFlags=[ SYSTEM HAS_CODE ]\n codePath=/system_ext/priv-app/PermissionController" : "pkgFlags=[ HAS_CODE ]\n codePath=/data/app/unknown");
    if (command === "exec-out screencap -p") return png(changed ? 2400 : 1080, changed ? 1080 : 2400);
    if (command.startsWith("shell input")) return Buffer.alloc(0);
    throw new Error("unexpected_driver_call");
  });
  return { driver, calls };
}

function appBrandForegroundState(current = activity, focus = current) {
  return {
    activity: `mResumedActivity: ActivityRecord{abc u0 ${current} t1}`,
    window: `mCurrentFocus=Window{abc u0 ${focus}}`,
  };
}

function screenshotDriver({ initial = appBrandForegroundState(), afterCapture = [], wait = async () => {} } = {}) {
  const calls = [];
  const states = [initial, ...afterCapture];
  let foregroundCalls = 0;
  let screencapSeen = false;
  const driver = new AdbDevice("fixture-adb", async (_file, args) => {
    calls.push(args);
    if (args.join(" ") === "-d get-state") return Buffer.from("device\n");
    if (args.join(" ") === "-d get-serialno") return Buffer.from("fixture-serial\n");
    const command = args.slice(2).join(" ");
    if (command === "shell dumpsys activity activities") {
      const index = screencapSeen ? foregroundCalls++ + 1 : 0;
      const state = states[index] ?? states.at(-1);
      if (state.activityError) throw state.activityError;
      return Buffer.from(state.activity);
    }
    if (command === "shell dumpsys window windows") {
      const index = screencapSeen ? foregroundCalls : 0;
      const state = states[index] ?? states.at(-1);
      if (state.windowError) throw state.windowError;
      return Buffer.from(state.window);
    }
    if (command === "exec-out screencap -p") {
      screencapSeen = true;
      return png();
    }
    if (command === "shell dumpsys package com.android.permissioncontroller") {
      return Buffer.from("pkgFlags=[ SYSTEM HAS_CODE ]\n codePath=/system_ext/priv-app/PermissionController");
    }
    throw new Error("unexpected_screenshot_fixture_call");
  }, wait);
  return {
    driver,
    calls,
    get postCaptureAttempts() { return foregroundCalls; },
  };
}

test("device summary never contains serials; USB selection uses -d, not first listed device", async () => {
  assert.deepEqual(deviceSummary("List of devices attached\nSECRET1 unauthorized\nSECRET2 offline\nemulator-5554 device"), { detected: 3, states: ["unauthorized", "offline", "device"] });
  const { driver, calls } = adbDriver();
  const result = await driver.doctor();
  assert.equal(result.usbReady, true);
  assert.ok(!JSON.stringify(result).includes("private-serial"));
  assert.ok(calls.some((args) => args.join(" ") === "-d get-serialno"));
});

test("zero/unauthorized/ambiguous USB blocks operations without guessing", async () => {
  for (const state of ["offline", "unauthorized", "unknown"]) {
    const device = new AdbDevice("fake", async () => Buffer.from(state));
    await assert.rejects(device.select(), /single_authorized_usb_required/u);
  }
  const ambiguous = new AdbDevice("fake", async () => { throw new Error("device_test_tool_failed"); });
  await assert.rejects(ambiguous.select(), /single_authorized_usb_required/u);
});

test("foreground and focused window reject chats, system dialogs and unknown OEM formats", () => {
  assert.equal(foregroundActivity(`topResumedActivity: ActivityRecord{abc u0 ${activity} t1}`), activity);
  assert.equal(foregroundActivity("topResumedActivity=ActivityRecord{abc u0 com.tencent.mm/.plugin.appbrand.ui.AppBrandUI1 t1}"), `${activity}1`);
  for (const value of ["com.tencent.mm/.ui.LauncherUI", "com.tencent.mm/.plugin.appbrand.ui.AppBrandAuthorizeUI", "com.other/.Activity", ""]) {
    assert.throws(() => foregroundActivity(`mResumedActivity: ActivityRecord{abc u0 ${value} t1}`), /foreground_required/u);
  }
  assert.throws(() => verifyFocusedWindow("mCurrentFocus=Window{abc u0 com.android.permissioncontroller/.GrantPermissionsActivity}", activity), /focus_required/u);
  verifyFocusedWindow(`mCurrentFocus=Window{abc u0 ${activity}}`, activity);
  verifyFocusedWindow("mCurrentFocus=Window{abc u0 com.tencent.mm/.plugin.appbrand.ui.AppBrandUI}", activity);
  verifyFocusedWindow(`Display: mDisplayId=9\n mCurrentFocus=null\nDisplay: mDisplayId=0\n mCurrentFocus=Window{abc u0 ${activity}}`, activity);
  assert.throws(() => verifyFocusedWindow(`Display: mDisplayId=9\n mCurrentFocus=Window{abc u0 ${activity}}\nDisplay: mDisplayId=0\n mCurrentFocus=null`, activity), /focus_required/u);
});

test("permission page requires explicit scope, WeChat launcher and same-user/task AppBrand return owner", () => {
  assert.throws(() => foregroundActivity(permissionHistory()), /foreground_required/u);
  assert.equal(foregroundActivity(permissionHistory(), { permissionScope: "settings" }), permissionsActivity);
  for (const options of [{ from: "com.other" }, { underlyingTask: 42 }, { underlyingUser: 10 }]) {
    assert.throws(() => foregroundActivity(permissionHistory(options), { permissionScope: "settings" }), /owner_unproven/u);
  }
  assert.throws(() => foregroundActivity(permissionHistory().replaceAll(activity, "com.tencent.mm/.ui.LauncherUI"), { permissionScope: "settings" }), /owner_unproven/u);
  assert.throws(() => foregroundActivity(permissionHistory().replaceAll(permissionsActivity, "com.android.permissioncontroller/.GrantPermissionsActivity"), { permissionScope: "settings" }), /foreground_required/u);
  assert.throws(() => foregroundActivity(`mResumedActivity: ActivityRecord{abc u0 ${activity} t1}`, { permissionScope: "settings" }), /permission_settings_foreground_required/u);
  const detailActivity = permissionsActivity.replace("AuthorizeUI", "AuthorizeDetailUI");
  const detail = permissionHistory().replaceAll(permissionsActivity, detailActivity);
  assert.throws(() => foregroundActivity(detail, { permissionScope: "settings" }), /parent_unproven/u);
  assert.equal(foregroundActivity(`${detail}\n* Hist #2: ActivityRecord{ghi u0 ${permissionsActivity} t41}\n`, { permissionScope: "settings" }), detailActivity);
  assert.throws(() => foregroundActivity(`${detail}\n* Hist #2: ActivityRecord{ghi u0 ${permissionsActivity} t42}\n`, { permissionScope: "settings" }), /parent_unproven/u);
});

test("permission capture enables only a fresh scoped tap/back, never ordinary capture or swipes", async (t) => {
  const state = await session(t); const { driver, calls } = adbDriver({ permissions: true }); const output = [];
  const context = { adb: driver, emit: (value) => output.push(value) };
  await assert.rejects(main(["capture", "--session", state.directory], context), /foreground_required/u);
  await main(["capture-permissions", "--session", state.directory], context);
  assert.equal(output[0].screenScope, "settings");
  assert.equal((await loadSession(state.directory)).capture.permissionScope, "settings");
  await assert.rejects(main(["swipe", "--session", state.directory, "--x", "0.5", "--y", "0.5", "--to-x", "0.5", "--to-y", "0.8", "--ms", "500"], context), /permission_input_invalid/u);
  assert.ok(!calls.some((args) => args.includes("input")));
  assert.equal((await loadSession(state.directory)).capture, null);
  await main(["capture-permissions", "--session", state.directory], context);
  await main(["tap", "--session", state.directory, "--x", "0.8", "--y", "0.3"], context);
  assert.equal(output.at(-1).actionSent, "tap");
  assert.ok(!JSON.stringify(output).includes("private-serial"));
  assert.equal((await loadSession(state.directory)).capture, null);
});

test("Android location prompt is separately scoped, attributable to WeChat and system-owned", async (t) => {
  const history = permissionHistory().replaceAll(permissionsActivity, systemLocationActivity);
  assert.equal(foregroundActivity(history, { permissionScope: "location-prompt" }), systemLocationActivity);
  for (const permissionScope of ["none", "settings", "unknown"]) assert.throws(() => foregroundActivity(history, { permissionScope }), /device_test_/u);
  assert.throws(() => foregroundActivity(history.replaceAll("launchedFromPackage=com.tencent.mm", "launchedFromPackage=com.other"), { permissionScope: "location-prompt" }), /owner_unproven/u);
  assert.throws(() => foregroundActivity(history.replaceAll(systemLocationActivity, "com.android.settings/.Settings"), { permissionScope: "location-prompt" }), /location_prompt_foreground_required/u);
  const fake = adbDriver({ osLocation: true, systemPackage: false }); await fake.driver.select();
  await assert.rejects(fake.driver.screenshot({ permissionScope: "location-prompt" }), /system_package_required/u);
  assert.ok(!fake.calls.some((args) => args.includes("screencap")));
  const state = await session(t); const { driver } = adbDriver({ osLocation: true }); const output = [];
  const context = { adb: driver, emit: (value) => output.push(value) };
  await main(["capture-location", "--session", state.directory], context);
  assert.equal(output[0].screenScope, "location-prompt");
  await main(["tap", "--session", state.directory, "--x", "0.5", "--y", "0.5"], context);
  assert.equal(output.at(-1).actionSent, "tap");
  assert.equal((await loadSession(state.directory)).capture, null);
});

test("pixel coordinates, PNG header and swipe duration have explicit bounds", async () => {
  assert.deepEqual(normalizedPoint(1, 0.5, { width: 1080, height: 2400 }), [1079, 1200]);
  for (const x of [-1, 1.01, NaN, Infinity, "0.5"]) assert.throws(() => normalizedPoint(x, 0, { width: 10, height: 10 }), /coordinates_invalid/u);
  assert.deepEqual(pngSize(png()), { width: 1080, height: 2400 });
  assert.throws(() => pngSize(Buffer.from("private tool failure")), /screenshot_invalid/u);
  const { driver, calls } = adbDriver(); await driver.select();
  const capture = { activity, size: { width: 1080, height: 2400 } };
  await assert.rejects(driver.input("swipe", [0, 0, 1, 1, 0], capture), /duration_invalid/u);
  assert.ok(!calls.some((args) => args.includes("input")));
  await driver.input("tap", [0.5, 0.5], capture);
  assert.deepEqual(calls.at(-1), ["-s", "private-serial", "shell", "input", "tap", "540", "1200"]);
});

test("changed orientation prevents stale screenshot coordinates", async () => {
  const { driver, calls } = adbDriver({ changed: true }); await driver.select();
  await assert.rejects(driver.input("tap", [0.5, 0.5], { activity, size: { width: 1080, height: 2400 } }), /display_changed/u);
  assert.ok(!calls.some((args) => args.includes("input")));
});

test("screenshot retries one transient post-capture tool failure and returns the verified frame", async () => {
  const waits = [];
  const fixture = screenshotDriver({ wait: async (milliseconds) => waits.push(milliseconds), afterCapture: [
    { activityError: new Error("device_test_tool_failed") },
    appBrandForegroundState(),
  ] });
  await fixture.driver.select();
  const result = await fixture.driver.screenshot();
  assert.equal(result.activity, activity);
  assert.deepEqual(result.size, { width: 1080, height: 2400 });
  assert.equal(fixture.postCaptureAttempts, 2);
  assert.deepEqual(waits, [100]);
});

test("screenshot bounds continuous post-capture tool failures to the retry budget", async () => {
  const fixture = screenshotDriver({ afterCapture: Array.from({ length: 4 }, () => ({
    activityError: new Error("device_test_tool_failed"),
  })) });
  await fixture.driver.select();
  await assert.rejects(fixture.driver.screenshot(), { message: "device_test_tool_failed" });
  assert.equal(fixture.postCaptureAttempts, 2);
});

test("screenshot never retries or swallows semantic foreground, focus or permission failures", async () => {
  const cases = [
    {
      name: "foreground",
      afterCapture: [{ activity: "mResumedActivity: ActivityRecord{abc u0 com.tencent.mm/.ui.LauncherUI t1}", window: "mCurrentFocus=Window{abc u0 com.tencent.mm/.ui.LauncherUI}" }],
      expected: /wechat_miniapp_foreground_required/u,
    },
    {
      name: "focus",
      afterCapture: [appBrandForegroundState(activity, "com.tencent.mm/com.tencent.mm.plugin.appbrand.ui.AppBrandUI1")],
      expected: /wechat_miniapp_focus_required/u,
    },
    {
      name: "permission",
      permissionScope: "settings",
      initial: { activity: permissionHistory(), window: `mCurrentFocus=Window{abc u0 ${permissionsActivity}}` },
      afterCapture: [appBrandForegroundState()],
      expected: /permission_settings_foreground_required/u,
    },
  ];
  for (const scenario of cases) {
    const fixture = screenshotDriver(scenario);
    await fixture.driver.select();
    await assert.rejects(fixture.driver.screenshot({ permissionScope: scenario.permissionScope }), scenario.expected, scenario.name);
    assert.equal(fixture.postCaptureAttempts, 1, `${scenario.name} failure must not be retried`);
  }
});

test("screenshot rejects a changed foreground activity after capture without retrying", async () => {
  const changedActivity = `${activity}1`;
  const fixture = screenshotDriver({ afterCapture: [appBrandForegroundState(changedActivity)] });
  await fixture.driver.select();
  await assert.rejects(fixture.driver.screenshot(), { message: "device_test_foreground_changed" });
  assert.equal(fixture.postCaptureAttempts, 1);
});

test("session binds bundle before and after, rejects concurrent use, and cleans only owned directory", async (t) => {
  const state = await session(t);
  await assert.rejects(externalDirectory(process.cwd()), /external_physical_directory_required/u);
  await withSession(state.directory, async () => {
    await assert.rejects(withSession(state.directory, async () => {}), /session_busy/u);
  });
  await assert.rejects(withSession(state.directory, async () => {
    await writeFile(path.join(state.binding.bundle, "app.js"), "changed");
  }), /bundle_changed_start_new_session/u);
  await stopSession(state.directory);
  await assert.rejects(access(state.directory));
  await access(state.binding.project);
  await assert.rejects(stopSession(state.binding.project), /session_directory_invalid/u);
});

test("capture needed for each input, expires and is bound to the same device", async (t) => {
  const state = await session(t);
  assert.throws(() => assertCapture(state, "serial"), /recent_capture_required/u);
  state.capture = { at: 1000, device: deviceBinding(state, "serial") };
  assertCapture(state, "serial", 2000);
  assert.throws(() => assertCapture(state, "another", 2000), /device_changed/u);
  assert.throws(() => assertCapture(state, "serial", 62000), /recent_capture_required/u);
  assert.throws(() => assertCapture(state, "serial", 500), /recent_capture_required/u);
  assert.notEqual(deviceBinding(state, "serial"), deviceBinding({ salt: "other" }, "serial"));
});

test("CLI capture/input is scoped, private and never claims acceptance or permits replay", async (t) => {
  const state = await session(t);
  const { driver } = adbDriver(); const output = [];
  const context = { adb: driver, emit: (value) => output.push(value) };
  await main(["capture", "--session", state.directory], context);
  assert.equal(output[0].runtimeAppIdVerified, false);
  assert.equal(output[0].acceptance, "not_evaluated");
  assert.ok(!JSON.stringify(output).includes("private-serial"));
  await main(["tap", "--session", state.directory, "--x", "0.5", "--y", "0.5"], context);
  assert.equal((await loadSession(state.directory)).capture, null);
  await assert.rejects(main(["back", "--session", state.directory], context), /recent_capture_required/u);
  assert.ok(!(await readFile(path.join(state.directory, "session.json"), "utf8")).includes("private-serial"));
});

test("post-capture drift suppresses successful output", async (t) => {
  const state = await session(t); const output = [];
  const driver = { select: async () => "serial", screenshot: async () => {
    await writeFile(path.join(state.binding.bundle, "changed.js"), "changed");
    return { bytes: png(), activity, size: { width: 1080, height: 2400 } };
  } };
  await assert.rejects(main(["capture", "--session", state.directory], { adb: driver, emit: (value) => output.push(value) }), /bundle_changed/u);
  assert.deepEqual(output, []);
});

test("argument and endpoint allowlists block command passthrough or remote hosts", () => {
  assert.throws(() => parseArguments(["shell", "rm"]), /action_invalid/u);
  assert.throws(() => parseArguments(["doctor", "--serial", "private"]), /argument_invalid/u);
  assert.throws(() => parseArguments(["capture"]), /argument_missing/u);
  assert.equal(automationEndpoint("ws://127.0.0.1:9420"), "ws://127.0.0.1:9420/");
  for (const value of ["ws://example.com:9420", "ws://user:pass@127.0.0.1:9420", "ws://127.0.0.1:9420/?token=secret", "https://127.0.0.1:9420"]) assert.throws(() => automationEndpoint(value), /endpoint_required/u);
});

test("SDK probe rejects simulator and wrong account; only whitelisted fields leave runtime", async () => {
  const binding = { appId: testAppId };
  const mini = {
    systemInfo: async () => ({ platform: "devtools" }),
    callWxMethod: async () => ({ miniProgram: { appId: "wrong" } }),
    evaluate: async () => ({ width: 375, height: 812, statusBarHeight: 44, secret: "private", menu: { bottom: 80, token: "private" } }),
    currentPage: async () => ({ path: "pages/map/index", $: async () => null }),
  };
  await assert.rejects(inspectRuntime(mini, binding), /physical_runtime_required/u);
  mini.systemInfo = async () => ({ platform: "android", system: "Android 15", version: "8.0.0", SDKVersion: "3.17.1", serial: "private" });
  await assert.rejects(inspectRuntime(mini, binding), /app_id_mismatch/u);
  mini.callWxMethod = async () => ({ miniProgram: binding });
  const result = await inspectRuntime(mini, binding);
  assert.equal(result.platform, "android");
  assert.equal(result.phoneBundleBytesVerified, false);
  assert.equal(result.metrics.menu.bottom, 80);
  assert.ok(!JSON.stringify(result).includes("private"));
  for (const route of [
    "spot/search/index",
    "sky/detail/index",
    "content/settings/index",
    "content/plan/detail/index",
    "content/profile/links/index",
    "content/import/index",
    "content/contribution/index",
  ]) {
    await access(new URL(`../../apps/wechat-miniapp/src/${route}.tsx`, import.meta.url));
    mini.currentPage = async () => ({ path: route });
    assert.equal((await inspectRuntime(mini, binding)).route, route);
  }
  for (const route of [
    "spot/detail/index",
    "spot/sky/index",
    "sky/professional/index",
    "sky/targets/index",
    "content/plan/detail/index?private=secret",
  ]) {
    mini.currentPage = async () => ({ path: route });
    const unknown = await inspectRuntime(mini, binding);
    assert.equal(unknown.route, "other_route");
    assert.ok(!JSON.stringify(unknown).includes("private"));
  }
});

test("child failures redact stderr; deadlines terminate owned child", async () => {
  await assert.rejects(runTool(process.execPath, ["-e", "process.stderr.write('secret private-serial');process.exit(1)"]), { message: "device_test_tool_failed" });
  await assert.rejects(runTool(process.execPath, ["-e", "setInterval(()=>{},1000)"], { timeout: 100 }), { message: "device_test_tool_timeout" });
  await assert.rejects(runTool(process.execPath, ["-e", "process.stdout.write('x'.repeat(10000))"], { maxBytes: 10 }), { message: "device_test_tool_output_limit" });
});

test("official terminal QR retains its scannable content without recording decoded data", async () => {
  const require = createRequire(import.meta.url);
  const terminal = require("qrcode-terminal");
  const Reader = require("qrcode-reader");
  const expected = "starward-device-diagnostic-fixture";
  let printed;
  terminal.generate(expected, { small: true }, (value) => { printed = value; });
  const bitmap = PNG.sync.read(terminalQrPng(printed));
  const result = await new Promise((resolve, reject) => {
    const decoder = new Reader();
    decoder.callback = (error, value) => error ? reject(error) : resolve(value.result);
    decoder.decode(bitmap);
  });
  assert.equal(result, expected);
  assert.deepEqual([...bitmap.data.subarray(0, 4)], [255, 255, 255, 255]);
  for (const invalid of ["secret-url", "█ \n", printed.replace("▄", "x"), printed.slice(0, -10)]) {
    assert.throws(() => terminalQrPng(invalid), /qr_format_unsupported/u);
  }
});

test("progress stream emits only fixed stages, strips extra fields and handles chunk boundaries", () => {
  const events = [];
  const consume = remoteProgressConsumer((value) => events.push(value));
  consume(Buffer.from('{"state":"remote_qr_'));
  consume(Buffer.from('ready","token":"private"}\nprivate-console\n{"state":"injected"}\n{"error":"private"}\n'));
  assert.deepEqual(events, [{ state: "remote_qr_ready" }]);
});

test("QR scan receives a fresh budget after generation and teardown cancels its deadline", () => {
  const timers = new Map(); let time = 0; let id = 0; const expired = [];
  const clock = {
    clearTimeout: (key) => timers.delete(key),
    setTimeout: (callback, ms) => { timers.set(++id, { callback, at: time + ms }); return id; },
  };
  function tick(ms) {
    time += ms;
    for (const [key, timer] of timers) if (timer.at <= time) { timers.delete(key); timer.callback(); }
  }
  const deadline = remoteDeadline((stage) => expired.push(stage), clock);
  deadline.enter("remote_requested"); tick(80_000);
  deadline.enter("remote_qr_ready"); tick(179_999);
  assert.deepEqual(expired, []);
  tick(1); assert.deepEqual(expired, ["remote_qr_ready"]);
  deadline.enter("remote_connected"); deadline.stop(); tick(25_000);
  assert.deepEqual(expired, ["remote_qr_ready"]);
});
