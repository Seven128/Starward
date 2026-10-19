# Context Maintenance And Resource Interpretation

Starward uses schema 5 and the project-tiny-context-harness version pinned in root `package.json`; the minimal CI closure in `tools/context-check/package.json` must use the same version. Run the installed CLI through npm scripts on the root-declared Node range; do not mix old binaries or use an unpinned network CLI for ordinary reading and validation. Common project scripts use `tools/run-node.cjs`: it keeps a supported current Node or selects the verified `npm_node_execpath`, then prepends that executable's directory only to child PATH. This handles a shell resolving WeChat's older bundled Node without changing global PATH. For another local script use `npm run node -- <script-or-node-options>`; when neither runtime meets the declared range, the launcher fails before starting the command.

Only global.md is default Context. Architecture, the cross-workspace main Area and verification are retained on demand. Routing metadata does not impose mandatory headings, line limits, fixed workflow stages, architecture deliberation artifacts or machine completion gates. Read related owners using the manifest and search; retain product requirements and confirmed decisions at their existing owners.

Use npm run context:validate for manifest/path structure and npm run context:doctor for installation diagnostics. After an intentional dependency update, review the installed README/migration notes and npm run context:upgrade -- --check; a schema-5 sync-only update uses npm run context:sync to refresh the managed startup entry. Schema migrations use the explicit upgrade procedure. Project-owned skills and prose are reviewed separately; sync does not update them. Project tests, actual runtime observations and required human/external decisions remain separate.

## Keep Context Small

- Preserve durable product decisions, boundaries, reasons and useful code/test entrypoints. Do not copy code, task progress, artifact inventories, hashes or historic selection narratives into Context.
- DESIGN.md and Screen Contracts are the UI inputs. For the Mini Program, explicitly adopted page resources are also required inputs under the rule below. Retired prototypes are not current inputs and are cleaned up under the design-resource lifecycle below; their existence is not adoption.
- Generated production tokens and actual icons remain useful build inputs. Their reproducible generation and runtime checks remain; remove dependencies on display-only prototypes rather than keeping the prototypes merely to satisfy an obsolete checker.
- Task-local notes and runtime evidence stay outside Context. Historical records needed for investigation can be retrieved from Git, not loaded as current authority.
- Keep document responsibilities separate: Context owns durable project decisions, architecture and constraints; Skills own reusable procedures, tool selection and recovery methods, with short applicability rules and links in AGENTS.md where needed. The task plan owns the approach, module dependencies and completion conditions; one short handoff owns current status and unfinished work; acceptance/evidence owns observed results, candidate identities and failures. Link the method from its relevant Context owner instead of copying its procedure or loading it for unrelated work. A plan may specify what evidence is required and link its owner, but does not collect individual run results or acquire a new “next step” after every probe. Only findings that change the approach revise the plan; ordinary exceptions stay under their module. Do not copy task progress into architecture or screen contracts.
- Keep required product meaning, confirmed technical choices and present implementation limits distinguishable at their existing owners. A newly discovered data/implementation limit does not revise the required capability by itself. When a supplier field or approximation changes what users can learn or do, resolve that difference before writing it as the current product contract; visual adoption does not implicitly approve its data semantics.
- Architecture entries describe the actual composition and its unresolved dependencies, not just a list of implemented modules. Reference the source/configuration/publication owners needed for the outcome; keep account values and live status external. Do not turn “adapter implemented”, “assets published” or a structural validation into “capability available” in an owner or adopted-resource entry. Remove or narrow an overstated summary when contradicted, while retaining valid design adoption and unrelated implementation facts.

The old package-internal compatibility overlay and its proof-command wrapper are removed: their engine no longer exists. Do not patch node_modules or weaken project runtime assertions to simulate old acceptance. Preserve source/candidate identity, truthful failure, resource cleanup and privacy boundaries in the project-owned runners.

## Bounded Discovery

- Start with the manifest's relevant owner or [implementation index](areas/main/implementation-index.md). Search its directories explicitly, for example `rg -n --max-columns 200 --max-columns-preview "<symbol>" tools/miniapp`; use `rg --files <owner-directory>` when locating filenames. Expand to direct callers and dependencies as the change requires.
- Search Context headings/keys before opening large bodies. Historical task inputs, `.long-task/**`, retained verifier diagnostics and run outputs are provenance sources only when the current question needs them; avoid including them in a routine root-wide content search. This does not skip confirmed Source requirements or the adopted-resource reading rule below.
- For a historical question, locate the exact file/key and read the relevant section with enough surrounding context to preserve its meaning. Report a failed or truncated query as incomplete, not as evidence that no owner exists. Keep new execution notes in the task's existing local index.

## Mini Program Page Design Resources

Starward composes Tiny Context's packaged `design-resource` through [the existing project Skill](../.agents/skills/starward-design-resource/SKILL.md). Generic resource operations and adoption mechanics follow the installed capability; the managed AGENTS contract owns the general development-reading obligation. Project design techniques stay in the local Skill, while confirmed preferences, principles, style, scope and reasons stay with the existing owners below. Dependency upgrades update the base directly; do not edit node_modules or keep a competing generic copy. Resource work, including a request for `design-resource`, uses this project entry so these requirements are read without the user repeating them.

The owner requires page-by-page resource delivery and faithful implementation. Existing adoption remains valid across tooling upgrades. This rule applies to the Mini Program; it does not migrate native App or operations design authority.

Stitch 的项目连接允许使用宿主官方 MCP 或 Google Labs 发布的 `@google/stitch` CLI；官方认证网站仍可回退。CLI 补足宿主未暴露 MCP 与程序化上传/导出，不改变生成提供方、采用或发布授权。一端明确失败或持续没有有效进展时主动换另一端，复用同一项目和已有成果；未知写入跨端先读回，不能换端重复生成/修订，不因尚未用完轮询上限而空等。微信小程序必须沿其[当前 Stitch 项目入口](areas/main/screen-contracts/wechat-miniapp.md#stitch-design-authority)及对应 DESIGN/Screen Contract 核实际 ID/标题，不能进入独立原生 App 或同名旧项目。可复用的连接、凭证、输入和未知结果恢复方法由[项目 Skill](../.agents/skills/starward-design-resource/references/stitch-route.md#官方-stitch-cli)维护，版本、实际输出与一次运行异常留资源/任务记录，不写成 Context 执行日志。

- 微信小程序设计稿以 Stitch 为唯一长期资源源。仓库不再重复保存设计 HTML/CSS/JS、导出图、原型及候选包；实现代码、运行资产、授权声明和真实产品验证证据继续由各自 owner 保存。检查所需下载只作临时输入，不成为新的本地设计基线。采用/迁移/清理按下方生命周期执行。
- The owning Screen Contract keeps the current adopted entry, applicable scope and essential confirmed decisions with reasons. One scope has one current basis; an entry may map several nonconflicting page/component/state/theme scopes. Partial adoption replaces only its scope and preserves remaining references. Choosing a direction does not automatically adopt every detail; existing explicit adoption authorization is sufficient.
- When maintaining an adopted entry, put its current scope, editable source, visual/behavior references, shared dependencies and effective partial overrides before historical implementation notes. Link retained history below instead of mixing old “next steps” into the current basis. Reuse the existing entry; do not create a second design authority or rewrite unrelated adopted packages just to reformat them. Historical validation is not current adoption or current product completion.
- 当前项目/节点链接、采用范围、必要主题/状态及共享依赖只在既有 Screen Contract owner 登记；其他 owner 引用该入口。远端 URL 用普通 Markdown 链接，不伪造 `ty-context-controlling-source` 的本地 path，不为满足该语法复制 ADOPTED.md。仍有效的本地产品事实依其真实 owner 保留；候选、历史与运行证据不是设计控制源。沿受影响实现找到 owner，实际读取对应 Stitch 源、行为及画面，不等待触发关键词。
- Screen Contracts own business and interaction meaning; DESIGN.md owns shared visual rules and exact tokens; adopted resources own concrete page composition and assets within their declared scope. Resolve conflicts at adoption by updating the affected owner, rather than keeping competing rules or rewriting requirements to match output.
- **严格按照当前采用资源实现。** 先从所属 Screen Contract 确认 Stitch 项目、节点、范围及状态，实际查看当前画面，并读取对应可编辑源、样式/令牌、资产和行为说明。不能只读标题/摘要、看缩略图，或从本分支旧导出猜最新设计。UI 核对颜色与透明度、字体/字重/行高、尺寸与单位、边距/内距/间距、对齐、圆角/边框/阴影、层级/裁剪、可见面与命中区、安全区及滚动约束；能从源取得的精确值不要靠目测重选。将这些规则映射到目标平台现有令牌、组件及真实消费者，处理 px/rpx、字体和系统区域差异，不把 Web 原型业务状态复制成第二个产品 owner。资源采用本身不证明实现。
- **把 UX 还原为可执行行为。** 从当前原型/行为说明明确触发、起止状态、变换原点/轨迹、时长/缓动、提交时机，以及反向、中断、取消、重复输入和隐藏退出规则。共享交互先映射到现有共同责任，再迁移相关消费者；有限 transform/opacity 等目标平台合适能力优先，不为视觉效果重绘无关主场景。原型没定义的关键行为沿产品 owner 解决，不能用自己想象的动画冒充采用资源。
- **用必要证据核对实际结果。** 以当前采用资源为依据，不以修改前实现或生成近似稿为依据。在可比视口、安全区、主题、字体、内容与状态下查看真实目标输出；按上述 UI 差异修复，并复核受影响部分。UX 按不同机制选代表流程，结合状态/事件结果、起止画面和一次正常速度的实际播放或短录屏，补有风险的快速反向、连点或取消。无需逐帧截图验收、全组合遍历，或每改一处重跑整套；仅新变化、实际失败或具体未决风险扩大验证。关闭动画的截图可以核静态构图，不能证明动画、节流、生命周期或性能。浏览器原型也不能替代 WEAPP/设备结果。
- 源不可访问、内容冲突或平台能力确有限制时明确具体缺口，继续独立工作；不得静默换成近似稿、以目标截图自证还原，或把未验写为通过。必要的平台适配保留设计意图和产品语义，由原 owner 记录决定及范围。产品场景、值和实际证据留各自 owner，不在本通用规则建立另一份设计清单或验收门槛。
- Reuse the Tiny Context development contract in AGENTS.md and applicable implementation skills. Ordinary fixes do not require regenerating resources; update them only when the confirmed design changes. This rule adds no separate development Skill, fixed checklist, historical hash gate or mandatory handoff workflow.

For an authorized adoption, read the packaged Skill's `references/adoption.md`, update the existing entry and owning scope/decisions, reconcile affected DESIGN/Context rules, and repair stale navigation in the same change. Existing registered owners can be edited directly; use manifest registration only for an actual new owner. Retain unmodified scopes and read back the corresponding Stitch source and current links after writing. Apply the continuous-calibration rule below whenever feedback adds a durable fact, including before formal adoption when the user's explicit principle already has a clear scope.

`context:validate` checks explicitly declared local UTF-8 dependencies and supported ownership/path conflicts. It does not access Stitch, open media/prototypes or infer overlapping prose scopes. Resource tasks explicitly check the needed linked files and real outputs; missing current input is a missing constraint, not permission to improvise. Structural checks, actual resource inspection and production verification are reported separately.

## Design resource lifecycle

2026-10-17 用户明确：设计稿长期只以 Stitch 为准，删除仓库中与之重复的资源；本轮云观星最新稿直接采用并清理废案，无需再次确认。此前本地与远端双份长期保存、每轮重新确认删除的规则被本条替代。本节仍是留存/清理的唯一规则 owner。

- **当前源与范围。** 从当前 Stitch 页面/共享组件的完整源增量修改，保留未变区域及必要状态/主题。云观星只覆盖菜单、相关披露、指定红光和入场，星图不覆盖。跨分支同时开发时先核远端现状；本分支旧导出不能回写覆盖其他分支已更新的当前稿。页面功能/数据语义与实现事实继续归原 Context/代码。
- **采用与迁移分开。** 用户已有明确采用授权即生效，不重复选稿。远端对齐须取得实际可编辑内容、相关状态及行为；只上传一张截图不能冒充完整交互源。没有迁出的唯一有效材料先临时保全，具体记录未同步范围和失败，完成迁移后清理，不能称已全部以远端闭合。临时输入不转成新的长期镜像或另一套权威。
- **授权内准确清理。** 明确授权已覆盖删除对象范围时，核实身份、范围和依赖后直接执行，不因历史 Skill 要求再问同一确认。删除前区分当前、待决、共享、废弃与真实运行资产；不能按日期、文件夹名或枚举遗漏推断废案。未授权或可能误伤其他范围才澄清具体缺口。探索中保留必要工作输入，定稿后集中清理已替代源、重复导出、截图及仅服务它们的生成记录；不移到仓库 history/archive/压缩包继续重复保存。
- **保护共享项目。** 远端只删除当前授权且逐项确认被完整替代的节点；本轮云观星以外由另一分支更新，以 Stitch 现状为准，不上传本地旧稿，不改名、不删除其远端页面。读取项目/画板及实际依赖后才判断；工具不能删除或当前源未同步时保具体残留，不用隐藏/归档冒删除。
- **本地与证据。** Windows 默认回收站，先解析核验授权绝对路径；运行代码/资产、来源许可、科学图片和原始产品证据不属于重复设计稿。清理前查 HTML/CSS/JS、生产导入、生成器、预览/校验及当前 Context 引用；保真正产品依赖，退出仅服务废案的检查，不留断链。历史证据仅保结论、身份及其既有证据 owner，不以保日志为由复制造型资源。必要恢复使用回收站或已有 Git 历史。
- **实际完成。** 写入后读回当前远端源，核其可编辑内容和必要交互/状态；删除后读回剩余节点及本地路径，修复当前导航。资源采用、远端同步、本地清理和生产实现是不同事实，分别报告；不建立固定证书、额外审批或重复镜像校对流程。

## Shared component continuity

Public/shared component identification begins during UI/UX and product design, under the [cross-stage rule](../AGENTS.md#shared-components-across-design-and-implementation). Record only affected responsibilities in existing owners, not a parallel global component registry:

- The owning Screen Contract or shared contract records the component's purpose, actual consumers, shared product/interaction states, permitted differences and exclusions. DESIGN owns reusable visual rules/tokens; Stitch owns the editable shared definition, concrete variants/examples and review/adoption scope. Other pages reference that owner instead of duplicating its contract.
- For each affected shared unit, preserve a stable name/key, links to consumers and resources, and the distinction between confirmed semantic decisions and candidate visuals. Material-only components do not acquire content, navigation or domain state merely because multiple pages use them. Product components may own shared semantic behavior when that is their established responsibility.
- Architecture records dependency/data/platform boundaries and material unresolved implementation questions. When implementation is authorized, map the shared design responsibility to the actual source owners and consumers; until then, code mappings are explicitly planned or absent. Code may split/compose these responsibilities and add technical components without changing their adopted semantics. A static design family, a reusable prototype module and a verified production component are different facts.
- Revise shared definitions and affected examples together within scope. Preserve unaffected variants and adoption status; keep generation prompts, experiments and progress outside durable Context. A routine resource edit needs no new schema, mandatory handoff or repository-wide catalogue.

## 持续校准设计系统与用户偏好

设计资源持续增加的价值，是让项目对用户审美和UIUX预期的理解越来越准确。每次获得明确反馈、完成修订或采用页面时，在本次工作内检查是否产生新的持久设计事实；不能只存资源链接或要求下一页照着上一页画。没有新增认识时不制造文档变更。

- 先按[设计概念与范围](product-profile.md#design-concepts-and-scope)分类：UIUX原则、审美偏好、项目视觉风格、设计系统规则、页面/业务决定。不要把审美喜欢解释成可用性定律，不把风格与整个设计系统混称；“已采用”不是客观完成度或通用质量门槛。
- 从用户认可与否定的具体部位、修改前后差异和实际交互中提炼偏好，并明确作用范围：跨页风格/原则、可复用组件规则，或仅本页的内容与构图决定。明确的通用指示可直接作为原则；孤立案例的推断先标为待验证，不凭生成结果或一次整页采用自动提升为全局规则。
- 提炼的是设计选择及其目的、适用条件和边界，不是复述尺寸清单或堆叠“禁止项”。例如用户反复调小计划行和缩短空白，支持信息紧凑但保留清晰层级的偏好；采用一张玻璃卡片说明这种材质在该场景成立，不推出所有卡片都玻璃化。
- 在原有owner更新：产品体验目标与偏好解释写 product-profile.md；视觉风格、材质/图标/排版及通用表达写 DESIGN.md；任务、状态、返回与交互语义写所属 Screen Contract；具体页面构图和可编辑材料在 Stitch 中维护。Skill只承接如何读取、提炼和运用，不能成为另一份偏好事实源。
- 新决定与旧文案冲突时，改写或缩小原规则的适用范围，撤掉已失效的说法；不要持续叠加“例外”使 Context 自相矛盾。保留简短理由和当前采用入口；前后图和试验过程在探索期临时记录，定稿后按资源生命周期清理废案，历史查证使用已有Git历史。
- 下一页使用更新后的原则，并查看相关资源验证如何落地；新反馈继续校准。沿用的是越来越准确的设计判断，而非固定复制同一模板。采用和资源收敛清理时一并检查这项同步，不要求用户再单独提醒“更新设计风格Context”。

这些更新不自动授权批量改动已采用页面、生产代码或其他平台。维护记录和检查通过也不证明审美已符合预期，最终仍以用户反馈与采用决定校准。
