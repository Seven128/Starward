import { DEEP_SKY_IMAGE_PIXELS, type DisplayMode } from "@starward/miniapp-contracts";
import type { DeviceOrientationFrame as DevicePose } from "./device-orientation-view";
import { createSkyDirectionProjector, unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import { resolveSkyDeepSkyScene, resolveSkySceneFrame, type ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { exactSkyTimeFrame } from "./sky-time-frame";
import type { DeepSkyImageAsset } from "./deep-sky-image-request";
import type { PaintedSkyObject, SkyPickSnapshot } from "./sky-object-picking";
import { SKY_OBSERVING_VERTICAL_FOV_DEG as SKY_VERTICAL_FOV_DEG } from "./sky-zoom";
import { projectSkyTarget } from "./sky-scene-projection";
import type { SkyLineSegment, SkyRenderSurface } from "./sky-render-surface";
import { drawSkyConstellations, type SkyConstellationLayer } from "./sky-constellation-render";
import { skyStarAppearance } from "./sky-star-appearance";
import {currentStellarSupplement,type SkyStellarSupplementFrame} from './sky-stellar-supplement-scene';
import { registerSkySurvey } from "./sky-survey-registration";
import { artworkIntersectsView, artworkDisplaySupportIntersectsView, skyArtworkViewRayHull } from "./sky-artwork-visibility";
import { deepSkyAuxiliaryOpacity } from "./sky-deep-auxiliary-visibility";
import type { SkyArtworkRegistration } from "./sky-artwork-registration";
import { PROCEDURAL_SKY_LANDSCAPE, skyLandscapeMaskCoversRayHull, skyPanoramaMaskIntersectsView,
  type SkyLandscapeMask, type SkyLandscapePanorama, type SkyPanoramaMask } from "./sky-landscape-mask";
import { skySolarLightAt } from "./sky-solar-light";
import { skyGalacticBandAt } from "./sky-galactic-band";
import { skySunDiscAt } from "./sky-sun-disc";
import { skyMoonDiscAt } from "./sky-moon-disc";
import { skyPlanetDiscsAt } from "./sky-planet-disc";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { skyHorizontalGrid } from "./sky-horizontal-grid";
import { skyEquatorialGrid } from "./sky-equatorial-grid";
import { prepareSkyHipsTile, projectSkyHipsTileMesh } from "./sky-hips-tile-mesh";
import { SKY_PLANET_CATALOG_HASH, SKY_PLANET_CATALOG_VERSION, SKY_PLANET_NAMES,
  SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_CATALOG_VERSION, SKY_LUMINARY_NAMES } from "@starward/miniapp-contracts";
type SkyCanvasImageAsset = DeepSkyImageAsset & { image: object };
export type SkySdssOpticalField = { image: object; fieldDegrees: number; level: "OVERVIEW" | "MEDIUM" | "DETAIL" };
export type SkySdssOpticalImage = SkySdssOpticalField & { reference: string; publicationHash: string;
  /** A wider field of this same optical publication, never another spectrum. */
  coarser?: SkySdssOpticalField | null };
export type SkyScenePaintedSources = { sdssOpticalImage: object | null; deepSkyImage: object | null };
export interface SkyCoordinateGrids { horizontal: boolean; equatorial: boolean }
export interface SkyHipsCanvasTile {
  layer:"WIDE_FIELD_W3"|"OPTICAL";
  order:number;
  pixel:number;
  image:object;
}
export function dispatchSkyHipsImageFailure(tile:SkyHipsCanvasTile,
  wideFieldFailed:(image:object)=>void,opticalFailed:(image:object)=>void):void {
  if(tile.layer==="WIDE_FIELD_W3")wideFieldFailed(tile.image);
  else opticalFailed(tile.image);
}
const WIDE_FIELD_GEOMETRY=Array.from({length:12},(_,pixel)=>prepareSkyHipsTile(0,pixel,16));

// A restrained screen palette for catalogued Johnson B-V, not a measured RGB
// colour or a temperature estimate. Missing SAO/BSC photometry stays neutral.
const STAR_COLOR_STOPS = [
  [-0.3, 190, 216, 255],
  [0, 218, 232, 255],
  [0.5, 242, 243, 245],
  [1, 255, 228, 204],
  [1.5, 255, 199, 167],
  [2, 255, 181, 153],
] as const;

export function skyStarDisplayColor(colorIndex: number | null): string | null {
  if (colorIndex === null || !Number.isFinite(colorIndex)) return null;
  const first = STAR_COLOR_STOPS[0]!;
  const last = STAR_COLOR_STOPS[STAR_COLOR_STOPS.length - 1]!;
  const value = Math.max(first[0], Math.min(last[0], colorIndex));
  const upperIndex = STAR_COLOR_STOPS.findIndex(stop => stop[0] >= value);
  const upper = STAR_COLOR_STOPS[Math.max(upperIndex, 1)]!;
  const lower = STAR_COLOR_STOPS[Math.max(upperIndex - 1, 0)]!;
  const fraction = (value - lower[0]) / (upper[0] - lower[0]);
  const channel = (index: 1 | 2 | 3) => Math.round(lower[index] + (upper[index] - lower[index]) * fraction)
    .toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(2)}${channel(3)}`.toUpperCase();
}

/** Keep CPU ring strokes on the same true horizon as the globe fragment shader. */
function visibleRingSegment(segment:SkyLineSegment,basis:SkyViewBasis,width:number,height:number,
  verticalFovDeg:number,center?:SkyProjectionCenter):SkyLineSegment|null{
  const altitude=(x:number,y:number)=>unprojectSkyPoint(x,y,basis,width,height,verticalFovDeg,center)?.[2]??-1;
  let [x0,y0,x1,y1]=segment;
  let z0=altitude(x0,y0),z1=altitude(x1,y1);
  if(z0<0&&z1<0)return null;
  if(z0>=0&&z1>=0)return segment;
  let low=0,high=1;
  for(let i=0;i<18;i++){
    const middle=(low+high)/2;
    const z=altitude(x0+(x1-x0)*middle,y0+(y1-y0)*middle);
    if((z>=0)===(z0>=0))low=middle;else high=middle;
  }
  const t=(low+high)/2,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
  if(z0<0){x0=x;y0=y;}else{x1=x;y1=y;}
  return [x0,y0,x1,y1];
}

export function skyPickIdentity(data: SkyReport | undefined, supplement?:SkyStellarSupplementFrame|null) {
  const star = data?.skyScene.catalog;
  const deep = data?.skyScene.deepSky?.catalog;
  return {
    catalogVersion: [star?.catalogVersion, deep?.catalogVersion, supplement?.catalogVersion, SKY_PLANET_CATALOG_VERSION, SKY_LUMINARY_CATALOG_VERSION].filter(Boolean).join("+"),
    catalogHash: [star?.catalogHash, deep?.catalogHash, supplement?.publicationHash, SKY_PLANET_CATALOG_HASH, SKY_LUMINARY_CATALOG_HASH].filter(Boolean).join(":"),
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
  painted?: (snapshot: SkyPickSnapshot | null, sources: SkyScenePaintedSources) => void,
  completed?: () => void,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  deepSkyImage: SkyCanvasImageAsset | null = null,
  manualBasis: SkyViewBasis | null = null,
  center?: SkyProjectionCenter,
  imageFailed?: (asset: DeepSkyImageAsset) => void,
  constellations?: SkyConstellationLayer,
  supplement?:SkyStellarSupplementFrame|null,
  solarLightFailed?: () => void,
  moonFailed?: () => void,
  planetFailed?: () => void,
  sunDiscFailed?: () => void,
  hipsTiles?: readonly SkyHipsCanvasTile[],
  hipsImageFailed?: (tile: SkyHipsCanvasTile) => void,
  galacticBandFailed?: () => void,
  moonTexture?: object | null,
  marsTexture?: object | null,
  galacticImage?: object | null,
  mercuryTexture?: object | null,
  jupiterBands?: object | null,
  saturnBands?: object | null,
  sdssOpticalImage?: SkySdssOpticalImage | null,
  sdssOpticalFailed?: (image: object) => void,
  uranusBands?: object | null,
  neptuneBands?: object | null,
  landscape?: { enabled: boolean; panorama?: SkyLandscapePanorama | null; mask?: SkyPanoramaMask | null;
    availability?: (available: boolean) => void },
  grids: SkyCoordinateGrids = { horizontal: true, equatorial: false },
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
          // The sky remains dark in ordinary modes. Observation uses the
          // established black and warm-red palette.
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
    painted?.(null, { sdssOpticalImage: null, deepSkyImage: null });
    completed?.();
    return;
  }
  const sun = skySolarLightAt(data.hourly,frameAt);
  if (mode !== "OBSERVATION" && sun && !context.solarLight(
    {basis,verticalFovDeg,...(center ? {center} : {})},sun)) solarLightFailed?.();
  const galacticBand = mode === "OBSERVATION" ? null : skyGalacticBandAt(data,frameAt,verticalFovDeg);
  if (galacticBand && !context.galacticBand(
    {basis,verticalFovDeg,...(center ? {center} : {})},galacticBand,
    hipsTiles?.some(tile=>tile.layer==="WIDE_FIELD_W3")?null:galacticImage)) galacticBandFailed?.();
  // Historical W3 belongs below registered target cutouts; optical tiles,
  // including a published order-0 base, belong above them. Resolution is not
  // a layer identity. Both use the same exact sky frame and native mesh.
  const observation=mode === "OBSERVATION" ? null : exactSkyObservationFrame(data,frameAt);
  const drawHips=(tiles:readonly SkyHipsCanvasTile[],opacity:number)=>{
    if(!observation)return;
    const view={basis,verticalFovDeg,...(center ? {center} : {})};
    for(const tile of tiles){
      const geometry=tile.order===0?WIDE_FIELD_GEOMETRY[tile.pixel]:prepareSkyHipsTile(tile.order,tile.pixel);
      const triangles=geometry&&projectSkyHipsTileMesh(geometry,observation.equatorialToEnu,view,width,height);
      if(triangles?.length&&!context.skyImageMesh(tile.image,triangles,view,opacity))hipsImageFailed?.(tile);
    }
  };
  // The optional historical W3 layer enters with the same exact-time
  // Galactic twilight curve; an already decoded tile must not pop in at -12°.
  if(hipsTiles?.length&&galacticBand?.strength)drawHips(
    hipsTiles.filter(tile=>tile.layer==="WIDE_FIELD_W3"),.48*galacticBand.strength);
  const paintedObjects: PaintedSkyObject[] = [];
  const projector = createSkyDirectionProjector(basis,width,height,verticalFovDeg,center);
  const project = (azimuth: number, altitude: number) =>
    projector?.project(azimuth,altitude) ?? null;
  const deepScene = resolveSkyDeepSkyScene(data.skyScene, frameAt);
  const deepCatalog = deepScene?.catalog;
  const deepFrame = deepScene?.frame;
  let paintedSdssOpticalImage: object | null = null;
  let paintedDeepSkyImage: object | null = null;
  const paintedSdssFields: Array<{ image: object; registration: SkyArtworkRegistration }> = [];
  let deepSkyRegistration:SkyArtworkRegistration|null=null;
  const artworkView = { basis, verticalFovDeg, ...(center ? { center } : {}) };
  const drawInfraredCutout = (): {image:object;registration:SkyArtworkRegistration} | null => {
    if (mode === "OBSERVATION" || !deepSkyImage || deepCatalog?.imageRegistration !== "ICRS_TAN_NORTH_0_1_V1" || deepFrame?.state !== "AVAILABLE" || !deepFrame.points) return null;
    const imageIndex = deepCatalog.entries.findIndex(entry => entry.objectRef === deepSkyImage.reference);
    const point = deepFrame.points.find(candidate => candidate[0] === imageIndex);
    if (point) {
      const pixels = DEEP_SKY_IMAGE_PIXELS[deepSkyImage.level];
      const registration = registerSkySurvey(point, deepSkyImage.fieldDegrees, pixels, pixels/2);
      if (!registration) imageFailed?.(deepSkyImage);
      else if (artworkIntersectsView(registration, artworkView, width, height) &&
        artworkDisplaySupportIntersectsView(registration, artworkView, width, height, deepSkyImage.displaySupport)) {
        if (context.artwork(deepSkyImage.image, registration, artworkView, .58, "#FFFFFF", "infrared-cutout")) {
          return { image: deepSkyImage.image, registration };
        }
        else imageFailed?.(deepSkyImage);
      }
    }
    return null;
  };
  if (mode !== "OBSERVATION" && sdssOpticalImage && deepCatalog?.imageRegistration === "ICRS_TAN_NORTH_0_1_V1" &&
    deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    const index = deepCatalog.entries.findIndex(entry => entry.objectRef === sdssOpticalImage.reference);
    const point = deepFrame.points.find(candidate => candidate[0] === index);
    if (point) {
      // SDSS SkyServer centers its JPEG on the requested coordinates. The
      // even-sized image has its geometric center between four pixels.
      const coarser = sdssOpticalImage.coarser;
      const fields = coarser && coarser.image !== sdssOpticalImage.image && coarser.fieldDegrees > sdssOpticalImage.fieldDegrees
        ? [coarser, sdssOpticalImage] : [sdssOpticalImage];
      for (const field of fields) {
        const registration = registerSkySurvey(point, field.fieldDegrees, 512, 256.5);
        if (!registration) sdssOpticalFailed?.(field.image);
        else if (artworkIntersectsView(registration, artworkView, width, height)) {
          if (context.artwork(field.image, registration, artworkView, 1, "#FFFFFF", "optical-cutout")) {
            paintedSdssOpticalImage = field.image;
            paintedSdssFields.push({ image: field.image, registration });
          }
          else sdssOpticalFailed?.(field.image);
        }
      }
    }
  }
  // The scene owns one selected target cutout. A painted optical field takes
  // precedence; its edge must not blend with a different infrared spectrum
  // (including a retained previous target). Failure/offscreen optical keeps
  // the independent infrared path and its actual object/provenance.
  const infraredSubmission = !paintedSdssOpticalImage ? drawInfraredCutout() : null;
  paintedDeepSkyImage = infraredSubmission?.image ?? null;
  deepSkyRegistration = infraredSubmission?.registration ?? null;
  // Higher-resolution HiPS tiles cover the coarser registered object image.
  // Their observer transform is independent of bright-star catalog health.
  if(hipsTiles?.length)drawHips(hipsTiles.filter(tile=>tile.layer==="OPTICAL"),.8);
  const grid = skyHorizontalGrid(basis, width, height, verticalFovDeg, center, grids.horizontal);
  context.segments(grid.horizon, palette.grid);
  if (grids.horizontal) {
    context.segments(grid.altitude, palette.gridSoft);
    context.segments(grid.meridians, palette.gridSoft, 0.65);
  }
  const gridFrame = grids.equatorial ? observation ?? exactSkyObservationFrame(data, frameAt) : null;
  if (gridFrame) {
    const equatorial = skyEquatorialGrid(gridFrame, basis, width, height, verticalFovDeg, center);
    const color = mode === "OBSERVATION" ? "#6B211B" : "#5D7183";
    context.segments(equatorial.equator, color, 0.85);
    context.segments(equatorial.parallels, color, 0.55);
    context.segments(equatorial.meridians, color, 0.55);
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
      const appearance = skyStarAppearance(entry.magnitude, verticalFovDeg,
        mode === "OBSERVATION" ? undefined : sun?.altitudeDeg,
        mode === "OBSERVATION" ? undefined : altitudeDeg);
      if (!appearance) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      const starColor = mode === "OBSERVATION"
        ? palette.target : skyStarDisplayColor(entry.colorIndex) ?? palette.text;
      context.disc(projection.x, projection.y, appearance.radiusPx, starColor, appearance.opacity, 0, "star");
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
    const appearance=skyStarAppearance(magnitude,verticalFovDeg,
      mode === "OBSERVATION" ? undefined : sun?.altitudeDeg,
      mode === "OBSERVATION" ? undefined : altitudeDeg);if(!appearance)continue;
    const projection=project(azimuthDeg,altitudeDeg);if(!projection)continue;
    // SAO supplies no adopted colour index. Use the neutral sky palette.
    context.disc(projection.x,projection.y,appearance.radiusPx,mode==='OBSERVATION'?palette.target:palette.text,appearance.opacity,0,"star");
    if(appearance.opacity>=.1)paintedObjects.push({reference,displayName:reference.replace(':',' '),kind:'STAR',magnitude,magnitudeBand:'VISUAL',x:projection.x,y:projection.y});
  }

  const solarDisc=skySunDiscAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center);
  const discView={basis,verticalFovDeg,...(center?{center}:{})};
  if (solarDisc) {
    if (context.sun(solarDisc,discView,mode === "OBSERVATION")) paintedObjects.push({
      reference: "SOLAR:SUN", displayName: SKY_LUMINARY_NAMES.SUN.zh, kind: SKY_LUMINARY_NAMES.SUN.kind,
      magnitude: null, x: solarDisc.x, y: solarDisc.y,
      hitDisc: { majorRadiusPx: solarDisc.radiusPx, minorRadiusPx: solarDisc.radiusPx, minorDirection: [0, 1] },
    });
    else sunDiscFailed?.();
  }
  const moon = skyMoonDiscAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center);
  if (moon) {
    if (context.moon(moon,discView,mode === "OBSERVATION",moonTexture)) paintedObjects.push({
      reference: "SOLAR:MOON", displayName: SKY_LUMINARY_NAMES.MOON.zh, kind: SKY_LUMINARY_NAMES.MOON.kind,
      magnitude: null, x: moon.x, y: moon.y,
      hitDisc: { majorRadiusPx: moon.radiusPx, minorRadiusPx: moon.radiusPx, minorDirection: [0, 1] },
    });
    else moonFailed?.();
  }

  const planetColors = { MERCURY: "#C8BAB0", VENUS: "#EADFC7", MARS: "#D9A080",
    JUPITER: "#D8C2A7", SATURN: "#D9CAA7", URANUS: "#B9D9D9", NEPTUNE: "#A8BDE0" } as const;
  const handledPlanets = new Set<string>();
  const suppressedBodyReferences: string[] = [];
  for (const planet of skyPlanetDiscsAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center) ?? []) {
    const tint = planetColors[planet.body];
    let pickable = false;
    const hitSegments:SkyLineSegment[]=[];
    if (planet.radiusPx >= 1.2) {
      if (!context.planet(planet,discView,tint,mode === "OBSERVATION",
        planet.body==="MARS"?marsTexture:planet.body==="MERCURY"?mercuryTexture:
          planet.body==="JUPITER"?jupiterBands:planet.body==="SATURN"?saturnBands:
          planet.body==="URANUS"?uranusBands:planet.body==="NEPTUNE"?neptuneBands:null)) { planetFailed?.(); continue; }
      // A resolved limb or ring can remain after its centre sets. Publish the
      // successful shape; shared picking clips actual touches to this view.
      pickable = true;
      const continuousRings=planet.body === "SATURN" && planet.rings.length>0 &&
        context.saturnRings(planet,discView,mode === "OBSERVATION" ? palette.target : "#D8C7A5",mode === "OBSERVATION");
      if (planet.body === "SATURN") for (const ring of planet.rings) {
        const ringTint=mode === "OBSERVATION" ? palette.target : "#D8C7A5";
        const paintRing=(allSegments:readonly SkyLineSegment[],color:string)=>{
          // The outer A ring reaches 1.175 body diameters from the centre.
          const segments=planet.altitudeDeg>1.2*planet.angularDiameterDeg?allSegments:
            allSegments.flatMap(segment=>{
            const visible=visibleRingSegment(segment,basis,width,height,verticalFovDeg,center);
            return visible?[visible]:[];
          });
          if(segments.length){if(!continuousRings)context.segments(segments,color,ring.opacity);hitSegments.push(...segments);}
        };
        paintRing([...ring.back,...ring.front],ringTint);
        paintRing([...ring.shadowBack,...ring.shadowFront],
          mode === "OBSERVATION" ? "#4B211D" : "#4E473B");
      }
    } else {
      if(planet.altitudeDeg<=0)continue;
      const appearance = skyStarAppearance(planet.visualMagnitude,verticalFovDeg,
        mode === "OBSERVATION" ? undefined : sun?.altitudeDeg,
        mode === "OBSERVATION" ? undefined : planet.altitudeDeg);
      if (!appearance || appearance.opacity < .1) {
        suppressedBodyReferences.push(`PLANET:${planet.body}`);
        // Deliberate display suppression must not return as a fallback target dot.
        // A failed resolved globe still uses the existing recovery marker path.
        handledPlanets.add(planet.body);
      }
      if (!appearance) continue;
      context.disc(planet.x,planet.y,appearance.radiusPx,mode === "OBSERVATION" ? palette.target : tint,appearance.opacity,0,"star");
      pickable = appearance.opacity >= .1;
    }
    handledPlanets.add(planet.body);
    if (pickable) paintedObjects.push({ reference: `PLANET:${planet.body}`,
      displayName: SKY_PLANET_NAMES[planet.body].zh, kind: "PLANET", magnitude: planet.visualMagnitude,
      magnitudeBand: "VISUAL", x: planet.x, y: planet.y,
      ...(planet.radiusPx>=1.2?{
        hitDisc:planet.oblate??{majorRadiusPx:planet.radiusPx,minorRadiusPx:planet.radiusPx,
          minorDirection:[0,1] as const},
      }:{}),
      ...(hitSegments.length?{hitSegments}:{}),
    });
  }

  if (deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    deepFrame.points.forEach(([catalogIndex, azimuthDeg, altitudeDeg]) => {
      if (altitudeDeg <= 0) return;
      const entry = deepCatalog.entries[catalogIndex];
      if (!entry) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      const imagePainted = Boolean(
        (paintedSdssOpticalImage && sdssOpticalImage?.reference === entry.objectRef) ||
        (paintedDeepSkyImage && deepSkyImage?.reference === entry.objectRef));
      const auxiliaryOpacity = deepSkyAuxiliaryOpacity(verticalFovDeg, height, entry.majorAxisArcmin, imagePainted);
      if (auxiliaryOpacity > 0.01)
        context.disc(projection.x, projection.y, 3.2, mode === "OBSERVATION" ? palette.target : "#A9BDD6",
          0.9 * auxiliaryOpacity, 1);
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
    if (target.type === "PLANET" && handledPlanets.has(target.targetId.replace("target:","").toUpperCase())) return;
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
  // Completed source alpha can certify true zero foreground in the actual
  // view without a bitmap/pass. Otherwise publish only a successful pass,
  // preserving the sky on failure rather than inventing source transparency.
  let paintedLandscape: SkyLandscapeMask | null = null;
  if (landscape?.enabled && sun) {
    const knownMask = landscape.mask ?? landscape.panorama?.mask;
    if (knownMask && !skyPanoramaMaskIntersectsView(knownMask, artworkView, width, height)) paintedLandscape = knownMask;
    else if (landscape.panorama && context.landscape(artworkView, sun, mode === "OBSERVATION", landscape.panorama))
      paintedLandscape = landscape.panorama.mask;
    else if (context.landscape(artworkView, sun, mode === "OBSERVATION")) paintedLandscape = PROCEDURAL_SKY_LANDSCAPE;
  }
  if (landscape?.enabled) landscape.availability?.(Boolean(paintedLandscape));
  const imageViewHull=paintedSdssFields.length || deepSkyRegistration ? skyArtworkViewRayHull(artworkView,width,height) : null;
  if (paintedLandscape && (paintedSdssFields.length || deepSkyRegistration)) {
    const coveredView=skyLandscapeMaskCoversRayHull(paintedLandscape,imageViewHull);
    // A covered fine field cannot erase the visible wider field's provenance.
    paintedSdssOpticalImage = coveredView ? null : [...paintedSdssFields].reverse().find(field =>
      !skyLandscapeMaskCoversRayHull(paintedLandscape, field.registration.corners))?.image ?? null;
    if (deepSkyRegistration && (coveredView || skyLandscapeMaskCoversRayHull(paintedLandscape,deepSkyRegistration.corners))) paintedDeepSkyImage=null;
  }
  context.finish();
  const identity = skyPickIdentity(data,currentSupplement);
  painted?.(identity.catalogVersion && frameAt ? {
    catalogVersion: identity.catalogVersion,
    catalogHash: identity.catalogHash,
    frameAt,
    width,
    height,
    view: {basis,verticalFovDeg,...(center?{center}:{}),landscape:paintedLandscape},
    objects: paintedObjects,
    suppressedBodyReferences,
  } : null, { sdssOpticalImage: paintedSdssOpticalImage, deepSkyImage: paintedDeepSkyImage });
  completed?.();
}
