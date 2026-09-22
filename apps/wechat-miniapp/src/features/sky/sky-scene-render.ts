import type { DisplayMode } from "@starward/miniapp-contracts";
import type { DeviceOrientationFrame as DevicePose } from "./device-orientation-view";
import { projectSkyDirection, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import { resolveSkySceneFrame, type ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { exactSkyTimeFrame } from "./sky-time-frame";
import type { DeepSkyImageAsset } from "./deep-sky-image-request";
import type { PaintedSkyObject, SkyPickSnapshot } from "./sky-object-picking";
import { SKY_OBSERVING_VERTICAL_FOV_DEG as SKY_VERTICAL_FOV_DEG } from "./sky-zoom";
import { projectSkyTarget } from "./sky-scene-projection";
import type { SkyRenderSurface, SkyLineSegment } from "./sky-render-surface";
import { drawSkyConstellations, type SkyConstellationLayer } from "./sky-constellation-render";
import { skyStarAppearance } from "./sky-star-appearance";
import {currentStellarSupplement,type SkyStellarSupplementFrame} from './sky-stellar-supplement-scene';
import { registerSkySurvey } from "./sky-survey-registration";
type SkyCanvasImageAsset = DeepSkyImageAsset & { image: object };

export function skyPickIdentity(data: SkyReport | undefined, supplement?:SkyStellarSupplementFrame|null) {
  const star = data?.skyScene.catalog;
  const deep = data?.skyScene.deepSky?.catalog;
  return {
    catalogVersion: [star?.catalogVersion, deep?.catalogVersion, supplement?.catalogVersion].filter(Boolean).join("+"),
    catalogHash: [star?.catalogHash, deep?.catalogHash, supplement?.publicationHash].filter(Boolean).join(":"),
  };
}

export function drawSkyScene(
  context: SkyRenderSurface,
  data: SkyReport | undefined,
  frameAt: string | undefined,
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  mode: DisplayMode,
  painted?: (snapshot: SkyPickSnapshot | null) => void,
  completed?: () => void,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  deepSkyImage: SkyCanvasImageAsset | null = null,
  manualBasis: SkyViewBasis | null = null,
  center?: SkyProjectionCenter,
  imageFailed?: (asset: DeepSkyImageAsset) => void,
  constellations?: SkyConstellationLayer,
  supplement?:SkyStellarSupplementFrame|null,
) {
  const palette =
    mode === "OBSERVATION"
      ? {
          canvas: "#000000",
          grid: "#7A1E18",
          gridSoft: "#240000",
          text: "#FF6B58",
          muted: "#C23D32",
          target: "#D84A3C",
          event: "#FF6B58",
        }
      : {
          // The adopted Cloud Stargazing surface is a deep sky in both
          // ordinary app modes. Observation alone swaps the whole surface to
          // the approved black and warm-red palette.
          canvas: "#080D17",
          grid: "#536782",
          gridSoft: "#29374B",
          text: "#DCE4EF",
          muted: "#7F90A8",
          target: "#AABCCA",
          event: "#CFC19A",
        };
  context.begin(width, height, palette.canvas);
  const inputBasis = manualBasis ?? pose?.basis ?? null;
  const basis = inputBasis;
  // Missing pose has no invented North-facing view. Recovery/list semantics
  // remain available outside this canvas until a trusted stream is present.
  if (!data || !basis) {
    context.finish();
    painted?.(null);
    completed?.();
    return;
  }
  const paintedObjects: PaintedSkyObject[] = [];
  const project = (azimuth: number, altitude: number) =>
    projectSkyDirection(azimuth, altitude, basis, width, height, verticalFovDeg, center);
  const deepCatalog = data.skyScene.deepSky?.state === "AVAILABLE" ? data.skyScene.deepSky.catalog : null;
  const deepFrame = exactSkyTimeFrame(data.skyScene.deepSky?.frames, frameAt);
  if (mode !== "OBSERVATION" && deepSkyImage && deepCatalog?.imageRegistration === "ICRS_TAN_NORTH_0_1_V1" && deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    const imageIndex = deepCatalog.entries.findIndex(entry => entry.objectRef === deepSkyImage.reference);
    const point = deepFrame.points.find(candidate => candidate[0] === imageIndex);
    if (point) {
      const registration = registerSkySurvey(point, deepSkyImage.fieldDegrees, deepSkyImage.level === "OVERVIEW" ? 256 : 512);
      if (!registration || !context.artwork(deepSkyImage.image, registration, {basis,verticalFovDeg,...(center ? {center} : {})}, .58, "#FFFFFF"))
        imageFailed?.(deepSkyImage);
    }
  }
  // The horizon is a world-space great circle, not fixed screen decoration.
  // Break paths at clipped samples so a hidden arc cannot cross the viewport.
  for (const altitude of [0, 30, 60]) {
    const lines: SkyLineSegment[] = [];
    let previous: {x: number; y: number} | null = null;
    for (let azimuth = 0; azimuth <= 360; azimuth += 1) {
      const point = project(azimuth, altitude);
      if (point && previous) lines.push([previous.x, previous.y, point.x, point.y]);
      previous = point;
    }
    context.segments(lines, altitude === 0 ? palette.grid : palette.gridSoft);
  }

  if (constellations && constellations.frame?.at === frameAt) {
    drawSkyConstellations(context,constellations,{basis,verticalFovDeg,...(center ? {center} : {})},width,height,mode === "OBSERVATION");
  }
  const catalog = data.skyScene.state === "AVAILABLE" ? data.skyScene.catalog : null;
  const frame = resolveSkySceneFrame(data.skyScene, frameAt);
  if (catalog && frame?.state === "AVAILABLE" && frame.points) {
    frame.points.forEach((point) => {
      const [catalogIndex, azimuthDeg, altitudeDeg] = point;
      if (altitudeDeg <= 0) return;
      const entry = catalog.entries[catalogIndex];
      if (!entry) return;
      const appearance = skyStarAppearance(entry.magnitude, verticalFovDeg);
      if (!appearance) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      const starColor =
        mode === "OBSERVATION"
          ? palette.target
          : entry.colorIndex !== null && entry.colorIndex < 0.5
            ? "#D8E5FF"
            : entry.colorIndex !== null && entry.colorIndex > 1.5
              ? "#FFE6C6"
              : palette.text;
      context.disc(projection.x, projection.y, appearance.radiusPx, starColor, appearance.opacity);
      // Subpixel fade remnants are not useful touch targets. Drawing and picking
      // share this frame, so fully hidden stars can never open an invisible object.
      if (appearance.opacity < 0.1) return;
      paintedObjects.push({
        reference: entry.objectRef,
        displayName: entry.displayName ?? entry.objectRef.replace(":", " "),
        kind: "STAR",
        magnitude: entry.magnitude,
        x: projection.x,
        y: projection.y,
      });
    });
  }

  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);
  for(const [reference,magnitude,azimuthDeg,altitudeDeg] of currentSupplement?.points??[]){
    const appearance=skyStarAppearance(magnitude,verticalFovDeg);if(!appearance)continue;
    const projection=project(azimuthDeg,altitudeDeg);if(!projection)continue;
    // SAO supplies no adopted colour index. Use the neutral sky palette.
    context.disc(projection.x,projection.y,appearance.radiusPx,mode==='OBSERVATION'?palette.target:palette.text,appearance.opacity);
    if(appearance.opacity>=.1)paintedObjects.push({reference,displayName:reference.replace(':',' '),kind:'STAR',magnitude,magnitudeBand:'VISUAL',x:projection.x,y:projection.y});
  }

  if (deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    deepFrame.points.forEach(([catalogIndex, azimuthDeg, altitudeDeg]) => {
      if (altitudeDeg <= 0) return;
      const entry = deepCatalog.entries[catalogIndex];
      if (!entry) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      context.disc(projection.x, projection.y, 3.2, mode === "OBSERVATION" ? palette.target : "#A9BDD6", 0.9, 1);
      paintedObjects.push({
        reference: entry.objectRef,
        displayName: entry.displayName,
        kind: entry.kind,
        magnitude: entry.magnitude,
        x: projection.x,
        y: projection.y,
      });
    });
  }

  const targetFrame = exactSkyTimeFrame(data.targetFrames, frameAt);
  (targetFrame?.targets ?? []).forEach((target) => {
    const projection = projectSkyTarget(target, heading, pose, width, height, verticalFovDeg, manualBasis, center);
    if (!projection) return;
    const isEvent =
      target.type === "METEOR_SHOWER" ||
      target.type === "CONJUNCTION" ||
      target.type === "MILKY_WAY";
    const mark = mode === "OBSERVATION"
      ? palette.target
      : isEvent
        ? palette.event
        : palette.target;
    context.disc(projection.x, projection.y, target.type === "MILKY_WAY" ? 6 : 4, mark, 1);
    if (target.type === "CONSTELLATION" || target.type === "MILKY_WAY") {
      context.segments([[projection.x-8,projection.y,projection.x+8,projection.y],
        [projection.x,projection.y-8,projection.x,projection.y+8]], mark);
    }
  });
  context.finish();
  const identity = skyPickIdentity(data,currentSupplement);
  painted?.(identity.catalogVersion && frameAt ? {
    catalogVersion: identity.catalogVersion,
    catalogHash: identity.catalogHash,
    frameAt,
    width,
    height,
    objects: paintedObjects,
  } : null);
  completed?.();
}
