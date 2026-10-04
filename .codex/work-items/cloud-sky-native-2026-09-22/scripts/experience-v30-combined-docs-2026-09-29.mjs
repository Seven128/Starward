import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const task = path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const evidence = path.join(task, 'evidence');
const record = JSON.parse(await fs.readFile(path.join(evidence, 'experience-v30-combined-native-validation-2026-09-29.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(await fs.readFile(path.join(evidence, record.trace.file))), record.trace.sha256);
const summary = '**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。唯一v30/PID25916、候选SHAbbc5f610b9d15d18ba0a3553db25c78da8fe120653de60a91b3f124270d82e42、257文件/4,488,797rawB/106生产输入保持；本轮无产品改码/新构建。已在同候选串联局部→274.9°全天→局部、猎犬/天琴识别、中文织女星搜索/自然点选、19:00→21:00跟踪更新、来源Back、公开退出释放/重进；这是开发证据。当前正式示例点、民用2026-09-29 21:00 Asia/Shanghai、观测夜09-29/UTC13:00/revision3，45°手动/DAY标准字号、4039亮星目录对象/3目标，星座/地景/地平ON、W3/赤道OFF，无跟踪/modal/list/timepanel。Context ID摘要893b8fd5…/fingerprint0bb96485…与前轮v30同身份，时间revision递增，不借旧v29。普通名称/dock/modal合成、整场辨认/配准覆盖、原生解码/GPU、Android/iOS/新版月面手机/真实姿态/OS后台、目标性能/官方包体/费用与最终必要审查仍开放。**';
const recovery = '**恢复与证据：** [同v30浏览识别/时间跟踪/退出重进](evidence/experience-v30-combined-2026-09-29.md)及[82事件/12原图冻结绑定](evidence/experience-v30-combined-native-validation-2026-09-29.json)为最新入口，原图全部实际查看。19→21实际Canvas更新；跟踪来源Back保持身份/时间/跟踪/23.5°，原星图区25像素差/max1，不称像素相同。返回原入口编码文件7→0，公开手动重进3份/45°/同Context；文件不是解码/GPU内存。SDK3.17.4/关闭debug，测得时间按钮坐标事件有效但Canvas-only截图仍缺普通覆盖层，保持未验证。参考Vega请求的地点/时刻/FOV与实际CSS记录保留，网页时钟在走/数值地点未核，未匹配；未采用DSS。前轮[有限光学](evidence/experience-optical-boundary-2026-09-29.md)60事件/6原图及v29[重试](evidence/experience-sdss-image-recovery-2026-09-29.md)/[正文取消](evidence/experience-sdss-cancel-2026-09-29.md)冻结，各守原版本/条件。8791/PID4924/exec17379、controller64485保8789及原epoch09:14:20.175Z，PUT4([200,200,200,200])、totalObserved349、source/context/resource pass、settled、held/active0。本轮按sequence262–349取88个native非probe/29个200+59个304，不按复用phase计198。地图CSS SHA81283f7b…与其它模块保持，v27未采用；一次授权审查结束不复派，最终必要审查保留。';
function replaceOnce(text, pattern, replacement, label) {
  const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))];
  assert.equal(matches.length, 1, label);
  return text.replace(pattern, replacement);
}
for (const filename of ['PLAN.md', 'STATE.md', 'INDEX.md']) {
  const file = path.join(task, filename);
  let text = await fs.readFile(file, 'utf8');
  assert(!text.includes('同v30浏览识别/时间跟踪/退出重进'), 'One-shot documentation closure already applied');
  text = replaceOnce(text, /^\*\*当前：.*\*\*\r?$/m, summary, filename + ' current');
  text = replaceOnce(text, /^\*\*恢复与证据：\*\* .*\r?$/m, recovery, filename + ' recovery');
  if (filename === 'PLAN.md') {
    text = replaceOnce(text, /^1\. \*\*固定本代基线：.*\r?$/m,
      '1. **固定本代基线：v30及同身份revision3。** 原有限光学三Sky owner已接共享两图预算/注册/来源/GPU链；106生产输入、候选指纹与上一轮冻结记录重新核实。当前45°手动/正式示例点/21:00/revision3/DAY标准字号，Context SHA893b8fd5…/fingerprint0bb96485…与前轮v30同身份；唯一PID25916。v29修前/故障与v30 M63旧19:00分别冻结，不升级为新版/手机证据。其它模块/地图CSS保持，v27未采用；8791保8789/current epoch PUT4。loopback检查候选不推手机。', 'phase 1');
    text = replaceOnce(text, /^3\. \*\*适用组合证据按候选\/机制保留。.*\r?$/m,
      '3. **适用组合证据按候选/机制保留。** 本轮同v30局部/完整274.9°圆盘/局部、猎犬座/天琴座、织女星中文搜索/实际自然点选、公共19→21跟踪、来源Back、停止跟踪/退出释放/公开手动重进已闭合开发取证，82事件/12原图冻结。最大视场钳制回程23.5°不是原18.9°；来源Back25像素差/max1不称相同；文件7→0→3不称内存。v25入口/识别/全天/月面/网格/错误恢复、v26标准/红光来源/跨午夜/W3与M42、v28银河、v29重复503/正文取消、前轮v30有限光学分别守原证据。不凭源码或相同分包认证完整新版目标旅程；正常HTTP不代替故障机制，本轮软件拒绝不冒充原生GPU故障。', 'phase 3');
    text = replaceOnce(text, /^4\. \*\*唯一下一依赖：.*\r?$/m,
      '4. **唯一下一依赖：整场辨认/实际配准覆盖及未验机制。** 本轮同v30完整旅程的适用正常链已取证，不重复同一正常往返、原有限边界因果或v29已闭合网络案例。先核合规BSC/SAO星层渐进到达、共享星座/名称/拾取实际消费者与有限影像覆盖在组合浏览中的未验差距，按已有owner/真实输入处理错误；原图和参考条件不能认证的位置/画面保持未验，不按受限深星/DSS画面机械补数量。普通名称/dock/modal仍缺实际原生合成；测得坐标事件只证效果，新的捕获/目标依据出现时再定位，不能盲改CoverView或重复安装/样式/参考时钟研究。原生解码/GPU恢复按机制与风险验证，正常200/304不替代；来源Back的25个一级通道差保实数，不扩大成无限亚像素精修。银河/W3/M42条带/饱和、M63原红条带/未知科学覆盖及整场质量仍归原owner。共享文件只改确需的Sky行为，大字号暂停、标准字号/长来源有效；不处理其它业务。目标冷启动/资源/OS后台、真实姿态/完整旋转校准、Android/iOS和最终旅程仍保，手机不可用继续独立Sky工作。', 'phase 4');
    text = replaceOnce(text, /^当前运行：.*\r?$/m,
      '当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换；唯一v30/PID25916、SHA bbc5f610…/106生产输入。正式示例点/2026-09-29 21:00/观测夜09-29/UTC13:00/revision3、Context SHA893b8fd5…/fingerprint0bb96485…，45°手动/DAY标准字号，星座/地景/地平ON、W3/赤道OFF，无跟踪/modal/list/timepanel。8789/PID22124/exec54820保内存；8791/PID4924/exec17379/controller64485/epoch09:14:20.175Z，PUT4([200,200,200,200])、totalObserved349，source/context/resource pass、settled、held/active0；共享8787/8788未动。82事件/12原图冻结，跟踪19→21有实际绘制作用、来源Back25像素差/max1；退出/重进编码文件7→0→3。旧证据各保版本/条件，地图CSS SHA81283f7b…保持，v27未采用。下一依赖见阶段4。', 'current runtime');
    function appendEvidence(prefix, sentence) {
      const lines = text.split(/\r?\n/);
      const index = lines.findIndex(line => line.startsWith(prefix));
      assert(index >= 0, prefix);
      const cells = lines[index].split('|'); assert.equal(cells.length, 7);
      cells[3] = cells[3].trimEnd() + ' ' + sentence + ' ';
      lines[index] = cells.join('|'); text = lines.join('\n');
    }
    appendEvidence('| A/B1/B4：', '本轮同v30实际0.15°→完整274.9°→23.5°及猎犬/天琴Canvas识别已核，钳制回程不称原相机相同，普通名称合成保未验。');
    appendEvidence('| B1/B2/C/B4：', '本轮织女星中文搜索/23.5°定位、19:00与21:00实际Canvas自然点选均为Vega/HR7001/HIP91262；跟踪来源Back同Context/时间/选择，星图区25像素差/max1。');
    appendEvidence('| B4：', '本轮同v30公开19→21/revision2→3跟踪更新有实际原图作用；停止跟踪、退出同Context/文件归零、手动重进45°/21:00已核，未提交预览取消未在本轮验证。');
    assert(text.includes('当前是固定v29开发候选'));
    text = text.replace('当前是固定v29开发候选，SDSS共享重试/原生HTTP重复失败与恢复有适用证据',
      '当前固定v30开发候选；本轮适用组合正常链和编码文件释放/重进有独立绑定。SDSS共享重试/原生HTTP重复失败与恢复保原v29适用证据');
  } else {
    const separator = '**范围与责任：**';
    const index = text.indexOf(separator); assert(index >= 0);
    const end = text.indexOf('\n\n', index); assert(end > index);
    const entry = '\n\n[本轮同v30组合旅程](evidence/experience-v30-combined-2026-09-29.md)：现行恢复点45°手动/21:00/revision3；82事件/12原图冻结、候选及106生产输入保持。局部/全天、织女星搜索点选、公共时间跟踪、来源返回与退出文件释放/同身份重进成立；来源返回实测25像素差/max1，普通控件仍缺实际合成。只维护任务证据和唯一PLAN，全部有效义务/商业理由及目标缺口保持。';
    text = text.slice(0, end) + entry + text.slice(end);
  }
  assert(text.includes('全部33项义务'));
  assert(text.includes('当前21:00') || text.includes('21:00/revision3'));
  await fs.writeFile(file, text);
}
const progressFile = path.join(task, 'PROGRESS.md');
const progress = await fs.readFile(progressFile, 'utf8');
const heading = '## 2026-09-29 A/B1/B4/D：同v30完整正常旅程与恢复';
assert(!progress.includes(heading));
const entry = `\n\n${heading}\n\n本轮没有产品/服务改码或新构建，v30指纹及106生产输入保持。按完整用户流程收同v30局部→274.9°全天→局部、猎犬/天琴识别、织女星中文搜索/自然点选、公共19→21跟踪更新、来源Back、公开停止跟踪/返回原入口/手动重进；82事件/12原图冻结，全部实际查看。19→21原图星图区330,391像素差/max223；来源Back25像素差/max1，保身份/时刻/跟踪与23.5°，不称像素相同。两次闭合诊断失败（scalar result解包、擅自假定0差）保原文，只修证据分类，不改源码或缩裁区。\n\n当前正式示例点/2026-09-29 21:00 Asia/Shanghai/观测夜09-29/UTC13:00/revision3，同Context SHA893b8fd5…/fingerprint0bb96485…；45°手动/DAY标准字号、星座/地景/地平ON，W3/赤道OFF，无跟踪/modal/list/timepanel。退出编码文件7→0、重进3份/实际星场，不能称native/GPU内存。唯一PID25916/SDK3.17.4，8791/PID4924/exec17379/controller64485/原epoch09:14:20.175Z、PUT4([200,200,200,200])/totalObserved349、pass/settled/held-active0，保8789与共享服务；按sequence262–349取88个native记录/29个200+59个304，不按旧phase计198。\n\n测得时间按钮坐标tap有展开事件，但Canvas-only原图仍缺普通标签/dock/modal；参考Vega实际CSS尺寸已记录，时钟在走/数值地点未核，保未匹配，不采用DSS。官方Canvas网页被site-safety阻止，未绕过；本机只读检查未建立合成路径。原v30有限边界、v29故障与其它历史组合各保条件，不升级新版/目标验收。只更新任务证据和现行唯一PLAN/恢复点，没有Context耐久契约变化，所以不重复Context校验。地图CSS和其它模块保持，v27未采用；无手机/预览/云/Git/新Agent/复派审查。全部33义务、商业范围和理由、标准字号与最终目标/费用/审查缺口保留。Goal active、无预算、未完成，下一依赖为整场辨认/配准覆盖及未验机制。详[本轮记录](evidence/experience-v30-combined-2026-09-29.md)及[冻结绑定](evidence/experience-v30-combined-native-validation-2026-09-29.json)。\n`;
await fs.writeFile(progressFile, progress + entry);
console.log(JSON.stringify({ updated: ['PLAN.md', 'STATE.md', 'INDEX.md', 'PROGRESS.md'], trace: record.trace,
  candidateUnchanged: record.candidate.sha256, scope: 'Task records only; no durable Context or product source change.' }));
