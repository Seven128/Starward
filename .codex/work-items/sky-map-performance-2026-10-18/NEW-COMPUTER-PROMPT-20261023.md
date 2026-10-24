# 新电脑接手提示词

2026-10-24 再次换机的最新入口为 [20261024 接力提示词](NEW-COMPUTER-PROMPT-20261024.md)。本文保留上次接力要求；当前代码、NightReport WIP、暂停与CI状态以新提示及最新HANDOFF为准。

把下文整段发给新电脑的 Codex。仓库是 https://github.com/Seven128/Starward ，目标分支是 `codex/remote-main-20260908`；本文件所在的接力提交及其后同分支最新提交为拉取目标。不要只拉 main。

---

请在这台电脑接手 Starward，先拉取最新代码，再恢复完整 Goal 并持续实施。这是明确执行指令，不是只阅读或总结；可多开新 agent，完成后关闭。必要人类动作尽量后置。

1. **先 get_goal，并安全同步源码。** 找到本机 Starward checkout，核 `git status`、当前分支和远端。目标为 `origin/codex/remote-main-20260908`（仓库 https://github.com/Seven128/Starward）。执行 fetch，复用现有checkout，切到该分支后快进同步；无本地同名分支时可从远端跟踪创建。若已有本地改动/分歧，先检查并保留，再安全整合，禁止reset/clean/force/stash、另建worktree或用远端覆盖本地。不把旧HEAD `4b5a610a...` 当目标。同步后记录实际HEAD及与远端的一致性。
2. **完整恢复，不缩范围。** 入口 `.codex/work-items/sky-map-performance-2026-10-18/INDEX.md`。读取 GOAL-OBJECTIVE、REQUIREMENTS、INHERITED-REQUIREMENTS、PLAN、最新HANDOFF、CURRENT-VALIDATION、REVIEW-RECONCILIATION 及关联当前证据。没有Goal时使用GOAL-OBJECTIVE中“Goal正文”全部创建，不设token预算；已有同目标则续用，承接最新要求，不用本文摘要替代正文，不假称另一聊天的active状态会自动继承。
3. **读取本机规则和准备真实依赖。** 使用本机适用AGENTS、project_context/global.md和manifest默认项、相关Context/Source Plan/最新版skill。沿package-lock用已有npm安装锁定依赖（需要时npm ci）；核Git LFS及既有hook，不覆盖自定义hook。按 `data-pipelines/runtime-data/current.lock.json` 和README运行 `npm run backend:data:status`，按需 `backend:data:prepare/verify`；Mini API消费者还需 `assets:verify -- catalogs`、`images`、`text-history`，只准备缺失的锁定组。有效本地字节复用，不能用空数据或MEMORY_TEST冒真实published供给。正常开发无需下载全球EOG原始TIFF。
4. **下一步以最新HANDOFF为唯一入口，复用已完成偏好v2。** `R20-PREFERENCES-V2-IMPLEMENTATION-20261023.md`及`R20-PREFERENCES-WEB-CAS-20261023.md`记录当前投影、按责任有界回执、版本栅栏、SQLite CAS、v1原字节归档/迁移、未知提交和Wizard/quick profile稳定重试的实现与限定验证。旧同key异payload/双SQLite丢写及后续真实Web双标签页丢写均有修前事实；Web已改IndexedDB事务CAS并真实双页复验、独审，不再按旧“v2尚未实施”重复重做。仍须保设备/Expo及未验产品范围，不造任意LRU/TTL或删用户预设。
5. **复用F07整合，继续未完成真实业务与目标验收。** `R20-NATIVE-CONTEXT-TRACE-20261023.md`保留修前事实；当前实现/独审见`R20-NATIVE-DECISION-CONSUMERS-20261023.md`与`R20-NATIVE-SPOT-IDENTITY-20261023.md`。共享夜/精确时刻、真实地点身份/权限、Map实际选点和深链不自动采用已整合，最后摄影未知保存重试覆盖亦已修。旧错误成立probe已由生产回归接替，不运行它冒修后绿灯。真实设备/导航/跨时区来源、独立API全业务持久化仍未完成；已保存行程/现场包/投稿不可被浏览Context改写。F14行程代表链、F10云独立交付与F09连续编辑策略已完成本批开发检查及独审；后续状态按HANDOFF及最新证据继续，不用本文固定摘要代替当前进度。
6. **复用已完成批次。** 管理授权/会话与稳定重试、头像持久意图、贡献维护/锁序、精确媒体续批与丢回复恢复、App F05/F06及实际消费者CI已有代码和限定检查/独审；沿证据继续，不重做整份失败清单。迁移023–026只在隔离合成库验证，未施加原共享/生产环境。旧981通过/42skip、App67全套加后续13定向不是当前全仓全绿；具体失败/跳过/未验均保留。
7. **完整产品顺序不变：采用UI → 叠层完整显示/连续交互/内存 → Sky六字段/Play内存。** My已唯一采用，严格按采用增量；来源复用公共按钮、跳转与模板；未涉及部分维持原版本。Map/Sky重构、授权交付、H/A/N、数据备份/恢复全部继续保留，局部代码通过不关闭设备、原生资源或OOM。
8. **设备/服务仍后置，先核当前所有权。** 原电脑另一聊天正在使用DevTools/手机/LAN连接，本次交接不授权远程停止或重绑它们。新电脑先做不占这些资源的实现；之后用户转移设备时，沿最新版开发skill与 `references/true-debug-lan.md` 恢复本机真实条件。已采用“真机调试开发者工具（主用）”，普通预览/Android系统观察备用；高内存Sky保持连接和Heap导出已经完成通路准入，不重做逐项profiler矩阵，不关闭/绕过VPN/TUN，不复制旧IP、端口、防火墙规则、PID、扫码或失败清单。
9. **本地原件不等于远端资料。** 本提交没有上传原始Heap、私有数据库/配置/媒体、冻结构建、Harness目录和任务缓存。原电脑 `D:/dev/sky-lan-fullview.heapsnapshot`（99,830,747B，SHA a36c31772fa2d29da5db6f222837e531f5ee14b64c443537bcf3c654a29ea14c）及同目录analysis/target-check仅本机；需要分析时先核是否已私下传到新机，缺少则记MISSING，不能假称从Git恢复或凭单份快照关闭OOM。gen34/R28及其它冻结代禁止重建/refresh；需要它们时沿私有保全manifest接收原件并核身份，未取得则保留缺口并继续独立工作。私有恢复按现有owner选择新隔离目标，不重种原账户/N05或重发R6。源码推送不等于资料上传授权。
10. **持续执行并如实记录。** PLAN只放已采用方案，进度/失败/在途写HANDOFF和证据；本机恢复时替换旧机器状态，不复用旧代理。保全部未撤销义务、失败及私有原件。逐项有权威证据证明完整Goal后才complete；有可独立推进的工作就继续，不因设备后置停止整个任务。
