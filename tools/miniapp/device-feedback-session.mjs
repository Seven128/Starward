import {
  access,
  lstat,
  mkdtemp,
  open,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stopSession } from "./device-session.mjs";
import {
  canonicalDirectory,
  deviceSessionDirectory,
  feedbackFail as fail,
  generationDirectory,
  samePath,
} from "./device-feedback-paths.mjs";
import {
  assertGenerationCurrent,
  createStableGeneration,
  sourceBinding,
} from "./device-feedback-snapshot.mjs";
import {
  assertOfficialOutcomeResolved,
  classifyOfficialPreviewResult,
  normalizedOfficialState,
} from "./device-feedback-official.mjs";
import { validateCompletedPreviewQr } from "./device-feedback-preview.mjs";

export { createStableGeneration } from "./device-feedback-snapshot.mjs";

const schema = "starward-miniapp-device-feedback-v1";

async function hasStaleGeneration(run) {
  if (!run.generation) return false;
  const current = generationDirectory(run, run.generation);
  const entries = await readdir(run.directory, { withFileTypes: true });
  return entries.some(
    (entry) =>
      entry.isDirectory() &&
      /^generation-\d{6}-[\w-]+$/u.test(entry.name) &&
      !samePath(path.join(run.directory, entry.name), current),
  );
}

export async function createFeedbackRun(project, tempRoot = os.tmpdir()) {
  const binding = await sourceBinding(project);
  const parent = await canonicalDirectory(tempRoot);
  const directory = await mkdtemp(
    path.join(parent, "starward-device-feedback-"),
  );
  const run = {
    schema,
    directory,
    sourceProject: binding.project,
    createdAt: new Date().toISOString(),
    nextGeneration: 1,
    generation: null,
    deviceSession: null,
    official: { disposition: "not_invoked", boundary: null },
    staleGenerationCleanupPending: false,
  };
  await saveFeedbackRun(run);
  return run;
}

export async function loadFeedbackRun(directory) {
  const canonical = await canonicalDirectory(directory);
  if (!/^starward-device-feedback-[\w-]+$/u.test(path.basename(canonical)))
    fail("run_directory_invalid");
  const statePath = path.join(canonical, "feedback.json");
  let state;
  try {
    if ((await lstat(statePath)).isSymbolicLink()) fail("run_state_symlink");
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (String(error?.message ?? error).startsWith("device_feedback_")) throw error;
    fail("run_state_invalid");
  }
  if (
    state?.schema !== schema ||
    !samePath(state.directory ?? "", canonical) ||
    !path.isAbsolute(state.sourceProject ?? "") ||
    !Number.isInteger(state.nextGeneration) ||
    state.nextGeneration < 1 ||
    (state.staleGenerationCleanupPending !== undefined &&
      typeof state.staleGenerationCleanupPending !== "boolean")
  )
    fail("run_state_invalid");
  if (state.generation) generationDirectory(state, state.generation);
  if (state.deviceSession)
    deviceSessionDirectory(state, state.deviceSession);
  if (await hasStaleGeneration(state))
    state.staleGenerationCleanupPending = true;
  state.official = normalizedOfficialState(state.official);
  return state;
}

export async function saveFeedbackRun(run) {
  await writeFile(
    path.join(run.directory, "feedback.json"),
    `${JSON.stringify(run, null, 2)}\n`,
    { mode: 0o600 },
  );
}

// Call only with the response to an explicit query of the already saved task.
// This records a result; it never polls, pushes, or turns a confirmation flag
// into evidence. A lost original handle must first be recovered externally.
export async function recordOfficialTaskResult(run, taskId, output) {
  const prior = normalizedOfficialState(run.official);
  if (!prior.result?.taskId || prior.result.taskId !== taskId)
    fail("official_task_binding_required");
  if (!["pending", "unknown", "error"].includes(prior.disposition))
    fail("official_task_already_terminal");
  await assertGenerationCurrent(run);
  let official = classifyOfficialPreviewResult(output, prior.result.tool, { requireStatus: true });
  if (prior.diagnostic) official.diagnostic = prior.diagnostic;
  if (official.result.taskId && official.result.taskId !== taskId)
    fail("official_task_mismatch");
  official.result.taskId = taskId;
  official.result.taskType ??= prior.result.taskType;
  if (prior.result.taskType && official.result.taskType !== prior.result.taskType)
    fail("official_task_type_mismatch");
  if (official.result.taskType === "auth" && official.result.status === "success") {
    // The official CLI returns before issuing the business call when its
    // authorization prerequisite is pending. That task cannot complete a preview.
    official.disposition = "authorization_ready";
    official.boundary = "authorization_completed_preview_not_invoked";
  }
  // A pending poll need not repeat its taskId; the queried handle supplies it.
  if (official.result.status === "pending" && official.boundary === "pending_handle_missing") {
    official.disposition = "pending";
    official.boundary = null;
  }
  if (official.disposition === "completed" && official.result.tool === "create_preview_qrcode") {
    try {
      official = await validateCompletedPreviewQr(run.generation, official);
    } catch {
      // The task may have succeeded without leaving a usable local QR. Retain
      // its terminal result and handle, but do not replay or bind without it.
      official = { ...official, disposition: "unknown", boundary: "preview_qr_unavailable" };
    }
  }
  run.official = official;
  await saveFeedbackRun(run);
  return official;
}

export async function withFeedbackRun(directory, callback) {
  const run = await loadFeedbackRun(directory);
  const lockPath = path.join(run.directory, ".lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch {
    fail("run_busy");
  }
  try {
    return await callback(run);
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

export async function invalidateDeviceSession(run) {
  if (!run.deviceSession) return false;
  const session = deviceSessionDirectory(run, run.deviceSession);
  try {
    await access(session);
    await stopSession(session);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  run.deviceSession = null;
  run.official = { disposition: "invalidated", boundary: null };
  await saveFeedbackRun(run);
  return true;
}

export async function removeGeneration(run, generation, { defer = false } = {}) {
  if (!generation) return;
  const directory = generationDirectory(run, generation);
  try {
    await rm(directory, { recursive: true, force: true });
    return true;
  } catch (error) {
    if (!defer) throw error;
    return false;
  }
}

async function stopGenerations(run) {
  const entries = await readdir(run.directory, { withFileTypes: true });
  const generations = [];
  for (const entry of entries) {
    if (entry.name === "feedback.json" || entry.name === ".lock") continue;
    if (
      entry.isDirectory() &&
      /^generation-\d{6}-[\w-]+$/u.test(entry.name)
    ) {
      const generation = { directory: path.join(run.directory, entry.name) };
      generationDirectory(run, generation);
      generations.push(generation);
      continue;
    }
    fail("run_cleanup_unknown_entry");
  }
  return generations;
}

export async function stopFeedbackRun(
  directory,
  {
    stopDeviceSession = stopSession,
    removeOwnedGeneration = removeGeneration,
  } = {},
) {
  const run = await loadFeedbackRun(directory);
  if (run.generation) assertOfficialOutcomeResolved(run.official);
  const lockPath = path.join(run.directory, ".lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch {
    fail("run_busy");
  }
  try {
    if (run.deviceSession) {
      const session = deviceSessionDirectory(run, run.deviceSession);
      try {
        await access(session);
        await stopDeviceSession(session);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      run.deviceSession = null;
      run.official = { disposition: "invalidated", boundary: null };
      await saveFeedbackRun(run);
    }
    let cleanupPending = false;
    for (const generation of await stopGenerations(run)) {
      try {
        const removed = await removeOwnedGeneration(run, generation, {
          defer: true,
        });
        if (!removed) cleanupPending = true;
      } catch {
        cleanupPending = true;
      }
    }
    if (cleanupPending) {
      run.staleGenerationCleanupPending = true;
      await saveFeedbackRun(run);
      fail("cleanup_pending");
    }
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
  await rm(run.directory, { recursive: true });
}
