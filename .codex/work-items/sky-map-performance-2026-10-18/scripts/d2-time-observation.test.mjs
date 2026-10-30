import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { addD2TimeObservation } from './d2-time-observation-instrumentation.mjs';
import { validateD2TimeObservation } from './d2-time-observation-protocol.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../..');
const feature = path.join(root, 'apps/wechat-miniapp/src/features/sky');
const read = async (directory, name) => (await fs.readFile(path.join(directory, name), 'utf8')).replaceAll('\r\n','\n');
const inputs = { page: await read(feature,'spot-sky-page.tsx'), time: await read(feature,'sky-observation-time.ts'),
  geometry: await read(feature,'use-sky-time-geometry.ts'), lifecycle: await read(feature,'sky-canvas-lifecycle.ts'), runtime: await read(here,'r17-phone-probe-v3-runtime.ts') };
const transformed = addD2TimeObservation(inputs);
const sources = { 'r17-phone-probe-runtime': transformed.runtime, 'sky-observation-time': transformed.time,
  ...Object.fromEntries(await Promise.all(['d2-time-observation','r17-geometry-stage-runtime','r17-ruler-entry-runtime'].map(async name => [name,await read(here,name+'.ts')]))),
  'd2-time-observation-controls': (await read(here,'d2-time-observation-controls.tsx')).replaceAll('__D2_TIME_GENERATION__','37').replaceAll('__D2_TIME_SOURCE_HASH__','a'.repeat(64)) };
const compile = (source, jsx = false) => {
  const result = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, fileName: jsx ? 'task.tsx' : 'task.ts' });
  assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  return result.outputText;
};
function harness() {
  let elapsed = 0, offset = 0, nextTimer = 0;
  const timers = new Map(), loaded = new Map(), posts = [];
  let post = () => Promise.resolve({ statusCode: 200, data: { stored: true } });
  const context = vm.createContext({ __MINIAPP_API_BASE__: 'http://127.0.0.1:8799',
    Date: class extends Date { static now() { return 1_800_000_000_000 + elapsed + offset; } },
    setTimeout(callback, delay) { const id=++nextTimer; timers.set(id,{callback,at:elapsed+delay}); return id; }, clearTimeout(id) { timers.delete(id); } });
  const mocks = { '@tarojs/taro': { __esModule:true, default: { request(options) { posts.push(options); return post(options); } }, useDidHide() {} },
    '@tarojs/components': {}, react: { useEffect() {}, useState() { return [0,()=>{}]; } }, 'react/jsx-runtime': {} };
  function load(name) {
    if (loaded.has(name)) return loaded.get(name);
    const module={exports:{}}; loaded.set(name,module.exports);
    vm.runInContext('(function(exports,require,module){'+compile(sources[name],name.endsWith('controls'))+'\n})',context)(module.exports,
      key => mocks[key] ?? load(key.replace(/^\.\//,'')),module);
    return module.exports;
  }
  const controls=load('d2-time-observation-controls'), d2=load('d2-time-observation').d2Time;
  const time=load('sky-observation-time').createSkyObservationTime();
  const core=load('r17-phone-probe-runtime').r17Probe;
  const advance=duration=>{ const end=elapsed+duration; for(;;) { const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!next)break; timers.delete(next[0]); elapsed=next[1].at; next[1].callback(); } elapsed=end; };
  return { d2,time,core,controls,advance,posts,context, load, setPost: value=>{post=value;}, adjust: value=>{offset+=value;}, timers };
}
const atA='2010-01-01T00:00:00.000Z', atB='2010-01-01T00:01:00.000Z', atC='2010-01-01T00:02:00.000Z';
function ready(h) {
  const scope={private:'DO_NOT_RETAIN_OR_EXPORT'};
  h.time.bind('PRIVATE_BINDING',atA,{startAt:'2009-12-31T00:00:00.000Z',endAt:'2010-01-02T00:00:00.000Z'});
  h.d2.scope(scope,true); assert(h.d2.arm(scope)); return scope;
}
function input(h,scope,at) { return h.d2.input(scope,at,()=>h.time.preview(at,{fromAt:atA,elapsedAt:0})); }
function prepared(h,scope,state,at=state.at) {
  const presentation=h.d2.prepare(()=>{h.advance(3);return {row:{at},private:'NO_REPORT'};},state,state.at,at,scope);
  const frame={frameAt:at,timeGeneration:state.presentationGeneration,nativeImageGeneration:7,timePresentationScope:scope,sceneReady:true};
  h.d2.request(frame,presentation);h.d2.prepared(frame);return {presentation,frame};
}
function accept(h,frame,state) {h.d2.paintStarted(frame);h.advance(2);h.d2.callback(frame);h.d2.accepted(frame,state,7);}
const copy=value=>JSON.parse(JSON.stringify(value));
test('current production transformation is exact, idempotence refuses, and no old scheduler/cost chain is injected',()=>{
  assert.throws(()=>addD2TimeObservation({...inputs,page:transformed.page}),/d2_time_boundary_changed/);
  for(const value of Object.values(transformed))compile(value,value.includes('SpotSkyPage'));
  assert(transformed.page.includes('presentSkyTime(rawReportData, presentationAt, presentationModel, presentationSources)'));
  assert(!transformed.page.includes('useR17NormalStop'));
  assert(!transformed.page.includes('r17NormalProductPlayStarted'));
  assert(!transformed.page.includes('r17-page-bridge'));
  assert(transformed.page.indexOf('attempt.publish(excludedNameKeys);\n      d2Time.accepted')>0);
  assert(transformed.geometry.includes('admit(response); request!.phase = "complete";'));
});
test('real input identities, preparation, fine wrapper reuse and resource clone join successful accepted results',()=>{
  const h=harness(),scope=ready(h),s1=input(h,scope,atB);h.advance(4);
  const first=prepared(h,scope,s1);const clone={...first.frame,timePresentation:{...first.presentation,report:{private:'NOT_EXPORTED'}}};
  h.d2.inherit(clone,first.frame);accept(h,clone,s1);
  const s2=input(h,scope,atC);const second=prepared(h,scope,s2);accept(h,second.frame,s2);
  const out=h.d2.snapshot();assert(validateD2TimeObservation(out));
  assert.equal(out.timeChain.inputCount,2);assert.equal(out.linkage.inheritedFrames,1);
  const inputs=out.timeChain.entries.filter(r=>r[1]===1),accepted=out.timeChain.entries.filter(r=>r[1]===4);
  assert.deepEqual(copy(inputs.map(r=>r[4])),[1,2]);assert.deepEqual(copy(accepted.map(r=>r[4])),[1,2]);
  assert(accepted.every(r=>r[6]!==null&&r[8]===r[14]&&r[9]===7&&r[10]===r[11]));
  assert(Object.values(out.timeChain.violations).every(v=>v===0));
  assert(!JSON.stringify(out).includes('PRIVATE'));assert(!JSON.stringify(out).includes('NO_REPORT'));
  for(const field of ['scene','viewport','observations','aCorrelation','counters'])assert.equal(Object.hasOwn(out,field),false);
});
test('late preparation keeps the input that published its state, not the newest input',()=>{
  const h=harness(),scope=ready(h);h.time.edit('fields',true);
  const firstState=input(h,scope,atB),secondState=input(h,scope,atC);
  const first=prepared(h,scope,firstState);accept(h,first.frame,secondState);
  const tick=h.time.tick(30);assert.notEqual(tick,secondState);
  const unchanged=input(h,scope,atC);assert.equal(unchanged,tick);
  prepared(h,scope,unchanged,unchanged.previewAt);
  const out=h.d2.snapshot();assert(validateD2TimeObservation(out));
  const preparedRow=out.timeChain.entries.find(r=>r[1]===2);
  const acceptedRow=out.timeChain.entries.find(r=>r[1]===4);
  assert.equal(preparedRow[4],1);assert.equal(acceptedRow[4],1);
  const firstInput=out.timeChain.entries.find(r=>r[1]===1&&r[4]===1);
  assert.equal(preparedRow[5],firstInput[5]);assert.equal(acceptedRow[5],firstInput[5]);
  assert.equal(out.timeChain.entries.filter(r=>r[1]===2).at(-1)[4],2,
    'a real intermediate tick inherits input2; a later no-op input3 cannot rewrite it');
});

test('same hold generation, reversal and release are actual time-owner states, with old generation rejection recorded separately',()=>{
  const h=harness(),scope=ready(h);h.time.edit('fields',true);
  const one=input(h,scope,atB),first=prepared(h,scope,one);accept(h,first.frame,one);
  const two=input(h,scope,atC);assert.equal(two.presentationGeneration,one.presentationGeneration);
  const second=prepared(h,scope,two);accept(h,second.frame,two);
  const reverse=input(h,scope,atB);assert.notEqual(reverse.presentationGeneration,two.presentationGeneration);
  h.d2.rejected(1,second.frame,reverse,7);
  h.time.edit('fields',false);const released=h.time.snapshot();
  const final=prepared(h,scope,released);accept(h,final.frame,released);
  const out=h.d2.snapshot();assert(validateD2TimeObservation(out));assert.equal(out.timeChain.inputCount,3);
  const rejected=out.timeChain.entries.find(r=>r[1]===6);assert.notEqual(rejected[8],rejected[14]);
  assert(out.timeChain.entries.some(r=>r[1]===5&&r[13]===0));
  assert.equal(out.timeChain.violations.timeGeneration,0);
});
test('the actual current presented callback records acceptance only after both original operations return',()=>{
  const h=harness(),scope=ready(h),state=input(h,scope,atB),{frame}=prepared(h,scope,state);
  const ast=ts.createSourceFile('page.tsx',transformed.page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),matches=[];
  function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='presented'&&node.initializer.getText(ast).includes('surface.present(selectionCurrent'))matches.push(node.initializer.getText(ast));ts.forEachChild(node,visit);}
  visit(ast);assert.equal(matches.length,1);
  let copied=0,published=0,failCopy=false,failPublish=true;
  const attempt=()=>({frame,generation:7,identity:{canvas:{generation:7}},selection:null,controlNames:[],captions:[],reticle:null,
    publish(){published++;if(failPublish)throw Error('ORIGINAL_PUBLISH');}});
  const pending={current:attempt()};
  Object.assign(h.context,{d2Time:h.d2,pendingSkyPaintRef:pending,observationTime:h.time,canvasGenerationRef:{current:7},
    presentedSkyFrameRef:{current:null},navigationCurrentRef:{current:()=>true},browsingCamera:{current:()=>true},
    canvasSurfaceRef:{current:{present(){copied++;if(failCopy)throw Error('ORIGINAL_COPY');}}},
    objectSelection:{snapshot:()=>({object:null})},setCanvasSize(){},canvasDrawRevisionRef:{current:0},
    publishAcceptanceSkySceneInspection(){},setCanvasError(){},skyObservationFrameCurrent:h.load('sky-observation-time').skyObservationFrameCurrent});
  const fn=vm.runInContext(compile('const fn='+matches[0]+'; fn;'),h.context);
  assert.throws(()=>fn(frame,{width:10,height:10}),/ORIGINAL_PUBLISH/);
  failPublish=false;failCopy=true;pending.current=attempt();assert.throws(()=>fn(frame,{width:10,height:10}),/ORIGINAL_COPY/);
  failCopy=false;pending.current=attempt();fn(frame,{width:10,height:10});
  const out=h.d2.snapshot();assert(validateD2TimeObservation(out));
  assert.equal(copied,3);assert.equal(published,2);assert.equal(out.timeChain.entries.filter(r=>r[1]===4).length,1);
});
test('geometry keeps validated Promise, actual request serial/phase and current admission distinct; stop releases pending listeners',async()=>{
  const h=harness(),scope=ready(h);input(h,scope,atB);input(h,scope,atC);
  let listeners=0;const signal={aborted:false,addEventListener(){listeners++;},removeEventListener(){listeners--;}};
  const token=h.d2.geometryRequest(atB,atA,3,'fetching',scope,signal);
  let resolve;const response={data:{model:{startAt:atA}}},pending=new Promise(done=>{resolve=done;});
  h.d2.geometryWatch(token,pending);assert.equal(listeners,1);h.advance(7);resolve(response);await Promise.resolve();await Promise.resolve();
  h.d2.geometryAdmitted(response,atB,atA,3,'fetching',scope);assert.equal(listeners,0);
  h.d2.geometryRequest(atC,atA,4,'fetching',scope,signal);assert.equal(listeners,1);
  h.advance(45000);assert.equal(listeners,0);
  const out=h.d2.snapshot();assert(validateD2TimeObservation(out));
  assert(out.geometryStages.entries.some(r=>r[1]===4));assert(out.geometryStages.entries.some(r=>r[1]===6&&r[8]===0));
  assert.equal(out.geometryStages.pendingAtStop,1);
  assert(out.timeChain.entries.some(r=>r[1]===7&&r[12]===3&&r[13]===2));
  assert(out.timeChain.entries.filter(r=>r[1]===7).every(r=>r[4]===null),
    'a delayed old binding cannot borrow the newest input identity');
  assert(out.geometryStages.entries.filter(r=>[2,6].includes(r[1])).every(r=>r[7]===null));
});
test('scope changes end observation, old memo links stay unknown, and original exceptions remain exceptions',()=>{
  const h=harness(),scope=ready(h);const state=input(h,scope,atB);
  const frame={frameAt:state.at,timeGeneration:state.presentationGeneration,nativeImageGeneration:7,timePresentationScope:scope,sceneReady:true};
  h.d2.request(frame,{row:{at:state.at}});accept(h,frame,state);
  assert.throws(()=>h.d2.input(scope,atC,()=>{throw Error('PRODUCT_THROW');}),/PRODUCT_THROW/);
  h.d2.scope({},true);const out=h.d2.snapshot();assert(validateD2TimeObservation(out));
  assert.equal(out.linkage.requestsWithUnknownPreparation,1);assert.equal(out.timeChain.violations.unlinked,1);
  assert(out.timeChain.entries.some(r=>r[1]===8));assert(!h.d2.arm(scope));
});
test('bounded trace, immutable seal, clock rollback and strict protocol preserve unknown and missing coverage',()=>{
  const h=harness(),scope=ready(h);
  for(let n=0;n<140;n++){const state=input(h,scope,n%2?atB:atC);accept(h,prepared(h,scope,state).frame,state);}
  h.adjust(-1000);h.core.now();h.adjust(1000);
  const out=h.d2.snapshot(), bytes=JSON.stringify(out);assert(validateD2TimeObservation(out));assert(Buffer.byteLength(bytes)<=32768);
  assert(out.timeChain.overflow);assert(out.timeChain.dropped>0);assert.equal(out.clock.backwardReads,1);
  assert.equal(out.window.elapsedMs,null);h.advance(100);assert.equal(JSON.stringify(h.d2.snapshot()),bytes);
  for(const mutate of [v=>v.secret='NO',v=>v.runId='../escape',v=>v.timeChain.entries[0].push(1),
    v=>v.timeChain.entries[0][4]=99999,v=>v.timeChain.dropped++,v=>v.coverage='pixels',v=>v.geometryStages.private='NO']) {
    const wrong=copy(out);mutate(wrong);assert.equal(validateD2TimeObservation(wrong),false);
  }
});
test('manual export is single flight with exact retries; no timer or observer action starts or pauses product work',async()=>{
  const h=harness(),scope=ready(h);const state=input(h,scope,atB);accept(h,prepared(h,scope,state).frame,state);
  assert.equal(h.posts.length,0);let finish;h.setPost(()=>new Promise(resolve=>{finish=resolve;}));
  const saving=h.controls.exportD2TimeObservation();await h.controls.exportD2TimeObservation();assert.equal(h.posts.length,1);
  finish({statusCode:503,data:{stored:false}});await saving;
  const first=h.posts[0].data;h.setPost(()=>Promise.resolve({statusCode:200,data:{stored:true}}));
  await h.controls.exportD2TimeObservation();assert.equal(h.posts.length,2);assert.equal(h.posts[1].data,first);
  assert.equal(h.time.snapshot().mode,'PREVIEW');assert(h.d2.arm(scope));
  await h.controls.exportD2TimeObservation();assert.equal(h.posts.length,2,'armed next run cannot re-export the previous run');
});
test('existing collector admits only the explicit time schema and protects immutable old/new runs',async()=>{
  const h=harness(),scope=ready(h),state=input(h,scope,atB);accept(h,prepared(h,scope,state).frame,state);
  const out=copy(h.d2.snapshot()), temp=await fs.realpath(os.tmpdir()), directory=await fs.mkdtemp(path.join(temp,'starward-d2-time-fixture-'));
  try {
    const collector=createR17PhoneProbeCollector(directory);
    assert.equal(await collector.store({...out,runId:'../escape'}),400);
    assert.deepEqual(await Promise.all([collector.store(out),collector.store(out)]),[200,200]);
    const altered=copy(out);altered.timeChain.invalid++;assert.equal(await collector.store(altered),409);
    assert.equal((await fs.readdir(directory)).length,1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,`baseline-${out.runId}.json`),'utf8')),out);
  } finally {
    const resolved=await fs.realpath(directory);
    assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());assert(path.basename(resolved).startsWith('starward-d2-time-fixture-'));
    await fs.rm(resolved,{recursive:true,force:true});
  }
});
test('time profile is independent of frozen generations and requires a separate bridge at prepare time',async()=>{
  const run=promisify(execFile),builder=new URL('./build-r17-normal-baseline-v3.mjs',import.meta.url).href;
  const script=`process.argv=['node','profile','inspect',...JSON.parse(process.argv[1])];const m=await import(${JSON.stringify(builder)});console.log(JSON.stringify(m.describeNormalPreparationProfile()));`;
  const p=JSON.parse((await run(process.execPath,['--input-type=module','-e',script,JSON.stringify(['--d2-time-observation'])],{windowsHide:true})).stdout);
  assert.equal(p.buildGeneration,37);assert.equal(p.geometryStages,true);assert.equal(p.normalPlayTrialMs,null);
  for(const key of ['d2Current','d2GpuResources','observationA1','usbReverse','terrainWait','nativeRegion','memoryLifetime','memoryCheckpoints','memoryOwnerLinks','queryCallbackLinks','firstAcceptedCosts'])assert.equal(p[key],false,key);
  for(const flags of [['--d2-time-observation','--d2-current'],['--d2-time-observation','--review-r27'],['--d2-time-observation','--d2-time-observation']])
    await assert.rejects(run(process.execPath,['--input-type=module','-e',script,JSON.stringify(flags)],{windowsHide:true}),e=>e.stderr.includes('finite_normal_revision_required'));
});

// No generated source tree or candidate is created. Typecheck current source
// with only the task copies overlaid through TypeScript's read-only host.
test('complete current TypeScript source accepts the observation overlay without emitting files',()=>{
  const overlays=new Map(),filename=(name)=>path.join(feature,name).replaceAll('\\','/').toLowerCase();
  for(const [name,source] of Object.entries(sources))overlays.set(filename(name+(name.endsWith('controls')?'.tsx':'.ts')),source);
  for(const [name,key] of [['spot-sky-page.tsx','page'],['use-sky-time-geometry.ts','geometry'],['sky-canvas-lifecycle.ts','lifecycle']])overlays.set(filename(name),transformed[key]);
  const configFile=path.join(root,'apps/wechat-miniapp/tsconfig.json'),config=ts.readConfigFile(configFile,ts.sys.readFile);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(configFile));parsed.options.noEmit=true;
  const host=ts.createCompilerHost(parsed.options),originalRead=host.readFile.bind(host),originalExists=host.fileExists.bind(host);
  const normalized=file=>file.replaceAll('\\','/').toLowerCase();
  host.readFile=file=>overlays.get(normalized(file))??originalRead(file);
  host.fileExists=file=>overlays.has(normalized(file))||originalExists(file);
  host.getSourceFile=(file,languageVersion)=>{const source=host.readFile(file);return source===undefined?undefined:ts.createSourceFile(file,source,languageVersion,true);};
  const program=ts.createProgram(parsed.fileNames,parsed.options,host);
  const diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,diagnostics.map(d=>`${d.file?.fileName}:${d.start} ${ts.flattenDiagnosticMessageText(d.messageText,'\n')}`).join('\n'));
});
