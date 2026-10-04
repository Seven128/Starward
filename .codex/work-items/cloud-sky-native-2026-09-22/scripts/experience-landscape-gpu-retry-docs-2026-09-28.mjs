import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("."), task = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const link = "[GPU恢复及当前v8候选](evidence/experience-landscape-gpu-retry-2026-09-28.md)";
const current = "当前clean-v8/SDK9441 PID28924，SHA256 3de4187e77a39bb05b8c4a050264537bcc21319f74331c246c65275ca96c095b，257文件/4,466,556B最终逐文件读回不变；raw main2,078,174B不是官方包体。00:00/16Z、85°手动Rastaban/普通DAY，地景星座开、W3关、无跟踪/面板，原版2K已绘来源。8789 PID14388/exec22711及log experience-combined-clean-v7-restored-service-2026-09-28.log不变，原清单/两PNG均为原SHA，公开Context与Canvas同16Z；共享8787/8788未动。核新代后关闭v7/9440，旧端口无监听，所有更早窗口已退；历史证据保各自候选条件。无诊断/mock/临时代次，192×413原生图不作旧代清晰度验收；loopback不推手机，私有route IDs不入记录。";
async function edit(file, mutate) {
  const filename = path.join(task, file), old = await fs.readFile(filename, "utf8"), next = mutate(old);
  assert.notEqual(next, old, "expected_edit:" + file); await fs.writeFile(filename, next);
}
function once(text, old, next) {
  assert.equal(text.split(old).length, 2, "one_controlled_match:" + old.slice(0, 60)); return text.replace(old, next);
}
function line(text, pattern, next) {
  const matches = text.match(new RegExp(pattern.source, "gm")); assert.equal(matches?.length, 1, "one_controlled_line");
  return text.replace(pattern, next);
}
await fs.writeFile(path.join(task, "PLAN-HISTORY-before-2026-09-28-landscape-gpu-retry.md"), await fs.readFile(path.join(task, "PLAN.md")), { flag: "wx" });
await edit("PLAN.md", text => {
  text = line(text, /^\*\*当前：[^^\n]*$/m, "**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。B1/B3/D实际图层共存、1K/2K适用LOD和细图失败保粗图已接；地景重试现区分下载/GPU失败，GPU失败才重建Canvas。** 生产软件WebGL实际编译失败、原锁存分支反例及重建已绘恢复成立；原生GPU故障仍未验。clean-v8/9441正常公开进入、原版2K来源/同16Z和257文件回读成立，v7窗已退。v7真实细图500/公开恢复/设置2→0→2保各自历史条件。下一依赖回到B3整页昼暮夜/局部全天/模式与辨认、C实际影像组合质量和D剩余稳定性，不重复LOD或已证组合。原对话paused，完整Goal未完成；全部商业取舍/理由、成本、自主代码、功能/交互/质量/验收义务不变。" + link + "、[当前Goal](GOAL-OBJECTIVE-CORRECTED-2026-09-28.md)及[既有共存证据](evidence/experience-landscape-lod-coexistence-2026-09-28.md)区分条件。新月面/修复未推手机，旧D不升级，历史计划仅作历史。");
  text = once(text, "v2至v6替代窗口均已关闭，旧SDK端口已退；当前只用clean-v7/9440", "v2至v7替代窗口均已关闭，旧SDK端口已退；当前只用clean-v8/9441");
  text = once(text, "真实新版本細图失败保粗图、文件2→0→2成立。", "真实新版本细图失败保粗图、文件2→0→2成立；v8区分下载/GPU重试，生产软件GPU锁存反例及重建恢复成立，原生GPU故障未验。");
  text = once(text, "现在推进整页昼暮夜/局部全天/模式及C/D实差距；", "v8另修GPU锁存恢复：图片owner报告GPU失败，地景公开重试只在该失败时重建Canvas；生产软件GPU实际失败/恢复和正常原生新代回读成立，原生故障未验，见" + link + "。现在推进整页昼暮夜/局部全天/模式及C/D实差距；");
  return line(text, /^恢复状态：[^\n]*$/m, "恢复状态：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送。" + current + "新月面及修复未推手机，旧D不升级。v7故障/还原服务与网络缺行等记录完整保留。");
});
await edit("STATE.md", text => {
  text = line(text, /^\*\*当前检查点：[^\n]*$/m, "**当前检查点：Goal active、无预算；完整体验为主线，真机暂不可用，只用微信开发者工具，不抓屏/输入/预览/轮询手机。** B1/B3/D共同驻留和适用LOD已接，细图下载失败保有效粗图；本轮共享owner区分下载与GPU失败，地景重试在GPU失败时重建Canvas。软件生产GPU真实编译失败/锁存反例/恢复已证，原生GPU故障未验。clean-v8正常公开进入、原版2K已绘来源和同16Z回读成立。见" + link + "；v7细图500/设置2→0→2留原条件，不升级v8故障验收。下一依赖回到B3整页构成/辨认、C真实影像组合及D剩余稳定性，不重复LOD/旧研究。完整目标质量、峰值/帧时/官方包体、姿态/校准/后台/iOS/独立审查/费用仍开放；新月面/修复未推手机，旧D不升级。");
  text = line(text, /^当前weapp-check-sky-combined-clean-v7-0928[^\n]*$/m, current);
  text = once(text, "不能自动升级v7。本轮v6正常集成也只保历史条件。", "不能自动升级后续候选。v6正常集成及v7共存/失败观察也只保历史条件。");
  return line(text, /^最新窗口退役：[^\n]*$/m, "最新窗口退役：原12个闲置历史窗口、v1残留进程及v2至v7替代窗口均已退，当前只用9441/clean-v8；历史构建/截图/JSON保留。共享8787/8788保持；owned8789当前未重启，原发布/图片及公开Context已回读。确需对照才重开旧窗。");
});
await edit("INDEX.md", text => {
  text = line(text, /^\*\*当前检查点：[^\n]*$/m, "**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。** 共享图片共存、适用地景LOD、细图失败保粗图已接；地景GPU重试本轮闭合软件组件恢复，原生故障仍未验。当前唯一clean-v8/9441正常公开进入、原版2K已绘来源/同16Z和257文件不变；v7细图500/设置2→0→2保历史条件。按唯一PLAN继续B3整页构成/辨认、C影像组合和D剩余稳定性。新月面/修复未推手机，旧D不升级；目标平台/性能/官方包体/独立审查/费用仍开放。");
  text = once(text, "## 当前入口", "## 当前入口\n\n" + link + "：共享owner返回GPU重建需要，普通下载不丢独立粗图；真实软件GPU编译故障、有界旧分支和恢复实际输出；v8正常原生入口/来源、逐文件及服务回读与单窗口均已核。原生GPU恢复和完整质量不由该组件证据替代。");
  text = once(text, "12个历史窗口及之后v2至v6替代窗均已退，当前唯一活动项目为clean-v7/9440", "12个历史窗口及之后v2至v7替代窗均已退，当前唯一活动项目为clean-v8/9441");
  return once(text, "当前clean-v6/9439，目标质量", "当时clean-v6/9439（已退），目标质量");
});
await edit("PROGRESS.md", text => once(text, "## 2026-09-28 B1/B3/D实际共存、适用LOD及细图失败恢复", "## 2026-09-28 B3/D GPU锁存恢复与clean-v8\n\n共享图片owner区分下载/GPU失败；普通细图失败保粗图，GPU失败则经公开地景重试重建Canvas。生产真实编译失败揭示原锁存分支不报告粗图失败，修后明确失败、程序模型实际可用，重建恢复原2K图片；GL0，实际texture/program/buffer/shader创建释放配对。软件组件恢复不等于原生GPU故障验收。\n\nclean-v8/9441正常公开Map进入/手动/00:00/Rastaban/85°，原2K已绘来源、BFF与Canvas同16Z、257文件最终回读成立；v7窗口核新代后关闭，8789和原发布不变，无手机/部署/提交推送。受影响消费者/类型/构建通过，三类旧warning保留。当前单窗口和唯一PLAN已更新；下一依赖继续B3整页构成/辨认、C组合质量和D未覆盖稳定性，完整目标义务不缩减。详" + link + "。\n\n## 2026-09-28 B1/B3/D实际共存、适用LOD及细图失败恢复（历史v7条件）"));
await edit("evidence/experience-landscape-lod-coexistence-2026-09-28.md", text => {
  text = once(text, "完整场景质量、手机性能与 Goal 仍未完成。", "完整场景质量、手机性能与 Goal 仍未完成。本记录保留v7原条件；当前候选及新增GPU恢复见[后续v8证据](experience-landscape-gpu-retry-2026-09-28.md)，不提升此处旧代验证。");
  text = once(text, "唯一活动项目为 clean-v7/SDK9440", "本轮结束时唯一活动项目为 clean-v7/SDK9440（之后已由v8替代、v7关闭）");
  return once(text, "当前仍普通DAY/85°", "当时为普通DAY/85°");
});
for (const [file, old, next] of [
  ["project_context/architecture/runtime-and-domain.md", "Failed image/decode/GPU loading retains the procedural fallback with explicit retry;", "The shared native-image owner distinguishes decoded-image GPU failure from request/decode failure and reports whether retry needs a new GPU generation. Landscape retry rebuilds the existing Canvas/GPU owner only for GPU failure, while ordinary detail-download retry preserves valid independent overview content. A latched panorama-program failure reports each subsequently attempted image as failed, so a retained coarse image cannot silently remain available behind an unusable program. Failed image/decode/GPU loading retains the procedural fallback with explicit retry;"],
  ["project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md", "细档加载/失败保留有效粗图，公开重试后可恢复细图。", "细档下载/解码加载或失败保留有效粗图，公开重试后可恢复细图；共享owner区分GPU失败，地景公开重试在该失败时重建现有Canvas/GPU，普通下载重试不退休有效粗图。GPU图片程序失败必须报告其随后拒绝的粗图，不能把不可绘制的图保留为已可用或无提示锁死。"]
]) {
  const filename = path.join(root, file), text = await fs.readFile(filename, "utf8");
  await fs.writeFile(filename, once(text, old, next));
}
console.log("Current plan/state/index/progress and existing Context owners updated; history and verification boundaries preserved.");
