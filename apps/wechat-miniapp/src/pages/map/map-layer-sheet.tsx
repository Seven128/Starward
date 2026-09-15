import Taro, { useResize } from "@tarojs/taro";
import { ScrollView, View } from "@tarojs/components";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Content owns natural height; the viewport caps it. Footer actions keep their
 * position while the evidence above scrolls. CSS retargets height transitions
 * from the live presentation when content changes during an animation. */
export function MapLayerSheet({ cloud, children, footer, revision }: {
  cloud: boolean; children: ReactNode; footer: ReactNode; revision: string;
}) {
  const id = `layer-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const [height, setHeight] = useState<number | null>(null);
  const generation = useRef(0);
  const measure = useCallback(() => {
    const request = ++generation.current;
    Taro.nextTick(() => {
      Taro.createSelectorQuery().select(`#${id}-content`).boundingClientRect()
        .select(`#${id}-footer`).boundingClientRect()
        .select(".map-search-anchor").boundingClientRect()
        .exec((rows: any[]) => {
          if (request !== generation.current) return;
          const content = rows?.[0]?.height, bottom = rows?.[1]?.height;
          if (!Number.isFinite(content) || !Number.isFinite(bottom)) return;
          const viewport = Taro.getWindowInfo().windowHeight;
          const top = Number.isFinite(rows?.[2]?.bottom) ? rows[2].bottom : 100;
          const next = Math.ceil(Math.min(content + bottom + 2, 560, Math.max(0, viewport - top - 12)));
          setHeight(previous => previous === next ? previous : next);
        });
    });
  }, [id]);
  useEffect(() => { measure(); return () => { generation.current++; }; }, [measure, children, footer, revision]);
  useResize(measure);
  return <View className={`map-layer-sheet map-layer-sheet--${cloud ? "cloud" : "light"}`}
    style={height === null ? {} : { height: `${height}px` }}
    data-control="map-layer-selector" role="dialog" aria-label="地图图层">
    <ScrollView className="map-layer-sheet__scroll" scrollY enhanced showScrollbar={false}>
      <View id={`${id}-content`} className="map-layer-sheet__content">{children}</View>
    </ScrollView>
    <View id={`${id}-footer`} className="map-layer-sheet__footer">{footer}</View>
  </View>;
}
