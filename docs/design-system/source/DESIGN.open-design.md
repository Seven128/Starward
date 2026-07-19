---
name: "今晚去观星"
category: Brands
surface: web
colors:
  background: "#ffffff"
  surface: "#f7f8fa"
  foreground: "#111111"
  muted: "#6b7280"
  border: "#d9dee7"
  accent: "#1677ff"
  accent-secondary: "#111111"
---

# 今晚去观星

> Category: Brands

> Surface: web

*从黄昏走入星夜*

面向移动端的观星出行决策产品，把今晚是否值得出发、去哪里、何时出发、最佳观测窗口、路线、现场观测与拍摄准备串成一条连续路径。

## Color Palette

| Role | Name | Hex | Usage |
| --- | --- | --- | --- |
| background | 月白 | `#ffffff` | 规划模式页面画布与大面积留白 |
| surface | 薄云 | `#f7f8fa` | 卡片、面板、地图浮层与分组表面 |
| foreground | 夜墨 | `#111111` | 标题、正文与高对比当前状态 |
| muted | 远山灰 | `#6b7280` | 辅助文案、单位、坐标、时间与非选中导航 |
| border | 晨雾线 | `#d9dee7` | 1px 描边、数据网格、分隔线与控件轮廓 |
| accent | 航迹蓝 | `#1677ff` | 主操作、地图路线、选中节点与连续观星时间窗口 |
| accent-secondary | 夜幕锚色 | `#111111` | 高对比筛选、当前地图节点与深色模式结构锚点 |

## Typography
- **Display:** Inter — weights 400, 700 — fallbacks: system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif (用于页面标题、观星结论和关键数字；大数字优先使用 700 字重。)
- **Body:** Inter — weights 400, 700 — fallbacks: system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif (用于界面正文、控件、标签和数据说明；高密度表格依靠对齐与字重而非缩小到不可读。)
- **Mono:** SFMono-Regular — weights 400, 700 — fallbacks: Consolas, Liberation Mono, Menlo, Courier, monospace (仅用于坐标、时间、方位角和专业数据列。)

## Voice & Tone

- **Adjectives:** 可信, 宁静, 精确, 探索, 户外, 智能
- **Tone:** 先给结论，再给下一步行动，最后按需展开专业依据。语气平静、具体、可执行，不夸大确定性；天气与天象存在风险时直接说明不确定性和备选方案。

### Messaging pillars
- 今晚值不值得去：用一句结论和清晰评分降低出发决策成本。
- 下一步怎么走：把地点、时间、路线、风险与装备组织成连续行动链。
- 专业信息按需展开：云量、透明度、视宁度、光污染、月相与模型对比保持可查但不压住首屏结论。

### Vocabulary
- **Use:** 今晚建议出发, 最佳观测窗口, 主地点, 备选地点, 预计到达, 云量, 透明度, 视宁度, 光污染等级, 月相, 日月升落, 路线风险
- **Avoid:** 完美观星, 绝对晴朗, 保证可见, AI 神奇推荐, 赛博宇宙, 梦幻星海, 未经数据支持的肯定结论

## Imagery

- **Style:** 以真实地点实景、地图与天空数据界面为主。规划模式让自然场景和路线成为主视觉；专业模式让时间带、数据矩阵和天体轨迹成为主视觉。
- **Subjects:** 观星地点实景, 地图路线与地点节点, 月相与日月升落, 小时级天气与多层云量, 光污染分布, 望远镜与户外装备
- **Treatment:** 照片保持自然冷色与真实地平线，不叠加大面积滤镜；覆盖信息固定在安全角落并放在实体表面上。地图、路线、天体轨迹统一使用曲线与圆形节点。
- **Avoid:** 无意义星空粒子与持续闪烁, 赛博朋克霓虹堆叠, 大面积玻璃拟态, 脱离截图证据的 Logo 或品牌插画, 把海报包装道具误作产品 UI

## Layout

- **Radius:** 8px
- **Border weight:** 1px
- **Spacing:** 8px baseline grid

### Posture rules
- 移动端优先，以 390×844 为主要视口；所有主要触控区域不小于 44px。
- 第一层先给今晚是否建议出发，第二层给地点、时间、路线和风险，第三层再展开专业数据。
- 地图、地点实景和天空是主视觉；界面表面退后，避免卡片层层嵌套。
- 基础控件使用 8px 圆角和 1px 描边；地图 Bottom Sheet 与大幅内容层可使用 8px 的倍数形成更大容器圆角。
- 地图路线、天体轨迹和时间轴共享曲线、圆形节点与连续窗口语法。
- 地图标记、地点卡和 Bottom Sheet 必须同步选中状态；高浮层提供清晰拖拽把手。
- 专业预报使用连续矩阵、时间带和列对齐，不把每个数据单元拆成独立卡片。
- 固定底部主操作与五项导航保持在安全区内，不遮挡关键内容。
- 夜间观测使用多级深色表面与克制高亮；红光现场模式采用低亮度单色层级，并保持同一信息架构。
- 动效快速、克制、连续：Bottom Sheet 使用自然弹簧，地图与卡片状态同步，时间变化连续更新天空与数据。
- 支持 reduced motion；禁止无意义粒子、持续闪烁和大面积发光。
- 组件套件至少覆盖按钮、卡片、表单、导航、观星结论、观星评分、最佳时间带、地点卡、地图标记、Bottom Sheet、小时预报、行程时间轴、摄影参数与现场控制栏。
