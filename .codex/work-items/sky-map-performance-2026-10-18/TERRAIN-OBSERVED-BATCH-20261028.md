# D1 有限观测集批次证据

本文件只记录 D1 原生产/出版责任内的有限数据批次，不修改唯一 PLAN，不代表 D1 或完整 Goal 已完成。Root 于 2026-10-28 在完整 preflight 后授权一次加工；当前 23 产品运行 bundle、API、配置和旧发布保持原状，产物不自动激活。

## 已完成 preflight

- 外部 owned 根：`E:/Dev/Starward-data/development/terrain-d1-20261028/observed-batch`。建前确认不存在，无前次在途操作。
- `preflight.mts` 实际运行通过；source GET=0、renderer invocation=0。原 23 PNG/proof 逐个校验 SHA、尺寸、PNG CRC、完整像素及无 source issue。
- 完整证据：同目录 `preflight.private.json`，SHA-256 `557f9c8f33ea3d68275a14063e56bf271526416c1887105ee897629679aae995`。
- 完整原 publisher 声明：同目录 `targets.json`，SHA-256 `708b297fde9a63a4d2029d6c2ae1462ed5fb71157f045af522a801c91db51e06`。保留原 `targets <= 16`，未改 publisher/renderer/cache/concurrency/budget。
- 原 17 个 z6–z9 服务观测窗确为 17 个唯一请求，无 1×1 请求；它们引用 55 unique cells。历史 79 产品为 55 referenced cells +17 observed windows +7 r6 产品。现有实际 PNG 匹配 16 个，其中仅 7 份原 proof hash 一致；其余 63 个 PNG 缺失，不能将资格声明当字节。
- 当前 23 为 17 cells +6 windows；PNG 共 2,461,422 B，proof 共 161,473 B。当前唯一 terrain inventory version 为 `terrain-fixed:43c0899311dc3558cc6ba0bf8fdcea98d0d939edd774d7f2e25e9fd45921cfb8`，SHA-256 `67145c0d678264efa34b1859b521f507aa0bcb3196515727f2000df09c0e54d6`。

## 一次有限声明与支持意义

16 个声明的几何 `(zoom,x,y,columns,rows)` 为：

```
11,1672,890,2,3   12,3345,1783,3,1   9,397,216,2,3
8,198,107,2,3     8,200,107,3,3      8,203,107,2,3
7,99,53,3,2       7,101,53,3,3       7,104,53,2,3     7,104,54,2,3
6,51,26,2,3       6,52,25,2,3        6,53,24,1,3      6,50,26,2,2
5,25,13,2,2       5,26,12,1,2
```

原固定 grid owner 的 canonical witness 已逐一反算选回对应窗口。声明覆盖恰好等于原 55 cells、当前 17 cells 和全部必需完整严格父图 cells 的并集，未加该并集外新 cell。最终 75 unique cells，复用当前 17，需补 58（47 个观测缺块及 11 个父图专用新块）。16 个 window 产品中 2 个直接复用、14 个需生产；预计 current 91、retained 4，共 95 对 PNG/proof + inventory，191 个文件。

17 个原观测窗中的 8 个 current exact 为 `7-104-54-2-3`、`6-51-26-2-3`、`6-52-25-2-3`、`6-53-24-1-3`、`7-104-53-2-3`、`8-203-107-2-3`、`8-198-107-2-3`、`9-397-216-2-3`。其余 9 个走原 window compositor，由全部 current published cells 逐字节拼接，不读地形源；不能声称预制 exact。每条严格父图候选几何成立；完整 proof、PNG 和 source-free 实际读回仍须产后成立。

为满足原 16 targets，当前 4 个 window 转 retained，原 PNG/proof/URL 必须字节不变：

- z12 `3345-1783-2-1`、`3346-1783-2-1`、`3346-1783-1-1`。
- z6 `52-27-1-2`。

原 z11 `1672-890-2-3` 和首个 z7 `104-54-2-3` 仍是 current exact。上述 3 条 z12 API 路径转 current-cell compositor，冷 metadata 需要拼接/编码/缓存提交，是采用前的实质待判，必须与原 HTTP 4.5ms 级直接命中证据比较。z12 的 1×1 window 仅 RGBA 与其 fixed cell 相同，两者请求身份不同。首个 z7 的原最小父图保 retained，当前将选完整 z6 `51-26-2-3` 父图；须如实核实际文件、图幅与成本。所有现有 23 对字节及旧 r6 URL 都保留，不以降精度、降覆盖或改内容通过检查。

## 加工界限与采用前义务

一次生产沿原 TerrainService/producer/renderer/publisher，按 unique cell 顺序加工，不做原始 PNG 持久缓存。每 cell 原 12-source/24MiB、每源 PNG 2MiB、源 decoded LRU 64 tiles/16MiB、两个运行责任槽、16s operation deadline、128MiB regenerable cache 等均不改。保守源 GET 上界为 `58×12=696`，传输上界 `58×24=1,392MiB`，实际通常由原共享 LRU 降低，须记真实数。

结果图像共 11,141,120 pixels，逻辑 RGBA 44,564,480 B；proof 原 1MiB/份硬限额合计 95MiB。压缩 PNG 大小不能冒充逻辑 RGBA 硬上界。为成品预留 256MiB、整个 owned 加工/组合缓存及证据预留 1GiB，并实记磁盘账；这不是增加 production/cache 预算。58 cells +14 new windows +9 observed cold compositions +4 previous cold compositions 共 85 次，各保 16s，合计 1,360s；一次 whole-batch 停界限 25min。启动先持久化输入 hash、实际 PID、截止与 owned paths；超时/缺测/来源冲突保异常及已资格成品，不填零、不无限重试。publisher inventory-last，无完整 batch 不视为可采用。

产后向 Root 交单一完整 terrain source、准确 version/hash、全像素逐格匹配、17 exact-or-current-cell 和完整父图读回、旧 23 逐字节不变，以及 3 条原 z12 的 cold metadata/文件/组合成本与 source=0。由 Root 做必要独审和实际 HTTP/集成采用判断；现有 23 产品 bundle 始终可继续用。本记录不宣称手机、UI/手势、持续 Play、内存/OOM、分发或部署验收。

## 实际单批次结果：未激活

`produce.mts --produce-approved-finite-batch` 实际退出 0。Node PID 41616 已退出；UTC `2026-10-27T23:41:52.853Z` 开始，`23:42:33.167Z` 完成，耗时 40,314ms，早于 25min 停界限。启动前已用 immutable `operation.private.json` 保存 PID、输入/code hashes、owned paths 和截止；此起始记录的 `STARTED` 不是当前在途状态，终态以 `batch-result.private.json` 为准，勿重复提交。事件在 `operation-events.ndjson`，无无限重试。

- 单一 terrain source：`E:/Dev/Starward-data/development/terrain-d1-20261028/observed-batch/publication`。
- Version：`terrain-fixed:0fd00a12df6907e1fdc2c589b809e3b7a52a5476ad2a5579ce5e701f9330db02`。
- Inventory SHA-256：`bf06061a221ab8d09f78656e1ea2bbdba578945fdaed0f855fdfc5e0a20f9992`。
- 终态 `COMPLETE_OFFLINE_NOT_ACTIVATED`；完整读回 `batch-result.private.json` 的 SHA-256 为 `2179d2a857d2c9b773c7e04093cd7da4f679a4c9f25e5bc1989081e8e6d1afd8`。operation SHA-256 为 `8d5467681d306b92c92b748e59ae7f9da66ea2271e8a5697c65799e0a5c72073`。
- 58 cells +14 windows 共 72 个新完整产品，0 例外；current 91、retained 4，共 191 文件、12,976,990 B。原 23 对 PNG/proof 及前一 inventory 均逐字节不变；旧 URL 通过服务实际 getAsset 字节核对。
- 源真实 GET 153 次，全 200，58 次成功 fixed-cell renderer 的实测传输合计 13,947,526 B，单 cell 实际 1–9 次读，原共享 LRU 生效。composition/assembly/readback 源调用均 0，readback numeric renderer 调用 0；无原始源 PNG 持久化。
- 16 current window、17 observed window 和 6 旧 target window 的实际 PNG 按每个 current fixed cell 逐通道核验，累计 13,041,664 pixels；完整 proof/PNG CRC、来源与 child 身份校验通过。17 观测窗全部有真实完整严格更粗父图，未用 retained 产品冒 current parent。
- 8 observed exact 的 cold service metadata 为 2.285–11.736ms；9 current-cell compositor 为 47.237–111.745ms。每条各建新 TerrainService 和未使用的独立 cache 目录，cold 含 proof/PNG 读取；合成路径另含逐字节 copy、PNG encode、image/proof/cache pointer 提交。紧接的 warm 值独立记录。
- 历史 79 个声明的 image filename（绑定 sourceSet/image SHA）现在全部在实际出版或实际服务合成读回中对应：70 个 current exact，9 个 compositor；仍不能称 79 个全部 current pre-made exact，或称新 proof 恢复了历史原 proof 字节。

原 fine/公开路径的实际 cold service 结果如下。此为离线服务边界实测，未冒 HTTP/手机测量；原 HTTP 4.5ms 级 direct 只作量级对照，Root 负责采用前真实 HTTP 判断。

| 原窗口 | 新 metadata 路径 | cold ms | 图片及旧 URL |
| --- | --- | ---: | --- |
| z11 1672-890-2-3 | current exact | 3.683 | 原文件名及字节完全相同 |
| z12 3345-1783-2-1 | current cells 合成 | 36.983 | 原文件名及字节完全相同 |
| z12 3346-1783-2-1 | current cells 合成 | 38.817 | 原文件名及字节完全相同 |
| z12 3346-1783-1-1 | current cells 合成 | 18.885 | 原文件名及字节完全相同 |
| z7 104-54-2-3 | current exact | 1.878 | 原文件名及字节完全相同 |
| z6 52-27-1-2 | current cells 合成 | 35.477 | 原文件名及字节完全相同 |

3 条 z12 的 warm metadata 仅 0.071–0.104ms，不能用它掩盖 cold 增加。图片精度、覆盖、内容都保留，但从 direct 转 compose 的冷成本是**采用待判**，数据加工成功不自动消除此项。首个 z7 的当前父图已实际读回完整 z6 51-26-2-3；原更小父图保 retained。

实际磁盘：原预算 regenerable source-derived cache 10,913,647 B/216 文件；独立已资格成品 10,317,523 B/144 文件；最终 source 12,976,990 B/191 文件；readback composition caches 合计 4,398,533 B/39 文件。所有 production/code bindings 在结束前复核未变；没有运行配置、API、worker、DevTools、手机、上传或发布操作。独立审查与真实 HTTP/集成采用由 Root 后续负责，当前可继续使用原 23 bundle。

## Root 本机接入及实际HTTP

fresh 独审实际95对PNG/proof、旧23、17窗/父图与source-free路径通过；独立复测三条旧z12 cold43.62/44.27/26.01ms，保真实代价。Root接受这项有限数据接线取舍：原17已观察窗均有成品/现有current-cell供给，三条fine一次cold增加而图幅、精度、PNG字节不变；不因此改retained语义、放大16target或另建缓存。D1手机等待/可见/内存仍未验。

Root沿原 `prepareMapStaticBundle` 组装新sealed包：`observed-batch/map-static-publication/publication`，hash `e2e790107152d987f19f610120b856617c5b1e4ee1960dce15f7b4293b796f40`，606 records/13,204,365 B，只有一个terrain source，旧534条record（含511夜光）route/hash/header逐项相同。新Root私有配置副本只改Map root/hash两个字段，原配置与23 bundle均保留；沿原published启动，不恢复DB、不迁移、不启动worker。

实际API launcher41848/listener40936父子归属已核，ready=true。`observed-batch/http-readback.json`：两个不同机制的已观察窗（exact/current-cell compose）与三条旧z12共5例，实际HTTP细图和完整严格父图10项均AVAILABLE，PNG SHA/字节/header分别与资格结果一致；旧r6 URL 77,613 B逐字节相同。三条旧z12 HTTP metadata48.52/54.22/29.99ms，记录为新process/既有可再生磁盘cache条件，**不是**严格cold、手机或OS冷盘结果。首次harness漏掉路径中`map-feedback-20261027`而在任何HTTP前ENOENT，修正到真实原件后才运行通过；未重产。

本机当前选用新606包；旧23与旧config是恢复入口。工具/手机正确可见、连续手势/My返回、持续播放/资源回落、正式分发和部署义务不因此完成。

## 2026-10-29 当前普通手机的暖态覆盖与图层开关

当前74d2cfc/TW3E6Z/aui3b3在原606包和热点API下，一次3000ms guarded ADB拖动已明确返回actionSent；独立手机前后图及主用Performance原件归私有phone-compass-scope-fix-20261029/map-gesture。long-drag-performance.json为15,565,642B/SHA7a97a40bb6d06bea232e39d0ddab4708e9827adb607b41fda971931ac2642cab，5755事件、103截帧；无同时Memory或screenrecord。Root实际查看拖动前、位移中、视野更新及列表恢复帧：terrain/r6色层和marker均在，地点面板退出后列表恢复，最终高分辨率ADB图一致。中间截帧最大相关缺口1.240s，不能声明每帧覆盖、物理FPS或精确输入时延。

Root读回fresh分析：297块采样有一块内部delta为-3µs，整块213.975ms排除精细归因；其余2012.301ms、GC369.372ms。3711条API中3201条来自1067次Storage读取及success/complete，hidden runtime的getFullStorage与既有调试Storage同步证据相同，不当业务请求风暴。12个真实request含夜光metadata两次、Map scene两次及Context/地点/事件，没有terrain metadata/asset或夜光asset记录；当前图层可能复用仍合格覆盖，未取得具体image/coverage/LOD身份，不把这次暖态观察升级为新父图/fine命中或native安装/释放。保持现有owner，无新增缓存/并发改造依据，代理已停止。

同候选实际图层开关已读手机像素：初始terrain+light开、cloud关；关light后夜光颜色消失而地形阴影和marker仍在；再关terrain后三项均未选中、两种叠层消失、原生底图/道路/marker保持；重新开启terrain和light后两种可见效果恢复。各阶段原图与控制事实归layer-switch-observation.json。仅证明本视野暖态独立关闭/全关及恢复，不代三层可用合成、冷加载、迟到安装隔离或native/GPU物理释放。
