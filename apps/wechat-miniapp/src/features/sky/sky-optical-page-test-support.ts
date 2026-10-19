import vm from "node:vm";
import ts from "typescript";
import { liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { copySkyDeepAuxiliaryDecisions, sameSkyDeepAuxiliaryDecisions } from "./sky-deep-auxiliary-visibility";
import { sameSkyHipsCompletion } from "./sky-hips-source-credit";
import { skyNativeImageIsCurrent } from "./sky-artwork-loader";
import * as bodyImages from "./sky-body-image-completion";
import {createSkyViewBasis,sameSkyViewBasis} from "./sky-view-projection";
import * as preparedRegions from "./sky-prepared-region-frame";
import { createSkyStarTransitions } from "./sky-star-transition";
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
export const skyPageSceneTestDependencies={liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,
  copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,sameSkyHipsCompletion,skyNativeImageIsCurrent,sameSkyViewBasis,
  ...bodyImages,...preparedRegions,...labelPresentation,constellationVisibility,exactSkyTimeFrame,sameSkyCatalogNames,pickSkyCatalogName,
  sameSkyControlNames,pickSkyControlName,resolvedSkyBodyReferences,paintedSkyBoundsVisible,paintedSkyPointVisible,
  projectSkySelectionMarker,skyObjectPositionIsCurrent,locatedBodyOccludesMarker,skyConstellationAvoidsPoints};

/** Minimum empty resource declarations for tests of the page's camera port.
 * Supplied publications/bitmaps remain unchanged; absence is never success. */
export const skyPageCanvasTestFrame = <T extends object>(frame: T) => ({ mode: "NIGHT", timePresentation: null, preparedRegionImages: [], bodyImageBindings: [], hipsTiles: [], ...frame });

/** Shared controlled ports for the actual page Canvas callbacks. Every caller
 * supplies its result-bearing ports; these defaults represent absent resources
 * and out-of-scope UI effects, never a successful draw or publication. */
export function skyPageCanvasTestBindings(bindings:Record<string,any>={}) {
  const basis=bindings.basis??createSkyViewBasis(0,0,0)!;
  const measureText = (text:string)=>({width:text.length*8,left:0,right:text.length*8,ascent:9,descent:9});
  const canvasSurfaceRef=bindings.canvasSurfaceRef??{current:{present(){}}};
  if(canvasSurfaceRef.current && !canvasSurfaceRef.current.measureText)
    canvasSurfaceRef.current.measureText=measureText;
  return {...skyPageSceneTestDependencies,
    starTransitions:createSkyStarTransitions(),
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
    renderTimePresentation:null,timePresentationScope:{},
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
    preparedRegions:{frames:[]},...bindings,
    browsingCamera:{update:()=>({view:basis,animating:false}),accept:()=>false,current:()=>true,...bindings.browsingCamera},
    orientation:{latestPresentation:{current:null},presented:{current:null},...bindings.orientation}};
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

/** Execute the actual page's staged painted/done/accepted callbacks. Controlled
 * dependencies are supplied by each requirement test; this is not native/GPU evidence. */
export function skyPagePaintCommit(source: ts.SourceFile, bindings: Record<string, unknown>) {
  let paint: ts.Expression | undefined, presented: ts.Expression | undefined;
  const find = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "paint") paint = node.initializer;
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "presented") presented = node.initializer;
    ts.forEachChild(node, find);
  };
  find(source);
  if (!paint || !presented) throw new Error("sky_page_paint_callbacks_missing");
  const generation=(bindings.canvasGenerationRef as {current:number}|undefined)?.current??1;
  const frame=bindings.frame&&skyPageCanvasTestFrame({nativeImageGeneration:generation,
    orientationRevision:0,inspection:{spotId:'controlled'},...bindings.frame as object});
  let stage:((snapshot:unknown,sources:unknown)=>void)|undefined,complete:(()=>void)|undefined;
  const context = vm.createContext(skyPageCanvasTestBindings({...bindings,
    ...(frame?{drawSkyScene:(...args:any[])=>{stage=args[8];complete=args[9];}}:{}),
    canvasGenerationRef:bindings.canvasGenerationRef??{current:generation}}));
  const execute = (expression: ts.Expression) => vm.runInContext(ts.transpileModule(`(${expression.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const accept=execute(presented);
  context.done = () => accept(frame, { width: 390, height: 844 });
  if(frame)execute(paint)(bindings.context??{},frame,{width:390,height:844},()=>context.done());
  const publish=(snapshot:unknown,sources:unknown)=>{if(!stage)throw Error('sky_page_paint_not_submitted');stage(snapshot,sources);};
  const done=()=>{if(!complete)throw Error('sky_page_paint_not_submitted');complete();};
  return Object.assign((snapshot: unknown, sources: unknown) => { publish(snapshot,sources); done(); },
    { stage:publish, complete:done, accept, context });
}
