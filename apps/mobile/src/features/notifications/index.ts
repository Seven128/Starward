function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const toolsFeature = { outcome: "notifications-and-toolbox", eyebrow: "提醒与工具", title: "行前、途中与长期规划", subtitle: "提醒按受影响网格批量评估并去重；日历、天体位置与专业工具明确精度、来源和适用边界。", scenarios: [
  scenario("pretrip-rule","tools-create-pretrip-rule","行前提醒",["notification-rule-trigger","notification-rule-channel","notification-rule-preview"],"出发前 3 小时刷新", "天气、预警、路线或地点开放状态发生显著变化时触发；先预览再授权系统通知。"),
  scenario("intrip-risk-deeplink","tools-open-risk-notification","途中风险",["notification-risk-reason","notification-deeplink-target","notification-risk-action"],"路线封路风险上升", "深链打开当前计划的风险段；可切换备选、刷新路线或取消出发。"),
  scenario("long-term-controls","tools-change-notification-controls","长期控制",["notification-topic-control","notification-quiet-hours","notification-consent-state"],"主题：银河窗口与天气改善", "免打扰 22:30–07:30；系统授权与产品订阅分别可控，撤回后停止远端发送。"),
  scenario("calendar-and-station","tools-add-calendar-event","日历与空间站",["calendar-event-time","calendar-event-timezone","station-mode-state"],"8 月 13 日 00:35 · Asia/Shanghai", "固定站点模式使用轨道纪元与可见条件；过期轨道降可信度，不推送确定可见。"),
  scenario("position-tools","tools-open-position","位置工具",["position-azimuth","position-altitude","position-time"],"方位 168°", "高度 34° · 00:40；坐标、时区和所选时刻保持可见。"),
  scenario("professional-tool-boundaries","tools-open-professional","专业工具",["tool-precision-label","tool-data-source","tool-limitation"],"实验估算 · 中等精度", "来源与算法版本可查看；仅供参考，精度限制与校准状态不隐藏。"),
  scenario("educational-content-priority","tools-open-learning-card","学习卡片",["learning-prerequisite","learning-safety-note","learning-next-action"],"先理解月光与云层", "夜间出行优先安全：核对开放、返程、天气和同伴；下一步查看自己的计划证据。"),
] } as const;
