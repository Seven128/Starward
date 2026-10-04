import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const outcome = "本轮C/B2已在当前clean-v11核公开08:00/1.5°月面与已绘1K部分alpha组合、坐标点选SOLAR MOON、独立来源Back、同条件开关及实际恢复；Map退出当前5份编码文件释放至0、历史22份不动，重进手动星空保08:00。最后恢复16Z/revision6、85°Vega/原2K，原257文件指纹不变，未改生产源码或另开窗口。";
const limits = "页面firstRender132ms、含SDK观察4455ms、本机Agent报告621612B/18ms各保自身边界，不作星空首屏/FPS/native峰值/原生流量；截图Canvas覆盖普通WXML的既有DevTools差异、1K高倍率亮灰过渡、B3整体质量仍开放。";
const next = "下一小路径按唯一PLAN转D原生请求/渐进加载的有界测量或尚未覆盖失败恢复，复用目的工具/现有任务传输owner；不重复这次正常动作、已闭合并发反例或旧研究，不无限精修纹理。";
const obligations = "全部原有效商业/自主代码/功能/交互/质量/费用范围及目标Android/iOS、姿态/校准/OS后台、资源/性能/官方包体和独立审查继续保留；新月面/修复未推手机，旧D不升级，Goal未完成。";
const currentEvidence = "[本轮月面组合及入口恢复](evidence/experience-imagery-combined-2026-09-28.md)";
const runtime = "当前clean-v11/SDK9444 PID34128，SHA256 99c50222cb3d64fc2201470c754d6e135c60b51b9711f8918b52f93469cc47db，257文件/4,469,986 rawB未变；raw main2,081,604B不是官方包体。00:00/16Z、revision6、85°手动Vega/普通DAY，地景星座开、W3关，无跟踪/面板/旧时间错误，公开已绘原版2K来源。当前route、native durable接受Context、BFF和Canvas同16Z；本轮早期图193×413、后续同条件比较/最终图488×1057，逻辑Canvas390.4×844，不跨尺度认证清晰度或手机合成。API8791仍为owned pass（PID12252/exec34149）至已加载原子更新的8789（PID22124/exec54820）；共享8787/8788未动，旧9441/9442/9443无监听，只一个任务窗口。无诊断/mock/临时代次/vConsole/sourceMaps；loopback不推手机，私有IDs不入记录。恢复先读" + currentEvidence + "及[本轮最终绑定](evidence/experience-imagery-combined-binding-2026-09-28.json)；上一轮原子提交/当时revision4见其独立证据，不能作为现在的Context版本。";
const pending = new Map();
for (const file of ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md"]) pending.set(file, (await fs.readFile(path.join(task, file), "utf8")).split(/\r?\n/));
function replace(file, prefix, value) {
  const lines = pending.get(file), matches = lines.flatMap((line, index) => line.startsWith(prefix) ? [index] : []);
  assert.equal(matches.length, 1, file + ": current owner paragraph must be unique"); lines[matches[0]] = value;
}
replace("PLAN.md", "**当前：Goal active", "**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。** " + outcome + currentEvidence + "与[实际捕获/测量](evidence/experience-imagery-combined-native-2026-09-28.json)保各自条件。" + limits + next + "此前D Context原子提交/期限/HTTP恢复已核，Context头回执及生产配置不由CAS认证。" + obligations);
replace("STATE.md", "**当前检查点：Goal active", "**当前检查点：Goal active、无预算；完整体验为主线，真机暂不可用，只用微信开发者工具，不抓屏/输入/预览/轮询手机。** " + outcome + currentEvidence + "保实际条件。" + limits + next + obligations);
replace("INDEX.md", "**当前检查点：Goal active", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。** " + outcome + limits + next + "8789仍PID22124/exec54820、8791 pass、唯一9444；Context头回执/生产配置不由此前CAS认证。" + obligations);
replace("STATE.md", "当前clean-v11/SDK9444", runtime);
replace("PLAN.md", "恢复状态：分支codex/remote-main-20260908", "恢复状态：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送。" + runtime);
replace("PLAN.md", "   **D Context有界并发路径已完成", "   **此前D Context有界并发路径已完成，代表C月面组合也已形成适用开发证据；当前下一步由上面的唯一可执行依赖驱动。** [原子提交及恢复](evidence/experience-context-atomic-2026-09-28.md)保修前双成功、原子更新及到期/断连/HTTP条件；" + currentEvidence + "保本轮部分alpha/点选/来源/资源退出和页面render条件，二者不互相替代或重复研究。沿同一候选继续真实请求/渐进与失败恢复测量，区分主机、encoded文件、GPU逻辑量和目标设备量；C其余配准/源条纹及B3可比整页构成继续开放。Context头未消费/全服务幂等也不由CAS认证。");
for (let i = 0; i < pending.get("PLAN.md").length; i++) {
  const line = pending.get("PLAN.md")[i];
  if (line.startsWith("| B2：日月行星")) pending.get("PLAN.md")[i] = line.replace("月面双版本已接本地链", "月面双版本已接本地链；本轮v11公开08:00月面/缺测来源、部分地景叠加、坐标点选及来源Back有[适用观察](evidence/experience-imagery-combined-2026-09-28.md)");
  if (line.startsWith("| A/D：稳定")) pending.get("PLAN.md")[i] = line.replace("原候选指纹不变。", "原候选指纹不变。本轮另核实际当前5→0→2编码文件、页面firstRender132ms与直接本机报告读回；这些不是目标资源/首屏/流量。");
}
const index = pending.get("INDEX.md"), insertion = index.findIndex(line => line === "## 当前入口"); assert.ok(insertion >= 0);
index.splice(insertion + 2, 0, currentEvidence + "：当前Moon coverage-v2/真实1K alpha叠加、自然坐标资料身份/独立来源Back、同条件实际输出恢复、Map正常文件退休/重进，当前revision6及原指纹绑定。firstRender/SDK/文件/Agent HTTP分开；高倍率地景/模拟器WXML合成、目标性能/完整质量继续未通过，不重复此前并发或这次正常动作。", "");
const progress = pending.get("PROGRESS.md"), firstSection = progress.findIndex(line => line.startsWith("## 2026-09-28")); assert.ok(firstSection > 0);
progress.splice(firstSection, 0, "## 2026-09-28 C/B2月面部分组合、正常入口与D测量边界", "", outcome, "", "实际三图488×1057地景开关影响Moon内部像素，恢复比较区域0差；较早193×413截图不跨尺度验清晰度。独立来源保USGS coverage-v2缺测/非真彩限制。" + limits, "", currentEvidence + "、[捕获与文本](evidence/experience-imagery-combined-native-2026-09-28.json)、[最终绑定](evidence/experience-imagery-combined-binding-2026-09-28.json)完整保边界。当前route/durable/BFF/Canvas同16Z/revision6，原候选和服务保持；22历史文件没有删除。" + next + obligations, "");
for (const [file, lines] of pending) await fs.writeFile(path.join(task, file), lines.join("\r\n"));
console.log(JSON.stringify({ scope: "Update the unique task plan/checkpoints and keep original obligations; no Context or product source mutation.", files: [...pending.keys()] }));
