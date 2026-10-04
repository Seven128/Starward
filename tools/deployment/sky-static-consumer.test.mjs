import assert from "node:assert/strict";
import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { executeRelease } from "./release.mjs";
import { operatePreview } from "./operator-preview.mjs";
import { validateOperatorPreviewEnvironment, validateReleaseEnvironment } from "./validate-release-environment.mjs";
import { prepareSkyStaticDelivery } from "./sky-static-release.mjs";
import { skyStaticHash, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { validateStagingQualification } from "./promote-release-candidate.mjs";
import { prepareReleaseCandidate } from "./prepare-release-candidate.mjs";
import { createPromotionRequest, runPromotionRequest } from "./promotion-request.mjs";
import { createReleaseEnvironmentFixture, createVerifiedBackupFixture, releaseRevision, releaseImageDigest } from "./test-support.mjs";
import { dependencies, configuration } from "./operator-preview-test-support.mjs";

const imagePublicationHash="4e07f34b96b37d7c89294ffca73ea89ce531dd0bd1cf0e8468426cd5f63e197a";
const identity={schemaVersion:"starward-sky-static-delivery-v1",imagePublicationHash,
  deliveryPublicationHash:"c".repeat(64),imageDigest:releaseImageDigest,revision:releaseRevision,files:136,bytes:22954411};
const oldSteps=["backup-verification","compose-version","compose-config","image-pull","migration","converge","worker-readiness","public-readiness"];
const securityHeaders={"strict-transport-security":"max-age=31536000; includeSubDomains","x-content-type-options":"nosniff",
  "referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","content-security-policy":"default-src 'none'; frame-ancestors 'none'"};
async function configured(f){const directory=path.join(f.root,"sky-store");for(const p of [f.baseDeployPath,f.deployPath])await appendFile(p,`STARWARD_SKY_STATIC_DIRECTORY=${directory}\n`);return directory;}
function delivery(f,dispose=async()=>{}){return {overlayPaths:[path.join(f.root,"sky-store","delivery-overlay.yml")],directory:path.join(f.root,"sky-store","publication"),identity,dispose};}
function checkResult(d){return {status:"passed",identity:d.identity,checkedFiles:d.identity.files,checkedBytes:d.identity.bytes,unauthorizedStatus:null};}
async function releaseSetup(t,environment="staging"){
 const f=await createReleaseEnvironmentFixture({environment});t.after(()=>rm(f.root,{recursive:true,force:true}));
 await configured(f);const b=await createVerifiedBackupFixture({fixture:f});const calls=[];let tick=0;
 return {f,calls,args:{deployEnvPath:f.deployPath,backupManifestPath:b.manifestPath,operator:"test:release",
  ...(environment==="production"?{confirmProductionDigest:releaseImageDigest}:{}),
  execute(call){calls.push(call);return {stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};},
  fetchImpl:async()=>{const r=new Response(JSON.stringify({status:"ready",release:{environment,revision:releaseRevision,imageDigest:releaseImageDigest}}),{headers:{"content-type":"application/json; charset=utf-8",...securityHeaders}});
   Object.defineProperty(r,"url",{value:`https://${f.domain}/health/ready`});return r;},
  inspectTls:async()=>({protocol:"TLSv1.3"}),delay:async()=>{},now:()=>new Date(Date.parse("2026-08-26T12:00:00Z")+tick++*1000)}};
}
function finalOverlay(call,d){const paths=call.args.flatMap((value,i)=>value==="-f"?[call.args[i+1]]:[]);assert.equal(paths.at(-1),d.overlayPaths[0]);}
test("configured release prepares after pull, uses final overlay and verifies before a v2 success receipt",async t=>{
 const {f,calls,args}=await releaseSetup(t);let disposed=0;const d=delivery(f,async()=>{disposed++});
 const result=await executeRelease({...args,prepareStatic:async input=>{assert.ok(calls.some(c=>c.step==="release-image-pull"));assert.equal(input.validation.operations.skyStaticDirectory,path.join(f.root,"sky-store"));calls.push({step:"static-prepare"});return d;},
  verifyStatic:async input=>{assert.equal(input.delivery,d);assert.ok(calls.some(c=>c.step==="release-converge"));calls.push({step:"static-verify"});return checkResult(d);}});
 assert.equal(result.receipt.schemaVersion,"starward-release-receipt-v2");assert.deepEqual(result.receipt.skyStaticDelivery,identity);assert.equal(disposed,1);
 for(const call of calls.filter(c=>["release-static-compose-config","release-migration","release-converge","release-worker-readiness"].includes(c.step)))finalOverlay(call,d);
 assert.ok(calls.some(c=>c.step==="static-verify"));assert.ok(result.receipt.steps.some(s=>s.name==="sky-static-verification"&&s.status==="passed"));
 assert.deepEqual(JSON.parse(await readFile(result.receiptPath,"utf8")).skyStaticDelivery,identity);
});
test("static preparation failure cannot converge; verification failure cannot emit successful qualification",async t=>{
 for(const phase of ["prepare","verify"]){const {f,calls,args}=await releaseSetup(t);let disposed=0;const d=delivery(f,async()=>{disposed++});
  await assert.rejects(executeRelease({...args,prepareStatic:async()=>{if(phase==="prepare")throw new Error("sky_static_source_invalid");return d;},verifyStatic:async()=>{throw new Error("sky_static_actual_bytes_mismatch");}}),/sky_static_/);
  assert.equal(calls.some(c=>c.step==="release-converge"),phase==="verify");assert.equal(disposed,phase==="verify"?1:0);
  const names=await readdir(f.receiptDirectory),receipt=JSON.parse(await readFile(path.join(f.receiptDirectory,names[0]),"utf8"));
  assert.equal(receipt.status,"failed");assert.equal(receipt.schemaVersion,"starward-release-receipt-v2");assert.ok(!receipt.steps.some(s=>s.name==="sky-static-verification"&&s.status==="passed"));
 }
});
test("production static lane requires actual v2 staging qualification, and compares current image publication",async t=>{
 const {f,calls,args}=await releaseSetup(t,"production");const receiptPath=path.join(f.root,"staging.json");
 const old={schemaVersion:"starward-release-receipt-v1",status:"succeeded",environment:"staging",revision:releaseRevision,imageDigest:releaseImageDigest,steps:oldSteps.map(name=>({name,status:"passed"}))};
 await writeFile(receiptPath,JSON.stringify(old));
 await assert.rejects(validateStagingQualification({receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true}),/sky_static/);
 const current={...old,schemaVersion:"starward-release-receipt-v2",skyStaticDelivery:identity,steps:[...old.steps,{name:"sky-static-preparation",status:"passed"},{name:"sky-static-compose-config",status:"passed"},{name:"sky-static-verification",status:"passed",result:checkResult({identity})}]};
 await writeFile(receiptPath,JSON.stringify(current));const q=await validateStagingQualification({receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true});assert.deepEqual(q.skyStaticDelivery,identity);
 let disposed=0;const d=delivery(f,async()=>{disposed++});d.identity={...identity,imagePublicationHash:"d".repeat(64)};
 await assert.rejects(executeRelease({...args,stagingReceiptPath:receiptPath,prepareStatic:async()=>d,verifyStatic:async()=>checkResult(d)}),/sky_static.*publication.*mismatch/);
 assert.equal(disposed,1);assert.ok(!calls.some(c=>c.step==="release-converge"));
});
function staticConfiguration(deploy,d){const c=configuration(deploy);c.services.caddy.volumes=c.services.caddy.volumes.filter(v=>v.target!=="/etc/caddy/sky-static-delivery.caddy");c.services.caddy.volumes.push(
 {type:"bind",source:path.join(d.directory,"delivery.caddy"),target:"/etc/caddy/sky-static-delivery.caddy",read_only:true},
 {type:"bind",source:d.directory,target:"/srv/sky-public",read_only:true});return c;}

test("actual preview non-deploy loader keeps current mounted overlay after another generation was prepared, before any Compose action", async t=>{
 const dep=await dependencies(t),store=await configured(dep.f);
 const validation=await validateOperatorPreviewEnvironment({deployEnvPath:dep.f.deployPath});
 // Supply real sealed producer files through the synchronous artifact extraction boundary.
 const {cpSync}=await import("node:fs");
 const prepare=async(version,selected)=>{
  const bundle=await writeSkyStaticBundle(path.join(dep.f.root,`sealed-${version}`),(async function*(){yield {
   route:`/v2/sky/moon/${version.repeat(64)}/texture.jpg`,bytes:Buffer.from(version),headers:{"content-type":"image/jpeg",
   "cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}};})());
  await writeFile(path.join(bundle.output,"image-artifact.json"),JSON.stringify({schemaVersion:"starward-sky-static-image-artifact-v1",
   revision:selected.revision,publicationHash:bundle.publicationHash,indexSha256:skyStaticHash(await readFile(path.join(bundle.output,"index.json"))),
   fragmentSha256:skyStaticHash(await readFile(path.join(bundle.output,"delivery.caddy")))}));
  const d=await prepareSkyStaticDelivery({validation:selected,deploy:{...dep.deploy,STARWARD_SKY_STATIC_DIRECTORY:store,STARWARD_IMAGE_REF:`fixture@${selected.imageDigest}`},
   execute:call=>{const command=call.args[0];if(command==="image")return {stdout:Buffer.from(selected.revision)};
    if(command==="cp")cpSync(bundle.output,call.args[2],{recursive:true});
    return {stdout:Buffer.from(command==="create"||command==="container"?"a".repeat(12):"")};}});
  await d.dispose();return d;
 };
 const current=await prepare("1",validation);
 const newer=await prepare("2",{...validation,revision:"2".repeat(40),imageDigest:`sha256:${"2".repeat(64)}`});
 const receiptFile=`operator-preview-${randomUUID()}.json`;await mkdir(dep.f.receiptDirectory,{recursive:true});
 await writeFile(path.join(dep.f.receiptDirectory,receiptFile),JSON.stringify({schemaVersion:"starward-operator-preview-operation-v2",operation:"deploy",
  status:"succeeded",environment:"staging",productionQualified:false,revision:validation.revision,imageDigest:validation.imageDigest,skyStaticDelivery:current.identity,
  steps:["sky-static-preparation","sky-static-compose-config","sky-static-verification"].map(name=>({name,status:"passed",
   ...(name==="sky-static-verification"?{result:{...checkResult(current),unauthorizedStatus:404}}:{})}))}));
 await writeFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json"),JSON.stringify({revision:validation.revision,imageDigest:validation.imageDigest,
  receiptPath:path.join(dep.f.receiptDirectory,receiptFile),skyStaticDelivery:current.identity,skyStaticOverlayPaths:current.overlayPaths}));
 let mounted=current;const calls=[];
 const execute=call=>{calls.push(call);if(call.step==="sky-static-retention-runtime-discovery")return {stdout:Buffer.from("a".repeat(64))};
  if(call.step==="sky-static-retention-runtime-mounts")return {stdout:Buffer.from(JSON.stringify({id:"a".repeat(64),running:true,mounts:[
   {Type:"bind",RW:false,Source:mounted.directory,Destination:"/srv/sky-public"},
   {Type:"bind",RW:false,Source:path.join(mounted.directory,"delivery.caddy"),Destination:"/etc/caddy/sky-static-delivery.caddy"}]}))};
  if(call.step==="preview-compose-config")return {stdout:Buffer.from(JSON.stringify(staticConfiguration(dep.deploy,current)))};
  return dep.execute(call);};
 const passed=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"check",operator:"test",execute,
  verifyStatic:async input=>{assert.deepEqual(input.delivery.identity,current.identity);return {...checkResult(current),unauthorizedStatus:404};}});
 assert.equal(passed.receipt.status,"succeeded");assert.equal(passed.receipt.skyStaticDelivery.files,1);
 assert.equal(passed.receipt.steps.find(s=>s.name==="sky-static-load").result.preparedGenerationMatches,false);
 for(const call of calls.filter(c=>c.step.startsWith("preview-")))finalOverlay(call,current);
 calls.length=0;mounted=newer;
 const failed=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"stop",operator:"test",execute});
 assert.equal(failed.receipt.status,"failed");assert.equal(failed.receipt.errorCode,"sky_static_load_current_runtime_mismatch");
 assert.ok(!calls.some(c=>c.step.startsWith("preview-")));assert.equal(failed.receipt.writersStopped,false);
 assert.ok((await readdir(store)).some(n=>n.startsWith("generation-")));
});
test("preview static stage precedes drain, preserves preview overlay last and verifies before current pointer",async t=>{
 const dep=await dependencies(t);await configured(dep.f);let disposed=0;const d=delivery(dep.f,async()=>{disposed++});const calls=[];
 const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"deploy",operator:"test",
  execute(call){calls.push(call);if(call.step==="preview-static-compose-config")return {stdout:Buffer.from(JSON.stringify(staticConfiguration(dep.deploy,d))),stderr:Buffer.alloc(0)};return dep.execute(call);},
  prepareStatic:async()=>{calls.push({step:"static-prepare"});assert.ok(dep.calls.some(c=>c.step==="preview-image-pull"));return d;},
  verifyStatic:async()=>{calls.push({step:"static-verify"});await assert.rejects(readFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json")));return {...checkResult(d),unauthorizedStatus:404};}});
 assert.equal(result.receipt.status,"succeeded");assert.equal(result.receipt.schemaVersion,"starward-operator-preview-operation-v2");assert.equal(disposed,1);assert.deepEqual(result.receipt.skyStaticDelivery,identity);
 assert.ok(calls.findIndex(c=>c.step==="static-prepare")<calls.findIndex(c=>c.step==="preview-stop-writers"));
 for(const call of calls.filter(c=>["preview-static-compose-config","preview-stop-writers","preview-start-edge","preview-migration"].includes(c.step))){finalOverlay(call,d);assert.ok(call.args.some(v=>v.endsWith("compose.operator-preview.yml")));}
 assert.deepEqual(JSON.parse(await readFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json"),"utf8")).skyStaticDelivery,identity);
});
test("preview prep failure leaves current writers/pointer untouched and check loads existing overlay without pull",async t=>{
 const dep=await dependencies(t);await configured(dep.f);const pointer=path.join(dep.f.receiptDirectory,"operator-preview-current.json");
 const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"deploy",operator:"test",prepareStatic:async()=>{throw new Error("sky_static_manifest_invalid")}});
 assert.equal(result.receipt.status,"failed");assert.equal(result.receipt.writersStopped,false);assert.ok(!dep.calls.some(c=>c.step==="preview-stop-writers"));await assert.rejects(readFile(pointer));
 let disposed=0;const d=delivery(dep.f,async()=>{disposed++});const calls=[];
 d.observation={basis:"CURRENT_RECEIPT_AND_RUNNING_MOUNT",fixture:true};
 const check=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"check",operator:"test",loadStatic:async input=>{
  assert.equal(input.operation,"check");assert.equal(input.execute instanceof Function,true);return d;},
  execute(call){calls.push(call);if(call.step==="preview-compose-config")return {stdout:Buffer.from(JSON.stringify(staticConfiguration(dep.deploy,d))),stderr:Buffer.alloc(0)};return dep.execute(call);},
  verifyStatic:async()=>({...checkResult(d),unauthorizedStatus:404})});
 assert.equal(check.receipt.status,"succeeded");assert.equal(disposed,1);assert.ok(!calls.some(c=>c.step==="preview-image-pull"));calls.forEach(c=>finalOverlay(c,d));
 assert.deepEqual(check.receipt.steps.find(s=>s.name==="sky-static-load").result,d.observation);
});
test("base directory propagates without accepting operator publication identity or changing request v1 fields",async t=>{
 const f=await createReleaseEnvironmentFixture();t.after(()=>rm(f.root,{recursive:true,force:true}));await configured(f);
 const outputPath=path.join(f.root,"candidate.env"),imageReference=`registry.example/starward@${releaseImageDigest}`;
 await prepareReleaseCandidate({baseDeployEnvPath:f.baseDeployPath,outputPath,imageReference,revision:releaseRevision,releasedAt:"2026-08-26T10:00:00Z"});
 assert.equal((await validateReleaseEnvironment({deployEnvPath:outputPath})).operations.skyStaticDirectory,path.join(f.root,"sky-store"));
 const r=await createPromotionRequest({outputPath:path.join(f.root,"request.json"),baseDeployEnvPath:f.baseDeployPath,candidateOutputPath:outputPath,imageReference,revision:releaseRevision,releasedAt:"2026-08-26T10:00:00Z",operator:"test",stagingReceiptPath:null,confirmProductionDigest:null});
 assert.equal(r.request.schemaVersion,"starward-release-request-v1");assert.equal(Object.keys(r.request).length,9);
 await appendFile(f.baseDeployPath,`STARWARD_SKY_PUBLICATION_HASH=${imagePublicationHash}\n`);
 await assert.rejects(prepareReleaseCandidate({baseDeployEnvPath:f.baseDeployPath,outputPath:path.join(f.root,"manual.env"),imageReference,revision:releaseRevision,releasedAt:"2026-08-26T10:00:00Z"}),/sky_static.*identity.*forbidden/);
 const untrusted={...r.request,skyStaticDelivery:identity};await writeFile(r.outputPath,JSON.stringify(untrusted));
 await assert.rejects(runPromotionRequest({requestPath:r.outputPath,promote:async()=>{throw new Error("must not reach promotion")}}),/release_request_fields_invalid/);
});

test("staging static receipt tampering cannot become production qualification",async t=>{
 const f=await createReleaseEnvironmentFixture();t.after(()=>rm(f.root,{recursive:true,force:true}));
 const receiptPath=path.join(f.root,"staging-static.json"),base={schemaVersion:"starward-release-receipt-v2",status:"succeeded",environment:"staging",
  revision:releaseRevision,imageDigest:releaseImageDigest,skyStaticDelivery:identity,
  steps:[...oldSteps.map(name=>({name,status:"passed"})),{name:"sky-static-preparation",status:"passed"},{name:"sky-static-compose-config",status:"passed"},{name:"sky-static-verification",status:"passed",result:checkResult({identity})}]};
 for(const mutate of [
  r=>r.skyStaticDelivery.imageDigest="sha256:"+"e".repeat(64),
  r=>r.steps.at(-1).result.checkedBytes--,
  r=>r.steps.at(-1).result.identity={...r.steps.at(-1).result.identity,imagePublicationHash:"e".repeat(64)},
  r=>r.steps.at(-1).status="failed",
  r=>delete r.steps.at(-1).result,
  r=>r.skyStaticDelivery.operatorClaim="approved",
 ]){const r=structuredClone(base);mutate(r);await writeFile(receiptPath,JSON.stringify(r));
  await assert.rejects(validateStagingQualification({receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true}),/sky_static/);}
});
test("production compares image contents but permits its own larger historical delivery union",async t=>{
 const {f,args}=await releaseSetup(t,"production");const receiptPath=path.join(f.root,"staging.json");
 await writeFile(receiptPath,JSON.stringify({schemaVersion:"starward-release-receipt-v2",status:"succeeded",environment:"staging",revision:releaseRevision,imageDigest:releaseImageDigest,skyStaticDelivery:identity,
  steps:[...oldSteps.map(name=>({name,status:"passed"})),{name:"sky-static-preparation",status:"passed"},{name:"sky-static-compose-config",status:"passed"},{name:"sky-static-verification",status:"passed",result:checkResult({identity})}]}));
 let disposed=0;const d=delivery(f,async()=>{disposed++});d.identity={...identity,deliveryPublicationHash:"f".repeat(64),files:137,bytes:identity.bytes+10};
 const result=await executeRelease({...args,stagingReceiptPath:receiptPath,prepareStatic:async()=>d,verifyStatic:async()=>checkResult(d)});
 assert.equal(result.receipt.status,"succeeded");assert.equal(result.receipt.skyStaticDelivery.imagePublicationHash,imagePublicationHash);
 assert.equal(result.receipt.skyStaticDelivery.deliveryPublicationHash,"f".repeat(64));assert.equal(disposed,1);
});
test("actual static release receipt loses staging qualification when its mounted compose check is removed",async t=>{
 const {f,args}=await releaseSetup(t);const d=delivery(f);
 const result=await executeRelease({...args,prepareStatic:async()=>d,verifyStatic:async()=>checkResult(d)});
 assert.equal(result.receipt.status,"succeeded");
 await validateStagingQualification({receiptPath:result.receiptPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true});
 const edited=structuredClone(result.receipt);edited.steps=edited.steps.filter(step=>step.name!=="sky-static-compose-config");
 const editedPath=path.join(f.root,"staging-without-static-compose.json");await writeFile(editedPath,JSON.stringify(edited));
 await assert.rejects(validateStagingQualification({receiptPath:editedPath,revision:releaseRevision,imageDigest:releaseImageDigest,requireSkyStatic:true}),/sky_static_staging_step_missing:sky-static-compose-config/);
});
test("preview invalid mounted overlay or incomplete verification releases lease without publishing pointer",async t=>{
 for(const phase of ["mount","verify"]){const dep=await dependencies(t);await configured(dep.f);let disposed=0;const d=delivery(dep.f,async()=>{disposed++});
  const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"deploy",operator:"test",prepareStatic:async()=>d,
   execute(call){if(call.step==="preview-static-compose-config"){
    const c=staticConfiguration(dep.deploy,d);if(phase==="mount")c.services.caddy.volumes.find(v=>v.target==="/srv/sky-public").read_only=false;
    return {stdout:Buffer.from(JSON.stringify(c)),stderr:Buffer.alloc(0)};}return dep.execute(call);},
   verifyStatic:async()=>({...checkResult(d),checkedFiles:0,unauthorizedStatus:404})});
  assert.equal(result.receipt.status,"failed");assert.equal(disposed,1);assert.equal(dep.calls.some(c=>c.step==="preview-stop-writers"),phase==="verify");
  assert.ok(!result.receipt.steps.some(s=>s.name==="sky-static-verification"&&s.status==="passed"));
  await assert.rejects(readFile(path.join(dep.f.receiptDirectory,"operator-preview-current.json")));
 }
 const dep=await dependencies(t);await configured(dep.f);
 const result=await operatePreview({...dep,deployEnvPath:dep.f.deployPath,operation:"check",operator:"test",loadStatic:async()=>null});
 assert.equal(result.receipt.status,"failed");assert.equal(dep.calls.length,0);
});
test("static store rejects relative, broad and private-path overlap rather than exposing control files",async t=>{
 for(const invalid of ["relative/store",path.parse(path.resolve('.')).root]){
  const f=await createReleaseEnvironmentFixture({deploy:{STARWARD_SKY_STATIC_DIRECTORY:invalid}});t.after(()=>rm(f.root,{recursive:true,force:true}));
  await assert.rejects(validateReleaseEnvironment({deployEnvPath:f.deployPath}),/sky_static_directory|path_not_absolute/);
 }
 for(const select of [f=>f.root,f=>f.receiptDirectory,f=>path.join(f.backupDirectory,"public")]){
  const f=await createReleaseEnvironmentFixture();t.after(()=>rm(f.root,{recursive:true,force:true}));await appendFile(f.deployPath,`STARWARD_SKY_STATIC_DIRECTORY=${select(f)}\n`);
  await assert.rejects(validateReleaseEnvironment({deployEnvPath:f.deployPath}),/sky_static_directory_private_path_overlap/);
 }
});
