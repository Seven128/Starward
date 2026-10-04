import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const output='output/science-optical-completion-consumer-doc-closeout-1002-r1';
const sha=async path=>createHash('sha256').update(await fs.readFile(path)).digest('hex');
const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');assert.equal(branch,'codex/remote-main-20260908');
const checks=await read(output+'/checks.json');
for(const check of checks.checks){assert.equal(check.status,'fulfilled');assert.equal(check.value.exit_code,0);}
const bindingsPath='output/science-optical-completion-consumer-1002-r2/bindings.json';
const bindings=await read(bindingsPath);
for(const entry of bindings.bindings)assert.equal(await sha(entry.file),entry.sha256,entry.file);
for(const entry of await read(task+'tmp/resume-preserved-hashes-2026-10-01.json'))
  assert.equal(await sha(entry.path),entry.sha256,entry.path);
const paths=['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md',
  'evidence/experience-optical-completion-consumer-development-2026-10-02.md',
  'evidence/experience-optical-completion-consumer-independent-review-2026-10-02.md'].map(file=>task+file);
paths.push('project_context/architecture/runtime-and-domain.md');
const docs=[];
for(const path of paths)docs.push({path,sha256:await sha(path),bytes:(await fs.stat(path)).size});
const plan=await fs.readFile(task+'PLAN.md','utf8');
assert.equal(plan.split('当前依赖：按已核caller有限政策').length,2);
assert(!plan.includes('当前依赖：先稳定caller auxiliary policy/成本'));
const joins=['output/science-optical-completion-consumer-root-join-1002-r2/result.json',
  'output/optical-completion-consumer-independent-closure-1002-r1/result.json'];
const evidence=[];
for(const path of joins)evidence.push({path,sha256:await sha(path)});
const target=output+'/result.json';
await fs.writeFile(target,JSON.stringify({scope:'Current document/source identity and declaration/path/whitespace closeout. Not product/runtime/quality acceptance.',
  head,branch,docs,currentSourceBinding:{path:bindingsPath,sha256:await sha(bindingsPath),count:bindings.bindings.length,currentExact:true},
  evidence,checks:{path:output+'/checks.json',sha256:await sha(output+'/checks.json')},preserved:6,
  currentDependency:'Same actual Scene task-only science group, expected-ready preparation and whole-cutout selection; local readability, full-scene native cost/quality/default adoption stay open.',
  goal:'active, unbudgeted, incomplete'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({target,sha256:await sha(target),docs:docs.length,sources:bindings.bindings.length,preserved:6,head,branch}));
