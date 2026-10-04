# Prepared完整照片范围与单源显示背景小样

2026-10-04。仅云观星任务试验、证据及所属文档；本代生产源码、普通registry、原图/母图/出版pins未改。不核对落后的设计稿。Goal仍active、无预算，全部原质量、交互、来源、端云及设备义务保持。本文不是采用或最终验收。

## 实际供给与成熟资源复用

复用两张已下载的NOIRLab **4k出版照片**及原AVM，不冒称8315/8000像素参考原文件。各JPEG仅为这一新增范围检查解码一次，无新增源请求、RGB重投影或出版写入。[执行收据](../../../../output/prepared-native-extent-1004-r1/result.json)保原RGB身份、名义TAN、每边257个点及四原像素邻居条件。当前13.653333′方形之外，采样周界支持上界为M82 **15.489136735′**、M51 **25.142328499′**，分别先触及照片右边/南边；这不是安全无伪影范围、完整科学有效性、绝对配准或需求上限。

[独立公式读回](../../../../output/prepared-native-extent-readback-1004-r1/result.json)以笛卡尔TAN基底验证原mapper，最大像素差约9.64e-11/1.92e-10；放大到上界的1.000001倍出现不支持邻居。两张完整范围预览及24个原像素129²窗、原值与明确标记的8倍诊断增益均已查看。M51北侧绿色晕和外围拼接图案不能直接算空背景；M82周围有星点、渐变和可能弱结构。后续核官方页面发现正文称KPNO 0.9m/Mosaic camera，滤镜表称WIYN 0.9-meter/Mosaic I；因此撤销本阶段曾将旧“KPNO/WIYN 0.9m”判为错误的过强措辞，保两处原文差异，不混成M51的WIYN 3.5m ODI。旧机器记录和publication pins未改；详[后续同照片实际输入](experience-noirlab-m82-large-detail-2026-10-04.md)。

也核了成熟预处理纹理候选：官方Stellarium textures.json中的M51/M82均指向Peter Vasey/Plover Hill Observatory，作者Gallery要求复制前获得permission；CREDITS的默认GPL说明及列名没有消除这两图片具体许可链的疑问。[权利检查收据](prepared-texture-rights-check-2026-10-04.json)记录官方资源、作者页和实际访问限制。当前不复制两纹理、不外联；不泛化成所有Stellarium数据均排除，也不恢复混合清单中的DSS。

## 一次有依据的M82背景估计

使用已缓存Photutils 3.0.0（BSD-3-Clause）的Background2D/MedianBackground，不重造估计库、不扫描参数。复用原NOIRLab 2048²母图；已知Hubble同名义TAN footprint只作保守的**估计排除guard**，不混入其RGB，不宣称覆盖全部弱喷流。亮源检测与膨胀再排除其它星点。估计mask与原几何alpha、科学未知分开；不feather、不生成新天体细节。新的原像素边窗plain affine留出有4/12通道case差于常数，未采用通用平面。

[执行收据](../../../../output/prepared-source-masked-background-1004-r1/result.json)保单次参数、64格/每通道54个非空格、被排除格的插值、CPU/墙时及完整输出身份。每RGB通道的编码显示背景仅约5.08–6.06 / 7.65–8.00 / 8.97–9.33 byte；这不是定标天空流量。原sRGB转线性、减去线性化的显示背景估计、仅显示负值截零后重新编码，同一派生母图出三级。截零计数明确保存，不能当科学弱信号无损证明。

三个试验PNG合 **851488B**；原三个PNG合848405B。总览边缘中位由约[3–6,8–9,10–12]降至[0,0–1,1–2]，主体和两已知风结构锚点仍可见，但细图仍软、完整弱结构保存未验证。已查看三个完整512²原图/估计对照、两个结构窗和mask角色图。[完整RGB公式/alpha/三级读回](../../../../output/prepared-display-background-readback-1004-r1/result.json)精确；没有第二次估计、原JPEG解码或源重投影。原成品和原Prepared v1身份保持，派生显示图尚无适用出版契约，不能冒原“未改编码RGB”v1。

## 当前Scene的实际结果与限制

使用当前完整Scene/GPU源码，任务surface显式替换派生PNG，原publication仅供名义几何；派生图的最终来源完成状态刻意保持UNKNOWN，不假冒原出版归因。[隔离三级昼/暮/夜执行](../../../../output/playwright/cloud-sky-prepared-display-background-1004-r1/result.json)产生9个新帧，旧OV参考/baseline复用，只补6个窄档baseline。[GL/PNG与解析读回](../../../../output/prepared-display-background-readback-1004-r1/result.json)精确或相差最多1byte；完整9图已查看。总览暗底明显改善，夜间仍有微弱方形边界，不能升级旧矩形FAILED。隔离MED/DETAIL不带粗层，真实照片在裁片边缘延续，不能把其切断直接称正常路径失败。

因此只补三个新夜间条件，断言当前选档策略，实际带相邻粗层并向北移相机：[执行](../../../../output/playwright/cloud-sky-prepared-display-background-pairs-1004-r1/result.json)、[保存读回](../../../../output/prepared-display-background-pairs-readback-1004-r1/result.json)。OV .25°；MED .10°/北移.04°并带OV；DETAIL .05°/北移.02°并带MED。三个条件均有匹配原图和无目标baseline。每帧PNG精确绑定GL，解析p99/最大误差1byte，使用旧图的反事实误差更大。MED/DETAIL细图几何220350像素、实际粗层补108810像素；无几何外部像素处明确NOT_APPLICABLE。7576个细/粗边界采样的p90最大通道差约1.605/0.896byte，含真实星点/结构，不是仪器接缝或质量通过判定。

三个完整匹配对照已查看：暗底改善持续，粗层填补细裁片外侧，细节偏软仍存在。所有实际帧texture objects创建/删除一致、最终live为0；不是完整Hook/page、来源Back、任意更大偏移下三级保留、WEAPP或物理内存验收。所有观察是软件GL开发验证，自审不是独立审查。

## 保留、成本与唯一后续

本代七组输出保留逻辑 **180009380B**，含24原像素窗、Float64背景约100.66MB、派生母图、PNG/GL与诊断，不是生产库存、物理分配、2000GB出流量或180GB全机余量。两场Scene各解码原/派生合6张PNG，不能冒生产暖缓存峰；本代CPU/墙时也不覆盖完整批量异常率或工程成本。源请求0、源RGB范围检查解码2次、源重投影/出版写入0，没有下发、付费设施或设备推送。

本阶段当时的后续由PLAN拥有、现已沿[较大同源实测](experience-noirlab-m82-large-detail-2026-10-04.md)执行；当前唯一下一只看[PLAN顶部](../PLAN.md)。当时4k M82 DETAIL约232原像素跨512输出与实际软细节形成具体缺口。先盘点同一官方照片的较高分辨率缓存；不足才一次取得页面已有Large JPEG（页面标8.8MB）并核真实尺寸、ICC/AVM/哈希/有效细节，沿同源共享小样比较，不重新下载4k或把参考8315×4642当已验证下载尺寸。M51北侧弱晕/拼接与跨源修正不盲套本M82估计；处理版本、完整来源/发布与实际page通过前保持未采用。未知、旧失败、WXML、独审、手机和完整容量不被这些局部结果覆盖。
