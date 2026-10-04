import { pathToFileURL } from "node:url";
import { prepareReleaseCandidate } from "./prepare-release-candidate.mjs";
import { executeRelease } from "./release.mjs";
import { validateReleaseEnvironment, validateStagingQualification } from "./validate-release-environment.mjs";
import { createVerifiedBackup } from "./verified-backup.mjs";

export { validateStagingQualification } from "./validate-release-environment.mjs";

function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
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
      requireSkyStatic: !!validation.operations.skyStaticDirectory,
    });
  }
  const verifiedBackup = await backup({ deployEnvPath: candidate.outputPath });
  const promoted = await release({
    deployEnvPath: candidate.outputPath,
    backupManifestPath: verifiedBackup.manifestPath,
    operator,
    confirmProductionDigest,
    ...(validation.operations.skyStaticDirectory && stagingQualification ? {stagingReceiptPath: stagingQualification.receiptPath} : {}),
  });
  return Object.freeze({
    schemaVersion: promoted.receipt.skyStaticDelivery ? "starward-release-promotion-v2" : "starward-release-promotion-v1",
    status: promoted.receipt.status,
    environment: validation.environment,
    revision: validation.revision,
    imageDigest: validation.imageDigest,
    candidatePath: candidate.outputPath,
    backupManifestPath: verifiedBackup.manifestPath,
    stagingReceiptPath: stagingQualification?.receiptPath ?? null,
    receiptPath: promoted.receiptPath,
    ...(promoted.receipt.skyStaticDelivery ? {skyStaticDelivery: promoted.receipt.skyStaticDelivery} : {}),
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
