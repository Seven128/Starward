# 当前性能结果与数据可信度

2026-10-19。回应用户关于 LAN 失败后切 WAN、Memory 数据是否有效、方法效率和阶段成果的核对。本文件解释结果；当前输入与下一动作仍由 HANDOFF 拥有，不另起方案。

## 连接与采样的结论

已核验的r9观察时，手机关联调试链路真实工作。当前手机已被用户带走，后续优先离线工作。LAN→WAN 是传输通道切换，不是“假连接”，也不是自动从真机调试2.0退回1.0。已结合当前安装实现、目标运行时和实际手机动作核对，不能只凭绿色连接状态判断。

本机 Nightly 2.02.2610092 的自动调试实现设置 `remoteAppservice:true`、`cdpEnabled:true`；连接管理的 LAN 备用 messager 切换不修改执行模式。1.0 fallback 是另一条设备/版本判断路径。当前 GUI 显示 Android 微信8.0.78/基础库3.17.7；同一 appservice 的只读检查返回 android、Map，`document`/`navigator` 均 undefined。此检查仅作执行环境佐证；它与真实手机独有候选标签、同源码的 Play/Pause/Cancel/Map 回执共同支持当前2.0手机逻辑目标的判断，不把单一 platform 字段当证明。

只读结果保存在既有外部 owner 的 `r9-execution-boundary.private.json`，SHA `0b39d439f68c27ea1fc72af8ddbdb1cfe303dcfd49e892db3155902c3267db0d`。未读取 UA 原文、私有调试状态/token、账号存储或调用内部协议；安装代码只读，没有修改工具。

安装源核对：自动调试 `fa16677c860404f2b8451eedb55b7d30.js` SHA `0cc275240db67cb8d04ee9da680417108aa106d1b6b91734abdb96c1d33219e4`；自动编排 `b8f77f13a7be4bccd36c13a15ea56dfb.js` SHA `4ea328a2dd8cfbb8c649d535d4060728d50e8412077934a4da6727ebb73477ce`；连接/模式 owner `a4d0c2f489c9b3e9ca844bf83a0d5ed2.js` SHA `b5f8e04cff9ff7ea01135290b13cc98d3e32f28c5b6922d79445ba719388bf82`。这些是此版本的事实，不是未来版本保证。腾讯官方团队对1.0/2.0执行位置的说明见[真机调试2.0介绍](https://developer.cloud.tencent.com/article/2252805)。

这补充了 [r9独审](R17-A1-R9-PLAY-EXIT-RESULT.md)提出的执行层缺口；不改写其原始数据。r7 的冻结源码/脚本映射与非空 profile 仍有用，但不能用 r9 的新检查倒填 r7 未采字段或未知停止时刻。WAN 会增加调试命令、面板显示及导出等待，host 等待不能计作手机CPU时间。r9观察时勾选工具端Storage，也不能把其回执当作普通手机持久化验收。

## 已经取得的成果

| 用户问题 | 当前有证据的结果 | 尚未完成 |
| --- | --- | --- |
| 时间尺入场错误窗口、回零、文字叠加 | 已修唯一定位及原生表面稳定责任；r8实际捕获的首次可见刻度与04:30一致，提示不重叠；真实拖至10:00、跨日终态、取消回04:30均有审阅 | 不能把有限捕获说成所有物理帧；跨日等待中天空回退另列下行 |
| 跨日等待时白昼突然回到旧夜景 | 已定位为目标供给未到时错误回退 committed；已修为保当前有效 accepted 呈现，draw和资源共用同一输入；133/133、类型检查和独审通过 | r10普通预览实录独审已确认等待保持白昼、取消终态恢复原时刻；完整A/Apply仍保留 |
| 连续拖动卡顿 A | r8一次真实拖动关联49个intent；9个未被后续输入替代的首次accepted为24–70ms，末次30ms。37/38准备被实际消费，不支持凭请求差重写调度 | 软件accepted不是物理呈现延迟或全面流畅验收；后续按实际失败定向处理 |
| 持续播放内存/退出 B | r7有效625样本、982节点已精确映射到恒星变换/绘制和缓存owner；r9正常播放60.015秒、自身暂停、取消及Map退出完成；同surface清理实际回执成立 | 样本是存活分配统计，不是retainer/总churn；60秒调试样本不代表普通预览长期稳定，内存根因及最终B未关闭 |
| 地形两三秒缺口 | r6请求侧长等待与r8文件就绪标记后仍有可见缺口已区分；新桥metadata/实际PNG字节和SHA关联成立 | 手机匿名资产到具体SHA关联及有针对性的修复仍未完成；尚不能称地形提速达标 |

证据入口：[r8入场](R17-A1-R8-ENTRY-RESULT.md)、[r8交互与A](R17-A1-R8-TIME-INTERACTION-RESULT.md)、[跨日修复](SKY-TIME-PENDING-CONTINUITY-FIX.md)、[独审](SKY-TIME-PENDING-CONTINUITY-REVIEW.md)、[r7分配](R17-NORMAL-R7-ALLOCATION-RESULT.md)、[r9播放/退出](R17-A1-R9-PLAY-EXIT-RESULT.md)、[地形](TERRAIN-R8-IDENTITY-ACTION-RESULT.md)。

## 数据能支持到哪里

- Memory分配文件已经验证非空、引用完整、脚本与冻结包一致，可以定位分配来源；不能单靠热点或采样大小宣称泄漏根因。
- 无线ADB的PSS是手机前台Appbrand进程资源数据，与逻辑层JS采样的范围不同。r9首窗PSS增长约303MiB，暂停末31秒变化约0.18MiB，后续窗口下降；不能将两个不齐窗数值相减后命名为native/GPU泄漏。
- 实际截图/录像证明所见操作和输出；内部accepted/copy返回不能代替物理FPS。r9 surface实际缩为1×1并移除选择层，context扩展不可用，不能写成GPU全部释放。

## 方法改进与下一决策

现有开发skill已覆盖当前CPU、输入关联、分配、进程内存、请求/原生呈现边界，路线本身可用。此前执行中对“连通/执行位置/数据适用范围”的说明不够显式，状态文档也让尝试次数掩盖了结果。已在原 performance-investigation reference 补三项窄规则：分别确认transport与执行模式/VM；将WAN命令等待和代理Storage作为观察条件；每轮先说明已解决/已定位/未回答及下一动作，避免为测量本身继续测量。

[r10跨日实际独审](R17-A1-R10-CROSSDAY-RESULT.md)已确认该修复，不重复同一观察。用户携手机离开后，先离线解释[r10普通播放部分证据](R17-A1-R10-ORDINARY-PARTIAL.md)并推进Git/服务交付；B仅在新的有效证据指向具体owner时追加观察，手机必需缺口集中后置。地形按已定位的阶段补关联并选修复，不重跑相同CPU/Allocation资格、恢复gen24或派生相邻disable。完整Goal及其它R/H/A/N义务保持不变。

本次方法仅修改现有reference，入口frontmatter未变，8个本地结果引用、diff检查及现有project-skills四项router/引用检查通过。skill-creator的quick_validate已尝试，系统与bundled Python均缺PyYAML，未将该检查器标为通过；没有为这次文字修改安装额外运行环境。
