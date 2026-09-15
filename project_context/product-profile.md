# Starward Product And Release Profile

## Project Goal

- Build Starward as the repository for 《今晚去观星》, a mobile-first stargazing trip decision product.
- For the native App, help a user move from “is tonight worth going?” to a safe, practical plan: where to go, when to leave, the best observing window, what may be visible, how to arrive, and how to observe or photograph on site.

## Non-goals / Boundaries

- The product is not a generic weather dashboard, astronomy encyclopedia, map clone, or decorative night-sky experience.
- The repository contains a broad React Native/API implementation, but completion is not established by screens, fixed sample responses, in-process state, or generated evidence text. Each required capability still needs current production-loop evidence.
- Reference screenshots and Open Design exports are evidence. They must not be copied as another product's logo, proprietary branding, or exact page layout.

## Background

- Product name: 《今晚去观星》.
- Repository/engineering name: Starward.
- Brand promise: 从黄昏走入星夜.
- The native App's selected design direction combines a blue visual system with disciplined skeuomorphism for professional observing and outdoor equipment. The independently selected WeChat Mini Program direction is `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`; it combines a light sky/meteor/trail field palette with compact, clearly tiered mobile information and does not inherit App values or targets. The same current system governs app-owned floating Map Search, compact Search/filter/results, the one-document three-extent spot panel, one mutually exclusive Map bottom presentation, raised draggable time ruler, unified three-state display control, full-sky chrome, colored-icon My hierarchy and compact Contribution intake. Mature compatible controls are reused through one Starward-owned adapter rather than visually or semantically reimplemented; provider/basemap/tile/native-map appearance remains outside its visual authority.

## Design Rationale

- Native App uses conclusion, executable plan, then evidence. Mini Program uses objective place/arrival/safety and selected-time astronomy/weather facts plus user-owned plans; it removes combined recommendation presentation and recommendation filters while retaining safety restrictions.
- Space and time use a shared visual grammar: routes, celestial tracks, horizon arcs, circular nodes, and continuous observing windows.
- Planning, night-observing, and red-light field modes preserve information architecture so a mode change does not force the user to relearn the workflow.
- In the native App profile, planning uses cool blue-white surfaces, night uses near-black navy depth with limited blue, and red-light observation is restricted to the six registered black/warm-red values. The Mini Program has its own role-isomorphic day/night/observation values in `DESIGN.md`; neither profile supplies values to the other. Physical/material cues remain concentrated in selected physical subjects rather than every data container.
- Visual identity and exact tokens are owned by DESIGN.md. Product responsibility, information architecture, interactions, and state behavior are owned by project_context/**.

## Mini Program design quality expectation

The primary goal is to continuously refine the project’s understanding of the owner’s visual preferences and UIUX principles from accumulating design resources, explicit feedback and adopted revisions. Design decisions should become better grounded as that understanding improves. Adoption of a page records acceptance within its scope; it supplies no objective quality score, completion level or universal template. Follow [continuous design calibration](context-maintenance.md#持续校准设计系统与用户偏好) to update existing owners, distinguish general principles from page-specific choices and replace obsolete rules.

Unless explicitly asking for wireframes or structure-only work, “做一版看看” authorizes a finished design proposal, including refinement within the requested scope; it does not mean a plain scaffold awaiting a separate beautification request. Repeated “太丑、再优化” feedback identified an overly conservative first-pass interpretation, not a request for a permanently minimalist product.

“克制、简洁” governs competing emphasis, redundant content and unnecessary interaction. It does not remove expressive cards, crafted icons, appropriate material depth or fluid transitions. Choose these according to the page's real purpose; never manufacture information to make a screen look richer. The concrete visual rules and adopted examples are owned by [DESIGN.md §1.3](../DESIGN.md#13-设计判断与视觉表达); page scope and the sole adopted resources remain with Screen Contracts.

Before a new page, use its task, current principles and applicable confirmed preferences to form a design hypothesis. Inspect relevant resources as concrete examples with known scope, not as a mandatory finish threshold. Check the rendered result for specific composition/interaction problems and revise those within the request before presenting it. A functional prototype or a list of compliant tokens does not establish visual quality. User preference still decides adoption; no mechanical score, mandatory extra variants or promise of guaranteed first-pass approval is introduced.

## Design concepts and scope

2026-09-12 小程序全局图标审美反馈：现有图标太呆板，希望统一采用拟物、偏可爱且元素克制的方向，覆盖功能图标与具象素材；可爱不等于给每个对象附加装饰。用户随后明确选择 Web GPT 加磨砂质感后最新对比图的B行，作为整套生成的唯一风格参考；不再重启A/B/C探索。2026-09-13用户进一步采用256px日间透明图标，兼顾手机/平板常用尺寸的清晰度和包体；经用户授权本地合成地图selected后，已核对采用71份日间资源（62种基础图标、想去轮廓态、导航selected、动画分件及地图四态）；同主体状态复用原始像素并独立叠加装饰，避免重画引入几何漂移，接入后的四态切换未验收，用户要求持续提供具体返修提示词直至符合要求。来源与缺口统一见共享图标owner；夜间/红光未交付，资源采用不等于生产替换已完成。表达、参考与资产责任见 DESIGN.md 小程序「字体与图标」。

These concepts describe different kinds of decisions. A useful design resource can contain examples of all of them; its adoption does not make every detail a general principle.

| Concept | Definition and applicability | Example / owner |
| --- | --- | --- |
| UIUX design principles | Explain how people perceive information, understand state and complete actions. Generalization requires a user need, mechanism, applicable conditions and exceptions; a principle is not a favorite visual treatment. “General” may mean across relevant Mini Program scenarios, not every platform or situation. | Reading hierarchy, feedback at the action, reversible cancellation and state continuity. Shared visual/information expression belongs to DESIGN.md; cross-control interaction semantics belong to the relevant Screen Contract. |
| Visual style preferences | The owner's context-dependent aesthetic inclinations. Record what was liked/disliked and its scope; these are revisable preferences, not universal usability laws or exact component specifications. | Preference for rounded, cute, materially expressed illustrations; liking a glass card in My does not imply glass everywhere. Preference meaning is here; concrete visual expression belongs to DESIGN.md. |
| Project visual style | A coherent visual language chosen for this product/platform: typography hierarchy, palette relationships, spatial rhythm, shapes, icon treatment, material and motion character. It translates applicable preferences into compatible choices rather than collecting every liked effect. | The Mini Program and native App have independent profiles, owned by DESIGN.md. New feedback can refine a profile without mechanically changing every page. |
| Design system | Reusable implementation and composition rules that make the chosen style and interaction principles consistent: semantic tokens, component anatomy, variants, states, accessibility and motion behavior. Style is one input to the system, not a synonym for the whole system. | Shared time control geometry and behavior, button states and semantic color roles; use existing DESIGN/component/Screen Contract owners, with code owning implementation. |
| Page or business decision | A choice whose meaning depends on a particular task, entity, state or layout. It may demonstrate a broader principle but is not itself promoted to a universal rule. | Plan cards show at most three upcoming items; My uses a specific SUV; drafts are saved remotely. Screen Contract owns business/interaction meaning; adopted resources own concrete page composition. |

When generalizing feedback, identify what problem the user corrected and why the change helps. Distinguish the underlying reusable principle from the selected visual technique and local parameter. An explicit broadly scoped instruction is sufficient evidence for that scope; repeated choices can support a proposed preference, but repetition alone does not prove universality. Keep an unconfirmed interpretation as a hypothesis, not a settled preference. If scope is unclear, apply the explicit change locally and avoid silently narrowing creative options elsewhere.

## Architecture Context

- See project_context/architecture.md for the source-of-truth split and current repository boundary.

## Product / Delivery Brief

- Native App primary users are people deciding on a same-night stargazing outing, including casual users who need a clear recommendation and experienced users who need professional conditions.
- Native App core flow: tonight conclusion → choose main/alternate place → choose departure and observing window → review route/facilities/risk → inspect professional evidence as needed → prepare equipment/checklist → use night or red-light field controls on site.
- Native App durable acceptance signals are a clear first-screen recommendation, a continuous place/time/route state, professional data available through progressive disclosure, and mode changes that preserve task position.

Mini Program acceptance asks whether users can find the relevant trustworthy facts and arrange an executable, revisitable plan. Its discovery filters do not include 今晚推荐 or 最佳窗口时长. Formal restrictions and action checks remain even when combined recommendations are not displayed.

## Current Release Profile

- Current operating entity: individual.
- Target public-release operator: an individual industrial and commercial household using the selected trade-name candidate `茂文菲蛋`. The exact registered legal name, address, business scope, unified social credit code and approval are pending external registration; until they are confirmed and the Mini Program subject is changed or migrated through the supported platform route, the current individual profile remains controlling.
- Current distribution: owner-only, non-commercial personal trial/internal install; no public operation or production app-store claim.
- Native App trial ceiling remains CNY 200/month. For Mini Program, the 2026-09-14 [adopted source/cost scheme](external-capabilities.md) replaces the former CNY 350/month ceiling and CNY 0.25/DAU/month psychological cap. Compare fixed, metered, acquisition, processing, hosting and delivery costs using that source and its explicit assumptions.
- Budget fit never authorizes a purchase, plan upgrade, second paid source, production traffic, or public redistribution.
- Mini Program planning reference is approximately CNY 820/month with the annual/commitment discounts or CNY 1080/month at standard rates. These figures include specified production/test compute and use calendar-month average DAU and distinct queried positions, including private points and cloud grids. Show annual upfront cash, actual entitlements, excluded acquisition/operation work and reassessment conditions. This Mini Program decision does not change native App selection or authorize spending.
- Provider selection during the current trial must already account for a viable public-release and commercial path, including operator eligibility, actual product/API rights, fixed licence fees, usage and hosting costs, payment/renewal, target-network operation and migration cost. Personal trial quotas alone cannot establish suitability. Public availability and monetization require separate assessment under the provider's terms; absence of user charges does not establish non-commercial use. Use the early-commercialization target above rather than extrapolating the trial ceilings. Resolve material licensing, cost or capability gaps before treating a provider as the long-term choice; preserve accepted product capabilities when comparing replacements. This requirement does not authorize purchases or public release.
- Preserve every capability required by the current accepted Source in the one current implementation. Proposal labels such as MVP/V1/V2/V3 are provenance and precedence history only: they do not create parallel product paths, and superseded behavior is removed from its existing owner. Capabilities without commercial, legal, store, expert, representative-device, or field evidence stay experimental, unknown, pending, disabled, or truthfully degraded.
- Keep one active representation of each responsibility. Migrate useful production assets and checks off obsolete prototype inputs before retiring them; an old checker alone does not justify retaining a display package. Git history provides recovery. Confirmed product and design decisions remain in their current owners; ordinary UI changes do not require prototype or handoff synchronization.
- Current native runtime acceptance requires Android. iOS implementation remains in full delivery scope, including the generated native project, shared behavior, platform adapters, interaction/accessibility differences, and build configuration, but provisioning macOS/Xcode/iOS Simulator and executing iOS build/runtime checks are deferred for this profile. iOS must remain explicitly runtime-unverified/deferred and cannot inherit a usable or passed claim from Android, Web, static structure, or historical evidence.
- Contracts, legal/store approval, expert sign-off, representative outdoor/device validation, and site-operation verification are future production-release gates. User spot/media/field-report uploads remain product behavior and are not release-evidence uploads.

## UX / Screen Brief

- **同一对象的跨场景一致性（Mini Program）**：不同场景中表达同一业务对象的组件，尽量保持一致或较高相似度，以降低重复识别与学习成本。共同保留对象身份、核心信息层级、主要视觉线索和可预期的交互反馈；场景差异通过补充信息与明确动作表达。这里“观星点”是业务对象，“观星点卡片”是它的可复用表现组件。原则约束共同识别结构，不要求不同任务拥有完全相同的字段、权限或点击目的地；差异必须清楚可见。用户明确的通用UIUX原则，不是由单页采用推导的审美偏好。

- Primary mobile viewport: 390 × 844; important touch targets are at least 44px and fixed actions respect safe areas.
- Existing native App representative surfaces remain independently owned. The current WeChat Mini Program surface and navigation model is owned by `project_context/areas/main/screen-contracts/wechat-miniapp.md`: Map and My are its only primary destinations; Map owns a dedicated point-search child and the continuous basic-plus-astronomy spot information panel, while `sky/detail` is the only full-sky child route.
- In the native App, the first layer answers whether to go and when; the second supplies place, route, arrival, facilities, and risk; the third contains cloud layers, transparency, seeing, light pollution, lunar/solar events, model comparison, and photography details.
- Map marker, place preview, route, and detail screens share one selected-place state. Loading, empty, no-results, stale/degraded, error, and success states must remain distinguishable.
- Planning, dark, and red-light modes change luminance and emphasis, not navigation ownership or task order.
- DESIGN.md defines the visual identity, tokens, component appearance, and motion constraints.
- Interactive controls provide immediate press feedback, commit only at a valid completion point, and preserve cancellation/recovery. Direct manipulation remains continuous and interruptible; platform-native back, map, scroll, and accessibility gestures retain their expected ownership.
- React Native implementation guidance lives in `.codex/skills/uiux_design/SKILL.md`. It is downstream of DESIGN.md, this Context, and the Source Plan; its reference from DESIGN.md is discoverability rather than circular authority.

## Verification Entry Points

- See project_context/areas/main/verification.md.

## Current State

- Tiny Context is installed and initialized.
- The repository contains the native App, Mini Program, API/workers, owner operations and their verification tools.
- DESIGN.md owns independent native App and Mini Program visual profiles. Screen Contracts own page responsibilities; production components consume the relevant profile. Provider map appearance remains outside app-owned visual rules. Prototype packages and historical selection records are not development inputs.
- Product UI uses stable user-facing names without proposal dates, revision numbers or old/new implementation labels. Native App, Mini Program and owner operations retain their independent responsibilities. Static design checks do not establish runtime conformance.
- A corrective audit found that several existing carriers use fixed responses, process-local state, metadata-only side effects, or declaration-only native boundaries. Those carriers are implementation scaffolding, not completed Outcomes, until variable-input, side-effect, restart-readback, failure-path, and counterfactual checks pass.
- `docs/technical-data-source-decisions.md` records official-source research and the current individual personal-trial choices. No purchase, production traffic, public redistribution, production account, commercial contract, external approval, representative-device proof, or field validation is declared complete.
- Current release authority is owner-only, non-commercial personal trial with the product-scoped external-service ceilings above and qualifying free sources preferred. Future production gates do not block machine-local implementation, but they also cannot be represented as completed evidence.

## Next Safe Action

- Apply [cross-stage capability research](../AGENTS.md#cross-stage-capability-research) when shaping or implementing complex product capabilities. Product and technical owners retain the confirmed choices, scope, reasons and unresolved feasibility boundaries; design evidence remains distinct from target-runtime validation.

- Before implementing a product surface, read DESIGN.md and project_context/areas/main.md, identify the owning screen state, and update Context first if the change alters durable responsibility, information architecture, interaction, data, or verification. Treat each Outcome as unfinished until its production entry, real state transition, applicable side effect, restart readback, truthful failure/degradation, and counterfactual evidence all pass.
