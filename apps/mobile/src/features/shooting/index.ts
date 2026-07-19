function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const shootingFeature = { outcome: "shooting-assistant", eyebrow: "摄影辅助", title: "确定性拍摄方案", subtitle: "器材、天体运动和环境规则先产出参数与风险；AI 只解释，不改写核心曝光结果。", scenarios: [
  scenario("mobile-plan","shooting-create-mobile-plan","手机方案",["shooting-phone-model","shooting-mobile-settings","shooting-mobile-risk"],"iPhone 15 Pro · 主摄", "曝光 10 秒、ISO 1600；先试拍检查拖线、过曝与防抖状态，设备支持仍需实机验证。"),
  scenario("camera-plan-and-risk","shooting-create-camera-plan","相机方案",["shooting-camera-settings","shooting-lens-field","shooting-risk-note"],"f/2.8 · 10 秒 · ISO 1600", "20 mm 视场覆盖银河拱桥；建议先试拍，拖线、对焦和高光风险分别提示。"),
  scenario("preset-boundary","shooting-apply-preset","套用预设",["shooting-preset-source","shooting-preset-assumptions","shooting-preset-adjustment"],"预设来源 · Starward 规则 v2", "适用条件假设为三脚架、无追踪器与 20 mm；焦距或目标变化后必须重新计算。"),
  scenario("checklist-offline","shooting-save-checklist","拍摄清单",["shooting-checklist-items","shooting-checklist-offline","shooting-checklist-progress"],"清单 3/8：电池、存储卡、三脚架", "已随计划离线可用；进度保存在本机，联网后按幂等键同步。"),
  scenario("versioned-save","shooting-save-version","保存版本",["shooting-plan-version","shooting-change-summary","shooting-restore-version"],"拍摄方案版本 4", "由 14 秒改为 10 秒以降低拖线风险；可恢复版本 3。"),
  scenario("ai-is-explanation","shooting-open-ai-explanation","AI 解释",["shooting-rule-result","shooting-ai-explanation","shooting-ai-boundary"],"规则结果 · ISO 1600 / 10 秒 / f2.8", "AI 解释为何先试拍，不会编造设备能力，也不会覆盖确定性规则参数。"),
] } as const;
