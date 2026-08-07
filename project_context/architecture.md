# Architecture Context

## System Boundary

- This repository owns the Starward product contract, visual design system, React Native application, modular API/workers/admin implementation, data-processing code, and verification harness for 《今晚去观星》.
- Weather, astronomy ephemerides, light-pollution data, maps, routing, location, push channels, and object storage remain replaceable boundaries. The current personal-trial profile may use qualifying free/non-commercial sources or isolated adapters; it must not imply purchased rights, production traffic, or external validation.
- Existing files under docs/design-system/ are retained static Open Design rollback/reference exports. They are not current visual inputs, runtime architecture, or a competing authority.

## Component Map

- DESIGN.md: sole authored visual identity and exact-value source, with independently scoped native App and WeChat Mini Program profiles.
- packages/ui-system/src/tokens.ts: generated runtime projection of the native App profile only; compatibility aliases may serve existing App consumers but cannot originate a new value or supply Mini Program tokens.
- project_context/global.md: cross-product goals, user journey, and experience principles.
- project_context/development-workflow.md: root-owned on-demand owner for WeChat Mini Program development/test/acceptance topology, paths, isolation, evidence promotion, DevTools lifecycle and stable pointer to the independently selected visual target.
- project_context/areas/main.md: cross-workspace Starward product/domain ownership, screen/state/interaction contract, and core domain behavior.
- project_context/areas/main/verification.md: small default index for near-universal validation and evidence boundaries; its registered on-demand verification nodes own development-loop, acceptance/runtime, and Android/native detail.
- project_context/areas/main/implementation-index.md: on-demand code-navigation index for current Mobile, API, owner-operations, and verification entry points; it does not own intended product or verification semantics.
- project_context/areas/main/screen-contracts.md: canonical Screen Contract index and shared target/verification boundary; registered mobile and owner-operations detail nodes retain the existing 14 Surface/95 Control semantics without becoming new authorities.
- project_context/areas/main/screen-contracts/wechat-miniapp.md: independent Mini Program route/subpackage, five-Surface, material-Control, state, interaction and accessibility contract. It cannot borrow native App/Admin surface or target semantics.
- docs/design-system/: unchanged legacy CSS/JSON tokens, brand overview, source guide, component kits, and supporting assets retained for rollback/reference only.
- docs/design-targets/: immutable repo-local copies of four former page/control visual targets. Their stable keys and behavior semantics may support traceability, but their visual styling, geometry, and fidelity constraints are inactive until separately regenerated and explicitly re-adopted.
- docs/design-resources/miniapp-design-system-2026-08-05/: immutable selected Mini Program candidate/source ledger and reference files. `DESIGN.md` owns its adopted interpretation and exact project values; this resource cannot become a second token authority or claim a runtime implementation.
- .codex/skills/uiux_design/: project-owned React Native implementation guidance for interaction, motion, haptics, accessibility, and platform adaptation; it is subordinate to DESIGN.md, Source Plan, and owning Context.
- docs/technical-data-source-decisions.md: dated provider/data/stack research and recommendation evidence; recommendations remain non-authoritative until the corresponding decision and external gates are confirmed.
- Production code lives under apps/, packages/, workers/, data-pipelines/, infrastructure/, and config/. It consumes or derives from canonical design rules rather than editing exported preview files as product UI.
- Mini Program production code is owned by `apps/wechat-miniapp/**`; its acceptance and platform lifecycle owners are `tests/acceptance/miniapp/**` and `tools/miniapp/**`. The package consumes a generated projection of only the Mini Program DESIGN profile and calls shared contracts/BFF through explicit client ports. It never directly calls external weather/map/media/content providers or imports the native App token module.
- `workers/miniapp-api/**` owns the Mini Program modular-monolith BFF and server-side Port/Adapter composition; `packages/miniapp-contracts/**` owns its shared typed API/domain boundary. It remains independent from the native App API composition, and any later consolidation must preserve these domain identities, capability gates and failure semantics instead of making the client call providers directly. Explicit `SAMPLE_DATA` fixture adapters are permitted for deterministic Demo facts and must retain source/license/freshness/sample labels.
- Mobile navigation truth lives in one Expo Router route tree: a persistent five-tab navigator maps Tonight, Map, Trips, Sky, and Me to `/tonight`, `/map`, `/trips`, `/sky`, and `/me`, with a route-owned nested stack under each tab. A persisted destination preference may assist restoration, but it cannot become a second router or screen-identity source.
- Mobile development feedback uses that same React Native component/route tree through Expo Web or an installed development client. `tests/acceptance/start-mobile-web.mjs` and its session helper own the bounded Web/API process and restart-sensitive session identity. Browser diagnostics remain a support renderer, not a native runtime or visual authority; the archived page/control visuals cannot be used as current comparison baselines.
- `tools/long-task/verify-native-target.mjs` remains the single project Android Check executor and result aggregator. Its native verification-session module owns deterministic population planning, independent-device shard assignment, exact-input checkpoint identity and atomic fragment recovery; neither cached fragments nor diagnostic filters create another verifier, Authority, Check or completion state.
- The Android design-evidence module is a session-gated observation transport inside the same production React Native tree. One session-qualified launch establishes the current evidence session; bounded context switches may then retarget Control/Scenario attribution only when they present that exact session identity. Exact context/state acknowledgements expose only transport readiness: the verifier must still observe the production owner carrier, interaction and result in the same committed UI tree, and a missing carrier fails immediately after its acknowledged render context instead of triggering blind whole-page polling. These acknowledgements cannot activate in an ordinary user run, reset product authority, create evidence by declaration, or replace the unit's production-root journey.
- Each Outcome must expose a production runtime carrier wired into the application. Acceptance invokes that carrier with variable inputs, verifies committed database/file/native/external receipts, recreates the runtime against the same isolated data directory, reads state back, checks idempotent replay, and verifies invalid/failing operations cannot report success.

## Data / Control Flow

- The existing native App durable user flow remains conclusion → place selection → departure/observing window → route and risk → professional evidence → preparation → field use.
- The independent Mini Program durable flow is Map discovery → formal Spot Detail → hard-blocker-aware Tonight decision → Guides/Site/Spot Night → external navigation/favorite/plan → observation mode, with a separate My branch for profile/favorites/plans/settings and gated profile-link/import workflows. Only a formal `spot_id` can establish Spot Night context.
- Selected place, time window, route, arrival estimate, and risk are one coordinated state. Changes propagate to every surface that presents those facts.
- Visual mode is orthogonal to task state: planning, night, and red-light modes retain the same current place and workflow position.
- Mini Program day/night/observation modes are likewise orthogonal to route/domain state. Observation mode uses the closed Mini Program warm-red system and exits to the exact prior presentation context; it does not inherit native App token values.
- Selecting a primary tab changes the active route and rendered screen. Each tab owns its primary scroll or immersive canvas plus its nested navigation state; switching tabs never scrolls a shared page, jumps to a section anchor, or conditionally swaps pseudo-pages inside one root `ScrollView`. Tab-local route/scroll state is preserved independently while the versioned decision context remains shared across tabs.

## Design Rationale

- Authority is intentionally split by concern: Context defines what the product and surfaces must do; DESIGN.md defines how the visual system should look and feel; exported assets demonstrate or implement that system.
- This prevents generated CSS, JSON, or static kits from silently redefining the product contract.

## Constraints And Tradeoffs

- Mobile-first behavior and outdoor/low-light use make safe-area handling, reduced motion, contrast, and low-luminance field behavior architectural UI constraints. The native App profile requires `44px` touch targets; the selected Mini Program profile independently requires `88rpx` targets.
- Direct-manipulation state is split from committed domain state: gesture presentation may move continuously and be interrupted, while place/time/route/itinerary changes commit only to valid coordinated states and recover cleanly on cancellation or provider failure.
- Deep links activate the owning tab and nested route, while native Back first closes route-owned overlays and then pops only that tab's stack. Tab selection itself does not synthesize cross-tab Back history.
- Forecast and astronomy data are uncertain; provider data must not be presented as guaranteed truth.
- A Mini Program hard safety blocker is evaluated before score aggregation and forces the effective conclusion to “不建议”. The selected design resource's retained “推荐” heading under a blocker is a resolved Source conflict and is not production semantics.
- Shared `platform-boundary` code currently models only one native-App primary product and a limited auxiliary Mini Program. This is acknowledged technical debt: implementation must introduce a per-product carrier boundary or an independent Mini Program boundary without overwriting native-App semantics or duplicating provider/license truth.
- Professional density must use aligned matrices and progressive disclosure without overwhelming the primary decision.

## Verification Implications

- Context integrity is checked through the Tiny Context commands in project_context/areas/main/verification.md; specialized checks are routed from that default index to its on-demand verification nodes.
- DESIGN.md structure is linted separately from exported asset integrity.
- Active authority integrity is checked by `npm run design:system:verify`: it preserves the native App DESIGN→runtime projection and six-value observation palette while separately validating the selected Mini Program source digests, exact profile tables, role-isomorphic modes, closed warm-red observation palette, contrast contract, and App-profile non-inheritance. `npm run design:targets:verify` separately protects the hash and semantic inventory of the unchanged legacy archives; passing it does not reactivate their visual styling.
- Production UI verification must eventually cover representative mobile viewport, visual mode, key state, and long-content combinations; static kits alone cannot prove product behavior.
- Web/Fast Refresh and filtered native diagnostics shorten the repair loop, while only complete current-snapshot target-runtime aggregation can satisfy the Android Assertions. Parallel native execution is valid only across disjoint selected serials with one attributed worker lifecycle per device. Within a shard, one Condition/Mode unit may share its root-proved cold-start prelude while every Control and Scenario retains a separately reset, attributed observation; Final Gate does not consume repair-session checkpoints.
- A service class, endpoint, adapter declaration, generated report, or screen is not completion evidence by existence. Machine acceptance must execute the production path and its counterfactual must fail when the carrier, write, adapter invocation, or restart readback is removed.
- Mini Program acceptance additionally requires the same candidate's deterministic checks, Taro builds, current WeChat DevTools observations, declared multi-size/mode/state/accessibility checks, and platform/device observations required by the V2.0 Source. Formal design-resource preflight proves only input integrity.

## Open Risks

- Official-source research and the current personal-trial profile establish qualifying free-first choices and a CNY 200/month ceiling, but purchases, commercial contracts, public redistribution, production accounts/traffic, representative devices, outdoor validation, legal/store approval, and production provider promotion remain future gates.
- A corrective audit found fixed responses, process-local repositories, metadata-only side effects, and declaration-only native boundaries in existing scaffolding. They must be replaced by durable production loops before any Outcome can be accepted.
- Windows-hosted delivery may not by itself establish iOS/Android physical WeChat observations required by the V2.0 test matrix. Those rows must remain explicit Contract obligations or External Confirmations; they cannot be omitted to obtain `machine_accepted`, and the Goal cannot close while any required confirmation is pending.
