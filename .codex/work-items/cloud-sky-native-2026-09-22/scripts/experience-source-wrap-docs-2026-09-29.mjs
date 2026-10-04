import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const task=".codex/work-items/cloud-sky-native-2026-09-22";
const current="**当前：Goal active、无预算、未完成；当前单窗口clean-v26已打开，SHA510d269337407b659cd764d7bdcbbb6e1479872e83e3a54bfa99ad10ef485421、257文件/4,485,078 rawB、main2,089,891B。共享来源署名/网址裁切已修，本代实际换行、完整内容、复制及来源Back已核；99源码绑定含91继承源码未改，v25/v24原包保留。当前公开示例点/2026-09-29 21:00/revision1/45°手动、4039亮星/3目标，无跟踪/弹层；PID25916/winId s3，只一个窗口，服务未替换。完整合成仍缺证据；原33项义务、手机/新月面本代手机、Android/iOS、姿态校准/后台、模式/大字/消费者组合、整体质量/覆盖、资源性能/首屏/官方包体/实际费用继续未完成。**";
const continuity="**恢复与证据：** 用户授权的工具恢复和单次只读独立审查已在v25完成，两组P2修复保留；本轮使用同一共享owner修正实际来源可读性，详[来源修复与v26原生观察](evidence/experience-source-readability-native-2026-09-29.md)及[冻结候选](evidence/experience-combined-clean-v26-candidate-2026-09-29.json)。新项目公开入口为21:00/revision1，不冒称继承v25的21:30/revision2；v25完整组合/独立审查保各自范围。无需重询两项授权，不复用旧SDK/手机，不重做已闭合下载/研究。";
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
 const file=path.join(task,name),text=await fs.readFile(file,"utf8"),blocks=text.split(/\r?\n\r?\n/u);
 assert(blocks[1].startsWith("**当前：")&&blocks[1].includes("clean-v25已打开"),name);
 assert(blocks[2].startsWith("**恢复与证据："),name);
 blocks[1]=current;blocks[2]=continuity;
 let next=blocks.join("\n\n");
 if(name==="PLAN.md"){
  const start=next.indexOf("## 当前阶段与依赖顺序"),end=next.indexOf("## 实际外部依赖及可继续事项");assert(start>=0&&end>start);
  const phase=[
   "## 当前阶段与依赖顺序","",
   "1. **固定基线：v26当前，v25证据保范围。** 工具/旧4B夹具恢复已完成。v26只有共享来源TSX/SCSS变化，99源码绑定含原91未改、九份Sky测试保持；v25/v24包未改。当前公开示例点、21:00/revision1、45°手动，单窗s3/PID25916。新项目不冒称承接旧21:30时刻或已做跨候选目标验收。无诊断/夹具/代次/vConsole/maps，本机8791保原8789内存及共享服务。","",
   "2. **共享模块与独立审查修复保留。** v25半露日月行星盘面身份/隐藏中心空射线容差，独立有效太阳/观察帧被目录/旧建议禁触摸的两组P2已修；一次只读独立审查完成，九实际文件61/61及类型/构建保原记录。v26来源局部修复复用SourceAttribution/SoftButton/Provenance，完整原文、URL、去重、复制及失败恢复不改；四相关行为、类型/构建已过，有实际正常模式换行/复制/返回。此修复不需要另开并行计划或新选型，最终变化必要审查仍保。","",
   "3. **适用组合证据不跨代升级。** v25公开进入、识别/全天/局部、Vega自然点选、搜索资料/来源Back、时间跟踪21:30与BFF、月面1.5°/来源、Map释放/重进及非法日期恢复保原条件。v26已走公开新入口、月球资料/可读来源/实际复制/Back同Context与选择，最后45°/21:00/revision1。v26未采来源回程前星场，不编造像素0差；完整模式/弱网/目标组合仍待验。源码不变和分包字节相同不认证完整新版目标验收。","",
   "4. **唯一下一依赖：继续模式/图层/加载失败和可读性组合，并推进B3/C实际差距。** 当前星空Canvas-only截图合成有界核查无确定归因，保控件/名称/弹层可见与可触缺口；出现新的可用捕获或运行依据再处理，不重复相同样式/selector/安装源码研究，也不盲目改cover-view/z-index。集中普通/红光、图层意愿/实际来源、粗细加载故障、拥挤/大字及稳定性；已过正常动作只在变化/故障/具体风险下重测。继续整场模拟环境/银河/其它配准和合法覆盖质量的实际差距，不重做月面下载、已闭合源研究/网格profile/点软轮廓。真实姿态/完整校准/OS后台与Android/iOS依目标设备，不再调用不支持的方向mock。","",
   "5. **交付闭合保全范围。** 按原始参考体验/商业取舍/当前模块证据完成干净候选、目标旅程/稳定性、首屏/资源峰值/官方包体/实际费用与必要审查。BSC/SAO、88星座、日月七行星、版本化源/缺测/来源、银河/环境及共享Context/相机/资料/返回均保有效义务。当前51深空/六光学目标或局部来源修复不是需求上限。构建警告、全天与尾延迟恶化不隐藏，开发证据和目标验收分开。","",
   "日月球面/相位/图片/GPU/目录/交互保持共享owner，只处理真实差异。每步覆盖成功、相关失败恢复和实际消费者；精修按整体影响排序。参考地点/时区/FOV定义/视口/曝光差异保留。","",
  ].join("\n")+"\n";
  next=next.slice(0,start)+phase+next.slice(end);
  const runningStart=next.indexOf("当前运行：分支"),runningEnd=next.indexOf("## 责任与完成记录",runningStart);assert(runningStart>=0&&runningEnd>runningStart);
  next=next.slice(0,runningStart)+"当前运行：分支codex/remote-main-20260908、HEAD7898962b不变，无提交/推送/切换。v26 PID25916/winId s3，公开示例点/21:00/revision1/45°手动，无跟踪/弹层。任务8789 PID22124/exec54820保内存、8791 PID19616/exec15154及内部公开controller54424未替换；context/resource pass、PUT1、held/active0，共享8787/8788未动。v25旧3份/4,874,512B仅保旧编码文件观察，不写成本代内存；当前依赖仅见上方阶段。\n\n"+next.slice(runningEnd);
  next=next.replace("本轮只保留已打开v25","当前只保留已打开v26");
  next=next.replace("当前是固定v25开发候选","当前是固定v26开发候选，v25组合证据保其范围");
  next=next.replace("v25织女星/月球搜索定位、自然点选、来源Back已核实际Canvas与状态；","v25织女星/月球搜索定位、自然点选、来源Back已核实际Canvas与状态；v26共享来源完整换行/复制/Back同Context与选择已核，普通星空合成仍未验；");
 }
 if(name==="INDEX.md")next=next.replace("当前只维护已打开v25","当前只维护已打开v26");
 await fs.writeFile(file,next);
}
const progressFile=path.join(task,"PROGRESS.md"),progress=await fs.readFile(progressFile,"utf8");
const heading="## 2026-09-29 来源可读性共享修复与v26接续";assert(!progress.includes(heading));
await fs.appendFile(progressFile,"\n\n"+heading+"\n\n"+current+"\n\n"+continuity+"\n\n上一Goal turn为progress，本轮亦有实际差距、共享修复和目标运行证据。Canvas-only合成核查尚无确定归因，保缺口并转可继续组合，不把同样工具/样式重查当验收。所有33项义务、商业排除及完整原因不变；手机仍不可用，Goal不完成、不阻塞其余独立开发。\n");
console.log("Updated the existing PLAN, STATE, INDEX and PROGRESS; all requirements and historical evidence scopes retained.");
