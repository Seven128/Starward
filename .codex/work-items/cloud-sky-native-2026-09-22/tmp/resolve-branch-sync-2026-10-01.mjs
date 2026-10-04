import fs from 'node:fs';
const root = process.cwd();
function resolve(file, choices) {
  let i = 0;
  const path = `${root}/${file}`;
  let text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  text = text.replace(/^<<<<<<< [^\n]*\n([\s\S]*?)^\|\|\|\|\|\|\| [^\n]*\n[\s\S]*?^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n/gm,
    (_, ours, theirs) => { const choice = choices[i++]; if (!choice) throw Error(file); return choice(ours, theirs); });
  if (i !== choices.length || /^<<<<<<< /m.test(text)) throw Error(`conflict count ${file}:${i}`);
  fs.writeFileSync(path, text);
}
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
resolve(task+'HANDOFF-2026-10-01.md', [ours=>ours, (_,theirs)=>theirs, ours=>ours.replace('先适配main已有而本分支尚未接入的必要Sky修复，不把main测试结果当成本分支结果，','main最新状态已按用户要求合回本分支，代码一致性与未提交修改的边界见第9节；继续共享资源和整体组合，')]);
resolve(task+'PLAN.md', [ours=>ours.replace('main的 `4fbfea44` 已修Sky夹具/接口清单，但未回到本分支；首项对照已有修复按本分支owner适配并验证，不照搬其它业务改动、不把main全绿当本分支全绿。','用户随后明确要求把main最新状态同步到本分支；本次合入 `755cd46f`，包含已有Sky夹具/接口清单修复，继续共享资源/整场组合。'), (_,theirs)=>theirs.replace('用户后续流程优化 `4363cefd`','用户流程优化 `c8d2020b` 与main对应提交 `4363cefd`')]);
resolve(task+'USER-UPDATES.md', [(ours,theirs)=>ours.replace('（最新）','（此前纠正，开发位置仍有效）')+'\n'+theirs.replace('（最新）','（阶段集成记录）')]);
resolve('project_context/development-workflow/development-feedback.md', [(_,theirs)=>theirs]);
