import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22"),evidence=path.join(item,"evidence");
const load=async name=>JSON.parse(await fs.readFile(path.join(evidence,name),"utf8"));
const candidate=await load("experience-combined-clean-v21-candidate-2026-09-29.json");
const running=await load("experience-celestial-source-running-2026-09-29.json");
const consumers=await load("experience-celestial-source-consumers-after-2026-09-29.json");
const reportName="experience-celestial-source-recovery-2026-09-29.md",closeName="experience-celestial-source-close-2026-09-29.json";
await assert.rejects(fs.access(path.join(evidence,reportName)),{code:"ENOENT"});
await assert.rejects(fs.access(path.join(evidence,closeName)),{code:"ENOENT"});
assert.equal(consumers.rows.length,6);assert(running.contextDataEqual&&running.contextPuts===0);
const previous=candidate.previousCandidate;
assert.equal(candidate.rawPackageBytes.main,previous.rawPackageBytes.main);
const rawDelta=candidate.fingerprint.totalBytes-(await load("experience-combined-clean-v20-candidate-2026-09-29.json")).fingerprint.totalBytes;
const report=`# 资料与来源的出版故障恢复：2026-09-29

沿唯一PLAN的C06/D资料来源边界继续，目标是来源不可用时保留真实目录和独立来源，重试后恢复对应出版，不显示完整成功或借用另一版本。当前Goal active、无预算；引擎、商业边界和全部有效旅程/验收义务保留。本轮不重选数据、不重取影像、不改科学像素/注册/渲染、不开新DevTools窗或操作手机。

## 已修复的用户结果

1. 原资料服务捕获SDSS出版异常后只避免缓存，却仍返回FRESH，没有缺失提示。两条修前owner/真实HTTP检查均复现。现在任一W3/SDSS来源失败均返回PARTIAL及对应限制/警告；真实目录事实、别名和其它独立来源保留，不把未准入光学对象的正常null当故障。部分结果不进入完整资料缓存，恢复后实际来源、内容revision与ETag变化。
2. 弹层与独立来源route复用celestial-information-presentation.ts，明确所选红外/光学来源缺失，保留已有资料及重试。实际Mini transport的断网回退原本改为STALE_USABLE后让缺失提示消失；修前生产component/缓存链复现。现在保留过期与已知来源缺失两种含义，联网后同一已有重试请求取回真实出版并清除缺失提示。没有增加轮询、自动重试循环、另一套资料缓存、请求或渲染owner。
3. 原已绘W3 hash仍传给资料及独立来源route；错/不存在的绑定返回独立资料与明确PARTIAL，不借当前W3署名。SDSS仍按该对象的固定已准入hash提供原清单下载链接，未把一个光学版本扩张成多版本框架。来源Back/实际观测Context及帧归属继续沿原owner，Node路由参数检查不是原生返回验收。

## 实际证据及范围

- [修前日志](experience-celestial-source-before-2026-09-29.log)保两条FRESH而非PARTIAL反例。[BFF检查](experience-celestial-source-bff-2026-09-29.log)含三种单独/共同来源失败及恢复、未准入正常缺源、真实Nest/Fastify条件响应恢复；目录/别名/有效信用和旧光学/影像兼容检查通过。仍部分时304保其明确部分含义；恢复后200新ETag，不被旧缓存吞掉。
- [跨边界消费者检查](experience-celestial-source-consumers-after-2026-09-29.json)使用当前编译MiniappController/MiniappService、真实本地出版/HTTP、实际Mini request/response-cache/authenticated-operation/response验证与两个生产component函数。六阶段覆盖两出版失败、红外独立恢复、仍失败的304、断网保过期+缺失、光学恢复、原hash返回；另核不存在的已绘hash不借当前红外来源。六次HTTP读、请求registry释放；实际源码hash留记录。Native Taro视图/React订阅由Node adapter替代，不能称微信合成、手势或完整旅程验收。
- [断网提示修前反例](experience-celestial-source-consumers-before-stale-transport-2026-09-29.json)在实际STALE_USABLE时失去部分来源提示；前两个同脚本运行缺少VM常量而失败，原before-stale/before-stale-verified记录保留，明确属于诊断adapter错误，不作为产品缺陷证据。修前异常退出亦有Node Windows UV关闭断言，最终正常路径退出0；不由诊断异常推断原生平台问题。
- 当前Mini消费者/身份/已绘hash检查、Mini与BFF类型、BFF编译通过；v21隔离构建通过，原CSS顺序及两条webpack建议共三警告保留。首个候选marker检查误用未转义中文，实际JS已Unicode转义；修正可表示性检查后通过，不重建或冒称代码缺失。具体marker读回另见记录。

只替换已核PID/命令/两listener且pass/pass、held/active0的任务8791代理；原PID31448/exec98346及内部53462退休。当前PID19616/exec15154、内部${running.publicationBackendPort}，epoch ${running.epochStartedAt}；内部公开出版backend随代理退休，不是新增独立常驻BFF。模块hash在启动时固定为${running.informationModuleSha256}，与实际消费者检查的编译模块相同，不能把后续磁盘编译误当运行已更新。8789 PID22124原内存Context、共享8787/8788保留；新的独立示例Context仅内存持有，替换前后完整data相同、实际revision=${running.revision}、PUT0，六个已准入光学对象来源/绑定W3为FRESH，held/active0。替换中不可达${running.unavailableChecks}次如实留存。[运行记录](experience-celestial-source-running-2026-09-29.json)不是旧native Context读回、8789全域升级或云部署。

## 候选与剩余义务

clean-v21 prepared未打开：${candidate.fingerprint.sha256}，${candidate.fingerprint.fileCount}文件/${candidate.fingerprint.totalBytes} rawB，main ${candidate.rawPackageBytes.main}B；相对v20全包/Sky +${rawDelta}B，主包及其它分包字节不增。不是官方包体/压缩大小或目标性能。无diag/mock/代次/vConsole/maps，loopback8791不推手机。实际v20指纹${previous.sha256}保持；旧GPU owner源码仍相同，旧画面证据保其原条件，当前新增弹层/来源文本不从旧图认证原生合成。

独立审查仍未发生，自审/本地检查不等于独立审查。v12真实Frame/Context/4B夹具状态仍未知，本輪未重试失败原生RPC/取消提权或删夹具。手机按用户指令禁用，不推新月面/候选，旧D证据不提升本代。完整进入/连续浏览/识别/搜索点选/时间跟踪/返回恢复，整场环境与源质量/配准/合法覆盖、真实姿态/完整校准/OS后台、Android/iOS、峰值资源/帧时/首屏/官方包体/弱网与费用均保留；源条纹/饱和和已测整场变慢没有由本次资料修复解决。

本轮没有获取新源数据或源站请求，没有新增许可采购或云操作；raw新增是本地代码字节。Agent有效工时、项目方参与、云存储/流量/算力和实际现金仍分别核算，未知不记零，不折薪/叠共享主机整月。下一依赖只由PLAN决定，来源故障开发边界已闭合，不重复本轮故障/下载/既有profile作为主要进度。
`;
const checkpoint=`**当前检查点：Goal active、无预算；完整体验继续，真机不可用。** C06/D资料来源故障已在共享owner修正：W3或SDSS失败明确PARTIAL，目录/独立来源保留；弹层/来源route共用提示，断网保过期与来源缺失，一次既有重试取回真实出版。实际编译HTTP→Mini transport/cache→两component函数已核，原已绘hash不借当前来源，Node不是native组合验收。详[资料与来源恢复](evidence/${reportName})。clean-v21 prepared未打开，SHA ${candidate.fingerprint.sha256}，257文件/${candidate.fingerprint.totalBytes} rawB、main${candidate.rawPackageBytes.main}B；较v20仅raw/Sky+${rawDelta}B，主包不增，原v20指纹保持。当前8791 PID19616/exec15154、内部${running.publicationBackendPort}接本代编译来源模块，保8789 Context与共享服务；独立测试完整data相等、revision${running.revision}、六来源过、PUT0/pass/pass/held0/active0。旧v12 Frame/Context/4B仍未知，无新DevTools窗/手机/原生RPC或取消提权重试/云/Git提交。全流程、B3/C质量/合法覆盖、真实姿态/校准/后台、Android/iOS、新月面手机、资源性能/官方包体/费用/独立审查仍开放。唯一依赖见PLAN，Goal未完成。`;
function replaceFirstParagraph(text,marker,replacement){
 const start=text.indexOf(marker);assert(start>=0);const end=text.indexOf("\n\n",start);assert(end>start);return text.slice(0,start)+replacement+text.slice(end);
}
const texts=new Map();
for(const file of ["PLAN.md","STATE.md","INDEX.md","PROGRESS.md"])texts.set(file,(await fs.readFile(path.join(item,file),"utf8")).replaceAll("\r\n","\n"));
let plan=replaceFirstParagraph(texts.get("PLAN.md"),"**当前：",checkpoint.replace("当前检查点：","当前："));
plan=plan.replace("最新准备候选为尚未打开的clean-v19","最新准备候选为尚未打开的clean-v21");
plan=plan.replace("**当前可执行依赖：C源缺测出版／加载／来源已接，转同一候选的运行代次与组合恢复。**","**已完成开发边界：C源缺测出版／加载／来源已接；当前依赖只见下方合并步骤。**");
plan=plan.replace("此前clean-v19 prepared、未打开；当前v20见下方C06，原v19未改。","此前v19/v20 prepared、未打开；当前v21见下方资料来源恢复，原v20指纹保持。");
plan=plan.replace("当前已在C06接入轮替成PID31448／exec98346、内部53462同进程退休；context/resource pass、held/active0。","C06轮曾替换成PID31448／exec98346、内部53462；现已在资料来源恢复轮替为PID19616／exec15154、内部54424，旧内部端口随代理退休；context/resource pass、held/active0。");
plan=plan.replaceAll("再用一个v20核", "再用一个最新准备候选（当前v21）核");
plan=plan.replace("最新v19 prepared未打开，无新原生／手机验收。", "该轮v19 prepared未打开，现v21仍未打开；无新原生／手机验收。");
const c06Start=plan.indexOf("   **C06合法光学目标覆盖");assert(c06Start>=0);
const c06End=plan.indexOf("\n\n",c06Start);assert(c06End>c06Start);
const currentDependency=`   **C06光学覆盖与资料来源故障已闭合本地开发边界，唯一下一依赖回到完整组合体验。** [六目标共享链](evidence/experience-sdss-targets-2026-09-29.md)保M51兼容、M63/M64/M81/M82/M87原输入/合同/加载/注册/GPU/来源、M81尺度与单波段显示；矩形硬边/跨波段边缘修复不篡改原图或科学覆盖，源饱和/条纹仍开放。v20与六来源/18JPEG历史运行证据保其原条件，不重复获取。

   [资料来源故障恢复](evidence/${reportName})实证修前SDSS异常伪FRESH及断网后丢缺失提示，当前共享服务/两消费者保目录和独立来源、明确部分/过期、不借另一W3hash，恢复后一次重试得真实出版/新ETag。编译HTTP与Mini缓存/component函数只认证开发边界；运行8791同一编译模块、六来源与独立测试Context完整读回相等，保8789原内存及共享服务。v21 prepared未打开，raw/Sky+${rawDelta}B、主包不增，v20原指纹保持。

   **接续顺序：** 可安全恢复原生时先按上段核旧v12会话/4B归属并退休，再只开一个v21，集中核进入→局部/全天连续缩放与识别→搜索/自然点选/资料来源→公共时间/跟踪→返回/恢复，纳入C09与影像加载/故障，不逐对象开窗/发包。原生仍不能安全恢复时，继续同阶段B3/C整场昼/暮/夜、局部/全天、普通/红光及多层组合的构成/可辨认差距，基于既有参考条件与实际输出选影响整体的下一差异；新机制/失败再作必要检查，不重复已闭合来源故障/源下载/M51亚像素/profile，不能用source提示或简单示意代替整体验收。姿态/完整校准/OS后台、Android/iOS、新月面本代手机、源/环境质量与其它配准/合法覆盖、资源性能/首屏/官方包体/弱网/实际费用/独立审查均继续。`;
plan=plan.slice(0,c06Start)+currentDependency+plan.slice(c06End);
plan=plan.replace("历史准备（当前v20，原v19未改）：clean-v19", "历史准备（当前v21，v20原指纹保持）：clean-v19");
texts.set("PLAN.md",plan);
for(const file of ["STATE.md","INDEX.md"])texts.set(file,replaceFirstParagraph(texts.get(file),"**当前检查点：",checkpoint));
texts.set("PROGRESS.md",texts.get("PROGRESS.md")+`\n\n## 2026-09-29 C06/D资料来源故障与断网恢复\n\n${checkpoint}\n\n修前真实FRESH错误及断网丢缺失含义均保反例，actual HTTP/缓存/component恢复已核；编译和当前运行代次分开。该轮有新模块结果，原生未验不挂住独立开发，下一依赖只见PLAN。\n`);
const ownerFiles=["project_context/architecture/runtime-and-domain.md","project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md","project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md"];
const ownerTexts=await Promise.all(ownerFiles.map(file=>fs.readFile(file,"utf8")));
let runtime=ownerTexts[0];
runtime=runtime.replace("accepts canonical HR and admitted M references.","accepts canonical HR/SAO/M/PLANET/SOLAR references.");
runtime=runtime.replace("React Query deduplicates by reference/locale, while the BFF keeps a bounded 256-entry value cache keyed by stable identity and the content/catalog revision.","React Query deduplicates by reference/locale and the admitted image version/painted publication hash, while the BFF keeps its existing bounded value cache keyed by reference/locale and the selected catalog/image publications.");
const sourceRule="- Information publication recovery: `CelestialObjectInformationService` keeps catalogue facts and each valid W3/SDSS source independent. A failed admitted publication marks the response `PARTIAL` with its specific warning/limitation, omits its credit and is not cached as complete information; an unadmitted optical target's normal null is not a failure. Restored metadata changes the content revision/ETag, so conditional retry can return recovered provenance. The existing selected W3 publication hash never falls back to a different current credit. `celestial-information-presentation.ts` supplies the object modal and independent source route's missing-source meaning: a transport `STALE_USABLE` fallback retains known W3/SDSS failure warnings alongside stale status, and the existing user retry clears them only after a valid recovered response. It adds no query, automatic retry loop or second cache. Local HTTP/cache/component checks do not establish native composition or device return recovery.\n";
assert(!runtime.includes("- Information publication recovery:"));
const sourceAnchor="- Sources: [SIMBAD]";const sourceAt=runtime.indexOf(sourceAnchor);assert(sourceAt>=0);runtime=runtime.slice(0,sourceAt)+sourceRule+runtime.slice(sourceAt);
const sharedRule="天体资料/来源复用 `celestial-information-presentation.ts` 解释已知W3/SDSS来源缺失：保留真实目录和已取得的独立来源，明确部分可用并提供既有资料重试；未准入的光学对象没有来源不是异常。断网回退的过期状态不清除已知来源缺失，恢复后有效回复才撤提示，来源/下载不能借其它出版hash。两消费者共享身份/出版查询及条件缓存，没有自动轮询或另建资料缓存；这项开发链不认证目标微信合成或实际Back恢复。\n\n";
let shared=ownerTexts[1];assert(!shared.includes("天体资料/来源复用 `celestial-information-presentation.ts`"));
const sharedAt=shared.indexOf("供应商要求与当前数据共同显示的归因");assert(sharedAt>=0);shared=shared.slice(0,sharedAt)+sharedRule+shared.slice(sharedAt);
const spotRule="天体资料的W3/SDSS出版来源故障保目录和独立有效来源，服务明示PARTIAL且不缓存完整成功；不存在的已绘W3hash不借当前来源。资料弹层与独立来源页共用来源缺失提示，断网保过期与已知缺失，恢复后沿同一身份/版本重试取回真实来源及对应固定清单。未准入光学对象的正常无源不警告。当前实际HTTP、Mini缓存/两component函数已核，目标原生合成、来源Back与整体旅程仍需实际运行证据。\n\n";
let spot=ownerTexts[2];assert(!spot.includes("天体资料的W3/SDSS出版来源故障"));
const spotAt=spot.indexOf("M51/M63/M64/M81/M82/M87");assert(spotAt>=0);
const spotParagraphEnd=/\r?\n\r?\n/u.exec(spot.slice(spotAt));
if(spotParagraphEnd){const spotInsert=spotAt+spotParagraphEnd.index+spotParagraphEnd[0].length;spot=spot.slice(0,spotInsert)+spotRule+spot.slice(spotInsert);}
else spot=spot.trimEnd()+"\n\n"+spotRule;
await fs.writeFile(path.join(evidence,reportName),report+"\n",{flag:"wx"});
for(const [file,text] of texts)await fs.writeFile(path.join(item,file),text);
for(const [index,text] of [runtime,shared,spot].entries())await fs.writeFile(path.join(root,ownerFiles[index]),text);
const markerText=await fs.readFile(path.join(root,candidate.bundle,"sky/sub-vendors.js"),"utf8");
const marker="所选红外影像与光学影像的来源",escaped=Array.from(marker,character=>"\\u"+character.charCodeAt(0).toString(16).padStart(4,"0")).join("");
await fs.writeFile(path.join(evidence,"experience-combined-clean-v21-marker-check-2026-09-29.json"),JSON.stringify({scope:"initial checker representation error, not missing production helper",firstAssertion:"source_recovery_consumer_missing",rawChinesePresent:markerText.includes(marker),unicodeEscapedChinesePresent:markerText.includes(escaped),warningCodePresent:markerText.includes("sdss_optical_publication_unavailable")},null,2)+"\n",{flag:"wx"});
const close={scope:"C06/D publication failure and source recovery local development boundary; overall Goal/device/quality remains unverified",candidate:{sha256:candidate.fingerprint.sha256,rawBytes:candidate.fingerprint.totalBytes,rawMain:candidate.rawPackageBytes.main,deltaRaw:rawDelta,deltaMain:0},previousCandidateUnchanged:previous.sha256,
 currentProxy:{pid:19616,execSession:15154,internalPort:running.publicationBackendPort,contextUpstream:8789,epoch:running.epochStartedAt,informationModuleSha256:running.informationModuleSha256},
 contextDataEqual:running.contextDataEqual,revision:running.revision,contextPuts:0,consumerPhases:consumers.rows.length,sourceHashes:consumers.sourceHashes,
 independentReview:"unavailable",nativeComposition:"unverified",sourceImageQuality:"saturation/stripes/registration and whole-scene quality remain open",reportSha256:createHash("sha256").update(report+"\n").digest("hex")};
await fs.writeFile(path.join(evidence,closeName),JSON.stringify(close,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({report:reportName,candidate:close.candidate,currentProxy:close.currentProxy,goal:"active"}));
