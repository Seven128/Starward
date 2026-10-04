import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(task, "evidence");
const validation = JSON.parse(await fs.readFile(path.join(evidence, "experience-sky-whole-scene-validation-2026-09-29.json"), "utf8"));
assert.equal(validation.runtime.mapSourceSha256, "81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82");
const publicationResponse = await fetch("http://127.0.0.1:8791/v2/sky/galactic/manifest");
assert.equal(publicationResponse.status, 200);
const publication = await publicationResponse.json();
const asset = path.resolve("workers/miniapp-api/assets/deep-sky/galactic-2mass/2mass-galactic-2048x1024.jpg");
const bytes = await fs.readFile(asset);
const sha256 = createHash("sha256").update(bytes).digest("hex");
assert.equal(sha256, publication.image.sha256);
assert.equal(bytes.length, publication.image.bytes);
await fs.writeFile(path.join(evidence, "experience-sky-galactic-source-observed-2026-09-29.json"), JSON.stringify({
  scope: "Agent read of the existing public publication and already acquired local image, not a native image-load or rendered-causality certificate. No download or source change.",
  observedUtc: new Date().toISOString(), publication,
  localAsset: { file: asset, bytes: bytes.length, sha256 },
  nativeManifestRecordLimit: "Some direct Agent GETs in this turn did not set the harness probe marker; agentProbe=false by itself does not prove a record originated from the Mini Program."
}, null, 2) + "\n", { flag: "wx" });

const current = "**当前：Goal active、无预算、未完成；用户明确只改云观星，大字号继续暂停。地图CSS已恢复修前完全相同字节，未打开/采用/投递含撤回改动的v27。当前仍是唯一v26/PID25916，SHA510d269337407b659cd764d7bdcbbb6e1479872e83e3a54bfa99ad10ef485421，257文件/4,485,078 rawB、99生产源码及既有测试输入未变。公开示例点、民用2026-09-30 05:00 Asia/Shanghai、观测夜2026-09-29/UTC21:00/revision2，Polaris方向45°手动，4208亮星目录对象/3目标；DAY/标准字号，无跟踪/modal，星座/地景/地平意愿ON，W3/赤道OFF。全天270.2°→45°适用回程和NIGHT来源/复制/身份已补开发证据；普通控件合成、整场质量/配准覆盖、Android/iOS/新版月面手机、真实姿态校准/OS后台、目标性能/官方包体/费用及必要最终审查继续未完成。**";
const recovery = "**恢复与证据：** [标准字号夜间来源](evidence/experience-standard-source-consumers-2026-09-29.md)与[云观星全天/局部/参考条件](evidence/experience-sky-whole-scene-2026-09-29.md)分别保当前边界；[冻结验证](evidence/experience-sky-whole-scene-validation-2026-09-29.json)绑定71事件/13原图、同Context/时刻与原包，前轮来源/M42 trace未变。共享v26来源修复及v25审查修复继续保留；一次已授权只读审查已结束，无需复派。45°→270.2°→45°星图区0差；Polaris45°往返51px/max1、85°1px/max1如实记录。85°总览相机会转向天顶，不能仅用同名目标宣称与参考同朝向；局部45°参考实际CSS390.4×844/短边21.02765°、暂停05:00:01，晚1秒，限外观对照。8791/原8789及共享服务保留，source/context/resource pass，当前epoch PUT0、held/active0。";
for (const name of ["PLAN.md", "STATE.md", "INDEX.md"]) {
  const file = path.join(task, name);
  let body = await fs.readFile(file, "utf8");
  assert(body.includes("本轮补实际已绑定来源独立失败"), name + " unexpected current header");
  body = body.replace(/\*\*当前：[\s\S]*?\*\*/u, current)
    .replace(/\*\*恢复与证据：\*\*[^\r\n]+/u, recovery);
  if (name === "PLAN.md") {
    body = body.replace(/1\. \*\*固定基线：[\s\S]*?(?=\r?\n\r?\n2\. \*\*)/u,
      "1. **固定基线：v26当前，v25证据保范围。** 原包与99源码/既有测试绑定保持；本轮没有新增产品源码修改。当前公开点/民用次日05:00/观测夜09-29/revision2、Polaris中心45°手动、DAY/标准字号和默认图层意愿，单窗PID25916。地图修复已撤，v27未打开/采用。8791保原8789 Context，新epoch PUT0与历史PUT2分记；无诊断/夹具/代次/vConsole/maps，loopback仅本地开发，不推手机。");
    body = body.replace(/4\. \*\*唯一下一依赖：[\s\S]*?(?=\r?\n\r?\n5\. \*\*)/u,
      "4. **唯一下一依赖：B3/C整场质量与云观星组合体验。** 用户明确修改只限云观星职责；共享文件只处理确需的云观星行为，不顺带修改其它业务模块。地图CSS已逐字节撤回，未采用/打开v27；地图NIGHT/红光线索不新增为本Goal硬依赖。大字号按用户澄清继续暂停，标准字号及Sky长来源保持。当前同一v26已补NIGHT实际来源/复制/身份、完整圆盘270.2°与局部回程、Polaris识别/定位和45°可比参考；85°总览已绘朝向会改变，后续参考必须核实际相机，不能凭目标名或名义FOV。下一步先复用已取2MASS输入做完整生产场景的同帧因果对照，区分低分辨率背景颗粒与真实目录星点，再按整体浏览/辨认影响修正；不得重下载、重做选型、伪造mask或隐藏银河凑完成。M42有限条带/饱和、W3原图块状条带继续归源/呈现owner，原月面/HiPS获取加工不重复。Canvas-only普通控件/名称/modal合成仍开放，只在有新运行/捕获依据时调查，不重复样式/安装源码或盲改cover-view。继续模拟昼暮夜、配准/覆盖、星座识别、连续浏览与必要失败恢复；SDSS影像HTTP、解码/GPU/弱网按不同机制/风险补适用证据，不用现有W3/资料异常一概覆盖。目标冷启动/资源性能/OS后台、完整旅程与真实姿态/旋转校准/Android/iOS义务保留；手机暂不可用时继续独立Sky工作，不调用不支持的方向mock。");
    body = body.replace(/当前运行：[^\r\n]+/u,
      "当前运行：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送/切换。v26/PID25916唯一窗口；公开示例点、民用2026-09-30 05:00 Asia/Shanghai/观测夜2026-09-29/UTC2026-09-29T21:00Z/revision2、Polaris中心45°手动，4208目录亮星/3目标，DAY/标准字号，无跟踪/modal。星座/地景/地平ON，W3/赤道OFF；公开对象来源收起。8789/PID22124/exec54820保内存；8791/PID1144/exec42697/controller59162，epoch2026-09-29T06:26:06.812Z/current PUT0；历史PUT2保其范围，canonical身份/指纹/时刻不变。source/context/resource pass、held/active0，共享8787/8788未动。当前全天/局部trace71事件/13原图、标准字号来源50事件/12原图和前轮来源/M42/模式trace均已冻结，不能追加。撤回地图CSS SHA81283f7b…与修前一致，v27未打开/采用。唯一下一依赖见阶段4，编码字节不写成内存或目标性能。");
    body = body.replace("控件/换行/大字合成、其他辅助语义", "控件/标准字号换行合成、其他辅助语义");
    body = body.replace("当前M42中心43.3°/revision2", "该轮M42中心43.3°/revision2");
    body = body.replace("最终M82中心2.3°；其它模式", "该轮最终M82中心2.3°；其它模式");
    assert(body.includes("下一步先复用已取2MASS输入"), "PLAN next dependency not updated");
  } else {
    body = body.replace("## 当前入口", "## 当前入口\n\n[本轮云观星范围/标准字号来源](evidence/experience-standard-source-consumers-2026-09-29.md)、[全天/局部/实际参考相机](evidence/experience-sky-whole-scene-2026-09-29.md)和[冻结绑定](evidence/experience-sky-whole-scene-validation-2026-09-29.json)是最新开发观察。范围外地图改动已撤，v27未采用；大字号继续暂停。当前恢复点看顶部，唯一下一依赖由PLAN阶段4维护。\n");
  }
  await fs.writeFile(file, body);
}
const progressFile = path.join(task, "PROGRESS.md");
let progress = await fs.readFile(progressFile, "utf8");
const heading = "## 2026-09-29 云观星范围限定、标准字号来源与全天局部接续";
assert(!progress.includes(heading), "Duplicate progress record");
progress += "\n\n" + heading + "\n\n" + current + "\n\n" + recovery +
  "\n\n用户两条最新范围指令已记录USER-UPDATES，唯一PLAN据此清理当前大字/范围外地图硬依赖。大字暂停只限定该适配项，Goal不暂停。刚才新增地图样式逐字节恢复修前；相关9项/类型/本地v27编译只是撤回探索，不算云观星修复交付，v27未打开、采用或投递。后续只限Sky职责及确需技术依赖，不扩大其它模块。当前没有新增生产源码变更，不重复类型/构建或既有故障动作。此前共享恢复Context的标准字号/暂停事实结构validate exit0只认证文档结构，不认证产品。\n\n" +
  "实际公开重进方向不可用提示→手动星场→完整全天→局部回程、北极星中文搜索/资料/定位和25°插画、45°参考相机已分别观察。原270.2°前的230.8°图仍裁侧，不能按full-dome文件名判通过；45°星座详情按原门槛隐藏，开关0差不证明可见星座已验。Polaris85°标记y477.24与45°y422明确区分名义目标和已绘相机；参考最终同公开点/CSS390.4×844/45°对应21.02765°短边/时刻晚1秒，保两端源/曝光/捕获差异，不跨图认定星密度或配准。完整普通控件合成、整场质量、目标手机与资源/费用仍缺。\n\n" +
  "实际2MASS来源及原已取703555B/imageSHAe3a70f83…只读核回；未重下载。背景颗粒在45°星座开关下保持，源因果仍未闭合，下一步按PLAN复用完整生产场景做同帧区分，再按浏览/辨认影响处理，不让局部天体精修占主线。旧冻结trace与99源码/原包保持，新文件只为任务证据和当前计划，不另建竞争计划，不操作手机、云部署或Git提交/推送。\n";
await fs.writeFile(progressFile, progress);
console.log(JSON.stringify({ updated: ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md"], existingGalacticAssetSha256: sha256,
  sourceScope: "Sky only", nextDependency: "B3/C same-frame whole-scene comparison of existing 2MASS input", goal: "active, unbudgeted, incomplete" }));
