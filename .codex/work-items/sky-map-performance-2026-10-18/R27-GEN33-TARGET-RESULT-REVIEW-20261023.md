# R27 gen33 目标样本独立审查

2026-10-23。仅独立读取源码、冻结包、官方结果和私有原件，新增本报告；未操作手机、DevTools、预览、服务、构建、网络或 Git，未改产品、PLAN、HANDOFF、INDEX、冻结代及私有原件。没有另行委派。采用当前开发 skill 的性能调查方法，承接 UI → 叠层 → Sky 的顺序，不以本观察关闭前序义务。

## 结论

**本轮原 8 个 aggregate 与创建 render 的 fine-target page queryFn、原 wrapper、Query 弱见证关联可信；得到有限阴性，未找到 aggregate 的最终持有根，也没有内存修复结论。** 未发现会使这 8 条关联失效的已确认 P1/P2。

active-5 与首次 drain-10 时，8 个被选 wrapper 全部已收集。因此，经过这些具体 wrapper 的 `Query/options → wrapper → pageFn` 链不能是当时 5 个旧 aggregate 仍存活的持有链。5 个 pageFn 与 aggregate 同活只是相关性；没有测出 `pageFn → aggregate` 强边，也没有测出其外层强 owner。`Query alive/inCache:true` 不证明缓存增长或泄漏，`currentOptionMatches:null` 不等于 false。

现有已验证入口**没有匹配到这些幸存 pageFn 的实际强 owner**。R26 明确跳过函数，R27 对这 8 个 wrapper 的分支已回答。不得据此改 Query GC、创建相邻 disable 变体，或继续循环新一组回调弱寿命采样。

## 实际核验的输入与身份

完整读入并核验私有 owner：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/r27-packaging-recovery-20261023/gen33-checkpoint-originals`

其 `preservation.private.json` SHA 为 `a3ad8076d3dd503c7da0ee93e2ac4b6076a8005f89883dd6b1da9b8f55e0ab50`。清单中 9 件、164,435 B 的实际大小与 SHA 全部相符，包括 6 个 checkpoint、metrics、terminal 和 watcher 原件；不是仅复读汇总。6 点通过当前 `validateR27MemoryCheckpoint`；metrics、terminal 及两者 match 均通过当前 normal-input 协议。未重跑测试或工作负载。

| 身份 | 独立读回 |
| --- | --- |
| generation / source | 33 / `ca679bcc8c924e01855b0e3ba956716401499595125c3351f7a0d2d60777c5dc` |
| manifest SHA | `5607f9a3c9ad66e4d95dda38d33262a962563bd1f8e10cd57945cc1c39f99c29` |
| source snapshot SHA | `02f59f62ff9e95196b9af6cffb46dde0dc51bfa3316ad3f21da719e806676409` |
| bundle | `42db0d73b829e3fc611ad081dbf7ded7f84e90eeef2afac1e9d4135b1dfbae0d`，344 件 / 5,117,627 B |
| 源码 binding | 当前生产 1599 件、冻结源码 1616 件、50 份当前模板逐件 hash 相符；`sha256(JSON.stringify(bindingInput))` 与 source 相符 |
| bundle 副本 | build、固定 trial/project/weapp、私有保留的手机 generation/project/weapp 三份完整 fingerprint 相同；反馈与 USB session 的 bundle/fileCount 绑定一致 |
| memory / metrics run | `r25-1-h1dpgx` / `r17-1-aktnfswg98` |

读取了项目 AGENTS、global/manifest、开发 skill 与完整性能方法、相关架构/测量 Context，以及 [callback owner 调查](R27-CALLBACK-OWNER-REVIEW-20261023.md)、[集成](R27-QUERY-CALLBACK-INTEGRATION-20261023.md)、[包恢复实施](R27-SKY-PACKAGE-RECOVERY-IMPLEMENTATION-20261023.md)、[gen33 构建](R27-GEN33-SKY-PACKAGE-PREPARATION-20261023.md)。再核实际冻结的 observer/links/ports/adapter、共享 hook、页面/SAO resolver、time owner 和原生产消费者。旧文档中的“尚未激活”属于当时状态，不覆盖本轮真实原件。

### 官方实际准入与一个包体风险

私有保留手机反馈中的 `.official-process-24c0bf76-8823-4e77-bbff-ac346a0fee34.json`，SHA 为 `1bef9dd62333d1a805faa28c0834daecbe2a2171d8c503f56e7eb109935f679c`，外层 schema 是 `starward-miniapp-official-process-diagnostic-v1`，`encoding:"base64"`。按 encoding 解码 `stdout` 为 UTF-8 后 JSON.parse，得到：

- `$.ok = true`、`$.tool = "auto_preview"`、`$.result.success = true`。
- `$.result.info.size.packages` 中 `name === "main"` 的 `size = 2095323` B；total 为 5,106,925 B。这是官方返回的大小，不是本地源文件和。
- 外层 exitCode 0、signal/errorCode null、truncated false；stdout 621 B + stderr 55 B = retained/observed 676 B。两个通道合计才是诊断总字节数。

对照同入口已确认的 2,048 KiB main 阈值，官方 main 仅剩 **1,829 B**。这不推翻本次成功，也不是新的拒包；它是本冻结诊断包的后续改动风险。本地 60,685 B 余量不能当作官方余量。报告不要求回去修改或重建此冻结代。

## 目标工作与时间覆盖

实际查看保留的两张完整原始 PNG，并核对各自 metadata/大小/hash：

- `575b8daa-fd30-47dd-b6de-7bb18f6d7bee`，UTC 05:22:40.787，SHA `8824cf0e821341de5befdd8e1cdeb163a4125a304dad376654348178f7da525b`：正式隔离点 Sky，264.4°、非空星图，正常时间面板 20:18:38 和 Play。
- `2e459854-49e8-4d5f-a7e3-542a60cf9157`，UTC 05:24:17.166，SHA `5c704c93360fa57b061dc58c8ccdc29862e98f82e1dba864eaf174465ba86aa7`：同一界面已到 20:18:58 预览，Play 图标恢复。截图未提供精确 Pause 时刻或持续流畅度。

metrics 的真实视域为 384 × 796.800048828125，FOV 始终 264.3550889449854°；BSC rows 8404、实际已加载 SAO rows 2842、selected tiles 105。记录窗口有非零 BSC/SAO 提交和 accepted：acceptedCopies/sceneFinishes 各 253、failedFrames 0；acceptedBscObjects 1,181,504、acceptedSaoObjects 10,373。页面保留默认地景启用及完整原消费链；这里不把图片可见或资源 200 单独当作已绘工作。`scene.modes:["DAY"]` 是产品显示模式记录，不是“白天天空无星”的证据。

metrics 实际计数窗口是 startRelative 1110 → seal 15182，即 14,072 ms；不是整段 20 秒。正常产品 actualPlay 1 次；terminal 记录同 run 的 pauseAttempt 1 / pauseSuccess 1，成功在其时钟 20192 ms。冻结 controls 的 20 秒 timer 经原 `pauseCurrentRun(runStartAt)` 和页面 same-run/可见状态 guard 调用原 Pause；time owner 的真实 PLAYING 退出才触发 memory Pause。`r17NormalProductPlayStarted` 同一次 receipt 内启动 metrics 与 r25 memory，关联来自这个 owner 和相符 source/generation/单次事件，不是强行把两个 runId 改成相同。

| sequence / phase | checkpoint relative ms | callback 真正观察时刻 ms |
| --- | --- | --- |
| 1 baseline | 0 | 无 |
| 2 active-5 | 5097 | active-5 / 5097 |
| 3 active-15 | 15187 | 仍为 active-5 / 5097 |
| 4 paused | 20187 | 仍为 active-5 / 5097 |
| 5 drain-10 | 30189 | drain-10 / 30191 |
| 6 end | 90007 | 仍为 drain-10 / 30191 |

clock 为 Date.now wall-elapsed，invalid/backward 均 0、有效分辨率仍 null；不升级成单调高精度时钟。checkpoint 与 queue 中的后续 clock 读取存在几毫秒顺序差，不是新观察 phase。**owners 的 aggregate 寿命在各 packet 重新读取；queryCallbacks/framework 仅两次观察。** 因而 end 可以说明这 5 个 aggregate 在约 90 秒仍可读，不能说明 pageFn/wrapper/Query 也在 90 秒重新观察过。

watcher 在 Play 前已耗约 36 秒，120 秒窗口只保存 5 点到达；其末条为 hostWatchElapsed 66,600 ms 的 drain-10。第 6 点随后已真实独立读回且本次再通过 hash/协议。不能写成 watcher 实时见到 6 点或拿文件顺序构造精确跨主机时钟关系。

## 关联与诊断计数为什么仍有效

冻结代码先在原 SAO resolver 创建 `resolved` 后由既有 stellar owner 分配原 ID，再让 callback observer 查询同一弱 ID。页面 begin、fine-target pageFn、共享 hook 原 wrapper/实际 provider Query、aggregate、三个真实 return 的顺序不新增页面词法块或回调包装；回调登记函数均返回原函数。新 ports 只保存固定诊断方法，没有产品回调/帧强历史。

实际 8 样本是 aggregateId 1–8，对应 renderId 2–9；全部 `association:"render"`、`renderCompleted:true`。outsideRenderAggregates、missingPageCallbacks、unscopedCallbackCalls、unterminatedRenders、duplicate*、missingQueryOwners、invalidCalls/Ids、lookup/ref/ownerRead errors、overflow 均为 0。renderCompleted 表示原 render 返回已走 end，**不是 React commit 证明**。

`finishWithoutRender` 不是失败 render 数：

- active-5：begin 70 / finish 70 / finishWithoutRender 61，只有 9 次 finish 带已建的 current 槽；page callback/Query owner 各 9、refsCreated 27，与这 9 组对应。凑齐原 8 aggregate 后，begin 仍计数却有意不再建 current 槽，其后 finish 因而计入 withoutRender。
- drain-10：begin 267 / finish 274 / finishWithoutRender 265，仍是 9 次带槽 finish。Pause 后 begin 受 tracking=false 停止，而 finish 只受 active 控制，因此还能多计 7 次。源码和计数一致，没有使前 8 项失去关联或补写创建时关系。
- `unmatchedPageCallbacks=184` 来自共享 hook 的 wrapper 入口：queryWrapperCalls 193 − 9 个匹配站点 = 184。只有精确同一 pageFn 才登记 wrapper；owner lookup 还先过身份 gate，所以 queryOwnerCalls 只有 9。其余 hook 调用被排除，不是把 184 个失败样本混进了这 8 项。

这些是本 observer 的记账/准入语义，不是“零异常”掩盖计数。只要未来实际出现 outside-render、缺失或错误，就必须保留其不同意义；本次没有这些标志。

## 本轮能排除的范围

两次真实 callback 观察均为：

| aggregate ID | aggregate | pageFn | sampled wrapper | Query 弱见证 / inCache | optionMatches |
| --- | --- | --- | --- | --- | --- |
| 1,2,4,6,8 | alive | alive | collected | alive / true | null |
| 3,5,7 | collected | collected | collected | alive / true | null |

这提供以下有限结论：

1. 8 个具体 wrapper 在两个观察时刻已经收集；若它们当时仍被强链持有就不能呈现此结果。因此，**经这些 wrapper 的持续持有**不能解释当时 5 个旧 aggregate。被选 wrapper 可能根本未 commit，也可能曾安装而后被替换，原件区分不了这两种历史。
2. Query 对象仍可在同 hash 精确 cache 槽读回，和“旧 wrapper 必须留在当前 options”不是一回事。8 条 Query 是 8 个弱见证，**不是已证明存在 8 个不同 Query**；没有去重实例 ID，播放时 fineTargetBinding 为 null 的 key 也可复用同一槽。
3. wrapper 已收集时，observer 有意把 option 身份比较留 null；不能把 null 写成 options 不匹配、没有函数或阴性泄漏测试。Query 的其他当前 options/回调、别的 Query site、React/host/native 路径并未全排除。
4. 3 个 aggregate 及其 pageFn 已收集，说明本轮不是“所有被选对象永远不回收”；不能把 5/8 当总体泄漏率或 heap 字节。
5. 原 8 aggregate 均在真实 request/paint/accepted 被消费（每项 accepted≥1）。active-5/首次 drain 时，lifecycle-latest、draw-preparation、accepted-command 三个已跟踪当前槽均已换成 unselected；slot 写/clear 在 Pause 后仍继续观察。这只限制这些当前槽，不能排除未观测的旧闭包、在途/宿主 owner 或整体资源寿命。

R26 两次框架观察实际到达既有两个 Sky Canvas 入口，known-field matches 空；arrayItems 仍截断、opaqueFunctions 482，currentCommit 仍 unresolved。扫描墙钟分别 32/56 ms，不是 CPU/FPS；也没有单独测出 R27 观察成本为零。不能把这些结果升级成整个 React 图无持有或无泄漏。

## 缺失的 owner 边与最小下一信息

目前缺两条可区分的边：`某个真实强 owner → 幸存 pageFn`，以及 `pageFn 的实际 context/间接值 → 旧 aggregate`。生产 fine-target 箭头显式读取 fineTargetBinding，不直接读取 supplement；相同创建 render 和相同生灭模式不能补出后一条。另一方向也可能是保有 aggregate 的别的回调/context 同时保有 pageFn，而不是 pageFn 导致 aggregate 存活。

**当前没有可指名、已验证匹配的 pageFn 强 holder。** R27 已实际检查的 Query owner 只给出 sampled wrapper 分支；R26 的 `valueGraph.enqueue` 一遇 function 就 opaque++ 并返回，482 只是跳过次数，原件没有函数身份或字段路径。不能从这批 scalar 文件事后恢复它们。源码中的 draw、Taro lifecycle fnRef、refetch/readCurrent、interval/事件等只能是候选，不能当作已发现的根。特别是生产 draw 显式读取 supplement.frame，仍不证明旧 draw 在哪一处存活。

能改变修复选择的**最小下一信息**是：只针对一个合格幸存 ID，取得一个真实 owner 字段中的**同一具体回调身份**、该 owner 的替换/清除或有效退休事实，以及它通向该旧 aggregate 的已证实边。它将区分“该 owner 未正确退休，需要修该 owner”与“该 owner 持有合法当前值，不能盲清”。或者，在合法既有生命周期边界观察到该具体 pageFn 已收集而旧 aggregate 仍活，才能排除经该函数的链；本轮没有出现这一组合。

现有 R27 标量/已验证入口尚不能提供上述缺边；**这个最低要求是能力缺口，不是已可运行的下一诊断方案**。若未来有实际支持的定点 owner 入口或相关必需生命周期验证提供了该信息，再在该边界准入；没有时在这里停止 R27 同问追踪。不得扩大到 482 个不透明函数、提高图/数组限额、复跑相同 8 点、换相邻 disable、改 GC/强迫回收，或建立新的通用 profiler 来填补解释。继续能够由已有热点/正确性证据独立决定的原 PLAN 工作，不能用这个缺口替代或阻塞所有后续义务。

本轮只验证了有限目标样本路线与一个持有假设的范围；没有测得新生产收益、整段进程内存曲线、JS/原生/GPU物理释放、持续 OOM 修复或完整六字段/双指/叠层/UI 验收。整个 Goal 继续保持未完成。
