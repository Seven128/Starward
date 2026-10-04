/** Current actual Query wrapper/core with controlled React notifications; no Map query cache. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-shared-page-journey-2026-10-03.mts'),'utf8').replaceAll('\r','');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,100));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r46.json','current-execution-state-2026-10-03-r48.json');
const api="  await page.addScriptTag({content:fs.readFileSync(path.join(out,'api-bundle.js'),'utf8')});";
once(api,api+`
  await page.evaluate(()=>{const w=globalThis.__controlled,api=globalThis.liveApi,client=api.miniappQueryClient;
   w.actualObservers=[];
   w.actualUseQuery=options=>{
    const defaulted=client.defaultQueryOptions(options);defaulted._optimisticResults='optimistic';
    const [observer]=w.react.useState(()=>{const o=new api.QueryObserver(client,defaulted);w.actualObservers.push(o);return o;});
    const [,changed]=w.react.useState(0),result=observer.getOptimisticResult(defaulted);
    w.react.useEffect(()=>observer.subscribe(()=>changed(n=>n+1)),[observer]);
    w.react.useEffect(()=>{observer.setOptions(defaulted);},[defaulted,observer]);
    w.queries.push({key:JSON.stringify(options.queryKey),enabled:!!options.enabled,source:'actual-query-observer'});
    return result;
   };
   w.queryRetention=()=>client.getQueryCache().getAll().map(q=>({key:JSON.stringify(q.queryKey),pending:q.state.fetchStatus==='fetching',hasData:q.state.data!==undefined,
    jsonBytes:q.state.data?new TextEncoder().encode(JSON.stringify(q.state.data)).byteLength:0}));
   w.actualQueryInventory=()=>({queries:w.queryRetention(),observers:w.actualObservers.map(o=>({key:o.options.queryKey,enabled:o.options.enabled,status:o.getCurrentResult().status,fetchStatus:o.getCurrentResult().fetchStatus,dataIdentity:w.identity(o.getCurrentResult().data?.data)}))});
  });`);
const contract=s.indexOf(' const staticPublication='),bootstrap=s.indexOf(' const bootstrapPromise=',contract);assert(contract>0&&bootstrap>contract);s=s.slice(0,contract)+s.slice(bootstrap);
const start=s.indexOf(' const conditions=['),end=s.indexOf(' const sceneRows:',start);assert(start>0&&end>start);
s=s.slice(0,start)+` const conditions=[
 {name:'query-cold-wide',manualPan:true,pose:[0,105,0],fov:85,reference:null},
 {name:'query-clear-wide-return',manualPan:true,pose:[0,105,0],fov:85,reference:null,clearBefore:true}];
 save('conditions.json',{conditions,scope:'Only changed real QueryClient/Observer + actual useResourceQuery SAO/image page path; clear API after hide and return. No old matrix/solar/static contract replay; React notification bridge is task controlled, not full useQuery/native JSX.'});
`+s.slice(end);
const loop=" for(const condition of conditions){";
once(loop,loop+`
  if(condition.clearBefore){
   const hidden=await page.evaluate(currentHideExecutor,{source:false});save('clear-hidden.json',hidden);
   const clear=await page.evaluate(async()=>{const w=globalThis.__controlled,api=globalThis.liveApi,client=api.miniappQueryClient;
    const old=client.getQueryData(['sao-index','v2']);if(!old)throw Error('no actual SAO query to clear');
    const before={query:w.actualQueryInventory(),resources:w.resourceSnapshot(),identity:w.identity(old.data)};
    w.phase='actual-api-clear';const cancelled=await api.clearTemporaryApiCache();
    if(client.getQueryData(['sao-index','v2'])!==undefined)throw Error('retired query survived actual API clear');
    return {cancelled,before,after:{query:w.actualQueryInventory(),resources:w.resourceSnapshot()},scope:'Actual shared API clear and QueryClient filters; stable fixture report input retained by task, full report Hook/native Settings UI not executed.'};
   });save('actual-api-clear.json',clear);await page.evaluate(currentShowExecutor);
  }`);
once('const bounded={...row,passes,actualFacts,jointOwner};',"const query=await page.evaluate(()=>globalThis.__controlled.actualQueryInventory());\n  const bounded={...row,passes,actualFacts,jointOwner,query};");
once('const loggedNonHead=access.slice(3).map(r=>r.status','const loggedNonHead=access.map(r=>r.status');
once('receivedNonHead=success.slice(3).map(r=>r.status','receivedNonHead=success.map(r=>r.status');
once('head:{loggedSize:access[1].size,receivedBytes:rows[1].encodedBodyBytes}','head:null');
once('assert.equal(access.length,rows.length);','assert(access.length<=rows.length&&access.length>=success.length);');
once('assert.equal(loggedNonHead.length,rows.filter(r=>r.aborted).length);','assert.equal(loggedNonHead.length+rows.length-access.length,rows.filter(r=>r.aborted).length);');
once('cancelledPhysicalReceiptBytes:null','cancelledWithoutLog:rows.length-access.length,cancelledPhysicalReceiptBytes:null');
once("status:'LIVE_FINAL_SAO_IMAGE_SINGLE_OWNER_PAGE_SCENE_DEVELOPMENT'","status:'LIVE_REAL_QUERY_API_CLEAR_PAGE_SCENE_DEVELOPMENT'");
const scope=s.indexOf("scope:'Final source full API and extracted actual page/effects/lifecycle/Scene,"),scopeEnd=s.indexOf("'});",scope);assert(scope>0&&scopeEnd>scope);
s=s.slice(0,scope)+"scope:'Final actual API and page Hook/lifecycle/Scene/useResourceQuery with real shared QueryClient/QueryObserver/defaultOptions/optimisticResult/subscription-effect port derived from installed useBaseQuery. React notifications/MapFS/Taro/native/clock/softwareGL controlled; full React useQuery/provider/native JSX or report Hook/settings UI not executed. Same single encoded owner, actual isolated HTTP and current source bytes; two affected cold-clear-hide-return cases. No old matrices/static contract/sourceprocessing/rebuildloop. Physical/native/quality/cost/capacity/independentreview unverified.'"+s.slice(scopeEnd+1);
once("for(const row of [...checkpoint.protected,...checkpoint.currentSources])assert.deepEqual(bind(row.path),row);","const admittedTransitions=JSON.parse(fs.readFileSync(path.join(out,'authorised-input-transitions.json'),'utf8'));\nfor(const row of [...checkpoint.protected,...checkpoint.currentSources]){const transition=admittedTransitions.find(t=>t.before.path===row.path);if(transition)assert.deepEqual(transition.before,row);assert.deepEqual(bind(row.path),transition?.after??row);}");
fs.writeFileSync(path.join(dir,'experience-real-query-clear-journey-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-real-query-clear-journey-2026-10-03.mts',productionChanged:false}));
