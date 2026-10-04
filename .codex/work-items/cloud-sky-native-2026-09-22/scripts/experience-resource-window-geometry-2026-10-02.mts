/** Only frozen 139-degree condition; actual existing pure window owner, no rendering/network/new views. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {skyArtworkTextureWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
import {skyArtworkViewRayHull} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
let output='output/playwright/cloud-sky-resource-window-geometry-1002-r1';
for(let n=2;;n++){try{await fs.access(path.join(ROOT,output));output=`output/playwright/cloud-sky-resource-window-geometry-1002-r${n}`;}catch{break;}}
const dir=path.join(ROOT,output);await fs.mkdir(dir,{recursive:true});
const previousPath='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
const previous=JSON.parse(await fs.readFile(path.join(ROOT,previousPath),'utf8'));
assert.equal((await bind(previousPath)).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
const row=previous.rows[2],inputs=previous.inputs;
const reportBytes=await fs.readFile(path.join(ROOT,previous.report.path));assert.equal(hash(reportBytes),previous.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const read=async(route:string)=>{const input=inputs.find((i:any)=>i.route===route&&i.transport==='FROZEN_LOCAL_BFF_JSON');assert(input);
 const b=await fs.readFile(path.join(ROOT,input.path));assert.equal(hash(b),input.sha256);return JSON.parse(b.toString());};
const stars=(await read(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`)).data;
const figures=(await read('/v2/sky/constellations')).data;
const at=new Date(raw.context.at).toISOString(),report=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
const frame=resolveConstellationFrame(figures,report.skyScene,at)!;assert(frame);
const wanted=row.ready.hooks.find((h:any)=>h.name==='artwork').wanted;
const view={basis:row.condition.basis,verticalFovDeg:row.condition.fov,center:{x:195,y:422}};
const hull=skyArtworkViewRayHull(view,390,844);
const rows=wanted.map((asset:any)=>{
 const figure=frame.images.find(f=>f.source.id===asset.id)!;assert(figure);assert.equal(figure.source.sha256,asset.sha256);
 const window=skyArtworkTextureWindow(figure.registration,view,390,844,asset.width,asset.height);
 const points=hull?.map(ray=>skyArtworkUvAtDirection(figure.registration,ray))??null;
 return {id:asset.id,sourceSha256:asset.sha256,width:asset.width,height:asset.height,window:window??null,
  fullBytes:asset.width*asset.height*4,residentBytes:window?window.width*window.height*4:asset.width*asset.height*4,
  hullAvailable:Boolean(hull),hullUv:points,uncertainPlane:points?.some(point=>!point)||false};
});
assert.equal(rows.length,28);
const actualSourceBytes=rows.reduce((n:any,r:any)=>n+r.fullBytes,0),currentWindowBytes=rows.reduce((n:any,r:any)=>n+r.residentBytes,0);
const sourceBindings=previous.sourceBindings.filter((r:any)=>r.path.includes('sky-artwork-')||r.path.includes('sky-constellation-')||
 r.path.includes('sky-view-')||r.path.endsWith('sky-stellar-scene.ts')||r.path.endsWith('sky-time-presentation.ts'));
for(const b of sourceBindings)assert.deepEqual(await bind(b.path),b);
await fs.copyFile(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mts.txt'));
await fs.writeFile(path.join(dir,'result.json'),JSON.stringify({status:'BOUND_EXISTING_WINDOW_GEOMETRY',input:await bind(previousPath),
 report:previous.report,sourceBindings,condition:row.condition,view,hull,rows,aggregate:{actualSourceBytes,currentWindowBytes,
 savedBytes:actualSourceBytes-currentWindowBytes,partialWindows:rows.filter((r:any)=>r.window).length},
 limits:'Pure existing owner on exact already-rendered 139-degree inputs, not independent window correctness or new GPU pixels. Alpha bbox candidate is exactly full source for all 28, so intersection cannot improve these current windows. No new camera, source, driver/native memory or quality claim.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:await bind(output+'/result.json'),aggregate:{actualSourceBytes,currentWindowBytes,savedBytes:actualSourceBytes-currentWindowBytes,partialWindows:rows.filter((r:any)=>r.window).length}},null,2));
