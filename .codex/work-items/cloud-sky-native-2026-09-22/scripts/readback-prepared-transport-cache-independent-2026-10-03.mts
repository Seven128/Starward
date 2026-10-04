/** Read-only source/output identity supplement, not another runtime matrix. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),OUT=path.join(ROOT,'output/prepared-transport-cache-independent-1003-r2');
const read=(p:string)=>readFileSync(path.isAbsolute(p)?p:path.join(ROOT,p));
const digest=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex'),json=(p:string)=>JSON.parse(read(p).toString());
const rows:any[]=[];const current=new Map<string,any>();
for(const d of ['output/prepared-optical-transport-1003-r1','output/prepared-optical-resource-1003-r1','output/prepared-optical-resource-1003-r2']){
 const mode=d.includes('transport')?'inputs':'bindings',before=json(d+'/'+mode+'-before.json'),after=json(d+'/'+mode+'-after.json');
 assert.deepEqual(before,after);const mismatches=[];
 for(const r of before){const b=read(r.path);current.set(r.path,{path:r.path,bytes:b.length,sha256:digest(b)});
 if(b.length!==r.bytes||digest(b)!==r.sha256)mismatches.push({path:r.path,executed:r,current:current.get(r.path)});}
 rows.push({generation:d,bindings:before.length,beforeAfterExact:true,currentMismatches:mismatches});
}
const c1=json('output/prepared-optical-resource-1003-r1/resource-traces.json'),c2=json('output/prepared-optical-resource-1003-r2/resource-traces.json');
assert.equal(c2.preparedPublicationHash,'8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802');
assert(c2.evidence.some((r:any)=>r.case==='prepared-shared-clear-and-immutable-file'));
for(const r of c2.evidence){assert.equal(r.snapshot.pendingMetadataListeners,0);if(r.case==='explicit-retry-final-file-owner'||r.case==='prepared-shared-clear-and-immutable-file')
 for(const k of ['entries','leased','bytes','reserved','running','pending','retired','failures'])assert.equal(r.snapshot.caches[0][k],0);}
const oldRuntimePath='output/prepared-optical-resource-1003-r1/executed-runtime-source.ts.txt',oldRuntime=read(oldRuntimePath);
assert.equal(digest(oldRuntime),'83491915145eacfce6c84e8b62b879d1ec9c1ff514c5ff58b9bd93d48b2b6522');
const ts=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'))('typescript'),exports:any={};let factoryCalls=0;
const code=ts.transpileModule(oldRuntime.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{exports,__MINIAPP_API_BASE__:'https://independent.invalid',require(n:string){
 if(n==='@tarojs/taro')return{default:{}};
 if(n==='@starward/miniapp-contracts')return{skyImageContentHash(){throw Error('unexpected_hash');}};
 if(n==='./sky-public-image-cache')return{createSkyPublicImageCache(){factoryCalls++;throw Error('unexpected_cache');}};
 throw Error('unbound_import '+n);}});
const p=json('output/prepared-optical-publication-1003-r4/publication/manifest.json'),a=p.levels.OVERVIEW;
assert.throws(()=>exports.acquirePublishedSkyImage({...a,width:512,height:512,format:'png'},'https://independent.invalid'+a.downloadUrl,p.publicationHash),/sky_public_image_route_invalid/);
assert.equal(factoryCalls,0);
// Generated SDK identity: derive exact output from current generator's algorithm,
// but do not execute the writer or broaden the SDK validation suite.
const ops=json('packages/miniapp-contracts/api/miniapp.operations.json').operations;
const sdk=read('packages/miniapp-contracts/src/generated/miniapp-api.generated.ts').toString();
for(const id of ['preparedOpticalManifestGet','preparedOpticalImageGet']){const r=ops.find((o:any)=>o.id===id);
 assert.equal(r.responseEnvelope,false);assert(sdk.includes(`${id}: { method: "GET", path: ${JSON.stringify(r.path)} }`));
 assert(sdk.includes(`${id}: { request: void; response: ${r.responseType} }`));assert(!sdk.includes(`${id}: { request: void; response: ApiEnvelope`));}
const add=[fileURLToPath(import.meta.url),oldRuntimePath,'packages/miniapp-contracts/api/miniapp.operations.json','packages/miniapp-contracts/src/generated/miniapp-api.generated.ts'];
for(const p of add){const b=read(p);current.set(p,{path:p,bytes:b.length,sha256:digest(b)});}
const bindings=[...current.values()].sort((a,b)=>a.path.localeCompare(b.path));
const result={status:'PASS_BOUNDED_SAVED_IDENTITY_AND_OLD_FAMILY_REJECTION',generations:rows,
 oldClientR1EvidenceCases:c1.evidence.length,currentClientR2EvidenceCases:c2.evidence.length,
 oldPreparedFamilyRejectedBeforeCache:true,oldRuntimeSha256:digest(oldRuntime),
 currentRuntimeActualAcceptedProof:'resource.json: one real prepared image transfer, two independent leases, clear retires both metadata profiles',
 currentClientTraceSha256:digest(read('output/prepared-optical-resource-1003-r2/resource-traces.json')),
 savedR1TraceNotFullFailedTestLog:true,client25PassOnlyRootToolReceiptNotIndependentlyReexecuted:true,
 sdkBarePreparedResponsesExact:true,scope:'Saved-output/hash joins and one exact old-runtime route guard invocation. No cache factory, download, listener, renderer or source production.'};
writeFileSync(path.join(OUT,'saved-identity-readback.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
writeFileSync(path.join(OUT,'saved-identity-bindings.json'),JSON.stringify(bindings,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:OUT,sha256:digest(readFileSync(path.join(OUT,'saved-identity-readback.json'))),bindings:bindings.length,
 differences:rows.map(r=>[r.generation,r.currentMismatches.length])}));
