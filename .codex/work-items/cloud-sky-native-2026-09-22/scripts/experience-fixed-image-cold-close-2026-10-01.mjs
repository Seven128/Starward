import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async path=>{const bytes=await fs.readFile(path);return{path,bytes:bytes.length,sha256:sha(bytes)};};
const bindingPath=task+'/evidence/experience-fixed-image-cold-binding-2026-10-01.json',binding=JSON.parse(await fs.readFile(bindingPath,'utf8'));
const records=[...binding.preservedRenderingInputs,...binding.productionAndConsumerSources,binding.additionalContext,...binding.preservedOtherEdits,...binding.byteExactConfigurations,...binding.captures,...binding.checks,...binding.scripts,binding.newSource,binding.trace,binding.ordinaryWatch.log,binding.pixels,binding.pixelEdgeDiagnosis,binding.native.moonSource,binding.native.moonPublication];
for(const row of records)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');assert.equal(sha(raw),binding.trace.sha256);assert.equal(raw.toString().trim().split(/\r?\n/).length,1254);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),binding.head);assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),binding.branch);
const docs=[];
for(const file of ['PLAN.md','STATE.md','INDEX.md','PROGRESS.md','evidence/experience-fixed-image-cold-2026-10-01.md']){
 const p=task+'/'+file,text=await fs.readFile(p,'utf8');assert(text.includes('1254'));assert(text.includes('experience-fixed-image-cold-binding-2026-10-01.json'));docs.push(await record(p));
}
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const closing={at:new Date().toISOString(),binding:await record(bindingPath),verifiedRecords:records.length,traceUnchanged:true,eventCount:1254,documents:docs,documentScript:await record(task+'/scripts/experience-fixed-image-cold-docs-2026-10-01.mjs'),closingScript:await record(task+'/scripts/experience-fixed-image-cold-close-2026-10-01.mjs'),scope:'Source/capture/check/script/trace and protected files still bind after task documentation updates; no repeated native interactions, source acquisition or candidate change',goal:'active,unbudgeted,incomplete',sourceRoi:'FAILED_X1_799_MAX16',composition:'FAILED_DEVTOOLS',independentReview:'GAP'};
await fs.writeFile(task+'/evidence/experience-fixed-image-cold-closing-2026-10-01.json',JSON.stringify(closing,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verifiedRecords:records.length,eventCount:1254,documents:docs.length,goal:closing.goal,sourceRoi:closing.sourceRoi,composition:closing.composition}));
