/** Complete JSX / official page lifecycle / actual Query / real software WebGL. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),out=path.resolve(root,process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output/playwright'));
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),save=(n:string,v:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const bind=async(p:string)=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:hash(b)};};
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'));
const sources=JSON.parse(await fs.readFile(path.join(out,'source-bindings-before.json'),'utf8'));
for(const row of sources)assert.deepEqual(await bind(row.path),row);
const checkpoint=process.argv[3]??'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r51.json';
assert(/^\.codex\/work-items\/cloud-sky-native-2026-09-22\/evidence\/current-execution-state-[\d-]+-r\d+\.json$/.test(checkpoint));
const baseline=JSON.parse(await fs.readFile(path.join(root,checkpoint),'utf8'));
for(const row of [...baseline.currentSources,...baseline.protected])assert.deepEqual(await bind(row.path),row);
await save('current-baseline-before.json',{currentSources:baseline.currentSources,protected:baseline.protected});
const req=createRequire(path.join(root,'workers/miniapp-api/package.json'));req('reflect-metadata');
const {Module}=req('@nestjs/common'),{NestFactory}=req('@nestjs/core'),{FastifyAdapter}=req('@nestjs/platform-fastify');
const {chromium}=req('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const imageOwner=req('image-size'),imageSize=typeof imageOwner==='function'?imageOwner:imageOwner.imageSize;
const {TEST_PUBLISHED_SPOT}=req('@starward/miniapp-contracts/test-fixtures');
const {MiniappController}=await import('../../../../workers/miniapp-api/src/controller.ts');
const {MiniappService}=await import('../../../../workers/miniapp-api/src/miniapp-service.ts');
const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
const {createBsc5pSkyCatalogProvider}=await import('../../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts');
const {StellarCatalogController}=await import('../../../../workers/miniapp-api/src/stellar-catalog.controller.ts');
const {StellarCatalogPublicationService}=await import('../../../../workers/miniapp-api/src/stellar-catalog-publication.ts');
const {ConstellationController}=await import('../../../../workers/miniapp-api/src/constellation.controller.ts');
const {ConstellationPublicationService}=await import('../../../../workers/miniapp-api/src/constellation-publication.ts');
const {SaoPublicationController}=await import('../../../../workers/miniapp-api/src/sao-publication.controller.ts');
const {SaoPublicationService}=await import('../../../../workers/miniapp-api/src/sao-publication.ts');
const {ApiExceptionFilter}=await import('../../../../workers/miniapp-api/src/api-exception.filter.ts');
const {EtagInterceptor}=await import('../../../../workers/miniapp-api/src/etag.interceptor.ts');
const service=createTestMiniappService({skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3')});
class PageDevelopmentModule{}
Module({controllers:[MiniappController,StellarCatalogController,ConstellationController,SaoPublicationController],providers:[{provide:MiniappService,useValue:service},
 {provide:StellarCatalogPublicationService,useValue:new StellarCatalogPublicationService()},
 {provide:ConstellationPublicationService,useValue:new ConstellationPublicationService()}, {provide:SaoPublicationService,useValue:new SaoPublicationService()}]})(PageDevelopmentModule);
const backend=await NestFactory.create(PageDevelopmentModule,new FastifyAdapter(),{logger:false});backend.useGlobalFilters(new ApiExceptionFilter());backend.useGlobalInterceptors(new EtagInterceptor());
const requests:any[]=[],errors:any[]=[],phase:any[]=[];let browser:any,page:any;
let returnTileFailure=false;
const scaffoldPath='output/playwright/cloud-sky-live-mixed-1003-r10/runtime-executor.js.txt',scaffold=await fs.readFile(path.join(root,scaffoldPath),'utf8');
await save('native-scaffold-origin.json',{...await bind(scaffoldPath),scope:'Reuse controlled native MapFS/image callbacks only; legacy React/query scaffold is not connected to actual page.'});
const nativeExecutor=Function('return ('+scaffold.replace(/^export const runtimeExecutor = /,'').trim().replace(/;$/,'')+')')();
try{
await backend.listen(0,'127.0.0.1');const endpoint=await backend.getUrl();await save('backend.json',{endpoint,scope:'Current source controller/service/filter/ETag on isolated loopback; deterministic weather/test repository, actual astronomy/assets. No shared BFF, remote deployment or capacity claim.'});
browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:any)=>errors.push(String(e)));
await page.exposeFunction('__actualPageHttp',async(input:any)=>{
 assert(typeof input.route==='string'&&input.route.startsWith('/v2/')&&!input.route.includes('://'));
 const row:any={id:requests.length+1,route:input.route,method:input.method??'GET',binary:!!input.binary,phase:input.phase};requests.push(row);
 if(!returnTileFailure&&input.phase==='complete-page-return'&&/\/sao\/v2\/[^/]+\/assets\//.test(input.route)){
  returnTileFailure=true;row.injected='one controlled return SAO tile 503';row.status=503;row.receivedBytes=0;row.sha256=hash(Buffer.alloc(0));return {status:503,header:{},base64:'',data:null};
 }
 const response=await fetch(endpoint+input.route,{method:row.method,headers:{...(input.data===undefined?{}:{'Content-Type':'application/json'}),...input.header},
  ...(input.data===undefined?{}:{body:JSON.stringify(input.data)})});
 const raw=Buffer.from(await response.arrayBuffer());row.status=response.status;row.receivedBytes=raw.length;row.sha256=hash(raw);
 const headers=Object.fromEntries(response.headers);let image:any=null;
 if(input.binary&&/^image\//.test(headers['content-type']??'')){const size=imageSize(raw);image={sha256:row.sha256,width:size.width,height:size.height,format:headers['content-type'].includes('png')?'png':'jpg',id:'current-source:'+row.sha256};}
 return {status:response.status,header:headers,...(input.binary?{base64:raw.toString('base64'),image}:{data:raw.length?JSON.parse(raw.toString('utf8')):null})};
});
await page.setContent('<style>body{margin:0}</style><canvas id="software-sky" width="390" height="844"></canvas>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
await page.evaluate(nativeExecutor,{metadata:{},assets:[]});
await page.evaluate(()=>{
 const w=globalThis.__controlled,storage=new Map(),port=w.Taro,canvas=document.querySelector('canvas');
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('software WebGL unavailable');
 const draws=[],gpu=new Map(),bindings=new Map();let seq=0;
 for(const [kind,suffix] of [['texture','Texture'],['buffer','Buffer'],['shader','Shader'],['program','Program'],['framebuffer','Framebuffer'],['renderbuffer','Renderbuffer']]){
  const make=gl['create'+suffix].bind(gl),remove=gl['delete'+suffix].bind(gl);gl['create'+suffix]=(...args)=>{const obj=make(...args);gpu.set(obj,{kind,alive:true});return obj;};
  gl['delete'+suffix]=obj=>{const r=gpu.get(obj);if(r)r.alive=false;return remove(obj);};
 }
 for(const name of ['drawArrays','drawElements']){const base=gl[name].bind(gl);gl[name]=(...args)=>{draws.push({kind:name,args,phase:w.phase});return base(...args);};}
 w.gl=gl;w.gpuDraws=draws;w.gpuInventory=()=>[...gpu.values()].filter(r=>r.alive).reduce((sum,r)=>(sum[r.kind]=(sum[r.kind]??0)+1,sum),{});
 w.phase='bootstrap';w.bridgeOutputs=[];w.pendingNativeRequests=0;
 port.getStorageSync=key=>storage.get(key);port.setStorageSync=(key,v)=>storage.set(key,structuredClone(v));port.removeStorageSync=key=>storage.delete(key);
 port.setStorage=async({key,data})=>{storage.set(key,structuredClone(data));return {};};port.getStorageInfoSync=()=>({keys:[...storage.keys()]});
 port.getEnv=()=> 'WEAPP';port.getDeviceInfo=()=>({platform:'devtools'});port.getSystemInfoSync=()=>({windowWidth:390,windowHeight:844,pixelRatio:1,platform:'devtools',SDKVersion:'3.15.0'});
 port.getWindowInfo=()=>({windowWidth:390,windowHeight:844,pixelRatio:1,statusBarHeight:24});port.getMenuButtonBoundingClientRect=()=>({top:28,bottom:60,left:290,right:380,height:32,width:90});
 port.login=async()=>({code:'local:isolated-actual-page-0001'});port.nextTick=fn=>queueMicrotask(fn);port.navigateTo=async({url})=>{w.navigationEvents.push({url});return {};};
 port.navigateBack=async()=>({});port.switchTab=async()=>({});
 port.getCurrentPages=()=>w.nativePage?[w.nativePage]:[];
 port.getCurrentInstance=()=>globalThis.actualSkyPage.getCurrentInstance();
 w.logicalNodes=()=>{const root=globalThis.actualSkyPage?.document.getElementById(w.nativePage?.$taroPath);return root?[root,...root.getElementsByTagName('*')]:[];};
 w.findLogical=s=>w.logicalNodes().find(n=>s.startsWith('#')?n.id===s.slice(1):s.startsWith('.')?n.classList?.contains(s.slice(1)):s.startsWith('[data-control=')?n.props?.['data-control']===s.slice(14,-2):n.nodeName===s);
 w.nativeChrome=[];for(const name of ['setNavigationBarColor','setBackgroundColor'])port[name]=async options=>{w.nativeChrome.push({name,options});return {};};
 port.createSelectorQuery=()=>{const specs=[];let selector='';const query={select(s){selector=s;return query;},boundingClientRect(){specs.push({selector});return query;},fields(o,fn){specs.push({selector,o,fn});return query;},exec(done){
   queueMicrotask(()=>{const api=globalThis.actualSkyPage;const results=specs.map(s=>{
    if(s.o?.node){const node=w.makeCanvasNode();node.getContext=()=>gl;const r={node,width:390,height:844};s.fn?.(r);return r;}
    const exists=!!w.findLogical(s.selector);if(!exists)return null;
    if(s.selector.includes('canvas'))return {top:0,left:0,bottom:844,right:390,width:390,height:844};
    if(s.selector.includes('bottom-controls'))return {top:740,left:8,bottom:836,right:382,width:374,height:96};
    return {top:68,left:8,bottom:112,right:52,width:44,height:44};
   });done?.(results);});return query;}};return query;};
 port.request=o=>{const route=o.url.slice('https://approved.fixture.invalid'.length),record={route,binary:o.responseType==='arraybuffer',completed:false};w.requests.push(record);w.pendingNativeRequests++;let done=false;
  const finish=(reply,error)=>{if(done)return;done=true;record.completed=true;w.pendingNativeRequests--;if(error){record.failed=true;o.fail?.({errMsg:String(error)});return;}
   let data=reply.data;if(o.responseType==='arraybuffer'){data=Uint8Array.from(atob(reply.base64),c=>c.charCodeAt(0)).buffer;if(reply.image)w.offers.set(o.url,{...reply.image,url:route,bytes:data});}
   record.status=reply.status;o.success?.({statusCode:reply.status,data,header:reply.header});};
  Promise.resolve(globalThis.__actualPageHttp({route,binary:record.binary,method:o.method,data:o.data,header:o.header??{},phase:w.phase})).then(r=>finish(r,null),e=>finish(null,e));
  return {abort(){if(done)return;done=true;record.completed=true;record.aborted=true;w.pendingNativeRequests--;o.fail?.({errMsg:'request:fail abort'});},catch(){}};};
 globalThis.__actualSkyPagePort=port;globalThis.__pageFileOwners=[];globalThis.__pageSceneInputs=[];globalThis.__pageCompletedPaints=[];
});
await page.addScriptTag({path:path.join(out,'page-bundle.js')});
const bootstrap=await page.evaluate(async({spotId})=>{
 const api=globalThis.actualSkyPage,w=globalThis.__controlled;
 const localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 const envelope=await api.resolveObservationContext({location:{kind:'FORMAL_SPOT',spotId},localDate});const c=envelope.data;
 // Context starts absent: the complete page must execute its actual lookup and store transition.
 if(api.useAppStore.getState().observationContext!==null)throw Error('unexpected preloaded context');
 const config=api.initialize(),nativePage={...config,route:'sky/detail/index',setData(data,done){w.bridgeOutputs.push(data);done?.();}};
 w.nativePage=nativePage;w.pageConfig=config;w.context=c;w.phase='full-page-cold';
 const route={spotId,contextId:c.contextId,date:c.localDate,selectedAt:c.selectedAtUtc,timezone:c.timezone,dataRevision:'current-test-runtime',locationName:'真实测试正式点'};
 config.onLoad.call(nativePage,route);config.onReady.call(nativePage);config.onShow.call(nativePage);
 return {context:c,route,instanceId:nativePage.$taroPath};
},{spotId:TEST_PUBLISHED_SPOT.spotId});
await save('bootstrap.json',bootstrap);
const inspect=async()=>page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,root=api.document.getElementById(w.nativePage.$taroPath),canvas=w.logicalNodes().find(n=>n.props?.['data-control']==='sky-orientation-canvas');
 return {text:root?.textContent??'',canvas:canvas?.props??null,scene:globalThis.__pageSceneInputs.at(-1)??null,sceneCalls:globalThis.__pageSceneInputs.length,gpuDraws:w.gpuDraws.length,
  contextPresent:!!api.useAppStore.getState().observationContext,queries:api.miniappQueryClient.getQueryCache().getAll().map(q=>({key:q.queryKey,status:q.state.status,fetchStatus:q.state.fetchStatus,hasData:q.state.data!==undefined,error:String(q.state.error)})),
  files:[...w.files].map(([path,b])=>({path,bytes:b.byteLength})),owners:globalThis.__pageFileOwners.map(o=>o.inspect()),images:w.images.map(({image,...r})=>r),
  labels:w.logicalNodes().filter(n=>n.classList?.contains('sky-orientation-catalog-label')).map(n=>({text:n.textContent,aria:n.props.ariaLabel,style:n.style.cssText,left:n.style.left,top:n.style.top})),
  modal:w.logicalNodes().find(n=>n.props?.['data-control']==='sky-object-modal')?.props??null,
  selection:w.logicalNodes().filter(n=>n.classList?.contains('sky-selected-object')).map(n=>({text:n.textContent,props:n.props,style:n.style.cssText})),
  logicalNodes:w.logicalNodes().length,pendingNativeRequests:w.pendingNativeRequests,bridgeOutputs:w.bridgeOutputs.length,gpu:w.gpuInventory()};});
const wait=async(fn:(v:any)=>boolean)=>{for(let i=0;i<240;i++){const v=await inspect();if(fn(v))return v;await new Promise(r=>setTimeout(r,50));}throw Error('bounded complete page wait expired');};
const stablePaint=async(predicate:(v:any)=>boolean)=>{let last='',same=0;return wait(v=>{const key=JSON.stringify([v.scene?.identity,v.scene?.supplement,v.canvas?.['data-sky-presented-view']]);
 const settled=predicate(v)&&v.pendingNativeRequests===0&&v.owners.every(o=>o.running===0&&o.pending===0&&o.reserved===0)&&v.queries.every(q=>q.fetchStatus!=='fetching');
 same=settled&&key===last?same+1:0;last=key;return same>=3;});};
const capturePixels=async(name:string)=>{const pixels=await page.evaluate(()=>{const gl=globalThis.__controlled.gl,b=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,data:Array.from(b),error:gl.getError()};});
 const bytes=Buffer.from(pixels.data);assert.equal(pixels.error,0);assert(new Set(bytes).size>8);await fs.writeFile(path.join(out,name+'.rgba'),bytes,{flag:'wx'});
 await save(name+'-pixels.json',{width:pixels.width,height:pixels.height,sha256:hash(bytes),bytes:bytes.length,orientation:'WebGL bottom-up RGBA'});await page.locator('#software-sky').screenshot({path:path.join(out,name+'.png')});
 await save(name+'-paint.json',await page.evaluate(()=>globalThis.__pageCompletedPaints.at(-1)));};
const coldData=await wait(v=>v.contextPresent&&v.queries.some(q=>q.key[0]==='spot-sky'&&q.hasData)&&v.text.includes('手动查看'));phase.push({name:'context-report-real-page',...coldData});
const clickText=async(text:string)=>page.evaluate(text=>{const api=globalThis.actualSkyPage,nodes=globalThis.__controlled.logicalNodes().filter(n=>n.nodeName==='button');const matches=nodes.filter(n=>n.textContent.trim()===text);if(matches.length!==1)throw Error('actual logical button not unique '+text+':'+matches.length);
 const node=matches[0];if(!node.__handlers.tap?.length)throw Error('actual WEAPP tap listener absent');const dispatched=node.dispatchEvent(api.createEvent('tap'));return {text:node.textContent,props:node.props,dispatched,event:'tap',listeners:node.__handlers.tap.length};},text);
await save('manual-action.json',await clickText('手动查看'));
const coldScene=await stablePaint(v=>v.scene?.supplement>0&&v.canvas?.['data-sky-scene-state']==='READY');phase.push({name:'complete-jsx-cold-painted',...coldScene});
await capturePixels('software-cold');
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='hide-clear';w.pageConfig.onHide.call(w.nativePage);});
await wait(v=>v.owners.every(o=>o.leased===0));await page.evaluate(async()=>{await globalThis.actualSkyPage.clearTemporaryApiCache();});phase.push({name:'complete-page-hidden-clear',...await inspect()});
await page.evaluate(()=>{const w=globalThis.__controlled;w.phase='complete-page-return';w.pageConfig.onShow.call(w.nativePage);});
const partial=await stablePaint(v=>v.sceneCalls>coldScene.sceneCalls&&v.scene?.supplement>0&&v.scene.supplement<coldScene.scene.supplement&&v.canvas?.['data-sky-scene-state']==='READY'&&v.text.includes('重试暗星'));
assert(returnTileFailure);assert.equal(partial.canvas['data-sky-star-count'],8404);phase.push({name:'complete-jsx-return-partial-coarse-preserved',...partial});
await save('retry-action.json',await clickText('重试暗星'));await page.evaluate(()=>{globalThis.__controlled.phase='public-page-retry';});
const returned=await stablePaint(v=>v.sceneCalls>partial.sceneCalls&&v.scene?.supplement===coldScene.scene.supplement&&v.canvas?.['data-sky-scene-state']==='READY'&&!v.text.includes('重试暗星'));phase.push({name:'complete-jsx-public-retry-painted',...returned});
assert(returned.gpuDraws>coldScene.gpuDraws);assert(returned.scene.at===coldScene.scene.at);assert(returned.scene.hash===coldScene.scene.hash);
assert.equal(returned.scene.supplement,coldScene.scene.supplement);assert.notEqual(returned.scene.identity,coldScene.scene.identity);
await capturePixels('software-return');
const picked=await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,snapshot=globalThis.__pageCompletedPaints.at(-1),labels=w.logicalNodes().filter(n=>n.classList?.contains('sky-orientation-catalog-label'));
 const object=snapshot.objects.find(o=>o.kind==='STAR'&&o.x>24&&o.x<366&&o.y>68&&o.y<736&&labels.some(n=>n.textContent===o.displayName));
 if(!object)throw Error('no actual labeled painted star within controlled usable geometry');const label=labels.find(n=>n.textContent===object.displayName);
 const choices=api.pickPaintedSkyObjects(snapshot,{x:object.x,y:object.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash});if(!choices.some(o=>o.reference===object.reference))throw Error('painted label object not in pick candidates');
 if(Math.abs(parseFloat(label.style.left)-object.x)>1e-6||Math.abs(parseFloat(label.style.top)-object.y)>1e-6)throw Error('label/paint mismatch');
 const canvas=w.logicalNodes().find(n=>n.nodeName==='canvas');for(const type of ['touchstart','touchend']){if(!canvas.__handlers[type]?.length)throw Error('actual canvas listener absent '+type);
  canvas.dispatchEvent(api.createEvent({type,touches:type==='touchstart'?[{x:object.x,y:object.y}]:[],changedTouches:[{x:object.x,y:object.y}]}));}
 return {object,choices,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash,label:{text:label.textContent,style:label.style.cssText},events:['touchstart','touchend']};});await save('public-pick-action.json',picked);
if(picked.choices.length>1){await wait(v=>v.text.includes('选择天体'));await save('public-pick-choice.json',await page.evaluate(reference=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,rows=w.logicalNodes().filter(n=>n.classList?.contains('sky-object-choice__row'));
 const matches=rows.filter(n=>n.textContent.includes(reference.replace(':',' ')));if(matches.length!==1)throw Error('actual overlap choice not unique');const node=matches[0];return {rows:rows.map(n=>n.textContent),chosen:node.textContent,dispatched:node.dispatchEvent(api.createEvent('tap'))};},picked.object.reference));}
const selected=await wait(v=>v.modal?.['data-object-reference']===picked.object.reference&&v.selection.length===1&&v.pendingNativeRequests===0&&v.queries.every(q=>q.fetchStatus!=='fetching'));phase.push({name:'actual-canvas-pick-label-selection',...selected});
await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,node=w.logicalNodes().find(n=>n.classList?.contains('sky-object-modal__close'));if(!node)throw Error('actual close button absent');node.dispatchEvent(api.createEvent('tap'));});
await wait(v=>v.modal===null&&v.selection.length===1);
await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide.call(w.nativePage);w.pageConfig.onUnload.call(w.nativePage);await new Promise(r=>setTimeout(r,20));api.miniappQueryClient.clear();await api.clearTemporaryApiCache();});
const final=await inspect();phase.push({name:'unloaded-cleared',...final});
assert(final.owners.length===1);for(const o of final.owners)for(const key of ['entries','leased','bytes','reserved','running','pending','retired'])assert.equal(o[key],0,key);
assert.equal(Object.values(final.gpu).reduce((a:any,b:any)=>a+b,0),0);
const after=await Promise.all(sources.map(row=>bind(row.path)));assert.deepEqual(after,sources);await save('source-bindings-after.json',after);
const baselineAfter={currentSources:await Promise.all(baseline.currentSources.map(row=>bind(row.path))),protected:await Promise.all(baseline.protected.map(row=>bind(row.path)))};
assert.deepEqual(baselineAfter,{currentSources:baseline.currentSources,protected:baseline.protected});await save('current-baseline-after.json',baselineAfter);
await save('scene-inputs.json',await page.evaluate(()=>globalThis.__pageSceneInputs));
await save('phases.json',phase);await save('requests.json',requests);await save('browser-errors.json',errors);assert.equal(errors.length,0);
await save('result.json',{status:'COMPLETE_CURRENT_TARO_JSX_QUERY_PAGE_SOFTWARE_SCENE_DEVELOPMENT',inputs:sources.length,bootstrap,phases:phase.map(({name,scene,sceneCalls,gpuDraws,owners,contextPresent,bridgeOutputs})=>({name,scene,sceneCalls,gpuDraws,owners,contextPresent,bridgeOutputs})),requests:requests.length,
 scope:'Actual complete current SpotSkyPage JSX, installed React/Query Provider/useQuery/resource/forecast Hook, official createReactApp/createPageConfig/page instances/lifecycle and WEAPP component mapping. Actual isolated current HTTP controllers/service, fixture weather/test repository and actual astronomy/assets. Controlled native APIs/selector geometry/MapFS/image callbacks and browser software WebGL; styles pinned but not composed. No native binary/WXML/physical total/full journey/quality/capacity/independent-review claim. No product source edit.'});
console.log(JSON.stringify({status:'COMPLETE_CURRENT_TARO_JSX_QUERY_PAGE_SOFTWARE_SCENE_DEVELOPMENT',inputs:sources.length,requests:requests.length,sceneCalls:returned.sceneCalls}));
}catch(error){let current:any=null;try{current=await page?.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;return {logicalText:api?.document.getElementById(w.nativePage?.$taroPath)?.textContent??null,
 scene:globalThis.__pageSceneInputs,queries:api?.miniappQueryClient.getQueryCache().getAll().map(q=>({key:q.queryKey,status:q.state.status,error:String(q.state.error)})),owners:globalThis.__pageFileOwners?.map(o=>o.inspect()),bridgeOutputs:w?.bridgeOutputs?.length};});}catch{}
 await save('failed.json',{error:String(error),phase,errors,requests,current});throw error;
}finally{await browser?.close();await backend.close();}
