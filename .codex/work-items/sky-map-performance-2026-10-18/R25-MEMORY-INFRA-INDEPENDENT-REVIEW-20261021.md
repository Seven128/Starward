# MemoryInfra 与 V8 GC 当前目标样本独审

2026-10-21。只读原件与当前协议，使用既有本地 Trace Processor 独立查询；没有操作手机、IDE、服务、构建或产品代码。现场全天空地景、正常 Play 与手动 Pause 由 root 的实际画面/动作记录拥有，本审阅不把转述当成新的设备验证。仅新增本审阅及既有私有目录内的数值派生文件。

## 结论

**MemoryInfra + V8 GC 已在当前 Appbrand 提供了比 PSS/RSS 更细、能够区分部分原因的内存数据，但尚未满足全部 Sky 内存归因需要。** 本次可确认已报告 Blink isolate 的容量/已用量区别、上下文/句柄变化、Skia/GPU/合成资源的阶段差异，以及系统 malloc 统计仍高的现象。没有当前逻辑层 appservice 对象保留链，也没有把未归属的 native 分配定位到调用栈或产品 owner；不能以视图层结果宣称用户要求整体完成。

下一决策应保留系统分配与未覆盖逻辑层的归因问题。不要因 V8 总容量上涨就改恒星对象缓存，也不要将 Skia 的暂停后较低数值扩大为所有 GPU/native 资源已释放。已有 r7 分配来源可指导具体 owner 的生命周期观察；此工具数据不是独立泄漏判定。

## 文件与目标核验

三份本机文件均重新计算 SHA-256，与各自捕获回执相符；回执记录的 phoneHashMatches=true、采前采后目标一致，且三次都与本次 producer-target 绑定一致。独审未再次从手机拉取原件。每份 trace 通过 `process_memory_snapshot.upid → process.pid` 绑定到该目标；不同文件的 upid 值不同，不能直接以同一 upid 联结跨文件数据。upid=0 的 global 图未并入目标统计。

| 样本 | 文件字节 | SHA-256 | 目标 detailed dump / node | dump 首末跨度 |
| --- | ---: | --- | ---: | ---: |
| 初始静置 | 3,655,655 | `a82f0df118bdc4a9933841e04cd59b95553ace760b56559fa390f2a285e9ac35` | 5 / 11,445 | 7,998.999 ms |
| Play 初段 | 13,954,549 | `381c04a296b476cdbe06fa76e8cf33c8aa37a004b4222113e319ac27ae506791` | 15 / 44,191 | 28,080.457 ms |
| Pause 后静置 | 3,772,335 | `1f7de9b41863ec5e773c681aebb531b0cf4665dbfdffcfb63550011223228207` | 5 / 12,177 | 7,995.644 ms |

配置时长分别10/30/10秒；上表是实际内存 dump 覆盖，不是用 trace_bounds 或宿主命令时长代替实际工作时段。唯一非零 error/data_loss 类统计是 `proc_stat_unknown_counters`，分别5/15/5；没有非零 overwritten 记录。它限制 process_stats 未识别计数器的解释，不应称整份 trace 完全无错，也不能据此否认已经逐值解析的 MemoryInfra/GC 数据。

同次 r23/gen27 normal `wide-play` 回执严格协议通过；实际计量13,983ms，BSC8,404行、SAO2,842行，313次实际 Scene/accepted，亮星/暗星提交和接受均非零。它支持当前场景确实执行了正常工作，但不证明全部 SAO tile 成功。root 后续手动 Pause，60秒守护回执 `pauseAttempt=false`、`pauseSuccess=0`；不能写成自动 Pause 成功，也不能把30秒 trace 或13.983秒计数分母套到完整约58秒播放。

## GC 与 V8 覆盖

120条 `V8.GC_Heap_Stats` 从 trace 用 SQL `hex(debug.stats)` 精确导出后重新 JSON 解析，与 root 的私有解析文件逐值相同。直接读取默认CSV中的嵌套JSON会错列，不能据错误CSV构造统计。

120/120条统计属于目标进程的 **Chrome_InProcRendererThread**，只有一个 isolate。其地址与 MemoryInfra `v8/isolate_*/heap_statistics` 的唯一标识在十六进制数值上相等；初步字符串大小写差异已经排除。因此这些GC统计可以和本次已报告的 Blink V8 provider关联，不能据此关联到另一 VM。

| GC 事件统计字段 | 首值 | 末值 | 全样本范围 |
| --- | ---: | ---: | ---: |
| total_heap_size / total_physical_size | 43.555 MiB | 83.555 MiB | 43.555–83.555 MiB |
| used_heap_size | 39.202 MiB | 38.429 MiB | 37.864–40.784 MiB |
| external_memory | 1.452 MiB | 1.451 MiB | 约1.451–1.452 MiB |

这些 GC 事件覆盖26.319秒。按 [V8 GCTracer](https://raw.githubusercontent.com/v8/v8/main/src/heap/gc-tracer.cc) 的事件位置，它们在GC阶段结束统计中取得；其中包含年轻代GC，不代表每次都完整回收整个堆。容量增加40MiB而观察到的已用量没有同步增加，支持“本样本中该 isolate 的容量扩张不能直接当作存活对象持续累积”。这不是全应用无泄漏结论。

MemoryInfra 同样显示：Play 样本 old_space 的 allocated_objects_size 首18,672,988B、末18,660,004B，变化很小；new_space 容量首10MiB、末28MiB，瞬时已用量上下波动。native contexts始终3、detached contexts始终0。global handles已用量59,136→107,840B；暂停后样本51,328→52,112B。容量、实际已用量和对象计数必须分别报告。

[上游 gin provider](https://raw.githubusercontent.com/chromium/chromium/main/gin/v8_isolate_memory_dump_provider.cc) 将 `v8/main` 用于 Blink main，并不会自动枚举进程内所有V8实例。当前没有任何可绑定到 appservice/逻辑 JSRuntimeLooper 的GC或heap统计。本次只能明确这份GC数据来自renderer，**没有建立逻辑层内存覆盖**；这也不等于证明该工具在所有配置下绝对不支持逻辑层。不能从未见逻辑层事件推算其零分配、已回收或无泄漏。

## 分配器与图形资源的可用细分

以下均为同一字段的同阶段首末值，单位MiB；三个窗口不连续，不拼接成精确的 Play/Pause 回收率。

| 记录字段 | 初始样本首→末 | Play 样本首→末 | Pause后样本首→末 |
| --- | ---: | ---: | ---: |
| malloc/sys_malloc size | 85.421→85.551 | 87.215→121.247 | 130.736→131.046 |
| malloc/partitions/allocator allocated_objects_size | 16.647→17.014 | 18.472→21.475 | 19.146→19.228 |
| Skia 图节点 size | 0.727→0.727 | 0.775→9.728，峰15.464 | 0.789→0.789 |
| GPU 图节点 effective_size | 3.965→3.965 | 3.969→6.094 | 3.969→3.969 |

Skia 的新增图细分实际包含 `gpu_resources` 下的 texture，glyph cache没有同等幅度增长；Pause后这批图记录更小。合成器cc、shared_memory也回到接近初始量级，相关现象支持继续区分临时图形资源与仍高的系统分配统计，而非将整段内存变化统一叫JS对象泄漏。没有GPU物理驻留总量或所有资源删除调用栈。

**malloc 的图节点总量不能当作实际活跃 malloc 字节。** Play末尾 `malloc.size=277,147,152B`、`malloc/allocated_objects.size=150,010,032B`、`malloc/sys_malloc.size=127,137,120B`；父层与分配别名存在重叠。上游 [MallocDumpProvider](https://raw.githubusercontent.com/chromium/chromium/main/base/trace_event/malloc_dump_provider.cc) 明确指出图处理会因V8/Skia suballocation重算allocated_objects，并新增独立根标量以避免混淆；本次根 `allocated_objects_size` 标量缺失。因此不把根节点增加74.52MB表述为新增74.52MB实际活跃分配。

在上游Android实现中，`sys_malloc`来自系统mallinfo的uordblks，PA allocator自有allocated_objects_size提供另一份已用统计；本次两者可分别跟踪，不能与父节点叠加。系统分配统计在Play窗口增加约34.03MiB，Pause后样本仍较高，值得继续归因，但该记录没有说明对应哪些业务对象、C++调用栈或未注册的逻辑VM。`malloc/allocated_objects/<unspecified>`、`malloc/partitions/<unspecified>`仍占很大部分；它们的名称不是已定位的资源owner。

## 足够与未足够的分界

- 已能判断报告内的Blink V8容量扩张、GC后已用量、context/handle计数与图形资源波动是不同现象；可以避免把同一PSS变化错误归给所有恒星缓存或视图对象。
- 已能指出系统分配统计和未归属图节点仍高，而已报告的Skia/GPU临时资源在后续静置样本较低；可把下一观察聚焦到未覆盖逻辑对象生命周期或特定native owner。
- 尚不能判定系统分配增长是否来自小程序逻辑VM、其它宿主资源、合理缓存或泄漏，不能找出谁仍持有旧BSC/SAO transform，也没有精确native分配栈。
- 暂停后样本不含退出/卸载，因此不证明退出退休；采集负担、未完整SAO加载、跨文件非连续窗口仍限制最终验收。

当前应保留“视图侧内存分类和GC路线可用，完整内存归因工具能力仍需补齐”的状态。仅把本次验证过的能力回写方法，不以此次成功再次结束用户明确要求的内存调查。

依据：[本轮研究](R25-MEMORY-ROUTE-RESEARCH-20261021.md)、三份本机原件与私有producer/捕获回执、当前 `r17-normal-input-protocol.mjs`。独立数值派生为既有私有performance-alternatives目录中的 `r25-review-memory-categories.private.json`。原件和设备/isolate标识未复制入Git。
