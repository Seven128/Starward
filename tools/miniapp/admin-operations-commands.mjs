import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { moderationSummary } from "./admin-operations-client.mjs";

async function inputJson(filePath) {
  return JSON.parse(await readFile(path.resolve(filePath), "utf8"));
}

async function writeExclusive(filePath, value) {
  const absolute = path.resolve(filePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, value, { flag: "wx" });
  return absolute;
}

async function dashboard({ request, output }) {
  const data = await request("/v2/admin/dashboard");
  output({
    spots: data.spots.length,
    moderation: data.moderation.map(moderationSummary),
    providerHealthRows: data.providerHealth.length,
    pendingJobs: data.jobs,
  });
}

async function moderation({ request, output }) {
  const data = await request("/v2/admin/moderation/cases");
  output(data.map(moderationSummary));
}

async function caseExport({ positional, option, request, output }) {
  const caseId = positional("case_id");
  const destination = option("out");
  if (!destination) throw new Error("admin_out_missing");
  const cases = await request("/v2/admin/moderation/cases");
  const selected = cases.find((item) => item.case_id === caseId);
  if (!selected) throw new Error("admin_case_not_found");
  const absolute = await writeExclusive(
    destination,
    `${JSON.stringify(selected, null, 2)}\n`,
  );
  output({ caseId, written: absolute, sensitive: true });
}

async function media({ positional, option, request, output }) {
  const uploadId = positional("upload_id");
  const destination = option("out");
  if (!destination) throw new Error("admin_out_missing");
  const item = await request(
    `/v2/admin/contribution-media/${encodeURIComponent(uploadId)}`,
  );
  const bytes = Buffer.from(item.dataBase64, "base64");
  const absolute = await writeExclusive(destination, bytes);
  output({
    uploadId,
    written: absolute,
    mimeType: item.mimeType,
    byteSize: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sensitive: true,
  });
}

async function resolveCase({ positional, option, request, output }) {
  const caseId = positional("case_id");
  const resolution = positional("resolution");
  const reason = option("reason");
  if (!reason) throw new Error("admin_reason_missing");
  if (!new Set(["APPROVED", "REJECTED"]).has(resolution))
    throw new Error("admin_resolution_invalid");
  const result = await request(
    `/v2/admin/moderation/cases/${encodeURIComponent(caseId)}/resolve`,
    { method: "POST", body: JSON.stringify({ resolution, reason }) },
  );
  output({
    caseId,
    resolution: result.case.state,
    contributionState: result.contribution?.state ?? null,
    canonicalMergeRequired:
      result.case.payload?.canonicalMergeRequired ?? null,
  });
}

async function mergeCase({ positional, option, request, output }) {
  const caseId = positional("case_id");
  const spotId = positional("spot_id");
  const confirmedClaims = String(option("claims", ""))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const reason = option("reason");
  if (!reason || !confirmedClaims.length)
    throw new Error("admin_merge_input_missing");
  const result = await request(
    `/v2/admin/moderation/cases/${encodeURIComponent(caseId)}/merge`,
    {
      method: "POST",
      body: JSON.stringify({ spotId, confirmedClaims, reason }),
    },
  );
  output({
    caseId,
    canonicalMerge: result.canonicalMerge,
    resultingStatus: result.detail.spot.status,
    publicationComplete: result.assessment.complete,
    remainingIssues: result.assessment.issues,
  });
}

async function createCandidate({ option, request, output }) {
  const sourcePath = option("input");
  const reason = option("reason");
  if (!sourcePath || !reason) throw new Error("admin_candidate_input_missing");
  const candidate = await inputJson(sourcePath);
  const result = await request("/v2/admin/spots", {
    method: "POST",
    body: JSON.stringify({ ...candidate, reason }),
  });
  output({
    spotId: result.detail.spot.spotId,
    status: result.detail.spot.status,
    publicationComplete: result.assessment.complete,
    issues: result.assessment.issues,
  });
}

async function patchSpot({ positional, option, request, output }) {
  const spotId = positional("spot_id");
  const sourcePath = option("input");
  const reason = option("reason");
  if (!sourcePath || !reason)
    throw new Error("admin_spot_patch_input_missing");
  const patch = await inputJson(sourcePath);
  const result = await request(`/v2/admin/spots/${encodeURIComponent(spotId)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, reason }),
  });
  output({
    spotId: result.spot.spotId,
    status: result.spot.status,
    lastVerifiedAt: result.spot.lastVerifiedAt,
  });
}

const handlers = new Map([
  ["dashboard", dashboard],
  ["moderation", moderation],
  ["case-export", caseExport],
  ["media", media],
  ["resolve", resolveCase],
  ["merge", mergeCase],
  ["candidate-create", createCandidate],
  ["spot-patch", patchSpot],
]);

export async function runAdminCommand(command, dependencies) {
  const handler = handlers.get(command);
  if (!handler) throw new Error(`admin_command_unknown:${command}`);
  await handler(dependencies);
}
