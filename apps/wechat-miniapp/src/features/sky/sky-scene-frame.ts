import type { DisplayMode, GalacticImageManifestData, OpticalHipsManifestData } from "@starward/miniapp-contracts";
import type { DeviceOrientationFrame } from "./device-orientation-view";
import { sameSkyViewBasis, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyStellarSupplementFrame } from "./sky-stellar-supplement-scene";
import type { SkyDeepSkyImageField } from "./sky-deep-sky-image-frame";
import type { SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import type { SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";
import type { SkyScenePreparedOpticalPort, SkyScenePreparedOpticalRegion } from "./sky-prepared-optical-scene";
import type { SkySceneScienceOpticalPort, SkySceneCalibratedOpticalPort } from "./sky-sdss-science-scene";
import type { SkyConstellationLayer } from "./sky-constellation-render";
import type { ConstellationFrame } from "./sky-constellation-scene";
import type { SkyLandscapeMask, SkyLandscapePanorama, SkyPanoramaMask } from "./sky-landscape-mask";
import type { SkyBodyImageBinding } from "./sky-body-image-completion";
import type { SkyPlanetDisc } from "./sky-planet-disc";
import type { SkyPickSnapshot } from "./sky-object-picking";
import type { SkyStarTransitionFrame } from "./sky-star-transition";
import type { SkyStarDrawPreparation } from "./sky-star-draw-preparation";
import type { SkyReadyImageFrame } from "./sky-ready-presentation";

export type SkySceneInfraredImage = SkyDeepSkyImageField & {
  readonly coarser?: SkyDeepSkyImageField | null;
  readonly fallback?: SkyDeepSkyImageField | null;
};
export interface SkyCoordinateGrids { readonly horizontal: boolean; readonly equatorial: boolean }
export interface SkyHipsCanvasTile {
  readonly layer: "WIDE_FIELD_W3" | "OPTICAL";
  /** Explicit publication source; absence cannot establish same-source LOD. */
  readonly sourceId?: string;
  readonly publication?: OpticalHipsManifestData;
  readonly order: number;
  readonly pixel: number;
  readonly image: object;
  /** Withdraw only after a successful same-version opaque parent submission. */
  readonly retainedDetailFallback?: boolean;
}
export interface SkyGalacticImageCompletion { readonly image: object; readonly publication: GalacticImageManifestData }
/** Successful texture submission, not a claim of unoccluded scientific samples. */
export interface SkyBodyImagePaint {
  readonly reference: "SOLAR:MOON" | `PLANET:${SkyPlanetDisc["body"]}`;
  readonly image: object;
}
export interface SkyScenePaintedSources {
  readonly sdssOptical: SkyTargetOpticalCompletion | null;
  readonly deepSkyImage: object | null;
  readonly preparedRegions?: readonly SkyTargetOpticalCompletion[];
  readonly galacticImage?: SkyGalacticImageCompletion | null;
  readonly opticalHips?: readonly SkyHipsCanvasTile[];
  readonly bodyImages?: readonly SkyBodyImagePaint[];
}
export interface SkySceneLandscapeInput {
  readonly enabled: boolean;
  readonly panorama?: SkyLandscapePanorama | null;
  readonly mask?: SkyPanoramaMask | null;
  readonly readiness?: number;
  readonly pending?: boolean;
  readonly failed?: boolean;
  /** Last completed material of this live Canvas, never a requested source. */
  readonly previous?: SkyLandscapeMask | null;
}

/** One admission of the existing observer/Context, catalogue editions, exact
 * time, camera and Canvas generation. Candidate native images are deliberately
 * absent: a pick reader must not keep every attempted bitmap alive. */
export interface SkySceneFrameIdentity {
  readonly observation: {
    readonly data: ResolvedSkyReport | undefined;
    readonly frameAt: string | undefined;
    readonly stellarSupplement?: SkyStellarSupplementFrame | null;
    readonly constellations?: ConstellationFrame | null;
  };
  readonly view: {
    readonly heading: number | null;
    readonly pose: DeviceOrientationFrame | null;
    readonly manualBasis: SkyViewBasis | null;
    readonly mode: DisplayMode;
    readonly verticalFovDeg: number;
    readonly center?: SkyProjectionCenter;
  };
  readonly canvas: { readonly generation: number; readonly width: number; readonly height: number };
}

/** Native bitmaps remain live external resources under their current owners.
 * Only actual typed completions become published image/source bindings. */
export interface SkySceneResourceInputs {
  readonly layers?: {
    readonly coordinateGrids?: SkyCoordinateGrids;
    readonly constellations?: Omit<SkyConstellationLayer, "failed" | "frame">;
    readonly landscape?: SkySceneLandscapeInput;
  };
  readonly imagery?: {
    readonly infrared?: SkySceneInfraredImage | null;
    readonly targetOptical?: {
      readonly image: SkyTargetOpticalImage | null;
      readonly science?: SkySceneScienceOpticalPort;
      readonly prepared?: SkyScenePreparedOpticalPort;
      readonly calibrated?: SkySceneCalibratedOpticalPort;
    };
    readonly preparedRegions?: readonly SkyScenePreparedOpticalRegion[];
    readonly hipsTiles?: readonly SkyHipsCanvasTile[];
    readonly bodyImages?: readonly SkyBodyImageBinding[];
    readonly galactic?: { readonly image: object | null; readonly publication: GalacticImageManifestData | null };
  };
}

function snapshotBasis(basis: SkyViewBasis | null): SkyViewBasis | null {
  return basis && Object.freeze({
    right: Object.freeze([...basis.right]) as SkyViewBasis["right"],
    up: Object.freeze([...basis.up]) as SkyViewBasis["up"],
    forward: Object.freeze([...basis.forward]) as SkyViewBasis["forward"],
  });
}

/** Compare the original scientific editions and exact admitted view. */
export function sameSkySceneFrameIdentity(left: SkySceneFrameIdentity, right: SkySceneFrameIdentity): boolean {
  const a = left.view, b = right.view, pa = a.pose, pb = b.pose;
  return left.observation.data === right.observation.data && left.observation.frameAt === right.observation.frameAt &&
    left.observation.stellarSupplement === right.observation.stellarSupplement &&
    left.observation.constellations === right.observation.constellations &&
    left.canvas.generation === right.canvas.generation && left.canvas.width === right.canvas.width && left.canvas.height === right.canvas.height &&
    a.mode === b.mode && a.heading === b.heading && a.verticalFovDeg === b.verticalFovDeg &&
    sameSkyViewBasis(a.manualBasis, b.manualBasis) && a.center?.x === b.center?.x && a.center?.y === b.center?.y &&
    (pa === pb || Boolean(pa && pb && pa.alphaDeg === pb.alphaDeg && pa.betaDeg === pb.betaDeg &&
      pa.gammaDeg === pb.gammaDeg && pa.headingDeg === pb.headingDeg && pa.sampledAt === pb.sampledAt && sameSkyViewBasis(pa.basis, pb.basis)));
}

/** Snapshot small admission records, retaining the existing immutable data
 * owners. Never recursively freeze reports, native nodes or mutable work. */
export function createSkySceneFrameIdentity(input: SkySceneFrameIdentity,
  previous?: SkySceneFrameIdentity | null): SkySceneFrameIdentity {
  // Equivalent repaint/resource arrival may keep the existing accepted identity;
  // this is explicit caller-owned reuse, not another cache or frame writer.
  if (previous && sameSkySceneFrameIdentity(input, previous)) return previous;
  return Object.freeze({
    observation: Object.freeze({ ...input.observation }),
    view: Object.freeze({ ...input.view, manualBasis: snapshotBasis(input.view.manualBasis),
      pose: input.view.pose && Object.freeze({ ...input.view.pose, basis: snapshotBasis(input.view.pose.basis)! }),
      ...(input.view.center ? { center: Object.freeze({ ...input.view.center }) } : {}) }),
    canvas: Object.freeze({ ...input.canvas }),
  });
}

/** Mutable preparations stay with their original owners. A completed identity
 * must never retain these as its published scientific or resource facts. */
export interface SkySceneFrameInput extends SkySceneResourceInputs {
  readonly identity: SkySceneFrameIdentity;
  readonly work?: {
    readonly starTransitions?: SkyStarTransitionFrame;
    readonly readyImages?: SkyReadyImageFrame;
    readonly starDrawing?: SkyStarDrawPreparation;
  };
}
export interface SkyScenePaintResult {
  readonly identity: SkySceneFrameIdentity;
  readonly snapshot: SkyPickSnapshot | null;
  readonly sources: SkyScenePaintedSources;
}
export type SkySceneFailure =
  | { readonly kind: "infrared"; readonly asset: SkyDeepSkyImageField }
  | { readonly kind: "target-optical"; readonly image: object }
  | { readonly kind: "constellation"; readonly image: object }
  | { readonly kind: "hips"; readonly tile: SkyHipsCanvasTile }
  | { readonly kind: "solar-light" }
  | { readonly kind: "moon" }
  | { readonly kind: "planet" }
  | { readonly kind: "sun-disc" }
  | { readonly kind: "galactic-band" }
  | { readonly kind: "scene"; readonly error: unknown };
export interface SkyScenePorts {
  /** Scene finish is not the later successful Canvas-copy acceptance. */
  painted?(result: SkyScenePaintResult): void;
  completed?(identity: SkySceneFrameIdentity): void;
  /** Family failures preserve independent content; scene failures still throw
   * into the existing Canvas lifecycle for invalidation and retirement. */
  failed?(failure: SkySceneFailure, identity: SkySceneFrameIdentity): void;
  landscapeAvailability?(available: boolean | null, identity: SkySceneFrameIdentity): void;
}
