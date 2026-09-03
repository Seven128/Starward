# Starward 微信小程序设计系统 — 地图搜索与观星信息

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 在当前需求循环中的组件、布局、密度与运动来源。根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 是唯一 canonical adoption record；本文件只提供其不可变设计来源，不单独建立第二套系统。

## 选择、依赖与替代边界

- Owner direction：用户明确要求先修改设计系统，再重新生成全部设计资源；地图改为悬浮 Search + 独立搜索页，观星点基本/天文信息合并进地图内三档组件，时间控件改为弧形中心强调标尺，并提高全应用信息密度。
- Exact-value foundation：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。其 day/night/observation 色彩角色、语义圆角、边界、高程、基础 motion 和通用组件责任继续作为本系统的 exact-value foundation。
- Product/Screen dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 children。它们拥有 Surface、route、Control、数据、状态、commit/cancel/recovery、安全和 accessibility 语义。
- 本文件完整替代先前 Map/Finder Sheet、筛选星形、独立 Spot Detail/Spot Night、线性 Calibrated Time Scale、相关密度及页面组合陈述。`miniapp-field-signal-map-finder-ui` 与 `miniapp-field-signal-review-directed-components` 的不可变字节只保留为审计 provenance，不是 current generation dependency、兼容布局或 fallback。
- 地图 provider/basemap/tile/native-map/legal chrome、天文与天气算法、数据字段、权限策略、后台能力及 native App/owner operations 仍不属于本文件。所附第三方截图只用于理解空间比例和信息密度，不复制品牌、专有图标、底图、token 或功能集合。
- 产品 UI、handbook 导航、组件 specimen 和普通候选标题不显示日期、revision、`version`、`vN`、old/new/legacy、`旧版`、`新版`、demo/fixture/reviewer/debug 或资源生成说明。内部 target key、路径和 digest 只作治理元数据。

## 1. 紧凑但清晰的信息密度

### 1.1 字体角色

| 角色 | CSS px / rpx | 行高 | 字重 | 使用 |
|---|---:|---:|---:|---|
| conclusion | 22 / 44 | 31px / 62rpx | 600 | 一句决定性结论，最多两行 |
| page-title | 20 / 40 | 28px / 56rpx | 600 | 页面/大组件主标题 |
| section-title | 16 / 32 | 23px / 46rpx | 550–600 | 基本信息、天文信息和主要章节 |
| body | 13 / 26 | 20px / 40rpx | 400 | 正文、核心说明与列表主值 |
| ordinary-action | 13 / 26 | 19px / 38rpx | 500 | 普通按钮、行内动作 |
| compact-choice | 11 / 22 | 16px / 32rpx | 500 | 筛选项、紧凑视图值 |
| metadata | 11 / 22 | 16px / 32rpx | 400 | 距离、更新时间、次级证据 |
| status-tag | 10 / 20 | 14px / 28rpx | 500 | 仅短状态词 |
| final-commit | 14 / 28 | 20px / 40rpx | 550 | 唯一最终提交 CTA |

- 中文字距为 `0`；正文 400、动作/选择 500、结论/主标题 600，普通产品 UI 不用 700。数字使用 tabular nums；等宽字体只用于时间/矩阵值。
- 层级必须通过尺寸、行高、字重、基线、留白、少量语义色共同表达。不得把所有文字机械缩小、把辅助信息做成不可读灰字，或用全局粗黑补偿层级。
- 200% 文本允许换行和纵向扩展；不缩字、不裁切关键事实、不保留虚假的紧凑单行。

### 1.2 间距与容纳

- 主基线仍为 `8rpx`，微调 `4rpx`。320/375/390px 页面左右 inset 使用 `24rpx`，430px 使用 `32rpx`；全屏 sky/map overlay 可按安全区使用 `16–24rpx` edge inset。
- 同一信息行内部 gap `8–12rpx`；强相关行间 `8–12rpx`；普通组 `16–20rpx`；主要章节 `28–36rpx`。紧凑卡 padding `16rpx`，普通独立对象 `20–24rpx`，rare friendly recovery `32rpx`。
- 信息优先使用共享轴、dividers、icon+label、短 metadata 行和分区标题。Card 只包一个可独立识别的对象；不得每项一卡、卡套卡或用大留白模拟高级感。
- 可见几何与命中几何继续分离。所有动作 target ≥`88rpx`/44px；可见表面可以更小，扩展命中区不得重叠。

### 1.3 图标来源与一致性

- 唯一实现入口是现有 `SemanticIcon` adapter。通用图标从 Lucide 的 ISC 许可集合中按需本地化少量 SVG path，经 adapter 统一为 `28/32/40rpx`、圆端点/圆连接、默认 `3rpx` stroke；不在运行时远程加载，不导入 Lucide React runtime 或另一套 token。
- 当前通用子集覆盖 Search、Clear、Back、MapPin、Locate、Layers、Cloud、MoonStar、Footprints、Parking、Route、Camera、Share、Telescope、Chevron、Settings、Clock、Info、Alert 与 Retry。语义名称由项目 adapter 拥有，第三方图标名不进入产品合同。
- 月相、地平线、辐射点、星图对象和筛选 selected star 是项目专用几何，通过同一 adapter/asset pipeline 管理。筛选星是圆润五角实心 ornament，不从普通 outline icon 硬凑。
- 不混用线性、实心、彩色拟物图标集，不逐屏手画同一语义，不因参考截图引入完整 UI 组件库。

## 2. Map Discovery Frame

- 地图连续铺满可用 route，是唯一地图对象。Map 顶部只有一个 fixed floating Search field；它不承载筛选、结果、标题说明或第二行快捷入口。
- Search field 左右 inset `24rpx`，可见高 `88rpx`，`radius-panel`、solid `surface`、`1rpx border`、`elevation-1`；leading Search icon `32rpx`，query/placeholder 使用 body，尾部 clear target `88rpx`。顶部避让 menu capsule/safe area `16rpx`。
- 右侧 edge controls 可见面 `64rpx`，命中 `88rpx`，间距 `12rpx`。只容纳 location、观测条件和 layer；active layer rail 宽 `184rpx`，每行 visible `64rpx`/target `88rpx`，只呈现 `LIGHT`、`TOTAL_CLOUD`、`OPPORTUNITY` 与 off。
- Formal marker 使用 neutral core + 短锚点；selected 使用 `sky-soft` core、`2rpx sky` boundary 和非颜色状态。不得 glow、pulse、particle 或复制通用地图“更多工具”。
- Map 不再出现 Finder/Filter Bottom Sheet、selected callout 或详情页入口。正式 marker 直接弹出同一个观星点信息组件；非 marker map tap 令组件向下消失。

## 3. Dedicated Spot Search

### 3.1 Page composition

- 页面按 `safe header/Search → unified filters → result partitions` 排列。Search field 可进入编辑态并与系统键盘共存；内容使用一个纵向 scroll owner，field/filter header 可 sticky，但不得产生第二滚动容器。
- Search field 可见高 `88rpx`；Back、Clear 和 Search/submit 都拥有独立不重叠的 `88rpx` target。Suggestion overlay 贴在 field 下方，以 `surface`、`1rpx border` 和 `elevation-1` 覆盖内容，不推动结果几何。
- 所有过滤条件在一个 wrap group 中，不显示“快速”“更多”“展开条件”、draft count、apply/revert 或 checkbox table。Group 横向 gap `8rpx`、纵向 gap `8rpx`；分区之前用 `16–20rpx` 节奏和 divider 建立层级。

### 3.2 Filter Choice Capsule

- Visible capsule 高 `60rpx`，最小内容宽 `112rpx`，target 高 `88rpx`；`radius-pill`、`1rpx border`。水平 padding `16rpx`，prefix icon `28rpx`，icon-label gap `8rpx`，label 使用 `compact-choice`。
- Prefix icon 和文字处于普通 inline flow。不得给 selected star 预留 trailing width，default/pressed/selected/focused 的可见宽高、padding 和文字位置完全一致。
- Selected star 为 `56rpx` 圆润五角实心 ornament，absolute 定位 `right:-6rpx; top:-8rpx`，不 clip，Day 使用 `meteor` 48% opacity，Night 使用 `meteor` 44% opacity。它可以覆盖 trailing 文本区域，但 label 必须通过深色文字和软填色保持可读；`sky-soft` fill + `2rpx sky` inset boundary + programmatic checked state 仍独立表达选择。
- Observation 不保留黄色；相同几何映射到暖红 fill/opacity/boundary。Disabled 仍可读，hover 不放大边界，keyboard focus 使用 current inner edge。
- Select：star 从 live state 的 `scale(.42) rotate(-16deg) opacity(0)` 到 `scale(1) rotate(6deg) opacity(.48)`，`180ms standard`；capsule fill/border 同时 `160ms` state swap。Deselect 从当前状态回到 `scale(.55) rotate(-8deg) opacity(0)`，`140ms exit`。快速反向从当前 presentation retarget，不排队、不改变布局。Reduced motion 只保留 ≤`80ms` fill/opacity。

### 3.3 Result Card

- Card 占满内容列：320/375/390px 左右 inset `24rpx`，430px `32rpx`；最小高 `176rpx`，`radius-panel`，`1rpx border`，同一分区卡间距 `12rpx`。整张卡是唯一 action，pressed 使用现有 Press recipe。
- 有合法场地图像时，图片 `cover` 整个背景。左侧信息字段宽度固定为 card 的 `64%`，min `360rpx`、max `476rpx`；使用模式对应的高不透明阅读层：从 leading edge 的 96% opaque surface，到字段末端 88%，再在后续 `12%` 宽度内衰减为透明。它是文字可读性 scrim，不使用 blur/glass，也不复制图片为第二层。
- 无图、media unavailable 或非场地实景时使用相同几何的 solid surface，不伪造图。Text field 依次容纳 spot name、最多两行决策相关 metadata 和状态；关键文字不越过固定字段进入高纹理区。
- Card 右侧不出现“选择”、radio、checkbox 或第二 action。Whole-card accessible name 包含点位名和关键摘要；选择后返回现有 Map 并打开 small 信息组件。

## 4. Stargazing Spot Information Panel

### 4.1 State and geometry

- Panel 是 Map-parallel non-modal Bottom Sheet。状态拆成 `visibility = hidden | visible` 与 `extent = small | medium | large`；hidden 不是第四个尺寸。
- 顶角 `40rpx`，solid `surface`、`1rpx border`、`elevation-2`。Handle 可见 `64×8rpx`、`radius-pill`，完整 drag/tap target `88rpx`。
- `small` visible height：`276rpx + env(safe-area-inset-bottom)`；`medium` visible height：`54dvh`，并 clamp 在 `520–760rpx`；`large` top：`max(env(safe-area-inset-top) + 96rpx, 112rpx)`。320px/200% text 时 snap 位置不挤压文字，用户可用 handle/section nav 到达 large 完整内容。
- Small：点位名、当前结论、最小 metadata + bottom action bar。Medium：增加路线/设施/风险摘要。Large：一个内部 vertical scroll，连续呈现 media、基本信息和天文信息；不嵌套另一个 page/sheet。
- Vertical drag 从实时位置跟手；release 使用 velocity + nearest snap，bounded spring 上限 `320ms`。Large 内 scrollTop>0 时内容优先；scrollTop=0 且向下或从 handle 起手才交给 panel。Horizontal time-ruler gesture 获胜后不得被 panel 抢走。

### 4.2 Media, Search and layer transition

- Licensed spot media 只在 large 出现，位于内容顶部，高 `300rpx`、cover、左右贴 panel content edge；无合法媒体时使用同高度的 structured neutral horizon/map-independent placeholder，不冒充场景。
- 用 `p` 表示当前 presentation 在 small=`0`、medium=`.5`、large=`1` 的连续进度。Media opacity 为 `clamp((p - .72) / .18, 0, 1)`；Map Search opacity 为 `clamp((.66 - p) / .16, 0, 1)`，从而 media 完全退出后 Search 才出现。Search pointer/assistive interaction 只在 opacity=1 且 panel 不为 large 时启用。
- Layer trigger 在 `p ≤ .68` 时直接进入可见/可操作状态，在 `p > .68` 时直接离开；不与 Search 一起淡入，不添加位移动效。Reduced motion 在阈值处即时切换，仍保持 media 与 Search 不重叠。

### 4.3 Continuous content and navigation rail

- Large document 固定顺序：media/identity → Tonight decision → route/facility/safety → guides/field/source → `天文信息` heading → static sky/conclusion → opportunity window → curved ruler → core conditions → targets → professional/source evidence。
- 内容左右 padding `24rpx`；右侧为固定 navigation rail 预留 `112rpx`，不得让正文被 rail 覆盖。章节靠 `28–36rpx` vertical rhythm、shared axes 与 divider 分隔，不恢复 Overview/Guides/Site 或 astronomy tabs。
- Right rail 距右 `16rpx`、宽 `88rpx`，`radius-pill`、solid `surface`、`1rpx border`、`elevation-1`；两个 action 各有 `88rpx` target，icon `28rpx` + 10px label，顺序为 `概览`、`天文`。Selected 使用 `sky-soft` + inner `sky` indicator；Observation 映射暖红。
- Activating a rail item from small/medium first resolves large, then在 `240ms standard` 内把对应 heading 对齐到 panel content top；scrollSpy 根据真实 heading position 更新 selected。Reduced motion 直接对齐。Focus 只在 assistive/keyboard activation 后落到 heading；普通 touch scroll 不逐帧抢焦点。

### 4.4 Bottom action bar

- Bottom bar 与内容分离，左右 inset `24rpx`，bottom=`env(safe-area-inset-bottom)+12rpx`，可见高 `92rpx`、`radius-pill`、solid `surface`、`1rpx border`、`elevation-1`。三项等宽且各自 target ≥`88rpx`。
- 顺序固定为 `想去`、`分享`、`云观星`；每项 icon `32rpx`、label 10–11px。`想去` 复用 current Favorite relation/ritual；`分享` 是明确用户动作；`云观星` 使用 telescope/sky symbol 并进入 `sky/detail`。
- 不新增“导航/路线”作为第四项，不复制动作到内容卡，不用 icon-only 猜测含义。Observation 保持同几何并只用暖红 roles。

## 5. Event Opportunity Window

- 先显示绑定的正式目标/天象 `displayName` 与类型；没有 event/target 时写“综合观星条件”，不虚构流星雨。
- Anatomy：目标/天象标题、建议结论、主窗口时间范围、一个 opportunity rail、current/arrival/peak markers、2–3 条最有解释力的满足/限制条件、数据状态。条件只来自同一 `SkyOpportunity`、`ObservationWindow` 与目标 Source。
- Rail 高 `20rpx`、`radius-band`；whole night 为 neutral subtle、可核验窗口 sky-soft、主/最佳段 sky、天象峰值 meteor，current/arrival 使用不同 shape/label。备选只在有决策价值时作为弱化相邻段。
- 不同时展示第二条窗口图或三列表格。Time、duration、confidence、status 和条件围绕同一个对象排布。320px/200% text 保留 start/current/end 必要标签，完整值由等价文本读出。

## 6. Curved Time Ruler

- `map-time-control`、`sky-time-scrubber` 和 `sky-orientation-time-ruler` 共享 `curved-time-ruler` family 与同一 committed time owner；同一 viewport 不显示多个 current-time value。
- Visible lane 高 `128rpx`，direct-manipulation target 高 `112rpx`，overflow hidden 只裁视觉 tick，不裁命中。Fixed center axis 宽 `2rpx`、高 `48rpx`；当前值位于中心上方 `8rpx`，使用 body/600 + tabular nums。
- Track 每真实 slice 一个 tick，基础 step `48rpx`。Minor tick `12rpx`，major `24rpx`，center selected `40rpx`；当前 30min cadence 每 slice 一个 minor、每 2h 一个 major label，Source cadence 变化时从真实 domain 重建。
- 对中心 tick 距离 `d`（以 tick steps 计）使用：`u = min(abs(d)/6, 1)`；`scale = 1 - .38u`；`opacity = 1 - .72u`；tick base vertical offset=`18rpx × u²`。中心最大、最清晰且最高，向两边沿浅弧连续变小、变淡、下沉。中心外 `|d|>6` 不参与可见布局但仍可滚入。
- Ruler 在固定 center 下水平平移并使用 step snap。Drag 每帧预览对应真实 slice；release 以 projected position 选择最近有效 slice并在 ≤`140ms` settle 后 commit；cancel 回到 committed slice。新手势从 live translate 接管，不排队。Reduced motion 保留直接跟手并即时 snap，无 inertia/spring。
- Source-backed favorable/event intervals 可作为 ruler 下方同域 `12rpx` subordinate band；event node 使用 meteor，selection 使用 sky，普通 tick 中性。Observation 用暖红的高度、实虚和边型区分。
- Slider/adjustable 语义暴露 min/max/current、真实 step 和文字摘要；keyboard/assistive button 一次移动一个真实 slice。320px/200% text 只保留 center 和必要邻近/edge labels，不缩小 current value。

## 7. Full-Sky Orientation

- `sky/detail` 的 sky canvas 从 top safe area 延伸到 bottom safe area。Back/title、formal spot/time、单行 sensor state、真实 target labels 和 lower curved ruler 都是 compact overlays，不把天空缩成卡片。
- Source-backed target 直接锚在投影位置；不添加可能被误认成真实目标的装饰星。语义 object list 只在 screen reader、explicit disclosure 或 degraded sensor use 出现。
- Sensor pose 只改变视图呈现，不改变 spot/time/astronomy truth；foreground 消费 `alpha/beta/gamma`，需要绝对方位时复用 compass owner，离开/失焦即停止，不记录轨迹。Denied/calibrating/low-accuracy/stale/unavailable 共用一个 compact recovery geometry且不伪造 heading。
- Ruler 左右 inset `24rpx`，距 bottom safe area `24–40rpx`；Day surface `rgba(255,255,255,.90)`，Night `rgba(24,26,23,.90)`，Observation `rgba(17,0,0,.95)`，`radius-panel`、`1rpx border`，不用 blur/glass。Reduced transparency 改成对应 opaque surface。

## 8. Feedback and Favorite

- Selection、filter、panel extent、disclosure、navigation、favorite success、time scrub、layer 和 mode 依靠局部状态反馈，不另弹 toast/snackbar/modal。Persistent permission/partial/stale/offline/error 使用受影响对象旁的 inline Notification；floating 只用于当前对象不可见的短异步 completion、copy/save acknowledgement 或单一 undo，一次 transaction 最多一个。
- `spot-favorite-action` 保留当前生产 ritual：main star `52rpx`；inactive outline；activation `scale(.92) rotate(7deg)`/`180ms`；非交互 effect stage `inset:-48rpx`；最多三颗 subordinate marks 在 `420ms ease-out` 内 settle，delay `60/100/140ms`。不循环、不发光；取消/失败从 live state retarget。Reduced motion 去除 travel/rotation/satellites，仅保留 ≤`80ms` fill/opacity。该 exception 不扩散到筛选、页面背景或普通成功状态。

## 9. Mode, responsive and review boundary

- Day/Night 使用 base roles；Night 不用 glow/neon。Observation 维持 closed black/warm-red palette，筛选 yellow、sky/trail/risk、media placeholder、focus、loading 和所有 transition 都必须映射到允许的暖红 roles，不闪白。
- 必须审查 day/night/observation × 320/375/390/430px × 100%/200% text，并覆盖 normal/reduced motion、reduced transparency、keyboard/touch/screen-reader paths。
- 必须审查 Search autofocus/keyboard、filters selected/unselected rapid retarget、image/no-image results、panel hidden/small/medium/large/dragging、map-tap dismissal、media→Search sequencing、layer threshold、Overview/Astronomy navigation、Favorite ritual、Share boundary、Cloud Stargazing handoff、ruler drag/snap/cancel、sensor permission/degraded states和 notification restraint。
- 设计候选只能证明设计可审查性。Native map、marker hit geometry、WEAPP routing、safe area、keyboard、sensor、share、scroll/gesture arbitration、performance、data truth与生产 fidelity 必须在后续真实实现中独立验证。
