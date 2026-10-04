# M82 SDSS 原始 r 帧与完整光学范围供应

**实际八帧已取得，六帧对当前OV全域有贡献；r四邻有限支持覆盖全网格，不是gri/质量通过。** 本代只新增云观星task及源缓存/几何证据、进度/Context；小程序、worker和其他业务逻辑未改，六保护和原服务/watch保原。未改旧图/科学/recipe/registry，不重取JPEG/HiPS/旧查询，不加工旧母图，不发布部署。

## 实际源与责任复用

原M82 CAS回执/raw字段319B与r75库存精确；请求前再次含ignored核八r文件均无缓存。沿原SDSS官方SAS路径、现有 `sdss_corrected_frame.read_cached_frame` 和有界源IO机制，八源各一次GET/200，无redirect/retry，默认CA/hostname TLS、25秒socket/35秒child、16MiB compressed/32MiB decompressed界。实际新压缩科学源总 **27,078,674B**；原完整float32 1489×2048、nMgy/pixel/已校准已扣sky、CALIB/SKY/asTrans identity及WCS按实际header准入。完整数组、真实黑/负值/非finite语义保原；结构合格不作fpM/伪影/噪声/质量证明。

`output/sdss-m82-r-footprint-1004-r1/` 保留原八FITS.bz2、每项请求/reader回执、acquisition-plan/progress、executed-script和result。逐项before/after hash含原r75的345源/六保护/3499证据精确；raw文件不修改，不补缺源为零。

## 整网格实际覆盖

复用 `target_tan`/`project_frame_window` 及共享四邻stencil，M82当前OV中心、0.2275555556°、2048²全域，128行有界分块。每field保存压缩packbits footprint/finite-neighbor masks及原输入、reader/target绑定；union另存contributors。不是只核原25元数据位置，不生成RGB或改科学值。

| rerun301/run/camcol/field | r全域有限四邻像素 | 中央64²有限四邻 |
|---|---:|---:|
|4264/5/260|284,077|0|
|4264/5/261|2,023,192|4,096|
|4264/5/262|983,616|0|
|4264/5/263|0|0|
|4294/5/237|0|0|
|4294/6/236|785,220|0|
|4294/6/237|880,464|0|
|4294/6/238|22,459|0|

union footprint及finite-stencil均4,194,304/4,194,304；最大实际field contributors3。中央64²只4264/5/261供给，不能从多RUN元数据或整图有效率推中心有独立备选/未饱和。两个0源的实际r四邻footprint也为0，故暂不取其g/i；若实际新波段/边界暴露缺口须按真实需求追加，不能把六帧当恒定上限。正/负强度不影响finite支持，r全域供应不外推g/i或joint色彩/完整科学有效性。

## 全地址根读回

新root reader不调用producer reader/reprojection/stencil：直接bz2→FITS原HDU0/asTrans身份→实际native WCS，独立FITS origin1反行及四原数组地址。八帧共33,554,432目标位置；每点geometry/四邻finite、中央数量、完整union及contributor_count与保存mask逐位相同。原raw/hash支持文件精确，零网络/源改写；见 `output/sdss-m82-r-footprint-readback-1004-r1/result.json`/executed-reader。FITS RADECSYS deprecated与DATE→MJD warnings保持，不混同科学缺测。

此为root自审，不是独立审查。使用当前corrected frame线性TAN近似，完整asTrans/DCR保留而未应用；不能声称绝对配准/PSF/图质通过，也不因此重跑旧无变化的M51匹配矩阵。

## 下一共同消费者与仍开放结果

按唯一PLAN，仅一次补六个真实参与身份的g/i（12源），r八原缓存与全部资格输出直接复用。各新波段仍按真实WCS/finite/每带union和共同field支持核，不从r平移假设gri完整；同时沿现有fpM/CAS/noise/asTrans owner核实际flags、亮核、覆盖、noise资格及共同处理输入，避免先滤/抹亮再找依据。数据驱动共享single/mosaic/partial → 共同质量/LOD/来源信用与完整出版链，过全图质量才普通采用。M82 W3暗区、SDSS亮色核心/背景/弱结构/配准、WXML/手机/新Moon、strict Back、static真实引用物理保留、全200DAU成本/混合容量和独审等原33义务继续保留；Goal active、无预算、未完成。
