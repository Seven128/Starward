# R28 首 accepted 的实际成本关联

状态：2026-10-23，用户已暂停Goal，转为全项目代码审查交付。本批观察实现、必要本机检查和gen34完整构建已完成并冻结，未推送、未采样、未产生产品修复结论；最终独审报告尚未完成。手机仍为HANDOFF的普通gen18。具体冻结/原件身份及恢复入口见HANDOFF，不修改PLAN。

## 待决问题与已有证据

R22 已修 current-demand 与取消不重试；R23 的17/17调用、5/5准入属于最新意图，五条首 accepted 为111–289ms。现有 draw/traversal/submit 是分组聚合，不能判断这些具体首帧的成本是否主要在恒星绘制准备。未消费准备已知仅1ms，不支持迁移准备 owner；R24延后建表变体更慢，继续拒绝。该独立 A 工作不关闭 UI 的正常账户/Picker、叠层真实双指/pending、真实云或 Sky OOM/B。

只补同一实际首 accepted 的成本身份关联：重用已有意图/准备/Canvas准入及已有时钟读数，区分 BSC/SAO 精确视图 build、replay、bypass。若首帧成本在恒星遍历，再按实际昂贵分支选择修复；若主要在供给/准入前或 copy/publication，沿相应既有 owner；未知关联保 unknown。禁止用续帧平均收益代替首响应，不重复 R27 弱寿命或改调度、GC、星数和产品状态。

## 共享实现合同

- 仅任务 template / isolated builder；普通生产源码、既有冻结代不改。新增有限 `--first-accepted-costs` 选择，使用当前 UI，generation34；不加载本次无关的地形、R25–R27内存观察，不改原控制/15秒manual-input导出/Play行为。旧模式仍可解释，禁止重新构建冻结代。
- helper `createR28FirstAcceptedCosts()` 使用最多256项 weak frame身份与最多8条最近首 accepted 标量行，不保 frame、report、Context、函数或原生对象的强引用。Canvas owner 是构造时的标量序号，generation 是既有 lifecycle epoch；不冒硬件实例身份。
- methods：`canvasOwner():number|null`；`start(allow:boolean)`；`stop()`；`begin(frame, {intentSequence,prepareToken,canvasOwner,canvasGeneration}|null)`；`withFrame(frame,work)`；`record(stage,interval,threw)`；`recordFrame(frame,stage,interval,threw)`；`cache(kind,mode)`；`accept(frame,superseded)`；`attach(payload)`。由既有intent.acceptedOnce精确决定begin是否跟踪；null明确跳过续帧/无当前intent，移除同frame旧weak绑定，不分配cost tuple或误记invalid/unbound。work 的原返回/throw/顺序保持。stop/new-run 不接收旧作用域成本；stop释放weak身份但保本次有限标量结果供导出。
- 唯一阶段顺序：`nativePaintOwner, draw, bscTraversal, saoTraversal, rendererSubmit, displayCopy, publishAccepted, nativeCallback`。重用现有R20及主recorder的同一 interval；不新增每星计时。submit可嵌套于traversal/draw；nativePaintOwner为同步调用跨度，nativeCallback可跨异步等待。它们不可相加或称CPU/GPU/物理呈现时间。
- 每阶段 cost tuple：`[observedCalls,validCalls,knownSubtotalMs,[belowResolution,clockUnavailable,clockDiscontinuity,outOfRange,notObserved],threwCalls]`。零 observed 代表未观测，knownSubtotal0不代表免费；valid仅接受原1..60000ms整数，其余保明确unknown。
- cache为 `{bsc:[build,replay,bypass],sao:[build,replay,bypass]}`，来自原cache实际分支/无cache直接build；build分支随后正常replay只记build，不伪装cache命中。
- 每行：`order,intentSequence,prepareToken,canvasOwner,canvasGeneration,paintOrdinal,superseded,scopeAmbiguous,costs,cache`。仅在既有 `acceptedIdentity` 确认该intent第一次真实accepted后调用accept；不含synthetic/重复accepted。异步copy/回调必须通过同frame weak身份回到原attempt。不同attempt的nested作用域标ambiguous；同步done内同一attempt的copy/publication仍是已知身份，不记歧义。同步done可先accept再结束nativePaintOwner，行须接收同一纯标量attempt的尾部成本，在attach时深拷贝；新paint不能回写旧首帧行。
- extension字段：`schemaVersion,metricsSchema,meaning,nesting,capacity,identityLimit,stages,counters,rows`。counters为 `paints,firstAccepted,missingFirstAccepted,evictedRows,identityRotations,unboundCosts,nestedScopes,invalidIntervals,invalidIdentities,duplicateAccepted`。rows按order递增，溢出保最近8，`rows.length+evictedRows+missingFirstAccepted=firstAccepted`。
- 顶层schema `starward-r28-phone-probe-first-accepted-costs-v1`；extension schema `starward-r28-first-accepted-costs-v1`；metricsSchema只包装现有 `starward-r20-phone-probe-draw-costs-v1`。meaning为 `existing-inclusive-wall-spans-at-first-accepted-identity-not-cpu-gpu-or-pixels`；nesting为 `submit-may-overlap-traversals-and-draw-native-owner-encloses-sync-paint-do-not-add`。
- 现有strict collector、32KiB完整预算、原件幂等写入不放宽。先验证原结果/throw、首accepted与重复/替代、嵌套/时钟unknown、hide/stop/new-run、容量和实际集成；必要独审后才准入一次原本必要的正常全天空/实际SAO输入观察。

## 执行与原件

修改前四template已逐件复制/读回至私有 `r19-ui-20261022/r28-first-accepted-costs-20261023/source-before`。helper10/10、protocol7/7、实际集成及受影响历史45/45，30原正常语义检查和gen34严格类型/完整WEAPP构建通过。真实手机尚无R28运行结果。源审初步无P1/P2；用户暂停时最终独审报告未保存，不能写成最终独审完成。生成源、模板、完整包、外置maps及元数据共2010件/25,411,067 B已私有保全，原件和不可重建身份归HANDOFF。
