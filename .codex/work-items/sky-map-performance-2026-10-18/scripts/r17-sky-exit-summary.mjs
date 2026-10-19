// Read only WeChat's provider exit history; discard all raw text immediately.
// Output fixed classifications/numbers, never process IDs or descriptions.
import fs from 'node:fs/promises';
import {AdbDevice, findAdb} from '../../../../tools/miniapp/device-adb.mjs';
const device=new AdbDevice(await findAdb());await device.select({transport:'wireless'});
const raw=(await device.command(['shell','dumpsys','activity','exit-info','com.tencent.mm'],{maxBytes:1048576})).toString();
const blocks=raw.split(/ApplicationExitInfo\s+#\d+:/).slice(1);
const selected=blocks.filter(block=>/(?:^|\s)process=com\.tencent\.mm:appbrand\d*(?=\s|$)/m.test(block)).slice(0,3);
function memory(block,key){const match=block.match(new RegExp('\\b'+key+'=([\\d.]+)(KB|MB|GB)?\\b'));if(!match)return null;return Math.round(Number(match[1])*({KB:1,MB:1024,GB:1048576}[match[2]]??1));}
const observations=selected.map(block=>{
  const number=key=>{const value=block.match(new RegExp('\\b'+key+'=(\\d+)'))?.[1];return value===undefined?null:Number(value);};
  const stamp=block.match(/\btimestamp=(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)/)?.[1],instant=stamp?Date.parse(stamp):NaN;
  return {ageSeconds:Number.isFinite(instant)?Math.round((Date.now()-instant)/1000):null,reason:number('reason'),status:number('status'),
    pssKiB:memory(block,'pss'),rssKiB:memory(block,'rss'),nativeCrash:number('reason')===5,
    signaledAbort:number('reason')===2&&number('status')===6,lowMemoryReason:number('reason')===3,
    descriptionClasses:{outOfMemory:/\b(?:out of memory|oom)\b/i.test(block),heapCorruption:/\b(?:heap corruption|corrupted|double free)\b/i.test(block),graphics:/\b(?:skia|opengl|vulkan|egl)\b/i.test(block)}};
});
const result={scope:'WECHAT_APPBRAND_EXIT_CLASSIFICATIONS_ONLY',available:observations.length>0,observations,rawRetained:false,inputSent:false};
const label=process.argv[2]??'copy-play-exit-summary-validated';
if(!/^[a-z][a-z0-9-]{1,79}$/.test(label))throw Error('exit_summary_label_invalid');
const file='E:/Dev/Starward-data/verification/sky-map-20261018/native-play-copy-trial/'+label+'.json';
await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,evidence:file}));
