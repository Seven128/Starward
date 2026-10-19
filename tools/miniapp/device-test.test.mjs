import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { AdbDevice, deviceSummary, foregroundActivity, verifyFocusedWindow, normalizedPoint, pngSize, runTool } from "./device-adb.mjs";
import { startSession, withSession, stopSession, loadSession, deviceBinding, assertCapture, externalDirectory } from "./device-session.mjs";
import { automationEndpoint, inspectRuntime } from "./device-runtime.mjs";
import { main, parseArguments } from "./device-test.mjs";
import { terminalQrPng, remoteProgressConsumer, remoteDeadline } from "./device-qr.mjs";

import { activity, permissionsActivity, systemLocationActivity, permissionHistory, png } from "./device-test-fixtures.mjs";

const testAppId = ["wx", "1234567890abcdef"].join("");
const locationPickerActivity = "com.tencent.mm/com.tencent.mm.plugin.location_soso.SoSoProxyUI";

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
function adbDriver({ changed = false, permissions = false, osLocation = false, locationPicker = false, systemPackage = true } = {}) {
  const calls = [];
  const driver = new AdbDevice("fixture-adb", async (_file, args) => {
    calls.push(args);
    if (args.join(" ") === "version") return Buffer.from("Android Debug Bridge version 1.0.41");
    if (args.join(" ") === "devices -l") return Buffer.from("List of devices attached\nprivate-serial device product:test\n");
    if (args.join(" ") === "-d get-state") return Buffer.from("device\n");
    if (args.join(" ") === "-d get-serialno") return Buffer.from("private-serial\n");
    const command = args.slice(2).join(" ");
    if (command === "shell dumpsys activity activities") return Buffer.from(locationPicker ? permissionHistory().replaceAll(permissionsActivity, locationPickerActivity) : osLocation ? permissionHistory().replaceAll(permissionsActivity, systemLocationActivity) : permissions ? permissionHistory() : `mResumedActivity: ActivityRecord{abc u0 ${activity} t1}`);
    if (command === "shell dumpsys window windows") return Buffer.from(`mCurrentFocus=Window{abc u0 ${locationPicker ? locationPickerActivity : osLocation ? systemLocationActivity : permissions ? permissionsActivity : activity}}`);
    if (command === "shell dumpsys package com.android.permissioncontroller") return Buffer.from(systemPackage ? "pkgFlags=[ SYSTEM HAS_CODE ]\n codePath=/system_ext/priv-app/PermissionController" : "pkgFlags=[ HAS_CODE ]\n codePath=/data/app/unknown");
    if (command === "exec-out screencap -p") return png(changed ? 2400 : 1080, changed ? 1080 : 2400);
    if (command.startsWith("shell input")) return Buffer.alloc(0);
    throw new Error("unexpected_driver_call");
  });
  return { driver, calls };
}

test("captures preserve immutable image paths and receipts even at the same timestamp", async (t) => {
  const state = await session(t), { driver } = adbDriver(), output = [];
  const image = new PNG({ width: 2, height: 2 }); image.data.fill(0xff);
  const firstBytes = PNG.sync.write(image); image.data[0] = 0;
  const secondBytes = PNG.sync.write(image), originalCommand = driver.command.bind(driver);
  let bytes = firstBytes;
  driver.command = (args, options) => args.join(" ") === "exec-out screencap -p" ? Promise.resolve(bytes) : originalCommand(args, options);
  const fixedAt = 1_800_000_000_000;
  t.mock.method(Date, "now", () => fixedAt);
  const context = { adb: driver, emit: value => output.push(value) };
  const legacy = path.join(state.directory, "screen.png"); await writeFile(legacy, "old private capture");
  await main(["capture", "--session", state.directory], context);
  bytes = secondBytes;
  await main(["capture", "--session", state.directory], context);
  await main(["capture", "--session", state.directory], context);
  assert.equal(new Set(output.map(value => value.screenshot)).size, 3);
  assert.equal(new Set(output.map(value => value.captureId)).size, 3);
  assert.deepEqual(await readFile(output[0].screenshot), firstBytes);
  assert.deepEqual(await readFile(output[1].screenshot), secondBytes);
  assert.equal(await readFile(legacy, "utf8"), "old private capture");
  assert.notEqual(output[0].screenshotSha256, output[1].screenshotSha256);
  assert.equal(output[1].screenshotSha256, output[2].screenshotSha256);
  for (const value of output) {
    const saved = await readFile(value.screenshot), receipt = JSON.parse(await readFile(value.screenshotMetadata, "utf8"));
    assert.equal(value.capturedAt, new Date(fixedAt).toISOString());
    assert.equal(value.screenshotSha256, createHash("sha256").update(saved).digest("hex"));
    assert.equal(receipt.captureId, value.captureId); assert.equal(receipt.capturedAt, value.capturedAt);
    assert.equal(receipt.sha256, value.screenshotSha256); assert.equal(receipt.bytes, saved.length);
    assert.equal(receipt.file, path.basename(value.screenshot)); assert.equal(receipt.screenScope, "miniapp");
    assert.ok(!JSON.stringify(receipt).includes("private-serial"));
  }
  const current = await loadSession(state.directory);
  assert.equal(current.capture.file, output[2].screenshot); assert.equal(current.capture.at, fixedAt);
  assertCapture(current, "private-serial", fixedAt + 60_000);
  assert.throws(() => assertCapture(current, "private-serial", fixedAt + 60_001), /recent_capture_required/);
  await stopSession(state.directory);
  for (const value of output) await assert.rejects(access(value.screenshot));
  await access(state.binding.project);
});

test("recording failure consumes the reviewed screenshot authority without publishing media or replaying input", async (t) => {
  for (const action of ["record-tap","record"]) {
  const state = await session(t), { driver, calls } = adbDriver(), output = [];
  const context = { adb: driver, emit: value => output.push(value) };
  await main(["capture", "--session", state.directory], context);
  await assert.rejects(main([action, "--session", state.directory, ...(action==="record"?[]:["--x", ".5", "--y", ".5"])], context));
  assert.equal((await loadSession(state.directory)).capture, null);
  assert.equal(output.length, 1);
  assert.ok(!calls.some(args => args.includes("input")));
  await assert.rejects(main(["tap", "--session", state.directory, "--x", ".5", "--y", ".5"], context), /recent_capture_required/);
  }
});

test("permission screenshots cannot extend the input grant into a recording", async (t) => {
  for (const action of ["record-tap","record"]) {
  const state = await session(t), { driver, calls } = adbDriver({ permissions: true });
  const context = { adb: driver, emit: () => {} };
  await main(["capture-permissions", "--session", state.directory], context);
  await assert.rejects(main([action, "--session", state.directory, ...(action==="record"?[]:["--x", ".5", "--y", ".5"])], context), /recording_scope_invalid/);
  assert.equal((await loadSession(state.directory)).capture, null);
  assert.ok(!calls.some(args => args.includes("input") || args.includes("sh")));
  }
});

test("read-only recording command stores guarded private media and explicitly reports no input", async (t) => {
  const state=await session(t),{driver,calls}=adbDriver(),output=[];
  const originalCommand=driver.command.bind(driver),video=Buffer.alloc(64);
  video.writeUInt32BE(24,0);video.write("ftypisom",4,"ascii");
  driver.command=async(args,options)=>{
    if(args[0]==="exec-out"&&args[1]==="sh"){
      assert.match(args[3], /--time-limit 15 /);
      options.onStdout(Buffer.from("4712\n"));
      return Buffer.concat([Buffer.from("4712\n"),video]);
    }
    return originalCommand(args,options);
  };
  const context={adb:driver,emit:value=>output.push(value)};
  await main(["capture","--session",state.directory],context);
  await main(["record","--session",state.directory,"--seconds","15"],context);
  assert.equal(output.length,2);
  assert.equal(output[1].inputSent,false);
  assert.equal(output[1].requestedSeconds,15);
  assert.equal(output[1].actionSent,undefined);
  assert.deepEqual(await readFile(output[1].video),video);
  assert.equal(path.dirname(output[1].video),state.directory);
  assert.notEqual(output[0].screenshot,output[1].screenshot);
  assert.deepEqual(await readFile(output[0].screenshot),png());
  const receipt=JSON.parse(await readFile(output[1].screenshotMetadata,"utf8"));
  assert.equal(receipt.sha256,createHash("sha256").update(await readFile(output[1].screenshot)).digest("hex"));
  assert.equal((await loadSession(state.directory)).capture.file,output[1].screenshot);
  assert.equal((await loadSession(state.directory)).capture.permissionScope,"none");
  assert.ok(!calls.some(args=>args.includes("input")));
});

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
  assert.deepEqual(deviceSummary("List of devices attached\n(no serial number)     device product:N2401 transport_id:2"), { detected: 1, states: ["device"] });
  const { driver, calls } = adbDriver();
  const result = await driver.doctor();
  assert.equal(result.usbReady, true);
  assert.ok(!JSON.stringify(result).includes("private-serial"));
  assert.ok(calls.some((args) => args.join(" ") === "-d get-serialno"));
});

test("OEM USB device without a serial binds its exact transport and invalidates it after reconnect", async () => {
  const calls = [];
  let currentPath = "usb:1-2";
  const driver = new AdbDevice("fixture-adb", async (_file, args) => {
    calls.push(args);
    const command = args.join(" ");
    if (command === "-d get-state") return Buffer.from("device\n");
    if (command === "-d get-serialno") return Buffer.from("(no serial number)\n");
    if (command === "-d get-devpath") return Buffer.from("usb:1-2\n");
    if (command === "devices -l") return Buffer.from("List of devices attached\n(no serial number) device product:N2401 transport_id:7\nemulator-5554 device transport_id:8\n");
    if (command === "-t 7 get-devpath") return Buffer.from(`${currentPath}\n`);
    if (command === "-t 8 get-devpath") return Buffer.from("local:5554\n");
    if (command === "-t 7 shell echo ready") return Buffer.from("ready\n");
    throw new Error("unexpected_driver_call");
  });
  const identity = await driver.select();
  assert.equal(identity, "transport:7:usb:1-2");
  assert.equal((await driver.command(["shell", "echo", "ready"])).toString().trim(), "ready");
  assert.ok(calls.some((args) => args.join(" ") === "-t 7 shell echo ready"));
  currentPath = "usb:1-3";
  await assert.rejects(driver.command(["shell", "echo", "ready"]), /device_changed_capture_again/u);
});

test("explicit wireless selection binds one TLS transport privately and invalidates endpoint drift", async () => {
  const calls = [];
  let endpoint = "192.0.2.10:37123";
  const driver = new AdbDevice("fixture-adb", async (_file, args) => {
    calls.push(args);
    const command = args.join(" ");
    if (command === "devices -l") return Buffer.from(`List of devices attached\nusb-fixture device product:test transport_id:4\n${endpoint} device product:test transport_id:9\n`);
    if (command === "-t 9 get-state") return Buffer.from("device\n");
    if (command === "-t 9 get-serialno") return Buffer.from(`${endpoint}\n`);
    if (command === "-t 9 shell echo ready") return Buffer.from("ready\n");
    throw new Error("unexpected_driver_call");
  });
  const identity = await driver.select({ transport: "wireless" });
  assert.match(identity, /^wireless:[a-f0-9]{64}$/u);
  assert.ok(!identity.includes(endpoint));
  assert.equal((await driver.command(["shell", "echo", "ready"])).toString().trim(), "ready");
  assert.ok(calls.some((args) => args.join(" ") === "-t 9 shell echo ready"));
  endpoint = "192.0.2.10:38999";
  await assert.rejects(driver.command(["shell", "echo", "ready"]), /device_changed_capture_again/u);
});

test("wireless selection requires an explicit unique connected TLS target", async () => {
  const none = new AdbDevice("fixture-adb", async () => Buffer.from("List of devices attached\nusb-fixture device product:test transport_id:4\n"));
  await assert.rejects(none.select({ transport: "wireless" }), /single_authorized_wireless_required/u);
  const ambiguous = new AdbDevice("fixture-adb", async () => Buffer.from("List of devices attached\n192.0.2.10:37123 device transport_id:9\n192.0.2.11:38455 device transport_id:10\n"));
  await assert.rejects(ambiguous.select({ transport: "wireless" }), /single_authorized_wireless_required/u);
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

test("observed native location picker requires explicit scope and its AppBrand return owner", () => {
  const history = (options) => permissionHistory(options).replaceAll(permissionsActivity, locationPickerActivity);
  assert.equal(foregroundActivity(history(), { permissionScope: "location-picker" }), locationPickerActivity);
  for (const permissionScope of ["none", "settings", "location-prompt"]) {
    assert.throws(() => foregroundActivity(history(), { permissionScope }), /foreground_required/u);
  }
  for (const options of [{ from: "com.other" }, { underlyingTask: 42 }, { underlyingUser: 10 }]) {
    assert.throws(() => foregroundActivity(history(options), { permissionScope: "location-picker" }), /owner_unproven/u);
  }
  assert.throws(() => foregroundActivity(history().replaceAll(activity, "com.tencent.mm/.ui.LauncherUI"), { permissionScope: "location-picker" }), /owner_unproven/u);
  assert.throws(() => foregroundActivity(history().replaceAll(locationPickerActivity, "com.tencent.mm/.plugin.location.ui.RedirectUI"), { permissionScope: "location-picker" }), /location_picker_foreground_required/u);
  assert.throws(() => verifyFocusedWindow(`mCurrentFocus=Window{abc u0 ${activity}}`, locationPickerActivity), /focus_required/u);
});

test("native location picker fresh capture permits only one Back, never selection or text", async (t) => {
  const state = await session(t);
  const { driver, calls } = adbDriver({ locationPicker: true });
  const output = [];
  const context = { adb: driver, emit: value => output.push(value) };
  await assert.rejects(main(["capture", "--session", state.directory], context), /foreground_required/u);
  for (const args of [
    ["tap", "--x", "0.5", "--y", "0.5"],
    ["text", "--value", "A"],
    ["swipe", "--x", "0.5", "--y", "0.5", "--to-x", "0.5", "--to-y", "0.8", "--ms", "500"],
  ]) {
    await main(["capture-location-picker", "--session", state.directory], context);
    assert.equal(output.at(-1).screenScope, "location-picker");
    await assert.rejects(main([...args, "--session", state.directory], context), /location_picker_return_only/u);
    assert.equal((await loadSession(state.directory)).capture, null);
  }
  assert.ok(!calls.some(args => args.includes("input")));
  await main(["capture-location-picker", "--session", state.directory], context);
  await main(["back", "--session", state.directory], context);
  assert.equal(output.at(-1).actionSent, "back");
  assert.equal((await loadSession(state.directory)).capture, null);
  assert.equal(calls.filter(args => args.includes("input")).length, 1);
  assert.ok(calls.some(args => args.join(" ").endsWith("input keyevent KEYCODE_BACK")));
  await assert.rejects(main(["back", "--session", state.directory], context), /capture_required/u);
  assert.ok(!JSON.stringify(output).includes("private-serial"));
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

test("ASCII query input retains single-use capture and does not retain or emit the query", async (t) => {
  const state = await session(t);
  const { driver, calls } = adbDriver(); const output = [];
  const context = { adb: driver, emit: (value) => output.push(value) };
  await main(["capture", "--session", state.directory], context);
  await main(["text", "--session", state.directory, "--value", "HR 4905"], context);
  assert.deepEqual(calls.filter((args) => args.slice(2, 5).join(" ") === "shell input text").map(args => args[5]), ["H", "R", "%s", "4", "9", "0", "5"]);
  assert.equal((await loadSession(state.directory)).capture, null);
  await assert.rejects(main(["text", "--session", state.directory, "--value", "Neptune"], context), /recent_capture_required/u);
  assert.ok(!JSON.stringify(output).includes("4905"));
  assert.ok(!(await readFile(path.join(state.directory, "session.json"), "utf8")).includes("4905"));
});

test("text rejects shell syntax, Unicode, oversize and permission-scope input without sending", async () => {
  const { driver, calls } = adbDriver();
  await driver.select();
  const capture = await driver.screenshot();
  for (const value of ["", "x;id", "x\n", "$(id)", "`id`", "a&b", "x%sx", "'x'", "天王星", "a".repeat(81)]) {
    await assert.rejects(driver.input("text", [value], capture), /text_invalid/u);
  }
  await assert.rejects(driver.input("text", ["Uranus"], { ...capture, permissionScope: "settings" }), /permission_input_invalid/u);
  assert.ok(!calls.some((args) => args.includes("input")));
});

test("text stops before the next character if the foreground changes mid-query", async () => {
  const { driver, calls } = adbDriver();
  await driver.select();
  const capture = await driver.screenshot();
  const foreground = driver.foreground.bind(driver);
  driver.foreground = async options => calls.some(args => args.includes("input")) ? `${activity}1` : foreground(options);
  await assert.rejects(driver.input("text", ["AB"], capture), /foreground_changed/u);
  assert.deepEqual(calls.filter(args => args.includes("input")).map(args => args.at(-1)), ["A"]);
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
  assert.equal(parseArguments(["doctor", "--transport", "wireless"]).options.transport, "wireless");
  assert.equal(parseArguments(["capture", "--session", "private", "--transport", "wireless"]).options.transport, "wireless");
  assert.equal(parseArguments(["record", "--session", "private", "--transport", "wireless"]).action, "record");
  assert.equal(parseArguments(["record-tap", "--session", "private", "--x", ".5", "--y", ".5", "--seconds", "15"]).options.seconds, "15");
  for (const seconds of ["5", "16", "6.5", "015", "NaN", "Infinity"]) {
    assert.throws(() => parseArguments(["record", "--session", "private", "--seconds", seconds]), /recording_duration_invalid/);
  }
  assert.throws(() => parseArguments(["tap", "--session", "private", "--x", ".5", "--y", ".5", "--seconds", "15"]), /argument_invalid/);
  assert.throws(()=>parseArguments(["record", "--session", "private", "--x", ".5"]),/argument_invalid/);
  assert.throws(() => parseArguments(["doctor", "--transport", "network"]), /transport_invalid/u);
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
    "pages/auth/index",
    "spot/search/index",
    "spot/guides/index",
    "spot/field/index",
    "spot/plan/index",
    "spot/data-source/index",
    "sky/detail/index",
    "content/article/detail/index",
    "content/settings/index",
    "content/plan/detail/index",
    "content/plan/list/index",
    "content/plan/edit/index",
    "content/event/list/index",
    "content/event/detail/index",
    "content/contribution/index",
    "content/spot-feedback/index",
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
