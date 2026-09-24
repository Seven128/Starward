import Taro from "@tarojs/taro";
import { useEffect } from "react";

/** WEAPP can leave the enhanced node scrollbar enabled despite showScrollbar={false}. */
export function useHiddenNativeScrollbar(id: string, active: boolean, identity: string) {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const apply = (attempt: number) => {
      Taro.createSelectorQuery().select(`#${id}`).node().exec(rows => {
        if (cancelled) return;
        const node = rows?.[0]?.node as { showScrollbar?: boolean } | undefined;
        if (node) node.showScrollbar = false;
        else if (attempt === 0) retry = setTimeout(() => apply(1), 80);
      });
    };
    Taro.nextTick(() => { if (!cancelled) apply(0); });
    return () => { cancelled = true; if (retry !== null) clearTimeout(retry); };
  }, [id, active, identity]);
}
