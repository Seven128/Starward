import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const item = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const link = "[入口日期失败恢复](evidence/experience-route-date-recovery-2026-09-28.md)";
const current = "D共享图片文件owner已接入，App修前失败回归、同会话两类已绘文件及同项目原生启动清理小路径已证；重启后重解码/当前Frame/夹具释放仍未核。SDK失去响应及提权取消后，独立修复A非法/未确认Context在恢复提示前派生日期而抛RangeError的问题，保原校验/公共日期/恢复组件，查询完成memo正常更新；修前失败、修后相关消费者/跨午夜预览取消和类型检查通过。最新clean-v13已构建、257文件/4,472,491 rawB，无诊断，尚未打开，不拿v12图/清理认证v13原生。现有工具仍是失效v12/9445；未重复被取消的提权或新增窗口。下一步已有会话可恢复时退休失效v12，再用一个v13核入口失败/正常日期与图片重解码/Frame；若工具仍不可用继续独立B3/C同条件整页质量，保留原生缺口。M42条纹/配准、整体体验、真实姿态/校准/后台/手机性能/官方包体/费用/独立审查均开放，新月面未推手机，Goal未完成。";
for (const name of ["PLAN.md", "STATE.md", "INDEX.md"]) {
  const file = path.join(item, name); let text = await fs.readFile(file, "utf8");
  assert(text.includes("共享图片请求已统一JS运行时文件命名空间"));
  text = text.replace(/^\*\*当前[^\n]+$/m, (name === "PLAN.md" ? "**当前：" : "**当前检查点：") + "Goal active、无预算；完整体验为主线，只用微信开发者工具。** " + current + "详" + link + "及[共享文件证据](evidence/experience-image-files-session-2026-09-28.md)。");
  if (name !== "INDEX.md") text = text.replace(/^恢复状态：[^\n]+$/m, match => match.replace("父窗口22572仅本任务", "当时观测到任务标题的父进程22572") + " 最新准备候选是未打开的clean-v13，SHA256 8ead104e31b41f6ab015d1e543069dda6c2acca5df86694676208401fae9915f；仅新增入口日期守卫，raw main2,084,432B不变。v12原生证据保持原范围；下一候选实际Frame/Context尚无绑定。");
  if (name === "PLAN.md") {
    const start = text.indexOf("   **当前可执行依赖："), end = text.indexOf("   此前[Context原子提交]", start); assert(start > 0 && end > start);
    text = text.slice(0, start) + "   **当前可执行依赖：D共享文件启动清理小路径及A日期恢复代码已证；准备一个v13做实际入口恢复/日期和重解码绑定。** " + link + "记录非法路由暴露的DateTimeFormat空屏、保持现有Context完整性/公共日期owner的守卫与修前失败回归。同区查询完成会刷新memo，完整上下文正常日期/跨午夜预览取消保持。v13无诊断、已构建未打开；旧v12 SDK无响应，提权恢复取消后不重复该动作，不拿空文件列表或旧图作最新Frame。会话可用时安全退休旧v12再开一个v13，核正常/无效入口、日期、重新解码/来源/Frame及已核内容的4B夹具释放。若原生工具仍不可用，继续独立B3/C生产输出与参考的同条件昼暮夜/全天/局部整页构成和辨认，保留原生依赖。旧请求/取消/CAS已证条件不重复；所有商业取舍、原功能及目标义务继续。\n\n" + text.slice(end);
    text = text.replace("首开真实跟随空场尚未完整归因；", "非法路由日期空屏已作代码守卫/修前失败回归，实际恢复界面待本代核；首开真实跟随空场尚未完整归因；");
  } else if (name === "INDEX.md") text = text.replace("## 当前入口\n", "## 当前入口\n\n" + link + "：当前A输入失败守卫与日期消费者回归、未打开v13指纹；原生恢复仍未验证。\n");
  await fs.writeFile(file, text);
}
const progress = path.join(item, "PROGRESS.md"); let text = await fs.readFile(progress, "utf8"); const at = text.indexOf("## 2026-09-28"); assert(at > 0);
text = text.slice(0, at) + "## 2026-09-28 A入口日期恢复独立修复\n\n" + current + "\n\n详" + link + "；后续仍只由PLAN驱动。未新开原生窗口，不升级旧版本证据。\n\n" + text.slice(at); await fs.writeFile(progress, text);
const fileEvidence = path.join(item, "evidence/experience-image-files-session-2026-09-28.md"); text = await fs.readFile(fileEvidence, "utf8");
text = text.replace("生产源码与clean-v12构建一致", "文件owner生产逻辑与clean-v12构建一致；后续A日期守卫另入未打开的v13，不升级此证据");
text += "\nSDK不可用期间，已继续独立A入口日期恢复，见" + link.replace("evidence/", "") + "；当前下一依赖仍看唯一PLAN。\n";
await fs.writeFile(fileEvidence, text);
console.log(JSON.stringify({ currentPlanUpdated: true, latestPreparedCandidate: "clean-v13", nativeCandidateOpened: false }));
