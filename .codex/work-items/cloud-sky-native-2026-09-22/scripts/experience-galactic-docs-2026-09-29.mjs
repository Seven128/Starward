import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22"), evidence = path.join(task, "evidence");
const read = async file => JSON.parse(await fs.readFile(path.join(evidence, file), "utf8"));
const native = await read("experience-galactic-native-validation-2026-09-29.json");
const causal = await read("experience-galactic-causal-validation-2026-09-29.json");
const cost = await read("experience-galactic-cost-2026-09-29.json");
const candidate = await read("experience-combined-clean-v28-candidate-2026-09-29.json");
const report = path.join(evidence, "experience-galactic-background-2026-09-29.md");
await assert.rejects(fs.access(report), { code: "ENOENT" });
const root = process.cwd().replaceAll("\\", "/");
const text = `# 云观星银河背景、浏览辨认与 v28 接续

用户范围只限云观星。当前只改两个 Sky owner：共享 sky-gpu-renderer 中的银河背景采样和 spot-sky-page 的来源说明。目录、日月行星球面/相位、资源/文件/相机 owner 及其它业务源码未改；v26 的 99 个绑定生产输入仅这两个变化。新包只改变 project.config.json 和 sky/detail/index.js。地图样式仍为撤回前 SHA81283f7b…，未采用含撤回探索的 v27。大字号继续暂停，Goal active、无预算、未完成，原33项义务和商业排除理由不变。

完整生产场景的[同帧因果对照](experience-galactic-causal-validation-2026-09-29.json)复用已取得的 2MASS JPEG（e3a70f83…）、当前原生 v26 revision2 对应的 BFF 报告、BSC/SAO 和真实地景/插画图片。首次用 resolve 得到另一个 revision1 会话，未进入比较；随后只读当前页面已提交 Context。没有重复外部下载。输入快照只保渲染所需字段，不保存 opaque Context ID。固定地点22.4826799N/114.5557147E、2026-09-30 05:00 Asia/Shanghai、UTC2026-09-29T21:00Z、逻辑390.4×844；广角朝向由现有全天浏览相机计算，不凭目标名称推断。

软件 WebGL 中六场景各比较真实出版图、现有示意回退和仅用于研究的禁用对照。18个修前与18个修后完整结果共用完全相同输入，实际目录坐标/身份/点选、地景及独立图层保持。禁用对照使粗颗粒消失，确认其来自被放大的全景红外点源。研究开关没有进入产品。修复在源像素被放大时连续平滑背景，保留原图、色彩、注册和目录星点，不添加缺测 mask、不撤掉银河、不引入新图片/上传/纹理；全天原图、红光和示意回退的适用输出完全相同。已查看整幅实际修前/修后画面，属于主 Agent 自查，非独立验收。

| 固定场景 | 背景高频显示对比变化 | 目录/点选 | 全天/红光边界 |
| --- | --- | --- | --- |
| 北极星局部45° | 降低49.54% | 相同 | 银河仍有非零实际作用 |
| 北极星识别25° | 降低38.09% | 相同 | 连线/插画同原图层 |
| 北极星总览85° | 降低59.43% | 相同 | 已绘相机按共享 owner 转向天顶 |
| 五车二附近45° | 降低39.29% | 相同 | 银河结构仍保留 |
| 全天267.8°与红光45° | 原图逐像素0差 | 相同 | 原呈现保持 |

这些百分比是修前/修后相对于研究禁用图的 RGB 码值高频贡献统计，限本次实际软件场景；不是辐射定标、天文精度、用户辨认率或验收门槛。平均背景贡献没有被清零；旧渲染器实际结果不能通过同一颗粒降低检查。没有据此认定银河全部质量已达参考。

![同帧修前完整生产场景](${root}/output/playwright/cloud-sky-galactic-causal-0929-before/polaris-local-published.png)

![同帧修后完整生产场景](${root}/output/playwright/cloud-sky-galactic-causal-0929-after/polaris-local-published.png)

[同页交替成本观察](experience-galactic-cost-2026-09-29.json)保两份生产 renderer、同数据/解码图，4暖机对和12交替测量对。45°提交中位7.70→7.05ms、p95 11.10→10.20ms；85°中位8.80→9.60ms、p95 9.70→12.20ms，广角开销增加如实保留。初次提交及显式drain合计45°106→111.1ms也保原记录。显式drain中位为0不代表GPU成本为0，提交可能包含同步等待。稳定绘制无新上传，两实际GPU owner退休4纹理→4释放；这是实验同时存在两个owner的计数，不是手机/GPU总峰值或目标帧率。新增滤波成本需目标验证，不设臆造预算。

21项相关行为检查和Mini类型检查通过；完整v28编译exit0，保原3项构建警告。干净[候选绑定](experience-combined-clean-v28-candidate-2026-09-29.json)：SHA${candidate.fingerprint.sha256}，257文件/${candidate.fingerprint.totalBytes.toLocaleString("en-US")}rawB，较v26增1605B，仅sky包增量；无诊断/夹具/代次/vConsole/maps，AppID未变。原v26包保留且指纹不变。loopback8791只用于本地开发，不推手机。

原生[冻结绑定](experience-galactic-native-validation-2026-09-29.json)记录${native.trace.events}事件/${native.captures.length}原始427×919图，trace SHA${native.trace.sha256}。仍只有v28/PID25916。新项目通过公开搜索/正式点选择/云观星入口进入；方向不可用时不伪造手机姿态，手动入口绘制。公开时间轴从21:00提交次日05:00，revision1→2、当前epoch唯一PUT200。v28是新的 durable Context（SHAfb3474ce…/fingerprint55241519…），不同于v26；同地点/时刻可比，不称同会话。实际Canvas尺寸仍390.3999939×844，而主机截图缩放变了，不能跨候选直接作像素比较。

公开中文北极星搜索唯一Polaris/HR424→资料显示方位359.6°/高度23.0°→定位45°。按实际Canvas size/offset测量的自然中心tap再次得到同身份；独立来源页显示HEASARC/IAU/Wikidata对应来源，公开Back仍是Polaris，关闭资料保持Context和45°画面。随后45→81.8→45→25.2→45连续浏览，25.2°实际可见连线/插画。公开银河来源回读新显示说明与原处理/链接，但Canvas-only截图不认证其普通覆盖层可见合成。继续缩放253.2→274.9°后，完整圆盘位于原图内；此运行的实际最大视场不同于v26的270.2°，不凭旧值宣称同相机。公共Sky Back→原入口→再次进入→手动→中文搜索定位恢复Polaris45°，同v28已提交Context。

![当前v28原生局部](${root}/.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-v28-native-galactic-final-polaris-45-2026-09-29.png)

同v28原图的x4–423/y100–890星图区，来源Back和退出/重进后各为0像素变化；裁切排除系统栏/胶囊/边缘，未缩放，未设置通过容差。最终DAY/标准字号、Polaris方向45°手动、星座/地景/地平ON、W3/赤道OFF、无跟踪/modal/list/time panel。8791保原8789 Context，epoch06:26:06.812Z/PUT1、source/context/resource pass、held/active0，controller59162不变，共享8787/8788未动。旧冻结trace未追加。

三个原生工具错误保trace：开窗后尚未ready的evaluate、不存在的page/地图sheet selector；随后按实际状态和源码公开入口继续。另一个设备切换工具help返回unknown，未执行设备切换、未重试该猜测工具；实际systemInfo与Canvas尺寸用于可比条件。未把这些工具错误当成产品缺陷或隐去。

普通Sky控件/名称/资料在Canvas-only捕获中的合成仍开放；来源独立页面可见不能替代Sky覆盖层。整场背景/插画及其它影像仍需参考质量审查，SDSS影像HTTP、解码/GPU/弱网机制未借用W3或资料故障证据。新月面手机、真实姿态/完整旋转校准/OS后台、Android/iOS、冷启动/资源峰值/目标性能/官方包体/实际费用及最终必要独立审查未完成。用户手机暂不可用指令继续生效；不操作手机、发布、云部署或Git提交/推送。下一依赖只由唯一PLAN阶段4维护。
`;
await fs.writeFile(report, text, { flag: "wx" });
const current = "**当前：Goal active、无预算、未完成；只改云观星，大字号继续暂停。当前唯一v28/PID25916，SHAf08e89f4d6689dab8e24594d6873bd1a5500280be53da962c9fbd56eace616eb，257文件/4,486,683 rawB；相对v26的99生产输入只改两个Sky owner，包只改变Sky JS与候选project配置。已取2MASS的整场同帧因果定位与局部背景平滑、v28公开搜索/自然点选/来源Back/完整274.9°圆盘/退出重进已补开发证据。当前公开示例点、民用2026-09-30 05:00 Asia/Shanghai、观测夜2026-09-29/UTC21:00/revision2，Polaris方向45°手动、4208亮星目录对象/3目标，DAY/标准字号，星座/地景/地平ON、W3/赤道OFF、无跟踪/modal。v28新Context不同于v26，保地点时刻可比；地图源码未动、v27未采用。普通控件合成、整场质量/配准覆盖、SDSS独立影像恢复、Android/iOS/新版月面手机/真实姿态校准/OS后台、目标性能/官方包体/费用与必要最终审查仍未完成。**";
const recovery = "**恢复与证据：** [银河背景整场因果/原生组合](evidence/experience-galactic-background-2026-09-29.md)和[冻结绑定](evidence/experience-galactic-native-validation-2026-09-29.json)是最新入口。原2MASS图/出版、目录/点选/共享资源owner保持，源像素放大时连续平滑；全天/红光/示意回退适用软件结果0差，广角提交成本增加保原数，不认证目标性能。v28 trace64事件/9原图已冻结；同v28来源Back、退出重进45°星图区各0差。原v26证据保其范围，427×919与479×1035主机缩放不同，不跨代作像素等同。当前Context SHAfb3474ce…/fingerprint55241519…、revision2，与v26不同；8791/原8789及共享服务保留、source/context/resource pass、epoch06:26:06.812Z/PUT1、held/active0、controller59162。一次已授权审查已结束，无需复派；新变化的最终必要审查仍保。";
const stage4 = "4. **唯一下一依赖：B3/C整场剩余质量与云观星影像组合恢复。** 修改继续只限Sky职责，共享文件只处理确需的Sky行为，不顺带修改其它业务模块。大字号暂停、标准字号及长来源保留；地图CSS原字节保持、v27未采用。已取2MASS的同帧生产场景因果对照已完成，粗颗粒归于局部放大的历史红外点源；两Sky owner已做连续显示平滑及诚实来源说明，不改源数据/目录/点选，不新增mask/图片/纹理，全天/红光/示意回退保适用输出。v28已核公开进入、同地点次日05:00提交、Polaris搜索定位与自然点选、来源Back、25.2°星座细层、274.9°完整圆盘及退出/重进；只证适用开发组合，不认证目标整体体验。下一步在同一v28干净候选按公共定位走当前SDSS光学影像的正常链，再补其HTTP失败/已有图保留/显式恢复/来源绑定/自然点选；资料异常、W3失败不能代替SDSS影像机制。随后按新实际输入/画面处理配准、覆盖与整场辨认差距，解码/GPU/弱网各按机制/风险闭合。M42有限条带/饱和、W3源块状条带和其它环境质量留在原归源/呈现owner，不重做月面/HiPS获取加工。普通控件/名称/modal仍是Canvas-only捕获缺口；有新目标/捕获依据时区分实际合成与工具捕获，不重复样式/安装源码研究或盲改cover-view。参考须核实际相机、地点、时刻和视场定义；总览会转向天顶，不能仅凭同名目标或名义FOV宣称匹配。目标冷启动/资源性能/OS后台、完整旅程、真实姿态/旋转校准/Android/iOS义务保留；手机暂不可用时继续独立Sky工作，不调用不支持的方向mock。";
for (const name of ["PLAN.md", "STATE.md", "INDEX.md"]) {
  const file = path.join(task, name); let body = await fs.readFile(file, "utf8");
  assert(/^\*\*当前：[^\r\n]+$/mu.test(body)); body = body.replace(/^\*\*当前：[^\r\n]+$/mu, current);
  assert(/^\*\*恢复与证据：[^\r\n]+$/mu.test(body)); body = body.replace(/^\*\*恢复与证据：[^\r\n]+$/mu, recovery);
  if (name === "PLAN.md") {
    body = body.replace(/^1\. \*\*固定基线：[^\r\n]+$/mu, "1. **固定基线：v28当前，v26/v25证据保范围。** 当前新候选只变两个Sky源文件；99生产owner输入、既有检查和完整软件/原生输出按v28绑定。v26原包不变，地图CSS未改，v27未采用。公开示例点/次日05:00/观测夜09-29/revision2、Polaris中心45°手动、DAY/标准字号、默认图层意愿，唯一PID25916。v28新Context按实际公共旅程提交，非v26原会话。8791保原8789，当前epoch PUT1与旧epoch PUT2分记；无诊断/夹具/代次/vConsole/maps，loopback仅本地开发，不推手机。");
    body = body.replace(/^4\. \*\*唯一下一依赖：[^\r\n]+$/mu, stage4);
    body = body.replace(/^当前运行：[^\r\n]+$/mu, "当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换。唯一v28/PID25916；公开示例点、民用2026-09-30 05:00 Asia/Shanghai/观测夜2026-09-29/UTC21:00/revision2、新Context SHAfb3474ce…/fingerprint55241519…、Polaris中心45°手动，4208目录亮星/3目标，DAY/标准字号，无跟踪/modal/list/time panel。星座/地景/地平ON，W3/赤道OFF。8789/PID22124/exec54820保内存；8791/PID1144/exec42697/controller59162，epoch2026-09-29T06:26:06.812Z/current PUT1(200)，source/context/resource pass、held/active0，共享8787/8788未动。当前v28 trace64事件/9原图SHA d3e4d645…已冻结，旧整场/标准字号/来源/M42/模式trace保原；同代来源Back与退出重进星图区0差，不跨代比较主机缩放截图。地图CSS SHA81283f7b…不变，v27未采用。唯一下一依赖见阶段4，不把编码字节/软件计时写成目标内存或性能。");
    body = body.replace("当前是固定v26开发候选，v25组合证据保其范围", "当前是固定v28开发候选，本轮银河整场/原生组合与资源/成本证据保其范围；v26/v25组合证据保原条件");
    body = body.replace("地景、大气/晨昏及银河，支撑浏览识别 | ESA", "地景、大气/晨昏及银河，支撑浏览识别 | ESA");
    body = body.replace("2K在既有85°软件生产输出更清楚；", "本轮2MASS颗粒归源和显示平滑已接v28，实际完整场景/目录点选/原生浏览与来源回程已核，全天/红光软件0差；广角成本增加和目标质量仍开放。2K在既有85°软件生产输出更清楚；");
    assert(body.includes("下一步在同一v28干净候选"));
  } else if (name === "INDEX.md") body = body.replace("## 当前入口", "## 当前入口\n\n[最新v28银河背景与整场组合](evidence/experience-galactic-background-2026-09-29.md)、[同帧因果](evidence/experience-galactic-causal-validation-2026-09-29.json)、[成本观察](evidence/experience-galactic-cost-2026-09-29.json)、[原生冻结绑定](evidence/experience-galactic-native-validation-2026-09-29.json)是本轮入口；唯一下一依赖由PLAN阶段4维护。旧候选/恢复点只保其条件。\n");
  body = body.replace("[本代单窗口恢复/两项共享修复/组合观察]", "[v25适用审查修复与组合观察]").replace("固定v25、当前Frame/Context", "固定v25、当轮Frame/Context");
  await fs.writeFile(file, body);
}
const progressFile = path.join(task, "PROGRESS.md"), heading = "## 2026-09-29 云观星银河背景因果与v28整场接续";
let progress = await fs.readFile(progressFile, "utf8"); assert(!progress.includes(heading));
progress += "\n\n" + heading + "\n\n" + current + "\n\n" + recovery +
  "\n\n背景细节由真实2MASS输入/完整生产场景的固定对照定位，只在共享GPU owner作连续放大过滤。未重下载、改出版或发明有效性mask；另一个Sky owner说明该显示处理。真实目录与点选、全天/红光/示意回退、资源退休保持。软件广角中位与p95恶化不隐藏，目标成本未验。相关行为/类型/编译通过，3原构建警告保留。干净v28只变Sky JS与候选配置，原v26包保留、v27不采用。\n\n本轮实际公开入口/次日05:00时间提交/北极星搜索自然点选/来源Back/局部星座细层/完整274.9°圆盘/退出重进已经观察。同代Back/重进星图区各0差，不跨代比缩放捕获或称同Context；新Context相同地点时刻但身份不同，当前epoch PUT1。所有截图已实际查看；普通覆盖层合成仍缺，开发结果不升级为目标或整场验收。只更新Sky耐久显示事实，唯一PLAN清理已完成的背景因果下一步，接续同v28的SDSS影像链及按风险恢复与整场剩余质量。手机/姿态/OS/Android/iOS/资源/包体/费用/最终审查仍保原义务，不询问已授权步骤，不复派已结束审查、不另建计划。\n";
await fs.writeFile(progressFile, progress);
const owner = path.resolve("project_context/architecture/runtime-and-domain.md");
let context = await fs.readFile(owner, "utf8");
const source = "The native WebGL sky uses the observer-frame Galactic axes to sample this historical J/H/K near-infrared false-color panorama above the horizon in dark, wide normal-mode views.";
assert(context.includes(source));
context = context.replace(source, source + " When finite source texels are magnified, the existing `sky-gpu-renderer.ts` continuously smooths this background while catalogue stars and picking remain independent. Published image bytes, colour registration, whole-dome and warm-red rules remain owned by their existing boundaries. This is display filtering, not source editing, calibrated radiance or a validity mask; the public Galactic-source disclosure describes it. It adds no image, upload or texture; sampling cost still requires target verification.");
await fs.writeFile(owner, context);
console.log(JSON.stringify({ report, updated: ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md", "Sky paragraph in runtime-and-domain Context"], nextDependency: "Same-v28 SDSS image chain/appropriate recovery, remaining whole-scene quality", sourceScope: "Sky only", goal: "active/unbudgeted/incomplete" }));
