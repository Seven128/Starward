# Starward 微信小程序 · Sky Canvas Field Signal 候选系统

> 状态：**未选择候选**  
> 适用面：Starward《今晚去观星》微信小程序（非地图界面）  
> 基线：Design Authority closure `sha256:eb3d6c5cb2b498195e61b410727e9c93b28c52c502b331e08ec02ada9766b5b2`  
> 目标：`target.system.wechat-miniapp-sky-canvas-2026-08-25`

本文件描述一个有边界的 Sky Canvas 演进候选。它不修改当前项目权威，不代表已选择、已采用、已实现或生产合规；进入代码库前仍需按项目的 authority/adoption 流程审查。

## 1. 设计意图

《今晚去观星》先帮助用户判断“今晚值不值得去”，再回答“去哪里、何时、如何安全到达”，最后按需展开天气和天文证据。界面应像轻量、可信、有户外生命力的决策仪器：安静画布承载高密度信息，活力来自语义色、连续轴、空间节奏和因果动效，不来自装饰。

### 1.1 不变的产品层级

1. **结论**：建议出发、谨慎出发或不建议出发，并明确不确定性。
2. **行动**：主地点、备选地点、最佳窗口、预计到达、路线风险与装备提示。
3. **证据**：云量、透明度、视宁度、月相、日月升落、模型来源、更新时间和缺失状态。

设计系统只改变视觉与组件表达，不新增路线、状态责任或业务行为。示例内容均标注为“演示数据”，不得当作实时观测结论。

### 1.2 明确排除

- 地图提供商、底图/瓦片、原生地图外观、地图标记/气泡/图例/Finder、地图专属动效。
- 原生 App 与 owner-operations/运营端设计档案。
- 新的信息架构、业务流程、评分算法或未经权威定义的产品能力。

## 2. 色彩系统

语义所有权：sky/periwinkle 负责时间、选择与信息焦点；meteor yellow 负责唯一最终承诺、天象事件和稀缺好窗口；trail green 负责路线、地形、可行机会和良好户外条件；risk coral 负责风险、阻断和失败。单一局部区域最多使用两种非中性色，另可加入必要风险色。日间大面积只使用暖日光中性表面，深色只承担可读文字；不得用任何强调色反复染标题、边界和普通容器。

完整值位于 `tokens.scss` 与 `colors_and_type.css`。所有普通文本组合需达到 4.5:1；大文本和关键图形边界需达到 3:1。状态必须同时有文字、图标、形状或线型，不得只靠颜色。

### 2.1 日间模式

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#FBFAF7` | 暖日光中性页面背景 |
| surface | `#FFFFFF` | 控件、内容面 |
| surface-subtle | `#F5F5EF` | 轻量技术带、轨道与隐式分组 |
| text-primary | `#282B29` | 炭黑主要文本，对 canvas 13.71:1 |
| text-secondary | `#5E655F` | 次级文本，对 canvas 5.74:1 |
| text-tertiary | `#6D746D` | 辅助说明，对 canvas 4.60:1 |
| border | `#E2E5DD` | 安静分隔线，不单独承担状态 |
| border-strong | `#8A9088` | 关键图形边界，对白 3.27:1 |
| sky / sky-soft / sky-strong | `#8799F6` / `#EFF1FF` / `#4859B8` | 时间、选择、信息焦点；strong 对 soft 5.50:1 |
| meteor / meteor-soft / meteor-strong | `#F2C94C` / `#FFF7D6` / `#6F5500` | 最终承诺、天象、稀缺窗口；strong 对 soft 6.56:1 |
| trail / trail-soft / trail-strong | `#62C88B` / `#E9F8EE` / `#1F6B45` | 路线、地形、可行机会；strong 对 soft 5.89:1 |
| risk / risk-soft / risk-strong | `#E66F66` / `#FFF0ED` / `#973D37` | 风险、失败；strong 对 soft 6.23:1 |
| focus | `#6174D8` | 可见组件边缘的 4rpx 内侧键盘焦点，对白 4.20:1 |
| on-sky / on-meteor / on-trail | `#202332` / `#3A2E00` / `#153B2A` | 亮 common 填色上的深色文字，分别为 5.87:1 / 8.43:1 / 6.00:1；禁止白字 |

### 2.2 夜间模式

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#11120F` | 中性近黑页面背景 |
| surface | `#181A17` | 主要内容面 |
| surface-subtle | `#242720` | 低色度技术带/行 |
| text-primary | `#F5F3EC` | 主要文本，对 canvas 16.93:1 |
| text-secondary | `#BEC2B8` | 次级文本，对 canvas 10.38:1 |
| text-tertiary | `#989E94` | 辅助说明，对 canvas 6.85:1 |
| border | `#343830` | 普通分隔线 |
| border-strong | `#666D62` | 关键图形边界，对 canvas 3.52:1 |
| sky / sky-soft / sky-strong | `#A9B6FF` / `#292D45` / `#D1D7FF` | 选择、时间；strong 对 soft 9.56:1 |
| meteor / meteor-soft / meteor-strong | `#F6D56F` / `#3A3118` / `#FFE5A0` | 最终承诺、天象、窗口；strong 对 soft 10.39:1 |
| trail / trail-soft / trail-strong | `#7ED7A1` / `#1B3426` / `#B7EACB` | 路线、机会；strong 对 soft 9.99:1 |
| risk / risk-soft / risk-strong | `#FF8F87` / `#452724` / `#FFC0BA` | 风险、失败；strong 对 soft 8.61:1 |
| focus | `#B4BEFF` | 内侧键盘焦点，对 surface 9.80:1 |

夜间不是观测模式。夜间仍可用四种语义色，但局部区域遵守“两种强调色上限”。

### 2.3 观测模式

观测模式是独立作者模式，不是夜间主题覆层。它只允许纯黑与暖红家族：`#000000`、`#110000`、`#190000`、`#240000`、`#5B1712`、`#7A1E18`、`#A83229`、`#C23D32`、`#D84A3C`、`#FF6B58`。禁止蓝、白、黄、绿与中性灰闪现，包括加载、系统回退、图片占位、焦点环和切换过渡。

- 主要文本 `#FF6B58` / 黑：7.50:1。
- 次级文本 `#D84A3C` / 黑：4.96:1。
- `#C23D32` 只用于大文本或图形，不用于普通正文。
- 关键边界 `#A83229` / 黑：3.15:1。
- 错误仍用暖红，但必须附“阻断/失败”文字和图标；不新增其他色相。
- 切入前先准备观测模式令牌，再在同一帧替换整棵界面，避免过渡中出现白闪。

### 2.4 组件映射

- Decision Summary：结论文字保持中性；建议用 trail、时间用 sky、稀缺窗口用 meteor，湿滑风险才用 risk；证据带分成局部子区遵守两强调色上限。
- Observing Window：轨道选中段用 sky；稀缺天象窗口可加入 meteor；不同时再加入 trail。
- Route/Elevation：trail 专属；风险标记可叠加 risk。
- Sun/Moon Event：meteor 专属；选中游标仍用 sky。
- Provenance/Freshness：默认中性色；stale 用 meteor 图标+“数据较旧”；offline 用 risk+“离线缓存”。
- 数据矩阵：中性底；只给当前选择列和真正异常单元着色，不把每一行染成不同颜色。

## 3. 字体与图标

字体不依赖网络资源，也不声称打包字体。中文和界面统一使用：`"Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif`。Windows 优先使用可用的 Noto Sans SC，微信平台自然回退到 PingFang SC。数字/时间可使用 `"SFMono-Regular", Consolas, "Liberation Mono", monospace`，只用于对齐数据，不用于导航、分类标题或长文。

| 角色 | CSS px / rpx | 行高 | 字重 | 说明 |
|---|---:|---:|---:|---|
| conclusion | 25–27 / 50–54 | 1.38–1.42 | 600 | 一句决定性结论，最多 2 行 |
| page-title | 22–24 / 44–48 | 1.4 | 600 | 页面标题，避免行政化粗黑 |
| section-title | 17–18 / 34–36 | 1.45 | 550–600 | 模块标题 |
| body | 14–15 / 28–30 | 22–24px | 400 | 中文正文与说明 |
| ordinary-action | 13 / 26 | 19px | 500 | 普通按钮与行内动作 |
| compact-choice | 12 / 24 | 17–18px | 500 | 紧凑选择、视图切换值 |
| final-commit | 15 / 30 | 21px | 500 | 唯一最终提交 CTA |
| snackbar | 13 / 26 | 19px | 400 | 消息；其动作使用 12px / 18px、500 |
| status-tag | 10–11 / 20–22 | 15–16px | 500 | 仅短状态词 |

- 中文标题、按钮与标签字距均为 `0`，不得负字距或人为追踪。
- 正文与 helper 使用 400；普通标签/控件使用 400–500；标题使用 500–600；600 只保留给结论与关键时间。普通界面禁止 700，正文禁止脆弱 ultralight。
- 数字采用等宽数字 `font-variant-numeric: tabular-nums`；时间轴每列共享宽度。
- 导航与分类标题使用中文系统字体、自然字距，不使用 tracked uppercase 或等宽行政标签。
- 200% 文本缩放与长中文按钮/字段标签必须单独验证；允许换行，不以缩小字号维持单行。
- 图标使用单一线性家族：24/32/40rpx 三档，默认 3rpx 描边，关键图标 4rpx；圆端点、圆连接，不混用填充图标集。
- 图标不单独表达关键含义；无可见标签的 icon action 必须有可访问名称。

## 4. 间距、密度、占用率与几何

### 4.1 间距

以 8rpx 为主基线、4rpx 为微对齐：`0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96rpx`。320/375/390px 等效视口统一优先 32rpx（16 CSS px）页边距，430px 为 40rpx。紧凑不是把内容塞满，也不是机械放大外间距；它由以下四层留白共同控制：

1. **屏幕 / 布局留白**：16px 等效移动边距与安全区，阻止内容贴边；不因追求“高级”而制造空白列。
2. **组间节奏**：相关项 4–8px，普通组 8–12px，章节 16–24px；先靠距离表达关系，再考虑容器。
3. **组件内部留白**：文字、图标、thumb 与可见边缘之间必须保留稳定呼吸；compact 水平 10–12px、ordinary 14px、final 20px，卡片 8px compact / 12–16px normal。
4. **视觉重量留白**：字号、字重、行高、边框明度、填色面积与 thumb 比例共同限制“占满感”。默认文字 400、动作/选中 500、结论/主标题 600；不能用更粗字、更深边或更大填色补偿层级不足。

可见几何与命中几何分离：紧凑选择/外观 chip 可见 56–60rpx，普通动作 68–72rpx，最终承诺 92–96rpx；交互包装始终至少 88rpx，扩展区不得与相邻目标重叠。不要为了命中合同把背景、描边和文字一起撑到 88rpx。text/search input 本体直接至少 88rpx，不以伪扩展命中区掩盖较小输入；textarea 自然更高。

### 4.2 语义圆角

| 令牌 | 值 | 使用 |
|---|---:|---|
| radius-none | 0 | 表格、矩阵、长分隔线 |
| radius-data | 4rpx | 数据单元、轨道 |
| radius-band | 8rpx | 条带、矩阵外框 |
| radius-control | 12rpx | 输入、普通按钮 |
| radius-control-lg | 16rpx | 分段控件、icon action |
| radius-panel | 20rpx | 紧凑内容面板 |
| radius-panel-lg | 24rpx | 主内容面板 |
| radius-friendly | 32rpx | 权限、帮助、温和提示 |
| radius-sheet | 48rpx 48rpx 0 0 | 边缘 sheet，仅顶部 |
| radius-pill | 999rpx | 仅状态/筛选/紧凑值 |

分组优先顺序：先用间距，再用表面明度差，再用 1rpx 边界；只有浮层、临时拖起面和需与滚动内容脱离的元素使用阴影。禁止“每组一个卡片”。

### 4.3 边界与高程

- 普通边界 1rpx；选中/关键边界 2rpx。触摸点击不留下持续焦点框；文本输入以光标与 1rpx 浅色调变化表示正在编辑。只有外接键盘、桌面小程序或辅助键盘触发 `:focus-visible` 时，才在可见表面内侧使用单一 4rpx 等效下边缘/局部边缘，禁止完整深蓝框、外偏移、双框、光晕、命中盒描边或几何变化；`pointer: coarse` 下不持久显示。
- elevation-0：无阴影，默认。
- elevation-1：`0 4rpx 16rpx #282B2912`，仅 sticky 控件/浮起行动栏。
- elevation-2：`0 16rpx 48rpx #282B2920`，仅 sheet/dialog。
- 夜间阴影降低可见度并依赖边界；观测模式禁止阴影光晕，以暖红边界区分层级。

### 4.4 移动基线 → Starward 应用

| 场景 | Starward 应用 | 可见表面 | 命中与组合 |
|---|---|---:|---|
| 最终承诺 | 提交、确认加入计划；每个页面决策层只保留一个 meteor 主动作 | 92–96rpx，15px/21px，500；可按页面宽度展开 | 本体即 ≥88rpx；不与同级实心按钮并列 |
| 普通动作 | 查看证据、重试、保存调整、导航 | 68–72rpx，13px/19px，500；按内容收缩 | 外层目标 ≥88rpx；不伪装成最终 CTA |
| 重复选择 | Checkbox/Radio 的紧凑外观、Choice Bar 值 | 56–60rpx，12px/17–18px，500 | 88rpx 行/单元命中；相邻扩展区不重叠 |
| 图标 / 安静动作 | 更多、关闭、稍后、展开 | 56–60rpx 表面或无填充；36–40rpx 图标 | 88rpx 命中；必须有名称，安静于 selected；键盘焦点另走 fallback |
| 分组容器 | 普通内容靠留白、字级和分隔线；恢复/权限才用 friendly panel | 8/16rpx 节奏，32rpx 移动边距 | 矩阵、轨与带共享轴，不把每项包成卡片 |
| 决策 / 不确定性 | 结论 → 影响/行动 → 证据；新鲜度贴近受影响证据 | 明亮语义边缘 + 短因果动效 | 活力不依赖大字、深蓝板、过量 padding、渐变、光晕或装饰流星 |

基线依据只用于原则与结构翻译，不复制品牌视觉、页面编排或把任何单一平台数值当作 Starward 的普遍答案：WeUI/TDesign 的紧凑小程序动作层级用于校准文字与表面占比；Apple/Android 的命中意图用于分离 visible/hit geometry；WCAG 2.4.13 用于校验键盘指示可见性；Android 4/8dp 与 16dp 边距用于移动节奏；WMO/NOAA 的影响优先与不确定性表达用于“判断→影响/行动→证据/新鲜度”；NASA/AMS 的流星黄/绿来源只建立户外身份，不编码科学测量。来源：<https://github.com/Tencent/weui/blob/master/src/style/widget/weui-button/weui-button.less>、<https://tdesign.tencent.com/qq-miniprogram/components/button>、<https://developer.apple.com/design/human-interface-guidelines/buttons>、<https://developer.android.com/guide/topics/ui/accessibility/views/apps-views>、<https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html>、<https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure>、<https://developer.android.com/design/ui/mobile/guides/layout-and-content/grids-and-units>、<https://wmo.int/media/news/impact-based-forecasting-informs-anticipatory-action>、<https://repository.library.noaa.gov/view/noaa/69977>、<https://www.nasa.gov/blogs/watch-the-skies/2023/12/05/gorgeously-green-geminids-peak-next-week/>、<https://www.amsmeteors.org/fireballs/faqf/>。

### 4.5 八轴实践矩阵

这张矩阵是候选的耐久设计上下文。跨平台基线只定义可迁移原则；Starward 列把原则翻译为户外观星决策界面；Do not 列用于评审时 fail closed。

| 轴 | 跨平台基线 | Starward 户外 / 天文决策应用 | Do not |
|---|---|---|---|
| Layout 布局 | 320/375/390/430px 按内容优先级 reflow；200% 文本时重排而非缩放整页 | 结论、影响/行动、证据按纵向优先级连续；共享时间轴的标签列固定、数据列局部滚动 | 不按单一 390px 截图等比缩放；不让技术表制造页面级横滚 |
| Whitespace / density 留白密度 | 16px 移动边距；4/8px 节奏；屏幕、组间、组件内部、视觉重量四层分别控制 | 相关项 4–8px、普通组 8–12px；文字/图标/thumb 不贴边，先用隐式留白分组 | 不把 24–32px 当日常卡片 padding；不留空白列，也不把内容塞满模拟“紧凑” |
| Type hierarchy 字体层级 | 尺寸、字重、行高、间距和少量语义色共同建立层级 | 正文 14–15/22–24、ordinary 13/19、compact 12/17–18；400/500/600 三档 | 不用全局粗黑、追踪大写、中文加字距或等宽导航；不全局机械缩放 |
| Color 色彩 | 中性承担大面积；强调色按语义和局部焦点使用；状态不得只靠颜色 | sky=时间/选择，meteor=最终承诺/天象/稀缺窗口，trail=路线/机会，risk=风险；局部最多两强调色 + 必要 risk | 不以深蓝覆盖标题、边框和容器；不把语义色做成彩虹指标墙；不在亮 common 上习惯性用白字 |
| Cards / containment 卡片容纳 | 留白、字级、分隔线是默认容纳；卡片只包一个可独立识别的对象 | 重复事实使用行/带/矩阵；长卡可容纳一个观星点对象并用内部分隔行组织 | 不嵌套卡片；不把每个状态/指标/选择做成卡；卡内不放多个竞争 CTA |
| Buttons / actions 按钮动作 | 命中区至少 44px；可见面可更小但扩展区不重叠；一个局部主动作 | compact 28–30px、ordinary 34–36px、final 46–48px；只有最终承诺可全宽并使用 meteor | 不把每个按钮都做 44/48px 实心大面；不让普通重试/导航看起来像提交 |
| Visual focus 视觉焦点 | 触摸反馈、编辑态与键盘焦点分流；pressed/selected/disabled 各自有语义 | touch=80ms press 后恢复；input=光标+1px 浅变化；keyboard=`:focus-visible` 内侧下边缘 | 不把焦点当普通移动状态展出；不用完整深蓝框、offset 外环、双框、光晕或命中盒描边 |
| Mobile adaptation 移动适配 | 触控、键盘、读屏、长标签、安全区和 200% 文本一起验证 | inline search 紧邻被筛选集合；建议行/clear/choice row 均 ≥44px；sheet 动作避让底部安全区 | 不以隐藏、裁切或压缩表格通过窄屏；不把桌面栏位仅缩小后塞进 320px |

## 5. 布局、平台与可访问性

- 以 750rpx 设计宽度映射：375 CSS px = 750rpx；320/390/430px 等效视口必须重排而非缩放整页。
- 320px：32rpx 页边距；压缩列间距，时间轨允许横向手势但整页不得横滚；优先显示结论、主窗口和主要行动。
- 375/390px：标准单列，技术矩阵使用固定标签列 + 可滚动时间列。
- 430px：增加页面边距，不无限拉宽单元；内容最大阅读宽度 820rpx。
- 每个触控目标至少 88rpx；重复选择可见 56–60rpx、普通动作 68–72rpx、最终承诺 92–96rpx；扩展命中区不得重叠，相邻目标可见间距至少 8rpx。
- 顶部内容避让微信菜单胶囊与 `env(safe-area-inset-top)`；底部主操作/导航加 `env(safe-area-inset-bottom)`。
- 键盘：所有交互可 Tab 到达；Choice Bar 支持方向键/Home/End；Escape 关闭 sheet/dialog；Enter/Space 激活。
- 状态：pressed/active 用 80ms 轻微 tonal/边界变化与 scale .985，抬起即恢复；selected 使用 soft 语义底 + 单一移动指示 + 程序状态。触摸不留下持续焦点；文本编辑态只用光标与 1rpx 浅变化；外接键盘/桌面/辅助键盘的 `:focus-visible` 使用组件内侧下边缘并与相邻颜色 ≥3:1；hover 仅供文档浏览器且弱于 selected；disabled 保持可读且不似选中。
- 屏幕阅读器：数据带提供可读摘要和表格语义；状态变化使用适度 `aria-live="polite"`；错误与字段通过 `aria-describedby` 关联。
- 放大文本至 200% 时不得截断；长标签换行，数据值可保持一行但标签列加宽或转为上下结构。
- 不以色彩单独表达 live/partial/stale/offline；状态词必须可见。
- `prefers-reduced-motion` 下禁用位移/缩放，保留即时状态切换和焦点反馈。

## 6. 领域组件合同

以下组件不重排既有信息架构，只规范现有信息的表达。

### 6.1 Decision Summary

- **Anatomy**：状态眉题、结论、置信/数据状态、关键理由、下一步主行动。
- **Hierarchy**：结论先于评分；行动先于证据链接。
- **Variants**：建议、谨慎、不建议；live/partial/stale/offline 可组合。
- **Layout**：顺序固定为建议/状态 → 简短结论 → 影响/时间 → 紧凑证据带；评分与理由整合为 16–20rpx（8–10px）间距的 metric tile/共享带，禁止孤立圆形评分、松散空列或嵌套评分卡。320px 两列紧凑重排，375/390/430px 保持一个连续分组。
- **Color/radius**：结论中性；recommendation 用 trail，time 用 sky，opportunity/window 用 meteor，wet-road risk 才用 risk；评分退居证据带。组件内部按判断区与证据区分组，每个子区最多两种非中性色 + 必要 risk。
- **A11y**：读屏顺序为判断→影响/时间→证据→数据状态；不只读分数。
- **Composition**：最多一个主 CTA；Evidence Disclosure 紧随其后但为次级。

### 6.2 Primary / Backup Observing Window

- **Anatomy**：主/备标签、开始结束时间、持续时长、窗口依据、状态。
- **Variants**：primary、backup、unavailable、partial。
- **Layout**：同一时间轴上下两条 band，共享列宽；主窗口视觉权重高一档。
- **Color/radius**：primary 用 sky，celestial scarcity 可加 meteor；radius-band 8rpx。
- **A11y**：文本完整读出“主窗口 21:40–23:10，持续 1 小时 30 分”；图形标 `aria-hidden`。
- **Composition**：不得拆成两张独立卡；备选必须紧邻主窗口。

### 6.3 Risk Strip

- **Anatomy**：风险图标、明确标题、影响、可执行缓解动作。
- **Variants**：notice、warning、blocker、resolved。
- **Layout**：整宽条带；多风险按严重度纵向排列，不横向塞入小 chip。
- **Color/radius**：risk 仅用于图标/边界/阻断词；背景保持语义 soft 色；8rpx。
- **A11y**：`role="status"` 或阻断时 `role="alert"`；不得只显示叹号。
- **Composition**：位于主行动前，阻断时主按钮同步 disabled 并说明原因。

### 6.4 Time Rail

- **Anatomy**：固定指标标签列、等宽时间刻度、当前游标、选中窗口、事件节点。
- **Variants**：6/8/12 列、可拖动、只读、partial。
- **Layout**：标签列固定，时间列可横向滚动；所有 Condition Band 共享 grid template。
- **Color/radius**：rail 0–4rpx；游标/选择 sky；事件 meteor。
- **A11y**：拖动器为 slider，暴露当前时间与范围；提供文字摘要替代横向扫描。
- **Composition**：一个页面只有一个主时间轴；所有数据行对齐它。

### 6.5 Condition Band

- **Anatomy**：指标名、单位、时间序列、异常/缺失标记、趋势摘要。
- **Variants**：云量、透明度、视宁度、风、降水等既有指标；live/partial/stale/offline。
- **Layout**：连续行/矩阵，不拆卡；数值右对齐，缺失用短横+“缺”。
- **Color/radius**：中性表面；选中列 sky；良好机会 trail；异常 risk。
- **A11y**：表头与单元格关联；颜色带同时显示数值/符号。
- **Composition**：3–5 条核心行默认展开，其余进入 Evidence Disclosure。

### 6.6 Sun / Moon Event Node

- **Anatomy**：节点、事件名、时间、方向/高度（若已有数据）。
- **Variants**：日落、月升、月落、天文暮光等既有事件。
- **Layout**：锚在共享时间轴上；标签上下交错避免碰撞。
- **Color/radius**：meteor 节点与线；选中使用 sky 边界；键盘焦点仍为组件边缘单一 focus 内指示。
- **A11y**：事件列表作为图形后的文字等价；焦点顺序按时间。
- **Composition**：不以装饰天体图替代真实时间信息。

### 6.7 Route / Elevation Summary

- **Anatomy**：预计到达、路程/海拔信息、路况/步行段、风险、设施。
- **Variants**：primary route、backup、partial、unavailable。
- **Layout**：一条连续摘要 + 可展开细节；海拔用填充面积/折线，不能只有空轮廓。
- **Color/radius**：路线/可行性 trail；风险 risk；20rpx panel 或直接分隔行。
- **A11y**：图表有起终点、最高点和文本摘要；不依赖线色。
- **Composition**：不展示或评价任何地图视觉；可链接到既有路线责任但不重定义。

### 6.8 Provenance / Freshness

- **Anatomy**：数据状态词、更新时间、来源/模型入口、覆盖范围。
- **Variants**：live、partial、stale、offline-cache。
- **Layout**：紧凑行，位于证据模块头或尾；不抢结论层级。
- **Color/radius**：默认中性，状态图标语义着色；pill 仅包状态词。
- **A11y**：相对时间附可访问绝对时间；状态变化礼貌播报。
- **Composition**：任何缺失/旧数据必须和其影响范围同屏。

### 6.9 Partial / Stale / Offline State

- **Anatomy**：状态词、受影响范围、最后更新时间、仍可用内容、恢复动作。
- **Variants**：partial“部分数据”、stale“数据较旧”、offline“离线缓存”、unavailable“暂无数据”。
- **Layout**：局部影响就局部提示；全页影响才使用 friendly panel。
- **Color/radius**：partial 中性+缺口纹理；stale meteor；offline/error risk；32rpx 仅全页恢复。
- **A11y**：图标+词+解释三重编码；恢复按钮有进度与结果播报。
- **Composition**：保留仍可信的信息，不把全页替换为错误屏。

### 6.10 Evidence Disclosure

- **Anatomy**：摘要按钮、展开状态、证据区、来源/新鲜度。
- **Variants**：collapsed、expanded、loading、partial。
- **Layout**：内容原位展开，保持共享时间轴；不弹出二级卡片墙。
- **Color/radius**：中性分隔线；选中 sky；外接键盘 focus-visible 使用局部内侧下边缘；0–8rpx 技术容器。
- **A11y**：按钮同步 `aria-expanded`/`aria-controls`；焦点不跳转。
- **Composition**：结论首屏最多一个证据入口；展开后先核心行再扩展行。

## 7. 通用组件合同

基础目录固定为 **14 个语义家族**。每族必须独立命名、可直接定位，并分别说明 anatomy、variants/states、可见几何、命中几何、无障碍、组合方式与 Do not。领域组件不得替代这些基础家族。

**谱系判定树**：先问“它管理什么状态与职责”，再看形状。提交命令属于 Button；查询拥有 query/suggestion/result 生命周期，属于 Search；独立多选属于 Checkbox，单选属于 Radio，即使两者画成 chip；立即生效的布尔设置才属于 Switch；相关内容/视图的互斥切换属于 Choice Bar，Tabs 与 Segmented 只是其语义子型；重复事实属于 List/Cell，能独立成立的单一对象才属于 Card。不得因圆角、pill 或下划线形状另建家族。

### 7.1 Button / Icon Button

- **Anatomy**：label、可选 leading icon、loading feedback；icon button 只有一个线性图标与可访问名称。
- **Variants / states**：compact choice、ordinary inline、final commit、tonal、outlined、quiet、destructive；default/pressed/selected/loading/disabled；键盘 focus-visible 仅为输入设备 fallback，不作为移动标本常态。
- **Geometry**：compact 56–60rpx、12/17–18、padding 20–24rpx；ordinary 68–72rpx、13/19、padding 28rpx；final 92–96rpx、15/21、padding 40rpx；字距 0；全部命中 ≥88rpx。文字、图标与可见边缘必须保留内部呼吸，不把视觉面撑满命中包装。
- **A11y / composition**：扩展命中区不得重叠；每个局部决策层只保留一个 dominant action，普通动作按内容收缩。
- **Do not**：不把所有动作做成大实心或全宽；不以 white-on-common 作为默认；不把 icon 当唯一关键含义。

### 7.2 Search Field

- **Anatomy**：范围标签、14px query input、16–18px 搜索图标、44px clear target、helper、loading、suggestion/result region。
- **Variants / states**：idle、editing、query、clear、loading、suggestions、result、empty、error，以及 inline scoped/filter search；editing 用光标与 1rpx 浅色调变化，不展示持续“焦点框”状态。
- **Geometry**：text/search input 本体至少 88rpx；suggestion/result row ≥88rpx；紧邻所筛选集合，不脱离上下文。
- **A11y / composition**：永久说明搜索范围；有用 placeholder 不替代 label；listbox/option 或等价列表语义；输入、清除、建议均可键盘操作并播报结果数。
- **Do not**：不做无范围的全局搜索暗示；不把 search 藏进 generic Input；不以空白屏替代 empty/error 说明。

### 7.3 Text Input / Textarea

- **Anatomy**：永久 label、field、value、helper/error、可选字符计数。
- **Variants / states**：text、time、multiline；normal/focus/error/disabled/readonly/loading。
- **Geometry**：单行 input 本体 ≥88rpx；textarea 自然更高；control radius 与 neutral inset border。
- **A11y / composition**：helper/error 通过 aria-describedby 关联，input mode 匹配；200% 文本与长中文 label 可重排。
- **Do not**：不靠 placeholder 充当 label；不通过更小可见输入伪造 44px 命中；不把局部错误升级成整页警告。

### 7.4 Checkbox Group

- **Anatomy**：group label、18–20px box、item label/description、可选计数与 select-all relation。
- **Variants / states**：unchecked、checked、indeterminate、disabled、max-selection feedback、select-all / partial relation；短筛选可使用 check-chip 外观，但状态与 `checkbox` 角色不变。
- **Geometry**：visible box 36–40rpx，整行 target ≥88rpx；每行独立命中且不重叠。
- **A11y / composition**：用于彼此独立的多选；fieldset/legend 或 group label；mixed 使用原生 indeterminate 或 aria-checked=mixed；达到上限时说明为何不可继续。
- **Do not**：不拿 radio/switch 替代独立多选；不因 chip 外观另建状态家族；不只给勾选框本身命中；不在选择上限后静默失效。

### 7.5 Radio Group

- **Anatomy**：group label、radio、item label/description。
- **Variants / states**：unselected、selected、disabled、unavailable explanation；短值可使用 single-choice chip 外观，但状态与 `radio` 角色不变。
- **Geometry**：visible radio 36–40rpx，整行 target ≥88rpx；长标签换行不压缩控件。
- **A11y / composition**：只用于 one-of-many；同组 name/role、方向键与读屏位置提示。
- **Do not**：不用于可同时选择的条件；不用分段控件承载长说明；不让默认项只靠颜色可见。

### 7.6 Switch

- **Anatomy**：setting label、结果说明、track/thumb、当前 on/off 状态。
- **Variants / states**：on、off、disabled、pending confirmation 仅在需要时；键盘 focus-visible 只作为外部输入 fallback。
- **Geometry**：visible track 92×48rpx（46×24px），thumb 40rpx（20px），内边距 4rpx（2px），行程 44rpx（22px）；整行 target ≥88rpx。开启使用 trail，关闭为中性，disabled 降对比；文字区与开关属于同一命中行。
- **A11y / composition**：用于立即生效的二元设置；清楚说明切换结果并同步 aria-checked。
- **Do not**：不把需要提交确认的多步动作做成 switch；不拿它代替 radio；不在危险操作上即时切换。

### 7.7 Choice Bar / View Switcher

- **Anatomy**：2–4 个短 label、共享轨道、单一可移动 selected indicator、对应 value 或 panel。
- **Semantic subtypes**：Tabs 组织相关内容/视图并使用 `tablist/tab/tabpanel`；Segmented 选择局部值或紧密相关子视图并使用 radio 等价语义。二者共享布局与移动指示器 primitive，不共享业务职责。
- **Geometry / motion**：visible 56–60rpx、12/17–18，单元 target ≥88rpx；指示器以 transform 在等分轨道间移动，160ms standard、可中断；reduced motion 立即切换。
- **A11y / composition**：点击与方向键/Home/End 同步 `aria-selected` 或等价 checked 状态、tabindex 与 panel；状态不只靠颜色。
- **Do not**：不容纳长句或过多项；不让每项各自闪现边框；不把 filter chip、导航路由或多选混入 Choice Bar。

### 7.8 List / Cell / Action Row

- **Anatomy**：title、meta/value、leading status、trailing affordance；整行或尾部动作二选一。
- **Variants / states**：informational cell、navigation row、action row、disclosure row；default/selected/expanded/disabled。
- **Geometry**：row target ≥88rpx；靠共享 baseline 与 1rpx divider 组织，可根据内容自然增高。
- **A11y / composition**：整行可点时不得嵌套第二个主动作；disclosure 同步 expanded/controls；列表使用语义列表。
- **Do not**：不把重复事实拆成卡片；不同时让行和尾部按钮执行不同主要动作；不靠箭头猜用途。

### 7.9 Badge / Status Tag

- **Anatomy**：短状态词、可选 shape/icon；必要时紧邻受影响对象。
- **Variants / states**：live、partial、stale、offline、success、risk；badge 与 inline status line。
- **Geometry**：只包短词，10–11px / 15–16px；非交互 badge 不伪装命中区。
- **A11y / composition**：色彩 + 文字/边型共同编码；动态状态按严重度使用 status/alert。
- **Do not**：不只显示色点；不让 badge 承载说明段落；不把每个普通标签做成 pill。

### 7.10 Card / Containment

- **Anatomy**：一个 coherent object 的 heading、content、meta、最多一个局部 action。
- **Variants / states**：content/event card、saved-plan/action card、evidence/freshness card、compact metric/decision tile、full-width 长对象卡；implicit grouping 对照。
- **Geometry**：compact padding 16rpx、normal 24–32rpx、rare hero 40rpx；按职责使用 panel/panel-lg/friendly，而非统一圆角。
- **A11y / composition**：heading 建立区域名；重复密集事实优先 rows/dividers/shared-axis；full-width 长卡只容纳一个“观星点信息”对象，以标题、地点/距离、条件摘要、状态/元数据、一个尾部披露或局部动作组成；卡片可从周围内容独立识别才成立。
- **Do not**：不嵌套卡、不每指标/状态一卡、不放多个竞争 CTA、不用阴影代替信息层级。

### 7.11 Progress / Loading / Skeleton

- **Anatomy**：状态文字、determinate value 或 indeterminate 状态、结构骨架。
- **Variants / states**：progressbar、inline loading、button loading、skeleton、data-arrival。
- **Geometry**：保留最终布局尺寸；进度轨道紧凑；skeleton 对应真实行而非泛化大块。
- **A11y / composition**：aria-busy/progressbar；超过短等待显示文字；数据到达礼貌播报并可被新请求中断。
- **Do not**：不做环境循环装饰、发光或旋转天体；不让 skeleton 改变布局；观测模式只黑/暖红。

### 7.12 Empty / Error / Permission Recovery

- **Anatomy**：发生原因、影响范围、仍可用内容、真实恢复动作。
- **Variants / states**：empty、local error、offline、permission denied/recovery；局部扁平状态与全页 friendly panel。
- **Geometry**：局部状态靠行/带；仅权限或全页恢复可用 friendly 32rpx；动作 ordinary 72rpx 而非默认 final。
- **A11y / composition**：错误关联受影响区域；恢复结果播报；拒绝权限后核心浏览仍可继续。
- **Do not**：不清空仍可信内容；不把每个状态做卡；不提供不存在的恢复按钮或用强迫式主 CTA。

### 7.13 Toast / Snackbar

- **Anatomy**：短结果、可选单一 undo/action、关闭/超时策略。
- **Variants / states**：success、error、offline、undo；单行优先。
- **Geometry**：消息 13px/19px、动作 12px/18px；动作 target ≥88rpx；elevation-1；避让底部安全区与 sticky final action。
- **A11y / composition**：status/alert 按严重度；自动消失可暂停；重复事件合并而不堆叠。
- **Do not**：重要错误不只靠 toast；不放多个动作；不遮挡主导航或最终承诺。

### 7.14 Dialog / Bottom Sheet

- **Anatomy**：title、body、actions；sheet 另有 handle、停靠边与安全区。
- **Variants / states**：dialog confirm、sheet task、open/dragging/loading/error。
- **Geometry**：dialog radius 24rpx、sheet 顶角 48rpx；只在真实浮层使用 elevation-2；动作遵守 ordinary/final 梯级。
- **A11y / composition**：focus trap、Escape/返回关闭、返回触发点；sheet 拖动与按钮语义并存；操作避让安全区。
- **Do not**：不把常规分组画成 sheet/dialog；不新增产品路线；不在浮层中堆卡或并列多个主动作。


## 8. 运动系统

所有运动均由明确操作或数据因果触发，可中断、可反向、无环境循环。基础缓动：standard `cubic-bezier(.2,0,0,1)`，exit `cubic-bezier(.4,0,1,1)`；press 80ms、short 120ms、medium 160ms、long 200ms，只有 sheet 使用 320ms 上限。bounded spring：mass 1、stiffness 420、damping 34、rest delta 0.5；禁止持续弹跳。

| Recipe | Trigger / current → target | Timing | Interruption / reverse | Reduced motion | Haptic | Observation |
|---|---|---|---|---|---|---|
| Press | pointer/key down；scale 1 → .985，抬起 → 1 | 80/120ms standard | 从当前值反向，不排队 | 仅边界/底色即时变化 | 可选 light | 只改暖红明度/边界，无白闪 |
| Selection | 选择变化；旧指示器位置 → 新位置 | 160ms standard | 新选择接管当前 transform | 直接切换+内侧 focus 边界 | 可选 selection | 只用暖红指示器 |
| Expand/collapse | disclosure；0/旧高度 → 实际高度，opacity .6 → 1 | 200ms standard / 160ms exit | 使用当前高度反转 | 内容即时显隐，保留状态图标 | 无 | 不淡入白色内容 |
| Sheet/reveal | 打开；translateY(100%) → 0 | bounded spring，最长 320ms | 拖拽接管 presentation value；可反向关闭 | 即时出现+边界，无 travel | 到达端点可选 light | 黑底暖红边界先于内容出现 |
| Time scrub sync | 拖动时间；游标当前 x → pointer x；相关行同步 | 每帧直接跟手，释放后 120ms settle | 新手势立即接管；不节流造成滞后 | 保持直接跟手，无 settle | 跨关键事件可选 tick | 暖红游标；无其他模式中间帧 |
| Favorite/success | 操作成功；outline → filled/label 已保存 | 160ms standard，单次 | 取消从当前值反向 | 即时图标+文字 | 可选 success | 暖红填充，不发光不爆炸 |
| Loading/data arrival | 请求；skeleton → 真实行 | 最小 120ms crossfade，逐行最大错峰 16ms/总 160ms | 新请求取消旧 transition | 直接替换并播报 | 无 | 只在黑/暖红间切换 |
| Mode change | 用户切换；完整主题 A → B | 先绑定目标 tokens，同帧替换；背景 160ms 仅 day↔night | 新模式接管；不经过第三主题 | 即时替换 | 可选 medium | 切入/离开观测均即时，不做跨色淡化 |

## 9. 语音与内容

语气平静、具体、可执行。先结论，再下一步，证据按需展开；天气与天象有不确定性时直接说明。

- 推荐：“今晚建议出发”“最佳观测窗口 21:40–23:10”“主地点”“备选地点”“预计到达”“路线风险”“数据较旧，部分结论可能变化”。
- 避免：“完美观星”“绝对晴朗”“保证可见”“AI 神奇推荐”“梦幻星海”。
- 状态词固定：`实时`、`部分数据`、`数据较旧`、`离线缓存`、`暂无数据`。
- 演示预览必须写“演示数据”，不得呈现为当前实况。
- 错误说明结构：发生了什么 → 影响什么 → 用户可以做什么。

## 10. 反模式

- 通用渐变、大面积光晕、玻璃拟态、环境粒子、循环流星、装饰 3D 天体。
- 卡片套卡片、每指标一张卡、把所有选项做成 pill。
- 以行政仪表盘密度代替移动决策流。
- 引入第二套重型图标/组件系统。
- 观测模式出现蓝、白、黄、绿、中性灰或模式切换闪屏。
- 状态只靠颜色、图标没有标签、命中区小于 88rpx。
- 任意圆角、所有面板同样软圆、没有语义的阴影。
- 复制 fixture 为“实时”事实，或在本系统内重新定义业务流程。
- 任何地图视觉、地图组件或地图动效评审。

## 11. 与当前 Sky Canvas 语义的精确增量

| 分类 | 变化 |
|---|---|
| Retained 保留 | 结论→行动→证据；day/night/observation 三模式；移动优先；8rpx 基线；非地图页面职责；克制、可信、户外语气 |
| Clarified 澄清 | 日间以暖日光中性画布、白色/微染表面和炭黑文字为主；夜间使用低色度近黑；sky、meteor、trail 是三个明亮且职责独立的家族；观测模式独立编写；状态必须非颜色编码 |
| Added 新增 | 四层留白与视觉占用率；56–60/68–72/92–96rpx 可见梯级与 ≥88rpx 非重叠命中区分离；Noto-first native CJK 400/500/600 层级；八轴实践矩阵；14 个语义基础家族；Checkbox/Radio 外观 chip 映射；Choice Bar 移动指示器；92×48rpx 纤细 Switch；full-width 长对象卡；触摸/键盘焦点分流；可中断 motion 与 reduced-motion 替代 |
| Deprecated 弃用 | 企业深蓝/全局靛蓝化；所有动作统一 80rpx、普通按钮默认全宽；偏移外焦点环/双框；孤立圆形评分与 Decision Summary 空列；粗重行政标题与 tracked uppercase/mono 导航；24–32px 常规内边距；厚暗边框、淡蓝卡片墙、任意软圆；每指标或每状态一卡；循环 loading 装饰；模式跨色淡化 |
| Unchanged 明确不变 | 产品路线/状态责任、评分算法、数据来源权威、地图相关全部权威、原生 App、运营端、正式采用流程 |

## 12. 投射与审查

- `tokens.scss`：Taro/React/SCSS 候选合同；模式由根节点 `data-theme` 或等价状态切换。
- `colors_and_type.css`：浏览器预览镜像，不是第二权威；值须与 SCSS 同步。
- `index.html`：候选入口；`preview/`：非地图代表场景。
- 任何进入生产的实现都必须重新验证真实字体、微信系统控件、设备安全区、屏幕阅读器、放大文字、低性能设备运动和真实数据边界。

此候选只供审查。除非后续存在明确的选择与 authority closure 更新，否则不得把本文描述为“当前设计系统”或“已符合生产”。
