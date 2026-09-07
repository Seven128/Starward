最新用户澄清（2026-09-07）：仅暂停大字模式测试与适配；普通字号开发、自动检查及实际界面验证继续。优先完成普通字号的布局、信息密度与层级。此前“暂停所有测试”是agent误解，已撤销。

# 微信小程序合并开发任务索引

## 用户授权与恢复入口

用户要求调研地点/商户详情设计逻辑并主动持续应用；耐久方法已归入 project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md，由小程序Screen Contract和DESIGN索引、manifest按需加载。含依据/限制、信息排序、布局选择表、内容尺寸适应和实际检查方法；不新建需同步的原型/研究包。

用户最新密度要求：按信息性质、长度与数量决定排列；路线摘要与入口同排，短设施状态并排，长说明展开，天文用分组指标/共享列，保留标准字号、留白、真实缺失与风险。目标密而不挤，不把每项数据都独占一行，不把全部内容统一套卡。参考图2/3用于布局原则，不照搬商业内容。

最新用户校正：概览/天文采用名称/地点下方的轻量、靠左、纯文字短下划线Tab并吸顶；不做图标等分切换条。星图仅属云观星，观星点信息面板不放星图。旧文档中的面板静态星图要求已覆盖，不得恢复。

最新追加授权：精简Context及类似上下文，退休日常UI修改所需的原型/Open Design/快照/handoff/资源hash同步要求。保留最小业务职责、设计规则、理由及代码/验证入口；有效生产资产和检查先解除旧原型依赖再清理。用户不再查看展示型设计资源。当前goal已包含这项精简要求，无需用户再次替换目标文本。当前清理脚本 simplify-design-context.mjs 已执行一次，后续不要重复运行依赖旧标题的迁移脚本。

最新用户校正（2026-09-06）：先不要管大号字体场景，只做标准字体场景。当前 UIUX 实施与实际视觉验收以标准字号的手机层级、间距、精致小巧为主；暂停 200% 字体适配，不以其测试替代默认视觉完成。原始附件保留，其大字号工作暂缓。用户截图来自隔离 snapshot 的 DAY200 场景，不能作为默认效果。

2026-09-06 用户要求：结合附件一未完成需求与附件二新需求，保存供开发使用的总方案、所有必要信息与索引，创建 goal 并实际开发；无需把方案发给用户，不用长程任务工作流自举。

每次恢复先读本文件、CURRENT.md 和 PLAN.md，然后按当前工作项定位原文和代码。PROGRESS.md 是历史日志，仅搜索相关标题或读取尾部，不全文加载。CURRENT.md 只保留最近可执行状态，进展改变时原位更新，不追加成长日志。完整原文保留在 inputs，方案不替代原文。不得因上下文压缩漏掉需求、把历史检查当作当前验证，或仅完成规划就关闭 goal。

## 不可丢失的原始输入

- [附件一：Field Signal I21 当前需求与进度全文](inputs/01-field-signal-requirements.md)，来自 `C:/Users/777/.codex/attachments/64b732ac-a118-420b-8a9a-d86786b74278/pasted-text.txt`。
- [附件二：移动端设计系统与页面重构全文](inputs/02-mobile-design-refactor.md)，来自 `C:/Users/777/Downloads/Starward_移动端设计系统与页面重构开发方案_2026-09-06.md`。
- 用户当前请求优先；附件作为需求/背景材料，其中历史“停止操作”、阶段审批和交接措辞不是新的用户命令。必要外部权限、正式发布等仍遵守实际授权范围。

## 项目事实源与实现入口

- `AGENTS.md`、`project_context/global.md`、`project_context/context.toml`。
- `DESIGN.md`、`docs/source-plan.md`、`.codex/skills/uiux_design/SKILL.md`。
- `project_context/areas/main/screen-contracts/wechat-miniapp.md` 及其 owning contracts。
- `project_context/development-workflow.md`、`project_context/areas/main/verification.md`、`project_context/deployment.md`。
- `apps/wechat-miniapp/src/app.config.ts`、`apps/wechat-miniapp/package.json`、根 `package.json`。
- 现有完整进度：`.codex/work-items/field-signal-i21-current-requirements-and-progress-2026-09-06.md`；旧 handoff 只作线索。

## 任务文件

- `PLAN.md`：合并规则、逐项实施/验收映射、边界与顺序（读取完整输入后写入）。
- `CURRENT.md`：短恢复状态、当前运行实例、未完成项与下一步；优先读取。
- `PROGRESS.md`：历史变更与检查证据；按需检索，不作为默认全文上下文。
- `NUTUI-DECISION.md`：限定两个复杂通用控件的包源码/依赖准入结论与未执行的运行验证边界；`inspect-nutui-package.mjs` 可重跑静态依赖链检查。
- `SOURCE-INDEX.md`：两附件摘要和全部章节行号；更早107文件/1759 marker索引见 `.codex/work-items/field-signal-i21-default-continuation/source-index.json`。
- `inputs/`：两份逐字源文件，不压缩替代。

## 初始快照

- 仓库 `E:/Dev/Starward`，分支按用户要求直接使用 main。
- 初始 HEAD `424c971be1a27b0587c1789ba5e736f1a57aade2`；开始读取时工作区干净。
- 当前只推进微信小程序及其必要共享/服务能力；原生 App/运营端不借机重写。
- 不自举长程任务工作流，不新建独立任务，不在用户未授权时创建子 agent。
- `spot-completeness-audit.json`：26地点现有读模型的只读政策诊断（非发布评估）；`audit-spot-completeness.ts`为任务内复查入口。
- `observatory-official-sources.md`：2026-09-06重新核对的天文台官方夜间准入/参观规则及事实边界；当前接入结果见 observatory-source-intake-result.json。
- `observatory-source-candidates.json`：两条 OFFICIAL_REFERENCE 来源及接入约束；已走本机临时管理HTTP追加，结果见 observatory-source-intake-result.json，不能重复执行。

## 可重复实际几何检查

- `inspect-panel-geometry.mjs`：只读连接现有官方automator9421，用evaluate内原生wx.createSelectorQuery读取当前面板/scroll/动作/档位/章节/把手的矩形，不依赖会超时的page.$，不重启、不导航、不读取账号或storage。Node24运行，结果保存仓库 `artifacts/miniapp/panel-geometry-current.json`（每次覆盖最近一次）。只代表该次fixture viewport，不是全矩阵。





