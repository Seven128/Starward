import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const item = path.join(process.cwd(), ".codex/work-items/cloud-sky-native-2026-09-22");
const summary = "D/B4正常时间提交的2xx回复现复用完整意图校验，错误时间/地点/夜晚/版本或矛盾envelope不能直接成功；异常回复最多一次禁用缓存读回，不重放。真实本地BFF、生产operation/请求/缓存的修前反例成立，修后正常无额外GET、错误回复可正确恢复、未提交假200保持失败；Map/Sky、共享状态/取消/缓存和已有时区回退检查通过。最新无诊断clean-v16已构建、尚未打开，v15及旧候选证据保条件。无新窗/提权重试/手机或云操作，v12当前Frame/Context及4B夹具仍未核。完整旅程、B3/C质量/源有效性/配准与合法覆盖、真实姿态/校准/后台、Android/iOS/资源性能/官方包体/费用/独立审查均未闭合；新月面未推手机，Goal未完成。";
const link = "详[上下文成功回复与恢复边界](evidence/experience-context-ack-2026-09-29.md)；原商业排除、理由、路线和全部有效义务继续。";
for (const [name, prefix] of [["PLAN.md", "**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"],
  ["STATE.md", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"],
  ["INDEX.md", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"]]) {
  const file = path.join(item, name), lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
  assert(lines[2].startsWith(prefix)); lines[2] = `${prefix} ${summary}${link}`; await fs.writeFile(file, lines.join("\n"));
}
const planFile = path.join(item, "PLAN.md");
let plan = await fs.readFile(planFile, "utf8");
const begin = plan.indexOf("   **当前可执行依赖："), end = plan.indexOf("\n4. **待用户恢复真机", begin);
assert(begin > 0 && end > begin);
plan = plan.slice(0, begin) + `   **当前可执行依赖：D/B4提交回复边界已修；已有会话可安全恢复时核一个最新v16组合，等待时推进C影像真实有效性/源质量与配准的实际缺口。** [本轮成功回复/恢复](evidence/experience-context-ack-2026-09-29.md)保留修前生产函数及真实BFF/operation/请求缓存反例。正常合法回复无需GET，异常成功回复复用原完整意图核对与最多一次无缓存读回，未提交不能假成功；不新增回执存储或普遍“恰好一次”传输条件。原子提交/已有丢失回复与本轮已闭合边界不重复核；[网格计算/整场保持](evidence/experience-grid-tracer-cost-2026-09-29.md)及[C09/参考限制](evidence/experience-coordinate-grids-2026-09-28.md)保各自条件，不升级目标验收。

   最新无诊断clean-v16已构建、尚未打开。旧v12当前Frame/Context和4B夹具状态仍未知，本轮没有重复未返回的RPC、用户取消的提权或新开窗口。可安全恢复时退休旧v12，再用一个v16批量核A正常/无效入口及日期、D重新解码/来源/实际Frame、C09开关/当前时刻/红光/换行避让及本轮正常/异常时间回复组合。先绑定实际候选与当前接受Context，不能由process、旧route、文件空列表或软件输出认证新版。

   等待该依赖时核现有C影像输入的真实有效性、源条纹与合规配准缺口，沿出版/合同/共享加载/注册/GPU/来源owner处理。区分源数据伪影、缺测/未知和可修复配准；不伪造有效性mask、隐藏对象凑质量、不重做已有下载研究或重试两条已失败的相同WCS端点。取一个能改变下一行动的真实输入/反例再扩展，不让额外纹理精修独占主线。全部合法覆盖、B3/C整体质量、完整旅程和目标义务保持。
` + plan.slice(end);
plan = plan.replace("最新准备候选为尚未打开的clean-v15。", "最新准备候选为尚未打开的clean-v16。");
plan = plan.replace("Context头回执及全服务幂等、生产配置未认证；", "当前Context提交回复/读回有开发证据，生产配置未认证；历史全服务回执/恰好一次并非新硬依赖；");
const recovery = plan.indexOf("\n当前恢复补充：最新prepared clean-v15"); assert(recovery > 0);
plan = plan.slice(0, recovery) + "\n当前恢复补充：最新prepared clean-v16，SHA256 1123034a5afeee5731523aa95278997e88c81ff1eab70da42c23299b9250d032，257文件/4,476,370 rawB、main2,084,707B，相对v15总量/main+275B，尚未打开。旧v12运行和v13/v14/v15构建事实保原条件；没有新版原生Frame/Context读回，无新窗/常驻服务/云/手机动作或提权重试。参考标签保留，不新增viewport覆盖。\n";
await fs.writeFile(planFile, plan);
const stateFile = path.join(item, "STATE.md");
let state = await fs.readFile(stateFile, "utf8");
state = state.replace(/^最新准备：clean-v15，[^\n]+/m,
  "最新准备：clean-v16，SHA256 1123034a5afeee5731523aa95278997e88c81ff1eab70da42c23299b9250d032，257文件/4,476,370 rawB；尚未打开，无新原生窗口或服务。v15及旧候选指纹保持。v12最后可靠恢复及4B夹具仍待核，未取得本代原生Frame/Context。当前依赖只见PLAN，以下恢复记录保当轮条件。");
await fs.writeFile(stateFile, state);
const indexFile = path.join(item, "INDEX.md");
let index = await fs.readFile(indexFile, "utf8");
index = index.replace("## 当前入口\n", "## 当前入口\n\n[上下文成功回复与恢复边界](evidence/experience-context-ack-2026-09-29.md)：当前D/B4正常/异常2xx完整意图、无缓存读回、真实BFF反例与兼容消费者，未打开v16；唯一下一依赖看PLAN。\n");
index = index.replace("当前同页因果几何比较、生产整场0差、未打开v15及原生/观察上下文依赖", "此前同页因果几何比较、生产整场0差及未打开v15条件；当前依赖只见PLAN");
await fs.writeFile(indexFile, index);
const progressFile = path.join(item, "PROGRESS.md"), progress = await fs.readFile(progressFile, "utf8");
const position = progress.indexOf("## 2026-09-29 D/C09共享计算"); assert(position > 0);
await fs.writeFile(progressFile, progress.slice(0, position) + `## 2026-09-29 D/B4正常提交回复的真实意图

${summary}

${link}

以下保留历史条件，旧下一步一律由当前PLAN覆盖。

` + progress.slice(position));
console.log("Unique PLAN/current checkpoint updated; unspecified replay machinery is not a new completion prerequisite.");
