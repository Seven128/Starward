import { Button, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import type { FacilityEvidence, SpotDetail } from "@starward/miniapp-contracts";
import { Provenance } from "@/components/provenance";
import { SemanticIcon } from "@/components/semantic-asset";
import { FacilityEvidenceDetails } from "@/components/facility-evidence";

/** Disclosure in the existing spot document, never a second detail-page journey. */
export function SpotAdditionalInformation({ spotId, detail, facilities, onLayoutChange, facilityLabel }: {
  spotId: string; detail: SpotDetail | null | undefined; facilities: readonly FacilityEvidence[];
  onLayoutChange: () => void; facilityLabel: (type: string) => string;
}) {
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  useEffect(() => setExpandedFor(null), [spotId]);
  const expanded = expandedFor === spotId;
  const facts = detail?.formalFacts;
  const fields: readonly (readonly [string, string | null | undefined])[] = [
    ["场地说明", facts?.detail], ["观测平台", facts?.platform], ["周围视野", facts?.horizon],
    ["通信信号", facts?.signal], ["露营", facts?.camping],
  ];
  const paragraphs = fields.flatMap(([label, value]) => value?.trim() ? [{ label, value: value.trim() }] : []);
  const guidance = [...new Set([...(detail?.accessAndSafety.restrictions ?? []), ...(detail?.accessAndSafety.guidance ?? [])].filter(Boolean))];
  const additionalFacilities = facilities.filter(facility => facility.type !== "PARKING" && facility.type !== "TOILET");
  if (!paragraphs.length && !additionalFacilities.length && !guidance.length) return null;
  return <View className="spot-panel__additional-site">
    <Button className="spot-panel__more-site" aria-label="展开或收起更多场地信息" aria-expanded={expanded}
      onClick={() => { setExpandedFor(expanded ? null : spotId); onLayoutChange(); }}>
      <Text>更多场地信息</Text>
      <View className="spot-panel__more-site-trailing"><Text>平台、信号与现场指引</Text><SemanticIcon name={expanded ? "chevron-up" : "chevron-down"} /></View>
    </Button>
    {expanded ? <View className="spot-panel__additional-site-content" role="region" aria-label="更多场地信息">
      {paragraphs.map(({ label, value }) => <Text className="type-caption" key={label}>{label}：{value}</Text>)}
      {additionalFacilities.map((facility, index) => <View key={`${facility.type}:${index}`} className="spot-panel__additional-facility">
        <FacilityEvidenceDetails evidence={facility} title={facilityLabel(facility.type)} />
      </View>)}
      {guidance.map(message => <Text className="type-caption" key={message}>{message}</Text>)}
      {paragraphs.length && detail?.dataDisclosure[0] ? <Provenance source={detail.dataDisclosure[0]} compact /> : null}
    </View> : null}
  </View>;
}
