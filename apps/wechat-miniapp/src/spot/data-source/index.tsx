import { FloatingNotificationHost } from "@/components/notification";
import { useRouter } from "@tarojs/taro";
import { ScrollView, Text, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { Provenance, SOURCE_KIND_LABEL } from "@/components/provenance";
import { groupSources } from "./source-groups";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getSpotOverview } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
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
  const context = useAppStore((state) => state.observationContext);
  const validRoute =
    spotId.startsWith("spot:") && context?.contextId === contextId &&
    context.location.kind === "FORMAL_SPOT" && context.location.spotId === spotId;
  const overview = useResourceQuery({
    queryKey: ["spot-overview", spotId, contextId, context?.contextFingerprint, context?.revision],
    queryFn: (signal) => getSpotOverview(spotId, contextId, signal),
    enabled: validRoute,
  });
  const detail = validRoute && overview.data?.data.spot.spotId === spotId ? overview.data.data : undefined;
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
      <ScrollView scrollY enhanced showScrollbar={false} className="sources-scroll">
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
            detail="来源暂时无法加载，请重试。"
            recoveryLabel="重试"
            onRecover={() => void overview.refetch()}
          />
        ) : (
          <>
            {overview.refreshError || overview.data?.dataState === "STALE_USABLE" ? (
              <StatusPanel
                state="STALE"
                detail={overview.refreshError ? "来源更新失败，暂时显示上次记录，请留意资料的适用时段。" : "当前来源记录尚未确认最新状态，请留意适用时段并重新获取。"}
                recoveryLabel="重新获取来源"
                onRecover={() => void overview.refetch()}
              />
            ) : null}
            {sources.length ? (
              groupSources(sources).map((group) => (
                <View className="source-group" key={group.kind}>
                  <Text className="type-section">{SOURCE_KIND_LABEL[group.kind]}</Text>
                  {group.sources.map((source) => <Provenance source={source} showKind={false} key={source.id} />)}
                </View>
              ))
            ) : (
              <StatusPanel
                state="EMPTY"
                detail="当前没有符合来源与时效要求的记录。"
              />
            )}
            <View className="source-principles card">
              <Text className="type-section">使用这些资料前</Text>
              <Text className="type-body">
                请结合每项资料的适用时段、精度和限制判断。预测会随时间变化；道路、开放条件与夜间安全仍需在出发前核实。图片与资料的转载使用须遵守各自许可。
              </Text>
            </View>
          </>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
