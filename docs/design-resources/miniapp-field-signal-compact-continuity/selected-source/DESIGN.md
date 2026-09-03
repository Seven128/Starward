# Starward 微信小程序设计系统 — 紧凑连续交互

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 当前组件、布局、密度、运动与状态连续性来源。根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 是唯一 canonical adoption record；本文件是其不可变设计来源，不建立第二套系统，也不进入产品可见文案。

## 选择、依赖与替代边界

- Owner direction：先修订当前唯一设计系统，再重新生成全部设计资源。本轮收敛 Search 返回与静止锚点、无标题 filter group、无抖动 disclosure、半宽可透图结果卡、image-backed layer sheet、nav-safe information panel、handle-only drag、floating section rail、compact action rail、objective-only document、无框 Curved Time Ruler、headerless Full-Sky 与 marker-to-medium default。
- Exact-value foundation：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。未被本文件明确替代的 night/observation palette、语义色、基础圆角、risk、Favorite ritual、基础 component semantics 与 accessibility 继续适用。
- Product/Screen dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 children。它们拥有 Surface、route、Control、数据、状态、commit/cancel/recovery、安全和 accessibility 语义。
- 本文件完整替代此前 component/layout sources 中冲突的 Search clear/exit、filter title/divider、large section type、remount disclosure、64% opaque result field、layer `x`/off/separate condition card、panel-over-nav、whole-panel drag、tap-to-cycle handle、reserved rail column、oversized action rail、decision/recommended-window copy、framed ruler 与 boxed Full-Sky header。先前不可变文件只保留 audit provenance，不能成为 current generation dependency、fallback 或 compatibility path。
- 地图 provider/basemap/tile/native-map/legal chrome、天气/天文/路线算法、数据字段、权限策略、后台能力、native App 与 owner operations 不属于本文件。附件只作为 defect evidence 或 interaction/density inspiration，不是 exact target；不得复制第三方品牌、专有地图、图片、icon、token、文案或业务职责。
- Product UI、handbook navigation、component specimens 与普通候选标题不显示日期、revision、`version`、`vN`、old/new/legacy、`旧版`、`新版`、demo/fixture/reviewer/debug 或生成说明。内部 target key、路径、协议和 digest 只作治理元数据。

## 1. Research synthesis 与 Build / Reuse / Buy

- Apple Search guidance支持 focused transient Search；标准 Back回溯层级，Close只关闭 modal。Apple Layout/Design Principles要求每个元素都有目的，以 alignment、grouping、type 和 progressive disclosure表达层级。Apple Accessibility把可见图形与操作目标分开，并要求手势存在可达替代。
- Android Material Search把 collapsed field与expanded content建模为一个 Search owner；Predictive Back区分 preview/cancel/commit；standard bottom sheet与主UI共存；layout-phase animation会引发额外 re-layout，因此 disclosure/panel必须由单一 live geometry驱动，不能 remount两棵树。
- WeUI/TDesign只作为微信生态 pattern 检查。WeUI Searchbar把 Search、Cancel与“有值才出现的清除”分开；本轮 owner明确不需要重复 `x`，所以当前 Search两态均无 trailing clear。
- Current repo只安装 Taro component primitives，没有 TDesign、NutUI、Taro UI 或第三方 ruler。TDesign Mini Program、WeUI、NutUI Taro与 Taro官方目录没有同时提供 WEAPP-compatible horizontal scrub、fixed-center snap、arc projection、edge scale/opacity taper和real-slice semantics的控件。已知 React Native ruler依赖RN list substrate且为flat presentation，不是可复用 owner。
- Allowed set：existing Taro/WEAPP primitives、existing `SemanticIcon`、当前asset pipeline、兼容的isolated pattern、bounded local SVG/raster、自有薄projection或 intentional non-abstraction。Selected：Taro enhanced horizontal `ScrollView`拥有scroll physics与events；project-local Curved Time Ruler只拥有projection/snap。Layer imagery使用本地生成或自有 abstract assets。禁止第二 UI/token/state/scroll owner、RN-only package、runtime remote asset、未审license素材和第三方品牌仿制。

Research references：

- `https://developer.apple.com/design/human-interface-guidelines/search-fields`
- `https://developer.apple.com/design/human-interface-guidelines/toolbars`
- `https://developer.apple.com/design/human-interface-guidelines/layout`
- `https://developer.apple.com/design/human-interface-guidelines/accessibility`
- `https://developer.android.com/develop/ui/compose/components/search-bar`
- `https://developer.android.com/design/ui/mobile/guides/patterns/predictive-back`
- `https://developer.android.com/develop/ui/compose/animation/quick-guide`
- `https://developer.android.com/reference/kotlin/androidx/compose/material3/BottomSheetScaffold`
- `https://github.com/tencent/weui-wxss`
- `https://github.com/wechat-miniprogram/weui-miniprogram/blob/master/src/components/searchbar/searchbar.wxml`
- `https://github.com/Tencent/tdesign-miniprogram`
- `https://docs.taro.zone/docs/components/viewContainer/scroll-view/`

## 2. Compact-but-clear density system

### 2.1 Day roles

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#FFFFFF` | Day page、Search、My、form与page-like panel foundation |
| surface | `#FFFFFF` | field、sheet、floating control与independent object |
| surface-subtle | `#F6F7F5` | 局部selected/track/skeleton；不铺满页面 |
| text-primary | `#282B29` | 主要文本 |
| text-secondary | `#5E655F` | 次级事实 |
| text-tertiary | `#6D746D` | 必要metadata |
| border | `#E2E5DD` | 安静divider/boundary |
| border-strong | `#8A9088` | handle/关键graphic，按组件降低alpha |
| active-soft | `#EFF1FF` | active layer/section/filter的浅蓝反馈 |

Sky/meteor/trail/risk 与 Night/Observation 的 exact roles继承base。Hierarchy优先来自 alignment、type、weight、value axis、divider和局部 selected fill，不用整页暖底、卡片墙、厚阴影或大块深色active。

### 2.2 Mobile visual type roles

| 角色 | CSS px / rpx | 行高 | 字重 | 使用 |
|---|---:|---:|---:|---|
| conclusion | 18 / 36 | 25px / 50rpx | 600 | 稀有且真实的一句结论；当前spot panel不用 |
| page-title | 17 / 34 | 23px / 46rpx | 600 | page/full document identity |
| section-title | 13.5 / 27 | 19px / 38rpx | 550–600 | 主要章节，不用于Search partitions |
| body | 12 / 24 | 17px / 34rpx | 400 | 正文、row value与Search partition |
| ordinary-action | 11.5 / 23 | 16px / 32rpx | 500 | 普通button/row action |
| compact-choice | 10.5 / 21 | 14.5px / 29rpx | 500 | filter、rail、短value |
| metadata | 10 / 20 | 14px / 28rpx | 400 | distance/update/supporting fact |
| status-tag | 9.5 / 19 | 13.5px / 27rpx | 500 | 仅改变use的短status |
| final-commit | 12.5 / 25 | 17px / 34rpx | 550 | 唯一final CTA |

- 中文字距`0`，普通UI禁止700。小字使用Regular/Medium而非Light；数字用tabular nums，时间/矩阵值才使用等宽。
- Generic line icons只用`22/24/28rpx`三档、圆端点/圆连接、`3rpx` stroke。Rounded star、moon、horizon等特殊图形经同一个 `SemanticIcon` adapter输出。
- 可见surface/icon可以紧凑，action semantic target仍至少`88rpx`/44px且互不重叠。200% text按role优先级reflow/stack；不裁切关键值、不降对比、不隐藏action、不产生page horizontal scroll。

### 2.3 Spacing and containment

- 继续使用`8rpx`主节奏和`4rpx`微调。320/375/390px content inset=`24rpx`，430px=`32rpx`；Map/Sky overlay=`16–24rpx` safe inset。
- inline gap=`6–8rpx`；strong-related rows=`6–8rpx`；ordinary group=`10–14rpx`；major section=`18–24rpx`；compact object padding=`10–14rpx`；ordinary object=`14–18rpx`。
- 删除无效title、divider、explanation和surface后再排版。Section title只有在命名有助于scan或navigation时存在；同一紧邻filter group不自带“筛选条件”标题。Divider只分隔两个仍可能被误读为一组的meaningful regions。
- Card只包一个可独立识别对象。Repeated facts优先aligned rows/shared axes；禁止为每行加圆角、用large padding或dense shadow制造“高级感”。

## 3. Search continuity、Back 与 filters

### 3.1 One stationary Search field

- Map仅有fixed floating `map-search-entry`。Field left/right=`24rpx`，top=`safe-top + 16rpx`，visible height=`80rpx`，input/target wrapper=`88rpx`，`radius-panel`，solid `surface`，`1rpx border`，elevation-1；query=`24rpx/34rpx`。
- `map-search-entry`与`spot-search-field`共用同一outer rect、fill、border、radius、shadow、query value、type baseline、input origin和hit geometry。进入/退出时field不平移、缩放、闪烁或remount。
- Map态leading slot是Search glyph；Search态在同一slot内交叉替换为Back glyph。两态均没有 trailing `x`、clear、chevron或空的第二action。Back glyph、微信/系统 Back和平台edge-back gesture都pop Search child回Map。
- Search进入：field以下page content从`clip-height:0`、`translateY(-12px)`、opacity0到live height/0/1，`180ms standard`；退出反向`160ms exit`。Edge-back progress可直接驱动clip/opacity，cancel回live state，commit才pop route。Reduced motion保持field不动并直接显隐content。
- Entry默认autofocus/IME；outside tap可blur并关闭suggestions/IME而不离开route。Suggestion option先commit pointer transaction再cleanup。Search只有一个keyboard-safe vertical scroll owner且scrollbar chrome不可见。

### 3.2 Titleless compact filter group

- Search field下方直接是一个adaptive wrap-safe multi-select group；不显示“筛选条件”title、intro、divider、quick/more、advanced、draft、apply/revert或hidden count。
- Choice visible height=`48rpx`，interaction target=`88rpx`，horizontal padding=`12rpx`，prefix icon=`22rpx`，gap=`6rpx`，label=`compact-choice`。Default/pressed/selected/focus不改变width/height/padding/text position。
- Selected rounded star=`48rpx` absolute ornament，`right:-4rpx; top:-8rpx`，不占inline width；Day meteor opacity`.32`，Night`.30`，Observation映射warm-red。Selected另有active-soft fill、`2rpx` inset sky boundary、prefix/label和checked state。
- Star从live `scale(.42) rotate(-14deg) opacity(0)`→`scale(1) rotate(5deg) opacity(.32)` /`170ms`；deselect→`scale(.56) rotate(-7deg) opacity(0)`/`140ms exit`。快速反向取消旧transition并从current value继续；reduced motion≤`80ms` fill/opacity。

### 3.3 Stable result partitions

- First-level partitions仍只有`想去`与`其他观星点`。Heading使用body `12px/17px`、600，count使用body/500，visible row保持紧凑但whole target≥`88rpx`；没有section-title放大。City只是group label。
- Expand/collapse由single retained DOM/state tree与measured current block size驱动：container height/clip和inner opacity一起在`160ms` retarget；不先remount、`display:none`、重建cards、改card width或reset scrollTop。Collapse完成后才移除hit/semantics。快速反向从live height/opacity继续，保留item identity、focus与scroll anchor。任何jitter、flicker、white frame或unexpected page jump均失败。

### 3.4 Half-field image-backed result

- Result card占满content column，min-height=`156rpx`，radius-panel，`1rpx border`，同组gap=`8rpx`。Whole card是唯一selection action；无trailing“选择”或第二control。
- Valid licensed media cover整卡。Leading readable text field固定`52%`，不因text或viewport改变；text container仍可在200%时转为full-width stacked overlay。Day readability overlay在leading edge=`rgba(255,255,255,.82)`，到52%=`rgba(255,255,255,.66)`，于66%连续淡至transparent。图片在左半区必须以低对比可见；不用opaque white slab、blur或glass。Night/Observation映射各自surface并保持同等信息对比。
- No-media card为normal solid surface，不渲染media node/placeholder/label/固定空档。Name body/500、最多两行；metadata在readable field内。
- Valid activation返回existing Map、保留camera/time/layer/filter、commit same formal spot并默认打开medium panel。Drag-away/scroll/cancel/invalid release不commit。

## 4. Image-backed Layer Selector

- `map-layer-selector`拥有Map-edge icon trigger和一个fixed-height bottom presentation；不再有独立 `map-analysis-time-bar` surface。Trigger default geometry不因open/close改变；active只用`active-soft` + inset boundary，icon/accessible selected state仍独立。
- Sheet与spot panel共用single bottom-presentation coordinator。Open时Map/camera/scroll坐标不变；panel暂时退出但selected spot/previous extent保留。Map tap、system Back或trigger toggle让sheet以`180ms exit`从live position收起，随后恢复previous panel extent；focus restoration使用prevent-scroll等价语义。不得发生trigger/sheet/Map jump。
- Sheet fixed height=`332rpx + safe-bottom`，top radius=`28rpx`，solid surface、`1rpx border`、elevation-2；无drag handle、multi-extent、`x`、Close row或“关闭图层”choice。Title `地图图层`可保留为sheet accessible heading，visual使用body/600。
- Choices恰好三个：`光污染 / 总云量 / 观测机会`。每项为矩形 image-backed card；390px下3-column，card min visible=`212×128rpx`，320px/200%时2-column或1-column reflow。Background使用local generated/self-owned abstract image：light pollution=warm city glow/contour；total cloud=soft cloud mass；opportunity=night horizon/trail。图像不得像真实provider layer或第三方map screenshot。
- 每卡有`rgba(mode-surface,.72→.46)`阅读gradient、prefix icon、compact label和checked indicator；selected active-soft inner border，不能用dark-blue fill/shadow。普通base map不是choice。
- Sheet内一条compact factual summary合并原“观测条件”职责，只陈述current local time、selected layer和objective value，例如`22:00 · 总云量 18%`；不是第二card或教程。Time activation复用`map-time-control`与shared ruler。Map关闭态不再显示独立左下 condition card。

## 5. Stargazing Spot Information Panel

### 5.1 Extents above persistent navigation

- One Map-parallel non-modal panel有`visibility=hidden|visible`与`extent=small|medium|large`。Small=`232rpx + bottom-safe`；Medium=`clamp(500rpx,52dvh,700rpx)`；Large填满`mini-primary-navigation`上方的primary content viewport：`top:0; left:0; right:0; bottom:nav-top`。它等价于一个page但不覆盖/替换persistent Map/My navigation。
- Small/Medium top radius=`32rpx`、solid surface、`1rpx border`、elevation-2。Large top radius=`0`、无outer shadow。所有extent铺满content width；section rail不参与width calculation。
- Marker或Search result首次选择默认medium。Small仍由handle drag可达。Non-marker map tap把panel从live translateY以`220ms exit`移到below viewport，结束才移除hit/semantics。
- Large left-edge=`32rpx` Back gesture和handle向下drag都执行large→medium并保留selection/section/meaningful scroll。普通Back次序为owned disclosure→large→medium→small→hidden→route。

### 5.2 Handle-only drag

- Whole panel body/content/top image都不发起extent drag。只有上沿中央 `map-spot-panel-handle` rectangular hit region拥有vertical direct manipulation。
- Visible dash=`56×6rpx`，radius-pill，quiet boundary `.48` alpha；hit region=`88×72rpx`并absolute overlay，不占document flow或创建blank header。Assistive semantics使用≥`88×88rpx` virtual/semantic target，不让物理hit areas与邻近actions重叠。
- Pointer down只改变opacity/tonal`80ms`，不改变extent/top/height/transform。Move越过`8px` vertical threshold且vertical intent胜出后才从live position preview；release按nearest snap+velocity在≤`280ms` settle；cancel回起始extent。Tap/release未越threshold为no-op，不循环尺寸。Keyboard/assistive increment/decrement提供非手势extent调整。
- Large content scrollTop>0时content优先；handle始终panel-owned；horizontal ruler wins后不转交。新gesture打断settle并从current presentation接管。

### 5.3 Presence-driven media and objective document

- Valid licensed media只在large document最上方存在，height=`clamp(300rpx,27dvh,420rpx)`、cover；handle overlay只保留`8–12rpx` optical top inset，不分配空白栏。无media不渲染node/placeholder/“暂无图片”/fixed height，identity从safe header后立即开始。
- Media/content block size每帧由live extent progress与actual presence计算；不能移动panel后延迟重算，不能在drag中暴露旧media空白。Media load→no-media时skeleton/container按live size连续收起。
- Large→smaller时media opacity=`clamp((p-.72)/.16,0,1)`；Map Search opacity=`clamp((.64-p)/.14,0,1)`。Search达到opacity1后才恢复hit/semantics。No-media没有media phase。
- Continuous document只展示客观信息，顺序为optional media→formal spot identity→route/access/facility/safety facts→guides/field/source→`天文信息`→sky geometry→borderless curved ruler→cloud/transparency/seeing/light-pollution/moon/targets/professional/source facts。
- 当前Mini Program不显示`spot-tonight-decision`、`谨慎出发`、推荐/建议结论、`推荐窗口`、最佳机会rail或UI推导的行程建议。真实官方alert、道路/开放/权限/数据不可用仍以factual status与影响呈现。Backend TripDecision/SkyOpportunity不由本文件删除，只是不成为当前panel display owner。
- Panel large只有一个vertical scroll owner，scrollbar chrome不可见。Content padding=`24rpx`且不为rail预留全局列；rows/dividers/shared axes优先，不恢复tabs/card wall。

### 5.4 Floating contiguous section rail

- `map-spot-panel-section-nav` absolute/fixed to panel visual viewport，`top:50% + translateY(-50%)`，right=`10rpx`，visible width=`64rpx`，single radius-pill outline，solid surface，`1rpx border`，无outer/drop/right-side dark-blue shadow。
- Two items `概览/天文`上下相接、gap=`0`、各visible=`60rpx`、semantic target≥`88rpx`，icon=`22rpx`、label=`19rpx/26rpx`。Selected只用active-soft fill + inner indicator，item不translate。
- Rail overlay不占content width。只有实际被rail覆盖且存在碰撞的局部short rows可加temporary/local trailing collision inset；整篇document、matrix和media保持full width。Rail避让keyboard、safe area和action rail而保持可见区域中点。
- Activation必要时先到large，再以`200ms standard`对齐document start/astronomy heading；rail/handle不动。Touch scroll更新selected state但不逐帧抢focus；assistive activation完成后focus heading。

### 5.5 Smaller action rail and one rounded star

- Bottom action rail left/right inset=`24rpx`，bottom=`safe-bottom + 8rpx`且始终位于panel内部、primary nav上方。Visible pill height=`60–64rpx`，outer interaction lane=`88rpx`，radius-pill，solid surface，`1rpx border`，elevation-1。
- Three equal items：`想去 / 分享 / 云观星`。Visible icon=`24rpx`、label=`19–20rpx/28rpx`、gap=`0–2rpx`；各semantic target≥`88rpx`。不增加第四项、不复制进document、不用large filled button。
- Favorite icon与Search selected ornament共用同一个rounded-star `SemanticIcon` source、corner/stroke grammar。保留current Favorite state/optimistic/error/reduced-motion semantics与bounded satellites，但rail variant按`24rpx`视觉尺寸呈现，不另画尖角或oversized star。

## 6. Borderless Curved Time Ruler

- One shared component family backs `map-time-control`、`sky-time-scrubber`与`sky-orientation-time-ruler`，并共享one committed local time store。WEAPP/Taro实现复用enhanced horizontal `ScrollView`的`scrollX`、`enhanced`、`showScrollbar={false}`、`fastDeceleration`、`onScroll/onScrollEnd`；project layer只拥有tick projection、label pruning、event/fact marks与valid-slice snap。
- Ruler没有outer border、card background、bounding rectangle、shadow或instruction caption。它直接在owner surface上以transparent edge mask承载ticks；需要对比时只允许一个无轮廓mode-correct tonal fade，不形成第二panel。
- Visible block=`100rpx`；direct manipulation lane=`88rpx`；fixed center axis=`2×38rpx`；current value在axis上方，使用final-commit/600 + tabular nums。左右optional decrement/increment glyph=`22rpx`、target=`88rpx`。
- Base tick step=`34rpx`；minor=`10rpx`、major=`22rpx`、selected center=`36rpx`。每个real slice一个tick，当前30min cadence每slice一tick、每2h一个major label；不插值事实。
- 对tick center的normalized distance `u=clamp(abs(x-center)/(viewportWidth/2),0,1)`：`scale=1-.56×u^1.2`，`opacity=1-.84×u^1.15`，`translateY=22rpx×u^1.55`。Center最大/最清晰/最高，两侧沿同一浅弧连续缩小、变淡、下沉；edge labels不承担唯一关键值。
- Drag每帧preview nearest real slice；scroll end/projected offset snap nearest valid slice，≤`120ms` settle后commit；cancel回committed offset。新drag从live offset接管。Reduced motion保留direct scroll并即时snap，不额外spring/inertia。Slider semantics暴露min/max/current/step；keyboard/assistive一次移动一个real slice。

## 7. Headerless Full-Sky Orientation

- `sky/detail` sky canvas填满top safe area到ruler/bottom safe area。顶部不显示boxed title/spot-time header、`方位天空`card、地点·时间card或右侧target/location action。
- 保留一个independent leading Back icon action：visible glyph=`24rpx`、transparent/quiet tonal plate、semantic target=`88rpx`，与system/微信Back同义。它不构成header bar，不携带title/subtitle。
- Real targets直接标在sky projection。Ordinary sensor-follow success没有“方向跟随中”或status row；permission/calibration/low-accuracy/stale/unavailable只有在改变use时显示一个compact recovery/status且停止伪称current pose。
- Screen-reader/degraded object list按需可达，不常驻。Ruler直接叠在lower sky，无outer frame；reduced transparency只让必要contrast mask变opaque，不创建card。

## 8. Causal motion and no-jitter contract

所有material route/surface/state change由明确操作或数据因果触发，可中断、可反向，从live presentation retarget。只有reduced-motion、critical immediate stop与Observation atomic token swap可直接替换。

| Recipe | Current → target | Timing | Failure prohibited |
|---|---|---|---|
| press | neutral→`.985` scale/tonal→neutral | `80/120ms` | geometry shift |
| Search child | stationary field + clipped content | enter`180ms`/exit`160ms` | field jump/remount/white flash |
| disclosure | measured live height/clip + inner opacity | `160ms` | display-toggle/jitter/scroll reset |
| filter/layer/rail selection | live fill/indicator/ornament | `140–180ms` | dark block or delayed queue |
| panel extent | live translate/height→valid snap | direct + settle≤`280ms` | pointer-down commit/whole-body drag |
| panel hide | live→below viewport then semantic removal | `220ms exit` | instant disappearance |
| layer sheet | below viewport↔fixed extent | `220/180ms` | Map/trigger jump/remount |
| section align | live internal scroll→heading | `200ms` | outer-page jump |
| result/group change | retained flow + measured insertion/removal | `160ms` | flicker/card width shift |

- New input cancels prior animation and starts fromcomputed current transform/height/opacity; no queued timeout or target-origin restart.
- Scroll/focus restoration uses prevent-scroll semantics. Focus change never moves Map, panel, layer trigger or Search field. Motion does not add tutorial copy or toast.
- Reduced motion removes nonessential spatial travel/rotation and retains direct state/opacity/position clarity. Functional sky pose and pointer-follow are not decorative animation.

## 9. Responsive, modes, accessibility and review boundary

- Day usespure-white foundation；Night low-chroma near-black；Observation closed black/warm-red。Mode switch先绑定target tokens，不经过white/blue/old-token flash。
- Every mobile vertical/horizontal scroll owner hides scrollbar chrome without disabling touch, wheel, keyboard, programmatic or screen-reader reachability。H5/prototype同时使用`scrollbar-width:none`、`-ms-overflow-style:none`和`::-webkit-scrollbar{display:none;width:0;height:0}`。不得用body/page `overflow:hidden`裁切内容。
- Review matrix：day/night/observation × 320/375/390/430px × 100%/200% text；normal/reduced motion；normal/reduced transparency；touch/keyboard/screen-reader。
- Required journeys：cold Map→marker opens medium；handle press no extent change；handle drag medium→small/large；large edge-back→medium；non-marker animated hide；Map Search→stationary Search→system/visible Back；outside blur/refocus；partition rapid reverse no jitter；image/no-image result；layer active/open/map-tap close/no jump/previous panel restore；ruler drag/snap/cancel/no frame；Cloud→headerless Full-Sky→Back。
- Every action has programmatic name/role/state/value/focus order。Back、panel extent increment/decrement、ruler step和map semantic list提供non-gesture alternatives。Active/selected state不只靠颜色。
- Candidate只证明design reviewability。Native map、WEAPP routing、safe-area、IME/system Back、gesture arbitration、sensor、share、performance、data truth与production fidelity必须在后续真实实现中独立验证。
