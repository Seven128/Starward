# Context Maintenance And Resource Interpretation

Starward uses the pinned project-tiny-context-harness 0.12.0 package and schema 5, on Node.js 24 or newer. Run the installed CLI through npm scripts; do not mix old binaries or use an unpinned network CLI for ordinary reading and validation. On this Windows host, prefer the Node 24 installation over the Node 16 embedded in WeChat DevTools.

Only global.md is default Context. Architecture, the cross-workspace main Area and verification are retained on demand. Routing metadata does not impose mandatory headings, line limits, fixed workflow stages, architecture deliberation artifacts or machine completion gates. Read related owners using the manifest and search; retain product requirements and confirmed decisions at their existing owners.

Use npm run context:validate for manifest/path structure and npm run context:doctor for installation diagnostics. npm run context:sync updates only the managed startup entry. Explicit package upgrades use npm run context:upgrade after reviewing the installed version's migration notes. Project tests, actual runtime observations and required human/external decisions remain separate.

## Keep Context Small

- Preserve durable product decisions, boundaries, reasons and useful code/test entrypoints. Do not copy code, task progress, artifact inventories, hashes or historic selection narratives into Context.
- DESIGN.md and Screen Contracts are the UI inputs. For the Mini Program, explicitly adopted page resources are also required inputs under the rule below. Historical prototype HTML, Open Design projects and selected-resource packages remain retired unless explicitly adopted again; their existence is not adoption.
- Generated production tokens and actual icons remain useful build inputs. Their reproducible generation and runtime checks remain; remove dependencies on display-only prototypes rather than keeping the prototypes merely to satisfy an obsolete checker.
- Task-local notes and runtime evidence stay outside Context. Historical records needed for investigation can be retrieved from Git, not loaded as current authority.

The old package-internal compatibility overlay and its proof-command wrapper are removed: their engine no longer exists. Do not patch node_modules or weaken project runtime assertions to simulate old acceptance. Preserve source/candidate identity, truthful failure, resource cleanup and privacy boundaries in the project-owned runners.

## Mini Program Page Design Resources

The owner requires page-by-page design regeneration and faithful implementation. This rule applies to the Mini Program; it does not migrate native App or operations design authority.

- Store design resources under `docs/design-resources/`, keeping candidate runs separate from adopted resources. Preserve the available editable sources, visual references, usable assets and necessary implementation guidance; report material gaps. Detailed inventories, generation records and verification evidence stay outside Context.
- The owning Screen Contract links to one current adopted resource entry per page and records its scope and essential confirmed decisions. Pages or conditions outside that scope retain their existing rules. Choosing a direction does not automatically adopt every detail; replace active references page by page after confirmation within the user's authorization.
- Screen Contracts own business and interaction meaning; DESIGN.md owns shared visual rules and exact tokens; adopted resources own concrete page composition and assets within their declared scope. Resolve conflicts at adoption by updating the affected owner, rather than keeping competing rules or rewriting requirements to match output.
- Before implementing a covered page, read and visually inspect its adopted resources and reproduce the confirmed design faithfully, including pixel-level fidelity where comparable. Resolve missing references or genuine platform constraints explicitly; do not silently substitute an approximate design. Resource adoption alone does not prove implementation.
- Derive verification scope, comparison conditions and suitable methods from the current requirements, adopted resources, affected behavior and target runtime. Inspect actual results, correct deviations and rerun affected checks. Record material limitations honestly; static visual evidence cannot establish interactive correctness. Keep product-specific scenarios and values with their existing owners, not in this general rule.
- Reuse the Tiny Context development contract in AGENTS.md and applicable implementation skills. Ordinary fixes do not require regenerating resources; update them only when the confirmed design changes. This rule adds no separate development Skill, fixed checklist, historical hash gate or mandatory handoff workflow.

## 持续校准设计系统与用户偏好

设计资源持续增加的价值，是让项目对用户审美和UIUX预期的理解越来越准确。每次获得明确反馈、完成修订或采用页面时，在本次工作内检查是否产生新的持久设计事实；不能只存资源链接或要求下一页照着上一页画。没有新增认识时不制造文档变更。

- 先按[设计概念与范围](product-profile.md#design-concepts-and-scope)分类：UIUX原则、审美偏好、项目视觉风格、设计系统规则、页面/业务决定。不要把审美喜欢解释成可用性定律，不把风格与整个设计系统混称；“已采用”不是客观完成度或通用质量门槛。
- 从用户认可与否定的具体部位、修改前后差异和实际交互中提炼偏好，并明确作用范围：跨页风格/原则、可复用组件规则，或仅本页的内容与构图决定。明确的通用指示可直接作为原则；孤立案例的推断先标为待验证，不凭生成结果或一次整页采用自动提升为全局规则。
- 提炼的是设计选择及其目的、适用条件和边界，不是复述尺寸清单或堆叠“禁止项”。例如用户反复调小计划行和缩短空白，支持信息紧凑但保留清晰层级的偏好；采用一张玻璃卡片说明这种材质在该场景成立，不推出所有卡片都玻璃化。
- 在原有owner更新：产品体验目标与偏好解释写 product-profile.md；视觉风格、材质/图标/排版及通用表达写 DESIGN.md；任务、状态、返回与交互语义写所属 Screen Contract；具体页面构图和可编辑材料写采用包。Skill只承接如何读取、提炼和运用，不能成为另一份偏好事实源。
- 新决定与旧文案冲突时，改写或缩小原规则的适用范围，撤掉已失效的说法；不要持续叠加“例外”使 Context 自相矛盾。保留简短理由和当前采用入口，完整反馈、前后图和试验过程留在资源记录或Git历史。
- 下一页使用更新后的原则，并查看相关资源验证如何落地；新反馈继续校准。沿用的是越来越准确的设计判断，而非固定复制同一模板。采用和资源归档时一并检查这项同步，不要求用户再单独提醒“更新设计风格Context”。

这些更新不自动授权批量改动已采用页面、生产代码或其他平台。维护记录和检查通过也不证明审美已符合预期，最终仍以用户反馈与采用决定校准。
