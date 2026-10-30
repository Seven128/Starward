import type { TerrainOverlayData, TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { useEffect, useMemo, useRef } from "react";
import { getTerrainOverlay, getTerrainOverlayPreview } from "@/services/api-client";
import { normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity, terrainOverlayRequestWindow } from "@/services/terrain-overlay-request";
import { useResourceQuery } from "./use-resource-query";
import { useRasterImage } from "./use-raster-image";
import { terrainCoverageForRequest, terrainPreviewForRequest, terrainRequestForCoverage, type TerrainCoverage } from "./terrain-overlay-coverage";

function terrainImageDescriptor(data: TerrainOverlayData | null | undefined) {
  const url = data?.imageUrl;
  if (!url) return null;
  const expectedSha256 = data.imageSha256 ?? url.match(/-([a-f0-9]{64})\.png$/u)?.[1];
  return { key: `${data.publicationId ?? ""}:${url}`, url,
    ...(data.imageBytes === undefined ? {} : { expectedBytes: data.imageBytes }),
    ...(expectedSha256 ? { expectedSha256 } : {}) };
}

export function useTerrainOverlay(input: TerrainOverlayRequest, enabled: boolean, imageEnabled = enabled,
  allowPreview: boolean | ((identity: string) => boolean) = true) {
  const coverage = useRef<TerrainCoverage | null>(null);
  input = terrainRequestForCoverage(normalizeTerrainOverlayRequest(input), coverage.current);
  const identity = terrainOverlayRequestIdentity(input);
  const query = useResourceQuery({
    // A closed Map layer must release its own pending reader. Switching the
    // observer, rather than globally cancelling terrain, leaves an independent
    // spot-panel subscriber alive if it still needs the same product.
    queryKey: ["terrain-overlay", enabled ? identity : "inactive"],
    // A same-window pending read or cached revisit may have started at another
    // camera centre. Carry its issued request with the cached response instead
    // of attributing that response to the hook's latest input.
    queryFn: async (signal) => ({ ...await getTerrainOverlay(input, signal), request: input }),
    enabled,
    // A 200 response can contain one failed product and independent valid data.
    // Preserve that data without treating the failure as a day-long success.
    staleTime: value => value?.data.failureCode || value?.data.lightPollution.failureCode ? 0 : 24 * 60 * 60 * 1000,
  });
  if (query.data) coverage.current = terrainCoverageForRequest(query.data.request, query.data.data);
  const recovery = useRef({ identity, attempted: false });
  if (recovery.current.identity !== identity) recovery.current = { identity, attempted: false };
  useEffect(() => {
    if (!enabled || query.isFetching || (!query.data?.data.failureCode && !query.data?.data.lightPollution.failureCode) || recovery.current.attempted) return;
    // One short recovery, matching the query client's single-retry policy.
    const timer = setTimeout(() => { recovery.current.attempted = true; void query.refetch({ cancelRefetch: false }); }, 1000);
    return () => clearTimeout(timer);
  }, [enabled, identity, query.isFetching, query.data?.data.failureCode, query.data?.data.lightPollution.failureCode]);
  const imagesEnabled = enabled && imageEnabled;
  const image = useRasterImage(terrainImageDescriptor(query.data?.data), imagesEnabled);
  const previewRead = useRef<{ identity: string; eligible: boolean } | null>(null);
  if (!imagesEnabled || !terrainOverlayRequestWindow(input)) previewRead.current = null;
  else if (previewRead.current?.identity !== identity) {
    // A fresh complete response, including the layer sheet's existing prefetch,
    // needs only its image. Do not add a speculative second metadata request.
    const freshFine = query.data && !query.isFetching && !query.refreshError && !query.data.data.failureCode;
    previewRead.current = { identity, eligible: !freshFine };
  }
  if (image.imagePath && previewRead.current) previewRead.current.eligible = false;
  // The installation owner rechecks actual retained/queued coverage and native
  // capability. It may revoke an optional read or admit it once a real ack
  // establishes the capability; completed fine imagery never reopens it.
  const previewEnabled = Boolean(previewRead.current?.eligible
    && (typeof allowPreview === "function" ? allowPreview(identity) : allowPreview));
  const previewQuery = useResourceQuery({
    // Retiring this observer cancels a pending optional read on hide, viewport
    // change or fine completion. A late result cannot regain display authority.
    queryKey: ["terrain-overlay-preview", previewEnabled ? identity : "inactive"],
    queryFn: async (signal) => ({ ...await getTerrainOverlayPreview(input, signal), request: input }),
    enabled: previewEnabled,
    staleTime: 60_000,
  });
  const previewData = previewEnabled && previewQuery.data
    ? terrainPreviewForRequest(input, previewQuery.data.data) : null;
  const previewImage = useRasterImage(terrainImageDescriptor(previewData), previewEnabled);
  const candidate = image.imagePath && query.data
    ? { data: query.data.data, imagePath: image.imagePath }
    : previewImage.imagePath && previewData ? { data: previewData, imagePath: previewImage.imagePath } : null;
  return useMemo(() => ({
    ...query,
    ...image,
    identity,
    candidate,
    reportRasterImageFailure: (error: unknown, failedPath: string) => {
      if (failedPath === previewImage.imagePath) previewImage.reportImageFailure(error, failedPath);
      else image.reportImageFailure(error, failedPath);
    },
    retryImage: () => { image.retryImage(); previewImage.retryImage(); },
    refetch: () => {
      image.retryImage();
      previewImage.retryImage();
      return query.refetch();
    },
  }), [image, previewImage, query, identity, candidate]);
}
