# Context Maintenance And Resource Interpretation

Starward uses schema 5 and the project-tiny-context-harness version pinned in root `package.json`; the minimal CI closure in `tools/context-check/package.json` must use the same version. Run the installed CLI through npm scripts on the root-declared Node range; do not mix old binaries or use an unpinned network CLI for ordinary reading and validation. Common project scripts use `tools/run-node.cjs`: it keeps a supported current Node or selects the verified `npm_node_execpath`, then prepends that executable's directory only to child PATH. This handles a shell resolving WeChat's older bundled Node without changing global PATH. For another local script use `npm run node -- <script-or-node-options>`; when neither runtime meets the declared range, the launcher fails before starting the command.

Only global.md is default Context. Architecture, the cross-workspace main Area and verification are retained on demand. Routing metadata does not impose mandatory headings, line limits, fixed workflow stages, architecture deliberation artifacts or machine completion gates. Read related owners using the manifest and search; retain product requirements and confirmed decisions at their existing owners.

Use npm run context:validate for manifest/path structure and npm run context:doctor for installation diagnostics. After an intentional dependency update, review the installed README/migration notes and npm run context:upgrade -- --check; a schema-5 sync-only update uses npm run context:sync to refresh the managed startup entry. Schema migrations use the explicit upgrade procedure. Project-owned skills and prose are reviewed separately; sync does not update them. Project tests, actual runtime observations and required human/external decisions remain separate.

## Keep Context Small

- Preserve durable product decisions, boundaries, reasons and useful code/test entrypoints. Do not copy code, task progress, artifact inventories, hashes or historic selection narratives into Context.
- DESIGN.md and Screen Contracts are the UI inputs. For the Mini Program, explicitly adopted page resources are also required inputs under the rule below. Historical prototype HTML, Open Design projects and selected-resource packages remain retired unless explicitly adopted again; their existence is not adoption.
- Generated production tokens and actual icons remain useful build inputs. Their reproducible generation and runtime checks remain; remove dependencies on display-only prototypes rather than keeping the prototypes merely to satisfy an obsolete checker.
- Task-local notes and runtime evidence stay outside Context. Historical records needed for investigation can be retrieved from Git, not loaded as current authority.

The old package-internal compatibility overlay and its proof-command wrapper are removed: their engine no longer exists. Do not patch node_modules or weaken project runtime assertions to simulate old acceptance. Preserve source/candidate identity, truthful failure, resource cleanup and privacy boundaries in the project-owned runners.

## Bounded Discovery

- Start with the manifest's relevant owner or [implementation index](areas/main/implementation-index.md). Search its directories explicitly, for example `rg -n --max-columns 200 --max-columns-preview "<symbol>" tools/miniapp`; use `rg --files <owner-directory>` when locating filenames. Expand to direct callers and dependencies as the change requires.
- Search Context headings/keys before opening large bodies. Historical task inputs, `.long-task/**`, retained verifier diagnostics and run outputs are provenance sources only when the current question needs them; avoid including them in a routine root-wide content search. This does not skip confirmed Source requirements or the adopted-resource reading rule below.
- For a historical question, locate the exact file/key and read the relevant section with enough surrounding context to preserve its meaning. Report a failed or truncated query as incomplete, not as evidence that no owner exists. Keep new execution notes in the task's existing local index.

## Mini Program Page Design Resources

Starward composes Tiny Context's packaged `design-resource` through [the existing project Skill](../.agents/skills/starward-design-resource/SKILL.md). Generic resource operations and adoption mechanics follow the installed capability; the managed AGENTS contract owns the general development-reading obligation. Project design techniques stay in the local Skill, while confirmed preferences, principles, style, scope and reasons stay with the existing owners below. Dependency upgrades update the base directly; do not edit node_modules or keep a competing generic copy. Resource work, including a request for `design-resource`, uses this project entry so these requirements are read without the user repeating them.

The owner requires page-by-page resource delivery and faithful implementation. Existing adoption remains valid across tooling upgrades. This rule applies to the Mini Program; it does not migrate native App or operations design authority.

- Store design resources under `docs/design-resources/`, keeping candidate runs separate from adopted resources. Preserve the available editable sources, visual references, usable assets and necessary implementation guidance; report material gaps. Detailed inventories, generation records and verification evidence stay outside Context.
- The owning Screen Contract keeps the current adopted entry, applicable scope and essential confirmed decisions with reasons. One scope has one current basis; an entry may map several nonconflicting page/component/state/theme scopes. Partial adoption replaces only its scope and preserves remaining references. Choosing a direction does not automatically adopt every detail; existing explicit adoption authorization is sufficient.
- Declare each current local text entry once in its owning Context using Tiny Context's `ty-context-controlling-source` comment with `domain="design"` and its actual repository-relative `path`, as shown in the installed adoption reference. Shared entries belong to their shared owner; other owners link there without repeating declarations. Existing Markdown links remain navigation, candidates/history are not controlling declarations. Keep resource directories outside default Context. Follow the affected implementation to its owner, then read the applicable entry, source and behavior notes and actually view its current visuals; trigger keywords are not required.
- Screen Contracts own business and interaction meaning; DESIGN.md owns shared visual rules and exact tokens; adopted resources own concrete page composition and assets within their declared scope. Resolve conflicts at adoption by updating the affected owner, rather than keeping competing rules or rewriting requirements to match output.
- Before implementing a covered page, read and visually inspect its adopted resources and reproduce the confirmed design faithfully, including pixel-level fidelity where comparable. Resolve missing references or genuine platform constraints explicitly; do not silently substitute an approximate design. Resource adoption alone does not prove implementation.
- Derive verification scope, comparison conditions and suitable methods from the current requirements, adopted resources, affected behavior and target runtime. Inspect actual results, correct deviations and rerun affected checks. Record material limitations honestly; static visual evidence cannot establish interactive correctness. Keep product-specific scenarios and values with their existing owners, not in this general rule.
- Reuse the Tiny Context development contract in AGENTS.md and applicable implementation skills. Ordinary fixes do not require regenerating resources; update them only when the confirmed design changes. This rule adds no separate development Skill, fixed checklist, historical hash gate or mandatory handoff workflow.

For an authorized adoption, read the packaged Skill's `references/adoption.md`, update the existing entry and owning scope/decisions, reconcile affected DESIGN/Context rules, and repair stale navigation in the same change. Existing registered owners can be edited directly; use manifest registration only for an actual new owner. Retain unmodified scopes and inspect the corresponding local references after writing. Apply the continuous-calibration rule below whenever feedback adds a durable fact, including before formal adoption when the user's explicit principle already has a clear scope.

`context:validate` checks explicitly declared local UTF-8 dependencies and supported ownership/path conflicts. It does not recursively validate links inside ADOPTED.md, open media/prototypes, access remote resources or infer overlapping prose scopes. Resource tasks explicitly check the needed linked files and real outputs; missing current input is a missing constraint, not permission to improvise. Structural checks, actual resource inspection and production verification are reported separately.

## Shared component continuity

Public/shared component identification begins during UI/UX and product design, under the [cross-stage rule](../AGENTS.md#shared-components-across-design-and-implementation). Record only affected responsibilities in existing owners, not a parallel global component registry:

- The owning Screen Contract or shared contract records the component's purpose, actual consumers, shared product/interaction states, permitted differences and exclusions. DESIGN owns reusable visual rules/tokens; the resource package owns the editable shared definition, concrete variants/examples and review/adoption scope. Other pages reference that owner instead of duplicating its contract.
- For each affected shared unit, preserve a stable name/key, links to consumers and resources, and the distinction between confirmed semantic decisions and candidate visuals. Material-only components do not acquire content, navigation or domain state merely because multiple pages use them. Product components may own shared semantic behavior when that is their established responsibility.
- Architecture records dependency/data/platform boundaries and material unresolved implementation questions. When implementation is authorized, map the shared design responsibility to the actual source owners and consumers; until then, code mappings are explicitly planned or absent. Code may split/compose these responsibilities and add technical components without changing their adopted semantics. A static design family, a reusable prototype module and a verified production component are different facts.
- Revise shared definitions and affected examples together within scope. Preserve unaffected variants and adoption status; keep generation prompts, experiments and progress outside durable Context. A routine resource edit needs no new schema, mandatory handoff or repository-wide catalogue.

## 持续校准设计系统与用户偏好

设计资源持续增加的价值，是让项目对用户审美和UIUX预期的理解越来越准确。每次获得明确反馈、完成修订或采用页面时，在本次工作内检查是否产生新的持久设计事实；不能只存资源链接或要求下一页照着上一页画。没有新增认识时不制造文档变更。

- 先按[设计概念与范围](product-profile.md#design-concepts-and-scope)分类：UIUX原则、审美偏好、项目视觉风格、设计系统规则、页面/业务决定。不要把审美喜欢解释成可用性定律，不把风格与整个设计系统混称；“已采用”不是客观完成度或通用质量门槛。
- 从用户认可与否定的具体部位、修改前后差异和实际交互中提炼偏好，并明确作用范围：跨页风格/原则、可复用组件规则，或仅本页的内容与构图决定。明确的通用指示可直接作为原则；孤立案例的推断先标为待验证，不凭生成结果或一次整页采用自动提升为全局规则。
- 提炼的是设计选择及其目的、适用条件和边界，不是复述尺寸清单或堆叠“禁止项”。例如用户反复调小计划行和缩短空白，支持信息紧凑但保留清晰层级的偏好；采用一张玻璃卡片说明这种材质在该场景成立，不推出所有卡片都玻璃化。
- 在原有owner更新：产品体验目标与偏好解释写 product-profile.md；视觉风格、材质/图标/排版及通用表达写 DESIGN.md；任务、状态、返回与交互语义写所属 Screen Contract；具体页面构图和可编辑材料写采用包。Skill只承接如何读取、提炼和运用，不能成为另一份偏好事实源。
- 新决定与旧文案冲突时，改写或缩小原规则的适用范围，撤掉已失效的说法；不要持续叠加“例外”使 Context 自相矛盾。保留简短理由和当前采用入口，完整反馈、前后图和试验过程留在资源记录或Git历史。
- 下一页使用更新后的原则，并查看相关资源验证如何落地；新反馈继续校准。沿用的是越来越准确的设计判断，而非固定复制同一模板。采用和资源归档时一并检查这项同步，不要求用户再单独提醒“更新设计风格Context”。

这些更新不自动授权批量改动已采用页面、生产代码或其他平台。维护记录和检查通过也不证明审美已符合预期，最终仍以用户反馈与采用决定校准。
