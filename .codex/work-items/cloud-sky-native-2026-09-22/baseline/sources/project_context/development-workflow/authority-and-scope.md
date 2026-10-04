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

## Evidence Meaning

- For each material requirement, bind the current authority and expected result to the product or technical owner that can guarantee it, then use evidence capable of failing when the result or boundary is wrong. A representative real-runtime result is required before a new shared UI realization, cross-module path or technical approach is broadly replicated.
- Keep `captured`, `reviewed`, `passed`, `failed` and `unverified` distinct. A generated screenshot, recording, log, selector/class/text/hash change, mocked response or successful command is evidence input for its declared layer; it cannot imply visual, interaction, product, architecture or device conformance.
- Initial comparison with a current adopted resource establishes conformance; only a result already reviewed as conforming may become a later regression baseline. Missing comparison remains `unverified`; a known discrepancy remains `failed` until repaired or the current owner is intentionally changed.
- The current `test:miniapp:native` command is a fail-closed DevTools collector. Collector success means its bound runtime journeys, automated assertions, capture and cleanup succeeded. Review actual evidence at the layer that can establish the obligation: visual comparison and motion sequences, business results through the responsible boundary, or real dependencies and runtime effects. Reuse existing task evidence and checks; optional `miniapp:conformance-review` notes record selected files and scoped observations without DevTools, screenshot or fixed-dimension prerequisites. Record validity, input integrity, candidate applicability and the reviewer's judgment are separate facts. The helper never certifies product acceptance.
- The optional helper's `follow_up` exposes recorded unresolved claims and detected input/source drift, while `reviewer` exposes the declared identity and method. An empty action list cannot detect omitted requirements, establish independence or certify completion. `test:miniapp:ui-contracts` reports `check_kind: source_patterns` and leaves product conformance unverified; its source assertions cannot assess rendered composition.

## Ownership And Dependency Direction

- This file is the unique source of truth for cross-layer Mini Program environment and evidence topology. `project_context/context.toml`, `project_context/global.md`, `project_context/architecture.md`, and the main verification index only route readers here; they do not duplicate its rules.
- `project_context/deployment.md` separately owns remote staging/production, public domains, release promotion, production secrets, migration, backup/restore, rollback and production observability. This file may qualify the Mini Program candidate and experience/device evidence but cannot deploy or publicly release it.
- Existing `project_context/areas/main/verification/development-loop.md`, `acceptance-runtime.md`, and `android-native.md` continue to own React Native/Web/Android App paths. Their commands, ports, artifacts, design targets and acceptance results cannot be projected onto the Mini Program.
- Mini Program source, runner, acceptance harness and selected service adapters consume this topology. Implementation code, generated config, CI or reports cannot become reverse authority.
- Do not create a separate Context workspace mirror merely because `apps/wechat-miniapp` becomes an npm workspace. Its durable product/screen facts are already owned by the main cross-workspace Area and this root verification node; add a sparse workspace Context only if later facts cannot be expressed without duplication.
