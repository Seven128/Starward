// Only the new wide-source quality question, with unchanged Hubble references.
// Current complete Scene, actual PNG decode and software WebGL; no page/native claim.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {assertPreparedOpticalManifest} from '../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'output/playwright/cloud-sky-noirlab-wide-quality-1004-r1');
await mkdir(out);
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=async(file:string)=>{const b=await readFile(file);return {path:path.relative(root,file).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:unknown)=>writeFile(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const choices=[
 ['m82-hubble','M:82','output/hubble-m82-prepared-publication-1004-r2','3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca'],
 ['m82-noirlab','M:82','output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82','1c99fb46449a4721131d7d7e45a4856d7c77499bd504c175b5ac9e3c0ecbc839'],
 ['m51-hubble','M:51','output/prepared-optical-publication-1003-r4/publication','23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1'],
 ['m51-noirlab','M:51','output/noirlab-prepared-wide-publication-1004-r1/noao1309a','79221ca85e79d0ae7e28c71b5ef4b281125284b4325e6ad2fc3862890af409c6'],
];
const sources:Record<string,unknown>={},files=[fileURLToPath(import.meta.url)];
for(const [id,ref,base,pin] of choices){
 const file=path.join(root,base,'manifest.json'),raw=await readFile(file);assert.equal(sha(raw),pin);
 const publication=JSON.parse(raw.toString());assertPreparedOpticalManifest(publication,ref,publication.publicationHash);
 const pngFile=path.join(root,base,publication.levels.OVERVIEW.file),png=await readFile(pngFile);
 assert.equal(png.length,publication.levels.OVERVIEW.bytes);assert.equal(sha(png),publication.levels.OVERVIEW.sha256);
 sources[id]={publication,png:'data:image/png;base64,'+png.toString('base64')};files.push(file,pngFile);
}
const protectedRows=JSON.parse(await readFile(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
files.push(...protectedRows.map((r:{path:string})=>path.join(root,r.path)));
const require=createRequire(path.join(root,'apps/wechat-miniapp/package.json'));
const playwrightPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(playwrightPath);
files.push(process.execPath,chromium.executablePath(),require.resolve('typescript/lib/typescript.js'));
const before=await Promise.all(files.map(bind));await save('inputs-before.json',before);
for(const p of protectedRows)assert.equal(before.find(r=>r.path===p.path)?.sha256,p.sha256);
await writeFile(path.join(out,'executed-script.mts'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});
const entry=`
import {OBSERVATION_FRAME_FORMAT} from './packages/miniapp-contracts/src/index';
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyPreparedOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
const sources=${JSON.stringify(sources)},images={};
const width=390,height=844,at='2026-10-04T00:00:00.000Z';
async function init(){for(const [id,source] of Object.entries(sources)){const image=new Image();image.src=source.png;await image.decode();if(image.naturalWidth!==512||image.naturalHeight!==512)throw Error('wrong image size');images[id]=image;}}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
function run(condition){
 const source=sources[condition.id],publication=source.publication,image=images[condition.id];
 const canvas=document.querySelector('canvas');canvas.width=width;canvas.height=height;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('no WebGL');
 const live=new Set(),counts={created:0,deleted:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
 gl.createTexture=()=>{const x=create();if(x){live.add(x);counts.created++;}return x;};
 gl.deleteTexture=x=>{if(live.delete(x))counts.deleted++;return remove(x);};
 const unregister=registerSkyNativeImageLifetime(image,()=>true),failed=[];
 const renderer=createSkyGpuRenderer(gl,1,{imageFailed:()=>failed.push('OVERVIEW'),artworkContributions:{auxiliaryBytesLimit:15803512,maxGroups:1}});
 const report={hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:condition.sunAltitude}],observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at,
  observer:{latitude:22.54,longitude:113.95,elevationM:50},equatorialToEnu:[1,0,0,0,1,0,0,0,1]}],
  skyScene:{state:'UNAVAILABLE',catalog:null,publication:null,frames:[],deepSky:{state:'UNAVAILABLE',catalog:null,frames:[]}},targetFrames:[]};
 const frame=condition.baseline?null:skyPreparedOpticalFrame({image,renderedLevel:'OVERVIEW',renderedAsset:publication.levels.OVERVIEW,publication,coarser:null});
 const args=[renderer,report,at,null,null,width,height,'NIGHT'];let completed=null,done=0;
 args[8]=(_snapshot,sources)=>{completed=sources.sdssOptical;};args[9]=()=>done++;args[10]=.60;
 args[12]=createSkyViewBasis((90-publication.center.raDeg+360)%360,90+publication.center.decDeg,0);
 args[30]=frame;args[31]=()=>failed.push('OVERVIEW');args[37]={surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash};
 drawSkyScene(...args);
 const rgba=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
 const error=gl.getError(),png=canvas.toDataURL('image/png').split(',')[1];
 const completion=completed?{kind:completed.kind,publicationHash:completed.publicationHash,fields:completed.participatingFields.map(x=>({slot:x.slot,level:x.level})),receipt:completed.receipt}:null;
 renderer.dispose();unregister();gl.createTexture=create;gl.deleteTexture=remove;
 return {rgba:base64(rgba),png,error,done,failed,completion,textureObjects:counts,liveTextureObjects:live.size,decoded:[image.naturalWidth,image.naturalHeight]};
}
globalThis.wideQualityProbe={init,run};`;
await writeFile(path.join(out,'executed-browser-entry.ts'),entry,{flag:'wx'});
const parsed=new Map<string,Awaited<ReturnType<typeof bind>>>();
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'ts'},absWorkingDir:root,bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,metafile:true,
 plugins:[{name:'bind-actual-parsed-buffers',setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async args=>{
  const b=await readFile(args.path),ext=path.extname(args.path).slice(1),row={...await bind(args.path),bytes:b.length,sha256:sha(b)};
  const prior=parsed.get(args.path);if(prior)assert.equal(prior.sha256,row.sha256);parsed.set(args.path,row);
  return {contents:b.toString('utf8'),loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js',resolveDir:path.dirname(args.path)};
 });}}]});
const sourceBefore=[...parsed.values()];await save('parsed-inputs.json',sourceBefore);
await writeFile(path.join(out,'executed-browser-bundle.js'),bundle.outputFiles[0].contents,{flag:'wx'});await save('bundle-metafile.json',bundle.metafile);
const launch={executablePath:chromium.executablePath(),headless:true,args:['--use-gl=angle','--use-angle=swiftshader']};
await save('toolchain.json',{node:process.version,typescript:require('typescript/package.json').version,playwright:require(playwrightPath+'/package.json').version,launch});
const browser=await chromium.launch(launch),rows=[],errors:string[]=[];
const conditions=choices.flatMap(([id])=>id.endsWith('hubble')?[{id,name:id+'-night',sunAltitude:-24}]:[
 {id,name:id+'-night',sunAltitude:-24},{id,name:id+'-twilight',sunAltitude:-8},{id,name:id+'-day',sunAltitude:16}]);
let failure:string|undefined;
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.setContent('<!doctype html><canvas style="width:390px;height:844px"></canvas>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>globalThis.wideQualityProbe.init());await save('browser.json',{version:browser.version()});
 for(const condition of conditions){
  const actual=await page.evaluate(c=>globalThis.wideQualityProbe.run(c),condition);
  const baseline=await page.evaluate(c=>globalThis.wideQualityProbe.run({...c,baseline:true}),condition);
  assert.equal(actual.error,0);assert.equal(baseline.error,0);assert.equal(actual.done,1);assert.equal(actual.liveTextureObjects,0);assert.equal(baseline.liveTextureObjects,0);assert.deepEqual(actual.failed,[]);
  const rgba=Buffer.from(actual.rgba,'base64'),bg=Buffer.from(baseline.rgba,'base64'),png=Buffer.from(actual.png,'base64');
  assert.equal(rgba.length,390*844*4);
  let differentPixels=0;for(let i=0;i<rgba.length;i+=4)if(rgba[i]!==bg[i]||rgba[i+1]!==bg[i+1]||rgba[i+2]!==bg[i+2])differentPixels++;
  assert(differentPixels>1000);
  assert.equal(actual.completion?.kind,'prepared');
  assert.deepEqual(actual.completion?.fields,[{slot:'fine',level:'OVERVIEW'}]);
  await writeFile(path.join(out,condition.name+'.rgba'),rgba,{flag:'wx'});await writeFile(path.join(out,condition.name+'-baseline.rgba'),bg,{flag:'wx'});await writeFile(path.join(out,condition.name+'.png'),png,{flag:'wx'});
  delete actual.rgba;delete actual.png;rows.push({condition,...actual,differentPixels,rgba:{bytes:rgba.length,sha256:sha(rgba),rowOrder:'bottom-first'},png:{bytes:png.length,sha256:sha(png)},baselineRgbaSha256:sha(bg)});
 }
}catch(error){failure=String(error);}finally{await browser.close();}
const after=await Promise.all(files.map(bind)),sourceAfter=await Promise.all([...parsed.keys()].map(bind));
await save('inputs-after.json',after);await save('parsed-inputs-after.json',sourceAfter);
const exact=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const result={status:!failure&&errors.length===0&&exact?'PASSED_BOUNDED_WIDE_SOURCE_SOFTWARE_SCENE':'FAILED',failure,errors,rows,beforeAfterExact:exact,
 parserBufferInputs:sourceBefore.length,boundInputs:before.length,sourceNetworkRequests:0,originalJpegDecodesOrReprojections:0,browserPngDecodes:4,
 scope:'Current complete Scene with byte-pinned Hubble/NOIRLab overview PNGs. Only new wide-source/night-twilight-day boundary question; no prior lifecycle matrix replay. Controlled report/basis/catalog-unavailable, actual software WebGL and original frozen auxiliary policy. Same-frame optical participation receipt is not visible Sources UI, absolute astrometry, scientific coverage, native/phone or quality adoption.'};
await save('result.json',result);console.log(JSON.stringify({status:result.status,failure,frames:rows.length,inputsExact:exact,...await bind(path.join(out,'result.json'))}));
process.exitCode=result.status==='FAILED'?1:0;
