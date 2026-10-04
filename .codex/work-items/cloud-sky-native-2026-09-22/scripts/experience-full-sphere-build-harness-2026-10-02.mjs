// Historical initial skeleton generator. The subsequently repaired standalone
// full-sphere composition/solar-continuity .mts scripts own reproducible runs;
// this initial transformation does not recreate their final assertions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='.codex/work-items/cloud-sky-native-2026-09-22/scripts/';
let source=await fs.readFile(base+'experience-wide-resource-composition-2026-10-02.mts','utf8');
function replace(before,after){assert(source.includes(before),before.slice(0,100));source=source.replace(before,after);}
replace("import {skySolarLightAt}","import {resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';\nimport {skyLandscapeViewOpacity} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-visibility.ts';\nimport {skySolarLightAt}");
replace("const compare=process.argv.includes('--after');",'const compare=false;');
replace("const nativeMatch=process.argv.includes('--native-match');",'const nativeMatch=false;');
replace("const output=baselineOutput+(compare?'-after':'');",`let output=path.resolve('output/playwright/cloud-sky-full-sphere-1002');
for(let suffix=1;;suffix++){try{await fs.access(output);output=path.resolve('output/playwright/cloud-sky-full-sphere-1002-'+suffix);}catch(error){if(error.code==='ENOENT')break;throw error;}}`);
const jsonStart=source.indexOf('const json=async(route:string)=>{');
const jsonEnd=source.indexOf('const reportBytes=',jsonStart);
assert(jsonStart>=0&&jsonEnd>jsonStart);
source=source.slice(0,jsonStart)+`const prior=JSON.parse(await fs.readFile(path.join(metadataOutput,'result.json'),'utf8'));
const json=async(route:string)=>{
  const record=prior.inputs.find((row:any)=>row.route===route);assert(record&&record.transport==='CURRENT_LOCAL_BFF_JSON');
  const index=prior.inputs.indexOf(record)+1,file=path.join(metadataOutput,'input-'+index+'.json');
  const bytes=await fs.readFile(file);assert.equal(sha(bytes),record.sha256);
  inputs.push({...record,path:file,transport:'FROZEN_CURRENT_BFF_JSON'});return JSON.parse(bytes.toString());
};
`+source.slice(jsonEnd);
replace("const raw=projectAdoptedSkyCatalog", "assert.equal(sha(reportBytes),prior.report.sha256);\nconst raw=projectAdoptedSkyCatalog");
const caseStart=source.indexOf('const cases:any[]=['),caseEnd=source.indexOf('const prepared=cases.map',caseStart);
assert(caseStart>=0&&caseEnd>caseStart);
source=source.slice(0,caseStart)+`const sdss=JSON.parse(await fs.readFile('workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json','utf8'));
const currentWithStars=attachSkyCatalog(current,stars),currentStarFrame=resolveSkySceneFrame(currentWithStars.skyScene,at)!;
const lowerStar=currentStarFrame.points!.map(point=>({point,entry:stars.entries[point[0]]})).filter(row=>
  row.point[2]<-1&&row.point[2]>-12&&row.entry.magnitude<3).sort((a,b)=>a.entry.magnitude-b.entry.magnitude)[0];
assert(lowerStar,'saved genuine lower star required');
const heading=lowerStar.point[1];
const cases:any[]=[];
for(const mode of ['DAY','OBSERVATION'])for(const [index,altitude]of [30,0,-5,-15,-45,0,30].entries())
  cases.push({name:'path-'+mode.toLowerCase()+'-'+index+'-alt'+altitude,at,fov:45,basis:createSkyViewBasis(heading,90+altitude,0)!,mode});
cases.push({name:'offset-rolled-lower',at,fov:85,basis:createSkyViewBasis(heading,60,27)!,center:{x:145,y:477}});
cases.push({name:'wide-lower-w3',at,fov:139,basis:createSkyViewBasis(heading,45,0)!,w3:true});
cases.push({name:'dome-full',at,fov:274.9,basis:createSkyViewBasis(0,180,0)!,w3:true});
cases.push({name:'dome-full-red',at,fov:274.9,basis:createSkyViewBasis(0,180,0)!,mode:'OBSERVATION'});
const starCondition={at,fov:5,basis:createSkyViewBasis(heading,90+lowerStar.point[2],0)!,targetReference:lowerStar.entry.objectRef};
for(const [name,extra]of [['lower-star-auto',{}],['lower-star-without-points',{noStars:true}],
  ['lower-star-force-opaque',{groundOpacity:1}],['lower-star-force-partial',{groundOpacity:.5}],['lower-star-force-zero',{groundOpacity:0}]])
  cases.push({name,...starCondition,...extra});
for(const body of ['MOON','SUN','SATURN']){
  const row=raw.hourly.find(row=>body==='MOON'?row.moonAltitudeDeg!<-15:body==='SUN'?row.sunAltitudeDeg!<-15:
    row.planets?.some(p=>p.body===body&&p.altitudeDeg<-15));assert(row,'saved real lower '+body);
  const object=body==='MOON'?{azimuth:row.moonAzimuthDeg,altitude:row.moonAltitudeDeg}:body==='SUN'?{azimuth:row.sunAzimuthDeg,altitude:row.sunAltitudeDeg}:
    {azimuth:row.planets!.find(p=>p.body===body)!.azimuthDeg,altitude:row.planets!.find(p=>p.body===body)!.altitudeDeg};
  for(const legacyGpu of [false,true])cases.push({name:body.toLowerCase()+'-lower'+(legacyGpu?'-legacy-gpu':''),at:row.at,
    fov:body==='SATURN'?.05:2.4,basis:createSkyViewBasis(object.azimuth!,90+object.altitude!,0)!,
    altitude:object.altitude,targetReference:body==='MOON'?'SOLAR:MOON':body==='SUN'?'SOLAR:SUN':'PLANET:SATURN',legacyGpu,ground:false});
}
let lowerOptical:any;
for(const row of raw.hourly){const report=attachSkyCatalog(presentSkyTime(raw,row.at)!.report,stars),deep=resolveSkyDeepSkyScene(report.skyScene,row.at)!;
  const index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:51'),point=deep.frame.points!.find(point=>point[0]===index);
  if(point&&point[2]<-15){lowerOptical={at:row.at,basis:createSkyViewBasis(point[1],90+point[2],0)!,altitude:point[2],targetReference:'M:51'};break;}}
assert(lowerOptical);
for(const legacyGpu of [false,true])cases.push({name:'m51-lower-optical'+(legacyGpu?'-legacy-gpu':''),...lowerOptical,
  fov:.08,optical:'DETAIL',coarser:true,legacyGpu,ground:false});
const observer=exactSkyObservationFrame(currentWithStars,at)!;assert(observer);
const eqBasis=createSkyViewBasis(22,45,0)!,rotate=(ray:readonly number[])=>[0,1,2].map(row=>observer.equatorialToEnu[row*3]*ray[0]+observer.equatorialToEnu[row*3+1]*ray[1]+observer.equatorialToEnu[row*3+2]*ray[2]);
const antipodeBasis={right:rotate(eqBasis.right),up:rotate(eqBasis.up),forward:rotate(eqBasis.forward)};
cases.push({name:'hips-antipode-all',at,fov:45,basis:antipodeBasis,w3:true,allW3:true,ground:false,forceW3:true});
cases.push({name:'hips-antipode-only-facing',at,fov:45,basis:antipodeBasis,w3:true,onlyW3:[8],ground:false,forceW3:true});
cases.push({name:'hips-antipode-only-opposite',at,fov:45,basis:antipodeBasis,w3:true,onlyW3:[2],ground:false,forceW3:true});
`+source.slice(caseEnd);
replace("const w3Active=condition.w3&&mode!=='OBSERVATION'&&condition.fov>=60&&solar&&solar.altitudeDeg<=-12;", "const w3Active=condition.forceW3||(condition.w3&&mode!=='OBSERVATION'&&condition.fov>=60&&solar&&solar.altitudeDeg<=-12);");
replace("const w3Pixels=compare?candidatePixels.filter(pixel=>\n    skyHipsTileIntersectsView(0,pixel,observation!.equatorialToEnu,view,width,height)):candidatePixels;", "const w3Pixels=condition.onlyW3??(condition.allW3?Array.from({length:12},(_,pixel)=>pixel):candidatePixels.filter(pixel=>\n    skyHipsTileIntersectsView(0,pixel,observation!.equatorialToEnu,view,width,height)));" );
replace("export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';", "export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';export {unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';export {skyLandscapeViewOpacity} from './apps/wechat-miniapp/src/features/sky/sky-landscape-visibility';");
replace("await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});", "await page.evaluate('globalThis.__name=target=>target');\n  const legacyProduction=await fs.readFile(path.join(metadataOutput,'production.js'),'utf8');\n  assert.equal(sha(legacyProduction),prior.productionBundleSha256);\n  await page.addScriptTag({content:legacyProduction.replace('var bodyComposition','var legacyComposition')});\n  await page.addScriptTag({content:production});");
replace("const failures:string[]=[],renderer=input.api.createSkyGpuRenderer", "const failures:string[]=[],renderer=(condition.legacyGpu?(globalThis as any).legacyComposition:input.api).createSkyGpuRenderer");
replace("const atlas=new Map(condition.wanted", `const draws:any[]=[];
      for(const name of ['sun','moon','planet','saturnRings','artwork','skyImageMesh']){const original=renderer[name].bind(renderer);
        renderer[name]=(...values:any[])=>{const result=original(...values);draws.push({name,image:name==='artwork'||name==='skyImageMesh'?input.ids.get(values[0]):null,
          body:values[0]?.body??null,success:result,vertices:name==='skyImageMesh'?values[1].length/4:null});return result;};}
      if(condition.noStars){const original=renderer.disc.bind(renderer);renderer.disc=(...values:any[])=>{if(values[6]!=='star')original(...values);};}
      if(condition.groundOpacity!==undefined){const original=renderer.landscape.bind(renderer);renderer.landscape=(...values:any[])=>original(...values.slice(0,4),condition.groundOpacity);}
      const atlas=new Map(condition.wanted`);
replace("35:{horizontal:true,equatorial:false}", "35:{horizontal:false,equatorial:false}");
replace("34:{enabled:true,panorama,mask:input.masks.get(resource.id)}", "34:{enabled:condition.ground!==false,panorama,mask:input.masks.get(resource.id)}");
replace("uploads=[];peakBytes=liveBytes;input.api.drawSkyScene(...args);gl.finish();", "uploads=[];draws.length=0;peakBytes=liveBytes;const started=performance.now();input.api.drawSkyScene(...args);const cpuMs=performance.now()-started;gl.finish();const softwareCompletedMs=performance.now()-started;");
replace("passes.push({pass,uploads:[...uploads],liveBytes,peakBytes,", "passes.push({pass,cpuMs,softwareCompletedMs,draws:[...draws],uploads:[...uploads],liveBytes,peakBytes,");
replace("const result={passes,sourceBytes", `if(condition.groundOpacity!==undefined&&snapshot.view.landscape)snapshot={...snapshot,view:{...snapshot.view,landscape:{...snapshot.view.landscape,opacity:condition.groundOpacity}}};
      const lowerObjects=snapshot.objects.filter((object:any)=>input.api.unprojectSkyPoint(object.x,object.y,condition.basis,width,height,condition.fov,condition.center)?.[2]<0);
      const target=snapshot.objects.find((object:any)=>object.reference===condition.targetReference);
      const pick=target?input.api.pickPaintedSkyObjects(snapshot,{x:target.x,y:target.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}).map((object:any)=>object.reference):[];
      const result={passes,draws:[...draws],lowerReferences:lowerObjects.map((object:any)=>object.reference),target:target??null,pick,
        effectiveGroundOpacity:condition.ground===false?null:condition.groundOpacity??input.api.skyLandscapeViewOpacity({basis:condition.basis,verticalFovDeg:condition.fov,center:condition.center},width,height),sourceBytes`);
replace("moonRadiusPx:condition.moonRadiusPx,figureCount:", "moonRadiusPx:condition.moonRadiusPx,altitude:condition.altitude??null,legacyGpu:condition.legacyGpu??false,noStars:condition.noStars??false,groundOpacity:condition.groundOpacity??null,targetReference:condition.targetReference??null,figureCount:");
const oldCheckStart=source.indexOf('  if(!nativeMatch){\n    assert.equal(rows.find'),oldCheckEnd=source.indexOf("  await fs.writeFile(path.join(output,'result.json')",oldCheckStart);
assert(oldCheckStart>=0&&oldCheckEnd>oldCheckStart);
source=source.slice(0,oldCheckStart)+`  const comparisons=[];
  const comparePixels=async(left:string,right:string)=>{const a=await fs.readFile(path.join(output,left+'.rgba')),b=await fs.readFile(path.join(output,right+'.rgba'));assert.equal(a.length,b.length);
    let changedPixels=0,maxDelta=0;for(let index=0;index<a.length;index+=4){let changed=false;for(let channel=0;channel<4;channel++){const delta=Math.abs(a[index+channel]-b[index+channel]);maxDelta=Math.max(maxDelta,delta);changed ||=delta>0;}if(changed)changedPixels++;}
    const row={left,right,changedPixels,maxDelta};comparisons.push(row);return row;};
  for(const mode of ['day','observation']){assert.equal((await comparePixels('path-'+mode+'-0-alt30','path-'+mode+'-6-alt30')).changedPixels,0);
    assert.equal((await comparePixels('path-'+mode+'-1-alt0','path-'+mode+'-5-alt0')).changedPixels,0);}
  for(const name of ['moon','sun','saturn','m51'])assert((await comparePixels(name==='m51'?'m51-lower-optical':name+'-lower',name==='m51'?'m51-lower-optical-legacy-gpu':name+'-lower-legacy-gpu')).changedPixels>0,'real below-horizon pixels versus legacy GPU '+name);
  assert((await comparePixels('lower-star-auto','lower-star-without-points')).changedPixels>0);
  for(const name of ['partial','zero'])assert((await comparePixels('lower-star-force-opaque','lower-star-force-'+name)).changedPixels>0);
  assert.equal((await comparePixels('hips-antipode-all','hips-antipode-only-facing')).changedPixels,0,'opposite faces cannot cover a valid face');
  const lower=rows.find(row=>row.name==='lower-star-auto');assert(lower.lowerReferences.includes(lowerStar.entry.objectRef));assert(lower.pick.includes(lowerStar.entry.objectRef));
  assert.equal(rows.find(row=>row.name==='lower-star-force-opaque').pick.includes(lowerStar.entry.objectRef),false);
  assert.equal(rows.find(row=>row.name==='lower-star-force-zero').pick.includes(lowerStar.entry.objectRef),true);
  for(const name of ['moon','sun','saturn','m51']){const row=rows.find(row=>row.name===(name==='m51'?'m51-lower-optical':name+'-lower'));assert(row.target&&row.pick.includes(row.targetReference),name+' lower identity pick');}
  assert(rows.find(row=>row.name==='saturn-lower').draws.some(row=>row.name==='saturnRings'&&row.success));
  assert.deepEqual(rows.find(row=>row.name==='hips-antipode-only-opposite').submittedPixels,[]);
  for(const record of sourceHashes)assert.equal(sha(await fs.readFile(record.path)),record.sha256,'production changed during harness '+record.path);
  console.log(JSON.stringify({phase:'verified',output,lowerStar:{reference:lowerStar.entry.objectRef,point:lowerStar.point,magnitude:lowerStar.entry.magnitude},comparisons}));
`+source.slice(oldCheckEnd);
replace("report:{path:task", "comparisons,lowerStar:{reference:lowerStar.entry.objectRef,point:lowerStar.point,magnitude:lowerStar.entry.magnitude},legacyBundle:{path:path.join(metadataOutput,'production.js'),sha256:prior.productionBundleSha256},report:{path:task");
replace("scope:'Real current production scene with bound original published images and saved report: fixed-body browsing, W3 wide/dome selection versus actual submitted triangles, SDSS coarse/fine composition, and logical WebGL transfer/copy/retirement. All images are predecoded by the software harness; selected source RGBA is a model, not native/driver/OS allocation, network concurrency, native frame time, full journey, SAO/deep-image performance or target acceptance.'", "scope:'Current production complete software-GPU scenes with immutable local original image/publication bytes and frozen real report: full-sphere return paths, actual lower star/body/optical identities, fading/opaque/partial/zero ground controls, and real-frame HiPS antipode geometry. Legacy renderer and suppressed-star cases are explicit counterfactuals; forced opacity cases amend snapshot mask to the actual forced pass only inside this harness. Images are predecoded; source/GPU allocations and Chromium SwiftShader CPU/completion timings are logical development models, not native/driver/OS memory, network, physical gestures, real-device performance, complete journey or final quality acceptance.'");
await fs.writeFile(base+'experience-full-sphere-composition-2026-10-02.mts',source,{flag:'wx'});
console.log('Generated frozen-input full-sphere harness.');
