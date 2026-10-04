import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
let script=await fs.readFile(task+'/scripts/experience-texture-retention-trial-gpu-2026-09-30.mts','utf8');
const replace=(before,after)=>{assert(script.includes(before),before);script=script.replace(before,after);};
replace("cloud-sky-texture-retention-trial-0930'+(withoutRaster?'-mutation':'')","cloud-sky-texture-failure-pressure-0930'+(withoutRaster?'-mutation':'')");
replace("plugins:[{name:'task-local-retention-trial',setup(build){build.onLoad({filter:/sky-gpu-textures\\.ts$/},async()=>({contents:await fs.readFile(task+'/tmp/texture-retention-candidate-0930.ts','utf8'),loader:'ts'}));}}],",'');
replace("map(async file=>{const actual=file.endsWith('/sky-gpu-textures.ts')?task+'/tmp/texture-retention-candidate-0930.ts':file;return {path:actual,sha256:sha(await fs.readFile(actual))};})","map(async file=>({path:file,sha256:sha(await fs.readFile(file))}))");
replace("const prepared=conditions.map(condition=>{",`const commonCondition=conditions.find(row=>row.name==='common-dpr3')!,wideCondition=conditions.find(row=>row.name==='wide')!;
const selected=[commonCondition,wideCondition,{...wideCondition,name:'wide-failure',failure:'galactic'},
  {...commonCondition,name:'common-return'}];
const prepared=selected.map(condition=>{`);
replace("const result=await page.evaluate(({condition,variant}:any)=>{","const result=await page.evaluate(async({condition,variant}:any)=>{");
replace("let liveBytes=0,peakBytes=0,uploads:any[]=[];","let liveBytes=0,peakBytes=0,failedAttempts=0,uploads:any[]=[];");
replace("textureIds.set(texture,id);if(Number.isFinite(size)","textureIds.set(texture,id);if(condition.failure&&source===input.decoded.get(condition.failure)){failedAttempts++;throw Error('controlled_image_upload_failure');}if(Number.isFinite(size)");
replace("{imageFailed:()=>failures.push('GPU')}","{imageFailed:(image:object)=>failures.push('GPU:'+input.ids.get(image))}");
replace("renderer.dispose();gl.drawArrays=draw;",`let recovered:any=null,failedCapture:string|undefined;
    if(condition.failure){
      failedCapture=canvas.toDataURL('image/png');
      const replacement=new Image();replacement.src=galaxy.src;await replacement.decode();
      input.ids.set(replacement,'galactic:retry');args[26]=replacement;
      uploads=[];peakBytes=liveBytes;api.drawSkyScene(...args);gl.finish();
      const actual=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,actual);
      let encoded='';for(let index=0;index<actual.length;index+=32768)encoded+=String.fromCharCode(...actual.subarray(index,index+32768));
      recovered={rgba:btoa(encoded),uploads:[...uploads],references:snapshot.objects.map((object:any)=>object.reference),
        liveBytes,peakBytes,glError:gl.getError(),failedAttempts,gpuFailureCallbacks:failures.length};
    }
    renderer.dispose();gl.drawArrays=draw;`);
replace("return {calls,elapsed,uploadPasses,","return {calls,elapsed,uploadPasses,failedAttempts,recovered,failedCapture,");
replace("assert.deepEqual(result.failures,[]);",`assert.deepEqual(result.failures,condition.failure?Array(variant==='before'?9:1).fill('GPU:galactic'):[]);
   assert.equal(result.failedAttempts,condition.failure?(variant==='before'?9:1):0);
   if(result.recovered){assert.equal(result.recovered.glError,0);assert(result.recovered.uploads.some((upload:any)=>upload.id==='galactic:retry'));
    assert(result.recovered.liveBytes<=16*1024*1024);result.recovered.rgbaSha256=sha(Buffer.from(result.recovered.rgba,'base64'));delete result.recovered.rgba;}
   if(result.failedCapture){const file=condition.name+'-'+variant+'-before-retry.png';const data=Buffer.from(result.failedCapture.split(',')[1],'base64');
    await fs.writeFile(path.join(output,file),data,{flag:'wx'});result.failedCapture={file,sha256:sha(data)};}`);
replace("afterWarmCalls:after.uploadPasses[1].uploads.length,pixelsEqual:true}","afterWarmCalls:after.uploadPasses[1].uploads.length,beforeFailedAttempts:before.failedAttempts,afterFailedAttempts:after.failedAttempts,pixelsEqual:true}");
replace("const common=rows.find(row=>row.condition.name==='common-dpr3');const warmBytes=(variant:any)=>variant.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0);assert(warmBytes(common.variants[1])<warmBytes(common.variants[0]));for(const row of rows)assert(warmBytes(row.variants[1])<=warmBytes(row.variants[0]),row.condition.name);",`const failed=rows.find(row=>row.condition.failure),wideRow=rows.find(row=>row.condition.name==='wide');
 assert.equal(failed.variants[1].failedAttempts,1);assert(failed.variants[0].failedAttempts>failed.variants[1].failedAttempts);
 for(const variant of failed.variants){assert.equal(variant.recovered.rgbaSha256,wideRow.variants[1].rgbaSha256);
  assert.deepEqual(variant.recovered.references,wideRow.variants[1].references);}
 for(const row of rows.filter(row=>!row.condition.failure))assert.deepEqual(row.variants[0].uploadPasses.map((pass:any)=>pass.uploads),row.variants[1].uploadPasses.map((pass:any)=>pass.uploads));`);
replace("Task-local candidate retention policy against frozen current v50 production; actual upload bytes, completed-frame logical retention and software pixels; no native timing/GC/peak acceptance or source adoption",
  "Current production shared texture failure-latch repair versus frozen v50: actual wide-field pressure with an injected upload exception and new decoded-identity recovery, valid independent scene pixels and normal upload order; software evidence, not native retry UI, timing/GC/peak or device acceptance");
await fs.writeFile(task+'/scripts/experience-texture-failure-pressure-gpu-2026-09-30.mts',script,{flag:'wx'});
let build=await fs.readFile(task+'/scripts/experience-scene-v50-build-2026-09-30.ps1','utf8');
await fs.writeFile(task+'/scripts/experience-scene-v51-build-2026-09-30.ps1',build.replaceAll('v50','v51').replaceAll('Raster50','Pressure51'),{flag:'wx'});
console.log('Prepared current-source failure/pressure comparison and ordinary v51 isolated build; rejected retention candidate is not compiled');
