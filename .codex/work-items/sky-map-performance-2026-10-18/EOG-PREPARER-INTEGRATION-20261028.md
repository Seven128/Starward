# EOG 粗层接原 preparer、proof 与空间索引

本轮沿唯一 PLAN P2 的“既有能力接通”实施。复用 [已审粗层物理 mass](EOG-COARSE-MASS-20261028.md) 与 [既有代表批次/分片工具](EOG-NATIONWIDE-BATCH-20261028.md)，不重跑 7 分钟真实 z6、不重哈希 17.42 GB 原件、不产全国新库存，也没有改 PLAN、Context、运行配置、DB、服务、worker、手机或正式分发。

## 实际接通

- `eog_raster.py` 抽出原 CRS/双栅格/声明 AOI 校验，提供无像元数组的 `read_grid`；原 `read_selection` 普通行为保持，并可受限读取声明 source part 内的一个整数窗口。分片准入只需源网格元数据，不为检查分辨率加载整块原件。
- `prepare_fixed_eog.py` 在原入口按实际 subdivision 判断整块 dense geometry 是否超过原 `2402²` 限制。普通小 AOI 仍走原 dense 路径；超出时调用 `eog_chunk_preparation.py`，先生成受限逐块 geometry，再一块一块读取原 TIFF 的 core/下右 halo。完整 source AOI、每资产/proof 和单块上限均未调大，也未增加并发。
- adapter 复用原 `project_display_grid.mts`、coordinate-system 和 source geometry cache；不另写 GCJ 变换。每块仍由 `warp_numeric_chunks` 累计五项物理 mass，完整分区后一次归一化，输出原六波段 Float64 TIFF 和原固定色标 PNG。composition 只复制已计算 cell 的六波段像元，不二次读源或平均 RGB。
- 新资产显式使用 `starward-nightlight-warp-grid-v2` 与 `starward-fixed-nightlight-raster-v3`。原 dense 的 grid v1/proof v2 保留。v3 绑定完整 source grid、subdivision、二维 core/halo 分区、每块 geometry 文件的大小/摘要、共享 target area/branch，以及 adapter/数值 owner 的源码摘要。原数值编码格式和 content-addressed `nightlight-v2-` 文件名前缀保持；不是以旧 proof v2 冒新描述符。
- Python 原 `validate_asset` 与共享 TypeScript `night-light-publication.ts` reader 严格准入该 variant，拒绝未知/伪装版本、非完整/重叠 core、缺 halo、错 source/AOI、坏路径/大小/摘要和 owner 身份。原 sealed inventory 与 schema-2 dataset 事务格式保持。资产、完整数值/质量与 proof 验证后才按原入口封 inventory；失败不封 manifest/inventory。
- `eog_sharded_inventory.py` 沿原资产准入、`prepare_display_eog.mts` 与 `projectNightLightDisplay` 接收新 variant。实际 synthetic 调用已贯通“原 preparer → v3 完整 proof/六 band → 空间分片 → 共享最终显示 producer”，不是只测独立 helper。

## 检查结果与边界

1. 原 dense/publisher、粗层数值、分片检查和新增 preparer 共 **25/25** 通过。之后对新增 chunk child identity/坏输入 guard 的修复、以及 composition 机制补齐，按当前源码重跑新增 preparer 组；最终结果见下方。
2. 共享 TypeScript 新 proof contract 与原 window/display 组 **11/11** 通过；新增 contract 后补“唯一来源、相同总面积仍存在 overlap+gap”的反例，单项复跑 **1/1** 通过。原 v2 proof 读回原字节不变，v3 不放宽其它 image/numeric/quality/source 校验。
3. 新 preparer 的实际输入是明确 synthetic 的原公开 fixture：两个固定 cell 加一个 composition。四个真实 source core/halo/每 cell；通过真实 rasterio 读 TIFF、共享 Node projector、GEOS mass 和 TypeScript display producer执行。新分支禁止调用完整 AOI `read_selection`，只允许实际 33×33 原像元窗口。包含真实有效零、源 nodata、低 cloud-free counts、未发布像元；六 band 质量 code、计数和 PNG 与原 dense 路径相同。composition 六 band 与两份 child 数组逐元素相同。
4. 分别生成本地 mesh 时存在末位浮点差：首轮最大面积超额分别为 `9.117306815964454e-6`、`9.117311005724105e-6`。它不改变质量 code/计数/PNG；两条路径各自仍受原 `0.0002` 面积容差约束，没有修改生产数值规则、色标边界或科学精度。测试不把诊断浮点数的逐字相等当产品要求。
5. 缺 core、重复 core、唯一键但等面积 overlap+gap、无内部 halo、坏路径/大小、未知版本及 v2 伪装均失败。原 preparer 数值边界注入 source-read failure 时，没有 SEALED inventory 或最终 manifest。合法重放通过原 checkpoint 重新验证，不再 warp，也不改已封元数据。

执行入口：

```text
python -W ignore -m unittest test_eog_chunk_preparation test_eog_fixed_publication test_eog_fixed_raster test_eog_chunked_raster test_eog_sharded_inventory -v
node tools/run-node.cjs --import tsx --test workers/miniapp-api/src/night-light-chunk-proof.test.ts workers/miniapp-api/src/night-light-window.test.ts
```

Python沿前批隔离环境 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/.venv`；没有安装/升级共享环境。synthetic 临时目录由测试 owner 核验路径后清理，不是新的真实数据资格或长期发布库存。

当前新增 preparer 最终组：**5/5 通过**（真实分块 I/O/六 band/PNG、chunk composition、shard/共享 display、失败拒绝与不封库存、不可变 checkpoint 重放）。API noEmit 由 Root 的共享集成检查归档；本 agent 未启动服务或构建产品。

## 未完成与下一责任

本轮没有新真实 EOG producer 批次；既存真实 z6 的数值/PNG及其旧源码快照只沿先前证据保留，不能解释为当前 v3 producer 已真实运行。本模块仍须全新 agent 独立审查；必要的一个新真实局部路径由 Root 确认后执行，不能默认重做旧实验。

全国 LOD/显示规格、全国覆盖/容量、完整 DB/按坐标服务准入、原 API 冷 PNG 路径迁移、实际 OSS/CDN 上传读回/切换/回滚及目标 WEAPP 三层行为都仍未完成。当前共享 proof reader 能验证 v3，不等于已向任何真实 `PUBLISHED` dataset、Map runtime 或正式 URL 激活它。旧 r6、私有原件及全部旧发布/URL均未改写。
