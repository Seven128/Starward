// Bounded, unadopted trial. Keep actual production and ordinary watch untouched.
// Reuse the previous real-publication GPU harness and saved report.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const file=task+'/scripts/experience-galactic-window-gpu-2026-10-01.mts';
await assert.rejects(fs.access(file),{code:'ENOENT'});
let source=await fs.readFile(task+'/scripts/experience-image-demand-gpu-2026-10-01.mts','utf8');
const replace=(from,to)=>{assert(source.includes(from),from.slice(0,80));source=source.replace(from,to);};
replace('cloud-sky-image-demand-1001','cloud-sky-galactic-window-trial-1001');
replace('const compiled=await build({',`const trialSources=await Promise.all(['galactic-window-trial.ts','galactic-textures-trial.ts'].map(async name=>({path:task+'/tmp/'+name,sha256:sha(await fs.readFile(task+'/tmp/'+name))})));
const originalRenderer=await fs.readFile('apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts','utf8');
let trialRenderer=originalRenderer.replace(/\\r\\n/g,'\\n');
const modify=(from:string,to:string)=>{assert(trialRenderer.includes(from),from);trialRenderer=trialRenderer.replace(from,to);};
modify('import { createSkyGpuTextures } from "./sky-gpu-textures";', 'import { createSkyGpuTextures } from "./sky-gpu-textures";\\nimport {skyGalacticImageWindow} from "sky-galactic-trial-window";');
modify('uniform vec2 u_imageTexel;', 'uniform vec2 u_imageTexel, u_imageOrigin, u_imageScale;');
modify('return texture2D(u_image,vec2(fract(uv.x),clamp(uv.y,0.0,1.0))).rgb;', 'return texture2D(u_image,(vec2(fract(uv.x),clamp(uv.y,0.0,1.0))-u_imageOrigin)*u_imageScale).rgb;');
modify('if (source && !galacticImageUnavailable) {\\n          const texture=textures.get(source);', 'if (source && !galacticImageUnavailable) {\\n          const imageSize=source as {width:number;height:number};\\n          const preparedTexture=textures.getWindow(source,skyGalacticImageWindow(view,width,height,band,imageSize.width,imageSize.height));\\n          const texture=preparedTexture.texture;');
modify('u_strength:band.strength,u_image:texture,', 'u_strength:band.strength,u_image:texture,\\n                u_imageOrigin:[preparedTexture.window.x/imageSize.width,preparedTexture.window.y/imageSize.height],\\n                u_imageScale:[imageSize.width/preparedTexture.window.width,imageSize.height/preparedTexture.window.height],');
const trialPlugins=baselineOnly?[]:[{name:'bounded-original-pixel-galactic-window',setup(builder:any){
 builder.onResolve({filter:/^sky-galactic-trial-window$/},()=>({path:path.resolve(task+'/tmp/galactic-window-trial.ts'),namespace:'sky-window'}));
 builder.onLoad({filter:/.*/,namespace:'sky-window'},async(args:any)=>({contents:await fs.readFile(args.path,'utf8'),loader:'ts',resolveDir:path.resolve('apps/wechat-miniapp/src/features/sky')}));
 builder.onLoad({filter:/sky-gpu-renderer\\.ts$/},()=>({contents:trialRenderer,loader:'ts',resolveDir:path.resolve('apps/wechat-miniapp/src/features/sky')}));
 builder.onLoad({filter:/sky-gpu-textures\\.ts$/},async()=>({contents:await fs.readFile(task+'/tmp/galactic-textures-trial.ts','utf8'),loader:'ts',resolveDir:path.resolve('apps/wechat-miniapp/src/features/sky')}));
}}];
const compiled=await build({plugins:trialPlugins,`);
replace("filter(file=>file!=='<stdin>')","filter(file=>file!=='<stdin>'&&!file.startsWith('sky-window:'))");
replace("assert(changed.length>0,'A no-op is not an optimization');", "assert.notEqual(sha(production),sha(frozen),'A no-op is not an optimization');");
replace("assert(changed.every(row=>/sky-artwork-(visibility|raster-bounds)\\.ts$/.test(row.path)),JSON.stringify(changed));", "assert.deepEqual(changed,[],'Trial must not edit real production');");
replace('const variants=[];', 'const variants=[], fullPixelVariants:Buffer[]=[];');
replace('const shaderTexts=new Map()', 'const copy=gl.copyTexImage2D.bind(gl);\n    const shaderTexts=new Map()');
replace('gl.drawArrays=(mode,first,count)=>{', `(gl as any).copyTexImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),size=Number(args[5])*Number(args[6])*4;textureIds.set(texture,'galactic:window');liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id:'galactic:window',bytes:size,operation:'gpu-copy'});return (copy as any)(...args);};
    gl.drawArrays=(mode,first,count)=>{`);
replace("const {rgba,...actual}=result;variants.push({variant,...actual,rgbaSha256:sha(Buffer.from(rgba,'base64'))});", "const {rgba,...actual}=result;const pixels=Buffer.from(rgba,'base64');fullPixelVariants.push(pixels);variants.push({variant,...actual,rgbaSha256:sha(pixels)});");
replace('assert.equal(after.rgbaSha256,before.rgbaSha256,condition.name);', `let changedChannels=0,maxDelta=0;for(let index=0;index<fullPixelVariants[0].length;index++){const delta=Math.abs(fullPixelVariants[0][index]-fullPixelVariants[1][index]);if(delta){changedChannels++;maxDelta=Math.max(maxDelta,delta);}}
  const pixelDifference={changedChannels,maxDelta,totalChannels:fullPixelVariants[0].length};`);
replace('variants,image,imageSha256:', 'variants,pixelDifference,image,imageSha256:');
replace('pixelsEqual:true', 'pixelsEqual:after.rgbaSha256===before.rgbaSha256,pixelDifference');
replace("wideRow.variants[1].rgbaSha256);", "wideRow.variants[variant.variant==='before'?0:1].rgbaSha256);");
replace("assert(rows.find(row=>row.condition.name==='wide').afterWanted.length<rows.find(row=>row.condition.name==='wide').beforeWanted.length);", "assert.deepEqual(rows.find(row=>row.condition.name==='wide').afterWanted,rows.find(row=>row.condition.name==='wide').beforeWanted);");
replace("assert(rows.find(row=>row.condition.name==='common-dpr3').afterWanted.length<rows.find(row=>row.condition.name==='common-dpr3').beforeWanted.length);", "assert.deepEqual(rows.find(row=>row.condition.name==='common-dpr3').afterWanted,rows.find(row=>row.condition.name==='common-dpr3').beforeWanted);");
replace('sourceHashes,changed,inputs,rows', 'sourceHashes,changed,trialSources,trialRendererSha256:sha(trialRenderer),inputs,rows');
replace('Current production shared image-demand repair versus frozen pre-edit HEAD72e65cf3:', 'Unadopted conservative galactic source-window GPU-copy trial versus frozen current production:');
await fs.writeFile(file,source,{flag:'wx'});
console.log(JSON.stringify({script:file,scope:'task-local unadopted trial; real production unchanged'}));
