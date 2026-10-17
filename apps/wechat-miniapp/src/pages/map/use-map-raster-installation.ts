import Taro from "@tarojs/taro";
import { useEffect, useMemo, useRef, useState } from "react";
import { mapRasterFiles } from "@/services/map-raster-files";
import { createMapGroundOverlayCoordinator, mapGroundOverlayKey, type MapGroundOverlayTarget,
  type MapGroundOverlayContext, type MapGroundOverlayResult } from "./map-ground-overlay";

interface Bounds { west: number; south: number; east: number; north: number }
interface NativeMapHandle { mapId: string; pending: boolean; isCurrent(): boolean }

/** Keep the rendered source with the actual native installation. A new
 * metadata response or downloaded image cannot advance that source on its own.
 * The two raster consumers retain their independent enabled/failure states.
 */
export function useMapRasterInstallation<T>(input: {
  id: number; label: string; nativeMap: NativeMapHandle; visible: boolean; enabled: boolean; unavailable: boolean;
  identity: string; runtimeError: unknown; retry: number;
  src: string | null; bounds: Bounds | null | undefined; data: T | null; opacity: number; zIndex: number;
  reportImageFailure(error: unknown, path: string): void;
  onFailure(): void;
}) {
  const { nativeMap, visible, enabled, unavailable, identity, src, bounds, data, opacity, zIndex } = input;
  const [error, setError] = useState<unknown | null>(null);
  const [requiresMapRecovery, setRequiresMapRecovery] = useState(false);
  const [installed, setInstalled] = useState<string | null>(null);
  const [presented, setPresented] = useState<{ mapId: string; key: string; data: T } | null>(null);
  const candidates = useRef(new globalThis.Map<string, T>());
  const retained = useRef<{ mapId: string; target: MapGroundOverlayTarget | null }>({ mapId: nativeMap.mapId, target: null });
  useEffect(() => { setError(null); setRequiresMapRecovery(false); }, [identity, nativeMap.mapId]);
  useEffect(() => { if (!visible) { setInstalled(null); setPresented(null); } }, [visible]);
  const target = useMemo(() => {
    if (retained.current.mapId !== nativeMap.mapId) {
      retained.current = { mapId: nativeMap.mapId, target: null }; candidates.current.clear();
    }
    if (!visible || !enabled || unavailable) { retained.current.target = null; return null; }
    if (!src || !bounds || data === null) return retained.current.target;
    const next: MapGroundOverlayTarget = { src, bounds: {
      southwest: { latitude: bounds.south, longitude: bounds.west }, northeast: { latitude: bounds.north, longitude: bounds.east },
    }, opacity, zIndex };
    retained.current.target = next;
    candidates.current.set(mapGroundOverlayKey(next)!, data);
    while (candidates.current.size > 3) candidates.current.delete(candidates.current.keys().next().value!);
    return next;
  }, [nativeMap.mapId, visible, enabled, unavailable, src, bounds, data, opacity, zIndex]);
  const desiredKey = `${nativeMap.mapId}:${mapGroundOverlayKey(target)}`;
  const resultHandler = useRef<(result: MapGroundOverlayResult) => void>(() => undefined);
  resultHandler.current = ({ error: failure, target: actual, isCurrent, phase, requiresMapRecovery: needsRecovery }) => {
    setError(failure); setRequiresMapRecovery(Boolean(needsRecovery));
    if (!failure) {
      const key = mapGroundOverlayKey(actual);
      setInstalled(`${nativeMap.mapId}:${key}`);
      const actualData = key ? candidates.current.get(key) : null;
      if (!actual) setPresented(null);
      else if (actualData) setPresented({ mapId: nativeMap.mapId, key: key!, data: actualData });
      return;
    }
    if (actual && phase !== "cleanup") void Taro.getImageInfo({ src: actual.src }).catch(imageError => {
      if (nativeMap.isCurrent() && isCurrent()) input.reportImageFailure(imageError, actual.src);
    });
    input.onFailure();
  };
  const coordinator = useMemo(() => {
    let context: MapGroundOverlayContext | undefined;
    return createMapGroundOverlayCoordinator(input.id,
      () => context ??= Taro.createMapContext(nativeMap.mapId) as unknown as MapGroundOverlayContext,
      result => { if (nativeMap.isCurrent()) resultHandler.current(result); }, mapRasterFiles, input.label);
  }, [nativeMap.mapId, input.id, input.label]);
  useEffect(() => {
    void coordinator.apply(nativeMap.pending || input.runtimeError ? null : target, visible ? "display" : "suspend");
  }, [coordinator, target, input.retry, nativeMap.pending, input.runtimeError, visible]);
  useEffect(() => () => { void coordinator.dispose(); }, [coordinator]);
  return { error, requiresMapRecovery, target,
    pending: Boolean(target) && installed !== desiredKey,
    presentedData: presented?.mapId === nativeMap.mapId ? presented.data : null };
}
