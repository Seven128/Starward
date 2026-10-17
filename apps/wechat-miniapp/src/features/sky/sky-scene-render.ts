import { DEEP_SKY_IMAGE_PIXELS, type DisplayMode, type GalacticImageManifestData, type OpticalHipsManifestData } from "@starward/miniapp-contracts";
import type { DeviceOrientationFrame as DevicePose } from "./device-orientation-view";
import { createSkyDirectionProjector, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import { resolveSkyDeepSkyScene, resolveSkySceneFrame, type ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { exactSkyTimeFrame } from "./sky-time-frame";
import type { SkyDeepSkyImageField } from "./sky-deep-sky-image-frame";
import type { PaintedSkyObject, SkyPickSnapshot } from "./sky-object-picking";
import { filterSkyBodyOccludedStars } from "./sky-object-picking";
import { SKY_OBSERVING_VERTICAL_FOV_DEG as SKY_VERTICAL_FOV_DEG } from "./sky-zoom";
import { projectSkyTarget } from "./sky-scene-projection";
import type { SkyHipsSourceGroup, SkyLineSegment, SkyRenderSurface } from "./sky-render-surface";
import { drawSkyConstellations, prepareSkyConstellationArtwork, type SkyConstellationLayer } from "./sky-constellation-render";
import { createSkyStarAppearance, skyStarDisplayColor, skyStarMagnitudeLimit } from "./sky-star-appearance";
import type { SkyStarTransitionFrame, SkyTransitionStar } from "./sky-star-transition";
import type { SkyReadyImageFrame } from "./sky-ready-presentation";
import { drawSkyReadyArtwork, drawSkyReadyArtworkLevels, drawSkyReadyMesh, drawSkyReadyMeshLevels } from "./sky-ready-artwork";
import type { SkyArtworkLevel, SkyArtworkLevelSurface } from "./sky-artwork-level-composition";
import {currentStellarSupplement,type SkyStellarSupplementFrame} from './sky-stellar-supplement-scene';
import { registerSkySurvey } from "./sky-survey-registration";
import { artworkIntersectsView, artworkDisplaySupportIntersectsView, skyArtworkViewRayHull } from "./sky-artwork-visibility";
import { copySkyDeepAuxiliaryDecisions, deepSkyAuxiliaryOpacity, skyDeepAuxiliaryModelOpacity, type SkyDeepAuxiliaryDecision } from "./sky-deep-auxiliary-visibility";
import type { SkyArtworkRegistration } from "./sky-artwork-registration";
import { PROCEDURAL_SKY_LANDSCAPE, skyLandscapeHasPaintedModel, skyLandscapeMaskWithOpacity, skyLandscapeMaskCoversRayHull, skyPanoramaMaskIntersectsView,
  type SkyLandscapeMask, type SkyLandscapePanorama, type SkyPanoramaMask } from "./sky-landscape-mask";
import { skySolarLightAt } from "./sky-solar-light";
import { skyLandscapeViewOpacity } from "./sky-landscape-visibility";
import { resolveSkyGalacticView } from "./sky-galactic-band";
import { skySunDiscAt } from "./sky-sun-disc";
import { skyMoonDiscAt } from "./sky-moon-disc";
import { skyPlanetDiscsAt, type SkyPlanetDisc } from "./sky-planet-disc";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { skyHorizontalGrid } from "./sky-horizontal-grid";
import { skyEquatorialGrid } from "./sky-equatorial-grid";
import { skyHipsRenderTileGeometry, projectSkyHipsTileMesh } from "./sky-hips-tile-mesh";
import { SKY_PLANET_CATALOG_HASH, SKY_PLANET_CATALOG_VERSION, SKY_PLANET_NAMES,
  SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_CATALOG_VERSION, SKY_LUMINARY_NAMES } from "@starward/miniapp-contracts";
import type { SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import { completeLegacySkyOptical, completeTargetSkyOptical, type SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";
import { submitSkySceneScienceOptical, submitSkySceneCalibratedOptical,
  type SkySceneScienceOpticalPort, type SkySceneCalibratedOpticalPort } from "./sky-sdss-science-scene";
import { submitSkyScenePreparedOptical, submitSkyScenePreparedRegions, completeSkyScenePreparedRegions,
  skyPreparedRegionsBlockInfrared, type SkyScenePreparedOpticalPort, type SkyScenePreparedOpticalRegion } from "./sky-prepared-optical-scene";
import { skyTargetOpticalDisplayFacts } from "./sky-target-optical-scene";
import { isSkyLegacyOpticalFrame } from "./sky-target-optical-identity";
export type { SkyScenePreparedOpticalPort } from "./sky-prepared-optical-scene";
export type { SkySceneScienceOpticalPort } from "./sky-sdss-science-scene";
export type { SkySceneCalibratedOpticalPort } from "./sky-sdss-science-scene";
export type { SkySdssOpticalField, SkySdssOpticalImage } from "./sky-sdss-optical-frame";
type SkyCanvasImageAsset = SkyDeepSkyImageField & {
  coarser?: SkyDeepSkyImageField | null; fallback?: SkyDeepSkyImageField | null;
};
export interface SkyGalacticImageCompletion {readonly image:object;readonly publication:GalacticImageManifestData}
/** Successful texture submission, not a claim of unoccluded scientific samples. */
export interface SkyBodyImagePaint {
  readonly reference: "SOLAR:MOON" | `PLANET:${SkyPlanetDisc["body"]}`;
  readonly image: object;
}
export type SkyScenePaintedSources = { readonly sdssOptical: SkyTargetOpticalCompletion | null; readonly deepSkyImage: object | null;
  readonly preparedRegions?: readonly SkyTargetOpticalCompletion[];
  readonly galacticImage?:SkyGalacticImageCompletion|null; readonly opticalHips?:readonly SkyHipsCanvasTile[];
  readonly bodyImages?: readonly SkyBodyImagePaint[] };
export interface SkyCoordinateGrids { horizontal: boolean; equatorial: boolean }
export interface SkyHipsCanvasTile {
  layer:"WIDE_FIELD_W3"|"OPTICAL";
  /** Explicit publication source; absence cannot establish same-source LOD. */
  sourceId?:string;
  /** Native owner binds retained and wanted images to this immutable version. */
  publication?:OpticalHipsManifestData;
  order:number;
  pixel:number;
  image:object;
  /** Ready detail retained while widening; withdraw only after a successful
   * same-version opaque parent submission in this frame. */
  retainedDetailFallback?:boolean;
}
export function dispatchSkyHipsImageFailure(tile:SkyHipsCanvasTile,
  wideFieldFailed:(image:object)=>void,opticalFailed:(image:object)=>void):void {
  if(tile.layer==="WIDE_FIELD_W3")wideFieldFailed(tile.image);
  else opticalFailed(tile.image);
}

export { skyStarDisplayColor } from "./sky-star-appearance";

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
  imageFailed?: (asset: SkyDeepSkyImageField) => void,
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
  sdssOpticalImage?: SkyTargetOpticalImage | null,
  sdssOpticalFailed?: (image: object) => void,
  uranusBands?: object | null,
  neptuneBands?: object | null,
  landscape?: { enabled: boolean; panorama?: SkyLandscapePanorama | null; mask?: SkyPanoramaMask | null;
    readiness?: number; pending?: boolean; failed?: boolean;
    /** Last actual completed material from this live canvas, not a requested source. */
    previous?: SkyLandscapeMask | null; availability?: (available: boolean | null) => void },
  grids: SkyCoordinateGrids = { horizontal: false, equatorial: false },
  scienceOptical?: SkySceneScienceOpticalPort,
  preparedOptical?: SkyScenePreparedOpticalPort,
  calibratedOptical?: SkySceneCalibratedOpticalPort,
  galacticPublication?: GalacticImageManifestData|null,
  preparedRegions?: readonly SkyScenePreparedOpticalRegion[],
  starTransitions?: SkyStarTransitionFrame,
  readyImages?: SkyReadyImageFrame,
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
  const inputBasis = manualBasis ?? pose?.basis ?? null;
  const basis = inputBasis;
  const view = basis ? {basis,verticalFovDeg,...(center ? {center} : {})} : null;
  const sun = data && view ? skySolarLightAt(data.hourly,frameAt) : null;
  const knownLandscapeMask = landscape?.panorama?.mask ?? landscape?.mask;
  const landscapeFrame = landscape?.enabled && sun && view ? {
    viewOpacity: skyLandscapeViewOpacity(view,width,height),
    readiness: Number.isFinite(landscape.readiness) ? Math.max(0,Math.min(1,landscape.readiness!)) : 1,
    mask: knownLandscapeMask,
    intersects: !knownLandscapeMask || skyPanoramaMaskIntersectsView(knownLandscapeMask,view,width,height),
  } : null;
  const constellationArtwork = data && view && constellations && constellations.frame?.at === frameAt
    ? prepareSkyConstellationArtwork(constellations,view,width,height) : [];
  const frameImages = constellationArtwork.map(value=>value.image);
  // The foreground is submitted after allocating celestial layers. Protect
  // its current drawable photo through that same frame, without preupload or
  // credit; finish still retires it if the actual pass does not use it.
  if (landscapeFrame && landscape?.panorama && landscapeFrame.readiness > 0 &&
    landscapeFrame.viewOpacity > 0 && landscapeFrame.intersects &&
    skyNativeImageIsCurrent(landscape.panorama.image)) frameImages.push(landscape.panorama.image);
  context.begin(width, height, palette.canvas, frameImages, mode === "OBSERVATION");
  // Missing pose has no invented North-facing view. Recovery/list semantics
  // remain available outside this canvas until a trusted stream is present.
  if (!data || !basis) {
    context.finish();
    painted?.(null, { sdssOptical: null, deepSkyImage: null });
    completed?.();
    return;
  }
  if (mode !== "OBSERVATION" && sun && !context.solarLight(
    {basis,verticalFovDeg,...(center ? {center} : {})},sun)) solarLightFailed?.();
  const galactic = mode === "OBSERVATION" ? null : resolveSkyGalacticView(data,frameAt,verticalFovDeg,galacticPublication??undefined);
  const galacticBand = galactic?.schematic ?? null;
  let paintedGalacticImage:SkyGalacticImageCompletion|null=null;
  const imageAllowed=mode!=="OBSERVATION"&&!hipsTiles?.some(tile=>tile.layer==="WIDE_FIELD_W3");
  const imageBand=imageAllowed&&galacticImage&&galacticPublication?
    galactic?.image:null;
  const background=imageBand??galacticBand;
  if (background && !context.galacticBand(
    {basis,verticalFovDeg,...(center ? {center} : {})},background,
    imageAllowed&&(imageBand||!galacticPublication)?galacticImage:null,
    image=>{if(image===galacticImage&&galacticPublication)paintedGalacticImage=Object.freeze({image,publication:galacticPublication});}
  )) galacticBandFailed?.();
  // Historical W3 belongs below registered target cutouts; optical tiles,
  // including a published order-0 base, belong above them. Resolution is not
  // a layer identity. Both use the same exact sky frame and native mesh.
  const observation=galactic?.observation ?? null;
  const paintedOpticalHips:SkyHipsCanvasTile[]=[];
  const sourceGroups=new Map<OpticalHipsManifestData,Map<string,SkyHipsSourceGroup>>();
  const submittedHipsGroups=new Map<SkyHipsCanvasTile,SkyHipsSourceGroup>();
  const hipsGroup=(tile:SkyHipsCanvasTile)=>{
    const publication=tile.layer==="OPTICAL"&&tile.publication;
    if(!publication||!publication.sources.some(source=>source.id===tile.sourceId))return undefined;
    let groups=sourceGroups.get(publication);if(!groups)sourceGroups.set(publication,groups=new Map());
    let group=groups.get(tile.sourceId!);
    if(!group){group=Object.freeze({publicationHash:publication.publicationHash,sourceId:tile.sourceId!});groups.set(tile.sourceId!,group);}
    return group;
  };
  const drawHips=(tiles:readonly SkyHipsCanvasTile[],opacity:number)=>{
    if(!observation)return;
    const view={basis,verticalFovDeg,...(center ? {center} : {})};
    const attemptedGroups=new Set<object>();
    for(let index=0;index<tiles.length;index++){
      const tile=tiles[index]!;
      if(!skyNativeImageIsCurrent(tile.image))continue;
      const group=hipsGroup(tile);
      if(group&&!attemptedGroups.has(group)&&context.skyImageMeshLevels&&tile.publication?.sources.some(source=>source.id===tile.sourceId&&source.format==="png")){
        let end=index+1;while(end<tiles.length&&hipsGroup(tiles[end]!)===group)end++;
        const run=tiles.slice(index,end).filter(value=>skyNativeImageIsCurrent(value.image)),
          hierarchical=run.some(parent=>run.some(child=>child.order>parent.order&&
            Math.floor(child.pixel/4**(child.order-parent.order))===parent.pixel)),
          contiguous=!tiles.slice(end).some(value=>hipsGroup(value)===group);
        // Keep one source on the same work target throughout readiness. Moving
        // a translucent parent from direct/MSAA rendering to the group only
        // when detail arrives changes its edge pixels before detail progress.
        if((hierarchical||readyImages)&&contiguous){
          const projected=run.map(value=>{const geometry=skyHipsRenderTileGeometry(value.order,value.pixel),
            triangles=geometry&&projectSkyHipsTileMesh(geometry,observation.equatorialToEnu,view,width,height);
            return triangles?.length?{tile:value,image:value.image,triangles,priority:value.order}:null;
          }).filter((value):value is NonNullable<typeof value>=>value!==null);
          if(projected.length){
            attemptedGroups.add(group);
            const results=drawSkyReadyMeshLevels(context,projected,view,opacity,group,readyImages);
            if(Array.isArray(results)&&results.length===projected.length&&results.every(value=>typeof value==="boolean")){
              for(const [i,value] of projected.entries()){
                if(!results[i])hipsImageFailed?.(value.tile);
                else if(opacity>0&&(!readyImages||readyImages.image(value.image).progress>0)){
                  paintedOpticalHips.push(value.tile);submittedHipsGroups.set(value.tile,group);
                }
              }
              index=end-1;continue;
            }
          }
        }
      }
      if(tile.retainedDetailFallback&&paintedOpticalHips.some(parent=>
        parent.publication?.publicationHash===tile.publication?.publicationHash&&
        parent.sourceId===tile.sourceId&&parent.order<tile.order&&
        Math.floor(tile.pixel/4**(tile.order-parent.order))===parent.pixel&&
        (!readyImages||readyImages.image(parent.image).progress>=1)&&
        parent.publication?.sources.some(source=>source.id===parent.sourceId&&source.format==="jpeg")))continue;
      const geometry=skyHipsRenderTileGeometry(tile.order,tile.pixel);
      const triangles=geometry&&projectSkyHipsTileMesh(geometry,observation.equatorialToEnu,view,width,height);
      if(triangles?.length){
        const result=drawSkyReadyMesh(context,tile.image,triangles,view,opacity,group,readyImages);
        if(result==="FAILED")hipsImageFailed?.(tile);
        else if(result==="PAINTED"&&group){paintedOpticalHips.push(tile);submittedHipsGroups.set(tile,group);}
      }
    }
  };
  // The optional historical W3 layer enters with the same exact-time
  // Galactic twilight curve; an already decoded tile must not pop in at -12°.
  if(hipsTiles?.length&&galacticBand?.strength)drawHips(
    hipsTiles.filter(tile=>tile.layer==="WIDE_FIELD_W3"),.48*galacticBand.strength);
  const paintedObjects: PaintedSkyObject[] = [];
  const paintedBodyImages: SkyBodyImagePaint[] = [];
  const deepSkyAuxiliaryDecisions: SkyDeepAuxiliaryDecision[] = [];
  const projector = createSkyDirectionProjector(basis,width,height,verticalFovDeg,center);
  const project = (azimuth: number, altitude: number) =>
    projector?.project(azimuth,altitude) ?? null;
  const deepScene = resolveSkyDeepSkyScene(data.skyScene, frameAt);
  const deepCatalog = deepScene?.catalog;
  const deepFrame = deepScene?.frame;
  let paintedSdssOpticalImage: object | null = null;
  let preparedLegacyOptical = false;
  let paintedDeepSkyImage: object | null = null;
  const paintedSdssFields: Array<{ image: object; registration: SkyArtworkRegistration }> = [];
  let deepSkyRegistration:SkyArtworkRegistration|null=null;
  const artworkView = view!;
  const regionSubmissions = mode === "OBSERVATION" ? [] :
    submitSkyScenePreparedRegions(context, preparedRegions, observation, artworkView, sdssOpticalFailed, readyImages);
  const drawInfraredCutout = (): {image:object;registration:SkyArtworkRegistration} | null => {
    if (mode === "OBSERVATION" || !deepSkyImage || deepCatalog?.imageRegistration !== "ICRS_TAN_NORTH_0_1_V1" || deepFrame?.state !== "AVAILABLE" || !deepFrame.points) return null;
    const imageIndex = deepCatalog.entries.findIndex(entry => entry.objectRef === deepSkyImage.reference);
    const point = deepFrame.points.find(candidate => candidate[0] === imageIndex);
    if (!point) return null;
    const prepare = (asset: SkyDeepSkyImageField | null | undefined) => {
      if (!asset || !skyNativeImageIsCurrent(asset.image) || asset.reference !== deepSkyImage.reference ||
        asset.publicationHash !== deepSkyImage.publicationHash || asset.sourceId !== deepSkyImage.sourceId) return null;
      const pixels = DEEP_SKY_IMAGE_PIXELS[asset.level];
      const registration = registerSkySurvey(point, asset.fieldDegrees, pixels, pixels / 2);
      if (!registration) { imageFailed?.(asset); return null; }
      return !skyPreparedRegionsBlockInfrared(regionSubmissions, registration, observation) &&
        artworkIntersectsView(registration, artworkView, width, height) &&
        artworkDisplaySupportIntersectsView(registration, artworkView, width, height, asset.displaySupport)
        ? { asset, registration } : null;
    };
    const fine = prepare(deepSkyImage);
    const coarse = prepare(deepSkyImage.coarser ?? deepSkyImage.fallback);
    if (!fine && !coarse) return null;
    // A no-reveal single-image consumer keeps its exact original W3 pass.
    // With retained levels, combine the original per-source display alpha
    // before one additive pass; fading two independent draws doubles light.
    if (!readyImages && !coarse && fine) {
      if (context.artwork(fine.asset.image, fine.registration, artworkView, .58, "#FFFFFF", "infrared-cutout"))
        return { image: fine.asset.image, registration: fine.registration };
      imageFailed?.(fine.asset); return null;
    }
    const surface = context as SkyRenderSurface & Partial<SkyArtworkLevelSurface>;
    if (!surface.artworkLevels) return null;
    const field = (value: typeof fine): SkyArtworkLevel | null => value
      ? { image: value.asset.image, registration: value.registration, displayAlpha: "infrared-cutout" } : null;
    const draw = drawSkyReadyArtworkLevels(surface as SkyRenderSurface & SkyArtworkLevelSurface,
      { fine: field(fine), coarse: field(coarse), composite: "infrared-cutout" }, artworkView, .58, readyImages);
    if (fine && !draw.finePrepared) imageFailed?.(fine.asset);
    if (coarse && !draw.coarsePrepared) imageFailed?.(coarse.asset);
    if (!draw.submitted) return null;
    const visible = fine && draw.finePrepared && (!readyImages || readyImages.image(fine.asset.image).progress > 0) ? fine :
      coarse && draw.coarsePrepared && (!readyImages || readyImages.image(coarse.asset.image).progress > 0) ? coarse : null;
    if (visible) return { image: visible.asset.image, registration: visible.registration };
    return null;
  };
  const opticalEntry = (scienceOptical || calibratedOptical || preparedOptical) && sdssOpticalImage && deepCatalog?.frame === "ICRS J2000"
    ? deepCatalog.entries.find(candidate => candidate.objectRef === sdssOpticalImage.reference) : null;
  const targetOpticalSubmission = mode === "OBSERVATION" ? null :
    sdssOpticalImage && "preparedPublication" in sdssOpticalImage
      ? submitSkyScenePreparedOptical(context, preparedOptical, sdssOpticalImage, observation, artworkView,
        sdssOpticalFailed, opticalEntry, readyImages)
      : calibratedOptical ? submitSkySceneCalibratedOptical(context, calibratedOptical, sdssOpticalImage, observation, artworkView,
        sdssOpticalFailed, opticalEntry, readyImages)
      : submitSkySceneScienceOptical(context, scienceOptical, sdssOpticalImage, observation, artworkView,
        sdssOpticalFailed, opticalEntry, readyImages);
  // Exact PNG source coverage is not legacy display opacity. Each family needs
  // its own matched intent; invalid/foreign envelopes never enter JPEG passes.
  if (mode !== "OBSERVATION" && sdssOpticalImage && isSkyLegacyOpticalFrame(sdssOpticalImage) &&
    deepCatalog?.imageRegistration === "ICRS_TAN_NORTH_0_1_V1" &&
    deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    const index = deepCatalog.entries.findIndex(entry => entry.objectRef === sdssOpticalImage.reference);
    const point = deepFrame.points.find(candidate => candidate[0] === index);
    if (point) {
      // SDSS SkyServer centers its JPEG on the requested coordinates. The
      // even-sized image has its geometric center between four pixels.
      const coarser = sdssOpticalImage.coarser;
      const fields = coarser && coarser.image !== sdssOpticalImage.image && coarser.fieldDegrees > sdssOpticalImage.fieldDegrees
        ? [coarser, sdssOpticalImage] : [sdssOpticalImage];
      // Legacy JPEG alpha is display opacity. Its original source-over passes
      // already replace the opaque parent's colour without additive doubling;
      // do not reinterpret it as the exact PNG group's sample availability.
      const paintLegacy = (field: { image: object; fieldDegrees: number }) => {
        if (!skyNativeImageIsCurrent(field.image)) return;
        const registration = registerSkySurvey(point, field.fieldDegrees, 512, 256.5);
        if (!registration) sdssOpticalFailed?.(field.image);
        else if (artworkIntersectsView(registration, artworkView, width, height)) {
          const result = drawSkyReadyArtwork(context, field.image, registration, artworkView, 1,
            "#FFFFFF", "optical-cutout", readyImages);
          if (result === "PAINTED") {
            paintedSdssOpticalImage = field.image;
            paintedSdssFields.push({ image: field.image, registration });
          }
          else if (result === "PREPARED") preparedLegacyOptical = true;
          else if (result === "FAILED") sdssOpticalFailed?.(field.image);
        }
      };
      for (const field of fields) paintLegacy(field);
      const fallback = sdssOpticalImage.fallback;
      // Widening keeps the already shown finer field until the new wider
      // presentation settles, including its first successful zero-alpha prep.
      // Merely submitting a half-visible parent cannot withdraw that fallback.
      if (fallback && (!paintedSdssOpticalImage ||
        readyImages && readyImages.image(sdssOpticalImage.image).progress < 1)) paintLegacy(fallback);
    }
  }
  // The scene owns one selected target cutout. A painted optical field takes
  // precedence; its edge must not blend with a different infrared spectrum
  // (including a retained previous target). Failure/offscreen optical keeps
  // the independent infrared path and its actual object/provenance.
  const infraredSubmission = !paintedSdssOpticalImage && !preparedLegacyOptical && (!targetOpticalSubmission || targetOpticalSubmission.allowInfrared)
    ? drawInfraredCutout() : null;
  paintedDeepSkyImage = infraredSubmission?.image ?? null;
  deepSkyRegistration = infraredSubmission?.registration ?? null;
  // Higher-resolution HiPS tiles cover the coarser registered object image.
  // Their observer transform is independent of bright-star catalog health.
  // Preserve original alpha. Opaque fine pixels replace the already-painted
  // parent exactly where their own mesh actually draws; failed regions keep it.
  // Per-tile display attenuation would mix the same source twice at each LOD.
  if(hipsTiles?.length)drawHips(hipsTiles.filter(tile=>tile.layer==="OPTICAL"),1);
  const grid = skyHorizontalGrid(basis, width, height, verticalFovDeg, center, grids.horizontal);
  if (grids.horizontal) {
    context.segments(grid.horizon, palette.grid);
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
    drawSkyConstellations(context,constellations,{basis,verticalFovDeg,...(center ? {center} : {})},width,height,mode === "OBSERVATION",constellationArtwork,readyImages);
  }
  const catalog = data.skyScene.state === "AVAILABLE" ? data.skyScene.catalog : null;
  const frame = resolveSkySceneFrame(data.skyScene, frameAt);
  const starAppearance = createSkyStarAppearance(verticalFovDeg, mode === "OBSERVATION" ? undefined : sun?.altitudeDeg, mode);
  const starMagnitudeLimit = skyStarMagnitudeLimit(verticalFovDeg, mode === "OBSERVATION" ? undefined : sun?.altitudeDeg, mode);
  const namedStars: NonNullable<SkyPickSnapshot["namedStars"]>[number][] = [];
  const catalogTransition = starTransitions?.layer("catalog", catalog && frame?.state === "AVAILABLE" ? catalog : null);
  const paintStar = (star: SkyTransitionStar, projection: { x: number; y: number }, pickable = true) => {
    if (star.opacity <= 0) return;
    context.disc(projection.x, projection.y, star.radiusPx, star.color, star.opacity, 0, "star");
    if (!pickable || star.opacity < .1) return;
    const object: PaintedSkyObject = { reference: star.reference, displayName: star.displayName,
      kind: "STAR", magnitude: star.magnitude,
      x: projection.x, y: projection.y };
    if (star.magnitudeBand) object.magnitudeBand = star.magnitudeBand;
    paintedObjects.push(object);
    if (star.named && star.magnitude <= 2.5) namedStars.push({ ...object, opacity: star.opacity });
  };
  if (catalog && frame?.state === "AVAILABLE" && frame.points) {
    for (let pointIndex=0;pointIndex<frame.points.length;pointIndex++) {
      const point=frame.points[pointIndex]!;
      const [catalogIndex, azimuthDeg, altitudeDeg] = point;
      const entry = catalog.entries[catalogIndex];
      if (!entry || starMagnitudeLimit === null || !Number.isFinite(entry.magnitude)) continue;
      if (entry.magnitude >= starMagnitudeLimit) {
        if (catalog.magnitudeOrdered) break;
        continue;
      }
      // Cheap brightness eligibility precedes projection; expensive point
      // appearance is needed only inside the actual current viewport.
      const direction = frame.displayDirection?.(pointIndex);
      const projection = direction ? projector?.prepared(direction) : project(azimuthDeg, altitudeDeg);
      if (!projection) continue;
      const transmission = mode === "OBSERVATION" ? undefined : frame.displayTransmission;
      const appearance = starAppearance(entry.magnitude,
        mode === "OBSERVATION" || transmission !== undefined ? undefined : altitudeDeg);
      if (!appearance) continue;
      if (transmission !== undefined) appearance.opacity *= transmission(pointIndex);
      const starColor = mode === "OBSERVATION"
        ? palette.target : (catalog.displayColors ? catalog.displayColors[catalogIndex] : skyStarDisplayColor(entry.colorIndex)) ?? palette.text;
      const star: SkyTransitionStar = { reference: entry.objectRef,
        displayName: entry.displayName ?? entry.objectRef.replace(":", " "), kind: "STAR",
        magnitude: entry.magnitude, azimuthDeg, altitudeDeg, named: Boolean(entry.displayName),
        color: starColor, radiusPx: appearance.radiusPx, opacity: appearance.opacity };
      paintStar(catalogTransition?.point(star) ?? star, projection);
    }
  }

  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);
  const supplementTransition = starTransitions?.layer("supplement",
    currentSupplement ? `${currentSupplement.catalogVersion}:${currentSupplement.publicationHash}` : null);
  const supplementPoints=currentSupplement?.points??[];
  const supplementTransmission=mode === "OBSERVATION" ? undefined : currentSupplement?.displayTransmission;
  for(let pointIndex=0;pointIndex<supplementPoints.length;pointIndex++){
    const [reference,magnitude,azimuthDeg,altitudeDeg]=supplementPoints[pointIndex]!;
    if(starMagnitudeLimit===null||!Number.isFinite(magnitude)||magnitude>=starMagnitudeLimit)continue;
    const direction=currentSupplement?.displayDirection?.(pointIndex);
    const projection=direction?projector?.prepared(direction):project(azimuthDeg,altitudeDeg);if(!projection)continue;
    const appearance=starAppearance(magnitude,mode === "OBSERVATION" || supplementTransmission ? undefined : altitudeDeg);if(!appearance)continue;
    if(supplementTransmission)appearance.opacity*=supplementTransmission(pointIndex);
    // SAO supplies no adopted colour index. Use the neutral sky palette.
    const star: SkyTransitionStar = { reference, displayName: reference.replace(':',' '), kind: "STAR",
      magnitude, magnitudeBand: "VISUAL", azimuthDeg, altitudeDeg, named: false,
      color: mode === "OBSERVATION" ? palette.target : palette.text,
      radiusPx: appearance.radiusPx, opacity: appearance.opacity };
    paintStar(supplementTransition?.point(star) ?? star, projection);
  }
  // Only a same-time, still-valid layer may finish a short visual exit. Reproject
  // its real ray in this camera; never reuse old screen pixels or make it pickable.
  for (const transition of [catalogTransition, supplementTransition]) for (const star of transition?.exits() ?? []) {
    const projection = project(star.azimuthDeg, star.altitudeDeg);
    if (projection) paintStar(star, projection, false);
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
    let paintedImage: object | null = null;
    const bodyPainted = context.moon(moon,discView,mode === "OBSERVATION",moonTexture,image => {
      if(mode !== "OBSERVATION" && image === moonTexture && skyNativeImageIsCurrent(image)) paintedImage = image;
    });
    if (bodyPainted) paintedObjects.push({
      reference: "SOLAR:MOON", displayName: SKY_LUMINARY_NAMES.MOON.zh, kind: SKY_LUMINARY_NAMES.MOON.kind,
      magnitude: null, x: moon.x, y: moon.y,
      hitDisc: { majorRadiusPx: moon.radiusPx, minorRadiusPx: moon.radiusPx, minorDirection: [0, 1] },
    });
    else moonFailed?.();
    if(bodyPainted && paintedImage) paintedBodyImages.push(Object.freeze({reference:"SOLAR:MOON",image:paintedImage}));
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
      const source = planet.body==="MARS"?marsTexture:planet.body==="MERCURY"?mercuryTexture:
          planet.body==="JUPITER"?jupiterBands:planet.body==="SATURN"?saturnBands:
          planet.body==="URANUS"?uranusBands:planet.body==="NEPTUNE"?neptuneBands:null;
      let paintedImage: object | null = null;
      if (!context.planet(planet,discView,tint,mode === "OBSERVATION",source,image => {
        if(mode !== "OBSERVATION" && image === source && skyNativeImageIsCurrent(image)) paintedImage = image;
      })) { planetFailed?.(); continue; }
      if(paintedImage) paintedBodyImages.push(Object.freeze({reference:`PLANET:${planet.body}`,image:paintedImage}));
      // A resolved limb or ring can remain after its centre sets. Publish the
      // successful shape; shared picking clips actual touches to this view.
      pickable = true;
      const continuousRings=planet.body === "SATURN" && planet.rings.length>0 &&
        context.saturnRings(planet,discView,mode === "OBSERVATION" ? palette.target : "#D8C7A5",mode === "OBSERVATION");
      if (planet.body === "SATURN") for (const ring of planet.rings) {
        const ringTint=mode === "OBSERVATION" ? palette.target : "#D8C7A5";
        const paintRing=(allSegments:readonly SkyLineSegment[],color:string)=>{
          const segments=allSegments;
          if(segments.length){if(!continuousRings)context.segments(segments,color,ring.opacity);hitSegments.push(...segments);}
        };
        paintRing([...ring.back,...ring.front],ringTint);
        paintRing([...ring.shadowBack,...ring.shadowFront],
          mode === "OBSERVATION" ? "#4B211D" : "#4E473B");
      }
    } else {
      const appearance = starAppearance(planet.visualMagnitude,mode === "OBSERVATION" ? undefined : planet.altitudeDeg);
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

  // One immutable model-domain input before aids. A permitted whole-source
  // W3 alternative retains its actual-painted legacy rule and needs no local probe.
  const preAidOpticalFacts = targetOpticalSubmission && !targetOpticalSubmission.allowInfrared
    ? skyTargetOpticalDisplayFacts(targetOpticalSubmission) : null;
  if (deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {
    deepFrame.points.forEach(([catalogIndex, azimuthDeg, altitudeDeg]) => {
      const entry = deepCatalog.entries[catalogIndex];
      if (!entry) return;
      const projection = project(azimuthDeg, altitudeDeg);
      if (!projection) return;
      const imagePainted = Boolean(
        (paintedSdssOpticalImage && sdssOpticalImage?.reference === entry.objectRef) ||
        (paintedDeepSkyImage && deepSkyImage?.reference === entry.objectRef));
      const auxiliaryOpacity = targetOpticalSubmission && !targetOpticalSubmission.allowInfrared && targetOpticalSubmission.frame.reference===entry.objectRef
        ? skyDeepAuxiliaryModelOpacity(verticalFovDeg,height,entry.majorAxisArcmin,preAidOpticalFacts)
        : deepSkyAuxiliaryOpacity(verticalFovDeg, height, entry.majorAxisArcmin, imagePainted);
      deepSkyAuxiliaryDecisions.push({ reference: entry.objectRef, opacity: auxiliaryOpacity });
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
  let landscapePending = false;
  if (landscape?.enabled && sun && landscapeFrame) {
    const viewOpacity = landscapeFrame.viewOpacity;
    const readiness = landscapeFrame.readiness;
    let opacity = viewOpacity * (landscape.panorama ? readiness : 1);
    const retainModel = skyLandscapeHasPaintedModel(landscape.previous);
    let paintedPhoto:SkyPanoramaMask|null=null,paintedPhotoOpacity=0;
    const paintPhoto=(alpha:number)=>{
      const primary=landscape.panorama;
      if(!primary)return false;
      const coarse=primary.coarser;
      const candidates=coarse&&coarse.image!==primary.image&&coarse.mask.resource.id==='overview'&&
        coarse.mask.publication.publicationHash===primary.mask.publication.publicationHash?[primary,coarse]:[primary];
      for(const photo of candidates) {
        const intersects=skyPanoramaMaskIntersectsView(photo.mask,artworkView,width,height);
        if(!intersects||skyNativeImageIsCurrent(photo.image)&&
          context.landscape(artworkView,sun,mode==='OBSERVATION',photo,alpha)) {
          paintedPhoto=photo.mask;paintedPhotoOpacity=intersects?alpha:0;return true;
        }
      }
      return false;
    };
    // A still-usable coarse bitmap keeps its own alpha while detail is absent.
    const knownMask = landscapeFrame.mask;
    if (knownMask && !landscapeFrame.intersects) {
      paintedLandscape = knownMask; opacity = 0;
    }
    else if ((knownMask || landscape.pending) && !landscape.panorama && !retainModel && !(landscape.failed && !landscape.pending)) {
      // Waiting for the publication, alpha or bitmap is neither opaque success
      // nor permission to substitute a different terrain silhouette.
      landscapePending = true;
    }
    else if (landscape.panorama && readiness < 1 && retainModel) {
      const modelOpacity = viewOpacity * (1 - readiness);
      const modelPainted = context.landscape(artworkView, sun, mode === "OBSERVATION", null, modelOpacity);
      const photoPainted = readiness > 0 && paintPhoto(opacity);
      if (photoPainted) {
        if(!modelPainted)opacity=paintedPhotoOpacity;
        paintedLandscape = modelPainted ? { kind: "transition",
          background: { kind: "procedural", opacity: modelOpacity },
          foreground: { ...paintedPhoto!, opacity:paintedPhotoOpacity } } : paintedPhoto;
      }
      else {
        // A failed/zero photo cannot retire the valid material. Source-over
        // the missing alpha only; redrawing viewOpacity over the partial pass
        // would over-occlude a faded foreground.
        opacity = viewOpacity;
        const priorAlpha = modelPainted ? modelOpacity : 0;
        const restoreOpacity = priorAlpha < 1 ? (viewOpacity - priorAlpha) / (1 - priorAlpha) : 0;
        if (modelPainted && readiness === 0 || context.landscape(artworkView, sun, mode === "OBSERVATION", null, restoreOpacity))
          paintedLandscape = PROCEDURAL_SKY_LANDSCAPE;
        else if (modelPainted) { paintedLandscape = PROCEDURAL_SKY_LANDSCAPE; opacity = modelOpacity; }
      }
    }
    else if (landscape.panorama && paintPhoto(opacity)) {
      paintedLandscape = paintedPhoto;opacity=paintedPhotoOpacity;
    }
    else if (context.landscape(artworkView, sun, mode === "OBSERVATION", null, opacity)) paintedLandscape = PROCEDURAL_SKY_LANDSCAPE;
    if (paintedLandscape && paintedLandscape.kind !== "transition")
      paintedLandscape = skyLandscapeMaskWithOpacity(paintedLandscape, opacity);
  }
  if (landscape?.enabled) landscape.availability?.(landscapePending ? null : Boolean(paintedLandscape));
  const imageViewHull=paintedSdssFields.length || deepSkyRegistration ? skyArtworkViewRayHull(artworkView,width,height) : null;
  if (paintedLandscape && (paintedSdssFields.length || deepSkyRegistration)) {
    const coveredView=skyLandscapeMaskCoversRayHull(paintedLandscape,imageViewHull);
    // A covered fine field cannot erase the visible wider field's provenance.
    paintedSdssOpticalImage = coveredView ? null : [...paintedSdssFields].reverse().find(field =>
      !skyLandscapeMaskCoversRayHull(paintedLandscape, field.registration.corners))?.image ?? null;
    if (deepSkyRegistration && (coveredView || skyLandscapeMaskCoversRayHull(paintedLandscape,deepSkyRegistration.corners))) paintedDeepSkyImage=null;
  }
  context.finish();
  const contributingHipsGroups=new Set([...new Set(submittedHipsGroups.values())].filter(group=>
    context.skyImageMeshContribution?.(group)==="positive"));
  const completedOptical = targetOpticalSubmission?.draw.submitted ? completeTargetSkyOptical(targetOpticalSubmission.frame,
    targetOpticalSubmission.draw, targetOpticalSubmission.surface.artworkLevelsContribution(targetOpticalSubmission.draw)) :
    completeLegacySkyOptical(sdssOpticalImage, paintedSdssOpticalImage);
  const identity = skyPickIdentity(data,currentSupplement);
  const visibleStarReceipts = filterSkyBodyOccludedStars(paintedObjects, namedStars);
  painted?.(identity.catalogVersion && frameAt ? {
    catalogVersion: identity.catalogVersion,
    catalogHash: identity.catalogHash,
    frameAt,
    width,
    height,
    view: {basis,verticalFovDeg,...(center?{center}:{}),landscape:paintedLandscape},
    objects: visibleStarReceipts.objects,
    namedStars: visibleStarReceipts.namedStars,
    suppressedBodyReferences,
    deepSkyAuxiliaryDecisions: copySkyDeepAuxiliaryDecisions(deepSkyAuxiliaryDecisions),
  } : null, Object.freeze({ sdssOptical: completedOptical, deepSkyImage: paintedDeepSkyImage,galacticImage:paintedGalacticImage,
    ...(preparedRegions ? { preparedRegions: completeSkyScenePreparedRegions(regionSubmissions) } : {}),
    bodyImages:Object.freeze(paintedBodyImages.filter(value=>skyNativeImageIsCurrent(value.image))),
    opticalHips:Object.freeze(paintedLandscape&&skyLandscapeMaskCoversRayHull(paintedLandscape,
      skyArtworkViewRayHull(artworkView,width,height))?[]:paintedOpticalHips.filter(tile=>skyNativeImageIsCurrent(tile.image)&&
        contributingHipsGroups.has(submittedHipsGroups.get(tile)!))) }));
  completed?.();
}
