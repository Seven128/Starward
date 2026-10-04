// Real WebGL readback of the native status-bar surface, including final-layer
// order, fractional CSS/DPR, fallback, state restoration and resource retirement.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const before=process.argv.includes('--before'),name=before?'before':process.argv.includes('--final')?'current-final':'current';
const output=path.resolve('output/playwright/cloud-sky-native-chrome-matte-1001-'+name);
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const sourcePath=before?'output/playwright/cloud-sky-twilight-pipeline-1001/experiment-renderer.ts':'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
const source=await fs.readFile(sourcePath,'utf8');
const compiled=await build({stdin:{resolveDir:path.resolve('.'),contents:"export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {createSkyViewBasis,skyHorizontalDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'nativeChromeMatte',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),
  plugins:before?[{name:'before-chrome-only',setup(builder){builder.onLoad({filter:/[\\/]sky-gpu-renderer\.ts$/},()=>({contents:source,loader:'ts'}));}}]:[]});
const code=compiled.outputFiles[0]!.text;await fs.writeFile(output+'/production.js',code,{flag:'wx'});
const cases=[{name:'day-dpr1',width:390,height:844,dpr:1,inset:44,background:'#080D17'},
  {name:'day-fractional-dpr3',width:390.4,height:844,dpr:3,inset:44,background:'#080D17'},
  {name:'day-status-and-menu',width:390.4,height:844,dpr:3,inset:88,background:'#080D17'},
  {name:'red-dpr3',width:390.4,height:844,dpr:3,inset:44,background:'#180400'},
  {name:'clamp-small-canvas',width:32,height:16,dpr:1,inset:44,background:'#080D17'},
  ...[undefined,0,-3,NaN].map((inset,index)=>({name:'fallback-'+index,width:390,height:844,dpr:1,inset,background:'#080D17'}))];
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:code});
  const results=await page.evaluate((cases:any[])=>{
    const api=(globalThis as any).nativeChromeMatte,canvas=document.querySelector('canvas')!,rows=[];
    for(const condition of cases){
      canvas.width=Math.round(condition.width*condition.dpr);canvas.height=Math.round(condition.height*condition.dpr);
      const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('no_webgl');
      const alive:any={textures:new Set(),buffers:new Set(),programs:new Set(),shaders:new Set()};
      const saved:any={};
      for(const [noun,key] of [['Texture','textures'],['Buffer','buffers'],['Program','programs'],['Shader','shaders']]){
        const create=(gl as any)['create'+noun],remove=(gl as any)['delete'+noun];saved['create'+noun]=create;saved['delete'+noun]=remove;
        (gl as any)['create'+noun]=(...args:any[])=>{const value=create.apply(gl,args);if(value)alive[key].add(value);return value;};
        (gl as any)['delete'+noun]=(value:any)=>{alive[key].delete(value);remove.call(gl,value);};
      }
      const pixels=()=>{const rgba=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);return rgba;};
      const draw=(inset:any)=>{
        const renderer=api.createSkyGpuRenderer(gl,condition.dpr,{nativeNavigationHeightPx:inset});
        renderer.begin(condition.width,condition.height,condition.background);
        if(!renderer.solarLight({basis:api.createSkyViewBasis(0,135,0),verticalFovDeg:85},
          {direction:api.skyHorizontalDirection(180,65),altitudeDeg:65}))throw Error('solar_draw_failed');
        // Deliberately bright content after the atmospheric pass: the matte
        // must remain final, even when a body/stellar point is under the bar.
        renderer.disc(10,10,8,'#FFFFFF',1);
        renderer.disc(condition.width/2,condition.height/2,8,'#FFFFFF',1);
        renderer.finish();gl.finish();const rgba=pixels(),scissorLeaked=gl.isEnabled(gl.SCISSOR_TEST);
        const glError=gl.getError();renderer.dispose();return{rgba,glError,scissorLeaked};
      };
      const base=draw(undefined),matte=draw(condition.inset);
      const shouldApply=Number.isFinite(condition.inset)&&condition.inset>0;
      const topRows=shouldApply?Math.ceil(Math.min(condition.inset,condition.height)*canvas.height/condition.height):0;
      const expected=[1,3,5].map(index=>parseInt(condition.background.slice(index,index+2),16)).concat(255);
      let wrongChromePixels=0,changedContentPixels=0,maximumContentDelta=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const offset=(y*canvas.width+x)*4;const isChrome=y>=canvas.height-topRows;
        if(isChrome){if(expected.some((value,index)=>matte.rgba[offset+index]!==value))wrongChromePixels++;}
        else{let delta=0;for(let channel=0;channel<4;channel++)delta=Math.max(delta,Math.abs(matte.rgba[offset+channel]-base.rgba[offset+channel]));
          changedContentPixels+=Number(delta>0);maximumContentDelta=Math.max(maximumContentDelta,delta);}
      }
      rows.push({condition:{...condition,inset:Number.isFinite(condition.inset)?condition.inset:null},topRows,wrongChromePixels,changedContentPixels,maximumContentDelta,
        glErrors:[base.glError,matte.glError],scissorLeaked:base.scissorLeaked||matte.scissorLeaked,
        retired:Object.fromEntries(Object.entries(alive).map(([key,set]:any)=>[key,set.size]))});
      for(const [key,value]of Object.entries(saved))(gl as any)[key]=value;
    }
    return rows;
  },cases);
  const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(file==='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts'?source:await fs.readFile(file))})));
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Finite real software WebGL native-chrome surface checks; not WXML/phone/total performance acceptance',name,
    sourceSha256:sha(source),sourceHashes,bundleSha256:sha(code),results,errors},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({name,output,results}));
  assert.equal(errors.length,0);
  for(const row of results){
    assert.equal(row.wrongChromePixels,0,'Bright sky/body defeats dark native status-bar surface: '+row.condition.name);
    assert.equal(row.changedContentPixels,0,'Native chrome must not change the remaining sky: '+row.condition.name);
    assert.deepEqual(row.glErrors,[0,0]);assert.equal(row.scissorLeaked,false);assert(Object.values(row.retired).every(value=>value===0));
  }
}finally{await browser.close();}
