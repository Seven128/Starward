import https from "node:https";
import { setTimeout as delay } from "node:timers/promises";
import { operatorPreviewProviderSimulationProgram } from "./operator-preview-provider-simulation.mjs";

function requireCondition(condition, code) {
  if (!condition) throw new Error(`operator_preview_${code}`);
}

export function checkPreviewCompose(config, validation, deploy) {
  requireCondition(config.name === "starward-staging", "project_mismatch");
  const services = config.services ?? {};
  requireCondition(Object.keys(services).sort().join() === "api,caddy,migrate,postgres,redis,worker", "services_mismatch");
  for (const [name, service] of Object.entries(services)) {
    requireCondition(!service.privileged && !service.network_mode, "unsafe_network_or_privilege");
    const ports = service.ports ?? [];
    requireCondition(name === "caddy"
      ? ports.length === 1 && Number(ports[0].published) === 443 && ports[0].target === 443 && ports[0].protocol === "tcp"
      : ports.length === 0, "port_exposure");
  }
  for (const name of ["api", "worker", "migrate"]) {
    const service = services[name];
    requireCondition(service.image === `${validation.imageRepository}@${validation.imageDigest}`, "image_mismatch");
    for (const key of ["STARWARD_ENVIRONMENT", "STARWARD_RELEASE_REVISION", "STARWARD_IMAGE_DIGEST", "STARWARD_RELEASED_AT"])
      requireCondition(service.environment?.[key] === deploy[key], "rendered_identity_mismatch");
  }
  requireCondition(services.caddy.environment?.STARWARD_OPERATOR_PREVIEW_TOKEN === deploy.STARWARD_OPERATOR_PREVIEW_TOKEN, "rendered_token_mismatch");
  requireCondition(services.caddy.environment?.STARWARD_API_DOMAIN === validation.domain, "rendered_ip_mismatch");
  requireCondition(services.caddy.volumes?.some((volume) => volume.target === "/etc/caddy/Caddyfile" && volume.read_only && /[/\\]Caddyfile\.operator-preview$/u.test(volume.source)), "overlay_missing");
  for (const [name, target, volumeName] of [["postgres", "/var/lib/postgresql/data", "postgres-data"], ["redis", "/data", "redis-data"]]) {
    requireCondition(services[name].volumes?.some((volume) => volume.type === "volume" && volume.target === target && volume.source === volumeName), "data_volume_mismatch");
    requireCondition(config.volumes?.[volumeName]?.name === `starward-staging_${volumeName}`, "data_volume_mismatch");
  }
}

export function parseComposeRows(text) {
  const selected = text.trim();
  if (!selected) return [];
  return selected.startsWith("[") ? JSON.parse(selected) : selected.split(/\r?\n/u).map((line) => JSON.parse(line));
}

export function checkPreviewContainers(rows, { dataOnly = false } = {}) {
  const expected = dataOnly ? ["postgres", "redis"] : ["postgres", "redis", "api", "worker", "caddy"];
  for (const service of expected) {
    const matches = rows.filter((row) => row.Service === service);
    requireCondition(matches.length === 1 && matches[0].State === "running", "service_not_running");
    requireCondition(service === "caddy" || matches[0].Health === "healthy", "service_not_healthy");
    const ports = (matches[0].Publishers ?? []).filter((port) => port.PublishedPort > 0);
    requireCondition(service === "caddy"
      ? ports.length > 0 && ports.every((port) => port.PublishedPort === 443 && port.TargetPort === 443 && port.Protocol === "tcp")
      : ports.length === 0, "live_port_exposure");
  }
}

async function requestOnce({
  ip,
  ca,
  token,
  path = "/health/ready",
  method = "GET",
  body,
}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const request = https.request({
      hostname: ip,
      port: 443,
      path,
      method,
      ca, rejectUnauthorized: true, minVersion: "TLSv1.2", servername: "",
      headers: {
        ...(token ? { "X-Starward-Operator-Preview": token } : {}),
        ...(payload === null
          ? {}
          : {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            }),
      },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 65536) request.destroy(new Error("operator_preview_response_too_large"));
      });
      response.on("error", () => reject(new Error("operator_preview_response_failed")));
      response.on("end", () => resolve({ status: response.statusCode, body }));
    });
    request.setTimeout(10000, () => request.destroy(new Error("operator_preview_request_timeout")));
    request.on("error", () => reject(new Error("operator_preview_tls_or_request_failed")));
    if (payload !== null) request.write(payload);
    request.end();
  });
}

export async function requestPreview(input) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await requestOnce(input); }
    catch (error) {
      if (error.message !== "operator_preview_tls_or_request_failed" || attempt === 2) throw error;
      await delay(500 * (attempt + 1));
    }
  }
}

function responseJson(result, code) {
  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error(`operator_preview_${code}_json_invalid`);
  }
}

function requireHttpStatus(result, expected, code) {
  if (result.status === expected) return;
  let stableCode = "UNCLASSIFIED";
  try {
    const selected = JSON.parse(result.body)?.code;
    if (/^[A-Z][A-Z_]{1,63}$/u.test(selected ?? "")) stableCode = selected;
  } catch {
    // Response bodies remain private; only an API-owned stable code is admitted.
  }
  const status = Number.isInteger(result.status) ? result.status : 0;
  throw new Error(`operator_preview_${code}_http_${status}_${stableCode.toLowerCase()}`);
}

function shanghaiLocalDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function runIsolatedProviderSimulation({ run, localDate }) {
  const result = run({
    args: [
      "exec",
      "-T",
      "-e",
      `STARWARD_PROVIDER_SMOKE_LOCAL_DATE=${localDate}`,
      "api",
      "node",
      "--input-type=module",
    ],
    input: Buffer.from(operatorPreviewProviderSimulationProgram, "utf8"),
    maxBuffer: 64 * 1024,
    step: "preview-provider-simulation",
  });
  let summary;
  try {
    summary = JSON.parse(result.stdout.toString("utf8"));
  } catch {
    throw new Error("operator_preview_provider_simulation_output_invalid");
  }
  requireCondition(
    summary?.status === "passed" &&
      summary?.evidenceScope === "ISOLATED_TEST_SIMULATION" &&
      summary?.productPopulation === "FORMAL_POPULATION_MISSING" &&
      Number.isInteger(summary?.hourlyCount) &&
      summary.hourlyCount > 0 &&
      summary?.weather?.provider === "和风天气" &&
      summary.weather.state !== "UNAVAILABLE" &&
      summary?.astronomy?.provider === "Astronomy Engine" &&
      summary.astronomy.state === "FRESH",
    "provider_simulation_evidence_invalid",
  );
  return {
    status: "passed",
    scenario: "contracts-owned-formal-spot-fixture",
    evidenceScope: summary.evidenceScope,
    productPopulation: summary.productPopulation,
    formalSpotCount: 0,
    hourlyCount: summary.hourlyCount,
    weather: summary.weather,
    astronomy: summary.astronomy,
    fixtureEvidence: true,
  };
}

async function checkProviderSmoke({ run, validation, deploy, ca, request }) {
  const token = deploy.STARWARD_OPERATOR_PREVIEW_TOKEN;
  const localDate = shanghaiLocalDate();
  const contextResult = await request({
    ip: validation.domain,
    ca,
    token,
    path: "/v2/observation-contexts/resolve",
    method: "POST",
    body: {
      location: {
        kind: "MAP_POINT",
        displayName: "operator-preview-provider-smoke-guangzhou",
        wgs84: {
          system: "WGS84",
          latitude: 23.1291,
          longitude: 113.2644,
        },
        source: "MAP_VIEWPORT",
        timezoneHint: "Asia/Shanghai",
      },
      localDate,
    },
  });
  requireHttpStatus(contextResult, 201, "provider_context");
  const contextEnvelope = responseJson(contextResult, "provider_context");
  const context = contextEnvelope?.data;
  requireCondition(
    /^ctx:[0-9a-f-]{36}$/iu.test(context?.contextId ?? "") &&
      context?.weatherView?.primaryPolicy === "QWEATHER",
    "provider_context_policy_mismatch",
  );
  const sceneResult = await request({
    ip: validation.domain,
    ca,
    token,
    path:
      "/v2/map/scene?layer=CLOUD&cloudLayer=TOTAL&contextId=" +
      encodeURIComponent(context.contextId),
  });
  requireHttpStatus(sceneResult, 200, "provider_scene");
  const scene = responseJson(sceneResult, "provider_scene");
  const sources = Array.isArray(scene?.sources) ? scene.sources : [];
  requireCondition(
    !sources.some(
      (source) =>
        source?.kind === "TEST_FIXTURE" || source?.state === "SAMPLE_DATA",
    ),
    "provider_fixture_evidence_forbidden",
  );
  const formalSpotCount = Array.isArray(scene?.data?.spots)
    ? scene.data.spots.length
    : 0;
  if (formalSpotCount === 0)
    return runIsolatedProviderSimulation({ run, localDate });
  const weather = sources.find(
    (source) =>
      source?.kind === "THIRD_PARTY_FORECAST" &&
      source?.provider === "和风天气" &&
      source?.state !== "UNAVAILABLE",
  );
  const astronomy = sources.find(
    (source) =>
      source?.kind === "PRODUCT_CALCULATION" &&
      source?.provider === "Astronomy Engine" &&
      source?.state === "FRESH",
  );
  requireCondition(Boolean(weather), "qweather_evidence_missing");
  requireCondition(Boolean(astronomy), "astronomy_evidence_missing");
  return {
    status: "passed",
    scenario: "fixed-public-guangzhou-reference",
    evidenceScope: "PRODUCT_MAP_SCENE",
    productPopulation: "FORMAL_POPULATION_AVAILABLE",
    formalSpotCount,
    dataState: scene.dataState,
    weather: { provider: weather.provider, state: weather.state },
    astronomy: { provider: astronomy.provider, state: astronomy.state },
    fixtureEvidence: false,
  };
}

export async function checkPreviewReadiness({ run, validation, deploy, request = requestPreview }) {
  const ca = run({ args: ["exec", "-T", "caddy", "cat", "/data/caddy/pki/authorities/local/root.crt"], step: "preview-local-ca" }).stdout;
  const denied = await request({ ip: validation.domain, ca });
  requireCondition(denied.status === 404, "unauthorized_request_not_denied");
  const result = await request({ ip: validation.domain, ca, token: deploy.STARWARD_OPERATOR_PREVIEW_TOKEN });
  requireCondition(result.status === 200, "readiness_http_failed");
  const body = responseJson(result, "readiness");
  requireCondition(body.ready === true && body.release?.environment === "staging"
    && body.release.revision === validation.revision && body.release.imageDigest === validation.imageDigest, "readiness_identity_mismatch");
  const providerSmoke = await checkProviderSmoke({
    run,
    validation,
    deploy,
    ca,
    request,
  });
  return {
    ready: true,
    unauthorizedStatus: 404,
    tls: "ip-verified-with-scoped-caddy-ca",
    publicTrustVerified: false,
    providerSmoke,
  };
}
