import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { productionModules } from "./contracts.mjs";

const moduleCache = new Map();
let typeScriptImporter;
const sourceExtensions = new Set([".cjs", ".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".yaml", ".yml"]);

const isObject = (value) => value !== null && typeof value === "object";
const hasAll = (values, required) => required.every((item) => values.includes(item));
const asArray = (value) => Array.isArray(value) ? value : [];
const finite = (value) => Number.isFinite(value);

function inside(root, relative) {
  const resolved = path.resolve(root, ...relative.replaceAll("\\", "/").split("/"));
  const normalizedRoot = path.resolve(root).toLowerCase();
  const normalized = resolved.toLowerCase();
  if (normalized !== normalizedRoot && !normalized.startsWith(`${normalizedRoot}${path.sep}`)) throw new Error(`path_outside_repository:${relative}`);
  return resolved;
}

async function json(root, relative) {
  return JSON.parse(await readFile(inside(root, relative), "utf8"));
}

async function source(root, relative) {
  return readFile(inside(root, relative), "utf8");
}

async function exists(root, relative, kind = "file") {
  const value = await stat(inside(root, relative)).catch(() => null);
  return kind === "directory" ? Boolean(value?.isDirectory()) : Boolean(value?.isFile() && value.size > 0);
}

async function load(root, relative) {
  if (typeof typeScriptImporter !== "function") throw new Error("typescript_importer_not_configured");
  const absolute = inside(root, relative);
  if (!moduleCache.has(absolute)) moduleCache.set(absolute, typeScriptImporter(pathToFileURL(absolute).href, import.meta.url));
  return moduleCache.get(absolute);
}

export function configureTypeScriptImporter(importer) {
  if (typeof importer !== "function") throw new TypeError("typescript_importer_must_be_a_function");
  typeScriptImporter = importer;
}

async function invoke(root, moduleKey, exportName, input) {
  const module = await load(root, productionModules[moduleKey]);
  if (typeof module[exportName] !== "function") throw new Error(`missing_production_export:${productionModules[moduleKey]}:${exportName}`);
  return module[exportName](input);
}

async function walk(root, relatives) {
  const files = [];
  async function visit(absolute) {
    const entries = await readdir(absolute, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (["node_modules", ".expo", ".git", "dist", "build", "coverage"].includes(entry.name)) continue;
      const target = path.join(absolute, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(target);
    }
  }
  for (const relative of relatives) {
    const absolute = inside(root, relative);
    if ((await stat(absolute).catch(() => null))?.isDirectory()) await visit(absolute);
  }
  return files;
}

async function sourceContains(root, relatives, pattern) {
  for (const file of await walk(root, relatives)) {
    if (pattern.test(await readFile(file, "utf8"))) return true;
  }
  return false;
}

async function carrierIntegrity(root, carrier) {
  const absolute = inside(root, carrier);
  const carrierStat = await stat(absolute).catch(() => null);
  if (!carrierStat?.isFile() || carrierStat.size < 40) return false;
  const text = await readFile(absolute, "utf8");
  if (/longTask(?:Probe|Result)|acceptance(?:Passed|Result)|data-acceptance-passed/iu.test(text)) return false;
  const module = await load(root, carrier);
  return Object.keys(module).some((name) => !/acceptance|longTask/iu.test(name));
}

async function apiContractHealthy(root, outcome) {
  const document = await json(root, "packages/contracts/openapi/v1.json");
  if (!String(document.openapi ?? "").startsWith("3.") || !isObject(document.paths) || !isObject(document.components?.schemas?.DataStatus)) return false;
  const prefixes = {
    "admin-data-operations": ["/v1/admin"],
    "forecast-and-astronomy": ["/v1/forecast", "/v1/astronomy"],
    "map-route-discovery": ["/v1/map", "/v1/routes"],
    "sky-orientation-ar": ["/v1/sky"],
    "tonight-decision": ["/v1/night-reports"],
  }[outcome] ?? [];
  if (!prefixes.every((prefix) => Object.keys(document.paths).some((item) => item.startsWith(prefix)))) return false;
  const operations = [];
  for (const [route, methods] of Object.entries(document.paths)) {
    if (!route.startsWith("/v1/")) return false;
    for (const [method, operation] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete", "parameters"].includes(method)) continue;
      if (method === "parameters") continue;
      if (!operation.operationId || !isObject(operation.responses) || !Object.keys(operation.responses).some((status) => /^2\d\d$/u.test(status))) return false;
      operations.push(operation.operationId);
    }
  }
  return operations.length > 0 && new Set(operations).size === operations.length;
}

async function migrationBoundaryHealthy(root, outcome) {
  const manifest = await json(root, "infrastructure/database/migrations/manifest.json");
  const entries = asArray(manifest.migrations).filter((item) => asArray(item.scopes).includes(outcome) || asArray(item.scopes).includes("platform"));
  if (!entries.length || new Set(entries.map((item) => item.id)).size !== entries.length) return false;
  for (const item of entries) {
    if (!/^[a-f0-9]{64}$/u.test(item.sha256 ?? "") || !item.up || !item.down) return false;
    const up = await source(root, item.up);
    const down = await source(root, item.down);
    if (!up.trim() || !down.trim() || /\bDROP\s+(?:TABLE|DATABASE)\b/iu.test(up)) return false;
    if (createHash("sha256").update(up).digest("hex") !== item.sha256) return false;
  }
  return true;
}

async function permissionBoundaryHealthy(root) {
  const config = await json(root, "apps/mobile/app.json");
  const expo = config.expo ?? config;
  const permissions = asArray(expo.android?.permissions);
  const allowed = new Set(["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA", "POST_NOTIFICATIONS", "VIBRATE"]);
  if (permissions.some((item) => !allowed.has(item))) return false;
  if (!asArray(expo.android?.blockedPermissions).includes("android.permission.ACCESS_BACKGROUND_LOCATION")) return false;
  const plist = expo.ios?.infoPlist ?? {};
  if (!plist.NSLocationWhenInUseUsageDescription || !plist.NSCameraUsageDescription) return false;
  const fallback = await invoke(root, "platform", "resolvePermissionFallbacks", {
    preciseLocation: "denied",
    backgroundLocation: "denied",
    camera: "denied",
    notifications: "denied",
  });
  return fallback.manualLocation === true && fallback.staticSky === true && fallback.foregroundTimer === true && fallback.localSettings === true && fallback.repeatPrompts === false;
}

async function securityBoundaryHealthy(root, outcome) {
  const module = await load(root, productionModules.security);
  const policy = module.securityPolicy;
  if (!isObject(policy) || policy.admin?.mfaRequired !== true || policy.upload?.credentialTtlSeconds > 900 || policy.logs?.redactSecrets !== true) return false;
  if (typeof module.evaluateSecurityRequest !== "function") return false;
  const admin = await module.evaluateSecurityRequest({ actor: { role: "anonymous", mfa: false }, action: "admin.source.disable", outcome });
  const replay = await module.evaluateSecurityRequest({ actor: { role: "user", mfa: true }, action: "request.replay", signatureAgeSeconds: 901, outcome });
  if (admin.allowed !== false || replay.allowed !== false) return false;
  const secretPattern = /AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_-]?key|client[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/u;
  return !(await sourceContains(root, ["apps", "packages", "workers", "infrastructure"], secretPattern));
}

async function nativeAppShapeHealthy(root) {
  const pkg = await json(root, "apps/mobile/package.json");
  const config = await json(root, "apps/mobile/app.json");
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const expoMajor = Number.parseInt(String(deps.expo ?? "").match(/\d+/u)?.[0] ?? "0", 10);
  const newArchitectureBaseline = expoMajor >= 55
    ? config.expo?.newArchEnabled !== false
    : config.expo?.newArchEnabled === true;
  const buildProperties = (config.expo?.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties")?.[1]?.android;
  return /^~?57\./u.test(deps.expo ?? "")
    && /^0\.86(?:\.|$)/u.test(deps["react-native"] ?? "")
    && /^19\.2(?:\.|$)/u.test(deps.react ?? "")
    && newArchitectureBaseline
    && /^~?57\./u.test(deps["expo-build-properties"] ?? "")
    && buildProperties?.minSdkVersion === 24
    && buildProperties?.compileSdkVersion === 36
    && buildProperties?.targetSdkVersion === 36
    && await exists(root, "apps/mobile/modules", "directory")
    && typeof pkg.scripts?.android === "string"
    && typeof pkg.scripts?.ios === "string";
}

async function architectureHealthy(root) {
  const pkg = await json(root, "package.json");
  const workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages;
  return asArray(workspaces).some((item) => item.startsWith("apps/"))
    && asArray(workspaces).some((item) => item.startsWith("packages/"))
    && await exists(root, "apps/mobile", "directory")
    && await exists(root, "apps/api", "directory")
    && await exists(root, "apps/admin-web", "directory")
    && await exists(root, "workers", "directory")
    && await exists(root, "packages/contracts", "directory")
    && await nativeAppShapeHealthy(root);
}

async function sourceGateHealthy(root) {
  const registry = await json(root, "config/data-sources/registry.json");
  const sources = asArray(registry.sources);
  if (!sources.length) return false;
  const ids = new Set();
  for (const item of sources) {
    if (!item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    if (!item.provenance || !item.licenseStatus || !item.targetRegionEvidence || !isObject(item.tco12Month)) return false;
    if (item.productionEnabled === true && !hasAll(asArray(item.passedGates), ["provenance", "quality", "stability", "commercial-license", "safe-degradation"])) return false;
  }
  const selected = await invoke(root, "platform", "selectQualifiedProvider", { candidates: sources });
  const qualified = sources.filter((item) => item.productionEnabled === true || hasAll(asArray(item.passedGates), ["provenance", "quality", "stability", "commercial-license", "safe-degradation"]));
  if (!qualified.length) return selected.status === "blocked";
  const cheapest = [...qualified].sort((a, b) => a.tco12Month.totalCny - b.tco12Month.totalCny)[0];
  return selected.providerId === cheapest.id && selected.basis === "qualified-lowest-12m-tco";
}

async function environmentIsolationHealthy(root) {
  const staging = await json(root, "infrastructure/environments/staging.json");
  const production = await json(root, "infrastructure/environments/production.json");
  const keys = ["database", "redis", "bucket", "encryptionKey", "oauthClient"];
  return keys.every((key) => staging[key] && production[key] && staging[key] !== production[key])
    && staging.notificationSink === "test-only"
    && production.notificationSink === "production";
}

async function measuredReportHealthy(root, relative, requiredKeys) {
  const report = await json(root, relative);
  return report.schemaVersion === 1
    && typeof report.generatedAt === "string"
    && report.status === "passed"
    && report.releaseBlocked === false
    && report.productionReady === true
    && requiredKeys.every((key) => report.results?.[key]?.status === "passed" && report.results[key].sampleCount > 0 && report.results[key].evidence);
}

async function deferredGateHealthy(root, gate, status, releaseBlocked) {
  const decision = await invoke(root, "platform", "evaluateDeferredReleaseGate", { gate, status, releaseBlocked });
  return decision.currentMachineDeliveryAccepted === true
    && decision.productionPromotionAllowed === false
    && decision.disposition === "external-pending"
    && decision.reminderRequired === true;
}

async function sloEvaluationHealthy(root) {
  const requiredKeys = ["app-start", "tonight-cached", "tonight-uncached", "map-interaction", "route-timeout", "offline-restore", "provider-ingest", "notification-latency", "api-error-rate", "crash-free-session"];
  if (await measuredReportHealthy(root, "artifacts/verification/slo-report.json", requiredKeys)) return true;
  const report = await json(root, "artifacts/verification/slo-report.json");
  const signals = await json(root, "infrastructure/monitoring/quality-signals.json");
  const pendingRowsHealthy = requiredKeys.every((key) => report.results?.[key]?.status === "pending"
    && report.results[key].sampleCount === 0
    && typeof report.results[key].evidence === "string"
    && report.results[key].evidence.length > 0);
  const instrumentationHealthy = hasAll(asArray(signals.technical), ["api-latency", "provider-latency", "mobile-crash", "screen-start", "offline-sync"])
    && hasAll(asArray(signals.dimensions), ["release", "platform", "device-tier", "network-tier", "provider-run"]);
  return report.schemaVersion === 1
    && typeof report.generatedAt === "string"
    && report.status === "pending-production-measurement"
    && report.releaseBlocked === true
    && report.productionReady === false
    && report.researchStatus === "completed"
    && typeof report.researchBaseline === "string"
    && typeof report.deferredGateReport === "string"
    && pendingRowsHealthy
    && instrumentationHealthy
    && await deferredGateHealthy(root, "production-slo", report.status, report.releaseBlocked);
}

async function releaseCoverageHealthy(root) {
  const requiredKeys = ["unit", "astronomy-golden", "provider-contract", "ios-simulator", "android-emulator", "ios-device", "android-device", "weak-network", "offline-restart", "low-power", "low-brightness", "outdoor-field"];
  if (await measuredReportHealthy(root, "artifacts/verification/release-matrix.json", requiredKeys)) return true;
  const report = await json(root, "artifacts/verification/release-matrix.json");
  const localKeys = ["unit", "android-emulator"];
  const deferredKeys = requiredKeys.filter((key) => !localKeys.includes(key));
  const localRowsHealthy = localKeys.every((key) => report.results?.[key]?.status === "passed"
    && report.results[key].sampleCount > 0
    && typeof report.results[key].evidence === "string"
    && report.results[key].evidence.length > 0);
  const deferredRowsHealthy = deferredKeys.every((key) => report.results?.[key]?.status === "pending"
    && report.results[key].sampleCount === 0
    && typeof report.results[key].evidence === "string"
    && report.results[key].evidence.length > 0);
  return report.schemaVersion === 1
    && typeof report.generatedAt === "string"
    && report.status === "pending-native-and-field-validation"
    && report.releaseBlocked === true
    && report.productionReady === false
    && typeof report.deferredGateReport === "string"
    && localRowsHealthy
    && deferredRowsHealthy
    && await deferredGateHealthy(root, "native-field-matrix", report.status, report.releaseBlocked);
}

async function complianceBoundaryHealthy(root) {
  const evidence = await json(root, "docs/evidence/external-confirmations/china-production-legal-readiness.json");
  const confirmed = evidence.status === "confirmed"
    && typeof evidence.confirmedAt === "string"
    && Boolean(evidence.reviewer?.name && evidence.reviewer?.qualification)
    && hasAll(asArray(evidence.coverage), ["ICP", "map-license", "cross-border", "storage-cdn", "personal-information"])
    && asArray(evidence.evidenceLinks).length > 0;
  if (confirmed) return true;
  return evidence.schemaVersion === 1
    && evidence.status === "pending"
    && evidence.releaseBlocked === true
    && evidence.productionReady === false
    && hasAll(asArray(evidence.coverage), ["ICP", "map-license", "cross-border", "storage-cdn", "personal-information"])
    && evidence.reviewer === null
    && evidence.confirmedAt === null
    && asArray(evidence.evidenceLinks).length === 0
    && typeof evidence.note === "string"
    && typeof evidence.deferredGateReport === "string"
    && await deferredGateHealthy(root, "china-production-compliance", evidence.status, evidence.releaseBlocked);
}

async function platformBoundary(root) {
  const module = await load(root, productionModules.platform);
  if (!isObject(module.platformBoundary)) throw new Error("missing_production_export:platformBoundary");
  return module.platformBoundary;
}

async function providerStitchingAbsent(root) {
  return !(await sourceContains(root, ["apps/mobile"], /https?:\/\/(?:api\.)?(?:qweather|open-meteo|amap|weatherapi|visualcrossing)|from\s+["'][^"']*(?:provider|qweather|open-meteo)[^"']*["']/iu));
}

async function truthfulCopy(root) {
  return !(await sourceContains(root, ["apps", "packages"], /绝对晴朗|保证可见|保证安全|100%可见/u));
}

function populationResult(passes, value) {
  return {
    passes,
    population: {
      eligibleIds: asArray(value?.eligibleIds),
      observedIds: asArray(value?.observedIds),
      excludedItems: asArray(value?.excludedItems),
    },
  };
}

export async function runStructuredProbe({ root, outcome, carrier, probeName }) {
  if (probeName === "carrier-integrity") return { passes: await carrierIntegrity(root, carrier) };

  switch (probeName) {
    case "admin-domain-trace": {
      const result = await invoke(root, "adminContracts", "traceNightReportEntities", {
        reportId: "night-2026-08-12-shenzhen",
        entityVersions: { preset: 3, spot: 11, weatherRun: 7, astronomyRun: 5, route: 4, recommendation: 9, fieldReport: 2 },
      });
      return { passes: hasAll(asArray(result.entityTypes), ["NightReport", "PreferenceProfile", "Spot", "ProviderRun", "AstronomyWindow", "RouteSnapshot", "RecommendationSnapshot", "FieldReport"]) && result.rawInputsImmutable === true && asArray(result.links).every((item) => item.version && item.source && item.timezone && item.coordinateSystem) };
    }
    case "admin-api-envelope": {
      const result = await invoke(root, "adminDataStatus", "serializeDataEnvelope", {
        generatedAt: "2026-08-12T12:00:00Z",
        expiresAt: "2026-08-12T12:15:00Z",
        parts: [
          { key: "weather", status: "fresh", confidence: 0.84, sourceVersion: "weather-7" },
          { key: "route", status: "cached", confidence: 0.72, sourceVersion: "route-4" },
          { key: "field", status: "missing", confidence: 0, warning: "provider unavailable" },
        ],
      });
      return { passes: result.status === "partial" && result.generatedAt && result.expiresAt && result.etag && asArray(result.warnings).length === 1 && hasAll(Object.keys(result.parts ?? {}), ["weather", "route", "field"]) };
    }
    case "admin-cache-policy": {
      const result = await invoke(root, "adminCachePolicy", "resolveNightReportCache", {
        key: { grid: "22.54,114.05", night: "2026-08-12", profileVersion: 3, weatherVersion: 8, scoringVersion: 4 },
        stored: { weatherVersion: 7, status: "fresh" },
        concurrentRequests: 12,
      });
      return { passes: result.serve?.status === "stale" && result.recompute?.deduplicated === true && result.recompute?.lockKey?.includes("profile:3") && result.recompute?.lockKey?.includes("weather:8") && result.crossProfileContamination === false };
    }
    case "api-contract-boundary":
      return { passes: await apiContractHealthy(root, outcome) };
    case "security-boundary":
      return { passes: await securityBoundaryHealthy(root, outcome) };
    case "data-migration-boundary":
    case "persistent-data-boundary":
      return { passes: await migrationBoundaryHealthy(root, outcome) };
    case "permission-boundary":
      return { passes: await permissionBoundaryHealthy(root) };
    case "admin-population-coverage": {
      const value = await invoke(root, "adminPopulation", "selectReplayPopulation", { entities: [{ id: "a", eligible: true }, { id: "b", eligible: true }, { id: "c", eligible: false, reason: "outside-region" }] });
      return populationResult(new Set(value.observedIds).size === 2 && hasAll(value.observedIds, ["a", "b"]) && value.excludedItems?.[0]?.id === "c" && value.excludedItems?.[0]?.reason === "outside-region", value);
    }
    case "astronomy-provenance": {
      const result = await invoke(root, "astronomy", "computeAstronomyEvidence", { instant: "2026-08-12T16:00:00Z", location: { lat: 22.529, lon: 113.9468, system: "WGS84" }, timezone: "Asia/Shanghai", target: "ISS", orbitEpoch: "2026-07-01T00:00:00Z" });
      return { passes: result.coordinateSystem === "WGS84" && result.timezone === "Asia/Shanghai" && result.algorithmVersion && result.catalogOrOrbitVersion && result.orbitEpoch && result.confidence < 0.7 && result.stale === true };
    }
    case "experimental-atmosphere-violation": {
      const result = await invoke(root, "astronomy", "describeAtmosphere", { providerSeeing: null, calibrated: false, cloud: 0.12, windMps: 2.1, humidity: 0.32 });
      return { passes: /估计|实验/u.test(result.label ?? "") && result.officialSeeing !== true && result.confidence > 0 && result.confidence < 1 && asArray(result.factors).length >= 3 };
    }
    case "coordinate-round-trip-violation":
    case "guard-coordinate-boundary": {
      const result = await invoke(root, "coordinate", "createMapCoordinateView", { authoritative: { lat: 22.529, lon: 113.9468, system: "WGS84" } });
      return { passes: result.authoritative.system === "WGS84" && result.authoritative.lat === 22.529 && result.authoritative.lon === 113.9468 && result.display.system === "GCJ-02" && result.roundTripErrorMeters <= 20 && result.astronomyInput.system === "WGS84" };
    }
    case "mobile-data-states": {
      const module = await load(root, productionModules.mobileDataState);
      if (typeof module.presentDataState !== "function") return { passes: false };
      const states = ["empty", "no-results", "stale", "partial", "failed"].map((state) => module.presentDataState({ state, missing: state === "partial" ? ["route"] : [] }));
      return { passes: new Set(states.map((item) => item.kind)).size === 5 && states.every((item) => item.label && item.action && item.accessibilityLabel) && states.every((item) => item.syntheticData !== true) };
    }
    case "native-app-shape-violation":
      return { passes: await nativeAppShapeHealthy(root) };
    case "notification-batch-violation": {
      const value = await invoke(root, "notificationBatch", "evaluateNotificationBatch", { events: [{ id: "evt-1", grid: "g1", version: 4 }, { id: "evt-1", grid: "g1", version: 4 }], subscriptions: [{ id: "s1", grid: "g1", cooldownUntil: null }, { id: "s2", grid: "g2", cooldownUntil: null }] });
      return { passes: value.notifications?.length === 1 && value.notifications[0].subscriptionId === "s1" && value.notifications[0].idempotencyKey && value.audit?.duplicateEvents === 1 && value.executionMode === "affected-grid-batch" };
    }
    case "notification-population-coverage": {
      const value = await invoke(root, "notificationPopulation", "selectNotificationPopulation", { subscriptions: [{ id: "s1", affected: true }, { id: "s2", affected: true }, { id: "s3", affected: false, reason: "outside-affected-grid" }] });
      return populationResult(new Set(value.observedIds).size === 2 && hasAll(value.observedIds, ["s1", "s2"]) && value.excludedItems?.[0]?.id === "s3", value);
    }
    case "official-source-gates":
      return { passes: await sourceGateHealthy(root) };
    case "architecture-baseline-violation":
      return { passes: await architectureHealthy(root) };
    case "interaction-direct-manipulation": {
      const result = await invoke(root, "interaction", "settleBottomSheet", { snapPoints: [0.25, 0.55, 0.9], position: 0.62, velocity: -0.7, interruptedAt: 0.58, reverseVelocity: 0.5 });
      return { passes: result.pressFeedbackMs <= 100 && result.dragRatio === 1 && result.interruptible === true && result.velocityInherited === true && [0.25, 0.55, 0.9].includes(result.targetSnapPoint) };
    }
    case "interaction-gesture-arbitration": {
      const result = await invoke(root, "interaction", "arbitrateGestures", { origins: ["map", "sheet-handle", "sheet-content", "system-back"], platform: "android", predictiveBack: true });
      return { passes: result.map === "map" && result["sheet-handle"] === "sheet" && result["sheet-content"] === "scroll-then-sheet" && result["system-back"] === "system" && result.deadlocks === 0 };
    }
    case "interaction-accessibility": {
      const result = await invoke(root, "interaction", "resolveAccessibilityVariant", { reducedMotion: true, screenReader: true, fontScale: 2, haptics: false, viewport: { width: 390, height: 844 } });
      return { passes: result.motion === "reduced" && result.hapticAlternative === "visual-and-announced" && result.minimumTargetPx >= 44 && result.contentOverlap === false && result.focusOrderValid === true };
    }
    case "interaction-red-light": {
      const result = await invoke(root, "interaction", "resolveRedLightTransition", { selectedSpotId: "spot-b", routeJobId: "route-9", states: ["sheet-open", "keyboard", "loading", "error", "native-map", "permission"] });
      return { passes: result.theme === "red-light" && result.selectedSpotId === "spot-b" && result.routeJobId === "route-9" && result.brightnessSpike === false && result.contextPreserved === true };
    }
    case "environment-isolation":
      return { passes: await environmentIsolationHealthy(root) };
    case "slo-evaluation":
      return { passes: await sloEvaluationHealthy(root) };
    case "delivery-order": {
      const boundary = await platformBoundary(root);
      const phases = asArray(boundary.releasePhases).map((item) => item.id);
      return { passes: phases.join(",") === "foundation,data,decision,closed-loop,professional-ecosystem" && boundary.primaryProduct === "react-native-ios-android" && asArray(boundary.auxiliaryPlatforms).every((item) => item.canSatisfyFinalGate === false) };
    }
    case "test-coverage-violation":
      return { passes: await releaseCoverageHealthy(root) };
    case "china-compliance":
      return { passes: await complianceBoundaryHealthy(root) };
    case "security-baseline":
      return { passes: await securityBoundaryHealthy(root, outcome) };
    case "global-context-atomicity": {
      const value = await invoke(root, "platform", "updateDecisionContext", { current: { spotId: "spot-a", instant: "2026-08-12T14:00:00Z", revision: 3 }, change: { spotId: "spot-b", instant: "2026-08-12T16:30:00Z" }, consumers: ["tonight", "spot", "itinerary", "sky", "shooting", "field"] });
      return { passes: value.revision === 4 && value.spotId === "spot-b" && value.instant === "2026-08-12T16:30:00Z" && value.consumers.every((item) => item.contextRevision === 4 || item.state === "recompute-required") };
    }
    case "global-partial-data": {
      const value = await invoke(root, "platform", "composeDataState", { weather: { state: "fresh", version: "w7" }, route: { state: "cached", version: "r4" }, light: { state: "estimated", version: "viirs-2025" }, field: { state: "missing" } });
      return { passes: value.overall === "partial" && Object.values(value.parts).every((item) => item.state && item.sourceTime !== undefined && item.version !== undefined && item.confidence !== undefined) && value.missingImpact && !/保证|绝对/u.test(value.language) };
    }
    case "global-time-coordinate": {
      const value = await invoke(root, "platform", "normalizeObservationContext", { authoritative: { lat: 22.529, lon: 113.9468, system: "WGS84" }, timezone: "Asia/Shanghai", localStart: "2026-08-12T23:30:00+08:00", localEnd: "2026-08-13T03:30:00+08:00", mapSystem: "GCJ-02" });
      return { passes: value.storage.coordinateSystem === "WGS84" && value.astronomy.coordinateSystem === "WGS84" && value.storage.startUtc.endsWith("Z") && value.storage.endUtc.endsWith("Z") && value.display.timezone === "Asia/Shanghai" && value.map.coordinateSystem === "GCJ-02" && value.authoritativeUnchanged === true };
    }
    case "global-permission-denial": {
      const value = await invoke(root, "platform", "resolvePermissionFallbacks", { preciseLocation: "denied", backgroundLocation: "denied", camera: "denied", notifications: "denied" });
      return { passes: value.manualLocation && value.staticSky && value.foregroundTimer && value.localSettings && value.repeatPrompts === false && value.transmittedPreciseLocation === false };
    }
    case "global-offline-recovery": {
      const value = await invoke(root, "fieldOffline", "recoverOfflineQueue", { saved: [{ id: "write-1", idempotencyKey: "idem-1", state: "pending" }, { id: "write-1-copy", idempotencyKey: "idem-1", state: "pending" }], network: "restored" });
      return { passes: value.restoredDrafts === 2 && value.uploads?.length === 1 && value.uploads[0].idempotencyKey === "idem-1" && value.conflictsVisible === true && value.dataLoss === false };
    }
    case "global-accessible-mode": {
      const value = await invoke(root, "interaction", "resolveAccessibilityVariant", { reducedMotion: true, screenReader: true, fontScale: 2, haptics: false, viewport: { width: 320, height: 700 }, theme: "red-light", state: "error" });
      return { passes: value.minimumTargetPx >= 44 && value.contentOverlap === false && value.focusOrderValid === true && value.stateUsesText === true && value.brightnessSpike === false };
    }
    case "global-conflict-recovery": {
      const value = await invoke(root, "platform", "resolveVersionConflict", { original: { revision: 7, spotId: "a" }, saved: { revision: 8, spotId: "b" }, incoming: { revision: 8, spotId: "c" }, retryKey: "retry-1" });
      return { passes: value.status === "conflict" && value.original.revision === 7 && value.saved.revision === 8 && value.incoming.revision === 8 && value.preview && value.recoveryPoint && value.duplicateWrite === false };
    }
    case "global-release-scope": {
      const value = await invoke(root, "platform", "classifyReleaseScope", { proposals: ["mvp-decision-loop", "v3-ar", "mini-program-share"] });
      return { passes: value.requiredNow.includes("mvp-decision-loop") && value.deferrable.includes("v3-ar") && value.deferrable.includes("mini-program-share") && value.finalProduct === "react-native-ios-android" };
    }
    case "guard-product-kind": {
      const boundary = await platformBoundary(root);
      return { passes: boundary.productPurpose === "stargazing-decision-and-field-execution" && boundary.primaryProduct === "react-native-ios-android" };
    }
    case "guard-native-primary": {
      const boundary = await platformBoundary(root);
      return { passes: boundary.primaryProduct === "react-native-ios-android" && boundary.auxiliaryPlatforms?.find((item) => item.id === "pwa")?.canSatisfyFinalGate === false };
    }
    case "guard-mini-program-scope": {
      const boundary = await platformBoundary(root);
      const mini = boundary.auxiliaryPlatforms?.find((item) => item.id === "mini-program");
      return { passes: mini?.canSatisfyFinalGate === false && hasAll(mini.allowedCapabilities ?? [], ["share", "light-query", "invite"]) && !mini.allowedCapabilities.includes("professional-suite") };
    }
    case "guard-mvp-social-scope": {
      const boundary = await platformBoundary(root);
      return { passes: hasAll(boundary.mvpExcludedCapabilities ?? [], ["general-feed", "followers", "direct-messages"]) };
    }
    case "guard-mvp-professional-scope": {
      const boundary = await platformBoundary(root);
      return { passes: hasAll(boundary.mvpExcludedCapabilities ?? [], ["full-navigation", "full-ar", "precision-composition", "device-control"]) };
    }
    case "guard-client-source-stitching":
      return { passes: await providerStitchingAbsent(root) };
    case "guard-explainable-score": {
      const value = await invoke(root, "scoring", "buildNightReport", { recommendation: { total: 82, factors: { sky: 90, weather: 80, access: 70, safety: 100, preference: 75 }, blockers: [], confidence: 0.78 }, window: { start: "2026-08-12T14:00:00Z", end: "2026-08-12T17:00:00Z" }, provenance: [{ source: "weather", version: "7" }] });
      return { passes: value.summary && value.window && Object.keys(value.factorBreakdown ?? {}).length === 5 && Array.isArray(value.blockers) && value.confidence && value.provenance?.length > 0 };
    }
    case "guard-truthful-data":
      return { passes: await truthfulCopy(root) };
    case "guard-provider-selection": {
      const value = await invoke(root, "platform", "selectQualifiedProvider", { candidates: [{ id: "free", passedGates: ["provenance"], tco12Month: { totalCny: 0 } }, { id: "qualified-low", passedGates: ["provenance", "quality", "stability", "commercial-license", "safe-degradation"], tco12Month: { totalCny: 1200 } }, { id: "qualified-high", passedGates: ["provenance", "quality", "stability", "commercial-license", "safe-degradation"], tco12Month: { totalCny: 2600 } }] });
      return { passes: value.providerId === "qualified-low" && value.basis === "qualified-lowest-12m-tco" };
    }
    case "guard-ai-exposure": {
      const value = await invoke(root, "shooting", "explainExposurePlan", { deterministic: { iso: 1600, seconds: 10, aperture: 2.8, ruleVersion: "mobile-v2" }, aiSuggestion: { iso: 12800, seconds: 60, aperture: 1.2 } });
      return { passes: value.settings.iso === 1600 && value.settings.seconds === 10 && value.settings.aperture === 2.8 && value.ruleVersion === "mobile-v2" && value.aiRole === "explanation-only" };
    }
    case "guard-ar-fallback": {
      const value = await invoke(root, "sky", "resolveSkyCapability", { arSupported: false, cameraGranted: false, sensors: "low-accuracy" });
      return { passes: value.primaryMode === "universal-sky" && asArray(value.availableFallbacks).includes("static-sky") && value.blocked === false };
    }
    case "guard-field-offline": {
      const value = await invoke(root, "fieldOffline", "restoreOfflineFieldState", { network: "offline", pack: { checksumValid: true, plan: { id: "p1" }, route: { id: "r1" }, toolbox: ["timer", "compass"] } });
      return { passes: value.usable === true && value.plan.id === "p1" && value.route.id === "r1" && hasAll(value.toolbox, ["timer", "compass"]) };
    }
    case "guard-runtime-completion":
      return { passes: await nativeAppShapeHealthy(root) && await exists(root, "tests/acceptance", "directory") && await exists(root, "apps/api", "directory") };
    case "tonight-hard-safety": {
      const value = await invoke(root, "scoring", "evaluateRecommendation", { candidates: [{ id: "closed-dark", sky: 99, weather: 90, access: 70, safety: 0, preference: 95, roadClosure: "confirmed" }, { id: "safe", sky: 75, weather: 75, access: 75, safety: 90, preference: 70 }], profile: "milky-way" });
      return { passes: value.primaryId === "safe" && value.candidates.find((item) => item.id === "closed-dark")?.status === "blocked" };
    }
    case "tonight-profile-ranking": {
      const candidates = [{ id: "near", sky: 55, weather: 80, access: 95, safety: 95, preference: 70, facilities: true }, { id: "dark", sky: 96, weather: 82, access: 45, safety: 90, preference: 95, facilities: false }];
      const family = await invoke(root, "scoring", "evaluateRecommendation", { candidates, profile: "family" });
      const galaxy = await invoke(root, "scoring", "evaluateRecommendation", { candidates, profile: "milky-way" });
      return { passes: family.primaryId === "near" && galaxy.primaryId === "dark" && [family, galaxy].every((item) => item.candidates.every((candidate) => Object.keys(candidate.factors ?? {}).length === 5 && candidate.safetyBlocked !== undefined)) };
    }
    case "tonight-continuous-window": {
      const value = await invoke(root, "scoring", "selectContinuousWindow", { cadenceMinutes: 30, samples: [{ at: "2026-08-12T12:00:00Z", eligible: true }, { at: "2026-08-12T12:30:00Z", eligible: true }, { at: "2026-08-12T13:00:00Z", eligible: true }, { at: "2026-08-12T13:30:00Z", eligible: false }] });
      return { passes: value.start === "2026-08-12T12:00:00Z" && value.end === "2026-08-12T13:30:00Z" && value.cadenceMinutes === 30 && value.sampleCount === 3 };
    }
    case "tonight-learning-boundary": {
      const value = await invoke(root, "scoring", "evaluateRecommendation", { candidates: [{ id: "closed", sky: 99, weather: 99, access: 90, safety: 0, preference: 99, roadClosure: "confirmed" }, { id: "safe", sky: 60, weather: 60, access: 60, safety: 90, preference: 60 }], profile: "milky-way", learning: { modelVersion: "rank-4", scores: { closed: 1, safe: 0 } } });
      return { passes: value.primaryId === "safe" && value.candidates.find((item) => item.id === "closed")?.status === "blocked" && value.learning?.modelVersion === "rank-4" && value.learning?.overrodeSafety === false };
    }
    case "tonight-score-only-violation": {
      const value = await invoke(root, "scoring", "buildNightReport", { recommendation: { total: 82, factors: { sky: 90, weather: 80, access: 70, safety: 100, preference: 75 }, blockers: [], confidence: 0.78 }, window: { start: "2026-08-12T14:00:00Z", end: "2026-08-12T17:00:00Z" }, provenance: [{ source: "weather", version: "7" }] });
      return { passes: Boolean(value.summary && value.window && value.reasons?.length && value.factorBreakdown && value.provenance?.length) && await providerStitchingAbsent(root) };
    }
    default:
      throw new Error(`unknown_structured_probe:${probeName}`);
  }
}
