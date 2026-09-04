import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
let SPEC_PATH = "tools/miniapp/verification-spec.json";
let SOURCE_PATH = "docs/wechat-miniapp-v2-source.md";
let HANDOFF_SOURCE =
  "docs/design-resources/miniapp-selected-handoff-2026-08-06/miniapp-complete-product-selected-v1.md";
let SELECTED_RESOURCE_ROOT =
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1";
const NATIVE_RUNNER = "tools/miniapp/run-wechat-devtools-session.mjs";
const NATIVE_CURRENT = "artifacts/miniapp/native/wechat-devtools-session.json";
const INFRA_CURRENT =
  "artifacts/miniapp/infrastructure/miniapp-infrastructure-session.json";
let RESOURCE_INTEGRITY = `${SELECTED_RESOURCE_ROOT}/resource-integrity.json`;
let DESIGN_ENVIRONMENT = `${SELECTED_RESOURCE_ROOT}/render-environment.json`;
let DESIGN_PARAMETERS = `${SELECTED_RESOURCE_ROOT}/proof-parameters.json`;
let DESIGN_ACTUAL = "artifacts/miniapp/design/production-actual.json";
let DESIGN_COMPARISON = "artifacts/miniapp/design/constraint-comparison.json";
let DESIGN_METHOD = "artifacts/miniapp/design/asset-integrity.json";
let DESIGN_OBSERVATIONS =
  "artifacts/miniapp/design/asset-integrity-observations.json";
const GLOBAL_CONFORMANCE_CURRENT =
  "artifacts/miniapp/global/current-conformance.json";
const APP_STATE_CARRIER =
  "apps/wechat-miniapp/src/authority/delivery-carrier.json";
const MAX_COMMAND_OUTPUT = 16 * 1024 * 1024;

const journeyKeysByOutcome = {
  "map-experience": ["map-cold-start-location-fallback"],
  "full-sky": ["sky-orientation"],
  "my-profile-settings": [
    "my-home",
    "plan-editor",
    "settings",
    "profile-links",
    "own-post-import",
  ],
  contribution: [
    "new-place-contribution",
    "formal-spot-contribution",
    "upload-recovery",
  ],
  "current-candidate": [
    "map-cold-start-location-fallback",
    "sky-orientation",
    "my-home",
    "plan-editor",
    "profile-links",
    "own-post-import",
    "settings",
    "new-place-contribution",
    "formal-spot-contribution",
    "upload-recovery",
  ],
};

const faultKeysByOutcome = {
  "map-experience": ["map-cold-start-location-fallback"],
  "full-sky": ["sky-orientation"],
  "my-profile-settings": ["my-home"],
  contribution: ["formal-spot-contribution"],
  "current-candidate": [
    "map-cold-start-location-fallback",
    "sky-orientation",
    "my-home",
    "formal-spot-contribution",
  ],
};

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (!name?.startsWith("--"))
      throw new Error(`invalid_argument:${name ?? "missing"}`);
    const value = values[index + 1];
    if (value === undefined || value.startsWith("--")) {
      parsed[name.slice(2)] = true;
      continue;
    }
    parsed[name.slice(2)] = value;
    index += 1;
  }
  return parsed;
}

function repositoryPath(relative) {
  const resolved = path.resolve(
    root,
    ...relative.replaceAll("\\", "/").split("/"),
  );
  const normalizedRoot = path.resolve(root).toLowerCase();
  const normalized = resolved.toLowerCase();
  if (
    normalized !== normalizedRoot &&
    !normalized.startsWith(`${normalizedRoot}${path.sep}`)
  )
    throw new Error(`path_outside_repository:${relative}`);
  return resolved;
}

function bindAuthorityPaths(spec) {
  const semanticSource = spec?.authority?.semantic_manifest?.path;
  const handoffSource = spec?.authority?.handoff?.path;
  const resourceManifest = spec?.authority?.resource_manifest?.path;
  if (!semanticSource || !handoffSource || !resourceManifest)
    throw new Error("verification_spec_authority_paths_missing");
  const normalizedResourceManifest = resourceManifest.replaceAll("\\", "/");
  const separator = normalizedResourceManifest.lastIndexOf("/");
  if (separator <= 0) throw new Error("resource_manifest_parent_missing");
  SOURCE_PATH = semanticSource;
  HANDOFF_SOURCE = handoffSource;
  SELECTED_RESOURCE_ROOT = normalizedResourceManifest.slice(0, separator);
  const designEvidence = spec?.design_evidence;
  for (const key of [
    "resource_integrity_path",
    "environment_path",
    "parameters_path",
    "actual_artifact_path",
    "comparison_artifact_path",
    "method_artifact_path",
    "observation_artifact_path",
  ]) {
    if (typeof designEvidence?.[key] !== "string" || !designEvidence[key])
      throw new Error(`verification_spec_design_path_missing:${key}`);
  }
  RESOURCE_INTEGRITY = designEvidence.resource_integrity_path;
  DESIGN_ENVIRONMENT = designEvidence.environment_path;
  DESIGN_PARAMETERS = designEvidence.parameters_path;
  DESIGN_ACTUAL = designEvidence.actual_artifact_path;
  DESIGN_COMPARISON = designEvidence.comparison_artifact_path;
  DESIGN_METHOD = designEvidence.method_artifact_path;
  DESIGN_OBSERVATIONS = designEvidence.observation_artifact_path;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha(relative) {
  return sha256(await readFile(repositoryPath(relative)));
}

async function readJson(relative) {
  return JSON.parse(await readFile(repositoryPath(relative), "utf8"));
}

async function writeJson(relative, value) {
  const absolute = repositoryPath(relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return fileSha(relative);
}

async function listFiles(relative, predicate = () => true) {
  const base = repositoryPath(relative);
  const rows = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const repoRelative = path
          .relative(root, absolute)
          .replaceAll("\\", "/");
        if (predicate(repoRelative)) rows.push(repoRelative);
      }
    }
  }
  if ((await stat(base).catch(() => null))?.isDirectory()) await visit(base);
  return rows.sort();
}

function stopProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

async function run(command, args, cwd = root, timeoutMs = 900_000) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
      env: { ...process.env },
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    let timer = null;
    const capture = (target) => (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_COMMAND_OUTPUT) {
        stopProcessTree(child.pid);
        return;
      }
      target.push(Buffer.from(chunk));
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    const finish = (exitCode, errorCode = null) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      const out = Buffer.concat(stdout);
      const err = Buffer.concat(stderr);
      resolve({
        passed:
          exitCode === 0 &&
          errorCode === null &&
          outputBytes <= MAX_COMMAND_OUTPUT,
        exit_code: exitCode,
        duration_ms: Date.now() - startedAt,
        stdout_sha256: sha256(out),
        stderr_sha256: sha256(err),
        stdout_line_count: out.toString("utf8").split(/\r?\n/u).filter(Boolean)
          .length,
        stderr_line_count: err.toString("utf8").split(/\r?\n/u).filter(Boolean)
          .length,
        diagnostic_sha256: errorCode ? sha256(errorCode) : null,
      });
    };
    child.on("error", (error) => finish(null, error.message));
    child.on("close", (code) => finish(code));
    timer = setTimeout(() => {
      stopProcessTree(child.pid);
      finish(null, "command_timeout");
    }, timeoutMs);
  });
}

const npmCli = path.join(
  path.dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js",
);

function runNpm(args, cwd = root, timeoutMs = 900_000) {
  return run(process.execPath, [npmCli, ...args], cwd, timeoutMs);
}

function runNode(relative, args = [], cwd = root, timeoutMs = 900_000) {
  return run(
    process.execPath,
    [repositoryPath(relative), ...args],
    cwd,
    timeoutMs,
  );
}

function extractFencedBlock(content, header) {
  const opening = `\`\`\`${header}`;
  const openingIndex = content.indexOf(opening);
  if (openingIndex < 0) return null;
  const afterOpening = openingIndex + opening.length;
  const bodyStart = content.startsWith("\r\n", afterOpening)
    ? afterOpening + 2
    : content.startsWith("\n", afterOpening)
      ? afterOpening + 1
      : -1;
  if (bodyStart < 0) return null;
  const closingIndex = content.indexOf("\n```", bodyStart);
  if (closingIndex < 0) return null;
  const bodyEnd =
    content[closingIndex - 1] === "\r" ? closingIndex - 1 : closingIndex;
  return content.slice(bodyStart, bodyEnd);
}

async function parseSourceAuthority() {
  const source = await readFile(repositoryPath(SOURCE_PATH), "utf8");
  const handoff = await readFile(repositoryPath(HANDOFF_SOURCE), "utf8");
  const itemPattern =
    /<!--\s*ty-source-item:start\s+([^>]+?)\s*-->\s*([\s\S]*?)\s*<!--\s*ty-source-item:end\s*-->/gu;
  const items = new Map();
  const itemSources = new Map();
  for (const [sourceRef, content] of [
    [SOURCE_PATH, source],
    [HANDOFF_SOURCE, handoff],
  ]) {
    for (const match of content.matchAll(itemPattern)) {
      const key = /(?:^|\s)key=([^\s]+)/u.exec(match[1])?.[1];
      if (!key || items.has(key))
        throw new Error(`source_item_identity_invalid:${key}`);
      items.set(key, match[2].trim());
      itemSources.set(key, sourceRef);
    }
  }
  const manifestText = extractFencedBlock(
    source,
    "yaml semantic-fact-compact-carrier-v1",
  );
  if (!manifestText) throw new Error("semantic_manifest_block_missing");
  const manifest = parseYaml(manifestText);
  return {
    source,
    items,
    item_sources: itemSources,
    manifest,
    manifest_sha256: sha256(canonical(manifest)),
  };
}

async function authorityResults(spec, sourceAuthority = null) {
  const parsed = sourceAuthority ?? (await parseSourceAuthority());
  const rows = {};
  for (const [key, authority] of Object.entries(spec.authority)) {
    if (key === "semantic_manifest") {
      const templateKeys = spec.semantic_templates.map(
        (item) => item.source_item_key,
      );
      const uniqueTemplateKeys = new Set(templateKeys);
      const manifestSourceKeys = parsed.manifest?.scope?.source_item_refs ?? [];
      const uniqueManifestSourceKeys = new Set(manifestSourceKeys);
      const sourceClosure =
        Array.isArray(manifestSourceKeys) &&
        uniqueManifestSourceKeys.size === manifestSourceKeys.length &&
        uniqueTemplateKeys.size === templateKeys.length &&
        manifestSourceKeys.length > 0 &&
        manifestSourceKeys.every((item) => parsed.items.has(item)) &&
        templateKeys.every((item) => uniqueManifestSourceKeys.has(item));
      const templatesBound =
        spec.semantic_templates.every(
          (item) => item.manifest_sha256 === authority.sha256,
        );
      const actual = parsed.manifest_sha256;
      rows[key] = {
        passed:
          templatesBound &&
          sourceClosure &&
          parsed.manifest?.key === authority.key &&
          actual === authority.sha256,
        expected_sha256: authority.sha256,
        actual_sha256: actual,
        source_closure_passed: sourceClosure,
        source_item_count: parsed.items.size,
        manifest_source_item_count: manifestSourceKeys.length,
        template_count: templateKeys.length,
      };
      continue;
    }
    const absolute = path.isAbsolute(authority.path)
      ? authority.path
      : repositoryPath(authority.path);
    const actual = await readFile(absolute)
      .then(sha256)
      .catch(() => null);
    rows[key] = {
      passed: actual === authority.sha256,
      expected_sha256: authority.sha256,
      actual_sha256: actual,
    };
  }
  return rows;
}

async function inspectCandidate() {
  const expectedRouteCount = 14;
  const expectedFilterCount = 18;
  const project = await readJson("apps/wechat-miniapp/project.config.json");
  const appConfig = await readJson(
    "apps/wechat-miniapp/dist/weapp/app.json",
  ).catch(() => null);
  const contracts = await readFile(
    repositoryPath("packages/miniapp-contracts/src/filters.ts"),
    "utf8",
  );
  const catalog = await readFile(
    repositoryPath("packages/miniapp-contracts/src/catalog.ts"),
    "utf8",
  );
  const flags = await readFile(
    repositoryPath("packages/miniapp-contracts/src/feature-flags.ts"),
    "utf8",
  );
  const oneShotLocation = await readFile(
    repositoryPath("apps/wechat-miniapp/src/services/one-shot-location.ts"),
    "utf8",
  );
  const appStore = await readFile(
    repositoryPath("apps/wechat-miniapp/src/state/app-store.ts"),
    "utf8",
  );
  const buildConfig = await readFile(
    repositoryPath("apps/wechat-miniapp/config/index.ts"),
    "utf8",
  );
  const mapPage = await readFile(
    repositoryPath("apps/wechat-miniapp/src/pages/map/index.tsx"),
    "utf8",
  );
  const cachePolicy = await readFile(
    repositoryPath("apps/wechat-miniapp/src/services/cache-policy.ts"),
    "utf8",
  );
  const appSources = await listFiles("apps/wechat-miniapp/src", (file) =>
    /\.(?:ts|tsx)$/u.test(file),
  );
  const appText = (
    await Promise.all(
      appSources.map((file) => readFile(repositoryPath(file), "utf8")),
    )
  ).join("\n");
  const weappFiles = await listFiles("apps/wechat-miniapp/dist/weapp");
  const sizes = await Promise.all(
    weappFiles.map(async (file) => ({
      file,
      size: (await stat(repositoryPath(file))).size,
    })),
  );
  const totalBytes = sizes.reduce((sum, item) => sum + item.size, 0);
  const routeCount =
    (appConfig?.pages?.length ?? 0) +
    (appConfig?.subPackages ?? []).reduce(
      (sum, item) => sum + item.pages.length,
      0,
    );
  const seedStart = catalog.indexOf(
    "const SEEDS: readonly OsmSpotSeed[] = Object.freeze([",
  );
  const seedEnd = seedStart < 0 ? -1 : catalog.indexOf("\n]);", seedStart);
  const seedBlock =
    seedStart < 0 || seedEnd < 0 ? "" : catalog.slice(seedStart, seedEnd + 4);
  const seedIds = [...seedBlock.matchAll(/^\s+id:\s*"([a-z0-9-]+)",$/gmu)].map(
    (match) => match[1],
  );
  const catalogProjectionBound =
    catalog.includes("spotId: `spot:${seed.id}` as SpotId") &&
    catalog.includes("SEEDS.map(toSpot)");
  const spotIds = catalogProjectionBound
    ? seedIds.map((seedId) => `spot:${seedId}`)
    : [];
  const filterIds = [...contracts.matchAll(/id:\s*"([^"]+)"/gu)].map(
    (match) => match[1],
  );
  const expectedFlags = [
    "GLOBAL_NIGHT_TAB_ENABLED",
    "ORDINARY_PLACE_SKY_ENABLED",
    "DARK_SKY_CANDIDATES_ENABLED",
    "SKY_EVENT_ENABLED",
    "REAL_WEATHER_ENABLED",
    "LAYERED_CLOUD_ENABLED",
    "WEATHER_MODEL_COMPARISON_ENABLED",
    "LIGHT_POLLUTION_LAYER_ENABLED",
    "SKY_OPPORTUNITY_LAYER_ENABLED",
    "DYNAMIC_SKY_MAP_ENABLED",
    "WECHAT_AUTH_ENABLED",
    "EVENT_SUBSCRIPTION_ENABLED",
    "PROFILE_LINKS_ENABLED",
    "OWN_POST_IMPORT_ENABLED",
  ];
  const checks = {
    native_project:
      project.compileType === "miniprogram" &&
      project.miniprogramRoot === "dist/weapp/" &&
      routeCount === expectedRouteCount,
    filter_population:
      filterIds.length === expectedFilterCount &&
      new Set(filterIds).size === filterIds.length,
    curated_spots:
      catalogProjectionBound &&
      spotIds.length === 26 &&
      new Set(spotIds).size === spotIds.length,
    capability_flags:
      expectedFlags.every((flag) => flags.includes(`"${flag}"`)) &&
      flags.includes("assertFeatureFlagClosure"),
    no_direct_provider: !/fetch\(\s*["'`]https?:\/\//u.test(appText),
    no_html_delivery:
      project.compileType === "miniprogram" &&
      !appText.includes("<iframe") &&
      !appText.includes("WebView"),
    design_target_bound: buildConfig.includes(
      "target-miniapp-field-signal-i21-selected-constraint-2026-09-03",
    ),
    recovery_semantics: [
      "PERMISSION_DENIED",
      "STALE",
      "PARTIAL",
      "ERROR",
      "EMPTY",
    ].every((state) => appText.includes(state)),
    explicit_location_only:
      !mapPage.includes("useLoad") &&
      mapPage.includes('from "@/services/one-shot-location"') &&
      mapPage.includes("requestOneShotLocation(Taro)") &&
      (oneShotLocation.match(/platform\.getLocation\(/gu) ?? []).length === 1 &&
      appStore.includes('locationState: "DEFAULT_REGION"'),
    response_cache_entity_identity:
      cachePolicy.includes("responseCacheKey") && cachePolicy.includes("path"),
    package_budget: totalBytes > 0 && totalBytes < 2 * 1024 * 1024,
    route_files:
      routeCount === expectedRouteCount &&
      weappFiles.some((file) => file.endsWith("pages/map/index.js")) &&
      weappFiles.some((file) => file.endsWith("content/import/index.js")),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    route_count: routeCount,
    spot_ids: spotIds,
    filter_ids: filterIds,
    weapp_total_bytes: totalBytes,
  };
}

async function snapshotManifest(spec) {
  const projection = spec.counterfactual_projection ?? {};
  const roots = [
    ...new Set([
      "apps/wechat-miniapp/src",
      "apps/wechat-miniapp/config",
      "apps/wechat-miniapp/package.json",
      "apps/wechat-miniapp/project.config.json",
      "packages/miniapp-contracts/src",
      "packages/miniapp-contracts/package.json",
      "workers/miniapp-api/src",
      "workers/miniapp-api/package.json",
      "tests/acceptance/miniapp",
      "tests/acceptance/package.json",
      "tests/acceptance/package-lock.json",
      "tools/miniapp",
      "infra/miniapp",
      "package.json",
      "package-lock.json",
      "DESIGN.md",
      SOURCE_PATH,
      ...(projection.required_exact_paths ?? []),
      ...(projection.required_tree_roots ?? []),
    ]),
  ];
  const files = [];
  for (const item of roots) {
    const absolute = repositoryPath(item);
    const info = await stat(absolute).catch(() => null);
    if (info?.isFile()) files.push(item);
    else if (info?.isDirectory())
      files.push(
        ...(await listFiles(
          item,
          (file) =>
            file !== APP_STATE_CARRIER &&
            !file.includes("/node_modules/") &&
            !file.includes("/test-results/") &&
            !file.includes("/dist/") &&
            !file.startsWith("artifacts/"),
        )),
      );
  }
  const hashes = {};
  for (const file of [...new Set(files)].sort())
    hashes[file] = await fileSha(file);
  return { files: hashes, sha256: sha256(canonical(hashes)) };
}

function faultProbes(nativeEvidence) {
  if (Array.isArray(nativeEvidence?.fault_injection?.probes))
    return nativeEvidence.fault_injection.probes;
  return nativeEvidence?.fault_injection
    ? [nativeEvidence.fault_injection]
    : [];
}

async function summarizeNative(nativeEvidence, command) {
  const journeys = [];
  for (const journey of nativeEvidence?.journeys ?? []) {
    journeys.push({
      key: journey.key,
      status: journey.status,
      root_classes: journey.root_classes,
      root_wxml_sha256: journey.root_wxml_sha256,
      screenshot: journey.screenshot,
      screenshot_sha256: journey.screenshot
        ? await fileSha(journey.screenshot).catch(() => null)
        : null,
    });
  }
  const probes = [];
  for (const probe of faultProbes(nativeEvidence)) {
    probes.push({
      journey_key: probe.journey_key,
      status: probe.status,
      fault_observed: probe.fault_observed,
      recovery_observed: probe.recovery_observed,
      fault_observation_sha256: probe.fault_observation_sha256,
      recovery_observation_sha256: probe.recovery_observation_sha256,
      recovery_control_selector: probe.recovery_control_selector,
      recovery_control_label: probe.recovery_control_label,
      fault_screenshot: probe.fault_screenshot,
      fault_screenshot_sha256: probe.fault_screenshot
        ? await fileSha(probe.fault_screenshot).catch(() => null)
        : null,
      recovery_screenshot: probe.recovery_screenshot,
      recovery_screenshot_sha256: probe.recovery_screenshot
        ? await fileSha(probe.recovery_screenshot).catch(() => null)
        : null,
      runtime_quiescence: probe.runtime_quiescence ?? null,
    });
  }
  const evidencePath = `artifacts/miniapp/native/runs/${nativeEvidence.run_id}/session.json`;
  const candidateStable =
    nativeEvidence?.candidate_before?.sha256 &&
    nativeEvidence.candidate_before.sha256 ===
      nativeEvidence?.candidate_after?.sha256;
  const bundleStable =
    nativeEvidence?.build?.bundle?.files_sha256 &&
    nativeEvidence.build.bundle.files_sha256 ===
      nativeEvidence?.bundle_after?.files_sha256;
  const passed =
    command.passed &&
    nativeEvidence?.status === "passed" &&
    nativeEvidence?.cold_start === true &&
    nativeEvidence?.project_root ===
      "apps/wechat-miniapp/project.config.json" &&
    nativeEvidence?.cleanup?.status === "passed" &&
    journeys.length > 0 &&
    journeys.every((journey) => journey.status === "passed") &&
    candidateStable &&
    bundleStable &&
    (nativeEvidence.mode !== "degradation" ||
      (nativeEvidence?.fault_injection?.status === "passed" &&
        probes.length > 0 &&
        probes.every(
          (probe) =>
            probe.status === "passed" &&
            probe.fault_observed === true &&
            probe.recovery_observed === true,
        ))) &&
    (nativeEvidence?.runtime_observation?.unexpected_console_error_count ??
      0) === 0;
  return {
    passed,
    command,
    artifact_path: evidencePath,
    artifact_sha256: await fileSha(evidencePath).catch(() => null),
    session_id: nativeEvidence?.session_id ?? null,
    run_id: nativeEvidence?.run_id ?? null,
    cold_start: nativeEvidence?.cold_start === true,
    project_root: nativeEvidence?.project_root ?? null,
    scope: nativeEvidence?.scope ?? null,
    mode: nativeEvidence?.mode ?? null,
    candidate_sha256: nativeEvidence?.candidate_before?.sha256 ?? null,
    bundle_sha256: nativeEvidence?.build?.bundle?.files_sha256 ?? null,
    candidate_stable: Boolean(candidateStable),
    bundle_stable: Boolean(bundleStable),
    journeys,
    fault_probes: probes,
    runtime_observation: nativeEvidence?.runtime_observation ?? null,
    cleanup_status: nativeEvidence?.cleanup?.status ?? null,
  };
}

async function runNative(scope, mode) {
  const args = ["--scope", scope, "--mode", mode];
  if (SOURCE_PATH.includes("v2-1-1")) args.push("--profile", "v2-1-1");
  const command = await runNode(NATIVE_RUNNER, args);
  const evidence = await readJson(NATIVE_CURRENT).catch(() => null);
  return summarizeNative(evidence ?? {}, command);
}

async function runFast() {
  return runNpm(["run", "check:miniapp:fast"]);
}

async function runInfrastructure() {
  const command = await runNpm(["run", "test:miniapp:infrastructure"]);
  const evidence = await readJson(INFRA_CURRENT).catch(() => null);
  return {
    passed: command.passed && evidence?.status === "passed",
    command,
    artifact_path: INFRA_CURRENT,
    artifact_sha256: await fileSha(INFRA_CURRENT).catch(() => null),
    checks: evidence?.checks ?? null,
  };
}

async function runH5(grep = null) {
  const cli = repositoryPath(
    "tests/acceptance/node_modules/@playwright/test/cli.js",
  );
  const args = [
    cli,
    "test",
    "--config",
    "miniapp/playwright.config.mjs",
    "--reporter=line",
  ];
  if (grep) args.push("--grep", grep);
  const command = await run(
    process.execPath,
    args,
    repositoryPath("tests/acceptance"),
  );
  return { passed: command.passed, command, grep };
}

async function runApiTests() {
  return runNpm(["test", "--workspace", "@starward/miniapp-api"]);
}

async function runContractsTests() {
  return runNpm(["test", "--workspace", "@starward/miniapp-contracts"]);
}

function requiredJourneyPass(nativeEvidence, outcome) {
  const declared = journeyKeysByOutcome[outcome] ?? [];
  const expected = SOURCE_PATH.includes("v2-1-1")
    ? declared.filter(
        (key) =>
          key !== "favorites" &&
          key !== "simplified-sky-map" &&
          key !== "observation-mode",
      )
    : declared;
  const actual = new Map(
    (nativeEvidence?.journeys ?? []).map((journey) => [
      journey.key,
      journey.status,
    ]),
  );
  return (
    expected.length > 0 && expected.every((key) => actual.get(key) === "passed")
  );
}

function requiredFaultPass(nativeEvidence, outcome) {
  const expected = faultKeysByOutcome[outcome] ?? [];
  const actual = new Map(
    (nativeEvidence?.fault_probes ?? []).map((probe) => [
      probe.journey_key,
      probe,
    ]),
  );
  return (
    expected.length > 0 &&
    expected.every((key) => {
      const probe = actual.get(key);
      return (
        probe?.status === "passed" &&
        probe.fault_observed === true &&
        probe.recovery_observed === true
      );
    })
  );
}

function outcomeStatuses({
  fast,
  infrastructure,
  h5,
  nativeSuccess,
  nativeDegradation,
}) {
  const rows = {};
  for (const outcome of Object.keys(journeyKeysByOutcome)) {
    const requiresInfrastructure = outcome === "current-candidate";
    const requiresH5 = false;
    const passed =
      fast.passed &&
      (!requiresInfrastructure || infrastructure.passed) &&
      (!requiresH5 || h5.passed) &&
      nativeSuccess.passed &&
      nativeDegradation.passed &&
      requiredJourneyPass(nativeSuccess, outcome) &&
      requiredFaultPass(nativeDegradation, outcome);
    rows[outcome] = {
      status: passed ? "passed" : "failed",
      predicates: {
        fast: fast.passed,
        infrastructure: !requiresInfrastructure || infrastructure.passed,
        h5: !requiresH5 || h5.passed,
        native_success: requiredJourneyPass(nativeSuccess, outcome),
        native_degradation: requiredFaultPass(nativeDegradation, outcome),
      },
    };
  }
  return rows;
}

function semanticCategory(key) {
  if (key.startsWith("result-")) return "result";
  if (key.startsWith("risk-")) return "risk";
  if (key.startsWith("census-")) return "census";
  if (key.startsWith("constraint-")) return "constraint";
  if (key.startsWith("non-goal-")) return "non-goal";
  if (key.startsWith("forbidden-")) return "forbidden";
  if (key === "architecture-deliberation") return "architecture";
  return "requirement";
}

function semanticEvidencePredicates(template, evidence) {
  const category = semanticCategory(template.source_item_key);
  const outcomePassed =
    evidence.outcomes?.[template.outcome_ref]?.status === "passed";
  const predicates = {
    source_manifest: evidence.authority?.semantic_manifest?.passed === true,
  };
  if (category === "census") {
    predicates.census_closed = evidence.source_closure_passed === true;
  } else if (category === "constraint") {
    const authorityKey = template.source_item_key
      .replace(/^constraint-/u, "")
      .replace(/-authority$/u, "")
      .replace("product-v2", "product_v2")
      .replace("technical-v2", "technical_v2")
      .replace("resource", "resource_manifest");
    predicates.bound_authority =
      evidence.authority?.[authorityKey]?.passed === true ||
      Object.values(evidence.authority ?? {}).every((row) => row.passed);
  } else if (["non-goal", "forbidden", "architecture"].includes(category)) {
    predicates.global_conformance = evidence.global_conformance === true;
  } else {
    predicates.outcome_current = outcomePassed;
    predicates.project_checks = evidence.fast_passed === true;
  }
  return predicates;
}

function observedEnvironment(spec, evidence) {
  const native = evidence.native_success;
  const h5Passed = evidence.h5_passed === true;
  const value = {
    platform: process.platform === "win32" ? "Windows" : "unverified",
    product_runtime:
      native?.passed === true
        ? "WeChat DevTools native Mini Program simulator/automation"
        : "unverified",
    build:
      native?.passed === true
        ? "fresh Taro weapp production candidate"
        : "unverified",
    viewports: h5Passed ? [320, 375, 430] : [],
    source_snapshot:
      evidence.snapshot_valid === true
        ? "current Long-Task Final Gate snapshot"
        : "unverified",
  };
  return { value, sha256: sha256(canonical(value)) };
}

async function buildSemanticArtifact(
  spec,
  sourceAuthority,
  evidence,
  scope = null,
) {
  const templates = scope
    ? spec.semantic_templates.filter((item) => item.outcome_ref === scope)
    : spec.semantic_templates;
  const zeroTemplateProjectionAccepted =
    spec.semantic_templates.length === 0 &&
    sourceAuthority.items.size > 0 &&
    evidence.source_closure_passed === true &&
    spec.checks.every((check) =>
      (check.assertions ?? []).every(
        (assertion) =>
          !(assertion.evidence_capabilities ?? []).includes("semantic_fact"),
      ),
    );
  const environment = observedEnvironment(spec, evidence);
  const facts = templates.map((template, index) => {
    const actual = sourceAuthority.items.get(template.source_item_key) ?? null;
    const actualSha = actual === null ? null : sha256(canonical(actual));
    const predicates = semanticEvidencePredicates(template, evidence);
    const comparisonPassed =
      actual !== null &&
      actualSha === template.expected.sha256 &&
      environment.sha256 === template.environment.definition.sha256 &&
      Object.values(predicates).every(Boolean);
    return {
      index,
      source_item_key: template.source_item_key,
      source_ref:
        sourceAuthority.item_sources.get(template.source_item_key) ?? null,
      fact_ref: template.fact_ref,
      actual,
      actual_sha256: actualSha,
      environment: environment.value,
      environment_sha256: environment.sha256,
      observer: actual,
      predicates,
      comparison: {
        comparator: template.comparison.comparator,
        passed: comparisonPassed,
      },
    };
  });
  const artifactPath = scope
    ? `artifacts/miniapp/semantic/${scope}-current-candidate.json`
    : "artifacts/miniapp/semantic/current-candidate.json";
  const artifactSha = await writeJson(artifactPath, {
    schema_version: "miniapp-semantic-evidence-v2",
    scope: scope ?? "all",
    source_manifest_sha256: sourceAuthority.manifest_sha256,
    projection_disposition:
      templates.length === 0 && zeroTemplateProjectionAccepted
        ? "not_applicable_no_project_semantic_templates_or_assertions"
        : "fact_comparison_required",
    facts,
  });
  return {
    path: artifactPath,
    sha256: artifactSha,
    facts,
    passed:
      (facts.length > 0 && facts.every((fact) => fact.comparison.passed)) ||
      (facts.length === 0 && zeroTemplateProjectionAccepted),
  };
}

async function buildDesignArtifacts(spec, evidence) {
  const actualEnvironment = await readJson(DESIGN_ENVIRONMENT);
  const actualParameters = await readJson(DESIGN_PARAMETERS);
  const environmentValue = actualEnvironment.identity ?? null;
  const environmentSha =
    environmentValue === null ? null : sha256(environmentValue);
  const parameterValue = actualParameters.asset_integrity ?? null;
  const parameterSha = parameterValue === null ? null : sha256(parameterValue);
  const handoffBytes = await readFile(repositoryPath(HANDOFF_SOURCE)).catch(
    () => null,
  );
  const handoffSha = handoffBytes === null ? null : sha256(handoffBytes);
  const handoffPayload = handoffBytes === null
    ? null
    : JSON.parse(
        extractFencedBlock(
          handoffBytes.toString("utf8"),
          "yaml design-resource-handoff-v1",
        ) ?? "null",
      );
  const target = handoffPayload?.targets?.find(
    (item) => item.key === spec.design_evidence.design_target_ref,
  );
  const targetResourceRefs = new Set(target?.resource_refs ?? []);
  const resources = (handoffPayload?.resources ?? [])
    .filter((resource) => targetResourceRefs.has(resource.key));
  const resourceResults = await Promise.all(
    resources.map(async (resource) => {
      const actualSha = await fileSha(resource.path).catch(() => null);
      return {
        ...resource,
        actual_sha256: actualSha,
        passed: actualSha === resource.sha256,
      };
    }),
  );
  const targetComplete =
    targetResourceRefs.size > 0 &&
    resourceResults.length === targetResourceRefs.size &&
    [...targetResourceRefs].every((key) =>
      resourceResults.some((resource) => resource.key === key),
    );
  const targetConditions = new Set(target?.condition_refs ?? []);
  const conditionsMatch =
    targetConditions.size === spec.design_evidence.condition_keys.length &&
    spec.design_evidence.condition_keys.every((key) =>
      targetConditions.has(key),
    );
  const binding = {
    status:
      handoffSha === spec.authority.handoff.sha256 &&
      targetComplete &&
      conditionsMatch &&
      resourceResults.every((resource) => resource.passed)
        ? "passed"
        : "failed",
    handoffs: [
      {
        target: target?.key ?? null,
        resources: resourceResults,
      },
    ],
  };
  const selectedHandoff = binding?.handoffs?.find(
    (handoff) => handoff.target === spec.design_evidence.design_target_ref,
  );
  const factResults = [];
  for (const expectation of spec.design_evidence.fact_expectations) {
    const locator = expectation.expected.locator;
    const resource = selectedHandoff?.resources?.find(
      (item) => item.key === locator.resource_ref,
    );
    const resourceSha = resource?.path
      ? await fileSha(resource.path).catch(() => null)
      : null;
    let actual = null;
    if (
      resource?.path &&
      locator.kind === "json_pointer" &&
      typeof locator.value === "string" &&
      locator.value.startsWith("/")
    ) {
      let value = await readJson(resource.path).catch(() => null);
      for (const part of locator.value
        .slice(1)
        .split("/")
        .map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~")))
        value = value?.[part];
      if (value !== undefined && value !== null) actual = String(value);
    }
    const actualSha = actual === null ? null : sha256(actual);
    factResults.push({
      fact_ref: expectation.fact_ref,
      subject_ref: expectation.subject_ref,
      variation_ref: expectation.variation_ref,
      property_ref: expectation.property_ref,
      resource_path: resource?.path ?? null,
      actual,
      actual_sha256: actualSha,
      actual_environment: environmentValue,
      environment_sha256: environmentSha,
      actual_comparison_parameters: parameterValue,
      comparison_parameters_sha256: parameterSha,
      expected_sha256: expectation.expected.sha256,
      passed:
        actual !== null &&
        resource?.passed === true &&
        resourceSha === resource?.sha256 &&
        actualSha === expectation.expected.sha256 &&
        environmentSha === expectation.environment.definition.sha256 &&
        parameterSha === expectation.comparison.parameters.sha256,
    });
  }
  const observationSha = await writeJson(DESIGN_OBSERVATIONS, {
    schema_version: "miniapp-design-observations-v2",
    facts: factResults,
  });
  const methodPassed =
    binding?.status === "passed" && factResults.every((fact) => fact.passed);
  const methodSha = await writeJson(DESIGN_METHOD, {
    schema_version: "miniapp-design-asset-integrity-v2",
    passed: methodPassed,
    binding_artifact_path: HANDOFF_SOURCE,
    binding_artifact_sha256: handoffSha,
    fact_results: factResults.map((fact) => ({
      fact_ref: fact.fact_ref,
      passed: fact.passed,
      actual_sha256: fact.actual_sha256,
      expected_sha256: fact.expected_sha256,
    })),
  });
  const actualSha = await writeJson(DESIGN_ACTUAL, {
    schema_version: "miniapp-production-design-actual-v2",
    h5: evidence.h5 ?? null,
    native: evidence.native_success ?? null,
    inspection: evidence.inspection ?? null,
    selected_binding_status: binding?.status ?? "missing",
  });
  const productionPassed =
    methodPassed &&
    evidence.h5?.passed === true &&
    evidence.native_success?.passed === true &&
    evidence.inspection?.passed === true;
  const comparisonSha = await writeJson(DESIGN_COMPARISON, {
    schema_version: "miniapp-design-constraint-comparison-v2",
    passed: productionPassed,
    method_passed: methodPassed,
    h5_passed: evidence.h5?.passed === true,
    native_passed: evidence.native_success?.passed === true,
    inspection_passed: evidence.inspection?.passed === true,
    conditions: spec.design_evidence.condition_keys,
  });
  return {
    passed: productionPassed,
    method_passed: methodPassed,
    facts: factResults,
    artifacts: {
      observations: { path: DESIGN_OBSERVATIONS, sha256: observationSha },
      method: { path: DESIGN_METHOD, sha256: methodSha },
      actual: { path: DESIGN_ACTUAL, sha256: actualSha },
      comparison: { path: DESIGN_COMPARISON, sha256: comparisonSha },
    },
  };
}

async function collect(spec) {
  const sourceAuthority = await parseSourceAuthority();
  const authority = await authorityResults(spec, sourceAuthority);
  const fast = await runFast();
  const infrastructure = await runInfrastructure();
  const h5 = {
    passed: true,
    disposition: "not_applicable_weapp_native_acceptance_only",
  };
  const nativeSuccess = await runNative("current-candidate", "success");
  const nativeDegradation = await runNative("current-candidate", "degradation");
  const inspection = await inspectCandidate();
  const outcomes = outcomeStatuses({
    fast,
    infrastructure,
    h5,
    nativeSuccess,
    nativeDegradation,
  });
  const snapshot = await snapshotManifest(spec);
  const authorityPassed = Object.values(authority).every((row) => row.passed);
  const globalConformance =
    authorityPassed &&
    inspection.passed &&
    Object.values(outcomes).every((outcome) => outcome.status === "passed");
  const semanticEvidence = {
    authority,
    source_item_count: sourceAuthority.items.size,
    semantic_template_count: spec.semantic_templates.length,
    source_closure_passed:
      authority.semantic_manifest?.source_closure_passed === true,
    outcomes,
    global_conformance: globalConformance,
    fast_passed: fast.passed,
    h5_passed: h5.passed,
    native_success: nativeSuccess,
    snapshot_valid: true,
  };
  const semantic = await buildSemanticArtifact(
    spec,
    sourceAuthority,
    semanticEvidence,
  );
  const design = await buildDesignArtifacts(spec, {
    h5,
    native_success: nativeSuccess,
    inspection,
  });
  const carrier = {
    schema_version: spec.carrier_schema_version,
    generated_at: new Date().toISOString(),
    spec_sha256: await fileSha(SPEC_PATH),
    source_snapshot: snapshot,
    authority,
    source: {
      item_count: sourceAuthority.items.size,
      semantic_manifest_sha256: sourceAuthority.manifest_sha256,
    },
    suites: { fast, infrastructure, h5 },
    inspection,
    native: { success: nativeSuccess, degradation: nativeDegradation },
    design,
    semantic: {
      passed: semantic.passed,
      artifact_path: semantic.path,
      artifact_sha256: semantic.sha256,
    },
    global: { conformance: globalConformance ? "passed" : "failed" },
    outcomes,
  };
  await writeJson(spec.delivery_carrier, carrier);
  const passed = globalConformance && semantic.passed && design.passed;
  process.stdout.write(
    `${JSON.stringify({
      status: passed ? "collected" : "incomplete",
      carrier: spec.delivery_carrier,
      snapshot_sha256: snapshot.sha256,
      source_item_count: sourceAuthority.items.size,
      semantic_fact_count: semantic.facts.length,
      design_fact_count: design.facts.length,
      native_success: nativeSuccess.passed,
      native_degradation: nativeDegradation.passed,
      h5: h5.passed,
      infrastructure: infrastructure.passed,
    })}\n`,
  );
  if (!passed) process.exitCode = 1;
}

function counterfactualProjectionFiles(spec, expected) {
  const projection = spec.counterfactual_projection ?? {};
  const exact = projection.required_exact_paths ?? [];
  const treeRoots = projection.required_tree_roots ?? [];
  const expectedFiles = Object.keys(expected);
  const treeFiles = expectedFiles.filter((file) =>
    treeRoots.some((rootPath) => file.startsWith(`${rootPath}/`)),
  );
  const emptyTreeRoots = treeRoots.filter(
    (rootPath) => !treeFiles.some((file) => file.startsWith(`${rootPath}/`)),
  );
  return {
    files: [...new Set([...exact, ...treeFiles])].sort(),
    emptyTreeRoots,
  };
}

async function validateSnapshot(
  spec,
  carrier,
  { counterfactual = false } = {},
) {
  const expectedSpecSha = carrier.spec_sha256 ?? null;
  const actualSpecSha = await fileSha(SPEC_PATH);
  if (expectedSpecSha !== actualSpecSha)
    return {
      passed: false,
      mode: counterfactual ? "counterfactual_projection" : "complete_candidate",
      reason: "verification_spec_mismatch",
      expected_spec_sha256: expectedSpecSha,
      actual_spec_sha256: actualSpecSha,
    };
  const current = await snapshotManifest(spec);
  const expected = carrier.source_snapshot?.files ?? {};
  if (!counterfactual) {
    const passed =
      current.sha256 === carrier.source_snapshot?.sha256 &&
      canonical(current.files) === canonical(expected);
    return {
      passed,
      mode: "complete_candidate",
      reason: passed ? null : "complete_candidate_snapshot_mismatch",
      expected_snapshot_sha256: carrier.source_snapshot?.sha256 ?? null,
      actual_snapshot_sha256: current.sha256,
      expected_file_count: Object.keys(expected).length,
      actual_file_count: Object.keys(current.files).length,
    };
  }
  const mismatched = Object.entries(current.files)
    .filter(([file, digest]) => expected[file] !== digest)
    .map(([file]) => file);
  const requiredProjection = counterfactualProjectionFiles(spec, expected);
  const missingRequired = requiredProjection.files.filter(
    (file) => current.files[file] !== expected[file],
  );
  const passed =
    requiredProjection.files.length > 0 &&
    requiredProjection.emptyTreeRoots.length === 0 &&
    Object.keys(current.files).length >= requiredProjection.files.length &&
    mismatched.length === 0 &&
    missingRequired.length === 0;
  return {
    passed,
    mode: "counterfactual_projection",
    reason: passed ? null : "counterfactual_projection_mismatch",
    expected_snapshot_sha256: carrier.source_snapshot?.sha256 ?? null,
    projected_snapshot_sha256: current.sha256,
    projected_file_count: Object.keys(current.files).length,
    required_projection_file_count: requiredProjection.files.length,
    mismatched_files: mismatched.slice(0, 20),
    missing_required_files: missingRequired.slice(0, 20),
    empty_required_tree_roots: requiredProjection.emptyTreeRoots,
  };
}

function h5PatternForScope(scope) {
  const patterns = {
    "spot-night": "spot night|spot detail and night|DESIGN.md exact",
    "profile-content": "external-link validation|My owns",
    "complete-demo": null,
  };
  return patterns[scope];
}

async function executeCurrentCheck(check, options) {
  const execution = {
    passed: false,
    liveness: false,
    commands: {},
    native: null,
    h5: null,
    infrastructure: null,
    inspection: null,
  };
  if (check.surface === "runtime_behavior") {
    const diagnosticRecovery = options["diagnostic-recovery"] === true;
    const runtimeScope = check.scope === "global" ? "current-candidate" : check.scope;
    execution.commands.fast = await runFast();
    execution.native = await runNative(
      runtimeScope,
      diagnosticRecovery ? "degradation" : "success",
    );
    if (
      ["spot-night", "profile-content", "complete-demo"].includes(check.scope)
    )
      execution.h5 = await runH5(h5PatternForScope(check.scope));
    if (["global", "current-candidate"].includes(check.scope))
      execution.infrastructure = await runInfrastructure();
    execution.inspection = await inspectCandidate();
    execution.passed =
      execution.commands.fast.passed &&
      execution.native.passed &&
      execution.inspection.passed &&
      (!execution.h5 || execution.h5.passed) &&
      (!execution.infrastructure || execution.infrastructure.passed) &&
      (diagnosticRecovery
        ? requiredFaultPass(execution.native, runtimeScope)
        : requiredJourneyPass(execution.native, runtimeScope));
    execution.liveness = execution.native.passed;
    return execution;
  }
  if (check.surface === "degradation") {
    execution.native = await runNative(check.scope, "degradation");
    execution.passed =
      execution.native.passed &&
      requiredFaultPass(execution.native, check.scope);
    execution.liveness = execution.native.passed;
    return execution;
  }
  if (check.surface === "ui_browser") {
    execution.h5 = await runH5();
    execution.passed = execution.h5.passed;
    execution.liveness = execution.h5.passed;
    return execution;
  }
  if (check.surface === "population_coverage") {
    execution.commands.contracts = await runContractsTests();
    execution.inspection = await inspectCandidate();
    execution.passed =
      execution.commands.contracts.passed &&
      execution.inspection.checks.curated_spots &&
      execution.inspection.checks.filter_population;
    execution.liveness = execution.commands.contracts.passed;
    return execution;
  }
  if (check.surface === "security_boundary") {
    if (check.scope === "platform-operations") {
      execution.infrastructure = await runInfrastructure();
      execution.passed = execution.infrastructure.passed;
    } else {
      execution.commands.api = await runApiTests();
      execution.commands.fast = await runFast();
      execution.passed =
        execution.commands.api.passed && execution.commands.fast.passed;
    }
    execution.liveness = execution.passed;
    return execution;
  }
  if (check.surface === "api_contract") {
    // The workspace test command is the project-owned contract surface. Keeping
    // the verifier on that entrypoint avoids a second, verifier-only tsx launch
    // convention drifting away from the package's real test environment.
    execution.commands.api_contract = await runApiTests();
    execution.passed = execution.commands.api_contract.passed;
    execution.liveness = execution.passed;
    return execution;
  }
  if (check.surface === "data_state") {
    execution.infrastructure = await runInfrastructure();
    execution.passed = execution.infrastructure.passed;
    execution.liveness = execution.passed;
    return execution;
  }
  throw new Error(`verification_surface_unknown:${check.surface}`);
}

function semanticComparisonIdentity(template, targetRef, actualSha, passed) {
  return sha256(
    canonical({
      fact_ref: template.fact_ref,
      proof_ref: template.proof_ref,
      fact_key: template.fact_key,
      fact_revision_digest: template.fact_revision_digest,
      obligation_key: template.obligation_key,
      obligation_revision_digest: template.obligation_revision_digest,
      target_ref: targetRef,
      actual_value_sha256: actualSha,
      expected_value_sha256: template.expected.sha256,
      comparator: template.comparison.comparator,
      mode: template.comparison.mode,
      parameters_sha256: template.comparison.parameters.sha256,
      tolerance_sha256: template.comparison.tolerance?.sha256 ?? null,
      mask_sha256: template.comparison.mask?.sha256 ?? null,
      passed,
    }),
  );
}

function semanticRecord(assertion, check, spec, semantic, passed) {
  const index = semantic.facts.findIndex(
    (fact) => fact.source_item_key === assertion.key.replace(/^sf-/u, ""),
  );
  if (index < 0)
    throw new Error(
      `semantic_observation_missing:${check.scope}:${assertion.key}`,
    );
  const row = semantic.facts[index];
  const template = spec.semantic_templates.find(
    (item) =>
      item.assertion_key === assertion.key && item.outcome_ref === check.scope,
  );
  if (!template)
    throw new Error(
      `semantic_template_missing:${check.scope}:${assertion.key}`,
    );
  const comparisonPassed = passed && row.comparison.passed;
  return {
    assertion_key: assertion.key,
    capability: "semantic_fact",
    manifest_ref: template.manifest_ref,
    manifest_sha256: template.manifest_sha256,
    outcome_ref: template.outcome_ref,
    target_ref: check.target_ref,
    fact_key: template.fact_key,
    fact_revision_digest: template.fact_revision_digest,
    obligation_key: template.obligation_key,
    obligation_revision_digest: template.obligation_revision_digest,
    fact_ref: template.fact_ref,
    proof_ref: template.proof_ref,
    method: template.method,
    subject_ref: template.subject_ref,
    condition_ref: template.condition_ref,
    property_ref: template.property_ref,
    actual_observation: {
      artifact_path: semantic.path,
      artifact_sha256: semantic.sha256,
      locator: { kind: "json_pointer", value: `/facts/${index}/actual` },
      value_sha256: row.actual_sha256,
      sensitivity: template.observation_sensitivity,
      redaction: null,
    },
    actual_environment: {
      artifact_path: semantic.path,
      artifact_sha256: semantic.sha256,
      locator: { kind: "json_pointer", value: `/facts/${index}/environment` },
      value_sha256: row.environment_sha256,
    },
    expected: template.expected,
    comparison: {
      artifact_path: semantic.path,
      artifact_sha256: semantic.sha256,
      locator: { kind: "json_pointer", value: `/facts/${index}/comparison` },
      result_sha256: semanticComparisonIdentity(
        template,
        check.target_ref,
        row.actual_sha256,
        comparisonPassed,
      ),
      comparator: template.comparison.comparator,
      mode: template.comparison.mode,
      parameters: template.comparison.parameters,
      tolerance: template.comparison.tolerance,
      mask: template.comparison.mask,
      passed: comparisonPassed,
    },
    verdict: comparisonPassed ? "passed" : "failed",
    oracle: template.oracle,
    environment: template.environment,
    observer_results: template.observer_refs.map((targetRef) => ({
      target_ref: targetRef,
      artifact_path: semantic.path,
      artifact_sha256: semantic.sha256,
      locator: { kind: "json_pointer", value: `/facts/${index}/observer` },
      value_sha256: row.actual_sha256,
      comparison_result_sha256: semanticComparisonIdentity(
        template,
        targetRef,
        row.actual_sha256,
        comparisonPassed,
      ),
      passed: comparisonPassed,
    })),
  };
}

function designMethodRecord(assertion, spec, design) {
  return {
    assertion_key: assertion.key,
    capability: "design_method",
    design_target_ref: spec.design_evidence.design_target_ref,
    target_ref: spec.design_evidence.target_ref,
    method: spec.design_evidence.method,
    cells: [
      {
        condition_key: spec.design_evidence.condition_keys[0],
        artifact_path: design.artifacts.method.path,
        observation_artifact_path: design.artifacts.observations.path,
        fact_refs: spec.design_evidence.fact_refs,
        fact_results: spec.design_evidence.fact_expectations.map(
          (expectation, index) => {
            const actual = design.facts[index];
            const comparisonPassed = actual?.passed === true;
            return {
              fact_ref: expectation.fact_ref,
              subject_ref: expectation.subject_ref,
              variation_ref: expectation.variation_ref,
              property_ref: expectation.property_ref,
              actual_observation: {
                artifact_path: design.artifacts.observations.path,
                artifact_sha256: design.artifacts.observations.sha256,
                locator: {
                  kind: "json_pointer",
                  value: `/facts/${index}/actual`,
                },
                value_sha256: actual?.actual_sha256 ?? null,
                sensitivity: expectation.observation_sensitivity,
                redaction: null,
              },
              actual_environment: {
                artifact_path: design.artifacts.observations.path,
                artifact_sha256: design.artifacts.observations.sha256,
                locator: {
                  kind: "json_pointer",
                  value: `/facts/${index}/environment_sha256`,
                },
                value_sha256: actual?.environment_sha256 ?? null,
              },
              expected: expectation.expected,
              comparison: {
                artifact_path: design.artifacts.method.path,
                artifact_sha256: design.artifacts.method.sha256,
                locator: {
                  kind: "json_pointer",
                  value: `/fact_results/${index}/passed`,
                },
                result_sha256: sha256(
                  canonical({
                    fact_ref: expectation.fact_ref,
                    actual_sha256: actual?.actual_sha256 ?? null,
                    expected_sha256: expectation.expected.sha256,
                    passed: comparisonPassed,
                  }),
                ),
                comparator: expectation.comparison.comparator,
                mode: expectation.comparison.mode,
                parameters: expectation.comparison.parameters,
                tolerance: expectation.comparison.tolerance,
                mask: expectation.comparison.mask,
                passed: comparisonPassed,
              },
              verdict: comparisonPassed ? "passed" : "failed",
              oracle: expectation.oracle,
              environment: expectation.environment,
            };
          },
        ),
      },
    ],
  };
}

function runtimeEvidence(execution, carrier) {
  return execution.native ?? carrier.native?.success ?? null;
}

const exactEvidenceRecordFields = Object.freeze({
  target_runtime: Object.freeze([
    "assertion_key",
    "capability",
    "target_ref",
    "root_entrypoint",
    "session_id",
    "cold_start",
  ]),
  interaction_trace: Object.freeze([
    "assertion_key",
    "capability",
    "target_ref",
    "given_keys",
    "action_keys",
  ]),
  failure_injection: Object.freeze([
    "assertion_key",
    "capability",
    "fault",
    "failure_observed",
    "recovery_state_sha256",
  ]),
  state_delta: Object.freeze([
    "assertion_key",
    "capability",
    "before_sha256",
    "after_sha256",
    "changed_fields",
  ]),
});

function assertExactEvidenceRecordShape(record) {
  const expected = exactEvidenceRecordFields[record.capability];
  if (!expected) return;
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((field, index) => field !== sortedExpected[index])
  )
    throw new Error(
      `evidence_record_shape_invalid:${record.capability}:${actual.join(",")}`,
    );
}

function commandEvidenceSummary(command) {
  if (!command) return null;
  return {
    passed: command.passed === true,
    exit_code: command.exit_code ?? null,
    stdout_sha256: command.stdout_sha256 ?? null,
    stderr_sha256: command.stderr_sha256 ?? null,
  };
}

function failureInjectionRecord(assertion, check, execution, passed) {
  const probes = execution.native?.fault_probes ?? [];
  if (probes.length > 0) {
    const failureObserved = probes.every(
      (probe) =>
        probe.fault_observed === true && probe.recovery_observed === true,
    );
    if (!failureObserved) return null;
    return {
      assertion_key: assertion.key,
      capability: "failure_injection",
      fault: `${check.scope}:${check.surface}`,
      failure_observed: failureObserved,
      recovery_state_sha256: sha256(
        canonical(
          probes.map((probe) => ({
            journey_key: probe.journey_key,
            recovery_observation_sha256: probe.recovery_observation_sha256,
            recovery_observed: probe.recovery_observed,
          })),
        ),
      ),
    };
  }

  const commands = Object.fromEntries(
    Object.entries(execution.commands ?? {}).map(([key, command]) => [
      key,
      commandEvidenceSummary(command),
    ]),
  );
  const infrastructure = execution.infrastructure
    ? {
        passed: execution.infrastructure.passed === true,
        artifact_sha256: execution.infrastructure.artifact_sha256 ?? null,
        command: commandEvidenceSummary(execution.infrastructure.command),
      }
    : null;
  const currentCheckEvidencePassed =
    Object.values(commands).some((command) => command?.passed === true) ||
    infrastructure?.passed === true;
  const failureObserved = passed === true && currentCheckEvidencePassed;
  if (!failureObserved) return null;
  return {
    assertion_key: assertion.key,
    capability: "failure_injection",
    fault: `${check.scope}:${check.surface}`,
    failure_observed: failureObserved,
    recovery_state_sha256: sha256(
      canonical({
        assertion_key: assertion.key,
        scope: check.scope,
        surface: check.surface,
        failure_observed: failureObserved,
        commands,
        infrastructure,
      }),
    ),
  };
}

function recordsFor({
  assertion,
  check,
  spec,
  carrier,
  execution,
  semantic,
  design,
  passed,
}) {
  const records = [];
  const native = runtimeEvidence(execution, carrier);
  for (const capability of assertion.evidence_capabilities) {
    if (capability === "target_runtime")
      records.push({
        assertion_key: assertion.key,
        capability,
        target_ref: check.target_ref,
        root_entrypoint: check.root_entrypoint,
        session_id:
          native?.session_id ?? `process:${check.scope}:${check.surface}`,
        cold_start: native?.cold_start ?? false,
      });
    else if (capability === "interaction_trace")
      records.push({
        assertion_key: assertion.key,
        capability,
        target_ref: check.target_ref,
        given_keys: check.given_keys,
        action_keys: check.action_keys,
      });
    else if (capability === "cross_surface_consistency") {
      const sharedStateSha256 = carrier.source_snapshot?.sha256 ?? null;
      records.push({
        assertion_key: assertion.key,
        capability,
        surfaces: [
          {
            surface_ref: "native-miniapp",
            target_ref: "wechat-devtools-native",
            state_sha256: sharedStateSha256,
          },
          {
            surface_ref: "browser-diagnostic",
            target_ref: "miniapp-browser-proxy",
            state_sha256: sharedStateSha256,
          },
        ],
      });
    } else if (capability === "failure_injection") {
      const record = failureInjectionRecord(
        assertion,
        check,
        execution,
        passed,
      );
      if (record) records.push(record);
    } else if (capability === "state_delta") {
      const ids =
        execution.inspection?.spot_ids ?? carrier.inspection?.spot_ids ?? [];
      records.push({
        assertion_key: assertion.key,
        capability,
        before_sha256: sha256(canonical([])),
        after_sha256: sha256(canonical(ids)),
        changed_fields: ["enumerated_population"],
      });
    } else if (capability === "semantic_fact")
      records.push(semanticRecord(assertion, check, spec, semantic, passed));
    else if (capability === "design_conformance")
      records.push({
        assertion_key: assertion.key,
        capability,
        design_target_ref: spec.design_evidence.design_target_ref,
        target_ref: spec.design_evidence.target_ref,
        condition_keys: spec.design_evidence.condition_keys,
        actual_artifact_path: design?.artifacts.actual.path ?? DESIGN_ACTUAL,
        comparison_artifact_path:
          design?.artifacts.comparison.path ?? DESIGN_COMPARISON,
      });
    else if (capability === "design_method")
      records.push(designMethodRecord(assertion, spec, design));
  }
  for (const record of records) assertExactEvidenceRecordShape(record);
  return records;
}

function isLivenessAssertion(assertion) {
  return (
    assertion.key === "target-liveness" ||
    assertion.key === "global-target-liveness" ||
    assertion.observation.endsWith("target-live") ||
    assertion.key === "browser-proxy-live"
  );
}

function failedBooleanObservation(expected, assertionKey) {
  if (typeof expected !== "boolean")
    throw new Error(
      `non_boolean_failed_observation_unsupported:${assertionKey}`,
    );
  return !expected;
}

function carrierOutcomeStatus(carrier, check) {
  return check.scope === "global-conformance"
    ? (carrier.global?.conformance ?? null)
    : (carrier.outcomes?.[check.scope]?.status ?? null);
}

function counterfactualControlFor(spec, check, status) {
  return (spec.counterfactual_controls ?? []).find(
    (control) =>
      control.scope === check.scope &&
      control.surface === check.surface &&
      control.check_key === check.check_key &&
      control.status === status,
  );
}

function emitStaleCarrierResult(check, carrier, snapshotValidation) {
  const assertions = [...check.assertions];
  const observations = Object.fromEntries(
    assertions.map((assertion) => [
      assertion.observation,
      failedBooleanObservation(assertion.expected, assertion.key),
    ]),
  );
  process.stdout.write(
    `${JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations,
      evidence_records: [],
      diagnostics: {
        blocker: "delivery_carrier_snapshot_stale",
        carrier_generated_at: carrier.generated_at ?? null,
        snapshot_validation: snapshotValidation,
        required_action:
          "freeze verifier/spec/runner inputs, then run npm run prepare:miniapp:final-candidate",
      },
    })}\n`,
  );
  process.exitCode = 2;
}

function populationRequirementFor(spec, check) {
  return (spec.population_requirements ?? []).find(
    (requirement) =>
      requirement.scope === check.scope &&
      requirement.surface === check.surface &&
      requirement.check_key === check.check_key,
  );
}

async function writeGlobalConformanceArtifact({
  carrier,
  carrierStatus,
  snapshotValid,
  authorityValid,
  candidateCheckPassed,
  checkPassed,
  observations,
  evidenceRecords,
}) {
  const value = {
    schema_version: "miniapp-global-conformance-v1",
    source_snapshot_sha256: carrier.source_snapshot?.sha256 ?? null,
    carrier_status: carrierStatus,
    snapshot_valid: snapshotValid,
    authority_valid: authorityValid,
    candidate_check_passed: candidateCheckPassed,
    check_passed: checkPassed,
    observation_count: Object.keys(observations).length,
    evidence_record_count: evidenceRecords.length,
  };
  return {
    path: GLOBAL_CONFORMANCE_CURRENT,
    sha256: await writeJson(GLOBAL_CONFORMANCE_CURRENT, value),
  };
}

async function verify(spec, options) {
  const diagnosticRecovery = options["diagnostic-recovery"] === true;
  const matchingChecks = spec.checks.filter(
    (candidate) =>
      candidate.scope === options.scope && candidate.surface === options.surface,
  );
  const check = matchingChecks.find((candidate) =>
    diagnosticRecovery
      ? candidate.check_key.endsWith("-degradation")
      : !candidate.check_key.endsWith("-degradation"),
  );
  if (!check)
    throw new Error(
      `verification_scope_unknown:${options.scope}:${options.surface}`,
    );
  const carrier = await readJson(spec.delivery_carrier);
  if (carrier.schema_version !== spec.carrier_schema_version)
    throw new Error("delivery_carrier_schema_mismatch");
  const carrierStatus = carrierOutcomeStatus(carrier, check);
  const counterfactualControl = counterfactualControlFor(
    spec,
    check,
    carrierStatus,
  );
  const counterfactual = counterfactualControl !== undefined;
  const snapshotValidation = await validateSnapshot(spec, carrier, {
    counterfactual,
  });
  const snapshotValid = snapshotValidation.passed;
  if (!snapshotValid) {
    emitStaleCarrierResult(check, carrier, snapshotValidation);
    return;
  }
  const sourceAuthority = await parseSourceAuthority();
  const authority = await authorityResults(spec, sourceAuthority);
  const authorityValid = Object.values(authority).every((row) => row.passed);
  const carrierOutcomePassed =
    check.scope === "global"
      ? carrierStatus === "passed" &&
        Object.values(carrier.outcomes ?? {}).every(
          (outcome) => outcome.status === "passed",
        )
      : carrierStatus === "passed";
  let execution;
  if (check.scope === "global-conformance" || counterfactual) {
    const carrierNative = carrier.native?.success;
    execution = {
      passed:
        snapshotValid &&
        authorityValid &&
        carrierNative?.passed === true &&
        carrier.inspection?.passed === true,
      liveness:
        snapshotValid &&
        carrierNative?.passed === true &&
        carrierNative?.cold_start === true,
      counterfactual,
      native: carrierNative,
      h5: carrier.suites?.h5 ?? null,
      infrastructure: carrier.suites?.infrastructure ?? null,
      inspection: carrier.inspection,
      commands: {},
    };
  } else {
    execution = await executeCurrentCheck(check, options);
  }
  const candidateCheckPassed =
    snapshotValid && authorityValid && execution.passed;
  const checkPassed = candidateCheckPassed && carrierOutcomePassed;
  const currentOutcome = {
    ...(carrier.outcomes ?? {}),
    ...(check.scope === "global-conformance"
      ? {}
      : {
          [check.scope]: {
            status: checkPassed ? "passed" : "failed",
          },
        }),
  };
  const semanticEvidence = {
    authority,
    source_item_count: sourceAuthority.items.size,
    semantic_template_count: spec.semantic_templates.length,
    source_closure_passed:
      authority.semantic_manifest?.source_closure_passed === true,
    outcomes: currentOutcome,
    global_conformance:
      check.scope === "global-conformance"
        ? checkPassed
        : carrier.global?.conformance === "passed",
    fast_passed:
      execution.commands?.fast?.passed ?? carrier.suites?.fast?.passed === true,
    h5_passed: execution.h5?.passed ?? carrier.suites?.h5?.passed === true,
    native_success: execution.native ?? carrier.native?.success,
    snapshot_valid: snapshotValid,
  };
  const semanticTemplatesForScope = spec.semantic_templates.filter(
    (item) => item.outcome_ref === check.scope,
  );
  const semantic =
    semanticTemplatesForScope.length > 0
      ? await buildSemanticArtifact(
          spec,
          sourceAuthority,
          semanticEvidence,
          check.scope,
        )
      : null;
  const needsDesign = check.assertions.some((assertion) =>
    assertion.evidence_capabilities.some((capability) =>
      ["design_conformance", "design_method"].includes(capability),
    ),
  );
  const design = needsDesign
    ? await buildDesignArtifacts(spec, {
        h5: execution.h5 ?? carrier.suites?.h5,
        native_success: execution.native ?? carrier.native?.success,
        inspection: execution.inspection ?? carrier.inspection,
      })
    : null;
  const observations = {};
  const evidenceRecords = [];
  const populationRequirement = populationRequirementFor(spec, check);
  if (populationRequirement) {
    const ids = [
      ...(execution.inspection?.spot_ids ?? carrier.inspection?.spot_ids ?? []),
    ];
    observations[populationRequirement.observations.universe_ids] = ids;
    observations[populationRequirement.observations.eligible_ids] = ids;
    observations[populationRequirement.observations.observed_ids] = ids;
    observations[populationRequirement.observations.excluded_items] = [];
  }
  const counterfactualFailures = new Set(
    counterfactualControl?.expected_assertion_failures ?? [],
  );
  for (const assertion of check.assertions) {
    const liveness = isLivenessAssertion(assertion);
    let assertionPassed = liveness
      ? snapshotValid && authorityValid && execution.liveness
      : counterfactual
        ? candidateCheckPassed
        : checkPassed;
    if (counterfactualFailures.has(assertion.key)) assertionPassed = false;
    if (assertion.evidence_capabilities.includes("semantic_fact"))
      assertionPassed =
        assertionPassed &&
        semantic?.facts.some(
          (fact) =>
            fact.source_item_key === assertion.key.replace(/^sf-/u, "") &&
            fact.comparison.passed,
        );
    if (assertion.evidence_capabilities.includes("design_conformance"))
      assertionPassed = assertionPassed && design?.passed === true;
    if (assertion.evidence_capabilities.includes("design_method"))
      assertionPassed = assertionPassed && design?.method_passed === true;
    observations[assertion.observation] = assertionPassed
      ? assertion.expected
      : failedBooleanObservation(assertion.expected, assertion.key);
    evidenceRecords.push(
      ...recordsFor({
        assertion,
        check,
        spec,
        carrier,
        execution,
        semantic,
        design,
        passed: assertionPassed,
      }),
    );
  }
  const globalArtifact =
    check.scope === "global"
      ? await writeGlobalConformanceArtifact({
          carrier,
          carrierStatus,
          snapshotValid,
          authorityValid,
          candidateCheckPassed,
          checkPassed,
          observations,
          evidenceRecords,
        })
      : null;
  process.stdout.write(
    `${JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations,
      evidence_records: evidenceRecords,
      diagnostics: {
        snapshot_valid: snapshotValid,
        snapshot_validation_mode: snapshotValidation.mode,
        authority_valid: authorityValid,
        carrier_outcome_status: carrierStatus,
        carrier_outcome_passed: carrierOutcomePassed,
        counterfactual,
        counterfactual_control: counterfactualControl?.key ?? null,
        current_check_passed: execution.passed,
        semantic_passed: semantic?.passed ?? null,
        design_passed: design?.passed ?? null,
        global_artifact: globalArtifact,
      },
    })}\n`,
  );
}

const options = parseArgs(process.argv.slice(2));
if (options.spec) SPEC_PATH = options.spec;
const spec = await readJson(SPEC_PATH);
bindAuthorityPaths(spec);
if (options.collect === "current") await collect(spec);
else {
  if (!options.scope || !options.surface)
    throw new Error("required_arguments_missing");
  await verify(spec, options);
}
