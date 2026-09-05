import { FloatingNotificationHost } from "@/components/notification";
import { useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { Provenance } from "@/components/provenance";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getSpotOverview } from "@/services/api-client";
import "./data-source.scss";

function safe(value?: string) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

export default function DataSourcePage() {
  const router = useRouter();
  const spotId = safe(router.params.spotId);
  const contextId = safe(router.params.contextId);
  const validRoute =
    spotId.startsWith("spot:") && contextId.startsWith("ctx:");
  const overview = useResourceQuery({
    queryKey: ["spot-overview", spotId, contextId],
    queryFn: (signal) => getSpotOverview(spotId, contextId, signal),
    enabled: validRoute,
  });
  const detail = overview.data?.data;
  const themeClass = useThemeClass();
  const sources = detail
    ? [
        ...new Map(
          detail.dataDisclosure.map((source) => [source.id, source]),
        ).values(),
      ]
    : [];

  return (
    <View className={themeClass + " sources-page"}>
      <FloatingNotificationHost />
      <CustomNav title="来源与更新时间" subtitle={detail?.spot.name} back />
      <View className="sources-content page-inset safe-bottom">
        {!validRoute ? (
          <StatusPanel
            state="ERROR"
            detail="请从正式观星点详情中的来源入口打开本页。"
          />
        ) : overview.isPending ? (
          <StatusPanel state="LOADING" detail="正在加载来源与适用时间。" />
        ) : overview.isError || !detail ? (
          <StatusPanel
            state="ERROR"
            detail="来源暂不可用；不会用未核验资料补齐。"
            recoveryLabel="重试"
            onRecover={() => void overview.refetch()}
          />
        ) : (
          <>
            <View className="source-principles card">
              <Text className="type-section">如何理解这些数据</Text>
              <Text className="type-body">
                第三方预测、产品计算、官方核验、现场反馈与历史资料分开显示；缺失不显示为
                0；估算不包装为实测；过期关键数据不能产生推荐。
              </Text>
            </View>
            {sources.length ? (
              sources.map((source) => (
                <Provenance source={source} key={source.id} />
              ))
            ) : (
              <StatusPanel
                state="EMPTY"
                detail="当前没有符合来源与时效要求的记录。"
              />
            )}
            <View className="source-principles card">
              <Text className="type-section">地图与许可边界</Text>
              <Text className="type-body">
                权威位置与微信地图显示坐标分开管理；公开运营前仍需逐项核验地图资质、天气署名、遥感许可和媒体台账。
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
