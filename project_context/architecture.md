# Architecture Context

## System Boundary

- Account-erasure rewrites of normally append-only contribution revisions, moderation/merge events, operation receipts and audit snapshots use transaction-local erasure context and a database guard that preserves structural columns. Normal updates and all deletes remain forbidden by the append-only guard; public spot revision/publication history never receives this exception. The erasure context is an internal transaction invariant, not a client authorization mechanism. Loading table definitions without the existing triggers is not evidence that this path works in PostgreSQL.
- This repository owns the Starward product contract, visual design system, React Native application, modular API/workers/admin implementation, data-processing code, and verification harness for 《今晚去观星》.
- Weather, astronomy ephemerides, light-pollution data, maps, routing, location, push channels, and object storage remain replaceable boundaries. The current personal-trial profile may use qualifying free/non-commercial sources or isolated adapters; it must not imply purchased rights, production traffic, or external validation.
- Existing files under docs/design-system/ are retained static Open Design rollback/reference exports. They are not current visual inputs, runtime architecture, or a competing authority.

## Component Map

- DESIGN.md: sole authored visual identity and exact-value source, with independently scoped native App and WeChat Mini Program profiles.
- packages/ui-system/src/tokens.ts: generated runtime projection of the native App profile only; compatibility aliases may serve existing App consumers but cannot originate a new value or supply Mini Program tokens.
- project_context/global.md: common recovery entry; project_context/product-profile.md owns detailed goals, release boundaries, user journey and experience principles.
- project_context/development-workflow.md: root-owned on-demand owner for WeChat Mini Program development/test/acceptance topology, paths, isolation, evidence promotion, DevTools lifecycle and stable pointer to the independently selected visual target.
- project_context/deployment.md: root-owned on-demand owner for remote staging/production topology, release promotion, domain/filing bindings, secret classes, migration, backup/restore, rollback and production observability. It consumes qualified candidates from verification but never treats a workflow or cloud declaration as a deployed result.
- project_context/areas/main.md: cross-workspace Starward product/domain ownership, screen/state/interaction contract, and core domain behavior.
- project_context/areas/main/verification.md: on-demand index for near-universal validation and evidence boundaries; its registered on-demand verification nodes own development-loop, acceptance/runtime, and Android/native detail.
- project_context/areas/main/implementation-index.md: on-demand code-navigation index for current Mobile, API, owner-operations, and verification entry points; it does not own intended product or verification semantics.
- project_context/areas/main/screen-contracts.md: canonical Screen Contract index and shared target/verification boundary; registered mobile and owner-operations detail nodes retain the existing 14 Surface/95 Control semantics without becoming new authorities.
- project_context/areas/main/screen-contracts/wechat-miniapp.md: independent Mini Program route/subpackage, five-Surface, material-Control, state, interaction and accessibility contract. It owns the current Map/Search/spot-information-panel and full-sky topology and cannot borrow native App/Admin surface or target semantics.
- docs/design-system/: unchanged legacy CSS/JSON tokens, brand overview, source guide, component kits, and supporting assets retained for rollback/reference only.
- docs/design-targets/: immutable repo-local copies of four former page/control visual targets. Their stable keys and behavior semantics may support traceability, but their visual styling, geometry, and fidelity constraints are inactive until separately regenerated and explicitly re-adopted.
- docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/: immutable reviewed source package, manifest and provenance index for the active Mini Program visual-system target. Root `DESIGN.md` owns its adopted interpretation and exact current values; the frozen package remains Source evidence rather than a second authored authority or production implementation.
- docs/design-resources/miniapp-field-signal-map-finder-ui/ and docs/design-resources/miniapp-field-signal-review-directed-components/: immutable historical audit provenance. Their previous Finder-Sheet, filter, standalone detail/night and linear time-control expressions are not current generation dependencies, compatibility layouts or fallbacks.
- docs/design-resources/miniapp-field-signal-unified-flow-forms/: immutable current component/layout source within the active Mini Program target. It owns compact Search rhythm, one-document clipped panel extents, staged media/chrome motion, compact handle band and hit region, flush/short rails, one mutually exclusive Map bottom-presentation state, pale active treatment, raised draggable arrowless curved ruler, the unified three-state celestial display control, restrained colored-icon My hierarchy, compact cell-based Contribution intake and the preferred library/component/adaptation mapping while depending on the exact-value base and current Screen Contract semantics. It is neither a second design system nor product/runtime truth; root `DESIGN.md` remains the sole composed adoption record. The unified-flow-modes and earlier component/layout directories are immutable audit provenance only.
- Mini Program generic UI substrate: current confirmed selection reuses bounded Taro primitives and existing Starward components under `apps/wechat-miniapp/src/components/**`. `@taroify/core@1.0.6` was rejected because its mandatory icon dependency conflicts with the exclusive SemanticIcon owner. Preserve one DESIGN token projection, existing state/coordinator owners, Taro enhanced ScrollView for the curved ruler, and `semantic-asset.tsx` for icons. A future compatible library is a new evidence-based choice requiring license/peer, bundle and WEAPP checks; it cannot redefine product state, exact tokens, upload transport or iconography.
- docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/: inactive prior Mini Program system snapshot, retired Mini Program page/interaction constraint and separately scoped current Operations constraint, with their human/structured handoffs, Fact manifests and feasibility inputs. The retired Mini Program material is immutable historical audit evidence only and cannot be a current generation, composition, styling, component, motion or interaction-presentation input; current Mini Program meaning comes from its Product Surface, Screen Contract and active Field Signal profile. No resource becomes business/data/runtime authority or production proof.
- .codex/skills/uiux_design/: project-owned React Native implementation guidance for interaction, motion, haptics, accessibility, and platform adaptation; it is subordinate to DESIGN.md, Source Plan, and owning Context.
- docs/technical-data-source-decisions.md: dated provider/data/stack research and recommendation evidence; recommendations remain non-authoritative until the corresponding decision and external gates are confirmed.
- Production code lives under apps/, packages/, workers/, data-pipelines/, infrastructure/, and config/. It consumes or derives from canonical design rules rather than editing exported preview files as product UI.

### On-Demand Component Detail

- [Cloud, Mini Program, BFF, data, decision, publication, contribution and identity components](architecture/runtime-and-domain.md)
- [Mobile feedback, Android assurance, runtime carriers and account-erasure lifecycle](architecture/assurance-and-lifecycle.md)

These two registered nodes continue this Component Map. Read the node whose owner or boundary is affected; read both when a change crosses runtime/domain and assurance/lifecycle.

## Data / Control Flow

- The existing native App durable user flow remains conclusion → place selection → departure/observing window → route and risk → professional evidence → preparation → field use.
- Selected place, time window, route, arrival estimate, and risk are one coordinated state. Changes propagate to every surface that presents those facts.
- Visual mode is orthogonal to task state: planning, night, and red-light modes retain the same current place and workflow position.
- Mini Program day/night/observation modes are likewise orthogonal to route/domain state. Observation mode uses the closed Mini Program warm-red system and exits to the exact prior presentation context; it does not inherit native App token values.
- Selecting a primary tab changes the active route and rendered screen. Each tab owns its primary scroll or immersive canvas plus its nested navigation state; switching tabs never scrolls a shared page, jumps to a section anchor, or conditionally swaps pseudo-pages inside one root `ScrollView`. Tab-local route/scroll state is preserved independently while the versioned decision context remains shared across tabs.

Mini Program route/account and persisted-plan control flow continues in [runtime and domain architecture detail](architecture/runtime-and-domain.md#mini-program-product-and-plan-flow).

## Design Rationale

- Authority is intentionally split by concern: Context defines what the product and surfaces must do; DESIGN.md defines how the visual system should look and feel; exported assets demonstrate or implement that system.
- This prevents generated CSS, JSON, or static kits from silently redefining the product contract.

## Constraints And Tradeoffs

- Mobile-first behavior and outdoor/low-light use make safe-area handling, reduced motion, contrast, and low-luminance field behavior architectural UI constraints. The native App profile requires `44px` touch targets; the selected Mini Program profile independently requires `88rpx` targets.
- Direct-manipulation state is split from committed domain state: gesture presentation may move continuously and be interrupted, while place/time/route/itinerary changes commit only to valid coordinated states and recover cleanly on cancellation or provider failure.
- Deep links activate the owning tab and nested route, while native Back first closes route-owned overlays and then pops only that tab's stack. Tab selection itself does not synthesize cross-tab Back history.
- Forecast and astronomy data are uncertain; provider data must not be presented as guaranteed truth.
- Shared `platform-boundary` code currently models only one native-App primary product and a limited auxiliary Mini Program. This is acknowledged technical debt: implementation must introduce a per-product carrier boundary or an independent Mini Program boundary without overwriting native-App semantics or duplicating provider/license truth.
- Professional density must use aligned matrices and progressive disclosure without overwhelming the primary decision.

Mini Program blocker/score invariants continue in [runtime and domain architecture detail](architecture/runtime-and-domain.md#mini-program-decision-constraints).

## Verification Implications

- Context integrity is checked through the Tiny Context commands in project_context/areas/main/verification.md; specialized checks are routed from that default index to its on-demand verification nodes.
- DESIGN.md structure is linted separately from exported asset integrity.
- Production UI verification must eventually cover representative mobile viewport, visual mode, key state, and long-content combinations; static kits alone cannot prove product behavior.

Selected-design, Android/runtime-carrier and current-candidate proof detail continues in [assurance and lifecycle architecture detail](architecture/assurance-and-lifecycle.md#verification-detail).

## Open Risks

- Official-source research and the current personal-trial profile establish qualifying free-first choices and a CNY 200/month ceiling, but purchases, commercial contracts, public redistribution, production accounts/traffic, representative devices, outdoor validation, legal/store approval, and production provider promotion remain future gates.
- A corrective audit found fixed responses, process-local repositories, metadata-only side effects, and declaration-only native boundaries in existing scaffolding. They must be replaced by durable production loops before any Outcome can be accepted.
- Windows-hosted delivery may not by itself establish the physical WeChat observations required by the current acceptance matrix, nor real provider, coordinate-authorization or real WeChat-identity facts. Those rows remain explicit pending external validations; they cannot be omitted or replaced by project pass/verdict rows, and the Goal cannot close while any required confirmation is pending.

Existing extraction/ownership concerns remain in [maintenance boundaries](architecture/maintenance-boundaries.md); they do not impose a Tiny Context modularity gate.
