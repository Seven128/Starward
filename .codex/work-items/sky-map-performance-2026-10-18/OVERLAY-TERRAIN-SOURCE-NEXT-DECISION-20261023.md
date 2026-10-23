# 地形源读取：复用 r20 后的下一决策

2026-10-23。限定只读调查；只新增本文。未操作手机、IDE、HTTP、服务、数据库、账号、构建、发布或生产源码，未改 PLAN / HANDOFF / Context，未重产 r6。本报告不关闭叠层性能、连续手势或资源回落验收。

## 已有证据已经选择源读取分支

**不再重测“1.7 秒究竟在不在源读”。** [r20 实际手机报告](R20-CROSS-COVERAGE-PHONE-RESULT.md#L40)已把细图 SHA、实际范围、对应两格派生和 HTTP 关联起来；本次进一步实际读回该报告引用的六条有限原摘录。摘录仍在原私有 `device-resume/r20-cross-coverage/west-pan-review/west-pan-terrain-events.excerpt.json`，3038 B，SHA-256 `863e6438fe841c054ae73d9571cc7651e5adfd2b71433c8e69d151c2ed2ae25a`。未重读/转存整份活动服务档。

| 同次有效细格派生 | 第一格 | 第二格 |
| --- | ---: | ---: |
| 所需源数 | 4 | 4 |
| 新读取 / 完成命中 / 共享在途 | 2 / 1 / 1 | 2 / 2 / 0 |
| 该格拥有的新读取字节 | 100400 | 89022 |
| sourceReadWallMs | 1572.19 | 1736.63 |
| sourceIoSumMs | 3094.81 | 3320.81 |
| sourceDecodeSumMs | 8.67 | 6.70 |
| projection / sample / shade / encode ms | 66.32 / 26.40 / 58.05 / 7.29 | 83.70 / 24.62 / 60.51 / 7.18 |
| totalMs | 1730.52 | 1912.71 |

两格实际取了四个新源，同时确有完成命中和在途共享；不是“所有源都重取”或“共享缓存没有工作”。decode 只有毫秒级累计，不能再把这一段主要归给 PNG 解码或阴影 CPU。两格总时长、并行 I/O 累计和窗口 HTTP 不能相加；这些是服务端 wall elapsed，不是 CPU、手机输入延迟或物理呈现时刻。原样本父图比细图约早 1.91 秒可见的收益继续复用，不重做父图资格试验。[r20:34、54–59](R20-CROSS-COVERAGE-PHONE-RESULT.md#L34)

## 当前真正的 owner、调用关系与预算

- 正常调用是 `MiniappService.getTerrainOverlay → TerrainService.getPublication → resolve/readCached → renderTerrainWindow → resolve(cell) → createTerrainViewportRenderer`。MAP 矩形不进入 Spot 年度夜光半径读取；窗口与源的完成缓存、在途共享和逐消费者取消由现有 owner 持有。[miniapp-service.ts:1032](../../../workers/miniapp-api/src/miniapp-service.ts#L1032)、[terrain-service.ts:67、143–170](../../../workers/miniapp-api/src/terrain-service.ts#L143)
- 最多两项窗口组合和两项活动源派生；已准入窗口的子读才可等待源名额，每项运行期限 16 秒。窗口两个读者随完成推进，按地理顺序合成，不能再将旧研究的“逐格完全串行”当当前缺陷。[terrain-service.ts:172–199](../../../workers/miniapp-api/src/terrain-service.ts#L172)、[terrain-window-renderer.ts:22–49](../../../workers/miniapp-api/src/terrain-window-renderer.ts#L22)
- 源 PNG 同格并行取得；每 PNG 上限 2 MiB，每格合计 24 MiB、最多 12 源，完成源 LRU 64 个、24 小时（高程数组约 16 MiB）。缓存命中不重新 fetch/decode；在途 source read 只由首次 owner 记 reads/bytes/I/O，加入者记 joins。因此不能用某格较小的字节或 decode 累计当作它完全没有等共享源。[terrain-viewport-renderer.ts:10–41、44–95、131–146](../../../workers/miniapp-api/src/terrain-viewport-renderer.ts#L28)
- `sourceReadWallMs` 包住 `Promise.allSettled(readTile...)`；I/O 从调用 transport 前到完整 body 收齐/拼接后，decode 从 PNG 准入到数值数组/证明构造。I/O 包含传输、等待与事件循环恢复，未细分 DNS/TLS/headers/body。它不包含之前的源名额等待，也不包含后面的窗口合成、序列化磁盘写入/prune、HTTP 与 native 安装。[terrain-viewport-renderer.ts:44–87、144–146](../../../workers/miniapp-api/src/terrain-viewport-renderer.ts#L44)
- final 优先级是精确 current published inventory → 24 小时临时成品 → 源派生；完成内存缓存 16 项，磁盘成品缓存上限 128 MiB，缓存写入在返回前串行完成。临时父图只读当前已发布合格资产，不派生、不占源名额。[terrain-service.ts:40、79–115、151–170、202–251](../../../workers/miniapp-api/src/terrain-service.ts#L202)

## 还没回答什么，以及哪些问题暂不值得另开采集

尚未回答的是：**当前运行配置实际选择的 final publication / 可再生成缓存，是否已经拥有 r20 实际窗口及其完整 cells；下一必要连续操作范围中，哪部分仍会把合法源读取放进交互关键路径。** 历史准备清单与当前运行配置不能混同。旧 [有限热点报告:7–11](TERRAIN-HOTSPOT-PRODUCTS.md#L7)指向 `E:/Dev/...`；本次宿主 `Get-PSDrive -PSProvider FileSystem` 无 E 盘，精确 `inventory.json` 路径 `Test-Path -LiteralPath -PathType Leaf` 为 false。首次 `Get-Content -Raw` 因不存在的驱动/动态参数失败后已停止该读，并显式核实不存在；没有把失败结果当空 inventory 或“已发布 13 项”。这不证明当前 8799 的实际 selected publication 丢失，也不要求挂载旧盘或重产 r6。

DNS/TLS/TTFB/body 内部分解、单项 cache-write/prune 耗时、某次源 slot 等待仍未知；但 **r20 已有证据足以沿已采用的有限成品发布分支前进**，它们目前不改变这个选择。不为完整仪表而重启服务、增加源并发/缓存容量或另造源镜像/预取器。若后续精确 final 命中仍慢，才沿同次实请求补对应剩余边界。该决策已在 [metadata owner:49–53](TERRAIN-METADATA-WAIT-OWNER.md#L49)和 [残余等待决策:38–41](TERRAIN-RESIDUAL-NEXT-DECISION.md#L38)提出；本次是用 r20 原字段落到该分支，不是新方案。

`getRegion` 在拖动中能返回变化范围、同 buffered window 没有效预取收益、窗口内缺少合格 onUpdated 均已有 r14/r16 结果，直接复用。[RECEIVER-PERFORMANCE:17–23、37–45](RECEIVER-PERFORMANCE-20261020.md#L17) 不再资格化这条路，也不把受控退出/父图已修责任重新列作源读取缺陷。

## 唯一建议下一步：当前成品及缓存对实际需求的一次批量准入

由 root 使用**已明确持有的当前 8799 配置路径**定位 `terrainPublicationRoot` 与 `STARWARD_R17_TERRAIN_CACHE`；只取这两个公开数据目录及身份，不打印 env、数据库 URL、令牌或整个进程配置。读配置不证明进程已加载它；沿 root 已有启动/身份记录绑定，缺这一步则只标“声明配置”，不恢复 8791 或访问 operations。

使用现有 `readTerrainFixedInventory` / `readTerrainFixedAsset`、`terrainWindowRequest` / `terrainFixedRequest` / `terrainRequestKey`，对 **r20 已知 z12 窗口 `3344,1782,2×2`、其中四格，以及 root 下一必要连续操作已经选定的有限范围** 做一次集中只读准入。原 r20 `new-fine` SHA 为 `494729bb12cfd4209552f43fe44417abed79e475f00b286c1f47f8125745dd9f`，两新格派生 SHA 为 `f3d09f78c6f57c7b81ddbd03ebbc7d39a1ba82a231e0b0738f10ff1cf535a7c5`、`aabee0772d5eab9681570fa1fda6d4866392381dc6e281804b3993af07ee12be`。以原 window proof 的 cells 匹配，不把 cell SHA 要求等于 final SHA，也不把原图片只有 PNG 当作出版证明。

只报告 `PUBLISHED_EXACT` / `CACHE_COMPLETE` / `MISSING` / `INVALID`、所需格数/有效格数、final SHA、必要文件总字节与选定 publication hash。临时缓存读取必须执行现有 publication/PNG 完整性和覆盖准入，保留 24 小时 mtime 与 source issue 语义，不 touch 文件、不改 pointer、不实例化可能取源的 `getPublication` 来“只读检查”，不清缓存/创建空目录制造冷值。现有准入入口在 [terrain-fixed-publication.ts:38–66](../../../workers/miniapp-api/src/terrain-fixed-publication.ts#L38)，动态缓存责任在 [terrain-service.ts:202–219](../../../workers/miniapp-api/src/terrain-service.ts#L202)。

| 结果 / 竞争解释 | 会改变的下一动作 |
| --- | --- |
| 当前 publication 精确窗已完整命中 | 不再准备相同成品。下一必要连续手机动作直接用现成 marker/桥身份/有界服务事件判断 final 命中后还有没有实质等待；没有问题便推进连续正确性与资源，不另录同窗暖性能。 |
| 未发布精确窗，但对应 final/cells 在现有缓存完整可用 | 进入原 publisher 的一次合批成品接入。复用 existing verified cache/previous、全局 fetch 拒绝、新且不重叠 output、inventory-last；不重产 r6。该“已有成品零取源携带”机制已验证，不重复证明相同机制，只验证本次数据与最终接入结果。 |
| 确有缺格或只有无证明 PNG | 仅这项真实数据缺口进入有限 publisher 的声明与正常有界取源准备，不先改客户端调度/blocks/worker；不存在的历史目录不授权从别处猜匹配或放宽校验。新源准备是准备工作，不称冷性能对照。 |
| SHA/证明/覆盖冲突，或当前路径/启动绑定不能确定 | 在此边界停止该分支，保原件和当前服务；明确唯一缺失路径/绑定/资产，不尝试覆盖修复、恢复原账号服务或继续发暖请求。 |

最小条件只有 root 已知的当前公开数据路径/运行绑定、原 r20 身份和正常读取权限；无需新手机候选、调试连接、service principal、远端、HTTP 或 UAC。已选范围批量准入后即停止，不扫描全部磁盘、不按方向/地区矩阵扩展、不为统计 p95 重复样本。若已有当前版本同需求的准入报告，直接复用，跳到相应实现/接入分支。

发布接入沿 [publish_fixed_terrain.mts:53–105](../../../data-pipelines/terrain/publish_fixed_terrain.mts#L53)与 [有限热点既有验证:53–68](TERRAIN-HOTSPOT-PRODUCTS.md#L53)。随后只在下一本就必要的当前服务更新里绑定新 final inventory，不为 telemetry 单独重启；真实可见收益必须仍在同条件的普通入口验证，不能把零 fetch 的本地成品读取或已暖回访称为 r20 冷源加速。三叠层真实数据/连续交互、完整细节、配准、外部发布、资源回落、iOS 与无泄漏义务继续保留。

## 本次检查边界

本次实际查看当前源码、默认/相关 Context、development Skill/performance method、所列原研究和私有六条摘录，另对历史 E 路径做存在性检查。未产生新的服务/手机计时，未打开私有账号资料，未运行生产/发布命令。低风险报告编辑只需定向 diff 空白检查；不为本文重复产品测试。
