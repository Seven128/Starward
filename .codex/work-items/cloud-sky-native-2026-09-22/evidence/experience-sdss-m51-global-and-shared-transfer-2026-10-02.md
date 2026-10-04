# 同一 M51 科学母图：全局 transfer 小试与共用处理能力

2026-10-02，`sphere_grid`，唯一 PLAN 公共影像质量责任。只复用已缓存 r2 六字段 coherent science g/r/i 与 joint mask，没有再读 raw frame/WCS 重投影、下载、生成天体细节、更新旧图/合同/运行时/Context 或按天体/档位调参数。先独立核三条实际显示小试，随后按 root 授权将处理能力放到单字段/多字段共享 owner。**默认仍5/Q8，新增能力不等于采用新色彩、格式或高清修复。**

## 有界方案及真实输入

官方 [Astropy RGB guide](https://docs.astropy.org/en/stable/visualization/rgb.html)给出共享强度的 Lupton RGB 和 SDSS 固定 `.5/Q10` 示例；[LuptonAsinhZscaleStretch](https://docs.astropy.org/en/stable/api/astropy.visualization.LuptonAsinhZscaleStretch.html)从共同强度求 z2−z1，[ZScaleInterval](https://docs.astropy.org/en/stable/api/astropy.visualization.ZScaleInterval.html)公开统计默认参数。实际本机 Astropy8.0.1 的实现已读并在试验输出绑定，支持这些 API，无新依赖安装。没有把示例照片/参数当本项目色彩验收。

只有三个候选：既有 fixed5/Q8、文档 fixed.5/Q10、whole-master LuptonAsinhZscale/Q8。i/r/g→R/G/B、ManualInterval vmin0 均一致；没有 pedestal/第二次天空扣除/通道白平衡、PSF matching、去卷积或锐化。共同 science 保 zero/negative；非正显示强度/负通道在显示层裁零，不能据此改 science validity。

真实输入为 `output/sdss-m51-gri-mosaic-candidate-1002-r2/`。逐文件 bytes/SHA、dtype/shape 与原 candidate metadata核验；原 `.npy` 三带各16,777,344B、joint4,194,432B。旧完整 r2 输出 inventory 前后保持，source receipts/source WCS/field quality 的未知边界继续归前轮科学输入证据。r2 g/r/i coadd 保 negative 样本681,586/650,374/707,834，真实 zero 本代各0；没有把没有出现的 zero 宣称真实测量验证，另用有意义边界 fixture 保其语义。

独立小试输出 `output/sdss-m51-global-transfer-1002/`：

- [task script](../scripts/experience-sdss-m51-global-transfer-2026-10-02.py) SHA `1dc40d80d86f4afa8e2e31da37023b5e99e9be9767137360656b64e11fcadab2`。
- `result.json` SHA `3878ac009819d182c5399cc4f8dca8ece460b9aa15c068d4b46bbcb015e0c068`；`binding.json` SHA `987f721baa5ca962bb2382ada544435fa15fe50ba8b749ace16832008ecd735b`。
- `transfer-contact-sheet.png`为九張实际解码图的1:1 pixels，标签在画面外；三 master `.npy`、九512² PNG、实际算法源文本及统计样本另存，各候选 metadata绑定参数/算法版本、science前后身份、解码 RGBA SHA、同母图 crop/box 与原 science alpha。

whole-master 一次 float64 intensity=(i+r+g)/3，4,194,304 finite/521,465 negative，未先截负值。Astropy默认1000统计样本，以完整 finite raster stride4194取样；实际样本包含130negative，raster indices/intensity values分别另存完整bytes/SHA。透明 instrument只记录库这一次fit，不为报告或各 crop再拟合。得到 z1 **−0.027750139435132343**、z2 **0.6117458590909712**、stretch **0.6394959985261036**、Q8。vmin仍0，z1不是天空扣除或实际背景估计。

每个候选只做一次完整 RGB，再由既有 crop/box 产生三级，不重新估计颜色或曝光。三档皆512²，但范围来自同母图2048/1024/512 crop。每 PNG均实际完整解码；手算availability-premultiplied box与全部像素相符，science alpha全部保原，默认三PNG及 RGB与 r2精确相同。

## 实际观感和字节

实际查看contact sheet、九PNG中独立detail/overview：fixed.5/Q10 和 global-zscale使外围、伴星、连接结构及螺旋更容易看见；噪声/绿橙点同时增强，detail仍软。原5/Q8的暗棕不是单靠全局共同强度伸缩就能闭合的色彩问题；两较亮候选仍明显偏棕橙。没有从亮度增加推出自然色、PSF修复、真实高清、science quality或天空融合通过。

| whole-master参数 | 三档 availability PNG B | RGB全幅mean(R,G,B) | 至少一通道255的master pixels |
| --- | ---: | --- | ---: |
| fixed5/Q8 | 949,846 | 10.555 / 7.575 / 4.292 | 397 |
| fixed.5/Q10 | 1,543,530 | 44.183 / 31.556 / 18.330 | 3,553 |
| global stretch.639496/Q8 | 1,524,760 | 41.649 / 29.879 / 17.379 | 7,280 |

这些是 encoded display统计与互斥候选字节；不是物理radiance、曝光/noise confidence、PSF或已部署DAU传输。较亮编码使PNG熵/字节增长，不能在有成本/总资源义务时无视。当前root明确不采用新颜色/格式；没有扩大参数矩阵。

root另取得同六fields的真实metadata，`output/sdss-m51-field-quality-1002-r2/field-quality.json`以 r2 candidate身份绑定，CAS response509B SHA `7e16f2c30f4a613afd1125145409e9271392f2fcaa2ea8d02157867e6bbd46ff`。其中3699 g/r/i field-level psfWidth约1.47–1.665″、3716约1.026–1.177″，是noise-effective double-Gaussian等效FWHM的field元数据，不是本图逐位置实测PSF。master/detail采样约.4″/pixel，光学模糊跨多个样本完全可能；zoom超出源采样只会放大既有PSF/插值，transfer不能恢复丢失频率或制造结构。中心100/117 quality1/score0，旁场quality3/score.838–.931的具体flags/source质量解释由root继续核，不据此删帧、改weight、去卷积或白平衡，source科学质量保持未验。

独立 `mosaic_review` 输出 `output/sdss-m51-global-transfer-independent-1002-r1/review.json` SHA `c28ef967a112c39e892390d3a714cc5354055b6090bac89522273bf5b88c9c4f`。它不调用 owner RGB/pyramid/make_lupton_rgb，而以 NumPy共同强度算式逐pixel核三2048² master byte error0、九档手算box/alpha全等、默认三PNG bytes与r2一致，contact九panels也exact；另独立核实际1000样本/raster、库reference limits、科学arrays/旧90files/owner/6保留身份。它实看也确认结构与噪声一起增强、细档软/色彩未修，不采用画质。

## 新共享 owner 与失败语义

当前 `sdss_gri_tan.py` SHA **`e319aca195e75f6af03f26c2816a1fa0e1236220b2d0fc3049bb31e65d76236c`**；test SHA **`ba1e194313ba05b11650f3e98bcbcb68fccd341a840c046e6d393fb498d92fec`**。新增两个小参数类型 `FixedDisplayTransfer` 与 `WholeMasterZscaleTransfer`，single-field和mosaic都调用一个 `make_rgb_display`，得到 RGB及实际recipe。默认5/Q8 pixel行为保留，不增加运行时/UI选择或publication variant。

whole-master只用coherent可取样本拟合：joint外 science可以是未知NaN/任意有限值，它们以NaN排除统计，不能先zero-fill变成黑色供给。float64 mean含有效zero/negative。报告记录真实库版本、method/class、实际stretch/Q、request参数、完整master/finite范围、排除数、统计默认值、raster stride/样本数/实际样本及indices raw SHA，recipe只在生成母图时产生，pyramid不负责fit。

empty coherent→`sdss_display_coherent_unavailable`、joint内非有限→`sdss_display_coherent_nonfinite`、whole-master或统计sample强度constant/退化→`sdss_display_zscale_degenerate`，不静默发布猜测曝光。需要这种有效恒定场可显式用fixed：有效全黑仍保science eligibility。参数负/零/非finite/bool/过大Q或未知配置明确拒绝；fixed极小正Q被Astropy实际规范为.1，recipe区分requested与effective。显示float32强度溢出也拒绝，而不是把finite科学值编码成错误成功。

`save_candidate`要求 master.report 中的实际 transfer recipe，availability与display-contribution QC都从该recipe读取，不能照抄全局默认 `TRANSFER`。原默认descriptor仅为原task的已锁库版本兼容保留，不作为新variant的结果证据。报告与限制文字不再把所选auto方案误标为default方案。

相关19项检查通过，新增风险核包括默认旧公式精确像素、参数/实际Q、partial unknown/NaN不污染统计、有效zero/negative不变、constant/empty/nonfinite明确失败、single/mosaic相同recipe与真实QC、同母图三级不refit。两个bounded反例有实际作用：zero-fill把3840不可用黑点混入统计时，Astropy真实fit退化并抛ZeroDivisionError，而正确256可用样本fit成功；故意在detail crop再fit所得stretch与同一母图不同，同位置RGB实际变化被检测。不是只断言“调用了函数”。

新共享路径只读取冻结科学母图，输出 `output/sdss-m51-shared-transfer-1002/`，没有再重做source WCS或raw数组：

- [shared trial script](../scripts/experience-sdss-m51-shared-transfer-2026-10-02.py) SHA `6b485c4ffe788d3e9d3fced4aabb2fe199f6b7b3792f4181c05cf1d9e066720b`。
- `result.json` SHA `6eb66308827aa35c1114f66689452354616da73ee1d5320d15778763b3821d8d`；`binding.json` SHA `0ecb0c72357dc019b792436678fe7d7344e23e9bcaa783532907e0c9d2b5c784`。
- 实际3masters逐pixel与9PNG完整bytes都同已独立核小试，新QC记录所选真实recipe；科学arrays/joint、完整r2、完整原小试前后identity不变。旧r2 source hash仍绑定原7dee...生产者，本轮显示owner的e319...不追溯升级旧母图获取/重投影证据。

随后独立 [shared owner review](experience-sdss-shared-transfer-independent-review-2026-10-02.md) 已完成实际边界/消费者核：三母图独立NumPy算式0 channel difference、九PNG decoded/bytes全等与真实QC参数；partial外域NaN/无关有限值不参与fit、zero/negative保持，saved task-only NaN→0 statistical mutation被实际检测；空/非finite/degenerate及参数边界拒绝，五项相关owner回归复核通过。没有发现需要再改本owner的问题。该审查只闭合当前共用处理能力，不包含后续GPU原型或颜色采用。

下一可继续采用的是这个**一次全母图、显式recipe、science资格独立、所有层级复用**的处理责任，原默认仍保持。数值参数/颜色/格式的产品采用依赖实际Sky同场渐进/背景合成与字节/分辨率/来源质量核对，不能以能力实现替代画质决定。PSF、fpM/artifact、不同run的relative/absolute/fullasTrans配准、真实通道色彩与faint范围、有限footprint边缘/蓝底矩形、native/手机及总资源/200DAU义务仍开放。本轮没有新source质量验收、采购或部署。
