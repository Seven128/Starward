import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const task='.codex/work-items/cloud-sky-native-2026-09-22',stem=task+'/evidence/experience-wide-resource';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=async path=>{const bytes=await fs.readFile(path);return{path,bytes:bytes.length,sha256:sha(bytes)};};
const bindingPath=stem+'-binding-2026-10-02.json',binding=JSON.parse(await fs.readFile(bindingPath,'utf8'));
const records=[...binding.productionAndConsumerSources,...binding.newSources,...binding.frozenBeforeSources,...binding.preservedOtherEdits,
  ...binding.byteExactConfigurations,...binding.captures,...binding.checks,...binding.scripts,binding.before,binding.trace,binding.pixels,
  binding.software.cpu,...binding.software.sourceInputs,...binding.software.outputs,...binding.w3Inputs.map(row=>({path:row.path,sha256:row.sha256})),
  ...binding.software.runs.flatMap(row=>[row.result,row.bundle]),binding.ordinaryWatch.log];
for(const row of records)assert.equal((await record(row.path)).sha256,row.sha256,row.path);
for(const row of binding.ordinaryWatch.files)assert.equal((await record(binding.ordinaryWatch.path+'/'+row.path)).sha256,row.sha256,row.path);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),binding.head);
assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),binding.branch);
const docs=[];
for(const file of ['PLAN.md','STATE.md','INDEX.md','PROGRESS.md','HANDOFF-2026-10-01.md','evidence/experience-wide-resource-2026-10-02.md']){
  const path=task+'/'+file,text=await fs.readFile(path,'utf8');assert(text.includes('1416'));
  if(file!=='HANDOFF-2026-10-01.md')assert(text.includes('experience-wide-resource-binding-2026-10-02.json'));
  assert(!text.includes('236,??'));docs.push(await record(path));
}
execFileSync('git',['diff','--check'],{stdio:'pipe'});
const logs=await Promise.all(['binding-check','binding-check-final','binding-check-verified'].map(name=>record(stem+'-'+name+'-2026-10-02.log')));
assert((await fs.readFile(logs[0].path,'utf8')).includes('TypeError'));
assert((await fs.readFile(logs[1].path,'utf8')).includes('ENOENT'));
assert((await fs.readFile(logs[2].path,'utf8')).includes('"eventCount":1416'));
const closing={at:new Date().toISOString(),binding:await record(bindingPath),verifiedRecords:records.length,
  watchFilesVerified:binding.ordinaryWatch.files.length,eventCount:1416,documents:docs,logs,
  closingScript:await record(task+'/scripts/experience-wide-resource-close-2026-10-02.mjs'),
  verifierCorrections:'Binder first assumed the previous native view property, then guessed dist-weapp. Both errors retained; now uses the frozen actual view event and known previous ordinaryWatch.path. No native/source/service checks replayed.',
  preservedOtherEdits:6,configsAndFrozenCandidatesPreserved:true,goal:'active,unbudgeted,incomplete',
  scope:'Current source/Context/actual captures/whole software output/input/trace/watch and protected unrelated files still bound. Logical GPU/source model and native strict differences retain their stated limits.',
  composition:'FAILED_DEVTOOLS',wholeMemory:'UNVERIFIED; integrated208 source model14→18MiB / GPU10→16MiB',
  pixels:'Native26510/max50, source801/max15, North10/max1: DIFFERENT; previous875/1254 failures retained',independentReview:'GAP'};
await fs.writeFile(stem+'-closing-2026-10-02.json',JSON.stringify(closing,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({verifiedRecords:records.length,watchFilesVerified:closing.watchFilesVerified,eventCount:1416,
  documents:docs.length,preservedOtherEdits:6,goal:closing.goal}));
