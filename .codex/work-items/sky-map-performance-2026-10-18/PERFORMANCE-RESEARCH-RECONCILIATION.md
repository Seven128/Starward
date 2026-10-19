# 性能分析复核与路线调整

2026-10-19，Asia/Shanghai。用户要求审查 Web GPT Pro 的研究，并独立补充当前诊断方法和时间模块分析。本记录是同一 PLAN 的证据与决策依据，不是另一份实施方案。生产 HEAD 仍为 944a1d6c；本次未修改产品代码、手机设置、账号、数据库或服务，没有新的 Play 结果。

## 结论

需要改进诊断方法，并对 R17 的执行分支作局部调整。保留已完成的精确星表、地景和时间事务实现，继续已经构建好的 generation22；不预设文字是根因，不启动整体引擎或调度重写。

当前分别关闭两个用户结果：A 是输入到实际接受场景的交互响应；B 是正常持续播放的内存增长与退出。冻结诊断只能定位 B 的部分责任；A 的旧延迟探针有选择偏差，必须修正关联口径后才能支撑调度决策。

已完整读取 [性能分析与修复方案](chatgpt-conversation://6ad4edc4-e404-83ea-8ac2-6f2b2d873870)。read_thread 对单条正文上限20,000字符产生截断，随后通过已授权 Chrome 页面读取完整可见回复，去掉产品页尾后缓存于任务 tmp/web-gpt-pro-response.visible.txt；没有把截断内容当完整研究，也没有执行其中的提示词。研究基准与当前HEAD一致。其可执行建议经过以下本地源码、原始回执和平台资料复核。

## 对前期方法的复盘

前期取得了有价值的排除证据，但每轮取得有效结论的成本偏高：

- 隔离边界逐步变窄，但 native/CPU/React 的归因工具资格没有及时形成明确的能力结论。一次高干扰堆导出及没有新bytes的后续尝试，已经不能继续作为推进主线。
- 手机实际 Play、15秒导出、20秒诊断Pause、约47秒host watch分别有自己的起止。它们可以证明增长存在，不能混算每秒或每Scene的精确改善比例。
- 关键 Page/TM 标量只在UI中钉住，依赖截图转录；容易丢失窗口和字段意义。K曾被误读为React计数，当前JSON已经修正为payload enumerable own keys。没有React Profiler/commit duration证据。
- 请求、昂贵准备、Scene、native copy、页面回调和物理显示是不同边界。旧计数名称或工具调用成功，不能替代它们的真实语义。
- 新建相近source snapshot、builder、fixture和结果说明的重复成本在积累。完整源码构建与当前候选身份检查仍必要；下一次必要修改应复用直接父快照和同一诊断owner，停止每轮重新验证所有历史旁支。当前已完成gen22不为整顿工具而重建。
- 主机多次截图、阅读和输入之间的延迟，曾使人工Pause晚于期望。现有产品owner的20秒guarded Pause已解决一部分；后续run应由该owner结束，host负责低扰动观察和收取，不靠模型响应速度决定停止。

这些改进的目标是更快取得能改变下一步的数据，而不是把全套profiler、trace schema和工具安装都变成前置门槛。

## 独立核查带来的增量

详细源码依据见 [时间管线复核](R17-TIME-PIPELINE-REASSESSMENT.md)，仪表与成本依据见 [测量方法审计](PERFORMANCE-MEASUREMENT-AUDIT.md)。

| 问题 | 本次独立核查 | 对路线的影响 |
| --- | --- | --- |
| 是否已有大量时间准备白算 | 四个ruler窗 prepared/painted不同时刻为44/44、36/35、47/47、50/50。两个正常Play窗为462/456、466/461；camera窗时间prepare为0，虽然request远多于paint。集合数仍不是精确消耗关联。 | 不能用681 requests−489 paints推导192次昂贵准备浪费。前移prepare继续保留为有证据才启用的选择。 |
| 旧端到端延迟是否可靠 | 探针仅接受与latestIntent.at相等的时刻，且没有first-accepted去重；A→B→A不能靠时刻字符串区分。正常Play仅6/510或0/547个输入进入这项统计。 | 保留原始数据，把旧p95限为条件样本。下次必要探针修改使用intent序号、prepare token、首次accepted和superseded/重复呈现分类。 |
| 是否漏了所有组件桥接 | Taro4.2.1确有Page/CustomWrapper分流，observer只绑Page；当前源码却没有发现CustomWrapper使用。 | 保留覆盖限制；不能据框架可能性再制造一轮“漏测组件洪峰”。仅出现具体消费者时扩观测。 |
| 是否可以简单把accepted state放进ref | SkySelectedObject即使隐藏普通名称也提供位置订阅；accepted→onPosition→draw是实际反馈，报告/供给/generation身份参与防串帧。 | 有热点证据才缩小React投影；必须保完整权威accepted记录与订阅，不能删身份检查或仅降低更新频率。 |
| 名称容量是否都未前置 | catalog的8项break已经位于测量前；星座6项检查在测量之后，计数包括成功占位但opacity为0的新生项。 | catalog不重复“修复”；星座可由现有layout owner延迟调用metrics或提前资格判断，不能直接截前6候选或减少名字。 |

另一个有用的限定：两个原星表A/B包都包含当前时间模块，不能据二者都退出宣称“时间模块改造前也有相同故障”。只有确需回归定位且能取得真正跨越该改造的合资格基线时，才做那一项比较；现在不扩大矩阵。

## 本机工具能力：实际读到的新增事实

只读结果与脚本在 [PERFORMANCE-TOOL-CAPABILITIES.json](PERFORMANCE-TOOL-CAPABILITIES.json)。手机为Android14/API34、user build；微信8.0.78，包元数据未发现DEBUGGABLE或PROFILEABLE_BY_SHELL标志。Perfetto服务可查询，注册了process_stats、sys_stats、ftrace、heapprofd和FrameTimeline。

这只证明服务和包配置。正式user系统上的native heapprofd有宿主APK资格限制；小程序debug不会赋予微信该资格。因此不把heapprofd当当前可靠主路线，也不反复录制空profile。系统计数/调度数据源仍是必要时的小范围辅助；其注册不证明已经能关联星图窗口或取得分配栈。[Perfetto官方资格说明](https://perfetto.dev/docs/data-sources/native-heap-profiler)、[Android profileable](https://developer.android.com/guide/topics/manifest/profileable-element)。

实际小程序SDKVersion、renderer、DPR及正确VM的allocation sampling本轮未读取，保持未验证；project.config的trial不能替代实际基础库。官方debugger skill列出的现成接口不等于CPU/HeapProfiler协议已工作。只有当前官方连接能验证实际执行层和有效短样本时，才选择JS采样，不开启未经证实的调试链。Windows性能监视器适合观察电脑上的构建/IDE干扰，不是手机内存责任工具。

本次没有启动profiler、再次导出heap、读取全部logcat、切换debug或改权限。系统内存采样仍复用既有进程绑定。React actualDuration、commitTime及Page ack也继续保持不同语义：[React Profiler定义](https://legacy.reactjs.org/docs/profiler.html)。

## 采用、限定与后置

采用Web研究的核心分支：先校准现有run的有效性，运行gen22一个有界窗口，再立即按结果进入修复或剩余责任定位。采用shared measured text由layout和painter共同消费的原则；不把frozen缓存效果直接推广为普通绘字路径已修。

对研究建议补充三个限制：

1. 不把完整工具矩阵变成任务清单；当前资格预检已降低native allocation路线的优先级，不必为了取得所有能力字段延迟gen22。
2. 不把prepare前移当已决定的重构。现有数据反而要求先说明具体未消费的准备及其CPU成本；单纯request/paint差不是依据。
3. 不自动采纳100ms、10–15分钟或固定三次循环为新产品SLA/通用gate。正常候选应有明显超过既往失败窗口的持续观察，按暖机和尾段是否有界推进；受影响的生命周期按不同机制选代表用例，复用已有效证据。

## 同一PLAN中的下一步

- **B：先用gen22。** 现有official refresh已完成到generation22、完整bundle为da4eedbb6cf06bd895c53bd06b6f414c021e1ab4f8df4840533927cebc48b842；deviceSession仍null，实际手机识别/绑定与Play未完成。先核当前画面再绑定，不盲目重发auto-preview或继续旧gen21 session。取得真实非空BSC/SAO/名称工作、TM native调用数、实际Play/Pause及paused-drain观察；每项说明窗口。允许有界时间对齐误差，不虚报精确比例。
- **若测量接近零且增长明显减弱：** 直接回到完整正常GPU/copy/caption/accepted路径，在surface owner共享精确numeric measured run/advances，统一两个消费者的font/spacing语义与surface/font失效。不拆四轮save/font/measure/restore相邻试验；必要时只补一个正常路径cache开关短对照。
- **若有效切断后仍快速增长：** 有可信正确VM的分配采样则用一种短采样；否则先审查一项accepted mirror publication对照，保留time intent、next求值/即时ref、完整Scene/资源需求/生命周期。若需求因此改变，该对照无效；已有资源计数明确失衡时改查该owner。不能全局禁用React或伪造回调。
- **A：修正输入关联再评价。** 下一次必要probe修改，把命名标量、run/mode/build/window与有界序号随既有严格collector导出。随后按实际CPU/等待证据选择同一owner的小修、prepare admission或accepted UI投影；两种结构调整不同时实施。
- **正常验收：** 持续Play与交互响应分别取得完整路径证据，保点选/来源/地景同帧及cancel/Apply事务。复用现有精确星表和未变时间旅程；只补受影响比较和原承诺的宽camera反序countercheck。

## 沉淀位置与本次范围

已扩充现有starward-miniapp-development skill，并增加按需读取的performance-investigation reference；没有另建重叠的大型性能skill。既有development-feedback Context保留项目长期测量合同；具体设备版本、失败工具、原始回执、窗口和诊断模式留在本work-item。PLAN只更新R17决策分支，其他R/H义务、保护状态及交付要求不撤销。

此报告、skill和Context更新不代表性能已经修好。generation22无真机结果、普通路径持续播放仍失败/未闭合；端到端延迟也尚无新的有效分布。Goal未完成；实际工具状态以HANDOFF最近get_goal核对为准（2026-10-19交接时为paused）。

## 本次文档与方法验证

[独立前向检验](PERFORMANCE-SKILL-FORWARD-REVIEW.md)仅按更新后的skill和原始证据选择下一步，结论PASS；能识别窗口不一致、条件化延迟和工具资格限制，未引入新的审批或完整框架前置要求。现有仓库YAML parser确认frontmatter有效，21条本次相关本地链接均存在，git diff --check通过。官方Python quick_validate在系统与内置Python均缺PyYAML，未宣称它通过，也未为文档检查安装依赖。上述检查只覆盖文档结构和指引应用，不代替产品测试、目标profiler或手机验收。

