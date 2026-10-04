import { useEffect, useMemo, useRef, useState } from "react";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getSkyLandscapeManifest, getSkyLandscapeAlpha, skyLandscapeAssetUrl } from "@/services/sky-landscape-client";
import { useSkyNativeImages } from "./use-sky-artwork";
import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { createSkyLandscapeMasks, selectSkyLandscapeResource, selectSkyLandscapePanorama,
  selectSkyLandscapeImageResources, type SkyLandscapeFootprint, type SkyLandscapeMaskState } from "./sky-landscape-resources";

const EMPTY_MASKS: SkyLandscapeMaskState = { masks: new Map(), failed: false };

/** Mask, image and publication form one canvas generation. Hide drops decoded alpha too. */
export function useSkyLandscape(canvas: SkyArtworkCanvas | null, revision: number, active: boolean,
  otherImages: readonly object[], otherImagesPending: boolean, footprint: SkyLandscapeFootprint | null) {
  const wanted = active && Boolean(canvas);
  const manifest = useResourceQuery({ queryKey: ["sky-landscape-manifest"], queryFn: getSkyLandscapeManifest,
    enabled: wanted, structuralSharing: false, staleTime: 60_000 });
  const publication = manifest.data;
  const resource = publication && selectSkyLandscapeResource(publication, otherImages, otherImagesPending);
  const ownerRef = useRef<ReturnType<typeof createSkyLandscapeMasks> | null>(null);
  const wantedRef = useRef(publication && resource ? publication.resources.filter(candidate =>
    candidate.id === "overview" || candidate.id === resource.id) : []);
  wantedRef.current = publication && resource ? publication.resources.filter(candidate =>
    candidate.id === "overview" || candidate.id === resource.id) : [];
  const [maskState, setMaskState] = useState<{ hash: string; revision: number; canvas: SkyArtworkCanvas;
    owner: ReturnType<typeof createSkyLandscapeMasks>; value: SkyLandscapeMaskState } | null>(null);
  useEffect(() => {
    if (!wanted || !canvas || !publication) return;
    let live = true;
    const owner = createSkyLandscapeMasks(publication, { load: getSkyLandscapeAlpha,
      changed(value) { if (live) setMaskState({ hash: publication.publicationHash, canvas, revision, owner, value }); } });
    ownerRef.current = owner; owner.update(wantedRef.current);
    return () => { live = false; owner.dispose(); if (ownerRef.current === owner) ownerRef.current = null;
      setMaskState(previous => previous?.owner === owner ? null : previous); };
  }, [wanted, canvas, revision, publication?.publicationHash]);
  useEffect(() => { ownerRef.current?.update(wantedRef.current); }, [resource?.id]);
  const current = wanted && maskState?.owner === ownerRef.current && maskState.canvas === canvas && maskState.revision === revision &&
    maskState.hash === publication?.publicationHash ? maskState.value : EMPTY_MASKS;
  const assets = useMemo(() => selectSkyLandscapeImageResources(wantedRef.current, current.masks, footprint)
    .map(candidate => ({ ...candidate.image, id: `landscape:${candidate.id}` })),
    [current.masks, resource?.id, publication?.publicationHash, footprint?.view.basis,
      footprint?.view.verticalFovDeg, footprint?.view.center, footprint?.width, footprint?.height]);
  const images = useSkyNativeImages(canvas, revision, publication?.publicationHash, wanted, assets,
    asset => ({ url: skyLandscapeAssetUrl(asset.downloadUrl), format: "png" }));
  // Overview remains the fallback wherever its source can contribute. Empty
  // views need no bitmap; retain immutable files for a later visible return.
  useEffect(() => { images.suspendUnusedDecoded(); },
    [images.images, images.retainedImages, images.suspendUnusedDecoded]);
  const panorama = useMemo(() => selectSkyLandscapePanorama(resource, current.masks, images.images, images.retainedImages),
    [resource, current.masks, images.images, images.retainedImages]);
  // A completed alpha grid certifies true zero contribution even without its
  // bitmap. The drawing owner rechecks it against the actual submitted view;
  // absence/loading must never substitute an unrelated procedural tree there.
  const mask = (resource && current.masks.get(resource.id)) ?? panorama?.mask ?? current.masks.get("overview") ?? null;
  return { panorama, mask, failedImage: images.failedImage,
    failed: wanted && (manifest.isError || current.failed || images.failed),
    retry() { const resetGpu = images.retryImages(); ownerRef.current?.retry(); void manifest.refetch(); return resetGpu; } };
}
