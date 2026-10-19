# 时间尺 reveal 后的 native 准入修复

2026-10-19；实施者 `fix_r6_native_entry_admission`。当前仅源码/受控异步检查成立，**未构建、未预览、未完成修后真机或独立审查**。root 独占现场，本实现未操作手机、DevTools、feedback、服务、冻结 r6 产物或 Git 提交，未改 PLAN/HANDOFF。

## 实际失败边界

复用最新 PLAN、development/performance 方法、Sky 合同、采用 HTML `5385664345158066168` 的时间及最终 motion 规则、上一轮 native admission 独审和冻结 r6 的 74 项原始事件。采用 HTML SHA 仍为 `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`；未重启方案审查或变更资源。

冻结 r6 的准备态在 600 ms 已读到 561.4222412109375 并准入；642 ms 转 opening、layoutReady=0，但原 ticksVisible 因 positionedIndex 等于当前索引继续为真。662 ms native onScroll 报 0 时 pending 已清，因此不触发复核。1269 ms 再次 geometry read 确认 offset=0，旧 alignment 标记仍使 verify=false，于 1410 ms 发送 animated:true。原片已由另一个 agent 确认第一可辨面板的 04:30 文本与 native noon/afternoon 刻窗不一致；逐帧结果由 R17-A1-R6-ENTRY-RESULT 拥有。

这足以定位软件边界：**准备态一次 offset 回执被跨 reveal 几何边界复用**。它不能区分平台内的 transform、visibility、节点替换等哪种机制导致回零；未声称找到了 WEAPP 内部重挂载原因。视频 PTS 与事件 Date.now 未校准，不计算它们之间的延迟。

## 局部修复

只改 `OrientationTimeRuler` 及现有 window 回归：

- layoutReady 每次换代立即退休旧 revision、pending 和 native 回调；非持拖时同时退休 nativeRows/刻度准入。用单调 revision 区分 ready→opening→ready，即使最终布尔值相同，也不能借旧准入或旧 projection。
- opening 期间刻度不可见。保留整个面板原 `.76→1` 中心 scale/fade；六字段和有界恢复状态继续可用。
- 复用原 surface 自身 transitionEnd 的 layoutReady 边界。它只允许发起新的真实布局读，不能证明 native 稳定或直接显示刻度。新 geometry 成立后，原唯一 native owner 在隐藏状态以 animated:false 定位；当前真实 offset 满足实测轴判据才显示刻度。没有增加固定等待、偏移、timer、polling、第二 writer 或诊断框架。
- row identity 单独变化仍复用有效 cadence/origin；手势/settlement 与 resize 持拖的旧转换保持到该次操作结束。原 ABA、旧 row、hide/unmount、取消及缺值有限重试规则继续保留。endpoint geometry 缺失不可使用准备态 projection 认证，保留可恢复状态，后续正常重试可以显示刻度。

## 检查和反例

`tmp/r6-reveal-admission-countercheck.mts` 将**同三项新业务回归**原样运行，仅在内存中把 component 换成 `526d00ec2b9333951f7b63f1ab40081e22d9584f` 的源码。旧 normalized-LF SHA 严格核为 `d4cd87283e34a54648afbae0db738ee6bea66f52b324fb4ab8a3fc624348ea39`。没有改冻结副本或工作区源码来作 countercheck。

旧版 3/3 按业务断言失败：opening 仍 visible、endpoint 缺几何仍借准备态、ready 反转后迟到 native node 仍写。当前 3/3 通过，并继续检查反转后的缺 geometry 也不可恢复旧投影。该回归为实现者自测，**不是独立审查**。

- window 22/22；相关 native/layout/motion/Sky ruler 与 Map 代表消费者合计 **80/80，0 fail/skip**。命令沿原六组 `node tools/run-node.cjs --import tsx --test`，日志 `tmp/r6-reveal-admission-related-tests.log`。
- 当前 miniapp TypeScript 5.9.3 strict/noEmit exit0、0诊断；日志 `tmp/r6-reveal-admission-strict.log` 为0字节。
- 两个变更文件 `git diff --check` exit0；spot 原 CRLF→LF 警告不当作行为失败。

## 精确源码

| 文件 | 字节 | SHA256 |
| --- | ---: | --- |
| apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx | 245712 | 500743d7992dd5a01cf0470e870611f3323afb7a4e1e72dee653e8e378f5aed4 |
| apps/wechat-miniapp/src/features/sky/orientation-time-ruler-window.test.ts | 36439 | f0b9eeefcee1e34b02aaf3a92569677fa0ff513e90a187d121f28cf952b896bd |

其余 production owner 未改，完整检查/证据 SHA 见同名 JSON。现有 r6 v2 注入所需的原唯一 cancel/`// Preparation` 等文本 anchor 保留；未在本工作中执行 builder 或改 instrumentation。

## 仍需真实结果

新完整候选需观察**第一可见 selected tick 和稳定尾段**，不能以最终 PNG 代替；核 fresh geometry/隐藏定位后 reveal visibility 是否仍引发位置丢失。软件模型不认证 Taro 实际 update/native composition。受影响跨日/取消、慢拖/惯性/重抓与必要 hide/resize 恢复，按现有共同机制和有效证据做定向反馈。A 单次输入、B allocation/正常 Play/paused drain/退出、Terrain 和完整 Goal 其它义务不由本补丁关闭。
