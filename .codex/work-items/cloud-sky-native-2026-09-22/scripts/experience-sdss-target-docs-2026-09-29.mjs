import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root=process.cwd(),item=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22");
const evidence=path.join(item,"evidence");
const load=async file=>JSON.parse(await fs.readFile(path.join(root,file),"utf8"));
const candidate=await load(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-v20-candidate-2026-09-29.json");
const running=await load(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-running-adoption-2026-09-29.json");
const checked=await load("output/playwright/cloud-sky-sdss-targets-0929-verified/result.json");
const before=await load("output/playwright/cloud-sky-sdss-targets-0929/result.json");
const final=await load("output/playwright/cloud-sky-sdss-targets-0929-final/result.json");
assert.equal(checked.rows.length,15);assert.equal(checked.resources.created,checked.resources.deleted);
for(const row of checked.rows) assert.equal(row.sha256,final.rows.find(old=>old.name===row.name).sha256,"explicit return-owner repair preserves the final pixels");
const unchangedControls=["M-82-optical-unavailable","M-82-red","M-82-next-frame"].map(name=>{
 const old=before.rows.find(row=>row.name===name),current=checked.rows.find(row=>row.name===name);
 assert.equal(current.sha256,old.sha256,"independent fallback and control pixels remain unchanged");
 return {name,sha256:current.sha256};
});
const storage=[];
for(const reference of ["M:63","M:64","M:81","M:82","M:87"]){
 const directory=path.join(root,"workers/miniapp-api/assets/deep-sky/sdss-"+reference.replace(":","").toLowerCase());
 const files=await fs.readdir(directory);let bytes=0;
 for(const file of files) bytes+=(await fs.stat(path.join(directory,file))).size;
 storage.push({reference,files:files.length,bytes});
}
const report=String.raw`# C06 光学目标覆盖与共享合成：2026-09-29

这是唯一PLAN当前独立项的接续：M63/M64/M81/M82/M87已有实际输入，沿现有SDSS出版、Mini加载、TAN/GPU和来源链接入；原M51兼容。没有重选引擎/新渲染器、源站运行时请求、云发布、新DevTools窗或手机操作。完整体验Goal仍active，无预算；本轮不是完整质量/目标验收。

## 输入准入与边界

复核[SDSS图像使用政策](https://www.sdss.org/collaboration/image-use-policy/)及其[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)链接，保Sloan Digital Sky Survey、许可/处理/原图入口，不表示背书。[JPEG官方生成说明](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/)及[成像获取](https://www.sdss.org/dr18/imaging/tools/)仍控制历史g/r/i与footprint/CAS/SAS边界，不由可下载推断全天高清或连续批量承载。

现有OpenNGC目录身份/中心用于五目标请求；查询footprint的第一条UNION请求500，诊断响应指出SQL拼接错误，不能当无覆盖。改成五个标量列的一条SELECT、显式%20编码后200且五中心TRUE；共三次SQL请求，原失败保留。参数0.001的单位未在本批次独立验证，证据只用于请求中心准入，不宣称整图、每波段或科学有效面积。随后串行15次固定512px JPEG GET、无overlay/重试环；新增原图共271,892B，全SHA/长度/JPEG完整解码/尺寸一致。未编辑像素，未重新下载月面/AllWISE，也未扩大排除项。

样本目录[sdss-target-admission-0929](sdss-target-admission-0929/)含原请求、SQL失败及恢复、全部原JPEG、获取记录、完整解码和本地出版元数据。原图15张均已目视；M63概览有远离中心的红条纹，多个细档明显饱和，M81/M87等中心细档覆盖有限。它们是原显示合成品，不能据此承诺自然真彩、测光/实时天气或完整科学逐像素覆盖；未以黑阈值、补洞或修图掩盖。中心/可解码/代码接入不等于整体影像质量通过。

## 同一责任链

共享合同SDSS注册表绑定每个已准入出版的完整元数据hash、尺度、身份与精度/许可内容；BFF与Mini不再各维护一份M51资产pin。BFF按已准入参考加载固定本地清单、核真实目录中心与每次JPEG SHA，hash/file不能跨对象借图。原M51 schema、hash及64,352B三原JPEG不变；新增五目标用target-v1清单和独立hash。M81较大21.63′目录长轴使用3.2″/px概览，未沿用只能包13.65′的旧概览。普通目标选档保原适用范围，M81依据实际尺度扩大，不发全目录或源站动态请求。

Mini沿原bare资源边界按已准入hash取得新目标，仍保M51默认接口；校验完整清单/下载身份。查询key和图片id带参考，native owner带出版hash，上一目标迟到数据不冒充新对象；同目标适用粗档在细档加载/失败时保留，显式重试，原两图解码预算及请求/文件/Canvas/GPU释放owner不变。场景按实际参考取同刻目录点，只有共享TAN origin/尺度输入的真实区别；SDSS继续512px/256.5原点，未重做M51亚像素研究或改CRPIX。资料/来源和原图链接支持六个固定出版，已绘来源/信用跟实际提交帧，页面加载/失败文案不硬编码M51。

第一批实际GPU图发现明显直线矩形边界以及边缘外另一波段W3。修复的是共享合成责任：成功绘出的目标光学cutout优先，既不与当前对象W3也不与滞留旧目标W3合成；光学缺失/拒绘/离开视场仍可绘独立W3。共享artwork shader复用已有8%边缘smoothstep，只在光学边缘淡出，内侧颜色/有限暗像素不作缺测分类；source-over而非叠光。星座插画、广角W3和其它天体共用原GPU但保各自语义。原JPEG/坐标/视场/科学覆盖不变，来源说明显示淡出与历史波段选择。已知源饱和/条纹仍不算修复，不能从画面变柔和声明质量完成。

## 证据与实际范围

- 修前真实HTTP把M63查询替成M51，实际scene不能在M82位置画其图；来源下载只支持M51；旧合成实际同时提交两个波段。四组失败日志保留，修后检查在实际owner/消费者有非空结果。
- Mini合同/实际client URL边界/来源链接/目标切换迟到解码/粗档失败恢复/共享native生命周期与已提交页标签共29项过；修复返回owner后重跑16项scene/页消费者过。BFF实际Nest/Fastify资源与资料9项过，实际18原JPEG SHA及跨对象404成立。Mini类型、合同与BFF编译过。
- [15场景软件GPU](../../../../output/playwright/cloud-sky-sdss-targets-0929-verified/result.json)来自真实编译后controllers/服务，显式Memory/weather测试ports；Spring历史晚间示例点22.4826799N/114.5557147E、Asia/Shanghai、2026-04-01T14:00Z，真实计算太阳低于-18°且六目标在地平以上。六目标概览/细档、M82缺光学回退/红光/换时均经生产renderer、实际HTTP原图、完整相机/帧。不是当前天气、Taro控件、native或手机验收，也不是Stellarium整体验收比较。
- 修前原图、修后图与中间类型失败均保；当前图与修后图15/15像素相同，独立W3回退/红光/换时三控制图与修前SHA也相同。观察矩形硬边明显减轻；仍可辨有限cutout，科学/整体影像质量开放。GL错误0、图片失败0、纹理13创建/13退休；该计数不是GPU/native峰值或性能预算，fixture预解码多目标亦不是产品缓存。
- 第一次任务backend缺未挂载的恒星controller而404，补同一真实静态controller后过；不是额外产品服务。第一次构建错用了slot变量，落默认可再生weapp-check缓存；原日志保留，正确slot隔离构建才是v20，未打开该默认缓存。原v19指纹实际不变。

当前运行只替换确认归本任务的8791代理，8789原内存Context/BFF和共享8787/8788保留；新公开SDSS GET/HEAD也使用同进程当前编译controllers，Context/报告/普通入口仍8789。当前8791 PID31448/exec98346、随机内部loopback53462随代理退休，epoch ${running.epochStartedAt}。独立测试Context仅在内存持有，替换前后完整data相等，Context PUT0、pass/pass、held/active0；18实际JPEG/六来源及默认/固定清单读回过，替换中不可达检查${running.unavailableChecks}次如实记录。[运行接入](experience-sdss-running-adoption-2026-09-29.json)不是旧v12 native Context恢复、8789全域升级或云部署。没有重试失败原生RPC/被取消提权，没有删除4B夹具，旧native Frame/Context/文件状态仍未知。

clean-v20 prepared未打开：${candidate.fingerprint.sha256}，257文件/${candidate.fingerprint.totalBytes} rawB，主包${candidate.rawPackageBytes.main}B；较v19主包+3,917B，Sky -602B，既有webpack三警告保留。实际其它chunk部分内容因模块映射改变而字节不增；不是只两文件改动。无diag/mock/代次/vConsole/maps，loopback8791不能推手机，rawB不是官方包体。候选绑定当前SDSS/GPU/source输入及运行出版，原v19未改；没有用旧手机证据验收本版。

## 剩余义务与成本

五目标新增图271,892B；含本地五清单共${storage.reduce((sum,row)=>sum+row.bytes,0)}B，明细见close记录。获取仅前述15图/三SQL；生产请求不去源站。没有新增逐项商业申请费、采购或云发布；加工/存储/流量/算力、Agent有效工时、项目方参与、实际现金仍分别核算，未知不记零、不折薪或叠共享主机整月。当前对话本次续作起始20:02:58 UTC至20:43:14约40分钟只是该段墙钟，非全部C06/有效工时/计费值。

独立审查尚无，当前为自审/开发证据，不能冒称独立。全流程、B3/C环境与源质量/其它配准/覆盖、真实姿态/校准/OS后台、Android/iOS、新月面手机、资源性能/官方包体/弱网与实际费用继续。当前依赖看唯一PLAN：安全取得原生后先核旧v12/4B/Context并退休旧会话，再以一个v20集中测组合旅程和六目标来源/粗细档/恢复；不可取得时继续同阶段实缺口，不能重复同一源站获取/亚像素/已完成profile或无限精修图片。
`;
await fs.writeFile(path.join(evidence,"experience-sdss-targets-2026-09-29.md"),report+"\n",{flag:"wx"});
const reportName="evidence/experience-sdss-targets-2026-09-29.md";
const checkpoint=`**当前检查点：Goal active、无预算；完整体验继续，真机不可用。** C06已沿原SDSS链加入M63/M64/M81/M82/M87（三档原图/共享合同、加载、注册、GPU/来源），M51旧schema/hash/字节保持。实际GPU硬边及跨波段边缘已在共享合成纠正，缺/失败光学保W3、红光隐藏；源条纹/饱和及质量/配准不提升验收。详[光学覆盖与共享合成](${reportName})。clean-v20 prepared未打开，SHA ${candidate.fingerprint.sha256}，257文件/${candidate.fingerprint.totalBytes} rawB、main${candidate.rawPackageBytes.main}B（+3,917B，不是官方包体）。8791 PID31448/exec98346、内部53462为当前出版读owner，8789 Context保留；完整独立测试data跨替换相等、六来源/18JPEG过、pass/pass/held0/active0。旧v12 native Frame/Context/4B仍未知，没有新DevTools窗/手机/取消提权重试/云/Git提交动作。投影及旧测试/手机证据保各自范围；全流程、B3/C质量/合法覆盖、真实姿态/校准/后台、Android/iOS、新月面手机、性能/官方包体/费用/独立审查仍开放。唯一当前依赖见PLAN，Goal未完成。`;
for(const file of ["STATE.md","INDEX.md"]){
 const target=path.join(item,file);let value=await fs.readFile(target,"utf8");
 const start=value.indexOf("**当前检查点：");assert(start>=0);
 const end=value.indexOf("\n\n",start);assert(end>start);
 value=value.slice(0,start)+checkpoint+value.slice(end);
 value=value.replaceAll("最新准备：clean-v19，","历史准备（当前v20，原v19未改）：clean-v19，");
 await fs.writeFile(target,value);
}
let plan=await fs.readFile(path.join(item,"PLAN.md"),"utf8");
plan=plan.replace("最新clean-v19 prepared、未打开，含新版加载","此前clean-v19 prepared、未打开；当前v20见下方C06，原v19未改。v19含新版加载");
plan=plan.replace("当前8791 PID19496／exec75849、内部loopback49682同进程退休","该轮8791为PID19496／exec75849、内部49682；当前已在C06接入轮替成PID31448／exec98346、内部53462同进程退休");
plan=plan.replace("再用一个v19核服务出版版本","再用一个v20核服务出版版本");
plan=plan.replace("同时收新月面、M51来源/失败恢复和对象真实差异","同时收新月面、已接入光学目标来源/失败恢复和对象真实差异");
const marker="   **当前接续的独立项：C06合法光学目标覆盖。**";
const start=plan.indexOf(marker);assert(start>=0);const end=plan.indexOf("\n\n",start);assert(end>start);
const next=`   **C06合法光学目标覆盖已接开发链，下一依赖为同一v20的源/组合恢复与质量。** [本轮路径](${reportName})用现有目录/公开许可、中心footprint和15实际原JPEG加入M63/M64/M81/M82/M87；与M51同一SDSS服务/合同/加载/注册/GPU/来源，旧M51清单/hash/字节保兼容，M81概览根据实际角尺寸扩大。切换目标隔离迟到清单/图片，粗档失败保留和显式重试沿共享owner；当前运行8791六来源/18JPEG和完整独立测试Context跨替换读回成立，保8789内存与共享服务。实际首批图的矩形硬边/跨波段边缘已在同一GPU纠正：光学绘出选择一个目标波段，边缘只显示淡出，缺/拒绘/离屏保W3；原图/几何/科学覆盖未改。源饱和/条纹仍未修，不从footprint、JPEG或淡出推断完整质量/覆盖，不扩大成全天或源站持续抓取。v20 prepared未打开，main+3,917B、raw不是官方包体；原v19指纹保持。可安全恢复原生则按上段同一v20核进入/缩放识别/搜索点选/时间跟踪/返回、C09和六目标来源/粗细档/故障恢复；不能恢复则继续所属C/B3/D实际独立差距，下一可核项为资料来源边界的出版异常与恢复（目录/独立层保留、已绘出版不冒用来源），先用现有owner复现，再作有必要的批量修复。不要重取本批样本/重做M51亚像素/重复完成profile。原生/手机、新月面、整体环境/源质量/其它配准与合法覆盖、性能/官方包体/费用/独立审查继续。`;
plan=plan.slice(0,start)+next+plan.slice(end);
plan=plan.replaceAll("最新准备：clean-v19，","历史准备（当前v20，原v19未改）：clean-v19，");
await fs.writeFile(path.join(item,"PLAN.md"),plan);
await fs.appendFile(path.join(item,"PROGRESS.md"),`\n\n${checkpoint}\n\n实际准入/共享链、四种修前反例、影像场景与当前运行接入已保原证据。局部源码/软件结果不提升完整旅程或质量；本次工作已推进，不是只因native不可用反复报告。当前唯一依赖见PLAN。\n`);
const close={scope:"C06 local publication/consumer/shared composition and running adoption; no goal/device/quality completion",candidate:{sha256:candidate.fingerprint.sha256,rawBytes:candidate.fingerprint.totalBytes,rawMain:candidate.rawPackageBytes.main},
 storage,resources:checked.resources,checkedScenes:checked.rows.length,unchangedControls,
 currentProxy:{pid:31448,execSession:98346,internalPort:53462,contextUpstream:8789,epoch:running.epochStartedAt},
 independentReview:"unavailable",nativeAcceptance:"unverified",sourceQuality:"saturation/stripe restrictions remain",
 sourceHashes:candidate.opticalInputs,reportSha256:createHash("sha256").update(report+"\n").digest("hex")};
await fs.writeFile(path.join(evidence,"experience-sdss-targets-close-2026-09-29.json"),JSON.stringify(close,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({report:reportName,candidate:close.candidate,storageBytes:storage.reduce((sum,row)=>sum+row.bytes,0),controlsUnchanged:unchangedControls.length,scenes:checked.rows.length,goal:"active"}));
