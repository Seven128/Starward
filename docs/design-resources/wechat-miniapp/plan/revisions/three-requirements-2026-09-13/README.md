# 完整观星计划增量修订

[编辑](preview/index.html?view=edit&id=p1) · [详情](preview/index.html?id=p1) · [列表](preview/index.html) · [统一审阅](../../../shared/astronomical-event-modal/review.html)

基线为[2026-09-09当前采用源](../../candidates/context-audit-2026-09-09/CURRENT.md)。完整表单、出行、到达冲突、提醒/清单及保存/返回复用原源，只把事件入口改为共享Modal并替换对应语义图标；浏览已关联项直接打开同Modal详情。eventOccurrenceIds单项及历史记录迁移属于Context的生产要求，浏览器模拟保存不证明数据库迁移。新视觉已采用，源差异见[source-diff.json](source-diff.json)。

2026-09-16外部能力迁移同步（代码维护修订，非新Stitch稿）：保留原四类客观参考，标注实际计算夜和取得的小时覆盖；多日结束显示完整日期；出发完全手动，移除样本自动道路用时/到达冲突。当前生产参考owner为plan-reference.tsx，资料来自既有SkyReport计算与实际预报，浏览器样本不证明供应商或真机能力。
