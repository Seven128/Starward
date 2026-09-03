import { createHash } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DESIGN_RESOURCE_STANDARD_PROPERTIES,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-manifest-catalog.js";
import {
  DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
  DESIGN_RESOURCE_STANDARD_CONDITION_AXES,
  DESIGN_RESOURCE_VARIATION_AXES,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-enums.js";
import {
  DESIGN_RESOURCE_MANIFEST_COLLECTIONS,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-manifest-model.js";
import {
  manifestCollectionRows,
  manifestIdentityDigest,
} from "../../../node_modules/project-tiny-context-harness/dist/lib/design-resource-fact-universe-helpers.js";

const repositoryRoot = process.cwd();
const cleanupDraftOnly = process.argv.includes("--cleanup-draft-only");
const openDesignRoot = path.resolve(process.argv[2] || "");
const outputPackageArgument = process.argv.find((item) => item.startsWith("--output-package="));
const requestedPackageRel = outputPackageArgument?.slice("--output-package=".length) ??
  "docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03";
if (!process.argv[2] && !cleanupDraftOnly) {
  throw new Error("usage: node generate-current-formal-handoff.mjs <absolute-open-design-project-or-selected-source-path> [--output-package=docs/design-resources/<new-immutable-version>]");
}

if (
  !/^docs\/design-resources\/[a-z0-9][a-z0-9-]+$/u.test(requestedPackageRel) ||
  requestedPackageRel.includes("..")
) throw new Error(`unsafe_output_package:${requestedPackageRel}`);
const packageRel = requestedPackageRel;
const packageDir = path.join(repositoryRoot, ...packageRel.split("/"));
const selectedRel = `${packageRel}/selected-source`;
const selectedDir = path.join(repositoryRoot, ...selectedRel.split("/"));
const draftRel = `${packageRel}/handoff-draft`;
const draftDir = path.join(repositoryRoot, ...draftRel.split("/"));

if (cleanupDraftOnly) {
  await removeIncompleteGeneratedDirectory(draftDir, "handoff-draft");
  process.stdout.write(`Removed published handoff draft directory: ${draftRel}\n`);
  process.exit(0);
}

if (process.argv.includes("--replace-incomplete")) {
  await removeIncompleteGeneratedDirectory(selectedDir, "selected-source");
  await removeIncompleteGeneratedDirectory(draftDir, "handoff-draft");
}
await assertEmptyDirectoryOrAbsent(selectedDir);
await assertEmptyDirectoryOrAbsent(draftDir);
await access(path.join(openDesignRoot, "coverage.json"));
await mkdir(selectedDir, { recursive: true });
await mkdir(draftDir, { recursive: true });
for (const entry of ["assets", "coverage.json", "index.html"]) {
  await cp(path.join(openDesignRoot, entry), path.join(selectedDir, entry), { recursive: true, force: false, errorOnExist: true });
}
const openDesignReadme = await access(path.join(openDesignRoot, "open-design-readme.md"))
  .then(() => "open-design-readme.md")
  .catch(() => "README.md");
await cp(path.join(openDesignRoot, openDesignReadme), path.join(selectedDir, "open-design-readme.md"), { force: false, errorOnExist: true });

const miniappTarget = "target-miniapp-field-signal-i21-selected-constraint-2026-09-03";
const miniappScope = "scope-miniapp-field-signal-i21-selected-handoff";
const miniappCondition = "condition-miniapp-field-signal-phone-source-matrix";
const designSystemId = "user:starward-mini-program-sky-canvas-field-signal-revision";
const coverageSource = JSON.parse(await readFile(path.join(selectedDir, "coverage.json"), "utf8"));
const candidateFiles = ["index.html", "assets/styles.css", "assets/app.js", "coverage.json", "open-design-readme.md"];
const candidateHashes = Object.fromEntries(await Promise.all(candidateFiles.map(async (file) => [file, await hashFile(path.join(selectedDir, ...file.split("/")))])));

const ownerForControl = (control) => {
  if (control.key === "mini-primary-navigation") return "apps/wechat-miniapp/src/components/custom-nav.tsx";
  if (control.key === "display-mode-switcher" || control.key === "settings-form") return "apps/wechat-miniapp/src/content/settings/index.tsx";
  if (control.key === "notification-feedback" || control.key === "page-state-recovery") return "apps/wechat-miniapp/src/components/status-panel.tsx";
  if (control.profile === "full-sky") return "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx";
  if (control.profile === "my") return "apps/wechat-miniapp/src/features/my/my-library-page.tsx";
  if (control.key.startsWith("profile-")) return "apps/wechat-miniapp/src/content/profile/links/index.tsx";
  if (control.key.startsWith("import-")) return "apps/wechat-miniapp/src/content/import/index.tsx";
  if (control.profile === "contribution") return "apps/wechat-miniapp/src/content/contribution/index.tsx";
  if (control.key.startsWith("spot-search") || control.key === "map-search-entry") return "apps/wechat-miniapp/src/pages/map/search-page.tsx";
  if (control.key.includes("time-") || control.key === "sky-time-scrubber") return "apps/wechat-miniapp/src/pages/map/time-ruler.tsx";
  if (control.key.startsWith("spot-") || control.key.startsWith("map-spot-") || control.key === "guide-article-viewer" || control.key === "sky-professional-matrix" || control.key === "sky-target-list") return "apps/wechat-miniapp/src/pages/map/spot-panel.tsx";
  return "apps/wechat-miniapp/src/pages/map/index.tsx";
};

const reuseForControl = (control) => {
  const key = control.key;
  if (key === "mini-primary-navigation") return { library: "Taro + existing Starward owner", component: "View/Button navigation rail", primitives: ["taro.view", "taro.button", "starward.semantic-icon"], strategy: ["reuse_existing", "extend_shared_component", "theme_with_tokens"] };
  if (key.startsWith("spot-search") || key === "map-search-entry") return { library: "Taro + existing Starward owner", component: "Input/Button/ScrollView search composition", primitives: ["taro.input", "taro.button", "taro.scroll-view", "starward.semantic-icon"], strategy: ["reuse_existing", "compose_existing", "theme_with_tokens"] };
  if (key === "map-spot-information-panel" || key === "map-spot-panel-handle") return { library: "bounded Taro/Starward substrate", component: "retained panel document with explicit handle-only gesture owner", primitives: ["taro.view", "taro.button", "taro.scroll-view", "starward.bottom-presentation-coordinator"], strategy: ["reuse_existing", "compose_existing", "extend_shared_component", "theme_with_tokens"] };
  if (key === "map-layer-selector" || key === "map-analysis-focus-layer") return { library: "bounded Taro/Starward substrate", component: "bottom layer sheet", primitives: ["taro.view", "taro.button", "starward.bottom-presentation-coordinator", "starward.semantic-icon"], strategy: ["reuse_existing", "compose_existing", "theme_with_tokens"] };
  if (key.includes("time-") || key === "sky-time-scrubber") return { library: "Taro platform primitive", component: "enhanced horizontal ScrollView", primitives: ["taro.scroll-view", "starward.curved-time-projection"], strategy: ["reuse_existing", "extend_shared_component", "theme_with_tokens"] };
  if (key === "display-mode-switcher") return { library: "Taro + existing Starward owner", component: "three-position Button track", primitives: ["taro.button", "starward.display-mode-track", "starward.semantic-icon"], strategy: ["reuse_existing", "extend_shared_component", "theme_with_tokens"] };
  if (control.profile === "contribution") return { library: "Taro + existing Starward form owner", component: "Input/Textarea/Switch/Button/ScrollView form composition", primitives: ["taro.input", "taro.textarea", "taro.switch", "taro.button", "taro.scroll-view"], strategy: ["reuse_existing", "compose_existing", "extend_shared_component", "theme_with_tokens"] };
  if (control.profile === "my" || control.profile === "profile-content") return { library: "Taro + existing Starward owner", component: "View/Button/Input/Textarea/Switch composition", primitives: ["taro.view", "taro.button", "taro.input", "taro.textarea", "taro.switch", "starward.semantic-icon"], strategy: ["reuse_existing", "compose_existing", "theme_with_tokens"] };
  if (key === "notification-feedback") return { library: "existing Starward owner", component: "NotificationRegion/StatusPanel", primitives: ["starward.notification-feedback", "taro.view"], strategy: ["reuse_existing", "theme_with_tokens"] };
  return { library: "Taro + existing Starward owner", component: "View/Button/ScrollView + SemanticIcon", primitives: ["taro.view", "taro.button", "taro.scroll-view", "starward.semantic-icon"], strategy: ["reuse_existing", "extend_shared_component", "theme_with_tokens"] };
};

const frames = coverageSource.routeTopology.current.map((route) => ({
  key: `route.${safe(route.route)}`,
  duty: `Current ${route.surface} route with ${route.disposition} ownership`,
  entry: `index.html#${route.route}`,
  route_owner: route.route,
}));
const componentFamilies = coverageSource.controlDispositions.map((control) => {
  const reuse = reuseForControl(control);
  return {
    key: `control.${control.key}`,
    owner: ownerForControl(control),
    states: ["declared-state-matrix"],
    data: `${control.profile} product state through the owning Starward store/coordinator`,
    behavior: `Preserve ${control.key} at ${control.locator}; library=${reuse.library}; component=${reuse.component}; the library supplies generic mechanics only and Starward retains Control semantics, exact tokens, state, recovery and acceptance.`,
    primitives: reuse.primitives,
    strategy: reuse.strategy,
  };
});

const handoffSpec = {
  schema_version: "starward-field-signal-i21-implementation-handoff-spec-v1",
  status: "selected-implementation-constraint",
  authority: {
    design_system_target: "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02",
    design_system_owner: "DESIGN.md#wechat-mini-program--sky-canvas-field-signal",
    product_surface_owners: [
      "project_context/areas/main/screen-contracts/wechat-miniapp.md",
      "project_context/areas/main/screen-contracts/wechat-miniapp/surfaces-and-controls.md",
      "project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md",
    ],
    rule: "The selected prototype and this handoff constrain visible UI/UX. DESIGN.md remains the sole exact visual authority; Context and production owners retain product, data, permission, draft, transport and recovery truth.",
  },
  global_rules: [
    "Use one retained spot document across extents; extent crops presentation and never creates three rendering/state owners.",
    "A Map frame has exactly one bottomPresentation value: none, spot-panel or layer-sheet.",
    "Use objective facts only; ordinary absent values are 暂无数据 and must remain distinct from loading, permission, stale, error and risk.",
    "Hide scrollbar chrome everywhere on phone surfaces without disabling touch, wheel, keyboard, programmatic or screen-reader scrolling.",
    "Keep compact visible geometry with at least 88rpx semantic touch targets, exact density hierarchy and reduced-motion/transparency alternatives.",
    "Reuse mature compatible primitives through one Starward adapter; do not copy library brand defaults, install a second icon/suite, or let library state replace Product/Context owners.",
    "Use the existing bounded Taro/Starward substrate selected after package inspection; @taroify/core@1.0.6 is not admitted because its mandatory icon dependency conflicts with the exclusive SemanticIcon boundary.",
    "Keep SemanticIcon as the only icon boundary and Taro enhanced horizontal ScrollView as the curved-time-ruler physics owner.",
    "Map and My remain the only primary Mini Program destinations; all other current routes are drilldowns.",
  ],
  targets: {
    miniapp: {
      target_ref: miniappTarget,
      platform: "WeChat Mini Program through the current Taro/React production owner",
      canonical_entry: "index.html",
      entries: ["index.html"],
      frames,
      component_families: componentFamilies,
    },
  },
};

await writeJson(path.join(selectedDir, "implementation-handoff-spec.json"), handoffSpec);
await cp(path.join(repositoryRoot, "DESIGN.md"), path.join(selectedDir, "design-system-snapshot.md"));
await writeJson(path.join(selectedDir, "artifact-manifest.json"), {
  schema_version: "starward-field-signal-i21-selected-artifact-v1",
  status: "selected-formal-implementation-constraint",
  selected_at: "2026-09-03",
  target_ref: miniappTarget,
  canonical_entry: "index.html",
  candidate_hashes: candidateHashes,
  coverage: coverageSource.inventorySummary,
  provider: {
    name: "Open Design",
    version: "0.21.1",
    project: "starward-miniapp-field-signal-all-resources",
    conversation: "4f290527-9979-4b24-b92c-8365b470bf9d",
    material_run: "b9459565-55ac-47c9-8876-296af2a2ce7e",
    mechanical_conformance_run: "e2607c5d-52fa-4bea-b6c3-d3fa966432a6",
    design_system_id: designSystemId,
    design_system_digest: "c8ed87d21bf9f3b4298b7b5a8435f9ea897ed5c2bed8294cb63713e1ccae8969",
    plugin: null,
    snapshot: null,
  },
  exclusions: ["production conformance", "release readiness", "pixel-exact implementation acceptance", "live data or native WEAPP capability proof"],
});
await writeJson(path.join(selectedDir, "authority-delta.json"), {
  schema_version: "design-authority-delta-assessment-v1",
  assessment: "consistent_with_current_authority",
  based_on: {
    format_version: 1,
    entry_path: "DESIGN.md",
    manifest_path: null,
    closure_digest: "sha256:70e59fbc19d85c4062b3ed10d14a9368d9deda5501dfdd50898a5f73c271bfd2",
    revision: "2.0"
  },
  evidence: {
    tokens: ["type hierarchy 18/25→9.5/13.5", "related/group/section spacing 3–5px/6–8px/11–14px", "radius-panel 20rpx", "sky-soft #F5F6FF", "88rpx minimum touch target"],
    components: ["map-spot-information-panel", "map-layer-selector", "Curved Time Ruler", "display-mode-switcher", "Compact Contribution Intake", "SemanticIcon"],
    rules: ["DESIGN.md#45-开源组件复用与设计权威边界", "DESIGN.md#5a-map--search--spot-information-产品-ui-合同", "DESIGN.md#5b-settings-与-my", "DESIGN.md#5c-compact-contribution-intake", "docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md#11-production-component-reuse-map"]
  },
  observed_variances: []
});
await writeUtf8(path.join(selectedDir, "selection-and-qa.md"), `# I21 选定依据与资源 QA\n\n- 选择：用户明确授权本轮候选通过严格审计后由 DRA 直接选择并跑完整流程；当前 I21 候选满足 13 项需求及组件库复用补充，前五轮候选仅保留为 rejected evidence。\n- 分类：微信小程序 implementation constraint；不是 pixel-exact production target，也不是生产验收。\n- 资源：Open Design 0.21.1，同一 current project；material run b9459565-55ac-47c9-8876-296af2a2ce7e，mechanical conformance run e2607c5d-52fa-4bea-b6c3-d3fa966432a6。\n- 静态闭包：5/5 Product Surfaces、9/9 current routes、62/62 material Controls；retired/prohibited/unresolved 均为 0；Provider/repository/HTTP review bytes 一致。\n- Browser：Search 原子 focus/blur 与无图 full-width、panel handle/body/media/rail、layer互斥、时间尺拖动、三态 direct/drag、Contribution validation/upload/terminal submit、9-route 320–430px/100–200% text、三主题、reduced motion/transparency、hidden scrollbars及 clean console 均已独立复验。\n- 复用边界：@taroify/core@1.0.6 为 research-qualified preferred generic substrate；未在本 DRA 安装。生产 package/license/lock/tree-shaking/bundle/WEAPP/IME/safe-area/a11y/gesture 仍须独立证明。\n- Preflight 只证明所选 Source、Fact universe 与技术可行性输入的闭包；不证明生产一致性。\n`);
await writeUtf8(path.join(selectedDir, "proposal-reconciliation-index.md"), `# I21 需求与所选资源对账\n\n本文件一次性对账用户本轮 11 项、Contribution 表单补充与成熟组件库 reuse-first 补充。全部接受项已经先进入 owning Context / DESIGN，再进入同一 current Open Design project；没有新的 visible decision。\n\n1. spot panel 三档保留同一 objective document，仅 extent 裁剪；合法媒体是 medium→large 的唯一 presentation 例外。\n2. action rail 缩短；普通缺失值统一为“暂无数据”。\n3. section rail 两项与容器上下贴紧、无阴影、垂直居中且不占内容宽度。\n4. Curved Time Ruler 上移、无箭头/外框并真实可拖；滚动物理由 Taro enhanced ScrollView 复用。\n5. Search 文字/框架静止，suggestion/filter/partition 节奏紧凑且密而不挤。\n6. medium→large 先拉出媒体，接近顶端再淡出 Search/Location/Layer。\n7. 只有 104×40rpx handle rectangle 启动拖动；无媒体保留 40rpx band，有媒体时连续收起。\n8. spot panel 与 layer sheet 共用单一 bottomPresentation enum，任何时刻只呈现一个。\n9. active 采用极浅 sky-soft，几何不跳。\n10. Settings 使用一个 day/night/observation 三站可点/可拖/可访问控件。\n11. My 只丰富既有职责，使用统一彩色 SemanticIcon tile 与紧凑行节奏。\n12. Contribution 重新组织为单一紧凑表单文档，覆盖双入口 context、条件位置、媒体、权利、校验、恢复、幂等提交与待审核终态。\n13. 通用组件按成熟开源组件 reuse-first：优先 Taroify；每项显式记录 library / component / Starward adaptation；不复制品牌、不并行两套 suite、不让组件库接管业务状态。\n\n可编辑上游仍是 current Open Design project + owning Context/DESIGN。后续修改必须发布新的 immutable selected version，不能覆盖本目录。\n`);
await writeUtf8(path.join(selectedDir, "README.md"), `# Field Signal I21 selected implementation resource\n\n这是 2026-09-03 选定的不可变微信小程序 UI/UX implementation constraint。\n\n- Canonical entry: index.html\n- Runtime dependencies: assets/styles.css + assets/app.js\n- Complete candidate inventory: coverage.json\n- Library/component/Starward mapping: implementation-handoff-spec.json\n- Design Authority assessment: authority-delta.json\n- Formal handoff: ../selected-handoff/miniapp-field-signal-i21-current.md\n\n设计资源展示 Starward UI/UX；技术映射说明成熟组件如何在现有 owner 下复用。生产实现、依赖安装、真实 WEAPP 兼容性与生产验收均未在本 DRA 内完成。\n`);

if (packageRel !== "docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03") {
  await writeUtf8(path.join(selectedDir, "selection-and-qa.md"), `# I21 immutable implementation binding QA\n\n- 原始视觉方向及 canonical bytes 仍是 2026-09-03 明确选定的 I21 constraint；本版本不增加 visible decision。\n- 本版本仅重新冻结当前生产 substrate、route/component owners、Source digests 与 implementation feasibility。\n- 生产 package inspection 发现 @taroify/core@1.0.6 的 mandatory icon dependency 与 SemanticIcon 唯一 owner 冲突，因此采用现有 bounded Taro/Starward substrate。\n- 5/5 Product Surfaces、9/9 current routes、62/62 material Controls 与原选定 Fact universe 保持完整；真实 WEAPP/IME/safe-area/a11y/gesture 继续由当前候选验证。\n- Bundle/preflight 只证明 Source closure 与 input integrity，不证明生产一致性或 readiness。\n`);
  await writeUtf8(path.join(selectedDir, "proposal-reconciliation-index.md"), `# I21 implementation-binding reconciliation\n\n原 2026-09-03 I21 视觉方向、5 Surfaces、9 routes、62 Controls、conditions、Facts 与 proof obligations 均保持不变。\n\n本不可变版本只对账当前实现：Search、Map-owned spot panel、Curved Time Ruler、full-sky、My、Profile Links、Import、Settings 与 Contribution 已映射到当前真实 Taro/Starward owners；@taroify/core 候选因 mandatory icon dependency 与 SemanticIcon 唯一 owner 冲突而未采用。\n\n可编辑上游仍是 current Open Design project + owning Context/DESIGN；后续变化继续发布新的 immutable version，不能覆盖本目录。\n`);
  await writeUtf8(path.join(selectedDir, "README.md"), `# Field Signal I21 immutable implementation binding\n\n本目录复用 2026-09-03 已选定且 byte-equivalent 的 I21 canonical UI/UX constraint，并在 2026-09-04 重新冻结当前生产实现 owners 与 feasibility。\n\n- Canonical entry: index.html\n- Runtime dependencies: assets/styles.css + assets/app.js\n- Complete candidate inventory: coverage.json\n- Current library/component/Starward mapping: implementation-handoff-spec.json\n- Design Authority assessment: authority-delta.json\n- Formal handoff: ../selected-handoff/miniapp-field-signal-i21-current.md\n\n这是 Source/input closure，不是生产一致性、真机验收或发布 readiness。\n`);
}

const targetConfigs = [
  {
    id: "miniapp",
    targetKey: miniappTarget,
    scopeKey: miniappScope,
    conditionKey: miniappCondition,
    sourceProfileKind: "implementation_app",
    canonicalEntry: "index.html",
    entryFiles: ["index.html"],
    metadataFiles: [],
    frameSpecs: handoffSpec.targets.miniapp.frames,
    familySpecs: handoffSpec.targets.miniapp.component_families,
    viewport: { width: 390, height: 844 },
    platform: "wechat-mini-program",
    formFactor: "phone",
    inputMethod: "touch",
    assistiveTechnology: "wechat-accessibility-semantics",
    componentRoots: [
      "apps/wechat-miniapp/src/components",
      "apps/wechat-miniapp/src/features",
      "apps/wechat-miniapp/src/pages",
      "apps/wechat-miniapp/src/sky",
      "apps/wechat-miniapp/src/content",
    ],
    routeRoots: [
      "apps/wechat-miniapp/src/pages",
      "apps/wechat-miniapp/src/sky",
      "apps/wechat-miniapp/src/content",
      "apps/wechat-miniapp/src/features",
    ],
    technicalSources: [
      ["source.miniapp.platform", "apps/wechat-miniapp/project.config.json", ["technical_platform"]],
      ["source.miniapp.package", "apps/wechat-miniapp/package.json", ["framework_runtime", "ui_system", "capability_basis"]],
      ["source.miniapp.tokens", "apps/wechat-miniapp/src/styles/tokens.scss", ["token_theming_adapter", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.routes", "apps/wechat-miniapp/src/app.config.ts", ["route_owner", "capability_basis"]],
      ["source.miniapp.architecture", "project_context/architecture.md", ["ui_system", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.shared-state", "project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md", ["ui_system", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.implementation-index", "project_context/areas/main/implementation-index.md", ["feasibility_basis", "capability_basis"]],
      ["source.miniapp.map", "apps/wechat-miniapp/src/pages/map/index.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.status", "apps/wechat-miniapp/src/components/status-panel.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.asset", "apps/wechat-miniapp/src/components/semantic-asset.tsx", ["ui_system", "component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.sky", "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.my", "apps/wechat-miniapp/src/features/my/my-library-page.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.contribution", "apps/wechat-miniapp/src/content/contribution/index.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.settings", "apps/wechat-miniapp/src/content/settings/index.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.nav", "apps/wechat-miniapp/src/components/custom-nav.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
    ],
    observationValues: {
      platform: { kind: "identifier", name: "wechat-mini-program", version_source_ref: "source.miniapp.platform" },
      framework_runtime: { kind: "identifier", name: "taro-react", version_source_ref: "source.miniapp.package" },
      ui_system: { kind: "identifier", name: "starward-local-components-on-bounded-taro-substrate", version_source_ref: "source.miniapp.architecture" },
      token_theming_adapter: { kind: "repository_paths", paths: ["apps/wechat-miniapp/src/styles/tokens.scss"] },
    },
  },
];

const results = [];
for (const config of targetConfigs) {
  results.push(await generateTarget(config));
}

process.stdout.write(`${JSON.stringify({ selected_source: selectedRel, draft_dir: draftRel, targets: results }, null, 2)}\n`);

async function generateTarget(config) {
  const sourceItems = sourceItemsFor(config.id);
  const infrastructure = {
    integrity: `${config.id}-resource-integrity.json`,
    contractValues: `${config.id}-contract-values.json`,
    proofParameters: `${config.id}-proof-parameters.json`,
    environment: `${config.id}-render-environment.json`,
    inspector: `${config.id}-frozen-inspector.mjs`,
    oracle: `${config.id}-frozen-oracle.mjs`,
    manifest: `${config.id}-fact-manifest.json`,
    feasibility: `${config.id}-implementation-feasibility.json`,
  };

  const canonicalFiles = unique([
    ...config.entryFiles,
    ...config.metadataFiles,
    "assets/styles.css",
    "assets/app.js",
    "coverage.json",
    "artifact-manifest.json",
    "implementation-handoff-spec.json",
    "design-system-snapshot.md",
    "authority-delta.json",
    "proposal-reconciliation-index.md",
    "open-design-readme.md",
    "selection-and-qa.md",
    "README.md",
  ]).sort();

  const materialFiles = new Set(canonicalFiles.filter((file) =>
    config.entryFiles.includes(file) ||
    file === "assets/styles.css" ||
    file === "assets/app.js" ||
    file === "coverage.json" ||
    file === "implementation-handoff-spec.json" ||
    file === "design-system-snapshot.md",
  ));

  const inputHashes = {};
  for (const file of canonicalFiles) inputHashes[file] = await hashFile(path.join(selectedDir, ...file.split("/")));

  const packageSubject = {
    key: `subject.${config.id}.selected-package`,
    kind: "surface",
    stable_keys: [`selected-resource.${config.id}.complete-package`],
    states: ["declared-state-matrix"],
    descriptor: {
      role: "complete selected implementation-constraint package",
      resources: Object.fromEntries([...materialFiles].sort().map((file) => [file, inputHashes[file]])),
    },
    resourceFile: null,
  };
  const resourceSubjects = [packageSubject];
  const frameSubjects = config.frameSpecs.map((frame) => ({
    key: `subject.${config.id}.frame.${safe(frame.key)}`,
    kind: "surface",
    stable_keys: [frame.key],
    states: ["declared-state-matrix"],
    descriptor: frame,
    resourceFile: "implementation-handoff-spec.json",
  }));
  const familySubjects = config.familySpecs.map((family) => ({
    key: `subject.${config.id}.${family.key}`,
    kind: "component_family",
    stable_keys: [family.key],
    states: ["declared-state-matrix"],
    descriptor: family,
    resourceFile: "implementation-handoff-spec.json",
  }));
  const subjectSpecs = [...resourceSubjects, ...frameSubjects, ...familySubjects];

  const contractValues = { schema_version: "starward-design-constraint-values-v1", target_ref: config.targetKey, values: {} };
  for (const subject of subjectSpecs) {
    contractValues.values[subject.key] = {};
    for (const state of subject.states) {
      contractValues.values[subject.key][state] = sha256(Buffer.from(JSON.stringify({ descriptor: subject.descriptor, state }), "utf8"));
    }
  }
  await writeJson(path.join(selectedDir, infrastructure.contractValues), contractValues);

  await writeJson(path.join(selectedDir, infrastructure.integrity), {
    schema_version: "starward-selected-resource-integrity-v1",
    algorithm: "sha256",
    target_ref: config.targetKey,
    resources: Object.fromEntries(canonicalFiles.map((file) => [file, { path: `${selectedRel}/${file}`, sha256: inputHashes[file] }])),
  });
  await writeJson(path.join(selectedDir, infrastructure.proofParameters), { asset_integrity: "exact-selected-source-value-v1" });
  await writeJson(path.join(selectedDir, infrastructure.environment), {
    identity: `${config.id}-selected-source-inspection-v1`,
    description: "Exact canonical source and structured handoff value inspection; production rendering and behavior are not evaluated.",
  });

  const inspectorInputPaths = [...canonicalFiles, infrastructure.contractValues, infrastructure.integrity]
    .map((file) => `${selectedRel}/${file}`).sort();
  await writeUtf8(path.join(selectedDir, infrastructure.inspector), frozenInspectorSource(config.id, inspectorInputPaths));
  await writeUtf8(path.join(selectedDir, infrastructure.oracle), frozenOracleSource(config.id));

  const resourceSpecs = [];
  for (const file of canonicalFiles) {
    resourceSpecs.push({
      id: safe(file),
      key: `resource.${config.id}.${safe(file)}`,
      relativePath: file,
      role: materialFiles.has(file) ? "constraint" : "supporting",
      mediaType: mediaType(file),
    });
  }
  for (const [id, file, media] of [
    ["contract-values", infrastructure.contractValues, "application/json"],
    ["integrity", infrastructure.integrity, "application/json"],
    ["proof-parameters", infrastructure.proofParameters, "application/json"],
    ["environment", infrastructure.environment, "application/json"],
    ["inspector", infrastructure.inspector, "application/javascript"],
    ["oracle", infrastructure.oracle, "application/javascript"],
  ]) resourceSpecs.push({ id, key: `resource.${config.id}.${id}`, relativePath: file, role: "supporting", mediaType: media });

  const resourcesWithoutManifest = [];
  for (const spec of resourceSpecs) resourcesWithoutManifest.push(await buildResource(spec));
  const resourceMap = new Map(resourcesWithoutManifest.map((resource) => [resource.path.slice(selectedRel.length + 1), resource]));
  const condition = buildCondition(config);
  const axisDispositions = buildAxisDispositions(config, condition);
  const subjects = subjectSpecs.map((subject) => ({
    key: subject.key,
    kind: subject.kind,
    stable_keys: subject.stable_keys,
    target_refs: [config.targetKey],
    parent_ref: subject.kind === "component_family" ? packageSubject.key : null,
    instance_of_ref: null,
    slot_key: null,
    override_of_ref: null,
    family_ref: null,
    presence: "always",
    presence_rule_ref: null,
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [],
    census_refs: [`census.${subject.key}`],
  }));

  const variations = [];
  const variationAxisDispositions = [];
  for (const subject of subjectSpecs) {
    for (const axis of DESIGN_RESOURCE_VARIATION_AXES) {
      const isState = axis === "state";
      variationAxisDispositions.push({
        key: `variation-axis.${safe(subject.key)}.${axis}`,
        subject_ref: subject.key,
        axis,
        disposition: isState ? "applicable" : "not_applicable",
        values: (isState ? subject.states : ["not-applicable"]).map((value) => ({ key: value, census_refs: [`census.${subject.key}`] })),
        source_item_refs: sourceItems,
        basis_refs: [...sourceItems, `census.${subject.key}`],
        rationale: isState ? "Every declared handoff state is explicitly enumerated." : "This constraint subject does not declare an independent value for this variation axis.",
      });
    }
    for (const state of subject.states) {
      variations.push({
        key: `variation.${safe(subject.key)}.${safe(state)}`,
        subject_ref: subject.key,
        variant: "not-applicable",
        state,
        interaction_phase: "not-applicable",
        presence_phase: "not-applicable",
        instance_case: "not-applicable",
      });
    }
  }

  const customProperty = {
    key: "custom.constraint-source-sha256",
    family: "asset",
    dimension: "assets",
    value_kind: "digest",
    required_methods: ["asset_integrity"],
    standard: false,
    inspector_capability_refs: ["assets", "json"],
    census_refs: [`census.resource.${config.id}.${safe(infrastructure.contractValues)}`],
  };
  const properties = [...structuredClone(DESIGN_RESOURCE_STANDARD_PROPERTIES), customProperty];
  const factCells = [];
  const facts = [];
  const evidence = [];
  const proofObligations = [];
  const cellsBySubject = new Map();
  const factsBySubject = new Map();
  const contractValuesResource = `resource.${config.id}.contract-values`;
  const proofParametersResource = `resource.${config.id}.proof-parameters`;
  const environmentResource = `resource.${config.id}.environment`;
  const environmentIdentity = `${config.id}-selected-source-inspection-v1`;
  const parameterValue = "exact-selected-source-value-v1";

  for (const subject of subjectSpecs) {
    const localCells = [];
    const localFacts = [];
    for (const state of subject.states) {
      const variationRef = `variation.${safe(subject.key)}.${safe(state)}`;
      for (let index = 0; index < DESIGN_RESOURCE_STANDARD_PROPERTIES.length; index += 1) {
        const property = DESIGN_RESOURCE_STANDARD_PROPERTIES[index];
        const cellKey = `cell.${safe(subject.key)}.${safe(state)}.p${String(index).padStart(3, "0")}`;
        factCells.push({
          key: cellKey,
          subject_ref: subject.key,
          target_ref: config.targetKey,
          condition_ref: config.conditionKey,
          variation_ref: variationRef,
          property_ref: property.key,
          disposition: "not_applicable",
          fact_ref: null,
          source_item_refs: sourceItems,
          basis_refs: [...sourceItems, `census.${subject.key}`],
          rationale: "This selected resource is an implementation constraint rather than a pixel-exact target; exact production property conformance is not asserted by this subject.",
        });
        localCells.push(cellKey);
      }
      const cellKey = `cell.${safe(subject.key)}.${safe(state)}.constraint-digest`;
      const factKey = `fact.${safe(subject.key)}.${safe(state)}.constraint-digest`;
      const evidenceKey = `evidence.${safe(subject.key)}.${safe(state)}.constraint-digest`;
      const proofKey = `proof.${safe(subject.key)}.${safe(state)}.constraint-digest`;
      const pointer = `/values/${escapePointer(subject.key)}/${escapePointer(state)}`;
      const digestValue = contractValues.values[subject.key][state];
      const located = locatedJsonString(contractValuesResource, pointer, digestValue);
      factCells.push({
        key: cellKey,
        subject_ref: subject.key,
        target_ref: config.targetKey,
        condition_ref: config.conditionKey,
        variation_ref: variationRef,
        property_ref: customProperty.key,
        disposition: "covered",
        fact_ref: factKey,
        source_item_refs: sourceItems,
        basis_refs: [...sourceItems, `census.${subject.key}`, `census.resource.${config.id}.${safe(infrastructure.contractValues)}`],
        rationale: "The selected source constraint for this subject and state has one exact structured value digest.",
      });
      localCells.push(cellKey);
      evidence.push({ key: evidenceKey, resource_ref: contractValuesResource, kind: "asset", locator: { kind: "json_pointer", value: pointer }, condition_refs: [config.conditionKey] });
      facts.push({
        key: factKey,
        cell_ref: cellKey,
        subject_ref: subject.key,
        target_ref: config.targetKey,
        condition_ref: config.conditionKey,
        variation_ref: variationRef,
        property_ref: customProperty.key,
        dimension: "assets",
        observation_scope: "subject",
        observation_sensitivity: "plain",
        value_kind: "digest",
        value: located,
        evidence_refs: [evidenceKey],
        source_item_refs: sourceItems,
        lineage: { design_system_ref: null, token_chain_refs: [], override_chain_refs: [], resolved_value: located, conflict_status: "none", conflict_resolution: "" },
      });
      localFacts.push(factKey);
      proofObligations.push({
        key: proofKey,
        fact_ref: factKey,
        method: "asset_integrity",
        comparison: {
          comparator: "asset_equal",
          mode: "exact",
          parameters: locatedJsonString(proofParametersResource, "/asset_integrity", parameterValue),
          tolerance: null,
          mask: null,
        },
        oracle_ref: `oracle.${config.id}.asset-integrity`,
        environment_ref: `environment.${config.id}.selected-source`,
      });
    }
    cellsBySubject.set(subject.key, localCells);
    factsBySubject.set(subject.key, localFacts);
  }

  const packageFact = facts.find((fact) => fact.subject_ref === packageSubject.key);
  for (const file of [...materialFiles].sort()) {
    const resource = resourceMap.get(file);
    const evidenceKey = `evidence.${config.id}.package-member.${safe(file)}`;
    evidence.push({
      key: evidenceKey,
      resource_ref: resource.key,
      kind: "asset",
      locator: { kind: "whole_resource", value: "." },
      condition_refs: [config.conditionKey],
    });
    packageFact.evidence_refs.push(evidenceKey);
  }

  const packageFactRefs = factsBySubject.get(packageSubject.key);
  const packageCellRefs = cellsBySubject.get(packageSubject.key);
  const allCells = factCells.map((cell) => cell.key);
  const allFacts = facts.map((fact) => fact.key);
  const census = [];
  for (const resource of resourcesWithoutManifest) {
    const file = resource.path.slice(selectedRel.length + 1);
    const isMaterial = materialFiles.has(file);
    census.push({
      key: `census.resource.${config.id}.${safe(file)}`,
      kind: "resource",
      resource_ref: resource.key,
      locator: { kind: "whole_resource", value: "." },
      disposition: isMaterial ? "covered" : "non_material",
      fact_refs: isMaterial ? packageFactRefs : [],
      fact_cell_refs: isMaterial ? packageCellRefs : [],
      source_item_refs: sourceItems,
      basis_refs: sourceItems,
      rationale: isMaterial ? "Member of the complete selected package whose exact aggregate identity is one canonical constraint Fact." : "Provider metadata, proof support, provenance or inspector infrastructure without an independent UI constraint subject.",
    });
  }
  for (const subject of [packageSubject, ...frameSubjects, ...familySubjects]) {
    const isPackage = subject === packageSubject;
    census.push({
      key: `census.${subject.key}`,
      kind: isPackage ? "asset_reference" : "node",
      resource_ref: isPackage ? resourceMap.get(infrastructure.integrity).key : resourceMap.get("implementation-handoff-spec.json").key,
      locator: isPackage ? { kind: "whole_resource", value: "." } : { kind: "json_pointer", value: subject.kind === "surface" ? `/targets/${config.id}/frames` : `/targets/${config.id}/component_families` },
      disposition: "covered",
      fact_refs: factsBySubject.get(subject.key),
      fact_cell_refs: cellsBySubject.get(subject.key),
      source_item_refs: sourceItems,
      basis_refs: sourceItems,
      rationale: isPackage ? "The integrity index enumerates every material package member without sampling or truncation." : "The structured handoff explicitly enumerates this material subject and its complete declared state matrix.",
    });
  }
  const contractValuesCensus = census.find((row) => row.key === `census.resource.${config.id}.${safe(infrastructure.contractValues)}`);
  contractValuesCensus.fact_refs = allFacts;
  contractValuesCensus.fact_cell_refs = allCells;
  contractValuesCensus.disposition = "covered";
  contractValuesCensus.rationale = "Canonical located values for every selected constraint subject and state.";
  for (const proofSupportFile of [infrastructure.proofParameters, infrastructure.environment]) {
    const proofSupportCensus = census.find((row) => row.key === `census.resource.${config.id}.${safe(proofSupportFile)}`);
    proofSupportCensus.fact_refs = allFacts;
    proofSupportCensus.fact_cell_refs = allCells;
    proofSupportCensus.disposition = "covered";
    proofSupportCensus.rationale = "Shared comparison or environment authority for every declared proof obligation.";
  }

  const inspectorResource = resourcesWithoutManifest.find((resource) => resource.path.endsWith(`/${infrastructure.inspector}`));
  const oracleResource = resourcesWithoutManifest.find((resource) => resource.path.endsWith(`/${infrastructure.oracle}`));
  const designSystemResource = resourceMap.get("design-system-snapshot.md");
  const inspector = {
    trust: "frozen_executable",
    identity: `starward-field-signal-i21-${config.id}-constraint-inspector`,
    version: "1.0.0",
    implementation_sha256: inspectorResource.sha256,
    capability_refs: [...DESIGN_RESOURCE_INSPECTOR_CAPABILITIES],
    entry_resource_ref: resourceMap.get(config.canonicalEntry).key,
    input_resources: resourcesWithoutManifest.map((resource) => ({ resource_ref: resource.key, path: resource.path, sha256: resource.sha256 })),
    traversal: "complete_enumeration",
    dynamic_discovery: "fully_enumerated",
    census,
  };

  const coverage = [];
  for (const dimension of unique(DESIGN_RESOURCE_STANDARD_PROPERTIES.map((property) => property.dimension))) {
    const dimensionProperties = DESIGN_RESOURCE_STANDARD_PROPERTIES.filter((property) => property.dimension === dimension).map((property) => property.key);
    const cells = factCells.filter((cell) => dimensionProperties.includes(cell.property_ref));
    coverage.push({
      key: `coverage.${config.id}.${dimension}.constraint-not-exact`,
      subject_refs: subjects.map((subject) => subject.key),
      dimension,
      disposition: "not_applicable",
      target_refs: [config.targetKey],
      condition_refs: [config.conditionKey],
      variation_refs: variations.map((variation) => variation.key),
      property_refs: dimensionProperties,
      evidence_refs: [],
      fact_cell_refs: cells.map((cell) => cell.key),
      fact_refs: [],
      proof_obligation_refs: [],
      source_item_refs: sourceItems,
      verification_methods: [],
      rationale: "The target is a selected implementation constraint; exact production property conformance remains outside this handoff classification.",
    });
  }
  coverage.push({
    key: `coverage.${config.id}.assets.selected-constraint-values`,
    subject_refs: subjects.map((subject) => subject.key),
    dimension: "assets",
    disposition: "covered",
    target_refs: [config.targetKey],
    condition_refs: [config.conditionKey],
    variation_refs: variations.map((variation) => variation.key),
    property_refs: [customProperty.key],
    evidence_refs: evidence.map((item) => item.key),
    fact_cell_refs: factCells.filter((cell) => cell.disposition === "covered").map((cell) => cell.key),
    fact_refs: allFacts,
    proof_obligation_refs: proofObligations.map((item) => item.key),
    source_item_refs: sourceItems,
    verification_methods: ["asset_integrity"],
    rationale: "Every material selected resource, surface, family and declared state has one exact canonical constraint-value identity and proof obligation.",
  });

  const manifestBase = {
    schema_version: "design-resource-observable-fact-manifest-v1",
    scope_key: config.scopeKey,
    target_key: config.targetKey,
    inspector,
    design_system: { disposition: "used", id: designSystemId, revision: designSystemResource.sha256, resource_ref: designSystemResource.key, sha256: designSystemResource.sha256 },
    axis_dispositions: axisDispositions,
    condition_exclusions: [],
    conditions: [condition],
    subjects,
    variation_axis_dispositions: variationAxisDispositions,
    variation_exclusions: [],
    variations,
    properties,
    lineage_nodes: [],
    fact_cells: factCells,
    facts,
    evidence,
    proof_obligations: proofObligations,
    oracles: [{ key: `oracle.${config.id}.asset-integrity`, trust: "frozen_executable", identity: `starward-field-signal-i21-${config.id}-constraint-oracle`, version: "1.0.0", sha256: oracleResource.sha256, capability_refs: ["assets", "json"] }],
    environments: [{ key: `environment.${config.id}.selected-source`, identity: environmentIdentity, definition: locatedJsonString(environmentResource, "/identity", environmentIdentity) }],
    asset_bindings: [],
    acceptance_blockers: [],
  };
  const collectionRows = manifestCollectionRows(manifestBase);
  const generation = {
    strategy: "complete_explicit",
    sampling: "forbidden",
    truncation: "forbidden",
    chunk_count: 1,
    chunk_indexes: [0],
    collections: DESIGN_RESOURCE_MANIFEST_COLLECTIONS.map((name) => ({ name, expected_count: collectionRows.get(name).length, identity_sha256: manifestIdentityDigest(collectionRows.get(name)) })),
  };
  const manifest = { schema_version: manifestBase.schema_version, generation, ...Object.fromEntries(Object.entries(manifestBase).filter(([key]) => key !== "schema_version")) };
  await writeJson(path.join(selectedDir, infrastructure.manifest), manifest);
  const manifestSpec = { id: "manifest", key: `resource.${config.id}.manifest`, relativePath: infrastructure.manifest, role: "supporting", mediaType: "application/json" };
  const manifestResource = await buildResource(manifestSpec);
  const resources = [...resourcesWithoutManifest, manifestResource];

  const feasibility = await buildFeasibility(config, familySubjects, factsBySubject);
  await writeJson(path.join(selectedDir, infrastructure.feasibility), feasibility);
  const feasibilitySha = await hashFile(path.join(selectedDir, infrastructure.feasibility));

  const resourceFactClosure = resources.map((resource) => {
    const file = resource.path.slice(selectedRel.length + 1);
    const factRefs = materialFiles.has(file)
      ? packageFactRefs
      : [infrastructure.contractValues, infrastructure.proofParameters, infrastructure.environment].includes(file)
        ? allFacts
        : [];
    return {
      key: `closure.${config.id}.${safe(file)}`,
      resource_ref: resource.key,
      disposition: factRefs.length ? "material_with_facts" : "supporting_only",
      fact_refs: factRefs,
      inspection: { status: "complete", inspector: `starward-field-signal-i21-${config.id}-constraint-inspector@1.0.0` },
      rationale: factRefs.length ? "Owns or locates exact selected constraint-value Facts." : "Supports provenance, inspection, hydration or proof execution without owning an independent material constraint Fact.",
    };
  });

  const handoff = {
    schema_version: "design-resource-handoff-v1",
    representation: "manifest_backed",
    intent: "implementation_handoff",
    scope: {
      key: config.scopeKey,
      style_dependency: "style-bearing",
      surface_keys: [`selected-resource.${config.id}.complete-package`, ...config.frameSpecs.map((frame) => frame.key)],
      necessary_context: [
        "DESIGN.md#wechat-mini-program--sky-canvas-field-signal",
        "project_context/areas/main/screen-contracts/wechat-miniapp.md",
        "project_context/areas/main/screen-contracts/wechat-miniapp/surfaces-and-controls.md",
        "project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md",
        `${selectedRel}/implementation-handoff-spec.json`,
        "docs/architecture/wechat-miniapp-product-technical-solution.md",
      ],
      exclusions: [
        "This selected target is an implementation constraint, not a pixel-exact target.",
        "Canonical HTML fixture data is not production astronomy, weather, map, contribution or publication truth.",
        "The inspected @taroify/core mapping is not admitted because its mandatory icon dependency conflicts with the exclusive SemanticIcon owner; the bounded Taro/Starward mapping still requires current WEAPP verification.",
        "Preflight proves Source identity and declared closure; production conformance and release readiness are not evaluated.",
      ],
    },
    provenance: {
      provider: "Open Design",
      provider_version: "0.21.1",
      project: "starward-miniapp-field-signal-all-resources / conversation 4f290527-9979-4b24-b92c-8365b470bf9d",
      run: "b9459565-55ac-47c9-8876-296af2a2ce7e + mechanical e2607c5d-52fa-4bea-b6c3-d3fa966432a6",
      capability: "runnable single-entry interactive Mini Program UI/UX constraint with 5 surfaces, 9 routes, 62 controls and package-contained assets",
      agent: "codex",
      model: "gpt-5 effective family; exact runtime variant and effort unexposed",
      design_system_id: designSystemId,
    },
    technical_feasibility_inputs: [{ key: `feasibility.${config.id}`, target_ref: config.targetKey, path: `${selectedRel}/${infrastructure.feasibility}`, media_type: "application/json", sha256: feasibilitySha }],
    resources,
    targets: [{
      key: config.targetKey,
      interpretation: "constraint",
      resource_refs: resources.map((resource) => resource.key),
      condition_refs: [config.conditionKey],
      source_profile: {
        kind: config.sourceProfileKind,
        entry_resource_ref: resourceMap.get(config.canonicalEntry).key,
        dependency_resource_refs: resources.filter((resource) => resource.key !== resourceMap.get(config.canonicalEntry).key).map((resource) => resource.key),
        fact_manifest_resource_ref: manifestResource.key,
        acquisition: "complete",
      },
      selection_basis: "On 2026-09-03 the user explicitly delegated selection after strict audit and requested the complete DRA lifecycle without another candidate-approval pause; the I21 candidate passed static and independent Browser review with no new visible decision.",
    }],
    resource_fact_closure: resourceFactClosure,
    coverage,
    proposal: { reconciliation_status: "applied", path: `${selectedRel}/proposal-reconciliation-index.md`, revision: "I21-2026-09-03-complete" },
  };

  const humanItems = config.familySpecs.map((family, index) => `<!-- ty-source-item:start key=control-${config.id}-${String(index + 1).padStart(2, "0")} kind=control -->\n${family.key}: ${family.behavior} Data binding: ${family.data}. Production owner candidate: ${family.owner}. States: ${family.states.join(", ")}.\n<!-- ty-source-item:end -->`).join("\n\n");
  const markdown = `<!-- ty-source-item:start key=requirement-selected-current-resource-${config.id} kind=requirement -->\nThe Field Signal I21 resource is the explicitly selected Mini Program implementation constraint. DESIGN.md remains the exact visual owner and Context/production Source remains the product, data, permission, draft, transport and business-rule owner.\n<!-- ty-source-item:end -->\n\n<!-- ty-source-item:start key=control-development-consumption-boundary-${config.id} kind=control -->\nDevelopment must consume the complete selected Source closure, map every library/component candidate through the existing Starward owner/adapter, preserve truthful loading/partial/stale/error/permission/recovery states, and independently verify the real WEAPP route. Mature compatible controls are reuse-first; semantic mismatches use the documented bounded Taro fallback rather than another UI suite or state owner.\n<!-- ty-source-item:end -->\n\n${humanItems}\n\n\`\`\`yaml design-resource-handoff-v1\n${JSON.stringify(handoff, null, 2)}\n\`\`\`\n`;
  const draftName = `${config.id}-field-signal-i21-current.md`;
  await writeUtf8(path.join(draftDir, draftName), markdown);
  return {
    target: config.targetKey,
    manifest: `${selectedRel}/${infrastructure.manifest}`,
    feasibility: `${selectedRel}/${infrastructure.feasibility}`,
    draft: `${draftRel}/${draftName}`,
    counts: { resources: resources.length, subjects: subjects.length, variations: variations.length, fact_cells: factCells.length, facts: facts.length, proofs: proofObligations.length, families: familySubjects.length },
  };
}

async function buildFeasibility(config, familySubjects, factsBySubject) {
  const sourceRecords = [];
  for (const [key, relativePath, roles] of config.technicalSources) {
    const bytes = await readFile(path.join(repositoryRoot, ...relativePath.split("/")));
    sourceRecords.push({ key, path: relativePath, media_type: mediaType(relativePath), sha256: sha256(bytes), locator: { kind: "whole_resource", value: "." }, roles });
  }
  const sourceMap = new Map(sourceRecords.map((record) => [record.key, record]));
  const observations = [
    { kind: "platform", disposition: "observed", value: config.observationValues.platform, source_record_refs: [config.technicalSources.find((row) => row[2].includes("technical_platform"))[0]], reason: null },
    { kind: "framework_runtime", disposition: "observed", value: config.observationValues.framework_runtime, source_record_refs: [config.technicalSources.find((row) => row[2].includes("framework_runtime"))[0]], reason: null },
    { kind: "ui_system", disposition: "observed", value: config.observationValues.ui_system, source_record_refs: config.technicalSources.filter((row) => row[2].includes("ui_system")).map((row) => row[0]), reason: null },
    { kind: "token_theming_adapter", disposition: "observed", value: config.observationValues.token_theming_adapter, source_record_refs: config.technicalSources.filter((row) => row[2].includes("token_theming_adapter")).map((row) => row[0]), reason: null },
    { kind: "component_owner_roots", disposition: "observed", value: { kind: "repository_paths", paths: config.componentRoots }, source_record_refs: config.technicalSources.filter((row) => row[2].includes("component_owner")).map((row) => row[0]), reason: null },
    { kind: "route_owner_roots", disposition: "observed", value: { kind: "repository_paths", paths: config.routeRoots }, source_record_refs: config.technicalSources.filter((row) => row[2].includes("route_owner")).map((row) => row[0]), reason: null },
  ];
  const cells = config.familySpecs.map((family) => {
    const subject = familySubjects.find((item) => item.stable_keys.includes(family.key));
    const ownerSource = sourceRecords.find((record) => record.path === family.owner) || sourceRecords.find((record) => record.roles.includes("feasibility_basis"));
    const basisRefs = unique([
      ownerSource.key,
      sourceRecords.find((record) => record.roles.includes("capability_basis")).key,
      sourceRecords.find((record) => record.roles.includes("feasibility_basis")).key,
    ]);
    for (const ref of basisRefs) {
      if (!sourceMap.has(ref)) throw new Error(`missing feasibility source: ${ref}`);
    }
    const realizationKey = `realization.${config.id}.${safe(family.key)}.existing-substrate`;
    return {
      key: `feasibility-cell.${config.id}.${safe(family.key)}`,
      component_family_ref: subject.key,
      target_ref: config.targetKey,
      condition_profile_ref: `profile.${config.id}.current`,
      design_fact_refs: factsBySubject.get(subject.key),
      feasible_realizations: [{
        key: realizationKey,
        strategy_steps: family.strategy,
        primitive_refs: family.primitives,
        owner_candidates: [{ kind: "existing_path", locator: family.owner, existence: "existing" }],
        supported_customization_surfaces: ["theme_tokens", "component_variant", "composition", "content_slot", "icon_slot", "behavior_slot", "style_api"],
        feasibility_basis_refs: basisRefs,
        observed_costs: ["Requires dependency admission where the preferred package is used, one shared Starward adapter/theme projection, and mapping the selected state vocabulary to existing stores, request lifecycles and route owners."],
        observed_risks: ["Browser prototype and package metadata cannot prove native WeChat event, bundle, input-method, safe-area, accessibility or gesture behavior; the production candidate must verify these boundaries and retain the documented bounded fallback."],
      }],
      required_realization: { realization_ref: null, technical_authority_source_refs: [] },
      blocker_refs: [],
    };
  });
  return {
    schema_version: "design-resource-implementation-feasibility-v1",
    key: `feasibility.${config.id}`,
    target_ref: config.targetKey,
    realization_mode: "mapped_substrate",
    source_records: sourceRecords,
    substrate_observations: observations,
    condition_model: { kind: "explicit_conditions_v1", profiles: [{ key: `profile.${config.id}.current`, condition_refs: [config.conditionKey] }] },
    component_family_cells: cells,
    blockers: [],
  };
}

function buildCondition(config) {
  return {
    key: config.conditionKey,
    platform: config.platform,
    os_version: "current-supported-runtime",
    device_profile: "wechat-phone-source-matrix",
    form_factor: config.formFactor,
    viewport: { key: `${config.viewport.width}x${config.viewport.height}`, width: config.viewport.width, height: config.viewport.height, unit: "px" },
    orientation: "portrait",
    density: { key: "reference-css-pixel", pixel_ratio: 1 },
    safe_area: { key: "source-reference", top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    window_state: "foreground",
    fold_state: "not-applicable",
    display_mode: "wechat-mini-program",
    color_scheme: "source-declared-day-night-observation",
    locale: "zh-cn",
    language: "zh",
    script: "hans",
    direction: "ltr",
    pseudo_localization: "none",
    content_case: "realistic-labeled-fixture",
    data_case: "complete-declared-state-matrix",
    text_scale: { key: "reference-default", multiplier: 1 },
    input_method: config.inputMethod,
    assistive_technology: config.assistiveTechnology,
    motion: "default-and-reduced-declared",
    transparency: "default",
    contrast: "normal",
    bold_text: "default",
    button_shapes: "source-defined",
    system_ui: "wechat-owned-chrome",
    ime: "declared-when-text-input-active",
    permission: "declared-permission-matrix",
    capability: "declared-capability-matrix",
    connectivity: "declared-ready-partial-stale-error",
    lifecycle: "declared-initial-loading-ready-empty-partial-stale-error",
    custom_axes: [],
  };
}

function buildAxisDispositions(config, condition) {
  const sourceItems = sourceItemsFor(config.id);
  const valueByAxis = {
    platform: condition.platform, os_version: condition.os_version, device_profile: condition.device_profile,
    form_factor: condition.form_factor, viewport: condition.viewport.key, orientation: condition.orientation,
    density: condition.density.key, safe_area: condition.safe_area.key, window_state: condition.window_state,
    fold_state: condition.fold_state, display_mode: condition.display_mode, color_scheme: condition.color_scheme,
    locale: condition.locale, language: condition.language, script: condition.script, direction: condition.direction,
    pseudo_localization: condition.pseudo_localization, content_case: condition.content_case, data_case: condition.data_case,
    text_scale: condition.text_scale.key, input_method: condition.input_method, assistive_technology: condition.assistive_technology,
    motion: condition.motion, transparency: condition.transparency, contrast: condition.contrast, bold_text: condition.bold_text,
    button_shapes: condition.button_shapes, system_ui: condition.system_ui, ime: condition.ime, permission: condition.permission,
    capability: condition.capability, connectivity: condition.connectivity, lifecycle: condition.lifecycle,
  };
  return DESIGN_RESOURCE_STANDARD_CONDITION_AXES.map((axis) => ({
    key: `axis.${config.id}.${axis}`,
    target_ref: config.targetKey,
    axis,
    disposition: valueByAxis[axis] === "not-applicable" ? "not_applicable" : "applicable",
    values: [{ key: valueByAxis[axis], census_refs: [`census.resource.${config.id}.${safe(config.canonicalEntry)}`] }],
    source_item_refs: sourceItems,
    basis_refs: [...sourceItems, `census.resource.${config.id}.${safe(config.canonicalEntry)}`],
    rationale: "Explicit current selected-source condition; it is a handoff constraint and not a production-device acceptance claim.",
  }));
}

async function collectReferencedAssets(entryFiles) {
  const assets = new Set();
  for (const file of entryFiles) {
    const content = await readFile(path.join(selectedDir, ...file.split("/")), "utf8");
    for (const match of content.matchAll(/assets\/icons\/[A-Za-z0-9._/-]+/gu)) assets.add(match[0]);
  }
  return [...assets].sort();
}

function frozenInspectorSource(id, inputPaths) {
  return `import { createHash } from "node:crypto";\nimport { readFile } from "node:fs/promises";\nimport { resolve } from "node:path";\nconst INPUT_PATHS = ${JSON.stringify(inputPaths, null, 2)};\nconst root = resolve(process.argv[2] || process.cwd());\nconst resources = [];\nfor (const relativePath of INPUT_PATHS) { const bytes = await readFile(resolve(root, ...relativePath.split("/"))); resources.push({ path: relativePath, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }); }\nprocess.stdout.write(JSON.stringify({ inspector: "starward-field-signal-i21-${id}-constraint-inspector@1.0.0", traversal: "complete_enumeration", dynamic_discovery: "fully_enumerated", resources }, null, 2) + "\\n");\n`;
}

function frozenOracleSource(id) {
  return `import { createHash } from "node:crypto";\nimport { readFile } from "node:fs/promises";\nimport { resolve } from "node:path";\nconst [mode, relativePath, pointer, expected, rootArgument] = process.argv.slice(2);\nif (!mode || !relativePath || !expected) throw new Error("usage: node oracle.mjs <whole_resource|json_pointer> <path> <pointer-or-dot> <expected> [root]");\nconst root = resolve(rootArgument || process.cwd());\nconst bytes = await readFile(resolve(root, ...relativePath.split("/")));\nlet actual;\nif (mode === "whole_resource") actual = createHash("sha256").update(bytes).digest("hex");\nelse if (mode === "json_pointer") { let value = JSON.parse(bytes.toString("utf8")); for (const part of pointer.slice(1).split("/").map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) value = value[part]; actual = String(value); }\nelse throw new Error("unsupported mode");\nconst result = { oracle: "starward-field-signal-i21-${id}-constraint-oracle@1.0.0", method: "asset_integrity", comparator: "asset_equal", actual, expected, pass: actual === expected };\nprocess.stdout.write(JSON.stringify(result, null, 2) + "\\n");\nif (!result.pass) process.exitCode = 1;\n`;
}

async function buildResource(spec) {
  const absolute = path.join(selectedDir, ...spec.relativePath.split("/"));
  return {
    key: spec.key,
    role: spec.role,
    path: `${selectedRel}/${spec.relativePath}`,
    media_type: spec.mediaType,
    sha256: await hashFile(absolute),
    editable_upstream: {
      owner: spec.relativePath.endsWith(".html") || spec.relativePath.startsWith("assets/") ? "Open Design current project" : "Starward design-resource-authoring package",
      locator: spec.relativePath,
      update_route: spec.relativePath.endsWith(".html") || spec.relativePath.startsWith("assets/") ? "Revise the one current Open Design project, repeat visual review, then publish a new immutable selected Source rather than overwriting this snapshot." : "Regenerate from the selected Open Design project, current authority and this authoring script; never hand-edit an adopted immutable output.",
    },
  };
}

async function assertEmptyDirectoryOrAbsent(absolutePath) {
  try {
    await access(absolutePath);
    const entries = await readdir(absolutePath);
    if (entries.length) throw new Error(`refusing to overwrite existing immutable output: ${absolutePath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function removeIncompleteGeneratedDirectory(absolutePath, expectedLeaf) {
  const resolved = path.resolve(absolutePath);
  const expectedParent = `${path.resolve(packageDir)}${path.sep}`;
  if (!resolved.startsWith(expectedParent) || path.basename(resolved) !== expectedLeaf) {
    throw new Error(`unsafe generated-output cleanup target: ${resolved}`);
  }
  await rm(resolved, { recursive: true, force: true });
}

async function writeJson(absolutePath, value) { await writeUtf8(absolutePath, `${JSON.stringify(value, null, 2)}\n`); }
async function writeUtf8(absolutePath, content) { await mkdir(path.dirname(absolutePath), { recursive: true }); await writeFile(absolutePath, content, "utf8"); }
async function hashFile(absolutePath) { return sha256(await readFile(absolutePath)); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function safe(value) { return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-").replaceAll(/^-+|-+$/gu, "").slice(0, 120); }
function escapePointer(value) { return value.replaceAll("~", "~0").replaceAll("/", "~1"); }
function unique(values) { return [...new Set(values)]; }
function sourceItemsFor(id) { return [`requirement-selected-current-resource-${id}`, `control-development-consumption-boundary-${id}`]; }
function mediaType(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js") || file.endsWith(".mjs")) return "application/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".md")) return "text/markdown";
  if (file.endsWith(".tsx")) return "text/typescript-jsx";
  if (file.endsWith(".ts")) return "text/typescript";
  if (file.endsWith(".scss")) return "text/x-scss";
  return "application/octet-stream";
}
function locatedJsonString(resourceRef, pointer, value) { return { locator: { resource_ref: resourceRef, kind: "json_pointer", value: pointer }, sha256: sha256(Buffer.from(value, "utf8")) }; }
