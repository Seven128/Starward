# 正常 selected W3 / SDSS：页面资格到同一真实图像的整场绘制

2026-10-02，task-only 作者证据。未编辑生产、出版图片、预算、PLAN 或 Context，未下载数据或启动服务/IDE/手机。生产 GPU owner 是 root 已开发接入的 `a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3`，本条不重新作生产采用决定。当前完整体验、画质、原生资源/性能及最终交付均未完成。

## 冻结实物

- [执行脚本](../scripts/experience-selected-full-hook-resource-journey-2026-10-02.mts)，51,989 B，SHA `d4f2ee1bf8c72979acc32682a0578f592d2aecd91116fb34c325362800cbeeed`。
- [`r3/result.json`](../../../../output/playwright/cloud-sky-selected-full-hook-1002-r3/result.json)，663,423 B，SHA `10922aff9d1d6543f036709acc1705f9ce942472f301c9c282fe3ea4d78898cf`，真实本代六条件 PASS。
- `source-binding-before.json` SHA `486ca3271f98f80e6a79e4b8a18f8ab402a000818048be1c2bcb4920cd3f807c`；`source-binding-after.json` SHA `7ed6183086347a79c1b96484b6155533bf88e2478715278be4f930eeffb681e7`。
- `metafile.json` SHA `75e3f4ae00d636eab54220fd59aee76146e1781f6a4d4ce3f188562ed57f3db8`；实际执行 `bundle.js` SHA `fdfc38a02c64f67d0c3f75d1708cdc5e1bf49268e841fa1542ed805bd9846d28`。
- `actual-final-owner.json`，8,414 B，SHA `9b809f1f0dec5d4f7e1613de20c42ee9c5268c79ea84535b16d0d235f0714d06`，在任何后置 oracle/打包之前持久化。
- 每行 `*.actual-observations.json` 在 pixel control 前写盘，包含实际正常全幅 RGBA、PNG、wanted、租约/解码身份、GL、source credit。控制另存 `*.actual-oracle-observations.json`、`*.source-absent.{png,rgba}` 和 `*.restored.rgba`。正常主图为 `*.{png,rgba,json}`。
- 实际抽取页面、selected 三 effect 与 state/ref/callback、frame SDSS 初始化器、credit 初始化器、`releaseContext` 全文均冻结；runtime / GPU / journey / pixel-oracle / final 五类浏览器 executor 保存确实执行的函数文本，完整调用及 adapter preamble 随执行脚本冻结。

`absWorkingDir=ROOT` 明确绑定当前 worktree。metafile 的每个非虚拟 input 均解析、读原字节及 SHA，任一失败直接失败，没有 catch 后忽略。138 个真实 metafile input 加 actual page / API URL owner 共 140 源绑定，分别保存原 source snapshot；只排除明确声明的 4 个 target adapter 和 1 个已冻结 extracted-entry，共 5 项。所有真实 source/输入、实际图片字节及 6 项保留设置/outbox SHA 均前后相同。旧脚本原来相对 cwd 的 resolve/吞异常方法没有继承。

## 真实资格和元数据

复用 `experience-full-hook-resource-journey-2026-10-02.mts`（原 SHA `b3fbc0747d6b463a265536642a589594a87f5bac0004660635e71aef840e902a`）及既有 frozen local BFF report / manifests / catalog / source bytes。current report 的 adopted projection、time presentation、star attachment 和 deep-sky exact frame 仍走实际 owner；其完整 SHA 在本代输入中。

W3 metadata 是离线调用实际 `DeepSkyImageryService.discovery('M:51'/'M:31')` 的完整 body；SDSS metadata 是实际 `SdssOpticalImageryService.currentManifest('M:51')` 的完整 body，冻结后由实际 bare client / contract assertion 消费。实际服务源码、current v3 manifest、SDSS publication、catalog pack/manifest 与 owner 均绑定。`runtime-metadata-and-offers.json` 保存实际 route/body/asset descriptor，116 份现有真实编码图片作为可供给输入，不等于下载 116 份；本代实际只传 8 份图片，缓存 payload 最终 4,304,077 B。

W3 current publication 为 `8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054`；SDSS M51 为 `5c068fae55a47444724767777532ce6af1b6555c41ca2afdcceed9e9ae762eff`。M31/M51 W3 这六 descriptor 都仍为 JPEG、`validFraction=null`、`coverageState=NOT_MEASURED`，没有 sourceFiniteMask。v3 版本名不认证这两个对象的科学有效覆盖。

页面 selected entry / registration ready / FOV level 来自 actual page AST，所有六条件先通过 actual `clampSkyFieldOfView` 同值检查。LOCAL optical development fixture 保持 false，W3 全天层 user flag false，其实际 Hook 仍存在；SDSS / selected 条件没有用 forced-ready 或直接造 bitmap 来激活。

同一 Canvas owner 的 actual selected discovery → assertion/snapshot → immutable descriptor acquire → demand/lease → actual page 三 effects → actual `node.createImage()` 路径完整执行。SDSS 使用实际完整 Hook、实际 shared native loader/request/runtime/cache。Map FS 是显式受控 WEAPP adapter；其中写入/读取原真实编码字节，经实际公共 SHA 校验。解码对象是真浏览器 HTMLImage，实际 weak-current 注册对象直接交给同一软件 WebGL renderer，没有用另一个已解码图或逻辑 GL 来替换。

## 最小路径的结果

| 条件 | 实际 SDSS rendered / coarser | 实际已绘来源 | 正常 end GPU 模型 | 暖帧 source upload |
|---|---|---|---:|---:|
| M51，0.2° | OVERVIEW / 无 | SDSS，W3 未提交 | 9,437,184 B | 0 |
| M51，0.05° | DETAIL / MEDIUM | SDSS，W3 未提交 | 9,846,784 B | 0 |
| M31，8° | 不请求 | selected W3 OVERVIEW | 262,144 B | 0 |
| M31，1° | 不请求 | selected W3 DETAIL | 393,216 B | 0 |
| M31 hide | 不请求 | 无当前呈现 credit | 0 | 不绘帧 |
| M31 newCanvas，1° | 不请求 | 新 selected W3 DETAIL 图像 | 393,216 B | 0 |

每个 visible 条件两次真实正常整场提交，10 次 GL error 均 0。实际 page frame 初始化器与 scene callback 共同决定 credit；不把 decoded-ready、texture bind 或 requested level 当已绘来源。M51 的独立 W3 DETAIL 正常可用/已解码，但 SDSS 成功画出时，实际 GL draw 和 painted callback 只有 SDSS cutout，actual page credit 是 Sloan / CC BY 4.0，不是 NASA/IPAC。DETAIL Hook wanted 确为 DETAIL + MEDIUM，MEDIUM 为实际 coarser；没有伪造 OVERVIEW 为 DETAIL 父层。M31 无 SDSS 资格，actual painted callback 指向其 W3 lease 所属的同一 image，credit 是 NASA/IPAC AllWISE W3 12 μm。每次 painted identity 都在该帧实际 GL draw source 中。

正常模型峰值最大 9,846,784 B，原 decoded source model 最大 13,631,488 B，均只是这条路径的观测。该条没有超过 16 MiB 的 GPU current set，不能替代此前 active-retention 超 pressure 场景，也不提供全产品资源上限。

M51 在 frozen frame 的实际高度为 **-6.559261763°**，M31 为 **51.943472334°**。这里包含全天视角/地景中心渐隐透出的地下方向，不把 M51 截图称当前地面实际可见。实际已查看三张 M51 OVERVIEW/DETAIL 与 M31 DETAIL 主图；现有细图仍有明显放大软化，该条证明资格、来源和消费路径，未解决/验收高清质量。

## 像素作用、隐藏与恢复

正常 raw 先持久化，随后同场实际 scene 只把 selected W3 / SDSS 两 consumer 参数置 null；另行 callback 记录该控制实际 painted sources。其余 source/Hook/metadata/shader/opacity 都未改。控制使两个 credit 都撤回；恢复原参数后 callback/source credit 返回原同 image，整幅 RGBA 逐字节恢复。

差异为 M51 两条件各 329,160 像素、最大通道差 196；M31 OVERVIEW 72,858 像素、最大差 148；M31 DETAIL / newCanvas 各 288,284 像素、最大差 148。删除影像也使实际 catalogue cue suppression 改变，因此这是影像 consumer 路径有作用的 oracle，不能解释为纯照片逐像素因果、科学正确或清晰度验收。每项控制和恢复的 GL ledger/upload/copy 成本另列 `contribution`；这些 finish 会释放纹理并使恢复重传，**未混入正常两帧指标**。

隐藏直接调用抽取的 actual page `releaseContext`（node ref=null，generation++，actual retire callback，renderer.dispose），随后用实际 page hidden effects 继续提交状态。实际结果是全部 weak-current image 0、decoded source model 0、GPU texture byte model/texture count 0；selected owned file 的租约 **1** 保留以恢复。没有用 renderer.dispose0 推断解码寿命0。

新 controlled native node / generation、新软件 WebGL Canvas、新 renderer 建立后 actual page effects 从原 leased file 重新解码：selected image object **9 → 10**，source SHA / immutable path 不变，图片传输 **0**，主图与原 M31 DETAIL 全幅 RGBA exact。另有 **2 个地景 alpha JSON 请求，共 74,167 B**；不能写“所有请求/网络为0”。final actual raw 显示 logical GPU bytes/texture count 0、cache leased 0、weak-current image 0；8 个编码文件 / 4,304,077 B 仍按 persistent cache 规则保留，不等于 clear 或物理文件缓存归零。

## 失败与受控边界

- r1 保留 FAILED、原执行源及五条 raw 行：前四个 owner 条件已运行，但 hide 未调用实际 page releaseContext，selected bitmap weak-current 仍为1，实际失败不升级。其 M51 DETAIL `.04°` 低于当前 page `.05°` 下限，只是 owner input，不是正常页面资格。
- r2 保留 FAILED、原执行源及六条 raw 行：补了 actual releaseContext，hide/newCanvas render/credit/identity 通过；后置 preserved receipt 错将仅 path+SHA 的原表与多 bytes 的读回表 deepEqual，打包失败。该代 final 断言曾执行但 raw 未存，保持 GAP。M51 `.04°` 仍无正常页面资格。没有修改旧 receipt。
- r3 修为可达 `.05°`，统一 receipt 明确 path+SHA 对比；严格源码/真实字节检查未放松。按 root 的定向复核要求仅重跑同六条件，无新对象、服务或来源。正常 raw / final raw 全部先持久化，才运行后置 oracle/打包。
- 每条件 `page.evaluate` 会把同字节 report 序列化成新 browser object，selected entry identity 可更新。M51 两条件 desired 都是 DETAIL，但这种合法 identity 重提交触发 page effect 再解码 object0→4，图片 transfer0。这不是保同 Tanstack query object、只改 camera 的纯 zoom 开销测量；各条件内部正常两帧保持同一 decoded image。
- React state/effect scheduler、query cache/transport settlement、Map FS、page visible/native mounted/无 canvasError 的呈现判断均受控；actual page callback 是摘取执行，不是完整 Taro 页面、Tanstack HTTP stale policy 或 full canvas lifecycle wiring。HTMLImage 为诊断而强持，weak-current 0 不认证 GC/native 物理内存0。逻辑 GL 字节不包括 driver/OS 开销；不认证 WEAPP decode/FS/driver、真实 hide/newCanvas、手机、FPS、成本或200 DAU。

## 作者读回与独立审查

作者只读 [helper](../scripts/experience-selected-full-hook-author-readback-2026-10-02.py) SHA `efc047bd5bc320b9e78f286ede56ad60faead1806d87f391bfe63ed9f7babdc6`，没有再渲染。`output/selected-full-hook-author-readback-1002-r2/result.json`，11,869 B，SHA `80a884800b929446da5054abf94263558f9df2854009317d8828dfb97c5df103`：11 PNG 全幅 Pillow 解码与 bottom-up raw exact，6 条正常/原观察绑定，5 条 absent/restored 全幅及 credit/身份读回，20 套 normal/oracle GL ledger 重算、完整 source SHAs 与 pre/post/metafile/snapshots 精确验证，final raw 相同。系统 Python 首次无 Pillow未开始读回；改复用 bundled Python。读回 r1 的“所有 transfer 为0”helper oracle错误实际抓到地景 alpha metadata，失败源/receipt保留，r2只修到已授权的 image transfer0，未再 render。

以上仍为作者证据；root / sphere 的独立实际 source / bundle / metadata / pixels / ledger 审查待其单独结果。作者读回不冒充独审或最终验收。该依赖没有发现需要生产修复的具体架构阻断；正常完整消费者集、原生总资源和整体组合仍继续按唯一 PLAN 推进。
