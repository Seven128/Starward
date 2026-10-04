/** Thirteen source-bound local probes in one saved view, not an area scan,
 * readability test, absence certificate or rendered/pre-aid GPU observation. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import ts from 'typescript';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const out=path.join(root,'output/pre-aid-local-samples-1003-r1');
fs.mkdirSync(out);
const script=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts.txt'));
const read=(p:string)=>fs.readFileSync(path.join(root,p));
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=read(p);return {path:p,bytes:b.length,sha256:hash(b)};};
const json=(p:string)=>JSON.parse(read(p).toString());
const save=(p:string,v:unknown)=>fs.writeFileSync(path.join(out,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const reportPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json';
const catalogPath='packages/astronomy-core/data/opengc-messier-deep-sky.v1.json';
const manifestPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
const cameraPath='output/playwright/cloud-sky-science-scene-1002-r3/observations.json';
const decoderPath='output/contribution-fbo-independent-1002-r2/executed-script.mts.txt';
const entry=`export {registerSkyDeepSkyRegion,skyDeepSkyRegionCoordinates} from './apps/wechat-miniapp/src/features/sky/sky-deep-sky-region';
export {registerSkyScienceOpticalField} from './apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration';
export {skyArtworkUvAtDirection} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration';
export {exactSkyObservationFrame,skyEquatorialDirectionToEnu} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
export {projectSkyDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
export {deepSkyAuxiliaryOpacity} from './apps/wechat-miniapp/src/features/sky/sky-deep-auxiliary-visibility';`;
try {
 const bundle=await build({absWorkingDir:root,stdin:{contents:entry,loader:'ts',resolveDir:root,sourcefile:'pre-aid-local-samples-entry.ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json')});
 fs.writeFileSync(path.join(out,'actual-entry.ts.txt'),entry,{flag:'wx'});
 fs.writeFileSync(path.join(out,'bundle.mjs'),bundle.outputFiles[0]!.text,{flag:'wx'});
 save('metafile.json',bundle.metafile);
 const owner=await import(pathToFileURL(path.join(out,'bundle.mjs')).href);
 const report=json(reportPath).data,publication=json(manifestPath),camera=json(cameraPath),catalog=json(catalogPath);
 const at=camera.at,observation=owner.exactSkyObservationFrame(report,at);assert(observation);
 const original=catalog.rows.find((r:any)=>r.objectRef==='M:51');assert(original);
 const cached=report.skyScene.deepSky.catalog.entries.find((r:any)=>r.objectRef===original.objectRef);assert(cached);
 assert.equal(cached.icrsCenter,undefined);
 const supplied={...cached,icrsCenter:{raDeg:original.raDeg,decDeg:original.decDeg}};
 const region=owner.registerSkyDeepSkyRegion(supplied,observation);assert(region);
 const decoderFile=ts.createSourceFile('saved-decoder.ts',read(decoderPath).toString(),ts.ScriptTarget.Latest,true);
 const decoderNodes=decoderFile.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='png'||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(decoderFile)==='crc32'));
 assert.equal(decoderNodes.length,2);
 const decode=vm.runInNewContext(ts.transpileModule(decoderNodes.map(n=>n.getText(decoderFile)).join('\n')+'\npng;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{read,inflateSync,Buffer,assert});
 const levels:any={};const imageFiles:string[]=[];
 for(const level of ['OVERVIEW','MEDIUM','DETAIL']) {
  const asset=publication.levels[level],p=path.posix.dirname(manifestPath)+'/'+asset.file;
  assert.equal(hash(read(p)),asset.sha256);assert.equal(read(p).length,asset.bytes);
  const image=decode(p);assert.equal(image.w,512);assert.equal(image.h,512);
  const registration=owner.registerSkyScienceOpticalField(publication,asset,observation);assert(registration);
  levels[level]={image,registration};imageFiles.push(p);
 }
 const files=new Set([script,reportPath,catalogPath,manifestPath,cameraPath,decoderPath,...imageFiles,'tools/run-node.cjs',
  'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts','apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
  'apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts']);
 for(const p of Object.keys(bundle.metafile!.inputs)) if(p!=='pre-aid-local-samples-entry.ts') files.add(path.relative(root,path.resolve(root,p)).replaceAll('\\','/'));
 const require=createRequire(path.join(root,'package.json'));
 for(const name of ['typescript','esbuild','tsx']){files.add(path.relative(root,require.resolve(name)).replaceAll('\\','/'));files.add(path.relative(root,require.resolve(name+'/package.json')).replaceAll('\\','/'));}
 const before=[...files].sort().map(bind);save('bindings-before.json',before);
 for(const p of files){assert(!path.isAbsolute(p)&&!p.startsWith('../'));const dest=path.join(out,'source-inputs',p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,p),dest);}
 const rad=Math.PI/180,ra=original.raDeg*rad,dec=original.decDeg*rad,pa=original.positionAngleDeg*rad;
 const c=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)],e=[-Math.sin(ra),Math.cos(ra),0],n=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
 const a=Math.tan(original.majorAxisArcmin*rad/120),b=Math.tan(original.minorAxisArcmin*rad/120);
 const rayAt=(s:number,t:number)=>owner.skyEquatorialDirectionToEnu(observation.equatorialToEnu,c.map((v,i)=>v+a*s*(Math.cos(pa)*n[i]!+Math.sin(pa)*e[i]!)+b*t*(-Math.sin(pa)*n[i]!+Math.cos(pa)*e[i]!)));
 const sourceAt=(level:string,ray:any)=> {
  const {image,registration}=levels[level],uv=owner.skyArtworkUvAtDirection(registration,ray);
  if(!uv||uv.some((v:number)=>v<0||v>1))return {state:'outside-field',uv,rgba:null};
  const x=uv[0]*512-.5,y=uv[1]*512-.5,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  const clamp=(v:number)=>Math.max(0,Math.min(511,v));
  const pixel=(xx:number,yy:number)=>[...image.rgba.slice((clamp(yy)*512+clamp(xx))*4,(clamp(yy)*512+clamp(xx))*4+4)];
  const stencil=[pixel(x0,y0),pixel(x0+1,y0),pixel(x0,y0+1),pixel(x0+1,y0+1)];
  const rgba=[0,1,2,3].map(i=>stencil[0]![i]!*(1-fx)*(1-fy)+stencil[1]![i]!*fx*(1-fy)+stencil[2]![i]!*(1-fx)*fy+stencil[3]![i]!*fx*fy);
  return {state:stencil.every(p=>p[3]===255)?'four-neighbor-full-alpha':'incomplete-stencil',uv,stencilAlpha:stencil.map(p=>p[3]),rgba};
 };
 const view={basis:camera.basis,verticalFovDeg:2.8,width:390,height:844};
 // Placements are descriptive probes, not core segmentation, a policy cutoff,
 // sampling-area weights or an exhaustive view/object support measurement.
 const placements=[[0,0],[.1,0],[-.1,0],[0,.1],[0,-.1],[.5,0],[-.5,0],[0,.5],[0,-.5],[1,0],[-1,0],[0,1],[0,-1]];
 const probes=placements.map(([s,t])=>{
  const ray=rayAt(s!,t!),coordinates=owner.skyDeepSkyRegionCoordinates(region,ray);assert(coordinates);
  const altitudeDeg=Math.asin(ray[2]/Math.hypot(...ray))/rad,azimuthDeg=((Math.atan2(ray[0],ray[1])/rad)%360+360)%360;
  const projection=owner.projectSkyDirection(azimuthDeg,altitudeDeg,view.basis,view.width,view.height,view.verticalFovDeg);
  const sources=Object.fromEntries(Object.keys(levels).map(level=>[level,sourceAt(level,ray)]));
  const selected=sources.DETAIL.state==='four-neighbor-full-alpha'?'DETAIL':sources.OVERVIEW.state==='four-neighbor-full-alpha'?'OVERVIEW':null;
  return {s,t,coordinates,geometricDomain:(s! ** 2 + t! ** 2) === 1?'declared-boundary-UNKNOWN':'interior-probe',projection,sources,
   diagnosticPrimary:'DETAIL',diagnosticParent:'OVERVIEW',selected,
   selectedEncodedContribution:selected?Math.max(...sources[selected].rgba!.slice(0,3))/255:null};
 });
 assert(probes.every(p=>p.projection));assert(probes.some(p=>p.selected==='DETAIL'));assert(probes.some(p=>p.selected==='OVERVIEW'));
 const distribution=Object.fromEntries(['DETAIL','OVERVIEW'].map(level=>{const values=probes.filter(p=>p.geometricDomain==='interior-probe'&&p.selected===level).map(p=>p.selectedEncodedContribution!);return[level,{observedInteriorProbes:values.length,encodedMin:Math.min(...values),encodedMax:Math.max(...values),encodedMean:values.reduce((a,b)=>a+b,0)/values.length}];}));
 const after=[...files].sort().map(bind);assert.deepEqual(after,before);save('bindings-after.json',after);
 save('result.json',{status:'READ_ONLY_POINT_OBSERVATIONS',scope:'one saved view / three unchanged source PNGs / thirteen rays; no area grid or GPU',at,view,reportCenterAbsent:true,explicitSourceBoundCenter:supplied.icrsCenter,region,probes,distribution,
  legacyCandidateOpacity:owner.deepSkyAuxiliaryOpacity(view.verticalFovDeg,view.height,cached.majorAxisArcmin,true),toolchain:{node:process.version,nodeExecutable:process.execPath,typescriptAstVersion:ts.version,esbuild:require('esbuild/package.json').version,tsx:require('tsx/package.json').version},before,after,
  limits:['new contract center explicitly comes from pinned original catalog, not historical report enrichment','DETAIL/OVERVIEW is an explicit diagnostic pair, not normal request policy','MEDIUM source bytes observed independently, not chosen by the diagnostic pair','encoded sample RGB is not actual pre-aid weighted photo, post-composition contrast, readability or default adoption','positive source samples cannot certify replacement of catalog aids; zero/unsampled region cannot certify absence or EMPTY','declared exact ellipse boundaries are UNKNOWN despite CPU point rounding; no numerical padding or GPU precision proof','probe placements have no meaning as core segmentation or policy parameters','no image editing, asset acquisition, region grid replay, software GPU, native runtime or performance claim']});
 console.log(JSON.stringify({status:'READ_ONLY_POINT_OBSERVATIONS',result:bind('output/pre-aid-local-samples-1003-r1/result.json'),distribution,probes:probes.length,bindings:before.length}));
} catch(error) {save('failed.json',{status:'FAILED',message:error instanceof Error?error.stack:String(error)});throw error;}
