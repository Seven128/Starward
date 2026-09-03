# Starward 微信小程序设计系统 — 全屏信息与高密度交互

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 当前组件、布局、密度、滚动与运动来源。根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 是唯一 canonical adoption record；本文件是其不可变设计来源，不建立另一套系统，也不进入产品可见文案。

## 选择、依赖与替代边界

- Owner direction：先修改当前唯一设计系统，再重新生成全部设计资源；本轮把大尺寸观星点信息组件改为 page-like full-screen extent，修复拖动留白与 handle 几何，隐藏全部移动端 scrollbar chrome，按内容存在性处理图片，居中 section rail、压密 action rail，把 layer selector 改为固定高度底部 Sheet，保持 Search field 几何并允许失焦，改为纯白 day foundation，删除零决策价值说明，扩大因果动效覆盖，并重排现有职责范围内的 My account hub。
- Exact-value foundation：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。其未被本文件明确替代的 night/observation 色彩、语义色、圆角、边界、风险、Favorite ritual、基础组件与可访问性仍适用。
- Product/Screen dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 children。它们拥有 Surface、route、Control、数据、状态、commit/cancel/recovery、安全和 accessibility 语义。
- 本文件完整替代此前 Map/Finder、review-directed、Map/Search/spot-panel Source 中冲突的 offset-large、no-image placeholder、right expanding layer rail、warm day canvas、旧字体/图标比例、旧 panel rails、generic status/tutorial copy、Search focus/transition 和 Curved Time Ruler 几何。先前不可变文件只保留 audit provenance，不能成为 current generation dependency、fallback、兼容模式或 old/new 双轨。
- 地图 provider/basemap/tile/native-map/legal chrome、天文/天气算法、数据字段、权限策略、后台能力、native App 和 owner operations 不属于本文件。第三方截图只帮助理解 interaction class、比例和有效信息密度；不得复制品牌、专有图片/地图/图标/token/文案、商业模块或功能集合。
- 产品 UI、handbook 导航、组件 specimen 和普通候选标题不显示日期、revision、`version`、`vN`、old/new/legacy、`旧版`、`新版`、demo/fixture/reviewer/debug 或资源生成说明。内部 target key、路径、协议和 digest 只作治理元数据。

## 1. 白色基底与有效信息密度

### 1.1 Day roles

Day 页面与 page-like panel 的默认大面积 foundation 是纯白，不是暖黄或米白：

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#FFFFFF` | 所有 day page、Search、My、表单与 full-screen panel 背景 |
| surface | `#FFFFFF` | 输入、Sheet、浮层与独立内容对象 |
| surface-subtle | `#F6F7F5` | 仅局部 section strip、轨道、skeleton、选中阅读层 |
| text-primary | `#282B29` | 主要文本 |
| text-secondary | `#5E655F` | 次级决策信息 |
| text-tertiary | `#6D746D` | 必要 metadata；不得承载关键事实 |
| border | `#E2E5DD` | divider 与安静边界 |
| border-strong | `#8A9088` | 关键图形/handle；按组件规定降低视觉重量 |

Sky/meteor/trail/risk 与 focus 的 base values 不变。`surface-subtle` 不得铺满整页；层级优先来自 alignment、type、divider、局部状态和空间关系。Night 与 Observation 继续使用 base closed palettes，不从白色过渡经过未拥有的灰/蓝帧。

### 1.2 Mobile type roles

| 角色 | CSS px / rpx | 行高 | 字重 | 使用 |
|---|---:|---:|---:|---|
| conclusion | 20 / 40 | 28px / 56rpx | 600 | 一句决定性结论，最多两行 |
| page-title | 18 / 36 | 25px / 50rpx | 600 | 页面或 full-screen component 主标题 |
| section-title | 15 / 30 | 21px / 42rpx | 550–600 | 主要章节与分区 |
| body | 12.5 / 25 | 18px / 36rpx | 400 | 正文、核心 row value |
| ordinary-action | 12 / 24 | 17px / 34rpx | 500 | 普通按钮、行内动作 |
| compact-choice | 11 / 22 | 15px / 30rpx | 500 | 筛选、rail label、短值 |
| metadata | 10.5 / 21 | 15px / 30rpx | 400 | 距离、更新时间、次级证据 |
| status-tag | 10 / 20 | 14px / 28rpx | 500 | 仅会改变判断/行动的短状态 |
| final-commit | 13 / 26 | 18px / 36rpx | 550 | 唯一最终提交 CTA |

- 中文字距 `0`。正文 400、动作/选择 500、结论/页面标题 600；普通 UI 禁止 700，禁止以粗黑和大字号替代结构。
- 数字使用 tabular nums；等宽字体只用于时间/矩阵值。正文和标签使用系统中文字体栈。
- 默认 generic line icons 收敛为 `24/28/32rpx` 三档、圆端点/圆连接、`3rpx` stroke；关键专用图形另由其 component 定义。可见图标尺寸与 44px hit target 分离。
- 200% 文本按真实层级重排并允许换行；不机械缩小、裁切、降低对比、隐藏关键 action 或制造 page-level horizontal scroll。

### 1.3 Spacing and containment

- 仍用 `8rpx` 主节奏、`4rpx` 微调。320/375/390px 内容边距 `24rpx`，430px `32rpx`；full-screen map/sky overlay 使用 `16–24rpx` safe inset。
- inline gap `6–10rpx`，强相关行 `6–10rpx`，普通组 `12–16rpx`，主要章节 `22–28rpx`。Compact object padding `12–16rpx`，ordinary object `16–20rpx`，friendly recovery最多 `28rpx`。
- 先删除无效说明，再用 shared baseline、divider、icon+label、短 metadata 和 section heading 建立密度。Card 只包一个可独立识别的对象；禁止卡片墙、banner wall、空白列和用大 padding 模拟高级感。
- 所有 action target 仍至少 `88rpx`/44px；visible surface 可更小，但扩展区不得重叠。目标尺寸不是可见按钮、图标或文字必须同样放大的理由。

## 2. Scroll、media presence 与 content-noise contract

### 2.1 Hidden scrollbar chrome

- 每个移动端 vertical/horizontal scroll owner 保持 touch、wheel、keyboard、programmatic 与 screen-reader 可达，同时 scrollbar chrome 永久不可见且不占布局宽高。
- WEAPP/Taro `ScrollView` 优先使用 `enhanced` 与 `showScrollbar={false}`；支持端保留 `scrollX/scrollY`、`onScroll`、`onScrollEnd` 和必要 scroll position。Prototype/H5 同时使用 `scrollbar-width:none`、`-ms-overflow-style:none` 与 `::-webkit-scrollbar{display:none;width:0;height:0}`。
- 禁止用 page/body `overflow:hidden`、裁切内容、移除 scroll owner 或阻断键盘滚动来“隐藏滚动条”。只在视觉 tick/media mask 上使用局部 `overflow:clip/hidden`。

### 2.2 Content-presence media

- 可选图片采用 content-presence layout。只有 valid + licensed + resolved media 才渲染 media container；missing、empty、invalid、rights-unavailable 或 load-error 后没有图片、占位图、空白 block、固定高度或“暂无图片”标签。
- 只有真实 media request 的 loading interval 可显示与最终容器相同几何的 skeleton；请求结束为 no-media 时 skeleton 连同容器一起收起，后续内容从当前 live geometry 连续上移。
- Search result 的“无背景图片”只是 normal solid card，不额外保留背景槽；panel large 的无媒体内容从 safe header/identity 直接开始。

### 2.3 Visible-copy eligibility

- 普通 viewport 不显示“操作说明”、拖动/手势教程、实现结构、模式实现、数据管线、审计或调试文案。禁止示例包括“方向跟随中”“部分数据”“同一地图·一个分析图层·本地时间”。当前不新增通用 `?`、hover tooltip 或 help row。
- Permission、risk、failure、stale/partial/unavailable 只有在具体状态改变当前结论、操作可用性或恢复路径时显示，并必须说明受影响事实与结果，例如“官方预警未更新，暂不建议出发”，不能只给泛化 badge。
- Provider/model/source、valid/run time 和完整限制仍通过 existing `data-source-disclosure` 按需可达；它们不是永久 footer、标题旁 chip 或重复行。
- Screen-reader-only 语义不等于可见说明；它应描述 control/current state，而不是朗读实现教程。

## 3. Motion coverage

所有 material surface/state change 都有明确因果、可中断、可反向，并从 live presentation retarget。只有 reduced-motion、critical failure immediate stop 和 Observation atomic token swap 可直接替换。

| Recipe | Current → target | Timing | Reduced motion |
|---|---|---|---|
| press | neutral → `.985` scale + tonal/border → neutral | `80/120ms` standard | 只保留 tonal/border |
| local selection | old fill/indicator → new | `140–180ms` standard | ≤`80ms` opacity/fill |
| content reveal | `translateY(-8px)`, opacity 0 → position, opacity 1 | `160ms` standard | 即时显示 |
| Search child reveal | stationary field；下方 clip height 0、`translateY(-12px)`、opacity 0 → full | `180ms` standard；exit `160ms` | field 不动，其余即时显隐 |
| panel extent | live translate/size → valid snap | direct manipulation + bounded spring，≤`280ms` | 跟手，release 即时 snap |
| panel hide | live translateY → below viewport；结束后移除 hit/semantics | `220ms` exit | 即时 hidden |
| layer sheet | below viewport → fixed extent | `220ms` standard；exit `180ms` | 即时切换 |
| rail selection/align | live indicator/scroll → heading alignment | `180–220ms` standard | 直接对齐 |
| list/result insertion | old flow → new flow + opacity | `160ms`，stagger总计≤`120ms` | 直接落位 |
| Favorite ritual | 保持 current production exact recipe | 现有 `180/420ms` | 现有 ≤`80ms` fill/opacity |

- Route/nav、Search、panel、layer、filter、disclosure、result、mode-visible state 和 My group均不得在 normal motion 下突然出现/消失。
- 新输入立即取消/接管旧 transition；不排队、不积累 delayed callbacks、不从逻辑目标位置重新开始。
- 动效不增加 tutorial copy。状态与目标要靠位置、内容、程序状态和必要 label 自解释。

## 4. Map 与 stationary Search continuity

### 4.1 Map frame

- 一张物理地图连续铺满 Map route。顶部只有 fixed floating `map-search-entry`；不承载 filter、result、subtitle 或快捷工具行。
- Field rect：left/right `24rpx`，top=`safe-top + 16rpx`，visible height `80rpx`，target/input wrapper `88rpx`，`radius-panel`、white `surface`、`1rpx border`、elevation-1。Leading/trailing slot均 `88rpx` target；visible glyph `28rpx`；query/placeholder `26rpx/36rpx`、400。
- Location、观测条件、layer trigger visible surface `56rpx`、target `88rpx`、glyph `28rpx`、stack gap `8rpx`。Layer trigger只打开底部 layer selector，不在右侧展开文字 rail。
- Formal marker 与 selection exact roles沿用此前 current source；不得复制第三方地图工具、glow、pulse 或普通 POI能力。

### 4.2 Search transition and focus

- `map-search-entry` 与 `spot-search-field` 使用同一个 visual frame/DOM-equivalent layout contract。激活后 field outer rect、fill、border、radius、shadow、query value、type baseline、leading/trailing slot和caret origin保持逐像素稳定；不先缩放/位移再重建。
- Search child 的 leading slot在相同 `88rpx` box内从 Search glyph交叉替换为 Back glyph，input origin不变；这是唯一 glyph change。Back触发反向 child reveal并恢复 Map entry焦点。
- Field 默认 autofocus并打开 IME。任何未命中 field、suggestion option 或内部 action的有效 tap都会先允许当前 pointer transaction结束，然后 blur field、关闭 suggestion overlay并收起 IME；route、query、filters、results和scroll位置保留。再次点击 field可重新 focus。
- Field 以下 content以 top clip/reveal + `translateY(-12px→0)` + opacity `0→1` / `180ms`向下展开；field本身不参与这段运动。Suggestion overlay锚在 field下方并覆盖、不推挤 durable sections。
- Search页面只有一个 keyboard-safe vertical scroll owner；filter wrap、partitions和cards使用当前 compact roles。任何 scroll owner均不显示 scrollbar chrome。

## 5. Unified filters 与 result cards

### 5.1 Filter choice

- 所有 terminal filters属于一个 immediately committed multi-select group。无 quick/more、advanced、draft、apply/revert、hidden count 或 checkbox table。
- Capsule visible height `56rpx`，min-width `104rpx`，interaction row `88rpx`，horizontal padding `14rpx`，prefix icon `24rpx`，gap `6rpx`，label `compact-choice`。Default/pressed/selected/focus不改变宽高、padding或文字位置。
- Selected rounded star为 `52rpx` absolute ornament，`right:-4rpx; top:-8rpx`；不占 inline width。Day `meteor` opacity `.38`，Night `.36`；可覆盖 trailing text但 primary label对比仍达标。Selected另有 sky-soft fill + `2rpx` inset sky boundary + checked state。Observation用同几何暖红，不保留黄。
- Select star从 live `scale(.42) rotate(-14deg) opacity(0)` → `scale(1) rotate(5deg) opacity(.38)` / `170ms`；deselect → `scale(.56) rotate(-7deg) opacity(0)` / `140ms exit`。快速反向从当前值接管。Reduced motion只做≤`80ms` opacity/fill。

### 5.2 Result card

- Card占满content column，min-height `164rpx`，radius-panel，`1rpx border`，同组 gap `10rpx`。整卡是唯一 selection action；没有右侧“选择”/radio/checkbox/第二按钮。
- 有合法图片时，media cover整卡。Leading text field宽 `64%`、min `344rpx`、max `460rpx`；阅读层从 leading edge `98%` opaque white/surface至字段末端 `90%`，随后 `12%`宽内淡出。Night/Observation映射各自surface；不用blur/glass。
- 无图时整卡是普通solid surface，不产生media placeholder或额外高度。Name使用body/500，最多两行；decision/meta使用metadata，固定在leading readable field中。
- Press取消、scroll竞争和drag-away不提交。有效release/keyboard/assistive activation返回同一Map、保留camera/time/layer/filter并打开small panel。

## 6. Stargazing Spot Information Panel

### 6.1 Extents and page-like large

- 同一 Map-parallel non-modal owner具有 `visibility=hidden|visible` 与 `extent=small|medium|large`；hidden不是尺寸。Small=`248rpx + bottom-safe`；Medium=`clamp(500rpx,52dvh,720rpx)`；Large surface=`inset:0` relative to app viewport，完整覆盖普通Map chrome与`mini-primary-navigation`，background延伸到四边，document/action避让safe areas。
- Small/Medium顶角 `36rpx`，solid surface、`1rpx border`、elevation-2。Large顶角 `0`、无外阴影，表现为同一surface铺满而不是嵌套Modal/page card。
- Handle visible `48×6rpx`，`radius-pill`，Day `border-strong` at `.55` alpha、Night/Observation用各自quiet boundary；target `88rpx`。Handle在每个extent的上沿中央固定，pressed只做tonal/opacity，不改变top/transform/size。Tap按small→medium→large→medium循环；drag从live position接管。
- Large的左边缘 `32rpx` edge zone接受向右Back gesture；panel top-edge/handle接受向下collapse。两者在通过direction threshold后执行`large→medium`，保留selected spot、internal section和meaningful scroll state；named Back action和handle action提供非手势等价。普通Back/Escape顺序为owned disclosure→large→medium→small→hidden→route。
- Panel direct manipulation与content scroll/ruler遵循direction lock：large content scrollTop>0时content优先；scrollTop=0向下或handle/top-edge起手才collapse；horizontal ruler赢得手势后不转交。

### 6.2 Dynamic top content without blank space

- Panel content top由live extent、safe area与实际media presence共同计算；不得以旧large media高度占位或在drag结束后才重算。任意small↔medium↔large中间帧，identity/decision始终紧随当前可见top region，不出现大片无主空白。
- Large有合法media时，media从viewport top延伸并可位于system safe-area下方；height=`clamp(320rpx,28dvh,440rpx)`、cover。Back/handle使用mode-correct solid/tonal safety plate，避免依赖图片对比。
- Large无合法media时不渲染media node；compact safe header高度=`safe-top + 72rpx`，随后identity立即开始。不得显示“暂无地点实景”、horizon placeholder、skeleton-after-empty或固定media空档。
- 有media的large→medium transition中，media opacity=`clamp((p-.74)/.16,0,1)`；Map Search opacity=`clamp((.66-p)/.14,0,1)`。No-media path没有media phase，Search仍按panel进度进入。Search只有opacity=1后获得hit/semantics。
- Panel隐藏使用live translateY→viewport bottom / `220ms exit`，动画完成才移除surface；non-marker map tap不能瞬间display:none。

### 6.3 Continuous document and centered section rail

- Large document顺序：optional media → identity → Tonight decision → route/facility/safety → guides/field/source → `天文信息` → static sky/conclusion → event opportunity → curved ruler → core conditions → targets → professional/source evidence。只有一个vertical scroll owner且不显示scrollbar chrome。
- Content horizontal padding `24rpx`。Rail存在时在右侧预留 `96rpx`，章节 gap `22–28rpx`；优先divider/shared axis，禁止恢复tabs或卡片墙。
- `map-spot-panel-section-nav`：`position:fixed/absolute` to panel visual viewport，`top:50%` + `translateY(-50%)`，right `12rpx`，visible width `72rpx`，radius-pill，solid surface、`1rpx border`、elevation-1。两个item visible `64rpx`、target `88rpx`，icon `24rpx`，label `20rpx/28rpx`。Rail避让top/bottom safe area、keyboard和action bar；若可用高度不足则在保持44px targets下整体重排，而不是偏移到顶部。
- Activation必要时先扩展large，再以`200ms standard`对齐document start或astronomy heading；rail/handle自身几何不动。Touch scroll只更新selected indicator；assistive activation对齐后聚焦heading。Reduced motion直接对齐。

### 6.4 Compact bottom action rail

- `map-spot-panel-action-bar`左右inset `24rpx`，bottom=`safe-bottom + 8rpx`。Outer interaction lane `88rpx`，visible pill height `72rpx`，radius-pill、solid surface、`1rpx border`、elevation-1。
- 三项等宽且各自target `88rpx`，顺序`想去 / 分享 / 云观星`。Visible icon `28rpx`、label `20–21rpx / 28–30rpx`、vertical gap `2–4rpx`；不放大icon、背景或字重来填满hit box。
- Favorite复用current exact ritual。Share与Cloud语义和安全边界不变。不得增加第四项、复制到document或改成icon-only。

## 7. Fixed-height bottom layer selector

- `map-layer-selector`包含compact Map-edge trigger和一个fixed-height bottom-sheet presentation，不新增第二Control key。Layer sheet与spot panel共用Map bottom-presentation coordinator并且视觉互斥。
- Sheet visible height=`360rpx + safe-bottom`，top radius `32rpx`，solid surface、`1rpx border`、elevation-2；没有可拖动handle或多extent暗示。Header visible `64rpx`，title使用section-title，Close glyph `28rpx` / target `88rpx`。
- Content只显示`光污染 / 总云量 / 观测机会 / 关闭图层`四个existing values，2×2 wrap或窄屏单列。Choice visible `64rpx`、target `88rpx`、icon `24rpx`、label compact-choice；selected使用sky-soft + inset boundary + checked state。普通base map不是choice。
- Trigger activation将spot panel暂时滑到hidden presentation而不清除selected spot/extent，随后layer sheet从底部进入。Close或confirmed selection令sheet退出并恢复此前panel extent；新输入从live positions retarget。不得显示provider/basemap/卫星/交通/雷达/风/温度等能力，也不显示“同一地图”“本地时间”之类实现说明。

## 8. Event Opportunity 与 Curved Time Ruler

### 8.1 Event Opportunity

- 保持此前current语义：关联真实event/target时显示其formal name/type与主窗口；否则写“综合观星条件”，不得虚构天象。只保留一个coherent opportunity rail、current/arrival/peak markers和2–3个决策因素；禁止第二条图或重复表格。
- Generic “部分数据”badge不显示。若缺失会改变结论，直接在受影响因素写具体影响；完整source/freshness按需disclose。

### 8.2 Reuse boundary

- 已核对TDesign Mini Program、NutUI Taro、Taro primitives与常见React Native ruler packages。TDesign/NutUI的Picker/DateTimePicker/Slider不提供横向弧形中心强调；已发现的ruler packages使用React Native list substrate且为flat ruler，不是WEAPP-compatible source。
- 选择复用Taro enhanced horizontal `ScrollView`：`scrollX`、`enhanced`、`showScrollbar={false}`、`fastDeceleration`、`onScroll/onScrollEnd`和center-alignment capability。Project-local `curved-time-ruler`只拥有tick projection、label pruning、window/event band和valid-slice snap；不重造通用scroll physics，不引入第二UI system。

### 8.3 Exact ruler geometry

- Visible ruler block `112rpx`；direct manipulation lane `96rpx`且所在whole control target≥`88rpx`。Fixed center axis `2rpx × 42rpx`；current value居中在ticks上方，使用final-commit/600 + tabular nums。左右可有visible glyph `24rpx`的decrement/increment actions，各target `88rpx`；没有操作说明文字。
- 每个真实slice一个tick，base step `36rpx`。Minor `12rpx`，major `24rpx`，selected center `38rpx`；当前30min cadence每slice一tick、每2h一个major label。Source cadence变化时从真实domain重建，不插值事实。
- 对tick中心距viewport中心的normalized distance `u=clamp(abs(x-center)/(viewportWidth/2),0,1)`：`scale=1-.54×u^1.2`，`opacity=1-.82×u^1.15`，`translateY=24rpx×u^1.6`。Center最大、最清晰、最高；两侧沿同一浅弧连续缩小、变淡、下沉。只有center与必要major/event labels可见，edge label opacity不得低到承担关键值。
- Track在fixed center下滚动；每帧只preview nearest real slice。Scroll end/projected offset snap到最近valid slice并在≤`120ms` settle后commit；cancel回committed offset。新drag从live offset接管，不排队。Reduced motion保留native direct scroll并即时snap，不额外spring/inertia。
- Source-backed favorable/event band高度`8rpx`，subordinate于ticks；selection用sky，event用meteor。Observation只用warm-red高度/实虚/shape。Map/panel/full-sky共享同一component family与committed time owner。
- Slider/adjustable semantics暴露min/max/current/step；keyboard/assistive controls一次前后移动一个real slice。320px/200%只减少非必要labels，不缩小center current。

## 9. Full-Sky Orientation

- `sky/detail` canvas覆盖top/bottom safe areas之间全部可用viewport。Back/title、formal spot/time、in-canvas targets、necessary recovery和lower curved ruler是compact overlays；无普通成功状态栏、说明块或对象列表主区。
- Sensor-follow正常运行时不显示“方向跟随中”。程序状态与accessible name仍暴露following；permission/calibrating/low-accuracy/stale/unavailable只有在改变可用性时显示一个compact recovery/status，并停止伪称current pose。
- 不显示“每次移动30分钟”“释放后对齐”等手势教程。Ruler的刻度、center value、arrows和direct manipulation自行表达操作；首次教学不在当前scope。
- Real targets直接标在sky projection。Screen-reader/degraded object list按需可达，不常驻。无装饰星冒充数据，不记录pose trajectory。
- Ruler左右inset `24rpx`，bottom=`safe-bottom + 24rpx`；Day `rgba(255,255,255,.92)`，Night `rgba(24,26,23,.92)`，Observation `rgba(17,0,0,.96)`；reduced transparency使用opaque surface，无blur/glass。

## 10. My account hub

- 只重排existing `miniapp-my-library` duties：account/profile、Settings、Plan、Contribution、grouped routine entries及其真实status。禁止引入Favorites副本、订单/钱包/会员/勋章/促销/banner、社交统计或第三方功能。
- Page使用white canvas。Top account header从safe top开始，horizontal padding `24rpx`、vertical padding `20rpx`；avatar visible `88rpx`（44px）/target按实际action语义，display name page-title，account state metadata。Settings glyph `28rpx`置于独立`88rpx`target，header不加说明subtitle。
- Profile summary作为与header对齐的plain rows或单一subtle band，不做hero banner。Plan/Contribution形成一个2-column utility group：每项visible min-height `88rpx`、target≥`88rpx`，icon `28rpx`，title body/500，真实status metadata；320px/200%时转单列。
- 其余existing entries按section-title + divider rows排列，每row min target `88rpx`，leading icon `24–28rpx`，title body，trailing value/chevron metadata。最多一个局部subtle surface，不为每行建card。
- Page和children隐藏scrollbar chrome；group reveal、status refresh和route-child返回使用Motion contract并保留scroll/focus。

## 11. Mode、responsive 与 review boundary

- Day使用pure-white foundation；Night保持low-chroma near-black；Observation保持closed black/warm-red。Mode switching先绑定目标tokens，禁止white/blue flash或中间旧token帧。
- 必须审查day/night/observation × 320/375/390/430px × 100%/200% text，以及normal/reduced motion、normal/reduced transparency、touch/keyboard/screen-reader。
- 必须审查：Search stationary rect、autofocus/outside-blur/IME/suggestion order；filter rapid retarget；image/no-image results；panel hidden/small/medium/full-screen-large/edge-back/top-drag；media/no-media drag中间帧；handle press geometry；center rail/section align；compact action rail；non-marker animated hide；fixed layer sheet/restored panel extent；hidden scrollbars但可滚动；new curved ruler drag/snap/cancel；full-sky noise removal/recovery；My existing-duty hierarchy；Favorite exact ritual；meaningful safety/error recovery；no visible demo/version/tutorial/implementation copy。
- 候选只证明设计可审查性。Native map、WEAPP routing、safe-area、keyboard/IME、system Back、scroll/gesture arbitration、sensor、share、performance、data truth与生产fidelity必须在后续真实实现中独立验证。
