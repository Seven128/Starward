import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  knownWechatToolchainConsoleErrorId,
  knownWechatToolchainExceptionId,
  WECHAT_AUTOMATOR_OPAQUE_ERROR_ENVELOPE_V1,
  WECHAT_TRANSIENT_NOT_FOUND_EXCEPTION_V1,
} from "./runtime-event-policy.mjs";
import { inspectCandidate } from "./inspect-production.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const execFileAsync = promisify(execFile);
const at = (...segments) => path.join(root, ...segments);
const text = async (...segments) =>
  (await readFile(at(...segments), "utf8")).replace(/\r\n?/gu, "\n");
const json = async (...segments) => JSON.parse(await text(...segments));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function jsonPointerValue(value, pointer) {
  assert.match(pointer, /^\//u);
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"))
    .reduce((current, segment) => current[segment], value);
}

function currentCandidateCheckVariant(compiled, mutate) {
  return {
    ...compiled,
    outcomes: compiled.outcomes.map((outcome) =>
      outcome.key !== "current-candidate"
        ? outcome
        : {
            ...outcome,
            acceptance: {
              ...outcome.acceptance,
              checks: outcome.acceptance.checks.map((check) =>
                check.key === "current-candidate-runtime" ? mutate(check) : check,
              ),
            },
          },
    ),
  };
}

function mismatchedJsonValue(value) {
  if (typeof value === "string") return `${value}\u0000i21-mismatch`;
  if (typeof value === "number") return value + 1;
  if (typeof value === "boolean") return !value;
  if (value === null) return { i21_mismatch: true };
  if (Array.isArray(value)) return [...value, { i21_mismatch: true }];
  if (typeof value === "object") return { ...value, i21_mismatch: true };
  return `${String(value)}\u0000i21-mismatch`;
}

test("retained NightChina import corpus stays balanced, traceable and rights-safe outside current navigation", async () => {
  const fixture = await json(
    "tools",
    "miniapp",
    "fixtures",
    "nightchina-import-cases.json",
  );
  const catalog = await text(
    "packages",
    "miniapp-contracts",
    "src",
    "catalog.ts",
  );
  const importPage = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "content",
    "import",
    "index.tsx",
  );
  assert.equal(fixture.schemaVersion, "starward-nightchina-import-cases-v1");
  assert.equal(fixture.cases.length, 10);
  assert.equal(
    fixture.cases.filter((item) => item.regionBucket === "guangdong").length,
    5,
  );
  assert.equal(
    fixture.cases.filter((item) => item.regionBucket === "outside_guangdong")
      .length,
    5,
  );
  assert.equal(new Set(fixture.cases.map((item) => item.key)).size, 10);
  for (const item of fixture.cases) {
    const source = new URL(item.sourceUrl);
    assert.equal(source.protocol, "https:");
    assert.equal(source.hostname, "nightchina.net");
    assert.match(item.reportedLocation, /省|自治区/u);
    assert.match(item.reportedCaptureDate, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(item.importText.length >= 30);
    assert.equal(
      item.rightsDisposition,
      "unconfirmed_source_photo_not_reused",
    );
  }
  assert.match(fixture.copyrightPolicy.sourcePhotos, /not copied/u);
  assert.match(fixture.copyrightPolicy.testImage, /synthetic/u);
  assert.match(fixture.copyrightPolicy.publication, /never implies/u);

  const formalCases = fixture.cases.filter(
    (item) => item.expectedAssociation.kind === "existing_formal_spot",
  );
  assert.equal(formalCases.length, 1);
  assert.equal(formalCases[0].expectedAssociation.confirmation, "manual_required");
  assert.equal(formalCases[0].expectedAssociation.spotName, "深圳市天文台");
  assert.ok(formalCases[0].postImportSpotComponentChecks.length >= 8);
  assert.match(catalog, new RegExp(`id: "${formalCases[0].expectedAssociation.spotId.replace("spot:", "")}"`, "u"));
  assert.match(
    catalog,
    new RegExp(`name: "${formalCases[0].expectedAssociation.spotName}"`, "u"),
  );
  assert.ok(
    fixture.cases
      .filter((item) => item !== formalCases[0])
      .every((item) => item.expectedAssociation.kind === "new_place_proposal"),
  );
  assert.match(importPage, /id=\{`import-platform-\$\{item\.key\.toLowerCase\(\)\}`\}/u);
  for (const id of [
    "import-source-url",
    "import-rights-confirmation",
    "import-create-draft",
    "import-new-draft",
    "import-title",
    "import-body",
    "import-source-note",
    "import-enter-edit-draft",
    "import-association-formal",
    "import-association-proposal",
    "import-formal-spot-id",
    "import-save-association",
    "import-open-preview",
    "import-submit-review",
  ]) {
    if (id === "import-rights-confirmation" || id === "import-formal-spot-id") {
      const component = id === "import-rights-confirmation" ? "ToggleField" : "FormalSpotField";
      const file = component === "ToggleField" ? "toggle-field.tsx" : "formal-spot-field.tsx";
      assert.match(importPage, new RegExp(`<${component}\\s+id="${id}"`, "u"), id);
      assert.match(await text("apps", "wechat-miniapp", "src", "components", file), /id=\{id\}/u);
    } else assert.match(importPage, new RegExp(`data-od-id="${id}"`, "u"), id);
  }
});

test("production inspection and native scopes follow the current registered route topology", async () => {
  const expectedRoutes = [
    "pages/map/index",
    "pages/my/index",
    "pages/auth/index",
    "spot/search/index",
    "spot/guides/index",
    "spot/field/index",
    "spot/plan/index",
    "spot/data-source/index",
    "sky/detail/index",
    "content/article/detail/index",
    "content/plan/detail/index",
    "content/plan/list/index",
    "content/plan/edit/index",
    "content/event/list/index",
    "content/event/detail/index",
    "content/contribution/index",
    "content/spot-feedback/index",
    "content/settings/index",
  ];
  const inspection = await inspectCandidate();
  assert.deepEqual(inspection.routes, expectedRoutes);
  assert.equal(inspection.checks.native_project, true);
  assert.equal(inspection.checks.filter_population, true);
  assert.equal(inspection.checks.route_files, true);

  const runner = await text(
    "tools",
    "miniapp",
    "run-wechat-devtools-session.mjs",
  );
  const scopeStart = runner.indexOf("const journeyKeysByScope = {");
  const scopeEnd = runner.indexOf("const faultJourneysByScope = {", scopeStart);
  assert.ok(scopeStart >= 0 && scopeEnd > scopeStart);
  const activeScopes = runner.slice(scopeStart, scopeEnd);
  assert.doesNotMatch(
    activeScopes,
    /profile-links|own-post-import|nightChinaImportJourneyKeys|NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY/u,
  );
});

test("compile-mode controls avoid dynamic hyphenated attributes that WXML evaluates as subtraction", async () => {
  const sourceRoot = at("apps", "wechat-miniapp", "src");
  const entries = await readdir(sourceRoot, { recursive: true });
  const offenders = [];
  for (const entry of entries.filter((value) => value.endsWith(".tsx"))) {
    const source = await readFile(path.join(sourceRoot, entry), "utf8");
    for (const openingTag of source.matchAll(/<[A-Z][A-Za-z]*\b(?=[^>]*\bcompileMode\b)[^>]*>/gsu)) {
      if (/(?:data-[\w-]+|aria-[\w-]+)=\{/u.test(openingTag[0])) {
        offenders.push(`${entry}: ${openingTag[0].replace(/\s+/gu, " ")}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("dynamic runtime selectors use native ids instead of omitted data attributes", async () => {
  const sourceRoot = at("apps", "wechat-miniapp", "src");
  const entries = await readdir(sourceRoot, { recursive: true });
  const offenders = [];
  for (const entry of entries.filter((value) => value.endsWith(".tsx"))) {
    const source = await readFile(path.join(sourceRoot, entry), "utf8");
    if (/data-od-id=\{/u.test(source)) offenders.push(entry);
  }
  assert.deepEqual(offenders, []);
});

test("Map keeps one presentation back boundary while the adopted new-spot editor owns explicit exits", async () => {
  const mapPage = await text(
    "apps",
    "wechat-miniapp",
    "src",
    "pages",
    "map",
    "index.tsx",
  );
  assert.match(mapPage, /import \{[\s\S]*?PageContainer,[\s\S]*?\} from "@tarojs\/components"/u);
  assert.equal((mapPage.match(/<PageContainer\b/gu) ?? []).length, 1);
  assert.match(mapPage, /<PageContainer[\s\S]*?show=\{mapPresentationBackBoundaryVisible\}[\s\S]*?overlay=\{false\}[\s\S]*?closeOnSlideDown=\{false\}[\s\S]*?onBeforeLeave=\{handleMapPresentationSystemBack\}/u);
  assert.doesNotMatch(mapPage, /<PageContainer[\s\S]*?show=\{bottomPresentation === "spot-editor"\}/u);
  assert.match(mapPage, /<ContributionEditor[\s\S]*?embedded[\s\S]*?onLeaveGuardChange=[\s\S]*?onClose=\{closeSpotEditor\}/u);
  assert.match(mapPage, /confirmEditorLeave[\s\S]*?editorLeaveGuard\.current/u);
  assert.match(mapPage, /onClose=\{closeSpotEditor\}/u);
});

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

test("native runtime policy isolates the recoverable WeChat startup not-found exception", () => {
  const known = WECHAT_TRANSIENT_NOT_FOUND_EXCEPTION_V1;
  const event = {
    kind: "exception",
    phase: known.phase,
    safe_excerpt: `{\"message\":\"${known.message}\"}`,
  };
  assert.equal(knownWechatToolchainExceptionId(event), known.id);
  assert.equal(
    knownWechatToolchainExceptionId({ ...event, phase: "setup-startup" }),
    known.id,
  );
  for (const [field, value] of [
    ["kind", "console"],
    ["phase", "evidence-journey:my-home"],
    ["safe_excerpt", '{"message":"application failure"}'],
  ]) {
    assert.equal(
      knownWechatToolchainExceptionId({ ...event, [field]: value }),
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
  // Page visibility/cancellation are exercised by map-page-lifecycle.test.ts
  // and the query owner's tests, without coupling to callback formatting.
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
    "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02",
  );
  assert.equal(manifest.assets.length, 54);
  const modeColors = { day: "#282b29", night: "#f5f3ec", observation: "#ff6b58" };
  for (const name of [
    "chevron-right",
    "download",
    "trash-2",
    "wifi-off",
    "images",
    "account-user",
    "pencil",
    "settings",
    "share",
    "eye",
    "bulb",
    "cloud",
  ]) {
    const source = await readFile(path.join(iconRoot, `${name}.svg`), "utf8");
    for (const [mode, color] of Object.entries(modeColors)) {
      const assetName = `${name}-${mode}.svg`;
      assert.ok(manifest.assets.some((asset) => asset.path === assetName), assetName);
      const generated = await readFile(path.join(iconRoot, assetName), "utf8");
      assert.equal(generated, source.replaceAll('stroke="currentColor"', `stroke="${color}"`), `${assetName}: geometry and license preserved`);
    }
  }
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
    sha256(await readFile(at("tools", "miniapp", "semantic-art.mjs"))),
  );
  assert.equal(manifest.subjects.length, 8);
  assert.equal(manifest.modes.length, 3);
  assert.equal(manifest.assets.length, 24);
  for (const asset of manifest.assets) {
    const bytes = await readFile(path.join(assetRoot, asset.file));
    assert.equal(sha256(bytes), asset.sha256, asset.file);
  }
});

test("ordinary UI checks depend on production owners, not prototype packages", async () => {
  const probes = await json("tools", "miniapp", "ui-contract-probes.json");
  assert.deepEqual(probes.map(probe => probe.key), ["field-signal-native-chrome", "sensor-follow-only", "operations-workflow", "contribution-three-axes"]);
  for (const probe of probes) {
    assert.ok(probe.path.startsWith("apps/"));
    // Production marker checks are owned and executed once by verify-ui-contracts.
  }
  const pkg = await json("package.json");
  assert.ok(pkg.scripts["check:miniapp:fast"].includes("test:miniapp:ui-contracts"));
  assert.ok(!pkg.scripts["check:miniapp:fast"].includes("design-bindings"));
  const verifier = await text("tools", "verify-miniapp-design-profile.mjs");
  assert.ok(!verifier.includes("docs/design-resources"));
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
      /MINIAPP_(?:PRODUCT_)?VERSION|acceptanceProfile|(?:^|\s)--profile(?:\s|=|$)|complete-demo/imu,
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
    "wechat_process_temp_must_be_outside_candidate_and_run_roots",
    "observeWechatIdeInstances",
    "forceStopWechatIdeInstances",
    "force_exact_root_process_trees",
    "official_cli_quit_retry_without_observed_root",
    "unreadable_callback_port_count",
    "observed_callback_ports",
    "observed_ide_http_ports",
    "waitForWechatIdeClosed",
    "wechat_devtools_ide_did_not_close",
    "result.project_session.setup_evidence_shutdown",
    "refreshWechatGeneratedProjectCache",
    '"--action cleanCompileCache"',
    '"--action cleanProjectFileListCache"',
    '"--page pages/auth/index"',
    'method: "official_wechatide_compile_and_open_neutral_page"',
    'const bootstrapPage = await waitForCurrentPageReady(',
    "resolveOfficialCli(cliPath)",
    "assertWechatDevtoolsLoginReady(officialCliInvocation)",
    '"E:\\\\微信开发者工具\\\\cli.bat"',
    '"[data-od-id=\'my-settings-action\']",\n    ".my-settings-gear"',
    "cwd: invocation.cwd ?? root",
    "cwd: root",
    "prepareWechatProjectIdentity",
    "restoreWechatProjectIdentity",
    "restoreWechatPublicProjectConfig",
    "public_config_semantic_ownership_lost",
    "formatting_normalization_detected",
    "verifyWechatWorkspaceLocation",
    "wechatReservedRunTempRoot",
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
    "native_switch_tab_recovery_unavailable",
    'miniProgram.reLaunch("/pages/map/index")',
    "triggerTapAndWait",
    "native_formal_entry_trigger_timeout_unsettled",
    "attemptLimit = 3",
    "differentNumericValue",
    "native_interaction_numeric_bounds_unavailable",
    "numeric_trigger_current",
    '"[data-od-id=\'my-settings-action\']"',
    '".settings-display-mode-choice"',
    "activateDayModeThroughProductionControl",
    "getElementsByXpath",
    "async function queryElements(page, selector)",
    "const nativeSelectorAliases = new Map([",
    `["[data-od-id='default-formal-markers']", "#spot-map"]`,
    `["[data-od-id='display-mode-switcher']", { selector: ".settings-section", index: 0 }]`,
    'key: "candidate-form-ready"',
    'key: "formal-feedback-form-ready"',
    'url: "/content/spot-feedback/index"',
    'selector: ".formal-feedback-tabs button"',
    'key: "formal-feedback-submit"',
    '{ selector: ".contribution-document-actions .soft-button", minimum: 2 }',
    'tap: ".contribution-document-actions .soft-button--primary"',
    'entryFlow: "map-to-new-spot"',
    'platform_method_simulation: "chooseLocation"',
    'key: "recovery-history-ready"',
    'selector: ".contribution-record--draft"',
    'tap: ".contribution-record--draft .soft-button"',
    'key: "recovery-draft-resume-ready"',
    'key: "recovery-inline-state-ready"',
    'preparedRouteParams: ["spotId"]',
    'const routeRequiresContextId = route.searchParams.has("contextId")',
    "context?.contextId === memoryContext.contextId",
    '{ selector: ".contribution-actions .soft-button--disabled", minimum: 1 }',
    "const finalCounts = await Promise.all(",
    "missing.map((item)",
    'typeof nativeSelector === "string"',
    "elements[nativeSelector.index]",
    'page.getElementsByXpath("//*[@data-control]")',
    "includes(odSelector[2])",
    `selector: "[data-od-id='display-mode-switcher']"`,
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
    '"current-candidate": [\n    "map-cold-start-location-fallback",\n    "sky-orientation",\n    "my-home",',
    'entryFlow: "map-to-sky"',
    'entryFlow: "map-to-my-plan"',
    'entryFlow: "map-to-my-settings"',
    'entryFlow: "map-to-my-contribution"',
    'entryFlow: "map-to-spot-contribution"',
    "selectFormalSpotThroughFinder",
    "formal-finder-relaunch-after-transient-result-attempt",
    "for (let attempt = 1; attempt <= 3; attempt += 1)",
    '".routine-entry--settings"',
    '"[data-control~=\'spot-search-result-list\']"',
    '"[data-control~=\'spot-search-result-card\']"',
    '"[data-control~=\'map-spot-information-panel\']"',
    'selector: ".profile-summary"',
    'selector: ".my-plan-card__header"',
    'selector: ".routine-entry--contribution"',
    'selector: ".my-settings-gear"',
    '["[data-od-id=\'plan-preparation\']", ".plan-preparation"]',
    '"plan-optional-checklist"',
    'Math.min(3, checklistRows.length)',
    'targetClass.includes("settings-display-mode-choice--selected")',
    'targetAriaLabel.includes("当前已选")',
    "await currentPageUrl(",
    "faultJourney.preparedRouteParams",
    "native_prepared_route_parameter_missing",
    "bff_process_unavailable_then_restarted_matrix",
    'expectedFragment: "天空加载失败"',
    'expectedFragment: "账户资料暂不可用"',
    "const recoveryControl = await waitForRecoveryControl(page, probe);\n  await restartApi();\n  await recoveryControl.control.tap();",
    'control.attribute("aria-label")',
    "const observedLabel = controlText.trim() || ariaLabel.trim();",
    "miniapp_api_exited_before_ready",
    "captureJourneyViewports",
    'target: ".settings-mode-panel"',
    'selector: "[data-od-id=\'sky-orientation-canvas\']"',
    'release_action: "none"',
    'rootClasses: ["map-page", "theme-day", "location-default-region"]',
    'rootClasses: ["sky-orientation-page"]',
    "missingRootClasses",
    "waitForSelectorSet",
    "waitForSelectorInspection",
    "definition.attributeChecks",
    "numeric_minimum",
    "attributes_passed",
    "inspectSkyScene",
    "validateSkySceneInspection",
    "Number(value.starCount) <= 2048",
    "skyJourney.skySceneReadback = true",
    'key: "orientation-real-scene-time-change"',
    'tap: ".sky-orientation-time-ruler__step"',
    "index: 1",
    "waitForInteractionWatchChange",
    "change_wait_ms",
    "expectFormalContextTimeChange",
    "expectSkySceneFrameChange",
    "native_interaction_formal_context_time_change_missing",
    "native_interaction_sky_scene_frame_change_missing",
    'selector: ".sky-orientation-time-ruler__current-value"',
    'waitForAbsent: [".sky-orientation-data-status"]',
    "frameAt: context.selectedAtUtc",
    "native_interaction_selector_expectation_failed",
    "attribute_checks: item.attribute_checks",
    "teardownNativeSession",
    'result.cleanup.status !== "passed"',
    'await program.send("App.enableLog")',
    "runtimeEventJson",
    "enableRuntimeLog",
    "timeout waiting for automator response",
    "wechat_runtime_log_enable_timeout",
    "timeoutMs = 60_000",
    "retryIdempotentAutomatorOperation",
    "wechat_idempotent_automator_operation_timeout",
    "formal-finder-open-search-attempt-",
    "formal-finder-map-recovery-attempt-",
    "official_automator_relaunch_production_root_after_empty_stack",
    'miniProgram.reLaunch("/pages/map/index")',
    'evidence_role: "automation_protocol_bootstrap_only"',
    '`//*[@data-control=${JSON.stringify(token)}]`',
    'page.getElementsByXpath("//*[@data-control]")',
    'element.attribute("data-control")',
    '["[data-control~=\'map-marker-panel-coordinator\']", ".map-stage"]',
    '["[data-control~=\'spot-search-result-card\']", ".spot-search-result-card"]',
    '["[data-control~=\'spot-share-action\']", ".spot-panel__action--share"]',
    '["[data-control~=\'spot-cloud-stargazing-action\']", ".spot-panel__action--cloud"]',
    '["[data-od-id=\'notification-feedback\']", ".notification__copy"]',
    '["[data-od-id=\'sky-orientation-route\']", ".sky-orientation-page"]',
    '["[data-od-id=\'sky-orientation-canvas\']", ".sky-orientation-canvas"]',
    '["[data-od-id=\'sky-orientation-sensor\']", ".sky-orientation-sensor"]',
    '"[data-od-id=\'sky-orientation-time-ruler\']"',
    '"[data-od-id=\'sky-orientation-object-list-toggle\']"',
    '".sky-orientation-object-toggle button"',
    '"[data-od-id=\'sky-orientation-object-list\']"',
    '".sky-orientation-object-list"',
    '"[data-od-id=\'sky-orientation-back\'] .sky-orientation-back"',
    "waitForFormalContextSpotId",
    "native_interaction_formal_context_mismatch",
    'key: "spot-panel-astronomy-section"',
    'key: "formal-spot-query-select"',
    'value: nightChinaCatalogSpot.name',
    'tap: ".spot-panel__section-tab"',
    "minimum: 2",
    "isAutomatorResponseTimeout",
    "native_formal_entry_tap_timeout_unsettled",
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
    "knownToolchainExceptions",
    "known_toolchain_console_error_count",
    "known_toolchain_exception_count",
    "knownWechatToolchainConsoleErrorId",
    "knownWechatToolchainExceptionId",
    "degradation_probe_resets",
    "degradation_probe_session_restarts",
    "degradation-probe-session-restart",
    "wechat_tool_identity_changed_between_degradation_probes",
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
    'recoveryLabel: "重试天空"',
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
    /acceptanceProfile|(?:^|\s)--profile(?:\s|=|$)|complete-demo|simplified-sky-map|key: "favorites"/mu,
  );
  assert.match(
    ignore,
    /^apps\/wechat-miniapp\/project\.private\.config\.json$/mu,
  );
  assert.ok(
    runner.indexOf("await verifyWechatWorkspaceLocation()") <
      runner.indexOf(
        "projectIdentitySession = await prepareWechatProjectIdentity",
      ),
    "the physical workspace must be verified before private identity and DevTools startup",
  );
  assert.ok(
    runner.indexOf(
      "projectIdentitySession = await prepareWechatProjectIdentity",
    ) < runner.indexOf('await openObservedSession("setup")'),
    "the private project identity must exist before DevTools opens the current candidate",
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
      runner.indexOf('const bootstrapNavigation = runWechatIdeSkillTool('),
    "runtime log activation must precede setup and initial-page observation",
  );
  assert.ok(
    runner.indexOf('const bootstrapWindow = runWechatIdeSkillTool(') <
      runner.indexOf('const bootstrapNavigation = runWechatIdeSkillTool('),
    "the structured IDE must bind the physical project window before compiling the neutral page",
  );
  assert.ok(
    runner.indexOf(
      'method: "official_automator_relaunch_production_root_after_empty_stack"',
    ) < runner.indexOf("async function resetThroughAcceptanceControl"),
    "the documented automator root activation must remain a pre-reset protocol bootstrap",
  );
  assert.match(
    runner,
    /key: "spot-panel-astronomy-section",\s*screenshot: true,\s*tap: "\.spot-panel__section-tab",\s*index: 1,\s*minimum: 2,/su,
    "the astronomy interaction must match the two-section production panel",
  );
  assert.match(
    runner,
    /key: "expand-panel-large",[\s\S]*?selector: "\[data-control~='map-spot-information-panel'\]",\s*kind: "attribute",\s*name: "class",/u,
    "panel expansion must observe the rendered extent class exposed by automator",
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

});

test("infrastructure verification survives the minimal process environment", async () => {
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
  assert.match(customNav, /测试数据 · 不用于现实判断/u);
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
  // The executed warm-entry tests verify the exact physical output reset and
  // its ordering before the compiler, including redirected-output rejection.
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
  assert.match(nativeRunner, /\[data-control~='map-layer-selector-trigger'\]/u);
  assert.doesNotMatch(nativeRunner, /map-analysis-focus-layer/u);
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
  assert.match(
    mapPage,
    /data-control="map-location-control"[\s\S]*?void locateMap\(\)/u,
  );
  const locationAdapter = await text("apps", "wechat-miniapp", "src", "services", "one-shot-location.ts");
  assert.equal([...locationAdapter.matchAll(/platform\.getLocation\(/gu)].length, 1);
  assert.match(
    mapPage,
    /" map-page location-"\s*\+\s*locationState\.toLowerCase\(\)\.replace\("_", "-"\)/u,
  );
  assert.match(
    mapPage,
    /className="map-tool map-tool--location focus-ring"[\s\S]*?<SemanticIcon name="location" \/>/u,
    "the explicit one-shot location control must retain its semantic glyph",
  );
  assert.match(
    mapPage,
    /data-control="map-layer-selector-trigger"[\s\S]*?<SemanticIcon name="layers" \/>/u,
    "the compact map-edge layer action must retain its semantic glyph",
  );
  assert.doesNotMatch(mapPage, /aria-label="刷新当前区域"/u);
  assert.deepEqual(seed.committedFilters, {
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
    drivingRange: {
      mode: "TIME",
      maxMinutes: 180,
      maxDistanceKm: 100,
    },
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
  const generatedChrome = await text("apps", "wechat-miniapp", "src", "theme", "design-tokens.ts");
  assert.match(chrome, /import \{ NATIVE_CHROME_THEME \} from "\.\/design-tokens"/u);
  assert.match(chrome, /const theme = NATIVE_CHROME_THEME\[mode\]/u);
  for (const role of [
    "#FFFFFF",
    "#4859B8",
    "#11120F",
    "#D1D7FF",
    "#000000",
    "#FF6B58",
  ])
    assert.ok(generatedChrome.includes(role), role);
  assert.match(nativeMetrics, /getWindowInfo\(\)\.statusBarHeight/u);
  assert.match(nativeMetrics, /Number\.isFinite\(height\)/u);
  assert.match(navigation, /nativeStatusBarHeightPx\(\)/u);
  assert.match(sky, /className="sky-orientation-back-layer"/u);
  assert.match(sky, /data-od-id="sky-orientation-back"/u);
  assert.match(sky, /nativeNavigationInsets\(\)/u);
  assert.match(await text("apps", "wechat-miniapp", "src", "features", "sky", "spot-sky-page.scss"), /top: var\(--sky-controls-top\)/u);
  // Copy-level regression only: this does not establish native sensor behavior.
  assert.doesNotMatch(sky, /北向(?:目标)?预览/u);
  assert.match(sky, /当前设备姿态不可用，暂停方位投影/u);
  assert.match(sky, /data-sky-scene-state/u);
  assert.match(sky, /data-sky-star-count/u);
  assert.match(sky, /data-sky-catalog-version/u);
  assert.match(sky, /data-sky-scene-frame-at/u);
  // Wiring only; sky-canvas-time.test.ts executes the production drawing
  // function to establish exact-time selection and missing-frame behavior.
  assert.match(sky, /exactSkyTimeFrame\(data\.skyScene\.frames, frameAt\)/u);
  assert.match(sky, /exactSkyTimeFrame\(data\.targetFrames, frameAt\)/u);
  assert.match(sky, /catalog\.entries\[catalogIndex\]/u);
  assert.match(sky, /altitudeDeg <= 0/u);
  assert.match(sky, /星图暂不可用，仍可在对象列表查看天体与事件/u);
  assert.doesNotMatch(sky, /Math\.random/u);
  assert.match(sourceLift, /nativeNavigationInsets\(\)/u);
  assert.match(nativeMetrics, /getMenuButtonBoundingClientRect\(\)/u);
  assert.match(sourceLift, /--source-lift-status-bar-height/u);
  assert.match(sourceLiftStyles, /--source-lift-status-bar-height/u);
  assert.match(sourceLiftStyles, /env\(safe-area-inset-top\)/u);
  const map = await text("apps", "wechat-miniapp", "src", "pages", "map", "index.tsx");
  const mapStyles = await text("apps", "wechat-miniapp", "src", "pages", "map", "index.scss");
  assert.match(map, /data-control="map-search-entry"/u);
  assert.match(map, /data-control="map-location-control"/u);
  assert.match(map, /data-control="map-layer-selector-trigger"/u);
  assert.doesNotMatch(map, /className=\{[\s\S]*map-analysis-trigger/u);
  assert.match(
    mapStyles,
    /\.map-search-anchor\s*\{[^}]*top: calc\(env\(safe-area-inset-top\) \+ 24rpx\);/su,
  );
  assert.match(
    mapStyles,
    /\.map-top-tools\s*\{[^}]*top: calc\(env\(safe-area-inset-top\) \+ 136rpx\);/su,
  );
  assert.match(
    mapStyles,
    /\.map-feedback-column\s*\{[^}]*z-index: 34;[^}]*top: calc\(env\(safe-area-inset-top\) \+ 320rpx\);/su,
  );
  assert.doesNotMatch(
    mapStyles,
    /\.map-feedback-column\s*>\s*\*/u,
    "WeChat's WXSS compiler rejects the child universal selector in this production stylesheet",
  );
  assert.match(
    mapStyles,
    /\.map-feedback-column \.status-panel,\s*\.map-feedback-column \.notification\s*\{[^}]*pointer-events: auto;/su,
  );
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
  const orientationStart = settings.indexOf('id="settings-direction"');
  const orientationEnd = settings.indexOf('id="settings-precise-location"', orientationStart);
  assert.ok(orientationStart >= 0 && orientationEnd > orientationStart);
  const orientationRow = settings.slice(orientationStart, orientationEnd);
  assert.match(orientationRow, /label="方位天空"/u);
  assert.match(orientationRow, /value="按页使用"/u);
  assert.doesNotMatch(orientationRow, /navigateTo|pages\/auth|SoftButton/u);
});


test("NightChina formal-spot selection keeps suggestion observation and tap atomic", async () => {
  const runner = await text(
    "tools",
    "miniapp",
    "run-wechat-devtools-session.mjs",
  );
  // Atomic observation/tap, retry and failure semantics live in the runner's
  // actual-call tests; this check only binds the declared production journey.
  const journeyStart = runner.indexOf(
    'const NIGHTCHINA_POST_IMPORT_SPOT_JOURNEY =',
  );
  assert.ok(journeyStart >= 0);
  const journey = runner.slice(journeyStart, runner.indexOf("journeys.push", journeyStart + 100));
  assert.doesNotMatch(journey, /key: "search-associated-formal-spot"/u);
  assert.match(journey, /inputAndTapMatch:\s*\{/u);
  assert.match(journey, /candidates: "\.spot-search-suggestion"/u);
  for (const requiredCandidateRoot of [
    "data-pipelines/src",
    "packages/astronomy-core/data",
    "packages/astronomy-core/src",
    "packages/astronomy-core/package.json",
    "packages/astronomy-core/tsconfig.json",
  ])
    assert.ok(
      runner.includes(`\"${requiredCandidateRoot}\"`),
      `${requiredCandidateRoot} must be bound into native candidate consistency`,
    );
});



test("current candidate preparation keeps production checks without historical resource dependencies", async () => {
  const scripts = (await json("package.json")).scripts;
  const command = scripts["prepare:miniapp:final-candidate"];
  for (const required of ["check:miniapp:fast", "test:miniapp:infrastructure", "check:miniapp:production", "--mode success", "--mode degradation"])
    assert.ok(command.includes(required), required);
  function countCalls(name, target, ancestors = []) {
    assert.ok(!ancestors.includes(name), `cyclic npm script: ${name}`);
    return [...(scripts[name] ?? "").matchAll(/npm run ([\w:-]+)/gu)].reduce((count, [, child]) =>
      count + (child === target ? 1 : countCalls(child, target, [...ancestors, name])), 0);
  }
  assert.equal(countCalls("prepare:miniapp:final-candidate", "design:system:verify"), 1);
  assert.doesNotMatch(command, /verifier-runtime|verification-spec|design-resources/u);
});
