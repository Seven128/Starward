# EOG 粗层：有界 source core 累计与接缝

本记录补充唯一 PLAN P2 的光害全国迁移。[前一批次](EOG-NATIONWIDE-BATCH-20261028.md)已经完成的25资产/空间索引/对比色标不重跑；本次只解决粗cell超过单块geometry限制时的数值累计机制。没有全国扩批、重新下载原件、修改r6、DB激活、API/OSS/CDN或手机结果，也没有另一份实施计划。

## 改动及保持的规则

- `eog_area_intersection.py::intersect_area_masses`接受显式半开`source_core`矩形。仅core累计物理mass；数组中的halo提供core最后一行/列所需的真实相邻角点，不再次贡献面积。现有不分块调用仍默认完整source。
- `eog_fixed_raster.py`把source→五band物理mass与统一归一化分开，原`warp_numeric`继续走同一规则。新增`NumericWarpChunk`和`warp_numeric_chunks`接流式有界source窗口，保每块2402²上限及原256²目标cell上限。
- chunk的origin/core绑定声明完整dense source shape；内部core必须有下/右真实halo。源缺值由mask表达，不能漏掉一个core后冒未发布。矩形扫描线与完整source面积共同验证二维无重叠/无遗漏，只保矩形metadata，不分配全国source大小的覆盖位图。
- 五项mass是有效辐亮度加权和、有效面积、源缺测面积、低cloud-free面积、已发布面积。对目标大小数组做补偿求和，全部core准入后才除完整target面积、判质量及着色；不平均各块均值/质量比例或RGB。
- 原`night-light-fixed-scale.json`的0.5有效面积门槛、0.0002面积容差、分级及7.1054e-15边界数值容差保持。目标GCJ geometry继续由原`project_display_grid.mts`和coordinate-system提供，没有复制坐标变换或放宽精度。

这仅提供原数值owner的可调用流式入口。`prepare_fixed_eog.py`、公开proof schema、DB publisher和API未迁到分块入口；不可把本次实验PNG当新PUBLISHED资产。

## 责任层检查

旧`test_eog_fixed_raster`6项和新`test_eog_chunked_raster`6项，共12项通过。

- 整块与分块在非线性二维几何、3种core尺寸、正序/逆序下逐band比较，沿用原边界数值相对容差，PNG要求逐字节相同。
- 同一完整target中，每个小块单独不足有效面积而合计恰好达到门槛的例子保持正确均值50、有效/缺测/低cf面积0.5/0.25/0.25，证明归一化发生在累计之后。
- 坐标双分支只选择一次；真实零保色，缺测/低cf/未发布仍透明。重复或遗漏core、内部无真实halo均拒绝。
- 完整流式generator回归验证：consumer在下一块准备之前释放上一块MaskedArray；不把窗口历史留在累计器。

未重跑DB集成或整套25资产准备；原非分块调用的六项数值/quality/GeoTIFF检查直接覆盖本次提取影响。

## 真实 z6 样本

输出：`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/coarse`。`run_coarse.py`是本任务单一参数化实验，沿原全局EOG原件和前批本地输入manifest，不请求网络。原件身份复用前批完整SHA核验；本次只读。

目标固定cell为z6/x52/y27，覆盖广东东部及邻近海域。source包络由实际coordinate-system对全目标顶点的两个连续逆分支取得，再向外对齐原像元并保邻点。原source窗口1232×1354；沿既有quadrature计算实际subdivision=3，完整dense几何3696×4062＝15,013,152点，超过原单块5,769,604点上限。

9个source core各取最多512×512原像元，加载下/右halo；最大单块dense geometry为2,368,521点，低于原上限。共享core边界的15,520组source/identity X/Y anchor按原7.1054e-15相对精度核同，没有以mass总和代替接缝核对。

最终65536个像素均满足原quality1，32844个是真实有效零；辐亮度范围0–142.5659057417531 nW/cm²/sr。最大面积超额5.172886703430635e-7，低于原0.0002；最小published/valid面积比例0.9999995179117465。这个真实输入没有source-missing或低cf，不能用它冒这两类异常的真实覆盖；上述合成机制测试独立保留。

独立重新打开六band数值TIFF和PNG，核字段名/单位坐标、有效mask、各质量面积和、原固定分级RGBA、有效零、全部图像像素，均通过；数值TIFF保LOCAL GCJ坐标、不标成EPSG:3857。已目视非空夜光结构。当前图仍是原固定色标的数值实验输出，最终对比显示继续归前批共享producer。

| 本次数值产物 | 字节 | SHA256 |
| --- | --- | --- |
| coarse.numbers.tif | 895001 | 721b41c261621b2add2c700ef3a80499dd9ce42530d9eba2856895d7adc89caa |
| coarse.png | 17177 | 04c64f2d6c76c7c4e22cf13945dbe3ed883c107d92f59709c9c6defd963cf060 |

`result.json`保存源window、core测量/质量、数值owner hash；`readback.json`保存实际文件身份和读回结果；`processor-source/`保与结果hash相同的两份实际数值owner源码。所有实验输出均留在本机，未上传。

## 资源与证据限制

Windows本机进程树每0.1秒采样：wall 419.99s、CPU观测下界413.94s、同时RSS峰值1,092,468,736B（约1.02GiB）。单个最大core的GEOS累计约59–67秒，几何生成/读取约1.3–1.9秒；说明本次真实开销主要在面积相交，不能用几何文件大小猜CPU。

测量后保留的81个实验文件逻辑大小488,206,115B，其中几何中间文件487,247,166B；均未在途中删除，因此这个保留集合的结束长度也是其已观察逻辑高水位。它不含原始17.42GB EOG源、不等于NTFS物理分配，也不是未来可分发库存大小；最终六band/PNG与准备几何必须分开计量。

该实验caller为取得共同target geometry，bootstrap保留了首块输入；峰值包含这额外首块、GDAL/GEOS缓存和Python/Node子进程，并不是流式入口最小工作集。数值consumer本身已通过上一块引用退休检查。没有为消除这一测量边界再重算同一真实批次，也不把该峰值冒生产4核16GB容量、API并发或手机内存。监测过程会遗漏短子进程最后CPU区间，CPU总量只报下界。

本机制的后续合并边界仍由PLAN/HANDOFF接管：原preparer接唯一core分配和有界source读取/geometry；新全国发布身份须绑定完整source-core/geometry集合与数值owner，再经原DB事务准入。全国LOD/完整库存量、加工并发、正式分发和目标端质量仍未完成。

<a id="interior-mass-fastpath"></a>
## 2026-10-30：完整落入一个目标像元的面积贡献

原实测已将粗层成本定位到GEOS相交。本轮沿同一`eog_area_intersection.py`实施严格包含分支：全部候选四边形仍先做原valid/正面积检查，只有其完整normalized bounds处于一个合法目标像元内才直接使用权重1；未选branch贡献0，跨界继续原GEOS。source core/halo、双坐标分支选择、阈值与无效几何拒绝不变；按source index稳定排序保累计顺序，没有新epsilon，也不改变最终一次归一化。

实施agent仅改原engine和一份focused测试，6/6通过后结束；Root读实现/测试及原日志，并运行原fixed-raster/chunked-raster/chunk-preparation **18/18**。这些原检查覆盖六band、有效零/缺测/不足/未发布、双分支、core分配/halo、真实fixture producer→proof→index/display及不可变重放；未修改测试阈值或旧proof。

Root另只选已封存canonical z6的一个中心core：原窗口`[512,512,513,513]`，dense1539×1539，core1536×1536。读取现有geometry/目标面积与获权原件有界窗口，旧/新engine分别对**相同输入**做一次完整五项mass计算及局部诊断归一化，没有重跑9块、原preparer、完整成品或发布。

| 同一真实core | 修改前 | 修改后 |
| --- | ---: | ---: |
| engine wall | 95.811373s | 43.748107s |
| engine自身CPU | 92.625s | 42.28125s |
| GEOS相交polygon对 | 2,681,631 | 624,094 |

本次wall约2.19倍、裁切对减少76.727%；不是整批/全国/目标服务器加速比。五项mass沿原`7.1054e-15`相对精度全部通过，最大绝对差`1.6941e-21`（不是bitwise相同）。辐亮度最大绝对差`2.1316e-14` nW/cm²/sr；valid/published比例最大差`6.6613e-16`，缺测/低cf比例差0，质量/有效零/NaN位置完全相同。局部诊断PNG两份字节相同，SHA `f99b23e7f4e3ecfd5d9b8dd3debb78202bb08a6365e60ba67a7cf0f8a6ee93e1`；它不是完整cell或新产品。

原benchmark两worker均正常结束，但父harness把接近零的`areaExcessFraction=max(publishedRatio-1,0)`直接作相对误差比较，最后assert失败。Root未重跑数值；直接读原输出，复核五项mass及六band，并把原相对精度作用于其物理量`1+excess`，仍核原areaFractionNumericalTolerance的通过/失败一致。超额绝对差同为`6.6613e-16`，没有改生产精度或准入守卫。该修正仅修观察器的残差比较，首轮FAILED/exit1原样保留。Windows venv启动器还令原RSS监测只看到约5MB父进程；实际worker另有子PID，故**峰值内存比较UNKNOWN**，不重跑来追这一数值，也不声称省内存。

私有根`E:/Dev/Starward-data/development/nationwide-layers-20261028/eog/interior-mass-20261030`保旧engine、old/new结果/质量数组、诊断PNG、benchmark脚本/FAILED操作、Root`verified-readback.json`及两组测试日志。engine SHA从`5e9378a7…be55396`变为`7badd5f5…f8ba3`；原proof继续按源码hash区分epoch，旧r6/pilot/v3不重建。无API/DB/手机/源数据修改、无新release或正式分发；完整Goal及[宽视野低LOD依赖](EOG-STATIC-PREPARATION-20261028.md#wide-view-source-dependency)仍未完成。
