import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { SpotDetailPage } from "@/features/spot/spot-detail-page";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getObservationContext } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { View } from "@tarojs/components";
import { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { useEffect, useState } from "react";

function decode(value: string | undefined) {
  try { return decodeURIComponent(value ?? ""); } catch { return ""; }
}

export default function PlanSpotPage() {
  const router = useRouter();
  const contextId = decode(router.params.contextId);
  const spotId = decode(router.params.spotId);
  const themeClass = useThemeClass();
  const notify = useAppStore((state) => state.notify);
  const [pageVisible, setPageVisible] = useState(true);
  useDidShow(() => setPageVisible(true));
  useDidHide(() => setPageVisible(false));
  const query = useResourceQuery({
    queryKey: ["plan-spot-context", contextId, spotId],
    queryFn: signal => getObservationContext(contextId, signal),
    enabled: pageVisible && Boolean(contextId && spotId.startsWith("spot:")),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!pageVisible || (!query.isError && !query.refreshError && query.data?.dataState !== "STALE_USABLE")) return;
    notify({ owner: "plan-spot", placement: "floating", tone: "info",
      title: "计划地点数据异常", body: "这份计划的观星点资料暂时无法恢复，可在页面中重试。",
      dedupeKey: `plan-spot-context-failed:${contextId}:${spotId}` });
  }, [contextId, notify, pageVisible, query.data?.dataState, query.isError, query.refreshError, spotId]);
  const context = query.data?.data;
  if (context?.location.kind === "FORMAL_SPOT" && context.location.spotId === spotId)
    return <SpotDetailPage initialSegment="SITE" observationContextOverride={context}
      contextRefreshError={Boolean(query.refreshError || query.data?.dataState === "STALE_USABLE")} onContextRefresh={() => void query.refetch()} />;
  return <View className={themeClass}>
    <FloatingNotificationHost />
    <CustomNav title="观星点详情" back />
    <View className="page-inset">
      {query.isPending ? <StatusPanel state="LOADING" detail="正在恢复这份计划的观星点资料。" /> :
        <StatusPanel state="EMPTY" detail="暂时无法恢复这份计划的观星点资料；计划内容保持不变。" recoveryLabel="重试" onRecover={() => void query.refetch()} />}
    </View>
  </View>;
}
