import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { createContext, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getPrimaryMapPresentationSnapshot, isPagePresentationForeground,
  readPagePresentationIdentity, subscribePrimaryMapPresentation } from "./primary-page-navigation";
import type { PrimaryNativePage, PrimaryNavigationController } from "./primary-navigation-controller";
import type { PrimaryPageRoute } from "./primary-navigation";

export type PresentedPage = {
  route: string | undefined;
  visible: boolean;
  identity(): unknown;
  isCurrent(): boolean;
  back?: { register(onBack: () => void | Promise<void>): () => void };
};
const PagePresentation = createContext<PresentedPage | null>(null);
export function usePagePresentationContext() { return useContext(PagePresentation); }

/** A logical foreground shares the real Page's native stack, never its scroll or business state. */
export function PagePresentationProvider({ value, children }: { value: PresentedPage; children: ReactNode }) {
  return <PagePresentation.Provider value={value}>{children}</PagePresentation.Provider>;
}

/** Stable ports close over the small navigation owner, never a Map render's data. */
export function createPrimaryPagePresentation(controller: PrimaryNavigationController, route: PrimaryPageRoute,
  back: NonNullable<PresentedPage["back"]>) {
  const identity = () => controller.presentationIdentity(route);
  const isCurrent = () => controller.isForeground(route);
  return { snapshot: (): PresentedPage => ({ route, visible: isCurrent(), identity, isCurrent, back }) };
}

export function usePagePresentation(): PresentedPage {
  const presented = useContext(PagePresentation);
  const page = useRef(Taro.getCurrentInstance().page as PrimaryNativePage | undefined).current;
  const [nativeVisible, setNativeVisible] = useState(true);
  const nativeVisibleRef = useRef(true);
  useDidShow(() => { nativeVisibleRef.current = true; setNativeVisible(true); });
  useDidHide(() => { nativeVisibleRef.current = false; setNativeVisible(false); });
  const primary = useSyncExternalStore(subscribePrimaryMapPresentation, getPrimaryMapPresentationSnapshot, getPrimaryMapPresentationSnapshot);
  if (presented) return presented;
  const route = page?.route;
  return {
    route,
    visible: nativeVisible && (!page || readPagePresentationIdentity(page, route) != null) &&
      !(route === "pages/map/index" && primary?.phase === "closing"),
    identity: () => readPagePresentationIdentity(page, route),
    isCurrent: () => nativeVisibleRef.current && isPagePresentationForeground(page, route),
  };
}

/** Native show/hide and a retained Map's logical foreground use the same consumer boundary. */
export function usePresentedPageLifecycle({ show, hide }: {
  show?: () => void; hide?: () => void;
}) {
  const page = usePagePresentation();
  const latest = useRef({ show, hide });
  latest.current = { show, hide };
  const previous = useRef<{ visible: boolean; identity: unknown }>({ visible: false, identity: undefined });
  const identity = page.identity();
  useLayoutEffect(() => {
    const prior = previous.current;
    const visible = page.visible && page.isCurrent();
    if (prior.visible && (!visible || prior.identity !== identity)) latest.current.hide?.();
    if (visible && (!prior.visible || prior.identity !== identity)) latest.current.show?.();
    previous.current = { visible, identity };
  }, [page.visible, identity]);
  return page;
}

/** Only mounted active auxiliary tasks register, and one Back consumes one task. */
export function createPresentedPageBack() {
  const handlers = new Map<symbol, () => void | Promise<void>>();
  let pending: Promise<boolean> | null = null;
  return {
    register(onBack: () => void | Promise<void>) {
      const key = Symbol(); handlers.set(key, onBack);
      return () => { handlers.delete(key); };
    },
    handle(): Promise<boolean> {
      if (pending) return pending;
      const handler = [...handlers.values()].at(-1);
      if (!handler) return Promise.resolve(false);
      let result: void | Promise<void>;
      try { result = handler(); } catch (error) { return Promise.reject(error); }
      const command = Promise.resolve(result).then(() => true);
      pending = command;
      void command.finally(() => { if (pending === command) pending = null; }).catch(() => {});
      return command;
    },
  };
}
