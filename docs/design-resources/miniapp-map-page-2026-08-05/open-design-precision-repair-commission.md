# Open Design 精度修复委托：地图页最小充分资源集

这是一次受限的最终精度修复，不是重新设计，也不是扩展资源套件。

项目：`starward-miniapp-map-page-2026-08-05`

设计系统：必须继续绑定并服从 `user:soft-instruments`。现有 `source-index.md`、`open-design-commission.md` 与 `open-design-handoff-coverage-commission.md` 仍是本次修改的来源与范围边界。

## 范围与禁止事项

- 只允许修改现有三个文件：`index.html`、`component-control-atlas.html`、`interaction-motion-accessibility.html`。
- 不修改 `page-anatomy.html`。
- 不创建任何新设计资源、页面、图库、说明文档或 handoff。
- 不改写既有页面结构、20 个页面情景、三种视觉模式、状态含义、示例点名称、路线降级语义、动效时序或候选/示例标记。
- 资源仍是未采纳、task-local 的地图页候选；不是生产代码、微信真机证明或 Product Surface。

## 精确修复 1：`index.html` 的触控目标与按下反馈

现状：地图页的 `.icon-button`、`.search-trigger`、`.chip`、`.nav-item`、`.secondary-action` 等 44px 控件在 `:active` 时对整个控件应用 `transform: scale(.985)`；`.button.primary:active` 也缩放整个按钮。这会让浏览器可观察的目标边界低于 44px，并与地图页控件“只改 surface/tint、不缩放整个控件”的规则冲突。

修复：

1. 删除 `index.html` 中所有会缩小完整可点击控件边界的 `transform: scale(...)`。
2. 保留同帧按下反馈，但只通过表面、描边或 tint 变化表达；保持既有 80ms/≤100ms 反馈语义。
3. 任一基础为 44×44px 或 44px 高的控件在默认、按下、选中、焦点、disabled 状态下，其拥有的可点击/可聚焦目标边界均不得小于 44×44px。
4. 不改变标记选中态用于表达选择的尺寸变化；这里限制的是按下时缩放完整触控目标。

## 精确修复 2：`component-control-atlas.html` 的按下样本与卡片主操作

现状 A：`.control.pressed,.chip.pressed` 缩放完整 44px 目标，浏览器测得约 43.34px。

修复 A：移除这些地图页控件样本的完整目标缩放；用 surface/tint/边框表达按下，同时保留目标边界至少 44×44px。

现状 B：选中点位卡分组的规格文字声明 `查看详情` 是唯一主操作，但所有卡片样本都没有直接显示该按钮。

修复 B：在至少一个正常点位卡样本中直接画出可检查的卡片操作区，并明确显示：

- `查看详情`：该层唯一 primary action，拥有目标至少 44px 高；
- 如同时显示 `回到点位`，它必须是 secondary，不得形成第二个主操作；
- 操作区在 320/375/430 宽度和大字情况下可换行/重排，不横向溢出，CTA 仍可达；
- 保持卡片无嵌套 elevation、值/单位分离、未知不写成零、媒体仍明确标 `实景待补 · 示例`。

模式切换必须继续使用 `.mode-switch button[data-mode]`，且三枚按钮始终恰好一枚 `aria-pressed="true"`。

## 精确修复 3：`interaction-motion-accessibility.html` 的坐标真实性边界

现状：共享状态快照包含 `trial-region / 121.48, 31.14（视觉示意）`。即使标了视觉示意，这组形式逼真的经纬度仍会被误读为真实地点数据，并违背本委托“无真实坐标”的边界。

修复：

- 将其改为不含任何经纬度数字的非坐标标识，例如 `trial-region / region-center（视觉示意）`。
- 页面中不得保留 `121.48`、`31.14` 或其他看似可定位的经纬度对。
- 不改变 center/zoom/viewport/filters/layer/selectedSpot/route/search draft/pending safe work 的状态恢复实验语义。
- 模式切换必须继续保证三枚模式按钮恰好一枚 `aria-pressed="true"`。

## 完成前自检

对三个修改后的现有文件进行本地预览/静态检查，确认：

- HTML/内联脚本无语法错误，无外部网络依赖；
- 没有新增文件；`page-anatomy.html` 未修改；
- 320/375/430 宽度不出现页面级横向溢出；
- 所有相关 44px 控件在按下样本/按下 CSS 后仍有至少 44×44px 的目标边界；
- 组件图谱中可直接看到 `查看详情` 主操作，不需要从别的资源推断；
- 交互资源不再含真实式经纬度；
- 三种模式、20 个页面情景、候选/示例标签与所有既有行为保持。

完成后只报告修改了哪些现有文件和自检结果，不生成 handoff 文本。
