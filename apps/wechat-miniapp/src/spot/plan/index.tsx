import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { SpotDetailPage } from "@/features/spot/spot-detail-page";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getObservationContext } from "@/services/api-client";
import { View } from "@tarojs/components";
import { useRouter } from "@tarojs/taro";

function decode(value: string | undefined) {
  try { return decodeURIComponent(value ?? ""); } catch { return ""; }
}

export default function PlanSpotPage() {
  const router = useRouter();
  const contextId = decode(router.params.contextId);
  const spotId = decode(router.params.spotId);
  const themeClass = useThemeClass();
  const query = useResourceQuery({
    queryKey: ["plan-spot-context", contextId, spotId],
    queryFn: signal => getObservationContext(contextId, signal),
    enabled: Boolean(contextId && spotId.startsWith("spot:")),
    staleTime: 60_000,
  });
  const context = query.data?.data;
  if (context?.location.kind === "FORMAL_SPOT" && context.location.spotId === spotId)
    return <SpotDetailPage initialSegment="SITE" observationContextOverride={context} />;
  return <View className={themeClass}>
    <FloatingNotificationHost />
    <CustomNav title="观星点详情" back />
    <View className="page-inset">
      {query.isPending ? <StatusPanel state="LOADING" detail="正在恢复这份计划的观星点资料。" /> :
        <StatusPanel state="ERROR" detail="暂时无法恢复这份计划的观星点资料；计划内容保持不变。" recoveryLabel="重试" onRecover={() => void query.refetch()} />}
    </View>
  </View>;
}
