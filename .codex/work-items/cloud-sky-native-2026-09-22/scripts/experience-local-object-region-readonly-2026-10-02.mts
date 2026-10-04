import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import vm from 'node:vm';import ts from 'typescript';import {inflateSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {registerSkyArtworkPlane,skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
import {registerSkyScienceOpticalField} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration';
import {exactSkyObservationFrame,skyEquatorialDirectionToEnu} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {unprojectSkyPoint,type SkyVector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),OUT='output/local-object-region-readonly-1002-r1';
assert(!fs.existsSync(path.join(ROOT,OUT)));fs.mkdirSync(path.join(ROOT,OUT));
const read=(p:string)=>fs.readFileSync(path.join(ROOT,p)),sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const json=(p:string)=>JSON.parse(read(p).toString('utf8'));
const bind=(p:string)=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const save=(name:string,v:any)=>fs.writeFileSync(path.join(ROOT,OUT,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const reportPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json',
 catalogPath='packages/astronomy-core/data/opengc-messier-deep-sky.v1.json',
 manifestPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json',
 decoderPath='output/contribution-fbo-independent-1002-r2/executed-script.mts.txt';
const files=[path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/'),reportPath,catalogPath,
 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json',manifestPath,decoderPath,
 'output/playwright/cloud-sky-science-scene-1002-r3/observations.json',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts','apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts','apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts',
 'apps/wechat-miniapp/src/features/sky/sky-view-projection.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-raster-bounds.ts','apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',
 'packages/miniapp-contracts/src/types.ts','packages/miniapp-contracts/src/sky-scene.ts','packages/miniapp-contracts/src/observation-frame.ts',
 'packages/miniapp-contracts/src/stellar-geometry.ts','workers/miniapp-api/src/deep-sky-scene-provider.ts',
 'packages/astronomy-core/src/deep-sky-catalog.ts','packages/astronomy-core/src/deep-sky-catalog-data.ts',
 'data-pipelines/src/opengc-messier-deep-sky-catalog.ts','data-pipelines/deep-sky/image_quality.py','data-pipelines/deep-sky/sdss_gri_tan.py'];
const catalog=json(catalogPath),report=json(reportPath).data,publication=json(manifestPath),
 actual=json('output/playwright/cloud-sky-science-scene-1002-r3/observations.json');
const at=actual.at,observation=exactSkyObservationFrame(report,at);assert(observation,'actual exact observation');
const row=catalog.rows.find((r:any)=>r.objectRef==='M:51');assert(row);
const supplied=report.skyScene.deepSky.catalog.entries.find((r:any)=>r.objectRef===row.objectRef);
assert.equal(supplied.majorAxisArcmin,row.majorAxisArcmin);assert.equal(supplied.minorAxisArcmin,row.minorAxisArcmin);
assert.equal(supplied.positionAngleDeg,row.positionAngleDeg);assert.equal(supplied.raDeg,undefined);
const freeze=(x:any):any=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};freeze(publication);
const rad=Math.PI/180;
// Task-only proposed catalog reference geometry; no production API adopted.
// Dimensions are full axes. PA is north eastwards; this is not band segmentation.
function region(r:any,matrix=observation!.equatorialToEnu){
 if(![r.raDeg,r.decDeg,r.majorAxisArcmin,r.minorAxisArcmin,r.positionAngleDeg].every(v=>typeof v==='number'&&Number.isFinite(v))||
  r.raDeg<0||r.raDeg>=360||Math.abs(r.decDeg)>90||r.majorAxisArcmin<=0||r.minorAxisArcmin<=0||
  r.minorAxisArcmin>r.majorAxisArcmin||r.majorAxisArcmin>=180*60)return null;
 const ra=r.raDeg*rad,dec=r.decDeg*rad,p=r.positionAngleDeg*rad;
 const c:SkyVector=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)],
  e:SkyVector=[-Math.sin(ra),Math.cos(ra),0],n:SkyVector=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
 const major=n.map((v,i)=>Math.cos(p)*v+Math.sin(p)*e[i]!) as unknown as SkyVector;
 const minor=n.map((v,i)=>-Math.sin(p)*v+Math.cos(p)*e[i]!) as unknown as SkyVector;
 const a=Math.tan(r.majorAxisArcmin*rad/120),b=Math.tan(r.minorAxisArcmin*rad/120);
 const ray=(s:number,t:number)=>skyEquatorialDirectionToEnu(matrix,c.map((v,i)=>v+a*s*major[i]!+b*t*minor[i]!) as unknown as SkyVector);
 const plane=registerSkyArtworkPlane(([[0,0,-1,-1],[1,0,1,-1],[0,1,-1,1]] as const).map(([u,v,s,t])=>({uv:[u,v] as const,point:ray(s,t)})));
 return plane?{plane,ray,inside(direction:SkyVector){const uv=skyArtworkUvAtDirection(plane,direction);
  return uv?((2*uv[0]-1)**2+(2*uv[1]-1)**2<=1):null;}}:null;
}
const diagnostic=region(row);assert(diagnostic);const identities:any[]=[];
for(const [s,t] of [[0,0],[1,0],[0,1],[-1,0],[0,-1],[.3,.4],[1.1,0]]){
 const uv=skyArtworkUvAtDirection(diagnostic.plane,diagnostic.ray(s!,t!));assert(uv);
 const error=Math.hypot(uv[0]-(s!+1)/2,uv[1]-(t!+1)/2);assert(error<1e-9);
 identities.push({s,t,uv,error,inside:diagnostic.inside(diagnostic.ray(s!,t!))});
}
assert.equal(region({...row,positionAngleDeg:null}),null);assert.equal(region({...row,minorAxisArcmin:null}),null);
assert.equal(region({...row,minorAxisArcmin:-1}),null);assert.equal(region({...row,raDeg:undefined}),null);
const decoder=ts.createSourceFile('saved-decoder.ts',read(decoderPath).toString('utf8'),ts.ScriptTarget.Latest,true);
const decoderNodes=decoder.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='png'||
 ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(decoder)==='crc32'));
assert.equal(decoderNodes.length,2);const decode=vm.runInNewContext(ts.transpileModule(decoderNodes.map(n=>n.getText(decoder)).join('\n')+'\npng;',
 {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{read,inflateSync,Buffer,assert});
const levels:any={};
for(const level of ['DETAIL','MEDIUM','OVERVIEW']){
 const asset=publication.levels[level],file=path.posix.dirname(manifestPath)+'/'+asset.file;files.push(file);
 assert.equal(sha(read(file)),asset.sha256);assert.equal(read(file).length,asset.bytes);
 const image=decode(file);assert.equal(image.w,512);assert.equal(image.h,512);
 const registration=registerSkyScienceOpticalField(publication,asset,observation);assert(registration);levels[level]={image,registration};
}
const before=files.map(bind);save('inputs-before.json',before);
// Same geometrical UV/four-neighbor selection as the actual GLSL. CPU double
// and decoded encoded bytes are diagnostic, not Float32/GPU or driver proof.
function eligible(level:string,ray:SkyVector){const {image,registration}=levels[level],uv=skyArtworkUvAtDirection(registration,ray);
 if(!uv||uv.some((v:number)=>v<0||v>1))return false;
 const x=Math.floor(uv[0]*512-.5),y=Math.floor(uv[1]*512-.5),clamp=(v:number)=>Math.max(0,Math.min(511,v));
 return [[x,y],[x+1,y],[x,y+1],[x+1,y+1]].every(([xx,yy])=>image.rgba[(clamp(yy!)*512+clamp(xx!))*4+3]===255);
}
const views:any[]=[];
for(const fov of [2.8,.18,.05]){
 const counts={total:390*844,region:0,insideFine:0,insideCoarse:0,insideNoSelected:0,outsideFine:0,outsideCoarse:0,outsideNoSelected:0};
 for(let y=0;y<844;y++)for(let x=0;x<390;x++){
  const ray=unprojectSkyPoint(x+.5,y+.5,actual.basis,390,844,fov);assert(ray);
  const inside=diagnostic.inside(ray);assert.notEqual(inside,null);if(inside)counts.region++;
  const fine=eligible('DETAIL',ray),coarse=!fine&&eligible('OVERVIEW',ray);
  const key=(inside?'inside':'outside')+(fine?'Fine':coarse?'Coarse':'NoSelected');counts[key]++;
 }
 assert(counts.region>0);views.push({fov,primary:'DETAIL',parent:'OVERVIEW',counts});
}
const edgeSupport=identities.map(point=>({s:point.s,t:point.t,
 uv:Object.fromEntries(Object.keys(levels).map(level=>[level,skyArtworkUvAtDirection(levels[level].registration,diagnostic.ray(point.s,point.t))])),
 eligible:Object.fromEntries(Object.keys(levels).map(level=>[level,eligible(level,diagnostic.ray(point.s,point.t))]))}));
const after=files.map(bind);assert.deepEqual(after,before);save('inputs-after.json',after);
save('result.json',{status:'PASS_READONLY_GEOMETRY_DIAGNOSTIC',scope:'task prototype + actual shared raw plane/registration/inverse; CPU selection over real PNG availability; no production/GPU/readability adoption',
 at,observation,row,reportEntry:supplied,scienceCenter:publication.center,catalog:{total:catalog.rows.length,
  complete:catalog.rows.filter((r:any)=>region(r)).length,missingMinor:catalog.rows.filter((r:any)=>r.minorAxisArcmin===null).map((r:any)=>r.objectRef),
  missingPA:catalog.rows.filter((r:any)=>r.positionAngleDeg===null).map((r:any)=>r.objectRef)},identities,edgeSupport,views,
 sources:{guide:'https://raw.githubusercontent.com/mattiaverga/OpenNGC/36cb178a0f69dba8bfc03a99c10512831edf1c6b/NGC_guide.txt',
 readme:'https://raw.githubusercontent.com/mattiaverga/OpenNGC/36cb178a0f69dba8bfc03a99c10512831edf1c6b/README.md'},before,after,
 limits:['39 complete shapes are geometry availability, not recognized objects','catalog reference ellipse is not actual optical/IR band segmentation',
  'full axes become tangent half axes in this explicit proposed geometry; not a new adopted image footprint',
  'center field is absent from current report; a source-bound provider/contract addition is needed for exact catalog geometry',
  'selected CPU eligibility uses original bytes and same four-texel rule; no native window/filter/Float32/driver timing acceptance',
  'no threshold, whole-buffer proof, brightness proxy, readback allocation or shared GPU setter introduced']});
console.log(JSON.stringify({status:'PASS_READONLY_GEOMETRY_DIAGNOSTIC',result:bind(OUT+'/result.json'),views}));
