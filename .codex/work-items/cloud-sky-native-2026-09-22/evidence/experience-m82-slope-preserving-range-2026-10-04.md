# M82统一asinh显示范围：实际失败与下一责任（2026-10-04，r102）

本代只新增三个Sky task脚本/实际输出及四个对应任务/Context文档，没有production或其他业务逻辑修改。r101起点483源码/9269证据/六保护精确，branch/HEAD与原BFF/watch保持；不提交、推送、部署、发布、开启手机或重启工具。普通Prepared/display registry仍空，原科学/候选/recipe/publications不变。

## 一次有明确约束的变体

直接核已安装Astropy8.0.1源码与[官方映射](https://docs.astropy.org/en/stable/_modules/astropy/visualization/lupton_rgb.html)：现有Lupton在每像素maxRGB超范围时归一到1，不能保超范围同色强度。原冻结stretch=.2358548697680099/Q8不修改。本代复用同成熟`LuptonAsinhStretch`与`make_lupton_rgb`，不复制/换引擎；试验决定不冒官方推荐曝光。

由官方asinh式推导原零强度导数k=4.629539179130627，设h=asinh(.1Q)、stretch=.1Q/(k*h)，把额外压缩变成一个标量范围约束。选择满足全部输入maxRGB<=float32的1向下一个ULP的最小h；这是单个确定约束的二分求解/数值舍入边界，不是外观参数网格搜索或噪声/测光再fit。不额外假设物理线性sRGB/Rec709，科学负值与缺测保留，仅原显示语义裁负。

复用noise-v2三个已存2048²显示估计、原joint、冻结母图、原共享box means/三级及全部原20目录星点。一次约束包含完整4194304母图像素和三张262144像素实际消费；4863076个正intensity样本准入，无percentile/局部手抠/星体排除。得到Q42.660340597356985、stretch.4271468506416292、h2.157294051878597；机器相邻下界h2.157294051878595的实际peak1，上界peak.9999998807907104，严格保范围与原零斜率。不是科学校正或原冻结recipe改写。

实际控制范围的是母图(1103,1043)，g/r/i=4.895838260650635/27.252405166625977/115.46894836425781，display=SCI精确。未据此将像素认定恒星、宇宙线、错误或背景，更不能减掉真实星系。原母图81257个maxRGB>1；OV/MED/DETAIL原5080/19783/73804点均最大通道255，本变体同点恢复87/99/107个最大通道等级、三个实际输出均无maxRGB硬归一。

## 实际图质结果：拒绝作为当前交付

已实际查看三张完整512²比较图与全部20目录星体覆盖（20不是需求上限，也不覆盖DETAIL）。新图恢复核心层次，但星系主体及目录星体明显变暗，绿色结构和颗粒/条带仍在。因此拒绝作为当前交付，不因算法、范围或原样几何检查通过而采用。

OV/MED/DETAIL原meanRGB分别41.8841/30.5972/15.6593、108.0609/77.9205/39.0010、189.3806/130.9011/59.6109，变体24.2589/18.1352/9.3147、54.0564/39.4194/19.7162、87.7296/60.5046/27.2629。OV目录峰原139–255变64–162；主体范围损失明显。仅原maxRGB<=.1的有限弱值，OV153198像素有95839改变、通道最大差6；MED12172有11951改变、最大差7，DETAIL无此低值域。`.1`只是诊断切分，不是合格阈值；“零附近导数一样”不能被当作实际有限弱信号/星体保持。这一失败改变下一责任，禁止无变化重跑此曲线或先前全局C/(1+maxC)。

根saved reader没有导入试验实现、没有refit或源重加工；直接用公式逐域读完整母图、实际已存三级consumer/PNG、alpha/WCS/目录消费者，读取上下界与控制峰。在float32实际运算及float64标量算术范围分别核公式、正通道共同比例、黑色/负显示保持、已存全部RGBA与几何；错误旧max归一返回会改变728841个实际输出像素。原zero斜率和范围通过只证明限定开发合同，不验图质、绝对测光/配准、目标设备或独审。

首次task回归的两个合成亮度点未都进入旧归一化区，断言失败，发生在实际curve fit前；原executed脚本/失败/日志保留。只把该反例改为确在超范围的2/4同色点并使用新输出r2，实际变体一次求解成功；未把失败改写为通过。五项合成边界与实际根读回通过，self-check不算独立审查。

## 有界资源与后续

实际任务15.941816秒/CPU15.875秒，offline process peak working set398688256B、peak pagefile700813312B，含本次Python导入与字节核验，不是手机/native/GPU/服务器或200DAU总峰。四新Windows目录含失败/成功/reader/development与下面少量公开代码reference快照，共31文件32157162逻辑B/32227832reported allocation B，31身份/maxlink1/前后稳定。排除后续allocation/doc/log/checkpoint/continuity、旧源输出/依赖与FS内部/Linux保留/180GB或容量；未获取新天文源、没有原coadd/variance/detectorfit/孔径/恢复再跑。

下一采用**有限区间恒等、只压高亮**的责任，避免全局增加asinh压缩损伤普通亮度。已直接核[Khronos PBR Neutral公式/实现](https://github.com/KhronosGroup/ToneMapping/blob/b5a2eed5ddf6c2227090449399de9c7affb9e4c9/PBR_Neutral/pbrNeutral.glsl)及[说明](https://github.com/KhronosGroup/ToneMapping/blob/b5a2eed5ddf6c2227090449399de9c7affb9e4c9/PBR_Neutral/README.md)，其中高亮肩部有明确线性接点和连续导数，适合只作显示数值范围借鉴。下一只试一次原knee=.8-.04=.76的共同max通道高亮肩部，低于knee原pre-RGB精确保持、其余共同缩放保正通道比例。**不采用整套PBR材质偏移或去饱和、HDR/物理Rec709假设**：Lupton结果不是已校准物理线性RGB，不能减材质Fresnel偏移或混白来声称科学色彩。保Astropy原冻结前段/SCI/alpha/WCS/旧recipe/version，只做显示候选，未实施更未采用。

当前上游commit b5a2eed5ddf6c2227090449399de9c7affb9e4c9，五个原始公开文件/URL/byte哈希已固定于`output/sdss-m82-slope-preserving-development-1004-r1/references/receipt.json`。[官方REUSE元数据](https://github.com/KhronosGroup/ToneMapping/blob/b5a2eed5ddf6c2227090449399de9c7affb9e4c9/.reuse/dep5)指GLSL样例Apache-2.0、说明CC-BY-4.0；下一涉及翻译代码须保版权、许可、修改说明及必要归因，不能将适配叫完整官方mapper或官方天文品质通过。没有新付费设施、原排除天文来源不恢复。

一次新候选完成后直接核完整三级、所有现有目录星体及真实弱结构/核心/配准/跨级；不过则按实际机制调整责任，不参数扫、不掩盖已知失败。完整质量来源链/端云成本通过才采用；M51矩形FAILED、W3/旧strictBack、WXMLFAILED/手机newMoon/实际retention/混合200DAU、独审MISSING及原33义务仍开。Goal active无预算。

直接输出：`output/sdss-m82-slope-preserving-range-1004-r2/result.json`、`global-fit.json`、完整comparison/目录图与`candidate.json`，`output/sdss-m82-slope-preserving-readback-1004-r1/result.json`、`allocation-and-observation.json`；实际保存结果不覆盖旧科学、普通发布或运行时。
