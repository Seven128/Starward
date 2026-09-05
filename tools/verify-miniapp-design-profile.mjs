import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  contrastRatio,
  markdownSection,
  sha256File,
} from "./verify-miniapp-design-support.mjs";

function assertContrast(foreground, background, minimum, label) {
  const ratio = contrastRatio(foreground, background);
  assert(
    ratio + Number.EPSILON >= minimum,
    label + " contrast failed: " + ratio.toFixed(2) + ":1 < " + minimum + ":1",
  );
  return ratio;
}

async function listRelativeFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await listRelativeFiles(root, absolute));
    } else if (entry.isFile()) {
      paths.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  return paths.sort();
}

function compareCanonicalPaths(left, right) {
  const foldedLeft = left.toLowerCase();
  const foldedRight = right.toLowerCase();
  if (foldedLeft < foldedRight) return -1;
  if (foldedLeft > foldedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export async function verifyMiniappDesignProfile({ root, design }) {
  const activeResourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-design-system-2026-09-02-sky-canvas-field-signal",
  );
  const selectedRoot = path.join(activeResourceRoot, "selected-source");
  const selectedSourcePath = path.join(selectedRoot, "DESIGN.md");
  const manifestPath = path.join(activeResourceRoot, "artifact-manifest.json");
  const sourceIndexPath = path.join(activeResourceRoot, "source-index.md");
  const mapFinderSourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-map-finder-ui",
  );
  const mapFinderSourcePath = path.join(mapFinderSourceRoot, "selected-source", "DESIGN.md");
  const reviewDirectedSourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-review-directed-components",
  );
  const reviewDirectedSourcePath = path.join(
    reviewDirectedSourceRoot,
    "selected-source",
    "DESIGN.md",
  );
  const mapSearchSpotPanelSourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-map-search-spot-panel",
  );
  const mapSearchSpotPanelSourcePath = path.join(
    mapSearchSpotPanelSourceRoot,
    "selected-source",
    "DESIGN.md",
  );
  const fullscreenDensityMotionSourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-fullscreen-density-motion",
  );
  const fullscreenDensityMotionSourcePath = path.join(
    fullscreenDensityMotionSourceRoot,
    "selected-source",
    "DESIGN.md",
  );
  const compactContinuitySourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-compact-continuity",
  );
  const compactContinuitySourcePath = path.join(
    compactContinuitySourceRoot,
    "selected-source",
    "DESIGN.md",
  );
  const unifiedFlowModesSourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-unified-flow-modes",
  );
  const unifiedFlowModesSourcePath = path.join(
    unifiedFlowModesSourceRoot,
    "selected-source",
    "DESIGN.md",
  );
  const currentComponentSourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-field-signal-unified-flow-forms",
  );
  const currentComponentSourcePath = path.join(
    currentComponentSourceRoot,
    "selected-source",
    "DESIGN.md",
  );

  const legacyConstraintRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-design-system-2026-08-25-sky-canvas",
  );
  const miniappHandoffPath = path.join(
    legacyConstraintRoot,
    "technical-binding-2026-08-29-compass",
    "handoff",
    "miniapp-sky-canvas-current.md",
  );
  const operationsHandoffPath = path.join(
    legacyConstraintRoot,
    "selected-handoff",
    "operations-sky-canvas-current.md",
  );
  const miniappManifestPath = path.join(
    legacyConstraintRoot,
    "selected-source",
    "miniapp-fact-manifest.json",
  );
  const operationsManifestPath = path.join(
    legacyConstraintRoot,
    "selected-source",
    "operations-fact-manifest.json",
  );
  const miniappFeasibilityPath = path.join(
    legacyConstraintRoot,
    "technical-binding-2026-08-29-compass",
    "miniapp-implementation-feasibility.json",
  );
  const operationsFeasibilityPath = path.join(
    legacyConstraintRoot,
    "selected-source",
    "operations-implementation-feasibility.json",
  );

  const expectedSourceHash =
    "a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e";
  const expectedManifestHash =
    "d719dd753422112c4759cd77d0d9da3b7d40d5dd87b38fd3d327835f739f8bde";
  const expectedPackageDigest =
    "253fbcbfaa083aa897eca2faf5e4eb6f3b99e69da7f485d485f89881adcc8276";
  const expectedSourceIndexHash =
    "727114ee2f72f6a68a8bd0d25c4d20470ae8b0d6a0ff2bcff6d0067e367543c1";
  const expectedMapFinderSourceHash =
    "b4cd506d99caf3c5f59351f295f01cb7330ac720ce39f03abe464a143e09112e";
  const expectedReviewDirectedSourceHash =
    "c38f599e55209c942809c118d5321e598de31523ded81078ff532e900d915c62";
  const expectedMapSearchSpotPanelSourceHash =
    "52104dfa7d34e27c95f3b971c6f1e306d95aba2a5d2f1edc5c414fb51073aae4";
  const expectedFullscreenDensityMotionSourceHash =
    "c3f694450139cbfb88a875cdd0a44d1563eeb04bc546c8e6afc673134b2d3b0e";
  const expectedCompactContinuitySourceHash =
    "07f7fa28f676dc3c42608a210b57f0ae38955570e7890c6c1e64069617d1d3fc";
  const expectedUnifiedFlowModesSourceHash =
    "0f59ead2b9b0f65e07b1351f07e8e635ac8f583f4af9dc6e5e2f5f38c23319a4";
  const expectedCurrentComponentSourceHash =
    "0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4";
  const expectedCanonicalSectionHash =
    "50bf37f7050faec3793e92795ae013f670be4ac98544fcedf0e21559012621e4";
  const expectedSelectedResourceHashes = {
    miniapp_handoff: "17288e6ccc7092a5be6b1ea3bfc0ad73d0b7bea893b0e0bf1ffdc7c172426834",
    operations_handoff: "391d900dd35420bd33de29676b23a6767ba7b93fd3857bc3eec9b41bd971546f",
    miniapp_manifest: "78e569a26f268454ae968bf715ecec37d6dfa23af01b33b72479973e2f4ae3bb",
    operations_manifest: "9ad9a465ffd66dbd3d0f1b16d5cb533c6accf35838f6bf7f194604fa1acdf8f7",
    miniapp_feasibility: "48468b55e0f95fd50941761b4a7fb5dc0e39de244da6055281617bb671ff9875",
    operations_feasibility: "c63ee9eaab1322b630cb38a3438a64447d052a6cac7f31e8f7009669cd601e90",
  };

  assert.equal(
    await sha256File(selectedSourcePath),
    expectedSourceHash,
    "selected Field Signal source snapshot drifted",
  );
  assert.equal(
    await sha256File(manifestPath),
    expectedManifestHash,
    "selected Field Signal artifact manifest drifted",
  );
  assert.equal(
    await sha256File(sourceIndexPath),
    expectedSourceIndexHash,
    "selected Field Signal source index drifted",
  );
  assert.equal(
    await sha256File(mapFinderSourcePath),
    expectedMapFinderSourceHash,
    "selected Field Signal Map/Finder source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(mapFinderSourceRoot),
    ["selected-source/DESIGN.md"],
    "selected Field Signal Map/Finder source membership drifted",
  );
  assert.equal(
    await sha256File(reviewDirectedSourcePath),
    expectedReviewDirectedSourceHash,
    "selected Field Signal review-directed component source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(reviewDirectedSourceRoot),
    ["selected-source/DESIGN.md"],
    "selected Field Signal review-directed component source membership drifted",
  );
  assert.equal(
    await sha256File(mapSearchSpotPanelSourcePath),
    expectedMapSearchSpotPanelSourceHash,
    "historical Field Signal Map/Search/spot-panel source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(mapSearchSpotPanelSourceRoot),
    ["selected-source/DESIGN.md"],
    "historical Field Signal Map/Search/spot-panel source membership drifted",
  );
  assert.equal(
    await sha256File(fullscreenDensityMotionSourcePath),
    expectedFullscreenDensityMotionSourceHash,
    "historical Field Signal full-screen/density/motion source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(fullscreenDensityMotionSourceRoot),
    ["selected-source/DESIGN.md"],
    "historical Field Signal full-screen/density/motion source membership drifted",
  );
  assert.equal(
    await sha256File(compactContinuitySourcePath),
    expectedCompactContinuitySourceHash,
    "historical Field Signal compact-continuity source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(compactContinuitySourceRoot),
    ["selected-source/DESIGN.md"],
    "historical Field Signal compact-continuity source membership drifted",
  );
  assert.equal(
    await sha256File(unifiedFlowModesSourcePath),
    expectedUnifiedFlowModesSourceHash,
    "historical Field Signal unified-flow/modes source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(unifiedFlowModesSourceRoot),
    ["selected-source/DESIGN.md"],
    "historical Field Signal unified-flow/modes source membership drifted",
  );
  assert.equal(
    await sha256File(currentComponentSourcePath),
    expectedCurrentComponentSourceHash,
    "selected Field Signal current unified-flow/forms source drifted",
  );
  assert.deepEqual(
    await listRelativeFiles(currentComponentSourceRoot),
    ["selected-source/DESIGN.md"],
    "selected Field Signal current unified-flow/forms source membership drifted",
  );

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schema_version, "starward-selected-design-system-source-v1");
  assert.equal(
    manifest.active_target,
    "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02",
  );
  assert.equal(manifest.package_digest, expectedPackageDigest);
  assert.equal(manifest.source.review_revision_status, "pending-noncanonical");
  assert.equal(manifest.files.length, 23, "selected Field Signal package file count drifted");
  const canonicalManifestPaths = manifest.files
    .map((file) => file.path)
    .slice()
    .sort(compareCanonicalPaths);
  assert.deepEqual(
    manifest.files.map((file) => file.path),
    canonicalManifestPaths,
    "selected Field Signal manifest paths are not canonically ordered",
  );

  const listedPaths = manifest.files.map((file) => file.path).sort();
  assert.deepEqual(
    await listRelativeFiles(selectedRoot),
    listedPaths,
    "selected Field Signal package membership drifted",
  );
  for (const file of manifest.files) {
    const absolute = path.join(selectedRoot, ...file.path.split("/"));
    assert.equal(await sha256File(absolute), file.sha256, file.path + " digest drifted");
    assert.equal((await stat(absolute)).size, file.bytes, file.path + " byte count drifted");
  }
  const packageDigest = createHash("sha256")
    .update(
      manifest.files
        .slice()
        .sort((left, right) => compareCanonicalPaths(left.path, right.path))
        .map((file) => file.path + "\0" + file.sha256 + "\0" + file.bytes + "\n")
        .join(""),
      "utf8",
    )
    .digest("hex");
  assert.equal(packageDigest, expectedPackageDigest, "selected Field Signal package digest drifted");

  for (const [label, resourcePath, expectedHash] of [
    ["Mini Program retired handoff", miniappHandoffPath, expectedSelectedResourceHashes.miniapp_handoff],
    ["Operations selected handoff", operationsHandoffPath, expectedSelectedResourceHashes.operations_handoff],
    ["Mini Program retired Fact manifest", miniappManifestPath, expectedSelectedResourceHashes.miniapp_manifest],
    ["Operations Fact manifest", operationsManifestPath, expectedSelectedResourceHashes.operations_manifest],
    ["Mini Program retired feasibility", miniappFeasibilityPath, expectedSelectedResourceHashes.miniapp_feasibility],
    ["Operations feasibility", operationsFeasibilityPath, expectedSelectedResourceHashes.operations_feasibility],
  ]) {
    assert.equal(await sha256File(resourcePath), expectedHash, label + " drifted");
  }

  const heading = "## WeChat Mini Program — Sky Canvas Field Signal";
  const section = markdownSection(design, heading);
  assert.equal(
    createHash("sha256").update(section, "utf8").digest("hex"),
    expectedCanonicalSectionHash,
    "canonical Mini Program visual-system section drifted",
  );

  for (const required of [
    "`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`",
    "“现在这套设计系统差不多了，就选中他吧”",
    "Open Design `0.21.1`",
    "`user:starward-mini-program-sky-canvas-field-signal-revision`",
    "`ds-starward-mini-program-sky-canvas-field-signal-revision`",
    "`0bcc669b-29b2-476b-b93d-f502d7b09917`",
    "`bccaa010-a3ef-4895-9fb0-4c874239fdac`",
    "Do not append version, date or revision labels in the handbook title, navigation, component specimens or ordinary product UI",
    "`" + expectedSourceHash + "`",
    "`" + expectedManifestHash + "`",
    "`" + expectedPackageDigest + "`",
    "`" + expectedSourceIndexHash + "`",
    "`" + expectedCurrentComponentSourceHash + "`",
    "`docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md`",
    heading,
  ]) {
    assert(design.includes(required), "missing Field Signal adoption identity: " + required);
  }
  assert(
    design.includes(
      "The superseded `target.system.wechat-miniapp-sky-canvas-2026-08-25` and its immutable provider source are historical audit provenance only",
    ),
    "previous Mini Program system is not explicitly inactive rollback material",
  );

  for (const required of [
    "| canvas | `#FFFFFF` | 纯白页面与 page-like panel 背景 |",
    "| sky / sky-soft / sky-strong | `#8799F6` / `#F5F6FF` / `#4859B8` |",
    "| meteor / meteor-soft / meteor-strong | `#F2C94C` / `#FFF7D6` / `#6F5500` |",
    "| trail / trail-soft / trail-strong | `#62C88B` / `#E9F8EE` / `#1F6B45` |",
    "| risk / risk-soft / risk-strong | `#E66F66` / `#FFF0ED` / `#973D37` |",
    "四层留白",
    "compact-choice | 10.5 / 21 | 14.5px / 29rpx | 500",
    "ordinary-action | 11.5 / 23 | 16px / 32rpx | 500",
    "final-commit | 12.5 / 25 | 17px / 34rpx | 550",
    "### 5C. Compact Contribution Intake",
    "divider-backed cell row",
    "label column=`144–176rpx`",
    "Media grid 在 390px 为三列、320px/200% text 可降两列",
    "唯一 filled final commit",
    "Ant Design Mobile 的 Form/List/Selector/ImageUploader",
    "#### 4.5 开源组件复用与设计权威边界",
    "mandatory `@taroify/icons` dependency",
    "Primary navigation=`View/Button navigation rail`",
    "Contribution=`Input + Textarea + Switch + Button + ScrollView",
    "不得安装第二 icon family",
    "Generic FloatingPanel 只有在其完整 dependency closure",
    "触摸点击不留下持续焦点框",
    "Choice Bar / View Switcher",
    "46×24px",
    "full-width 长对象卡",
    "160ms standard",
    "88rpx 行/单元命中",
    "Owner instruction on 2026-09-02 retires `target-miniapp-sky-canvas-current-constraint` from current use",
    "`target-operations-sky-canvas-current-constraint` remains independently scoped to owner operations",
    "### 5A. Map / Search / Spot Information 产品 UI 合同",
    "Map entry 与 Search field 使用同一 visual frame",
    "Formal marker 默认 `32rpx` neutral core + `2rpx border-strong` + 下锚点",
    "provider/basemap/tile/native-map appearance仍不属于本系统",
    "Filters从field或overlay下沿`4–6rpx`开始，不分quick/more",
    "Selected star 为 `48rpx` 圆润五角实心 ornament",
    "Panel 是 Map-parallel non-modal owner",
    "large填满`mini-primary-navigation`上方的primary content viewport",
    "Taro enhanced horizontal `ScrollView`",
    "并隐藏纵横 scrollbar chrome",
    "Field默认autofocus",
    "两态均无trailing `x`/clear/chevron",
    "不显示“筛选条件”标题",
    "leading readable text field固定`52%`",
    "tap/release为no-op",
    "Panel body/content/media或泛化top-edge均不发起extent drag",
    "三档始终挂载同一份、同序、同identity的客观document",
    "physical hit region=`104×40rpx`",
    "无media时保留结构handle band=`40rpx`",
    "bottomPresentation = none | spot-panel | layer-sheet",
    "不为section rail预留全局列",
    "两个`52rpx`items贴紧上下边、gap=0",
    "Favorite与filter ornament共用同一rounded-star `SemanticIcon` source",
    "不由UI生成出发建议、置信评分或最佳窗口",
    "组件没有outer card/border/shadow、解释文案或visible左右arrows",
    "Visible block=`84rpx`并相对解释对象上移`16rpx`",
    "不显示左右箭头按钮",
    "固定高度bottom-sheet presentation",
    "display-mode-switcher",
    "single-choice三站滑轨",
    "restrained role-colored semantic icons",
    "普通missing值显示`暂无数据`",
    "colored-icon existing-duty My hub",
    "#### 6.2 Objective Astronomy Facts",
    "#### 6.4 Curved Time Ruler",
    "#### 6.11 Stargazing Spot Information Panel",
    "#### 6.12 Full-Sky Orientation Canvas",
    "`alpha/beta/gamma`",
    "设计资源 viewport 只显示正式产品信息结构，不写“演示数据”",
    "objective basic-plus-astronomy facts",
    "一个 transaction 最多一个 floating feedback",
  ]) {
    assert(section.includes(required), "missing Field Signal canonical contract: " + required);
  }

  const componentFamilies = [
    "#### 7.1 Button / Icon Button",
    "#### 7.2 Search Field",
    "#### 7.3 Text Input / Textarea",
    "#### 7.4 Checkbox Group",
    "#### 7.5 Radio Group",
    "#### 7.6 Switch",
    "#### 7.7 Choice Bar / View Switcher",
    "#### 7.8 List / Cell / Action Row",
    "#### 7.9 Badge / Status Tag",
    "#### 7.10 Card / Containment",
    "#### 7.11 Progress / Loading / Skeleton",
    "#### 7.12 Empty / Error / Permission Recovery",
    "#### 7.13 Toast / Snackbar",
    "#### 7.14 Dialog / Bottom Sheet",
  ];
  for (const family of componentFamilies) {
    assert(section.includes(family), "missing Field Signal component family: " + family);
  }
  assert(
    section.includes("#### 7.7A Three-State Display Mode Track"),
    "missing Field Signal three-state display-mode component",
  );

  const contrastRatios = [
    assertContrast("#282B29", "#FFFFFF", 4.5, "day text-primary/canvas"),
    assertContrast("#5E655F", "#FFFFFF", 4.5, "day text-secondary/canvas"),
    assertContrast("#6D746D", "#FFFFFF", 4.5, "day text-tertiary/canvas"),
    assertContrast("#202332", "#8799F6", 4.5, "day on-sky/sky"),
    assertContrast("#3A2E00", "#F2C94C", 4.5, "day on-meteor/meteor"),
    assertContrast("#153B2A", "#62C88B", 4.5, "day on-trail/trail"),
    assertContrast("#F5F3EC", "#11120F", 4.5, "night text-primary/canvas"),
    assertContrast("#BEC2B8", "#11120F", 4.5, "night text-secondary/canvas"),
    assertContrast("#FF6B58", "#000000", 4.5, "observation text-primary/canvas"),
    assertContrast("#D84A3C", "#000000", 4.5, "observation text-secondary/canvas"),
    assertContrast("#A83229", "#000000", 3, "observation boundary/canvas"),
  ];

  const observationSection = markdownSection(section, "#### 2.3 观测模式");
  const observationPalette = new Set([
    "#000000",
    "#110000",
    "#190000",
    "#240000",
    "#5B1712",
    "#7A1E18",
    "#A83229",
    "#C23D32",
    "#D84A3C",
    "#FF6B58",
  ]);
  for (const match of observationSection.matchAll(/#[0-9A-Fa-f]{6}/g)) {
    assert(
      observationPalette.has(match[0].toUpperCase()),
      "observation palette escapes black/warm-red closure: " + match[0],
    );
  }

  for (const forbidden of [
    "## WeChat Mini Program — Sky Canvas v1",
    "## WeChat Mini Program — Sky Canvas Field Signal v2",
    "Primary Brand Accent: #536DFE",
    "rounded rainbow-gradient star",
    "地图提供商、底图/瓦片、原生地图外观、地图标记/气泡/图例/Finder、地图专属动效",
    "任何地图视觉、地图组件或地图动效评审",
    "相对上一版 Sky Canvas 的精确增量",
  ]) {
    assert(!section.includes(forbidden), "superseded Mini Program styling leaked into Field Signal: " + forbidden);
  }

  return {
    source_digest: expectedSourceHash,
    current_component_source_digest: expectedCurrentComponentSourceHash,
    historical_unified_flow_modes_source_digest: expectedUnifiedFlowModesSourceHash,
    historical_compact_continuity_source_digest: expectedCompactContinuitySourceHash,
    historical_full_screen_density_motion_source_digest: expectedFullscreenDensityMotionSourceHash,
    historical_map_search_spot_panel_source_digest: expectedMapSearchSpotPanelSourceHash,
    historical_map_finder_source_digest: expectedMapFinderSourceHash,
    historical_review_directed_source_digest: expectedReviewDirectedSourceHash,
    canonical_section_digest: expectedCanonicalSectionHash,
    manifest_digest: expectedManifestHash,
    source_index_digest: expectedSourceIndexHash,
    package_digest: expectedPackageDigest,
    modes: ["day", "night", "observation"],
    semantic_color_families: ["sky", "meteor", "trail", "risk"],
    semantic_base_component_families: componentFamilies.length,
    contrast_pairs: contrastRatios.length,
    observation_palette: "black-warm-red-closed",
    whitespace_model: "screen-group-internal-visual-weight",
    control_visible_ladder: "28/30-34/40-44px",
    touch_target: "44px-nonoverlapping",
    focus_model: "touch-none-input-caret-keyboard-inner-edge",
    switch_geometry: "46x24px-track-20px-thumb",
    choice_motion: "160ms-transform-indicator",
    generic_component_substrate: "bounded-taro-starward-existing-owner-substrate",
    specialized_time_substrate: "taro-enhanced-scroll-view",
    second_ui_suite: "forbidden",
    previous_system_status: "historical-audit-only",
    screen_resource_status: "miniapp-retired-operations-current",
    unified_flow_forms_status: "selected-current",
    unified_flow_modes_status: "historical-audit-only",
    compact_continuity_status: "historical-audit-only",
    full_screen_density_motion_status: "historical-audit-only",
    map_search_spot_panel_status: "historical-audit-only",
    map_finder_app_ui_status: "historical-audit-only",
    review_directed_components_status: "historical-audit-only",
    provider_map_appearance_status: "excluded",
    selected_resource_hashes: expectedSelectedResourceHashes,
    app_profile_dependency: "forbidden-by-authority",
    runtime_projection: "not-claimed-conformant",
  };
}
