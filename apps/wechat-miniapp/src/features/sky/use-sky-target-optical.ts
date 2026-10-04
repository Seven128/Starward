import { useMemo } from "react";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getSdssOpticalManifest, sdssOpticalImageUrl } from "@/services/sdss-optical-client";
import type { SdssOpticalManifest, SdssScienceOpticalManifest, SdssCalibratedOpticalManifest, PreparedOpticalManifest, PreparedDisplayOpticalManifest, PreparedProgressiveOpticalManifest, PreparedRenderedOpticalManifest } from "@starward/miniapp-contracts";
import { getPreparedOpticalResource } from "@/services/prepared-optical-resource";
import { preparedOpticalImageUrl } from "@/services/prepared-optical-client";
import type { SkyPublicationResource } from "@/services/sky-publication-resource";
import { getSdssScienceOpticalResource, getSdssCalibratedOpticalResource } from "@/services/sdss-science-optical-resource";
import { sdssOpticalLevelForFov, skyTargetOpticalLevelForFov } from "./sky-sdss-optical-selection";
import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { skyFixedImageStatus } from "./sky-fixed-image-status";
import { useSkyNativeImages } from "./use-sky-artwork";
import { skyTargetOpticalIntersectsView, type SkyTargetOpticalView } from "./sky-target-optical-visibility";

/** A family selector is separate from the admitted immutable image version. */
export type SkyTargetOpticalKind = "sdss-legacy" | "sdss-science" | "sdss-calibrated" | "prepared-optical-v1" | "prepared-display-optical-v1" | "prepared-optical-v2";
export type SkyTargetOpticalPublication<K extends SkyTargetOpticalKind> =
  K extends "prepared-optical-v1" ? PreparedOpticalManifest :
  K extends "prepared-display-optical-v1" ? PreparedDisplayOpticalManifest :
  K extends "prepared-optical-v2" ? PreparedProgressiveOpticalManifest :
  K extends "sdss-science" ? SdssScienceOpticalManifest :
  K extends "sdss-calibrated" ? SdssCalibratedOpticalManifest : SdssOpticalManifest;

/** One progressive owner; matching geometry never relabels source meaning.
 * Metadata identity/epoch and the bounded native-image lifecycle stay atomic. */
export function useSkyTargetOptical<K extends SkyTargetOpticalKind>(kind: K,
  reference: string | null, fov: number, canvas: SkyArtworkCanvas | null,
  canvasRevision: number, active: boolean, opticalPublicationHash?: string, footprint?: SkyTargetOpticalView) {
  const immutable = kind !== "sdss-legacy", prepared = kind === "prepared-optical-v1" || kind === "prepared-display-optical-v1" || kind === "prepared-optical-v2";
  const immutableIntent = immutable && active && !!reference && /^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference) &&
    typeof opticalPublicationHash === "string" && /^[a-f0-9]{64}$/u.test(opticalPublicationHash) && Number.isFinite(fov) && fov > 0;
  const legacyLevel = !immutable && active ? sdssOpticalLevelForFov(fov, reference) : null;
  const manifest = useResourceQuery<SdssOpticalManifest | SkyPublicationResource<SdssCalibratedOpticalManifest | PreparedRenderedOpticalManifest>>({
    queryKey: [prepared ? "prepared-optical-manifest" : "sdss-optical-manifest", reference,
      ...(immutable ? [kind, opticalPublicationHash] : [])],
    queryFn: signal => prepared ? getPreparedOpticalResource(reference!, opticalPublicationHash!, signal) :
      kind === "sdss-calibrated" ? getSdssCalibratedOpticalResource(reference!, opticalPublicationHash!, signal) :
      immutable ? getSdssScienceOpticalResource(reference!, opticalPublicationHash!, signal) :
      getSdssOpticalManifest(signal, reference ?? "M:51"),
    enabled: immutable ? immutableIntent : Boolean(legacyLevel), staleTime: 60_000, structuralSharing: false });
  const resource = manifest.data && "publication" in manifest.data ? manifest.data : undefined;
  const metadataRetired = Boolean(immutable && resource && !resource.isCurrent());
  const candidate = immutable ? !metadataRetired ? resource?.publication : undefined :
    manifest.data && !("publication" in manifest.data) ? manifest.data : undefined;
  // Retained metadata cannot cross a kind/ref/hash transition, including the
  // render/effect gap before actual native acquisition.
  const kindMatches = candidate && (immutable ? "imageVersion" in candidate && (prepared
    ? candidate.imageVersion === kind
    : candidate.imageVersion === "science-optical-v2" || candidate.imageVersion === "science-optical-v3" ||
      kind === "sdss-calibrated" && candidate.imageVersion === "sdss-display-optical-v1") :
    !("imageVersion" in candidate));
  const publication = kindMatches && candidate.objectRef === reference &&
    (!immutable || candidate.publicationHash === opticalPublicationHash)
    ? candidate as SkyTargetOpticalPublication<K> : undefined;
  const inView = useMemo(() => !footprint || !publication || skyTargetOpticalIntersectsView(publication, footprint),
    [publication, footprint?.report, footprint?.at, footprint?.width, footprint?.height,
      footprint?.view.basis, footprint?.view.verticalFovDeg, footprint?.view.center?.x, footprint?.view.center?.y]);
  const level = !inView ? null : immutable ? immutableIntent && publication && resource
    ? skyTargetOpticalLevelForFov(fov, publication) : null : legacyLevel;
  const wantedImage = immutable ? Boolean(immutableIntent && (!publication || level)) : Boolean(level);
  const namespace = prepared ? "prepared" : "sdss";
  const levelOrder = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;
  const wanted = useMemo(() => {
    if (!level || !publication) return [];
    const index = levelOrder.indexOf(level);
    // The parent owns the valid exterior of a finite finer field. The current
    // adjacent images share the existing publication and queue.
    return levelOrder.slice(Math.max(0, index - 1), index + 1).reverse().map(candidate => ({
      ...publication.levels[candidate], id: `${namespace}:${publication.objectRef}:${candidate}`,
      width: publication.levels[candidate].pixels, height: publication.levels[candidate].pixels,
    }));
  }, [publication, level, namespace]);
  const images = useSkyNativeImages(canvas, canvasRevision, publication?.publicationHash,
    wantedImage, wanted, asset => {
      // Recheck the resolved metadata at actual acquisition, after React's
      // render/effect gap. Retired metadata cannot open the next cache epoch.
      if (immutable && resource?.isCurrent() !== true) throw new Error(prepared ? "prepared_optical_resource_cancelled" : kind === "sdss-calibrated" ? "sdss_calibrated_optical_resource_cancelled" : "sdss_science_optical_resource_cancelled");
      return { url: prepared ? preparedOpticalImageUrl(asset.downloadUrl) : sdssOpticalImageUrl(asset.downloadUrl), format: "format" in asset ? asset.format : "jpeg" };
    },
    // Keep the existing retention pressure. The loader protects wanted images
    // and their fallback; this value does not cap the actively drawn images.
    // Changing it on zoom would dispose the loader and lose coarse fallback.
    2 * 512 * 512 * 4);
  const decoded = (candidate: typeof levelOrder[number]) => {
    const id = `${namespace}:${reference}:${candidate}`;
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
  const renderedAsset = renderedLevel && publication ? publication.levels[renderedLevel] : null;
  const coarserLevel = renderedLevel ? levelOrder.slice(0, levelOrder.indexOf(renderedLevel))
    .reverse().find(candidate => decoded(candidate)) ?? null : null;
  const coarserImage = coarserLevel ? decoded(coarserLevel) : null;
  const coarser = useMemo(() => coarserLevel && coarserImage && publication ? {
    image: coarserImage, level: coarserLevel, fieldDegrees: publication.levels[coarserLevel].fieldDegrees,
    asset: publication.levels[coarserLevel],
  } : null, [coarserLevel, coarserImage, publication]);
  const status = skyFixedImageStatus(wantedImage, image, manifest.isError || metadataRetired, Boolean(manifest.refreshError), images.failed);
  return { image, fieldDegrees, renderedLevel, renderedAsset, coarser, publication, requested: wantedImage,
    loading: wantedImage && (manifest.isFetching || images.loading), ...status,
    updateFailed: wantedImage && Boolean(image) && images.failed,
    failedImage: images.failedImage,
    retry() { const resetGpu = images.retryImages(); void manifest.refetch(); return resetGpu; } };
}
