import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

const output='.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-stellar-glare-gpu-validation-2026-09-29.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const digest=data=>createHash('sha256').update(data).digest('hex');
const directories=['before','after'].map(stage=>`output/playwright/cloud-sky-stellar-glare-0929-${stage}`);
const [before,after]=await Promise.all(directories.map(async directory=>JSON.parse(await fs.readFile(path.join(directory,'result.json'),'utf8'))));
assert.equal(before.useful,false);assert.equal(after.useful,true);
assert.equal(before.contextSha256,after.contextSha256);assert.equal(before.at,after.at);
assert.equal(before.catalogHash,after.catalogHash);assert.deepEqual(before.glyphs,after.glyphs);
const owner='apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts';
assert.equal(digest(await fs.readFile(owner)),after.ownerSha256);
const changedSourceInputs=after.sourceInputs.filter(input=>before.sourceInputs.find(old=>old.file===input.file)?.sha256!==input.sha256);
assert.deepEqual(changedSourceInputs.map(input=>input.file),[owner]);
const artifacts=[];
async function image(directory,name){const file=path.join(directory,name+'.png');const bytes=await fs.readFile(file);const png=PNG.sync.read(bytes);
 artifacts.push({file,sha256:digest(bytes),width:png.width,height:png.height});return png;}
function compare(left,right,rect){assert.equal(left.width,right.width);assert.equal(left.height,right.height);
 const box=rect??{x:0,y:0,width:left.width,height:left.height};let changedPixels=0,maxDifference=0;
 const leftBytes=[],rightBytes=[];
 for(let y=box.y;y<box.y+box.height;y++)for(let x=box.x;x<box.x+box.width;x++){
  const offset=(y*left.width+x)*4;let changed=false;
  for(let channel=0;channel<4;channel++){const difference=Math.abs(left.data[offset+channel]-right.data[offset+channel]);
   maxDifference=Math.max(maxDifference,difference);changed||=difference!==0;leftBytes.push(left.data[offset+channel]);rightBytes.push(right.data[offset+channel]);}
  if(changed)changedPixels++;
 }
 return{rect:box,changedPixels,maxDifference,beforeRgbaSha256:digest(new Uint8Array(leftBytes)),afterRgbaSha256:digest(new Uint8Array(rightBytes))};
}
const glyphs=[];
for(const dpr of [1,3]){
 const [left,right]=await Promise.all(directories.map(directory=>image(directory,`glyphs-dpr${dpr}`)));
 assert.equal(left.width,256*dpr);assert.equal(left.height,176*dpr);
 for(const glyph of after.glyphs){const pixels=compare(left,right,{x:(glyph.x-24)*dpr,y:(glyph.y-24)*dpr,width:48*dpr,height:48*dpr});
  const bright=['HR:7557','HR:7001','HR:2061'].includes(glyph.reference);
  if(bright)assert(pixels.changedPixels>0);else assert.equal(pixels.changedPixels,0);
  glyphs.push({dpr,reference:glyph.reference,bright,...pixels});}
}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return(sorted[7]+sorted[8])/2;};
const scenes=[];
for(let index=0;index<before.scenes.length;index++){
 const left=before.scenes[index],right=after.scenes[index];assert.equal(left.name,right.name);assert.equal(left.fov,right.fov);
 assert.equal(left.objectsSha256,right.objectsSha256);assert.equal(left.paintedObjectCount,right.paintedObjectCount);
 assert.equal(left.error,0);assert.equal(right.error,0);
 const [leftPng,rightPng]=await Promise.all(directories.map(directory=>image(directory,left.name)));
 const pixels=compare(leftPng,rightPng);assert(pixels.changedPixels>0);
 scenes.push({name:left.name,fov:left.fov,paintedObjectCount:left.paintedObjectCount,pickSnapshotSha256:left.objectsSha256,...pixels,
  softwareGlFinishMs:{samples:16,before:{median:median(left.times),min:Math.min(...left.times),max:Math.max(...left.times)},
   after:{median:median(right.times),min:Math.min(...right.times),max:Math.max(...right.times)}}});
}
const returned=[];
for(const directory of directories){const [fine,again]=await Promise.all(['fine','fine-return'].map(name=>image(directory,name)));
 const pixels=compare(fine,again);assert.equal(pixels.changedPixels,0);returned.push({directory,...pixels});}
const record={scope:'Production shared point-source shader under software WebGL, not Mini Program UI/device/final acceptance.',
 contextSha256:after.contextSha256,at:after.at,catalogHash:after.catalogHash,owner,ownerSha256:after.ownerSha256,changedSourceInputs,
 inputs:await Promise.all(directories.map(async directory=>({file:path.join(directory,'result.json'),sha256:digest(await fs.readFile(path.join(directory,'result.json')))}))),
 artifacts:[...new Map(artifacts.map(item=>[item.file,item])).values()],glyphs,scenes,returned,
 checks:{failedBefore:{exec:'34500f',exitCode:1,reason:'All three bright adopted stars had no extended halo or axis-wing pixels.'},
  gpuAfter:{exec:'f646ce',exitCode:0},affectedBehavior:{exec:'d907dd',files:5,cases:59,passed:59},typecheck:{exec:'777dbf',exitCode:0},
  diagnostics:'The first input fixture used the compact publication incorrectly. First shader linking failed on uniform precision and was repaired. Broader label checks exposed a missing selection-state VM input; a co-located fixture initially hid the galaxy under existing collision rules, then was corrected. These diagnostic failures are not delivered native regressions.'},
 limits:['Real adopted BSC/SAO photometry in controlled glyph layout/zenith. Full-scene fixture includes the real base BSC layer and no supplemental SAO frame.',
 'Faint stars and a non-stellar disc are identical in all RGBA pixels within each 48 CSS-pixel crop at DPR1/3; whole-scene picking snapshots are identical.',
 'Host software gl.finish timings are neither native GPU performance nor a no-cost claim. Point range [1,1023] belongs to this software renderer.',
 'Native composed reticle/label/pulse, target stellar quality, time motion, unresolved-patch picking, final review and all retained Goal obligations remain open.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:digest(await fs.readFile(output)),glyphs:glyphs.map(({dpr,reference,changedPixels})=>({dpr,reference,changedPixels})),scenes:scenes.map(({name,changedPixels,softwareGlFinishMs})=>({name,changedPixels,softwareGlFinishMs})),returned:returned.map(({directory,changedPixels})=>({directory,changedPixels}))}));
