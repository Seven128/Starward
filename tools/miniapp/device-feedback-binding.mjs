import { errorCode } from "./device-feedback-command.mjs";
import { removePreviewQr } from "./device-feedback-preview.mjs";
import { feedbackFail as fail } from "./device-feedback-paths.mjs";
import {
  invalidateDeviceSession,
  saveFeedbackRun,
} from "./device-feedback-session.mjs";
import { assertGenerationCurrent } from "./device-feedback-snapshot.mjs";
import { startSession, stopSession } from "./device-session.mjs";

async function bindingGeneration(run) {
  try {
    return await assertGenerationCurrent(run);
  } catch (error) {
    if ([
      "device_feedback_generation_changed_start_new_preview",
      "device_feedback_generation_config_changed_start_new_preview",
    ].includes(errorCode(error)))
      fail("generation_changed_start_new_session");
    throw error;
  }
}

export async function bindConfirmedGeneration(
  run,
  {
    startDeviceSession = startSession,
    stopDeviceSession = stopSession,
  } = {},
) {
  if (
    !run.generation ||
    !["completed", "manual_required", "qr_ready"].includes(
      run.official.disposition,
    )
  )
    fail("manual_binding_not_available");

  await bindingGeneration(run);
  const priorOfficial = { ...run.official };
  const invalidated = await invalidateDeviceSession(run);
  if (invalidated) {
    run.official = priorOfficial;
    await saveFeedbackRun(run);
  }
  const before = await bindingGeneration(run);
  let session;
  try {
    session = await startDeviceSession(run.generation.project, run.directory);
    if (
      session.binding.sha256 !== before.bundleSha256 ||
      session.binding.fileCount !== before.fileCount
    )
      fail("generation_changed_start_new_session");
    const after = await bindingGeneration(run);
    if (JSON.stringify(after) !== JSON.stringify(before))
      fail("generation_changed_start_new_session");
    run.deviceSession = session.directory;
    await removePreviewQr(run.generation);
    run.official = { disposition: "operator_confirmed", boundary: null };
    await saveFeedbackRun(run);
    return { invalidated };
  } catch (error) {
    if (session) {
      try {
        await stopDeviceSession(session.directory);
      } catch {}
    }
    throw error;
  }
}
