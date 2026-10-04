import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(item, "evidence"), name = "experience-w3-publication-2026-09-29.md";
await assert.rejects(fs.access(path.join(evidence, name)), { code: "ENOENT" });
const read = file => fs.readFile(path.join(root, file), "utf8");
const json = async file => JSON.parse(await read(file));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const assets = "workers/miniapp-api/assets/deep-sky";
const current = await json(`${assets}/manifest.json`), currentHash = digest(JSON.stringify(current));
assert.equal(current.schemaVersion, "allwise-w3-deep-sky-publication-v3");
assert.equal(currentHash, "87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073");
const previous = await json(`${assets}/publications/${current.legacyPublicationHash}.json`);
assert.equal(digest(JSON.stringify(previous)), current.legacyPublicationHash);
const legacy = await json(`${assets}/publications/${previous.previousPublicationHash}.json`);
assert.equal(digest(JSON.stringify(legacy)), previous.previousPublicationHash);
let originalImages = 0;
for (const entry of previous.entries) for (const asset of Object.values(entry.levels)) {
  const raw = await fs.readFile(path.join(root, assets, asset.file));
  assert.equal(raw.length, asset.bytes); assert.equal(digest(raw), asset.sha256); originalImages++;
}
assert.equal(originalImages, 153);
const wide = await json(`${assets}/wide-field-w3/manifest.json`);
for (const tile of wide.tiles) assert.equal(digest(await fs.readFile(path.join(root, assets, "wide-field-w3", tile.file))), tile.sha256);
const input = await json("output/allwise-w3-hips-0929/candidate-axes-corrected/candidate-result.json");
for (const tile of input.sourceFiles) assert.equal(digest(await fs.readFile(path.join(root, "output/allwise-w3-hips-0929/candidate-axes-corrected/sources", tile.path))), tile.sha256);
const chain = await json("output/playwright/cloud-sky-w3-publication-chain-0929/result.json");
const oldGpu = await json("output/playwright/cloud-sky-w3-finite-0929/result.json");
assert.equal(chain.sourcePublicationHash, currentHash); assert.equal(chain.encodedFilesAfterRelease, 0);
const entry = current.entries.find(value => value.objectRef === "M:42");
for (const [level, asset] of Object.entries(entry.levels)) {
  assert.equal(digest(await fs.readFile(path.join(root, assets, asset.file))), asset.sha256);
  assert.equal(input.levels.find(value => value.level === level).sha256, asset.sha256);
  assert.equal(oldGpu.results.find(value => value.level === level).sourceSha256, asset.sha256);
  assert.equal(chain.rows.find(value => value.level === level).sha256, asset.sha256);
}
const prepared = await json(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-v18-candidate-2026-09-29.json");
assert.equal((await fingerprintBundle(path.join(root, prepared.bundle))).sha256, prepared.fingerprint.sha256);
for (const tag of ["v16", "v17"]) {
  const older = await json(`.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-combined-clean-${tag}-candidate-2026-09-29.json`);
  assert.equal((await fingerprintBundle(path.join(root, older.bundle))).sha256, older.fingerprint.sha256);
}
const release = await json(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-w3-release-http-2026-09-29.json");
assert.equal(release.rows[1].publicationHash, currentHash);
const report = `# C：源缺测版本化出版、加载与组合绘制

M42三档已接入原出版／BFF／Mini加载与来源链；当前v3只替换该目标的源绑定PNG，其余150张JPEG不变。完整交互体验仍是主线；此模块接入不代表整体画质、原生组合或目标验收完成。

## 已实现与实际证据

- 数据管线复用已收到的20个HiPS FITS输入（21,029,120B），没有重新下载。\`allwise_finite_tan.py\`和\`hips_tan_lookup.mjs\`在正式publisher下重建完整TAN几何、复用healpix-ts采样及严格源校验；三档PNG与原候选逐字节哈希一致。只将非有限源样本设为alpha0；有限黑色仍保留。缺测计数不是无伪影科学覆盖率，\`validFraction=null/NOT_MEASURED\`保持。
- 新v3 publication hash：\`${currentHash}\`；不可变PNG地址含像素SHA。旧v2 \`${current.legacyPublicationHash}\`及v1 \`${previous.previousPublicationHash}\`均可经原清单／图片路由取得。153个旧JPEG、12个广角JPEG、20个原始FITS及v16/v17候选完整性再次核对。
- 新Mini显式\`imageVersion=source-finite-v3\`，无版本客户端继续读v2 JPEG。BFF按实际格式／维度／hash／WCS／源receipt校验；响应带实际出版hash及source ID。新加载器拒绝未绑定或相互冲突的成功回复，选择PNG／JPEG后才写入自有请求文件；取消、迟到写入、替换和启动清理复用既有owner。旧客户端继续使用旧端点；新客户端需要支持身份响应头的BFF，不能靠旧服务忽略query假装完成新版接入。
- 实际已绘Frame的图片hash传入现有modal及独立sources route，共享hook／API缓存纳入版本和hash。旧粗图可用时不会显示新细图来源；绑定出版物不可用时保留目录资料、PARTIAL与重试，不静默换来源。维度／级别规则归\`miniapp-contracts/src/deep-sky-image-publication.ts\`，出版、传输和原TAN注册消费者复用。
- 实际Nest/Fastify HTTP读到新三档PNG、对应清单和绑定资料，也读到全部153张旧图及v1代表图。\`experience-w3-release-http-2026-09-29.json\`另核编译后production-condition contracts/API导出，真实JPEG/PNG和来源hash相符；使用显式Memory/weather测试ports，无listen或部署，未认证现有8789/8791进程已换版本。
- \`experience-w3-publication-chain-2026-09-29.mts\`把实际HTTP字节经生产Mini请求／真实本机文件owner送入完整\`drawSkyScene\`及共享TWGL renderer。BSC/OpenNGC和Astronomy Engine为真实出版与算法，Context/weather为明确Memory测试adapter；不生成第二套渲染器。

| 档位 | 编码B | 源缺测像素 | 整场缺测内点 | 当前缺测像素变化最大值 | 填白变异变化 | 已保留亮部内点 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${chain.rows.map(row => `| ${row.level} | ${row.bytes} | ${row.sourceMissingPixels} | ${row.missingInteriorSamples} | ${row.maximumMissingChange} | ${row.whiteMutationChange} | ${row.brightChanged}/${row.brightSamples} |`).join("\n")}

实际条件：${chain.at}、observer=${JSON.stringify(chain.observer)}、390×844、垂直FOV=2.4°／1.35°／0.54°、NIGHT、指向同刻M42。比较使用透明图片诊断基线以保持相同目录符号／可用性，填白仅是有界反例，不进入产品。三档完整画面已看；均提交正确图片来源，OBSERVATION红光时不提交该来源。全部3份实际编码文件由owner释放后为0；这不是微信文件系统／GPU/native峰值或手机资源测量。

实际输出：
${chain.rows.map(row => `- [${row.level} 整场图](${root.replaceAll("\\", "/")}/output/playwright/cloud-sky-w3-publication-chain-0929/${row.filename})`).join("\n")}

## 修前失败与核对

v3路由fixture修前被旧服务以publication_invalid拒绝；真实HTTP opt-in修前仍返回v2同hash，未换图片或来源。Mini修前把真实PNG写成.jpg；资料adapter修前接受另一出版物的来源；过渡成功回复缺hash时也能写图。上述反例各已复现，修后对应检查通过。任务链记录保留实际数据，不用测试数量衡量产品完成。

Python实际PNG alpha读回、有限黑色与缺FITS尾padding／缺科学数组区别；BFF版本／旧offer／绑定来源／恢复；Mini格式／身份／取消／解码／来源route／Back和原场景消费者均通过。Mini typecheck、contracts/API release build、SDK current及WEAPP隔离构建通过。保留三项原Webpack顺序／体积建议，不把它们或本机rawB当官方包体／性能。

## 干净候选、限制与下一依赖

clean-v18尚未打开：SHA256 \`${prepared.fingerprint.sha256}\`，${prepared.fingerprint.fileCount}文件／${prepared.fingerprint.totalBytes.toLocaleString("en-US")} rawB，raw main ${prepared.rawPackageBytes.main.toLocaleString("en-US")}B。无诊断／mock／vConsole／source maps；包含新加载、来源及既有轴修复，图片由BFF提供。loopback8791仅开发，不推手机。

本轮没有原生RPC重试、新窗口、被取消提权重试、手机动作、常驻服务、云部署、Git提交或推送。旧v12当前Frame／Context／4B夹具仍未知；已有安全会话恢复时先核其归属并退休，再用一个v18，先绑定实际服务出版／接受Context／已绘Frame。新月面依旧无本代手机证据。

有限源条带、饱和孔洞及整体C/B3质量／其它配准／合法覆盖继续开放；不能把缺测孔洞当真实暗星云、把有限比例当质量mask，或强加全153科学mask为普遍完成条件。HIps输入完整数组但缺2624B尾padding的标准限制保在receipt。没有填洞、改CRPIX、隐藏对象凑质量或扩大商业范围。

下一步回到同一候选的A入口／D重解码及来源／C09网格与模式／公共时间回复、返回和恢复组合；真实运行不可安全取得时，继续PLAN同阶段可执行差距，不重复本轮源下载或已闭合加工。完整旅程、环境质量、真实姿态／完整旋转校准／OS后台、Android/iOS、首屏／帧时／native资源／官方包体／流量／成本和必要独立审查均未关闭。自审不是独立审查；Goal active、无预算。
`;
await fs.writeFile(path.join(evidence, name), report, { flag: "wx" });

async function edit(file, transform) {
  const location = path.join(root, file), before = await fs.readFile(location, "utf8");
  const after = transform(before); assert.notEqual(after, before, file); await fs.writeFile(location, after);
}
function once(text, from, to) { assert.equal(text.split(from).length - 1, 1, from.slice(0, 100)); return text.replace(from, to); }
const checkpoint = `**当前检查点：Goal active、无预算；完整体验为主线，只用微信开发者工具。** C已将M42三档源缺测PNG接入原版本化出版／BFF／Mini加载与来源链；实际HTTP→文件owner→完整生产场景的软件GPU保缺测／亮部、红光无影像署名及编码释放，编译production-condition HTTP也核新旧兼容。详[本轮模块与限制](evidence/${name})。最新clean-v18已构建、未打开；source-finite-v3由BFF提供，旧v1／v2清单和153 JPEG保留。没有新窗口、原生RPC／取消提权重试或手机动作，v12实际Frame／Context／4B夹具及现有服务运行版本仍待核。有限源条带／饱和缺口、完整旅程、B3/C质量／配准／合法覆盖、真实姿态／校准／后台、Android/iOS／资源性能／官方包体／费用／独立审查义务保持，新月面没有本代手机验收，Goal未完成。`;
const preparedLine = `最新准备：clean-v18，SHA256 ${prepared.fingerprint.sha256}，257文件／4,479,339 rawB、main2,085,621B；尚未打开。含新图片版本／来源绑定和既有共享轴修复；旧v16/v17指纹完整性已核，不能从软件图认证新原生Frame。当前依赖只见PLAN。`;
for (const file of ["STATE.md", "INDEX.md"]) await edit(path.relative(root, path.join(item, file)), text => {
  assert(/^\*\*当前检查点：[\s\S]+?\n/m.test(text));
  let after = text.replace(/^\*\*当前检查点：[^\r\n]+/m, checkpoint);
  if (file === "STATE.md") after = after.replace(/^最新准备：[^\r\n]+/m, preparedLine)
    .replace("owned8789 PID22124/exec54820、8791 PID21852/exec37410不变，当前context/resource均pass、held/active0；", "owned8789 PID22124/exec54820、8791 PID21852/exec37410为历史运行记录；截至该历史轮context/resource均pass、held/active0，本轮未认证运行版本；");
  else after = after.replace(checkpoint, checkpoint + `\n\n[本轮源缺测出版、加载与组合绘制](evidence/${name})：v3／旧offer兼容、真实HTTP与完整生产场景、绑定来源与资源释放、prepared v18和全部未验边界。唯一下一依赖见PLAN。`);
  return after;
});
await edit(path.relative(root, path.join(item, "PLAN.md")), text => {
  let after = text.replace(/^\*\*当前：[^\r\n]+/m, checkpoint.replace("当前检查点", "当前"));
  after = once(after, "最新准备候选为尚未打开的clean-v16", "最新准备候选为尚未打开的clean-v18");
  after = once(after, "尚未版本化接入，有限源条带仍存在", "已接入v3／旧offer及实际HTTP→文件→整場软件GPU／来源链，有限源条带仍存在");
  const start = after.indexOf("   **当前可执行依赖："), end = after.indexOf("\n4. **待用户恢复真机", start);
  assert(start > 0 && end > start);
  after = after.slice(0, start) + `   **当前可执行依赖：C源缺测出版／加载／来源已接，转同一候选的运行代次与组合恢复。** [本轮版本化链](evidence/${name})完成M42三档源绑定PNG、全部实际输入／完整TAN几何、旧v1/v2 offer兼容、实际HTTP／Mini文件owner／整場软件GPU、来源hash与取消释放；有限暗色保留、科学有效率仍未知。原源条带／饱和和C/B3整体质量／其它配准／合法覆盖不由这项接入替代，不填洞／改CRPIX／隐藏对象或强加全153mask。已取得输入与本轮完成路径不重复。

   最新clean-v18 prepared、未打开，含新版加载／来源及共享HiPS轴修复；源码／编译后production-condition API可读v3，但现有8789／8791进程实际版本本轮未认证。没有原生RPC、被取消提权或新窗口重试。可安全恢复时先核旧v12真实Frame／Context／4B夹具归属、退休旧会话，再用一个v18核服务出版版本／当前接受Context／实际已绘Frame；批量核A正常／无效入口日期、D粗细档重新解码／图片来源／独立来源Back、C09开关／时刻／红光／换行避让、公共时间回复与返回恢复组合。当前无法安全取得原生会话时，继续同阶段可执行差距，保持原生／目标证据未验，不把整个Goal挂在设备上。

   [正常／异常成功回复](evidence/experience-context-ack-2026-09-29.md)原完整意图与最多一次无缓存读回已闭合开发边界；正常合法回复不加GET，异常不重放PUT，未提交不能假成功，不另建回执存储或普遍“恰好一次”条件。[共享网格计算及整場保持](evidence/experience-grid-tracer-cost-2026-09-29.md)／[C09参考限制](evidence/experience-coordinate-grids-2026-09-28.md)和[HiPS共享轴／源输入](evidence/experience-hips-source-binding-2026-09-29.md)保各自条件，旧位置／截图／端口不认证新版。新月面、完整旅程／环境与来源质量、真实姿态／校准／OS后台、Android/iOS／资源性能／官方包体／成本／独立审查继续保留。
` + after.slice(end);
  after = once(after, "W3科学有效比例未量、当前v2明确未知；M42原始Atlas INT／COV已取，不能由局部样本认证成品全图。同HiPS成对与坐标已核、M42三档自有源绑定候选已生成；版本化出版／BFF／Mini加载链仍未接，有限源条带仍存在。", "W3科学有效比例未量；v3／兼容v2明确未知。M42原始Atlas INT／COV及同HiPS输入已取，不能由局部样本认证成品全图；自有完整TAN三档PNG已版本化接入出版／BFF／Mini及绑定来源链，软件整場与实际HTTP已核，源有限条带／饱和和原生／目标完整质量仍未完成。");
  after = after.replace(/^当前恢复补充：[^\r\n]+/m, `当前恢复补充：${preparedLine} 无新窗口／常驻服务／云或手机动作，没有提权重试。旧v12和现有任务服务的运行状态保历史范围；未取得v18原生接受Context／已绘Frame。`);
  return after;
});
await fs.appendFile(path.join(item, "PROGRESS.md"), `\n\n## 2026-09-29 C：源缺测版本化出版与真实消费者\n\n${checkpoint}\n\n正式publisher复用20个已收HiPS输入，重建与既有候选完全一致的三档PNG、保153旧JPEG和两个历史offer；显式新imageVersion／实际响应hash／modal与来源route共享绑定、未绑定或冲突回复拒绝、适用粗图与独立目录资料／PARTIAL恢复均接原owner。真实HTTP与production-condition API、新Mini写入／取消／启动清理、实际完整生产场景GPU和红光／编码归零已核；源码和软件不替代原生／目标验收。${preparedLine}\n\n详细输入／反例／实际输出／剩余义务见[本轮证据](evidence/${name})。下一依赖转同一候选的运行代次／组合恢复；没有新常驻服务／窗口／手机／云／Git动作，不重复本轮下载或已闭合加工。\n`);
await edit("data-pipelines/deep-sky/README.md", text => once(text,
  "The current object-cutout manifest is `allwise-w3-deep-sky-publication-v2`.\nEach JPEG has `validFraction: null` and `coverageState: NOT_MEASURED`:",
  "The current manifest is `allwise-w3-deep-sky-publication-v3`. It retains 150\nCDS JPEG levels and supplies three source-bound M42 PNG levels. Each level\nhas `validFraction: null` and `coverageState: NOT_MEASURED`:")
  .replace("these JPEGs have no published source validity mask.", "unmasked JPEGs have no published source validity mask. M42 PNG alpha marks\nonly nonfinite selected HiPS samples, separately from scientific validity.")
  .replace("## Commercial-use notices and distribution", `## Source-bound PNG migration and delivery\n\n\`publish_allwise_w3.py --objects M:42 --finite-candidate <checked-candidate-directory>\`\nuses \`allwise_finite_tan.py\` and the existing Node/healpix-ts implementation in\n\`hips_tan_lookup.mjs\`. Install the pinned offline-render requirements when\nregenerating (Pillow, Astropy and NumPy); ordinary CDS JPEG publishing imports\nonly Pillow. The checked directory contains the input plan/receipt and cached\nFITS tiles; its parent supplies the hash-bound HiPS properties. This mode makes\nno upstream request. It verifies each receipt/hash and the complete scientific\narray, reconstructs the TAN WCS, selects nearest NESTED cells, stretches finite\nvalues and checks encoded PNG alpha and the already approved candidate hashes.\nMissing end padding stays in the receipt; truncated arrays are rejected.\n\nThe migration requires a current v2 publication, preserves its raw archived\nmanifest and all old JPEGs, writes immutable PNG paths, then switches metadata\natomically. Partial failure keeps old current metadata usable. Ordinary\n\`--all\` refuses to regenerate v3 in place. The manifest carries both previous\nhashes and the explicit legacy v2 hash. BFF hashes use JSON.stringify semantics,\nnot arbitrary JSON serialization. Current input/projection/processing and\nrights travel with the new PNGs; the old JPEG is not given an inferred mask.\n\nNew Mini requests opt in with \`imageVersion=source-finite-v3\`; no-version\nclients still receive v2 JPEGs. Explicit publication hashes always select that\narchived offer. The response supplies MIME, dimensions, field, publication\nhash and source ID, plus missing-sample count only for source-bound PNG. New\nclients require identity headers before writing/painting and need a compatible\nBFF before rollout. Object information accepts \`deepSkyImageVersion\` and\n\`deepSkyPublicationHash\`; modal/source route and caches bind actual painted\npixels rather than automatically disclosing the newest publication. A missing\nbound source retains independent catalogue facts as PARTIAL with retry.\n\nThis is local pipeline/HTTP/consumer verification. Source detector bands and\nsaturation remain; finite samples do not establish artifact-free quality,\nAtlas exposure depth or confidence. Native/phone composition, registration,\nwhole experience and resource/cost acceptance remain separate obligations.\n\n## Commercial-use notices and distribution`));
await edit("project_context/architecture/runtime-and-domain.md", text => once(text,
  "W3 publication v2 represents source measurement coverage as `validFraction=null`, `coverageState=NOT_MEASURED`. JPEG dimension/extrema checks establish display usability only; neither black/finite display values nor a decoded image establish valid source-data coverage. No source validity mask is currently published. The previous v1 manifest is preserved solely for existing immutable source offers; its former hard-coded fraction must not be used as measurement evidence. The publisher preserves existing JPEG bytes, refuses in-place replacement and carries the declared predecessor through regeneration. This metadata correction does not repair detector artifacts, saturation, gaps or target registration, nor does an unchanged running service automatically adopt the new version. Details and regeneration boundaries remain with the publication owner.",
  "W3 publication v3 adds three source-bound M42 PNG levels while retaining all old JPEG bytes and v1/v2 immutable offers. `validFraction=null`, `coverageState=NOT_MEASURED` remain: PNG alpha marks only nonfinite nearest HiPS samples, not artifact-free scientific validity or Atlas observation depth; finite black measurements remain data. `allwise_finite_tan.py` and `hips_tan_lookup.mjs` under the existing publisher bind checked cached inputs, complete TAN WCS, sampling and encoded alpha before an atomic version switch. Explicit `imageVersion=source-finite-v3` selects current imagery; no-version clients retain the declared v2 JPEG publication, and explicit archived hashes select their own bytes. Image MIME/dimensions/hash/source headers are validated by the new Mini request owner before persistence; older servers without identity headers cannot silently supply pixels under new provenance. `miniapp-contracts/src/deep-sky-image-publication.ts` owns the version and level dimensions used by BFF, Mini transport and existing TAN registration. Actual painted image metadata binds modal/source route, shared query/transport caches and BFF object-information source selection; unavailable bound provenance keeps independent catalogue facts PARTIAL/retryable rather than replacing the source. Both archived metadata and current images remain independently recoverable. The previous v1 hard-coded fraction is historical and not a coverage measurement. Source bands/saturation, registration, native/phone whole experience and resource/cost acceptance remain open; an unchanged running service does not automatically adopt v3. Details stay with the publication owner."));
await edit("project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md", text => once(text,
  "当前出版物未附有效性mask，也未测量有效覆盖比例；v2来源与机器可读清单明确保留未知。旧v1清单仅为历史链接兼容，其原硬写比例不作为覆盖依据。",
  "当前v3在M42三档PNG附非有限HiPS样本透明标记，其余JPEG未附mask；全部档位科学有效覆盖比例仍未知，有限暗像素仍保留，不能把源缺测孔洞当真实暗星云。新Mini显式选择source-finite-v3，响应格式／维度／出版hash和source ID核实后才加载；无版本客户端保持v2 JPEG，v1／v2历史清单及原图仍可取，v1原硬写比例不作为覆盖依据。来源modal／独立route及共享缓存绑定实际已绘图片的出版hash；绑定来源缺失保独立目录资料／PARTIAL／重试，不能改成最新来源。来源及主画面区分源缺测留空与单纯亮度／边缘显示淡化。"));
const closed = { scope: "Local module checkpoint and immutable input/offer/candidate verification; no native/phone/whole-quality/review acceptance", currentHash,
  legacyHash: current.legacyPublicationHash, v1Hash: previous.previousPublicationHash, originalJpegsUnchanged: originalImages,
  wideJpegsUnchanged: wide.tiles.length, sourceFitsUnchanged: input.sourceFiles.length,
  candidate: prepared.fingerprint.sha256, actualSceneChain: true, releaseHttp: true,
  nativeCandidateOpened: false, existingTaskServicesVerified: false, newMoonPhoneAccepted: false, independentReview: false };
await fs.writeFile(path.join(evidence, "experience-w3-publication-close-2026-09-29.json"), JSON.stringify(closed, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(closed));
