import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { useEffect, useMemo, useState } from "react";
import { downloadTerrainAsset, getTerrainOverlay } from "@/services/api-client";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { useResourceQuery } from "./use-resource-query";

const downloaded = new Map<string, string>();

export function useTerrainOverlay(input: TerrainOverlayRequest, enabled: boolean) {
  const identity = `${input.purpose}:${input.center.latitude.toFixed(5)}:${input.center.longitude.toFixed(5)}:${input.radiusKm.toFixed(1)}`;
  const query = useResourceQuery({
    queryKey: ["terrain-overlay", identity],
    queryFn: (signal) => getTerrainOverlay(input, signal),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const imageUrl = query.data?.data.imageUrl ?? null;
  const [imageState, setImageState] = useState<{ url: string; path: string | null; error: unknown | null }>({ url: "", path: null, error: null });
  useEffect(() => {
    if (!enabled || !imageUrl) {
      setImageState({ url: imageUrl ?? "", path: null, error: null });
      return;
    }
    const cached = downloaded.get(imageUrl);
    if (cached) {
      setImageState({ url: imageUrl, path: cached, error: null });
      return;
    }
    const controller = new AbortController();
    setImageState({ url: imageUrl, path: null, error: null });
    void downloadTerrainAsset(imageUrl, controller.signal).then((path) => {
      downloaded.set(imageUrl, path);
      setImageState({ url: imageUrl, path, error: null });
    }).catch((error) => {
      if (!isMiniappRequestCancelled(error)) setImageState({ url: imageUrl, path: null, error });
    });
    return () => controller.abort();
  }, [enabled, imageUrl]);
  return useMemo(() => ({
    ...query,
    imagePath: imageState.url === imageUrl ? imageState.path : null,
    imageError: imageState.url === imageUrl ? imageState.error : null,
    imagePending: Boolean(enabled && imageUrl && imageState.url === imageUrl && !imageState.path && !imageState.error),
  }), [enabled, imageState, imageUrl, query]);
}
