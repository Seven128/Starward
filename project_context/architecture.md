# Architecture Context

## System Boundary

Current development follows [the Mini Program-only scope](product-profile.md#current-development-scope). The component map includes retained App/API implementations, not active delivery obligations. Preserve those artifacts; modify shared code only for demonstrated current Mini Program consumers and their direct compatibility effects. Native Map/device work in the Mini Program does not select the React Native/Expo toolchain.

- Account-erasure rewrites of normally append-only contribution revisions, moderation/merge events, operation receipts and audit snapshots use transaction-local erasure context and a database guard that preserves structural columns. Normal updates and all deletes remain forbidden by the append-only guard; public spot revision/publication history never receives this exception. The erasure context is an internal transaction invariant, not a client authorization mechanism. Loading table definitions without the existing triggers is not evidence that this path works in PostgreSQL.
- This repository owns the Starward product contract, visual design system, React Native application, modular API/workers/admin implementation, data-processing code, and verification harness for 《今晚去观星》.
- Weather, astronomy ephemerides, light-pollution data, maps, routing, location, push channels, and object storage remain replaceable boundaries. The current personal-trial profile may use qualifying free/non-commercial sources or isolated adapters; it must not imply purchased rights, production traffic, or external validation.

<a id="wechat-native-stack-decision"></a>
## WeChat Mini Program native stack decision

2026-10-31用户确定微信小程序前端目标为**微信原生页面/组件＋TypeScript**，替代Taro/React页面运行时；过渡期混合只用于迁移，不是最终架构。理由是当前仅交付微信、运行性能和资源效率优先，同时保留可复用业务逻辑与长期维护能力。此决策不承诺固定性能提升或维护成本百分比，也不自动选择Skyline、另一星空引擎、UI库或状态库。

当前源码仍为Taro/React实现，迁移尚未实施。其他Context中的Taro专属事实目前仍用于解释现行代码；随相应模块实际切换更新，不全仓替换术语。技术方案、迁移影响表及最小回归映射由[独立迁移任务](../.codex/work-items/wechat-native-migration-2026-10-31/INDEX.md)承载。公共优化按其业务、状态和资源owner复用；框架/运行时边界变化或明确风险使旧证据失效时才补必要验证，不按历史场景逐个重测。

后端继续采用Node.js/NestJS/Fastify、Python数据管线及现有PostgreSQL/PostGIS、Redis/BullMQ职责；整体换Go/Rust、拆仓库或改部署拓扑不属于前端技术栈迁移。执行隔离、算法/缓存/资源配置与静态分发优化在既有后续计划按职责处理，不因选原生前端自动实施。现有产品含义、科学精度、采用设计、共享合同与独立App保留边界不变。

## Component Map

- DESIGN.md: sole authored visual identity and exact-value source, with independently scoped native App and WeChat Mini Program profiles.
- packages/ui-system/src/tokens.ts: generated runtime projection of the native App profile only; compatibility aliases may serve existing App consumers but cannot originate a new value or supply Mini Program tokens.
- project_context/global.md: common recovery entry; project_context/product-profile.md owns detailed goals, release boundaries, user journey and experience principles.
- project_context/development-workflow.md: root-owned on-demand owner for WeChat Mini Program development/test/acceptance topology, paths, isolation and DevTools lifecycle; the Mini Program visual profile lives in DESIGN.md.
- project_context/deployment.md: root-owned on-demand owner for remote staging/production topology, release promotion, domain/filing bindings, secret classes, migration, backup/restore, rollback and production observability. It consumes qualified candidates from verification but never treats a workflow or cloud declaration as a deployed result.
- project_context/areas/main.md: cross-workspace Starward product/domain ownership, screen/state/interaction contract, and core domain behavior.
- project_context/areas/main/verification.md: on-demand index for near-universal validation and evidence boundaries; its registered on-demand verification nodes own development-loop, acceptance/runtime, and Android/native detail.
- project_context/areas/main/implementation-index.md: on-demand code-navigation index for current Mobile, API, owner-operations, and verification entry points; it does not own intended product or verification semantics.
- project_context/areas/main/screen-contracts.md: canonical Screen Contract index and shared target/verification boundary; registered mobile and owner-operations detail nodes retain the existing 14 Surface/95 Control semantics without becoming new authorities.
- project_context/areas/main/screen-contracts/wechat-miniapp.md: independent Mini Program route/subpackage, five-Surface, material-Control, state, interaction and accessibility contract. It owns the current Map/Search/spot-information-panel and full-sky topology and cannot borrow native App/Admin surface or target semantics.
- Mini Program generic UI substrate (pre-migration implementation): bounded Taro primitives and existing Starward components under `apps/wechat-miniapp/src/components/**` remain the current code baseline until their native replacements are implemented. `@taroify/core@1.0.6` remains not adopted. The historical icon-dependency concern does not alone establish incompatibility with the exclusive SemanticIcon owner: the external review identified custom-icon composition, but no new WEAPP suitability has been established. Only a concrete unmet capability justifies a bounded current-version/target comparison; package dependency presence is not itself a brand/icon decision. Preserve one DESIGN token projection and existing state/coordinator and icon-asset ownership; the current Taro enhanced ScrollView and `semantic-asset.tsx` implementations are migration inputs, not permanent target-framework requirements. A future compatible library requires license/peer, bundle and WEAPP checks; it cannot redefine product state, exact tokens, upload transport or iconography.
- .codex/skills/uiux_design/: project-owned interaction, shared-component and verification guidance with separate React Native App and Taro/WEAPP primitive selection; it is subordinate to DESIGN.md, Source Plan, and owning Context. General architecture/extraction/dependency execution rules live in AGENTS.md outside the Tiny Context managed block; this Context owns actual project boundaries and technology decisions.
- docs/technical-data-source-decisions.md: dated provider/data/stack research and recommendation evidence; recommendations remain non-authoritative until the corresponding decision and external gates are confirmed.
- Production code lives under apps/, packages/, workers/, data-pipelines/, infrastructure/, and config/. It consumes or derives from canonical design rules rather than editing exported preview files as product UI.

### On-Demand Component Detail

- [Cloud, Mini Program, BFF, data, decision, publication, contribution and identity components](architecture/runtime-and-domain.md)
- [Cloud-sky performance](architecture/runtime-and-domain.md#cloud-sky-performance): frame scheduling, reuse by input lifetime, texture residency and resource boundaries; measurements remain with the development-feedback owner.
- 本轮小程序扩展：[共享天文事件Modal与单选迁移](architecture/runtime-and-domain.md#shared-astronomical-event-modal-implementation-boundary)、[地形/光污染数据与地图叠加](architecture/runtime-and-domain.md#mini-program-terrain-and-directional-light-evidence)。以及[B行256px图标接入](architecture/runtime-and-domain.md#mini-program-b-matte-icon-integration-boundary)。上述三项与[整体UIUX及Context对齐补开发](areas/main/screen-contracts/wechat-miniapp.md#整体uiux与context对齐补开发)属于同一完整需求的实施边界；公共Tab视觉反馈已由共享组件迁移，生产代码、契约和数据发布边界已落地，当前验证范围及未覆盖设备/生命周期条件由任务证据记录。
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

- Mobile-first behavior and outdoor/low-light use make safe-area handling, reduced motion, contrast, and low-luminance field behavior architectural UI constraints. Use each product profile in DESIGN.md for touch-target geometry. The Mini Program currently uses logical-pixel minimum targets; do not recover superseded rpx values from historical design exports.
- Direct-manipulation state is split from committed domain state: gesture presentation may move continuously and be interrupted, while place/time/route/itinerary changes commit only to valid coordinated states and recover cleanly on cancellation or provider failure.
- Deep links activate the owning tab and nested route, while native Back first closes route-owned overlays and then pops only that tab's stack. Tab selection itself does not synthesize cross-tab Back history.
- Forecast and astronomy data are uncertain; provider data must not be presented as guaranteed truth.
- Shared `platform-boundary` code currently models only one native-App primary product and a limited auxiliary Mini Program. This is acknowledged technical debt: implementation must introduce a per-product carrier boundary or an independent Mini Program boundary without overwriting native-App semantics or duplicating provider/license truth.
- Professional density must use aligned matrices and progressive disclosure without overwhelming the primary decision.

Mini Program blocker/score invariants continue in [runtime and domain architecture detail](architecture/runtime-and-domain.md#mini-program-decision-constraints).

## Verification Implications

- Context integrity is checked through the Tiny Context commands in project_context/areas/main/verification.md; specialized checks are routed through its on-demand verification nodes.
- DESIGN.md structure is linted separately from exported asset integrity.
- Production UI verification must eventually cover representative mobile viewport, visual mode, key state, and long-content combinations; static kits alone cannot prove product behavior.

Android/runtime-carrier and current-candidate verification detail continues in [assurance and lifecycle architecture detail](architecture/assurance-and-lifecycle.md#verification-detail).

## Open Risks

- Official-source research and the current personal-trial profile establish qualifying free-first choices and the product-scoped ceilings in product-profile.md (native App CNY 200/month; Mini Program uses the separately adopted external-capability cost scenario), but purchases, commercial contracts, public redistribution, production accounts/traffic, representative devices, outdoor validation, legal/store approval, and production provider promotion remain future gates.
- A corrective audit found fixed responses, process-local repositories, metadata-only side effects, and declaration-only native boundaries in existing scaffolding. They must be replaced by durable production loops before any Outcome can be accepted.
- Windows-hosted delivery may not by itself establish the physical WeChat observations required by the current acceptance matrix, nor real provider, coordinate-authorization or real WeChat-identity facts. Those rows remain explicit pending external validations; they cannot be omitted or replaced by project pass/verdict rows, and the Goal cannot close while any required confirmation is pending.

Existing extraction/ownership concerns remain in [maintenance boundaries](architecture/maintenance-boundaries.md); they do not impose a Tiny Context modularity gate.
