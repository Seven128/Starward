import assert from "node:assert/strict";
import test from "node:test";
import { imageryRuntimeProbe, sanitizeImageryReport, imageryProbeSucceeded } from "./imagery-runtime-probe.mjs";
import { imageryScript } from "./runtime-diagnostics.mjs";
import { diagnoseHost, diagnosticSucceeded } from "./run-host-diagnostics.mjs";

const env = { STARWARD_ENVIRONMENT: "staging", STARWARD_RELEASE_REVISION: "a".repeat(40), DATABASE_URL: "private-db" };
const count = n => ({ attempts: n, responses200: n, unpriced: n });
function fixture({ counts = [0, 1, 1], readOnly = "on", broken = false, blank = false } = {}) {
  const queries = [];
  let reads = 0, requests = 0, ended = false;
  class Client {
    constructor(options) { assert.equal(options.options, "-c default_transaction_read_only=on"); }
    async connect() {}
    async query(sql) {
      queries.push(sql);
      if (sql.startsWith("SHOW")) return { rows: [{ transaction_read_only: readOnly }] };
      if (sql.startsWith("SELECT")) return { rows: [count(counts[reads++])] };
      return { rows: [] };
    }
    async end() { ended = true; }
  }
  return {
    queries, requests: () => requests, ended: () => ended,
    load: async name => name === "pg" ? { default: { Client } } : import(name),
    request: async (url, options) => {
      requests++;
      assert.equal(url, "http://127.0.0.1:8787/v2/celestial-objects/M%3A31/image?level=OVERVIEW");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      if (broken) throw new Error("private-http-secret");
      // Only a synthetic JPEG envelope: this verifies probe discrimination,
      // never decoding, astronomical content or production provider behavior.
      const bytes = blank ? Buffer.alloc(0) : Buffer.concat([Buffer.from([255,216]), Buffer.alloc(128,1), Buffer.from([255,217])]);
      return new Response(bytes, { headers: { "content-type": "image/jpeg", "x-starward-image-source": "NASA SkyView - WISE 12um", "x-starward-image-field-degrees": "4" } });
    },
  };
}

test("real-service probe counts first outbound then cache hit using distinct read-only snapshots", async () => {
  const f = fixture();
  const report = sanitizeImageryReport(await imageryRuntimeProbe(env, f.load, f.request));
  assert.equal(imageryProbeSucceeded(report), true);
  assert.equal(f.requests(), 2);
  assert.equal(f.ended(), true);
  assert.equal(f.queries.filter(sql => sql === "BEGIN READ ONLY").length, 3);
  assert.equal(f.queries.filter(sql => sql === "ROLLBACK").length, 3);
  assert.match(f.queries.find(sql => sql.startsWith("SELECT")), /Asia\/Shanghai/u);
  assert.doesNotMatch(JSON.stringify(report), /private-/u);
});

test("warm-only cache, missing ledger and duplicate calls cannot establish cold load plus reuse", async () => {
  for (const counts of [[0,0,0], [0,1,2], [7,8,8]]) {
    const f = fixture({ counts });
    assert.equal(imageryProbeSucceeded(sanitizeImageryReport(await imageryRuntimeProbe(env, f.load, f.request))), false);
  }
  const blank = fixture({ blank: true });
  const report = await imageryRuntimeProbe(env, blank.load, blank.request);
  assert.equal(report.code, "imagery_http_contract_failed");
  assert.equal(blank.requests(), 1);
  assert.equal(imageryProbeSucceeded(report), false);
});

test("wrong environment and unsafe database stop HTTP, transport errors remain sanitized", async () => {
  const wrong = await imageryRuntimeProbe({ ...env, STARWARD_ENVIRONMENT: "production" }, () => assert.fail("no imports"));
  assert.equal(wrong.code, "imagery_probe_incomplete");
  const unsafe = fixture({ readOnly: "off" });
  assert.equal((await imageryRuntimeProbe(env, unsafe.load, unsafe.request)).code, "imagery_probe_execution_failed");
  assert.equal(unsafe.requests(), 0);
  assert.equal(unsafe.ended(), true);
  const broken = fixture({ broken: true });
  const report = sanitizeImageryReport(await imageryRuntimeProbe(env, broken.load, broken.request));
  assert.equal(report.code, "imagery_probe_execution_failed");
  assert.doesNotMatch(JSON.stringify(report), /private-/u);
  const expired = fixture();
  assert.equal((await imageryRuntimeProbe(env, expired.load, expired.request, Date.now()-1)).code, "imagery_probe_execution_failed");
  assert.equal(expired.requests(), 0);
});

test("runner accepts only fixed imagery script and bounded sanitized report", async () => {
  const f = fixture();
  const report = await imageryRuntimeProbe(env, f.load, f.request);
  const result = diagnoseHost({ DIAGNOSTIC_MODE: "imagery", SSH_PRIVATE_KEY: "private-key", SSH_KNOWN_HOSTS: "private-trust",
    SSH_CONNECTION: JSON.stringify({ SSH_HOST: "host.invalid", SSH_PORT: "22", SSH_USER: "operator", REMOTE_INBOX: "/srv/inbox", REMOTE_RELEASE_ROOT: "/srv/releases", REMOTE_CANDIDATE_ROOT: "/srv/candidates", REMOTE_BASE_DEPLOY_ENV: "/srv/private.env" }) }, (_command, _args, options) => {
    assert.equal(options.input, imageryScript);
    return { status: 0, stdout: JSON.stringify({ ...report, privateValue: "private-secret" }) };
  });
  assert.equal(diagnosticSucceeded(result), true);
  assert.equal(result.privateValue, undefined);
  assert.throws(() => sanitizeImageryReport({ ...report, images: [{ ...report.images[0], sha256: "private-secret" }] }));
  assert.throws(() => sanitizeImageryReport({ ...report, usage: [{ attempts: 1, responses200: 2, unpriced: 1 }] }));
});
