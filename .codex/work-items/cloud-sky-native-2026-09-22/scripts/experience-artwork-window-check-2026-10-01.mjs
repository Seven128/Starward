import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=JSON.parse(await fs.readFile('output/playwright/cloud-sky-body-resource-composition-1001/result.json','utf8'));
const after=JSON.parse(await fs.readFile('output/playwright/cloud-sky-body-resource-composition-1001-after/result.json','utf8'));
const warm=row=>row.passes[2].uploads.filter(row=>row.operation==='source-upload').reduce((sum,row)=>sum+row.bytes,0);
const pre=before.rows.find(row=>row.name==='moon-45'),post=after.rows.find(row=>row.name==='moon-45');
if(process.argv.includes('--before'))assert.equal(warm(pre),0,'Whole-scene Moon45 warm frames must not repeatedly upload required constellation images');
assert.equal(warm(pre),3407872);assert.equal(warm(post),0);
assert.equal(post.passes[2].peakBytes,14942208);assert.equal(pre.passes[2].peakBytes,19726336);
for(const row of after.rows){assert.deepEqual(row.sourceBytes,before.rows.find(old=>old.name===row.name).sourceBytes);
  assert(row.pixelComparison.maxDelta<=1);assert(row.passes.every(pass=>pass.liveBytes<=16*1024*1024));assert.equal(row.retiredLogicalBytes,0);}
const sampling=JSON.parse(await fs.readFile('output/playwright/cloud-sky-artwork-window-sampling-1001-r2/result.json','utf8'));
for(const row of sampling.rows){assert.equal(row.glError,0);assert.equal(row.retiredBytes,0);
  if(row.pixelComparison)assert(row.pixelComparison.maxDelta<=1);
  if(row.mode==='copy-failure'){assert.equal(row.passes.at(-1).copies,1);assert.equal(row.pixelComparison.changedPixels,0);}}
assert.equal(sampling.rows.filter(row=>row.mode==='copy-failure').length,3);
console.log(JSON.stringify({beforeWarmBytes:warm(pre),afterWarmBytes:warm(post),beforeWarmPeak:pre.passes[2].peakBytes,
  afterWarmPeak:post.passes[2].peakBytes,wholeSceneSourcesUnchanged:true,strictPixelDifferencesRetained:true,
  wide123WarmUnresolved:warm(after.rows.find(row=>row.name.startsWith('moon-123'))),optionalCopyFallbacks:3}));
