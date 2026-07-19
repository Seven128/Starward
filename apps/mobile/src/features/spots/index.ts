function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const spotFeature = { outcome: "spot-detail-and-trust", eyebrow: "地点证据", title: "西涌备选观测点", subtitle: "首屏服务于出发决策；媒体、暗度、地平线、设施、最后一公里、风险与坐标均可追溯。", scenarios: [
  scenario("spot-first-screen","spot-open-detail","决策摘要",["spot-decision-summary","spot-observation-window","spot-primary-action"],"谨慎适合 · 条件中等", "观测窗口 00:20–02:45；先核对现场开放与路线，再加入计划。"),
  scenario("light-and-horizon","spot-open-light-details","暗度与遮挡",["spot-light-estimate","spot-horizon-profile","spot-light-provenance"],"暗度为遥感估算", "来源 VIIRS 年度夜光与 DEM 地平线；不是现场 SQM 实测，版本和分辨率可查看。"),
  scenario("media-provenance","spot-open-media","地点媒体",["spot-media-capture-time","spot-media-source","spot-media-moderation"],"拍摄于 2026-06-11 22:14", "来源为已授权贡献者；EXIF 位置已清理，审核状态和原图保护策略可见。"),
  scenario("last-mile-and-facilities","spot-open-access","到达与设施",["spot-parking","spot-last-mile","spot-facilities"],"停车点待现场复核", "最后一段步行约 820 米；洗手间可能夜间关闭，照明与应急出口状态分开显示。"),
  scenario("safety-overrides-score","spot-open-safety","安全阻断",["spot-safety-block","spot-score-suppressed","spot-safe-alternative"],"封路风险 · 暂不建议前往", "安全风险已覆盖原有高分；显示较安全备选，不用暗度或偏好抵消阻断。"),
  scenario("coordinate-policy-all-exits","spot-share-coordinate","坐标策略",["spot-authoritative-coordinate","spot-map-coordinate-label","spot-share-coordinate-policy"],"权威坐标 WGS84", "中国地图展示使用 GCJ-02 并明确标注；分享按地点公开级别降精度，不泄露受限精确点。"),
  scenario("reviews-and-trust","spot-open-reviews","评价可信度",["spot-review-dimensions","spot-review-trust","spot-review-moderation"],"多维评价 · 暗度、可达、安全", "贡献者可信等级与审核状态可见；单条评价不能覆盖官方安全阻断。"),
] } as const;
