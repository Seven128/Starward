import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='output/complete-resource-current-state-1003-r1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=async path=>{const b=await fs.readFile(path);return {path,bytes:b.length,sha256:hash(b)};};
const load=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const current=await load(out+'/result.json'), receipts=await load(out+'/original-document-check-receipts.json');
assert.equal(receipts.checks.length,3);for(const r of receipts.checks){assert.equal(r.status,'fulfilled');assert.equal(r.value.exit_code,0);}
const links=JSON.parse(receipts.checks[1].value.output.trim());assert.equal(links.localLinks,916);assert.deepEqual(links.missing,[]);assert.deepEqual(links.files,receipts.docs);
const frozen=[...current.sources,...current.preserved,...current.reports,...current.documents];
for(const expected of frozen)assert.deepEqual(await bind(expected.path),{path:expected.path,bytes:expected.bytes,sha256:expected.sha256});
const uniquePaths=[...new Set([...frozen.map(x=>x.path),...receipts.docs,out+'/result.json',out+'/original-document-check-receipts.json','.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-complete-resource-document-closeout-2026-10-03.mjs'])];
const before=await Promise.all(uniquePaths.map(bind));await fs.writeFile(out+'/document-inputs-before.json',JSON.stringify(before,null,2),{flag:'wx'});
const after=await Promise.all(uniquePaths.map(bind));assert.deepEqual(after,before);await fs.writeFile(out+'/document-inputs-after.json',JSON.stringify(after,null,2),{flag:'wx'});
const result={status:'DOCUMENT_CHECK_RECEIPTS_AND_CURRENT_FROZEN_INPUTS_MATCH',inputCount:before.length,documents:receipts.docs,localDestinations:916,missingDestinations:0,originalChecks:receipts.checks.map(r=>({chunk:r.value.chunk_id,exitCode:r.value.exit_code})),gpuStatus:current.actualStatus,gpuExitCode:current.actualExitCode,bitmap26HistoricalMembership:current.bitmap26HistoricalMembership,limits:'Only original document check receipt/hash closeout; no GPU/typecheck/native rerun or source quality/capacity acceptance. Goal active incomplete.'};
await fs.writeFile(out+'/document-closeout.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:result.status,inputs:before.length,result:await bind(out+'/document-closeout.json')}));
