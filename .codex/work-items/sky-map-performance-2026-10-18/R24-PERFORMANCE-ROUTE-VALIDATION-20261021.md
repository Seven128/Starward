# 性能观察替代路线：实际资格与决策价值

2026-10-21，用户要求研究并验证真机调试之外的可用方案，并进一步澄清：**目标是足够详细、能帮助排查当前性能问题的信息；快照或函数录制是例子，不是必须取得的格式。** 使用原性能方法，按待决原因选择有区分力的观察，原完整 Goal 未完成。

## 真机调试卡点

用户实报的顺序为：进入高内存云观星场景 → 往返耗时升高 → 连接方式成为未连接；手机仍能正常运行和操作。Stable 同 r22 对照由 UIA 与官方 `Remote debug connection lost` 交叉确认，在 Heap 基线之前停止。没有把高内存关联定为断连原因，也没有把这次断连定为 OOM。具体终态见 [Stable 记录](R24-STABLE-RESUMPTION-20261021.md)。旧版本、Heap/Timeline 和原生快照失败不再重复。

链接对话 `6ad8bae3-0f6c-83e9-b030-1ab1366888ef` 的读取接口仅提供回答引用，Chrome 页面也显示两条回答无法加载。用户随后粘贴了完整建议，已实际阅读；不再要求提供。采用其中“调试链路与产品退出分开、选择实际 Appbrand 进程、普通运行与调试扰动分开”的有效部分。其固定四组各两次、5–10轮及日志/disable 变体不是本任务必须重做的清单。

## 实测结果

| 路线 | 当前资格 | 能回答及不能回答 |
| --- | --- | --- |
| 既有普通预览 manual-input → 本机 collector | **当前 r23 真机已采集、自动导出、严格解析与独审通过；对 A 的具体决策可用。** 2秒正常日减长按，15,012ms封存，实际 BSC/SAO 消费非空。 | 能关联真实合法输入、geometry发起/取消/验证/准入、准备、绘制与5个首accepted；已确定本样本无过期发起。部分渲染关联、完整SAO加载和内存保留原因仍未覆盖，不能作为全部产品验收。 |
| Android Perfetto，普通 r23 Sky | **实际采集、导出、解析与独审通过。** 已在原手机、264.4°地景 Sky、未连接真机调试器时取得目标数据。 | 能区分线程实际运行/睡眠并观察同一进程 RSS/anon/Swap。当前证明一个 JSRuntimeLooper 持续占用 CPU；没有对应到具体 isolate/业务函数、没有目标 FrameTimeline，也不说明对象为何被保留。 |
| 既有前台 owner 绑定的 ADB meminfo | 已有有效历史路线，复用，不新增同质采样。 | PSS/native/graphics 等可判断实际进程压力及阶段变化；不按 appbrand 槽号猜目标，不把 Dalvik 当 JS 或把 PSS 加上重叠的 SwapPss。当前这层资格不需另装同类工具才能成立。 |
| 手机普通预览本地 Start/Stop CPU Profile | **本次没有成功导出，不可用；挂起的测试进程现已精确退出，旧采集已终止。** 原正常 Sky CPU 与早期原生导出的历史资格继续保留各自范围。 | start toast、两次Stop请求均没有新可解析文件；随后按实时前台身份只结束该Appbrand测试进程，实读旧PID不存在、微信主进程保留。用户重新打开缓存r23，新进程/标签确认后才进行本次manual采集；没有重按Start、Heap或Force GC。 |
| PerfDog、wx 公共 API、旧 Trace/模拟器 | [一手资料研究](R24-PERF-ALTERNATIVE-RESEARCH-20261021.md)保留适用性及限制，未冒充当前设备实测。 | PerfDog 可观察小程序子进程，但当前权益/本地导出策略未验证，且未发现比本次系统观察更能解当前剩余原因的能力证据，因此未安装/登录/上传。wx 条目/告警按具体问题采用，不能仅因有指标就判足够；模拟器反例只能覆盖可复现的相应代码路径。 |

## Perfetto 有效样本

私有 owner 为 `device-resume/r24-independent-20261021/performance-alternatives`；原件 `r24-system-1792589969717.pftrace`，6,572,727 B，SHA-256 `7639aa2eda560ec7924e1f7b1acde58b713eeb61076597ae071f52d885b7bcd6`，手机/本机读回相符。使用官方 Perfetto v58.2 本地解析器，没有上传 trace。采前、采后的实际前台 Activity ProcessRecord 相符，trace 对应进程实例唯一；复核见 [独审](R24-PERFETTO-INDEPENDENT-REVIEW-20261021.md)。

- 配置 20 秒、16 MiB ring buffer，1000 ms process_stats、sched_switch/sched_waking、MemAvailable 与 FrameTimeline；服务实际开始至停止约 20.011 秒。trace_bounds 22.642 秒包含其它时间范围，不当负载时长。
- 同一目标进程有两个同名 JSRuntimeLooper：一个 85 个已闭合运行片共 **19,041.44 ms CPU**，另一个约 210.25 ms。独审确认不是睡眠时间；未闭合尾片排除。不能据线程名把两者指定为某个逻辑层或 V8 isolate。
- 21 点内存跨度约19.459秒：RSS 1241.176–1333.191 MiB、匿名 RSS 662.809–754.824 MiB。值由 bytes 换算；不是 JS 堆、不是 PSS，也不是单一操作前后差或泄漏结论。
- 目标 FrameTimeline 为0；已报告 error/data_loss 为0。单指拖动发生在采集附近，但没有足够输入时间锚点严格绑定到 trace，不把样本当一次拖动延迟或稳定空闲基线。
- 第一次配置文件读取被 Android 权限拒绝，在确认没有活动 trace 后定位为配置传递边界；改用官方支持的 stdin 即完成。没有提高权限、root、关闭 SELinux、改 VPN 或重复原生分配资格失败。

此数据已把“CPU忙碌还是等待”细分到真实线程，但还不足以选择业务修复。后续只补能识别该线程责任或区分当前业务/既存平台工作的观察；无须为了形式补全另一份全堆。

## 本地 CPU 请求与现场限制

本次在可见 r23 全天空 Sky 发起本地 CPU 请求。返回胶囊菜单时，菜单横向位置重置，root 对旧位置的判断错误，非预期触发重新进入，回到 Map；这不是产品自行崩溃证据。此后观察到菜单仍为 Stop CPU Profile，发出停止和一次带录像的终止请求，没有新可解析输出。包含场景切换和较长等待，不把该请求冒充受控短 Sky 基线。

仅在已知 Appbrand trace 导出目录内，按与当前 prepared AppID 相符的 CPU 文件前缀和当前时间范围查询，没有读取账号存储或其它应用资料；当前匹配文件为0，旧CPU原件字节/mtime仍未改变。必要 start/stop 请求时间、视频、截图和窄回执本机保留。

挂起状态持续后，root以实时 RESUMED Activity ProcessRecord 和进程名核对目标，通过Android公开 `am crash PID` 仅结束该测试Appbrand。随后核得旧目标absent、微信主进程未变；人为恢复不计产品崩溃。普通auto-preview重推被自动审批拒绝（仅返回blocked by policy），未换入口绕过。用户已从最近使用打开缓存开发版，root核实新进程及r23可见标签、全天空地景后继续。原账号、存储、草稿、配对和VPN均保留；回执在私有 `native-profiler-recovery.private.json`。

## 当前普通 Sky 已测通的有用数据

沿 [现有采集入口](R24-SKY-OBSERVATION-READINESS-20261021.md) 执行一次2秒日减长按，正常释放，未启动Play。原件紧凑31,662B，落盘格式化55,934B，SHA-256为 `4eb764bd252aa7a028934d15bf9b6b4eccc5485e6f47d85032c1043a46464648`；当前严格validator通过，normal/gen27/source36fa8bd0…匹配r23准备清单。原件、私有分析脚本/JSON和动作视频只留本机。[独立审阅](R24-SKY-CAPTURE-INDEPENDENT-REVIEW-20261021.md)已逐项核对producer、事件和覆盖。

实际最大FOV264.355°且地景开启，BSC8,404行、SAO2,675–2,842行，两者submitted与accepted消费者都非零，30次真实Scene完成、无synthetic publication。手机此前有暗星失败提示；临时本机桥沿既有32条有界观察增加sao-index/sao-asset分类，证实当前手机asset请求返回200。非空SAO纠正“全部暗星都未加载”的猜测，但不能证明全部tile就绪。服务器哈希/schema有效，失败仍在客户端响应后或准入责任，不能据此改polyfill：同一SAO索引路径此前已成功使用throwIfAborted，没有方法缺失的现场证据。

| 当前已回答的问题 | 数据与决定 |
| --- | --- |
| r22修复后仍有过期geometry发起吗 | 完整60事件覆盖17调用，0过期发起、5次当前准入、0旧准入、无pending/丢弃/导出省略。7个完成时已被取代的响应均未准入；本样本不再支持继续追同一过期发起缺陷。 |
| 输入等待在哪 | 5个已关联首accepted为289/128/137/111/209ms；最后一条包括28ms到call、49ms到验证、37ms到hook、54ms准备完成到paint、40ms paint到accepted。供给和绘制前等待分别存在，不能统一叫网络慢或由同一帧证明React因果。 |
| 需要迁移准备owner吗 | 17份未消费准备的known subtotal仅1ms、另16份低于分辨率；数量本身不支持架构改写。draw墙钟p50=24ms、p95=51ms，结合既有CPU/r7映射继续定位绘制责任。 |

限制必须随结论保留：14个renderer request和10个accepted缺intent关联；A correlation只保留首4末4明细；Date.now有效分辨率未知；当前vConsole/debug开关仍开启；SAO有部分失败。不能与r21直接宣称同条件净收益，不能把accepted当物理present、将15秒计量当15秒连续输入、或宣称六字段/Play/泄漏已验收。此路线已经能回答A的具体问题；内存B仍需错误保留owner或native生命周期的有区分力证据。

已将测通的普通预览关联和Perfetto本机采集/解析方法回写 [开发skill性能分析](../../skills/starward-miniapp-development/references/performance-investigation.md#ordinary-preview-observations-when-remote-debugging-drops)。数值、版本、在途状态和失败原件留在本任务，未写成通用预算或强制profiler门槛。

## 日志假设与下一决策

当前源码及 r23 冻结 Sky 生产路径没有直接的逐帧 `console.log/info/debug` 或整份报告/大数组输出；任务计量 runtime/observer 也没有这类 console 输出。公共 `runtime-error.ts` 只输出白名单标量，并按 Error 身份去重，但持续产生不同错误仍可能反复记录。本次 Map vConsole 的少量403和 WindowInfoChanged 警告，不证明高流量或链路过载；没有据此关闭错误恢复日志或重做真机调试。

按用户澄清，验收的是信息对排查的充分性：已能区分的原因不重采；尚未分开的原因保留具体问题。A 继续由现有 intent/prepare/accepted 与真实输入结果约束；B 的剩余问题是增长由哪个有效/过期 owner 维持、是否属于平台/native资源及退出回收，不是无条件索要某一种图。优先复用 r7/source mapping 和现有生命周期边界；只有有界 owner 观察能区别竞争原因时才补采，失败工具不成为独立修复的统一门槛。

本轮没有新产品代码变更、构建、commit/push、数据上传或新 worktree；仅扩展任务桥的既有有界路由分类并重启其确切owner，必要本机解析工具置于私有 owner。保留原账号、N05、R6、配对、VPN/TUN 与全部未提交成果。两项重点及完整 Goal 仍未完成。
