# Project / Delivery Context

## Project Goal

- Build Starward as the repository for 《今晚去观星》, a mobile-first stargazing trip decision product.
- Help a user move from “is tonight worth going?” to a safe, practical plan: where to go, when to leave, the best observing window, what may be visible, how to arrive, and how to observe or photograph on site.

## Non-goals / Boundaries

- The product is not a generic weather dashboard, astronomy encyclopedia, map clone, or decorative night-sky experience.
- The repository contains a broad React Native/API implementation, but completion is not established by screens, fixed sample responses, in-process state, or generated evidence text. Each declared Outcome still requires its locked production-loop evidence.
- Reference screenshots and Open Design exports are evidence. They must not be copied as another product's logo, proprietary branding, or exact page layout.

## Background

- Product name: 《今晚去观星》.
- Repository/engineering name: Starward.
- Brand promise: 从黄昏走入星夜.
- The native App's selected design direction combines a blue visual system with disciplined skeuomorphism for professional observing and outdoor equipment. The independently selected WeChat Mini Program direction is `target.system.wechat-miniapp-soft-instruments-2026-08-05`; it uses its own soft-instrument tokens and does not inherit App values or targets.

## Design Rationale

- Users need a decision and next action before professional data, so the experience uses three layers: conclusion, executable plan, then evidence.
- Space and time use a shared visual grammar: routes, celestial tracks, horizon arcs, circular nodes, and continuous observing windows.
- Planning, night-observing, and red-light field modes preserve information architecture so a mode change does not force the user to relearn the workflow.
- In the native App profile, planning uses cool blue-white surfaces, night uses near-black navy depth with limited blue, and red-light observation is restricted to the six registered black/warm-red values. The Mini Program has its own role-isomorphic day/night/observation values in `DESIGN.md`; neither profile supplies values to the other. Physical/material cues remain concentrated in selected physical subjects rather than every data container.
- Visual identity and exact tokens are owned by DESIGN.md. Product responsibility, information architecture, interactions, and state behavior are owned by project_context/**.

## Architecture Context

- See project_context/architecture.md for the source-of-truth split and current repository boundary.

## Context Graph

- The graph manifest is project_context/context.toml.
- The default product area is main; its small default verification index routes specialized development, acceptance/runtime, and Android/native facts to on-demand verification role Context.
- Future WeChat miniapp environment/path reservations, isolation, evidence-promotion rules, and the stable pointer to its selected visual target are root-owned and on-demand in `project_context/development-workflow.md`; the selected design authority does not register a workspace, Product Surface, or runtime capability.

## Product / Delivery Brief

- Primary users are people deciding on a same-night stargazing outing, including casual users who need a clear recommendation and experienced users who need professional conditions.
- Core flow: tonight conclusion → choose main/alternate place → choose departure and observing window → review route/facilities/risk → inspect professional evidence as needed → prepare equipment/checklist → use night or red-light field controls on site.
- Durable acceptance signals are a clear first-screen recommendation, a continuous place/time/route state, professional data available through progressive disclosure, and mode changes that preserve task position.

## Current Release Profile

- Current operating entity: individual.
- Current distribution: owner-only, non-commercial personal trial/internal install; no public operation or production app-store claim.
- External-service ceiling: CNY 200 per month / CNY 2,400 per year. Prefer zero-cost sources only when their personal non-commercial terms, provenance, target-region behavior, and safe degradation are all acceptable.
- Budget fit never authorizes a purchase, plan upgrade, second paid source, production traffic, or public redistribution.
- Preserve every capability required by the current accepted Source in the one current implementation. Proposal labels such as MVP/V1/V2/V3 are provenance and precedence history only: they do not create parallel product paths, and superseded behavior is removed from its existing owner. Capabilities without commercial, legal, store, expert, representative-device, or field evidence stay experimental, unknown, pending, disabled, or truthfully degraded.
- Current native runtime acceptance requires Android. iOS implementation remains in full delivery scope, including the generated native project, shared behavior, platform adapters, interaction/accessibility differences, and build configuration, but provisioning macOS/Xcode/iOS Simulator and executing iOS build/runtime checks are deferred for this profile. iOS must remain explicitly runtime-unverified/deferred and cannot inherit a usable or passed claim from Android, Web, static structure, or historical evidence.
- Contracts, legal/store approval, expert sign-off, representative outdoor/device validation, and site-operation verification are future production-release gates. User spot/media/field-report uploads remain product behavior and are not release-evidence uploads.

## UX / Screen Brief

- Primary mobile viewport: 390 × 844; important touch targets are at least 44px and fixed actions respect safe areas.
- Existing native App representative surfaces remain independently owned. The current WeChat Mini Program surface and navigation model is owned by `project_context/areas/main/screen-contracts/wechat-miniapp.md`: Map and My are its only primary destinations, with formal Spot Detail and Spot Night reached through the same current route tree.
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
- The product/design contract, Open Design references, React Native application, API/workers/admin surfaces, and acceptance harness form the repository baseline.
- `DESIGN.md` owns two independent active visual profiles: native App target `target.system.starward-blue-skeuomorphic-2026-07-29` and WeChat Mini Program target `target.system.wechat-miniapp-soft-instruments-2026-08-05`. The Mini Program target defines visual-system values; its current Product Surface and runtime responsibility are separately owned by the registered Mini Program Screen Contract and production code. The four older page/control targets under `docs/design-targets/**` remain immutable rollback and semantic-traceability archives, but their visual styling, geometry, and fidelity constraints are inactive pending a separate regeneration. Their stable Surface/Control meaning remains owned by the Product Surface and Screen Contracts; no static artifact proves production or native behavior.
- A corrective audit found that several existing carriers use fixed responses, process-local state, metadata-only side effects, or declaration-only native boundaries. Those carriers are implementation scaffolding, not completed Outcomes, until variable-input, side-effect, restart-readback, failure-path, and counterfactual checks pass.
- `docs/technical-data-source-decisions.md` records official-source research and the current individual personal-trial choices. No purchase, production traffic, public redistribution, production account, commercial contract, external approval, representative-device proof, or field validation is declared complete.
- Current release authority is owner-only, non-commercial personal trial with a CNY 200/month external-service ceiling and qualifying free sources preferred. Future production gates do not block machine-local implementation, but they also cannot be represented as completed evidence.

## Next Safe Action

- Before implementing a product surface, read DESIGN.md and project_context/areas/main.md, identify the owning screen state, and update Context first if the change alters durable responsibility, information architecture, interaction, data, or verification. Treat each Outcome as unfinished until its production entry, real state transition, applicable side effect, restart readback, truthful failure/degradation, and counterfactual evidence all pass.

## Context Index

- [future WeChat miniapp development/test/acceptance environment](development-workflow.md)
- [main](areas/main.md)
- [main implementation index](areas/main/implementation-index.md)
- [Starward Product Surface Contract](areas/main/product-surface-contract.md)
- [Starward Screen Contract index](areas/main/screen-contracts.md)
- [Starward mobile Screen Contracts](areas/main/screen-contracts/mobile.md)
- [Starward owner-operations Screen Contracts](areas/main/screen-contracts/operations.md)
- [main verification](areas/main/verification.md)
- [development-loop verification](areas/main/verification/development-loop.md)
- [acceptance/runtime verification](areas/main/verification/acceptance-runtime.md)
- [Android/native verification](areas/main/verification/android-native.md)
