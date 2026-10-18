# Starward 收口任务索引

当前阶段：R17研究已完成；用户新增R18，说明EOG可下载，要求纳入计划、保留Web GPT Pro叠层方案并交接到新对话。本聊天**完成研究/方案/交接后停下**；用户在新对话发送[继续执行提示词](NEXT-CHAT-PROMPT.md)即明确开始实施。EOG官方下载→精确校验→私有Drive备份已列入同一[PLAN](PLAN.md#eog-source-recovery-and-commit-bound-synchronization-r16r18)，尚未实际下载/备份。地形/云量/光害、R17和H1–H8均保留，执行默认值和少数委托决策也在PLAN。

[Sky研究与实际基线](SKY-INTERACTION-RESEARCH.md)、[包含SAO的CPU样本](SKY-TIME-CPU-BASELINE.json)、[向量局部试验](SKY-VECTOR-RESEARCH.json)、[拖动边界](SKY-DRAG-BASELINE.json)、[几何窗口](SKY-TIME-WINDOW-PROBE.json)保留结论和限制；生产修复未实施。

唯一恢复入口。先前成果继续保留，当前阶段以上述用户最新要求为准。夜间拟物、读屏、大文字和100m/cm仍排除。旧Goal工具blocked、正文未替换；最新正文已准备在GOAL-OBJECTIVE。Goal仍有必需工作，不能标完成；新对话的创建/续用与明确实施指令见HANDOFF，不以工具状态单独代替用户授权。

1. [完整要求、授权和范围](REQUIREMENTS.md)：原始义务、有效修订、完成条件与暂缓项。
   [另一电脑补入的完整结果要求](INHERITED-REQUIREMENTS.md)：H1–H8、A01–A15/N01–N09映射和已完成成果复用；原固定方案/证据已恢复至私有目录，后来用户修订优先。
2. [当前唯一方案](PLAN.md)：保留[架构建议对照](ARCHITECTURE-ADVICE-RECONCILIATION.md)中的静态解耦、稳定请求身份、发布分发和有条件固定块试验，以及Map/Sky/继承义务；补齐R17、EOG源与同步、执行默认值和有界决策。[最新Goal正文](GOAL-OBJECTIVE.md)已按新增范围准备，旧工具未替换正文；新对话可按明确开始指令使用，不另起计划。
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
14. [历史远端检查点](REMOTE-CI-CHECKPOINT.json)保留9e5c75ef等旧结果；较新的581a5a9b完整Product CI39108911384/Context39108915196已通过，见[数据流程交付与CI](BACKEND-DATA-DELIVERY.json)。generation8/9手机证据保持各自范围；远端main仍在原整合提交，后续目标结果和main同步未完成。
15. [当前候选的开发工具恢复证据](DEVTOOLS-RECOVERY.md)：受控退出重开后官方CLI已恢复，自动真机调试的实际手机连接与绑定见后续证据；旧MCP/SDK失败不能继续当成当前CLI不可用的依据。
16. [generation6真机反馈](PHONE-GEN6-VERIFICATION.md)：普通候选已绑定Android，真实选点打开中面板；无UI探针的原生范围/中心读回成立。后续连续操作、资料/来源与实际性能仍沿原义务继续；[只读测量源码](NATIVE-FOCUS-READBACK.txt)保留方法，不进入产品。
17. [云量时钟差修复](CLOUD-CLOCK-REPAIR.md)：手机与BFF约1秒时钟差导致新鲜格子被判为未来数据；保留来源时刻并统一查询与暂存层的有效期时钟，记录修复前失败、修复后检查及generation7真实云格/切时刻/拖动结果。当前手机定位拒绝与恢复、generation8空来源条修复及旧构建回收见[真机证据](PHONE-VERIFICATION.md#generation7-location-permission-recovery)。
18. [海报分包路径修复与真实相册保存](PHONE-VERIFICATION.md#generation9-poster-package-repair-and-native-album-save)：generation8失败、真实组件回归及generation9修后原生保存结果；已保存1张测试SPOT海报，真实接收/PLAN/导出文件交接仍未验，N05继续保留。
19. [给原电脑的可复制交接提示词](OTHER-COMPUTER-DATA-HANDOFF-PROMPT.md)：r6/配套DB/固定地形/原记录的盘点、存储选择、上传读回与恢复边界；原电脑已按交接分支提交资料并上传；当前接收端恢复结果由ASSET-MIGRATION-STATUS持有。
20. [静态夜光独立读取](STATIC-LIGHT-ISOLATION.md)：新接口、真实Map消费者和构建范围；3b0d8916已纳入后续[数据流程独审](BACKEND-DATA-REVIEW.md)和581a5a9b完整CI。新静态候选[字节](STATIC-LIGHT-CANDIDATE.json)未绑定手机，不与generation9混称。

21. [原r6数据恢复和新同步机制](ASSET-MIGRATION-STATUS.md)、[完整数据库核验](RESTORED-DATABASE-CHECK.json)、[当前API核验](RESTORED-API-CHECK.json)、[仓库统一数据入口](../../../data-pipelines/runtime-data/README.md)。公共成品LFS与Drive、重建大数据Drive、私有恢复分责；EOG官方两文件已定位于[同一数据锁](../../../data-pipelines/runtime-data/current.lock.json)，原始TIFF/压缩包仍未接收校验、未建立Drive备份。

22. [数据流程独立审查及修复](BACKEND-DATA-REVIEW.md)、[非默认端口真实隔离恢复](RESTORE-PORT-CHECK.json)、[交付与 CI](BACKEND-DATA-DELIVERY.json)、[原机补传 EOG 原始数据提示词](RAW-SOURCE-UPLOAD-PROMPT.md)。

23. [恢复数据后的约4km地形实际服务样本](RESTORED-TERRAIN-SAMPLE.json)：粗档固定包不含所请求z12细档，首次3.926s、重复6ms；属于后续叠层性能责任，不能把恢复/API通过当真机优化已验收。

24. [新对话继续执行提示词](NEXT-CHAT-PROMPT.md)：用户可整份复制至同一工作区新聊天；明确切换到实施、续用同一资料和保护现有状态。当前摘要见HANDOFF，不维护第二份进度表。

执行规则与架构入口：仓库 [AGENTS](../../../AGENTS.md)、[global](../../../project_context/global.md)、[运行时/领域责任](../../../project_context/architecture/runtime-and-domain.md)、[Map/Sky合同](../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)、[开发工具源码/窗口规则](../../../project_context/development-workflow/development-feedback.md#project-source-snapshots-and-windows)、[手机 owner](../../../project_context/areas/main/verification/wechat-device.md)。适用技能为 `.codex/skills/starward-miniapp-development`、`.codex/skills/starward-wechat-device-verification`、`.codex/skills/uiux_design` 与已安装官方 wechatide scenes；本次 durable-goal 原文位于 `C:/Users/777/.codex/skills/durable-goal/SKILL.md`。

恢复顺序：get_goal → 本索引 → REQUIREMENTS、INHERITED-REQUIREMENTS、PLAN、HANDOFF → 当前模块证据；用户已在新对话发送明确开始提示词则直接进入实施，先核源码/候选/服务/窗口身份。PLAN列明的少数委托决策可自主定案；其他实质变更遵守durable-goal授权边界。不要根据临时PID、过期截图/录屏或旧生成目录直接输入手机。没有密钥、二维码、手机定位或设备标识写在这里。
