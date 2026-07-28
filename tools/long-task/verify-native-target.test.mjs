import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  androidNaturalViewport,
  androidVerticalScrollGesture,
  androidDesignContextBroadcastCommand,
  androidDesignEvidenceResetCommands,
  androidBuildInputFingerprint,
  androidAdbExecutable,
  androidCmakeStagingRoot,
  androidPersistentCacheRoot,
  androidGradleArguments,
  androidJavaScriptRootTypecheckArguments,
  androidAppReadyTestId,
  androidUiEvidenceTimeoutMs,
  classifyPageControlScope,
  controlInteractionKind,
  hasMinimumVisibleBounds,
  isAndroidBuildInputFile,
  isTransientAndroidScreenshotError,
  isTransientAndroidUiDumpError,
  iosSharedControlCarrier,
  nativeDesignContextTestId,
  nativeExpectedScenarioPopulation,
  nativeScenarioEvidenceKey,
  nativeScenarioTestId,
  nativeStateContextTestId,
  normalizeAndroidBuildInputContent,
  parseAndroidLogBufferBytes,
  parseAndroidInstalledApkPath,
  parseAndroidSha256sum,
  parseAndroidUiAutomatorDump,
  parseGfxinfoFrameDurations,
  parseNodeBounds,
  pngDifferenceMetrics,
  readAndroidBuildCache,
  retryTransientAndroidScreenshotOperation,
  retryTransientAndroidUiDumpOperation,
  semanticNodeValue,
  selectAndroidSerials,
  stableEvidenceHash,
  transientAndroidSystemUiRecoveryTap,
  validatePageControlLayerOrder,
  validatePrimaryNavigationState,
  writeDesignFailureArtifact,
  writeAndroidBuildCache,
  xmlAttributes,
} from "./verify-native-target.mjs";

test("Android design context switches stay bound to one attributable launch session", () => {
  const evidence = {
    condition_key: "mobile-android-390-full",
    control_id: "decision-hero",
    mode: "planning",
    outcome: "tonight-decision",
    sample_id: "mobile-android-390-full-planning-decision-hero.success",
    session_id: "android-design-a808039d820ca53c",
  };
  assert.deepEqual(
    androidDesignContextBroadcastCommand("app.starward.mobile", evidence),
    [
      "shell",
      "am",
      "broadcast",
      "-a",
      "app.starward.mobile.DESIGN_CONTEXT",
      "-p",
      "app.starward.mobile",
      "--es",
      "conditionKey",
      evidence.condition_key,
      "--es",
      "controlId",
      evidence.control_id,
      "--es",
      "sessionId",
      evidence.session_id,
      "--es",
      "mode",
      evidence.mode,
      "--es",
      "outcome",
      evidence.outcome,
      "--es",
      "sampleId",
      evidence.sample_id,
    ],
  );
  assert.equal(
    nativeDesignContextTestId(evidence.sample_id),
    "design-context-mobile-android-390-full-planning-decision-hero-success-ready",
  );
  assert.throws(
    () => androidDesignContextBroadcastCommand("app.starward.mobile", {
      ...evidence,
      session_id: "",
    }),
    /native_design_evidence_context_missing:sessionId/u,
  );
});

test("Android design evidence resets the old app before clearing its log transport", () => {
  assert.deepEqual(androidDesignEvidenceResetCommands("app.starward.mobile"), [
    ["shell", "am", "force-stop", "app.starward.mobile"],
    ["logcat", "-b", "main", "-c"],
  ]);
});

test("Android UIAutomator dump parser extracts one XML document from exec-out output", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hierarchy rotation="0">
    <node resource-id="primary-tab-map" />
  </hierarchy>`;
  assert.equal(
    parseAndroidUiAutomatorDump(`${xml}\r\nUI hierchary dumped to: /dev/tty\r\n`),
    xml,
  );
  assert.equal(
    parseAndroidUiAutomatorDump(`observer-prefix\n<hierarchy rotation="0"></hierarchy>\nobserver-suffix`),
    `<hierarchy rotation="0"></hierarchy>`,
  );
  assert.throws(
    () => parseAndroidUiAutomatorDump("UI hierchary dumped to: /dev/tty"),
    /android_uiautomator_dump_xml_missing/u,
  );
  assert.equal(
    isTransientAndroidUiDumpError(new Error("android_uiautomator_dump_xml_missing")),
    true,
  );
});

test("transient Android UI dump failures retry within one bounded observer window", async () => {
  let attempts = 0;
  let clock = 0;
  const result = await retryTransientAndroidUiDumpOperation(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("android-uiautomator-dump_timeout:15000");
      return "<hierarchy />";
    },
    {
      timeoutMs: 2_000,
      now: () => clock,
      wait: async (milliseconds) => {
        clock += milliseconds;
      },
    },
  );

  assert.equal(result, "<hierarchy />");
  assert.equal(attempts, 3);
  assert.equal(clock, 1_000);
});

test("non-transient Android UI dump failures are never retried", async () => {
  let attempts = 0;
  await assert.rejects(
    retryTransientAndroidUiDumpOperation(
      async () => {
        attempts += 1;
        throw new Error("native_test_id_missing:permission-step");
      },
      {
        timeoutMs: 2_000,
        now: () => 0,
        wait: async () => {},
      },
    ),
    /native_test_id_missing:permission-step/u,
  );
  assert.equal(attempts, 1);
});

test("transient Android UI dump retry fails closed at its deadline", async () => {
  let attempts = 0;
  let clock = 0;
  await assert.rejects(
    retryTransientAndroidUiDumpOperation(
      async () => {
        attempts += 1;
        throw new Error("android-uiautomator-dump_timeout:15000");
      },
      {
        timeoutMs: 750,
        now: () => clock,
        wait: async (milliseconds) => {
          clock += milliseconds;
        },
      },
    ),
    /android-uiautomator-dump_timeout:15000/u,
  );
  assert.equal(attempts, 3);
  assert.equal(clock, 750);
});

test("transient Android screenshot transport failures retry within one bounded observer window", async () => {
  let attempts = 0;
  let clock = 0;
  const result = await retryTransientAndroidScreenshotOperation(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("android-screenshot_failed:4294967295:");
      return Buffer.from("png");
    },
    {
      timeoutMs: 2_000,
      now: () => clock,
      wait: async (milliseconds) => {
        clock += milliseconds;
      },
    },
  );

  assert.deepEqual(result, Buffer.from("png"));
  assert.equal(attempts, 3);
  assert.equal(clock, 1_000);
});

test("Android screenshot retries only transient read-only transport failures", async () => {
  assert.equal(isTransientAndroidScreenshotError(new Error("android-screenshot_failed:4294967295:")), true);
  assert.equal(isTransientAndroidScreenshotError(new Error("android-screenshot_timeout:15000")), true);
  assert.equal(isTransientAndroidScreenshotError(new Error("android_screenshot_invalid")), false);
  assert.equal(isTransientAndroidScreenshotError(new Error("android-screenshot_failed:1:device offline")), false);
});
import {
  applicableControlStates,
  assertExactContractPopulation,
  assertExactRuntimeFieldWitnesses,
  assertExactRuntimeProfileWitnesses,
  assertScenarioTrace,
  assertStateTrace,
  designProfileWitnessSource,
  designWitnessCorroboration,
  designWitnessSource,
  exactControlFieldPlan,
  exactProfileFieldPlan,
  parseDesignFieldWitnessLog,
} from "./design-contract-proof.mjs";

const requireFromAcceptance = createRequire(path.resolve("tests/acceptance/package.json"));
const { PNG } = requireFromAcceptance(requireFromAcceptance.resolve("pngjs"));
const mobileControlContract = JSON.parse(await readFile(
  path.resolve("docs/design-targets/mobile-controls-v3/implementation-contract.json"),
  "utf8",
));
const opsControlContract = JSON.parse(await readFile(
  path.resolve("docs/design-targets/ops-controls-v2/implementation-contract.json"),
  "utf8",
));
const nativeContracts = JSON.parse(await readFile(
  path.resolve("tests/acceptance/native/contracts.json"),
  "utf8",
));

function solidPng(red, green, blue, width = 12, height = 8) {
  const image = new PNG({ width, height });
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = red;
    image.data[index + 1] = green;
    image.data[index + 2] = blue;
    image.data[index + 3] = 255;
  }
  return PNG.sync.write(image);
}

test("Android CMake staging is stable per repository and ABI", () => {
  const first = androidCmakeStagingRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const second = androidCmakeStagingRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const otherAbi = androidCmakeStagingRoot("arm64-v8a", "C:/Temp", "C:/Dev/Starward");

  assert.equal(first, second);
  assert.notEqual(first, otherAbi);
  assert.equal(path.basename(first), "x86_64");
});

test("Android verifier resolves adb from the configured SDK before relying on PATH", () => {
  const configuredSdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (configuredSdk) {
    assert.equal(
      path.normalize(androidAdbExecutable),
      path.join(configuredSdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb"),
    );
  } else {
    assert.equal(androidAdbExecutable, "adb");
  }
});

test("Android installed APK reuse requires an exact safe base.apk path and SHA-256", () => {
  const digest = "a".repeat(64);
  const baseApk = "/data/app/~~token/app.starward.mobile-token/base.apk";
  assert.equal(parseAndroidInstalledApkPath(`package:${baseApk}\n`), baseApk);
  assert.equal(parseAndroidInstalledApkPath("package:/data/local/tmp/foreign.apk\n"), null);
  assert.equal(parseAndroidInstalledApkPath("package:/data/app/../../data/base.apk\n"), null);
  assert.equal(parseAndroidSha256sum(`${digest}  ${baseApk}\n`), digest);
  assert.equal(parseAndroidSha256sum(`not-a-digest  ${baseApk}\n`), null);
});

test("Android serial auto-selection keeps ordinary Checks single-device and design Checks shardable", () => {
  const available = ["emulator-5558", "emulator-5556"];
  assert.deepEqual(
    selectAndroidSerials(available, "auto", { allowMultiple: false }),
    ["emulator-5556"],
  );
  assert.deepEqual(
    selectAndroidSerials(available, "auto", { allowMultiple: true }),
    ["emulator-5556", "emulator-5558"],
  );
  assert.throws(
    () => selectAndroidSerials(available, undefined, { allowMultiple: false }),
    /exactly_one_android_device_required:2/u,
  );
});

test("structured evidence hashes include nested values and ignore object key order", () => {
  assert.equal(
    stableEvidenceHash({ outer: { beta: 2, alpha: 1 }, list: [{ value: "same" }] }),
    stableEvidenceHash({ list: [{ value: "same" }], outer: { alpha: 1, beta: 2 } }),
  );
  assert.notEqual(
    stableEvidenceHash({ outer: { alpha: 1, beta: 2 } }),
    stableEvidenceHash({ outer: { alpha: 1, beta: 3 } }),
  );
});

test("Android APK cache is stable per repository and ABI", () => {
  const first = androidPersistentCacheRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const second = androidPersistentCacheRoot("x86_64", "C:/Temp", "C:/Dev/Starward");
  const otherRepository = androidPersistentCacheRoot("x86_64", "C:/Temp", "C:/Dev/Other");

  assert.equal(first, second);
  assert.notEqual(first, otherRepository);
  assert.equal(path.basename(first), "x86_64");
});

test("Android Gradle plan assembles one ABI and keeps bounded daemon reuse", () => {
  const argv = androidGradleArguments("x86_64");

  assert.equal(argv[0], ":app:assembleRelease");
  assert.ok(argv.includes("-PreactNativeArchitectures=x86_64"));
  assert.ok(argv.includes("--daemon"));
  assert.ok(argv.includes("-Dorg.gradle.daemon.idletimeout=600000"));
  assert.ok(!argv.includes(":app:installRelease"));
  assert.ok(!argv.includes("--no-daemon"));
});

test("Android build helpers reject unsupported ABIs", () => {
  assert.throws(() => androidCmakeStagingRoot("all"), /android_device_abi_unsupported/u);
  assert.throws(() => androidGradleArguments("all"), /android_device_abi_unsupported/u);
});

test("Android JavaScript root preflight checks imports before Gradle", () => {
  const argv = androidJavaScriptRootTypecheckArguments("apps/mobile/index.js");
  assert.ok(argv.includes("--allowJs"));
  assert.ok(argv.includes("--checkJs"));
  assert.equal(argv.at(-1), "apps/mobile/index.js");
});

test("Android native evidence allows a bounded cold provider load", () => {
  assert.equal(androidAppReadyTestId, "primary-tab-map");
  assert.equal(androidUiEvidenceTimeoutMs, 60_000);
});

test("Android UI evidence retries only transient UIAutomator root failures", () => {
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:1:ERROR: null root node returned by UiTestAutomationBridge.")), true);
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:1:could not get idle state.")), true);
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:4294967295:")), true);
  assert.equal(isTransientAndroidUiDumpError(new Error("adb_failed:1:device offline")), false);
});

test("Android evidence recovers only the exact transient System UI ANR dialog", () => {
  const systemUiDialog = `<hierarchy>
    <node resource-id="android:id/alertTitle" text="System UI isn't responding" bounds="[100,200][900,280]" />
    <node resource-id="android:id/aerr_wait" text="Wait" bounds="[500,700][900,800]" />
  </hierarchy>`;
  assert.deepEqual(transientAndroidSystemUiRecoveryTap(systemUiDialog), { x: 700, y: 750 });
  assert.equal(
    transientAndroidSystemUiRecoveryTap(systemUiDialog.replace("System UI", "Starward")),
    null,
  );
  assert.equal(
    transientAndroidSystemUiRecoveryTap(systemUiDialog.replace('text="Wait"', 'text="Close app"')),
    null,
  );
});

test("Android control collection ignores clipped or off-screen accessibility nodes", () => {
  assert.equal(hasMinimumVisibleBounds({ bounds: "[87,2338][993,2211]" }), false);
  assert.equal(hasMinimumVisibleBounds({ bounds: "[42,2202][1038,2211]" }), false);
  assert.equal(hasMinimumVisibleBounds({ bounds: "[87,1757][993,1872]" }), true);
  assert.equal(hasMinimumVisibleBounds({ bounds: "[0,0][44,44]" }), true);
});

test("Android node bounds preserve exact production geometry", () => {
  assert.deepEqual(parseNodeBounds({ bounds: "[12,34][112,98]" }), {
    left: 12,
    top: 34,
    right: 112,
    bottom: 98,
    width: 100,
    height: 64,
  });
  assert.throws(() => parseNodeBounds({ bounds: "[12,34][12,98]" }), /native_node_bounds_invalid/u);
});

test("Android vertical scrolling stays inside the observed production scroll owner", () => {
  const xml = `<hierarchy>
    <node scrollable="true" bounds="[0,52][844,310]" />
    <node resource-id="primary-tab-bar" scrollable="false" bounds="[0,310][844,390]" />
  </hierarchy>`;
  assert.deepEqual(androidVerticalScrollGesture(xml, { width: 844, height: 390 }), {
    fromX: 422,
    fromY: 253,
    toX: 422,
    toY: 124,
  });
});

test("Android vertical scrolling fails closed without an observed scroll owner", () => {
  const xml = `<hierarchy>
    <node resource-id="primary-tab-bar" scrollable="false" bounds="[0,310][844,390]" />
  </hierarchy>`;
  assert.throws(
    () => androidVerticalScrollGesture(xml, { width: 844, height: 390 }),
    /native_scroll_container_missing/u,
  );
});

test("Android display configuration keeps a natural portrait buffer and rotates landscape once", () => {
  assert.deepEqual(androidNaturalViewport(390, 844), {
    height: 844,
    rotation: "0",
    width: 390,
  });
  assert.deepEqual(androidNaturalViewport(844, 390), {
    height: 844,
    rotation: "1",
    width: 390,
  });
});

test("control interaction derives direct manipulation from the frozen contract", () => {
  assert.equal(controlInteractionKind({ interactionStateMachine: { trigger: "drag the scrubber" } }), "direct_manipulation");
  assert.equal(controlInteractionKind({ motion: { gestureFollow: true } }), "direct_manipulation");
  assert.equal(controlInteractionKind({ interactionStateMachine: { trigger: "点击确认" }, motion: { gestureFollow: false } }), "press");
});

test("native acceptance scenario ids map deterministically to production test ids", () => {
  assert.equal(
    nativeScenarioTestId("map-filter-sheet.acceptance.failure-recovery", "action"),
    "acceptance-map-filter-sheet-acceptance-failure-recovery-action",
  );
  assert.equal(
    nativeScenarioTestId("AC-rule-release-control-03", "result"),
    "acceptance-ac-rule-release-control-03-result",
  );
});

test("native state acknowledgements are distinct from production state carriers", () => {
  assert.equal(
    nativeStateContextTestId("decision-hero", "permission-denied"),
    "design-state-context-decision-hero-permission-denied-ready",
  );
});

test("native design scenarios cover every Android condition and visual mode without sampling", () => {
  const controlIds = ["primary-tab-bar"];
  const conditions = [{ key: "mobile-android-390-full" }, { key: "mobile-android-844-reduced" }];
  const expected = nativeExpectedScenarioPopulation(controlIds, mobileControlContract, conditions);
  const scenarioCount = mobileControlContract.controls["primary-tab-bar"].acceptanceScenarios.length;
  assert.equal(expected.length, scenarioCount * conditions.length * 3);
  assert.equal(new Set(expected).size, expected.length);
  assert.equal(
    nativeScenarioEvidenceKey({
      condition_key: "mobile-android-390-full",
      control_id: "primary-tab-bar",
      mode: "planning",
      scenario_id: "primary-tab-bar.acceptance.success",
    }),
    "mobile-android-390-full\u001fplanning\u001fprimary-tab-bar\u001fprimary-tab-bar.acceptance.success",
  );
});

test("Android design witness log capacity parser rejects underspecified buffers", () => {
  assert.equal(parseAndroidLogBufferBytes("main: ring buffer is 8 MiB (2 MiB consumed)"), 8 * 1024 * 1024);
  assert.equal(parseAndroidLogBufferBytes("main: ring buffer is 512 KiB"), 512 * 1024);
  assert.throws(() => parseAndroidLogBufferBytes("system: ring buffer is 8 MiB"), /unreadable/);
});

test("iOS semantic carrier must be one reachable shared production JSX control", () => {
  const corpus = [{
    file: "apps/mobile/src/features/tonight/TonightScreen.tsx",
    text: 'import { View } from "react-native"; export const Screen=()=> <View testID="decision-hero" />;',
  }];
  assert.equal(
    iosSharedControlCarrier("decision-hero", corpus),
    "apps/mobile/src/features/tonight/TonightScreen.tsx",
  );
  assert.throws(
    () => iosSharedControlCarrier("decision-hero", [
      ...corpus,
      {
        file: "apps/mobile/src/features/tonight/Other.tsx",
        text: 'export const Other=()=> <View testID="decision-hero" />;',
      },
    ]),
    /ios_semantic_production_control_carrier_ambiguous/u,
  );
  assert.throws(
    () => iosSharedControlCarrier("decision-hero", [{
      file: "apps/mobile/src/features/tonight/TonightScreen.android.tsx",
      text: 'export const Screen=()=> <View testID="decision-hero" />;',
    }]),
    /ios_semantic_android_only_control|ios_semantic_production_control_carrier_ambiguous/u,
  );
});

test("five primary routes require independent nested owner restoration evidence", () => {
  assert.deepEqual(nativeContracts.primary_navigation.map((entry) => entry.route), [
    "/tonight",
    "/map",
    "/trips",
    "/sky",
    "/me",
  ]);
  assert.equal(
    new Set(nativeContracts.primary_navigation.map((entry) => entry.nested_ready_test_id)).size,
    5,
  );
  assert.ok(nativeContracts.primary_navigation.every((entry) => entry.nested_ready_test_id));
  const destination = nativeContracts.primary_navigation[0];
  const state = {
    schema_version: "starward-tab-restoration-state-v1",
    tab_id: destination.tab_id,
    root_route: destination.route,
    active_route: destination.nested_route,
    nested_route: destination.nested_route,
    owner_type: destination.owner_type,
    stack_depth: 2,
    production_route: true,
    shared_root_scroll_owner: false,
    owner_id: "tonight-scroll-owner",
    screen_instance_id: "tonight-screen-instance",
    owner_state_sha256: "state-digest",
    owner_state_revision: 1,
  };
  assert.deepEqual(validatePrimaryNavigationState(destination, JSON.stringify(state)), state);
  assert.throws(
    () => validatePrimaryNavigationState(destination, JSON.stringify({
      ...state,
      shared_root_scroll_owner: true,
    })),
    /primary_navigation_state_invalid/u,
  );
});

test("page assembly preserves fixed-layer and content-layer order independently", () => {
  const composition = [
    { stableControlId: "primary-tab-bar", layer: "safe-area fixed action/navigation" },
    { stableControlId: "permission-step", layer: "content/overlay" },
    { stableControlId: "preference-wizard", layer: "content/overlay" },
    { stableControlId: "profile-switcher", layer: "content/overlay" },
  ];
  assert.deepEqual(
    validatePageControlLayerOrder(composition, [
      "permission-step",
      "preference-wizard",
      "profile-switcher",
      "primary-tab-bar",
    ]),
    composition.map((entry) => entry.stableControlId),
  );
  assert.throws(
    () => validatePageControlLayerOrder(composition, [
      "preference-wizard",
      "permission-step",
      "profile-switcher",
      "primary-tab-bar",
    ]),
    /native_page_control_order_mismatch/u,
  );
});

test("page assembly ignores declared global shell chrome but rejects foreign page controls", () => {
  const owned = ["decision-hero", "recommendation-card"];
  const globalShell = ["primary-tab-bar"];
  assert.equal(classifyPageControlScope("decision-hero", owned, globalShell), "owned");
  assert.equal(classifyPageControlScope("primary-tab-bar", owned, globalShell), "allowed-external");
  assert.equal(classifyPageControlScope("trip-editor", owned, globalShell), "scope-escape");
});

test("dense PNG comparison distinguishes a substituted render", () => {
  const black = solidPng(0, 0, 0);
  const white = solidPng(255, 255, 255);
  assert.equal(pngDifferenceMetrics(black, black).normalized_difference, 0);
  const metrics = pngDifferenceMetrics(black, white);
  assert.equal(metrics.normalized_difference, 1);
  assert.equal(metrics.mismatch_ratio, 1);
  assert.equal(metrics.compared_width, 12);
  assert.equal(metrics.compared_height, 8);
});

test("frozen exact-target control contracts have complete fail-closed field routing", () => {
  const mobile = assertExactContractPopulation("mobile", mobileControlContract);
  const ops = assertExactContractPopulation("ops", opsControlContract);
  assert.deepEqual({
    controls: mobile.controlCount,
    controlFields: mobile.controlFieldCount,
    fields: mobile.fieldCount,
    pages: mobile.pageAssemblyCount,
    rootFields: mobile.rootFieldCount,
    runtimeFields: mobile.runtimeFieldCount,
    unresolvedBlockers: mobile.unresolvedBlockerCount,
  }, {
    controls: 83,
    controlFields: 62_347,
    fields: 67_537,
    pages: 12,
    rootFields: 5_190,
    runtimeFields: 59_406,
    unresolvedBlockers: 10,
  });
  assert.deepEqual({
    controls: ops.controlCount,
    controlFields: ops.controlFieldCount,
    fields: ops.fieldCount,
    pages: ops.pageAssemblyCount,
    rootFields: ops.rootFieldCount,
    runtimeFields: ops.runtimeFieldCount,
  }, {
    controls: 12,
    controlFields: 5_962,
    fields: 7_043,
    pages: 7,
    rootFields: 1_081,
    runtimeFields: 6_049,
  });
  for (const result of [mobile, ops]) {
    assert.deepEqual(Object.keys(result.methodCounts).sort(), [
      "accessibility_semantics",
      "asset_integrity",
      "component_state",
      "content",
      "design_token",
      "input_method",
      "interaction_trace",
      "layout_geometry",
      "motion_timeline",
      "responsive_reflow",
      "visual_pixel",
    ]);
    assert.equal(Object.values(result.methodCounts).every((count) => count > 0), true);
  }
});

test("an unknown exact-target field fails closed instead of becoming unverified design prose", () => {
  const changedControlContract = structuredClone(mobileControlContract);
  changedControlContract.controls["primary-tab-bar"].visual.unroutedFutureField = "must not be silently accepted";
  assert.throws(
    () => assertExactContractPopulation("mobile", changedControlContract),
    /design_contract_profile_count_changed/u,
  );
  const contract = structuredClone(mobileControlContract);
  contract.futureAuthorityPlane = {};
  assert.throws(
    () => assertExactContractPopulation("mobile", contract),
    /design_contract_root_shape_changed/u,
  );
  const changedProfileContract = structuredClone(mobileControlContract);
  changedProfileContract.pageAssemblyContracts[0].futureRuntimeRule = "must be routed";
  assert.throws(
    () => assertExactContractPopulation("mobile", changedProfileContract),
    /design_contract_profile_count_changed/u,
  );
  const danglingReferenceContract = structuredClone(mobileControlContract);
  danglingReferenceContract.controls["primary-tab-bar"].visual.padding.token = "tokenDictionary.spacing.missing";
  assert.throws(
    () => assertExactContractPopulation("mobile", danglingReferenceContract),
    /design_contract_reference_unresolved/u,
  );
});

test("runtime design witnesses bind every exact section and reject a copied-but-different field", () => {
  const controlId = "primary-tab-bar";
  const control = mobileControlContract.controls[controlId];
  const method = "design_token";
  const sections = [...new Set(exactControlFieldPlan("mobile", control)
    .filter((entry) => entry.runtimeRequired && entry.methods.includes(method))
    .map((entry) => entry.pointer.split("/")[1]))];
  const context = {
    condition_key: "mobile-android-390-full",
    control_id: controlId,
    mode: "planning",
    outcome: "mobile-shell-and-preferences",
    sample_id: "sample-primary-tab-bar",
    session_id: "session-design-proof",
  };
  const records = sections.map((section) => ({
    schema_version: "starward-design-section-witness-v1",
    ...context,
    methods: ["design_token", "layout_geometry", "responsive_reflow", "visual_pixel"],
    origin: "production-component",
    section,
    source: designWitnessSource(method),
    value: structuredClone(control[section]),
  }));
  assert.equal(assertExactRuntimeFieldWitnesses({
    ...context,
    corroboration: designWitnessCorroboration(method),
    control,
    method,
    profile: "mobile",
    records,
  }).sectionCount, 1);
  records[0].value.radius.valuePx = 999;
  assert.throws(
    () => assertExactRuntimeFieldWitnesses({
      ...context,
      corroboration: designWitnessCorroboration(method),
      control,
      method,
      profile: "mobile",
      records,
    }),
    /design_runtime_witness_value_mismatch/u,
  );
});

test("runtime profile witnesses bind every exact root section and reject changed page semantics", () => {
  const method = "layout_geometry";
  const sections = [...new Set(exactProfileFieldPlan("mobile", mobileControlContract)
    .filter((entry) => entry.runtimeRequired && entry.methods.includes(method))
    .map((entry) => entry.section))];
  const context = {
    condition_key: "mobile-android-390-full",
    mode: "planning",
    outcome: "mobile-shell-and-preferences",
    sample_id: "sample-primary-tab-bar",
    session_id: "session-design-proof",
  };
  const records = sections.map((section) => ({
    schema_version: "starward-design-profile-section-witness-v1",
    ...context,
    methods: [
      "accessibility_semantics",
      "component_state",
      "content",
      "input_method",
      "interaction_trace",
      "layout_geometry",
      "responsive_reflow",
      "visual_pixel",
    ],
    origin: "production-screen-owner",
    profile: "mobile",
    section,
    source: designProfileWitnessSource(method),
    value: structuredClone(mobileControlContract[section]),
  }));
  assert.equal(assertExactRuntimeProfileWitnesses({
    ...context,
    contract: mobileControlContract,
    corroboration: designWitnessCorroboration(method),
    method,
    profile: "mobile",
    records,
  }).sectionCount, 1);
  records[0].value[0].route = "/detached-preview";
  assert.throws(
    () => assertExactRuntimeProfileWitnesses({
      ...context,
      contract: mobileControlContract,
      corroboration: designWitnessCorroboration(method),
      method,
      profile: "mobile",
      records,
    }),
    /design_runtime_profile_witness_value_mismatch/u,
  );
});

test("design witness log parser handles bounded chunks, ignores noise, and fails incomplete evidence", () => {
  const record = {
    schema_version: "starward-design-section-witness-v1",
    condition_key: "mobile-android-390-full",
    control_id: "primary-tab-bar",
    methods: ["content"],
    mode: "planning",
    origin: "production-component",
    outcome: "mobile-shell-and-preferences",
    sample_id: "sample",
    section: "contentLocalization",
    session_id: "session",
    source: "production-bound-design-section",
    value: {},
  };
  assert.deepEqual(
    parseDesignFieldWitnessLog(`noise\nI/Starward: STARWARD_DESIGN_FIELD ${JSON.stringify(record)}\n`),
    [record],
  );
  const payload = JSON.stringify(record);
  const encoded = Buffer.from(payload).toString("base64url");
  const midpoint = Math.floor(encoded.length / 2);
  const digest = createHash("sha256").update(payload).digest("hex");
  const chunks = [encoded.slice(0, midpoint), encoded.slice(midpoint)].map((value, index) => ({
    schema_version: "starward-design-section-witness-chunk-v1",
    group_id: "session:sample:content",
    chunk_index: index,
    chunk_count: 2,
    payload_base64url: value,
    payload_sha256: digest,
  }));
  assert.deepEqual(
    parseDesignFieldWitnessLog(chunks.reverse().map((chunk) =>
      `I/Starward: STARWARD_DESIGN_FIELD_CHUNK ${JSON.stringify(chunk)}`).join("\n")),
    [record],
  );
  const completeWithSupersededPartial = [
    ...chunks,
    { ...chunks[0], group_id: "session:sample:content-remount" },
  ];
  assert.deepEqual(
    parseDesignFieldWitnessLog(completeWithSupersededPartial.map((chunk) =>
      `I/Starward: STARWARD_DESIGN_FIELD_CHUNK ${JSON.stringify(chunk)}`).join("\n")),
    [record],
  );
  assert.throws(
    () => parseDesignFieldWitnessLog([
      ...chunks,
      {
        ...chunks[0],
        group_id: "session:sample:content-conflict",
        payload_base64url: `${chunks[0].payload_base64url.slice(0, -1)}${
          chunks[0].payload_base64url.endsWith("A") ? "B" : "A"
        }`,
      },
    ].map((chunk) =>
      `I/Starward: STARWARD_DESIGN_FIELD_CHUNK ${JSON.stringify(chunk)}`).join("\n")),
    /design_runtime_witness_chunk_conflict/u,
  );
  assert.throws(
    () => parseDesignFieldWitnessLog(
      `STARWARD_DESIGN_FIELD_CHUNK ${JSON.stringify({ ...chunks[0], chunk_count: 3 })}`,
    ),
    /design_runtime_witness_chunk_missing/u,
  );
  assert.throws(
    () => parseDesignFieldWitnessLog("STARWARD_DESIGN_FIELD {broken"),
    /design_runtime_witness_json_invalid/u,
  );
});

test("every applicable state and scenario requires an attributable exact runtime trace", () => {
  const controlId = "primary-tab-bar";
  const control = mobileControlContract.controls[controlId];
  const scenario = control.acceptanceScenarios[0];
  const transitions = scenario.transitionIds.map((id) =>
    control.interactionStateMachine.transitions.find((transition) => transition.id === id));
  const scenarioTrace = {
    schema_version: "starward-design-scenario-trace-v1",
    control_id: controlId,
    scenario_id: scenario.id,
    origin: "production-state-owner",
    journey_origin: "production-root",
    given: scenario.given,
    when: scenario.when,
    then: scenario.then,
    given_satisfied: true,
    when_executed: true,
    then_observed: true,
    before_state_sha256: "before",
    after_state_sha256: "after",
    transition_ids: scenario.transitionIds,
    event_names: transitions.map((transition) => transition.event?.name ?? null),
    outputs: transitions.map((transition) => transition.output ?? null),
    states: transitions.map((transition) => transition.to ?? null),
    commit_count: 1,
  };
  assert.equal(assertScenarioTrace({
    control,
    controlId,
    observed: { production_root: true, semantic_observed: true, visual_observed: true },
    profile: "mobile",
    scenario,
    trace: scenarioTrace,
  }), true);
  assert.throws(
    () => assertScenarioTrace({
      control,
      controlId,
      observed: { production_root: true, semantic_observed: true, visual_observed: true },
      profile: "mobile",
      scenario,
      trace: { ...scenarioTrace, then_observed: false },
    }),
    /design_scenario_trace_then_observed_false/u,
  );

  const [stateKey, state] = applicableControlStates("mobile", control)
    .find(([key]) => key === "pressed");
  const stateTrace = {
    schema_version: "starward-design-state-trace-v1",
    control_id: controlId,
    state: stateKey,
    origin: "production-state-owner",
    state_owner: control.component.stateOwner,
    entry_condition: state.entryConditions,
    exit_condition: state.exitConditions,
    visual_delta: state.visualDelta,
    semantic_delta: state.semanticDelta,
    allowed_actions: state.allowedActions,
    before_state_sha256: "before",
    after_state_sha256: "after",
    entry_observed: true,
    exit_observed: true,
    visual_observed: true,
    semantic_observed: true,
  };
  assert.equal(assertStateTrace({
    control,
    controlId,
    observed: {
      production_root: true,
      semantic_changed: true,
      semantic_present: true,
      visual_changed: true,
      visual_present: true,
    },
    profile: "mobile",
    stateKey,
    trace: stateTrace,
  }), true);
  assert.throws(
    () => assertStateTrace({
      control,
      controlId,
      observed: {
        production_root: true,
        semantic_changed: true,
        semantic_present: true,
        visual_changed: true,
        visual_present: true,
      },
      profile: "mobile",
      stateKey,
      trace: { ...stateTrace, visual_observed: false },
    }),
    /design_state_trace_observation_missing/u,
  );
});

test("Android frame pacing parser uses current gfxinfo frame completion timestamps", () => {
  const output = [
    "---PROFILEDATA---",
    "Flags,IntendedVsync,Vsync,OldestInputEvent,NewestInputEvent,HandleInputStart,AnimationStart,PerformTraversalsStart,DrawStart,FrameDeadline,FrameStartTime,FrameInterval,SyncQueued,SyncStart,IssueDrawCommandsStart,SwapBuffers,FrameCompleted",
    "0,1000000000,1000000000,0,0,1001000000,1002000000,1003000000,1004000000,1016666667,1000000000,16666667,1005000000,1006000000,1007000000,1010000000,1016500000",
    "0,2000000000,2000000000,0,0,2001000000,2002000000,2003000000,2004000000,2033333334,2000000000,16666667,2005000000,2006000000,2007000000,2010000000,2033000000",
    "1,3000000000,3000000000,0,0,3001000000,3002000000,3003000000,3004000000,3033333334,3000000000,16666667,3005000000,3006000000,3007000000,3010000000,3099000000",
    "---PROFILEDATA---",
  ].join("\n");
  assert.deepEqual(parseGfxinfoFrameDurations(output), [16.5, 33]);
});

test("Android build input fingerprint is deterministic and ABI-sensitive", async () => {
  const first = await androidBuildInputFingerprint("x86_64");
  const second = await androidBuildInputFingerprint("x86_64");
  const otherAbi = await androidBuildInputFingerprint("arm64-v8a");

  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.equal(first, second);
  assert.notEqual(first, otherAbi);
});

test("Android APK fingerprint ignores test-only source files", () => {
  assert.equal(isAndroidBuildInputFile("apps/mobile/src/features/tonight/TonightScreen.tsx"), true);
  assert.equal(isAndroidBuildInputFile("apps/mobile/src/features/tonight/TonightScreen.test.tsx"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/src/features/tonight/__tests__/screen.tsx"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/android/app/src/main/AndroidManifest.xml"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/expo-env.d.ts"), false);
  assert.equal(isAndroidBuildInputFile("apps/mobile/android/app/build/output.apk"), false);
});

test("Android APK fingerprint normalizes text line endings across Harness sandboxes", () => {
  const lf = normalizeAndroidBuildInputContent("apps/mobile/src/App.tsx", Buffer.from("one\ntwo\n"));
  const crlf = normalizeAndroidBuildInputContent("apps/mobile/src/App.tsx", Buffer.from("one\r\ntwo\r\n"));
  assert.deepEqual(lf, crlf);

  const binary = Buffer.from([0x0d, 0x0a, 0x00, 0xff]);
  assert.equal(normalizeAndroidBuildInputContent("apps/mobile/assets/icon.png", binary), binary);
});

test("Android UIAutomator semantic JSON accepts single-quoted XML attributes", () => {
  const testId = "tab-restoration-tonight";
  const payload = {
    schema_version: "starward-tab-restoration-state-v1",
    tab_id: "primary-tab-tonight",
    root_route: "/tonight",
  };
  const node = `<node resource-id="${testId}" content-desc='${testId}:${JSON.stringify(payload)}' />`;
  const attributes = xmlAttributes(node);

  assert.equal(attributes["resource-id"], testId);
  assert.equal(
    semanticNodeValue(attributes, testId),
    JSON.stringify(payload),
  );
});

test("design verifier emits an attributable artifact when production execution fails", async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), "starward-native-design-failure-test-"));
  try {
    const relativePath = await writeDesignFailureArtifact(
      "mobile-shell-and-preferences",
      new Error("native_bundle_failed:C:/sensitive/path"),
      {
        controls: ["profile-switcher"],
        root: testRoot,
        startedAtValue: "2026-07-25T00:00:00.000Z",
      },
    );
    const artifact = JSON.parse(await readFile(path.join(testRoot, ...relativePath.split("/")), "utf8"));

    assert.equal(artifact.schema_version, "starward-native-design-failure-evidence-v1");
    assert.equal(artifact.execution_status, "failed");
    assert.equal(artifact.diagnostic, "native_target_check_failed:native_bundle_failed");
    assert.deepEqual(artifact.controls, ["profile-switcher"]);
    assert.ok(!JSON.stringify(artifact).includes("sensitive"));

    await writeDesignFailureArtifact(
      "mobile-shell-and-preferences",
      new Error(
        "native_visual_difference_exceeded:mobile-control-exact-mobile-shell-and-preferences:"
        + "mobile-android-390-full:planning:profile-switcher",
      ),
      {
        controls: ["profile-switcher"],
        root: testRoot,
        startedAtValue: "2026-07-25T00:00:00.000Z",
      },
    );
    const attributable = JSON.parse(await readFile(path.join(testRoot, ...relativePath.split("/")), "utf8"));
    assert.equal(
      attributable.diagnostic,
      "native_target_check_failed:native_visual_difference_exceeded:"
      + "mobile-control-exact-mobile-shell-and-preferences:mobile-android-390-full:planning:profile-switcher",
    );
  } finally {
    await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("Android build cache requires matching input and APK hashes", async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), "starward-native-cache-test-"));
  const cacheRoot = path.join(testRoot, "cache");
  const sourceApkPath = path.join(testRoot, "source-app-release.apk");
  const inputSha256 = "1".repeat(64);
  const cachedApkPath = path.join(cacheRoot, inputSha256, "app-release.apk");
  try {
    await mkdir(path.dirname(sourceApkPath), { recursive: true });
    await writeFile(sourceApkPath, "release-one");
    const apkSha256 = createHash("sha256").update("release-one").digest("hex");
    await writeAndroidBuildCache(cacheRoot, { androidAbi: "x86_64", apkSha256, inputSha256, sourceApkPath });

    const hit = await readAndroidBuildCache(cacheRoot, "x86_64", inputSha256);
    assert.equal(hit?.mode, "verified-cache-hit");
    assert.equal(hit?.apkSha256, apkSha256);
    assert.equal(hit?.apkPath, cachedApkPath);
    assert.equal(await readAndroidBuildCache(cacheRoot, "arm64-v8a", inputSha256), null);

    await writeFile(cachedApkPath, "tampered-release");
    assert.equal(await readAndroidBuildCache(cacheRoot, "x86_64", inputSha256), null);
  } finally {
    await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("Android build cache keeps distinct valid inputs without overwriting", async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), "starward-native-multi-cache-test-"));
  const cacheRoot = path.join(testRoot, "cache");
  try {
    for (const [inputSha256, contents] of [["1".repeat(64), "release-one"], ["2".repeat(64), "release-two"]]) {
      const sourceApkPath = path.join(testRoot, `${inputSha256[0]}.apk`);
      await writeFile(sourceApkPath, contents);
      await writeAndroidBuildCache(cacheRoot, {
        androidAbi: "x86_64",
        apkSha256: createHash("sha256").update(contents).digest("hex"),
        inputSha256,
        sourceApkPath,
      });
    }
    assert.equal((await readAndroidBuildCache(cacheRoot, "x86_64", "1".repeat(64)))?.mode, "verified-cache-hit");
    assert.equal((await readAndroidBuildCache(cacheRoot, "x86_64", "2".repeat(64)))?.mode, "verified-cache-hit");
  } finally {
    await rm(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
