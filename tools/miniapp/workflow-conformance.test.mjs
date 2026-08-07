import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const at = (...segments) => path.join(root, ...segments);
const text = (...segments) => readFile(at(...segments), "utf8");
const json = async (...segments) => JSON.parse(await text(...segments));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("Mini Program H5 acceptance uses one pinned project-owned Playwright", async () => {
  const rootPackage = await json("package.json");
  const acceptancePackage = await json("tests", "acceptance", "package.json");
  const config = await text("tests", "acceptance", "miniapp", "playwright.config.mjs");
  assert.equal(acceptancePackage.devDependencies["@playwright/test"], "1.61.1");
  assert.equal(
    rootPackage.scripts["test:miniapp:h5"],
    "npm --prefix tests/acceptance run test:miniapp",
  );
  assert.equal(rootPackage.scripts["test:miniapp:h5"].includes("npx"), false);
  assert.match(config, /availableLoopbackPort/u);
  assert.match(config, /start-h5-acceptance\.mjs/u);
  assert.doesNotMatch(config, /127\.0\.0\.1:8787|127\.0\.0\.1:4399/u);
});

test("H5 diagnostics bind TanStack Query's Taro-compatible build and fail fast on invalid bundles", async () => {
  const config = await readFile(
    path.join(root, "apps/wechat-miniapp/config/index.ts"),
    "utf8",
  );
  const playwrightConfig = await readFile(
    path.join(root, "tests/acceptance/miniapp/playwright.config.mjs"),
    "utf8",
  );
  const acceptanceController = await readFile(
    path.join(root, "workers/miniapp-api/src/acceptance.controller.ts"),
    "utf8",
  );
  const acceptanceState = await readFile(
    path.join(root, "tests/acceptance/miniapp/acceptance-state.mjs"),
    "utf8",
  );
  const server = await readFile(
    path.join(root, "tools/miniapp/start-h5-acceptance.mjs"),
    "utf8",
  );
  assert.match(
    config,
    /@tanstack\/query-core\/build\/legacy\/index\.js/u,
  );
  assert.match(
    config,
    /@tanstack\/react-query\/build\/legacy\/index\.js/u,
  );
  assert.match(config, /target === "h5"/u);
  assert.match(server, /spawnSync\(process\.execPath, \["--check", file\]/u);
  assert.match(server, /h5_bundle_syntax_invalid/u);
  assert.match(server, /miniapp-h5-acceptance/u);
  assert.match(server, /build:complete/u);
  assert.match(server, /syntax:complete/u);
  assert.match(playwrightConfig, /maxFailures/u);
  assert.match(playwrightConfig, /MINIAPP_ACCEPTANCE_COLLECT_ALL/u);
  assert.match(playwrightConfig, /globalTimeout/u);
  assert.match(playwrightConfig, /MINIAPP_ACCEPTANCE_MODE/u);
  assert.match(playwrightConfig, /randomUUID/u);
  assert.match(acceptanceController, /x-acceptance-token/u);
  assert.match(acceptanceController, /acceptance_control_unavailable/u);
  assert.match(acceptanceState, /__acceptance\/reset/u);
});

test("generated mode icons exactly match their checked manifest", async () => {
  const iconRoot = at("apps", "wechat-miniapp", "src", "assets", "icons");
  const manifest = await json(
    "apps",
    "wechat-miniapp",
    "src",
    "assets",
    "icons",
    "marker-manifest.json",
  );
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(
    manifest.authorityTarget,
    "target.system.wechat-miniapp-soft-instruments-2026-08-05",
  );
  assert.equal(manifest.assets.length, 18);
  for (const asset of manifest.assets) {
    const bytes = await readFile(path.join(iconRoot, asset.path));
    assert.equal(sha256(bytes), asset.sha256, asset.path);
  }
});

test("selected semantic assets retain the complete 8 by 3 source-derived closure", async () => {
  const assetRoot = at("apps", "wechat-miniapp", "src", "assets", "semantic");
  const manifest = await json(
    "apps",
    "wechat-miniapp",
    "src",
    "assets",
    "semantic",
    "semantic-asset-manifest.json",
  );
  assert.equal(
    manifest.source_sha256,
    "09fe77bc7d6f52a84fea96fafc8d85adc1ab976fc5f43b58b16c50458bad8534",
  );
  assert.equal(manifest.subjects.length, 8);
  assert.equal(manifest.modes.length, 3);
  assert.equal(manifest.assets.length, 24);
  for (const asset of manifest.assets) {
    const bytes = await readFile(path.join(assetRoot, asset.file));
    assert.equal(sha256(bytes), asset.sha256, asset.file);
  }
});

test("every frozen selected design resource has a production probe binding", async () => {
  const bindings = await json(
    "tools",
    "miniapp",
    "selected-design-bindings.json",
  );
  assert.equal(
    bindings.schema_version,
    "starward-miniapp-selected-design-bindings-v1",
  );
  assert.deepEqual(
    bindings.resources.map((resource) => resource.id),
    [
      "APP-01",
      "APP-02",
      "APP-03",
      "APP-04",
      "APP-05",
      "APP-06",
      "APP-07",
      "APP-08",
      "MAP-01",
      "MAP-02",
      "MAP-03",
      "MAP-04",
    ],
  );
  for (const resource of bindings.resources) {
    assert.ok(resource.source_markers.length > 0, resource.id);
    assert.ok(resource.production_probes.length > 0, resource.id);
  }
});

test("native acceptance owns a clean build, exclusive current session and fail-closed evidence", async () => {
  const runner = await text("tools", "miniapp", "run-wechat-devtools-session.mjs");
  const ignore = await text(".gitignore");
  for (const required of [
    "await rm(generatedRoot, { force: true, recursive: true })",
    "directorySnapshot(generatedRoot)",
    'project_root: "apps/wechat-miniapp/project.config.json"',
    "const wechatAutomationPort = 9420",
    'const wechatAcceptanceSdkVersion = "3.17.1"',
    "const devtoolsPortStableWindowMs = 5_000",
    "quitWechatDevtoolsAndWait",
    "const budgets = [Math.min(15_000, timeoutMs)",
    "cwd: path.dirname(devtoolsExecutable)",
    "cwd: root",
    "prepareWechatProjectIdentity",
    "restoreWechatProjectIdentity",
    '"project.private.config.json"',
    "projectname: projectName",
    "libVersion: wechatAcceptanceSdkVersion",
    "waitForWechatProjectBinding",
    "observeWechatWatcherProjects",
    "Get-CimInstance Win32_Process",
    "wxfilewatcher_x64.exe",
    "wechat_devtools_project_binding_mismatch",
    "wechat_base_library_mismatch",
    "private_config_ownership_lost",
    "project_identity_restore",
    "deterministic default-state cold start",
    'miniProgram.reLaunch("/content/settings/index")',
    "activateDayModeThroughProductionControl",
    'setRuntimePhase("setup-day-control-tap")',
    "post_control_state_disposition",
    "my_tab_disposition",
    'waitForElementClass(\n    settingsPage,\n    ".my-page",\n    "theme-day"',
    '"setStorageSync"',
    "resetThroughAcceptanceControl",
    "native_reset_route_unavailable",
    "native_acceptance_reset_snapshot_mismatch",
    'cold_start_location_permission_action: "none"',
    "acceptance-bootstrap.json",
    "candidate_before",
    "candidate_after",
    "before.sha256 === after.sha256",
    "result.build.bundle.files_sha256 === bundleAfter.files_sha256",
    "unexpectedConsoleErrors.length === 0",
    '"complete-demo": [\n    "map-cold-start-location-fallback",\n    "formal-spot-detail",\n    "spot-night",\n    "my-home",\n    "profile-links",',
    "bff_process_unavailable_then_restarted_matrix",
    "release_action: \"none\"",
    'rootClasses: ["map-page", "theme-day", "location-default-region"]',
    'rootClasses: ["sky-page", "theme-night"]',
    'rootClasses: ["observe-page", "theme-observation"]',
    "missingRootClasses",
    "waitForSelectorSet",
    "teardownNativeSession",
    "result.cleanup.status !== \"passed\"",
    'await program.send("App.enableLog")',
    "runtimeEventJson",
    "enableRuntimeLog",
    "timeout waiting for automator response",
    "wechat_runtime_log_enable_timeout",
    "retryIdempotentAutomatorOperation",
    "isAutomatorResponseTimeout",
    "phase: runtimePhase",
    "offset_ms: Date.now() - runtimeStartedAt",
    "safeRuntimeExcerpt",
    "diagnostic_excerpt: safeRuntimeExcerpt(error)",
    'EventEmitter.prototype.on.call(program, "console"',
    "EventEmitter.prototype.removeListener.call(program, \"console\"",
    'process.on("unhandledRejection", captureUnhandledRejection)',
    "runnerFaults.length > 0",
    "const attemptLimit = 2",
    'openObservedSession("setup")',
    'openObservedSession("evidence")',
    "wechat_observed_session_start_failed",
    "runtimePhase = `fault-injection:${faultJourney.key}`",
    'runtimePhase = "post-recovery"',
    'runtimePhase = "setup-reset-before-control"',
    'runtimePhase = "evidence-reset-before-control"',
    "expectedFaultConsoleErrors",
    "degradation_probe_resets",
    "waitForRuntimeEventQuiescence",
    "preclose_runtime_quiescence",
    "setup_request_diagnostics",
    "final_quiescence: evidenceRuntimeQuiescence",
    "native_runtime_events_did_not_quiesce",
    "resetBetweenFaultProbes",
    'neutral_route: "pages/auth/index"',
    "waitForRootFragment",
    "waitForRecoveryControl",
    'recoveryLabel: "重试同步"',
    'recoveryLabel: "重新计算"',
    'recoverySelector: ".status-panel__recovery"',
  ])
    assert.ok(runner.includes(required), required);
  assert.doesNotMatch(runner, /stageCurrentCandidate|starward-miniapp-devtools-/u);
  assert.doesNotMatch(runner, /cwd: projectPath/u);
  assert.doesNotMatch(runner, /selector: "\.map-page\.theme-day"/u);
  assert.doesNotMatch(runner, /miniProgram\.on\("console"/u);
  assert.doesNotMatch(runner, /native\(\)\.authorizeCancel\(/u);
  assert.doesNotMatch(runner, /JSON\.stringify\(event \?\? null\)/u);
  assert.match(ignore, /^apps\/wechat-miniapp\/project\.private\.config\.json$/mu);
  assert.ok(
    runner.indexOf("projectIdentitySession = await prepareWechatProjectIdentity") <
      runner.indexOf('await openObservedSession("setup")'),
    "the private project identity must exist before DevTools opens the current candidate",
  );
  assert.ok(
    runner.indexOf("await waitForWechatProjectBinding") <
      runner.indexOf("return waitForAutomationConnection"),
    "the actual native watcher path must bind before the automator socket is trusted",
  );
  assert.ok(
    runner.indexOf(
      'const neutralPage = await miniProgram.reLaunch("/pages/auth/index")',
    ) < runner.indexOf("const reset = await miniProgram.evaluate"),
    "every acceptance reset must first unmount network-backed query observers",
  );
  assert.ok(
    runner.indexOf("await attachRuntimeObservers(attemptProgram)") <
      runner.indexOf("await waitForInitialPage(attemptProgram, 60_000)"),
    "runtime log activation must precede setup and initial-page observation",
  );
  assert.ok(
    runner.indexOf('runtimePhase = "evidence-reset-before-control"') <
      runner.indexOf('runtimePhase = "fault-injection"'),
    "degradation must establish the canonical evidence state before the BFF fault window",
  );
  assert.ok(
    runner.indexOf("const nativeCleanup = await teardownNativeSession") <
      runner.indexOf("await writeJson(runEvidencePath, result)"),
    "final evidence must be written only after teardown has been observed",
  );
  assert.ok(
    runner.indexOf(
      "const projectIdentityRestore = await restoreWechatProjectIdentity",
    ) <
      runner.indexOf("await writeJson(runEvidencePath, result)"),
    "final evidence must be written only after private project identity restoration",
  );
});

test("WEAPP Query prerequisites and deterministic reset are isolated and project-owned", async () => {
  const polyfills = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "services",
    "platform-polyfills.ts",
  );
  const queryClient = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "services",
    "query-client.ts",
  );
  const app = await text("apps", "wechat-miniapp", "src", "app.tsx");
  const store = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "state",
    "app-store.ts",
  );
  const api = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "services",
    "api-client.ts",
  );
  const preferencesSync = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "hooks",
    "use-preferences-sync.ts",
  );
  assert.match(preferencesSync, /cloneUserPreferences\(before\.preferences\)/u);
  assert.doesNotMatch(preferencesSync, /structuredClone/u);
  const mapPage = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "pages",
    "map",
    "index.tsx",
  );
  const seed = await json(
    "apps",
    "wechat-miniapp",
    "src",
    "state",
    "acceptance-bootstrap.json",
  );
  assert.doesNotMatch(polyfills, /from "abort-controller"/u);
  assert.match(polyfills, /class MiniappAbortController/u);
  assert.match(queryClient, /installAbortControllerPolyfill\(\)/u);
  assert.match(app, /if \(__MINIAPP_ACCEPTANCE_DIAGNOSTICS__\)/u);
  assert.match(app, /miniappQueryClient\.clear\(\)/u);
  assert.match(store, /resetAppStoreForAcceptance/u);
  assert.match(api, /resetApiClientForAcceptance/u);
  assert.match(store, /locationState: "DEFAULT_REGION"/u);
  assert.doesNotMatch(mapPage, /useLoad/u);
  assert.equal(
    [...mapPage.matchAll(/Taro\.getLocation\(/gu)].length,
    1,
    "location must only be requested by the explicit map control",
  );
  assert.match(mapPage, /仅在你点击定位时请求一次位置权限/u);
  assert.match(mapPage, /location-\$\{locationState\.toLowerCase\(\)/u);
  assert.match(mapPage, /className="map-refresh-control"/u);
  assert.deepEqual(seed.committedFilters, {
    LIGHT: [],
    OBSTRUCTION: [],
    LIGHT_DIRECTION: [],
    DRIVE_TIME: [],
    TRIP: [],
    ALTITUDE: [],
    FACILITY: [],
  });
});

test("native safe-area chrome and transient observation mode preserve DESIGN authority", async () => {
  const chrome = await text("apps", "wechat-miniapp", "src", "theme", "native-chrome.ts");
  const navigation = await text("apps", "wechat-miniapp", "src", "components", "custom-nav.tsx");
  const store = await text("apps", "wechat-miniapp", "src", "state", "app-store.ts");
  for (const role of [
    "#F5F8FC",
    "#1769D2",
    "#050A14",
    "#5AA7FF",
    "#000000",
    "#FF514A",
  ])
    assert.ok(chrome.includes(role), role);
  assert.match(navigation, /getWindowInfo\(\)\.statusBarHeight/u);
  assert.match(store, /restoreStartupMode\(state\.mode, state\.priorMode\)/u);
  assert.match(store, /mode: BOOTSTRAP_MODE/u);
});

test("Final-Gate verifier derives actuals from the current candidate and fails closed", async () => {
  const rootPackage = await json("package.json");
  const verifier = await text(
    "tools",
    "miniapp",
    "verify-miniapp-target.mjs",
  );
  const launcher = await text(
    "tools",
    "miniapp",
    "verify-miniapp-target-launcher.c",
  );
  for (const required of [
    "parseSourceAuthority",
    "runNative",
    "buildSemanticArtifact",
    "buildDesignArtifacts",
    "validateSnapshot",
    "runtime_quiescence",
    "assertExactEvidenceRecordShape",
    "evidence_record_shape_invalid",
    "failureInjectionRecord",
    "currentCheckEvidencePassed",
    "commandEvidenceSummary",
    "failedBooleanObservation",
    "counterfactualControlFor",
    "populationRequirementFor",
    "writeGlobalConformanceArtifact",
    "emitStaleCarrierResult",
    "delivery_carrier_snapshot_stale",
    '"const SEEDS: readonly OsmSpotSeed[] = Object.freeze(["',
    'catalog.includes("SEEDS.map(toSpot)")',
    "catalogProjectionBound",
  ])
    assert.ok(verifier.includes(required), required);

  assert.doesNotMatch(verifier, /actual:\s*template\.expected\.value/u);
  assert.doesNotMatch(
    verifier,
    /actualSha\s*=\s*template\.expected\.sha256/u,
  );
  assert.doesNotMatch(
    verifier,
    /environment_sha256:\s*expectation\.environment\.definition\.sha256/u,
  );
  assert.doesNotMatch(verifier, /failure_observed:\s*true/u);
  assert.doesNotMatch(
    verifier,
    /catalog\.matchAll\(\/\^\\s\+spotId:/u,
  );
  assert.doesNotMatch(
    verifier,
    /sha256\(`\$\{check\.scope\}:before`\)/u,
  );
  for (const unsupportedEvidenceField of [
    "artifact_path: native?.artifact_path",
    "artifact_sha256: native?.artifact_sha256",
    "journeys: native?.journeys",
    "probes,",
    "observed_ids: ids",
  ])
    assert.ok(
      !verifier
        .slice(
          verifier.indexOf("function recordsFor"),
          verifier.indexOf("async function verify"),
        )
        .includes(unsupportedEvidenceField),
      unsupportedEvidenceField,
    );
  assert.match(
    verifier,
    /const actual = sourceAuthority\.items\.get\(template\.source_item_key\)/u,
  );
  assert.match(verifier, /\[HANDOFF_SOURCE, handoff\]/u);
  assert.match(
    verifier,
    /const actual = resource\?\.path \? await fileSha\(resource\.path\)/u,
  );
  assert.match(
    verifier,
    /const snapshotValid = await validateSnapshot\(carrier\)/u,
  );
  const verifyBody = verifier.slice(verifier.indexOf("async function verify"));
  assert.ok(
    verifyBody.indexOf("if (!snapshotValid)") <
      verifyBody.indexOf("const sourceAuthority = await parseSourceAuthority()"),
    "stale candidate carriers must fail before any expensive product execution",
  );
  assert.equal(
    rootPackage.scripts["prepare:miniapp:final-candidate"],
    ".\\tools\\miniapp\\verify-miniapp-target.exe --collect current",
  );
  assert.match(verifier, /if \(!failureObserved\) return null;/u);
  assert.match(
    verifier,
    /if \(record\) records\.push\(record\);/u,
  );
  assert.match(verifier, /const current = await snapshotManifest\(\)/u);
  assert.match(verifier, /source_closure_passed: sourceClosure/u);
  assert.match(verifier, /actualEnvironment = await readJson\(DESIGN_ENVIRONMENT\)/u);
  assert.match(verifier, /actualParameters = await readJson\(DESIGN_PARAMETERS\)/u);
  const embeddedDigest = [
    ...(launcher.match(
      /expected_script_sha256\[32\]\s*=\s*\{([\s\S]*?)\};/u,
    )?.[1] ?? "").matchAll(/0x([0-9a-f]{2})/gu),
  ]
    .map((match) => match[1])
    .join("");
  assert.equal(
    embeddedDigest,
    sha256(Buffer.from(verifier)),
    "the frozen executable launcher must bind the exact verifier script bytes",
  );
  assert.match(launcher, /BCryptOpenAlgorithmProvider/u);
  assert.match(launcher, /return 125/u);
});

test("Final-Gate adapter projects exact counterfactual and population authority", async () => {
  const spec = await json("tools", "miniapp", "verification-spec.json");
  assert.ok(spec.counterfactual_controls.length > 0);
  assert.equal(
    new Set(spec.counterfactual_controls.map((row) => row.key)).size,
    spec.counterfactual_controls.length,
  );
  for (const control of spec.counterfactual_controls) {
    assert.match(control.status, /^semantic-failure/u);
    const check = spec.checks.find(
      (row) =>
        row.scope === control.scope &&
        row.surface === control.surface &&
        row.check_key === control.check_key,
    );
    assert.ok(check, `${control.scope}:${control.check_key}`);
    const assertionKeys = new Set(
      check.assertions.map((assertion) => assertion.key),
    );
    for (const key of [
      ...control.expected_assertion_failures,
      ...control.preserved_assertions,
    ])
      assert.ok(assertionKeys.has(key), `${control.key}:${key}`);
  }
  assert.deepEqual(spec.population_requirements, [
    {
      scope: "map-discovery",
      surface: "population_coverage",
      check_key: "map-population",
      observations: {
        universe_ids: "map-discovery.population.universe-ids",
        eligible_ids: "map-discovery.population.eligible-ids",
        observed_ids: "map-discovery.population.observed-ids",
        excluded_items: "map-discovery.population.excluded-items",
      },
    },
  ]);
});
