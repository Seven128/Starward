import { readFile } from "node:fs/promises";
import path from "node:path";

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(baseUrl + pathname, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      `operations_prepare_request_failed:${response.status}:${pathname}`,
    );
  return payload?.data;
}

export async function prepareOperationsRecords({
  apiBaseUrl,
  root,
  runId,
  adminToken,
  actor,
}) {
  const adminHeaders = {
    "content-type": "application/json",
    "x-admin-token": adminToken,
    "x-admin-actor": actor,
  };
  const dashboard = await requestJson(apiBaseUrl, "/v2/admin/dashboard", {
    headers: adminHeaders,
  });
  const formalSpot = dashboard?.spots?.find(
    (spot) => typeof spot.spot_id === "string" && spot.status !== "RETIRED",
  );
  if (!formalSpot) throw new Error("operations_prepare_formal_spot_missing");
  const session = await requestJson(apiBaseUrl, "/v2/auth/wechat/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: `local:${runId}` }),
  });
  const userHeaders = {
    "content-type": "application/json",
    authorization: `Bearer ${session.accessToken}`,
  };
  const definitions = [
    { topic: "NIGHT_SAFETY", media: true },
    { topic: "LAST_ROAD", media: false },
    { topic: "PARKING", media: false },
    { topic: "FACILITIES", media: false },
  ];
  const mediaBytes = await readFile(
    path.join(
      root,
      "apps",
      "wechat-miniapp",
      "src",
      "assets",
      "media",
      "milky-way-night-sky.jpg",
    ),
  );
  for (const [index, definition] of definitions.entries()) {
    const requestHeaders = {
      ...userHeaders,
      "idempotency-key": `operations-draft-${runId}-${index}`,
    };
    let submission = await requestJson(apiBaseUrl, "/v2/me/contributions", {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        kind: "NEW_SPOT_PROPOSAL",
        spotId: null,
        candidateLocation: {
          displayName: `隔离验收候选地点 ${index + 1}`,
          region: "当前运行验证区域",
          wgs84: {
            system: "WGS84",
            latitude: 22.54 + index * 0.001,
            longitude: 114.05 + index * 0.001,
          },
        },
        observedAt: null,
        topics: [definition.topic],
        detail: `当前隔离 Operations 验收第 ${index + 1} 条生产 API 投稿；用于核验审核、媒体、合并、发布与审计责任边界。`,
        rightsConfirmed: true,
        preciseLocationConsent: true,
      }),
    });
    if (definition.media) {
      submission = await requestJson(
        apiBaseUrl,
        `/v2/me/contributions/${encodeURIComponent(submission.submissionId)}/media-uploads`,
        {
          method: "POST",
          headers: {
            ...userHeaders,
            "idempotency-key": `operations-upload-${runId}-${index}`,
          },
          body: JSON.stringify({
            originalName: "milky-way-night-sky.jpg",
            mimeType: "image/jpeg",
            byteSize: mediaBytes.length,
            expectedRevision: submission.revision,
          }),
        },
      );
      const upload = submission.media.at(-1);
      submission = await requestJson(
        apiBaseUrl,
        `/v2/me/contributions/${encodeURIComponent(submission.submissionId)}/media-uploads/${encodeURIComponent(upload.uploadId)}`,
        {
          method: "PUT",
          headers: {
            ...userHeaders,
            "idempotency-key": `operations-upload-complete-${runId}-${index}`,
          },
          body: JSON.stringify({ dataBase64: mediaBytes.toString("base64") }),
        },
      );
    }
    await requestJson(
      apiBaseUrl,
      `/v2/me/contributions/${encodeURIComponent(submission.submissionId)}/submit`,
      {
        method: "POST",
        headers: {
          ...userHeaders,
          "idempotency-key": `operations-submit-${runId}-${index}`,
        },
        body: JSON.stringify({ expectedRevision: submission.revision }),
      },
    );
  }
}
