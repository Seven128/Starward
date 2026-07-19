# Area Context: main

## Responsibility

- Own the end-to-end mobile stargazing decision journey for 《今晚去观星》.
- Turn weather, astronomy, place, route, safety, and preparation information into one understandable and executable plan.

## User / System Contract

- Tonight home answers whether the user should go, communicates uncertainty, gives a score or concise assessment, and identifies the best observing window.
- Map and place discovery compare a main place with alternates, expose relevant filters, and preserve one selected-place state across marker, preview sheet, route, and detail.
- Place detail owns real-place context, distance, drive time, dark-sky quality, facilities, safety, and the transition into route planning.
- Route planning owns origin/destination, route alternatives when available, distance, duration, expected arrival, route risk, and navigation handoff.
- Weather/astronomy analysis owns cloud layers, transparency, seeing, light pollution, lunar/solar events, celestial position, model comparison, and hourly conditions through progressive disclosure.
- Preparation owns equipment recommendations, photography parameters, and a pre-trip checklist.
- Field controls own low-distraction on-site observation behavior; red-light mode changes luminance, not information architecture.
- Every data-bearing surface distinguishes loading, empty, no-results, stale/degraded, error, and success where those states can occur. Uncertain or unavailable data must not be replaced with realistic-looking fallback values.

## Core Data / API / State

- Coordinated decision state includes date/time, current location or origin, selected place, alternate places, observing window, route, expected arrival, forecast/astronomy evidence, risk, and preparation state.
- Selection changes synchronize map marker, place card/Bottom Sheet, route summary, and detail content.
- Route changes synchronize distance, duration, arrival, and risk.
- Time changes synchronize sky position, observing window, and hourly/professional data.
- Planning, night, and red-light are presentation modes over the same task state.

## Module Design Capsule

- Principles: conclusion first, action continuity, professional evidence on demand, honest uncertainty, stable layout, and outdoor accessibility.
- Design Logic: prioritize the smallest information set needed for the user's next decision; move supporting professional detail into drilldown without removing it.
- Design Rationale: the product exists to reduce same-night decision cost, not maximize visible data density.

## Key Constraints

- Mobile-first primary viewport is 390 × 844.
- Important touch targets are at least 44px and fixed controls respect safe areas.
- Maps, place imagery, sky, and decision content lead; avoid nested-card accumulation and decorative chrome.
- Professional data uses aligned rows, columns, matrices, timelines, and continuous windows.
- Map selection is communicated with more than color, and selected-place state remains synchronized.
- Mode changes preserve navigation, screen ownership, selection, and progress.
- Motion is restrained and supports reduced motion; flashing, ambient particles, broad glow, and large glass surfaces are forbidden.
- Press feedback begins immediately, valid activation commits once, and cancellation cannot fire the action. Gesture-linked sheets, maps, time and sky controls track continuously, remain interruptible, and settle only to valid bounded states.
- Gesture ownership explicitly resolves nested scroll, map pan/pinch, Bottom Sheet drag, iOS navigation, Android system/predictive back, and assistive interactions; essential actions always have a non-gesture accessible path.
- Haptics are optional semantic reinforcement and never the sole feedback channel. Reduced motion removes large-axis/depth/elastic movement rather than merely accelerating it; red-light state transitions and controllable native overlays must not flash blue or bright white, while unavoidable unthemed OS/vendor handoffs require advance warning and a safe cancel/return or non-field alternative.
- Weather and astronomy copy states uncertainty and alternatives; it never guarantees visibility.

## Code Entry Points

- Visual authority: DESIGN.md.
- Product context: project_context/global.md and this file.
- Imported design references: docs/design-system/.
- React Native interaction companion: .codex/skills/uiux_design/SKILL.md; it must obey DESIGN.md, Source Plan, and this Context.
- Provider/data research input: docs/technical-data-source-decisions.md; recommendations are not approved production facts by themselves.
- Production source entry points are not established yet.

## Related Role Context

- Repeatable checks live in project_context/areas/main/verification.md.

## Open Risks

- Provider contracts, exact dependency versions, algorithm/interaction tuning, offline/degraded defaults, location privacy, route handoff, data calibration, and production infrastructure remain open and require evidence plus Context updates before implementation.
