# Stellarium源码调研的采用裁决

2026-10-14。用户明确暂停当前实施，并授权阅读《调研 Stellarium 架构与性能》、将有用改进更新到现有方案。完整消息及阶段边界见[REQUIREMENTS](../REQUIREMENTS.md#2026-10-14-暂停实施并吸收stellarium源码调研)。同一Goal已按要求记为paused、无预算；本次只做资料/源码核对和文档修订，没有恢复产品实施。

已通过`read_thread`读取引用聊天`local/01a136bd-9002-7a30-935a-4c5a9b272f5f`及其最终交付，再完整核读[研究报告](stellarium-source-architecture-performance-2026-10-14.md)。报告绑定公开Web `7d45c8fec393fbbabadcefa935794290fc39723d`、桌面`8e3062e220808537936e492b108dabaed0c3faa4`；其Starward快照早于后续大量实施，不能把当时缺口直接当当前待办。报告保留原文和当时“建议未采用”的历史结论；本文件记录本次采用裁决，方法只归[唯一PLAN](../PLAN.md#stellarium方法迁移与性能实施边界)。

## 采用与不采用

| 研究建议 | 本次核对与裁决 | 归属/证据边界 |
| --- | --- | --- |
| 准备/上传分阶段、逐帧软预算 | 纳入优先有界验证。桌面`StelTexture::bind`确实在启动下一次主线程glLoad之前核累计耗时；本地原`createSkyGpuTextures.getWindow`仍同步上传并查错误，`prepareArtwork`/ready.draw仍以Boolean表达可用/失败。因此需要先补明“本帧暂缓”与失败/已准备的语义，再决定是否采用调度；不能简单加次数限制或把false当失败。 | B/F原texture→renderer→surface/ready→Scene→writer，以及所有实际调用者。只借鉴方法，不复制实现。旧r69单miss/getError长尾不保证可被软预算修复；新方案须同时测多到达与单到达的差异和等待代价。 |
| 名称与图层同帧连续性 | 保留并完成剩余修复/验收，**已有实现不重建**。当前`spot-sky-page`调用同一nameLayout的selected/target/catalog/constellation，surface同copy和现accepted owner继续发布当前框；`sky-ready-artwork`已含registered、同源两档及mesh/group适配，runtime owner记录IR/native levels与HiPS各自合成。 | B/E/F。r100–r104及此前有效证据继续复用；源码接线不证明完整原生文字/跟随/所有资源恢复通过，历史FAILED/UNKNOWN/MISSING保原。 |
| 星座静态拓扑与UV复用 | 纳入次序靠后的局部验证。当前`resolveConstellationFrame`已有出版motion WeakMap和每scene单当前frame；换时刻仍构造线关系、unique HIP成员、标签聚合成员与anchor UV。只把可证明静态且实测有收益的子项上移。 | B/D/F的constellation scene/registration。当前自行、ENU旋转、归一化/配准和当前相机裁剪保持；不套365天近似、不加整日/历史frame缓存。 |
| 更早按星等限定候选 | 纳入有条件的局部验证。当前Scene已在投影前cheap reject，但BSC仍forEach、SAO仍逐行；两类排序不同，不能直接对任意输入break。候选优化不得改原绘制/命中次序或省掉退出余影。 | B/D/F原admitted render model及Scene；量真实BSC与SAO参与负载。旧SAO=0样本不证明深星收益；无收益或复杂性不合适则保原。 |
| HiPS投影像素LOD、WASM/worker、二进制目录、文字atlas、direct GL | 保留为条件候选，本次不采用或设为必交付。HiPS基面缓存已存在且普通供给仍关；其余必须各有对应热点、目标平台/寿命/兼容和权益证据。 | 沿原owner与引擎重评条件；不重新建立引擎/字库/星库，不扩大源和资源预算。 |
| 全套引擎替换及照搬公开Web具体实现 | 不采用。当前证据没有同条件微信收益；公开Web的同步worker、tile fade未接通、逐批VBO与尺寸比较缺陷不构成改进。原rAF对照和无依据预取/池化路线不重开。 | 原外部能力与运行架构选择保持；代码实现、方法、数据、图片和分发权益分别处理。 |

## 当前源码与后续实施的关键区别

- 本次核对真实现owner及消费者，不回滚研究后完成的名称、资源就绪、时间/地景、星点/银河成果。`sky-gpu-textures`已有identity/window复用、frame pins、失败锁及finish退休；“增加缓存”不是新工作。
- 软预算如获采用，所有实际texture caller共同遵守原GPU准入责任，家族仅保自己的合成/回执适配。暂缓不能触发failed latch、metadata重试、提前授信或永久饥饿；当前需求、hide/代次取消与旧粗图租约必须连到真实消费者，不能只新增helper。
- 新指标沿现测量入口；同FOV数字不等于同投影角覆盖，loaded/eligible/submitted/accepted也不同。CPU wall、GPU elapsed、accepted-copy间隔、物理FPS和内存分别保真。本次没有新增性能测量，不承诺比例收益。
- 当前资源准入修复与包体问题是恢复实施时的先行工作，未因研究改成通过：M51原生仍只有manifest失败读回；UTF8修复最新源有38合同检查，r106/r107包体失败未推送，r108尚未构建。精确源、候选和下一动作仅见[CONTINUE](../CONTINUE-CLOUD-SKY.md)，不是本研究结论或新PLAN条目。

## 保存与核对

只更新同任务的PLAN、必要运行/外部能力Context、完整目标说明和恢复导航；原研究报告、原33项验收正文、生产源与所有旧构建/失败/图片保留。目标结果不变，Goal完整说明只补方法及本次暂停，工具没有已有正文编辑接口，未声称覆盖工具正文。

修订前文件保存在[既有研究output的前像清单](../../../../output/cloud-sky-stellarium-architecture-2026-10-14/plan-review-preimages.json)。本次相关现源码指纹与文档/链接/33行保护检查归同目录`plan-review-current-source.json`、`plan-review-validation.json`；Context结构校验归`plan-review-context-validation.log`。它们只证明本次文档维护范围，不证明产品性能、实际运行、独立审查或完整Goal通过。

本次为有来源及当前代码依据的采用自审；独立审查没有取得，原V07缺口保留。后续明确继续时按保存PLAN/CONTINUE实施，不重读聊天或重做这轮研究。
