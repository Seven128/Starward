import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const record = JSON.parse(await fs.readFile(task + '/evidence/experience-stellar-layer-native-validation-2026-09-29.json', 'utf8'));
assert.equal(record.trace.events, 75);
assert.equal(record.runtime.totalObserved, 508);
const current = '**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。唯一v30/PID25916、候选SHA bbc5f610b9d15d18ba0a3553db25c78da8fe120653de60a91b3f124270d82e42、257文件/4,488,797rawB/106生产输入保持。正式示例点、民用2026-09-29 21:00 Asia/Shanghai、观测夜09-29/UTC13:00/revision3，当前Vega定位、4.6°手动/DAY标准字号，星座/地景/地平ON、W3/赤道OFF，无跟踪/modal/list/choices/timepanel/暗星重试。Context SHA893b8fd5…/fingerprint0bb96485…；4039是亮星目录对象，不能当已绘数量。同代SAO67132已核真实渐进显隐、离定位标记自然点选、退远再放大恢复。用户两条Stellarium补充及八原图已入记录，约1.7°不作运动启动阈值。普通覆盖层合成、延迟到达/失败机制、整场质量配准、手机/新版月面、姿态/OS后台、目标性能/官方包体/费用和最终审查保持开放。**';
const evidence = '**恢复与证据：** [同v30恒星分层与自然点选](evidence/experience-stellar-layer-2026-09-29.md)及[75事件/九原图冻结绑定](evidence/experience-stellar-layer-native-validation-2026-09-29.json)为最新入口。九原图全部实际查看；原中心“缺星”、列表中Venus“错选”及mixed choices后“缺modal”的调查判断已纠正，不称产品修复。真实SAO视觉9.10星等/中性色，Vega定位后暗星离标记121.2逻辑px可点选；4.6→9.1→4.6恢复星图区0差。初图已含暗星，不能认证异步到达。8791/PID4924/exec17379/controller64485保8789及原epoch09:14:20.175Z，pass/pass/pass、settled、held/active0、PUT4均200，总观察508含探针；sequence357–508只计52条实际原生非probe、23×200/29×304/正文5,128,769B，不认证目标延迟/费用。[此前82事件组合旅程](evidence/experience-v30-combined-2026-09-29.md)和12原图仍冻结，19→21有画面作用、来源Back25像素差/max1、编码文件7→0→3保原条件，不再作当前45°恢复点；前轮有限光学和v29失败/取消证据各守原版本。地图CSS SHA81283f7b…保持，v27未采用；本次授权审查已结束，最终必要审查保留。';
for (const name of ['PLAN.md','STATE.md','INDEX.md']) {
  const file = task + '/' + name;
  let text = await fs.readFile(file, 'utf8');
  assert(!text.includes('[同v30恒星分层与自然点选]'), 'documentation batch already recorded');
  const statePattern = /\*\*当前：[^\n]+\*\*/;
  assert(statePattern.test(text));
  text = text.replace(statePattern, current);
  const evidencePattern = /\*\*恢复与证据：\*\*[^\n]+/;
  assert(evidencePattern.test(text));
  text = text.replace(evidencePattern, evidence);
  text = text.replace('[本轮同v30组合旅程]', '[此前同v30组合旅程]')
    .replace('：现行恢复点45°手动/21:00/revision3；', '：当轮恢复点45°手动/21:00/revision3；');
  if (name === 'PLAN.md') {
    text = text.replace('当前45°手动/正式示例点/21:00/revision3/DAY标准字号', '当前4.6°手动/Vega定位/正式示例点/21:00/revision3/DAY标准字号');
    const dependency = /^4\. \*\*唯一下一依赖：[^\n]+/m;
    assert(dependency.test(text));
    text = text.replace(dependency, '4. **唯一下一依赖：补充参照下的选择/倍率语义与整场差距。** 用户两条原文及八原图见[记录](USER-UPDATES.md)和[参考](evidence/reference-user-stellarium-2026-09-29/README.md)。先以现有身份、已绘帧、资料/定位/跟踪owner核对持续选中十字/面状圆、名称渐淡/恢复、呼吸、切换与空白失焦，区分关闭资料和来源Back；共享星等/显示/拾取随后核光晕、亮星星芒及未解析光斑门槛，不逐对象复制。星座已在25–40°有广端渐显，但当前很小视场仍保持全量插画/连线/名，核对用户的局部渐淡/反向恢复并复用唯一显示责任；深空标识与注册纹理分别核查，不能靠统一隐藏影像完成。运动按相同时间速率下的投影放大核实，1.7°不成阈值，不另建私有观察时钟/逐帧写BFF；固定所选时刻保持稳定。当前BSC/SAO正常分层/离标记点选/回程已有75事件开发证据，不重复星表获取或正常同一往返；晚到瓦片、真实失败恢复、原生解码/GPU仍按机制补验，正常200/304和已到达截图不替代。原生普通名称/dock/modal合成、整场配准覆盖、银河/W3/M42条带/饱和及M63原红条带仍归原owner，不能由参考未匹配画面认证。只改确需的Sky职责，大字号暂停/标准字号有效，不处理其它业务；手机不可用继续独立工作，目标资源/姿态/校准/OS后台/Android/iOS/最终旅程均保。');
    text = text.replace(/^当前运行：[^\n]+/m, '当前运行：分支codex/remote-main-20260908/HEAD7898962b保持，无提交/推送/切换；唯一v30/PID25916、SHA bbc5f610…/106生产输入。正式示例点/2026-09-29 21:00/观测夜09-29/UTC13:00/revision3、Context SHA893b8fd5…/fingerprint0bb96485…，4.6°手动/Vega定位/DAY标准字号，无跟踪/modal/list/choices/timepanel，星座/地景/地平ON、W3/赤道OFF。8789/PID22124/exec54820保内存；8791/PID4924/exec17379/controller64485/epoch09:14:20.175Z、PUT4均200、totalObserved508含探针，pass/pass/pass/settled/held-active0，共享8787/8788未动。75事件/九原图与此前82事件/12原图各自冻结；地图CSS SHA81283f7b…保持、v27未采用。当前下一依赖见阶段4。');
    const row = '| 原始参考体验/用户结果 | 已批准商业取舍 | 当前实现与适用证据 | 实际差距 | 完成条件 |';
    const separator = '| --- | --- | --- | --- | --- |';
    assert(text.includes(row + '\r\n' + separator) || text.includes(row + '\n' + separator));
    text = text.replace(separator, separator + '\n| 2026-09-29补充：持续选择、星光/可点选门槛、局部面状淡化、放大后的时间位移 | 八图为显示/行为参考，Gaia/DSS排除不变；真实星等/缺测/颜色与当前Context仍有效 | 本代BSC/SAO正常显隐和离标记自然点选/回程已有真实开发证据；现有共享星座广端渐显/星点Gaussian复用 | 选择与资料尚未分开；固定定位环无呼吸/名称LOD，亮星无星芒，局部星座未淡化；延迟到达/失败、连续时间/跟踪对照及目标合成未验 | 同一已绘帧和真实身份下完成选中/切换/空白失焦/关闭资料与Back；连续可逆淡化，恒星可见与可拾取职责一致，运动随投影和单一时间责任，无硬编码1.7°启动 |');
  }
  await fs.writeFile(file, text);
  console.log('Updated Sky task documentation: ' + name);
}
