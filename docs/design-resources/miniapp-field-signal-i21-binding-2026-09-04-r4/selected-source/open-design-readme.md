# Starward 微信小程序交互设计候选

本目录是《今晚去观星》当前 Sky Canvas Field Signal 设计系统下的交互候选，只用于设计资源审计。它未被本次执行选中或冻结，不是正式 handoff，没有修改 E:\Dev\Starward 生产代码，也不证明真实微信控件、地图、系统键盘、设备传感器、数据源、分享链路或生产性能合规。

## 交付文件

- index.html：唯一 canonical entry；手机产品视口与视口外审计控制。
- assets/styles.css：当前 exact tokens、紧凑密度、三种模式、响应式、无障碍状态和因果动效投射。
- assets/app.js：本地确定性交互；不联网、不持久化、不实现推荐算法或生产 transport。
- coverage.json：5 个 Surface、9 条 current route、62 个 current material Control、状态、条件、定位器与退役处置。
- README.md：候选、复用映射、数据、原生能力与验证边界。

COMMISSION.md 是输入委托。没有 genuine owner conflict，因此没有创建 DECISION_REQUIRED.md；当前 unresolved items 为 0。

## 当前范围

| Product Surface | Current routes | 可审计职责 |
|---|---|---|
| miniapp-map-discovery | pages/map/index, spot/search | 连续地图、固定 Search、统一筛选、结果、marker、图层/时间与三档地点信息 panel |
| miniapp-sky-orientation | sky/detail | source targets、方向能力恢复与共享弧形时间尺 |
| miniapp-my-library | pages/my/index, plan/detail, settings | 账户、计划、信息提交、资料入口和三态显示设置 |
| miniapp-profile-content | profile/links, content/import | 安全链接、导入草稿、权利声明与地点关联 |
| miniapp-contribution-intake | content/contribution/index | 双入口地点上下文、类型、主题、时间、证据、条件位置、媒体、权利、提交与审核状态 |

主导航只有 Map / My。sky/detail 是唯一 Full-Sky child。已退役 route 与 Control 只在 coverage.json 以 absent disposition 记录，不进入 material UI。

## 当前交互闭环

- Spot panel 在 small、medium、large 永久保留同一个 objective-spot-document DOM 身份和同一顺序；extent 只裁剪视口，large 独占内部纵向滚动。有效媒体是唯一 presentation 例外：medium→large 从 p=.50 开始拉出，完成后 near-top chrome 才从 p=.82 淡出；Search、Location、Layer 在 opacity ≤ .08 时同步 inert。无媒体不创建节点、占位或空档，40rpx handle band 在拖动中保持；有媒体时 band 随 reveal 收起，handle 覆盖图片。
- 只有居中的 104×40rpx physical rectangle 可在 8px 纵向阈值后启动 panel drag；52×5rpx dash、正文、图片、top edge 和 tap/release 都不切档。Large 左侧 32rpx edge-back、键盘和具名 extent actions提供等价路径。Panel 始终停在 persistent Map / My navigation 上方。
- Panel 客观事实顺序固定为 identity → route/access/facility/safety → guides/field/source → astronomy → sky geometry → ruler → matrices/targets/source。普通 absent / unprovided / unverified 统一为“暂无数据”；loading、permission、stale、error、risk 保持不同语义。底部三动作 pill 使用 52–56rpx 可见面和共享 rounded-star；章节 rail 为 60×104rpx、零 padding、两个 52rpx item、一个 divider、零 gap、零 shadow，且不占文档布局。
- Map 的唯一 owner 是 bottomPresentation = none | spot-panel | layer-sheet。任一帧只允许一个 bottom surface visible / active / hit-testable。Panel→Layer 直接 retarget；Layer 打开时 marker intent 直接切到新 spot 的 medium，不先恢复旧 panel。Map DOM 与 trigger 坐标不因 sheet toggle 重建或跳动。
- Map entry 与 Search route 保持同一可见 query-or-placeholder、outer frame、baseline、leading slot 与 caret origin；只在同一 slot 做 Search→Back。Search 支持 autofocus、outside blur、可见/system/edge Back、IME composition、retained disclosure identity 与可中断 measured-height transition；无 trailing x、标题、quick/more、apply 或额外 divider。
- Search suggestion 的 `state.suggestionsOpen`、page `data-suggestions-open`、overlay `hidden` 与 input `aria-expanded` 由单一同步函数在 entry、focus、input、outside blur、Escape、composition close 与 exit 同步提交。Entry 首帧已为 open，关闭时不保留 92px/148px 空白 reservation；Search frame 与 query 不重建、不位移。
- Search result 只有 `.has-image` 保留 52% leading copy field 与 66% readability gradient；无有效 media 的卡片没有 `img`、gradient、半宽 copy 或空白半区，在 320/375/390/430px 与 100/200% 文本下均使用完整可用宽度。
- Curved Time Ruler 是 borderless、cardless、shadowless、instruction-free、arrowless 的 84rpx 可见块，整体上移 16rpx。Pointer/touch 横拖实际移动 track、逐帧 preview 最近真实 30 分钟 slice，release 在 ≤120ms snap/commit，cancel 回 committed slice；键盘与辅助技术保留增减语义但不显示箭头。
- Large panel 仅给 objective document 右侧增加 56rpx rail-safe inset，避免 `暂无数据` 等右对齐值与 60×104rpx rail 相交；rail 仍 absolute、document 外置，合法媒体通过反向 margin 继续全宽铺满。
- Map dismiss 只接受一次从 map-space 开始、在 map-space 结束且位移小于 8px 的新 pointer tap。由 panel body/content/image/top-edge 开始的 gesture 即使在 map-space 释放也不会合成关闭；extent drag 仍只属于精确 104×40rpx handle hot rectangle。
- Settings 只有一个 day | night | observation 三站 track，默认 day。命名 stop 的直接 tap/click 可靠选择该 stop；当前 stop 的真实 pointer tap只前进一步一次。拖动、反向拖动、方向键、Home/End 与 screen-reader direct choice继续可达；thumb、Sun/Moon/Star 交叉可中断反向。进入 observation 前先原子绑定 closed black/warm-red tokens，不保留独立 observation CTA。
- My 只包含 account/profile、Plan、Contribution、Profile Link、Import、Settings 既有职责：120rpx header、72rpx avatar、48rpx visible gear、88rpx rows，以及 48rpx role-colored SemanticIcon tile。没有 banner、commerce、社交统计、假指标、Favorite 副本或第二图标系统。
- Contribution 是单一 keyboard-safe scroll document。从 panel 进入携带 formal spot；从 My 进入在同位选择“选择观星点 / 新地点”。简单字段使用 divider-backed cells，复杂组使用 top label；校验在 blur/submit 后就地插入。只有 new-place proposal 挂载位置同意；媒体网格在 390px 为三列、320px/200% text 为两列，保留 local identity、progress、failure、retry、rights 和同一 local idempotency key。页面只有一个 final submit；成功进入“待审核”后，同一按钮以 disabled `已提交` 终态保留，不重新暴露无效提交动作。

## 可达审计条件

- 视口与文本：320 / 375 / 390 / 430 CSS px；100% / 200% text。
- 模式与偏好：day / night / observation；normal / reduced motion；normal / reduced transparency。
- 输入与辅助技术：touch、wheel、keyboard、programmatic、screen-reader；所有 owner scroll 保持可滚动且隐藏 scrollbar chrome。
- 状态：cold-start、loading、empty、success、meaningful partial、stale、error、offline、recovery、disabled、pressed、focused、permission-required、calibrating、low-accuracy、unavailable、retry、favorite-failure、pending、approved、rejected。

## 已退役且 material absent

- Routes：`spot/detail`、`spot/sky`、`sky/professional`、`sky/targets`。
- Controls：`observation-mode-control`、`source-lift-focus-layer`、`map-analysis-time-bar`、`spot-tonight-decision`、`map-spot-finder-trigger`、`map-spot-finder-sheet`、`map-finder-search-field`、`map-finder-query-overlay`、`map-finder-quick-filters`、`map-finder-sheet-handle`、`map-finder-advanced-filters`、`map-finder-result-list`、`map-marker-card-coordinator`、`map-selected-spot-callout`、`spot-header-actions`、`spot-segment-tabs`、`spot-night-entry`、`sky-orientation-entry`。

这些名称只存在于 README/coverage 的审计处置中，不进入 `index.html` 或 `assets/app.js` 的 material `data-control` 集合，也不形成 compatibility route。

## Library / component / Starward adaptation

Phone viewport 不展示组件库品牌、依赖名或实现标签。下面是 production planning 映射；HTML prototype 没有导入 Taroify、外部脚本、CDN 样式或远程资产，也不模仿 library brand defaults。

| Starward owner | Library / component | Starward adaptation |
|---|---|---|
| mini-primary-navigation | Taroify Tabbar | 两路由状态、exact tokens、panel safe avoidance、SemanticIcon |
| Search | Taroify Search + Cell.Group / Cell + Checkbox.Group | stationary frame、Back / edge-back、query overlay、filter ornament、retained results |
| map-spot-information-panel | 条件采用 Taroify FloatingPanel (anchors, contentDraggable=false) | one document、media/chrome phase、nav-safe extent、bottom enum、exact 104×40rpx handle；真实 WEAPP 必须证明 header-hit 与 nested-scroll，否则在同一 adapter 下回退 Taro ScrollView + Starward panel coordinator |
| section-and-action-rails | Taroify Sidebar + Button.Group / Button | exact flush rail、short action geometry、section/action semantics |
| map-layer-selector | Taroify bottom Popup | fixed size、local image choices、no-close chrome、mutual exclusion |
| Settings-and-My | Taroify Radio.Group + Cell.Group / Cell + ordinary Switch | three-state animated track、role-colored existing-duty hierarchy |
| Contribution | Taroify Form + Form.Item + Form.Feedback + Field + Input + Textarea + Radio.Group + Checkbox.Group + DatetimePicker / Popup + Uploader + Progress + Button | context、conditional location、draft、validation policy、transport、media identity、idempotency、pending receipt、sole submit |
| notification-feedback | Taroify Toast | 仅由 notification-feedback 使用；field errors 保持 inline，persistent recovery 留在 owner surface |
| Curved Time Ruler | Taro enhanced horizontal ScrollView | curve、real-slice preview / snap、hidden scrollbar；不以 generic Slider / Picker 替代 |
| icons | project-local SemanticIcon | 保留单一 icon adapter；明确排除 @taroify/icons |

@taroify/core@1.0.6 是当前 research-qualified preferred substrate。Package installation、version lock、tree shaking、bundle delta、native WEAPP behavior、FloatingPanel header-hit/nested-scroll、IME/safe-area/a11y/gesture behavior在本 DRA 均未验证。Ant Design Mobile 只作规范参考；TDesign native component 只作经验证的隔离 fallback；Taro primitive 只承担语义独有控件。

## 数据、媒体与安全边界

候选值是 representative non-live structure。页面不连接网络，不读写 persistence、真实账户、位置、EXIF、cookie、token、secret 或用户媒体。未知不会变为 0，risk 不会改写为正向建议。Contribution 与 import 只表达 pending review；Share 排除 private / transient state；sensor pose 不持久化且仅在当前画布内更新。

地点实景是内嵌 480×300 data URI，只在有效媒体状态出现；图层卡使用本地 inline SVG。无媒体没有 image node、placeholder 或 reserved space。没有远程字体、脚本、图片、地图瓦片、analytics 或 CDN。

## Authority 与有效运行来源

- Design-system ID：user:starward-mini-program-sky-canvas-field-signal-revision
- Stable target：target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02
- Canonical section SHA-256：086088d3f54d4bcede978fa0d4c09002bd8660dab0294536106b8e8459f706fa
- Provider exact body SHA-256：53eaac22d20d7b2a3b2bd501c1199558f9601d1afc5ed611d4e5ef7518c8a99d
- Exact-value base SHA-256：a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e
- Current component/layout source SHA-256：0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4
- Effective agent / model family：codex / GPT-5
- Exact model variant、reasoning level、service tier：artifact runtime 未暴露
- Formal qualification：highest_performance_unverified

没有 plugin、scenario 或 template snapshot。该来源如实记录本次可见 runtime；不把 COMMISSION 中的期望 provider tuple 当作已观测事实。

## 验证

静态检查通过：HTML、JavaScript syntax、JSON parse、local references、5-Surface / 9-route / 62-Control exact sets、retired material absence、prohibited product copy、external runtime resources、candidate-file boundary、one-document panel、bottomPresentation enum、handle/ruler/rail/action exact markers与 scrollbar chrome。源码级回归断言同时覆盖 suggestion 四态原子同步、无图 full-width copy、large rail-safe inset + media full bleed、fresh map-space tap gate、mode named-stop click/drag 分流和 disabled `已提交` 终态。

本次环境未提供可连接的 Browser 实例，因此浏览器交互执行、screen-reader 实测与 runtime clean-console 仍为 unverified；JavaScript syntax check 为 clean。本轮是机械修订，未执行图像导出，也不据静态断言声称渲染级视觉验收。未发现 genuine owner conflict，owner decision count 为 0。

真实微信容器的 package、原生控件、地图、传感器、系统 IME、safe area、screen reader、低性能设备和生产数据边界仍需后续独立验证；本候选不声称 owner acceptance 或 production conformance。
