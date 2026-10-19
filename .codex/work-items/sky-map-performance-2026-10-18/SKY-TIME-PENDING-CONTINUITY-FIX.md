# Sky 跨窗口等待时保留当前有效天空

2026-10-19，`fix_crossday_pending_continuity`。状态：**源码修复、相关离线验证及[独审](SKY-TIME-PENDING-CONTINUITY-REVIEW.md)通过；完整候选和手机确认仍待 root 完成**。复用当前 PLAN、[R8 时间交互实际证据](R17-A1-R8-TIME-INTERACTION-RESULT.md)与既有性能方法，不重开方案审查。修复基线 HEAD 为 `3818b44009d53d4b27cb16a95904c42ed3723af7`，分支未改变。

R8 已观察到：19日10:00白昼预览切前一日10:00，等待供给时短暂退回04:30夜景，再进入新白昼。`requestedAt` 本身正确；原页面在 `presentSkyTime(requestedAt)` 为空时重新推导 `committedAt`，同时改变绘制和资源需求。这违反 [Sky 合同](../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)的“等待/失败保有效已绘天空并标出实际已绘时刻”。

修复仍由 `sky-time-presentation` 选择一份共享呈现。先用当前请求的有效几何；目标暂不可用且仍在预览时，复用同一原生 accepted writer 发布的当前输入；取消优先回已提交时刻。`SkyTimePresentation` 携带其原报告与实际 model，完整原生帧同时携带这份输入。已取得的 fine-target 供给在进入 accepted writer 前归入同一输入，因此等待时不会丢掉独立有效的目标。BSC/SAO、太阳系、影像与 draw 继续消费同一个 `geometryReport` / `row.at`。位置和已绘位置的算法身份来自对应的实际呈现 model。

页面用报告引用、Context/time binding、已提交时刻、模式、原生代、可见性/资源资格和失败状态生成短期 scope 票据；它沿原有 frame request、`sameScene` 和 accepted publication 传递。报告/Context/模式切走后再切回，也不能复活被撤销的旧输入。当前值检查同时保留原生代、实际接受时刻和报告 Context 核对。这里只保当前 accepted 输入及其必要元数据，没有帧历史缓存、第二个时间 writer、计时器、请求策略或资源预算变化。

`timeGeometryReady` 只由当前请求的几何确定；保留旧天空不会使新目标可播放或使新尺窗假就绪。可见状态仍沿 `acceptedClockAt` 和 `skyTimePreviewStatus` 区分实际已绘、等待与失败。Apply guard 未新增 geometry-ready 限制；它原有的 Context/可见性/当前时刻等 guard 保持不变，本文不声称此前已有 ready guard。

离线证据：最初新增真实页面选择链反例，在修改生产源码前实际断言失败：实际 `2026-09-30T14:00:00.000Z`（承诺夜间），预期 `2026-10-01T02:00:17.123Z`（已接受白昼）。这不是缺符号或环境失败。修后同一语义断言通过。当前现有 fixture 还覆盖 pending/failed 保白昼、完整 fine-target 保留、新供给接管但未接受前不冒已绘、取消后迟到供给、报告/Context/模式/原生代/隐藏失效，以及 A→B→A 不能复活。它执行生产页面的选择、真实 draw request 参数和五类实际 timed resource 参数，不模拟原生像素或延迟。

最终受影响的12个现有测试文件 **133/133 通过**；Miniapp TypeScript **5.9.3 `--noEmit` 0错误**；精确范围 `git diff --check` 通过（仅已有换行提示）。用例维护仅更新已有源码提取 fixture 和共享受控 Canvas 缺省输入，未弱化行为断言。准确命令、逐文件 SHA256 和边界见 [JSON](SKY-TIME-PENDING-CONTINUITY-FIX.json)。没有编译、预览、操作设备/ADB/IDE/feedback、服务、账号、存储或 Git 提交；其余 dirty 成果保留。

下一候选的 task probe 尚需 root 适配：`scripts/build-r17-normal-baseline-v3.mjs` 的 `same_time_memo` 锚仍匹配旧 `timePresentation` 表达式。新计算责任是 `requestedTimePresentation`；计量应记录实际新准备，保留 `selectSkyTimePresentation` 的复用结果，不把 accepted fallback 重新计为新准备。本 agent 未修改 builder，也未将旧 r9 现场当成本修复的手机结果。随后需独审及一次同候选真实跨日等待/取消确认；完整 A/B、Apply/持久化及 Goal 其他义务不由这些软件检查关闭。
