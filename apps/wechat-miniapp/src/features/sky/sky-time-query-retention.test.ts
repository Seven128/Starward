import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Keep the complete production hook and real Query cache. The controlled
// React effects establish reader retirement, not WEAPP GC or phone bytes.
const probe = String.raw`
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {minify}=require('terser');
const {QueryClient,QueryObserver}=require('@tanstack/query-core');
const source=fs.readFileSync(process.env.SKY_TIME_QUERY_RETENTION_SOURCE || path.join(process.argv[1],'sky-time-target-query.ts'),'utf8');
const mode=process.argv[2],client=new QueryClient({defaultOptions:{queries:{retry:false}}});
const weak={},calls=[],noop=()=>{},slots=[];
let cursor=0,observer,unsubscribe,pendingEffect,cleanup,options;
const promise=Promise.resolve({data:{at:'2026-10-26T20:00:00.000Z',targets:[{id:'current'}]}});
function forwardSignal(fn,{signal}){return fn(signal);}
const adapters={
  react:{useRef:value=>slots[cursor++]??={current:value},useEffect:effect=>{pendingEffect=effect;}},
  '../../hooks/use-resource-query':{useResourceQuery:value=>{
    options={...value,queryFn:forwardSignal.bind(null,value.queryFn)};
    observer??=new QueryObserver(client,options);return observer.getOptimisticResult(options);
  }},
  '../../services/sky-celestial-client':{getSkyTargetInstant:(binding,signal)=>{calls.push({binding,signal});return promise;}},
  '../../services/sky-target-instant-response':{skyTargetInstantQueryKey:(binding,revision)=>
    ['spot-sky-target-instant',binding?.contextId??'',revision,binding?.at??'']},
  '../../services/request-lifecycle':{MiniappRequestCancelled:class MiniappRequestCancelled extends Error{}},
};
const runtime={exports:{},require:name=>{assert(name in adapters,name);return adapters[name];}};
const compiled='(function(exports,require){'+ts.transpileModule(source,
  {compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.CommonJS}}).outputText+'\n})(exports,require);';
const binding={contextId:'synthetic',at:'2026-10-26T20:00:00.000Z'};
function render(active){
  cursor=0;
  const pageOwner={marker:'retired-page-frame-owner'},readCurrent=()=>Boolean(pageOwner.marker);
  weak.pageOwner=new WeakRef(pageOwner);weak.readCurrent=new WeakRef(readCurrent);
  runtime.exports.useSkyTimeTargetQuery(active?binding:null,'v1',active,readCurrent);
  cleanup?.();cleanup=pendingEffect?.();pendingEffect=undefined;
  observer.setOptions(options);unsubscribe??=observer.subscribe(noop);options=undefined;
}
function retire(){cleanup?.();cleanup=undefined;unsubscribe?.();unsubscribe=undefined;observer.destroy();observer=undefined;slots.length=0;}
const collect=async()=>{await new Promise(setImmediate);global.gc();await new Promise(setImmediate);global.gc();};
function readCached(){return client.getQueryCache().getAll().find(q=>q.queryKey[3]===binding.at);}
(async()=>{try{
  // The shipped Taro bundle lowers to function-scoped variables and Terser
  // can inline a callback factory into the hook. Exercise that retained scope,
  // not only the source-level separation of functions.
  const code=process.argv[3]==='minified'?(await minify(compiled)).code:compiled;
  vm.runInNewContext(code,runtime);
  render(true);await new Promise(setImmediate);
  assert.equal(calls.length,1);assert.equal(client.getQueryCache().getAll()[0].gcTime,60000);
  if(mode==='hide'){
    const initial={...weak};render(false);await collect();
    for(const [name,ref]of Object.entries(initial))assert.equal(ref.deref(),undefined,'hidden reader retains previous '+name);
  }else retire();
  await collect();
  for(const [name,ref]of Object.entries(weak))assert.equal(ref.deref(),undefined,mode+' cache retains '+name);
  assert(readCached(),'numeric target response remains cached for the original reuse period');
  assert.equal(readCached().getObserversCount(),0);assert.equal(readCached().state.data.data.targets[0].id,'current');
  await assert.rejects(readCached().options.queryFn({signal:new AbortController().signal}),/superseded/);
  assert.equal(calls.length,1,'retired callbacks cannot start new work');
  if(mode==='hide')retire();
  client.clear();await collect();
  assert(Object.values(weak).every(ref=>ref.deref()===undefined),'harness releases all witnesses');
}finally{client.clear();}})().catch(error=>{console.error(error);process.exitCode=1;});
`;

for (const mode of ["hide", "unmount"]) for (const build of ["unminified", "minified"]) {
  test(`precise target cache releases the retired page callback on ${mode} (${build})`, () => {
    const result = spawnSync(process.execPath, ["--expose-gc", "-e", probe,
      fileURLToPath(new URL(".", import.meta.url)), mode, build],
    { encoding: "utf8", timeout: 20_000, windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
