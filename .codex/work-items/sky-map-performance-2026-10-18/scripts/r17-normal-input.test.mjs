import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalPage, normalLifecycle, controls as normalControls } from './build-r17-normal-baseline-v3.mjs';
import { addR17ACorrelation } from './r17-a-correlation-instrumentation.mjs';
import { addR17RulerEntryV2 } from './r17-ruler-entry-v2-instrumentation.mjs';
import { addR17NormalInput, addR17GeometryStages, addR19DrawReasons, addR20DrawCosts } from './r17-normal-input-instrumentation.mjs';
import { validateR17PhoneProbeMetrics, validateR17PhoneProbeTerminal, matchR17PhoneProbeTerminal,
  R17_RULER_ENTRY_V2_EVENTS, R17_MANUAL_INPUT_SCHEMA, R17_GEOMETRY_INPUT_SCHEMA, R19_DRAW_REASONS_SCHEMA, R20_DRAW_COSTS_SCHEMA } from './r17-normal-input-protocol.mjs';
import { validateR17PhoneProbeMetrics as previous } from './r17-ruler-entry-protocol.mjs';
import { createR17PhoneProbeCollector } from './r17-phone-probe-collector.mjs';
import { verifyNormalBaselineV3Fixture } from './r17-normal-baseline-v3-fixture.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here,'../../../..');
const feature = 'apps/wechat-miniapp/src/features/sky/';
const require = createRequire(import.meta.url), ts = require(path.join(root,'apps/wechat-miniapp/node_modules/typescript'));
const read = file => fs.readFile(file,'utf8').then(value => value.replaceAll('\r\n','\n'));
const template = name => read(path.join(here,name));
const production = name => read(path.join(root,feature,name));
const original = { runtime: await template('r17-phone-probe-v3-runtime.ts'), observer: await template('r17-page-bridge-observer.ts'),
  controls: await template('r17-accepted-action-controls.tsx'), page: await production('spot-sky-page.tsx'),
  layout: await production('orientation-ruler-layout.ts'), nativePosition: await read(path.join(root,'apps/wechat-miniapp/src/components/ruler-scroll-position.ts')) };
const correlated = addR17ACorrelation({ runtime: original.runtime.replaceAll('__VARIANT__','baseline'), pageObserver: original.observer });
const observed = addR17RulerEntryV2({ runtime: correlated.runtime, controls: normalControls(original.controls,'a'.repeat(64)),
  page: normalPage(original.page), layout: original.layout, nativePosition: original.nativePosition });
const changed = { ...observed, ...addR17NormalInput(observed) };
const originalGeometry = await production('use-sky-time-geometry.ts');
const geometryChanged = addR17GeometryStages({ runtime: changed.runtime, page: changed.page,
  geometry: originalGeometry });
const geometryKeySource = await read(path.join(root,'apps/wechat-miniapp/src/services/sky-geometry-window-response.ts'));
const cancellationSource = await read(path.join(root,'apps/wechat-miniapp/src/services/request-lifecycle.ts'));
const geometryRuntime = await template('r17-geometry-stage-runtime.ts');
const drawChanged = addR19DrawReasons({ ...geometryChanged, lifecycle: normalLifecycle(await production('sky-canvas-lifecycle.ts')) });
const originalDrawScene = await production('sky-scene-render.ts'), originalRenderer = await production('sky-gpu-renderer.ts');
const costChanged = addR20DrawCosts({ runtime: drawChanged.runtime, scene: originalDrawScene, renderer: originalRenderer });
const inputs = new Map(Object.entries({ 'spot-sky-page.tsx': changed.page, 'orientation-ruler-layout.ts': changed.layout,
  'r17-phone-probe-runtime.ts': changed.runtime, 'r17-phone-probe-controls.tsx': changed.controls,
  'r17-ruler-scroll-position.ts': changed.nativePosition,
  'r17-ruler-entry-runtime.ts': (await template('r17-ruler-entry-runtime.ts')).replace('starward-r17-ruler-entry-v1','starward-r17-ruler-entry-v2'),
  'r17-a-correlation-runtime.ts': await template('r17-a-correlation-runtime.ts'),
  'r17-page-bridge-observer.ts': correlated.pageObserver, 'r17-normal-observations.ts': await template('r17-normal-observations.ts') }));
function compile(source, jsx = ts.JsxEmit.ReactJSX) {
  const result = ts.transpileModule(source,{ reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx} });
  assert.equal(result.diagnostics.length,0); return result.outputText;
}
const receipt = value => JSON.parse(JSON.stringify(value));
const entries = (value,code) => value.rulerEntry.entries.filter(row => row[1] === code);
function environment({ legacy = false, geometry = false, drawReasons = false, drawCosts = false, unboundedReceipt = false } = {}) {
  drawReasons ||= drawCosts;
  geometry ||= drawReasons;
  let elapsed = 0, offset = 0, unavailable = false, timer = 0;
  const timers = new Map(), context = { Date: class extends Date { static now() { return unavailable ? NaN : 1_800_000_000_000 + elapsed + offset; } },
    setTimeout: (run,delay) => { const id = ++timer; timers.set(id,{at:elapsed+delay,run}); return id; }, clearTimeout:id => timers.delete(id) };
  function load(source,deps = {},suffix = '') {
    const module = {exports:{}};
    vm.runInNewContext('(function(exports,require,module){'+compile(source)+'\n'+suffix+'\n})',context)(module.exports,name => {
      if (!Object.hasOwn(deps,name)) throw Error('missing_fixture_dependency:'+name); return deps[name];
    },module); return module.exports;
  }
  const entry = load(inputs.get('r17-ruler-entry-runtime.ts'));
  const correlation = load(inputs.get('r17-a-correlation-runtime.ts'));
  const probe = load(legacy ? correlated.runtime : drawCosts ? costChanged.runtime : drawReasons ? drawChanged.runtime : geometry ? geometryChanged.runtime : changed.runtime,
    {'./r17-ruler-entry-runtime':unboundedReceipt ? {...entry,r17ProbeBoundedReceipt:payload=>payload} : entry,'./r17-a-correlation-runtime':correlation,
      ...(geometry ? {'./r17-geometry-stage-runtime':load(geometryRuntime,{'./r17-ruler-entry-runtime':entry})} : {}),
      ...(drawReasons ? {'./r17-normal-observations':load(inputs.get('r17-normal-observations.ts'))} : {})}).r17Probe;
  assert.equal(probe.configureBinding({mode:'normal',buildGeneration:27,buildSourceSha256:'a'.repeat(64)}),true);
  const advance = amount => { const end=elapsed+amount; for(;;) {
    const due=[...timers].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!due)break;timers.delete(due[0]);elapsed=due[1].at;due[1].run();
  }elapsed=end; };
  return {entry:entry.r17RulerEntry,entryModule:entry,probe,context,load,advance,timers,elapsed:()=>elapsed,jump:amount=>{offset+=amount;},unavailable:()=>{unavailable=true;}};
}
function controlEnvironment(options = {}) {
  const e=environment(options), requests=[],effects=[];let hide,show,memo,memoDeps;
  const observer=e.load(inputs.get('r17-page-bridge-observer.ts'),{'./r17-phone-probe-runtime':{r17Probe:e.probe}});
  const page={setData(){}};
  const controlSource=options.retirement ? addR17NormalInput(addR17RulerEntryV2({runtime:correlated.runtime,
    controls:normalControls(original.controls,'a'.repeat(64),true),page:normalPage(original.page),layout:original.layout,nativePosition:original.nativePosition})).controls : changed.controls;
  const controls=e.load(controlSource,{
    './r17-phone-probe-runtime':{r17Probe:e.probe},'./r17-ruler-entry-runtime':e.entryModule,'./r17-page-bridge-observer':observer,
    './r17-normal-observations':{...e.load(inputs.get('r17-normal-observations.ts')),r17NormalSceneStats:()=>({frozen:false,retired:false,nativeCopies:0,readyNativeCopies:0}),
      r17NormalTextStats:()=>({nativeGlyphCalls:0,lifetimeNativeGlyphCalls:0,observationResets:0}),r17ResetNormalObservation(){}},
    react:{useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:make=>{effects.push(make());},
      useMemo:(make,deps)=>{if(!memoDeps||deps.some((value,i)=>!Object.is(value,memoDeps[i]))){memo=make();memoDeps=deps;}return memo;}},
    '@tarojs/taro':{__esModule:true,useDidHide:callback=>{hide=callback;},useDidShow:callback=>{show=callback;},default:{
      getCurrentInstance:()=>({page}),getAppBaseInfo:()=>({enableDebug:false}),setStorageSync(){},request:options=>new Promise(resolve=>requests.push({options,resolve}))}},
    '@tarojs/components':{Button:'Button',Text:'Text',View:'View'},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  },'exports.fixture={startDiagnostic,exportDiagnostic,cancelDiagnostic,status:()=>status};');
  e.context.__MINIAPP_API_BASE__='http://diagnostic.invalid';
  controls.useR17NormalLifecycle();
  const owner={};controls.useR17NormalInputScope(owner,'binding-A','committed-A',1);
  return {...e,controls,requests,owner,hide:()=>hide(),show:()=>show(),unmount:()=>effects.forEach(cleanup=>cleanup?.())};
}
function actualPreviewHandlers(e,{current=true,allowed=true,rows=true,at='2026-10-18T20:30:00.000Z'}={}) {
  const scopes={r17NormalManualInputStarted:e.controls.r17NormalManualInputStarted,skyTimeIntentCurrent:()=>current,
    skyTimeInputAllowed:()=>allowed,datePickerOpenRef:{current:false},timeRows:rows?[{at}]:[],timeModel:{},
    skyRulerTime:()=>at,cancelSkyCalibration(){},setTimeIntent:value=>value,observationTime:{preview(value){
      const state={at:value};e.probe.intent(state);return state;}},Date:e.context.Date};
  const ast=ts.createSourceFile('page.tsx',changed.page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let ruler,six;
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='onPreview')ruler=node.initializer.getText(ast);
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='SkyTimeControls'){
      const field=node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText(ast)==='onPreview');six=field.initializer.expression.getText(ast);
    }ts.forEachChild(node,visit);
  };visit(ast);assert(ruler&&six);
  const evaluate=source=>vm.runInNewContext('(function(){'+compile('const result='+source+';exports.result=result;')+';return exports.result;})()', {...scopes,exports:{}});
  return {ruler:evaluate(ruler),six:evaluate(six)};
}
test('r6 materialized current source strictly typechecks; the shared production native owner remains untouched',()=>{
  const file=path.join(root,'apps/wechat-miniapp/tsconfig.json'),config=ts.readConfigFile(file,ts.sys.readFile);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(file));
  const map=new Map([...inputs].map(([name,source])=>[path.join(root,feature,name).replaceAll('\\','/'),source]));
  const options={...parsed.options,noEmit:true};assert(options.strict&&options.noUncheckedIndexedAccess&&options.exactOptionalPropertyTypes);
  const host=ts.createCompilerHost(options),readFile=host.readFile,exists=host.fileExists;
  host.readFile=file=>map.get(file.replaceAll('\\','/'))??readFile(file);host.fileExists=file=>map.has(file.replaceAll('\\','/'))||exists(file);
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([...new Set([...parsed.fileNames,...map.keys()])],options,host));
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:v=>v,getNewLine:()=> '\n'}));
  assert.doesNotMatch(original.nativePosition,/r17/);assert.doesNotMatch(changed.page,/setScrollLeft|scrollLeft=\{|scrollWithAnimation=\{/);
  assert.doesNotMatch(changed.page,/r17RulerEntry\.record\(12,/);assert(!Object.hasOwn(R17_RULER_ENTRY_V2_EVENTS,12));
});
test('manual arm waits without a timer or run; invalid real handlers do not consume it; one legal six-field input starts before publication',async()=>{
  const e=controlEnvironment();assert.equal(e.controls.fixture.startDiagnostic('manual-input'),true);assert.equal(e.timers.size,0);assert.equal(e.probe.status(),'empty');
  actualPreviewHandlers(e,{current:false}).six('2026-10-18T20:00:00Z');
  actualPreviewHandlers(e,{allowed:false}).six('2026-10-18T20:00:00Z');
  actualPreviewHandlers(e,{rows:false}).ruler(3);actualPreviewHandlers(e,{at:null}).ruler(3);
  assert.equal(e.timers.size,0);assert.equal(e.probe.status(),'empty');
  e.advance(25000);await e.controls.fixture.exportDiagnostic();assert.equal(e.requests.length,0);assert.match(e.controls.fixture.status(),/等待实际时间输入/);
  const legal=actualPreviewHandlers(e);assert.equal(legal.six('2026-10-18T20:30:00Z'),true);assert.equal(e.probe.status(),'recording');
  assert.equal(e.timers.size,2,'same measurement deadline and one 15s export; no 1s arm or Play timer');
  e.advance(10);const first=receipt(e.probe.snapshot());assert.equal(first.schemaVersion,R17_MANUAL_INPUT_SCHEMA);assert.equal(first.window.startDelayMs,0);
  assert.equal(first.window.elapsedMs,10);assert.equal(first.controls.recordingStartRelativeMs,0);assert.equal(first.counters.timeIntentPublications,1);
  assert.equal(first.manualInput.trigger,1);assert.equal(first.linkage.links.length,0);assert(!Object.hasOwn(first,'rulerEntry'));
  assert.equal(validateR17PhoneProbeMetrics(first),true);assert.equal(previous(first),false);assert.equal(e.probe.terminalSnapshot(),null);
  assert.equal(e.controls.r17NormalManualInputStarted(2),false,'a later input cannot restart the run');e.controls.fixture.cancelDiagnostic();
});
test('manual ruler observation includes a latest unsuperseded intent and first accepted result through the existing recorder',()=>{
  const e=controlEnvironment();e.controls.fixture.startDiagnostic('manual-input');actualPreviewHandlers(e).ruler(4);
  const state={at:'2026-10-18T20:45:00Z'},sequence=e.probe.intent(state),token=e.probe.prepareStarted(sequence,'presentation');
  e.advance(4);e.probe.prepareFinished(token);const frame={frameAt:state.at};e.probe.request(frame,token,sequence);
  e.advance(3);e.probe.paintStarted(frame);e.advance(5);e.probe.accepted(frame,{objects:[{reference:'HR:1'}]});
  const value=receipt(e.probe.snapshot());assert.equal(value.manualInput.trigger,2);assert.equal(value.linkage.firstAcceptedIntents,1);
  assert.equal(value.linkage.latency.unsupersededIntentToFirstAcceptedMs.validCalls,1);assert.equal(value.linkage.firstAcceptedAfterSuperseded,0);
  assert.equal(value.linkage.links[0].intentSuperseded,false);assert.equal(value.linkage.links[0].intentFirstAcceptedObserved,true);
  assert.equal(value.aCorrelation.links[0].firstRequestObserved,true);assert.equal(value.aCorrelation.links[0].firstPaintObserved,true);
  assert.equal(validateR17PhoneProbeMetrics(value),true);e.controls.fixture.cancelDiagnostic();
});
test('hide, unmount and synchronous Context replacement retire both armed and already started manual observations',()=>{
  for(const started of [false,true])for(const boundary of ['hide','unmount','context']){
    const e=controlEnvironment();e.controls.fixture.startDiagnostic('manual-input');if(started)actualPreviewHandlers(e).ruler(4);
    if(boundary==='context')e.controls.useR17NormalInputScope({},'binding-B','committed-B',2);else e[boundary]();
    assert.equal(e.timers.size,0,boundary);assert.equal(e.controls.r17NormalManualInputStarted(1),false,boundary);
    e.advance(60000);assert.equal(e.requests.length,0,boundary);assert.notEqual(e.probe.status(),'recording');
  }
  const e=controlEnvironment();e.controls.fixture.startDiagnostic('manual-input');e.controls.useR17NormalInputScope(e.owner,'binding-A','committed-A',1);
  assert.equal(e.controls.r17NormalManualInputStarted(1),true,'unchanged Context render keeps the arm');e.controls.fixture.cancelDiagnostic();
});
test('15s manual auto export uses its input-relative window and cached byte-identical retry without a product Pause',async()=>{
  const e=controlEnvironment();e.controls.fixture.startDiagnostic('manual-input');e.advance(60000);assert.equal(e.requests.length,0);
  actualPreviewHandlers(e).six('2026-10-18T21:00:00Z');e.advance(15000);assert.equal(e.requests.length,1);
  const request=e.requests[0],value=JSON.parse(request.options.data);assert.equal(value.window.elapsedMs,15000);assert.equal(value.window.startDelayMs,0);
  assert.equal(value.controls.events.actualPlay.calls,0);assert.equal(value.controls.events.pauseAttempt.calls,0);assert.equal(validateR17PhoneProbeMetrics(value),true);
  request.resolve({statusCode:503,data:{stored:false}});await new Promise(resolve=>setImmediate(resolve));
  void e.controls.fixture.exportDiagnostic();assert.equal(e.requests[1].options.data,request.options.data);
  e.requests[1].resolve({statusCode:200,data:{stored:true}});await new Promise(resolve=>setImmediate(resolve));e.advance(10000);
  assert.equal(e.requests.length,2);assert.equal(e.timers.size,0);e.controls.fixture.cancelDiagnostic();
});
test('new native request/readback/admission ring keeps old window callbacks out of a fresh observation without changing product calls',()=>{
  const e=environment();e.probe.start('wide-time');const nodes=[],offsets=[],calls=[];
  const query=()=>{let node=false;const q={select(){return q;},node(){node=true;return q;},scrollOffset(){return q;},exec(cb){(node?nodes:offsets).push(cb);}};return q;};
  const native=e.load(changed.nativePosition,{'@tarojs/taro':{__esModule:true,default:{createSelectorQuery:query,nextTick:callback=>callback()}},'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry}});
  const owner=native.createRulerScrollPosition('ruler',7),oldWindow=e.entry.window();let observed=0;
  owner.move(561.5,false,()=>observed++,oldWindow);nodes.shift()([{node:{scrollTo(options){calls.push(options);}}}]);
  assert.equal(calls.length,1);assert.deepEqual(receipt(calls[0]),{left:561.5,animated:false});assert.equal(observed,0);
  e.probe.stop();e.probe.start('wide-time');offsets.shift()([{scrollLeft:561.5}]);assert.equal(observed,1,'diagnostic retirement does not suppress the original callback');
  const value=receipt(e.probe.snapshot());assert.equal(entries(value,32).length,0);assert(value.rulerEntry.rejectedWindowEvents>0);assert.equal(validateR17PhoneProbeMetrics(value),true);
});
test('r6 ring observes real current-source admission; old native offsets cannot admit a queued replacement window',async()=>{
  const e=environment();e.probe.start('wide-time');
  const layout=e.load(changed.layout,{'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry}});
  const baseSettlement=e.load(await read(path.join(root,'apps/wechat-miniapp/src/components/scroll-settlement.ts')));
  const settlement=e.load(await production('sky-time-ruler-settlement.ts'),{'../../components/scroll-settlement':baseSettlement});
  const fixtureSource=await production('orientation-time-ruler-window.test.ts'),ast=ts.createSourceFile('fixture.ts',fixtureSource,ts.ScriptTarget.Latest,true);
  const declaration=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='rulerFixture');assert(declaration);
  const extracted=declaration.getText(ast).replace('{ Taro: platform, setTimeout, clearTimeout, Date }','{ r17RulerEntry, Taro: platform, setTimeout, clearTimeout, Date }')
    .replace('Taro: platform, clockTimeInTimezone','r17RulerEntry, Taro: platform, clockTimeInTimezone').replaceAll('import.meta.url','"file:///ruler-fixture/"');
  const run=vm.runInNewContext(compile(extracted+'\nexports.fixture=rulerFixture;',ts.JsxEmit.React)+'\nexports.fixture;',{
    exports:{},assert,ts,vm,URL,setTimeout:e.context.setTimeout,clearTimeout:e.context.clearTimeout,Date:e.context.Date,
    readFileSync:url=>String(url).includes('ruler-scroll-position')?changed.nativePosition:changed.page,
    clockTimeInTimezone:()=>({hour:4,minute:30,second:0}),createOrientationRulerLayout:layout.createOrientationRulerLayout,
    createSkyTimeRulerSettlement:settlement.createSkyTimeRulerSettlement,r17RulerEntry:e.entry});
  const rows=Array.from({length:49},(_,i)=>({at:new Date(Date.parse('2026-10-18T04:00:00Z')+i*1800000).toISOString()}));
  const props={rows,activeIndex:33,committedIndex:33,presentedAt:rows[33].at,isPreviewing:false,layoutReady:true,preparing:true};
  const component=run(props,390,true);component.nativeReady();const first=component.takeLayoutRead();assert(first);
  first([{left:194.7,width:1},{left:-396,width:17},{left:-379,width:17},{scrollLeft:583.200012}]);component.nativeReady();component.flush();
  const ready=receipt(e.probe.snapshot());assert(entries(ready,27).length>0);assert.equal(validateR17PhoneProbeMetrics(ready),true);
  assert(entries(ready,17).length>0&&entries(ready,32).length>0);assert.equal(entries(ready,17)[0].at(-1),0);
  assert(!ready.rulerEntry.entries.some(row=>row[1]===12));
  e.probe.start('wide-time');const previousRows=rows.map(row=>({at:new Date(Date.parse(row.at)-86400000).toISOString()}));
  const oldLeft=component.nativeLeft,commands=component.positions.length;
  component.render({...props,rows:previousRows,preparing:false});component.arrive(oldLeft);
  component.render({...props,preparing:false});component.arrive(oldLeft);
  assert.equal(component.positions.length,commands,'A → B → A native replacement is still queued');
  const stale=receipt(e.probe.snapshot());assert.equal(entries(stale,27).length,0,'an old matching offset cannot become new-window admission');
  assert.equal(validateR17PhoneProbeMetrics(stale),true);component.unmount();
});
test('manual observations keep bounded linkage and explicit unknown clock coverage within the original byte limit',()=>{
  const e=environment();e.probe.start('manual-input',2);
  for(let i=0;i<2200;i++){
    const state={at:new Date(1792353600000+i*1000).toISOString()},intent=e.probe.intent(state),token=e.probe.prepareStarted(intent,'presentation');
    e.advance(2);e.probe.prepareFinished(token);const frame={frameAt:state.at};e.probe.request(frame,token,intent);
    e.advance(1);e.probe.paintStarted(frame);e.advance(1);e.probe.accepted(frame,{objects:[]});
  }
  const bounded=receipt(e.probe.snapshot());assert.equal(bounded.linkage.retainedPreparations,2048);assert.equal(bounded.aCorrelation.links.length,8);
  assert(Buffer.byteLength(JSON.stringify(bounded),'utf8')<=32768);assert.equal(validateR17PhoneProbeMetrics(bounded),true);
  e.probe.start('manual-input',1);e.advance(2);e.jump(-100);e.probe.intent({at:'2026-10-18T00:00:00Z'});
  const backwards=receipt(e.probe.snapshot());assert.equal(backwards.window.elapsedMs,null);assert.equal(backwards.window.elapsedStatus,'clockDiscontinuity');
  assert.equal(validateR17PhoneProbeMetrics(backwards),true);
  const missing=environment();missing.unavailable();missing.probe.start('manual-input',1);const unknown=receipt(missing.probe.snapshot());
  assert.equal(unknown.controls.recordingStartRelativeMs,null);assert.equal(unknown.window.elapsedMs,null);assert.equal(validateR17PhoneProbeMetrics(unknown),true);
});
test('strict finite schemas reject altered start semantics, private fields and mismatched ring event versions',async()=>{
  const e=environment();e.probe.start('manual-input',1);e.advance(2);const manual=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(manual),true);
  for(const mutate of [v=>v.window.startDelayMs=1000,v=>v.schemaVersion='starward-r17-phone-probe-v3',v=>v.manualInput.trigger=3,
    v=>v.manualInput.secret='private',v=>v.caseKey='wide-time',v=>v.controls.recordingStartRelativeMs=1,v=>v.controls.events.actualPlay.calls=1]){
    const value=receipt(manual);mutate(value);assert.equal(validateR17PhoneProbeMetrics(value),false);
  }
  e.probe.start('wide-time');e.entry.record(5,[5,true,true,false,false]);const ring=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(ring),true);
  const old=receipt(ring);old.rulerEntry.schemaVersion='starward-r17-ruler-entry-v1';assert.equal(validateR17PhoneProbeMetrics(old),false);
  const fake=receipt(ring);fake.rulerEntry.entries[1][1]=12;assert.equal(validateR17PhoneProbeMetrics(fake),false);
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r17-normal-input-collector-'));
  try{
    const store=createR17PhoneProbeCollector(directory);assert.equal(await store.store(manual),200);assert.equal(await store.store(manual),200);
    const conflict=receipt(manual);conflict.manualInput.trigger=2;assert.equal(await store.store(conflict),409);
    assert.equal(await store.store(ring),200);const terminal=receipt(e.probe.terminalSnapshot());assert.equal(validateR17PhoneProbeTerminal(terminal),true);
    assert.equal(matchR17PhoneProbeTerminal(ring,terminal),true);assert.equal(await store.store(terminal),200);
  }finally{const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());assert(path.basename(resolved).startsWith('starward-r17-normal-input-collector-'));await fs.rm(resolved,{recursive:true});}
});
test('historical A1/v3 and legacy r5 ring keep original 1s protocol interpretation',()=>{
  const e=environment({legacy:true});e.probe.start('wide-time');assert.equal(e.probe.status(),'armed');e.advance(1001);const value=receipt(e.probe.snapshot());
  assert.equal(value.window.startDelayMs,1000);assert.equal(value.schemaVersion,'starward-r17-phone-probe-v3');assert.equal(validateR17PhoneProbeMetrics(value),true);
  const legacyRing={...value,rulerEntry:{schemaVersion:'starward-r17-ruler-entry-v1',collection:'immediate-wide-time',meaning:'requests-offsets-not-presentation',capacity:128,
    observed:1,dropped:0,overflow:false,exportOmitted:0,rejectedWindowEvents:0,start:{value:1800000000000,epoch:0,windowId:value.binding.windowId},
    entries:[[1,1,0,1800000000000,0,value.binding.windowId]]}};
  assert.equal(previous(legacyRing),true);assert.equal(validateR17PhoneProbeMetrics(legacyRing),true);
});
test('existing full normal fixture still owns actual Play, 15s metrics, 20s Pause, retry and retirement',async()=>{
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r17-normal-input-fixture-'));
  try{
    const files=new Map(inputs);for(const name of ['sky-command-state.ts','sky-selected-object.tsx','use-sky-artwork.ts','sky-stellar-transform.ts',
      'sky-object-selection.ts','sky-star-transition.ts','sky-ready-presentation.ts','sky-name-layout.ts'])files.set(name,await production(name));
    for(const[name,source]of files){const file=path.join(directory,feature,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,source,{flag:'wx'});}
    const result=await verifyNormalBaselineV3Fixture({sourceRoot:directory,productionRoot:root,feature,ts,buildGeneration:25,
      protocolPath:path.join(here,'r17-normal-input-protocol.mjs'),allowACorrelation:true,allowRulerEntry:true});assert(Object.values(result).every(value=>value===true));
  }finally{const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());assert(path.basename(resolved).startsWith('starward-r17-normal-input-fixture-'));await fs.rm(resolved,{recursive:true});}
});

const geometryRows = (value, code) => value.geometryStages.entries.filter(row => row[1] === code);
const tick = () => new Promise(resolve=>setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no)=>{resolve=yes;reject=no;}); return {promise,resolve,reject}; };
const atDay = index => new Date(Date.UTC(2026,9,20-index,12,30)).toISOString();
function trackedSignal() {
  const listeners = new Set();
  const signal = {aborted:false,addEventListener(type,fn){assert.equal(type,'abort');listeners.add(fn);},
    removeEventListener(type,fn){assert.equal(type,'abort');listeners.delete(fn);}};
  return {signal,listeners,abort(){signal.aborted=true;for(const fn of [...listeners])fn();}};
}
test('r17 geometry observer and actual transformed hook/page strictly typecheck without changing the original activation guard',()=>{
  const file=path.join(root,'apps/wechat-miniapp/tsconfig.json'),config=ts.readConfigFile(file,ts.sys.readFile);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(file));
  const prepared=new Map(inputs);
  prepared.set('r17-phone-probe-runtime.ts',geometryChanged.runtime);prepared.set('spot-sky-page.tsx',geometryChanged.page);
  prepared.set('use-sky-time-geometry.ts',geometryChanged.geometry);prepared.set('r17-geometry-stage-runtime.ts',geometryRuntime);
  const map=new Map([...prepared].map(([name,source])=>[path.join(root,feature,name).replaceAll('\\','/'),source]));
  const options={...parsed.options,noEmit:true};assert(options.strict&&options.noUncheckedIndexedAccess&&options.exactOptionalPropertyTypes);
  const host=ts.createCompilerHost(options),readFile=host.readFile,exists=host.fileExists;
  host.readFile=file=>map.get(file.replaceAll('\\','/'))??readFile(file);host.fileExists=file=>map.has(file.replaceAll('\\','/'))||exists(file);
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([...new Set([...parsed.fileNames,...map.keys()])],options,host));
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:v=>v,getNewLine:()=>'\n'}));
  assert.match(geometryChanged.page,/pageVisible && skyResourcesActive && !carriedReport && !timeSaving,/);
  assert.doesNotMatch(geometryChanged.geometry,/setTimeout|setInterval|useState|JSON\.stringify/);
});
test('r17 logical request, actual abort, validated completion, current hook admission and existing accepted identity are distinct',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  const a=e.probe.intent({at:atDay(1)}),aborted=trackedSignal(),old=deferred();
  const token=e.probe.geometryRequest(atDay(1),atDay(1),a,aborted.signal);e.probe.geometryWatch(token,old.promise);
  e.advance(70);const b=e.probe.intent({at:atDay(2)});aborted.abort();old.reject(new Error('private-cancel-message'));
  await tick();assert.equal(aborted.listeners.size,0);
  const current=deferred(),response={data:{model:{startAt:atDay(2),private:'must not be copied'}}};
  const next=e.probe.geometryRequest(atDay(2),atDay(2),b);e.probe.geometryWatch(next,current.promise);
  e.advance(35);current.resolve(response);await tick();
  e.advance(8);e.probe.geometryAdmitted(response,atDay(2),atDay(2),b);
  e.probe.geometryAdmitted(response,atDay(2),atDay(2),b);
  const prepared=e.probe.prepareStarted(b);e.advance(2);e.probe.prepareFinished(prepared);
  const frame={frameAt:atDay(2)};e.probe.request(frame,prepared,b);e.advance(3);e.probe.paintStarted(frame);
  e.advance(5);e.probe.accepted(frame,{objects:[]});
  const v=receipt(e.probe.snapshot());assert.equal(v.schemaVersion,R17_GEOMETRY_INPUT_SCHEMA);
  assert.equal(validateR17PhoneProbeMetrics(v),true);assert.equal(previous(v),false);
  assert.deepEqual(v.geometryStages.entries.map(row=>row[1]),[1,2,1,3,5,2,4,6]);
  assert.equal(geometryRows(v,3)[0][2],70);assert.equal(geometryRows(v,4)[0][2],105);assert.equal(geometryRows(v,6)[0][2],113);
  assert.equal(geometryRows(v,2)[1][7],b);assert.equal(geometryRows(v,6)[0][7],b);
  assert.equal(v.linkage.links[0].intentSequence,b);assert.equal(v.linkage.links[0].intentFirstAcceptedObserved,true);
  assert.equal(v.geometryStages.pendingAtStop,0);assert.equal(v.geometryStages.unmatchedAdmissions,0);
  assert.doesNotMatch(JSON.stringify(v),/private|must not be copied|2026-10/);
});
test('r17 preserves synchronous throws, reports pre-aborted signals, and cannot label a cached/inherited admission as a new validated request',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  const at=atDay(1),intent=e.probe.intent({at}),signal=trackedSignal();signal.abort();
  const token=e.probe.geometryRequest(at,at,intent,signal.signal);e.probe.geometryRejected(token,true);
  const cached={data:{model:{startAt:at}}};e.probe.geometryAdmitted(cached,at,at,intent);
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true);
  assert.equal(geometryRows(v,2)[0][8],2);assert.equal(geometryRows(v,3)[0][8],1);
  assert.equal(geometryRows(v,5)[0][8],1);assert.equal(geometryRows(v,4).length,0);
  assert.equal(geometryRows(v,6)[0][4],null);assert.equal(v.geometryStages.unmatchedAdmissions,1);
});
test('r17 stop detaches abort listeners and old Promise completions do not cross the sealed or replacement run',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  const at=atDay(1),intent=e.probe.intent({at}),signal=trackedSignal(),work=deferred();
  const token=e.probe.geometryRequest(at,at,intent,signal.signal);e.probe.geometryWatch(token,work.promise);
  assert.equal(signal.listeners.size,1);e.advance(5);e.probe.stop();assert.equal(signal.listeners.size,0);
  const sealed=receipt(e.probe.snapshot());assert.equal(sealed.geometryStages.pendingAtStop,1);
  e.probe.start('manual-input',1);signal.abort();work.resolve({});await tick();
  e.advance(1);const next=receipt(e.probe.snapshot());assert.equal(next.geometryStages.observed,0);
  assert.equal(validateR17PhoneProbeMetrics(next),true);
  assert.equal(geometryRows(sealed,4).length,0);assert.equal(geometryRows(sealed,3).length,0);
});
test('r17 actual hide retires geometry listeners; a shared cache response keeps ambiguous request identity explicit',async()=>{
  const e=controlEnvironment({geometry:true});e.controls.fixture.startDiagnostic('manual-input');actualPreviewHandlers(e).six(atDay(1));
  const at=atDay(1),intent=e.probe.intent({at}),signal=trackedSignal();
  const token=e.probe.geometryRequest(at,at,intent,signal.signal),pending=deferred();e.probe.geometryWatch(token,pending.promise);
  e.hide();assert.equal(signal.listeners.size,0);pending.resolve({});await tick();
  assert.equal(geometryRows(receipt(e.probe.snapshot()),4).length,0);
  const shared={};e.probe.start('manual-input',1);const current=e.probe.intent({at});
  for(let i=0;i<2;i++){const request=e.probe.geometryRequest(at,at,current);e.probe.geometryWatch(request,Promise.resolve(shared));await tick();}
  e.probe.geometryAdmitted(shared,at,at,current);const value=receipt(e.probe.snapshot());
  assert.equal(value.geometryStages.ambiguousResponses,1);assert.equal(geometryRows(value,4).length,2);
  assert.equal(geometryRows(value,6)[0][4],null);assert.equal(geometryRows(value,6)[0][8],2);
  assert.equal(validateR17PhoneProbeMetrics(value),true);
});
// Execute original and injected production hooks with identical bounded inputs.
// Query scheduling remains covered by the production owner's real Query tests;
// this fixture checks that the observer changes none of its callback semantics.
function geometryHookPair(e,at) {
  const originalModel={startAt:atDay(1),endAt:atDay(0)};
  const report={context:{spotId:'private-spot',contextId:'private-context',contextRevision:1,contextFingerprint:'private-hash',dataRevision:'r',timezone:'UTC'},
    observationFrames:[{observer:{private:true}}]};
  const windowFor=(instant,_timezone,mode='NIGHT')=>{
    const width=(mode==='TWO_HOURS'?2:24)*60*60*1000,value=Date.parse(instant);
    if(!Number.isFinite(value))throw new Error('fixture_invalid_time');
    const start=Math.floor(value/width)*width;
    return {startAt:new Date(start).toISOString(),endAt:new Date(start+width).toISOString()};
  };
  const cancellation=e.load(cancellationSource);
  const make=instrumented=>{
    const slots=[],calls=[],watched=[];let cursor=0,queryOptions,queryData,clientCall;
    let demand={at,fullWindow:false},demandReads=0,windowReads=0,refetches=0;
    const contracts={skyGeometryWindow:(...args)=>{windowReads++;return windowFor(...args);}};
    const hook=e.load(instrumented?geometryChanged.geometry:originalGeometry,{
      './r17-phone-probe-runtime':{r17Probe:{...e.probe,geometryWatch(token,promise){watched.push(promise);e.probe.geometryWatch(token,promise);}}},
      react:{useRef:initial=>slots[cursor++]??={current:initial},
        useMemo:(build,deps)=>{const index=cursor++,old=slots[index];if(!old||deps.some((value,i)=>!Object.is(value,old.deps[i])))slots[index]={value:build(),deps};return slots[index].value;}},
      '@starward/miniapp-contracts':contracts,
      '../../hooks/use-resource-query':{useResourceQuery:options=>{queryOptions=options;return{data:queryData,isError:false,refetch(){refetches++;return Promise.resolve(queryData);}};}},
      '../../services/sky-celestial-client':{getSkyGeometryWindow:(binding,signal)=>{calls.push({binding,signal});return clientCall();}},
      '../../services/sky-geometry-window-response':e.load(geometryKeySource,{'@starward/miniapp-contracts':contracts}),
      '../../services/request-lifecycle':cancellation,
      './sky-time-presentation':{skyPresentationTimeModel:()=>originalModel},'./sky-time-frame':{exactSkyTimeFrame:()=>null},
    });
    return {calls,watched,setDemand(value){demand=value;},setData(value){queryData=value;},setClient(value){clientCall=value;},
      render(currentAt=at,intent=null,{active=true,fullWindow=false}={}){cursor=0;return hook.useSkyTimeGeometry(report,currentAt,active,fullWindow,()=>{demandReads++;return demand;},intent);},
      get query(){return queryOptions;},counts:()=>({demandReads,windowReads,refetches}),
      isCancelled:error=>error instanceof cancellation.MiniappRequestCancelled&&error.reason==='superseded'};
  };
  return {plain:make(false),observed:make(true),originalModel,
    response:instant=>({data:{model:windowFor(instant,'UTC','TWO_HOURS')},sources:[{private:'same original source object'}]})};
}
const geometryResult=value=>({model:value.model,original:value.original,sources:value.sources,
  playbackReady:value.playbackReady,playbackPending:value.playbackPending,playbackFailed:value.playbackFailed,pending:value.pending,failed:value.failed});

test('r22 original and observed hook preserve same-window continuation, guarded result identity and actual retained admission',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  const at=atDay(2),later=new Date(Date.parse(at)+60000).toISOString(),intent=e.probe.intent({at});
  const pair=geometryHookPair(e,at),response=pair.response(at),work=deferred(),signal=trackedSignal();
  const outcomes=[];
  for(const h of [pair.plain,pair.observed]){
    h.render(at,intent);assert.equal(h.query.enabled(),true);h.setClient(()=>work.promise);
    const promise=h.query.queryFn(signal.signal);
    assert.notEqual(promise,work.promise,'production itself returns its demand-guard chain');
    assert.equal(h.calls.length,1);assert.equal(h.calls[0].signal,signal.signal);
    assert.equal(h.calls[0].binding.at,at);assert.equal(h.calls[0].binding.windowMode,'TWO_HOURS');
    h.setDemand({at:later,fullWindow:false});h.render(later,intent);outcomes.push(promise);
  }
  assert.equal(pair.observed.watched.length,1);assert.equal(pair.observed.watched[0],work.promise);
  e.advance(40);work.resolve(response);
  for(const outcome of outcomes)assert.equal(await outcome,response,'the original validated envelope is returned unchanged');
  await tick();e.advance(10);
  const results=[pair.plain,pair.observed].map(h=>{h.setData(response);return h.render(later,intent);});
  assert.deepEqual(geometryResult(results[1]),geometryResult(results[0]));assert.equal(results[1].model,response.data.model);
  assert.equal(results[1].sources,response.sources);assert.deepEqual(pair.observed.counts(),pair.plain.counts());
  const value=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(value),true);
  assert.equal(value.geometryStages.requests,1);assert.equal(geometryRows(value,4).length,1);assert.equal(geometryRows(value,6).length,1);
  assert.equal(geometryRows(value,6)[0][4],geometryRows(value,2)[0][4]);assert.equal(signal.listeners.size,0);
  assert.equal(geometryRows(value,6)[0][6],60000,'admission keeps the current exact instant within the shared window');
});

test('r22 stale dispatch is rejected before any client call or request observation, without additional live reads',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  const at=atDay(2),intent=e.probe.intent({at}),pair=geometryHookPair(e,at);
  for(const h of [pair.plain,pair.observed]){
    h.render(at,intent);h.setDemand({at:atDay(3),fullWindow:false});
    assert.equal(h.query.enabled(),false);await assert.rejects(h.query.queryFn(undefined),h.isCancelled);
    assert.equal(h.calls.length,0);assert.equal(h.watched.length,0);
  }
  assert.deepEqual(pair.observed.counts(),pair.plain.counts());
  const value=receipt(e.probe.snapshot());assert.equal(value.geometryStages.requests,0);
  assert.deepEqual(value.geometryStages.entries.map(row=>row[1]),[1]);assert.equal(validateR17PhoneProbeMetrics(value),true);
});

test('r22 a validated client response revoked before the production guard is not retained or relabelled as client rejection',async()=>{
  for(const revoke of ['different-window','null-demand','full-window','abort']){
    const e=environment({geometry:true});e.probe.start('manual-input',1);
    const at=atDay(2),intent=e.probe.intent({at}),pair=geometryHookPair(e,at),response=pair.response(at),work=deferred(),signal=trackedSignal();
    const outcomes=[];
    for(const h of [pair.plain,pair.observed]){
      h.render(at,intent);h.setClient(()=>work.promise);outcomes.push(h.query.queryFn(signal.signal));
      h.setDemand(revoke==='null-demand'?null:{at:revoke==='different-window'?atDay(3):at,fullWindow:revoke==='full-window'});
    }
    if(revoke==='abort')signal.abort();
    const rejected=outcomes.map((promise,index)=>assert.rejects(promise,[pair.plain,pair.observed][index].isCancelled));
    e.advance(7);work.resolve(response);await Promise.all(rejected);await tick();
    // Even if stale cache data is presented, the existing assignment guard is
    // still decisive. Abort-only covers the Promise boundary, not cache policy.
    const results=[pair.plain,pair.observed].map(h=>{if(revoke!=='abort')h.setData(response);return h.render(at,intent);});
    assert.deepEqual(geometryResult(results[1]),geometryResult(results[0]));assert.equal(results[1].model,pair.originalModel);
    assert.deepEqual(pair.observed.counts(),pair.plain.counts());assert.equal(pair.observed.watched[0],work.promise);
    const value=receipt(e.probe.snapshot());assert.equal(value.geometryStages.requests,1);
    assert.equal(geometryRows(value,4).length,1,'only the actual validated client fulfillment is observed');
    assert.equal(geometryRows(value,5).length,0,'the later production demand guard is not client validation failure');
    assert.equal(geometryRows(value,6).length,0,'no retained assignment occurred');assert.equal(signal.listeners.size,0);
    assert.equal(geometryRows(value,3).length,revoke==='abort'?1:0);assert.equal(validateR17PhoneProbeMetrics(value),true);
  }
});

test('r22 original and observed hook preserve synchronous client throws and asynchronous rejection identity',async()=>{
  for(const synchronous of [true,false]){
    const e=environment({geometry:true});e.probe.start('manual-input',1);
    const at=atDay(2),intent=e.probe.intent({at}),pair=geometryHookPair(e,at),error=new Error('private client error');
    for(const h of [pair.plain,pair.observed]){
      h.render(at,intent);h.setClient(()=>{if(synchronous)throw error;return Promise.reject(error);});
      if(synchronous)assert.throws(()=>h.query.queryFn(undefined),actual=>actual===error);
      else await assert.rejects(h.query.queryFn(undefined),actual=>actual===error);
      assert.equal(h.calls.length,1);
    }
    await tick();assert.deepEqual(pair.observed.counts(),pair.plain.counts());
    const value=receipt(e.probe.snapshot());assert.equal(geometryRows(value,5).length,1);
    assert.equal(geometryRows(value,5)[0][8],synchronous?1:0);assert.equal(geometryRows(value,4).length,0);
    assert.equal(geometryRows(value,6).length,0);assert.equal(validateR17PhoneProbeMetrics(value),true);
  }
});

test('r22 demand revoked after a successful guarded result still prevents the subsequent retained assignment',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  const at=atDay(2),intent=e.probe.intent({at}),pair=geometryHookPair(e,at),response=pair.response(at);
  const results=[];
  for(const h of [pair.plain,pair.observed]){
    const work=Promise.resolve(response);h.render(at,intent);h.setClient(()=>work);
    assert.equal(await h.query.queryFn(undefined),response);
    h.setDemand(null);h.setData(response);results.push(h.render(at,intent));
  }
  await tick();assert.deepEqual(geometryResult(results[1]),geometryResult(results[0]));
  assert.equal(results[1].model,pair.originalModel);assert.deepEqual(pair.observed.counts(),pair.plain.counts());
  const value=receipt(e.probe.snapshot());assert.equal(value.geometryStages.requests,1);
  assert.equal(geometryRows(value,4).length,1);assert.equal(geometryRows(value,5).length,0);assert.equal(geometryRows(value,6).length,0);
  assert.equal(validateR17PhoneProbeMetrics(value),true);
});
test('r17 event/window/request storage and full receipt remain bounded, with explicit overflow and unknown clock coverage',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);
  for(let i=0;i<100;i++){
    const at=atDay(i),intent=e.probe.intent({at}),work=Promise.resolve({});
    const token=e.probe.geometryRequest(at,at,intent);e.probe.geometryWatch(token,work);
    e.advance(2);await tick();
    const prepared=e.probe.prepareStarted(intent);e.advance(1);e.probe.prepareFinished(prepared);
    const frame={frameAt:at};e.probe.request(frame,prepared,intent);e.probe.paintStarted(frame);e.advance(1);e.probe.accepted(frame,{objects:[]});
  }
  const v=receipt(e.probe.snapshot());assert(v.geometryStages.entries.length<=128);
  assert.equal(v.geometryStages.entries.length+v.geometryStages.exportOmitted,128);
  assert.equal(v.geometryStages.dropped,v.geometryStages.observed-128);assert.equal(v.geometryStages.overflow,true);
  assert.equal(v.geometryStages.windows.length,64);assert(v.geometryStages.windowMisses>0);
  assert.equal(validateR17PhoneProbeMetrics(v),true,`receipt bytes ${Buffer.byteLength(JSON.stringify(v))}`);
  assert(Buffer.byteLength(JSON.stringify(v))<=32768);
  e.probe.start('manual-input',1);const at=atDay(1),intent=e.probe.intent({at});
  for(let i=0;i<70;i++)e.probe.geometryRequest(at,at,intent);
  const pending=receipt(e.probe.snapshot());assert.equal(pending.geometryStages.pendingAtStop,64);
  assert.equal(pending.geometryStages.omittedRequests,6);assert.equal(validateR17PhoneProbeMetrics(pending),true);
  e.probe.start('manual-input',1);e.advance(2);e.jump(-100);e.probe.intent({at});
  const backward=receipt(e.probe.snapshot());assert.equal(geometryRows(backward,1)[0][2],null);
  assert.equal(backward.window.elapsedStatus,'clockDiscontinuity');assert.equal(validateR17PhoneProbeMetrics(backward),true);
});
test('r17 strict extension rejects invented success/private payloads and uses the existing serial idempotent collector',async()=>{
  const e=environment({geometry:true});e.probe.start('manual-input',1);const at=atDay(1),intent=e.probe.intent({at});
  e.probe.geometryRequest(at,at,intent);e.advance(1);const value=receipt(e.probe.snapshot());
  assert.equal(validateR17PhoneProbeMetrics(value),true);
  for(const mutate of [v=>v.geometryStages.secret='private',v=>v.schemaVersion=R17_MANUAL_INPUT_SCHEMA,
    v=>v.geometryStages.entries[1][1]=4,v=>v.geometryStages.entries[0][8]=2,
    v=>v.geometryStages.dropped++,v=>v.geometryStages.windows[0][1]='private-time',
    v=>v.geometryStages.entries[1].push('private-url')]){
    const broken=receipt(value);mutate(broken);assert.equal(validateR17PhoneProbeMetrics(broken),false);
  }
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r17-geometry-collector-'));
  try{
    const store=createR17PhoneProbeCollector(directory);assert.equal(await store.store(value),200);assert.equal(await store.store(value),200);
    const conflict=receipt(value);conflict.geometryStages.invalid++;assert.equal(await store.store(conflict),409);
  }finally{
    const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());
    assert(path.basename(resolved).startsWith('starward-r17-geometry-collector-'));await fs.rm(resolved,{recursive:true});
  }
});
test('r17 normal Play retains the previous full-path fixture and geometry collection stays manual-only',async()=>{
  const files=new Map(inputs);
  files.set('spot-sky-page.tsx',geometryChanged.page);files.set('r17-phone-probe-runtime.ts',geometryChanged.runtime);
  files.set('r17-geometry-stage-runtime.ts',geometryRuntime);files.set('use-sky-time-geometry.ts',geometryChanged.geometry);
  const result=await verifyNormalBaselineV3Fixture({productionRoot:root,feature,ts,buildGeneration:25,
    protocolPath:path.join(here,'r17-normal-input-protocol.mjs'),allowACorrelation:true,allowRulerEntry:true,
    readPreparedSource:async name=>files.get(name)??production(name)});
  assert(Object.values(result).every(value=>value===true));
  const e=environment({geometry:true});e.probe.start('wide-play');e.advance(1001);
  const at=atDay(1),intent=e.probe.intent({at});
  assert.equal(e.probe.geometryRequest(at,at,intent),null);
  const value=receipt(e.probe.snapshot());assert.equal(value.schemaVersion,'starward-r17-phone-probe-v3');
  assert(!Object.hasOwn(value,'geometryStages'));assert.equal(validateR17PhoneProbeMetrics(value),true);
});

function drawFiles() {
  return new Map([...inputs, ['spot-sky-page.tsx', drawChanged.page], ['r17-phone-probe-runtime.ts', drawChanged.runtime],
    ['sky-canvas-lifecycle.ts', drawChanged.lifecycle], ['use-sky-time-geometry.ts', geometryChanged.geometry],
    ['r17-geometry-stage-runtime.ts', geometryRuntime]]);
}
test('r19 exact page/lifecycle/request owner additions strictly typecheck and preserve the four original continuation conditions',()=>{
  const file=path.join(root,'apps/wechat-miniapp/tsconfig.json'),config=ts.readConfigFile(file,ts.sys.readFile);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(file));
  const map=new Map([...drawFiles()].map(([name,source])=>[path.join(root,feature,name).replaceAll('\\','/'),source]));
  const options={...parsed.options,noEmit:true},host=ts.createCompilerHost(options),readFile=host.readFile,exists=host.fileExists;
  host.readFile=file=>map.get(file.replaceAll('\\','/'))??readFile(file);host.fileExists=file=>map.has(file.replaceAll('\\','/'))||exists(file);
  const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([...new Set([...parsed.fileNames,...map.keys()])],options,host));
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:v=>v,getNewLine:()=>'\n'}));
  const start=drawChanged.page.indexOf('            if (camera.animating || starTransitionFrame.animating || nameLayout.animating || readyImageFrame.animating)');
  const end=drawChanged.page.indexOf('            acceptSkyCalibrationRef.current',start);
  assert(start>0&&end>start);
  for(let bits=0;bits<16;bits++){
    const calls=[];
    vm.runInNewContext(drawChanged.page.slice(start,end),{camera:{animating:Boolean(bits&1)},starTransitionFrame:{animating:Boolean(bits&2)},
      nameLayout:{animating:Boolean(bits&4)},readyImageFrame:{animating:Boolean(bits&8)},browsingDrawRef:{current:(...args)=>calls.push(args)}});
    assert.deepEqual(calls,bits?[[true,bits*4]]:[]);
  }
  assert.equal(drawChanged.page.match(/draw\(false, 1\)/g)?.length,1);
  assert.match(drawChanged.page,/useReady\(\(\) => \{[^\n]+ draw\(\);/);
  assert.match(drawChanged.page,/useResize\(\(\) => \{[^\n]+ draw\(\);/);
  assert.equal(drawChanged.lifecycle.match(/r17Probe.drawReasonMerged\(frame, latest\)/g)?.length,1);
  assert.doesNotMatch(drawChanged.runtime,/syntheticDraw|setInterval/);
});

test('r19 real latest-frame owner unions coalesced reasons, keeps in-flight frames separate, inherits native clones, and marks replay unknown',()=>{
  const e=environment({drawReasons:true});e.probe.start('manual-input',1);
  const {createSkyCanvasLifecycle}=e.load(drawChanged.lifecycle,{'./r17-phone-probe-runtime':{r17Probe:e.probe},
    '../../services/runtime-error':{reportRuntimeError(){}}});
  const completions=[],painted=[];
  const writer=createSkyCanvasLifecycle({measure:done=>done({width:100,height:200}),createContext:()=>({}),
    resolveFrame(frame){const clone={...frame};e.probe.inheritFrame(clone,frame);return clone;},
    paint(_context,frame,_size,done){painted.push(frame);completions.push(done);},
    presented(frame){e.probe.accepted(frame,{objects:[]});},invalidated(){},failed(error){throw error;}},
    {schedule:e.context.setTimeout,cancel:e.context.clearTimeout});
  writer.ready();
  const state={at:atDay(1)},intent=e.probe.intent(state),token=e.probe.prepareStarted(intent);e.advance(1);e.probe.prepareFinished(token);
  const request=mask=>{const frame={frameAt:state.at};e.probe.request(frame,token,intent,mask);writer.request(frame,false,mask>=4);return frame;};
  request(1);request(8|16);e.advance(16);assert.equal(painted.length,1);
  request(2);request(4);completions.shift()();e.advance(0);assert.equal(painted.length,2);
  completions.shift()();request(8);e.advance(16);assert.equal(painted.length,3);completions.shift()();
  writer.resize();e.advance(0);assert.equal(painted.length,4);completions.shift()();
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true);
  assert.equal(v.schemaVersion,R19_DRAW_REASONS_SCHEMA);assert.equal(v.drawReasons.requests,5);assert.equal(v.drawReasons.paints,4);
  assert.deepEqual(v.drawReasons.entries.map(row=>row[1]),[25,6,8,10]);
  assert(v.drawReasons.entries.every(row=>row[2]===intent&&row[3]===token));
  assert.equal(v.drawReasons.mergedRequests,2);assert.equal(v.drawReasons.inheritedFrames,4);
  assert.equal(v.drawReasons.unknownFramePaints,0);assert.equal(v.drawReasons.requestMasks[1],1);
  assert.equal(v.drawReasons.paintMasks[25],1);assert.equal(v.linkage.syntheticPublications,0);
  writer.dispose();assert.equal(e.timers.size,0);
});

test('r19 keeps bounded weak identity and numeric paint ring; missing identity, replacement runs and stopped callbacks remain unknown or ignored',()=>{
  const e=environment({drawReasons:true});e.probe.start('manual-input',1);
  const first={};e.probe.request(first,null,null,1);
  for(let i=0;i<300;i++){
    const frame={private:'no frame retention or serialization'};e.probe.request(frame,null,null,i===0?-1:8);
    e.probe.paintStarted(frame);
  }
  e.probe.paintStarted(first);
  e.advance(1);const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true);
  assert.equal(v.drawReasons.entries.length,32);assert.equal(v.drawReasons.dropped,269);assert.equal(v.drawReasons.identityRotations,1);
  assert.equal(v.drawReasons.invalidReasons,1);assert.equal(v.drawReasons.unknownFramePaints,1);
  assert.equal(v.drawReasons.entries.at(-1)[1],2);assert.equal(v.drawReasons.requestMasks[2],1);
  assert.doesNotMatch(JSON.stringify(v),/private|no frame retention/);
  e.probe.paintStarted(first);e.probe.request({},null,null,1);assert.deepEqual(receipt(e.probe.snapshot()),v);
  e.probe.start('manual-input',1);e.probe.paintStarted(first);e.advance(1);
  const next=receipt(e.probe.snapshot());assert.equal(next.drawReasons.requests,0);assert.equal(next.drawReasons.unknownFramePaints,1);
  assert.equal(validateR17PhoneProbeMetrics(next),true);
});

test('r19 complete geometry receipt budgets the added reasons before trimming existing event exports and rejects invented data',async()=>{
  const e=environment({drawReasons:true});e.probe.start('manual-input',1);
  for(let i=0;i<100;i++){
    const at=atDay(i),intent=e.probe.intent({at}),response={};
    const request=e.probe.geometryRequest(at,at,intent);e.probe.geometryWatch(request,Promise.resolve(response));await tick();
    e.probe.geometryAdmitted(response,at,at,intent);
    const token=e.probe.prepareStarted(intent);e.advance(2);e.probe.prepareFinished(token);
    const frame={frameAt:at};e.probe.request(frame,token,intent,1);e.probe.prepared(frame);e.probe.paintStarted(frame);e.advance(1);e.probe.accepted(frame,{objects:[]});
  }
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true,`bytes=${Buffer.byteLength(JSON.stringify(v))}`);
  assert(Buffer.byteLength(JSON.stringify(v))<=32768);assert.equal(v.drawReasons.metricsSchema,R17_GEOMETRY_INPUT_SCHEMA);
  assert.equal(v.drawReasons.entries.length,32);assert.equal(v.geometryStages.dropped,v.geometryStages.observed-128);
  for(const mutate of [v=>v.drawReasons.rawFrame={},v=>v.drawReasons.metricsSchema=R19_DRAW_REASONS_SCHEMA,
    v=>v.drawReasons.requests++,v=>v.drawReasons.paintMasks[1]++,v=>v.drawReasons.entries[0][1]=0,
    v=>v.drawReasons.entries[0][2]='private',v=>v.drawReasons.entries[0].push('private'),v=>v.drawReasons.dropped++,
    v=>v.schemaVersion=R17_GEOMETRY_INPUT_SCHEMA]){
    const bad=receipt(v);mutate(bad);assert.equal(validateR17PhoneProbeMetrics(bad),false);
  }
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r19-reason-collector-'));
  try{
    const collector=createR17PhoneProbeCollector(directory);assert.equal(await collector.store(v),200);assert.equal(await collector.store(v),200);
    const conflicting=receipt(v);conflicting.drawReasons.invalidReasons++;assert.equal(await collector.store(conflicting),409);
    assert.equal(matchR17PhoneProbeTerminal(v,{}),false);
  }finally{
    const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());
    assert(path.basename(resolved).startsWith('starward-r19-reason-collector-'));await fs.rm(resolved,{recursive:true});
  }
});

test('r19 keeps complete normal Play, original 15s export, 60s same-run Pause and compatible terminal retries',async()=>{
  const retirementObserved=addR17RulerEntryV2({runtime:correlated.runtime,controls:normalControls(original.controls,'a'.repeat(64),true),
    page:normalPage(original.page),layout:original.layout,nativePosition:original.nativePosition});
  const files=drawFiles();files.set('r17-phone-probe-controls.tsx',addR17NormalInput(retirementObserved).controls);
  const result=await verifyNormalBaselineV3Fixture({productionRoot:root,feature,ts,buildGeneration:25,
    protocolPath:path.join(here,'r17-normal-input-protocol.mjs'),allowACorrelation:true,allowRulerEntry:true,retirementObservation:true,
    readPreparedSource:async name=>files.get(name)??(name==='sky-canvas-surface.ts'
      ? (await import('./build-r17-normal-baseline-v3.mjs')).normalSurface(await production(name),true).source : production(name))});
  assert(Object.values(result).every(value=>value===true));
});

function costFiles() {
  const files=drawFiles();files.set('r17-phone-probe-runtime.ts',costChanged.runtime);
  for(const [name,source] of [['sky-scene-render.ts',costChanged.scene],['sky-gpu-renderer.ts',costChanged.renderer]])
    files.set(name,'import { r17Probe } from "./r17-phone-probe-runtime";\n'+source);
  return files;
}
const costGroup = (value,kind) => value.drawCosts.groups.find(group=>group.kind===kind);
function costPaint(e,reason,work) {
  const frame={frameAt:atDay(1)};e.probe.request(frame,null,null,reason);e.probe.prepared(frame);e.probe.paintStarted(frame);
  return e.probe.measure('nativePaintOwner',()=>e.probe.measure('draw',work));
}
test('r20 actual traversal and submit additions strictly typecheck against current production consumers',()=>{
  const file=path.join(root,'apps/wechat-miniapp/tsconfig.json'),config=ts.readConfigFile(file,ts.sys.readFile);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(file));
  const map=new Map([...costFiles()].map(([name,source])=>[path.join(root,feature,name).replaceAll('\\','/'),source]));
  const options={...parsed.options,noEmit:true},host=ts.createCompilerHost(options),readFile=host.readFile,exists=host.fileExists;
  host.readFile=file=>map.get(file.replaceAll('\\','/'))??readFile(file);host.fileExists=file=>map.has(file.replaceAll('\\','/'))||exists(file);
  const program=ts.createProgram([...new Set([...parsed.fileNames,...map.keys()])],options,host),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:v=>v,getNewLine:()=>'\n'}));
  assert.doesNotMatch(costChanged.runtime,/syntheticDraw|setInterval/);
  assert.equal((costChanged.scene.match(/actualDrawCost\("starTraversal"/g)??[]).length,2);
  assert.equal((costChanged.renderer.match(/actualDrawCost\("rendererSubmit"/g)??[]).length,1);
});

function starBlock(source) {
  const start=source.indexOf('  const catalog = data.skyScene.state'),end=source.indexOf('  const solarDisc=skySunDiscAt',start);
  assert(start>0&&end>start);return source.slice(start,end);
}
function submitExpression(source) {
  const ast=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);let result;
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='submit')result=node.initializer.getText(ast);ts.forEachChild(node,visit);};
  visit(ast);assert(result);return result;
}
test('r20 executes real BSC/SAO traversal and submit bodies without changing points, typed uploads, order or thrown error',()=>{
  const e=environment({drawCosts:true});e.probe.start('manual-input',1);
  function execute(source,projected,probe) {
    const calls=[],paintedObjects=[],failure=new Error('actual projection failure');
    const entries=[{objectRef:'HR:1',displayName:'named',magnitude:1},{objectRef:'HR:2',magnitude:2}];
    const points=[[0,1,2],[1,3,4]],extra=[['SAO:3',2,5,6]];
    const projectedCall=(rows,callback)=>{e.advance(2);rows.forEach((point,index)=>callback(index,point,{x:point.at(-2),y:point.at(-1)}));};
    const frame={state:'AVAILABLE',points,...(projected?{forEachProjected(_p,_m,callback){projectedCall(points,callback);}}:{})};
    const supplement={points:extra,catalogVersion:'v',publicationHash:'h',...(projected?{forEachProjected(_p,_m,callback){projectedCall(extra,callback);}}:{})};
    const scope={data:{skyScene:{state:'AVAILABLE',catalog:{entries}}},frameAt:'at',supplement,
      resolveSkySceneFrame:()=>frame,currentStellarSupplement:()=>supplement,createSkyStarAppearance:()=>()=>({radiusPx:1,opacity:.8}),
      skyStarMagnitudeLimit:()=>5,skyStarDisplayColor:()=> 'white',verticalFovDeg:264,mode:'DAY',sun:{altitudeDeg:-20},
      palette:{text:'white',target:'red'},paintedObjects,starTransitions:{layer:()=>({point:star=>star,exits:()=>[]})},
      starDrawing:undefined,projector:projected?{}:null,project:(x,y)=>({x,y}),r17Probe:probe,
      context:{disc(...args){calls.push(args);if(calls.length===1)probe.actualDrawCost('rendererSubmit',()=>e.advance(3));}},failure};
    const result=vm.runInNewContext('(function(){'+compile(starBlock(source)+';exports.result={paintedObjects,namedStars};')+'return exports.result;})()', {...scope,exports:{}});
    return {result:receipt(result),calls:receipt(calls)};
  }
  const unobserved={actualDrawCost:(_stage,work)=>work()};
  for(const projected of [true,false]) {
    const before=execute(originalDrawScene,projected,unobserved);
    const after=costPaint(e,projected?1:8,()=>execute(costChanged.scene,projected,e.probe));
    assert.deepEqual(after,before);assert.equal(after.result.paintedObjects.length,3);assert.equal(after.result.namedStars.length,1);
  }
  function runSubmit(source,probe,fail=false) {
    const calls=[],error=new Error('buffer upload failed'),quad=[1,2,3,4],buffer={attribs:{position:{buffer:{}}}};
    const scope={r17Probe:probe,maxAttributes:1,quad,uploadedQuads:new Map(),width:10,height:20,pixelRatio:2,maxPointSize:32,pointDisplayTuning:1,
      groupDrawing:false,contributions:{hasPending:()=>false,invalidate(){calls.push('invalidate');}},
      gl:{ARRAY_BUFFER:1,DYNAMIC_DRAW:2,NO_ERROR:0,disableVertexAttribArray(){calls.push('disable');},bindBuffer(){calls.push('bind');},
        bufferData(_target,values){calls.push(['upload',[...values]]);e.advance(2);if(fail)throw error;},getError:()=>0,useProgram(){calls.push('program');}},
      setBuffersAndAttributes(){calls.push('attributes');},setUniforms(){calls.push('uniforms');},drawBufferInfo(){calls.push('draw');},
      reportRuntimeError(...args){calls.push(['error',args[0],args[1],args[2]===error]);}};
    const submit=vm.runInNewContext('(function(){'+compile('const submit='+submitExpression(source)+';exports.submit=submit;')+'return exports.submit;})()', {...scope,exports:{}});
    let thrown;try {submit({program:{}},buffer,quad,2,3);if(!fail)submit({program:{}},buffer,quad,2,3);}catch(value){thrown=value;}
    return {calls:receipt(calls),elements:buffer.numElements,threw:thrown===error};
  }
  for(const fail of [false,true]) {
    const before=runSubmit(originalRenderer,unobserved,fail);
    const after=costPaint(e,16,()=>runSubmit(costChanged.renderer,e.probe,fail));assert.deepEqual(after,before);
  }
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true);
  const effect=costGroup(v,'inputResourceEffect'),continuation=costGroup(v,'continuationOnly');
  assert.equal(effect.stages.starTraversal.observedCalls,2);assert.equal(effect.stages.starTraversal.knownSubtotalMs,7);
  assert.equal(effect.stages.rendererSubmit.knownSubtotalMs,3); // nested in the first traversal, not additive
  assert.equal(effect.stages.draw.knownSubtotalMs,7);
  assert.equal(continuation.stages.rendererSubmit.threwCalls,1);assert.equal(continuation.stages.rendererSubmit.unknown.belowResolution,1);
});

test('r21 unchanged preparation hits still measure actual lookup, transition replay, painting and same-time exits',async()=>{
  const e=environment({drawCosts:true});e.probe.start('manual-input',1);
  const preparationSource=await production('sky-star-draw-preparation.ts');
  function runner(source,probe) {
    const builds={catalog:0,supplement:0},points=[[0,1,2],[1,3,4]],extra=[['SAO:3',2,5,6]];
    let phase=0,commands=[],fail=false;
    const failure=new Error('original star preparation failure');
    const projectRows=(name,rows,visit)=>{
      builds[name]++;e.advance(2);if(fail)throw failure;
      rows.forEach((point,index)=>visit(index,point,{x:point.at(-2),y:point.at(-1)}));
    };
    const frame={state:'AVAILABLE',forEachProjected:(_p,_m,visit)=>projectRows('catalog',points,visit)};
    const supplement={catalogVersion:'v',publicationHash:'h',forEachProjected:(_p,_m,visit)=>projectRows('supplement',extra,visit)};
    // The recorder test controls admission only; the production owner's tests
    // exercise actual frozen publication admission. Lookup/collection/replay
    // below is the unmodified current production implementation.
    const drawing=e.load(preparationSource,{
      './sky-stellar-scene':{isReusableSkyStellarFrame:value=>value===frame},
      './sky-stellar-supplement-scene':{isReusableSkyStellarSupplementFrame:value=>value===supplement},
      './sky-view-projection':{validBasis:()=>true},
    }).createSkyStarDrawPreparation();
    for(const name of ['prepare','catalog','supplement']) {
      const original=drawing[name];drawing[name]=(...args)=>{e.advance(1);return original(...args);};
    }
    const context={disc(...args){commands.push(args);e.advance(1);
      if(commands.length===1)probe.actualDrawCost('rendererSubmit',()=>e.advance(3));}};
    const catalog={entries:[{objectRef:'HR:1',displayName:'named',magnitude:1},{objectRef:'HR:2',magnitude:2}]};
    const scope={data:{context:{},skyScene:{state:'AVAILABLE',catalog}},frameAt:'at',supplement,
      resolveSkySceneFrame:()=>frame,currentStellarSupplement:()=>supplement,
      createSkyStarAppearance:()=>()=>({radiusPx:1,opacity:.8}),skyStarMagnitudeLimit:()=>5,skyStarDisplayColor:()=> 'white',
      verticalFovDeg:264,mode:'NIGHT',sun:{altitudeDeg:-20},palette:{text:'white',target:'red'},
      basis:{right:[1,0,0],up:[0,1,0],forward:[0,0,1]},width:100,height:200,center:undefined,
      context,starDrawing:drawing,projector:{},r17Probe:probe,paintedObjects:[],
      project:(x,y)=>{e.advance(1);return {x,y};},
      starTransitions:{layer:name=>({point(star){e.advance(1);return {...star,opacity:.4+phase*.1};},
        exits(){e.advance(1);return [{reference:name+'-exit',azimuthDeg:7,altitudeDeg:8,radiusPx:1,color:'white',opacity:.3}];}})}};
    const body=compile(starBlock(source)+';exports.result={paintedObjects,namedStars};');
    return {builds,failure,fail(){fail=true;scope.frameAt='new-at';},paint(nextPhase){
      phase=nextPhase;commands=[];scope.paintedObjects=[];
      const result=vm.runInNewContext('(function(){'+body+'return exports.result;})()', {...scope,exports:{}});
      return receipt({commands,...result});
    }};
  }
  const baseline=runner(originalDrawScene,{actualDrawCost:(_stage,work)=>work()}),observed=runner(costChanged.scene,e.probe);
  for(const phase of [0,1,2]) {
    const before=baseline.paint(phase),after=costPaint(e,phase?8:1,()=>observed.paint(phase));
    assert.deepEqual(after,before);assert.equal(after.commands.length,5);
    assert.equal(after.paintedObjects.length,3);assert.equal(after.namedStars.length,1);
    assert.equal(after.commands[0][4],.4+phase*.1,'cached preparation must still apply the current transition');
  }
  assert.deepEqual(observed.builds,{catalog:1,supplement:1});
  const receiptBeforeFailure=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(receiptBeforeFailure),true);
  const effect=costGroup(receiptBeforeFailure,'inputResourceEffect').stages;
  const continuation=costGroup(receiptBeforeFailure,'continuationOnly').stages;
  assert.equal(effect.starTraversal.observedCalls,2);assert.equal(effect.starTraversal.knownSubtotalMs,21);
  assert.equal(continuation.starTraversal.observedCalls,4);assert.equal(continuation.starTraversal.knownSubtotalMs,34);
  assert.equal(effect.draw.knownSubtotalMs,22);assert.equal(continuation.draw.knownSubtotalMs,36);
  assert.equal(continuation.rendererSubmit.knownSubtotalMs,6);
  // The common exact-view prepare remains outside the two old traversal
  // spans, but inside draw. Its one synthetic ms is not silently excluded
  // from draw or relabelled as renderer cost.
  e.probe.start('manual-input',1);
  baseline.fail();observed.fail();
  assert.throws(()=>baseline.paint(3),error=>error===baseline.failure);
  assert.throws(()=>costPaint(e,1,()=>observed.paint(3)),error=>error===observed.failure);
  const final=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(final),true);
  assert.equal(costGroup(final,'inputResourceEffect').stages.starTraversal.threwCalls,1);
});

test('r20 actual writer scopes coalesced paint reasons and keeps deferred work unbound',()=>{
  const e=environment({drawCosts:true});e.probe.start('manual-input',1);
  const {createSkyCanvasLifecycle}=e.load(drawChanged.lifecycle,{'./r17-phone-probe-runtime':{r17Probe:e.probe},'../../services/runtime-error':{reportRuntimeError(){}}});
  const completions=[];
  const writer=createSkyCanvasLifecycle({measure:done=>done({width:100,height:200}),createContext:()=>({}),
    resolveFrame(frame){const clone={...frame};e.probe.inheritFrame(clone,frame);return clone;},
    paint(_c,_f,_s,done){e.probe.measure('draw',()=>e.probe.actualDrawCost('starTraversal',()=>{e.advance(2);e.probe.actualDrawCost('rendererSubmit',()=>e.advance(3));}));completions.push(done);},
    presented(){},invalidated(){},failed(error){throw error;}},{schedule:e.context.setTimeout,cancel:e.context.clearTimeout});
  writer.ready();
  const request=mask=>{const frame={frameAt:atDay(1)};e.probe.request(frame,null,null,mask);writer.request(frame,false,mask>=4);};
  request(1);request(8);e.advance(16);request(16);completions.shift()();e.advance(16);completions.shift()();
  // A later native callback is not charged to the last paint just because its
  // timestamp follows it. The scoped synchronous port.paint call has returned.
  e.probe.actualDrawCost('rendererSubmit',()=>e.advance(4));
  request(2);e.advance(0);completions.shift()();writer.dispose();
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true);
  assert.deepEqual(v.drawReasons.entries.map(row=>row[1]),[9,16,2]);
  assert.deepEqual(v.drawCosts.groups.map(group=>group.paints),[1,1,1]);
  assert(v.drawCosts.groups.every(group=>group.stages.draw.knownSubtotalMs===5&&group.stages.starTraversal.knownSubtotalMs===5&&group.stages.rendererSubmit.knownSubtotalMs===3));
  assert.equal(v.drawCosts.unbound.rendererSubmit.knownSubtotalMs,4);assert.equal(e.timers.size,0);
});

test('r20 keeps clock discontinuity and sub-resolution unknown, original throws, and stopped/new-run spans out of receipts',()=>{
  const e=environment({drawCosts:true});e.probe.start('manual-input',1);const error=new Error('original');
  costPaint(e,1,()=>{
    e.probe.actualDrawCost('starTraversal',()=>{});
    e.probe.actualDrawCost('starTraversal',()=>e.jump(-10));
    assert.throws(()=>e.probe.actualDrawCost('rendererSubmit',()=>{e.advance(2);throw error;}),value=>value===error);
  });
  e.probe.actualDrawCost('rendererSubmit',()=>e.advance(1));
  const first=receipt(e.probe.snapshot()),cost=costGroup(first,'inputResourceEffect').stages;
  assert.equal(validateR17PhoneProbeMetrics(first),true);assert.equal(cost.starTraversal.unknown.belowResolution,1);
  assert.equal(cost.starTraversal.unknown.clockDiscontinuity,1);assert.equal(cost.draw.unknown.clockDiscontinuity,1);
  assert.equal(cost.rendererSubmit.threwCalls,1);assert.equal(cost.rendererSubmit.knownSubtotalMs,2);
  e.probe.actualDrawCost('rendererSubmit',()=>e.advance(5));assert.deepEqual(receipt(e.probe.snapshot()),first);
  e.probe.start('manual-input',1);
  e.probe.actualDrawCost('starTraversal',()=>{e.probe.start('manual-input',1);e.advance(5);});
  e.probe.actualDrawCost('rendererSubmit',()=>e.unavailable());
  const next=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(next),true);
  assert.equal(next.drawCosts.unbound.starTraversal.observedCalls,0);assert.equal(next.drawCosts.unbound.rendererSubmit.unknown.clockUnavailable,1);
});

test('r20 records no pre-arm work during the original normal-Play start delay',()=>{
  const e=environment({drawCosts:true});e.probe.start('wide-play');
  e.probe.actualDrawCost('starTraversal',()=>e.advance(2));e.probe.actualDrawCost('rendererSubmit',()=>e.advance(3));
  e.advance(1000);costPaint(e,8,()=>e.probe.actualDrawCost('starTraversal',()=>e.advance(2)));
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true);
  assert.equal(v.drawCosts.unbound.starTraversal.observedCalls,0);assert.equal(v.drawCosts.unbound.rendererSubmit.observedCalls,0);
  assert.equal(costGroup(v,'continuationOnly').stages.starTraversal.observedCalls,1);
});

test('r20 complete receipt remains bounded, rejects invented spans and uses unchanged collector idempotency',async()=>{
  const e=environment({drawCosts:true});e.probe.start('manual-input',1);
  for(let i=0;i<100;i++) {
    const at=atDay(i),intent=e.probe.intent({at}),response={};
    const request=e.probe.geometryRequest(at,at,intent);e.probe.geometryWatch(request,Promise.resolve(response));await tick();
    e.probe.geometryAdmitted(response,at,at,intent);
    costPaint(e,i%2?1:8,()=>e.probe.actualDrawCost('starTraversal',()=>{e.advance(2);e.probe.actualDrawCost('rendererSubmit',()=>e.advance(1));}));
  }
  const v=receipt(e.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(v),true,`bytes=${Buffer.byteLength(JSON.stringify(v))}`);
  assert.equal(v.schemaVersion,R20_DRAW_COSTS_SCHEMA);assert(Buffer.byteLength(JSON.stringify(v))<=32768);
  assert.equal(v.drawCosts.scopedPaints,100);assert.equal(v.drawReasons.entries.length,32);assert.equal(matchR17PhoneProbeTerminal(v,{}),false);
  for(const mutate of [v=>v.drawCosts.rawFrame={},v=>v.drawCosts.metricsSchema=R20_DRAW_COSTS_SCHEMA,
    v=>v.drawCosts.groups[0].paints++,v=>v.drawCosts.groups[0].stages.draw.unknownCalls++,
    v=>v.drawCosts.groups[0].stages.draw.knownSubtotalMs=0,v=>v.drawCosts.groups[0].stages.draw.maxMs=0,
    v=>v.drawCosts.nesting='add',v=>v.schemaVersion=R19_DRAW_REASONS_SCHEMA]) {
    const bad=receipt(v);mutate(bad);assert.equal(validateR17PhoneProbeMetrics(bad),false);
  }
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r20-cost-collector-'));
  try {
    const collector=createR17PhoneProbeCollector(directory);assert.equal(await collector.store(v),200);assert.equal(await collector.store(v),200);
    const conflict=receipt(v);conflict.drawCosts.scopeChangedSpans++;assert.equal(await collector.store(conflict),409);
  } finally {
    const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());
    assert(path.basename(resolved).startsWith('starward-r20-cost-collector-'));await fs.rm(resolved,{recursive:true});
  }
});

function populateNormalPlayback(e, count = 400) {
  e.probe.scalars('tm',{nativeGlyphCalls:17,lifetimeNativeGlyphCalls:2400,observationResets:3,available:true,retired:false});
  e.probe.scalars('page',{available:1,submitted:120,completed:120,pending:0,maxPending:2,enableDebug:false});
  e.probe.scalars('scene',{nativeCopies:0,readyNativeCopies:0,syntheticBegins:0,syntheticFinishes:0,syntheticPublications:0,frozen:false,retired:false});
  const tokens=[];
  for(let i=0;i<count;i++) {
    const at=new Date(Date.UTC(2026,9,20,12,30)+i*72000).toISOString();
    const intent=e.probe.intent({at}),token=e.probe.prepareStarted(intent,'presentation',12345),frame={frameAt:at};tokens.push(token);
    e.probe.measure('presentation',()=>e.advance(1));e.probe.prepareFinished(token);e.advance(1);
    e.probe.pageState(120+i,120+i,0,1);e.probe.request(frame,token,intent,i%3===0?8:1);e.probe.prepared(frame);e.advance(1);
    e.probe.paintStarted(frame);
    e.probe.measure('nativePaintOwner',()=>e.probe.measure('draw',()=>{
      e.probe.actualDrawCost('starTraversal',()=>{e.advance(2);e.probe.actualDrawCost('rendererSubmit',()=>e.advance(i%2));});
      e.probe.actualDrawCost('starTraversal',()=>e.probe.actualDrawCost('rendererSubmit',()=>e.advance(1)));
    }));
    e.probe.sceneFinished({skyScene:{catalog:{catalogVersion:'bsc5.0-starward-2026-10'}},observationFrames:[{at,modelAlgorithmVersion:'sky-geometry-v2'}]},
      at,{pointCount:9110},{pointCount:6265,publicationHash:'b'.repeat(64)},360,792,264.355,'NIGHT',6000,4000);
    e.probe.callback(frame);e.probe.accepted(frame,{objects:[{reference:'HR:1'},{reference:'SAO:2'}]});e.advance(26);
  }
  e.probe.scalars('tm',{nativeGlyphCalls:2400,lifetimeNativeGlyphCalls:4783,observationResets:3,available:true,retired:false});
  e.probe.scalars('page',{available:1,submitted:520,completed:519,pending:1,maxPending:2,enableDebug:false});
  e.probe.scalars('scene',{nativeCopies:count,readyNativeCopies:count,syntheticBegins:0,syntheticFinishes:0,syntheticPublications:0,frozen:false,retired:false});
  return tokens;
}

test('r21 normal Play with populated preparation, accepted and Page links fits the real UTF-8 writer budget',t=>{
  const e=environment({drawCosts:true});e.probe.start('wide-play');e.probe.control('actualPlay',true);e.advance(1000);
  const tokens=populateNormalPlayback(e);e.probe.control('export');
  const value=receipt(e.probe.snapshot()),bytes=Buffer.byteLength(JSON.stringify(value),'utf8');
  assert(bytes<=32768,JSON.stringify({bytes,parts:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,Buffer.byteLength(JSON.stringify(v),'utf8')]))}));
  assert.equal(validateR17PhoneProbeMetrics(value),true);
  assert.equal(value.linkage.preparationsFinished,400);assert.equal(value.linkage.firstAcceptedIntents,400);
  assert.equal(value.linkage.consumedPreparations,400);assert.equal(value.aCorrelation.retainedPreparations,400);
  assert.equal(value.drawCosts.scopedPaints,400);assert.equal(value.drawCosts.groups[0].stages.rendererSubmit.unknown.belowResolution,133);
  const selected=value.linkage.links.map(row=>row.prepareToken);
  assert(selected.length<32);assert.deepEqual(selected.slice(0,4),tokens.slice(0,4));assert.deepEqual(selected.slice(-4),tokens.slice(-4));
  assert.deepEqual(value.aCorrelation.links.map(row=>row.prepareToken),[...tokens.slice(0,4),...tokens.slice(-4)]);
  assert.equal(value.linkage.linkSampleTruncated,true);
  const before=environment({drawCosts:true,unboundedReceipt:true});before.probe.start('wide-play');before.probe.control('actualPlay',true);before.advance(1000);
  populateNormalPlayback(before);before.probe.control('export');const raw=receipt(before.probe.snapshot());raw.runId=value.runId;
  const rawBytes=Buffer.byteLength(JSON.stringify(raw),'utf8');assert(rawBytes>32768);assert.equal(raw.linkage.links.length,32);
  const expected=receipt(raw);expected.linkage.links=value.linkage.links;expected.linkage.linkSampleTruncated=true;
  assert.deepEqual(value,expected,'only the exported middle linkage sample may differ; full counts, unknowns and A rows are unchanged');
  t.diagnostic(JSON.stringify({beforeUtf8Bytes:rawBytes,afterUtf8Bytes:bytes,linkSamplesBefore:32,linkSamplesAfter:selected.length,
    retainedPreparations:value.linkage.retainedPreparations,aCorrelationSamples:value.aCorrelation.links.length}));
  e.advance(1000);assert.equal(JSON.stringify(e.probe.snapshot()),JSON.stringify(value));
});

test('r21 populated normal Play exports at 15s and preserves byte-identical retries plus the guarded 60s terminal',async()=>{
  const e=controlEnvironment({drawCosts:true,retirement:true}),paused=[];
  e.controls.useR17NormalStop(at=>{paused.push(at);return true;});
  e.controls.fixture.startDiagnostic('wide-play');assert.equal(e.timers.size,0);
  assert.equal(e.controls.r17NormalProductPlayStarted(atDay(0)),true);e.advance(1000);populateNormalPlayback(e);
  e.advance(14999-e.elapsed());assert.equal(e.requests.length,0);e.advance(1);assert.equal(e.requests.length,1);
  const first=e.requests[0].options.data,metrics=JSON.parse(first);
  assert(Buffer.byteLength(first,'utf8')<=32768);assert.equal(validateR17PhoneProbeMetrics(metrics),true);
  assert.equal(metrics.window.elapsedMs,14000);assert.equal(metrics.controls.events.export.firstRelativeMs,15000);
  assert.equal(metrics.linkage.firstAcceptedIntents,400);assert.equal(metrics.drawCosts.scopedPaints,400);
  e.requests[0].resolve({statusCode:503,data:{stored:false}});await tick();
  e.advance(59999-e.elapsed());assert.equal(paused.length,0);e.advance(1);assert.deepEqual(paused,[atDay(0)]);
  assert.equal(e.requests.length,1);assert.match(e.controls.fixture.status(),/回执待metrics/);
  void e.controls.fixture.exportDiagnostic();assert.equal(e.requests[1].options.data,first);
  e.requests[1].resolve({statusCode:200,data:{stored:true}});await tick();assert.equal(e.requests.length,3);
  const terminal=e.requests[2].options.data;assert.equal(matchR17PhoneProbeTerminal(metrics,JSON.parse(terminal)),true);
  e.requests[2].resolve({statusCode:424,data:{stored:false}});await tick();
  void e.controls.fixture.exportDiagnostic();assert.equal(e.requests[3].options.data,first);
  e.requests[3].resolve({statusCode:200,data:{stored:true}});await tick();assert.equal(e.requests[4].options.data,terminal);
  e.requests[4].resolve({statusCode:200,data:{stored:true}});await tick();
  assert.equal(JSON.stringify(e.probe.snapshot()),first);assert.equal(paused.length,1);assert.equal(e.timers.size,0);e.unmount();
});

test('r21 receipt budgeting preserves historical bytes, all aggregate facts and first/last association under manual geometry load',async()=>{
  const e=environment({drawCosts:true});e.probe.start('manual-input',1);
  for(let i=0;i<32;i++) {
    const at=atDay(i),intent=e.probe.intent({at}),response={};
    const token=e.probe.geometryRequest(at,at,intent);e.probe.geometryWatch(token,Promise.resolve(response));await tick();
    e.probe.geometryAdmitted(response,at,at,intent);
  }
  const tokens=populateNormalPlayback(e),value=receipt(e.probe.snapshot());
  assert.equal(validateR17PhoneProbeMetrics(value),true);assert(Buffer.byteLength(JSON.stringify(value),'utf8')<=32768);
  assert.equal(value.geometryStages.requests,32);assert.equal(value.geometryStages.entries.length+value.geometryStages.exportOmitted,128);
  assert.equal(value.linkage.consumedPreparations,400);assert.equal(value.linkage.latency.intentToFirstAcceptedMs.validCalls,400);
  assert.equal(value.aCorrelation.preparationToRequest.validCalls,400);assert.equal(value.aCorrelation.requestToPaint.validCalls,400);
  assert.deepEqual(value.aCorrelation.links.map(row=>row.prepareToken),[...tokens.slice(0,4),...tokens.slice(-4)]);
  const small=environment({legacy:true});small.probe.start('wide-play');small.advance(1000);
  const original=small.probe.snapshot(),before=JSON.stringify(original),bound=e.entryModule.r17ProbeBoundedReceipt(original);
  assert.equal(bound,original);assert.equal(JSON.stringify(bound),before);assert.equal(previous(bound),true);
  const unknown=receipt(value);unknown.aCorrelation.links[0].prepareToken++;assert.equal(validateR17PhoneProbeMetrics(unknown),false);
});

test('r21 writer measures UTF-8 bytes and refuses an oversized fixed part without fabricating empty success',async()=>{
  const e=controlEnvironment({drawCosts:true});
  for(const text of ['ASCII','中文','😀','\ud800','中😀A']) assert.equal(e.entryModule.r17ProbePayloadBytes(text),Buffer.byteLength(text,'utf8'));
  e.controls.fixture.startDiagnostic('wide-play');e.controls.r17NormalProductPlayStarted(atDay(0));e.advance(1000);
  const original=e.probe.snapshot(),oversized={...original,untrusted:'中'.repeat(12000)};
  assert(JSON.stringify(oversized).length<32768);assert(Buffer.byteLength(JSON.stringify(oversized),'utf8')>32768);
  assert.equal(e.entryModule.r17ProbeBoundedReceipt(oversized),oversized);
  e.probe.snapshot=()=>oversized;void e.controls.fixture.exportDiagnostic();await tick();
  assert.equal(e.requests.length,0);assert.match(e.controls.fixture.status(),/数据超过上限/);e.unmount();
});

test('r21 large fixed metadata retains eight links when possible and refuses an irreducible header without losing facts',t=>{
  const e=environment({drawCosts:true,unboundedReceipt:true});e.probe.start('wide-play');e.advance(1000);populateNormalPlayback(e);
  const value=receipt(e.probe.snapshot()),max=1e12;
  for(const key of ['catalogVersions','saoPublicationHashes','modelAlgorithms','modes'])
    value.scene[key]=Array.from({length:8},(_,i)=>String(i)+'a'.repeat(159));
  for(const key of ['baseRowsMin','baseRowsMax','saoRowsMin','saoRowsMax','selectedTilesMin','selectedTilesMax']) value.scene[key]=max;
  for(const facts of Object.values(value.observations)) {
    facts.captures=max;
    for(const key of ['first','last']) {
      facts[key]??={relativeMs:60000,values:{}};
      if(Object.keys(facts[key].values).length===0) { facts.captures=0;facts.first=facts.last=null;break; }
      facts[key].relativeMs=60000;
      for(const [name,item] of Object.entries(facts[key].values))
        facts[key].values[name]=['retired','available','enableDebug','frozen'].includes(name)&&typeof item==='boolean'?false:
          ['retired','enableDebug','frozen'].includes(name)?false:max;
    }
  }
  for(const row of value.linkage.links) {
    row.prepareToken=max-32+value.linkage.links.indexOf(row);row.intentSequence=row.prepareToken;row.scopeGeneration=max;row.resourceRevision=max;
    for(const key of ['startedRelativeMs','finishedRelativeMs','firstConsumedRelativeMs','firstAcceptedRelativeMs','intentRelativeMs','intentFirstAcceptedRelativeMs']) row[key]=60000;
    for(const key of ['requests','paintAttempts','syntheticPublications','duplicatePresents']) row[key]=max;
    row.elapsedMs=null;row.elapsedStatus='clockDiscontinuity';
  }
  const selected=[...value.linkage.links.slice(0,4),...value.linkage.links.slice(-4)];
  value.aCorrelation.links.forEach((row,i)=>{row.prepareToken=selected[i].prepareToken;row.firstRequestRelativeMs=60000;
    row.pageAtPreparationFinish=row.pageAtRequest=row.pageAtPaint=[max,max,max];});
  const largeMetadata=e.entryModule.r17ProbeBoundedReceipt(receipt(value));
  assert.equal(validateR17PhoneProbeMetrics(largeMetadata),true);assert(largeMetadata.linkage.links.length>=8);
  // Saturated legal aggregates/unknown reasons are independent of the small
  // first/last sample. The fixed-size budget must not depend on short counts.
  const aggregate=total=>({observedCalls:total,validCalls:total/2,unknownCalls:total/2,
    unknown:{belowResolution:total/10,clockUnavailable:total/10,clockDiscontinuity:total/10,outOfRange:total/10,notObserved:total/10},
    knownSubtotalMs:max,minMs:1,maxMs:60000,keptSamples:2048,p50Ms:55555,p95Ms:60000,overflow:true});
  for(const name of ['stageElapsed','timing']) for(const key of Object.keys(value[name])) value[name][key]=aggregate(max);
  for(const key of Object.keys(value.counters)) value.counters[key]=max;
  for(const key of Object.keys(value.linkage.latency)) value.linkage.latency[key]=aggregate(max);
  value.linkage.firstAcceptedIntents=max;value.linkage.latencyUnknownIntents=max/2;
  value.linkage.requests=max;
  const weights=[400000000000,300000000000,300000000000];
  for(const name of ['requestMasks','paintMasks']) {value.drawReasons[name].fill(0);[1,8,2].forEach((mask,i)=>value.drawReasons[name][mask]=weights[i]);}
  value.drawReasons.requests=value.drawReasons.paints=max;value.drawReasons.dropped=max-32;
  value.drawReasons.entries.forEach((row,i)=>{row[0]=max-31+i;});
  const stageCost=total=>{const {minMs,keptSamples,p50Ms,p95Ms,overflow,...cost}=aggregate(total);return {...cost,threwCalls:total};};
  value.drawCosts.scopedPaints=max;
  value.drawCosts.groups.forEach((group,i)=>{group.paints=weights[i];for(const key of Object.keys(group.stages)) group.stages[key]=stageCost(weights[i]);});
  for(const key of Object.keys(value.drawCosts.unbound)) value.drawCosts.unbound[key]=stageCost(max);
  value.clock.reads=max;value.clock.invalidReads=value.clock.backwardReads=max/2;value.clock.availability='partial';
  for(const control of Object.values(value.controls.events)) {control.calls=max;control.firstRelativeMs=control.lastRelativeMs=60000;control.lastResult=false;}
  value.controls.sealRelativeMs=60000;
  for(const key of ['intent','prepared','painted','accepted']) {Object.assign(value.time[key],{events:max,distinct:2048,
    firstRelativeMs:-max,lastRelativeMs:max,minRelativeMs:-max,maxRelativeMs:max,overflow:true});}
  value.time.lastRequestedMinusAcceptedMs=value.time.maximumRequestedMinusAcceptedMs=max;
  const raw=receipt(value),bounded=e.entryModule.r17ProbeBoundedReceipt(value),bytes=Buffer.byteLength(JSON.stringify(bounded),'utf8');
  assert(bytes>32768,'the contract can represent a fixed header that alone exceeds the writer budget');
  assert.equal(validateR17PhoneProbeMetrics(bounded),false);assert.equal(bounded.linkage.links.length,8);
  assert.deepEqual(bounded.aCorrelation,raw.aCorrelation);
  const expected=receipt(raw);expected.linkage.links=receipt(bounded.linkage.links);expected.linkage.linkSampleTruncated=true;
  assert.deepEqual(receipt(bounded),expected);
  // Isolate budget from schema validity: product draw modes are DAY/NIGHT,
  // while the historical generic contract admits eight arbitrary public IDs.
  const productModes=receipt(bounded);productModes.scene.modes=['DAY','NIGHT'];
  assert.equal(validateR17PhoneProbeMetrics(productModes),true,'the other maximal fields satisfy the unchanged contract');
  t.diagnostic(JSON.stringify({largeMetadataUtf8Bytes:Buffer.byteLength(JSON.stringify(largeMetadata),'utf8'),largeMetadataLinks:largeMetadata.linkage.links.length,
    genericContractMinimumUtf8Bytes:bytes,irreducibleLinks:bounded.linkage.links.length,
    productModeHeaderUtf8Bytes:Buffer.byteLength(JSON.stringify(productModes),'utf8'),irreducibleOverBudget:'refused-no-facts-dropped'}));
});

test('r20 preserves normal Play 15s export, 60s same-run Pause, terminal retries and historical strict schemas',async()=>{
  const retirementObserved=addR17RulerEntryV2({runtime:correlated.runtime,controls:normalControls(original.controls,'a'.repeat(64),true),
    page:normalPage(original.page),layout:original.layout,nativePosition:original.nativePosition});
  const files=costFiles();files.set('r17-phone-probe-controls.tsx',addR17NormalInput(retirementObserved).controls);
  const result=await verifyNormalBaselineV3Fixture({productionRoot:root,feature,ts,buildGeneration:25,
    protocolPath:path.join(here,'r17-normal-input-protocol.mjs'),allowACorrelation:true,allowRulerEntry:true,retirementObservation:true,
    readPreparedSource:async name=>files.get(name)??(name==='sky-canvas-surface.ts'
      ? (await import('./build-r17-normal-baseline-v3.mjs')).normalSurface(await production(name),true).source : production(name))});
  assert(Object.values(result).every(value=>value===true));
  const legacy=environment({legacy:true});legacy.probe.start('wide-time');legacy.advance(1001);
  const value=receipt(legacy.probe.snapshot());assert.equal(validateR17PhoneProbeMetrics(value),true);assert.equal(previous(value),true);
});
