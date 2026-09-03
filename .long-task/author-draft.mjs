import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { preflightDesignResourceHandoff } from "../node_modules/project-tiny-context-harness/dist/index.js";
import { createSemanticFactCompactCarrier } from "../node_modules/project-tiny-context-harness/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../node_modules/project-tiny-context-harness/dist/lib/semantic-fact-compact-carrier.js";
import {
  SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES,
  SEMANTIC_FACT_STANDARD_CONDITION_AXES,
  SEMANTIC_FACT_STANDARD_FAMILIES,
  SEMANTIC_FACT_STANDARD_PROPERTIES,
} from "../node_modules/project-tiny-context-harness/dist/lib/semantic-fact-catalog.js";
import { parseSourceItems } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-source-item-parser.js";
import { deriveMaterialSourceFragments } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-source-fragments.js";
import { semanticModalOccurrences } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-source-anchors.js";
import { generateClaims, generateGlobalClaims } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-claim-definitions.js";
import { executionTargetSourceStatement } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-source-target-index.js";
import { externalClaimCapabilityFloor } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-proof-adequacy.js";
import { claimSemanticCapabilityFloor } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-claim-semantic-proof-floor.js";
import { controlFieldFacts } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-control-fields.js";
import { semanticFactProofCapabilityFloor } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-semantic-proof-profile.js";
import { claimAuthorityStatement } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-expected-authority.js";
import { designGroundObligationRef } from "../node_modules/project-tiny-context-harness/dist/lib/long-task-design-obligation.js";
import { canonicalValueJson, sha256Hex } from "../node_modules/project-tiny-context-harness/dist/lib/strict-codec.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKDIR = ".long-task";
const SOURCE_PATH = ".codex/work-items/wechat-miniapp-field-signal-i21-long-task-input.md";
const CONTRACT_PATH = `${WORKDIR}/delivery-contract.yaml`;
const VERBATIM_INPUT_ARCHIVE = `${WORKDIR}/wechat-miniapp-field-signal-i21-startup-input-verbatim.md`;
const PUBLIC_KEY_PATH = "project_context/areas/main/verification/wechat-device/field-signal-i21-owner-public.pem";
const VERIFICATION_SPEC_PATH = "tools/miniapp/verification-spec-field-signal-i21.json";
const NIGHTCHINA_FIXTURE_PATH = "tools/miniapp/fixtures/nightchina-import-cases.json";
const HANDOFF_PATH = "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r3/selected-handoff/miniapp-field-signal-i21-current.md";
const SELECTED_ROOT = "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r3/selected-source";
const CANONICAL_ENTRY = `${SELECTED_ROOT}/index.html`;
const FACT_MANIFEST = `${SELECTED_ROOT}/miniapp-fact-manifest.json`;
const FEASIBILITY_PATH = `${SELECTED_ROOT}/miniapp-implementation-feasibility.json`;
const IMPLEMENTATION_SPEC = `${SELECTED_ROOT}/implementation-handoff-spec.json`;
const AUTHORITY_DELTA = `${SELECTED_ROOT}/authority-delta.json`;
const RESOURCE_INTEGRITY = `${SELECTED_ROOT}/miniapp-resource-integrity.json`;
const VERIFIER_RUNTIME_ROOT = "tools/miniapp/verifier-runtime";
const NATIVE_RUNNER = `${VERIFIER_RUNTIME_ROOT}/verify-miniapp-target.exe`;
const NATIVE_LAUNCHER_SOURCE = `${VERIFIER_RUNTIME_ROOT}/verify-miniapp-target-launcher.c`;
const NATIVE_RUNNER_SOURCE = `${VERIFIER_RUNTIME_ROOT}/verify-miniapp-target.mjs`;
const VERIFIER_RUNTIME_PACKAGE = `${VERIFIER_RUNTIME_ROOT}/package.json`;
const VERIFIER_RUNTIME_LOCK = `${VERIFIER_RUNTIME_ROOT}/package-lock.json`;
const DELIVERY_CARRIER = "apps/wechat-miniapp/src/authority/delivery-carrier.json";
const INSPECTOR = `${WORKDIR}/author-draft.mjs`;
const MANIFEST_KEY = "wechat-miniapp-field-signal-i21.semantic-facts";
const NATIVE_TARGET = "wechat-field-signal-i21-native";
const EXTERNAL_CONFIRMATION_KEY = "field-signal-i21-native-and-device-conformance";
const DESIGN_TARGET_KEY = "target-miniapp-field-signal-i21-selected-constraint-2026-09-03";
const DESIGN_ROOT_CLAIM = "control.data-source-disclosure.validation";
const DESIGN_METHOD_CLAIM = "requirement.selected-current-resource-miniapp";
const APPLICABILITY = "current-candidate";
const GENERATED_BEGIN = "<!-- ty-long-task-source-inventory:begin -->";
const GENERATED_END = "<!-- ty-long-task-source-inventory:end -->";

const EXPECTED_HASHES = {
  [HANDOFF_PATH]: "089ef57ce5d86f44d0b138f57478388a53967a9b48007bb35ab6f93fd189816a",
  [CANONICAL_ENTRY]: "b30d751f852b5b978c84759a99762cd61201d25faf3e0bda77c5097690a88c60",
  [FACT_MANIFEST]: "22baf8f4d96b56d76baa7c4509796f0f5027acc01b58afcff4caefc83b9d1ebd",
  [FEASIBILITY_PATH]: "ee377fa71268391742d0313c85483e52fad156370b64391cb8c2f3cf411f91fb",
  [IMPLEMENTATION_SPEC]: "38b36f6fffb80cb0c7c2b933a398da322bd3d78e6169b618cca09f4aee6fd611",
  [AUTHORITY_DELTA]: "df851d2e2ec16d9c67caed10c960dd4a051345cd04bcdb374c3c4e0ccc057b9c",
};

const REVISED_USER_REQUIREMENTS = [
  {
    key: "nightchina-balanced-import-corpus",
    outcome: "my-profile-settings",
    family: "notification_file_media",
    property: "content_identity",
    statement: `Development testing uses the fixed, traceable ${NIGHTCHINA_FIXTURE_PATH} corpus sourced from NightChina posts: three to five cases inside Guangdong and three to five cases outside Guangdong, each carrying source URL, reported place/date, a short paraphrase, rights disposition and expected formal-spot or independent-proposal association without sampling the declared corpus.`,
  },
  {
    key: "nightchina-rights-safe-media",
    outcome: "my-profile-settings",
    family: "security",
    property: "privacy_boundary",
    statement: "NightChina article bodies and rights-unconfirmed source photographs are not copied, downloaded, uploaded or represented as reusable; any media-bearing import test uses a clearly labelled locally generated synthetic image unrelated to the source photograph, while the production rights gate and manual-review boundary remain active.",
  },
  {
    key: "nightchina-import-association-journey",
    outcome: "my-profile-settings",
    family: "operation_workflow",
    property: "sequence",
    statement: "Every fixed NightChina case exercises the real Profile Import path from source and rights through editable draft, truthful parse capability, formal-spot versus independent-proposal association, preview and manual-review submission boundary; missing catalog identity stays a proposal and no case may fabricate parsing, persistence, moderation, publication or formal-spot creation success.",
  },
  {
    key: "nightchina-post-import-spot-panel",
    outcome: "map-experience",
    family: "operation_workflow",
    property: "sequence",
    statement: "At least one geographically compatible fixed NightChina case is manually associated with an existing formal catalog spot, then returns through the real Map owner and exercises the actual spot information panel sections, route and facility evidence, favorite restore, share boundary, cloud-stargazing, sky-detail return and spot-scoped contribution entry on the same selected spot.",
  },
];

const OUTCOMES = [
  { key: "map-experience", title: "Map search, formal-spot panel, layer and shared time", stage: "map" },
  { key: "full-sky", title: "Formal-spot full-sky orientation", stage: "sky", depends_on: ["map-experience"] },
  { key: "my-profile-settings", title: "My, Plan, Profile, Import and three-state Settings", stage: "personal", depends_on: ["map-experience"] },
  { key: "contribution", title: "One durable contribution form and pending-status journey", stage: "contribution", depends_on: ["map-experience", "my-profile-settings"] },
  { key: "current-candidate", title: "Complete owner-trial WEAPP Field Signal I21 candidate", stage: "candidate", depends_on: ["map-experience", "full-sky", "my-profile-settings", "contribution"] },
];

const SURFACE_CONTROLS = {
  "miniapp-map-discovery": [
    "mini-primary-navigation", "data-source-disclosure", "notification-feedback", "page-state-recovery",
    "map-search-entry", "spot-search-shell", "spot-search-field", "spot-search-query-overlay",
    "spot-search-filter-group", "spot-search-filter-choice", "spot-search-result-list", "spot-search-result-card",
    "map-location-control", "map-analysis-focus-layer", "map-layer-selector", "map-time-control",
    "map-marker-panel-coordinator", "map-spot-information-panel", "map-spot-panel-handle",
    "map-spot-panel-section-nav", "map-spot-panel-action-bar", "spot-favorite-action", "spot-share-action",
    "spot-cloud-stargazing-action", "spot-media-gallery", "spot-navigation-action", "spot-contribution-entry",
    "spot-route-summary", "spot-facility-evidence", "guide-article-viewer", "sky-professional-matrix",
    "sky-target-list", "sky-time-scrubber", "sky-map-canvas",
  ],
  "miniapp-sky-orientation": [
    "sky-orientation-canvas", "sky-orientation-sensor", "sky-orientation-recovery",
    "sky-orientation-object-list", "sky-orientation-time-ruler",
  ],
  "miniapp-my-library": [
    "display-mode-switcher", "my-account-header", "my-settings-action", "my-profile-summary",
    "my-grouped-entry-list", "my-plan-entry", "my-contribution-entry", "plan-editor", "settings-form",
  ],
  "miniapp-profile-content": [
    "profile-link-editor", "profile-link-open-copy", "import-source-rights", "import-draft-editor",
    "import-spot-association", "import-preview-submit",
  ],
  "miniapp-contribution-intake": [
    "contribution-kind-control", "contribution-spot-context", "contribution-topic-control",
    "contribution-observed-at", "contribution-location-consent", "contribution-media-upload",
    "contribution-submit", "contribution-status-list",
  ],
};

const CONTROL_RELATIONS = [
  ["primary-destinations", ["mini-primary-navigation", "map-search-entry", "my-account-header"], "Map and My are the only primary destinations; Search, sky, Plan, Settings, Profile, Import and Contribution remain state-preserving child routes."],
  ["stationary-search", ["map-search-entry", "spot-search-shell", "spot-search-field", "spot-search-query-overlay", "spot-search-filter-group", "spot-search-result-list"], "Map and spot/search share one stationary Search field identity; suggestions, filters and partitions reveal below it and all Back paths reverse to the same Map instance."],
  ["result-selection", ["spot-search-result-card", "map-marker-panel-coordinator", "map-spot-information-panel"], "A whole Search result or formal marker commits one selected spot and retargets the same Map-owned medium panel without a duplicate detail owner."],
  ["single-panel-document", ["map-spot-information-panel", "map-spot-panel-handle", "map-spot-panel-section-nav", "map-spot-panel-action-bar", "spot-media-gallery"], "Small, medium and large are viewport extents over one mounted objective document; only the exact handle owns extent drag and large alone owns document scroll."],
  ["bottom-presentation", ["map-marker-panel-coordinator", "map-spot-information-panel", "map-layer-selector"], "One none | spot-panel | layer-sheet coordinator enforces mutual exclusion while retaining selected spot and previous extent for direct retarget and recovery."],
  ["shared-time", ["map-time-control", "sky-time-scrubber", "sky-orientation-time-ruler", "sky-map-canvas", "sky-orientation-canvas"], "Map, panel astronomy and full-sky consume one selected observation time with preview, snap, atomic commit and cancellation semantics."],
  ["gesture-arbitration", ["map-spot-panel-handle", "map-time-control", "sky-orientation-time-ruler", "map-marker-panel-coordinator"], "After a directional threshold, exactly one of panel vertical drag, ruler horizontal drag or Map pan/pinch owns the gesture until termination."],
  ["display-mode-owner", ["display-mode-switcher", "settings-form", "mini-primary-navigation"], "One Settings-owned day | night | observation value controls presentation and restores the exact prior normal mode and route context without a bright intermediate frame."],
  ["contribution-entry-convergence", ["spot-contribution-entry", "my-contribution-entry", "contribution-spot-context", "contribution-kind-control"], "Spot-panel and My entries converge on one form and draft owner; supplied formal-spot context and deliberate new-place selection are disjoint inputs."],
  ["contribution-submit", ["contribution-media-upload", "contribution-location-consent", "contribution-submit", "contribution-status-list"], "Rights, conditional location, upload identity, validation, idempotent submit and restart-readable pending receipt remain one durable transaction and recovery chain."],
  ["profile-import-lineage", ["import-source-rights", "import-draft-editor", "import-spot-association", "import-preview-submit"], "Import preserves rights, editable draft versions, formal spot or separate proposal identity, preview and moderation without automatic publication."],
  ["nightchina-import-to-spot", ["import-source-rights", "import-draft-editor", "import-spot-association", "import-preview-submit", "map-spot-information-panel"], "The fixed NightChina corpus exercises the real import lineage; only a manually confirmed compatible formal association may continue to the existing Map-owned spot information panel, while unmatched places remain separate proposals."],
  ["feedback-recovery", ["notification-feedback", "page-state-recovery", "data-source-disclosure"], "One priority-aware feedback owner preserves distinct loading, empty, partial, stale, offline, error, permission and success states plus their truthful recovery and provenance."],
  ["image-eligibility", ["spot-search-result-card", "spot-media-gallery", "contribution-media-upload"], "Media nodes exist only for valid usable assets; absent media reserves no placeholder while upload progress, retry and successful identity remain explicit."],
];

const NON_GOALS = [
  ["no-public-release", "This delivery does not upload, migrate AppID, submit review, publish, deploy remotely or claim public/commercial release readiness."],
  ["no-react-native-scope", "The React Native mobile application is outside this delivery and must not be changed to satisfy the Mini Program target."],
  ["no-general-trip-planner", "The owner-trial Mini Program does not become a general travel itinerary or turn-by-turn navigation product."],
  ["no-open-ugc", "Unreviewed public UGC, automatic spot publication and automatic fact confirmation remain outside the owner-trial target."],
  ["no-pixel-exact-claim", "I21 is a selected constraint target, not an automatically pixel-exact production target; input preflight cannot be reported as production conformance."],
  ["no-second-ui-system", "A second general UI suite, second token source, parallel legacy/current tree or library-owned business state is outside scope."],
];

const GLOBAL_CONSTRAINTS = [
  ["authority-priority", "Authority resolves fail-closed in this order: the user's latest explicit task requirements, owning project_context product and technical semantics, DESIGN.md exact visual semantics, the I21 selected constraint closure, then current code as implementation state."],
  ["i21-identity", `The selected constraint is ${DESIGN_TARGET_KEY}; ${HANDOFF_PATH}, ${CANONICAL_ENTRY}, ${FACT_MANIFEST}, ${IMPLEMENTATION_SPEC}, ${FEASIBILITY_PATH}, ${AUTHORITY_DELTA} and ${RESOURCE_INTEGRITY} form the current immutable design and implementation handoff closure.`],
  ["complete-scope", "The delivery scope is exactly five Product Surfaces, nine current routes and sixty-two material Controls with every applicable state, relation, condition and evidence obligation represented without sampling."],
  ["owner-trial-target", "The required target is a runnable and verifiable owner-only non-commercial WEAPP candidate; public release and commercial activation are excluded."],
  ["single-workspace", "Work converges directly in the current main workspace, preserves the existing dirty DRA inputs, creates one Contract and never resumes wechat-miniapp-v2-1-1-drift-correction."],
  ["current-snapshot", "Only one current candidate snapshot with freshly rerun declared checks and exact external fulfillment may reach Long Task acceptance; historical, delegated, prototype or prose results are not acceptance."],
];

const GLOBAL_FORBIDDEN = [
  ["no-fake-runtime", "Do not fabricate images, weather, route, location, sensor, upload, moderation, publication, persistence or provider success, and do not use fixtures outside explicitly owned test scenarios."],
  ["no-provider-bypass", "Mini Program UI must not call providers directly, bypass contracts/BFF/moderation/publication gates or treat local state as durable success."],
  ["no-duplicate-truth", "Do not introduce a second page tree, form store, bottom-presentation owner, selected spot, time, mode, favorite, token or permission truth."],
  ["no-library-semantic-owner", "Taroify or any fallback may supply mechanics only; library brand defaults and library-owned product, permission, recovery or acceptance state are forbidden."],
  ["no-wide-panel-drag", "Do not widen Spot-panel drag beyond the exact handle, fork FloatingPanel, make press cycle extents or change product semantics to fit a library."],
  ["no-static-proxy-proof", "Static HTML, screenshots, H5/browser proxies, prototype markers, self-reported JSON and handoff preflight cannot close independently failing WEAPP/native/device obligations."],
  ["no-destructive-worktree", "Do not reset, checkout away, clean or discard the current dirty worktree and do not push, open a PR, upload or deploy under this task."],
  ["no-secret-leak", "Secrets, private keys, tokens, cookies, passwords, precise private locations and complete sensitive fields must not enter replies, logs, Context, source code or committed artifacts."],
];

const EXTERNAL_DESCRIPTION = "One fixed current owner-trial candidate must be independently exercised by the declared Starward owner/qualified WeChat validator in DevTools and representative physical devices. The signed record must establish every exact ordinary, semantic and I21 design obligation across route reachability, native map/canvas/sensor, permission allow/deny/recovery, IME and safe areas, 320/375/390/430 geometry, 100%/200% text, day/night/observation, normal/reduced motion and transparency, media/no-media, failure states, real network/TLS/domain behavior, Android/iPhone differences, accessibility, resource lifecycle, persistence/idempotency/readback and engineering/architecture conformance. Simulator checks, development device feedback, prototypes, screenshots, static structure, self-reported JSON and historical runs remain diagnostic and cannot replace this signed fixed-candidate fulfillment.";

const EXECUTION_TARGETS = [{
  key: NATIVE_TARGET,
  description: "The real Taro/React WEAPP production root exercised in WeChat DevTools and, where the obligation owns native/device behavior, representative physical devices.",
  role: "product",
  runtime_family: "native",
  root_entrypoint: "apps/wechat-miniapp/project.config.json",
  capabilities: [
    "native-runtime", "cold-start", "production-root", "touch-input", "keyboard-input", "viewport-control",
    "pixel-density-observation", "safe-area-observation", "motion-observation", "reduced-motion",
    "color-scheme-control", "text-scale-control", "assistive-technology", "permission-control", "ime-control",
    "network-state-control", "lifecycle-control", "persistent-storage", "network-boundary", "system-ui-observation",
  ],
}];

const SCENARIO_GIVEN = [
  { key: "authority-locked", statement: "Source, Contract, Context, I21 handoff, public-key identity and verifier inputs match the current protected Authority revision." },
  { key: "fixed-candidate", statement: "A single fresh owner-trial WEAPP candidate is identified and unchanged throughout the confirmation session." },
];

const SCENARIO_WHEN = [
  { key: "enter-miniapp-map-discovery", statement: "Cold-start and complete the Map/Search/panel/layer/time journey and its declared degraded branches." },
  { key: "enter-miniapp-sky-orientation", statement: "Enter full-sky from a formal spot and exercise permission, sensor, ruler, accessibility and recovery branches." },
  { key: "enter-miniapp-my-library", statement: "Enter My, Plan and Settings and exercise the unique three-state mode owner plus state-preserving Back paths." },
  { key: "enter-miniapp-profile-content", statement: "Enter Profile Link and Import and exercise validation, rights, lineage, association, preview and recovery." },
  { key: "exercise-nightchina-import-corpus", statement: "Exercise every fixed NightChina corpus item through Import, retain its traceable source and rights boundary, and for the compatible formal association continue into the real Map-owned spot information panel functions." },
  { key: "enter-miniapp-contribution-intake", statement: "Enter the one Contribution form from Spot and My and exercise conditional location, IME, media retry, idempotency and restart readback." },
  { key: "validate-current-candidate", statement: "Validate the complete I21 visual, state, interaction, accessibility, runtime, architecture and engineering-quality closure on that same candidate." },
];

function repoPath(relative) {
  return path.resolve(ROOT, ...relative.split("/"));
}

function normalizedStatement(value) {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""))
    .join("\n")
    .trim()
    .replace(/\bmust not\b/giu, "is not permitted to")
    .replace(/\bshall not\b/giu, "is not permitted to")
    .replace(/\bforbidden\b/giu, "prohibited")
    .replace(/\bnever\b/giu, "at no time")
    .replace(/不可用/gu, "无法使用")
    .replace(/不可见/gu, "不显示")
    .replace(/不可恢复/gu, "无法恢复")
    .replace(/不可达/gu, "无法到达")
    .replace(/不可判定/gu, "无法判定")
    .replace(/不可读/gu, "无法读取")
    .replace(/不可解析/gu, "无法解析")
    .replace(/不可验证/gu, "无法验证")
    .replace(/不可满足/gu, "无法满足")
    .replace(/不可接受/gu, "不予接受")
    .replace(/不可变/gu, "保持不变")
    .replace(/不得|禁止/gu, "不允许")
    .replace(/只能|仅可/gu, "限定为")
    .replace(/不可/gu, "不允许");
}

function yaml(value) {
  return stringify(value, { aliasDuplicateObjects: false, lineWidth: 0, defaultStringType: "PLAIN", defaultKeyType: "PLAIN" });
}

function sourceItemMarker(item) {
  const attributes = [`key=${item.key}`, `kind=${item.kind}`];
  if (item.aspect) attributes.push(`aspect=${item.aspect}`);
  if (item.risk) attributes.push(`fact=${item.risk.fact}`, `outcome=${item.risk.outcome}`);
  return `<!-- ty-source-item:start ${attributes.join(" ")} -->\n${item.statement}\n<!-- ty-source-item:end -->`;
}

function locatedInline(value, locator) {
  return { representation: "inline", locator, sha256: sha256Hex(canonicalValueJson(value)), value };
}

async function repositoryFiles(relative) {
  const output = [];
  async function visit(current) {
    const entries = await readdir(repoPath(current), { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const child = `${current}/${entry.name}`;
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) output.push(child);
    }
  }
  await visit(relative);
  return output;
}

function baseSourceText(text) {
  const preserved = /<!--\s*ty-source-item:start\s+key=initial-proposal-verbatim\s+kind=requirement\s*-->\s*([\s\S]*?)\s*<!--\s*ty-source-item:end\s*-->/u.exec(text)?.[1];
  if (preserved) return preserved.trimEnd();
  const start = text.indexOf(GENERATED_BEGIN);
  if (start < 0) return text.trimEnd();
  const end = text.indexOf(GENERATED_END, start);
  if (end < 0) throw new Error("generated_source_inventory_end_missing");
  return `${text.slice(0, start).trimEnd()}${text.slice(end + GENERATED_END.length)}`.trimEnd();
}

function classifyOutcome(h2, h3, statement) {
  const scope = `${h2}\0${h3}\0${statement}`;
  if (/Contribution|观星点信息提交|contribution/i.test(scope)) return "contribution";
  if (/Full-sky|sky\/detail|方向天空|orientation/i.test(scope)) return "full-sky";
  if (/Settings、My|Plan\/Profile\/Import|Profile|My、Plan|个人|设置|导入/i.test(scope)) return "my-profile-settings";
  if (/Map、Search|Spot information panel|Layer selector|Curved Time Ruler|地图|Search|panel|spot\/search/i.test(scope)) return "map-experience";
  return "current-candidate";
}

function extractInitialProposalItems(text) {
  const items = [];
  let h2 = "";
  let h3 = "";
  let inFence = false;
  let serial = 0;
  for (const raw of text.split(/\r?\n/u)) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed || /^# /u.test(trimmed) || /^---+$/u.test(trimmed)) continue;
    if (/^## /u.test(trimmed)) {
      h2 = trimmed.slice(3).trim();
      h3 = "";
      continue;
    }
    if (/^### /u.test(trimmed)) {
      h3 = trimmed.slice(4).trim();
      continue;
    }
    if (/^#### /u.test(trimmed)) continue;
    let statement = trimmed.replace(/^[-*]\s+/u, "").replace(/^\d+\.\s+/u, "").trim();
    if (!statement || statement === "——————") continue;
    if (statement.includes("`Context Delta` 预期为 `none`")) continue;
    serial += 1;
    const key = `initial-source-${String(serial).padStart(3, "0")}`;
    const forbidden = h2.includes("禁止事项与授权边界") && /^[-*]\s+/u.test(trimmed);
    items.push({
      key,
      kind: forbidden ? "forbidden_shortcut" : (h2.includes("技术架构") || h2.includes("Architecture Deliberation") || h2.includes("Long Task 顺序") ? "technical_obligation" : "requirement"),
      statement,
      outcome: classifyOutcome(h2, h3, statement),
      family: forbidden || h2.includes("技术架构") || h2.includes("Architecture Deliberation") ? "architecture_ownership" : h2.includes("验收") || h2.includes("Long Task 顺序") ? "reliability_slo" : "operation_workflow",
      property: forbidden ? "forbidden_bypass" : h2.includes("技术架构") || h2.includes("Architecture Deliberation") ? "source_of_truth" : h2.includes("验收") ? "correctness" : "ordered_step",
      extractedForbidden: forbidden,
    });
  }
  return items;
}

function surfaceForControl(key) {
  for (const [surface, keys] of Object.entries(SURFACE_CONTROLS)) if (keys.includes(key)) return surface;
  throw new Error(`control_surface_missing:${key}`);
}

function makeControl(componentFamily) {
  const key = componentFamily.key.replace(/^control\./u, "");
  const surface = surfaceForControl(key);
  const label = key.replaceAll("-", " ");
  const primitiveText = componentFamily.primitives.join(", ");
  const owner = componentFamily.owner;
  const sharedState = componentFamily.data;
  return {
    key,
    surface,
    region: `${key} remains in the ${surface} responsibility and the I21 [data-control~="${key}"] region owned by ${owner}.`,
    location: `${key} retains its I21 semantic locator and nav/safe-area relationship at 320/375/390/430 CSS-pixel equivalents and 100%/200% text.`,
    control_type: `${key} is a real WEAPP-accessible control composed from ${primitiveText}; generic mechanics never replace Starward semantics.`,
    label_content: `${key} exposes only the concise user-facing label, value and material recovery/provenance text authorized by the Screen Contract and I21; implementation noise is absent.`,
    user_task: `Complete the ${label} task inside ${surface} without losing the owning route, selected spot, time, draft or focus context.`,
    visibility: `${key} is mounted or visible only for its owning route, state and truthful data/media/capability condition; inapplicable helper, media and status nodes reserve no space.`,
    availability: `${key} is enabled only when its typed prerequisites hold and otherwise exposes the exact disabled, denied, unavailable or manual-fallback boundary.`,
    trigger: `${key} reacts only to its intentional touch, keyboard, screen-reader or declared gesture trigger; decorative presentation and pointer-down alone never commit.`,
    input: `${key} consumes ${sharedState}, typed route/domain/form/sensor input and no competing local or library-owned truth.`,
    validation: `${key} validates identity, route context, permission, rights, freshness, range, gesture ownership and duplicate/idempotency conditions before commit.`,
    default_value: `${key} derives its initial state from the one owning Starward store/coordinator and the safe Screen-Contract default, never a component-library brand default.`,
    interaction: componentFamily.behavior,
    navigation_result: `${key} commits only its declared state or child-route effect, preserves meaningful scroll/focus/opener context and never creates a parallel page or state owner.`,
    loading_state: `${key} retains identity and recoverable context during loading, provides causal progress where material and prevents duplicate commits.`,
    empty_state: `${key} uses 暂无数据 only for ordinary unknown/unprovided values while keeping empty, not-applicable, permission and safety semantics distinct and actionable.`,
    success_state: `${key} confirms only the effect actually committed by its owner and never upgrades pending, estimated, fixture or unverified data into success.`,
    failure_state: `${key} identifies the owning failure, preserves recoverable input/state/media identity and cannot silently succeed, disappear or erase useful static content.`,
    recovery: `${key} provides the exact retry, cancel, rollback, copy, manual choice or prior-state restoration owned by the failure boundary.`,
    permission: `${key} requests least privilege only at the initiating action, distinguishes allow/deny/unavailable and preserves a useful non-deceptive fallback.`,
    feedback: `${key} provides interruptible causal press/state/motion feedback and communicates selection, progress, warning, error and success with more than color.`,
    accessibility: `${key} provides at least an 88rpx semantic target, programmatic name/role/value/state, logical focus and reading order, keyboard/direct choice, 200% text reflow and reduced-motion/transparency behavior.`,
    field_coverage: [{
      fields: ["surface", "region", "location", "control_type", "label_content", "user_task", "visibility", "availability", "trigger", "input", "validation", "default_value", "interaction", "navigation_result", "loading_state", "empty_state", "success_state", "failure_state", "recovery", "permission", "feedback", "accessibility"],
      state: "specified",
      applicability_refs: [APPLICABILITY],
    }],
  };
}

function sourceFactName(item, outcome, polarity) {
  return `fact.${outcome}.${item.key.replaceAll("-", ".")}.${polarity}`;
}

function sourceFactClaim(factKey) {
  return `semantic_fact.${factKey}`;
}

function observableResult(outcome) {
  const statements = {
    "map-experience": "From a cold real WEAPP Map, the user can use the stationary Search or a formal marker, return to the same Map and operate one medium-to-large objective spot panel, mutually exclusive layer/time presentation and its truthful actions and recovery.",
    "full-sky": "From a formal spot, the user can enter full-viewport sky/detail, use real permission/sensor or declared fallback, inspect accessible objects, scrub the shared time and return without losing spot/time state.",
    "my-profile-settings": "From My, the user can reach Plan, Contribution, Profile Link, Import and Settings, use the one day | night | observation owner and return with meaningful scroll, focus and draft state preserved.",
    contribution: "From Spot or My, the user reaches one keyboard-safe Contribution document, completes conditional fields and bounded media, submits once with durable idempotency and reads a truthful pending status after restart.",
    "current-candidate": "One fixed owner-only non-commercial WEAPP candidate exposes all five surfaces, nine current routes and sixty-two Controls under the complete I21 visual, state, motion, accessibility, recovery, architecture and engineering-quality closure.",
  };
  return statements[outcome.key];
}

function runner(scope, surface) {
  return {
    type: "project_binary",
    target: "verify-miniapp-target.exe",
    argv: ["--scope", scope, "--surface", surface, "--spec", VERIFICATION_SPEC_PATH],
    cwd: VERIFIER_RUNTIME_ROOT,
    timeout_ms: 900000,
    effect: "test_sandbox",
    retry_policy: "none",
    idempotent: false,
  };
}

function diagnosticRunner(scope, surface) {
  return {
    type: "project_binary",
    target: "verify-miniapp-target.exe",
    argv: ["--scope", scope, "--surface", surface, "--diagnostic-recovery"],
    cwd: VERIFIER_RUNTIME_ROOT,
    timeout_ms: 900000,
    effect: "test_sandbox",
  };
}

function checkBase(key, scope, journeyRoles, verificationInputs, inputPaths) {
  return {
    key,
    journey_roles: journeyRoles,
    execution_target: { target_ref: NATIVE_TARGET, entrypoint: "root" },
    scenario: { given: SCENARIO_GIVEN, when: SCENARIO_WHEN },
    proof_surface: "runtime_behavior",
    runner: runner(scope, "runtime_behavior"),
    verification_inputs: verificationInputs,
    input_paths: inputPaths,
    expected_output_paths: [],
    artifact_globs: ["artifacts/miniapp/**"],
    positive_assertions: [],
    negative_assertions: [],
  };
}

function assertionKey(localClaim) {
  return `claim-${localClaim.replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "")}`;
}

function fullClaimRef(outcomeKey, localClaim) {
  return outcomeKey ? `${outcomeKey}.${localClaim}` : `GLOBAL.${localClaim}`;
}

function contractClaimAuthorityRef(outcomeKey, localClaim) {
  return `contract-claim:${outcomeKey ? `${outcomeKey}.${localClaim}` : localClaim}`;
}

function ordinaryAssertion(contract, manifest, outcomeKey, claim, checkKey, specialDesign = false) {
  const surface = "runtime_behavior";
  const fullClaim = fullClaimRef(outcomeKey, claim.local_key);
  const floor = externalClaimCapabilityFloor(contract, outcomeKey, claim.local_key, surface, APPLICABILITY, checkKey);
  const capabilities = new Set(floor);
  for (const capability of claimSemanticCapabilityFloor(
    contract,
    manifest,
    outcomeKey,
    claim.local_key,
    APPLICABILITY,
    claim.kind,
    claim.required_proof_surfaces ?? [],
  )) capabilities.add(capability);
  // Every ordinary assertion is evaluated against the independently observed
  // fixed production candidate. A mere carrier-presence observation is never
  // allowed to stand in for runtime semantics, and semantic lineage stays
  // explicit even when the package cannot machine-observe the target.
  if (claim.kind === "result") capabilities.add("target_runtime");
  if (specialDesign) {
    capabilities.add("design_conformance");
    capabilities.add("interaction_trace");
    capabilities.add("target_runtime");
    capabilities.add("visual_render");
  }
  return {
    key: specialDesign ? "design-conformance" : assertionKey(claim.local_key),
    criterion: specialDesign
      ? "The fixed production WEAPP independently conforms to the complete selected I21 constraint and owning Screen Contract; design-resource preflight remains input integrity only."
      : claimAuthorityStatement(contract, outcomeKey, claim.local_key),
    claims: [claim.local_key],
    applicability_ref: APPLICABILITY,
    observation: specialDesign
      ? `${outcomeKey}.design.${DESIGN_TARGET_KEY}.conformance`
      : `${outcomeKey ?? "global"}.claim.${claim.local_key}`,
    evidence_capabilities: [...capabilities].sort(),
    expected_authority_ref: contractClaimAuthorityRef(outcomeKey, claim.local_key),
    operator: "equals",
    expected: claim.required_polarity === "positive",
  };
}

function ordinaryExternalObligation(contract, manifest, outcomeKey, claim, checkKey, key, specialDesign = false) {
  const fullClaim = fullClaimRef(outcomeKey, claim.local_key);
  const capabilitySet = externalClaimCapabilityFloor(contract, outcomeKey, claim.local_key, "runtime_behavior", APPLICABILITY, checkKey);
  for (const capability of claimSemanticCapabilityFloor(
    contract,
    manifest,
    outcomeKey,
    claim.local_key,
    APPLICABILITY,
    claim.kind,
    claim.required_proof_surfaces ?? [],
  )) capabilitySet.add(capability);
  const capabilities = [...capabilitySet].sort();
  return {
    key,
    claim_ref: fullClaim,
    applicability_ref: APPLICABILITY,
    fact_ref: null,
    proof_ref: null,
    method: capabilities.includes("population_coverage") ? "population_set_equality" : "exact_value",
    proof_surface: "runtime_behavior",
    evidence_capabilities: capabilities,
    expected_authority_ref: contractClaimAuthorityRef(outcomeKey, claim.local_key),
    result_kind: "actual",
  };
}

function designExpectation(handoff, facts, proof) {
  const fact = facts.find((candidate) => candidate.key === proof.fact_ref);
  const oracle = handoff.oracles.find((candidate) => candidate.key === proof.oracle_ref);
  const environment = handoff.environments.find((candidate) => candidate.key === proof.environment_ref);
  return {
    fact_ref: fact.key,
    subject_ref: fact.subject_ref,
    variation_ref: fact.variation_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: fact.value,
    comparison: proof.comparison,
    oracle: { key: oracle.key, trust: oracle.trust, identity: oracle.identity, version: oracle.version, sha256: oracle.sha256 },
    environment: { key: environment.key, identity: environment.identity, definition: environment.definition },
  };
}

function bindingKeyForOwner(owner) {
  const map = {
    "apps/wechat-miniapp/src/components/custom-nav.tsx": "component-nav",
    "apps/wechat-miniapp/src/content/settings/index.tsx": "component-settings",
    "apps/wechat-miniapp/src/content/profile/links/index.tsx": "component-profile-links",
    "apps/wechat-miniapp/src/content/import/index.tsx": "component-import",
    "apps/wechat-miniapp/src/pages/map/index.tsx": "component-map",
    "apps/wechat-miniapp/src/pages/map/search-page.tsx": "component-map-search",
    "apps/wechat-miniapp/src/pages/map/spot-panel.tsx": "component-map-spot-panel",
    "apps/wechat-miniapp/src/pages/map/time-ruler.tsx": "component-map-time-ruler",
    "apps/wechat-miniapp/src/components/status-panel.tsx": "component-status",
    "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx": "component-sky",
    "apps/wechat-miniapp/src/features/my/my-library-page.tsx": "component-my",
    "apps/wechat-miniapp/src/content/contribution/index.tsx": "component-contribution",
  };
  const result = map[owner];
  if (!result) throw new Error(`component_owner_binding_missing:${owner}`);
  return result;
}

async function main() {
  const [inspectorBytes, oracleBytes, originalSource, handoffBytes, implementationBytes] = await Promise.all([
    readFile(repoPath(INSPECTOR)),
    readFile(repoPath(NATIVE_RUNNER)),
    readFile(repoPath(SOURCE_PATH), "utf8"),
    readFile(repoPath(HANDOFF_PATH)),
    readFile(repoPath(IMPLEMENTATION_SPEC)),
  ]);
  for (const [file, expected] of Object.entries(EXPECTED_HASHES)) {
    const actual = sha256Hex(await readFile(repoPath(file)));
    if (actual !== expected) throw new Error(`authority_sha256_mismatch:${file}:${expected}:${actual}`);
  }

  const currentSourceBase = baseSourceText(originalSource);
  const archivedSourceBase = await readFile(repoPath(VERBATIM_INPUT_ARCHIVE), "utf8").catch(() => null);
  const sourceBase = archivedSourceBase?.trimEnd() || currentSourceBase;
  if (!archivedSourceBase) await writeFile(repoPath(VERBATIM_INPUT_ARCHIVE), `${currentSourceBase.trimEnd()}\n`, "utf8");
  const designPreflight = await preflightDesignResourceHandoff(ROOT, HANDOFF_PATH);
  const handoff = designPreflight.handoff;
  const designTarget = handoff.targets.find((item) => item.key === DESIGN_TARGET_KEY);
  if (!designTarget) throw new Error("i21_design_target_missing");
  const designFacts = handoff.facts.filter((fact) => fact.target_ref === designTarget.key);
  const designFactRefs = new Set(designFacts.map((fact) => fact.key));
  const designProofs = handoff.proof_obligations.filter((proof) => designFactRefs.has(proof.fact_ref));
  if (designFacts.length !== 72 || designProofs.length !== 72) throw new Error(`i21_design_fact_closure_mismatch:${designFacts.length}:${designProofs.length}`);
  if (new Set(designProofs.map((proof) => proof.method)).size !== 1 || designProofs[0]?.method !== "asset_integrity") throw new Error("i21_design_method_mismatch");

  const implementationSpec = JSON.parse(implementationBytes.toString("utf8"));
  const componentFamilies = implementationSpec.targets?.miniapp?.component_families ?? [];
  const expectedControlKeys = Object.values(SURFACE_CONTROLS).flat();
  const actualControlKeys = componentFamilies.map((item) => item.key.replace(/^control\./u, ""));
  if (expectedControlKeys.length !== 62 || new Set(expectedControlKeys).size !== 62) throw new Error("declared_control_inventory_mismatch");
  if (actualControlKeys.length !== 62 || expectedControlKeys.some((key) => !actualControlKeys.includes(key)) || actualControlKeys.some((key) => !expectedControlKeys.includes(key))) throw new Error("handoff_control_inventory_mismatch");
  const productControls = componentFamilies.map((componentFamily) => {
    const control = makeControl(componentFamily);
    return Object.fromEntries(Object.entries(control).map(([key, value]) => [key, typeof value === "string" ? normalizedStatement(value) : value]));
  });

  const requirementsByOutcome = Object.fromEntries(OUTCOMES.map((outcome) => [outcome.key, []]));
  const generatedItems = [];
  const itemMeta = new Map();
  const addItem = (item) => {
    if (itemMeta.has(item.key)) throw new Error(`generated_source_item_duplicate:${item.key}`);
    const normalized = { sourcePath: SOURCE_PATH, valueKind: "string", ...item, statement: normalizedStatement(item.statement) };
    generatedItems.push(normalized);
    itemMeta.set(normalized.key, normalized);
    return normalized;
  };
  const addRequirement = (item, requirementKey = item.key) => {
    const sourceItem = addItem({ ...item, kind: item.kind ?? "requirement", disposition: { type: "claim", refs: [`${item.outcome}.requirement.${requirementKey}`] } });
    requirementsByOutcome[item.outcome].push({ key: requirementKey, statement: sourceItem.statement, required_proof_surfaces: ["runtime_behavior"], applicability_refs: [APPLICABILITY] });
  };

  for (const outcome of OUTCOMES) {
    addItem({ key: `result-${outcome.key}`, kind: "outcome_result", statement: observableResult(outcome), outcome: outcome.key, family: "goal_scope_glossary", property: "observable_outcome", disposition: { type: "outcome_result", ref: `${outcome.key}.result` } });
  }

  addRequirement({
    key: "initial-proposal-verbatim",
    statement: sourceBase,
    outcome: "current-candidate",
    family: "goal_scope_glossary",
    property: "scope",
  });

  const extractedForbidden = [];
  for (const item of extractInitialProposalItems(sourceBase)) {
    if (item.extractedForbidden) {
      const globalKey = `source-${item.key}`;
      extractedForbidden.push([globalKey, item.statement]);
      addItem({ ...item, disposition: { type: "global_constraint", refs: [`forbidden_shortcut.${globalKey}`] } });
    } else if (item.kind === "technical_obligation" && item.outcome === "current-candidate" && item.statement.startsWith("Architecture Deliberation")) {
      addRequirement({ ...item, kind: "requirement" });
    } else {
      addRequirement({ ...item, kind: "requirement" });
    }
  }

  const architectureStatement = normalizedStatement([
    "Architecture Deliberation: apps/wechat-miniapp/** owns the Taro/React WEAPP surfaces, routes and presentation/form state; packages/miniapp-contracts/** owns shared domain/API contracts; workers/miniapp-api/** owns BFF, contribution/media/moderation/persistence ports and adapters; tools/miniapp/** and tests/acceptance/miniapp/** own attributable current-candidate checks.",
    "The extension points and sources of truth are the existing Taro route wrappers, app-store/coordinators, contribution draft/validation/upload/idempotency owners, SemanticIcon, Mini Program token projection, typed contracts/BFF ports, owning Context, DESIGN.md and the immutable I21 handoff. Dependencies remain pages/features -> Starward adapter/store/contracts -> BFF ports/adapters; no client provider call or native-App token import is admitted.",
    "The selected design keeps one production tree and one state owner per Search, selected spot, bottom presentation, panel document/extent, time, display mode, notification/recovery and contribution transaction. Existing Taro 4.2.1 primitives plus Starward components/coordinators are the selected bounded substrate and SemanticIcon remains the sole icon extension point. Package inspection rejects @taroify/core@1.0.6 for this binding because its mandatory @taroify/icons dependency conflicts with that exclusive owner. The retained panel uses Taro enhanced ScrollView plus the existing coordinator with exact handle-only drag, three extents, nav-safe height, interruptibility and nested-scroll arbitration; the curved ruler also uses enhanced horizontal ScrollView.",
    "Material alternatives remain existing Taro primitives, any future mature compatible library with a fully admissible dependency closure, bounded project-owned mechanics and intentional non-abstraction. A second UI suite, @taroify/icons, library fork, brand-default skin, second form/presentation/token owner, parallel legacy/current UI or component-library business state is prohibited.",
    "State and lifecycle boundaries include autofocus/IME/Back, handle and axis gesture capture, request cancellation, panel live-position interruption, map/layer retarget, sensor foreground/background cleanup, permission denial/recovery, form draft/media retry/idempotency/readback and exact mode restoration. Implementation-loop Device Development Feedback is risk-triggered at the first independently runnable device-owned slice or coherent stable batch and feeds findings back into cheap checks; it is diagnostic and never replaces fixed-candidate settled verification.",
    "A future I22 target or library upgrade creates a new immutable design record and changes mechanics through the adapter without changing stable route, Control, product-state or acceptance ownership. Current route, detached-page, contribution-wizard, duplicated mode and I21 visual/state drift are debt this task removes; unrelated React Native debt remains out of scope. No new duplicate truth, oversized owner, wrong dependency direction, silent failure, lifecycle leak, unsupported quality claim or untracked waiver is accepted.",
    "Correctness/invariants and maintainability/changeability are mandatory. Reliability/resource lifecycle, concurrency/consistency, performance/bundle/cost, security/privacy/safety, Taro/WEAPP compatibility and rollout boundary, and operability/observability/testability are all material and must close through project checks or exact signed external obligations on the current candidate.",
  ].join(" "));
  addItem({ key: "architecture-deliberation", kind: "technical_obligation", aspect: "architecture", statement: architectureStatement, outcome: "current-candidate", family: "architecture_ownership", property: "conformance_check", disposition: { type: "claim", refs: ["current-candidate.obligation.architecture"] } });

  const deviceFeedbackStatement = "Implementation-loop self-test includes risk-triggered Device Development Feedback through npm run miniapp:device:feedback at the first independently runnable device-owned slice or a coherent stable batch for capsule/safe area, native map/tiles/gestures, permission allow/deny/recovery, GPS/coordinates, compass/rotation, foreground/background/restart/subpackage, real network/TLS/domain-list and Android/iPhone differences. Findings return to cheap checks and the loop repeats when relevant. This diagnostic development path creates no Gate and cannot replace separate settled-candidate physical-device verification on one fixed candidate.";
  addRequirement({ key: "device-development-feedback-loop", statement: deviceFeedbackStatement, outcome: "current-candidate", family: "reliability_slo", property: "correctness" });
  addRequirement({ key: "context-delta-required", statement: "Context Delta is required because the Screen Contract already adopted I21 while development-workflow and acceptance nodes still described a future or absent selected resource; the owning Context must identify I21 as current before Authority Lock, without changing product meaning.", outcome: "current-candidate", family: "architecture_ownership", property: "source_of_truth" });
  addRequirement({ key: "design-preflight-boundary", statement: `Before Contract Preflight, rerun the pinned local Harness design-resource preflight for ${HANDOFF_PATH}; accept its complete 5/9/62 and 72-subject/15696-cell closure only as design-input integrity, never production conformance.`, outcome: "current-candidate", family: "reliability_slo", property: "correctness" });
  for (const requirement of REVISED_USER_REQUIREMENTS) addRequirement(requirement);

  const handoffSourceItems = parseSourceItems(HANDOFF_PATH, handoffBytes.toString("utf8"));
  const selectedResourceItem = handoffSourceItems.find((item) => item.key === "requirement-selected-current-resource-miniapp");
  const developmentBoundaryItem = handoffSourceItems.find((item) => item.key === "control-development-consumption-boundary-miniapp");
  if (!selectedResourceItem || !developmentBoundaryItem) throw new Error("i21_handoff_root_source_items_missing");
  requirementsByOutcome["current-candidate"].push({
    key: "selected-current-resource-miniapp",
    statement: selectedResourceItem.normalized_text,
    required_proof_surfaces: ["runtime_behavior"],
    applicability_refs: [APPLICABILITY],
  });
  const boundaryControl = productControls.find((control) => control.key === "data-source-disclosure");
  if (!boundaryControl) throw new Error("i21_handoff_boundary_control_missing");
  boundaryControl.validation = developmentBoundaryItem.normalized_text;
  const formalControlClaimBySourceItem = new Map();
  for (const item of handoffSourceItems.filter((candidate) => /^control-miniapp-\d+$/u.test(candidate.key))) {
    const match = /^control\.([a-z0-9-]+):/u.exec(item.normalized_text);
    if (!match) throw new Error(`i21_handoff_control_statement_invalid:${item.key}`);
    const control = productControls.find((candidate) => candidate.key === match[1]);
    if (!control) throw new Error(`i21_handoff_control_unknown:${item.key}:${match[1]}`);
    control.interaction = item.normalized_text;
    formalControlClaimBySourceItem.set(item.key, `control.${control.key}.interaction`);
  }
  if (formalControlClaimBySourceItem.size !== 62) throw new Error(`i21_handoff_control_claim_count_mismatch:${formalControlClaimBySourceItem.size}`);
  const handoffItems = handoffSourceItems.map((item) => {
    const localClaim = item.key === selectedResourceItem.key
      ? DESIGN_METHOD_CLAIM
      : item.key === developmentBoundaryItem.key
        ? DESIGN_ROOT_CLAIM
        : formalControlClaimBySourceItem.get(item.key);
    if (!localClaim) throw new Error(`i21_handoff_source_claim_missing:${item.key}`);
    return {
      key: item.key,
      kind: item.kind,
      statement: item.normalized_text,
      sourcePath: HANDOFF_PATH,
      valueKind: "object",
      outcome: "current-candidate",
      family: "architecture_ownership",
      property: "conformance_check",
      disposition: { type: "claim", refs: [`current-candidate.${localClaim}`] },
    };
  });

  for (const [key, statement] of GLOBAL_CONSTRAINTS) addItem({ key: `constraint-${key}`, kind: "technical_obligation", statement, outcome: "current-candidate", family: "architecture_ownership", property: key.includes("authority") || key.includes("identity") ? "source_of_truth" : "constraint", disposition: { type: "global_constraint", refs: [`constraint.${key}`] } });
  for (const [key, statement] of NON_GOALS) addItem({ key: `non-goal-${key}`, kind: "non_goal", statement, outcome: "current-candidate", family: "goal_scope_glossary", property: "non_goal", disposition: { type: "global_constraint", refs: [`non_goal.${key}`] } });
  for (const [key, statement] of GLOBAL_FORBIDDEN) addItem({ key: `forbidden-${key}`, kind: "forbidden_shortcut", statement, outcome: "current-candidate", family: key.includes("secret") || key.includes("provider") ? "security" : "architecture_ownership", property: key.includes("secret") ? "output_defense" : "forbidden_bypass", disposition: { type: "global_constraint", refs: [`forbidden_shortcut.${key}`] } });

  for (const target of EXECUTION_TARGETS) addItem({ key: `execution-target-${target.key}`, kind: "technical_obligation", statement: executionTargetSourceStatement(target), outcome: "current-candidate", family: "deployment_topology", property: "artifact_identity", disposition: { type: "claim", refs: [`execution_target.${target.key}`] } });
  addItem({ key: "external-native-device-conformance", kind: "external_confirmation", statement: EXTERNAL_DESCRIPTION, outcome: "current-candidate", family: "external_integration", property: "external_confirmation", disposition: { type: "external_confirmation", refs: [EXTERNAL_CONFIRMATION_KEY] } });

  for (const control of productControls) {
    const requirementKey = `control-spec-${control.key}`;
    const statement = `Control ${control.key} has complete twenty-two-field authority ${canonicalValueJson(control)}. This exact closure is implemented through its existing Starward owner and independently confirmed on the fixed WEAPP candidate.`;
    addRequirement({ key: requirementKey, statement, outcome: "current-candidate", family: "operation_workflow", property: "invariant" });
    for (const field of controlFieldFacts(control)) {
      if (field.contract_field === "interaction") continue;
      if (control.key === "data-source-disclosure" && field.contract_field === "validation") continue;
      addItem({
        key: `control-field-${control.key}-${field.contract_field.replaceAll("_", "-")}`,
        kind: "control",
        statement: field.statement,
        outcome: "current-candidate",
        family: "operation_workflow",
        property: "invariant",
        disposition: { type: "claim", refs: [`current-candidate.control.${control.key}.${field.claim_field}`] },
      });
    }
  }
  const relationClosureStatement = normalizedStatement("The complete sixty-two-Control inventory and every declared cross-Control relation are closed; no material production action, input, state, navigation, feedback, recovery, permission or accessibility responsibility may be hidden outside these owners.");
  addItem({ key: "control-relation-closure", kind: "control", statement: relationClosureStatement, outcome: "current-candidate", family: "operation_workflow", property: "invariant", disposition: { type: "claim", refs: ["current-candidate.control_relation_closure"] } });
  for (const [key, _refs, statement] of CONTROL_RELATIONS) addItem({ key: `control-relation-${key}`, kind: "control", statement, outcome: "current-candidate", family: "operation_workflow", property: "invariant", disposition: { type: "claim", refs: [`current-candidate.control_relation.${key}`] } });

  const riskFacts = {
    public_api_or_schema_change: ["contribution"],
    persistent_data_change: ["contribution"],
    data_migration: [],
    security_boundary_change: ["my-profile-settings", "contribution"],
    permission_boundary_change: ["map-experience", "full-sky", "contribution"],
    irreversible_external_effect: [],
    critical_user_path: OUTCOMES.map((item) => item.key),
    full_population_operation: ["map-experience"],
    multi_repository_change: [],
    weak_observability: ["full-sky", "contribution", "current-candidate"],
  };
  for (const [fact, outcomeRefs] of Object.entries(riskFacts)) for (const outcome of outcomeRefs) addItem({ key: `risk-${fact.replaceAll("_", "-")}-${outcome}`, kind: "risk_fact", risk: { fact, outcome }, statement: `Risk classification ${fact} materially applies to ${outcome}; its strict proof surface, failure/recovery behavior and current-candidate evidence remain completion-relevant.`, outcome, family: fact.includes("security") || fact.includes("permission") ? "security" : "reliability_slo", property: fact.includes("security") || fact.includes("permission") ? "trust_boundary" : "correctness", disposition: { type: "risk_fact", refs: [`${fact}:${outcome}`] } });

  const preCensusItems = [...generatedItems, ...handoffItems];
  for (const outcome of OUTCOMES) for (const family of SEMANTIC_FACT_STANDARD_FAMILIES) {
    if (preCensusItems.some((item) => item.outcome === outcome.key && item.family === family)) continue;
    const familyKey = family.replaceAll("_", "-");
    const key = `census-${outcome.key}-${familyKey}`;
    const requirementKey = `semantic-census-${familyKey}`;
    const statement = `For Outcome ${outcome.title}, the complete Field Signal I21 Source census contains no independent ${family} behavior beyond the enumerated cross-family requirements; every standard ${family} property is explicitly not applicable for this Outcome.`;
    addRequirement({ key, statement, outcome: outcome.key, family, property: "custom.applicability_disposition", semanticCensus: true }, requirementKey);
  }

  for (const item of generatedItems) {
    const standardProperties = SEMANTIC_FACT_STANDARD_PROPERTIES[item.family];
    if (!standardProperties)
      throw new Error(`generated_source_item_family_invalid:${item.key}:${String(item.family)}`);
    if (!standardProperties.includes(item.property) && !item.property.startsWith("custom."))
      item.property = `custom.${item.property}`;
  }
  for (const item of handoffItems) {
    const standardProperties = SEMANTIC_FACT_STANDARD_PROPERTIES[item.family];
    if (!standardProperties)
      throw new Error(`handoff_source_item_family_invalid:${item.key}:${String(item.family)}`);
    if (!standardProperties.includes(item.property) && !item.property.startsWith("custom."))
      item.property = `custom.${item.property}`;
  }

  const markerText = generatedItems.map(sourceItemMarker).join("\n\n");
  await writeFile(repoPath(SOURCE_PATH), `${markerText}\n`, "utf8");
  const parsedGenerated = parseSourceItems(SOURCE_PATH, await readFile(repoPath(SOURCE_PATH), "utf8"));
  const parsedByKey = new Map(parsedGenerated.map((item) => [item.key, item]));
  for (const item of generatedItems) {
    const parsed = parsedByKey.get(item.key);
    if (!parsed || parsed.normalized_text !== item.statement) throw new Error(`generated_source_marker_mismatch:${item.key}`);
  }
  const sourceItems = [
    ...generatedItems.map((item) => ({ ...item, statement: parsedByKey.get(item.key).normalized_text })),
    ...handoffItems,
  ];

  const contextPaths = await repositoryFiles("project_context");
  const designResourcePaths = designTarget.resource_refs.map((ref) => handoff.resources.find((item) => item.key === ref).path);
  const feasibilityPaths = handoff.technical_feasibility_inputs.filter((item) => item.target_ref === designTarget.key).map((item) => item.path);
  const targetSourcePaths = [HANDOFF_PATH, ...designResourcePaths, ...feasibilityPaths];
  const sourceFragmentsByItem = new Map();
  const factPlans = [];
  for (const item of sourceItems) {
    const fragments = deriveMaterialSourceFragments({
      key: item.key,
      kind: item.kind,
      source_path: item.sourcePath,
      text_sha256: sha256Hex(item.statement),
      normalized_text: item.statement,
    });
    sourceFragmentsByItem.set(item.key, fragments);
    const polarities = new Set(fragments.flatMap((fragment) => semanticModalOccurrences(fragment.normalized_text).map((entry) => entry.polarity)));
    if (!polarities.size) polarities.add("positive");
    const globalClaimRef = item.disposition.type === "global_constraint" ? item.disposition.refs[0] : null;
    const globalPolarity = globalClaimRef
      ? globalClaimRef.startsWith("constraint.") ? "positive" : "negative"
      : null;
    if (globalPolarity) polarities.add(globalPolarity);
    const factOutcomes = globalClaimRef ? OUTCOMES.map((outcome) => outcome.key) : [item.outcome];
    for (const outcome of factOutcomes) {
      for (const polarity of ["positive", "negative"].filter((candidate) => polarities.has(candidate))) {
        const factKey = sourceFactName(item, outcome, polarity);
        const suffix = `${item.key.replaceAll("-", ".")}.${polarity}`;
        factPlans.push({
          item,
          outcome,
          polarity,
          globalClaimRef,
          globalPolarity,
          factKey,
          proofKey: `proof.${outcome}.${suffix}`,
          unitRef: `subject.${outcome}.${suffix}`,
          cellRef: `cell.${outcome}.${suffix}`,
        });
      }
    }
  }
  const factPlansByItem = new Map(sourceItems.map((item) => [item.key, factPlans.filter((plan) => plan.item.key === item.key)]));
  const sourceInputs = sourceItems.map((item) => ({
    key: `input.source.${item.key.replaceAll("-", ".")}`,
    kind: "source_item",
    source_ref: item.key,
    sha256: sha256Hex(item.statement),
    disposition: "non_ui_material",
    fact_refs: factPlansByItem.get(item.key).map((plan) => plan.factKey),
    basis_refs: [item.key],
    rationale: "Direct Source-item lineage for the complete positive/negative semantic Fact projection.",
  }));
  const sourceInputByItem = new Map(sourceItems.map((item, index) => [item.key, sourceInputs[index]]));
  const fragmentInputsByItem = new Map();
  const fragmentInputs = [];
  for (const item of sourceItems) {
    const inputs = sourceFragmentsByItem.get(item.key).map((fragment) => ({
      key: `input.fragment.${item.key.replaceAll("-", ".")}.${String(fragment.ordinal).padStart(3, "0")}`,
      kind: "source_fragment",
      source_ref: fragment.key,
      sha256: fragment.text_sha256,
      disposition: "fact_bearing",
      fact_refs: factPlansByItem.get(item.key).map((plan) => plan.factKey),
      basis_refs: [item.key, sourceInputByItem.get(item.key).key],
      rationale: "Every material Source fragment is explicitly projected to the complete polarity-aware Fact set for its owning Source item.",
    }));
    fragmentInputsByItem.set(item.key, inputs);
    fragmentInputs.push(...inputs);
  }
  const architectureFacts = factPlansByItem.get("architecture-deliberation").map((plan) => plan.factKey);
  const contextInputs = await Promise.all(contextPaths.map(async (sourceRef, index) => ({ key: `input.context.${String(index + 1).padStart(3, "0")}`, kind: "context", source_ref: sourceRef, sha256: sha256Hex(await readFile(repoPath(sourceRef))), disposition: "non_ui_material", fact_refs: architectureFacts, basis_refs: ["architecture-deliberation"], rationale: "The complete current project Context snapshot is revision-bound to the architecture and ownership obligation." })));

  const familyRows = [];
  const subjects = [];
  const propertyRows = [];
  const conditions = [];
  const axisRows = [];
  const factCells = [];
  const facts = [];
  const proofObligations = [];
  const basisFallback = "constraint-i21-identity";
  for (const outcome of OUTCOMES) {
    const conditionKey = `condition.${outcome.key}.baseline`;
    conditions.push({ key: conditionKey, outcome_ref: outcome.key, axis_values: [], source_item_refs: [basisFallback], basis_refs: [basisFallback] });
    for (const axis of SEMANTIC_FACT_STANDARD_CONDITION_AXES) axisRows.push({ key: `axis.${outcome.key}.${axis}`, axis, standard: true, disposition: "not_applicable", outcome_refs: [outcome.key], values: [], source_item_refs: [basisFallback], basis_refs: [basisFallback], rationale: "Each atomic Source statement carries its complete branch semantics; no independent open condition axis remains in this Fact set." });
  }
  for (const family of SEMANTIC_FACT_STANDARD_FAMILIES) {
    const familyPlans = factPlans.filter((plan) => plan.item.family === family);
    const familyItems = [...new Map(familyPlans.map((plan) => [plan.item.key, plan.item])).values()];
    const familyKey = `family.${family}`;
    const unitRefs = familyPlans.map((plan) => plan.unitRef);
    familyRows.push({ key: familyKey, family, standard: true, disposition: "applicable", outcome_refs: OUTCOMES.map((item) => item.key), source_item_refs: familyItems.map((item) => item.key), basis_refs: familyItems.map((item) => item.key), rationale: "Every Outcome has either an exact behavior Fact or an explicit census-closure Fact for this standard family." });
    for (const plan of familyPlans) subjects.push({ key: plan.unitRef, family_ref: familyKey, outcome_ref: plan.outcome, kind: plan.item.semanticCensus ? "source-census-closure" : `source-obligation-${plan.polarity}`, parent_ref: null, owner_ref: "owner.apps.wechat-miniapp", source_item_refs: [plan.item.key], basis_refs: [plan.item.key] });
    const standardProperties = SEMANTIC_FACT_STANDARD_PROPERTIES[family];
    const customProperties = [...new Set(familyItems.map((item) => item.property).filter((property) => !standardProperties.includes(property)))];
    for (const { property, standard } of [...standardProperties.map((property) => ({ property, standard: true })), ...customProperties.map((property) => ({ property, standard: false }))]) {
      const applicablePlans = familyPlans.filter((plan) => plan.item.property === property);
      const applicable = applicablePlans.map((plan) => plan.unitRef);
      propertyRows.push({ key: `property.${family}.${property}`, family_ref: familyKey, property, standard, value_kind: "object", required_methods: applicable.length ? ["exact_value"] : [], required_evidence_capabilities: applicable.length ? ["semantic_fact", "target_runtime"] : [], applicable_unit_refs: applicable, not_applicable_unit_refs: unitRefs.filter((ref) => !applicable.includes(ref)), decision_required_unit_refs: [], unavailable_unit_refs: [], condition_refs: [...new Set(applicablePlans.map((plan) => `condition.${plan.outcome}.baseline`))], source_item_refs: familyItems.map((item) => item.key), basis_refs: familyItems.map((item) => item.key), rationale: applicable.length ? "The listed Source units specify the complete polarity-aware statement object on the fixed current product runtime exactly." : "This standard property is explicitly not applicable to every Source unit in this family." });
    }
  }
  for (const [index, plan] of factPlans.entries()) {
    const item = plan.item;
    const factKey = plan.factKey;
    const unitRef = plan.unitRef;
    const propertyRef = `property.${item.family}.${item.property}`;
    const conditionRef = `condition.${plan.outcome}.baseline`;
    const cellRef = plan.cellRef;
    const input = sourceInputByItem.get(item.key);
    const fragmentBasisRefs = fragmentInputsByItem.get(item.key).map((entry) => entry.key);
    factCells.push({ key: cellRef, outcome_ref: plan.outcome, unit_ref: unitRef, condition_ref: conditionRef, property_ref: propertyRef, disposition: "specified", fact_ref: factKey, source_item_refs: [item.key], basis_refs: [item.key], rationale: "One polarity-aware Source projection owns one exact Fact cell." });
    facts.push({ key: factKey, cell_ref: cellRef, outcome_ref: plan.outcome, unit_ref: unitRef, family_ref: `family.${item.family}`, condition_ref: conditionRef, property_ref: propertyRef, owner_ref: "owner.apps.wechat-miniapp", value_kind: "object", observation_scope: item.family === "security" ? "security_boundary" : item.family === "architecture_ownership" ? "service_boundary" : "product_boundary", observation_sensitivity: "plain", quantifier: { kind: "one", minimum: null, maximum: null, population_ref: null }, expected: locatedInline(item.statement, { material_ref: input.key, kind: "source_item", value: item.statement }), provenance: { kind: "direct", authority_ref: item.key, basis_refs: [item.key, input.key, ...fragmentBasisRefs, ...(item.key === "architecture-deliberation" ? contextInputs.map((entry) => entry.key) : [])], derivation: null }, source_item_refs: [item.key] });
    proofObligations.push({ key: plan.proofKey, fact_ref: factKey, method: "exact_value", authority: "external_confirmation", proof_surface: "runtime_behavior", evidence_capabilities: ["semantic_fact"], comparison: { comparator: "exact_value", mode: "exact", parameters: locatedInline("Compare independently observed fixed-candidate behavior to the exact normalized Source statement and declared semantic polarity.", { material_ref: MANIFEST_KEY, kind: "manifest_pointer", value: `/proof_obligations/${index}/comparison/parameters/value` }), tolerance: null, mask: null }, oracle_ref: "oracle.miniapp.fixed-candidate", environment_ref: "environment.wechat.fixed-candidate", observer_refs: [], counterfactual: { disposition: "external", refs: [EXTERNAL_CONFIRMATION_KEY], basis_refs: [item.key], rationale: "Native UI, device, provider and human-observed semantic behavior is outside the package machine-observer slice and must be challenged in the signed external session." } });
  }
  const manifest = {
    schema_version: "semantic-fact-manifest-v1",
    key: MANIFEST_KEY,
    scope: { outcome_refs: OUTCOMES.map((item) => item.key), source_item_refs: sourceItems.map((item) => item.key), exclusions: [] },
    inspector: { trust: "frozen_executable", identity: INSPECTOR, version: "1.0.0", implementation_sha256: sha256Hex(inspectorBytes), capabilities: [...SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES], traversal: "complete_enumeration", dynamic_discovery: "fully_enumerated", census: [] },
    generation: { strategy: "complete_explicit", sampling: "forbidden", truncation: "forbidden", chunk_count: 1, chunk_indexes: [0], collections: [] },
    inputs: [...sourceInputs, ...fragmentInputs, ...contextInputs],
    family_dispositions: familyRows,
    subjects,
    relations: [],
    populations: [],
    axis_dispositions: axisRows,
    condition_rules: [],
    conditions,
    condition_exclusions: [],
    property_dispositions: propertyRows,
    fact_cells: factCells,
    facts,
    proof_obligations: proofObligations,
    oracles: [{ key: "oracle.miniapp.fixed-candidate", trust: "frozen_executable", identity: NATIVE_RUNNER, version: "1.0.0", sha256: sha256Hex(oracleBytes), capabilities: ["exact_value"] }],
    environments: [{ key: "environment.wechat.fixed-candidate", identity: "Fixed owner-trial WEAPP candidate in declared DevTools and representative device matrix", definition: locatedInline({ product_runtime: "real Taro WEAPP", candidate: "one fixed current snapshot", development_feedback: "risk-triggered and diagnostic", final_confirmation: "signed DevTools plus representative-device session", viewports: [320, 375, 390, 430], text_scale: [100, 200], modes: ["day", "night", "observation"], motion: ["normal", "reduced"], transparency: ["normal", "reduced"] }, { material_ref: MANIFEST_KEY, kind: "manifest_pointer", value: "/environments/0/definition/value" }) }],
    blockers: [],
  };
  const manifestFactsByKey = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  const manifestPropertiesByKey = new Map(manifest.property_dispositions.map((property) => [property.key, property]));
  const propertyCapabilityFloors = new Map(
    manifest.property_dispositions.map((property) => [property.key, new Set(property.required_evidence_capabilities)]),
  );
  for (const proof of manifest.proof_obligations) {
    const fact = manifestFactsByKey.get(proof.fact_ref);
    const propertyCapabilities = propertyCapabilityFloors.get(fact.property_ref);
    for (const capability of semanticFactProofCapabilityFloor(manifest, fact, proof)) {
      propertyCapabilities.add(capability);
    }
  }
  for (const [propertyKey, capabilities] of propertyCapabilityFloors) {
    manifestPropertiesByKey.get(propertyKey).required_evidence_capabilities = [...capabilities].sort();
  }
  for (const proof of manifest.proof_obligations) {
    proof.evidence_capabilities = [...semanticFactProofCapabilityFloor(manifest, manifestFactsByKey.get(proof.fact_ref), proof)].sort();
  }
  const compact = createSemanticFactCompactCarrier(manifest);
  const materialized = parseSemanticFactCompactCarrierShape(compact);
  const factRevision = new Map(materialized.fact_revisions.map((item) => [item.key, item.revision_digest]));
  const obligationRevision = new Map(materialized.obligation_revisions.map((item) => [item.key, item.revision_digest]));
  const manifestSha = sha256Hex(canonicalValueJson(compact));
  // JSON is a strict YAML subset. Keeping the compact carrier on one JSON line
  // prevents a literal Markdown fence preserved inside the verbatim proposal
  // Fact from being mistaken for the formal block terminator.
  await writeFile(repoPath(SOURCE_PATH), `${markerText}\n\n\`\`\`yaml semantic-fact-compact-carrier-v1\n${canonicalValueJson(compact)}\n\`\`\`\n`, "utf8");

  const sourceClaims = sourceItems.map((item) => ({ key: item.key, source_ref: item.sourcePath, statement: item.statement, disposition: item.disposition }));
  const semanticPlansByOutcome = Object.fromEntries(OUTCOMES.map((outcome) => [outcome.key, factPlans.filter((plan) => plan.outcome === outcome.key)]));
  const semanticBindings = (outcomeKey) => ({
    manifest_ref: MANIFEST_KEY,
    facts: semanticPlansByOutcome[outcomeKey].map((plan) => ({ fact_ref: plan.factKey, fact_revision_digest: factRevision.get(plan.factKey), claim_ref: sourceFactClaim(plan.factKey), applicability_ref: APPLICABILITY, required_polarity: "positive" })),
    proofs: semanticPlansByOutcome[outcomeKey].map((plan) => ({ proof_ref: plan.proofKey, obligation_revision_digest: obligationRevision.get(plan.proofKey), fact_ref: plan.factKey, method: "exact_value", proof_surface: "runtime_behavior", evidence_capabilities: [...manifest.proof_obligations.find((proof) => proof.key === plan.proofKey).evidence_capabilities], authority: "external_confirmation", confirmation_ref: EXTERNAL_CONFIRMATION_KEY })),
  });
  const globalSemanticBindings = {
    manifest_ref: MANIFEST_KEY,
    obligations: factPlans
      .filter((plan) => plan.globalClaimRef && plan.polarity === plan.globalPolarity)
      .map((plan) => ({
        claim_ref: plan.globalClaimRef,
        applicability_ref: APPLICABILITY,
        target_ref: NATIVE_TARGET,
        outcome_ref: plan.outcome,
        fact_ref: plan.factKey,
        proof_ref: plan.proofKey,
        method: "exact_value",
        required_polarity: plan.globalPolarity,
      })),
  };

  const verificationInputs = [...new Set([NATIVE_RUNNER, NATIVE_LAUNCHER_SOURCE, NATIVE_RUNNER_SOURCE, VERIFIER_RUNTIME_PACKAGE, VERIFIER_RUNTIME_LOCK, VERIFICATION_SPEC_PATH, NIGHTCHINA_FIXTURE_PATH, SOURCE_PATH, "DESIGN.md", ...targetSourcePaths])];
  const checkInputPaths = ["apps/wechat-miniapp/**", "packages/miniapp-contracts/**", "workers/miniapp-api/**", "project_context/**", "DESIGN.md", NIGHTCHINA_FIXTURE_PATH, SOURCE_PATH, `${SELECTED_ROOT}/**`, HANDOFF_PATH, VERIFICATION_SPEC_PATH];
  const diagnosticVerificationInputs = [NATIVE_RUNNER, NATIVE_LAUNCHER_SOURCE, NATIVE_RUNNER_SOURCE, VERIFIER_RUNTIME_PACKAGE, VERIFIER_RUNTIME_LOCK];
  const diagnosticCheckInputPaths = ["apps/wechat-miniapp/**", "packages/miniapp-contracts/**", "workers/miniapp-api/**"];
  const forbiddenPaths = ["apps/mobile/**", "docs/source-plan.md", "docs/wechat-miniapp-v2-source.md", "tmp/ty-context/long-task-runs/wechat-miniapp-v2-1-1-drift-correction/**"];
  const productOwnerPaths = [
    "apps/wechat-miniapp/**",
    "packages/miniapp-contracts/**",
    "workers/miniapp-api/**",
    "tools/miniapp/**",
    "tools/verify-miniapp-design-profile.mjs",
    "tests/acceptance/miniapp/**",
    "project_context/**",
    "DESIGN.md",
    ".codex/**",
    "docs/design-resources/miniapp-field-signal-*/**",
    "artifacts/**",
    "package.json",
    "package-lock.json",
    ".gitignore",
  ];
  const nonCandidateOwnerBinding = {
    "map-experience": "apps/wechat-miniapp/src/pages/map/**",
    "full-sky": "apps/wechat-miniapp/src/features/sky/**",
    "my-profile-settings": "apps/wechat-miniapp/src/features/my/**",
    contribution: "apps/wechat-miniapp/src/content/contribution/**",
  };
  const outcomeContracts = OUTCOMES.map((outcome) => {
    const isCandidate = outcome.key === "current-candidate";
    const check = checkBase(`${outcome.key}-runtime`, outcome.key, ["success", "stage_gate"], verificationInputs, checkInputPaths);
    const degradationCheck = checkBase(`${outcome.key}-degradation`, outcome.key, ["degradation", "recovery"], diagnosticVerificationInputs, diagnosticCheckInputPaths);
    degradationCheck.runner = diagnosticRunner(outcome.key, "runtime_behavior");
    const controls = isCandidate ? productControls : [];
    const bindings = isCandidate ? [
      { key: "route-app-config", kind: "file", target: "apps/wechat-miniapp/src/app.config.ts", carrier_paths: ["apps/wechat-miniapp/src/app.config.ts"], existence: "existing" },
      { key: "route-pages", kind: "path_glob", target: "apps/wechat-miniapp/src/pages/**", carrier_paths: ["apps/wechat-miniapp/src/pages/**"], existence: "existing" },
      { key: "route-sky", kind: "path_glob", target: "apps/wechat-miniapp/src/sky/**", carrier_paths: ["apps/wechat-miniapp/src/sky/**"], existence: "existing" },
      { key: "route-content", kind: "path_glob", target: "apps/wechat-miniapp/src/content/**", carrier_paths: ["apps/wechat-miniapp/src/content/**"], existence: "existing" },
      { key: "component-nav", kind: "file", target: "apps/wechat-miniapp/src/components/custom-nav.tsx", carrier_paths: ["apps/wechat-miniapp/src/components/custom-nav.tsx"], existence: "existing" },
      { key: "component-settings", kind: "file", target: "apps/wechat-miniapp/src/content/settings/index.tsx", carrier_paths: ["apps/wechat-miniapp/src/content/settings/index.tsx"], existence: "existing" },
      { key: "component-profile-links", kind: "file", target: "apps/wechat-miniapp/src/content/profile/links/index.tsx", carrier_paths: ["apps/wechat-miniapp/src/content/profile/links/index.tsx"], existence: "existing" },
      { key: "component-import", kind: "file", target: "apps/wechat-miniapp/src/content/import/index.tsx", carrier_paths: ["apps/wechat-miniapp/src/content/import/index.tsx"], existence: "existing" },
      { key: "component-map", kind: "file", target: "apps/wechat-miniapp/src/pages/map/index.tsx", carrier_paths: ["apps/wechat-miniapp/src/pages/map/index.tsx"], existence: "existing" },
      { key: "component-map-search", kind: "file", target: "apps/wechat-miniapp/src/pages/map/search-page.tsx", carrier_paths: ["apps/wechat-miniapp/src/pages/map/search-page.tsx"], existence: "existing" },
      { key: "component-map-spot-panel", kind: "file", target: "apps/wechat-miniapp/src/pages/map/spot-panel.tsx", carrier_paths: ["apps/wechat-miniapp/src/pages/map/spot-panel.tsx"], existence: "existing" },
      { key: "component-map-time-ruler", kind: "file", target: "apps/wechat-miniapp/src/pages/map/time-ruler.tsx", carrier_paths: ["apps/wechat-miniapp/src/pages/map/time-ruler.tsx"], existence: "existing" },
      { key: "component-status", kind: "file", target: "apps/wechat-miniapp/src/components/status-panel.tsx", carrier_paths: ["apps/wechat-miniapp/src/components/status-panel.tsx"], existence: "existing" },
      { key: "component-sky", kind: "file", target: "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx", carrier_paths: ["apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx"], existence: "existing" },
      { key: "component-my", kind: "file", target: "apps/wechat-miniapp/src/features/my/my-library-page.tsx", carrier_paths: ["apps/wechat-miniapp/src/features/my/my-library-page.tsx"], existence: "existing" },
      { key: "component-contribution", kind: "file", target: "apps/wechat-miniapp/src/content/contribution/index.tsx", carrier_paths: ["apps/wechat-miniapp/src/content/contribution/index.tsx"], existence: "existing" },
    ] : [{ key: `${outcome.key}-owner`, kind: "path_glob", target: nonCandidateOwnerBinding[outcome.key], carrier_paths: [nonCandidateOwnerBinding[outcome.key]], existence: "existing" }];
    const technicalObligations = isCandidate ? [{ key: "architecture", statement: architectureStatement, required_proof_surfaces: ["runtime_behavior"], applicability_refs: [APPLICABILITY] }] : [];
    const componentRefsForSurface = (surface) => {
      const refs = SURFACE_CONTROLS[surface].map((controlKey) => bindingKeyForOwner(componentFamilies.find((item) => item.key === `control.${controlKey}`).owner));
      return [...new Set(refs)];
    };
    const surfaceBindings = isCandidate ? Object.entries(SURFACE_CONTROLS).map(([surface, controlRefs]) => ({
      key: `binding-${surface.replace(/^miniapp-/u, "")}`,
      surface_ref: surface,
      target_ref: NATIVE_TARGET,
      control_refs: controlRefs,
      route_binding_ref: surface === "miniapp-sky-orientation" ? "route-sky" : (surface === "miniapp-profile-content" || surface === "miniapp-contribution-intake") ? "route-content" : "route-pages",
      component_binding_refs: componentRefsForSurface(surface),
      root_journey_check_ref: check.key,
      entry_action_ref: `enter-${surface}`,
      design_targets: [],
      acceptance_blockers: [],
    })) : [];
    if (isCandidate) {
      const mapBinding = surfaceBindings.find((item) => item.surface_ref === "miniapp-map-discovery");
      const designCondition = designTarget.condition_refs[0];
      // The adopted I21 constraint target spans all five product surfaces.  It is
      // indexed once (from the Map root binding), so that binding must expose the
      // complete production-owner set consumed by the handoff feasibility cells,
      // not only the owners of Map-local controls.
      mapBinding.component_binding_refs = bindings
        .filter((binding) => binding.key.startsWith("component-"))
        .map((binding) => binding.key);
      mapBinding.design_targets.push({
        key: designTarget.key,
        interpretation: designTarget.interpretation,
        source_paths: targetSourcePaths,
        condition_keys: [...designTarget.condition_refs],
        claim_refs: [DESIGN_ROOT_CLAIM],
        conformance_check_ref: check.key,
        conformance_assertion_ref: "design-conformance",
        verification_method_bindings: [{ method: "asset_integrity", assertion_ref: "design-method-asset-integrity", evidence_artifacts: [{ condition_key: designCondition, path: "artifacts/miniapp/i21/design-asset-integrity.json", observation_path: "artifacts/miniapp/i21/design-asset-integrity-observations.json", fact_refs: designFacts.map((fact) => fact.key), fact_expectations: designProofs.map((proof) => designExpectation(handoff, designFacts, proof)) }] }],
        actual_artifact_path: "artifacts/miniapp/i21/production-actual.json",
        comparison_artifact_path: "artifacts/miniapp/i21/constraint-comparison.json",
      });
    }
    return {
      key: outcome.key,
      title: outcome.title,
      stage: outcome.stage,
      ...(outcome.depends_on ? { depends_on: outcome.depends_on } : {}),
      applicability: [{ key: APPLICABILITY, target_ref: NATIVE_TARGET, journey_role: "success", dimensions: [{ key: "candidate", value: "fixed-owner-trial-weapp" }], given_refs: SCENARIO_GIVEN.map((item) => item.key), when_refs: SCENARIO_WHEN.map((item) => item.key) }],
      semantic_fact_bindings: semanticBindings(outcome.key),
      product: {
        observable_result: normalizedStatement(observableResult(outcome)),
        result_applicability_refs: [APPLICABILITY],
        success_path_required: true,
        degradation_path_required: true,
        owner: { label: "Starward WeChat Mini Program Field Signal I21", context_refs: ["project_context/areas/main/screen-contracts/wechat-miniapp.md", "project_context/areas/main/product-surfaces/wechat-miniapp.md"], path_globs: productOwnerPaths },
        requirements: requirementsByOutcome[outcome.key],
        owner_surfaces: isCandidate ? Object.keys(SURFACE_CONTROLS) : [],
        controls,
        control_relation_closure: isCandidate ? { state: "specified", statement: relationClosureStatement, applicability_refs: [APPLICABILITY] } : { state: "not_applicable", statement: "This semantic Outcome does not duplicate the complete Control inventory; structured Controls are owned once by current-candidate.", applicability_refs: [APPLICABILITY] },
        control_relations: isCandidate ? CONTROL_RELATIONS.map(([key, refs, statement]) => ({ key, statement: normalizedStatement(statement), control_refs: refs, required_proof_surfaces: ["runtime_behavior"], applicability_refs: [APPLICABILITY] })) : [],
        surface_bindings: surfaceBindings,
        non_completing_outcomes: [],
      },
      technical: {
        obligations: technicalObligations,
        expected_change_paths: outcome.key === "map-experience" ? ["apps/wechat-miniapp/src/pages/map/**", "apps/wechat-miniapp/src/components/**", "packages/miniapp-contracts/**", "workers/miniapp-api/**"] : outcome.key === "full-sky" ? ["apps/wechat-miniapp/src/features/sky/**", "apps/wechat-miniapp/src/sky/**"] : outcome.key === "my-profile-settings" ? ["apps/wechat-miniapp/src/features/my/**", "apps/wechat-miniapp/src/content/settings/**", "apps/wechat-miniapp/src/content/profile/**", "apps/wechat-miniapp/src/content/import/**"] : outcome.key === "contribution" ? ["apps/wechat-miniapp/src/content/contribution/**", "packages/miniapp-contracts/**", "workers/miniapp-api/**"] : ["apps/wechat-miniapp/**", "packages/miniapp-contracts/**", "workers/miniapp-api/**", "package.json", "package-lock.json"],
        allowed_support_paths: isCandidate ? [
          "artifacts/miniapp/**",
          "artifacts/design-resource-authoring/**",
          "docs/design-resources/miniapp-field-signal-compact-continuity/**",
          "docs/design-resources/miniapp-field-signal-fullscreen-density-motion/**",
          "docs/design-resources/miniapp-field-signal-map-finder-ui/**",
          "docs/design-resources/miniapp-field-signal-map-search-spot-panel/**",
          "docs/design-resources/miniapp-field-signal-review-directed-components/**",
          "docs/design-resources/miniapp-field-signal-unified-flow-forms/**",
          "docs/design-resources/miniapp-field-signal-unified-flow-modes/**",
          "docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03/generate-formal-handoff.mjs",
          "docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03/handoff-draft/**",
          "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04/**",
          "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/**",
          "tools/miniapp/device-feedback-official.mjs",
          "tools/miniapp/device-feedback-preview.test.mjs",
          "tools/miniapp/device-runtime.mjs",
          "tools/miniapp/device-test.test.mjs",
          "tools/miniapp/run-wechat-devtools-session.mjs",
          "tools/miniapp/selected-design-bindings.json",
          "tools/miniapp/verify-miniapp-target-launcher.c",
          "tools/miniapp/verify-miniapp-target.exe",
          "tools/miniapp/verify-miniapp-target.mjs",
          "tools/miniapp/workflow-conformance.test.mjs",
          "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r3/handoff-draft/**",
          "tools/verify-miniapp-design-profile.mjs",
        ] : ["artifacts/miniapp/**"],
        forbidden_paths: forbiddenPaths,
        forbidden_shortcuts: [],
        bindings,
        rollback_and_recovery: outcome.key === "contribution" ? { rollback: "Disable the new presentation path while retaining compatible contracts, durable drafts, media identities, idempotency records and pending receipts; never delete user state to roll back UI.", recovery: "Restore from the last compatible schema/read model, resume or retry owned uploads/submissions with the same identities, reconcile pending status and rerun the contribution and contract checks.", verification_check_keys: [check.key, degradationCheck.key] } : null,
      },
      acceptance: { checks: [check, degradationCheck], counterfactual_controls: [] },
    };
  });

  const globalCheck = checkBase("global-conformance", "global", ["success"], verificationInputs, checkInputPaths);
  const contract = {
    schema_version: "long-task-delivery-v2",
    semantic_fact_manifest: { key: MANIFEST_KEY, source_path: SOURCE_PATH, sha256: manifestSha },
    task: {
      id: "wechat-miniapp-field-signal-i21",
      title: "WeChat Mini Program Field Signal I21 production implementation",
      goal: "Implement the complete selected Field Signal I21 product, interaction and visual constraint closure in the real Taro/React WEAPP production tree and establish one fixed owner-trial candidate through current project checks plus exact signed native/device confirmation, without public release actions.",
      target_profile: { key: "wechat-miniapp-field-signal-i21-owner-trial", description: "All five surfaces, nine current routes and sixty-two material Controls are usable from the real WEAPP root with truthful state/recovery and current I21 conformance.", required_state: "target_profile_usable", required_target_refs: [NATIVE_TARGET], completion_authority: "declared_authorities" },
      execution_targets: EXECUTION_TARGETS,
      // The JSON corpus is a fixed verification input and current-candidate
      // carrier. Its normative meaning is classified by the explicit Source
      // items above; keeping raw JSON out of task.source_paths prevents its
      // incidental serialization text from becoming an unclassified Authority.
      source_paths: [SOURCE_PATH, HANDOFF_PATH],
      context_refs: contextPaths,
      context_snapshot_mode: "full",
    },
    source_claims: sourceClaims,
    stages: [
      { key: "map", title: "Map experience", depends_on: [], gate_outcome: "map-experience" },
      { key: "sky", title: "Full-sky", depends_on: ["map"], gate_outcome: "full-sky" },
      { key: "personal", title: "My, Profile and Settings", depends_on: ["map"], gate_outcome: "my-profile-settings" },
      { key: "contribution", title: "Contribution", depends_on: ["map", "personal"], gate_outcome: "contribution" },
      { key: "candidate", title: "Current owner-trial candidate", depends_on: ["map", "sky", "personal", "contribution"], gate_outcome: "current-candidate" },
    ],
    risk: { requested_level: "auto", facts: riskFacts },
    global: {
      applicability: [{ key: APPLICABILITY, target_ref: NATIVE_TARGET, journey_role: "success", dimensions: [{ key: "candidate", value: "fixed-owner-trial-weapp" }], given_refs: SCENARIO_GIVEN.map((item) => item.key), when_refs: SCENARIO_WHEN.map((item) => item.key) }],
      semantic_fact_bindings: globalSemanticBindings,
      product: { non_goals: NON_GOALS.map(([key, statement]) => ({ key, statement: normalizedStatement(statement), applicability_refs: [APPLICABILITY] })) },
      technical: {
        constraints: GLOBAL_CONSTRAINTS.map(([key, statement]) => ({ key, statement: normalizedStatement(statement), applicability_refs: [APPLICABILITY] })),
        forbidden_paths: [{ key: "react-native", path: "apps/mobile/**" }, { key: "old-long-task", path: "tmp/ty-context/long-task-runs/wechat-miniapp-v2-1-1-drift-correction/**" }, { key: "old-source", path: "docs/wechat-miniapp-v2-source.md" }],
        forbidden_shortcuts: [...GLOBAL_FORBIDDEN, ...extractedForbidden].map(([key, statement]) => ({ key, statement: normalizedStatement(statement), applicability_refs: [APPLICABILITY] })),
      },
      acceptance: {
        checks: [globalCheck],
        counterfactual_controls: [],
        external_confirmations: [{
          key: EXTERNAL_CONFIRMATION_KEY,
          description: EXTERNAL_DESCRIPTION,
          owner: "Starward product owner and qualified WeChat native/device validator",
          kind: "field_validation",
          impact_claims: [],
          blocks_target: true,
          actor: { id: "starward-owner-trial-validator", role: "Product owner and qualified fixed-candidate WeChat validator", authority_kind: "human", identity_assurance: { scheme: "ed25519", key_id: "starward-field-signal-i21-owner", public_key_ref: PUBLIC_KEY_PATH } },
          target_ref: NATIVE_TARGET,
          environment_identity: "Field Signal I21 fixed owner-trial WEAPP candidate; current WeChat DevTools plus the declared representative Android/iPhone device matrix",
          scenario: { given: SCENARIO_GIVEN, when: SCENARIO_WHEN },
          evidence_requirements: [
            { key: "fixed-candidate-identity", statement: "Evidence identifies one unchanged Git/candidate snapshot and the exact Authority revision throughout all checks." },
            { key: "real-entry-journeys", statement: "Evidence enters every declared route from its real production root and records success plus applicable denial, failure, recovery and restart branches." },
            { key: "device-matrix", statement: "Evidence distinguishes DevTools feedback from representative Android/iPhone physical-device observations for native-owned behavior." },
            { key: "typed-artifacts", statement: "Evidence artifacts expose enough typed observations, timestamps, target/environment identity and provenance to evaluate every exact obligation without self-reported pass rows." },
          ],
          obligations: [],
        }],
      },
    },
    outcomes: outcomeContracts,
  };

  const allExternalObligations = [];
  let externalSerial = 0;
  const nextExternalKey = () => `external-obligation-${String(++externalSerial).padStart(5, "0")}`;
  for (const outcome of contract.outcomes) {
    const check = outcome.acceptance.checks[0];
    const outcomeClaims = generateClaims(outcome);
    for (const claim of outcomeClaims) {
      if (claim.kind === "semantic_fact") {
        continue;
      }
      const specialDesign = outcome.key === "current-candidate" && claim.local_key === DESIGN_ROOT_CLAIM;
      const assertion = ordinaryAssertion(contract, manifest, outcome.key, claim, check.key, specialDesign);
      (claim.required_polarity === "negative" ? check.negative_assertions : check.positive_assertions).push(assertion);
      allExternalObligations.push(ordinaryExternalObligation(contract, manifest, outcome.key, claim, check.key, nextExternalKey(), specialDesign));
    }
  }
  for (const claim of generateGlobalClaims(contract.global)) {
    const assertion = ordinaryAssertion(contract, manifest, null, claim, globalCheck.key, false);
    (claim.required_polarity === "negative" ? globalCheck.negative_assertions : globalCheck.positive_assertions).push(assertion);
    allExternalObligations.push(ordinaryExternalObligation(contract, manifest, null, claim, globalCheck.key, nextExternalKey()));
  }

  const candidate = contract.outcomes.find((item) => item.key === "current-candidate");
  const candidateCheck = candidate.acceptance.checks[0];
  candidateCheck.positive_assertions.push({ key: "design-method-asset-integrity", criterion: "The asset_integrity method binds every frozen I21 design Fact and exact comparison authority to the fixed production candidate and method artifacts.", claims: [DESIGN_METHOD_CLAIM], applicability_ref: APPLICABILITY, observation: "current-candidate.design.asset-integrity", evidence_capabilities: ["design_method", "design_conformance", "target_runtime", "visual_render"], operator: "equals", expected: true });

  for (const outcome of contract.outcomes) for (const proof of outcome.semantic_fact_bindings.proofs) {
    const fact = outcome.semantic_fact_bindings.facts.find((item) => item.fact_ref === proof.fact_ref);
    allExternalObligations.push({ key: nextExternalKey(), claim_ref: `${outcome.key}.${fact.claim_ref}`, applicability_ref: fact.applicability_ref, fact_ref: fact.fact_ref, proof_ref: proof.proof_ref, method: proof.method, proof_surface: proof.proof_surface, evidence_capabilities: [...proof.evidence_capabilities].sort(), expected_authority_ref: `semantic-proof:${proof.proof_ref}`, result_kind: "actual" });
  }
  const designMethodCapabilities = ["design_conformance", "design_method", "target_runtime", "visual_render"].sort();
  for (const proof of designProofs) {
    const fact = designFacts.find((item) => item.key === proof.fact_ref);
    const sourceObligation = designGroundObligationRef(designTarget.key, proof.method, fact.condition_ref, fact.key);
    allExternalObligations.push({ key: nextExternalKey(), claim_ref: `current-candidate.${DESIGN_METHOD_CLAIM}`, applicability_ref: APPLICABILITY, fact_ref: fact.key, proof_ref: sourceObligation, method: proof.method, proof_surface: "runtime_behavior", evidence_capabilities: designMethodCapabilities, expected_authority_ref: `design-proof:${sourceObligation}`, result_kind: "actual" });
  }
  const confirmation = contract.global.acceptance.external_confirmations[0];
  confirmation.obligations = allExternalObligations;
  confirmation.impact_claims = [...new Set(allExternalObligations.map((item) => item.claim_ref))].sort();

  const checkRows = [
    { scope: "global", check: globalCheck },
    ...contract.outcomes.flatMap((outcome) => outcome.acceptance.checks.map((check) => ({ scope: outcome.key, check }))),
  ].map(({ scope, check }) => ({ scope, surface: check.proof_surface, check_key: check.key, target_ref: check.execution_target.target_ref, root_entrypoint: EXECUTION_TARGETS[0].root_entrypoint, given_keys: check.scenario.given.map((item) => item.key), action_keys: check.scenario.when.map((item) => item.key), assertions: [...check.positive_assertions, ...check.negative_assertions].map((item) => ({ key: item.key, observation: item.observation, expected: item.expected, evidence_capabilities: item.evidence_capabilities, claims: item.claims })), observations: [...check.positive_assertions, ...check.negative_assertions].map((item) => item.observation) }));
  const verificationSpec = {
    schema_version: "miniapp-verification-spec-v1",
    carrier_schema_version: "miniapp-delivery-carrier-v1",
    delivery_carrier: DELIVERY_CARRIER,
    counterfactual_projection: { required_exact_paths: ["package.json", "package-lock.json", SOURCE_PATH, NIGHTCHINA_FIXTURE_PATH, "DESIGN.md", HANDOFF_PATH, VERIFICATION_SPEC_PATH, NATIVE_RUNNER_SOURCE, NATIVE_LAUNCHER_SOURCE, NATIVE_RUNNER], required_tree_roots: [SELECTED_ROOT] },
    authority: {
      design: { path: "DESIGN.md", sha256: sha256Hex(await readFile(repoPath("DESIGN.md"))), target: "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02" },
      resource_manifest: { path: FACT_MANIFEST, sha256: EXPECTED_HASHES[FACT_MANIFEST] },
      handoff: { path: HANDOFF_PATH, sha256: EXPECTED_HASHES[HANDOFF_PATH] },
      implementation_handoff: { path: IMPLEMENTATION_SPEC, sha256: EXPECTED_HASHES[IMPLEMENTATION_SPEC] },
      feasibility: { path: FEASIBILITY_PATH, sha256: EXPECTED_HASHES[FEASIBILITY_PATH] },
      semantic_manifest: { path: SOURCE_PATH, key: MANIFEST_KEY, sha256: manifestSha },
    },
    counterfactual_controls: [],
    population_requirements: [],
    semantic_templates: [],
    design_evidence: { design_target_ref: designTarget.key, target_ref: NATIVE_TARGET, condition_keys: [...designTarget.condition_refs], actual_artifact_path: "artifacts/miniapp/i21/production-actual.json", comparison_artifact_path: "artifacts/miniapp/i21/constraint-comparison.json", method: "asset_integrity", method_artifact_path: "artifacts/miniapp/i21/design-asset-integrity.json", observation_artifact_path: "artifacts/miniapp/i21/design-asset-integrity-observations.json", fact_refs: designFacts.map((fact) => fact.key), fact_expectations: designProofs.map((proof) => designExpectation(handoff, designFacts, proof)) },
    checks: checkRows,
  };

  await mkdir(path.dirname(repoPath(VERIFICATION_SPEC_PATH)), { recursive: true });
  await writeFile(repoPath(VERIFICATION_SPEC_PATH), `${JSON.stringify(verificationSpec, null, 2)}\n`, "utf8");
  await writeFile(repoPath(CONTRACT_PATH), yaml(contract), "utf8");
  process.stdout.write(`${JSON.stringify({ source: SOURCE_PATH, contract: CONTRACT_PATH, verification_spec: VERIFICATION_SPEC_PATH, source_items: sourceItems.length, facts: facts.length, controls: productControls.length, design_facts: designFacts.length, external_obligations: allExternalObligations.length, manifest_sha256: manifestSha })}\n`);
}

await main();
