/** Complete current JSX through the installed WEAPP React bridge, not extracted page effects. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),app=path.join(root,'apps/wechat-miniapp');
const out=path.resolve(root,process.argv[2]);assert.equal(path.dirname(out),path.join(root,'output/playwright'));await fs.mkdir(out,{recursive:false});
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const save=(n:string,v:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-build.mts'));
// Later, affected page lanes pass their current checkpoint explicitly; historical lanes remain frozen.
const checkpoint='.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-page-current-inputs-2026-10-04.json';
assert.equal(checkpoint,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-page-current-inputs-2026-10-04.json');
const cp=JSON.parse(await fs.readFile(path.join(root,checkpoint),'utf8'));await save('checkpoint-origin.json',await bind(checkpoint));await save('delivery-constant-source.json',await bind('apps/wechat-miniapp/config/index.ts'));
const allowed=new Set(['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx']);
const transitions=[];for(const row of [...cp.currentSources,...cp.protected]){const current=await bind(row.path);
 if(current.sha256!==row.sha256){assert(allowed.has(row.path)&&!cp.protected.some(p=>p.path===row.path));transitions.push({before:row,after:current});}else assert.deepEqual(current,row);}
await save('authorised-input-transitions.json',transitions);
const req=createRequire(path.join(app,'package.json')),observed:any[]=[];
const entry=`import '@tarojs/plugin-platform-weapp/dist/runtime';
import React from 'react';import * as Renderer from '@tarojs/react';
import {QueryClientProvider} from '@tanstack/react-query';
import {createReactApp} from '@tarojs/plugin-framework-react/dist/runtime';
import {Current,document,createPageConfig,getPageInstance,safeExecute,createEvent,eventHandler,nextTick,getCurrentInstance} from '@tarojs/runtime';
import {SpotSkyPage} from './src/features/sky/spot-sky-page';
import CelestialSourcesPage from './src/sky/sources';
import MapPage from './src/pages/map/index';
import {miniappQueryClient} from './src/services/query-client';
import {useAppStore} from './src/state/app-store';
export * from './src/services/api-client';export * from './src/services/sky-public-image-runtime';
export {pickPaintedSkyObjects} from './src/features/sky/sky-object-picking';
export {React,Renderer,Current,document,getPageInstance,safeExecute,createEvent,eventHandler,nextTick,getCurrentInstance,miniappQueryClient,useAppStore};
export function initialize(){
 function TaskApp({children}){return React.createElement(QueryClientProvider,{client:miniappQueryClient},children);}
 const config=createReactApp(TaskApp,React,Renderer,{appId:'sky-task-app'});Current.app=config;
 config.onLaunch({});return createPageConfig(MapPage,'map-task-page');
}
let skySequence=0;export function createSkyPage(){return createPageConfig(()=>React.createElement(SpotSkyPage,{targetOpticalPublication:{kind:'prepared-display-optical-v1',reference:'M:82',publicationHash:'97bd0d5b1ebb48e47cb147d273838f79566ea9f72f2bbfa446c2e73fd3736b9c',artworkContributions:{auxiliaryBytesLimit:15803512,maxGroups:1}}}),'sky-task-page-'+(++skySequence));}
export function createSourcesPage(){return createPageConfig(CelestialSourcesPage,'sky-sources-task-page');}
`;
try{
const result=await build({stdin:{contents:entry,resolveDir:app,sourcefile:'task-real-taro-page.ts',loader:'ts'},
 absWorkingDir:root,bundle:true,write:false,metafile:true,platform:'browser',format:'iife',globalName:'actualSkyPage',target:'es2022',
 tsconfig:path.join(app,'tsconfig.json'),jsx:'automatic',logLevel:'silent',
 define:{global:'globalThis','process.env.TARO_VERSION':'"4.2.1"','process.env.TARO_ENV':'"weapp"','process.env.TARO_PLATFORM':'"mini"','process.env.FRAMEWORK':'"react"','process.env.SUPPORT_TARO_POLYFILL':'"disabled"','process.env.NODE_ENV':'"development"',
 ENABLE_INNER_HTML:'true',ENABLE_ADJACENT_HTML:'false',ENABLE_SIZE_APIS:'false',ENABLE_TEMPLATE_CONTENT:'false',ENABLE_CLONE_NODE:'false',ENABLE_CONTAINS:'false',ENABLE_MUTATION_OBSERVER:'false',
 __DELIVERY_TARGET__:'"target-miniapp-field-signal-i21-selected-constraint-2026-09-03"',__MINIAPP_API_BASE__:'"https://approved.fixture.invalid"',__MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',
 __MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'true',__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:'false',__MINIAPP_SKY_FEEDBACK_ID__:'""'},
 plugins:[{name:'app-edition-and-official-weapp-entry',setup(b){
  b.onLoad({filter:/\.scss$/},async a=>{const raw=await fs.readFile(a.path);observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(raw),scope:'Styles pinned but not applied to controlled Taro logical tree; no CSS/WXML composition proof.'});return {contents:'',loader:'js'};});
  b.onResolve({filter:/^(?:react(?:\/.*)?|@tanstack\/(?:react-query|query-core))$/},a=>({path:req.resolve(a.path)}));
  b.onResolve({filter:/^@tarojs\/components$/},()=>({path:req.resolve('@tarojs/plugin-platform-weapp/dist/components-react.js')}));
  b.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'native-page',namespace:'controlled-native'}));
  b.onLoad({filter:/.*/,namespace:'controlled-native'},()=>({contents:`import * as pageHooks from '@tarojs/plugin-framework-react/dist/runtime';
export {useDidHide,useDidShow,useReady,useResize,useRouter,useLoad,useUnload} from '@tarojs/plugin-framework-react/dist/runtime';
const port=globalThis.__actualSkyPagePort;
for(const key of ['useDidHide','useDidShow','useReady','useResize','useRouter','useLoad','useUnload'])port[key]=pageHooks[key];
export default port;`,loader:'ts',resolveDir:app}));

  b.onLoad({filter:/[\\/]use-sky-target-optical\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function useSkyTargetOptical<'));
   const s=raw.replace('export function useSkyTargetOptical<','function originalUseSkyTargetOptical<')+
    '\nexport function useSkyTargetOptical(...args:Parameters<typeof originalUseSkyTargetOptical>){const value=originalUseSkyTargetOptical(...args),w=globalThis.__controlled;w.sdssHook={kind:args[0],reference:args[1],fov:args[2],active:args[5],pin:args[6],requested:value.requested,loading:value.loading,updateFailed:value.updateFailed,status:value.status,renderedLevel:value.renderedLevel,publicationHash:value.publication?.publicationHash,imageVersion:value.publication?.imageVersion,image:value.image?w.imageInfo(value.image):null,coarser:value.coarser?{level:value.coarser.level,image:w.imageInfo(value.coarser.image)}:null};return value;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Read-only original common optical Hook result, body/return/React execution preserved.'});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]use-sky-wide-field-w3\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');const needle='  return {tiles,publication,loading:';assert(raw.includes(needle));
   const s=raw.replace(needle,'  globalThis.__recordW3Hook?.({wantedWide,at,fov:view?.verticalFovDeg,sunAltitude:sun?.altitudeDeg,selection:selection?{state:selection.state,order:selection.order,pixels:selection.pixels}:null,wanted:wanted.map(a=>({...a})),loaded:tiles.map(t=>({pixel:t.pixel,...globalThis.__controlled.imageInfo(t.image)})),publicationHash:publication?.publicationHash,loading:wantedWide&&(manifest.isFetching||images.loading),failed:wantedWide&&(manifest.isError||Boolean(manifest.refreshError)||images.failed)});\n'+needle);
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]spot-sky-page\.tsx$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');const needle='onClick={() => { if (orientationController.commit()) setSkyControlPanel(null); }}';assert(raw.split(needle).length===2);
   const s=raw.replace(needle,'onClick={(() => { const handler = () => { if (orientationController.commit()) setSkyControlPanel(null); }; globalThis.__recordOriginalSkyConfirm?.(handler); return handler; })()}');
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Original confirm closure body preserved/returned to actual JSX; read-only retention of that exact callback for queued-expiry simulation, not a reused logical node or direct controller call.'});return {contents:s,loader:'tsx'};
  });
  b.onLoad({filter:/[\\/]sky-orientation-controller\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function createSkyOrientationController('));
   const s=raw.replace('export function createSkyOrientationController(','function originalCreateSkyOrientationController(')+
    '\nexport function createSkyOrientationController(options:Parameters<typeof originalCreateSkyOrientationController>[0]){const changed=options.changed;const owner=originalCreateSkyOrientationController({...options,changed:next=>{globalThis.__recordOriginalOrientationSnapshot?.(next);changed(next);}});globalThis.__pageOrientationOwners.push(owner);return owner;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Original controller body preserved; only read-only snapshot owner and actual changed payload diagnostic.'});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]device-orientation-view\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function createDeviceOrientationViewTracker('));
   const s=raw.replace('export function createDeviceOrientationViewTracker(','function originalCreateDeviceOrientationViewTracker(')+
    '\nexport function createDeviceOrientationViewTracker(...args:Parameters<typeof originalCreateDeviceOrientationViewTracker>){const owner=originalCreateDeviceOrientationViewTracker(...args),update=owner.updateMotion;owner.updateMotion=(...v)=>{const frame=update(...v);globalThis.__recordOriginalRawPose?.({input:v[0],at:v[1],frame});return frame;};return owner;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s)),scope:'Original tracker body/update preserved; actual accepted raw pose diagnostic before presentation filtering.'});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function createSkyPublicImageCache('));
   const s=raw.replace('export function createSkyPublicImageCache(','function actualSkyPublicImageCache(')+
    '\nexport function createSkyPublicImageCache(...args:Parameters<typeof actualSkyPublicImageCache>){const owner=actualSkyPublicImageCache(...args);globalThis.__pageFileOwners.push(owner);return owner;}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-artwork-loader\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function registerSkyNativeImageLifetime('));
   const s=raw.replace('export function registerSkyNativeImageLifetime(','function originalRegisterSkyNativeImageLifetime(')+
    '\nexport function registerSkyNativeImageLifetime(image:object,current:()=>boolean){const remove=originalRegisterSkyNativeImageLifetime(image,current);const entry=globalThis.__recordNativeImageRegistration(image);return ()=>{entry.retired=true;remove();};}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-scene-render\.ts$/},async a=>{
   const raw=await fs.readFile(a.path,'utf8');assert(raw.includes('export function drawSkyScene('));
   const s=raw.replace('export function drawSkyScene(','function actualDrawSkyScene(')+
    '\nexport function drawSkyScene(...args:Parameters<typeof actualDrawSkyScene>){globalThis.__pageSceneInputs.push({at:args[2],width:args[5],height:args[6],mode:args[7],fov:args[10],supplement:args[16]?.points.length??0,hash:args[16]?.publicationHash??null,identity:globalThis.__controlled.identity(args[16]),reportContext:args[1]?.context,baseState:args[1]?.skyScene.state});const publish=args[8];args[8]=(snapshot,sources)=>{globalThis.__pageCompletedPaints.splice(0,globalThis.__pageCompletedPaints.length,snapshot);globalThis.__recordCompletedSkySources?.(sources);return publish?.(snapshot,sources);};return globalThis.__recordActualSkyScene(args,actualDrawSkyScene);}\n';
   observed.push({path:path.relative(root,a.path).replaceAll('\\','/'),originalSha256:hash(Buffer.from(raw)),diagnosticSha256:hash(Buffer.from(s))});return {contents:s,loader:'ts'};
  });
 }}]});
await save('metafile.json',result.metafile);const virtual='apps/wechat-miniapp/task-real-taro-page.ts';assert(Object.hasOwn(result.metafile!.inputs,virtual));
const inputs=[];
for(const key of Object.keys(result.metafile!.inputs)){if(key===virtual||key==='controlled-native:native-page')continue;inputs.push(await bind(key.replaceAll('\\','/')));}
assert(!inputs.some(p=>/^node_modules\/(?:react\/|@tanstack\/)/.test(p.path)));
assert(inputs.some(p=>p.path==='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'));
assert(inputs.some(p=>p.path==='apps/wechat-miniapp/src/hooks/use-forecast-query.ts'));
await save('source-bindings-before.json',inputs);await save('observed-boundaries.json',observed);
await fs.writeFile(path.join(out,'page-bundle.js'),result.outputFiles[0]!.text,{flag:'wx'});
await save('build-result.json',{status:'COMPLETE_CURRENT_TARO_PAGE_JSX_BUILT',inputs:inputs.length,scope:'Actual app React/Query/official framework-page Hook/WEAPP component aliases and complete JSX. Controlled native default API; no extracted page effect or handwritten React/Query implementation. Build alone is not execution or WEAPP/WXML proof.'});
console.log(JSON.stringify({out:path.relative(root,out),inputs:inputs.length}));
}catch(error){await save('build-failed.json',{error:String(error)});throw error;}
