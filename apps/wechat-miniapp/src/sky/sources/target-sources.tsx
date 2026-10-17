import { ScrollView, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { Provenance } from "@/components/provenance";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getSkyTargetInstant } from "@/services/sky-celestial-client";
import { skyTargetInstantQueryKey } from "@/services/sky-target-instant-response";
import { useAppStore } from "@/state/app-store";
import { parseSkyTargetSourceSelection, skyTargetSourceContextMatches } from "@/features/sky/sky-target-sources-route";
import { useSkySourceRecovery } from "./use-sky-source-recovery";

export function SkyTargetSourcesPage({ params }: { params: Record<string, unknown> }) {
  const selection = parseSkyTargetSourceSelection(params);
  const context = useAppStore(state => state.observationContext);
  const [visible, setVisible] = useState(true);
  useDidHide(() => setVisible(false));
  useDidShow(() => setVisible(true));
  const valid = Boolean(selection && skyTargetSourceContextMatches(selection, context));
  const result = useResourceQuery({
    queryKey: skyTargetInstantQueryKey(selection, selection?.dataRevision),
    queryFn: signal => getSkyTargetInstant(selection!, signal),
    enabled: visible && valid, staleTime: 60_000,
  });
  const target = valid ? result.data?.data.targets.find(value => value.targetId === selection!.targetId && value.source.id === selection!.sourceId) : undefined;
  const retry = useSkySourceRecovery(JSON.stringify(selection), visible && valid, () => {
    if (selection && skyTargetSourceContextMatches(selection, useAppStore.getState().observationContext)) return result.refetch();
  });
  const themeClass = useThemeClass();
  return <View className={`${themeClass} celestial-sources-page`}>
    <CustomNav title="来源" subtitle={target?.displayName} back />
    <ScrollView scrollY enhanced showScrollbar={false} className="celestial-sources-scroll">
      <View className="celestial-sources-content page-inset safe-bottom">
        {!valid ? <StatusPanel state="EMPTY" detail="此入口已失效，请从星图重新打开" />
          : result.isPending ? <StatusPanel state="LOADING" detail="正在加载来源…" />
          : result.isError || !target ? <StatusPanel state="ERROR" detail="未取得该目标的来源，请重试" recoveryLabel="重试" onRecover={retry} />
          : <>
            {result.refreshError || result.data?.dataState === "STALE_USABLE" ? <StatusPanel state="STALE"
              detail="更新失败，显示上次来源" recoveryLabel="重试" onRecover={retry} /> : null}
            {result.data?.dataState === "PARTIAL" ? <StatusPanel state="PARTIAL"
              detail="部分资料未加载，已保留当前来源" recoveryLabel="重试" onRecover={retry} /> : null}
            <View className="sky-target-source-explanation">
              <Text className="type-section">目标说明</Text>
              <Text className="type-body">{target.reason}</Text>
            </View>
            <Provenance source={target.source} showKind={false} />
            {target.activity && target.activity.source.id !== target.source.id ? <Provenance source={target.activity.source} showKind={false} /> : null}
          </>}
      </View>
    </ScrollView>
  </View>;
}
