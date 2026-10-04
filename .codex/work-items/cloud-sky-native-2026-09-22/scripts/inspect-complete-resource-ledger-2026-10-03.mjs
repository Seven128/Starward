import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='output/playwright/cloud-sky-complete-resource-1003-r2';
const out='output/playwright/cloud-sky-complete-resource-ledger-1003-r1';
await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const bind=async p=>{const b=await fs.readFile(p);return {path:p,bytes:b.length,sha256:sha(b)};};
const original=await fs.readFile(base+'/result.json'),r=JSON.parse(original);
const bindings=[{path:base+'/result.json',bytes:original.length,sha256:sha(original)}];
const passes=r.rows.flatMap(row=>row.passes.map(p=>({...p,stateName:row.condition.name})));
for(const p of passes)for(const [extension,expected]of [['png',p.pngSha256],['rgba',p.rgbaSha256]]){
 const b=await bind(base+'/'+p.stateName+'-'+p.label+'.'+extension);assert.equal(b.sha256,expected);if(extension==='rgba')assert.equal(b.bytes,390*844*4);bindings.push(b);
}
for(const p of ['source-binding-before.json','source-binding-after.json','toolchain-before.json','toolchain-after.json','actual-final-owner.json','retirement-observations.json','failed.json'])bindings.push(await bind(base+'/'+p));
const max=values=>Math.max(0,...values);
const states=r.rows.flatMap(row=>[...row.states,...row.passes.map(p=>p.state),row.ready]);
const uniqueSources=new Map(r.final.requests.filter(q=>q.type==='image'&&q.completed&&!q.aborted&&!q.failed).map(q=>[q.sha256,{sha256:q.sha256,bytes:q.bytes,route:q.route}]));
const uniqueSao=new Map(r.final.requests.filter(q=>q.resourceFamily==='sao-tile'&&q.completed&&!q.aborted&&!q.failed).map(q=>[q.route,{bytes:q.bytes,route:q.route}]));
const sum=(rows,field)=>rows.reduce((n,row)=>n+(row[field]??0),0);
const summary={
 status:r.status,retirementFailures:r.retirementFailures,submits:passes.length,normalSubmits:passes.filter(p=>p.label.startsWith('normal-')).length,returnSubmits:passes.filter(p=>p.label.startsWith('actual-browsing-return-')).length,
 sourceGraph:r.sourceBindings.length,nodePreparationGraph:r.nodePreparationBindings.length,dynamicSaoTiles:r.dynamicSaoBindings.length,
 sameOwners:r.rows.map(row=>({name:row.condition.name,identity:row.identity,submits:row.passes.length,readyImageOwners:row.ready.hooks.length,saoPoints:row.ready.sao.points})),
 layers:{
  imageTransport:{successfulUniqueHashes:uniqueSources.size,uniqueEncodedBytes:sum([...uniqueSources.values()],'bytes'),attempts:r.final.requests.filter(q=>q.type==='image').length,failed:r.final.requests.filter(q=>q.type==='image'&&q.failed).length,aborted:r.final.requests.filter(q=>q.type==='image'&&q.aborted).length},
  publicFileCache:{observedPeakEncodedBytes:max(states.flatMap(s=>s.cache.map(c=>c.bytes))),observedPeakReservedBytes:max(states.flatMap(s=>s.cache.map(c=>c.reserved))),observedPeakLeases:max(states.flatMap(s=>s.cache.map(c=>c.leased))),afterHide:r.final.afterHide.cache,afterClear:r.final.afterClear.cache},
  nativeImages:{observedPeakCurrentUniqueRgbaModel:max(states.map(s=>s.decodedSourceRgbaModel)),observedPeakUniqueImages:max(states.map(s=>s.decodedUniqueImages)),diagnosticStrongImages:r.rows.at(-1).diagnosticStrongImages,diagnosticOfferedBytes:r.rows.at(-1).diagnosticOfferedBytes,afterHideApiCurrent:r.final.afterHide.nativeCurrent.filter(i=>i.current),physicalBytes:null,scope:'logical current loader/selected image identities; diagnostic image array also holds unmanaged/cancelled objects; API current defaults true for unmanaged legacy compatibility'},
  sao:{successfulUniqueTransportTiles:uniqueSao.size,uniqueEnvelopeEncodedBytes:sum([...uniqueSao.values()],'bytes'),dynamicOriginalEncodedBytes:sum(r.dynamicSaoBindings.map(x=>x.source),'bytes'),observedPeakLoadedTiles:max(states.map(s=>s.sao.loader?.loaded.length??0)),observedPeakTuples:max(states.map(s=>sum(s.sao.loader?.loaded??[],'tuples'))),observedPeakOriginalTileEncodedBytes:max(states.map(s=>sum(s.sao.loader?.loaded??[],'encodedSourceBytes'))),observedPeakPublicationJsonEncodedBytes:max(states.map(s=>sum(s.sao.loader?.loaded??[],'decodedPublicationJsonBytes'))),observedPeakResolvedPoints:max(states.map(s=>s.sao.points)),observedPeakResolvedJsonEncodedBytes:max(states.map(s=>s.sao.resolvedFrameJsonBytes)),observedPeakPendingSlots:max(states.map(s=>s.sao.loader?.pending.length??0)),abortedPendingObserved:states.some(s=>s.sao.loader?.pending.some(p=>p.aborted)),viewEncodedByteBudget:6291456,requestSlots:3,afterClear:r.final.afterClear.sao,jsObjectBytes:null,scope:'source tile bytes, publication/resolved JSON sizes and numeric payload models are separate layers, not a sum or memory ceiling'},
  gpu:{textureAllocationModelPeak:r.final.fullGlLedger.snapshot.totalPeak.texture,bufferCapacityPeak:r.final.fullGlLedger.snapshot.totalPeak.buffer,renderbufferStorageModelPeak:r.final.fullGlLedger.snapshot.totalPeak.renderbuffer,ordinaryDrawingBuffer:r.final.afterClear.gpu.ordinaryDrawingBuffer,attachmentReferences:r.final.afterClear.gpu.attachments,logicalLiveHandlesAfterClear:r.final.afterClear.gpu.handles.filter(h=>h.alive).length,driverBytes:null,scope:'actual successful GL allocation/upload capacities; logical delete requests, not physical reclamation; FBO attachments reference existing storage'},
  bridgeMetadataRetention:r.final.bridgeMetadataRetention,processRssBytes:null,jsObjectTotalBytes:null,nativeGcBytes:null
 },returnComparisons:r.returnComparisons,scope:'readback of the original measured-with-failures r2; verifies saved full pixels and aggregates finite observed samples. Does not repair or reclassify old failure, assert total client RAM, native FPS, 12Mbps, 200DAU, final quality or acceptance'};
await fs.writeFile(out+'/summary.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
await fs.writeFile(out+'/bindings.json',JSON.stringify(bindings,null,2)+'\n',{flag:'wx'});
assert.equal((await bind(base+'/result.json')).sha256,sha(original));
console.log(JSON.stringify({output:out,summary:await bind(out+'/summary.json'),pixelsChecked:passes.length*2,submits:passes.length,peaks:{decoded:summary.layers.nativeImages.observedPeakCurrentUniqueRgbaModel,texture:summary.layers.gpu.textureAllocationModelPeak,buffer:summary.layers.gpu.bufferCapacityPeak,saoTuples:summary.layers.sao.observedPeakTuples},status:r.status}));
