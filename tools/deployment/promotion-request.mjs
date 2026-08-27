import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promoteReleaseCandidate } from "./promote-release-candidate.mjs";
import { prepareReleaseCandidate } from "./prepare-release-candidate.mjs";
import { operatePreview } from "./operator-preview.mjs";

const REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "baseDeployEnvPath",
  "candidateOutputPath",
  "imageReference",
  "revision",
  "releasedAt",
  "operator",
  "stagingReceiptPath",
  "confirmProductionDigest",
]);

function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

function absolutePath(selected, field) {
  if (typeof selected !== "string" || !path.isAbsolute(selected))
    fail("release_request_path_not_absolute", field);
  return selected;
}

function optionalString(selected, field) {
  if (selected === null || selected === undefined || selected === "") return null;
  if (typeof selected !== "string" || /[\0\r\n]/u.test(selected))
    fail("release_request_value_invalid", field);
  return selected;
}

function validateRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request))
    fail("release_request_invalid");
  const keys = Object.keys(request).sort();
  if (keys.join("\0") !== [...REQUEST_KEYS].sort().join("\0"))
    fail("release_request_fields_invalid");
  if (!["starward-release-request-v1", "starward-operator-preview-request-v1"].includes(request.schemaVersion))
    fail("release_request_schema_invalid");
  if (request.schemaVersion === "starward-operator-preview-request-v1" && (request.stagingReceiptPath !== null || request.confirmProductionDigest !== null))
    fail("operator_preview_production_qualification_forbidden");
  return Object.freeze({
    schemaVersion: request.schemaVersion,
    baseDeployEnvPath: absolutePath(request.baseDeployEnvPath, "baseDeployEnvPath"),
    candidateOutputPath: absolutePath(request.candidateOutputPath, "candidateOutputPath"),
    imageReference: optionalString(request.imageReference, "imageReference"),
    revision: optionalString(request.revision, "revision"),
    releasedAt: optionalString(request.releasedAt, "releasedAt"),
    operator: optionalString(request.operator, "operator"),
    stagingReceiptPath: request.stagingReceiptPath === null
      ? null
      : absolutePath(request.stagingReceiptPath, "stagingReceiptPath"),
    confirmProductionDigest: optionalString(request.confirmProductionDigest, "confirmProductionDigest"),
  });
}

async function writeIdempotent(outputPath, text) {
  try {
    await writeFile(outputPath, text, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return "created";
  } catch (error) {
    if (!(error instanceof Error) || error.code !== "EEXIST") throw error;
    if (await readFile(outputPath, "utf8") !== text)
      fail("release_request_output_exists", "outputPath");
    return "reused";
  }
}

export async function createPromotionRequest({ outputPath, lane = "domain", ...input }) {
  if (!["domain", "operator-preview"].includes(lane)) fail("release_request_lane_invalid");
  const selectedOutput = absolutePath(outputPath, "outputPath");
  const request = validateRequest({ schemaVersion: lane === "domain" ? "starward-release-request-v1" : "starward-operator-preview-request-v1", ...input });
  const text = `${JSON.stringify(request, null, 2)}\n`;
  const disposition = await writeIdempotent(selectedOutput, text);
  return Object.freeze({ status: "prepared", disposition, outputPath: selectedOutput, request });
}

export async function runPromotionRequest({ requestPath, promote = promoteReleaseCandidate }) {
  const selectedPath = absolutePath(requestPath, "requestPath");
  const request = validateRequest(JSON.parse(await readFile(selectedPath, "utf8")));
  if (request.schemaVersion === "starward-operator-preview-request-v1") {
    const candidate = await prepareReleaseCandidate({
      baseDeployEnvPath: request.baseDeployEnvPath, outputPath: request.candidateOutputPath,
      imageReference: request.imageReference, revision: request.revision, releasedAt: request.releasedAt,
    });
    const result = await operatePreview({ deployEnvPath: candidate.outputPath, operation: "deploy", operator: request.operator });
    if (result.receipt.status !== "succeeded") fail("operator_preview_deployment_failed");
    return { ...result, status: result.receipt.status, environment: "operator-preview", imageDigest: result.receipt.imageDigest };
  }
  return promote({
    baseDeployEnvPath: request.baseDeployEnvPath,
    candidateOutputPath: request.candidateOutputPath,
    imageReference: request.imageReference,
    revision: request.revision,
    releasedAt: request.releasedAt,
    operator: request.operator,
    stagingReceiptPath: request.stagingReceiptPath,
    confirmProductionDigest: request.confirmProductionDigest,
  });
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const command = process.argv[2];
    const result = command === "create"
      ? await createPromotionRequest({
          outputPath: option("--output"),
          lane: option("--lane") ?? "domain",
          baseDeployEnvPath: option("--base-deploy-env"),
          candidateOutputPath: option("--candidate-output"),
          imageReference: option("--image-ref"),
          revision: option("--revision"),
          releasedAt: option("--released-at"),
          operator: option("--operator") ?? process.env.GITHUB_ACTOR,
          stagingReceiptPath: option("--staging-receipt"),
          confirmProductionDigest: option("--confirm-production-digest"),
        })
      : command === "run"
        ? await runPromotionRequest({ requestPath: option("--request") })
        : fail("release_request_command_invalid");
    process.stdout.write(`${JSON.stringify({
      status: result.status,
      environment: result.environment ?? result.request?.baseDeployEnvPath,
      imageDigest: result.imageDigest ?? null,
      outputPath: result.outputPath ?? result.receiptPath,
    })}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "failed",
      code: error instanceof Error ? error.message : "release_request_failed",
    })}\n`);
    process.exitCode = 1;
  }
}
