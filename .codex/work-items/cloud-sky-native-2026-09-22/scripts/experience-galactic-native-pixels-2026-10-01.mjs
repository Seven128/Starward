import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs');
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const files=['experience-current-native-sky-reentered-2026-10-01.png','experience-current-native-galactic-production-ready-2026-10-01.png'];
const records=[];
for(const file of files){const bytes=await fs.readFile(task+'/evidence/'+file);records.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),png:PNG.sync.read(bytes)});}
const [before,after]=records.map(row=>row.png);assert.equal(before.width,after.width);assert.equal(before.height,after.height);
// Original full captures retain system UI. The observed top clock/menu and
// bottom home bar differ independently of the sky; compare the stated central
// region, not an edited image or a claim of complete UI/Canvas composition.
const region={x:0,y:110,width:before.width,height:before.height-110-24};
let changedChannels=0,maxDelta=0,comparedChannels=0;
for(let y=region.y;y<region.y+region.height;y++)for(let x=0;x<region.width;x++)for(let c=0;c<4;c++){const index=(y*before.width+x)*4+c,delta=Math.abs(before.data[index]-after.data[index]);comparedChannels++;if(delta){changedChannels++;maxDelta=Math.max(maxDelta,delta);}}
const output={scope:'Original ordinary WeChat captures of North manual 45 degrees, same current Context/frame 13:50:33, 4051 objects/2 targets; stated central region only. System bars excluded by coordinate iteration; no image edit. Neither WXML composition nor physical phone acceptance.',images:records.map(({png,...record})=>record),width:before.width,height:before.height,region,comparedChannels,changedChannels,maxDelta};
await fs.writeFile(task+'/evidence/experience-galactic-native-pixel-comparison-2026-10-01.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({width:before.width,height:before.height,region,comparedChannels,changedChannels,maxDelta}));
