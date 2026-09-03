# Starward 微信小程序设计系统 — 连续信息流与紧凑表单

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 当前组件、布局、密度、运动与表单组合来源。根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 是唯一 canonical adoption record；本文件为新的不可变设计来源，不建立第二套 token、组件或产品权威，也不进入产品可见文案。

## 选择、依赖与替代边界

- Owner direction：先修订当前唯一设计系统，再重新生成全部设计资源。本轮完整收敛同文档三档 spot panel、presence-driven media、短 action rail、贴边 section rail、可拖动无箭头时间尺、紧凑且连续的 Search、分阶段 medium→large chrome、互斥 bottom presentation、极浅 active、三态显示模式滑轨、带克制彩色图标的 My account hub，以及紧凑、精致、密而不挤的 `miniapp-contribution-intake`；通用控件遵循成熟开源组件 reuse-first，并在设计资源外层明确标注“library / component / Starward adaptation”，不重复造轮子。
- Exact-value foundation：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。未被本文件明确替代的 night/observation palette、语义色、基础圆角、risk、Favorite ritual、基础 component semantics 与 accessibility 继续适用。
- Product/Screen dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 children。它们拥有 Surface、route、Control、字段、数据、草稿、上传、提交、审核、commit/cancel/recovery、安全、隐私与 accessibility 语义。
- 本文件是完整 current component/layout source；此前 `miniapp-field-signal-unified-flow-modes` 及更早 component sources 只保留 immutable audit provenance，不是 current generation dependency、fallback 或 compatibility path。任何冲突均以本文件与根 canonical section 为准。
- 地图 provider/basemap/tile/native-map/legal chrome、天气/天文/路线算法、表单字段业务含义、权限策略、后台能力、native App 与 owner operations 不属于本文件。附件只作 defect evidence 或 interaction/density inspiration，不是 exact target；不得复制第三方品牌、专有地图、图片、icon、token、文案或业务职责。
- Product UI、handbook navigation、component specimens 与普通候选标题不显示日期、revision、`version`、`vN`、old/new/legacy、`旧版`、`新版`、demo/fixture/reviewer/debug 或生成说明。内部 target key、路径、协议和 digest 只作治理元数据。

## 1. Research synthesis 与 Build / Reuse / Buy

- Apple Search/list/segmented-control guidance 与 Android single-choice segmented button共同支持：层级回退由 Back/edge-back承担；少量互斥状态由一个 single-choice owner承担；列表通过短文案、统一轴线、divider和稳定行高提高扫描效率，而不是给每一项套卡。
- Ant Design Mobile 的 Form/List/Selector/ImageUploader展示了移动端原子组件的组合逻辑：字段反馈贴近字段、重复项共享行节奏、选择与上传状态自解释、一个区域只保留一个主动作。Ant Design proximity 使用一致的近邻节奏表达归属，避免标题、说明、容器和留白重复表达同一层级。
- TDesign Mini Program 的 Cell/Input 与 CSS variables、Vant Weapp、Taroify 和 NutUI Taro 的 field/cell/form 组合表明，紧凑感来自 token 化的 label/value 轴、稳定行高、少量 section gap、局部反馈和主题变量；不等于缩小文字、触控区或直接套用现成品牌视觉。
- Repository fit：当前 Mini Program 是 Taro `4.2.1` + React `18.3.1`，尚未安装通用 UI suite。Ant Design Mobile 明确不是微信小程序运行时组件库；TDesign Mini Program 可通过 Taro hybrid `usingComponents` 接入，但会增加 native-component 集成与多端转换边界；NutUI Taro 当前最新 `4.0.0-beta.7` 仍是 beta 且包面较大。`@taroify/core@1.0.6` 为 MIT、peer range `@tarojs/components >=3` / `@tarojs/taro >=3` / React `^18.2.0`，提供按需 style、Tree Shaking、主题变量与当前所需的 Taro React controls，因此是后续生产实现的 preferred generic component substrate。
- Build / Reuse / Buy allowed set：`@taroify/core` 的语义匹配组件、Taro/WEAPP 平台原语、既有 Starward owner/adapter、隔离且经证据证明兼容的 TDesign native component、以及没有等价成熟 owner 时的 bounded thin composition。Selected：以 `@taroify/core` 的按需组件为通用交互底座，通过一个 Starward adapter/theme projection 映射 Field Signal tokens、密度、motion 与 accessibility；`SemanticIcon` 仍是唯一图标入口，不引入 `@taroify/icons`。时间尺继续由 Taro enhanced horizontal `ScrollView`拥有滚动物理，三态模式由 Taroify `Radio.Group`语义 + Starward 三站视觉/手势层组成；组件库不拥有 Product Surface、route、form draft、upload transport、panel/layer coordinator 或业务验证真相。
- Prohibited：复制任何第三方品牌视觉；并行引入两套通用 UI suite；让 library default tokens/icon/form store成为第二权威；为追求复用而把 binary Switch/Slider/Popup 强行冒充三态模式、时间尺或 one-document panel；fork/vendor 未记录来源的 library 代码；在未完成真实 WEAPP build、bundle、IME、safe-area、accessibility 与手势验证前宣称兼容。若 preferred component 无法满足精确语义，先使用同一 adapter 下的 Taro primitive / bounded composition，而不是扭曲产品交互。

### 1.1 Production component reuse map

以下映射是下一步产品技术实现的默认选择；设计资源仍只展示 Starward UI/UX、状态和动效，不渲染组件库品牌、代码面板或实现说明。每项都必须由现有 Control owner 包裹，且可在真实实现阶段基于兼容性证据更换底层而不改变 Surface/Control keys。

| Starward surface / family | Preferred library component | Starward-owned adaptation / boundary |
|---|---|---|
| Primary Map/My navigation | Taroify `Tabbar` | 只复用 safe-area、selection 与 item mechanics；两 route、Field Signal tokens、`SemanticIcon`、nav/panel avoidance 仍由 Starward 拥有。 |
| Map/Search stationary field、suggestions、filters | Taroify `Search`, `Cell.Group`/`Cell`, `Checkbox.Group` | 固定同框转场、Back/edge-back、query overlay、titleless spacing、rounded-star ornament、result card 与 Map return 仍由 `spot-search-shell` 协调；当前 Search 禁用 trailing clear。 |
| Spot information panel | Taroify `FloatingPanel` with three `anchors` and `contentDraggable={false}` | 复用 anchor/snap/scroll substrate；Starward 保留同一 document、media phase、nav-safe max height、bottom-presentation enum，并把可启动 drag 的 header 精确限制为居中 `104×40rpx`。必须先在 WEAPP 证明 header child hit/event target 与可中断 retarget；若失败，adapter 回退 Taro `ScrollView` + 当前 coordinator，而不 fork library 或扩大热区。 |
| Panel section/action rails | Taroify `Sidebar`, `Button.Group`/`Button` | 用 CSS variables/adapter 投射 `60×104rpx` flush rail、短 action pill、极浅 active；icon 仍来自 `SemanticIcon`，section scroll target与Favorite/share/cloud语义不交给 library。 |
| Layer selector | Taroify `Popup` (`placement="bottom"`, non-closeable chrome) | 复用 bottom transition/backdrop/scroll locking；固定尺寸、三张 image-backed choices、无 `x`、与 spot panel 的互斥 coordinator 仍由 Starward 拥有。 |
| Curved time ruler | Taro enhanced horizontal `ScrollView` | 没有语义等价 library component；复用平台滚动物理，Starward 仅拥有曲线投影、real-slice preview/snap/commit 与事件带。不得换成 generic Slider/Picker。 |
| Three-state display mode | Taroify `Radio.Group` as accessible selection substrate | Starward 绘制单一 day/night/observation track、相邻 drag、Sun/Moon/Star motion与 observation closed-palette transaction；普通 binary rows才使用 Taroify `Switch`。 |
| My compact groups | Taroify `Cell.Group`/`Cell`, `Switch` | 复用行、divider、状态与命中 mechanics；内容职责、紧凑比例、克制彩色 tile、route恢复和图标仍由 Starward 拥有。 |
| Contribution form | Taroify `Form`, `Form.Item`, `Form.Feedback`, `Field`, `Input`, `Textarea`, `Radio.Group`, `Checkbox.Group`, `DatetimePicker` + `Popup`, `Uploader`, `Progress`, `Button` | 复用字段注册/validation wiring、cell/field mechanics、picker、upload presentation与提交状态；draft、context condition、location consent、rights/privacy、media identity、transport/retry/idempotency、pending receipt和唯一 submit owner仍由 Product Surface/Starward state拥有。 |
| Short asynchronous feedback | Taroify `Toast` only when `notification-feedback` calls for transient feedback | 字段错误留在 `Form.Feedback`，持久风险/恢复留在 owning surface；不为普通点击重复 toast。 |

Implementation admission：先固定并记录 package/license/version与按需 imports，仅通过 `@taroify/core/<component>/style` 或等价受支持 tree-shaking 配置引入所用样式；由 `ConfigProvider`/CSS variables建立一次 Field Signal theme projection；不得安装 `@taroify/icons`。后续实现必须量化 WEAPP bundle delta，并在 day/night/observation、320–430px、200% text、IME/safe-area、screen reader、reduced motion 与真机 drag/scroll conflict 上验证。Taroify升级或替换只发生在 adapter 下方，不能改写本文件的精确 token、组件语义或 product state。

Research references：

- `https://developer.apple.com/design/human-interface-guidelines/search-fields`
- `https://developer.apple.com/design/human-interface-guidelines/lists-and-tables`
- `https://developer.apple.com/design/human-interface-guidelines/segmented-controls`
- `https://developer.android.com/develop/ui/compose/components/segmented-button`
- `https://mobile.ant.design/`
- `https://mobile.ant.design/zh/components/form/`
- `https://mobile.ant.design/zh/components/list/`
- `https://mobile.ant.design/zh/components/selector/`
- `https://mobile.ant.design/zh/components/image-uploader/`
- `https://ant.design/docs/spec/proximity/`
- `https://github.com/Tencent/tdesign-miniprogram`
- `https://tdesign.tencent.com/miniprogram/components/input`
- `https://youzan.github.io/vant-weapp/`
- `https://nutui.jd.com/taro/react/2x/`
- `https://github.com/taroify/taroify`
- `https://taroify.com/components/form/`
- `https://taroify.com/components/config-provider/`
- `https://taroify.com/components/picker/`
- `https://mobile.ant.design/zh/guide/faq/`
- `https://docs.taro.zone/en/docs/hybrid`
- `https://docs.taro.zone/docs/components/viewContainer/scroll-view/`

## 2. Compact-but-clear density system

- Day canvas=`#FFFFFF`；surface=`#FFFFFF`；surface-subtle=`#F6F7F5`；text-primary=`#282B29`；text-secondary=`#5E655F`；text-tertiary=`#6D746D`；border=`#E4E7E1`；active-soft=`#F5F6FF`。Sky/meteor/trail/risk 与 Night/Observation exact roles继承base。Active必须同时有indicator、boundary、icon/label或checked state，不能只靠深色fill。
- Type roles：page-title `17/23px 600`；section-title `13.5/19px 550–600`；body `12/17px 400`；ordinary-action `11.5/16px 500`；compact-choice `10.5/14.5px 500`；metadata `10/14px 400`；status-tag `9.5/13.5px 500`；final-commit `12.5/17px 550`。中文字距为0，普通UI禁止700；小字用Regular/Medium而非Light。
- 使用`8rpx`主节奏和`4rpx`微调。320/375/390px content inset=`24rpx`，430px=`32rpx`；strong-related gap=`4–8rpx`，ordinary group=`10–14rpx`，major section=`18–24rpx`，compact object padding=`10–14rpx`。先删除无效标题、说明、divider和surface，再用label/value轴、字级与必要divider建立层级。
- Generic line icon只有`22/24/28rpx`，统一圆端点、圆连接和`3rpx` stroke；可见surface可小，action semantic target始终≥`88rpx`/44px且互不重叠。200% text按role reflow/stack，不裁关键值、不隐藏动作、不制造page horizontal scroll。

## 3. Search、Map 与 Panel 当前合同

- `map-search-entry`与`spot-search-field`保持同一outer rect、fill、border、radius、shadow、type baseline、input origin和当前query/placeholder；进入时仅leading glyph在同一slot交叉为Back。Field visible=`80rpx`、target=`88rpx`；下方内容clip/reveal + `translateY(-12px→0)` + opacity。Outside tap只blur/收IME/关suggestions；Back/system/edge回Map。
- Suggestion overlay距field `4rpx`；row visible=`72rpx`、target=`88rpx`、icon=`22rpx`、padding=`16rpx`、单divider。Titleless filters距field/overlay `4–6rpx`，choice visible=`44rpx`、target=`88rpx`、padding=`10rpx`、gap=`4rpx`；距首partition `12–16rpx`。Disclosure保留同一tree/scroll/focus，以`160ms` measured clip+opacity retarget，不闪烁抖动。
- Result有图时整卡cover，leading readable field固定`52%`，至`66%`连续淡出且左半仍见淡图；无图不渲染media node、placeholder或空档。Whole card是唯一selection action，返回同一Map并默认medium panel。
- Map只有`bottomPresentation = none | spot-panel | layer-sheet`。Panel/layer不能同时active/hit/semantic；layer→marker直接retarget为新medium panel，不恢复旧panel中间态。Layer sheet固定高度、三个image-backed choices，无`x`/off/独立观测条件卡；active=`#F5F6FF` + `2rpx` inset sky boundary + checked icon。
- Spot panel三档挂载同一份、同序、同identity连续document；small=`232rpx + bottom-safe`，medium=`clamp(500rpx,52dvh,700rpx)`，large填满primary navigation上方，large才拥有唯一vertical scroll。Extent只裁剪；合法media是唯一presentation exception，medium→large先拉出media，再于`p=.82→.94`淡出Search/Location/Layer。Reverse镜像，所有 motion从live state retarget。
- 无media保留`40rpx`handle band；有media时handle overlay图片且band连续为0。只有`104×40rpx`矩形可启动extent drag，dash=`52×5rpx`；pointer down/tap不切档，越过8px且vertical intent胜出才preview，settle≤280ms。
- Section rail=`60×104rpx`、padding/gap/shadow=`0`，两项各`52rpx`贴紧上下边并共享divider，悬浮于visible viewport中点。Action rail inset=`40rpx`、visible=`52–56rpx`、interaction lane=`88rpx`，三项等宽、icon=`22rpx`，rounded star复用`SemanticIcon`。普通缺失值显示`暂无数据`，但不可折叠真实loading/permission/stale/error/risk语义。

## 4. Curved Time Ruler、显示模式、My 与 Full-Sky

- `map-time-control`、`sky-time-scrubber`、`sky-orientation-time-ruler`复用Taro enhanced horizontal `ScrollView`的`scrollX`、`enhanced`、`showScrollbar={false}`、`fastDeceleration`、`onScroll/onScrollEnd`。Visible block=`84rpx`，较旧位置上移`16rpx`，direct lane=`88rpx`，无outer border/card/instruction和可见箭头。Drag每帧preview nearest real slice，scroll end/snap≤120ms后commit；程序化/键盘/读屏仍可increment/decrement。
- Settings只有一个`display-mode-switcher`，值域`day|night|observation`、默认day。Track visible=`72rpx`、max-width=`560rpx`、三站等宽，thumb含`SemanticIcon` Sun/Moon/Star；tap direct、当前站tap前进、8px后水平drag跟手、release按position+velocity相邻snap、方向键/Home/End与读屏direct choice等价。Night→Observation先原子绑定closed black/warm-red tokens再过渡，禁止白/蓝/黄/绿/灰闪现。
- My只重排现有account/profile/plan/contribution/profile-links/import/settings职责：header min-height=`120rpx`、avatar=`72rpx`、gear visible=`48rpx`/target=`88rpx`；status/Plan/Contribution共享surface/divider，routine row target=`88rpx`。Plan、Contribution、Profile Link、Import/Settings使用`48rpx`soft semantic tile与`24rpx`同族glyph；同屏最多三种非risk accent，不新增商业模块、banner、假统计、Favorite副本或第二icon体系。
- `sky/detail`保留全屏canvas、quiet Back、Source-backed object labels和上述raised ruler；删除boxed title/spot-time header、target/location top action、方向跟随中、手势/操作/数据说明等无效chrome。

## 5. Compact Contribution Intake

- `content/contribution/index`只有一个keyboard-safe vertical scroll owner。Top chrome为quiet Back + page-title，不设hero、说明卡或重复关闭；从spot panel进入时以一条安静context row展示已选formal spot，从My进入时展示可操作的“选择观星点 / 新地点”值，不伪造spot。
- 顺序固定为：report kind与spot context → affected topics与observed time → concise evidence narrative → 仅new-place proposal出现的location consent/location → bounded media与rights → single final submit；提交后/历史状态由`contribution-status-list`承接。它是同页渐进表单，不因视觉分组发明wizard、步骤store或改变Product Surface字段语义。
- 简单字段使用divider-backed cell row：wrapper/target≥`88rpx`，visible content=`72–80rpx`，horizontal padding=`16–20rpx`；label列建议`144–176rpx`且不截断，value/input右对齐或占余宽。Multiline、topic group、media等复杂字段使用top-label，label到control=`8rpx`。Group internal gap=`8–12rpx`、section gap=`20–24rpx`；不用per-field outer card、nested surface、空section标题、重复说明或为每项保留空helper区域。
- Label使用ordinary-action或body/500，section仅在确有多个相关字段时用section-title，value/body=`12/17px`，helper/error=`10/14px`。Required mark只标真正required；placeholder不能替代label。帮助、权限、隐私、rights与精确位置说明只在其会改变当前决定时贴近对应control出现。
- `contribution-kind-control`为single-choice compact rows/chips，visible=`48–56rpx`、target=`88rpx`；`contribution-topic-control`为wrap-safe multi-select，gap=`8rpx`且selected不改变尺寸。Observed-at是一个普通row，value与timezone清楚但不添加教程。
- Evidence textarea min visible height=`176–208rpx`，自适应但有合理上限；counter只在存在真实上限时显示。Location consent只在new-place condition挂载并用明确scope/value，不请求existing-spot report的当前位置。
- Media grid在390px为3列、320px/200% text可降2列；cell=`128–136rpx`、gap=`8–12rpx`，缩略图、progress、retry/remove都在同一cell并有独立88rpx语义目标或不重叠扩展目标。达到上限后不留空“添加”占位。上传失败保留local draft与已选media；raw EXIF/精确位置/rights边界仍由Product Surface拥有。
- Validation在blur或submit后紧贴字段插入，不预留空错误高度；message命名具体问题。Submit时稳定scroll/focus第一个invalid field且不闪白/跳顶。200% text时horizontal rows转top-label stack，页面不横滚。
- `contribution-submit`是页面唯一filled final commit，content-width、visible=`80–88rpx`、target≥`88rpx`。默认位于document末端；只有经真实viewport/keyboard验证不覆盖内容时才可固定到一个`88rpx + safe-bottom` lane，并必须给scroll owner等量bottom inset。不得同时出现底部与正文两枚提交。
- Submitting禁用重复写入并在同一button/附近显示明确progress；transport failure保留draft、media identity和同一idempotency key，提供retry；success只声明“已提交，等待审核”等真实pending状态，不声称已发布或已核验。Back/route exit在有未保存变化时使用现有draft/确认 owner，不新增平行状态。

## 6. Motion、scroll、accessibility 与 review boundary

- Search enter/exit=`180/160ms`；disclosure=`160ms`；panel/layer=`220/180ms`；panel settle≤280ms；ruler snap≤120ms；form row/error/upload状态=`120–180ms`。所有transition可中断并从live presentation retarget；reduced motion只保留≤80ms opacity/color/state swap。
- 所有mobile scroll owner隐藏纵横scrollbar chrome，但保留touch/wheel/keyboard/programmatic/screen-reader reachability。H5 prototype用`scrollbar-width:none`、`-ms-overflow-style:none`、`::-webkit-scrollbar{display:none;width:0;height:0}`；不能用`overflow:hidden`裁正文。
- Required matrix：day/night/observation × 320/375/390/430px × 100%/200% text × normal/reduced motion × normal/reduced transparency × touch/keyboard/screen reader，并覆盖cold/loading/empty/success/meaningful partial/stale/error/offline/recovery/disabled/pressed/focused及适用permission/calibration/accuracy/upload/retry。
- Required journeys：Map→marker medium；三extent同document identity；media/no-media staged expansion；handle-only drag/tap no-op/cancel；panel→layer→marker mutual exclusion；Search same text/compact suggestions/filters/Back/outside blur；ruler direct drag/snap/cancel/no arrows；Settings三态tap/drag/keyboard/reverse；My compact colored-icon hierarchy；Cloud→Full-Sky Back；Panel/My→Contribution contextual entry；compact form keyboard/validation；media progress/failure/retry/draft preservation；single submit→pending；320px与200% text reflow。
- Candidate只证明design reviewability。Native map、WEAPP routing、safe-area、IME/system Back、gesture arbitration、share、upload/storage、idempotency、moderation、performance、data truth与production fidelity必须在后续真实实现中独立验证。
