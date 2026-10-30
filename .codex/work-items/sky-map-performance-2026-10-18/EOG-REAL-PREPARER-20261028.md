# EOG 当前 v3 preparer 的真实单 cell

本记录归唯一 PLAN P2 的既有生产能力接通。Root 已明确批准当前原 preparer 的一个真实 `z6/x52/y27/1×1` 批次和 840 秒 wall 停止边界。它补的是新 v3 producer 实际读取真实 TIFF、完整 proof/数值/共享显示及空间分片的结果；不为重复确认旧数值实验重跑，不把旧输出包装为新生产结果。

## 操作身份与恢复

单一 owned 目录为 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/real-preparer-z6-v3-20261028`。`run_real_preparer.py` 只调用现有 `prepare_release` 和 `prepare_index`，保留原 512 core、3 倍 quadrature 和质量规则；不改生产源码。

启动意图、输入身份、确切 monitor/worker PID 与状态保存到该目录 `operation.json`；`phase.json` 只留当前实质阶段，`worker-attempt-<n>.stdout.log` / `worker-attempt-<n>.stderr.log` 保留本次运行输出。恢复先读这些文件和实际进程，**不得重新执行已存在 operation**。840 秒超时只停止该 owned 进程树，保留中间产物，不自动重试。末次结果及资源分别归 `result.json` 和 `operation.json` 中指向的 `metrics-attempt-<n>.json`；没有通过结果不能声明通过。

## 已核输入与边界

沿原 `pilot/coast/source-manifest.json` 复用两份获权全球 EOG 原件、来源/许可与已核 SHA 引用，只在全新本地 input manifest 声明覆盖完整 cell 的原像元脚印。原 `coarse`、pilot、r6、全部源 TIFF 与旧发布均保持。

- 输入 source window 与旧真实样本完全相同：`[70198, 11504, 1354, 1232]`。
- 整体 source AOI：W `112.48958567325005`、S `21.935416242149998`、E `118.13125238505003`、N `27.06874961655`；未上调原 10° 限制。
- 元数据 preflight 实际得到 subdivision=3、9 个 source core、默认边长512、最大 loaded dense=2,368,521点；与已测旧值相同，仍低于原2402²限制。
- 新 dataset 为 `eog-vnl-v22-2025-cn-coarse-v3-20261028`，仅一个 256² cell，不声明全国覆盖。
- 准备阶段沿原 owner 将完整原件 hash 核验延后到 publisher。本步不再重哈希17.42GB，保存源文件 stat 与引用身份并核运行前后未变；这不能替代正式 publisher 的完整源准入。

## 结果要求及尚未发生的外部效果

实际运行后按相同空间支持对照旧六 band，沿原 `7.1054e-15` 边界精度及质量规则核值、零值和全部原 RGBA；实际重开 v3 proof、数值 TIFF、空间分片和最终显示成品。进程树 RSS/CPU 每0.1秒采样，CPU只报观测下界；逻辑文件总长、硬链接去重后的逻辑长度与 Windows 文件 allocation 分列，不能混称物理 I/O、主机容量或手机内存。

首次启动只在 readback harness 的未安装 PIL import 阶段停止，0.46秒、没有 release/index/像元生产；原 harness 源码、失败、metrics 与日志保存在 `attempts/1/`。Root 已明确允许以既有 rasterio 读取 PNG 修复观察脚本，在核输入与 production code 身份未变后恢复尚未开始的单 cell 生产。没有安装包或修改生产源码；后续日志/metrics 按 attempt 区分，真正数值生产失败不自动重算。

## 旧 code epoch 的真实失败及已停止状态

第二次进入了当前原 preparer：9块 geometry 已实际生成；前2块 source core 的 mass 已完成，第三块原 TIFF 窗口读回后，`prepare_chunked_window` 在 child/source 身份 guard 明确失败，未封 asset、数值 checkpoint、inventory 或 sharded root。真实错误为 `PipelineError: nightlight_chunk_geometry_identity_invalid`，来源 `eog_chunk_preparation.py:231`，详 `failure-attempt-2.json` 与对应 stderr。

metadata-only 的9块核对保存到 `transform-exactness.json`：x-offset=1024的3块，原 preparer 用整窗 transform 再平移得到的 child west，与 `read_selection` 从全球 TIFF 实际 window transform 取得的 west，相差 `1.4210854715202004e-14`；另6块完全相等。当前严格 dictionary 比较因此拒绝该有效输入。没有将其当作源数据损坏，也没有悄悄放宽精度或 guard。

Root 已接管 canonical transform 生产边界修复，要求继续保持严格身份比较。其停止指令执行时 worker 已自然因该 guard 退出，实际核验未向任何进程发 signal，未触碰 API/其它进程。`stop-observation.json` 与 `stopped-readback.json` 确认9份 geometry、0 numeric checkpoint，两个源原件的 size/mtime/SHA引用保持。前2块 in-memory mass 没有可恢复 checkpoint；只允许由原 owner 判断未封口几何的合法复用，不能把它们冒成品。

| 本次实际失败进程树/产物口径 | 结果 |
| --- | --- |
| wall / sampled CPU 下界 | 218.430秒 / 205.703秒 |
| 同时 RSS 峰值 | 442,642,432 B |
| 原样保留文件 | 120个 |
| 全路径逻辑长度 | 969,766,572 B |
| 按volume/file ID去重的逻辑长度 | 487,855,020 B |
| 文件 allocation（去重） | 487,979,984 B |
| 硬链接别名 | 36个 |

allocation 通过 [GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex) 的 [FILE_STANDARD_INFO.AllocationSize](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_standard_info) 读取；不含 NTFS metadata、原件、进程内存或磁盘 I/O。0.1秒为采样等待间隔，进程查询成本及短子进程退出仍使 CPU 仅为下界。该失败 run 不给生产容量/完整吞吐或手机内存结论。

## canonical 身份修复的窄检查

Root 在 `RasterGrid` 保存原 TIFF full affine，由同一个 `rasterio.windows.transform(absolute_window, raster_transform)` 生成 chunk descriptor；不再平移已裁剪 affine。实际像元读取及严格 child/source guard、原数值/质量容差保持。

按 Root 指定在原 `test_eog_chunk_preparation.py` 补 metadata-only `CanonicalChunkMetadataTest`：2×2 MemoryFile 只承载真实 EOG affine，实际调用 `prepare_chunk_geometry` 的9次 project 输入，逐字段比较原 Dataset 的 canonical window transform，明确覆盖 col1024。stub projector不生成 dense mesh或数值；单项0.177秒通过。随后该 module 的6项全部通过，覆盖原六band/quality/PNG、composition、shard/共享display、失败不封库存及不可变重放。

`canonical-transform-preflight.json` 另仅读真实源 TIFF 的 metadata，确认生产 `read_grid` 取得的新 full affine 对9个真实绝对 window 全部 exact，source window 与 input manifest SHA 保持。此检查没有重哈希原件、生成 mesh 或恢复 mass，不代替新 code epoch 的实际 v3 producer。

## 新 canonical code epoch

Root 另外17项原数值/shard回归通过后，已明确批准一个新的 owned output 重跑这一个未 SEALED cell，仍为840秒停止边界，不扩全国。实际diff已对照失败epoch的源码快照读回：仅 `eog_raster.py` 保存 full affine / canonical transform，`eog_chunk_preparation.py` 由绝对原像元 window 取该 transform；原 reader、strict guard、容差、分块及并发预算保持。

新输出为 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/real-preparer-z6-v3-canonical-20261028`。继续使用同一参数化 `run_real_preparer.py --output <new-output>`，不复制活跃脚本或原地修改失败的3份geometry，不假复用已经丢失的 mass。前次 harness 原字节另保 `attempts/2/run_real_preparer.py`；失败目录全部geometry/metrics/原件保持。新 output 的 `operation.json` 记录 attempt3、前次operation、相同输入身份、新17份production owner快照及新的实际起点。

## canonical 真实生产与独立读回结果

新 code epoch 于 `2026-10-27T23:03:26.988311Z` 启动。原 `prepare_release` 实际完成9个 source core，643.906秒后封存一个 v3 asset；原 `prepare_index` 与共享 contrast producer 随后完成并封 root。严格身份 guard 未再失败，840秒停止边界未触发。

运行时观察 harness 在成品均封好后，把 contrast alpha 数值误当成必须与 legacy 相同而退出1。这是观察断言错误：原共享 display 声明显式为五档配置不同 opacity，合同保持的是有效/透明 mask。原 `harness-source/run_real_preparer.py`、SHA、`failure-attempt-3.json`、stderr 与 exit1 metrics 全部保留；没有用修改后的 harness 重跑数值或改写成品。

只读 `verify_canonical_products.py` 复用原 `read_inventory` / `validate_asset` / `read_window` / `read_pinned` 准入，独立重开六band TIFF、源 PNG、root/shard、display proof/PNG；从共享声明 owner 读取原/对比两套色标，对全部像素核期望 RGBA。它不调用 preparer、index producer 或 renderer；0.895秒完成，`verified-readback.json` 为 **PASS**。观察脚本后续仅修为正确的非零alpha mask判断，实际已运行版本仍由原 snapshot 保持可追溯。

| 实际输出与一致性 | 结果 |
| --- | --- |
| dataset | `eog-vnl-v22-2025-cn-coarse-v3-20261028` |
| inventory publication | `nightlight-fixed:739d480de96e2036f60d05722796675521c350c3d1ff4176d0ac71ec19964ed5` |
| inventory SHA | `9ba02e440204dbf2f1e36d58c4108dd7bcf15b3665b6c52e7a2bc772f7f3cb5f` |
| sharded index SHA | `97e18cdfc08e73d9a888a4c35d0ee1693fd6fa970e00ee4068d5804f718953c0` |
| index version | `nightlight-sharded:84fc9232f04223d45199483c5e27e520df004d15b26429238b664fd4a16eb5eb` |
| 六band与旧同支持结果 | 每个元素完全相同（含NaN），各band最大绝对差0 |
| 数值 TIFF | 895,001 B，SHA仍为 `721b41c261621b2add2c700ef3a80499dd9ce42530d9eba2856895d7adc89caa` |
| 原 PNG | 17,177 B，与旧样本逐字节相同，SHA `04c64f2d6c76c7c4e22cf13945dbe3ed883c107d92f59709c9c6defd963cf060` |
| 最终 contrast PNG | 43,061 B，SHA `bd0c82817b9e37d636dec1bf19be50484bd4672945351f27b910596d735aec25` |
| 全部 contrast RGBA | 与共享声明映射逐像素相同；alpha为36/70/108/146/184，有效mask保持 |
| 质量/真实零 | 65,536像素均quality1，32,844个有效零；area excess `5.172886703430635e-7` |
| 完整可分发 index 目录 | 9文件、974,327 B，含完整六band/proof/源及最终PNG/索引，不含 geometry |

独立读回还核对17份 production owner 的 live SHA 与启动快照完全相同、source size/mtime/SHA引用保持。source full hash 没有重算，仍按原发布器合同延后到正式 publisher；不将本地准备越级当源完整准入或 DB 状态。

| 新 code epoch 的资源/保留口径 | 结果 |
| --- | --- |
| 进程树 wall / sampled CPU 下界 | 645.815秒 / 615.859秒 |
| 同时 RSS 峰值 | 446,902,272 B |
| release+index保留文件 | 135个 |
| 全路径逻辑长度 | 971,664,586 B |
| 按volume/file ID去重的逻辑长度 | 488,830,901 B |
| 文件 allocation（去重） | 488,979,808 B |
| 硬链接别名 | 40个 |

这些资源包含 geometry/cache、数值、metadata与成品，和上表9文件的可分发集合不同；不包括17.42GB原件。旧coarse caller额外保过bootstrap chunk，本次实际preparer流式持有者不同，不能把两次RSS直接解释为产品优化比例。本机一次运行不是4核16GB生产容量、混合API并发或全国耗时证据；本真实输入没有source-missing/低cf，相关机制仍沿已有fixture。

当前结果为 **新的真实 v3 producer、严格准入和独立 readback已通过，待 Root 的全新独审/后续集成**。只交付一个coarse cell及其空间索引/最终显示；未操作数据库、API配置、业务提醒 worker、OSS/CDN、设备或构建，不代表全国/正式分发/手机就绪。完整 Goal 与既有 D0–D2 等义务继续保留。
