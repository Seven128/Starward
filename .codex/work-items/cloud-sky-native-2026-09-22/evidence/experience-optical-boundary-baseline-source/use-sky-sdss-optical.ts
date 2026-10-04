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
  const wanted = useMemo(() => level && publication ? [{
    ...publication.levels[level], id: `sdss:${publication.objectRef}:${level}`, width: 512 as const, height: 512 as const,
  }] : [], [publication, level]);
  const images = useSkyNativeImages(canvas, canvasRevision, publication?.publicationHash,
    wantedImage, wanted, asset => ({ url: sdssOpticalImageUrl(asset.downloadUrl), format: "jpeg" }),
    2 * 512 * 512 * 4);
  const ready = wanted.find(asset => images.images.has(asset.id));
  const levelOrder = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;
  const levelIndex = level ? levelOrder.indexOf(level) : -1;
  // Prefer the closest coarser publication while refinement loads/fails. A
  // previously finer image can still provide its registered partial footprint
  // while zooming out, if no appropriate coarse image is ready yet.
  const retained = ready || !level ? null : [
    ...levelOrder.slice(0,levelIndex).reverse(),...levelOrder.slice(levelIndex+1),
  ].find(candidate => images.retainedImages.has(`sdss:${reference}:${candidate}`)) ?? null;
  const renderedLevel = ready ? level : retained;
  const image = ready ? images.images.get(ready.id)! : retained ? images.retainedImages.get(`sdss:${reference}:${retained}`)! : null;
  const fieldDegrees = renderedLevel && publication ? publication.levels[renderedLevel].fieldDegrees : null;
  const status = skyFixedImageStatus(wantedImage, image, manifest.isError, Boolean(manifest.refreshError), images.failed);
  return { image, fieldDegrees, renderedLevel, publication, requested: wantedImage,
    loading: wantedImage && (manifest.isFetching || images.loading), ...status,
    updateFailed: wantedImage && Boolean(image) && images.failed,
    failedImage: images.failedImage,
    retry() { const resetGpu = images.retryImages(); void manifest.refetch(); return resetGpu; } };
}
