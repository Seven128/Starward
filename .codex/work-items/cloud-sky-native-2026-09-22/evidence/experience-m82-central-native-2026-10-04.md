# M82中央真实原帧候选与PSF诊断（2026-10-04，r87）

本代仅云观星任务脚本、相关文档/Context，无生产或其他业务逻辑修改。中央目录缺行不再被当成唯一图像供应前置：直接原帧有实际候选和诊断，但仍非确定恒星、完整PSF品质或整图配准验收。科学、当前候选与三级输出不动；普通Prepared空未采用。

## 成熟机制与原供应

复用[既有中央native检测责任](../scripts/experience-center-native-detections-r2-2026-10-03.py)的缓存Photutils3 DAOStarFinder/fit_fwhm、原帧条件variance、完整detector-footprint准入和原PSF/Astropy局部诊断；不执行旧M51路径。新真实消费者使用M82的4264/5/261三原帧、缓存fpM flags/CALIB-SKY/camera和psField；PS_ID MATCH准入保，flags不重建。一个实际目标中心PSF core的Gaussian宽度仅初始化detector，不冒实测seeing或匹配目标。

三带原native variance按128行取得，用5×conditional RMS、DAO默认形态范围、不设n_brightest。完整检测核必须native有效；不可用仅在detector工作buffer表示，不改变科学数组。目录/原Science/fullcandidate、负值/coverage/alpha/WCS/recipe保持，未作额外sky扣除、源下载或普通采用。

| 实际band | detector返回 | 目标内保存cut | radius12 native合格 |
| --- | ---: | ---: | ---: |
| g | 252 | 212 | 172 |
| r | 291 | 245 | 242 |
| i | 404 | 336 | 329 |

全部793目标cut及全部detector记录（含目标外/边界）保留；该策略不提供完备率或false-discovery置信，不把数量作为需求上限。半径12 fully-native有效、同field reciprocal unique ≤2.5 target像素形成114 provisional compact image triplets。三r支持缺口、128没有唯一另一带对应均保，不假造匹配。

## 实际PSF结果与读回

[完整新fit阶段r2](../../../../output/sdss-m82-central-native-1004-r2/result.json) SHA256 `8bb567d744a9c4475efca0a4ddf66f0c4d5429e14d25e127b9fe8f23de2c8816`：直接复用已存detector/variance/cuts，没有detector或variance重跑；位置相关signed PSF、缓存ImagePSF/Astropy局部幅度/plane/centroid诊断保持±.5原帧像素中心、max100。局部plane不从科学、星系或候选扣除。

342逐带阶段含339收敛条件fit和3非正诊断幅度（同一组每带一项），非正未强迫拟合。g/r/i分别17/19/15触中心bounds，conditional chi最大672.7696/2374.9416/2329.5866。收敛、候选形态或较小chi不替代确证恒星/PSF品质；系统、模型、sky、混叠等误差不在条件pixel variance内。

[直接原FITS与保存读回r2](../../../../output/sdss-m82-central-native-readback-1004-r2/result.json) SHA256 `0d7bb003adaf2d6fe40cffa8ded6ce33cdebd5ddb99ca1767b8d2398a5316245`：所有793 native raw/flags/原CALIB-SKY variance、位置/资格精确；完整reciprocal对应graph独立重建一致。直接原basis系数与位置多项式、独立row-first cubic template、normal equations、339保存model/residual/statistics及参数一致，3非正和全部bounds状态保持。转置kernel反例最大模型delta14.5017888，实际错误可检出。无detector或fit重跑。

[完整十页实际对照](../../../../output/sdss-m82-central-native-1004-r2/actual-central-profiles-1.png)至第10页均已查看（完整文件清单在result）：有孤立紧致剖面、近邻、大片星系结构、非正幅度和强coherent残差。所有候选保provisional，不按好看的图删除失败或手工mask；并不声明114个恒星、中央绝对位置、target/coadd/非线性adaptive PSF或全图质量通过。

## 本代任务失败与恢复

r1已完成三detector/793cut，第二组fit后因反复独占写同名fit-progress.json失败，原输出/failed/log/archive保留。两个部分triplet的六fit文件有kernel/model但没有完整参数和optimizer状态，保持该旧执行未验；r2直接复用完整detector/variance数据，新的完整fit阶段必要重取这两个部分triplet，并将每项row独占journal、参数写入NPZ。不倒填旧运行，也不重复detector/native variance/整图加工。

reader r1把轴顺序不同的cubic浮点路径统一要求绝对5e-17，真实一个样本差5.551115123125783e-17致失败保留。r2仅用实际normalized kernel、flux及plane运算量推导16×machine-epsilon舍入界；完整template最大差5.55e-17、model最大差4.2632564e-14，在对应界内。不是科学/像素/PSF质量容差，无候选或fit改变。

## 资源、边界与继续责任

[本机分配与观察](../../../../output/sdss-m82-central-native-readback-1004-r2/allocation-and-observation.json)：r2完整fit消费者21.211711s/CPU20.96875，离线peak working set228069376B/pagefile996986880B。r1detector阶段总时/峰及reader峰未测，终止进程不能从文件时间补出；不把r2峰冒两阶段总峰或运行时验收。

测量前1281新输出文件logical48174162B、reported unique allocation51093808B，1281独立ID/maxlink1、前后稳定。包括失败/当前native与fit/读回，排除测量/docs/checkpoint、旧源/候选/工具、文件系统内部/snapshot/Linux保留；不是180GB余量、手机/服务内存或全小程序200DAU混合容量。未删除资源。

原r86的390 currentSources、4321旧证据和六设置/outbox保护逐项保持；原工作区/分支/HEAD、服务24040/watch18132启时保持，staging0。后续Sky docs/capture由r87连续性读回单独核。没有其他业务/生产源码、获取或目录请求、native flags重建、science/coadd/recipe或完整/内部/外围过滤、服务重启、commit/push、采购云部署或发布。

唯一下一依赖在PLAN：从真实native PSF经原science采样/common几何coadd获得必要位置的target响应，再沿原raw/cohort/native系数及真实radii/保护/恢复分支核保存条件下显示的局部响应。科学线性unit response不冒当前非线性adaptive全局PSF；不能单核、整图shift或额外sky猜测。实际形态/残差与完整背景矩形/条带、弱结构、覆盖和三级图质及权利/完整出版链仍待闭合。

原33义务、strictBack/WXML Canvas失败、Android/iOS与newMoon手机未验、W3暗区、静态出口/物理retention/端云成本容量和独审缺口保；本代读回为自审。Goal active无预算，未完成。
