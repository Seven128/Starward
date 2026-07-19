function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const fieldFeature = { outcome: "field-offline-safety", eyebrow: "现场模式", title: "离线与安全执行", subtitle: "断网、低亮和低电时仍可访问计划、路线、停车点、备选和必要工具；过期信息不冒充实时。", scenarios: [
  scenario("pack-integrity","field-verify-pack","离线包校验",["offline-pack-version","offline-pack-checksum","offline-pack-validity"],"离线包版本 7", "校验通过；计划、路线、图层和工具清单完整，过期来源仍会单独提示。"),
  scenario("red-mode-accessible","field-toggle-red-mode","红光模式",["field-red-mode-state","field-primary-action","field-status-label"],"红光模式已启用", "主操作与状态仍使用文字、形状和焦点，不只依赖颜色；切换不会出现亮度闪烁。"),
  scenario("parking-and-backup-offline","field-open-offline-route","离线路线",["field-parking-point","field-walking-segment","field-backup-spot"],"停车点已缓存", "最后一段步行 820 米；备选地点及返回路线均可离线查看。"),
  scenario("bounded-safety-session","field-start-session","安全会话",["field-session-window","field-checkin-control","field-overdue-action"],"安全时段 23:20–03:20", "预计结束前主动签到；逾期只执行用户明确配置的联系人动作，不持续后台追踪。"),
  scenario("explicit-location-share","field-share-location","位置分享",["share-location-scope","share-location-expiry","share-location-revoke"],"仅本次会话分享精确位置", "4 小时后到期，可随时撤销；默认关闭，不用于分析或公开地点页。"),
  scenario("offline-write-replay","field-save-report","离线实况",["offline-write-state","offline-replay-key","offline-conflict-action"],"已保存在本机 · 待同步", "联网后按幂等键回放；冲突显示原版与来版，失败不丢草稿。"),
  scenario("offline-field-use","field-enter-airplane-mode","飞行模式",["field-offline-banner","field-cached-plan","field-offline-toolbox"],"当前离线", "缓存计划、路线和计时/罗盘工具仍可用；实时天气、预警和路况标记为不可更新。"),
] } as const;
