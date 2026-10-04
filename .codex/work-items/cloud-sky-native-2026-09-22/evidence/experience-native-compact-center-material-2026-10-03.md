# 目录空字段的真实紧凑源材料与中心覆盖纠正

本轮沿当前完整候选质量的PSF/弱结构材料缺口；全部使用既有18帧中的6帧、2份psField、6份fpM、原CAS模型和当前冻结候选。无科学下载/目录重查、旧45fit或旧17×17/15孔径/九边/跨run矩阵重跑；未改科学、coadd/权重、recipe、alpha、任何旧publication或普通registry。Goal active无预算；本轮只增task diagnostics，不改生产源码/依赖或服务watch，六保护保持。

## 原查询空表不是原生缺源，编号也不是中心覆盖

[原目录](experience-sdss-measured-star-registration-2026-10-03.md)在3699/100与3716/117未供应记录，放开clean/nChild的补查询也为空；原Field score0/photoStatus3/TOO_LONG风险早已由[Field独审](experience-sdss-field-quality-independent-review-2026-10-02.md)记录，**不是本轮重新发现**，未重查询。仅凭表空不认证原生无点源。

首轮[原生检测任务](../scripts/experience-center-native-detections-2026-10-03.py)错误假设两帧都包含M51中心，3699/100三带完成后在3716/117 reference几何断言失败。[r1失败](../../../../output/center-native-detections-1003-r1/failed.json)、原input/code及部分NPZ保存；失败前候选metadata尚未逐带持久化，故不把这些部分cut当完整位置绑定/资格完成，未回填或删除。r2参考**实际native frame中心**初始化宽度，并逐带先写完整位置/cut/noise/flag报告，再完成共同对应。

实际M51中心映到3699/100 g/r/i的native坐标约[1710.280,783.263]/[1708.809,771.023]/[1710.646,773.471]，均在2048×1489原生帧内；3716/117约[-221.752,1023.238]/[-222.972,1010.463]/[-220.108,1013.562]，均在帧外。它参与目标的有限区域，但**不供应M51中心**。此前“两个中心字段”的编号简称不能用于覆盖/中心PSF结论；旧snapshot/科学/数据/已核贡献保持。这是真实逐带primary-TAN声明下的几何结果，不是外部绝对天体测量认证。

## 成熟检测与真实材料

复用隔离Photutils3.0.0/SciPy1.17.1与原NumPy/Astropy，不再次安装/改产品依赖。[fit_fwhm](https://photutils.readthedocs.io/en/stable/api/photutils.psf.fit_fwhm.html)只拟空间PSF kernel中心11²的近似圆Gaussian，得到检测初始化宽度；不是实测FWHM、PSFmatching目标或全场常宽认证。[DAOStarFinder](https://photutils.readthedocs.io/en/stable/api/photutils.detection.DAOStarFinder.html)沿原已扣sky的signed科学，以5倍逐像素conditional native RMS、默认shape条件和内部kernel threshold scaling寻找候选，`n_brightest=None`保全部结果，无数量上限。门槛/候选不是校准置信或完整率；没有根据RMS再次扣sky/改变gain。

variance由现有noise owner每128原生行有界计算；actual INTERP/SATUR/GHOST/CR和未知模型拒绝。完整检测kernel footprint须原生finite/positive conditional variance/flags合格，用binary erosion拒不完整支持及图边；检测workbuffer的不可用值置零仅供库内部运算，不能被候选kernel跨入，不形成科学/透明度填补。每个目标内cut保存41²原始signed science/variance/flags/精确native bounds和分数坐标；共同候选还要求radius12原生全支持及g/i与r同目标网格2.5pix内双向唯一对应。该窗口只是诊断约1角秒范围，不是DCR/配准验收。

[r2任务](../scripts/experience-center-native-detections-r2-2026-10-03.py)实际六带检测量712/531/352与416/449/425；目标内保存683/488/304与319/325/290；radius12合格659/466/273与237/275/287。共同275组（184/91）是真实image-selected compact候选，**不是275恒星/独立曝光或“中心PSF通过”**，含星系结/混叠/伪影的可能性保留。[完整result](../../../../output/center-native-detections-1003-r2/result.json) 3,880,338B，SHA `49077d1c2a10c2be4e69ae823c2f1d2370fc1758510153cd93f5bbe642456a6b`；18.389秒本机cache读取/检测/保存，不作服务/手机成本。actual源/当前3PNG/六保护before-after exact。known Gaussian detector初始化/位置算术控制成立，不是生成天体。

## 当前DETAIL实际对应

以**实际当前DETAIL bounds[768,768,1280,1280]**消费全部87组（3699/100为81、3716/117为6），没有亮度排序删样或数量cap。只读已保存cut和两psField，未重读6帧/检测/重投影。[既有成熟中心helper](../scripts/experience-sdss-imagepsf-centering-2026-10-03.py)原样复用ImagePSF+Planar2D/TRF；每个新实际坐标reconstruct完整signed51kernel，radius12 conditional weights，4参数linear初始化后6参数局部拟合，中心±0.5/native cell、max100评估。诊断plane/中心不会作用于科学、星系背景或WCS。

[实际消费](../scripts/experience-detail-native-model-support-2026-10-03.py)产生261正常有限拟合，但43个center-bound状态保留；实际χ²/dof的g/r/i median18.092/13.762/7.310，max472.077/914.082/959.119。这是含未知blend/source/PSF/SKY/systematic/centroid误差的条件描述，不是拒整个native帧的校准检验，也不以收敛冒真值。5.074秒本机后续诊断；[result](../../../../output/detail-native-model-support-1003-r1/result.json) 470,170B，SHA `9dcbd5be6eb8e893ad40ade2fbd710110ba08eaf61769177373af7ab24971a42`。

实际已查看6张分页图中的第[1](../../../../output/detail-native-model-support-1003-r1/actual-native-model-residuals-1.png)、[3](../../../../output/detail-native-model-support-1003-r1/actual-native-model-residuals-3.png)、[6](../../../../output/detail-native-model-support-1003-r1/actual-native-model-residuals-6.png)，native/model/residual和各带分别标注。若干较孤立轮廓 broadly对应，但许多cut有真实extended/混叠和非线性背景，残差结构明显，不能把全部候选用于经验starPSF或原地反卷积。[root self review](../../../../output/detail-native-model-support-1003-r1/readback-r2/visual-self-review.json)明确只查看39/87行，非全样本独审/质量通过。

[另一算术路径读回](../scripts/readback-detail-native-material-r2-2026-10-03.py)不导入producer/ImagePSF/helper、不重跑detector/optimizer/frame；逐cut核位置/support/noise/四类flags、row-first spline模板/模型/residual、normal-equation初始化和条件统计。261保存结果通过，模型最大差5.684e-14，wrong-kernel-axis最大模型差6.119，缺support guard控制拒未知邻居。当前87个fit域实际negative计数0，**不声称本数据验证了负值场景**；原saved cut保浮点类型/原值。首轮readback套旧5e-17绝对常数，一处两轴运算序差5.551e-17失败；[原failure](../../../../output/detail-native-model-support-1003-r1/readback/failed.json)保持。r2据float64 epsilon及实际signed normalized kernel幅值给8倍roundoff bound，全部最大模板差8.327e-17；不改输入/model或放宽科学/质量oracle。[r2结果](../../../../output/detail-native-model-support-1003-r1/readback-r2/result.json) SHA `8bea7513f58227b09c6c5efd83237533741054a3f14acb7122561ca69402a3cc`；root另一算术路径非独立人员审查。

## 新工作盘与下一依赖

只核三处task-owned新目录（包括r1失败部分）；[本机文件分配记录](../../../../output/detail-native-model-support-1003-r1/readback-r2/owned-output-allocation-r2.json)：

| 目录 | 文件数 | logical B | Windows allocation B |
| --- | --- | --- | --- |
| center-native-detections-1003-r1 | 1693 | 49453560 | 54394976 |
| center-native-detections-1003-r2 | 2420 | 79981727 | 86794240 |
| detail-native-model-support-1003-r1 | 278 | 15486395 | 15945984 |

初轮ledger误把GetCompressedFileSizeW在未压缩文件的length返回值标作allocation；原记录保留但不采用其分配列。r2通过[实际FileStandardInfo.AllocationSize](../scripts/measure-native-material-allocation-2026-10-03.py)核分配，读取attributes、逐文件关闭handle，无删除或修改。r2含旧ledger/self-review，先于自身写入，范围和时间明确；不计旧源、全tool目录/完整库存，不当Linux180GB或200DAU容量、生产预算。失败部分仅development保留，无生产引用/未清理；不能以当前成功目录代全部本轮磁盘成本。

**当前决定/唯一下一依赖：** 中心可用原生image材料不再只是“未供应目录”，但不能从这些混合候选直接做全图PSFmatching。下一项先沿既有真实source stencil/WCS/几何权重，核**原生空间模型经过实际重采样及coadd后的目标网格响应**的小路径，区别单native模型、单扫描/重复native贡献、共同目标模型和实际保存coadd；全场matching/经验star分类、扩展DCR/绝对配准/未包含误差仍不足。不得重跑当前275检测/261fit、旧目录/45fit/孔径/九边/供应/861秒母图以循环补证。已有原source/模型与成熟处理责任优先，不凭样本/conditional拟合造星或取固定σ。完整背景/绿色晕圈/弱结构/覆盖仍需真实支持与显示边界处理，任何新加工须作用于当前完整候选并保original science/alpha/frozen recipe和失败保原。

质量/来源权利/加工说明/独审前不普通采用或新正式出版；本代旧processing packet不倒填新材料。HST矩形FAILED、M82输入不足、DevTools FAILED_DEVTOOLS、Android/iOS/新版月面/实际page Back、版本保留与200DAU混合成本/容量保持原未完成状态。
