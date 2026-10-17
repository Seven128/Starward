import { SystemMotionProbe } from "@/components/system-motion-probe";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidShow, useDidHide, useRouter } from "@tarojs/taro";
import { AccountEntry } from "../../account-entry";
import { spotIdFromPlanRoute } from "@/features/spot/spot-plan-route";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { parsePlanDraft, planDraftKey } from "../detail/plan-draft";
import { useAccountPlans } from "@/hooks/use-account-plans";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import { useAppStore } from "@/state/app-store";
import { nextPlanListBoundary, planEndLabel, planListEmptyState, planListEntries, type PlanPartition } from "./plan-list-model";
import { planTravelModeLabel } from "../detail/plan-travel-fields";
import { useAccountNavigation } from "@/hooks/use-account-navigation";
import "./index.scss";

export default function PlanListRoute() {
  return <AccountEntry title="观星计划"><PlanListPage /></AccountEntry>;
}

function PlanListPage() {
  const spotId = spotIdFromPlanRoute(useRouter().params.spotId);
  const themeClass = useThemeClass();
  const [partition, setPartition] = useState<PlanPartition>("upcoming");
  const [now, setNow] = useState(() => new Date());
  const [pageVisible, setPageVisible] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollPositions = useRef({ upcoming: 0, past: 0 });
  const notify = useAppStore((state) => state.notify);
  const { owner, query } = useAccountPlans({ enabled: pageVisible, staleTime: 15_000 });
  const { open, navigationError } = useAccountNavigation(owner);
  const draftKey = planDraftKey(owner, null, spotId);
  const [localDraftKey, setLocalDraftKey] = useState<string | null>(null);
  useEffect(() => {
    if (!pageVisible || !draftKey) { setLocalDraftKey(null); return; }
    try { setLocalDraftKey(parsePlanDraft(Taro.getStorageSync(draftKey)) ? draftKey : null); }
    catch { setLocalDraftKey(null); }
  }, [pageVisible, draftKey]);
  useDidShow(() => {
    setPageVisible(true); setNow(new Date());
    if (owner) void query.refetch();
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
  const plans = (query.data?.data.plans ?? []).filter(plan => !spotId || plan.spotId === spotId);
  const entries = planListEntries(plans, now, partition);
  const otherPartition: PlanPartition = partition === "past" ? "upcoming" : "past";
  const hasPlansInOtherPartition = !entries.length && planListEntries(plans, now, otherPartition).length > 0;
  const emptyState = planListEmptyState(partition, hasPlansInOtherPartition);
  const choosePartition = (next: PlanPartition) => { setPartition(next); setScrollTop(scrollPositions.current[next]); };
  useEffect(() => { scrollPositions.current = { upcoming: 0, past: 0 }; setScrollTop(0); setPartition("upcoming"); }, [owner]);
  return <><SystemMotionProbe /><View className={`${themeClass} plan-list-page`}>
    <FloatingNotificationHost />
    <CustomNav title="观星计划" back backFallbackTab="/pages/my/index" />
    <ScrollView scrollY scrollTop={scrollTop} onScroll={event => { scrollPositions.current[partition] = event.detail.scrollTop; setScrollTop(event.detail.scrollTop); }} className="plan-list-scroll" showScrollbar={false} enhanced>
      <View className="plan-list-content">
        <View className="plan-list-filters" role="group" aria-label="计划时间分区">
          <Button className={partition === "upcoming" ? "plan-list-filter--active" : ""}
            aria-pressed={partition === "upcoming"} onClick={() => choosePartition("upcoming")}>接下来</Button>
          <Button className={partition === "past" ? "plan-list-filter--active" : "plan-list-past"}
            aria-pressed={partition === "past"} onClick={() => choosePartition("past")}>过往</Button>
          <Button className="plan-list-new" onClick={() => void open(`/content/plan/edit/index?new=1${spotId ? `&spotId=${encodeURIComponent(spotId)}` : ""}`)}>＋ 新建</Button>
        </View>
        {query.isError || query.refreshError || query.data?.dataState === "STALE_USABLE" ? <StatusPanel state={query.data ? "STALE" : "ERROR"} detail="计划暂未同步，请重试。" recoveryLabel="重试" onRecover={() => void query.refetch()} /> : null}
        {!owner ? <StatusPanel state="PERMISSION_DENIED" title="请先登录" detail="登录后查看观星计划。" recoveryLabel="返回我的"
          onRecover={() => void Taro.switchTab({ url: "/pages/my/index" })} /> :
          query.isPending ? <StatusPanel state="LOADING" detail="正在读取观星计划" /> : null}
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
        {query.data && !query.isError && !query.refreshError && query.data.dataState !== "STALE_USABLE" && !entries.length ? <View className="plan-list-status" role="status">
          <Text>{emptyState.title}。{emptyState.detail}</Text>
          <SoftButton label={emptyState.actionLabel} onClick={emptyState.action === "switch" ? () => choosePartition(otherPartition)
            : () => void open(`/content/plan/edit/index?new=1${spotId ? `&spotId=${encodeURIComponent(spotId)}` : ""}`)}>{emptyState.actionLabel}</SoftButton>
        </View> : null}
        {draftKey && localDraftKey === draftKey ? <SoftButton label="继续本机草稿"
          onClick={() => void open(`/content/plan/edit/index?new=1${spotId ? `&spotId=${encodeURIComponent(spotId)}` : ""}`)}>继续本机草稿</SoftButton> : null}
      </View>
    </ScrollView>
  </View></>;
}
