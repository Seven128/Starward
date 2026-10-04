import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const item = path.join(process.cwd(), ".codex/work-items/cloud-sky-native-2026-09-22");
const summary = "C09已接入独立地平/J2000赤道网格，共用曲线/裁切、当前观察帧及银河/HiPS转换，保默认地平/几何地平线；当前帧缺失不绘旧赤道网格，校准锁定。已修高倍贴地平赤纬圆漏段和快捷设置未参与全天避让，修前失败/修后受影响消费者、类型与构建检查通过。完整Canvas昼/暮/夜/红光及局部/全天真实软件输出已取得；网格开关有像素作用且不改适用对象/前景，默认迁移85°/全天0像素差。参考CSS地点/夜间时刻/视场已核，但IAB捕获缩放/黑边不作跨像素质量通过。最新clean-v14无诊断，257文件/4,475,892 rawB，尚未打开；v13指纹保留。既有v12官方只读currentPage仍未返回，中止等待，无新窗/提权重试/手机操作。下一独立项核纯网格几何热路径（本机计量非手机/整帧）；会话可安全恢复时退休旧v12、用一个v14核A日期/入口、D重解码和C09原生组合。M42条纹/配准、B3/C整体质量、真实姿态/校准/后台、Android/iOS/性能/官方包体/费用/独立审查均开放，新月面未推手机，Goal未完成。";
const link = "详[浏览辅助层与整幅场景](evidence/experience-coordinate-grids-2026-09-28.md)；原商业排除、理由、技术路线与全部有效义务继续。";
for (const [name, prefix] of [["PLAN.md", "**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"],
  ["STATE.md", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"],
  ["INDEX.md", "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。**"]]) {
  const file = path.join(item, name), text = await fs.readFile(file, "utf8");
  const lines = text.split(/\r?\n/); assert(lines[2].startsWith(prefix)); lines[2] = `${prefix} ${summary}${link}`;
  await fs.writeFile(file, lines.join("\n"));
}
let plan = await fs.readFile(path.join(item, "PLAN.md"), "utf8");
const begin = plan.indexOf("   **当前可执行依赖："), end = plan.indexOf("\n4. **待用户恢复真机", begin);
assert(begin > 0 && end > begin);
plan = plan.slice(0, begin) + `   **当前可执行依赖：C09开发接入与实际软件结果已证，先核D网格几何热路径；已有会话可安全恢复时核一个v14组合。** [本轮证据](evidence/experience-coordinate-grids-2026-09-28.md)保留完整Canvas昼/暮/夜/红光与25°/85°/全天观察、原文普通深色天空边界、参考CSS/FOV/时刻及host捕获限制。共享两类网格、EQJ/J2000转换和排队帧接入已核；贴地平赤纬圆与快捷设置避让的修前反例及修后消费者成立，原有默认85°/全天样本逐像素保持。它们不完成原生控件合成、所有辅助层/质量或目标性能。

   最新无诊断clean-v14已构建、尚未打开；v13历史指纹不变。对既有v12的官方只读currentPage没有取得结果，已中止等待，不重复取消的提权或新增窗口。可继续在当前纯几何owner核重复求方向/投影及短弧裁切成本；本机30样本与并行构建不构成手机/整帧性能或因果基线，先比较同输入与输出再做有依据的优化。会话可安全恢复时退休旧v12再开一个v14，批量核A正常/无效入口及日期恢复、D重新解码/来源/Frame和4B夹具、C09开关/当前时刻/红光/换行避让。保留全部真实姿态/手机依赖，不以软件图、旧v12或空文件列表认证新候选。

   [此前A日期恢复](evidence/experience-route-date-recovery-2026-09-28.md)、[D文件启动责任](evidence/experience-image-files-session-2026-09-28.md)、[Context原子提交](evidence/experience-context-atomic-2026-09-28.md)及[月面组合](evidence/experience-imagery-combined-2026-09-28.md)各保原条件，不重复闭合检查；旧报告里的下一步不驱动当前工作。B3完整质量、C配准/源条纹及全部合法覆盖、完整旅程和目标义务保持。
` + plan.slice(end);
plan = plan.replace("本轮只维护clean-v12目标。", "最后可靠原生仍是clean-v12；最新准备候选为尚未打开的clean-v14。");
plan = plan.replace("整页昼暮夜构成/辨认质量仍未通过，本轮参考时刻/视口不匹配。", "已补完整Canvas昼/暮/夜/红光及局部/全天实际软件输出、同点夜间参考CSS/FOV/时刻；host截图缩放/黑边不作跨像素质量通过，整页控件组合及最终辨认仍待目标验收。");
const marker = "| B2：日月行星可识别、角尺寸/相位/方向正确，细节服务观察";
assert(plan.includes(marker));
plan = plan.replace(marker, "| C09：按浏览需要选择地平/赤道坐标辅助与红光 | 无功能缩减；赤道采用当前共享EQJ/J2000帧，非另一时钟 | 独立显示意愿、当前帧缺失/校准锁定、共享裁切/转换与队列已接；真实软件局部/全天开关有像素作用，默认迁移保持对象与画面；高倍贴地平漏段及快捷设置避让修前失败/修后成立 | 原生开关/换行/大字合成、其他适用辅助语义与整体辨认、几何热路径/目标性能及独立审查仍待验 | 可自主选择网格，时空/相机及地景关系正确，全天无遮挡，不改变天体身份/点击；当前帧失败诚实恢复，红光/校准/返回语义保持，目标质量性能通过 |\n" + marker);
plan += "\n本轮恢复补充：最新prepared clean-v14指纹bc14e4721887119bdfa12b132ed14a9c525dc96d4b82b01f9ae48e8987c8cf78，257文件/4,475,892 rawB、main2,084,432B不变，尚未打开。此前v12运行/端口/PID/文件与v13构建叙述保历史条件，不能当当前已响应的Frame/Context；本轮官方MCP只读查询未返回，未新增窗口、未重试提权或手机操作。临时参考viewport已reset，现有参考标签保留。\n";
await fs.writeFile(path.join(item, "PLAN.md"), plan);
const indexFile = path.join(item, "INDEX.md"), index = await fs.readFile(indexFile, "utf8");
await fs.writeFile(indexFile, index.replace("## 当前入口\n", "## 当前入口\n\n[浏览辅助层与整幅场景](evidence/experience-coordinate-grids-2026-09-28.md)：当前C09共享网格/失败恢复/全天避让、整幅生产输出及参考限制、未打开v14与下一纯几何计量依赖；本代原生/手机仍未验。\n"));
const stateFile = path.join(item, "STATE.md"), state = await fs.readFile(stateFile, "utf8");
await fs.writeFile(stateFile, state.replace("历史v6/v7恢复条件：", "最新准备：clean-v14，SHA256 bc14e4721887119bdfa12b132ed14a9c525dc96d4b82b01f9ae48e8987c8cf78，257文件/4,475,892 rawB；尚未打开，无新增原生窗口。本轮官方只读currentPage未取得结果，最后v12恢复及4B夹具仍待核。参考viewport已reset，现有标签保留；下一热路径/原生依赖见PLAN。以下恢复记录保各自当轮条件，不是新版运行证据。\n\n历史v6/v7恢复条件："));
const progressFile = path.join(item, "PROGRESS.md"), progress = await fs.readFile(progressFile, "utf8");
const position = progress.indexOf("## 2026-09-28 A入口日期恢复"); assert(position > 0);
await fs.writeFile(progressFile, progress.slice(0, position) + `## 2026-09-28/29 C09浏览辅助与完整Canvas观察\n\n${summary}\n\n${link}\n\n以下按当轮记录保留；所有旧下一步以当前PLAN覆盖。\n\n` + progress.slice(position));
console.log("Unique PLAN and current status/index/progress updated; history and obligations retained.");
