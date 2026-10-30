# EOG 全国迁移：真实代表批次与空间索引

本记录归唯一 PLAN P2/D1。2026-10-28 已完成两空间分区的真实离线代表批次、按坐标直达的空间/LOD索引及最终对比色标预制入口；没有全国正式生产、DB激活、API切换、OSS上传、CDN读回或手机结论。原r6、原件及旧URL均保留。本记录不新建实施计划。

## 当前代码与可执行入口

- `data-pipelines/dark-sky/prepare_fixed_eog.py`、`eog_fixed_raster.py`、`eog_area_intersection.py` 原样复用，保持原面积统计、六波段数值、质量、内部GCJ配准及每分区限制。
- 新增 `data-pipelines/dark-sky/eog_sharded_inventory.py`：接受一个或多个已准备schema-2 manifest；要求同dataset、源摘要、政策及来源；逐分区沿原数值发布器完整校验，然后封存空间/LOD索引。重复分区/固定窗口拒绝，不选择先到/后到版本。根索引最后写入，任何中间文件不激活产品。
- 新增 `data-pipelines/dark-sky/prepare_display_eog.mts`：离线调用现有API的 `projectNightLightDisplay`，不复制颜色规则。保原PNG和数值不动，另产contrast PNG及其来源/质量proof。
- 新增 `test_eog_sharded_inventory.py`；使用方法已写入 `data-pipelines/dark-sky/README.md`。

命令：

```text
python data-pipelines/dark-sky/eog_sharded_inventory.py --manifest <part1/release/manifest.json> --manifest <part2/release/manifest.json> --output <new-index-directory>
```

这是既有准备/发布职责上的离线入口，不另起服务。结果明确 `databasePublication=false`，通用入口的原件完整hash仍由原发布事务负责。本次真实批次额外在准备前完整复核了两个原件SHA。

根格式 `starward-sharded-nightlight-index-v1` 持有相同源/政策身份、声明AOI、原库存和分片摘要。分片格式 `starward-sharded-nightlight-assets-v1`，用现有固定window key的 `zoom/floor(x/16)/floor(y/16)` 定位；根内不存全国asset列表。每个entry同时绑定原proof、六波段numeric、原PNG及最终display的独立publication/hash，缺分片/窗口表示未发布，已声明分片损坏表示失败。`read_window` 的真实单窗口读路径仅需root+一个shard；不加载原全国库存。根和单分片的有界解析上限是实现准入限制，不是生产容量结论。

## 原件、许可与本机输入

复用 `E:/Dev/Starward-data/sources/eog-vnl-v22-2025-c202604011200` 的既有全球radiance/cf_cvg TIFF（共17,420,036,496B），与 `data-pipelines/runtime-data/current.lock.json` 的两份SHA完全一致。没有再次下载、上传或加工r6。

2026-10-28重新读取[EOG官方许可附件](https://eogdata.mines.edu/files/EOG_products_CC_License.pdf)：VIIRS VNL允许按CC BY 4.0加工和商业分发，仍需来源与修改说明，图像保对应产品通知/小幅署名，大幅输出规则另守原owner。既有获权原件的复用没有新增下载订阅推断。输出保原source metadata与年度卫星辐亮度含义，不称SQM/Bortle或实测天空。

本任务隔离Python在 `E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/.venv`，沿仓库锁定numpy/rasterio/shapely/psycopg要求安装，仅任务测量加psutil 7.2.2；共享`.venv`未动。首次Python3.10解析旧7位小数acquiredAt失败，保全bootstrap日志；新本地输入以微秒表达相同获取时刻，原r6 manifest仍原样。该兼容调整不改观测年份/时域。

批次根：`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/pilot`。
任务本地 `run_pilot.py` 持有同一个参数化批次及测量，`readback_pilot.py` 持有独立产物读回；没有逐区域复制一套脚本。

## 真实批次和读回

两个声明源AOI分别为沿海113.4–114.5°E、22.1–23.2°N及内陆115.7–116.9°E、39.4–40.4°N；实际出版脚印由原preparer向外对齐到原像元。样本覆盖不同地区、z10/z12、原连续投影/GCJ边界分支、有效零及有意保留的声明覆盖边缘。

统一新dataset：`eog-vnl-v22-2025-cn-pilot-20261028`，21个固定cell与4个同级组合窗口，总25资产；不是全国覆盖身份。

| 实际输出 | 字节/结果 |
| --- | --- |
| 全部六波段数值TIFF | 27,866,026B |
| 原色标PNG | 79,865B |
| 离线最终contrast PNG | 110,778B |
| 原/派生proof | 225,638B |
| 完整可分发目录（全部metadata/索引/数值/图像） | 135文件，28,387,529B |
| root | 5,002B |
| 5个空间/LOD shard | 各5,797–28,409B |

不能用两个输入波段或PNG体积代表完整产品容量；本批数值伴随物明显占主导。全国产量/LOD/窗口形态尚未确定，不按本批线性外推容量或月费。

封存root SHA256：`15fa42d4d49f32ca6bc310d05599f763e49c94a2968d75945a79d0e3e929c373`；indexVersion：`nightlight-sharded:23c5b17eec51de0f621410e82f60a2ccb87e039792d75a5d15972c7348c7c2f0`。

最终代码独立读回全部25项/28,282,307B图像、数值及proof；root/shard全量定位结果匹配，原numeric字节身份保持，四份composition的每个六波段子块与对应固定cell逐值相等（包括NaN）。数值TIFF仍为LOCAL GCJ-02派生坐标，不冒EPSG:3857。所有数值有限有效mask与最终PNG非透明mask一致，质量面积和、上下界和原摘要通过；对比色标内容实际改变而不是空输出。已目视两份细档最终成品有真实非空分级，未把离线PNG当微信合成/配准验收。

只计21个cell、排除composition重复后：质量1/2/5分别1,343,488/1,024/31,744像素；有效零72,736像素。最大面积超额4.2147053551877534e-05，低于原政策0.0002。两真实区域未观察到source-missing、低cf或混合不足像素，不能称本批覆盖这些异常；其原数值规则及合成测试仍独立保留。覆盖边缘不涂成零或延伸值。

`readback-results.json` 保存每分区统计、精确public paths及两次准备身份；本轮读取原件hash及最终读回均有实际作用，不以旧r6成功代替。

## 加工资源（本机Windows，非服务容量）

`resource-metrics.json` 对Python准备进程及其Node子进程每0.1秒采样，产物全过程保留；`batch-results.json` 保存分区完成结果。

- 真实准备153.72秒，其中两原件完整hash24.21秒；两分区准备74.49/53.92秒。
- 采样进程树同时RSS峰值222,273,536B（约212MiB）。观察到的累计CPU时间下界148.61秒；短子进程的最终采样间隙可能遗漏，不能当精确总CPU。
- 准备结束目录逻辑字节597,267,169B；按Windows文件身份去重为93,306,049B。几何数组由既有hardlink缓存复用。此处是文件长度去重，不是NTFS物理分配或Linux生产磁盘实测，含准备几何/任务metadata，与上方可分发产品分开。
- 首轮索引+对比色标2.81秒，采样进程树峰值222,003,200B；随后增加交付路径完整hash读回后的最终独立重验3.80秒。代码 epoch/检查范围不同，不混为单次性能对照。

未同时运行普通API/数据库与不同冷窗口并发，本机型号/CPU/页缓存不等于预期4核16GB，也不证明4GB或200DAU容量；没有手机/native/GPU内存结论。

## 必要检查

`python -W ignore -m unittest test_eog_sharded_inventory -v`：最终5/5通过。范围为实际数值fixture+TypeScript共享显示producer、仅两文件的精确窗口发现、全数值/质量/坐标身份、透明缺测保留、源绑定/非空改变、不可变重放、重复拒绝、已知损坏失败及无覆盖空结果。真实最终25资产读回通过。没有跑DB集成、普通WEAPP构建或手机；不占Root的构建/Git/共享服务。

## 全国与运行时接入的最小剩余边界

1. **源分区和halo。** 每固定window应有唯一owner；用既有坐标owner确定所需原像元脚印，向外对齐并保供配准所需halo。halo只用于几何/读取，不把相邻core重复计入质量面积。不能把临时分区边缘当真实未发布边界。当前代表批次有声明边缘，尚未证明全国产物无分区接缝。相邻cell/分区需按同一核心分配与数值质量核对。
2. **粗LOD。** 旧preparer一次读取整个AOI，10°AOI、2402²细分geometry和4096资产限制仍在；没有上调。粗cell若超出单分区预算，需要在现有面积owner内有界累计各源core的五种物理质量/辐亮度mass，再统一除完整target面积/着色；不能分别归一化后平均、更不能平均RGB。这个数值扩展和相邻边界证明尚未实施，因此当前不宜直接展开全国所有LOD。
3. **数据/DB权威。** 继续由现有`publish_eog_viirs.py`事务、实际原件hash、Spot采样与修订owner发布。schema-2/旧r6仍走原reader。新全国payload需显式绑定sharded root摘要/version及同dataset/源政策；不能用索引存在、文件SEALED或手工构造PUBLISHED记录代替发布。当前旧publisher仍按单AOI库存读取，新的分区根/全国Spot窗口采样准入未合并。
4. **服务读取。** 在`night-light-publication.ts`/`NightLightService`新增显式版本分支，由实际PUBLISHED记录读已pin root，沿现有`displayRasterWindowForBounds`/LOD选择得到固定key，只读所需shard/proof/小数值窗口；不再构建全国proof数组。原prepared-window、静态发布、下载/native退休owner继续复用。未索引的必要窗口交有界后台工作，不把原同步PNG冷路径当新正常fallback。
5. **窗口与交付。** 本批只预制声明的25个key，不代表任意viewport已经命中。全国LOD/窗口尺寸与数量须结合目标质量、完整数值/文件体积和最小必要手机结论选定；不穷举全部位置×尺寸×LOD。数值/metadata及最终PNG应通过原静态发布适配器导出到OSS，CDN冷回源亦走OSS，实际字节/权限/切换与回滚仍待验证。

以上是当前结果暴露的依赖说明，执行顺序继续归唯一PLAN/HANDOFF；没有取消D0–D2、地形或其他Goal义务。
