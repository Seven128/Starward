import { Text, View } from "@tarojs/components";
import type { ObservationPlan, SkyReport } from "@starward/miniapp-contracts";
import { SourceAttribution } from "@/components/source-attribution";
import { ForecastCoverageNote } from "@/components/forecast-coverage-note";
import { SemanticIcon } from "@/components/semantic-asset";
import { planReference } from "./plan-reference-model";

export function PlanReference({ plan, report, loading }: { plan: ObservationPlan; report: SkyReport | null; loading: boolean }) {
  const facts = planReference(plan, report);
  return <View className="plan-section plan-reference" data-od-id="plan-reference">
    <View className="plan-section-heading"><View className="plan-reference__heading"><SemanticIcon name="telescope" /><Text className="type-section">观测参考</Text></View></View>
    {loading ? <Text className="type-caption">正在加载</Text> : <>
      <Text className="plan-form-footnote">{facts.nightRange ? `天文资料：${facts.nightRange}` : "天文资料暂无数据"}</Text>
      <View className="plan-reference__facts">
        <View><View className="plan-reference__label"><SemanticIcon name="sun" /><Text>天黑与晨光</Text></View><Text>天文昏影终 {facts.dusk}</Text><Text>天文晨光始 {facts.dawn}</Text></View>
        <View><View className="plan-reference__label"><SemanticIcon name="moon" /><Text>月亮影响</Text></View><Text>月出 {facts.moonrise}</Text><Text>月落 {facts.moonset}</Text><Text>月面照明 {facts.illumination}</Text></View>
        <View><View className="plan-reference__label"><SemanticIcon name="cloud" /><Text>云量变化</Text></View><Text>{facts.cloud}</Text></View>
        <View><View className="plan-reference__label"><SemanticIcon name="wind" /><Text>风与气温</Text></View><Text>风速 {facts.wind}</Text><Text>气温 {facts.temperature}</Text></View>
      </View>
      <ForecastCoverageNote starts={facts.weatherStarts} timezone={plan.contextSnapshot.timezone} scopeKey={`${plan.planId}:${plan.revision}`} />
      {facts.weatherStarts.length ? <SourceAttribution sources={report?.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST") ?? []} /> : null}
    </>}
  </View>;
}
