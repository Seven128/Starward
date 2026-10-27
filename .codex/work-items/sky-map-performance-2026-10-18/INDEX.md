# Starward 小程序剩余工作入口

**当前：用户要求全部变更提交推远端并换机。产品源码到候选19，API18；19披露遮挡修复的目标回归仍待做，18及此前保有窄场景证据。完整Goal未完成，冷源端到端、全天视野、持续内存和OOM仍保留。先读HANDOFF与换机说明，不把提交/交接冒完成。**

## 当前控制文件

1. [GOAL-OBJECTIVE](GOAL-OBJECTIVE.md)：新对话创建无预算目标使用的完整小程序Goal正文。当前Goal为小程序、无预算，状态以get_goal实读为准；新对话先get_goal，用户最新允许subagent，继续分析/修复/优化；执行顺序归现行PLAN，不恢复更早App范围。
2. [REQUIREMENTS](REQUIREMENTS.md)、[INHERITED-REQUIREMENTS](INHERITED-REQUIREMENTS.md)：当前边界和原小程序剩余结果映射。
3. [PLAN](PLAN.md)：唯一活跃实施方案，只留未完成小程序工作；性能与本批故障修复当前优先，其他条件分支保留。
4. [HANDOFF](HANDOFF.md)：唯一当前状态、源码/候选、服务、保全及下一步。
5. [HANDOFF-VALIDATION](HANDOFF-VALIDATION-20261025.md)：范围整理及本轮采集交接的独审、检查与Git边界；旧后置条款已标历史。
6. [REVIEW-IMPLEMENTATION-AUDIT](REVIEW-IMPLEMENTATION-AUDIT-20261025.md)：Web GPT Pro全仓审查F01–F15/三重构/条件建议的去向，已完成历史与新增小程序判别。
7. [NEXT-CHAT-PROMPT](NEXT-CHAT-PROMPT.md)：给新对话的明确继续指令，不能单凭旧“active/next”启动App。
8. [换机说明](CROSS-MACHINE-HANDOFF-20261027.md)、[交接包身份](HANDOFF-TRANSFER-20261027.json)：本次Git/数据/私有恢复边界及可直接使用的接续提示词；包未上传时明确LOCAL_ONLY。

本线程实际续办、最终普通候选和校正后的验证边界见[普通微信入口恢复](R20-WEAPP-ENTRY-RECOVERY-20261025.md)；该证据不构成第二份计划，当前状态/唯一下一步仍只归HANDOFF。最小管理输入判别已完成，沿HTTP/独审证据复用。

## 按责任查证据，不重新执行已完成项

| 责任 | 证据入口 |
| --- | --- |
| 微信定位候选 | [真实定位返回与未应用离开](R19-LOCATION-CANDIDATE-PHONE-20261025.md) |
| 普通手机API与原生取消 | [8808入口、系统边界与取消返回](R20-PHONE-CURRENT-API-20261025.md) |
| 采用转场与层叠窄修 | [手机序列、视觉存续修复及独审](R19-LAYER-PRESENTATION-20261025.md) |
| 采用UI/微信普通候选 | [R19剩余范围](R19-REMAINING-UI-SCOPE-20261023.md)、[本轮设计交接](../map-ui-design-2026-10-22/HANDOFF.md)、[Picker反馈](R19-PICKER-READONLY-20261025.md) |
| Map故障/资源 | [真实r6供给与首次失败状态](R20-P2-REAL-PUBLICATION-READBACK-20261025.md)、[故障session](R20-MAP-FAULT-SESSION-20261024.md)、[独审](R20-MAP-FAULT-SESSION-REVIEW-20261024.md)、[目标准备缺口](R20-MAP-FAULT-TARGET-PREPARATION-20261024.md) |
| 山体与资料资格 | [当前模型、实际轮廓与阅读恢复](R20-P5-HORIZON-READER-20261025.md)、[现用公开资料/环境输入资格](R20-P5-INPUT-QUALIFICATION-20261025.md) |
| Sky/独立云量 | [当前独立WEAPP入口与两处窄修](R20-SKY-INDEPENDENT-ENTRY-20261025.md)、[接力独审](R20-REMOTE-SKY-REVIEW-20261024.md)、[F09](R20-SKY-TIME-QUERY-POLICY-20261023.md)、[F10](R20-INDEPENDENT-CLOUD-DELIVERY-20261023.md) |
| 管理/媒体 | [管理身份](R20-ADMIN-AUTH-VALIDATION-20261023.md)、[管理缓存独审](R20-ADMIN-CACHE-CONFIRMATION-REVIEW-20261024.md)、[媒体](R20-MEDIA-LIFECYCLE-20261023.md)、[续批](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)、[队列/锁序](R20-QUEUE-LOCK-INDEPENDENT-REVIEW-20261023.md) |
| 已完成数据/分发/主包基础 | [EOG原件](EOG-SOURCE-RECOVERY.json)、[数据交付](BACKEND-DATA-DELIVERY.json)、[Map静态adapter](MAP-STATIC-ADAPTER.md)、[主包准入](R20-PACKAGE-BUDGET-CLOSURE-20261024.md) |
| 当前优先性能 | [候选12后续批分析与Console已补证](PERFORMANCE-AFTERFIX-BATCH-ANALYSIS-20261026.md)、[D0–D2代码、候选和手机结果](D0-D2-REPAIR-20261026.md)、[四份采集与首轮分析](PERFORMANCE-CAPTURE-ANALYSIS-20261026.md)、[失败/提示独审](PERF-CAPTURE-SOURCE-REVIEW-20261026.md)、[唯一执行入口与用户操作分工](TARGET-HEAP-OBSERVATION-ROUTE.md#current-performance-entry)、[已执行采集清单](TARGET-HEAP-OBSERVATION-ROUTE.md#operator-checklist)、[前置恢复证据](PERFORMANCE-ENTRY-20261026.md)、[性能研究核对](PERFORMANCE-RESEARCH-RECONCILIATION.md)、[Sky研究](SKY-INTERACTION-RESEARCH.md) |
| 历史全仓审查/验证 | [R20原核验](REVIEW-RECONCILIATION-20261023.md)、[历史验证](CURRENT-VALIDATION-20261023.md)、[旧接力核验](R20-REMOTE-RECONCILIATION-20261024.md) |

历史报告仍原位保留，其当时的“当前/下一步/未完成App”不是现在的指令。旧INDEX/PLAN/提示词完整原字节另在task tmp/miniapp-handoff-20261025/original保全；这不是第二份计划。App代码、APK、工具链和证据不删除，不把App截图当小程序。
