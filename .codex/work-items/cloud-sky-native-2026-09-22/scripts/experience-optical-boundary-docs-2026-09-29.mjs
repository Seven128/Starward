import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const read=async name=>(await fs.readFile(`${task}/${name}`,'utf8')).replaceAll('\r\n','\n');
const validation=JSON.parse(await read('evidence/experience-optical-boundary-v30-native-validation-2026-09-29.json'));
assert.equal(validation.trace.events,60);assert.equal(validation.captures.length,6);
assert.equal(validation.pixels.widerFieldReturn.changedPixels,0);assert.equal(validation.pixels.sourceReturn.changedPixels,0);
const current='**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。唯一v30/PID25916、候选SHAbbc5f610b9d15d18ba0a3553db25c78da8fe120653de60a91b3f124270d82e42、257文件/4,488,797rawB/106生产输入已重新绑定。三个Sky owner沿原两图预算、加载/注册/绘制队列加入同出版宽档承接细档外围，原图/覆盖声明与共享GPU重试保留。新版公开入口→19:00→搜索定位M63→实际SDK连续缩放/自然点选→来源Back已有本代开发证据。当前公共正式示例点、民用2026-09-29 19:00 Asia/Shanghai、观测夜09-29/UTC11:00/revision2，M63中心约0.15°手动，DAY/标准字号，4082亮星目录对象/3目标；是新Context ID摘要893b8fd5…/fingerprint0bb96485…，不借旧v29 revision3。无跟踪/modal/list/timepanel。整场辨认/实际配准覆盖/控件合成、原生解码/GPU、Android/iOS/新版月面手机/真实姿态/OS后台、目标性能/官方包体/费用与最终必要审查仍开放。**';
const recovery='**恢复与证据：** [有限光学视场与连续浏览](evidence/experience-optical-boundary-2026-09-29.md)及[v30冻结绑定](evidence/experience-optical-boundary-v30-native-validation-2026-09-29.json)是最新入口；[v29修前基线](evidence/experience-optical-boundary-baseline-2026-09-29.json)保独立版本。v30宽档往返和来源Back星图区各0差；中档外围有真实宽档作用，软件GPU细图核心保持。60事件/6原图已冻结且全部看过，SDK3.17.4；v29/v30公共点/时刻与四舍五入视场相同，但不认证精确相机等同。原参考图的8秒/另一标签及数据差异保持未匹配，未采用DSS。前轮[共享重试](evidence/experience-sdss-image-recovery-2026-09-29.md)和[正文取消](evidence/experience-sdss-cancel-2026-09-29.md)只保原v29条件，不把本轮正常200升级为故障/手机验收。8791/PID4924/exec17379保8789、controller64485/原epoch09:14:20.175Z/current PUT3([200,200,200])，source/context/resource pass、settled、held/active0、totalObserved261。地图CSS SHA81283f7b…和其它分包保持，v27未采用；一次授权审查已结束，不复派，最终必要审查仍保。';
for(const name of ['PLAN.md','STATE.md','INDEX.md']){
 let text=await read(name);const start=text.indexOf('**当前：Goal active');const end=text.indexOf('**范围与责任：**',start);
 assert(start>=0&&end>start,name);assert(text.slice(start,end).includes('唯一v29/PID25916'),`already updated ${name}`);
 text=text.slice(0,start)+current+'\n\n'+recovery+'\n\n'+text.slice(end);
 if(name==='PLAN.md'){
  const oldWindow='历史闲置及替代项目窗口已退，当前只保一个已打开v29窗口；原v28保冻结证据。';
  assert(text.includes(oldWindow));text=text.replace(oldWindow,'历史闲置及替代项目窗口已退，v29证据冻结后官方关闭，当前只保一个已打开v30窗口；旧候选保各自冻结证据。');
  function stage(number,replacement){const expression=new RegExp(`^${number}\\. \\*\\*[^\\n]+(?:\\n(?!\\n)[^\\n]*)*`,'m');assert(expression.test(text),`stage ${number}`);text=text.replace(expression,replacement);}
  stage(1,'1. **固定本代基线：v30及独立新Context。** 三个Sky owner的新渐进光学职责已接原共享链；106生产输入/候选指纹、本代公开正式点/19:00/revision2及实际缩放/点选/来源Back已绑定。v29修前原图、源码副本与旧网络故障证据冻结，不能升级为新版验收；其它分包/地图CSS保持，v27未采用。唯一PID25916，M63中心约0.15°、DAY/标准字号；8791保8789/current epoch PUT3。无诊断loopback候选不推手机。');
  stage(3,'3. **适用组合证据按候选/机制保留。** v25公开进入/识别/全天、自然点选、时间跟踪、月面、返回/非法日期恢复；v26标准字号/红光来源、跨午夜、W3/M42层级/取消/来源PARTIAL；v28银河因果/资源；v29 SDSS重复503和真实正文取消；本轮v30有限光学视场/缩放往返/自然M63点选/来源Back，分别见已有INDEX与本轮冻结绑定。源码、相同分包或工具成功不认证完整新版旅程/目标质量。v30正常200不替代旧故障机制，本轮软件GPU拒绝不冒充原生GPU故障。');
  stage(4,'4. **唯一下一依赖：整场辨认/组合稳定性、实际配准覆盖及未验机制。** 修改只限Sky职责，共享文件只处理确需的Sky行为，不顺带其它业务。大字号暂停，标准字号/长来源仍有效。有限光学细档移除真实外围的问题已用同出版宽档/原共享注册修复；不重复该因果试验或v29已闭合的同一网络案例。下一批按完整旅程组织局部→全天/星座识别→搜索定位/资料→时间/跟踪→返回，复用当前候选和真实输入，按实际差距处理名称/控件合成、图层遮挡及持续浏览稳定性；不重新逐对象下载或重造引擎。原生解码/GPU及模式差异按机制/风险验证，正常HTTP不替代它们。参考需确证实际相机/时刻/FOV定义/视口，当前M63参考8秒偏差/另一标签保未匹配，总览转天顶也不能凭目标名/FOV称配准。银河/W3、M42有限条带/饱和、M63总览原红条带与未知科学覆盖继续归原owner，源加工不自动闭合质量。普通名称/dock/modal缺实际原生合成，当前Canvas-only捕获不算通过；仅在新的目标/捕获依据可操作时定位该差距，不盲改cover-view或重复安装/样式研究。目标冷启动/资源/OS后台、完整旅程、真实姿态/旋转校准/Android/iOS仍保，手机不可用时继续独立Sky工作。');
  const run=/^当前运行：[^\n]+/m;assert(run.test(text));
  text=text.replace(run,'当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换。唯一v30/PID25916、候选指纹bbc5f610…/106生产输入已冻结，三Sky owner/四Sky检查文件变更。M63中心约0.15°手动、公共正式示例点/2026-09-29 19:00/观测夜09-29/UTC11:00/revision2，Context SHA893b8fd5…/fingerprint0bb96485…；DAY/标准字号，无跟踪/modal/list/timepanel。8789/PID22124/exec54820保内存；8791/PID4924/exec17379/controller64485/epoch09:14:20.175Z/current PUT3([200,200,200])、totalObserved261，source/context/resource pass、settled、held/active0。共享8787/8788未动。60事件/6原图冻结，宽档往返和来源Back星图区各0差；软件GPU核心/原图保持。旧候选与Context证据分代保留，地图CSS SHA81283f7b…保持、v27未采用。下一依赖见阶段4。');
  const marker='最新灰白矩形在共享红外绘制增加连续亮度透明度/边缘过渡，M31/M101/M42/M51原图实际GPU修前失败、修后边界与核心保留已核';
  assert(text.includes(marker));text=text.replace(marker,marker+'；本轮v30同出版宽档承接有限细档外围、实际队列/来源和M63连续缩放/自然点选/Back已核，本代新Context独立绑定');
 }else{
  const entry=/^\[当前v29 SDSS正文取消\/恢复\][^\n]+/m;assert(entry.test(text),name);
  text=text.replace(entry,'[当前v30有限光学视场/连续浏览](evidence/experience-optical-boundary-2026-09-29.md)和[冻结绑定](evidence/experience-optical-boundary-v30-native-validation-2026-09-29.json)是最新开发入口；v29失败/正文取消、银河及更早整场证据保原条件，唯一下一依赖由PLAN阶段4维护。当前M63约0.15°/当日19:00/新Context revision2见顶部，不沿用旧v29 revision3/0.05°。');
 }
 await fs.writeFile(`${task}/${name}`,text);
}
const progress=await read('PROGRESS.md');const heading='## 2026-09-29 C/B1/D：共享有限光学视场与v30连续浏览';assert(!progress.includes(heading));
await fs.writeFile(`${task}/PROGRESS.md`,progress.trimEnd()+'\n\n'+heading+'\n\n'+
'本轮修复细档选择丢失已出版宽档外围的实际连续浏览缺陷，沿原两图预算/native加载/球面注册/GPU及队列，宽档先绘、细档覆盖、实际可见档绑定来源；原图/科学覆盖/W3独立回退和共享GPU重试标志保留。三Sky生产owner和四Sky检查文件变更，其它业务源码/地图CSS/非Sky分包保持。修前六回归失败、修后42项/类型/构建及同真实输入完整生产软件GPU成立，细图核心/单档保持；首轮最小视场外部区域诊断假设失败原样留存，修诊断另存r2，没有改产品凑检查。详[本轮记录](evidence/experience-optical-boundary-2026-09-29.md)。\n\n'+
'固定v30/257文件/4,488,797rawB，SHA bbc5f610…、106生产输入；仅Sky JS和检查项目配置变更，主包保持。官方退v29后开唯一v30/PID25916，经公开入口/正式示例点/19:00/搜索定位M63、SDK连续缩放、自然点选与绑定来源Back；新Context revision2/ID SHA893b8fd5…/fingerprint0bb96485…不借旧v29。原生真实三个SDSS200和文件摘要对应出版，缩放至宽档再回中档、来源Back星图区各0差。60事件/6原图已冻结且全部查看；当前M63中心约0.15°手动/DAY标准字号，无modal/跟踪。8791原epoch/PUT3([200,200,200])、totalObserved261，source/context/resource pass、settled、held/active0，保8789内存及共享服务。\n\n'+
'[原生冻结绑定](evidence/experience-optical-boundary-v30-native-validation-2026-09-29.json)分开v29修前和v30新版；同公共点/时刻/四舍五入FOV不认证精确相机等同。参考暂停19:00:08/另一对象标签保未匹配，不采用DSS；Canvas-only原生捕获仍缺正常控件/modal合成。全部33义务、商业排除理由和整体旅程保持，原生解码/GPU、配准覆盖/源条纹/整场质量、Android/iOS/新月面/真实姿态校准/OS后台、资源性能/官方包体/费用/最终必要审查仍未验。本轮必要Context Sky段落更新且validate0；无手机/预览/云/Git/新Agent，不复派已结束审查。唯一PLAN清理已完成的有限边界下一步，转整场辨认/组合稳定性及未验机制；Goal active、无预算、未完成。\n');
console.log(JSON.stringify({updated:['PLAN.md','STATE.md','INDEX.md','PROGRESS.md'],scope:'Sky task state only; sole PLAN revised, history retained',trace:validation.trace}));
