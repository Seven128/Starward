import Taro, { useRouter, useShareAppMessage } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import type { PlanPublicShareData, SpotPublicShareData } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { SharePoster } from "@/components/share-poster";
import { useThemeClass } from "@/hooks/use-theme";
import { createPlanShare, getSharedPlan, getSharedSpot, MiniappApiError } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

type Shared = PlanPublicShareData | SpotPublicShareData;
type ShareState = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ready"; data: Shared; path: string };

function decode(value: string | undefined): string {
  try { return decodeURIComponent(value ?? ""); } catch { return ""; }
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

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    void (async () => {
      try {
        if (planId && !token && !spotId) {
          const link = await createPlanShare(planId);
          const publicPlan = await getSharedPlan(link.data.token);
          if (!cancelled) setState({ kind: "ready", data: publicPlan.data,
            path: `/content/share/index?token=${encodeURIComponent(link.data.token)}` });
        } else if (token && !planId && !spotId) {
          const publicPlan = await getSharedPlan(token);
          if (!cancelled) setState({ kind: "ready", data: publicPlan.data,
            path: `/content/share/index?token=${encodeURIComponent(token)}` });
        } else if (spotId && !planId && !token) {
          const publicSpot = await getSharedSpot(spotId);
          if (!cancelled) setState({ kind: "ready", data: publicSpot.data,
            path: `/content/share/index?spotId=${encodeURIComponent(publicSpot.data.spotId)}` });
        } else if (!cancelled) setState({ kind: "missing" });
      } catch (error) {
        if (!cancelled) setState({ kind: error instanceof MiniappApiError &&
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
  const openMap = () => {
    if (data) {
      setViewport({ center: { latitude: data.spotGcj02.latitude, longitude: data.spotGcj02.longitude }, zoom: 11 });
      requestSpotOpen(data.spotId);
    }
    void Taro.switchTab({ url: "/pages/map/index" });
  };
  return <View className={`${themeClass} shared-journey`}>
    <FloatingNotificationHost />
    <CustomNav title={data?.kind === "PLAN" ? "行程分享" : "观星点分享"} back backFallbackTab="/pages/map/index" />
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
              <View className="shared-journey__row"><Text>计划出发</Text><Text>{data.departureLocalDate} {data.departureLocalTime}</Text></View>
              <View className="shared-journey__row"><Text>观测时段</Text><Text>{data.localDate} {data.localTime} — {data.endLocalDate} {data.endLocalTime}</Text></View>
              <Text className="type-caption">时间均为 {data.timezone}；计划结束不代表已到访或观测成功。</Text>
              {data.events.map(event => <View className="shared-journey__event" key={event.occurrenceId}>
                <Text>关联天象：{event.displayName}</Text>
                {event.source ? <Provenance source={event.source} /> : <Text className="type-caption">天象资料暂不可用</Text>}
              </View>)}
              <Text className="type-caption">此链接有效至 {data.expiresAt}；计划修改后需重新分享。</Text>
              <Provenance source={data.spotSource} />
            </> : <>
              <Text className="type-secondary">{data.address}</Text>
              {data.status === "TEMPORARILY_CLOSED" ? <Text className="shared-journey__alert">此观星点暂时关闭，请勿按旧信息进入。</Text> : null}
              <View className="shared-journey__row"><Text>开放</Text><Text>{data.opening || "暂无资料"}</Text></View>
              <View className="shared-journey__row"><Text>进入</Text><Text>{data.access || "暂无资料"}</Text></View>
              <View className="shared-journey__row"><Text>安全</Text><Text>{data.safety || "暂无资料"}</Text></View>
              <View className="shared-journey__row"><Text>停车</Text><Text>{data.parking || "暂无资料"}</Text></View>
              <View className="shared-journey__row"><Text>视野</Text><Text>{data.horizon || "暂无资料"}</Text></View>
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
