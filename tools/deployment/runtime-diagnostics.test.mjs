import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { apiIdentityProbe, identityScript, sanitizeIdentityReport, apiRuntimeProbe, runtimeScript, providerScript, sanitizeRuntimeReport, sanitizeProviderSimulationReport } from "./runtime-diagnostics.mjs";
import { diagnosticSucceeded } from "./run-host-diagnostics.mjs";

const config = {
  releaseProfile: "TRIAL", storageMode: "POSTGRES", authMode: "WECHAT", weatherProvider: "QWEATHER",
  routeProvider: "DISABLED", placeSearchProvider: "DISABLED",
  qweather: { forecastHours: 240, apiHost: "private-host", credentialId: "secret-id", projectId: "secret-project", privateKeyPem: "secret-private-key" },
  darkSkyDatasetVersion: "UNAVAILABLE",
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

const identityRow = (index, patch = {}) => ({ id: index.toString(16).padStart(64, "0"), state: "running", running: true,
  userMatches: true, projectMatches: true, serviceMatches: true, revision: "a".repeat(40),
  imageReference: `private-registry.invalid/private-repository@sha256:${"b".repeat(64)}`, ...patch });
function identityFixture(rows, running = rows.filter(row => row.running).map(row => row.id)) {
  const calls = [];
  return { calls, execute(args) {
    calls.push(args);
    if (args[0] === "ps") {
      assert.deepEqual(args.slice(-4), ["--filter", "label=com.docker.compose.project=starward-staging", "--filter", "label=com.docker.compose.service=api"]);
      assert.ok(args.includes("--no-trunc"));
      return (args.includes("--all") ? rows.map(row => row.id) : running).join("\n");
    }
    assert.equal(args[0], "inspect");
    assert.equal(args[1], "--format");
    assert.deepEqual(args.slice(3), rows.map(row => row.id));
    assert.doesNotMatch(args[2], /Config\.Env|\.Mounts|\.NetworkSettings/u);
    return rows.map(row => JSON.stringify({ ...row, privateExtra: "never output" })).join("\n");
  } };
}

test("identity observation separates absent, stopped and multiple running fixed-label containers without entering them", () => {
  for (const [rows, runningCount] of [
    [[], 0], [[identityRow(1, { state: "exited", running: false })], 0],
    [[identityRow(1), identityRow(2)], 2],
  ]) {
    const f = identityFixture(rows);
    const report = sanitizeIdentityReport(apiIdentityProbe(f.execute));
    assert.equal(report.matchingContainerCount, rows.length);
    assert.equal(report.runningContainerCount, runningCount);
    assert.equal(report.selectedContainer, null);
    assert.equal(Object.values(report.stateCounts).reduce((sum, value) => sum + value, 0), rows.length);
    assert.equal(diagnosticSucceeded(report), false);
    assert.ok(f.calls.every(args => ["ps", "inspect"].includes(args[0])));
    assert.equal(f.calls.length, rows.length ? 3 : 2);
  }
});

test("unique running identity projects only expected-user matches and validated release metadata", () => {
  const f = identityFixture([identityRow(1, { state: "exited", running: false }), identityRow(2)]);
  const report = sanitizeIdentityReport(apiIdentityProbe(f.execute));
  assert.equal(report.matchingContainerCount, 2);
  assert.equal(report.runningContainerCount, 1);
  assert.equal(report.stateCounts.exited, 1);
  assert.equal(report.stateCounts.running, 1);
  assert.deepEqual(report.selectedContainer, { state: "running", running: true, userMatches: true, projectMatches: true, serviceMatches: true,
    revision: "a".repeat(40), imageReferenceDigest: `sha256:${"b".repeat(64)}` });
  assert.equal(diagnosticSucceeded(report), true);
  assert.doesNotMatch(JSON.stringify(report), /private-|never output|"id":/u);
  const wrongUser = sanitizeIdentityReport(apiIdentityProbe(identityFixture([identityRow(1, { userMatches: false })]).execute));
  assert.equal(diagnosticSucceeded(wrongUser), false);
  const absentMetadata = sanitizeIdentityReport(apiIdentityProbe(identityFixture([identityRow(1, { revision: "private value", imageReference: "private-registry.invalid/mutable:latest" })]).execute));
  assert.equal(absentMetadata.selectedContainer.revision, null);
  assert.equal(absentMetadata.selectedContainer.imageReferenceDigest, null);
});

test("identity changes and invalid Docker projections fail without exposing raw identifiers or strings", () => {
  for (const [rows, running, code] of [
    [[identityRow(1)], [identityRow(2).id], "changed"],
    [[identityRow(1, { running: false })], [identityRow(1).id], "changed"],
    [[identityRow(1, { serviceMatches: false })], undefined, "mismatch"],
    [[identityRow(1, { state: "private-state" })], undefined, "response_invalid"],
    [[identityRow(1, { id: "private-container-id" })], undefined, "response_invalid"],
  ]) assert.throws(() => apiIdentityProbe(identityFixture(rows, running).execute), new RegExp(`^Error: runtime_diagnostic_identity_${code}$`, "u"));
});

test("identity runner allowlist rejects contradictory or private observations and drops all extra fields", () => {
  const report = apiIdentityProbe(identityFixture([identityRow(1)]).execute);
  const clean = sanitizeIdentityReport({ ...report, privateExtra: "secret", stateCounts: { ...report.stateCounts, privateExtra: "secret" },
    selectedContainer: { ...report.selectedContainer, id: "secret", imageReference: "secret" } });
  assert.deepEqual(clean, report);
  for (const patch of [{ matchingContainerCount: 2 }, { runningContainerCount: -1 }, { runningContainerCount: 2 }, { stateCounts: { ...report.stateCounts, running: "secret" } },
    ...[{ revision: "secret" }, { revision: ["a".repeat(40)] }, { imageReferenceDigest: "secret" }, { imageReferenceDigest: [`sha256:${"b".repeat(64)}`] }, { userMatches: "secret" }, { serviceMatches: false }].map(selected => ({ selectedContainer: { ...report.selectedContainer, ...selected } }))])
    assert.throws(() => sanitizeIdentityReport({ ...report, ...patch }), /runtime_identity_report_invalid/u);
  const source = identityScript.split("<<'STARWARD_FIXED_IDENTITY_PROBE'\n")[1].split("\nSTARWARD_FIXED_IDENTITY_PROBE")[0];
  assert.equal(spawnSync(process.execPath, ["--check", "--input-type=module"], { input: source, encoding: "utf8" }).status, 0);
  assert.doesNotMatch(source, /docker exec|Config\.Env|readFile|writeFile|mkdir|STARWARD_FIXED_RUNTIME_PROBE|fetch\(|pg\.Client/u);
});

test("identity rejects contradictory state flags and forged aggregate running counts", () => {
  for (const state of ["created", "removing", "exited", "dead"])
    assert.throws(() => apiIdentityProbe(identityFixture([identityRow(1, { state, running: true })]).execute), /runtime_diagnostic_identity_response_invalid/u);
  for (const state of ["running", "paused", "restarting"])
    assert.throws(() => apiIdentityProbe(identityFixture([identityRow(1, { state, running: false })]).execute), /runtime_diagnostic_identity_response_invalid/u);
  const report = apiIdentityProbe(identityFixture([identityRow(1)]).execute);
  for (const state of ["created", "removing", "exited", "dead"]) {
    const stateCounts = Object.fromEntries(Object.keys(report.stateCounts).map(key => [key, key === state ? 1 : 0]));
    assert.throws(() => sanitizeIdentityReport({ ...report, stateCounts, selectedContainer: { ...report.selectedContainer, state } }), /runtime_identity_report_invalid/u);
  }
  assert.throws(() => sanitizeIdentityReport({ ...report, matchingContainerCount: 2,
    stateCounts: { ...report.stateCounts, running: 0, exited: 2 } }), /runtime_identity_report_invalid/u);
});

test("identity preserves paused and restarting observations without marking them usable", () => {
  for (const state of ["paused", "restarting"]) {
    const report = sanitizeIdentityReport(apiIdentityProbe(identityFixture([identityRow(1, { state, running: true })]).execute));
    assert.equal(report.runningContainerCount, 1);
    assert.equal(report.stateCounts[state], 1);
    assert.equal(report.selectedContainer.state, state);
    assert.equal(diagnosticSucceeded(report), false);
  }
});

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

test("provider mode reuses the existing simulation only after checking empty formal population", () => {
  const source = providerScript.split("<<'STARWARD_FIXED_RUNTIME_PROBE'\n")[1].split("\nSTARWARD_FIXED_RUNTIME_PROBE")[0];
  assert.equal(spawnSync(process.execPath, ["--check", "--input-type=module"], { input: source, encoding: "utf8" }).status, 0);
  assert.match(source, /observation\.spotsQualifiedNonFixture !== 0/u);
  assert.match(source, /ISOLATED_TEST_SIMULATION/u);
  assert.match(source, /new AstronomyService/u);
  const report = { status: "passed", evidenceScope: "ISOLATED_TEST_SIMULATION", productPopulation: "FORMAL_POPULATION_MISSING", hourlyCount: 24, composedTotalCloudHours: 24, weather: { provider: "和风天气", state: "FRESH" }, astronomy: { provider: "Astronomy Engine", state: "FRESH" }, alerts: { state: "FRESH", count: 0 } };
  assert.deepEqual(sanitizeProviderSimulationReport({ ...report, secret: "never output" }), report);
  assert.equal(diagnosticSucceeded(report), true);
  for (const patch of [{ composedTotalCloudHours: 0 }, { alerts: { state: "UNAVAILABLE", count: 0 } }]) assert.equal(diagnosticSucceeded(sanitizeProviderSimulationReport({ ...report, ...patch })), false);
  for (const patch of [{ hourlyCount: 0 }, { weather: { provider: "Open-Meteo", state: "FRESH" } }, { weather: { provider: "和风天气", state: "EXPIRED" } }, { evidenceScope: "PRODUCT" }]) assert.throws(() => sanitizeProviderSimulationReport({ ...report, ...patch }));
});
