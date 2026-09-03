# Starward 微信小程序设计系统 — Map / Finder 产品 UI

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 的不可变 Map/Finder 视觉来源。它与根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 的唯一 canonical adoption record 配合使用，不是第二套设计系统，也不拥有产品、业务、数据、路由或运行时语义。

## 选择与谱系

- Owner selection：用户在已经明确列出授权范围和禁止范围后回复“继续”，授权把当前 Field Signal 视觉语言扩展到小程序自有的 Map/Finder 产品 UI 层。
- Exact-value dependency：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。本文件只复用其中的 day/night/observation token、字体、间距、圆角、边界、高程、通用组件和运动 recipe，不另建 token truth。
- Product/interaction dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 `map-and-finder.md` continuation。它们拥有 Surface、Control、状态、commit/cancel/recovery 和 accessibility 语义。
- Editable upstream：Open Design design-system `user:starward-mini-program-sky-canvas-field-signal-revision`，system project `ds-starward-mini-program-sky-canvas-field-signal-revision`。后续变更必须生成新的不可变来源；不得覆盖本文件。
- Display rule：产品 UI、设计候选标题、导航、specimen 和普通评审标签不显示日期、revision、`version`、`vN`、`旧版`、`新版` 或 old/new/legacy 标签。内部 stable key、digest 与协议标识只作治理。

## 范围

### 包含

- `map-finder-search-field`、query overlay、quick filters、advanced filters；
- `map-spot-finder-sheet`、handle、结果列表及 `closed / peek / expanded` 表现；
- location、观测条件 Bar、map-coupled focus layer、layer selector、time control；
- formal-spot marker、selected-spot callout、app-owned analysis legend；
- 上述产品 UI 的 day/night/observation、loading/empty/partial/stale/error/offline/permission、pressed/selected/focused/disabled、响应式、200% text、reduced-motion 和 screen-reader 表现。

### 排除

- map provider、basemap、tile、道路/地形/卫星内容、原生地图渲染和不可移除的供应商/legal chrome；
- 新 Surface、route、信息架构、Control、筛选项、业务规则、数据字段、算法、权限、安全或持久化语义；
- 旧 Sky Canvas 页面构图、组件、动效、兼容 UI 或任何 old/new 双轨；
- provider-specific 地图品牌模拟、外部 tile/API、虚构实时数据和未经 Source 定义的地图能力。

## 视觉应用

### 主体与层级

- 地图是 `miniapp-map-discovery` 的主工作对象，持续占据 Search、quick filters、底部导航和安全区之外的剩余可用高度。App-owned chrome 退居覆盖层或边缘层；不能把地图压成仪表盘缩略图。
- Search 是顶部唯一查询入口；quick filters 紧邻其下。Finder Sheet 从底部边缘出现并与同一物理地图并行，不能形成第二页、第二地图或大块解释型 header。
- 地图默认保持干净：正式点位 marker、一个 location action、一个 `观测条件` Bar 和必要的 selected callout 是常驻上限。Layer selector、time control 与 legend 只在 owning focus state 出现。
- 用户选择的 formal spot 是 marker、Finder result 和 callout 的同一视觉对象。选中变化首先在地图对象附近反馈，详情只由 callout 的明确有效激活进入。

### 密度与容器

- Search/input 本体使用通用 Search Field 的至少 `88rpx` 高度、`radius-control`、solid `surface`、`1rpx border` 和可读 label/query；不得用玻璃、渐变或深色大板。
- Quick-filter、layer 和紧凑选择的可见 capsule 为 `60–64rpx`，居中置于不小于 `88rpx` 且互不重叠的命中区。普通态使用 neutral surface/border；selected 使用 `sky-soft`、`2rpx sky` 边界、文字/programmatic state 与一个 `36–40rpx` 半裁切圆角星共同编码。星体约占 capsule 可见质量四分之一，不遮挡标签，不复用为观测条件图标。
- Finder Sheet 使用 solid `surface`、`radius-sheet` 顶角、`1rpx border` 与 `elevation-2`；内部先靠 `8/16/24rpx` 节奏、标题基线和 divider 分组，不能每个 filter/result 再包一张卡。
- Sheet handle 的可见 bar 保持安静，完整 `88rpx` 命中区承担 drag/tap/accessibility state。`peek` 只呈现第一组有用选择和首个有效结果；`expanded` 才承载完整 draft/filter/result 内容。
- Finder result 使用 List/Cell 家族和 divider，partition header 是整行操作对象；城市只作组标题。长内容在 Sheet 自有的 bounded scroll 中可达，但隐藏 scrollbar chrome且不裁切内容。

### 地图控件

- Location control 使用一个 mode-aware 线性图标、`56–60rpx` 可见 surface、`radius-control-lg`、`1rpx border`、`elevation-1` 和至少 `88rpx` 命中区；permission/loading/error 用同一几何切换，不放大成主要 CTA。
- `观测条件` Bar 使用 `68–72rpx` solid surface、`radius-control-lg`、`1rpx border`、`elevation-1`，只显示 Tier-A condition/instrument icon、当前 layer/关键 metric、一个本地时间值和 disclosure affordance。时间/选择使用 sky，机会使用 trail，稀缺天象使用 meteor，风险使用 risk；一个局部最多两种非中性色并可附必要 risk。
- Map-coupled focus layer 的控制面使用 solid canvas/surface 与 divider，不使用玻璃或独立卡片墙。上方控制区按 viewport/200% text 重排并保持无内部纵向滚动；同一物理地图在其余空间连续可见。关闭动作是 optically centered 的 quiet icon，只有透明 hit region 扩到 `88rpx`。
- Layer selector 复用 Choice/Radio 语义而非地图 tab 导航。只有一个 analysis layer 能呈 selected；普通底图和默认 formal markers 不画成 peer choice。
- Time control 复用 Time Rail/slider 视觉，只有一个可见当前时间值；游标、轨道和选中状态与同一 map feedback 相邻。不得再画第二个 hero time、helper time 或输入副本。

### Marker、callout 与 legend

- Formal marker 是克制的 app overlay：默认以 `32rpx` neutral core、`2rpx border-strong` 和短下锚点构成；selected 增至 `40rpx`，使用 `sky-soft` core、`2rpx sky` 边界和明确的 callout/accessible selected state。尺寸、边界、锚点和文字反馈共同区分选择，禁止 glow、pulse、粒子或只换颜色。
- Marker 的 hit/accessible alternative 由真实地图适配器与 Finder list 共同保证；视觉 marker 本身不伪装成已验证的 native `88rpx` hit region。
- Selected callout 使用一个 coherent formal-spot Card：最大宽度 `480rpx` 且不超过 viewport 左右各 `32rpx` 安全边距，`24rpx` padding、`radius-panel`、`1rpx border`、`elevation-1`。只容纳 spot name、Source 允许的少量比较事实、状态/单位和一个 whole-surface disclosure；不得嵌套 card、塞完整 Detail 或另加“查看地点判断”按钮行。
- App-owned legend 仅在有 active analysis overlay 时出现，使用一个 `radius-band` solid strip、`1rpx border` 和紧凑 label/value/shape 组合。每种 scale/grade 同时有文字或纹理/形状，不只靠色相；一次只有一个 layer legend，不叠加互相冲突的色带。

## 模式、状态与反馈

- Day 使用现有暖日光 neutral canvas/surface；map chrome 的大面积区域保持中性，sky/meteor/trail/risk 只承担已定义语义。
- Night 使用现有低色度近黑 surface 和清晰边界；不通过 glow、霓虹或 blanket blue haze 将控件从地图中“点亮”。
- Observation 中所有可控 app chrome、marker、callout、legend、loading、focus 和过渡只使用现有 closed black/warm-red roles。若 provider/native map 或 legal chrome 无法主题化，进入前必须警告并提供安全取消/返回或非现场替代；不得伪称底图已符合观测模式。
- Loading/empty/partial/stale/error/offline/permission 复用 `notification-feedback` 与 `page-state-recovery` 家族，就地说明受影响对象并保留仍可信的地图/点位/筛选状态。不得清空地图制造“错误页”，也不得以演示数据填空。
- Press-in 立即使用现有 tonal/border/scale recipe；有效 release 才 commit。失焦、drag-away、map-pan competition、disable/cancel 不触发导航或筛选提交。

## 运动与手势

- Search overlay 使用现有 short state-swap/fade，从字段几何锚定；commit 必须先于 blur close，且 sibling disclosure 互斥。
- Finder Sheet 使用现有 bounded Sheet recipe，presentation 从实时位置继续，允许反向和中途重新抓取；`closed / peek / expanded` 之外没有视觉停点。Map pan 只在 handle/Sheet 外部归地图所有。
- Marker/result/callout selection 使用现有 Selection recipe；地图相机只在保持对象和动作可见所需时移动，用户主动 pan 后不能被自动 recenter 对抗。
- Time scrub 每帧直接跟手；release/cancel 分别投射到 Screen Contract 的 commit/recovery。不得用动画插值伪造天气、天文或地图数据。
- Reduced motion 保留直接跟手和状态反馈，去除大轴 travel、overshoot 与 map/camera ornamental movement；Sheet extent、selected marker、结果和时间仍通过即时 geometry/border/text state 可理解。

## 响应式与无障碍

- `320/375/390/430` CSS-pixel equivalents 和 `750rpx` 映射按内容优先级 reflow，不把单一 phone frame 等比缩放。正常文字下 Search、quick filters、可用地图、Sheet handle 和 Map/My navigation 同屏。
- `200%` text 时标签可换行，quick filters 可自适应 wrap，Finder actions 保持可达；不得消灭可用地图、隐藏 handle/commit/revert 或制造页面级横滚。
- 每个 app-owned action 有 role、name、state/value 和逻辑 focus order；icon-only action 必须有 accessible name。Marker/地图不能直接读屏操作时，Finder result list 是完整的非手势替代。
- Search suggestion、partition count、selected spot、Sheet extent、active layer、selected time、loading/failure/recovery 在适当时礼貌播报，不逐帧播报 drag、pan 或 scrub。
- Keyboard/assistive input 可完成 Search、clear、suggestion、quick/advanced filter、Sheet extent、result selection、layer/time 和 close；Back/Escape 先关闭 route-owned overlay/Sheet extent并把 focus 返回逻辑触发点。

## 禁止模式

- 不从旧设计资源复制 layout、marker、callout、Finder、motion 或兼容 presentation；
- 不把 Search、quick filters、Finder、layer selector、legend 画成多个竞争入口；
- 不用 stacked cards、glassmorphism、generic gradient、broad shadow/glow、decorative stars/meteors 或 dashboard chrome 覆盖地图；
- 不把所有 filter 画成 pill，不让 selected 只靠颜色，不把 visible surface 撑满 `88rpx` hit box；
- 不渲染第二张地图、第二个 selected-time 值、第二套 filter truth、第二个 Favorite 入口或第二个点位列表；
- 不显示设计 rationale、review/debug metadata、fixture disclosure chrome 或版本/新旧标签在用户 phone surface；
- 不声称本资源定义、主题化或验证了 provider/basemap/native map。
