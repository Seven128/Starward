import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { useEffect, useMemo, useRef } from "react";
import { getTerrainOverlay } from "@/services/api-client";
import { normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity } from "@/services/terrain-overlay-request";
import { useResourceQuery } from "./use-resource-query";
import { useRasterImage } from "./use-raster-image";
import { terrainCoverageForRequest, terrainRequestForCoverage, type TerrainCoverage } from "./terrain-overlay-coverage";

export function useTerrainOverlay(input: TerrainOverlayRequest, enabled: boolean, imageEnabled = enabled) {
  const coverage = useRef<TerrainCoverage | null>(null);
  input = terrainRequestForCoverage(normalizeTerrainOverlayRequest(input), coverage.current);
  const identity = terrainOverlayRequestIdentity(input);
  const query = useResourceQuery({
    queryKey: ["terrain-overlay", identity],
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
  const imageUrl = query.data?.data.imageUrl ?? null;
  const imageKey = imageUrl ? `${query.data?.data.publicationId ?? ""}:${imageUrl}` : "";
  const imageBytes = query.data?.data.imageBytes;
  const imageSha256 = query.data?.data.imageSha256 ?? imageUrl?.match(/-([a-f0-9]{64})\.png$/u)?.[1];
  const image = useRasterImage(imageUrl ? { key: imageKey, url: imageUrl,
    ...(imageBytes === undefined ? {} : { expectedBytes: imageBytes }),
    ...(imageSha256 ? { expectedSha256: imageSha256 } : {}) } : null, enabled && imageEnabled);
  return useMemo(() => ({
    ...query,
    ...image,
    identity,
    refetch: () => {
      image.retryImage();
      return query.refetch();
    },
  }), [image, query, identity]);
}
