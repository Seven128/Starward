# EOG 分片原静态 owner：仅本地准备

2026-10-28接续唯一 PLAN P2，在原 Map static / OSS owner 内接通 prepared EOG 分片的本地静态准备，原独审结果保留在下方。10-30进一步完成同一owner的有界目录与运行读取接线，见[最新实施](#partitioned-map-static-index)。两次均未重哈17.42GB原件、读取数值TIFF、重产PNG、上传或部署；`DEVELOPMENT_ONLY`、`formalReady:false`、`runtimeActivated:false`保持。原独审只覆盖其原记录范围，不冒称审过10-30增量。

## 原责任内的接线

- 原 `map-publication-inputs.mjs` 增加显式 `nightLightSharded:{file:"index.json",bytes,sha256}` 输入，拒绝与 PUBLISHED export、terrain/cloud 或 composed-window 输入混用。新 `eog-map-publication-input.mjs` 是该原 owner 的离线适配器，不是另一发布平台。原 r6/schema2 仍要求既有 PUBLISHED export，旧路径不改。
- 原 `ShardedNightLightPublication` 核根 pin、Python canonical 内容身份、每个坐标 shard、原科学 proof、六 band 描述及 contrast identity。离线阶段遍历完整声明集合，额外经原 `readFixedNightLightInventory` 和原 display inventory 交叉核 part/window 集合及完整计数；不是请求阶段扫描全国列表。逐图只持有当前有界 PNG，原 source PNG→现成 contrast 使用同一 `validateNightLightContrastDisplay` 核 CRC、尺寸及每一 RGBA 通道，未调用 encoder/producer。
- 根、shard、part inventory、两类 proof 和原/最终 PNG 保留原字节在 `publications/` 控制区；该原色标 PNG 是恢复后重复像素准入所需控制材料。`files/` 公开对象只含最终 contrast PNG，不复制数值 TIFF、源输入 manifest、原件或数据库行。公共 SourceSummary 字段白名单沿提取后的 `map-publication-source.mjs` 与旧 schema2 共用。
- 原 `map-static-manifest.ts` 严格容纳原 `nightlight-sharded:<hash>`、嵌套控制路径和既有 `nightlight-contrast-v1-window-…png` / `nightlight-display:<hash>`。新源的 **`admission: DEVELOPMENT_ONLY` 进入 sealed identity**，没有 QUALIFIED/override 分支。原 bundle 的封口、history union、隔离恢复和原字节冲突规则复用。
- 新 contrast record 不生成 business-host Caddy route。原 OSS package 可以生成精确本地 object/header 描述，标 `shardedNightLightSourceAdmission: DEVELOPMENT_ONLY_NOT_UPLOADABLE`、formal-ready false；原 upload 从重新准入的实际 source set 在 journal/client/remote 前拒绝 `map_object_store_sharded_nightlight_publication_not_ready`，不信任可删展示字段。原 HTTP verifier 对该源保留 DEV/未就绪事实。
- 入口仍是 `tools/deployment/map-static-bundle.mjs`，原 runbook 已补 `--night-light-sharded`、`--night-light-index-sha256`、`--night-light-index-bytes`。10-28 的 v1 离线 bundle 未接入共享 `MINIAPP_MAP_STATIC_PUBLICATION_ROOT`，当时两 runtime reader 都读 flat Map index。10-30 已在原 owner 内完成下方 v2 有界目录接线；现用有限 terrain/r6 配置仍未变，schema3 Service/public publish/layer/asset 的 not-ready 边界保持。

## 有效支持计数的实质反例与修复

自查确认原离线 `validateNightLightContrastDisplay` 会比较完整 RGBA，但没有将实际有效 PNG 支持与 proof 的 `validPixelCount` 比对。新增反例将一个原本有效像素在 quality 声明中改为未发布、总数仍自洽，然后重建 part inventory、proof、contrast、shard、root 的全部合法身份；实际两个 PNG 仍有 65,536 个有效像素，声明只有 65,535。修前准入未拒绝，测试得到 `Missing expected rejection`；原日志保留在本轮数据根的 `quality-counter-before.log`。

这项判断直接沿原科学含义：`eog_fixed_publication._validate_asset` 的 valid 是 quality 1/2，且要求 finite radiance 与它一致；`eog_fixed_raster.colour_png` 对每个 finite 值写非零 alpha，包括真实零，未有效支持留透明。当前 contrast 五段 alpha 均非零，透明像素保持原样。因此在原共享离线 validator 的现有像素循环中计有效数，并核 `pixelCount` 与同一 width×height、`validPixelCount` 与实际有效支持；错误报 `nightlight_display_quality_invalid`。没有改阈值、科学规则、零值含义、producer、PNG 输出或 runtime API 路径。

此修复影响原 publisher `--validate-parts` 与新静态适配器共用的离线验证依赖，须纳入本次 fresh 独审。它**不**从色块推断 `validZeroPixelCount` 或 radiance，更不替代源/数值六 band 的完整准入；该责任仍归原 publisher/scientific owner。

## 实际检查

- 原静态 bundle / object-store 两文件最终 **11/11**：旧 publication/window/route/header/恢复，cloud 原 DEV 边界，新 EOG 原字节/嵌套控制/旧记录 union/Caddy 不变、隔离恢复、错 pin/混用/数组 pin、重哈伪 QUALIFIED、重哈错误 RGBA/坏 CRC、上述质量反例，以及上传在 client/journal 前拒绝。删 package 展示字段仍 `package_changed`，0 client；没有外网请求。
- 原 EOG window/chunk/sharded 组最终 **19/19**；Python `test_publish_eog_viirs test_eog_fixed_publication test_eog_sharded_inventory test_eog_sharded_publication` **27/27**，后者 89.187s。全部只用原临时合成输入，没有真实 DB 或原件生产。
- `npm run typecheck -w @starward/miniapp-api -- --pretty false` 最终 **exit 0**。未运行产品 build 或 SDK 生成。
- 首轮扩大后的 Node 组 **18/19**：原 display-only fixture 把一个像素改透明，却仍留旧 65,536 有效像素摘要，因新有效支持核验失败。只纠正该受控 fixture 的一个透明/四个非零类的 support、zero 和 quality 计数，再跑 19/19；没有弱化生产规则。修前/失败日志 `shared-eog-node-tests.log` 保留，最终在 `shared-eog-node-tests-final.log`。最初 10/10 工具组及后续新增反例的 11/11 不混报为同一阶段。

命令入口均沿原 owner：

```text
node tools/run-node.cjs --test tools/deployment/map-static-bundle.test.mjs tools/deployment/map-object-store.test.mjs
node tools/run-node.cjs --import tsx --test workers/miniapp-api/src/night-light-window.test.ts workers/miniapp-api/src/night-light-sharded-publication.test.ts workers/miniapp-api/src/night-light-chunk-proof.test.ts
# cwd: data-pipelines/dark-sky，使用既有 EOG venv
python -m unittest test_publish_eog_viirs test_eog_fixed_publication test_eog_sharded_inventory test_eog_sharded_publication -v
```

## 原 26 图真实封口与当前只读复核

新 owned 根为 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/static-preparation-20261028`，事前核不存在后独占创建；`prepare.mjs` / `process.json` / `result.json` 留原运行身份，进程已 exit0，不能据 STARTED 重跑生产。

输入复用原两根：`pilot/sharded/index.json` SHA `15fa42d4d49f32ca6bc310d05599f763e49c94a2968d75945a79d0e3e929c373`，以及 `real-preparer-z6-v3-canonical-20261028/index/index.json` SHA `97e18cdfc08e73d9a888a4c35d0ee1693fd6fa970e00ee4068d5804f718953c0`。没有更改它们或重新生成任何资产。

- `static-export/publication`：**26 PNG / 153,839 B**、两个 DEV night-light sources，Map publication hash **`e125d3a33d551d39e5aaea51bc393fc15af379baf2e3b378be34cb82993088b1`**。本包是独立有限 prepared 集合，没有替换当前有限 terrain/r6 bundle；旧集合的 union/冲突与原 Caddy 字节保持由上方原工具用例核验。
- `oss-preparation/package`：package SHA **`5f868bcbd07c864edec394102361be72bee8e892683d9c3212ac1f6d392d0504`**；origin `https://map-assets.example.test` 仅离线示例，**不是已配置服务、域名或正式 URL**。
- 原 root/shard/part/proof 与原/最终 PNG 共 **118 份**源文件的 bytes/SHA 前后完全相同；新原色标与最终图的完整 RGBA 映射实际通过。原 26 图与 proof 的六 band 描述/版本绑定沿共享科学 proof 准入，但本模块没有读数值 TIFF，**没有重做完整 six-band 数值资格**。
- 增加有效支持核验后，未重新复制/封口。使用当前 shared validator 只读重开原两个输入、完整 sealed bundle 和 package，实际所有 26 图的 RGBA 与有效支持均通过、原 118 文件及两项身份不变。`post-edit-readback.json` SHA **`0aa9a4d9288a9d4f3fb89b8e505e6a02d6e30908f482631d8318d076b9c004c1`**，保当前 11 份 owner 源码 SHA；历史 `result.json` 的原 codeHashes 未改写。
- 对真实 sealed source 实际调用原 upload 资格入口，精确前置拒绝：**clientCalls=0 / journalCreated=false / remoteRequests=0**。没有真实凭据、对象、CDN/API 路由或 remote current。

当前适配器 `eog-map-publication-input.mjs` SHA `076ffda10004367435746e58dbd4ec317e770aab7ce37dafd0d72b1d76a48b15`；共享离线 validator `night-light-display-image.ts` SHA `11a561766ab03e4885629f6b569c157b64826d1fdd0afd126e4e5607300d1f21`。本轮文件还包括原 Map static contract/bundle/package/upload/verifier、公共 source 白名单、两份工具测试/共用 fixture、原 window 受控 fixture 与 runbook。没有改现用 Service、DB/repository、contracts/SDK、客户端或配置。

## 仍保留的义务

原件与全国全成品资格、LOD/窗口和真实目标画质、实际 OSS/ESA target/routing/字节与冷回源、原 public schema3 发布事务与完整消费者同批切换、客户端正确可见/资源退休、混合并发/容量与其他 Goal 结果仍未完成。本地 sealed/package、前置拒绝、fixtures 或本机 PNG 读回不能代这些结果；fresh 独审也只能覆盖其明确范围。

## Fresh 独立只读审查（2026-10-28）

独立 agent `/root/review_eog_static_dev_preparation` 在作者释放后重新读取唯一 PLAN P2、相关迁移/发布 Context、原 Map static/OSS 入口、新 EOG 适配器与公共 source 白名单，以及共享离线 contrast validator、原科学支持定义和受影响测试。**本次 DEV 准备范围通过，未发现阻断项**；没有把结论升级为全国、正式发布、实际 origin 或客户端资格。

- 封口与来源：核实 prepared sharded 分支必须显式 pin `index.json`，与旧 PUBLISHED-record/composed/cloud 输入互斥；根/part/shard/window 完整集合与原 proof/contrast 身份交叉校验。`DEVELOPMENT_ONLY` 位于 sealed source 身份内，重哈为 `QUALIFIED` 仍拒绝。恢复会重新经过同一原 owner；嵌套控制文件保原字节，公开对象只含最终 PNG，没有伪造 PUBLISHED 行、数值 TIFF 或原件副本。
- 像素与质量：核实共享 validator 只解码校验、不调用 encoder/producer，完整比较原/最终 RGBA（包括透明像素 RGB），有效支持计数沿原 `finite radiance ⇔ quality 1/2 ⇔ 非零 alpha` 规则，真实零仍属有效支持。原 display-only fixture 的摘要修正与其实际一个透明/四个非零像素变化一致，没有削弱准入。计数校验没有从色块推算 radiance/有效零，也不能替代六 band 数值校验。
- 上传与运行边界：核实 package 重新准入 sealed source set，而非信任可删展示字段；新 EOG 和 cloud 均在 journal/client/remote 前硬拒绝。新 contrast 不生成 business-host Caddy handle；旧 terrain/schema2 route/header、history union 和隔离恢复保原测试范围。未给 `TerrainPreparedPublication` 或共享 API 配置新的全国 flat 清单；原 schema3 Service 的 public layer/asset not-ready 在受影响原组中仍成立。

独立实际执行：原 `map-static-bundle.test.mjs` / `map-object-store.test.mjs` **11/11**；原 EOG window/sharded/chunk Node 组 **19/19**。其中包括重哈假资格、错误实际 RGBA、CRC、有效支持计数反例、旧 union/恢复及新/旧上传边界。Python 27 项和 API noEmit 是作者上文已有结果，本审没有重复运行或冒称独立执行；没有产品构建、SDK 生成、共享 API/DB/worker、IDE/手机或真实云请求。

另外用独立只读脚本重开两份原 root pin、完整 sealed bundle 和 OSS package：逐一比较 **118 份**原控制/PNG 与 sealed copy 的 bytes/SHA，核 **26 张最终 PNG / 153,839 B**（完整 bundle **146 文件**）、全部 RGBA/有效支持、无 TIFF 文件及无 Caddy handle。publication `e125d3a33d551d39e5aaea51bc393fc15af379baf2e3b378be34cb82993088b1`、package `5f868bcbd07c864edec394102361be72bee8e892683d9c3212ac1f6d392d0504` 与原结果一致；`post-edit-readback.json` 原 SHA `0aa9a4d9288a9d4f3fb89b8e505e6a02d6e30908f482631d8318d076b9c004c1` 及其中 **11 份**当前源码 SHA 均相同。对该真实 package 独立调用 upload 入口，得到精确 `map_object_store_sharded_nightlight_publication_not_ready`，**clientCalls=0**，专用 `fresh-review-must-not-create` journal 目录调用前后均不存在。没有读取数值 TIFF/17.42GB 原件、重产/重封口、写既存数据或连接远端；真实 six-band、全国与容量义务仍按上节保留。

本审仅补本节；未改源码、唯一 PLAN/HANDOFF/INDEX、Git、配置或运行状态。


<a id="partitioned-map-static-index"></a>
## 2026-10-30：Map静态目录按需分页接通

沿原PLAN P2处理“全国清单不能整体载入API”的已知缺口。原Map exporter新增v2目录：根只保来源身份与页范围；`catalog/<sourceId>/`存metadata页，`records/`存公开资产记录页。目录声明上限4MiB、每页2MiB，按已排序文件名/route二分定位；运行时保根、按需读页，不累积页缓存。历史v1继续读取，显式恢复保持原格式与publication hash；含cloud/sharded EOG的新导出（包括继承旧v1）默认v2。原PNG/proof、URL/header和科学坐标shard均保持。

共享`workers/miniapp-api/src/map-static-index.ts`持有格式、分页与读取。`PreparedTerrainPublication`和`PreparedNightLightWindows`已迁入同一lookup，仍由各自owner验证选中inventory、proof、PNG和DB身份；沒有把格式变化当正式发布。原export/restore/OSS package在离线阶段完整展开并重新执行科学准入；新源的DEVELOPMENT_ONLY参与两种格式的seal，上传资格仍在journal/client/remote之前拒绝。没有新增队列、current指针、源下载、图像编码或第二套Map数据平台。

### 必要检查

- 新目录与原runtime两组共 **18/18**：14,000条索引跨metadata/route多页，当前资产仅读根和各一页；缺项不扫描数据页；坏页/假范围/错pin失败、修复后可重读、取消/close隔离迟到结果。真实Service分别在v1/v2读取同一地形成品/完整粗父图和原光害窗口/PNG，未读无关EOG目录；保原URL、DB权威、失败恢复和非空结果。
- 原静态/OSS两组 **11/11**：source/完整集合/像素、历史union/恢复及两类DEV上传拒绝继续成立。随后补“旧v1 prepared精确恢复／新导出升级”的区别，受影响静态组最终 **7/7**（包含在前述组内，不再累加成新覆盖）。API `typecheck`通过。首轮Nest测试使用仓库根目录导致装饰器配置未加载，正式以API工作目录重跑；它是harness定位问题，不冒产品失败。
- 未构建或推送客户端、未刷新当前开发者工具、未重启8787/8798/8799、未运行DB/提醒worker；目前手机与API仍是原绑定。新读取路径的软件通过不冒实际已部署。

### 已有26张成品的实际目录升级

仅以原`static-preparation-20261028/static-export/publication`为输入，新独占目录为`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/static-index-20261030`。`operation.json`已COMPLETE；`result.json`与`validation-final.json`保存输入/输出、当前源码hash和检查结果，不能按STARTED重放。没有重新跑preparer或改旧封口。

| 项目 | 实际结果 |
| --- | --- |
| 原v1 publication | `e125d3a33d551d39e5aaea51bc393fc15af379baf2e3b378be34cb82993088b1`；原index字节复核未变 |
| 新v2 publication | `a46fa685eaa41bf364842e32923c47ed821055a3f7d88e3a7c13d39e02ad26ff` |
| 根index | 原59,003B → 新1,956B；新SHA `eac442095d2f7cb14580261a3a1b5c1980b7439fdf332d6a108452f2585a631c` |
| 图片与公开记录 | 同26张PNG/153,839B；URL、字节hash、header逐条完全相同；原控制材料由原离线validator重新准入 |
| 一次指定source根与资产查找 | 根1,956B + 当前source metadata页32,416B + route页15,297B，共3次文件读；未读另一source目录 |
| 资格 | 两source仍DEVELOPMENT_ONLY；runtimeActivated=false、formalReady=false、remoteRequests=0、imagesGenerated=0 |

这个有限集合验证了真实字节和原owner兼容，不是全国吞吐/内存基准，也未证明完整全国显示、正式源资格、OSS/ESA或生产容量。新包没有替换现用606条terrain/r6 API根；原r6、旧包和全部私有原件保留。云量source-group UNKNOWN、显示LOD/窗口未定以及本文件“仍保留的义务”继续有效。

<a id="existing-eog-display-resolution"></a>
## 2026-10-30：同一发布的粗细显示比较

沿原PLAN“锁定显示规格”，只分析已有pilot中同一沿海part的z10单cell和z12组合窗。共同dataset、源/数值/坐标/显示政策及publication一致；按原affine取完全相同范围，z10为192×128、z12为768×512，均投到768×512诊断画面。另一z6根属于不同dataset/producer epoch，没有拼入本次同版比较。原26资产准入复用，没有重哈全球原件、重产产品、geometry、上传或改变DEV/未就绪边界。

用原`targetArea`和六band中的有效面积比例，将每4×4细像元的辐亮度汇回对应粗支持，绝对残差均值3.0523e-6、最大7.4546e-5 nW/cm²/sr，24,576项重新按原阈值分档为0差异。原面积比例经过clip，有限几何精度仍存在，所以该比较不冒生产mass精确逆推或全国误差上限。所选区均quality1，没有零/缺测/低cf异常。

2,164个粗格内部含多档细像元；12,496/393,216（3.1779%）细位置与父格档位不同，差异集中在色档边界。Root实际查看最近邻放大、解析双线性及原细图三联诊断图，确认平滑粗图没有恢复同一细图的边界。解析模型不冒微信kernel；源仍为0.0041666667°网格，38.219m显示步长不冒新增卫星观测精度。完整两资产覆盖不同，7,091/8,600B PNG及803,516/5,902,963B六band TIFF不能直接算等覆盖全国成本；解码逻辑像素与压缩字节分列。

这条证据排除“粗图放大与细图完全等价”，但没有自行决定z10不够用、全国必须铺满z12、最高有效LOD或容量门槛。现有共享grid的最高z12/256像素cell/最多3×3请求只是当前实现边界，不因本比较升格为全国显示验收。继续保有限基础成品与必要有界细节、全国边缘/分区及真实交付义务，不按亮暗/窗口重复同类试验。

私有证据根 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/display-resolution-20261030`；`README.md`、`result.json`、16份输入身份、诊断图和原脚本均已读回。结果SHA `93c85747767f859020300e6dc8e60399b570bf5ec9f7c9a1c66f91779ecde5ac`。Root完整读取分析脚本、独立复核16个输入SHA并用另一数组排列重算上述残差/分档/差异计数，见`root-readback.json`。代理运行仅最后stdout遇GBK编码exit1，结果/COMPLETE已落盘；Root首次读回也在默认GBK读取proof时停止，显式UTF8修正后通过。两者均未重跑生产或覆盖原结果，不能将编码问题计作科学/产品失败。该代理已结束，没有新服务、设备操作或生产源码变化。

<a id="prepared-covering-window"></a>
## 2026-10-30：有限预制的覆盖读取与准备成本

原PLAN要求有限预制与必要有界补图，不能将最高支持LOD理解为全国全部窗口形状生产。Root用当前grid函数计算E72–138/N0–56宽矩形的工程成本情景：z8为2,352个cell、z12为581,296个；全部1–3×1–3形状分别为20,304和5,217,948项。完整六band Float64的cell逻辑量分别6.891/1,703.016GiB，全部形状则234.609/61,094.297GiB。**这不是已采用全国范围、国界或实际压缩存储/内存/容量**，没有据此生产。按z6祖格分组，一个完整祖格的z12单cell已经占满原4,096项单part限额，不能再直接混入粗层/组合图或提高守卫。原脚本、精确数字及边界在私有`eog/coverage-preflight-20261030`；首次Windows ESM路径解析失败发生在操作创建前，改标准file URL后只完成算术。

随后真实pilot读回确认：精确`12-3344-1782-3-2`不存在，但同版`12-3344-1782-3-3`完整覆盖并已准入。已在原`ShardedNightLightPublication`增加`coveringWindow/coveringDisplay`，exact入口不变；共享同一shard、proof和PNG准入。按同级到较粗级、小面积、北/西起点等确定顺序选择完整覆盖，实际key/LOD/质量/来源不改名。缺声明与损坏分开，损坏不静默降级，取消/close不回迟到结果；无全国inventory扫描、数值TIFF读取或现场合图。

每级最多36候选键/4相邻shard，各shard仍≤2MiB，最多13个已声明级别；一般保守上界52次读取，计入低级世界大小可收紧为37次/74MiB编码metadata。临时仅持一层至多4个解析shard，不能将≤8MiB编码输入冒解析RSS。Root还将其接入原`NightLightService.preparedCoveringWindow`，复用实际DB/root绑定、原二进制并发上限及取消owner，仅返回PREPARED_ONLY描述，不带URL/PNG字节。旧exact接口和公开layer/asset未就绪guard保持。

- 原reader及新增覆盖行为最终 **14/14**：含Root新增Service内部入口的未发布、暖缓存身份漂移、取消/关闭及公开guard检查；API typecheck通过。没有全仓重测或手机重建。这三处API源码不在当前effa的1679前端输入绑定内。
- Root对现有pilot实际调用覆盖显示，选中原3×3、8,600B PNG，SHA `2003827f22675a632e7a2b8ae3f3b33138f85ed84ac516f44b21cdcbe8768609`原样；没有制造新图片。根已由前置exact查询载入后，这次真实文件读取为当前shard、两份选中proof和PNG，共4次/49,462B；未读别的shard、part inventory、源PNG、数值或全球TIFF。详`covered-window-root-readback.json`。
- agent只实施reader/原测试，Root完整读取新增边界、接通Service并执行最终14项和typecheck；没有另开只读审查。新代码尚未重启到8787，不冒现用API已部署；当前手机/r6路径、原数据与守卫保留。

这项补的是有限已备覆盖的发现能力，仍不证明全国供给。原preparer会把composition所需单cell也纳入本part，而sharded root严格拒绝重复key；不能为跨界窗口在多个part重复生产/接纳同一cell。随后已沿原owner完成下述离线组合与内部成品读取，正式范围、源footprint/halo、全国图质、OSS及容量责任保持。

<a id="cross-part-prepared-display"></a>
## 2026-10-30：跨part离线显示与内部成品读取

`readMapPublication`、原CLI和seal/恢复现共用既有`displayWindowTargets`（最多16项）。sharded入口按当前已声明LOD选未裁剪窗口，优先复用同级完整覆盖；否则逐一准入至多3×3个原单cell，以各proof所属part读取源PNG，通过原window/contrast owner合成。缺单cell明确`window_target_unpublished`，不冒透明源缺测或偷偷裁短；源内实际缺测、有效零及质量计数原样保留。没有为新显示窗重复生产数值、geometry或新科学inventory。

派生原色标PNG/proof和最终contrast PNG/proof放同一静态source的`windows/`，身份绑定原root SHA，lazy复制不驻留整组图片。原source root、part、分片、六band和旧URL保持；静态seal及隔离恢复核完整控制材料和像素，改外层hash不能授予伪造派生图。所有新记录仍DEVELOPMENT_ONLY，图片没有进入Caddy业务API回源或绕过OSS上传拒绝。

Root接通`PreparedNightLightWindows.readSharded`和`NightLightService.preparedDisplayWindow`内部入口：显式seal、DB行及原root绑定，按所需metadata/route页和≤9单cell proofs核派生质量/身份，再直接读最终PNG。没有派生图时只复用原完整覆盖；已声明坏图明确失败。无现场PNG解码/编码、源图片或数值TIFF读取，无公开URL，schema3公开layer/asset guard保持。

| 核验 | 实际结果与范围 |
| --- | --- |
| 离线实施agent | 现有window与static组19/19；两个独立part夹具逐行比较完整RGBA、零/缺测/质量、root身份，覆盖缺格点、超范围、取消、重复声明去重、seal/恢复及篡改拒绝。完成后已结束。 |
| Root内部消费 | 新增2/2；读取真实封存派生PNG，与封包files目录副本字节相同。强制禁止PNG encode/decode和原cell图片/TIFF读仍通过；DB缺记录/暖缓存漂移、取消/close、坏图及公开guard成立。 |
| Root受影响兼容 | prepared/reader组25/25，OSS边界4/4；API typecheck最终通过。首轮类型检查发现控制流收窄错误，已显式return失败分支；未放松合同。新测试首轮年度fixture不满足schema3有效期，沿共享fixture补全正确年度，生产校验未变。 |
| 原pilot实际读回 | 原25条route/PNG记录原样；`12-3344-1782-2-2`复用同级完整cover，0次PNG编码、0新增派生文件。`12-3346-1782-2-2`缺东边细cell，明确未发布；未以存在的较粗图冒细图。原index SHA保持`15fa42d4…c373`。 |

私有证据归`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/cross-part-display-20261030`，`pilot-operation.json`已COMPLETE，不重放；`pilot-result.json`、Root检查日志及`result.json`保具体身份。真实pilot两part相距较远，跨part相邻cell数为0，因此**跨part拼接机制由夹具证实，真实全国相邻分片/halo尚未验收**。未重产已完成代表批次、重启8787或刷新手机；这些API/离线文件不在effa的1679前端绑定内。下一依赖为采用的有限显示范围/LOD/基础窗口声明、真实边界质量、全国供给与正式分发/容量，不追加同机制普通窗口试验。

<a id="real-part-source-boundary"></a>
## 2026-10-30：两个真实相邻源脚印的边界

上一节的合成夹具没有验证源part裁切后的数值支持。本次仅补这一独立机制：复用已获权2025沿海原件，选已有同位置基准的`12-3344-1784-1-1`、`12-3345-1784-1-1`，在新私有目录准备两个各自独立的源part。原pilot、r6、z6/v3成品及原件未改，也没有重建完整代表批次。

先用当前坐标owner检查每格全部257×257个像素角点的两个连续分支，再按真实EPSG:4326原网格向外取整并加一个原像元余量。两格声明的native窗口分别为`[70535,12576,26,23]`、`[70556,12576,26,23]`；源范围重叠5列，显示fixed key各归唯一part。第一格65,536个中心均走SHIFTED；第二格64,959个SHIFTED、577个IDENTITY，覆盖实际近海坐标转换边缘，不能将该近似轮廓冒国界。原两份全局栅格均为86,401×33,601/同affine；仅读取header和本次有界像元，没有重新下载或完整重哈原件。

原`prepare_release`/数值validator/`prepare_index`实际完成两个part、两个asset、一个坐标shard，独占进程11.672秒正常退出；这不是全国吞吐或部署容量基准。初次预检因原pilot与当前intersection代码SHA不同而在生产前停止；Root核旧SHA对应HEAD、当前差异为既有可选source_core约束，dense默认仍使用完整数组，再记录两个epoch继续比较，未把不同SHA标成同版源码。

| 同位置原基准比较 | 实际结果 |
| --- | --- |
| 完整六band | 全部保留；质量、有效零掩码、NaN位置一致；不是逐元素bitwise相同 |
| 辐亮度最大绝对差 | 两格分别`3.5971297052e-9`、`1.9467520929e-9` nW/cm²/sr |
| valid/published面积比例最大差 | 分别`4.4478754013e-11`、`3.6444625096e-11`；sourceMissing/insufficientCoverage/quality差0 |
| 最低published面积比例 | `0.9999676358`、`0.9999687329`，沿原`0.0002`面积数值容差；不另造精度门槛 |
| 原色标PNG | 两格均与原基准逐字节相同；各65,536像素quality1。本对照没有真实有效零或缺测，不冒新增覆盖这些机制 |
| 新两part根 | SHA `ad560b2c4ebf2f41dd1a598447c87572ffec067b60025501ada9116961d1c47d`，4,525B；dataset `eog-vnl-v22-2025-part-boundary-20261030` |

随后走原Map static合成与seal，真实新成品为512×256/2,239B，SHA `d6f2389552a22c68e2e41956f1f79adc2ba3704638464b71ac0cae8f2980a401`；131,072个完整RGBA逐行与两part原contrast像素相同。静态publication为`1b3259b44c7afdc88c184216cf976e44429ac2db80f3c7453b79709eaeecce4e`，只含两单元加一组合图。原`PreparedNightLightWindows.readSharded`在禁止PNG解码/编码及源PNG/TIFF读取的钩子下，实际读取15份所需metadata/成品文件，字节与封包files副本完全相同；没有伪造PUBLISHED DB行、API公开URL或实际手机安装。

私有根`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/real-part-boundary-20261030`：`operation.json`与`display-operation.json`均COMPLETE、owned进程已退出；原始声明、17份producer源码快照、绑定、六band结果和静态成品保留，禁止重放。此证据关闭本次相邻source-part/坐标分支边缘的独立机制缺口；**它不等于全国范围、所有实际边缘、最终LOD/基础图规格、OSS或容量验收**。成立的输入规则已接入下述批量声明入口；按实际不同机制/异常处理后续质量问题，不再按普通位置复制两格实验。formalReady仍false，云量UNKNOWN/12Z FAILED不变。

<a id="bounded-preparation-inputs"></a>
## 2026-10-30：原preparer的有界批量输入声明

原`prepare_fixed_eog.py`新增互斥`--declare-parts`模式，接收有限`[{id, windows}]`，复用原window展开和asset限额。重复fixed key（含composition隐含单cell）在投影前拒绝。全部part完整准入后，原`project_display_grid.mts`遍历各实际像素角点的双inverse分支；Python读原件header，向外对齐并加一原像元，源外、超过10°/原网格/window限额都拒绝，没有静默裁剪。输入4MiB、part及每part窗口各≤4096，原每part展开asset≤4096，投影进程≤300秒；不提高旧阈值、不枚举全国形状或增加新发布平台。

生成的source manifest保原数据/许可/质量/摘要，使用绝对原件路径，和每part windows一起由最后`declaration.json`绑定。只声明输入，未生成PNG/数值、DB状态或正式URL；原数值加工仍须显式调用，原publisher继续负责完整原件hash。源/代码漂移、部分失败或不可变冲突不能产生新完成标记。原`--windows`生产入口、几何cache和数值精度保持；几何共享遍历导致代码epoch更新，已封存旧成品不因此重建。

- geometry实施agent仅改原`.mts`及其测试，完成后已结束；6/6通过，两格包络逐值和原targetArea/targetBranch SHA匹配，原cache复用/损坏拒绝及stdin字节上限成立。
- Root新声明+原publication兼容检查10/10通过：相邻part、完整源像元余量、隐含重复key、严格输入、源外/超限、源在途变化、不可变重放，以及原schema1/2数值与发布。首轮一条夹具在世界边缘先命中坐标范围拒绝，调整到合法世界坐标后验证预期源外拒绝；没有修改生产守卫来通过。
- Root实际CLI使用上一节同两格与原获权文件，只读header和生成声明。native窗口仍`[70535,12576,26,23]`、`[70556,12576,26,23]`；双分支包络和sourceAoi逐值相同，4份输入文件和7项code binding均读回匹配。没有重跑原两part数值或Map static。

私有根`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/preparation-inputs-20261030`保原Python前像、测试日志、输入、CLI输出与COMPLETE操作记录。`declared/declaration.json`为3,181B，SHA `3cc8ccca9874809951e4d6f3ec0e62743f65db0280f5b2051669ed2a6aa4d9b7`；Root读回`result.json` SHA `e189f5022fd11f4df179d2ddca484eba7720b2c1f76f1bbfd3058d37389124bc`。这只关闭输入准备机制；全国有限显示范围/LOD/基础图规格、供给、正式OSS分发与容量仍未完成。既有candidate/API/r6/云量资格与guard未改。

<a id="wide-view-source-dependency"></a>
## 2026-10-30：宽视野与低LOD源范围的实际依赖

为判断有限基础图规格，Root沿当前Map允许缩放、request/grid/window owner核宽视野，没有新设全国范围。原E72–138/N0–56仍只是工程情景：`displayRasterWindowForBounds`得到z3/3×2；若供给只有已验证的`[6,10,12]`，`nightLightWindowForLevels`把其已对齐范围换到z6/24×16，原window validator明确拒绝。6,144×4,096只是选择计算，不是实际分配、公开API结果或native图片。原两格细视野则仍合法选择z12/512×256。

进一步用同一坐标owner计算z5/x26/y12单cell双分支包络，宽11.256882153967197°。Root实际调用新输入声明入口及原获权文件，得到`nightlight_preparation_part_aoi_exceeded`，没有输出目录、数值/PNG或发布。对应z6单cell宽约5.632°；既有分块preparer只解决一个≤10°源域内部的有界core累计，不能据此声称已经支持任意更粗完整cell。

因此“各地有细图/若干z6图”不能代替必要宽视野的完整基础覆盖。低LOD跨源域的有界完整支持仍是原PLAN基础图/面积mass责任的具体缺口，不能直接提高旧AOI/asset限额、在不同part重复同一key，或把源边缘透明当完整基础图。尚未据此采用全国范围、最高LOD、更多图块或修改方案；沿原owner继续实现/确定规格，保已有局部证据，不重跑它们。

私有根`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/display-coverage-boundary-20261030`保`geometry-result.json`、六项源码绑定、`admission-result.json`及说明。读取/几何操作已结束，无API、DB、手机或原件修改。
