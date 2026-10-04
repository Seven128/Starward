// Task-only color-space trial. Original source/Scene files stay unchanged.
// Previous exact reference/baseline frames are reused, not rerendered.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {assertPreparedOpticalManifest} from '../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'output/playwright/cloud-sky-prepared-linear-composition-1004-r2');
const prior=path.join(root,'output/playwright/cloud-sky-noirlab-wide-quality-1004-r1');
await mkdir(out);
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=async(file:string)=>{const b=await readFile(file);return {path:path.relative(root,file).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:unknown)=>writeFile(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const choices=[
 ['m82-noirlab','M:82','output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82','1c99fb46449a4721131d7d7e45a4856d7c77499bd504c175b5ac9e3c0ecbc839'],
 ['m51-noirlab','M:51','output/noirlab-prepared-wide-publication-1004-r1/noao1309a','79221ca85e79d0ae7e28c71b5ef4b281125284b4325e6ad2fc3862890af409c6'],
];
const factsFile=path.join(root,'output/prepared-wide-display-inputs-1004-r1/result.json');
const facts=JSON.parse(await readFile(factsFile,'utf8'));
const originalParsed=JSON.parse(await readFile(path.join(prior,'parsed-inputs.json'),'utf8'));
const previous=JSON.parse(await readFile(path.join(prior,'result.json'),'utf8'));
assert.equal(previous.beforeAfterExact,true);
for(const row of originalParsed)assert.deepEqual(await bind(path.join(root,row.path)),row);
const sources:Record<string,unknown>={},files=[fileURLToPath(import.meta.url),factsFile,path.join(prior,'result.json'),path.join(prior,'parsed-inputs.json')];
for(const [id,ref,base,pin] of choices){
 const fact=facts.rows.find((row:{id:string})=>row.id===id);assert.equal(fact.encodedColourSpace,'ICC_DECLARED_sRGB');
 const file=path.join(root,base,'manifest.json'),raw=await readFile(file);assert.equal(sha(raw),pin);
 const publication=JSON.parse(raw.toString());assertPreparedOpticalManifest(publication,ref,publication.publicationHash);
 const pngFile=path.join(root,base,publication.levels.OVERVIEW.file),png=await readFile(pngFile);
 assert.equal(png.length,publication.levels.OVERVIEW.bytes);assert.equal(sha(png),publication.levels.OVERVIEW.sha256);
 sources[id]={publication,png:'data:image/png;base64,'+png.toString('base64')};
 files.push(file,pngFile,path.join(root,fact.jpeg.path),path.join(root,fact.icc.path));
}
const protectedRows=JSON.parse(await readFile(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
files.push(...protectedRows.map((r:{path:string})=>path.join(root,r.path)));
const require=createRequire(path.join(root,'apps/wechat-miniapp/package.json'));
const playwrightPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(playwrightPath);
files.push(process.execPath,chromium.executablePath(),require.resolve('typescript/lib/typescript.js'));
for(const [id] of choices)for(const name of ['night','twilight','day'])files.push(path.join(prior,id+'-'+name+'.rgba'),path.join(prior,id+'-'+name+'-baseline.rgba'));
const before=await Promise.all(files.map(bind));await save('inputs-before.json',before);
for(const p of protectedRows)assert.equal(before.find(r=>r.path===p.path)?.sha256,p.sha256);
await writeFile(path.join(out,'executed-script.mts'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});

// Mathematical sRGB transfer already referenced by the atmosphere owner:
// https://www.w3.org/TR/2026/CRD-css-color-4-20260930/#color-conversion-code
// No exposure/blackpoint/taper; linear max remains display contribution only.
const colorFunctions=`
    uniform sampler2D u_protoBackdrop;
    uniform vec2 u_protoSize;
    vec3 protoLinear(vec3 x) {
      return mix(x/12.92,pow((x+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),x));
    }
    vec3 protoEncoded(vec3 x) {
      return mix(x*12.92,1.055*pow(max(x,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),x));
    }`;
const colorOutput=`vec3 sourceLinear=protoLinear(rgb);
      float linearContribution=max(max(sourceLinear.r,sourceLinear.g),sourceLinear.b);
      vec2 backdropUv=vec2(v_pixel.x/u_protoSize.x,1.0-v_pixel.y/u_protoSize.y);
      vec3 backdrop=protoLinear(texture2D(u_protoBackdrop,backdropUv).rgb);
      gl_FragColor=vec4(protoEncoded(sourceLinear*u_opacity+backdrop*(1.0-linearContribution*u_opacity)),1.0);`;
const copyCode=`
        if(gl.getParameter(gl.FRAMEBUFFER_BINDING)!==null)throw Error('prototype expected the current default scene framebuffer');
        const protoBackdrop=gl.createTexture();if(!protoBackdrop)throw Error('prototype backdrop allocation failed');
        gl.bindTexture(gl.TEXTURE_2D,protoBackdrop);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const protoPriorError=gl.getError();if(protoPriorError!==gl.NO_ERROR)throw Error('prototype prior GL error '+protoPriorError);
        gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGB,0,0,width,height,0);
        const protoCopyError=gl.getError();if(protoCopyError!==gl.NO_ERROR){gl.deleteTexture(protoBackdrop);throw Error('prototype RGB backdrop copy failed '+protoCopyError);}
        globalThis.__linearPrototype.copiesCreated++;
        globalThis.__linearPrototype.copyLogicalRgbaBytes=width*height*4;
        globalThis.__linearPrototype.copyInternalFormat='RGB';
        globalThis.__linearPrototype.defaultFramebufferAlphaBits=gl.getParameter(gl.ALPHA_BITS);
        const protoPre=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,protoPre);
        globalThis.__linearPrototype.preBlend=protoPre;
`;
function once(value:string,from:string,to:string){assert.equal(value.split(from).length,2,'unique task injection');return value.replace(from,to);}
const entry=`
import {OBSERVATION_FRAME_FORMAT} from './packages/miniapp-contracts/src/index';
import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skyPreparedOpticalFrame} from './apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {registerSkyNativeImageLifetime} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
import {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
const sources=${JSON.stringify(sources)},images={};
const width=390,height=844,at='2026-10-04T00:00:00.000Z';
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
async function init(){for(const [id,source] of Object.entries(sources)){const image=new Image();image.src=source.png;await image.decode();if(image.naturalWidth!==512||image.naturalHeight!==512)throw Error('wrong image size');images[id]=image;}}
function copyCapability(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2;
 const gl=canvas.getContext('webgl',{alpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('probe unavailable');
 gl.clearColor(.25,.5,.75,1);gl.clear(gl.COLOR_BUFFER_BIT);
 const rows=[];for(const format of ['RGBA','RGB']){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.copyTexImage2D(gl.TEXTURE_2D,0,gl[format],0,0,2,2,0);rows.push({format,error:gl.getError()});gl.deleteTexture(texture);}
 const result={alphaBits:gl.getParameter(gl.ALPHA_BITS),rows,scope:'Software WebGL default alpha:false format diagnostic; not WEAPP confirmation'};
 gl.getExtension('WEBGL_lose_context')?.loseContext();return result;
}
function run(condition){
 const source=sources[condition.id],publication=source.publication,image=images[condition.id];
 const canvas=document.querySelector('canvas');canvas.width=width;canvas.height=height;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});if(!gl)throw Error('no WebGL');
 globalThis.__linearPrototype={copiesCreated:0,copiesDeleted:0,copyLogicalRgbaBytes:0,preBlend:null};
 const live=new Set(),counts={created:0,deleted:0,maxLive:0},create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
 gl.createTexture=()=>{const x=create();if(x){live.add(x);counts.created++;counts.maxLive=Math.max(counts.maxLive,live.size);}return x;};
 gl.deleteTexture=x=>{if(live.delete(x))counts.deleted++;return remove(x);};
 const unregister=registerSkyNativeImageLifetime(image,()=>true),failed=[];
 const renderer=createSkyGpuRenderer(gl,1,{imageFailed:()=>failed.push('OVERVIEW'),artworkContributions:{auxiliaryBytesLimit:15803512,maxGroups:1}});
 const report={hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:condition.sunAltitude}],observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at,
  observer:{latitude:22.54,longitude:113.95,elevationM:50},equatorialToEnu:[1,0,0,0,1,0,0,0,1]}],
  skyScene:{state:'UNAVAILABLE',catalog:null,publication:null,frames:[],deepSky:{state:'UNAVAILABLE',catalog:null,frames:[]}},targetFrames:[]};
 const frame=skyPreparedOpticalFrame({image,renderedLevel:'OVERVIEW',renderedAsset:publication.levels.OVERVIEW,publication,coarser:null});
 const args=[renderer,report,at,null,null,width,height,'NIGHT'];let completed=null,done=0;
 args[8]=(_snapshot,sources)=>{completed=sources.sdssOptical;};args[9]=()=>done++;args[10]=.60;
 args[12]=createSkyViewBasis((90-publication.center.raDeg+360)%360,90+publication.center.decDeg,0);
 args[30]=frame;args[31]=()=>failed.push('OVERVIEW');args[37]={surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash};
 drawSkyScene(...args);
 const rgba=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
 const error=gl.getError(),png=canvas.toDataURL('image/png').split(',')[1];
 const completion=completed?{kind:completed.kind,publicationHash:completed.publicationHash,fields:completed.participatingFields.map(x=>({slot:x.slot,level:x.level}))}:null;
 renderer.dispose();unregister();gl.createTexture=create;gl.deleteTexture=remove;
 const {preBlend,...copyStats}=globalThis.__linearPrototype;
 return {rgba:base64(rgba),png,preBlend:preBlend?base64(preBlend):null,error,done,failed,completion,textureObjects:counts,copyStats,liveTextureObjects:live.size,decoded:[image.naturalWidth,image.naturalHeight],drawingBufferColorSpace:gl.drawingBufferColorSpace??'unavailable'};
}
globalThis.linearCompositionProbe={init,run,copyCapability};`;
await writeFile(path.join(out,'executed-browser-entry.ts'),entry,{flag:'wx'});
const parsed=new Map<string,Awaited<ReturnType<typeof bind>>>(),variants=[];
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'ts'},absWorkingDir:root,bundle:true,platform:'browser',format:'iife',target:'es2022',write:false,metafile:true,
 plugins:[{name:'bound-task-color-variant',setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async args=>{
  const b=await readFile(args.path),row={...await bind(args.path),bytes:b.length,sha256:sha(b)};parsed.set(args.path,row);
  let contents=b.toString('utf8'),ext=path.extname(args.path).slice(1);
  if(args.path.replaceAll('\\','/').endsWith('/sky-artwork-level-composition.ts')){
   contents=contents.replaceAll('\r\n','\n');
   contents=once(contents,'    ${field("fine")}','    ${field("fine")}'+colorFunctions);
   contents=once(contents,'"gl_FragColor = vec4(straight,contribution*u_opacity);"',JSON.stringify(colorOutput));
  }else if(args.path.replaceAll('\\','/').endsWith('/sky-gpu-renderer.ts')){
   contents=contents.replaceAll('\r\n','\n');
   contents=once(contents,'        const preparedUniforms = {',copyCode+'        const preparedUniforms = {\n          u_protoBackdrop:protoBackdrop,u_protoSize:[width,height],');
   const submit='        submit(artworkLevels!,artworkLevelsBuffer!,[0,0,width,0,0,height,0,height,width,0,width,height],2,gl.TRIANGLES,preparedUniforms);';
   contents=once(contents,submit,'        try {\n'+submit+'\n        } finally {gl.deleteTexture(protoBackdrop);globalThis.__linearPrototype.copiesDeleted++;}');
  }
  if(contents!==b.toString('utf8')){
   const name=path.basename(args.path),file=path.join(out,'task-variant-'+name);await writeFile(file,contents,{flag:'wx'});
   variants.push({original:row,variant:await bind(file),scope:'esbuild task-only source transform; original file unchanged'});
  }
  return {contents,loader:ext==='json'?'json':ext==='tsx'?'tsx':ext==='ts'?'ts':'js',resolveDir:path.dirname(args.path)};
 });}}]});
const sourceBefore=[...parsed.values()];await save('parsed-inputs.json',sourceBefore);await save('task-variants.json',variants);
assert.equal(variants.length,2);
await writeFile(path.join(out,'executed-browser-bundle.js'),bundle.outputFiles[0].contents,{flag:'wx'});await save('bundle-metafile.json',bundle.metafile);
const launch={executablePath:chromium.executablePath(),headless:true,args:['--use-gl=angle','--use-angle=swiftshader']};
await save('toolchain.json',{node:process.version,typescript:require('typescript/package.json').version,playwright:require(playwrightPath+'/package.json').version,launch});
const browser=await chromium.launch(launch),rows=[],errors:string[]=[];
const conditions=choices.flatMap(([id])=>[{id,name:id+'-night',sunAltitude:-24},{id,name:id+'-twilight',sunAltitude:-8},{id,name:id+'-day',sunAltitude:16}]);
let failure:string|undefined;
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:Error)=>errors.push(e.message));
 await page.setContent('<!doctype html><canvas style="width:390px;height:844px"></canvas>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 const copyCapability=await page.evaluate(()=>globalThis.linearCompositionProbe.copyCapability());await save('copy-capability.json',copyCapability);
 assert.equal(copyCapability.alphaBits,0);assert.equal(copyCapability.rows[0].error,1282);assert.equal(copyCapability.rows[1].error,0);
 await page.evaluate(()=>globalThis.linearCompositionProbe.init());await save('browser.json',{version:browser.version()});
 for(const condition of conditions){
  const actual=await page.evaluate(c=>globalThis.linearCompositionProbe.run(c),condition);
  assert.equal(actual.error,0);assert.equal(actual.done,1);assert.equal(actual.liveTextureObjects,0);assert.deepEqual(actual.failed,[]);
  assert.equal(actual.copyStats.copiesCreated,1);assert.equal(actual.copyStats.copiesDeleted,1);assert.equal(actual.copyStats.copyLogicalRgbaBytes,390*844*4);
  const rgba=Buffer.from(actual.rgba,'base64'),pre=Buffer.from(actual.preBlend!,'base64'),png=Buffer.from(actual.png,'base64');
  const reference=await readFile(path.join(prior,condition.name+'.rgba')),baseline=await readFile(path.join(prior,condition.name+'-baseline.rgba'));
  assert.equal(rgba.length,390*844*4);assert.deepEqual(pre,baseline,'actual before-blend framebuffer must equal reused baseline');
  assert.equal(actual.completion?.kind,'prepared');assert.deepEqual(actual.completion?.fields,[{slot:'fine',level:'OVERVIEW'}]);
  let changedPixels=0,differentFromBaseline=0,referenceDifferentFromBaseline=0;
  for(let i=0;i<rgba.length;i+=4){if(rgba[i]!==reference[i]||rgba[i+1]!==reference[i+1]||rgba[i+2]!==reference[i+2])changedPixels++;
   if(rgba[i]!==baseline[i]||rgba[i+1]!==baseline[i+1]||rgba[i+2]!==baseline[i+2])differentFromBaseline++;
   if(reference[i]!==baseline[i]||reference[i+1]!==baseline[i+1]||reference[i+2]!==baseline[i+2])referenceDifferentFromBaseline++;}
  assert(changedPixels>1000);
  await writeFile(path.join(out,condition.name+'.rgba'),rgba,{flag:'wx'});await writeFile(path.join(out,condition.name+'-preblend.rgba'),pre,{flag:'wx'});await writeFile(path.join(out,condition.name+'.png'),png,{flag:'wx'});
  delete actual.rgba;delete actual.png;delete actual.preBlend;
  rows.push({condition,...actual,changedPixels,differentFromBaseline,referenceDifferentFromBaseline,rgba:{bytes:rgba.length,sha256:sha(rgba),rowOrder:'bottom-first'},png:{bytes:png.length,sha256:sha(png)},preBlendRgbaSha256:sha(pre),referenceRgbaSha256:sha(reference)});
 }
}catch(error){failure=String(error);}finally{await browser.close();}
const after=await Promise.all(files.map(bind)),sourceAfter=await Promise.all([...parsed.keys()].map(bind));
await save('inputs-after.json',after);await save('parsed-inputs-after.json',sourceAfter);
const exact=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const result={status:!failure&&errors.length===0&&exact?'EXECUTED_BOUNDED_LINEAR_COMPOSITION_PROTOTYPE':'FAILED',failure,errors,rows,beforeAfterExact:exact,
 parserBufferInputs:sourceBefore.length,boundInputs:before.length,sourceNetworkRequests:0,originalJpegRgbDecodesOrReprojections:0,browserPngDecodes:2,
 scope:'Task-only two-source-file variant through current complete Scene, unchanged NOIRLab ICC-proven overview bytes/geometry. One linear-light sRGB blend over the captured real pre-photo framebuffer, then encoded output. No exposure/background subtraction/taper or cross-source image fusion. Previous encoded reference/baseline frames reused and actual pre-blend GL exact. Raw encoded source-credit auxiliary shaders are unchanged: existing receipt is not final-color participation verification for this new variant. Cached encoded resampling, catalogue-unavailable controlled report, software GL and fixed auxiliary policy do not prove native/phone quality, full page/Sources, physical memory, target capacity or adoption.'};
await save('result.json',result);console.log(JSON.stringify({status:result.status,failure,frames:rows.length,inputsExact:exact,...await bind(path.join(out,'result.json'))}));
process.exitCode=result.status==='FAILED'?1:0;
