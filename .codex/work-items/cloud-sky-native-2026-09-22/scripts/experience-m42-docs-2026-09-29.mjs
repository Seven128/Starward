import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const report="evidence/experience-m42-native-2026-09-29.md";
await fs.access(path.join(task,report));
const validation=JSON.parse(await fs.readFile(path.join(task,"evidence/experience-m42-validation-2026-09-29.json"),"utf8"));
assert.equal(validation.context.after.revision,2);assert.equal(validation.runtime.puts,2);
assert.equal(validation.runtime.held,0);assert.equal(validation.runtime.active,0);
const headline="**当前：Goal active、无预算、未完成；同一单窗口clean-v26/SHA510d269337407b659cd764d7bdcbbb6e1479872e83e3a54bfa99ad10ef485421、257文件/4,485,078 rawB、main2,089,891B。原共享修复及模式/加载取消证据保留，本轮公共跨午夜提交、M42新版三档实际PNG/点选/绑定来源、未知版本PARTIAL/条件重试/返回正常版本、整场地景与W3开关已有本代开发证据；99源码及旧测试输入未改，没有重建候选。当前公开示例点/民用日期2026-09-30 05:00 Asia/Shanghai、观测夜2026-09-29/revision2/M42中心43.3°手动、4208亮星/3目标，无跟踪/弹层；五图层意愿ON，W3于当前小视场不绘制。PID25916/原winId s3，只一个窗口，服务未替换，context/resource pass、PUT2、held/active0。M42有限条带/饱和与W3原图块状条带保质量缺口，完整合成仍缺证据；原33项义务、Android/iOS/新版月面手机、真实姿态校准/OS后台、其它模式/大字/消费者、B3/C整体质量/覆盖、目标性能/官方包体/实际费用及必要最终审查继续未完成。**";
const evidence="**恢复与证据：** 用户授权的工具恢复和单次只读独立审查已在v25完成，两组P2共享修复保留。v26[共享来源修复](evidence/experience-source-readability-native-2026-09-29.md)、[前轮模式/加载取消](evidence/experience-mode-layer-native-2026-09-29.md)保原条件；本轮[M42/跨午夜/来源/整场]("+report+")及[固定输入/文件/像素绑定](evidence/experience-m42-validation-2026-09-29.json)补对应证据。[候选准备记录](evidence/experience-combined-clean-v26-candidate-2026-09-29.json)不改。当前05:00/revision2不冒称旧21:00或21:30；未知出版版本PARTIAL及GET304不是供应方503/解码/GPU或手机验收。90事件/16原图只作导航，本轮trace已冻结，不再追加。无需重询两项授权或复派审查。";
const replaceLine=(text,pattern,next,label)=>{
  const matches=[...text.matchAll(new RegExp(pattern,"gmu"))];assert.equal(matches.length,1,label);
  return text.replace(matches[0][0],next);
};
const replaceOnce=(text,before,after,label)=>{assert.equal(text.split(before).length-1,1,label??before);return text.replace(before,after);};
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
  const file=path.join(task,name);let text=await fs.readFile(file,"utf8");
  assert(text.includes("M31定位视角12.1°手动"),name+" prior runtime");
  text=replaceLine(text,"^\\*\\*当前：[^\\r\\n]+",headline,name+" current header");
  text=replaceLine(text,"^\\*\\*恢复与证据：[^\\r\\n]+",evidence,name+" evidence header");
  if(name==="PLAN.md"){
    text=replaceOnce(text,"当前公开示例点、21:00/revision1、M31定位视角12.1°手动，单窗s3/PID25916。",
      "当前公开示例点、民用日期2026-09-30 05:00/观测夜2026-09-29/revision2、M42中心43.3°手动，单窗PID25916，原winId s3保历史。", "phase1 runtime");
    text=replaceOnce(text,"公共时间/跟踪/校准/Back owner；",
      "公共时间/跟踪/校准/Back owner；本轮v26公开提交次日05:00/revision2，实际日期09月30日与观测夜09月29日各守其义，4208亮星/3目标及来源/返回同Context已核；", "time row");
    text=replaceOnce(text,"已补完整Canvas昼/暮/夜/红光及局部/全天实际软件输出、同点夜间参考CSS/FOV/时刻；",
      "已补完整Canvas昼/暮/夜/红光及局部/全天实际软件输出、同点夜间参考CSS/FOV/时刻；本轮v26次日05:00的204.3°原生地景ON/OFF/恢复及89.7°W3/银河路径切换有实际画面作用，W3块状条带在已存原始JPEG中也存在，质量缺口保留；", "environment row");
    text=replaceOnce(text,"有限源条带仍存在；旧CDS成品头未取得，",
      "有限源条带仍存在；本轮v26三档实际下载/Native文件摘要/缺测alpha/已绘画面、自然M42点选、绑定来源及下载链接、未知版本PARTIAL/条件GET304/公开Back重开正常版本已核，不认证供应方故障恢复；旧CDS成品头未取得，", "imagery row");
    const phase3=text.match(/^3\. \*\*适用组合证据[^\r\n]+/mu)?.[0];assert(phase3);
    let nextPhase3=replaceOnce(phase3,"本轮又补普通/红光与M31加载取消恢复，","前轮又补普通/红光与M31加载取消恢复，","phase3 history");
    nextPhase3=replaceOnce(nextPhase3,"其它模式/弱网机制与目标组合仍待验。",
      "本轮M42新版三档/自然点选/来源绑定/未知版本PARTIAL及返回、公共次日05:00提交和整场地景/W3组合补本代开发证据，当前M42中心43.3°/revision2；未知版本不借用最新来源，来源完整往返后1.9°星图区0差。其它模式/真正供应方故障/弱网机制与目标组合仍待验。", "phase3 continuation");
    text=text.replace(phase3,nextPhase3);
    text=replaceLine(text,"^4\\. \\*\\*唯一下一依赖：[^\\r\\n]+",
      "4. **唯一下一依赖：C共享失败恢复与B3/C整场质量。** 本轮M42 source-finite-v3三档实际下载/解码/绘制/文件摘要、源缺测说明、自然点选、实际出版来源/复制、未知版本PARTIAL/条件重试/Back重开正常版本、公共次日05:00及整场地景/W3组合已核，不重复正常动作或既有FITS/PNG下载加工。先补真实已绑定版本的来源/影像供应方或HTTP失败、公开重试恢复及独立有效层保留；故障只能在任务自有本机harness内受控，保8789 Context、固定候选和共享服务，换代理前须核身份/时刻/版本等价与实际epoch。未知hash案例不能认证供应方恢复，前轮200正文延迟取消不能认证503/解码/GPU；既有软件/旧代故障证据保其范围。随后继续整场模拟昼暮夜/银河/合法影像与拥挤识别、配准/覆盖/大字及消费者质量；本轮有限条带/饱和和W3原图块状条带归各自owner，不伪造mask或隐藏功能凑完成。Canvas-only截图仍无确定归因，保控件/名称/modal可见与可触缺口，仅有新捕获或运行依据再处理，不重复样式/安装源码调查或盲改cover-view。真实姿态/完整旋转校准/OS后台与Android/iOS仍依目标设备，不调用不支持的方向mock。", "phase4");
    text=replaceLine(text,"^当前运行：[^\\r\\n]+",
      "当前运行：分支codex/remote-main-20260908、HEAD7898962b不变，无提交/推送/切换。v26 PID25916，原winId s3保历史；公开示例点/民用2026-09-30 05:00 Asia/Shanghai、观测夜2026-09-29/UTC2026-09-29T21:00Z/revision2/M42中心43.3°手动，4208亮星/3目标，无跟踪/弹层。星座/地景/W3/地平/赤道意愿ON，W3在当前小视场不绘制。任务8789 PID22124/exec54820保内存、8791 PID19616/exec15154及内部公开controller54424未替换；context/resource pass、PUT2、held/active0，共享8787/8788未动。本轮90事件/16原图已冻结，不再向experience-m42-native-2026-09-29.jsonl追加。文件字节不写成内存/目标性能；当前依赖仅见上方阶段。", "runtime footer");
  }
  await fs.writeFile(file,text);
}
const progressFile=path.join(task,"PROGRESS.md");
let progress=await fs.readFile(progressFile,"utf8");
const title="## 2026-09-29 C/B3/B4：固定v26 M42新版、跨午夜与来源/整场组合";
assert(!progress.includes(title));
const entry="\n\n"+title+"\n\n同一v26/99源码及旧测试输入保持，单窗口和原服务未替换。本轮公共时间轴从21:00/revision1一次PUT200到次日05:00/revision2；民用日期09月30日与观测夜09月29日保持正确边界。M42三档真实PNG/HTTP/Native文件摘要及实际画面、源缺测留空/有限暗像素保留、自然点选身份、实际已绘出版来源与下载复制已核。未知出版hash的来源页保OpenNGC/PARTIAL/公开条件GET304重试，无借用最新IRSA；公开Back后由实际资料重开正常版本恢复，Context/FOV/M42保持，1.9°星图区完整往返0差。这不是供应方故障恢复。\n\n同一05:00从局部扩大89.7°/204.3°，原生地景关闭/恢复保独立天空，W3切换改变画面；明显块状条带在现存W3原始JPEG中也有，M42有限条带/饱和与整场质量继续开放。地景恢复9像素/最大1通道差保原结果，不发明容差。详[原生记录]("+report+")与[固定输入/文件/像素绑定](evidence/experience-m42-validation-2026-09-29.json)。\n\nGoal active、无预算、未完成。最后M42中心43.3°手动/次日05:00/revision2/4208亮星/3目标，普通DAY/非大字，五图层意愿ON、无跟踪/弹层。单窗PID25916，8789/8791/controller54424及共享服务保原，context/resource pass、PUT2、held/active0；90事件/16原图已冻结，数量只作导航。无产品改码、新构建、下载加工、手机/云/Git或重复审查。全部原范围、商业理由、完整合成/质量/设备/性能/费用义务保持；唯一下一依赖见PLAN，以下保历史。\n";
progress=progress.replace(/^# 执行记录与证据入口\r?\n/u,"# 执行记录与证据入口"+entry+"\n");
await fs.writeFile(progressFile,progress);
console.log(JSON.stringify({updated:["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"],contextChanged:false,scope:"Existing unique plan and task-local evidence only; all product/commercial/target obligations retained"}));
