# Starward 微信小程序全量设计资源重生成：工作索引

> 状态：WIP / 非权威 / 未选中 / 不可作为实现或验收 Source。
>
> 用途：为当前 Codex Goal 提供抗上下文压缩的恢复索引、执行方案、审计边界和过程日志。长期产品与设计事实仍只属于 `project_context/**` 与根 `DESIGN.md`；本文件不得覆盖它们。

## G0 — Goal 与硬停点

- 目标：为仓库唯一现有微信小程序实现，严格按已采纳设计系统 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`，重新生成覆盖完整 UI/UX 开发范围的设计资源。
- 初始委托没有独立需求方案；产品、业务、数据、状态、路由和交互语义不得从当前代码或原型反向发明。Owner 后续明确把本任务调整为“DRA 设计资源 → 需求变更 → 设计资源”的循环，并授权 I15、I18、I19、I20 及当前 I21 的审计反馈进入 Surface/Screen/Design Authority；冲突处以后者为准。
- 不修改生产代码或测试。原始“不修改产品逻辑 / Context / DESIGN”边界已被 owner 后续明确指令按已记录范围覆盖：退役旧视觉/可见 version、I15/I18/I19/I20/I21 的产品含义、信息架构和设计系统修订；不得借此扩展到未授权产品逻辑。
- 如果为完成重构需要改变既有 UI/UX（包括信息架构、界面职责、交互、控件、状态、文案层级或设计系统覆盖范围），必须在变更发生前询问用户。I15–I21 已由用户主动提出并授权，无需重复询问；任何超出它们及其直接依赖的新设计取舍仍须先询问。
- 本轮须生成可交互候选、完成独立审计，并按 owner 明确授权直接继续 selection、immutable snapshot、formal handoff、Authority Delta、proposal reconciliation 与 preflight；不再停在候选批准点，但不得因此降低审计强度。
- “全量”定义最终候选的覆盖与一致性审计边界，不等于按 Surface 数量重做若干页面。本轮 revision diff 只包含 I21 的 13 项及其直接依赖，current cumulative authority冲突处以I21为准；五个 stable Product Surfaces、完整 material Control inventory及其主题/状态/响应式/无障碍/动效仍必须可审计，且不得回流被退役的页面、组件或视觉逻辑。
- **当前终点**：DRA accepted-direction freeze + formal selected Web/App handoff + successful `ty-context design-resource preflight`。Production implementation、production build/test与运行时验收仍不在本轮。

## I0 — 恢复顺序

上下文压缩或跨回合恢复时，按以下顺序恢复，不得只凭本文件复制产品事实：

1. 读取当前 Goal objective，并核对本文件 G0、I0–I21 与 P0–P8；I14 覆盖 Goal objective 中不可编辑的旧 I6/I13 表述，I15–I21 覆盖“不新增需求 / 不改 Context、DESIGN”旧边界，I17 纠正“按 Surface 数量重做界面”的错误表述。
2. 读取根 `DESIGN.md` 的 `#wechat-mini-program--sky-canvas-field-signal` 及其 Mini Program adoption record。
3. 读取 I2、I3 的 Product Surface / Screen Contract 及其子节点。
4. 读取 I5 的 exact-value base 与 current component/layout Source；先前 Map/Finder、review-directed 和 I6 资源只作旧输入泄漏哨兵，不得读取为 current constraint 或 fallback。
5. 读取 I7、I8 已选 Skill；I21 owner 已明确授权候选审计后直接进入下游，因此只在方向实际选择后读取 Authority Delta 与 formal selected Web/App handoff 条件分支。
6. 核对 L0 过程日志、B0 阻塞/决策、R0 资源 disposition，再从最后一个未完成阶段继续。

当前完整 provider commission：`artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/commission-brief.md`。它是 task-local 非权威输入，必须与本索引及 controlling Sources 一起使用。

已完成的 publication 同步计划：`artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/provider-publication-sync-plan.md`。当前一次性正文同步计划：`artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/provider-current-body-sync-plan.md`；其执行前快照为 `provider-current-body-pre-mutation-manifest.json`。

已关闭的决策边界：`artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/DECISION_REQUIRED.md`。用户在收到其精确范围后回复“继续”；它记录授权事实，但不是设计 Source。

## I1 — 唯一视觉权威

- 当前 stable target key：`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`。
- 唯一 exact-value owner：根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal`。
- Open Design design-system ID：`user:starward-mini-program-sky-canvas-field-signal-revision`。
- 已审查的系统项目：`ds-starward-mini-program-sky-canvas-field-signal-revision`。
- 冲突规则：任何旧页面资源、实现、截图或 provider 输出的视觉值与 I1 冲突时，一律以 I1 为准。
- 当前视觉基调必须完整继承 I1：温暖中性 day、近黑中性 night、严格黑/暖红 observation；四层留白比例；排版、焦点、switch、控件层级、卡片、组件分类、移动端适配、安全区、触控和减弱动效约束。
- Current component/layout Source：`docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md`，SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`。它在同一 stable target 内拥有 one-document panel extents、presence-driven media/handle band、short/flush rails、raised draggable arrowless ruler、compact continuous Search、one bottom-presentation enum、pale active state、one three-state celestial mode track、colored-icon compact My、cell-based compact Contribution intake与reuse-first library/component/adaptation binding；不是第二套设计系统。
- 先前 Map/Finder Source `b4cd506d...`、review-directed Source `c38f599e...`、Map/Search/panel Source `52104dfa...`、fullscreen-density-motion Source `c3f69445...`、compact-continuity Source `07f7fa28...`与unified-flow-modes Source `0f59ead2...`只保留 immutable audit provenance；不得参与 current generation、兼容布局或 fallback。
- 当前根 canonical section SHA-256 为 `086088d3f54d4bcede978fa0d4c09002bd8660dab0294536106b8e8459f706fa`（57,582 chars / 85,819 UTF-8 bytes）；Provider composed body=`53eaac22d20d7b2a3b2bd501c1199558f9601d1afc5ed611d4e5ef7518c8a99d`（57,631 chars / 85,870 UTF-8 bytes）；Commission=`79266ec6a6f98bfb60c1197226a196e70748cc1391674735ccb20f835a48f4d8`。更早digests只描述被后续需求替代的输入。

## I2 — 产品与 Surface 权威

- `project_context/global.md`
- `project_context/areas/main.md`
- `project_context/areas/main/product-surfaces/wechat-miniapp.md`
- Mini Program 五个稳定 Product Surfaces：
  - `miniapp-map-discovery`
  - `miniapp-sky-orientation`
  - `miniapp-my-library`
  - `miniapp-profile-content`
  - `miniapp-contribution-intake`
- 主导航只有 Map / My。Map 内有 `spot/search` child 与三档观星点信息 panel；`sky/detail` 是从 `云观星` 进入的唯一 full-sky child。`spot/detail`、`spot/sky`、`sky/professional`、`sky/targets` 已退役；不得从原型扩展其他产品面或 peer route。

## I3 — Screen、Control、状态与恢复权威

- 根 Screen Contract：`project_context/areas/main/screen-contracts/wechat-miniapp.md`
- 细分权威：
  - `project_context/areas/main/screen-contracts/wechat-miniapp/surfaces-and-controls.md`
  - `project_context/areas/main/screen-contracts/wechat-miniapp/map-and-finder.md`
  - `project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md`
  - `project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md`
- 完整 material Control inventory（重复 row/marker 复用 family key，不另造语义）：
  - Shell/shared：`mini-primary-navigation`、`display-mode-switcher`、`data-source-disclosure`、`notification-feedback`、`page-state-recovery`。
  - Map/Search：`map-search-entry`、`spot-search-shell`、`spot-search-field`、`spot-search-query-overlay`、`spot-search-filter-group`、`spot-search-filter-choice`、`spot-search-result-list`、`spot-search-result-card`、`map-location-control`、`map-analysis-focus-layer`、`map-layer-selector`、`map-time-control`、`map-marker-panel-coordinator`。
  - Spot information panel：`map-spot-information-panel`、`map-spot-panel-handle`、`map-spot-panel-section-nav`、`map-spot-panel-action-bar`、`spot-favorite-action`、`spot-share-action`、`spot-cloud-stargazing-action`、`spot-media-gallery`、`spot-navigation-action`、`spot-contribution-entry`、`spot-route-summary`、`spot-facility-evidence`、`guide-article-viewer`、`sky-professional-matrix`、`sky-target-list`、`sky-time-scrubber`、`sky-map-canvas`。
  - Full-sky：`sky-orientation-canvas`、`sky-orientation-sensor`、`sky-orientation-recovery`、`sky-orientation-object-list`、`sky-orientation-time-ruler`。
  - My/library：`my-account-header`、`my-settings-action`、`my-profile-summary`、`my-grouped-entry-list`、`my-plan-entry`、`my-contribution-entry`、`plan-editor`、`settings-form`。
  - Profile/content：`profile-link-editor`、`profile-link-open-copy`、`import-source-rights`、`import-draft-editor`、`import-spot-association`、`import-preview-submit`。
  - Contribution：`contribution-kind-control`、`contribution-spot-context`、`contribution-topic-control`、`contribution-observed-at`、`contribution-location-consent`、`contribution-media-upload`、`contribution-submit`、`contribution-status-list`。
- 当前总数为 **62**：Shell/shared 5 + Map/Search 13 + Spot information panel 17 + Full-sky 5 + My/library 8 + Profile/content 6 + Contribution 8。该总数仅用于完整性核对，Control keys 与 owning category 才是权威；`source-lift-focus-layer`、`map-analysis-time-bar`、`spot-tonight-decision`、`observation-mode-control`已退休，重复row/marker不重复计数。
- 状态轴必须从上述 Screen Contract 完整投影，至少包括：冷启动、loading、empty、success、partial、stale、error、offline/recovery；适用的 permission/calibration/accuracy/unavailable/retry；Search editing/suggestions/results；unified multi-select selected/unselected/rapid retarget；panel hidden/small/medium/large/dragging/settling；登录/权限/上传/审核；day/night/observation；reduced-motion/transparency；screen-reader/keyboard/focus；100%/200% text。

## I4 — 技术 substrate 与实现边界

- `project_context/architecture.md`
- `project_context/areas/main/implementation-index.md`
- `project_context/development-workflow/authority-and-scope.md`
- 微信小程序代码 owner：`apps/wechat-miniapp/**`。
- route roots：`apps/wechat-miniapp/src/pages/**`、`src/spot/**`、`src/sky/**`、`src/content/contribution/**`。
- shared components：`apps/wechat-miniapp/src/components/**`。
- token adapter：`apps/wechat-miniapp/src/styles/**`。
- shared contracts：`packages/miniapp-contracts/**`。
- BFF：`workers/miniapp-api/**`。
- 交互原型是设计资源，不是 Web/H5 产品 route，不得据此新增 Web 产品面。

## I5 — 当前不可变设计系统 Sources

- 包：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/**`。
- canonical selected source：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`。
- canonical SHA-256：`a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。
- complete manifest SHA-256：`d719dd753422112c4759cd77d0d9da3b7d40d5dd87b38fd3d327835f739f8bde`。
- package digest：`253fbcbfaa083aa897eca2faf5e4eb6f3b99e69da7f485d485f89881adcc8276`。
- source-index SHA-256：`727114ee2f72f6a68a8bd0d25c4d20470ae8b0d6a0ff2bcff6d0067e367543c1`。
- 该 base 是 exact-value foundation；其旧页面 specimen 只作 foundation evidence，不拥有 current route/composition。
- Current component/layout Source：`docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md`，SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`。
- 先前 `miniapp-field-signal-map-finder-ui`、`miniapp-field-signal-review-directed-components`、`miniapp-field-signal-map-search-spot-panel`、`miniapp-field-signal-fullscreen-density-motion`、`miniapp-field-signal-compact-continuity`与`miniapp-field-signal-unified-flow-modes`只作 historical audit provenance；其冲突Search/panel/layer/ruler/density/mode/form表达不得进入新候选。
- Exact-value base + current component/layout Source 的 composed interpretation 只由根 `DESIGN.md` 拥有，不构成第二 token truth。

## I6 — 已退役页面/交互 resource（禁止作为当前输入）

- key：`target-miniapp-sky-canvas-current-constraint`；2026-09-02 owner instruction 已将其从当前 `constraint` 退役为 historical evidence only。
- former canonical entry：`docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/miniapp-entry.html`，SHA-256 `3da0696143dcd647869a4d8d0710e477c8f94a2309e00fcf4d2f0a5eaff4b1f2`。
- former immutable handoff：`docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/technical-binding-2026-08-29-compass/handoff/miniapp-sky-canvas-current.md`，SHA-256 `17288e6ccc7092a5be6b1ea3bfc0ad73d0b7bea893b0e0bf1ffdc7c172426834`；Fact manifest `78e569a26f268454ae968bf715ecec37d6dfa23af01b33b72479973e2f4ae3bb`；feasibility `48468b55e0f95fd50941761b4a7fb5dc0e39de244da6055281617bb671ff9875`。
- 用法：只用于识别并阻止旧输入泄漏；不得作为 `exact-target`、constraint、inspiration、layout/interaction scaffold、editable upstream 或 current-implementation substitute。当前构图、交互、Control、state 与 accessibility 只从 I2/I3 重建，视觉只从 I1 投影。

## I14 — 2026-09-02 owner override：single-current / no-version

- 新生成资源不得保留旧设计系统、旧页面 constraint、兼容 UI、旧布局/组件/动效/交互呈现或 old/new 双轨；I14 覆盖本 Goal objective 中旧的 I6 preserve 表述以及 I13 中“复用当前页面约束”的旧结论。
- 旧 immutable selected/audit files 不物理删除，只因 Harness traceability 要求隔离保留；它们不是当前 input、fallback、inspiration 或 rollback UI。
- 当前产品、业务、数据、权限、安全、route/state 与技术逻辑仍由 I2/I3/I4 保持，不因“不要旧逻辑”而删除产品语义。
- 产品界面、候选标题、设计文案、导航、specimen 和 ordinary review labels 不写 `version`/`vN`/日期/revision/`旧版`/`新版`；内部 target key、protocol version、日期路径与 digest 仅作治理，不进入可见 UI。
- Map/Finder 授权已关闭：用户在精确边界后回复“继续”；I1/I5 已新增 app-owned Map/Finder visual slice。任何更广 UI/UX 改动仍须重新询问，I6 永远不能回流。

## I15 — 首轮候选审计反馈与授权迭代范围

- 流程解释：owner 明确当前处于“DRA 设计资源 → 需求变更 → 设计资源”循环。首轮候选未通过；不得选中、冻结或进入 downstream handoff。先把本节的 durable 产品/Surface/Screen/Design 含义写回正确 owner，再用更新后的 current authority 对同一全量候选中的 11 项反馈影响范围做 material revision；六 Surface 仍是交付覆盖而不是本轮全量重做范围。最后再次停在 Design Resource Review & Selection Stop。
- 地图页：参考用户附件图 2/3 的高德地图交互拓扑但不复制其品牌视觉。地图作为上半部/背景主对象，地图自有操作以悬浮图标留在地图上；下半部由可上拉的 Finder Sheet 统一承载搜索框、快速条件、更多条件、想去观星点和其他观星点列表。点击 Sheet 或向上拖动展开；快速条件与更多条件属于同一过滤系统并统一样式，不能继续表现成两个拼接模块。
- 图层：参考用户附件图 10 的“地图上紧凑多层控制”交互启发，但只显示 Starward 当前实际支持的少量图层；设计应克制、清晰、高级，不复制图 10 的密集视觉，也不得发明新图层能力。
- 选中条件：增大选项容器，降低文字相对占比；active 状态的装饰星形须在右上角露出约半个，不能完全隐藏，也不能因为 active 导致控件长度跳变。
- 通知反馈：修正提示窗口滥用。普通选择、切换、展开、导航和可由局部状态直接看见的结果不弹 toast/snackbar/modal；只在确有异步结果、错误、风险/权限、不可见持久化确认或恢复动作时使用合适反馈，且优先 inline/stateful feedback，避免屏幕阅读器播报洪泛。
- 收藏：`spot-favorite-action` 的动效与反馈保持当前生产实现，不重新设计；设计资源只准确表达其现有状态与动效约束。
- 产品文案：设计资源中移除所有“演示数据”、fixture、demo 或类似说明；设计稿中显示的字段和内容即产品需要展示的正式信息结构。不得把内部数据来源说明、调试脚注或原型免责声明当产品 UI。
- 今晚出发窗口：补充与具体天文现象的关联（例如流星雨）、该现象的关键时间和当前推荐窗口为什么满足条件；这是 owner 明确授权的产品含义补充。UI 只保留一个连贯可视化时间条/刻度区来表达候选窗口、最佳窗口、当前/到达等关键点，不再同时堆叠独立条形图与三列表格形成重复、四不像的信息结构。具体字段与条件必须先从现有 Source/数据能力及有界调研闭合，不由 Provider 自行发明。
- Spot Detail：修复图 7 所示点击分段项后页面跳到顶部的原型 bug；若该分段控件因内容结构调整而不再需要，应由更新后的 Screen authority 明确移除，而不是仅隐藏。
- 今晚夜空：移除信息量不足的 `sky-summary-tabs` 分段切换；概览、专业信息和目标直接按一个清晰的纵向信息层级连续列出并允许自然滚动，避免为每个只有少量内容的类别增加切换成本。
- 方位天空：以全屏、随设备姿态连续转动的星空为主对象；方位/传感器说明、状态和其他 chrome 尽可能压缩为不遮挡天空的紧凑层。可见天体直接标注在星空中，不再以下方重复列表为主要表达；带刻度的时间轴置于靠下位置，使用受控透明度，仍须有 reduced-transparency/observation 可读回退。是否可行在本轮只做微信小程序设备姿态与交互边界调研，不扩展为天文计算或生产实现方案。
- 时间轴：`sky-time-scrubber` 及相关地图/天空时间控制改为有清晰主次刻度、当前时间、可触达拖动/键盘语义和可读值的刻度时间轴；保持时间在 Map / Detail / Night / Orientation 间同步，不引入新时间业务规则。
- 设计系统：上述可复用改变必须进入当前唯一设计系统及其 adopted target/component-family 解释，不建立旧/新双轨，不保留旧视觉 fallback，不写可见 version/date/revision 标签。任何只属于具体 Screen 的产品职责/交互仍写入 owning Context，不塞进 `DESIGN.md`。
- 附件角色：图 1/4–9 是首轮候选的 current-candidate evidence；图 2/3/10 是 inspiration，只授权所述拓扑/交互方向，不构成 exact-target，也不授权复制第三方品牌资产、地图底图、图标或视觉 token。

## I7 — Design Resource Authoring 流程

- 主 Skill：`.codex/skills/design-resource-authoring/SKILL.md`。
- 当前已读取并适用：
  - `.codex/skills/design-resource-authoring/references/resource-selection.md`
  - `.codex/skills/design-resource-authoring/references/open-design-provider.md`
  - `.codex/skills/design-resource-authoring/references/implementation-feasibility.md`
- 用户通过候选后才按条件读取：
  - `downstream-handoff.md`
  - `authority-delta-assessment.md`
  - `formal-selected-web-app-handoff.md`
- 当前 intent：style-bearing、interactive prototype、完整 Mini Program UI/UX resource recovery / regeneration；先探索与候选 handoff，不自选。

## I8 — Starward 交互实现 companion

- `.codex/skills/uiux_design/SKILL.md`
- `.codex/skills/uiux_design/references/react-native-interaction-contract.md`
- 仅提供手势、press feedback、Bottom Sheet、可中断动效、haptics、safe area、accessibility 与工程检查 companion；不得覆盖 I1–I3。微信小程序平台差异需落回 Mini Program substrate，不复制 React Native API。

## I9 — Provider 与正式生成要求

- 首选已有 Open Design 0.21.1 structured daemon/canonical project 能力。
- 任何 style-bearing 正式首轮生成必须实时证明：
  - 设计系统的 canonical `od://design-systems/<id>/DESIGN.md` 可读；
  - 新 bounded task project 绑定 exact `designSystemId`；
  - `project.designSystemId` 读回一致；
  - provenance 可检索；
  - `highest_available_capability + highest_supported_reasoning_effort` 有 provider-local 可证明选择依据。
- 不安装 provider/plugin，不修改全局配置或认证，不新增数据披露路径；若现有可用能力无法满足，失败必须如实分类，不能伪装成正式 provider run。
- 直接 agent 仅在同等 canonical、绑定、provenance 与能力选择可证明时才是 fallback。

## I10 — 完整范围与显式排除

- 覆盖 I18 当前五个稳定 Surface、I3 完整 Control inventory、day/night/observation；这是全量资源覆盖，不是按五个页面机械重做。
- viewport / adaptation：320、375、390、430 CSS px；750rpx；top/bottom safe area；200% text；portrait Mini Program primary target。
- 覆盖适用的 selected、pressed、focused、disabled、loading、empty、partial、stale、error、offline、permission、reduced-motion、screen-reader/keyboard 状态。
- 排除：native App、owner-operations、I15/I18 之外的产品逻辑、业务规则、数据算法、API/schema、持久化、部署与 release。
- 地图边界：I1/I5 已覆盖 app-owned floating Search、dedicated Search/filters/results、controls/marker/panel/rails/legend 的当前视觉；I3 拥有产品/交互语义。Map provider/basemap/tile/road/terrain/satellite/native-map/legal chrome 外观仍排除，候选只能提供 provider-neutral 承载，不得伪造第三方底图。

## I11 — 最小充分资源集合

- 优先生成一个可交互、机器可读、综合的 canonical prototype，覆盖各页面、状态、模式、响应式和共享组件族。
- 不为每个控件机械生成重复图片；不把静态 PNG、截图或 mock 当正式 handoff。
- 可有少量必要 supporting resource（例如状态索引或设计系统映射），但必须有独立决策价值，不得成为第二 token/UI truth。
- 代表性 fixture 只在设计资源外部元数据、coverage 或 README 中声明；用户可见的设计资源 viewport 不得出现“演示数据”、fixture、demo、版本或审计免责声明。画面中的字段与信息结构视为正式产品结构，但候选数值仍不得被声称为实时生产事实。

## I12 — 禁止捷径

- 候选不得自选、不得覆盖既有 selected immutable source。
- 不得把 provider success、截图相似、preflight 或静态审阅当作设计验收或 production conformance。
- 不得让 implementation、fixture、截图或候选 CSS 成为产品或 token 权威。
- 不得漏掉用户审计停点，不得在用户通过前进入 downstream handoff / adoption。
- 不得为“完整”而添加旧视觉、第二套 token、第二 UI system、重型依赖或越过 owner 的规则。
- 不得把无法验证的状态、设备、动效、无障碍或像素一致性报告为已建立。

## I13 — Architecture Deliberation / Build-Reuse-Buy

- Affected owners：Open Design task project + repo-local candidate snapshot；visual truth=I1；Surface/interaction truth=I2/I3；current composition constraint=I6；technical substrate=I4。
- 当前 extension point/source of truth：新建 bounded all-resources prototype project，绑定现有设计系统；不编辑系统项目，不复写旧 selected source。
- State/lifecycle boundary：本轮只创建普通 design Source；不会改变 app runtime、route/state store、API、账号、上传或设备 lifecycle。
- Selected design：复用当前 Field Signal system，但不复用已退役页面/交互 resource；从当前 Product Surface / Screen Contract 重新投影一个 single-current 综合交互候选，审计后再决定是否选中。
- Material alternatives：
  - 允许：复用现有 Open Design canonical 能力、当前 I1–I4 Source；在同等 canonical/绑定/provenance 被证明时使用直接 agent fallback；必要的 repo-local non-authoritative snapshot。
  - 不选：编辑 system project；覆盖旧 selected package；按页面生成互相漂移的孤立稿；引入第二套 UI framework/token truth。
- Future-change challenge：未来设计系统或 Map provider 能力变化时，候选必须可以通过稳定 target/system binding 与 Surface/Control keys 重新投影，而非从截图返工；provider/basemap 变化不得反向改写 app-owned chrome。
- Debt disposition：Map/Finder 产品 UI 的视觉空缺已由 owner 授权的 immutable slice 闭合；provider/basemap/native-map 外观继续作为明确的外部边界，不在本轮发明或模仿。
- Quality preservation：
  - correctness/invariants：完整保留 I2/I3 semantics、single selected time/spot/filter truth、no product logic delta；
  - maintainability/changeability：一套 visual Source + 一套 Screen/Surface Source，候选只作投影；
  - reliability/resource lifecycle：原型不得假装设备/网络/上传成功，状态必须显式；
  - security/privacy/safety：不引入真实用户数据、token/cookie/精确位置或 EXIF；contribution/import 权限语义不弱化；
  - compatibility：保留唯一 WEAPP route/state owner；原型不是新 Web route；
  - performance/capacity/cost：本阶段不作生产性能声明；仅约束候选资源规模为最小充分集合；
  - accessibility/operability/testability：触控区、焦点、读屏、200% text、reduced motion、恢复入口与状态索引进入候选审计。
- Context Delta：`required`；owner 授权改变了 durable Design Authority 的 Map/Finder 视觉适用范围，已更新最小 owning Context。产品/业务/数据/route/state meaning 未改变。

## I16 — I15 范围变化后的 Architecture Deliberation refresh

- Affected owners：根 `DESIGN.md` 与 I15 新增 immutable component/interaction Source 共同组成唯一 Design Authority；`product-surfaces/wechat-miniapp.md` 与 Mini Program Screen Contract children 拥有产品表面、Control、状态和恢复语义；现有 Open Design system/project 只消费这套 Source；生产代码与测试本轮不改。
- Current extension points / truth：视觉值从 I1 组合闭合；Map/Finder、Detail、Spot Night 与 Orientation 的稳定职责从 I2/I3 闭合；天象、`ObservationWindow`、`SkyOpportunity`、`SkyTarget` 与 `METEOR_SHOWER` 继续来自现有 contracts/BFF，不另建算法或第二状态真相。
- Selected design：先更新同一 current 设计系统及 owning Context，再通过 supported provider API 同步 exact composed body，最后在同一个 bounded 全量 DRA project 内仅 material-revise I15 的 11 项反馈影响范围；六 Surface 保持完整可审计，未受影响部分不得被重新构思。首轮候选只作为 rejected evidence 和差异基线，不能回流冲突表达。
- Material alternatives：
  - 允许且选择：复用当前 Open Design canonical provider、同一 system/project、现有天象/窗口语义、当前生产 Favorite ritual，并新增有界 immutable component source。
  - 允许但本轮不选：直接 agent 生成，仅当 Open Design 无法维持 canonical/binding/provenance 且可证明同等能力时作为 fallback；未来生产实现另走 selection 后流程。
  - 不选：只补候选而留下 Authority 过时；复制高德/天气应用品牌视觉；为图层面板发明卫星/交通/雷达等不存在能力；为窗口发明评分或天文算法；保留旧系统/旧候选双轨；用可见版本或 demo 标签解释内部 provenance。
- State/lifecycle boundaries：Finder 保持 `closed | peek | expanded` 但默认 `peek`；全屏方位天空只用前台短生命周期 device pose 改变呈现，不持久化姿态轨迹；selected time/spot/filter 仍各有一个既有 owner；本轮只生成设计 Source/候选，不改变 runtime、API、schema、账户、上传或部署。
- Future-change challenge：若将来确有更多 Source-supported 地图层或观测目标，紧凑 rail/窗口组件按有界数据集扩展；当前不得用假选项预留容量，也不得把视觉组件变成业务真相。
- Debt disposition：根 Authority 中“设计稿必须显示演示数据”、generic slider、稀疏 tabs、通知泛用与收藏近似描述已被本轮 source 修正；生产现状仅 compass-follow、未实现 alpha/beta/gamma 全姿态 Canvas 的差异记录为 selection 后 implementation drift，本轮不得声称已实现或已做真机性能验证。
- Forbidden shortcuts：不得跳过 Context/Design owner 直接改候选；不得编辑或覆盖旧 immutable sources；不得把第三方截图当 exact target；不得让 provider 默认审美、候选 CSS 或实现反向拥有 token/产品规则；不得在修订候选获用户通过前读取 DRA downstream references。
- Project-owned checks：Authority 稳定后运行 `npm run design:system:verify`、`npm run design:lint`、`make validate-context`、`make validate-harness` 与 `git diff --check`；provider 同步后核对三路 exact body/hash/binding；候选完成后再做静态 coverage 与 Browser 路径/viewport/theme/a11y/motion 验证。
- Quality preservation：
  - correctness/invariants：一套视觉/语义 owner，保留 single spot/time/filter/window truth，事件窗口只展示既有 Source；
  - maintainability/changeability：稳定 component family + Control key 投影，删去无职责的 `sky-summary-tabs` 而不造占位 Control；
  - reliability/resource lifecycle：传感器 denied/calibrating/stale/unavailable 仍有真值恢复；Sheet/segment/scroll 返回语义显式；
  - security/privacy/safety：姿态流只前台短生命周期使用且不持久化；不引入真实位置、账号、媒体或凭据；
  - compatibility/migration：保留现有 WEAPP routes 与上下文绑定；设计候选不是新产品 route；
  - performance/capacity/cost：仅证明交互可行，真机帧率/功耗/传感器质量留作 selection 后设备验证，不作生产声明；
  - accessibility/operability/testability：44px hit region、非颜色状态、连续文档语义、读屏/降级对象列表、reduced motion/transparency、200% text 与可校验刻度进入候选验收。
- Context Delta：`required`。I15 明确改变 durable information/action/feedback ownership 和组件契约，正在先更新 Design Authority 与 owning Product Surface/Screen Context；生产实现保持不动。

## I17 — Owner 对本轮修订范围的纠正

- Owner 纠正“按新系统重做全部六个界面”的表述：本轮具体执行对象就是 I15 的 11 项反馈，不授权把六个界面重新设计一遍。
- `all-resources` 继续表示候选资源集完整、六个 stable Product Surfaces 与当前 material Control inventory 都可访问/可审计，且全局不得出现旧设计系统、旧逻辑或可见 version；它不是扩大 revision diff 的理由。
- Provider 必须以首轮未通过候选为差异基线，只替换 11 项反馈涉及的布局、组件、信息结构、反馈和交互；未受影响部分保持现有结构与行为，仅做 current design-system 泄漏/一致性检查。
- 若落实 11 项反馈时发现必须改变未列出的 UI/UX，仍按 G0 在变更前询问 owner，不得把“全量覆盖”解释为隐式授权。

## I18 — 2026-09-03 第三轮需求变更与当前生成范围

- 流程继续为“DRA 设计资源 → 需求变更 → 设计资源”。上一轮候选转为 rejected evidence；不得选择、冻结或进入 downstream handoff。必须先更新 Product Surface / Screen Contract / Design Authority，再在同一个 bounded Open Design task project 中 material-revise 全量候选，完成审查后重新停在 Design Resource Review & Selection Stop。
- 地图搜索：删除 Map 下半部 Search/filter Sheet。Map 只显示一个固定悬浮 Search field；点击后进入新增 `spot/search` child。Search page 参考附件中通用地图搜索页的空间比例但不复制品牌/底图/图标，拥有 field、统一 filters、`想去`/`其他观星点` results；filters 视觉更小、更紧凑。
- Filters：不分 quick/more，全部为同一个即时提交 multi-select group，无 draft/apply/revert。每个 capsule 的 prefix 加对应 semantic icon；文字正常排布，不为 star 留位。Selected star 为更大、圆润、淡黄色、半透明、可与 trailing 文字重叠的 absolute ornament，选择与取消都有明显、可中断、reduced-motion-safe 动效，几何不跳变。Icon 优先经现有 `SemanticIcon` 使用本地化 Lucide ISC 子集；天文/selected-star 特有几何由项目资产生成，禁止完整第二 UI system。
- Result cards：卡片稍加宽并占满 content column；有合法图片时图片 cover 整张卡背景，左侧固定宽 text field 使用更高不透明度的 mode-correct readability layer，不能影响文字阅读；无图时同 geometry 使用 solid surface。整卡是唯一选择动作，删除右侧“选择”。
- Time ruler：替代线性 `Calibrated Time Scale`，改为 `Curved Time Ruler`。Fixed center tick 最大最清晰；两侧 tick 沿浅弧连续变小、变淡，track 可左右拖动并 snap 到真实离散时间片。Map、panel astronomy、Orientation 共用一套 component family 与 committed time owner；不得插值伪造数据，horizontal gesture 与 panel vertical drag 要 direction-lock。
- Spot information panel：Map 新增 `map-spot-information-panel`，`visibility=hidden|visible` + visible `small|medium|large` 三档，可竖向拖动。Marker/returned result 直接向上弹出 small；点击非 marker map space 向下隐藏。Large 才显示 top media 且不显示 Search；large 向下拖动时 media 先 fade out、随后 Search fade in，layer trigger 按阈值直接出现。Panel 连续拼接 `基本信息 → 天文信息`，取代 standalone `spot/detail`/`spot/sky`，同时退役 `sky/professional`/`sky/targets` route。
- Panel rails：右侧固定 vertical pill 只有 icon+label 的 `概览`、`天文`；必要时先展开 large，再 smooth-align 到 document top / astronomy heading，不能修改 outer scroll 或跳页面顶部。底部 fixed pill 只有 icon-labelled `想去`、`分享`、`云观星`；Favorite 保持 current ritual，Share 不泄漏 precise location/sensor/unpublished metadata，Cloud Stargazing 进入唯一 `sky/detail` full-sky child。
- Density：全应用改为 compact-but-clear 信息层级，重点吸收通用地图产品“小字但清晰、内容密而不乱”的原则。Exact authority：conclusion 22/31、page 20/28、section 16/23、body 13/20、compact/meta 11/16；320/375/390px page inset 24rpx、430px 32rpx；保持 ≥88rpx hit target，依靠 baseline/divider/icon/spacing 而非每项一卡或机械缩放。200% text 必须 reflow。
- Prior I15 保持：notification restraint、现有 Favorite ritual、viewport 不出现“演示数据”、event-linked single opportunity rail、full-sky sensor-follow canvas、真实 source/freshness/partial/error recovery。冲突优先级：I18 的 Search page 替代 I15 Finder Sheet；I18 overlapping translucent star 替代 I15 half-clipped non-overlap star；I18 Curved Time Ruler 替代 linear calibrated scale；I18 panel merger/route retirement 替代 standalone Detail/Night 与 segment bug repair。
- Attached images：本轮图 1/2/5 是 rejected-candidate evidence；图 3/4/6–10 是 topology/density/motion inspiration。不得复制高德品牌、地图视觉、专有 icon/token/功能或图片内容。

### I18 Architecture Deliberation refresh

- Affected owners：I2/I3 当前 Surface/route/Control/state responsibility；I1 exact visual system；Open Design task project + repo candidate；production code/tests 不在本轮。
- Current extension point：root `DESIGN.md` + immutable current component/layout Source；existing `SemanticIcon` adapter；Taro `ScrollView`/pointer primitives；one Map/spot/time/filter/favorite truth。
- Selected design：五 stable Surfaces；`miniapp-map-discovery` 包含 Map、Search child 与 spot panel；`miniapp-sky-orientation` 只含 `sky/detail`；My/Profile/Contribution 保持。Panel hidden + three extents；custom curved ruler；local Lucide subset via adapter。
- Allowed alternatives：existing adapter + mature lightweight compatible icon paths；bounded project asset/self-implementation；existing Taro primitives；intentional non-abstraction。Selected：Lucide subset for generic icons, project geometry for rounded star/astronomy, self-authored curved ruler because available RN ruler examples do not satisfy Taro/WEAPP + curved/tapered semantics.
- Prohibited failure modes：full second UI system, runtime remote icons, per-screen icon truth, Finder/Detail/Night compatibility path, duplicate time/filter/spot store, fake layer/astronomy fields, gesture transfer mid-stream, share of sensitive state, old candidate/style fallback, visible version/demo/reviewer copy.
- Future-change challenge：new Source-supported filters/layers/targets must extend existing semantic families and real domains; panel/ruler cannot become business truth or preallocate fake options.
- Debt disposition：retired routes/control keys are explicitly current drift to remove only in later implementation; this design-resource cycle does not edit production. Previous Finder/Detail/Night sources remain audit bytes but are removed from current composed dependencies.
- Quality preservation：correctness via one owner for selection/time/filter/window; maintainability via stable component families/Control keys; reliability via explicit panel/sensor/request cancellation and recovery; privacy via share/location/pose boundaries; compatibility via explicit route migration; performance claims deferred to WEAPP/device; accessibility via 44px targets, named icons, direction-lock alternatives, 200% text, reduced motion/transparency and semantic lists.
- Project checks before provider generation：`npm run design:system:verify` and `make validate-context` passed on the new authority; remaining design lint/harness/diff checks run after candidate-bearing Source stabilizes.
- Context Delta：`required` and completed for the bounded I18 responsibility change; production implementation remains untouched.

## I19 — 2026-09-03 第四轮需求变更与当前生成范围

- 流程仍为“DRA 设计资源 → 需求变更 → 设计资源”。I18 候选未通过并立即转为 rejected evidence；不得选择、冻结或进入 downstream handoff。本轮必须先把以下 14 项写入 owning Product Surface / Screen Contract / current Design Authority，再同步 Open Design current system/commission、material-revise 同一个 all-resources candidate，完成真实交互审计后重新停在 Design Resource Review & Selection Stop。
- 1 / 大尺寸 panel：`map-spot-information-panel` 的 `large` 变为真正 page-like full-screen extent，覆盖普通 Map chrome 与主导航；组件顶部直接对齐设备内容区并避让系统 safe area，不再保留旧的 `safe-top + 96rpx` 空档。合法图片位于 panel document 最上方；无合法图片时 media region 完全不存在、后续内容立即上移且不保留占位。屏幕左边缘向右返回手势和 panel 上沿/handle 向下拖动均执行 `large → medium`，不退出 Map、不清除 spot selection；两条手势都有具名非手势替代。上沿 handle 采用安静中性、固定几何，pressed/selected 不改变位置。
- 2 / scrollbar：移动端任何 scroll owner、内部列表、技术矩阵、panel、Search、My、full-sky ruler 与 prototype phone viewport 均不得显示纵向或横向 scrollbar chrome；必须保持真实滚动、键盘与读屏能力，不能以 `overflow:hidden` 禁用内容滚动来达成。Taro/WEAPP 优先 `ScrollView enhanced + showScrollbar=false`，H5/prototype 同时使用标准 scrollbar hiding declarations。
- 3 / media absence：所有可选图片遵循 content-presence layout；无图就不渲染 media container、占位图、空白 block 或固定高度。只有 loading 且真实请求存在时可短暂使用与最终媒体几何一致的 skeleton，empty/invalid/rights-unavailable 直接收起。
- 4 / section rail：`map-spot-panel-section-nav` 固定于当前可见 panel/viewport 的竖直中点，`top:50% + translateY(-50%)`，并持续避让安全区、底部 action bar 与键盘；点击 active item 只移动 document/indicator，不改变 rail 或 handle 几何。
- 5 / bottom action bar：`想去 / 分享 / 云观星` 文案保留，visual surface 改为紧凑 `72rpx`、interaction lane `88rpx`、icon `28rpx`、label `20–21rpx` / 14–15rpx line，内部 gap `2–4rpx`；三个目标仍各自 ≥44px 且不重叠。禁止以 oversized icon、厚 pill、大 padding 或粗字模拟重要性。
- 6 / visible-noise boundary：从普通 UI 中删除“操作说明”、手势教学、实现说明和零决策价值元数据，包括但不限于“方向跟随中”“部分数据”“同一地图·一个分析图层·本地时间”及面向审计者/实现者的解释。当前不新增 `?` help control 或 tooltip。真实风险、失败、权限、数据缺失和不确定性只有在会改变当前判断/行动时才贴近受影响事实显示，使用具体影响文案而非泛化 badge；完整来源/新鲜度仍可由现有 disclosure 按需到达，但不常驻争抢主层级。
- 7 / time ruler reuse decision：已核对 TDesign Mini Program、NutUI Taro、Taro primitives 与常见 React Native ruler libraries。TDesign/NutUI 只提供 Picker/DateTimePicker/Slider 等通用选择器；可找到的成熟 ruler packages 是 flat React-Native-only 并依赖 RN list substrate，不满足 WEAPP/Taro 与弧形中心强调语义。因此选择“复用 Taro `ScrollView` enhanced horizontal owner + project-local Curved Time Ruler visual/snap layer”，不新增第二 UI 系统或不兼容 dependency。参考来源：`https://docs.taro.zone/docs/components/viewContainer/scroll-view/`、`https://tdesign.tencent.com/qq-miniprogram/components/picker`、`https://github.com/jdf2e/nutui-react`、`https://github.com/rnheroes/react-native-ruler-picker`。
- 8 / drag blank-space bug：panel 的 media/content block size 必须由当前 presentation progress 连续计算；拖动期间不得先移动内容再延迟重算高度，也不得保留 large media placeholder，故任一 small↔medium↔large 中间帧都没有大片无主空白。重新拖动从 live presentation 接管。
- 9 / density system：先修改唯一设计系统，再改资源。Day `canvas` 与普通 page background 改为纯白 `#FFFFFF`；surface 仍为白，层级主要靠 alignment、type、divider 与少量 neutral subtle。当前 mobile visual roles 收敛为 conclusion `20/28`、page `18/25`、section `15/21`、body `12.5/18`、ordinary action `12/17`、compact `11/15`、metadata `10.5/15`、status `10/14`、final `13/18` CSS px/line-height；44px hit contract 与 200% reflow 不变。视觉密度依靠减少无效文字、空白、卡片墙、图标与表面尺寸，而非降低对比、裁切或全局 scale。
- 10 / motion coverage：除 reduced-motion、critical failure 与 observation token atomic swap 外，所有用户可感知的 surface 展示/隐藏、route-child reveal、panel extent、rail selection、filter state、disclosure、layer sheet、result insertion 和 My group transition 都须有短促、可中断、可反向的因果动效。特别是 non-marker map tap 必须把 panel 从 live translateY 以 exit motion 滑到 hidden，结束后再移除 hit/semantics，不能瞬间消失。
- 11 / layer sheet：`map-layer-selector` 不再是地图右侧展开 rail；同一 stable Control 的触发器仍可在 Map edge 保持紧凑 icon action，激活后在与 spot panel 相同的底部 presentation owner 中呈现固定高度 bottom sheet。Sheet 只列 current supported `LIGHT / TOTAL_CLOUD / OPPORTUNITY / off`，compact typography，单一固定 extent；与 spot panel 互斥可见但不清除 spot selection，关闭后恢复此前 panel extent。不得新增第二 Control key，或补充 provider/basemap/雷达/风/温度等能力。
- 12 / Search continuity：从 Map 激活 Search 后，Search field 的 rect、fill、border、radius、icon、type 与 query value 完全不变，作为 stationary shared anchor；field 默认 autofocus 并弹出键盘，但用户 tapping outside 必须可以 blur、关闭 suggestions/IME 而留在 Search page，之后可再次 focus。其余 Search content 从 field 下沿以 clip/reveal + `translateY(-12px→0)` + opacity `0→1` 在 `180ms` 内向下展开；返回反向收起。Search/result/filter 的 visual density 使用 I19 compact roles，field visual `80rpx` / target `88rpx`。
- 13 / white foundation：所有 day-mode page/canvas 默认纯白，不保留黄米色背景；neutral subtle 仅在真实分区、track、skeleton 或选中阅读层局部使用，不能再次把整页染黄。Night/Observation 仍使用各自当前安全 palette。
- 14 / My surface：参考附件最后一张图的高密度 account-hub 结构原则但不复制高德品牌、商业/会员/订单/钱包/促销模块。只重排既有 Starward duties：紧凑 account header（avatar/name/account state/settings）、现有 profile summary、`我的计划`、`我的贡献` 与其真实状态/entry，随后是现有 grouped settings/content rows；统一 baseline、small icon、divider 与有限 section surface，禁止 banner wall、假统计、第三方业务或新增 Product Control。
- Research application：Apple Search guidance 支持 focused transient search、suggestions 与 scoped filtering；Android guidance要求 compact layout 仍保留 ≥48dp touch target并用 whitespace/type/divider建立隐式 containment；TDesign Search 暴露独立 focus/blur 事件。这里只吸收可迁移原则，不复制平台品牌视觉。来源：`https://developer.apple.com/design/human-interface-guidelines/search-fields`、`https://developer.android.com/design/ui/mobile/guides/foundations/accessibility`、`https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure`、`https://tdesign.tencent.com/qq-miniprogram/components/search`。
- Attached image roles：本轮图 1/3–8/10 是 I18 rejected-candidate defect evidence；图 2/9 是 Amap density/full-detail/account-hub inspiration。所有附件均不是 exact-target，不授权复制品牌、图片、地图、图标、文案、会员/交易能力或 proprietary layout。
- Conflict precedence：I19 full-screen large 替代 I18 offset large；content-presence media 替代 same-geometry no-image placeholder；centered section rail、compact action rail、bottom layer sheet、stationary Search anchor/blur、pure-white day foundation、revised type scale、noise suppression 与 full motion coverage替代 I18 对应表达。I15 notification restraint、Favorite ritual、event-bound opportunity rail、no visible demo/version 与真实 safety/recovery semantics继续有效。

### I19 Architecture Deliberation refresh

- Affected owners：I2/I3 Surface/route/Control/state responsibility；I1 exact visual system与新的 immutable current component/layout Source；Open Design current system/task project/candidate；production code/tests继续不在本轮。
- Current extension points：root `DESIGN.md` composed owner；Taro `ScrollView`/touch/back primitives；existing `SemanticIcon` adapter；single Map/spot/time/filter/favorite state owners。Layer 与 spot panel 使用同一 bottom-presentation coordinator，不建立第二 stack truth。
- Selected design：full-screen large panel + medium back/collapse；content-presence media；stationary Search anchor；fixed-height bottom layer sheet；centered section rail；compact action rail/type scale；white day foundation；decision-value content filter；purposeful motion coverage；existing-duty My account hub。
- Build / Reuse / Buy：允许 TDesign/NutUI compatible primitive、Taro native primitive、已有 adapter/asset、自有 bounded layer 与 intentional non-abstraction；禁止完整第二 UI system、RN-only dependency、runtime remote icon或重复 scroll/gesture/state owner。选择复用 Taro enhanced horizontal ScrollView 的滚动生命周期/隐藏 scrollbar能力，在其上维护 project-local curved tick presentation/snap semantics；没有找到满足 WEAPP + curve + current Source cadence 的可直接引入组件。
- Plausible future challenge：微信原生 keyboard/back、safe-area 与 200% text 可能改变 full-screen sheet可用高度；动态时间 cadence可能增加 ticks；新增真实 layer/target 只能扩展既有 owner，不能预分配假选项。
- Debt disposition：I18 candidate暴露的 top-gap、visible scrollbars、handle geometry drift、rail/action比例、Search focus trap、instant hide、warm canvas和噪音 copy全部在新资源中修复；生产当前差异只记录为以后 implementation drift，本轮不碰代码。
- Forbidden shortcuts：照抄 Amap；缩小 hit target；隐藏 scrollbar时禁用 scroll；空媒体占位；用“部分数据”等泛化标签替代具体影响；为 tooltip新增长驻 `?`；用第三方商业模块填 My；复活旧 right layer rail/offset-large/旧 typography fallback。
- Quality：correctness由单一 selection/time/panel/layer owners保持；maintainability由 stable controls/component families保持；reliability覆盖手势取消、live-value retarget、keyboard/back与真实 recovery；performance只要求候选无 layout jump/明显掉帧且不宣称设备生产性能；privacy不暴露 pose/precise location；compatibility覆盖320/375/390/430、safe area、200% text；accessibility保留44px目标、非手势替代、隐藏 scrollbar但可滚动、named icons与reduced-motion/transparency。
- Context Delta：`required`；必须先更新 owning Context 和 current Design Authority，检查通过后才能同步 Provider 或生成候选。

## I20 — 2026-09-03 第五轮需求变更：紧凑连续交互与客观信息

- 流程仍是“DRA 设计资源 → 需求变更 → 设计资源”。I19 候选没有获准选择，收到本轮 12 项反馈后立即降为 rejected evidence；不得冻结、handoff、进入 production implementation 或继续使用其视觉作为 fallback。本轮 revision diff 只包含下列 12 项及其直接依赖；五个 stable Product Surfaces 只是完整资源的回归覆盖边界，不是“重做若干界面”的授权。
- 1 / Search 返回与连续性：Map 与 `spot/search` 的 Search field 共用同一外框、位置、填充、边界、圆角、阴影、字号、输入起点和高度。进入时只有 leading glyph 从 Search 交叉替换为 Back；Map 与 Search 两态都不显示 trailing `x`/clear glyph。Back control、微信/系统 Back 和平台 edge-back gesture 均返回 Map，并使用可中断反向 reveal；返回不得丢 query/filter/result/Map camera state。Search child 从 field 下沿向下 clip/reveal + opacity 进入，field 本身不位移、不缩放、不闪白。
- 2 / 信息密度与无效 chrome：Search 不显示“筛选条件”标题或其 divider。Filter group 直接紧随 Search field，choice visual height 改为 `48rpx`、label `10.5px/14.5px`、prefix icon `22rpx`，但独立 hit target 仍至少 `88rpx` 且不得相互重叠。`想去`/`其他观星点` partition heading 使用 body-level `12px/17px`、600，而非 section-title；整行保持 44px operable target。Mini Program visual type scale进一步收敛为 conclusion `18/25`、page-title `17/23`、section-title `13.5/19`、body `12/17`、ordinary-action `11.5/16`、compact-choice `10.5/14.5`、metadata `10/14`、status `9.5/13.5`、final-commit `12.5/17` CSS px/line-height。层级同时依靠 alignment、weight、color 与 grouping；禁止用巨大标题、厚 surface、冗余 label/divider 或降低可读性来制造结构。
- 3 / disclosure motion：Search 的 `想去`/`其他观星点` 展开收起从当前 measured block size 启动，容器 height/clip 与内容 opacity 同步 retarget；不得先 remount、`display:none`、重置 scrollTop、改变 card width 或切换旧/新树。快速反向从 live height/opacity接管，保留 list identity、focus 与 scroll anchor；normal motion `160ms`，reduced motion直接落位但仍不改变几何基线。抖动、闪烁、白帧或上下跳动均为失败。
- 4 / image-backed result：有合法图片时 media 仍 cover 整卡；leading text readable field 固定约半宽，exact `52%`，不随文案长度改变。图片必须在左侧透过 readability layer 以低对比可见；Day overlay 从 `rgba(255,255,255,.82)` 到半分位 `rgba(255,255,255,.66)`，再于 card 的 `66%` 位置连续淡至透明。无 blur、无完全不透明半区、无右侧“选择”。无图仍为 content-presence solid card，不占 media 空间。
- 5 / layer owner：Map layer trigger 打开时保持坐标不跳，使用同一 absolute overlay/Map owner；触发器 active 只用 pale sky fill `sky-soft` + inset boundary，不使用深蓝块。地图 tap、系统 Back 或再次触发以 `180ms` exit平滑收起，focus restoration 使用 prevent-scroll等价语义。Sheet 没有 `x`、没有“关闭图层”choice、没有额外关闭 row。仅三个 Source-supported analytical choices：`光污染 / 总云量 / 观测机会`；每项是带本地生成/自有 abstract raster-or-SVG background 的矩形卡片，label与checked状态保持可读。原 Map 左下 `观测条件`卡片不再是独立 surface/Control；其当前 local time + selected layer/objective value合并为 layer selector 内的紧凑 factual summary。普通 base map不成为choice。
- 6 / panel viewport 与 handle：任何 visible extent 都位于 persistent `mini-primary-navigation` 上方，不遮盖 Map/My 底部导航。Large 仍等价于一个页面，但 exact 意义改为“填满 primary content viewport”：top 对齐 app content top，bottom 对齐 nav top，安全区由 shell/nav 分别处理。Panel whole body和content都不再起 drag；只有顶部 handle 的矩形 hit region可发起 vertical extent gesture。Visible dash=`56×6rpx`，hit region=`88×72rpx`并以不占文档高度的 overlay实现；辅助技术另获得 ≥44px semantic target。Pointer down只显示 tonal/opacity feedback，未越过 drag threshold的tap/release不改变extent。Drag cancel回当前extent，release才依据 live offset/velocity snap。
- 7 / action rail与圆角星：bottom rail visible height由`72rpx`降为`60–64rpx`，outer target lane保持`88rpx`；icon统一`24rpx`、label `19–20rpx/28rpx`。`想去`复用与 Search selection 相同的 rounded-star `SemanticIcon`源和stroke/corner geometry，禁止另画尖角大星；Favorite ritual状态语义保持但尺寸适配rail。三项等宽、无大面积填充、无第四项。
- 8 / panel width与section rail：有media时 handle chrome只保留最小安全 inset；media/identity紧随live top，不为hit box分配大块空白。Small/Medium/Large surface都铺满可用content width。右侧 `概览/天文` rail以absolute/fixed方式悬浮在panel之上，不进入content grid、不得预留全局`96rpx`列。Rail visible width `64rpx`，两个item上下无gap、共享一个连续pill轮廓；active使用pale sky fill，不使用右侧深蓝shadow或任何外移transform。只对被rail实际覆盖的短局部行增加collision inset，不压缩整篇document。
- 9 / objective-only information：当前 Mini Program panel 删除 `spot-tonight-decision`，不显示“谨慎出发”、推荐/建议出发结论或“推荐窗口”。Event Opportunity/“最佳窗口”不再绑定当前 Mini Program panel。Panel仍按基本信息→天文信息连续排列，但只陈述 formal spot、route/access/facility/safety factual status、source/freshness，以及 cloud/transparency/seeing/light-pollution/moon/targets等客观事实；真实不可用/风险状态可见，但不得由UI推导行程建议。后端既有决策能力不在本轮删除范围，只是不作为当前surface display责任。
- 10 / Curved Time Ruler：不是因为原型可省略而拒绝 library。再次核对 current repo、TDesign Mini Program、WeUI、NutUI Taro及Taro官方组件后，仍没有一个已安装或官方支持的 WEAPP/Taro component同时提供 horizontal direct scrub、center snap、arc projection、edge scale/opacity taper和真实slice semantics。仓库只有Taro primitives，无第三方UI dependency。选择复用官方 Taro enhanced horizontal `ScrollView`（scroll physics、scrollX、`showScrollbar=false`、onScroll/onScrollEnd），project-local层仅负责弧线投影、刻度/label、snap与同一time store；不移植RN-only flat ruler、不引入完整UI系统。Prototype必须真实表现拖动/对齐，但不声称它就是production library。Ruler无外框、无card background、无shadow；仅保留transparent/tonal fade mask、ticks、center axis/current value与必要event band。
- 11 / Full-Sky top chrome：删除附件红框中的boxed title/spot-time header与右侧target/location action；不再显示“方位天空 / 地点 · 时间”容器。保留一个安静的 leading Back icon action作为非手势可达出口，平台/system Back同义；其余上方空间属于sky canvas。必要权限/传感器恢复仍就地出现，但普通成功无status/header条。
- 12 / marker default：Map formal marker或Search result选择后，同一 panel默认进入`medium`，不再`small`。Small仍是handle drag可达extent；非marker tap保持animated hidden；selected spot/time/layer state不清除。
- Research synthesis（只吸收原则，不复制第三方品牌视觉/职责）：Apple Search guidance把focused Search作为 transient experience，并要求标准Back负责层级返回；Apple Layout/Design Principles强调每个元素都应有明确目的、用alignment与grouping表达层级；Apple Accessibility将视觉尺寸与可操作目标分离并要求手势替代。Android Material Search把collapsed field与expanded full-screen content建模为一个Search owner，Predictive Back提供可取消/提交的progress，BottomSheetScaffold强调sheet与主UI共存，Compose animation guidance指出layout-phase animation成本与跳动风险。WeUI Searchbar把Back/Cancel与仅在有值时的clear分开；本轮owner明确不要重复`x`，因此当前field不提供trailing clear。TDesign/WeUI用于核对微信原生pattern，不作为第二设计系统。
- Research sources：`https://developer.apple.com/design/human-interface-guidelines/search-fields`、`https://developer.apple.com/design/human-interface-guidelines/toolbars`、`https://developer.apple.com/design/human-interface-guidelines/layout`、`https://developer.apple.com/design/human-interface-guidelines/accessibility`、`https://developer.android.com/develop/ui/compose/components/search-bar`、`https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back`、`https://developer.android.com/develop/ui/compose/animation/quick-guide`、`https://developer.android.com/reference/kotlin/androidx/compose/material3/BottomSheetScaffold`、`https://github.com/tencent/weui-wxss`、`https://github.com/wechat-miniprogram/weui-miniprogram/blob/master/src/components/searchbar/searchbar.wxml`、`https://github.com/Tencent/tdesign-miniprogram`、`https://docs.taro.zone/docs/components/viewContainer/scroll-view/`。
- Attached image roles：图1/3–8是I19 rejected-candidate defect evidence；图2是Amap Search density/pattern inspiration。附件文字不是额外指令，图片不是exact target，不授权复制品牌、地图、商业职责、专有图像或token。

### I20 Architecture Deliberation refresh

- Affected owners：root `DESIGN.md` + 新 immutable current component/layout Source（visual/type/motion/component exact values）；Product Surface/Screen children（Search Back、panel default/extent/nav关系、objective-only display、layer/condition ownership、Full-Sky chrome）；同一个 Open Design design-system/task project和repo-local candidate。Production code/tests仍不在本轮。
- Current extension points/source of truth：root composed Design Authority；exact-value base；one Map route/camera state owner；one Search query/filter/result owner；one panel visibility/extent/section owner；one bottom-presentation coordinator；one selected local time store；Taro enhanced `ScrollView`；existing `SemanticIcon`与bounded local assets。Dependency direction仍是Context/product semantics → Design Authority/component source → DRA candidate，绝不反向从旧candidate恢复规则。
- Lifecycle/state boundaries：Search Back/edge gesture只pop child并反向motion；panel press不commit、handle drag threshold后才preview/release snap/cancel；layer open/close不remount或滚动Map；disclosure保留identity/focus/scroll anchor；marker/result统一medium；large填满content viewport但persistent nav仍由shell拥有；Full-Sky离开即停止sensor lifecycle。TripDecision/backend可继续存在，但当前panel不展示推荐结论。
- Selected design：stationary no-x Search；titleless compact filters；measured non-jitter disclosure；52% translucent readable result field；three image-backed layer cards + integrated factual condition summary；nav-safe full-width panel、handle-only drag、floating contiguous rail、smaller action pill/rounded star；objective-only continuous document；borderless Taro-backed curved ruler；headerless Full-Sky canvas；marker→medium。
- Material alternatives considered：保留clear `x`（与Back重复，reject）；用`display:none`/remount简化collapse（会闪烁/丢scroll，reject）；保留separate condition card/off choice（duplicate owner/noise，reject）；whole-panel drag（gesture stealing，reject）；large覆盖nav（违反persistent shell，reject）；import RN ruler/full TDesign or NutUI（不兼容或形成第二UI system，reject）；CSS/native ScrollView + bounded projection（selected）；self-authored local layer imagery或compatible existing asset（both allowed，selected由provider在bounded assets内实现）。
- Build / Reuse / Buy allowed set：existing Taro/WEAPP primitives、SemanticIcon、当前asset pipeline、TDesign/WeUI中兼容的isolated pattern、bounded local SVG/raster、自有薄projection和intentional non-abstraction；禁止第二token/scroll/state owner、runtime remote images/icons、RN-only package、未审license资产、复制Amap、为时间尺重造惯性/滚动物理。选择不新增dependency，复用Taro ScrollView +本地projection；layer imagery用本地生成/自有抽象素材，不依赖网络。
- Plausible future-change challenge：新增真实layer或大字号/本地化会挤压三卡与floating rail；方案要求cards自适应2列/1列、rail collision只局部避让、200%文字不横向滚动。Time cadence变化只从真实slice domain重建ticks。
- Touched debt/disposition：I19 candidate的Back死路、重复x、oversized type/chrome、disclosure flicker、opaque 64% card、layer jump/dark active/x/off、separate condition card、panel覆盖nav/whole-body drag/handle tap commit、large star/action rail、rail预留列/shadow、recommendation copy、ruler frame与Full-Sky header全部列为本轮必须消除的candidate debt。旧current source保持immutable audit bytes并降为historical-only；不在本轮修生产drift。
- Forbidden shortcuts：先改candidate后补authority；覆盖旧immutable source；把截图当exact target；缩小hit target随字号一起缩；隐藏scroll owner；无动效`display:none`；用opacity掩盖仍占位的media；让rail占content width；用`x`/“关闭图层”/“筛选条件”/“谨慎出发”/“推荐窗口”残留；用静态线图宣称时间尺可拖；引入remote/unlicensed assets或新UI framework。
- Project-owned checks：authority阶段`npm run design:system:verify`、`npm run design:lint`、`make validate-context`；candidate阶段node/coverage inspector、Browser真实点击/drag/edge-back/search/disclosure/layer/ruler/320–430/200%/modes/reduced-motion checks、`make validate-harness`与`git diff --check`。最终冷启动journey为Map→marker medium→handle large/small→Map tap hide→Search→Back→layer open/close→Cloud→Full-Sky Back。
- Engineering qualities：correctness/invariants由single owners和exact transition rules保护；maintainability/changeability由stable Control families、local asset/projection和no-new-dependency保护；reliability覆盖cancel/interruption/focus/scroll/map-coordinate stability；performance不作生产设备声称，只要求candidate无layout thrash/jitter并由ScrollView复用惯性；security/privacy无新数据或权限；compatibility覆盖WEAPP system Back/safe area/nav/320–430/200%；operability/testability由stable `data-control`、route/state explorer与Browser审计；accessibility保留≥44px语义目标、named Back、increment/decrement和reduced motion。
- Context Delta：`required`。必须先更新Product Surface/Screen Context、新immutable current Source、root Design Authority和verifier并通过authority checks，之后才允许同步Provider current body/Commission或修改candidate。

## I21 — 2026-09-03 第六轮需求变更：统一内容流、互斥底层、三态模式与紧凑表单

- 流程仍是“DRA 设计资源 → 需求变更 → 设计资源”。I20 候选收到本轮反馈后立即降为 rejected evidence。Owner 明确授权：本轮候选生成与严格审计完成后，无需再等待候选批准，直接继续完整 DRA selection/freeze/formal-handoff/preflight；这不授权生产实现，也不降低检查或证据要求。
- 1 / 同一 panel document：small、medium、large 始终保留同一份、同序、同 identity 的 objective information document；extents只改变viewport裁剪与scroll availability，不得分别render/remount/reorder。唯一presentation差异是合法media只在medium→large连续拉出；无media从不创建node、placeholder或空档。
- 2 / 短 action rail 与缺失文案：底部三项action visible pill收敛到`52–56rpx`、左右inset`40rpx`、icon`22rpx`，完整target lane仍`88rpx`。可见ordinary missing/unknown/unverified值统一显示`暂无数据`；domain/store仍区分loading、permission、stale、error、not-applicable，真实风险不得被该文案掩盖。
- 3 / flush section rail：`概览/天文` outer pill=`60×104rpx`、padding=0、overflow clip；两项各`52rpx`、gap=0，首末项贴紧上下边，仅共享divider，无右侧shadow/translate。
- 4 / Curved Time Ruler：Ruler上移`16rpx`、visible block=`84rpx`，无outer frame/card/shadow/instruction及左右箭头；必须能以pointer/touch横拖真实移动Taro enhanced `ScrollView` track，实时preview最近真实slice，scroll-end/projected offset snap后commit。键盘/辅助技术仍有increment/decrement语义但不生成visible arrow chrome。
- 5 / Search连续文本与紧凑节奏：Map入口与Search route使用相同外框、位置、query/placeholder字符串和caret origin；只在leading slot做Search↔Back。Suggestion visible row=`72rpx`、target=`88rpx`、icon=`22rpx`、padding=`16rpx`、1rpx divider；filters从field/overlay下沿`4–6rpx`开始，choice visible=`44rpx`、wrap gap=`4rpx`，到首partition视觉距离=`12–16rpx`，不靠大空白分组。
- 6 / staged medium→large：drag progress `p`先驱动media reveal=`clamp((p-.50)/.28)`，只有接近top时Search/Location/Layer chrome才以`1-clamp((p-.82)/.12)`淡出并停止hit/semantics；反向从live progress镜像接管。无media时不虚构media phase，但chrome阈值不变。
- 7 / handle band与唯一手势热区：无media时保留`40rpx` compact handle band并在drag中持续存在；media reveal开始后handle覆盖在image上、band连续收为0。只有居中的`104×40rpx`小长矩形热区可启动vertical extent gesture，visible dash=`52×5rpx`；panel body/content/media/top edge不抢手势，tap/release不切档。
- 8 / one bottom presentation：Map只保留`bottomPresentation = none | spot-panel | layer-sheet`一个枚举；任何帧只能有一个bottom surface拥有visible/hit/semantics/active。Panel→layer直接retarget；layer打开时marker/result intent直接变为new spot medium，不先恢复旧panel，因此不双active、不跳动。Selected spot与previous extent可留在model但不是visible flag。
- 9 / pale active：active soft更新为`#F5F6FF`，另以inset boundary/indicator/checked state表达；不使用深蓝填充、shadow或几何位移。
- 10 / one three-state mode track：`display-mode-switcher`成为Settings唯一`day|night|observation`owner，默认day；旧`observation-mode-control`退休。控件是single-choice三站segmented slider而非binary Switch：tap直接选择或从当前向下一站，水平拖动按position+velocity吸附相邻站，不wrap/跳站；Day↔Night做Sun/Moon交叉，Night↔Observation先原子绑定closed black/warm-red tokens再做Moon/Star交叉，反向镜像。键盘/Home/End/SR直接选择等价。
- 11 / compact colored-icon My：只重排既有account/profile/plan/contribution/profile-links/import/settings职责；compact header、共享status/action surface与`88rpx`routine rows提高扫描密度。Plan、Contribution、Profile Link、Import/Settings用`48rpx`semantic soft icon tiles + `24rpx`同源stroke glyph，以sky/trail/meteor/risk-or-neutral辅助分组；不新增商业模块、banner、假统计、Favorite副本或第二图标系统。
- 12 / compact Contribution intake：“观星点信息提交”继续使用现有八个Contribution controls与durable field/state语义，但重新组织为一个keyboard-safe scroll document。Simple fields使用`88rpx`target/`72–80rpx`visible的divider-backed label/value rows，complex groups用top label；group=`8–12rpx`、section=`20–24rpx`，helper/error仅适用时就地出现。Media grid 390px三列、320px/200%两列并在达到上限时移除add；只有一个`80–88rpx`final submit。Panel/My entry、conditional new-place location、draft/upload/idempotency/privacy/rights/review语义不变。
- 13 / mature component reuse-first：设计资源只展示UI/UX、状态和动效；对应技术说明必须给出`library / component / Starward adaptation`。下一步production以`@taroify/core@1.0.6`为preferred generic substrate，按需引入并经一个Starward adapter/ConfigProvider投射exact tokens；保留`SemanticIcon`/`semantic-asset.tsx`、Product Surface controls、app store、form draft、transport/idempotency与Map coordinator为唯一语义owner。无语义等价组件时使用Taro平台原语或bounded thin composition，不为了“用了库”强行套错组件。
- Research synthesis（只吸收原则与兼容组件，不复制第三方品牌视觉或职责）：Apple Search Fields说明search可作为聚焦/暂态体验；Toolbars强调标准Back用于层级返回、Close用于modal；Segmented Controls与Android segmented button都把少量互斥值建模为single-choice而非binary switch；Apple Lists and Tables强调简短、可扫描行与克制附件；Icons与Accessibility强调图标风格一致、颜色有目的、可见尺寸与可操作target分离。Taro `ScrollView`已有`scrollX`、`enhanced`、`showScrollbar=false`与`scrollIntoView`等平台滚动能力。Ant Design Mobile Form/List/Selector/ImageUploader、Ant proximity、TDesign Mini Program Cell/Input、Vant Weapp、Taroify与NutUI Taro共同支持atomic field、shared row rhythm、local feedback与single commit。Current repo是Taro 4.2.1 + React 18.3.1且无UI suite；Ant Design Mobile官方不支持微信小程序runtime，TDesign native需hybrid `usingComponents`并增加集成边界，NutUI最新是beta且包面更重；Taroify 1.0.6为MIT、peer范围直接覆盖current stack、70+ components、按需style/Tree Shaking与主题变量，因此选为通用底座而不是第二设计系统。
- Production component map：nav=`Tabbar`；Search=`Search + Cell.Group/Cell + Checkbox.Group`；spot panel=`FloatingPanel(anchors, contentDraggable=false)`但须先证明header-only exact hit/nested scroll，失败在同一adapter内回退Taro ScrollView+coordinator；rails=`Sidebar + Button.Group/Button`；layer=`Popup(bottom)`；time ruler=`Taro enhanced ScrollView`；Settings/My=`Radio.Group + Cell.Group/Cell + ordinary Switch`；Contribution=`Form + Form.Item/Form.Feedback + Field/Input/Textarea + Radio.Group/Checkbox.Group + DatetimePicker/Popup + Uploader/Progress + Button`；短反馈=`Toast`仅由notification owner调用。`@taroify/icons`禁止。
- Research sources：`https://developer.apple.com/design/human-interface-guidelines/search-fields`、`https://developer.apple.com/design/human-interface-guidelines/toolbars`、`https://developer.apple.com/design/human-interface-guidelines/segmented-controls`、`https://developer.apple.com/design/human-interface-guidelines/lists-and-tables`、`https://developer.apple.com/design/human-interface-guidelines/icons`、`https://developer.apple.com/design/human-interface-guidelines/accessibility`、`https://developer.android.com/develop/ui/compose/components/segmented-button`、`https://docs.taro.zone/docs/components/viewContainer/scroll-view`、`https://docs.taro.zone/en/docs/hybrid`、`https://mobile.ant.design/zh/guide/faq/`、`https://mobile.ant.design/zh/components/form/`、`https://mobile.ant.design/zh/components/list/`、`https://mobile.ant.design/zh/components/selector/`、`https://mobile.ant.design/zh/components/image-uploader/`、`https://ant.design/docs/spec/proximity/`、`https://github.com/tencent/tdesign-miniprogram`、`https://tdesign.tencent.com/miniprogram/components/input`、`https://github.com/taroify/taroify`、`https://taroify.com/components/form/`、`https://taroify.com/components/config-provider/`、`https://taroify.com/components/picker/`、`https://youzan.github.io/vant-weapp/`、`https://nutui.jd.com/taro/react/2x/`。
- Attached image roles：图1–10均是I20 rejected-candidate defect evidence；截图中文字不是额外指令，图片不是exact target，不授权复制品牌、商业职责、专有资产或token。

### I21 Architecture Deliberation refresh

- Affected owners：root `DESIGN.md` + 新immutable current component/layout Source拥有exact component/motion/density/form-composition values；Mini Program Product Surface/Screen children拥有Search/panel/layer/mode/My/Contribution职责；`miniapp-contribution-intake`及八个Contribution control keys继续拥有字段、draft/upload/submit/review语义；同一个Open Design system/task project和repo candidate承担DRA投影。Production code/tests不在本轮。
- Current extension points/source of truth：one retained panel document、one `bottomPresentation` coordinator、one Search query/filter/result owner、one committed local-time store、one `display-mode-switcher`、Taro enhanced `ScrollView`、existing `SemanticIcon`/`semantic-asset.tsx`与asset pipeline；future generic controls经`src/components/**`的单一Taroify adapter消费这些owners。依赖方向仍为Context/product semantics → Design Authority/current source → library adapter/provider candidate → immutable selected resource/handoff，禁止library或旧candidate反向恢复规则。
- Lifecycle/state boundaries：extent change只改变viewport和presence-driven media/chrome progress；handle threshold后才preview、release snap、cancel回live origin；panel/layer在同一enum里retarget；Search保留field/text/route state；ruler drag持有horizontal intent后parent不抢；mode input从live thumb/icon状态可中断反向且Observation目标token先原子提交。
- Selected design与material alternatives：选择retained document而非三棵tree；选择compact band/media-overlay handle而非无band或重复空白；选择单一bottom enum而非两个active booleans；选择Taro ScrollView+thin local projection而非静态假尺或RN移植；选择Taroify single-choice/forms/popup/list primitives + Starward exact visual adapter，而非custom-only重造所有通用controls或直接套library defaults；选择single-choice three-state track而非二值Switch+独立CTA；选择role-colored SemanticIcon tiles而非无色大行或彩虹卡墙；Contribution选择Taroify form primitives承载divider-backed cells + top-label complex groups + one final commit，而非per-field cards、wizard、dense desktop grid或duplicate sticky submit。
- Build / Reuse / Buy allowed set：pinned `@taroify/core` per-component imports、Taro/WEAPP primitives、existing SemanticIcon/asset/state/route owners、isolated proven TDesign native fallback、bounded thin projection与intentional non-abstraction。Prohibited：parallel second UI suite/token/icon/form store、runtime CDN/remote/unlicensed assets、library brand defaults、binary Switch冒充三态、generic Slider冒充time ruler、library fork、手写另一套惯性物理。Selected：Taroify 作为preferred generic substrate；Taro enhanced ScrollView owns time physics；Starward adapters own exact visual projection and product semantics。FloatingPanel只有native WEAPP exact-handle/nested-scroll proof通过才admit，否则回退同一adapter下Taro primitive。
- Plausible future-change challenge：cadence、locale、200% text或第四种真实mode会挑战tick density与three-stop geometry；Taroify升级/peer变动或某个WEAPP native bug会挑战adapter compatibility。当前owner要求真实domain重建ticks，三态值域变化须先改Context/Control contract，不能在view里动态加第四站；library更换只发生在adapter下方并需重跑lock/bundle/native验证。新增panel section/layer仍扩展现有document/enum，不复制owner。
- Touched debt/disposition：I20 candidate的per-extent content、长action rail、gapped rail、低位不可拖ruler、changed Search text/oversized suggestions、单阶段chrome、handle band漂移、panel/layer双active、深active、split mode controls、plain My与oversized/card-wall Contribution form均必须在新candidate消除。旧sources/candidate只作immutable/rejected audit evidence；production drift留给后续implementation。
- Forbidden shortcuts：先改candidate后补authority；覆盖旧immutable source；只靠opacity隐藏占位；复制三份panel tree；两个active booleans；用`尚未核实`替代ordinary missing；静态ticks声称可拖；visible arrows；二值Switch承载三态；为彩色感新增无职责模块或第二icon set；缩小hit target来追求紧凑；custom-only重造已有成熟控件；并行引入多个UI suite或第二form store；直接复制Taroify品牌默认值；让library接管draft/transport/business validation；用卡片墙、空helper、duplicate submit伪造层级；跳过candidate audit/selection evidence。
- Project-owned checks：authority阶段`npm run design:system:verify`、`npm run design:lint`、`make validate-context`；candidate阶段provider exact-binding/coverage inspector、README/coverage component-map检查、Browser真实click/drag/reverse/cancel/edge/keyboard与320/375/390/430 + 100/200% + modes + reduced motion/transparency检查、`make validate-harness`、`git diff --check`；selected阶段immutable manifest/feasibility/formal handoff与`ty-context design-resource preflight`。后续production必须另证package lock/license/peer fit、per-component imports/tree shaking、bundle delta、theme projection以及WEAPP Popup/FloatingPanel/IME/safe-area/a11y/gesture behavior。
- Engineering qualities：correctness/invariants由single owners、retained identity和exact transition predicates保护；maintainability/changeability由stable Controls、Taroify adapter boundary与no duplicate source of truth保护；reliability覆盖gesture cancel/retarget/focus/scroll/map-coordinate稳定与fallback semantics；performance当前只要求candidate无layout thrash，production bundle/low-device表现待量化；security/privacy无新增数据/权限且library不能读取真实candidate data；compatibility覆盖WEAPP Back/safe-area/nav/320–430/200%并在implementation重新验证peers/native behavior；operability/testability由stable markers、component mapping、state explorer、frozen manifest与preflight；accessibility保留≥44px semantic targets、non-gesture alternatives、checked/name/value/focus与reduced motion。
- Context Delta：`required`且已先完成。Current source=`docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md` / `0fd87614...`；root canonical section=`086088d3...`；production code/package lock/tests未改。

## A1 — I21 style-application closure

| 字段 | disposition | controlling source / 约束 |
| --- | --- | --- |
| `primary_content_priority` | existing-covered | Map唯一地图主对象；Search stationary child；panel同一objective document；layer与panel互斥；Settings只有一个mode owner；My只重排既有职责 |
| `density` | existing-covered | current type ladder + compact suggestions/filter rhythm + 52–56rpx action pill + 48rpx icon tiles；44px target独立于visible size |
| `container_treatment` | existing-covered | same-document clipped panel、media presence、40rpx handle band、flush rail、arrowless unframed ruler、shared My surfaces，禁止card wall |
| `visible_vs_hit_geometry` | existing-covered | handle 52×5 / 104×40 physical / ≥88 semantic；section rail 60×104 with 52+52；action 52–56/88 lane；suggestion 72/88；mode 72/≥88 |
| `feedback_and_motion` | existing-covered | media-first/late-chrome fade、one-enum panel/layer retarget、direct ruler drag/snap、three-state thumb/icon transitions、interruptible/reduced motion |
| `content_and_copy` | existing-covered | same objective order；ordinary missing=`暂无数据`但domain states不合并；无推荐/教程/实现噪音；My不发明职责或假数据 |
| `responsive_accessibility` | existing-covered | 320/375/390/430、100/200%、safe area、no visible scrollbars、keyboard/SR gesture alternatives、non-color active/mode states |
| `contribution_form_composition` | existing-covered | one keyboard-safe scroll owner；divider-backed simple rows + top-label complex groups；conditional location；inline validation/upload recovery；single final commit；draft/idempotency/privacy语义保持 |
| `component_reuse_binding` | existing-covered | `@taroify/core` preferred per-component substrate + single Starward adapter；明确nav/Search/panel/rails/layer/Settings/My/Contribution mapping；Taro ScrollView special owner；SemanticIcon保留；native evidence gate/fallback已定义 |
| `prohibited_patterns` | existing-covered | per-extent trees、image placeholders、whole-panel drag、visible arrows、dual active flags、deep-blue active、binary mode switch、oversized/plain My、remote/unlicensed assets |

I21所有适用维度均由current Design Authority、owning Context与current Commission完整覆盖；没有projected、未处置或decision-required维度。Provider若发现超出13项及直接依赖的真实选择，必须返回owner，不得在生成中默认裁决。

## A0 — Style-application closure

| 字段 | disposition | controlling source / 约束 |
| --- | --- | --- |
| `primary_content_priority` | existing-covered | I2/I3/I20：Map保持唯一地图主对象；Search child以同一field展开；formal spot facts属于map-parallel panel；Orientation以无header全屏星空为主；当前panel只展示客观facts |
| `density` | existing-covered | I1/I20 compact-but-clear roles：18/17/13.5/12/11.5/10.5/10/9.5px hierarchy、24–32rpx inset、18–24rpx section rhythm、44px hit；删除无效title/divider/chrome后再紧凑布局 |
| `container_treatment` | existing-covered | Map仅floating Search；titleless filters wrap；result half-field image-backed；spot panel是一个full-width continuous object；layer是three-card bottom sheet；ruler无外框；内容优先axis/divider而非card wall |
| `visible_vs_hit_geometry` | existing-covered | I1/I20：48rpx filter/10.5px/22rpx prefix/48rpx star；handle 56×6 visible/88×72 physical/≥88×88 semantic；rail 64、action 60–64/24 icon；交互target仍≥88rpx且不重叠 |
| `preserve` | existing-covered | I2/I3非冲突产品/数据/安全语义；I15 exact Favorite ritual、notification restraint与sensor behavior；I20只退休current panel recommendation/window display，不删除backend能力 |
| `prohibited_patterns` | existing-covered | 不按Surface数量重做页面；不保留retired routes/controls/style fallback；无Search/layer x、filter title、off choice、whole-panel drag、tap-to-cycle、rail reserved column/shadow、ruler frame、Full-Sky header、visible demo/version或第三方仿制 |
| Map/Search/Panel 产品 UI | existing-covered | I1/I2/I3/I20完整覆盖stationary Search+Back/system/edge return、titleless filters、stable disclosure、52% result、image-backed layer、marker-to-medium nav-safe panel、handle-only drag、floating/compact rails；provider appearance excluded |
| information architecture | existing-covered | 五stable Surfaces；Search child；objective basic+astronomy panel continuous flow；only full-sky child；no quick/more、Finder、standalone detail/night/professional/targets、callout、tabs或TripDecision display |
| feedback and motion | existing-covered | retained measured disclosure与Search reveal可中断retarget；filter star；panel handle threshold/live snap；animated hide；layer no-jump close；ruler direct/snap；Favorite ritual；reduced motion/transparency |
| content/data boundary | existing-covered | viewport不出现demo/fixture；panel只用objective route/access/facility/safety/weather/astronomy/source facts；Search/card/panel不发明字段、图层、推荐算法或媒体权利 |
| responsive/accessibility | existing-covered | 320/375/390/430、750rpx、100/200% text、安全区、persistent nav、keyboard/SR、visible/system/edge Back、named icons、gesture alternatives、non-color state与Orientation degraded list |

本次I20 material revision的全部适用维度均由current Design Authority、owning Context与current `COMMISSION.md`直接完整覆盖，因此不另造`style_application`字段；没有`projected`、未处置或`decision-required`维度。任何Provider新发现的真实冲突必须先返回owner，不能在生成中默认裁决。

## R0 — Resource disposition

| 资源 | disposition | 理由 |
| --- | --- | --- |
| 综合可交互 Mini Program prototype | I21 current candidate pending generation/audit | 必须在同一 bounded project 中按I21的13项及直接依赖material-revise并独立审计；owner已授权审计后由DRA选择，不再等待额外批准 |
| 共享 component/state explorer | integrate into primary prototype | 避免第二套视觉 truth；为审计提供可达状态入口 |
| per-control 静态图集 | reuse/skip | 重复且不能承载交互/状态；无独立决策价值 |
| exact-value base + current unified-flow/modes Source | reuse as authority/input | 不覆盖；根 DESIGN composed interpretation 为唯一视觉真相 |
| 先前 Map/Finder + review-directed + Map/Search/panel + fullscreen/density + compact-continuity Sources | exclude / historical only | immutable audit provenance；不得进入 generation 或 fallback |
| 第二轮可交互候选（I15） | rejected evidence | owner 提出 I18 后不再是 current candidate，不得选择或冻结 |
| 第三轮可交互候选（I18） | rejected evidence | owner 提出 I19 的 14 项反馈后失去 current-candidate资格；只作缺陷与回归证据，不得选择、冻结或作为视觉 fallback |
| 第四轮可交互候选（I19） | rejected evidence | owner提出I20的12项反馈后失去current-candidate资格；只作缺陷/回归证据 |
| 第五轮可交互候选（I20） | rejected evidence | owner提出I21并补充至13项反馈后失去current-candidate资格；不得选择、冻结或作为视觉fallback |
| 当前 08-25 page/interaction resource | excluded / historical only | owner 已退役；不得作为任何生成或兼容输入 |
| owner-operations prototype | exclude | 不属于 Mini Program Product Surface |
| formal handoff / immutable selected snapshot | authorized after I21 candidate audit | 方向通过独立审计后由DRA按resource selection选择并冻结，随后完成Authority Delta、feasibility、formal handoff与preflight；不进入生产实现 |

## B0 — 当前阻塞与决策门

- `B0.1 provider-system-visibility`：**已闭合**。问题是 live API 需要显式 personal-workspace context，并非资源缺失；workspace 必须在每次调用时从 `/api/workspace/directory` 重新发现，不在仓库持久化个人 member identifier。
  - structured design-system `user:starward-mini-program-sky-canvas-field-signal-revision` 可读。首次闭合时 provider body 与 base selected-source 同为 `a3868d...`；owner 后续扩展后的 current composed body 由 B0.5 单独同步，不能再把 `a3868d...` 称为完整 current body。
  - provider filesystem 的模板型 `DESIGN.md` 不是 structured body owner；后续必须通过 structured resource/API 读取 canonical body，不能把该模板 stub 误当设计系统。
- `B0.2 model-rank`：**已闭合**。
  - Open Design 0.21.1 live run surface exposes Codex CLI 0.144.5、`gpt-5.6-sol`/`terra`/`luna` 和 ordered reasoning options `default < none < minimal < low < medium < high < xhigh`；该 surface 暴露的最高 legal effort 是 `xhigh`。
  - OpenAI provider 官方 live guidance（2026-09-02 discovery）明确把 Sol 定义为 flagship / complex reasoning and coding，把 Terra 定义为 intelligence-cost balance，把 Luna 定义为 cost-sensitive/high-volume；因此当前 eligible Codex candidates 的 capability winner 是 `gpt-5.6-sol`，不是根据价格、名字、日期或列表顺序推断。
  - evidence links：`https://developers.openai.com/api/docs/models/gpt`、`https://developers.openai.com/api/docs/guides/latest-model`；live Codex app-server `model/list` 同时报告 Sol `isDefault: true`，但该字段只作交叉印证，不独立充当 capability rank。
  - 正式 run request 必须显式使用 `agent=codex`、`model=gpt-5.6-sol`、`reasoning=xhigh`，并在 result 中核对 effective provenance；若 run 不报告或不一致，保持 `highest_performance_unverified` 并不得把结果升级为正式候选。
- `B0.3 map-visual-authority`：**已闭合**。用户在精确列明 Search/filters/Sheet/controls/marker/callout/legend 以及 provider/basemap/native-map 排除边界后回复“继续”；I1/I5 与 owning Context 已更新，`design:system:verify` 报告 `map_finder_app_ui_status=selected-current`、`provider_map_appearance_status=excluded`。
- `B0.4 provider-publication`：**已闭合**。用户于 2026-09-02 明确授权；supported PATCH 已把现有 identity 同步为 `published`、`artifactMode=agent-managed`，provider root/structured/system-project/adopted body 均为 `a3868d...`。30 个 supporting files 零变化，无新增/缺失文件，stale revision 仍 pending，目标 task project 尚未创建。证据见 `provider-pre-mutation-manifest.json` 与 `provider-post-mutation-report.json`。
  - 不可采用：接受现有 pending revision `bccaa010-a3ef-4895-9fb0-4c874239fdac`；其 proposed body SHA-256 `b8ec8f96f6b6b4ec20272586616ccb52aa335ba86b4a70f67a74dd18b5a15ce8` 与 selected Source `a3868d...` 不同，且 Screen Contract 已把该 pending revision 定义为 stale/noncanonical。
  - 已执行的安全动作：按 `provider-publication-sync-plan.md` 通过 supported `PATCH /api/design-systems/:id`，一次性提交 `status=published`、`artifactMode=agent-managed` 与 I5 immutable selected `DESIGN.md` 的 exact body；随后已重新读取 body/status/hash 与完整变更集，确认 design meaning 未变化。不得接受 stale revision，也不得直接编辑 provider metadata。
- `B0.5 provider-current-body-sync`：**已闭合**。Registry root、linked system workspace `DESIGN.md`、structured/run-resolved body 三者均精确为 `4c86d52c…`；provider 30 个 supporting files、linked project 其余 117 files、pending revision 与 identity/binding 全部保持。Partial 与最终证据分别为 `provider-current-body-partial-report.json`、`provider-current-body-post-mutation-report.json`；现在才允许创建 bounded all-resources project。
- `B0.6 bounded-project`：**现有 project/binding 保持**。项目 `starward-miniapp-field-signal-all-resources` / `Starward 微信小程序全量交互原型` 保持 `skillId=frontend-design`、exact `designSystemId`、workspace binding、`kind=design-resource`、`intent=design-resource-authoring` 与 prototype entry；无 scenario/plugin/template snapshot。本地 current commission SHA-256=`00953088...`；provider task project在B0.18 sync前仍持有I18 `d243ea93...`，不得用于I19 formal run。
- `B0.7 run-scenario-isolation`：**已闭合**。`kind=design-resource` 的首个 run 已实际读回 `pluginId=null`、`appliedPluginSnapshotId=null`，project 也无 pin；同时 provider state 最终记录 exact Codex/Sol/xhigh/frontend-design/design-system provenance。该 run 因本地 readiness check 过早而在 0 outputs 时取消，只作隔离证明；当前 formal run 需使用新 client id 并等待 provenance 字段稳定。
- `B0.8 formal-run`：**首轮生成链已闭合并转为历史证据**。该链曾生成六 Surface / 64 Control 的首轮候选；最后两轮机械修正 run 分别为 `def63731-db01-4efc-9a84-e0897228bd0e` / client `c5d1f63a-117a-4dd2-be50-4b7a6da28b61` 与 `b2fb0d64-8f20-40fb-b0cc-7839a0db81b1` / client `2be2bb57-7435-4f0a-926b-3b760359e816`。二者均 `succeeded`、`exitCode=0`、`errorCode=null`、`endedWithUnfinishedWork=false`，并精确绑定当时 current system；用户随后提交 I15 的 11 项反馈，故该 64-Control 候选不再是 current candidate，也不得选中。
- `B0.9 candidate-review-stop`：**第二轮候选已被 I18 新需求否决并转为 historical evidence**。它不得继续作为 current review candidate、选择或冻结输入。
- `B0.10 owner-review-authority-sync`：**已闭合**。根 Design Authority、review-directed immutable source、Product Surface/Screen Context 与 verifier 已先更新；`design:system:verify`、`design:lint`、`validate-context`、`validate-harness` 和 `git diff --check` 当前通过。按 `provider-review-body-sync-plan.md`，supported registry PATCH + linked-project file API 已把 structured/registry/linked 三路正文同步为 exact `c06f403…`，30/117 supporting sets 与 stale pending revision 保持；task project 五个首轮候选文件在 revision run 前未变，current commission 已精确同步。证据为 `provider-review-body-sync-report.json`。
- `B0.11 owner-review-style-closure`：**已闭合**。首个只读 closure 误把更宽根文档切片当 canonical section，返回假阳性 digest conflict；项目 verifier 与 live structured/linked body 重验排除漂移。Corrective run `4c794f4f...` / client `52c051f5...` 使用 repository-owned `markdownSection` 边界后返回 `closure_passed` / `Turn B may proceed`，Codex / Sol / xhigh、current system resolved digest `c46307fa...`、无 plugin/snapshot，五个候选文件零变化。证据见 `provider-owner-review-style-closure-report.json`。
- `B0.12 owner-review-material-revision`：**已闭合并停在审计点**。Turn B `a984eb90-04f9-4df7-b8ac-d71866cab91a` 写入 11 点修订后因 daemon restart 被正确保留为失败记录；bounded completion `40c87101-b3bb-4306-8a19-29bf0f6e5136` / client `7d864e66-77d2-486a-b162-f6aac90f60c9` 随后以 Codex / Sol / xhigh / current system digest `c46307fa...`、无 plugin/snapshot 自然成功。独立 Browser 后续发现 I15 图 7 的精确 scroll offset 在短内容切换时仍会 clamp；bounded repair `cef724dd-1d75-426e-ae5a-7a32755a0afe` 只改 `assets/app.js` 后因 daemon restart 失败，verification `659b7cad-2125-4dcf-9c42-fc35f9ec0ac2` / client `25dab48e-9874-4ff2-b0dc-b614e256cc11` 随后以相同 exact provenance、`exitCode=0`、`endedWithUnfinishedWork=false` 自然成功且零新增写入。最终 provider/repo/review-server 五文件逐字节一致；完整证据见 `provider-final-candidate-report.json`。
- `B0.13 I18-authority-closure`：**已闭合**。Product Surface/Screen children、根 `DESIGN.md`、current immutable component/layout Source 与 verifier 已先更新；current source SHA-256 `52104dfa...`、canonical section `8ef768c6...`。`npm run design:system:verify` passed，`make validate-context` passed。生产代码/测试未改。
- `B0.14 I18-provider-body-and-commission-sync`：**已闭合**。Open Design `0.21.1` registry structured/root 与 linked project `DESIGN.md` 均由 prior `c06f403...` 精确更新到 current body `98218fd...`（41,265 chars / 62,689 bytes）；task `COMMISSION.md` 更新到 `d243ea93...`。Design-system 28 supporting files、linked project 82 non-root files、5 个旧候选文件与 identity/binding/invariant metadata 前后 byte-manifest 一致；无 active run、无 plugin/snapshot、未持久化 workspace/member identifier。证据：`provider-map-search-panel-sync-plan.md` / `provider-map-search-panel-sync-report.json`。
- `B0.15 I18-material-revision`：**已闭合**。Corrective style closure `b56021c3...` 返回 `closure_passed`、5 Surfaces/66 Controls、所有维度 `existing-covered`、零 decision-required。Material run `396d20ad...` 与 bounded completion transport 遇 daemon restart，保留写入但不充当成功证据；机械 completion `e4b2acda...` / client `3492afb6...` 自然成功。独立 inspector 证明 5/5 Surfaces、66/66 Controls、9/9 current routes，retired controls/routes、prohibited visible copy 与 unresolved items 均为 0。最终候选五文件与 provider 逐字节一致；当前 hash 见 `provider-final-candidate-report.json`。
- `B0.16 I18-candidate-review-stop`：**已到达，等待 owner 审计**。Browser 已打开并标记 `http://127.0.0.1:4173/` 为 deliverable；当前入口为 day / 390px / 100% / normal 的 Map + small spot panel。候选仍为 unselected，Goal 保持 active；未明确通过前继续禁止 downstream DRA references、selection、immutable snapshot、formal handoff、Authority Delta 与生产实现。
- `B0.17 I19-authority-closure`：**已闭合**。14项需求、research/Build-Reuse-Buy与Architecture Deliberation已写入I19；Product Surface/Screen Context已更新；current immutable component/layout Source=`docs/design-resources/miniapp-field-signal-fullscreen-density-motion/selected-source/DESIGN.md` / SHA-256 `c3f69445...`；根canonical section=`f77644d8...`（47,737 chars / 72,009 bytes）；provider exact body=`91f79eaa...`（47,786 chars / 72,060 bytes）；local commission=`00953088...`。Verifier已把I18 Source降为historical-audit-only。`npm run design:system:verify`与`make validate-context`通过；生产代码/测试未改。
- `B0.18 I19-provider-sync-and-material-revision`：**已闭合**。Existing system/task project 已同步 exact body `91f79eaa...` 与 Commission `00953088...`；28 个 system supporting files、82 个 linked-project non-root files、identity/binding 与 null plugin/snapshot 边界保持。Read-only style closure `6cfd3abc-457b-4cf1-a82c-28c737c9177b` 返回 `closure_passed`。Material revision `ffe3fe4f-c3df-46b0-9d70-e6f8ea1ff077` 自然成功；独立 Browser 找到三项机械缺陷（Map focus scroll、layer focus scroll、handle live semantics、其中前两项同属一条 scroll-owner 缺陷，以及 320/200 My reflow），bounded repair `bb57e318-d572-4c8e-86b7-52342608b136` 仅修这些 current-authority conformance 缺陷并自然成功。证据见 `provider-fullscreen-density-motion-sync-report.json`、`provider-fullscreen-density-motion-style-closure-report.json` 与 `provider-fullscreen-density-motion-candidate-report.json`。
- `B0.19 I19-candidate-review-stop`：**已到达，等待 owner 审计**。Open Design / repo / HTTP review 五文件逐字节一致；5/5 Surfaces、9/9 current routes、66/66 Controls，retired controls/routes、禁止文案与 unresolved items 均为 0。Browser 已打开并标记 `http://127.0.0.1:4173/` 为 deliverable，入口停在 day / 390px / 100% / normal 的 Map + East Lingshan small panel。候选仍为 unselected，Goal 保持 active；owner 明确通过前继续禁止 downstream DRA references、selection、immutable snapshot、formal handoff、Authority Delta 与生产实现。
- `B0.20 I20-authority-closure`：**已闭合**。12项需求、主流移动Search/Back/bottom-sheet/motion与微信生态pattern调研、Build/Reuse/Buy和Architecture Deliberation已写入I20；Product Surface/Screen Context已更新；current immutable component/layout Source=`docs/design-resources/miniapp-field-signal-compact-continuity/selected-source/DESIGN.md` / SHA-256 `07f7fa28...`；根canonical section=`b5b1b95b...`（49,327 chars / 74,275 bytes）；provider exact body=`5af9c8b7...`；local commission=`83c0313d...`。Verifier已把I19 Source降为historical-audit-only；生产代码/测试未改。
- `B0.21 I20-provider-sync-and-material-revision`：**已闭合**。Exact provider body/Commission已同步；read-only style closure `1d529676-133e-4982-87da-461da7ae00ce` 返回 `closure_passed`；material revision `1387e883-8432-4cd2-bfd2-4895240db70d` 与 bounded completion `49650a64-8c0c-4b3f-82e4-11fc6f28a100` 均 `succeeded / exitCode=0 / endedWithUnfinishedWork=false`。独立 Browser 发现并闭合透明 Search glyph 截获 Back、Favorite rail icon继承26px旧尺寸两项机械缺陷；最终五文件已同步 Provider 并逐字节一致。
- `B0.22 I20-candidate-review-stop`：**已到达，等待 owner 审计**。Provider/repo/browser current-candidate检查通过；`http://127.0.0.1:4173/` 已打开并停在 day / 390px / 100% / normal 的 Map。候选仍为 unselected，未自选、冻结、handoff 或修改生产实现。
- `B0.23 I21-authority-closure`：**closed**。13项需求、主流移动Search/list/segmented/icon/accessibility、Taro生态与开源组件库适配调研、Build/Reuse/Buy、Architecture Deliberation已写入I21；Product Surface/Screen Context、新current source与root Design Authority已更新。Current source=`miniapp-field-signal-unified-flow-forms` / `0fd87614...`，canonical section=`086088d3...`，provider body=`53eaac22...`，Commission=`79266ec6...`；`design:system:verify`、`design:lint`、`validate-context`、script syntax与provider exact sync均通过。Open Design只读closure run `0a9295c8-a6b9-48a4-8261-99cb151e3c3c` 返回`closure_passed`，13项、5 Surface、9 route与62 Control无新增owner choice。
- `B0.24 I21-provider-sync-and-material-revision`：**closed**。Material revision `b9459565-55ac-47c9-8876-296af2a2ce7e` 与机械修复 `e2607c5d-52fa-4bea-b6c3-d3fa966432a6` 均自然成功；最终五文件hash固定。Independent inspector通过5/5 Surfaces、9/9 routes、62/62 Controls、retired/prohibited/unresolved=0；Browser完成Search/panel/layer/ruler/mode/My/Contribution、320–430px、100/200% text、三主题、reduced motion/transparency、hidden scrollbar与clean-console审计，六项首轮缺陷均已复验闭合。
- `B0.25 I21-selection-freeze-handoff`：**closed**。按owner授权，以resource-selection选定current I21并保留I16–I20为rejected evidence；新immutable Source=`docs/design-resources/miniapp-field-signal-i21-selected-2026-09-03/selected-source/**`，正式handoff=`selected-handoff/miniapp-field-signal-i21-current.md`。Authority Delta为`consistent_with_current_authority`；V1 manifest枚举72 subjects / 15,696 Fact Cells / 72 Facts / 72 proofs；真实substrate feasibility覆盖62/62 component-family cells、0 blocker。Bundle与`design-resource preflight`通过，production conformance/readiness均未评估；Screen Contract adoption record已更新，生产代码与依赖未改。
- 所有门均不得通过猜测、模型自评或复制旧 token 绕过。

## P0 — 执行方案与关卡

1. **Authority closure**（I21 进行中）：已读取Context、DESIGN、current/historical sources、技术substrate、DRA与interaction skills；完成I21 Architecture Deliberation/调研；已先更新owning Context、新immutable current Source、根Design Authority与verifier，待完成全套authority checks。
2. **Persistent indexing**（持续）：维护本文件与Goal I0–I21；每个controlling decision/blocker/artifact写入L0；I14/I15/I17/I18/I19/I20/I21覆盖Goal objective中后续被owner替代或纠正的旧边界。
3. **Provider capability/input closure**（待I21 sync）：复用既有Open Design workspace/system/project/model rank；同步I21 exact body/commission并重验binding、provenance、isolation与候选五文件边界。
4. **Bounded project**（复用）：material-revise 同一个 all-resources task project/conversation；保持 exact design-system、skill、kind、intent、entry 与无 scenario/plugin snapshot，不创建第二候选项目。
5. **Commission current candidate**（I21 pending）：以refreshed commission/I1–I21为完整prompt，style-application closure通过后只material-revise I21的13项及其直接依赖；五stable Surfaces与62-Control inventory可访问/可审计，不扩展未授权UI/UX。
6. **Minimal candidate checks**：检索 canonical files/provenance；验证设计系统绑定；机械检查 routes/state entrypoints/responsive modes/a11y hooks；用 Browser 优先在真实渲染中检查关键路径。只报告当前实际建立的证据。
7. **Independent candidate audit + delegated selection**：用Browser展示并实测当前候选、完成coverage/route/state/responsive/a11y/motion审计；按resource-selection比较current direction与rejected evidence。I21 owner已授权通过后直接选择，不再停等额外批准；若审计不通过则返回同一provider project修复。
8. **Selected-resource closure**：方向选择后才读取downstream references，冻结新immutable snapshot、完成Authority Delta、proposal reconciliation、implementation feasibility、formal selected Web/App handoff与`ty-context design-resource preflight`。任何新增UI/UX仍先询问；production implementation另行处理。

## L0 — 过程日志

- 2026-09-02：用户明确要求使用 design-resource-authoring、创建 Goal、索引信息、严格遵循新设计系统；原型候选必须先停给用户审计。
- 2026-09-02：Goal 已创建，objective 含 I0–I13 持久索引；无显式 token budget。
- 2026-09-02：完成 default workflow Context reads / bounded search、根 `DESIGN.md`、Mini Program Product Surface/Screen Contract、current system/constraint、技术 substrate 阅读。
- 2026-09-02：完成 DRA 主 Skill、resource-selection、open-design-provider、implementation-feasibility，以及 Starward interaction companion 阅读；下游 references 延迟到用户通过候选后。
- 2026-09-02：`git status --short` 初始为空；尚未修改生产代码、Context、DESIGN 或 selected resources。
- 2026-09-02：Open Design 0.21.1 live daemon health 正常；provider exposes AMR/Codex agents 与 `mobile-app` design template。当前默认 API 未显示 adopted Starward design-system/project，且 top-capability rank 尚未闭合；进入 P3 只读排查。
- 2026-09-02：从 `/api/workspace/directory` 发现 personal workspace 后，structured design-system 与 24 个历史项目恢复可见；不持久化个人 workspace-member identifier。
- 2026-09-02：验证 structured design-system body 与 I5 immutable selected-source byte-equivalent，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`；P3 的 system visibility 部分闭合。
- 2026-09-02：结合 Open Design live agent schema、Codex app-server `model/list` 和 OpenAI 官方 model guidance，证明 `gpt-5.6-sol` 是当前 eligible Codex flagship capability；Open Design actual run surface 的最高 reasoning option 是 `xhigh`。P3 的 pre-run model/effort ranking 部分闭合，后续仍须核对 run effective provenance。
- 2026-09-02：完成 `commission-brief.md`，覆盖 visual binding、六 Surface、完整 material Control inventory、状态/viewport/theme/a11y/motion、Map authority boundary、最小充分输出和 provider selection。
- 2026-09-02：尝试创建 exact-bound bounded project；provider 返回 `DESIGN_SYSTEM_NOT_PUBLISHED`，无项目产生。核对 pending revision 后确认其 proposed body 非 canonical，不能接受；进入 B0.4，等待用户授权仅同步现有 provider design-system 的 published 状态与 exact selected body。
- 2026-09-02：只读核对 Open Design 0.21.1 supported PATCH 实现与 provider 文件快照；确认传入 `artifactMode=agent-managed` 可把预期持久变更限制为根 `DESIGN.md` 与 `metadata.json`，避免重生成 supporting files。已写入 `provider-publication-sync-plan.md`，包含 pre/post checks、非事务失败处理与无自动 rollback 边界；尚未执行 provider mutation。
- 2026-09-02：第三次连续 Goal 阻塞审计重新读取 live provider filesystem：`status=draft`、`artifactMode=null`、root body `e8d24553...`、metadata `e112735b...`，目标 task project 仍不存在；adopted Source 与 system workspace project 仍同为 `a3868d...`。未发生外部状态变化，也没有不越过 DRA exact-binding / 用户授权边界的剩余生成动作；Goal 应标记为 blocked，等待用户明确授权 `provider-publication-sync-plan.md` 后恢复。
- 2026-09-02：用户明确授权 provider publication，并追加 durable owner decision：新资源不保留旧设计系统/旧逻辑，不写 version；继续 Goal。已通过 `context_uiux_design` 更新根 `DESIGN.md`、`project_context/global.md`、`project_context/architecture.md` 与 Mini Program Screen Contract：I6 退役为 historical evidence only，current product/interaction semantics 只从 I2/I3 读取，visible no-version rule 闭合；`Context Delta: required`。
- 2026-09-02：按授权完成 Open Design publication sync。provider metadata `draft → published`、`artifactMode → agent-managed`、root `DESIGN.md` `e8d24553... → a3868d...`；structured/system/adopted body 同 hash。pre/post snapshot 证明 30 个 supporting files 未变、stale revision 未接受、system project 未写入、目标 project 未创建。B0.4 闭合。
- 2026-09-02：当前候选校验重跑通过：`npm run design:system:verify` status `passed`，Mini Program `previous_system_status=historical-audit-only`、`screen_resource_status=miniapp-retired-operations-current`；`make validate-harness` 通过且 touched modularity warning=0；`git diff --check` 无格式错误（仅报告 Git 的 LF→CRLF 工作区提示）。
- 2026-09-02：完成 style-application 复核后，B0.3 升级为 decision-required：完整全量候选必须包含 Map/Finder，但当前 I1 排除其新视觉权威，I6 又已按 owner 决定退役。创建 bounded project / 正式 run 前必须询问用户是否授权只扩展 Map/Finder 的产品 UI 层；未授权前不得以旧系统、占位样式或模型默认审美补位。
- 2026-09-02：新增 task-local `DECISION_REQUIRED.md`，把请求授权范围限制为小程序自有 Map/Finder UI（Search/filters/Sheet/controls/marker/callout/legend 及其状态、响应式、a11y、motion），并明确排除 provider/basemap/native-map、产品/业务/数据/API/route/state 逻辑、旧视觉和可见 version 标签。该记录不构成授权，Goal 继续等待用户明确答复。
- 2026-09-02：用户回复“继续”，按紧邻的精确授权问题解释为同意 bounded Map/Finder 产品 UI 视觉扩展。通过 `context_uiux_design` 新建 immutable Source `docs/design-resources/miniapp-field-signal-map-finder-ui/selected-source/DESIGN.md` (`b4cd506d...`)，更新根 canonical section (`6ac7bf...`) 与最小 owning Context；未修改生产代码、产品/业务/数据/route/state 语义或 provider/basemap/native-map visual authority。
- 2026-09-02：Authority 更新后的 `npm run design:system:verify` 通过并报告 Map/Finder current/provider excluded；`npm run design:lint` errors=0（33 个既有 YAML native-profile orphan-token warnings）；`make validate-context` 通过；`git diff --check` 无格式错误，仅 Git 报告 verifier 的 LF→CRLF 工作区提示。B0.3 闭合，进入 B0.5 provider current-body sync。
- 2026-09-02：恢复 Open Design 0.21.1 daemon；确认 structured/provider root 仍为 base-only `a3868d...`、published/agent-managed，30 个 supporting files 聚合 `1ced0c8d...`、stale revision pending、目标 project 不存在。将根 canonical section 与 provider 完整 Markdown 区分为 `6ac7bf...` / `4c86d52c...`，写入一次性 `provider-current-body-sync-plan.md` 与无敏感标识的 pre-mutation manifest。
- 2026-09-02：执行一次 registry PATCH；root body 成功变为 `4c86d52c...` 且所有隔离项保持，但 structured GET 连续三次仍为 `a3868d...`。按计划停止且未创建项目/运行。只读 provider implementation 证明 GET/run 优先 linked system workspace `DESIGN.md`；已存 partial report，并把 recovery 限定为 supported project-file API 对这一份文件的 exact overwrite，不涉及 UI/UX 或产品语义变更。
- 2026-09-02：按 revised recovery 通过 supported project-file API 精确覆盖 linked system workspace `DESIGN.md`。Structured/run-resolved、registry root、linked project 三路 body 现均为 `4c86d52c...`；所有 supporting aggregates、pending revision 与 binding 保持，B0.5 闭合。
- 2026-09-02：用户再次强调“全部设计资源用新的设计系统重构，不只是地图页”。已重申并固化：Map/Finder 仅是前置 authority gap；正式候选必须覆盖六个 stable Product Surfaces、全部 material Control、主题/状态/viewport/a11y/motion，且所有页面都不得引用旧设计系统。
- 2026-09-02：首次 bounded project create 的 skill/design-system/name 都正确，但 Open Design 在 `design` session mode 自动附加了未选的 `example-web-prototype` 桌面模板；项目 0 files、尚无 generation。已保存 `provider-project-create-partial-report.json`，禁止带该额外模板运行；只删除本任务刚创建的空壳并以同 ID、无 scenario 路线重建。
- 2026-09-02：验证空壳 0 files / 0 runs 后安全删除并以 `chat` session route 重建；当前 project 无 scenario/plugin snapshot，exact `frontend-design + designSystemId` 绑定成立。已上传并读回全量 `COMMISSION.md` (`52279d72...`)；创建证据见 `provider-project-create-report.json`，正式首轮见 `provider-generation-plan.md`。
- 2026-09-02：首次 run request 仍被 Open Design 在 run resolution 自动注入 `example-web-prototype` 并把 snapshot pin 回 project。Run 尚未生成文件，已安全取消；项目仍只有 `COMMISSION.md`。已持久化 rejected-run 证据，corrected route 将 project kind 改为 provider 无 default scenario mapping 的 `design-resource` 后重建，不降低 skill/model/reasoning/design-system 或全量范围。
- 2026-09-02：确认唯一旧 run 为 canceled、唯一 project file 为可重放 commission 后，删除 task-owned provider shell 并用同 ID / `kind=design-resource` 重建。当前无 scenario pin、无 active run；Open Design 保留 canceled run 历史记录但不会参与 corrected run。证据见 `provider-project-corrected-report.json`。
- 2026-09-02：首个 `kind=design-resource` run 成功避免所有 plugin/snapshot，且最终 state 记录 Codex/Sol/xhigh/frontend-design/current-design-system 全部精确值；但本地校验在 provider 异步填充这些字段前过早取消，0 files generated。已保存 `provider-run-premature-cancel-report.json`，后续必须等待 provenance 非空而非仅等待 state 文件出现。
- 2026-09-02：正式 corrected run `f0a7f04b...` 已启动；稳定 provenance 验证通过，design-system selection source=request、digest `a5966d3d...`，无 scenario/plugin。开始有界监控全量生成；尚未把 provider success 视为候选验收。
- 2026-09-02：Run `f0a7f04b...` provider status=succeeded，但 artifact=0、deliverableValid=false；inner Codex完整读取 commission 后说明 `chat` 是 Ask mode，要求切换 Design mode。已保存 `provider-run-ask-mode-report.json`；下一条只切 session mode，project kind 继续阻止 default scenario。
- 2026-09-02：Design-mode continuation `2954b326...` 已启动；Codex/Sol/xhigh/frontend-design/current-system provenance 稳定，plugin/snapshot 为空，具备写入 project 的执行模式。开始有界监控实际文件产出。
- 2026-09-02：Design-mode run `2954b326...` 已生成 `index.html` 与 `assets/styles.css`，随后在生成大型交互脚本期间被 provider 的 600 秒 inactivity watchdog 中止；精确分类 `timeout / inactivity_timeout`、`resumable=true`、`endedWithUnfinishedWork=true`、`deliverableValid=false`。该结果不是候选，不能送审。CLI `run continue` 创建的 `e043cea3...` 虽恢复 native session，却落回 Ask mode，0 新 artifact；同样只作诊断。
- 2026-09-02：通过 supported `/api/chat` Design-mode continuation 续接同一 conversation/native session：run `f9387ec3-3794-4204-9e83-e8a68f686d9d` / client `4d8a145b-b8a2-40e8-a3a5-ff1ff824b94f`，start event 精确读回 Codex / `gpt-5.6-sol` / `xhigh` / service tier default，current design-system digest 保持 `a5966d3d...`，plugin/snapshot 为空。恢复指令要求保留现有入口/样式、把 `assets/app.js` 分段写入并继续完成 `coverage.json`、`README.md` 与自验；范围和 UI/UX authority 均未改变。
- 2026-09-02：Run `f9387ec3...` 按有界块完成六 Surface 的 `assets/app.js`（约 63 KB），其内置 `node --check` 返回成功；随后 Open Design daemon 在选择器盘点后自动重启，run 被标记 `DAEMON_RESTARTED`，尚未生成 coverage/README，仍非候选。重启后的外部只读复核同样确认 `app.js` syntax exit 0。
- 2026-09-02：在新 daemon endpoint 上通过 supported `/api/chat` 再次 Design-mode 续接同一 project/conversation/native session：run `cd285237-ba74-4fd0-a064-405558c461e8` / client `28cd91c3-e8f4-4433-b7f7-dd084f5cf31c`，start event 继续为 Codex / `gpt-5.6-sol` / `xhigh` / service tier default，exact current design-system binding 与无 plugin/snapshot 保持。本轮只完成 `coverage.json`、`README.md`、mechanical self-check 与必要机械修复，不重做或改变 UI/UX。
- 2026-09-02：最终机械修正 continuation `def63731...` 完成并自然退出。修复 Finder Escape 事件双派发、外部审计切换误聚焦搜索、搜索建议 spot identity、320px/200% collapsed analysis bar、表单错误即时清除以及 Map representative selected/aria 同步；六 Surface / 64 Control 未变。
- 2026-09-02：独立 Browser 在最终 JS/CSS 上验证 132 个 route/environment 组合（11 routes × `[320/200, 375/100, 390/200, 430/100]` × day/night/observation）零失败：Surface/route/theme/width/text 精确，phone/root 无横向溢出，产品交互不逃逸 phone root，最小可见按钮 44×44，phone 无错误 `aria-pressed`。
- 2026-09-02：Browser 关键路径通过：Map audit switch 保持 clean state；Finder `closed → peek → expanded → Escape → peek → Escape → closed`；第二搜索建议精确选择“示例林场”；marker/callout/Detail/Night/Orientation 与所选时间同步；Choice Bar 键盘 roving/focus、收藏、证据展开、设置 radio/switch、reduced-motion、observation entry、XSS-safe literal rendering 均符合当前候选。
- 2026-09-02：Browser 表单路径通过：Profile unsafe URL 阻断并在修正后即时清除 error/`aria-invalid`；Import source/双权利声明逐步阻断与即时清除、特殊字符草稿保留；Contribution location consent 与真实 file-chooser 媒体权利分支均在纠正后即时清除 error/`aria-invalid`，观察时间初始保持空白。
- 2026-09-02：肉眼巡检发现 Settings 的 `.switch-row` 遗漏 browser reset，导致 native ButtonFace 灰底和 intrinsic-width 收缩。该项属于当前设计系统直接适用性的 CSS 缺陷，不是新 UI/UX 方案；同一 provider continuation `b2fb0d64...` 仅补齐 full-width / `appearance:none` / transparent token surface，未改逻辑或其他视觉。修后 observation 下三行均与 348.4px 容器等宽、透明背景、warm-red text，随后 132 组合全量重验仍零失败。
- 2026-09-02：320px/200% Map 最终实测：stage 321.6px、collapsed analysis bar 81.1px、bar 上方连续可用地图 184.5px，bar 与 Sheet handle/location/map note 零相交，root 横向溢出 0；最终浏览器 console warning/error 为 0。
- 2026-09-02：当前 provider/candidate 五文件 SHA-256：`index.html=0971b2a918c4c26ea523c459dde26170044389287319caba18b2427259cfb4af`；`assets/styles.css=53a98b0c0963b0dd74e5b98c3620c534889451852d68f82bd3f10e9c59929c3f`；`assets/app.js=b86e3acceedea376d4dbe7cc67002672ab69aa36983ece8185dce84a636b7dba`；`coverage.json=82e1bbbabfbfe8732aaa45ea847607c0d9e521644ee0cf6192006469a3b15c96`；`README.md=81628707588277661c90033ce484bd6c431b5b9bab03a1fd28924b863f68d6e0`。Repo-local `candidate/**` 与 provider 五文件逐字节一致；`node --check` 与 coverage parse（6 surfaces / 64 controls）通过。
- 2026-09-02：当前进入 DRA `Design Resource Review & Selection Stop`。Live review URL 为 `http://127.0.0.1:4173/`；server 必须保持运行并把 Browser 标记为 deliverable。用户明确通过前 Goal 不完成，下游 DRA references 继续保持未读取。
- 2026-09-02：候选最终证据已聚合到 `provider-final-candidate-report.json`。Current-candidate project checks 全部通过：`npm run design:system:verify` passed；`npm run design:lint` errors=0、33 个既有 native token warnings；`make validate-context` passed；`make validate-harness` passed 且 touched modularity warnings=0；`git diff --check` exit 0（仅既有 working-tree LF→CRLF 提示）。HTTP review server 的五个资源 hash 与 repo-local `candidate/**` 五文件逐字节一致。
- 2026-09-02：用户提交 10 张审计截图与 11 项反馈，并明确当前流程是“DRA 设计资源 → 需求变更 → 设计资源”。首轮候选转为 rejected/current-candidate evidence；I15 固化地图/Finder Sheet 重排、图层控制、稳定 active chip/半星装饰、通知节制、收藏动效沿用、移除演示数据、天象关联窗口、跳顶 bug、今晚夜空去 tabs、全屏方位天空与刻度时间轴，以及同步更新当前设计系统的授权边界。Goal 已由用户输入恢复为 active；下游 selection/handoff 仍未获授权。
- 2026-09-02：Owner 纠正“按新系统重做全部六个界面”的表述。本轮 revision diff 精确收敛到 I15 的 11 项反馈及直接依赖；六 Surface 只是最终资源覆盖与全局设计系统一致性检查边界，不能用来授权重构未受影响界面。已写入 I17 并同步修订 commission。
- 2026-09-02：通过 supported project-file API 将 I17 修订后的 `COMMISSION.md` 同步到同一 Open Design task project，provider 与 repo bytes 精确一致，SHA-256 `1c442b848b6b6507b1c3238f0d51c951c03666a12e2f63621de10eeff9b17c39`；未改候选五文件、project binding 或 plugin/snapshot 状态。
- 2026-09-02：完成 owner-review material revision 的 style-application closure。首轮只读 run 的 overbroad-section 假冲突经 `npm run design:system:verify` 与 live structured/linked body 复核排除；纠正 run `4c794f4f...` 精确确认 10 个适用维度全部 `existing-covered`、无 projected/decision-required，revision diff 仅 I15 11 点，六 Surface 仅 coverage envelope，候选五文件保持原 hash。Turn B 获准启动。
- 2026-09-02：Turn B run `a984eb90...` / client `293fbff9...` 已按 I17 对五个候选文件落下 11 点相关增量，并报告 11 条 route 结构断言通过；准备调用 provider preview/export 检查时 daemon 自动重启，terminal 重建为 `failed / DAEMON_RESTARTED`。现有写入保留但尚不构成候选完成。下一轮 `7d864e66...` 只允许完成 file-local checks、必要机械修复及 coverage/README 收口；Browser 由主流程独立执行，禁止借恢复重做或扩大 UI/UX。
- 2026-09-02：Bounded completion run `40c87101-b3bb-4306-8a19-29bf0f6e5136` / client `7d864e66-77d2-486a-b162-f6aac90f60c9` 自然成功，`exitCode=0`、`endedWithUnfinishedWork=false`；effective provenance 为 Codex / `gpt-5.6-sol` / `xhigh` / `frontend-design` / current system digest `c46307fa...`，plugin/snapshot 为空。Current candidate 收敛为六 Surface / 11 routes / 63 Controls，修订 diff 仅 I15 11 点。
- 2026-09-02：独立 Browser 在修订候选上发现 I15 图 7 的剩余机械缺陷：Detail 从较长 segment 切到较短 segment 时，浏览器会因新文档高度不足把 `.surface-page.scrollTop=760` clamp 到约 `618.4`；没有跳到零且焦点正确，但违反 current Source 的 exact offset / stable geometry 要求。该问题不需要新 UI/UX 决策。
- 2026-09-02：Bounded repair run `cef724dd-1d75-426e-ae5a-7a32755a0afe` 只在 `assets/app.js` 中加入“捕获旧 panel block size → render → 将该最小高度施加给新 panel → 恢复 scrollTop → `preventScroll` 聚焦”的修复，随后 daemon restart，故 run 正确记录为失败且不作成功证据。Bounded verification run `659b7cad-2125-4dcf-9c42-fc35f9ec0ac2` / client `25dab48e-9874-4ff2-b0dc-b614e256cc11` 在 exact current binding 下静态复核通过、零新增写入并自然成功；修复随后以单文件 patch 同步到 repo candidate。
- 2026-09-02：最终 Browser 精确滚动回归通过 48/48：4 widths × 2 text scales × normal/reduced motion × Overview/Guides/Site 三个真实可见区域 CUA 点击，均保持点击前精确 scrollTop（容差 ≤0.1px）、所选 segment 与逻辑焦点。首个 200% 坐标批次因测试按钮仍在可见区外而未命中，已按测试证据作废，并由 visibility-aware CUA 全量重跑替代；它不是产品失败。
- 2026-09-02：最终 Browser 全量矩阵通过 132/132（11 routes × `[320/200, 375/100, 390/200, 430/100]` × day/night/observation）；额外复测 Finder default-peek / unified Sheet / Escape、73.6px stable quick choice 与 22px `-6/-6` 半露星形、普通动作零 floating feedback、生产 Favorite ritual / reduced motion、全屏 Orientation pose / error recovery、calibrated 11 ticks 均通过；console warning/error=0。
- 2026-09-02：最终 candidate hashes：`index.html=ef7b50bb1969d0761ff02513c78e65e6fe5e4efc13c075321469589452f9c707`；`assets/styles.css=8104bb89ef2261e4bd8bb0cf72014cd4769994ffd2fc5819bd964e9b63d24085`；`assets/app.js=505e80795bf808037dc08410fa29bc72f975be6867b45b342fba03a416f7d312`；`coverage.json=1883b569639d5d7dec863483fd1bfb72edbb561201780b0b86ba8aef37bb562e`；`README.md=49ffbe936604676067045fd222fa22e5edcc3ede5cc1d8e7393d77377a03e7cb`。Provider / repo / HTTP review server 三路逐字节一致。
- 2026-09-02：当前候选项目检查全部通过：`node --check` 与 coverage parse（6 surfaces / 63 controls / 0 decision-required）；`npm run design:system:verify` passed；`npm run design:lint` errors=0、33 existing native-profile warnings；`make validate-context` passed；`make validate-harness` passed 且 touched modularity warnings=0；`git diff --check` exit 0（仅 working-tree LF→CRLF 提示）。
- 2026-09-02：已刷新 `provider-final-candidate-report.json` 并回到 DRA `Design Resource Review & Selection Stop`。Live review URL 保持 `http://127.0.0.1:4173/`；候选仍未选择，Goal 保持 active，用户明确通过前继续禁止读取 downstream DRA references、冻结、正式 handoff、Authority Delta 与生产实现。
- 2026-09-03：Owner 提交 10 张补充截图与 I18 七组需求：Map 仅 floating Search、dedicated Search page、统一 prefix-icon filters + overlapping translucent pale-yellow star、image-backed full-width results、Curved Time Ruler、hidden+small/medium/large spot information panel、media→Search/layer transition、right section rail、bottom Want/Share/Cloud rail、retire standalone detail/night/professional/targets routes，以及 app-wide compact-but-clear density。前一候选立即转为 rejected evidence。
- 2026-09-03：重新读取并适用 `context_surface_contract`、`context_uiux_design`、`design-resource-authoring` 与 `starward-interaction-design`；完成 I18 Architecture Deliberation 与 Build/Reuse/Buy。Generic icons 选择 existing `SemanticIcon` + local Lucide ISC subset；rounded star/astronomy assets 和 Curved Time Ruler bounded self-authored；未引入完整 TDesign 或 React-Native-only ruler dependency。
- 2026-09-03：`Context Delta: required` 已完成：Mini Program 稳定拓扑收敛为五 Surface，Map 拥有 Search child + continuous spot panel，full-sky 独立成 `miniapp-sky-orientation`；更新 Product Surface、Screen Contract、Control inventory、route/state/gesture/share/recovery 与全局/architecture references。生产代码、app config 与测试未修改。
- 2026-09-03：通过 `context_uiux_design` 新建 current immutable component/layout Source `docs/design-resources/miniapp-field-signal-map-search-spot-panel/selected-source/DESIGN.md`，SHA-256 `52104dfa...`；更新根 canonical section，SHA-256 `8ef768c6...`、provider exact body `98218fd2...`。先前 Map/Finder 与 review-directed Sources 仅为 historical audit provenance，禁止 current generation/fallback。
- 2026-09-03：Authority checks：`npm run design:system:verify` passed，并报告 `map_search_spot_panel_status=selected-current`、prior two sources historical-only；`make validate-context` passed。I18 commission 已重写，repo SHA-256 `d243ea93...`；下一步为 B0.14 provider exact-body/commission sync，尚未运行候选 revision。
- 2026-09-03：B0.14 provider sync 完成：supported API 将 registry structured/root 与 linked project exact body 同步为 `98218fd...`，task Commission 为 `d243ea93...`；supporting/system-other/candidate byte manifests、identity、binding、`published/agent-managed` 与 null plugin/snapshot 边界全部保持。进入 B0.15 read-only style closure + material revision。
- 2026-09-03：首次 I18 style closure run `9888d600...` 严格只读并发现 task-local count typo：计划/提示写 67，而 canonical inventory 实为 66=`5+15+18+5+9+6+8`；Control key/owner/UIUX 无缺项。已修正索引与 provider plan/runner，使用新 idempotency key 重跑 closure；初次 `decision_required` 作为诊断，不要求 owner 做虚假选择。
- 2026-09-03：Corrective style closure run `b56021c3...` 完成：`closure_passed`，5 Surface/66 Control 与所有 current design dimensions 均 `existing-covered`，无 missing owner choice/decision-required；provider provenance 为 Codex/Sol/xhigh/current system resolved digest `ad4f6e37...`、null plugin/snapshot。Run 后候选五文件 byte-identical，允许进入 Turn B。
- 2026-09-03：Turn B 首次 transport run `396d20ad...` 在 provider daemon restart 时 `ECONNRESET`，重启后无 terminal run record，故不作为成功证据。Provider 持久化了新的 `index.html`、`assets/styles.css`、`assets/app.js`，而 coverage/README 仍为旧大小。按 uncertain-transport 规则只使用同一 client request `f3c509ba...` 继续同一 bounded revision；不创建第二 candidate identity、不扩大 scope。
- 2026-09-03：同 client request 的 idempotent readback 重建出 `396d20ad... = failed / DAEMON_RESTARTED / exit 1`，未启动第二 writer；原 run 不能完成 B0.15。使用新的 bounded completion client `b2688309...`，仅保留/修复已落地 current HTML/CSS/JS、替换 stale coverage/README、运行机械检查；禁止重新做视觉探索、增加 scope 或复活 retired keys。
- 2026-09-03：Completion transport 亦被 daemon restart 中断。独立 provider inspection：current architecture markers 均存在，所有 listed retired control/route occurrences=0、可见“演示数据”/version=0；但 coverage/README 仍 byte-identical 于旧候选，literal `data-control` 集合 59/66，缺 7 个已存在语义元素的稳定 audit marker。允许 client `3492afb6...` 仅补七个 marker、更新 coverage/README 与运行机械检查；禁止改变布局/样式/产品交互或重新获取图片。
- 2026-09-03：Mechanical completion run `e4b2acda-06cd-4199-b9ac-a47d92de428a` / client `3492afb6-a513-401c-b6a8-3d62977b17aa` 自然成功；current candidate 收敛为 5 stable Surfaces / 9 current routes / 66 material Controls。独立 inspector 证明 66/66 control markers、retired controls/routes 0、可见“演示数据”/release label 0、unresolved 0；provider、repo candidate 与 live review server 保持逐字节一致。
- 2026-09-03：Browser current-candidate 审计通过：Map panel hidden/small/medium/large 与真实纵向拖动；large media→Search 渐变和 layer threshold；非点位点击隐藏；Overview/Astronomy rail 平滑定位且 page/app scrollTop 保持 0；Search 独立 route、统一 icon filters、28px 半透明淡黄 overlapping star、卡片整项选择；Curved Time Ruler 横拖/键盘/滚动不变量；Cloud→`sky/detail`；full-sky pose、权限恢复与语义对象降级；9 routes、320px+200%、reduced-motion/transparency、observation palette 和 error recovery。Console warning/error=0。
- 2026-09-03：Browser 复验识别并在授权范围内机械修复候选缺陷：filter-star specificity、Map panel/analysis click bubbling、handle click-vs-drag、time ruler render scroll preservation、audit-selector overmatch、Favorite selector scope、Search 44px、fieldset reset、`hidden` visibility、recovery z-index/hit target。最后修正 Favorite satellite `nth-child` 偏移；current actual 为 main 26px/180ms、3 satellites × 420ms、delay 60/100/140ms，状态关闭后不残留动画或 floating notice。
- 2026-09-03：最终 candidate SHA-256：`index.html=92f65706ace5ad7ab1d52c40a9b4afb54aeafb56c749a7186916c3b73151f3e5`；`assets/styles.css=8ec5192a10882b74d56152ca0c52e33a3a1aa9d7baae3a4fe3721c8faddb216f`；`assets/app.js=23e609dfb60ceacfa9411c2711ffa8661db6c82906461b1768483c1a05d5bfb7`；`coverage.json=33e54617f8fc87987327c899e0f4de28b17f6ba642b295931b081e596f17445f`；`README.md=520808c11073438ed240cd521d1a01f1cd5416fb67d6911eee7c4220c9a39182`。
- 2026-09-03：Final current-candidate checks：Open Design candidate inspector 与 exact current-system inspect passed；`node --check` passed；`npm run design:system:verify` passed；`npm run design:lint` errors=0、33 existing native-profile warnings；`make validate-context` passed；`make validate-harness` passed 且 touched modularity warnings=0；`git diff --check` exit 0（仅 line-ending advisory）。证据已刷新至 `provider-final-candidate-report.json`。
- 2026-09-03：已到达 I18 DRA `Design Resource Review & Selection Stop`。Browser 可见、已标记 deliverable，入口 `http://127.0.0.1:4173/` 停在 day / 390px / 100% / normal 的 Map + small spot panel。候选 unselected，Goal active；owner 明确通过前 downstream references 未读取，禁止 selection、immutable snapshot、formal handoff、Authority Delta 与生产实现。
- 2026-09-03：I19 provider sync 完成并经 current readback 重验：structured/root/linked body=`91f79eaa...`，Commission=`00953088...`，28 个 supporting 与 82 个 non-root file manifests、project binding、published/agent-managed、null plugin/snapshot 与 active run=0 均保持；current readback 报告为 `provider-fullscreen-density-motion-sync-report.json`。
- 2026-09-03：I19 read-only style closure run `6cfd3abc-457b-4cf1-a82c-28c737c9177b` / client `08cd2a96-a7b1-4f06-bfe5-0efb2b573735` 以 Codex / requested `gpt-5.6-sol` / `xhigh` / current system digest `0da7e433...` 自然成功，16 个 current design dimensions 均 existing-covered，零 owner choice / decision-required，候选五文件未改；runtime 未报告 resolved model，故不把 requested model误写为 resolved provenance。
- 2026-09-03：I19 material revision run `ffe3fe4f-c3df-46b0-9d70-e6f8ea1ff077` / client `e7bb327e-1a7c-46c5-ab0c-0c98d258881f` 自然成功并生成 current deliverable。独立 Browser 随后发现 focus 可编程滚动 Map scene、layer focus 使场景下移、panel handle 在尺寸切换后语义未刷新及 320px/200% My flow overlap；这些均为 current Source 的机械 conformance 缺陷，不需要新增 UI/UX 决策。
- 2026-09-03：Bounded repair run `bb57e318-d572-4c8e-86b7-52342608b136` / client `dd2bdfd3-150a-46ff-a49e-3be27157e924` 只修复上述缺陷，`succeeded / exitCode=0 / endedWithUnfinishedWork=false`，保持 exact current design-system digest `0da7e433...`、无 plugin/snapshot。修后 small/medium/large 与 layer focus 的 `.map-scene.scrollTop` 均为 0，layer sheet 180px 且 bottom gap=0，handle 三档 name/value 实时更新，320/200 My overlap=0 且 horizontal overflow=0。
- 2026-09-03：最终 Browser current-candidate 审计：9/9 routes 在 320px/200% 下 page horizontal overflow=0、visible scrollbar risks=0；large panel 与 app viewport inset-zero，rail center delta=0；真实 CUA large→medium 下拉和 left-edge return 均通过；无图洪水口村在 small/large 的 media node count=0、content gap=18/36px；Search stationary frame delta 全为0、autofocus/outside blur通过；Full-Sky ruler 13 ticks，center opacity/scale=1/1、edge=.18/.46，键盘 22:00→22:30；My day background纯白，18/15/12.5/10.5px信息层级且无新增高德职责或噪音文案。
- 2026-09-03：最终候选五文件 SHA-256：`index.html=c80f1abf5ede17ca58797e7c46c5a3317d4a89678dcab2e0f67c882716201bc1`；`assets/styles.css=972e1c7ac462f4b742c75864607b99d1446ea68826b1f65a35cc6e7f9cee6463`；`assets/app.js=370891785e7e2066daa90db1b9238f9bde422853d48af8b4c0b98795dfa438f9`；`coverage.json=e52b291419fa82d961153614b7f9a93a234e9f5080c22d9f59fd83f2192bc615`；`README.md=2823b272c2de5952f92d6d53fac77abefef261b715f91e28bec2ec356f3d624d`。Open Design / repo / HTTP review 三路逐字节一致。
- 2026-09-03：最终 current-candidate checks：current inspector passed（5/5 Surfaces、9/9 routes、66/66 Controls、retired/prohibited/unresolved=0）；candidate 与 inspector `node --check` passed；`npm run design:system:verify` passed；`npm run design:lint` errors=0、33 existing native-profile warnings；`make validate-context` passed；`make validate-harness` passed且 touched modularity warnings=0；`git diff --check` exit 0（仅既有 line-ending advisory）。
- 2026-09-03：已到达 I19 DRA `Design Resource Review & Selection Stop`。Browser 可见且候选已标记 deliverable；入口 `http://127.0.0.1:4173/` 停在 day / 390px / 100% / normal 的 Map + East Lingshan small panel。当前候选仍未选择/冻结，Goal 保持 active；downstream DRA references 仍未读取。
- 2026-09-03：Owner 提交 8 张补充截图与 I20 的 12 项反馈；I19 候选立即转为 rejected evidence。范围精确为 Search 返回/静止锚点、无标题紧凑 filters、稳定 disclosure、52% 可透图结果、image-backed layer sheet、nav-safe handle-only panel、统一 compact action rail、floating contiguous section rail、objective-only document、无框 Curved Time Ruler、headerless Full-Sky 与 marker-to-medium default及直接依赖；五 Surface 仅为回归 envelope。
- 2026-09-03：按 `context_uiux_design`、`context_surface_contract`、`design-resource-authoring` 与 `starward-interaction-design` 完成 I20 Architecture Deliberation、主流移动 Search/Back/bottom-sheet/motion 调研与 Build/Reuse/Buy。生产时间轴选择 Taro enhanced horizontal `ScrollView` 的滚动生命周期/事件/隐藏 scrollbar，再由 project-local bounded projection负责弧线、衰减和 snap；未发现可直接满足 WEAPP+曲线+当前节奏的单一组件，未引入第二 UI system。
- 2026-09-03：`Context Delta: required` 已完成。Current immutable component/layout Source=`docs/design-resources/miniapp-field-signal-compact-continuity/selected-source/DESIGN.md` / SHA-256 `07f7fa28...`；root canonical section=`b5b1b95b...`；provider body=`5af9c8b7...`；Commission=`83c0313d...`。I19及更早component/layout Sources均为historical-audit-only；生产代码与生产测试未改。
- 2026-09-03：I20 read-only style closure `1d529676-133e-4982-87da-461da7ae00ce` / client `ef1f8688-9509-46ce-9ba5-5af17edcfec6` 自然成功并返回 `closure_passed`。Material revision `1387e883-8432-4cd2-bfd2-4895240db70d` / client `305dbbad-f929-4daa-a1ec-4d12d5a02bea` 自然成功且 deliverable valid；两者都绑定 exact current design-system digest `a073b393...`、null plugin/snapshot、无 unfinished work。
- 2026-09-03：独立 Browser 首轮审计发现 Search visible Back仍被透明 decorative Search glyph截获、Search外部失焦后overlay未关闭、decorative glyph错误可交互、section rail遗留深色selection stripe、panel与primary nav有0.8px overlap五项机械缺陷。Bounded completion `49650a64-8c0c-4b3f-82e4-11fc6f28a100` / client `d70a7d60-9f8c-4f7d-9b5e-44f737cb5708` 自然成功并闭合后四项及历史退出状态机；最终 Browser又将透明 glyph命中层显式设为non-interactive，并把Favorite rail旧26px视觉尺寸收敛到与Share/Cloud一致的12px。两项均为current exact Source的机械conformance repair，不新增设计取舍。
- 2026-09-03：最终 Browser回归：Map/Search field rect均为`x=475.9,y=113.6,w=364.4,h=44`；autofocus、空白tap失焦/overlay关闭、visible Back连续返回、system Back、left-edge Back均通过；trailing x与可见“筛选条件”均为0。Layer三张image-backed cards、332rpx高度、无x/off row、trigger开闭坐标不变；marker默认medium；panel与nav gap=1.2px；large rail中心误差≈0、rail/active shadow=none；action rail=44px且三icon均12px。Full-Sky boxed header=0，ruler border/radius/shadow/scrollbar均为none；320px/200% My/Search横向溢出0；browser warning/error=0。
- 2026-09-03：最终 candidate hashes：`index.html=0346c7f738cf853dd776654257b0d8fe5f736f1423fa9bdf42ebaaddc950871b`；`assets/styles.css=1f1262b036220c6b33e178e1f4d49043a7cdf3244c1f45ddc44d33abd0e52002`；`assets/app.js=afa995905e0bc94b2e54e89c50ba8ddf5e6d494fa9c77a7112d2ccf0f610ee03`；`coverage.json=2670fb10c00ababb4a6a69c2abede37d48b8e36ffadf4d59e7606d3efc5616a7`；`README.md=3a9c3c7c2d712fde35d0c852ee93f08682c4cddbf5f104174b78ca115377b603`。Open Design/provider、repo与HTTP review逐字节一致；63/63 Controls、5/5 Surfaces、9/9 routes、retired/prohibited/unresolved=0。证据见`provider-compact-continuity-candidate-report.json`。
- 2026-09-03：最终 current-candidate checks：candidate/inspector `node --check`与coverage/report JSON parse通过；Open Design candidate inspector及current-system readback通过；`npm run design:system:verify` passed；`npm run design:lint` errors=0、33 existing native-profile warnings；`make validate-context` passed；`make validate-harness` passed且 touched modularity warnings=0；`git diff --check` exit 0（仅line-ending advisory）。Engineering Quality Conformance/Architecture Conformance：current Source/Context/Design owner、single Search/panel/layer/time owners、provider binding、no-production-code boundary与candidate-review stop均保持。
- 2026-09-03：已到达 I20 DRA `Design Resource Review & Selection Stop`。Browser保持可见并将`http://127.0.0.1:4173/`标记deliverable，入口恢复为day / 390px / 100% / normal Map。候选仍未选择/冻结，Goal保持active；owner明确通过前继续禁止downstream selection、immutable snapshot、formal handoff、Authority Delta与生产实现。
- 2026-09-03：I21 exact provider sync完成：structured/root/linked body=`53eaac22...`，Commission=`79266ec6...`，28个supporting与82个non-root file manifests、项目绑定、`published/agent-managed`、null plugin/snapshot及旧候选五文件hash均保持。首个closure run因provider daemon restart失败且不作结论；收紧为只核对注入文件后，恢复run `0a9295c8-a6b9-48a4-8261-99cb151e3c3c` / client `e0b35d8e-7d04-47ea-bc5c-3f126acbf4bd`自然成功，返回`closure_passed`，13项、5 Surface、9 route、62 Control与reuse-first映射均闭合，零新增owner choice，候选五文件未改。
- 2026-09-03：I21 material revision `b9459565-55ac-47c9-8876-296af2a2ce7e` 后，Browser审计发现并由同一current resource的机械修复run `e2607c5d-52fa-4bea-b6c3-d3fa966432a6`闭合六项实现缺陷：Search suggestion原子态/空白、无图full-width、large rail overlap、panel-body误dismiss、三态direct tap、submit terminal state。最终candidate=`index b30d751f... / styles 5284cc77... / app 3cbc5f8e... / coverage 0dcbeef9... / README 8e7d6d15...`，Provider/repository/HTTP逐字节一致。
- 2026-09-03：按owner明确授权完成DRA downstream。Resource selection选定I21 current方向；生成新immutable selected package与正式`implementation_app` handoff。Authority Delta validation通过且current；bundle成功；最终preflight报告Input closure valid、1 target、1 feasibility input、62 feasibility cells、0 blocker、72 subjects×8 dimensions（9 grouped rows）、0 acceptance blocker，且明确`Production conformance: not evaluated`。Screen Contract记录新target与exact hashes；旧候选/旧selected packages保持不可变历史证据。
- 2026-09-03：最终Engineering Quality Conformance识别到formal authoring carrier与immutable Open Design interaction fixture被touched-source modularity按生产模块审查；按既有`STARWARD-DRA-MOD-001`在`.codex/config.yaml`登记两个有界waiver，均由`design-system-maintainers`负责并带tracking/移除条件。例外不覆盖生产代码，也不允许生产包导入fixture；候选、selected Source与handoff bytes未变。纠正README包装映射后candidate→selected exact parity为5/5；Open Design current readback、frozen inspector/oracle、formal preflight、design-system、Context、harness与diff检查均以最终候选重跑。
