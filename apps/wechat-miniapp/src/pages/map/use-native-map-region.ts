import { useCallback, useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { mapBoundsForNativeRegion, type TerrainBounds } from "./terrain-geometry";

type Camera = { center: { latitude: number; longitude: number }; zoom: number; loadedViewport: string };

/** One actual native-region owner for terrain buffering and weather sampling.
 * It preserves the existing bounded read/settlement race and Map generations. */
export function useNativeMapRegion(nativeMap: { mapId: string; isCurrent(): boolean }, enabled: boolean,
  viewport: Camera, layoutVersion: number, pageHeight: number | undefined, expectedScale: number | null = null) {
  const keyFor = useCallback((camera: Camera) => JSON.stringify([nativeMap.mapId, camera.center, camera.zoom,
    camera.loadedViewport, layoutVersion, pageHeight, expectedScale]), [nativeMap.mapId, layoutVersion, pageHeight, expectedScale]);
  const cameraKey = keyFor(viewport);
  const scope = useRef("");
  scope.current = enabled ? cameraKey : "";
  const [measured, setMeasured] = useState<{ camera: string; bounds: TerrainBounds } | null>(null);
  const [failure, setFailure] = useState<{ camera: string; error: Error } | null>(null);
  const pending = useRef<{ camera: string; pending: boolean; waitingForScale: boolean; success: boolean; reread: boolean; attempts: number;
    timer: ReturnType<typeof setTimeout> | undefined } | null>(null);
  const readNativeViewport = useCallback(function readCurrentViewport(force = false) {
    if (!enabled || !nativeMap.isCurrent()) return;
    const camera = useAppStore.getState().viewport, key = keyFor(camera);
    if (scope.current !== key) return;
    const previous = pending.current;
    if (previous?.camera === key && previous.pending) { if (force) previous.reread = true; return; }
    if (previous?.camera === key && !force && (previous.success || previous.attempts >= 2)) return;
    clearTimeout(previous?.timer);
    const owned = { camera: key, pending: true, waitingForScale: false, success: false, reread: false, attempts: previous?.camera === key ? previous.attempts + 1 : 1,
      timer: undefined as ReturnType<typeof setTimeout> | undefined };
    pending.current = owned;
    const current = () => pending.current === owned && scope.current === key && nativeMap.isCurrent()
      && keyFor(useAppStore.getState().viewport) === key;
    const rereadAfterSettle = () => {
      if (!owned.reread) return false;
      owned.pending = false; owned.waitingForScale = false; clearTimeout(owned.timer); readCurrentViewport(true); return true;
    };
    const fail = () => {
      if (!current() || (!owned.pending && !owned.waitingForScale) || rereadAfterSettle()) return;
      owned.pending = false; owned.waitingForScale = false; clearTimeout(owned.timer);
      setFailure({ camera: key, error: new Error("地图范围未能读取，请重新加载地图") });
    };
    const success = (actual: unknown) => {
      if (!current() || !owned.pending || rereadAfterSettle()) return;
      const bounds = mapBoundsForNativeRegion(actual);
      if (!bounds || camera.center.longitude < bounds.west || camera.center.longitude > bounds.east
        || camera.center.latitude < bounds.south || camera.center.latitude > bounds.north) { fail(); return; }
      owned.pending = false; owned.success = true; clearTimeout(owned.timer);
      setFailure(null); setMeasured({ camera: key, bounds });
    };
    setFailure(null);
    owned.timer = setTimeout(fail, 10000);
    try {
      const context = Taro.createMapContext(nativeMap.mapId);
      const readRegion = () => {
        try {
          const reading = context.getRegion({ success, fail });
          if (reading && typeof reading.then === "function") void reading.then(success, fail);
        } catch { fail(); }
      };
      if (expectedScale === null) readRegion();
      else {
        let scaleResolved = false;
        const scaleFailure = () => { if (!scaleResolved) { scaleResolved = true; fail(); } };
        const scaleSuccess = (actual: unknown) => {
          if (scaleResolved || !current() || !owned.pending || rereadAfterSettle()) return;
          scaleResolved = true;
          const scale = actual && typeof actual === "object" ? (actual as { scale?: unknown }).scale : undefined;
          if (typeof scale !== "number" || !Number.isFinite(scale) || scale < 3 || scale > 20) { fail(); return; }
          if (scale !== expectedScale) {
            // An old zoom can be lower or higher than the requested camera.
            // Wait for native settlement within the same bounded deadline.
            owned.pending = false; owned.waitingForScale = true; return;
          }
          readRegion();
        };
        try {
          const reading = context.getScale({ success: scaleSuccess, fail: scaleFailure });
          if (reading && typeof reading.then === "function") void reading.then(scaleSuccess, scaleFailure);
        } catch { scaleFailure(); }
      }
    } catch { fail(); }
  }, [enabled, nativeMap.mapId, keyFor, expectedScale]);
  useEffect(() => {
    readNativeViewport();
    return () => { clearTimeout(pending.current?.timer); pending.current = null; };
  }, [cameraKey, readNativeViewport]);
  const mapNativeBounds = measured?.camera === cameraKey && enabled ? measured.bounds : null;
  const error = failure?.camera === cameraKey && enabled ? failure.error : null;
  return { bounds: mapNativeBounds, error, read: readNativeViewport };
}
