import Taro from "@tarojs/taro";
import { Button, Image, RootPortal, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SemanticIcon } from "./semantic-asset";
import { REST_FRAME, viewerDragFrame, viewerEndPoint, viewerRelease, type ViewerDragFrame, type ViewerGestureAxis, type ViewerTouchPoint } from "./spot-image-viewer-gesture";
import "./spot-image-viewer.scss";

export type SpotViewerMedia = {
  id: string;
  src?: string;
  alt: string;
  caption: string;
  attribution?: string;
  state?: "loading" | "error" | "ready";
};

function touchPoint(event: unknown, changed = false): ViewerTouchPoint | null {
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
  const [frame, setFrame] = useState<ViewerDragFrame>(REST_FRAME);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);
  const [decodeFailedId, setDecodeFailedId] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const start = useRef<ViewerTouchPoint | null>(null);
  const last = useRef<ViewerTouchPoint | null>(null);
  const axis = useRef<ViewerGestureAxis | null>(null);
  const reboundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
    setFrame(REST_FRAME);
    setChromeHidden(false);
    setGestureActive(false);
    setDecodeFailedId(null);
  }, [index]);
  useEffect(() => () => { if (reboundTimer.current !== null) clearTimeout(reboundTimer.current); }, []);

  const rebound = () => {
    setGestureActive(false);
    setFrame(REST_FRAME);
    if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
    reboundTimer.current = setTimeout(() => {
      reboundTimer.current = null;
      setChromeHidden(false);
    }, 170);
  };

  if (!current) return null;

  return <RootPortal><View className={`spot-media-viewer${chromeHidden ? " spot-media-viewer--chrome-hidden" : ""}${gestureActive ? " spot-media-viewer--gesture-active" : ""}`}
    style={{ "--viewer-backdrop-opacity": String(frame.backdrop) } as CSSProperties}
    role="dialog" ariaLabel={`${name}照片查看器，第 ${index + 1} 张，共 ${media.length} 张`} catchMove>
    <Button className="spot-media-viewer__close" ariaLabel="关闭照片查看器" onClick={onClose}><SemanticIcon name="close" /></Button>
    <View className="spot-media-viewer__content" style={{ "--viewer-drag-x": `${frame.x}px`, "--viewer-drag-y": `${frame.y}px`, "--viewer-scale": String(frame.scale) } as CSSProperties}>
      <View className="spot-media-viewer__stage"
        onTouchStart={(event) => {
          if (!current.src || unavailable) return;
          if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
          start.current = touchPoint(event);
          last.current = start.current;
          axis.current = null;
        }}
        onTouchMove={(event) => {
          const origin = start.current, point = touchPoint(event);
          if (!origin || !point) return;
          last.current = point;
          const dx = point.x - origin.x, dy = point.y - origin.y;
          if (!axis.current && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
          if (!axis.current) return;
          setGestureActive(true);
          setChromeHidden(true);
          setFrame(viewerDragFrame(axis.current, dx, dy, index, media.length));
        }}
        onTouchEnd={(event) => {
          const origin = start.current;
          const reported = touchPoint(event, true) ?? touchPoint(event);
          const point = viewerEndPoint(reported, last.current);
          const gesture = axis.current;
          start.current = null; last.current = null; axis.current = null;
          const result = viewerRelease(gesture, origin && point ? point.x - origin.x : 0, origin && point ? point.y - origin.y : 0, index, media.length);
          if (result.kind === "close") { onClose(); return; }
          if (result.kind === "page") { onIndexChange(result.index); return; }
          rebound();
        }}
        onTouchCancel={() => { start.current = null; last.current = null; axis.current = null; rebound(); }}>
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
