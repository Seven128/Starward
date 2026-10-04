/** Exact saved science function versus current shared owner; no image work. */
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),OUT=path.join(ROOT,'output/prepared-consumer-independent-1003-r2');
const read=(p:string)=>readFileSync(path.join(ROOT,p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),json=(p:string)=>JSON.parse(read(p).toString());
const dir='apps/wechat-miniapp/src/features/sky/',prior='output/playwright/cloud-sky-complete-resource-1003-r2/';
const oldPath=prior+'source-inputs/'+dir+'sky-sdss-science-registration.ts',old=read(oldPath),receipt=json(prior+'inputs.json');
const oldBinding=receipt.sourceBindings.find((r:any)=>r.path===dir+'sky-sdss-science-registration.ts');assert(oldBinding);assert.equal(oldBinding.sha256,sha(old));
const load=(p:string)=>import(pathToFileURL(path.join(ROOT,p)).href),contracts=await load('packages/miniapp-contracts/src/index.ts');
const projection=await load(dir+'sky-artwork-registration.ts'),rotation=await load(dir+'sky-observation-frame.ts'),current=await load(dir+'sky-tan-optical-registration.ts');
const engine=await load('packages/astronomy-core/src/astronomy-engine-runtime.ts');
const ts=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'))('typescript'),exports:any={};
vm.runInNewContext(ts.transpileModule(old.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,require(n:string){const imports:any={'@starward/miniapp-contracts':contracts,'./sky-artwork-registration':projection,'./sky-observation-frame':rotation};assert(n in imports);return imports[n];}});
const pub=json('output/sdss-science-optical-writer-1002-r1/publication/manifest.json'),prepared=json('output/prepared-optical-publication-1003-r4/publication/manifest.json');
const fixture=json(dir+'sky-prepared-optical-registration.fixture.json'),rows:any[]=[];let maxPixelError=0;
for(const [lat,lon,at]of [[22.6,114.5,'2026-09-20T13:00:00Z'],[-35,149,'2026-12-21T05:00:00Z'],[65,-20,'2027-03-21T00:00:00Z']] as const){
 const m=engine.Rotation_EQJ_HOR(new Date(at),new engine.Observer(lat,lon,30)).rot,M=[-m[0][1],-m[1][1],-m[2][1],m[0][0],m[1][0],m[2][0],m[0][2],m[1][2],m[2][2]],frame:any={at,equatorialToEnu:M};
 for(const level of contracts.OPTICAL_IMAGE_LEVELS){const a=pub.levels[level],b=exports.registerSkyScienceOpticalField(pub,a,frame),c=current.registerSkyTanOpticalField(pub,a,frame);
  assert(b&&c);assert.equal(JSON.stringify(b),JSON.stringify(c));
  const pr=current.registerSkyTanOpticalField(prepared,prepared.levels[level],frame);assert(pr);
  for(const r of fixture.rows.filter((x:any)=>x.level===level)){const R=r.raDeg*Math.PI/180,D=r.decDeg*Math.PI/180,eq=[Math.cos(D)*Math.cos(R),Math.cos(D)*Math.sin(R),Math.sin(D)],v=M.map(()=>0).slice(0,3);
   for(let i=0;i<3;i++)v[i]=M[i*3]*eq[0]+M[i*3+1]*eq[1]+M[i*3+2]*eq[2];const uv=projection.skyArtworkUvAtDirection(pr,v as any);assert(uv);maxPixelError=Math.max(maxPixelError,Math.hypot(uv[0]-r.uv[0],uv[1]-r.uv[1])*512);}
  rows.push({lat,lon,at,level,oldCurrentRegistrationExact:true});
 }}
assert(maxPixelError<1e-6);
for(const matrix of [[0,0,0,0,0,0,0,0,0],[-1,0,0,0,1,0,0,0,1]]){
 const frame:any={equatorialToEnu:matrix};assert.equal(exports.registerSkyScienceOpticalField(pub,pub.levels.DETAIL,frame),null);assert.equal(current.registerSkyTanOpticalField(pub,pub.levels.DETAIL,frame),null);}
const bound=[oldPath,prior+'inputs.json',dir+'sky-tan-optical-registration.ts',dir+'sky-sdss-science-registration.ts',dir+'sky-artwork-registration.ts',dir+'sky-observation-frame.ts',dir+'sky-prepared-optical-registration.fixture.json','packages/astronomy-core/src/astronomy-engine-runtime.ts'];
const result={status:'PASS_BOUNDED_EXACT_SCIENCE_TAN_COMPATIBILITY',historicalSource:{...oldBinding,snapshot:oldPath},rows,preparedAstropyRows:81,maxPixelError,
 oldInvalidRotationNullUnchanged:true,scope:'Exact saved raw-plane function/output compatibility and 27 cached Astropy nominal points × three real observer/time frames; not source absolute precision or new Prepared Scene/GPU.',
 bindings:bound.map(p=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)}})};
writeFileSync(path.join(OUT,'tan-compatibility.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});writeFileSync(path.join(OUT,'old-science-registration.ts.txt'),old,{flag:'wx'});
console.log(JSON.stringify({sha256:sha(readFileSync(path.join(OUT,'tan-compatibility.json'))),maxPixelError,oldSourceSha256:sha(old)}));
