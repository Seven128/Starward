import Taro from "@tarojs/taro";
import { Button, Image, RootPortal, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SemanticIcon } from "./semantic-asset";
import "./spot-image-viewer.scss";

export type SpotViewerMedia = {
  id: string;
  src?: string;
  alt: string;
  caption: string;
  attribution?: string;
  state?: "loading" | "error" | "ready";
};

type TouchPoint = { x: number; y: number };

function touchPoint(event: unknown, changed = false): TouchPoint | null {
  const value = event as { touches?: ArrayLike<{ clientX?: number; clientY?: number }>; changedTouches?: ArrayLike<{ clientX?: number; clientY?: number }> };
  const touch = (changed ? value.changedTouches : value.touches)?.[0];
  return Number.isFinite(touch?.clientX) && Number.isFinite(touch?.clientY)
    ? { x: touch!.clientX!, y: touch!.clientY! }
    : null;
}

export function SpotImageViewer({ name, media, index, onIndexChange, onClose, onRetry, onBackHandlerChange }: {
  name: string;
  media: readonly SpotViewerMedia[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onRetry?: (index: number) => void;
  onBackHandlerChange?: (handler: (() => void) | null) => void;
}) {
  const [dragY, setDragY] = useState(0);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [decodeFailedId, setDecodeFailedId] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const start = useRef<TouchPoint | null>(null);
  const axis = useRef<"horizontal" | "vertical" | null>(null);
  const current = media[index];
  const unavailable = Boolean(current && (current.state === "error" || (current.state === "ready" && !current.src) || decodeFailedId === current.id));

  useEffect(() => {
    void Taro.hideTabBar({ animation: false }).catch(() => undefined);
    return () => { void Taro.showTabBar({ animation: false }).catch(() => undefined); };
  }, []);
  useEffect(() => {
    onBackHandlerChange?.(onClose);
    return () => onBackHandlerChange?.(null);
  }, [onBackHandlerChange, onClose]);
  useEffect(() => {
    setDragY(0);
    setChromeHidden(false);
    setDecodeFailedId(null);
  }, [index]);

  if (!current) return null;

  return <RootPortal><View className={`spot-media-viewer${chromeHidden ? " spot-media-viewer--dragging" : ""}`}
    style={{ "--viewer-backdrop-opacity": String(Math.max(.35, 1 - Math.max(0, dragY) / 450)) } as CSSProperties}
    role="dialog" ariaLabel={`${name}照片查看器，第 ${index + 1} 张，共 ${media.length} 张`} catchMove>
    <Button className="spot-media-viewer__close" ariaLabel="关闭照片查看器" onClick={onClose}><SemanticIcon name="close" /></Button>
    <View className="spot-media-viewer__content" style={{ "--viewer-drag-y": `${dragY}px`, "--viewer-scale": String(Math.max(0.86, 1 - Math.abs(dragY) / 900)) } as CSSProperties}>
      <View className="spot-media-viewer__stage"
    onTouchStart={(event) => { start.current = touchPoint(event); axis.current = null; setDragY(0); }}
    onTouchMove={(event) => {
      const origin = start.current, point = touchPoint(event);
      if (!origin || !point) return;
      const dx = point.x - origin.x, dy = point.y - origin.y;
      if (!axis.current && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (!axis.current) return;
      setChromeHidden(true);
      if (axis.current === "vertical") setDragY(Math.max(-180, Math.min(180, dy)));
    }}
    onTouchEnd={(event) => {
      const origin = start.current, point = touchPoint(event, true), gesture = axis.current;
      start.current = null; axis.current = null;
      if (origin && point && gesture === "vertical" && point.y - origin.y >= 88) { onClose(); return; }
      if (origin && point && gesture === "horizontal") {
        const delta = point.x - origin.x;
        if (delta <= -60 && index < media.length - 1) onIndexChange(index + 1);
        if (delta >= 60 && index > 0) onIndexChange(index - 1);
      }
      setDragY(0);
      setChromeHidden(false);
    }}
    onTouchCancel={() => { start.current = null; axis.current = null; setDragY(0); setChromeHidden(false); }}>
        {current.src && !unavailable
          ? <Image key={`${current.id}:${retryNonce}`} className="spot-media-viewer__image" src={current.src} mode="aspectFit" ariaLabel={current.alt}
              onError={() => { setDecodeFailedId(current.id); setChromeHidden(false); }} />
          : <View className="spot-media-viewer__unavailable">
            <Text>{unavailable ? "照片暂时无法读取" : "正在读取照片…"}</Text>
            {unavailable
              ? <Button className="spot-media-viewer__retry" onClick={() => {
                setDecodeFailedId(null);
                setRetryNonce(value => value + 1);
                onRetry?.(index);
              }}>重试照片</Button> : null}
          </View>}
        {index > 0
          ? <Button className="spot-media-viewer__arrow spot-media-viewer__arrow--previous" ariaLabel="上一张照片" onClick={() => onIndexChange(index - 1)}>‹</Button>
          : null}
        {index < media.length - 1
          ? <Button className="spot-media-viewer__arrow spot-media-viewer__arrow--next" ariaLabel="下一张照片" onClick={() => onIndexChange(index + 1)}>›</Button>
          : null}
      </View>
      <View className="spot-media-viewer__caption"><Text>{current.caption}</Text><Text>{index + 1} / {media.length}{current.attribution ? ` · ${current.attribution}` : ""}</Text></View>
    </View>
  </View></RootPortal>;
}
