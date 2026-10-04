/** Bounded extra geometry and actual W3 retirement callback readback. No GPU. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {createSkyCanvasLifecycle} from '../../../../apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle';
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,skyDeepAuxiliaryDecisionOpacity,deepSkyAuxiliaryOpacity} from '../../../../apps/wechat-miniapp/src/features/sky/sky-deep-auxiliary-visibility';
import {liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-completion';
import {registerSkyNativeImageLifetime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {resolvedSkyBodyReferences} from '../../../../apps/wechat-miniapp/src/features/sky/sky-body-label-presentation';
import {resolveSkySceneFrame,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
import {projectHorizontalPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-projection';
import {paintedSkyPointVisible} from '../../../../apps/wechat-miniapp/src/features/sky/sky-object-picking';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light';

const ROOT=path.resolve(fileURLToPath(new URL('../../../../',import.meta.url))),OUT=path.join(ROOT,'output/common-opacity-independent-addendum-1002-r2'),sky='apps/wechat-miniapp/src/features/sky/';
assert(!fs.existsSync(OUT));fs.mkdirSync(OUT);
const read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p)),json=(p:string)=>JSON.parse(read(p).toString('utf8'));
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const absolute=path.resolve(ROOT,p),b=fs.readFileSync(absolute);return{path:path.relative(ROOT,absolute).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,v:any)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(OUT,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const basePath='output/common-opacity-independent-1002-r2/executed-script.mts.txt',baseSource=ts.createSourceFile('base.mts',read(basePath).toString('utf8'),ts.ScriptTarget.Latest,true);
const helperNames=['parse','optical','surface','scene','harness'];
const helpers=baseSource.statements.filter(n=>ts.isFunctionDeclaration(n)&&helperNames.includes(n.name!.text));assert.equal(helpers.length,helperNames.length);
const reportPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json',report=json(reportPath).data;
const preparedPath='output/playwright/cloud-sky-science-scene-1002-r3/prepared-input.json',at=json(preparedPath).at;
const observationPath='output/playwright/cloud-sky-science-scene-1002-r3/observations.json',basis=json(observationPath).basis;
const pageText=read(sky+'spot-sky-page.tsx').toString('utf8'),fine={},coarse={};
const shared:any={assert,ts,vm,report,at,basis,fine,coarse,drawSkyScene,createSkyCanvasLifecycle,copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,skyDeepAuxiliaryDecisionOpacity,deepSkyAuxiliaryOpacity,liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,resolvedSkyBodyReferences,resolveSkySceneFrame,resolveSkyDeepSkyScene,projectHorizontalPoint,paintedSkyPointVisible,skyStarAppearance,skySolarLightAt};
const ctx=vm.createContext(shared);
vm.runInContext(ts.transpileModule(helpers.map(n=>n.getText(baseSource)).join('\n')+'\nthis.parse=parse;this.scene=scene;this.harness=harness;this.compile=(text,env)=>vm.runInNewContext(ts.transpileModule(`(${text})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,env);',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
shared.ast=shared.parse(pageText);const ast=shared.ast;
const controls:any[]=[],retire:Array<()=>void>=[];let before:any[]=[];
try{
  const graph=await build({absWorkingDir:ROOT,entryPoints:[sky+'sky-scene-render.ts',sky+'sky-canvas-lifecycle.ts'],outdir:path.join(OUT,'not-written'),bundle:true,write:false,metafile:true,platform:'node',format:'esm',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json')});
  const files=new Set(Object.keys(graph.metafile!.inputs).map(p=>path.resolve(ROOT,p)));for(const p of [basePath,reportPath,preparedPath,observationPath,sky+'spot-sky-page.tsx',sky+'sky-deep-auxiliary-visibility.ts',sky+'sky-object-picking.ts','apps/wechat-miniapp/tsconfig.json',fileURLToPath(import.meta.url),'tools/run-node.cjs'])files.add(path.resolve(ROOT,p));
  const require=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'));for(const name of ['typescript','esbuild']){const main=require.resolve(name);files.add(main);files.add(path.resolve(path.dirname(main),'../package.json'));}files.add(process.execPath);
  for(const item of json('output/common-opacity-independent-1002-r2/binding-before.json'))files.add(path.resolve(ROOT,item.path));
  for(const file of fs.readdirSync(path.join(ROOT,'output/common-opacity-independent-1002-r2')))files.add(path.join(ROOT,'output/common-opacity-independent-1002-r2',file));
  before=[...files].sort().map(bind);save('binding-before.json',before);save('metafile.json',graph.metafile);
  assert.equal(bind(sky+'spot-sky-page.tsx').sha256,'522d3ef3518ac9739a13ea019e7de68f8d21c14cd4629f1d9c74fd09ad3dbc88');
  const geometry=[];for(const [fov,width] of [[45,390],[45,1000],[85,390],[139,390]]){const r=shared.scene(null,fov,844,width),records=r.snapshot.deepSkyAuxiliaryDecisions;const points=resolveSkyDeepSkyScene(report.skyScene,at)!.frame.points!;let visits=0;const counted={*[Symbol.iterator](){for(const entry of records){visits++;yield entry;}}} as any;for(const point of points)skyDeepAuxiliaryDecisionOpacity(counted,report.skyScene.deepSky.catalog.entries[point[0]].objectRef);assert.equal(visits,points.length*records.length);geometry.push({fov,width,height:844,projectedReferences:records.map((x:any)=>x.reference),records:records.length,framePoints:points.length,lookupElementVisits:visits});}
  assert.notDeepEqual(geometry[0].projectedReferences,geometry[1].projectedReferences);const small=shared.scene(null,45,844,390),wide=shared.scene(null,45,844,1000);assert.equal(sameSkyDeepAuxiliaryDecisions(small.snapshot.deepSkyAuxiliaryDecisions,wide.snapshot.deepSkyAuxiliaryDecisions),false);
  controls.push({name:'Actual width changes projected membership; bounded current wide/dome record lookup cost',status:'passed',facts:geometry,scope:'Four actual command-surface geometry calls on the same frozen report/camera; not GPU/benchmark or future catalog maximum.'});
  function lease(){let current=true,releases=0;const listeners=new Set<()=>void>();const file={reference:'M:51',level:'DETAIL',fieldDegrees:.25,tempPath:'controlled-cached-W3-file',isCurrent:()=>current,release(){releases++;},onRetire(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn);}};return{file,listeners,get releases(){return releases;},retire(){current=false;for(const fn of [...listeners])fn();}};}
  const callback=ast.vars.get('setCanvasDeepSkyImage')!;assert(ts.isCallExpression(callback));const effect=ast.effects.find((e:any)=>e.arguments[0].getText(ast.source).includes('const subscriptions = owned.map(asset => asset.onRetire'));assert(effect);save('actual-w3-retirement-callbacks.json',{setCanvasDeepSkyImage:callback.arguments[0].getText(ast.source),effect:effect.arguments[0].getText(ast.source)});
  const facts=[];
  for(const retireWhich of ['current','pending-preferred']){const h=shared.harness(),current=lease(),preferred=retireWhich==='current'?current:lease(),image={},nativeRetire=registerSkyNativeImageLifetime(image,()=>current.file.isCurrent());retire.push(nativeRetire);const canvasAsset={...current.file,image,canvasGeneration:1};h.frame.sdssOpticalImage=null;h.frame.deepSkyImage=canvasAsset;h.queue();h.complete();const originalOpacity=skyDeepAuxiliaryDecisionOpacity(h.state.frame.deepSkyAuxiliaryDecisions,'M:51');assert(originalOpacity!<1);const nativeRef={current:canvasAsset},fileRef={current:{...current.file}},imageRef={current:null},failureRef={current:null};let canvasState:any=canvasAsset,state:string|undefined;
    const env:any={canvasDeepSkyImageRef:nativeRef,deepSkyRecoveryFileRef:fileRef,deepSkyImageFileRef:{current:preferred.file},storeCanvasDeepSkyImage(value:any){canvasState=typeof value==='function'?value(canvasState):value;},deepSkyImageAsset:preferred.file,canvasDeepSkyImage:canvasAsset,selectedDeepSkyEntry:{objectRef:'M:51'},desiredDeepSkyImageLevel:'DETAIL',deepSkyImageFailureRef:failureRef,requestedDeepSkyImageRef:imageRef,setDeepSkyImageState(value:string){state=value;}};imageRef.current=preferred.file;
    env.setCanvasDeepSkyImage=shared.compile(callback.arguments[0].getText(ast.source),env);const unsubscribe=shared.compile(effect.arguments[0].getText(ast.source),env)();
    preferred.retire();if(retireWhich==='current'){assert.equal(canvasState,null);assert.equal(nativeRef.current,null);assert.equal(fileRef.current,null);assert.equal(state,'ERROR');assert.equal(h.dom().find((x:any)=>x.reference==='M:51').auxiliaryOpacity,originalOpacity);h.queue({...h.frame,deepSkyImage:canvasState});assert.equal(h.dom().find((x:any)=>x.reference==='M:51').auxiliaryOpacity,originalOpacity);h.complete();assert.equal(h.dom().find((x:any)=>x.reference==='M:51').auxiliaryOpacity,1);}else{assert.strictEqual(canvasState,canvasAsset);assert.strictEqual(nativeRef.current,canvasAsset);assert(current.file.isCurrent());assert.equal(current.releases,0);assert.equal(state,'ERROR');assert.equal(h.dom().find((x:any)=>x.reference==='M:51').auxiliaryOpacity,originalOpacity);}
    unsubscribe();assert.equal(current.listeners.size,0);assert.equal(preferred.listeners.size,0);facts.push({retired:retireWhich,currentCanvasCleared:canvasState===null,registeredRetireSources:retireWhich==='current'?1:2,controlledFileReleaseCalls:preferred.releases,requestState:state,oldAcceptedOpacity:originalOpacity,finalAcceptedOpacity:skyDeepAuxiliaryDecisionOpacity(h.state.frame.deepSkyAuxiliaryDecisions,'M:51'),pendingPreferredFailureKeepsCoarse:retireWhich==='pending-preferred'});h.lifecycle.dispose();}
  controls.push({name:'Actual W3 subscription/setCanvas callback: current retirement queues recovery; failed pending preferred does not erase independent coarse',status:'passed',facts,scope:'Actual AST callbacks and Scene/lifecycle; file lease and React state commit controlled. Release call count is not physical IO or native graph release.'});
  const after=before.map(x=>bind(x.path));assert.deepEqual(after,before);save('binding-after.json',after);save('result.json',{status:'INDEPENDENT_BOUNDED_COMMON_OPACITY_ADDENDUM_PASSED',controls,bindings:before.length,currentFileBindingsExact:true,baseResult:bind('output/common-opacity-independent-1002-r2/result.json'),limits:['No GPU/browser/network/native/IDE execution.','Current admitted catalog 51 and measured records are actual input facts, not a maximum requirement or future cost forecast. Linear lookup is O(points×projected records); max theoretical for this input is 2601 string comparisons per evaluation.','Node/TS/esbuild identities added before this addendum execution only; not retrospective toolchain proof for base r2.','W3 callbacks do not automatically drive native Canvas submission in this test: controlled React commit is followed by existing page dependency/effect responsibility, separately executed in base shared-loader case. Real React scheduling/native timing remains unverified.','The public lease release function itself is controlled and idempotent semantics/physical unlink are not re-proven here.']});
  console.log(JSON.stringify({result:bind(path.join(OUT,'result.json')),binding:bind(path.join(OUT,'binding-before.json')),geometry:geometry.map(x=>({fov:x.fov,width:x.width,records:x.records,visits:x.lookupElementVisits}))}));
}catch(error){save('failed.json',{error:String(error),stack:(error as Error).stack,controls,before});throw error;}finally{retire.forEach(fn=>fn());}
