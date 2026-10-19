# r10 普通预览播放：离开手机前的部分证据

2026-10-19。用户携测试手机离开并要求交接，停止新手机操作；当前Goal工具实际paused。本记录只固定已发生的观察和未完成边界，不把部分样本升级为完整B。

## Candidate identity

r10普通预览，无desktop remote/CPU/Allocation profiler。HEAD `69401c097572799234e6b97478a4a1ddfe06c810`，app `077d3aeb3ffd874efabf9b2907cb7ef90b446305a9f029a64bf07400581c3094`，source `e7e558d27d1b0c1c0b748bfd7c8bf56e0b33aa8270e5bdcd15edb57b1ada480e`。完整构建和接入/整包独审已通过，337文件/5,003,601B。官方exec67914明确success，实际独有r10标签后绑定Klvb4h，仍为development_feedback_only。

## Invocation result

第一次正常Play录屏exec85412已返回成功。普通产品从04:30运行，录屏终图显示04:30:13/播放中；其后root实际查看04:31:00/预览/Play按钮，collector有同run `r17-1-594bozykj3` 的metrics与terminal，terminal记录actualPlay=1、pauseAttempt=1、pauseSuccess=1。15秒导出内的有效窗口14,008ms，不扩为60秒全程计量。60秒同次Pause的晚时间字段仍为null，不能补造精确Pause时刻。

第一次命名为`r10-ordinary-60s-play`的13行watch实际上在Play之前结束，保留为准备/idle观察。第二个命名为`r10-ordinary-active-drain`的13行watch实际在产品Pause之后开始，只能作暂停期观察。**文件名不能改变实际窗口；两个文件slot0不证明跨文件PID一致，不计算它们之间的播放增长。** 两次Play输入此前被60秒截图守卫拒绝，未发送输入；它们是观察编排失败，不是产品失败。

随后重新待命，root先启动同一进程绑定的watch，再fresh capture/view与一次正常Play录屏exec31772。该exec句柄在用户中断/模型切换后不可恢复；磁盘存在新原片`recording-1792413111711.mp4`和run `r17-2-dt880drq69`的metrics，但尚未审视频，未见第二次terminal。watch exec92465原件只有5行：4行有效前台读数后，第5行`miniapp_not_foreground`并终止。当前本机匹配的memory/record-tap进程数实际为0。

## Observed product behavior

第一轮已见正常播放和暂停终态，未见其退出Map；第二轮只保原件与计量，不推断手机离开前台的原因。不能把用户携走手机/非前台状态称为OOM、崩溃或60秒正常结束。

## Verified

- 暂停期13行watch持续约120.569s，PSS首2,673,278、尾2,654,354KiB，各行前台owner有效；这是高位暂停样本，不是JS/native/GPU归因。
- 第二次同watch有效前台PSS为2,621,654 → 2,614,003 → 2,759,813 → 2,870,073KiB，对应host采样区间0–1,689、16,698–18,436、33,445–35,182、50,187–51,817ms。第5行66,820–67,018ms为非前台，不能填内存值。
- 未取手机PID/原始dumpsys出进程，分类不相加，Unknown不命名allocator；没有用PSS减去r7分配采样估算native泄漏。

## Unverified

第二次视频语义/采样与真实输入和Pause的完整对齐、持续60秒与暂停尾段、Map退出/资源回落均未完成。已有r7分配/r9退休证据保各自范围，完整B和根因未关闭。下一对话先离线审已保存原片/metrics/窗口，只有决定性缺口必须用手机时才保留待恢复，不重录既有CPU/Allocation资格，不凭相邻disable或Unknown分类改实现。

## Invalidated

旧session与截图不提供新输入授权；当前Klvb4h也须等用户明确手机重新可用并fresh capture/view后才可操作。第一次watch不是Play窗口，第二个watch不是active窗口。exec句柄不可恢复不代表操作没有发生，不得重放record-tap或预览。

## Cleanup

全部当前feedback、prebinding、完整r10构建（排除node_modules/链接）、collector、3个watch与r10报告已复制并逐件前/副本/后读回：2,703文件/56,451,346B，位于外部`normal-existing-resume-20261019/r10-handoff-phone-away-20261019`；manifest SHA `5e5f746bcebcecb7588763a2a7e5ac8b33fa45d0524034a6ec2e95a7398f3b82`。可变session只冻结此刻，不冒充此前历史字节。未删除任何源码、候选或手机数据；旧IDE入口/桥/防火墙按HANDOFF留待精确收尾。
