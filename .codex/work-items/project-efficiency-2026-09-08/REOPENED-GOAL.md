# User-requested Goal recovery

The previous root explicitly called update_goal(status=complete). This was not an unexplained scheduler shutdown. User now requests reopening and continuation. get_goal returned null on recovery; a new active Goal restores the full H1–H4/R1–R10 scope and frozen exclusions.

The previous FINAL-AUDIT is phase evidence, not authority to close this resumed work. Keep all verified work; resume R10 official2.02 login/runtime,old Page.* timeouts,actual console events and network observation. Do not relabel these as complete solely through non-adoption. Preserve prior failures,incidents and ownership records. No repeated costly product builds without changed input or a specific evidence gap.

## Active objective

完成 Starward 已审查的非设计资源效率优化，并调研微信小程序及 agent 开发、调试、测试的现行最佳实践；对确认存在的问题实际实施优化、验证结果并记录未完成事项。

任务恢复索引：
E:/dev/Starward/.codex/work-items/project-efficiency-2026-09-08/INDEX.md

同目录文件职责：
- PLAN.md：完整范围、逐项方案、技术约束、验证要求及明确排除项。
- PROGRESS.md：实际进展、执行命令和结果、运行中的进程与资源、失败、待办及下一步。顶部恢复记录优先于历史状态。
- evidence/ 和 evidence-manifest.json：原始审查报告、基准、日志及校验信息。
- H123-NOTES.md、H4-R79-NOTES.md、R2-NOTES.md、R2-REVIEW.md、R134-NOTES.md、R5-NOTES.md、R68-NOTES.md、R10-NOTES.md、R10-OBSERVER-NOTES.md：对应实施、研究、审查和运行记录。
- FINAL-AUDIT.md、FINAL-ARTIFACT-AUDIT.json、FINAL-WORKFLOW.log、FINAL-R4-POSTGIS.log：前一轮阶段审查及验证证据，不能覆盖本次用户恢复指令或作为仍未跑通能力已经完成的证明。
- REOPENED-GOAL.md：本次恢复原因、完整目标文本和下一阶段验收边界。

每次恢复或上下文压缩后，先读 INDEX → PLAN → PROGRESS，再检查当前 main 工作树和运行资源，接续已有工作。不得遗漏已确认约束、待办、失败、临时资源或验证缺口；不得把历史测试结果当作修改后的验证。持续更新任务记录，避免重复实施、重复启动进程或覆盖其他任务改动。遵守当前多 agent 指令，不自动重新启动历史协作者。

执行范围保持 H1–H4、R1–R10：
H1–H4：非设计工作流一致性；现有 Skill 按平台和操作精准路由、承认跨轮既有授权；按需读取和检索；CI 按影响范围执行、减少重复安装与重复检查、修正只锁定源码写法的脆弱测试。
R1–R9：天文计算复用、缓存和相同请求合并；客户端大响应持久缓存与异步存储；天气上游等待上限及取消；地图视口查询；保持现有外观的 Canvas 调度和生命周期优化；Android release 体积优化；Docker 构建缓存与发布依赖完整性；可靠的 Node/npm 开发入口；原生预报缓存容量管理。各项具体算法、生命周期、预算、验证要求和原审查细节以 PLAN 及索引原始证据为准，不因恢复而丢弃。

R10：
调研微信小程序和 agent 开发的最佳实践，尤其解决频繁使用 Computer Use 检查开发者工具导致的慢反馈。主动发现、比较官方 wechatide／DevTools Skills／MCP、现有 miniprogram-automator／CLI，以及有实际价值的第三方 MCP。核实本机版本、能力、维护状态、Windows 兼容性、会话复用、恢复、截图、元素操作、控制台与网络观察能力，并做必要实际测试。不能因工具名含 MCP 就认定更快，也不能因当前工具列表没有它就认定不存在。

基于证据改进现有开发测试流程：优先复用准确项目的常驻会话、结构化查询、稳定选择器、批量读取和基于实际条件的等待，减少重复冷启动、临时脚本和坐标点击。保留必要真实渲染、真机及物理行为验证，不得用 H5、模拟数据、直接调用事件处理函数或截图存在性冒充小程序行为正确。开发反馈与固定候选验证保持区别。优先复用成熟能力，必要新工具先验证来源和兼容性，并尽量隔离评估，保留现有安装和用户会话。研究、比较、选择理由、实测和集成结果保存到 R10-NOTES。

本次恢复的重点：
前一轮 agent 主动标记完成，但新版官方2.02.2608070工具仅通过授权／版本握手，登录和实际调试仍未跑通；旧版 Page.* 元素操作超时，实际 console 事件尚未证实，网络观察缺乏已接入的可靠路径。这些重新作为待办推进，不得再次仅以“暂不接入”或原始 helper 通过为理由结束 Goal。继续基于具体失败阶段排查，实际验证可用的完整反馈路径并接入现有流程。已通过的原生 layout、geometry wait、screenshot 和 H/R 优化保留；除新改动、失败或证据缺口外不重复昂贵构建。真有外部扫码／MFA／权限阻塞时，明确说明具体缺口，保留待办，而不是宣称实现完成。

严格冻结设计资源相关工作：
不修改、移动、删除、去重、压缩或重新生成 docs/design-resources、新的 .agents/skills/starward-design-resource、DESIGN、视觉 token、图片素材、采用入口、immutable Source、设计清单及相关设计迁移要求。用户正在通过新 Skill 重构设计资源，新设计已采用但尚未实现属于正常过渡。PLAN 中 D1–D4 保持排除。现有交互实现 Skill 只允许必要读取路由修正，不改变设计权威或视觉要求。

直接在 main 工作，保留其他任务变更和现有预览。不得部署、上传、提交审核、公开发布、采购、修改远端生产数据、重写 Git 历史，或擅自改变全局安全、代理和插件配置。已有会话授权持续有效，不重复询问；只有实际缺少必要外部权限、扫码或人工决定时，说明具体原因和最小所需操作。不要重复 Expo prebuild/clean；前一轮旧 APK/debug keystore 损失不可隐藏或冒称恢复。新版工具 GUI 已自动注册 wechatide 至任务提取目录，未知先前关联；不能删除目录留下悬空关联。此前自动审批拒绝删除的 Context 临时目录保持记录，不绕过。

保持真实数据、官方预警阻断、精确时间、发布可见性、账号隔离，以及取消、恢复、失效和清理语义。先检查既有架构、调用者和成熟能力，再做最小合理实现。按风险执行有意义回归与实际运行检查，以可比数据报告性能收益；区分本地模拟、真实数据库、开发者工具、真机和线上证据。不得输出凭证、token、cookie、完整账号字段或敏感网络正文。

每项授权工作必须有真实实施和合适验证，或者不掩盖实际待办的充分依据。不把工具失败重新命名为“无须做”来关闭目标。任务局部证据完整并不等于全部需求已完成。真正未完成或受外部条件阻碍的事项保持待办并如实说明。只有全部授权工作实际完成、集成审查结束且无遗漏后才标记完成。
