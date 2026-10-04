import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22"),checked=[];
const owners=["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"];
for(const name of [...owners,"evidence/experience-traffic-native-2026-09-28.md"]){
  const file=path.join(task,name),text=await fs.readFile(file,"utf8");
  for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    const target=match[1].replace(/^<|>$/g,"");
    if(/^(?:https?:|app:|thread:|codex:|mailto:|#)/.test(target))continue;
    const relative=decodeURIComponent(target.split("#")[0]);if(!relative)continue;
    const resolved=path.resolve(path.dirname(file),relative);
    assert.ok(await fs.access(resolved).then(()=>true,()=>false),`missing_local_link:${name}:${relative}`);
    checked.push({owner:name,target:relative});
  }
  if(owners.includes(name)){
    const top=text.split(/\r?\n\r?\n/).slice(0,4).join("\n");
    assert.ok(top.includes("revision8"),`stale_current_revision:${name}`);
    assert.ok(top.includes("跨运行时"),`missing_current_dependency:${name}`);
    assert.ok(top.includes("Goal未完成"),`completion_boundary_missing:${name}`);
  }
}
const plan=await fs.readFile(path.join(task,"PLAN.md"),"utf8");
assert.equal((plan.match(/\*\*当前可执行依赖：/g)??[]).length,1);
assert.ok(plan.includes("DSS")&&plan.includes("Gaia DR3/EDR3")&&plan.includes("PS1/SkyMapper")&&plan.includes("TWGL"));
assert.ok(plan.includes("独立审查")&&plan.includes("Android/iOS")&&plan.includes("校准")&&plan.includes("官方包体"));
const read=async name=>JSON.parse(await fs.readFile(path.join(task,"evidence",name),"utf8"));
const actual=await read("experience-traffic-native-2026-09-28.json"),binding=await read("experience-traffic-native-binding-2026-09-28.json");
assert.equal(binding.current.revision,8);assert.equal(binding.candidate.sha256,actual.candidateSha256);
assert.equal(actual.cancel.canceledImage.controlledResourceOutcome,"downstream-cancel");
assert.equal(actual.cancel.activeAfterCapture.length,1);assert.equal(actual.cancel.heldResourceCountAfter,0);
assert.equal(actual.encodedFiles.historical.count,25);assert.equal(actual.encodedFiles.historicalPreservedOnFinal,true);
const epochs=await Promise.all([read("experience-traffic-native-epoch1-2026-09-28.json"),read("experience-traffic-native-epoch2-2026-09-28.json")]);
const rows=epochs.flatMap(epoch=>epoch.traffic.records).filter(row=>!row.agentProbe);
assert.equal(rows.length,138);assert.equal(rows.reduce((n,row)=>n+row.upstreamBodyBytes,0),5749060);
// Structured measurement fields contain neither complete identity routes nor
// payload/header values; the public source text may retain its asset URLs.
for(const epoch of epochs){
  const serialized=JSON.stringify(epoch.traffic);
  assert.ok(!/"(?:url|headers|response|data|contextId|spotId|requestId)"\s*:/.test(serialized),"sensitive_measurement_field");
  assert.equal(epoch.traffic.active.length,0);
}
const value={scope:"Current task-owner pointers, local link existence, measurement arithmetic/privacy and existing candidate/Context binding; not product/phone/independent-review acceptance.",
  localLinksChecked:checked.length,owners,uniqueCurrentDependency:true,scopeRetained:true,currentRevision:8,candidateSha256:actual.candidateSha256,
  capturesBound:binding.captureBinding.length,unmarkedRequests:138,measuredBodyBytes:5749060,
  collectorRepair:"The first document updater failed on CRLF paragraph matching before owner edits. It reused the exact saved evidence, normalized owner line endings, then updated the current pointers successfully.",
  productionSourceChanged:false,phoneAcceptance:"unverified",independentReview:"unavailable",goal:"active, unbudgeted, incomplete"};
await fs.writeFile(path.join(task,"evidence/experience-traffic-native-doc-check-2026-09-28.json"),JSON.stringify(value,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(value));
