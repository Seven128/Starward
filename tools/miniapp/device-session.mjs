import { createHash, randomBytes } from "node:crypto";
import { lstat, realpath, mkdtemp, readFile, writeFile, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fingerprintBundle } from "./release-bundle-artifact.mjs";
import { fail } from "./device-adb.mjs";

export const repository = path.resolve(import.meta.dirname, "../..");
const marker = "starward-miniapp-device-diagnostic-v1";
function inside(parent, child) { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)); }
export async function externalDirectory(value) {
  if (!value || !path.isAbsolute(value)) fail("absolute_external_directory_required");
  const canonical = await realpath(value);
  if (inside(await realpath(repository), canonical) || path.resolve(value).toLowerCase() !== canonical.toLowerCase() || (await lstat(value)).isSymbolicLink()) fail("external_physical_directory_required");
  return canonical;
}
export async function projectBinding(project) {
  const absolute = await externalDirectory(project);
  const config = JSON.parse(await readFile(path.join(absolute, "project.config.json"), "utf8"));
  if (config.compileType !== "miniprogram" || !/^wx[a-f0-9]{16}$/u.test(config.appid ?? "")) fail("miniapp_project_required");
  const bundle = await realpath(path.resolve(absolute, config.miniprogramRoot || "."));
  if (!inside(absolute, bundle)) fail("bundle_outside_project");
  await readFile(path.join(bundle, "app.json"));
  const fingerprint = await fingerprintBundle(bundle);
  return { project: absolute, bundle, appId: config.appid, sha256: fingerprint.sha256, fileCount: fingerprint.fileCount };
}
export async function startSession(project, temp = os.tmpdir()) {
  const binding = await projectBinding(project);
  const parent = await externalDirectory(temp);
  const directory = await mkdtemp(path.join(parent, "starward-device-test-"));
  const state = { schema: marker, directory, binding, salt: randomBytes(32).toString("hex"), startedAt: new Date().toISOString(), capture: null };
  await saveSession(state);
  return state;
}
export async function loadSession(directory) {
  const canonical = await externalDirectory(directory);
  if (!/^starward-device-test-[\w-]+$/u.test(path.basename(canonical))) fail("session_directory_invalid");
  const statePath = path.join(canonical, "session.json");
  if ((await lstat(statePath)).isSymbolicLink()) fail("session_state_symlink");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (state.schema !== marker || state.directory !== canonical || !/^[a-f0-9]{64}$/u.test(state.salt)) fail("session_invalid");
  return state;
}
export async function saveSession(state) {
  await writeFile(path.join(state.directory, "session.json"), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}
export async function assertFresh(state) {
  const current = await projectBinding(state.binding.project);
  if (current.sha256 !== state.binding.sha256 || current.appId !== state.binding.appId || current.bundle !== state.binding.bundle) fail("bundle_changed_start_new_session");
}
export function deviceBinding(state, serial) { return createHash("sha256").update(state.salt).update("\0").update(serial).digest("hex"); }
export function assertCapture(state, serial, now = Date.now()) {
  if (!state.capture || now < state.capture.at || now - state.capture.at > 60_000) fail("recent_capture_required");
  if (state.capture.device !== deviceBinding(state, serial)) fail("device_changed_capture_again");
}
export async function withSession(directory, callback, { cleanup = false } = {}) {
  const state = await loadSession(directory);
  const lockPath = path.join(state.directory, ".lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); } catch { fail("session_busy"); }
  try {
    if (!cleanup) await assertFresh(state);
    const result = await callback(state);
    if (!cleanup) await assertFresh(state);
    return result;
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}
export async function stopSession(directory) {
  // Hold the session lock through deletion. Never follow external aliases or delete a project.
  const state = await loadSession(directory);
  const lockPath = path.join(state.directory, ".lock");
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); } catch { fail("session_busy"); }
  await lock.close();
  try { await rm(state.directory, { recursive: true }); }
  catch { await rm(lockPath, { force: true }); fail("session_cleanup_failed"); }
}
