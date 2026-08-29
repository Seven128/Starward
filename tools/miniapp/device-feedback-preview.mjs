import { lstat, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { officialDriver } from "./device-feedback-official.mjs";
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

export async function createOrdinaryPreview(run, options, injected) {
  if (
    !run.generation ||
    !["completed", "manual_required", "qr_ready"].includes(
      run.official.disposition,
    )
  )
    fail("preview_not_available");

  const qrOutput = previewQrPath(run.generation);
  const infoOutput = previewInfoPath(run.generation);
  await rm(qrOutput, { force: true });
  await rm(infoOutput, { force: true });
  let keep = false;
  try {
    const before = await assertGenerationCurrent(run);
    await (await officialDriver(options, injected)).preview(
      run.generation.project,
      qrOutput,
      infoOutput,
      options.port,
    );
    const after = await assertGenerationCurrent(run);
    if (JSON.stringify(after) !== JSON.stringify(before))
      fail("generation_changed_during_preview");
    await validateQr(qrOutput);
    keep = true;
    return qrOutput;
  } finally {
    await rm(infoOutput, { force: true });
    if (!keep) await rm(qrOutput, { force: true });
  }
}
