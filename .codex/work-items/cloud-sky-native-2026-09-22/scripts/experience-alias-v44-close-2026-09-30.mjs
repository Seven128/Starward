import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = path.resolve("."), task = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const bindingPath = path.join(task, "evidence/experience-alias-v44-binding-2026-09-30.json");
try { await fs.access(bindingPath); throw Error("This native alias record is frozen."); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const read = relative => fs.readFile(path.join(task, relative));
const json = async relative => JSON.parse((await read(relative)).toString().replace(/^\uFEFF/u, ""));
const traceBytes = await read("evidence/experience-alias-v44-native-events-2026-09-30.jsonl");
const trace = traceBytes.toString().trim().split(/\r?\n/u).map(JSON.parse);
const last = stage => trace.findLast(row => row.stage === stage)?.value;
const context = (await json("tmp/v44-context-resolved.json")).data;
const report = (await json("tmp/v44-current-public-report.json")).data;
const previous = await json("evidence/experience-sao-v43-binding-2026-09-30.json");
assert.notEqual(sha(context.contextId), previous.context.idSha256);
assert.equal(context.revision, 1);
assert.equal(context.selectedAtUtc, "2026-09-29T16:00:05.153Z");
assert.equal(report.context.contextId, context.contextId);
assert.equal(report.context.contextFingerprint, context.contextFingerprint);
assert.equal(last("current-recovery").shadowUi.sdk, "3.17.3");
assert.equal(last("current-recovery").shadowUi.modal.length, 0);
assert.equal(last("public-chinese-input").query, "牛郎星");
assert.match(last("native-chinese-results"), /找到 1 个匹配天体/u);
assert.match(last("native-chinese-results"), /HR 7557 · 匹配 牛郎星/u);
assert.match(last("native-chinese-selected-detail"), /河鼓二 · 牛郎星 · 天鹰座α/u);
assert.match(last("native-source-text"), /CC0 1.0/u);
assert.match(last("native-source-text"), /仅 HR:7557 的别名补自 2026-09-29T23:05:03.594Z/u);
assert.equal(last("public-chinese-source-route").currentPage.path, "sky/sources/index");
assert.match(last("public-chinese-source-route").currentPage.route, /reference=HR%3A7557/u);
assert.equal(last("non-edge-blank").shadowUi.selection.length, 0);
assert.match(last("native-overlap-choices"), /HR 7557/u);
assert.match(last("native-overlap-choices"), /HR 7562/u);
assert.match(last("native-overlap-choices"), /HR 7595/u);
assert.match(last("overlap-altair-row-selected"), /恒星 · HR 7557/u);
const publication = JSON.parse(await fs.readFile(path.join(root, "workers/miniapp-api/assets/celestial-names-v3/publication.json"), "utf8"));
const sourcePaths = [...new Set([...previous.sourceHashes.map(row => row.path),
  "workers/miniapp-api/src/chinese-star-alias-publication.ts",
  "workers/miniapp-api/src/celestial-object-aliases.ts",
  "workers/miniapp-api/src/celestial-object-search.ts",
  "workers/miniapp-api/src/celestial-object-information.ts",
  "data-pipelines/star-catalog/enrich_wikidata_chinese_aliases.mjs",
  "workers/miniapp-api/assets/celestial-names-v3/chinese-bright-star-aliases.v3.json",
  "workers/miniapp-api/assets/celestial-names-v3/publication.json",
  "workers/miniapp-api/assets/celestial-names-v3/source-provenance.json",
  "infrastructure/deployment/miniapp-api.Dockerfile"] )];
const sourceHashes = await Promise.all(sourcePaths.map(async name => ({ path: name,
  sha256: sha(await fs.readFile(path.join(root, name))) })));
for (const row of previous.sourceHashes) assert.equal(sourceHashes.find(current => current.path === row.path).sha256,
  row.sha256, "Unrelated v43 rendering/time input changed: " + row.path);
const candidate = path.join(root, "apps/wechat-miniapp/dist/weapp-check-sky-alias-v44"), build = await fingerprintBundle(candidate);
const captures = [];
for (const stage of ["chinese-located", "chinese-sources", "source-back", "stable-selected-sky"]) {
  const name = `experience-alias-v44-${stage}-2026-09-30.png`, bytes = await read(`evidence/${name}`), decoded = PNG.sync.read(bytes);
  captures.push({ file: name, sha256: sha(bytes), bytes: bytes.length, width: decoded.width, height: decoded.height });
}
const first = PNG.sync.read(await read(`evidence/${captures[0].file}`));
const back = PNG.sync.read(await read(`evidence/${captures[2].file}`));
assert.equal(first.width, back.width); assert.equal(first.height, back.height);
let changed = 0, maximumChannelDelta = 0;
for (let y = 100; y < 850; y++) for (let x = 2; x < first.width - 2; x++) {
  const offset = (y * first.width + x) * 4; let difference = false;
  for (let c = 0; c < 3; c++) { const delta = Math.abs(first.data[offset + c] - back.data[offset + c]);
    maximumChannelDelta = Math.max(maximumChannelDelta, delta); if (delta) difference = true; }
  if (difference) changed++;
}
const conditional = await json("tmp/v44-information-version-check.json");
assert.equal(conditional.oldConditionalStatus, 200); assert.equal(conditional.currentConditionalStatus, 304);
assert.notEqual(conditional.before.contentRevision, conditional.after.contentRevision);
assert.ok(conditional.after.aliases.includes("牛郎星")); assert.equal(conditional.before.aliases.includes("牛郎星"), false);
const backend = await (await fetch("http://127.0.0.1:60065/__task/alias-state")).json();
assert.equal(backend.publicationHash, publication.assetSha256);
const binding = {
  recordedAtUtc: new Date().toISOString(), scope: "云观星中文查找与既有身份链的 DevTools 开发证据，非目标设备／整体交付",
  build: { path: path.relative(root, candidate).replaceAll("\\", "/"), files: build.fileCount,
    rawBytes: build.totalBytes, treeSha256: build.sha256,
    skyPageSha256: sha(await fs.readFile(path.join(candidate, "sky/detail/index.js"))) }, sourceHashes,
  previousRendererInputsUnchanged: previous.sourceHashes.length,
  runtime: { windowId: "s4", sdk: "3.17.3", publicPort: 60065, internalPort: 54455,
    pid: 33832, exec: 69033, loadedAliasModuleSha256: backend.moduleSha256,
    fixture: "MEMORY_TEST 正式点／天气，真实已编译 Sky 控制器与实际出版数据；未迁移旧 Context",
    retired: "v43/s3 已关闭；旧 owned 60063/PID30852 和 60061/PID16572 已停，旧证据保持历史条件" },
  context: { idSha256: sha(context.contextId), revision: context.revision, fingerprint: context.contextFingerprint,
    selectedAtUtc: context.selectedAtUtc, localDate: context.localDate, timezone: context.timezone,
    resolvedBytesSha256: sha(await read("tmp/v44-context-resolved.json")) },
  report: { rawSha256: sha(await read("tmp/v44-current-public-report.json")), at: report.context.at,
    dataRevision: report.context.dataRevision, catalogVersion: report.context.catalogVersion },
  publication: { version: publication.catalogVersion, sha256: publication.assetSha256,
    sourceProvenanceSha256: publication.sourceSha256, rowCount: publication.rowCount,
    singleChangedIdentity: "HR:7557", aliases: ["河鼓二", "牛郎星", "天鹰座α"] },
  nativeTrace: { path: "experience-alias-v44-native-events-2026-09-30.jsonl", sha256: sha(traceBytes), records: trace.length },
  captures, canvasSourceReturn: { region: { x: [2, first.width - 2], y: [100, 850] }, changed, maximumChannelDelta,
    scope: "同候选 Canvas 场景裁去系统区后的读数；不能认证普通 Sky WXML 层" },
  current: last("current-recovery"), backend,
  checks: { regressionBefore: "实际 牛郎星 结果 undefined 而要求 HR:7557，失败记录保留",
    ownersAfter: "publication/search/information 相关行为检查通过", typecheck: "miniapp-api passed",
    workerBuild: "passed", miniappBuild: "passed with existing CSS ordering / resource size / no async chunk warnings",
    publicationReproduction: await json("tmp/v44-alias-publication-check.json"),
    detailConditional: { previousRevision: conditional.before.contentRevision, currentRevision: conditional.after.contentRevision,
      oldEtagReturns: 200, currentEtagReturns: 304 }, finalConsoleFilter: "clone|recursive|Error returned empty" },
  investigationLimits: [
    "首轮测试在仓库根未读取 worker decorator tsconfig，后在正确 workspace 得到真实修前失败；不是产品回归结果",
    "第一次所选点坐标落在既有选择标记，不能当作 fresh Canvas picking",
    "x385 落在16px边缘手势保护区，未清选择不当作失焦失败；只计后续 x360/y820 的真实空白结果",
    "单点 touch-only 输入没有证实点击，不计通过；后续真实坐标 tap 得到合法三个候选，再公开选择 Altair",
    "两个 Sources 选择器／scrollTo 调用失败；实际来源文字和 Back 已取，未取得滚到 Wikidata 卡的截图",
    "Sky 普通控件 bounds/z-index 可读且在视口，但 Canvas-only 截图不证明控件合成；没有 SDK 或平台根因结论" ],
  remaining: ["整体图层／面状渐隐、构图与质量", "普通覆盖层／呼吸和完整组合", "真实资源、官方包体／成本、最终审查",
    "新版月面／姿态／OS 生命周期和目标设备；手机暂不可用，大字号继续暂停"] };
await fs.writeFile(bindingPath, `${JSON.stringify(binding, null, 2)}\n`);
await fs.writeFile(path.join(task, "evidence/experience-alias-v44-native-2026-09-30.md"), `# 中文查找与身份链：v44\n\n“牛郎星”中文输入现能在实际开发者工具查得唯一 Altair／HR:7557，资料保 HIP97649／HD187642／河鼓二及同一新增别名。公开定位到当前天空，来源进入 HR:7557，平台 Back 保时刻、45°视角和选择；所选信息仍 BASIC_ONLY，不新造中文介绍。来源实际 WXML 显示 CC0 和原批量／单对象取得日期。\n\n沿既有 CC0 固定出版及共享 alias/search/information owner，仅增加 HR:7557 的两个实际别名；其它3,148行、基底恒星测量与全部商业排除保持。v1/v2资产不变，新v3同时绑定原批量查询和 Q12975原始字节／revision。正确 worker 环境下先观察真实中文无结果失败，再核修后 owner、公开 HTTP／资料 ETag 200→304、原始输入精确复现及错误 HR 拒绝。新固定出版触发既有 contentRevision，旧内容不冒充新来源。\n\n## 当前候选与实际边界\n\n[完整绑定](experience-alias-v44-binding-2026-09-30.json)和[实际输入／节点记录](experience-alias-v44-native-events-2026-09-30.jsonl)保失败及限制。当前仅 v44／s4／实际 SDK3.17.3；任务60065／PID33832／exec69033／内部54455是新独立epoch，已通过正式点 owner 新建Context revision1，未迁移旧ID。当地次日00:00:05.153，观测夜09-29，DAY标准字号／手动45°，Altair选择，无modal／列表／播放／跟踪。候选${binding.build.files}文件／${binding.build.rawBytes} rawB／tree SHA ${binding.build.treeSha256}；原v43的${binding.previousRendererInputsUnchanged}个渲染／时间生产输入hash不变。构建三项原有警告保留，rawB不冒充官方包体。旧v43窗口及两个任务服务已退，旧记录保原条件。\n\n中文定位原图与来源Back原图仅比较同一Canvas区域，${changed}像素改变、最大通道差${maximumChannelDelta}；两图系统时钟不同，不宣称全PNG相同。Sources普通UI原图可见，Sky普通控件、modal、选择十字／呼吸仍缺可靠合成截图。427×919宿主图与v43的192×413不同，不作跨候选像素验收。\n\n定位后真实空白坐标tap清选择，当前星点再tap出现Altair、HR7562、Libertas三个候选；公开选Altair仍回 HR7557。不能把这种密集广角结果说成自动唯一命中，也不把已有标记上的tap、边缘保护区或没有效果的touch-only输入计作Canvas点选通过。45°时候选交互的易用性和整体场景仍归后续组合核验。\n\n源数据完整快照在[Q12975原始输入](wikidata-Q12975-2026-09-30.json)，只使用明确HR关系和中文名，不采用其中其它测量。出版与获取时间分别说明，没有宣称全批刷新、正式中文名或完整覆盖。没有云部署、预览上传、真机操作、采购或预算调整。Goal active，无预算，未完成；唯一当前方案仍为PLAN。全部33项义务、原技术路线和商业理由保持，下一回整体图层／面状构图、组合稳定性和质量，不无界补别名。\n`);
console.log(JSON.stringify({ build: binding.build, context: binding.context, publication: binding.publication,
  canvasSourceReturn: binding.canvasSourceReturn, traceRecords: trace.length }));
