// Fixed public catalog object through the already running staging HTTP service.
// Unlike the read-only runtime probe, HTTP cache misses invoke the real provider
// and the application's normal durable usage writer. No diagnostic SQL writes.
export async function imageryRuntimeProbe(env = process.env, load = name => import(name), request = fetch, deadlineAt = Date.now() + 45000) {
  const report = { status: "observed", evidenceScope: "SERVER_BFF_NOT_DEVICE", reference: "M:31",
    revision: /^[a-f0-9]{40}$/u.test(env.STARWARD_RELEASE_REVISION ?? "") ? env.STARWARD_RELEASE_REVISION : null,
    code: "imagery_probe_incomplete", images: [], usage: [] };
  if (env.STARWARD_ENVIRONMENT !== "staging" || !report.revision) return report;
  let client;
  try {
    const { default: pg } = await load("pg");
    const { createHash } = await load("node:crypto");
    client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000,
      statement_timeout: 5000, query_timeout: 5000, options: "-c default_transaction_read_only=on", application_name: "starward-imagery-verification" });
    await client.connect();
    async function usage() {
      await client.query("BEGIN READ ONLY");
      try {
        if ((await client.query("SHOW transaction_read_only")).rows[0]?.transaction_read_only !== "on") throw new Error();
        const result = await client.query(`SELECT count(*)::integer AS attempts,
          count(*) FILTER (WHERE status='HTTP_RESPONSE' AND http_status=200)::integer AS responses200,
          count(*) FILTER (WHERE estimated_cost_cny IS NULL OR cost_basis<>'VERIFIED_ESTIMATE')::integer AS unpriced
          FROM vendor_call_usage WHERE product='MINIAPP' AND provider='NASA_SKYVIEW' AND capability='DEEP_SKY_IMAGE'
          AND occurred_at >= (date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai')
          AND occurred_at < ((date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai')+interval '1 month') AT TIME ZONE 'Asia/Shanghai')`);
        report.usage.push(result.rows[0]);
      } finally { await client.query("ROLLBACK"); }
    }
    await usage();
    for (const timeout of [35000, 5000]) {
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs < 5000) throw new Error();
      const start = Date.now();
      const response = await request("http://127.0.0.1:8787/v2/celestial-objects/M%3A31/image?level=OVERVIEW",
        { signal: AbortSignal.timeout(Math.min(timeout, remainingMs - 1000)), redirect: "error" });
      const reader = response.body?.getReader();
      const parts = [];
      let length = 0;
      try {
        if (reader) for (;;) {
          const part = await reader.read();
          if (part.done) break;
          length += part.value.length;
          if (length > 4 * 1024 * 1024) throw new Error();
          parts.push(part.value);
        }
      } finally { await reader?.cancel().catch(() => {}); }
      const bytes = Buffer.concat(parts);
      const image = { httpStatus: response.status, byteLength: bytes.length,
        jpegEnvelope: bytes.length > 100 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217,
        contentTypeMatched: response.headers.get("content-type")?.split(";")[0] === "image/jpeg",
        sourceMatched: response.headers.get("x-starward-image-source") === "NASA SkyView - WISE 12um",
        fieldMatched: response.headers.get("x-starward-image-field-degrees") === "4",
        sha256: createHash("sha256").update(bytes).digest("hex"), elapsedMs: Date.now() - start };
      report.images.push(image);
      await usage();
      if (image.httpStatus !== 200 || !image.jpegEnvelope || !image.contentTypeMatched || !image.sourceMatched || !image.fieldMatched) {
        report.code = "imagery_http_contract_failed";
        return report;
      }
    }
    report.code = "imagery_probe_completed";
  } catch { report.code = "imagery_probe_execution_failed"; }
  finally {
    if (client) {
      let timer;
      await Promise.race([client.end().catch(() => {}), new Promise(resolve => { timer = setTimeout(resolve, 1000); })]);
      clearTimeout(timer);
    }
  }
  return report;
}

export function sanitizeImageryReport(report) {
  if (report?.status !== "observed" || report.evidenceScope !== "SERVER_BFF_NOT_DEVICE" || report.reference !== "M:31" ||
      (report.revision !== null && !/^[a-f0-9]{40}$/u.test(report.revision ?? "")) ||
      !["imagery_probe_incomplete", "imagery_http_contract_failed", "imagery_probe_execution_failed", "imagery_probe_completed"].includes(report.code) ||
      !Array.isArray(report.images) || report.images.length > 2 || !Array.isArray(report.usage) || report.usage.length > 3) throw new Error("imagery_report_invalid");
  const images = report.images.map(image => {
    if (![image.httpStatus, image.byteLength, image.elapsedMs].every(Number.isSafeInteger) || image.httpStatus < 100 || image.httpStatus > 599 ||
        image.byteLength < 0 || image.byteLength > 4 * 1024 * 1024 || image.elapsedMs < 0 || image.elapsedMs > 60000 ||
        !/^[a-f0-9]{64}$/u.test(image.sha256 ?? "") ||
        ![image.jpegEnvelope, image.contentTypeMatched, image.sourceMatched, image.fieldMatched].every(value => typeof value === "boolean")) throw new Error("imagery_report_invalid");
    return Object.fromEntries(["httpStatus", "byteLength", "elapsedMs", "sha256", "jpegEnvelope", "contentTypeMatched", "sourceMatched", "fieldMatched"].map(key => [key, image[key]]));
  });
  const usage = report.usage.map(row => {
    if (![row.attempts, row.responses200, row.unpriced].every(value => Number.isSafeInteger(value) && value >= 0) || row.responses200 > row.attempts || row.unpriced > row.attempts) throw new Error("imagery_report_invalid");
    return { attempts: row.attempts, responses200: row.responses200, unpriced: row.unpriced };
  });
  return { status: "observed", evidenceScope: "SERVER_BFF_NOT_DEVICE", reference: "M:31", revision: report.revision, code: report.code, images, usage };
}

export function imageryProbeSucceeded(report) {
  return report.code === "imagery_probe_completed" && report.images.length === 2 && report.usage.length === 3 &&
    report.images.every(image => image.httpStatus === 200 && image.jpegEnvelope && image.contentTypeMatched && image.sourceMatched && image.fieldMatched) &&
    report.images[0].sha256 === report.images[1].sha256 &&
    report.usage[0].attempts === 0 && report.usage[0].responses200 === 0 &&
    report.usage[1].attempts === report.usage[0].attempts + 1 && report.usage[1].responses200 === report.usage[0].responses200 + 1 &&
    report.usage[2].attempts === report.usage[1].attempts;
}
