import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async path=>{const bytes=await fs.readFile(path);return{path,bytes:bytes.length,sha256:sha(bytes)};};
const bindingPath=task+'/evidence/experience-artwork-window-binding-2026-10-01.json',binding=JSON.parse(await fs.readFile(bindingPath,'utf8'));
const records=[...binding.preservedRenderingInputs,...binding.productionAndConsumerSources,binding.additionalContext,
  ...binding.preservedOtherEdits,...binding.byteExactConfigurations,...binding.newSources,...binding.captures,...binding.checks,
  ...binding.scripts,binding.trace,binding.ordinaryWatch.log,binding.pixels,binding.software.before,binding.software.current,binding.software.sampling,
  ...binding.software.softwareSourceInputs,...binding.software.sampleAssets];
for(const row of records)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');assert.equal(sha(raw),binding.trace.sha256);
assert.equal(raw.toString().trim().split(/\r?\n/).length,1325);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),binding.head);
assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),binding.branch);
const docs=[];
for(const file of ['PLAN.md','STATE.md','INDEX.md','PROGRESS.md','evidence/experience-artwork-window-2026-10-01.md']){
  const path=task+'/'+file,text=await fs.readFile(path,'utf8');assert(text.includes('1325'));
  assert(text.includes('experience-artwork-window-binding-2026-10-01.json'));docs.push(await record(path));
}
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const logs=await Promise.all(['binding-check','binding-check-final'].map(name=>record(task+'/evidence/experience-artwork-window-'+name+'-2026-10-01.log')));
assert((await fs.readFile(logs[0].path,'utf8')).includes('TypeError'));
assert((await fs.readFile(logs[1].path,'utf8')).includes('"eventCount":1325'));
const closing={at:new Date().toISOString(),binding:await record(bindingPath),verifiedRecords:records.length,eventCount:1325,
  traceUnchanged:true,documents:docs,logs,closingScript:await record(task+'/scripts/experience-artwork-window-close-2026-10-01.mjs'),
  verifierCorrection:'First binder selected a screenshot event sharing a UI stage name; selecting the actual observed UI event corrected it. No source/native interactions replayed.',
  scope:'Current production/source/Context/input/capture/check/trace/protected configuration and6unrelated edits still bind. Source/final quality limits unchanged.',
  goal:'active,unbudgeted,incomplete',composition:'FAILED_DEVTOOLS',nativePixels:'DIFFERENT:5/max1 and4/max1 at equal completed North45 views',
  priorSourceRoi:'1254FAILED_X1_799_MAX16 retained',independentReview:'GAP'};
await fs.writeFile(task+'/evidence/experience-artwork-window-closing-2026-10-01.json',JSON.stringify(closing,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verifiedRecords:records.length,eventCount:1325,protectedUnrelated:binding.preservedOtherEdits.length,
  documents:docs.length,composition:closing.composition,goal:closing.goal}));
