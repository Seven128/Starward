import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { createSpotNavigationController, spotNavigationFeedback, type SpotNavigationSnapshot } from "@/navigation/spot-navigation-controller";
import { useAppStore } from "@/state/app-store";
import type { NotificationPlacement } from "@/state/notification";

/** The page supplies current data/feedback; this owner alone dispatches native map and clipboard effects. */
export function useSpotNavigationCommand(options: {
  readSnapshot(): SpotNavigationSnapshot;
  confirmHandoff(): Promise<boolean>;
  feedback: { owner: string; placement: NotificationPlacement; dedupeKeyPrefix: string };
}) {
  const live = useRef(options); live.current = options;
  const page = useRef(Taro.getCurrentInstance().page ?? Taro.getCurrentPages().at(-1)).current;
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const command = useRef<ReturnType<typeof createSpotNavigationController> | null>(null);
  const getCommand = () => {
    if (!mounted.current) return null;
    command.current ??= createSpotNavigationController({
      readSnapshot: () => live.current.readSnapshot(),
      isCurrent: () => mounted.current && Boolean(page) && Taro.getCurrentPages().at(-1) === page,
      confirmHandoff: () => live.current.confirmHandoff(),
      confirmBlocker: async content => (await Taro.showModal({ title: "当前存在出行阻断", content, confirmText: "仍要查看", cancelText: "暂不前往" })).confirm,
      chooseAction: async canCopy => {
        const choice = await Taro.showActionSheet({ itemList: canCopy ? ["在微信地图查看位置", "复制坐标"] : ["在微信地图查看位置"] });
        return choice.tapIndex === 0 ? "MAP" : choice.tapIndex === 1 && canCopy ? "COPY" : null;
      },
      openLocation: target => Taro.openLocation(target),
      copyCoordinates: data => Taro.setClipboardData({ data }),
      confirmCopyFallback: async () => (await Taro.showModal({ title: "无法打开地图", content: "外部地图暂未打开。你可以复制该公开点位坐标，或稍后重试。", confirmText: "复制坐标", cancelText: "取消" })).confirm,
      report: failure => {
        const { owner, placement, dedupeKeyPrefix } = live.current.feedback;
        useAppStore.getState().notify({ owner, placement, tone: "warning", ...spotNavigationFeedback(failure),
          dismissible: true, dedupeKey: `${dedupeKeyPrefix}${failure}` });
      },
      onAttempt: () => {
        const { owner, dedupeKeyPrefix } = live.current.feedback;
        const state = useAppStore.getState();
        for (const item of state.notifications) {
          if (item.owner === owner && item.dedupeKey?.startsWith(dedupeKeyPrefix)) state.dismissNotification(item.id);
        }
      },
      onBusy: value => { if (mounted.current) setBusy(value); },
    });
    return command.current;
  };
  useEffect(() => {
    mounted.current = true;
    const owner = getCommand(); owner?.show();
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.mode !== previous.mode || state.mapResetVersion !== previous.mapResetVersion) owner?.invalidate();
    });
    return () => { unsubscribe(); mounted.current = false; owner?.dispose(); if (command.current === owner) command.current = null; };
  }, []);
  useDidShow(() => { getCommand()?.show(); });
  useDidHide(() => { command.current?.hide(); });
  return { busy, openDirect: () => getCommand()?.openDirect(), openOptions: () => getCommand()?.openOptions() };
}
