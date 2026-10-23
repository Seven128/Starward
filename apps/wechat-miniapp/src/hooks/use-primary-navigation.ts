import Taro, { useDidHide, useDidShow, useResize } from "@tarojs/taro";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { primaryNavigationLayout, type PrimaryPageRoute } from "@/navigation/primary-navigation";
import { createPrimaryNavigationController } from "@/navigation/primary-navigation-controller";
import type { PrimaryNativePage } from "@/navigation/primary-navigation-controller";
import { registerPrimaryMapHost } from "@/navigation/primary-page-navigation";
import { useReducedMotion } from "./use-reduced-motion";

export const PRIMARY_MY_TRANSITION_MS = 240;
export function readPrimaryNavigationLayout(route: PrimaryPageRoute) {
  try { return primaryNavigationLayout(route, Taro.getWindowInfo()); }
  catch { return primaryNavigationLayout(route); }
}

/** One physical Map owns the logical My presentation and full native-page geometry. */
export function usePrimaryNavigation(route: PrimaryPageRoute) {
  const page = useRef(Taro.getCurrentInstance().page as PrimaryNativePage | undefined).current;
  const [layout, setLayout] = useState(() => readPrimaryNavigationLayout(route));
  const reducedMotion = useReducedMotion();
  const host = useRef<ReturnType<typeof createPrimaryNavigationController>>();
  if (!host.current) host.current = createPrimaryNavigationController({ currentPage() {
    try { return Taro.getCurrentPages().at(-1); } catch { return undefined; }
  } });
  const controller = host.current;
  const presentation = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useLayoutEffect(() => registerPrimaryMapHost(controller), [controller]);
  useDidShow(() => { if (page) controller.show(page); setLayout(readPrimaryNavigationLayout(route)); });
  useDidHide(controller.hide);
  useResize(() => setLayout(readPrimaryNavigationLayout(route)));
  useEffect(() => () => controller.dispose(), [controller]);
  useLayoutEffect(() => {
    const ticket = presentation.transitionTicket;
    if (ticket === null) return;
    if (reducedMotion) { controller.finishTransition(ticket); return; }
    const timer = setTimeout(() => controller.finishTransition(ticket), PRIMARY_MY_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [controller, presentation.transitionTicket, reducedMotion]);
  return { ...layout, style: { ...layout.style,
    "--primary-my-transition-duration": `${reducedMotion ? 0 : PRIMARY_MY_TRANSITION_MS}ms`,
  } as CSSProperties, controller, presentation, page };
}
