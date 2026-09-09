# Context 与设计资源审计修订：恢复索引

用户明确要求创建 goal，保存完整执行信息以跨上下文压缩恢复；不使用长程任务工作流自举。本目录是任务材料，不是 durable Context，也不建立工作流框架。

恢复顺序：
1. [执行方案](PLAN.md)：本轮全部范围、交付、验证场景。
2. [已确认决策](DECISIONS.md)：用户选择、默认值、权限边界，不重复询问。
3. [进度](PROGRESS.md)：从未完成项继续，不重做已完成工作。
4. [证据与入口](EVIDENCE.md)：Context/资源/源码/技能/工具路径及审核原始依据。
5. [计划资源续作细节](PLAN-RESOURCE-NOTES.md)：当前已读资源、路由依赖、样例一致性及剩余验证，继续 Plan 时读取。

目标：直接完成 Context 修改并验证；用项目 design-resource skill 制作局部设计修订供用户逐页审查。候选不是采用，不改生产实现。设计审查回复沿本索引继续。此次目标交付为备审资源，不包含自动采用；备审完成不表示设计获批或生产完成。

最终交付核对：[DELIVERY-AUDIT.md](DELIVERY-AUDIT.md)。五组统一审查入口：docs/design-resources/wechat-miniapp/context-audit-2026-09-09.html。

后续审查修订：[FEEDBACK-02.md](FEEDBACK-02.md)，包含全部追加反馈；最新手势已确认，小档下拖不动、不关闭。

第二轮调研：[SKY-IMAGERY-RESEARCH.md](SKY-IMAGERY-RESEARCH.md)。本轮候选已修改，不要直接重跑旧build脚本覆盖；修订脚本与最终小修详见 PROGRESS.md。

第三轮审查修订：[FEEDBACK-03.md](FEEDBACK-03.md)，四项最新反馈与 Stitch 导出信息。


第四轮最新反馈：[FEEDBACK-04.md](FEEDBACK-04.md)。新增前期复杂能力调研规则，当前资源待审。

第五轮最新：[FEEDBACK-05.md](FEEDBACK-05.md)。公共液态玻璃 + 普通数字框 + 更小天体弹窗。

液态玻璃文章追加调研：[LIQUID-GLASS-ARTICLE-RESEARCH.md](LIQUID-GLASS-ARTICLE-RESEARCH.md)。本轮仅研究，未改视觉候选或生产实现。

研究后续落实与最新公共组件规则：[FEEDBACK-06.md](FEEDBACK-06.md)。第六轮共享材质候选已修订，Context技术路线与设计阶段公共组件规则已更新；未采用、未开发生产实现。

最新第六轮落地：[FEEDBACK-06.md](FEEDBACK-06.md)。研究后的曲面材质候选、原稿/本地适配、Context选型与真机比较要求已完成；待用户审查，无生产实现或自动采用。

当前收尾：[FINALIZATION.md](FINALIZATION.md)。用户已要求资源归位、Stitch更新清理、全工作区提交并推送；以五页ADOPTED/CURRENT当前入口覆盖历史待审状态。
