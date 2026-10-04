import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const marker='当前依赖：先稳定caller auxiliary policy/成本';
const decision='后续有限开发[caller范围已核定](evidence/experience-science-caller-auxiliary-policy-2026-10-02.md)：actual Scene同既有renderer/receipt、任务显式publication与maxGroups=1，冻结backing/DPR/完整signal/MAX及固定独立上限，resize不自动加预算；普通默认仍关闭，native全场预算/帧时未采用。';
for(const name of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md']){
  const file=task+name,s=await fs.readFile(file,'utf8');
  assert.equal(s.split(marker).length,2,file);
  assert(!s.includes(decision),file+': already applied');
  await fs.writeFile(file,s.replace(marker,decision+marker));
}
const file=task+'PROGRESS.md',s=await fs.readFile(file,'utf8');
assert(!s.includes('Caller有限开发接入范围已核定：'),'already recorded');
await fs.writeFile(file,s+'\n\nCaller有限开发接入范围已核定：只读[成本/预算核对](evidence/experience-science-caller-auxiliary-policy-2026-10-02.md)未发现已采用的WEAPP auxiliary预算，现有source/encoded限制不能移借。下一actual Scene任务opt-in保同renderer/receipt与单选group、冻结实际backing/DPR/完整链/独立上限，超限UNKNOWN，普通默认关闭；native预算/帧时仍开放。完成来源fields[]与共同aid决策可继续独立实现，不以默认关闭或catalog常驻缩减完整交付。Root已回读独审与consumer/预算note，当前源码与6项保留文件再次核值；Context manifest、883个本地Markdown路径及scoped diff检查通过。没有新增GPU矩阵、IDE/watch启动、手机/下载/提交或云部署。\n');
console.log(JSON.stringify({updated:['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md'],nextDependencyStillOpen:marker}));
