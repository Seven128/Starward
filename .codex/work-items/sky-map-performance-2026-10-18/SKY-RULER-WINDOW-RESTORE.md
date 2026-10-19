# Sky 时间尺窗口同步修复

2026-10-19，沿当前 PLAN 的 R17 普通时间消费者修复。生产 owner 为 `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx` 内的 `OrientationTimeRuler`；公共时间、只读 geometry、Apply、页面关闭/隐藏取消仍分别归既有 observation-time/Query/Context/page owner。本记录不修改采用设计或完整 Goal 的剩余义务。

已阅读当前 development/performance 方法、UI skill、Sky Screen Contract 顶部时间要求与 DESIGN 的受影响范围；复用当前采用节点 `5385664345158066168` 的完整 HTML，SHA256 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`。原型的六字段与曲线尺均读同一 draftCivil；本次只修真实供应刻度的位置同步，不重新生成资源或改变视觉几何。

## 观察与已确定原因

实际查看 root 提供的两张 G2RzCu 手机原始截图：`screen-94ea3d2f-1607-4bbb-be9e-83143c65c41a.png` 中选择器为 17 日 04:30、已绘标签为 04:30:00 预览、尺显示约 00–08；取消后的 `screen-cc993afc-9d8a-4319-aa74-9116fa45800d.png` 中日期/已绘恢复 19 日 04:30，中心附近尺却是 12:00–16:00。这是未修复 gen25 的实际失败，不是修复后的手机结果。

离线只读 gen25 原 fixture 的时间字段：48 个 hourly/48 个 model knots，提交瞬间 `2026-10-18T20:30:00.000Z`，其精确 row 存在，索引 33。该次跨日 geometry 的原 body 未捕获；GET 200 和截图不能建立完整输入/effect/原生回调链。因此，下面的软件根因已确认，但不宣称手机这一次取消的所有时序已解释或已修复。

真实生产组件的连续 render 夹具确认了三个相连的问题：

- `rowIdentity` 改变会调用 `cancelInteraction`。它即使没有活动拖动也把位置重置为 committedIndex；跨日窗口不含已提交时刻时，-1 被 clamp 为第 0 格，却没有取消实际时间预览。
- 跟随 activeIndex 的 effect 只依赖数值索引与 rows.length。同长度新窗口恰有相同索引时不会执行；48→49 行即使执行，两个 state 更新合批后可能仍是原 scrollLeft，而最后的 imperative `move(0)` 仍有独立效果。旧 effect 没有对原生位置发出相同目标。
- ruler 的 show 回调无条件命令已提交刻度，可能覆盖页面实际提供的非拖动时刻；组件不应自行决定页面暂停、取消或保留预览的政策。

## 修复及边界

`cancelInteraction` 仅在 settlement 确有活动拖动时按已提交刻度撤回并调用原取消回调；没有活动拖动时按本次真实 activeIndex 同步。active effect 同时依赖 rows 的真实时间身份，并在非拖动时使 declarative scrollLeft 与既有 nativePosition owner 收到同一目标。show 跟随当前 activeIndex；若 page owner 已取消预览，新的 activeIndex 会同步回已提交时刻。

仍由原 settlement 持有拖动/惯性和迟到事件边界。显式取消继续调用同一 observation-time 回调；按钮/松手只选择预览，公共提交继续只由 Apply。没有新增时钟、刻度、节流、计时器或数据请求。native 跟随 effect 不依赖 presentedAt、播放毫秒或 rows 对象引用，只在离散索引/真实窗口身份变化时执行；120 次同刻度播放更新即使传入新 rows 数组也新增 0 次 imperative 命令。窗口边界原有取消 effect 和跟随 effect 可各发一次有界命令，后命令沿既有 revision fence 退休前一个查询。

## 验证

新增 `orientation-time-ruler-window.test.ts` 直接抽取实际生产组件，持久保存 hook slots，按声明顺序提交 changed effects，再批量处理 state 引起的后续 render。它独立观察 declarative scrollLeft 与 imperative 命令；没有用重新创建组件、静态 source regex 或镜像实现代替这次跨 render 问题。该夹具模拟 React 状态/effect 边界，不是实际 React/Taro renderer 或原生 ScrollView。

修前 4 项为 3 failed/1 passed，保存在 `tmp/sky-ruler-window-before.log`：同长度新窗口和 tick 间精确时刻取消均从应有 1122px 变成 0px；非活动 ruler 的生命周期错误从当前 1122px 回到已提交 680px。原拖动主权/迟到 settlement 用例修前已通过。修后新增 48/49 行原生命令与 prop 一致用例，并验证原 48 行精确 committed row 的取消恢复。

修后共 24 项相关检查通过：新跨 render 5 项、既有 ruler 10 项、observation-time 3 项、geometry 1 项，以及 native position/settlement 5 项。它们覆盖同长度窗口切换、精确时间不落 tick、48/49 行切换、显式取消、页面提供取消后的 active/committed 同步、Apply 后 supplied index、同刻度播放不增加命令、活动拖动主权、惯性/迟到事件/查询退休。日志为 `tmp/sky-ruler-window-after.log` 和 `tmp/sky-ruler-native-owner.log`。Mini Program noEmit typecheck exit 0；受影响源码 `git diff --check` exit 0（只有既有 CRLF 规范化提示）。

生产 normalized-LF SHA256：修前 `d43d61e2ed5816719dbd2859472ab5b538a5b8807fd20038cfcf824025cd6740`，修后 `c9f877c68fa0cd3e0320ae0f0153799e169ab23f3f5132f6c737c630d3fb1f53`。仅该生产组件和新回归测试改动；HANDOFF/INDEX 由 root 持有。

## 未验证

本子任务没有操作手机、ADB、DevTools、API、feedback、编译候选或 Git 提交。现有 A1/gen25/H3 产物没有被重建或宣称包含此修复。仍需 root 在同一构建 owner 的后续完整候选中，核对实际 19→18→17→取消的原生时间尺与选择器/已绘时刻、有限拖动/明确应用及生命周期恢复。目标编译、WXML/native ScrollView、真实 effect 调度和正常速度外观未验；软件通过不能关闭手机失败、性能 A/B 或完整 Goal。
