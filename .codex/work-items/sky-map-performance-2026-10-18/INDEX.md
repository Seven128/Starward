# Starward 小程序剩余工作入口

**当前范围：** [性能维护四点](PLAN.md#performance-maintenance)已完成，**已按用户要求停止**。第1、2点以实际代码/消费者及Map58、Sky98项现有行为回归核对；第3、4点已接入原开发skill与Context，唯一PLAN同步。本轮没有新生产代码修补或设备采集。当前Goal工具为paused，完整Goal未完成，不恢复全国EOG及其它任务。授权归[RESUME](RESUME-20261030.md#性能维护四点授权)，结果归[核对记录](PERFORMANCE-MAINTENANCE-20261030.md)，当前状态只看[HANDOFF](HANDOFF.md)。

**本日最新：** F04修复版[手机回归已通过旧图层清理及恢复](TERRAIN-DEVICE-20261029.md#f04-resource-repair-user-result)：真实旧remove成功、pin=0、旧coordinator全部退休，后继地形可见。用户按钮出现即点击，5秒持续显示未观察；不为这项重演F04，停止arm/重载/额外采集，物理native/GPU字节未知保持。实体转动已确认，山体遮挡验收取消，Sky性能按用户要求收口、实际卡顿再开。完整Goal工具仍paused且未完成，全国EOG暂停，范围沿[恢复记录](RESUME-20261030.md#本日后续范围裁决与当前两项核验)。

完整Goal后续仍有原P2光害[宽视野低LOD基础供给](EOG-STATIC-PREPARATION-20261028.md#wide-view-source-dependency)及已中断的有界源域接线，等待另行恢复；不能重开已结束F04或D2。完整授权与本日有效修订见[恢复记录](RESUME-20261030.md)。地形/Sky这轮性能、交互和故障修复已收口；P3地景/时间事务/384px布局、r6夜光与部分P1目标证据按下表复用。原PLAN[同机制收敛规则](PLAN.md#performance-scenario-consolidation)继续有效，未运行变体不冒实测通过。物理资源/容量UNKNOWN保真但不自动触发采集；P1–P6及正式交付其余义务仍在。

## 当前控制文件

- 用户要求的旧Map回收：[旧af257/052a现场](TERRAIN-DEVICE-20261029.md#f04-resource-user-run-result)曾无回执/pin=1；[新de665/fbfd修复现场](TERRAIN-DEVICE-20261029.md#f04-resource-repair-user-result)已取得对应旧remove成功、pin=0、retired及实际恢复图。两个现场均终态，清单只供追溯；物理逐Map字节unknown，未证泄漏，不重复采集。

本聊天的明确授权与停止边界见 [2026-10-30 实施恢复](RESUME-20261030.md)；前期已完成，本次四点维护增量已交付并停止。

1. [GOAL-OBJECTIVE](GOAL-OBJECTIVE.md)：新对话创建无预算目标使用的完整小程序Goal正文。当前Goal为小程序、无预算，状态以get_goal实读为准；新对话先get_goal，用户最新允许subagent，继续分析/修复/优化；执行顺序归现行PLAN，不恢复更早App范围。
2. [REQUIREMENTS](REQUIREMENTS.md)、[INHERITED-REQUIREMENTS](INHERITED-REQUIREMENTS.md)：当前边界和原小程序剩余结果映射。
3. [PLAN](PLAN.md)：唯一活跃实施方案，只留未完成结果、产品约束及有条件分支；最新性能去重直接收进[同机制收敛规则](PLAN.md#performance-scenario-consolidation)、[D1](PLAN.md#terrain-performance)与[D2](PLAN.md#sky-time-performance)。执行时完整读取，不恢复旧场景枚举或外部报告的优先清单。
4. [HANDOFF](HANDOFF.md)：唯一当前状态、源码/候选、服务、保全及下一步。
5. [最新交接核对](HANDOFF-VALIDATION-20261030.md)：本轮paused、收口及剩余义务、整理前快照、1679源输入/六份候选/七份F04原件、当前API ready与文档保全；同日早交接原文保在本轮快照。[10-29核对](HANDOFF-VALIDATION-20261029.md)、[10-28核对](HANDOFF-VALIDATION-20261028.md)和[10-25核对](HANDOFF-VALIDATION-20261025.md)只作历史证据，不恢复旧状态/指令。
6. [REVIEW-IMPLEMENTATION-AUDIT](REVIEW-IMPLEMENTATION-AUDIT-20261025.md)：Web GPT Pro全仓审查F01–F15/三重构/条件建议的去向，已完成历史与新增小程序判别。
7. [NEXT-CHAT-PROMPT](NEXT-CHAT-PROMPT.md)：地形/Sky收口后的完整续接提示，明确durable-goal、已授权阶段、暂停后恢复、P2下一动作及多agent分工；用户复制发送后恢复完整任务。本轮不自动创建或向新对话发消息。
8. [换机说明](CROSS-MACHINE-HANDOFF-20261027.md)、[交接包身份](HANDOFF-TRANSFER-20261027.json)、[本机接收回执](HANDOFF-RECEIVE-20261027.json)：19/19性能分片、私有恢复包及独立密钥均已在本机下载、认证解密、重组并逐文件校验解压；当前main已安全快进1fd25800，dirty保留。接收后的[最新任务库恢复](LOCAL-SOURCE-RUNTIME-20261027.md)和[Sky图像Query修复](SKY-IMAGE-QUERY-RETENTION-20261027.md)分别持有结果；服务/产品验收未完，不照搬源机历史状态。

本线程实际续办、最终普通候选和校正后的验证边界见[普通微信入口恢复](R20-WEAPP-ENTRY-RECOVERY-20261025.md)；该证据不构成第二份计划，当前状态/唯一下一步仍只归HANDOFF。最小管理输入判别已完成，沿HTTP/独审证据复用。

## 按责任查证据，不重新执行已完成项

| 责任 | 证据入口 |
| --- | --- |
| D1当前手机地形 | [真实请求/父图和最终LOD、署名修复与返回](TERRAIN-DEVICE-20261029.md)、[F04修复后真实恢复、旧remove成功/pin归零/退休](TERRAIN-DEVICE-20261029.md#f04-resource-repair-user-result)；物理字节未知保持 |
| P3地景与时间事务 | [手机背面方向/取消应用、384px布局修复与候选](SKY-P3-DEVICE-20261030.md) |
| D0/P2当前夜光 | [r6实际显色/内部配准、两层合成、缺云与全关](NIGHTLIGHT-DEVICE-20261030.md) |
| P2光害有限预制 | [覆盖读取](EOG-STATIC-PREPARATION-20261028.md#prepared-covering-window)、[跨part显示](EOG-STATIC-PREPARATION-20261028.md#cross-part-prepared-display)、[真实源边界](EOG-STATIC-PREPARATION-20261028.md#real-part-source-boundary)、[批量声明](EOG-STATIC-PREPARATION-20261028.md#bounded-preparation-inputs)及[面积CPU窄修](EOG-COARSE-MASS-20261028.md#interior-mass-fastpath)已有局部结果；[宽视野低LOD支持](EOG-STATIC-PREPARATION-20261028.md#wide-view-source-dependency)、全国规格与正式分发未完成 |
| 微信定位候选 | [真实定位返回与未应用离开](R19-LOCATION-CANDIDATE-PHONE-20261025.md) |
| 普通手机API与原生取消 | [8808入口、系统边界与取消返回](R20-PHONE-CURRENT-API-20261025.md) |
| 采用转场与层叠窄修 | [手机序列、视觉存续修复及独审](R19-LAYER-PRESENTATION-20261025.md) |
| 采用UI/微信普通候选 | [源码接入及10-30书签/层叠布局/banner/事件往返目标观察](UI-INTEGRATION-20261027.md)、[R19剩余范围](R19-REMAINING-UI-SCOPE-20261023.md)、[本轮设计交接](../map-ui-design-2026-10-27/HANDOFF.md)、[Picker反馈](R19-PICKER-READONLY-20261025.md) |
| Map故障/资源 | [真实r6供给与首次失败状态](R20-P2-REAL-PUBLICATION-READBACK-20261025.md)、[故障session](R20-MAP-FAULT-SESSION-20261024.md)、[独审](R20-MAP-FAULT-SESSION-REVIEW-20261024.md)、[目标准备缺口](R20-MAP-FAULT-TARGET-PREPARATION-20261024.md) |
| 山体与资料资格 | [当前模型、实际轮廓与阅读恢复](R20-P5-HORIZON-READER-20261025.md)、[现用公开资料/环境输入资格](R20-P5-INPUT-QUALIFICATION-20261025.md) |
| Sky/独立云量 | [当前独立WEAPP入口与两处窄修](R20-SKY-INDEPENDENT-ENTRY-20261025.md)、[接力独审](R20-REMOTE-SKY-REVIEW-20261024.md)、[F09](R20-SKY-TIME-QUERY-POLICY-20261023.md)、[F10](R20-INDEPENDENT-CLOUD-DELIVERY-20261023.md) |
| 管理/媒体 | [管理身份](R20-ADMIN-AUTH-VALIDATION-20261023.md)、[管理缓存独审](R20-ADMIN-CACHE-CONFIRMATION-REVIEW-20261024.md)、[媒体](R20-MEDIA-LIFECYCLE-20261023.md)、[续批](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)、[队列/锁序](R20-QUEUE-LOCK-INDEPENDENT-REVIEW-20261023.md) |
| 已完成数据/分发/主包基础 | [EOG原件](EOG-SOURCE-RECOVERY.json)、[数据交付](BACKEND-DATA-DELIVERY.json)、[Map静态adapter](MAP-STATIC-ADAPTER.md)、[主包准入](R20-PACKAGE-BUDGET-CLOSURE-20261024.md) |
| 当前云量迁移实现及真实资格边界 | [数值/代表图](CLOUD-NATIONWIDE-BATCH-20261028.md)、[BFF组合/独立deadline](CLOUD-BFF-INTEGRATION-20261028.md)、[客户端/Context恢复](CLOUD-CLIENT-INTEGRATION-20261028.md)、[来源/覆盖](CLOUD-SOURCE-COVERAGE-20261028.md)、[栅格合同/只读成品/构建审计](CLOUD-RASTER-BOUNDARY-20261028.md)、[Map精确读取/源质量差异修复](CLOUD-MAP-READ-INTENT-20261028.md)、[第三Map消费者软件集成/目标未验](CLOUD-MAP-CONSUMER-20261028.md)、[原静态owner本地准备/禁上传](CLOUD-STATIC-PREPARATION-20261028.md)、[源获取/更正组权威与失败批次](CLOUD-SOURCE-QUALIFICATION-20261028.md)、[离线有界执行/真实单窗/有限显示质量](CLOUD-DISPLAY-EXECUTION-20261028.md) |
| 当前EOG与地形成品接通 | [EOG代表批次](EOG-NATIONWIDE-BATCH-20261028.md)、[粗层mass](EOG-COARSE-MASS-20261028.md)、[原preparer接线](EOG-PREPARER-INTEGRATION-20261028.md)、[真实v3/canonical窗口](EOG-REAL-PREPARER-20261028.md)、[分片/坐标prepared reader](EOG-COORDINATE-READER-20261028.md)、[多part发布/受控Service与隔离真PG](EOG-PUBLISHER-CONSUMER-20261028.md)、[原静态owner DEV封口/禁上传](EOG-STATIC-PREPARATION-20261028.md)、[有界Map目录/旧版兼容](EOG-STATIC-PREPARATION-20261028.md#partitioned-map-static-index)、[地形选定成品](TERRAIN-D1-IMPLEMENTATION-20261028.md)、[17窗有限批次/实际HTTP](TERRAIN-OBSERVED-BATCH-20261028.md) |
| 当前环境及UI实际观察 | [Staging只读容量/停止API/引用边界](STAGING-READONLY-20261028.md)、[当前HEAD实际CI步骤](CI-READBACK-20261028.md)、[普通WEAPP画面/控件/构建恢复](WEAPP-UI-OBSERVATION-20261028.md)；当下候选与服务仍只看HANDOFF |
| 当前优先性能 | [D2因果与缺口](SKY-D2-CAUSAL-20261028.md)、[当前解码准备与独审](D2-DECODE-PREPARATION-20261028.md)、[候选12后续批分析与Console已补证](PERFORMANCE-AFTERFIX-BATCH-ANALYSIS-20261026.md)、[D0–D2代码、候选和手机结果](D0-D2-REPAIR-20261026.md)、[四份采集与首轮分析](PERFORMANCE-CAPTURE-ANALYSIS-20261026.md)、[失败/提示独审](PERF-CAPTURE-SOURCE-REVIEW-20261026.md)、[唯一执行入口与用户操作分工](TARGET-HEAP-OBSERVATION-ROUTE.md#current-performance-entry)、[已执行采集清单](TARGET-HEAP-OBSERVATION-ROUTE.md#operator-checklist)、[前置恢复证据](PERFORMANCE-ENTRY-20261026.md)、[性能研究核对](PERFORMANCE-RESEARCH-RECONCILIATION.md)、[Sky研究](SKY-INTERACTION-RESEARCH.md) |
| 历史全仓审查/验证 | [R20原核验](REVIEW-RECONCILIATION-20261023.md)、[历史验证](CURRENT-VALIDATION-20261023.md)、[旧接力核验](R20-REMOTE-RECONCILIATION-20261024.md) |

历史报告仍原位保留，其当时的“当前/下一步/未完成App”不是现在的指令。旧INDEX/PLAN/提示词完整原字节另在task tmp/miniapp-handoff-20261025/original保全；这不是第二份计划。App代码、APK、工具链和证据不删除，不把App截图当小程序。
