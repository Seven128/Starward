// Existing published PNG/alpha and actual production WebGL renderer.
// This is logical upload/contribution evidence, not native/OS memory or FPS.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {PNG} from 'pngjs';
const current=process.argv.includes('--current'),name=current?'current':'before';
const output=path.resolve('output/playwright/cloud-sky-landscape-empty-view-1001-'+name);
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:any)=>createHash('sha256').update(value).digest('hex');
const manifestPath='workers/miniapp-api/assets/landscape/manifest.json';
const manifestBytes=await fs.readFile(manifestPath),publication=JSON.parse(manifestBytes.toString());
const records:any[]=[{path:manifestPath,sha256:sha(manifestBytes),bytes:manifestBytes.length}],images:any[]=[];
for(const resource of publication.resources){
  const imagePath='workers/miniapp-api/assets/landscape/'+resource.image.file;
  const alphaPath='workers/miniapp-api/assets/landscape/'+resource.alpha.file;
  const bytes=await fs.readFile(imagePath),alphaBytes=await fs.readFile(alphaPath);
  assert.equal(sha(bytes),resource.image.sha256);assert.equal(sha(alphaBytes),resource.alpha.sha256);
  records.push({path:imagePath,sha256:sha(bytes),bytes:bytes.length},{path:alphaPath,sha256:sha(alphaBytes),bytes:alphaBytes.length});
  const png=PNG.sync.read(bytes),alpha=new Uint8Array(png.width*png.height);let first=png.height;
  for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){
    const value=png.data[(y*png.width+x)*4+3]!;alpha[y*png.width+x]=value;if(value>0)first=Math.min(first,y);
  }
  assert.equal(sha(alpha),resource.alpha.decodedSha256);
  images.push({resource,data:'data:image/png;base64,'+bytes.toString('base64'),alpha:JSON.parse(alphaBytes.toString()),
    firstNonzeroAlphaRow:first,linearFilterAltitudeUpperDeg:90-(first-.5)/png.height*180});
}
const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';export {skyArtworkViewBounds} from './apps/wechat-miniapp/src/features/sky/sky-artwork-visibility';export {createSkyViewBasis} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';export {INITIAL_MANUAL_SKY_VIEW} from './apps/wechat-miniapp/src/features/sky/sky-manual-view';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'landscapeProbe',platform:'browser',target:'es2022',
  tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const code=compiled.outputFiles[0]!.text;await fs.writeFile(output+'/production.js',code,{flag:'wx'});
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block;width:390px;height:844px}</style><canvas></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:code});
  const results=await page.evaluate(async(input:any)=>{
    const api=(globalThis as any).landscapeProbe,canvas=document.querySelector('canvas')!;
    const decoded=[];for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();
      decoded.push({...asset,image,mask:api.createSkyPanoramaMask(input.publication,asset.resource,api.decodeSkyLandscapeAlpha(asset.alpha,asset.resource))});}
    const high=api.INITIAL_MANUAL_SKY_VIEW,low=api.createSkyViewBasis(270,105,0),roll=37*Math.PI/180;
    const rolled={forward:high.forward,right:high.right.map((v:number,i:number)=>v*Math.cos(roll)+high.up[i]*Math.sin(roll)),
      up:high.up.map((v:number,i:number)=>v*Math.cos(roll)-high.right[i]*Math.sin(roll))};
    const conditions=[{name:'native-default',basis:high,fov:45,dpr:1},{name:'native-default-dpr3',basis:high,fov:45,dpr:3},
      {name:'high-local',basis:high,fov:4.8,dpr:1},{name:'zenith',basis:api.createSkyViewBasis(0,180,0),fov:85,dpr:1},
      {name:'rolled-high',basis:rolled,fov:45,dpr:1},{name:'offset-high',basis:high,fov:45,dpr:1,center:{x:182,y:497}},
      {name:'west-horizon',basis:low,fov:85,dpr:1},{name:'seam-horizon',basis:api.createSkyViewBasis(0,95,0),fov:45,dpr:1},
      {name:'red-horizon',basis:low,fov:85,dpr:1,red:true},{name:'dome',basis:api.createSkyViewBasis(0,180,0),fov:274.9,dpr:1}];
    const results=[];
    for(const condition of conditions)for(const asset of decoded){
      canvas.width=390*condition.dpr;canvas.height=844*condition.dpr;
      const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
      const allocations=new Map(),alive:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
      const originals:any={};let liveBytes=0,peakBytes=0,uploadBytes=0;
      for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
        const createName='create'+noun,deleteName='delete'+noun,create=(gl as any)[createName].bind(gl),remove=(gl as any)[deleteName].bind(gl);
        originals[createName]=create;originals[deleteName]=remove;
        (gl as any)[createName]=(...args:any[])=>{const value=create(...args);if(value)alive[key].add(value);return value;};
        (gl as any)[deleteName]=(value:any)=>{alive[key].delete(value);if(key==='textures'){liveBytes-=allocations.get(value)??0;allocations.delete(value);}remove(value);};
      }
      const tex=gl.texImage2D.bind(gl);originals.texImage2D=tex;
      (gl as any).texImage2D=(...args:any[])=>{const source=args.at(-1),size=args.length===9?Number(args[3])*Number(args[4])*4:source.width*source.height*4;
        const target=gl.getParameter(gl.TEXTURE_BINDING_2D);liveBytes+=size-(allocations.get(target)??0);allocations.set(target,size);
        peakBytes=Math.max(peakBytes,liveBytes);uploadBytes+=size;return (tex as any)(...args);};
      const renderer=api.createSkyGpuRenderer(gl,condition.dpr),view={basis:condition.basis,verticalFovDeg:condition.fov,...(condition.center?{center:condition.center}:{})};
      const paint=()=>{renderer.begin(390,844,condition.red?'#180400':'#080D17');
        renderer.disc(195,422,7,condition.red?'#C53820':'#E1DBBF',.8);renderer.segments([[0,217,390,624]],'#334455',.8);};
      const read=()=>{gl.finish();const bytes=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
      paint();renderer.finish();const baseline=read();
      paint();const submitted=renderer.landscape(view,{direction:[1,0,0],altitudeDeg:0},Boolean(condition.red),{image:asset.image,mask:asset.mask});
      renderer.finish();const pixels=read(),firstUpload=uploadBytes;
      let changedPixels=0;for(let i=0;i<pixels.length;i+=4)if([0,1,2,3].some(channel=>pixels[i+channel]!==baseline[i+channel]))changedPixels++;
      const bounds=api.skyArtworkViewBounds(view,390,844),lowestAltitudeDeg=(Math.asin(bounds.center[2])-bounds.radius)*180/Math.PI;
      paint();renderer.landscape(view,{direction:[1,0,0],altitudeDeg:0},Boolean(condition.red),{image:asset.image,mask:asset.mask});renderer.finish();
      const warmUpload=uploadBytes-firstUpload,glError=gl.getError();renderer.dispose();
      for(const [key,value] of Object.entries(originals))(gl as any)[key]=value;
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      results.push({condition,resource:asset.resource.id,firstNonzeroAlphaRow:asset.firstNonzeroAlphaRow,
        linearFilterAltitudeUpperDeg:asset.linearFilterAltitudeUpperDeg,lowestAltitudeDeg,certifiedAbove:lowestAltitudeDeg>asset.linearFilterAltitudeUpperDeg+.2,
        submitted,changedPixels,firstUpload,warmUpload,peakLogicalTextureBytes:peakBytes,retiredLogicalTextureBytes:liveBytes,
        retired:Object.fromEntries(Object.entries(alive).map(([key,set]:any)=>[key,set.size])),glError,rgba:btoa(binary)});
    }
    return results;
  },{images,publication});
  const rows=results.map(({rgba,...row}:any)=>({...row,rgbaSha256:sha(Buffer.from(rgba,'base64'))}));
  assert.equal(errors.length,0);for(const row of rows){assert.equal(row.glError,0);assert(row.submitted);assert.equal(row.warmUpload,0);
    assert.equal(row.retiredLogicalTextureBytes,0);assert(Object.values(row.retired).every(value=>value===0));
    if(row.certifiedAbove)assert.equal(row.changedPixels,0);else if(['west-horizon','red-horizon','seam-horizon','dome'].includes(row.condition.name))assert(row.changedPixels>0);}
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Actual published panorama/alpha and real renderer; finite contribution/upload regression. No network, native memory or performance acceptance.',
    name,records,sourceHashes,bundleSha256:sha(code),rows,errors},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({name,output,emptyCases:rows.filter(r=>r.certifiedAbove).map(r=>({name:r.condition.name,resource:r.resource,lowestAltitudeDeg:r.lowestAltitudeDeg,changedPixels:r.changedPixels,firstUpload:r.firstUpload})),retired:'zero'}));
  // Escaped production defect: certifiably empty panorama still acquired a
  // full texture. The saved before output must fail this same assertion.
  for(const row of rows.filter(r=>r.certifiedAbove))assert.equal(row.firstUpload,0,'A source-alpha-empty view must not upload its full panorama');
  if(current){const previous=JSON.parse(await fs.readFile('output/playwright/cloud-sky-landscape-empty-view-1001-before/result.json','utf8'));
    assert.deepEqual(rows.map(r=>r.rgbaSha256),previous.rows.map((r:any)=>r.rgbaSha256),'all finite sky/foreground pixels must remain identical');}
}finally{await browser.close();}
