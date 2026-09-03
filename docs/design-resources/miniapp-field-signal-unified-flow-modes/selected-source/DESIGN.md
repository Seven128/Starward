# Starward 微信小程序设计系统 — 连续文档与模式滑轨

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 当前组件、布局、密度、运动与状态协调来源。根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 是唯一 canonical adoption record；本文件是新的不可变设计来源，不建立第二套系统，也不进入产品可见文案。

## 选择、依赖与替代边界

- Owner direction：先修订当前唯一设计系统，再重新生成全部设计资源。本轮收敛同文档三档 spot panel、presence-driven media、短 action rail、贴边 section rail、可拖动无箭头时间尺、紧凑 Search、分阶段 medium→large chrome、互斥 bottom presentation、浅 active、三态显示模式滑轨与带克制彩色图标的 My account hub。
- Exact-value foundation：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。未被本文件明确替代的 night/observation palette、语义色、基础圆角、risk、Favorite ritual、基础 component semantics 与 accessibility 继续适用。
- Product/Screen dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 children。它们拥有 Surface、route、Control、数据、状态、commit/cancel/recovery、安全和 accessibility 语义。
- 本文件完整替代此前 component/layout sources 中冲突的 per-extent conditional content、large-only media timing、无结构 handle band、较宽 action rail、rail 内上下 padding、时间尺 arrows/低位轨道、宽 Search suggestions/gaps、单阶段 chrome crossfade、独立 panel/layer flags、较深 active、分离 day/night 与 observation controls、无色 My rows。先前不可变文件只保留 audit provenance，不能成为 current generation dependency、fallback 或 compatibility path。
- 地图 provider/basemap/tile/native-map/legal chrome、天气/天文/路线算法、数据字段、权限策略、后台能力、native App 与 owner operations 不属于本文件。附件只作为 defect evidence 或 interaction/density inspiration，不是 exact target；不得复制第三方品牌、专有地图、图片、icon、token、文案或业务职责。
- Product UI、handbook navigation、component specimens 与普通候选标题不显示日期、revision、`version`、`vN`、old/new/legacy、`旧版`、`新版`、demo/fixture/reviewer/debug 或生成说明。内部 target key、路径、协议和 digest 只作治理元数据。

## 1. Research synthesis 与 Build / Reuse / Buy

- Apple Search guidance支持 focused transient Search；标准 Back回溯层级，Close关闭 modal。Apple list/table guidance强调短文案、可扫描行和按层级选择 disclosure；icons guidance允许克制的语义色，但要求统一尺寸、stroke和视觉重量。Apple segmented control与 Android single-choice segmented button都把少量紧密相关状态建模为一个单选 owner，而非多个 switch。
- Current repo只安装 Taro component primitives，没有 TDesign、NutUI、Taro UI 或第三方 ruler。TDesign Mini Program提供通用 Slider/Tabs，但没有同时满足 WEAPP-compatible horizontal scrub、fixed-center discrete snap、arc projection、edge scale/opacity taper和real-slice semantics的组件；引入整套库会制造第二套token/component surface。
- Time ruler allowed set：现有 Taro/WEAPP `ScrollView`、兼容且已验证的 isolated ruler、bounded local projection或 intentional non-abstraction。Selected：Taro enhanced horizontal `ScrollView`拥有scroll physics/events/hidden scrollbar；project-local Curved Time Ruler只拥有tick projection、center preview和valid-slice snap。禁止自造滚动物理、RN-only package、generic Slider伪装时间尺或引入重型第二UI系统。
- Three-state mode allowed set：现有 choice/radio primitive、兼容 isolated segmented control、bounded local track/thumb projection。Selected：沿用当前 Choice Bar状态/键盘/焦点基础与`SemanticIcon`，增加一个三站可拖动thumb及Sun/Moon/Star微动效；语义为single-choice radiogroup/slider，不使用二值原生Switch，也不建立第二模式store。
- My icon allowed set：existing `SemanticIcon`、current semantic colors及其soft surfaces；不新增远程图标、另一套stroke family、商业banner或假统计。

Research references：

- `https://developer.apple.com/design/human-interface-guidelines/search-fields`
- `https://developer.apple.com/design/human-interface-guidelines/toolbars`
- `https://developer.apple.com/design/human-interface-guidelines/segmented-controls`
- `https://developer.apple.com/design/human-interface-guidelines/lists-and-tables`
- `https://developer.apple.com/design/human-interface-guidelines/icons`
- `https://developer.apple.com/design/human-interface-guidelines/accessibility`
- `https://developer.android.com/develop/ui/compose/components/segmented-button`
- `https://github.com/Tencent/tdesign-miniprogram`
- `https://docs.taro.zone/docs/components/viewContainer/scroll-view/`

## 2. Compact-but-clear density system

### 2.1 Day roles

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#FFFFFF` | Day page、Search、My、form与page-like panel foundation |
| surface | `#FFFFFF` | field、sheet、floating control与independent object |
| surface-subtle | `#F7F8F6` | 局部group、track、skeleton；不铺满页面 |
| text-primary | `#282B29` | 主要文本 |
| text-secondary | `#5E655F` | 次级事实 |
| text-tertiary | `#6D746D` | 必要metadata |
| border | `#E4E7E1` | 安静divider/boundary |
| border-strong | `#8A9088` | handle/关键graphic，按组件降低alpha |
| active-soft | `#F5F6FF` | active layer/section/filter/mode的极浅蓝反馈 |

Sky/meteor/trail/risk 与 Night/Observation 的 exact roles继承base。Active必须同时有indicator、boundary、icon/label或checked state，不以深色fill独自表达。

### 2.2 Mobile visual roles

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
- Generic line icons只用`22/24/28rpx`三档、圆端点/圆连接、`3rpx` stroke。Rounded star、Sun、Moon、Star、horizon等经同一个 `SemanticIcon` adapter输出。
- 可见surface/icon可以紧凑，action semantic target仍至少`88rpx`/44px且互不重叠。200% text按role优先级reflow/stack；不裁切关键值、不降对比、不隐藏action、不产生page horizontal scroll。

### 2.3 Spacing and containment

- 使用`8rpx`主节奏和`4rpx`微调。320/375/390px content inset=`24rpx`，430px=`32rpx`；Map/Sky overlay=`16–24rpx` safe inset。
- inline gap=`6–8rpx`；strong-related=`4–8rpx`；ordinary group=`10–14rpx`；major section=`18–24rpx`；compact object padding=`10–14rpx`。
- 删除无效title、divider、explanation和surface后再排版。Repeated facts优先aligned rows/shared axes；卡片只包一个可独立识别对象。

## 3. Search continuity and high-density results

- `map-search-entry`与`spot-search-field`继续共用同一outer rect、fill、border、radius、shadow、type baseline、input origin和query/placeholder text。进入Search不改写`搜索观星点`、已有query或任何可见字符串；只有leading Search glyph在同一slot交叉替换成Back。
- Search field visible=`80rpx`、target=`88rpx`。进入时field不动；field以下content以clip/reveal + `translateY(-12px→0)` + opacity进入。Outside tap blur/close suggestion但不离开route；Back/system/edge反向返回Map。
- Suggestion overlay紧贴field下沿`4rpx`，单项visible=`72rpx`、完整target=`88rpx`，leading icon=`22rpx`，horizontal padding=`16rpx`，title body、可选metadata使用metadata role。行间只用`1rpx` divider；不得使用大卡、双层padding或大号搜索icon。
- Titleless filter group从field或关闭后的suggestion overlay下沿`4–6rpx`开始。Choice visible=`44rpx`、target=`88rpx`、horizontal padding=`10rpx`、icon=`20rpx`、label compact-choice；wrap gap=`4rpx`。Filter group到首个partition row的视觉距离=`12–16rpx`，不放空标题或分隔线，也不制造大段空白。
- `想去`/`其他观星点`使用body/600、44px target和stable count/chevron。Expand/collapse保留同一tree、current measured height/opacity与scroll anchor，`160ms`可反向，无jitter/flicker/white frame。
- Image result仍以`52%` leading translucent field和66% gradient终点保留淡图；无图不渲染media node。选择整卡返回Map并打开medium panel。

## 4. One mutually-exclusive Map bottom presentation

- Map presentation state只有一个枚举：`bottomPresentation = none | spot-panel | layer-sheet`。`spotPanelExtent`与selected spot可在model中保留，但它们不是第二个visible/active flag。任一帧只能有一个bottom surface拥有hit、semantics、selected trigger和entrance/exit motion。
- Layer trigger从spot panel状态打开时，先把`bottomPresentation`直接retarget为`layer-sheet`：panel从live position退出，结束后hidden/inert；selected spot与previous extent留在Map model。Layer trigger才拥有pale active；spot marker/spot panel trigger不再暴露visible/active state。
- Layer open期间选择正式marker或Search result时，当前layer sheet从live位置退出并把同一coordinator目标改为`spot-panel`; selected marker以medium打开。不得先恢复旧panel再切新marker，不得同时切两个boolean，因而不会出现layer跳动或双active。
- Map tap/system Back/active layer trigger关闭layer后，仅当没有更新的marker/search intent时恢复prior panel extent；否则执行最新intent。Animation cancellation从computed live transform/opacity retarget，Map/camera/trigger geometry不动。
- `map-layer-selector`仍为固定高度、三个image-backed choices、无`x`/off/独立观测条件卡。Active surface改用`#F5F6FF` + `2rpx` inset sky boundary + checked icon，不能用深蓝fill或shadow。

## 5. One-document Stargazing Spot Information Panel

### 5.1 Extent is clipping, not content selection

- Panel有`hidden`与`small|medium|large`三个visible extents；marker/result默认medium。Small=`232rpx + bottom-safe`；Medium=`clamp(500rpx,52dvh,700rpx)`；Large填满primary navigation上方的content viewport。
- 三档始终挂载同一份、同序、同identity的连续document：formal spot identity→route/access/facility/safety facts→guides/field/source→天文信息→sky geometry→curved ruler→objective matrices/targets/source。Small和Medium只是较短viewport裁剪同一document；Large开启唯一内部vertical scroll。禁止per-extent JSX/DOM分支、重复数据mapping、重新排序、remount或切换另一棵树。
- 唯一presentation例外是合法media：Small/Medium不占media region；从Medium向Large的live progress才在document顶部拉出media。无media永远不渲染node、placeholder、label或固定空档。
- 所有缺失/未提供/未知/尚未核验的可见值统一显示`暂无数据`。内部仍保留loading/permission/stale/error/not-applicable等不同状态与恢复逻辑；不得把它们在domain/store中折叠成一个状态，也不得用`暂无数据`遮蔽真实风险或失败影响。

### 5.2 Handle band and drag ownership

- 只有`map-spot-panel-handle`的小长矩形热区可发起vertical extent gesture：physical hit region=`104×40rpx`，visible dash=`52×5rpx`，居中；辅助技术另有≥`88×88rpx` semantic target且不覆盖邻近action。Whole panel body/content/media/top chrome均不启动extent drag。
- 无media时，document最上方保留一个紧凑结构handle band=`40rpx`，在drag所有中间帧持续存在，identity从band下沿开始；它不是大片空白。合法media开始拉出后，handle overlay到media上，独立band连续收为0，因此有图large没有额外handle空白。
- Pointer down只显示`80ms` tonal/opacity反馈，不移动或切档。越过`8px`且vertical intent胜出才从live位置preview；release按nearest snap+velocity在≤`280ms` settle；cancel回live origin。Tap/release no-op；键盘/辅助技术increment/decrement提供替代。

### 5.3 Staged medium-to-large motion

- Normalized extent progress `p`: medium=`0.50`，large=`1.00`。有合法media时，`mediaReveal=clamp((p-.50)/.28,0,1)`；media clip-height从0到`clamp(300rpx,27dvh,420rpx)`，内部image从`translateY(-18rpx) scale(1.02)`到0/1，opacity从0到1。Document identity随media height连续向下，不remount。
- 只有panel top接近screen top后才淡出Map chrome：`chromeFade=1-clamp((p-.82)/.12,0,1)`。`map-search-entry`、`map-location-control`和`map-layer-selector` edge trigger共享该opacity/translate phase；opacity≤.08时才移除hit/semantics。三者不得在media开始拉出时提前消失。
- Reverse顺序严格反向：Map chrome先恢复到可见/可操作，再收media。No-media没有media phase，但chrome仍只在`.82→.94`区间淡出。所有值从当前presentation retarget，无跳帧、大片空白或两套重叠chrome。

### 5.4 Flush section rail and shorter action rail

- `map-spot-panel-section-nav`悬浮在panel visible viewport中点，right=`10rpx`，visible width=`60rpx`。Outer pill总高=`104rpx`、padding=`0`、overflow clip、`1rpx border`；两item各`52rpx`、gap=`0`，首项贴上边、末项贴下边，中间只有共享divider。无outer/drop/right shadow，无item translate。
- Rail selected使用`#F5F6FF`、inner indicator、icon/label与programmatic state；inactive透明。Rail不占document width，只允许实际碰撞的局部row短暂避让。
- Bottom action rail left/right inset=`40rpx`，visible pill height=`52–56rpx`，outer interaction lane=`88rpx`，bottom=`safe-bottom + 8rpx`。三项等宽：`想去/分享/云观星`；icon=`22rpx`、label=`18–19rpx/26rpx`。Rounded-star复用同一`SemanticIcon`。不得加第四项或放大背景/图形来填满target。

## 6. Raised, draggable, arrowless Curved Time Ruler

- One shared family backs `map-time-control`、`sky-time-scrubber`和`sky-orientation-time-ruler`并共享one committed time store。实现复用Taro enhanced horizontal `ScrollView`的`scrollX`、`enhanced`、`showScrollbar={false}`、`fastDeceleration`与`onScroll/onScrollEnd`；project layer只做projection/snap。
- Ruler无outer border/card/background/shadow/instruction，也没有visible left/right arrows。Programmatic step通过slider/radiogroup semantics、键盘方向键和辅助技术increment/decrement提供，不新增箭头chrome。
- Visible block=`84rpx`，比此前上移`16rpx`并贴近它解释的数据/sky projection；direct lane=`88rpx`，center axis=`2×34rpx`，current value位于axis上方。Base tick step=`34rpx`；minor=`9rpx`、major=`20rpx`、selected=`32rpx`。
- Pointer/touch horizontal drag必须实际移动track并每帧preview nearest real slice；scroll-end/projected offset snap到nearest valid slice，≤`120ms`后commit。Cancel回committed offset；新drag接管live offset。不得只监听click、阻断touchmove或以静态tick伪装组件。
- Arc projection继续按distance scale/opacity/translateY；edge labels可减少但center/current value完整。每tick对应真实slice，不插值天气/机会事实。

## 7. Unified three-state display mode track

- Settings只保留一个`display-mode-switcher`，值域=`day | night | observation`，默认`day`。现有`observation-mode-control`不再是独立Control、section或底部CTA；其进入/退出职责并入这一owner。普通二元权限/提醒继续使用标准Switch。
- Component是一个特殊single-choice segmented slider：track width=`100%`、max=`560rpx`、visible height=`72rpx`、radius-pill，三站等宽；每站完整target≥`88rpx`。Thumb等于一站宽，包含mode icon与short label；Sun/Moon/Star均由`SemanticIcon`输出，状态另以thumb位置、label、checked value和track treatment表达，不只靠颜色。
- Tap任意站直接选择；tap当前thumb在存在next state时前进一步，observation末端tap保持。Horizontal drag越过`8px`后直接跟随，release按position+velocity snap：向右`day→night→observation`，向左`observation→night→day`，不wrap、不跳过中间站。方向键/Home/End和screen-reader direct choice等价。
- Day→Night：track从white/subtle到near-black，Sun以`scale(1→.72) rotate(0→18deg) opacity(1→0)`退场，Moon从`.72/-16deg/0`到1/0/1；thumb transform `180ms standard`，可反向。Night→Observation先在同一帧绑定closed black/warm-red target tokens，再以Moon淡出/Star微旋入场；过程中不得出现white/blue/yellow/green/neutral-gray flash。反向严格镜像。
- Animation只由tap/drag/keyboard触发，不循环、不发光、不漂浮。Reduced motion取消rotation/scale和跨色travel，只即时snap thumb并以≤80ms icon opacity/state swap确认。

## 8. Richer but restrained My account hub

- `pages/my/index`沿用现有职责，结构为compact account header→two-column profile status strip→Plan/Contribution compact utility row→grouped routine entries；不新增会员、订单、钱包、借钱、促销banner、假数字或Favorite副本。
- Header min-height=`120rpx`：avatar=`72rpx`，name body/600，account state metadata，settings gear visible=`48rpx`/target=`88rpx`。Page content inset=`24rpx`，header到status gap=`12rpx`。
- Status strip和utility group使用一次共享surface/quiet divider，不为每项造大卡。Routine navigation rows target=`88rpx`、title ordinary-action、meta metadata、divider对齐title，不重复section说明。
- 使用4个role-colored icon tile丰富扫描：Plan=`sky-soft/sky-strong`、Contribution=`trail-soft/trail-strong`、Profile link=`meteor-soft/meteor-strong`、Import/Settings=`risk-soft/risk-strong`或neutral depending meaning。Tile=`48rpx`、glyph=`24rpx`、radius=`12rpx`；同一屏最多三种非risk accent且不把整行染色。颜色只辅助分组，label/shape/chevron仍表达用途。
- Group title只在多个rows确需共同名称时使用section-title；删除“资料与设置”等可由相邻row自解释的冗余标题。内容变化用`160ms` retained-flow transition，无layout flash；200% text转单列但保持44px targets。

## 9. Causal motion, copy, accessibility and review boundary

| Recipe | Current → target | Timing | Failure prohibited |
|---|---|---|---|
| Search child | stationary field + clipped content | enter`180ms`/exit`160ms` | text/field jump/remount |
| disclosure | retained measured height/opacity | `160ms` | jitter/flicker/scroll reset |
| panel extent | one document viewport + live media/chrome phases | direct + settle≤`280ms` | per-extent tree/pointer-down commit |
| panel/layer | one bottomPresentation enum retarget | `220/180ms` | double-active/intermediate restore/jump |
| ruler | native direct scroll + project snap | settle≤`120ms` | arrows/static/non-draggable track |
| display mode | one 3-stop thumb + causal celestial swap | `180ms` / observation token atomic | split controls/wrap/color flash |
| My/list | retained flow + semantic icon accents | `160ms` | card wall/stagger flash |

- Every mobile scroll owner hides scrollbar chrome without disabling touch/wheel/keyboard/programmatic/screen-reader reachability。H5/prototype使用`scrollbar-width:none`、`-ms-overflow-style:none`和`::-webkit-scrollbar{display:none;width:0;height:0}`。
- 普通缺失值可见文案统一`暂无数据`；真实风险/失败/权限/陈旧影响仍用具体文案并贴近受影响事实。禁止显示`尚未核实`、泛化“部分数据”、操作说明、实现说明或推荐窗口。
- Review matrix：day/night/observation × 320/375/390/430px × 100%/200% text；normal/reduced motion；normal/reduced transparency；touch/keyboard/screen-reader。
- Required journeys：cold Map→marker opens medium same document；small/medium/large crop identity parity；media/no-media medium→large phase；handle band/only-hit-region drag/tap no-op；panel→layer→marker mutual exclusion；Search unchanged text/compact suggestions/filter gaps；ruler direct drag/snap/cancel/no arrows；Settings day↔night↔observation tap/drag/keyboard；My compact colored-icon hierarchy。
- Candidate只证明design reviewability。Native map、WEAPP routing、safe-area、IME/system Back、gesture arbitration、share、performance、data truth与production fidelity必须在后续真实实现中独立验证。
