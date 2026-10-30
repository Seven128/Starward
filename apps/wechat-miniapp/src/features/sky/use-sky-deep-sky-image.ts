import { useMemo, useRef } from "react";
import type { DeepSkyImageDiscoveryData, DeepSkyImageLevel } from "@starward/miniapp-contracts";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getDeepSkyImageResource } from "../../services/deep-sky-image-client";
import type { SkyPublicationResource } from "../../services/sky-publication-resource";
import { skyResourceUrl } from "../../services/bare-sky-resource";
import type { SkyDeepSkyImageField, SkyDeepSkyImageFrame } from "./sky-deep-sky-image-frame";
import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { useSkyNativeImages } from "./use-sky-artwork";
import { useSkyImageRecovery } from "./use-sky-image-recovery";
import { skyNativeImageLevels } from "./sky-native-image-levels";
import { skyDeepSkyImageIntersectsView, type SkyTargetImageView } from "./sky-target-image-visibility";

const LEVELS = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;

/** W3 discovery retains its own scientific/display contract. The existing
 * encoded/native owners now retain decoded alternatives through GPU readiness,
 * instead of retiring the preceding bitmap at the next decoder's onload. */
export function useSkyDeepSkyImage(reference: string | null, level: DeepSkyImageLevel | null,
  canvas: SkyArtworkCanvas | null, revision: number, active: boolean,
  footprint?: SkyTargetImageView, paused = false) {
  const requested = active && !!reference && !!level;
  const discovery = useResourceQuery<SkyPublicationResource<DeepSkyImageDiscoveryData>>({
    queryKey: ["deep-sky-image-discovery", reference],
    // Bind request identity without the render's footprint, Canvas or bitmap.
    queryFn: getDeepSkyImageResource.bind(null, reference!),
    enabled: requested && !paused, staleTime: 60_000, structuralSharing: false,
  });
  const resource = discovery.data?.publication.objectRef === reference ? discovery.data : undefined;
  const publication = resource?.publication;
  const retired = resource?.isCurrent() === false;
  const inView = useMemo(() => !publication || !footprint || skyDeepSkyImageIntersectsView(publication, footprint),
    [publication, footprint?.report, footprint?.at, footprint?.width, footprint?.height,
      footprint?.view.basis, footprint?.view.verticalFovDeg, footprint?.view.center?.x, footprint?.view.center?.y]);
  const wantedImage = requested && inView;
  const enabled = wantedImage && !retired;
  const wanted = useMemo(() => enabled && publication && level ? [{
    ...publication.levels[level], id: `infrared:${reference}:${level}`,
  }] : [], [enabled, publication, reference, level]);
  const images = useSkyNativeImages(canvas, revision, publication?.publicationHash, enabled, wanted,
    asset => {
      if (!resource?.isCurrent()) throw new Error("deep_sky_image_resource_cancelled");
      return { url: skyResourceUrl(asset.downloadUrl, "deep-sky"), format: asset.format };
    },
    // One maximum-size prior bitmap, beside the current demand, within the
    // existing two-file IR working set. No unsolicited coarser download.
    512 * 512 * 4, LEVELS.map(candidate => `infrared:${reference}:${candidate}`), undefined, paused);
  const scope = useRef({ enabled, paused, reference, publication, canvas, revision });
  scope.current = { enabled, paused, reference, publication, canvas, revision };
  const read = (): SkyDeepSkyImageFrame | null => {
    const current = scope.current;
    if (!enabled || current.paused || current.reference !== reference || current.publication !== publication ||
      current.canvas !== canvas || current.revision !== revision || !current.enabled || !publication || !resource?.isCurrent()) return null;
    const native = images.currentImages();
    const bitmap = (candidate: DeepSkyImageLevel) => {
      const id = `infrared:${reference}:${candidate}`;
      const image = native.images.get(id) ?? native.retainedImages.get(id) ?? null;
      return image && skyNativeImageIsCurrent(image) ? image : null;
    };
    const selected = skyNativeImageLevels(LEVELS, level, bitmap);
    const field = (candidate: DeepSkyImageLevel | null): SkyDeepSkyImageField | null => {
      const image = candidate && bitmap(candidate);
      if (!candidate || !image) return null;
      const asset = publication.levels[candidate];
      return { reference: publication.objectRef, level: candidate, fieldDegrees: asset.fieldDegrees,
        publicationHash: publication.publicationHash, sourceId: publication.sourceId,
        pixelSize: asset.pixels,
        ...(asset.sourceFiniteMask ? { sourceMissingPixels: asset.sourceFiniteMask.missingPixels } : {}),
        ...(asset.displaySupport ? { displaySupport: asset.displaySupport } : {}), image };
    };
    const primary = field(selected.primary);
    return primary ? { ...primary, canvasGeneration: revision,
      isCurrent: () => scope.current.enabled && !scope.current.paused && scope.current.reference === reference &&
        scope.current.publication === publication && scope.current.canvas === canvas &&
        scope.current.revision === revision && resource.isCurrent(),
      coarser: field(selected.coarser), fallback: field(selected.fallback) } : null;
  };
  const frame = useMemo(read, [enabled, paused, resource, publication, reference, level, canvas, revision, images.images, images.retainedImages]);
  const failed = wantedImage && (retired || discovery.isError || !!discovery.refreshError || images.failed);
  const retry = useSkyImageRecovery(wantedImage && !paused, images.retryImages, discovery.refetch);
  return { frame, currentFrame: read, failedImage: images.failedImage, retry,
    state: (!wantedImage ? "IDLE" : failed ? "ERROR" : !frame || images.loading || discovery.isFetching ? "LOADING" : "READY") as
      "IDLE" | "LOADING" | "READY" | "ERROR" };
}
