import { imageryRuntimeProbe } from "./imagery-runtime-probe.mjs";

// Runs on the host, without entering a container or loading application config.
// Docker identifiers and image repository names stay inside this process.
export function apiIdentityProbe(execute) {
  const filters = ["--filter", "label=com.docker.compose.project=starward-staging", "--filter", "label=com.docker.compose.service=api"];
  const states = ["created", "restarting", "running", "removing", "paused", "exited", "dead"];
  const ids = (text) => {
    const values = text.trim() ? text.trim().split(/\r?\n/u) : [];
    if (values.some(value => !/^[a-f0-9]{64}$/u.test(value)) || new Set(values).size !== values.length) throw new Error("runtime_diagnostic_identity_response_invalid");
    return values;
  };
  const all = ids(execute(["ps", "--all", "--quiet", "--no-trunc", ...filters]));
  const running = ids(execute(["ps", "--quiet", "--no-trunc", ...filters]));
  if (running.some(id => !all.includes(id))) throw new Error("runtime_diagnostic_identity_changed");
  const stateCounts = Object.fromEntries(states.map(state => [state, 0]));
  let selectedContainer = null;
  let singleMatchingContainer = null;
  if (all.length) {
    const format = '{"id":{{json .Id}},"state":{{json .State.Status}},"running":{{json .State.Running}},"userMatches":{{eq .Config.User "node"}},"projectMatches":{{eq (index .Config.Labels "com.docker.compose.project") "starward-staging"}},"serviceMatches":{{eq (index .Config.Labels "com.docker.compose.service") "api"}},"revision":{{json (index .Config.Labels "org.opencontainers.image.revision")}},"imageReference":{{json .Config.Image}}}';
    const rows = execute(["inspect", "--format", format, ...all]).trim().split(/\r?\n/u).map(line => JSON.parse(line));
    if (rows.length !== all.length || new Set(rows.map(row => row.id)).size !== all.length) throw new Error("runtime_diagnostic_identity_changed");
    for (const row of rows) {
      if (!all.includes(row.id) || !states.includes(row.state) || typeof row.running !== "boolean" ||
          ![row.userMatches, row.projectMatches, row.serviceMatches].every(value => typeof value === "boolean")) throw new Error("runtime_diagnostic_identity_response_invalid");
      if (running.includes(row.id) !== row.running) throw new Error("runtime_diagnostic_identity_changed");
      // Docker keeps Running=true for paused/restarting; other states cannot
      // claim that flag. Preserve those observations without claiming usability.
      if (row.running !== ["running", "paused", "restarting"].includes(row.state)) throw new Error("runtime_diagnostic_identity_response_invalid");
      if (!row.projectMatches || !row.serviceMatches) throw new Error("runtime_diagnostic_identity_mismatch");
      stateCounts[row.state] += 1;
      const projected = {
        state: row.state, running: row.running, userMatches: row.userMatches,
        projectMatches: row.projectMatches, serviceMatches: row.serviceMatches,
        revision: typeof row.revision === "string" && /^[a-f0-9]{40}$/u.test(row.revision) ? row.revision : null,
        imageReferenceDigest: typeof row.imageReference === "string" ? row.imageReference.match(/^[a-z0-9][a-z0-9./:_-]*@(sha256:[a-f0-9]{64})$/u)?.[1] ?? null : null,
      };
      if (all.length === 1) singleMatchingContainer = projected;
      if (running.length === 1 && running[0] === row.id) selectedContainer = projected;
    }
  }
  return { status: "observed", evidenceScope: "STAGING_CONTAINER_IDENTITY_ONLY", matchingContainerCount: all.length,
    runningContainerCount: running.length, stateCounts, selectedContainer, singleMatchingContainer };
}

export const identityScript = `#!/bin/sh
set -eu
node --input-type=module <<'STARWARD_FIXED_IDENTITY_PROBE'
import { execFileSync } from 'node:child_process';
try {
  const report = (${apiIdentityProbe.toString()})(args => execFileSync('docker', args, { encoding: 'utf8', timeout: 10000, maxBuffer: 32768, stdio: ['ignore', 'pipe', 'pipe'] }));
  console.log(JSON.stringify(report));
} catch (error) {
  const codes = ['runtime_diagnostic_identity_response_invalid', 'runtime_diagnostic_identity_changed', 'runtime_diagnostic_identity_mismatch'];
  process.stderr.write((codes.includes(error?.message) ? error.message : 'runtime_diagnostic_identity_failed') + '\\n');
  process.exitCode = 65;
}
STARWARD_FIXED_IDENTITY_PROBE
`;

export function sanitizeIdentityReport(report) {
  const states = ["created", "restarting", "running", "removing", "paused", "exited", "dead"];
  const fail = () => { throw new Error("runtime_identity_report_invalid"); };
  if (report?.status !== "observed" || report.evidenceScope !== "STAGING_CONTAINER_IDENTITY_ONLY" ||
      ![report.matchingContainerCount, report.runningContainerCount].every(value => Number.isSafeInteger(value) && value >= 0) ||
      report.runningContainerCount > report.matchingContainerCount) fail();
  const stateCounts = Object.fromEntries(states.map(state => [state, report.stateCounts?.[state]]));
  if (Object.values(stateCounts).some(value => !Number.isSafeInteger(value) || value < 0) ||
      Object.values(stateCounts).reduce((sum, value) => sum + value, 0) !== report.matchingContainerCount ||
      stateCounts.running + stateCounts.paused + stateCounts.restarting !== report.runningContainerCount) fail();
  const project = row => {
    if (!row || !states.includes(row.state) || stateCounts[row.state] < 1 || typeof row.running !== "boolean" ||
        row.running !== ["running", "paused", "restarting"].includes(row.state) ||
        typeof row.userMatches !== "boolean" || row.projectMatches !== true || row.serviceMatches !== true ||
        (row.revision !== null && (typeof row.revision !== "string" || !/^[a-f0-9]{40}$/u.test(row.revision))) ||
        (row.imageReferenceDigest !== null && (typeof row.imageReferenceDigest !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(row.imageReferenceDigest)))) fail();
    return Object.fromEntries(["state", "running", "userMatches", "projectMatches", "serviceMatches", "revision", "imageReferenceDigest"].map(name => [name, row[name]]));
  };
  let selectedContainer = null;
  if (report.runningContainerCount === 1) {
    selectedContainer = project(report.selectedContainer);
    if (!selectedContainer.running) fail();
  } else if (report.selectedContainer !== null) fail();
  // Older saved reports lack this additive observation; never reconstruct it.
  const matching = {};
  if (Object.hasOwn(report, "singleMatchingContainer")) {
    matching.singleMatchingContainer = null;
    if (report.matchingContainerCount === 1) {
      const row = project(report.singleMatchingContainer);
      if (row.running !== (report.runningContainerCount === 1) ||
          (selectedContainer && JSON.stringify(row) !== JSON.stringify(selectedContainer))) fail();
      matching.singleMatchingContainer = row;
    } else if (report.singleMatchingContainer !== null) fail();
  }
  return { status: "observed", evidenceScope: "STAGING_CONTAINER_IDENTITY_ONLY", matchingContainerCount: report.matchingContainerCount,
    runningContainerCount: report.runningContainerCount, stateCounts, selectedContainer, ...matching };
}

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
