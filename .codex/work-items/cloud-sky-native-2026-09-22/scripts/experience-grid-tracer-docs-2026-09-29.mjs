import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const item = path.join(process.cwd(), ".codex/work-items/cloud-sky-native-2026-09-22");
const summary = "D/C09共享网格重复计算已修，只在一次追踪保留相邻方向/投影，不跨帧缓存、不改采样/几何/地平短弧。保存修前生产bundle后，同页交替计量22组逐条坐标/顺序相同；85°地平/赤道本机CPU中位数4.95/5.30→2.60/3.05ms，非手机或整帧性能。11幅当前生产软件整场输出0像素差、对象快照相同；受影响消费者/类型/WEAPP构建通过。最新无诊断clean-v15已准备、尚未打开，v13/v14指纹保持；未新增窗口、重试取消的提权或推手机。v12当前Frame/Context及4B夹具仍未核，进程存在不证明RPC恢复。完整旅程、B3/C整体质量与源条纹/配准、真实姿态/校准/后台、Android/iOS/资源性能/官方包体/费用/独立审查保持未闭合；新月面未推手机，Goal未完成。";
const link = "详[共享网格成本与干净候选](evidence/experience-grid-tracer-cost-2026-09-29.md)；原商业排除、理由、路线及全部有效义务继续。";
for (const [name, prefix] of [["PLAN.md", "**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"],
  ["STATE.md", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"],
  ["INDEX.md", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"]]) {
  const file = path.join(item, name), lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
  assert(lines[2].startsWith(prefix)); lines[2] = `${prefix} ${summary}${link}`;
  await fs.writeFile(file, lines.join("\n"));
}
const planFile = path.join(item, "PLAN.md");
let plan = await fs.readFile(planFile, "utf8");
const begin = plan.indexOf("   **当前可执行依赖："), end = plan.indexOf("\n4. **待用户恢复真机", begin);
assert(begin > 0 && end > begin);
plan = plan.slice(0, begin) + `   **当前可执行依赖：D/C09共享网格计算已闭合本机开发缺口；已有会话可安全恢复时核一个最新v15组合，等待时审查D观察上下文响应回执与消费者。** [本轮因果计量/实际绘制](evidence/experience-grid-tracer-cost-2026-09-29.md)保留修前完整bundle、22组精确几何及11幅软件GPU像素/对象比较。当前计算没有改变采样、视觉或跨帧缓存；不重复已闭合的几何计时/检查。原[C09/整场证据](evidence/experience-coordinate-grids-2026-09-28.md)保留昼/暮/夜/红光、参考地点/时刻/CSS/FOV及host捕获限制；它们不完成原生控件合成、整体质量或目标性能。

   最新无诊断clean-v15已构建、尚未打开；v13/v14历史指纹保持。此前v12官方只读currentPage未取得结果，本轮不重复失去响应的读取或用户取消的提权。进程仍存在/Responding标志不证明原生页面恢复。会话可安全恢复时退休旧v12再用一个v15，批量核A正常/无效入口及日期恢复、D重新解码/来源/实际Frame和4B夹具、C09开关/当前时刻/红光/换行避让。未拿软件图、进程标志、旧v12或空文件列表认证新候选，也不新增竞争窗口。

   该依赖未恢复时，先读现有D观察上下文的响应回执、提交/恢复消费者与原要求，明确已实现/未证/真实缺口后推进有依据的HTTP/兼容边界；不自行把整个服务扩大为“恰好一次”保证。此前[日期恢复](evidence/experience-route-date-recovery-2026-09-28.md)、[文件启动责任](evidence/experience-image-files-session-2026-09-28.md)、[原子提交](evidence/experience-context-atomic-2026-09-28.md)及[月面组合](evidence/experience-imagery-combined-2026-09-28.md)各保原条件，历史下一步不驱动当前执行。B3/C实际差距和全部合法范围/目标义务继续；现场数据或纹理精修不阻塞整体。
` + plan.slice(end);
plan = plan.replace("最新准备候选为尚未打开的clean-v14。", "最新准备候选为尚未打开的clean-v15。");
plan = plan.replace("原生开关/换行/大字合成、其他适用辅助语义与整体辨认、几何热路径/目标性能及独立审查仍待验", "共享计算已作因果优化并保持精确几何/软件像素；原生开关/换行/大字合成、其他辅助语义与整体辨认、目标性能及独立审查仍待验");
plan = plan.replace("最新准备候选是未打开的clean-v13，", "历史v13准备条件（已非最新候选）：");
const recovery = plan.indexOf("\n本轮恢复补充：最新prepared clean-v14");
assert(recovery > 0);
plan = plan.slice(0, recovery) + "\n当前恢复补充：最新prepared clean-v15，SHA256 b2fc818c76d64df748e0f016cd8090b8e0b7bebf7f84751a23c901616267bdbe，257文件/4,476,095 rawB、main2,084,432B不变，相对v14总量+203B，尚未打开。旧v12/v13/v14运行或构建事实保各自条件；本轮没有页面/当前Context读回，不能当新版原生证据。未新增窗口/服务、未重试取消的提权或手机操作；现有参考标签保留、viewport未新增覆盖。\n";
await fs.writeFile(planFile, plan);
const indexFile = path.join(item, "INDEX.md");
let index = await fs.readFile(indexFile, "utf8");
index = index.replace("## 当前入口\n", "## 当前入口\n\n[共享网格成本与干净候选](evidence/experience-grid-tracer-cost-2026-09-29.md)：当前同页因果几何比较、生产整场0差、未打开v15及原生/观察上下文依赖；本机计量不认证目标性能。\n");
index = index.replace("当前C09共享网格/失败恢复/全天避让、整幅生产输出及参考限制、未打开v14与下一纯几何计量依赖", "此前C09共享网格/失败恢复/全天避让、整幅生产输出及参考限制、未打开v14条件；下一依赖只看PLAN");
await fs.writeFile(indexFile, index);
const stateFile = path.join(item, "STATE.md");
let state = await fs.readFile(stateFile, "utf8");
state = state.replace(/^最新准备：clean-v14，[^\n]+/m,
  "最新准备：clean-v15，SHA256 b2fc818c76d64df748e0f016cd8090b8e0b7bebf7f84751a23c901616267bdbe，257文件/4,476,095 rawB；尚未打开，无新增原生窗口或服务。v13/v14指纹保持。v12最后可靠恢复及4B夹具仍待核，本轮进程观察不建立原生Frame/Context。当前依赖只见PLAN；以下恢复记录保各自当轮条件。");
state = state.replace("最新准备候选是未打开的clean-v13，", "历史v13准备条件（已非最新候选）：");
await fs.writeFile(stateFile, state);
const progressFile = path.join(item, "PROGRESS.md"), progress = await fs.readFile(progressFile, "utf8");
const position = progress.indexOf("## 2026-09-28/29 C09浏览辅助"); assert(position > 0);
await fs.writeFile(progressFile, progress.slice(0, position) + `## 2026-09-29 D/C09共享计算与整场保持

${summary}

${link}

以下按当轮条件保留，所有旧下一步只由当前PLAN驱动。

` + progress.slice(position));
console.log("Unique PLAN and current checkpoint updated; original scope and historical evidence retained.");
