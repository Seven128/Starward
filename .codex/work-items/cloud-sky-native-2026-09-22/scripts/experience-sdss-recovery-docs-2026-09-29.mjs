import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const v=JSON.parse(await fs.readFile(task+'/evidence/experience-sdss-recovery-native-validation-2026-09-29.json','utf8'));
const candidate=JSON.parse(await fs.readFile(task+'/evidence/experience-combined-clean-v29-candidate-2026-09-29.json','utf8'));
const report='experience-sdss-image-recovery-2026-09-29.md';
const text=`# SDSS 光学影像的公开失败恢复与共享重试修复

已完成本地开发闭环：同一v29中，M82细档真实HTTP503后点击公开重试，仍失败时保留中档光学图及独立资源；恢复后真实细档200、文件摘要和画面作用成立。两次独立来源Back恢复同一观察Context、M82身份、0.05°视角和星图区。不是手机、原生GPU/解码故障、弱网取消或整体Goal验收。

只改变云观星：九个Sky生产owner及两个相关测试；没有新渲染器或重做来源数据。地图CSS SHA81283f7b…保持，v27未采用，其它业务模块没有修改。全部原商业取舍、排除理由、完整旅程及33项义务继续有效；大字号仍暂停。

原生v28在0.05°首次细图503保中档；再次公开重试却无条件执行Canvas resize，使共享图片owner释放，后续仍503时只剩W3红外回退。该轮同候选星图区331,010像素改变，中档本地文件消失。这是实际错误，不是额外画面精修。生产页面回归在修前失败：不应重建Canvas的HTTP重试实际重建1次。

现有createSkyArtworkLoader.retry已经返回是否需要恢复GPU的标志，页面及八个出版hook此前丢弃它。现在这些hook保留该结果，页面通过同一个retryNativeImage入口条件重建Canvas；星座、SDSS、广域W3、2MASS、月面、水星、火星、共享OPAL四行星及地景消费者使用同一规则。普通网络/文件/解码失败重试只重启失败项并刷新发现，不释放独立有效图；已有GPU错误仍重建owner。既有目标W3兼容文件/解码恢复路径保留其独立责任，未借本轮冒称全面改造或原生GPU验证。

| 同候选原生结果 | 实际证据 |
| --- | --- |
| v29总览/中档 | 真实200，分别19,934/23,280B；自然公开缩放45→15.2→5.1→1.7→0.56→0.26→0.10° |
| v29细档503与再次公开重试503 | 恰好两次实际SDSS细图503，无自动重试循环；中档MD5与全部既有encoded文件集保持，0.05°星图区0像素改变 |
| v29恢复细档 | 真实200/19,100B/field0.0568888889°；native文件MD5对应原发布DETAIL，仍保中档，画面318,643像素改变，排除空成功/旧图假恢复 |
| 自然中心点选 | 通过实际Canvas size/offset测量，选中M82/NGC3034/Cigar Galaxy；同Frame方位21.9°/高度27.5° |
| 来源及两次Back | 来源明确SDSS历史g/r/i、CC BY4.0、北上东左、有限中央视场、覆盖未测、边缘显示淡出；真实滚动原图已观察英文/中文及URL换行。两次Back各0像素改变，Context/revision/时刻/选择保留 |

像素只在各自427×919原始捕获的x4–423/y100–890星图区比较，不缩放、不跨代比较。历史v28证据为SDK3.17.3，本轮v29实际读取3.17.4，本轮未读取v28 SDK；不声称跨候选SDK匹配。普通星空控件/modal仍在Canvas-only捕获中不可见，native WXML及SDK操作不能代替目标合成验收。独立来源页的实际显示另行观察。全部17张原始捕获已由主agent查看，属于自查。

当前固定v29 SHA${candidate.fingerprint.sha256}，257文件/4,486,805rawB，main2,089,891、content1,012,055、sky961,242、spot423,617B；相对v28只变Sky JS和候选project配置，增加122rawB，其它分包不变。绑定106生产输入，其中原99保持非本次owner的哈希，另外七个hook本轮首次单独入册，不伪造其旧哈希。首个构建误用环境变量，选默认8787，未打开/采用；r2明确MINIAPP_API_BASE=8791后才冻结。已有三条构建警告保留。

适用检查：实际页面修前失败、共享owner/请求/取消/生命周期/禁用商业光学trial等行为33例通过；新测试类型修复后两受影响文件10例及Mini类型通过；实际native-image owner/encoded格式/受控GPU上传链七例通过。最初不存在的GPU-textures测试参数没有运行，不计其覆盖。构建r2通过。生产代码在这些检查后未再变；不是目标性能或最终审查。

原故障通道只处理目标W3的level查询，不能拿它证明SDSS图片恢复。本轮按SDSS不可变DETAIL文件名增设独立有界503/一次正文暂停；8792先用真实编译服务验证粗/中档200、细503、pass细200和原字节释放，再替换任务自有8791。原8789保持，替换前后当前native durable Context完整data摘要a2da26f7…相等，未转移/持久化ContextID。当前8791/PID4924/exec17379、controller64485、epoch09:14:20.175Z，source/context/resource pass、held/active0、该epoch PUT1/200属于v29公开次日05:00提交。旧epoch PUT1属于v28，两者分记。staging/PID32216及旧8791/PID1144退；共享8787/8788未动。

唯一原生窗口v29/PID25916，标准DAY，W3/赤道OFF、星座/地景/地平意愿ON，无跟踪/modal/list/timepanel。公共示例点22.4826799N/114.5557147E，民用2026-09-30 05:00 Asia/Shanghai，观测夜09月29日，UTC2026-09-29T21:00Z/revision2，M82中心0.05°。新Context SHA c5c224f7…/fingerprintc197391c…区别于v28，不冒称原会话。4208亮星目录对象/3目标不是当前绘制数。

[冻结验证](experience-sdss-recovery-native-validation-2026-09-29.json)、[固定候选](experience-combined-clean-v29-candidate-2026-09-29.json)、[转发替换保Context](experience-sdss-proxy-replacement-2026-09-29.json)和[本地故障机制检查](experience-sdss-fault-transport-check-2026-09-29.json)为证据入口。v28 trace48事件SHA${v.traces[0].sha256}；v29 trace75事件SHA${v.traces[1].sha256}，均冻结，不再追加/覆写。图片和相关命令见各记录。

下一依赖由唯一PLAN管理：继续同v29的SDSS真实正文延迟/公开取消/恢复，结合另一适用目标及实际尺度/来源/点选核查；本轮准备的hold控制未在原生执行，不能记为已验。随后按新真实输入处理配准、覆盖及整场辨认差距。解码/GPU故障、其它模式组合、目标控件合成、真实姿态/OS后台、Android/iOS、新月面手机、性能/官方包体/费用和最终必要独立审查仍开放。手机当前禁用，不调用设备或预览；不以这些依赖阻塞独立Sky开发，也不以M82或六个光学目标缩减原始范围。
`;
await fs.writeFile(task+'/evidence/'+report,text,{flag:'wx'});
let plan=await fs.readFile(task+'/PLAN.md','utf8');
await fs.writeFile(task+'/PLAN-HISTORY-before-v29-2026-09-29.md',plan,{flag:'wx'});
const oldHead=plan.match(/\*\*当前：[\s\S]*?\*\*\r?\n\r?\n\*\*恢复与证据：\*\*[\s\S]*?(?=\r?\n\r?\n\*\*范围与责任)/)?.[0];assert(oldHead);
const head=`**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。唯一v29/PID25916，SHAe5e2baaf4feab03c82ad8dc8bd8faa657e995207fe38a338d744630b6bea75b5，257文件/4,486,805rawB；九个Sky owner复用共享loader的GPU重试结果，普通HTTP/解码重试保有效图，真实GPU失败仍重建。相对v28只变Sky JS/project配置，raw增加122B，其它分包/地图源码保持。实际M82三档、细503/再次公开重试503保中档、恢复细200/摘要/画面作用、自然点选与两次来源Back已核。当前公共示例点、民用2026-09-30 05:00 Asia/Shanghai、观测夜09-29/UTC21:00/revision2，M82中心0.05°手动，DAY/标准字号，4208亮星目录对象/3目标。新Context区别v28；无跟踪/modal/list/timepanel，星座/地景/地平ON，W3/赤道OFF。SDSS原生弱网取消/解码/GPU、整场质量/配准覆盖/控件合成、Android/iOS/新版月面手机/真实姿态/OS后台、目标性能/官方包体/费用与最终必要审查仍开放。**

**恢复与证据：** [光学失败恢复与共享重试](evidence/${report})及[冻结绑定](evidence/experience-sdss-recovery-native-validation-2026-09-29.json)是最新入口。v28首次503保中档但公开重试释放有效图，现v29重复503星图区0差/encoded文件集不变；恢复细档画面有真实作用，两次来源Back各0差。新candidate绑定106生产输入，七个hook本轮首次入册，不伪造旧哈希。v28/v29本轮trace48/75事件、17原图已冻结；历史银河v28及更早证据保其原条件。只做同候选像素比较；当前SDK3.17.4，不冒称与历史v28 SDK3.17.3匹配。当前Context SHAc5c224f7…/fingerprintc197391c…、revision2；8791/PID4924/exec17379保8789原owner，epoch09:14:20.175Z/本epoch PUT1(200)、controller64485，source/context/resource pass、held/active0。旧epoch/v28 PUT1分记；staging和旧8791已退，共享8787/8788未动。一次已授权审查已结束，无需复派，本次变化最终必要审查仍保。`;
plan=plan.replace(oldHead,head);
plan=plan.replace(/按用户要求，历史闲置及替代项目窗口已退[^\r\n]*/, '历史闲置及替代项目窗口已退，当前只保一个已打开v29窗口；原v28保冻结证据。构建/证据和共享8787/8788保留，8789保内存，8791按当前公开出版及有界任务故障通道运行。实际候选/Frame/Context与本次source作用已绑定，CLI成功不替代产品/目标验收。');
plan=plan.replace(/1\. \*\*固定基线[^\r\n]*/, '1. **固定基线：v29当前，v28/v26/v25证据保范围。** 当前共享图片重试修复只变九个Sky owner，包只变Sky JS/project配置；106生产输入、实际页面修前失败/修后行为、类型与r2构建已绑定。其它分包和地图CSS不变，v27未采用。唯一PID25916、公共示例点/次日05:00/观测夜09-29/revision2，M82中心0.05°、DAY/标准字号，新Context区别旧候选；8791保原8789，epoch09:14:20.175Z/current PUT1与旧epoch/v28 PUT1分记。干净loopback候选不推手机。');
plan=plan.replace(/4\. \*\*唯一下一依赖：[\s\S]*?(?=\r?\n\r?\n5\. \*\*)/, '4. **唯一下一依赖：C/D影像取消恢复及B3/C整场剩余质量。** 修改只限Sky职责，共享文件只处理确需的Sky行为，不顺带修改其它业务。大字号暂停、标准字号/长来源保留；地图CSS保持、v27未采用。本轮SDSS M82正常三档、真实DETAIL503/公开重试仍503保中档、公开恢复DETAIL200/文件/画面、自然点选及两次来源Back已闭合开发证据；页面原无条件Canvas reset导致有效图丢失的缺陷已用共享loader标志修复，八出版hook与实际页面消费者不再丢弃GPU恢复条件。下一步同一v29通过公共定位核SDSS真实正文延迟/公开取消/恢复，结合另一适用目标的实际尺度、来源、点选；本轮hold控制仅在staging验证，未在原生执行，不冒称已过。随后按真实输入/画面继续配准、覆盖和整场辨认差距，解码/GPU故障及其它模式按机制/风险闭合。银河v28因果/平滑与全天/红光适用证据保原，M42有限条带/饱和和W3源块状条带仍归原owner，不重做月面/HiPS获取加工。普通控件/名称/modal是Canvas-only捕获缺口；只有新目标/捕获依据才重开实际合成定位，不重复样式/安装源码研究或盲改cover-view。参考须核实际相机、地点、时刻、视场定义、SDK/视口等差异；总览会转向天顶，不能仅凭目标名/FOV称匹配。目标冷启动/资源/OS后台、完整旅程、真实姿态/旋转校准/Android/iOS义务保留，手机不可用时继续独立Sky工作。');
plan=plan.replace(/当前运行：分支[^\r\n]*/, '当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换。唯一v29/PID25916，M82中心0.05°手动，公共示例点/次日05:00/观测夜09-29/UTC21:00/revision2，Context SHAc5c224f7…/fingerprintc197391c…；DAY/标准字号，无跟踪/modal/list/timepanel。星座/地景/地平ON，W3/赤道OFF。8789/PID22124/exec54820保内存，8791/PID4924/exec17379/controller64485，epoch09:14:20.175Z/current PUT1(200)，source/context/resource pass、held/active0。旧8791/PID1144/staging32216退，共享8787/8788未动。v28/v29本轮trace48/75事件已冻结，17原图全部观察，同v29重复失败与两次来源Back星图区0差；历史银河和更早组合保原，不跨代/SDK作像素等同。地图CSS SHA81283f7b…保持，v27未采用。下一依赖见阶段4。');
plan=plan.replace('SDSS M51局部准入；PS1/SkyMapper尚未准入','SDSS已准入的目标切图；PS1/SkyMapper尚未准入');
plan=plan.replaceAll('其它模式/SDSS影像失败/解码/GPU/弱网及目标组合仍待验','其它模式/SDSS弱网取消/解码/GPU及目标组合仍待验；本轮v29 SDSS M82 HTTP503/重复重试保中档/公开恢复/来源Back另有绑定开发证据');
plan=plan.replace('当前是固定v28开发候选，本轮银河整场/原生组合与资源/成本证据保其范围','当前是固定v29开发候选，本轮SDSS共享重试/原生HTTP重复失败与恢复有适用证据；银河v28整场/原生组合及成本证据保原范围');
plan=plan.replace('在同一v28干净候选按公共定位走当前SDSS光学影像的正常链','在同一当前候选按公共定位走适用影像组合');
await fs.writeFile(task+'/PLAN.md',plan);
for(const file of ['STATE.md','INDEX.md']){let source=await fs.readFile(task+'/'+file,'utf8');const from=source.indexOf('**当前：'),to=source.indexOf('\n\n**范围与责任',from);assert(from>=0&&to>from,file);source=source.slice(0,from)+head+source.slice(to);await fs.writeFile(task+'/'+file,source);}
await fs.appendFile(task+'/PROGRESS.md',`\n\n## 2026-09-29 SDSS原生重复失败反例及共享重试修复\n\n本轮完成当前唯一PLAN的光学HTTP失败恢复依赖，发现并修复公开重试无条件重建Canvas/丢有效粗图的真实反例。复用原共享loader的GPU标志并迁移全部受影响Sky图片消费者；其它模块/地图CSS不变。固定v29只变Sky JS/project配置，257文件/4,486,805rawB。真实SDSS细503/重复公开503保中档、恢复200/文件摘要/画面作用、自然M82点选与两次来源Back成立，17原图均看，v28/v29 trace48/75事件冻结。适用行为、类型、r2构建通过；源数据/版权/商业取舍/33义务保原。旧转发进程替换仅为独立SDSS故障机制，保8789/native durable Context，当前8791/PID4924/exec17379/controller64485、epoch09:14:20.175Z/current PUT1/200，source/context/resource pass、held/active0。SDK/Canvas捕获/目标限制均保；无手机/云部署/新增子Agent。下一步同v29真实SDSS正文延迟/取消/恢复及另一适用目标，按PLAN推进整体质量与未验机制。详[evidence/${report}](evidence/${report})。\n`);
const owner='project_context/architecture/runtime-and-domain.md';let context=await fs.readFile(owner,'utf8');
const anchor='An independently optional wide-sky image layer publishes only the twelve';assert(context.includes(anchor));
const fact='Published native image retries keep their existing shared responsibility in `createSkyArtworkLoader` and `useSkyNativeImages`: a retry returns whether a recorded GPU failure requires a new GPU/Canvas owner. SDSS optical, wide-field W3, 2MASS, Moon/Mars/Mercury and the shared OPAL publication hooks preserve this result while refreshing their manifests; the commercial-disabled optical trial returns false without issuing requests. `spot-sky-page.tsx` routes these, constellation artwork and landscape through one conditional retry consumer. Transport/file/decode failures restart failed requests while retaining independent valid images and the current Canvas; they do not unconditionally resize and dispose every image owner. Recorded shader/upload failures still reset the GPU generation. This does not change the separate selected-object W3 compatibility file/decode recovery owner or certify native GPU/OS/device acceptance.\n\n';
assert(!context.includes('Published native image retries keep their existing shared responsibility'));
context=context.replace(anchor,fact+anchor);await fs.writeFile(owner,context);
console.log(JSON.stringify({report:task+'/evidence/'+report,currentPlan:task+'/PLAN.md',history:task+'/PLAN-HISTORY-before-v29-2026-09-29.md',contextOwner:owner,scope:'Sky only',next:'same-v29 SDSS delayed-body cancellation/recovery; broader quality remains'}));
