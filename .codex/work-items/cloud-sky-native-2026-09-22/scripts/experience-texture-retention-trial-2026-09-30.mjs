import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Prepare a bounded software comparison. The proposed module stays task-local
// until actual current-scene results support adoption; source PNGs are unchanged.
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';
const original=await fs.readFile(owner,'utf8');
const oldFinish=`      for (const key of entries.keys()) { if (bytes <= byteBudget) break; remove(key); }`;
assert.equal(original.split(oldFinish).length,2);
const proposed=`      if (bytes > byteBudget) {
        // Every remaining image was used in this frame. Compare the existing
        // LRU suffix with a size-first fit; use it only when it retains more
        // upload bytes. Equal fits keep LRU and all original draw order.
        const current = [...entries];
        let lruBytes = bytes;
        const lruRemove = new Set<object>();
        for (const [source, entry] of current) {
          if (lruBytes <= byteBudget) break;
          if (entry.texture) { lruBytes -= entry.bytes; lruRemove.add(source); }
        }
        let fittedBytes = 0;
        const fitted = new Set<object>();
        for (const [source, entry] of [...current].reverse().sort((a,b) => b[1].bytes-a[1].bytes)) {
          if (entry.texture && fittedBytes + entry.bytes <= byteBudget) {
            fitted.add(source); fittedBytes += entry.bytes;
          }
        }
        for (const [source, entry] of current) {
          // Failed identities use no texture bytes. Retention pressure cannot
          // un-latch their failure or trigger an implicit upload retry.
          if (entry.texture && (fittedBytes > lruBytes ? !fitted.has(source) : lruRemove.has(source))) remove(source);
        }
      }`;
await fs.writeFile(task+'/tmp/texture-retention-before-0930.ts',original,{flag:'wx'});
await fs.writeFile(task+'/tmp/texture-retention-candidate-0930.ts',original.replace(oldFinish,proposed),{flag:'wx'});

let script=await fs.readFile(task+'/scripts/experience-artwork-raster-gpu-2026-09-30.mts','utf8');
const replace=(before,after)=>{assert(script.includes(before),before);script=script.replace(before,after);};
replace("const withoutRaster=process.argv.includes('--without-raster');","const withoutRaster=process.argv.includes('--original-retention');");
replace("cloud-sky-artwork-raster-0930'+(withoutRaster?'-mutation':'')","cloud-sky-texture-retention-trial-0930'+(withoutRaster?'-mutation':'')");
replace("const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-current-composition-0930/result.json','utf8'));","const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-artwork-raster-0930/result.json','utf8'));");
replace("if(!source.path.endsWith('/sky-gpu-renderer.ts'))","if(!source.path.endsWith('/sky-gpu-textures.ts'))");
replace("const frozen=await fs.readFile('output/playwright/cloud-sky-current-composition-0930/production.js');","const frozen=await fs.readFile('output/playwright/cloud-sky-artwork-raster-0930/production.js');");
replace("target:'es2022',tsconfig:","target:'es2022',plugins:[{name:'task-local-retention-trial',setup(build){build.onLoad({filter:/sky-gpu-textures\\.ts$/},async()=>({contents:await fs.readFile(task+'/tmp/texture-retention-candidate-0930.ts','utf8'),loader:'ts'}));}}],tsconfig:");
replace("frozen.toString().replace('var composition49 =','var raster50After =')","frozen.toString()");
replace("map(async file=>({path:file,sha256:sha(await fs.readFile(file))}))","map(async file=>{const actual=file.endsWith('/sky-gpu-textures.ts')?task+'/tmp/texture-retention-candidate-0930.ts':file;return {path:actual,sha256:sha(await fs.readFile(actual))};})");
replace("frozen.toString().replace('var composition49 =','var raster50Before =')","frozen.toString().replace('var raster50After =','var raster50Before =')");
replace("const calls:any[]=[];","const calls:any[]=[],allocations=new Map(),uploadPasses:any[]=[];let liveBytes=0,peakBytes=0,uploads:any[]=[];");
replace("gl.deleteTexture=texture=>{if(texture)live.delete(texture);remove(texture);};","gl.deleteTexture=texture=>{if(texture){live.delete(texture);liveBytes-=allocations.get(texture)??0;allocations.delete(texture);}remove(texture);};");
replace("(gl as any).texImage2D=(...args:any[])=>{textureIds.set(gl.getParameter(gl.TEXTURE_BINDING_2D),input.ids.get(args.at(-1)));return (tex as any)(...args);};",
  "(gl as any).texImage2D=(...args:any[])=>{const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),source=args.at(-1),id=input.ids.get(source)??'static';const size=args.length===9?Number(args[3])*Number(args[4])*4:Number(source?.width)*Number(source?.height)*4;textureIds.set(texture,id);if(Number.isFinite(size)&&size>0){liveBytes+=size-(allocations.get(texture)??0);allocations.set(texture,size);peakBytes=Math.max(peakBytes,liveBytes);uploads.push({id,bytes:size});}return (tex as any)(...args);};");
replace("api.drawSkyScene(...args);gl.finish();calls.length=0;\n    const begin=performance.now();api.drawSkyScene(...args);gl.finish();const elapsed=performance.now()-begin;",
  "for(let pass=0;pass<9;pass++){uploads=[];peakBytes=liveBytes;const start=performance.now();api.drawSkyScene(...args);gl.finish();uploadPasses.push({pass,elapsed:performance.now()-start,uploads:[...uploads],liveBytes,peakBytes});}const elapsed=uploadPasses.at(-1).elapsed;");
replace("return {calls,elapsed,glError,scissorEnabled,","return {calls,elapsed,uploadPasses,retiredLogicalBytes:liveBytes,retiredAllocations:allocations.size,glError,scissorEnabled,");
replace("assert.equal(result.liveTextures,0);assert.equal(result.frameAt,condition.at);","assert.equal(result.liveTextures,0);assert.equal(result.retiredLogicalBytes,0);assert.equal(result.retiredAllocations,0);assert(result.uploadPasses.every((pass:any)=>pass.liveBytes<=16*1024*1024));assert.equal(result.frameAt,condition.at);");
replace("console.log(JSON.stringify({name:condition.name,calls:after.calls.length,beforeArea:before.calls.reduce((sum:number,call:any)=>sum+call.area,0),afterArea:after.calls.reduce((sum:number,call:any)=>sum+call.area,0),pixelsEqual:true}));",
  "console.log(JSON.stringify({name:condition.name,beforeWarmBytes:before.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0),afterWarmBytes:after.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0),beforeWarmCalls:before.uploadPasses[1].uploads.length,afterWarmCalls:after.uploadPasses[1].uploads.length,pixelsEqual:true}));");
replace("const common=rows.find(row=>row.condition.name==='common-dpr3');assert(common.variants[1].calls.reduce((sum:number,call:any)=>sum+call.area,0)<common.variants[0].calls.reduce((sum:number,call:any)=>sum+call.area,0)/2);",
  "const common=rows.find(row=>row.condition.name==='common-dpr3');const warmBytes=(variant:any)=>variant.uploadPasses[1].uploads.reduce((sum:number,upload:any)=>sum+upload.bytes,0);assert(warmBytes(common.variants[1])<warmBytes(common.variants[0]));for(const row of rows)assert(warmBytes(row.variants[1])<=warmBytes(row.variants[0]),row.condition.name);");
replace("Actual current production scene and registered-image raster box/pixel comparison against frozen v49; software GPU, not native target timing/residency or complete acceptance",
  "Task-local candidate retention policy against frozen current v50 production; actual upload bytes, completed-frame logical retention and software pixels; no native timing/GC/peak acceptance or source adoption");
await fs.writeFile(task+'/scripts/experience-texture-retention-trial-gpu-2026-09-30.mts',script,{flag:'wx'});
console.log('Prepared task-local retention candidate and reproducible current-v50 software comparison; product source unchanged');
