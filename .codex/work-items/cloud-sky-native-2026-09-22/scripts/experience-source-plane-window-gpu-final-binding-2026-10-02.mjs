/** Final immutable scope binding only; no GPU, render or test matrix. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),task='.codex/work-items/cloud-sky-native-2026-09-22';
const file=p=>path.join(ROOT,p),read=p=>fs.readFileSync(file(p));
const bind=p=>{const b=read(p);return{path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const out='output/source-plane-window-gpu-independent-closure-1002-r1';assert(!fs.existsSync(file(out)));fs.mkdirSync(file(out),{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const actual='output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r4',originalPath='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
const original=JSON.parse(read(originalPath));
for(const input of [original.report,...original.inputs]){const b=bind(input.path);assert.equal(b.sha256,input.sha256);assert.equal(b.bytes,input.bytes);}
const independent='output/source-plane-window-gpu-independent-1002-r1';
const oldBinding=JSON.parse(read(independent+'/binding.json'));assert.deepEqual(oldBinding.before,oldBinding.after);
for(const input of oldBinding.before)assert.deepEqual(bind(input.path),input);
const note=task+'/evidence/experience-source-plane-window-gpu-independent-review-2026-10-02.md';
const authorNote=task+'/evidence/experience-source-plane-window-candidate-2026-10-02.md';
assert.equal(bind(authorNote).sha256,'c127578ccc48398a6d5b6ff3b52969f477b6d7209b69508fa8a59225f9f02438');
const extras=[note,authorNote,independent+'/result.json',independent+'/binding.json',task+'/evidence/experience-source-plane-window-candidate-independent-review-2026-10-02.md',
 'output/source-plane-window-independent-1002-r1/result.json','output/source-plane-window-independent-1002-r1/binding.json',
 'output/source-plane-window-difference-membership-1002-r1/result.json',
 ...[1,2,3].map(n=>`output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r${n}/failed.json`),
 original.report.path,...original.inputs.map(i=>i.path),...original.rows.slice(0,3).map(r=>'output/playwright/cloud-sky-full-hook-resource-1002-r4/'+r.condition.name+'.rgba')];
const before=[...new Set([...oldBinding.before.map(i=>i.path),...extras])].map(bind);
const after=before.map(i=>bind(i.path));assert.deepEqual(before,after);
const result={status:'BOUNDED_ACTUAL_GPU_CANDIDATE_REVIEW_CLOSED_NOT_ADOPTED',note:bind(note),actual:bind(actual+'/result.json'),independent:bind(independent+'/result.json'),
 mathematicalReview:bind(task+'/evidence/experience-source-plane-window-candidate-independent-review-2026-10-02.md'),authorNote:bind(authorNote),
 inputFilesUnchanged:before.length,originalInputsWholeByteValidated:original.inputs.length+1,
 scope:['Actual raw RGBA/PNG/GL readback closed; candidate retains 45/85 one-byte residuals, 139 normal opacity oracle has no artwork detection power.',
 'Final source/metadata/capture/failure/note binding only; no new browser runtime, expanded matrix, production adoption or parameter/budget change.',
 'Prior mathematical and failed generations preserve original bounded scopes; no native/WEAPP/cloud/final experience or Goal completion.']};
fs.writeFileSync(file(out+'/binding.json'),JSON.stringify({before,after},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(file(out+'/result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:out,result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),note:bind(note),inputFiles:before.length},null,2));
