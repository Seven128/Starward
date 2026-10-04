// Bounded display-pipeline experiment, distinct from the earlier hue-only trials.
// No production source, Context, DevTools or published asset mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-twilight-pipeline-1001');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const probe=JSON.parse(await fs.readFile('output/playwright/cloud-sky-twilight-ceiling-1001-r2/result.json','utf8'));
const rendererPath='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const original=await fs.readFile(rendererPath,'utf8');assert.equal(sha(original),probe.sourceSha256);
const start=original.indexOf('    // Preserve the dark chart\'s existing maximum');
const end=original.indexOf('    gl_FragColor = vec4(sky,1.0);',start);
assert(start>0&&end>start);const previous=original.slice(start,end);
assert(previous.includes('const vec3 DAY_CEILING')&&previous.includes('mix(1.0,0.65,sunsetWeight)'));
const display=`    // The exponential maps linear scattering radiance. Encode its result
    // once for the display, without an unrelated dark-chart channel ceiling.
    // Exposure and fixed atmosphere remain illustrative, not site photometry.
    vec3 mapped = vec3(1.0)-exp(-exposure*radiance);
    vec3 encoded = mix(12.92*mapped,1.055*pow(mapped,vec3(1.0/2.4))-0.055,
      step(vec3(0.0031308),mapped));
    vec3 sky = u_base+(vec3(1.0)-u_base)*encoded+nightGlow;
`;
const experiment=original.slice(0,start)+display+original.slice(end);
await fs.writeFile(output+'/experiment-renderer.ts',experiment,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});const versions:any[]=[];
try{
  for(const [name,source] of [['before',original],['linear-display',experiment]]){
    const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:"export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';"},
      bundle:true,write:false,metafile:true,format:'iife',globalName:'skyDisplayTrial',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),
      plugins:[{name:'bounded-display-pipeline',setup(builder){builder.onLoad({filter:/[\\/]sky-gpu-renderer\.ts$/},()=>({contents:source,loader:'ts'}));}}]});
    const code=compiled.outputFiles[0]!.text;await fs.writeFile(output+'/'+name+'.js',code,{flag:'wx'});
    const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];page.on('pageerror',(error:any)=>errors.push(String(error)));
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:code});
    const result=await page.evaluate((input:any)=>{
      const gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
      const alive:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
      for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
        const create=(gl as any)['create'+noun].bind(gl),remove=(gl as any)['delete'+noun].bind(gl);
        (gl as any)['create'+noun]=(...args:any[])=>{const value=create(...args);if(value)alive[key].add(value);return value;};
        (gl as any)['delete'+noun]=(value:any)=>{alive[key].delete(value);remove(value);};
      }
      const renderer=(globalThis as any).skyDisplayTrial.createSkyGpuRenderer(gl,1);renderer.begin(390,844,'#080D17');
      if(!renderer.solarLight({basis:input.conditions.basis,verticalFovDeg:input.conditions.fov},input.conditions.sun))throw Error('solar_draw_failed');
      renderer.finish();gl.finish();
      const samples=input.samples.filter((sample:any)=>!sample.outsideComparableSky).map((sample:any)=>{
        const bytes=new Uint8Array(5*5*4);gl.readPixels(sample.x-2,843-sample.y-2,5,5,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
        const rgb=[0,1,2].map(channel=>{const values=[];for(let i=channel;i<bytes.length;i+=4)values.push(bytes[i]);values.sort((a,b)=>a-b);return values[12];});
        return {...sample,currentRgb:rgb};
      });
      const glError=gl.getError();renderer.dispose();return{samples,glError,retired:Object.fromEntries(Object.entries(alive).map(([key,set]:any)=>[key,set.size]))};
    },probe);
    assert.equal(result.glError,0);assert.equal(errors.length,0);assert(Object.values(result.retired).every(value=>value===0));
    await page.locator('canvas').screenshot({path:output+'/'+name+'.png'});
    const luma=(rgb:number[])=>rgb.reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index]!,0);
    const lumaError=result.samples.reduce((sum:number,sample:any)=>sum+Math.abs(luma(sample.currentRgb)-luma(sample.referenceRgb)),0)/result.samples.length;
    versions.push({name,sourceSha256:sha(source),bundleSha256:sha(code),imageSha256:sha(await fs.readFile(output+'/'+name+'.png')),...result,lumaMeanAbsoluteError:lumaError,errors});
    await page.close();
  }
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Bounded linear-radiance display transfer trial, not product adoption or native acceptance',
    probeSha256:sha(await fs.readFile('output/playwright/cloud-sky-twilight-ceiling-1001-r2/result.json')),conditions:probe.conditions,versions,
    limits:probe.limits},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,versions}));
}finally{await browser.close();}
