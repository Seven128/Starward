import Taro, { useRouter } from "@tarojs/taro";
import { View } from "@tarojs/components";
import { useState } from "react";

import { AstronomicalEventModal } from "@/components/astronomical-event-modal";
import { useThemeClass } from "@/hooks/use-theme";
import { useAppStore } from "@/state/app-store";

function decode(value: string | undefined) {
  try { return value ? decodeURIComponent(value) : ""; } catch { return ""; }
}

export function EventModalHostPage({ detailRoute = false }: { detailRoute?: boolean }) {
  const router = useRouter();
  const themeClass = useThemeClass();
  const context = useAppStore((state) => state.observationContext);
  const [open, setOpen] = useState(true);
  const occurrenceId = detailRoute ? decode(router.params.occurrenceId) || null : null;
  const planId = decode(router.params.planId);
  const returnTarget = decode(router.params.returnTarget);
  const selectionMode = Boolean(planId || returnTarget);
  const leave = () => {
    setOpen(false);
    setTimeout(() => void Taro.navigateBack({ delta: 1 }).catch(() => Taro.switchTab({ url: "/pages/map/index" })), 180);
  };
  return <View className={`${themeClass} event-modal-host`}>
    <AstronomicalEventModal open={open} mode={selectionMode ? "select-one" : "browse"}
      context={context} initialDetailId={occurrenceId}
      initialOccurrenceIds={occurrenceId ? [occurrenceId] : []}
      onClose={leave}
      {...(selectionMode ? { onConfirm: (selected: string | null) => {
        if (!selected) { leave(); return; }
        setOpen(false);
        const target = planId ? `planId=${encodeURIComponent(planId)}` : "new=1";
        setTimeout(() => void Taro.redirectTo({ url: `/content/plan/edit/index?${target}&eventOccurrenceId=${encodeURIComponent(selected)}` }), 180);
      }} : {})} />
  </View>;
}
