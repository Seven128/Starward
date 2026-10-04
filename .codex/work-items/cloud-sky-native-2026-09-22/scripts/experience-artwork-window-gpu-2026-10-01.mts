// Registered original W3 RGBA and SDSS RGB, shared production fragment and
// texture owner. This checks sampling/fallback, not native source acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog,resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts';
import {skyArtworkTextureWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const beforeDir='output/playwright/cloud-sky-body-resource-composition-1001';
const afterDir=beforeDir+'-after';
const output='output/playwright/cloud-sky-artwork-window-sampling-1001-r2';
await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(file,'utf8'));
const raw=projectAdoptedSkyCatalog(await read(task+'/tmp/current-native-report-2026-10-01.json')).data;
const stars=(await read(beforeDir+'/input-1.json')).data;
const publications={w3:await read(task+'/tmp/area-source-finite-publication-read.json'),
  sdss:await read('workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json')};
const assets:any[]=[];
for(const [type,reference] of [['w3','M:42'],['sdss','M:51']]){
  const publication=type==='w3'?publications.w3.entries.find((row:any)=>row.objectRef===reference):publications.sdss;
  for(const level of ['OVERVIEW','DETAIL']){
    const source=publication.levels[level];
    const file=type==='w3'?task+'/tmp/area-source-m42-'+level.toLowerCase()+'.png':
      'workers/miniapp-api/assets/deep-sky/sdss-m51/'+source.file;
    const bytes=await fs.readFile(file);assert.equal(sha(bytes),source.sha256,file);assert.equal(bytes.length,source.bytes,file);
    const pixels=source.pixels;assert([256,512].includes(pixels));
    let frame:any;
    for(const row of raw.hourly){
      const report=attachSkyCatalog(presentSkyTime(raw,row.at)!.report,stars);
      const deep=resolveSkyDeepSkyScene(report.skyScene,row.at)!;
      const index=deep.catalog.entries.findIndex(entry=>entry.objectRef===reference);
      const point=deep.frame.points!.find(point=>point[0]===index);
      if(point&&point[2]>15){frame={at:row.at,point};break;}
    }
    assert(frame,'No saved visible frame: '+reference);
    const registration=registerSkySurvey(frame.point,source.fieldDegrees,pixels,type==='w3'?pixels/2:256.5)!;assert(registration);
    const basis=createSkyViewBasis(frame.point[1],90+frame.point[2],0)!;
    assets.push({id:type+'-'+level,reference,level,file,sha256:sha(bytes),bytes:bytes.length,pixels,field:source.fieldDegrees,
      sourceFiniteMask:source.sourceFiniteMask??null,registration,basis,at:frame.at,
      data:'data:image/'+(type==='w3'?'png':'jpeg')+';base64,'+bytes.toString('base64')});
  }
}
const versions=[];
for(const [name,directory] of [['before',beforeDir],['current',afterDir]]){
  const binding=await read(directory+'/result.json'),bytes=await fs.readFile(directory+'/production.js');
  assert.equal(sha(bytes),binding.productionBundleSha256);
  versions.push({name,production:bytes.toString(),sha256:sha(bytes)});
}
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
const rows:any[]=[];
try{
  for(const version of versions){
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
    page.on('pageerror',(error:any)=>errors.push(String(error)));
    await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate('globalThis.__name=target=>target');await page.addScriptTag({content:version.production});
    await page.evaluate(async(assets:any[])=>{
      const images=new Map();for(const asset of assets){const image=new Image();image.src=asset.data;await image.decode();
        if(image.width!==asset.pixels||image.height!==asset.pixels)throw Error('image_dimensions');images.set(asset.id,image);}
      (globalThis as any).windowImages=images;
    },assets);
    for(const asset of assets)for(const viewName of ['local','offset-roll','wide']){
      const basis=asset.basis,angle=.52;
      const view={basis:viewName==='offset-roll'?{forward:basis.forward,
        right:basis.right.map((n:number,i:number)=>n*Math.cos(angle)+basis.up[i]*Math.sin(angle)),
        up:basis.up.map((n:number,i:number)=>n*Math.cos(angle)-basis.right[i]*Math.sin(angle))}:basis,
        verticalFovDeg:Math.max(.05,asset.field*(viewName==='wide'?1.5:.18)),
        ...(viewName==='offset-roll'?{center:{x:117,y:303}}:{})};
      for(const composite of ['source-over','infrared-cutout','optical-cutout']){
        const copyEligible=Boolean(skyArtworkTextureWindow(asset.registration,view,390,844,asset.pixels,asset.pixels));
        const modes=version.name==='current'&&copyEligible&&viewName==='local'&&composite==='source-over'?['normal','copy-failure']:['normal'];
        for(const mode of modes){
          const result=await page.evaluate(({asset,view,composite,mode}:any)=>{
            const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!,
              copy=gl.copyTexImage2D.bind(gl),tex=gl.texImage2D.bind(gl),create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
            const allocations=new Map();let liveBytes=0,peakBytes=0,uploads=0,copies=0;
            gl.deleteTexture=texture=>{liveBytes-=allocations.get(texture)??0;allocations.delete(texture);remove(texture);};
            (gl as any).texImage2D=(...args:any[])=>{uploads++;const source=args.at(-1),size=source.width*source.height*4,
              texture=gl.getParameter(gl.TEXTURE_BINDING_2D);liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);
              peakBytes=Math.max(peakBytes,liveBytes);return (tex as any)(...args);};
            (gl as any).copyTexImage2D=(...args:any[])=>{copies++;if(mode==='copy-failure')throw Error('bounded_optional_copy_failure');
              const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),size=args[5]*args[6]*4;
              liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);peakBytes=Math.max(peakBytes,liveBytes);
              return (copy as any)(...args);};
            const api=(globalThis as any).bodyComposition,image=(globalThis as any).windowImages.get(asset.id),failures:string[]=[];
            const renderer=api.createSkyGpuRenderer(gl,1,{imageFailed:()=>failures.push('image')});
            const passes=[];
            for(const next of [view,{...view,verticalFovDeg:Math.max(.05,asset.field*1.5)},view,view]){
              renderer.begin(390,844,'#21344C');const success=renderer.artwork(image,asset.registration,next,.73,'#FFFFFF',composite);
              renderer.finish();gl.finish();passes.push({success,uploads,copies,liveBytes,peakBytes});
            }
            const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
            let encoded='';for(let i=0;i<pixels.length;i+=32768)encoded+=String.fromCharCode(...pixels.subarray(i,i+32768));
            const result={passes,failures,glError:gl.getError(),rgba:btoa(encoded),png:canvas.toDataURL('image/png')};
            renderer.dispose();Object.assign(gl,{copyTexImage2D:copy,texImage2D:tex,createTexture:create,deleteTexture:remove});
            return {...result,retiredBytes:liveBytes,retiredTextures:allocations.size};
          },{asset,view,composite,mode});
          assert.equal(result.glError,0);assert.deepEqual(result.failures,[]);assert(result.passes.every((row:any)=>row.success));
          assert.equal(result.retiredBytes,0);assert.equal(result.retiredTextures,0);
          if(mode==='copy-failure')assert.equal(result.passes.at(-1).copies,1,'one optional copy failure must latch and preserve the full original');
          const id=[asset.id,viewName,composite,mode,version.name].join('-');
          const pixels=Buffer.from(result.rgba,'base64');
          await fs.writeFile(output+'/'+id+'.rgba',pixels,{flag:'wx'});
          await fs.writeFile(output+'/'+id+'.png',Buffer.from(result.png.split(',')[1],'base64'),{flag:'wx'});
          const {rgba,png,...metadata}=result;
          const row={id,asset:asset.id,viewName,composite,mode,version:version.name,view,rgbaSha256:sha(pixels),...metadata};
          if(version.name==='current'){
            const before=rows.find(row=>row.asset===asset.id&&row.viewName===viewName&&row.composite===composite&&row.version==='before');assert(before);
            const previous=await fs.readFile(output+'/'+before.id+'.rgba');assert.equal(sha(previous),before.rgbaSha256);
            let changedPixels=0,maxDelta=0;
            for(let i=0;i<previous.length;i+=4){let changed=false;for(let c=0;c<4;c++){
              const delta=Math.abs(previous[i+c]!-pixels[i+c]!);maxDelta=Math.max(maxDelta,delta);changed ||= delta>0;}if(changed)changedPixels++;}
            Object.assign(row,{pixelComparison:{changedPixels,maxDelta,strictStatus:changedPixels===0?'EXACT':'DIFFERENT'}});
          }
          rows.push(row);
        }
      }
    }
    assert.deepEqual(errors,[]);await page.close();
  }
  await fs.writeFile(output+'/result.json',JSON.stringify({scope:'Actual saved original M42 finite RGBA and SDSS M51 RGB overview/detail on real report-derived TAN registrations. All three shared composites, curved/offset/rolled/local/wide source sampling and same-identity expand/return/contained reuse; bounded optional GPU-copy failure, no scientific/source/native acceptance claim.',
    assets:assets.map(({data,...metadata})=>metadata),versions:versions.map(({production,...metadata})=>metadata),rows},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,conditions:rows.length,maxDelta:Math.max(...rows.map(row=>row.pixelComparison?.maxDelta??0)),
    changedConditions:rows.filter(row=>row.pixelComparison?.changedPixels).length,copyFallbacks:rows.filter(row=>row.mode==='copy-failure').length}));
}finally{await browser.close();}
