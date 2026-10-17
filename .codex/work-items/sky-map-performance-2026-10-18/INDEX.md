# Starward 收口任务索引

唯一恢复入口。当前阶段：**前期整理后已获用户后续明确“加上去续上接着做”授权，继续执行剩余工作**。2026-10-18 用户调用 durable-goal、暂缓夜间拟物，随后补入另一电脑未完任务并授权继续；又确认排除读屏和大文字。Goal 尚有必需工作，不能标完成。停止/继续判断以这组有效修订为准，不以工具active单独代替授权。

1. [完整要求、授权和范围](REQUIREMENTS.md)：原始义务、有效修订、完成条件与暂缓项。
   [另一电脑补入的完整结果要求](INHERITED-REQUIREMENTS.md)：H1–H8、A01–A15/N01–N09保留编号、已完成成果复用、缺失原索引与新实施授权。
2. [当前唯一方案](PLAN.md)：2026-10-18按用户明确“更新下计划方案，加进去”授权，加入地形/云量/光害叠层性能的完整链路测量、成熟方案调研、共享职责、优化与真机完成条件，保留原性能/Map-Sky和继承义务。另一电脑固定方案尚缺，不臆造其A/N编号内容。[完整新版Goal正文](GOAL-OBJECTIVE.md)已由用户覆盖到当前Goal，经get_goal核实；并非agent通过不支持的正文编辑工具修改。
3. [当前状态与恢复](HANDOFF.md)：当前源码、候选、服务、在途操作、下一动作及停止条件。
4. [性能/包体/分支总证据](VERIFICATION.md)、[真机证据](PHONE-VERIFICATION.md)、[最新候选字节](PHONE-FIX-CANDIDATE.json)、[最新源码指纹](PHONE-FIX-SOURCE-SNAPSHOT.json)。软件、桌面、手机观察的效力不可互换。
5. [包体/CDN审计](PACKAGE-AUDIT.md)、[地图生命周期](MAP-LIFECYCLE.md)、[先前独立审查](INDEPENDENT-REVIEW.md)、[分支清理回执](BRANCH-CLEANUP.json)。后续手机修复的审查见真机证据和当前状态。
6. [合并与旧代码疑问复核](SOURCE-AND-MERGE-AUDIT.md)。原合并任务的 [证据](../main-integration-2026-10-17/VERIFICATION.md)、[设计迁移](../main-integration-2026-10-17/DESIGN-MIGRATION.json)、[父版本测试比较](../main-integration-2026-10-17/PARENT-TEST-COMPARISON.json) 保留，不重复迁移/合并。
7. [当前CI归因](CI-TRIAGE.md)、[部署夹具修复](CI-DEPLOYMENT-REPAIR.md)、[共享入口修复](CI-SHARED-ENTRY-REPAIR.md)、[本批独立复核](CI-INDEPENDENT-REVIEW.md)。当前全量结果与未决归类继续由 HANDOFF 和相应证据记录拥有。
8. [当前API全量归类](API-CURRENT-TESTS.md)、[小程序全量归类](MINIAPP-CURRENT-TESTS.md)、[API消费者修复](API-TEST-CONSUMER-REPAIR.md)、[Map消费者修复](MAP-TEST-CONSUMER-REPAIR.md)、[共享组件修复](SHARED-RENDERING-REPAIR.md)、[业务夹具修复](BUSINESS-TEST-CONSUMER-REPAIR.md)、[消费者独立审阅](TEST-CONSUMER-INDEPENDENT-REVIEW.md)。修复后结果不替代原失败记录，环境skip仍未验。
9. [Map聚焦与真实输入恢复审计](MAP-FOCUS-RESUME-AUDIT.md)、[地形/云量/光害性能与成熟方案调研](OVERLAY-PERFORMANCE-RESEARCH.md)、[generation4真机双向转场独立复核](PHONE-GEN4-REVIEW.md)。研究假设、源码事实和实际测量分开。
10. [首批叠层优化与执行归属](OVERLAY-FIRST-REPAIR.md)、[跨机运行资产迁移状态](ASSET-MIGRATION-STATUS.md)。用户已指定本聊天主实施，另一分叉已停止；原电脑可能可用但发布输入未迁移。旧全量通过不能覆盖新的叠层生产修改。
11. [手机实际选点范围与居中](PHONE-FOCUS-VERIFICATION.md)：generation5临时只读诊断包的3.394km、0.7px与拖动接管结果；不替代未完成的连续双指、其它入口和最终普通候选。
12. [当前山体遮挡接口摘要](HORIZON-CURRENT-API-SUMMARY.json)：现有手机API的真实COG模型及许可/假设读回，未包含站位坐标；接口读回不替代手机Canvas、缺测恢复或资料阅读验收。
13. [叠层服务实测摘要](OVERLAY-SERVICE-MEASUREMENTS.json)保留三阶段的成功与较慢样本、输出哈希及最终源码指纹；[临时聚焦观察器源码](FOCUS-OBSERVATION-PROBE.txt)与探针回执逐字节匹配，只作为证据保存，不在生产源码或普通候选里。
14. [远端检查点与CI回执](REMOTE-CI-CHECKPOINT.json)：当前代码已推328cf67e，Product CI39078337145全部通过，含隔离基础设施和镜像构建；后续只有Context/任务记录更新。main仍在原整合提交，当前独立审阅和剩余用户结果未完成。

执行规则与架构入口：仓库 [AGENTS](../../../AGENTS.md)、[global](../../../project_context/global.md)、[运行时/领域责任](../../../project_context/architecture/runtime-and-domain.md)、[Map/Sky合同](../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)、[开发工具源码/窗口规则](../../../project_context/development-workflow/development-feedback.md#project-source-snapshots-and-windows)、[手机 owner](../../../project_context/areas/main/verification/wechat-device.md)。适用技能为 `.codex/skills/starward-miniapp-development`、`.codex/skills/starward-wechat-device-verification`、`.codex/skills/uiux_design` 与已安装官方 wechatide scenes；本次 durable-goal 原文位于 `C:/Users/777/.codex/skills/durable-goal/SKILL.md`。

恢复顺序：get_goal → 本索引 → REQUIREMENTS、PLAN、HANDOFF → 当前模块证据；先核后续用户是否明确开始，再检查源码/候选/服务/窗口实际状态。已有方案变更遵守 durable-goal 的明确授权边界。不要根据临时 PID、过期截图、旧录屏或旧生成目录直接输入手机。没有密钥、二维码、手机定位或设备标识写在这里。
