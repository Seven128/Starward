import { Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useRef, useState } from "react";
import { uniqueSourceRecords } from "@starward/miniapp-contracts";
import { SourcePage } from "@/components/source-page";
import { Provenance } from "@/components/provenance";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import { useSkyTimeTargetQuery } from "@/features/sky/sky-time-target-query";
import { useAppStore } from "@/state/app-store";
import { parseSkyTargetSourceSelection, skyTargetSourceContextMatches } from "@/features/sky/sky-target-sources-route";
import { useSkySourceRecovery } from "./use-sky-source-recovery";

export function SkyTargetSourcesPage({ params }: { params: Record<string, unknown> }) {
  const selection = parseSkyTargetSourceSelection(params);
  const context = useAppStore(state => state.observationContext);
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  useDidHide(() => { visibleRef.current = false; setVisible(false); });
  useDidShow(() => { visibleRef.current = true; setVisible(true); });
  const valid = Boolean(selection && skyTargetSourceContextMatches(selection, context));
  const result = useSkyTimeTargetQuery(selection, selection?.dataRevision, visible && valid,
    () => Boolean(visibleRef.current && selection && skyTargetSourceContextMatches(selection, useAppStore.getState().observationContext)));
  const target = valid ? result.data?.data.targets.find(value => value.targetId === selection!.targetId && value.source.id === selection!.sourceId) : undefined;
  const sources = target ? uniqueSourceRecords([target.source, ...(target.activity ? [target.activity.source] : [])]) : [];
  const retry = useSkySourceRecovery(JSON.stringify(selection), visible && valid, () => {
    if (selection && skyTargetSourceContextMatches(selection, useAppStore.getState().observationContext)) return result.refetch();
  });
  return <SourcePage subtitle={target?.displayName}>
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
            {sources.map((source, index) => <Provenance key={`${source.id}:${index}`} source={source} showKind={false} presentation="reading" />)}
          </>}
  </SourcePage>;
}
