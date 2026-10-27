import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { copySkyDeepAuxiliaryDecisions, sameSkyDeepAuxiliaryDecisions } from "./sky-deep-auxiliary-visibility";
import { sameSkyHipsCompletion } from "./sky-hips-source-credit";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import * as bodyImages from "./sky-body-image-completion";
import {createSkyViewBasis,sameSkyViewBasis} from "./sky-view-projection";
import * as preparedRegions from "./sky-prepared-region-frame";
import * as sceneResources from "./sky-scene-resources";
import { createSkyStarTransitions } from "./sky-star-transition";
import { createSkyStarDrawPreparation } from "./sky-star-draw-preparation";
import { createSkyReadyImages } from "./sky-ready-presentation";
import * as labelPresentation from "./sky-label-presentation";
import { constellationVisibility } from "./sky-constellation-visibility";
import { exactSkyTimeFrame } from "./sky-time-frame";
import {createSkyNameLayouts,sameSkyCatalogNames,pickSkyCatalogName,sameSkyControlNames,pickSkyControlName} from "./sky-name-layout";
import {resolvedSkyBodyReferences} from "./sky-body-label-presentation";
import {paintedSkyBoundsVisible,paintedSkyPointVisible} from "./sky-object-picking";
import {projectSkySelectionMarker} from "./sky-selection-marker";
import {skyObjectPositionIsCurrent} from "./sky-object-location";
import {locatedBodyOccludesMarker} from "./sky-located-object";
import {skyConstellationAvoidsPoints} from "./sky-constellation-labels";
import { createSkySceneFrameIdentity, type SkySceneFrameIdentity, type SkySceneFrameInput, type SkyScenePorts } from "./sky-scene-frame";
import type { SkyPickSnapshot } from "./sky-object-picking";
import { createSkyObservationTime, skyObservationFrameCurrent, skyObservationFrameReadable, skyObservationFrameAt, skyContinuousTimeCoverage,
  type SkyObservationTimeState } from "./sky-observation-time";
import { presentSkyTime, selectSkyTimePresentation, skyTimeRulerRows } from "./sky-time-presentation";
// The coverage owner is pure; load its actual declaration without importing
// the hook's React/Query runtime into these controlled page-port tests.
const skyTimeModelCovers: typeof import("./use-sky-time-geometry").skyTimeModelCovers = (() => {
  const source = ts.createSourceFile("use-sky-time-geometry.ts", readFileSync(
    new URL("./use-sky-time-geometry.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const owner = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "skyTimeModelCovers");
  if (!owner) throw new Error("sky_time_coverage_owner_missing");
  return vm.runInNewContext(ts.transpileModule(`(${owner.getText(source).replace(/^export /, "")})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
})();
export const skyPageSceneTestDependencies={liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,
  copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,sameSkyHipsCompletion,skyNativeImageIsCurrent,sameSkyViewBasis,
  ...bodyImages,...preparedRegions,...sceneResources,...labelPresentation,constellationVisibility,exactSkyTimeFrame,sameSkyCatalogNames,pickSkyCatalogName,
  sameSkyControlNames,pickSkyControlName,resolvedSkyBodyReferences,paintedSkyBoundsVisible,paintedSkyPointVisible,
  projectSkySelectionMarker,skyObjectPositionIsCurrent,locatedBodyOccludesMarker,skyConstellationAvoidsPoints,createSkySceneFrameIdentity,
  skyObservationFrameCurrent,skyObservationFrameReadable,skyObservationFrameAt,skyContinuousTimeCoverage};

/** Explicit neutral time generation for camera/label reader fixtures. No
 * native frame, geometry or Context qualification is supplied by this adapter. */
export function skyPageTimeTestBindings(at: string, overrides: Partial<SkyObservationTimeState> = {}) {
  const timeIntent = { ...createSkyObservationTime().snapshot(), at, ...overrides };
  return { skyObservationFrameCurrent, skyObservationFrameReadable, timeIntent,
    timePlaying: timeIntent.mode === "PLAYING", timePreviewing: timeIntent.previewMotion === "moving" };
}

/** Execute this page's time selection declarations with controlled inputs.
 * Effects, Query and native acceptance remain outside this adapter. Keeping
 * the actual dependency chain here avoids isolated readers silently omitting
 * a newly admitted presentation window or accepted-frame fence. */
export function skyPageTimePresentationTestCode(source: ts.SourceFile, extraNames: readonly string[] = []) {
  const names = new Set(["committedAt", "timeBinding", "restoredAt", "requestedAt", "intentPresentationAt",
    "timePlaying", "timePresentationScope", "acceptedTimePresentationFor", "acceptedTimePresentation",
    "acceptedMotionPresentation", "preparedTimeSample", "presentationAt", "presentationModel", "presentationSources",
    "requestedTimePresentation", "timePresentation", "timeGeometryReady", "timeRuler", "timeRows", ...extraNames]);
  const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage");
  if (!page || !ts.isFunctionDeclaration(page) || !page.body) throw new Error("sky_page_time_owner_missing");
  const declarations = page.body.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations]).filter(declaration => names.has(declaration.name.getText(source)));
  if (declarations.length !== names.size) throw new Error("sky_page_time_declarations_missing");
  return declarations.map(declaration => `const ${declaration.getText(source)};`).join("\n");
}

/** Neutral platform slots supply no accepted frame or resource qualification. */
export function skyPageTimePresentationTestBindings(bindings: Record<string, any>) {
  const observationTime = bindings.observationTime ?? createSkyObservationTime();
  return { presentSkyTime, selectSkyTimePresentation, skyTimeRulerRows, skyTimeModelCovers, exactSkyTimeFrame,
    skyObservationFrameAt, skyObservationFrameCurrent, useMemo: (compute: () => unknown) => compute(),
    mode: "NIGHT", canvasNodeRevision: 0, skyInteractionRevision: 0, pageVisible: false,
    skyResourcesActive: false, canvasError: null, canvasGenerationRef: { current: 1 },
    presentedSkyFrame: null, presentedSkyFrameRef: { current: null }, previewGeometry: {},
    timeModel: null, timeGeometrySources: undefined, observationTime, ...bindings,
    timeIntent: { ...observationTime.snapshot(), ...bindings.timeIntent } };
}

/** Minimum empty resource declarations for tests of the page's camera port.
 * Supplied publications/bitmaps remain unchanged; absence is never success. */
export const skyPageCanvasTestFrame = <T extends object>(frame: T) => ({ mode: "NIGHT", heading: null, pose: null,
  manualBasis: null, verticalFovDeg: 45, timePresentation: null, timeGeneration: 0, preparedRegionImages: [], bodyImageBindings: [], hipsTiles: [], ...frame });

/** Empty resource declarations for a controlled accepted reader. This supplies
 * no draw receipt or success; a test's actual family completions override them. */
export function skyPageCompletedResourceTestFrame<T extends object>(frame: T) {
  const absent: sceneResources.SkyCompletedSceneResources = { sdssOptical: null, preparedRegions: [], deepSkyImage: null,
    galacticImage: null, opticalHips: [], bodyImages: [], landscape: null };
  return { ...absent, ...frame };
}

/** Controlled empty receipt for page-camera tests that replace the renderer.
 * It conveys no scientific content, image credit or actual draw success. */
export function skyPageEmptyPick(identity:SkySceneFrameIdentity):SkyPickSnapshot {
  return {identity,catalogVersion:'controlled-empty',catalogHash:'controlled-empty',
    frameAt:identity.observation.frameAt??'',width:identity.canvas.width,height:identity.canvas.height,objects:[]};
}

/** Controlled native acceptance for page consumers that do not execute the
 * renderer. The caller declares the observation, copied view and Canvas once;
 * both readers receive that exact identity. Later fixture changes do not
 * silently refresh a previously accepted pair. This is not GPU/draw evidence. */
export function skyPageAcceptedTestFrame<F extends object,
  P extends Omit<SkyPickSnapshot, "identity" | "frameAt" | "width" | "height">>(
  input: SkySceneFrameIdentity, frame: F, picked: P,
) {
  const identity = createSkySceneFrameIdentity(input);
  return {
    frame: { timeGeneration: 0, ...skyPageCompletedResourceTestFrame(frame), identity, data: identity.observation.data, frameAt: identity.observation.frameAt,
      stellarSupplement: identity.observation.stellarSupplement, mode: identity.view.mode,
      nativeCanvasGeneration: identity.canvas.generation },
    picked: { ...picked, identity, frameAt: identity.observation.frameAt ?? "",
      width: identity.canvas.width, height: identity.canvas.height,
      view: identity.view.manualBasis ? { ...picked.view, basis: identity.view.manualBasis,
        verticalFovDeg: identity.view.verticalFovDeg, center: identity.view.center } : undefined },
  };
}

/** Shared controlled ports for the actual page Canvas callbacks. Every caller
 * supplies its result-bearing ports; these defaults represent absent resources
 * and out-of-scope UI effects, never a successful draw or publication. */
export function skyPageCanvasTestBindings(bindings:Record<string,any>={}) {
  // Generation zero is a controlled neutral time scope for camera/resource
  // port tests; it supplies no requested time, geometry or product acceptance.
  const observationTime = bindings.observationTime ?? createSkyObservationTime();
  const basis=bindings.basis??createSkyViewBasis(0,0,0)!;
  const measureText = (text:string)=>({width:text.length*8,left:0,right:text.length*8,ascent:9,descent:9});
  const canvasSurfaceRef=bindings.canvasSurfaceRef??{current:{present(){}}};
  if(canvasSurfaceRef.current && !canvasSurfaceRef.current.measureText)
    canvasSurfaceRef.current.measureText=measureText;
  const presentedSkyFrameRef=bindings.presentedSkyFrameRef??{current:null};
  const setPresentedSkyFrame=(update:any)=>{
    if(bindings.setPresentedSkyFrame) bindings.setPresentedSkyFrame(typeof update==='function'?(previous:any)=>{
      const next=update(previous);presentedSkyFrameRef.current=next;return next;
    }:update);
    else presentedSkyFrameRef.current=typeof update==='function'?update(presentedSkyFrameRef.current):update;
    if(typeof update!=='function')presentedSkyFrameRef.current=update;
  };
  return {...skyPageSceneTestDependencies,
    starTransitions:createSkyStarTransitions(),
    starDrawing:createSkyStarDrawPreparation(),
    readyImages:createSkyReadyImages(),
    nameLayouts:createSkyNameLayouts(),
    skyTapRef:{current:null},
    navigationRequestRef:{current:null},navigationCurrentRef:{current:()=>true},navigationApplyRef:{current(){}},
    stopBrowsingAnimation(){},setManualBasis(){},
    objectSelection:{snapshot:()=>({object:null})},skySelectionPositionRef:{current:null},
    contextSession:{busy:false},setVerticalFovState(){},
    canvasGenerationRef:{current:1},pendingSkyPaintRef:{current:null},paintedSkyObjectsRef:{current:null},
    canvasDrawRevisionRef:{current:0},canvasSurfaceRef,
    automaticContributionGroupsRef:{current:0},acceptSkyCalibrationRef:{current(){}},
    preparedRegionFailureRef:{current(){}},browsingDrawRef:{current(){}},
    renderTimePresentation:null,timePresentationScope:{},observationTime,timeIntent:observationTime.snapshot(),
    orientationController:{snapshot:()=>({alignment:{mode:'auto'}})},
    manualBasisRef:{current:null},objectTracking:{snapshot:()=>({target:null})},zoomRef:{current:45},
    viewportInsetsRef:{current:{top:0,bottom:0}},reducedMotionRef:{current:false},
    setTimeout(){return 1;},clearTimeout(){},
    resolveSkyCanvasView:({width,height,requestedFov,occlusionInsets}:any)=>({localView:basis,verticalFovDeg:requestedFov,
      progress:1,center:{x:width/2,y:height/2},intent:'manual',occlusionInsets}),
    EMPTY_SKY_IMAGES:new Map(),
    setCanvasSize(){},setCanvasError(){},publishAcceptanceSkySceneInspection(){},
    setArtworkContributionUnavailable(){},setSolarLightUnavailable(){},setMoonDiscUnavailable(){},
    setPlanetDiscUnavailable(){},setSunDiscUnavailable(){},setGalacticBandUnavailable(){},setLandscapeUnavailable(){},
    preparedRegions:{frames:[]},...bindings,presentedSkyFrameRef,setPresentedSkyFrame,
    browsingCamera:{update:()=>({view:basis,animating:false}),accept:()=>false,current:()=>true,...bindings.browsingCamera},
    orientation:{latestPresentation:{current:null},presented:{current:null},...bindings.orientation}};
}

/** Locate the renderer's named completion/failure port without depending on its
 * argument position or copying the callback body into each requirement test. */
export function skyPageScenePort(source:ts.SourceFile,name:keyof SkyScenePorts):ts.Expression {
  let expression:ts.Expression|undefined;
  const find=(node:ts.Node)=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='drawSkyScene'){
    const ports=node.arguments[2];
    if(ports&&ts.isObjectLiteralExpression(ports)){
      const property=ports.properties.find(value=>value.name?.getText(source)===name);
      if(property&&ts.isPropertyAssignment(property))expression=property.initializer;
    }
  }ts.forEachChild(node,find);};find(source);
  if(!expression)throw Error(`sky_page_scene_port_missing:${name}`);
  return expression;
}

/** Read an admitted input group by name from the real page declaration. */
export function skyPageSceneInputMember(source:ts.SourceFile,path:readonly string[]):ts.Expression {
  let initializer:ts.Expression|undefined;
  const find=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='sceneInput')initializer=node.initializer;
    ts.forEachChild(node,find);};find(source);
  for(const name of path){
    if(!initializer||!ts.isObjectLiteralExpression(initializer))throw Error(`sky_page_scene_input_group_missing:${name}`);
    const property=initializer.properties.find(value=>value.name?.getText(source)===name);
    initializer=property&&ts.isPropertyAssignment(property)?property.initializer:undefined;
  }
  if(!initializer)throw Error(`sky_page_scene_input_missing:${path.join('.')}`);
  return initializer;
}

/** Resolve current page resource declarations instead of copying visibility or
 * eligibility policy into VM consumers. All platform/result inputs are controlled. */
export function skyPageResourceTestScope(source:ts.SourceFile,bindings:Record<string,unknown>){
  const names=['resourcePageVisible','skyResourcesActive','skyImageryActive','skyResourcesPaused'];
  const expressions=new Map<string,ts.Expression>();
  const find=(node:ts.Node)=>{if(ts.isVariableDeclaration(node)&&node.initializer&&names.includes(node.name.getText(source)))
    expressions.set(node.name.getText(source),node.initializer);ts.forEachChild(node,find);};
  find(source);
  if(expressions.size!==names.length)throw new Error('sky_page_resource_declarations_missing');
  const context=vm.createContext({sourceReturn:false,...bindings});
  vm.runInContext(ts.transpileModule(names.map(name=>`const ${name}=${expressions.get(name)!.getText(source)};`).join('\n'),
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  return context;
}

/** Name the lifecycle owner, not a same-named property in another callback. */
export function skyPageCanvasLifecyclePort(source: ts.SourceFile,
  name: "paint" | "presented" | "invalidated" | "sameScene"): ts.Expression {
  let expression: ts.Expression | undefined;
  const find = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "createSkyCanvasLifecycle") {
      const options = node.arguments[0];
      if (!options || !ts.isObjectLiteralExpression(options) || expression) throw new Error("sky_page_canvas_owner_ambiguous");
      const property = options.properties.find(value => value.name?.getText(source) === name);
      if (!property || !ts.isPropertyAssignment(property)) throw new Error(`sky_page_canvas_port_missing:${name}`);
      expression = property.initializer;
    }
    ts.forEachChild(node, find);
  };
  find(source);
  if (!expression) throw new Error("sky_page_canvas_owner_missing");
  return expression;
}

/** Execute the actual page's staged painted/done/accepted callbacks. Controlled
 * dependencies are supplied by each requirement test; this is not native/GPU evidence. */
export function skyPagePaintCommit(source: ts.SourceFile, bindings: Record<string, unknown>) {
  const paint = skyPageCanvasLifecyclePort(source, "paint"), presented = skyPageCanvasLifecyclePort(source, "presented");
  const generation=(bindings.canvasGenerationRef as {current:number}|undefined)?.current??1;
  const frame=bindings.frame&&skyPageCanvasTestFrame({nativeImageGeneration:generation,
    orientationRevision:0,inspection:{spotId:'controlled'},...bindings.frame as object});
  let stage:((snapshot:unknown,sources:unknown)=>void)|undefined,complete:(()=>void)|undefined;
  let submitted:SkySceneFrameInput|undefined;
  const context = vm.createContext(skyPageCanvasTestBindings({...bindings,
    ...(frame?{drawSkyScene:(_surface:unknown,input:SkySceneFrameInput,ports:SkyScenePorts)=>{
      submitted=input;
      stage=(snapshot:unknown,sources:unknown)=>ports.painted?.({identity:input.identity,
        snapshot:snapshot?{...snapshot as SkyPickSnapshot,identity:input.identity}:null,
        sources:sources as Parameters<NonNullable<SkyScenePorts['painted']>>[0]['sources']});
      complete=()=>ports.completed?.(input.identity);
    }}:{}),
    canvasGenerationRef:bindings.canvasGenerationRef??{current:generation}}));
  const execute = (expression: ts.Expression) => vm.runInContext(ts.transpileModule(`(${expression.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const accept=execute(presented);
  context.done = () => accept(frame, { width: 390, height: 844 });
  if(frame)execute(paint)(bindings.context??{},frame,{width:390,height:844},()=>context.done());
  const publish=(snapshot:unknown,sources:unknown)=>{if(!stage)throw Error('sky_page_paint_not_submitted');stage(snapshot,sources);};
  const done=()=>{if(!complete)throw Error('sky_page_paint_not_submitted');complete();};
  return Object.assign((snapshot: unknown, sources: unknown) => { publish(snapshot,sources); done(); },
    { stage:publish, complete:done, accept, context, submitted:()=>submitted });
}
