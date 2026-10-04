import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const close = JSON.parse(await fs.readFile(path.join(item, "evidence/experience-independent-labels-close-2026-09-29.json"), "utf8"));
const reportPath = path.join(item, "evidence/experience-independent-labels-2026-09-29.md");
await assert.rejects(fs.access(reportPath), { code: "ENOENT" });
const report = `# B1/C/D 独立图层的名称、列表与恢复

本轮沿唯一PLAN继续整页辨认及失败恢复。实际发现：亮星静态目录缺失或对应时刻亮星帧不可用时，有效深空层仍正常画出M42/M43/M78，M42/M43仍可自然点选，但页面名称选择器提前返回，连带撤下M42/M78的名称入口。这违反独立图层失败不能带走有效结果的既定要求。

## 修复责任与边界

sky-stellar-scene.ts::resolveSkyDeepSkyScene统一深空层可用性及精确观察时刻，供生产绘制、对象列表、名称选择和内容可用性复用。有效静态目录在某个时刻不可用时仍可留存；坐标只能来自精确匹配且AVAILABLE的帧，不能借前一时刻的点。名称选择器分别检查亮星和深空候选，失败只影响该层。

原相机、已绘数据/时刻/模式、地景mask、星等、八个名称上限及46逻辑像素中心疏排保持。实际名称component、选择handler、目标/目录资料component和页面draw提交逻辑未改。没有新增渲染器、缓存、第二时钟、查询、下载或重试owner，也没有更改商业范围、原生技术路线、影像/日月球面责任。

## 真实输入及适用证据

使用当前本地BFF的公开示例点22.4826799N/114.5557147E、Asia/Shanghai、2026-09-28T20:00:00.000Z（当地次日04:00），真实BSC和深空出版、精确观察帧；25°垂直视场，M42方向，CSS390.4×844/backing390×844。故障条件是对实际报告中的独立图层作受控合同状态变更，不冒充真实网络中断或BFF故障。

生产drawSkyScene/renderer在同一headless Chromium SwiftShader中实际完成五种绘制，沿条件复用renderer，再把实际成功snapshot交给原页面draw回调、名称选择器、实际SkyOrientationCatalogLabel函数及selectCatalogObject handler。前后来源/hash、时刻/相机、component/selection/commit哈希绑定一致。

| 条件 | 修前名称入口 | 修后名称入口 | 保持的结果 |
| --- | --- | --- | --- |
| 完整数据 | 四个亮星名称及M42/M78 | 同修前 | 122个已绘对象，完整RGBA及点选一致 |
| 亮星目录缺失 | 全部撤下 | M42/M78 | 三个有效深空已绘对象；M42/M43自然点选一致 |
| 亮星精确时刻帧不可用 | 全部撤下 | M42/M78 | 同上，不借旧亮星帧 |
| 深空层不可用 | 四个亮星名称 | 同修前 | 119个已绘亮星，深空名称/点选不伪造 |
| 恢复完整数据 | 原六个名称 | 同修前 | 完整画面、名称与身份恢复一致 |

五组完整RGBA、已绘身份/坐标和点选候选与修前完全相同，GL错误0；每个名称按钮的语义/坐标/回调仍选择自身身份。过时观察帧、旧显示模式及失败画布都撤下名称。修前有效反例断言失败，修后通过；最初before目录因跨VM数组比较发生诊断adapter失败，无result.json，保留原文件但不作为产品断言；before-verified才是完整有效反例。

对象列表另走原/current catalogFrameObjects及实际公开输入：完整/恢复4251行、两种亮星失败22行（16深空/5行星/1太阳系目标）、深空失败4235行，前后身份/数值完全一致。此处没有SAO补充帧，计数是该时刻地平线上方对象列表，不是当前视场已绘数量、覆盖上限或完成率。未报告20:37Z时刻的共享解析保静态目录且frame为undefined，不借相邻时刻坐标。

证据：[修前](../../../../output/playwright/cloud-sky-independent-labels-0929-before-verified/result.json)、[修后](../../../../output/playwright/cloud-sky-independent-labels-0929-after/result.json)、[实际列表消费者](../../../../output/playwright/cloud-sky-independent-labels-0929-list-consumers/result.json)、[关闭与绑定](experience-independent-labels-close-2026-09-29.json)。软件GPU证明当前生产绘制；Node中的原函数证明名称/选择消费者行为。两者都不认证WEAPP控件实际合成、触摸/弹层/来源Back或完整旅程。

## 检查、候选与运行状态

受影响名称、目标/星座标签、独立场景恢复、绘制/HiPS行为检查和Mini类型通过；隔离正式构建成功，保原三项webpack警告（CSS顺序及两项推荐体积/性能）。两处Context更新后结构验证通过，只检查声明/路径，不认证文档事实或体验。既有星点显示成本和计时波动保原结论，本轮没有重复profile或新增性能通过声明。

clean-v23 prepared、未打开：SHA256 ${close.candidate.sha256}，257文件/4,484,207 rawB；main2,089,538/content1,012,055/sky958,997/spot423,617B。较v22 raw/Sky减少77B，主包不变，v22完整指纹保持。无诊断/mock/代次/vConsole/maps，app debug false；loopback8791仅开发，不推手机；raw不是官方包体。

本轮未替换服务。安全只读汇总确认8791来源模块仍为${close.service.informationModuleSha256}、Context仍8789，context/resource pass、held0/active0/PUT0。不打印/保存traffic记录或活动Context；无原生RPC、DevTools新窗、取消提权重试、手机/云/采购/Git写操作。

## 仍开放的交付义务

修复闭合的是独立图层的本地辨认/恢复边界。实际本代WEAPP名称/控件合成、进入→全天/局部连续缩放/星座识别→搜索/自然点选/资料来源→时间/跟踪→返回/恢复仍待组合验证。姿态/完整校准/OS后台、Android/iOS、新月面本代手机、地景/大气及源条纹/饱和/配准/合法覆盖质量、目标资源/首屏/官方包体/费用和独立审查保留。

唯一下一依赖见PLAN：能安全恢复原生时核旧v12真实会话及4B夹具归属，退休后只开一个v23集中验证完整旅程、C09、影像来源和失败恢复。当前不能安全恢复时继续原有B3/C整场构成和可辨认的真实差距，不重复已闭合图层恢复、来源故障、星点/投影profile、单体WCS或已取得源下载。Goal active、无预算，未完成。
`;
const checkpoint = `B1/C/D已修复独立图层名称的错误耦合：亮星目录/精确时刻帧失败时，有效M42/M78名称入口保持；深空可用性与精确时刻由同一owner供绘制/列表/名称/内容判断。真实软件GPU五条件完整RGBA/已绘身份/点选保持，实际页面component/selection及列表消费者已核，过时/旧模式/失败画布仍撤名。详[独立图层辨认与恢复](evidence/experience-independent-labels-2026-09-29.md)。clean-v23 prepared未打开，SHA ${close.candidate.sha256}、257文件/4484207 rawB、main2089538B；较v22 Sky/raw−77B、主包不变，v22指纹保持。8791来源模块/Context8789未替换，pass/pass/held0/active0/PUT0；无新窗/native RPC/提权重试/手机/云/Git动作。旧v12 Frame/Context/4B未知，完整旅程/WEAPP合成、B3/C质量/覆盖、姿态/校准/后台、Android/iOS、新月面手机、目标资源/官方包体/费用/独立审查继续开放。唯一依赖见PLAN，Goal active、无预算、未完成。`;
const staged = [];
for (const name of ["PLAN.md", "STATE.md", "INDEX.md"]) {
  const file = path.join(item, name);
  let text = await fs.readFile(file, "utf8");
  const pattern = /^\*\*当前(?:检查点)?：[^\r\n]+/m;
  assert(pattern.test(text));
  const heading = name === "PLAN.md" ? "**当前：Goal active、无预算；完整体验继续，真机不可用。** " : "**当前检查点：Goal active、无预算；完整体验继续，真机不可用。** ";
  text = text.replace(pattern, heading + checkpoint);
  text = text.replaceAll("当前v22", "当前v23").replaceAll("现v22", "现v23")
    .replaceAll("最新准备候选为尚未打开的clean-v22", "最新准备候选为尚未打开的clean-v23");
  if (name === "PLAN.md") {
    text = text.replace("此前v19/v20/v21 prepared、未打开；当前v23见下方整场点显示", "此前v19/v20/v21/v22 prepared、未打开；当前v23见下方独立图层恢复");
    text = text.replaceAll("再只开一个v22", "再只开一个v23");
    const next = "   **接续顺序：**";
    assert.equal(text.split(next).length, 2);
    text = text.replace(next, "   **B1/C/D独立图层辨认及恢复已闭合本轮本地边界。** [名称/实际列表/绘制证据](evidence/experience-independent-labels-2026-09-29.md)修复亮星失败连带撤深空名称；同一深空解析owner服务绘制/列表/名称/内容判断，精确帧不可用不借坐标。五条件真实GPU像素/已绘身份/点选保持，原component/selection和列表消费者已核；旧时间/模式或失败surface不显示旧名称。Node函数不认证WEAPP合成/触摸/来源Back。v23 prepared未打开、主包不增、v22指纹保持；本轮没有来源获取/星点profile/新窗或服务重启。\r\n\r\n" + next);
    text = text.replace("不重复已闭合来源故障/源下载/M51亚像素/profile", "不重复已闭合图层恢复/来源故障/源下载/M51亚像素/profile");
    text = text.replace("手机中文键盘快速输入/极速旧行与弹层组合、其他类别代表组合", "独立亮星失败下深空名称已修，本轮真实GPU/页面component/选择与列表函数保持，WEAPP组合仍待验；手机中文键盘快速输入/极速旧行与弹层组合、其他类别代表组合");
  }
  staged.push([file, text]);
}
const progressFile = path.join(item, "PROGRESS.md");
const progress = await fs.readFile(progressFile, "utf8");
assert(!progress.includes("## 2026-09-29 B1/C/D独立图层名称与恢复"));
await fs.writeFile(reportPath, report, { flag: "wx" });
for (const [file, text] of staged) await fs.writeFile(file, text);
await fs.writeFile(progressFile, progress + "\r\n\r\n## 2026-09-29 B1/C/D独立图层名称与恢复\r\n\r\n" + checkpoint + "\r\n\r\n实际修前名称缺失/修后恢复、自然点选/像素不变与对象列表消费者分别保其边界；故障是实际报告的受控图层条件，不冒充BFF断网。两Context owner记录独立层/精确帧语义并通过结构验证。Node/GPU不认证原生控件或完整旅程，唯一接续仍在PLAN。\r\n");
console.log(JSON.stringify({ report: path.relative(root, reportPath), candidate: close.candidate.sha256,
  updated: ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md"], service: close.service }));
