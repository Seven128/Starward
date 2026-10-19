# 时间尺 reveal native 准入独立审查

2026-10-19；审查者 `review_reveal_native_admission`。最终状态：**SOURCE_AND_BOUNDED_BEHAVIOR_REVIEW_PASSED_NATIVE_UNVERIFIED**。初审发现的一个 P2 已由 root 修复并经同一独立反例复核，当前范围内无遗留 P1/P2。本审查限 `526d00ec2b9333951f7b63f1ab40081e22d9584f` 后的局部 reveal 准入修复；没有重审 PLAN，没有操作手机、ADB、DevTools、feedback、服务、构建、Git 提交或冻结候选，没有修改生产代码/回归文件。

## 依据与范围

已读 AGENTS、global/default routing、开发技能及完整 performance-investigation、交互技能、DESIGN 的独立 Mini Program 规则、Sky 现行时间/取消/披露合同、原生 layout/scroll owner 与实际页面消费者。读 `SKY-RULER-REVEAL-NATIVE-ADMISSION-FIX.md/.json` 和 r6 入场独审，实看冻结原片帧 6 中 04:30 文本与 12:00/14:00/16:00 尺窗不符。采用 HTML `5385664345158066168` 的 SHA 独立读回为 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`；核最终 `.76→1`、center center、180ms 覆盖及六字段/取消/显式应用语义。原 `adopted-stitch-render.png` 未在提供目录找到，root 的限定查找也未恢复精确原件；本审查未查看该 PNG，未重渲染或用别的图片替代，不认证完整设计一致性。

原 r6 失败的第一软件边界确为准备态一次准入跨 reveal 被复用：旧 offset 在 opening 后回到 0，声明可见未退休，之后 visible animated correction。新实现取消这一复用、在 endpoint 后重新测量并隐藏定位，方向符合现有 owner；不能把软件检查升级为 WEAPP 呈现通过。

## 已修 P2：render 反转没有退休在途 geometry 回调

初审源码 `spot-sky-page.tsx` SHA `500743d7992dd5a01cf0470e870611f3323afb7a4e1e72dee653e8e378f5aed4`，回归文件 SHA `f0b9eeefcee1e34b02aaf3a92569677fa0ff513e90a187d121f28cf952b896bd`。

`positionLayout` 的 render 分支只取消 nativePosition/pending，并未退休 `createOrientationRulerLayout` 的在途测量。准备态 query 排队后，ready→opening→ready 在 passive effects 前反转；第二次 ready 使原 `canAccept()` 又为真，旧 accept 的 layout revision 仍有效。它能调用最新 `positionResolved`，借旧投影发出新定位并准入 visible，跨越了本次修复要求的几何边界。

独立最小业务反例沿现有 hook/native fixture 执行当前生产组件，不复制作者的三项断言：保留 preparing 的 layout callback，render false→true 后再送达旧 geometry/native node/offset，在 passive effects 前检查。当前实际 **staleWrites=1、visibility=visible**，应为 0/hidden，命令 exit1。原始失败保存为 `tmp/review-reveal-admission-initial-failure.json`，SHA `c846676765fb8740d8282c694054268ef8f29b4e7a60aef5960864c3cf70d494`；脚本 `tmp/review-reveal-admission-independent.mts`。

root 将原 `layoutRef` 提前，在 layoutReady 换代的 render 中调用原 owner `invalidate(settlement.active)`，同步退休 geometry revision、保留持拖转换并标记新测量需求；原 effect 加入 geometry revision 依赖，使 ready→opening→ready 不借最终同一布尔值消失。没有改 layout/scroll/motion 共享 owner 或另加等待机制。

修后原独立反例通过：旧 geometry 不发新 native 写，也不能使尺可见。该真实 guard 反例已由 root 纳入现有 window 回归。独立第三项专门核对新增 invalidate 是否造成无后续测量的死锁：反转后只提交最新待处理 effect 一次，旧 geometry 不写，新 endpoint read 产生唯一 animated=false 的 561.5 定位，实际 current offset 回执后可见，preview/commit 均为 0；通过。初始失败仍保留，未以修后输出覆盖它。

## 最终精确输入与检查

| 文件 | 最终 SHA256 |
| --- | --- |
| apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx | ecb5e51f83a49b3d9fb9c94062f33d9b32bee1d1be6392aea6f095cc0bbd327a |
| apps/wechat-miniapp/src/features/sky/orientation-time-ruler-window.test.ts | f1295f75a55a2ed8f272594ae0327f8015bbf470846982d2ff883d766117b6d1 |

审查者自行运行 `tmp/review-reveal-admission-independent.mts`，最终 **3/3，通过/失败为 3/0**；脚本 SHA `130b7f5a6aa27a397511806bee00e32a9124f0af2ab4e96379f375203b328674`，最终机器结果 SHA `4348da0a4475957852d4530fa7878b7697f053dc1e9b26aa4640f4efa3ec47bd`。复用现有 fixture 作为生产组件及公开 native query 的受控 adapter，断言与时序由本审查独立提出；不是物理渲染模拟或完成证明。

针对本次 reveal gate 与同步 invalidate 的影响，另自行一次运行现有 window、native position、layout 和 motion 四组回归：**46/46、0 fail/skip/cancel**，exit0。完整命令和结果见 `tmp/review-reveal-admission-related.log`，SHA `45f20a59abb37ef54cc7cde4d42006f67c90f682fd3c761d6de94e6b69f5cc11`。两个源码输入在检查后仍为上表相同 SHA；`git diff --check` exit0。既有 CRLF 警告不当业务失败。没有重跑 whole-product 或构建。

另一独立正常路径已通过：opening 中 activeIndex 从 33 变 35，endpoint 实测 cadence 改为 17.25、zero 为 1。改变 scale 期间不写；endpoint 由唯一 native owner 发 604.75、animated=false；旧 offset 不准入，真实 604.75 后可见；领域 preview/commit 均为 0。

已沿 owner 检查 prepare 的 `onEntryReady` 不依赖 endpoint、endpoint 仅允许新测量、缺测一次有界重试与恢复入口、native node/offset revision、row ABA、resize 持拖投影、hide/unmount/取消退休、六字段/时间事务与同窗 Play。作者初版 80/80 与 strict 0 保留自检原范围，不计作本审查的独立通过。没有发现第二时间 writer、effect 定位竞争、新固定等待或持续 query 路径。

## 未完成的目标验证

修后完整候选仍必须实际复核第一可见 selected tick、揭示过程及稳定尾段，尤其 `visibility` 更新本身是否再引起原生位置丢失。终态 PNG、scrollTo 返回、nextTick、一次 offset 或软件 fixture 都不能证明物理呈现；视频 PTS 与手机 Date.now 未校准，不能相减当延迟。受影响的跨日/取消、拖动/重抓与必要 hide/resize 恢复沿原计划和有效证据定向验证。A 单次输入、B allocation/正常 Play/paused drain/退出、Terrain 和完整 Goal 的其它义务均未由此审查关闭。
