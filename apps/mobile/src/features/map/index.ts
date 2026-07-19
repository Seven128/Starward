function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const mapFeature = { outcome: "map-route-discovery", eyebrow: "地点与路线", title: "观星地图", subtitle: "暗度、条件、可达性和安全证据共同决定地点；WGS84 真值与 GCJ-02 地图展示不混用。", scenarios: [
  scenario("map-status-and-context", "map-open-status", "数据状态", ["map-location-context","map-data-state","map-provenance"], "深圳南山 · 最新位置上下文", "天气最新、暗度为版本化估算，路线使用缓存；部分可用内容已逐项标记。"),
  scenario("filter-no-results", "map-apply-strict-filter", "严格筛选", ["map-active-filters","map-empty-reason","map-relax-filter"], "已启用 4 项严格筛选", "没有符合全部条件的地点；可放宽洗手间或最大驾车时间，不会偷偷移除安全条件。"),
  scenario("layer-version-and-failure", "map-toggle-light-layer", "光污染图层", ["map-layer-version","map-layer-freshness","map-layer-failure-state"], "VIIRS 年度图层 · 版本 2025", "实时图层不可用，使用缓存版本；图例、更新时间与估算边界保持可见。"),
  scenario("selected-spot-action", "map-select-spot", "选择地点", ["map-selected-spot","map-spot-summary","map-add-to-plan"], "西涌备选观测点", "条件谨慎、路线可达；加入计划后仍需查看最后一公里和现场核验状态。"),
  scenario("route-reorder", "map-reorder-route", "调整停靠顺序", ["route-stop-order","route-recalculation-state","route-version"], "顺序：主地点 → 备选 A → 备选 B", "已按新顺序重新计算，旧路线版本保留为恢复点。"),
  scenario("route-mode-and-last-mile", "map-change-route-mode", "路线方式", ["route-mode","route-parking-end","route-last-mile"], "驾车到停车点", "最后一段步行 820 米；夜间照明、坡度与返回路线单独展示。"),
  scenario("route-provider-degradation", "map-refresh-route", "路线降级", ["route-provider-state","route-cache-age","route-straight-line-fallback"], "路线供应商超时", "保留 38 分钟前缓存；直线距离仅作方位参考，不替代导航。"),
] } as const;
