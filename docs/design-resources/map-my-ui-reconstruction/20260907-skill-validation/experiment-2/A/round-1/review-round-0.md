# A 组 round-0 实图审阅与 round-1 修订

已逐张实际查看 `round-0/e2-A-1-map.png`、`e2-A-1-my.png`、`e2-A-2-map.png`、`e2-A-2-my.png`、`e2-A-3-map.png`、`e2-A-3-my.png`。六张均存在严重可读性失败，不能作为可接受设计。

## 实图发现与根因

- A1 地图：概览定位栏与开放、设施、资料入口重叠；天气数值与月光/时效重叠。我的：账户、计划与反馈互相覆盖，浅色计划表面被压成细条。
- A2 地图：身份、定位栏以及开放/设施字段轴叠在一起。我的：日期侧栏、计划和反馈互相覆盖，共享表面不再反映分组。
- A3 地图：开放设施带塌缩，标题和内容覆盖。我的：双列工具组与主页链接/导入重叠，无法判断分组与主次。

真实 JSON 提供了明确的测量证据：A1 `Access summary` HORIZONTAL 高度仅 1px；`Shared objective weather metrics` 高度 20px（仅等于上下 padding）；A1 我的 `Compact account header` 高度 1px，`Tonight plan` 高度 20px，而其 `Plan information` 子栈实际高 67px、y=-23.5。它们证明工程布局规则错误，不是字号本身造成，也不能以“更高密度”合理化。

根因是通用 stack helper 对所有轴均设置 primary AUTO / counter FIXED。这个组合用于纵向时正确，用于横向则将宽度自动化、高度固定在最初 1px。子内容因 CENTER 对齐而向外溢出，与后续兄弟重叠。

## 本轮精确修复

1. 纵向 stack 保持 primary AUTO、counter FIXED；横向 stack 改为 primary FIXED、counter AUTO。这样既保留提供的内容宽度，也让文字真实行高、图标及 padding 共同决定横向组高度。44px 操作实例和专用固定 44px 章节栏保留固定高度。
2. 删除先前自行绘制的 19:00、20:00、22:00、23:00 刻度。共有 fixture 只提供 21:00，因此 retained document 时间区只创建这个有效切片、固定中心轴和 21:00 标签；不把没有提供的时段伪装成真实离散数据。`available-slices` metadata 明确只有给定帧。真实多切片弧形交互仍未验证。
3. 删除系统区的 wifi-off 图形，避免把未提供的网络状态呈现为离线。

## 视觉判断与字级差异

本轮不再缩小字体。失败稿的 19/26 地点身份相对 14/20 事实有可见主次，但覆盖问题使容器节奏、信息密度和三个方向的差异无法可靠评价。先保留上一稿明确的候选值：标题 19/26 Medium、事实 14/20 Regular、动作 13/19 Medium、辅助 12/18 Regular、章节 15/22 Medium、关键数字 17/24 Medium、图形 16–18px、可见动作面 32px / hit 44px。

与当前生产基线的字级差异仍见 A/rationale.md；round-1 没有新增缩字或整页缩放。修复后每项内容预计会恢复自然占高，不能在未导出时宣称密度或层级已通过。

## 保留范围与下一步

round-0 原脚本、六张失败 PNG 与 JSON 完整保留。本轮仅新增 `round-1/design.js` 和本审阅记录。图片、数据、产品职责、单文档裁切、三动作和两项主导航未改变。脚本通过 `node --check`；等待真实 Figma round-1 导出，再检查是否仍有文字/控制重叠、边界裁切、错误换行和无意义大占高。本记录是具体缺陷审阅，不是自评分通过证明。
