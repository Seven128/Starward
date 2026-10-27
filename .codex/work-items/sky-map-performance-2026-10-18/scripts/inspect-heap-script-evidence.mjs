// Offline extraction of task-requested runtime scripts and bounded diagnostic
// shapes from one preserved heap. Never evaluates snapshot text or code.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadSnapshot } from './diagnose-target-heap.mjs';
const [input, expectedSha256, directory] = process.argv.slice(2);
if (!input || !/^[a-f0-9]{64}$/.test(expectedSha256 ?? '') || !directory) throw Error('arguments_invalid');
const s = await loadSnapshot(input);
if (s.sha256 !== expectedSha256) throw Error('snapshot_identity_mismatch');
await fs.mkdir(directory, { recursive: false });
const type = n => s.types[s.nodes[n*s.stride+s.typeOffset]];
const name = n => s.strings[s.nodes[n*s.stride+s.nameOffset]];
const id = n => s.nodes[n*s.stride+s.idOffset];
const target = e => s.edges[e*s.edgeStride+s.edgeTargetOffset]/s.stride;
const edgeType = e => s.edgeTypes[s.edges[e*s.edgeStride+s.edgeTypeOffset]];
const edgeName = e => s.strings[s.edges[e*s.edgeStride+s.edgeNameOffset]];
function own(n, key) {
  for(let e=s.starts[n];e<s.starts[n+1];e++) if(['property','internal'].includes(edgeType(e)) && edgeName(e)===key) return target(e);
  return -1;
}
const scalar = (n, depth=0) => {
  if(n<0 || depth>12)return null;
  if(type(n)==='string')return name(n);
  if(type(n)==='concatenated string'){
    const left=scalar(own(n,'first'),depth+1),right=scalar(own(n,'second'),depth+1);
    return left!==null && right!==null && left.length+right.length<=4096?left+right:null;
  }
  return null;
};
const number = n => n>=0 && type(n)==='number' && /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(name(n)) ? Number(name(n)) : null;
const allowed = new Set(['common.js','common.app.js','appservice.app.js','app.js','vendors.js','chunk_0.appservice.js','sub-vendors.js']);
const scripts=[], errors=[], scriptShapes={}, diagnostics=[], cacheEntries=[];
const codePattern=/\b(?:raster|terrain|sao|sky|miniapp)_[a-z0-9_]+\b|downloadFile:[^\r\n]{0,100}/;
for(let n=0;n<s.nodeCount;n++){
  const nt=type(n), nn=name(n);
  if(nt!=='string' && (nn==='system / Script' || nn==='Script')){
    const keys=[];
    for(let e=s.starts[n];e<s.starts[n+1];e++){
      const k=edgeName(e);
      if(typeof k==='string' && /^[a-zA-Z_ /]{1,45}$/.test(k)) keys.push(k);
    }
    const shape=nt+':'+keys.sort().join(','); scriptShapes[shape]=(scriptShapes[shape]??0)+1;
    const source=scalar(own(n,'source')), url=scalar(own(n,'name'));
    const base=url?.split(/[?#]/)[0].split('/').at(-1);
    if(source && base && allowed.has(base)){
      const filename=`script-${scripts.length}-${base}`;
      await fs.writeFile(path.join(directory,filename),source,{flag:'wx'});
      scripts.push({file:filename,label:base,nodeId:id(n),characters:source.length,
        sha256:createHash('sha256').update(source).digest('hex')});
    }
  }
  if(nt!=='object')continue;
  const message=scalar(own(n,'message'))??scalar(own(n,'errMsg'));
  if(message && message.length<3000 && codePattern.test(message) && (nn.endsWith('Error') || own(n,'stack')>=0))
    errors.push({nodeId:id(n),code:message.match(codePattern)?.[0]??null,
      messageSha256:createHash('sha256').update(message).digest('hex')});
  const code=scalar(own(n,'code')), stage=scalar(own(n,'stage'));
  if(code && /^(?:raster|terrain|sao|sky|miniapp|api|request|query|map|network)_[a-z0-9_]+$/.test(code)){
    const resource=scalar(own(n,'resource'));
    const fields=Object.fromEntries(['http','errno','errCode','entries','readyBytes','activeDownloads','queued',
      'nativePins','failedRemovals','activeReaders','physicalFiles'].map(key=>[key,number(own(n,key))]).filter(([,value])=>value!==null));
    diagnostics.push({nodeId:id(n),code,stage:stage && /^[a-z_]{1,60}$/.test(stage)?stage:null,
      resource:resource && /^[A-Za-z0-9_:.-]{1,160}$/.test(resource)?resource:null,...fields});
  }
  const format=scalar(own(n,'format'));
  if(['json','png','jpeg'].includes(format) && own(n,'listeners')>=0){
    const hash=scalar(own(n,'sha256')),environment=scalar(own(n,'environment')),file=scalar(own(n,'file'));
    if(/^[a-f0-9]{64}$/.test(hash??'') && /^[a-f0-9]{64}$/.test(environment??'') && file)
      cacheEntries.push({nodeId:id(n),format,sha256:hash,environment,file,
        bytes:number(own(n,'bytes')),last:number(own(n,'last')),refs:number(own(n,'refs'))});
  }
}
const diagnosticCounts={};
for(const {code,stage,resource} of diagnostics){const key=JSON.stringify([code,stage,resource]);diagnosticCounts[key]=(diagnosticCounts[key]??0)+1;}
const stringMetadata={count:s.strings.length,maxCharacters:s.strings.reduce((max,value)=>Math.max(max,value.length),0)};
const result={scope:'OFFLINE_PRIVATE_SCRIPT_AND_DIAGNOSTIC_SHAPES_NOT_RUNTIME_EXECUTION',snapshotSha256:s.sha256,
  summary:s.summary,scriptShapes,scripts,errors,diagnostics,diagnosticCounts,cacheEntries,stringMetadata,
  limitations:['Only flat string sources are exported; missing or sliced sources stay unavailable.',
    'Shape matches are not proof of a current Console event or a leak; inspect graph owners separately.',
    'Object IDs are private comparison anchors, not proof of same isolate by themselves.']};
await fs.writeFile(path.join(directory,'manifest.private.json'),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({scriptShapes,scripts:scripts.map(({nodeId,...v})=>v),
  errorCount:errors.length,diagnosticCounts,cacheEntryCount:cacheEntries.length,stringMetadata,
  totalSelfBytes:s.summary.totalSelfSizeBytes}));
