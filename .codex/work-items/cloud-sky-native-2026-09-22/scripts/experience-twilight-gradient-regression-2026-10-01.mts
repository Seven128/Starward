// Real production WebGL1 escaped-defect regression. A frozen-before run must
// fail the same finite reference check; software success is not final quality.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const before=process.argv.includes('--before'),name=before?'before':process.argv.includes('--final')?'current-final':'current';
const output=path.resolve('output/playwright/cloud-sky-twilight-gradient-regression-1001-'+name);
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const probe=JSON.parse(await fs.readFile('output/playwright/cloud-sky-twilight-ceiling-1001-r2/result.json','utf8'));
const rendererPath='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const source=await fs.readFile(before?'output/playwright/cloud-sky-twilight-gradient-1001/before-renderer.ts':rendererPath,'utf8');
const meaning=(source:string)=>source.replaceAll('\r\n','\n').split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n');
const solarShader=(source:string)=>{
  const start=source.indexOf('const solarLightFragment = ');
  const end=source.indexOf('const galacticBandFragment = `',start);
  assert(start>=0&&end>start);return meaning(source.slice(start,end));
};
if(before)assert.equal(sha(source),JSON.parse(await fs.readFile('output/playwright/cloud-sky-twilight-gradient-1001/result.json','utf8')).originalSha256);
else assert.equal(solarShader(source),solarShader(await fs.readFile('output/playwright/cloud-sky-twilight-gradient-1001/trial-renderer.ts','utf8')),
  'Solar arithmetic/control flow must match the complete-scene trial; native chrome is checked by its own real rendered regression');
const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {projectSkyDirection,createSkyViewBasis,skyHorizontalDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'environmentRegression',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),
  plugins:before?[{name:'frozen-before-only',setup(builder){builder.onLoad({filter:/[\\/]sky-gpu-renderer\.ts$/},()=>({contents:source,loader:'ts'}));}}]:[]});
const code=compiled.outputFiles[0]!.text;await fs.writeFile(output+'/production.js',code,{flag:'wx'});
const sources=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,
  sha256:sha(file===rendererPath?source:await fs.readFile(file))})));
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:code});
  const result=await page.evaluate((input:any)=>{
    const api=(globalThis as any).environmentRegression,gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
    if(!gl)throw Error('no_webgl');const alive:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
    for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
      const create=(gl as any)['create'+noun].bind(gl),remove=(gl as any)['delete'+noun].bind(gl);
      (gl as any)['create'+noun]=(...args:any[])=>{const value=create(...args);if(value)alive[key].add(value);return value;};
      (gl as any)['delete'+noun]=(value:any)=>{alive[key].delete(value);remove(value);};
    }
    const renderer=api.createSkyGpuRenderer(gl,1),read=(x:number,y:number,size=1)=>{
      const bytes=new Uint8Array(size*size*4);gl.readPixels(x-(size-1)/2,843-y-(size-1)/2,size,size,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      return [0,1,2].map(channel=>{const values=[];for(let i=channel;i<bytes.length;i+=4)values.push(bytes[i]);values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];});
    };
    const paint=(basis:any,fov:number,sun:any)=>{renderer.begin(390,844,'#080D17');
      if(!renderer.solarLight({basis,verticalFovDeg:fov},sun))throw Error('solar_draw_failed');renderer.finish();gl.finish();};
    paint(input.conditions.basis,input.conditions.fov,input.conditions.sun);
    const samples=input.samples.filter((sample:any)=>!sample.outsideComparableSky).map((sample:any)=>({...sample,currentRgb:read(sample.x,sample.y,5)}));
    const transitions=[],basis=api.createSkyViewBasis(0,180,0),fov=274.9;
    for(const boundary of [-18,-9,-6,0,3,20]){
      const sides=[];
      for(const solarAltitude of [boundary-.001,boundary,boundary+.001]){
        paint(basis,fov,{direction:api.skyHorizontalDirection(270,solarAltitude),altitudeDeg:solarAltitude});
        const rays=[];for(const azimuth of [270,90])for(const altitude of [2,10,50]){
          const point=api.projectSkyDirection(azimuth,altitude,basis,390,844,fov);if(!point)throw Error('boundary_ray_unavailable');
          rays.push({azimuthDeg:azimuth,altitudeDeg:altitude,rgb:read(Math.floor(point.x),Math.floor(point.y))});
        }
        sides.push({solarAltitudeDeg:solarAltitude,rays});
      }
      let maxChannelDelta=0;for(let i=0;i<sides[0].rays.length;i++)for(let channel=0;channel<3;channel++)
        maxChannelDelta=Math.max(maxChannelDelta,Math.abs(sides[2].rays[i].rgb[channel]-sides[0].rays[i].rgb[channel]));
      transitions.push({boundaryDeg:boundary,sides,maxChannelDelta});
    }
    paint(input.conditions.basis,input.conditions.fov,input.conditions.sun);
    const glError=gl.getError();renderer.dispose();return{samples,transitions,glError,retired:Object.fromEntries(Object.entries(alive).map(([key,set]:any)=>[key,set.size]))};
  },probe);
  assert.equal(result.glError,0);assert.equal(errors.length,0);assert(Object.values(result.retired).every(value=>value===0));
  await page.locator('canvas').screenshot({path:output+'/solar.png'});
  const luma=(rgb:number[])=>rgb.reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index]!,0);
  const lumaMeanAbsoluteError=result.samples.reduce((sum:number,sample:any)=>sum+Math.abs(luma(sample.currentRgb)-luma(sample.referenceRgb)),0)/result.samples.length;
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Finite actual current/before production software regression; not native or full quality acceptance',name,
    sourceSha256:sha(source),bundleSha256:sha(code),sources,conditions:probe.conditions,...result,lumaMeanAbsoluteError,
    referenceTest:'Unobstructed comparable 10-to-60-degree rays must materially improve both brightness and RGB from the saved current-before shader; this does not accept complete quality',errors},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({name,output,lumaMeanAbsoluteError,transitions:result.transitions.map(row=>({boundaryDeg:row.boundaryDeg,maxChannelDelta:row.maxChannelDelta})),retired:result.retired}));
  const rgbError=result.samples.flatMap((row:any)=>row.currentRgb.map((v:number,c:number)=>Math.abs(v-row.referenceRgb[c]))).reduce((a:number,b:number)=>a+b,0)/(result.samples.length*3);
  assert(rgbError<15,'The finite twilight hue comparison must improve alongside brightness');
  assert(lumaMeanAbsoluteError<15,'The current-before vertical twilight gradient still defeats finite reference improvement');
  for(const transition of result.transitions)assert(transition.maxChannelDelta<=1,'Atmosphere must not pop at a branch boundary');
}finally{await browser.close();}
