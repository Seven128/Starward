import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { currentDraftUserId, getAstronomicalEvents, getPlans } from "@/services/api-client";
import { eventDayLabel, eventKindLabel, eventPlanState, groupEventsByPeakMonth } from "../event-model";
import { useId, useRef, useState } from "react";
import "./index.scss";

export default function EventListPage() {
  const themeClass = useThemeClass();
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
  useDidShow(() => refreshIdentity(value => value + 1));
  const owner = currentDraftUserId();
  const rawPlanId = useRouter().params.planId;
  const rawReturnTarget = useRouter().params.returnTarget;
  let planId = "";
  let returnTarget = "";
  try { planId = rawPlanId ? decodeURIComponent(rawPlanId) : ""; } catch { planId = ""; }
  try { returnTarget = rawReturnTarget ? decodeURIComponent(rawReturnTarget) : ""; } catch { returnTarget = ""; }
  const query = useResourceQuery({ queryKey: ["astronomical-events"], queryFn: getAstronomicalEvents, staleTime: 6 * 60 * 60 * 1000 });
  const plansQuery = useResourceQuery({ queryKey: ["event-plan-relations", owner ?? `unresolved:${mountId}`], queryFn: signal => getPlans(signal, owner ?? undefined), staleTime: 15_000 });
  const [navigationError, setNavigationError] = useState(false);
  const navigating = useRef(false);
  const groups = groupEventsByPeakMonth(query.data?.data.events ?? []);
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = (query.data?.data.events ?? []).find(event => event.peakDate >= today)
    ?? query.data?.data.events.at(-1);
  const open = async (occurrenceId: string) => {
    if (navigating.current) return;
    navigating.current = true; setNavigationError(false);
    try { await Taro.navigateTo({ url: `/content/event/detail/index?occurrenceId=${encodeURIComponent(occurrenceId)}${planId ? `&planId=${encodeURIComponent(planId)}` : ""}${returnTarget ? `&returnTarget=${encodeURIComponent(returnTarget)}` : ""}` }); }
    catch { setNavigationError(true); }
    finally { navigating.current = false; }
  };
  return <View className={`${themeClass} event-list-page`}>
    <FloatingNotificationHost />
    <CustomNav title="天象事件" back backFallbackTab="/pages/my/index" />
    <ScrollView scrollY enhanced showScrollbar={false} className="event-list-scroll">
      <View className="event-list-content safe-bottom">
        <View className="event-list-hero">
          <View><Text className="event-list-kicker">2026 · 天象日历</Text><Text className="event-list-heading">下一场，抬头见</Text><Text className="event-list-intro">已收录 {query.data?.data.events.length ?? "—"} 场具体事件 · 按当地峰值参考日期排列</Text></View>
          <View className="event-list-hero-icon" aria-hidden="true"><View /></View>
          {nextEvent ? <View className="event-list-next"><Text>{eventKindLabel(nextEvent)}</Text><Text>{nextEvent.peakDate.slice(5).replace("-", " / ")}</Text></View> : null}
        </View>
        {query.isPending ? <StatusPanel state="LOADING" detail="正在读取事件目录。" /> : null}
        {query.isError ? <StatusPanel state="ERROR" detail="事件目录暂不可用。" recoveryLabel="重试" onRecover={() => void query.refetch()} /> : null}
        {plansQuery.isError ? <StatusPanel state="PARTIAL" detail="计划关联状态暂不可用；事件资料仍可浏览。" recoveryLabel="重试关联状态" onRecover={() => void plansQuery.refetch()} /> : null}
        {navigationError ? <StatusPanel state="PARTIAL" detail="事件详情暂未打开，请再次点击。" /> : null}
        {groups.map(group => <View key={group.month} className="event-month">
          <Text className="event-month__label">{group.label}</Text>
          {group.events.map(event => {
            const planState = plansQuery.data ? eventPlanState(event, plansQuery.data.data.plans) : null;
            return <Button key={event.occurrenceId} className="event-row" onClick={() => void open(event.occurrenceId)}>
            <View className="event-date-ticket"><Text>{eventDayLabel(event.peakDate)}</Text><Text>峰值</Text></View>
            <View className="event-row__copy"><View className="event-row__heading"><Text className="event-row__title">{event.displayName}</Text>{planState === "LINKED" ? <Text className="event-row__state">已关联</Text> : planState === "DATE_OVERLAP" ? <Text className="event-row__state">计划日期重叠</Text> : null}</View><Text className="event-row__code">{eventKindLabel(event)}</Text><Text className="event-row__range">{event.kind === "METEOR_SHOWER" ? "活动期" : "峰值参考"} {event.activeStartDate.slice(5)} — {event.activeEndDate.slice(5)}</Text></View>
            <View className={event.kind === "METEOR_SHOWER" ? "event-meteor" : `event-eclipse event-eclipse--${event.kind === "SOLAR_ECLIPSE" ? "solar" : "lunar"}`} aria-hidden="true" />
          </Button>;})}
        </View>)}
        {query.data ? <Text className="event-list-source">来源：{query.data.data.sources.map(source => source.provider).join(" · ")}。目录不等于你所在地的可见性预报。</Text> : null}
      </View>
    </ScrollView>
  </View>;
}
