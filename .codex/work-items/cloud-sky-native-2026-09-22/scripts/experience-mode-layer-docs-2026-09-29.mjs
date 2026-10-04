import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const report="evidence/experience-mode-layer-native-2026-09-29.md";
await fs.access(path.join(task,report));
const record=JSON.parse(await fs.readFile(path.join(task,"evidence/experience-mode-layer-validation-2026-09-29.json"),"utf8"));
assert.equal(record.runtime.mode,"DAY");assert.equal(record.runtime.held,0);
const headline="**当前：Goal active、无预算、未完成；同一单窗口clean-v26/SHA510d269337407b659cd764d7bdcbbb6e1479872e83e3a54bfa99ad10ef485421、257文件/4,485,078 rawB、main2,089,891B。共享来源修复保留，本轮普通DAY/红光、W3意愿/双网格、红光来源完整换行/复制/Back及M31真实细图延迟→取消→模式→重新载入有本代证据；99源码及旧测试输入未改，没有重建候选。当前公开示例点/2026-09-29 21:00/revision1/M31定位视角12.1°手动、4039亮星/3目标，无跟踪/弹层；五图层意愿ON，W3于当前小视场不绘制。PID25916/原winId s3，只一个窗口，服务未替换，context/resource pass、held/active0。完整合成仍缺证据；原33项义务、Android/iOS/新版月面手机、真实姿态校准/OS后台、其它模式/大字/消费者、B3/C整体质量/覆盖、目标性能/官方包体/实际费用及必要最终审查继续未完成。**";
const evidence="**恢复与证据：** 用户授权的工具恢复和单次只读独立审查已在v25完成，两组P2共享修复保留。v26共享来源裁切修复见[来源修复](evidence/experience-source-readability-native-2026-09-29.md)，本轮同代[模式/图层/来源/加载取消]("+report+")及[绑定与像素统计](evidence/experience-mode-layer-validation-2026-09-29.json)追加适用证据；[候选准备记录](evidence/experience-combined-clean-v26-candidate-2026-09-29.json)不改。21:00/revision1不冒称旧21:30；本轮延迟是200正文、取消发生于隐藏，不冒称503/GPU/OS后台验收。v25/v24原包及各自证据保范围，无需重询两项授权或复派审查。";
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
 const file=path.join(task,name);let text=await fs.readFile(file,"utf8");
 const current=text.match(/^\*\*当前：[^\n]+/mu)?.[0];assert(current,name+" current header");
 assert(current.includes("45°手动"),"preserve previously updated docs: "+name);
 text=text.replace(current,headline);
 const previous=text.match(/^\*\*恢复与证据：[^\n]+/mu)?.[0];assert(previous,name+" evidence header");text=text.replace(previous,evidence);
 if(name==="PLAN.md"){
  const replacements=[
   ["正常模式换行/复制/返回", "DAY正常模式换行/复制/返回；同代红光已补实际可读性/复制/来源Back"],
   ["当前公开示例点、21:00/revision1、45°手动", "当前公开示例点、21:00/revision1、M31定位视角12.1°手动"],
   ["最后45°/21:00/revision1。v26未采来源回程前星场，不编造像素0差；完整模式/弱网/目标组合仍待验。", "前轮最后45°/21:00/revision1的来源证据没有回程前星场，不编造旧像素0差；本轮82.4°红光来源另采前后原图，按实际胶囊裁切为0差。普通/红光W3、双网格、真实细图延迟取消及恢复有本代结果，最后M31定位视角12.1°/同Context；其它模式/弱网机制与目标组合仍待验。"],
   ["本代启动/实际新月面绘制、来源回程及Map文件释放/重进重绘有当前绑定", "v25启动/新月面绘制、来源回程及Map文件释放/重进重绘保旧绑定；v26来源与模式/真实细图延迟取消恢复有本代绑定"],
   ["公开示例点/21:00/revision1/45°手动，无跟踪/弹层", "公开示例点/21:00/revision1/M31定位视角12.1°手动，无跟踪/弹层；星座/地景/W3/地平/赤道意愿ON，W3在当前小视场不绘制"],
  ];
  for(const [before,after]of replacements){assert(text.includes(before),before);text=text.replace(before,after);}
  const phase=text.match(/^4\. \*\*唯一下一依赖：[^\n]+/mu)?.[0];assert(phase);
  text=text.replace(phase,"4. **唯一下一依赖：B3/C同代实际差距与尚未覆盖的失败组合。** 本轮DAY/红光、W3意愿与实际绘制、双网格、红光来源及M31真实细图延迟取消恢复已核，不重复正常动作。先在公开地点/时刻与本代原生输出核M42的v3缺测影像、星座/地景组合和资料来源partial/恢复；已有完整FITS/PNG/出版不重下载、不重建研究。根据实际错误归owner，再继续整场模拟环境、银河/其它合法影像、真实配准/覆盖与拥挤/大字/消费者质量；本轮M31无矩形不认证其它对象。Canvas-only截图合成仍无确定归因，保控件/名称/弹层可见与可触缺口，只有新捕获或运行依据再处理，不重复同样式/安装源码研究或盲改cover-view。真正HTTP错误、解码/GPU恢复及其模式组合缺本代证据，已有适用旧证据保留；真实姿态/完整校准/OS后台与Android/iOS仍依目标设备，不调用不支持的方向mock。");
  text=text.replace("v26已走公开新入口、月球资料/可读来源/实际复制/Back同Context与选择，", "v26已走公开新入口、月球资料/可读来源/实际复制/Back同Context与选择，本轮又补普通/红光与M31加载取消恢复，");
  text=text.replace("当前公开示例点/2026-09-29 21:00/revision1/45°手动", "当前公开示例点/2026-09-29 21:00/revision1/M31定位视角12.1°手动");
 }
 await fs.writeFile(file,text);
}
const progress=path.join(task,"PROGRESS.md");
let progressText=await fs.readFile(progress,"utf8");
assert(progressText.startsWith("# 执行记录与证据入口"));
const entry="\n\n## 2026-09-29 B1/B3/B4/C：固定v26模式、来源与真实加载取消组合\n\n同一v26与99源码/旧测试输入保持，单窗口/原服务未替换。通过实际设置控件和公开Back核DAY/红光、82.4°W3意愿/绘制、双网格及红光长来源换行/实际复制/返回；本代红光来源回程星图区0差。M31粗图保留于一次真实DETAIL200正文延迟，页面隐藏在12,428.3ms取消；红光隐藏、再切DAY新请求200/41,153B及实际细图恢复成立，Context仍21:00/revision1。不是503、GPU故障、OS后台或手机验收。M31 12.1°视场的暗纹随星座插画开关消失，星系影像仍在；地景/广角W3不能去掉它，该对象无旧矩形不认证全部C质量。回程6像素/最大1通道差如实保留，不发明目标容差。详[本轮原生记录]("+report+")与[固定输入/原图统计](evidence/experience-mode-layer-validation-2026-09-29.json)。\n\nGoal active、无预算、未完成；最后同代M31视角12.1°/21:00/revision1/普通DAY，五图层意愿ON、无跟踪/弹层，resource/context pass及held/active0。19原图/71事件只是证据导航；无产品代码修改、新构建、手机/云动作或重复独立审查。全部原范围、商业理由、整体/目标/性能/费用义务保持，当前唯一下一依赖仅PLAN；以下为历史过程记录。\n";
progressText=progressText.replace(/^# 执行记录与证据入口\r?\n/u,"# 执行记录与证据入口"+entry+"\n");
await fs.writeFile(progress,progressText);
const context="project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md";
let contextText=await fs.readFile(context,"utf8");
const before="当前月球来源页有正常模式原生换行/复制/返回观察，其它模式、大字和消费者组合仍需相应实际输出。";
assert(contextText.includes(before));
contextText=contextText.replace(before,"当前月球来源页有DAY与OBSERVATION模式的原生换行/复制/返回观察，其它显示模式、大字、其它消费者及目标手机组合仍需相应实际输出。");
await fs.writeFile(context,contextText);
console.log(JSON.stringify({updated:["PLAN.md","STATE.md","INDEX.md","PROGRESS.md",context],scope:"Existing unique Plan and owners only; no goal or product scope change"}));
