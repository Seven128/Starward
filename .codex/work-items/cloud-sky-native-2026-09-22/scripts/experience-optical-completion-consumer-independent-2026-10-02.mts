import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join,relative,isAbsolute} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {build} from 'esbuild';
import {assertSdssScienceOpticalManifest} from '@starward/miniapp-contracts';
import {completeLegacySkyOptical,completeScienceSkyOptical,liveSkyOpticalCompletion,
  sameSkyOpticalCompletion,sameSkyOpticalInput} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-completion';
import {registerSkyNativeImageLifetime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {skySdssOpticalFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {createSkyCanvasLifecycle} from '../../../../apps/wechat-miniapp/src/features/sky/sky-canvas-lifecycle';
import {resolvedSkyBodyReferences} from '../../../../apps/wechat-miniapp/src/features/sky/sky-body-label-presentation';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {sdssOpticalPresentation} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection';

const ROOT=resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const OUT=join(ROOT,'output/optical-completion-consumer-independent-1002-r5');
assert(!existsSync(OUT),'exclusive generation must not exist');mkdirSync(OUT);
const sky='apps/wechat-miniapp/src/features/sky/';
const pagePath=join(ROOT,sky+'spot-sky-page.tsx'),page=readFileSync(pagePath,'utf8');
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const record=(p:string)=>{const absolute=resolve(p),b=readFileSync(absolute);return{path:relative(ROOT,absolute).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const parse=(text:string)=>ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const source=parse(page),props=new Map<string,ts.Expression>(),vars=new Map<string,ts.Expression>();
let modal:ts.Expression|undefined,normalHookArgs=-1,probeOption=false;
function visit(n:ts.Node){
  if(ts.isCallExpression(n)&&n.expression.getText(source)==='createSkyCanvasLifecycle'){
    assert(ts.isObjectLiteralExpression(n.arguments[0]));
    for(const property of n.arguments[0].properties)if(ts.isPropertyAssignment(property)&&['paint','presented','invalidated','failed','sameScene'].includes(property.name.getText(source))){
      assert(!props.has(property.name.getText(source)));assert(ts.isArrowFunction(property.initializer));props.set(property.name.getText(source),property.initializer);
    }
  }
  if(ts.isVariableDeclaration(n)&&n.initializer)vars.set(n.name.getText(source),n.initializer);
  if(ts.isJsxSpreadAttribute(n)&&n.expression.getText(source).includes('opticalPublicationHash:'))modal=n.expression;
  if(ts.isCallExpression(n)&&n.expression.getText(source)==='useSkySdssOptical')normalHookArgs=n.arguments.length;
  if(ts.isPropertyAssignment(n)&&n.name.getText(source)==='artworkContribution')probeOption=true;
  ts.forEachChild(n,visit);
}visit(source);
assert(modal);assert.equal(normalHookArgs,5);assert.equal(probeOption,false);
const evaluate=(expression:ts.Expression,bindings:object)=>vm.runInNewContext(ts.transpileModule(`(${expression.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
const actualManifest=join(ROOT,'output/sdss-science-optical-writer-1002-r1/publication/manifest.json');
const publication=JSON.parse(readFileSync(actualManifest,'utf8'));
assertSdssScienceOpticalManifest(publication,'M:51',publication.publicationHash);
const freeze=(x:any):any=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};freeze(publication);
const retirements:(()=>void)[]=[];
function science(){const fine={},coarse={};let fineLive=true,coarseLive=true;
  const a=registerSkyNativeImageLifetime(fine,()=>fineLive),b=registerSkyNativeImageLifetime(coarse,()=>coarseLive);retirements.push(a,b);
  const frame=skySdssOpticalFrame({publication,image:fine,renderedLevel:'DETAIL',renderedAsset:publication.levels.DETAIL,
    coarser:{image:coarse,level:'MEDIUM',asset:publication.levels.MEDIUM}})!;
  const draw={submitted:true,finePrepared:true,coarsePrepared:true} as const;
  const receipt={completed:true,qualification:{fine:'has',coarse:'has',any:'has'},finePhoto:'positive',coarsePhoto:'positive'} as const;
  return{frame,fine,coarse,draw,receipt,completed:completeScienceSkyOptical(frame,draw,receipt)!,retireFine(){fineLive=false;},retireCoarse(){coarseLive=false;}};
}
const basis=createSkyViewBasis(20,110,0)!,secondBasis=createSkyViewBasis(55,125,0)!;
function harness(options:{empty?:boolean;science?:ReturnType<typeof science>;paintText?:string}={}){
  let id=0,defer=true,fault=false,view=basis,reenter:(()=>void)|undefined;
  const jobs=new Map<number,{callback:()=>void;delay:number}>();
  const generation={current:1},pending={current:null as any},picking={current:null as any},orientation={latestPresentation:{current:null},presented:{current:null as any}};
  const state={frame:null as any,camera:null as any,inspections:[] as any[],failure:null as any,size:null as any};
  const attempts:Array<()=>void>=[];
  const bindings:any={Error,liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,resolvedSkyBodyReferences,
    canvasGenerationRef:generation,pendingSkyPaintRef:pending,paintedSkyObjectsRef:picking,orientation,
    orientationController:{snapshot:()=>({})},manualBasisRef:{current:null},zoomRef:{current:.05},viewportInsetsRef:{current:{}},reducedMotionRef:{current:false},
    resolveSkyCanvasView:()=>({verticalFovDeg:.05,progress:1,center:{x:195,y:422},localView:view,intent:'manual'}),
    browsingCamera:{update:()=>({view,animating:false})},
    setPresentedSkyFrame:(update:any)=>{state.frame=typeof update==='function'?update(state.frame):update;if(reenter){const once=reenter;reenter=undefined;once();}},
    setPresentedCamera:(update:any)=>{state.camera=typeof update==='function'?update(state.camera):update;},
    setCanvasSize:(update:any)=>{state.size=typeof update==='function'?update(state.size??{width:0,height:0}):update;},setCanvasError:(value:any)=>{state.failure=value;},canvasDrawRevisionRef:{current:0},
    publishAcceptanceSkySceneInspection:(_owner:any,inspection:any)=>state.inspections.push(inspection),
    EMPTY_SKY_IMAGES:new Map(),setSolarLightUnavailable:()=>{},setMoonDiscUnavailable:()=>{},setPlanetDiscUnavailable:()=>{},setSunDiscUnavailable:()=>{},setGalacticBandUnavailable:()=>{},setLandscapeUnavailable:()=>{},
    drawSkyScene:(...args:any[])=>{
      const snapshot=options.empty?null:{catalogVersion:'controlled-catalog',catalogHash:'controlled',frameAt:args[2],width:args[5],height:args[6],
        view:{basis:args[12],verticalFovDeg:args[10],center:args[13],landscape:null},objects:[],suppressedBodyReferences:[]};
      const optical=options.empty?null:options.science?.completed??completeLegacySkyOptical(args[30],args[30]?.image);
      args[8](snapshot,Object.freeze({sdssOptical:optical,deepSkyImage:null}));attempts.push(args[9]);
      if(fault)throw Error('controlled_failure_after_stage_before_done');if(!defer)args[9]();
    }};
  const context=vm.createContext(bindings);
  const compile=(name:string)=>vm.runInContext(ts.transpileModule(`(${name==='paint'&&options.paintText?options.paintText:props.get(name)!.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  const lifecycle=createSkyCanvasLifecycle<any,object>({measure:done=>done({width:390,height:844}),createContext:()=>({}),
    releaseContext:()=>{generation.current++;},paint:compile('paint'),sameScene:compile('sameScene'),presented:compile('presented'),invalidated:compile('invalidated'),failed:compile('failed')},
    {schedule(callback,delay){jobs.set(++id,{callback,delay});return id;},cancel(handle){jobs.delete(handle as number);}});
  const frame={data:{},frameAt:'2026-10-02T12:00:00.000Z',mode:'NIGHT',sceneReady:!options.empty,nativeImageGeneration:1,orientationRevision:0,owner:'controlled-owner',inspection:{spotId:'controlled-spot'},
    sdssOpticalImage:options.science?.frame??{image:{},level:'DETAIL',fieldDegrees:.05,reference:'M:51',publicationHash:'controlled-legacy'},deepSkyImage:null,coordinateGrids:{horizontal:false,equatorial:false}};
  lifecycle.ready();
  const step=()=>{const x=[...jobs].find(([,v])=>v.delay===0);assert(x);jobs.delete(x[0]);x[1].callback();};
  return{lifecycle,frame,state,attempts,pending,picking,generation,orientation,step,setView(v:typeof basis){view=v;},synchronous(){defer=false;},fault(){fault=true;},reenter(fn:()=>void){reenter=fn;}};
}
const controls:any[]=[];
function control(name:string,body:()=>unknown){const facts=body();controls.push({name,status:'passed',facts});}
let before:any;
try{
  const graph=await build({absWorkingDir:ROOT,entryPoints:[sky+'sky-sdss-optical-completion.ts',sky+'sky-canvas-lifecycle.ts',sky+'sky-scene-render.ts'],outdir:join(OUT,'nonwritten-bundle'),bundle:true,write:false,metafile:true,platform:'node',format:'esm',tsconfig:join(ROOT,'apps/wechat-miniapp/tsconfig.json')});
  const paths=new Set(Object.keys(graph.metafile!.inputs).map(p=>isAbsolute(p)?p:resolve(ROOT,p)));
  for(const f of ['spot-sky-page.tsx','sky-sdss-optical-completion.test.ts','sky-optical-page-acceptance.test.ts','sky-sdss-optical-page.test.ts','sky-optical-page-test-support.ts','use-sky-sdss-optical.ts'])paths.add(join(ROOT,sky+f));
  paths.add(actualManifest);paths.add(fileURLToPath(import.meta.url));
  for(const asset of Object.values(publication.levels) as any[])paths.add(join(ROOT,'output/sdss-science-optical-writer-1002-r1/publication',asset.file));
  for(const dir of readdirSync(join(ROOT,'workers/miniapp-api/assets/deep-sky')).filter(x=>x.startsWith('sdss-')))
    for(const f of readdirSync(join(ROOT,'workers/miniapp-api/assets/deep-sky',dir)).filter(x=>x.endsWith('.jpg')||x==='manifest.json'))paths.add(join(ROOT,'workers/miniapp-api/assets/deep-sky',dir,f));
  before=[...paths].sort().map(record);writeFileSync(join(OUT,'binding-before.json'),JSON.stringify(before,null,2));
  writeFileSync(join(OUT,'executed-script.mts.txt'),readFileSync(fileURLToPath(import.meta.url)));writeFileSync(join(OUT,'metafile.json'),JSON.stringify(graph.metafile,null,2));
  writeFileSync(join(OUT,'page-source.tsx.txt'),page);writeFileSync(join(OUT,'actual-page-callbacks.json'),JSON.stringify(Object.fromEntries([...props].map(([k,v])=>[k,v.getText(source)])),null,2));
  control('pending paint cannot publish; synchronous/accepted source view picking match',()=>{
    const h=harness();h.lifecycle.request(h.frame);h.step();assert.equal(h.state.frame,null);assert.equal(h.picking.current,null);assert.equal(h.state.camera,null);assert.equal(h.orientation.presented.current,null);
    h.attempts[0]();assert.strictEqual(h.state.camera.basis,basis);assert.strictEqual(h.picking.current.view.basis,basis);assert.equal(h.state.frame.nativeCanvasGeneration,1);assert.equal(h.state.inspections.length,1);assert.equal(h.pending.current,null);
    const sync=harness();sync.synchronous();sync.lifecycle.request(sync.frame);sync.step();assert.equal(sync.state.inspections.length,1);return{accepted:1,synchronous:1};
  });
  control('all invalidation boundaries reject staged completion',()=>{
    const observed=[];for(const action of ['hide','resize','remount','scene','hide-until','dispose']){const h=harness();h.lifecycle.request(h.frame);h.step();
      if(action==='hide')h.lifecycle.hide();else if(action==='resize')h.lifecycle.resize();else if(action==='remount'){h.lifecycle.setMounted(false);h.lifecycle.setMounted(true);}else if(action==='dispose')h.lifecycle.dispose();else h.lifecycle.request({...h.frame,mode:'DAY'},action==='hide-until');
      h.attempts[0]();assert.equal(h.state.frame,null);assert.equal(h.picking.current,null);assert.equal(h.state.inspections.length,0);assert.equal(h.pending.current,null);observed.push(action);
    }return observed;
  });
  control('same-scene accepts older actual view; reentrant duplicate does not replace newer frame',()=>{
    const h=harness();h.lifecycle.request(h.frame);h.step();const old=h.attempts[0];h.setView(secondBasis);h.lifecycle.request({...h.frame,pose:{basis:secondBasis}});old();assert.strictEqual(h.state.camera.basis,basis);
    h.step();h.reenter(old);h.attempts[1]();assert.strictEqual(h.state.camera.basis,secondBasis);assert.equal(h.state.inspections.length,2);assert.equal(h.pending.current,null);old();assert.equal(h.state.inspections.length,2);return{acceptedViews:2,reentrantDuplicate:1};
  });
  control('empty clearing completion and failed staged draw do not retain source/picking',()=>{
    const e=harness({empty:true});e.synchronous();e.lifecycle.request(e.frame);e.step();assert.equal(e.state.frame,null);assert.equal(e.picking.current,null);assert.equal(e.state.inspections.length,1);
    const f=harness();f.fault();f.lifecycle.request(f.frame);f.step();assert.equal(f.state.frame,null);assert.equal(f.picking.current,null);assert.equal(f.pending.current,null);assert.match(f.state.failure,/controlled_failure/);f.attempts[0]();assert.equal(f.state.inspections.length,1);return{emptyInspection:e.state.inspections[0].state,failureInspection:f.state.inspections[0].state};
  });
  control('exact frame/native-generation gate rejects directly corrupted staged slot',()=>{
    const present=props.get('presented')!,frame={sceneReady:true,owner:'x',inspection:{}},counter={value:0},pending={current:{frame,generation:2,publish(){counter.value++;}}};
    const env={pendingSkyPaintRef:pending,canvasGenerationRef:{current:1}};evaluate(present,env)(frame,{});assert.equal(counter.value,0);
    pending.current={frame:{...frame},generation:1,publish(){counter.value++;}};evaluate(present,env)(frame,{});assert.equal(counter.value,0);return{rejected:2};
  });
  control('accepted science partial retirement remains exact parent and publication',()=>{
    const s=science(),h=harness({science:s});h.lifecycle.request(h.frame);h.step();s.retireFine();h.attempts[0]();const c=h.state.frame.sdssOptical;
    assert.equal(c.participatingFields.length,1);assert.strictEqual(c.participatingFields[0].image,s.coarse);assert.strictEqual(c.participatingFields[0].asset,publication.levels.MEDIUM);assert.strictEqual(c.sciencePublication,publication);assert.equal(s.completed.participatingFields.length,2);s.retireCoarse();assert.equal(liveSkyOpticalCompletion(c),null);return{historicalFields:2,acceptedLiveFields:1,allRetiredLive:null};
  });
  control('valid black/unknown qualification never manufacture live provenance',()=>{
    const s=science();const facts=[];for(const qualification of [{fine:'has',coarse:'empty',any:'has'},{fine:'unknown',coarse:'unknown',any:'unknown'}] as const){const c=completeScienceSkyOptical(s.frame,s.draw,{completed:true,qualification,finePhoto:'unknown',coarsePhoto:'unknown'});assert(c);assert.equal(c.participatingFields.length,0);assert.equal(liveSkyOpticalCompletion(c),null);facts.push(c.receipt.qualification.any);}return facts;
  });
  function pageGates(completion:any,extra:any={}){const state:any={liveSkyOpticalCompletion,canvasGenerationRef:{current:1},sdssOpticalPresentation,presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},canvasError:null,
    presentedSkyFrame:{sdssOptical:completion,nativeCanvasGeneration:1},selectedCatalogObject:{reference:'M:51'},entry:{objectRef:'M:51'},deepSkyImagePresented:false,
    sdssOptical:{requested:true,failed:false,loading:false,image:{},coarser:null,publication:{objectRef:'M:51',publicationHash:'b'.repeat(64)}},...extra};
    state.presentedSdssOptical=evaluate(vars.get('presentedSdssOptical')!,state);state.sdssOpticalImagePresented=evaluate(vars.get('sdssOpticalImagePresented')!,state);
    return{state,status:evaluate(vars.get('sdssOpticalStatus')!,state),recovery:evaluate(vars.get('sdssOpticalCurrentImagePresented')!,state),modal:evaluate(modal!,state),aid:evaluate(vars.get('imagePainted')!,state)};
  }
  control('science modal retains old pin; public recovery/liveness separate; global positive not aid',()=>{
    const s=science();s.retireFine();const g=pageGates(s.completed,{sdssOptical:{requested:true,failed:false,loading:false,image:{},coarser:{image:s.coarse},publication}});assert.equal(g.status,'CREDIT');assert.equal(g.recovery,true);assert.equal(g.modal.opticalPublicationHash,publication.publicationHash);assert.equal(g.aid,false);
    const advanced=pageGates(s.completed);assert.equal(advanced.status,'CREDIT');assert.equal(advanced.recovery,false);assert.equal(advanced.modal.opticalPublicationHash,publication.publicationHash);
    for(const extra of [{nativeCanvasMounted:false},{presentedSceneCurrent:false},{canvasGenerationRef:{current:2}},{canvasSize:{width:0,height:844}}]){const a=pageGates(s.completed,extra);assert.equal(a.status,'NONE');assert.equal(Object.keys(a.modal).length,0);}s.retireCoarse();assert.equal(pageGates(s.completed).status,'NONE');return{liveCoarseLevel:'MEDIUM',originalPin:publication.publicationHash,scienceAid:false};
  });
  control('actual Scene legacy success/fallback/finish-failure/science rejection',()=>{
    const at='2026-09-25T00:00:00.000Z',camera=createSkyViewBasis(0,130,0)!,fine={},coarse={},ir={};
    const data={hourly:[{at}],skyScene:{state:'UNAVAILABLE',frames:[],deepSky:{state:'AVAILABLE',catalog:{imageRegistration:'ICRS_TAN_NORTH_0_1_V1',entries:[{objectRef:'M:51'}]},frames:[{at,state:'AVAILABLE',points:[[0,0,40,0,40.1,359.9,40]]}]}},targetFrames:[]};
    const optical={image:fine,reference:'M:51',publicationHash:'actual-controlled-legacy',fieldDegrees:.0568888889,level:'DETAIL',coarser:{image:coarse,fieldDegrees:.1137777778,level:'MEDIUM'}};
    const run=(input:any,failFine=false,failFinish=false)=>{let finished=false,completed=false,output:any=null;const submits:any[]=[];
      const surface=new Proxy({}, {get:(_t,k)=>k==='artwork'?(image:any)=>{submits.push(image);return !(failFine&&image===fine);}:k==='finish'?()=>{if(failFinish)throw Error('controlled_finish_failed');finished=true;}:()=>undefined});
      const args:any[]=Array(37).fill(undefined);Object.assign(args,{0:surface,1:data,2:at,5:390,6:844,7:'NIGHT',8:(_snapshot:any,sources:any)=>{assert(finished);output=sources;},9:()=>{assert(finished);completed=true;},10:.05,11:{reference:'M:51',level:'DETAIL',fieldDegrees:.25,image:ir},12:camera,30:input});
      if(failFinish)assert.throws(()=>drawSkyScene(...args as any),/controlled_finish_failed/);else drawSkyScene(...args as any);return{finished,completed,output,submits};};
    const normal=run(optical);assert.equal(normal.output.sdssOptical.kind,'legacy');assert.strictEqual(normal.output.sdssOptical.field.image,fine);assert.equal(normal.output.deepSkyImage,null);assert(normal.completed);assert(Object.isFrozen(normal.output));
    const fallback=run(optical,true);assert.strictEqual(fallback.output.sdssOptical.field.image,coarse);assert.equal(fallback.output.sdssOptical.field.level,'MEDIUM');
    const failure=run(optical,false,true);assert.equal(failure.output,null);assert.equal(failure.completed,false);
    const gated=run({...optical,sciencePublication:publication});assert.equal(gated.output.sdssOptical,null);assert.strictEqual(gated.output.deepSkyImage,ir);assert.equal(gated.submits.includes(fine),false);
    return{legacyAfterFinish:true,survivingParent:'MEDIUM',failedFinishCallbacks:0,scienceStillRejected:true};
  });
  const mutants:any[]=[];
  control('bounded production mutations fail independently derived oracles',()=>{
    const paint=props.get('paint')!;let assignments=0;
    const transformed=ts.transform(paint,[ctx=>root=>{function walk(n:ts.Node):ts.Node{if(ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&n.expression.left.getText(source)==='paintAttempt.publish'){
      assignments++;assert(ts.isArrowFunction(n.expression.right));return ts.factory.createExpressionStatement(ts.factory.createCallExpression(ts.factory.createParenthesizedExpression(n.expression.right),undefined,[]));}return ts.visitEachChild(n,walk,ctx);}return ts.visitNode(root,walk) as ts.Expression;}]);
    assert.equal(assignments,1);const bypass=ts.createPrinter().printNode(ts.EmitHint.Expression,transformed.transformed[0],source);transformed.dispose();writeFileSync(join(OUT,'mutation-immediate-publish-paint.txt'),bypass);
    const h=harness({paintText:bypass});h.lifecycle.request(h.frame);h.step();assert.notEqual(h.state.frame,null);mutants.push({name:'paint bypasses accepted publication',caughtBy:'pending must stay null',actualPublished:true});
    const aid=vars.get('imagePainted')!.getText(source),guard='presentedSdssOptical?.kind === "legacy" &&';assert.equal(aid.split(guard).length,2);const s=science(),g=pageGates(s.completed);assert.equal(g.aid,false);
    const wrong=vm.runInNewContext(ts.transpileModule(`(${aid.replace(guard,'')})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,g.state);assert.equal(wrong,true);mutants.push({name:'science global positive borrows legacy readability Boolean',caughtBy:'science aid must remain false',actualWrongAid:true});
    const owner=readFileSync(join(ROOT,sky+'sky-sdss-optical-completion.ts'),'utf8'),from='completion.participatingFields.filter(field => skyNativeImageIsCurrent(field.image))';assert.equal(owner.split(from).length,2);
    const exports:any={};vm.runInNewContext(ts.transpileModule(owner.replace(from,'completion.participatingFields.slice()'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require(){return{skyNativeImageIsCurrent:(image:any)=>image!==s.fine};}});
    s.retireFine();assert.equal(liveSkyOpticalCompletion(s.completed)!.kind,'science');assert.equal((liveSkyOpticalCompletion(s.completed) as any).participatingFields.length,1);assert.equal(exports.liveSkyOpticalCompletion(s.completed).participatingFields.length,2);mutants.push({name:'removed independent field retirement',caughtBy:'coarse-only live fields',actualWrongFields:2});return mutants;
  });
  const after=before.map((r:any)=>record(join(ROOT,r.path)));assert.deepEqual(after,before);writeFileSync(join(OUT,'binding-after.json'),JSON.stringify(after,null,2));
  const result={status:'passed',scope:'Actual owners and page AST with controlled Canvas/clock/draw completion; actual admitted writer metadata and files. No GPU/HTTP/native timing/readability quality certification.',controls,mutants,normalDefault:{scienceHookArgumentAbsent:normalHookArgs===5,auxiliaryBudgetAbsent:!probeOption},inputs:before.length,
    scientificInputsUnchanged:true,qualificationBlackIsNotPhoto:true,ordinarySceneStillRejectsScience:true,limitations:['Science draw/token association remains future caller responsibility; this test does not render a science group.','Local readability/natural aid fading is still open; global positive is not its proxy.','Reentrant duplicate completion is controlled; no target-runtime callback timing is certified.']};
  writeFileSync(join(OUT,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({output:relative(ROOT,OUT),result:record(join(OUT,'result.json')),binding:record(join(OUT,'binding-before.json')),controls:controls.length}));
}catch(error){writeFileSync(join(OUT,'failed.json'),JSON.stringify({error:String(error),stack:(error as Error).stack,controls,before},null,2));throw error;}finally{retirements.forEach(f=>f());}
