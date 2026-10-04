// Task-only opt-in level composition. The old scene receives no successful
// source credit from this adapter; no new publication/loader is claimed.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const outputArgument=process.argv.find(value=>value.startsWith('--output='))?.slice(9);
assert(outputArgument,'provide exclusive output generation');
const output=path.resolve(outputArgument);
const pressureProbe=process.argv.includes('--pressure-probe');
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
await fs.copyFile(task+'/scripts/experience-sdss-level-composition-2026-10-02.mts',output+'/executed-script.mts');
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const bind=async(file:string)=>{const raw=await fs.readFile(file);return {path:file,bytes:raw.length,sha256:sha(raw)};};
const frozen=JSON.parse(await fs.readFile('output/playwright/cloud-sky-wide-resource-composition-1002/result.json','utf8'));
const reportPath=task+'/tmp/current-native-report-2026-10-01.json',reportRaw=await fs.readFile(reportPath);
assert.equal(sha(reportRaw),frozen.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportRaw.toString())).data,ref=raw.skyScene.catalog!;
const record=frozen.inputs.find((item:any)=>item.route===`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`);assert(record);
const catalogPath='output/playwright/cloud-sky-wide-resource-composition-1002/input-'+(frozen.inputs.indexOf(record)+1)+'.json';
const catalogRaw=await fs.readFile(catalogPath);assert.equal(sha(catalogRaw),record.sha256);
const stars=JSON.parse(catalogRaw.toString()).data;
const candidatePath='output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json';
const candidateRaw=await fs.readFile(candidatePath);assert.equal(sha(candidateRaw),'73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52');
const candidate=JSON.parse(candidateRaw.toString()),product=candidate.harnessInput;
const inputs=await Promise.all([reportPath,catalogPath,candidatePath].map(bind));
const images:any[]=[];
for(const level of ['OVERVIEW','MEDIUM']){
  const asset=product.levels[level],file=path.join(path.dirname(candidatePath),asset.file),bytes=await fs.readFile(file);
  assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);
  inputs.push(await bind(file));images.push({id:level,data:'data:image/png;base64,'+bytes.toString('base64')});
}
const solar=raw.hourly.map(hour=>({hour,solar:skySolarLightAt(raw.hourly,hour.at)!}));
const choose=(target:number)=>solar.reduce((a,b)=>Math.abs(a.solar.altitudeDeg-target)<Math.abs(b.solar.altitudeDeg-target)?a:b);
const periods=[{name:'night',...choose(-30)},{name:'day',...choose(35)}].map(value=>{
  const report=attachSkyCatalog(presentSkyTime(raw,value.hour.at)!.report,stars);
  const deep=resolveSkyDeepSkyScene(report.skyScene,value.hour.at)!;
  const index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:51'),point=deep.frame.points!.find(point=>point[0]===index)!;assert(point);
  const basis=createSkyViewBasis(point[1],90+point[2],0)!;
  return {...value,report,basis,point,registration:registerSkySurvey(point,product.levels.MEDIUM.fieldDegrees,512,256.5)!};
});
assert(periods[0].solar.altitudeDeg<-18 && periods[1].solar.altitudeDeg>0);
const contents="export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';";
const settings={stdin:{resolveDir:process.cwd(),contents},bundle:true,write:false,metafile:true,format:'iife' as const,globalName:'levelTrialProduction',platform:'browser' as const,target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')};
const compiled=await build(settings),production=compiled.outputFiles[0]!.text;
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(bind));
await fs.mkdir(output+'/source-snapshots');
for(const file of ['sky-gpu-renderer.ts','sky-artwork-level-composition.ts','sky-gpu-textures.ts'])await fs.copyFile('apps/wechat-miniapp/src/features/sky/'+file,output+'/source-snapshots/'+file);
const modulePath='apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts';
const original=await fs.readFile(modulePath,'utf8');
assert.equal(original.split('return true;').length-1,1);
const mutation=original.replace('return true;','return max(max(rgb.r,rgb.g),rgb.b)>0.0;');
await fs.writeFile(output+'/brightness-as-availability-mutation.ts',mutation,{flag:'wx'});
const mutated=await build({...settings,globalName:'levelTrialMutated',plugins:[{name:'task-only-availability-mutation',setup(build){build.onLoad({filter:/sky-artwork-level-composition\.ts$/},()=>({contents:mutation,loader:'ts'}));}}]});
await fs.writeFile(output+'/production.js',production,{flag:'wx'});
await fs.writeFile(output+'/mutation.js',mutated.outputFiles[0]!.text,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],pixelsByName=new Map<string,Buffer>(),errors:string[]=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',(value:any)=>errors.push(String(value)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');
  await page.addScriptTag({content:production});await page.addScriptTag({content:mutated.outputFiles[0]!.text});
  await page.evaluate(async (assets:any[])=>{
    const images=new Map(),ids=new WeakMap();
    for(const asset of assets){const image=new Image();image.src=asset.data;await image.decode();if(image.width!==512||image.height!==512)throw Error('image_dimension_mismatch');images.set(asset.id,image);ids.set(image,asset.id);}
    const derive=(name:string,edit:(data:ImageData)=>void)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d')!;
      context.drawImage(images.get('MEDIUM'),0,0);const data=context.getImageData(0,0,512,512);edit(data);context.putImageData(data,0,0);images.set(name,canvas);ids.set(canvas,name);
    };
    derive('valid-black',data=>{for(let i=0;i<data.data.length;i+=4){data.data[i]=data.data[i+1]=data.data[i+2]=0;data.data[i+3]=255;}});
    derive('partial',data=>{for(let y=224;y<288;y++)for(let x=224;x<288;x++)data.data[(y*512+x)*4+3]=128;});
    derive('missing',data=>{for(let y=224;y<288;y++)for(let x=224;x<288;x++)data.data[(y*512+x)*4+3]=0;});
    derive('recovered',()=>{});
    (globalThis as any).levelInput={images,ids};
  },images);
  const cases=pressureProbe?[{name:'night-low-budget-pair',period:0,kind:'MEDIUM',pressure:true}]:[
    {name:'night-baseline',period:0,kind:'baseline'}, {name:'day-baseline',period:1,kind:'baseline'},
    {name:'night-coarse-only',period:0,kind:'coarse-only'},
    {name:'night-real-pair',period:0,kind:'MEDIUM'}, {name:'day-real-pair',period:1,kind:'MEDIUM'},
    {name:'night-valid-black',period:0,kind:'valid-black'}, {name:'night-partial',period:0,kind:'partial'},
    {name:'night-missing',period:0,kind:'missing'}, {name:'night-fine-upload-failure',period:0,kind:'MEDIUM',fail:true},
    {name:'night-recovered-fresh-image',period:0,kind:'recovered'}, {name:'night-black-availability-mutation',period:0,kind:'valid-black',mutated:true},
    {name:'night-low-budget-pair',period:0,kind:'MEDIUM',pressure:true},
    {name:'night-shared-bitmap',period:0,kind:'MEDIUM',sameImage:true},
    {name:'night-invalid-fine-registration',period:0,kind:'MEDIUM',invalidFine:true},
  ];
  for(const condition of cases){
    const period=periods[condition.period]!;
    const value=await page.evaluate(({condition,period,product}:any)=>{
      const api=condition.mutated?(globalThis as any).levelTrialMutated:(globalThis as any).levelTrialProduction;
      const {images,ids}=(globalThis as any).levelInput,canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;if(!gl)throw Error('webgl_unavailable');
      const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl),upload=gl.texImage2D.bind(gl),copy=gl.copyTexImage2D.bind(gl),draw=gl.drawArrays.bind(gl);
      const live=new Set(),bytes=new Map(),uploads:any[]=[],failures:any[]=[],groupDraws:any[]=[];let liveBytes=0,peakBytes=0,groupActive=false,groupPasses=0;
      gl.createTexture=()=>{const texture=create();live.add(texture);return texture;};
      gl.deleteTexture=(texture:any)=>{live.delete(texture);liveBytes-=bytes.get(texture)??0;bytes.delete(texture);remove(texture);};
      (gl as any).texImage2D=(...args:any[])=>{
        const source=args.at(-1);if(condition.fail&&ids.get(source)==='MEDIUM')throw Error('controlled_fine_upload_failure');
        const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),n=args.length===9?args[3]*args[4]*4:source.width*source.height*4;
        const result=(upload as any)(...args);liveBytes+=n-(bytes.get(texture)??0);bytes.set(texture,n);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id:ids.get(source)??'static',bytes:n});return result;
      };
      (gl as any).copyTexImage2D=(...args:any[])=>{const result=(copy as any)(...args),texture=gl.getParameter(gl.TEXTURE_BINDING_2D),n=args[5]*args[6]*4;liveBytes+=n-(bytes.get(texture)??0);bytes.set(texture,n);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id:'gpu-window-copy',bytes:n});return result;};
      gl.drawArrays=(...args:any[])=>{if(groupActive)groupPasses++;return (draw as any)(...args);};
      const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>failures.push(ids.get(image)),...(condition.pressure?{textureByteBudget:1}:{})});
      const oldArtwork=renderer.artwork.bind(renderer);let coarseRegistration:any;
      renderer.artwork=(image:any,registration:any,view:any,...args:any[])=>{
        if(image===images.get('OVERVIEW')){coarseRegistration=registration;return false;}
        if(image===images.get(condition.kind)||condition.kind==='coarse-only'&&image===images.get('MEDIUM')){
          if(condition.kind==='baseline')return false;
          groupActive=true;
          try{groupDraws.push(renderer.artworkLevels({coarse:{image:images.get('OVERVIEW'),registration:coarseRegistration,sampleAvailability:'joint-area-alpha'},
            fine:condition.kind==='coarse-only'?null:{image:condition.sameImage?images.get('OVERVIEW'):image,
              registration:condition.invalidFine?{...registration,rows:[]}:registration,sampleAvailability:'joint-area-alpha'}},view,1));}
          finally{groupActive=false;}
          // Current scene has no contribution/source-outcome contract. It may
          // not promote preparation/submission to a visible image source.
          return false;
        }
        return oldArtwork(image,registration,view,...args);
      };
      const optical={reference:'M:51',publicationHash:'TASK_ONLY_AVAILABILITY_RGBA',level:'MEDIUM',image:images.get(condition.kind)??images.get('MEDIUM'),fieldDegrees:product.levels.MEDIUM.fieldDegrees,
        coarser:{image:images.get('OVERVIEW'),level:'OVERVIEW',fieldDegrees:product.levels.OVERVIEW.fieldDegrees}};
      const args:any[]=Array(36).fill(undefined);let painted:any;
      Object.assign(args,{0:renderer,1:period.report,2:period.hour.at,3:null,4:null,5:390,6:844,7:'DAY',8:(_:any,sources:any)=>{painted=sources;},10:.12,12:period.basis,
        ...(condition.kind==='baseline'?{}:{30:optical}),34:{enabled:false},35:{horizontal:false,equatorial:false}});
      let drawError:string|null=null;
      try{api.drawSkyScene(...args);}catch(error){drawError=String(error);renderer.finish();}
      gl.finish();
      let coldRgbaSha256:string|null=null,warmChangedPixels:number|null=null;
      if(condition.name==='night-real-pair'){
        const cold=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,cold);
        (globalThis as any).coldLevelPixels=cold;
        groupPasses=0;groupDraws.length=0;
        api.drawSkyScene(...args);gl.finish();
      }
      const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      if(condition.name==='night-real-pair'){
        const cold=(globalThis as any).coldLevelPixels as Uint8Array;
        warmChangedPixels=0;for(let i=0;i<pixels.length;i+=4)if([0,1,2].some(c=>cold[i+c]!==pixels[i+c]))warmChangedPixels++;
        let b='';for(let i=0;i<cold.length;i+=32768)b+=String.fromCharCode(...cold.subarray(i,i+32768));coldRgbaSha256=btoa(b);
      }
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      const result={png:canvas.toDataURL('image/png'),rgba:btoa(binary),coldRgbaBase64:coldRgbaSha256,warmChangedPixels,glError:gl.getError(),drawError,groupDraws,groupPasses,uploads,failures,peakLogicalBytes:peakBytes,sceneSourceCredit:painted?.sdssOpticalImage?ids.get(painted.sdssOpticalImage):null};
      renderer.dispose();Object.assign(gl,{createTexture:create,deleteTexture:remove,texImage2D:upload,copyTexImage2D:copy,drawArrays:draw});
      return {...result,releasedTextures:live.size,releasedLogicalBytes:liveBytes};
    },{condition,period,product});
    const {png,rgba,coldRgbaBase64,...metadata}=value,capture=Buffer.from(png.split(',')[1],'base64'),pixels=Buffer.from(rgba,'base64');
    if(coldRgbaBase64){const cold=Buffer.from(coldRgbaBase64,'base64');assert.deepEqual(cold,pixels);Object.assign(metadata,{coldRgbaSha256:sha(cold)});await fs.writeFile(output+'/'+condition.name+'-cold.rgba',cold,{flag:'wx'});}
    await fs.writeFile(output+'/'+condition.name+'.png',capture,{flag:'wx'});await fs.writeFile(output+'/'+condition.name+'.rgba',pixels,{flag:'wx'});pixelsByName.set(condition.name,pixels);
    assert.equal(value.glError,0);assert.equal(value.releasedTextures,0);assert.equal(value.releasedLogicalBytes,0);assert.equal(value.sceneSourceCredit,null);
    if(!pressureProbe)assert.equal(value.drawError,null);
    if(!pressureProbe){
    if(condition.kind==='baseline')assert.equal(value.groupPasses,0);else{assert.equal(value.groupPasses,1);assert.equal(value.groupDraws.length,1);assert(value.groupDraws[0].coarsePrepared);assert.equal(value.groupDraws[0].finePrepared,condition.kind!=='coarse-only'&&!condition.fail&&!condition.invalidFine);}
    assert.deepEqual(value.failures,condition.fail?['MEDIUM']:[]);
    }
    rows.push({name:condition.name,at:period.hour.at,sunAltitudeDeg:period.solar.altitudeDeg,basis:period.basis,fov:.12,condition,rgbaSha256:sha(pixels),pngSha256:sha(capture),...metadata});
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
if(pressureProbe){
  const result={script:await bind(task+'/scripts/experience-sdss-level-composition-2026-10-02.mts'),sourceHashes,productionBundleSha256:sha(production),inputs,rows,scope:'actual bounded one-byte retention-budget paired-submit probe; not native memory/normal budget/adoption'};
  await fs.writeFile(output+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:await bind(output+'/result.json'),rows}));process.exit(0);
}
const night=periods[0]!,comparisons:any[]=[];
const rawOffset=(x:number,y:number)=>((844-1-y)*390+x)*4;
const selection=(x:number,y:number)=>skyArtworkUvAtDirection(night.registration,unprojectSkyPoint(x+.5,y+.5,night.basis,390,844,.12)!);
const compare=(name:string,reference:string,predicate:(uv:readonly[number,number]|null)=>boolean)=>{
  const a=pixelsByName.get(name)!,b=pixelsByName.get(reference)!;let count=0,changed=0,max=0;
  for(let y=0;y<844;y++)for(let x=0;x<390;x++){if(!predicate(selection(x,y)))continue;count++;const i=rawOffset(x,y),delta=[0,1,2].map(c=>Math.abs(a[i+c]!-b[i+c]!));if(delta.some(Boolean))changed++;max=Math.max(max,...delta);}
  return {name,reference,checkedPixels:count,changedPixels:changed,maxByteDelta:max};
};
const interior=(uv:readonly[number,number]|null)=>!!uv&&uv.every(v=>v>.2&&v<.8);
const partialInterior=(uv:readonly[number,number]|null)=>!!uv&&uv.every(v=>v>.46&&v<.54);
const outside=(uv:readonly[number,number]|null)=>!!uv&&(uv[0]<-.01||uv[0]>1.01||uv[1]<-.01||uv[1]>1.01);
comparisons.push(compare('night-valid-black','night-baseline',interior));assert.equal(comparisons.at(-1).changedPixels,0);
for(const name of ['night-partial','night-missing']){comparisons.push(compare(name,'night-coarse-only',partialInterior));assert.equal(comparisons.at(-1).changedPixels,0);assert(comparisons.at(-1).checkedPixels>100);}
comparisons.push(compare('night-valid-black','night-coarse-only',outside));assert.equal(comparisons.at(-1).changedPixels,0);
assert.deepEqual(pixelsByName.get('night-fine-upload-failure'),pixelsByName.get('night-coarse-only'));
assert.deepEqual(pixelsByName.get('night-recovered-fresh-image'),pixelsByName.get('night-real-pair'));
assert.deepEqual(pixelsByName.get('night-low-budget-pair'),pixelsByName.get('night-real-pair'));
assert.deepEqual(pixelsByName.get('night-invalid-fine-registration'),pixelsByName.get('night-coarse-only'));
comparisons.push(compare('night-black-availability-mutation','night-baseline',interior));assert(comparisons.at(-1).changedPixels>100,'brightness-as-availability mutation must visibly fail');
const artifacts=await Promise.all((await fs.readdir(output)).filter(name=>/\.(png|rgba|js|ts)$/.test(name)).map(name=>bind(output+'/'+name)));
const result={script:await bind(task+'/scripts/experience-sdss-level-composition-2026-10-02.mts'),sourceHashes,productionBundleSha256:sha(production),mutationBundleSha256:sha(mutated.outputFiles[0]!.text),inputs,rows,comparisons,artifacts,errors,
  scope:'Explicit task-only availability-RGBA opt-in; real existing scene background and registered field insertion with old source credit intentionally absent. Fine black/partial/missing/upload-failure/recovery and visible mutation bounded checks. Neither current v1 adoption/loader/publication/source-route/native interaction/PSF/color/quality nor total resource/capacity acceptance. Logical texture bytes only; fresh-image recovery is not the public native retry UI.'};
await fs.writeFile(output+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({result:await bind(output+'/result.json'),rows:rows.length,comparisons}));
