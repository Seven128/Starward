import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { apiRuntimeProbe, runtimeScript, sanitizeRuntimeReport } from "./runtime-diagnostics.mjs";

const config = {
  releaseProfile: "TRIAL", storageMode: "POSTGRES", authMode: "WECHAT", weatherProvider: "QWEATHER",
  openMeteoEvidenceMode: "OPEN_METEO_NONCOMMERCIAL", routeProvider: "AMAP", placeSearchProvider: "AMAP",
  qweather: { forecastHours: 24, apiHost: "private-host", credentialId: "secret-id", projectId: "secret-project", privateKeyPem: "secret-private-key" },
  darkSkyDatasetVersion: "UNAVAILABLE", amapWebServiceKey: "secret-amap",
};
const env = { STARWARD_ENVIRONMENT: "staging", STARWARD_RELEASE_REVISION: "a".repeat(40), DATABASE_URL: "secret-database-connection" };
const counts = { migrationCount: 17, spotsTotal: 8, spotsPublicStatuses: 6, spotsQualifiedNonFixture: 2,
  assessmentsTotal: 6, assessmentsExpired: 4, darkSkyPublishedVersions: 0, darkSkyPublishedCells: 0,
  darkSkySelectedCells: 0, vendorUsageRows: 0, vendorUsageCurrentMonthRows: 0 };
function fixture({ readOnly = "on", failQuery = false } = {}) {
  const calls = [];
  class Client {
    constructor(options) { calls.push(["client", options]); }
    async connect() { calls.push(["connect"]); }
    async query(sql, values) {
      calls.push([sql, values]);
      if (sql.startsWith("SHOW")) return { rows: [{ transaction_read_only: readOnly }] };
      if (sql.startsWith("SELECT")) { if (failQuery) throw new Error(env.DATABASE_URL); return { rows: [counts] }; }
      return { rows: [] };
    }
    async end() { calls.push(["end"]); }
  }
  const load = async (name) => name === "pg" ? { default: { Client } } : { loadRuntimeConfig: () => config };
  const request = async (url) => { assert.equal(url, "http://127.0.0.1:8787/health/ready"); return { status: 200 }; };
  return { calls, load, request };
}

test("runtime inspection uses a verified read-only transaction, aggregates and parameterized dataset selection", async () => {
  const f = fixture();
  const report = sanitizeRuntimeReport(await apiRuntimeProbe(env, f.load, f.request));
  assert.equal(report.databaseState, "ready");
  assert.equal(report.spotsTotal, 8);
  assert.equal(report.spotsQualifiedNonFixture, 2);
  assert.equal(report.darkSkyPublishedCells, 0);
  assert.equal(report.vendorUsageCurrentMonthRows, 0);
  assert.equal(f.calls[0][1].options, "-c default_transaction_read_only=on");
  assert.equal(f.calls[2][0], "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.equal(f.calls[3][0], "SHOW transaction_read_only");
  const [sql, values] = f.calls.find(([query]) => query.startsWith("SELECT"));
  assert.deepEqual(values, ["UNAVAILABLE"]);
  assert.match(sql, /a\.spot_revision=s\.version/u);
  assert.match(sql, /a\.assessed_at>=now\(\)-interval '30 days'/u);
  assert.match(sql, /Asia\/Shanghai/u);
  assert.deepEqual(f.calls.slice(-2), [["ROLLBACK", undefined], ["end"]]);
  assert.doesNotMatch(JSON.stringify(report), /secret-|private-host/u);
});

test("wrong environment stops before access, failed queries stay unknown and read-only refusal stops counts", async () => {
  const wrong = await apiRuntimeProbe({ ...env, STARWARD_ENVIRONMENT: "production" }, () => assert.fail("load forbidden"), () => assert.fail("request forbidden"));
  assert.equal(wrong.databaseState, "failed");
  for (const options of [{ readOnly: "off" }, { failQuery: true }]) {
    const f = fixture(options);
    const report = sanitizeRuntimeReport(await apiRuntimeProbe(env, f.load, f.request));
    assert.equal(report.databaseState, "failed");
    assert.equal(report.spotsTotal, undefined);
    assert.equal(report.darkSkyPublishedCells, undefined);
    assert.deepEqual(f.calls.at(-1), ["end"]);
    if (options.readOnly === "off") assert.equal(f.calls.some(([sql]) => sql.startsWith("SELECT")), false);
    assert.doesNotMatch(JSON.stringify(report), /secret-/u);
  }
});

test("runner output drops extra keys and rejects private strings or incomplete successful data", async () => {
  const f = fixture();
  const report = await apiRuntimeProbe(env, f.load, f.request);
  assert.equal(sanitizeRuntimeReport({ ...report, unexpectedSecret: "secret" }).unexpectedSecret, undefined);
  for (const change of [{ weatherProvider: "secret" }, { revision: "secret" }, { spotsTotal: "secret" }, { healthStatus: "secret" }, { spotsTotal: undefined }, { databaseReadOnly: false }])
    assert.throws(() => sanitizeRuntimeReport({ ...report, ...change }));
});

test("an unreadable runtime configuration does not claim zero selected dataset cells", async () => {
  const f = fixture();
  const report = sanitizeRuntimeReport(await apiRuntimeProbe(env, async (name) => {
    if (name !== "pg") throw new Error("secret config validation error");
    return f.load(name);
  }, f.request));
  assert.equal(report.configState, "failed");
  assert.equal(report.databaseState, "ready");
  assert.equal(report.darkSkySelectedCells, undefined);
  assert.equal(report.darkSkyPublishedCells, 0);
});

test("an incompatible older config is failed, never partially ready", async () => {
  const f = fixture();
  for (const older of [{}, { ...config, qweather: undefined }]) {
    const report = sanitizeRuntimeReport(await apiRuntimeProbe(env, async (name) => name === "pg" ? f.load(name) : { loadRuntimeConfig: () => older }, f.request));
    assert.equal(report.configState, "failed");
    assert.equal(report.darkSkySelectedCells, undefined);
  }
  assert.throws(() => sanitizeRuntimeReport({ status: "observed", runtimeEnvironment: "staging", configState: "ready", databaseState: "failed", revision: null, healthStatus: 200 }));
});

test("remote program is self-contained and constrained to the staging API's existing node user", () => {
  const input = `(${apiRuntimeProbe.toString()})();`;
  assert.equal(spawnSync(process.execPath, ["--check", "--input-type=module"], { input, encoding: "utf8" }).status, 0);
  assert.match(runtimeScript, /node\|starward-staging\|api\|true/u);
  assert.match(runtimeScript, /case "\$container" in ''\|\*\[!a-f0-9\]\*\)/u);
  assert.doesNotMatch(runtimeScript, /--privileged|--user|--mount|docker (?:run|restart|stop|cp)|INSERT INTO|DELETE FROM|UPDATE [a-z_]+ SET/u);
});
