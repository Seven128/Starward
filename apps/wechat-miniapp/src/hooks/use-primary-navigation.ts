import Taro, { useDidHide, useDidShow, useResize } from "@tarojs/taro";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { primaryNavigationLayout, type PrimaryPageRoute } from "@/navigation/primary-navigation";
import type { PrimaryNavigationHandle } from "@/navigation/primary-navigation-cover";

type NativePrimaryPage = { route?: string; getTabBar?(): unknown };
function nativeBar(page: NativePrimaryPage) {
  return page.getTabBar?.() as PrimaryNavigationHandle | undefined;
}

export function readPrimaryNavigationLayout(route: PrimaryPageRoute) {
  try { return primaryNavigationLayout(route, Taro.getWindowInfo()); }
  catch { return primaryNavigationLayout(route); }
}

/** Each native tab owns its own custom-bar instance; returning children resync it. */
export function usePrimaryNavigation(route: PrimaryPageRoute) {
  const [layout, setLayout] = useState(() => readPrimaryNavigationLayout(route));
  const life = useRef({ alive: true, visible: false, revision: 0 });
  // Hidden theme rerenders see the global child page; retain this mount's owner.
  const page = useRef(Taro.getCurrentInstance().page).current;
  const sync = () => {
    if (!life.current.alive || !life.current.visible || !page || Taro.getCurrentPages().at(-1) !== page) return;
    setLayout(readPrimaryNavigationLayout(route));
    // Native Component methods receive serializable values, never a Page object.
    nativeBar(page)?.show(route);
  };
  useDidShow(() => {
    life.current.visible = true;
    const revision = ++life.current.revision;
    sync();
    // One native render turn handles first mounting; no polling or timer loop.
    void Taro.nextTick(() => { if (life.current.revision === revision) sync(); });
  });
  useDidHide(() => {
    life.current.visible = false; life.current.revision++;
    if (page) nativeBar(page)?.hide();
  });
  useResize(sync);
  useEffect(() => {
    life.current.alive = true;
    return () => { life.current.alive = false; life.current.revision++; };
  }, []);
  return { ...layout, style: layout.style as CSSProperties };
}
