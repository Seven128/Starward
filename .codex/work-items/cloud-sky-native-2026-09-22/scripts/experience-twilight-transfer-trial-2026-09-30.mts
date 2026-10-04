// One bounded display experiment against the newly available reference.
// It does not change production source, public time or a native candidate.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {attachSkyCatalog,resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const output=path.resolve('output/playwright/cloud-sky-twilight-transfer-trial-0930-r2');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const conditions=JSON.parse(await fs.readFile(task+'/evidence/experience-twilight-reference-conditions-2026-09-30.json','utf8'));
const raw=projectAdoptedSkyCatalog(JSON.parse(await fs.readFile(task+'/tmp/v49-current-public-report.json','utf8'))).data;
const reads:any[]=[];
async function get(route:string){const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
  const bytes=Buffer.from(await response.arrayBuffer());reads.push({route,sha256:sha(bytes),bytes:bytes.length});return bytes;}
const cat=raw.skyScene.catalog!,stars=JSON.parse((await get(`/v2/sky/catalogs/${cat.catalogVersion}/${cat.catalogHash}`)).toString()).data;
const presentation=presentSkyTime(raw,conditions.utcAt)!;assert(presentation);
const report=attachSkyCatalog(presentation.report,stars),sun=skySolarLightAt(report.hourly,conditions.utcAt)!;assert(sun);
const frame=resolveSkySceneFrame(report.skyScene,conditions.utcAt)!;assert(frame);
const arcturusIndex=report.skyScene.catalog!.entries.findIndex(entry=>entry.objectRef==='HR:5340');
const arcturus=frame.points.find(point=>point[0]===arcturusIndex)!;assert(arcturus);
const basis=createSkyViewBasis(conditions.centerInferredFromArcturusUi.azimuthDeg,90+conditions.centerInferredFromArcturusUi.altitudeDeg,0)!;
const fov=720/Math.PI*Math.atan(Math.tan(conditions.shortSideFovDegRequested*Math.PI/720)*conditions.canvas.cssHeight/conditions.canvas.cssWidth);
const manifest=JSON.parse((await get('/v2/sky/landscape/manifest')).toString()),resource=manifest.resources.find((row:any)=>row.id==='detail');
const image=await get(resource.image.downloadUrl),alpha=await get(resource.alpha.downloadUrl);
assert.equal(sha(image),resource.image.sha256);assert.equal(sha(alpha),resource.alpha.sha256);
const rendererPath='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',original=await fs.readFile(rendererPath,'utf8');
const normal=original.replaceAll('\r\n','\n');
const previous=normal.slice(normal.indexOf('    // Low sunlight crosses'),normal.indexOf('    gl_FragColor = vec4(sky,1.0);'));
assert(previous.includes('float directSunFade') && previous.includes('const vec3 DAY_CEILING'));
assert.equal(normal.split(previous).length,2);
const experiment=normal.replace(previous,`    // The relative spectrum of low sunlight survives civil twilight. Its
    // strength is already faded by the exact-time twilight curve below.
    float lowSun = 1.0-smoothstep(0.0,20.0,u_sunAltitude);
    float towardSun = max(scatterCosine,0.0);
    float horizonWeight = 1.0-smoothstep(0.2,0.7,ray.z);
    float sunsetWeight = lowSun*(0.15+0.85*towardSun)*horizonWeight;
    // A half-path relative transmittance is a fixed display approximation;
    // it supplies chromaticity, not measured local sunlight or radiance.
    vec3 solarChroma = sqrt(sunTransmittance/max(sunTransmittance.r,0.0001));
    float twilight = pow(smoothstep(-18.0,3.0,u_sunAltitude),3.0);
    vec3 radiance = 550.0*twilight*scattering*mix(vec3(1.0),solarChroma,sunsetWeight);
    // Only the active Mie forward lobe needs the near-disc compression.
    float horizonSolar = lowSun*towardSun*horizonWeight;
    float exposure = 0.12*(1.0-0.45*lowSun)*(1.0-0.85*horizonSolar*mieTwilight);
    // Keep the dark chart's existing maximum while preserving the low-sun
    // spectrum; a blue channel ceiling must not recolour the solar horizon.
    const vec3 DAY_CEILING = vec3(0.14,0.27,0.39);
    vec3 ceiling = mix(DAY_CEILING,vec3(0.39),sunsetWeight);
    vec3 mapped = vec3(1.0)-exp(-exposure*radiance);
    mapped = pow(mapped,vec3(mix(1.0,0.65,sunsetWeight)));
    vec3 sky = u_base+(ceiling-u_base)*mapped+nightGlow;
`);
await fs.writeFile(output+'/experiment-renderer.ts',experiment,{flag:'wx'});
const exports=`export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
export {createSkyPanoramaMask} from './apps/wechat-miniapp/src/features/sky/sky-landscape-mask';
export {decodeSkyLandscapeAlpha} from './packages/miniapp-contracts/src/sky-landscape-publication';
export {projectSkyDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';`;
const bundles:any[]=[];
for(const [name,source] of [['before',normal],['experiment',experiment]]){
  const compiled=await build({stdin:{contents:exports,resolveDir:path.resolve('.')},bundle:true,write:false,metafile:true,format:'iife',globalName:'twilightTrial',platform:'browser',target:'es2022',
    tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json'),plugins:[{name:'bounded-owner-trial',setup(builder){builder.onLoad({filter:/[\\/]sky-gpu-renderer\.ts$/},()=>({contents:source,loader:'ts'}));}}]});
  await fs.writeFile(output+'/'+name+'.js',compiled.outputFiles[0]!.text,{flag:'wx'});
  bundles.push({name,code:compiled.outputFiles[0]!.text,sourceSha256:sha(source),modules:await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})))});
}
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});const rows:any[]=[],errors:string[]=[];
try{
  for(const bundle of bundles){
    const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(e:any)=>errors.push(String(e)));
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:bundle.code});
    const effect=await page.evaluate(async(input:any)=>{
      const api=(globalThis as any).twilightTrial,canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      const image=new Image();image.src=input.image;await image.decode();
      const mask=api.createSkyPanoramaMask(input.manifest,input.resource,api.decodeSkyLandscapeAlpha(input.alpha,input.resource));
      const renderer=api.createSkyGpuRenderer(gl,1),samples:any[]=[];
      renderer.begin(390,844,'#080D17');assertSolar:if(!renderer.solarLight({basis:input.basis,verticalFovDeg:input.fov},input.sun))throw Error('solar_draw_failed');renderer.finish();gl.finish();
      for(const [label,azimuth,altitude] of [['sunward-low',input.sunAzimuth,2],['sunward-10',input.sunAzimuth,10],['upper',input.sunAzimuth,50]]){
        const p=api.projectSkyDirection(azimuth,altitude,input.basis,390,844,input.fov);if(!p){samples.push({label,outside:true});continue;}
        const pixel=new Uint8Array(4);gl.readPixels(Math.floor(p.x),843-Math.floor(p.y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);samples.push({label,azimuth,altitude,x:p.x,y:p.y,rgb:Array.from(pixel.slice(0,3))});
      }
      let snapshot:any;const args:any[]=Array(36).fill(undefined);Object.assign(args,{0:renderer,1:input.report,2:input.at,3:null,4:null,5:390,6:844,7:'DAY',
        8:(value:any)=>snapshot=value,10:input.fov,12:input.basis,34:{enabled:true,panorama:{image,mask}},35:{horizontal:true,equatorial:false}});
      api.drawSkyScene(...args);gl.finish();const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      const glError=gl.getError();renderer.dispose();return{samples,glError,frameAt:snapshot.frameAt,paintedResource:snapshot.view.landscape.resource.id,objects:snapshot.objects.length,rgbaBase64:btoa(binary)};
    },{report,at:conditions.utcAt,basis,fov,sun,sunAzimuth:presentation.row.sunAzimuthDeg,manifest,resource,image:'data:image/png;base64,'+image.toString('base64'),alpha:JSON.parse(alpha.toString())});
    assert.equal(effect.glError,0);assert.equal(effect.frameAt,conditions.utcAt);assert.equal(effect.paintedResource,'detail');
    const file=bundle.name+'.png';await page.locator('canvas').screenshot({path:output+'/'+file});const {rgbaBase64,...facts}=effect;
    rows.push({name:bundle.name,...facts,rgbaSha256:sha(Buffer.from(rgbaBase64,'base64')),image:file,imageSha256:sha(await fs.readFile(output+'/'+file))});
    console.log(JSON.stringify({name:bundle.name,samples:effect.samples}));await page.close();
  }
  const result={scope:'One in-memory solar display experiment, not adopted source/candidate or native/quality acceptance',reference:conditions,
    reportSha256:sha(await fs.readFile(task+'/tmp/v49-current-public-report.json')),rendererBeforeSha256:sha(original),experimentSha256:sha(experiment),sun,
    actualStar:{reference:'HR:5340',azimuthDeg:arcturus[1],altitudeDeg:arcturus[2]},basis,verticalFovDeg:fov,reads,bundles:bundles.map(({code,...metadata})=>metadata),rows,errors,
    limits:['Reference clock UI resolves seconds only and final JPEG is 390x843; current software screenshot 390x844 is not a pixel-identical acceptance comparison',
      'Core BSC/landscape scene only, independent photographs/SAO/refined planetary textures absent; all-layer and target acceptance remain open',
      'No Context PUT, native operation, runtime restart, candidate build or source modification; source coordinates and full public business scope preserved']};
  await fs.writeFile(output+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});assert.equal(errors.length,0);
}finally{await browser.close();}
