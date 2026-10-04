/** Independent synchronous pin lifecycle plus frozen actual pressure evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { createSkyGpuTextures } from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
let OUTPUT='output/sdss-level-pin-independent-1002-r1';
for(let generation=2;fs.existsSync(path.join(ROOT,OUTPUT));generation++)OUTPUT=`output/sdss-level-pin-independent-1002-r${generation}`;
fs.mkdirSync(path.join(ROOT,OUTPUT));
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const bind=(name:string)=>{const raw=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:raw.length,sha256:sha(raw)};};
const json=(name:string)=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const inputs:any[]=[];
const admit=(name:string,expected?:{bytes?:number;sha256:string})=>{
  const actual=bind(name);if(expected){assert.equal(actual.sha256,expected.sha256);if(expected.bytes!==undefined)assert.equal(actual.bytes,expected.bytes);}
  inputs.push(actual);return actual;
};
function fixture(owner= createSkyGpuTextures,budget=64){
  let error=0;
  const live=new Set<object>(), uploads:object[]=[], failures:object[]=[];
  const control={failed:null as object|null};
  const gl={NO_ERROR:0,TEXTURE_2D:3553,FRAMEBUFFER:36160,FRAMEBUFFER_BINDING:36006,
    TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,
    LINEAR:9729,CLAMP_TO_EDGE:33071,UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,RGBA:6408,UNSIGNED_BYTE:5121,
    createTexture(){const t={};live.add(t);return t;},deleteTexture(t:object){assert(live.delete(t));},
    bindTexture(){},texParameteri(){},pixelStorei(){},isContextLost:()=>false,
    getError(){const old=error;error=0;return old;},
    texImage2D(...args:any[]){const source=args.at(-1);uploads.push(source);if(source===control.failed)error=1282;},
  }as unknown as WebGLRenderingContext;
  return {textures:owner(gl,source=>failures.push(source),budget),live,uploads,failures,control};
}
const co={width:4,height:4},fine={width:4,height:4},next={width:4,height:4},after={width:4,height:4};
const nested=fixture();nested.textures.begin();let coarseTexture:any,fineTexture:any;
nested.textures.withPinned([co],()=>{
  coarseTexture=nested.textures.get(co);
  assert.throws(()=>nested.textures.withPinned([co,fine],()=>{
    fineTexture=nested.textures.get(fine);assert(nested.live.has(coarseTexture)&&nested.live.has(fineTexture));
    throw Error('bounded_inner_submit_failure');
  }),/bounded_inner_submit_failure/);
  assert(nested.textures.get(next));
  assert(nested.live.has(coarseTexture),'inner finally cannot release the existing outer pin');
  assert(!nested.live.has(fineTexture),'inner temporary pin is released on exception');
});
assert(nested.textures.get(after));assert(!nested.live.has(coarseTexture),'outer finally restores ordinary eviction');
nested.textures.finish();assert.equal(nested.live.size,1);nested.textures.dispose();assert.equal(nested.live.size,0);
assert.equal(nested.failures.length,0);

const failure=fixture(),bad={width:4,height:4};failure.control.failed=bad;failure.textures.begin();let held:any;
assert.throws(()=>failure.textures.withPinned([co,bad],()=>{
  held=failure.textures.get(co);assert.equal(failure.textures.get(bad),null);assert(failure.live.has(held));
  throw Error('bounded_outer_submit_failure');
}),/bounded_outer_submit_failure/);
assert.equal(failure.textures.get(bad),null);assert.equal(failure.uploads.filter(x=>x===bad).length,1);
assert.equal(failure.failures.length,1);assert(failure.textures.get(next));assert(!failure.live.has(held));
failure.textures.finish();failure.textures.dispose();assert.equal(failure.live.size,0);

const texturePath='apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';
const source=fs.readFileSync(path.join(ROOT,texturePath),'utf8');
const needle='!pinned.has(key)';assert.equal(source.split(needle).length-1,2);
const mutated=source.replaceAll(needle,'true /* task mutation bypasses pair pin */');
fs.writeFileSync(path.join(ROOT,OUTPUT,'pin-bypass.ts.txt'),mutated,{flag:'wx'});
const exports:any={};const js=ts.transpileModule(mutated,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(js,{exports},{timeout:5000});
const mutant=fixture(exports.createSkyGpuTextures);mutant.textures.begin();let erased:any;
mutant.textures.withPinned([co,fine],()=>{erased=mutant.textures.get(co);assert(mutant.textures.get(fine));assert(!mutant.live.has(erased));});
mutant.textures.finish();mutant.textures.dispose();assert.equal(mutant.live.size,0);

const r3Path='output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json';
admit(r3Path,{sha256:'47f2c8e4a1cf868a7ec3db4a90c2f7b8f2a35b87189432b2c18e33a76ccbc832'});
const final=json(r3Path),pair=final.rows.find((row:any)=>row.name==='night-real-pair');
const pressure=[];
for(const [when,expected]of [['before','641969843ee6fd7fcbabf7c69a18a2117138b7303afc7cc8cd6f94f6fca71151'],['after','d80860a95dd8bfb8bd131cff1d0f84cd3644185099170aa6583910fc991b34d4']]as const){
  const directory=`output/playwright/cloud-sky-sdss-level-pressure-${when}-1002-r1`;
  admit(directory+'/result.json',{sha256:expected});const result=json(directory+'/result.json'),row=result.rows[0];
  admit(directory+'/night-low-budget-pair.rgba',{sha256:row.rgbaSha256});
  for(const name of ['sky-gpu-textures.ts','sky-gpu-renderer.ts','sky-artwork-level-composition.ts']){
    const descriptor=result.sourceHashes.find((x:any)=>x.path.endsWith('/'+name));
    admit(directory+'/source-snapshots/'+name,descriptor);
  }
  pressure.push({when,drawError:row.drawError,rgbaSha256:row.rgbaSha256});
  if(when==='before')assert.equal(row.drawError,'Error: sky_gpu_artwork_levels_draw_failed');
  else{assert.equal(row.drawError,null);assert.equal(row.rgbaSha256,pair.rgbaSha256);}
}
assert.notEqual(pressure[0].rgbaSha256,pressure[1].rgbaSha256);
const frozenPath='output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json';admit(frozenPath);
const frozen=json(frozenPath);
for(const item of [...frozen.oldAssetsAfter,...frozen.oldCandidateAfter])admit(item.path,item);
const preservedPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json';admit(preservedPath);
for(const item of json(preservedPath))admit(item.path,item);
admit(texturePath,{sha256:'5642145c2941af15621c28d9eabc47d0ae8e4a0dc5f443c38ee7d9646b38f84e'});
admit(path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/'));
assert.deepEqual(inputs.map((x:any)=>bind(x.path)),inputs);
const result={inputs,nestedExceptionOuterPinPreserved:true,innerExceptionTemporaryPinReleased:true,outerFinallyOrdinaryEvictionRestored:true,
  failedFineLatchedAndCoarseIndependent:true,finishOriginalBudgetAndDisposeZero:true,
  boundedPinBypass:{changedGuards:2,mutantSourceSha256:sha(mutated),preparedCoarseDeletedBeforeCommonSubmission:true,
    scope:'Task-only controlled fake texture ownership; independent detection of actual escaped lifetime mechanism, not a new GPU/driver observation.'},
  actualFrozenPressure:pressure,oldPublishedAssetsUnchanged:frozen.oldAssetsAfter.length,oldSingleFieldOutputsUnchanged:frozen.oldCandidateAfter.length,
  preservedSixUnchanged:true,scope:'Independent source lifecycle and cached actual software-GPU pressure artifacts only; no browser/native/source download/adoption/total-memory/capacity claim.'};
const resultPath=OUTPUT+'/review.json';fs.writeFileSync(path.join(ROOT,resultPath),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({binding:bind(resultPath),oldAssets:result.oldPublishedAssetsUnchanged,oldSingle:result.oldSingleFieldOutputsUnchanged,pressure}));
