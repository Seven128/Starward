import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const link = "[共享图片文件归属及启动清理](evidence/experience-image-files-session-2026-09-28.md)";
const current = "共享图片请求已统一JS运行时文件命名空间/序号，App启动只退休已知旧生成缓存，保当前会话/其他文件；原App修前失败回归、请求/粗图/代次消费者和类型/构建已过。clean-v12无诊断，公开入口→00:00→M31/1.5°实际已绘AllWISE W3和两类同会话文件；同项目启动确认无owner旧副本70,333B删除、独立4B保留。不能用跨候选0文件推算删原v11全部历史，也不把文件字节当native内存。本轮后续原生RPC失去响应，重启后重解码/当前Frame和Context、测试夹具释放仍未确认；针对SDK的提权恢复取消，未杀进程或改系统设置，不重复该动作。当前候选v12/SDK9445 PID10156端口在但不表示可用；8789/8791保持pass/held及active0，共享服务未动。下一步有界恢复可用原生会话并核重绘/夹具；若工具仍不可用，继续独立B3/C同条件生产输出与参考整页质量对照，保留原生缺口。M42源黑条/配准、整体质量、手机/姿态/校准/后台/性能/官方包体/费用/独立审查均继续开放，新月面未推手机，Goal未完成。";
const restore = "恢复状态：分支codex/remote-main-20260908、HEAD7898962b不变，无提交/推送。clean-v12候选SHA256 bf179db231d3a73314ac552b4eb8010babcc3cf6e359e232e447c13b7d7cebea，257文件/4,472,475 rawB，raw main2,084,432B不是官方包体；无诊断/mock/代次/vConsole/maps，loopback8791不推手机。原v11/9444已退，不复用其revision8/85°Vega截图作当前绑定。v12重启前公开M31/00:00/16Z/revision2、1.5°实际画面和同会话编码4份4,241,290B保该时点；两个192×413图已看，不跨尺度质量验收。最后成功同项目启动读回为Map、编码0、独立4B夹具保原字节；后续UI/原生RPC deadline，当前Sky/活动Context和夹具是否已移除未知，不能写恢复已过。9445/PID10156失去响应，父窗口22572仅本任务；普通停止拒绝、Windows sudo禁用、gsudo被取消，未完成提权或停止，不重试该提权动作。下次先核真实会话/文件状态，只在4B夹具仍是91,92,93,94时释放它。owned8789 PID22124/exec54820、8791 PID21852/exec37410不变，当前context/resource均pass、held/active0；共享8787 PID2408/8788 PID15508未动，无新增常驻服务。详" + link + "；原出版和本轮手机禁用边界保持。";
for (const name of ["PLAN.md", "STATE.md", "INDEX.md"]) {
  const file = path.join(item, name); let text = (await fs.readFile(file, "utf8")).replace(/\r\n/g, "\n");
  assert(text.includes("本轮D已在原clean-v11"), "unexpected current checkpoint");
  text = text.replace(/^\*\*当前[^\n]+$/m, (name === "PLAN.md" ? "**当前：" : "**当前检查点：") + "Goal active、无预算；完整体验为主线，只用微信开发者工具。** " + current + "详" + link + "。");
  if (name !== "INDEX.md") text = text.replace(/^恢复状态：[^\n]+$/m, restore);
  if (name === "PLAN.md") {
    text = text.replace(/^按用户要求，12个闲置历史项目[^\n]+$/m, "按用户要求，历史闲置窗口及v1至v11替代窗口均已退；本轮只维护clean-v12目标。构建/证据、共享8787/8788和任务8789/必要8791 pass转发保留；不以操作系统子进程数量当项目窗口数。SDK当前失去响应，恢复必须核实际候选/页面，而不能仅凭端口或CLI成功。");
    const from = text.indexOf("   **当前可执行依赖："), to = text.indexOf("   此前[Context原子提交]", from); assert(from > 0 && to > from);
    text = text.slice(0, from) + "   **当前可执行依赖：共享图片文件归属/启动清理已接入并取得同项目原生小路径证据；还需核重启后实际重解码。** " + link + "和本代采集记录原App启动回归、同会话两类已绘文件、旧无owner副本清除与未知文件保留。SDK9445随后失去响应，恢复/夹具释放未认证，不用重启前图或空文件计数填补。针对停止该SDK的提权已取消，不重复该动作；可用会话恢复后核Frame、来源和当前Context，随后回B3/C可比昼暮夜/全天/局部整页构成和辨认。若原生工具仍不可用，继续独立B3/C生产输出/参考对照，保留该依赖。旧请求/取消/CAS正常链已有适用证据，不重复；所有商业边界、原功能、质量与目标义务继续。\n\n" + text.slice(to);
    text = text.replace("跨运行时编码文件归属仍待核", "跨运行时编码文件归属已接入并确认原生启动清理，重解码仍待核");
    text = text.replace("历史编码文件跨运行时归属仍待核", "启动归属已有本代证据，重启后重绘与当前绑定仍待核");
    text = text.replace("| 图像/GPU/临时资源 | use-sky-artwork、loader/request、sky-gpu-textures、sky-canvas-lifecycle |", "| 图像/GPU/临时资源 | sky-image-file-session、use-sky-artwork、loader/request、sky-gpu-textures、sky-canvas-lifecycle |");
  } else if (name === "STATE.md") {
    text = text.replace(/^最新窗口退役：[^\n]+$/m, "最新窗口退役：历史项目及v1至v11均已关闭，9444已无监听，本轮只维护clean-v12目标。9445虽仍有监听但原生RPC未响应；不要开多代历史窗或把旧Frame当新证据。必要8789/8791保持，当前恢复点看本页起首。");
  } else {
    text = text.replace("## 当前入口\n", "## 当前入口\n\n" + link + "：当前共享文件会话/启动退休实现、App修前失败检查与本代实际文件/画面、重启后未闭合恢复和夹具状态。完整质量及目标义务继续。\n");
    text = text.replace(/^按用户指令，12个历史窗口[^\n]+$/m, "按用户指令，闲置历史窗口及v1至v11替代窗均已退，本轮只维护clean-v12；SDK当前失去响应须按STATE核真实会话。历史文件保留，共享8787/8788和owned8789/必要8791未动。");
    text = text.replace("旧会话遗留进入共享owner下一依赖", "该轮跨运行时文件缺口现见当前共享owner记录");
  }
  await fs.writeFile(file, text);
}
const progress = path.join(item, "PROGRESS.md"); let text = (await fs.readFile(progress, "utf8")).replace(/\r\n/g, "\n");
const point = text.indexOf("## 2026-09-28"); assert(point > 0);
text = text.slice(0, point) + "## 2026-09-28 D共享图片文件归属与启动退休\n\n" + current + "\n\n详" + link + "；源码/类型/原生文件观察与未闭合项分开，仍以唯一PLAN驱动。下方记录各自当轮条件，不是当前恢复状态。\n\n" + text.slice(point);
await fs.writeFile(progress, text);
const context = path.join(root, "project_context/architecture/runtime-and-domain.md"); text = (await fs.readFile(context, "utf8")).replace(/\r\n/g, "\n");
const anchor = "The page's registered deep-sky cutout path separates"; const pointInContext = text.indexOf(anchor); assert(pointInContext > 0);
assert(!text.includes("`services/sky-image-file-session.ts`"));
text = text.slice(0, pointInContext) + "`services/sky-image-file-session.ts` owns the encoded-file runtime namespace and per-request sequence shared by the native artwork Hook and selected-object request. It is pure service code; App `useLaunch` supplies the native filesystem and sandbox root. A coalesced once-per-runtime scan sequentially retires only recognized previous-runtime generated artwork/Messier files, including the legacy unsuffixed selected-object cache name. Current-runtime files, unrelated names and directories remain intact while current requests may proceed. Listing unavailable and partial deletion stay distinct, with non-sensitive diagnostics and no rendering-loop scan or unbounded retry. Existing request/Canvas owners still release their own live files and fence late writes; persisted HTTP responses and account preferences remain separate responsibilities. New generated-name formats require reviewing this classifier and compatibility boundary. Local native startup observations do not certify phone OS termination, runtime garbage collection, native/GPU memory or final recovery/composition.\n\n" + text.slice(pointInContext);
await fs.writeFile(context, text);
console.log(JSON.stringify({ updatedCurrentOwners: ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md"], durableOwner: "project_context/architecture/runtime-and-domain.md" }));
