import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Complete production owner + installed QueryClient/Observer. GC is confined
// to this child process; this does not measure React/native/phone retirement.
const probe = String.raw`
  const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
  const {QueryClient,QueryObserver,onlineManager}=require('@tanstack/react-query');
  const file=process.argv[1],scenario=process.argv[2],functional=process.argv[3]==='true';
  const diagnostics=[],serviceResult=Promise.resolve({marker:'service-result'});
  let signalRead;
  function request(signal){signalRead=signal;return serviceResult;}
  function forbidden(){throw Error('disabled query dispatched');}
  function freshness(data){return data?.ready?60000:0;}
  const next=()=>new Promise(setImmediate);
  async function collect(){await next();global.gc();await next();global.gc();}
  function prepare(){
    const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:30*60_000,structuralSharing:false}}});
    const state={observer:null,pending:null,unsubscribe:null},weak={};
    const dependencies={
      '@tanstack/react-query':{onlineManager,useQueryClient:()=>client,useQuery(options){
        const actual=client.defaultQueryOptions({...options,_optimisticResults:'optimistic'});
        state.observer??=new QueryObserver(client,actual);
        const result=state.observer.getOptimisticResult(actual);
        state.pending=actual;return state.observer.trackResult(result);
      }},
      react:{useEffect(){}},
      '@/services/acceptance-diagnostics':{recordAcceptanceDiagnostic:(...args)=>diagnostics.push(args)},
    };
    const exports={};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
      {exports,require:id=>{assert(id in dependencies);return dependencies[id];}});
    const render=options=>{exports.useResourceQuery(options);
      state.unsubscribe??=state.observer.subscribe(()=>{});state.observer.setOptions(state.pending);state.pending=null;};
    (()=>{const data={marker:'old-A'};if(scenario==='same-key')weak.data=new WeakRef(data);client.setQueryData(['long-A'],data);})();
    render({queryKey:['long-A'],queryFn:request,enabled:false,staleTime:functional?freshness:60000});
    weak.observer=new WeakRef(state.observer);
    if(scenario==='key-switch'){
      (()=>{const data={marker:'short-B'};weak.data=new WeakRef(data);
        client.getQueryCache().build(client,client.defaultQueryOptions({queryKey:['short-B'],queryFn:forbidden,
          enabled:false,gcTime:0,structuralSharing:false})).setData(data);})();
      render({queryKey:['short-B'],queryFn:forbidden,enabled:false,gcTime:0,staleTime:60000});
    }
    state.unsubscribe();state.unsubscribe=null;state.observer=null;state.pending=null;
    if(scenario==='same-key')client.setQueryData(['long-A'],{marker:'new-A'});
    return {client,weak};
  }
  (async()=>{
    const h=prepare();
    try {
      await new Promise(resolve=>setTimeout(resolve,15));await collect();
      assert.deepEqual(h.client.getQueryCache().getAll().map(q=>q.queryKey.join('/')),['long-A']);
      assert.equal(h.client.getQueryData(['long-A']).marker,scenario==='same-key'?'new-A':'old-A',
        'the independently valid cached publication stays available');
      assert.equal(h.weak.observer.deref(),undefined,'cached resource callbacks must not keep the detached QueryObserver');
      assert.equal(h.weak.data.deref(),undefined,'cached resource callbacks must not keep obsolete result data');
      const query=h.client.getQueryCache().find({queryKey:['long-A'],exact:true}),signal=new AbortController().signal;
      assert.equal(query.options.queryFn({signal}),serviceResult,'original native-service Promise is returned');
      assert.equal(signalRead,signal,'same Query signal reaches the service');
      assert.deepEqual(diagnostics,[['long-A','query_fn','begin']]);
      assert.equal(query.options.enabled,false,'the supplied eligibility is preserved');
      if(functional){assert.equal(query.options.staleTime({state:{data:{ready:true}}}),60000);
        assert.equal(query.options.staleTime({state:{data:{ready:false}}}),0);}
    } finally {h.client.clear();}
  })().catch(error=>{console.error(error);process.exitCode=1;});
`;

for (const [scenario, functional] of [["same-key", false], ["same-key", true], ["key-switch", true]] as const) {
  test(`resource callbacks retire detached results: ${scenario}, functional freshness=${functional}`, () => {
    const result = spawnSync(process.execPath, ["--expose-gc", "-e", probe,
      fileURLToPath(new URL("./use-resource-query.ts", import.meta.url)), scenario, String(functional)],
    { encoding: "utf8", timeout: 20_000, windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
