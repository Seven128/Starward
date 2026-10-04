import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const load=async name=>fs.readFile(path.join(task,name),"utf8");
const oldPlan=await load("PLAN.md");
const resumeDocs=process.argv.includes("--resume-docs");
if(!resumeDocs){
await fs.writeFile(path.join(task,"PLAN-HISTORY-before-v25-2026-09-29.md"),
  "# 历史执行方案快照\n\n此文件保留 v25 恢复及审查修复前的历史事实与失效下一步，不作为当前方案。唯一当前方案仍为 PLAN.md。\n\n"+oldPlan,{flag:"wx"});
}
const current="**当前：Goal active、无预算、未完成；两项已授权工作已完成到本轮边界：官方DevTools恢复且只保留一个v25项目窗口，单次只读独立审查结束并修复两组P2。clean-v25已打开，SHA 3a1099b05ed31afc16c291b6289e6cc89ebcd9734bd6626b8b0fa76eea7ffb1d、257文件/4,484,725 rawB；91源码继承仅四owner改动，v24/v23保持。当前公开示例点/2026-09-29 21:30/revision2/45°手动、3998亮星/3目标；本代SDK组合、实际Canvas及Context/BFF/文件恢复已核，完整合成和目标验收仍未过。仅一个窗口PID25916/winId s2；任务8789内存、8791及共享8787/8788未改。真机仍不可用，新月面本代手机、Android/iOS、真实姿态/校准/OS后台、整体质量/覆盖、资源性能/首屏/官方包体/实际费用继续未验。**";
const continuity="**恢复与证据：** 用户“两件事我都授权给你做，你来做吧。不过1我已经关了”已经执行，无需再询问。旧v12精确4B夹具已释放、旧窗口退休；当前只维护固定v25，不重复下载/研究或重启路线。详[恢复、审查修复与本代组合](evidence/experience-review-repairs-native-2026-09-29.md)、[单次独立审查](evidence/experience-independent-review-2026-09-29.md)。Goal当前active；此前阻塞保历史，本次外部恢复后的工作已取得实际进展，不沿用旧阻塞判断。";
const prior="**范围与责任：** [范围/当前owner核对](evidence/experience-scope-owners-check-2026-09-29.md)保全部33项义务，商业范围和排除理由不变。原始原文、商业决策、原Goal与用户更新仍是约束；本代实现与证据不作为需求上限。历史候选/失效SDK/未答复授权和当轮下一步只保历史；当前依赖只由本PLAN维护。";
function header(text){
  const blocks=text.split(/\r?\n\r?\n/u);
  assert(/^\*\*当前(?:检查点)?：/u.test(blocks[1])&&blocks[2].startsWith("**当前恢复与授权：")&&blocks[3].startsWith("**上一轮范围/责任核对："));
  blocks.splice(1,3,current,continuity,prior);
  return blocks.join("\n\n");
}
if(!resumeDocs){
let plan=header(oldPlan);
const phaseStart=plan.indexOf("## 当前阶段与依赖顺序"),phaseEnd=plan.indexOf("## 实际外部依赖及可继续事项");
assert(phaseStart>=0&&phaseEnd>phaseStart);
const phase=[
  "## 当前阶段与依赖顺序","",
  "1. **固定基线与单窗口恢复已完成。** 官方工具已进入当前v25并核已接受Context/实际已绘Frame；旧挂起进程和v12/v24窗口已退休，4B夹具只在字节匹配时释放。当前接续为公开示例点、2026-09-29 21:30、revision2、45°手动；不复用旧SDK端口或旧手机截图。v25无诊断/夹具/代次/vConsole/maps，本机8791代理保8789原内存及共享服务。见[本代记录](evidence/experience-review-repairs-native-2026-09-29.md)及[冻结候选](evidence/experience-combined-clean-v25-candidate-2026-09-29.json)。","",
  "2. **既有模块保留，独立审查的两项实际错误已修。** 共享绘制/拾取保半露日月行星盘面身份，并防隐藏中心18px容差误选空天空；report就绪owner复用精确太阳/观察帧，不因外部星表或旧建议失败关闭独立有效天空的拖动/缩放/点选。两个页面消费者迁移，正常点/土星环/失败恢复及过期/错时/重复/无效帧继续保持。一次只读[独立审查](evidence/experience-independent-review-2026-09-29.md)结束，最终九实际文件61/61、类型/构建exit0；原构建警告及性能尾延迟/全天恶化记录不隐藏。审查证据只闭合当前范围，不替代交付验收。","",
  "3. **本代组合已取得开发观察，按未验差距接续。** 公开进入/手动、45°→25°天琴座识别→274.9°全天双网格→27.3°局部与Vega自然点选，中文搜索/定位/资料/独立来源Back，公共时间/跟踪到21:30与新鲜BFF同Context/revision2，月球1.5°新覆盖率版实际绘制/盘面拾取/来源Back，Map返回0编码文件及同点时重进/重新解码均已核。Vega/月面来源回程实际星图区0像素差，网格开关有实际像素作用；这不认证完整控件合成、手机双指、全部模式/弱网组合或质量。无效2026-02-31 route的错误面/Canvas0及公开恢复已观察，仍不外推全部输入。输入和输出条件、工具失败/命名差异分别保留在本代记录，不重复这些正常动作充验收数量。","",
  "4. **唯一下一依赖：继续整体呈现与剩余组合，使用同一候选和owner。** 先核官方模拟器星空截图缺普通控件/名称/弹层合成的来源，区分捕获层、模拟器限制与产品实际呈现；selector/ARIA/style不能替代可见/可触证明，没有实证不推倒UI。集中补普通/红光、图层开关与来源、粗细加载/故障恢复、拥挤/可读性和稳定性组合；已通过模块只在新变化、故障或具体未解风险时重测。无法获得有效合成证据时保该缺口，继续同阶段B3/C整场构成、其它配准/源质量与合法覆盖的实际差距；不重做月面/已取源下载、共享网格profile、行星点软轮廓或已闭合HTTP/来源回归。真实姿态/完整校准/OS后台和Android/iOS依目标设备，不能再调用已确认不支持的方向mock路径。","",
  "5. **交付闭合仍按全部有效义务。** 对照原始要求/商业取舍/当前模块结果与证据，完成干净候选、目标组合/稳定性、首屏/资源峰值/官方包体和实际费用，必要审查跟随最终实际范围。既有BSC/SAO、88星座、日月七行星、C源缺测版本/加载/来源、六光学目标、共享Context/相机/资源/资料/返回均保原职责与历史适用证据；当前51深空/六光学目标或本代样例不是需求上限。AGENTS、REQUIREMENTS和商业排除仍控制交付，不因本地检查成功缩减。","",
  "每一步覆盖成功、相关失败恢复及真实消费者。日月球面/相位/图片/GPU/目录/共享交互保持统一owner，只处理真实差异；精修按整体影响排序，不让单体纹理无限占据主线。源码与目标验收分开，原参考时区/地点/FOV定义/视口/曝光差异保留。","",
].join("\n")+"\n";
plan=plan.slice(0,phaseStart)+phase+plan.slice(phaseEnd);
const p5=/^- \*\*P5独立审查\*\*：[^\n]*/mu;
assert(p5.test(plan));
plan=plan.replace(p5,"- **P5独立审查**：本次用户授权的只读审查已完成；原v24两组P2已修且绑定v25，完整原文/Context/共享owner/实际输出和最终日志有适用审查证据。V07在本轮范围有独立证据，目标合成/手机/整体质量和最终变化的必要交付审查仍不由此认证。无需再等本次授权或复派同一审查。");
const recoveryStart=plan.indexOf("恢复状态：分支"),recoveryEnd=plan.indexOf("## 责任与完成记录",recoveryStart);
assert(recoveryStart>=0&&recoveryEnd>recoveryStart);
plan=plan.slice(0,recoveryStart)+"当前运行：分支codex/remote-main-20260908、HEAD7898962b不变，无提交/推送/分支切换。v25 PID25916/winId s2，最后有效Sky为公开示例点/21:30/revision2/45°手动；最后编码3份/4,874,512B不是内存。owned8789 PID22124/exec54820、8791 PID19616/exec15154、内部公开controller54424保原进程；context/resource pass、PUT1、held/active0；共享8787/8788未改。本轮正式工具恢复及旧夹具退休已完成，不再执行失效请求、提权或旧v12重试；历史限制与原始范围看本轮记录和PROGRESS。\n\n"+plan.slice(recoveryEnd);
const oldTail=plan.indexOf("当前恢复补充：历史准备");
assert(oldTail>=0);
plan=plan.slice(0,oldTail)+"历史准备候选、失效会话、研究及各轮开发证据归[INDEX](INDEX.md)和[本次前历史快照](PLAN-HISTORY-before-v25-2026-09-29.md)；不驱动新的下一步。完整旧纠偏前文仍保原快照，不另建竞争计划。\n";
plan=plan.replace("按用户要求，历史闲置窗口及v1至v11替代窗口均已退；最后可靠原生仍是clean-v12；最新准备候选为尚未打开的clean-v24。构建/证据和共享8787/8788保留，任务8789保内存，必要8791已按本轮运行记录接新版公开出版；不以操作系统子进程数量当项目窗口数。SDK当前失去响应，恢复必须核实际候选/页面，而不能仅凭端口或CLI成功。",
  "按用户要求，历史闲置及替代项目窗口已退，本轮只保留已打开v25。构建/证据和共享8787/8788保留；8789保内存，8791按已记录公开出版运行。实际候选/Frame/Context已绑定，不以CLI成功或子进程数量代替产品与窗口事实。");
plan=plan.replace("非法路由日期空屏已作代码守卫/修前失败回归，实际恢复界面待本代核","非法日期守卫/修前失败回归保留，v25有界route测试已核实际错误面/Canvas0及公开恢复，全部入口与手机仍待验");
plan=plan.replace("当前是干净开发候选；本轮D实际网络/暖缓存/取消有DevTools证据，启动归属已有本代证据，重启后重绘与当前绑定仍待核","当前是固定v25开发候选；历史D网络/暖缓存/取消保适用证据，本代启动/实际新月面绘制、来源回程及Map文件释放/重进重绘有当前绑定，完整目标冷启动与资源仍待验");
await fs.writeFile(path.join(task,"PLAN.md"),plan);
}else{
 assert(oldPlan.includes(current)&&oldPlan.includes(continuity)&&oldPlan.includes(prior));
}
for(const name of ["STATE.md","INDEX.md"]){
 let text=header(await load(name));
 if(name==="INDEX.md")text=text.replace("按用户指令，闲置历史窗口及v1至v11替代窗均已退，本轮只维护clean-v12；SDK当前失去响应须按STATE核真实会话。历史文件及共享8787/8788、owned8789内存保留；必要8791的最新替换见运行接入记录。",
  "按用户指令，闲置及历史替代窗口均已退，当前只维护已打开v25。当前运行与下一依赖看PLAN；历史候选/SDK失效记录保原范围，不能覆盖本代状态。共享8787/8788、owned8789内存及8791保原进程。");
 const entry="[本代单窗口恢复/两项共享修复/组合观察](evidence/experience-review-repairs-native-2026-09-29.md)及[一次独立审查](evidence/experience-independent-review-2026-09-29.md)：固定v25、当前Frame/Context、实际星场/月面来源Back、网格作用、公共时间跟踪、Map释放/重进和非法日期恢复。全部目标/质量/费用未验边界保留；唯一下一依赖看PLAN。\n\n以下旧候选与恢复记录保留其历史条件，不覆盖本页起首的当前状态，不驱动新的下一步。\n\n";
 const anchor=text.indexOf("\n\n",text.indexOf(prior))+2;
 assert(anchor>1);text=text.slice(0,anchor)+entry+text.slice(anchor);
 await fs.writeFile(path.join(task,name),text);
}
await fs.appendFile(path.join(task,"PROGRESS.md"),"\n\n## 2026-09-29 用户授权后单窗口恢复、审查修复及v25组合\n\n"+current+"\n\n"+continuity+"\n\n保全部33项义务/商业排除和有效原因；正常共享路线延续，不重下载/重研究、不切分支、不提交/推送或发布。只读独立审查已结束，两组P2修前失败/共享修复/九实际文件61项检查和类型构建均保证据。本代公开入口、识别/全天、自然点选、来源Back、时间跟踪、月面、Map释放/重进和无效日期恢复分别核实际输出与状态；仍缺原生控件合成/真实手机及完整质量/性能/费用。旧v12未知/被拒提权、旧v24prepared和未答复授权属于历史，本轮不再驱动。当前运行/依赖仅见更新后的PLAN，完整前版另存历史快照。\n");
console.log("Updated the single PLAN, STATE, INDEX and PROGRESS; historical phase retained separately.");
