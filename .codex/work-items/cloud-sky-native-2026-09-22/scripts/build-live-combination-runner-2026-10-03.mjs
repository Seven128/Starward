/** New affected live time/layer/failure combination; no old cold matrix replay. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
let s=fs.readFileSync(path.join(dir,'experience-live-mixed-api-scene-2026-10-03.mts'),'utf8');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,100));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r42.json','current-execution-state-2026-10-03-r43.json');
once('client<3','client<1');
once('w.Taro.getEnv=()=>',`w.Taro.setStorage=async({key,data}:any)=>{await Promise.resolve();storage.set(key,structuredClone(data));return {errMsg:'setStorage:ok'};};
   w.Taro.getEnv=()=>`);
once("Promise.resolve((globalThis as any).__liveHttp",`const held=w.holdDetail&&route.includes('/v2/sky/sdss-optical/')&&route.endsWith('/M-51-detail.jpg');
    if(held){w.holdDetail=false;record.held=true;w.heldTransfers.push({fail(){record.controlledCallbackFailure=true;finish(null,new Error('task native delivery failure'));}});}
    Promise.resolve((globalThis as any).__liveHttp`);
once(')).then(result=>finish(result,null),error=>finish(null,error));',')).then(result=>{if(held)record.actualHttpCompletedBeforeDelivery=true;else finish(result,null);},error=>finish(null,error));');
once("w.stable={current,figures:figures.data,at,positions:{0:position}};w.reportEnvelope=report;w.objectTracking=null;",`const positions:any={0:position};
  for(const seconds of [1,60]){const instant=new Date(Date.parse(at)+seconds*1000).toISOString();
   positions[seconds]=await api.getCelestialObjectPosition({reference:'M:51',...current.context,at:instant},current.skyScene.deepSky.catalog);
   if(positions[seconds].data.at!==instant)throw Error('live position time mismatch');}
  w.stable={current,figures:figures.data,at,positions};w.reportEnvelope=report;w.objectTracking=null;`);
once('const ordinaryPromises=[bootstrap(pages[1],1),bootstrap(pages[2],2)];','const ordinaryPromises:any[]=[];');
const begin=s.indexOf(' const conditions=['),end=s.indexOf(' const sceneRows:',begin);assert(begin>0&&end>begin);
s=s.slice(0,begin)+` const conditions=[
  {name:'live-landscape-centre-fade',pose:[0,80,0],fov:85,reference:null},
  {name:'live-full-sphere',pose:[0,80,0],fov:'DOME',reference:null},
  {name:'live-layers-off',pose:[0,135,0],fov:45,reference:null,wideFieldEnabled:false,constellationsEnabled:false,landscapeEnabled:false},
  {name:'live-layers-return',pose:[0,135,0],fov:45,reference:null,wideFieldEnabled:false},
  {name:'live-refinement-failure-retry',target:'M:51',fov:.05,reference:'M:51',refinement:true},
  {name:'live-tracking-current',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0},
  {name:'live-tracking-one-second',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:1},
  {name:'live-tracking-one-minute',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:60},
  {name:'live-tracking-cancel-time',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0}];
 save('conditions.json',{conditions,scope:'Only newly affected live HTTP layer/fade/refinement/time combinations. Existing r2 Source Back/hide and r3 cold overlap kept separately. One renderer, no ordinary overlap or full native journey claim.'});
`+s.slice(end);
once('const bounded={...row,passes};',`const actualFacts=await page.evaluate(()=>{const w=globalThis.__controlled,landscape=w.paintedSkyObjectsRef.current?.view?.landscape;
   return {landscape:landscape?{kind:landscape.kind,opacity:landscape.opacity??1}:null,tracking:w.objectTracking.snapshot(),acceptedAt:w.presentedSkyFrame?.frameAt};});
  const bounded={...row,passes,actualFacts};`);
once("status:'LIVE_CURRENT_API_PAGE_SCENE_WITH_ORDINARY_OVERLAP_DEVELOPMENT'", "status:'LIVE_CURRENT_API_COMBINATION_DEVELOPMENT'");
once("scope:'One current real software renderer plus two isolated ordinary clients.","scope:'One current real software renderer; no ordinary clients in this new combination lane. Explicit controlled native delivery failure after dispatching actual HTTP, not server/network failure proof. Live time positions at0/1/60sec; existing temporal/tracking/layer/page/Scene owners.");
once('Five conditions do not repeat full R5 matrix','New affected conditions do not repeat old cold/source/hide or full R5 matrix');
fs.writeFileSync(path.join(dir,'experience-live-combination-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-live-combination-2026-10-03.mts',productionChanged:false}));
