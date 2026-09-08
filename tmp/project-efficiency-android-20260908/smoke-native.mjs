import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { parseAndroidInstalledApkPath, parseAndroidSha256sum, parseAndroidUiAutomatorDump } from "../../tools/long-task/verify-native-target.mjs";

const exec = promisify(execFile);
const directory = path.dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2];
if (!["baseline", "optimized"].includes(variant)) throw new Error("known_variant_required");
const apk = path.join(directory, `${variant}-release-x86_64.apk`);
const adbPath = path.join(process.env.ANDROID_HOME, "platform-tools", "adb.exe");
const appId = "app.starward.mobile";
const serial = "emulator-5580";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const adb = async (args, timeout = 30000, encoding = "utf8") =>
  (await exec(adbPath, ["-s", serial, ...args], { timeout, encoding, windowsHide: true, maxBuffer: 8 * 1024 * 1024 })).stdout;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const result = { scope: "release_packaging_smoke", variant, startedAt: new Date().toISOString(), apkSha256: hash(await readFile(apk)), status: "running", routes: [] };
let stage = "device_preflight";
async function waitForMarker(marker) {
  const deadline = Date.now() + 35000;
  let last;
  while (Date.now() < deadline) {
    try {
      const xml = parseAndroidUiAutomatorDump(await adb(["exec-out", "uiautomator", "dump", "/dev/tty"], 15000));
      last = hash(xml);
      if (xml.includes(marker)) return { markerPresent: true, uiSha256: last };
    } catch { /* a starting Android window may not have a root yet */ }
    await pause(800);
  }
  throw new Error(`required_runtime_marker_missing:${marker}:${last ?? "no_ui"}`);
}
try {
  if ((await adb(["shell", "getprop", "sys.boot_completed"])).trim() !== "1") throw new Error("emulator_not_booted");
  result.api = (await adb(["shell", "getprop", "ro.build.version.sdk"])).trim();
  result.abi = (await adb(["shell", "getprop", "ro.product.cpu.abi"])).trim();
  stage = "install";
  await adb(["install", "-r", apk], 90000);
  const installedPath = parseAndroidInstalledApkPath(await adb(["shell", "pm", "path", appId]));
  if (!installedPath) throw new Error("installed_apk_path_invalid");
  result.installedApkSha256 = parseAndroidSha256sum(await adb(["shell", "sha256sum", installedPath]));
  if (result.installedApkSha256 !== result.apkSha256) throw new Error("installed_apk_hash_mismatch");
  stage = "cold_start";
  await adb(["shell", "am", "force-stop", appId]);
  const launch = await adb(["shell", "am", "start", "-W", "-n", `${appId}/.MainActivity`]);
  result.launchStatus = /^Status:\s*(\S+)/m.exec(launch)?.[1] ?? "unknown";
  result.coldStart = await waitForMarker("primary-tab-map");
  await writeFile(path.join(directory, `${variant}-startup.png`), await adb(["exec-out", "screencap", "-p"], 15000, "buffer"));
  for (const [route, marker] of [
    ["tonight", "screen-tonight-decision"], ["map", "screen-map-route-discovery"],
    ["trips", "screen-itinerary-and-collaboration"], ["sky", "screen-sky-orientation-ar"],
    ["me", "screen-identity-profile-privacy"],
  ]) {
    stage = `route:${route}`;
    await adb(["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", `starward:///${route}`, appId]);
    const observed = await waitForMarker(marker);
    const pid = (await adb(["shell", "pidof", appId])).trim();
    if (!/^\d+$/u.test(pid)) throw new Error("product_process_not_alive");
    result.routes.push({ route, ...observed, productProcessAlive: true });
    if (route === "sky") await writeFile(path.join(directory, `${variant}-sky.png`), await adb(["exec-out", "screencap", "-p"], 15000, "buffer"));
  }
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  result.failedStage = stage;
  result.failureCode = /^required_runtime_marker_missing:/.test(error.message) ? error.message : "native_smoke_stage_failed";
  result.errorSha256 = hash(String(error.message));
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  result.limitation = "Technical packaging/startup and five route mounts on a read-only API36 x86_64 emulator; no backend/provider, physical sensor, field or complete UI acceptance claim.";
  await writeFile(path.join(directory, `${variant}-runtime-smoke.json`), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ variant, status: result.status, failedStage: result.failedStage, routesObserved: result.routes.length, installedHashMatches: result.installedApkSha256 === result.apkSha256 }));
}
