import { displayRasterWindowBounds, displayRasterWindowForBounds } from "@starward/coordinate-system";
import type { TerrainBounds, TerrainOverlayData, TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { terrainOverlayRequestWindow } from "../services/terrain-overlay-request";

type CoverageData = Pick<TerrainOverlayData, "purpose" | "state" | "failureCode" | "imageUrl" | "imageBoundsGcj02" | "preview">;
export interface TerrainCoverage {
  request: TerrainOverlayRequest;
  bounds: TerrainBounds;
  level: number;
}
const contains = (outer: TerrainBounds, inner: TerrainBounds) => outer.west <= inner.west && outer.east >= inner.east
  && outer.south <= inner.south && outer.north >= inner.north;

/** Retain only a successful Map publication's actual coverage. Spot requests
 * describe a selected point/radius and must keep their own exact identity. */
export function terrainCoverageForRequest(request: TerrainOverlayRequest, data: CoverageData | undefined): TerrainCoverage | null {
  if (!request.viewportBounds || data?.purpose !== "MAP" || data.state === "UNAVAILABLE" || data.failureCode || data.preview
    || !data.imageUrl || !data.imageBoundsGcj02 || !contains(data.imageBoundsGcj02, request.viewportBounds)) return null;
  try {
    const window = terrainOverlayRequestWindow(request);
    if (!window) return null;
    displayRasterWindowForBounds(data.imageBoundsGcj02);
    return { request: { ...request, center: { ...request.center }, viewportBounds: { ...request.viewportBounds } },
      bounds: { ...data.imageBoundsGcj02 }, level: window.zoom };
  } catch { return null; }
}

/** A temporary parent must describe the whole fine window at its own lower
 * detail. It is never admitted to the complete-image coverage hysteresis. */
export function terrainPreviewForRequest(request: TerrainOverlayRequest, data: TerrainOverlayData | undefined) {
  const window = terrainOverlayRequestWindow(request), preview = data?.preview;
  if (!window || data?.purpose !== "MAP" || data.state === "UNAVAILABLE" || data.failureCode
    || !data.imageUrl || !data.imageBoundsGcj02 || !preview || preview.requestedZoom !== window.zoom
    || !Number.isInteger(preview.imageZoom) || preview.imageZoom < 0 || preview.imageZoom >= window.zoom
    || !Object.values(data.imageBoundsGcj02).every(Number.isFinite)
    || !contains(data.imageBoundsGcj02, displayRasterWindowBounds(window))) return null;
  return data;
}

/** Coverage hysteresis leaves metadata and image readers attached while the
 * existing image still covers the requested buffered view at adequate detail.
 * Its original request/metadata stay intact; no image is moved or stretched. */
export function terrainRequestForCoverage(request: TerrainOverlayRequest, previous: TerrainCoverage | null): TerrainOverlayRequest {
  if (!previous || !request.viewportBounds || !contains(previous.bounds, request.viewportBounds)) return request;
  const window = terrainOverlayRequestWindow(request);
  return window && window.zoom <= previous.level ? previous.request : request;
}
