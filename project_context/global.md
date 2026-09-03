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
- The native App's selected design direction combines a blue visual system with disciplined skeuomorphism for professional observing and outdoor equipment. The independently selected WeChat Mini Program direction is `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`; it combines a light sky/meteor/trail field palette with compact, clearly tiered mobile information and does not inherit App values or targets. The same current system governs app-owned floating Map Search, compact Search/filter/results, the one-document three-extent spot panel, one mutually exclusive Map bottom presentation, raised draggable time ruler, unified three-state display control, full-sky chrome, colored-icon My hierarchy and compact Contribution intake. Mature compatible controls are reused through one Starward-owned adapter rather than visually or semantically reimplemented; provider/basemap/tile/native-map appearance remains outside its visual authority.

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
- Schema v4 keeps the cross-workspace `main` Area under `project_context/areas/**` because its durable product and architecture facts coordinate several implementation roots. No `project_context/workspaces/**` mirror is currently registered; add one only for a future workspace-local owner whose facts can remain local without duplicating cross-workspace truth.
- Large cross-workspace owners retain one stable root index and route complete semantic slices to registered on-demand child nodes. The index preserves owner and dependency closure but never summarizes away, duplicates, or implicitly defaults the child-owned predicates.
- Future WeChat miniapp environment/path reservations, isolation, evidence-promotion rules, and the stable pointer to its selected visual target are root-owned and on-demand in `project_context/development-workflow.md`; the selected design authority does not register a workspace, Product Surface, or runtime capability.

## Product / Delivery Brief

- Primary users are people deciding on a same-night stargazing outing, including casual users who need a clear recommendation and experienced users who need professional conditions.
- Core flow: tonight conclusion → choose main/alternate place → choose departure and observing window → review route/facilities/risk → inspect professional evidence as needed → prepare equipment/checklist → use night or red-light field controls on site.
- Durable acceptance signals are a clear first-screen recommendation, a continuous place/time/route state, professional data available through progressive disclosure, and mode changes that preserve task position.

## Current Release Profile

- Current operating entity: individual.
- Target public-release operator: an individual industrial and commercial household using the selected trade-name candidate `茂文菲蛋`. The exact registered legal name, address, business scope, unified social credit code and approval are pending external registration; until they are confirmed and the Mini Program subject is changed or migrated through the supported platform route, the current individual profile remains controlling.
- Current distribution: owner-only, non-commercial personal trial/internal install; no public operation or production app-store claim.
- External-service ceiling: CNY 200 per month / CNY 2,400 per year. Prefer zero-cost sources only when their personal non-commercial terms, provenance, target-region behavior, and safe degradation are all acceptable.
- Budget fit never authorizes a purchase, plan upgrade, second paid source, production traffic, or public redistribution.
- Preserve every capability required by the current accepted Source in the one current implementation. Proposal labels such as MVP/V1/V2/V3 are provenance and precedence history only: they do not create parallel product paths, and superseded behavior is removed from its existing owner. Capabilities without commercial, legal, store, expert, representative-device, or field evidence stay experimental, unknown, pending, disabled, or truthfully degraded.
- Current-truth retention rule: normal iteration keeps exactly one current active representation of each responsibility across code, schemas, tests, documentation, design resources, previews and tools. After consumers migrate in the same coherent change, superseded ordinary artifacts and compatibility paths are removed instead of being retained as `old`, `legacy`, `v2`, rollback copies or parallel implementations; Git history is the recovery mechanism. An unselected DRA feedback cycle updates one clearly named current resource in place and removes its displaced brief/screenshots before handoff. The only retention exception is an immutable Source, selected design baseline, formal handoff, audit evidence or external-boundary adapter that a controlling Harness/protocol explicitly requires. Every such exception remains named, isolated and inactive as current product/design input, cannot become a second source of truth, and any temporary adapter records a concrete removal condition.
- Current native runtime acceptance requires Android. iOS implementation remains in full delivery scope, including the generated native project, shared behavior, platform adapters, interaction/accessibility differences, and build configuration, but provisioning macOS/Xcode/iOS Simulator and executing iOS build/runtime checks are deferred for this profile. iOS must remain explicitly runtime-unverified/deferred and cannot inherit a usable or passed claim from Android, Web, static structure, or historical evidence.
- Contracts, legal/store approval, expert sign-off, representative outdoor/device validation, and site-operation verification are future production-release gates. User spot/media/field-report uploads remain product behavior and are not release-evidence uploads.

## UX / Screen Brief

- Primary mobile viewport: 390 × 844; important touch targets are at least 44px and fixed actions respect safe areas.
- Existing native App representative surfaces remain independently owned. The current WeChat Mini Program surface and navigation model is owned by `project_context/areas/main/screen-contracts/wechat-miniapp.md`: Map and My are its only primary destinations; Map owns a dedicated point-search child and the continuous basic-plus-astronomy spot information panel, while `sky/detail` is the only full-sky child route.
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
- `DESIGN.md` owns two independent active visual profiles: native App target `target.system.starward-blue-skeuomorphic-2026-07-29` and WeChat Mini Program target `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`. The Mini Program target defines visual-system values; its Product Surface and runtime responsibility are separately owned by the registered Mini Program Screen Contract and production code. Its immutable exact-value base lives under `docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/**`; its current component/layout source is `docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md`, SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`. That source owns compact Search rhythm, one-document panel clipping, staged media/chrome motion, one Map bottom-presentation enum, pale active surfaces, flush/short rails, raised draggable arrowless time ruler, one three-state display mode owner, restrained colored-icon My hierarchy, compact cell-based Contribution intake and the reuse-first `@taroify/core` component/adaptation boundary without forming a second system. Unified-flow-modes and prior component sources remain immutable audit provenance only and cannot seed current generation or survive as fallback behavior. The composed interpretation is owned only by root `DESIGN.md`; provider/basemap/tile/native-map appearance remains excluded.
  Owner instruction on 2026-09-02 retires `target-miniapp-sky-canvas-current-constraint` as a current implementation constraint. Its immutable Source/handoffs remain isolated historical evidence only; current Mini Program composition, interaction and state meaning comes directly from the registered Product Surface and Screen Contract, and current visual meaning comes only from the active Field Signal profile. Generation and implementation must not preserve a parallel old/new UI path or expose proposal, date, revision, `version`/`vN`, `旧版`/`新版` labels in current product or design-facing copy; internal protocol versions, stable keys and digests remain provenance only. `target-operations-sky-canvas-current-constraint` remains independently scoped to owner operations. Selection and preflight prove no production, native, runtime or pixel-exact conformance.
- A corrective audit found that several existing carriers use fixed responses, process-local state, metadata-only side effects, or declaration-only native boundaries. Those carriers are implementation scaffolding, not completed Outcomes, until variable-input, side-effect, restart-readback, failure-path, and counterfactual checks pass.
- `docs/technical-data-source-decisions.md` records official-source research and the current individual personal-trial choices. No purchase, production traffic, public redistribution, production account, commercial contract, external approval, representative-device proof, or field validation is declared complete.
- Current release authority is owner-only, non-commercial personal trial with a CNY 200/month external-service ceiling and qualifying free sources preferred. Future production gates do not block machine-local implementation, but they also cannot be represented as completed evidence.

## Next Safe Action

- Before implementing a product surface, read DESIGN.md and project_context/areas/main.md, identify the owning screen state, and update Context first if the change alters durable responsibility, information architecture, interaction, data, or verification. Treat each Outcome as unfinished until its production entry, real state transition, applicable side effect, restart readback, truthful failure/degradation, and counterfactual evidence all pass.

## Context Index

- [WeChat miniapp development/test/acceptance environment](development-workflow.md)
- [cloud deployment, release, domain and production environment](deployment.md)
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
