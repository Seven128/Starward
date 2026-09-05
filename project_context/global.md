# Starward

Starward owns 《今晚去观星》, a mobile-first stargazing trip decision product. Help users decide whether to go tonight, where and when to go, how to arrive, and how to observe safely. Conclusions lead to an executable plan and then supporting evidence; uncertain or unavailable data must remain explicit.

- There is one current implementation per product responsibility. Native App, WeChat Mini Program and owner operations have distinct surfaces; do not infer one product's behavior or visual values from another.
- The Mini Program has Map and My as its primary destinations. Its sky route belongs to a selected formal spot. Read the owning Screen Contract before changing those flows.
- Current distribution is owner-only, non-commercial personal trial. External-service budget is CNY 200/month; this is no purchase or public-release authorization. Commercial registration, platform approval and real-device/field acceptance cannot be inferred from code or tests.
- Context owns intended product meaning and boundaries; code owns current implementation. Root DESIGN.md owns the existing confirmed visual profiles. User requirements and confirmed decisions remain applicable after workflow-tool retirement.
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
