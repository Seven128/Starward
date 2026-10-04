import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const record=async name=>{const path=task+'/evidence/experience-current-native-'+name+'-2026-10-01.png',bytes=await fs.readFile(path);
  return{path,sha256:createHash('sha256').update(bytes).digest('hex'),png:PNG.sync.read(bytes)};};
const before=await record('environment-display-noon'),current=await record('environment-display-navigation-noon');
assert.equal(before.png.width,current.png.width);assert.equal(before.png.height,current.png.height);
const pixel=(image,x,y)=>[...image.png.data.subarray((y*image.png.width+x)*4,(y*image.png.width+x)*4+3)];
const luma=rgb=>rgb.map(value=>value/255).map(value=>value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4))
  .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
const background={before:pixel(before,80,28),current:pixel(current,80,28)};
let changedPixels=0,maximumChannelDelta=0,aboveOne=0;
// Both native images use the same North/45° and 04:00:00Z preview. Exclude the
// measured navigation area, round frame edges and system home indicator.
for(let y=96;y<895;y++)for(let x=3;x<424;x++){
  const index=(y*before.png.width+x)*4;let delta=0;
  for(let channel=0;channel<4;channel++)delta=Math.max(delta,Math.abs(before.png.data[index+channel]-current.png.data[index+channel]));
  changedPixels+=Number(delta>0);aboveOne+=Number(delta>1);maximumChannelDelta=Math.max(maximumChannelDelta,delta);
}
const result={scope:'Actual ordinary DevTools native Noon pair, same preview instant/view; interface background contrast and finite scene-region comparison only',
  inputs:[before,current].map(({path,sha256})=>({path,sha256})),background,
  whiteForegroundContrast:{before:1.05/(luma(background.before)+.05),current:1.05/(luma(background.current)+.05)},
  sceneRegion:{x:3,y:96,width:421,height:799,changedPixels,maximumChannelDelta,aboveOne},
  limits:['White foreground is the existing native chrome contract; this is background contrast, not a complete accessibility audit',
    'Does not certify WXML composition, physical input, same-condition Stellarium matching, phone GPU/memory or all scene pixels']};
const suffix=process.argv.includes('--final')?'-final':'';
await fs.writeFile(task+'/evidence/experience-environment-native-pixels'+suffix+'-2026-10-01.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
assert(result.whiteForegroundContrast.before<4.5);assert(result.whiteForegroundContrast.current>4.5);
// Native PNG conversion differs from the shader base by one encoded red step.
// Preserve the first diagnostic instead of overwriting its failed exact-RGB
// expectation; tolerate only that bounded conversion, not a different palette.
assert(background.current.every((value,index)=>Math.abs(value-[8,13,23][index])<=1));
assert.equal(changedPixels,0);
assert.equal(maximumChannelDelta,0);
