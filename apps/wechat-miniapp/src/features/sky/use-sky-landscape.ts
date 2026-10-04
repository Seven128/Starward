import { useEffect, useMemo, useRef, useState } from "react";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getSkyLandscapeManifest, getSkyLandscapeAlpha, skyLandscapeAssetUrl } from "@/services/sky-landscape-client";
import { useSkyNativeImages } from "./use-sky-artwork";
import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { createSkyLandscapeMasks, selectSkyLandscapeResource, selectSkyLandscapePanorama,
  selectSkyLandscapeImageResources, type SkyLandscapeFootprint, type SkyLandscapeMaskState } from "./sky-landscape-resources";
import { createSkyLandscapeReadiness } from "./sky-landscape-readiness";

const EMPTY_MASKS: SkyLandscapeMaskState = { masks: new Map(), failed: false };
const RETURN_FALLBACK_IDS = ["landscape:overview", "landscape:detail"] as const;

/** Mask, image and publication form one canvas generation. Hide drops decoded alpha too. */
export function useSkyLandscape(canvas: SkyArtworkCanvas | null, revision: number, active: boolean,
  otherImages: readonly object[], otherImagesPending: boolean, footprint: SkyLandscapeFootprint | null,
  reducedMotion = false) {
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
    asset => ({ url: skyLandscapeAssetUrl(asset.downloadUrl), format: "png" }), undefined, RETURN_FALLBACK_IDS);
  // Keep one successful coarse return bitmap (detail until its pending coarse
  // replacement succeeds). No invisible cold load; the other images go cold.
  useEffect(() => { images.suspendUnusedDecoded(); },
    [images.images, images.retainedImages, images.suspendUnusedDecoded]);
  const panorama = useMemo(() => selectSkyLandscapePanorama(resource, current.masks, images.images, images.retainedImages),
    [resource, current.masks, images.images, images.retainedImages]);
  const readinessOwner = useRef<ReturnType<typeof createSkyLandscapeReadiness> | null>(null);
  const availableRef = useRef(false); availableRef.current = Boolean(panorama);
  const reducedRef = useRef(reducedMotion); reducedRef.current = reducedMotion;
  const [readiness, setReadiness] = useState<{ owner: ReturnType<typeof createSkyLandscapeReadiness>;
    canvas: SkyArtworkCanvas; revision: number; hash: string; opacity: number } | null>(null);
  useEffect(() => {
    if (!wanted || !canvas || !publication) return;
    const hash = publication.publicationHash;
    const owner = createSkyLandscapeReadiness({ now: Date.now,
      requestFrame: callback => setTimeout(callback, 16),
      cancelFrame: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
      changed: opacity => setReadiness({ owner, canvas, revision, hash, opacity }) });
    readinessOwner.current = owner; owner.setAvailable(availableRef.current, reducedRef.current);
    return () => { owner.dispose(); if (readinessOwner.current === owner) readinessOwner.current = null;
      setReadiness(previous => previous?.owner === owner ? null : previous); };
  }, [wanted, canvas, revision, publication?.publicationHash]);
  useEffect(() => { readinessOwner.current?.setAvailable(Boolean(panorama), reducedMotion); }, [Boolean(panorama), reducedMotion]);
  const opacity = panorama && readiness?.owner === readinessOwner.current && readiness.canvas === canvas &&
    readiness.revision === revision && readiness.hash === publication?.publicationHash ? readiness.opacity : 0;
  // A completed alpha grid certifies true zero contribution even without its
  // bitmap. The drawing owner rechecks it against the actual submitted view;
  // absence/loading must never substitute an unrelated procedural tree there.
  const mask = panorama?.mask ?? (resource && current.masks.get(resource.id)) ?? current.masks.get("overview") ?? null;
  return { panorama, mask, opacity, loading: wanted && (manifest.isFetching || images.loading ||
    Boolean(publication && resource && !current.masks.has(resource.id) && !current.failed)), failedImage: images.failedImage,
    failed: wanted && (manifest.isError || current.failed || images.failed),
    retry() { const resetGpu = images.retryImages(); ownerRef.current?.retry(); void manifest.refetch(); return resetGpu; } };
}
