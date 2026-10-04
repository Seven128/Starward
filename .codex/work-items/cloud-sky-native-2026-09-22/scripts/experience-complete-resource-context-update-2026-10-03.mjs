import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const out='output/complete-resource-current-state-1003-r1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=async p=>{const b=await fs.readFile(path.resolve(root,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const load=async p=>JSON.parse(await fs.readFile(path.resolve(root,p),'utf8'));
const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(branch,'codex/remote-main-20260908');assert.equal(head,'72e65cf309d700cb7d40c5b7afd53660fd39fa35');
const actualPath='output/playwright/cloud-sky-complete-resource-1003-r2/result.json';
const independentPath='output/complete-resource-independent-1003-r6/result.json';
const cpuPath='output/native-image-membership-observation-1003-r1/result.json';
const actual=await load(actualPath), independent=await load(independentPath), cpu=await load(cpuPath);
assert.equal((await bind(actualPath)).sha256,'80a2270a1d922f86019a9518ba7ef249aeff0603e9676ca709df6b7d9b8c04c3');
assert.equal((await bind(independentPath)).sha256,'e3fab3c43724775fe7d141c64bec85be35766a943fb063b456a5c8d872bbf6f9');
assert.equal((await bind(cpuPath)).sha256,'cb96a155d802e0ac0f080e1db92d4bc7ae29590e92120773b3dbbbe95f1ce47f');
assert.equal(actual.status,'MEASURED_WITH_FAILURES');assert.deepEqual(actual.retirementFailures,[{kind:'native-owner-current-after-hide'}]);
assert.deepEqual(actual.rows.map(x=>x.passes.length),[4,4,19,7,4]);
assert.equal((await load('output/playwright/cloud-sky-complete-resource-execution-1003-r3/result.json')).exitCode,1);
assert.equal(independent.final.bitmap26HistoricalWeakMembership,null);
const sources=await Promise.all(actual.sourceBindings.map(x=>bind(x.path)));
for(let i=0;i<sources.length;i++){assert.equal(sources[i].sha256,actual.sourceBindings[i].sha256,sources[i].path);assert.equal(sources[i].bytes,actual.sourceBindings[i].bytes);}
const retained=await load(task+'tmp/resume-preserved-hashes-2026-10-01.json');
const preserved=await Promise.all(retained.map(x=>bind(x.path)));
for(let i=0;i<preserved.length;i++)assert.equal(preserved[i].sha256,retained[i].sha256,preserved[i].path);
const reports=[actualPath, independentPath, cpuPath,
 'output/complete-resource-root-pixel-readback-1003-r1/result.json',
 'output/playwright/cloud-sky-complete-resource-execution-1003-r3/result.json',
 'output/playwright/cloud-sky-complete-resource-execution-1003-r3/raw.log',
 'output/public-image-demand-type-boundary-fix-1003-r1/result.json',
 ...['experience-complete-resource-composition-development-2026-10-03.md','experience-complete-resource-independent-review-2026-10-03.md','experience-complete-resource-development-closure-2026-10-03.md'].map(p=>task+'evidence/'+p)];
const docs=['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md'].map(p=>task+p);
const script=task+'scripts/experience-complete-resource-context-update-2026-10-03.mjs';
await fs.mkdir(path.join(root,out));
const before=await Promise.all([...docs,...reports,script].map(bind));
await fs.writeFile(path.join(root,out,'before.json'),JSON.stringify({branch,head,sources,preserved,inputs:before},null,2),{flag:'wx'});
const old='独立[完整资源入口](evidence/experience-complete-resource-composition-preparation-2026-10-02.md)已核五合法pose/现有输入，正在推进同Canvas真实Hooks/SAO、细图挂起失败重试及压缩/解码/texture-buffer-FBO计量，尚无新GPU/native/容量结果。';
const next='[五态完整资源组合有限闭合](evidence/experience-complete-resource-development-closure-2026-10-03.md)及[实际独审](evidence/experience-complete-resource-independent-review-2026-10-03.md)已读回同Canvas全部真实Hooks/SAO、38次软件提交、完整PNG/RGBA及GL账本：细图失败保粗图、真实重试恢复，五暖帧上传/复制0，首末Moon45全图相同，hide文件lease0/clear文件与逻辑GL句柄归零。当前native引用RGBA尺寸模型峰26,542,080B、texture分配模型峰17,367,040B、buffer63,948B，互不冒客户端总内存/帧时/native预算/200DAU容量。原R2 MEASURED_WITH_FAILURES/exit1保留：diagnostic image26历史WeakMap membership UNKNOWN；另代最小CPU控制证明未登记候选兼容draw API仍true，不能倒填旧26或认证物理回收。不再自动重跑整38场、不据此修生产或扩大预算。';
const oldSecond='当前完整资源入口在同五态内补actual previousaccepted反馈/240ms returning及实际wanted额外本地SAO，仍未运行新GPU；准备/静核不验客户端总峰值。';
const nextSecond='本次资源代次已实际包含previous accepted资格反馈、240ms returning与交付前实绑额外本地SAO；仅受控软件执行。下一独立开发依赖继续目录region之后的有依据局部观察/共同decision及边缘政策、一次pre-aid flush/signal revision/accepted-native寿命，完整自然淡化恢复尚未交付；旧准备与失败不升级。';
for(const p of docs.slice(0,4)){
 const s=await fs.readFile(path.join(root,p),'utf8');assert.equal(s.split(old).length,2,p);assert.equal(s.split(oldSecond).length,2,p);
 await fs.writeFile(path.join(root,p),s.replace(old,next).replace(oldSecond,nextSecond));
}
await fs.appendFile(path.join(root,docs[4]),'\n\n## 2026-10-03：五态完整资源链实际运行、独立读回与分类限制\n\n'+next+nextSecond+'实际过程/失败与独立原物见上述closure和作者记录，root另核全部38整幅PNG/RGBA。只更新当前任务恢复点，不修改源质量、商业、原生或容量义务；无新下载/IDE/手机/云发布，6保留文件/分支HEAD保持，Goal active无预算未完成。\n');
const after=await Promise.all([...docs,...reports,script].map(bind));
for(let i=docs.length;i<after.length;i++)assert.deepEqual(after[i],before[i]);
const sourcesAfter=await Promise.all(sources.map(x=>bind(x.path))), preservedAfter=await Promise.all(preserved.map(x=>bind(x.path)));
assert.deepEqual(sourcesAfter,sources);assert.deepEqual(preservedAfter,preserved);
await fs.writeFile(path.join(root,out,'after.json'),JSON.stringify({sources:sourcesAfter,preserved:preservedAfter,inputs:after},null,2),{flag:'wx'});
const result={status:'CURRENT_TASK_RESOURCE_FACTS_UPDATED_WITH_ORIGINAL_FAILURE_RETAINED',branch,head,actualStatus:actual.status,actualExitCode:1,bitmap26HistoricalMembership:'UNKNOWN',sourceCount:sources.length,sources,preserved,reports:after.slice(docs.length,-1),documents:after.slice(0,docs.length),scope:'Current task documentation only; no durable new resource policy, production edits, new GPU/native execution or old result reclassification'};
await fs.writeFile(path.join(root,out,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({status:result.status,documents:docs.length,sourceCount:sources.length,preserved:preserved.length,result:await bind(out+'/result.json')}));
