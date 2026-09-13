# Starward

Starward owns 《今晚去观星》. The native App leads from a trip conclusion to an executable plan and supporting evidence. The independent Mini Program helps users choose places, arrange travel and observe through trustworthy place, weather, astronomy, arrival and safety facts; users decide whether to go. It does not present a combined departure recommendation. Both products keep uncertainty and restrictions explicit.

- There is one current implementation per product responsibility. Native App, WeChat Mini Program and owner operations have distinct surfaces; do not infer one product's behavior or visual values from another.
- The Mini Program has Map and My as its primary destinations. Its sky route belongs to a selected formal spot or the current account’s submitted pending proposal, as defined by the Map Screen Contract. Read the owning Screen Contract before changing those flows.
- Current distribution is owner-only, non-commercial personal trial. External-service budgets are scoped by product: native App CNY 200/month; Mini Program CNY 350/calendar month excluding application/database IaaS; this is no purchase or public-release authorization. Commercial registration, platform approval and real-device/field acceptance cannot be inferred from code or tests.
- Continuously calibrate Mini Program design style and UIUX principles from new resources and explicit user feedback. Update the existing design/Context owners as part of iteration and adoption; distinguish general preferences from page-specific choices. Read [design quality expectations](product-profile.md#mini-program-design-quality-expectation) and [calibration rules](context-maintenance.md#持续校准设计系统与用户偏好).
- Current Mini Program development scope includes the adopted terrain/icons/event-modal changes and whole-product UI/UX verification, Context alignment and missing implementation repairs; follow the [owning Screen Contract](areas/main/screen-contracts/wechat-miniapp.md#整体uiux与context对齐补开发). Design adoption does not establish implementation completion.
- Context owns intended product meaning and boundaries; code owns current implementation. Root DESIGN.md owns the existing confirmed visual profiles. User requirements and confirmed decisions remain applicable after workflow-tool retirement.
- Design resources are persistent: maintain one adopted version per scope through incremental changes, and clean up non-adopted alternatives in both Stitch and local resources when a requirement's pre-development work concludes. Follow [design-resource lifecycle](context-maintenance.md#design-resource-lifecycle); pending review is not adoption, and current editable sources/variants/dependencies must remain complete.
- Follow [cross-stage capability research](../AGENTS.md#cross-stage-capability-research) during requirements, UI/UX, product/technical Context work and implementation. Confirmed capability choices remain with their existing Context owners.
- Keep durable facts with their existing owner; reference exact sources rather than copying implementation. Task progress, logs and optional handoffs stay outside Context. Tiny Context does not manage task state or certify completion.

## Read the relevant owner

Only this file is default body Context. Use project_context/context.toml and ordinary search to expand by the task; the following are on-demand entrypoints.

- [Product, release profile, experience and retained design decisions](product-profile.md)
- [Architecture and shared dependencies](architecture.md)
- [Cross-workspace product/domain responsibilities](areas/main.md)
- [Product surfaces](areas/main/product-surface-contract.md) and [Screen Contracts](areas/main/screen-contracts.md)
- [Mini Program Screen Contract](areas/main/screen-contracts/wechat-miniapp.md)
- [Verification entrypoints](areas/main/verification.md) and [Mini Program development](development-workflow.md)
- [Deployment and external release boundaries](deployment.md)
- [Context maintenance and retained resource interpretation](context-maintenance.md)
