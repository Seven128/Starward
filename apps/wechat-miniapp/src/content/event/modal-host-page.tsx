import { openPrimaryPage } from "@/navigation/primary-page-navigation";
import Taro, { useRouter } from "@tarojs/taro";
import { View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";

import { AstronomicalEventModal } from "@/components/astronomical-event-modal";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import { useAppStore } from "@/state/app-store";
import { usePageNavigation } from "@/hooks/use-page-navigation";

function decode(value: string | undefined) {
  try { return value ? decodeURIComponent(value) : ""; } catch { return ""; }
}

export function EventModalHostPage({ detailRoute = false }: { detailRoute?: boolean }) {
  const router = useRouter();
  const themeClass = useThemeClass();
  const context = useAppStore((state) => state.observationContext);
  const [open, setOpen] = useState(true);
  const navigation = usePageNavigation();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current !== null) clearTimeout(closeTimer.current); }, []);
  const occurrenceId = detailRoute ? decode(router.params.occurrenceId) || null : null;
  const planId = decode(router.params.planId);
  const returnTarget = decode(router.params.returnTarget);
  const selectionMode = Boolean(planId || returnTarget);
  const initialMonth = /^\d{4}-(0[1-9]|1[0-2])$/u.test(router.params.month ?? "")
    ? router.params.month! : new Date().toISOString().slice(0, 7);
  const leavePage = async () => {
    const attempt = navigation.begin({ allowUnknownStack: true });
    if (!attempt) return;
    try {
      try { await Taro.navigateBack({ delta: 1 }); }
      catch { if (attempt.active()) await openPrimaryPage("/pages/map/index"); }
    } catch {
      if (attempt.active()) useAppStore.getState().notify({ owner: "event-modal", placement: "floating", tone: "warning",
        title: "暂时无法返回地图", body: "当前事件和阅读位置已保留，请再次返回。", dedupeKey: "event-page-return-failed" });
    } finally { attempt.release(); }
  };
  const leave = () => {
    if (!selectionMode) { void leavePage(); return; }
    setOpen(false);
    closeTimer.current = setTimeout(() => { closeTimer.current = null; void leavePage(); }, 180);
  };
  return <View className={`${themeClass} event-modal-host`}>
    <AstronomicalEventModal open={open} mode={selectionMode ? "select-one" : "browse"}
      presentation={selectionMode ? "modal" : "page"} initialMonth={initialMonth}
      context={context} initialDetailId={occurrenceId}
      initialOccurrenceIds={occurrenceId ? [occurrenceId] : []}
      onClose={leave}
      {...(selectionMode ? { onConfirm: (selected: string | null) => {
        if (!selected) { leave(); return; }
        setOpen(false);
        const target = planId ? `planId=${encodeURIComponent(planId)}` : "new=1";
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null;
          void Taro.redirectTo({ url: `/content/plan/edit/index?${target}&eventOccurrenceId=${encodeURIComponent(selected)}` });
        }, 180);
      }} : {})} />
  </View>;
}
