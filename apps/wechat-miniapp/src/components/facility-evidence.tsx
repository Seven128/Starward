import { Text, View } from "@tarojs/components";
import type { FacilityEvidence } from "@starward/miniapp-contracts";
import { formatDisplayDate } from "@/utils/presentation";
import { facilityStatusLabel } from "@/utils/facility-presentation";
import { Provenance } from "./provenance";
import "./facility-evidence.scss";

export function FacilityEvidenceDetails({ evidence, title, showDescription = true, showSource = true, showVerification = true }: { evidence: FacilityEvidence; title?: string; showDescription?: boolean; showSource?: boolean; showVerification?: boolean }) {
  return <>
    <View className="facility-evidence__heading">
    {title ? <Text className="type-label">{title}</Text> : null}
    <Text className={`status-tag${evidence.status === "UNKNOWN" || evidence.status === "SEASONAL" ? " status-tag--warning" : evidence.status === "UNAVAILABLE" ? " status-tag--danger" : ""}`}>
      {facilityStatusLabel(evidence.status)}
    </Text>
    </View>
    {showDescription ? <Text className="type-body">{evidence.detail || evidence.summary || "暂无数据"}</Text> : null}
    <View className="facility-evidence__facts">
      <View className={`facility-evidence__fact${evidence.distanceM === null ? " facility-evidence__fact--wide" : ""}`}>
        <Text className="type-caption">开放时间</Text>
        <Text className="type-secondary">{evidence.openingHours || "暂无数据"}</Text>
      </View>
      {evidence.distanceM !== null ? <View className="facility-evidence__fact">
        <Text className="type-caption">距观星点</Text>
        <Text className="type-secondary">{evidence.distanceM} 米</Text>
      </View> : null}
      <View className="facility-evidence__fact facility-evidence__fact--conditions">
        <Text className="type-caption">使用条件</Text>
        <Text className="type-secondary">{evidence.usageCondition || "暂无数据"}</Text>
      </View>
    </View>
    {showVerification ? <Text className="type-caption">最近核验：{evidence.verifiedAt ? formatDisplayDate(evidence.verifiedAt) : "暂无核验时间"}</Text> : null}
    {showSource ? <View><Provenance source={evidence.source} compact /></View> : null}
  </>;
}
