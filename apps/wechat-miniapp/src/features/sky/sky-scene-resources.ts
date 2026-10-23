import type { GalacticImageManifestData } from "@starward/miniapp-contracts";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { completeSkyBodyImages, sameSkyBodyImages, type SkyBodyImageBinding } from "./sky-body-image-completion";
import type { SkyDeepSkyImageFrame } from "./sky-deep-sky-image-frame";
import { sameSkyHipsCompletion } from "./sky-hips-source-credit";
import type { SkyLandscapeMask, SkyLandscapePanorama, SkyPanoramaMask } from "./sky-landscape-mask";
import { acceptedSkyPreparedRegionCompletions, sameSkyPreparedRegionCompletions,
  sameSkyPreparedRegionInputs } from "./sky-prepared-region-frame";
import type { SkySceneTargetOpticalPort } from "./sky-target-optical-scene";
import type { SkyGalacticImageCompletion, SkyHipsCanvasTile,
  SkySceneFrameInput, SkyScenePaintedSources, SkySceneResourceInputs } from "./sky-scene-frame";
import { acceptedSkyOpticalCompletion, liveSkyOpticalCompletion, sameSkyOpticalCompletion,
  sameSkyOpticalInput, type SkyPreparedOpticalCompletion, type SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";
import type { SkyPreparedOpticalImage, SkyTargetOpticalImage } from "./sky-sdss-optical-frame";

/** The existing queued Canvas resource declarations. Acquisition, readiness,
 * retry and retirement still belong to their family hooks/native owners. */
export interface SkyCanvasResourceFrame {
  readonly nativeImageGeneration: number;
  readonly deepSkyImage: SkyDeepSkyImageFrame | null;
  readonly sdssOpticalImage: SkyTargetOpticalImage | null;
  readonly preparedRegionImages: readonly SkyPreparedOpticalImage[];
  readonly constellationImages: ReadonlyMap<string, object>;
  readonly hipsTiles: readonly SkyHipsCanvasTile[];
  readonly readHipsTiles?: () => readonly SkyHipsCanvasTile[];
  readonly bodyImageBindings?: readonly SkyBodyImageBinding[];
  readonly galacticImage: object | null;
  readonly galacticPublication: GalacticImageManifestData | null;
  readonly constellationsEnabled: boolean;
  readonly landscapeEnabled: boolean;
  readonly landscapePanorama: SkyLandscapePanorama | null;
  readonly landscapeMask: SkyPanoramaMask | null;
  readonly landscapeOpacity: number;
  readonly landscapePending: boolean;
  readonly landscapeFailed: boolean;
}

const EMPTY_IMAGES: ReadonlyMap<string, object> = new Map();

/** HiPS is the one existing family with a current native read at draw admission.
 * A retired generation must not invoke a replacement owner's getter. */
export function resolveSkyCanvasResources<F extends SkyCanvasResourceFrame>(frame: F, generation: number): F {
  if (frame.nativeImageGeneration !== generation || !frame.readHipsTiles) return frame;
  const hipsTiles = frame.readHipsTiles();
  return hipsTiles === frame.hipsTiles ? frame : { ...frame, hipsTiles };
}

/** Build the actual Scene ports from one queued admission. IR retains its own
 * scope/generation guard; unrelated families share the original Canvas fence. */
export function skySceneResourceInputs(frame: SkyCanvasResourceFrame, scope: {
  readonly generation: number;
  readonly surface: SkySceneTargetOpticalPort["surface"];
  readonly previousLandscape: SkyLandscapeMask | null;
}): SkySceneResourceInputs {
  const current = frame.nativeImageGeneration === scope.generation;
  const optical = current ? frame.sdssOpticalImage : null;
  return {
    layers: {
      constellations: { images: current ? frame.constellationImages : EMPTY_IMAGES, enabled: frame.constellationsEnabled },
      landscape: { enabled: frame.landscapeEnabled, panorama: current ? frame.landscapePanorama : null,
        mask: current ? frame.landscapeMask : null, readiness: frame.landscapeOpacity,
        pending: !current || frame.landscapePending, failed: current && frame.landscapeFailed,
        previous: scope.previousLandscape },
    },
    imagery: {
      infrared: frame.deepSkyImage?.canvasGeneration === scope.generation && frame.deepSkyImage.isCurrent?.() !== false
        ? frame.deepSkyImage : null,
      targetOptical: { image: optical,
        ...(optical && "preparedPublication" in optical ? { prepared: { surface: scope.surface,
          reference: optical.reference, publicationHash: optical.publicationHash } } : {}),
        ...(optical && ("sciencePublication" in optical || "displayPublication" in optical) ? { calibrated: {
          surface: scope.surface, reference: optical.reference, publicationHash: optical.publicationHash } } : {}) },
      preparedRegions: (current ? frame.preparedRegionImages : []).map(image => ({ frame: image,
        port: { surface: scope.surface, reference: image.reference, publicationHash: image.publicationHash } })),
      hipsTiles: current ? frame.hipsTiles : [],
      bodyImages: current ? frame.bodyImageBindings ?? [] : [],
      galactic: { image: current ? frame.galacticImage : null, publication: current ? frame.galacticPublication : null },
    },
  };
}

export function sameSkyCanvasResources(a: SkyCanvasResourceFrame, b: SkyCanvasResourceFrame): boolean {
  return a.nativeImageGeneration === b.nativeImageGeneration && a.deepSkyImage === b.deepSkyImage &&
    sameSkyOpticalInput(a.sdssOpticalImage, b.sdssOpticalImage) &&
    sameSkyPreparedRegionInputs(a.preparedRegionImages, b.preparedRegionImages) &&
    a.constellationImages === b.constellationImages && a.constellationsEnabled === b.constellationsEnabled &&
    a.hipsTiles === b.hipsTiles && a.readHipsTiles === b.readHipsTiles &&
    sameSkyBodyImages(a.bodyImageBindings, b.bodyImageBindings) && a.galacticImage === b.galacticImage &&
    a.galacticPublication === b.galacticPublication && a.landscapeEnabled === b.landscapeEnabled &&
    a.landscapePanorama === b.landscapePanorama && a.landscapeMask === b.landscapeMask &&
    a.landscapeOpacity === b.landscapeOpacity && a.landscapePending === b.landscapePending &&
    a.landscapeFailed === b.landscapeFailed;
}

/** Actual successful family facts, without all candidate images or work owners.
 * The page's existing successful-copy writer is the only publisher of this. */
export interface SkyCompletedSceneResources {
  readonly sdssOptical: SkyTargetOpticalCompletion | null;
  readonly preparedRegions: readonly SkyPreparedOpticalCompletion[];
  readonly deepSkyImage: SkyDeepSkyImageFrame | null;
  readonly galacticImage: SkyGalacticImageCompletion | null;
  readonly opticalHips: readonly SkyHipsCanvasTile[];
  readonly bodyImages: readonly SkyBodyImageBinding[];
  readonly landscape: SkyLandscapeMask | null;
}

function completedInfrared(frame: SkyDeepSkyImageFrame | null, image: object | null) {
  if (!frame || !image || frame.isCurrent?.() === false) return null;
  const field = [frame, frame.coarser, frame.fallback].find(value =>
    value?.image === image && skyNativeImageIsCurrent(value.image));
  if (!field) return null;
  // Preserve only the field actually used. The original scope function stays
  // with its native owner; the completion adds no candidate-group closure.
  const current = frame.isCurrent;
  return Object.freeze({ ...field, canvasGeneration: frame.canvasGeneration, coarser: null, fallback: null,
    isCurrent: () => current?.() !== false && skyNativeImageIsCurrent(image) });
}

export function completeSkySceneResources(attempt: {
  readonly frame: SkyCanvasResourceFrame;
  readonly input: SkySceneFrameInput;
  readonly sources: SkyScenePaintedSources;
  readonly landscape: SkyLandscapeMask | null;
}): SkyCompletedSceneResources {
  const { frame, input, sources, landscape } = attempt, imagery = input.imagery;
  const infrared = imagery?.infrared === frame.deepSkyImage ? frame.deepSkyImage : null;
  const galactic = sources.galacticImage;
  return Object.freeze({
    sdssOptical: acceptedSkyOpticalCompletion(sources.sdssOptical, imagery?.targetOptical?.image),
    preparedRegions: Object.freeze(acceptedSkyPreparedRegionCompletions(sources.preparedRegions,
      (imagery?.preparedRegions ?? []).map(region => region.frame))),
    deepSkyImage: completedInfrared(infrared, sources.deepSkyImage),
    galacticImage: galactic && galactic.image === imagery?.galactic?.image &&
      galactic.publication === imagery?.galactic?.publication && skyNativeImageIsCurrent(galactic.image) ? galactic : null,
    opticalHips: Object.freeze((sources.opticalHips ?? []).filter(tile =>
      imagery?.hipsTiles?.includes(tile) && skyNativeImageIsCurrent(tile.image))),
    bodyImages: completeSkyBodyImages(sources.bodyImages, imagery?.bodyImages),
    landscape,
  });
}

export function sameSkyCompletedSceneResources(a: SkyCompletedSceneResources, b: SkyCompletedSceneResources): boolean {
  return sameSkyOpticalCompletion(a.sdssOptical, b.sdssOptical) &&
    sameSkyPreparedRegionCompletions(a.preparedRegions, b.preparedRegions) &&
    sameSkyHipsCompletion(a.opticalHips, b.opticalHips) && sameSkyBodyImages(a.bodyImages, b.bodyImages) &&
    a.deepSkyImage?.image === b.deepSkyImage?.image && a.deepSkyImage?.isCurrent?.() !== false &&
    a.deepSkyImage?.level === b.deepSkyImage?.level && a.deepSkyImage?.fieldDegrees === b.deepSkyImage?.fieldDegrees &&
    a.deepSkyImage?.publicationHash === b.deepSkyImage?.publicationHash && a.deepSkyImage?.sourceId === b.deepSkyImage?.sourceId &&
    a.deepSkyImage?.sourceMissingPixels === b.deepSkyImage?.sourceMissingPixels &&
    a.galacticImage?.image === b.galacticImage?.image && a.galacticImage?.publication === b.galacticImage?.publication &&
    a.landscape === b.landscape;
}

const NO_COMPLETED_RESOURCES: SkyCompletedSceneResources = Object.freeze({ sdssOptical: null,
  preparedRegions: Object.freeze([]), deepSkyImage: null, galacticImage: null, opticalHips: Object.freeze([]),
  bodyImages: Object.freeze([]), landscape: null });

/** A current read of accepted facts, never a projection of newer query demand.
 * Retiring one bitmap cannot remove another family's independent contribution
 * or mutate the historical accepted frame used by names, picking and sources. */
export function liveSkySceneResources(frame: (SkyCompletedSceneResources & { readonly nativeCanvasGeneration: number }) | null | undefined,
  generation: number): SkyCompletedSceneResources {
  if (!frame || frame.nativeCanvasGeneration !== generation) return NO_COMPLETED_RESOURCES;
  return {
    sdssOptical: liveSkyOpticalCompletion(frame.sdssOptical),
    preparedRegions: frame.preparedRegions.map(liveSkyOpticalCompletion).filter((value): value is SkyPreparedOpticalCompletion =>
      value?.kind === "prepared"),
    deepSkyImage: frame.deepSkyImage?.canvasGeneration === generation && frame.deepSkyImage.isCurrent?.() !== false &&
      skyNativeImageIsCurrent(frame.deepSkyImage.image) ? frame.deepSkyImage : null,
    galacticImage: frame.galacticImage && skyNativeImageIsCurrent(frame.galacticImage.image) ? frame.galacticImage : null,
    opticalHips: frame.opticalHips.filter(tile => skyNativeImageIsCurrent(tile.image)),
    bodyImages: frame.bodyImages.filter(binding => skyNativeImageIsCurrent(binding.image)),
    landscape: frame.landscape,
  };
}
