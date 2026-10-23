// Task-only, read-only Android memory observations. No raw dumpsys, process IDs,
// endpoint/serial, user text or screen bytes leave this process. Absolute host
// clock anchors stay in the existing private evidence owner, never stdout.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AdbDevice, findAdb, foregroundActivity } from '../../../../tools/miniapp/device-adb.mjs';
import { createMemoryWatchAnchor, MEMORY_EVIDENCE_ROOT } from './r17-memory-watch-anchor.mjs';
const [mode='once',label='observation',countText='7',intervalText='20000',transport='wireless',...extra]=process.argv.slice(2);
const count=Number(countText),interval=Number(intervalText);
if(extra.length||!['usb','wireless'].includes(transport)||!['once','watch'].includes(mode)||!/^[a-z][a-z0-9-]{0,47}$/.test(label)||!Number.isInteger(count)||count<1||count>13||
  !Number.isInteger(interval)||interval<2000||interval>20000)throw Error('memory_probe_arguments_invalid');
await fs.mkdir(MEMORY_EVIDENCE_ROOT,{recursive:true});
const sourceBindings={};
for(const [key,url] of [['watcherSha256',import.meta.url],['anchorSha256',new URL('./r17-memory-watch-anchor.mjs',import.meta.url)],
  ['adbSha256',new URL('../../../../tools/miniapp/device-adb.mjs',import.meta.url)]])
  sourceBindings[key]=createHash('sha256').update(await fs.readFile(new URL(url))).digest('hex');
const device=new AdbDevice(await findAdb());await device.select({transport});
const started=performance.now(),anchor=await createMemoryWatchAnchor({label,startedMonotonicMs:started,sourceBindings,io:fs,
  clock:{monotonicNow:()=>performance.now(),wallNow:()=>Date.now()}}),file=anchor.file;
let first=true, boundOwner=null, firstInstance=true, instanceRows=0;
const instanceFile=`${file}.process.private.ndjson`;
let sampleCount=0,outcome='observer_returned';
const completedRowsHash=createHash('sha256');
async function startTicks(pid){
  try{
    const stat=(await device.command(['shell','cat',`/proc/${pid}/stat`],{maxBytes:16384})).toString();
    const close=stat.lastIndexOf(')'),value=stat.slice(close+2).trim().split(/\s+/)[19];
    return close>=0&&stat.match(/^(\d+)\s+\(/)?.[1]===pid&&/^\d+$/.test(value??'')?value:null;
  }catch{return null;}
}
async function instanceReceipt({state,owner,beforeStartTicks,afterStartTicks,sampleStartElapsedMs}){
  const record={schema:'starward-r17-memory-process-instance-v1',watchId:anchor.watchId,sampleIndex:sampleCount,
    state,target:{...owner,startTicks:beforeStartTicks},afterStartTicks,sampleStartElapsedMs,
    sampleEndElapsedMs:Math.round(performance.now()-started),clock:'host.performance.now'};
  await fs.writeFile(instanceFile,JSON.stringify(record)+'\n',{flag:firstInstance?'wx':'a',mode:0o600});
  firstInstance=false;instanceRows++;
}
async function sample(){
  const sampleStartElapsedMs=Math.round(performance.now()-started);
  const finish=result=>({...result,sampleStartElapsedMs,sampleEndElapsedMs:Math.round(performance.now()-started),
    clock:'host.performance.now',elapsedMs:Math.round(performance.now()-started)});
  let activity;
  try{activity=await device.foreground();}catch{return finish({state:'miniapp_not_foreground',processes:[]});}
  // Activity metadata stays in memory. Bind the resumed Mini Program's exact
  // ProcessRecord to a selected slot without emitting its PID/name/activity.
  const activities=(await device.command(['shell','dumpsys','activity','activities'],{maxBytes:1048576})).toString();
  if(foregroundActivity(activities)!==activity)throw Error('memory_probe_foreground_changed');
  const owners=activities.split(/(?=^\s*(?:\*\s*)?Hist\s+#\d+:\s*ActivityRecord\{)/m).flatMap(section=>{
    const header=section.match(/^\s*(?:\*\s*)?Hist\s+#\d+:\s*ActivityRecord\{[^\r\n]*?\s(com\.tencent\.mm\/[^\s}]+)/m)?.[1];
    if(!header)return [];
    const [pkg,component]=header.split('/'),canonical=pkg+'/'+(component.startsWith('.')?pkg+component:component);
    if(canonical!==activity||!/\b(?:mState|state)=RESUMED\b/.test(section))return [];
    const process=section.match(/\bapp=ProcessRecord\{[^}\r\n]*?\s(\d+):(com\.tencent\.mm:appbrand\d*)\//);
    return process?[{pid:process[1],name:process[2]}]:[];
  });
  const owner=owners.length===1?owners[0]:null;
  if(!owner)return finish({state:'foreground_owner_unavailable',foregroundOwnerVerified:false,processes:[]});
  if(boundOwner&&(boundOwner.pid!==owner.pid||boundOwner.name!==owner.name||boundOwner.activity!==activity))
    return finish({state:'foreground_owner_changed',foregroundOwnerVerified:false,processInstanceVerified:false,processes:[]});
  const currentOwner={...owner,activity},beforeStartTicks=await startTicks(owner.pid);
  if(beforeStartTicks===null){
    await instanceReceipt({state:'unknown',owner:currentOwner,beforeStartTicks:null,afterStartTicks:null,sampleStartElapsedMs});
    return finish({state:'foreground_instance_unavailable',foregroundOwnerVerified:false,processInstanceVerified:false,processes:[]});
  }
  if(boundOwner&&boundOwner.startTicks!==beforeStartTicks){
    await instanceReceipt({state:'changed',owner:currentOwner,beforeStartTicks,afterStartTicks:null,sampleStartElapsedMs});
    return finish({state:'foreground_instance_changed',foregroundOwnerVerified:false,processInstanceVerified:false,processes:[]});
  }
  boundOwner??={...currentOwner,startTicks:beforeStartTicks};
  // Observe only the already identified foreground owner; preloaded Appbrand
  // slots add query overhead and do not answer this run's memory question.
  const selected=[owner];
  const processes=[];
  for(let index=0;index<selected.length;index++){
    const current=selected[index],text=(await device.command(['shell','dumpsys','meminfo',current.pid],{maxBytes:262144})).toString();
    // Exact selected process name must occur in the provider's MEMINFO header.
    const header=text.match(/\*\* MEMINFO in pid \d+ \[([^\]]+)\] \*\*/)?.[1];
    if(header!==current.name)throw Error('memory_probe_process_changed');
    const field=key=>{const value=text.match(new RegExp(key+':\\s*(\\d+)'))?.[1];return value===undefined?null:Number(value);};
    const row=key=>{const value=text.match(new RegExp('^\\s*'+key+'\\s+(\\d+)','m'))?.[1];return value===undefined?null:Number(value);};
    const record={slot:index,foregroundActivityOwner:owner!==null&&owner.pid===current.pid&&owner.name===current.name,
      totalPssKiB:field('TOTAL PSS'),totalRssKiB:field('TOTAL RSS'),totalSwapPssKiB:field('TOTAL SWAP PSS'),
      nativeHeapPssKiB:row('Native Heap'),dalvikHeapPssKiB:row('Dalvik Heap'),glMtrackPssKiB:row('GL mtrack'),eglMtrackPssKiB:row('EGL mtrack'),
      unknownPssKiB:row('Unknown'),otherMmapPssKiB:row('Other mmap'),soMmapPssKiB:row('\\.so mmap'),
      javaHeapSummaryKiB:field('Java Heap'),nativeHeapSummaryKiB:field('Native Heap'),codeSummaryKiB:field('Code'),
      stackSummaryKiB:field('Stack'),graphicsSummaryKiB:field('Graphics'),privateOtherSummaryKiB:field('Private Other'),systemSummaryKiB:field('System')};
    if(record.totalPssKiB===null||record.totalRssKiB===null)throw Error('memory_probe_totals_unavailable');
    processes.push(record);
  }
  const afterStartTicks=await startTicks(owner.pid);
  if(afterStartTicks===null||afterStartTicks!==beforeStartTicks){
    await instanceReceipt({state:afterStartTicks===null?'unknown':'changed',owner:currentOwner,beforeStartTicks,afterStartTicks,sampleStartElapsedMs});
    return finish({state:afterStartTicks===null?'foreground_instance_unavailable':'foreground_instance_changed',
      foregroundOwnerVerified:false,processInstanceVerified:false,processes:[]});
  }
  try{if(await device.foreground()!==activity)throw Error('foreground_changed');}
  catch{return finish({state:'miniapp_retired_during_sample',processes:[]});}
  await instanceReceipt({state:'verified',owner:currentOwner,beforeStartTicks,afterStartTicks,sampleStartElapsedMs});
  return finish({state:'miniapp_foreground',foregroundOwnerVerified:true,processInstanceVerified:true,processes});
}
try{
  for(let index=0;index<(mode==='watch'?count:1);index++){
    const result=await sample();
    const line=JSON.stringify(result)+'\n';
    await fs.writeFile(file,line,{flag:first?'wx':'a'});first=false;
    completedRowsHash.update(line);sampleCount++;
    console.log(JSON.stringify(result));
    if(result.state!=='miniapp_foreground'||mode==='once')break;
    if(index<count-1)await new Promise(resolve=>setTimeout(resolve,interval));
  }
  console.log(JSON.stringify({evidence:file,scope:'WECHAT_APPBRAND_PROCESS_MEMORY_ONLY',inputSent:false,
    processInstanceEvidence:instanceRows?instanceFile:null,processInstanceRows:instanceRows,
    timing:'sampleStartElapsedMs/sampleEndElapsedMs bracket sequential host/ADB observations, not one device instant; elapsedMs remains the end alias. Only the first bound foreground process instance is sampled; PID/name/activity/startTicks replacement or unavailable startTicks ends the run. Raw bindings stay private.',
    limits:'foregroundActivityOwner=true binds the resumed Activity ProcessRecord to the sampled slot. Unknown/Private Other do not identify V8 or a particular allocator; no JS-heap or GPU-allocation claim.'}));
}catch{outcome='observer_failed';console.log(JSON.stringify({state:'memory_probe_unavailable',inputSent:false}));process.exitCode=1;}
finally{
  try{await anchor.finish({outcome,sampleCount,completedRowsSha256:completedRowsHash.digest('hex')});}
  catch{console.log(JSON.stringify({state:'memory_probe_anchor_unavailable',inputSent:false}));process.exitCode=1;}
}
