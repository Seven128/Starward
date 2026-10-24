import Taro from "@tarojs/taro";
import { useEffect, useMemo, useRef, useState } from "react";
import { mapRasterFiles } from "@/services/map-raster-files";
import type { NativeMapRasterOwner } from "./native-map-session";
import { createMapGroundOverlayCoordinator, mapGroundOverlayKey, type MapGroundOverlayTarget,
  type MapGroundOverlayContext, type MapGroundOverlayResult } from "./map-ground-overlay";

interface Bounds { west: number; south: number; east: number; north: number }
interface NativeMapHandle {
  mapId: string; pending: boolean; rastersBlocked: boolean; rasterRetirementMessage: string;
  isCurrent(): boolean; canInstallRasters(): boolean; registerRaster(owner: NativeMapRasterOwner): () => void;
}

/** Keep the rendered source with the actual native installation. A new
 * metadata response or downloaded image cannot advance that source on its own.
 * The two raster consumers retain their independent enabled/failure states.
 */
export function useMapRasterInstallation<T>(input: {
  id: number; label: string; nativeMap: NativeMapHandle; visible: boolean; enabled: boolean; unavailable: boolean;
  identity: string; runtimeError: unknown; retry: number;
  src: string | null; bounds: Bounds | null | undefined; data: T | null; opacity: number; zIndex: number;
  /** A parent may fill an empty surface, or an actual viewport gap through
   * same-id update. It cannot downgrade covering or already queued fine data. */
  preview?: { viewport: Bounds | null } | undefined;
  reportImageFailure(error: unknown, path: string): void;
  onFailure(): void;
}) {
  const { nativeMap, visible, enabled, unavailable, identity, src, bounds, data, opacity, zIndex } = input;
  const [error, setError] = useState<unknown | null>(null);
  const [requiresMapRecovery, setRequiresMapRecovery] = useState(false);
  const [installed, setInstalled] = useState<string | null>(null);
  const [presented, setPresented] = useState<{ mapId: string; key: string; data: T } | null>(null);
  const candidates = useRef(new globalThis.Map<string, T>());
  const retained = useRef<{ mapId: string; target: MapGroundOverlayTarget | null; identity: string | null; previewIdentity: string | null;
    replacement: "compatible" | "same-id-only" }>(
    { mapId: nativeMap.mapId, target: null, identity: null, previewIdentity: null, replacement: "compatible" });
  const resultHandler = useRef<(result: MapGroundOverlayResult) => void>(() => undefined);
  const coordinator = useMemo(() => {
    let context: MapGroundOverlayContext | undefined;
    return createMapGroundOverlayCoordinator(input.id,
      () => context ??= Taro.createMapContext(nativeMap.mapId) as unknown as MapGroundOverlayContext,
      result => { if (nativeMap.isCurrent()) resultHandler.current(result); }, mapRasterFiles, input.label);
  }, [nativeMap.mapId, input.id, input.label]);
  const canReplace = coordinator.canReplace();
  const canPreview = (nextIdentity: string, viewport: Bounds | null) => {
    const previous = retained.current;
    if (!nativeMap.isCurrent()) return false;
    if (previous.mapId !== nativeMap.mapId || !previous.target) return true;
    if (previous.previewIdentity === nextIdentity) return true;
    if (previous.identity === nextIdentity || !coordinator.canReplace() || !viewport
      || !Object.values(viewport).every(Number.isFinite) || viewport.east <= viewport.west || viewport.north <= viewport.south) return false;
    const { southwest, northeast } = previous.target.bounds;
    return southwest.longitude > viewport.west || northeast.longitude < viewport.east
      || southwest.latitude > viewport.south || northeast.latitude < viewport.north;
  };
  useEffect(() => { setError(null); setRequiresMapRecovery(false); }, [identity, nativeMap.mapId]);
  useEffect(() => { if (!visible) { setInstalled(null); setPresented(null); } }, [visible]);
  const target = useMemo(() => {
    if (retained.current.mapId !== nativeMap.mapId) {
      retained.current = { mapId: nativeMap.mapId, target: null, identity: null, previewIdentity: null, replacement: "compatible" }; candidates.current.clear();
    }
    if (!visible || !enabled || unavailable) {
      retained.current.target = null; retained.current.identity = retained.current.previewIdentity = null;
      retained.current.replacement = "compatible"; return null;
    }
    if (!src || !bounds || data === null) return retained.current.target;
    if (input.preview && !canPreview(identity, input.preview.viewport)) return retained.current.target;
    const next: MapGroundOverlayTarget = { src, bounds: {
      southwest: { latitude: bounds.south, longitude: bounds.west }, northeast: { latitude: bounds.north, longitude: bounds.east },
    }, opacity, zIndex };
    const key = mapGroundOverlayKey(next)!;
    const unchanged = mapGroundOverlayKey(retained.current.target) === key && candidates.current.get(key) === data;
    // Keep initial-parent file recovery compatible with older native APIs.
    // A cross-coverage parent and its recovery retain the stricter policy.
    retained.current.replacement = !input.preview || !retained.current.target ? "compatible"
      : retained.current.previewIdentity === identity ? retained.current.replacement : "same-id-only";
    retained.current.target = unchanged ? retained.current.target : next;
    retained.current.identity = identity;
    retained.current.previewIdentity = input.preview ? identity : null;
    candidates.current.set(key, data);
    while (candidates.current.size > 3) candidates.current.delete(candidates.current.keys().next().value!);
    return retained.current.target;
  }, [nativeMap.mapId, visible, enabled, unavailable, src, bounds, data, opacity, zIndex, Boolean(input.preview), input.preview?.viewport, identity, canReplace]);
  const replacement = retained.current.replacement;
  const desiredKey = `${nativeMap.mapId}:${mapGroundOverlayKey(target)}`;
  resultHandler.current = ({ error: failure, target: actual, isCurrent, phase, presentationUnknown, requiresMapRecovery: needsRecovery }) => {
    setError(failure); setRequiresMapRecovery(Boolean(needsRecovery));
    if (presentationUnknown) { setInstalled(null); setPresented(null); }
    if (phase === "pending") return;
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
  const suspension = useRef<{ coordinator: typeof coordinator } | null>(null);
  const latest = useRef({ coordinator, target, replacement, pending: nativeMap.pending, runtimeError: input.runtimeError, visible });
  latest.current = { coordinator, target, replacement, pending: nativeMap.pending, runtimeError: input.runtimeError, visible };
  useEffect(() => {
    const unregister = nativeMap.registerRaster(coordinator);
    return () => {
      if (suspension.current?.coordinator === coordinator) suspension.current = null;
      unregister();
    };
  }, [coordinator]);
  useEffect(() => {
    if (suspension.current?.coordinator === coordinator) return;
    if (!nativeMap.canInstallRasters()) {
      void coordinator.apply(null, "suspend");
      setInstalled(null); setPresented(null); setRequiresMapRecovery(false);
      if (visible && enabled && target) setError(new Error(nativeMap.rasterRetirementMessage));
      return;
    }
    void coordinator.apply(nativeMap.pending || input.runtimeError ? null : target, visible ? "display" : "suspend", replacement);
  }, [coordinator, target, replacement, input.retry, nativeMap.pending, nativeMap.rastersBlocked, input.runtimeError, visible]);
  const suspendForExit = () => {
    const request = { coordinator };
    suspension.current = request;
    // Cancellation may resume before the remove promise resolves. From the
    // first clear attempt onward, only a new installation ack certifies pixels.
    setInstalled(null); setPresented(null);
    const isCurrent = () => suspension.current === request && nativeMap.isCurrent();
    const ready = coordinator.suspend().then(result => {
      if (!isCurrent()) return false;
      if (!result.complete) resultHandler.current({
        error: new Error(`${input.label}尚未清理完成，请重试或重新加载地图`), target: null,
        phase: "cleanup", presentationUnknown: true, requiresMapRecovery: true, isCurrent,
      });
      return result.complete;
    });
    return { ready, isCurrent, resume() {
      if (suspension.current !== request) return;
      suspension.current = null;
      const current = latest.current;
      if (!nativeMap.isCurrent() || current.coordinator !== coordinator) return;
      // React may have received a newer source, visibility or failure while
      // native removal was pending. Resume that intent, never the old capture.
      void coordinator.apply(current.pending || current.runtimeError || !nativeMap.canInstallRasters() ? null : current.target,
        current.visible ? "display" : "suspend", current.replacement);
    } };
  };
  return { error, requiresMapRecovery, target, canPreview, suspendForExit,
    retirementPending: nativeMap.rastersBlocked && enabled && Boolean(target),
    pending: Boolean(target) && installed !== desiredKey,
    presentedData: presented?.mapId === nativeMap.mapId ? presented.data : null };
}
