import assert from "node:assert/strict";

const baseUrl = (process.env.OPEN_DESIGN_BASE_URL || "").replace(/\/$/, "");
const turn = process.argv.includes("--closure")
  ? "closure"
  : process.argv.includes("--revision")
    ? "revision"
    : process.argv.includes("--completion")
      ? "completion"
      : process.argv.includes("--mechanical")
        ? "mechanical"
    : null;

assert(baseUrl, "OPEN_DESIGN_BASE_URL is required");
assert(turn, "pass exactly one of --closure, --revision, --completion, or --mechanical");

const projectId = "starward-miniapp-field-signal-all-resources";
const conversationId = "4f290527-9979-4b24-b92c-8365b470bf9d";
const designSystemId = "user:starward-mini-program-sky-canvas-field-signal-revision";

const turns = {
  closure: {
    clientRequestId: "ef1f8688-9509-46ce-9ba5-5af17edcfec6",
    message: `Perform the current Starward DRA style-application closure. This turn is strictly read-only.

Read the complete current COMMISSION.md and complete injected design-system body before inspecting the five retained candidate files. Verify canonical section SHA-256 b5b1b95bd46787edd36c31121fa3d11f7b3003362cb44591590f863f6c9e2f52, provider body SHA-256 5af9c8b73a1fbf8f2d2a45ff903a14c4d19d8828e5df62799ab78f16a96a0715, current component Source SHA-256 07f7fa28f676dc3c42608a210b57f0ae38955570e7890c6c1e64069617d1d3fc, and Commission SHA-256 83c0313dd0cfd69cee90a80bfa233e0db493efea6e1d149a59ebbc1638f00bfe. Treat the existing candidate only as rejected defect evidence and a diff baseline.

Close exactly the owner-listed 12 changes and their direct dependencies across the five-Surface / 63-Control audit envelope: compact-but-clear typography and geometry with 44px targets; stationary no-x Search with Back/system/edge return; titleless filters; retained measured disclosures without jitter; 52% translucent image cards; three-card image-backed layer sheet with integrated condition summary and no jump/x/off; marker/result-to-medium navigation-safe panel; handle-only threshold drag with tap/body no-op; full-width document plus floating contiguous rail and smaller rounded-star action rail; objective-only panel without recommendation/window copy; borderless Taro-backed curved ruler; and headerless Full-Sky. Preserve meaningful source/freshness/risk/recovery, privacy, accessibility, real scrolling with hidden chrome, causal interruptible motion, existing Favorite behavior and all unaffected duties.

If a controlling conflict or new owner decision beyond COMMISSION.md is necessary, return decision_required with exact keys and do not write. Otherwise return closure_passed, enumerate the closed dimensions and state that the material revision may proceed. Do not edit, create, delete, rename or format any project file.`,
  },
  revision: {
    clientRequestId: "305dbbad-f929-4daa-a1ec-4d12d5a02bea",
    message: `Materially revise the complete Starward Mini Program interactive candidate to the current COMMISSION.md and injected design system. Read both completely and inspect all five retained files before editing. The closure has resolved the design; do not invent scope or preserve rejected behavior.

Revise the existing five deliverables together. Apply the exact compact hierarchy while retaining 44px targets and all scrolling without visible scrollbar chrome. Search must keep one pixel-stationary field, replace Search with Back in the same leading slot, have no trailing x, and return by visible, system or edge Back with a reversible content reveal. Remove the filter heading/divider; shrink choices and titles; use the exact shared rounded star. Retain partition DOM/state and measured live geometry so rapid expand/collapse has no jitter, flash or scroll reset. Image results use a fixed 52% translucent leading field with the image still faintly visible; no-image cards have no media node/space; whole card selects and opens medium.

The layer trigger must not jump and uses pale active styling. Its fixed 332rpx sheet has no x, off/close row or handle; it contains the compact factual condition summary and exactly three larger local abstract image-backed cards. Map tap, system Back and trigger toggle close it smoothly and restore the prior panel extent without moving the Map.

The spot panel fills the available width and never covers persistent Map/My navigation. Marker/result starts at medium. Only the 56x6rpx dash's 88x72rpx physical hit region can initiate extent drag after the 8px threshold; pointer-down/tap and body/media/content drag do not change extent. Remove blank handle/media bands, calculate live media geometry, and omit media completely when absent. The Overview/Astronomy rail floats at the visual midpoint, consumes no document width, has contiguous items and no dark shadow. Compact the lower action pill to 60-64rpx with 24rpx icons; Want uses the same rounded-star source. Remove TripDecision, cautious-departure and recommended/best-window UI; keep objective facts and meaningful safety/recovery only. Non-marker Map tap animates the panel out.

Use the Taro-enhanced-ScrollView interaction model for the exact borderless 100rpx curved ruler and current arc/snap formula; do not render an outer card, border, shadow or instruction. Full-Sky has no boxed title/place-time/target header, only a quiet Back action, source targets and lower ruler. Preserve existing-duty My and unaffected Product/Screen, Favorite, source/freshness, privacy, share, contribution and accessibility semantics. Third-party screenshots are proportion/pattern inspiration only.

Deliver exactly index.html, assets/styles.css, assets/app.js, coverage.json and README.md. Make five Surfaces, all 63 Controls, nine current routes, 320/375/390/430 widths, 100/200% text, day/night/observation, normal/reduced motion/transparency, touch/keyboard/screen-reader and the Commission's interaction/recovery states reachable. Retire source-lift-focus-layer, map-analysis-time-bar, spot-tonight-decision and all previously retired routes/controls. Run syntax, JSON, static/local-reference, exact-control/surface, prohibited-copy, retired-key and external-resource checks. Do not select, freeze, hand off, edit production code or claim acceptance. If a genuinely new owner decision is required, stop and report exact decision_required keys.`,
  },
  completion: {
    clientRequestId: "d70a7d60-9f8c-4f7d-9b5e-44f737cb5708",
    message: `Complete or repair only the current Starward material revision described by the complete current COMMISSION.md and injected design-system body. Inspect all retained candidate files first and preserve every conformant current expression. Do not perform visual exploration, add product scope, revive superseded behavior, acquire another design system or create extra deliverables.

Independent Browser QA of the I20 candidate found exactly five bounded implementation defects. Repair all five without changing the selected design or any already conformant behavior. The inspected pre-repair hashes are: index.html 0346c7f738cf853dd776654257b0d8fe5f736f1423fa9bdf42ebaaddc950871b; assets/styles.css a4717eb9c86c695c08730ab673de86ec0c77bd4b71f21b5388150ce1c805e027; assets/app.js 5d15d0adb72988b89fef77c94ffe8bac7c72b660ec29e25f02e5beeee879589d; coverage.json 4ca70a3a7efa704bb4cda3f14d8ce981562ee14561113692c6b9cabce2cbd2fe; README.md 7ed10685c6f4e8ad19d1a157853b3ee35720d66ff400a4357e6391e96e674dcd.

1. Visible Search Back is ineffective: after clicking 返回地图 and waiting 740ms, the route remains spot/search. Make visible Back, system Back and left-edge Back all causally exit to pages/map/index exactly once with the existing reversible 160ms content exit and stationary Search frame. Do not rely on a same-URL history event without a bounded fallback; do not leave a stale presentation entry that later navigates unexpectedly; preserve repeated enter/exit behavior.
2. Clicking Search-page content outside the Search frame can blur the input but leaves the suggestion overlay visible because pointerdown excludes every [data-action]. Close suggestions and set aria-expanded=false on every outside interaction, including filters and partition headers, while allowing the intended action to continue. Preserve IME composition and keyboard selection.
3. The decorative Search glyph in the shared leading slot is emitted as an aria-hidden, tabindex=-1 button, exposing an unnamed button in the accessibility tree. Render it as a non-interactive span or equivalent while retaining exact geometry and Back replacement in the same slot.
4. The current panel rail button pseudo-element retains box-shadow inset -2px 0 0 var(--sky). Remove that right-edge selection stripe completely. Keep the pale-blue active fill, contiguous two-button vertical pill, no rail shadow and no document-width reservation.
5. At 390 audit width the panel bottom is 840.0 while the persistent primary-nav top is 839.2, a 0.8px transformed overlap. Make small, medium, large and dragging panel bounds end strictly above the primary-nav top at 320/375/390/430 and 100/200% text, with at least one CSS pixel separation before preview scaling. Do not move or resize the primary nav and do not introduce a large gap.

Preserve all Browser-verified behavior: Map/Search field rectangles are identical; trailing x/filter heading/divider are absent; retained measured partition animation survives rapid reversal; image cards use the fixed 52% field; layer trigger stays fixed and pale-active; Map tap smoothly closes the three-image-card layer sheet; marker/result opens medium; handle tap and body drag are no-ops while handle drag and Large left-edge Back work; no-media spots have no media node; Map-tap panel exit animates; Full-Sky has no header and its ruler has no border/card/shadow; 320px/200% has no horizontal overflow; scrollbar chrome is hidden; console is clean. Keep all 63 Controls, five Surfaces, nine current routes, current Source meaning, themes and recovery/accessibility states. Update coverage.json and README.md with only these repairs and fresh checks, then run every Commission check.

Deliver only index.html, assets/styles.css, assets/app.js, coverage.json and README.md. Do not select, freeze, hand off, edit production code or claim approval. If a truly new owner decision is required, stop and return decision_required with exact keys.`,
  },
  mechanical: {
    clientRequestId: "eabdf80f-b282-493b-a8f3-a69b835c76a8",
    message: `Finish only mechanical auditability and documentation for the same current Starward candidate. Do not redesign or change product meaning.

Read current COMMISSION.md and injected design-system body, then inspect the retained candidate. Repair only concrete syntax, reference, exact stable-control/surface marker, coverage/README or prohibited-copy defects revealed by checks. Final literal data-control keys across index.html and assets/app.js must equal the canonical 63-key set exactly; coverage.json and README.md must describe the actual five-Surface current candidate, current source hashes, reachable conditions, retired route/control absence and zero unresolved items.

Run JavaScript syntax, JSON parse, HTML/static/local-reference, exact Control/Surface set, prohibited visible copy, retired-key and external-resource checks. Deliver only the existing five files. Do not change layout/style/interaction meaning, select, freeze, hand off, edit production code or claim approval.`,
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
  (item) => item.workspaceId === directory.activeWorkspaceId
) || directory.items.find(
  (item) => item.memberStatus === "active" && item.lifecycleState !== "deleted"
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

console.log(JSON.stringify({
  event: "submitted",
  turn,
  clientRequestId: selected.clientRequestId,
  status: response.status,
  contentType: response.headers.get("content-type"),
}));

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
    return;
  }
  if (value && typeof value === "object") {
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
