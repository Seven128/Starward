import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const status='**2026-10-02用户已明确继续：Goal active、无预算、未完成。** 实时Goal已核，完整替换目标已采用；继续在原worktree/分支、HEAD 72e65cf3开发，不重复合并。当前依唯一PLAN推进完整球面、地景渐隐与同帧消费者；共享影像质量、持久缓存及整体交付义务全部保留。生产配置仍是预期，4GB测试服不变；6项保留修改、手机/大字号暂停和商业边界保持。源码/开发验证/目标运行时/最终验收分开，下文旧代次继续保原适用条件。';
for(const name of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md']){
  const file=task+'/'+name, source=await fs.readFile(file,'utf8');
  const pattern=/^\*\*2026-10-02讨论后当前状态：Goal paused[^\r\n]*$/m;
  assert(pattern.test(source), name+': expected paused header');
  let next=source.replace(pattern,status);
  if(name==='PLAN.md')next=next.replace('历史续接状态（已被本页2026-10-02暂停更新覆盖）','历史续接状态（当前由本页2026-10-02恢复执行状态覆盖）');
  if(name==='STATE.md')next=next.replace('历史2026-10-01续接状态（当前已暂停）','历史2026-10-01续接状态（保当时条件）');
  await fs.writeFile(file,next);
}
await fs.appendFile(task+'/USER-UPDATES.md','\n\n## 2026-10-02 明确恢复执行\n\n用户原文：\n\n> 继续goal\n\n实际Goal已核为active、无预算，目标全文与3947字符替换文本一致；此前暂停已由当前授权撤销。依唯一PLAN继续，原工作位置、全部有效要求/商业排除、六项保留文件与手机/大字号暂停保持，不新增提交/采购/部署/发布授权。\n');
await fs.appendFile(task+'/PROGRESS.md','\n\n## 2026-10-02 全景开发恢复\n\n用户明确“继续goal”，实际Goal为active、无预算、未完成。原branch/HEAD 72e65cf3和BFF 60065/50722 PID24040复核保持，普通watch继续复用。正在按唯一PLAN首依赖迁移完整球面/地景渐隐与共享消费者；独立审查发现HiPS反极点巨三角、地景冷文件回程切换和最大全天相机强制天顶，均在本轮相关owner修复，实际输出与目标运行时还需绑定。6项设置/outbox SHA256与恢复基线一致。\n');
console.log('Resumed active status in the four task entrypoints; original user instruction recorded.');
