# R19 public button press implementation — 2026-10-22

Status: implementation and focused behavior checks complete; current WEAPP visual/gesture acceptance remains open with the root task. This record does not close R19 or certify native cancellation.

## Applied authority and reference

- `AGENTS.md`, `project_context/global.md`, `project_context/architecture.md`, current `.codex/skills/uiux_design/SKILL.md`.
- `DESIGN.md` Mini Program §5, §7.1 and §8; `shared-state-and-recovery.md` “公共按压与来源入口：2026-10-22采用”.
- Root supplied the freshly retrieved adopted input at `C:/Users/momoooo/AppData/Local/Temp/starward-design-20261022/implementation-input-20261022`. Read `ADOPTION.md` and `source/candidate-preserved/review.mjs` commonCSS/press; visually inspected `review-images/press.png` and the actual round-button Map composition in `review-images/map.png`.
- That scope supplies immediate press feedback, 80ms depression / 140ms release, brightness .96, icon-only translateY 1 logical px / scale .94, unchanged text/layout/hit boxes, no feedback while disabled/loading, original selected/favorite and domain actions retained. It does not select a new design.

## Implementation and consumer migration

`apps/wechat-miniapp/src/components/shared-button-press.tsx` is the native Button adapter. `shared-button-press.scss` is its only transient feedback style owner. It adds no library, subscription, timer, layout query, React state or per-frame update. Taro/WEAPP owns native hover/tap; original touch/long-press/open-type/form-type handlers pass through unchanged. An unavailable (disabled, native loading or aria-busy) button keeps native disabled and cannot invoke its click callback if one is delivered.

Public adapter:

```tsx
import { SharedButton as Button } from "@/components/shared-button-press";
// ordinary text/row/card: default pressVariant="surface"
// direct semantic icon: pressVariant="icon"
// scrim or invisible hit surface: pressVariant="none"
// original visible face is ::before (Map circle / Source pill): pressFace="before"
// independently larger hit target with an inner visible face:
<Button pressVariant="icon" pressFace="child">
  <View className="shared-button-press__face">
    <SemanticIcon className="shared-button-press__icon" name="sky-up" />
  </View>
</Button>
```

The adapter sets native `hoverStartTime=0`, `hoverStayTime=0`; CSS performs the 80ms/140ms transitions. `pressFace="child"` keeps Sky’s nested circle feedback off the larger transparent hit target. `pressFace="before"` uses the existing pseudo-element face for Map and Source controls, retaining its normal shadow when inactive/disabled and requiring no extra wrapper. Direct or explicitly marked icons alone transform; text/card/hit surfaces do not. Reduced-motion retains brightness/edge feedback and removes icon displacement. Observation inherits the existing warm-red `--pressed-overlay` for its press inset; other themes retain the source’s inset color.

All remaining production imports of the raw Taro `Button` were routed through the shared adapter across the component family, settings, contribution/records, plan/sharing, My subcomponents, Map child controls and Sky. Root owns Map/My root, My library and Search navigation composition; the compact-source agent owns SourceDisclosure/SourceReadingSheet/spot panel/terrain. Those owners were given the same adapter API and migrated their own imports. A final source search saw only the adapter importing the native Button. This is a source inventory, not target appearance evidence.

SoftButton retains label/loading/disabled and public onClick semantics, and now forwards optional `pressVariant` / `pressFace`. ToggleField and MyPlanCard no longer define competing native hover classes. Old local `:active` background/opacity/whole-card scaling rules were removed from affected shared, settings, achievement, Plan, My and Sky styles. Root confirmed removal of the two old app.scss SoftButton `:active` rules. The Map handle’s separate no-op gesture surface is unchanged. My’s existing glass touch-position highlight remains; its whole-card scale was removed to preserve text/hit geometry. FavoriteStar, selected classes, mode gestures, Sky six-field hold/repeat and Sky browse-rotor transitions retain their existing owners.

## Checks

The following bounded behavior run passed all 54 cases:

```powershell
node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/components/shared-button-press.test.ts apps/wechat-miniapp/src/components/soft-button.test.ts apps/wechat-miniapp/src/components/toggle-field.test.ts apps/wechat-miniapp/src/components/observation-date-control.test.ts apps/wechat-miniapp/src/components/notification-host.test.ts apps/wechat-miniapp/src/components/spot-image-viewer-motion.test.ts apps/wechat-miniapp/src/content/settings/display-mode-control.test.ts apps/wechat-miniapp/src/features/my/my-plan-card-press.test.ts apps/wechat-miniapp/src/features/sky/sky-time-input.test.ts apps/wechat-miniapp/src/features/sky/sky-controls-recovery.test.ts
```

New tests exercise command suppression for disabled/loading, one native event reaching the original command, untouched touch/cancel/long-press/platform handlers and a scrim’s original close command. Existing consumer tests cover long-press repeat compatibility-click suppression, controlled selection, lifecycle cleanup and account/current-context guards. No CSS mirror test was added, and these tests do not simulate native hover cancellation or certify rendered motion.

The first workspace `npm run typecheck --workspace @starward/wechat-miniapp` found four TS2339 touch-event typing errors in the compact agent’s in-progress `source-reading-sheet.tsx` at 47/48/51/52; no shared-button or migrated-consumer error was reported. The owning agent was notified and root subsequently confirmed the integrated typecheck passed. After adding `pressFace="before"` and forwarding `pressFace` through SoftButton, the six shared adapter/SoftButton behavior cases were rerun and passed. Root owns the integrated build and native acceptance results.

## Native evidence still required

Taro 4.2.1 installed `node_modules/@tarojs/components/types/Button.d.ts` and its [Button documentation](https://docs.taro.zone/docs/components/forms/button/) establish the native hoverClass/start/stay API. The official WeChat Button/View page fetches were unavailable during this task; the available API text does not specify all move-out/page-hide behavior. Consequently this implementation delegates cancellation to native Button but does **not** claim that slide-out, scroll takeover or hide/resume has been observed to reset correctly.

Root must observe one composed round button, one scrolling row/card and Sky time hold/repeat in the actual WEAPP candidate: press/release, slide outside, scroll takeover, touchcancel, page hide/show, disabled/loading and a quick repeat. Compare current icon/face feedback with the adopted reference, including no whole-layout scaling and no parent Map/Sky render caused only by feedback. If native cancellation fails a required boundary, add the smallest shared cancellation adaptation from that observed gap; do not expand a second gesture state owner speculatively. Existing target/device requirements remain open until actual evidence is recorded.

No device/IDE/service/build/Git operation, worktree replacement, PLAN/HANDOFF edit, data upload or design-resource mutation was performed by this subtask.

## Root review of the retained gen3 clip

The already captured `recording-1792668977512.mp4` is 5.727278 seconds at 1080×2376. Root decoded it locally and actually viewed original-size frames at 0, 1, 3 and 5.627278 seconds; extraction metadata and six frames are private in `r19-ui-20261022/gen3-press-recording-review`. A temporary loopback-only video reader and ephemeral headless Edge process were closed afterward. The original clip/archive was untouched and nothing was uploaded. A first file-origin canvas export was rejected as tainted; serving the one owned clip on loopback resolved that browser boundary without disabling browser security.

The layer round face is visibly darker at 3 seconds and returns to its light face in the final viewed frame; its placement stays fixed, and the sampled views remain Map rather than opening the layer sheet during the sustained contact. This is partial native appearance evidence for the unchanged shared press family. There is no synchronized touch-down/up timestamp in this review, so it does not establish 80/140ms timing or certify every cancellation/disabled/loading/row/Sky hold mechanism. The old gen3 source sheet/button is superseded and is not a reference for the new source-page family.
