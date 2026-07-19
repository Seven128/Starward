# React Native Interaction Contract

This reference operationalizes the project Skill. `DESIGN.md`, the Source Plan, and owning Context remain authoritative.

## Shared Invariants

1. Input receives immediate visible feedback.
2. Continuous input produces continuous presentation updates.
3. Committed domain state changes only at a valid commit point.
4. Cancellation restores or settles to a valid state without firing the action.
5. A running transition remains interruptible unless interruption would violate a safety or irreversible-operation boundary.
6. Presentation state never fabricates weather, astronomy, route, place, or safety facts.
7. Motion does not break selected-place, time-window, route, arrival, or risk synchronization.
8. Visual, semantic, and optional tactile feedback describe the same event.

## Primitive Mapping

| Interaction need | Preferred React Native mechanism | Required behavior |
| --- | --- | --- |
| Button, row, chip, icon action | Accessible `Pressable` or native-backed equivalent | press-in feedback; valid press-out commit; cancel on disabled/invalid release; role/name/state |
| Pan, swipe, drag, sheet | Gesture Handler composed gestures + Reanimated shared values | preserve grab offset; update on UI thread; explicit scroll/map/back relations; cancel/fail recovery |
| Pinch/rotate sky or map overlay | Gesture Handler pinch/rotation composition | anchor around focal point; bounds; simultaneous-policy; accessible alternate controls |
| Physical settle | Reanimated `withSpring` | live start value; bounded target; interruption; system reduced-motion policy |
| Momentum continuation | bounded `withDecay` or projected target + `withSpring` | release velocity; clamp; no invalid domain state; deterministic snap decision |
| Nonphysical visibility/color | `withTiming` or static change | brief, restrained, reversible; no decorative delay |
| Haptic event | `expo-haptics` behind a product wrapper | semantic mapping; availability/setting guard; no sole-channel meaning |
| Screen-reader status | React Native accessibility props and `AccessibilityInfo` announcements | concise, causal, deduplicated; no continuous-value spam |

Do not bind product code directly to every vendor API. Place gesture/spring/haptic tokens and platform differences behind UI-system primitives so the behavior is consistent and testable.

## Press Lifecycle

- `idle → pressed` begins immediately on press-in.
- `pressed → idle/cancelled` occurs when the pointer leaves the retained hit region, the gesture loses, the component disables, navigation removes it, or the operation becomes invalid.
- `pressed → committed` occurs on a valid press-out or keyboard/accessibility activation.
- Loading after commit has a separate state; it is not simulated by holding the pressed visual.
- Prevent duplicate commits while an operation is non-idempotent, but keep cancellation/back behavior and progress feedback available.
- A visually small icon still receives the minimum hit target and an accessible label.

Use restrained scale, opacity, fill, border, or native ripple feedback consistent with the current mode. Never dim critical text below legible contrast.

## Direct Manipulation And Gesture Arbitration

- Save the presentation value and grab offset at gesture begin.
- Use absolute or translated coordinates consistently; avoid snapping the object center to the finger.
- Track velocity from the recognizer and preserve units.
- Define `simultaneousWithExternalGesture`, `requireExternalGestureToFail`, or blocking relations deliberately for nested scroll, map, and sheet interactions.
- Direction-lock only after intent is clear. Avoid a delayed single tap merely to support an unused double tap.
- Provide buttons/steppers/list alternatives for any gesture that exposes essential information or action.
- Map panning/zooming remains owned by the map except on an explicit overlay handle/control.
- System back edges and assistive gestures take precedence over custom navigation gestures.

## Interruption, Projection, And Springs

- Reanimated shared values are the presentation truth during motion.
- Cancel or retarget the existing animation at gesture begin and continue from the current shared value.
- Pass release velocity to the settling primitive where supported.
- Projection is an implementation detail used to select among approved snap points. Keep it bounded and covered by deterministic tests.
- Use independent axes only when both axes are directly manipulated and their bounds/velocity differ.
- Default UI settles without gratuitous overshoot. Momentum-driven drags may use restrained overshoot only within valid visual bounds.
- Do not equate a spring's response with fixed duration or copy Apple's/web constants into production without device POC.
- Centralize token candidates by interaction family: press, small control, navigation transition, sheet, map/card selection, time scrubber, sky manipulation, success/warning/error feedback.

## Bottom Sheet Contract

A Bottom Sheet must define:

- owning task and whether it is modal or parallel;
- allowed snap points and content-dependent constraints;
- initial, expanded, collapsed, dismissed, dragging, settling, keyboard, loading, empty, error, and disabled states;
- handle and whole-surface drag regions;
- nested-scroll arbitration and map interaction policy;
- velocity/position snap selection and interruption;
- safe-area and keyboard avoidance;
- focus entry, focus containment only when truly modal, close semantics, and focus return;
- Android system back and iOS dismissal behavior;
- reduced-motion transition;
- mode-specific solid surface, border, scrim, and no-glass treatment.

Do not let a sheet's visual state diverge from selected place, route, or itinerary state. Dismissing a preview must not silently clear a committed selection unless the product contract says so.

## Starward Interaction Families

### Map And Place

- Selecting a marker updates marker, preview/card, route candidate, and detail reference as one state transition.
- Camera movement follows selection only when needed to keep the subject/action visible; user-initiated map movement is not fought by automatic recentering.
- Marker selection is not color-only and does not use pulsating glow.
- Sheet drag cannot steal an intentional map pan outside the handle/owned surface.

### Time, Forecast, And Sky

- Scrubbing time updates the displayed time immediately and coalesces expensive data work without making the visual thumb lag.
- Sky position, observing window, hourly matrix, and event labels share the committed time.
- Loading a new data window preserves and marks the previous data stale rather than showing fabricated interpolation.
- Reduced motion removes large sky/camera movement; textual/diagram state still updates.

### Route And Itinerary

- Reordering or dragging stages previews a candidate order and commits only a valid route revision.
- Failed route recomputation visibly restores or marks the prior route; it does not leave distance, arrival, and risk from different revisions.
- Destructive removal uses explicit undo or confirmation appropriate to reversibility, never a gesture-only hidden action.

### Field And Safety

- Red-light mode transitions through a low-luminance path and audits native overlays, keyboard, map logo/legal text, permission prompts, errors, and loading placeholders for flashes. An unavoidable unthemed OS/vendor surface requires a pre-handoff warning and safe cancel/return or non-field alternative.
- Safety warnings are never conveyed by animation or haptics alone.
- Camera/sensor use may suppress or affect haptics; the visual/semantic path remains complete.

## Haptic Semantics

Use a small wrapper vocabulary, not arbitrary calls:

- `selection`: a discrete, user-driven selection/snap that is not repeated continuously;
- `success`: completion of a meaningful action;
- `warning`: an actionable safety or validity warning;
- `error`: a failed commit;
- `impact`: only where a physical boundary/snap metaphor is clear.

Guard for user preference, platform/device support, low power, camera/dictation conflicts, and app lifecycle. Throttle repeated selection haptics and never vibrate for continuous map movement, every forecast cell, decorative animation, or background refresh.

## Accessibility Variants

### Reduced Motion

- Remove parallax, large-axis travel, depth simulation, repeated ambient motion, and elastic overshoot.
- Use immediate state changes or short opacity/color transitions that preserve cause and hierarchy.
- Keep direct tracking under the finger when needed for control; reduce only the nonessential settling/display motion.
- Set Reanimated's reduce-motion behavior and also test the full component state path; a library flag alone is not proof.

### Screen Readers

- Expose logical groups instead of every decorative map/sky element.
- Provide selected place, score/uncertainty, time, route, and warning summaries as text.
- Announce commits and important asynchronous results, not each animation frame or drag update.
- Preserve focus when sheets resize and return focus on dismissal.

### Text Scaling And Contrast

- Permit wrapping/reflow; do not clamp key decision/action text to an unreadable line.
- Dense matrices may scroll or reformat while preserving headers, units, and row/column association.
- Selected, disabled, stale, warning, and error states use shape/text/icon/border as well as color.

## Verification Matrix

At minimum, each reusable interactive primitive has:

- unit tests for pure state and snap-selection functions;
- component tests for semantics, pressed/disabled/loading/error, and reduced-motion branches;
- integration tests for gesture competition and shared state updates;
- manual frame/slow-motion review for jumps, velocity seams, and flashes;
- VoiceOver and TalkBack traversal/action review;
- representative real-device review with haptics on/off and reduced motion;
- night/red-light luminance review in a dark environment for field-critical surfaces.

Record exact device/OS/build and unresolved tuning. Simulator-only review is insufficient for haptics, sensors, high-refresh motion, system gestures, or outdoor luminance.
