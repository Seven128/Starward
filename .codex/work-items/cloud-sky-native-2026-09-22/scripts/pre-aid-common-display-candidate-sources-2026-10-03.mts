/** Task-only display-policy extension of the frozen local observation trial.
 * Original source and the old trial are never changed by this builder. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCandidates as localCandidates,sky} from './pre-aid-local-candidate-sources-2026-10-03.mts';
import {createBrowserCandidate as localBrowser} from './pre-aid-local-candidate-sources-2026-10-03.mts';
export {sky};
export function createCandidates(root:string) {
  const result=localCandidates(root);
  const replace=(text:string,before:string,after:string,label:string)=>{assert.equal(text.split(before).length-1,1,label);result.changes.push({label,before,after});return text.replace(before,after);};
  const name=sky+'sky-deep-auxiliary-visibility.ts';
  const original=fs.readFileSync(path.join(root,name),'utf8');result.originals.set(name,original);
  const visibility=`import type {SkyArtworkLocalObservation} from "./sky-artwork-level-composition";
${original.replaceAll('\r\n','\n')}
/** Task-only eligibility in the frozen renderer's catalog-region shader model.
 * This is a display guard, not physical ICRS accuracy or scientific recognition.
 * Legacy 24–96 tuning is only a candidate: no production/default adoption. */
export interface SkyDeepAuxiliaryDisplayFacts {
  readonly reference: string;
  readonly regionReference: string | null;
  readonly submitted: boolean;
  readonly finePrepared: boolean;
  readonly coarseExpected: boolean;
  readonly coarsePrepared: boolean;
  readonly nativeCurrent: boolean;
  readonly local: SkyArtworkLocalObservation;
}
export function skyDeepAuxiliaryModelOpacity(verticalFovDeg:number,viewportHeight:number,
  majorAxisArcmin:number|null,facts:SkyDeepAuxiliaryDisplayFacts|null):number {
  if(!facts || facts.regionReference!==facts.reference || !facts.submitted || !facts.finePrepared ||
    (facts.coarseExpected&&!facts.coarsePrepared) || !facts.nativeCurrent ||
    facts.local.scope!=="frozen-highp-shader-pixel-centers" || facts.local.signalRevision===null) return 1;
  let selected=0;
  for(const slot of [facts.local.fine,facts.local.coarse]) {
    // not-selected was authorized by the exact expected/prepared/current caller,
    // never inferred from zero local samples, retirement or registration failure.
    if(slot.selection==="not-selected") continue;
    if(slot.selection!=="has" || slot.photo!=="positive") return 1;
    selected++;
  }
  return selected>0 ? deepSkyAuxiliaryOpacity(verticalFovDeg,viewportHeight,majorAxisArcmin,true) : 1;
}
`;
  result.candidates.set(name,visibility);result.changes.push({label:'visibility: one model-domain common display guard; curve candidate only',before:'EOF',after:'SkyDeepAuxiliaryDisplayFacts and skyDeepAuxiliaryModelOpacity'});
  const helperName=sky+'sky-sdss-science-scene.ts';
  let helper=result.candidates.get(helperName)!;
  helper=replace(helper,'import { unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";','import { unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";\nimport type {SkyDeepAuxiliaryDisplayFacts} from "./sky-deep-auxiliary-visibility";','science: display-facts type dependency');
  helper+=`\n/** Capture the original expected-slot contract and same-revision local facts
 * once before aids. Later source-credit filtering cannot rewrite this record. */
export function skyScienceOpticalDisplayFacts(submission:SkySceneScienceOpticalSubmission):SkyDeepAuxiliaryDisplayFacts {
  const local=observeSkySceneScienceOptical(submission),{frame,draw,region}=submission;
  return Object.freeze({reference:frame.reference,regionReference:region?.reference??null,
    submitted:draw.submitted,finePrepared:draw.finePrepared,coarseExpected:!!frame.coarser,
    coarsePrepared:draw.coarsePrepared,nativeCurrent:skyNativeImageIsCurrent(frame.image)&&
      (!frame.coarser||skyNativeImageIsCurrent(frame.coarser.image)),local});
}\n`;
  result.candidates.set(helperName,helper);result.changes.push({label:'science: one expected/current/prepared + local envelope before Scene aids',before:'EOF',after:'skyScienceOpticalDisplayFacts'});
  const sceneName=sky+'sky-scene-render.ts';
  let scene=result.candidates.get(sceneName)!;
  scene=replace(scene,'copySkyDeepAuxiliaryDecisions, deepSkyAuxiliaryOpacity,','copySkyDeepAuxiliaryDecisions, deepSkyAuxiliaryOpacity, skyDeepAuxiliaryModelOpacity,','Scene: common model decision import');
  scene=replace(scene,'submitSkySceneScienceOptical, observeSkySceneScienceOptical,','submitSkySceneScienceOptical, skyScienceOpticalDisplayFacts,','Scene: exact captured facts caller');
  scene=replace(scene,`  // Task-only facts before the first area aid; no policy/scalar adoption.
  if (scienceSubmission) {
    const observation=observeSkySceneScienceOptical(scienceSubmission);
    (context as SkyRenderSurface & {__taskRecordPreAid?:(submission:unknown,result:unknown)=>void}).__taskRecordPreAid?.(scienceSubmission,observation);
  }`, `  // Task-only display candidate: one immutable decision input before all aids.
  const preAidScienceFacts=scienceSubmission && !scienceSubmission.allowInfrared?skyScienceOpticalDisplayFacts(scienceSubmission):null;
  if(scienceSubmission && preAidScienceFacts)
    (context as SkyRenderSurface & {__taskRecordPreAid?:(submission:unknown,result:unknown,facts:unknown)=>void}).__taskRecordPreAid?.(scienceSubmission,preAidScienceFacts.local,preAidScienceFacts);`,'Scene: exactly one pre-aid facts capture');
  scene=replace(scene,'const auxiliaryOpacity = deepSkyAuxiliaryOpacity(verticalFovDeg, height, entry.majorAxisArcmin, imagePainted);',`const auxiliaryOpacity = scienceSubmission && !scienceSubmission.allowInfrared && scienceSubmission.frame.reference===entry.objectRef
        ? skyDeepAuxiliaryModelOpacity(verticalFovDeg,height,entry.majorAxisArcmin,preAidScienceFacts)
        : deepSkyAuxiliaryOpacity(verticalFovDeg, height, entry.majorAxisArcmin, imagePainted);`,'Scene: exact matching entry common scalar into existing snapshot/ring');
  result.candidates.set(sceneName,scene);
  return result;
}

/** Execute only these source-derived page callbacks, not a mounted Taro page.
 * Their production text is copied and transpiled by the App's actual TS 5.9.3. */
export function createBrowserCandidate(root:string) {
  const base=localBrowser(root),pagePath=sky+'spot-sky-page.tsx',page=fs.readFileSync(path.join(root,pagePath),'utf8');
  const require=createRequire(path.join(root,'package.json')),ts=require(path.join(root,'apps/wechat-miniapp/node_modules/typescript/lib/typescript.js'));
  assert.equal(ts.version,'5.9.3');
  const source=ts.createSourceFile(pagePath,page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const props=new Map<string,any>(),vars=new Map<string,any>(),effects:any[]=[];let labelFunction:any,labelMap:any;
  const walk=(n:any)=>{
    if(ts.isCallExpression(n)&&n.expression.getText(source)==='createSkyCanvasLifecycle'){
      assert(ts.isObjectLiteralExpression(n.arguments[0]));
      for(const p of n.arguments[0].properties)if(ts.isPropertyAssignment(p)&&['paint','presented','failed','invalidated','sameScene'].includes(p.name.getText(source)))props.set(p.name.getText(source),p.initializer);
    }
    if(ts.isVariableDeclaration(n)&&n.initializer)vars.set(n.name.getText(source),n.initializer);
    if(ts.isCallExpression(n)&&n.expression.getText(source)==='useEffect')effects.push(n);
    if(ts.isFunctionDeclaration(n)&&n.name?.getText(source)==='SkyOrientationCatalogLabel')labelFunction=n;
    if(ts.isCallExpression(n)&&n.expression.getText(source)==='visibleNamedLabels.map')labelMap=n;
    ts.forEachChild(n,walk);
  };walk(source);
  assert.equal(props.size,5);
  const draw=vars.get('draw');assert(ts.isCallExpression(draw));
  const effect=effects.find(e=>e.arguments[0].getText(source).includes('canvasLifecycle.setMounted(Boolean(contextComplete'));
  assert(effect);
  const expressions:any=Object.fromEntries([...props].map(([k,v])=>[k,v.getText(source)]));
  expressions.draw=draw.arguments[0].getText(source);expressions.effect=effect.arguments[0].getText(source);
  expressions.dom=vars.get('visibleNamedCatalogObjects').getText(source);
  assert(labelFunction&&labelMap);
  expressions.labels=vars.get('visibleNamedLabels').getText(source);expressions.labelFunction=labelFunction.getText(source);expressions.labelMap=labelMap.getText(source);
  const javascript=Object.fromEntries(Object.entries(expressions).map(([k,v])=>[k,ts.transpileModule(`(${v})`,{fileName:'page-expression.tsx',compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText]));
  let text=base.text;
  text=text.replace("import {registerSkyNativeImageLifetime}","import {createSkyArtworkLoader,registerSkyNativeImageLifetime}");
  const imports=`import {createSkyCanvasLifecycle} from '../../../../apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle';
import {resolveSkyCanvasView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-canvas-view';
import {createSkyBrowsingCamera} from '../../../../apps/wechat-miniapp/src/features/sky/sky-browsing-camera';
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,skyDeepAuxiliaryDecisionOpacity,deepSkyAuxiliaryOpacity} from '../../../../apps/wechat-miniapp/src/features/sky/sky-deep-auxiliary-visibility';
import {liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-completion';
import {resolvedSkyBodyReferences} from '../../../../apps/wechat-miniapp/src/features/sky/sky-body-label-presentation';
import {resolveSkySceneFrame,resolveSkyDeepSkyScene,skySceneHasContent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import {projectHorizontalPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-projection';
import {paintedSkyPointVisible,pickPaintedSkyObjects,skyObjectKindLabel,skyObjectMagnitudeLabel} from '../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light';
const actualPageExpressions=${JSON.stringify(javascript)};
`;
  const start=text.indexOf('  let failure:string|null=null,renderer:any=null;');assert(start>0);
  const tailPath='.codex/work-items/cloud-sky-native-2026-09-22/scripts/pre-aid-common-display-browser-tail-2026-10-03.inc.ts';
  const tail=fs.readFileSync(path.join(root,tailPath),'utf8');
  text=imports+text.slice(0,start)+tail;
  return {originalPath:base.originalPath,original:base.original,text,changes:[...base.changes,{label:'harness: one same-Canvas zoom lane + actual page AST callbacks and recovery; old eight-case body retired in this new task generation',before:'old local trial loop',after:'actual page/lifecycle continuous tail'}],pagePath,page,expressions,tailPath,additionalFiles:[pagePath,tailPath]};
}
