import { writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AdbDevice, findAdb, runTool, fail } from "./device-adb.mjs";
import { startSession, withSession, saveSession, deviceBinding, assertCapture, stopSession } from "./device-session.mjs";
import { automationEndpoint } from "./device-runtime.mjs";
import { remoteProgressConsumer } from "./device-qr.mjs";

const help = `Mini Program owner-assisted physical-device diagnostics (not acceptance)
  doctor
  start --project <absolute external phone project>
  capture --session <directory>
  capture-permissions --session <directory> (target Mini Program's WeChat permission page only)
  capture-location --session <directory> (known Android location prompt requested by WeChat only)
  tap --session <directory> --x <0..1> --y <0..1>
  swipe --session <directory> --x <0..1> --y <0..1> --to-x <0..1> --to-y <0..1> --ms <100..2000>
  back --session <directory>
  remote|inspect --session <directory> --endpoint ws://127.0.0.1:<port>
  stop --session <directory>
Input requires a screenshot taken in the last 60 seconds. Review it first.
User handles USB trust, login/QR and physical rotation.
Authorized Mini Program permission tests require inspecting the actual prompt before input.
Unknown system windows, unrelated permissions and account-security dialogs remain blocked.
Open the intended external project in official DevTools with automation enabled before remote.
Remote QR is rendered privately from official SDK output; raw QR stdout is suppressed.
Screenshots are private. Stop deletes this tool's session, not the phone bundle or WeChat data.`;

export function parseArguments(argv) {
  const [action = "help", ...rest] = argv;
  const options = {};
  const allowed = { help: [], doctor: [], start: ["project"], capture: ["session"], "capture-permissions": ["session"], "capture-location": ["session"], tap: ["session", "x", "y"], swipe: ["session", "x", "y", "to-x", "to-y", "ms"], back: ["session"], remote: ["session", "endpoint"], inspect: ["session", "endpoint"], stop: ["session"] };
  if (!allowed[action]) fail("action_invalid");
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.slice(2);
    if (!rest[i]?.startsWith("--") || !allowed[action].includes(key) || options[key] !== undefined || !rest[i + 1]) fail("argument_invalid");
    options[key] = rest[i + 1];
  }
  if (allowed[action].some((key) => options[key] === undefined)) fail("argument_missing");
  return { action, options };
}

export async function main(argv, { adb, emit = (value) => console.log(JSON.stringify(value)) } = {}) {
  const { action, options } = parseArguments(argv);
  if (action === "help") { console.log(help); return; }
  if (action === "doctor") { emit(await (adb ?? new AdbDevice(await findAdb())).doctor()); return; }
  if (action === "start") {
    const state = await startSession(options.project);
    emit({ session: state.directory, localBundleSha256: state.binding.sha256, fileCount: state.binding.fileCount, phoneBundleBytesVerified: false, acceptance: "not_evaluated" });
    return;
  }
  if (action === "stop") { await stopSession(options.session); emit({ stopped: true, phoneDataChanged: false }); return; }
  const observed = await withSession(options.session, async (state) => {
    if (["remote", "inspect"].includes(action)) {
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
    const serial = await device.select();
    if (["capture", "capture-permissions", "capture-location"].includes(action)) {
      state.capture = null;
      await saveSession(state);
      const permissionScope = action === "capture-permissions" ? "settings" : action === "capture-location" ? "location-prompt" : "none";
      const screenshot = await device.screenshot({ permissionScope });
      const screenshotPath = path.join(state.directory, "screen.png");
      await writeFile(screenshotPath, screenshot.bytes, { mode: 0o600 });
      state.capture = { at: Date.now(), device: deviceBinding(state, serial), activity: screenshot.activity, size: screenshot.size, permissionScope: screenshot.permissionScope ?? "none" };
      await saveSession(state);
      return { screenshot: screenshotPath, size: screenshot.size, screenScope: state.capture.permissionScope === "none" ? "miniapp" : state.capture.permissionScope, actualScreen: true, runtimeAppIdVerified: false, acceptance: "not_evaluated" };
    } else {
      assertCapture(state, serial);
      const values = action === "tap" ? [Number(options.x), Number(options.y)] : action === "swipe" ? [Number(options.x), Number(options.y), Number(options["to-x"]), Number(options["to-y"]), Number(options.ms)] : [];
      const capture = state.capture;
      // Consume input authorization before sending: retries need a new observation.
      state.capture = null;
      await saveSession(state);
      await device.input(action, values, capture);
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
