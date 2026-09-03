import assert from "node:assert/strict";

const baseUrl = (process.env.OPEN_DESIGN_BASE_URL || "").replace(/\/$/, "");
const turn = process.argv.includes("--closure")
  ? "closure"
  : process.argv.includes("--revision")
    ? "revision"
    : process.argv.includes("--mechanical")
      ? "mechanical"
      : null;

assert(baseUrl, "OPEN_DESIGN_BASE_URL is required");
assert(turn, "pass exactly one of --closure, --revision, or --mechanical");

const projectId = "starward-miniapp-field-signal-all-resources";
const conversationId = "4f290527-9979-4b24-b92c-8365b470bf9d";
const designSystemId = "user:starward-mini-program-sky-canvas-field-signal-revision";

const turns = {
  closure: {
    clientRequestId: "e0b35d8e-7d04-47ea-bc5c-3f126acbf4bd",
    message: `Perform the I21 Starward DRA style-application closure. This turn is strictly read-only.

Read the complete current COMMISSION.md and injected project-root DESIGN.md before inspecting the five retained candidate files. The already verified provider-sync preflight establishes canonical section SHA-256 086088d3f54d4bcede978fa0d4c09002bd8660dab0294536106b8e8459f706fa and current component source SHA-256 0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4. Inside this run verify the injected DESIGN.md/provider body SHA-256 53eaac22d20d7b2a3b2bd501c1199558f9601d1afc5ed611d4e5ef7518c8a99d and COMMISSION.md SHA-256 79266ec6a6f98bfb60c1197226a196e70748cc1391674735ccb20f835a48f4d8. Do not invoke the Open Design daemon, CLI or API from inside the agent run and do not re-extract a similarly named section from the external repository root. Treat the retained I20 candidate only as rejected defect evidence and a diff baseline.

Close exactly the owner-listed thirteen changes and direct dependencies across the five-Surface / 62-Control audit envelope: one retained panel document across extents with presence-driven large media; shorter action rail and ordinary missing copy 暂无数据; flush two-item section rail; raised, draggable, arrowless Taro-ScrollView-backed ruler; identical Search text/frame with compact suggestions/filter rhythm; media-first then near-top Map-chrome fade; compact no-media handle band plus the sole 104x40rpx drag region; one mutually exclusive bottomPresentation enum; paler #F5F6FF active state; one animated draggable day/night/observation control that retires observation-mode-control; compact My using restrained semantic colored icons without new duties; a compact one-document Contribution intake with divider-backed fields, conditional complex groups, local validation/upload recovery and one final submit; and an explicit reuse-first library/component/Starward-adaptation mapping. Preserve objective facts, meaningful state/recovery, privacy, accessibility, real scrolling with hidden chrome, all unaffected Controls/routes and production boundaries. Confirm that the viewport remains pure Starward UI/UX while README/coverage documents Taroify as implementation-unverified preferred substrate, exact component mappings, Taro ScrollView special ownership, SemanticIcon retention and bounded fallbacks without adding a second UI/form/icon truth.

If a controlling conflict or new owner choice beyond COMMISSION.md is necessary, return decision_required with exact keys and do not write. Otherwise return closure_passed, enumerate every closed dimension and state that material revision may proceed. Do not edit, create, delete, rename or format any project file.`,
  },
  revision: {
    clientRequestId: "224817af-4c34-40ec-b172-461a0e519729",
    message: `Materially revise the complete Starward Mini Program interactive candidate to the current I21 COMMISSION.md and injected design system. Read both completely and inspect all retained files before editing. The style closure has resolved the design; do not invent scope or preserve rejected I20 behavior.

Revise exactly index.html, assets/styles.css, assets/app.js, coverage.json and README.md together. Keep all five Surfaces, nine current routes and exactly 62 current material Controls reachable and auditable. Retire observation-mode-control plus all previously retired keys/routes. Do not create DECISION_REQUIRED.md unless a genuine owner conflict exists.

The spot panel must permanently retain one DOM/document identity and one order across small, medium and large; extents only crop that document and Large alone owns vertical scroll. Valid media is the sole presentation exception: during medium-to-large it pulls out first, then only near the top Search, Location and Layer controls fade and become inert. With no media render no media node/placeholder/gap and keep the exact compact handle band while dragging. With media overlay the handle on the image and collapse the separate band. Only the centered 104x40rpx rectangle around the 52x5rpx dash initiates extent drag after threshold; body, content, image, top edge and tap/release are no-ops. Keep the panel above persistent Map/My navigation.

All extents expose the same objective fact order. Render ordinary absent/unprovided/unverified values as 暂无数据 without erasing distinct loading, permission, stale, error or risk semantics. Shorten the three-action pill to the exact current geometry and shared rounded-star icon. Make the Overview/Astronomy outer pill 60x104rpx with zero padding, two 52rpx items flush to top/bottom, one divider, no gap, shadow or transform, and keep it floating outside document layout.

Map uses one bottomPresentation enum: none, spot-panel or layer-sheet. Never expose two active/visible bottom components. Opening Layer directly retargets the panel out; marker/result while Layer is open directly retargets to the new spot at medium without restoring the old panel first. Trigger coordinates never jump. All active treatments use #F5F6FF plus inset/indicator/checked state, not deep blue.

Search entry and Search route keep the same visible query-or-placeholder string and pixel-stationary frame; only the leading glyph changes Search to Back. Compact suggestion rows, keep filters 4-6rpx below the field/overlay and only 12-16rpx before the first partition. Preserve autofocus, outside blur, Back/system/edge return, retained disclosure identity and no x/title/divider/flicker.

The shared Curved Time Ruler is borderless, cardless, shadowless, instruction-free, arrowless, 84rpx high and raised 16rpx. Pointer/touch horizontal drag must actually move the track, preview the nearest real slice and snap/commit or cancel. Keep keyboard and assistive increment/decrement semantics without visible arrows.

Settings has one day/night/observation segmented slider, default day. Tap, drag, arrows/Home/End and screen-reader direct choice work; transitions use Sun/Moon/Star, are interruptible and reverse correctly. Night-to-observation binds the closed black/warm-red target palette atomically before icon transition. Do not render binary tabs plus a separate CTA.

Make My smaller, refined and scan-dense using the exact compact header/row geometry and restrained role-colored SemanticIcon tiles for existing Plan, Contribution, Profile Link and Import/Settings duties only. Do not add banners, commerce, social stats, fake metrics, Favorite duplicate or a second icon system.

Recompose the existing Contribution route as one keyboard-safe scroll document, entered from both panel and My with the correct contextual row. Use divider-backed simple fields and top-label complex groups, compact single/multi-select controls, inline validation without empty reserved slots, conditional new-place location consent, a responsive 3-to-2-column media grid with local progress/failure/retry, and exactly one final submit. Preserve draft, media identity, transport retry/idempotency, privacy/rights and pending-review semantics; do not add fields, wizard steps, card walls or duplicate sticky/inline submit controls.

The phone viewport must show only Starward UI/UX, never component-library branding or implementation labels. Outside the phone in README.md and coverage metadata, record the exact production mapping from COMMISSION.md: Taroify Tabbar; Search/Cell/Checkbox.Group; conditional FloatingPanel with exact handle proof and Taro ScrollView fallback; Sidebar/Button.Group; bottom Popup; Radio.Group/Cell/Switch; the full Contribution Form/Field/Input/Textarea/choice/picker/uploader/progress/button set; Toast only through notification-feedback; Taro enhanced ScrollView for the curved ruler; SemanticIcon retained and @taroify/icons excluded. Mark package installation, version lock, tree shaking, bundle delta and native WEAPP behavior unverified in this DRA. The HTML prototype does not import Taroify, external scripts, CDN styles or remote assets and must not imitate its brand defaults.

All page/panel/ruler scroll remains real while scrollbar chrome is absent. Verify 320/375/390/430, 100/200% text, three modes, normal/reduced motion and transparency, touch/keyboard/screen-reader, interruption/cancel/recovery paths and clean console. Representative values remain non-live. No remote resources, network, persistence, secrets or production claims. Run syntax, JSON, local-reference, exact marker/set, prohibited-copy and external-resource checks. Return actual agent/model/reasoning/provenance and diagnostics; do not select, freeze, hand off or edit production code.`,
  },
  mechanical: {
    clientRequestId: "acccfef0-258d-44a5-b4dc-8f7bb3f2a9ad",
    message: `Finish only mechanical conformance and auditability for the same current I21 candidate. Read current COMMISSION.md and injected design system, inspect all five retained files and preserve every conformant visual/interaction decision.

Repair only concrete syntax, local-reference, stable marker, exact set, coverage/README, prohibited-copy, retired-key, accessibility or deterministic interaction defects revealed by checks. Browser audit found these six exact mechanical defects; fix all six without changing the selected design:

1. Search suggestion state is split between state.suggestionsOpen, data-suggestions-open, overlay.hidden and aria-expanded. Initial Search focus exposes the overlay while the page dataset stays false; the first input render moves filters by about 88px, and closing after a rendered-open state leaves 92px blank padding. Make all four representations update atomically on Search entry, focus, input, outside blur, Escape, composition close and exit. The frame/query remain pixel-stationary and filters must not jump or retain a blank suggestion reservation.
2. Search result cards without valid media correctly omit img but .result-copy still stays at 52%, visibly reserving a blank half. Keep 52% copy plus the current 66% gradient only for .has-image; no-image cards use the full available copy width at every viewport and 100/200% text scale.
3. The 60x104rpx floating large-panel section rail currently overlaps right-aligned values such as 暂无数据. Reserve only enough large-state document-side safe inset to prevent any content/rail intersection while keeping the rail outside layout and keeping valid media full bleed.
4. A pointer gesture beginning in the panel body and ending over map-space can synthesize the map-space click and dismiss the panel. Body/content/image/top-edge gestures remain no-op for extent control and must never dismiss the panel on release; only a fresh intentional map-space tap may dismiss. Do not broaden panel dragging beyond the exact handle hot rectangle.
5. Settings tap on the visible Night or Observation mode stop currently leaves data-theme and aria-checked on Day in browser interaction, although drag and keyboard work. Make direct tap/click reliably select the named stop and preserve drag, reverse drag, arrows/Home/End and assistive direct choice without double-advance.
6. After a valid Contribution submission reaches 待审核, the sole submit button becomes active again with 提交审核 but its handler no-ops. Keep the one-submit model, but expose a disabled terminal button labelled 已提交 after completion while preserving the status row and retry/idempotency semantics for genuine transport failure.

Literal data-control keys across index.html and assets/app.js must equal the canonical 62-key set exactly. coverage.json and README.md must describe the actual five Surfaces, nine routes, current source hashes, reachable conditions, retired observation-mode-control and all other retired keys/routes, zero unresolved items, and the complete implementation-unverified Taroify/Taro/Starward component reuse map without leaking it into the phone viewport.

Run JavaScript syntax, JSON parse, HTML/local-reference, exact Control/Surface set, prohibited visible copy, no external resource and candidate-file-boundary checks. Deliver only index.html, assets/styles.css, assets/app.js, coverage.json and README.md. Do not redesign, change product meaning, select, freeze, hand off, edit production code or claim acceptance.`,
  },
};

async function checkedJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} -> ${response.status}: ${(await response.text()).slice(0, 1000)}`);
  }
  return response.json();
}

const health = await checkedJson("/api/health");
assert.equal(health.ok, true);
assert.equal(health.version, "0.21.1");
const directory = await checkedJson("/api/workspace/directory");
const workspace = directory.items.find(
  (item) => item.workspaceId === directory.activeWorkspaceId,
) || directory.items.find(
  (item) => item.memberStatus === "active" && item.lifecycleState !== "deleted",
);
assert(workspace, "no active workspace membership");
const headers = {
  "content-type": "application/json",
  "x-od-workspace-id": workspace.workspaceId,
  "x-od-workspace-member-id": workspace.workspaceMemberId,
};

const agents = await checkedJson("/api/agents", { headers });
const codex = agents.agents.find((agent) => agent.id === "codex");
assert.equal(codex?.available, true, "Codex agent unavailable");
assert(codex.models.some((model) => (typeof model === "string" ? model : model.id) === "gpt-5.6-sol"));

const existingRuns = await checkedJson(
  `/api/runs?projectId=${encodeURIComponent(projectId)}`,
  { headers },
);
assert.equal(
  existingRuns.runs.filter((run) => ["queued", "pending", "running", "canceling"].includes(run.status)).length,
  0,
  "another project run is active",
);

const selected = turns[turn];
const response = await fetch(`${baseUrl}/api/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    agentId: "codex",
    model: "gpt-5.6-sol",
    reasoning: "xhigh",
    projectId,
    conversationId,
    skillId: "frontend-design",
    designSystemId,
    sessionMode: "design",
    clientRequestId: selected.clientRequestId,
    message: selected.message,
  }),
});
if (!response.ok) {
  throw new Error(`POST /api/chat -> ${response.status}: ${(await response.text()).slice(0, 2000)}`);
}

console.log(JSON.stringify({ event: "submitted", turn, clientRequestId: selected.clientRequestId }));
const decoder = new TextDecoder();
const reader = response.body.getReader();
let pending = "";
let receivedBytes = 0;
let eventCount = 0;
let lastProgressAt = Date.now();
const runIds = new Set();
const statusValues = [];
let textTail = "";

function visit(value, key = "") {
  if (typeof value === "string") {
    if (/run.?id/i.test(key) && /^[0-9a-f-]{36}$/i.test(value)) runIds.add(value);
    if (/status|state/i.test(key) && value.length < 80) statusValues.push(value);
    if (/delta|text|message|content|output/i.test(key) && value.length < 20000) {
      textTail = (textTail + value).slice(-4000);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) visit(item, key);
  } else if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  }
}

function consumeLine(rawLine) {
  let line = rawLine.trim();
  if (!line || line.startsWith(":")) return;
  if (line.startsWith("data:")) line = line.slice(5).trim();
  if (!line || line === "[DONE]") return;
  try {
    const event = JSON.parse(line);
    eventCount += 1;
    visit(event);
  } catch {
    textTail = (textTail + line).slice(-4000);
  }
}

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  receivedBytes += value.byteLength;
  pending += decoder.decode(value, { stream: true });
  const lines = pending.split(/\r?\n/);
  pending = lines.pop() || "";
  for (const line of lines) consumeLine(line);
  if (Date.now() - lastProgressAt >= 15000) {
    console.log(JSON.stringify({ event: "progress", turn, receivedBytes, eventCount }));
    lastProgressAt = Date.now();
  }
}
pending += decoder.decode();
consumeLine(pending);

const runsAfter = await checkedJson(
  `/api/runs?projectId=${encodeURIComponent(projectId)}`,
  { headers },
);
for (const run of runsAfter.runs) {
  if (run.clientRequestId === selected.clientRequestId) runIds.add(run.id);
}
console.log(JSON.stringify({
  event: "stream-complete",
  turn,
  clientRequestId: selected.clientRequestId,
  receivedBytes,
  eventCount,
  runIds: [...runIds],
  observedStatuses: [...new Set(statusValues)].slice(-20),
  textTail,
  matchingRuns: runsAfter.runs
    .filter((run) => run.clientRequestId === selected.clientRequestId)
    .map((run) => ({
      id: run.id,
      status: run.status,
      errorCode: run.errorCode ?? null,
      exitCode: run.exitCode ?? null,
      endedWithUnfinishedWork: run.endedWithUnfinishedWork ?? null,
      agentId: run.agentId,
      model: run.model,
      reasoning: run.reasoning,
      skillId: run.skillId,
      designSystemId: run.designSystemId,
      designSystemDigest: run.designSystemDigest,
      pluginId: run.pluginId ?? null,
      appliedPluginSnapshotId: run.appliedPluginSnapshotId ?? null,
    })),
}, null, 2));
