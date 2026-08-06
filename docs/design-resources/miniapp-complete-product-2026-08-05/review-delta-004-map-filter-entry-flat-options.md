# MAP-R02 · 筛选入口可发现性与全部条件平铺

Status: `accepted-for-next-candidate / pending-user-review`  
Recorded: `2026-08-06`  
Scope ceiling: 地图页筛选入口、快捷筛选表示、`筛选观星点` Sheet 的条件布局，以及对应的地图结构、组件、交互、响应式和跨页状态说明。  
Iteration intent: 在不改变 MAP-R01 条件语义和标签的前提下修订交互与版式；不回写原始方案，不生成正式 handoff，不修改生产代码。

## 1. User feedback, preserved verbatim

> 地图页，观星点筛选的入口好像有bug，点击的并不是“筛选”？需要你确认下。然后搜索页面里面几个筛选条件现在是每一项都下拉，但实际上每一项的选型就那么多，没必要搞个下拉显示，太呆板了。直接铺出来更好，不过要美观噢。

## 2. Verified current behavior

Playwright 实际点击了当前 MAP-01 默认页上的 `更多 · 3 +`：

- 点击事件正确打开标题为 `筛选观星点` 的 dialog，事件绑定没有打开错误页面。
- 可见入口文字却是 `更多 · 3 +`，没有 `筛选` 文案，也没有可读的筛选图标名称；它被放在 `光害等级 / 驾车时间 / 场地信息` 快捷摘要之后。
- 因此这是明确的入口命名和可发现性缺陷，不是弹层路由绑错。对用户而言，它看起来是“更多”，而不是“筛选”。
- 弹层中 `光害等级 / 遮挡 / 光害方向 / 驾车时间 / 行程信息 / 海拔` 均为逐项展开，只有 `场地信息` 直接显示终端标签；这一点与用户观察一致。

Current source evidence: MAP-01 `renderQuickFilters()` creates `更多` as `#filterTrigger`; the delegated click opens `filterSheet`. `renderFilterSheet()` renders six `.criterion-toggle[aria-expanded]` controls.

## 3. Normalized pending requirement

### 3.1 明确的筛选入口

- 地图搜索框下方提供一个始终可见、可理解的 `筛选` 入口，带 Tier-A 筛选图标和已应用终端条件数量。
- 推荐可见文案：未选择时 `筛选`，有条件时 `筛选 · 3` 或 `筛选` + 数量 badge；不再使用 `更多` 作为唯一入口。
- 入口至少 44×44 CSS px，具有 `aria-label="筛选观星点，已应用 3 项"`、明确 pressed/active 状态和非颜色数量提示。
- 已应用的少量快捷摘要仍可保留在其后，例如 `光害等级 · 4级以下`、`驾车时间 · 2小时内`、`有停车`；它们是摘要/快捷定位，不替代主筛选入口。
- 点击主入口打开完整 Sheet；点击快捷摘要可打开同一 Sheet 并滚动/聚焦相应条件，但不能使用逐项折叠。

### 3.2 三组条件全部平铺

Sheet 保持三组与 MAP-R01 的精确标签：

1. `观星条件`
   - `光害等级`：`2级以下 / 3级以下 / 4级以下 / 5级以下 / 6级以下`
   - `遮挡`：`遮挡面积 50% 以下 / 遮挡面积 30% 以下 / 无遮挡`
   - `光害方向`：`全部无光害 / 西边无光害 / 东北无光害`
2. `观测点`
   - `驾车时间`：`2小时内 / 4小时内 / 6小时内`
   - `行程信息`：`驾车直达 / 公共交通 / 不要徒步 / 不要登山`
   - `海拔`：`1000米以下 / 2000米以下 / 3000米以下 / 4000米以下 / 6000米以下`
3. `场地信息`
   - `有停车 / 有厕所 / 可充电 / 能露营`

所有终端标签进入 Sheet 后立即可见：

- 不使用 accordion、下拉、chevron、`aria-expanded` 或再次点击父项才能看选项。
- 每个条件使用 `条件标题 + 直接换行的标签网格`；标题同时说明单选/多选语义时应简短，不增加重复说明噪声。
- 三个大组使用清晰但克制的卡片/分隔、标题层级和间距；选中标签使用描边/浅填充/勾选组合，不使用高饱和大面积色块。
- 短标签可自适应 2–3 列；长遮挡标签在 320px 使用两列或单列，不能截断或产生文档横向滚动。
- Sheet 自身纵向滚动，标题和底部 `重置 / 应用筛选` 保持可达；不嵌套横向滚动的条件行。

### 3.3 保留 MAP-R01 交互语义

- `光害等级 / 遮挡 / 光害方向 / 驾车时间 / 海拔` 仍为可取消的单选集合。
- `行程信息` 与四个 `场地信息` 仍为多选；`全部无光害` 与方向值互斥。
- Sheet 中编辑的是 draft；`应用筛选` 一次提交并关闭；关闭/返回/取消丢弃未提交更改；`重置` 只清空 draft，应用后才更新地图。
- 终端选中数量不因所有选项平铺而改变；筛选请求仍只在 Apply 时发起，不在标签浏览或 Sheet 滚动时发起。
- 筛选结果为空、数据缺失、数据陈旧和供应商降级继续是不同状态。

## 4. Responsive, motion and accessibility

1. 320/375/430 和大字模式下所有 27 个终端标签均可通过纵向滚动到达；没有裁切、横向溢出或不可达末项。
2. 标签至少 44px 高；长中文允许换行并保持 44px 最小点击区域。
3. 选择反馈 same-frame/`≤100ms`，应用后状态交换 `160ms`；平铺标签不需要展开动画。减少动态时立即或 `≤100ms` 淡变。
4. 每组/条件/标签具有语义名称、组关系、单选或多选状态；状态不只靠颜色。
5. Sheet 关闭后焦点返回 `筛选` 主入口；快捷摘要触发时返回对应摘要。

## 5. Non-global replacement rules

- 不改变 MAP-R01 的三组名称、六个二级条件、27 个终端标签、单选/多选和提交语义。
- 不删除快捷摘要，但不再让 `更多` 承担主筛选入口。
- 不把地图图层 Sheet、搜索结果页或普通地点分支误当筛选 Sheet。
- 不因平铺而在地图首屏直接展示全部 27 个条件；全部条件只在筛选 Sheet 中平铺。
- 不新增第二个筛选 truth 或另一个弹层。

## 6. Resource dispositions

| Resource | Disposition | Reason |
| --- | --- | --- |
| MAP-01 | `new-revision-needed` | 主入口和完整平铺 Sheet 的实际交互原型 |
| MAP-02 | `new-revision-needed` | Sheet anatomy、scroll owner、safe area 和响应式布局改变 |
| MAP-03 | `new-revision-needed` | 筛选入口、平铺组、标签状态与尺寸定义改变 |
| MAP-04 | `new-revision-needed` | 删除展开行为，更新焦点、draft/apply/cancel、motion labs |
| APP-01 | `existing-covered / wording-check` | 流程仍是进入同一筛选 Sheet；无需独立新资源 |
| APP-05/06/07 | `new-revision-needed` | 共享入口、交互与响应式说明必须与 MAP 统一 |
| APP-08 | `existing-covered` | 继续使用已有 Tier-A 筛选图标，无新品牌资产 |

## 7. Reconciliation status

`accepted-for-next-candidate / pending-user-review`。没有最终选定、原始方案回写、formal handoff 或生产实现。

