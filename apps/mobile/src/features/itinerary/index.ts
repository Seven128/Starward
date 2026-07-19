function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const itineraryFeature = { outcome: "itinerary-and-collaboration", eyebrow: "计划闭环", title: "观星行程", subtitle: "地点、连续天文窗口、路线、器材、安全、离线包和协作版本属于同一个可恢复计划。", scenarios: [
  scenario("create-generated-plan","plan-generate","生成计划",["plan-observation-window","plan-main-spot","plan-safety-checklist"],"观测窗口 00:20–02:45", "主地点西涌；安全清单包含开放状态、返程、电量、同伴与天气复核。"),
  scenario("overview-consistency","plan-open-overview","总览一致性",["plan-overview-map","plan-overview-timeline","plan-overview-version"],"地图与时间线共享版本 7", "地点、路线、天文事件和风险使用同一决策上下文；未重算项会明确标记。"),
  scenario("candidate-to-plan","plan-add-candidate","加入候选",["plan-candidate-source","plan-candidate-role","plan-candidate-result"],"候选来自地图筛选", "设为备选地点；保存后会重算路线和时间窗，不静默替换主地点。"),
  scenario("route-tradeoff","plan-compare-routes","路线取舍",["route-distance-tradeoff","route-risk-tradeoff","route-arrival-tradeoff"],"较短路线 42 km", "山路风险较高；安全路线多 11 km、晚到 18 分钟，取舍与预计到达同时展示。"),
  scenario("refresh-version","plan-refresh","刷新计划",["plan-change-preview","plan-saved-version","plan-refresh-result"],"更新预览：低云上升、路线未变", "保存为版本 8；版本 7 保留，可恢复且不会覆盖协作者未同步修改。"),
  scenario("secure-share-and-offline","plan-create-share","分享与离线",["plan-share-scope","plan-share-expiry","plan-offline-availability"],"仅受邀成员可查看", "链接有效期 24 小时；计划、路线和工具已离线可用，精确位置默认不公开。"),
  scenario("collaboration-conflict","plan-resolve-conflict","协作冲突",["plan-conflict-original","plan-conflict-incoming","plan-conflict-resolution"],"原版本 7 与来版 8 冲突", "可逐项解决冲突并保留版本；地点、时刻与路线不会被整包静默覆盖。"),
  scenario("astronomy-timeline","plan-open-astronomy","天文时间线",["plan-twilight-event","plan-moon-event","plan-target-event"],"天文昏影结束 21:18", "月落 00:20；目标银河核心可见 00:35–02:20，时区 Asia/Shanghai。"),
] } as const;
