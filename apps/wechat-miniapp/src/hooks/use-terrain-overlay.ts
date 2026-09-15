import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { useEffect, useMemo, useState } from "react";
import { downloadTerrainAsset, getTerrainOverlay } from "@/services/api-client";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { useResourceQuery } from "./use-resource-query";

const downloaded = new Map<string, string>();

export function useTerrainOverlay(input: TerrainOverlayRequest, enabled: boolean, imageEnabled = enabled) {
  const identity = `${input.purpose}:${input.center.latitude.toFixed(5)}:${input.center.longitude.toFixed(5)}:${input.radiusKm.toFixed(1)}`;
  const query = useResourceQuery({
    queryKey: ["terrain-overlay", identity],
    queryFn: (signal) => getTerrainOverlay(input, signal),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const imageUrl = query.data?.data.imageUrl ?? null;
  const imageKey = imageUrl ? `${query.data?.data.publicationId ?? ""}:${imageUrl}` : "";
  const [imageAttempt, setImageAttempt] = useState(0);
  const shouldReadImage = enabled && imageEnabled;
  const [imageState, setImageState] = useState<{ url: string; path: string | null; error: unknown | null }>({ url: "", path: null, error: null });
  useEffect(() => {
    if (!shouldReadImage || !imageUrl) {
      setImageState({ url: imageKey, path: null, error: null });
      return;
    }
    const cached = downloaded.get(imageKey);
    if (cached) {
      setImageState({ url: imageKey, path: cached, error: null });
      return;
    }
    const controller = new AbortController();
    setImageState({ url: imageKey, path: null, error: null });
    void downloadTerrainAsset(imageUrl, controller.signal).then((path) => {
      if (controller.signal.aborted) return;
      downloaded.set(imageKey, path);
      while (downloaded.size > 8) downloaded.delete(downloaded.keys().next().value!);
      setImageState({ url: imageKey, path, error: null });
    }).catch((error) => {
      if (!controller.signal.aborted && !isMiniappRequestCancelled(error)) setImageState({ url: imageKey, path: null, error });
    });
    return () => controller.abort();
  }, [shouldReadImage, imageUrl, imageKey, imageAttempt]);
  return useMemo(() => ({
    ...query,
    imagePath: shouldReadImage && imageState.url === imageKey ? imageState.path : null,
    imageError: shouldReadImage && imageState.url === imageKey ? imageState.error : null,
    imagePending: Boolean(shouldReadImage && imageUrl && (imageState.url !== imageKey || (!imageState.path && !imageState.error))),
    reportImageFailure: (error: unknown, failedPath = imageState.path) => {
      if (downloaded.get(imageKey) === failedPath) downloaded.delete(imageKey);
      setImageState(current => current.url === imageKey && current.path === failedPath
        ? { url: imageKey, path: null, error } : current);
    },
    refetch: () => {
      if (imageState.url === imageKey && imageState.error) {
        downloaded.delete(imageKey);
        setImageAttempt(value => value + 1);
      }
      return query.refetch();
    },
  }), [shouldReadImage, imageState, imageUrl, imageKey, query]);
}
