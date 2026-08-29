import Taro, { useDidShow, useResize } from "@tarojs/taro";
import { useEffect, useState, type CSSProperties } from "react";
import { nativeNavigationInsets } from "@/theme/native-metrics";

/** Only layout metrics: never reads position, account state or map content. */
export function useMapChrome(layoutKey: string): CSSProperties {
  const [revision, setRevision] = useState(0);
  const [style, setStyle] = useState<CSSProperties>({});
  useDidShow(() => setRevision((value) => value + 1));
  useResize(() => setRevision((value) => value + 1));
  useEffect(() => {
    let current = true;
    const { safeTop } = nativeNavigationInsets();
    let unit: number | undefined;
    try {
      const width = Taro.getWindowInfo().windowWidth;
      if (Number.isFinite(width) && width > 0) unit = width / 750;
    } catch { /* Missing native geometry retains the CSS first-frame fallback. */ }
    const positions = (finderHeight?: number, conditionsHeight?: number): CSSProperties => {
      if (safeTop === undefined || unit === undefined) return {};
      const finderTop = safeTop + 16 * unit;
      const conditionsTop = finderTop + (finderHeight ?? 184 * unit) + 24 * unit;
      return {
        "--map-finder-top": `${finderTop}px`,
        "--map-conditions-top": `${conditionsTop}px`,
        "--map-chrome-bottom": `${conditionsTop + (conditionsHeight ?? 88 * unit) + 16 * unit}px`,
      } as CSSProperties;
    };
    // Emit flat px values: nested calc()/var() is unreliable in WEAPP WXSS.
    setStyle(positions());
    Taro.nextTick(() => {
      if (!current) return;
      try {
        const query = Taro.createSelectorQuery();
        query.select(".map-finder-anchor").boundingClientRect();
        query.select(".map-conditions-anchor").boundingClientRect();
        query.exec((rects) => {
          if (!current) return;
          const heights = [0, 1].map((index) => {
            const height = rects?.[index]?.height;
            return typeof height === "number" && Number.isFinite(height) && height > 0
              ? height : undefined;
          });
          setStyle(positions(heights[0], heights[1]));
        });
      } catch { /* Unsupported measurement keeps the native first-frame layout. */ }
    });
    return () => { current = false; };
  }, [layoutKey, revision]);
  return style;
}
