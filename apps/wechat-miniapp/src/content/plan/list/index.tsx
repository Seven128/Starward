import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidShow, useDidHide, useRouter } from "@tarojs/taro";
import { spotIdFromPlanRoute } from "@/features/spot/spot-plan-route";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useId, useRef, useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { currentDraftUserId, getPlans } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { nextPlanListBoundary, planEndLabel, planListEntries, type PlanPartition } from "./plan-list-model";
import { planTravelModeLabel } from "../detail/plan-travel-fields";
import "./index.scss";

export default function PlanListPage() {
  const spotId = spotIdFromPlanRoute(useRouter().params.spotId);
  const themeClass = useThemeClass(), mount = useId();
  const [, refreshIdentity] = useState(0);
  const [partition, setPartition] = useState<PlanPartition>("upcoming");
  const [now, setNow] = useState(() => new Date());
  const [navigationError, setNavigationError] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollPositions = useRef({ upcoming: 0, past: 0 });
  const navigating = useRef(false);
  const owner = currentDraftUserId();
  const notify = useAppStore((state) => state.notify);
  const query = useResourceQuery({ queryKey: ["plans", owner ?? `unresolved:${mount}`],
    queryFn: signal => getPlans(signal, owner ?? undefined), enabled: pageVisible, staleTime: 15_000 });
  useDidShow(() => {
    setPageVisible(true); refreshIdentity(v => v + 1); setNow(new Date());
    void query.refetch();
  });
  useDidHide(() => setPageVisible(false));
  useEffect(() => {
    if (!pageVisible || !query.data) return;
    const relevant = query.data.data.plans.filter(plan => !spotId || plan.spotId === spotId);
    const next = nextPlanListBoundary(relevant, now);
    if (next === null) return;
    const timer = setTimeout(() => setNow(new Date()), Math.max(1, Math.min(next - Date.now() + 1, 2_147_483_647)));
    return () => clearTimeout(timer);
  }, [pageVisible, query.data, spotId, now]);
  useEffect(() => {
    if (!pageVisible || (!query.isError && !query.refreshError && query.data?.dataState !== "STALE_USABLE")) return;
    notify({ owner: "plan-list", placement: "floating", tone: "info",
      title: "计划数据异常", body: "观星计划暂时无法同步，可在页面中重试。",
      dedupeKey: `plan-list-failed:${owner ?? "signed-out"}` });
  }, [notify, owner, pageVisible, query.data?.dataState, query.isError, query.refreshError]);
  const entries = planListEntries((query.data?.data.plans ?? []).filter(plan => !spotId || plan.spotId === spotId), now, partition);
  const choosePartition = (next: PlanPartition) => { setPartition(next); setScrollTop(scrollPositions.current[next]); };
  useEffect(() => { scrollPositions.current = { upcoming: 0, past: 0 }; setScrollTop(0); setPartition("upcoming"); }, [owner]);
  const open = async (url: string) => {
    if (navigating.current) return;
    navigating.current = true; setNavigationError(false);
    try { await Taro.navigateTo({ url }); } catch { setNavigationError(true); }
    finally { navigating.current = false; }
  };
  return <View className={`${themeClass} plan-list-page`}>
    <FloatingNotificationHost />
    <CustomNav title="观星计划" back backFallbackTab="/pages/my/index" />
    <ScrollView scrollY scrollTop={scrollTop} onScroll={event => { scrollPositions.current[partition] = event.detail.scrollTop; setScrollTop(event.detail.scrollTop); }} className="plan-list-scroll" showScrollbar={false} enhanced>
      <View className="plan-list-content">
        <View className="plan-list-filters" role="group" aria-label="计划时间分区">
          <Button className={partition === "upcoming" ? "plan-list-filter--active" : ""}
            aria-pressed={partition === "upcoming"} onClick={() => choosePartition("upcoming")}>接下来</Button>
          <Button className={partition === "past" ? "plan-list-filter--active" : ""}
            aria-pressed={partition === "past"} onClick={() => choosePartition("past")}>过往</Button>
          <Button className="plan-list-new" onClick={() => void open(`/content/plan/edit/index?new=1${spotId ? `&spotId=${encodeURIComponent(spotId)}` : ""}`)}>＋ 新建</Button>
        </View>
        {query.isError || query.refreshError || query.data?.dataState === "STALE_USABLE" ? <StatusPanel state={query.data ? "STALE" : "ERROR"} detail="计划暂未同步，请重试。" recoveryLabel="重试" onRecover={() => void query.refetch()} /> : null}
        {query.isPending ? <StatusPanel state="LOADING" detail="正在读取观星计划" /> : null}
        {navigationError ? <View role="alert"><Text>页面暂未打开，请再次点击。</Text></View> : null}
        {entries.map((entry, index) => {
          const { plan } = entry;
          const group = `${plan.localDate}|${plan.contextSnapshot.timezone}`;
          const previous = entries[index - 1];
          const grouped = previous && `${previous.plan.localDate}|${previous.plan.contextSnapshot.timezone}` === group;
          return <View key={plan.planId}>
            {!grouped ? <Text className="plan-list-date">{entry.invalid ? "时间待确认" : `${plan.localDate} · ${plan.contextSnapshot.timezone}`}</Text> : null}
            <Button className="plan-list-row" onClick={() => void open(`/content/plan/detail/index?planId=${encodeURIComponent(plan.planId)}`)}>
              <View className="plan-list-row__heading"><Text>{query.data?.data.planSpots?.find(spot => spot.spotId === plan.spotId)?.name ?? "点位资料暂不可用"}</Text><SemanticIcon name="chevron-right" /></View>
              <Text className="plan-list-row__time">{entry.invalid ? "请打开计划核对时间" : `${plan.localTime} — ${planEndLabel(plan)} · ${plan.travel ? planTravelModeLabel(plan.travel.mode) : "交通方式待补充"}${entry.ongoing ? " · 进行中" : ""}`}</Text>
              <Text className="plan-list-row__meta">{plan.timing ? `出发 ${plan.timing.departureLocalDate} ${plan.timing.departureLocalTime}` : "出发时间未填写"}　·　{plan.reminders?.length ?? 0} 个个人提醒</Text>
            </Button>
          </View>;
        })}
        {query.data && !query.isError && !query.refreshError && query.data.dataState !== "STALE_USABLE" && !entries.length ? <StatusPanel state="EMPTY" emptyLevel="page"
          title={partition === "past" ? "暂无过往计划" : "暂无观星计划"}
          detail={partition === "past" ? "已结束的计划会显示在这里。" : "新建计划后会显示在这里。"}
          recoveryLabel={partition === "past" ? "查看接下来" : "＋ 新建计划"}
          onRecover={partition === "past" ? () => choosePartition("upcoming") : () => void open(`/content/plan/edit/index?new=1${spotId ? `&spotId=${encodeURIComponent(spotId)}` : ""}`)} /> : null}
      </View>
    </ScrollView>
  </View>;
}
