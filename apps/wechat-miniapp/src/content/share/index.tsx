import Taro, { useDidHide, useDidShow, useRouter, useShareAppMessage } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { PlanPublicShareData, SpotPublicShareData } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { EMPTY_FIELD_VALUE, StatusPanel } from "@/components/status-panel";
import { SharePoster } from "@/components/share-poster";
import { useThemeClass } from "@/hooks/use-theme";
import { createPlanShare, getSharedPlan, getSharedSpot, MiniappApiError } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { displayZonedShareExpiry } from "@/utils/zoned-date";
import { planSpotRiskMessage } from "@/utils/public-share-copy";
import { remainingPublicPlanLifetimeMs } from "./share-lifetime";
import "./index.scss";

type Shared = PlanPublicShareData | SpotPublicShareData;
type ShareState = { kind: "loading" } | { kind: "missing" } | { kind: "error" } |
  { kind: "ready"; data: Shared; path: string; expiresInMs?: number };

function decode(value: string | undefined): string {
  try { return decodeURIComponent(value ?? ""); } catch { return ""; }
}

function PublicSpotFact({ label, value }: { label: string; value: string | null }) {
  return <View className="shared-journey__row"><Text>{label}</Text>
    <Text className={value ? "" : "shared-journey__missing"}>{value || EMPTY_FIELD_VALUE}</Text></View>;
}

export default function SharedJourneyPage() {
  const router = useRouter();
  const themeClass = useThemeClass();
  const requestSpotOpen = useAppStore(state => state.requestSpotOpen);
  const setViewport = useAppStore(state => state.setViewport);
  const planId = decode(router.params.planId);
  const token = decode(router.params.token);
  const spotId = decode(router.params.spotId);
  const [state, setState] = useState<ShareState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const hasShown = useRef(false);
  const requestEpoch = useRef(0);
  const pageVisible = useRef(true);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDidShow(() => {
    pageVisible.current = true;
    if (!hasShown.current) {
      hasShown.current = true;
      return;
    }
    requestEpoch.current += 1;
    setState({ kind: "loading" });
    setAttempt(value => value + 1);
  });
  useDidHide(() => {
    pageVisible.current = false;
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
  });

  useEffect(() => {
    if (state.kind !== "ready" || state.data.kind !== "PLAN" || !pageVisible.current) return;
    const epoch = requestEpoch.current;
    const timer = setTimeout(() => {
      if (!pageVisible.current || requestEpoch.current !== epoch) return;
      requestEpoch.current += 1;
      setState({ kind: "missing" });
    }, state.expiresInMs);
    expiryTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (expiryTimer.current === timer) expiryTimer.current = null;
    };
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    const epoch = ++requestEpoch.current;
    const stillCurrent = () => !cancelled && requestEpoch.current === epoch;
    const showPlan = (response: Awaited<ReturnType<typeof getSharedPlan>>, publicToken: string, requestStartedAtMs: number) => {
      if (!stillCurrent()) return;
      const expiresInMs = remainingPublicPlanLifetimeMs(response.generatedAt, response.data.expiresAt, requestStartedAtMs, Date.now());
      if (expiresInMs <= 0) {
        setState({ kind: "missing" });
        return;
      }
      setState({ kind: "ready", data: response.data,
        path: `/content/share/index?token=${encodeURIComponent(publicToken)}`, expiresInMs });
    };
    setState({ kind: "loading" });
    void (async () => {
      try {
        if (planId && !token && !spotId) {
          const link = await createPlanShare(planId);
          const requestStartedAtMs = Date.now();
          const publicPlan = await getSharedPlan(link.data.token);
          showPlan(publicPlan, link.data.token, requestStartedAtMs);
        } else if (token && !planId && !spotId) {
          const requestStartedAtMs = Date.now();
          const publicPlan = await getSharedPlan(token);
          showPlan(publicPlan, token, requestStartedAtMs);
        } else if (spotId && !planId && !token) {
          const publicSpot = await getSharedSpot(spotId);
          if (stillCurrent()) setState({ kind: "ready", data: publicSpot.data,
            path: `/content/share/index?spotId=${encodeURIComponent(publicSpot.data.spotId)}` });
        } else if (stillCurrent()) setState({ kind: "missing" });
      } catch (error) {
        if (stillCurrent()) setState({ kind: error instanceof MiniappApiError &&
          (error.code === "NOT_FOUND" || error.code === "STALE_REJECTED") ? "missing" : "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [planId, token, spotId, attempt]);

  useShareAppMessage(() => state.kind === "ready" ? {
    title: state.data.kind === "PLAN" ? `${state.data.spotName} · 观星行程` : `${state.data.name} · 观星点`,
    path: state.path,
  } : { title: "星遥观星地图", path: "/pages/map/index" });

  const data = state.kind === "ready" ? state.data : null;
  const requestedKind = (planId && !token && !spotId) || (token && !planId && !spotId)
    ? "PLAN" : spotId && !planId && !token ? "SPOT" : null;
  const shareKind = data?.kind ?? requestedKind;
  const shareTitle = shareKind === "PLAN" ? "行程分享" : shareKind === "SPOT" ? "观星点分享" : "公开分享";
  const planSpotRisk = data?.kind === "PLAN" ? planSpotRiskMessage(data.spotStatus) : null;
  const openMap = () => {
    if (data) {
      setViewport({ center: { latitude: data.spotGcj02.latitude, longitude: data.spotGcj02.longitude }, zoom: 11 });
      requestSpotOpen(data.spotId);
    }
    void Taro.switchTab({ url: "/pages/map/index" });
  };
  return <View className={`${themeClass} shared-journey`}>
    <FloatingNotificationHost />
    <CustomNav title={shareTitle} back backFallbackTab="/pages/map/index" />
    <ScrollView scrollY enhanced showScrollbar={false} className="shared-journey__scroll">
      <View className="shared-journey__content page-inset safe-bottom">
        {state.kind === "loading" ? <StatusPanel state="LOADING" detail="正在读取公开分享内容。" /> : null}
        {state.kind === "missing" ? <StatusPanel state="ERROR" title="分享不可用" detail="这份分享已失效、被删除或暂不公开。" recoveryLabel="返回地图" onRecover={openMap} /> : null}
        {state.kind === "error" ? <StatusPanel state="ERROR" detail="分享内容暂时无法获取，请检查网络后重试。" recoveryLabel="重试" onRecover={() => setAttempt(value => value + 1)} /> : null}
        {data ? <>
          <View className="shared-journey__card">
            <Text className="type-caption">{data.kind === "PLAN" ? "公开行程" : "正式观星点"}</Text>
            <Text className="type-page-title">{data.kind === "PLAN" ? data.spotName : data.name}</Text>
            <Text className="type-secondary">{data.kind === "PLAN" ? data.spotRegion : data.region}</Text>
            {data.kind === "PLAN" ? <>
              {planSpotRisk ? <Text className="shared-journey__alert">{planSpotRisk}</Text> : null}
              <View className="shared-journey__row"><Text>计划出发</Text><Text>{data.departureLocalDate} {data.departureLocalTime}</Text></View>
              <View className="shared-journey__row"><Text>观测时段</Text><Text>{data.localDate} {data.localTime} — {data.endLocalDate} {data.endLocalTime}</Text></View>
              <Text className="type-caption">时间均为 {data.timezone}；计划结束不代表已到访或观测成功。</Text>
              {data.events.map(event => <View className="shared-journey__event" key={event.occurrenceId}>
                <Text>关联天象：{event.displayName}</Text>
                {event.source ? <Provenance source={event.source} /> : <Text className="type-caption">天象资料暂不可用</Text>}
              </View>)}
              <Text className="type-caption">此链接有效至 {displayZonedShareExpiry(data.expiresAt, data.timezone)}；计划修改后需重新分享。</Text>
              <Provenance source={data.spotSource} />
            </> : <>
              <Text className="type-secondary">{data.address}</Text>
              {data.status === "TEMPORARILY_CLOSED" ? <Text className="shared-journey__alert">此观星点暂时关闭，请勿按旧信息进入。</Text> : null}
              <PublicSpotFact label="开放" value={data.opening} />
              <PublicSpotFact label="进入" value={data.access} />
              <PublicSpotFact label="安全" value={data.safety} />
              <PublicSpotFact label="停车" value={data.parking} />
              <PublicSpotFact label="视野" value={data.horizon} />
              <Provenance source={data.source} />
            </>}
          </View>
          <View className="shared-journey__actions">
            <Button className="shared-journey__button shared-journey__button--primary" openType="share">转发给微信好友</Button>
            <Button className="shared-journey__button" onClick={openMap}>在地图查看观星点</Button>
          </View>
          <SharePoster data={data} />
        </> : null}
      </View>
    </ScrollView>
  </View>;
}
