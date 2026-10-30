# Sky heap and CPU observation routes

2026-10-23 adopted selection: **真机调试开发者工具（主用）** is the phone-attached developer window's Performance/Memory route. **普通预览与 Android 系统观测（备用）** retains targeted application ownership/timing and Android evidence for actual gaps. Reusable instructions belong to the [development skill](../../skills/starward-miniapp-development/SKILL.md#performance-investigations); task readiness and execution authorization remain with the active handoff/Goal. Historical captures below retain their original scope and are not new setup requirements.

## Adopted routing

The [VPN/TUN LAN run](LAN-DEBUG-RESUME-20261023.md) established a usable high-memory Sky connection and a complete, parseable Heap export. Those strong boundaries are sufficient for adopting the primary route; do not run a per-feature qualification matrix for Performance or allocation tools. Directly use the needed profile for the pending cause, preserving exact target/build and source-map semantics. The ordinary-preview combination is a backup, with its prior [r25/gen29 evidence](R25-CHECKPOINT-PHONE-RESULT-20261022.md) and [review](R25-CHECKPOINT-PHONE-REVIEW-20261022.md) still reusable within their scopes. The obsolete-frame/aggregate retention question and prior [V8 OOM failure](R25-MEMORY-PHONE-RESULT-20261022.md) remain unresolved; successful transport/capture does not itself locate the root or repair the product.

<a id="current-performance-entry"></a>
## 当前性能入口与操作分工

**2026-10-30本日最终handoff范围：** 先遵循原PLAN的[同机制收敛规则](PLAN.md#performance-scenario-consolidation)与HANDOFF当前状态。地形/Sky本轮性能、交互和故障修复已收口，实体转动已由用户确认；F04修复后的[旧图层清理及恢复](TERRAIN-DEVICE-20261029.md#f04-resource-repair-user-result)已通过，一次arm/重载和before/after均已终态。不得据旧准备记录再arm、重载、settled、Heap或Profiler。手机5秒按钮持续显示未观察，不为它重演；物理native/GPU字节与容量UNKNOWN保持，不形成新门槛。旧帧保留已修，历史OOM/闪退归因退出待办，只有后续新体验故障才处理。当前完整Goal paused；以下通路与清单只在后续有明确必要和授权时复用，不生成新任务。

这是当前采用方案的唯一操作入口。Root负责准备、必要取证、分析、修复及结果核验。**地形/Sky曾获自主执行委托，最新F04回归由用户执行并已完成；新对话不得沿此权限重复已结束采集。** 后续必要设备操作按当前明确委托和工具能力执行，用户操作时Root不并发输入。真正只能由用户完成的系统/外部动作准备具体对象后后置，不凭等待假定成功；其它模块仍沿原授权。

历史已验证热点与随后WLAN两种通路；当前IP/接口/端口/PID只认实际读回，最新状态归HANDOFF。不要为套旧模板改变网络或VPN/TUN。独立真机调试窗口承载服务，有效连接先复用；微信调试、业务API和USB是独立通路，任一成功不能替代另两项。

### 当前委托下的准备、操作与核验

| 责任 | 必要结果与分工 |
| --- | --- |
| 现有局域网与出口 | Root核当前地址、实际手机路由和所需域名/下载入口；只有使用热点时才核其现有共享出口。失败先分业务服务、LAN、DNS与出口，不把旧热点当必须恢复的拓扑。保VPN/TUN、凭据及无关共享；系统不可代办动作后置为最小步骤。 |
| 业务API与真实数据 | Root沿现有owner核源码、实际监听、账户/数据库、所需版本及资源；开始目标观察前确认当前API仍ready且代表测试点/资源真实可取，不能沿用旧启动/HTTP回执冒当前健康。实际失效时先恢复原数据库进程和API，不重种数据/新建副本/重放提醒；恢复后读当前手机HTTP及代表业务结果。开发profile与正式资格分开，不用fixture/空页/App替代目标负载。旧USB桥不是恢复命令；防火墙仅在实际需要时精确处理，保原保护和恢复回执。 |
| 完整候选和项目 | Root核源码→完整WEAPP→准确项目→手机候选及配对数据。保API与Sky资源origin、当前开发候选private的bigPackageSizeSupport；开发大包开关不改正式预算。仅实际构建输入变化才重编，保冻结代/全部原件/用户数据，不重建gen34。只保必要项目入口，关闭前核同步；source maps缺失如实保留，不虚构TS位置或无因重建。 |
| 真机调试与LAN | 地形/Sky当前委托由Root核准确项目与实际LAN并接手必要操作；有效连接不重连。核同一手机、实际peer、消息和当前页面，Wi-Fi字样、绿色状态、QR、USB、loopback或模拟器不能替代LAN证据。工具不能完成的人工动作后置。 |
| 测试与导出 | 只针对会改变决定的缺口明确起始条件、动作、停止条件和保存目录，在授权范围内完成；F04不需要Profiler或Heap。确需采集时一次只开所需工具，原始文件在Git外本地保存，不覆盖、不上传；用户临时接手时停止agent输入。 |
| 分析与后续 | Root验证文件可解析、目标与负载覆盖、事件/计时/栈的真实含义和缺口，再归因到责任owner。重用有效记录；连接、导出、归因、修复和产品验收分别结论。源码修复后仍须正常运行下核实际效果，OOM不因连接成功而关闭。 |

用户操作期间Root不并发点击、导航、ADB输入、切Profiler、刷新/remote或关闭窗口；只读观察也避开干扰采集的高开销操作。只做无干扰的主机准备、现有数据分析和必要状态读回。用户保存后由Root读本地文件，不让用户读CPU图或负责整套故障定位。

### 已获委托的agent操作边界

有效连接先复用。需要新连接时，已确认同账号、手机微信前台及移动目标才用官方`remote --auto`；账号不同/未知或自动入口不可用则保同候选，人工扫码等依赖后置，不切账号。USB只选择ADB观察设备，不决定微信推送目标；`auto_preview`不是真机调试。授权范围以最新明确委托为准，不能扩到无关模块。

自动接入已在本机自然断连后成功，证据见[本轮记录](PERFORMANCE-ENTRY-20261026.md)；但IDE重开后也曾选到VPN地址并回退广域网，不能假设LAN/IP会继承。新会话核实际目标、选择和LAN；错误时按界面修正，不能修正才交用户同候选二维码，不改VPN或放宽防火墙。命令超时后仍可能继续启动，先读实际窗口/手机结果，不立即重发。账号规则复用[现有owner](../../../project_context/areas/main/verification/wechat-device/development-feedback.md#account-routing-and-automatic-delivery)。

### 采集条件与判断

- 监听随QR/连接阶段重新识别：从当前独立窗口和实际程序找端口/手机peer，不套旧端口或英文程序名，不要求开放全部IDE内部端口。
- CLI/结构化SDK/CUA截图输入/USB/调试传输/产品故障分别判断；已有有效手机和消息连接时，工具截图失败不触发重编、换网或remote。按[性能方法](../../skills/starward-miniapp-development/references/performance-investigation.md)有界恢复。
- 保候选、数据、视野/时刻、Storage和缓存条件。正常Play保完整BSC/实际加载SAO、地景与accepted身份；停止由实际用户/产品控制，不由模型或宿主延迟控制。暂停后排空和退出应进入记录。
- 原始profile解析、有效目标/动作覆盖完成才称取得数据；请求完成、JS、native绘制和截图首见分开解释。缺字段/映射是未知，不能冒零或精确FPS。已有Heap基线不重采作资格证明。

<a id="operator-checklist"></a>
### 一次交付用户的本轮采集清单

本批用户已完成A/B/C并另交extra，四份均已保全和解析；结果见PERFORMANCE-CAPTURE-ANALYSIS-20261026.md。以下保留为已执行清单和后续有依据补采的模板，不是再次要求用户重录。已有夜光首开Performance和有效Heap原件直接复用。A定位图层供给/覆盖与手势接管成本；B定位Sky进入、正常Play、暂停排空和退出的CPU/事件成本；C补当前正常Play的函数级分配来源，区分需要优先检查的分配责任。C有独立待决问题，不是Profiler资格测试，也不能证明泄漏或完整native/GPU/OOM根因。已保存的新文件先由Root检查，不能要求重复录制来凑全套。

**共用准备。** Root先核当前业务API与代表点可取，并给出准确项目、当前热点IP和绝对保存目录。用户让手机连电脑热点，保USB和VPN/TUN；有效真机连接直接复用，需要连接时由用户启动、选择LAN/当前热点IP并扫码或自动接入。独立“真机调试”窗口留开。Performance勾选Screenshots，保持现有Storage/缓存、数据和画质条件。Ctrl+E开始/停止，Ctrl+S保存，界面按钮同样可用。一次只运行一个Profiler；局域网失败/回退WAN/断连先处理，不冒LAN基线。

**A．层叠覆盖与手势（layers-pan-<日期>.json，Performance）。**

1. Map选择已准备且位于数据覆盖范围内的测试观星点，保光污染开启、地形关闭，等初始覆盖稳定。
2. 开始录制；开启地形，等有效覆盖，再关闭图层面板。
3. 短拖动一次、松手，等最终覆盖；再连续拖动约3秒、松手，等最终覆盖。注意拖动中旧覆盖是否保留、松手后细节是否补齐。
4. 再拖动一次，随即缩放一级，模拟加载中视野再次变化；等最终覆盖与细节。如果响应已很快，不人为限速或反复制造在途状态。
5. 打开My后返回Map，等恢复；停止录制并保存。当前云量无可用数据，跳过，不用空结果测云性能。

**B．Sky正常播放与生命周期（sky-play-<日期>.json，Performance）。**

1. 回到同一测试点的Map，开始新录制，再进入云观星，等真实非空星空出现。
2. 打开菜单→时钟面板；点右侧播放三角，按实际经过时间约10秒后点同一按钮暂停。显示时刻不推进也不延长或反复点击。
3. 等暂停后的目标和画面稳定，再正常返回Map；等Map恢复后停止录制并保存。记录时刻是否推进、暂停后是否能稳定、退出是否卡住。

**C．正常Play的内存分配来源（sky-play-allocation-<日期>，保留工具导出的扩展名，通常.heapprofile）。**

1. 确认Performance已经停止并保存；从同一测试点重新进入Sky，等星空稳定并打开时钟面板。本段先完成进入，避免把入口初始化分配混为Play分配。
2. 电脑独立真机调试窗口切Memory，沿用当前手机VM，选择Allocation sampling（分配采样）；保默认采样设置，点击Start。
3. 手机正常播放约10秒→暂停→等画面稳定，再静置约5秒。
4. 保持手机仍在Sky，电脑点Stop；选择左侧本次采样结果的Save保存原始文件，再退出Sky。停止点保留在Sky，避免先退出让默认存活分配采样丢掉要看的工作集；不能把样本直接当总分配量、强保留链或泄漏证据。
5. 本段不同时运行Allocation instrumentation on timeline、Heap snapshot或强制GC；若Start/Stop/Save实际不可用，记录失败控件并结束本段，不临时换重型Profiler。操作参考[官方函数级分配采样说明](https://developer.chrome.com/docs/devtools/memory-problems#investigate-memory-allocation-by-function)，微信目标覆盖仍由实际导出确认。

**统一停止与交付。** 等待阶段约15秒仍没有有效结果，记下卡住阶段并结束该段；这是防止无界等待的操作上限，不是产品性能预算。断连时停止手机动作，能停录导出就保存并加-interrupted，保窗口、热点/VPN；由用户重连，只有明确委托才由agent代办。若Sky始终不能进入/正常Play无法执行，保失败记录并跳过C，不循环重试。

三份原始文件各保存一次，文件名已有则加序号，不覆盖。附简短文字：A覆盖/手势/My恢复哪步卡；B时刻推进/暂停/退出是否正常；C是否成功导出；断连发生在哪一步。用户无需读CPU图、逐帧计时、另导Network/HAR或上传原件。Root读取本地文件、验证可解析和真实目标/负载覆盖，再分析归因。此清单是当前已确定的完整采集批次；修复后的对照或新的具体缺口另有依据才补测，不承诺一次采集等于整个性能/OOM验收完成。

当前地址、目录、状态和唯一下一步归HANDOFF；原始数据/实时网络/进程/规则归私有证据。采集由用户执行时Root不并发输入，不开高开销观察；会话结束后的临时共享/防火墙收尾仍归原owner。

## Historical qualification routes (2026-10-19)

1. **JS allocation attribution:** reuse official ordinary true-debug → Memory → Allocation sampling → Start/Stop → Save. The actual phone Map qualification completed capture, export and parsing. It produced 254 call-tree nodes and 21 samples with valid references and compiled script locations. Keep this route ahead of another adjacent disable/implementation-shape comparison when it can distinguish the current causes.
2. **CPU and sampled GC activity:** reuse the same target's official Performance panel. The successful short recording contains 459 CPU nodes, 114 samples and 10 garbage-collector sample hits. A sampled GC hit is not an exact GC event or pause duration. No heap-counter events were exported despite requesting Memory; the UI's 0 B is unavailable coverage, not a zero heap.
3. **Process footprint:** retain the existing foreground-owner-bound r17-sky-memory.mjs route for PSS/RSS/Swap accounting over aligned windows. It cannot identify a VM or allocator. Script/window duration is not necessarily the interval represented by every process sample.
4. **Ordinary-preview CPU fallback:** the phone capsule's Start/Stop CPU Profile followed by exact-file pull is validated for capture/export/parse. The existing sample was mostly idle/framework on a data-error page; it is not a Sky workload baseline. Use this fallback only when its ordinary-preview execution condition or lack of remote attachment answers a concrete gap.

Qualification facts, current versions, hashes and scope are owned by [PERFORMANCE-TOOL-QUALIFICATION.json](PERFORMANCE-TOOL-QUALIFICATION.json). [PERFORMANCE-TOOL-CAPABILITIES.json](PERFORMANCE-TOOL-CAPABILITIES.json) remains the historical read-only Android/package/Perfetto preflight, not the current full profiling decision. Raw profiles and before-edit records are in the existing private evidence owner at E:/Dev/Starward-data/verification/sky-map-20261018/performance-method-20261019.

## What the allocation profile means

The installed frontend starts sampling at 16,384-byte intervals without include-collected options. Its default surviving-allocation profile can attribute statistical allocation weights to call stacks. It does not measure total short-lived churn, an exact complete live heap, retained-size ownership or native/GPU allocation. Twenty-one samples establish qualification, not a stable hotspot ranking or a repair percentage. The GUI resolves compiled modules; mapping a real Sky hotspot to current source responsibility remains subsequent execution work.

The historical R17 attempt produced one initial snapshot and no valid second export. The later LAN baseline is a separate capture, not a comparable pair with that older session. For the current retaining-path question, use compatible snapshots or the needed allocation recording through the adopted primary route. Preserve GC/pause/retention disturbance in interpretation; requesting Force GC is not a product repair.

## Recorded coverage limits to retain

- This Android user-build WeChat host has no observed debuggable/profileable eligibility. Exact-target proc maps and smaps_rollup reads returned permission denied. Registered heapprofd does not change this. Do not start another empty native allocation profile; reopen only when the relevant host/system eligibility changes.
- The successful Performance export did not contain UpdateCounters or separate GC trace events. CPU samples remain useful, including sampled GC activity, but no complete heap curve or exact GC-event coverage is claimed.
- The recorded public CLI/automator package has no general HeapProfiler control. Use the official GUI's native capture/save control when the installed tool cannot perform it; missing automation is not unsupported capture. Do not add private IPC or a raw CDP bridge competing with the official channel.
- wx.getPerformance().now is callable on this target but consecutive reads showed small backward deltas. Function existence is not a monotonic-clock guarantee. The new probe contract must preserve invalid/unknown timing and cost coverage; source-level availability is not device deployment.

## Session and retrieval boundaries

Keep the successful connection and source identity. Earlier LAN failure/WAN fallback was a historical transport outcome, superseded for route selection by the later usable LAN run. Follow the [portable LAN procedure](../../skills/starward-miniapp-development/references/true-debug-lan.md), not old machine addresses or ports. CLI/SDK remote timeout does not establish cancellation, so check actual state before any retry. The official private bigPackageSizeSupport setting remains a development aid, not a package-budget or production-policy change.

The historical debugging window used tool-side Storage and had approximately 4.3 seconds of round-trip latency. That condition is not a current setting or a measure of product interaction latency. New generation, scene, target or restart invalidates affected binding only; do not blindly reissue preview or reuse an old input-authorized screenshot.

Keep raw profiles outside Git and print only bounded structural/numeric summaries. The native Android importer in this installed version pulls files and deletes phone originals. For the ordinary-preview fallback, use the observed exact file path and exact-file pull instead; do not enumerate account storage or import unrelated traces. Existing phone originals were preserved. No reset/reseed, pairing/VPN change or reminder replay is authorized by profiling.

## Sky execution under the resumed Goal

The same PLAN owns nonempty Sky sampling. Confirm the current source/bundle/mode and real workload, preserve product-owned bounded Play/Pause, align ready/play/drain, and interpret the sampled stacks before choosing a specific owner-level comparison. Confirm that remote-debug conditions reproduce the relevant symptom. The Map qualification is not Sky diagnosis, normal-path A/B acceptance or a new product performance budget. A current GUI/SDK startup failure stays at that boundary; do not repeat the completed qualification or substitute an unrelated sample.

Primary semantics: [HeapProfiler protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json), [allocation timeline](https://developer.chrome.com/docs/devtools/memory-problems/allocation-profiler), [Android profileable](https://developer.android.com/guide/topics/manifest/profileable-element), [Perfetto native profiling](https://perfetto.dev/docs/data-sources/native-heap-profiler). Current-target applicability is established by the actual captures above, not by those tool names alone.
