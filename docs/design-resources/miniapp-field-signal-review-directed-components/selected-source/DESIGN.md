# Starward 微信小程序设计系统 — 地图、窗口与天空组件

本文件是 `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02` 在首轮全量设计资源审计后新增的不可变组件与交互来源。它补齐并修正当前系统的 Map/Finder、筛选、反馈、观测窗口、时间轴与方位天空表达；根 `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` 仍是唯一 canonical adoption record。

## 选择、依赖与边界

- Owner direction：用户逐项审计首轮候选后，明确要求按“DRA 设计资源 → 需求变更 → 设计资源”循环，先修改当前设计系统，再重新生成全量设计资源。
- Exact-value foundation：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。其 day/night/observation 色彩、字体、间距、圆角、边界、高程和基础组件值保持不变。
- Map/Finder foundation：`docs/design-resources/miniapp-field-signal-map-finder-ui/selected-source/DESIGN.md`，SHA-256 `b4cd506d99caf3c5f59351f295f01cb7330ac720ce39f03abe464a143e09112e`。本文件替代其中与新 Finder 拓扑、筛选尺寸、图层控件或默认 Sheet extent 冲突的陈述；未冲突的 marker/callout/provider 边界继续适用。
- Product/Screen dependency：`project_context/areas/main/product-surfaces/wechat-miniapp.md` 与 `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及相关 children。它们拥有产品、Surface、Control、状态、数据、commit/cancel/recovery 和 accessibility 语义。
- Current-implementation constraint：`spot-favorite-action` 的既有收藏 ritual 由当前生产组件 `apps/wechat-miniapp/src/components/selected-card-star.*` 提供 owner 指定的视觉/运动约束；本文件将其提升为当前设计系统的唯一 bounded exception，但不把生产代码变成其他 token 或产品语义权威。
- Inspiration boundary：审计所附第三方地图截图只用于 Map 与 Sheet 的空间拓扑、少量图层的边缘控制启发；不得复制品牌、底图、图标、token、专有布局或密集功能集合。
- 本文件不新增地图图层、天文算法、数据字段、route、权限或后台能力；对产品含义的 owner 修改必须先落在 owning Context。地图 provider/basemap/tile/native-map/legal chrome 仍排除。
- 产品 UI、设计候选、handbook 导航和 ordinary labels 不出现日期、revision、`version`、`vN`、old/new/legacy、`旧版` 或 `新版`。内部 stable key、路径与 digest 仅作治理。

## 1. Map Discovery Frame 与 Finder Sheet

### 1.1 空间拓扑

- 地图连续铺满 route 的可用内容区，是固定主工作对象；顶部与右侧只保留地图相关悬浮控件。Search、quick/advanced filters、`想去` 和 `其他观星点` 不再占据地图上方的独立页面区，而统一属于底部 `map-spot-finder-sheet`。
- Finder Sheet 默认处于 `peek`，正常文字下约占内容区 `42–48%`，并至少保留 `320rpx` 连续可辨地图。`closed` 仅是用户明确向下收起后的地图专注态；`expanded` 上缘停在系统胶囊/安全区和紧凑地图控件之下。320px 或 200% 文本优先保证 Search、handle、提交/恢复动作与至少 `280rpx` 地图，不以缩字或横滚维持比例。
- `peek` 的顺序固定为 handle → Search → 同一筛选组的 quick choices / `更多条件` → 第一个有用的点位分区内容。点击 handle、点击 Sheet 的非交互空白提升区或向上拖动进入 `expanded`；从交互控件起手不抢占其点击/滚动。
- `expanded` 在同一个 Sheet 中继续呈现完整筛选编辑与两组点位列表，不新开 Modal、不切换页面、不渲染第二张地图。Sheet 内只有一个纵向 scroll owner；Search 与 filter header 可在 expanded 内保持 sticky，但不得造成第二个滚动容器。
- 地图右侧/上部悬浮控件按 `16rpx` 间距组成一条安静 edge stack，包含 location、观测条件与 layer trigger；每个可见面 `56–60rpx`，命中区至少 `88rpx`。不得复制通用地图的“更多工具”矩阵或堆叠无关入口。

### 1.2 Search 与统一筛选组

- Search 使用基础 Search Field 的 `88rpx` 本体并固定为 Sheet 的第一主控件。建议层锚在字段下方且属于 Sheet overlay layer，选择先 commit 再关闭；它不把 Sheet 或页面推高。
- Quick 与 advanced 是一个 filter truth、一个视觉家族和一个结果投影。Quick choices 与 `更多条件` 入口处于同一 wrap-safe filter group，使用相同 capsule、字体、selected grammar 和间距；expanded 后的 advanced choices 延续同一网格，不再出现“上方 chips + 下方 checkbox 表格”的拼接感。
- Quick choice 仍即时 commit；advanced 仍使用 opening snapshot、draft、conditional revert/commit 与 discard-on-close。不同 commit 语义通过 group label、`更多条件` 的 draft count 和底部动作表达，不能靠两套样式暗示两个系统。

## 2. Filter Choice Capsule

- 语义沿用 Checkbox/Radio/Choice family，不创建外观驱动的新控件。Visible capsule 高 `68–72rpx`，外层命中区至少 `88rpx`；label 保持 compact-choice `24rpx / 34–36rpx`（12px / 17–18px）、weight 500、字距 0。水平 padding `24–32rpx`，让字体在更大的选项中保持次要比例。
- 同一 label 的 default/pressed/selected/focused 几何宽高完全不变。Selected 的 `2rpx` 边界向内绘制，装饰星绝对定位且不参与 inline size，不能因激活增加 padding、border width 或文本宽度。
- Selected star 使用一个 `40–44rpx` 圆角实心星，定位在右上角，约一半可见质量被 capsule clip；它必须仍可辨认为星形，不能只剩圆弧或完全隐藏。布局始终为 star 预留不遮挡 label 的 trailing breathing space。星、selected border、label/programmatic checked state 共同编码选择。
- Day/Night 使用 sky roles；Observation 保持同一几何，仅换 closed warm-red roles。Pointer hover 不扩大边界；keyboard focus 使用当前内侧 focus treatment。Reduced motion 立即切换 selected geometry，不移动装饰星穿过文字。

## 3. Compact Map Layer Rail

- `map-layer-selector` 是地图边缘的单一 layer trigger 与一个紧凑 rail/popover，不是页面 Tab、工具宫格或底图选择器。普通 base map 与默认 formal markers 不作为选项。
- Rail 只投射当前 Source 支持的 `LIGHT`、`TOTAL_CLOUD`、`OPPORTUNITY` 三个 analysis layers，加一个清楚的“关闭图层”恢复动作；不得为填满版面新增卫星、交通、雷达、温度、风等能力。
- Rail 宽 `176–208rpx`，使用 solid surface、`radius-panel`、`1rpx border`、`elevation-1`；每行 visible `72rpx`、target ≥`88rpx`，一个 Tier-A symbol + 12px label。Selected 使用 inset `sky` indicator、soft fill 与 checked state；颜色 legend 只在对应 layer 生效时独立出现。
- Open/close 使用 `120–160ms` opacity/state swap 与不超过 `16rpx` 的边缘位移；可中断，Back/Escape 先关 Rail，focus 返回 layer trigger。Reduced motion 直接切换。它不能遮挡 selected callout、Sheet handle、location、系统胶囊或最终承诺动作。

## 4. Event Opportunity Window

- `spot-tonight-decision` 的窗口对象先说明“为哪一个观测目标/天象判断”。当 Observation Context 绑定 event/target 时显示其正式 display name 与类别；无 event/target 的 daily context 使用“综合观星条件”，绝不虚构流星雨或其他天象。
- Anatomy：目标/天象标题、建议结论、主窗口时间范围、一个 `event-opportunity-rail`、关键 marker、2–3 条最有解释力的满足/限制条件、数据状态。条件来自 `SkyTarget`、`ObservationWindow.favorableFactors/adverseFactors/startReason/endReason` 与同一 `SkyOpportunity`，页面不得重新评分。
- 只使用一个连续时间可视化。Rail 高 `20rpx`、`radius-band`；全夜背景为 neutral subtle，所有可核验连续窗口为 sky-soft，主/最佳段为 sky，天象峰值节点为 meteor，当前/预计到达使用不同 shape/label。开始、结束、峰值和预计到达通过贴近 rail 的刻度/短标签表达。
- 不再同时展示独立双条图和三列表格。时间范围、时长、置信/数据状态及“为什么满足”放在同一对象的标题、rail 和紧邻文本中；备选窗口仅在存在且有决策价值时以较弱相邻段显示，不另建卡。
- 320px/200% 文本时 rail 保持全宽，labels 可上下错位或只保留 start/current/end 的可见标签；完整值仍由 slider/figure accessible summary 读出。图形 `aria-hidden` 时必须有等价文本顺序：目标 → 结论 → 主窗口 → 条件 → 状态。

## 5. Calibrated Time Scale

- `sky-time-scrubber`、Map time control 与 Orientation time control 共享一个 `calibrated-time-scale` component family，但各自只出现一次当前时间。它替代无刻度的 generic range slider 外观，不新增时间 store 或业务规则。
- Anatomy：range label、one current value、`4rpx` baseline、minor ticks、major ticks/labels、window bands、event nodes、`28rpx` cursor head + `20rpx` needle，以及至少 `88rpx` 高的 direct-manipulation hit lane。
- 当前 30 分钟数据 cadence 使用每 `30min` 一个 `8rpx` minor tick、每 `2h` 一个 `18rpx` major tick及 label；首尾必有 label。天象/窗口边界用 `24rpx` event tick。若 Source cadence 变化，tick spacing 从当前离散时间点推导，不能插值或伪造数据。
- Cursor 使用 sky；事件/峰值使用 meteor；良好窗口可用 trail，但一个局部最多两种非中性色加必要 risk。Observation 只用暖红的线宽/实虚/shape 差异。
- 拖动每帧更新同一主对象，release commit，cancel 回到 committed value；键盘/assistive input 逐一个真实时间片调整并暴露 min/max/current。跨主要刻度可提供非必需短 tick haptic，但视觉与语义反馈始终完整。
- 320px、200% 文本或 label 冲突时，保留首/当前/尾 labels，其他 major tick 仍可见但文字降采样；不得缩小正文、横向移出当前游标或叠加第二个时间值。Reduced motion 取消 settle/inertia，直接跟手不取消功能。

## 6. Continuous Spot Night Composition

- `spot/sky` 的 summary、条件、专业信息与目标属于一个按判断顺序自然滚动的连续页面，不使用 `sky-summary-tabs` 或 segmented control 把少量内容切成互斥 panel。
- 页面顺序：当前地点/时间 → 静态 2D sky/结论 → Event Opportunity Window + Calibrated Time Scale → 核心 condition bands → 当前目标 → 专业证据/来源 disclosure → 方位天空 entry。专业矩阵或完整目标详情可继续下钻，但主页面必须直接显示足以完成判断的摘要，不要求用户来回切 tab 比较。
- Spot Detail 的 Overview/Guides/Site segmentation 仍保留；选择只替换其 owned content，不改变 page/document scroll offset，不移动 fixed header，也不把 focus 跳到页面顶部。

## 7. Full-Sky Orientation Canvas

- `sky/detail` 以天空为全屏主对象。Canvas 从 top safe area 延伸到 bottom safe area；back/title、地点/时间、sensor state、对象标注与 time scale 都是覆盖在同一天空上的紧凑 chrome，不再用大段说明、圆形占位图或常驻对象列表把天空缩成卡片。
- 可见目标直接锚定在天空投影中：star/object mark + display name + 必要方位/高度或状态，选择时在原位显示一个紧凑 detail label。不得为装饰填入不属于当前 SkyReport 的星点；背景可有低对比坐标/地平线网格，但不冒充真实目标。
- Orientation 由前台设备姿态流驱动。`alpha/beta/gamma` 控制视口朝向/俯仰/横滚，绝对方位需要时与现有 compass owner 组合；传感器只改变呈现，不改变地点、时间或天文真相。页面隐藏、离开或失焦即停止监听，不记录连续姿态轨迹。
- Top chrome 的每个状态只占一行紧凑 overlay：地点/当前时间、一个短 sensor state 和必要 action。Permission/denied/calibrating/low-accuracy/stale/unavailable 使用同一 stable geometry；只有不能继续时出现一个 compact recovery panel，天空仍占主导。
- `sky-orientation-object-list` 不再是常驻视觉主区。它作为 screen-reader semantic equivalent、传感器不可用的 degraded list 或用户明确打开的 compact disclosure 保留，内容与 canvas targets 同源。
- Calibrated Time Scale 位于距底部 safe area / primary navigation `32–48rpx` 的 overlay，左右 inset `32rpx`，背景使用受控透明 surface：Day `rgba(255,255,255,.88)`、Night `rgba(24,26,23,.88)`、Observation `rgba(17,0,0,.94)`；`radius-panel`、`1rpx border`，不能用 blur/glass。Reduced transparency 使用对应不透明 surface。
- Sensor-driven functional motion 从最新姿态连续更新，不叠加惯性、parallax、bounce 或环境循环；新姿态立即接管，不排队。Reduced motion 移除插值/settle而保留直接姿态反馈，并始终提供文本目标/方向等价。

## 8. Feedback Selection Rule

- 能由局部控件或受影响对象直接看见的 selection、filter、expand/collapse、tab/segment、navigation、favorite success、time scrub、layer choice 和 mode state 不弹 toast/snackbar/modal。局部 state change 就是第一反馈。
- Persistent/actionable permission、partial/stale/offline/error 在受影响对象附近使用 inline `notification-feedback`；字段错误留在字段。Floating feedback 只用于结果在当前对象上不可见但需要确认的短异步完成、copy/save acknowledgement 或单一 undo，并且一次 transaction 最多一个。
- 重复事件按 owner/dedupe key 合并；不为每次点击排队。屏幕阅读器只播报 commit、重要状态变化、失败与恢复，不播报 pointer/drag/scrub 中间帧。
- `spot-favorite-action` 成功只依靠既有 star ritual + pressed/selected semantics；失败才显示对该 favorite relation 的失败/恢复反馈。

## 9. Favorite Ritual — Current Implementation Preserved

- Main star visible box `52rpx`；inactive 为 outline，active 使用 `favorite-active` fill。Activation 的主星在 `180ms ease` 内从 live state 变为 `scale(.92) rotate(7deg)`。
- Active effect stage 非交互、`inset:-48rpx`、overflow visible；最多三个不同尺寸的 satellite/meteor marks，从外侧进入并在 `420ms ease-out` 内 settle，delay 分别为 `60/100/140ms`。它们不循环、不发光、不遮挡导航或标题，视觉重量始终低于 main star。
- Deactivation 从当前 presentation state 反向到 outline，不排队；failed commit retarget 到 authoritative favorite relation。Reduced motion 移除 satellite travel 与 main-star rotation，保留不超过 `80ms` 的 fill/opacity state change。Observation 使用相同几何与暖红 roles。
- 这是对“禁止环境粒子/装饰流星”的唯一 bounded causal exception；不得复用于 filter、成功 toast、页面背景或其他按钮。

## 10. Content And Review Boundary

- 设计资源 phone/product viewport 中不显示“演示数据”、fixture、demo、review/debug disclaimer 或资源生成说明。资源里出现的 title、field、state、criteria、source/freshness 和 action 都必须是产品需要承载的正式信息结构。
- 未选设计资源仍可使用有界代表值来展示 layout/state，但非实时属性只在资源 README/coverage/provenance 等 viewport 外元数据中说明；不得把代表值写成“实时”，也不得让 Provider 自行新增字段或规则。
- 实际开发/验收环境若启用显式 fixture mode，仍遵守其独立运行时标识与安全规则；本条不删除真实产品的 source/freshness/completeness 反馈，也不把设计资源当生产数据。

## 11. Current-System Replacement Rules

- 本文件加入后，当前 Mini Program generation 只消费根 `DESIGN.md` 的完整 composed body 与本文件所声明的 current dependency closure。冲突的旧构图、generic slider、稀疏 tab、notification 滥用、demo label 或简单表格不得作为 fallback。
- 先前 immutable sources 只作为未冲突 exact-value foundation 或隔离 audit provenance，不形成 old/new UI 双轨。被本文件替代的语句不能继续出现在候选、生产实现或 ordinary design copy。
- 任何新增 layer、天象算法、route、数据字段、权限策略或 provider/native-map styling 都需要其真正 owner 决定，不能从本组件系统反向推导。
