# 当前 terrain 成品准入：MISSING

2026-10-23。只回答[已选下一决策](OVERLAY-TERRAIN-SOURCE-NEXT-DECISION-20261023.md)：当前 8799 选定 publication 与当前默认缓存，能否直接供齐 r20 已知 z12、`3344,1782,2×2` 窗口及四个 cell。结果为 **MISSING**；不代表历史成品不存在，也不授权重复取源。

## 结果与含义

| 所需对象，按原 window proof 的行序 | 状态 | 已准入图像 SHA-256 |
| --- | --- | --- |
| 精确 final window | MISSING | 无当前命中 |
| cell 1 | MISSING | 无当前命中 |
| cell 2 | MISSING | 无当前命中 |
| cell 3 | MISSING | 无当前命中 |
| cell 4 | PUBLISHED_EXACT | `304d5257e7dcc1990259adb05fbc83e48f2e9622574db4079ba27090e134790f` |

当前 inventory 本身有效。四个缺失对象在其 current `assets` 没有精确 entry；从当前源码和已绑定 CWD 计算的默认缓存中，对应四个精确 metadata pointer 均为 ENOENT，未出现完整缓存命中。已发布 cell 4 有完整有效像素，PNG/证明/空间身份有效，publicationId 与 image.file 同 r20 原 window proof 的对应 cell 一致。该 cell 不要求、也不等于 final SHA。当前 final 缺失，不能将结果中的 final→cells 闭环匹配数 0 当作内容冲突。

- 所需 / 有效 cell：**4 / 1**；PUBLISHED_EXACT 1 项、CACHE_COMPLETE 0 项、MISSING 4 项、INVALID 0 项。
- 过期 0、已准入对象的 unavailable source 0、partial pixel 0；缺失对象不因此获得来源完备结论。
- 选定 publication hash：`c84ef25094e6455c81003900636d08c515485258c3e5c884e19aa6b051908722`。
- inventory 原字节 SHA-256：`f8903922eb14702d5de6325c903fac296bbc69d94019c9d7844ee03ac71ea774`。
- 当前 final SHA：无。原 r20 final 仍为 `494729bb12cfd4209552f43fe44417abed79e475f00b286c1f47f8125745dd9f`；原必要 PNG 与 metadata 本次只读验证有效、完整，未被纳入当前 publication/cache 命中。
- 已核入所需文件 **3 件 / 88,292 B**：inventory 与已发布 cell 的 PNG/proof。此数不是缺失成品全包大小。另只读核原 r20 metadata/PNG，共检查 5 个现存文件；读取期间文件 size/mtime/ctime 变化 0。

结构化结果：[terrain-current-publication-admission-20261023.json](terrain-current-publication-admission-20261023.json)，SHA-256 `f639b0339de8aace2bb6a317432c8278089141a952ce4e7abdf1c0fd83499f59`。结果只包含状态、数量、hash 和 bytes；外部目录及 raw proof 沿原私有 evidence owner 保存，未复制到仓库。

## 当前配置与准入规则

运行绑定复用 Root 本次实际核验与 [R19 启动记录](R19-READONLY-MEDIA-REPAIR-20261022.md#当前服务与准备条件)：8799 PID54572，创建于 `2026-10-22T23:06:37.712723+08:00`；工作目录显式为当前 checkout。配置完整 SHA 为 `561fa6c8839343d2ac69fdd13dad0c8e9e398e4de3be861e4cef0f8d977427a5`。未重新读取账号配置。启动未指定 `STARWARD_R17_TERRAIN_CACHE`，因此按当前 `TerrainService` 中 `sha256(process.cwd()).slice(0,12)`、`tmpdir()` 与 `TERRAIN_RENDER_VERSION` 的原公式计算默认目录，不推断旧 E 盘或旧服务 cache。

[一次性只读脚本](scripts/terrain-current-publication-admission-20261023.mts) SHA-256 `007fd02238fa52db1c2d25d1933542cc775c66f7d1f2bf3965188708bdfc7450`。执行退出 0。该脚本只使用现有 `readTerrainFixedInventory` / `readTerrainFixedAsset`、`terrainWindowRequest` / `terrainFixedRequest` / `terrainRequestKey` 和 publication/PNG validators；匹配实际请求身份、覆盖、原窗口的四 cell 身份，并只对五个既定对象按序准入。PNG 检查为现有 owner 的字节数、SHA、signature/IHDR 与尺寸检查，不声称重新解码或完成手机像素验证。

临时缓存保留原 24 小时 metadata mtime 准入，拒绝 unavailable source、非 NOT_FOUND issue、覆盖/身份错误或不完整成品；同时核对 publisher 所需 per-image proof。已发布不可变资产不套用临时缓存过期规则。没有调用 `TerrainService`、`getPublication`、publisher 或 renderer。fetch 被显式拒绝，实际 fetch 尝试 **0**；没有 HTTP、取源、mkdir cache、touch、清理、指针改写或服务/手机操作。只新增本报告、只读脚本与结果 JSON，未修改生产源码、PLAN、HANDOFF、Context、数据库或外部原件。

本次准入所用源码 SHA-256：

| Owner | SHA-256 |
| --- | --- |
| terrain-fixed-publication.ts | `08f1faf060bcb31a619c93eab73c02db2c466c6de3774692221e9e732cb60f90` |
| terrain-request.ts | `4a823b8fa42f59be3f43c3c60d9b6b37d1c9bfe318490bf2d2eb1ea517afc256` |
| terrain-publication.ts | `ca7b62d43df9e1072272064df4961de8dd70ede62d13ff531955f3e6124c3c43` |
| terrain-service.ts | `b2b7be2b419904b1c75f2ca4a1afa3516647d4a8e9be6457220647a04e72d52f` |

## 唯一下一步

**先沿原 r20 任务证据定位已知历史 cache / 成品出处，验证并直接复用已有成品。** 本次没有核查旧服务 cache，当前默认缓存 MISSING 不能推导“必须重新取源”。原 r20 完整 final 必要原件仍受保护；已准入的当前发布 cell 也应直接携带。不得扫描全盘或猜目录，更不为补成品重放手机冷样本。

Root 完成该有限复用核查后，使用原 finite publisher 进行一次合批接入；只有仍真实缺失的 cell 才进入既有有界取源准备，使用新且不重叠 output、inventory-last，保留原 publication/原件。此次不运行 publisher，不重产 r6、不放宽校验、不改客户端调度、源并发或缓存容量，也不为该结果单独重启服务。接入后的真实收益、连续手势、三叠层实际数据与资源回落仍待原 Goal 的后续验证。
