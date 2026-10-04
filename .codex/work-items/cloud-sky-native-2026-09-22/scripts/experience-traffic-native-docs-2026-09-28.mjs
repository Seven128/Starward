import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const task=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const read=async name=>JSON.parse(await fs.readFile(path.join(task,"evidence",name),"utf8"));
const actual=await read("experience-traffic-native-2026-09-28.json"),binding=await read("experience-traffic-native-binding-2026-09-28.json");
const epochs=await Promise.all([read("experience-traffic-native-epoch1-2026-09-28.json"),read("experience-traffic-native-epoch2-2026-09-28.json")]);
const requests=epochs.flatMap(epoch=>epoch.traffic.records).filter(row=>!row.agentProbe);
const totalBytes=requests.reduce((sum,row)=>sum+row.upstreamBodyBytes,0);
assert.equal(totalBytes,5749060);assert.equal(requests.length,138);assert.equal(binding.current.revision,8);
const doc=String.raw`# D 原生请求、暖缓存、渐进加载与取消恢复

本轮继续唯一PLAN的D小路径，生产源码、发布图片和clean-v11客户端均未改变。先用官方DevTools network工具，再在现有owned8791转发owner补有界、匿名正文计量和一次显式细图暂停。未清缓存、重开项目、操作手机、部署或提交；SDK9444/BFF8789保持，当前只有一个任务窗口。

[原生操作/文件/捕获](experience-traffic-native-2026-09-28.json)、[当前候选/Context绑定](experience-traffic-native-binding-2026-09-28.json)、[第一测量epoch](experience-traffic-native-epoch1-2026-09-28.json)、[第二测量epoch](experience-traffic-native-epoch2-2026-09-28.json)分别保原始适用条件。

## 用户结果与实际证据

| 结果 | 当前实际观察 | 边界 |
| --- | --- | --- |
| 返回来源后可继续同一月面 | 08:00/1.5°原生实际月面，独立USGS coverage-v2来源Back保时刻/身份；当前sky-art文件7→0→5，25历史会话文件原样保留 | 这是当前DevTools暖缓存和正常Canvas退休，不能替代手机或重启恢复；Moon资料不在deep-sky credit group中 |
| 图片复用可计量 | 当前原生月面及来源Back没有moon_image或landscape_image转发请求；图片仍真实显示并重新写入当前文件。官方缓冲可见缓存200，不等于实际重传 | 不仅靠network缓冲空行判断；缓存具体内部owner与首次下载尚未由这次暖样本认证 |
| 共享深空层按缩放取得内容 | M31两个真实请求为41,153B/1.778°和14,454B/4°，合计55,607B；可见00:00/高度69.6°、方位19.8°的9.7°→1.5°实际图及红外归因已取得。后一次细档复用不新增图片正文传输 | 最初请求发生于08:00/遮挡位置，不能用其字节样本认证可见构图；不把局部图当整体质量通过 |
| 在细图未到时仍可浏览并取消 | M42公开00:00/高度5.2°、方位98.0°，9.7°粗档8226B已绘；1.5°DETAIL实际HTTP响应在任务proxy暂停，截图前后都仍有同一待传输记录，粗图仍可见 | 控制暂停最长30s，不是普通性能样本；源黑洞/条纹依然可见，质量未完成 |
| 取消后可取得新细图 | 公共缩放回9.7°使上述响应在14,195.25ms关闭，held数量归0；只留8226B OVERVIEW文件，无DETAIL残留。再次公共放大正常200/23697B/0.9°，实际更细图显示，文件只留DETAIL，旧粗文件已释放 | 暂停时未读正文0B不表示上游TCP/服务出口为0，部分数据可能已排入socket；这里证明原生取消、文件与新请求恢复 |
| 回到正常场景 | 00:00/16Z、revision8、85°手动Vega/普通DAY、地景/星座开、W3关、面板/跟踪关闭；已绘来源指向原2K，route/durable Context/BFF/Canvas身份时刻相同 | 相同候选和原出版不认证全部目标旅程、原生GPU峰值、姿态或OS后台 |

138条与公开操作相关的未标记请求，两次独立epoch实际读入正文合计**5,749,060B**；另两轮Agent校验共1,410,674B，明确排除。包含缩放/定位/跨时刻和来源返回、最后恢复及后台报告更新，不是一次首开预算。普通Sky报告存在实际内容变化后200；同内容时的304也成立。检查后的变化键有targets/lunarFacts/weatherEvidence/sources/targetFrames，不能把合法变化误报成ETag缺陷。

这些是本地MEMORY_TEST/LOCAL_TEST BFF与DevTools的代理正文读数，未包含请求/响应头、TLS、DNS、原生解码、GPU、运营缓存、真实天气provider和账单。不是云出口成本、手机流量、首屏、FPS或内存。缓存命中能绕过proxy；声明Content-Length与buffered 200也不能单独证明网络传输。

## 资源与剩余缺口

当前会话7份5,923,825B→来源页0→Back 5份2,574,750B；恢复全景后9份5,095,559B sky-art，另无deep-sky文件。最后9份含各加载owner在自身预算内保留的已就绪图片，文件数不等于当前绘制数或GPU内存。

25份历史sky-art编码文件共35,766,274B保持不动，其中包含上一v11运行会话3份4,874,512B。前一轮当时22历史+3当前与本轮25历史+新当前分别属于各自运行时，不能拿旧计数作为现在的清理成功证据。已查看create/release owner和App入口，正常hide/unmount会释放当前文件；跨运行时重建后的旧命名空间清理还需核责任。不能直接删除历史目录或以文件字节冒充native/GPU内存；此问题进入共享图片文件owner，闭合后继续B3/C可比整页质量。

当前八图均为488×1057，逻辑Canvas390.4×844；新Moon/M31/M42/最后场景都已实际查看。加载中M42仍呈现粗档的块状源缺口，正常细档为更细黑条；这些源质量问题依然开放，不靠透明化隐藏对象或凭黑像素伪造科学有效mask。无新输入不重复M42 WCS超时或月面下载加工。

## 检查、运行与限制

转发用真实发布银河JPEG对比owned8789正文、Content-Type/Length/Cache-Control和清单SHA256，结果一致；测量字段无私有URL/ID、完整headers或payload。真实native取消/恢复、编码文件读回、8份PNG及当前257文件SHA256绑定成立。任务proxy补了下游取消时的上游退休，避免测量工具自身保留已取消响应；正常产品头/正文保持。

为加载任务计量和控制暂停，只替换了owned8791两次，测量epoch和旧Context计数各自保存，不伪造连续累计。当前8791 PID21852/exec37410、context/resource mode均pass、held和active均0，owned8789 PID22124/exec54820、SDK9444 PID34128不变，共享8787/8788未动。未维持多代窗口、未重打客户端。

采集器曾因functions无URL构造器、误将Moon信用要求套到深空状态组、已展开来源被再次折叠，以及quoted node.exe的严格进程匹配拒绝而失败；均修正或按真实状态重新读取，不计作产品失败/通过。一次错误的提前启动返回EADDRINUSE，原代理未被误杀；核实带引号命令后才换owned进程。

完整体验、B3整体构成、源质量/配准、手机Android/iOS、姿态/完整旋转校准/OS后台、原生GPU/内存/帧时/首屏、官方包体、费用与独立审查仍开放。当前Goal active、无预算、未完成；新月面和全部新修复未推手机，旧D不升级。
`;
const evidencePath=path.join(task,"evidence/experience-traffic-native-2026-09-28.md");
const savedEvidence=await fs.readFile(evidencePath,"utf8").catch(error=>{if(error.code==="ENOENT")return null;throw error;});
if(savedEvidence===null)await fs.writeFile(evidencePath,doc,{flag:"wx"});
else assert.ok(savedEvidence===doc,"preserve differing existing evidence");
const current="本轮D已在原clean-v11完成真实请求/暖缓存/粗细加载及原生取消恢复的小路径：月面来源Back当前7→0→5文件、M31两档55,607B、M42真实细响应暂停→公共缩放取消→新23697B细图/旧粗文件释放；八图已看，原257文件/出版不变。两次proxy epoch未标记正文5,749,060B只保本地样本边界，不是首屏/FPS/内存/云账单。当前16Z/revision8、85°手动Vega/普通DAY、原2K已绘来源，唯一9444；owned8791 PID21852/exec37410已回pass且无held/active，8789 PID22124不变。当前旧会话25份35,766,274B编码文件（含上一v11三份）仍在，不误删或当native内存；下一依赖核共享图片文件owner跨运行时重建后的归属/清理边界，确认后修复，闭合即回B3/C可比整页质量。M42源黑条/复杂配准、B3整体构成及目标Android/iOS/姿态/校准/后台/性能/官方包体/费用/独立审查仍开放；新月面未推手机，旧D不升级，完整有效范围和Goal未完成。";
const link="[本轮原生请求及取消恢复](evidence/experience-traffic-native-2026-09-28.md)";
for(const name of ["PLAN.md","STATE.md","INDEX.md"]){
  const file=path.join(task,name);let text=(await fs.readFile(file,"utf8")).replace(/\r\n/g,"\n");
  const start=text.indexOf("**当前");assert.ok(start>=0);const end=text.indexOf("\n\n",start);assert.ok(end>=0);
  const heading=name==="PLAN.md"?"**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。** ":"**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。** ";
  text=text.slice(0,start)+heading+current+"详"+link+"及[当前绑定](evidence/experience-traffic-native-binding-2026-09-28.json)。"+text.slice(end);
  if(name==="PLAN.md"){
    const dependencyStart=text.indexOf("   **当前可执行依赖："),dependencyEnd=text.indexOf("\n\n",dependencyStart);assert.ok(dependencyStart>=0&&dependencyEnd>dependencyStart);
    const dependency="   **当前可执行依赖：D实际请求及原生取消恢复小路径已有适用证据；接着核共享图片文件owner的跨运行时恢复边界。** "+link+"与[原生采集](evidence/experience-traffic-native-2026-09-28.json)保Moon暖缓存/来源Back 7→0→5、M31真实55,607B两档和M42实际延迟/取消/重取23697B细图、旧粗文件释放；不重复这些正常/取消动作。25历史会话文件35,766,274B含上一v11三份，正常hide只认证当前owner；先核App启动、命名空间、其它消费者及平台持久语义，确定是否需回收失去owner的编码缓存，再沿共享文件owner完成成功/迟到/跨启动边界和实际读回，不能直接误删其它文件。这个D实缺口闭合后回到B3/C可比整页构成/辨认，不让资源计数或纹理精修替代完整体验。已测本地正文和控制暂停不等于手机流量/FPS/内存或云费用；所有原有效功能、商业边界、质量和目标验收继续。";
    text=text.slice(0,dependencyStart)+dependency+text.slice(dependencyEnd);
    const oldStart=text.indexOf("   **此前D Context有界并发路径已完成"),oldEnd=text.indexOf("\n",oldStart);assert.ok(oldStart>=0);
    text=text.slice(0,oldStart)+"   此前[Context原子提交](evidence/experience-context-atomic-2026-09-28.md)和[月面部分组合](evidence/experience-imagery-combined-2026-09-28.md)各保其历史条件，不反复重跑已闭合并发或正常组合。Context头回执/生产配置不由CAS认证。当前下一依赖只由本段起首驱动；C其余配准/源条纹、B3完整质量和全部目标义务保持。"+text.slice(oldEnd);
    text=text.replace("本轮另核实际当前5→0→2编码文件、页面firstRender132ms与直接本机报告读回；这些不是目标资源/首屏/流量。", "此前另核当前5→0→2编码文件、页面firstRender132ms与直接本机报告读回；本轮实际暖缓存/正文和原生细请求取消/恢复见当前入口，跨运行时编码文件归属仍待核；这些均不是目标资源/首屏/云账单。");
    text=text.replace("当前是干净开发候选；本轮revision原子边界有本地Memory/Redis证据；", "当前是干净开发候选；本轮D实际网络/暖缓存/取消有DevTools证据，历史编码文件跨运行时归属仍待核；revision原子边界有本地Memory/Redis证据；");
  }
  if(name==="PLAN.md"||name==="STATE.md"){
    const prefix=name==="PLAN.md"?"恢复状态：分支codex/remote-main-20260908":"当前clean-v11/SDK9444 PID34128";
    const restoreStart=text.indexOf(prefix);assert.ok(restoreStart>=0);const restoreEnd=text.indexOf("\n\n",restoreStart);assert.ok(restoreEnd>restoreStart);
    const restore="恢复状态：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送。当前clean-v11/SDK9444 PID34128，SHA256 99c50222cb3d64fc2201470c754d6e135c60b51b9711f8918b52f93469cc47db，257文件/4,469,986 rawB未变，raw main2,081,604B不是官方包体。00:00/16Z、revision8、85°手动Vega/普通DAY，地景星座开、W3关，无跟踪/面板/旧时间错误，公开已绘原2K来源；route/durable Context/BFF/Canvas已核同身份时刻。八图488×1057，逻辑Canvas390.4×844，不跨尺度或认证手机合成。当前sky-art会话9份5,095,559B、deep-sky文件0，25历史编码文件35,766,274B保留；文件不是native/GPU内存。API8791 owned pass（PID21852/exec37410）至8789（PID22124/exec54820），context/resource mode均pass、held/active均0；共享8787/8788未动，只一个任务窗口。未改生产源码、出版或重打客户端，无诊断/mock/代次/vConsole/maps，loopback不推手机，私有IDs不入记录。恢复先读"+link+"及[当前绑定](evidence/experience-traffic-native-binding-2026-09-28.json)；此前月面revision6和CAS当时revision4各保历史，不能作为当前版本。";
    text=text.slice(0,restoreStart)+restore+text.slice(restoreEnd);
  }
  if(name==="INDEX.md")text=text.replace("## 当前入口\n\n","## 当前入口\n\n"+link+"：目的网络工具与现有代理匿名正文计量，实际暖图片/粗细层及M42延迟取消/重取、编码文件退休、原候选/当前revision8绑定。数据/暂停/文件字节不认证目标性能/成本，旧会话遗留进入共享owner下一依赖，完整质量和手机继续未验。\n\n").replace("[本轮月面组合及入口恢复]","[此前月面组合及入口恢复]");
  await fs.writeFile(file,text);
}
const progressPath=path.join(task,"PROGRESS.md");let progress=(await fs.readFile(progressPath,"utf8")).replace(/\r\n/g,"\n");
const firstSection=progress.indexOf("## 2026-09-28");assert.ok(firstSection>=0);
const entry="## 2026-09-28 D真实原生请求、暖缓存与细图取消恢复\n\n"+current+"\n\n"+link+"、[实际记录](evidence/experience-traffic-native-2026-09-28.json)、[当前绑定](evidence/experience-traffic-native-binding-2026-09-28.json)、[epoch1](evidence/experience-traffic-native-epoch1-2026-09-28.json)/[epoch2](evidence/experience-traffic-native-epoch2-2026-09-28.json)保对应条件。八张原生图均已查看；前一轮22历史+3当时会话与当前25历史+新会话区分，未删除文件。只为任务计量/一次有界暂停替换8791，客户端/BFF/出版不变；正文、PNG/文件/Context与候选分别核，不把开发证据当手机、整体质量或独立审查。下一步仅按唯一PLAN。\n\n";
progress=progress.slice(0,firstSection)+entry+progress.slice(firstSection);
progress=progress.replace("## 2026-09-28 C/B2月面部分组合、正常入口与D测量边界","## 2026-09-28 此前C/B2月面部分组合、正常入口与D测量边界（历史）");
progress=progress.replace("下一小路径按唯一PLAN转D原生请求/渐进加载的有界测量或尚未覆盖失败恢复，复用目的工具/现有任务传输owner；", "当时转向D请求/渐进测量；其后实际推进见顶部本轮记录，当前下一步只由唯一PLAN驱动；");
await fs.writeFile(progressPath,progress);
console.log(JSON.stringify({evidence:"experience-traffic-native-2026-09-28.md",updated:["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"],unmarkedRequests:requests.length,measuredBodyBytes:totalBytes,currentRevision:binding.current.revision,nextOwner:"shared image files across runtime reconstruction"}));
