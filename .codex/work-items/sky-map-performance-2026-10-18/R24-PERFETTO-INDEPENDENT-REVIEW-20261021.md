# r24 Perfetto 普通预览样本独立复核

2026-10-21。只读复核 root 已取得的系统 trace、采集脚本、配置、收据与设备 session 元数据。没有操作手机、IDE、服务、构建或 Git，没有重新采集或上传原件。

**结论：当前 Android 普通 r23 云观星的系统调度与进程内存路线已取得可解释的目标数据。** 它可以独立于微信真机调试连接观察目标进程的运行线程、RSS 分类和 Swap；不能提供 JS 分配栈、保留链、特定 Canvas 的实际呈现或完整无泄漏结论。本次也未取得目标 FrameTimeline 样本。

## 原件与目标资格

- 复核原件位于既有私有 `r24-independent-20261021/performance-alternatives`：`r24-system-1792589969717.pftrace`，6,572,727 B，实际本机 SHA-256 为 `7639aa2eda560ec7924e1f7b1acde58b713eeb61076597ae071f52d885b7bcd6`，与采集收据一致。手机端 SHA 一致是 root 采集收据的事实；本独审未再访问手机。
- root 的采前、采后记录由前台 AppBrand Activity 的 RESUMED ProcessRecord 选定目标，PID、进程名和 Activity 一致。trace 中匹配该 PID 的 process 实例恰好一个，名称亦匹配；没有按预加载槽号猜目标。端点身份一致不等于对每一瞬间的页面生命周期或 V8 isolate 作了证明。
- 设备 session 与 feedback generation 均绑定包 `a5da291529569ee0483765cb63f38e6afea890351e6816e09daad1b4a5182c1e`，官方状态 `operator_confirmed`。root 实看过 r23 独有标识及 264.4° 全天空地景；本地绑定不等于手机全包字节读回，系统进程也不是产品独占的 allocator。
- 采集配置为 20 秒、16 MiB ring buffer，process_stats 每 1000 ms、sched_switch/sched_waking、MemAvailable 和 FrameTimeline。日志确认服务 TTL 20 秒并正常写完；最初从 `/data/local/tmp` 读取配置被拒绝后，root 改用文档支持的 stdin，完成的样本采用 stdin。没有打开 heapprofd、整机日志或远程上传。

## 时间与 CPU 复核

| 观察 | 实际结果 | 解释 |
| --- | --- | --- |
| 服务开始至停止 | 20.011446 秒 | 来自 metadata 的 tracing_started_ns 与 tracing_disabled_ns。 |
| 所有数据源就绪至停止 | 19.823233 秒 | 可用数据源窗口小于整个服务窗口。 |
| trace_bounds | 22.642460 秒 | 包含更早的 trace 时间记录，不能把它当实际业务动作或录制持续时间。 |
| 主要 JSRuntimeLooper | 85 个闭合运行片，19,041.440 ms；最大单片 1003.211 ms | 这些 sched 片均以 R 被抢占结束；thread_state 同样归为 Running，片间无重叠。不是 sleep、runnable 等待或“整个线程存在时间”。 |
| 末尾未闭合片 | 1 个，dur < 0 | 已从运行时间求和排除，没有外推到任意结束点。 |
| 另一个同名 JSRuntimeLooper | 约 210.250 ms | 同名并不表示同一线程；当前系统数据未把两者对应到具体 V8 isolate、主逻辑或 worker。 |

因此可准确表述为：“约 20 秒的采集中，目标进程的一个 JSRuntimeLooper 线程已有闭合的 CPU 运行片合计约 19.04 秒。”不能直接写成“某个 Starward 函数耗时 19 秒”或据此认定主逻辑 JS 的根因。Perfetto 的 [sched / thread_state 语义](https://perfetto.dev/docs/analysis/perfetto-sql-getting-started#scheduling)支持这种区分。

## 内存与完整性

- 每个目标内存 track 均有 21 点，首尾跨度 **19.459321 秒**；包括 RSS、anonymous/file/shared RSS、历史 RSS 高水位、virtual、locked、Swap 和 oom_score_adj。采样不是每个点精确相隔 1000 ms 的保证。
- RSS 范围 1241.176–1333.191 MiB，anonymous RSS 范围 662.809–754.824 MiB；两者各有 9 次上升和 1 次下降。Swap 为 11.371 MiB。只报告本段范围，不由 min/max 冒充首尾净增长或长期斜率。
- `process_counter_track.unit` 本样本为 null，不能仅凭列名猜单位。已核同版 [Perfetto v58.2 解析实现](https://github.com/google/perfetto/blob/v58.2/src/trace_processor/importers/proto/system_probes_parser.cc#L867)：进程内存 KB 字段乘 1024 后写入 trace processor，因此本次 SQL 数值是 bytes，上述转换为 MiB。RSS、Swap 均不是 PSS、SwapPss 或 JS 堆；虚拟空间和历史高水位也不是当前驻留内存。
- parser 的 error/data_loss 非零项为空；8 个 CPU 的 ftrace overrun/commit_overrun、ring-buffer overwrite、sequence/writer loss、corrupted/read-gap 等已核为零。缓冲写入约 6.95 MB，小于 16 MiB；没有发现会使这段 CPU 求和失真的已报告丢失。零报告错误不为未启用的数据源补齐覆盖。
- 整份 trace 有 10 个 actual FrameTimeline 样本，**目标进程为 0**。不能由其他进程或 compositor 的样本推导本 Sky 的 FPS、卡顿或 accepted-frame 呈现时刻。

## 动作关联及下一决策

host 采集请求与返回为 13:39:30.157–13:39:50.289 UTC；前、后截图分别在 13:39:29.066 和 13:40:10.750 UTC。只读 session 内没有该次 swipe 的起止事件收据。截图能说明观察前后仍有 Sky 画面及画面位置变化，但**不能证明 swipe 完整落在 trace 内**，也不能把这一 trace 当成输入→呈现时延样本。不得用工具调用排列次序补造时间关联。

此样本足以关闭“普通预览能否取得实际目标系统调度/内存数据”的资格问题。下一步应沿当前客户端本地 CPU 导出确认具体调用栈，并保留该入口实际生成的各个 profile；同名系统线程不能自动对应到主 profile。必要时再用已验证系统路线观察与明确动作关联的运行/回落，复用已有 PSS owner。当前不需要仅为资格再录相同 trace，也不需要扩建通用 profiler 框架。

原始 trace、SQL 与详细数值都留私有 owner。本次新增的 `review-*.private.sql/.txt` 和公开解析器代码副本用于复核；本文件只保留必要摘要。没有产品修复、完整普通 Play、资源生命周期或无泄漏通过结论。
