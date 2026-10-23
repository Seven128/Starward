# 当前性能结果与数据可信度

2026-10-19。回应用户关于 LAN 失败后切 WAN、Memory 数据是否有效、方法效率和阶段成果的核对。本文件解释结果；当前输入与下一动作仍由 HANDOFF 拥有，不另起方案。

**2026-10-22当前补充：** [r25实际结果](R25-CHECKPOINT-PHONE-RESULT-20261022.md)及[独审](R25-CHECKPOINT-PHONE-REVIEW-20261022.md)证明全天空高内存条件下阶段记录、提前独立保存和部分对象关系可用；[r26实际结果](R26-OWNER-PHONE-RESULT-20261022.md)进一步取得真实使用关联和两个框架入口，但有限覆盖无匹配、数组限额命中且闭包不可见，最终外层根仍未找到。用户已澄清：采集可用和部分归因已验证，完整工具充分性、OOM修复与产品无泄漏尚未确认；历史“工具目标已满足”不得扩大为已能解决全部根因。PerfDog仅调研，实际组合为Perfetto/ADB、普通预览诊断代码和既有CPU/r7映射。性能分析方法继续复用；最新已确认的叠层优先级和交互合同归PLAN，进度和下一动作只写HANDOFF，本文件拥有各结果的解释范围。

**2026-10-21最新产品结果：** [r21全天空长按独审](R21-HOLD-RESULT.md)只证续帧draw均值29.43→25.04ms，整体未跟手：17intent/7首次accepted/3late，首accepted p50 174ms，不能用draw p50 26ms宣称A完成。已测3个过期geometry请求在更新意图到达后才启动，已沿现Query/current-demand责任修复，并修复快速切走再切回误入约1秒取消重试；本地反例、独审及完整r22构建通过，手机收益尚未验证，不加任意防抖。随后[r21普通播放尝试附近的原生退出](R21-PLAY-EXIT-RESULT.md)已确认SIGABRT/libmmv8与allocation failure，无新Play成本/terminal或retainer。已停止重复压力，保留完整B失败和Memory桌面控制缺口；没有证据把原因归到新缓存。[r20 Play/drain](R20-NORMAL-PLAY-DRAIN-RESULT.md)此前已有高残留，两个watch不串成同进程曲线。[现有32KiB导出修复](R21-BOUNDED-NORMAL-EXPORT-REPAIR.md)已进r21，普通Play实际导出仍因退出未验证。

r20地形跨覆盖西移由[像素独审](R20-CROSS-COVERAGE-PHONE-RESULT.md)确认：父图先补新区域，约1.91秒后细图接替；父图前仍有局部缺口，完整快速缩放/移动、云/光害等待及资源回落未关闭。受控退出清理有代码检查和实际Map→Sky路径，不据此称native无泄漏。详细证据沿各报告，当前输入、候选和在途工作只由HANDOFF拥有。

## 连接与采样的结论

**连接失败的已核范围：** r22两轮人工Heap请求均未形成有效导出，183/218MB不构成同会话增长曲线；[后续Stable同包对照](R24-STABLE-RESUMPTION-20261021.md)已执行，在进入Sky后RTT升高并断连，发生于Heap请求前。手机仍可操作，未查实断连由CPU/GC、内存、日志还是传输引起。保留[当时官方/社区研究](R22-HEAP-CAPTURE-RECOVERY-RESEARCH-20261021.md)，其中Stable“尚未执行”为历史状态。旧CPU/r7和历史单份Sky堆仍保各自资格，没有有效前后堆图；不重复已失败的扫码/版本/Heap/Timeline清单，只有相关条件或失败边界诊断依据改变才有限重评。

**2026-10-21接收电脑补核：** 当前Nightly `2.02.2610192` 的下述自动调试、编排与连接/模式三个安装模块已只读核SHA，全部与19日已核模块完全一致。因此复用其`remoteAppservice:true`、`cdpEnabled:true`及LAN/WAN不改变执行模式的实现证据，不重开安装机制研究。这不倒填当前r14实际VM、profile目标或捕获/导出资格；用户后续已完成Memory操作，但timeline始终空Snapshotting，未取得有效导出。当前Sky目标/动态heap和桌面控制边界按HANDOFF恢复，不再要求重复打开或空录。

已核验的r9观察时，手机关联调试链路真实工作。19日该轮结束时手机被用户带走，随后转为离线工作；这不是接收电脑当前的设备边界。LAN→WAN 是传输通道切换，不是“假连接”，也不是自动从真机调试2.0退回1.0。已结合当时安装实现、目标运行时和实际手机动作核对，不能只凭绿色连接状态判断。

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
| 地形两三秒缺口 | r20同一跨覆盖请求的父图/细图实际字节与SHA已绑定；录像确认旧覆盖外先出现父图，约1.91秒后恢复细节 | 父图前仍有局部缺口；没有精确松手→呈现时钟或严格旧新对照，连续缩放/移动、完整三层及资源回落仍未完成 |

证据入口：[r8入场](R17-A1-R8-ENTRY-RESULT.md)、[r8交互与A](R17-A1-R8-TIME-INTERACTION-RESULT.md)、[跨日修复](SKY-TIME-PENDING-CONTINUITY-FIX.md)、[独审](SKY-TIME-PENDING-CONTINUITY-REVIEW.md)、[r7分配](R17-NORMAL-R7-ALLOCATION-RESULT.md)、[r9播放/退出](R17-A1-R9-PLAY-EXIT-RESULT.md)、[地形](TERRAIN-R8-IDENTITY-ACTION-RESULT.md)。

## 数据能支持到哪里

- Memory分配文件已经验证非空、引用完整、脚本与冻结包一致，可以定位分配来源；不能单靠热点或采样大小宣称泄漏根因。
- 无线ADB的PSS是手机前台Appbrand进程资源数据，与逻辑层JS采样的范围不同。r9首窗PSS增长约303MiB，暂停末31秒变化约0.18MiB，后续窗口下降；不能将两个不齐窗数值相减后命名为native/GPU泄漏。
- 实际截图/录像证明所见操作和输出；内部accepted/copy返回不能代替物理FPS。r9 surface实际缩为1×1并移除选择层，context扩展不可用，不能写成GPU全部释放。

## 方法改进与下一决策

现有开发skill已覆盖当前CPU、输入关联、分配、进程内存、请求/原生呈现边界，路线本身可用。此前执行中对“连通/执行位置/数据适用范围”的说明不够显式，状态文档也让尝试次数掩盖了结果。已在原 performance-investigation reference 补三项窄规则：分别确认transport与执行模式/VM；将WAN命令等待和代理Storage作为观察条件；每轮先说明已解决/已定位/未回答及下一动作，避免为测量本身继续测量。

[r10跨日实际独审](R17-A1-R10-CROSSDAY-RESULT.md)已确认该修复，不重复同一观察；历史[r10普通播放部分证据](R17-A1-R10-ORDINARY-PARTIAL.md)继续保其窗口限制。当前r20已把Sky后续修复限定到真实星点遍历，并取得地形父图提前补边的像素证据，不能再按旧“待补总体成本/待证明父图出现”重复采集。B仍缺实际强保留链，当前官方Sky目标/Memory恢复边界明确留在HANDOFF；进程watch和短样本不能代替它。必要人工动作后置，Git/服务交付不挤占用户两项重点；不重跑相同CPU/Allocation资格、恢复gen24或派生相邻disable。完整Goal及其它R/H/A/N义务保持不变。

本次方法仅修改现有reference，入口frontmatter未变，8个本地结果引用、diff检查及现有project-skills四项router/引用检查通过。skill-creator的quick_validate已尝试，系统与bundled Python均缺PyYAML，未将该检查器标为通过；没有为这次文字修改安装额外运行环境。
