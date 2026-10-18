# Starward 收口任务索引

当前阶段：用户新增R17，并明确本轮**只完成研究和计划更新后停下，等待后续明确开始实施**。同一[PLAN](PLAN.md#sky-interaction-module-r17)已补地景拖动/背面灰层、上方时间预览和时间尺性能。[研究与实际基线](SKY-INTERACTION-RESEARCH.md)、[包含SAO的CPU样本](SKY-TIME-CPU-BASELINE.json)、[向量局部试验](SKY-VECTOR-RESEARCH.json)、[拖动边界](SKY-DRAG-BASELINE.json)、[几何窗口](SKY-TIME-WINDOW-PROBE.json)保留结论和限制。EOG原始获取暂缓；其余义务保留。

唯一恢复入口。先前实施授权和完成成果继续保留；当前停点以上述用户最新阶段要求为准。夜间拟物、读屏、大文字和100m/cm仍排除。Goal尚有必需工作，不能标完成；不以工具状态单独代替用户的开始/停止指令。

1. [完整要求、授权和范围](REQUIREMENTS.md)：原始义务、有效修订、完成条件与暂缓项。
   [另一电脑补入的完整结果要求](INHERITED-REQUIREMENTS.md)：H1–H8、A01–A15/N01–N09保留编号、已完成成果复用、缺失原索引与新实施授权。
2. [当前唯一方案](PLAN.md)：2026-10-18按用户两次明确授权，先加入叠层性能，再依据指定[架构建议对照](ARCHITECTURE-ADVICE-RECONCILIATION.md)细化静态解耦、稳定请求身份、发布分发和有条件的固定中块试验；保留原性能/Map-Sky和继承义务。另一电脑固定方案和A/N映射现已通过私有恢复包取得，定位见INHERITED-REQUIREMENTS；后来用户修订继续优先。[Goal正文](GOAL-OBJECTIVE.md)此前已由用户覆盖并核实，本次用户结果未改变，无需再次替换正文。
3. [当前状态与恢复](HANDOFF.md)：当前源码、候选、服务、在途操作、下一动作及停止条件。
4. [性能/包体/分支总证据](VERIFICATION.md)、[真机证据](PHONE-VERIFICATION.md)、[转场修复候选字节](PHONE-FIX-CANDIDATE.json)及[对应源码指纹](PHONE-FIX-SOURCE-SNAPSHOT.json)。当前整合候选由[OVERLAY-CANDIDATE](OVERLAY-CANDIDATE.json)、[当前源码指纹](OVERLAY-SOURCE-SNAPSHOT.json)和HANDOFF拥有；不把历史转场候选当成当前手机包。软件、桌面、手机观察的效力不可互换。
5. [包体/CDN审计](PACKAGE-AUDIT.md)、[地图生命周期](MAP-LIFECYCLE.md)、[先前独立审查](INDEPENDENT-REVIEW.md)、[分支清理回执](BRANCH-CLEANUP.json)。后续手机修复的审查见真机证据和当前状态。
6. [合并与旧代码疑问复核](SOURCE-AND-MERGE-AUDIT.md)。原合并任务的 [证据](../main-integration-2026-10-17/VERIFICATION.md)、[设计迁移](../main-integration-2026-10-17/DESIGN-MIGRATION.json)、[父版本测试比较](../main-integration-2026-10-17/PARENT-TEST-COMPARISON.json) 保留，不重复迁移/合并。
7. [当前CI归因](CI-TRIAGE.md)、[部署夹具修复](CI-DEPLOYMENT-REPAIR.md)、[共享入口修复](CI-SHARED-ENTRY-REPAIR.md)、[本批独立复核](CI-INDEPENDENT-REVIEW.md)。当前全量结果与未决归类继续由 HANDOFF 和相应证据记录拥有。
8. [当前API全量归类](API-CURRENT-TESTS.md)、[小程序全量归类](MINIAPP-CURRENT-TESTS.md)、[API消费者修复](API-TEST-CONSUMER-REPAIR.md)、[Map消费者修复](MAP-TEST-CONSUMER-REPAIR.md)、[共享组件修复](SHARED-RENDERING-REPAIR.md)、[业务夹具修复](BUSINESS-TEST-CONSUMER-REPAIR.md)、[消费者独立审阅](TEST-CONSUMER-INDEPENDENT-REVIEW.md)。修复后结果不替代原失败记录，环境skip仍未验。
9. [Map聚焦与真实输入恢复审计](MAP-FOCUS-RESUME-AUDIT.md)、[地形/云量/光害性能与成熟方案调研](OVERLAY-PERFORMANCE-RESEARCH.md)、[generation4真机双向转场独立复核](PHONE-GEN4-REVIEW.md)。研究假设、源码事实和实际测量分开。
10. [首批叠层优化与执行归属](OVERLAY-FIRST-REPAIR.md)、[跨机运行资产迁移状态](ASSET-MIGRATION-STATUS.md)。用户已指定本聊天主实施，另一分叉已停止；原电脑发布输入现已收到并完成隔离恢复，文件/数据库/API与手机验收分开。旧全量通过不能覆盖新的叠层生产修改。
11. [手机实际选点范围与居中](PHONE-FOCUS-VERIFICATION.md)：generation5临时只读诊断包的3.394km、0.7px与拖动接管结果；不替代未完成的连续双指、其它入口和最终普通候选。
12. [当前山体遮挡接口摘要](HORIZON-CURRENT-API-SUMMARY.json)：现有手机API的真实COG模型及许可/假设读回，未包含站位坐标；接口读回不替代手机Canvas、缺测恢复或资料阅读验收。
13. [叠层服务实测摘要](OVERLAY-SERVICE-MEASUREMENTS.json)保留三阶段的成功与较慢样本、输出哈希及最终源码指纹；[临时聚焦观察器源码](FOCUS-OBSERVATION-PROBE.txt)与探针回执逐字节匹配，只作为证据保存，不在生产源码或普通候选里。
14. [远端检查点与CI回执](REMOTE-CI-CHECKPOINT.json)：当前组合提交9e5c75ef的Product CI39095632949完整通过，含Map空来源条、海报分包修复及隔离基础设施和镜像构建。Context自d8339c48的通过检查39090556680后未变；generation8/9手机结果保其各自范围。main仍在原整合提交，当前独立审阅和剩余用户结果未完成。
15. [当前候选的开发工具恢复证据](DEVTOOLS-RECOVERY.md)：受控退出重开后官方CLI已恢复，自动真机调试的实际手机连接与绑定见后续证据；旧MCP/SDK失败不能继续当成当前CLI不可用的依据。
16. [generation6真机反馈](PHONE-GEN6-VERIFICATION.md)：普通候选已绑定Android，真实选点打开中面板；无UI探针的原生范围/中心读回成立。后续连续操作、资料/来源与实际性能仍沿原义务继续；[只读测量源码](NATIVE-FOCUS-READBACK.txt)保留方法，不进入产品。
17. [云量时钟差修复](CLOUD-CLOCK-REPAIR.md)：手机与BFF约1秒时钟差导致新鲜格子被判为未来数据；保留来源时刻并统一查询与暂存层的有效期时钟，记录修复前失败、修复后检查及generation7真实云格/切时刻/拖动结果。当前手机定位拒绝与恢复、generation8空来源条修复及旧构建回收见[真机证据](PHONE-VERIFICATION.md#generation7-location-permission-recovery)。
18. [海报分包路径修复与真实相册保存](PHONE-VERIFICATION.md#generation9-poster-package-repair-and-native-album-save)：generation8失败、真实组件回归及generation9修后原生保存结果；已保存1张测试SPOT海报，真实接收/PLAN/导出文件交接仍未验，N05继续保留。
19. [给原电脑的可复制交接提示词](OTHER-COMPUTER-DATA-HANDOFF-PROMPT.md)：r6/配套DB/固定地形/原记录的盘点、存储选择、上传读回与恢复边界；原电脑已按交接分支提交资料并上传；当前接收端恢复结果由ASSET-MIGRATION-STATUS持有。
20. [静态夜光独立读取](STATIC-LIGHT-ISOLATION.md)：本次新接口、当前Map消费者、检查和构建范围。此前独审已在7627d9ad完成；本次后续生产修改不在该独审或历史全量CI内。

21. [原 r6 数据恢复和新同步机制](ASSET-MIGRATION-STATUS.md)、[完整数据库核验](RESTORED-DATABASE-CHECK.json)、[当前 API 核验](RESTORED-API-CHECK.json)、[仓库统一数据入口](../../../data-pipelines/runtime-data/README.md)。公共成品 LFS 与 Drive、重建大数据 Drive、私有恢复分责；原始 EOG 两个 TIFF 仍未上传，不能记为已备份。

22. [数据流程独立审查及修复](BACKEND-DATA-REVIEW.md)、[非默认端口真实隔离恢复](RESTORE-PORT-CHECK.json)、[交付与 CI](BACKEND-DATA-DELIVERY.json)、[原机补传 EOG 原始数据提示词](RAW-SOURCE-UPLOAD-PROMPT.md)。

23. [恢复数据后的约4km地形实际服务样本](RESTORED-TERRAIN-SAMPLE.json)：粗档固定包不含所请求z12细档，首次3.926s、重复6ms；属于后续叠层性能责任，不能把恢复/API通过当真机优化已验收。

执行规则与架构入口：仓库 [AGENTS](../../../AGENTS.md)、[global](../../../project_context/global.md)、[运行时/领域责任](../../../project_context/architecture/runtime-and-domain.md)、[Map/Sky合同](../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)、[开发工具源码/窗口规则](../../../project_context/development-workflow/development-feedback.md#project-source-snapshots-and-windows)、[手机 owner](../../../project_context/areas/main/verification/wechat-device.md)。适用技能为 `.codex/skills/starward-miniapp-development`、`.codex/skills/starward-wechat-device-verification`、`.codex/skills/uiux_design` 与已安装官方 wechatide scenes；本次 durable-goal 原文位于 `C:/Users/777/.codex/skills/durable-goal/SKILL.md`。

恢复顺序：get_goal → 本索引 → REQUIREMENTS、PLAN、HANDOFF → 当前模块证据；先核后续用户是否明确开始，再检查源码/候选/服务/窗口实际状态。已有方案变更遵守 durable-goal 的明确授权边界。不要根据临时 PID、过期截图、旧录屏或旧生成目录直接输入手机。没有密钥、二维码、手机定位或设备标识写在这里。
