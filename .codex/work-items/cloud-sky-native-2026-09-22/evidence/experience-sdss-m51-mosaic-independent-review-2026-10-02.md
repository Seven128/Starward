# M51 六字段 gri 拼接独立审查（2026-10-02）

审查者 `mosaic_review` 独立于 source 与 mosaic 实现 owner，已核第 2 步真实 18 帧、六字段 r2 拼接候选、同母图层级、软件 GPU 复用/新实物和现有编码试验；发现并实证闭合一个 partial 合同错误。没有查询、下载、改生产、发布、部署、IDE 操作或手机验证。当前有限结论支持继续共享离线质量链，**不采用新画质/显示/编码，不关闭完整 astrometry、native、200 DAU 容量或最终验收**。

## 当前真实输入核验

独立脚本 [source checks](../scripts/experience-sdss-m51-mosaic-source-independent-2026-10-02.py) 从原三帧、六个新 r 和十个新 g/i acquisition receipts 选出六个完整字段的 18 帧。它实际重新核 compressed bytes/SHA、reader 的科学数组/asTrans 身份与单位，并直接解压读取 FITS primary 与 reader 数组精确对照。原 `301/3699/6/100` 三帧均复用；没有把 acquisition 的 `RAW_ACQUIRED_UNCHECKED` 历史回执改写。

六字段是 `301/3699/6/{99,100,101}` 与 `301/3716/6/{116,117,118}`。独立使用低层 linear WCS 的 `wcs_pix2world/wcs_world2pix`，遍历当前 2048² 北向 TAN target，并对每 source 四邻域检查几何范围和 finite 值，没有借用 mosaic 的重投影或 coverage 函数。逐 band 保存 field-membership bitset，分别核跨字段 union 和同一字段三带共同可取的 union；后者避免误把分别来自不同、不能共同供色的 field 当作完整 coherent RGB。

| 实物结果 | g | r | i |
| --- | --- | --- | --- |
| 可取 target 像素 | 4,194,304 | 4,194,304 | 4,194,304 |
| 缺 stencil / finite 邻域 | 0 | 0 | 0 |
| 只由一个 field 提供的 target 像素 | 3,469,330 | 3,468,833 | 3,466,974 |

同一字段的 g/r/i coherent union 也为 **4,194,304/4,194,304**。六字段在每个波段都有独供像素，删除任一个都会产生缺口，最少一项也会损失 76,432 个 target 像素。这是当前已取得有限候选池的真实必要性，不宣称全源库全局最少、完整 asTrans 误差界或更大视场覆盖。

18 个 reader 数组都与原 FITS primary 精确相同，原有限零值和负值仍是测量；没有再乘 NMGY 或再扣 sky。源 science 的 finite、unit 与已标定事实仅支持当前插值输入准入，**不等于 detector/PSF/noise/曝光置信度或无伪影**。完整 asTrans polynomial/DCR 尚未应用，fpM artifact mask 未提供；上述覆盖只在当前 primary-header linear TAN 和明确四有限邻域规则下成立。

当前稳定实物报告：[source review.json](../../../../output/sdss-m51-mosaic-source-independent-1002-r3/review.json)，SHA `93f5a517f22d32160060cef685f8283ab77ad23ccc0770331214f80f1bb4159f`，包含 18 个源身份/实 bytes/SHA、实际 WCS 与独立 bitmask 绑定。初代脚本路径未 resolve 而失败，`r1` 目录保留；`r2` 是补 coherent 项前的结果，且脚本在运行中增补过该检查，不作为当前稳定脚本绑定。`r3` 捕获并校验 script/reader 前后身份，是本节采用的有限证据。

## 新拼接输出审查

当前采用的实物是 [r2 candidate](../../../../output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json)，SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`；[binding](../../../../output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json) SHA `bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d`。owner `sdss_gri_tan.py` SHA `7dee99087fb3bda4c99064ee34944e2ce87b485addcce26a940cd731cd58e95f`。r1 输出最后因 task relative-path binding 失败而没有完整绑定，保留该目录，不升级成 r2；r2 重新读核实际输入并完成新代次。r1/r2 六张 PNG 字节实际一致，但当前结论由 r2 全绑定支持。

独立 [main checks](../scripts/experience-sdss-m51-mosaic-independent-2026-10-02.py) 对真实输出全像素检查：每个 field/band 的可取 mask 等于先前独立 source bitset，独立 source unions 与 coherent coadd-data masks 分开；所有共同 normalized weights 范围正确、资格等于该 field 的三带共同 stencil，和为 1 的最大浮点差 `4.470348358154297e-8`。从所有保存的 field 测量和共同 weights 独立重构整幅 coadd，g/r/i 最大差分别 `3.06469e-6`、`4.84912e-6`、`5.19870e-6` nanomaggies/pixel，符合已声明 float32 保存与 float64 累积数值界。

每个实际原帧另外核 128×128 target 点的独立低层 WCS 和手写四邻域插值，共 18×16,384 点，保存的 field science 与真实 source 采样最大差 `7.450580596923828e-9` nanomaggies/pixel。随后 [独立权重公式实证](experience-sdss-m51-mosaic-weight-formula-independent-2026-10-02.json) 再用绑定的三带实际 WCS、source dimensions 和独立有限 bitset，计算六字段各 16,384 点的 `min(g/r/i source stencil edge distance)+1` 及共同归一化；与实际保存 weights 的最大差每个 field 都为 0。它是几何偏好，**不是噪声、PSF、曝光或背景置信度**；原 source 已标定/扣 sky，不再扣一次，也未作背景拟合。

三档两种 family 的 PNG 都实际解码并逐像素核原 once-mapped master 的 premultiplied box crop，六图精确一致；主图 contribution 分解还原 RGB 也完全一致。CRPIX、居中 crop、整数因子和 TAN field 的 atan 定义已核，三级 corner/center 世界坐标与 master 对应位置差为 0。这个 crop/像素结果不能认证源天体绝对位置或自然色。真实 old 201 资产、原 single-field 22 输出和六项保留修改的字节身份均保持。

main [review.json](../../../../output/sdss-m51-mosaic-independent-1002-r1/review.json) SHA `3cba4e774816b02a0e16e6dc8fcfc2dfb18917b8a93068aff8ca8aa68ee4a66a`。为补窄范围权重检查，当前脚本后来新增 helper；原 main 实际执行的 SHA `8ac5e4c6ea62d80c0f18b880bbfb373f38bab0fdd639163309dfecc08052f985` 已按绑定精确恢复成 [snapshot](../../../../output/sdss-m51-mosaic-gpu-encoding-independent-1002-r1/main-reviewed-script.py.txt)，恢复前核 SHA 一致，不把后来脚本追溯冒充旧执行。权重补充 JSON SHA `6062add86ac43a27274c234e83adfcbbdc3dc49528b4d3266e42056193fd6871`。

## 真实 partial 错误与修复

原 multi-field owner `cd5cff37ba5179bb5003b66c6f75d3d2fa113400fd1fdb04d581b7bebfeb7a2f` 的 aggregate `ProjectedBand.data` 只在共同 field-gri 可取处有值，但两个 masks 用独立 band union。两个 field 分别在同处缺 g/缺 i 时，每个 band 都有独立输入，那里却没有任何一个 field 提供完整颜色；coadd 为 NaN 而 mask 仍为 true，破坏原 `ProjectedBand` 的数据可取合同。

独立控制例在 padded source/真实 TAN 坐标上复现：32² 中有 737 coherent 像素，三个 band 各有 **287 个 mask=true/data=NaN** 像素。实际 [before JSON](experience-sdss-m51-mosaic-partial-before-2026-10-02.json) 和 [原 owner snapshot](experience-sdss-m51-mosaic-partial-before-2026-10-02.py.txt) 保留。修后用完全同一输入核 [after JSON](experience-sdss-m51-mosaic-partial-after-2026-10-02.json)：三者 mismatch 均为 **0**，缺共同颜色中心的 NaN 与 false mask 一致，独立 band unions 仍全 32²，已知 g/i 仍在各 field sidecars；`require_complete` 继续拒绝 partial。新 `BandSourceUnion` 明确没有 coadd measurement，防止把独立输入 union 重新当 aggregate finite-data mask。

另有 bounded mutation 仅在内存把共同 weight 乘 `g>0`：原有效黑/负测量的完整小路径通过，变异因失去共同供给被检测。这证明真实黑/负值不会被显示亮度条件悄悄当缺测；变异未写入生产或原成品。

## 软件 GPU 与编码实物

独立 [GPU/encoding checks](../scripts/experience-sdss-m51-mosaic-gpu-encoding-independent-2026-10-02.py) 核当前 84 renderer source hashes、实际 production bundle、13 inputs、28 新 draw 场景/56 artifacts 和 18 byte-bound 复用场景/36 旧 artifacts。复用记录的时刻、完整相机、模式、FOV、variant 及原实际 PNG/RGBA 身份都保持；旧基线没有重绘。46 PNG 实际 RGBA 与 GPU readPixels 倒行逐字节相同，36 RGB 比较指标也独立从实际数组重算。GL/逻辑纹理释放为 0、M51 picking 保持，OBSERVATION 无光学 draw/upload/source marker。counterfactual baseline 返回 true 的 `sceneReportedPaintedImage` 仍**不是实际光学来源信用**。

[GPU result](../../../../output/playwright/cloud-sky-sdss-mosaic-candidate-1002-r2/result.json) SHA `23669070f57b0794eec6589907d3e7fb30be1da53435d75501ab806a3fdf2ae3`；独立 [review](../../../../output/sdss-m51-mosaic-gpu-encoding-independent-1002-r1/review.json) SHA `891effb225d1592ea91f5dec66f4ad9015278ed8d8a71860ccc7b71b909eda3c`。它绕过正式 publication/discovery/download/decode/来源页面，按 task 描述符注入预解码图，并调整候选 blend；静态逻辑 texture peak 2,080,768B **不是 native/decoded/OS、整场峰值或帧时验收**。

18 个既有编码试验的 input/output bytes/SHA、512² decode、RGBA/alpha/premultiplied 误差及透明保留都独立重算吻合；没有新增参数矩阵。完整 availability family 原为 949,846B，opaque lossless RGB PNG 738,236B 是实际 RGBA 完全一致；JPEG88 72,880B、palette256 72,472B 都有显示损失（family 最大 byte 差分别58/29），未采用。contribution 原 2,069,743B，lossless optimized 1,983,016B；palette 452,700B 却有最大 alpha 差59，不凭小体积认可。两 family 互斥，不能求和当实际用户下载；57,308,910B raw FITS 与约709MB含debug arrays离线目录也不是客户端下载。离线 Windows 进程约1.43GB peak working set，只证明这个离线过程，不证明4GB staging或16GB/200DAU服务容量。

## 实际视觉与仍未完成的质量

实际查看了 r2 概览 PNG，以及 byte-identical 三档初代 PNG；完整北侧/伴星系现在在概览中出现，旧单field缺片的明显斜切不再由这份母图造成。默认固定 Lupton 仍偏暗棕，星点多有绿/橙，细层清晰度、源 detector/PSF/噪声、准确星点/跨 run 配准和颜色质量未验。主图的完整有限范围不能说明质量合格。

另外实际看 [day signal-over](../../../../output/playwright/cloud-sky-sdss-mosaic-candidate-1002-r2/day-overview-signal-over.png) 与 [night medium additive](../../../../output/playwright/cloud-sky-sdss-mosaic-candidate-1002-r2/night-medium-available-add.png)。后者仍能看到有限纹理角/偏亮棕核心；additive 的“不变暗”来自 blend 数学，不是画质证明。细档当前 trial 同时提交 coarse+fine：直接 additive 会重复加同母图，亮度 alpha 的 signal-over 也会让细层下面的 coarse 继续贡献，不等于一次 master 像素替代。需要在下一共同 transfer/明亮背景/粗细替代方案中处理，**不能把这两个未采用方案直接作为最终无接缝/层级一致成果**。原生产 JPEG/source-over 细层合同未被本试验改变。

r2 九个有交集 field pairs 中，五个跨 run pair 的 enlarged catalog ellipse 外样本为0；这些统计的 samples=0、其余统计值=null，不能当作零残差。其它外部区域也没有 companion/star/deep-wing mask。其 measured residual 只用于定位，不能据此自动拟合/扣背景。参考 [asTrans 限定诊断](experience-sdss-astrans-approximation-audit-2026-10-02.md) 的17×13假设格点结果仍不采用原点或颜色，也不推出全像素最大/绝对精度。完整 asTrans/DCR/fpM、真实跨 run/PSF/background、后续显示/编码与新版 contract/旧offer兼容、native完整旅程/资源/出口/成本及最终审查义务都保持。Goal 未完成。
