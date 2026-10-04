import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
const old='Canvas prefinish aid与DOM postfinish名称要同帧共同决策，不能最后photo反推早先alpha，完整淡化/恢复义务不缩减。';
const next='Canvas prefinish aid与DOM postfinish名称要同帧共同决策，不能最后photo反推早先alpha；global positive仅来源参与，不证明catalog footprint局部可辨认，black fine核心＋positive coarse外围不能用全局OR/HAS/点亮度proxy自动淡化。pre-aid需先flush一次、按signal revision记录实际共同opacity及accepted/native fence，后续terrain/nav只改final来源；局部readability owner仍待落实，不能保旧Canvas抑制而只恢复DOM。完整自然淡化/恢复义务不缩减。';
for(const name of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md']){
  const file=task+name,s=await fs.readFile(file,'utf8');
  assert.equal(s.split(old).length,2,file);
  await fs.writeFile(file,s.replace(old,next));
}
const file='project_context/architecture/runtime-and-domain.md',s=await fs.readFile(file,'utf8');
const before='Whole-cutout spectrum selection, immutable participating fields, all completed-source consumers and one common pre-aid decision across Canvas/DOM still own normal integration; late occlusion cannot retroactively choose W3.';
assert.equal(s.split(before).length,2,file);
await fs.writeFile(file,s.replace(before,before+' Global positive participation does not establish local catalog-footprint readability (valid black fine core may coexist with positive coarse exterior); neither eligibility HAS nor a point-brightness proxy supplies that missing rule. A pre-aid observation must flush actual queued draws once and remain distinct from final source credit, with signal-revision/lifecycle fences and one recorded Canvas/DOM opacity under accepted completion. Later aid/terrain/navigation updates final credit without reversing the earlier decision; loss/native retirement requires actual replacement paint, not a DOM-only restoration. The local readability decision and natural fade/recovery remain unimplemented integration obligations.'));
const progress=task+'PROGRESS.md',p=await fs.readFile(progress,'utf8');
await fs.writeFile(progress,p+'\n\n只读aid独审发现下一consumer实质边界：global positive只证来源参与，不能自动驱动catalog核心辅助淡化；有效黑fine核心＋正coarse外围须保局部readability未证。最小pre-aid观察只能解时序，需要先flush/单次观察/revision缓存/共同opacity及accepted/native fence，不能finish提前或晚photo倒推。失效要实际replacement paint，DOM恢复不单独认证旧Canvas修复。当前唯一依赖和架构owner已改，没新增API/亮度proxy/常驻aid交付声明、GPU重测或native性能主张。\n');
console.log(JSON.stringify({updated:['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md','PROGRESS.md','project_context/architecture/runtime-and-domain.md'],aidReadability:'unverified; independent source participation is not a readability proxy'}));
