import { Text, View } from "@tarojs/components";
import type { ObservationPlan, SkyReport } from "@starward/miniapp-contracts";
import { SourceAttribution } from "@/components/source-attribution";
import { SourceEntry } from "@/components/source-entry";
import { ForecastCoverageNote } from "@/components/forecast-coverage-note";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { planReference } from "./plan-reference-model";
import { weatherCreditSources, weatherSourceSections } from "@/components/weather-source-presentation";

export function PlanReference({ plan, report, loading, failed, stale = false, forecastClockOffsetMs = 0, onRetry }: { plan: ObservationPlan; report: SkyReport | null; loading: boolean; failed: boolean; stale?: boolean; forecastClockOffsetMs?: number; onRetry: () => void }) {
  const now = Date.now() + forecastClockOffsetMs;
  const facts = planReference(plan, report, now);
  const credits = report ? weatherCreditSources(report, facts.weatherStarts.length > 0, facts.hasCloud) : [];
  return <View className="plan-section plan-reference" data-od-id="plan-reference">
    <View className="plan-section-heading"><View className="plan-reference__heading"><SemanticIcon name="telescope" /><Text className="type-section">观测参考</Text></View><Text className="plan-reference__scope plan-section-caption">所选时间段</Text></View>
    {failed ? <StatusPanel state="ERROR" detail="天气与夜空动态条件暂未获取；计划和出发安排仍可查看。"
      recoveryLabel="重试动态条件" onRecover={onRetry} /> : loading ? <StatusPanel state="LOADING" detail="正在读取天气与夜空条件。" /> : <>
      <Text className="plan-form-footnote">{facts.nightRange ? `天文资料：${facts.nightRange}` : "天文资料暂无数据"}</Text>
      <View className="plan-reference__facts">
        <View><View className="plan-reference__label"><SemanticIcon name="sun" /><Text>天黑与晨光</Text></View><Text>天文昏影终 {facts.dusk}</Text><Text>天文晨光始 {facts.dawn}</Text></View>
        <View><View className="plan-reference__label"><SemanticIcon name="moon" /><Text>月亮影响</Text></View><Text>月出 {facts.moonrise}</Text><Text>月落 {facts.moonset}</Text><Text>月面照明 {facts.illumination}</Text></View>
        <View><View className="plan-reference__label"><SemanticIcon name="cloud" /><Text>云量变化</Text></View><Text>{facts.cloud}</Text></View>
        <View><View className="plan-reference__label"><SemanticIcon name="wind" /><Text>风与气温</Text></View><Text>风速 {facts.wind}</Text><Text>气温 {facts.temperature}</Text></View>
      </View>
      <ForecastCoverageNote starts={facts.weatherStarts} {...(facts.cloudIntervals === undefined ? {} : { cloudIntervals: facts.cloudIntervals })}
        timezone={plan.contextSnapshot.timezone} scopeKey={`${plan.planId}:${plan.revision}`} stale={stale} />
      {credits.length ? <SourceAttribution presentation="credit" sources={credits} /> : null}
      <SourceEntry id="plan-reference-source" label="观测参考来源" sources={report?.sources ?? []}
        {...(report && facts.cloudIntervals !== undefined ? { sections: weatherSourceSections(report, plan.contextSnapshot.selectedAtUtc,
          plan.contextSnapshot.timezone, stale, now, facts.cloudIntervals) } : {})} />
    </>}
  </View>;
}
