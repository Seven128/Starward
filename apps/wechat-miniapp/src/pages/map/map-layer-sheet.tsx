import Taro, { useResize } from "@tarojs/taro";
import { ScrollView, View } from "@tarojs/components";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { primaryNavigationLayout } from "@/navigation/primary-navigation";
import "./map-layer-selector.scss";

/** Content owns natural height; the viewport caps it. The compact header keeps
 * layer choices reachable while evidence scrolls. CSS retargets height transitions
 * from the live presentation when content changes during an animation. */
export function MapLayerSheet({ cloud, children, header, revision }: {
  cloud: boolean; children: ReactNode; header: ReactNode; revision: string;
}) {
  const id = `layer-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const [height, setHeight] = useState<number | null>(null);
  const generation = useRef(0);
  const measure = useCallback(() => {
    const request = ++generation.current;
    Taro.nextTick(() => {
      Taro.createSelectorQuery().select(`#${id}-content`).boundingClientRect()
        .select(`#${id}-header`).boundingClientRect()
        .select(".map-app-title").boundingClientRect()
        .select(".map-workspace").boundingClientRect()
        .select(".map-top-tools").boundingClientRect()
        .exec((rows: any[]) => {
          if (request !== generation.current) return;
          const content = rows?.[0]?.height, topContent = rows?.[1]?.height;
          if (!Number.isFinite(content) || !Number.isFinite(topContent)) return;
          let viewport = rows?.[3]?.bottom;
          if (!Number.isFinite(viewport) || viewport <= 0) {
            try {
              const info = Taro.getWindowInfo();
              viewport = primaryNavigationLayout("pages/map/index", info).pageHeight ?? info.windowHeight;
            } catch { return; }
          }
          if (!Number.isFinite(viewport) || viewport <= 0) return;
          const top = Math.max(Number.isFinite(rows?.[2]?.bottom) ? rows[2].bottom : 100,
            Number.isFinite(rows?.[4]?.bottom) ? rows[4].bottom : 0);
          const next = Math.ceil(Math.min(content + topContent + 2, 560, Math.max(0, viewport - top - 12)));
          setHeight(previous => previous === next ? previous : next);
        });
    });
  }, [id]);
  useEffect(() => { measure(); return () => { generation.current++; }; }, [measure, children, header, revision]);
  useResize(measure);
  return <View className={`map-layer-sheet map-layer-sheet--${cloud ? "cloud" : "light"}`}
    style={height === null ? {} : { height: `${height}px` }}
    data-control="map-layer-selector" role="dialog" aria-label="地图图层">
    <View id={`${id}-header`} className="map-layer-sheet__header">{header}</View>
    <ScrollView className="map-layer-sheet__scroll" scrollY enhanced showScrollbar={false}>
      <View id={`${id}-content`} className="map-layer-sheet__content">{children}</View>
    </ScrollView>
  </View>;
}
