# A1 r10 跨日等待与取消的手机独立复核

2026-10-19，审查者 /root/review_r10_crossday_phone。本次必要普通预览中，**19日10:00切到18日10:00，等待期间保留白昼Sky和已显示的10:00；旧r8短暂退回04:30夜景的现象未出现。取消后回19日04:30夜Sky。** 这是 development_feedback 的目标反馈，不是完整A/B或最终候选验收。取消时各层有短暂先后更新，下面保留实际序列，不称为逐帧原子一致。

## Candidate identity

生产HEAD 69401c097572799234e6b97478a4a1ddfe06c810，source e7e558d27d1b0c1c0b748bfd7c8bf56e0b33aa8270e5bdcd15edb57b1ada480e，app 077d3aeb3ffd874efabf9b2907cb7ef90b446305a9f029a64bf07400581c3094；337文件、5,003,601B，review10/buildGeneration27/反馈generation1。实际查看了绑定前、后两张r10独有label原图，并只读核对当前feedback/session同一app指纹；没有把可变session.json冻结成历史原件。runtime AppID和完整手机包字节未读回。

复用 [完整构建独审](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/sky-map-performance-2026-10-18/R17-NORMAL-R10-BUILD-REVIEW.md)、[task接入独审](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/sky-map-performance-2026-10-18/R17-NORMAL-R10-INTEGRATION-REVIEW.md) 和 [生产continuity独审](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/sky-map-performance-2026-10-18/SKY-TIME-PENDING-CONTINUITY-REVIEW.md) 的当前精确绑定及133项相关行为/类型结果，不重开方案、构建或工具资格审查。

## Invocation result

root记录官方一次预览exec67914明确成功，查看r10实际label后绑定，随后负责当前guarded session的真实尺拖动、前一日和取消录制。root的运行条件是普通预览、无desktop remote/profiler；本复核不操作或重新连接设备/IDE，所看原片也没有真机调试浮层。这个条件不能由本agent的只读文件操作升级为一次独立官方运行时读回。

三片均为H.264、1080×2376、timebase 1/90000。原PTS完整解码269个有效编码帧，无trim、补帧或PTS重置；固定上方Sky区域逐帧统计，实际查看46个明确记录的分布/变化样本及6张独立原PNG。编码PTS最大间隙分别2.511/2.947/3.170秒，包含静态/起录区间；编码帧数、间隙、视频时长不表示物理FPS、UI冻结或每个显示刷新均被录到。host输入、视频PTS和手机时钟未校准，不跨钟相减。

## Observed product behavior

| 原动作 / 片长 / 编码帧 | 实际观察 |
| --- | --- |
| 尺拖动：recording-1792411899305.mp4 /5.337689s /129 | 从19日04:30夜Sky开始；实际样本包含04:33:37、04:55:35、05:46:24、06:02:43、07:03:35、08:39:35、09:50:29。目标和当前已显示时间在“更新中”可不同，未伪装为已完成；画面随已接受时刻进入白昼。末样本128/PTS5.321256及独立终图均为19日10:00、10:00:00预览和非空白昼Sky。 |
| 前一日：recording-1792411937260.mp4 /8.555700s /49 | 样本6/3.286622仍19日10:00预览；7–16/3.303578–3.454344已经18日，当前读数保持**10:00:00 更新中**、Sky保持白昼。17/3.518233为10:00预览，尺区短暂显示“时间尺定位中，重试”；18/3.931656起新尺窗恢复，末48/8.538667和独立终图保持18日10:00与白昼Sky。 |
| 取消：recording-1792411966283.mp4 /6.041733s /91 | 从18日10:00白昼开始。6/3.247800先变夜Sky；7–8/3.264911–3.281244仍短暂显示18日10:00“更新中”。10/3.314444已为19日04:30，预览/取消文字消失；尺区先有定位恢复文案，40/4.497333已恢复正确04:30尺窗。末90/5.986244及独立终图为19日04:30夜Sky。 |

同一区域的49个跨日编码帧亮度均值为111.10–114.48；本次起始夜景和取消后夜景约36–37。它帮助排查旧问题那种明显白昼→夜色退回，不能独立证明日期、供给或每颗星正确；结论同时依据上述实际读数、状态和非空画面。旧r8的9–18/PTS3.291889–3.458744确实是04:30更新中加夜色，继续由 [旧结果](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/sky-map-performance-2026-10-18/R17-A1-R8-TIME-INTERACTION-RESULT.md) 保留，没有用新终态改写。

## Verified

当前绑定和可见label支持这条r10目标反馈。真实尺输入到19日10:00、跨日前一日等待保留已显示白昼、收敛到18日10:00、取消恢复19日04:30及正确尺窗均已观察。生产修复所针对的“跨日供给等待退回committed夜景”已在这条必要普通预览路径完成目标反馈，无需为了安心再录同一问题。

## Unverified

本报告不认证物理每帧等价/FPS/输入到呈现时延，不认证取消过程中所有WXML字段和native像素原子一致，不认证逐请求完整服务key/全天供给、Apply/持久化、最终普通生产包、完整A/B、内存归属或泄漏、Terrain、iOS及其余Goal。普通预览完整持续B仍由root后续实际观察拥有。

## Invalidated

只看终图不能代替过渡序列；当前可变session不是逐字历史冻结；label和本地binding不是完整手机包/AppID读回；编码视频也不是物理每帧证明。取消片中短暂旧日期/10:00字段与夜Sky的先后更新不得从结果里省略。

## Cleanup

[外部原件owner](E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/r10-crossday-review) 保留22件实际依赖原件/引用报告，共4,952,648B，manifest SHA ffda39c4ac2dad7bb38b727bcf99d03f24177d3b79cb9f4a3924ef031c3b3f70；结束前所有原件与副本再次逐件一致，6个PNG sidecar的SHA/字节/尺寸/miniapp scope均匹配。269帧、选样、统计及有限工具的派生manifest为287件/97,971,463B，SHA 8f14d9fbc7bcdd15f82a610ab1bdeb8e9c532d48e146ab82bb0b0ee76bebf0c2。后写的仓库报告生成脚本不属于已经封存的派生manifest；完整边界与样本索引见 [JSON](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/sky-map-performance-2026-10-18/R17-A1-R10-CROSSDAY-RESULT.json)。

本agent只新增自己的MD/JSON和Git外审查派生，没有改生产/task脚本、coordinator文档、候选或服务，没有设备/ADB/IDE/存储操作或Git写入；未留运行进程。原8791、N05、R6提醒、gen26 UNKNOWN、配对/VPN均未触碰，当前手机现场仍由root独占。
