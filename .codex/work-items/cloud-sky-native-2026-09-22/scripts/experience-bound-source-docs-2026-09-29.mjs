import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const report="evidence/experience-bound-source-native-2026-09-29.md";
await fs.access(path.join(task,report));
await assert.rejects(fs.access(path.join(task,"evidence/experience-bound-source-document-checks-2026-09-29.json")),{code:"ENOENT"});
const validation=JSON.parse(await fs.readFile(path.join(task,"evidence/experience-bound-source-validation-2026-09-29.json"),"utf8"));
assert.equal(validation.runtime.putsInNewEpoch,0);assert.equal(validation.context.after.revision,2);
assert.equal(validation.runtime.sourceStatus.mode,"pass");assert.equal(validation.runtime.held,0);assert.equal(validation.runtime.active,0);
const headline="**当前：Goal active、无预算、未完成；单窗clean-v26/SHA510d269337407b659cd764d7bdcbbb6e1479872e83e3a54bfa99ad10ef485421、257文件/4,485,078 rawB，99源码及既有测试输入保持。本轮补实际已绑定来源独立失败/部分资料保留/公开条件重试与恢复，真实W3细档503保已绘中档/公开重试细档及来源往返；原M42/月面/模式/时间/整场证据各保范围。当前公开示例点、民用2026-09-30 05:00 Asia/Shanghai、观测夜2026-09-29/revision2/M82中心2.3°手动，4208亮星目录对象/3目标，DAY/非大字，无跟踪/modal，五图层意愿ON。PID25916；任务代理8791已替换为PID1144/exec42697/controller59162，原8789 Context及共享服务保留，新epoch PUT0与旧PUT2分记、身份时刻未重置；source/context/resource pass、held/active0。原33项义务、商业排除及理由、完整合成/整场质量/配准覆盖、Android/iOS/新版月面手机、真实姿态校准/OS后台、其它模式/大字/消费者、目标性能/官方包体/费用及必要最终审查保持未完成。**";
const evidence="**恢复与证据：** 用户授权的工具恢复及单次只读独立审查已在v25完成，无需重询或复派。v26[共享来源修复](evidence/experience-source-readability-native-2026-09-29.md)、[模式/加载取消](evidence/experience-mode-layer-native-2026-09-29.md)、[M42/跨午夜/整场](evidence/experience-m42-native-2026-09-29.md)保原条件；本轮[实际来源/影像失败恢复]("+report+")、[固定输入/Context/文件/像素绑定](evidence/experience-bound-source-validation-2026-09-29.json)补当前开发证据，[候选记录](evidence/experience-combined-clean-v26-candidate-2026-09-29.json)未改。先核8792编译服务/实际发布/Context等价，再退休旧8791及staging；新epoch2026-09-29T06:26:06.812Z。99事件/14原图已冻结，不追加；原M42/模式trace未变。未知版本、提供者资料异常、W3 HTTP503、延迟取消分别认证，不升级SDSS影像/解码/GPU/OS后台/手机或整体质量。";
function line(text,pattern,next,label){const hits=[...text.matchAll(new RegExp(pattern,"gmu"))];assert.equal(hits.length,1,label);return text.replace(hits[0][0],next);}
function once(text,before,after,label){assert.equal(text.split(before).length-1,1,label);return text.replace(before,after);}
const updates=[];
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
  const file=path.join(task,name);let text=await fs.readFile(file,"utf8");
  assert(text.includes("M42中心43.3°手动"),name+" prior checkpoint");
  text=line(text,"^\\*\\*当前：[^\\r\\n]+",headline,name+" current");
  text=line(text,"^\\*\\*恢复与证据：[^\\r\\n]+",evidence,name+" evidence");
  if(name==="PLAN.md"){
    text=once(text,"当前公开示例点、民用日期2026-09-30 05:00/观测夜2026-09-29/revision2、M42中心43.3°手动，单窗PID25916，原winId s3保历史。",
      "当前公开示例点、民用日期2026-09-30 05:00/观测夜2026-09-29/revision2、M82中心2.3°手动，单窗PID25916，原winId s3保历史；代理已替换且canonical身份时刻保留，新epoch PUT0不覆盖旧PUT2。", "phase1 checkpoint");
    text=once(text,"不认证供应方故障恢复；旧CDS成品头未取得，",
      "此M42未知版本案例不认证供应方故障恢复；本轮v26另核M82已绘版本绑定来源的独立提供者异常/条件GET304保部分/公开GET200恢复，W3细档真实503保中档/公开重试细档及来源Back；不升级SDSS影像/解码/GPU/目标验收；旧CDS成品头未取得，", "imagery evidence row");
    text=once(text,"v26来源与模式/真实细图延迟取消恢复有本代绑定，完整目标冷启动与资源仍待验；",
      "v26来源与模式/真实细图延迟取消恢复有本代绑定，本轮再补实际已绑定来源独立失败恢复与W3 HTTP503保粗档/公开恢复/文件替换及Back，Context/时刻不变；完整目标冷启动与资源仍待验；", "stability evidence row");
    text=once(text,"其它模式/真正供应方故障/弱网机制与目标组合仍待验。",
      "本轮M82已绑定来源部分失败/条件重试/分别恢复、真实W3 HTTP503保中档/公开细档恢复和自然点选/来源返回另有同代证据，最终M82中心2.3°；其它模式/SDSS影像失败/解码/GPU/弱网及目标组合仍待验。", "phase3 scope");
    text=line(text,"^4\\. \\*\\*唯一下一依赖：[^\\r\\n]+",
      "4. **唯一下一依赖：B3/C整场质量与组合体验。** 已核M42新版三档/跨午夜/未知版本及本轮M82实际已绑定来源独立失败/目录与有效来源保留/条件重试/分别恢复，真实W3 DETAIL503保已绘MEDIUM/公开重试DETAIL及来源Back；不重复已取得数据、已成功预检或故障动作，不重做月面/HiPS加工。按整体浏览/识别影响继续模拟昼暮夜、银河/合法影像、拥挤识别、配准/覆盖、大字及共享来源消费者；M42有限条带/饱和、W3原图块状条带各归源/呈现owner，不能伪造mask或隐藏功能凑完成。Canvas-only截图无确定归因，控件/名称/modal的可见与可触仍开放，仅有新捕获或运行依据再调查；不重复样式/安装源码或盲改cover-view。SDSS影像HTTP失败、解码/GPU/弱网等按不同机制/风险补适用证据，当前W3/资料异常不一概覆盖；目标冷启动/资源性能/OS后台和完整旅程保留。真实姿态/完整旋转校准/Android/iOS等依目标设备，手机暂不可用时继续独立模块，不调用不支持的方向mock。", "phase4 next dependency");
    text=line(text,"^当前运行：[^\\r\\n]+",
      "当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换。v26 PID25916、原winId s3保历史；公开示例点/民用2026-09-30 05:00 Asia/Shanghai、观测夜2026-09-29/UTC2026-09-29T21:00Z/revision2/M82中心2.3°手动，4208亮星目录对象/3目标，DAY/非大字，无跟踪/modal。星座/地景/W3/地平/赤道意愿ON，广角W3于当前小视场不绘制。8789 PID22124/exec54820保内存；任务8791已换PID1144/exec42697及内部59162，epoch2026-09-29T06:26:06.812Z，新PUT0，原epoch PUT2保持历史；canonical Context身份/指纹/时刻/revision2不变。旧代理PID19616/exec15154、内部54424、staging8792/PID17008已退休，共享8787/8788未动。source/context/resource pass、held/active0；本轮99事件/14原图及前轮90事件/16原图都已冻结，不再追加。编码字节不写成内存/目标性能，唯一下一依赖见阶段4。", "runtime footer");
  }
  if(name==="STATE.md")text=once(text,
    "完整旋转校准开发合成尝试被官方SDK不支持mock方向监听阻止，没有获得原生校准证据，部分mock已全部撤销。恢复实现的修前失败/修后检查与实际无姿态返回链分别解释，不能替代手机跟随、OS后台或校准。当前等待时继续D资源与稳定性及其它独立实缺口；不反复尝试不支持的模拟接口，不无限精修地景或重复未变的手动/时间动作。",
    "完整旋转校准的历史合成尝试受官方SDK不支持mock方向监听限制，未获原生校准证据，部分mock已全部撤销。恢复实现的修前失败/修后检查与实际无姿态返回链各保范围；手机跟随/OS后台/完整校准仍待目标验证。当前单窗、Context及服务恢复点见顶部，本轮来源/影像失败恢复已有适用证据；唯一下一依赖由PLAN阶段4维护，不重试不支持的模拟接口或重复已成功动作。", "state recovery entry");
  updates.push({file,text});
}
const progressFile=path.join(task,"PROGRESS.md");let progress=await fs.readFile(progressFile,"utf8");
const title="## 2026-09-29 C：固定v26实际出版来源与影像失败恢复";assert(!progress.includes(title));
const entry="\n\n"+title+"\n\n同一v26及99源码/旧测试输入保持。任务8792真实编译服务预检后，替换自有8791故障harness，保8789 Context/共享服务。M82先公开搜索/定位/自然点选，再由实际已绘出版绑定来源：独立提供者异常时保目录及另一来源，未变条件GET304保PARTIAL，分别恢复公开GET200后资料modal同步；首次未绑定route与绑定案例分清。W3细档真实HTTP503保同一已绘MEDIUM，服务恢复但未公开重试无新请求/星图区0差；公开重试DETAIL200/9,569B，Native摘要与发布一致、旧MEDIUM编码释放、画面有实际作用。细档自然点选/绑定来源/Back仍M82，2.3°/05:00/revision2与星图区0差。详[本轮记录]("+report+")、[候选/Context/文件/像素绑定](evidence/experience-bound-source-validation-2026-09-29.json)。\n\n当前代理8791/PID1144/exec42697/controller59162，新epoch2026-09-29T06:26:06.812Z、PUT0；旧代理/内部54424/staging8792已退，旧PUT2保持历史。canonical身份/指纹/时刻/revision2不变；source/context/resource pass、held/active0，单窗PID25916，DAY/非大字、五图层意愿ON、无跟踪/modal。99事件/14原图已冻结，前轮trace未变。\n\n本轮只扩任务受控harness并补原生开发证据，没有产品改码、新构建、手机/云/Git动作或复派审查。它不证明SDSS影像503、解码/GPU/OS后台、整体画质或目标资源。原33项义务、商业理由、新版月面手机/Android/iOS/真实姿态校准、合成/整场质量/覆盖/大字与消费者、性能/官方包体/费用/最终审查保持；Goal active、无预算、未完成，唯一下一依赖见PLAN。以下为历史。\n";
progress=progress.replace(/^# 执行记录与证据入口\r?\n/u,"# 执行记录与证据入口"+entry+"\n");
updates.push({file:progressFile,text:progress});
for(const update of updates)await fs.writeFile(update.file,update.text);
console.log(JSON.stringify({updated:updates.map(update=>path.basename(update.file)),contextChanged:false,scope:"One current plan/task evidence; all commercial/product/target obligations preserved"}));
