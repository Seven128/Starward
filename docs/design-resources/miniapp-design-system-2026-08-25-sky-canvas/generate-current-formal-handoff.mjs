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
if (!process.argv[2] && !cleanupDraftOnly) {
  throw new Error("usage: node generate-current-formal-handoff.mjs <absolute-open-design-project-path>");
}

const packageRel = "docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas";
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
await access(path.join(openDesignRoot, "artifact-manifest.json"));
await mkdir(selectedDir, { recursive: true });
await mkdir(draftDir, { recursive: true });
const providerInternalEntries = new Set([".file-versions", ".od-skills"]);
for (const entry of await readdir(openDesignRoot)) {
  if (providerInternalEntries.has(entry)) continue;
  await cp(path.join(openDesignRoot, entry), path.join(selectedDir, entry), { recursive: true, force: false, errorOnExist: true });
}
await rename(path.join(selectedDir, "README.md"), path.join(selectedDir, "open-design-readme.md"));

const miniappTarget = "target-miniapp-sky-canvas-current-constraint";
const operationsTarget = "target-operations-sky-canvas-current-constraint";
const miniappScope = "scope-miniapp-sky-canvas-current-handoff";
const operationsScope = "scope-operations-sky-canvas-current-handoff";
const miniappCondition = "condition-miniapp-phone-390x844-current";
const operationsCondition = "condition-operations-desktop-1440x900-current";
const designSystemId = "user:starward-sky-canvas";

const handoffSpec = {
  schema_version: "starward-sky-canvas-implementation-handoff-spec-v1",
  status: "selected-implementation-constraint",
  authority: {
    design_system_target: "target.system.wechat-miniapp-sky-canvas-2026-08-25",
    design_system_owner: "DESIGN.md#wechat-mini-program--sky-canvas-v1",
    product_surface_owners: [
      "project_context/areas/main/screen-contracts/wechat-miniapp.md",
      "project_context/areas/main/screen-contracts/operations.md",
    ],
    rule: "The canonical HTML and this handoff constrain implementation; DESIGN.md remains the sole exact token authority and product/technical Source remains the sole business-data-permission authority.",
  },
  global_rules: [
    "Keep exactly one current active resource; immutable formal Source is an isolated protocol exception, not a parallel visual version.",
    "Use real domain/BFF state in production. Fixture astronomy, weather, map, contribution, moderation and publication content is never production truth.",
    "Hide scrollbar chrome on user phone surfaces without disabling owned scroll, keyboard access or position restoration.",
    "Use icon-assisted scanning, restrained outdoor motion and reduced-motion alternatives; never make color or motion the sole state cue.",
    "Map and My remain the only primary Mini Program destinations; all other pages are drilldowns in the current route tree.",
  ],
  targets: {
    miniapp: {
      target_ref: miniappTarget,
      platform: "WeChat Mini Program through the current Taro/React production owner",
      canonical_entry: "miniapp-entry.html",
      entries: ["index.html", "supporting.html", "contribution.html", "workbench.html"],
      frames: [
        { key: "map-finder-day", duty: "Map discovery and map-parallel Finder closed/peek/expanded loop", entry: "index.html", route_owner: "pages/map/index" },
        { key: "spot-detail-dusk", duty: "Formal spot identity, decision, route, evidence and page-level actions", entry: "index.html", route_owner: "spot/detail/index" },
        { key: "spot-night-astronomy", duty: "Selected-place/time astronomy summary, aligned evidence, targets and time control", entry: "index.html", route_owner: "spot/sky/index" },
        { key: "spot-night-orientation", duty: "Sensor-follow-only direction sky with permission, calibration and truthful degradation", entry: "index.html", route_owner: "sky/detail/index" },
        { key: "my-home", duty: "Account center and route hub without duplicating Finder favorites", entry: "supporting.html", route_owner: "pages/my/index" },
        { key: "plan-detail", duty: "Current plan summary and executable preparation details", entry: "supporting.html", route_owner: "content/plan/detail/index" },
        { key: "settings", duty: "Preference and observation-mode ownership", entry: "supporting.html", route_owner: "content/settings/index" },
        { key: "profile-import", duty: "Feature-gated import surface; absent from the route tree when disabled", entry: "supporting.html", route_owner: "feature-gated" },
        { key: "contribution-intake", duty: "Choose field report, correction or new-spot proposal", entry: "contribution.html", route_owner: "content/contribution/index" },
        { key: "contribution-form", duty: "Progressive fields and explicit provisional-data meaning", entry: "contribution.html", route_owner: "content/contribution/index" },
        { key: "contribution-upload-recovery", duty: "Durable draft, upload retry and cleanup feedback", entry: "contribution.html", route_owner: "content/contribution/index" },
        { key: "contribution-review-history", duty: "Separate submission, merge and publication impact axes", entry: "contribution.html", route_owner: "content/contribution/index" },
      ],
      component_families: [
        { key: "family.map-search", owner: "apps/wechat-miniapp/src/pages/map/index.tsx", states: ["idle", "focused", "suggestions", "query-committed", "no-results", "error"], data: "formal spot search/suggestion port", behavior: "Search overlay remains anchored to the field and closes on true focus departure." },
        { key: "family.quick-filter-chip", owner: "apps/wechat-miniapp/src/components/filter-sheet.tsx", states: ["unselected", "selected", "pressed", "disabled"], data: "one shared filter truth", behavior: "Quick conditions commit immediately and the first selection may open Finder peek." },
        { key: "family.map-analysis-bar-layer", owner: "apps/wechat-miniapp/src/components/source-lift-focus-layer.tsx", states: ["none", "light", "total-cloud", "tonight-condition", "partial", "stale", "error"], data: "map-coupled observation analysis projection", behavior: "Open on the same physical map with one optional analysis overlay and one selected local time." },
        { key: "family.finder-sheet", owner: "apps/wechat-miniapp/src/components/filter-sheet.tsx", states: ["closed", "peek", "expanded", "advanced-draft", "discarded", "committed"], data: "query/filter/result/favorite selection store", behavior: "Handle owns drag, tap and accessibility toggle; no visible expand button, repeated heading or repeated quick filters." },
        { key: "family.spot-marker-callout", owner: "apps/wechat-miniapp/src/components/spot-card.tsx", states: ["hidden", "selected", "stale-summary", "unavailable"], data: "formal spot marker and shared selected spot", behavior: "The whole compact card opens detail; no textual view-judgment row." },
        { key: "family.spot-result-row", owner: "apps/wechat-miniapp/src/components/spot-card.tsx", states: ["default", "selected", "favorited", "partial", "stale", "error"], data: "Finder formal-spot projection", behavior: "Rows first select the map marker/callout; partition scroll remains operable with hidden scrollbar chrome." },
        { key: "family.spot-header-actions", owner: "apps/wechat-miniapp/src/features/spot/spot-detail-page.tsx", states: ["default", "route-checking", "route-blocked", "route-handoff"], data: "formal spot identity and route safety", behavior: "Keep the night entry once in the upper hierarchy and navigation as quiet trailing text." },
        { key: "family.favorite-star-ritual", owner: "apps/wechat-miniapp/src/components/selected-card-star.tsx", states: ["inactive", "activating", "active", "deactivating", "commit-failed", "reduced-motion"], data: "authenticated favorite relation", behavior: "Main star remains dominant; active satellites and short tails stay subordinate and static after settling." },
        { key: "family.astronomy-summary", owner: "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", states: ["loading", "ready", "partial", "stale", "unavailable"], data: "versioned astronomy projection for the committed spot/time", behavior: "Conclusion, usable window, source and completeness precede professional evidence." },
        { key: "family.astronomy-professional-matrix", owner: "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", states: ["collapsed", "expanded", "partial", "stale"], data: "aligned astronomical and observing-condition bands", behavior: "Icons assist scanning while aligned tracks and matrices remain the value owner." },
        { key: "family.sky-time-scrubber", owner: "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", states: ["idle", "previewing", "committed", "restored"], data: "single Observation Context time", behavior: "Preview is continuous; commit occurs once and all astronomy sections update from the same context." },
        { key: "family.orientation-sky", owner: "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", states: ["permission", "calibrating", "ready", "denied", "unavailable", "stale-sensor"], data: "platform orientation stream plus inherited spot/time sky scene", behavior: "Sensor follows phone direction only; there is no manual heading, direction stepper or drag fallback." },
        { key: "family.status-recovery", owner: "apps/wechat-miniapp/src/components/status-panel.tsx", states: ["initial", "loading", "ready", "empty", "partial", "stale", "error", "permission-denied"], data: "resource query status and attributable recovery", behavior: "Keep geometry stable, copy concise and retry/cancel effects explicit." },
        { key: "family.primary-navigation", owner: "apps/wechat-miniapp/src/components/custom-nav.tsx", states: ["map-active", "my-active", "pressed"], data: "current route tree", behavior: "Only Map and My are primary destinations." },
        { key: "family.my-plan-settings", owner: "apps/wechat-miniapp/src/features/my/my-library-page.tsx", states: ["loading", "ready", "empty", "partial", "error"], data: "identity-scoped plans/settings/account summary", behavior: "My is a route hub and Settings is the sole observation-mode entry." },
        { key: "family.contribution-intake", owner: "apps/wechat-miniapp/src/content/contribution/index.tsx", states: ["field-report", "correction", "new-spot-proposal"], data: "authenticated contribution kind", behavior: "Spot Detail may prebind only a formal spot id; My opens general intake." },
        { key: "family.contribution-form", owner: "apps/wechat-miniapp/src/content/contribution/index.tsx", states: ["draft", "validating", "invalid", "saving", "saved", "submitting"], data: "identity-scoped durable draft and form schema", behavior: "Fields reveal progressively by contribution kind; draft and submit are distinct commits." },
        { key: "family.upload-recovery", owner: "apps/wechat-miniapp/src/content/contribution/index.tsx", states: ["queued", "uploading", "paused", "failed", "retrying", "complete", "expired"], data: "upload session and sanitized derivative receipt", behavior: "Retry is idempotent and abandoned media cleanup remains visible and attributable." },
        { key: "family.review-history", owner: "apps/wechat-miniapp/src/content/contribution/index.tsx", states: ["draft", "pending-review", "changes-requested", "accepted", "rejected", "withdrawn", "merged", "superseded", "published-impact"], data: "submission, merge and publication-impact axes", behavior: "Acceptance never implies canonical merge or formal publication." },
        { key: "family.semantic-icon", owner: "apps/wechat-miniapp/src/components/semantic-asset.tsx", states: ["day", "night", "observation", "missing-asset"], data: "semantic subject and display mode", behavior: "All icons pass through one mode-aware adapter with accessible labels." },
      ],
    },
    operations: {
      target_ref: operationsTarget,
      platform: "Authenticated owner Operations Web through the current React/Vite production owner",
      canonical_entry: "operations.html",
      entries: ["operations.html", "workbench.html"],
      frames: [
        { key: "moderation-queue", duty: "Prioritized authenticated review queue", entry: "operations.html#queue", route_owner: "apps/admin-web/src/app" },
        { key: "moderation-case", duty: "Submission evidence, decision and history without overwriting original evidence", entry: "operations.html#case", route_owner: "apps/admin-web/src/app" },
        { key: "moderation-media-review", duty: "Sanitized media review and provenance", entry: "operations.html#media", route_owner: "apps/admin-web/src/app" },
        { key: "moderation-canonical-merge", duty: "Explicit preview then commit into the canonical evidence owner", entry: "operations.html#merge", route_owner: "apps/admin-web/src/app" },
        { key: "publication-assessment", duty: "Fresh fail-closed publication gate and exact missing evidence", entry: "operations.html#publication", route_owner: "apps/admin-web/src/app" },
        { key: "spot-replacement-retirement", duty: "Audited suspend, unpublish, replace and retire transitions", entry: "operations.html#replacement", route_owner: "apps/admin-web/src/app" },
        { key: "operations-audit", duty: "Immutable actor/action/object/result timeline", entry: "operations.html#audit", route_owner: "apps/admin-web/src/app" },
      ],
      component_families: [
        { key: "family.operations-shell", owner: "apps/admin-web/src/app/page.tsx", states: ["loading", "ready", "saving", "error"], data: "authenticated operator identity and API status", behavior: "Queue, case and governance work share one authenticated shell without implying server authority." },
        { key: "family.moderation-queue", owner: "apps/admin-web/src/app/page.tsx", states: ["loading", "ready", "empty", "filtered", "error"], data: "moderation queue projection", behavior: "Priority, age, kind, location and risk remain scannable; opening a row preserves queue context." },
        { key: "family.moderation-case", owner: "apps/admin-web/src/app/page.tsx", states: ["reviewing", "changes-requested", "accepted", "rejected", "withdrawn"], data: "submission evidence and review decision", behavior: "Decision reason and history are separate from immutable original evidence." },
        { key: "family.media-review", owner: "apps/admin-web/src/app/page.tsx", states: ["loading", "ready", "unsafe", "unavailable"], data: "sanitized derivatives and media provenance", behavior: "Raw path, EXIF and precise contributor coordinates are absent from ordinary reads." },
        { key: "family.canonical-merge", owner: "apps/admin-web/src/app/page.tsx", states: ["not-started", "preview", "ready", "committing", "merged", "superseded", "failed"], data: "canonical evidence merge command", behavior: "Preview and commit are separate audited steps; retry remains idempotent." },
        { key: "family.publication-assessment", owner: "apps/admin-web/src/app/page.tsx", states: ["checking", "blocked", "eligible", "publishing", "published", "failed"], data: "server-owned formal-spot completeness assessment", behavior: "Publish remains unavailable while any required evidence is missing or invalid." },
        { key: "family.replacement-retirement", owner: "apps/admin-web/src/app/page.tsx", states: ["active", "suspended", "unpublished", "replaced", "retired", "failed"], data: "formal spot publication lifecycle", behavior: "Every transition requires reason, actor, result and readback." },
        { key: "family.audit-timeline", owner: "apps/admin-web/src/app/page.tsx", states: ["loading", "ready", "empty", "filtered", "error"], data: "immutable audit projection", behavior: "Actor, action, object, reason, timestamp and result remain attributable." },
        { key: "family.operations-status-recovery", owner: "apps/admin-web/src/app/page.tsx", states: ["loading", "ready", "empty", "partial", "stale", "error"], data: "operations request lifecycle", behavior: "A client success state never substitutes for server receipt and readback." },
        { key: "family.operations-semantic-icon", owner: "apps/admin-web/src/app/styles.css", states: ["default", "active", "disabled"], data: "semantic icon role", behavior: "Icons reinforce labels and never carry the only action or state meaning." },
      ],
    },
  },
};

await writeJson(path.join(selectedDir, "implementation-handoff-spec.json"), handoffSpec);
await cp(path.join(packageDir, "selected-provider-design-system.md"), path.join(selectedDir, "design-system-snapshot.md"));
await writeUtf8(path.join(selectedDir, "miniapp-entry.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sky Canvas Mini Program selected source</title></head><body><main><h1>Sky Canvas Mini Program selected source</h1><nav><a href="index.html">核心体验</a><a href="supporting.html">我的与辅助页面</a><a href="contribution.html">投稿闭环</a><a href="workbench.html">组件与状态工作台</a></nav><p>本入口索引完整当前设计资源；实际开发职责与状态见 implementation-handoff-spec.json。</p></main></body></html>`);
await writeUtf8(path.join(selectedDir, "selection-and-qa.md"), `# Sky Canvas selection and source QA\n\n- Selection: the user explicitly selected the current Sky Canvas DRA direction for completion on 2026-08-25.\n- Classification: selected implementation constraint for Mini Program and Operations Web; not a pixel-exact target and not production acceptance.\n- Provider: recovered Open Design 0.20.1 project; no new provider generation was run for formal packaging, so effective model/effort provenance is not asserted.\n- Canonical values: HTML/CSS/JS/SVG and DESIGN.md; production data and permissions remain owned by Product/Technical Source.\n- QA boundary: formal preflight proves input identity, declared-universe closure and feasibility-source consistency only.\n`);

const selectedArtifactManifest = JSON.parse(await readFile(path.join(selectedDir, "artifact-manifest.json"), "utf8"));
selectedArtifactManifest.reviewNotice = "当前 Sky Canvas 方向已被用户选定为开发 implementation constraint；它不是 pixel-exact target 或生产验收。";
selectedArtifactManifest.candidateStatus = {
  value: "selected-formal-implementation-constraint",
  selected: true,
  directionConfirmed: true,
  productionAccepted: false,
  exactTargetHandoff: false,
  formalPreflight: false,
};
selectedArtifactManifest.exclusions = unique([
  ...(selectedArtifactManifest.exclusions || []),
  "pixel-exact target claims",
  "production conformance or release readiness",
]);
await writeJson(path.join(selectedDir, "artifact-manifest.json"), selectedArtifactManifest);
await writeUtf8(path.join(selectedDir, "README.md"), `# Sky Canvas selected implementation resource\n\nThis immutable Source snapshot contains the one current Open Design resource selected on 2026-08-25, the structured implementation handoff, two target Fact manifests and two real-substrate feasibility documents.\n\n- Mini Program canonical entry: miniapp-entry.html\n- Operations canonical entry: operations.html\n- Human and machine handoff: implementation-handoff-spec.json\n- Formal outputs: ../selected-handoff/*.md\n- Editable upstream: the current Open Design project named starward-sky-canvas-core-2026-08-25\n\nThe selected role is implementation constraint. Exact tokens remain in DESIGN.md; product/data/permission truth remains in project Context and technical Source; production conformance is not evaluated here.\n`);

const targetConfigs = [
  {
    id: "miniapp",
    targetKey: miniappTarget,
    scopeKey: miniappScope,
    conditionKey: miniappCondition,
    sourceProfileKind: "implementation_app",
    canonicalEntry: "miniapp-entry.html",
    entryFiles: ["miniapp-entry.html", "index.html", "supporting.html", "contribution.html", "workbench.html"],
    metadataFiles: ["index.html.artifact.json", "supporting.html.artifact.json", "contribution.html.artifact.json", "workbench.html.artifact.json"],
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
      "apps/wechat-miniapp/src/spot",
      "apps/wechat-miniapp/src/sky",
      "apps/wechat-miniapp/src/content",
    ],
    routeRoots: [
      "apps/wechat-miniapp/src/pages",
      "apps/wechat-miniapp/src/spot",
      "apps/wechat-miniapp/src/sky",
      "apps/wechat-miniapp/src/content",
    ],
    technicalSources: [
      ["source.miniapp.platform", "apps/wechat-miniapp/project.config.json", ["technical_platform"]],
      ["source.miniapp.package", "apps/wechat-miniapp/package.json", ["framework_runtime", "ui_system", "capability_basis"]],
      ["source.miniapp.tokens", "apps/wechat-miniapp/src/styles/tokens.scss", ["token_theming_adapter", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.routes", "apps/wechat-miniapp/src/app.config.ts", ["route_owner", "capability_basis"]],
      ["source.miniapp.filter", "apps/wechat-miniapp/src/components/filter-sheet.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.card", "apps/wechat-miniapp/src/components/spot-card.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.favorite", "apps/wechat-miniapp/src/components/selected-card-star.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.status", "apps/wechat-miniapp/src/components/status-panel.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.asset", "apps/wechat-miniapp/src/components/semantic-asset.tsx", ["ui_system", "component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.sky", "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.spot", "apps/wechat-miniapp/src/features/spot/spot-detail-page.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.my", "apps/wechat-miniapp/src/features/my/my-library-page.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.contribution", "apps/wechat-miniapp/src/content/contribution/index.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
      ["source.miniapp.nav", "apps/wechat-miniapp/src/components/custom-nav.tsx", ["component_owner", "feasibility_basis", "capability_basis"]],
    ],
    observationValues: {
      platform: { kind: "identifier", name: "wechat-mini-program", version_source_ref: "source.miniapp.platform" },
      framework_runtime: { kind: "identifier", name: "taro-react", version_source_ref: "source.miniapp.package" },
      ui_system: { kind: "identifier", name: "starward-sky-canvas-local-primitives", version_source_ref: "source.miniapp.package" },
      token_theming_adapter: { kind: "repository_paths", paths: ["apps/wechat-miniapp/src/styles/tokens.scss"] },
    },
  },
  {
    id: "operations",
    targetKey: operationsTarget,
    scopeKey: operationsScope,
    conditionKey: operationsCondition,
    sourceProfileKind: "implementation_web",
    canonicalEntry: "operations.html",
    entryFiles: ["operations.html", "workbench.html"],
    metadataFiles: ["operations.html.artifact.json", "workbench.html.artifact.json"],
    frameSpecs: handoffSpec.targets.operations.frames,
    familySpecs: handoffSpec.targets.operations.component_families,
    viewport: { width: 1440, height: 900 },
    platform: "web",
    formFactor: "desktop",
    inputMethod: "pointer-keyboard",
    assistiveTechnology: "web-accessibility-semantics",
    componentRoots: ["apps/admin-web/src/app"],
    routeRoots: ["apps/admin-web/src"],
    technicalSources: [
      ["source.operations.platform", "apps/admin-web/index.html", ["technical_platform"]],
      ["source.operations.package", "apps/admin-web/package.json", ["framework_runtime", "ui_system", "capability_basis"]],
      ["source.operations.main", "apps/admin-web/src/main.tsx", ["route_owner", "capability_basis"]],
      ["source.operations.page", "apps/admin-web/src/app/page.tsx", ["component_owner", "ui_system", "feasibility_basis", "capability_basis"]],
      ["source.operations.styles", "apps/admin-web/src/app/styles.css", ["token_theming_adapter", "component_owner", "feasibility_basis", "capability_basis"]],
    ],
    observationValues: {
      platform: { kind: "identifier", name: "browser-web", version_source_ref: "source.operations.platform" },
      framework_runtime: { kind: "identifier", name: "react-vite", version_source_ref: "source.operations.package" },
      ui_system: { kind: "identifier", name: "starward-operations-local-react-css", version_source_ref: "source.operations.page" },
      token_theming_adapter: { kind: "repository_paths", paths: ["apps/admin-web/src/app/styles.css"] },
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

  const referencedAssets = await collectReferencedAssets(config.entryFiles);
  const canonicalFiles = unique([
    ...config.entryFiles,
    ...config.metadataFiles,
    "assets/current-review.css",
    "assets/current-review.js",
    ...referencedAssets,
    "assets/icons/LICENSE-lucide.txt",
    "assets/icons/LICENSE-fontawesome.txt",
    "artifact-manifest.json",
    "implementation-handoff-spec.json",
    "design-system-snapshot.md",
    "open-design-readme.md",
    "selection-and-qa.md",
    "README.md",
  ]).sort();

  const materialFiles = new Set(canonicalFiles.filter((file) =>
    config.entryFiles.includes(file) ||
    file === "assets/current-review.css" ||
    file === "assets/current-review.js" ||
    file.startsWith("assets/icons/") ||
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
    identity: `starward-sky-canvas-${config.id}-constraint-inspector`,
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
    oracles: [{ key: `oracle.${config.id}.asset-integrity`, trust: "frozen_executable", identity: `starward-sky-canvas-${config.id}-constraint-oracle`, version: "1.0.0", sha256: oracleResource.sha256, capability_refs: ["assets", "json"] }],
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
      inspection: { status: "complete", inspector: `starward-sky-canvas-${config.id}-constraint-inspector@1.0.0` },
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
        "DESIGN.md#wechat-mini-program--sky-canvas-v1",
        "project_context/areas/main/screen-contracts/wechat-miniapp.md",
        "project_context/areas/main/screen-contracts/operations.md",
        `${selectedRel}/implementation-handoff-spec.json`,
        "docs/architecture/wechat-miniapp-product-technical-solution.md",
      ],
      exclusions: [
        "This selected target is an implementation constraint, not a pixel-exact target.",
        "Canonical HTML fixture data is not production astronomy, weather, map, contribution, moderation or publication truth.",
        "Preflight proves Source identity and declared closure; production conformance and release readiness are not evaluated.",
      ],
    },
    provenance: {
      provider: "Open Design",
      provider_version: "0.20.1",
      project: "starward-sky-canvas-core-2026-08-25",
      run: "recovered-current-project-no-run-id-exposed",
      capability: "runnable multi-entry HTML design resource with component-state workbench and package-contained assets",
      agent: "codex-provider-provenance-not-exposed",
      model: "highest-performance-provenance-unverified-no-new-generation",
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
      selection_basis: "The user explicitly accepted the current Sky Canvas direction and requested complete compliant DRA resources and developer handoff text on 2026-08-25.",
    }],
    resource_fact_closure: resourceFactClosure,
    coverage,
    proposal: { reconciliation_status: "returned", path: "docs/architecture/wechat-miniapp-product-technical-solution.md", revision: "current-solution-before-selected-resource-pointer-reconciliation" },
  };

  const humanItems = config.familySpecs.map((family, index) => `<!-- ty-source-item:start key=control-${config.id}-${String(index + 1).padStart(2, "0")} kind=control -->\n${family.key}: ${family.behavior} Data binding: ${family.data}. Production owner candidate: ${family.owner}. States: ${family.states.join(", ")}.\n<!-- ty-source-item:end -->`).join("\n\n");
  const markdown = `<!-- ty-source-item:start key=requirement-selected-current-resource-${config.id} kind=requirement -->\nThe current Sky Canvas resource is the explicitly selected implementation constraint for ${config.id}; DESIGN.md remains the exact token owner and production Source remains the data, permission and business-rule owner.\n<!-- ty-source-item:end -->\n\n<!-- ty-source-item:start key=control-development-consumption-boundary-${config.id} kind=control -->\nDevelopment must consume the complete selected Source closure and structured handoff, map fixture states to the existing production stores and ports, preserve truthful loading/partial/stale/error/permission states, and independently verify the real route.\n<!-- ty-source-item:end -->\n\n${humanItems}\n\n\`\`\`yaml design-resource-handoff-v1\n${JSON.stringify(handoff, null, 2)}\n\`\`\`\n`;
  const draftName = `${config.id}-sky-canvas-current.md`;
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
        strategy_steps: ["reuse_existing", "extend_shared_component", "theme_with_tokens"],
        primitive_refs: config.id === "miniapp" ? ["taro.view", "taro.button", "starward.semantic-asset-adapter"] : ["react.component", "html.semantic-elements", "starward.operations-local-css"],
        owner_candidates: [{ kind: "existing_path", locator: family.owner, existence: "existing" }],
        supported_customization_surfaces: ["theme_tokens", "component_variant", "composition", "content_slot", "icon_slot", "behavior_slot", "style_api"],
        feasibility_basis_refs: basisRefs,
        observed_costs: ["Requires mapping the design-state vocabulary to the existing domain stores, request lifecycle and route ownership."],
        observed_risks: [config.id === "miniapp" ? "Browser prototype behavior can diverge from the WeChat event and native component model unless verified in WeChat DevTools." : "The current admin owner is broader than the selected moderation workbench and must preserve server authority, audit and error semantics during extension."],
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
    device_profile: config.id === "miniapp" ? "wechat-phone-reference" : "operations-desktop-reference",
    form_factor: config.formFactor,
    viewport: { key: `${config.viewport.width}x${config.viewport.height}`, width: config.viewport.width, height: config.viewport.height, unit: "px" },
    orientation: "portrait",
    density: { key: "reference-css-pixel", pixel_ratio: 1 },
    safe_area: { key: "source-reference", top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    window_state: "foreground",
    fold_state: "not-applicable",
    display_mode: config.id === "miniapp" ? "wechat-mini-program" : "browser-window",
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
    system_ui: config.id === "miniapp" ? "wechat-owned-chrome" : "browser-owned-chrome",
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
  return `import { createHash } from "node:crypto";\nimport { readFile } from "node:fs/promises";\nimport { resolve } from "node:path";\nconst INPUT_PATHS = ${JSON.stringify(inputPaths, null, 2)};\nconst root = resolve(process.argv[2] || process.cwd());\nconst resources = [];\nfor (const relativePath of INPUT_PATHS) { const bytes = await readFile(resolve(root, ...relativePath.split("/"))); resources.push({ path: relativePath, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }); }\nprocess.stdout.write(JSON.stringify({ inspector: "starward-sky-canvas-${id}-constraint-inspector@1.0.0", traversal: "complete_enumeration", dynamic_discovery: "fully_enumerated", resources }, null, 2) + "\\n");\n`;
}

function frozenOracleSource(id) {
  return `import { createHash } from "node:crypto";\nimport { readFile } from "node:fs/promises";\nimport { resolve } from "node:path";\nconst [mode, relativePath, pointer, expected, rootArgument] = process.argv.slice(2);\nif (!mode || !relativePath || !expected) throw new Error("usage: node oracle.mjs <whole_resource|json_pointer> <path> <pointer-or-dot> <expected> [root]");\nconst root = resolve(rootArgument || process.cwd());\nconst bytes = await readFile(resolve(root, ...relativePath.split("/")));\nlet actual;\nif (mode === "whole_resource") actual = createHash("sha256").update(bytes).digest("hex");\nelse if (mode === "json_pointer") { let value = JSON.parse(bytes.toString("utf8")); for (const part of pointer.slice(1).split("/").map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) value = value[part]; actual = String(value); }\nelse throw new Error("unsupported mode");\nconst result = { oracle: "starward-sky-canvas-${id}-constraint-oracle@1.0.0", method: "asset_integrity", comparator: "asset_equal", actual, expected, pass: actual === expected };\nprocess.stdout.write(JSON.stringify(result, null, 2) + "\\n");\nif (!result.pass) process.exitCode = 1;\n`;
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
