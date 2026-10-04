# M82 首次完整科学母图与质量消费者

**这批新原源的首个完整 M82 coadd 和三级科学均值候选已保存，细图恢复旧 JPEG 平坦亮块内的连续结构；完整画质未过。** 仅新增云观星任务、离线输出与对应文档/Context；本代无产品源码、其他业务逻辑、六保护、原服务/watch、原素材/科学/recipe/普通registry变更。Goal active、无预算、未完成。

## 实际源责任与完整结果

复用已缓存十八gri原帧、六psField、十八已核fpM native flags/回执与一次CAS六Field参数，无网络获取、新依赖、原native flags矩阵或旧M51矩阵重跑。`check_frame_quality` 实际十八关联全部MATCH，frame/psField/fpM的实际PS_ID相同；身份/batch不冒科学质量或已测PSF。

现有 `build_mosaic_master` 完成M82原OV 0.2275555556°/2048²母网格，同field三带共同finite供给与CCD-edge几何权重，不按亮度/flags改科学权重、没有第二次sky扣除。全4194304 coherent pixels，六field的每带支持与先前保存packed masks精确；独立带union仍与共同coadd分开，负/零/未知语义保留。实际 `WholeMasterZscaleTransfer(Q=8)` 只在完整科学母图解析一次 stretch=0.2358548697680099；三个crop由signed science先求均值、转float32，再同冻结配方显示，非逐档fit/sweep。Astropy成熟Lupton显示复用，不采用新颜色模型。

`output/sdss-m82-first-science-master-1004-r2/candidate/` 保存原coadd、joint/每field科学及支持/共同权重/供给count、冻结recipe与三个512²PNG/独立display-contribution候选。当前普通图保持实际面积alpha；display-contribution只分解已编码RGB，不能当物理辐射/源缺测或科学mask。

## 全域原噪声/flags消费者

已有 `_qualified_sources/_project_display_region` 按32行有界核完整目标：actual原样本→已保存projected science逐值匹配，coadd重构/共同权重/处理identity/实际四邻noise与flags作用成立，无滤波或替换科学。

- 全域4194304中4175346有条件native noise model已知，18958保持UNKNOWN（含SKY等资格缺口，不补零、不clamp）。
- 4108719满足当前显示处理资格；66627 noise已知但processing flags排除；总85585未qualified位置保原。
- 中央64²资格4017，恰为原4096减79个g INTERP，SATUR0不套SAT恢复；缺少其他独立RUN备选。
- 条件加权源marginal variance范围4.535036203296584e-9至0.3026447549842582 nMgy²，不是完整目标variance/独立noise/探测confidence；共享native covariance和跨field未知相关、SKY/model/processing/PSF/calibration/systematics遗漏仍必须保留。

完整bool资格与来源关联/asTrans/原WCS保存在本代，不能将processable冒科学有效覆盖或alpha。本代未应用adaptive/bilateral、PSF matching、recovery、背景修正。

## 实际保存读回与失败记录

root r2读回先完成全12582912 coadd标量、所有共同权重/供给count/原每field支持及single-contributor原值；coadd与保存float32 normalized weights重构差只容许由权重量化、最终float32和float64 sum推导的roundoff，非配准/图质像素容差。之后root PNG断言因reader均值float64而实际owner先转float32失败；原reader保留，r3只修实际consumer dtype和三级PNG读回，不重跑已完成coadd矩阵。全部三级科学均值→冻结RGB、area alpha、display-contribution字节精确，4017 central资格及原355 source/六保护/3752证据精确。root自审不是独立审查。

首次producer r1在build后保存前使用不存在的 `coherentGriFinitePixels` key失败；实际producer key `coherentGriPixels` 在r2执行前核正，r1 script/association/20.65秒build测量保留，未产生candidate/资格结果。root r1默认big unpack而原packed masks little导致失败保留；r2显式little后full coadd成功、PNG dtype失败仍保留。不得倒填为全部首轮成功或重写旧代输入。

根记录在 `output/sdss-m82-first-science-readback-1004-r1/`（packed reader失败）、r2（coadd通过/PNG失败）与r3（保存PNG与资格效果精确）；实际producer原raw science/现有素材未变。

## 全图查看与实际 astrometry 边界

实际完整新OV/MED/DETAIL均已查看，与相同中心/范围旧DETAIL JPEG对照：旧大片平坦橙色区域的新图可见连续亮核/暗纹细节。这是当代科学显示输入的可见改进，不宣称真实颜色、PSF或亮核恢复完成。新图仍暖底、绿色/红色颗粒和弥散外区；背景/接缝/弱结构、颜色、全部真实配准/完整质量开放，不能仅据某处改善就采用。

沿已执行的现有asTrans math diagnostic，只读十八真实源receipt完整primary FITS cards（非序列化celestialHeader）及原31列row；每源17×13 grid的三个颜色/三个origin声明假设分开。half-pixel/color0的实际band最大metadata变换差g0.164750″/r0.153967″/i0.124117″（约0.4″目标pixel尺度），不是测得天体位置误差/完整图最大值。没有从较小残差选原点/颜色或改CRPIX/WCS；DCR扩展源颜色、绝对/相对实测定位和PSF仍未知。`output/sdss-m82-retained-astrans-1004-r1/result.json` 是新M82输入诊断，不重跑M51旧audit，不补新source或再project母图。

## 端云成本分层

成功r2实际coadd build20.900857秒，完整quality-consumer22.824858秒；同Windows Python进程peak working set1,648,820,224B、peak pagefile2,040,082,432B。它包括原FITS/全field arrays/临时色变换与资格数据，非微信native/GPU、BFF或生产容量；生产仍静态直出，不能按每个DAU实时加工。

本代成功/失败部分/readback/asTrans共113真实文件，逻辑695,116,462B，现有Windows FileStandardInfo/独立FileId实测reported allocation695,486,408B、113 distinct identities、maxlink1，前后稳定。范围/文件表在 `output/sdss-m82-first-science-allocation-1004-r1/`；不包含该测量自身随后创建的文件/未来Context/checkpoint。不冒整个工作盘/180GB Linux可回收物理保留/源库/数据库/日志/备份或云容量；原数据保留，无删除。

## 下一唯一依赖与开放义务

仅复用已保存M82完整科学母图、十八实际源/资格/冻结配方，沿现有共享adaptive/common-noise与真实halo责任完成首个完整共同显示候选和三级异常/弱结构/背景/配准比较；未qualified/强结构/未知/中央INTERP保原。依据实际新结果决定修质量责任，不逐对象手抠、不重复旧M51过滤/PSF/矩阵/现有母图或source获取，不另建框架/调参sweep。当前TAN/asTrans比较不供绝对精度，配准和权利/credit/processing provenance及完整API→registry→静态/缓存→已绘来源Back仍须闭合后才能采用。

普通Prepared仍EMPTY/NOT_ADOPTED；W3历史12µm暗区、SDSS完整图质、strict Back、WXML Canvas、Android/iOS/newMoon、static真实引用/物理retention、全小程序200DAU混合成本容量和必要独审等原33义务保持。期望4核16GB/12Mbps/2000GB月/180GB不等于部署或容量验收。
