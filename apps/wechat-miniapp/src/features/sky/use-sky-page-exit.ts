import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { createPageBlackoutTransition } from "../../navigation/page-blackout-transition";

export function useSkyPageExit(scope: () => string | null) {
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [presentation, setPresentation] = useState<number | null>(null);
  const owner = useRef<ReturnType<typeof createPageBlackoutTransition> | null>(null);
  if (!owner.current) owner.current = createPageBlackoutTransition({
    getScope: () => currentScope.current(), onPresentation: setPresentation,
  });
  const transition = owner.current;
  useEffect(() => {
    if (presentation === null) return;
    let current = true;
    Taro.nextTick(() => { if (current) transition.presented(presentation); });
    return () => { current = false; };
  }, [presentation, transition]);
  useEffect(() => {
    const hide = () => transition.hide();
    Taro.onAppHide(hide);
    return () => { Taro.offAppHide(hide); transition.dispose(); };
  }, [transition]);
  useDidHide(() => transition.hide());
  useDidShow(() => transition.show());
  return { transition, presentation };
}
