import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Read-only source/preservation closeout. This does not replay shaders, native
// runtime checks or previous independent evidence, and never changes Git state.
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=process.argv[2] ?? 'output/contribution-receipt-doc-closeout-1002-r1';
assert.match(output,/^output\/contribution-receipt-doc-closeout-1002-r[1-9][0-9]*$/);
const digest=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD'), branch=git('rev-parse','--abbrev-ref','HEAD');
assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');
assert.equal(branch,'codex/remote-main-20260908');
const expected=JSON.parse(await fs.readFile(`${task}/tmp/resume-preserved-hashes-2026-10-01.json`,'utf8'));
assert.equal(expected.length,6);
const preserved=[];
for(const entry of expected){const actual=await digest(entry.path);assert.equal(actual,entry.sha256,entry.path);preserved.push({...entry,actual,unchanged:true});}
const bindings=[];
for(const [file,sha256] of [
  ['apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.ts','87467f231b709599befc57113e30d4c69c3d34d8782a95c1ecdeb2505b61c4dc'],
  ['apps/wechat-miniapp/src/features/sky/sky-gpu-artwork-contributions.test.ts','15491041f828c2dda1d6827c26d6e884c8656929515a651a228e7f37a42941e7'],
  [`${task}/evidence/experience-contribution-receipt-independent-review-2026-10-02.md`,'929103d47dade43797a27d65aac59e4323b84cf86b12b887a4e4e0cafcb4d765'],
  [`${task}/evidence/experience-sdss-science-consumer-design-2026-10-02.md`,'9dfcabfbb0599248bd0f402e2d4d0f383a07eca608c8ecc387bc7a92c7d8e27c'],
  [`${task}/evidence/experience-science-caller-auxiliary-policy-2026-10-02.md`,'619e8db48d9de015bb829b2b057ec6e68100657dcb5c82af1b53e902a40c18b0'],
  [`${task}/evidence/experience-pre-aid-readability-design-independent-2026-10-02.md`,'4682915962d853d44038326c972f644c46477a2b9df5e8d1f248a2e54671c3d8'],
]){const actual=await digest(file);assert.equal(actual,sha256,file);bindings.push({file,sha256});}
const documents=[];
for(const name of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md']){
  const file=`${task}/${name}`;
  if(name!=='PROGRESS.md')assert.equal((await fs.readFile(file,'utf8')).split('当前依赖：').filter(s=>s.startsWith('先稳定caller auxiliary policy/成本')).length,1,file);
  documents.push({file,sha256:await digest(file)});
}
for(const file of ['project_context/architecture/runtime-and-domain.md',`${task}/evidence/experience-shared-contribution-receipt-development-closure-2026-10-02.md`])documents.push({file,sha256:await digest(file)});
await fs.mkdir(output,{recursive:true});
const result={scope:'Source/preserved-file and current document binding only. No GPU/WEAPP/native/performance/quality/Goal completion certification.',head,branch,preserved,bindings,documents};
const file=path.join(output,'result.json');
await fs.writeFile(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,sha256:await digest(file),preserved:preserved.length,sourceAndReviewBindings:bindings.length,documents:documents.length}));
