import fs from 'node:fs';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22/';
for(const name of ['PLAN.md','STATE.md','INDEX.md','HANDOFF-2026-10-01.md']){
 const path=task+name,text=fs.readFileSync(path,'utf8');
 const old='随后地景retry的实际model→photo交叉恢复仍在绑定本代输出，不追溯升级旧41/48场。';
 assert(text.includes(old),name);
 fs.writeFileSync(path,text.replace(old,'随后地景retry已取得[49场live-Canvas恢复软件GPU证据](evidence/experience-landscape-retry-composition-2026-10-02.md)和独立复核：保有效模型、实际交叉淡化、失败补画与有效mask/来源一致；真零贡献不冒称当前照片。不追溯升级旧41/48场，真实下载/decode/driver失效和native动态仍未验。'));
}
const path=task+'evidence/experience-full-sphere-code-and-native-gap-2026-10-02.md';
let text=fs.readFileSync(path,'utf8');
const old='Later retry/mask changes require their own affected-output evidence; the earlier source SHA equality is not a claim that those generations equal every later edited source.';
assert(text.includes(old));
text=text.replace(old,'Later retry/mask changes have separate [49-scene affected recovery evidence](experience-landscape-retry-composition-2026-10-02.md), with sequential use of the same renderer and preceding actual completed mask. Pending/readiness0 retains the actual model; readiness1 equals the pure photo control. Independent raw-RGBA comparisons and successful-pass alpha replay verify the recorded cases. Failed partial restoration versus the complete-model control has maximum channel delta 1 from quantized blending, not exact equality. The old excessive-alpha counterfactual differs by 180,463 pixels/max32. Failure controls return false before a real GPU pass; they do not establish real driver/context-loss recovery. The earlier source SHA equality is not a claim that those generations equal every later edited source.');
fs.writeFileSync(path,text);
fs.appendFileSync(task+'PROGRESS.md','\n\n## 2026-10-02 live-Canvas地景恢复补充\n\n[49场恢复合成](evidence/experience-landscape-retry-composition-2026-10-02.md)及[独立审查04:40节](evidence/experience-full-sphere-independent-review-2026-10-02.md)已核本代同renderer上一实际已画mask的模型→照片恢复；普通/红光viewOpacity1/.5的pending/r0保原模型、r1/回程等纯照片全RGBA exact。照片失败补画只补缺失alpha，实际对原错误.5反事实180463像素/max32；对完整模型max1量化差保持不写exact。独立24成功/失败分支逐成功alpha和有效mask一致；真零source/相机opacity不报告照片/模型来源。85个renderer-source/artifact、最后页面SHA各绑定实际范围。native动态/下载decode/真实driver恢复、完整旅程、图质/总资源/目标交付仍开放；第一依赖源码与有界软件路径已复核，继续唯一PLAN的共享离线质量责任。原watch7287仍活、60065/50722仍属PID24040；复用不表示原生观察链恢复，无第二次刷新/新窗口/素材下载/手机/提交或部署。\n');
console.log('Recorded the reviewed recovery generation without upgrading earlier artifacts or native scope.');
