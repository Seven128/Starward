import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  knownWechatToolchainConsoleErrorId,
  WECHAT_AUTOMATOR_OPAQUE_ERROR_ENVELOPE_V1,
} from "./runtime-event-policy.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const at = (...segments) => path.join(root, ...segments);
const text = async (...segments) =>
  (await readFile(at(...segments), "utf8")).replace(/\r\n?/gu, "\n");
const json = async (...segments) => JSON.parse(await text(...segments));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("native runtime policy recognizes only the exact opaque DevTools envelope", () => {
  const known = WECHAT_AUTOMATOR_OPAQUE_ERROR_ENVELOPE_V1;
  const event = {
    kind: "console",
    level: "error",
    phase: "evidence-journey:plan-editor",
    payload_sha256: known.payload_sha256,
    payload_length: known.payload_length,
    safe_excerpt: known.safe_excerpt,
  };
  assert.equal(knownWechatToolchainConsoleErrorId(event), known.id);
  for (const [field, value] of [
    ["kind", "exception"],
    ["level", "assert"],
    ["payload_sha256", "0".repeat(64)],
    ["payload_length", known.payload_length + 1],
    ["safe_excerpt", '{"type":"error","args":[{"message":"real"}]}'],
  ]) {
    assert.equal(
      knownWechatToolchainConsoleErrorId({ ...event, [field]: value }),
      null,
      field,
    );
  }
});

test("native child-page back controls use source-rendered visible PNG assets", async () => {
  const adapter = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "components",
    "semantic-asset.tsx",
  );
  const day = await readFile(
    at("apps", "wechat-miniapp", "src", "assets", "icons", "arrow-left.png"),
  );
  const night = await readFile(
    at(
      "apps",
      "wechat-miniapp",
      "src",
      "assets",
      "icons",
      "arrow-left-light.png",
    ),
  );
  assert.match(adapter, /"arrow-left": "\/assets\/icons\/arrow-left\.png"/u);
  assert.match(adapter, /"\/assets\/icons\/arrow-left-light\.png"/u);
  assert.equal(
    sha256(day),
    "32841a49733d2825d30c692bbcd904699a56c7aeaa37f2ec0cd7887e62800ba1",
  );
  assert.equal(
    sha256(night),
    "c289496554fef2610bc80a2c8034d8d54b9b8caa73653c80260727e842136d4e",
  );
});

test("Mini Program UI has no Web implementation or H5 acceptance authority", async () => {
  const rootPackage = await json("package.json");
  const config = await readFile(
    path.join(root, "apps/wechat-miniapp/config/index.ts"),
    "utf8",
  );
  const appPackage = await json("apps", "wechat-miniapp", "package.json");
  const acceptancePackage = await json("tests", "acceptance", "package.json");
  const [appSource, appStyles, mapSource, mapStyles, requestLifecycle] =
    await Promise.all([
      text("apps", "wechat-miniapp", "src", "app.tsx"),
      text("apps", "wechat-miniapp", "src", "app.scss"),
      text("apps", "wechat-miniapp", "src", "pages", "map", "index.tsx"),
      text("apps", "wechat-miniapp", "src", "pages", "map", "index.scss"),
      text("apps", "wechat-miniapp", "src", "services", "request-lifecycle.ts"),
    ]);
  assert.equal(rootPackage.scripts["dev:miniapp:h5"], undefined);
  assert.equal(rootPackage.scripts["test:miniapp:h5"], undefined);
  assert.equal(appPackage.scripts["build:h5"], undefined);
  assert.equal(appPackage.scripts["dev:h5"], undefined);
  assert.equal(appPackage.dependencies["@tarojs/plugin-platform-h5"], undefined);
  assert.equal(appPackage.dependencies["react-dom"], undefined);
  assert.equal(acceptancePackage.scripts["test:miniapp"], undefined);
  assert.match(config, /wechat_miniapp_web_target_removed/u);
  assert.doesNotMatch(config, /plugin-platform-h5|\bh5:\s*\{/u);
  assert.doesNotMatch(appSource, /\bH5\b|taro_page|taro-tabbar/iu);
  assert.doesNotMatch(appStyles, /\bH5\b|taro_page|taro-tabbar/iu);
  assert.doesNotMatch(mapSource, /isH5Proxy|map-proxy|TARO_ENV\s*===\s*["']h5/iu);
  assert.doesNotMatch(mapStyles, /map-proxy|map-page--h5/iu);
  assert.doesNotMatch(requestLifecycle, /\bH5\b|browser transport/iu);
  assert.match(mapSource, /useDidShow\(\(\) => setPageVisible\(true\)\)/u);
  assert.match(mapSource, /useDidHide\(\(\) => setPageVisible\(false\)\)/u);
  assert.match(mapSource, /enabled: pageVisible && Boolean\(activeContext\)/u);
  for (const removed of [
    ["apps", "miniapp-admin", "package.json"],
    ["apps", "wechat-miniapp", "src", "index.html"],
    ["workers", "miniapp-api", "src", "admin-web.controller.ts"],
    ["tools", "miniapp", "start-h5-acceptance.mjs"],
    ["tests", "acceptance", "miniapp", "playwright.config.mjs"],
  ]) {
    await assert.rejects(readFile(at(...removed)), { code: "ENOENT" });
  }
});

test("field evidence uses one native intake and an explicit canonical merge boundary", async () => {
  const [
    appConfig,
    myPage,
    detailPage,
    contributionFiles,
    adminController,
    appModule,
    adminCliFiles,
  ] = await Promise.all([
      text("apps", "wechat-miniapp", "src", "app.config.ts"),
      text("apps", "wechat-miniapp", "src", "features", "my", "my-library-page.tsx"),
      text("apps", "wechat-miniapp", "src", "features", "spot", "spot-detail-page.tsx"),
      Promise.all([
        text("apps", "wechat-miniapp", "src", "content", "contribution", "index.tsx"),
        text(
          "apps",
          "wechat-miniapp",
          "src",
          "content",
          "contribution",
          "contribution-form-sections.tsx",
        ),
        text(
          "apps",
          "wechat-miniapp",
          "src",
          "content",
          "contribution",
          "contribution-media-history.tsx",
        ),
      ]),
      text("workers", "miniapp-api", "src", "admin.controller.ts"),
      text("workers", "miniapp-api", "src", "app.module.ts"),
      Promise.all([
        text("tools", "miniapp", "admin-operations.mjs"),
        text("tools", "miniapp", "admin-operations-client.mjs"),
        text("tools", "miniapp", "admin-operations-commands.mjs"),
      ]),
    ]);
  const contributionPage = contributionFiles.join("\n");
  const adminCli = adminCliFiles.join("\n");
  assert.match(appConfig, /"contribution\/index"/u);
  assert.match(myPage, /data-od-id="my-contribution-entry"/u);
  assert.match(detailPage, /data-od-id="spot-contribution-entry"/u);
  for (const required of [
    "contribution-location-consent",
    "contribution-topic-control",
    "contribution-media-upload",
    "contribution-coordinate-consent",
    "contribution-media-rights",
    "contribution-submit",
    "contribution-status-list",
  ]) assert.match(contributionPage, new RegExp(required, "u"));
  assert.doesNotMatch(contributionPage, />WGS84 |WGS84 纬度|WGS84 经度/u);
  assert.match(adminController, /moderation\/cases\/:caseId\/merge/u);
  assert.match(adminCli, /\["merge",\s*mergeCase\]/u);
  assert.match(adminCli, /moderation\/cases\/\$\{encodeURIComponent\(caseId\)\}\/merge/u);
  assert.doesNotMatch(appModule, /AdminWebController/u);
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
    "target.system.wechat-miniapp-sky-canvas-2026-08-25",
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

test("the current Sky Canvas Mini Program and Operations handoffs are bound to production probes", async () => {
  const bindings = await json(
    "tools",
    "miniapp",
    "selected-design-bindings.json",
  );
  assert.equal(
    bindings.schema_version,
    "starward-sky-canvas-selected-design-bindings-v1",
  );
  assert.deepEqual(
    bindings.handoffs.map(({ key, target }) => ({ key, target })),
    [
      {
        key: "miniapp",
        target: "target-miniapp-sky-canvas-current-constraint",
      },
      {
        key: "operations",
        target: "target-operations-sky-canvas-current-constraint",
      },
    ],
  );
  for (const handoff of bindings.handoffs) {
    const owner = await text(
      "project_context", "areas", "main", "screen-contracts",
      `${handoff.key === "miniapp" ? "wechat-miniapp" : "operations"}.md`,
    );
    const adoption = owner.split(/\r?\n/u).find((line) =>
      /^- Current (?:page|screen)\/interaction resource:/u.test(line)
      && line.includes(`\`${handoff.target}\``),
    );
    assert.ok(adoption?.includes(`\`${handoff.path}\``),
      "handoff path must match its canonical adoption record");
    assert.ok(adoption?.includes(`\`${handoff.sha256}\``),
      "handoff digest must match its canonical adoption record");
    assert.match(handoff.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(handoff.expected_census.acceptance_blockers, 0);
  }
  assert.equal(bindings.authorities.length, 4);
  assert.ok(bindings.production_probes.length >= 5);
  for (const probe of bindings.production_probes) {
    assert.ok(
      (probe.all_of?.length ?? 0) + (probe.none_of?.length ?? 0) > 0,
      probe.key,
    );
  }
});

test("the current implementation has no proposal-version product profile", async () => {
  const [harnessConfig, miniappConfig, apiRuntimeConfig, nativeRunner, apiFiles] =
    await Promise.all([
      text(".codex", "config.yaml"),
      text("apps", "wechat-miniapp", "config", "index.ts"),
      text("workers", "miniapp-api", "src", "runtime-config.ts"),
      text("tools", "miniapp", "run-wechat-devtools-session.mjs"),
      readdir(at("packages", "miniapp-contracts", "api")),
    ]);

  assert.doesNotMatch(
    harnessConfig,
    /\bV2 Demo\b|\bDemo baseline\b|\bComplete V2\b|\bDemo BFF\b|\bgated Demo\b/iu,
  );
  for (const currentOwner of [miniappConfig, apiRuntimeConfig, nativeRunner]) {
    assert.doesNotMatch(
      currentOwner,
      /MINIAPP_(?:PRODUCT_)?VERSION|acceptanceProfile|--profile|complete-demo/iu,
    );
  }
  assert.deepEqual(
    apiFiles.filter((file) => file.endsWith(".operations.json")).sort(),
    ["miniapp.operations.json"],
  );
});

test("native acceptance owns a clean build, exclusive current session and fail-closed evidence", async () => {
  const runner = await text(
    "tools",
    "miniapp",
    "run-wechat-devtools-session.mjs",
  );
  const proofWrapper = await text(
    "tools",
    "miniapp",
    "invoke-wechat-long-task-proof.ps1",
  );
  const ignore = await text(".gitignore");
  for (const required of [
    "await rm(generatedRoot, { force: true, recursive: true })",
    "directorySnapshot(generatedRoot)",
    'project_root: "apps/wechat-miniapp/project.config.json"',
    "const wechatAutomationPort = 9420",
    'const wechatAcceptanceSdkVersion = "3.17.1"',
    "const devtoolsPortStableWindowMs = 5_000",
    "quitWechatDevtoolsAndWait",
    "const firstBudget = Math.min(30_000, timeoutMs)",
    "closure_authority",
    "const wechatIdeHttpPort = 23977",
    "verifyWechatProcessEnvironment",
    "wechatToolEnvironment",
    "wechat_process_temp_must_be_outside_harness_snapshot_root",
    "observeWechatIdeInstances",
    "forceStopWechatIdeInstances",
    "force_exact_root_process_trees",
    "official_cli_quit_retry_without_observed_root",
    "unreadable_callback_port_count",
    "observed_callback_ports",
    "observed_ide_http_ports",
    "waitForWechatIdeClosed",
    "wechat_devtools_ide_did_not_close",
    "cwd: path.dirname(devtoolsExecutable)",
    "cwd: root",
    "prepareWechatProjectIdentity",
    "restoreWechatProjectIdentity",
    "restoreWechatPublicProjectConfig",
    "public_config_semantic_ownership_lost",
    "formatting_normalization_detected",
    "verifyWechatSnapshotLocation",
    "wechatFinalGateTempRoot",
    "wechat_snapshot_location_must_be_physical",
    "wechat_snapshot_location_outside_supported_root",
    "wechat_snapshot_temp_environment_mismatch",
    "wechat_snapshot_not_harness_owned",
    'mode: canonical ? "canonical_workspace" : "isolated_harness_snapshot"',
    'observed_path_mode: "direct_physical_candidate"',
    "expected_project_path_sha256",
    "every_watcher_targets_candidate",
    "waitForWechatWatchersClosed",
    "wechat_devtools_watchers_did_not_close",
    '"project.private.config.json"',
    "projectname: projectName",
    "libVersion: wechatAcceptanceSdkVersion",
    "waitForWechatProjectBinding",
    "refreshWechatProjectConfig",
    "same-bytes project.config.json rewrite after watcher binding",
    "wechat_project_config_refresh_changed_candidate_bytes",
    "registerWechatSnapshotProject",
    "tool project/config identity only; no product journey or acceptance claim",
    "wechat_snapshot_registration_project_close_failed",
    "observeWechatWatcherProjects",
    "Get-CimInstance Win32_Process",
    "wxfilewatcher_x64.exe",
    "wechat_devtools_project_binding_mismatch",
    "wechat_base_library_mismatch",
    "private_config_current_bytes_invalid",
    "private_config_semantic_ownership_lost",
    "project_identity_restore",
    "evidence_shutdown",
    "public_config_restoration",
    "deterministic default-state cold start",
    "miniProgram.switchTab(url)",
    "switchTabAndWait",
    "native_switch_tab_unavailable",
    "attemptLimit = 3",
    "differentNumericValue",
    "native_interaction_numeric_bounds_unavailable",
    "numeric_trigger_current",
    '"[data-od-id=\'my-settings-action\'] .soft-button"',
    "activateDayModeThroughProductionControl",
    "getElementsByXpath",
    "async function queryElements(page, selector)",
    "const nativeSelectorAliases = new Map([",
    `["[data-od-id='default-formal-markers']", "#spot-map"]`,
    'setRuntimePhase("setup-day-control-tap")',
    "post_control_state_disposition",
    "my_tab_disposition",
    'waitForElementClass(\n    settingsPage,\n    ".settings-page",\n    "theme-day"',
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
    '"complete-current": [\n    "map-cold-start-location-fallback",\n    "formal-spot-detail",\n    "spot-night",\n    "my-home",',
    'entryFlow: "map-to-detail"',
    'entryFlow: "map-to-night"',
    'entryFlow: "map-to-my-plan"',
    'entryFlow: "map-to-my-settings"',
    'entryFlow: "map-to-my-contribution"',
    'entryFlow: "map-to-detail-contribution"',
    "selectFormalSpotThroughFinder",
    "plan-formal-detail-back",
    '".custom-nav__back-control .soft-button"',
    '"[data-od-id=\'spot-finder-result-scroll\']"',
    '".spot-card__result-main"',
    'await waitForSelector(detailPage, ".night-entry", 1)',
    'detailPage,\n        ".night-entry"',
    '".routine-entry-list .routine-entry"',
    "await currentPageUrl(",
    "faultJourney.preparedRouteParams",
    "native_prepared_route_parameter_missing",
    "bff_process_unavailable_then_restarted_matrix",
    "miniapp_api_exited_before_ready",
    "captureJourneyViewports",
    'target: ".media-empty"',
    'target: ".sky-scene"',
    'release_action: "none"',
    'rootClasses: ["map-page", "theme-day", "location-default-region"]',
    'rootClasses: ["sky-page", "theme-night"]',
    "missingRootClasses",
    "waitForSelectorSet",
    "teardownNativeSession",
    'result.cleanup.status !== "passed"',
    'await program.send("App.enableLog")',
    "runtimeEventJson",
    "enableRuntimeLog",
    "timeout waiting for automator response",
    "wechat_runtime_log_enable_timeout",
    "timeoutMs = 60_000",
    "retryIdempotentAutomatorOperation",
    "isAutomatorResponseTimeout",
    "phase: runtimePhase",
    "offset_ms: Date.now() - runtimeStartedAt",
    "safeRuntimeExcerpt",
    "diagnostic_excerpt: safeRuntimeExcerpt(error)",
    'EventEmitter.prototype.on.call(program, "console"',
    'EventEmitter.prototype.removeListener.call(program, "console"',
    'process.on("unhandledRejection", captureUnhandledRejection)',
    "runnerFaults.length > 0",
    "const attemptLimit = 3",
    'openObservedSession("setup")',
    'openObservedSession("evidence")',
    "wechat_observed_session_start_failed",
    "runtimePhase = `fault-injection:${faultJourney.key}`",
    'runtimePhase = "post-recovery"',
    'runtimePhase = "setup-reset-before-control"',
    'runtimePhase = "evidence-reset-before-control"',
    "expectedFaultConsoleErrors",
    "knownToolchainConsoleErrors",
    "known_toolchain_console_error_count",
    "knownWechatToolchainConsoleErrorId",
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
    'recoveryLabel: "重试夜空"',
    'recoverySelector: ".status-panel__recovery"',
  ])
    assert.ok(runner.includes(required), required);
  assert.doesNotMatch(
    runner,
    /stageCurrentCandidate|starward-miniapp-devtools-/u,
  );
  assert.doesNotMatch(runner, /\bsubst(?:\.exe)?\b|\bsymlink\(|\bjunction\b/iu);
  assert.doesNotMatch(
    runner,
    /project-tiny-context-harness.*\.cli|writeFile\([^)]*\.cli/iu,
  );
  assert.doesNotMatch(runner, /cwd: projectPath/u);
  assert.doesNotMatch(runner, /selector: "\.map-page\.theme-day"/u);
  assert.doesNotMatch(runner, /miniProgram\.on\("console"/u);
  assert.doesNotMatch(runner, /native\(\)\.authorizeCancel\(/u);
  assert.doesNotMatch(runner, /JSON\.stringify\(event \?\? null\)/u);
  assert.doesNotMatch(
    runner,
    /acceptanceProfile|--profile|complete-demo|simplified-sky-map|profile-links|own-post-import|key: "favorites"/u,
  );
  assert.match(
    ignore,
    /^apps\/wechat-miniapp\/project\.private\.config\.json$/mu,
  );
  assert.ok(
    runner.indexOf("await verifyWechatSnapshotLocation()") <
      runner.indexOf(
        "projectIdentitySession = await prepareWechatProjectIdentity",
      ),
    "the physical Harness snapshot location must be verified before private identity and DevTools startup",
  );
  assert.ok(
    runner.indexOf(
      "projectIdentitySession = await prepareWechatProjectIdentity",
    ) < runner.indexOf("await registerWechatSnapshotProject"),
    "the private project identity must exist before DevTools opens the current candidate",
  );
  assert.ok(
    runner.indexOf("await registerWechatSnapshotProject") <
      runner.indexOf('await openObservedSession("setup")'),
    "a newly materialized physical snapshot must complete its non-product project registration before the setup acceptance session",
  );
  assert.ok(
    runner.indexOf("await waitForWechatProjectBinding") <
      runner.indexOf("return waitForAutomationConnection"),
    "the actual native watcher path must bind before the automator socket is trusted",
  );
  assert.ok(
    runner.indexOf("await waitForWechatProjectBinding") <
      runner.indexOf("await refreshWechatProjectConfig"),
    "the exact watcher binding must precede the same-byte dynamic project-config refresh",
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
      runner.indexOf('runtimePhase = `fault-injection:${faultJourney.key}`'),
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
    ) < runner.indexOf("await writeJson(runEvidencePath, result)"),
    "final evidence must be written only after private project identity restoration",
  );
  const finalDrain = runner.slice(
    runner.indexOf('runtimePhase = "evidence-final-drain"'),
    runner.indexOf("const nativeCleanup = await teardownNativeSession"),
  );
  assert.ok(
    finalDrain.indexOf("await quitWechatDevtoolsAndWait") <
      finalDrain.indexOf("await restoreWechatPublicProjectConfig"),
    "public project bytes may be restored only after the evidence IDE and watcher lifecycle is closed",
  );
  assert.ok(
    finalDrain.indexOf("await restoreWechatPublicProjectConfig") <
      finalDrain.indexOf("const after = await candidateSnapshot()"),
    "the final candidate fingerprint must be collected after exact public-config restoration",
  );
  for (const required of [
    "E:\\Dev\\.starward-tmp",
    "$env:TEMP = $invocationRoot",
    "$env:TMP = $invocationRoot",
    "ty-context-*",
    "wechat_long_task_snapshot_cleanup_incomplete",
    "wechat_long_task_invocation_cleanup_target_invalid",
    "Remove-Item -LiteralPath $resolvedInvocationRoot -Recurse -Force",
    "apply-ty-context-harness-compatibility.mjs",
    "for ($attempt = 1; $attempt -le 20; $attempt += 1)",
    "Start-Sleep -Milliseconds 250",
    "node_modules\\.bin\\ty-context.cmd",
    "ValidateSet('verify', 'diagnose-revision', 'final-gate', 'close')",
  ])
    assert.ok(proofWrapper.includes(required), required);
});

test("project Harness compatibility patch is version-pinned and only strengthens exact temporary-root cleanup", async () => {
  const rootPackage = await json("package.json");
  const patcher = await text(
    "tools",
    "miniapp",
    "apply-ty-context-harness-compatibility.mjs",
  );
  const workspaceRuntime = await text(
    "node_modules",
    "project-tiny-context-harness",
    "dist",
    "lib",
    "long-task-workspace-snapshot.js",
  );
  const counterfactualRuntime = await text(
    "node_modules",
    "project-tiny-context-harness",
    "dist",
    "lib",
    "long-task-counterfactual-sandbox.js",
  );

  assert.equal(
    rootPackage.scripts.postinstall,
    "node tools/miniapp/apply-ty-context-harness-compatibility.mjs",
  );
  assert.equal(
    rootPackage.scripts["check:miniapp:harness-compatibility"],
    "node tools/miniapp/apply-ty-context-harness-compatibility.mjs --check",
  );
  assert.match(patcher, /const expectedVersion = "0\.8\.17"/u);
  assert.match(patcher, /ty_context_harness_compatibility_version_mismatch/u);
  assert.match(
    patcher,
    /ty_context_harness_compatibility_unknown_source_shape/u,
  );
  assert.match(patcher, /acceptance_semantics_changed: false/u);
  assert.match(
    workspaceRuntime,
    /recursive: true, force: true, maxRetries: 20, retryDelay: 250/u,
  );
  assert.match(
    counterfactualRuntime,
    /REMOVE_RETRY_LIMIT = process\.platform === "win32" \? 20 : 2/u,
  );
  assert.match(counterfactualRuntime, /REMOVE_RETRY_DELAY_MS = 250/u);
  assert.doesNotMatch(
    patcher,
    /long-task-final-v2|long-task-verifier-v2|delivery-contract|machine_accepted/u,
  );
});

test("infrastructure verification survives the Harness-minimal process environment", async () => {
  const runtimePath = at("tools", "miniapp", "docker-compose-runtime.mjs");
  const { dockerComposeInvocation } = await import(
    pathToFileURL(runtimePath).href
  );
  assert.deepEqual(dockerComposeInvocation(["version"], "win32"), {
    command: "docker-compose",
    args: ["version"],
  });
  assert.deepEqual(dockerComposeInvocation(["version"], "linux"), {
    command: "docker",
    args: ["compose", "version"],
  });
  assert.throws(
    () => dockerComposeInvocation([1], "win32"),
    /docker_compose_arguments_invalid/u,
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
  const customNav = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "components",
    "custom-nav.tsx",
  );
  const miniappConfig = await text(
    "apps",
    "wechat-miniapp",
    "config",
    "index.ts",
  );
  const developmentSession = await text(
    "tools",
    "miniapp",
    "start-development-session.mjs",
  );
  const nativeRunner = await text(
    "tools",
    "miniapp",
    "run-wechat-devtools-session.mjs",
  );
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
  assert.doesNotMatch(app, /__MINIAPP_DEVELOPMENT_FIXTURE_MODE__/u);
  assert.match(customNav, /__MINIAPP_DEVELOPMENT_FIXTURE_MODE__/u);
  assert.match(customNav, /开发验收数据 · 不用于现实判断/u);
  assert.match(customNav, /data-od-id="development-fixture-banner"/u);
  assert.match(
    miniappConfig,
    /process\.env\.MINIAPP_DEVELOPMENT_FIXTURE_MODE === "1"/u,
  );
  assert.match(
    developmentSession,
    /useMemory \? \{ MINIAPP_DEVELOPMENT_FIXTURE_MODE: "1" \} : \{\}/u,
  );
  assert.match(developmentSession, /npm-cli\.js/u);
  assert.doesNotMatch(developmentSession, /spawn\([^)]*"npm\.cmd"/u);
  assert.match(
    developmentSession,
    /await rm\(path\.dirname\(outputEntry\), \{ recursive: true, force: true \}\)/u,
  );
  assert.ok(
    developmentSession.indexOf("await rm(path.dirname(outputEntry)") <
      developmentSession.indexOf('startNpm("dev:miniapp:weapp"'),
  );
  assert.match(
    nativeRunner,
    /const nativeAcceptanceBaseEnvironment = Object\.freeze\(\{[\s\S]*MINIAPP_STORAGE_MODE: "postgres"[\s\S]*MINIAPP_MEDIA_STORAGE_MODE: "LOCAL_FILESYSTEM"[\s\S]*MINIAPP_AUTO_MIGRATE: "1"/u,
  );
  assert.doesNotMatch(
    nativeRunner,
    /nativeAcceptanceBaseEnvironment[\s\S]{0,500}MINIAPP_DEVELOPMENT_FIXTURE_MODE/u,
  );
  assert.match(nativeRunner, /\.\.\.nativeAcceptanceBaseEnvironment/u);
  assert.match(nativeRunner, /DATABASE_URL: databaseUrl/u);
  assert.match(nativeRunner, /REDIS_URL: nativeRedisUrl/u);
  assert.match(nativeRunner, /prepareNativeFormalSpot/u);
  assert.match(nativeRunner, /MINIAPP_MEDIA_STORAGE_ROOT: mediaRoot/u);
  assert.match(nativeRunner, /media_store_cleanup: mediaStoreCleanup/u);
  assert.match(nativeRunner, /durable_runtime_cleanup: durableRuntimeCleanup/u);
  assert.match(app, /miniappQueryClient\.clear\(\)/u);
  assert.match(app, /resetNetwork\(\)/u);
  assert.match(store, /resetAppStoreForAcceptance/u);
  assert.match(api, /resetApiClientForAcceptance/u);
  assert.match(api, /resetApiNetworkCacheForAcceptance/u);
  assert.match(
    nativeRunner,
    /const appStateStorageKey = "starward\.wechat-miniapp\.state\.current"/u,
  );
  assert.match(
    store,
    /const STORAGE_KEY = "starward\.wechat-miniapp\.state\.current"/u,
  );
  assert.match(store, /locationState: "DEFAULT_REGION"/u);
  assert.doesNotMatch(mapPage, /useLoad/u);
  assert.equal(
    [...mapPage.matchAll(/requestOneShotLocation\(Taro\)/gu)].length,
    1,
    "location must only be requested by the explicit map control",
  );
  assert.doesNotMatch(mapPage, /Taro\.getLocation\(/u);
  assert.match(
    mapPage.slice(mapPage.indexOf("const locateMap ="), mapPage.indexOf("const refreshMap =")),
    /await requestOneShotLocation\(Taro\)/u,
  );
  assert.match(mapPage, /onClick=\{locateMap\}/u);
  const locationAdapter = await text("apps", "wechat-miniapp", "src", "services", "one-shot-location.ts");
  assert.equal([...locationAdapter.matchAll(/platform\.getLocation\(/gu)].length, 1);
  assert.match(mapPage, /仅在你点击定位时请求一次位置权限/u);
  assert.match(
    mapPage,
    /" map-page location-"\s*\+\s*locationState\.toLowerCase\(\)/u,
  );
  assert.match(mapPage, /className="map-refresh-control"/u);
  assert.match(
    mapPage,
    /onClick=\{locateMap\}[\s\S]*?>\s*\{""\}\s*<\/SoftButton>\s*<SemanticIcon\s+name="location"\s+className="map-floating-tool__icon"/u,
    "the map location glyph must remain outside SoftButton compileMode",
  );
  assert.match(
    mapPage,
    /className="map-refresh-control"[\s\S]*?>\s*\{""\}\s*<\/SoftButton>\s*<SemanticIcon\s+name="refresh"\s+className="map-floating-tool__icon"/u,
    "the map refresh glyph must remain outside SoftButton compileMode",
  );
  assert.deepEqual(seed.committedFilters, {
    TONIGHT_RECOMMENDED: [],
    BEST_WINDOW_DURATION: [],
    DISTANCE_DRIVE_TIME: [],
    LIGHT_POLLUTION: [],
    LESS_CLOUD: [],
    PARKING: [],
    RESTROOM: [],
    DRIVE_UP_ACCESS: [],
    PHOTO_FOREGROUND: [],
    CAMPING_OVERNIGHT_PARKING: [],
    SPECIFIC_CELESTIAL_EVENT: [],
    LOW_CLOUD_THRESHOLD: [],
    MOON_IMPACT: [],
    HIKING_DIFFICULTY: [],
    SIGNAL: [],
    CHARGING: [],
    OPEN_SKY_DIRECTION: [],
    LAST_VERIFIED_AT: [],
  });
});

test("native safe-area chrome and transient observation mode preserve DESIGN authority", async () => {
  const chrome = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "theme",
    "native-chrome.ts",
  );
  const navigation = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "components",
    "custom-nav.tsx",
  );
  const nativeMetrics = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "theme",
    "native-metrics.ts",
  );
  const sky = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "features",
    "sky",
    "spot-sky-page.tsx",
  );
  const sourceLift = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "components",
    "source-lift-focus-layer.tsx",
  );
  const sourceLiftStyles = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "components",
    "source-lift-focus-layer.scss",
  );
  const store = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "state",
    "app-store.ts",
  );
  for (const role of [
    "#F5F7FA",
    "#536DFE",
    "#050914",
    "#7E8FFF",
    "#000000",
    "#FF3B30",
  ])
    assert.ok(chrome.includes(role), role);
  assert.match(nativeMetrics, /getWindowInfo\(\)\.statusBarHeight/u);
  assert.match(nativeMetrics, /Number\.isFinite\(height\)/u);
  assert.match(navigation, /nativeStatusBarHeightPx\(\)/u);
  assert.match(sky, /nativeStatusBarHeightPx\(\)/u);
  assert.match(sky, /data-od-id="spot-night-header"/u);
  assert.match(sourceLift, /nativeNavigationInsets\(\)/u);
  assert.match(nativeMetrics, /getMenuButtonBoundingClientRect\(\)/u);
  assert.match(sourceLift, /--source-lift-status-bar-height/u);
  assert.match(sourceLiftStyles, /--source-lift-status-bar-height/u);
  assert.match(sourceLiftStyles, /env\(safe-area-inset-top\)/u);
  const map = await text("apps", "wechat-miniapp", "src", "pages", "map", "index.tsx");
  const mapStyles = await text("apps", "wechat-miniapp", "src", "pages", "map", "index.scss");
  const mapChrome = await text("apps", "wechat-miniapp", "src", "pages", "map", "use-map-chrome.ts");
  assert.match(map, /style=\{mapChromeStyle\}/u);
  assert.match(mapChrome, /nativeNavigationInsets\(\)/u);
  assert.match(mapChrome, /useResize\(/u);
  assert.match(mapChrome, /if \(!current\) return/u);
  for (const selector of ["map-finder-anchor", "map-conditions-anchor"])
    assert.ok(mapChrome.includes(`select(".${selector}").boundingClientRect()`));
  assert.match(mapStyles, /top: var\(--map-finder-top, calc\(env\(safe-area-inset-top\) \+ 112rpx\)\)/u);
  assert.match(mapStyles, /\.map-finder-quick-filters\s*\{[^}]*flex-wrap: wrap/su);
  assert.match(mapStyles, /\.map-floating-tools\s*\{[^}]*top: var\(--map-chrome-bottom,/su);
  assert.match(mapStyles, /\.map-floating-tool__icon\s*\{[^}]*pointer-events: none;/su);
  assert.match(mapStyles, /\.map-feedback-column\s*\{[^}]*z-index: 28;[^}]*top: var\(--map-chrome-bottom,/su);
  assert.match(store, /restoreStartupMode\(state\.mode, state\.priorMode\)/u);
  assert.match(store, /mode: BOOTSTRAP_MODE/u);
});

test("Settings keeps orientation permission per-use without fabricating a global sky entry", async () => {
  const settings = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "content",
    "settings",
    "settings-sections.tsx",
  );
  const orientationStart = settings.indexOf("方位天空");
  const orientationEnd = settings.indexOf("精确位置投稿", orientationStart);
  assert.ok(orientationStart >= 0 && orientationEnd > orientationStart);
  const orientationRow = settings.slice(orientationStart, orientationEnd);
  assert.match(orientationRow, /settings-state-pill">按页使用/u);
  assert.doesNotMatch(orientationRow, /navigateTo|pages\/auth|SoftButton/u);
});

test("Final-Gate verifier derives actuals from the current candidate and fails closed", async () => {
  const rootPackage = await json("package.json");
  const verificationSpec = await json(
    "tools",
    "miniapp",
    "verification-spec.json",
  );
  const verifier = await text("tools", "miniapp", "verify-miniapp-target.mjs");
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
  assert.doesNotMatch(verifier, /actualSha\s*=\s*template\.expected\.sha256/u);
  assert.doesNotMatch(
    verifier,
    /environment_sha256:\s*expectation\.environment\.definition\.sha256/u,
  );
  assert.doesNotMatch(verifier, /failure_observed:\s*true/u);
  assert.doesNotMatch(verifier, /catalog\.matchAll\(\/\^\\s\+spotId:/u);
  assert.doesNotMatch(verifier, /sha256\(`\$\{check\.scope\}:before`\)/u);
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
    /const actual = resource\?\.path\s*\?\s*await fileSha\(resource\.path\)/u,
  );
  assert.match(verifier, /counterfactualProjectionFiles/u);
  assert.match(verifier, /projection\.required_exact_paths/u);
  assert.match(verifier, /projection\.required_tree_roots/u);
  assert.match(verifier, /empty_required_tree_roots/u);
  assert.match(verifier, /mode: "complete_candidate"/u);
  assert.match(verifier, /mode: "counterfactual_projection"/u);
  assert.match(verifier, /mismatched_files: mismatched\.slice\(0, 20\)/u);
  assert.match(
    verifier,
    /const snapshotValidation = await validateSnapshot\(spec, carrier, \{/u,
  );
  for (const requiredPath of [
    "package.json",
    "package-lock.json",
    "docs/wechat-miniapp-v2-source.md",
    "DESIGN.md",
    "docs/design-resources/miniapp-selected-handoff-2026-08-06/miniapp-complete-product-selected-v1.md",
    "tools/miniapp/verification-spec.json",
    "tools/miniapp/verify-miniapp-target.mjs",
    "tools/miniapp/verify-miniapp-target-launcher.c",
    "tools/miniapp/verify-miniapp-target.exe",
  ])
    assert.ok(
      verificationSpec.counterfactual_projection.required_exact_paths.includes(
        requiredPath,
      ),
      requiredPath,
    );
  assert.deepEqual(
    verificationSpec.counterfactual_projection.required_tree_roots,
    ["docs/design-resources/miniapp-selected-source-2026-08-06-v1"],
  );
  const verifyBody = verifier.slice(verifier.indexOf("async function verify"));
  assert.ok(
    verifyBody.indexOf("const counterfactualControl") <
      verifyBody.indexOf("const snapshotValidation"),
    "counterfactual projection mode must be selected only from the declared carrier mutation status",
  );
  assert.ok(
    verifyBody.indexOf("if (!snapshotValid)") <
      verifyBody.indexOf(
        "const sourceAuthority = await parseSourceAuthority()",
      ),
    "stale candidate carriers must fail before any expensive product execution",
  );
  assert.equal(
    rootPackage.scripts["prepare:miniapp:final-candidate"],
    ".\\tools\\miniapp\\verify-miniapp-target.exe --collect current --spec tools/miniapp/verification-spec-v2-1-1.json",
  );
  assert.match(verifier, /if \(!failureObserved\) return null;/u);
  assert.match(verifier, /if \(record\) records\.push\(record\);/u);
  assert.match(verifier, /const current = await snapshotManifest\(spec\)/u);
  assert.match(verifier, /source_closure_passed: sourceClosure/u);
  assert.match(verifier, /zeroTemplateProjectionAccepted/u);
  assert.match(
    verifier,
    /manifestSourceKeys\.every\(\(item\) => parsed\.items\.has\(item\)\)/u,
  );
  assert.match(
    verifier,
    /templateKeys\.every\(\(item\) => uniqueManifestSourceKeys\.has\(item\)\)/u,
  );
  assert.match(
    verifier,
    /actualEnvironment = await readJson\(DESIGN_ENVIRONMENT\)/u,
  );
  assert.match(
    verifier,
    /actualParameters = await readJson\(DESIGN_PARAMETERS\)/u,
  );
  const crossSurfaceEvidence = verifier.slice(
    verifier.indexOf('else if (capability === "cross_surface_consistency")'),
    verifier.indexOf('else if (capability === "failure_injection")'),
  );
  assert.match(
    crossSurfaceEvidence,
    /const sharedStateSha256 = carrier\.source_snapshot\?\.sha256 \?\? null/u,
  );
  assert.equal(
    [...crossSurfaceEvidence.matchAll(/state_sha256: sharedStateSha256/gu)]
      .length,
    2,
    "native and browser observations must bind the same validated candidate-state identity",
  );
  assert.doesNotMatch(
    crossSurfaceEvidence,
    /candidate_sha256|stdout_sha256/u,
    "runtime-specific artifact hashes cannot impersonate one cross-surface state version",
  );
  const embeddedDigest = [
    ...(
      launcher.match(
        /expected_script_sha256\[32\]\s*=\s*\{([\s\S]*?)\};/u,
      )?.[1] ?? ""
    ).matchAll(/0x([0-9a-f]{2})/gu),
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

test("V2.1.1 semantic Source closure stays distinct from machine-observable templates", async () => {
  const source = await text("docs", "wechat-miniapp-v2-1-1-source.md");
  const handoff = await text(
    "docs",
    "design-resources",
    "miniapp-selected-handoff-2026-08-22-v3",
    "miniapp-drift-correction-selected-v3.md",
  );
  const spec = await json(
    "tools",
    "miniapp",
    "verification-spec-v2-1-1.json",
  );
  const manifestText =
    /```yaml semantic-fact-compact-carrier-v1\s*\r?\n([\s\S]*?)\r?\n```/u.exec(
      source,
    )?.[1];
  assert.ok(manifestText);
  const manifest = parseYaml(manifestText);
  const markerKeys = [...`${source}\n${handoff}`.matchAll(
    /<!--\s*ty-source-item:start\s+[^>]*?\bkey=([^\s>]+)/gu,
  )].map((match) => match[1]);
  const manifestKeys = manifest.scope.source_item_refs;
  const templateKeys = spec.semantic_templates.map(
    (item) => item.source_item_key,
  );
  assert.equal(new Set(markerKeys).size, markerKeys.length);
  assert.equal(new Set(manifestKeys).size, manifestKeys.length);
  assert.equal(new Set(templateKeys).size, templateKeys.length);
  assert.equal(manifestKeys.length, 460);
  assert.equal(markerKeys.length, 462);
  assert.deepEqual(templateKeys, []);
  assert.ok(manifestKeys.every((key) => markerKeys.includes(key)));
  assert.ok(templateKeys.every((key) => manifestKeys.includes(key)));
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
