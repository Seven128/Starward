---
name: starward-interaction-design
description: Apply or review Starward React Native product interactions, gesture-driven UI, press feedback, Bottom Sheets, interruptible motion, haptics, accessibility, and cross-platform behavior. Use for any mobile surface or shared UI component that changes interaction, animation, navigation transition, drag/swipe behavior, map-card synchronization, time scrubbing, reduced-motion behavior, or tactile feedback.
---

# Starward Interaction Design

Use this project Skill to translate Starward's durable design contract into React Native implementation and verification. It adapts useful fluid-interface principles from Emil Kowalski's `apple-design` Skill to Starward's own product, brand, platforms, and stack.

## Authority And Non-Recursion

1. Read repository-root `DESIGN.md` before proposing or changing UI behavior.
2. Read the relevant Outcome, cross-outcome obligations, acceptance scenarios, external confirmations, and decisions in `docs/source-plan.md` when the task is part of planned delivery.
3. Read `project_context/global.md` and the owning area Context before changing durable surface responsibility.
4. Treat `DESIGN.md`, the Source Plan, and owning Context as upstream authority. This Skill is an implementation companion and cannot override them.
5. A pointer in `DESIGN.md` to this Skill is discoverability only. `DESIGN.md` remains complete without loading this file; this file depends on the upstream rules, not the reverse.
6. If this Skill conflicts with an upstream rule, preserve the upstream rule and report the conflict. Do not invent a compromise silently.

## Required Workflow

### 1. Establish The Interaction Contract

For each changed control or transition, identify:

- owner screen/component and user task;
- trigger and commit point;
- pressed, dragging, settling, completed, cancelled, disabled, loading, success, warning, and failure states that apply;
- gesture competition with scrolling, maps, system back, navigation, or another recognizer;
- current/presentation value, target value, release velocity, bounds, snap points, and interruption behavior;
- visual, semantic, haptic, and screen-reader feedback;
- planning, night, red-light, reduced-motion, reduced-transparency, text-scaling, and screen-reader variants;
- iOS/Android differences and a shared product invariant.

Do not start from animation values. Start from the task, state transition, and recovery behavior.

### 2. Select The React Native Primitive

- Use an accessible `Pressable` or an equivalent native-backed control for taps; feedback begins on press-in and the action commits only on a valid press-out.
- Use React Native Gesture Handler for pan, pinch, rotation, composed gestures, map/sheet competition, and continuous direct manipulation.
- Use Reanimated shared values/worklets for gesture-linked frame updates and interruptible settling on the UI thread.
- Use `withSpring` for physical settling, `withDecay` or an explicit bounded projection only when momentum is part of the interaction, and `withTiming` for short nonphysical fades or color/opacity transitions.
- Use `expo-haptics` or a narrowly wrapped native equivalent for optional semantic haptics. Never make haptics the sole feedback channel.
- Use platform navigation and native accessibility APIs for back, focus, announcements, text scaling, and system preferences.

Read `references/react-native-interaction-contract.md` for the detailed mapping and required edge cases.

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

- Use Inter and the typography hierarchy in `DESIGN.md`; do not switch the product to a system-font visual identity because the upstream reference prefers one.
- Use solid or sufficiently opaque Starward surfaces, borders, luminance steps, and restrained elevation. Do not introduce broad blur, glassmorphism, decorative glow, or stacked translucent panels.
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
- Honor reduced transparency where available by using an opaque surface and clear border; Starward's default already avoids glass.
- Support text scaling and reflow without clipping key decisions, units, action labels, or Bottom Sheet controls.
- Announce important asynchronous completion, failure, stale/degraded data, selected-place changes, and safety warnings without flooding the screen reader.
- Respect Android's recommended accessibility timeout for transient actionable content.
- Haptics are optional, short, causal, user-disableable, and paired with visual/semantic feedback.

### 7. Verify With Evidence

For every materially changed interaction, verify:

- tap/press-in/press-out/cancel and rapid repeat;
- drag slowly, flick, reverse, interrupt mid-settle, release outside bounds, and cancel;
- scroll/map/system-back gesture competition;
- keyboard, safe area, orientation, and long/dynamic text where applicable;
- planning, night, and red-light modes with no luminance flash;
- reduced motion, screen reader, text scaling, haptics disabled/unavailable, and low-power behavior;
- representative low-end and high-refresh Android plus supported iPhone hardware;
- state synchronization among map, card, route, detail, sky, or time surfaces affected by the interaction;
- deterministic tests for state/snap selection and real-device review for physical feel.

Do not claim a fluid interaction from static screenshots, unit tests alone, simulator-only evidence, or a nominal 60 FPS counter.

## Review Output

When reviewing or handing off work, report:

- upstream rules applied;
- interaction states and invariants implemented;
- platform-specific differences;
- reduced-motion/haptic fallbacks;
- automated and real-device evidence;
- unresolved token tuning, POC, or external confirmation.

## References

- Detailed React Native mapping: `references/react-native-interaction-contract.md`
- Upstream provenance, adaptation notes, and MIT notice: `references/upstream-attribution.md`
