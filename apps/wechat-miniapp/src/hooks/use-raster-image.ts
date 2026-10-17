import { useEffect, useMemo, useState } from "react";
import { mapRasterFiles } from "@/services/map-raster-files";
import type { RasterImageDescriptor } from "@/services/raster-image-resources";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";

/** A consumer lease on the one shared immutable-file owner. Metadata, actual
 * bounds, source disclosure and native installation remain with their owners. */
export function useRasterImage(input: RasterImageDescriptor | null, enabled: boolean) {
  const imageUrl = input?.url ?? null, imageKey = input?.key ?? "";
  const imageBytes = input?.expectedBytes, imageSha256 = input?.expectedSha256;
  const [imageAttempt, setImageAttempt] = useState(0);
  const [imageState, setImageState] = useState<{ url: string; path: string | null; error: unknown | null }>({ url: "", path: null, error: null });
  useEffect(() => {
    if (!enabled || !imageUrl) {
      setImageState({ url: imageKey, path: null, error: null });
      return;
    }
    const controller = new AbortController();
    setImageState({ url: imageKey, path: null, error: null });
    const read = mapRasterFiles.acquire({ key: imageKey, url: imageUrl,
      ...(imageBytes === undefined ? {} : { expectedBytes: imageBytes }),
      ...(imageSha256 ? { expectedSha256: imageSha256 } : {}) }, controller.signal);
    void read.promise.then(({ path }) => {
      if (!controller.signal.aborted) setImageState({ url: imageKey, path, error: null });
    }).catch(error => {
      if (!controller.signal.aborted && !isMiniappRequestCancelled(error)) setImageState({ url: imageKey, path: null, error });
    });
    return () => { controller.abort(); read.release(); };
  }, [enabled, imageUrl, imageKey, imageAttempt, imageBytes, imageSha256]);
  return useMemo(() => ({
    imagePath: enabled && imageState.url === imageKey ? imageState.path : null,
    imageError: enabled && imageState.url === imageKey ? imageState.error : null,
    imagePending: Boolean(enabled && imageUrl && (imageState.url !== imageKey || (!imageState.path && !imageState.error))),
    reportImageFailure: (error: unknown, failedPath = imageState.path) => {
      if (failedPath) mapRasterFiles.invalidate(imageKey, failedPath);
      setImageState(current => current.url === imageKey && current.path === failedPath ? { url: imageKey, path: null, error } : current);
    },
    retryImage: () => {
      if (imageState.url === imageKey && imageState.error) {
        mapRasterFiles.invalidate(imageKey, imageState.path);
        setImageAttempt(value => value + 1);
      }
    },
  }), [enabled, imageState, imageUrl, imageKey]);
}
