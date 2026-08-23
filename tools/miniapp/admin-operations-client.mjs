export function createAdminRequest({ baseUrl, actor, token }) {
  const parsed = new URL(baseUrl);
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(
    parsed.hostname,
  );
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback))
    throw new Error("admin_transport_requires_https_or_loopback");
  if (!/^admin:[a-zA-Z0-9._-]{1,64}$/u.test(actor))
    throw new Error("admin_actor_invalid");
  if (!token) throw new Error("MINIAPP_ADMIN_TOKEN_missing");

  return async function request(route, init = {}) {
    const response = await fetch(`${baseUrl}${route}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-admin-token": token,
        "x-admin-actor": actor,
        ...(init.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        `admin_http_${response.status}:${body?.code ?? "invalid_response"}:${body?.requestId ?? "no_request_id"}`,
      );
    return body?.data;
  };
}

function submissionSummary(submission) {
  if (!submission)
    return {
      kind: null,
      spotId: null,
      displayName: null,
      topics: [],
      observedAt: null,
      detailCharacters: 0,
      media: [],
    };
  const detailCharacters =
    typeof submission.detail === "string" ? submission.detail.length : 0;
  return {
    kind: submission.kind ?? null,
    spotId: submission.spotId ?? null,
    displayName:
      submission.spotNameSnapshot ??
      submission.candidateLocation?.displayName ??
      null,
    topics: submission.topics ?? [],
    observedAt: submission.observedAt ?? null,
    detailCharacters,
    media: (submission.media ?? []).map((media) => ({
      uploadId: media.uploadId,
      state: media.state,
      mimeType: media.mimeType,
      byteSize: media.byteSize,
    })),
  };
}

function canonicalMergeSummary(canonicalMerge) {
  if (!canonicalMerge) return null;
  return {
    spotId: canonicalMerge.spotId,
    claims: canonicalMerge.claims,
    mergedAt: canonicalMerge.mergedAt,
    resultingSpotRevision: canonicalMerge.resultingSpotRevision,
  };
}

export function moderationSummary(item) {
  return {
    caseId: item.case_id,
    state: item.state,
    subjectType: item.subject_type,
    ...submissionSummary(item.payload?.submission),
    canonicalMergeRequired: item.payload?.canonicalMergeRequired ?? null,
    canonicalMerge: canonicalMergeSummary(item.payload?.canonicalMerge),
  };
}
