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
import { addR17RulerEntryClock } from './r17-ruler-entry-instrumentation.mjs';
import { addR17RulerEntryV2 } from './r17-ruler-entry-v2-instrumentation.mjs';
import { validateR17PhoneProbeMetrics, matchR17PhoneProbeTerminal, R17_RULER_ENTRY_EVENTS } from './r17-ruler-entry-protocol.mjs';
import { validateR17PhoneProbeMetrics as legacy } from './r17-a-correlation-protocol.mjs';
import { validateR17PhoneProbeMetrics as validateCurrent, R17_RULER_ENTRY_V2_EVENTS } from './r17-normal-input-protocol.mjs';
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
const correlation = addR17ACorrelation({ runtime: original.runtime.replaceAll('__VARIANT__','baseline'), pageObserver: original.observer });
// Historical r5 receipts own the shared clock/recorder contract. The retired
// r5 page transform must not be applied to today's single-writer component.
const historical = addR17RulerEntryClock({ runtime: correlation.runtime, controls: normalControls(original.controls,'a'.repeat(64)) });
const changed = addR17RulerEntryV2({ runtime: correlation.runtime, controls: normalControls(original.controls,'a'.repeat(64)),
  page: normalPage(original.page), layout: original.layout, nativePosition: original.nativePosition });
const historicalEntry = await template('r17-ruler-entry-runtime.ts');
const inputs = new Map(Object.entries({ 'spot-sky-page.tsx': changed.page, 'orientation-ruler-layout.ts': changed.layout,
  'r17-phone-probe-runtime.ts': changed.runtime, 'r17-phone-probe-controls.tsx': changed.controls,
  'r17-ruler-scroll-position.ts': changed.nativePosition,
  'r17-ruler-entry-runtime.ts': historicalEntry.replace('starward-r17-ruler-entry-v1','starward-r17-ruler-entry-v2'),
  'r17-a-correlation-runtime.ts': await template('r17-a-correlation-runtime.ts'),
  'r17-page-bridge-observer.ts': correlation.pageObserver, 'r17-normal-observations.ts': await template('r17-normal-observations.ts') }));
function compile(source) {
  const result = ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}});
  assert.equal(result.diagnostics.length,0); return result.outputText;
}
function environment({ current = false } = {}) {
  let elapsed = 0, offset = 0, unavailable = false, timer = 0;
  const timers = new Map(), context = { Date: class extends Date { static now() { return unavailable ? NaN : 1_800_000_000_000 + elapsed + offset; } },
    setTimeout: (run,delay) => { const id = ++timer; timers.set(id,{at:elapsed + delay,run}); return id; },clearTimeout:id => timers.delete(id) };
  function load(source, deps = {}) {
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){'+compile(source)+'\n})',context)(module.exports,name => {
      if (!Object.hasOwn(deps,name)) throw Error('missing_fixture_dependency:'+name); return deps[name];
    },module); return module.exports;
  }
  const entry = load(current ? inputs.get('r17-ruler-entry-runtime.ts') : historicalEntry);
  const correlation = load(inputs.get('r17-a-correlation-runtime.ts'));
  const probe = load(current ? changed.runtime : historical.runtime,{'./r17-ruler-entry-runtime':entry,'./r17-a-correlation-runtime':correlation}).r17Probe;
  assert.equal(probe.configureBinding({mode:'normal',buildGeneration:27,buildSourceSha256:'a'.repeat(64)}),true);
  const advance = amount => { const end = elapsed + amount; for (;;) {
    const due = [...timers].filter(([,value]) => value.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
    if (!due) break; timers.delete(due[0]); elapsed = due[1].at; due[1].run();
  } elapsed = end; };
  return { entry:entry.r17RulerEntry, probe, context, load, advance, jump:amount => { offset += amount; }, unavailable:() => { unavailable = true; } };
}
const receipt = value => JSON.parse(JSON.stringify(value));
const entries = (value,code) => value.rulerEntry.entries.filter(row => row[1] === code);

test('current V2 transforms strictly typecheck at real page dependencies while legacy recorder stays versioned',()=>{
  assert.equal(changed.runtime,historical.runtime,'historical and current receipts use the same strictly checked clock owner');
  assert.equal(changed.controls,historical.controls,'the same checked controls retain the legacy Play guards');
  const file = path.join(root,'apps/wechat-miniapp/tsconfig.json'), config = ts.readConfigFile(file,ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(file));
  const map = new Map([...inputs].map(([name,source]) => [path.join(root,feature,name).replaceAll('\\','/'),source]));
  const options = {...parsed.options,noEmit:true}; assert(options.strict && options.noUncheckedIndexedAccess && options.exactOptionalPropertyTypes);
  const host = ts.createCompilerHost(options), readFile = host.readFile, exists = host.fileExists;
  host.readFile = file => map.get(file.replaceAll('\\','/')) ?? readFile(file);
  host.fileExists = file => map.has(file.replaceAll('\\','/')) || exists(file);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([...new Set([...parsed.fileNames,...map.keys()])],options,host));
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:value=>value,getNewLine:()=> '\n'}));
  assert.match(changed.page,/from "\.\/r17-ruler-scroll-position"/);
  assert.doesNotMatch(changed.page,/from "@\/components\/ruler-scroll-position"/);
  assert.doesNotMatch(original.nativePosition,/r17/,'main/shared native owner stays unchanged');
  assert.doesNotMatch(changed.page,/setScrollLeft|scrollLeft=\{|scrollWithAnimation=\{/);
  const old=environment();old.probe.start('wide-time');
  const historicalReceipt=receipt(old.probe.snapshot());
  assert.equal(historicalReceipt.rulerEntry.schemaVersion,'starward-r17-ruler-entry-v1');
  assert.equal(validateR17PhoneProbeMetrics(historicalReceipt),true);
  assert.equal(validateCurrent(historicalReceipt),true,'current dispatcher still accepts actual legacy bytes');
  const now=environment({current:true});now.probe.start('wide-time');
  const currentReceipt=receipt(now.probe.snapshot());
  assert.equal(currentReceipt.rulerEntry.schemaVersion,'starward-r17-ruler-entry-v2');
  assert.equal(validateCurrent(currentReceipt),true);
  assert.equal(validateR17PhoneProbeMetrics(currentReceipt),false,'V2 is not relabelled as historical V1');
});
test('wide-time records immediately in the shared epoch before the legacy 1s measurement arm; Play stays disabled',()=>{
  const e = environment(); e.probe.start('wide-time'); assert.equal(e.probe.status(),'armed');
  e.entry.record(19,[1,1,0,120,false,false]); e.advance(5);
  const value = receipt(e.probe.snapshot()); assert.equal(value.rulerEntry.entries[0][2],0);
  assert.equal(entries(value,19)[0][2],0); assert.equal(value.rulerEntry.start.windowId,value.binding.windowId);
  assert.equal(validateR17PhoneProbeMetrics(value),true); assert.equal(legacy(value),false);
  const sealed = JSON.stringify(value); e.entry.record(19,[1,1,0,0,false,false]); e.advance(100);
  assert.equal(JSON.stringify(e.probe.snapshot()),sealed,'sealed receipt cannot acquire a late scroll');
  e.probe.start('wide-play'); assert.equal(e.entry.active(),false); e.entry.record(19,[1,1,0,0,false,false]);
  e.advance(1001); const play = receipt(e.probe.snapshot()); assert.equal(Object.hasOwn(play,'rulerEntry'),false); assert.equal(legacy(play),true);
});
test('the raw shared clock retains backward/unavailable epochs and never invents native completion',()=>{
  const e = environment(); e.probe.start('wide-time'); e.advance(10); e.entry.record(18,[1,1]);
  e.jump(-100); e.entry.record(18,[1,1]); e.unavailable(); e.entry.record(18,[1,1]);
  const value = receipt(e.probe.snapshot()), rows = entries(value,18);
  assert.equal(rows[0][2],10); assert.equal(rows[1][2],null); assert.equal(rows[1][4],1);
  assert.equal(rows[2][2],null); assert.equal(rows[2][3],null); assert.equal(rows[2][4],2);
  assert.equal(validateR17PhoneProbeMetrics(value),true);
  assert.equal(value.rulerEntry.meaning,'requests-offsets-not-presentation');
});
test('128 scalar events and export omission keep a realistic A1 receipt within the original 32KiB budget',()=>{
  const e = environment(); e.probe.start('wide-time'); e.advance(1000);
  for (let index=0;index<2200;index++) {
    const state={at:'2026-01-01T00:00:00Z'},intent=e.probe.intent(state),token=e.probe.prepareStarted(intent);
    e.advance(2);e.probe.prepareFinished(token);e.advance(1);
    const frame={frameAt:state.at};e.probe.request(frame,token,intent);e.advance(1);e.probe.paintStarted(frame);e.advance(1);e.probe.accepted(frame,{objects:[]});
  }
  for(let index=0;index<260;index++) e.entry.record(9,[1,index,1,true,-123.123456789,3.123456789,-341.123456789,17.123456789,-324.123456789,17.123456789,18231.123456789]);
  const value=receipt(e.probe.snapshot());
  assert.equal(value.rulerEntry.overflow,true); assert(value.rulerEntry.dropped > 0);
  assert.equal(value.rulerEntry.entries.length + value.rulerEntry.exportOmitted,128);
  assert(Buffer.byteLength(JSON.stringify(value)) <= 32768); assert.equal(validateR17PhoneProbeMetrics(value),true);
  assert.equal(matchR17PhoneProbeTerminal(value,receipt(e.probe.terminalSnapshot())),true);
});
test('current native move callback records stale ownership and preserves the original receiver/options once',()=>{
  const e=environment({current:true});e.probe.start('wide-time'); const callbacks=[],calls=[];
  const query={select(){return query;},node(){return query;},exec(callback){callbacks.push(callback);}};
  const native=e.load(changed.nativePosition,{'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry},'@tarojs/taro':{__esModule:true,default:{createSelectorQuery:()=>query}}});
  const owner=native.createRulerScrollPosition('test-ruler',1),node={scrollTo(options){assert.strictEqual(this,node);calls.push(options);}};
  owner.move(33);owner.move(44);callbacks.shift()([{node}]);callbacks.shift()([{node}]);
  assert.deepEqual(calls.map(receipt),[{left:44,animated:false}]);
  const value=receipt(e.probe.snapshot());assert.equal(entries(value,15).length,2);assert.equal(entries(value,17).length,1);
  const stale=entries(value,16)[0];assert.notEqual(stale[7],stale[8]);assert.equal(stale[9],null);assert.equal(stale[10],null);
  assert.equal(validateCurrent(value),true);
});
test('late native observations from a sealed or inactive window cannot contaminate a new run; original scrollTo still executes',()=>{
  for(const inactive of [false,true]){
    const e=environment({current:true}),callbacks=[],calls=[];
    const query={select(){return query;},node(){return query;},exec(callback){callbacks.push(callback);}};
    const native=e.load(changed.nativePosition,{'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry},'@tarojs/taro':{__esModule:true,default:{createSelectorQuery:()=>query}}});
    if(!inactive)e.probe.start('wide-time');
    const owner=native.createRulerScrollPosition('test-ruler',1);owner.move(121);
    if(!inactive)e.probe.snapshot();
    e.probe.start('wide-time');
    callbacks.shift()([{node:{scrollTo(options){calls.push(options);}}}]);
    const value=receipt(e.probe.snapshot());assert.equal(calls.length,1,'diagnostic retirement must not stop a current original product command');
    for(const code of [14,15,16,17,18])assert.equal(entries(value,code).length,0,'no old native event enters new window: '+code);
    assert.equal(value.rulerEntry.rejectedWindowEvents,3);assert.equal(validateCurrent(value),true);
  }
});
test('an original measurement retry/resolution carries its old observation window through the native move',()=>{
  const e=environment({current:true});e.probe.start('wide-time');const callbacks=[],nodeCallbacks=[],calls=[];
  const query={select(){return query;},node(){return query;},exec(callback){nodeCallbacks.push(callback);}};
  const native=e.load(changed.nativePosition,{'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry},'@tarojs/taro':{__esModule:true,default:{createSelectorQuery:()=>query}}});
  const layout=e.load(changed.layout,{'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry}}),owner=native.createRulerScrollPosition('test-ruler',1);
  let measurement;measurement=layout.createOrientationRulerLayout((accept,_current,window)=>callbacks.push({accept,window}),()=>true,
    window=>owner.move(measurement.left(33,17.68),false,undefined,window),1);
  measurement.measure();const oldWindow=callbacks[0].window;e.probe.stop();e.probe.start('wide-time');
  callbacks.shift().accept([]);assert.equal(callbacks[0].window,oldWindow,'one bounded retry keeps its original observation identity');
  callbacks.shift().accept([{left:194.7,width:1},{left:-396,width:17},{left:-379,width:17},{scrollLeft:583.200012}]);
  nodeCallbacks.shift()([{node:{scrollTo(options){calls.push(options);}}}]);
  assert.equal(calls.length,1);assert(Math.abs(calls[0].left-561.500012)<1e-8);
  const value=receipt(e.probe.snapshot());for(const code of [10,14,15,16,17,18])assert.equal(entries(value,code).length,0);
  assert(value.rulerEntry.rejectedWindowEvents >= 6);assert.equal(validateCurrent(value),true);
});
test('current component records original same-batch projection and real offset admission; retirement adds no query or writer',async()=>{
  const e=environment({current:true});e.probe.start('wide-time');
  const layout=e.load(changed.layout,{'./r17-ruler-entry-runtime':{r17RulerEntry:e.entry}});
  const scrollSettlement=e.load(await read(path.join(root,'apps/wechat-miniapp/src/components/scroll-settlement.ts')));
  const settlement=e.load(await production('sky-time-ruler-settlement.ts'),{'../../components/scroll-settlement':scrollSettlement});
  const testSource=await production('orientation-time-ruler-window.test.ts');
  const ast=ts.createSourceFile('fixture.ts',testSource,ts.ScriptTarget.Latest,true);
  const harness=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='rulerFixture');assert(harness);
  const extracted=harness.getText(ast).replace('{ Taro: platform, setTimeout, clearTimeout, Date }','{ r17RulerEntry, Taro: platform, setTimeout, clearTimeout, Date }')
    .replace('Taro: platform, clockTimeInTimezone','r17RulerEntry, Taro: platform, clockTimeInTimezone')
    .replaceAll('import.meta.url','"file:///ruler-fixture/"');
  const run=vm.runInNewContext(compile(extracted+'\nrulerFixture;'),{exports:{},assert,ts,vm,
    readFileSync:url=>String(url).includes('ruler-scroll-position')?changed.nativePosition:changed.page,
    URL,setTimeout:e.context.setTimeout,clearTimeout:e.context.clearTimeout,Date:e.context.Date,
    clockTimeInTimezone:()=>({hour:4,minute:30,second:0}),
    createOrientationRulerLayout:layout.createOrientationRulerLayout,createSkyTimeRulerSettlement:settlement.createSkyTimeRulerSettlement,r17RulerEntry:e.entry});
  const rows=Array.from({length:49},(_,i)=>({at:new Date(Date.parse('2026-10-18T04:00:00Z')+i*1800000).toISOString()}));
  const props={rows,activeIndex:33,committedIndex:33,presentedAt:rows[33].at,isPreviewing:false,layoutReady:false,preparing:true};
  const component=run(props,390);
  assert.equal(component.takeLayoutRead(),undefined,'closed layout gate issues no diagnostic-only initial offset query');
  assert.equal(component.nativeAnimationTarget,null);assert.equal(component.positions.length,0);
  component.scroll.onScroll({detail:{scrollLeft:555}});assert.equal(component.previews.length,0,'programmatic callback remains non-input');
  component.render({...props,layoutReady:true});
  const measured=component.takeLayoutRead();assert(measured);
  const sample=[{left:194.7,width:1},{left:-396,width:17},{left:-379,width:17},{scrollLeft:583.200012}];
  measured(sample);component.flush();
  assert(Math.abs(component.positions.at(-1)-561.500012)<1e-8);
  component.resize();const late=component.takeLayoutRead();component.hide();const before=component.positions.length;
  late(sample);component.flush();assert.equal(component.positions.length,before);component.unmount();
  const value=receipt(e.probe.snapshot());assert.equal(validateCurrent(value),true);
  assert.equal(entries(value,19)[0].at(-1),0);
  assert.deepEqual(entries(value,9)[0].slice(-7),[194.7,1,-396,17,-379,17,583.200012]);
  assert(entries(value,32).some(row=>Math.abs(row.at(-1)-561.500012)<1e-8),'current owner reports the actual native offset');
  assert(entries(value,27).length>0,'current component admits the observed matching offset');
  for(const code of [3,4,12,22])assert.equal(entries(value,code).length,0,'retired extra query/declarative events are absent: '+code);
  assert(entries(value,20).some(row=>row[7]===3));assert(entries(value,20).some(row=>row[7]===4));assert(entries(value,20).some(row=>row[7]===5));
  // The original nextTick/layout work carries its old observation identity.
  // Retirement must suppress diagnostics without suppressing product work.
  for(const inactive of [false,true]){
    e.probe.stop();if(!inactive)e.probe.start('wide-time');const pending=run({...props,layoutReady:true},390,true);
    e.probe.stop();e.probe.start('wide-time');pending.nativeReady();
    const originalRead=pending.takeLayoutRead();assert(originalRead,'original layout read is still performed');
    assert.equal(pending.takeLayoutRead(),undefined,'one original layout query, no diagnostic-only query');
    const positions=pending.positions.length;originalRead(sample);pending.nativeReady();pending.flush();
    assert(pending.positions.length>positions,'original old-window layout resolution still positions the current product');
    const restarted=receipt(e.probe.snapshot());
    for(const code of [7,8,9,10,11,13,15,16,17,18,26,27,31,32])assert.equal(entries(restarted,code).length,0,'no stale scheduled observation: '+code);
    assert(restarted.rulerEntry.rejectedWindowEvents>0);assert.equal(validateCurrent(restarted),true);pending.unmount();
  }
  e.probe.start('wide-time');const hidden=run({...props,layoutReady:true},390);
  const oldRead=hidden.takeLayoutRead();assert(oldRead);assert.equal(hidden.takeLayoutRead(),undefined);
  hidden.hide();e.probe.stop();e.probe.start('wide-time');hidden.show();const positions=hidden.positions.length;
  oldRead(sample);assert.equal(hidden.positions.length,positions,'hide/show original guards also reject the retired product read');
  const afterHide=receipt(e.probe.snapshot());assert.equal(entries(afterHide,9).length,0);assert.equal(entries(afterHide,27).length,0);
  assert(afterHide.rulerEntry.rejectedWindowEvents>0);assert.equal(validateCurrent(afterHide),true);hidden.unmount();
});
test('actual surface finish callback keeps the original layout finish and records handler phase',()=>{
  const e=environment({current:true});e.probe.start('wide-time');
  const ast=ts.createSourceFile('page.tsx',changed.page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression='';
  const visit=node=>{if(ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node)){
    const id=node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText(ast)==='id'&&item.initializer?.text==='sky-time-disclosure-surface');
    if(id){const attr=node.attributes.properties.find(item=>ts.isJsxAttribute(item)&&item.name.getText(ast)==='onMotionEnd');expression=attr.initializer.expression.getText(ast);}}
    ts.forEachChild(node,visit);};visit(ast);assert(expression);
  let finishes=0;const finish=vm.runInNewContext('('+expression+')',{r17RulerEntry:e.entry,r17TimeMotionWindow:e.entry.window(),timeMotion:{phase:'open',active:true},timeLayout:{ready:false,finish(){finishes++;}}});
  finish();assert.equal(finishes,1);const value=receipt(e.probe.snapshot());assert.deepEqual(entries(value,6)[0].slice(6),[2,1,0]);
  e.probe.start('wide-time');finish();assert.equal(finishes,2,'retiring a diagnostic handler cannot suppress the original finish callback');
  const late=receipt(e.probe.snapshot());assert.equal(entries(late,6).length,0);assert.equal(late.rulerEntry.rejectedWindowEvents,1);
});
test('new strict collector rejects wrong shape/window/private fields and retains exact idempotency for original writer',async()=>{
  const e=environment();e.probe.start('wide-time');e.advance(1001);const value=receipt(e.probe.snapshot()),terminal=receipt(e.probe.terminalSnapshot());
  assert.equal(validateR17PhoneProbeMetrics(value),true);
  for(const mutate of [v=>v.rulerEntry.entries[0].push('private'),v=>v.rulerEntry.start.windowId++,v=>v.rulerEntry.entries[0][5]++,
    v=>v.rulerEntry.dropped++,v=>v.rulerEntry.entries[0][2]=55,v=>v.rulerEntry.entries[0][2]=null,
    v=>v.rulerEntry.entries[0][0]++,v=>v.rulerEntry.secret='private',v=>v.caseKey='wide-play']){
    const invalid=receipt(value);mutate(invalid);assert.equal(validateR17PhoneProbeMetrics(invalid),false);
  }
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r17-ruler-entry-collector-'));
  try{const store=createR17PhoneProbeCollector(directory);assert.equal(await store.store(terminal),424);assert.equal(await store.store(value),200);
    assert.equal(await store.store(value),200);assert.equal(await store.store(terminal),200);
    const conflict=receipt(value);conflict.rulerEntry.entries[0][3]++;conflict.rulerEntry.entries[0][2]++;
    assert.equal(await store.store(conflict),409);const {rulerEntry,...old}=value;assert.equal(legacy(old),true);assert.equal(validateR17PhoneProbeMetrics(old),true);
  }finally{const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());assert(path.basename(resolved).startsWith('starward-r17-ruler-entry-collector-'));await fs.rm(resolved,{recursive:true});}
});
test('current full normal fixture preserves guarded Play/15s/20s, hide, retry and old A1 interpretation',async()=>{
  const temp=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(temp,'starward-r17-ruler-entry-fixture-'));
  try{
    const files=new Map(inputs);
    for(const name of ['sky-command-state.ts','sky-selected-object.tsx','use-sky-artwork.ts','sky-stellar-transform.ts',
      'sky-object-selection.ts','sky-star-transition.ts','sky-ready-presentation.ts','sky-name-layout.ts']) files.set(name,await production(name));
    for(const [name,source]of files){const file=path.join(directory,feature,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,source,{flag:'wx'});}
    const result=await verifyNormalBaselineV3Fixture({sourceRoot:directory,productionRoot:root,feature,ts,buildGeneration:25,
      protocolPath:path.join(here,'r17-normal-input-protocol.mjs'),allowACorrelation:true,allowRulerEntry:true});
    assert(Object.values(result).every(value=>value===true));assert.equal(result.rulerEntryDisabledForPlayAndUsesExistingWideTimeCollector,true);
  }finally{const resolved=await fs.realpath(directory);assert.equal(path.dirname(resolved).toLowerCase(),temp.toLowerCase());assert(path.basename(resolved).startsWith('starward-r17-ruler-entry-fixture-'));await fs.rm(resolved,{recursive:true});}
});
test('event schema names stay explicit and exclude presentation/physical-FPS claims',()=>{
  assert.equal(Object.keys(R17_RULER_ENTRY_EVENTS).length,23);
  assert.equal(R17_RULER_ENTRY_EVENTS[18][0],'nativeScrollToReturned');
  assert.equal(R17_RULER_ENTRY_EVENTS[4][0],'initialOffsetNextTick');
  assert.equal(Object.hasOwn(R17_RULER_ENTRY_V2_EVENTS,4),false,'the current observer retired the extra initial-offset operation');
  assert.equal(Object.hasOwn(R17_RULER_ENTRY_V2_EVENTS,12),false,'the current observer has no declarative-scroll writer');
});
