import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const bundleRoot = path.join(repositoryRoot, "apps", "wechat-miniapp", "dist", "weapp");
export const releaseArtifactRoot = path.join(repositoryRoot, "artifacts", "miniapp", "release");

const allowedLanes = new Set(["ci", "staging", "production"]);
const reservedDeployableSuffixes = [".invalid", ".test", ".example", ".localhost", ".local"];

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function fail(code) {
  throw new Error(code);
}

function normalizedOrigin(rawOrigin, lane) {
  let parsed;
  try {
    parsed = new URL(rawOrigin);
  } catch {
    fail("release_bundle_api_origin_invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) fail("release_bundle_api_origin_must_be_https_origin");
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.includes(":"))
    fail("release_bundle_api_origin_hostname_invalid");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname)) fail("release_bundle_api_origin_ip_forbidden");
  if (lane === "ci") {
    if (!hostname.endsWith(".invalid")) fail("release_bundle_ci_origin_must_be_invalid");
  } else if (reservedDeployableSuffixes.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))) {
    fail("release_bundle_deployable_origin_reserved");
  }
  return parsed.origin;
}

function resolvedManifestPath(rawPath, lane) {
  const candidate = rawPath
    ? path.resolve(repositoryRoot, rawPath)
    : path.join(releaseArtifactRoot, `${lane}.manifest.json`);
  const relative = path.relative(releaseArtifactRoot, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || path.extname(candidate) !== ".json")
    fail("release_bundle_manifest_path_outside_artifact_root");
  return candidate;
}

export function validateBuildRequest(raw) {
  const lane = raw["--lane"];
  if (!allowedLanes.has(lane)) fail("release_bundle_lane_invalid");
  const sourceRevision = raw["--source-revision"];
  if (!sourceRevision || sourceRevision.length > 128 || !/^[A-Za-z0-9._/-]+$/u.test(sourceRevision))
    fail("release_bundle_source_revision_invalid");
  const apiOrigin = normalizedOrigin(raw["--api-origin"], lane);
  const appId = raw["--app-id"];
  if (lane === "ci" && appId) fail("release_bundle_ci_app_id_forbidden");
  if (lane !== "ci" && !/^wx[a-f0-9]{16}$/u.test(appId ?? ""))
    fail("release_bundle_deployable_app_id_required");
  return Object.freeze({
    lane,
    sourceRevision,
    apiOrigin,
    appId: appId ?? null,
    appIdSha256: appId ? sha256(Buffer.from(appId, "utf8")) : null,
    candidateClass: lane === "ci" ? "ci-structural-nondeployable" : "environment-bound",
    outputManifest: resolvedManifestPath(raw["--output-manifest"], lane),
  });
}
