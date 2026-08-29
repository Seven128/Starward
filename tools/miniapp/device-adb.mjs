import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

export function fail(code) { throw new Error(`device_test_${code}`); }

// Never surface a child's stderr: it may contain a serial, URL, token or user text.
export function runTool(file, args, { timeout = 15_000, maxBytes = 16 * 1024 * 1024, onStdout } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ADB_TRACE;
    const child = spawn(file, args, { shell: false, windowsHide: true, env, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let bytes = 0;
    let failure;
    const timer = setTimeout(() => { failure = "tool_timeout"; child.kill(); }, timeout);
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) { failure = "tool_output_limit"; child.kill(); }
      else {
        chunks.push(chunk);
        try { onStdout?.(chunk); } catch { failure = "tool_output_invalid"; child.kill(); }
      }
    });
    child.stderr.on("data", () => {});
    child.once("error", () => { clearTimeout(timer); reject(new Error("device_test_tool_unavailable")); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (failure || code !== 0) reject(new Error(`device_test_${failure || "tool_failed"}`));
      else resolve(Buffer.concat(chunks));
    });
  });
}

export async function findAdb(env = process.env) {
  const candidates = [env.STARWARD_ADB_PATH,
    env.ANDROID_SDK_ROOT && path.join(env.ANDROID_SDK_ROOT, "platform-tools", "adb.exe"),
    env.ANDROID_HOME && path.join(env.ANDROID_HOME, "platform-tools", "adb.exe"),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe"),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "StarwardTools", "android-platform-tools", "platform-tools", "adb.exe"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch {}
  }
  return process.platform === "win32" ? "adb.exe" : "adb";
}

export function deviceSummary(output) {
  const states = String(output).split(/\r?\n/u).flatMap((line) => {
    const match = line.match(/^\S+\s+(device|offline|unauthorized|recovery|sideload)\b/u);
    return match ? [match[1]] : [];
  });
  return { detected: states.length, states };
}

function canonicalActivity(value) {
  return value?.replace("com.tencent.mm/.", "com.tencent.mm/com.tencent.mm.");
}
const appBrandActivity = /^com\.tencent\.mm\/com\.tencent\.mm\.plugin\.appbrand\.ui\.AppBrandUI\d*$/u;
const permissionActivity = "com.tencent.mm/com.tencent.mm.plugin.appbrand.ui.AppBrandAuthorizeUI";
const permissionDetailActivity = "com.tencent.mm/com.tencent.mm.plugin.appbrand.ui.AppBrandAuthorizeDetailUI";
// Extend only after observing and testing a system-owned OEM permission component.
const systemLocationActivity = "com.android.permissioncontroller/com.skyui.permissioncontroller.request.ui.SkyGrantPermissionsActivity";

function verifyPermissionOwner(output, activity) {
  // Read only OS activity metadata in memory. Never emit task/user ids or intent extras.
  const records = String(output).split(/(?=^\s*\*\s*(?:Hist\s+#\d+:\s*ActivityRecord|Task\{))/mu).flatMap((section) => {
    const header = section.match(/^\s*\*\s*Hist\s+#\d+:\s*ActivityRecord\{[^\r\n]*?\bu(\d+)\s+(\S+\/\S+)\s+t(\d+)\b/u);
    return header ? [{ user: header[1], activity: canonicalActivity(header[2]), task: header[3], fromWechat: /\blaunchedFromPackage=com\.tencent\.mm(?:\s|$)/u.test(section) }] : [];
  });
  const permissions = records.filter((record) => record.activity === activity);
  if (permissions.length !== 1 || !permissions[0].fromWechat || !records.some((record) =>
    appBrandActivity.test(record.activity) && record.user === permissions[0].user && record.task === permissions[0].task)) fail("permission_settings_owner_unproven");
  if (activity === permissionDetailActivity && !records.some((record) => record.activity === permissionActivity &&
    record.user === permissions[0].user && record.task === permissions[0].task)) fail("permission_settings_parent_unproven");
}

export function foregroundActivity(output, { permissionScope = "none" } = {}) {
  // Do not persist dumpsys. Only one current resumed activity is accepted.
  const activities = [...String(output).matchAll(/(?:mResumedActivity|topResumedActivity)\s*[:=][^\r\n]*?\s([^\s}]+\/[^\s}]+)/gu)]
    .map((match) => canonicalActivity(match[1]));
  const unique = [...new Set(activities)];
  if (unique.length !== 1) fail("wechat_miniapp_foreground_required");
  if (permissionScope === "settings") {
    if (![permissionActivity, permissionDetailActivity].includes(unique[0])) fail("permission_settings_foreground_required");
    verifyPermissionOwner(output, unique[0]);
  } else if (permissionScope === "location-prompt") {
    if (unique[0] !== systemLocationActivity) fail("location_prompt_foreground_required");
    verifyPermissionOwner(output, unique[0]);
  } else if (permissionScope !== "none") fail("permission_scope_invalid");
  else if (!appBrandActivity.test(unique[0])) fail("wechat_miniapp_foreground_required");
  // Each scope still requires its exact focused window; no arbitrary system UI.
  return unique[0];
}

export function verifyFocusedWindow(output, activity) {
  let scope = String(output);
  if (/Display:\s*mDisplayId=/u.test(scope)) {
    const primary = scope.split(/(?=^\s*Display:\s*mDisplayId=)/mu).filter((section) => /^\s*Display:\s*mDisplayId=0\b/u.test(section));
    if (primary.length !== 1) fail("primary_display_focus_unavailable");
    scope = primary[0];
  }
  const match = scope.match(/mCurrentFocus=Window\{[^\r\n]*?\s([^\s}]+\/[^\s}]+)/u);
  if (!match || canonicalActivity(match[1]) !== canonicalActivity(activity)) fail("wechat_miniapp_focus_required");
}

export function pngSize(bytes) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.toString("ascii", 12, 16) !== "IHDR") fail("screenshot_invalid");
  const size = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (!size.width || !size.height || size.width > 10000 || size.height > 10000) fail("screenshot_invalid");
  return size;
}

export function normalizedPoint(x, y, size) {
  if (![x, y].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1)) fail("coordinates_invalid");
  return [Math.round(x * (size.width - 1)), Math.round(y * (size.height - 1))];
}

export class AdbDevice {
  constructor(file, run = runTool) { this.file = file; this.run = run; }
  async invoke(args) { return this.run(this.file, args); }
  async doctor() {
    const version = (await this.invoke(["version"])).toString().match(/Android Debug Bridge version ([\d.]+)/u)?.[1] ?? "unknown";
    const summary = deviceSummary((await this.invoke(["devices", "-l"])).toString());
    let usbReady = false;
    try { await this.select(); usbReady = true; } catch {}
    return { adbVersion: version, ...summary, usbReady, acceptance: "not_evaluated" };
  }
  async select() {
    // -d is the official single USB transport selector; no guessing from serial strings.
    let state;
    try { state = (await this.invoke(["-d", "get-state"])).toString().trim(); }
    catch { fail("single_authorized_usb_required"); }
    if (state !== "device") fail("single_authorized_usb_required");
    const serial = (await this.invoke(["-d", "get-serialno"])).toString().trim();
    if (!serial || serial === "unknown" || /[\s\0]/u.test(serial)) fail("usb_identity_unavailable");
    this.serial = serial;
    return serial;
  }
  async command(args) {
    if (!this.serial) fail("usb_not_selected");
    return this.invoke(["-s", this.serial, ...args]);
  }
  async foreground(options) {
    const activity = foregroundActivity((await this.command(["shell", "dumpsys", "activity", "activities"])).toString(), options);
    if (options?.permissionScope === "location-prompt") {
      const packageInfo = (await this.command(["shell", "dumpsys", "package", "com.android.permissioncontroller"])).toString();
      if (!/pkgFlags=\[[^\]\r\n]*\bSYSTEM\b/u.test(packageInfo) || !/codePath=\/(?:system|system_ext|product|apex)\//u.test(packageInfo)) fail("permission_controller_system_package_required");
    }
    let windows = (await this.command(["shell", "dumpsys", "window", "windows"])).toString();
    if (!windows.includes("mCurrentFocus")) windows = (await this.command(["shell", "dumpsys", "window", "displays"])).toString();
    verifyFocusedWindow(windows, activity);
    return activity;
  }
  async screenshot({ permissionScope = "none" } = {}) {
    const activity = await this.foreground({ permissionScope });
    const bytes = await this.command(["exec-out", "screencap", "-p"]);
    const size = pngSize(bytes);
    if (await this.foreground({ permissionScope }) !== activity) fail("foreground_changed");
    return { bytes, size, activity, permissionScope };
  }
  async input(action, values, capture) {
    const permissionScope = capture.permissionScope ?? "none";
    if (permissionScope !== "none" && !["tap", "back"].includes(action)) fail("permission_input_invalid");
    const activity = await this.foreground({ permissionScope });
    if (activity !== capture.activity) fail("foreground_changed");
    // screencap dimensions follow current rotation, unlike wm size's natural orientation.
    const current = await this.screenshot({ permissionScope });
    if (current.size.width !== capture.size.width || current.size.height !== capture.size.height) fail("display_changed");
    let args;
    if (action === "tap") args = ["tap", ...normalizedPoint(...values, current.size)];
    else if (action === "swipe") {
      const [x1, y1, x2, y2, ms] = values;
      if (!Number.isInteger(ms) || ms < 100 || ms > 2000) fail("swipe_duration_invalid");
      args = ["swipe", ...normalizedPoint(x1, y1, current.size), ...normalizedPoint(x2, y2, current.size), ms];
    } else if (action === "back") args = ["keyevent", "KEYCODE_BACK"];
    else fail("unsupported_input");
    await this.command(["shell", "input", ...args.map(String)]);
  }
}
