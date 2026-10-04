// Repeatable production-owner WebGL1 diagnostic; not a Mini Program UI clone.
// No published image, engine, Context, device or frozen-candidate mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-twilight-gradient-1001');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const probe=JSON.parse(await fs.readFile('output/playwright/cloud-sky-twilight-ceiling-1001-r2/result.json','utf8'));
const sourceFile='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const original=await fs.readFile(sourceFile,'utf8');
const anchor='    vec3 solarChroma = sqrt(sunTransmittance/max(sunTransmittance.r,0.0001));';
assert.equal(original.split(anchor).length,2);
const added=`
    // A fixed display approximation for below-horizon illumination. Curved
    // Earth shadow supplies the depression scale; this is not path-integrated
    // atmospheric radiance or local weather. Multiple-path transmittance uses
    // the published 2/(2+sqrt(tauView*tauSun)) approximation (Ozlem 2021).
    float duskWeight = 1.0-smoothstep(-6.0,0.0,u_sunAltitude);
    float depression = clamp(-u_sunAltitude,0.0,18.0)*PI/180.0;
    float shadowHeightKm = 6371.0*(1.0/cos(depression)-1.0);
    float twilightGradient = exp(-(2.0/3.0)*shadowHeightKm/8.4*ray.z);
    vec3 multiplePath = 2.0/(vec3(2.0)+sqrt(BETA_R*8400.0*airMass*BETA_R*8400.0*75.0));
    // Scattered indirect light retains a less saturated spectrum than the
    // direct low-sun tint. Fixed display parameters stay with this shader.
    solarChroma = mix(solarChroma,vec3(1.0),0.23*duskWeight);`;
let trial=original.replace(anchor,anchor+added);
const line='    vec3 radiance = 550.0*twilight*scattering*mix(vec3(1.0),solarChroma,sunsetWeight);';
assert.equal(trial.split(line).length,2);
trial=trial.replace(line,line+'\n    radiance *= mix(vec3(1.0),11.0*twilightGradient*multiplePath,duskWeight);');
await fs.writeFile(output+'/before-renderer.ts',original,{flag:'wx'});
await fs.writeFile(output+'/trial-renderer.ts',trial,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const versions:any[]=[];
try {
  for(const [name,source] of [['before',original],['trial',trial]]) {
    const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:
      "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {createSkyViewBasis,projectSkyDirection,skyHorizontalDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';"},
      bundle:true,write:false,metafile:true,format:'iife',globalName:'skyTwilightTrial',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),
      plugins:[{name:'isolated-owner',setup(b){b.onLoad({filter:/[\\/]sky-gpu-renderer\.ts$/},()=>({contents:source,loader:'ts'}));}}]});
    const code=compiled.outputFiles[0]!.text;
    const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(file===sourceFile?source:await fs.readFile(file))})));
    await fs.writeFile(output+'/'+name+'.js',code,{flag:'wx'});
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors:string[]=[];page.on('pageerror',(error:any)=>errors.push(String(error)));
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:code});
    const setup=await page.evaluate((input:any)=>{
      const api=(globalThis as any).skyTwilightTrial,gl=document.querySelector('canvas')!.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      if(!gl)throw Error('no_webgl');const alive:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
      const counts:any={textures:0,buffers:0,programs:0,shaders:0};
      for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
        const create=(gl as any)['create'+noun].bind(gl),remove=(gl as any)['delete'+noun].bind(gl);
        (gl as any)['create'+noun]=(...args:any[])=>{const value=create(...args);if(value){alive[key].add(value);counts[key]++;}return value;};
        (gl as any)['delete'+noun]=(value:any)=>{alive[key].delete(value);remove(value);};
      }
      const renderer=api.createSkyGpuRenderer(gl,1);
      const paint=(basis:any,fov:number,sun:any)=>{renderer.begin(390,844,'#080D17');if(!renderer.solarLight({basis,verticalFovDeg:fov},sun))throw Error('solar_draw_failed');renderer.finish();gl.finish();};
      const pixel=(x:number,y:number,size=1)=>{const bytes=new Uint8Array(size*size*4);gl.readPixels(x-(size-1)/2,843-y-(size-1)/2,size,size,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return [0,1,2].map(channel=>{const values=[];for(let i=channel;i<bytes.length;i+=4)values.push(bytes[i]);values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];});};
      paint(input.conditions.basis,input.conditions.fov,input.conditions.sun);
      const samples=input.samples.filter((row:any)=>!row.outsideComparableSky).map((row:any)=>({...row,rgb:pixel(row.x,row.y,5)}));
      const basis=api.createSkyViewBasis(0,180,0),fov=274.9;
      const grid=[];for(const alt of [-18,-15,-12,-9,-6.674655377385676,-3,0,5,20,60]){
        paint(basis,fov,{direction:api.skyHorizontalDirection(270,alt),altitudeDeg:alt});
        const rays=[];for(const az of [270,0,90])for(const height of [2,10,20,30,50,70,90]){
          const point=api.projectSkyDirection(az,height,basis,390,844,fov);if(!point)throw Error('missing_dome_ray');rays.push({az,height,rgb:pixel(Math.floor(point.x),Math.floor(point.y))});
        }grid.push({alt,rays});
      }
      const transitions=[];
      for(const alt of [-18,-9,-6,0,3,20]){
        const sides=[];for(const a of [alt-.001,alt+.001]){
          paint(basis,fov,{direction:api.skyHorizontalDirection(270,a),altitudeDeg:a});
          sides.push([270,90].flatMap(az=>[2,10,50].map(height=>{const p=api.projectSkyDirection(az,height,basis,390,844,fov);return pixel(Math.floor(p.x),Math.floor(p.y));})));
        }
        transitions.push({alt,maxDelta:Math.max(...sides[0].flatMap((row:any,i:number)=>row.map((v:number,c:number)=>Math.abs(v-sides[1][i][c]))))});
      }
      // Fully synchronized software timing only, warm shader, identical draws.
      const times=[];for(let i=0;i<12;i++){const start=performance.now();paint(input.conditions.basis,input.conditions.fov,input.conditions.sun);times.push(performance.now()-start);}
      times.sort((a,b)=>a-b);
      (globalThis as any).trialState={api,gl,renderer,paint,alive,counts};
      paint(input.conditions.basis,input.conditions.fov,input.conditions.sun);
      return {samples,grid,transitions,softwareSynchronizedMs:{median:times[6],p95:times[11],count:times.length},glError:gl.getError()};
    },probe);
    assert.equal(setup.glError,0);assert.equal(errors.length,0);
    await page.locator('canvas').screenshot({path:output+'/'+name+'-reference.png'});
    for(const alt of [-6.674655377385676,-3,20]){
      await page.evaluate((alt:number)=>{const s=(globalThis as any).trialState;s.paint(s.api.createSkyViewBasis(0,180,0),274.9,{direction:s.api.skyHorizontalDirection(270,alt),altitudeDeg:alt});},alt);
      await page.locator('canvas').screenshot({path:output+'/'+name+'-dome-'+String(alt)+'.png'});
    }
    const retired=await page.evaluate(()=>{const s=(globalThis as any).trialState;s.renderer.dispose();return {counts:s.counts,alive:Object.fromEntries(Object.entries(s.alive).map(([k,v]:any)=>[k,v.size])),glError:s.gl.getError()};});
    assert(Object.values(retired.alive).every(value=>value===0));assert.equal(retired.glError,0);
    const luma=(rgb:number[])=>rgb.reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i]!,0);
    versions.push({name,sourceSha256:sha(source),sourceHashes,bundleSha256:sha(code),...setup,retired,errors,
      rgbMeanAbsoluteError:setup.samples.flatMap((r:any)=>r.rgb.map((v:number,c:number)=>Math.abs(v-r.referenceRgb[c]))).reduce((a:number,b:number)=>a+b,0)/(setup.samples.length*3),
      lumaMeanAbsoluteError:setup.samples.reduce((sum:number,row:any)=>sum+Math.abs(luma(row.rgb)-luma(row.referenceRgb)),0)/setup.samples.length});
    await page.close();
  }
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Bounded software GLSL twilight-gradient feasibility; not adoption, native or final quality',
    reference:probe.conditions,referenceSha256:probe.referenceSha256,probeSha256:sha(await fs.readFile('output/playwright/cloud-sky-twilight-ceiling-1001-r2/result.json')),
    originalSha256:sha(original),versions},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,versions:versions.map(({name,samples,rgbMeanAbsoluteError,lumaMeanAbsoluteError,softwareSynchronizedMs,transitions,retired})=>({name,samples,rgbMeanAbsoluteError,lumaMeanAbsoluteError,softwareSynchronizedMs,transitions,retired}))}));
}finally{await browser.close();}
