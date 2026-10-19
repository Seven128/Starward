import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalPage, controls as normalControls } from './build-r17-normal-baseline-v3.mjs';
import { addR17ACorrelation } from './r17-a-correlation-instrumentation.mjs';
import { addR17RulerEntryV2 } from './r17-ruler-entry-v2-instrumentation.mjs';
import { addR17NormalInput } from './r17-normal-input-instrumentation.mjs';
import { validateR17PhoneProbeMetrics, validateR17PhoneProbeTerminal, matchR17PhoneProbeTerminal,
  R17_RULER_ENTRY_V2_EVENTS, R17_MANUAL_INPUT_SCHEMA } from './r17-normal-input-protocol.mjs';
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
function environment({ legacy = false } = {}) {
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
  const probe = load(legacy ? correlated.runtime : changed.runtime, {'./r17-ruler-entry-runtime':entry,'./r17-a-correlation-runtime':correlation}).r17Probe;
  assert.equal(probe.configureBinding({mode:'normal',buildGeneration:27,buildSourceSha256:'a'.repeat(64)}),true);
  const advance = amount => { const end=elapsed+amount; for(;;) {
    const due=[...timers].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!due)break;timers.delete(due[0]);elapsed=due[1].at;due[1].run();
  }elapsed=end; };
  return {entry:entry.r17RulerEntry,probe,context,load,advance,timers,jump:amount=>{offset+=amount;},unavailable:()=>{unavailable=true;}};
}
function controlEnvironment() {
  const e=environment(), requests=[],effects=[];let hide,show,memo,memoDeps;
  const observer=e.load(inputs.get('r17-page-bridge-observer.ts'),{'./r17-phone-probe-runtime':{r17Probe:e.probe}});
  const page={setData(){}};
  const controls=e.load(changed.controls,{
    './r17-phone-probe-runtime':{r17Probe:e.probe},'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry},'./r17-page-bridge-observer':observer,
    './r17-normal-observations':{r17NormalSceneStats:()=>({frozen:false,retired:false,nativeCopies:0,readyNativeCopies:0}),
      r17NormalTextStats:()=>({nativeGlyphCalls:0,lifetimeNativeGlyphCalls:0,observationResets:0}),r17ResetNormalObservation(){}},
    react:{useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:make=>{effects.push(make());},
      useMemo:(make,deps)=>{if(!memoDeps||deps.some((value,i)=>!Object.is(value,memoDeps[i]))){memo=make();memoDeps=deps;}return memo;}},
    '@tarojs/taro':{__esModule:true,useDidHide:callback=>{hide=callback;},useDidShow:callback=>{show=callback;},default:{
      getCurrentInstance:()=>({page}),getAppBaseInfo:()=>({enableDebug:false}),request:options=>new Promise(resolve=>requests.push({options,resolve}))}},
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
