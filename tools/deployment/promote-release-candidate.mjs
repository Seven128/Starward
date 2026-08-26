import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareReleaseCandidate } from "./prepare-release-candidate.mjs";
import { executeRelease } from "./release.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { createVerifiedBackup } from "./verified-backup.mjs";

const REQUIRED_STAGING_STEPS = Object.freeze([
  "backup-verification",
  "compose-version",
  "compose-config",
  "image-pull",
  "migration",
  "converge",
  "worker-readiness",
  "public-readiness",
]);

function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

function absolutePath(selected, field) {
  if (!selected || !path.isAbsolute(selected))
    fail("release_promotion_path_not_absolute", field);
  return path.normalize(selected);
}

export async function validateStagingQualification({ receiptPath, revision, imageDigest }) {
  const selectedPath = absolutePath(receiptPath, "stagingReceiptPath");
  const receipt = JSON.parse(await readFile(selectedPath, "utf8"));
  if (
    receipt.schemaVersion !== "starward-release-receipt-v1" ||
    receipt.status !== "succeeded" ||
    receipt.environment !== "staging"
  ) fail("release_promotion_staging_receipt_invalid");
  if (receipt.revision !== revision)
    fail("release_promotion_staging_revision_mismatch");
  if (receipt.imageDigest !== imageDigest)
    fail("release_promotion_staging_digest_mismatch");
  if (!Array.isArray(receipt.steps))
    fail("release_promotion_staging_steps_invalid");
  const steps = new Map(receipt.steps.map((step) => [step?.name, step?.status]));
  for (const name of REQUIRED_STAGING_STEPS) {
    if (steps.get(name) !== "passed")
      fail("release_promotion_staging_step_missing", name);
  }
  return Object.freeze({ receiptPath: selectedPath, revision, imageDigest });
}

export async function promoteReleaseCandidate({
  baseDeployEnvPath,
  candidateOutputPath,
  imageReference,
  revision,
  releasedAt,
  operator,
  stagingReceiptPath,
  confirmProductionDigest,
  prepare = prepareReleaseCandidate,
  validate = validateReleaseEnvironment,
  backup = createVerifiedBackup,
  release = executeRelease,
  qualifyStaging = validateStagingQualification,
}) {
  const candidate = await prepare({
    baseDeployEnvPath,
    outputPath: candidateOutputPath,
    imageReference,
    revision,
    releasedAt,
  });
  const validation = await validate({ deployEnvPath: candidate.outputPath });
  let stagingQualification = null;
  if (validation.environment === "production") {
    if (confirmProductionDigest !== validation.imageDigest)
      fail("release_production_digest_confirmation_required");
    stagingQualification = await qualifyStaging({
      receiptPath: stagingReceiptPath,
      revision: validation.revision,
      imageDigest: validation.imageDigest,
    });
  }
  const verifiedBackup = await backup({ deployEnvPath: candidate.outputPath });
  const promoted = await release({
    deployEnvPath: candidate.outputPath,
    backupManifestPath: verifiedBackup.manifestPath,
    operator,
    confirmProductionDigest,
  });
  return Object.freeze({
    schemaVersion: "starward-release-promotion-v1",
    status: promoted.receipt.status,
    environment: validation.environment,
    revision: validation.revision,
    imageDigest: validation.imageDigest,
    candidatePath: candidate.outputPath,
    backupManifestPath: verifiedBackup.manifestPath,
    stagingReceiptPath: stagingQualification?.receiptPath ?? null,
    receiptPath: promoted.receiptPath,
  });
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await promoteReleaseCandidate({
      baseDeployEnvPath: option("--base-deploy-env"),
      candidateOutputPath: option("--candidate-output"),
      imageReference: option("--image-ref"),
      revision: option("--revision"),
      releasedAt: option("--released-at"),
      operator: option("--operator") ?? process.env.GITHUB_ACTOR,
      stagingReceiptPath: option("--staging-receipt"),
      confirmProductionDigest: option("--confirm-production-digest"),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "failed",
      code: error instanceof Error ? error.message : "release_promotion_failed",
    })}\n`);
    process.exitCode = 1;
  }
}
