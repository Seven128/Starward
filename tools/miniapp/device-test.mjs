import { writeFile, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AdbDevice, findAdb, runTool, fail, MAX_SWIPE_DURATION_MS } from "./device-adb.mjs";
import { recordDeviceGesture, recordDeviceScreen } from "./device-record.mjs";
import { startSession, withSession, saveSession, deviceBinding, assertCapture, stopSession } from "./device-session.mjs";
import { automationEndpoint } from "./device-runtime.mjs";
import { remoteProgressConsumer } from "./device-qr.mjs";

const help = `Mini Program owner-assisted physical-device diagnostics (not acceptance)
  doctor [--transport usb|wireless]
  start --project <absolute external phone project>
  capture --session <directory> [--transport usb|wireless]
  capture-permissions --session <directory> [--transport usb|wireless] (target Mini Program's WeChat permission page only)
  capture-location --session <directory> [--transport usb|wireless] (known Android location prompt requested by WeChat only)
  capture-location-picker --session <directory> [--transport usb|wireless] (owned observed WeChat location picker)
  confirm-location-picker --session <directory> --x <0..1> --y <0..1> --confirm selected_location_reviewed [--transport usb|wireless] (reviewed top-right Done only)
  open-tethering-settings --session <directory> --confirm authorized_network_setup [--page more|wifi] (USB; reviewed Mini Program capture, or owned more-page capture for wifi)
  capture-tethering-settings --session <directory> [--page more|wifi] (USB; exact owned system page only, tap/Back only)
  tap --session <directory> --x <0..1> --y <0..1> [--transport usb|wireless]
  swipe --session <directory> --x <0..1> --y <0..1> --to-x <0..1> --to-y <0..1> --ms <100..${MAX_SWIPE_DURATION_MS}> [--transport usb|wireless]
  record-tap|record-swipe (same tap/swipe arguments; private Mini Program video, --seconds 6..15, default 6)
  record --session <directory> [--transport usb|wireless] [--seconds 6..15] (private Mini Program video; no input)
  back --session <directory> [--transport usb|wireless]
  text --session <directory> --value <non-secret ASCII query> [--transport usb|wireless]
  remote|inspect --session <directory> --endpoint ws://127.0.0.1:<port>
  stop --session <directory>
Input requires a screenshot taken in the last 60 seconds. Review it first.
User handles USB trust, login/QR and physical rotation.
Authorized Mini Program permission tests require inspecting the actual prompt before input.
Unknown system windows, unrelated permissions and account-security dialogs remain blocked.
Open the intended external project in official DevTools with automation enabled before remote.
Remote QR is rendered privately from official SDK output; raw QR stdout is suppressed.
Each capture returns its own immutable screenshot path, capture time and SHA-256 receipt.
Review the returned path; do not assume screen.png. Screenshots are private.
Stop deletes this tool's session, not the phone bundle or WeChat data.`;

const isTetheringScope = scope => scope === "tethering-settings" || scope === "wifi-tethering-settings";
const tetheringScope = page => page === "wifi" ? "wifi-tethering-settings" : "tethering-settings";

async function saveCapture(state, serial, screenshot, at = Date.now()) {
  // Distinct paths keep historical viewers from rereading a later overwritten
  // frame. Equal bytes still represent distinct observations/input grants.
  const captureId = randomUUID();
  const file = `screen-${captureId}.png`;
  const screenshotPath = path.join(state.directory, file);
  const screenshotMetadata = `${screenshotPath}.json`;
  const capturedAt = new Date(at).toISOString();
  const sha256 = createHash("sha256").update(screenshot.bytes).digest("hex");
  const permissionScope = screenshot.permissionScope ?? "none";
  const screenScope = permissionScope === "none" ? "miniapp" : permissionScope;
  const receipt = { schema: "starward-miniapp-screenshot-v1", captureId, capturedAt, file,
    sha256, bytes: screenshot.bytes.length, size: screenshot.size, screenScope };
  await writeFile(screenshotPath, screenshot.bytes, { mode: 0o600, flag: "wx" });
  await writeFile(screenshotMetadata, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  state.capture = { at, device: deviceBinding(state, serial), activity: screenshot.activity, size: screenshot.size,
    permissionScope, file: screenshotPath, captureId, sha256 };
  if (!isTetheringScope(permissionScope)) delete state.tetheringSettings;
  await saveSession(state);
  return { screenshot: screenshotPath, screenshotMetadata, captureId, capturedAt,
    screenshotSha256: sha256, screenshotBytes: screenshot.bytes.length, screenScope };
}

export function parseArguments(argv) {
  const [action = "help", ...rest] = argv;
  const options = {};
  const required = { help: [], doctor: [], start: ["project"], capture: ["session"], "capture-permissions": ["session"], "capture-location": ["session"], tap: ["session", "x", "y"], swipe: ["session", "x", "y", "to-x", "to-y", "ms"], back: ["session"], remote: ["session", "endpoint"], inspect: ["session", "endpoint"], stop: ["session"] };
  required.text = ["session", "value"];
  required["record-tap"] = required.tap;
  required["record-swipe"] = required.swipe;
  required.record = ["session"];
  required["capture-location-picker"] = ["session"];
  required["confirm-location-picker"] = ["session", "x", "y", "confirm"];
  required["open-tethering-settings"] = ["session", "confirm"];
  required["capture-tethering-settings"] = ["session"];
  const transportActions = new Set(["doctor", "capture", "capture-permissions", "capture-location", "capture-location-picker", "confirm-location-picker", "open-tethering-settings", "capture-tethering-settings", "tap", "swipe", "record-tap", "record-swipe", "record", "back", "text"]);
  const allowed = Object.fromEntries(Object.entries(required).map(([key, values]) => [key, transportActions.has(key) ? [...values, "transport"] : values]));
  for (const key of ["record", "record-tap", "record-swipe"]) allowed[key].push("seconds");
  for (const key of ["open-tethering-settings", "capture-tethering-settings"]) allowed[key].push("page");
  if (!allowed[action]) fail("action_invalid");
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.slice(2);
    if (!rest[i]?.startsWith("--") || !allowed[action].includes(key) || options[key] !== undefined || !rest[i + 1]) fail("argument_invalid");
    options[key] = rest[i + 1];
  }
  if (required[action].some((key) => options[key] === undefined)) fail("argument_missing");
  options.transport ??= "usb";
  if (transportActions.has(action) && !["usb", "wireless"].includes(options.transport)) fail("transport_invalid");
  if (["open-tethering-settings", "capture-tethering-settings"].includes(action) && options.transport !== "usb") fail("tethering_settings_usb_required");
  if (["open-tethering-settings", "capture-tethering-settings"].includes(action)) {
    options.page ??= "more";
    if (!["more", "wifi"].includes(options.page)) fail("tethering_settings_page_invalid");
  }
  if (action === "open-tethering-settings" && options.confirm !== "authorized_network_setup") fail("tethering_settings_authorization_required");
  if (action === "confirm-location-picker" && options.confirm !== "selected_location_reviewed") fail("location_picker_review_required");
  if (options.seconds !== undefined && !/^(?:[6-9]|1[0-5])$/u.test(options.seconds)) fail("recording_duration_invalid");
  return { action, options };
}

export async function main(argv, { adb, emit = (value) => console.log(JSON.stringify(value)) } = {}) {
  const { action, options } = parseArguments(argv);
  if (action === "help") { console.log(help); return; }
  if (action === "doctor") { emit(await (adb ?? new AdbDevice(await findAdb())).doctor({ transport: options.transport })); return; }
  if (action === "start") {
    const state = await startSession(options.project);
    emit({ session: state.directory, localBundleSha256: state.binding.sha256, fileCount: state.binding.fileCount, phoneBundleBytesVerified: false, acceptance: "not_evaluated" });
    return;
  }
  if (action === "stop") { await stopSession(options.session); emit({ stopped: true, phoneDataChanged: false }); return; }
  const observed = await withSession(options.session, async (state) => {
    if (["remote", "inspect"].includes(action)) {
      if (state.tetheringSettings) fail("tethering_settings_scope_active");
      const endpoint = automationEndpoint(options.endpoint);
      if (action === "remote") emit({ state: "waiting_for_official_remote_debug", qrPreview: path.join(state.directory, "remote-qr.png"), instruction: "User scans when remote_qr_ready. Authorized Mini Program permission tests are operator-controlled after screenshot review." });
      let raw;
      try {
        raw = await runTool(process.execPath, [path.join(import.meta.dirname, "device-remote-worker.mjs"), action, state.directory, endpoint], { timeout: action === "remote" ? 330_000 : 55_000, maxBytes: 128 * 1024, onStdout: remoteProgressConsumer(emit) });
      } finally {
        await rm(path.join(state.directory, "remote-qr.png"), { force: true });
      }
      const result = JSON.parse(raw.toString().trim().split("\n").at(-1));
      if (result.error) {
        if (/^device_test_[a-z_]+$/u.test(result.error)) throw new Error(result.error);
        fail("official_sdk_failed");
      }
      await writeFile(path.join(state.directory, "runtime.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
      return result;
    }
    const device = adb ?? new AdbDevice(await findAdb());
    const serial = await device.select({ transport: options.transport });
    const requireTetheringOwner = (permissionScope = "tethering-settings") => {
      if (options.transport !== "usb") fail("tethering_settings_usb_required");
      const owner = state.tetheringSettings;
      if (owner?.schema !== "starward-device-tethering-owner-v1" || typeof owner.fromCaptureId !== "string") fail("tethering_settings_owner_required");
      if (owner.device !== deviceBinding(state, serial)) fail("device_changed_capture_again");
      if (permissionScope === "wifi-tethering-settings") {
        const navigation = owner.wifiNavigation;
        if (navigation?.schema !== "starward-device-wifi-tethering-navigation-v1" || typeof navigation.fromCaptureId !== "string" || !navigation.fromCaptureId || !Number.isFinite(navigation.requestedAt)) fail("wifi_tethering_settings_owner_required");
      }
      return owner;
    };
    if (["capture", "capture-permissions", "capture-location", "capture-location-picker", "capture-tethering-settings"].includes(action)) {
      if (action === "capture-tethering-settings") requireTetheringOwner(tetheringScope(options.page));
      state.capture = null;
      await saveSession(state);
      const permissionScope = action === "capture-permissions" ? "settings" : action === "capture-location" ? "location-prompt" : action === "capture-location-picker" ? "location-picker" : action === "capture-tethering-settings" ? tetheringScope(options.page) : "none";
      const screenshot = await device.screenshot({ permissionScope });
      const saved = await saveCapture(state, serial, screenshot);
      return { ...saved, size: screenshot.size, actualScreen: true, runtimeAppIdVerified: false, acceptance: "not_evaluated" };
    } else {
      assertCapture(state, serial);
      const inputAction = action.startsWith("record-") ? action.slice(7) : action;
      const values = ["tap", "confirm-location-picker"].includes(inputAction) ? [Number(options.x), Number(options.y)] : inputAction === "swipe" ? [Number(options.x), Number(options.y), Number(options["to-x"]), Number(options["to-y"]), Number(options.ms)] : inputAction === "text" ? [options.value] : [];
      const capture = state.capture;
      if (isTetheringScope(capture.permissionScope)) requireTetheringOwner(capture.permissionScope);
      // Consume input authorization before sending: retries need a new observation.
      state.capture = null;
      await saveSession(state);
      if (action === "open-tethering-settings") {
        const sourceScope = capture.permissionScope ?? "none";
        const fromOwnedMore = options.page === "wifi" && sourceScope === "tethering-settings";
        if ((sourceScope !== "none" && !fromOwnedMore) || typeof capture.captureId !== "string") fail("tethering_settings_miniapp_capture_required");
        const previousOwner = state.tetheringSettings;
        state.tetheringSettings = fromOwnedMore ? { ...requireTetheringOwner() } : { schema: "starward-device-tethering-owner-v1", device: deviceBinding(state, serial), fromCaptureId: capture.captureId, requestedAt: Date.now() };
        if (options.page === "wifi") state.tetheringSettings.wifiNavigation = { schema: "starward-device-wifi-tethering-navigation-v1", fromCaptureId: capture.captureId, requestedAt: Date.now() };
        await saveSession(state);
        let dispatched = false;
        try {
          await device.input(action, [options.page], capture, { beforeSend: () => { assertCapture({ ...state, capture }, serial); dispatched = true; } });
        } catch (error) {
          if (!dispatched) {
            if (previousOwner) state.tetheringSettings = previousOwner;
            else delete state.tetheringSettings;
            await saveSession(state);
          }
          throw error;
        }
        return { actionSent: action, page: options.page, acceptance: "not_evaluated", next: options.page === "wifi" ? "capture-tethering-settings --page wifi, then inspect" : "capture-tethering-settings_and_inspect" };
      }
      if (action === "record" || action.startsWith("record-")) {
        const recordOptions = options.seconds === undefined ? {} : { seconds: Number(options.seconds) };
        const record = action === "record" ? await recordDeviceScreen(device, capture, recordOptions)
          : await recordDeviceGesture(device, inputAction, values, capture, recordOptions);
        const capturedAt = Date.now();
        const video = path.join(state.directory, `recording-${Date.now()}.mp4`);
        await writeFile(video, record.bytes, { mode: 0o600, flag: "wx" });
        const saved = await saveCapture(state, serial, record.screenshot, capturedAt);
        return { video, ...saved, size: record.screenshot.size, requestedSeconds: record.requestedSeconds,
          ...(action === "record" ? { inputSent: false } : { actionSent: inputAction }),
          actualScreen: true, runtimeAppIdVerified: false, acceptance: "not_evaluated",
          next: "inspect_actual_video_and_screenshot" };
      }
      await device.input(inputAction, values, capture, isTetheringScope(capture.permissionScope) || action === "confirm-location-picker" ? { beforeSend: () => assertCapture({ ...state, capture }, serial) } : undefined);
      return { actionSent: action, acceptance: "not_evaluated", next: "capture_and_inspect_result" };
    }
  });
  emit(observed);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    const message = /^device_test_[a-z_]+$/u.test(error?.message ?? "") ? error.message : "device_test_operation_failed";
    console.error(JSON.stringify({ error: message, acceptance: "not_evaluated" }));
    process.exitCode = 1;
  });
}
