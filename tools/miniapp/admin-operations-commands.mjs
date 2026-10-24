import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
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
    providerHealthRows: data.providerHealth?.length ?? 0,
    pendingJobs: data.jobs,
  });
}

function revision(option, name) {
  const value = Number(option(name));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`admin_${name}_required`);
  return value;
}

function idempotency(option) {
  const key = option("idempotency-key");
  if (typeof key !== "string" || !key.trim() || key.length > 200)
    throw new Error("admin_idempotency_key_required");
  return key.trim();
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
  const expectedRevision = revision(option, "revision");
  const key = idempotency(option);
  const result = await request(
    `/v2/admin/moderation/cases/${encodeURIComponent(caseId)}/resolve`,
    { method: "POST", headers: { "idempotency-key": key }, body: JSON.stringify({ resolution, reason, expectedRevision }) },
  );
  output({
    caseId,
    receipt: result.receipt,
    resolution: result.readback.state,
    contributionState: result.readback.submission?.state ?? null,
    canonicalMergeRequired:
      result.readback.canonicalMergeRequired ?? null,
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
  const expectedSubmissionRevision = revision(option, "submission-revision");
  const expectedSpotRevision = revision(option, "spot-revision");
  const key = idempotency(option);
  const result = await request(
    `/v2/admin/moderation/cases/${encodeURIComponent(caseId)}/merge`,
    {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify({ spotId, confirmedClaims, reason, expectedSubmissionRevision, expectedSpotRevision }),
    },
  );
  output({
    caseId,
    receipt: result.receipt,
    readback: result.readback,
  });
}

async function createCandidate({ option, request, output }) {
  const sourcePath = option("input");
  const reason = option("reason");
  if (!sourcePath || !reason) throw new Error("admin_candidate_input_missing");
  const key = idempotency(option);
  const candidate = await inputJson(sourcePath);
  const contract = { version: 1, method: "POST", path: "/v2/admin/spots/candidate-commands" };
  const principal = await spotCommandPrincipal(request, "spot.candidate.create", contract);
  const result = await request(contract.path, {
    method: contract.method,
    headers: { "idempotency-key": key },
    body: JSON.stringify({ ...candidate, reason }),
  });
  const readback = spotCommandReadback(result, principal, "spot.candidate.create", key, 1);
  const spot = readback?.detail?.spot;
  if (!spot || typeof spot.spotId !== "string" || !/^spot:[a-zA-Z0-9._:-]+$/u.test(spot.spotId) ||
      (candidate.spotId !== undefined && spot.spotId !== candidate.spotId) ||
      ["name", "region", "address"].some(field => spot[field] !== candidate[field]?.trim()) ||
      ["timezone", "visibilityPolicy", "source"].some(field => !isDeepStrictEqual(spot[field], candidate[field])) ||
      spot.wgs84?.latitude !== candidate.latitude || spot.wgs84?.longitude !== candidate.longitude ||
      spot.altitudeM !== (candidate.altitudeM ?? null) || spot.status !== "DATA_INSUFFICIENT" ||
      readback.assessment?.complete !== false)
    throw new Error("admin_spot_command_readback_unverified_preserve_input_and_key");
  output({
    spotId: spot.spotId,
    status: spot.status,
    publicationComplete: readback.assessment.complete,
    issues: readback.assessment.issues,
    receipt: result.receipt,
  });
}

async function patchSpot({ positional, option, request, output }) {
  const spotId = positional("spot_id");
  const sourcePath = option("input");
  const reason = option("reason");
  if (!sourcePath || !reason)
    throw new Error("admin_spot_patch_input_missing");
  const key = idempotency(option);
  const expectedRevision = revision(option, "revision");
  const patch = await inputJson(sourcePath);
  const contract = { version: 1, method: "PATCH", path: "/v2/admin/spots/:spotId/commands" };
  const principal = await spotCommandPrincipal(request, "spot.patch", contract);
  const result = await request(contract.path.replace(":spotId", encodeURIComponent(spotId)), {
    method: contract.method,
    headers: { "idempotency-key": key },
    body: JSON.stringify({ ...patch, reason, expectedRevision }),
  });
  const readback = spotCommandReadback(result, principal, "spot.patch", key, expectedRevision + 1);
  if (readback?.spot?.spotId !== spotId)
    throw new Error("admin_spot_command_readback_unverified_preserve_input_and_key");
  for (const [field, value] of Object.entries(patch)) {
    if (field === "reason" || field === "expectedRevision") continue;
    if (field === "wgs84") {
      if (readback.spot.wgs84?.latitude !== value?.latitude || readback.spot.wgs84?.longitude !== value?.longitude)
        throw new Error("admin_spot_command_readback_unverified_preserve_input_and_key");
      continue;
    }
    const owner = Object.hasOwn(readback.spot, field) ? readback.spot : readback;
    const expected = ["name", "region", "address"].includes(field) && typeof value === "string" ? value.trim() : value;
    if (!Object.hasOwn(owner, field) || !isDeepStrictEqual(owner[field], expected))
      throw new Error("admin_spot_command_readback_unverified_preserve_input_and_key");
  }
  output({
    spotId: readback.spot.spotId,
    status: readback.spot.status,
    lastVerifiedAt: readback.spot.lastVerifiedAt,
    receipt: result.receipt,
  });
}

async function spotCommandPrincipal(request, operation, expectedContract) {
  const principal = await request("/v2/admin/session");
  const advertised = principal?.commandContracts?.[operation];
  if (typeof principal?.actorId !== "string" || advertised?.version !== expectedContract.version ||
      advertised?.method !== expectedContract.method || advertised?.path !== expectedContract.path)
    throw new Error("admin_spot_command_contract_upgrade_required:no_write_sent");
  return principal;
}

function spotCommandReadback(result, principal, operation, key, resultingRevision) {
  const receipt = result?.receipt;
  if (!receipt || (receipt.status !== "COMMITTED" && receipt.status !== "REPLAYED") ||
      receipt.actorId !== principal.actorId || receipt.operation !== operation || receipt.idempotencyKey !== key ||
      receipt.resultingRevision !== resultingRevision || typeof receipt.receiptId !== "string" ||
      !receipt.receiptId.startsWith("receipt:") || !result.readback ||
      !isDeepStrictEqual(result.result, result.readback) || !isDeepStrictEqual(receipt.readback, result.readback))
    throw new Error("admin_spot_command_receipt_unverified_preserve_input_and_key");
  return result.readback;
}

const handlers = new Map([
  ["session", async ({ request, output }) => output(await request("/v2/admin/session"))],
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
