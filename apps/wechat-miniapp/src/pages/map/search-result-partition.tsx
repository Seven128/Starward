import Taro, { useResize } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SemanticIcon } from "@/components/semantic-asset";

export function SearchResultPartition({ id, label, count, contentRevision, reducedMotion, children }: {
  id: "wanted" | "other";
  label: string;
  count: number;
  contentRevision: string;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const bodyId = `spot-search-${id}-body`;
  const innerId = `spot-search-${id}-inner`;
  const [expanded, setExpanded] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [displayHeight, setDisplayHeight] = useState<number | null>(null);
  const desiredOpen = useRef(true);
  const measurement = useRef(0);
  const naturalHeight = useRef<number | null>(null);
  const currentHeight = useRef<number | null>(null);
  const frameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHeight = (height: number) => {
    currentHeight.current = height;
    setDisplayHeight(height);
  };

  const stopMotion = () => {
    if (frameTimer.current) clearTimeout(frameTimer.current);
    frameTimer.current = null;
  };

  const measure = useCallback(() => {
    const request = ++measurement.current;
    Taro.nextTick(() => {
      Taro.createSelectorQuery().select(`#${innerId}`).boundingClientRect().exec((rows) => {
        if (request !== measurement.current) return;
        const height = rows?.[0]?.height;
        if (typeof height !== "number" || !Number.isFinite(height)) return;
        naturalHeight.current = height;
        if (!frameTimer.current && desiredOpen.current && currentHeight.current !== height) setHeight(height);
      });
    });
  }, [innerId]);

  useEffect(() => { measure(); return () => { measurement.current++; }; }, [measure, contentRevision]);
  useResize(measure);
  useEffect(() => () => { stopMotion(); }, []);
  useEffect(() => {
    if (!reducedMotion || !frameTimer.current) return;
    stopMotion();
    setHeight(desiredOpen.current ? naturalHeight.current ?? 0 : 0);
    setHidden(!desiredOpen.current);
  }, [reducedMotion]);

  const toggle = () => {
    const next = !desiredOpen.current;
    desiredOpen.current = next;
    stopMotion();
    setHidden(false);
    setExpanded(next);
    const target = next ? naturalHeight.current ?? 0 : 0;
    if (reducedMotion || naturalHeight.current === null) {
      setHeight(target);
      setHidden(!next);
      return;
    }
    const from = currentHeight.current ?? naturalHeight.current;
    const startedAt = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / 160);
      const ease = 1 - Math.pow(1 - progress, 3);
      setHeight(from + (target - from) * ease);
      if (progress < 1) frameTimer.current = setTimeout(tick, 16);
      else {
        frameTimer.current = null;
        if (next) setHeight(naturalHeight.current ?? target);
        setHidden(!next);
      }
    };
    frameTimer.current = setTimeout(tick, 16);
  };

  return <View className="spot-search-partition">
    <Button className="spot-search-partition__toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={toggle}>
      <Text className="type-section">{label}</Text>
      <Text className="type-caption">{count}</Text>
      <SemanticIcon name={expanded ? "chevron-up" : "chevron-down"} />
    </Button>
    <View id={bodyId}
      className={`spot-search-partition__body${hidden ? " spot-search-partition__body--closed" : ""}`}
      aria-hidden={hidden}
      style={{ height: displayHeight === null ? "auto" : `${displayHeight}px`, opacity: naturalHeight.current ? (displayHeight ?? naturalHeight.current) / naturalHeight.current : expanded ? 1 : 0 }}>
      <View id={innerId} className="spot-search-partition__inner">{children}</View>
    </View>
  </View>;
}
