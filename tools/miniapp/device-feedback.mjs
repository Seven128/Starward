import path from "node:path";
import { pathToFileURL } from "node:url";
import { AdbDevice, findAdb } from "./device-adb.mjs";
import { bindConfirmedGeneration } from "./device-feedback-binding.mjs";
import { errorCode, parseArguments } from "./device-feedback-command.mjs";
import {
  invokeOfficial,
  manualBoundary,
  officialDriver,
} from "./device-feedback-official.mjs";
import {
  createOrdinaryPreview,
  previewQrPath,
} from "./device-feedback-preview.mjs";
import { feedbackFail as fail } from "./device-feedback-paths.mjs";
import {
  createFeedbackRun,
  createStableGeneration,
  invalidateDeviceSession,
  removeGeneration,
  saveFeedbackRun,
  stopFeedbackRun,
  withFeedbackRun,
} from "./device-feedback-session.mjs";

export { parseArguments } from "./device-feedback-command.mjs";
export {
  OfficialWechatDevtools,
  resolveOfficialCli,
  runOfficialProcess,
} from "./device-feedback-official.mjs";

function generationOutput(run, { invalidated = false } = {}) {
  const manual = run.official.disposition === "manual_required";
  const qrReady = run.official.disposition === "qr_ready";
  const operatorConfirmed = run.official.disposition === "operator_confirmed";
  return {
    mode: "development_feedback",
    feedbackRun: run.directory,
    preparedProject: run.generation.project,
    deviceSession: run.deviceSession,
    candidateIdentity: {
      generation: run.generation.number,
      localBundleSha256: run.generation.bundleSha256,
      fileCount: run.generation.fileCount,
    },
    officialInvocation: run.official.disposition,
    officialBoundary: run.official.boundary,
    qrCode: qrReady ? previewQrPath(run.generation) : undefined,
    observedProductBehavior: "not_observed",
    verified: [
      "stable_private_snapshot",
      ...(run.official.disposition === "completed"
        ? ["official_auto_preview_command_completed"]
        : run.official.disposition === "operator_confirmed"
          ? ["operator_confirmed_official_update"]
          : qrReady
            ? ["official_preview_qr_generated"]
          : []),
    ],
    unverified: [
      ...(!operatorConfirmed ? ["phone_visible_generation"] : []),
      "phone_bundle_bytes",
      "product_behavior",
    ],
    invalidated: {
      priorDeviceSession: invalidated,
      priorScreenshotAndInputAuthority: invalidated,
    },
    restartAndStateLossPossible: true,
    cleanup: run.staleGenerationCleanupPending
      ? "owned_stale_generation_pending"
      : "owned_run_pending",
    phoneHandoff: operatorConfirmed
      ? "Phone visibility for this generation was operator-confirmed. Take a fresh screenshot before every input."
      : "Confirm this generation is visible on the intended phone/account. If automatic delivery selected another account or device, use preview for an official ordinary-preview QR; inspect and choose 信任并运行 if prompted.",
    manualInstruction: manual
      ? "Run npm run miniapp:device:feedback -- preview --feedback <feedbackRun> for an official ordinary-preview QR, or use the version-visible official Preview action for preparedProject; then run bind with --confirm official_update_completed."
      : qrReady
        ? "Scan qrCode from the intended authorized WeChat account, keep this generation visible, then run bind with --confirm official_update_completed."
        : run.official.disposition === "completed"
          ? "After the intended phone/account visibly shows this generation, run bind with --confirm official_update_completed."
      : undefined,
  };
}

async function prepareGeneration(run, options, dependencies, invalidated) {
  const previous = run.generation;
  const generation = await createStableGeneration(
    run,
    dependencies.snapshotOptions,
  );
  run.generation = generation;
  run.nextGeneration = generation.number + 1;
  run.official = { disposition: "invoking", boundary: null };
  await saveFeedbackRun(run);

  run.official = await invokeOfficial(generation, options, dependencies.official);
  await saveFeedbackRun(run);
  if (previous && previous.directory !== generation.directory) {
    const cleanup = dependencies.removeOwnedGeneration ?? removeGeneration;
    const removed = await cleanup(run, previous, { defer: true });
    run.staleGenerationCleanupPending =
      Boolean(run.staleGenerationCleanupPending) || !removed;
    await saveFeedbackRun(run);
  }
  return generationOutput(run, { invalidated });
}

export async function main(
  argv,
  {
    official,
    adb,
    tempRoot,
    snapshotOptions,
    removeOwnedGeneration,
    startDeviceSession,
    stopDeviceSession,
    emit = (value) => console.log(JSON.stringify(value)),
  } = {},
) {
  const { action, options } = parseArguments(argv);
  if (action === "help") {
    emit({
      mode: "development_feedback",
      commands: [
        "doctor [--cli <absolute official cli>]",
        "start --project <absolute miniapp project> [--cli <path>] [--port <port>]",
        "refresh --feedback <run> [--cli <path>] [--port <port>]",
        "preview --feedback <run> [--cli <path>] [--port <port>]",
        "bind --feedback <run> --confirm official_update_completed",
        "stop --feedback <run>",
      ],
      evidenceMeaning: "development_only",
    });
    return;
  }
  if (action === "doctor") {
    let officialReadiness;
    try {
      officialReadiness = await (await officialDriver(options, official)).doctor();
    } catch (error) {
      officialReadiness = {
        officialTool: "unavailable",
        automaticUpdate: "unavailable",
        login: "unknown",
        boundary: manualBoundary(error),
      };
    }
    const device = adb ?? new AdbDevice(await findAdb());
    let android;
    try {
      const observed = await device.doctor();
      android = {
        adbVersion: observed.adbVersion,
        detected: observed.detected,
        states: observed.states,
        usbReady: observed.usbReady,
      };
    } catch {
      android = { usbReady: false, state: "unavailable" };
    }
    emit({
      mode: "development_feedback",
      official: officialReadiness,
      android,
      evidenceMeaning: "readiness_only",
    });
    return;
  }
  if (action === "start") {
    let run;
    try {
      run = await createFeedbackRun(options.project, tempRoot);
      const output = await withFeedbackRun(run.directory, (loaded) =>
        prepareGeneration(
          loaded,
          options,
          { official, snapshotOptions, removeOwnedGeneration },
          false,
        ),
      );
      emit(output);
      return;
    } catch (error) {
      if (run) {
        try {
          await stopFeedbackRun(run.directory);
        } catch {}
      }
      throw error;
    }
  }
  if (action === "refresh") {
    const output = await withFeedbackRun(options.feedback, async (run) => {
      const invalidated = await invalidateDeviceSession(run);
      return prepareGeneration(
        run,
        options,
        { official, snapshotOptions, removeOwnedGeneration },
        invalidated,
      );
    });
    emit(output);
    return;
  }
  if (action === "preview") {
    const output = await withFeedbackRun(options.feedback, async (run) => {
      await createOrdinaryPreview(run, options, official);
      run.official = { disposition: "qr_ready", boundary: null };
      await saveFeedbackRun(run);
      return generationOutput(run);
    });
    emit(output);
    return;
  }
  if (action === "bind") {
    if (options.confirm !== "official_update_completed")
      fail("manual_confirmation_invalid");
    const output = await withFeedbackRun(options.feedback, async (run) => {
      const result = await bindConfirmedGeneration(run, {
        startDeviceSession,
        stopDeviceSession,
      });
      return generationOutput(run, result);
    });
    emit(output);
    return;
  }
  if (action === "stop") {
    await stopFeedbackRun(options.feedback);
    emit({
      mode: "development_feedback",
      stopped: true,
      phoneDataChanged: false,
      cleanup: "owned_run_removed",
    });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${JSON.stringify({ mode: "development_feedback", error: errorCode(error) })}\n`,
    );
    process.exitCode = 1;
  });
}
