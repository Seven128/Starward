# Field Signal I21：未完成工作与新对话续接方案

整理日期：2026-09-06，工作区：`E:\dev\Starward`。

## 0. 怎么使用这份文件

这是用户要求的交接说明与执行导航，不是新产品需求、第二 Contract、第二验收标准或已完成证明。下一对话应继续现有 Long Task，不从零重做。完整约束仍以现有 Source、owning Context、DESIGN.md、当前 immutable handoff 和唯一 Contract 为准；本文件不通过摘要删减任何义务。

**结论：本次需求尚未完成，不能理解成“只剩手机上点一下验收”。** 已有大量真实生产代码、单元/集成测试和部分 DevTools 旅程；但全页面 UI/交互当前候选复核、夜空中国 10 条真实导入、正式观星点完整联动、星图真实指向反馈、固定候选验证和唯一 Final Gate 都未闭合。下面严格区分已实现、局部验证、未验证、依赖阻塞，不编造逐控件完成率。

阅读顺序：第 1 节恢复身份 → 第 2 节权威索引 → 第 3～9 节剩余工作 → 第 10～12 节执行/验证与卡点 → 第 13 节新对话 Prompt。附录列出全部 62 Controls，防止只继续星图而遗忘其他页面。

## 1. 精确恢复身份，避免重新启动

| 项目 | 交接时状态 |
| --- | --- |
| 仓库/分支 | `E:\dev\Starward` / `main`，工作区有大量未提交修改，必须保留 |
| 当前 HEAD | `eba72686d910cd0d263e2ab0adb66b2cbe313435`；本次读取显示相对 origin/main ahead 18，不代表授权 push |
| 当前任务 | `wechat-miniapp-field-signal-i21` |
| 唯一 Contract | `.long-task/delivery-contract.yaml` |
| 当前已编译 Authority | revision **28** |
| 最近已批准并采纳的修订 | `6d2af35ebeda139ac624dcd6eb024acd748c8275879f486a84e5e30d7e7c4870`，R11 implementation binding |
| 最近生命周期观察 | 无 pending Authority Revision；未获得 Final Gate accepted 状态；之后本地修复仍需重新诊断 freshness |
| 当前主机 Goal | 上轮已标记 blocked，不是 complete；新对话按宿主实际 Goal 状态处理，不假装连接旧 Goal ID |
| 首次模型 checkpoint | 用户早已用精确回复解除；不得重建或再次要求首次模型切换 |
| 当前用户安排 | 真机正式验收暂放；优先推进不依赖用户在场的实现、模拟器和确定性验证；不能绕过的真实外部边界保留 |

当前 compiled contract 的只读核对：1823 个 Source items；acceptance reachability 共 **3926** 个义务，`machine_admitted=0`、`external_fulfillable=3926`、`unreachable=0`。这不表示代码有 3926 个 bug，也不表示需要用户逐个点 3926 次；表示当前观察/验收模型下这些精确义务不能由项目自报结果机器关闭。可组织共同旅程，但必须保持义务覆盖与当前候选证据身份。

当前外部确认入口：`field-signal-i21-native-and-device-conformance`，声明 actor 为 `starward-owner-trial-validator`、阻塞目标，使用已绑定的 owner 公钥验证。Agent 不得代替指定人类作出验收事实或伪造签署。各项具体 obligations、条件和绑定以 Contract 为准。

**重要历史陷阱：** 初始输入文件仍保留创建当时的 `active_task_missing`、启动“全新任务”、第一次 Compile/model checkpoint 的原文。这些是历史 Source，不是现在的恢复指令。不要再次粘贴其中旧启动 Prompt；用本文件第 13 节。不要恢复旧任务 `wechat-miniapp-v2-1-1-drift-correction`。

最近中断：原生 UI 工具报告用户按了 Escape，随后停止 UI 操作；父任务继续完成一个后端局部修复和测试，最终因 UI 续接/真实数据依赖未闭合而停止。不能把“用户没动页面、仍在导入页”解读成产品故障，也不能拿历史坐标继续盲点。新对话先明确当前操作授权并重新观察窗口；此次交接编写没有重新操作界面。

## 2. 必须保留的输入索引

以下相对路径均相对 `E:\dev\Starward`，不存在用摘要代替上游完整读取的许可。

### 2.1 任务和原始完整要求

- `.codex/work-items/wechat-miniapp-field-signal-i21-long-task-input.md`：原始完整需求、Source markers、后续修订、owner/检查/禁止事项。文件较大，分段完整读取相关 Source，不能只读旧启动段。
- 原宿主 Goal 全量文本：`C:\Users\777\.codex\attachments\841761c7-182d-4094-adba-ecf5cf18e6e3\goal-objective.md`。其中有夜空中国追加要求、代理执行政策及禁止事项。若附件目录以后不可达，现有 Source/Contract 及本文件保留恢复导航；不得据此缩小目标。
- `.long-task/delivery-contract.yaml`：唯一可编辑任务 Contract；`.long-task/author-draft.mjs` 是既有生成/维护入口，先读再用，不盲跑覆盖。
- `.long-task/.ty-context/compiled-contract.json`：编译投影，可用于索引，不是可直接编辑的权威。
- Git common-dir 下 `ty-context/long-task/**` active record 与当前工作区 Git-config marker：恢复依据。不要手工编辑、复制绑定或推断旧会话 ID。

### 2.2 工作流和 Context

- `AGENTS.md`。
- `.codex/skills/long-task-workflow/SKILL.md`；按当前活动完整读取其 `references/source-authoring.md`、`contract-authoring.md`、`evidence-design.md`、`authority-lifecycle.md`。
- UI 实现前：`.codex/skills/uiux_design/SKILL.md`；物理设备前：`.codex/skills/starward-wechat-device-verification/SKILL.md`；设计资源重绑定前：`.codex/skills/design-resource-authoring/SKILL.md` 及适用 references。
- `project_context/{global.md,architecture.md,context.toml,areas/main.md}`。
- `project_context/areas/main/product-surfaces/wechat-miniapp.md`。
- `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其子节点：`surfaces-and-controls.md`、`map-and-finder.md`、`spot-and-sky.md`、`shared-state-and-recovery.md`。
- `project_context/architecture/{runtime-and-domain.md,assurance-and-lifecycle.md}`。
- `project_context/development-workflow.md` 及 `authority-and-scope.md`、`development-feedback.md`、`candidate-acceptance.md`、`paths-and-lifecycle.md`、`change-admission.md`。
- `project_context/areas/main/verification.md`、`verification/acceptance-runtime.md`、`verification/development-loop.md`。
- `project_context/areas/main/verification/wechat-device.md` 和子节点 `development-feedback.md`、`settled-candidate.md`、`journey-and-evidence.md`。
- 完整受影响 Context 闭包仍按初始输入的“Source、权威和优先级”及 Contract task.context_refs 展开，不要把整个原生 App 的独立需求误并入小程序。

### 2.3 当前设计身份，不能退回旧版本

- 唯一视觉权威：`DESIGN.md#wechat-mini-program--sky-canvas-field-signal`。
- system target：`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`。
- selected target：`target-miniapp-field-signal-i21-selected-constraint-2026-09-03`，分类为 **constraint**，不是已证明 pixel-exact 的 production target。
- 当前绑定入口：`tools/miniapp/selected-design-bindings.json`。
- 当前 handoff：`docs/design-resources/miniapp-field-signal-i21-binding-2026-09-06-r11/selected-handoff/miniapp-field-signal-i21-current.md`。
- 当前 handoff SHA-256：`3320cd9a8541840a215e527d5d3e554defeb6f29a6ffe3079d2a7983224f848c`。
- 当前 feasibility：相邻 `selected-source/miniapp-implementation-feasibility.json`，SHA-256 `c6042aff1d916b152138a7100db6d2fef715a9143758baf65219b25943733a15`。
- R11 handoff 引用的 canonical 视觉包/manifest/Inspector/Oracle 闭包仍包含 `docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r6/selected-source/**`，按 handoff 精确引用打开，不以“目录不是 R11”为由替换。
- 当前资源规模：72 subjects、15,696 Fact Cells、72 facts、72 proof obligations；这是资源闭包信息，不等于真实产品通过。
- R7～R11 等 immutable binding 为保留的审计/协议资源，不能像普通旧代码一样清理，也不能把它们作为并行 UI 版本运行。
- `.long-task/rebind-sky-measurement-r10.mjs`、`.long-task/rebind-sky-recovery-r11.mjs` 是已经执行过的一次性修订脚本，**不要盲目重跑**。
- 若后续生产文件使已绑定 feasibility/source digest 变化：发布新的 immutable implementation binding，按现有 protected revision 路径纳入同一个任务。不得直接覆盖已采纳基线或仅修改哈希让检查通过。

## 3. 总范围与未完成状态

| Surface / 真实主路由 | 当前可确认程度 | 剩余交付工作 |
| --- | --- | --- |
| Map discovery：`pages/map/index`、`spot/search/index` | 有真实生产实现；已能从 Map 进入 My/Import；没有当前候选全量 UI/正式点位旅程通过证明 | Search 稳定锚点、filters/results、panel 单文档与三档、layer/time 互斥、正式点位全部 actions、降级/恢复和全条件外观交互复核 |
| Sky orientation：`sky/detail/index` | 已有真实星表、时间计算、透视视窗和 sensor 恢复修复；不是仍只有一张假图 | 当前正式入口全屏呈现、真实姿态/北向/视场校准、时间连续性、真机生命周期、可访问替代与最终验证 |
| My library：`pages/my/index`、`content/plan/detail/index`、`content/settings/index` | 页面与 owner 已有；不能宣称所有分支已验收 | 紧凑 account hub、Plan 持久化、三态显示模式、账号边界、返回 scroll/focus、失败/恢复和 UI 全量验证 |
| Profile content：`content/profile/links/index`、`content/import/index` | 实际创建 1 条私有导入到 PREVIEW；发现并修复 proposal identity bug | 链接完整路径；当前修复后的第一条重验；其余 9 条真实导入；正式点位关联及返回 Map 联动；权限/解析/编辑保护/重启分支 |
| Contribution：`content/contribution/index` | 单一 form 和生产服务/基础设施测试已有 | Spot/My 双入口真实 journey、键盘/媒体/权限/幂等/草稿/重启 pending、全条件 UI 与审核边界验证 |

这是 **9 条本次主要需求路由**。实际 `apps/wechat-miniapp/src/app.config.ts` 还含 auth、guides、field、data-source、article/detail 等支持入口；它们是相关 actions/恢复/内容路径依赖。不要为凑 9 而删除，也不要不经 Source 判定把它们扩张成新的 Product Surface。

目前没有可靠的“每一个控件都已视觉修好”证明。用户曾明确指出每个页面 UI 都有很大问题。后续必须逐真实入口对照当前已选约束复核并修复实际差异；不能把那些意见标为已解决，也不能未经检查断言 62 个控件全部尚未实现。

## 4. UI 与核心交互：先闭合真实页面，再集中跑完整业务验收

这一节是待复核/待修复集合，不是声称每项当前必然有 bug。执行时记录真实可复现问题到既有工作流 owner，修复后复测，不另建第二份验收矩阵。

### 4.1 全局视觉、反馈与适配

- 所有页面达到“小巧、精致、信息密度高但密而不挤”；精确字号、间距、边框、radius、颜色由当前 DESIGN/选定资源决定，不由截图猜值。
- day 纯白背景、night 独立暗色、observation 闭合黑/暖红；不恢复黄色底、大块深蓝、过大字号、粗框、卡片墙或多余留白。
- 无合法有效图片时不渲染图片节点、placeholder 或保留空白区域。
- 普通缺失值统一 `暂无数据`；loading/empty/permission/stale/error/not-applicable/safety 仍有不同真实模型和恢复路径，不能压成一种未知。
- 删除无动作价值的教学/实现/版本噪音；保留真正影响判断与恢复的反馈；provenance/freshness 可由既有 disclosure 到达。
- 检查 320/375/390/430 CSS-pixel equivalents、100%/200% text、safe area、至少 88rpx 语义点击区域、屏幕阅读器/键盘入口、reduced motion/transparency。不能只测默认 390 日间截图。
- 所有 scroll owner 隐藏滚动条视觉，但保留真实滚动、焦点和辅助输入；无页面横向溢出。
- 正常展开、退出、互斥和返回是连续可打断、可反向的动作；不靠多重 timeout 串联，不瞬间消失或重挂载丢状态。

### 4.2 Map / Search

- Search 入口与子页面字段位置、尺寸、颜色、文字/placeholder、输入原点保持不动，仅 leading glyph 因果切换为 Back；无 trailing x。
- autofocus、输入法收起、outside tap blur、再次 focus；不能把收键盘误作离开 Search。
- 紧凑 suggestions、无标题 wrap-safe filters、即时多选；`想去`/`其他观星点` 分区展开保留 identity、anchor、focus，不闪动或影响无关几何。
- 有图结果的左侧可读区保持约半宽与透图处理；整张卡片是唯一选择 action，无图不占空图位。
- 选择结果必须回到原 Map instance，改变同一个 selected spot，打开新点 medium panel；leading/system/edge Back 都验证。
- 定位拒绝后仍可浏览，不伪造 GPS；native map 外观不纳入自有视觉重绘。

### 4.3 Spot information panel / Layer / 时间尺

- `visibility` 与 `extent` 独立；small/medium/large 裁剪同一个同序同 identity 客观 document，只有 large 启用它的唯一纵向 scroll。
- 首次选点 medium；点空地图从当前位置平滑退出。large 到 primary navigation 上边界，不覆盖 Map/My。
- 仅 `104×40rpx` handle 区能启动 extent drag；tap/no-threshold 不变档，body/media/top edge 不抢拖动。large 的边缘返回与具名非手势等价路径必须存在。
- 无图保留紧凑 40rpx handle band；有合法 media 时 handle overlay，medium→large 先连续拉出 media，接近顶端再淡出 Map chrome；反向亦因果一致。
- `概览/天文` rail 位于可见 panel 垂直中点、贴合无 gap/侧向阴影，不占 document width；点击先放大再在同一 scroll owner 对齐 section，滚动反向更新选中项。
- 底部 `想去/分享/云观星` pill 紧凑等宽，不挡 navigation；route/facility/source/guide/contribution 等按唯一 owner 组织，无第二详情/夜空/地图/收藏真相。
- `bottomPresentation = none | spot-panel | layer-sheet` 唯一互斥状态；layer 打开后点新 marker 直接到新点 medium，不短暂还原旧 panel。
- Layer 是固定高度 bottom sheet，仅光污染/总云量/观测机会三个受支持项，真实状态不可用要如实；无 handle/x/独立“关闭”及左下第二张观测条件卡。
- 三处 curved time ruler 共享 mechanics 与真实时间上下文。真实横向 ScrollView 拖动、中心预览、释放 snap/commit、取消回滚；无箭头/外框/装饰假轨道。横拖、panel 纵拖、map pan/pinch 越过方向阈值后独占，不中途换 owner。

### 4.4 My / Plan / Settings / Profile

- My 是 account hub、Plan/Contribution utility group 和短 routine list；克制 role-colored SemanticIcon，不加假统计/商业模块/第二 favorites 浏览。
- Plan 编辑、保存、冲突/失败与重启恢复通过既有服务；不得 local-only 成功。
- Settings 唯一 `day | night | observation` 三态 owner：点击、相邻拖动、键盘/读屏直接选择；进入 observation 前原子绑定黑/红 tokens，退出保留任务位置，不闪白蓝。
- 账号状态/登录、偏好、提醒意图与实际平台授权区分；数据导出来自身份范围内服务端，账号删除不可冒充清本地缓存。涉及真实账号删除使用隔离测试数据，不删除用户正常账号来验收。
- Profile URL 校验、危险 scheme 拒绝、保存/删除/重启、外部打开/copy-first fallback、取消返回；不得暗示平台官方关联。
- 所有 My 子路由返回保留 meaningful scroll/opener focus，draft 不丢失。

## 5. 星图：已做什么、还必须做什么

### 5.1 已实现或有局部测试支持的内容

- 接入 checksum/version-bound 的 **Gaia DR3 2048 颗星**离线数据包；不是随机星点、静态夜空图片或 runtime CDN。
- 天文计算在 `packages/astronomy-core/**` 和 BFF astronomy owner；共享 contract 传场景，客户端只把天文方向转成 canvas/sensor-relative 像素。
- 采用三维 pointing window / perspective 投影，当前垂直 FOV 45°，使用实际 canvas aspect ratio，剔除背后/视锥外对象，不钳在边缘或把半球压进一小圆。
- 坐标/时间使用已选正式点位的 ObservationContext；J2000 到 of-date/horizon、时间尺场景随真实所选时间更新，覆盖跨日等局部测试。
- 全屏 canvas 已有 width/height 100% 修复；sensor invalid/stale 后重新收到同一 compass heading 的恢复缺陷已修复并绑定 R11。
- 已完成的星表和投影审计没有发现“星表坐标全集中一块”的数据问题；全部星表坐标有效、唯一且广泛分布。绘制调用级诊断也出现分布于视窗的点，而非小区域全集中。

这些是代码/几何/绘制调用层证据，**不证明当前真机所见就是最终合格效果**。旧模拟器截图中的聚集感不能仅凭这些测试宣布已消失。

星表限制必须诚实：采集查询虽有 `G <= 5.5` 条件，但 TOP 2048 的当前实际最暗星约 5.007534；不是完整的 5.5 等全星表。数量限制本身不是已确诊聚集原因。若实测视觉/科学范围要求更多星，先研究当前采集、bundle/性能和来源边界，再经受影响 Source/binding 判断，不能为“更密更好看”塞随机星。

### 5.2 后续方案

1. 确认运行的是当前 build，实际从 Map 的有效 formal spot panel 点“云观星”进入，不以 detached deep link 或 seeded spot 代替。
2. 在 DevTools 核查 canvas 测量时机、像素尺寸/DPR、布局占满 safe-area viewport、绘图清屏/重绘和 label 数量/遮挡。区分 CSS 压缩、尺寸未就绪、投影错误、姿态映射错误，不盲目改 FOV 掩盖。
3. 测横竖比例、四方位、俯仰/滚转、地平线/天顶、视锥边界、背后天体剔除；比对已存在的几何测试，不重复造第二投影实现。
4. 测时间尺预览/提交/取消、快速连续变化、跨午夜、旧请求迟到、当前对象与背景星同一时刻、返回 Map 后时间/selected spot 一致。
5. 真机开发反馈恢复时验证手机背面指向与场景中心、平台 alpha/beta/gamma 轴/正负号、compass 北参考、校准/精度/stale、Android/iPhone 差异；实际天空对照必须观察地点/时刻与正式点位上下文一致。远程云观星不能悄悄改成手机 GPS。
6. 不声称逻辑像素等于肉眼 1:1 比例；手机物理屏幕和眼距影响实际角尺度。应建立明确 FOV 和可接受指向误差的真实观测依据；若上游缺精确验收阈值，提出必要的受保护澄清，不能自行写“误差可接受”关闭义务。
7. 权限未给/拒绝/低精度/校准/stale/unavailable 时停止“当前 pose 有效”的主张，显示最小真实恢复；不合成朝向、不加手动方向控制兜底。
8. 验证 hide/background/back/unmount 停止监听，foreground/retry 正确重订阅、同 heading 可恢复；不持久化姿态轨迹。读屏对象替代、必要 disclosure 与 reduced motion/transparency 保留。

主要代码入口：

- `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`
- 同目录 `sky-view-projection.ts` / `.test.ts`、`sky-time-frame.ts` / `.test.ts`、`sky-canvas-time.test.ts`、`compass-lifecycle.test.ts`
- `packages/astronomy-core/src/{astronomy-engine-runtime.ts,gaia-catalog-projection.ts,gaia-catalog.test.ts}`
- `packages/miniapp-contracts/src/{sky-scene.ts,sky-scene.test.ts,types.ts}`
- `workers/miniapp-api/src/{astronomy-service.ts,astronomy-engine-adapter.ts,astronomy-golden.test.ts,sky-scene-catalog-provider.ts,sky-scene-catalog.test.ts}`
- `data-pipelines/star-catalog/**` 及其真实 pack/manifest 引用。

## 6. 夜空中国 10 样本真实导入：目前只走到第一条预览

### 6.1 固定语料与状态

唯一固定输入：`tools/miniapp/fixtures/nightchina-import-cases.json`。精确 URL、来源报告地点、拍摄日期、输入文本、短释义、版权策略与关联预期由此文件读取，不临时抽样替换。

| key | 文章 / 来源地点 | 预期关联 | 实际 DevTools 进度 |
| --- | --- | --- | --- |
| gd-yuebei-summer-night | 粤北夏夜引 / 清远阳山江英古道附近 | 独立 proposal | 已持久化到 PREVIEW，未点人工审核提交；发生在最新后端修复前，需重验 |
| gd-oujia-terraces | 星映梯田月映云 / 清远连山欧家梯田 | 独立 proposal | 曾填 URL/rights；未确认创建，最后数据库没有第二条；先观察未保存现场 |
| gd-yangshan-watch-sky | 守望星空 / 清远阳山 | 独立 proposal | 未完成真实链路 |
| gd-dapeng-summer-fireflies | 夏夜星萤 / 深圳大鹏地质公园 | 人工确认地理兼容的已有 formal spot | 未完成；当前正常目录无 published spot 是前置缺口 |
| gd-bajieshan-cloud-sea | 银河与云海相遇 / 清远连州八戒山 | 独立 proposal | 未完成真实链路 |
| outside-anhui-shangcun | 银河下的古村落 / 安徽绩溪上村 | 独立 proposal | 未完成真实链路 |
| outside-anhui-xucun | 星空下的历史 / 安徽歙县许村大观亭 | 独立 proposal | 未完成真实链路 |
| outside-yunnan-diqing | 通天之河 / 云南迪庆湖乡公路 | 独立 proposal | 未完成真实链路 |
| outside-hebei-bingshanliang | 星河画卷 / 河北张家口冰山梁 | 独立 proposal | 未完成真实链路 |
| outside-tibet-dingjie | 银河下的彗星 / 西藏日喀则定结 | 独立 proposal | 未完成真实链路 |

既有内存服务层 corpus tests 跑过全部 10 条，不等于上表真实 UI 10 条已完成。固定语料必须继续纳入 verification inputs/current snapshot/Counterfactual，不能为了省事只测广东一条。

每条真实旅程：Map→My→Import→来源 URL 与权利说明→创建可编辑草稿→真实 parser 能力或明确 GATED/PARTIAL/FAILED→编辑/保存→formal spot 或独立 proposal 二选一→预览→人工审核提交边界，并核查持久化、失败/重试、返回和恢复。提交是审核待处理，不是通过审核、发布或新建正式观星点。

版权：不复制全文，不下载/上传/转载来源照片。仅必要元数据、来源链接、自己写的短释义；权利声明不能谎称拥有照片。带图场景只用明确标注且与来源照片无衍生关系的本地合成测试图，走真实媒体 owner。

### 6.2 第一条可以恢复的现场

- import ID：`import:a9c7a1cf-ce52-4db8-9d25-1ab49a1b0156`。
- title：`粤北夏夜引｜来源元数据导入测试`。
- 最后数据库读回：stage `PREVIEW`、revision `5`、parseState `GATED`、moderationState `DRAFT`、visibility `PRIVATE`、spotId null。
- 当前 proposal ID：`spot-proposal:ca93595e-2345-4ceb-8925-42d59c6e08b1`。
- 没有上传来源照片，没有提交人工审核，没有发布。新对话先读回当前数据，不盲目重新创建同一导入或假设 stage 未变化。

### 6.3 刚修完但尚未在真实 UI 重验的 bug

前端 `apps/wechat-miniapp/src/content/import/index.tsx` 的 proposal 模式在每次保存/推进阶段都会发 `{spotId:null, createProposal:true}`。服务原先先清掉 next proposal 再生成 UUID，导致一条导入保存→关联→预览留下 3 个不同 proposal。

已修 `workers/miniapp-api/src/miniapp-service.ts` 的 `updateImportDraft`：复用 **current.spotProposalId**；只有当前没有 proposal 才创建；复用已有 proposalReviewState，不能把已存在审核状态重置 DRAFT。使用 current 而不是被清空过的 next；formal/proposal 互斥及原 optimistic revision/idempotency 不变。

新增/调整测试：

- `workers/miniapp-api/src/nightchina-import-corpus.test.ts`：10 样本服务测试；proposal 样本按真实 UI 请求形状重复保存/预览/提交，断言 ID 稳定。
- `workers/miniapp-api/src/miniapp-infrastructure.test.ts`：隔离 PostgreSQL 重复 EDIT_DRAFT、ASSOCIATE_SPOT、PREVIEW；SQL 断言只有一条对应 proposal；重启服务后回读同 ID/阶段。
- `workers/miniapp-api/src/test-fixtures/infrastructure-spot.ts`：把已有显式正式点位测试 fixture helper 从大测试文件提取出来，无行为变更。不是向正常目录发布点位的脚本。

后续必须：确认当前运行 API 已加载修改；重新从真实表单重复保存/回退/前进/恢复，观察请求与数据库身份稳定；再跑其余语料。已有正常数据里 3 条历史 proposal 未清理：先识别 exact orphan/references/audit impact，再决定是否需要授权下的可恢复定向处置；不能直接删表、重置数据库或通过清数据掩盖修复前事实。

## 7. 正式观星点与真实服务前置条件

上轮最后正常开发数据库：**26 个 DATA_INSUFFICIENT spot，0 个 PUBLISHED**；1 条私有 PREVIEW import，3 条历史 proposal。此次编写没有再次运行产品/修改数据库；这些是最后观察，下一对话需重新只读核对。

这意味着“测试里有 published fixture”不能替代“正常目录真实可选正式点位”。`gd-dapeng-summer-fireflies` 在 corpus 中的兼容目标是 `spot:sz-astronomical-observatory`，但不能据此断言该点已发布/已符合资料完整性，也不能把来源地理位置硬套成精确同一地点。

处理方案：

1. 经现有 repository/BFF 只读检查目录状态、canonical publication completeness、缺失事实与 evidence provenance，定位为什么没有可用正式点位。
2. 检查既有合法资料和 owner review 是否足以解决；缺真实信息、授权或人工判断时列出精确最小缺口。不得伪造设施/开放/路线/安全/版权事实，不能直接 SQL 改 PUBLISHED。
3. 隔离测试可继续使用显式 test fixture 验证组件和服务 mechanics，必须保留明显测试标识与 evidence qualification，不能混入正常开发目录或替代固定真实旅程。
4. 有合法正式点位后，经用户要求的人工兼容确认关联至少一条广东样本；回同一个 Map，验证 medium/large、section nav、route/access/facility、favorite toggle+restore、真实 share、云观星、sky/detail return、spot-scoped Contribution；selected spot/time/panel/return 不出现第二份 truth。
5. 真正发布/运营侧写入超出现有明确测试授权时暂停请求方向；与此同时继续 UI、星图数学、无 formal 前提的 9 条 proposal、服务/失败分支和可运行测试。

上轮 API capabilities：OWN_POST_IMPORT/PROFILE_LINKS enabled；WECHAT_AUTH disabled；parser disabled/GATED、无已验证 license/allowlist adapter，manual fallback available。此状态不是永久结论；恢复时重读。不能为跑通导入擅自启用未经许可抓取/绕 SSRF/license gate，也不能把本地测试 identity 描述成真实微信登录已验证。

Weather、map、route、light pollution、media、source disclosure 等逐 action 核查真实 provider/数据可用性。工具或地图瓦片能显示，不代表 API、GPS、预测或 EOG 数据已可用。无数据要真实降级，不生成假地理花纹或推荐结论。若属当前候选必须满足而无法取得的外部条件，保留 exact blocker，不擅自改为非需求。

## 8. Contribution 还需闭合的真实业务环

- 分别从 formal-spot panel 与 My 进入同一个表单；前者继承 context，后者选择正式点或新地点；无第二 form/store/wizard。
- report kind、spot context、affected topics、observed time、narrative、conditional location、bounded media+rights、唯一 submit 的顺序与紧凑呈现。
- existing spot 不请求当前定位；只有 new-place 才挂载 location consent/fields；拒绝/撤销/无权限/重试不能泄漏精确位置。
- MIME/大小/数量约束、EXIF 清理、上传 progress/fail/retry/remove；达到上限移除 add；已成功媒体身份与草稿保留；取消/切后台处理资源。
- 校验首个错误焦点与滚动；IME 不挡字段或唯一提交；320px/200% text 正常堆叠；无重复 sticky submit。
- double-submit 阻止，同一 retry idempotency key；真实 sink write/readback/restart，pending receipt 与历史列表身份范围正确。
- pending/approved/rejected、审核/合并/公开影响边界区分；提交不能变成已核验/已发布，其他用户数据不可见。
- 现有集成测试是有效局部证据，但 UI、权限、媒体和重启完整 journey 仍要在当前候选执行。

## 9. 真机调试经验已经沉淀，下一次不要重走弯路

稳定经验已进入 `project_context/areas/main/verification/wechat-device/development-feedback.md`，本节只导航，不另存配置真相。

1. **先用微信开发者工具官方“真机调试”二维码路径。** QR 调试不要求 ADB USB 授权。只有需要 ADB 抓屏/输入时才排 ADB；手机“传输文件”弹窗不是“允许 USB 调试”RSA。别为了扫码调试反复换线/撤销 USB 授权/重启手机。
2. 工具 A 账号与手机 B 账号可以不同，但必须各自对同一个 AppID 有相应开发权限；桌面 author 身份不自动授权另一手机账号。
3. 手机提示登录成功不等于桌面会话完成。桌面一直登录中要区分版本/profile/network；不要无限重复扫码。
4. 本机曾在 2.02.2607xxx/2.02.2608050 遇到 SWC app.asar helper 缺失/登录卡住；观察到的可恢复基线是 Stable `2.01.2510280`。这是本机事实，不是永久版本推荐。保留用户 profile，更新应做有界兼容探测。
5. `assets/icons/tab-map.png not found` 属于项目 build/snapshot 资源链；`resources/app.asar` 内 ENOENT 属于工具安装/version。不要修错 owner。
6. 用户最终发现手机 Wi-Fi 配置残留代理，关闭后并授予相应权限，连接改善。先检查手机 Wi-Fi proxy、同网段、物理网卡、端口/防火墙，不默认让用户关闭 Codex 所需 VPN/TUN。
7. 历史 `198.18.0.1` 是 TUN 地址，`192.168.31.26` 是当时物理 LAN；下次必须重新枚举，不能写死。LAN 失败后工具曾转 WAN 并显示已连接；分别记录 transport，不把 fallback 报成 LAN 已通。无需无条件勾局域网。
8. 成功阶梯：当前包/QR → 指定授权手机打开 → debug transport 连接 → 相关权限可观察 → 目标真实旅程成功或可解释失败。只显示绿色连接/腾讯地图不证明产品链路已通。
9. 开发反馈可以 debug/vConsole/remote；固定候选正式验收必须按 settled-candidate 约束，不挪用 debug 截图和 domain-relaxed 会话。

上轮桌面目标为 `wechatdevtools.exe`，标题 `starward-native-validation-a2ed93cb24e66a78 - 微信开发者工具 Stable v2.01.2510280`；另有 `nw.js` 窗口。窗口 ID/标题后缀/当前页面是临时观察，下一次重新定位。曾出现 API 截到无关 Chrome 页面，必须拒绝使用那张图推断小程序状态，重新激活唯一目标再截图。

DevTools 曾有未保存的 `settings.json`，不要盲目保存/丢弃/关闭。项目可能是 private snapshot，不一定等于当前生产 build；核对真实路径、AppID/config、fingerprint、构建文件完整性。旧 diagnostic-flat 项目不应成为最终产品候选。

## 10. 推荐的滚动执行次序与工程边界

### 10.1 恢复后的第一批安全动作

1. 读当前 `git status --short --branch`、diff、Goal/Source/Contract/技能；按 lifecycle reference 运行 existing `.long-task` resume，核对 task/revision/pending/freshness。不要输出整份数十 MB compiled/active JSON；解析后只打印需要字段。
2. 先检查已有服务、端口、IDE/项目、Docker 状态，复用健康会话；不因为旧会话句柄消失而启动第二份 watcher/IDE/API。
3. 审阅最新 proposal fix 与测试 helper extraction，做 current-candidate targeted type/test、modularity 与 protected-input drift 判断；不再实现一遍相同 bugfix。
4. UI 入口可用且已获当前操作授权时，重新观察 Import 页并完成第一条修复后的重复保存重验；其余独立 UI/星图工作并行推进。
5. 及早定位 formal directory 前置缺口；可修代码与真实事实不足分开。不要让该缺口阻止全部其他实现，也不要用假点位消灭阻塞。
6. 按第 4 节对九条主路由逐真实入口反馈，先消除明显 UI/布局/交互差异，再集中跑 10 条完整导入与联动，避免在明显错误的页面上堆“验收通过”记录。

### 10.2 Owner / 依赖 / 可复用方案

- UI：`apps/wechat-miniapp/**`，现有 app-store、Map/presentation coordinator、form/validation/upload owners；具体图标唯一 `components/semantic-asset.tsx`，token 唯一 Mini Program DESIGN projection。
- API/domain contract：`packages/miniapp-contracts/**`；BFF/持久化/审核/媒体：`workers/miniapp-api/**`；天文：`packages/astronomy-core/**` + 既有 BFF adapter；工具：`tools/miniapp/**`。
- 不从 UI 直连 provider，不给组件库掌管 selected-spot/time/form/transport，不引入第二地图/状态/表单/图标 owner。
- 既有 @taroify/core@1.0.6 复用评估发现其 @taroify/icons 依赖与唯一 icon owner 边界冲突，当前采用既有 Taro/Starward primitives 的已允许方案。初始提案的“首选 Taroify”不是现在重装依赖的指令。FloatingPanel 仅在真实 WEAPP 完整验证 handle/anchors/scroll/nav-safe/interruptibility 的允许集合内选择，不能为了用库放宽交互。
- 时间尺复用 Taro enhanced horizontal ScrollView mechanics，项目只负责 curve/snap/commit；星图复用 existing astronomy owner 和明确定义的 bounded geometry，不重做安全/天文基础设施或引入重型第二引擎。
- 未来改变星表数量/FOV/传感器源，应落在既有采集、scene contract、projection/platform adapter，而不是在页面塞第二坐标/时间真相。替代设计只有在兼容、性能、来源与精度证据充分时选择。
- 最新 proposal 修复保持当前数据库 identity/review 生命周期，未改 durable semantics；历史重复数据的处置是独立风险，不用代码修复自动授权清理。
- 每个后续材料性变更刷新 repository-bound Architecture Deliberation；正确性/可维护性始终判断，sensor资源、并发/幂等、bundle性能、安全/隐私、兼容、可观察性按实际风险触发。必要 durable Context 先更新，任务局部修复无需流水账写入 Context。

### 10.3 Subagent 使用

用户明确允许多 agent；现有 Long Task 执行政策仍适用。先选有收益、输入输出有界、父任务可集成且 owner/path/source-of-truth 两两不重叠的 packets，再实际调用多个 exact `agent_type=long_task_implementation`。不以“刚中断”取消默认委派，也不凭空假设 profile 不可用。

适合候选包例如独立 My/Profile UI、独立 Contribution UI、独立星图几何/测试，但实际分配前必须检查共享文件/组件/dirty diff，不能仅按名字假定不冲突。父任务拥有 Source/Context/Contract/Authority、集成、真实入口检查、当前候选和 Final Gate；workers 不做这些权威操作。共享 Map/time/selected-spot 跨 owner 工作保持协调；没有合格 disjoint 集合时使用 Skill 允许的 parent-only 原因，而非硬凑并行。

上一轮 sky_catalog_audit 与 sky_geometry_audit 已报告完成；新会话不能假设那些 agent 会话可复用，也不能将报告替代当前测试。

## 11. 验证现状、重跑入口与最终关闭

### 11.1 最近确实执行过的局部验证

| 检查 | 已知结果 | 时效与边界 |
| --- | --- | --- |
| API workspace 全量测试 | 91 tests，90 pass，0 fail，1 skip | 最新 proposal service/corpus 修复后跑过；后续 infrastructure test/helper 又改过，应对最终候选再跑 |
| API typecheck | pass | 最新 helper extraction 后跑过 |
| 隔离 infrastructure | pass，`verify_769f46bb12a04533` | 最新 helper extraction 后；真实 PostgreSQL/Redis/HTTP/backup-restore；非 UI/设备证明 |
| infrastructure artifact | `artifacts/miniapp/infrastructure/miniapp-infrastructure-session.json` | started `2026-09-05T17:25:05.961Z`、completed `17:25:16.083Z`；隔离 DB/cache 清理已记录；后续命令可能覆盖文件，核对 run_id |
| validate-harness | 曾通过；35 audited，0 warnings，6 waived | helper extraction 前；waiver/debt 不等于都消除，当前候选应重跑 |
| Long Task diagnose-revision | 曾为 no_authority_change | proposal bugfix 后、helper extraction 前；不能替未来修改背书 |
| Long Task preflight | 最新一次 ready，diagnostics 空 | helper extraction 后；只证明输入/可达性，不是 Final Gate |
| git diff --check | 最近通过 | 仅 whitespace 等有限检查，非产品质量 |

本交接回合是只读核对和文档编写，没有重新跑上述产品测试、操作 UI 或验证数据库现状。不把上表升级成今天全量通过。

### 11.2 项目现有命令入口

在仓库根目录，先确认 Node/npm 实际来源。本机曾被 DevTools 自带 Node 16 抢 PATH；已使用的 Node 为 `C:\Users\777\AppData\Local\nvm\v24.16.0`，目录仍存在时可在当前进程 PATH 前置，不写死全局配置。

```powershell
git status --short --branch
git diff --name-only
node --version
npm run check:miniapp:fast
npm run build:weapp --workspace @starward/wechat-miniapp
npm run test:miniapp:infrastructure
npm run test:miniapp:workflow
npm run test:miniapp:design-bindings
npm run design:system:verify
npm run design:lint
make validate-context
make validate-harness
git diff --check
```

`npm run test:miniapp:current` 串行包含 fast + infrastructure + **真实 DevTools native**；不是随时无环境前提可通过的普通单测。`npm run test:miniapp:native` 是现有正式 collector 入口，按 Context 先满足 candidate/进程排他/清理/端口条件；不能并行启动两个 formal writers。

日常 `npm run dev:miniapp -- --no-open` /已有 warm DevTools 用于快速反馈，`npm run miniapp:device:feedback` 用于定向实机开发反馈；先读该入口 help/skill，不臆造 flags。Docker 入口 `infra/miniapp/docker-compose.yml`，最近本机 PostgreSQL 55432、Redis 56379、API 8787；重新观察，不认为端口号证明是正确实例。不停掉其他项目 Docker 容器。

正式 runner 已有项目兼容修复，入口 `tools/miniapp/run-wechat-devtools-session.mjs`、`tools/miniapp/device-feedback-official.mjs`、`tools/miniapp/apply-ty-context-harness-compatibility.mjs`；固定 IDE HTTP/automation 端口在 owning Context 中为 23977/9420。尊重 physical path/snapshot、真实 CLI resolver、watcher/port cleanup 与 before/after fingerprint，不靠私有 API、路径别名或关闭断言绕过。

### 11.3 Final Gate 尚未做

现有五个 Outcomes：`map-experience`、`full-sky`、`my-profile-settings`、`contribution`、`current-candidate`；各有 runtime/degradation checks。具体 runner、Counterfactual、Population、Source/Fact/Control/External 条件以唯一 Contract 为准，不能把上述常用 npm 命令当作完整替代。

后续顺序：

1. 修好当前实现/真实入口发现的问题，补完缺失验证路径；审查 Context drift、实现/设计绑定和无新增未处置 debt。
2. 对任何受影响 code/config/Source/Context/check 变化重跑相应验证。修改 frozen runner、spec、feasibility 或需求时按 protected revision，不直接改已锁字节。
3. 完整检查 task-attributable diff；保留 unrelated dirty，明确处理候选范围。当前 main 允许为 Final Gate 做所需本地 clean candidate commit；不可 blanket git add 把不明文件一起提交，不可 push/PR。
4. 满足固定候选真实生产 HTTP/UI、隔离持久化、native cold-start、success/denial/failure/restart 全分支条件。`MEMORY_TEST` 或 development fixture 可以诊断，不能关闭正式真实候选。
5. 把当前 candidate+Authority 对应的原生/设备/视觉/IME/a11y/motion/传感器/网络等精确义务交由声明的真实外部验证流程。实机延期意味着这些仍未验证，不能标完成；Agent 可准备/组织证据，不能代人类确认。
6. 使用 Skill 的唯一 source-recompiled Final Gate，重跑全部声明检查、验证外部记录与同一 snapshot。Final Gate 是 Engineering Quality/Architecture/selected-design Conformance 唯一载体，不另跑默认 workflow 的第二 closure。
7. 只有当前 accepted terminal 且最终 Goal→Source 没漏项才结束。当前外部义务存在，不能凭 machine checks、preflight、旧截图、signed record 单独声称 accepted。Final Gate 不通过时继续定位或如实暂停。

## 12. 卡点分类与禁止事项

### 可以先绕开的依赖

- 用户不在手机前：继续 UI、数学/状态/数据库回归、DevTools 可观察路径；不把物理对齐说成模拟器已证明。
- 正式点位暂无：继续 proposal 导入、My/Settings/Profile、Contribution 新地点路径、显式隔离组件测试；正式点位联动保持未完成。
- parser 没许可：按已允许手动草稿与明确 GATED 测试；不擅自爬图/绕 gate。
- 某个 GUI 会话失效：先 read-only 定位唯一正确项目和真实工具状态；若仍需人工动作，给一个明确最小动作，继续独立工作。

### 不能绕过或虚假关闭

- 未获真实审核/完整性事实而伪造正式 spot、media rights、发布/上传/持久化成功。
- 用 fixture、静态图片、H5、prototype、自报 JSON、过去 session、几何审计替代真实 production/native/device 义务。
- 受保护语义修订需用户批准时自行批准；使用签名凭据代替人类实际观察。
- 未授权公开发布、AppID migration、平台 upload/review、远端部署、购买/升级、生产数据 mutation。
- 破坏工作区/他人进程、reset/checkout/clean、删历史合法资源、创建并行旧新 UI 或第二 state truth。
- 将 token/Cookie/私钥、账号敏感字段、设备标识、精确私人位置、QR 原始内容写入本文件、Context、提交或日志。

如果确实需要用户选择、外部审核、真实事实或实际设备动作才可前进，说明确切未完成项和影响，不反复让用户试同一动作。用户允许能绕的先做别的，不等于允许改变目标或假验收。

## 13. 可直接粘贴到新对话的继续开发 Prompt

```text
$long-task-workflow

请继续 E:\dev\Starward 当前 main 上已有的微信小程序 Field Signal I21 Long Task，不重新自举、不重新创建 Contract，也不要恢复旧任务 wechat-miniapp-v2-1-1-drift-correction。

请先完整读取本次未完成工作与交接方案：
E:\dev\Starward\.codex\work-items\wechat-miniapp-field-signal-i21-remaining-work-handoff-2026-09-06.md

然后读取其索引的原始/追加 Source、原 Goal、owning Context、DESIGN.md、当前 R11 handoff 与 canonical closure、唯一 .long-task/delivery-contract.yaml，以及当前 git status/diff。按已安装 Skill 的 authority-lifecycle reference 恢复 .long-task，以实际 Git common-dir active binding 为准。交接时任务 id 是 wechat-miniapp-field-signal-i21、Authority revision 28；最近已采纳修订为 6d2af35ebeda139ac624dcd6eb024acd748c8275879f486a84e5e30d7e7c4870。旧 Source 内“active_task_missing/启动全新任务”的 Prompt 是历史原文，不能现在执行。首次模型切换卡点已经解除，不重复。

请使用宿主当前 Goal；如果新对话没有承载该目标的 Goal，请创建一个续做目标，把本交接文件和完整 Source/Contract/当前设计身份索引写进目标文本，保留完整交付范围；不要新建第二个 Harness Long Task。宿主 Goal 的创建不等于重建现有 Contract。

目标仍是完整 5 Surfaces / 9 条主要需求路由 / 62 Controls 和全部适用状态、条件、关系的真实 Taro/React WEAPP 实现与 owner-only、non-commercial trial candidate 验证，不只做星图或最后截图。用户关切包括全页面 UI 差异、云观星真实天文数据和正常比例/方位的 pointing-window、全部 10 条固定夜空中国真实导入、至少一条广东样本合法关联已有正式点位后验证完整 Map 信息组件联动。交接文件是导航，不缩减原 Goal/Source/Contract。

优先完成不依赖我在电脑/手机前的实现、当前 DevTools 反馈和确定性测试；真机正式验收继续暂放，相关外部义务保持未验证。我允许在当前任务范围恢复必要的小程序开发者工具界面操作；必须遵守当前工具策略，重新观察正确窗口/项目，不使用旧坐标，不碰无关应用/未保存文件，也不代我作出登录、系统授权或人类验收。遇真实用户/外部边界先做能独立推进的事，实在无法继续再停下说明最小卡点。

先复核最新 import proposal identity 修复及 infrastructure fixture extraction，确认实际运行 API 加载当前代码，再重新验证第一条 PREVIEW 导入并完成其他九条。当前正常目录最后观测为 0 PUBLISHED，不能直接改状态或用 test fixture 冒充真实正式点。星图已有 Gaia/透视/时间/sensor 修复，不重做；从真实入口检查当前画布效果并修复缺口，手机物理指向仍需真实反馈。

按 Skill packet-first 政策选择真正 owner/path/source-of-truth 不重叠的有收益 packets，实际调用多个 exact agent_type=long_task_implementation；父任务保留 Source/Context/Contract/Authority/集成/当前候选验证/Final Gate。有合格包就不要因中断而放弃委派，无合格包按 Skill 如实说明。

保护已有 dirty worktree；直接 main，不 reset/checkout/clean、不自动 branch/worktree、不 push/PR、不公开 upload/review/release、AppID migration、远端部署或购买。设计/feasibility 绑定变化按新 immutable 版本与同一任务 protected revision，不覆盖已采纳基线。不得伪造图片权利、解析、sensor、账号授权、审核、发布、持久化或正式点位创建成功。

最后必须是 clean current candidate 与唯一 Final Gate；当前外部义务未履行时不能完成 Goal。不要把 preflight、局部测试、历史 UI/真机连接或本交接说明当作验收通过。
```

## 附录 A：完整 62-Control 防漏索引

以下是 owning Screen Contract 的当前 material family keys，重复行/marker/tick 不增加第二语义 owner。每项还必须展开 Contract 所属条件、relations、failure/recovery 和方法，不只检查“元素存在”。

### Shell/shared（5）

- `mini-primary-navigation`
- `display-mode-switcher`
- `data-source-disclosure`
- `notification-feedback`
- `page-state-recovery`

### Map/Search（13）

- `map-search-entry`
- `spot-search-shell`
- `spot-search-field`
- `spot-search-query-overlay`
- `spot-search-filter-group`
- `spot-search-filter-choice`
- `spot-search-result-list`
- `spot-search-result-card`
- `map-location-control`
- `map-analysis-focus-layer`
- `map-layer-selector`
- `map-time-control`
- `map-marker-panel-coordinator`

### Spot information panel（17）

- `map-spot-information-panel`
- `map-spot-panel-handle`
- `map-spot-panel-section-nav`
- `map-spot-panel-action-bar`
- `spot-favorite-action`
- `spot-share-action`
- `spot-cloud-stargazing-action`
- `spot-media-gallery`
- `spot-navigation-action`
- `spot-contribution-entry`
- `spot-route-summary`
- `spot-facility-evidence`
- `guide-article-viewer`
- `sky-professional-matrix`
- `sky-target-list`
- `sky-time-scrubber`
- `sky-map-canvas`

### Full-sky（5）

- `sky-orientation-canvas`
- `sky-orientation-sensor`
- `sky-orientation-recovery`
- `sky-orientation-object-list`
- `sky-orientation-time-ruler`

### My/library（8）

- `my-account-header`
- `my-settings-action`
- `my-profile-summary`
- `my-grouped-entry-list`
- `my-plan-entry`
- `my-contribution-entry`
- `plan-editor`
- `settings-form`

### Profile/content（6）

- `profile-link-editor`
- `profile-link-open-copy`
- `import-source-rights`
- `import-draft-editor`
- `import-spot-association`
- `import-preview-submit`

### Contribution（8）

- `contribution-kind-control`
- `contribution-spot-context`
- `contribution-topic-control`
- `contribution-observed-at`
- `contribution-location-consent`
- `contribution-media-upload`
- `contribution-submit`
- `contribution-status-list`

## 附录 B：未提交改动与交接保全

本次核对 HEAD 之外还有多个任务相关改动组，不应丢失：

- Source/Contract/author-draft、delivery-carrier 与 acceptance diagnostics。
- 星表/astronomy、scene contracts、全屏 sky、projection/time helpers、compass recovery 及测试。
- Context 中天文、验证/开发循环与真机实践更新。
- DevTools launcher、device-feedback snapshot/preview、workflow conformance、package scripts、verification spec 与 selected-design bindings。
- immutable R7/R8/R9/R10/R11 resources 和已执行一次性 R10/R11 rebind 脚本。
- 最新 import service/corpus/infrastructure 回归修复与未跟踪的 infrastructure-spot fixture helper。

最新修复核心 diff 应由新对话重点审阅：

```powershell
git diff -- workers/miniapp-api/src/miniapp-service.ts workers/miniapp-api/src/nightchina-import-corpus.test.ts workers/miniapp-api/src/miniapp-infrastructure.test.ts
Get-Content workers/miniapp-api/src/test-fixtures/infrastructure-spot.ts
```

`git diff` 不显示未跟踪文件内容，必须另读；不要据此漏掉 helper、sky 新模块或 immutable resources。具体归属以当前实际 diff/既有任务记录核对，不把全仓 dirty 一律归自己。本文件也只是新加的用户请求交接文档，不修改生产语义或既有 Authority。

Context: no durable fact change
