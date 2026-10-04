/** Read existing exact events only; no render/replay/tool/browser invocation. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const folder='output/playwright/cloud-sky-pre-aid-local-1003-r1/';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const bind=p=>({path:p,bytes:read(p).length,sha256:hash(read(p))});
const current=json(folder+'observations.json'),baseline=json(folder+'baseline-observations.json');
function account(input,row){
 const objects=new Map(),attachments=new Map();
 const peak={textures:0,textureBytes:0,framebuffers:0,buffers:0,bufferBytes:0,programs:0,shaders:0,attachmentReferences:0,uniqueAttachmentReferencedBytes:0};
 const created={texture:0,framebuffer:0,buffer:0,program:0,shader:0};
 const events=input.events.slice(row.eventsFrom,row.eventsTo);
 const measure=()=>{const kinds=n=>[...objects.values()].filter(o=>o.kind===n);
  const references=[...new Set(attachments.values())];
  const state={textures:kinds('texture').length,textureBytes:kinds('texture').reduce((n,o)=>n+o.bytes,0),
   framebuffers:kinds('framebuffer').length,buffers:kinds('buffer').length,bufferBytes:kinds('buffer').reduce((n,o)=>n+o.bytes,0),
   programs:kinds('program').length,shaders:kinds('shader').length,attachmentReferences:attachments.size,
   uniqueAttachmentReferencedBytes:references.reduce((n,id)=>n+(objects.get(id)?.bytes??0),0)};
  for(const key of Object.keys(peak))peak[key]=Math.max(peak[key],state[key]);
 };
 for(const e of events){
  if(e.event==='create'){objects.set(e.id,{kind:e.kind,bytes:0});created[e.kind]++;}
  if(e.event==='delete'){objects.delete(e.id);if(e.kind==='framebuffer')attachments.delete(e.id);}
  if(e.event==='allocate'||e.event==='copy'||e.event==='buffer'){const object=objects.get(e.id);assert(object,'allocation owner');object.bytes=e.bytes;}
  if(e.event==='attach'){if(e.texture===null)attachments.delete(e.framebuffer);else attachments.set(e.framebuffer,e.texture);}
  measure();
 }
 const reads=events.filter(e=>e.event==='read'),draws=events.filter(e=>e.event==='draw');
 const local=events.filter(e=>e.phase===row.name+'.pre-aid');
 return{name:row.name,created,peak,reads:reads.map(e=>({width:e.width,height:e.height,framebuffer:e.framebuffer,phase:e.phase})),
  sceneReadbacks:reads.length,sceneDrawCalls:draws.length,localReads:local.filter(e=>e.event==='read').length,localDrawCalls:local.filter(e=>e.event==='draw').length,
  localReductionDrawCalls:local.filter(e=>e.event==='draw'&&e.primitive===4&&e.count===6&&e.framebuffer!==null).length,
  duplicateQueryGLDrawOrRead:row.local?.map(o=>input.events.slice(o.observedEnd,o.duplicateEnd).filter(e=>e.event==='draw'||e.event==='read').length)??[],
  drawBufferReadbackBytes:row.physical[0]*row.physical[1]*4,
  disposal:row.disposed};
}
const original=account(baseline,baseline.rows[0]),candidate=account(current,current.rows[0]);
const delta=(a,b)=>Object.fromEntries(Object.keys(a).map(key=>[key,b[key]-a[key]]));
assert.equal(candidate.peak.textureBytes,original.peak.textureBytes);assert.equal(candidate.peak.framebuffers,original.peak.framebuffers);assert.equal(candidate.peak.bufferBytes,original.peak.bufferBytes);
const rows=current.rows.map(row=>account(current,row)),queued=current.rows.find(row=>row.name==='queued-prior-opaque');
const result={status:'READ_ONLY_EXACT_EVENT_ACCOUNTING',inputs:[bind(folder+'observations.json'),bind(folder+'baseline-observations.json'),bind(folder+'baseline-comparison.json')],
 original,candidate,normalDelta:{created:delta(original.created,candidate.created),peak:delta(original.peak,candidate.peak),
  sceneDrawCalls:candidate.sceneDrawCalls-original.sceneDrawCalls,sceneReadbacks:candidate.sceneReadbacks-original.sceneReadbacks},
 rows,queuedCover:queued.local[0].cover,
 scope:['Same-view actual original/candidate normal Scene only; counts are observed logical create/delete requests and directly allocated texture/buffer bytes.',
 'Framebuffer attachments are references to those texture allocations, separately listed and never added to textureBytes.',
 'Shader/program logical counts do not certify physical driver release. Ordinary drawing-buffer storage, external readback bytes, JS/native/source image physical storage, RSS/GC/driver and native timings are not included or filled with zero.',
 'Extra GL state snapshots/readback observer costs are diagnostic work, not target performance. Same-revision duplicate performs zero observed draw/read operations.']};
fs.writeFileSync(folder+'resource-readback.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({original:{created:original.created,peak:original.peak,draws:original.sceneDrawCalls,reads:original.sceneReadbacks},candidate:{created:candidate.created,peak:candidate.peak,draws:candidate.sceneDrawCalls,reads:candidate.sceneReadbacks},normalDelta:result.normalDelta,queuedCover:result.queuedCover,output:bind(folder+'resource-readback.json')}));
