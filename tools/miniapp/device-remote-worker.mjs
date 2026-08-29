// Dedicated process: official SDK output may contain a login/debug QR. Do not log it.
import automator from "miniprogram-automator";
import { writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { loadSession, assertFresh } from "./device-session.mjs";
import { automationEndpoint, inspectRuntime } from "./device-runtime.mjs";
import { terminalQrPng, remoteDeadline } from "./device-qr.mjs";

const output = process.stdout.write.bind(process.stdout);
let qrPath;
let stage = "sdk_connecting";
const emit = (value) => output(JSON.stringify(value) + "\n");
function removeQr() { if (qrPath) rmSync(qrPath, { force: true }); }
const deadline = remoteDeadline((expiredStage) => {
  removeQr();
  emit({ error: `device_test_${expiredStage}_timeout` });
  process.exit(0);
});
function enterStage(next) { stage = next; deadline.enter(stage); emit({ state: stage }); }
process.stdout.write = (chunk, encoding, callback) => {
  if (qrPath && /[█▀▄]/u.test(String(chunk))) {
    try {
      writeFileSync(qrPath, terminalQrPng(String(chunk)), { mode: 0o600, flag: "wx" });
      enterStage("remote_qr_ready");
    } catch {
      removeQr();
      emit({ error: "device_test_qr_format_unsupported" });
      process.exit(0);
    }
  }
  (typeof encoding === "function" ? encoding : callback)?.(); return true;
};
process.stderr.write = (_chunk, encoding, callback) => { (typeof encoding === "function" ? encoding : callback)?.(); return true; };
const [action, directory, endpoint] = process.argv.slice(2);
let mini;
try {
  deadline.enter(stage);
  const state = await loadSession(directory);
  await assertFresh(state);
  qrPath = path.join(state.directory, "remote-qr.png");
  removeQr();
  emit({ state: stage });
  mini = await automator.connect({ wsEndpoint: automationEndpoint(endpoint) });
  enterStage("sdk_connected");
  if (action === "remote") {
    enterStage("remote_requested");
    await mini.remote(false);
    removeQr();
    enterStage("remote_connected");
  }
  else if (action !== "inspect") throw new Error("device_test_remote_action_invalid");
  const result = await inspectRuntime(mini, state.binding);
  await assertFresh(state);
  emit(result);
} catch (error) {
  const code = /^device_test_[a-z_]+$/u.test(error?.message ?? "") ? error.message : "device_test_official_sdk_unavailable";
  emit({ error: code });
  // Parent validates the fixed error envelope and exits nonzero, never exposing SDK text.
  process.exitCode = 0;
} finally {
  deadline.stop();
  removeQr();
  mini?.disconnect();
}
