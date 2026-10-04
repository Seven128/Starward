// Task-only display-estimate substitution at the existing Scene surface.
// Source descriptors/PNG bindings remain original. Derived pixels are explicit
// prototype rasters, never passed off as the original Prepared v1 publication.
// Visible-source receipts are deliberately UNKNOWN for this unsupported path.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {assertPreparedOpticalManifest} from '../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'output/playwright/cloud-sky-prepared-display-background-pairs-1004-r1');
const trial=path.join(root,'output/prepared-source-masked-background-1004-r1');
const old=path.join(root,'output/playwright/cloud-sky-noirlab-wide-quality-1004-r1');
const base=path.join(root,'output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82');
await mkdir(out);
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=async(file:string)=>{const b=await readFile(file);return {path:path.relative(root,file).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:unknown)=>writeFile(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const manifestFile=path.join(base,'manifest.json'),raw=await readFile(manifestFile);
assert.equal(sha(raw),'1c99fb46449a4721131d7d7e45a4856d7c77499bd504c175b5ac9e3c0ecbc839');
const publication=JSON.parse(raw.toString());assertPreparedOpticalManifest(publication,'M:82',publication.publicationHash);
const resultFile=path.join(trial,'result.json'),trialResult=JSON.parse(await readFile(resultFile,'utf8'));
assert.equal(trialResult.status,'SINGLE_SOURCE_DISPLAY_BACKGROUND_PROTOTYPE_NOT_ADOPTED');
const files=[fileURLToPath(import.meta.url),manifestFile,resultFile],rasters:Record<string,unknown>={};
for(const level of ['OVERVIEW','MEDIUM','DETAIL']){
 const descriptor=publication.levels[level],sourceFile=path.join(base,descriptor.file),source=await readFile(sourceFile);
 assert.equal(source.length,descriptor.bytes);assert.equal(sha(source),descriptor.sha256);
 const prototypeRecord=trialResult.products.find((p:{level:string})=>p.level===level);
 assert.equal(prototypeRecord.geometricAlphaExact,true);
 const prototypeFile=path.join(root,prototypeRecord.png.path),prototype=await readFile(prototypeFile);
 assert.deepEqual(await bind(prototypeFile),prototypeRecord.png);
 rasters[level]={original:'data:image/png;base64,'+source.toString('base64'),prototype:'data:image/png;base64,'+prototype.toString('base64'),
                  originalIdentity:{bytes:source.length,sha256:sha(source)},prototypeIdentity:prototypeRecord.png};
 files.push(sourceFile,prototypeFile);
}
// Matched original/baseline controls are new at these actual policy/pan conditions.
const protectedRows=JSON.parse(await readFile(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
files.push(...protectedRows.map((row:{path:string})=>path.join(root,row.path)));
const require=createRequire(path.join(root,'apps/wechat-miniapp/package.json'));
const playwrightPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(playwrightPath);
files.push(process.execPath,chromium.executablePath(),require.resolve('typescript/lib/typescript.js'));
const before=await Promise.all(files.map(bind));await save('inputs-before.json',before);
for(const row of protectedRows)assert.equal(before.find(r=>r.path===row.path)?.sha256,row.sha256);
await writeFile(path.join(out,'executed-script.mts'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});
const entry=`
import {OBSERVATION_FRAME_FORMAT} from './packages/miniapp-contracts/src/index';
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyPreparedOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {skyTargetOpticalLevelForFov} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection';
const publication=${JSON.stringify(publication)},rasters=${JSON.stringify(rasters)},images={};
const width=390,height=844,at='2026-10-04T00:00:00.000Z';
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
async function init(){for(const [level,raster] of Object.entries(rasters)){
 images[level]={};for(const kind of ['original','prototype']){
  const image=new Image();image.src=raster[kind];await image.decode();
  if(image.naturalWidth!==512||image.naturalHeight!==512)throw Error('wrong image size');images[level][kind]=image;
 }
}}
function run(condition,mode){
 if(skyTargetOpticalLevelForFov(condition.viewFieldDegrees,publication)!==condition.level)throw Error('fixture outside actual level policy');
 const original=images[condition.level].original,prototype=images[condition.level].prototype;
 const canvas=document.querySelector('canvas');canvas.width=width;canvas.height=height;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('no WebGL');
 const live=new Set(),counts={created:0,deleted:0,maxLive:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
 gl.createTexture=()=>{const x=create();if(x){live.add(x);counts.created++;counts.maxLive=Math.max(counts.maxLive,live.size);}return x;};
 gl.deleteTexture=x=>{if(live.delete(x))counts.deleted++;return remove(x);};
 const currentLevels=[condition.level,...(condition.coarser?[condition.coarser]:[])];
 const unregisters=currentLevels.flatMap(level=>['original','prototype'].map(kind=>registerSkyNativeImageLifetime(images[level][kind],()=>true)));
 const failed=[],renderer=createSkyGpuRenderer(gl,1,{imageFailed:()=>failed.push(condition.level),artworkContributions:{auxiliaryBytesLimit:15803512,maxGroups:1}});
 let actualDraws=0,substitutions=0;
 if(mode==='prototype'){
  const draw=renderer.artworkLevels.bind(renderer);
  renderer.artworkLevels=(levels,view,opacity)=>{
   if(levels.fine?.image!==original)throw Error('unexpected fine slot');
   if((!!levels.coarse)!==(!!condition.coarser))throw Error('unexpected parent presence');
   if(levels.coarse&&levels.coarse.image!==images[condition.coarser].original)throw Error('unexpected parent identity');
   actualDraws++;substitutions+=condition.coarser?2:1;
   return draw({...levels,fine:{...levels.fine,image:prototype},coarse:levels.coarse?{...levels.coarse,image:images[condition.coarser].prototype}:null},view,opacity);
  };
  // The original publication did not publish these pixels. Its source-credit
  // identity cannot be used to certify a transformed final-color frame.
  renderer.artworkLevelsContribution=()=>({completed:false,qualification:{fine:'unknown',coarse:'unknown',any:'unknown'},finePhoto:'unknown',coarsePhoto:'unknown'});
 }
 const report={hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:condition.sunAltitude}],observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at,
  observer:{latitude:22.54,longitude:113.95,elevationM:50},equatorialToEnu:[1,0,0,0,1,0,0,0,1]}],
  skyScene:{state:'UNAVAILABLE',catalog:null,publication:null,frames:[],deepSky:{state:'UNAVAILABLE',catalog:null,frames:[]}},targetFrames:[]};
 const args=[renderer,report,at,null,null,width,height,'NIGHT'];let completed=null,done=0;
 args[8]=(_snapshot,sources)=>{completed=sources.sdssOptical;};args[9]=()=>done++;args[10]=condition.viewFieldDegrees;
 args[12]=createSkyViewBasis((90-publication.center.raDeg+360)%360,90+publication.center.decDeg+condition.cameraNorthOffsetDegrees,0);
 if(mode!=='baseline'){
  args[30]=skyPreparedOpticalFrame({image:original,renderedLevel:condition.level,renderedAsset:publication.levels[condition.level],publication,coarser:condition.coarser?{image:images[condition.coarser].original,level:condition.coarser,asset:publication.levels[condition.coarser]}:null});
  args[31]=()=>failed.push(condition.level);args[37]={surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash};
 }
 drawSkyScene(...args);
 const rgba=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
 const error=gl.getError(),png=canvas.toDataURL('image/png').split(',')[1];
 const completion=completed?{kind:completed.kind,publicationHash:completed.publicationHash}:null;
 renderer.dispose();unregisters.forEach(f=>f());gl.createTexture=create;gl.deleteTexture=remove;
 return {rgba:base64(rgba),png,error,done,failed,completion,actualDraws,substitutions,textureObjects:counts,liveTextureObjects:live.size,
         mode,decodedNativeImages:[{kind:'original',shape:[original.naturalWidth,original.naturalHeight]},{kind:'prototype',shape:[prototype.naturalWidth,prototype.naturalHeight]}]};
}
globalThis.displayBackgroundProbe={init,run};`;
await writeFile(path.join(out,'executed-browser-entry.ts'),entry,{flag:'wx'});
const parsed=new Map<string,Awaited<ReturnType<typeof bind>>>();
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'ts'},absWorkingDir:root,bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,metafile:true,
 plugins:[{name:'bind-original-scene-inputs',setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async args=>{
  const contents=await readFile(args.path,'utf8');parsed.set(args.path,await bind(args.path));const ext=path.extname(args.path).slice(1);
  return {contents,loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js',resolveDir:path.dirname(args.path)};
 });}}]});
const sourceBefore=[...parsed.values()];await save('parsed-inputs.json',sourceBefore);
await writeFile(path.join(out,'executed-browser-bundle.js'),bundle.outputFiles[0].contents,{flag:'wx'});await save('bundle-metafile.json',bundle.metafile);
const launch={executablePath:chromium.executablePath(),headless:true,args:['--use-gl=angle','--use-angle=swiftshader']};
await save('toolchain.json',{node:process.version,typescript:require('typescript/package.json').version,playwright:require(playwrightPath+'/package.json').version,launch});
const browser=await chromium.launch(launch),rows=[],errors:string[]=[];
const conditions=[
 {level:'OVERVIEW',coarser:null,name:'overview-policy-night',phase:'night',sunAltitude:-24,viewFieldDegrees:.25,cameraNorthOffsetDegrees:0},
 {level:'MEDIUM',coarser:'OVERVIEW',name:'medium-over-overview-pan-night',phase:'night',sunAltitude:-24,viewFieldDegrees:.10,cameraNorthOffsetDegrees:.04},
 {level:'DETAIL',coarser:'MEDIUM',name:'detail-over-medium-pan-night',phase:'night',sunAltitude:-24,viewFieldDegrees:.05,cameraNorthOffsetDegrees:.02}
];
let failure:string|undefined;
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.setContent('<!doctype html><canvas style="width:390px;height:844px"></canvas>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>globalThis.displayBackgroundProbe.init());await save('browser.json',{version:browser.version()});
 for(const condition of conditions){
  const baselineActual=await page.evaluate(c=>globalThis.displayBackgroundProbe.run(c,'baseline'),condition);
  assert.equal(baselineActual.error,0);assert.equal(baselineActual.done,1);assert.equal(baselineActual.liveTextureObjects,0);assert.deepEqual(baselineActual.failed,[]);assert.equal(baselineActual.completion,null);
  const originalActual=await page.evaluate(c=>globalThis.displayBackgroundProbe.run(c,'original'),condition);
  assert.equal(originalActual.error,0);assert.equal(originalActual.done,1);assert.equal(originalActual.liveTextureObjects,0);assert.deepEqual(originalActual.failed,[]);assert.equal(originalActual.completion?.kind,'prepared');
  const baseline=Buffer.from(baselineActual.rgba,'base64'),reference=Buffer.from(originalActual.rgba,'base64'),baselineOrigin='new-matched-policy-pan-baseline';
  await writeFile(path.join(out,condition.name+'-baseline.png'),Buffer.from(baselineActual.png,'base64'),{flag:'wx'});
  await writeFile(path.join(out,condition.name+'-original.png'),Buffer.from(originalActual.png,'base64'),{flag:'wx'});
  await writeFile(path.join(out,condition.name+'-original.rgba'),reference,{flag:'wx'});
  const actual=await page.evaluate(c=>globalThis.displayBackgroundProbe.run(c,'prototype'),condition);
  assert.equal(actual.error,0);assert.equal(actual.done,1);assert.equal(actual.liveTextureObjects,0);assert.deepEqual(actual.failed,[]);
  assert.equal(actual.actualDraws,1);assert.equal(actual.substitutions,condition.coarser?2:1);assert.equal(actual.completion,null,'prototype must not claim original publication credit');
  assert.equal(actual.textureObjects.created,actual.textureObjects.deleted);
  const rgba=Buffer.from(actual.rgba,'base64'),png=Buffer.from(actual.png,'base64');
  assert.equal(rgba.length,390*844*4);assert.equal(baseline.length,rgba.length);
  let differentFromBaseline=0,changedFromReference=0;
  for(let i=0;i<rgba.length;i+=4){if(rgba[i]!==baseline[i]||rgba[i+1]!==baseline[i+1]||rgba[i+2]!==baseline[i+2])differentFromBaseline++;
   if(reference&&(rgba[i]!==reference[i]||rgba[i+1]!==reference[i+1]||rgba[i+2]!==reference[i+2]))changedFromReference++;}
  assert(differentFromBaseline>1000);assert(changedFromReference>1000);
  await writeFile(path.join(out,condition.name+'.rgba'),rgba,{flag:'wx'});await writeFile(path.join(out,condition.name+'.png'),png,{flag:'wx'});
  await writeFile(path.join(out,condition.name+'-baseline.rgba'),baseline,{flag:'wx'});
  delete actual.rgba;delete actual.png;
  rows.push({condition,...actual,baselineOrigin,differentFromBaseline,changedFromReference:reference?changedFromReference:null,
             rgba:{bytes:rgba.length,sha256:sha(rgba),rowOrder:'bottom-first'},png:{bytes:png.length,sha256:sha(png)},
             baseline:{bytes:baseline.length,sha256:sha(baseline)},sourceRaster:rasters[condition.level] instanceof Object?{original:rasters[condition.level].originalIdentity,prototype:rasters[condition.level].prototypeIdentity}:null});
 }
}catch(error){failure=String(error);}finally{await browser.close();}
const after=await Promise.all(files.map(bind)),sourceAfter=await Promise.all([...parsed.keys()].map(bind));
await save('inputs-after.json',after);await save('parsed-inputs-after.json',sourceAfter);
const exact=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const result={status:!failure&&errors.length===0&&exact?'EXECUTED_SINGLE_SOURCE_DISPLAY_ESTIMATE_SCENE':'FAILED',failure,errors,rows,beforeAfterExact:exact,
              parserBufferInputs:sourceBefore.length,boundInputs:before.length,browserPngDecodes:6,sourceNetworkRequests:0,originalJpegRgbDecodesOrReprojections:0,
              sceneFrames:rows.length,newBaselineFrames:3,newMatchedOriginalFrames:3,
              scope:'Original complete Scene/GPU renderer, original pub used only to select nominal geometry. Explicit task surface substitutes derived display PNG with readback-equal geometric alpha. Modified final source receipts deliberately UNKNOWN: no false Prepared v1 publication/identity, full Sources/Back or standard publisher verification. Three new night conditions assert the current angular selection policy. Actual adjacent coarse layers are supplied, with north pan exposing fine boundaries. Three new matched original and baseline controls; no old isolated matrix rerun. Both derived slots have the original geometric alpha, and final source receipts deliberately UNKNOWN. No actual Hook/page or full three-tier exterior claim. Same fixed auxiliary policy, software GL, catalog-unavailable report and dual input/prototype decode inventory do not prove native/phone quality, physical memory, capacity, registry adoption or full acceptance.'};
await save('result.json',result);console.log(JSON.stringify({status:result.status,failure,frames:rows.length,inputsExact:exact,...await bind(path.join(out,'result.json'))}));
process.exitCode=result.status==='FAILED'?1:0;
