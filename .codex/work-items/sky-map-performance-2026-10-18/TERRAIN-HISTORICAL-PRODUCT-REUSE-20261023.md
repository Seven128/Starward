# r20 历史地形成品已零取源准备并接入本机任务 API

2026-10-23。沿[源读取已选分支](OVERLAY-TERRAIN-SOURCE-NEXT-DECISION-20261023.md)及[当前 publication 准入](TERRAIN-CURRENT-PUBLICATION-ADMISSION-20261023.md)继续；原 publisher 补上最小的只读 prepared-product lookup，已将原 final/四格和旧 current 成品完整复制到全新静态输出。没有重复 current MISSING 检查、重产 r6 或取源。只沿原 r20 manifest 明确的旧 cache 和已核 publication 读取，不扫描磁盘。

## 已有成品全部找到并准入

**原 final 和四个引用 cell 均完整可复用，缺的不是材料。** 原 r20 manifest 将 final 的 PNG/per-image proof 明确绑定到私有 `device-resume/r13-runtime/terrain-cache-visible`；本次只按 final proof 的四个 cell 文件名读取。前三格原件仍在该目录，第四格按已选 current inventory 读取。原 final 的私有保护副本和原 cache 字节一致；旧目录没有 `inventory.json`，不是旧 publication。

| 原 window proof 顺序 | 本次材料 owner | PNG SHA-256 |
| --- | --- | --- |
| `3344/1782` | 原历史 cache 的 PNG/per-image proof | `aabee0772d5eab9681570fa1fda6d4866392381dc6e281804b3993af07ee12be` |
| `3345/1782` | 原历史 cache 的 PNG/per-image proof | `a8d07ef8f089a77bbc45c341b8caacdbd64382501465a40186d86142186e94e7` |
| `3344/1783` | 原历史 cache 的 PNG/per-image proof | `f3d09f78c6f57c7b81ddbd03ebbc7d39a1ba82a231e0b0738f10ff1cf535a7c5` |
| `3345/1783` | 当前 immutable publication | `304d5257e7dcc1990259adb05fbc83e48f2e9622574db4079ba27090e134790f` |

每格经现有 `readTerrainFixedAsset`、`validateTerrainPublication` / `validateTerrainAsset`、请求 key / coverage 校验，publicationId 与原 final `fixedWindow.cells` 逐项相同，100% valid pixels，`sourceIssues=[]`、`unavailableSourceTiles=[]`。另用现有 pngjs 实际解码、核 PNG CRC，并将四格的 **262,144 像素 / 1,048,576 RGBA 通道**与原 final 对应位置比较，差异 **0**。这是本机成品完整性与拼接闭环，不是手机像素、配准或性能验收。

- 原 final SHA-256：`494729bb12cfd4209552f43fe44417abed79e475f00b286c1f47f8125745dd9f`，311,773 B。
- 原 final proof SHA-256：`42ac8c46118cbb60729a6aff1426266d25b65aba44cc5539b70522ea31c46fe9`，8,033 B；保留原 `derivedAt=2026-10-20T23:42:38.594Z`。
- 当前 publication：`terrain-fixed:c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722`；inventory 原字节 SHA-256 `f8903922eb14702d5de6325c903fac296bbc69d94019c9d7844ee03ac71ea774`。
- 合计只读检查 **18 个现存文件 / 1,004,521 B**。读取前后 size/mtime/ctime 变化 **0**；全局 fetch 显式拒绝，实际尝试 **0**。不把累计读取字节称成品包大小。

## 未把过期 cache 当作 fresh

三个历史 cell 的 metadata pointer mtime 分别为 `2026-10-20T23:42:38.5490603Z`、`2026-10-20T23:28:01.7296672Z`、`2026-10-20T23:42:38.5460704Z`，本次读取时约 47 小时，均超过原 24 小时 TTL；final pointer 同样过期。它们是完整的**历史成品**，不是 `CACHE_COMPLETE` 的当前元数据命中。

未 touch 原 pointer，未用新副本时间、伪造时钟或改 proof `derivedAt` 绕过 TTL。源时刻、source set、质量与许可证明继续沿原字节保存。新准备成品可以经验证建立新的 inventory，但这不能回写成“旧 runtime cache 仍 fresh”。

## 入口选择与已实现的边界

已读 [publisher](../../../data-pipelines/terrain/publish_fixed_terrain.mts)、其 [existing regression](../../../workers/miniapp-api/src/terrain-fixed-publisher.test.ts)及 [TerrainService](../../../workers/miniapp-api/src/terrain-service.ts) / [window renderer](../../../workers/miniapp-api/src/terrain-window-renderer.ts)。不重复已经验证的 previous 零 fetch 机制。

- 修改前 `publishFixedTerrain` 入参只有 `output/cache/previous/targets`，内部固定 `new TerrainService({ directory: input.cache })`；公共 CLI 同样只有 `--spec/--output/--cache/--previous`。`reusePrevious` 只接收已有 inventory 的 previous current entry，没有本批历史产品导入口。
- `TerrainService` 自身虽有 `renderer` 端口，`compute` 对 `fixedWindow` 直接调用 `renderTerrainWindow`，不会走 renderer。只透传 renderer 会重新组合并改变原 final `derivedAt`；复制旧 pointer 新建 fresh cache 又会改变 24 小时语义，两者均未采用。
- 现新增可编程 `preparedProduct(request): Promise<{ proof: Buffer; bytes: Buffer }>`。显式提供该 lookup 时，每个所需 fixed cell/final window 都必须返回完整原件；缺项拒绝，不回落取源。输入、previous 和正常 cache 输出共用 `admitProduct` / `copyProduct` 的 key/coverage、publication、来源及 PNG/hash 准入与不可变复制；显式历史产品额外要求完整像素、无 source issue/unavailable source。默认路径原有的缺源兼容语义保留。
- 组合窗另外核对其 `cells` 与本次已选 cell 的 publicationId/file 逐项相同，拒绝另一个 source revision 的旧窗。原 proof 直接复制，不改 `derivedAt` 或再生成影像。每项仅在复制时持有其输入 buffers，地图只保留 metadata/输出 entry，不把本批所有 PNG 另常驻缓存。
- 原来的默认准备、previous、旧 URL retained 和 inventory-last 路径继续存在；没有扩展 CLI、运行时 TerrainService、缓存 TTL、源并发、下载或分发框架。没有调用私有方法、猴补 prototype 或替换生产模块。

初次只读准入在缺口处停住，没有调用会走源的路径；Root 随后明确授权在原 publisher 内补齐该输入并实际准备。本批输出边界为 **验证后的新静态 publication**，不是旧 runtime cache 的 fresh 命中。

## 本批实际输出

- 新输出：`D:/dev/Starward-data/preparations/terrain-r20-reuse-20261023/publication`。整个准备 root 在执行前不存在，不覆盖任何旧目录。
- publicationVersion：`terrain-fixed:01e54e1b6b07c971bcd99dc337ab47ee507f5988208aa75730e8e5043ab2a8e1`。
- inventory 原字节 SHA-256：`55c4173a97b184c6a08cffe9149fec84bc2f97d9de5039ee834485ea289e9f96`。
- **5 targets / 17 current / 0 retained**。原四个 target 和全部 **13 current** 的 entry（key/file/proof hash）逐项原样保留；只加 r20 final 和缺的三格。仅声明 r20 会把原父图降为 retained，导致它不再具备 preview 资格，因此本批沿原 inventory 的声明保留其 current 地位。
- **35 文件 / 2,175,557 B**：17 PNG 共 2,071,091 B，17 proof 共 97,293 B，inventory 7,173 B。全部经 `readTerrainFixedInventory` / `readTerrainFixedAsset` 从新输出逐项读回；PNG 与原图 hash、proof 原字节 hash 全相同，原 final 保留。
- lookup 实际调用 **17**，全局 fetch 尝试 **0**；独立 `unused-cache` **未创建**。旧文件/原 pointer/原 proof 均未改，本次读取的 **42 个原件 / 2,521,991 B** 在读前后 size/mtime/ctime 变化 **0**。新 inventory 在所有输出资产之后提交，现有测试同时检查 lookup 阶段没有已提交 inventory。

新准备的 inventory `createdAt` 与原各成品 `derivedAt` 分开，导入没有重新声称取源、派生或 source freshness。完整来源、许可、质量和原 source version 仍由每个原 proof 约束。新 output 中的文件时间是实际复制时间，不能当旧缓存获新鲜度或本次重新取源的证据。

以上是原执行 agent 的准备终态；当时没有激活 publication 指针、重启服务、远端写入或手机操作。Root 后续独立审查与本机目录接线见下，不能倒改这段准备步骤为已经运行在手机的事实。不得另重放 r20 冷源或把当前成品暖读称冷性能对照。

## 实际执行与证据

一次性 [任务脚本](scripts/terrain-historical-product-reuse-20261023.mts)复用现有 `node tools/run-node.cjs --import tsx`；先只读准入，再以 `--prepare` 对全新输出执行一次，均退出 0。结构化 raw 只在原私有 owner `device-resume/r20-cross-coverage/west-pan-review`：

- `historical-product-reuse-20261023.private.json`：初次 18 文件只读准入，SHA-256 `36008f76cb77ee955b4bdab98755d716776937760e33b95a7c2948da2777d59f`，保留首次缺口事实。
- `historical-product-reuse-preparation-20261023.private.json`：本批 42 文件准入及输出读回，SHA-256 `d55056f623773f0512f658c2629e32915531cbc2bd3812647c287107a7e13a7c`，包含逐件原路径/hash/mtime和新输出 identity。

现有 publisher 回归增加同一非空 fixture 的 48 小时历史成品导入，验证 proof/PNG 原字节、源文件时间、无 cache 创建、fetch 0、inventory-last，以及错误 hash/请求身份/旧 cell 快照/缺项拒绝且不提交 inventory；该原有 test 通过。另相关 fixed-raster/viewport-renderer **12/12**，零 skip；API TypeScript 检查退出 0；定向 diff 空白检查通过。未为了成品复制重复手机或全仓测试。

| 本批 owner | SHA-256 |
| --- | --- |
| `data-pipelines/terrain/publish_fixed_terrain.mts` | `f59b09fe9a9eead5ec8194026237a19f819b5c314919106593d811d5c96d12f1` |
| `workers/miniapp-api/src/terrain-fixed-publisher.test.ts` | `9fd10c294f75479bd507ff39334e815d4289dc26b2ec64af44baae51e864d613` |
| task script | `2ced5a49793f8387ba61917485f427328f115921a71c2f36af82b5eda07d5f17` |

生产责任只改上述 publisher 与现有相关 test，外加本文/一个 task-local 脚本；没有修改 PLAN、HANDOFF、Context、账户、数据库、配置、原 publication 或原件。没有 HTTP、服务操作、IDE/手机、重产、远端上传；未新增依赖或测试框架。叠层连续手势、完整细节/配准、真实云/光害、native/GPU 资源回落、iOS 与无泄漏义务仍未验，不能用本机成品准备替代。

## Root 独立审查及本机运行接线

Root实际完整读取publisher及其现有回归，检查显式成品的key/coverage、完整来源/像素、proof/PNG/hash、同批cell快照、默认与previous/retained兼容、根目录重叠保护和inventory-last；未发现新增P1/P2。独立用原validators从新目录读回全部17项，逐entry核原13 current原样保留，r20 final SHA及4格publicationId/file闭环全部一致，PNG共2,071,091 B，禁止fetch/实际尝试0；未把agent总结当输出校验。复用既有13项/类型检查，不为同一未改输入再跑整仓。

只在既有私有owner创建新配置副本，和原配置语义差异严格只有`MINIAPP_TERRAIN_PUBLICATION_ROOT`指向本批新目录。原配置SHA `561fa6c8839343d2ac69fdd13dad0c8e9e398e4de3be861e4cef0f8d977427a5`未变；新副本SHA `8f52f38a8185dffce11114c4d547590e72e3b3c4191abe6f0dac843ebd48f8f1`。沿现有隐藏launcher仅更换该副本/hash和新私有日志owner，PowerShell解析及CheckOnly通过；未改PG/桥、8791、VPN、只读/媒体/账号/提醒配置或任何原件。

重核旧8799监听、精确Node可执行器、PID54572/创建时间及入口后，Root只停止该PID一次。新PID66640于本机新run `start-20261022T231928120Z`启动，随后实际`/health/ready`200/ready=true；bridge8798仍PID44604、health200/upstream200、anonymousOnly=true/accountRoutesAvailable=false/reminderWorker=false，PG55441仍PID25424，8791未见监听。入口SHA仍`fe3d23fbc9f1d408ac046293880305624306df677506460a7e20f4b64f1610dd`，默认terrain cache保留，未为telemetry另重启。**volatile Context与进程内缓存已重置；新旧不作同条件性能对照。**

Root使用现有客户端query owner先在内存核原r20空间key，再经8798正常公开metadata/asset路由各读一次：metadata200、data.state=AVAILABLE、asset200/image/png、311,773 B及SHA `494729bb12cfd4209552f43fe44417abed79e475f00b286c1f47f8125745dd9f`一致；publication header匹配且带immutable，原`derivedAt=2026-10-20T23:42:38.594Z`保留。此为当前本机运行输入与真实公开字节接线证据，未测手机覆盖或声称冷性能改善。

独立读回、配置差异、旧进程身份/入口保全、唯一launcher、新run日志及实际HTTP结果归既有私有`r19-ui-20261022/terrain-r20-activation-20261023`。新运行配置继续是任务本机准备，没有改数据锁/远端/部署指针；当前完整Goal仍须实际连续叠层/资源结果及后续正式数据交付。
