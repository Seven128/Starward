import { operatorPreviewProviderSimulationProgram } from "./operator-preview-provider-simulation.mjs";
import { imageryRuntimeProbe } from "./imagery-runtime-probe.mjs";

// Fixed staging API inspection. This function is sent over SSH stdin, then Docker
// stdin, and runs as the existing API container's node user. It writes no files.
export async function apiRuntimeProbe(env = process.env, load = (name) => import(name), request = fetch) {
  const report = {
    status: "observed", runtimeEnvironment: env.STARWARD_ENVIRONMENT === "staging" ? "staging" : "invalid",
    revision: /^[a-f0-9]{40}$/u.test(env.STARWARD_RELEASE_REVISION ?? "") ? env.STARWARD_RELEASE_REVISION : null,
    healthStatus: null, configState: "failed", databaseState: "failed",
  };
  if (report.runtimeEnvironment !== "staging") return report;
  try {
    const response = await request("http://127.0.0.1:8787/health/ready", { signal: AbortSignal.timeout(5000) });
    report.healthStatus = response.status;
    await response.body?.cancel();
  } catch { /* No URLs, HTTP bodies or exception messages leave the process. */ }
  let config;
  try {
    const { loadRuntimeConfig } = await load("file:///app/workers/miniapp-api/dist/runtime-config.js");
    config = loadRuntimeConfig();
    const fields = ["releaseProfile", "storageMode", "authMode", "weatherProvider", "routeProvider", "placeSearchProvider"];
    const hours = config?.qweather?.forecastHours;
    if (!fields.every((key) => typeof config?.[key] === "string") || config.weatherProvider !== "QWEATHER" || !Number.isInteger(hours) || hours < 1 || hours > 240 || typeof config.darkSkyDatasetVersion !== "string") throw new Error();
    for (const key of fields) report[key] = config[key];
    report.forecastHours = config.qweather.forecastHours;
    report.darkSkyConfigured = config.darkSkyDatasetVersion !== "UNAVAILABLE";
    report.qweatherConfigured = !!(config.qweather.apiHost && config.qweather.credentialId && config.qweather.projectId && config.qweather.privateKeyPem);

    report.configState = "ready";
  } catch { config = undefined; /* Runtime validation may mention a secret value: discard errors. */ }
  let client;
  try {
    const { default: pg } = await load("pg");
    client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000,
      statement_timeout: 5000, options: "-c default_transaction_read_only=on", application_name: "starward-read-only-diagnostic" });
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const readOnly = await client.query("SHOW transaction_read_only");
    if (readOnly.rows[0]?.transaction_read_only !== "on") throw new Error();
    report.databaseReadOnly = true;
    const counts = await client.query(`SELECT
      (SELECT count(*)::int FROM schema_migrations) AS "migrationCount",
      (SELECT count(*)::int FROM spots) AS "spotsTotal",
      (SELECT count(*)::int FROM spots WHERE visibility_policy='PUBLIC_EXACT' AND status IN ('PUBLISHED','TEMPORARILY_CLOSED')) AS "spotsPublicStatuses",
      (SELECT count(*)::int FROM spots s JOIN spot_publication_assessments a USING(spot_id)
        WHERE s.visibility_policy='PUBLIC_EXACT' AND s.status IN ('PUBLISHED','TEMPORARILY_CLOSED')
        AND a.complete=true AND a.spot_revision=s.version AND a.assessed_at>=now()-interval '30 days'
        AND s.payload->>'status' IN ('PUBLISHED','TEMPORARILY_CLOSED')
        AND s.payload->'source'->>'kind' IS NOT NULL
        AND s.payload->'source'->>'kind' <> 'TEST_FIXTURE') AS "spotsQualifiedNonFixture",
      (SELECT count(*)::int FROM spot_publication_assessments) AS "assessmentsTotal",
      (SELECT count(*)::int FROM spot_publication_assessments WHERE assessed_at<now()-interval '30 days') AS "assessmentsExpired",
      (SELECT count(*)::int FROM dark_sky_dataset_publications WHERE state='PUBLISHED') AS "darkSkyPublishedVersions",
      (SELECT count(*)::int FROM dark_sky_grid_cells c JOIN dark_sky_dataset_publications p USING(dataset_version)
        WHERE p.state='PUBLISHED' AND c.state='ESTIMATED') AS "darkSkyPublishedCells",
      (SELECT count(*)::int FROM dark_sky_grid_cells c JOIN dark_sky_dataset_publications p USING(dataset_version)
        WHERE p.state='PUBLISHED' AND c.state='ESTIMATED' AND c.dataset_version=$1) AS "darkSkySelectedCells",
      (SELECT count(*)::int FROM vendor_call_usage) AS "vendorUsageRows",
      (SELECT count(*)::int FROM vendor_call_usage WHERE occurred_at>=date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai'
        AND occurred_at<(date_trunc('month',now() AT TIME ZONE 'Asia/Shanghai')+interval '1 month') AT TIME ZONE 'Asia/Shanghai') AS "vendorUsageCurrentMonthRows"`, [config?.darkSkyDatasetVersion ?? "UNAVAILABLE"]);
    Object.assign(report, counts.rows[0]);
    if (!config) delete report.darkSkySelectedCells;
    report.databaseState = "ready";
  } catch { /* SQL/connection errors are private. A failed query is not zero data. */ }
  finally {
    if (client) { await client.query("ROLLBACK").catch(() => {}); await client.end().catch(() => {}); }
  }
  return report;
}

function stagingApiScript(program) {
  if (program.includes("STARWARD_FIXED_RUNTIME_PROBE")) throw new Error("diagnostic_program_delimiter_invalid");
  return `#!/bin/sh
set -eu
fail() { printf '%s\\n' "$1" >&2; exit 65; }
container=$(docker ps -q --filter label=com.docker.compose.project=starward-staging --filter label=com.docker.compose.service=api) || fail runtime_diagnostic_container_unavailable
case "$container" in ''|*[!a-f0-9]*) fail runtime_diagnostic_container_ambiguous ;; esac
identity=$(docker inspect --format '{{.Config.User}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{.State.Running}}' "$container") || fail runtime_diagnostic_identity_failed
[ "$identity" = 'node|starward-staging|api|true' ] || fail runtime_diagnostic_identity_mismatch
docker exec -i "$container" node --conditions=production --input-type=module <<'STARWARD_FIXED_RUNTIME_PROBE'
${program}
STARWARD_FIXED_RUNTIME_PROBE
`;
}

export const runtimeScript = stagingApiScript(`(${apiRuntimeProbe.toString()})().then(report => console.log(JSON.stringify(report))).catch(() => { console.log('{"status":"failed"}'); process.exitCode=1; });`);

export const imageryScript = stagingApiScript(`
const deadlineAt = Date.now() + 50000;
const watchdog = setTimeout(() => { process.stderr.write('runtime_diagnostic_deadline_exceeded\\n'); process.exit(65); }, 50000);
const observation = await (${apiRuntimeProbe.toString()})();
if (observation.runtimeEnvironment !== 'staging' || observation.databaseState !== 'ready' || observation.configState !== 'ready' || observation.healthStatus !== 200 || observation.migrationCount < 18) throw new Error('diagnostic_imagery_lane_invalid');
const result = await (${imageryRuntimeProbe.toString()})(process.env, undefined, undefined, deadlineAt);
process.stdout.write(JSON.stringify(result) + '\\n', () => { clearTimeout(watchdog); process.exit(0); });
`);

// Reuse the existing operator-preview program only after a current read-only
// observation proves that this is its expressly supported empty-population lane.
export const providerScript = stagingApiScript(`
const observation = await (${apiRuntimeProbe.toString()})();
if (observation.runtimeEnvironment !== 'staging' || observation.databaseState !== 'ready' || observation.configState !== 'ready' || observation.healthStatus !== 200 || observation.spotsQualifiedNonFixture !== 0) throw new Error('diagnostic_simulation_lane_invalid');
process.env.STARWARD_PROVIDER_SMOKE_LOCAL_DATE = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
${operatorPreviewProviderSimulationProgram}
`);

export function sanitizeProviderSimulationReport(report) {
  if (report?.status !== "passed" || report.evidenceScope !== "ISOLATED_TEST_SIMULATION" || report.productPopulation !== "FORMAL_POPULATION_MISSING" ||
      !Number.isInteger(report.hourlyCount) || report.hourlyCount < 1 || report.hourlyCount > 384 ||
      report.weather?.provider !== "和风天气" || !["FRESH", "PARTIAL", "STALE_USABLE"].includes(report.weather.state) ||
      report.astronomy?.provider !== "Astronomy Engine" || report.astronomy.state !== "FRESH" ||
      !["FRESH", "PARTIAL", "STALE_USABLE", "EXPIRED", "UNAVAILABLE", "ESTIMATED"].includes(report.alerts?.state) ||
      ![report.composedTotalCloudHours, report.alerts?.count].every(count => Number.isSafeInteger(count) && count >= 0 && count <= 1000)) throw new Error("diagnostic_simulation_response_invalid");
  return { status: "passed", evidenceScope: "ISOLATED_TEST_SIMULATION", productPopulation: "FORMAL_POPULATION_MISSING", hourlyCount: report.hourlyCount,
    composedTotalCloudHours: report.composedTotalCloudHours,
    weather: { provider: "和风天气", state: report.weather.state }, astronomy: { provider: "Astronomy Engine", state: "FRESH" },
    alerts: { state: report.alerts.state, count: report.alerts.count } };
}

const enums = {
  status: ["observed"], runtimeEnvironment: ["staging", "invalid"], configState: ["ready", "failed"], databaseState: ["ready", "failed"],
  releaseProfile: ["LOCAL", "TRIAL", "COMMERCIAL"], storageMode: ["MEMORY_TEST", "POSTGRES"], authMode: ["LOCAL_TEST", "WECHAT"],
  weatherProvider: ["QWEATHER"], routeProvider: ["DISABLED"], placeSearchProvider: ["DISABLED"],
};
const counts = ["migrationCount", "spotsTotal", "spotsPublicStatuses", "spotsQualifiedNonFixture", "assessmentsTotal", "assessmentsExpired", "darkSkyPublishedVersions", "darkSkyPublishedCells", "darkSkySelectedCells", "vendorUsageRows", "vendorUsageCurrentMonthRows"];

// A second output boundary on the runner rejects unanticipated server values.
export function sanitizeRuntimeReport(report) {
  const clean = {};
  for (const name of ["status", "runtimeEnvironment", "configState", "databaseState"])
    if (!enums[name].includes(report?.[name])) throw new Error("runtime_report_invalid");
  for (const [name, allowed] of Object.entries(enums)) {
    if (report[name] !== undefined) {
      if (!allowed.includes(report[name])) throw new Error("runtime_report_invalid");
      clean[name] = report[name];
    }
  }
  for (const name of counts) if (report[name] !== undefined) {
    if (!Number.isSafeInteger(report[name]) || report[name] < 0) throw new Error("runtime_report_invalid");
    clean[name] = report[name];
  }
  for (const name of ["databaseReadOnly", "darkSkyConfigured", "qweatherConfigured"]) if (report[name] !== undefined) {
    if (typeof report[name] !== "boolean") throw new Error("runtime_report_invalid");
    clean[name] = report[name];
  }
  if (report.revision !== null && !/^[a-f0-9]{40}$/u.test(report.revision ?? "")) throw new Error("runtime_report_invalid");
  clean.revision = report.revision;
  if (report.healthStatus !== null && (!Number.isInteger(report.healthStatus) || report.healthStatus < 100 || report.healthStatus > 599)) throw new Error("runtime_report_invalid");
  clean.healthStatus = report.healthStatus;
  if (report.forecastHours !== undefined) {
    if (!Number.isInteger(report.forecastHours) || report.forecastHours < 1 || report.forecastHours > 240) throw new Error("runtime_report_invalid");
    clean.forecastHours = report.forecastHours;
  }
  if (clean.databaseState === "ready" && (clean.databaseReadOnly !== true || counts.some((name) => clean[name] === undefined && (name !== "darkSkySelectedCells" || clean.configState === "ready")))) throw new Error("runtime_report_invalid");
  if (clean.configState === "ready" && [...Object.keys(enums).filter((name) => !["status", "runtimeEnvironment", "configState", "databaseState"].includes(name)), "forecastHours", "darkSkyConfigured", "qweatherConfigured"].some((name) => clean[name] === undefined)) throw new Error("runtime_report_invalid");
  return clean;
}
