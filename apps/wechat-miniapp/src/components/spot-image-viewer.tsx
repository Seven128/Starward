import Taro from "@tarojs/taro";
import { Button, Image, RootPortal, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SemanticIcon } from "./semantic-asset";
import { useAppStore } from "@/state/app-store";
import { REST_FRAME, viewerDragFrame, viewerEndPoint, viewerImageRect, viewerRelease, viewerSourceRect, type ViewerDragFrame, type ViewerGestureAxis, type ViewerRect, type ViewerTouchPoint } from "./spot-image-viewer-gesture";
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

function activeTouchCount(event: unknown): number {
  return (event as { touches?: ArrayLike<unknown> }).touches?.length ?? 0;
}

function readPhotoSource(index: number, callback: (rect: ViewerRect | null) => void) {
  const { windowWidth, windowHeight } = Taro.getWindowInfo();
  let finished = false;
  const finish = (rect: ViewerRect | null) => {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    callback(rect);
  };
  const deadline = setTimeout(() => finish(null), 300);
  try {
    Taro.createSelectorQuery().select(`#spot-media-source-${index}`).boundingClientRect().exec(rows => {
      finish(viewerSourceRect(rows?.[0], windowWidth, windowHeight));
    });
  } catch { finish(null); }
}

type PhotoFlight = { rect: ViewerRect; src: string; moving: boolean; closing: boolean };

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
  const [entered, setEntered] = useState(false);
  const [flight, setFlight] = useState<PhotoFlight | null>(null);
  const [exiting, setExiting] = useState(false);
  const [sourceRect, setSourceRect] = useState<ViewerRect | null | undefined>(undefined);
  const [imageRatio, setImageRatio] = useState<{ id: string; value: number } | null>(null);
  const reducedMotion = useAppStore(state => state.preferences.reducedMotion);
  const start = useRef<ViewerTouchPoint | null>(null);
  const last = useRef<ViewerTouchPoint | null>(null);
  const axis = useRef<ViewerGestureAxis | null>(null);
  const multiTouchBlocked = useRef(false);
  const reboundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flightStartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flightFinishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flightFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closing = useRef(false);
  const openingStarted = useRef(false);
  const firstIndex = useRef(index);
  const closeRef = useRef<() => void>(() => undefined);
  const current = media[index];
  const unavailable = Boolean(current && (current.state === "error" || (current.state === "ready" && !current.src) || decodeFailedId === current.id));

  useEffect(() => {
    void Taro.hideTabBar({ animation: false }).catch(() => undefined);
    return () => { void Taro.showTabBar({ animation: false }).catch(() => undefined); };
  }, []);
  const clearFlightTimers = () => {
    if (flightStartTimer.current !== null) clearTimeout(flightStartTimer.current);
    if (flightFinishTimer.current !== null) clearTimeout(flightFinishTimer.current);
    if (flightFallbackTimer.current !== null) clearTimeout(flightFallbackTimer.current);
    flightStartTimer.current = null;
    flightFinishTimer.current = null;
    flightFallbackTimer.current = null;
  };

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    clearFlightTimers();
    if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
    reboundTimer.current = null;
    start.current = null;
    last.current = null;
    axis.current = null;
    if (reducedMotion) { onClose(); return; }
    readPhotoSource(index, source => {
      const ratio = imageRatio?.id === current?.id ? imageRatio?.value : null;
      if (!source || !current?.src || unavailable || !ratio) {
        setFlight(null);
        setExiting(true);
        flightFinishTimer.current = setTimeout(onClose, 170);
        return;
      }
      const { windowWidth, windowHeight } = Taro.getWindowInfo();
      const from = flight?.rect ?? viewerImageRect(windowWidth, windowHeight, ratio, frame);
      setEntered(false);
      setExiting(true);
      if (!flight) setFlight({ rect: from, src: current.src, moving: false, closing: true });
      flightStartTimer.current = setTimeout(() => {
        setFlight({ rect: source, src: current.src!, moving: true, closing: true });
      }, 24);
      flightFinishTimer.current = setTimeout(onClose, 340);
    });
  };
  const changeIndex = (next: number) => {
    if (!closing.current) onIndexChange(next);
  };
  const cancelTouchGesture = () => {
    start.current = null;
    last.current = null;
    axis.current = null;
    rebound();
  };
  closeRef.current = requestClose;

  useEffect(() => {
    const handler = () => closeRef.current();
    onBackHandlerChange?.(handler);
    return () => onBackHandlerChange?.(null);
  }, [onBackHandlerChange]);
  useEffect(() => {
    if (!reducedMotion) return;
    clearFlightTimers();
    if (closing.current) { onClose(); return; }
    setFlight(null);
    setEntered(true);
  }, [reducedMotion]);
  useEffect(() => {
    if (closing.current) return;
    if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
    setFrame(REST_FRAME);
    setChromeHidden(false);
    setGestureActive(false);
    setDecodeFailedId(null);
    if (firstIndex.current !== index) {
      firstIndex.current = index;
      clearFlightTimers();
      setFlight(null);
      setEntered(true);
      setExiting(false);
      openingStarted.current = true;
    }
  }, [index]);
  useEffect(() => {
    if (reducedMotion) { setEntered(true); return; }
    let active = true;
    Taro.nextTick(() => readPhotoSource(index, source => {
      if (!active) return;
      setSourceRect(source);
    }));
    flightFallbackTimer.current = setTimeout(() => {
      if (!active || openingStarted.current || closing.current) return;
      openingStarted.current = true;
      setEntered(true);
    }, 900);
    return () => {
      active = false;
      clearFlightTimers();
      if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
    };
  }, []);
  useEffect(() => {
    if (sourceRect === undefined || openingStarted.current || closing.current) return;
    const opening = media[index];
    const ratio = imageRatio?.id === opening?.id ? imageRatio?.value : null;
    if (!sourceRect || !opening?.src || opening.state === "error") {
      openingStarted.current = true;
      setEntered(true);
      return;
    }
    if (!ratio) return;
    openingStarted.current = true;
    if (flightFallbackTimer.current !== null) clearTimeout(flightFallbackTimer.current);
    const { windowWidth, windowHeight } = Taro.getWindowInfo();
    setFlight({ rect: sourceRect, src: opening.src, moving: false, closing: false });
    flightStartTimer.current = setTimeout(() => {
      if (closing.current) return;
      setFlight({ rect: viewerImageRect(windowWidth, windowHeight, ratio), src: opening.src!, moving: true, closing: false });
    }, 24);
    flightFinishTimer.current = setTimeout(() => {
      if (closing.current) return;
      setFlight(null);
      setEntered(true);
    }, 340);
  }, [sourceRect, imageRatio, index]);

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

  return <RootPortal><View className={`spot-media-viewer${chromeHidden ? " spot-media-viewer--chrome-hidden" : ""}${gestureActive ? " spot-media-viewer--gesture-active" : ""}${entered ? " spot-media-viewer--entered" : ""}${reducedMotion ? " spot-media-viewer--reduced" : ""}`}
    style={{ "--viewer-backdrop-opacity": String(exiting ? 0 : entered || flight?.moving ? frame.backdrop : 0) } as CSSProperties}
    role="dialog" ariaLabel={`${name}照片查看器，第 ${index + 1} 张，共 ${media.length} 张`} catchMove>
    <Button className="spot-media-viewer__close" ariaLabel="关闭照片查看器" onClick={requestClose}><SemanticIcon name="close" /></Button>
    <View className="spot-media-viewer__content" style={{ "--viewer-drag-x": `${frame.x}px`, "--viewer-drag-y": `${frame.y}px`, "--viewer-scale": String(frame.scale) } as CSSProperties}>
      <View className="spot-media-viewer__stage"
        onTouchStart={(event) => {
          if (closing.current || !entered || !current.src || unavailable) return;
          if (activeTouchCount(event) !== 1) {
            multiTouchBlocked.current = true;
            cancelTouchGesture();
            return;
          }
          if (multiTouchBlocked.current) return;
          if (reboundTimer.current !== null) clearTimeout(reboundTimer.current);
          start.current = touchPoint(event);
          last.current = start.current;
          axis.current = null;
        }}
        onTouchMove={(event) => {
          if (closing.current) return;
          if (multiTouchBlocked.current) return;
          if (activeTouchCount(event) !== 1) {
            multiTouchBlocked.current = true;
            cancelTouchGesture();
            return;
          }
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
          if (closing.current) return;
          if (multiTouchBlocked.current || activeTouchCount(event) > 0) {
            multiTouchBlocked.current = activeTouchCount(event) > 0;
            cancelTouchGesture();
            return;
          }
          const origin = start.current;
          const reported = touchPoint(event, true) ?? touchPoint(event);
          const point = viewerEndPoint(reported, last.current);
          const gesture = axis.current;
          start.current = null; last.current = null; axis.current = null;
          const result = viewerRelease(gesture, origin && point ? point.x - origin.x : 0, origin && point ? point.y - origin.y : 0, index, media.length);
          if (result.kind === "close") { requestClose(); return; }
          if (result.kind === "page") { changeIndex(result.index); return; }
          rebound();
        }}
        onTouchCancel={() => { if (closing.current) return; multiTouchBlocked.current = false; cancelTouchGesture(); }}>
        {current.src && !unavailable
          ? <Image key={`${current.id}:${retryNonce}`} className="spot-media-viewer__image" src={current.src} mode="aspectFit" ariaLabel={current.alt}
              onLoad={(event) => {
                const width = Number(event.detail.width), height = Number(event.detail.height);
                if (width > 0 && height > 0) setImageRatio({ id: current.id, value: width / height });
              }}
              onError={() => {
                if (closing.current) return;
                openingStarted.current = true;
                clearFlightTimers();
                setFlight(null);
                setEntered(true);
                setDecodeFailedId(current.id);
                setChromeHidden(false);
              }} />
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
          ? <Button className="spot-media-viewer__arrow spot-media-viewer__arrow--previous" ariaLabel="上一张照片" onClick={() => changeIndex(index - 1)}>‹</Button>
          : null}
        {index < media.length - 1
          ? <Button className="spot-media-viewer__arrow spot-media-viewer__arrow--next" ariaLabel="下一张照片" onClick={() => changeIndex(index + 1)}>›</Button>
          : null}
      </View>
      <View className="spot-media-viewer__caption"><Text>{current.caption}</Text><Text>{index + 1} / {media.length}{current.attribution ? ` · ${current.attribution}` : ""}</Text></View>
    </View>
    {flight ? <View className={`spot-media-viewer__flight${flight.moving ? " spot-media-viewer__flight--moving" : ""}${flight.closing ? " spot-media-viewer__flight--closing" : ""}`}
      style={{ left: `${flight.rect.left}px`, top: `${flight.rect.top}px`, width: `${flight.rect.width}px`, height: `${flight.rect.height}px` }}>
      <Image className="spot-media-viewer__flight-image" src={flight.src} mode="aspectFill" />
    </View> : null}
  </View></RootPortal>;
}
