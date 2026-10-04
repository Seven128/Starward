/** Offline closure of separately executed immutable generations. No network or service changes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=p=>path.join(root,p),sha=b=>createHash('sha256').update(b).digest('hex');
const bind=p=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}},json=p=>JSON.parse(fs.readFileSync(file(p),'utf8'));
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p,v)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const r4=json('output/sky-static-owner-independent-1002-r4/review.json');assert.ok(r4.cases.every(c=>c.status==='PASS'));
const r1=json('output/sky-static-owner-independent-1002-r1/review.json'),r2=json('output/sky-static-owner-independent-1002-r2/review.json');
assert.equal(r1.cases.find(c=>c.name.includes('extra canonical')).status,'FAILED_SOURCE_ADMISSION');
assert.equal(r1.cases.find(c=>c.name.includes('create result loss')).status,'FAILED_OWNED_RESOURCE_CLEANUP');
assert.equal(r2.cases.find(c=>c.name.startsWith('HEAD alone')).status,'FAILED_HEAD_HEADER_VERIFICATION');
const paths=new Set(r4.sources.map(s=>s.path));
for(const s of r4.sources)if(!s.path.includes('.test.'))assert.equal(bind(s.path).sha256,s.sha256,'current production source differs from independent r4 freeze');
const walk=p=>{for(const entry of fs.readdirSync(file(p),{withFileTypes:true})){const child=p+'/'+entry.name;if(entry.isDirectory())walk(child);else if(entry.isFile())paths.add(child)}};
for(const p of ['output/sky-static-owner-independent-1002-r1','output/sky-static-owner-independent-1002-r2',
 'output/sky-static-owner-independent-1002-r3','output/sky-static-owner-independent-1002-r4',
 'output/sky-static-release-http-1002-r1','output/sky-static-release-http-1002-r2',
 'output/sky-static-oci-extraction-1002-r1','output/sky-static-sealed-artifact-1002-r1',
 'output/sky-static-deployment-integration-1002-r2','output/sky-static-qualification-compose-step-1002-r1',
 'output/sky-static-qualification-compose-step-1002-r2','workers/miniapp-api/assets/deep-sky'])walk(p);
const baseline=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
for(const item of baseline){assert.equal(bind(item.path).sha256,item.sha256);paths.add(item.path)}
const before=[...paths].sort().map(bind);
const bundle=await import(pathToFileURL(file('tools/deployment/sky-static-bundle.mjs')).href);
const sealed=await bundle.validateSkyStaticBundle(file('output/sky-static-sealed-artifact-1002-r1/publication'));
assert.equal(sealed.files,136);assert.equal(sealed.bytes,22954411);
const seal=json('output/sky-static-sealed-artifact-1002-r1/publication/image-artifact.json');
assert.equal(seal.revision,'1'.repeat(40));assert.equal(seal.publicationHash,sealed.publicationHash);
assert.equal(seal.indexSha256,bind('output/sky-static-sealed-artifact-1002-r1/publication/index.json').sha256);
assert.equal(seal.fragmentSha256,bind('output/sky-static-sealed-artifact-1002-r1/publication/delivery.caddy').sha256);
const oci=json('output/sky-static-oci-extraction-1002-r1/result.json'),pointer=json('output/sky-static-oci-extraction-1002-r1/store/prepared-inventory.json');
assert.equal(oci.identity.imagePublicationHash,sealed.publicationHash);assert.equal(pointer.sources.length,1);
const source=await bundle.validateSkyStaticBundle(file('output/sky-static-oci-extraction-1002-r1/store/'+pointer.sources[0].directory+'/publication'));
const union=await bundle.validateSkyStaticBundle(file('output/sky-static-oci-extraction-1002-r1/store/'+pointer.generation+'/publication'));
assert.deepEqual(source.records,sealed.records);assert.deepEqual(union.records,sealed.records);assert.equal(oci.repeatCreateCount,1);assert.equal(oci.resolverExtraDockerCalls,0);
assert.ok(!fs.existsSync(file('output/sky-static-oci-extraction-1002-r1/store/preparation.lock')));
const http=json('output/sky-static-release-http-1002-r2/result.json');assert.equal(http.publicationHash,sealed.publicationHash);assert.ok(http.cases.every(c=>c.status==='PASS'));
const logs=fs.readFileSync(file('output/sky-static-release-http-1002-r2/caddy.log'),'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
const access=logs.filter(l=>l.logger?.startsWith('http.log.access'));
assert.ok(access.length>136);assert.ok(access.every(l=>!Object.hasOwn(l,'request')&&!Object.hasOwn(l,'resp_headers')));
const staticLogs=access.filter(l=>l.sky_delivery==='static');assert.ok(staticLogs.length>=136);
const counts={};for(const l of access){const key=[l.sky_delivery??'none',l.sky_resource_class??l.sky_resource??'none',l.status].join(':');counts[key]=(counts[key]??0)+1}
const oldValidator=await import(pathToFileURL(file('output/sky-static-owner-independent-1002-r3/frozen/validate-release-environment.mjs')).href);
const newValidator=await import(pathToFileURL(file('tools/deployment/validate-release-environment.mjs')).href);
const r4Consumer=r4.cases.find(c=>c.name.startsWith('actual release consumer'));
const missing=r4Consumer.receipt.path.replace(/receipts[/\\][^/\\]+$/,'missing-static-compose-receipt.json');
const selected=json(missing);const oldQualification=await oldValidator.validateStagingQualification({receiptPath:file(missing),revision:selected.revision,imageDigest:selected.imageDigest,requireSkyStatic:true});
await assert.rejects(newValidator.validateStagingQualification({receiptPath:file(missing),revision:selected.revision,imageDigest:selected.imageDigest,requireSkyStatic:true}),/sky_static_staging_step_missing:sky-static-compose-config/);
const frozenOwner=await import(pathToFileURL(file('output/sky-static-owner-independent-1002-r4/frozen/sky-static-release.mjs')).href);
const store=file(out+'/aggregate-error-store');let aggregate;
try{await frozenOwner.prepareSkyStaticDelivery({validation:{revision:'1'.repeat(40),imageDigest:'sha256:'+'1'.repeat(64),operations:{skyStaticDirectory:store}},deploy:{STARWARD_SKY_STATIC_DIRECTORY:store,STARWARD_IMAGE_REF:'controlled/image@sha256:'+'1'.repeat(64)},execute({args}){
 if(args[0]==='image')return{stdout:Buffer.from('1'.repeat(40))};
 if(args[0]==='create')throw Error('independent_original_create_result_lost');
 if(args[0]==='container')throw Error('independent_cleanup_list_failed');
 throw Error('unexpected controlled process');
}})}catch(e){assert.equal(e.message,'sky_static_artifact_cleanup_unverified');assert.ok(e.cause instanceof AggregateError);aggregate={message:e.message,cause:e.cause.message,errors:e.cause.errors.map(x=>x.message)}}
assert.deepEqual(aggregate.errors,['independent_original_create_result_lost','independent_cleanup_list_failed']);assert.ok(!fs.existsSync(path.join(store,'preparation.lock')));
const link=file(out+'/linked-publication');fs.symlinkSync(file('output/sky-static-owner-independent-1002-r4/image-old/publication'),link,process.platform==='win32'?'junction':'dir');
await assert.rejects(bundle.validateSkyStaticBundle(link),/file_type_invalid/);
save('readonly-docker-tool-output.json',{capture:'Literal exact stdout from independently executed read-only tools; no create/run/pull/build/stop/service action',commands:[
 {args:['image','inspect',oci.imageReference,'--format','selected Id/RepoDigests/revision'],exitCode:0,stdout:'{"Id":"sha256:ec6205338c845d63d3b81f79d7fdf8db9da8e3a305051c5aff21a33ec389c0e0","RepoDigests":["starward-sky-static-support@sha256:ec6205338c845d63d3b81f79d7fdf8db9da8e3a305051c5aff21a33ec389c0e0"],"Revision":"1111111111111111111111111111111111111111"}\n'},
 {args:['container','ls','--all','--filter','name=^/starward-sky-artifact-dd524cda-9ce2-46b5-8563-23e547b8fbf1$','--filter','label=starward.sky-artifact-owner=dd524cda-9ce2-46b5-8563-23e547b8fbf1','--format','{{.ID}}'],exitCode:0,stdout:''} ]});
save('review.json',{scope:'Independent offline closure; actual native Windows task filesystem, real retained bundles and old/new source replay; two read-only Docker inventories. No HTTP/deploy/pull/image build/runtime/device/capacity execution by reviewer',status:'INDEPENDENT_STATIC_OWNER_AND_CONSUMER_DEVELOPMENT_REVIEW_PASS',
 currentSources:r4.sources.filter(s=>!s.path.includes('.test.')),controlledMechanisms:r4.cases.map(c=>({name:c.name,status:c.status})),
 preservedFailures:{sourceAdmission:bind('output/sky-static-owner-independent-1002-r1/review.json'),headHeaders:bind('output/sky-static-owner-independent-1002-r2/review.json')},
 aggregateError:aggregate,nativeJunctionRejected:true,stagingQualification:{oldSource:bind('output/sky-static-owner-independent-1002-r3/frozen/validate-release-environment.mjs'),newSource:bind('tools/deployment/validate-release-environment.mjs'),missingComposeReceipt:bind(missing),oldAccepted:oldQualification,newRejected:true},
 actualSealedReadback:{publicationHash:sealed.publicationHash,files:sealed.files,bytes:sealed.bytes,seal},
 actualOciReceipt:{result:bind('output/sky-static-oci-extraction-1002-r1/result.json'),sourceMatchesSealed:true,unionMatchesSealed:true,scope:oci.scope},
 actualTlsReceipt:{result:bind('output/sky-static-release-http-1002-r2/result.json'),accessLog:bind('output/sky-static-release-http-1002-r2/caddy.log'),accessRecords:access.length,staticRecords:staticLogs.length,classificationCounts:counts,noRequestOrResponseHeadersPersisted:true,
  scope:'Reviewed author-executed real private-CA verified TLS routes+bytes/headers+guard+API fallback. Native default verifier public-PKI transport and remote release unexecuted; preview global protocol/default SNI settings replaced by merged ordinary local global block'},
 remaining:['Clean CI build of changed production Dockerfile exact source revision','Remote formal/protected preview current adoption and real public-PKI route verification','Historical pre-static images/control packages universal rollback and full client version journeys','Measured mixed cold/warm 200 DAU performance/cost, Windows/WeChat native cache, GPU and complete experience acceptance']});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const after=before.map(s=>bind(s.path));assert.deepEqual(after,before);
save('binding.json',{script:bind(out+'/executed-script.mjs.txt'),review:bind(out+'/review.json'),inputsBefore:before,inputsAfter:after,unchanged:true});
console.log(JSON.stringify({review:bind(out+'/review.json'),binding:bind(out+'/binding.json'),protectedInputCount:before.length,staticLogCount:staticLogs.length}));
