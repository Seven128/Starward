import { useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import { cameraCenterForNativeMapTarget, spotNeighborhoodGroundRange, type MapCameraPoint, type MapFocusFrame } from "./map-camera";
import type { TerrainBounds } from "./terrain-geometry";

type Camera = { center: MapCameraPoint; zoom: number; loadedViewport: string };
type Request = { version: number; identity: string; scope: string; point: MapCameraPoint; camera: string;
  presented: boolean; rangeAdjustments: number; projection: AbortController | null };
export type MeasuredSpotFocusFrame = MapFocusFrame & { version: number; layout: string };
type Input = {
  mapId: string; identity: string; scope: string; layout: string; visible: boolean; presentationReady: boolean; contentReady: boolean;
  interacting: boolean; isCurrent(): boolean; getCamera(): Camera; getScope(): string; getSelectionIdentity(): string;
  frame: MeasuredSpotFocusFrame | null; bounds: TerrainBounds | null; viewportError: Error | null;
  move(center: MapCameraPoint, zoom?: number): void; onFailure(): void;
};
const cameraKey = (camera: Camera) => JSON.stringify([camera.center, camera.zoom, camera.loadedViewport]);

/** Formal/private selections and editor addresses share one native camera intent.
 * Data refreshes never request another move. */
export function useMapSpotFocus(input: Input) {
  const current = useRef(input); current.current = input;
  const alive = useRef(true);
  const request = useRef<Request | null>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [version, setVersion] = useState(0);
  const cancel = () => {
    const previous = request.current; request.current = null;
    clearTimeout(timer.current); previous?.projection?.abort();
  };
  const owned = (value: Request) => {
    const live = current.current;
    return alive.current && request.current === value && live.isCurrent() && live.visible && live.presentationReady
      && live.identity === value.identity && live.getSelectionIdentity() === value.identity && live.getScope() === value.scope
      && cameraKey(live.getCamera()) === value.camera;
  };
  const fail = (value: Request) => {
    if (request.current !== value) return;
    const active = owned(value); cancel(); if (active) current.current.onFailure();
  };
  const begin = (identity: string, point: MapCameraPoint) => {
    if (!alive.current || !current.current.isCurrent()) return;
    cancel();
    const live = current.current;
    const value: Request = { version: ++sequence.current, identity, scope: live.getScope(), point: { ...point },
      camera: cameraKey(live.getCamera()), presented: false, rangeAdjustments: 0, projection: null };
    request.current = value;
    timer.current = setTimeout(() => { if (request.current === value) fail(value); }, 10000);
    setVersion(value.version);
  };
  useEffect(() => {
    const value = request.current;
    if (!value) return;
    if (!input.isCurrent() || (!input.visible && value.presented) || input.getScope() !== value.scope
      || cameraKey(input.getCamera()) !== value.camera) { cancel(); return; }
    if (!input.visible || !input.presentationReady || input.identity !== value.identity) {
      if (value.presented) cancel();
      return;
    }
    value.presented = true;
    if (!input.contentReady || input.interacting || input.viewportError) return;
    const frame = input.frame;
    if (!input.bounds || !frame || frame.version !== value.version || frame.layout !== input.layout || value.projection) return;
    try {
      const camera = input.getCamera(), range = spotNeighborhoodGroundRange(input.bounds, frame, camera.zoom);
      if (range.zoom !== camera.zoom) {
        if (value.rangeAdjustments >= 2) { fail(value); return; }
        value.rangeAdjustments++;
        // This synchronous write belongs to the current intent. Its next
        // getRegion/getScale result must establish the new actual range before
        // native projection can commit the remaining-map centre.
        input.move(value.point, range.zoom);
        value.camera = cameraKey(input.getCamera());
        return;
      }
    } catch { fail(value); return; }
    const controller = new AbortController(), layout = input.layout, bounds = JSON.stringify(input.bounds);
    value.projection = controller;
    try {
      void cameraCenterForNativeMapTarget(value.point, input.bounds, frame, Taro.createMapContext(input.mapId), controller.signal)
        .then(center => {
          if (controller.signal.aborted || value.projection !== controller) return;
          if (!owned(value)) { if (request.current === value) cancel(); return; }
          // A new layout can render before this effect's cleanup. Leave the
          // intent alive for that cleanup and its fresh measured projection.
          if (current.current.layout !== layout || !current.current.contentReady || current.current.interacting || JSON.stringify(current.current.bounds) !== bounds) return;
          cancel(); current.current.move(center);
        }, () => { if (!controller.signal.aborted && value.projection === controller) fail(value); });
    } catch { fail(value); }
    return () => {
      controller.abort();
      if (value.projection === controller) value.projection = null;
    };
  }, [version, input.identity, input.scope, input.layout, input.visible, input.presentationReady, input.contentReady, input.interacting,
    input.frame, input.bounds, input.viewportError, input.mapId]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancel(); }; }, []);
  return { begin, cancel, version };
}
