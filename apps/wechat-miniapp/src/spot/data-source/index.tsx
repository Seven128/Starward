import { SystemMotionProbe } from "@/components/system-motion-probe";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { ScrollView, Text, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { Provenance, SOURCE_KIND_LABEL, isProductSource } from "@/components/provenance";
import { groupSources } from "./source-groups";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useAirQualityQuery } from "@/hooks/use-forecast-query";
import { useRecentWeatherQuery } from "@/hooks/use-recent-weather-query";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import { getSpotAirQuality, getSpotOverview } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { useEffect, useState } from "react";
import { uniqueSourceRecords } from "@starward/miniapp-contracts";
import "./data-source.scss";

function safe(value?: string) {
  try { return decodeURIComponent(value ?? ""); } catch { return value ?? ""; }
}

export default function DataSourcePage() {
  const router = useRouter();
  const spotId = safe(router.params.spotId);
  const contextId = safe(router.params.contextId);
  const context = useAppStore((state) => state.observationContext);
  const notify = useAppStore((state) => state.notify);
  const [pageVisible, setPageVisible] = useState(true);
  useDidShow(() => setPageVisible(true));
  useDidHide(() => setPageVisible(false));
  const validRoute = spotId.startsWith("spot:") && context?.contextId === contextId &&
    context.location.kind === "FORMAL_SPOT" && context.location.spotId === spotId;
  const enabled = validRoute && pageVisible;
  const overview = useResourceQuery({
    queryKey: ["spot-overview", spotId, contextId, context?.contextFingerprint, context?.revision],
    queryFn: (signal) => getSpotOverview(spotId, contextId, signal), enabled,
  });
  const air = useAirQualityQuery({ queryKey: ["spot-air-quality", spotId],
    queryFn: signal => getSpotAirQuality(spotId, signal), enabled, refetchInterval: 60_000 });
  const recent = useRecentWeatherQuery({ spotId, timezone: context?.timezone ?? "Asia/Shanghai", visible: enabled });
  const detail = validRoute && overview.data?.data.spot.spotId === spotId ? overview.data.data : undefined;
  const airEnvelope = validRoute && air.data?.data.spotId === spotId ? air.data : undefined;
  const airFailed = Boolean(air.isError || air.refreshError || airEnvelope?.dataState === "STALE_USABLE" ||
    airEnvelope?.data.current.unavailableReason === "REQUEST_FAILED" || airEnvelope?.data.forecast.unavailableReason === "REQUEST_FAILED");
  const overviewFailed = Boolean(overview.isError || overview.refreshError || overview.data?.dataState === "STALE_USABLE");
  useEffect(() => {
    if (!enabled || !overviewFailed && !airFailed && !recent.failed) return;
    notify({ owner: "data-source", placement: "floating", tone: "info",
      title: "部分来源暂未更新", body: "已取得的来源保留，可在对应资料中重试。", dedupeKey: `data-source-failed:${spotId}` });
  }, [notify, enabled, spotId, overviewFailed, airFailed, recent.failed]);
  const themeClass = useThemeClass();
  const sources = uniqueSourceRecords([
    ...(detail?.dataDisclosure ?? []),
    ...(airEnvelope ? [...airEnvelope.sources, airEnvelope.data.current.source, airEnvelope.data.forecast.source] : []),
    ...(recent.envelope?.sources ?? []),
  ].filter(isProductSource));
  const incomplete = Boolean(overview.data && ["PARTIAL", "UNAVAILABLE", "EXPIRED"].includes(overview.data.dataState));
  const pending = overview.isPending || air.isPending || recent.query.isPending && !recent.liveFailed;
  const confirmedEmpty = Boolean(detail && airEnvelope && recent.envelope) && !pending && !overviewFailed && !airFailed && !recent.failed && !incomplete && !sources.length;

  return <><SystemMotionProbe /><View className={themeClass + " sources-page"}>
    <FloatingNotificationHost />
    <CustomNav title="来源与更新时间" subtitle={detail?.spot.name} back />
    <ScrollView scrollY enhanced showScrollbar={false} className="sources-scroll">
      <View className="sources-content page-inset safe-bottom">
        {!validRoute ? <StatusPanel state="ERROR" title="来源入口不可用"
          detail="无法确认当前观星点，请返回地图重新选择正式观星点。" recoveryLabel="返回地图"
          onRecover={() => void Taro.switchTab({ url: "/pages/map/index" })} /> : <>
          {overview.isPending ? <StatusPanel state="LOADING" detail="正在加载地点与观测来源。" />
            : overviewFailed || !detail ? <StatusPanel state={detail ? "STALE" : "ERROR"}
              detail={detail ? "地点与观测来源更新失败，保留上次记录；请逐项核对适用时段。" : "地点与观测来源暂未取得，其余来源仍可查看。"}
              recoveryLabel="重试地点与观测来源" onRecover={() => void overview.refetch()} />
            : incomplete ? <StatusPanel state="PARTIAL"
              detail={overview.data?.dataState === "EXPIRED" ? "部分地点或观测资料已过期，请逐项核对适用时段。" : "地点或观测资料尚未齐全，以下保留已取得的来源。"}
              recoveryLabel="重试地点与观测来源" onRecover={() => void overview.refetch()} /> : null}
          {air.isPending ? <StatusPanel state="LOADING" detail="正在加载空气质量来源。" />
            : airFailed || !airEnvelope ? <StatusPanel state={airEnvelope ? "PARTIAL" : "ERROR"}
              detail="部分空气质量来源暂未更新，其余来源保留。" recoveryLabel="重试空气质量来源" onRecover={() => void air.refetch()} /> : null}
          {recent.query.isPending && !recent.liveFailed ? <StatusPanel state="LOADING" detail="正在加载近期天气来源。" />
            : recent.failed ? <StatusPanel state="ERROR" detail="近期天气来源暂未更新，不保留过往地区记录；其余来源保留。"
              recoveryLabel="重试近期天气来源" onRecover={recent.retry} /> : null}
          {groupSources(sources).map(group => <View className="source-group" key={group.kind}>
            <Text className="type-section">{SOURCE_KIND_LABEL[group.kind]}</Text>
            {group.sources.map((source, index) => <Provenance source={source} presentation="reading" showKind={false} key={`${source.id}:${index}`} />)}
          </View>)}
          {confirmedEmpty ? <StatusPanel state="EMPTY" detail="暂无适用于此地点和时间的来源记录。" /> : null}
          <View className="source-principles card">
            <Text className="type-section">使用这些资料前</Text>
            <Text className="type-body">请结合每项资料的适用时段、精度和限制判断。预测会随时间变化；道路、开放条件与夜间安全仍需在出发前核实。图片与资料的转载使用须遵守各自许可。</Text>
          </View>
        </>}
      </View>
    </ScrollView>
    {validRoute ? <View className="sources-footer"><SoftButton label="返回观星点" onClick={() => void Taro.switchTab({ url: "/pages/map/index" }).catch(() => {
      notify({ owner: "data-source", placement: "floating", tone: "error", title: "地图暂未打开", body: "来源资料已保留，请重试返回观星点。", dedupeKey: "sources-return-map" });
    })}>返回观星点</SoftButton></View> : null}
  </View></>;
}
