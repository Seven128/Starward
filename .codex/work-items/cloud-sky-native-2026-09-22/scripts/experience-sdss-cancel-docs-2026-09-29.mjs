import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const v=JSON.parse(await fs.readFile(task+'/evidence/experience-sdss-cancel-native-validation-2026-09-29.json','utf8'));
assert.equal(v.trace.frozen,true);assert.equal(v.delay.canceled.controlledResourceOutcome,'downstream-cancel');
const report='evidence/experience-sdss-cancel-2026-09-29.md';
const head=`**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。唯一v29/PID25916、候选SHAe5e2baaf4feab03c82ad8dc8bd8faa657e995207fe38a338d744630b6bea75b5、257文件/4,486,805rawB及106生产输入保持，本轮无产品改码/构建。前轮共享GPU重试标志修复及M82重复503保中档证据保留；本轮M81三级/释放/缓存与M63真实细图正文延迟→公开缩小倍率16,779.7ms取消→再次放大完整200/native摘要/细层绘制→自然点选/绑定来源Back已核。当前公共示例点、民用2026-09-29 19:00 Asia/Shanghai、观测夜09-29/UTC11:00/revision3，M63中心0.05°手动，DAY/标准字号，4082亮星目录对象/3目标；同v29 Context ID摘要/fingerprint保持。无跟踪/modal/list/timepanel，星座/地景/地平ON，W3/赤道OFF。M63可见有限切图边界、整场质量/配准覆盖/控件合成、原生解码/GPU、Android/iOS/新版月面手机/真实姿态/OS后台、目标性能/官方包体/费用与最终必要审查仍开放。**

**恢复与证据：** [SDSS正文取消与恢复](${report})及[冻结绑定](evidence/experience-sdss-cancel-native-validation-2026-09-29.json)是最新入口。本轮取消回中档与来源Back各0像素差；同0.05°延迟画面到实际细图恢复329,290像素改变，native MD5对应出版。M81再次进入为immutable HTTP缓存，不冒称网络取消；真正取消是M63的请求174，恢复175。83事件/8原图已冻结且全部看过，SDK3.17.4、同候选裁切比较。前轮[共享重试修复](evidence/experience-sdss-image-recovery-2026-09-29.md)及v28/v29的48/75事件、17图保持原范围；历史银河和更早证据不跨代升级。Context SHAc5c224f7…/fingerprintc197391c…现在revision3/19:00，不借旧05:00帧；8791/PID4924/exec17379保8789，controller64485/epoch09:14:20.175Z/current PUT2([200,200])，本轮第二次是19:00提交。source/context/resource pass、settled、held/active0、totalObserved180。其它模块/地图CSS保持；一次授权审查已结束，不复派，最终必要审查仍保。`;

function replaceOne(text,pattern,replacement,label){
 assert(pattern.test(text),label);return text.replace(pattern,replacement);
}
let plan=await fs.readFile(task+'/PLAN.md','utf8');
assert(!plan.includes('请求174，恢复175'),'Refuse to rerun this checkpoint writer');
plan=replaceOne(plan,/\*\*当前：[\s\S]*?(?=\r?\n\r?\n\*\*范围与责任)/,head,'current head');
plan=replaceOne(plan,/1\. \*\*固定基线[^\r\n]*/,
 '1. **固定基线：仍为同一v29，历史证据保范围。** 前轮九个Sky owner的共享重试修复及r2构建保持，106生产输入/候选指纹重新绑定，本轮无产品改码和构建。其它分包/地图CSS不变，v27未采用。唯一PID25916，公共示例点/当日19:00/观测夜09-29/revision3，M63中心0.05°、DAY/标准字号；与本轮起始v29的Context ID摘要/fingerprint相同，时刻由公开控件从次日05:00改为当日19:00。8791保8789/current epoch PUT2，与旧epoch/v28分记。干净loopback候选不推手机。','baseline');
plan=replaceOne(plan,/4\. \*\*唯一下一依赖：[\s\S]*?(?=\r?\n\r?\n5\. \*\*)/,
 '4. **唯一下一依赖：B3/C整场质量、切图边界/配准覆盖及未验机制。** 修改只限Sky职责，共享文件只处理确需的Sky行为，不顺带修改其它业务。大字号暂停、标准字号/长来源保留；地图CSS保持、v27未采用。前轮SDSS M82重复503/保中档/公开恢复及共享GPU重试标志修复保留；本轮同v29已完成M81三级/释放与M63真实SDSS正文延迟/公开缩小倍率取消/再次放大恢复/native摘要/实际细层作用/自然点选/绑定来源Back开发证据。M81不可变缓存命中与M63真实取消分清，不重复已闭合的同一网络案例。下一步使用已存原图、实际视场与共享影像绘制owner核M63可见有限切图边界，区分真实源结构、有限覆盖边界与显示接缝，再决定必要的共享渐进合成修复；不能只扩大淡出、隐藏对象或伪造mask。继续真实配准/覆盖/整场辨认，原生解码/GPU故障及其它模式按机制/风险闭合，不把正常HTTP恢复升级为它们已过。银河v28因果/平滑与全天/红光适用证据保原，M42有限条带/饱和、M63总览源红条带和W3源块状条带归原owner，不重做月面/HiPS获取加工。普通控件/名称/modal是Canvas-only捕获缺口；只有新目标/捕获依据才重开实际合成定位，不重复样式/安装源码研究或盲改cover-view。参考须核实际相机、地点、时刻、视场定义、SDK/视口等差异；总览会转向天顶，不能仅凭目标名/FOV称匹配。目标冷启动/资源/OS后台、完整旅程、真实姿态/旋转校准/Android/iOS义务保留，手机不可用时继续独立Sky工作。','next dependency');
plan=plan.replace('其它模式/SDSS弱网取消/解码/GPU及目标组合仍待验；本轮v29 SDSS M82 HTTP503/重复重试保中档/公开恢复/来源Back另有绑定开发证据',
 '其它模式/原生解码/GPU及目标组合仍待验；v29 SDSS M82 HTTP503/重复重试保中档/公开恢复/来源Back保原，本轮同v29补M81三级/释放及M63实际正文延迟/公开缩放取消/恢复/自然点选/来源返回，M81缓存不作网络证明');
plan=plan.replace('本轮SDSS共享重试/原生HTTP重复失败与恢复有适用证据；银河v28整场/原生组合及成本证据保原范围',
 'SDSS共享重试/原生HTTP重复失败与恢复有适用证据，本轮M63真实正文取消/恢复闭合且native文件/画面/来源回程已绑定；银河v28整场/原生组合及成本证据保原范围');
plan=plan.replace('本轮v29 SDSS M82 HTTP503/重复重试保中档/公开恢复/来源Back另有绑定开发证据。源码不变',
 'v29 SDSS M82 HTTP503/重复重试保中档/公开恢复/来源Back保原，本轮M63真实正文取消/恢复/native文件/自然点选/来源返回另有绑定证据。源码不变');
plan=replaceOne(plan,/当前运行：分支[^\r\n]*/,
 '当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换。唯一v29/PID25916、候选指纹e5e2baaf…/106生产输入不变，本轮无产品改码/新构建。M63中心0.05°手动、公共示例点/2026-09-29 19:00/观测夜09-29/UTC11:00/revision3，Context SHAc5c224f7…/fingerprintc197391c…；DAY/标准字号，无跟踪/modal/list/timepanel，星座/地景/地平ON，W3/赤道OFF。8789/PID22124/exec54820保内存；8791/PID4924/exec17379/controller64485/epoch09:14:20.175Z/current PUT2([200,200])，source/context/resource pass、settled、held/active0、totalObserved180。旧epoch/v28分记，共享8787/8788未动。本轮83事件/8原图已冻结，取消回中档/来源Back星图区各0差，细档恢复有实际画面作用；前轮48/75事件与历史银河/更早组合保范围。地图CSS SHA81283f7b…保持，v27未采用。下一依赖见阶段4。','running state');
for(const token of ['DSS营利使用需书面许可','当前Gaia DR3/EDR3','PS1/SkyMapper自托管加工分发未闭合','全部33项义务','P1目标设备','P5独立审查'])
 assert(plan.includes(token),token);
await fs.writeFile(task+'/PLAN.md',plan);
for(const file of ['STATE.md','INDEX.md']){
 let source=await fs.readFile(task+'/'+file,'utf8');
 source=replaceOne(source,/\*\*当前：[\s\S]*?(?=\r?\n\r?\n\*\*范围与责任)/,head,file+' head');
 source=replaceOne(source,/(## 当前入口\r?\n\r?\n)[^\r\n]+/,
 '$1[当前v29 SDSS正文取消/恢复]('+report+')和[冻结绑定](evidence/experience-sdss-cancel-native-validation-2026-09-29.json)是最新开发入口；此前共享重试/银河/整场证据保原范围，唯一下一依赖由PLAN阶段4维护。当前M63/当日19:00/revision3恢复点见顶部，不能沿用旧M82/次日05:00。',file+' current entry');
 await fs.writeFile(task+'/'+file,source);
}
await fs.appendFile(task+'/PROGRESS.md',`\n\n## 2026-09-29 C/D：同v29 SDSS正文延迟、公开缩放取消与恢复\n\n本轮无产品改码/新构建，v29候选指纹及106生产输入保持。M81实际三级200/native摘要/公开退出释放成立，随后immutable HTTP缓存不计网络取消。公开时间从次日05:00/revision2提交当日19:00/revision3，实际M63高度15.8°：DETAIL真实200头/正文暂停→公开缩小倍率16,779.7ms下游取消、保中档→再次放大新GET200/18,522B/native摘要与画面细层作用→自然M63点选/绑定SDSS来源/Back。取消回中档及来源Back星图区各0差；83事件/8原图已冻结、全部看过，源有限边界/未知覆盖不冒称质量通过。唯一v29/PID25916当前M63中心0.05°/当日19:00/revision3/DAY标准字号；8791原epoch/current PUT2([200,200])、source/context/resource pass、settled、held/active0、totalObserved180，保8789及共享服务。其它模块/地图CSS未改，无设备/预览/云/Git/新Agent。下一步已在唯一PLAN换为真实切图边界/配准覆盖/整场质量及未验解码/GPU等机制；全部商业理由、33义务与目标/费用/必要审查保持，Goal active、无预算、未完成。详[本轮记录](${report})。\n`);
console.log(JSON.stringify({updated:['PLAN.md','STATE.md','INDEX.md','PROGRESS.md'],scope:'Sky task only; no durable Context or product source change',next:'actual optical cutout/registration/whole-scene quality and unverified mechanisms'}));
