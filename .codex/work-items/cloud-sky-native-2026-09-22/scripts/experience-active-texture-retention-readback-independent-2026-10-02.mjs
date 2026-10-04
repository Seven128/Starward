/** Independent source-delta/event arithmetic readback, not a new runtime replay. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=p=>path.join(root,p),sha=b=>createHash('sha256').update(b).digest('hex');
const bind=p=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const input='output/active-texture-retention-candidate-1002-r2/result.json',dir=path.posix.dirname(input),closed='output/full-hook-resource-independent-1002-r2/result.json';
assert.equal(bind(input).sha256,'997f12c81b5826fbf417f60bee2b9117ad3c64100f01a443c0641e1d7cebe3ba');
const r=JSON.parse(fs.readFileSync(file(input),'utf8')),actual=JSON.parse(fs.readFileSync(file(closed),'utf8'));
const names=[input,closed,dir+'/original-owner.ts.txt',dir+'/candidate-owner.ts.txt',dir+'/executed-script.mts.txt'],before=names.map(bind);
const original=fs.readFileSync(file(dir+'/original-owner.ts.txt'),'utf8'),candidate=fs.readFileSync(file(dir+'/candidate-owner.ts.txt'),'utf8');
assert.equal(sha(original),r.original.sha256);const guard='!previousFrame.has(key) && !pinned.has(key)';assert.equal(original.split(guard).length-1,2);
const first=original.indexOf('      // Partial residents cost a whole source upload to recreate.',original.indexOf('    finish() {')),
 last=original.indexOf('      previousFrame.clear();',first);assert(first>0&&last>first);
const exact=(original.slice(0,first)+'      // Task candidate: retain every current-frame texture; retire inactive identities.\n      for (const key of entries.keys()) if (!used.has(key)) remove(key);\n'+original.slice(last)).replaceAll(guard,'!used.has(key) && !pinned.has(key)');
assert.equal(candidate,exact);
const summarize=variant=>{let prior=0;const rows=[];for(const row of variant.rows){let live=prior,peak=live,sourceBytes=0,copyBytes=0;
 for(const e of row.events){if(e.operation==='delete')live-=e.bytes;else{live+=e.bytes;if(e.operation==='source-upload')sourceBytes+=e.bytes;else{assert.equal(e.operation,'gpu-copy');copyBytes+=e.bytes;}}
  assert.equal(e.liveBytes,live);peak=Math.max(peak,live);assert(live>=0);}
 assert.equal(live,row.liveBytes);assert.equal(peak,row.peakBytes);assert.equal(sourceBytes,row.sourceUploadBytes);assert.equal(copyBytes,row.copyBytes);
 assert.equal(row.retained.reduce((n,e)=>n+e.bytes,0),live);rows.push({condition:row.condition,pass:row.pass,liveBytes:live,peakBytes:peak,sourceUploadBytes:sourceBytes,copyBytes});prior=live;
 }assert.equal(variant.emptyFrame.liveBytes,0);assert.deepEqual(variant.retirement,{logicalTextureBytes:0,noStaleUpload:true});
 return {rows,peak:Math.max(...rows.map(x=>x.peakBytes)),maximumFrameEnd:Math.max(...rows.map(x=>x.liveBytes)),sourceUploadBytes:rows.reduce((n,r)=>n+r.sourceUploadBytes,0),copyBytes:rows.reduce((n,r)=>n+r.copyBytes,0)};};
const baseline=summarize(r.baseline),active=summarize(r.active),copyBaseline=summarize(r.copyFailure.baseline),copyActive=summarize(r.copyFailure.active);
for(let i=0;i<actual.replay.length;i++){assert.deepEqual(r.baseline.rows[i].events,actual.replay[i].events);assert.deepEqual(r.active.rows[i].returned,r.baseline.rows[i].returned);
 assert.deepEqual(r.copyFailure.active.rows[i].returned,r.copyFailure.baseline.rows[i].returned);}
assert.equal(active.rows.filter(r=>r.condition==='w3-off-2-139'&&r.pass>0).reduce((n,r)=>n+r.sourceUploadBytes,0),0);
const result={status:'SOURCE_AND_EVENT_READBACK_PASS_NOT_RUNTIME_REPLAY',input:bind(input),originalSource:bind(dir+'/original-owner.ts.txt'),candidateSource:bind(dir+'/candidate-owner.ts.txt'),
 mechanicalDeltaVerified:true,baseline,active,copyBaseline,copyActive,
 limits:['No new GL execution or pixel evidence. Actual baseline event binding derives from the prior independently closed scene/owner replay.',
  'Recorded 15 fixed-scene calls do not exercise moving active sets, simultaneous parent/fine sampler pins, two windows for one identity, exceptions/context loss, DPR or native driver lifecycle.',
  'Retaining all frame-used textures changes the old 16MiB frame-end policy; byte target remains an allocation-pressure hint, not active memory cap.']};
fs.writeFileSync(file(out+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});const after=before.map(b=>bind(b.path));assert.deepEqual(after,before);
fs.writeFileSync(file(out+'/binding.json'),JSON.stringify({inputsBefore:before,inputsAfter:after,unchanged:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),baseline:{peak:baseline.peak,end:baseline.maximumFrameEnd,totalSource:baseline.sourceUploadBytes},active:{peak:active.peak,end:active.maximumFrameEnd,totalSource:active.sourceUploadBytes}}));
