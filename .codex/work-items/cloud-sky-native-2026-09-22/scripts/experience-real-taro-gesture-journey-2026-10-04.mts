/** Complete JSX / official page lifecycle / actual Query / real software WebGL. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {createRequire,syncBuiltinESMExports} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),out=path.resolve(root,process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output/playwright'));
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),save=(n:string,v:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const bind=async(p:string)=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:hash(b)};};
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'));
const sources=JSON.parse(await fs.readFile(path.join(out,'source-bindings-before.json'),'utf8'));
for(const row of sources)assert.deepEqual(await bind(row.path),row);
const checkpoint=process.argv[3]??'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-04-r53.json';
assert(/^\.codex\/work-items\/cloud-sky-native-2026-09-22\/evidence\/current-execution-state-[\d-]+-r\d+\.json$/.test(checkpoint));
const baseline=JSON.parse(await fs.readFile(path.join(root,checkpoint),'utf8'));
const allowed=new Set<string>();
const currentBaseline=[];const transitions=[];for(const row of baseline.currentSources){const current=await bind(row.path);
 if(current.sha256!==row.sha256){assert(allowed.has(row.path));transitions.push({before:row,after:current});}else assert.deepEqual(current,row);currentBaseline.push(current);}
for(const row of baseline.protected)assert.deepEqual(await bind(row.path),row);baseline.currentSources=currentBaseline;await save('runtime-input-transitions.json',transitions);
await save('current-baseline-before.json',{currentSources:baseline.currentSources,protected:baseline.protected});
const req=createRequire(path.join(root,'workers/miniapp-api/package.json'));req('reflect-metadata');
const script=await fs.readFile(fileURLToPath(import.meta.url),'utf8');
const direct=[...script.matchAll(/await import\('..\/..\/..\/..\/(workers\/miniapp-api\/src\/[^']+)'\)/g)].map(m=>m[1]);
for(const p of ['controller.ts','miniapp-service.ts','test-fixtures/create-test-service.ts','sao-publication.controller.ts','api-exception.filter.ts'])assert(direct.includes('workers/miniapp-api/src/'+p));
const graph=await req('esbuild').build({stdin:{contents:direct.map(p=>`import '${path.join(root,p).replaceAll('\\','/')}';`).join('\n'),resolveDir:root,sourcefile:'task-backend-graph.ts',loader:'ts'},
 absWorkingDir:root,bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',treeShaking:false,tsconfig:path.join(root,'workers/miniapp-api/tsconfig.json'),logLevel:'silent',
 plugins:[{name:'actual-workspace-packages',setup(b){b.onResolve({filter:/^@starward\//},a=>({path:req.resolve(a.path)}));}}]});
const backendSources=await Promise.all(Object.keys(graph.metafile.inputs).filter(p=>p!=='task-backend-graph.ts').map(p=>bind(p.replaceAll('\\','/'))));
await save('backend-source-bindings-before.json',backendSources);await save('backend-metafile.json',graph.metafile);
const publicReads:any[]=[],promiseFs=req('node:fs/promises'),originalRead=promiseFs.readFile;
promiseFs.readFile=async(...args:any[])=>{const bytes=await originalRead(...args);const p=path.resolve(args[0] instanceof URL?fileURLToPath(args[0]):String(args[0]));
 if(p.startsWith(path.join(root,'workers/miniapp-api/assets')+path.sep)){const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);publicReads.push({path:path.relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});}return bytes;};syncBuiltinESMExports();
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
 w.pageStack=[];w.lifecycleEvents=[];
 w.nodesFor=page=>{const root=globalThis.actualSkyPage?.document.getElementById(page?.$taroPath);return root?[root,...root.getElementsByTagName('*')]:[];};
 w.lifecycle=(p,name,options)=>{w.lifecycleEvents.push({route:p.route,name,phase:w.phase});return p[name].call(p,options);};
 w.makeNativePage=(config,route)=>({...config,route,setData(data,done){w.bridgeOutputs.push({route,data});done?.();}});
 port.login=async()=>({code:'local:isolated-actual-page-0001'});port.nextTick=fn=>queueMicrotask(fn);
 port.navigateTo=async({url})=>{if(!url.startsWith('/sky/sources/index?'))throw Error('task source route unexpected');w.navigationEvents.push({url,action:'navigateTo'});
  const api=globalThis.actualSkyPage,previous=w.pageStack.at(-1);w.lifecycle(previous,'onHide');const config=api.createSourcesPage(),source=w.makeNativePage(config,'sky/sources/index');w.sourcesPage=source;w.pageStack.push(source);w.nativePage=source;
  const params=Object.fromEntries(new URL(url,'https://approved.fixture.invalid').searchParams);w.lifecycle(source,'onLoad',params);w.lifecycle(source,'onReady');w.lifecycle(source,'onShow');return {};};
 port.navigateBack=async()=>{if(w.pageStack.length!==2)throw Error('source Back has no actual prior page');const source=w.pageStack.pop();w.navigationEvents.push({action:'navigateBack',route:source.route});w.lifecycle(source,'onHide');w.lifecycle(source,'onUnload');w.nativePage=w.pageStack.at(-1);w.lifecycle(w.nativePage,'onShow');return {};};
 port.switchTab=async()=>{throw Error('unexpected fallback tab in source Back');};
 port.getCurrentPages=()=>[...w.pageStack];
 port.getCurrentInstance=()=>globalThis.actualSkyPage.getCurrentInstance();
 w.logicalNodes=()=>w.nodesFor(w.nativePage);
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
 const config=api.initialize(),nativePage=w.makeNativePage(config,'sky/detail/index');w.skyPage=nativePage;w.pageStack.push(nativePage);
 w.nativePage=nativePage;w.pageConfig=config;w.context=c;w.phase='full-page-cold';
 const route={spotId,contextId:c.contextId,date:c.localDate,selectedAt:c.selectedAtUtc,timezone:c.timezone,dataRevision:'current-test-runtime',locationName:'真实测试正式点'};
 config.onLoad.call(nativePage,route);config.onReady.call(nativePage);config.onShow.call(nativePage);
 return {context:c,route,instanceId:nativePage.$taroPath};
},{spotId:TEST_PUBLISHED_SPOT.spotId});
await save('bootstrap.json',bootstrap);
const inspect=async()=>page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,root=api.document.getElementById(w.skyPage.$taroPath),nodes=w.nodesFor(w.skyPage),canvas=nodes.find(n=>n.props?.['data-control']==='sky-orientation-canvas');
 return {text:root?.textContent??'',canvas:canvas?.props??null,scene:globalThis.__pageSceneInputs.at(-1)??null,sceneCalls:globalThis.__pageSceneInputs.length,gpuDraws:w.gpuDraws.length,
  contextPresent:!!api.useAppStore.getState().observationContext,queries:api.miniappQueryClient.getQueryCache().getAll().map(q=>({key:q.queryKey,status:q.state.status,fetchStatus:q.state.fetchStatus,hasData:q.state.data!==undefined,error:String(q.state.error)})),
  files:[...w.files].map(([path,b])=>({path,bytes:b.byteLength})),owners:globalThis.__pageFileOwners.map(o=>o.inspect()),images:w.images.map(({image,...r})=>r),
  labels:nodes.filter(n=>n.classList?.contains('sky-orientation-catalog-label')).map(n=>({text:n.textContent,aria:n.props.ariaLabel,style:n.style.cssText,left:n.style.left,top:n.style.top})),
  modal:nodes.find(n=>n.props?.['data-control']==='sky-object-modal')?.props??null,
  selection:nodes.filter(n=>n.classList?.contains('sky-selected-object')).map(n=>({text:n.textContent,props:n.props,style:n.style.cssText})),
  activeRoute:w.nativePage?.route,activeText:api.document.getElementById(w.nativePage?.$taroPath)?.textContent??'',stack:w.pageStack.map(p=>p.route),
  logicalNodes:nodes.length,pendingNativeRequests:w.pendingNativeRequests,bridgeOutputs:w.bridgeOutputs.length,gpu:w.gpuInventory()};});
const wait=async(fn:(v:any)=>boolean)=>{for(let i=0;i<240;i++){const v=await inspect();if(fn(v))return v;await new Promise(r=>setTimeout(r,50));}throw Error('bounded complete page wait expired');};
const stablePaint=async(predicate:(v:any)=>boolean)=>{let last='',same=0;return wait(v=>{const key=JSON.stringify([v.scene?.identity,v.scene?.supplement,v.canvas?.['data-sky-presented-view']]);
 const settled=predicate(v)&&v.pendingNativeRequests===0&&v.owners.every(o=>o.running===0&&o.pending===0&&o.reserved===0)&&v.queries.every(q=>q.fetchStatus!=='fetching');
 same=settled&&key===last?same+1:0;last=key;return same>=3;});};
const capturePixels=async(name:string)=>{const pixels=await page.evaluate(()=>{const gl=globalThis.__controlled.gl,b=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,data:Array.from(b),error:gl.getError()};});
 const bytes=Buffer.from(pixels.data);assert.equal(pixels.error,0);assert(new Set(bytes).size>8);await fs.writeFile(path.join(out,name+'.rgba'),bytes,{flag:'wx'});
 await save(name+'-pixels.json',{width:pixels.width,height:pixels.height,sha256:hash(bytes),bytes:bytes.length,orientation:'WebGL bottom-up RGBA'});await page.locator('#software-sky').screenshot({path:path.join(out,name+'.png')});
 await save(name+'-paint.json',await page.evaluate(()=>{const s=globalThis.__pageCompletedPaints.at(-1);const compact=m=>!m?null:m.kind==='transition'?{kind:m.kind,opacity:m.opacity,background:compact(m.background),foreground:compact(m.foreground)}:{...m,...(m.alpha?{alpha:{kind:m.alpha.constructor.name,bytes:m.alpha.byteLength},opaqueFromRow:{kind:m.opaqueFromRow.constructor.name,bytes:m.opaqueFromRow.byteLength}}:{})};return {...s,view:{...s.view,landscape:compact(s.view?.landscape)}};}));};
const coldData=await wait(v=>v.contextPresent&&v.queries.some(q=>q.key[0]==='spot-sky'&&q.hasData)&&v.text.includes('手动查看'));phase.push({name:'context-report-real-page',...coldData});
const clickText=async(text:string)=>page.evaluate(text=>{const api=globalThis.actualSkyPage,nodes=globalThis.__controlled.logicalNodes().filter(n=>n.nodeName==='button');const matches=nodes.filter(n=>n.textContent.trim()===text);if(matches.length!==1)throw Error('actual logical button not unique '+text+':'+matches.length);
 const node=matches[0];if(!node.__handlers.tap?.length)throw Error('actual WEAPP tap listener absent');const dispatched=node.dispatchEvent(api.createEvent('tap'));return {text:node.textContent,props:node.props,dispatched,event:'tap',listeners:node.__handlers.tap.length};},text);
await save('manual-action.json',await clickText('手动查看'));
const coldScene=await stablePaint(v=>v.scene?.supplement>0&&v.canvas?.['data-sky-scene-state']==='READY');phase.push({name:'complete-jsx-cold-painted',...coldScene});
await capturePixels('software-cold');
// Original public Canvas events; no camera setter, no rewritten page effect.
const gestureActions:any[]=[];
const touches=(distance:number)=>[{x:195-distance/2,y:422},{x:195+distance/2,y:422}];
const dispatchTouch=async(type:string,points:any[],changed:any[]=points)=>{
 const action=await page.evaluate(({type,points,changed})=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,n=w.logicalNodes().find(n=>n.nodeName==='canvas');
 if(!n?.__handlers[type]?.length)throw Error('original canvas gesture listener missing '+type);
 return {type,touches:points,changedTouches:changed,dispatched:n.dispatchEvent(api.createEvent({type,touches:points,changedTouches:changed})),phase:w.phase};},{type,points,changed});gestureActions.push(action);return action;};
const viewOf=(v:any)=>JSON.parse(v.canvas['data-sky-presented-view']);
const gestureFrame=async(name:string)=>{const v=await stablePaint(v=>v.canvas?.['data-sky-scene-state']==='READY');phase.push({name,...v});
 const facts=await page.evaluate(()=>{const s=globalThis.__pageCompletedPaints.at(-1),m=s.view?.landscape;return {frameAt:s.frameAt,catalogVersion:s.catalogVersion,catalogHash:s.catalogHash,basis:s.view.basis,fov:s.view.verticalFovDeg,center:s.view.center,
 landscape:m?{kind:m.kind,opacity:m.opacity??1,resource:m.resource?.id,alphaBytes:m.alpha?.byteLength??m.foreground?.alpha?.byteLength??0}:null,objects:s.objects.length};});
 await save(name+'-facts.json',facts);return {v,facts};};
await page.evaluate(()=>{globalThis.__controlled.phase='public-pinch-full-sphere';});
await dispatchTouch('touchstart',touches(280));
for(const distance of [120,60,30,10]){await dispatchTouch('touchmove',touches(distance));await gestureFrame('pinch-distance-'+distance);}
await dispatchTouch('touchend',[],touches(10));
const wide=await gestureFrame('public-numerical-full-sphere');assert(wide.facts.fov>180);assert(wide.facts.basis.forward[2]>.999999);
await capturePixels('software-full-sphere');
await page.evaluate(()=>{globalThis.__controlled.phase='public-pan-below-horizon-and-reverse';});
await dispatchTouch('touchstart',[{x:195,y:650}]);
const traversed:any[]=[];
for(let y=625;y>=75;y-=25){await dispatchTouch('touchmove',[{x:195,y}]);const f=await gestureFrame('pan-y-'+y);traversed.push({y,...f.facts});
 if(f.facts.landscape?.opacity===0)break;}
assert(traversed.some(f=>f.basis.forward[2]<0),'actual completed camera never crossed below horizon');
assert(traversed.some(f=>f.basis.forward[2]<-.26),'actual camera never reached the full fade zone');
assert(traversed.some(f=>f.landscape?.opacity===0),'actual completed landscape mask did not fade away');
await capturePixels('software-below-horizon');
const belowPick=await page.evaluate(()=>{const s=globalThis.__pageCompletedPaints.at(-1),api=globalThis.actualSkyPage;const visible=s.objects.filter(o=>o.x>20&&o.x<370&&o.y>68&&o.y<736);
 return {frameAt:s.frameAt,landscapeOpacity:s.view.landscape?.opacity,objects:visible.map(o=>({reference:o.reference,x:o.x,y:o.y,choices:api.pickPaintedSkyObjects(s,{x:o.x,y:o.y,frameAt:s.frameAt,catalogVersion:s.catalogVersion,catalogHash:s.catalogHash}).map(c=>c.reference)}))};});
assert(belowPick.objects.length>0,'faded landscape did not reveal a usable real painted object');assert(belowPick.objects.every(o=>o.choices.includes(o.reference)));
await save('below-horizon-painted-pick.json',belowPick);
for(const point of [...traversed].reverse().slice(1).map(f=>({x:195,y:f.y})).concat([{x:195,y:650}])){await dispatchTouch('touchmove',[point]);await gestureFrame('reverse-y-'+point.y);}
const reversed=await gestureFrame('public-pan-reversed-home');
for(const axis of ['right','up','forward'])for(let j=0;j<3;j++)assert(Math.abs(reversed.facts.basis[axis][j]-wide.facts.basis[axis][j])<1e-9,'reverse camera mismatch');
await capturePixels('software-reversed-home');
await dispatchTouch('touchcancel',[],[{x:195,y:650}]);const cancelled=await gestureFrame('public-pan-cancelled');
assert.equal(cancelled.facts.fov,wide.facts.fov);
for(const axis of ['right','up','forward'])for(let j=0;j<3;j++)assert(Math.abs(cancelled.facts.basis[axis][j]-wide.facts.basis[axis][j])<1e-9,'cancel camera mismatch');
await page.evaluate(()=>{globalThis.__controlled.phase='public-pinch-return-local';});
const returnDistance=10*Math.tan(wide.facts.fov*Math.PI/720)/Math.tan(45*Math.PI/720);
assert(returnDistance<350&&returnDistance>10);
await dispatchTouch('touchstart',touches(10));await dispatchTouch('touchmove',touches(returnDistance));await dispatchTouch('touchend',[],touches(returnDistance));
const localReturn=await gestureFrame('public-local-return-restored');assert(Math.abs(localReturn.facts.fov-45)<1e-9);
const journeyCold=localReturn.v;await capturePixels('software-local-return');
await save('public-gesture-actions.json',gestureActions);await save('pan-forward-traversal.json',traversed);

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
await page.evaluate(()=>{globalThis.__controlled.phase='actual-sources-page';});
await wait(v=>v.text.includes('来源与许可')&&v.queries.some(q=>q.key[0]==='celestial-object-information'&&q.hasData));
await save('source-open-action.json',await clickText('来源与许可'));
const source=await wait(v=>v.activeRoute==='sky/sources/index'&&v.activeText.includes('来源与许可')&&v.activeText.includes('BSC')&&v.pendingNativeRequests===0&&v.owners.every(o=>o.leased===0&&o.running===0));
phase.push({name:'actual-source-jsx-shown-sky-hidden',...source});assert.deepEqual(source.stack,['sky/detail/index','sky/sources/index']);assert.equal(Object.values(source.gpu).reduce((a:any,b:any)=>a+b,0),0);
await page.evaluate(()=>{globalThis.__controlled.phase='actual-source-public-back';});
await save('source-back-action.json',await page.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled,nodes=w.logicalNodes().filter(n=>n.nodeName==='button'&&n.props.ariaLabel==='返回');
 if(nodes.length!==1)throw Error('actual Source public Back not unique');const node=nodes[0];return {route:w.nativePage.route,dispatched:node.dispatchEvent(api.createEvent('tap')),aria:node.props.ariaLabel};}));
const returned=await stablePaint(v=>v.activeRoute==='sky/detail/index'&&v.stack.length===1&&v.sceneCalls>coldScene.sceneCalls&&v.scene?.supplement===journeyCold.scene.supplement&&v.canvas?.['data-sky-scene-state']==='READY'&&v.selection.length===1);
phase.push({name:'actual-source-back-sky-painted-selection-restored',...returned});assert.equal(returned.scene.at,journeyCold.scene.at);assert.equal(returned.scene.hash,journeyCold.scene.hash);assert.deepEqual(JSON.parse(returned.canvas['data-sky-presented-view']),JSON.parse(journeyCold.canvas['data-sky-presented-view']));
await capturePixels('software-return');
await save('actual-navigation.json',await page.evaluate(()=>{const w=globalThis.__controlled;return {navigation:w.navigationEvents,lifecycle:w.lifecycleEvents,sourceRootRemoved:!globalThis.actualSkyPage.document.getElementById(w.sourcesPage.$taroPath),sameCurrentSkyInstance:w.nativePage===w.skyPage};}));
await page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.pageConfig.onHide.call(w.nativePage);w.pageConfig.onUnload.call(w.nativePage);await new Promise(r=>setTimeout(r,20));api.miniappQueryClient.clear();await api.clearTemporaryApiCache();});
const final=await inspect();phase.push({name:'unloaded-cleared',...final});
assert(final.owners.length===1);for(const o of final.owners)for(const key of ['entries','leased','bytes','reserved','running','pending','retired'])assert.equal(o[key],0,key);
assert.equal(Object.values(final.gpu).reduce((a:any,b:any)=>a+b,0),0);
const after=await Promise.all(sources.map(row=>bind(row.path)));assert.deepEqual(after,sources);await save('source-bindings-after.json',after);
const backendAfter=await Promise.all(backendSources.map(row=>bind(row.path)));assert.deepEqual(backendAfter,backendSources);await save('backend-source-bindings-after.json',backendAfter);
promiseFs.readFile=originalRead;syncBuiltinESMExports();const uniquePublicReads=[...new Map(publicReads.map(row=>[row.path,row])).values()];
for(const row of uniquePublicReads)assert.deepEqual(await bind(row.path),row);await save('public-asset-read-bindings.json',{reads:publicReads,unique:uniquePublicReads});
const baselineAfter={currentSources:await Promise.all(baseline.currentSources.map(row=>bind(row.path))),protected:await Promise.all(baseline.protected.map(row=>bind(row.path)))};
assert.deepEqual(baselineAfter,{currentSources:baseline.currentSources,protected:baseline.protected});await save('current-baseline-after.json',baselineAfter);
await save('scene-inputs.json',await page.evaluate(()=>globalThis.__pageSceneInputs));
await save('phases.json',phase);await save('requests.json',requests);await save('browser-errors.json',errors);assert.equal(errors.length,0);
await save('result.json',{status:'ACTUAL_TARO_PUBLIC_GESTURE_SOURCE_BACK_SOFTWARE_DEVELOPMENT',inputs:sources.length,bootstrap,phases:phase.map(({name,scene,sceneCalls,gpuDraws,owners,contextPresent,bridgeOutputs})=>({name,scene,sceneCalls,gpuDraws,owners,contextPresent,bridgeOutputs})),requests:requests.length,
 scope:'Actual complete current SpotSkyPage JSX, installed React/Query Provider/useQuery/resource/forecast Hook, official createReactApp/createPageConfig/page instances/lifecycle and WEAPP component mapping. Actual isolated current HTTP controllers/service, fixture weather/test repository and actual astronomy/assets. Controlled native APIs/selector geometry/MapFS/image callbacks and browser software WebGL; styles pinned but not composed. No native binary/WXML/physical total/full journey/quality/capacity/independent-review claim. No product source edit.'});
console.log(JSON.stringify({status:'ACTUAL_TARO_PUBLIC_GESTURE_SOURCE_BACK_SOFTWARE_DEVELOPMENT',inputs:sources.length,requests:requests.length,sceneCalls:returned.sceneCalls}));
}catch(error){let current:any=null;try{current=await page?.evaluate(()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;return {logicalText:api?.document.getElementById(w.nativePage?.$taroPath)?.textContent??null,
 scene:globalThis.__pageSceneInputs,queries:api?.miniappQueryClient.getQueryCache().getAll().map(q=>({key:q.queryKey,status:q.state.status,error:String(q.state.error)})),owners:globalThis.__pageFileOwners?.map(o=>o.inspect()),bridgeOutputs:w?.bridgeOutputs?.length};});}catch{}
 await save('failed.json',{error:String(error),phase,errors,requests,current});throw error;
}finally{promiseFs.readFile=originalRead;syncBuiltinESMExports();await browser?.close();await backend.close();}
