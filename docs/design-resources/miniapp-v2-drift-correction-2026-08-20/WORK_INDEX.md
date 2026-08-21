# 今晚去观星 Mini Program V2.0 设计资源工作索引

状态：`dra-complete / selected-v2-immutable / proposal-reconciliation-applied / formal-handoff-preflight-ready / non-production`

本文件是本轮 `design-resource-authoring` 的任务内恢复索引。它不是 Product Source、Design Authority、Context、选定资源、验收结果或生产完成声明。

## 1. 目标与工作流

- 目标：针对「产品漂移纠偏 + 天象观测机会增强」V2.0 新需求生成最小但完整、可审阅、可继续迭代的微信小程序设计资源。
- 工作流：Default Workflow Contract。
- 明确不使用：`long-task-workflow`。
- 主 skill：`.codex/skills/design-resource-authoring/SKILL.md`。
- 交互约束：`.codex/skills/uiux_design/SKILL.md` 中与直接操作、状态一致性、减少动态、触觉兜底、无障碍和低亮现场使用有关的通用不变量；React Native 专属 primitive 不投射成小程序技术事实。

## 2. Source 与身份

| Key | 角色 | 路径 / 身份 | SHA-256 | 处置 |
| --- | --- | --- | --- | --- |
| S1 | 本轮产品 Source | `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_V2.0_漂移纠偏与天象观测机会增强版.md` | `AF2D9B60C59B23D3040133974AB8C8AEA99DB43C566317AA3EDE4241C0786944` | `constraint`，控制产品含义、范围、页面、流程与可见规则 |
| S2 | 本轮技术 Source | `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_V2.0_漂移纠偏与天象观测机会增强版.md` | `82A281D1CD2D21556383876A24C62B7614CAB9531B7A98ED37535FC62041A98E` | `constraint`，控制技术边界、状态、错误、性能与平台事实 |
| S3 | Design Authority | `C:/Dev/Starward/DESIGN.md#wechat-mini-program--soft-instruments-v1` | current repository file | `exact-target`，只控制 Mini Program exact visual values |
| S4 | 当前 Surface/Screen Context | `project_context/areas/main/product-surface-contract.md` 与 `screen-contracts/wechat-miniapp.md` | current repository files | `durable surface/interaction owner`；已写入 Map/My、首屏地图预算、紧凑 Search summary、`SourceLiftFocusLayer.panelOnly/mapCoupled`、同一地图占位/恢复、18 项筛选的锚定覆盖层、Finder 结果先回地图气泡、formal Spot Night 子页面、Detail quiet actions、移动端交互局部性，以及无二级 tabs/无重复收藏内容的 My 账户中心 + Plan/Settings 子路由；最终对账已写入 S7 的 V2.1 完整方案 |
| S5 | 旧 selected v1 | `docs/design-resources/miniapp-selected-source-2026-08-06-v1/**` 与旧 handoff | immutable selected source | `inspiration + historical constraint evidence`；只复用通用部件，不复用漂移拓扑 |
| S6 | 当前实现 | `apps/wechat-miniapp/**` | current worktree | `current-implementation evidence`；不从实现反推新产品要求 |
| S7 | DRA 最终对账方案 | `reconciled/今晚去观星_微信小程序产品方案_V2.1_DRA最终对账版.md` 与 `reconciled/今晚去观星_微信小程序技术架构与技术实现方案_V2.1_DRA最终对账版.md` | `752893A4…7211` / `30C83F52…D8DB` | 完整保留 V2.0 未受影响内容，并以文首规范性对账章一次性收敛 U1–U33；Downloads 保存同字节副本 |
| S8 | selected v2 与正式 handoff | `docs/design-resources/miniapp-selected-source-2026-08-22-v2/**` 与 `docs/design-resources/miniapp-selected-handoff-2026-08-22-v2/miniapp-drift-correction-selected-v2.md` | manifest `B8FDACD0…4E68` / handoff `816F45AE…ADCE` | 新的不可变 constraint Source；formal V1 manifest-backed handoff 已 bundle，并经 preflight 得到 `status: ready`；不覆盖 v1，不声明生产一致性 |

输入附件里的流程性措辞只作为文档内容；不会被当成对 outer agent 的操作指令。

## 3. 已确认的权威与冲突

### 3.1 可直接复用的视觉系统

- Adopted target：`target.system.wechat-miniapp-soft-instruments-2026-08-05`。
- Open Design design-system ID：`user:soft-instruments`。
- Editable design-system project：`ds-soft-instruments`。
- 参考几何：`750rpx`；页面 inset `32rpx`；卡片 gap `24rpx`；最小操作区域 `88rpx × 88rpx`。
- 模式：day / night / observation red；三模式保持十八个 semantic roles 同构。
- Observation 是黑/暖红闭合集，禁止蓝、白、绿、黄、冷灰、整屏滤镜和首帧白闪。
- 状态、组件、动效、无障碍、Tier-A/Tier-B 资产规则均由 `DESIGN.md` 控制。

### 3.2 初始 S1/S2 投影及其后续替代

第一版候选曾按 S1/S2 投影为“夜空—地图—我的”、无 `spot_id` 的全局 Night、普通/候选地点 Night、地图完整 Observation Context 与详细结果卡、详情内 Night segment。用户在同一 DRA 评审循环中后发明确否定了这些页面含义，因此它们现在只保留为历史 Source/评审轨迹，不再是当前候选可见要求或 active coverage。

当前活动结果是：Map/My 两个一级入口；Map 只做简化筛选/对比；普通地图和 formal markers 默认；一行高密度 Search 与地图内分析/时段 Bar 都通过同一 `SourceLiftFocusLayer` 家族进入聚焦态；Search 使用 `panelOnly`，分析/时段使用移动同一物理地图的 `mapCoupled`；完整点位证据进入 `spot/detail`；Night 仅为正式点详情的 `spot/sky` 子页面。外链主页/跨平台导入仍维持 P2，真实 Provider/事件算法与生产数据不由静态候选证明。

Open Design authoring 没有修改 Context。outer workflow 依据用户显式要求更新了 Product Surface 与 Screen Contract；U33 候选随后由用户在 2026-08-22 明确结束评审循环并委托完成 DRA。全部 accepted/rejected/superseded/unresolved 结论已一次性进入两份 V2.1 完整对账方案、97-row selected requirement index 与新的 immutable selected v2。正式 handoff 是 `constraint` Source，仍不等于生产实现或生产一致性验收。

### 3.3 候选评审期接受的任务内增量

| ID | 接受的设计结果 | 当前归属 |
| --- | --- | --- |
| `USER-MAP-TIME-001` | 初始候选的 map relocation/dock/placeholder 时间聚焦组合；其 visible/lifecycle composition 已被地图上方直接相邻的 analysis/time owner 替代，selectedAt 语义只在新 requirement 下计数 | `inactive-superseded by USER-MAP-ANALYSIS-TIME-001` |
| `USER-UX-LOCALITY-001` | 移动端连续操纵、当前值与主要反馈必须位于同一 viewport 或同一有界、控件自有滚动区域；不得要求“滚动下去操纵，再滚回上方查看” | `durable Screen Contract invariant / candidate-covered` |
| `USER-UX-FOCUS-PATTERN-001` | 能直接同屏时原位聚合；无法同屏时使用“自解释功能按钮 + 类 Modal / Modal 焦点层”。图标只有在平台惯例且语义无歧义时可视觉独立，但始终有 accessible name；焦点层拥有 scrim/显式关闭/back/Escape、焦点返回、单一状态真相、reduced-motion 等价反馈；次级说明不得 hover-only | `durable Screen Contract invariant / candidate-covered` |
| `USER-NIGHT-TIME-FOCUS-001` | 初始全局 Night 的时间局部性交互；全局路由已被 002 替代，只保留 scrubber、当前值、机会/云/月亮/稳定性同屏和显式 disclosure，并迁入 formal `spot/sky` | `covered-active-remainder` |
| `USER-MAP-SELECTION-FOCUS-001` | 初始通用“选地点”同图层；其 picker composition 已被统一 Finder 替代，shared selectedSpot 与 focus lifecycle 只在 Finder requirement 下计数 | `inactive-superseded by USER-SPOT-FINDER-001` |
| `USER-SKY-ORIENTATION-LOCALITY-001` | 动态天图的方向控制、方向质量/传感器或手动状态与画布反馈收进同一场景卡或紧邻有界区域；此处可直接同屏，因此不强行套 Modal | `task-local / candidate-covered` |
| `USER-MAP-CONTENT-BOUNDARY-002` | 地图页唯一职责是用简化基本信息筛选、对比并进入正式观星点；删除顶部完整 Observation Context 与地图下方详细点位卡，路线、设施、安全、媒体、来源等完整证据全部进入 `spot/detail` | `explicit-user / accepted / Context-updated / candidate-covered` |
| `USER-MAP-LAYERS-002` | 普通地图/default markers/互斥分析含义被后续保留，但其独立 in-map layer menu visible composition 已被统一 `分析与时段`区域替代 | `accepted history / inactive-superseded by USER-MAP-ANALYSIS-TIME-001` |
| `USER-MAP-TIME-002` | 常驻地图内光害/时间 bar 与 map relocation focus 已被直接相邻的分析/时段区域替代；single selectedAt/static LIGHT 只在新 requirement 下计数 | `accepted history / inactive-superseded by USER-MAP-ANALYSIS-TIME-001` |
| `USER-MAP-DIRECT-GESTURES-002` | 删除地图右上左右平移与 `+`/`−` 缩放按钮；地图直接支持 pan / pinch / tap，搜索、收藏夹与无障碍列表提供非手势替代，自动相机不对抗用户拖动 | `explicit-user / accepted / Context-updated / candidate-covered` |
| `USER-MAP-CALLOUT-002` | 正式点首次点按选中并显示同图轻量气泡；气泡仅显示名称、光害、停车、距离/车程、今晚观测条件等少量 icon + 短值；press-in 边框立即变色，有效 release/键盘/读屏激活才进入 `spot/detail`，拖离/取消/手势竞争不跳转 | `explicit-user / accepted / Context-updated / candidate-covered` |
| `USER-MAP-FAVORITES-002` | standalone Favorites-only Modal 的 visible composition 已被统一 Search Sheet 的“想去”分区替代；静态收藏身份在 Finder/My requirement 下计数 | `accepted history / inactive-superseded by USER-SPOT-FINDER-001` |
| `USER-PRIMARY-NAV-002` | 删除主页面“夜空”，Mini Program 一级导航固定为“地图 / 我的”二分，地图仍为默认页 | `explicit-user / accepted / later than S1/S2 / Context-covered / candidate-covered` |
| `USER-SPOT-NIGHT-002` | 夜空只作为正式观星点信息页的下一级 `spot/sky`，继承 `spot_id`、日期、时间、时区与数据修订；普通地点和候选点不能合成正式夜空上下文；原夜空时间聚焦交互迁入该正式点夜空路径 | `explicit-user / accepted / supersedes global-Night scope of USER-NIGHT-TIME-FOCUS-001 and S1/S2 candidate topology / Context-covered / candidate-covered` |
| `USER-UI-LIBRARY-REUSE-001` | 候选可用 inline SVG 保持自包含，但生产实现先复用项目批准的小程序组件/icon；也允许成熟、轻量、平台/许可证兼容、可按 DESIGN 主题化且无障碍语义完整的外部库，或边界清晰的少量自实现；不强制 UI 库，也不无理由引入重型依赖或第二套 token/icon truth | `explicit-user-confirmed development principle / candidate-covered` |
| `MAP-009` | S1 §9.7 的完整筛选 taxonomy：10 个首层项（今晚推荐、最佳窗口时长、距离/驾车时间、光害、少云、停车、厕所、可驾车直达、摄影前景、可露营/驻车）与 8 个高级项（特定天象、低云阈值、月亮影响、徒步难度、信号、充电、天空开阔方向、最近核验时间）；18 项共用单一 draft/apply/cancel/reset 状态 | `S1 Source correction / Context-updated / candidate-covered` |
| `USER-PRODUCT-COPY-BOUNDARY-001` | 面向用户的手机页面只呈现用户完成任务所需的内容；产品设计思路、常规手势教程、route/debug/reviewer metadata 和 `SAMPLE_DATA` 审阅标记移到手机外评审壳。用户需要的来源、时效、限制、不确定性与恢复信息仍留在其产品归属位置 | `explicit-user / accepted / Context-updated / candidate-covered` |
| `USER-SPOT-FINDER-001` | 点位列表、收藏夹、搜索与筛选合并为唯一“搜索”入口和一个近全高 Bottom Sheet；搜索与 18 项筛选共同作用；结果只分“想去/其他观星点”，各自可收起并显示数量，城市只作组标题；选择结果关闭 Sheet、定位地图并打开同一气泡，不直接跳详情 | `explicit-user / accepted history / prior snapshot covered / pending inactive-superseded by USER-SEARCH-LIFT-COMPACT-001 + USER-FINDER-COMPACT-HIERARCHY-001` |
| `USER-MAP-ANALYSIS-TIME-001` | 光害、总云量、今晚观测条件收敛为地图上方“分析与时段”区域的互斥可选叠加；底图和正式点不进入 Tab。共享时间条与图层选择、地图反馈相邻；拖动预览、释放提交。光害只按来源声明的静态周期变化，不伪造逐小时序列；旧地图搬移时间焦点层退出当前 Map 方案 | `explicit-user / accepted history / prior snapshot covered / pending inactive-superseded by USER-SOURCE-LIFT-FOCUS-LAYER-001` |
| `USER-SPOT-DETAIL-ACTIONS-001` | 详情页收藏变为名称旁 icon，“去这里”进入名称下方距离/路线行；夜空入口只保留上方一次；删除设施卡底部重复的“收藏/查看夜空/去这里”按钮排，并按 DESIGN 恢复卡片间距 | `explicit-user / accepted history / prior snapshot covered / pending inactive-superseded by USER-SPOT-DETAIL-QUIET-ACTIONS-001` |
| `USER-FINDER-CITY-GROUPING-001` | Finder 的唯一一级折叠分区是“想去/其他观星点”；城市是分区内标题或 sticky label，不形成第二层折叠；结果卡保持用于定位与比较的紧凑信息，不复制完整详情 | `explicit-user clarification / accepted / Context-updated / candidate-covered` |
| `USER-MAP-FIRST-VIEWPORT-001` | 正常字号下，紧凑页头、一行 Search、地图主体与 Map/My 底栏共同位于手机首屏；地图占扣除安全区和固定区后的剩余高度，不能先滚过分析面板才开始比较点位 | `explicit-user / accepted / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-SOURCE-LIFT-FOCUS-LAYER-001` | 固定可复用“原位提升焦点层 / SourceLiftFocusLayer”：source anchor、几何占位、共享元素式提升、fixed-like safe destination、scrim、close/Back/Escape、焦点返回、可中断反转、reduced-motion 与单一状态 owner；`mapCoupled` 让分析 Bar 快速轻微放大淡出、信息面板淡入且同一物理地图只移动/缩放不淡出不复制，`panelOnly` 只提升 Search 与内容面板 | `explicit-user / accepted / supersedes USER-MAP-ANALYSIS-TIME-001 visible composition / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-SEARCH-LIFT-COMPACT-001` | Search 保持一行高密度 Bar，显示 query/城市、最多两项高优先级 committed filters 与 `+N`/结果摘要；打开后 Bar 上浮固定、Finder 向下浮现并有 X；历史/模糊建议为同层 anchored overlay，不占主滚动高度，选择建议只更新 query/result | `explicit-user / accepted history / prior snapshot covered / pending inactive-superseded by USER-FINDER-TOGGLE-POLISH-001` |
| `USER-FINDER-COMPACT-HIERARCHY-001` | 筛选、想去、其他使用无外框粗体层级；18 项为紧凑自适应 3 列、短项可 4 列/长项跨列且保持 44px hit；Filter 是不改变主 scroll 几何的 owned overlay，与 Search suggestions 互斥；移除大 Reset/Cancel/Apply，draft dirty 才显示可访问且非仅颜色的 `×` revert 与 `✓` commit；Chevron 光学缩小，减少边框、圆角、阴影和嵌套 elevation | `explicit-user / accepted history / prior snapshot covered / pending inactive-superseded by USER-FINDER-TOGGLE-POLISH-001` |
| `USER-SPOT-DETAIL-QUIET-ACTIONS-001` | Favorite 是名称右侧无可见按钮边框的 20–24px glyph / 44px 透明 hit icon state；`去这里` 是距离路线行右侧安静文字 `去这里 →`，不使用大填充/外框；上方 Night entry 仍只出现一次 | `explicit-user / accepted / supersedes USER-SPOT-DETAIL-ACTIONS-001 visible action treatment / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-SOFT-INSTRUMENTS-APPLICATION-001` | 不重做设计系统；按现有 Soft Instruments v1 使用 typography/spacing/18 roles/icon-action/chip/sheet/map/no-stacked-elevation/one-trailing-action。地图/地点/数据主导；主蓝只做关键选择，LIGHT/TOTAL_CLOUD/OPPORTUNITY 分别使用既有 warm/cyan/violet 语义并保持非仅颜色反馈；候选补齐 SourceLift、compact status Bar、flat disclosure、overlay suggestion/filter 与 quiet trailing action 组件合同 | `explicit-user / accepted / task-local visual application / candidate-covered / independently-resource-QA-verified / DESIGN.md unchanged` |
| `USER-OBSERVING-CONDITIONS-COMPACT-001` | 地图内 `分析与时段` 改名为 `观测条件`，换成明确的 Tier-A 条件/仪表图标且禁止 Favorite 星形；`mapCoupled` 上部控制面板在 320/375/430 与大字下通过压缩层级/重排而不产生内部纵向滚动或可见 scrollbar，关闭动作是 44px 透明 hit / 20px 左右光学居中的 quiet X；时间 scrubber 只保留一个可见当前本地时间值，删除重复大标题、随时段副本与第二输入值 | `explicit-user / accepted / refines USER-SOURCE-LIFT-FOCUS-LAYER-001 / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-FINDER-TOGGLE-POLISH-001` | 保留 compact Search summary、panelOnly、18 filters、两分区与结果→同图气泡语义，但用上浮后的 `查找观星点` source header 自身切换展开/收起并旋转 trailing chevron，删除独立 X 和“查找与比较”；搜索字段加 Tier-A search icon，建议层紧贴字段下方并在焦点离开 field+overlay 后 160ms 淡出；Search/Filter 以 `space-3` 分隔；Finder/result 与 Filter owned scroll 仍可滚动但 scrollbar chrome 隐藏；filter 选择项用统一紧凑视觉盒/完整 44px hit；想去/其他标题增加左右 padding，18–20px chevron 光学居中并随 expanded 旋转 | `explicit-user / accepted / supersedes USER-SEARCH-LIFT-COMPACT-001 + USER-FINDER-COMPACT-HIERARCHY-001 while preserving their non-conflicting semantics / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-SOURCE-LIFT-RESTORE-CONTINUITY-001` | `panelOnly` 与 `mapCoupled` 退场必须从 overlay 中的 live geometry 连续反向到 exact origin；底层 phone/map flow 在全过程尺寸与位置不变，不能让 live node 与 placeholder 同时占流；到达后下一帧原子换回 source owner，再清 overlay，禁止 Finder 闪烁/地图跳位/空白或白色结束帧；中断与 reduced motion 得到同一干净终态 | `explicit-user / accepted / refines USER-SOURCE-LIFT-FOCUS-LAYER-001 / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-FINDER-FOCUSED-ICON-DEDUP-001` | Finder 聚焦态由 lifted `查找观星点` source header 保留唯一 Search cue，内部 name/city field 的 Search icon 在该组合中隐藏并收回左侧图标占位；默认 compact source 仍保留可理解的 Search icon，任何状态都不得出现两个同义 Search glyph | `explicit-user / accepted / conditionally narrows USER-FINDER-TOGGLE-POLISH-001 focused composition / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-FILTER-DIRTY-ACTION-POLISH-001` | 筛选 draft dirty 时的撤销 `×` 与应用 `✓` 改为光学居中的 Tier-A SVG glyph，圆形 44px hit target 保留非仅颜色的 name/meaning；Filter 标题行与 anchored dropdown 之间增加明确 spacing，不能贴边或改变 Finder scroll geometry | `explicit-user / accepted / refines USER-FINDER-TOGGLE-POLISH-001 / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-SPOT-DETAIL-HEADER-CORE-INFO-001` | 删除详情身份头中含义不清的 `地点资料可用`、`今晚条件会变化` 两个 chips；可解释的资料状态、时效、条件变化与限制进入 Overview/来源/设施等对应内容，不删除用户决策事实 | `explicit-user / accepted / refines Spot Detail information hierarchy / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-MINIAPP-SCROLLBAR-CHROME-001` | 全部小程序用户场景保留必要纵向滚动但隐藏纵向 scrollbar chrome 且不占布局宽度；横向只允许有明确 owner 的行/数据矩阵，必要可见指示器必须 overlay、零布局占位、白色半透明；不能用禁滚/裁切伪装，覆盖 Spot Detail 与 Spot Night 等本轮截图场景 | `explicit-user / accepted / merges numbered points 5 and 7 as one global invariant / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-SPOT-DETAIL-TAB-MOTION-001` | 概览/攻略/场地使用稳定几何的活动指示器移动与约 160ms 内容淡入淡出；提交后旧 panel 立即失去交互/无障碍可达性，快速切换可重定向且不叠出两个可操作 panel；reduced motion 为即时或 ≤100ms opacity 等价；Ant Design 仅作成熟 Tab 动效参考，不引入其依赖或视觉权威 | `explicit-user / accepted / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-OBSERVATION-MODE-SETTINGS-001` | 删除 `spot/sky` 页的“进入观测红模式”卡片；唯一显式进入/退出入口移到“我的 → 设置”，切换不离开设置且退出恢复此前 mode/context；Spot Night 只消费 active observation presentation，不建立第二 entry/store | `explicit-user / accepted / supersedes only prior visible entry placement while preserving USER-SPOT-NIGHT-002 route and observation behavior / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-CARD-SELECTION-STAR-001` | Finder 筛选项与观测条件图层项共用 selected decorator：卡片右上角一颗圆角、约半颗被边界裁切的彩虹渐变星；day/night 只用现有 primary/warm/cyan/violet 等语义 token，observation 使用闭合 warm-red 等价；同时保留 selected border、ARIA/role/check 等非仅颜色语义 | `explicit-user / accepted / component-family refinement under existing Soft Instruments / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-NOTIFICATION-COMPONENT-FAMILY-001` | 抽取一个共享 Notification 组件族，状态语义 `info/warning/error/success` 与布局变体正交；`inline` 占据 owner 的正常文档流，承载持续/可恢复状态，`floating` 固定在安全区内悬浮且不改变页面、地图或滚动几何，只承载非关键短确认/轻提示。两者共用紧凑 icon/title/body/至多一个 trailing action/可选 dismiss anatomy、Soft Instruments token、44px 命中区、160ms 稳定几何淡入淡出与 reduced-motion 等价；同一 owner 不堆叠多张完整通知，多个状态按 error→warning→info→success 仲裁并以可访问计数/摘要保留其余状态。替换 Map、Spot Night、My/Favorites 等页面手写 `.banner`，修正截图中的过大卡片、空白高度、按钮/字体/间距失衡 | `explicit-user / accepted / Context-updated / candidate-covered / independently-resource-QA-verified` |
| `USER-MY-ACCOUNT-CENTER-001` | “我的”根页改为符合成熟移动端惯例的简洁账户中心：页头只保留“我的”，右上 Tier-A 齿轮 icon 以完整 44px 命中区进入独立设置页；删除“收藏、计划与显示偏好”副标题与“我的/收藏/计划/设置”平铺 tabs。根页仅保留登录/身份行与少量常用入口/摘要；收藏浏览不在“我的”重复展示，继续由 Map Finder 的“想去”分区承载；计划使用安静列表行进入独立计划页；设置页承载偏好及唯一观测红模式入口。参考知名 App 的信息层级惯例而不复制京东/淘宝/天猫品牌、商业模块或视觉资产 | `explicit-user / accepted / Context-updated / candidate-covered / provider-current-byte-browser-QA-passed / outer-static-evidence-reviewed` |

候选期只把候选专属增量写入候选资源、rolling manifest、commission 与本索引；通用交互原则已经进入 Screen Contract。评审结束后没有逐轮覆盖原始 S1/S2，而是生成两份完整 V2.1 对账版并冻结 selected v2；旧候选与 rolling manifest 继续作为历史生成快照，不再代表当前 lifecycle。

Architecture Deliberation：Product Surface 与 Screen Contract 负责 Map/Detail/Spot Night/My 的持久信息、动作和反馈 ownership，`DESIGN.md` 继续是唯一 exact visual owner，本未选 Open Design 候选只拥有任务内布局、组件组合与演示行为。当前扩展点是既有 focus-layer 几何占位规则、一个 Finder 结果投影、一个 query、一个 18 项 filter draft/commit owner、一个 shared selectedSpot、一个物理 map、一个 activeOverlay 和一个 selectedAt；本轮把该扩展点命名为可复用 `SourceLiftFocusLayer`，只提供 `panelOnly` 与 `mapCoupled` 两个变体，不复制 map/time/selection/filter store。选择“首屏地图 + 高密度 Search Bar + Search/Filter anchored overlays + 地图内 analysis/time status Bar + 同一地图提升 dock + quiet Detail actions”，并继续保留两结果分区、城市组内标题、Finder 结果先回同一地图气泡、Map/My 与 formal Spot Night。未选常驻大分析面板、独立 Search route、nested Modal、同时打开两个 dropdown、第二地图、固定两列 filter wall、大型 action chrome、重型 UI 依赖与第二套 token/icon truth。未来原生 Mini Program Map 若不能直接 reparent，生产仍须用同一实例的 geometry dock/portal 等价实现；候选不能把静态演示冒充原生验证。禁止候选 adoption、伪造逐小时实测光害、motion/color-only 状态和生产依赖锁定。项目检查覆盖 Context、Design、首屏预算、SourceLift 往返/中断、搜索筛选联动、完整 taxonomy/draft lifecycle、owned overlay scroll、JSON/locator/hash、三手机宽度、键盘/焦点、reduced motion、三模式与 console。Context Delta：`required`，已更新 Product Surface 与 Screen Contract；生产代码未改。

### 3.4 上一冻结候选的有效替代关系（2026-08-21）

上一冻结轮的用户直接决定改变了候选的主信息架构，因此优先于 S1/S2 在当时候选中的旧投影，但尚未回写 S1/S2。该冻结组合由 U11–U15 控制：`USER-PRODUCT-COPY-BOUNDARY-001` 清理手机内审阅/产品思路文案；`USER-SPOT-FINDER-001` 把点位列表、收藏、搜索与筛选收敛为唯一 Search Sheet；`USER-FINDER-CITY-GROUPING-001` 固定“想去/其他观星点”为唯一一级分区；`USER-MAP-ANALYSIS-TIME-001` 以地图上方相邻区域替代地图内 bar、独立图层入口和 map-relocation 时间层；`USER-SPOT-DETAIL-ACTIONS-001` 把收藏、路线和 Night 归到 Detail 身份头。它们在 SHA-256 `D614642E…A92B` 快照中生成并通过资源 QA，现作为可追溯历史而非本轮目标组合。

当前 supersession：`USER-SPOT-FINDER-001` 使 standalone Favorites、Filter、点位列表与 peer Search 组合 inactive，只保留单一选择、静态收藏身份、owned scroll、关闭/焦点恢复；`USER-MAP-ANALYSIS-TIME-001` 使 `USER-MAP-TIME-002` 的地图内 bar 及 `USER-MAP-TIME-001` 的 Map 搬移/placeholder 组合 inactive，只保留 selectedAt、preview/commit、one-overlay 和静态 LIGHT 诚实性；`USER-SPOT-DETAIL-ACTIONS-001` 替代旧设施卡三按钮排。全局 Night、普通/候选地点 Night、详细 Map 卡、重复图层 Tab、三栏导航继续 inactive。`USER-NIGHT-TIME-FOCUS-001` 仅在 formal `spot/sky` 保留一个 active remainder。因此 manifest 只保留 1 个 `covered-active-remainder`，而不是把历史 UI 重复算作当前覆盖。

durable owner 已更新为 `product-surface-contract.md` 与 `screen-contracts/wechat-miniapp.md`；候选继续服从 Soft Instruments exact visual profile。Build / Reuse / Buy 允许集合仍是项目批准组件/icon、成熟兼容的轻量外部库或边界清晰的项目自实现，前提是保持 DESIGN token 单一真相、许可证/平台适配、无障碍与模式完整性。不得新增平行入口、嵌套 Modal、第二地图或复制 map/time/selection/filter store。Context Delta：`required`，已更新 Mini Program Product Surface 与 Screen Contract；生产代码仍未改。

### 3.5 当前后发替代关系（U16–U21）

本轮用户明确恢复“地图内紧凑 analysis/time Bar → 原位提升焦点层”的方向，并将同一模式推广到 Search，但同时要求候选真正使用现有 Soft Instruments 的层级、密度和语义色，而不是重做 Design System。`USER-MAP-FIRST-VIEWPORT-001` 固定首屏地图预算；`USER-SOURCE-LIFT-FOCUS-LAYER-001` 取代上一轮常驻地图外 analysis/time 面板并建立 `mapCoupled`/`panelOnly`；`USER-SEARCH-LIFT-COMPACT-001` 与 `USER-FINDER-COMPACT-HIERARCHY-001` 共同取代旧近全高标准 Sheet 的外壳/筛选表现但完整吸收统一搜索、18 filters、想去/其他、城市组内标题和结果先回地图气泡语义；`USER-SPOT-DETAIL-QUIET-ACTIONS-001` 取代上一轮 Detail 可见 action treatment；`USER-SOFT-INSTRUMENTS-APPLICATION-001` 只约束现有系统的正确应用，不建立第二 token/authority。

当前 canonical rolling manifest 已将 `USER-SPOT-FINDER-001`、`USER-MAP-ANALYSIS-TIME-001` 与 `USER-SPOT-DETAIL-ACTIONS-001` 标为 `inactive-superseded`，并由 U18/U19、U17、U20 完整承接仍有效语义；U16–U21 均有 current locator/disposition。`USER-FINDER-CITY-GROUPING-001`、`USER-UX-LOCALITY-001`、`USER-UX-FOCUS-PATTERN-001` 和 formal `USER-NIGHT-TIME-FOCUS-001` remainder 继续有效。当前 snapshot 仍是评审期滚动索引，不是 selected-design 的最终完整 manifest。

### 3.6 当前后发替代关系（U22–U23）

本轮继续属于同一次 DRA 评审。三张用户截图只作为 prior candidate 的缺陷定位证据，不是 exact visual target、Product Source 或 Design Authority：Finder 截图 SHA-256 `A14C6F388EEA71D7C1DDE5B02E051DC30FE6E2196F7DF1F9E4F8EEF0CC6F5E0A`，观测条件截图 `B2946AAA6999419CD296459114329718F6B42AD5F8B499F18060D89B4B626850`，分区标题截图 `1DEE2A856785F3A4D6D68BCCDB2275C6B8D723742F48BC4C16CDCF224A6D6535`。

`USER-OBSERVING-CONDITIONS-COMPACT-001` 保留 U17 的 one-map/mapCoupled/placeholder/lifecycle，只修正用户可见名称、功能图标、控制面板空间、关闭动作和单一时间显示。`USER-FINDER-TOGGLE-POLISH-001` 完整承接 U18/U19 的 compact summary、panelOnly、query/filter conjunction、18-filter draft、两分区/城市标题、结果→同图气泡与 owned-scroll 语义，同时替代其独立 X、`查找与比较`、小 chevron 和旧 overlay/scrollbar/choice-box 表现。当前 canonical rolling manifest 已把 U18/U19 改为 `inactive-superseded`，并新增 U22/U23 为 `covered`；恰有 **87 unique dispositions**：63 `covered`、1 `covered-active-remainder`、3 `partial`、1 `excluded`、19 `inactive-superseded`、0 `decision-required`，active dispositions 仍为 68。

### 3.7 当前已生成并独立验证增量（U24–U31）

本轮九个编号审阅点经去重得到八条唯一需求：用户第 5 与第 7 点是同一全局 scrollbar chrome 规则在 Spot Detail / Spot Night 两个场景的重复引用，统一由 `USER-MINIAPP-SCROLLBAR-CHROME-001` 覆盖而不建立同义 ID。U24–U31 均是当前组合的后发细化；它们不把 U22/U23、`USER-SPOT-NIGHT-002` 或既有 tab/detail 语义整体置为 inactive。`USER-OBSERVATION-MODE-SETTINGS-001` 只替换红模式入口 ownership，formal Spot Night 路由、context 与 observation presentation 仍有效。

当前 provider rolling manifest 已从 87 rows 增加恰好 U24–U31，且不改变既有 disposition，现有 **95 unique dispositions**：71 `covered`、1 `covered-active-remainder`、3 `partial`、1 `excluded`、19 `inactive-superseded`、0 `decision-required`，active dispositions 为 76。四个 canonical files 已逐字节取回，U24–U31 均为 `candidate-covered / independently-resource-QA-verified`；本 manifest 仍是 review-loop-open 的 current-snapshot index，不是 selected-design 最终 Fact Universe。

本轮截图没有授权复制红框、浏览器/桌面壳、字体像素或现有缺陷。Exact visual values 继续来自 Soft Instruments；不创建新 Design System、不更新 S1/S2、不选定候选、不运行 selected preflight。

### 3.8 当前已生成并独立验证增量（U32）

本轮新增 `USER-NOTIFICATION-COMPONENT-FAMILY-001`，仍属于同一次 DRA 评审循环。截图只作为 prior candidate 缺陷定位证据，SHA-256 `39BC889E7F8BF668B7F02CF85870AF5FEE91CDDBD39DAE405708BCB7EC8C47C0`；其中红框/鼠标/浏览器裁剪与此前错误尺寸不是 visual target。历史候选 `40996025…EC3` 的 U24–U31 独立 QA 结论保留为旧快照；当前候选 `C184A335…9067` 已覆盖 U32 并完成精确字节独立资源 QA。

从 95-row rolling manifest 新增恰好 U32，且未改变任何既有 disposition。当前 provider current-snapshot manifest 恰有 **96 unique dispositions**：72 `covered`、1 `covered-active-remainder`、3 `partial`、1 `excluded`、19 `inactive-superseded`、0 `decision-required`，active dispositions 为 77。一个实际复用的 `NotificationComponent` 已承载 Map permission/stale/provider、Spot Night offline、My/Favorites dynamic-state 与 floating acknowledgements；tone/placement、residual queue、44px action、三模式和几何不变量均在当前字节完成验证。

### 3.9 当前已生成并验证增量（U33）

`USER-MY-ACCOUNT-CENTER-001` 仍属于同一次 DRA 评审循环。用户截图只作为 prior candidate 的缺陷定位证据，SHA-256 `0D05FE15AA6029338F6F8AE0300A15F68DA4E5727B8B225A4FDC693A2DC59740`；截图里的浏览器裁剪、当前 tab 造型和粗糙间距不是 visual target。明确参考的是成熟移动端账户中心的通用层级，不是对京东、淘宝或天猫页面、品牌、图标、颜色或商业模块的复制授权。

本轮从 96-row rolling manifest 新增恰好 U33，current-snapshot 现为 **97 unique dispositions**：73 `covered`、1 `covered-active-remainder`、3 `partial`、1 `excluded`、19 `inactive-superseded`、0 `decision-required`，active dispositions 为 78。既有收藏关系未删除：Map Finder 的“想去”与 Detail Favorite 继续覆盖静态收藏身份/失败保留；只删除“我的”根页的重复收藏入口/列表。Plan 与 Settings 改为独立子页面，Settings 继续是观测红模式唯一入口。Open Design run `08dc6555-0032-4350-a8fc-e03b7104da1f` succeeded / exit 0 / no unfinished work；U33 有 current locator，Provider current-byte Browser QA 通过，外层完成 byte/static/provenance 与最终截图/结构化结果复核。外层 `file://` 浏览器重执行被 URL policy 阻断，因此不声明 U33 独立浏览器重执行通过。

## 4. Commission 范围

### 4.1 Intent

`handoff candidate`：使产品/设计/开发能够审阅并继续迭代，但不做 final selection、Authority adoption 或 formal selected Web/App handoff。

说明：下方第 6–8 节保留首次 commission 的 S1/S2 全量输入与通用约束，便于恢复历史评审；其中与第 3.5 节冲突的三入口、全局 Night、普通/候选地点 Night、详细 Map 卡和旧 layer/tab/常驻大面板方案均已 superseded，不是当前候选 active surface。当前可见资源和 coverage 以第 3.5、`candidate/resource-manifest.json` 与 `candidate-handoff.md` 为准。

### 4.2 Scope ceiling

- 平台：微信小程序；Taro + React + TypeScript 是实现背景，不要求生成生产代码。
- 参考画布：`750rpx`；评审视口：320 / 375 / 430 CSS px。
- 命名范围：本次 V2.0 漂移纠偏与天象观测机会增强涉及的全局壳、夜空、地图、三类地点、正式点详情、事件、动态星图/观测模式、我的与关键状态。
- 资源数量上限：优先一个综合可运行高保真资源；只有综合资源无法清楚表达统一时间轴复杂状态时，才增加一个专门 control/state study。

### 4.3 明确排除

- 不重做整个 native App、运营后台或现有 Design System。
- 不生成新的 Figma 文件或 provider-native 副本。
- 不把 external profile links / cross-platform import 作为核心页面。
- 不展开支付、会员、完整 AR、实时 ZHR、全国候选、无审核 UGC、持续定位、完整逐向导航。
- Open Design provider 不选定、不采纳、不写回 S1/S2，也不修改 `DESIGN.md`、`project_context/**`、Contract、生产代码或测试；outer workflow 仅按用户显式要求更新现有 Screen Contract 的通用交互不变量。
- 不产生真实天气、路线、现场设施、安全、媒体许可或地点事实；资源中的例子必须标为示例/占位。

## 5. 最小资源处置

| 资源 | Disposition | 原因 |
| --- | --- | --- |
| 综合高保真可运行 prototype/workbench | `selected for commission` | 一次覆盖跨页面 IA、模式、关键状态、交互与恢复，最小但完整 |
| 需求→资源 locator / handoff 索引 | `selected for commission` | 后续审阅和实现无需重新发明 in-scope 决策 |
| 独立统一时间轴 control/state study | `optional` | 仅当综合资源不足以表达时间—事件—天气—地图—星图同步时生成 |
| 低保真 wireframe | `not-needed` | 新 S1/S2 已明确页面拓扑和流程 |
| 新 Design System slice | `not-needed` | Soft Instruments 已 configured/adopted |
| 全量 component atlas | `not-needed` | 复用现有通用 family；本轮只展示新增/改变的状态 |
| 新 Tier-B 资产研究 | `not-needed` | 现有八类资产语法足够；不扩词汇 |
| Figma/native design copy | `not-needed` | 当前无协作、可编辑 native 文件需求 |
| 旧 selected v1 直接复用 | `not-needed for topology` | 会继续 Map/My-only、formal-only Night 与错误详情顺序 |

## 6. 必须覆盖的页面/区块

### V2-01 全局壳与 Observation Context

- 一级导航只有地图 / 我的，地图默认；全局夜空已 inactive。
- `spot/detail` 与其 formal-only `spot/sky` 是地图/My 可进入的子路由，不是一级 Tab。
- 地点、观测夜、当前时间、事件/目标、天气/数据状态由 owning route 投影；跨午夜仍属于同一观测夜。
- 手机产品画布不显示 route、revision、SAMPLE_DATA、审阅结论或常规手势教程；用户需要的来源、鲜度、限制和恢复仍保留。
- 返回、模式变化、Sheet/焦点层关闭保持 Context、页面任务位置与 opener focus。

### V2-02 地图发现

- 试点区默认冷启动；拒绝定位仍可搜索、手动选地区与地图 Pin。
- 默认是普通底图、六个 formal markers 和 `NONE` 分析层；正式点不需要单独 Tab，地图没有方向箭头或 `+ / −` steppers。
- 地图上方只有一个高密度 `搜索` Bar，显示 query/城市、最多两项高优先级 committed filters、`+N` 与结果摘要；它通过 `SourceLiftFocusLayer.panelOnly` 上浮到 safe-area 固定位置并向下展开 Finder，不得再出现 peer Search/Filter/Favorites/点位列表入口或嵌套 Modal。
- Finder 统一 query、S1 §9.7 的 10+8 项 filter draft/commit、收藏身份与结果列表。历史/模糊建议和 Filter 都是同层互斥 anchored overlay，不改变主结果 scroll 几何；Filter 项紧凑自适应且保持 44px hit，dirty 时才显示 44px `×` revert 与 `✓` atomic commit，不使用底部大 Reset/Cancel/Apply 按钮排。
- 结果一级分区只有“想去/其他观星点”；城市只是分区内标题。搜索与已提交筛选共同投影两组结果，空态/失败/静态收藏降级不能破坏地点身份。
- Finder 结果只关闭 Sheet、必要时定位同一地图并聚焦紧凑气泡；不得直接进详情。只有地图气泡有效 release、Enter/Space 或读屏激活进入 `spot/detail`；拖离/pointercancel 不导航。
- 地图内常驻一个紧凑 `分析与时段` Bar，只显示当前叠加、摘要指标、时间与 disclosure cue。点击后通过 `SourceLiftFocusLayer.mapCoupled` 进入聚焦态：Bar 轻微放大淡出、信息面板淡入，同一张不透明物理地图提升/缩放到焦点位置，原位置保留等高几何占位；不得复制/remount 第二张 map。
- 聚焦面板统一 `NONE / LIGHT / TOTAL_CLOUD / OPPORTUNITY`、共享 `selectedAt` scrubber/精确时间、compact metric bars 与静态/动态来源说明；关闭、真实 scrim、Escape、Back 使用同一可中断反向恢复并回送 opener focus。
- `LIGHT` 是来源周期静态参考，不随小时 scrub；`TOTAL_CLOUD`、`OPPORTUNITY` 与点位时段摘要可随 preview/commit 更新。任何次级解释在触屏/键盘上可达，不依赖 hover-only。
- Marker、Finder 结果、气泡、详情、路线与 Observation Context 共享一个 selectedSpot；地图只显示比较所需的少量信息，完整路线/设施/安全/媒体/来源进入详情。

### V2-03 地点三级模型

- Ordinary / Candidate 仍是 Source 数据模型，但当前 Map Finder 的可导航结果与默认 marker 只投影 formal spots；不得从普通/候选地点合成正式 Night。
- Formal spot 的地图气泡只含名称、光害、停车、距离/车程与所选时段条件等紧凑信息。
- `spot/detail` 才拥有 TripDecision、路线/设施/安全、媒体/来源、收藏/计划/去这里；`spot/sky` 只从该 formal context 进入。

### V2-04 正式观星点夜空

- `spot/sky` 是 `spot/detail` 的 formal-only 子页面，继承 `spot_id`、本地日期/时间、时区、数据鲜度与事件/目标；无 global Night。
- 今晚观测机会、主/备窗口、利好/不利、云/月亮/稳定性、时间与来源在该上下文内表达。
- 时间 scrubber、当前值与主要反馈同屏；地图页 selectedAt 与 Spot Night 使用同一上下文含义，不创建第二套时间真相。
- 动态天图的方向控制、方向质量和画布反馈在同一场景卡；Observation 只从 formal Spot Night 进入并在退出时恢复进入前模式。

### V2-05 事件专题

- Demo 完整事件族只需流星雨；其他目标走日常画像。
- 活动曲线类型、来源/版本和限制清楚。
- ZHR 只作为标准化参考，不显示“实际每小时可见数量”。
- 事件 → 本地夜 → 地点比较 → 正式点 → 计划 → Observation 的可追踪路径。

### V2-06 正式点详情

- 身份头显示地点名称；收藏是名称旁有 accessible name 的 icon state。
- 名称下方直接显示距离/路线摘要与无可见填充/边框的安静 trailing action `去这里 →`；一个上部 Night 入口进入 `spot/sky`。
- 收藏为名称右侧无可见边框的 20–24px glyph，命中区至少 44px，并以文字替代、pressed 与 selected 非仅颜色反馈保持可访问。
- 内容分区为概览 / 攻略 / 场地；路线、停车/驻留、设施、观测环境、安全、媒体/来源与核验状态留在详情，不回流到 Map。
- 到达与设施卡只承载事实，不重复“收藏 / 查看夜空 / 去这里”三按钮排；卡片按 DESIGN spacing 分开。
- 阻断先于导航；动态失败不隐藏静态点位、场地、攻略或收藏关系。

### V2-07 动态星图与现场 Observation

- Canvas 2D / 方向环 / 地平线 / 核心目标；固定装饰星点不可冒充事实。
- 时间 scrub 本地更新；地点/日期/事件变更才重解析。
- Compass 只改视图方向；LOW_ACCURACY / DENIED / UNAVAILABLE / MANUAL；提供手动北向。
- Canvas 失败时同目标文字列表。
- Observation：纯黑/近黑 + 暖红、图片默认关、无白骨架/白弹窗、缓存时间/离线范围/回程、退出精确恢复。

### V2-08 我的与计划

- 我的首页保持简洁。
- 收藏：正式点 / 候选 / 事件；动态失败不删除静态收藏关系。
- 正式计划只接受 `spot_id`，保存观测夜、主/备窗口、事件/目标、备注、离线摘要和更新时间。
- 普通/候选只能保存候选记录。
- 设置：地点、定位偏好、经验、驾车/设施/设备、主题、大字、减少动态、单位、来源、缓存、隐私。
- 订阅只展示保留入口的关闭/能力 gated 状态；不发明授权频率与成功流程。

### V2-09 信任、失败与恢复状态板

- `FRESH / STALE_USABLE / PARTIAL / EXPIRED / UNAVAILABLE / ESTIMATED / SAMPLE_DATA`。
- `0` 与 `null` 的可视语义不同。
- Context expired/conflict、定位拒绝、天气 provider、路线、图层、Canvas、sensor、offline、hard blocker。
- 来源 badge：年度参考 / 历史拟合 / 实时观测 / 第三方预报 / 产品计算 / 遥感估算 / 官方核验 / 用户实测 / 示例数据。
- 时间字段：发布/起报、适用、获取、计算、场地核验、用户观测/拍摄。
- 每个恢复态说明发生了什么、仍可用什么、下一步安全行动；保留 request/recovery slot，不发明服务端业务规则。

## 7. 不得由视觉稿发明的规则

- SkyOpportunity 与 TripDecision 的计算、等级、权重、阈值和置信度。
- 安全 hard blocker、连续窗口算法、天气模型选择、光害映射、路线 provider。
- 具体地点、天气、设施、道路、媒体许可、事件数值、ZHR 实见量、Bortle 精确值。
- 订阅频率/授权/成功状态，敏感地点坐标策略的具体决策。
- S2 内部仍有歧义的枚举/transport：`COORDINATE_PLACE`、`targetProfile`、Map Layer 名称、SpotStatus、Context 更新 API。

## 8. 交互与无障碍不变量

- Press-in 立即反馈；有效 release 才提交；drag-away/cancel/disable 不提交。
- 时间、地图、sheet 和星图直接操作连续、可中断，从 live presentation value retarget。
- 连续操纵和主要反馈优先保持在同一手机 viewport / 同一 owned scroll region；不得要求用户滚动到另一处操纵后再返回查看本组件反馈。按钮 + 聚焦态/类 Modal 是可用模式，不是所有交互的唯一形式。
- 地图 pan、sheet drag、scroll、back、assistive gesture 有明确 owner； essential action 有非手势替代。
- Map/marker/card/list/context、timeline/weather/sky/target、detail/context 保持同一 revision。
- Reduced motion：即时或 0–100ms opacity；不使用弹跳、视差、装饰粒子、持续漂浮。
- 所有 action 至少 88rpx/44px；role/name/state/value 完整；风险/选择不只靠颜色。
- 页面级禁止横向滚动；只允许明确 owned data matrix 横向滚动并保留行列标签与单位。
- 大字时 My 四页签改 2×2；关键决策、警告与恢复不可截断。

## 9. Provider 能力与调用计划

- Provider：Open Design local daemon `0.16.1`，health `ok`。
- MCP：当前 outer host 未暴露 Open Design MCP；使用同一安装的 structured HTTP API。
- Available agent：Codex CLI `0.144.5`，auth `ok`。
- Live model authority：`codex debug models`；`gpt-5.6-sol` priority `1`，描述为 latest frontier agentic coding model。
- Open Design run surface exposes reasoning values through `xhigh`；因此 request `model=gpt-5.6-sol`, `reasoning=xhigh`。Codex 模型自身虽支持更高值，但 provider 0.16.1 未声明，不能越过 run-surface schema。
- Service tier：Codex catalog exposes `priority`，Open Design run API 未发现独立 controllable field；不把 service tier 当模型排名依据。
- Project ID：`starward-miniapp-v2-drift-correction-2026-08-20`。
- Conversation ID：`61006884-d0d8-48d2-bc4c-f0136e8ade3b`。
- First generation run ID：`c99da4ee-d36f-476c-869d-e3ee8ecc9500`。
- Repair / reverse-audit closure run ID：`248b9646-4242-47ef-8ab5-c1e8cb24f40f`。
- Provenance / QA-lifecycle reconciliation run ID：`92f94943-6077-44a4-a61d-1cc06d4d327b`。
- Map-time focus review revision run ID：`bfb1f290-b8bc-471b-903a-9aea15481ee6`。
- Non-mutating invocation failure：`48561ff9-d619-4893-8e28-1775cc5047c0`；request 缺少 `message`，未启动 child、未修改资源，随后用正确字段重试。
- Current-byte defect repair run ID：`f706ef2f-7d44-43ec-8134-b4e8a6e6125b`。
- External-QA lifecycle closure run ID：`e94724ba-9b8f-4a8c-894b-0b38d77d333c`；metadata-only，禁止改 `index.html` / `brand-spec.md`。
- Exact light-estimate entry / visible time-preview repair run ID：`8a38ed85-d4a9-4bd5-a930-6cdd1d9a2ecb`。
- Current exact-byte external-QA closure run ID：`f02b7866-7b48-4ef5-b411-775fba1b2cc8`；metadata-only，禁止改 `index.html` / `brand-spec.md`。
- Mobile interaction locality major revision run ID：`a3fc28ee-c68c-4903-bbcb-0bef63f04299`。
- Focus animation lifecycle repair run ID：`c5bcb680-11ec-4ea5-aeda-85c340cb7de1`。
- Historical pre-map-first metadata-only QA lifecycle closure run ID：`df9e9945-13cd-484d-90f9-056ad0dd07ad`；只记录当时的外部独立资源 QA 与 Context 边界，禁止改 `index.html` / `brand-spec.md`，且不是独立 QA 本身。
- Map-first / Spot Night ownership major revision base run ID：`963bc775-dceb-4a0b-a15a-e6cfc5527a39`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；重建候选并在 provider 内完成该快照的 current-byte QA；随后由筛选纠偏 run 修订。
- Current Source-conformance filter correction run ID：`b5e1811d-de7b-4ad7-8c9f-b69f9ee019d0`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；精确补齐 S1 §9.7 的 18 项筛选并修复 Filter focus trap。
- Unified Search / analysis-time / Detail-actions major revision run ID：`a2a94690-dc4a-49af-bb21-abb1717837d7`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；执行 U11–U15 整页重制和 provider current-byte QA。
- Final authoring provenance / explicit-keyboard repair run ID：`41cc4739-0720-45c6-90eb-6e5bc67a3079`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；只改 `index.html` 与 manifest，README/brand 保持逐字节不变。
- Current first-viewport / SourceLift major revision run ID：`d61cfad7-c9e7-4282-9866-debb44d0af5e`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；执行 Section 22 / U16–U21，重制首屏 Map、Search `panelOnly`、analysis `mapCoupled`、compact Finder 与 Detail quiet actions。
- Current visible-debug cleanup run ID：`e61015ef-cf3f-4125-a7c5-b39de91fc72e`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；只移除手机画布误露出的 `FOCUSED` 生命周期标签并同步 manifest provenance，README/brand 逐字节不变。
- Current observing-conditions / Finder polish major revision run ID：`e32bbf31-6ffe-4db4-b845-a41ad47d17f4`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；执行 Section 24 / U22–U23 并完成 provider current-byte QA。
- Final SVG-chevron / suggestion-keyboard repair run ID：`afe4911f-6b30-4c00-99d0-17c5e5f34a40`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；用 exact inline SVG 修正 Finder chevron，并显式闭合 Enter/空格/Spacebar suggestion 提交先于 blur-close。
- Current shared-Notification revision run ID：`66687218-4d8b-4869-8c85-ecb6afaac0bc`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；执行 Section 28 / U32、复用 actual Notification renderer 并完成 provider current-byte QA 与 U24–U31 regression。
- Current My account-center revision run ID：`08dc6555-0032-4350-a8fc-e03b7104da1f`；`succeeded`、exit `0`、`endedWithUnfinishedWork=false`；执行 Section 30 / U33、建立 My root + Plan/Settings child routes，迁移 Notification ownership，并完成 36-combination provider current-byte Browser QA 与 U24–U32 regression。
- Required design-system binding：`user:soft-instruments`；创建后必须 GET 验证。
- Current run / conversation / effective model / artifact locators：已回填；Provider current-byte Browser QA 与外层 byte/static/evidence-review qualification 由本索引、handoff 与 repo sidecar 共同承载。

## 10. 输出与 provenance

| 项目 | 当前值 |
| --- | --- |
| Open Design project | `starward-miniapp-v2-drift-correction-2026-08-20`，binding verified |
| Conversation | `61006884-d0d8-48d2-bc4c-f0136e8ade3b` |
| Initial generation run | `c99da4ee-d36f-476c-869d-e3ee8ecc9500`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false` |
| Repair / closure run | `248b9646-4242-47ef-8ab5-c1e8cb24f40f`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false` |
| Provenance / QA-lifecycle reconciliation run | `92f94943-6077-44a4-a61d-1cc06d4d327b`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；仅统一候选内 QA lifecycle/provenance 文案，未改视觉与交互资源 |
| Map-time focus review revision | `bfb1f290-b8bc-471b-903a-9aea15481ee6`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false` |
| Invocation failure (non-mutating) | `48561ff9-d619-4893-8e28-1775cc5047c0`，API 在 child 启动前拒绝缺失 `message` 的 request；无资源变更 |
| Current-byte defect repair | `f706ef2f-7d44-43ec-8134-b4e8a6e6125b`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false` |
| External-QA lifecycle closure | `e94724ba-9b8f-4a8c-894b-0b38d77d333c`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；metadata-only，`index.html` / `brand-spec.md` 保持修复后 hash |
| Exact light-estimate entry / visible time-preview repair | `8a38ed85-d4a9-4bd5-a930-6cdd1d9a2ecb`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；把入口收回原“光害估算”bar，并让聚焦态默认预览动态 `OPPORTUNITY` |
| Current exact-byte external-QA closure | `f02b7866-7b48-4ef5-b411-775fba1b2cc8`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；metadata-only，`index.html` / `brand-spec.md` 保持当前 hash |
| Mobile interaction locality major revision | `a3fc28ee-c68c-4903-bbcb-0bef63f04299`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；加入共享焦点层、夜空时间、地图选点与天图方向局部化 |
| Focus animation lifecycle repair | `c5bcb680-11ec-4ea5-aeda-85c340cb7de1`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；清理 WAAPI `fill:forwards` 和 normal/reduced-motion 往返残留 |
| Current metadata-only QA lifecycle closure | `df9e9945-13cd-484d-90f9-056ad0dd07ad`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；仅更新 README / manifest / sidecar，`index.html` / `brand-spec.md` 哈希不变；外部 QA 由本索引与 handoff 承载 |
| Map-first / Spot Night ownership major revision | `963bc775-dceb-4a0b-a15a-e6cfc5527a39`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；建立当前拓扑基础，覆盖后发九个 USER ID 与 inactive supersession |
| Source-conformance filter correction | `b5e1811d-de7b-4ad7-8c9f-b69f9ee019d0`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；历史前序快照，覆盖 `MAP-009` 的完整 18 项并修复 Shift+Tab 焦点逃逸 |
| Current unified-Search major revision | `a2a94690-dc4a-49af-bb21-abb1717837d7`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；执行 Section 20 / U11–U15，重制 canonical files 并完成 provider current-byte QA |
| Final authoring repair | `41cc4739-0720-45c6-90eb-6e5bc67a3079`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；manifest current-delta 指针纠正到 Section 20，callout 增加显式 Enter/Space commit 与 click de-duplication |
| Current first-viewport / SourceLift major revision | `d61cfad7-c9e7-4282-9866-debb44d0af5e`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；执行 Section 22 / U16–U21 并完成 provider current-byte QA |
| Current visible-debug cleanup | `e61015ef-cf3f-4125-a7c5-b39de91fc72e`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；移除手机可见 `FOCUSED` 调试标签，保留状态机与手机外 inspector |
| Current observing-conditions / Finder polish major revision | `e32bbf31-6ffe-4db4-b845-a41ad47d17f4`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；执行 Section 24 / U22–U23 并完成 provider current-byte QA |
| Final SVG-chevron / suggestion-keyboard repair | `afe4911f-6b30-4c00-99d0-17c5e5f34a40`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；修正 disclosure 光学尺寸和显式键盘提交，不改变 87 项 disposition |
| U24–U31 initial attempt | `f81db9ac-135e-46d8-90c3-38762d530ffa`，Provider QA transport 停止推进后取消；其 canonical writes 未接受 |
| U24–U31 whole-candidate revision | `5ae13469-4d98-40a1-b404-e1e8c58d5f91`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false` |
| U29 motion repair | `fefbd023-00b1-4a3c-b352-df7d22229d93`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；建立可测的 160ms Detail panel opacity handoff |
| U24 history-continuity repair | `b1cd5ee7-1c7c-4065-aaf3-c330700df064`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；关闭 native history scroll-restoration race |
| Current U32 Notification-family revision | `66687218-4d8b-4869-8c85-ecb6afaac0bc`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；执行 Section 28、建立共享 inline/floating Notification family 并完成 provider current-byte QA |
| Current U33 My account-center revision | `08dc6555-0032-4350-a8fc-e03b7104da1f`，`succeeded`，exit `0`，`endedWithUnfinishedWork=false`；执行 Section 30、建立 conventional My root、独立 Plan/Settings 与精确 Back/focus/scroll restoration，并完成 36-combination provider current-byte Browser QA 与 U24–U32 regression |
| Requested model/reasoning | `gpt-5.6-sol / xhigh` |
| Effective model/reasoning | generation / repair / review-revision start traces: `gpt-5.6-sol / xhigh`; model-context diagnostic: `gpt-5.6-sol` |
| Provider terminal state | 当前 U33 run 与所列有效 generation/repair runs 均正常结束且无 unfinished work；U24–U31 初始 cancelled run 未接受，另有一次已隔离、无 child、无文件变更的历史 request-schema failure |
| Artifact readiness | `index.html.artifact.json`: `selection.status=unselected`、`selection.reviewLoopOpen=true`、`manifestLifecycle.status=rolling-current-snapshot-index`、`verification.outerIndependent.lifecycle=COMPLETED_WITH_BROWSER_REEXECUTION_QUALIFICATION`；四个 current Open Design project 文件已精确取回，repo sidecar 已重建 |
| Design suitability | `suitable as unselected review / handoff candidate`；不等于 selected、formal implementation handoff 或 production acceptance |
| Canonical candidate entry | `candidate/index.html` |
| Repo-local immutable candidate snapshot | `docs/design-resources/miniapp-v2-drift-correction-2026-08-20/candidate/**` |
| SHA-256 inventory | 见下表与 `candidate-handoff.md` |
| Editable upstream update route | edit Open Design project, generate a new candidate; never overwrite selected v1 |

### 10.1 Current candidate byte inventory

| File | Provider SHA-256 | Repo-local SHA-256 | 说明 |
| --- | --- | --- | --- |
| `index.html` | `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31` | same | 当前 conventional My root、Plan/Settings children、共享 Notification 与 U24–U32 保留行为；Provider Browser QA 和外层 byte/static review 的精确 subject |
| `README.md` | `DD6699CFC4D28EC88AD82B473B196F7911244C70652ACE4D8DB4FE8B04F40409` | same | Open Design 输出；其 independent-not-run 文案是 provider boundary lifecycle 状态 |
| `resource-manifest.json` | `754AE81EE957EA672AD9199C1CDEA09737A74AC00632AD8A8E675A92BAC2582F` | same | 97 个唯一 disposition、current locators、provider self-QA、Section 30 provenance 与 supersession；当前评审快照的滚动索引，不是最终 selected manifest |
| `brand-spec.md` | `C1552347FD06724A45B12ACB51032A8619A94F9B3B6AA36361A824A184E6DFA1` | same | 逐字节不变 |
| `index.html.artifact.json` | n/a（repo sidecar） | `258ECFC3B548AB004DDC158713F6F478A5C764E8E6434D0B37E80199372A23E9` | 仓库侧 current provenance、rolling-manifest lifecycle、Context 与 outer QA qualification companion；不是 Open Design project canonical file |

四个 Open Design project 文件取回时与 repo snapshot 逐字节一致。外层 QA 完成后没有修改这四个 canonical bytes；只更新 repo-owned sidecar、handoff、commission/index 记录。

### 10.2 Reverse audit 与修复闭环

初始候选经历了多轮用户评审：先修正地图时间入口和动态反馈，再把“连续操纵、当前值、主反馈同屏”固定为条件式“自解释按钮 + 类 Modal / Modal”模式并推广到同类场景。随后用户重新声明 Map 的唯一职责，要求普通底图/default formal markers/单一分析层、删除 pan/zoom chrome、真实收藏夹、轻量气泡、Map/My 二分与 formal Spot Night 子页面。这些都属于同一次 DRA 确认—改需求—重生成循环，旧可见含义被显式 inactive/superseded，而不是另建第二份需求。

`963bc775-dceb-4a0b-a15a-e6cfc5527a39` 与 `b5e1811d-de7b-4ad7-8c9f-b69f9ee019d0` 先建立 Map/My、formal Spot Night 与完整 10+8 taxonomy。后续用户指出页面仍把查找任务拆成多个入口、时间/图层组合仍不清楚、详情行动拥挤且手机内泄漏产品思路。`a2a94690-dc4a-49af-bb21-abb1717837d7` 因而按 Section 20 整页重制：一个 Search Sheet、两分区/组内城市、结果先回地图气泡、一个相邻分析/时段区、Detail 身份头行动层级。取回后外层发现 manifest 当前指针仍指历史 Section 16，且浏览器键盘合成不能独立复验 callout 的 click-detail fallback；`41cc4739-0720-45c6-90eb-6e5bc67a3079` 只修正这两处并保持 79 项需求与其状态总数不变。最终外层在 exact repo bytes 上重跑三视口、Search/Filter 联动、结果定位、Enter/Space、分析/时间静态与动态差异、Detail 层级、大字/reduced-motion/owned scroll、44px、overflow、dialog/a11y、重复 ID/ghost/console。Context 已与当前 surface ownership 对齐；尚待的是明确 selection 后一次性回写 S1/S2 并完成 selected-design closure。

用户随后在同一循环中恢复地图内紧凑 analysis/time Bar，并要求首屏地图、更高密度 Search、无重排的 suggestion/filter overlay、可复用 SourceLift 两变体和 Detail quiet actions，同时明确“不因应用问题重建 Design System”。`d61cfad7-c9e7-4282-9866-debb44d0af5e` 执行 Section 22 / U16–U21；外层取回后发现唯一资源缺陷是手机画布误露 `FOCUSED` 调试标签，`e61015ef-cf3f-4125-a7c5-b39de91fc72e` 最小修复。最终 SHA-256 `94B7D9AE…282B` 在 320/375/430、Search `panelOnly`、analysis `mapCoupled`、同一物理地图/placeholder、真实 scrim、Filter dirty revert/commit、Search+filter conjunction、Detail quiet actions、reduced motion、focus/44px/overflow/console 上完成独立资源 QA。85-row manifest 仅是当前候选快照的滚动机器索引；selection 前不做最终完整 selected-design manifest/preflight。

用户继续把地图 Bar 的可见含义收敛为“观测条件”，要求 mapCoupled 上部无内部滚动、单一时间与 quiet X，并把 Finder 的 source header、field-anchored query overlay、hidden scrollbar、uniform filters 和分区 chevron 固定为当前组合。`e32bbf31-6ffe-4db4-b845-a41ad47d17f4` 执行 Section 24 / U22–U23；外层发现 literal chevron 的光学尺寸与空格提交路径仍不够确定，`afe4911f-6b30-4c00-99d0-17c5e5f34a40` 用 Tier-A SVG 和显式 keydown 最小修复。最终 SHA-256 `69E407A5…CD05` 在三宽度 normal/large、无内滚动、single selectedAt、同一 map、title/partition rotation、true blur、pointer/Enter/space、18-filter geometry、hidden scroll chrome、reduced motion、focus/44px/overflow/ID uniqueness 上完成独立资源 QA。87-row manifest 仍只是当前候选快照的滚动机器索引；selection 前不做最终完整 selected-design manifest/preflight。

本轮 U24–U31 继续在同一 project/conversation/binding 中收敛恢复连续性、scrollbar chrome、Detail motion、Settings-owned observation mode 与 card selection language。`f81db9ac-135e-46d8-90c3-38762d530ffa` 因 Provider QA transport 挂起而取消且未接受其 canonical writes；`5ae13469-4d98-40a1-b404-e1e8c58d5f91` 完成 whole-current-candidate revision，`fefbd023-00b1-4a3c-b352-df7d22229d93` 建立真实 160ms Detail panel opacity，`b1cd5ee7-1c7c-4065-aaf3-c330700df064` 修复外层独立 QA 发现的 history scroll-restoration race。最终 SHA-256 `40996025…EC3` 在三宽度逐帧 SourceLift、污染历史 Back、Search cue 去重、22 个 selected-card states、Detail/Spot Night scroll reachability、tab rapid/reduced、My Settings observation restore、矩阵横滚、44px/overflow/ID/console 上完成独立资源 QA。95-row manifest 仍是当前候选快照的滚动机器索引；selection 前不做最终 selected-design manifest/preflight。

U32 继续使用同一 project/conversation/binding；run `66687218-4d8b-4869-8c85-ecb6afaac0bc` 以 requested/effective `gpt-5.6-sol / xhigh` 成功结束，exit 0、无 unfinished work。它以唯一 `NotificationComponent` 替换 Map、Spot Night、My/Favorites 的 page-local banner fragments，并加入真实 floating acknowledgement queue；`brand-spec.md` 保持逐字节不变。最终 SHA-256 `C184A335…9067` 的外层 QA 建立了单条 compact inline、error→warning→info 仲裁、准确 residual count、三项 floating queue、Map/Search/scroll 几何不变、无被动抢焦点、61.6–74.6px notification、44px action、三模式与 reduced motion，并复跑 U24–U31 SourceLift/Detail/scroll/selection 回归。96-row manifest 仍是当前候选快照的滚动机器索引；selection 前不做最终 selected-design manifest/preflight。

U33 继续使用同一 project/conversation/binding；run `08dc6555-0032-4350-a8fc-e03b7104da1f` 以 requested/effective `gpt-5.6-sol / xhigh` 成功结束，exit 0、无 unfinished work。它删除 My 的旧副标题、四个平铺 tabs 与重复 Favorites 内容，建立 title-only My root、44px gear、普通 profile/list rows、独立 Plan/Settings 子路由、exact Back/focus/scroll restoration，并把旧 My 通知所有权迁移到 Plan；Finder Wanted、Detail Favorite 和 Settings-only observation owner 不变。Provider 在最终 SHA-256 `9F7E60C1…5E31` 上完成 36-combination My Browser QA 与 U24–U32 回归。外层确认四个 canonical files 字节一致、97-row ledger/locators/JSON/scripts/Context/authority 闭合并检查 Provider 最终浏览器证据；由于 Browser URL policy 拒绝本地 `file://` 接管且禁止 workaround，当前不声明独立浏览器重执行通过。97-row manifest 仍是当前候选快照的滚动机器索引；selection 前不做最终 selected-design manifest/preflight。

## 11. Verification checklist

- [x] Source hashes and paths rechecked.
- [x] Project designSystemId exactly `user:soft-instruments`.
- [x] Current whole-candidate run `5ae13469-4d98-40a1-b404-e1e8c58d5f91`、U29 repair `fefbd023-00b1-4a3c-b352-df7d22229d93`、final U24 repair `b1cd5ee7-1c7c-4065-aaf3-c330700df064`、U32 run `66687218-4d8b-4869-8c85-ecb6afaac0bc` 与 U33 run `08dc6555-0032-4350-a8fc-e03b7104da1f` 均 succeeded、exit 0、无 unfinished work；取消的 `f81db9ac-135e-46d8-90c3-38762d530ffa` 没有被接受为 canonical 输出。
- [x] Requested/effective model and reasoning compared when provider exposes effective provenance.
- [x] Four Open Design project files retrieved byte-exact; repo sidecar rebuilt separately.
- [x] Current hashes recorded after retrieval and after outer metadata updates.
- [x] No external runtime dependency, missing asset or corrupt entry.
- [x] `DESIGN.md`、旧 selected v1、旧 handoff、生产代码与测试未改。
- [x] Provider final-byte U33 matrix：320×800、375×900、430×932 × day/night/observation × normal/large × normal/reduced 共 36 组合；My subtitle/tabs/Favorite 内容为 0，gear 44px、Plan row 60px，Plan/Settings route 与 explicit/system/keyboard Back 的 scroll/focus restore 均通过。
- [x] 320/375/430 normal/large：document/phone 横向 overflow 0、所有用户动作 ≥44px；长页最后内容可达且 native vertical scrollbar chrome 不可见。
- [x] Finder 与观测条件逐帧恢复：一个 live identity、一个非 IDLE placeholder、一个 physical map；底层 origin flow 不变，退场距离单调趋零，终态 exact origin，无闪烁、snap、blank/white frame 或 opacity/visibility failure。
- [x] 外层 `window.scrollY=300` 的 Finder interruption、Conditions Escape、Finder system Back 每帧保持 scroll/phone geometry，最终 placeholder 0、opener focus 恢复；history scroll-restoration race 已关闭。
- [x] Focused Finder field Search glyph 0，lifted header 保留唯一 Search cue；idle compact source 仍保留自解释搜索图标。
- [x] Filter dirty `×`/`✓` 为光学中心偏差 0 的 20px Tier-A SVG / 44px targets，editor gap 6px；18 个 Filter 与 4 个 Conditions 逐项选中均恰一 half-clipped selected star，revert 后选中/星标为 0。
- [x] Detail：废弃 chips 为 0，Tonight/来源/设施事实仍在；Overview/Guides/Site indicator 位移且 panel opacity `0 → 0.0757 → 0.7533 → 1`，rapid retarget 恰一 panel，reduced motion 首帧闭合。
- [x] Spot Night observation entry 0；My Settings entry 1，进入/退出不离开 My/Settings，observation 仅闭合暖红角色，退出恢复此前 Night context。
- [x] Professional matrix `clientWidth=301 / scrollWidth=510 / max=209` 可达；native horizontal bar 隐藏，白色半透明 absolute indicator 零布局占位。
- [x] 既有 Search/filter conjunction、result → same Map callout、static LIGHT、single selectedAt、Spot Detail quiet actions、Finder Wanted/Detail Favorite 与 stale/provider-failure 语义保持。
- [x] Map permission/stale/provider、Spot Night offline 与 Plan stale/provider 共用唯一 Notification renderer；多状态 full notification 恰一，residual count 正确，error→warning→info 无丢失，floating queue 恰一可见并最终清空。
- [x] 320/375/430 normal/large 的 inline notice 高 61.6–74.6px、action ≥44px、Map/Search/nav 可用；floating 出现前后 Map/Search/phone-scroll 几何一致、被动内容不抢焦点，normal 160ms、reduced `0.00001s`。
- [x] Final runtime has no unnamed visible button, duplicate authored/runtime id, open layer or ghost；Provider current-byte QA 报告 browser warn/error 0，外层 JSON/scripts/ledger/locator/static assertions 通过。
- [x] Rolling manifest 97/97 unique：73 covered、1 covered-active-remainder、3 partial、1 excluded、19 inactive-superseded、0 decision-required；78 active dispositions，U24–U33 均有 current locator。
- [x] 外层 Browser 接管本地 `file://` 页被 URL policy 阻断且禁止 workaround；因此只声明 outer byte/static/provenance + Provider browser-evidence review，不声明 U33 independent browser re-execution passed。
- [x] Current Context alignment、S1/S2 pending one-time writeback、unselected/non-adoption limitation visible in handoff。
- [x] Manifest lifecycle 明确为 current-snapshot rolling index；未声称最终 selected-design fact universe，也未运行 selected preflight。

## 12. Final lifecycle / future revision instructions

本轮 DRA 已结束：U33 hash `9F7E60C1…5E31` 已成为 selected v2 的 canonical entry，两份 V2.1 对账方案、97-row selected requirement index、Fact Manifest 与 formal handoff 均已物化并通过 preflight。`candidate/`、`candidate-handoff.md` 与 rolling manifest 只保留为选择前历史；不得再把它们解释为当前 unselected 状态。后续若出现新需求，必须从 selected v2 与 V2.1 对账方案发起新的候选循环并发布 v3，不得覆盖 v1/v2。生产实现、UI Authority adoption 与生产一致性验证仍是独立下游工作，不由本轮 DRA 自动执行。

## 13. Prior iteration architecture deliberation — unified Finder, analysis/time and Detail actions

Status: repository-bound checkpoint before this iteration's Context or candidate edits. `Context Delta: required` for durable Mini Program surface/control ownership; candidate composition remains task-local and unselected.

- **Affected owners and source of truth.** S1/S2 remain the immutable initial Proposal until explicit final selection. `product-surface-contract.md` owns Map-versus-Detail placement; `screen-contracts/wechat-miniapp.md` owns stable route/control/state behavior; `DESIGN.md#wechat-mini-program--soft-instruments-v1` remains the sole exact visual authority; the Open Design project owns generated candidate bytes only. Current production code, the old selected v1 and screenshots cannot redefine those owners.
- **Selected design.** Replace separate Search, Filter, point-list and Favorites triggers with one self-explanatory `搜索` trigger and one near-full-height modal Bottom Sheet. Search and the Source-defined 18-filter draft/commit model share one result projection; the only first-level result partitions are `想去` and `其他观星点`, with non-interactive/sticky city headings inside each. Result activation closes the Sheet, commits the one selected formal spot, recenters only as needed and opens the same compact map callout; it never jumps directly to Detail. Replace the in-map light/time trigger and separate layer control with one compact `分析与时段` region above the map: formal markers remain, one colored analytical overlay is active at most, and one shared `selectedAt` scrubber is immediately adjacent to its map feedback. A date/time activation may open a precise picker, but the prior Map-relocation focus Modal is no longer needed because direct co-location now fits. Detail page-level Favorite, Night and navigation actions move to the identity/header hierarchy; the facilities card owns facts only.
- **Dependency and state/lifecycle boundaries.** Finder owns one modal lifecycle, one query, one 18-option filter draft, one committed filter set, two collapsible result partitions and one owned vertical scroll. It consumes static favorite membership plus dynamic summaries without allowing Provider failure to erase membership. Map selection, marker, callout, Finder result and route context remain one state transition. Analysis selection and `ObservationContext.selectedAt` retain independent single owners; `LIGHT` stays source-period/static unless Provider Source proves a temporal series, while cloud/opportunity may update from cached frames during drag and commit/pre-fetch only on release. Scrim, explicit close, Escape and system Back dismiss the top layer and restore opener focus; keyboard, safe area, reduced motion and large text stay inside the same lifecycle.
- **Material alternatives.** Keeping four peer triggers was rejected because it duplicated one find/compare task and fragmented state. A centered short Modal was rejected for keyboard plus long grouped results; a modal Bottom Sheet is the selected mobile primitive. Nested Filter or Favorites Modals were rejected; filters expand inline inside the Finder. Simultaneous colored raster compositing was rejected because light/cloud/opportunity legends conflict; one raster at a time is selected. Keeping the previous same-map relocation Modal was rejected for Map time because the new above-map panel satisfies interaction locality without moving the map; the formal Spot Night focus interaction remains unaffected.
- **Build / Reuse / Buy.** Reuse the existing Sheet/dialog, Pressable/icon, range/time, map selection and shared Context primitives. A project-approved Mini Program component/icon library, a mature lightweight compatible library, or bounded self-implementation remain allowed when they preserve the DESIGN tokens, modes, accessibility, license and one component truth. Prohibited choices are a heavy second UI system, duplicate map/state stores, nested modal stacks, raw Provider controls, or a second icon/token authority.
- **Future-change challenge.** A larger multi-city population, offline/stale summaries, or a new layer with a different temporal resolution must extend the Finder result projection or LayerDescriptor capability without adding peer page buttons, nested city collapse levels, duplicate `selectedAt`, or pretending static data changes hourly. Large result populations may require virtualization/pagination, but the two first-level partitions and committed selection semantics stay stable.
- **Technical debt and disposition.** S1 §9.2 currently sends formal results directly to Detail, S1 §10.7/S2 `DETAIL-007` prescribe bottom actions, and S1/S2 describe separate search/filter/time/layer controls; these are recorded as accepted user supersessions in the task-local delta and remain pending one-time Proposal reconciliation after selection. The current candidate leaks reviewer/product-rationale copy into the phone and carries obsolete peer triggers; regeneration replaces it. No production implementation debt is modified in this DRA cycle.
- **Forbidden shortcuts.** Do not hide review/sample provenance without moving it to the reviewer shell; do not remove user-relevant freshness/source/uncertainty; do not navigate to Detail from a Finder result; do not mount a second map; do not reintroduce Favorites/Filter/list peer entries; do not fabricate temporal light-pollution changes; do not let Filter draft mutate committed results before Apply; do not make city headings a second disclosure hierarchy; do not encode selection by color alone.
- **Quality preservation.** Correctness requires exact search+filter conjunction, stable favorite membership, atomic result selection and shared map/callout/time identity. Maintainability requires one Finder projection and one analysis/time owner rather than four feature stores. Reliability requires empty/stale/partial/failure recovery without destroying usable static data. Consistency/concurrency requires cancelled/replaced search and time work not to commit stale results. Performance claims are not made; candidate checks only bound scroll ownership, result/state behavior and coalesced scrub semantics. Privacy remains unchanged: no precise location/search history is persisted by this artifact. Accessibility requires 88rpx/44px targets, modal focus containment/return, labelled expanded/selected states, non-gesture result access, text reflow and no page overflow. Compatibility preserves 320/375/430px, day/night/observation and reduced motion.
- **Project-owned checks.** Current-candidate Browser QA must cover the production-clean phone copy boundary; one Finder trigger; search/filter conjunction; 10+8 filters; partition/city collapse and counts; result-to-map-callout without Detail; one map; analysis/time adjacency; static LIGHT versus dynamic cloud/opportunity; drag preview/release commit; Detail header action placement; all dismiss/back/focus paths; 320/375/430, large text, 44px, overflow, duplicate IDs, ghost layers and console. Repository checks remain `make validate-context`, `make validate-harness`, `npm run design:lint`, `npm run design:system:verify` and `npm run design:targets:verify`.

## 14. Current iteration architecture deliberation — first-viewport Map and SourceLift

Status: repository-bound checkpoint for U16–U21. `Context Delta: required` and completed for durable Mini Program surface/control ownership; candidate composition remains task-local, rolling and unselected.

- **Affected owners and extension points.** Product Surface owns Map/Detail/Spot Night/My responsibility; Mini Program Screen Contract owns Search, Filter, SourceLift, map/selection/time lifecycle; `DESIGN.md#wechat-mini-program--soft-instruments-v1` remains the sole exact visual owner. The current extension point is one Finder projection, one selectedSpot/map/selectedAt/activeOverlay set and the existing geometry-preserving focus-layer rule; Open Design owns candidate bytes only.
- **Selected design.** Introduce one `SourceLiftFocusLayer` family with `panelOnly` Search and `mapCoupled` analysis/time. Keep Search compact, keep the analysis/time source Bar inside the map, preserve first-viewport Map budget, move rather than clone the same opaque map into focus, reserve the exact origin geometry, and restore in reverse. Use flat Finder hierarchy, anchored non-reflowing query/filter overlays, dirty-only revert/commit actions and quiet Detail actions.
- **Dependencies and lifecycle.** IDLE → LIFTING → FOCUSED → RESTORING/CANCELLED has one owner. Scrim/X/Escape/Back, focus containment/return, interruption and reduced motion share that lifecycle. Finder query/filter overlays are mutually exclusive; filter draft does not mutate committed results before ✓. `LIGHT` remains source-period static while dynamic layers reuse the sole selectedAt.
- **Alternatives and Build / Reuse / Buy.** A permanent large above-map analysis panel, a separate Search route, nested Modal, second/remounted map, fixed two-column filter wall, large action chrome and a new Design System were rejected for this candidate. Production may reuse project-approved primitives/icons, a mature lightweight compatible library, or bounded self-implementation when DESIGN tokens, platform/license/accessibility and one source of truth remain intact; a heavy second UI/token/icon system is prohibited.
- **Future-change challenge and debt.** Native Mini Program map constraints may prevent literal DOM reparenting; implementation must preserve one map instance and equivalent geometry dock/portal semantics rather than weakening the contract. Larger result populations may virtualize one owned result scroll without adding peer entries or nested city disclosures. S1/S2 still contain superseded Search/time/action compositions and await one-time reconciliation only after selection.
- **Forbidden shortcuts.** No cloned hidden map, no opacity-zero duplicate, no reviewer/debug copy in the phone, no hover-only explanation, no color-only state, no fabricated hourly LIGHT, no second query/filter/time store, no selected/preflight claim during the rolling review loop.
- **Quality preservation and checks.** Correctness and consistency require one map identity, exact placeholder geometry, atomic Search/filter projection and reversible focus state. Maintainability requires only two named SourceLift variants. Reliability requires cancellation and static-data preservation. Accessibility requires 44px targets, labelled icon actions, focus return, large text and reduced motion. Current Browser QA and repository Design/Context checks are the attributable checks; native WeChat behavior remains unverified.

## 15. Current iteration architecture deliberation — observing conditions and Finder disclosure polish

Status: repository-bound checkpoint for U22–U23 before Context/candidate edits. `Context Delta: required` because the stable labels, dismissal owner, blur lifecycle and scroll ownership change; visual sizes remain candidate-local under the existing exact target.

- **Owners and source of truth.** Product Surface owns Map/Finder/conditions placement; Mini Program Screen Contract owns the source-header disclosure, query/filter overlays, result scroll, selectedAt and SourceLift lifecycle; `DESIGN.md#wechat-mini-program--soft-instruments-v1` owns icon grammar, hit areas, spacing, typography, motion and mode values; Open Design owns only regenerated candidate bytes.
- **Selected design and state.** Rename the user-facing analysis entry/focus heading to `观测条件`, use a Tier-A conditions/gauge symbol rather than Favorite, and make the upper `mapCoupled` control surface non-scrolling by eliminating duplicate time values and compacting controls. Search `panelOnly` retains its lifted source Bar, but that `查找观星点` Bar now owns expanded/collapsed and becomes the explicit close route with a rotating chevron; scrim/Escape/Back remain. Query suggestions anchor immediately below the field and close only when focus leaves field plus overlay. Finder/filter/results preserve one owned scroll each where needed while hiding scrollbar chrome.
- **Dependency and lifecycle boundaries.** No state store is added. `finderExpanded`, query-overlay visibility, filter-overlay visibility, partition expanded state and SourceLift phase remain under the current layer owner. A suggestion pointer/keyboard commit wins before blur dismissal; sibling overlays remain mutually exclusive. One selectedAt produces exactly one visible current-time text and the slider accessible value. Analysis close remains a separate quiet 44px icon action.
- **Alternatives and Build / Reuse / Buy.** Disabling result scrolling was rejected because it would make long results unreachable; hiding scrollbar presentation while retaining touch/wheel/keyboard scroll is selected. Keeping a separate Search X or `查找与比较` title was rejected by the user; the source header toggle supplies explicit dismissal. Reuse existing Tier-A vector/icon-action/disclosure/field/chip primitives or an allowed compatible library/adapter; no new Design System or second icon source.
- **Future change and debt.** Virtualized or paginated results must remain inside the same hidden-chrome owned scroll and expose position/count accessibly. Large text must reflow/shorten summaries and may reduce map dock height, but cannot reintroduce an analysis scrollbar or clip the sole time value. U18/U19 become historical after U23; S1/S2 remain pending one-time writeback only after selection.
- **Forbidden shortcuts.** Do not set `overflow:hidden` on the long result owner, shrink hit regions below 44px, make the chevron decorative without expanded semantics, dismiss suggestions before their activation, keep duplicate time labels off-screen, use a star/Favorite icon for conditions, clone/remount the map, or expose reviewer/debug text in the phone.
- **Quality and checks.** Correctness requires exact one-time text, one map, one result projection, blur-versus-selection ordering and atomic filter commit. Maintainability preserves the two SourceLift variants and existing owners. Accessibility requires 44px invisible wrappers, `aria-expanded`, named icons, focus return and keyboard scroll despite hidden chrome. QA must cover 320/375/430, large text, normal/reduced motion, all close routes, chevron rotation, overlay anchoring/blur, scrollbar visual absence plus retained scroll reachability, filter item uniformity, partition padding/alignment and zero console/duplicate/ghost/overflow defects.

## 16. Current iteration architecture deliberation — continuous restore, scroll presentation and settings-owned observation mode

Status: repository-bound checkpoint for U24–U31 before candidate implementation edits. `Context Delta: required` because restore ownership, global scrollbar presentation, Detail segment feedback and observation-mode entry ownership are durable product-surface responsibilities; the Product Surface and Mini Program Screen Contract have been updated first. Exact visual values remain owned by the existing Soft Instruments target and the candidate remains rolling/unselected.

- **Affected owners and source of truth.** `product-surface-contract.md` owns Map/Detail/Spot Night/My information and action placement. `screen-contracts/wechat-miniapp.md` owns SourceLift, scroll, segment, selection and observation-mode lifecycles. `DESIGN.md#wechat-mini-program--soft-instruments-v1` remains the sole exact visual authority. The Open Design project owns candidate bytes only; S1/S2, screenshots, the old selected v1 and production code do not acquire design authority.
- **Current extension points and selected design.** Keep the existing two-variant `SourceLiftFocusLayer`, one Finder projection, one physical map, one selectedAt and one mode store. Change restoration so the live lifted node stays under the overlay owner until its transform reaches the immutable origin placeholder, then atomically swaps ownership on the next frame before the overlay is cleared; the underlying phone/map flow never receives both live node and placeholder. Hide the field-local Search glyph only while the lifted header already supplies the same cue. Use Tier-A SVG dirty actions, one shared half-clipped selected-star decorator for Filter/Conditions, stable-geometry Detail segment indicator plus 160ms content opacity swap, globally hidden user-phone vertical scrollbar chrome, and one My Settings observation-mode entry.
- **Observed defect and lifecycle boundary.** Reproducible pre-change Playwright sampling on SHA-256 `69E407A5…CD05` showed Finder restore moving the map origin from `y=139,h=500` to `y=191,h=448` for the 220ms reverse because the source and 52px placeholder simultaneously occupied flow, followed by a snap to origin. In mapCoupled restore the 500px placeholder was pushed to `y=639` while the live map animated over a still-white 343px focus dock and the panel faded, matching the reported white terminal-frame risk. These are lifecycle defects, not styling preferences; clean IDLE requires one live node, no placeholder/ghost, invariant underlying flow geometry and no exposed blank composition.
- **Dependency and state boundaries.** No second map, query/filter, tab, scroll or display-mode store is introduced. Tab content commits one state then animates presentation; prior content immediately loses interaction/accessibility. Settings changes the existing display mode without navigation and Spot Night only consumes it. Scrollbar presentation never disables the owning overflow mechanics. The selected-star is a component-family decorator driven by existing selected state, not a new state source.
- **Material alternatives and Build / Reuse / Buy.** Reparenting the live node into flow before reverse animation, cross-fading a cloned map, leaving a white dock as a timing mask, disabling scroll, keeping native layout-consuming scrollbars, duplicating Search glyphs, and adding another observation-mode store were rejected. For tab/selection/action visuals, allowed choices remain project-approved primitives, an installed or mature lightweight compatible library through an adapter, or bounded self-implementation. The candidate selects its existing self-contained HTML/CSS/SVG component family because this is one review artifact and no new runtime dependency is justified. Ant Design supplies only a mature Tab-motion reference; it is neither imported nor made a target. A heavy second UI system, second token/icon truth or unthemeable dependency remains prohibited.
- **Future-change challenge and debt.** A native Mini Program map that cannot be DOM-reparented must implement equivalent single-instance portal/dock geometry and atomic source ownership rather than weakening continuity. Large result sets or professional matrices may virtualize/use bounded horizontal scrolling, but user-phone vertical chrome stays hidden and any horizontal indicator remains overlay/no-footprint. S1/S2 still carry older observation-entry and UI placement language; it remains pending one-time reconciliation after candidate selection, not per-critique mutation.
- **Forbidden shortcuts.** Do not fix flash by shortening the animation to zero in normal motion, cover it with a blank panel, clone/remount the map, hide the page during restore, disable long-content scroll, leave hidden duplicate Search icons or duplicate tab panels, encode selection only with a gradient, introduce cool rainbow hues in observation mode, or move mode presentation into a second Settings-only truth.
- **Engineering-quality preservation.** Correctness requires invariant map/page flow through SourceLift, one live map/source identity, atomic tab/mode state and preserved scroll reachability. Maintainability keeps one lifecycle and shared decorators instead of page-specific patches. Reliability covers rapid reversal, Escape/Back/scrim/reduced-motion, stale/failure pages and exact clean terminal state. Accessibility requires named 44px actions, non-color-only selected semantics, focus return, hidden inactive tab panels and operable scroll despite invisible chrome. No runtime performance/capacity claim is made; animation-frame sampling only verifies geometry/visibility invariants. Security/privacy and production dependency boundaries are unchanged.
- **Project-owned and candidate checks.** Before handoff, rerun current-byte frame sampling for both SourceLift variants at normal/reduced motion; assert Finder/map origin position and size remain invariant throughout restore, no white/blank frame, one physical identity, clean IDLE and opener focus. At 320×800, 375×900 and 430×932 normal/large, verify one focused Search glyph, centered SVG dirty actions, Filter gap, 18 Filter/4 Condition selected-star states including observation red-only equivalent, zero user-phone vertical scrollbar chrome with reachable last content, overlay/no-footprint horizontal matrix indication where applicable, Detail chips absent, tab indicator/content motion and rapid/reduced paths, Spot Night mode entry absent and My Settings entry/exit present. Reconcile 96 manifest rows, current locators, hashes, JSON/scripts, duplicate IDs, ghosts, overflow and console; run Context/Design checks after final bytes.

## 17. Current iteration architecture deliberation — shared Notification placement family

Status: repository-bound checkpoint for U32 before Context or candidate implementation edits. `Context Delta: required` because notification feedback ownership, placement semantics and multi-state arbitration are durable cross-route responsibilities. Exact typography, spacing, color, radius, action and motion values remain owned by the existing Soft Instruments target; this candidate remains rolling/unselected.

- **Affected owners and current extension point.** Product Surface owns which Map/Detail/Night/My information and recovery action belongs on each surface. Mini Program Screen Contract owns the shared `page-state-recovery` feedback lifecycle. `DESIGN.md` already establishes persistent/actionable Banner versus non-critical Toast semantics and exact component/motion tokens. The current candidate bypasses that extension point with repeated string-built `.banner` fragments in Map, Spot Night and My/Favorites; Open Design owns only the regenerated candidate bytes.
- **Selected design and state boundaries.** Introduce one `notification-feedback` component family with two orthogonal axes: semantic tone (`info`, `warning`, `error`, `success`) and placement (`inline`, `floating`). Both variants share one compact anatomy—Tier-A status icon, title, optional concise body, no more than one trailing recovery/acknowledgement action, and optional named dismiss—and reuse the same state/focus/accessibility owner. `inline` participates in its local owner's normal flow for persistent/actionable state. `floating` is a safe-area overlay for non-critical short acknowledgement and never changes page, map, SourceLift or scroll geometry. One owner displays at most one full notification; concurrent states use deterministic severity priority plus accessible residual count/summary rather than stacking large cards.
- **Dependency, lifecycle and Build / Reuse / Buy.** Reuse the existing semantic state flags and DESIGN tokens; do not add a second error store. Allowed implementation choices remain a project-approved notification primitive, a mature lightweight Mini Program-compatible library through one adapter, or a bounded shared implementation. The self-contained review artifact selects one bounded shared renderer because adding a runtime library solely for this specimen is unjustified. A second notification package, duplicate tokens, page-local markup copies, OS-only toast with no accessible equivalent, or a floating layer that participates in layout is prohibited.
- **Material alternatives.** Merely restyling `.banner` was rejected because it leaves repeated anatomy and divergent behavior. Converting every state to a toast was rejected because persistent permission/stale/error recovery cannot disappear. Keeping every active state as a separate inline card was rejected because it destroys the Map first-viewport budget; discarding lower-priority states was also rejected because recovery information would be lost. The selected priority/summary rule preserves information without a full-card stack.
- **Future-change challenge and debt.** A future authentication, upload or plan-sync notification must enter the same semantic/placement API and cannot create a page-specific banner. Queueing multiple transient acknowledgements may require bounded sequencing, but must retain one visible floating item and reduced-motion/focus rules. Current S1/S2 do not own this later visual/component refinement and remain pending one-time reconciliation only if the candidate is selected. Production code is still untouched.
- **Forbidden shortcuts.** Do not encode severity by border color alone; do not use hover-only details, oversized action boxes, empty fixed heights, three full cards, auto-dismiss for sole recovery, hidden unusable overflow, notification-driven Map reflow for floating placement, a white flash in night/observation, or a reviewer-only specimen that leaves actual route states on old `.banner` markup.
- **Engineering-quality preservation and checks.** Correctness requires each active state and action to survive component extraction and one deterministic arbitration result. Maintainability requires one renderer/contract rather than route copies. Reliability covers action failure, dismiss, transition interruption and reduced motion. Accessibility requires live-region semantics appropriate to urgency, labelled 44px actions, reading order, no focus theft for passive floating notices and non-color-only severity. QA must exercise Map permission/stale/provider individually and concurrently, Spot Night offline, My/Favorites stale/provider, one floating acknowledgement, inline/floating layout geometry, three modes, 320/375/430 and large text; verify no clipped text, oversized/undersized action, native scrollbar, duplicate ID, ghost layer, console error or regression to U24–U31.

## 18. Current iteration architecture deliberation — conventional My account center and child settings

Status: completed repository-bound checkpoint for U33. `Context Delta: required` was fulfilled in Architecture, Product Surface and Mini Program Screen Contract before candidate retrieval. Exact type, spacing, color, icon, row, card and motion values remain owned by the existing Soft Instruments target; the Open Design candidate remains rolling, unselected and non-production.

- **Affected owners and current extension point.** Product Surface owns whether identity, favorites, plans and preferences belong on My, Finder or child pages. Mini Program Screen Contract owns root/child route transitions, back restoration, controls and feedback. `DESIGN.md#wechat-mini-program--soft-instruments-v1` remains the exact visual owner. The extension point is the existing Map/My primary shell, one favorite relation projected by Finder/Detail, one plan owner, one settings/mode owner, the shared `notification-feedback` family and reusable list/icon/profile primitives; Open Design owns only regenerated candidate bytes.
- **Selected design and lifecycle.** My root becomes a conventional account hub: title-only header, one quiet Tier-A gear action at the upper right, a concise profile/login row and a small number of grouped routine rows. It has no peer My/Favorites/Plan/Settings tabs and no duplicate Favorite count, row, list or page content. The existing Favorite relation remains visible through Finder “想去” and Detail. A Plan row pushes a standalone Plan child route; the gear pushes a standalone Settings child route. Settings owns display/preferences and the sole observation-mode control. Back restores My root scroll position and logical opener focus; route changes do not create another favorite, plan or mode store.
- **Material alternatives and Build / Reuse / Buy.** Retaining the four equal tabs was rejected because these are secondary account actions rather than peer root destinations. Copying an e-commerce profile dashboard was rejected because shopping modules, brand hierarchy and promotional affordances do not belong to this product. Hiding the existing Favorite tab while keeping its duplicated My content was rejected because ownership would remain ambiguous. The selected candidate reuses existing page shell, Tier-A icon action, profile block, list cell, shared Notification and target tokens. Production may instead use a project-approved primitive or mature lightweight compatible library through the existing adapter boundary; a heavy second UI system, copied brand asset or duplicate token/icon truth is prohibited.
- **Dependencies, future challenge and debt.** MY-001's favorite-relation survival remains satisfied by Finder/Detail and is not redefined as a My page requirement. MY-002/MY-003 remain owned by the Plan child route. `USER-OBSERVATION-MODE-SETTINGS-001` remains owned only by the Settings child route. A future subscription, import or account-security row may join a semantic group and open its own child route without restoring local tab navigation or duplicating Map-owned content. S1/S2 and earlier commission sections still describe the old My/Favorites/Plan/Settings composition; that drift remains explicitly pending one-time reconciliation only after selection.
- **Forbidden shortcuts.** Do not imitate JD/Taobao/Tmall branding, add orders/coupons/membership/shop modules, retain the old subtitle or peer tabs off-screen, move the favorite source of truth, silently drop MY-001 failure preservation, keep Settings as an in-place pseudo-tab, expose observation mode outside Settings, use an unlabeled or sub-44px gear, build a second notification family, or claim production/native conformance from the HTML candidate.
- **Engineering-quality preservation and checks.** Correctness requires exactly one My root, one Plan child, one Settings child, one Favorite relation and one mode store, with deterministic Back/focus/scroll restoration. Maintainability requires route-owned grouped rows instead of a bespoke tab shell. Reliability covers plan/settings stale/error feedback through the shared Notification family. Accessibility requires named 44px gear/rows, heading/list semantics, visible focus, non-color-only state, large-text reflow and reduced-motion route feedback. At 320×800, 375×900 and 430×932 normal/large, QA must prove the My subtitle/tabs/favorite content are absent; profile, Plan and gear remain usable; Plan/Settings child routes and Back restore; observation entry exists only in Settings; Finder “想去” and Detail Favorite remain; Notification reuse, day/night/observation, hidden scrollbar chrome, no overflow/duplicate IDs/console errors and U24–U32 regressions hold. Repository Context/Design checks run after final current bytes.

## 19. DRA final selection and formal closure — 2026-08-22

- **Selection.** 用户明确结束需求改动与候选挑错循环，并要求继续 DRA 直至完成；据此选定 U33 canonical entry `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`。这是新 v2，不覆盖 2026-08-06 v1。
- **Proposal reconciliation.** 产品与技术方案分别生成完整 V2.1 对账版，SHA-256 为 `752893A4331318DCDD33F974D5A9F68D1B0E91CE868C96CFA5C8D317AF367211` 与 `30C83F527112F6C0EAC4F1E613FEF53C3C0CEF3F3DC76A9E002E3CDFF028D8DB`；仓库与 Downloads 副本同字节，原始 V2.0 保持不变。
- **Requirement closure.** `selected-requirement-dispositions.json` 完整枚举 97 个唯一 requirement：73 covered、1 covered-active-remainder、3 partial、1 excluded、19 inactive-superseded、0 decision-required；78 active。partial/excluded 均是外部真实数据或生产能力边界，不是未解决设计选择。
- **Immutable Source.** `docs/design-resources/miniapp-selected-source-2026-08-22-v2/` 保存 canonical HTML、provider provenance、设计系统绑定、QA、方案对账、完整 V1 Fact Manifest、冻结 Inspector/Oracle 与完整性索引。manifest SHA-256 为 `B8FDACD05F13335DF7C0BADA52D04904A2C7442A739DA9F57E7616DCED9A4E68`。
- **Formal handoff.** `docs/design-resources/miniapp-selected-handoff-2026-08-22-v2/miniapp-drift-correction-selected-v2.md` 是单目标 manifest-backed constraint handoff，SHA-256 为 `816F45AEF574BEFBB87AD5613F3A6DF11245E9A2426715E747C187D9C12AADCE`。
- **Universe equality and proof.** Bundler/preflight 在当前字节上确认 5 subjects × 218 properties = 1,090 Fact Cells、5 exact digest Facts、5 evidence、5 proof obligations、0 acceptance blockers；generation 为 complete explicit，sampling/truncation 均 forbidden，正式 preflight `status: ready`。冻结 Inspector 完整枚举 15 个输入，冻结 Oracle 对 5 个 material resources 的 SHA-256 均返回 `pass: true`。
- **Authority boundary.** selected v2 的解释为 `constraint`。exact visual values 继续由 `DESIGN.md` 的 `target.system.wechat-miniapp-soft-instruments-2026-08-05` 持有；本轮没有覆盖 Design Authority、旧 selected、生产代码或测试。正式 preflight 证明 Source 获取、完整性与 Fact Universe 闭包，不证明微信原生运行、真实数据或生产 UI 一致性。
- **DRA terminal.** 本轮 DRA 至此完成。任何后续需求都必须发布新的 immutable v3；生产实现、Design Authority adoption 与 production conformance 由独立下游任务承担。

## 20. DRA metadata correction and Long Task intake closure — 2026-08-22

- **Why a new version.** 最终需求、U33 候选和 97 项处置没有变化，但 V2.1 方案抬头残留 `文档版本：V2.0`、旧日期/状态与技术方案的 V2.0 产品关联。既有 selected v2 已冻结，故不覆盖它，而是发布只做下游元数据纠偏的 V2.1.1 / selected v3。
- **Corrected complete proposals.** 产品 V2.1.1 位于 `reconciled/今晚去观星_微信小程序产品方案_V2.1.1_LongTask输入定稿版.md`，SHA-256 `EE158A18E81F0ED5CD8051FA8CD6CFC009EF4782EEDB7C17CE11674ACECAA42E`；技术 V2.1.1 位于 `reconciled/今晚去观星_微信小程序技术架构与技术实现方案_V2.1.1_LongTask输入定稿版.md`，SHA-256 `77A510C8A5FE32C425BEBB5D113028CCB275BA9443C3678EF7DC40EB9E6BE7DA`。Downloads 保存同字节副本；原始 V2.0 与 V2.1/v2 历史产物均保持不变。
- **Immutable selected v3.** `docs/design-resources/miniapp-selected-source-2026-08-22-v3/` 继承同一 canonical HTML，SHA-256 仍为 `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`；需求账本仍为 97 total / 78 active / 0 decision-required。重新生成的 V1 Fact Manifest SHA-256 为 `1718E207FEA167757453F558ADB9FA143103498F4EAAD369F4E927183E265605`。
- **Formal handoff v3.** `docs/design-resources/miniapp-selected-handoff-2026-08-22-v3/miniapp-drift-correction-selected-v3.md`，SHA-256 `F78DFF0DEB579EE8435EE32B8EF33A10BB97D8DCC7F4584D4C7579614455CF7A`。Bundler/preflight 继续闭合 5 subjects、218 properties、1,090 Fact Cells、5 exact digest Facts/Proofs、0 blocker；解释仍为 `constraint`。
- **Long Task intake.** `docs/long-task-inputs/wechat-miniapp-v2-2026-08-22/LONG_TASK_INPUT.md`（SHA-256 `820F9FDB6C93E2EB38B0A0E76A82AC333C14C82B24A263C82C6D98F657B191F5`）记录目标、权威顺序、当前 Git/worktree provenance、已知旧 Source/Context 漂移、owner、禁止捷径、External Confirmation 与检查入口；`INPUT_MANIFEST.json`（`04A1252B0B1542333A02C9BBC2D7B0C30A4851FB3FCE17C4908995EF776D22B2`）提供机器可读索引；`START_PROMPT.md`（`EC1E8CE40EF69CD99E239118D1F31453DA2E1ABA927D3E6E0FF05ADD0BE93559`）是可直接粘贴到新 Goal 的启动文本。
- **Boundary.** 本次只准备 Long Task 输入，没有创建 `delivery-contract.yaml`、没有执行 Authority Lock、没有触发 execution-model checkpoint，也没有修改生产代码、测试、`DESIGN.md` 或现有 marked Source。后续 `$long-task-workflow` 必须先修订 `docs/wechat-miniapp-v2-source.md` 和旧 selected binding，再进入 Compile/实现。
