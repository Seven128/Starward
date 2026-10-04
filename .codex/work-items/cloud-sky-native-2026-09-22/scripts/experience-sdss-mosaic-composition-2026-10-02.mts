// Task-only candidate injection. The existing SDSS v1 API/loader is deliberately
// not claimed to accept this new product. Actual production projection/rendering
// runs with predecoded local bytes and the previously bound real astronomy report.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const candidatePath=process.argv.find(value=>value.startsWith('--candidate='))?.slice('--candidate='.length);
assert(candidatePath,'provide the actual completed candidate JSON path');
const candidate=JSON.parse(await fs.readFile(candidatePath,'utf8'));
// This small adapter is completed against the candidate's actual written schema.
assert(candidate.harnessInput,'candidate must bind the task-only harness input');
const product=candidate.harnessInput;
assert.equal(product.reference,'M:51');
assert.equal(product.orientation,'north-up/east-left');
const levels=['OVERVIEW','MEDIUM','DETAIL'];
for(const level of levels){
  const asset=product.levels[level];
  assert.equal(asset.pixels,512);assert.equal(asset.crpixFitsOneBased,256.5);
  assert(Number.isFinite(asset.fieldDegrees)&&asset.fieldDegrees>0);
}
const outputPath=process.argv.find(value=>value.startsWith('--output='))?.slice('--output='.length);
assert(outputPath,'provide a new output generation');
const output=path.resolve(outputPath);
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const reusedDirectory=path.resolve('output/playwright/cloud-sky-sdss-corrected-candidate-1002-r1');
const reusedResultPath=path.join(reusedDirectory,'result.json'),reusedRaw=await fs.readFile(reusedResultPath);
assert.equal(sha(reusedRaw),'e784cc33e12dc3f24535565701189d371f70335cb1f5257d87158070c450dba9');
const reused=JSON.parse(reusedRaw.toString());
const baseline=path.resolve('output/playwright/cloud-sky-wide-resource-composition-1002');
const prior=JSON.parse(await fs.readFile(path.join(baseline,'result.json'),'utf8'));
const inputs:any[]=[];
const reportPath=task+'/tmp/current-native-report-2026-10-01.json';
const reportRaw=await fs.readFile(reportPath);assert.equal(sha(reportRaw),prior.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportRaw.toString())).data;
const ref=raw.skyScene.catalog!;
const catalogRecord=prior.inputs.find((item:any)=>item.route===`/v2/sky/catalogs/${ref.catalogVersion}/${ref.catalogHash}`);
assert(catalogRecord);
const catalogPath=path.join(baseline,'input-'+(prior.inputs.indexOf(catalogRecord)+1)+'.json');
const catalogRaw=await fs.readFile(catalogPath);assert.equal(sha(catalogRaw),catalogRecord.sha256);
const stars=JSON.parse(catalogRaw.toString()).data;
inputs.push({path:reportPath,bytes:reportRaw.length,sha256:sha(reportRaw),scope:'Frozen actual prior local astronomy report; weather/service identity not recertified'},
  {path:catalogPath,bytes:catalogRaw.length,sha256:sha(catalogRaw)});
const legacyPath='workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json';
const legacyRaw=await fs.readFile(legacyPath),legacy=JSON.parse(legacyRaw.toString());
inputs.push({path:legacyPath,bytes:legacyRaw.length,sha256:sha(legacyRaw)});
const candidateRaw=await fs.readFile(candidatePath);
inputs.push({path:candidatePath,bytes:candidateRaw.length,sha256:sha(candidateRaw),scope:'Offline task-only candidate, not an accepted runtime publication'});
const images:any[]=[];
for(const family of ['legacy','available','signal'])for(const level of levels){
  const asset=family==='legacy'?legacy.levels[level]:family==='available'?product.levels[level]:product.levels[level].displayContribution;
  assert(asset,'actual completed output required: '+family+'/'+level);
  const file=family==='legacy'?path.join('workers/miniapp-api/assets/deep-sky/sdss-m51',asset.file):path.resolve(path.dirname(candidatePath),asset.file);
  const bytes=await fs.readFile(file);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);
  inputs.push({path:file,bytes:bytes.length,sha256:sha(bytes),family,level});
  if(family!=='legacy')images.push({id:family+':'+level,width:512,height:512,data:'data:image/png;base64,'+bytes.toString('base64')});
}
const solarRows=raw.hourly.map(hour=>({hour,solar:skySolarLightAt(raw.hourly,hour.at)!}));
const choose=(target:number)=>solarRows.reduce((best,row)=>Math.abs(row.solar.altitudeDeg-target)<Math.abs(best.solar.altitudeDeg-target)?row:best);
const periods=[{name:'day',...choose(35)},{name:'twilight',...choose(-6)},{name:'night',...choose(-30)}];
assert(periods[0].solar.altitudeDeg>0);assert(periods[1].solar.altitudeDeg<0&&periods[1].solar.altitudeDeg>-12);assert(periods[2].solar.altitudeDeg<-18);
const variants=[{name:'baseline',family:'legacy',suppress:true},{name:'legacy',family:'legacy'},
  {name:'available-over',family:'available'},{name:'available-add',family:'available',blend:'additive'},
  {name:'signal-over',family:'signal',blend:'source-over'}];
const cases:any[]=[];
for(const period of periods){
  const report=attachSkyCatalog(presentSkyTime(raw,period.hour.at)!.report,stars);
  const deep=resolveSkyDeepSkyScene(report.skyScene,period.hour.at)!;
  const index=deep.catalog.entries.findIndex(entry=>entry.objectRef==='M:51');assert(index>=0);
  const point=deep.frame.points!.find(point=>point[0]===index)!;assert(point);
  const basis=createSkyViewBasis(point[1],90+point[2],0)!;
  for(const [level,fov] of [['OVERVIEW',.3],['MEDIUM',.12],['DETAIL',.05]] as const)for(const variant of variants){
    cases.push({name:period.name+'-'+level.toLowerCase()+'-'+variant.name,at:period.hour.at,sunAltitudeDeg:period.solar.altitudeDeg,
      targetAltitudeDeg:point[2],basis,report,level,fov,variant,mode:'DAY'});
  }
}
cases.push({...cases.find(row=>row.name==='night-detail-signal-over'),name:'night-detail-signal-observation',mode:'OBSERVATION'});
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:
  "export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';"},
  bundle:true,write:false,metafile:true,format:'iife',globalName:'sdssTrialProduction',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
const production=compiled.outputFiles[0]!.text;
const sourceHashes=await Promise.all(Object.keys(compiled.metafile!.inputs).filter(file=>file!=='<stdin>').map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
assert.equal(sha(production),reused.productionBundleSha256,'reused backgrounds require exactly the same renderer bundle');
assert.deepEqual(sourceHashes,reused.sourceHashes,'reused backgrounds require exactly the same source bindings');
for(const bound of reused.inputs.filter((item:any)=>!item.family && item.path!==reused.candidatePath)){
  assert.equal(sha(await fs.readFile(bound.path)),bound.sha256,'frozen scene/catalog/legacy input changed');
}
await fs.writeFile(output+'/production.js',production,{flag:'wx'});
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[],errors:string[]=[];
const reusedArtifacts:any[]=[];
const actualCases=cases.filter(condition=>!['baseline','legacy'].includes(condition.variant.name));
for(const condition of cases.filter(condition=>['baseline','legacy'].includes(condition.variant.name))){
  const previous=reused.rows.find((row:any)=>row.name===condition.name);assert(previous);
  for(const key of ['at','sunAltitudeDeg','targetAltitudeDeg','basis','mode','level','fov','variant'])assert.deepEqual(previous[key],condition[key],key);
  for(const extension of ['png','rgba']){
    const file=path.join(reusedDirectory,condition.name+'.'+extension),bytes=await fs.readFile(file);
    assert.equal(sha(bytes),previous[extension+'Sha256']);
    reusedArtifacts.push({path:file,bytes:bytes.length,sha256:sha(bytes),reusedFrom:reusedResultPath});
  }
  rows.push({...previous,reusedFrom:reusedResultPath,renderedInThisGeneration:false});
}
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',(error:any)=>errors.push(String(error)));
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:production});
  await page.evaluate(async(images:any[])=>{
    const decoded=new Map(),ids=new WeakMap();
    for(const asset of images){const image=new Image();image.src=asset.data;await image.decode();
      if(image.width!==asset.width||image.height!==asset.height)throw Error('decoded_dimensions_mismatch:'+asset.id);
      decoded.set(asset.id,image);ids.set(image,asset.id);}
    (globalThis as any).sdssTrialInput={api:(globalThis as any).sdssTrialProduction,decoded,ids};
  },images);
  for(const condition of actualCases){
    const value=await page.evaluate(({condition,product,legacy}:any)=>{
      const {api,decoded,ids}=(globalThis as any).sdssTrialInput,canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
      if(!gl)throw Error('missing_webgl');
      const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl),tex=gl.texImage2D.bind(gl),copy=gl.copyTexImage2D.bind(gl),allocated=new Map(),textures=new Set();
      let liveBytes=0,peakBytes=0;const uploads:any[]=[],draws:any[]=[],failures:any[]=[];
      gl.createTexture=()=>{const texture=create();textures.add(texture);return texture;};
      gl.deleteTexture=texture=>{textures.delete(texture);liveBytes-=allocated.get(texture)??0;allocated.delete(texture);remove(texture);};
      (gl as any).texImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),image=args.at(-1),bytes=args.length===9?Number(args[3])*Number(args[4])*4:Number(image.width)*Number(image.height)*4;
        liveBytes+=bytes-(allocated.get(texture)??0);allocated.set(texture,bytes);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id:ids.get(image)??'static',bytes});return (tex as any)(...args);};
      (gl as any).copyTexImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),bytes=Number(args[5])*Number(args[6])*4;
        liveBytes+=bytes-(allocated.get(texture)??0);allocated.set(texture,bytes);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id:'actual-gpu-window-copy',bytes});return (copy as any)(...args);};
      const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:(image:object)=>failures.push(ids.get(image))});
      const artwork=renderer.artwork.bind(renderer);
      renderer.artwork=(...values:any[])=>{
        const id=ids.get(values[0]),optical=typeof id==='string'&&/^(legacy|available|signal):/.test(id);
        if(optical&&condition.variant.blend)values[5]=condition.variant.blend;
        const result=optical&&condition.variant.suppress?true:artwork(...values);
        draws.push({id,composite:values[5],suppressed:Boolean(optical&&condition.variant.suppress),result});return result;
      };
      const family=condition.variant.family,metadata=family==='legacy'?legacy:product;
      const optical={reference:'M:51',publicationHash:family==='legacy'?legacy.publicationId:'TASK_ONLY_CORRECTED_CANDIDATE',level:condition.level,
        image:decoded.get(family+':'+condition.level),fieldDegrees:metadata.levels[condition.level].fieldDegrees,
        ...(condition.level!=='OVERVIEW'?{coarser:{image:decoded.get(family+':OVERVIEW'),level:'OVERVIEW',fieldDegrees:metadata.levels.OVERVIEW.fieldDegrees}}:{})};
      const args:any[]=Array(36).fill(undefined);let snapshot:any,painted:any;
      Object.assign(args,{0:renderer,1:condition.report,2:condition.at,3:null,4:null,5:390,6:844,7:condition.mode,
        8:(value:any,sources:any)=>{snapshot=value;painted=sources;},10:condition.fov,12:condition.basis,30:optical,
        34:{enabled:false},35:{horizontal:false,equatorial:false}});
      api.drawSkyScene(...args);gl.finish();
      const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let binary='';for(let i=0;i<pixels.length;i+=32768)binary+=String.fromCharCode(...pixels.subarray(i,i+32768));
      const target=snapshot.objects.find((object:any)=>object.reference==='M:51');
      const pick=target?api.pickPaintedSkyObjects(snapshot,{x:target.x,y:target.y,frameAt:snapshot.frameAt,catalogVersion:snapshot.catalogVersion,catalogHash:snapshot.catalogHash}).map((object:any)=>object.reference):[];
      const result={png:canvas.toDataURL('image/png'),rgba:btoa(binary),glError:gl.getError(),draws,uploads,peakLogicalBytes:peakBytes,
        references:snapshot.objects.map((object:any)=>object.reference),target:target??null,pick,sceneReportedPaintedImage:painted?.sdssOpticalImage?ids.get(painted.sdssOpticalImage):null,failures};
      renderer.dispose();Object.assign(gl,{createTexture:create,deleteTexture:remove,texImage2D:tex,copyTexImage2D:copy});
      return {...result,releasedLogicalBytes:liveBytes,releasedTextures:textures.size};
    },{condition,product,legacy});
    const {png,rgba,...metadata}=value,pixels=Buffer.from(rgba,'base64'),capture=Buffer.from(png.split(',')[1],'base64');
    await fs.writeFile(output+'/'+condition.name+'.png',capture,{flag:'wx'});await fs.writeFile(output+'/'+condition.name+'.rgba',pixels,{flag:'wx'});
    assert.equal(value.glError,0);assert.equal(value.releasedLogicalBytes,0);assert.equal(value.releasedTextures,0);assert.deepEqual(value.failures,[]);
    rows.push({name:condition.name,at:condition.at,sunAltitudeDeg:condition.sunAltitudeDeg,targetAltitudeDeg:condition.targetAltitudeDeg,
      basis:condition.basis,mode:condition.mode,level:condition.level,fov:condition.fov,variant:condition.variant,
      pngSha256:sha(capture),rgbaSha256:sha(pixels),renderedInThisGeneration:true,...metadata});
    await fs.writeFile(output+'/rows-partial.json',JSON.stringify(rows,null,2)+'\n');
    console.log(JSON.stringify({name:condition.name,sunAltitudeDeg:condition.sunAltitudeDeg,sceneReportedPaintedImage:value.sceneReportedPaintedImage,pick:value.pick}));
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
const comparisons:any[]=[];
for(const period of periods)for(const level of levels){
  const prefix=period.name+'-'+level.toLowerCase(),baselinePixels=await fs.readFile(reusedDirectory+'/'+prefix+'-baseline.rgba');
  for(const variant of variants.filter(row=>!row.suppress)){
    const directory=variant.name==='legacy'?reusedDirectory:output;
    const pixels=await fs.readFile(directory+'/'+prefix+'-'+variant.name+'.rgba');let changedPixels=0,maxDelta=0,darkenedPixels=0;
    for(let i=0;i<pixels.length;i+=4){const delta=[0,1,2].map(channel=>pixels[i+channel]!-baselinePixels[i+channel]!);
      if(delta.some(value=>value!==0))changedPixels++;if(delta.some(value=>value<0))darkenedPixels++;maxDelta=Math.max(maxDelta,...delta.map(Math.abs));}
    comparisons.push({name:prefix+'-'+variant.name,baseline:prefix+'-baseline',changedPixels,darkenedPixels,maxDelta,meaning:'RGB comparison to same production sky with optical passes suppressed; not a quality pass'});
  }
}
const artifacts=await Promise.all((await fs.readdir(output)).filter(name=>name.endsWith('.png')||name.endsWith('.rgba')).map(async name=>{const bytes=await fs.readFile(output+'/'+name);return {path:output+'/'+name,bytes:bytes.length,sha256:sha(bytes)};}));
const result={scope:'Task-only actual multi-field offline candidate injected into production software WebGL. Eighteen unchanged baseline/legacy scenes are byte-bound reuse with identical renderer/source/scene inputs; 28 candidate scenes are newly drawn. This is neither publication/loader/source-route compatibility nor scientific/whole-image quality/native page/gestures/resource/capacity/final acceptance. Predecoded logical texture accounting is not actual client peak. Display alternatives remain unadopted.',
  candidatePath,productionBundleSha256:sha(production),sourceHashes,inputs,reusedBackground:{path:reusedResultPath,bytes:reusedRaw.length,sha256:sha(reusedRaw)},harness:{path:task+'/scripts/experience-sdss-mosaic-composition-2026-10-02.mts',sha256:sha(await fs.readFile(task+'/scripts/experience-sdss-mosaic-composition-2026-10-02.mts'))},rows,comparisons,artifacts,reusedArtifacts,errors};
await fs.writeFile(output+'/result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,scenes:rows.length,newlyDrawn:actualCases.length,reused:rows.length-actualCases.length}));
