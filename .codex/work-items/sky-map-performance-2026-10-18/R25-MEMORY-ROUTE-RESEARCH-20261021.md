# 内存归因路线补充：Chromium MemoryInfra

2026-10-21。用户再次明确内存归因是工具能力的必需项；普通输入关联和PSS/RSS曲线没有完成该要求。本次子任务只读既有失败证据、公开文档和上游源码，不操作手机、IDE、服务或产品代码。现场资格与实测结果由root另行记录；本文件不是当前采集成功证明。

## 选定的新边界

既有Perfetto预检只归纳process_stats/sys_stats/ftrace/heapprofd/FrameTimeline，不是Chromium producer的完整清单。root本轮公开service query新发现当前微信进程注册 `org.chromium.memory_instrumentation`、`track_event` 等，并报告已把其中producer与当前前台Appbrand匹配。该材料变化支持一次新的MemoryInfra资格采集；它不同于已经失败的Android heapprofd/ART资格，也不同于前一轮只有RSS的系统trace。

[Chromium MemoryInfra](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/memory-infra/README.md)按引擎子系统报告内存，可能包括V8、Blink、Skia、图像缓存、PartitionAlloc和GPU。数据源注册只建立可以尝试的入口；具体XWeb构建是否启用provider、能否在当前高负载下完成dump及输出哪些分类，必须由本次文件回答。

随后root已报告10秒资格采集得到3,655,655B的新文件，采前后目标相符且手机/本机SHA一致；本地解析出5个detailed snapshot、目标共11,445个node，实际包含V8、malloc、PartitionAlloc、Blink GC、Skia和GPU。process_stats另有5项unknown-counter解析统计，不能泛化为MemoryInfra数据丢失或完全无损。本子任务未独立操作/解析此文件；现场身份、原件和完整结果归root证据。这已超过“仅注册”的阶段，但尚未建立Sky appservice特定isolate及增长动作的覆盖。

## 官方配置与最小采集

配置责任已核至[Chromium端到端测试](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/tracing/tracing_end_to_end_browsertest.cc)、[TracingObserver](https://raw.githubusercontent.com/chromium/chromium/main/services/resource_coordinator/public/cpp/memory_instrumentation/tracing_observer.cc)和[TraceConfig解析](https://raw.githubusercontent.com/chromium/chromium/main/base/trace_event/trace_config.cc)。关键项为该data source的 `chrome_config.trace_config`，不是单独打开metadata或任意V8 category。

下面是由公开协议组成的10秒资格配置示意。2秒period是本次有界资格选择，官方测试例为10秒，不是长期采样预算。`<verified-producer>`只能替换为root刚核实的完整producer名；保留当前私有配置和严格target绑定，不按名字猜进程。

```text
duration_ms: 10000
buffers { size_kb: 16384 fill_policy: RING_BUFFER }
data_sources {
  producer_name_filter: "<verified-producer>"
  config {
    name: "org.chromium.memory_instrumentation"
    target_buffer: 0
    chrome_config {
      privacy_filtering_enabled: true
      trace_config: "{\"record_mode\":\"record-until-full\",\"included_categories\":[\"disabled-by-default-memory-infra\"],\"excluded_categories\":[\"*\"],\"memory_dump_config\":{\"allowed_dump_modes\":[\"detailed\"],\"triggers\":[{\"min_time_between_dumps_ms\":2000,\"mode\":\"detailed\",\"type\":\"periodic_interval\"}]}}"
    }
  }
}
```

- **memory-infra分类必须写在JSON内。** TraceConfig只有在该分类启用时才解析 `memory_dump_config`；只填triggers可能得到未设置的dump配置。
- **track_event是否同时开启。** `TracingObserver::StartTracingImpl`直接把dump配置交给MemoryDumpManager，本身不依赖单独的track_event source。官方E2E同时启用track_event，仅允许memory-infra及`__metadata`；为保版本兼容可以使用这份最小组合。不要为了“更详细”打开全部V8事件、采样器、代码统计或其它重型profile。
- **privacy_filtering。** 上游TracingObserver只按自身data source状态及allowed_dump_modes决定写入，没有读取 `chrome_config.privacy_filtering_enabled` 来把detailed降为background。可保true并核实际输出；不能由上游实现保证当前XWeb fork行为。[ChromeConfig协议](https://raw.githubusercontent.com/google/perfetto/main/protos/perfetto/config/chrome/chrome_config.proto)说明这是输出字段隐私过滤，具体provider覆盖仍看实测。
- **coordinator必要性。** [MemoryDumpManager::SetupForTracing](https://raw.githubusercontent.com/chromium/chromium/main/base/trace_event/memory_dump_manager.cc)只在coordinator启用periodic scheduler。注册了memory source的renderer可以没有主动周期dump；若首份为空，先检查当前目标producer与其同一引擎组coordinator关系，不能直接判整条路线无效，更不能随意扩到所有应用。
- **系统连接。** [Perfetto官方Chrome说明](https://perfetto.dev/docs/getting-started/chrome-tracing)中的Chrome用户版开关属于Chrome产品。当前微信producer已经出现在系统service，不能机械打开Chrome旗标、切换系统WebView或加入私有CDP。系统producer已连接不等于每个provider可用。

沿root已验证的stdin传config、本机精确pull和本地Trace Processor解析路径即可；不需要安装SDK进微信、root、修改SELinux或读取账号存储。本次不是JavaScript对象级heap snapshot，也不强制GC。

## 期望信息及充分性判断

[V8IsolateMemoryDumpProvider](https://raw.githubusercontent.com/chromium/chromium/main/gin/v8_isolate_memory_dump_provider.cc)具体说明了比进程曲线更细的可用信息：

- 各V8 heap space的physical size、virtual_size与allocated_objects_size；可分辨保留容量和实际已用量，不能互相混称。
- native/detached context计数、global handles总量与已用量、V8 malloc及峰值。
- detailed模式可尝试输出 `heap_objects_at_last_gc` 分类，**它描述上次GC时的对象统计，不是当前dump时刻**。该能力只有引擎实际跟踪了对象类型才有数据，不能把空分类解释为零对象。
- code/bytecode统计另需专门category，上游指出它比普通V8统计昂贵；本次先不打开。

如果实际数据能区分增长主要在V8已用空间、上下文/句柄，还是图像/Skia/分配器，则已经能把下一修复收窄到相应责任，并可与r7已映射分配来源共同判断。这不自动给出单个对象保留链或所有native调用栈；只有剩余决策确实需要那些信息时才继续补对应观察。不能以“不是heapsnapshot”否定有用结果，也不能仅以分类非空宣称整个内存问题已解决。

**V8 provider覆盖必须另核。** 上游代码明确将 `kBlinkMainThread` 标为 `v8/main`、`kBlinkWorkerThread` 标为 `v8/workers`、`kUtility` 标为 `v8/utility`；provider随 `gin::IsolateHolder` 注册/注销，并不自动枚举进程内所有V8实例。WeChat appservice如果使用未接入该provider的独立VM，就可能不在本输出内。因此不能仅凭目标Appbrand匹配，将 `v8/main` 改称“云观星逻辑层堆”；也不能因为已报告的V8平稳，就排除未覆盖逻辑VM增长。可以通过同trace中带isolate标识的事件、实际脚本/线程事实或目标宿主公开说明补足绑定；没有这些证据时，准确命名为“当前Appbrand报告的Chromium V8 providers”，保留逻辑层覆盖unknown。现有图像/分配器分类仍可独立回答其覆盖范围内的内存问题。

## 文件资格与解析检查

[Perfetto内存表定义](https://raw.githubusercontent.com/google/perfetto/main/src/trace_processor/tables/memory_tables.py)提供 `memory_snapshot`、`process_memory_snapshot`、`memory_snapshot_node` 与 `memory_snapshot_edge` 的对应结构（新内部实现另有`__intrinsic_`前缀）。使用当前本地解析器实际schema，不假定表列版本：

1. 核新文件哈希、实际capture起止、停止后的零在途session，采前采后目标进程相同。按process upid关联snapshot到当前Appbrand，而非把任意Browser或V8节点归给Sky。
2. 检查详细级别、每次dump时间、目标节点/参数非空、实际provider路径及字段。报告缺失provider、未完成dump或error/data_loss；没有V8节点时不能把native或其它WebView的数据称Sky逻辑层JS内存。
3. 检查size/effective_size/arg_set_id，以及同一provider层级的所有权边。子节点和父节点会重叠；不要全表求和或把size与effective_size相加。[MemoryInfra说明](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/memory-infra/README.md)区分了重复分配记账与有效归属。
4. 普通预览实际全天空BSC/SAO及地景必须仍有效；单次静置资格可证明输出，不证明增长原因。只有把有效dump落到实际Play/停止/退出窗口后，才讨论哪个分类随操作增加或回收；缺少共同事件/时钟关系时不拼接两份记录。

## 未选用的另外两个方向

- **WeakRef/FinalizationRegistry定点生命周期观察**是语言级可选补充，先前源码审阅没有找到现成接线，目标支持也未实测。[V8说明](https://v8.dev/features/weak-references)强调可弱观测寿命，但没有保证GC/回调期限。它能确认某些对象已被回收，不能凭未回收判泄漏；自建跟踪还可能形成强根。现有成熟MemoryInfra出现真实入口后，暂不扩建这个观察器。
- **MemLab/Chrome离线分析器**可以分析已取得的V8快照，但其[CLI与浏览器流程](https://facebook.github.io/memlab/docs/cli/CLI-commands/)不提供当前微信高负载下的新采集通道。已有87MB初始堆已经完成结构/支配分析，没有新的后图；换分析器不能补出缺失时段。本次不安装或重做旧堆结论。

本研究没有找到可凭公共wx API直接导出普通小程序完整JS保留图的新增承诺。小游戏教程、Android host profileable、Chrome/WebView开发开关分别属于不同边界；继续保留既有失败资格，不把它们重命名成新方案。当前优先验证MemoryInfra实际输出，后续选择由其结果决定。
