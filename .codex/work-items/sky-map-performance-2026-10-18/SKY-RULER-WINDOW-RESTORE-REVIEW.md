# Sky 时间尺窗口恢复独立审查

2026-10-19；独立审查当前未提交的局部修复，不重审 PLAN，不操作手机、ADB、DevTools、API、feedback、候选构建或 Git 提交。本次只新增本审查文档。

结论：未发现本轮 diff 引入的阻断问题，未提出 P1/P2 修复项。生产修复与软件回归可继续进入 root 持有的同一完整候选构建；这不关闭旧手机失败、目标运行时验证、性能 A/B 或完整 Goal。

## 审查输入与身份

- `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx` 本轮 diff，重点为 `OrientationTimeRuler` 的 781–811 行；连同页面的 supplied rows/index、预览/Apply 和隐藏消费者核对。
- 新 `orientation-time-ruler-window.test.ts`，既有 ruler、observation-time、geometry、scroll-settlement、native position 实现及相关测试。
- `SKY-RULER-WINDOW-RESTORE.md/.json`、原始修前/修后日志；当前 Screen Contract `project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md` 顶部时间约束、DESIGN §6.12、development/UI skills 与 performance-investigation 方法。
- 当前采用 HTML `.codex/work-items/main-integration-2026-10-17/tmp/stitch-5385664345158066168.html`，实际核对 SHA256 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`，读取受影响的时间字段、尺与取消/应用代码。六字段和尺标签共用 `draftCivil`；本 diff 未改采用几何或资源。本审查不认证完整视觉还原。
- 实际查看 `C:/Users/777/AppData/Local/Temp/starward-device-test-G2RzCu/screen-cc993afc-9d8a-4319-aa74-9116fa45800d.png`：字段为 2026-10-19 04:30:00，已绘标签 04:30:00，但可见尺为约 12:00–16:00。它属于未修复的 gen25，不能作修后证据；静态截图不能补齐原生事件与 effect 的全部时序。

审查时生产文件 normalized-LF SHA256 为 `c9f877c68fa0cd3e0320ae0f0153799e169ab23f3f5132f6c737c630d3fb1f53`（raw `5afea619eaef4cc303c0b9486d0187be07d141d22456a051580f679f2265e585`），新测试 SHA256 为 `c045dde854186dd6dbc8645ebb3c2ff3a10089c5c57545bc50e444ce713ff415`，与任务记录一致。

## 状态、effect 与命令责任

`spot-sky-page.tsx:787` 现在仅在 settlement 确有活动拖动时采用 committed index 并撤回时间预览；普通窗口更换或锁变化采用页面供应的 active index。这消除了“没有拖动、没有取消领域预览，却把位置移向不存在的 committed row”的旧行为。窗口身份仍采用真实 `row.at`，不借新数组对象判定窗口变化。

`spot-sky-page.tsx:803` 的原取消 effect 先执行，`:805` 的跟随 effect 后执行。后者在非拖动时把 visual state、declarative `scrollLeft` 与原生位置命令指向相同 active index，并把 `rowIdentity` 纳入依赖。因此同长度、同数值索引的新时间窗口也会跟随；48/49 行切换中，即使 state 合批后的 prop 与前值相等，最后的独立原生命令仍正确。既有 `createRulerScrollPosition` 的 revision fence 会退休较早的异步 node 查询；本次没有新增另一个滚动 writer 或计时器。

在同一有效窗口内，`:806` 的 `settlement.active` 保护保留了 held drag 和惯性期间的位置主权，外部 active index 更新不发抢占命令。窗口/提交边界退休拖动后，既有 settlement 继续阻止迟到 scroll/end/timer 提交；onPreview 和松手 `settleTimeIndex` 仍只改变可取消预览，不写公共 Context。

取消按钮（`:996`）继续退休 settlement、发当前位置恢复命令并调用页面取消；当旧窗口不含 committed row 时，该即时命令可能暂为 clamp 后的零格，随后真实供应窗口/active index 的 effect 必须覆盖它。新回归同时检查 prop 和最后一条原生命令，未把两者视为等价证据。

页面隐藏的领域政策仍由 `hideSkyPage`（`:2322`）决定：PREVIEW 取消，其余按原 observation-time hide/pause；ruler hide 只撤回自己的活动拖动，并立即取消未完成 node 查询。show（`:794`）跟随当前 supplied active index，避免 ruler 自行把页面保留的非拖动时间强行改成 committed index。Apply（`:2503`）仍走原 Context request/accept/failure/continuity 责任；ruler 不代它提交。软件夹具验证 supplied Apply 后索引，不等同于真实公共提交或隐藏生命周期验收。

## 软件验证

独立复跑相关 24 项，全部通过：新跨 render 5 项、既有 ruler 10 项、observation-time 3 项、geometry 1 项、native position/settlement 5 项。未扩大到无关套件；原 noEmit typecheck 的任务结果复用，未重复运行。受影响文件 `git diff --check` exit 0，仅有既有 CRLF 规范化提示。

为确认回归区分能力，在一个临时 Node 进程中用 `git show HEAD:.../spot-sky-page.tsx` 取得修前组件，通过进程内 `readFileSync` 替换向**当前相同测试文件**供应修前组件；没有改源码、测试或候选文件。修前 normalized-LF SHA256 核对为 `d43d61e2ed5816719dbd2859472ab5b538a5b8807fd20038cfcf824025cd6740`。当前 5 项结果为 4 failed/1 passed：新窗口恢复、精确时刻取消、48/49 行原生命令对齐均得到 0 而非 1122px；非活动生命周期得到 680 而非 1122px；原拖动主权/迟到 settlement 用例继续通过。它补充原任务较早 4 项夹具的 3 failed/1 passed 记录，并不覆盖它。

同刻度播放夹具以 120 次新 props/新 rows 数组、相同时间身份和索引驱动实际生产组件，新增原生命令为 0。`rowIdentity` 的 map/join 是既有工作；新 native effect 依赖离散 index/窗口身份，没有因 presentedAt 毫秒变化增发命令。窗口边界可发两条有界命令，后一条退休前一条查询；没有据此声称零总成本、手机流畅度或性能 A/B 已通过。

新夹具实际抽取生产组件、持久保存 hook slots、按声明顺序运行 changed passive effects，并独立观察 native 命令与 prop。它能捕捉这次跨 render 问题，但仍是 React 状态/effect 的有界模拟，不是 Taro/React renderer，也不验证 native ScrollView 接受、动画、物理触控或整张天空。

## 保留的目标验证

修复尚未在手机完整候选中验证。root 仍需沿原构建 owner 将当前生产修复纳入完整 WEAPP 产物，再核对 19→18→17→取消时六字段、实际已绘时刻和原生尺的对齐，以及有限拖动、明确 Apply 和页面隐藏/恢复。原跨日响应 body 未捕获、旧取消片段并未覆盖全部恢复时序，不能补推这一次手机失败的完整因果链。旧 gen25/A1/H3 包与其历史证据不会因本审查被视为包含修复。
