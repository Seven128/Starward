# Starward 收口任务索引

2026-10-19已收到本接手对话的明确继续指令，完整正文Goal已创建为active、无预算、未完成；优先推进无需手机的工作。r10跨日pending白昼连续性及取消终态真机独审复用；普通Play/内存离线解读后仍保完整B缺口。当前源码、任务成果交付、main/真实天气及设备状态以[HANDOFF](HANDOFF.md)为准，不由本索引重复拥有。原gen26仍UNKNOWN，手机依赖保持未验。唯一方案见[PLAN](PLAN.md)，可复制提示词见[NEXT-CHAT-PROMPT](NEXT-CHAT-PROMPT.md)。

[Sky研究与实际基线](SKY-INTERACTION-RESEARCH.md)、[包含SAO的CPU样本](SKY-TIME-CPU-BASELINE.json)、[向量局部试验](SKY-VECTOR-RESEARCH.json)、[拖动边界](SKY-DRAG-BASELINE.json)、[几何窗口](SKY-TIME-WINDOW-PROBE.json)保留结论和限制。生产合批与独审见[R17审查](R17-INDEPENDENT-REVIEW.md)、[恒星集成](SKY-STELLAR-INTEGRATION.md)、[地景修复](R17-LANDSCAPE-REPAIR.md)、[稳定地形请求](OVERLAY-STABLE-WINDOW.md)；当前手机generation和剩余证据见HANDOFF。

[方法与探针修订结果](PERFORMANCE-METHOD-UPDATE.json)、[v3协议与原接线说明](scripts/R17-PROBE-V3.md)保留各自形成时的范围；后续正常Sky实际接入和采样结果见下方正常基线/CPU条目，不再按早期“尚未接线”重复准备。

唯一恢复入口。先前成果和全部未撤销义务继续保留，当前行动范围以用户最新要求为准。GOAL-OBJECTIVE保存完整执行目标；文件本身不恢复Goal，用户在新对话明确要求执行交接提示词才构成继续指令。夜间拟物、读屏、大文字和100m/cm仍排除。

1. [完整要求、授权和范围](REQUIREMENTS.md)：原始义务、有效修订、完成条件与暂缓项。
   [另一电脑补入的完整结果要求](INHERITED-REQUIREMENTS.md)：H1–H8、A01–A15/N01–N09映射和已完成成果复用；原固定方案/证据已恢复至私有目录，后来用户修订优先。
2. [当前唯一方案](PLAN.md)：保留[架构建议对照](ARCHITECTURE-ADVICE-RECONCILIATION.md)中的静态解耦、稳定请求身份、发布分发和有条件固定块试验，以及Map/Sky/继承义务；最新修订明确Sky A/B各自待决问题、观察分支和受阻恢复，地形先定位残余等待，测量项按问题选择。[完整Goal正文](GOAL-OBJECTIVE.md)保留全部义务，不撤销已有成果与验收。
3. [当前状态与恢复](HANDOFF.md)：当前源码、候选、服务、在途操作、下一动作及停止条件。
4. [性能/包体/分支总证据](VERIFICATION.md)、[真机证据](PHONE-VERIFICATION.md)、[转场修复候选字节](PHONE-FIX-CANDIDATE.json)及[对应源码指纹](PHONE-FIX-SOURCE-SNAPSHOT.json)。当前整合候选由[OVERLAY-CANDIDATE](OVERLAY-CANDIDATE.json)、[当前源码指纹](OVERLAY-SOURCE-SNAPSHOT.json)和HANDOFF拥有；不把历史转场候选当成当前手机包。软件、桌面、手机观察的效力不可互换。
5. [包体/CDN审计](PACKAGE-AUDIT.md)、[地图生命周期](MAP-LIFECYCLE.md)、[先前独立审查](INDEPENDENT-REVIEW.md)、[分支清理回执](BRANCH-CLEANUP.json)。后续手机修复的审查见真机证据和当前状态。
6. [合并与旧代码疑问复核](SOURCE-AND-MERGE-AUDIT.md)。原合并任务的 [证据](../main-integration-2026-10-17/VERIFICATION.md)、[设计迁移](../main-integration-2026-10-17/DESIGN-MIGRATION.json)、[父版本测试比较](../main-integration-2026-10-17/PARENT-TEST-COMPARISON.json) 保留，不重复迁移/合并。
7. [当前CI归因](CI-TRIAGE.md)、[部署夹具修复](CI-DEPLOYMENT-REPAIR.md)、[共享入口修复](CI-SHARED-ENTRY-REPAIR.md)、[本批独立复核](CI-INDEPENDENT-REVIEW.md)。当前全量结果与未决归类继续由 HANDOFF 和相应证据记录拥有。
8. [当前API全量归类](API-CURRENT-TESTS.md)、[小程序全量归类](MINIAPP-CURRENT-TESTS.md)、[API消费者修复](API-TEST-CONSUMER-REPAIR.md)、[Map消费者修复](MAP-TEST-CONSUMER-REPAIR.md)、[共享组件修复](SHARED-RENDERING-REPAIR.md)、[业务夹具修复](BUSINESS-TEST-CONSUMER-REPAIR.md)、[消费者独立审阅](TEST-CONSUMER-INDEPENDENT-REVIEW.md)。修复后结果不替代原失败记录，环境skip仍未验。
9. [Map聚焦与真实输入恢复审计](MAP-FOCUS-RESUME-AUDIT.md)、[地形/云量/光害性能与成熟方案调研](OVERLAY-PERFORMANCE-RESEARCH.md)、[generation4真机双向转场独立复核](PHONE-GEN4-REVIEW.md)。研究假设、源码事实和实际测量分开。
10. [首批叠层优化](OVERLAY-FIRST-REPAIR.md)、[跨机运行资产迁移状态](ASSET-MIGRATION-STATUS.md)。原电脑发布输入已收到并隔离恢复；文件/数据库/API与手机验收分开。另一分叉已停止，本次交接后由收到用户明确开始指令的新对话接手，避免重复实施。
11. [手机实际选点范围与居中](PHONE-FOCUS-VERIFICATION.md)：generation5临时只读诊断包的3.394km、0.7px与拖动接管结果；不替代未完成的连续双指、其它入口和最终普通候选。
12. [当前山体遮挡接口摘要](HORIZON-CURRENT-API-SUMMARY.json)：现有手机API的真实COG模型及许可/假设读回，未包含站位坐标；接口读回不替代手机Canvas、缺测恢复或资料阅读验收。
13. [叠层服务实测摘要](OVERLAY-SERVICE-MEASUREMENTS.json)保留三阶段的成功与较慢样本、输出哈希及最终源码指纹；[临时聚焦观察器源码](FOCUS-OBSERVATION-PROBE.txt)与探针回执逐字节匹配，只作为证据保存，不在生产源码或普通候选里。
14. [历史远端检查点](REMOTE-CI-CHECKPOINT.json)保留9e5c75ef等旧结果；较新的581a5a9b完整Product CI39108911384/Context39108915196已通过，见[数据流程交付与CI](BACKEND-DATA-DELIVERY.json)。generation8/9手机证据保持各自范围；当时main尚在原整合提交，后续实际同步见64及HANDOFF，目标结果仍按各自证据保留未验。
15. [当前候选的开发工具恢复证据](DEVTOOLS-RECOVERY.md)：受控退出重开后官方CLI已恢复，自动真机调试的实际手机连接与绑定见后续证据；旧MCP/SDK失败不能继续当成当前CLI不可用的依据。
16. [generation6真机反馈](PHONE-GEN6-VERIFICATION.md)：普通候选已绑定Android，真实选点打开中面板；无UI探针的原生范围/中心读回成立。后续连续操作、资料/来源与实际性能仍沿原义务继续；[只读测量源码](NATIVE-FOCUS-READBACK.txt)保留方法，不进入产品。
17. [云量时钟差修复](CLOUD-CLOCK-REPAIR.md)：手机与BFF约1秒时钟差导致新鲜格子被判为未来数据；保留来源时刻并统一查询与暂存层的有效期时钟，记录修复前失败、修复后检查及generation7真实云格/切时刻/拖动结果。当前手机定位拒绝与恢复、generation8空来源条修复及旧构建回收见[真机证据](PHONE-VERIFICATION.md#generation7-location-permission-recovery)。
18. [海报分包路径修复与真实相册保存](PHONE-VERIFICATION.md#generation9-poster-package-repair-and-native-album-save)：generation8失败、真实组件回归及generation9修后原生保存结果；已保存1张测试SPOT海报，真实接收/PLAN/导出文件交接仍未验，N05继续保留。
19. [给原电脑的可复制交接提示词](OTHER-COMPUTER-DATA-HANDOFF-PROMPT.md)：r6/配套DB/固定地形/原记录的盘点、存储选择、上传读回与恢复边界；原电脑已按交接分支提交资料并上传；当前接收端恢复结果由ASSET-MIGRATION-STATUS持有。
20. [静态夜光独立读取](STATIC-LIGHT-ISOLATION.md)：新接口、真实Map消费者和构建范围；3b0d8916已纳入后续[数据流程独审](BACKEND-DATA-REVIEW.md)和581a5a9b完整CI。新静态候选[字节](STATIC-LIGHT-CANDIDATE.json)未绑定手机，不与generation9混称。

21. [原r6数据恢复和新同步机制](ASSET-MIGRATION-STATUS.md)、[完整数据库核验](RESTORED-DATABASE-CHECK.json)、[当前API核验](RESTORED-API-CHECK.json)、[仓库统一数据入口](../../../data-pipelines/runtime-data/README.md)。公共成品LFS与Drive、重建大数据Drive、私有恢复分责；EOG官方两文件位于[同一数据锁](../../../data-pipelines/runtime-data/current.lock.json)，压缩传输与TIFF已校验，原owner-only Drive实际远端读回及fresh receiver解包准入均完成；[EOG证据](EOG-SOURCE-RECOVERY.json)拥有结果与剩余交付审查边界。

22. [数据流程独立审查及修复](BACKEND-DATA-REVIEW.md)、[非默认端口真实隔离恢复](RESTORE-PORT-CHECK.json)、[交付与 CI](BACKEND-DATA-DELIVERY.json)、[原机补传 EOG 原始数据提示词](RAW-SOURCE-UPLOAD-PROMPT.md)。

23. [恢复数据后的约4km地形实际服务样本](RESTORED-TERRAIN-SAMPLE.json)：粗档固定包不含所请求z12细档，首次3.926s、重复6ms；属于后续叠层性能责任，不能把恢复/API通过当真机优化已验收。

24. [交接与恢复提示词](NEXT-CHAT-PROMPT.md)：供用户在新对话明确要求执行的接手文本；本接手对话已收到明确继续指令，完整Goal无预算；实际工具状态见HANDOFF。原实施前停止边界已解除，单纯读取文件仍不自行激活工作。当前事实仍只见HANDOFF。

25. [R17当前测试与夹具修复](R17-CURRENT-TESTS.md)、[同条件手机诊断构建](R17-PHONE-PROBE.md)、[有限地形细档发布](TERRAIN-HOTSPOT-PRODUCTS.md)、[Map静态分发适配](MAP-STATIC-ADAPTER.md)。本地检查、真实HTTP读回和目标手机结果保持各自证据范围。

26. [R17手机两侧比较与播放失败](R17-PHONE-COMPARISON.md)、[结构化样本](R17-PHONE-COMPARISON.json)、[Canvas copy隔离试验及失败](R17-CANVAS-COPY-TRIAL.md)、[目标设备结果](R17-CANVAS-COPY-RESULT.json)、[内存增长下一边界](R17-PLAY-GROWTH-DIAGNOSIS.md)。诊断/构建通过不代表产品验收；当前generation和下一动作由HANDOFF拥有。

27. [有限Map分发产物的私有备份/新目录恢复](MAP-STATIC-RECOVERY.json)、[独立审查](MAP-RECOVERY-INDEPENDENT-REVIEW.md)：同一数据锁可选组、实际远端字节和sealed成员/旧URL已核；不是CDN、数据库迁移或环境激活证据。

28. [整帧复制抑制诊断](R17-NATIVE-COPY-SUPPRESSION-TRIAL.md)、[前台内存结果](R17-NATIVE-COPY-SUPPRESSION-RESULT.json)、[本地JS保留堆诊断](R17-JS-HEAP-DIAGNOSIS.md)。只用于收敛故障边界，冻结画面、空计量窗口或本地GC不能完成产品验收。

29. [GPU完成诊断](R17-GPU-FINISH-TRIAL.md)、[实际非空计量及内存结果](R17-GPU-FINISH-RESULT.json)：正常整帧copy和真实accepted保留，阻塞finish仍未阻止增长，不采用为修复。新Page/GL观察包和当前手机身份只由HANDOFF指向。

30. [固定远端身份诊断实现](RUNTIME-IDENTITY-DIAGNOSTIC.md)、[独立审查](RUNTIME-IDENTITY-INDEPENDENT-REVIEW.md)、[H4运行就绪](H4-REAL-WEATHER-READINESS.md)：当前分支代码已提交并推送944a1d6c；真实远端identity仍受main-only发布边界约束，本地检查不关闭H4。

31. [Page/GL观察包](R17-PAGE-BRIDGE-OBSERVATION.md)、[generation20实际结果](R17-PAGE-BRIDGE-RESULT.md)：开启debug时Page回调未见积压，关闭debug后仍增长/退出；真实计量、窗口差异、失败暂停与视频未审范围分别保留。

32. [当前真机分配/CPU采集路线](TARGET-HEAP-OBSERVATION-ROUTE.md)、[实际采集资格](PERFORMANCE-TOOL-QUALIFICATION.json)、[历史初始堆与第二次导出限制](R17-TARGET-HEAP-DIAGNOSIS.md)：历史有效Map分配/CPU资格保留；后续正常Sky有效allocation及双级映射见51，仍无heap差分/retainer或已证Sky泄漏根因。原始profile只在Git外，当前方法范围见HANDOFF。

33. [H3同点照片隔离输入](H3-SAME-SITE-ISOLATED-INPUT.md)：真实拍摄字段/安全副本/同源adapter已备，实际Context owner拒绝不充分资料冒充FORMAL_SPOT；尚未激活或完成手机/正常发布链验收。

34. [CPU/page-only隔离构建](R17-CPU-PAGE-ONLY-TRIAL.md)、[generation21实际结果](R17-CPU-PAGE-ONLY-RESULT.md)：后续GPU/native绘制为零仍快速增长，20秒正常Pause成功，冻结/合成发布不作产品验收。

35. [2026-10-19性能研究复核与路线调整](PERFORMANCE-RESEARCH-RECONCILIATION.md)、[时间管线独立复核](R17-TIME-PIPELINE-REASSESSMENT.md)、[测量方法审计](PERFORMANCE-MEASUREMENT-AUDIT.md)、[平台资格历史预检](PERFORMANCE-TOOL-CAPABILITIES.json)及[后续实际采集资格](PERFORMANCE-TOOL-QUALIFICATION.json)：A/B分开，现成证据不支持按请求数认定大量prepare浪费。可复用方法归现有开发skill/reference和development-feedback Context。

36. [gen22实际文字度量结果](R17-CPU-TEXT-METRICS-RESULT.md)、[结构化证据](R17-CPU-TEXT-METRICS-RESULT.json)、[accepted publication独立审查](R17-PUBLICATION-REVIEW.md)：先保留名称空窗，再取得非空名称/实际SAO且native measure为零的有效窗，明显增长仍在；后续gen23已完成，阴性结果继续复用，不把历史相邻对照当作下一动作。当前构建/手机状态见HANDOFF。

37. [accepted action完整构建](R17-ACCEPTED-ACTION-TRIAL.md)、[v2观察协议](scripts/R17-PROBE-V2.md)、[集成独审](R17-V2-INDEPENDENT-REVIEW.md)、[collector实际HTTP](R17-COLLECTOR-V2-INTEGRATION.json)：同一PLAN下的窄对照与观察接入；旧8795未选中准备包保留，新8797整包/审查/手机状态由HANDOFF拥有，不将工具准备当产品通过。

38. [gen23 actual direct-action结果](R17-ACCEPTED-ACTION-RESULT.md)、[机器回执和内存](R17-ACCEPTED-ACTION-RESULT.json)：有效非空负载、同次Play/Pause和独立终态回执成立，增长仍在；新单调时钟成本未知，不能据request/consume差改调度。当前手机和下一责任见HANDOFF。

39. [H3共享组件隔离构建](H3-COMPONENT-FIXTURE.md)、[结构化准备结果](H3-COMPONENT-FIXTURE.json)：保留MAP_POINT共享组件与有界隔离机制；后续实际origin整包已准备，见下方H3手机接入记录。组件隔离不提供formal资格或正常发布验收，当前候选和送达状态以HANDOFF为准。

40. [scene memo生命周期窄对照](R17-SCENE-OWNED-MEMO-TRIAL.md)、[源准备绑定](R17-SCENE-OWNED-MEMO-PREPARATION.json)：候选与已完成构建/独审保留，当前暂停；需新的归因证据证明对照有区分力才重新选择。研究副本基于该变体，仅认证工具路线，不作为未改动的Sky基线。实际状态由HANDOFF拥有。

41. [正常Sky基线准备](R17-NORMAL-BASELINE-V3-PREPARATION.md)、[实际正常负载结果](R17-NORMAL-BASELINE-V3-RESULT.json)、[CPU归因及窗口/映射限制](R17-NORMAL-CPU-ATTRIBUTION.md)：复用已取得的真实正常Sky样本；CPU成本不解释进程分配，也不关闭A/B验收。[单一scalar成本核对](R17-STELLAR-SCALAR-COST-CHECK.md)已结束且不采用，不继续派生微变体。

42. [H3实际手机包准备](H3-PHONE-PREPARATION.md)、[同点山体预检](H3-PHONE-TERRAIN-PREFLIGHT.json)、[照片HTTP接入](H3-PHONE-MEDIA-READINESS.json)、[完整包选择](H3-PHONE-SELECTION.json)、[预览结果丢失边界审查](H3-PREVIEW-BOUNDARY-REVIEW.md)：区分构建/数据/调用/送达/原生表现；历史准备摘要不能替代HANDOFF中的最新gen26及UNKNOWN状态。

43. [A既有回执关联与最小扩展](R17-A-CORRELATION.md)、[地形等待观察](TERRAIN-WAIT-OBSERVATION.md)、[正常A1完整准备](R17-NORMAL-A1-PREPARATION.md)、[A1及预览边界修复独审](A1-AND-PREVIEW-FIX-INDEPENDENT-REVIEW.md)、[collector实际HTTP准入](R17-A1-COLLECTOR-HTTP.json)。构建、合成HTTP、桌面启动和手机结果保各自范围；当前未决/候选/下一动作由HANDOFF拥有。

44. [既有正常实例的新手机样本与离线归档](NORMAL-EXISTING-PHONE-OBSERVATION.md)：灰层/反向、小时预览取消的有限开发证据，不是整包/AppID或A/B验收；后续跨日与时间尺失配保当前HANDOFF及对应证据owner。

45. [跨日预览手机证据](CROSS-DAY-PHONE-OBSERVATION.md)、[窗口恢复修复](SKY-RULER-WINDOW-RESTORE.md)及[独审](SKY-RULER-WINDOW-RESTORE-REVIEW.md)、[原生刻度换算](SKY-RULER-NATIVE-CADENCE.md)及[独审](SKY-RULER-NATIVE-CADENCE-REVIEW.md)：保原手机失败与修后目标缺口；离线组件/SDK/完整候选分别绑定，当前状态由HANDOFF拥有。

46. [A1运行接入](R17-A1-RUNTIME-INTEGRATION.md)、[当前共享验证与提交范围](CURRENT-DELIVERY-VERIFICATION.md)：r10当前普通预览交付/绑定及尚未验证的新行为，r9历史实际播放/退休和2.0调试执行层、r8限域原生结果、r7有效采集/映射/退出分别记录；HEAD69401c09及两CI已通过，各批次软件/CI只保其范围。

47. [剩余仓库交付核对](REMAINING-DELIVERY-AUDIT.md)：方法当前全文的局部独审、四组交付与隐私/引用范围；该文记录核对时快照，不拥有当前Git或设备状态。H3必要源材料后续保全见[既有准备owner](H3-PHONE-PREPARATION.md#清理前的源材料保全)，不借归档重发gen26。

48. [r3正常Play关联及有限解释](R17-A1-R3-PLAY-RESULT.md)、[跨日/取消修复责任](SKY-RULER-CROSSDAY-FOLLOWUP.md)、[r4手机刻度独立输出复核](R17-A1-R4-RULER-RESULT.md)：这些记录形成时A缺latest输入、B缺有效Sky allocation；后续r6单输入及r7分配见49/51，旧缺口不再作为当前指令。r4跨日/取消有限改善、首次入场FAILED和四张终态不能覆盖过程的结论仍保留。

49. [r6实际入场失败](R17-A1-R6-ENTRY-RESULT.md)、[r6最新单输入accepted](R17-A1-R6-MANUAL-RESULT.md)、[reveal修复独审](SKY-RULER-REVEAL-NATIVE-ADMISSION-REVIEW.md)、[r7完整候选核验](R17-NORMAL-R7-BUILD-REVIEW.md)与[r7再次原生失败](R17-A1-R7-ENTRY-RESULT.md)：r6单输入59ms软件accepted可复用，完整A仍欠；[native显示边界](NATIVE-RULER-VISIBILITY-BOUNDARY.md)与[r7后续公开passive读数](R17-A1-R7-PASSIVE-NATIVE-RESULT.md)分别保机制未知和实际offset错窗的范围。

50. [r6地形真实缺口](TERRAIN-R6-WAIT-RESULT.md)、[同窗请求责任](TERRAIN-METADATA-WAIT-OWNER.md)、[有限缓存候选绑定](TERRAIN-R6-ASSET-PATH-BINDING.md)：metadata2248ms/file98ms/native34ms与唯一缓存候选不完成实际手机imageSHA关联；24文件已由root另归档，关联仍UNKNOWN，未选分块/预取/worker或称已优化。

51. [r7正常Play](R17-A1-R7-PLAY-RESULT.md)、[有效allocation及双级runtime映射](R17-NORMAL-R7-ALLOCATION-RESULT.md)、[真实Cancel/Map退出](R17-A1-R7-EXIT-RESULT.md)：正常非空负载、存活采样来源和真实退出已成立，无需重复CPU/分配资格；r7缺失字段/停止时刻不由r9倒填，后续surface退休边界见54。total churn/引用保留及完整B仍未验，gen24继续暂停。

52. [稳定native表面源码修复](SKY-RULER-STABLE-NATIVE-SURFACE.md)、[独审](SKY-RULER-STABLE-NATIVE-SURFACE-REVIEW.md)、[r8完整构建独审](R17-NORMAL-R8-BUILD-REVIEW.md)、[r8实际入场](R17-A1-R8-ENTRY-RESULT.md)及[连续输入/时间交互](R17-A1-R8-TIME-INTERACTION-RESULT.md)：捕获可见刻度/提示通过，49intents中9latest firstAccepted24–70ms、末30ms；保全部superseded与跨日pending实际跳变，不扩大为完整A/B。

53. [地形匿名身份收据](TERRAIN-HTTP-IDENTITY-RECEIPT.md)、[独审](TERRAIN-HTTP-IDENTITY-RECEIPT-REVIEW.md)与[r8实际动作](TERRAIN-R8-IDENTITY-ACTION-RESULT.md)：实际桥metadata/asset SHA和proof绑定成立，file_ready可读后仍有gap；旧r6及手机A5→SHA缺口不由新桥事实倒推。暖缓存不冒充优化收益。

54. [r9有限退休观察](R17-NORMAL-R9-RETIREMENT-OBSERVATION.md)、[源码/fixture独审](R17-NORMAL-R9-RETIREMENT-REVIEW.md)、[完整构建独审](R17-NORMAL-R9-BUILD-REVIEW.md)及[实际60秒Play/退出独审](R17-A1-R9-PLAY-EXIT-RESULT.md)：60.015s same-run正常Pause、至少31s暂停尾段、真实Cancel/Map及同surface退休已观察；实际尺寸1×1、selection移除，context扩展不可用。15s metrics、存活采样和进程PSS保各自范围，不关闭完整B。r9输入/debug已退休；425件运行档案与可变session元数据限制见当前运行接入，不用新绑定倒填历史字节。

55. [跨日等待连续性修复](SKY-TIME-PENDING-CONTINUITY-FIX.md)、[独审](SKY-TIME-PENDING-CONTINUITY-REVIEW.md)：目标供给未到时保当前有效accepted呈现，draw及资源共用输入，取消和失效不复活旧帧；133/133、TS5.9.3及独审通过，已提交/push为69401c09且进入r10。[r10真实过渡独审](R17-A1-R10-CROSSDAY-RESULT.md)已确认更新中保持白昼、取消回原时刻，保留取消字段短暂先后变化；完整A/Apply仍未完成。

56. [r10普通预览部分证据](R17-A1-R10-ORDINARY-PARTIAL.md)：第一轮正常Play/Pause、两个错位watch及第二次同watch的前台结束边界；用户携手机离开后，先离线审冻结原件，不能推断OOM或关闭B。全部r10原件/完整构建已保全，当前输入暂不可用。

57. [无需手机的交付与H4下一动作](DELIVERY-NEXT-ACTIONS-20261019.md)：已核main快进条件、CD真实副作用、既有环境能力与identity/runtime分支；执行前核最新远端，按release owner继续，不绕guard或借fixture补真实天气。

58. [性能阶段成果与数据可信度](PERFORMANCE-STATUS.md)：安装实现与r9当时的Android无DOM runtime、真实动作支持其2.0手机逻辑目标；LAN→WAN只改变传输，不为旧r7补造执行字段，也不声称普通预览r10已建立remote。解释已解决/已定位/未回答与下一决策，方法回到现有开发skill。

59. [r10任务接入](R17-NORMAL-R10-BUILDER-INTEGRATION.md)、[接入/地形实际文件身份独审](R17-NORMAL-R10-INTEGRATION-REVIEW.md)、[完整构建独审](R17-NORMAL-R10-BUILD-REVIEW.md)及[当前候选准备/绑定](R17-NORMAL-A1-PREPARATION.md)：app077d3aeb…/337文件/5,003,601B、sourcee7e558d2…；r10 30/30、地形owner17/17与5条hook端到端路径、完整1,583输入/双app及外置maps字节绑定通过，不等于手机行为验收。[地形残余等待决策](TERRAIN-RESIDUAL-NEXT-DECISION.md)已排除追旧key补SHA；r10仅随既有file_ready导出实际文件SHA/bytes，下一必要连续动作仍待验证。

60. [r10普通播放离线独审](R17-A1-R10-ORDINARY-OFFLINE-REVIEW.md)、[结构化核对](R17-A1-R10-ORDINARY-OFFLINE-REVIEW.json)：20份原件、12抽取帧及6PNG与严格协议核验；第二段约15秒仍播放，第二terminal与精确跨时钟锚点缺失。保完整B未验，不归因OOM或恢复相邻disable。

61. [当前交付独立审查](DELIVERY-OFFLINE-INDEPENDENT-REVIEW-20261019.md)：当前task及方法字节复用既有审查，隐私/结构/本地链接核对，历史快照与当前状态分开；后续实际交付仍由HANDOFF和CURRENT拥有。

62. [H3/H6离线准备与补保](H3-H6-OFFLINE-READINESS-20261019.md)：三件H3原始照片输入补保与同级恢复路径；PLAN/N05及真实接收对象的资格边界，不改gen26 UNKNOWN或代替微信接收。归档定位沿[H3准备owner](H3-PHONE-PREPARATION.md#清理前的源材料保全)。

63. [watch私有host锚点](R17-MEMORY-WATCH-ANCHOR.md)及[独立审查](R17-MEMORY-WATCH-ANCHOR-REVIEW.md)：只补task observer有限关联，5项fake host测试通过；不改产品/采样语义、不回填旧观察，实际写盘与设备关联未验。通用规则在原性能skill，不要求所有调查新建runId或重采样。

64. [实际main交付/CI/CD读回](DELIVERY-RUN-20261019.json)及[registry quota单候选审计](REGISTRY-QUOTA-CANDIDATE-AUDIT-20261019.md)：ba4完整CI通过，发布在100标签上限失败；identity实读1 exited/0 running。历史promote skipped不证明当前无引用，MFA/引用/精确OCI恢复条件未满足，不删tag或重试旧失败。当前执行状态仍由HANDOFF拥有。

65. [唯一停止API的身份补齐](STOPPED-API-IDENTITY-OBSERVATION.md)、[独审](STOPPED-API-IDENTITY-REVIEW.md)及[实际读回](STOPPED-API-IDENTITY-REMOTE-20261019.json)：22项/生成模块fake边界5项通过，新main完整CI及实际identity已建立1ccd/de4b停止元数据，并与该revision旧发布的start-writers失败绑定；旧run不回填，仍不证明当前receipt/全部引用或允许删tag。[发布引用观察边界](RELEASE-REFERENCE-OBSERVATION-BOUNDARY.md)保留已核选择理由，后续实现见67。

66. [本机任务资源精确收尾](LOCAL-RESOURCE-CLEANUP-20261019.json)：旧r9的381件有原归档匹配，旧r8的407件已补完整保全，两退役目录均核范围后移入回收站，可恢复；原归档和当前r10/gen26及账号材料保留。r3列表确认和8798任务规则停用仍有原生/管理员依赖，不称全部清理完成。

67. [固定发布引用观察](RELEASE-REFERENCE-OBSERVATION.md)、[首版独审](RELEASE-REFERENCE-INDEPENDENT-REVIEW.md)、[首轮远端](RELEASE-REFERENCE-REMOTE-20261019.json)及[部分结果修复独审](RELEASE-REFERENCE-PARTIAL-REVIEW.md)：首版完整CI已通过，实读base/停止API后目录枚举触限；固定链与批量耦合已修，4条原失败、修后43项及独立5场景通过，安全顺序P2已关闭。新版本交付/远端以该owner和HANDOFF为准。永远NON_ATOMIC/完整引用未验，不证明健康、精确OCI恢复或删tag资格。

执行规则与架构入口：仓库[AGENTS](../../../AGENTS.md)、[global](../../../project_context/global.md)、[运行时/领域责任](../../../project_context/architecture/runtime-and-domain.md)、[Map/Sky合同](../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)、[开发工具源码/窗口规则](../../../project_context/development-workflow/development-feedback.md#project-source-snapshots-and-windows)、[手机owner](../../../project_context/areas/main/verification/wechat-device.md)。使用最新[开发skill](../../skills/starward-miniapp-development/SKILL.md)和[性能方法](../../skills/starward-miniapp-development/references/performance-investigation.md)；设备操作再组合设备skill与同步后的官方wechatide场景。保留原委托决策/授权边界，具体工具行为以接手对话实际可用能力为准。

恢复读取顺序：get_goal → 本索引 → GOAL-OBJECTIVE、REQUIREMENTS、INHERITED-REQUIREMENTS、PLAN、HANDOFF → 最新开发skill/performance-investigation及将使用模块的证据。无Goal时仅在用户明确要求继续Goal后，按完整正文创建、不设token预算；已有等价Goal则续用，不以摘要替换或制造并行任务。本接手对话的明确继续指令已解除原暂停；恢复核源码/候选/在途状态和受影响的服务/窗口入口，历史文件的active或停止描述不覆盖新的人类指令。不要根据临时PID、过期截图/录屏或旧目录直接输入手机。保全部剩余义务、隐私与精确清理边界。
