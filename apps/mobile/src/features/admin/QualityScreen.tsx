import { platformBoundary } from "@starward/contracts/platform-boundary";
import { ScenarioScreen } from "../shared/ScenarioScreen";
function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
const qualityFeature = { outcome: "quality-release-observability", eyebrow: "发布与质量", title: "可恢复、可观测的原生发布", subtitle: `最终产品为 ${platformBoundary.primaryProduct}；辅助平台不能替代 iOS/Android 原生能力与真机门。`, scenarios: [
  scenario("restore-objectives","quality-open-restore-drill","恢复演练",["restore-rpo-result","restore-rto-result","restore-drill-evidence"],"RPO 实测 9 分钟", "RTO 恢复时间 41 分钟；数据库、对象版本、引用和权限完整性证据已关联。"),
  scenario("native-release-boundary","quality-open-release-matrix","原生发布矩阵",["release-ios-artifact","release-android-artifact","release-native-capability-gates"],"iOS 与 Android 构建产物独立", "真机与原生能力门包含定位、通知、相机、传感器、离线恢复与返回手势。"),
  scenario("observability-correlation","quality-open-trace","链路追踪",["trace-correlation-id","trace-provider-span","trace-user-redaction"],"Trace 关联 ID · tr-7fd2", "夜报、供应商与路线 span 已关联；用户标识与精确位置按策略脱敏。"),
  scenario("analytics-funnel","quality-open-funnel","产品漏斗",["analytics-consent-filter","analytics-funnel-steps","analytics-retention-window"],"仅统计已同意分析的会话", "授权过滤在采集前执行；决策→计划→出发→现场步骤与保留窗口可审计。"),
] } as const;
export function QualityScreen({ fixture }: { fixture?: string }) { return <ScenarioScreen config={qualityFeature} fixture={fixture} />; }
