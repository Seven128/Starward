function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const tonightFeature = { outcome: "tonight-decision", eyebrow: "今晚决策", title: "值得出发吗？", subtitle: "先给结论、连续观测窗口、主地点、备选和行动；再展开评分因素、来源和风险。", scenarios: [
  scenario("successful-night-report", "tonight-refresh", "刷新夜报", ["tonight-decision-summary","tonight-observation-window","tonight-data-provenance"], "建议出发 · 可信度中等", "最佳观测窗口 00:20–02:45；出发前仍需刷新天气、路线与预警。"),
  scenario("main-and-backups", "tonight-select-primary", "主备地点", ["tonight-primary-spot","tonight-backup-spots","tonight-switch-impact"], "主地点 · 西涌", "备选：大鹏半岛、七娘山入口；切换会原子更新路线、时间窗和风险。"),
  scenario("partial-provider-failure", "tonight-refresh", "部分数据", ["tonight-partial-state","tonight-missing-impact","tonight-route-fallback"], "部分可用 · 路线为缓存", "天气与天文可用，实时路线缺失；缓存路线仅供计划，临行必须复核。"),
  scenario("visible-target-selection", "tonight-select-target", "今晚目标", ["target-visible-window","target-altitude-azimuth","target-next-action"], "银河核心 · 可见窗口 00:35–02:20", "最高高度 34°、方位 168°；下一步查看遮挡轨迹并加入计划。"),
] } as const;
