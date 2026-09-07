# Mini Program Workflow Authority And Scope

This on-demand verification node owns the reserved scope, UI implementation and cross-owner dependency direction for the Mini Program development/test/acceptance environment.

## Reservation Status And Scope

**当前已采纳方案的产品面、工程 owner 与 selected 设计约束直接作用于唯一现有实现；真实小程序 workspace 和 WeChat DevTools 当前会话采集器沿用既有 owner。Mini Program 不保留 Web/H5 产品实现或验收代理；资料版本仅表示来源沿革，不建立开发版本。Context 只记录边界，实际存在性与通过状态仍由代码、当前候选检查及必要的真实外部验证 证明。**

- `apps/wechat-miniapp/**`, `packages/miniapp-contracts/**`, `workers/miniapp-api/**` and `tools/miniapp/**` are the implemented owners for the one current candidate. Their presence, generated bundles and historical artifacts never imply a successful current run; the implementation index routes readers to the current entry points.
- `docs/wechat-miniapp-v2-1-1-source.md` is an immutable Source inventory and provenance carrier. It SHA-binds the accepted proposal inputs and complete 97-row `selected-requirement-dispositions.json` census; its embedded Soft Instruments target and selected-v3 resource identities are historical visual provenance superseded by the current Field Signal system selection. Its product, technical, data, state, safety and interaction meanings remain controlling under correction/disposition precedence. The filename and proposal labels do not identify a parallel implementation or make a verification task active; the native `docs/source-plan.md` remains authoritative only for its native-App delivery and cannot constrain this independent Mini Program back to auxiliary parity.
- Root `DESIGN.md` owns `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` as the independent active Mini Program profile. Its production projection may be generated under the Mini Program workspace, but cannot import Mobile/App/Admin target values, `packages/ui-system/**`, legacy `docs/design-*` exports, old selected page resources or HTML prototypes as a token source. Selection alone does not claim that the current production projection has migrated or conforms.

## UI Implementation

- Read the affected Screen Contract for page responsibilities and DESIGN.md for visual rules and generated token values. Implement through existing production components and state owners, then inspect actual WEAPP behavior.
- Follow [Mini Program Page Design Resources](../context-maintenance.md#mini-program-page-design-resources): developers must read and visually inspect adopted page resources referenced by the Screen Contract. Ordinary fixes do not require resource regeneration, handoffs or historical hash checks; update the resource and owning rules only for an intentional confirmed design change.
- Test generated token consistency, meaningful state/interaction behavior and actual layout. Compare real WEAPP output against adopted page references under matching conditions; prototype rendering and frozen-package integrity alone are not product checks.
- Preserve the independent Mini Program profile; App/Admin tokens and historical HTML are not runtime design inputs.

## Ownership And Dependency Direction

- This file is the unique source of truth for cross-layer Mini Program environment and evidence topology. `project_context/context.toml`, `project_context/global.md`, `project_context/architecture.md`, and the main verification index only route readers here; they do not duplicate its rules.
- `project_context/deployment.md` separately owns remote staging/production, public domains, release promotion, production secrets, migration, backup/restore, rollback and production observability. This file may qualify the Mini Program candidate and experience/device evidence but cannot deploy or publicly release it.
- Existing `project_context/areas/main/verification/development-loop.md`, `acceptance-runtime.md`, and `android-native.md` continue to own React Native/Web/Android App paths. Their commands, ports, artifacts, design targets and acceptance results cannot be projected onto the Mini Program.
- Mini Program source, runner, acceptance harness and selected service adapters consume this topology. Implementation code, generated config, CI or reports cannot become reverse authority.
- Do not create a separate Context workspace mirror merely because `apps/wechat-miniapp` becomes an npm workspace. Its durable product/screen facts are already owned by the main cross-workspace Area and this root verification node; add a sparse workspace Context only if later facts cannot be expressed without duplication.
