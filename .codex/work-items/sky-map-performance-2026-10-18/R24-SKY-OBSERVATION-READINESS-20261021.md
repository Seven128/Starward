# r23 普通预览输入关联：当前可验证的最小路径

2026-10-21，只读核对当前 r23 冻结源码、协议、既有 r21 结果与收集器。没有操作手机、IDE、服务、构建或 Git，也没有验证新的手机采集。root 拥有现场；此前本地 CPU Profile 的终止 unknown 必须先处理，不能叠加压力来假装获得干净条件。

## 能解决的当前问题

现有普通预览 `manual-input` 已能把一次真实六字段输入，关联到实际 geometry call/取消/验证/准入、presentation 准备、请求绘制、paint 和首个 accepted。它能判断 r22 current-demand/取消重试修复是否消除了过期发起，以及剩余等待主要位于供给前、供给后排程，还是实际 draw owner。不需新增探针框架或持续连接真机调试器。

这是一条针对 A 的细分观察，不提供完整 JS/native 保留链、线程 CPU 栈、物理呈现或 B 的全局无泄漏结论。是否足够取决于待决原因，不取决于它是不是某种 profiler 文件。

## 最小手机顺序（由 root 执行）

1. 复用当前普通 r23 身份与已恢复的桥。确认原生 CPU/其它采集的剩余影响已解决。进入正常 Sky，使用已有“计量 → 准备全天空”；该动作只设置当前产品 FOV，经产品 clamp 得到实际最大视野。保持地景，使用过去的合法起点，避免加时间被 real-now 上限裁剪。SAO 的实际就绪不能由主机 HTTP 成功代替。
2. 在“计量”中选择 **manual-input 待命**。它不立刻开始，不发 timer、不启动 Play；只保存当前输入 owner。正常时间面板会打开。
3. 为复用 r21 的具体待决机制，做一次既有 **2 秒“日减”长按**，正常释放。首次经过真实六字段 `onPreview` 合法性检查、发布 preview intent 之前，才开始记录。trigger=1；ruler 为 trigger=2。它不包含手指按下到该合法回调之前的原生输入分发时间。
4. 从实际首输入起约15秒，既有 controls 自动调用 snapshot，封存并 POST；它停止的是计量，**不控制手势停止或普通产品时间播放**。manual 本来没有 Play，因此不等待60秒，也不要求 terminal。15秒之前不 Cancel、Apply、换 Context 或退出；这些合法生命周期会退休当前手动测量。
5. 验证当前新回执实际落盘、严格协议通过、source 正确并包含有用非空数据。界面“已导出”只作辅助，不能替代回执解析。失败重试应只重送同一 sealed/cached payload，不能重新发起一次产品操作来恢复导出。

正常 writer 每次最多32,768 UTF-8字节，HTTP超时10秒；收集器返回200且 `stored:true` 才被界面认为成功。当前只读检查收集目录为24个 JSON，现有上限32，未做清理。容量可能随 root 工作变化，应以开始前实际状态为准；不要提高上限或删除旧原件以掩盖429。

## 准确 owner 和解析入口

- 冻结源：`tmp/r17-normal-a1-review-r23-usb/source/apps/wechat-miniapp/src/features/sky/r17-phone-probe-controls.tsx`，79–108行是单次封存/幂等重送；142–171行是首次合法输入启动；193–216行是当前 UI。当前 manifest 为 buildGeneration **27**、mode **normal**、buildSourceSha256 **36fa8bd03e984ab7d042c459579c8a2fd726fc4e8f58b10f6129a61b1b478a2f**。
- 严格解析：导入 [r17-normal-input-protocol.mjs](scripts/r17-normal-input-protocol.mjs) 的 `validateR17PhoneProbeMetrics(value)`。r23 顶层 schema 为 `starward-r20-phone-probe-draw-costs-v1`，会逐层验证 draw reasons、manual geometry、manual input、A correlation 和 v3；**不要只用旧 v3 validator**。
- 收集：现有桥 `/__development_r17_phone_probe_metrics` → [r17-phone-probe-collector.mjs](scripts/r17-phone-probe-collector.mjs)，私有文件名为 `<variant>-<runId>.json`。读取 `runtime-usb.private.json` 的既有 `collectorDirectory`；不要修改 bridge 或开第二个服务。必要数据只保本机。
- `scripts/r17-a-correlation-analysis.mjs` 硬编码旧 gen25 文件、哈希和用途，**不能直接运行来分析 r23**。既有私有 `device-resume/r21-hold/review/analyze-r21.mjs` 展示同类分阶段联结，但它也硬编码 r20/r21 输入并写旧结果，不能原样重跑。复用其联结逻辑时先校验 r23 协议、manifest 和新原件；所有相减须有非空端点、相同有效 clock epoch 和正确次序，避免 JS 的 null 数值转换伪造0。

## 现有字段与判断

| 目的 | 实际字段 / 联结 | 意义及限制 |
| --- | --- | --- |
| 当前源码及有效负载 | `binding`、`scene.baseRowsMin/Max`、`saoRowsMin/Max`、`selectedTilesMin/Max`、`catalogVersions`、`saoPublicationHashes`、`viewport`；`counters` 中 sceneFinishes、glDrawSubmissions、bsc/saoSubmittedStars、acceptedBsc/SaoObjects | 需有当前非空 BSC 和实际 SAO 行、提交和接受消费者，以及实际最大 FOV。任一目标消费者为0或 SAO未加载，要先恢复负载，不能把它叫完整全天空验证。`scene.modes=DAY` 不是画面无夜星的证明，地景/夜间状态仍看真实画面。 |
| 一次输入的首响应 | `linkage.latency.intentToFirstAcceptedMs` 及 unsuperseded/superseded 两组；intentsCreated、firstAcceptedIntents、firstAcceptedAfterSuperseded、unacceptedIntents | 用真实 intent sequence，区分被后续输入替代和第一次接受。旧 `timing.intentToAcceptedWallMs` 是仅最新时刻相等的条件采样，不能替代这个分布。accepted 是既有显示/选取/名称发布责任，不是物理像素present。 |
| 请求是否过期及供给等待 | `geometryStages.entries` 每行 `[order,event,relativeWallMs,clockEpoch,requestId,windowId,targetMsFromFirstObservedTarget,intentId,detail]`；事件1=intent、2=logical call、3=abort、4=validated promise、5=reject、6=current hook assignment | 以requestId联结2→4/5/3，以intentId联结1/2/6和linkage。检查call之前是否已有更晚intent，检查已验证响应是否进入当前hook。call→validated含客户端、传输、服务与校验，不是独立网络耗时。继承/cache/身份歧义由detail明确，不能强行分配某个请求。 |
| 供给后准备与排程 | `linkage.links` 的 prepareToken、intentSequence、started/finishedRelativeMs、firstConsumed/firstAcceptedRelativeMs、intentRelativeMs；`aCorrelation` 的 preparationToRequest、requestToPaint及8条对应links | prepareToken联结A correlation。其 firstRequest 为已有 page→renderer 请求边界；firstConsumed 是paint进入。Page在三个边界的 `[submitted,completed,pending]` 只说明时序重叠，不证明某个payload或React阻塞因果。 |
| 计算/绘制成本 | `stageElapsed`：presentation、base、selection、supplement、constellations、draw、nativePaintOwner、displayCopy、publishAccepted；`drawCosts.groups` 按 inputResourceEffect、continuationOnly、unknown 分组，含 draw/starTraversal/rendererSubmit | 都是同步wall elapsed。submit可在starTraversal内部flush，二者均在draw内；不能相加成互斥CPU/GPU分解。effect不等于cache miss，continuation不等于cache hit。需一起报告valid/unknown与known subtotal，不把低于分辨率调用作0。 |
| 准备是否值得优化 | `linkage.costs.consumed/unconsumed/expiredUnconsumed`、consumed/unconsumedPreparations、incompletePreparations | 未消费次数多并不等于昂贵。r21已发现17份未消费准备已知成本仅1ms，不能仅凭计数搬迁状态/准备owner。 |

协议和导出有明确界限：2048个保留样本、256对象身份轮换、至多32条linkage首尾样本；最后整包预算可能进一步裁中间links，但保留A correlation首4/末4。geometry容量128、request上限64，导出预算可能裁掉后缀，必须检查 `observed/dropped/exportOmitted/overflow/invalid/pendingAtStop`。没有导出的最后一个请求不能按最终画面补造时间；有省略时不能宣称全运行没有过期请求。

## 足够与不足的具体分界

若一次有效当前样本仍显示调用在更新intent之后才启动，数据已足以把下一修复定位到现有 geometry/Query current-demand责任。若这类调用消失但首accepted未改善，应沿已关联阶段判断余下等待，不能自动继续改相邻恒星缓存。若绘制主导且对应负载确实执行，可复用已有正常Sky CPU与r7源码映射细化相应owner，避免再做无区分力总成本录制。

缺口仍是：每次真实触摸到合法回调前的时间、物理呈现时钟、CPU线程与本次JS owner的精确映射、JS/native资源保留原因，以及持续Play/退出结果。这些只有在下一决策需要时才补，不把某种工具格式设为统一门槛。当前手动路线尚需root在新现场实际测通；本记录本身不证明运行成功。
