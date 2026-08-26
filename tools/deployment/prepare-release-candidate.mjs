import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readEnvironmentFile } from "./env-file.mjs";
import { immutableImageDigest } from "./validate-release-environment.mjs";

const REVISION_PATTERN = /^[0-9a-f]{40}$/u;
const RELEASED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const CANDIDATE_KEYS = Object.freeze([
  "STARWARD_IMAGE_REF",
  "STARWARD_RELEASE_REVISION",
  "STARWARD_IMAGE_DIGEST",
  "STARWARD_RELEASED_AT",
]);

function fail(code, field) {
  throw new Error(field ? `${code}:${field}` : code);
}

function absolutePath(selected, field) {
  if (!selected || !path.isAbsolute(selected))
    fail("release_candidate_path_not_absolute", field);
  return path.normalize(selected);
}

function safeValue(key, selected) {
  if (typeof selected !== "string" || !selected || /[\0\r\n]/u.test(selected))
    fail("release_candidate_value_invalid", key);
  if (!/^[A-Za-z0-9_@%+.,:/=\\-]+$/u.test(selected))
    fail("release_candidate_value_unsafe", key);
  return selected;
}

function candidateText(base, candidate) {
  const entries = [...Object.entries(base), ...Object.entries(candidate)];
  return `${entries.map(([key, selected]) => `${key}=${safeValue(key, selected)}`).join("\n")}\n`;
}

async function writeIdempotent(filePath, bytes) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  try {
    await writeFile(filePath, bytes, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return "created";
  } catch (error) {
    if (!(error instanceof Error) || error.code !== "EEXIST") throw error;
    if (await readFile(filePath, "utf8") !== bytes)
      fail("release_candidate_output_exists", "outputPath");
    return "reused";
  }
}

export async function prepareReleaseCandidate({
  baseDeployEnvPath,
  outputPath,
  imageReference,
  revision,
  releasedAt,
}) {
  const basePath = absolutePath(baseDeployEnvPath, "baseDeployEnvPath");
  const candidatePath = absolutePath(outputPath, "outputPath");
  if (basePath === candidatePath)
    fail("release_candidate_path_reused", "outputPath");
  const base = await readEnvironmentFile(basePath);
  for (const key of CANDIDATE_KEYS) {
    if (key in base) fail("release_candidate_base_identity_forbidden", key);
  }
  const environment = base.STARWARD_ENVIRONMENT;
  if (environment !== "staging" && environment !== "production")
    fail("release_candidate_environment_invalid", "STARWARD_ENVIRONMENT");
  if (!REVISION_PATTERN.test(revision ?? ""))
    fail("release_candidate_revision_invalid", "STARWARD_RELEASE_REVISION");
  if (!RELEASED_AT_PATTERN.test(releasedAt ?? "") || !Number.isFinite(Date.parse(releasedAt)))
    fail("release_candidate_timestamp_invalid", "STARWARD_RELEASED_AT");
  const imageDigest = immutableImageDigest(imageReference ?? "");
  const text = candidateText(base, {
    STARWARD_IMAGE_REF: imageReference,
    STARWARD_RELEASE_REVISION: revision,
    STARWARD_IMAGE_DIGEST: imageDigest,
    STARWARD_RELEASED_AT: releasedAt,
  });
  const disposition = await writeIdempotent(candidatePath, text);
  return Object.freeze({
    schemaVersion: "starward-release-candidate-v1",
    status: "prepared",
    disposition,
    environment,
    revision,
    imageDigest,
    releasedAt,
    outputPath: candidatePath,
  });
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = await prepareReleaseCandidate({
      baseDeployEnvPath: option("--base-deploy-env"),
      outputPath: option("--output"),
      imageReference: option("--image-ref"),
      revision: option("--revision"),
      releasedAt: option("--released-at"),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: "failed",
      code: error instanceof Error ? error.message : "release_candidate_failed",
    })}\n`);
    process.exitCode = 1;
  }
}
