import { useMemo } from "react";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getSdssOpticalManifest, sdssOpticalImageUrl } from "@/services/sdss-optical-client";
import { sdssOpticalLevelForFov } from "./sky-sdss-optical-selection";
import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { useSkyNativeImages } from "./use-sky-artwork";

/** A published target optical patch is independent of the W3 historical layer.
 * Selection, native image ownership and release use the existing shared owner. */
export function useSkySdssOptical(reference: string | null, fov: number,
  canvas: SkyArtworkCanvas | null, canvasRevision: number, active: boolean) {
  const level = active ? sdssOpticalLevelForFov(fov, reference) : null;
  const wantedImage = Boolean(level);
  const manifest = useResourceQuery({ queryKey: ["sdss-optical-manifest", reference],
    queryFn: signal => getSdssOpticalManifest(signal, reference ?? "M:51"),
    enabled: wantedImage, staleTime: 60_000, structuralSharing: false });
  // A prior query result can remain in React until the identity transition commits.
  const publication = manifest.data?.objectRef === reference ? manifest.data : undefined;
  const levelOrder = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;
  const wanted = useMemo(() => {
    if (!level || !publication) return [];
    const index = levelOrder.indexOf(level);
    // The parent owns the valid exterior of a finite finer field. Both fit
    // the existing two-image budget and use the same publication/queue.
    return levelOrder.slice(Math.max(0, index - 1), index + 1).reverse().map(candidate => ({
      ...publication.levels[candidate], id: `sdss:${publication.objectRef}:${candidate}`,
      width: 512 as const, height: 512 as const,
    }));
  }, [publication, level]);
  const images = useSkyNativeImages(canvas, canvasRevision, publication?.publicationHash,
    wantedImage, wanted, asset => ({ url: sdssOpticalImageUrl(asset.downloadUrl), format: "jpeg" }),
    2 * 512 * 512 * 4);
  const decoded = (candidate: typeof levelOrder[number]) => {
    const id = `sdss:${reference}:${candidate}`;
    return images.images.get(id) ?? images.retainedImages.get(id) ?? null;
  };
  const levelIndex = level ? levelOrder.indexOf(level) : -1;
  // Prefer the closest coarser publication while refinement loads/fails. A
  // previously finer image can still provide its registered partial footprint
  // while zooming out, if no appropriate coarse image is ready yet.
  const retained = !level || decoded(level) ? null : [
    ...levelOrder.slice(0,levelIndex).reverse(),...levelOrder.slice(levelIndex+1),
  ].find(candidate => decoded(candidate)) ?? null;
  const renderedLevel = level && decoded(level) ? level : retained;
  const image = renderedLevel ? decoded(renderedLevel) : null;
  const fieldDegrees = renderedLevel && publication ? publication.levels[renderedLevel].fieldDegrees : null;
  const coarserLevel = renderedLevel ? levelOrder.slice(0, levelOrder.indexOf(renderedLevel))
    .reverse().find(candidate => decoded(candidate)) ?? null : null;
  const coarserImage = coarserLevel ? decoded(coarserLevel) : null;
  const coarser = useMemo(() => coarserLevel && coarserImage && publication ? {
    image: coarserImage, level: coarserLevel, fieldDegrees: publication.levels[coarserLevel].fieldDegrees,
  } : null, [coarserLevel, coarserImage, publication]);
  const status = skyFixedImageStatus(wantedImage, image, manifest.isError, Boolean(manifest.refreshError), images.failed);
  return { image, fieldDegrees, renderedLevel, coarser, publication, requested: wantedImage,
    loading: wantedImage && (manifest.isFetching || images.loading), ...status,
    updateFailed: wantedImage && Boolean(image) && images.failed,
    failedImage: images.failedImage,
    retry() { const resetGpu = images.retryImages(); void manifest.refetch(); return resetGpu; } };
}
