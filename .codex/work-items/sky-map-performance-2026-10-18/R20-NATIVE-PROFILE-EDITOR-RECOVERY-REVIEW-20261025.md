# R20 Native profile editor and recovery independent review

2026-10-25. Reviewer is independent of the implementation author. **Three P2 discrepancies remain; this frozen implementation is not ready to sign off.** No product, configuration, Context, Git, device, DevTools, build, provider, shared service or user database was changed by this reviewer.

## Inputs and evidence boundary

Reviewed the current Native UIUX Skill, its React Native interaction mapping and wording guidance; default global Context; Native product/screen contracts and DESIGN authority; relevant PLAN/HANDOFF; previous preference v2/CAS/current-projection and stable-attempt rules; the implementation report and actual Quick/Wizard/store/runtime/storage consumers. Completed v2/CAS work remains a foundation. Overlay and Sky Play performance/memory remain deferred, unfinished Goal obligations.

The reviewed `tmp/native-quick-preferences-projection-20261025/source-freeze.json` has SHA256 `03ef7f3e7c84da39badb885dec51fa5b1122df7e1641960aad929dc58efcee4e`. All **28/28** declared source/control files matched length and SHA at entry and exit. The exit record is [end-pins.json](tmp/review-profile-editor-recovery-20261025/end-pins.json). The reviewer changed only this report and its own task tmp.

The independent probe imports the actual `MobileShellScreen`, `RuntimeRoot`, shared editor, shell store, domain runtime and production Expo SQLite adapter. RN primitives render in jsdom, Expo crypto is replaced by Node crypto and only the Native SQLite primitive is replaced by a real Node file SQLite database. Controlled SQL write gating and post-commit lost acknowledgement exercise actual production state transitions. These are local consumer/SQL findings; they do not establish Native Expo SQLite, keyboard, system Back, appearance, physical positioning or complete-family acceptance. No source extraction or fake persistence map is used in the final five-case probe. Existing author 19/19 results were read as author evidence, not adopted as this review's verdict.

## P2: the full editor starts a competing draft behind the Quick edit entry

`MobileShellScreen.tsx:314` creates a Quick `useProfileEditor`, while `PreferenceWizard.tsx:97` creates another RHF/attempt instance. The Quick card's “编辑完整观测偏好” entry simply opens Wizard with durable `activeProfile` (`MobileShellScreen.tsx:605`); it does not continue the complete draft already being edited on that card. The Source/contract does not declare a separate task or require saving Quick first. The parent confirmed this entry is the continuation of the same editing intent.

Strict actual-entry reproduction:

1. Current A r4 has unrestricted targets/walking. Select Quick 行星 and 不步行 without saving.
2. Open the full editor from the same card. Change only 接受夜间徒步 and explicitly save.
3. Actual SQLite readback is A r5 with `targets: []`, `maxWalkingKilometers: null`, `acceptsNightWalking: true`. The Quick card still displays its separate unsaved 行星 draft.

The expected same-edit result retains 行星/0 and the full-editor change. Instead, explicit save acknowledges only one of two undisclosed drafts. Sharing a hook implementation does not satisfy the required shared complete-draft/attempt ownership at these actual callers. Repair through the coherent editor owner; do not rebuild a second pending/persistence platform. Recheck this single journey and its cancel/retry ownership after the repair.

## P2: known conflict retry can save the other current profile and lose the retained draft

The first refusal is handled correctly, but the next explicit save can change its target between conflict reset and candidate creation. The relevant production boundary is `use-profile-editor.ts:66`–`75`: resolve original id, `reset(current, {keepDirtyValues:true})`, await validation, then reread mutable form values. The incoming-source adoption effect at lines 38–49 can also reset that form. The probe establishes the wrong-target effect; it does not claim a separately instrumented React scheduling trace.

Actual Screen/store/runtime/SQL reproduction:

1. Edit A r4 targets to 行星. Independently save A r5 with a later city and required parking, then explicitly make B current. A's dirty editor and “保存并切回此预设” remain visible.
2. First save correctly refuses stale A; SQLite bytes/write count remain unchanged, B stays current and A's 行星 remains visible.
3. On the next explicit retry, actual SQLite contains **B r5**, still 银河, while **A stays r5** with its later fields but no 行星. Quick silently changes owner to B and shows 银河. There is no A r6.

The intended explicit conflict recovery is A r6: merge A's still-dirty targets into the authoritative same-id A r5, retain its later non-dirty fields, then activate A. Saving B is a wrong-target effect and loses A's retained input. Keep the original target/draft and submission lifetime stable through reset/validation/source adoption; fixing only presentation would not address this defect. Retain the existing CAS and explicit-retry semantics.

## P2: unknown-command retry promises a profile switch it must not perform

The existing stable replay/current-projection behavior is correct: Quick saves A with a lost post-commit acknowledgement, B is then explicitly made current, and retrying the same frozen A attempt adds **zero SQL writes**, preserves exact durable bytes and keeps B current. The original A is confirmed without changing the current selection; Quick then follows B.

However, the retry button says “保存并切回此预设” and the source-change message says saving will set this profile current (`MobileShellScreen.tsx:462`, `:511`). Those actions contradict this admitted historical-replay outcome. Present confirmation of the original uncertain save honestly; any later switch must remain a distinct genuine new intent through the existing owner. Do not “repair” the text discrepancy by reactivating an old receipt or mutating its candidate/key/timestamp.

## Independently checked recovery that holds

- During a real gated Quick SQL save, a later target edit survives the earlier successful write. SQLite receives A r5 for the first input and A r6 for the subsequent explicit save.
- Closing and reopening Wizard during its pending write creates a new visible session. The old completion does not close that session or replace later input; its later explicit save commits the next revision and then closes.
- A lost acknowledgement followed by another current profile preserves the original attempt, disables discard while unresolved, replays without a new write and applies the authoritative present projection. This passes the data/retry requirement while exposing the wording discrepancy above.

These representative mechanisms do not certify every stale failure, all lifecycle conditions, all profile values or the physical app. The paired semantic review owns the broader value-preservation questions; this review did not duplicate its 0/null/multiple-target matrix.

## Reproduction and raw records

- [Independent probe](tmp/review-profile-editor-recovery-20261025/lifecycle.test.tsx).
- [Strict final output](tmp/review-profile-editor-recovery-20261025/strict-final-run.log): **5 cases, 3 passed and 2 failed**, exit 1. The failures are the same-edit Quick→full SQL result and known-refusal wrong-target result. The third P2 is the rendered wording in the passing stable-replay case.
- [Earlier narrowed wrong-target output](tmp/review-profile-editor-recovery-20261025/known-refusal-failure.log) and [first five-case output](tmp/review-profile-editor-recovery-20261025/expanded-final-run.log) are retained, including synthetic SQL state. No private original data is present.
- `first-run.log` initially had one probe-selector failure because full Wizard uses “流星雨”, whereas Quick uses “流星”. Correcting that selector yielded `final-run.log` 4/4 for that earlier, less strict set; it is a harness correction, not a product fix or final approval. The final strict set replaces the earlier observational Quick→full assertion with the required actual-save expectation.

Run from repository root:

```powershell
node tools/run-node.cjs --bin vitest vitest run .codex/work-items/sky-map-performance-2026-10-18/tmp/review-profile-editor-recovery-20261025/lifecycle.test.tsx --root . --reporter verbose
```

All final React roots were unmounted and all owned SQLite handles closed in `afterEach`; the probe process exited. [Resource summary](tmp/review-profile-editor-recovery-20261025/resource-summary.json) confirms zero remaining owned probe Node processes. Synthetic database originals and raw logs remain. The reviewer performed no listener/service/device action. Root's new APK, real phone/source qualification, actual Native persistence/readback, full Goal acceptance and exact current CI remain Root-owned; this report makes no claim that CI is green.
