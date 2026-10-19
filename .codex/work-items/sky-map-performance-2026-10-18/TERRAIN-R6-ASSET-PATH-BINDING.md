# r6 地形资产路径：找到唯一缓存候选，手机响应身份仍未闭合

2026-10-19，只读文件分析，沿原 PLAN 的地形残余等待问题及 `starward-miniapp-development` 性能调查方法。读取仓库 HEAD `c6bb28bc55b8b3e2ed2e32090f05512e233c4253`，不以它代替服务运行版本证明。本轮没有操作手机、ADB、IDE、HTTP、服务或账号，没有重新派生资产、修改源码/方案、提交或留下后台进程。结果为 **`UNIQUE_CACHE_CANDIDATE__PHONE_RESPONSE_ASSOCIATION_UNKNOWN`**。已验证该候选自己的数据路径；没有把“唯一相同长度 + 相邻时间”升级成实际手机响应的唯一身份。

## 这次读取范围

完整读取既有 `TERRAIN-R6-WAIT-RESULT.md/.json`、`TERRAIN-METADATA-WAIT-OWNER.md`，核对 PLAN 的 overlay 责任、R13/H2/H4 和保留义务。实际解析原 task-key 回执及桥记录，SHA 仍分别为 `653ab774ff9303ba3faee07796f6b577b6924b03c28351baa5f70fb133e2d242`、`7e3fcc39bd9c927af6c7b98d57f79ccccbb3900cb3047894e0af8ce487b7b825`。手机 metadata 1735→3983 ms、file acquire 3998→ready 4096 ms、native ack 4130 ms 的原限界不变；不与录像 PTS 跨时钟相减。

当前 launcher `tmp/r17-normal-profile-api.mts` 没有注入自定义 TerrainService directory，`MiniappService` 仅注入 publishedDirectory。由 `TerrainService` 的 `sha256(process.cwd()).slice(0,12)` 默认规则，在当前仓库 CWD 得到：

`C:/Users/777/AppData/Local/Temp/starward-terrain-2c7c2a814c8c-glo30-cn-v1`

本次仅查看这个目录的 **24 文件 / 1,011,435 B**（8 PNG、16 proof）及已选的 `terrain-hotspots-20261018` 13 项 inventory，没有枚举其他临时缓存。目录与 launcher/配置相容，但本代理没有读回正在运行的 8799 进程 CWD/环境；这项运行绑定限界仍保留。私有经纬度、原始窗口键、文件名和 payload 只留在已有外部文件中。

24 文件内容的去标识 manifest SHA 为 `aea7d4216ca252a1fb6e2a01dad88a82507d56e0838000f31347e862d3ed5bf4`。算法：按原始文件名排序，每项只取文件名 SHA、kind、bytes、内容 SHA，紧凑 JSON 再取 SHA。缓存仍为可裁剪的外部临时 owner，本轮没有复制/冻结它；后续清理或必要服务变化前可由 root 一次性归档这 24 个小文件，无需碰大源/r6。

## 已证的候选产品与缺项

目录中只有一个不同产品的 `image.byteSize=314570`；request proof 与 per-image proof 逐字节相同，不能算两个候选。

| 字段 | 读取结果 |
| --- | --- |
| image SHA | `4ba6d68aa59958c2017957929a6fcc72715896a702026b4f055bcd7046478340` |
| proof SHA / 字节 | `89fafe5c5c2cc00120bfd38127e65daa56170308b18cd0b32ef7669f08cfd9b9` / 10163 B |
| requestKey SHA | `ca6355e6ca781cf0206eaf245d6bbfcfb1249a729723c51b2c580c0d32cd1f68` |
| 产品 | publication v4，z12，2×2 cells，512×512 PNG，314570 B |
| derivedAt | `2026-10-19T07:03:47.633Z` |
| sourceSet SHA | `3485dd5abe00e2d6b5125b0fe1ca9eecd9869600588cdc2e526933b99fd5f83b` |
| coverage/source | validPixelPercent 100；15 个源对象；sourceIssues 为空 |

用现有 `validateTerrainPublication`、`validateTerrainAsset`、`terrainSourceSetHash` 只读验证产品与四格；图像长度/hash、各格 publicationId/网格、源集合 union/hash 全部一致。用现有 `terrainWindowRequest → normalizeTerrainRequest → terrainRequestKey` 以及 `terrainWindowViewport` 从 proof 自己的 bounds 还原，均得到相同键；这**不是**从缺失的真实 HTTP request 还原。

当前 inventory SHA `f8903922eb14702d5de6325c903fac296bbc69d94019c9d7844ee03ac71ea774`，13 个 active、0 retained。候选的精确窗键未发布，其四格为：

| 组合顺序 | 图像 SHA | 现存来源 | derivedAt |
| --- | --- | --- | --- |
| 0 | `304d5257e7dcc1990259adb05fbc83e48f2e9622574db4079ba27090e134790f` | 当前 published inventory | 2026-10-18T10:56:04.706Z |
| 1 | `1e09bd5d96b77cd180ac72b92de7ff640ce6bfa051ecee78eae8f6944991a7cf` | 当前 published inventory | 2026-10-18T10:56:05.753Z |
| 2 | `850ce27d2f8cc7d08dcfecf0508b3aba98b5ddb05dbe60e47a5fe12c252da17d` | 未发布，较早 derived cache | 2026-10-19T00:06:03.950Z |
| 3 | `e9d4ca4e209d7bc0685256b4f97c536577a0e650a91c82362cc70af889815784` | 未发布，derived cache | **2026-10-19T07:03:47.589Z** |

所以，对这个候选而言，不是“只缺 final window、全部 cells 已发布”：有两格未列入发布 inventory，其中一格的派生时间落在本轮请求窗口内。较早的 156363 B / 1×2 窗口（SHA `7e66b5677221f647f042e064bd696300c959801419430da4f523329bc29320d8`）与候选共享左列两格、相同 zoom/Y，候选增加右列。这与原片保留旧左侧、右侧后补的现象相容，仍只是支持关联的证据。

新格包含 9 个 source proof，其中 6 个身份与原旧窗中的源字节相同、另 3 个不在旧窗 proof；没有同 tileId 不同 hash。**这不证明实际只下载了 3 个源。** 读 published/derived cell 的 PNG 不会填充 viewport renderer 的 decoded-source completed Map；source proof 的重合不等于本次进程的 sourceCacheHit。也不能仅凭 derivedAt 推导 cell 的耗时或将 2195 ms 全归给源 I/O。

## 关联强度与仍未知部分

桥中本动作仅见 metadata 200 / 2195 ms / 314570 B，host finish `07:03:47.641Z`，随后 asset 200 / 37 ms / 314570 B。候选 derivedAt `47.633Z`、新格 `47.589Z` 和匹配的旧左列构成很强的有限关联；候选是当前检查范围内唯一匹配产品。但桥 ring 只记录类别、长度和计时，task receipt 只保存匿名 asset 5/request 4，均没有 image SHA、publicationId 或矩形。精确手机 response→候选的关联仍 **UNKNOWN**，不能从相同 length、mtime 或相邻 wall time 把它补成已证。

本次在已有两个任务外部 evidence/development 根中按 `*network*`、`*Network*`、`*telemetry*`、`*operations*` 有限查找，没有找到已存同请求的精确 Network/telemetry 回执；这不是“该请求不存在”或全盘搜索结论。没有恢复已关闭 r6 项目，也没有为导出重发动作。

已能排除“该候选精确 final window 在当前 inventory 中已发布”。尚不能证明这次真实请求用了该候选、运行进程精确缓存条件、源读次数/hit/join、等待名额、projection/sourceRead/sample/shade/encode/cache write 的各自占比，以及 file-ready 与物理首覆盖的时序。未选择 blocks、prefetch、worker、扩大 cache 或新 producer，也未关闭原生连续操作、完整细节、年度光害、动态云、iOS、资源回落及其他 Goal 义务。

## 能改变下一动作的最小观察

先归档这个有限缓存，防止尚有价值的 proof 被正常 prune。若原目标的既有官方 Network 缓存仍可读，只取本次匹配请求的实际 response `imageSha256/publicationId` 与 request bounds；**SHA 等于 `4ba6d68a…` 才将候选闭合到实际请求**，并用真实 request 经原 normalize/window/key owner 验证；不同则保留此候选分析但不据此实施。r6 项目已关闭时，不为这个 readback 重开旧项目或重发一次原动作。

若旧记录已不可取，在下次本就必要的代表动作中，让现有匿名边界只补最终 image SHA / 归一键 hash 即可，不增加经纬度或全 payload，再关联其 proof。身份闭合后，复用现有 `terrain_raster_derived`（新格 image SHA `e9d4ca4e…`）、`terrain_metadata_read`（组合窗 SHA `4ba6d68a…`）、`terrain_asset_read`，先区分缺格源读取/CPU与组合/写入；不把 cell 事件误要求成 window SHA。当前 MemoryTelemetry 是 256 条有限 ring，没有本轮已导出的阶段数据；其受保护读取仍遵从现有当前服务授权，不代用 8791 账号、不放宽桥或为 telemetry 重启。只有下一次必要服务准备时才窄导出已有字段。

若绑定后确认实际缺格且 sourceReadWall 为主，沿现有有限 publisher 声明准备真实所需产品；若源已命中而组合/写入为主，量对应 owner。均须回到真实手机缺口结果，不能把本地暖 metadata 或预发布成功当作性能改善验收。
