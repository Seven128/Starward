---
name: starward-interaction-design
description: Implement or review Starward mobile interactions and shared UI for the native React Native App or Taro/WEAPP Mini Program. Use for gesture, animation, Bottom Sheet, map/card synchronization, time scrubber, press feedback, haptic, accessibility or shared interaction-component changes. Select the target platform before choosing primitives.
---

# Starward Interaction Design

Use this project Skill to translate Starward's durable design contract into implementation and verification on the actual target platform. It adapts useful fluid-interface principles from Emil Kowalski's `apple-design` Skill to Starward's own product, brand, platforms, and stack.

## Authority And Non-Recursion

1. Identify the target from the request and current route before expanding references: native React Native App or Taro/WeChat Mini Program. Read `project_context/global.md`, the owning Screen Contract and the target's profile in repository-root `DESIGN.md` before proposing or changing UI behavior.
2. For planned **native App** delivery, locate and read the relevant Outcome and its cross-outcome obligations, acceptance scenarios, external confirmations and decisions in `docs/source-plan.md`. For **Mini Program** work, start with `project_context/areas/main/screen-contracts/wechat-miniapp.md`, its affected owner and adopted resource links; retrieve a relevant Source key/section when the task or owner points to it. The native plan is not a prerequisite for an unrelated Mini Program change. Confirmed Source requirements still apply; historical workflow instructions do not reactivate retired tooling.
3. Read additional owning area Context only for the responsibility or shared dependency being changed. Use bounded headings/key searches before opening large Source files.
4. Treat `DESIGN.md`, the Source Plan, and owning Context as upstream authority. This Skill is an implementation companion and cannot override them.
5. A pointer in `DESIGN.md` to this Skill is discoverability only. `DESIGN.md` remains complete without loading this file; this file depends on the upstream rules, not the reverse.
6. If this Skill conflicts with an upstream rule, preserve the upstream rule and report the conflict. Do not invent a compromise silently.
7. For Mini Program UI work, follow [Mini Program Page Design Resources](../../../project_context/context-maintenance.md#mini-program-page-design-resources): read and visually inspect the adopted resources linked by the affected Screen Contract, implement them faithfully, and derive verification from the current requirements and target runtime. Keep resource adoption and verification rules at that owner rather than duplicating them in this Skill.
8. Follow [Project-local Implementation Decisions](../../../AGENTS.md#project-local-implementation-decisions) for architecture, extraction and dependency choices. This Skill adds UI-specific application of those rules, not another general development workflow.

## Required Workflow

### 1. Establish The Interaction Contract

For each changed control or transition, reuse its existing contract and identify only the dimensions the change can affect. A local text or accessible-name repair does not reopen unchanged interaction, platform or hardware decisions:

- owner screen/component and user task;
- the result the user must be able to perceive or use after the action, including which data/state owner supplies it and how to distinguish it from the prior result;
- trigger and commit point;
- pressed, dragging, settling, completed, cancelled, disabled, loading, success, warning, and failure states that apply;
- gesture competition with scrolling, maps, system back, navigation, or another recognizer;
- current/presentation value, target value, release velocity, bounds, snap points, and interruption behavior;
- visual, semantic, haptic, and screen-reader feedback;
- planning, night, red-light, reduced-motion, reduced-transparency, text-scaling, and screen-reader variants;
- iOS/Android differences and a shared product invariant.

Do not start from animation values. Start from the task, state transition, and recovery behavior. Selection records user intent; asynchronous data readiness and the applied result are separate facts. Derive their presentation from the existing state owners so a selected control cannot silently stand in for a failed, empty or unapplied result. Keep genuine zero values distinct from missing coverage; failure feedback explains the concrete unavailable result and a useful recovery without implying success.

### 2. Find The Shared Owner And Select Target Primitives

Inspect existing UI consumers before building the changed interaction. Share the state transition, gesture arbitration, cleanup and accessibility behavior when consumers need the same contract; keep their content and domain-specific commands at their own owners. A shared image viewer, disclosure or time ruler uses one implementation of its interaction rules; independent component instances may still own separate presentation state. Move affected consumers to the common implementation as part of extraction, and verify their distinct inputs and return/focus paths. Similar-looking UI with different semantics does not need a forced common component.

Identify the target from the task and current route. Consult `project_context/architecture.md` for existing substrate decisions and the actual package manifest for installed capabilities. A design prototype supplies appearance and motion references; it does not choose production runtime dependencies. A mature component must support the adopted geometry, controlled state, gestures, theming and accessibility without overriding domain ownership. Use a small target-runtime check for an uncertain requirement before broad integration.

**Taro / WeChat Mini Program:** reuse the relevant owners under `apps/wechat-miniapp/src/components/**`, bounded Taro/WEAPP primitives, the existing token projection and `semantic-asset.tsx`. Use the actual WEAPP touch/scroll, lifecycle and Back capabilities; browser DOM APIs and React Native packages are not substitutes. Keep official viewer/scroll capabilities when they satisfy the adopted contract; when an essential motion or interaction differs, establish that specific gap and implement the smallest shared adaptation. Do not infer that rejecting one library forbids future compatible libraries; current choices and reasons remain in the architecture owner.

For custom WEAPP modal surfaces that must consume Android system Back, reuse the current shared native Back owner. On the verified runtime, an auxiliary native `PageContainer` must mount only while the modal is active and begin with `show=true`; an always-mounted invisible container toggled from false does not reliably enter the native Back stack. Consume `beforeleave`/`afterleave` once, unmount, and rearm on the next task only if the caller remains open. Keep the visible sheet and its cancel/commit semantics with the caller, and verify keyboard-first Back separately from modal dismissal on a physical device.

For a WEAPP canvas composed with ordinary Taro controls above it, use the same-layer `Canvas type="2d"` node API: query `{ node, size }`, size the backing store with the current device pixel ratio, obtain the context from `node.getContext("2d")`, and create downloaded bitmap images through that canvas node. Do not pair `type="2d"` with legacy `Taro.createCanvasContext`; it leaves the new node without a drawing owner. On the verified Android runtime, the legacy native canvas covered the adopted Sky overlays, while the node 2D path preserved their z-order. Keep a usable list/time/recovery path when canvas creation, image decoding or physical orientation is unavailable, and verify the actual phone surface because desktop layering does not prove native composition.

For WEAPP observations, use the imported official `wechatide-skill` as the primary DevTools control plane and follow [development feedback](../../../project_context/development-workflow/development-feedback.md); the project warm observer remains an optional adapter for an already owned automation connection. Do not use Computer Use for Mini Program development or testing unless the user explicitly requests it. Retain target-native and physical-device verification where required.

**Native React Native App:** use the following native primitives where applicable.

- Use an accessible `Pressable` or an equivalent native-backed control for taps; feedback begins on press-in and the action commits only on a valid press-out.
- Use React Native Gesture Handler for pan, pinch, rotation, composed gestures, map/sheet competition, and continuous direct manipulation.
- Use Reanimated shared values/worklets for gesture-linked frame updates and interruptible settling on the UI thread.
- Use `withSpring` for physical settling, `withDecay` or an explicit bounded projection only when momentum is part of the interaction, and `withTiming` for short nonphysical fades or color/opacity transitions.
- Use `expo-haptics` or a narrowly wrapped native equivalent for optional semantic haptics. Never make haptics the sole feedback channel.
- Use platform navigation and native accessibility APIs for back, focus, announcements, text scaling, and system preferences.

For native App work, read `references/react-native-interaction-contract.md` for the detailed mapping and required edge cases. Do not apply that runtime-specific mapping to WEAPP.

### 3. Implement Directness And Interruption

- Show a pressed state immediately on touch-down; do not delay feedback until the action completes.
- Keep dragged content attached to the user's grab offset and update it continuously.
- Let a user reverse or re-grab a moving sheet, card, scrubber, or other directly manipulated object without waiting for its prior transition.
- Start a retargeted animation from the live shared/presentation value, not from an obsolete logical target.
- Hand release velocity into bounded settling where the library/API supports it; do not create a visible velocity discontinuity.
- Choose snap targets from position, direction, velocity, allowed states, and safety constraints. Position alone is insufficient for a deliberate flick; velocity alone must not bypass a destructive confirmation or hard boundary.
- Apply progressive resistance beyond a soft boundary and a hard clamp at safety/data limits. Do not rubber-band map coordinates, time, or values into invalid domain states.
- Enter and exit along a spatially consistent path and return focus to the logical trigger when a modal layer closes.

Exact thresholds and spring parameters are component tokens validated on representative devices. Do not copy web-oriented constants from the upstream Skill as production truth.

### 4. Preserve Starward Identity

- Use the target product's typography and adopted profile in `DESIGN.md`; native App uses its Inter hierarchy, while Mini Program follows its own profile. Do not substitute one carrier's visual defaults for another's.
- Apply the target profile's surface, border, luminance and elevation rules. For Mini Program, preserve expressly adopted scoped materials such as My's single glass plan card and pale gradient; these do not authorize glass across other pages. Native App and unrepresented scopes retain their own DESIGN.md restrictions.
- Planning, night, and red-light modes keep the same task state and interaction grammar. Red-light mode forbids accidental blue/white flashes during press, transition, loading, error, or native handoff. Warn before an unavoidable unthemed OS/vendor surface and provide a safe cancel/return or non-field alternative.
- Keep motion fast, calm, and explanatory. Delight comes from clarity, continuity, and recovery, not bounce, particles, or ornamental movement.
- Maps, real place imagery, sky, routes, and decision evidence remain the subject; chrome recedes.

### 5. Respect Platform Conventions

Share domain state and acceptance behavior, not every platform animation detail.

- iOS uses expected navigation gestures, safe-area behavior, VoiceOver semantics, and supported Taptic patterns.
- Android uses expected system back/predictive back behavior, TalkBack semantics, native ripple or equivalent feedback where appropriate, and device-compatible haptics.
- Do not make Android imitate iOS navigation physics or visual materials.
- Do not allow a custom horizontal gesture to steal the system back edge, a map pan, a scroll, or an assistive gesture.
- When native capability differs, provide an equivalent visual/semantic result and test both paths.

### 6. Build Accessibility Into The State Machine

- Important targets are at least 44px and retain adequate hit area when visually compact.
- Every control has a role, name, state/value, logical traversal order, and non-color-only selected/error feedback.
- Honor system reduced motion. Replace large translation, parallax, depth, repeated motion, and elastic overshoot with static state changes or short fades; do not merely speed them up.
- Honor reduced transparency where available by using an opaque surface and clear border. Adopted transparent materials retain their meaning through the target profile's opaque alternative.
- Support text scaling and reflow without clipping key decisions, units, action labels, or Bottom Sheet controls.
- Announce important asynchronous completion, failure, stale/degraded data, selected-place changes, and safety warnings without flooding the screen reader.
- Respect Android's recommended accessibility timeout for transient actionable content.
- Haptics are optional, short, causal, user-disableable, and paired with visual/semantic feedback.

### 7. Verify With Evidence

Select verification for the changed contract, affected consumers and target runtime. For material interaction changes, cover the applicable cases below; unrelated platform matrices are not a prerequisite for a local edit. Explicit project acceptance obligations still apply:

Use AGENTS.md's mechanism-based sampling and completion rules. The list below supplies relevant dimensions, not a requirement to test every combination. Before spreading a shared change, inspect its composed result in an actual target-runtime consumer, including inherited styles, native defaults and any displaced rendering. Consumers with different overrides, renderers or lifecycle owners need their own representative observation; repeating identical pages adds little evidence.

When a change affects data results or their presentation state, establish a representative supported input through the existing owners, perform the named user action and inspect the resulting content in the target renderer. Also exercise the applicable missing/failure path and recovery; a permanently empty but honest UI does not establish the positive capability. Check which result is current after a switch, cancellation or late response. Identify controls by the intended action and verify its effect at the consuming surface: selected styling, a success message, an internal fingerprint or a native call returning success cannot establish that the user received the result. Use a controlled input when needed to distinguish expected change from legitimate invariance; apply this within the changed contract rather than requiring a universal screenshot matrix.

Put the adopted reference and actual frame into the reviewer's visual context under comparable state, viewport and scroll conditions. Inspect the changed region and surrounding composition, then exercise the state transitions this change can affect. Read the whole presented frame for visible discrepancies even when the immediate test concerns navigation or data. A class change is not a rendered state, and a still frame does not establish a transition; use a short sequence/recording where needed. Reuse captures that answer several obligations, batch fixes, and recollect only affected evidence. Repair a shared mismatch before expansion. Keep unexplained differences open rather than inventing tolerances or adopting current output as its own reference. Independent review at high-impact reuse/delivery follows AGENTS.md; self-review must be identified as such.

- tap/press-in/press-out/cancel and rapid repeat;
- drag slowly, flick, reverse, interrupt mid-settle, release outside bounds, and cancel;
- scroll/map/system-back gesture competition;
- keyboard, safe area, orientation, and long/dynamic text where applicable;
- planning, night, and red-light modes with no luminance flash;
- reduced motion, screen reader, text scaling, haptics disabled/unavailable, and low-power behavior;
- representative low-end and high-refresh Android plus supported iPhone hardware;
- state synchronization among map, card, route, detail, sky, or time surfaces affected by the interaction;
- shared-component consumers with different content, media presence, extent or return paths, verifying one behavior owner rather than parallel copies;
- deterministic tests for state/snap selection and real-device review for physical feel.

Do not claim a fluid interaction from static screenshots, unit tests alone, simulator-only evidence, or a nominal 60 FPS counter. Capture, actual review and the reviewer's conclusion remain distinct; a reviewed result may still be failed, unverified or not comparable. Keep reference, actual observation, difference and next action in the existing task evidence. Optional `miniapp:conformance-review` notes help track explicitly selected files; they neither require a cold DevTools run nor certify fidelity, complete scope or current-candidate acceptance. Physical behavior retains its device evidence requirement.

## Review Output

When reviewing or handing off work, report the applicable items below, scaled to the change. For a local repair, describe the actual change, relevant checks and remaining gaps; omit unchanged dimensions rather than filling a fixed template:

- upstream rules applied;
- interaction states and invariants implemented;
- platform-specific differences;
- reduced-motion/haptic fallbacks;
- automated and real-device evidence;
- unresolved token tuning, POC, or external confirmation.

## References

- Detailed React Native mapping: `references/react-native-interaction-contract.md`
- Upstream provenance, adaptation notes, and MIT notice: `references/upstream-attribution.md`
