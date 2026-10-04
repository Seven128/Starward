/** Bounded offline comparison of immutable export generations. No HTTP/image processing. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=name=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:b.length,sha256:hash(b)};};
let output='output/selected-w3-export-generation-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/selected-w3-export-generation-1002-r${n}`;
const dir=path.join(ROOT,output);fs.mkdirSync(dir);
const generations=['output/selected-w3-server-publication-1002-r1','output/selected-w3-server-publication-1002-r2'];
const bundlePaths=generations.map(g=>g+'/export/publication');
const bindings=generations.flatMap(g=>[bind(g+'/result.json'),bind(g+'/export/publication/index.json'),bind(g+'/export/publication/delivery.caddy')]);
const ownerBefore=bind('tools/deployment/sky-static-bundle.mjs');
const indexes=bundlePaths.map(g=>JSON.parse(fs.readFileSync(path.join(ROOT,g,'index.json'),'utf8')));
assert.deepEqual(indexes[0],indexes[1]);assert.equal(indexes[1].records.length,901);
const byteReadbacks=indexes[1].records.map(record=>{
  const bytes=bundlePaths.map(g=>fs.readFileSync(path.join(ROOT,g,'files',record.route)));
  assert.ok(bytes[0].equals(bytes[1]));assert.equal(bytes[1].length,record.bytes);assert.equal(hash(bytes[1]),record.sha256);
  return {route:record.route,bytes:record.bytes,sha256:record.sha256};
});
const oldSnapshot='output/selected-w3-server-publication-1002-r1/12-sky-static-bundle.mjs.txt';
const oldSource=fs.readFileSync(path.join(ROOT,oldSnapshot),'utf8');
const oldModule=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
const currentModule=await import(pathToFileURL(path.join(ROOT,'tools/deployment/sky-static-bundle.mjs')).href);
const reviewedSnapshot='output/selected-w3-server-publication-1002-r2/12-sky-static-bundle.mjs.txt';
const reviewedModule=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(ROOT,reviewedSnapshot)).toString('base64'));
const priorRecords=indexes[1].records.filter(r=>!r.route.startsWith('/v2/sky/deep-sky/'));assert.equal(priorRecords.length,136);
const priorFragments=[oldModule.skyStaticDeliveryFragment(priorRecords),currentModule.skyStaticDeliveryFragment(priorRecords)];
assert.equal(priorFragments[0],priorFragments[1]);
const fragments=bundlePaths.map(g=>fs.readFileSync(path.join(ROOT,g,'delivery.caddy'),'utf8'));
assert.notEqual(fragments[0],fragments[1]);
assert.equal(fragments[1],currentModule.skyStaticDeliveryFragment(indexes[1].records));
const runtimeReview=JSON.parse(fs.readFileSync(path.join(ROOT,'output/selected-w3-static-header-independent-1002-r5/result.json'),'utf8'));
assert.equal(runtimeReview.status,'PASS');assert.equal(runtimeReview.sources.find(s=>s.path==='tools/deployment/sky-static-bundle.mjs').sha256,bind(reviewedSnapshot).sha256);
assert.equal(reviewedModule.skyStaticDeliveryFragment.toString(),currentModule.skyStaticDeliveryFragment.toString());
const validated=await currentModule.validateSkyStaticBundle(path.join(ROOT,bundlePaths[1]));
assert.deepEqual(validated.records,indexes[1].records);
const wrongFamily=`/v2/sky/deep-sky/${'a'.repeat(64)}/M-42/M-31-detail.jpg`;
assert.equal(reviewedModule.validSkyStaticRoute(wrongFamily),true);assert.equal(currentModule.validSkyStaticRoute(wrongFamily),false);
assert.throws(()=>currentModule.skyStaticDeliveryFragment([{...indexes[1].records.find(r=>r.route.startsWith('/v2/sky/deep-sky/')),route:wrongFamily}]),/record_invalid/);
assert.deepEqual(bind('tools/deployment/sky-static-bundle.mjs'),ownerBefore);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const result={status:'PASS',bindings,ownerBinding:ownerBefore,oldOwnerSnapshot:bind(oldSnapshot),
 freshPublicationHash:indexes[1].publicationHash,files:byteReadbacks.length,bytes:byteReadbacks.reduce((n,r)=>n+r.bytes,0),byteReadbacks,
 prior136Fragment:{exact:true,bytes:Buffer.byteLength(priorFragments[1]),sha256:hash(priorFragments[1])},
 revisedWholeFragment:{old:bindings[2],current:bindings[5],exactCurrentOwner:true},
 independentHeaderRuntime:bind('output/selected-w3-static-header-independent-1002-r5/result.json'),
 reviewedOwnerSnapshot:bind(reviewedSnapshot),headerFragmentFunctionExact:true,headerFragmentFunctionSha256:hash(currentModule.skyStaticDeliveryFragment.toString()),
 currentOwnerWhole901Readback:true,newFamilyGuard:{wrongFamily,reviewedAccepted:true,currentRejected:true},
 scope:'Task-only offline full 901 raw bytes/index/header identity comparison and current-owner full bundle validation. Old 136 records serialize identically with old and current owners; whole new fragment matches repaired owner. Independent pinned-Caddy r5 binds the reviewed snapshot, with exact same fragment function but a different whole-source hash after the stricter family guard. This supports unchanged fragment behavior on these validated inputs, not a current whole-source runtime rerun or cloud/TLS/native acceptance. Old r1 fragment remains historical and is not upgraded.'};
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json')},null,2));
