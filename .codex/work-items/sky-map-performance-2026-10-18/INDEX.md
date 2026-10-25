# Starward 小程序剩余工作入口

**2026-10-25用户最终范围：当前及未来一段时间只做微信小程序。已有App与中断成果保留、不继续；已完成工作移出活跃计划。层叠性能和云观星播放性能继续后置。** 旧全仓报告、Goal和历史交接中的App任务不再构成当前待办。

## 当前控制文件

1. [GOAL-OBJECTIVE](GOAL-OBJECTIVE.md)：新对话创建无预算目标使用的完整小程序Goal正文。旧聊天工具Goal含App且paused，不直接续用其旧范围。
2. [REQUIREMENTS](REQUIREMENTS.md)、[INHERITED-REQUIREMENTS](INHERITED-REQUIREMENTS.md)：当前边界和原小程序剩余结果映射。
3. [PLAN](PLAN.md)：唯一活跃实施方案，只留未完成小程序工作及后置性能/条件分支。
4. [HANDOFF](HANDOFF.md)：唯一当前状态、源码/候选、服务、保全及下一步。
5. [HANDOFF-VALIDATION](HANDOFF-VALIDATION-20261025.md)：本次范围整理、独审、检查与Git交付记录。
6. [REVIEW-IMPLEMENTATION-AUDIT](REVIEW-IMPLEMENTATION-AUDIT-20261025.md)：Web GPT Pro全仓审查F01–F15/三重构/条件建议的去向，已完成历史与新增小程序判别。
7. [NEXT-CHAT-PROMPT](NEXT-CHAT-PROMPT.md)：给新对话的明确继续指令，不能单凭旧“active/next”启动App。

## 按责任查证据，不重新执行已完成项

| 责任 | 证据入口 |
| --- | --- |
| 采用UI/微信普通候选 | [R19剩余范围](R19-REMAINING-UI-SCOPE-20261023.md)、[本轮设计交接](../map-ui-design-2026-10-22/HANDOFF.md)、[Picker反馈](R19-PICKER-READONLY-20261025.md) |
| Map故障/资源 | [故障session](R20-MAP-FAULT-SESSION-20261024.md)、[独审](R20-MAP-FAULT-SESSION-REVIEW-20261024.md)、[目标准备缺口](R20-MAP-FAULT-TARGET-PREPARATION-20261024.md) |
| Sky/独立云量 | [接力独审](R20-REMOTE-SKY-REVIEW-20261024.md)、[F09](R20-SKY-TIME-QUERY-POLICY-20261023.md)、[F10](R20-INDEPENDENT-CLOUD-DELIVERY-20261023.md) |
| 管理/媒体 | [管理身份](R20-ADMIN-AUTH-VALIDATION-20261023.md)、[管理缓存独审](R20-ADMIN-CACHE-CONFIRMATION-REVIEW-20261024.md)、[媒体](R20-MEDIA-LIFECYCLE-20261023.md)、[续批](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)、[队列/锁序](R20-QUEUE-LOCK-INDEPENDENT-REVIEW-20261023.md) |
| 已完成数据/分发/主包基础 | [EOG原件](EOG-SOURCE-RECOVERY.json)、[数据交付](BACKEND-DATA-DELIVERY.json)、[Map静态adapter](MAP-STATIC-ADAPTER.md)、[主包准入](R20-PACKAGE-BUDGET-CLOSURE-20261024.md) |
| 后置性能 | [性能研究核对](PERFORMANCE-RESEARCH-RECONCILIATION.md)、[Sky研究](SKY-INTERACTION-RESEARCH.md)、[目标观测路线](TARGET-HEAP-OBSERVATION-ROUTE.md)、[本轮环境记录](R20-PERFORMANCE-ENVIRONMENT-RECOVERY-20261024.md) |
| 历史全仓审查/验证 | [R20原核验](REVIEW-RECONCILIATION-20261023.md)、[历史验证](CURRENT-VALIDATION-20261023.md)、[旧接力核验](R20-REMOTE-RECONCILIATION-20261024.md) |

历史报告仍原位保留，其当时的“当前/下一步/未完成App”不是现在的指令。旧INDEX/PLAN/提示词完整原字节另在task tmp/miniapp-handoff-20261025/original保全；这不是第二份计划。App代码、APK、工具链和证据不删除，不把App截图当小程序。
