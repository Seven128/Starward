# Starward 微信小程序 · Sky Canvas Field Signal 候选系统

这是一个供审查的、尚未被选择的 Sky Canvas 视觉系统演进候选，服务于《今晚去观星》微信小程序的非地图界面。它不改变当前项目权威，不代表生产实现、采用或合规结论。

## 从哪里开始

打开 `index.html`。它是候选系统的浏览器手册与审查工作台，依次覆盖：

1. 候选身份、范围、基线与标准导航。
2. 设计原则、颜色与模式、字体与图标。
3. 间距与布局、“移动基线 → Starward 应用”、语义圆角、边框与高程。
4. 通用与领域组件、动效、高密度信息与状态。
5. 无障碍与适配、开发接入。
6. 最后的“应用验证”示例。

标准、令牌和组件合同是入口的第一层内容；产品场景不再承担主导航或第一印象。

当前候选采用紧凑移动节奏：320–390 CSS px 等效视口使用 16px 侧边距，并分别管理屏幕/布局、组间节奏、组件内部与视觉重量四层留白。重复选择可见 28–30px，普通动作 34–36px，最终承诺 46–48px；所有交互仍保留至少 44px 的非重叠命中区，可见表面不会为了命中合同而被撑满。日间以暖日光中性画布、白色/微染表面与炭黑文字为主，sky/periwinkle、meteor yellow 与 trail green 是三个明亮且职责独立的语义家族；夜间使用低色度近黑，严格观测模式继续只允许黑与暖红。中文界面使用 Noto Sans SC 优先的无下载本地系统栈，并以 400/500/600 建立层级。

## 规则与令牌

- `DESIGN.md`：本候选唯一规则源，包含八轴实践矩阵、完整组件合同、动效、语气、增量和边界；若候选日后被采用，宿主项目另行更新 authority，本目录不执行采用。
- `tokens.scss`：面向 Taro/React/SCSS 的项目化令牌合同（rpx）。
- `colors_and_type.css`：浏览器预览使用的 CSS 镜像（CSS px）。
- `context/provenance.md` / `.json`：来源、基线与未采用边界。
- `verify.mjs`：检查章节与组件库存、交互绑定、极窄屏全宽/局部滚动契约、外部资源、链接、令牌镜像、观测模式色值和遗留聊天脚手架。

手册中的八轴实践矩阵把 layout、whitespace/density、type、color、containment、actions、focus 与 mobile adaptation 分别写成“跨平台基线 → Starward 场景翻译 → Do not”。基础目录固定为 14 个语义家族：Button/Icon Button、Search、Text Input/Textarea、Checkbox、Radio、Switch、Choice Bar/View Switcher、List/Cell、Badge/Status、Card/Containment、Progress/Loading/Skeleton、Empty/Error/Permission、Toast/Snackbar、Dialog/Bottom Sheet。Chip 是 Checkbox/Radio 的紧凑外观映射；Tabs 与 Segmented 是 Choice Bar 的语义子型并共享单一移动指示器。Card 家族含一个 full-width 长对象卡标本，Switch 使用 46×24px 轨道和 20px thumb。领域组件继续保留 10 个合同，覆盖 Decision Summary、窗口、风险、时间轴、条件带、来源与新鲜度；标本不是业务页面或第二套组件来源。

## 应用验证

以下移动优先页面被保留为组合验证示例，而不是设计系统本体：

- `preview/spot-detail.html`：地点详情，结论、主/备窗口、路线/风险/设施证据与今晚天空入口。
- `preview/spot-night.html`：共享时间轴、条件带、日月事件、证据展开与四种数据状态。
- `preview/contribution.html`：上传、提交、处理、通过与驳回/审核。
- `preview/my-plan-settings.html`：已保存计划、权限恢复、通知与离线恢复。

`preview/foundations.html` 继续保留为历史基础回归预览，但手册中的标准章节取代它作为主要审查入口。所有预览只使用本地 HTML/CSS/JS，不依赖网络资产；地点、时间、评分与天气值均明确标注为演示数据。

## 审查重点

1. 标准、令牌和组件是否先于应用验证，且候选/未采用边界持续可见。
2. 日间是否保持暖中性轻盈，sky / meteor / trail 是否职责清楚且不过量，夜间是否避免企业深蓝，局部是否遵守两种强调色上限。
3. 中文排版是否保持 400/500/600 层级、12–15px 控件角色、紧凑可读行高和长标签适配；文字是否仍有内部呼吸。
4. 按钮 28–30 / 34–36 / 46–48px 可见梯级是否对应场景；所有交互是否仍有 ≥44px 非重叠目标；触摸是否不留持续焦点，文本编辑是否仅有光标/浅 1px 变化，键盘 fallback 是否只用内侧下边缘。
5. Dense data 是否使用共享轴、行、带和矩阵；live / partial / stale / offline / error / permission 是否同时用文字与形状表达。
6. 观测模式是否从首帧到所有状态都只出现纯黑与暖红。
7. 320/375/390/430 CSS px 等效视口、安全区、200% 文本、键盘、读屏与 reduced motion 是否在实现审查中继续验证。

## 边界

本包排除全部地图视觉与地图动效、原生 App、owner-operations/运营端，以及任何业务流程或信息架构重定义。进入外部 Starward 仓库前，必须按项目正式 adoption/authority 流程另行处理。
