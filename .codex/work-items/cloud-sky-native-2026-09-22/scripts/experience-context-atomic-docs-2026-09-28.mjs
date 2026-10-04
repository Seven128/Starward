import fs from "node:fs/promises";
import assert from "node:assert/strict";
const task = ".codex/work-items/cloud-sky-native-2026-09-22/";
const note = "evidence/experience-context-atomic-2026-09-28.md";
const link = `[本轮原子提交及实际恢复](${note})`;
async function edit(file, change) {
  const before = await fs.readFile(file, "utf8");
  const after = change(before); assert.notEqual(after, before, file);
  await fs.writeFile(file, after);
}
function line(text, prefix, replacement) {
  const lines = text.split(/\r?\n/); const indexes = lines.map((value, index) => value.startsWith(prefix) ? index : -1).filter(index => index >= 0);
  assert.equal(indexes.length, 1, prefix); lines[indexes[0]] = replacement;
  return lines.join(text.includes("\r\n") ? "\r\n" : "\n");
}
function once(text, before, after) { assert.equal(text.split(before).length, 2, before); return text.replace(before, after); }
const restored = "当前clean-v11/SDK9444 PID34128，SHA256 99c50222cb3d64fc2201470c754d6e135c60b51b9711f8918b52f93469cc47db，257文件/4,469,986B最终逐文件读回不变；raw main2,081,604B不是官方包体。00:00/16Z、85°手动Vega/普通DAY，地景星座开、W3关、无跟踪/面板/旧时间错误，原版2K已绘来源。公开返回Map→云观星重进后，活动route/共享durable Context/BFF/Canvas同16Z/revision4。API8791为本任务pass转发（PID12252/exec34149）至加载原子更新的8789（PID22124/exec54820、log experience-context-atomic-service-2026-09-28.log）；旧14388/22711已退，原发布及两PNG未改，共享8787/8788未动。所有v2至v10替代窗已退，9441/9442/9443无监听。无诊断/mock/临时代次/vConsole/sourceMaps；七次本代193×413截图不提升为旧代清晰度或手机验收，loopback不推手机，私有route IDs不入记录。恢复先读" + link + "及[本轮最终绑定](evidence/experience-context-atomic-binding-2026-09-28.json)。";
await edit(task + "PLAN.md", text => {
  text = line(text, "**当前：", `**当前：Goal active、无预算；完整体验为主线，只用微信开发者工具。本轮D Context在真实Memory及两个独立Redis客户端复现同revision双成功/静默覆盖，已沿原缓存owner改为原子提交，期限不延长、到期不复活；HTTP消费者/跨夜/缓存失败恢复已核。** ${link}另核现有clean-v11上的真实服务替换→同点Context恢复→Vega跟踪失去成功响应→资料来源Back→Map返回重进，最终16Z/revision4、原2K已绘来源和257文件指纹不变，只保一个9444窗口。下一依赖回到C代表影像/地景实际组合与可用D测量，B3整页辨认质量仍开放；不重复已闭合的并发反例、旧研究或无限纹理精修。原对话paused，完整Goal未完成；全部商业取舍/理由、成本、自主代码、功能/交互/质量/验收义务不变。[当前Goal](GOAL-OBJECTIVE-CORRECTED-2026-09-28.md)、[上一轮环境与共享时间恢复](evidence/experience-environment-context-recovery-2026-09-28.md)保各自条件。Context幂等键回执、全服务幂等和独立审查没有由CAS自动认证；新月面/修复未推手机，旧D不升级，历史计划仅作历史。`);
  text = once(text, "本轮Context失去响应恢复和旧错误解除已由实际HTTP/v9/v10链验证，最终v11正常绑定。", "此前Context失去响应恢复和旧错误解除保HTTP/v9/v10条件；本轮真实Memory/Redis并发反例及原子修复、HTTP跨实例/到期/断连恢复、v11服务替换/时间跟踪/来源/Map重进已核，原候选指纹不变。");
  text = once(text, "BFF幂等/并发revision提交需有界核查；", "本轮revision原子边界有本地Memory/Redis证据；Context头回执及全服务幂等、生产配置未认证；");
  text = line(text, "   **下一小路径归D Context模块", `   **D Context有界并发路径已完成本地修复与消费者验证，下一小路径回到C实际影像/地景组合。** ${link}保修前双成功、原子更新及到期/断连/HTTP/当前native恢复的实际条件，不再以客户端读回替代存储提交证据，也不重做后端选型。现有候选沿代表机制走“连续缩放→日月/深空实际合成→画面点选/资料→来源Back→时间及返回恢复”，优先当前月面缺测/真实来源、M31或准入M51的注册边缘/复杂遮挡与同帧地景；检验实际差异和消费者，不逐天体重写或把额外纹理当主线。已有开关/时间动作不无意义重复，无新输入不重试M42两端点研究。并行于模块顺序补可获得的DevTools首屏/渐进与资源/请求测量，明确工具代理、主机/GPU逻辑量和目标设备量的界限；B3整体构成/辨认与可比参考仍按原完成条件。Context头未消费及跨服务幂等事实保留，CAS不自动认证持久回执或生产部署。`);
  text = line(text, "恢复状态：", "恢复状态：分支codex/remote-main-20260908、HEAD7898962b保持，无提交/推送。" + restored + "新月面及修复未推手机，旧D不升级。v7故障/网络缺行、v8参考条件不匹配、v9/v10不同传输次数完整保留；本轮本地原子提交不自动认证生产、完整体验、幂等键回执或独立审查。");
  return text;
});
await edit(task + "STATE.md", text => {
  text = line(text, "**当前检查点：", `**当前检查点：Goal active、无预算；完整体验为主线，真机暂不可用，只用微信开发者工具，不抓屏/输入/预览/轮询手机。** 本轮D Context真实Memory/Redis同revision双成功反例已修为原子提交；HTTP跨实例/跨夜、到期不复活和缓存失败保旧结果/重试已核。现有唯一clean-v11已走真实BFF替换→同点Context恢复→Vega跟踪丢失成功响应→资料来源Back→Map返回重进，最终16Z/revision4、原版2K已绘来源与257文件指纹不变。详${link}。下一依赖按唯一PLAN返回C代表影像/地景复杂组合与可用D测量，B3整页辨认质量继续开放，不重复已闭合并发/旧研究。全部原有效范围与目标性能、姿态/校准/后台/iOS、Context头回执/生产配置、独立审查/费用保留；新月面/修复未推手机，旧D不升级。旧v8至v10条件不自动认证当前候选。`);
  text = line(text, "当前clean-v11/SDK9444", restored);
  text = line(text, "最新窗口退役：", "最新窗口退役：原12个闲置历史窗口、v1残留进程及v2至v10替代窗口均已退，当前只用9444/clean-v11；历史构建/截图/JSON保留。共享8787/8788保持；owned8789本轮只为加载已验证原子更新替换至PID22124/exec54820，旧14388/22711已退。8791为当前候选必要pass转发，原出版保持且活动Context已回读。确需对照才重开旧窗；不把此必要转发当闲置项目杀掉。");
  return text;
});
await edit(task + "INDEX.md", text => {
  text = line(text, "**当前检查点：", `**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。** 本轮D Context真实Memory/Redis竞态→原子提交/TTL/到期及HTTP/断连恢复，现有clean-v11真实服务替换→时间/跟踪/来源/Map重进均有适用证据；原257文件指纹和2K已绘来源不变，只用9444。当前8789为PID22124/exec54820、8791 pass。按唯一PLAN返回C代表影像/地景组合与可用D测量，B3整页辨认质量继续开放；Context头回执/生产配置及独立审查未由CAS自动认证。新月面/修复未推手机，旧D不升级；全部原有效范围与目标平台/性能/官方包体/费用保留。`);
  text = once(text, "## 当前入口", `## 当前入口\n\n${link}：真实同revision双成功/最终单时刻的修前失败，以及现有CachePort/Memory/Redis单键原子更新、有效期和消费者恢复。实际HTTP/跨夜/到期/断连、当前v11丢失成功响应/跟踪/来源/返回重进与原候选/服务/图片字节分别绑定；旧route与活动Context的采集区别保留，不把工具404误当恢复失败。不升级手机、生产或完整质量验收。`);
  text = once(text, "[本轮环境与共享时间恢复、最终v11入口]", "[上一轮环境与共享时间恢复、当轮v11入口]");
  text = once(text, "服务端并发/幂等、整页/目标性能和独立审查未由该恢复替代。", "截至该记录，服务端并发/幂等、整页/目标性能和独立审查未由客户端恢复替代；本轮原子边界见当前入口，其余未自动认证。");
  return text;
});
await edit(task + "PROGRESS.md", text => once(text, "## 2026-09-28 B3/D环境组合、共享时间恢复与最终clean-v11", `## 2026-09-28 D Context原子提交与当前v11消费者恢复\n\n按唯一PLAN有界核查真实Memory/两个独立Redis客户端，复现同revision两个不同时间都成功、最终只有一个时刻；已在原CachePort两适配器原子检查/替换，原TTL/绝对期限不延长，到期不复活，冲突保留成功者。真实HTTP消费者/跨夜/另一实例读回、缓存失败/断连与重试通过，客户端原意图读回及共享通知继续复用；Context幂等头回执及全服务幂等未由CAS自动认证。\n\n只替换owned8789至PID22124/exec54820，原14388/22711已退，共享服务/原出版/客户端指纹保持。当前唯一v11实际服务替换→同点Context恢复→HR7001跟踪中丢失成功响应→17Z/revision3→资料来源Back→停止跟踪/00:00→Map返回重进；最终Canvas/durable Context/BFF/活动route同16Z/revision4、85°手动Vega、普通DAY、地景星座开/W3关，无跟踪/面板/旧时间错误、原2K已绘来源。旧route采集404与活动Context成功读回的区别按真实owner记录，未改产品掩盖采集限制。七次193×413实际图不作目标合成/清晰度认证。\n\nAPI类型/服务构建、受影响HTTP/Context/客户端消费者检查和实际字节绑定通过；测试夹具双退休清理失败已纠正单一owner。无手机/新窗口/重打客户端/部署/提交推送，原商业/自主代码/完整功能/交互/质量/成本范围不变。下一依赖回到C代表影像/地景组合与可用D测量，B3整体质量、目标资源/姿态/校准/后台/iOS、生产配置、独立审查与费用仍开放，Goal active、无预算。详${link}、[本轮最终绑定](evidence/experience-context-atomic-binding-2026-09-28.json)。\n\n## 2026-09-28 B3/D环境组合、共享时间恢复与最终clean-v11（历史BFF进程条件）`));
await edit("project_context/architecture/runtime-and-domain.md", text => once(text,
  "Context PUT currently does not consume the idempotency header; a native transport may make additional HTTP attempts, so this client reconciliation does not certify backend idempotency or concurrent-write atomicity.",
  "`ObservationContextService.update` commits through `CachePort.replaceIfRevision`: the existing key's revision check and replacement are atomic at the storage owner. Memory performs them without yielding; Redis uses one fixed parameterized single-key Lua script through the existing ioredis client, so independent API instances cannot both acknowledge different edits at one expected revision. It never creates a missing key or extends the earlier storage TTL/Context absolute deadline; missing-at-commit follows existing Context restoration and a competing revision remains a conflict. The Context schema, fingerprint and product validation stay with their existing owner. Context PUT still does not consume the idempotency header or persist a replay receipt; a native transport may make additional HTTP attempts. Revision atomicity does not certify same-response replay by key, production Redis configuration or full-service idempotency. Sky's page-local session may adopt a recovered Context ID while retaining the original entry route; readback must bind the accepted shared Context and actual painted time/location, rather than treating that obsolete route ID as the active owner."));
console.log(JSON.stringify({ taskOwners: 4, durableContextOwners: 1, scope: "Current state and next dependency only; all valid scope/exclusions and historical evidence preserved." }));
