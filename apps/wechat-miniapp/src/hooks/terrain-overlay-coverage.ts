import { displayRasterWindowForBounds } from "@starward/coordinate-system";
import type { TerrainBounds, TerrainOverlayData, TerrainOverlayRequest } from "@starward/miniapp-contracts";

type CoverageData = Pick<TerrainOverlayData, "purpose" | "state" | "failureCode" | "imageUrl" | "imageBoundsGcj02">;
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
  if (!request.viewportBounds || data?.purpose !== "MAP" || data.state === "UNAVAILABLE" || data.failureCode
    || !data.imageUrl || !data.imageBoundsGcj02 || !contains(data.imageBoundsGcj02, request.viewportBounds)) return null;
  try {
    displayRasterWindowForBounds(data.imageBoundsGcj02);
    return { request: { ...request, center: { ...request.center }, viewportBounds: { ...request.viewportBounds } },
      bounds: { ...data.imageBoundsGcj02 }, level: displayRasterWindowForBounds(request.viewportBounds).zoom };
  } catch { return null; }
}

/** Coverage hysteresis leaves metadata and image readers attached while the
 * existing image still covers the requested buffered view at adequate detail.
 * Its original request/metadata stay intact; no image is moved or stretched. */
export function terrainRequestForCoverage(request: TerrainOverlayRequest, previous: TerrainCoverage | null): TerrainOverlayRequest {
  if (!previous || !request.viewportBounds || !contains(previous.bounds, request.viewportBounds)) return request;
  try {
    return displayRasterWindowForBounds(request.viewportBounds).zoom <= previous.level ? previous.request : request;
  } catch { return request; }
}
