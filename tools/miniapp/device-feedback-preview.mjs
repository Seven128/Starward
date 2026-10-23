import { lstat, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import {
  assertOfficialOutcomeResolved,
  classifyOfficialPreviewResult,
  officialDriver,
  officialPreviewError,
} from "./device-feedback-official.mjs";
import {
  feedbackFail as fail,
  samePath,
} from "./device-feedback-paths.mjs";
import { assertGenerationCurrent } from "./device-feedback-snapshot.mjs";

export function previewQrPath(generation) {
  return path.join(generation.directory, ".official-preview-qr.png");
}

function previewInfoPath(generation) {
  return path.join(generation.directory, ".official-preview-info");
}

async function validateQr(qrPath) {
  let bytes;
  try {
    if ((await lstat(qrPath)).isSymbolicLink()) fail("preview_qr_symlink");
    if (!(await lstat(qrPath)).isFile()) fail("preview_qr_not_file");
    if (!samePath(await realpath(qrPath), path.resolve(qrPath)))
      fail("preview_qr_physical_path_required");
    bytes = await readFile(qrPath);
  } catch (error) {
    if (String(error?.message ?? error).startsWith("device_feedback_"))
      throw error;
    fail("preview_qr_unavailable");
  }
  const png = bytes.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (bytes.length < 128 || bytes.length > 1024 * 1024 || (!png && !jpeg))
    fail("preview_qr_invalid");
}

export async function removePreviewQr(generation) {
  if (!generation) return;
  await rm(previewQrPath(generation), { force: true });
}

export async function validateCompletedPreviewQr(generation, official) {
  await validateQr(previewQrPath(generation));
  return { ...official, disposition: "qr_ready", boundary: null, evidence: "validated_fresh_qr" };
}

export function assertOrdinaryPreviewAvailable(run, { preparing = false } = {}) {
  if (!preparing || run.official.disposition !== "invoking")
    run.official = assertOfficialOutcomeResolved(run.official);
  if (
    !run.generation ||
    !["invoking", "completed", "failed", "cancelled", "expired", "manual_required", "qr_ready", "authorization_ready"].includes(
      run.official.disposition,
    )
  )
    fail("preview_not_available");
}

export async function createOrdinaryPreview(run, options, injected, retainResult = async () => {}) {
  assertOrdinaryPreviewAvailable(run, { preparing: true });

  const qrOutput = previewQrPath(run.generation);
  const infoOutput = previewInfoPath(run.generation);
  await rm(qrOutput, { force: true });
  await rm(infoOutput, { force: true });
  let keep = false;
  try {
    const before = await assertGenerationCurrent(run);
    let driver;
    try {
      driver = await officialDriver(options, injected);
    } catch (error) {
      return officialPreviewError(error, "create_preview_qrcode", { notInvoked: true });
    }
    let official;
    try {
      const output = await driver.preview(run.generation.project, qrOutput, infoOutput,
        options.port, run.generation.directory);
      official = classifyOfficialPreviewResult(output, "create_preview_qrcode");
    } catch (error) {
      official = officialPreviewError(error, "create_preview_qrcode");
    }
    // Persist the returned task before any post-call checks or file cleanup.
    // Candidate drift invalidates use of the result, not its query identity.
    keep = Boolean(official.result.taskId) && ["pending", "unknown", "error"].includes(official.disposition);
    await retainResult(official);
    try {
      const after = await assertGenerationCurrent(run);
      if (JSON.stringify(after) !== JSON.stringify(before))
        fail("generation_changed_during_preview");
      const artifactOnly = official.disposition === "unknown" && !official.result.taskId &&
        ["result_missing", "result_unrecognized"].includes(official.boundary);
      if (official.disposition !== "completed" && !artifactOnly) {
        // An async task can still be writing this file. Keep it private and hidden
        // until its original task reports success and the artifact is validated.
        return official;
      }
      const completed = await validateCompletedPreviewQr(run.generation,
        official.disposition === "completed" ? official
          : { ...official, ...classifyOfficialPreviewResult({ success: true }, "create_preview_qrcode") });
      keep = true;
      await retainResult(completed);
      return completed;
    } catch (error) {
      await retainResult({ ...official, disposition: "unknown", boundary: "post_preview_validation_failed" });
      throw error;
    }
  } finally {
    await rm(infoOutput, { force: true });
    if (!keep) await rm(qrOutput, { force: true });
  }
}
