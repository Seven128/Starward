# r23 普通 Sky 输入采集独立审阅

2026-10-21。本审阅只读当前新回执、严格协议和冻结 r23 的实际 producer；没有操作手机、IDE、服务、构建或 Git，没有改产品。现场动作、屏幕身份与地景由 root 的本轮手机记录提供，审阅不以该转述代替数据核验。原件仍在既有私有 collector，本文件不复制设备、账号、Context、位置或绝对时间标识。

## 结论

**这条普通预览采集路线已在当前云观星取得可解析、非空且能改变下一决策的数据。** 本样本足以检查 geometry 过期发起/准入，并把五个已关联输入的首 accepted 等待分段。没有需要退回重采才能解释的协议或时钟错误。

17 次 logical geometry call 都在对应 intent 仍为最新时发起，5 次 hook 准入也都属于当时最新 intent。此前关注的“更新 intent 已到、旧调用才启动”没有在此样本复现；不能扩大为所有操作均已修好。剩余首响应等待已有可调查阶段，不支持继续仅因准备次数多而迁移整个准备/发布 owner。

本样本有实际 BSC 与 SAO 消费，但现场仍有暗星部分加载失败；它不是完整目录成功、全部六字段/正常 Play 验收，更不是无泄漏证据。

## 原件与资格

- 回执 SHA-256：`4eb764bd252aa7a028934d15bf9b6b4eccc5485e6f47d85032c1043a46464648`。落盘格式化 JSON 55,934 B；紧凑 JSON 31,662 B，低于现有 32,768 B 传输上限。collector 的格式化存盘说明了大小差异，没有越界。
- 当前 `validateR17PhoneProbeMetrics` 通过；schema 为 `starward-r20-phone-probe-draw-costs-v1`，`manual-input`、trigger=1、normal、generation=27，source 为 `36fa8bd03e984ab7d042c459579c8a2fd726fc4e8f58b10f6129a61b1b478a2f`。
- 实际计量 15,012 ms，开始边界是合法 `onPreview` 之后、preview intent 发布之前；本轮没有 actualPlay/pause/terminal。它不含触摸到合法回调之前的输入分发等待。
- `Date.now` wall elapsed、标称 1 ms、有效分辨率未知；3,986 次读取，invalid/backward 都是 0。geometry 的全部事件 epoch=0；不能把小于分辨率的成本改成 0，也不能称其线程 CPU 时长。
- FOV 固定 264.3550889449854°；BSC 行 8,404，SAO 行 2,675–2,842，选择 tile 103–105。实际 BSC/SAO submitted 分别 170,737/2,657，accepted objects 分别 142,350/1,280。30 次 Scene 完成、30 次 native copy、1,392 次 GL submission，failedFrames=0，synthetic publication=0。以上是累计工作量，不是独立星体数或 FPS。
- 手机出现过暗星失败；非空 SAO 证明实际消费者执行，不证明所有 selected tile 成功。`scene.modes=DAY` 也不能单独证明可见画面的昼夜状态。

## geometry 的完整事件结论

60 个事件均保留；17 intents、17 calls、13 validated fulfillment、4 abort、4 rejection、5 current hook assignment。dropped/exportOmitted/invalid/omittedRequests/unmatchedAdmissions/pendingAtStop/responseRotations/windowMisses/ambiguousResponses 均为 0，overflow=false。

按事件顺序找到每个 call 前最新的 intent，17/17 都相符；call 时信号均为 live。5/5 准入也与最新 intent 相符。4 次 abort 都随后有 rejection，无挂起。13 次客户端验证完成中，7 次完成时已被后续 intent 取代，均未进入 hook；另 1 次完成时仍 current，但在下一 intent 前没有 hook 准入，不能虚构其消耗或丢弃原因。

call→validated 是客户端、传输、服务和验证的合并墙钟区间，不是纯网络时间；logical call 数也不自动等于真实 HTTP 请求数。producer 在 `getSkyGeometryWindow` 的验证后 Promise 记录 fulfillment，在 `demandCurrent()` 保护下记录 hook 准入，以上解释与实际放置点一致。

## 五条已关联响应及下一决策

以下单位均为 ms，按同一记录时钟与实际事件关联。相等时间戳只表示分辨率不足，不当作零成本。

| Intent | intent→call | call→validated | validated→hook | prepare 完成→paint 进入 | paint 进入→accepted | intent→首个已关联 accepted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 12 | 195 | 5 | 23 | 51 | 289 |
| 5 | 20 | 25 | 3 | 38 | 41 | 128 |
| 12 | 19 | 31 | 4 | 46 | 36 | 137 |
| 15 | 20 | 33 | 3 | 13 | 42 | 111 |
| 17 | 28 | 49 | 37 | 54 | 40 | 209 |

已关联 first accepted p50=137 ms、max/p95=289 ms，12 个 intent 在首次关联接受前被后续输入取代；没有关联到已 superseded intent 的首次接受。最终 intent 的已关联接受在 209 ms，最后 requested 与 accepted 时刻相符。不能把未关联帧也套入这组分布。

最终 intent 的完整已保留链是：intent 2005 → logical call 2033 → validated 2082 → hook 2119 → prepare 完成 2120 → renderer request 2135 → paint 2174 → accepted 2214。剩余等待包括供给前/供给中、validated→hook 的 37 ms、request→paint 的 39 ms及 paint→accepted 的 40 ms。Page 在 request 时 pending=1、paint 时 pending=0 只是同时观测的状态，**不证明 setData、React 或特定 payload 是这些等待的原因**。

当前30次 draw 的墙钟总量 838 ms、p50=24 ms、p95=51 ms、max=69 ms。五条首接受链中 paint→accepted 为36–51 ms，绘制责任值得结合既有CPU/r7源码证据继续定位。`starTraversal`/`rendererSubmit` 嵌套在 draw 内，不能相加为CPU/GPU互斥分解。

22 份准备中 17 份未消费，但其 known subtotal 只有 1 ms，另外16份低于分辨率；这不支持仅凭17这个计数做调度/状态架构改写。首次请求的195 ms与后续阶段的比例不同，也不应把所有延迟统称网络问题。

## 覆盖限制

- geometry 事件完整，与全部渲染 intent 关联完整是两件事：36 个 renderer request 中14个无 preparation/intent 关联，30个 accepted 中10个为 unknownAcceptedFrames。五条已关联链有用，但不是30帧的全链路分解；不能补造这些未知帧的 intent 或首次接受时间。
- linkage 的22条准备记录均保留，且无身份轮换；A correlation 的逐条明细只留首4末4（8/22，`linkSampleTruncated=true`）。它的汇总包含全部已保留准备，具体 renderer-request 时间仅能联结表中 intent 1/15/17；intent 5/12 的明细缺口仍保留。
- 本次真实合法输入跨度约2秒，15秒是计量覆盖，不能把15秒当持续操作时长。普通调试开关仍为 true，结果只覆盖该条件。SAO行数在变化且存在部分加载失败，不能与另一候选直接作同条件净收益结论。
- accepted 是当前显示/选取/名称发布责任，非物理屏幕 present；没有目标 CPU 栈、全量 JS 保留链、native/GPU 生命周期或持续Play/退出内存证据。本路线对 A 的具体问题可用，不替代 B 的未答问题。

审阅依据：[当前采集说明](R24-SKY-OBSERVATION-READINESS-20261021.md)、[当前严格协议](scripts/r17-normal-input-protocol.mjs)、[collector](scripts/r17-phone-probe-collector.mjs)，以及冻结 r23 中 `use-sky-time-geometry.ts`、`r17-geometry-stage-runtime.ts`、`r17-phone-probe-runtime.ts`、`r17-phone-probe-controls.tsx`、`spot-sky-page.tsx` 的实际记录位置。没有追加重采/测试矩阵。
