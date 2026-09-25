import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Picker, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { SemanticIcon } from "@/components/semantic-asset";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { currentDraftUserId, getPlans } from "@/services/api-client";
import { achievementSummary, endedPlanRecords, nextPlanEndAt } from "@/features/my/plan-achievements";
import "./index.scss";

export default function AchievementPage() {
  const themeClass = useThemeClass();
  const owner = currentDraftUserId();
  const [now, setNow] = useState(() => new Date());
  const [visible, setVisible] = useState(true);
  const [year, setYear] = useState<number | null>(null);
  const [navigationError, setNavigationError] = useState(false);
  const plans = useResourceQuery({ queryKey: ["plans", owner ?? "unresolved:achievements"],
    queryFn: signal => getPlans(signal, owner ?? undefined), staleTime: 30_000 });
  useDidShow(() => { setVisible(true); setNow(new Date()); void plans.refetch(); });
  useDidHide(() => setVisible(false));
  useEffect(() => {
    if (!visible || !plans.data) return;
    const next = nextPlanEndAt(plans.data.data.plans, now);
    if (next === null) return;
    const delay = Math.max(1, Math.min(next - Date.now() + 1, 2_147_483_647));
    const timer = setTimeout(() => setNow(new Date()), delay);
    return () => clearTimeout(timer);
  }, [visible, plans.data, now]);
  const all = useMemo(() => endedPlanRecords(plans.data?.data.plans ?? [], now), [plans.data, now]);
  const years = useMemo(() => [...new Set(all.map(record => record.year))], [all]);
  const selectedYear = year && years.includes(year) ? year : years[0] ?? null;
  const records = all.filter(record => record.year === selectedYear);
  const summary = achievementSummary(records);
  const openPlan = async (planId: string) => {
    setNavigationError(false);
    try { await Taro.navigateTo({ url: `/content/plan/detail/index?planId=${encodeURIComponent(planId)}` }); }
    catch { setNavigationError(true); }
  };
  return <View className={`${themeClass} achievement-page`}>
    <FloatingNotificationHost />
    <CustomNav title="我的星旅" back backFallbackTab="/pages/my/index" />
    <ScrollView scrollY enhanced showScrollbar={false} className="achievement-page__scroll">
      <View className="achievement-page__content page-inset safe-bottom">
        <View className="achievement-page__heading"><Text className="type-page-title">我的星旅</Text><Text className="type-secondary">从每一份计划，收藏自己的星空</Text></View>
        {plans.isPending && !plans.data ? <StatusPanel state="LOADING" detail="正在读取观星计划。" /> : null}
        {plans.isError && !plans.data ? <StatusPanel state="ERROR" detail="计划暂时无法读取，成就统计未更新。" recoveryLabel="重试" onRecover={() => void plans.refetch()} /> : null}
        {plans.data ? <>
          {plans.refreshError || plans.data.dataState === "STALE_USABLE" ? <StatusPanel state="STALE" detail="计划暂未同步，以下是上次读取的统计。" recoveryLabel="重试" onRecover={() => void plans.refetch()} /> : null}
          {all.length ? <>
            <View className="achievement-summary" role="group" aria-label={`${selectedYear}年个人行程成就`}>
              <View className="achievement-summary__main"><Text>{summary.endedPlans}</Text><Text>已结束计划</Text></View>
              <View className="achievement-summary__facts"><Text>{summary.places} 计划地点</Text><Text>{summary.events} 关联天象</Text></View>
            </View>
            <View className="achievement-page__year">
              <Picker mode="selector" range={years.map(value => `${value} 年`)} value={Math.max(0, years.indexOf(selectedYear!))} onChange={event => setYear(years[Number(event.detail.value)] ?? null)}>
                <View className="achievement-page__year-picker" role="button" aria-label={`选择统计年份，当前${selectedYear}年`}>{selectedYear} 年 <SemanticIcon name="chevron-down" /></View>
              </Picker>
              <Text className="type-caption">{records.length} 份行程记录</Text>
            </View>
            {records.map(record => {
              const { plan } = record;
              const spotName = plans.data?.data.planSpots?.find(spot => spot.spotId === plan.spotId)?.name ?? "地点资料暂不可用";
              return <Button key={plan.planId} className="achievement-record" aria-label={`查看${spotName}的已结束计划`} onClick={() => void openPlan(plan.planId)}>
                <Text className="achievement-record__title">{spotName}</Text>
                <Text className="type-caption">{plan.localDate} {plan.localTime} — {plan.timing?.endLocalDate} {plan.timing?.endLocalTime} · {plan.contextSnapshot.timezone}</Text>
                <Text className="type-caption">{plan.eventOccurrenceIds?.length ? `关联天象 ${plan.eventOccurrenceIds.length} 项` : "未关联天象"}</Text>
                <View className="achievement-record__footer"><Text>计划已结束</Text><Text>查看行程 ›</Text></View>
              </Button>;
            })}
          </> : !plans.isError && !plans.refreshError && plans.data.dataState !== "STALE_USABLE" ? <StatusPanel state="EMPTY" emptyLevel="page" title="暂无星旅记录" detail="已结束的观星计划会显示在这里；计划时间经过不代表已到访或观测成功。" recoveryLabel="＋ 新建计划" onRecover={() => void Taro.navigateTo({ url: "/content/plan/edit/index?new=1" })} /> : null}
        </> : null}
        {navigationError ? <StatusPanel state="ERROR" detail="行程暂未打开，请再次点击。" /> : null}
      </View>
    </ScrollView>
  </View>;
}
