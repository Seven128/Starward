# Project / Delivery Context

## Project Goal

- Build Starward as the repository for 《今晚去观星》, a mobile-first stargazing trip decision product.
- Help a user move from “is tonight worth going?” to a safe, practical plan: where to go, when to leave, the best observing window, what may be visible, how to arrive, and how to observe or photograph on site.

## Non-goals / Boundaries

- The product is not a generic weather dashboard, astronomy encyclopedia, map clone, or decorative night-sky experience.
- The current baseline establishes the durable product and design contract plus imported design-system references; it does not claim a complete application, live forecast integration, routing backend, or field validation.
- Reference screenshots and Open Design exports are evidence. They must not be copied as another product's logo, proprietary branding, or exact page layout.

## Background

- Product name: 《今晚去观星》.
- Repository/engineering name: Starward.
- Brand promise: 从黄昏走入星夜.
- The design direction synthesizes consumer trip-planning patterns with professional astronomy information, while keeping one independent and reusable product language.

## Design Rationale

- Users need a decision and next action before professional data, so the experience uses three layers: conclusion, executable plan, then evidence.
- Space and time use a shared visual grammar: routes, celestial tracks, horizon arcs, circular nodes, and continuous observing windows.
- Planning, night-observing, and red-light field modes preserve information architecture so a mode change does not force the user to relearn the workflow.
- Visual identity and exact tokens are owned by DESIGN.md. Product responsibility, information architecture, interactions, and state behavior are owned by project_context/**.

## Architecture Context

- See project_context/architecture.md for the source-of-truth split and current repository boundary.

## Context Graph

- The graph manifest is project_context/context.toml.
- The default product area is main; repeatable checks are isolated in its verification role Context.

## Product / Delivery Brief

- Primary users are people deciding on a same-night stargazing outing, including casual users who need a clear recommendation and experienced users who need professional conditions.
- Core flow: tonight conclusion → choose main/alternate place → choose departure and observing window → review route/facilities/risk → inspect professional evidence as needed → prepare equipment/checklist → use night or red-light field controls on site.
- Durable acceptance signals are a clear first-screen recommendation, a continuous place/time/route state, professional data available through progressive disclosure, and mode changes that preserve task position.

## UX / Screen Brief

- Primary mobile viewport: 390 × 844; important touch targets are at least 44px and fixed actions respect safe areas.
- Representative surfaces: tonight home, stargazing map, place detail, route plan, weather/astronomy analysis, light-pollution map, equipment/checklist, and field controls.
- The first layer answers whether to go and when; the second supplies place, route, arrival, facilities, and risk; the third contains cloud layers, transparency, seeing, light pollution, lunar/solar events, model comparison, and photography details.
- Map marker, place preview, route, and detail screens share one selected-place state. Loading, empty, no-results, stale/degraded, error, and success states must remain distinguishable.
- Planning, dark, and red-light modes change luminance and emphasis, not navigation ownership or task order.
- DESIGN.md defines the visual identity, tokens, component appearance, and motion constraints.
- Interactive controls provide immediate press feedback, commit only at a valid completion point, and preserve cancellation/recovery. Direct manipulation remains continuous and interruptible; platform-native back, map, scroll, and accessibility gestures retain their expected ownership.
- React Native implementation guidance lives in `.codex/skills/uiux_design/SKILL.md`. It is downstream of DESIGN.md, this Context, and the Source Plan; its reference from DESIGN.md is discoverability rather than circular authority.

## Verification Entry Points

- See project_context/areas/main/verification.md.

## Current State

- Tiny Context is installed and initialized.
- The product/design contract and Open Design reference exports form the repository baseline.
- No production application runtime or live data integration is declared yet.
- `docs/technical-data-source-decisions.md` records current official-source research and recommendations, but no provider contract, purchase, production account, POC, calibration, or external approval is declared complete.

## Next Safe Action

- Before implementing a product surface, read DESIGN.md and project_context/areas/main.md, identify the owning screen state, and update Context first if the change alters durable responsibility, information architecture, interaction, data, or verification.

## Context Index

- [main](areas/main.md)
- [main verification](areas/main/verification.md)
