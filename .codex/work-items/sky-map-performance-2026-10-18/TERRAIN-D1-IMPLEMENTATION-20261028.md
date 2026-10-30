# D1 当前发布接入与实际缺口：2026-10-28

本记录属于唯一 PLAN D1 的实施证据，不能关闭完整 Goal 或目标设备验收。原 r6、旧 URL、gen34、私有原件与已收到的性能资料均未改动。没有启动 API、提醒 worker、开发工具或手机操作，没有重新录制性能资料，没有修改 PLAN/HANDOFF、运行锁或运行配置。

## 已完成的真实边界

运行私有配置已明确 pin `map-static-hotspots-20261018/publication`，Map publication hash 为 `89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0`。其中只有一个 Terrain source，版本为 `terrain-fixed:c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722`，已有 4 targets / 13 current assets。此前 `TerrainService` 仅接到 current.lock 指向的 r6 7 张，未选到这些已预制 z12 成品。

现已接通现有 Map pin 到 TerrainService。实现文件为 `workers/miniapp-api/src/terrain-prepared-publication.ts` 与 `terrain-service.ts`；`terrain-fixed-publication.ts` 只提取原 inventory/proof 纯校验给新读取边界复用。构造选项为 `mapStaticPublication`，类型直接取现用 runtime config。MiniappService 的一处传参由 BFF owner 单独负责。

读取边界要求配置 pin、sealed manifest、source inventory、对应 proof、PNG、公开 route/bytes/hash/publication header 逐项一致；路径必须留在普通目录/文件内。选图只使用该单一 current Terrain source，多个 source 不自行按时间或版本猜选。没有另外建立 registry、缓存、发布平台或 source 并发。失败不静默回到旧 source 冒当前元数据；修复后的 metadata 可有界重试。消费者取消不取消其他 reader 共享的轻量 declaration；close 终止读取且不能返回迟到结果。

r6 的 7 张仍先按原发布读取 immutable URL；当前元数据与粗父图选择使用已 pin 的 current source。预览依旧只能使用完整、严格更粗且覆盖 **snapped fine window** 的成品，不把相邻单元或缺边图当父图，不组合不同 source 冒完整父图。

## 当前实物回读

复核入口与详细结果：

- `E:/Dev/Starward-data/development/terrain-d1-20261028/readback.mts`
- `E:/Dev/Starward-data/development/terrain-d1-20261028/readback.private.json`
- 同目录 `available-product-files.private.json`：仅授权数据/运行发布目录及已知 Terrain temp roots 的文件索引，450 个 PNG/proof 路径，不包含运行秘密。

从真实配置选出的 4 targets 经 TerrainService `getPublication` / `getPreviewPublication` / `getAsset` 回读：

| 现有 target | 最终 metadata key | 完整粗父图 |
| --- | --- | --- |
| 深圳原粗档 | window-11-1672-890-2-3 | 无更粗已发布图 |
| 公开约 4km 原窗口 | window-12-3345-1783-2-1 | window-11-1672-890-2-3 |
| 同级向东跨边界 | window-12-3346-1783-2-1 | fixed-11-1673-891-1 |
| 公开约 2km/中间固定格 | window-12-3346-1783-1-1 | fixed-11-1673-891-1 |

13 张 asset 均与原 proof/PNG 字节及 publication identity 一致；其中 7 张与原 r6 字节再次比对一致。fetch 尝试 0、derive 尝试 0、未建立 regenerable runtime cache，c84 与 r6 inventory 字节 SHA 未变。文件计时只是本地直接 Service 回读，不是端到端首次显示、手机手势或原性能瓶颈改善结论。

## 历史服务窗口的实际缺口

复用既有 2026-10-26 17 个 z6–z9 服务请求、55 个 referenced cell 及历史资格资料，不重录。这些请求没有手机手势/控件绑定，也不是福建全覆盖证据。补批前历史 79 个 qualified products 中，r6 7 个在场，其余 72 个 PNG/proof 在授权索引内缺失；不把旧声明和原路径当可调用的 `preparedProduct`，没有重新生产 r6。

当前已选 13 张对这 17 个服务窗口：整窗 exact 0、可组合的全部 cell 0、完整更粗父图 0。因此当前接线完成没有解决这些 z6–z9 窗口的实际供给。每窗 key、原事件时间、原图范围、cell 列表和缺口均在上述 readback 结果，沿历史 witness 仅验证原网格选择，不把 witness 当真实手机 viewport。

历史候选集合中，8 个请求没有完整几何父图候选；向相邻粗级取严格整数覆盖，得到下列有限缺口：

| 请求 window | 最小相邻父级 window |
| --- | --- |
| 6-51-26-2-3 | 5-25-13-2-2 |
| 6-52-25-2-3 | 5-26-12-1-2 |
| 6-53-24-1-3 | 5-26-12-1-2 |
| 7-101-53-2-3 | 6-50-26-2-2 |
| 8-201-107-2-3 | 7-100-53-2-2 |
| 8-200-107-2-3 | 7-100-53-1-2 |
| 8-199-107-2-3 | 7-99-53-2-2 |
| 8-198-107-2-3 | 7-99-53-1-2 |

这是 7 个唯一网格的**几何需要**，尚无可采用图片。两组 1×2 可以在来源一致、图质完整且整窗覆盖成立后由对应 2×2 承担；当前不能提前认定其发布资格。这份几何表不扩大为全国高分生产或无选择地重跑全部旧候选。

## 已补选定真实首窗与严格父窗

Root 已选定已观测首窗 `7-104-54-2-3` 与整数严格父窗 `6-52-27-1-2`。沿原 TerrainService 顺序准备 8 个唯一固定单元，再用原窗口组合得到 2 张窗口图；无 source 并发变更。所有 10 个新产品均要求全像素有效、sourceIssues 0、unavailableSourceTiles 0，才进入原 publisher 的 `preparedProduct`。原 13 张由明确的旧 PNG/proof 提供，新 10 张从 owned cache 读取；原 publisher 以 previous=c84 保原 URL、inventory-last 完成组装。

可交 Root 接原 static bundle 的准确产物：

- publication：`E:/Dev/Starward-data/development/terrain-d1-20261028/publication`
- publicationVersion：`terrain-fixed:43c0899311dc3558cc6ba0bf8fdcea98d0d939edd774d7f2e25e9fd45921cfb8`
- inventory SHA256：`67145c0d678264efa34b1859b521f507aa0bcb3196515727f2000df09c0e54d6`
- 单一 current inventory：6 targets、23 assets、0 retained；原 13 个 PNG/proof 与原字节逐项一致。
- 声明与结果：同目录 `selected-targets.json`、`selected-batch-result.private.json`；可复用离线入口 `prepare-selected-batch.mts`。

新增两个 target 的边界由历史 qualifier 的 witness 规则选出既定网格；仍不是手机 viewport：

| target | west | east | south | north |
| --- | --- | --- | --- | --- |
| Observed service window 7-104-54-2-3 | 112.50140625 | 118.12359375 | 20.634100295095372 | 25.79862510089151 |
| Observed z7 window strict complete z6 parent | 112.5 | 118.125 | 16.638886633620523 | 27.056621119525065 |

真实准备发生 32 次 Terrarium source 读取，均为 200，仅 z6/z7；组装与最终成品 Service 读回 source fetch 均为 0。首窗成品重现历史原 URL/hash `dd178455b3b58e37856d6b1ff4f3dedaaf47179715f58e02120b98545cba34eb`。6 targets 元数据与 23 assets 回读全部通过；首窗 preview 为严格父窗 `6-52-27-1-2`，requestedZoom=7、imageZoom=6。没有创建 assembly/readback runtime cache，没有改旧 inventory、私有运行配置、锁或 API。

补批后与历史 79 products 按原 filename 对照，恢复 9 个原来缺失产品，仍缺 63 个。17 个历史服务窗口中，1 个 exact 已供给；`7-104-55-1-2` 与 `7-104-54-1-3` 的 cell 集合已齐，仍需组合，不能报已有整窗命中；另外 14 个连完整 cell 集合仍未供给。没有扩大本次选区或把剩余请求冒完成。

Root 可将新静态 bundle 放在 `E:/Dev/Starward-data/development/terrain-d1-20261028/map-static-publication`，其 hash 必须由既有 bundle 工具实际生成。本 agent 没有生成或冒认 bundle hash。组装时只保留这个包含旧 13 张的**单一完整 Terrain source**；不能整包 previousDirectories 再引入旧 Terrain source 造成 current 选择歧义。其他现用 family 由 Root 按原 owner 一起组装。运行选择与 API 读回由 Root 接续，尚未把上述离线产物冒当前配置已激活。

## 聚焦验证与剩余义务

在 `workers/miniapp-api` 执行：

`node ../../tools/run-node.cjs --import tsx --test src/terrain-prepared-publication.test.ts src/terrain-preview.test.ts src/terrain-fixed-publisher.test.ts`

8/8 通过。新用例使用原 terrain fixture / producer / sealed exporter，覆盖选中当前 source 的 metadata、完整更粗父图、冷/热 immutable asset 原字节、r6 旧 URL、错 pin、坏 proof/inventory 的拒绝及恢复、source 歧义、取消/close；现有回归继续覆盖不足覆盖/partial/equal LOD/retired parent 拒绝与独立 fine operation。首次从仓库根目录运行旧 HTTP preview 用例时 tsx 没找到 worker decorator 配置；按既有 package cwd 重跑通过，这属于测试入口问题，不是放宽产品断言。

helper 的 never guard 已改为显式函数声明，修复 TypeScript 对 const-arrow guard 未收窄的 null/union 边界；测试的 outside request 明确为 MAP，避免 SPOT/MAP spread 扩大联合类型。修复后 API `tsc --noEmit -p tsconfig.json` 已通过。

独立 review、静态 bundle/运行选择与实际 API composition、选区外的剩余 z6–z9 供给、目标 UI 的首次正确覆盖/最终细节/持续进展、手机与物理资源排空/回落仍待各 owner 完成。此处不把 direct Service 命中或软件检查通过当成 D1/完整 Goal 完成。

## 2026-10-28 有限 17 窗批次独立核查

后续批次事实归 [TERRAIN-OBSERVED-BATCH](TERRAIN-OBSERVED-BATCH-20261028.md)。fresh `review_terrain_observed_batch` 只读复核其唯一 source，未改产品源码、PLAN、API/config、bundle、数据库或设备。没有重生产或抓取外网源；必要 Service 合成写入本次新 owned review cache，不读生产缓存冒冷结果。

独立入口和完整读回在 `E:/Dev/Starward-data/development/terrain-d1-20261028/observed-batch/independent-review-20261028/`：`readback-v2.mts`（SHA-256 `2b0adaeae989457cdce708f0c5790c80f4153fbbda4b0731cfc13125ae96697e`）及 `readback-v2.json`（`5761b85432cb578b4f1c62af9e72c3efc4052042d96604ae9f8539fa8372ff33`）。结果 `PASS_FINITE_OFFLINE_DATA_ONLY`：实际 inventory/result hash 匹配交付值，91 current +4 retained、191 文件/12,976,990 B；95 对 proof/PNG 经原 reader/hash/CRC/尺寸校验，旧 23 PNG/proof 逐字节相同、旧文件名和 publication identity 相同。所有 window 的 child 均匹配当前 cell 的 publication/file，独立累计比较 12,255,232 个 window pixels，8 个 production owner 文件 hash 与该批开始绑定一致。

17 个真实声明请求全部独立执行 `getPublication/getAsset/getPreviewPublication`：8 current exact、9 原 current-cell compositor，每条父图严格更粗、完整并覆盖 snapped fine；另读原 6 target 并核原 image bytes。每个请求独立新 Service/未用过的 cache，source fetch=0、numeric renderer=0。OS 文件页缓存未清，时延只属于该边界，不称上游/物理磁盘冷或手机可见结果。3 条原 z12 冷 metadata 在本轮独立得到 **43.622 / 44.266 / 26.013ms**，确认 direct→compose 的成本实际存在；不能拿 warm 值抵消。数据资格无已见正确性阻断，采用仍须 Root 对这项回归作判断并完成 sealed Map 选择/真实 HTTP 接入。

原 consumer/publisher 已核：`TerrainService.readCached` 精确发布命中和 `getPreviewPublication` 候选仅用 `inventory.assets`；`retainedAssets` 只在 `getAsset` 保旧 immutable URL。现有 `preparedProduct` 按本次 target/cell/window 重建 current，`previous` 保留其余旧 URL，且原 16 target 上限仍在。**现无自动从 retained 选择旧 direct metadata 的能力**；不能直接合并两表冒 current 或 retired parent。若要保持旧 direct，应由原数据/消费者 owner 明确处理 current 资格，不能由审查静默改动。

首个独审 harness 误将“有效地形”断言为 alpha=255，实际 style 是保底图的坡向透明阴影；它在 Service 请求前报 alpha=10。已保原脚本及 `attempt1-harness-failure.json`，核实 `terrainReliefRgba` 的原透明度规则后，仅修正独审 harness，产品及资格规则未改。上述 pass 来自随后完整实际读回。新批次未激活，原 23 bundle 继续可用；手机/native 显示、手势、资源寿命、D1 与完整 Goal 仍未完成。
