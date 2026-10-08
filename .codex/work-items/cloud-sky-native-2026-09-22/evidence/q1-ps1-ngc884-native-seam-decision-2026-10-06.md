# Q1：PS1 NGC884 原格接缝、名义坐标与退出决定

**相邻已处理片源确有供给，名义坐标解释已闭合；当前亮星团显示配置仍不采用。** 一个原格接缝由两个实际片源补齐大块边界空白，但亮星核心空洞和色环仍可见。已停止这个输入的显示调参、源重取和依赖扩展。普通 Prepared registry 保持空；没有新增合格影像覆盖。当前唯一下一依赖由 [PLAN](../PLAN.md) 维护，转入独立 P1 控制面只读根因定位，不用反复 SDK 调用替代诊断。

## 原头、网格与名义坐标

复用 [前阶段成品/供给及失败](q1-ps1-ngc884-finished-and-supply-decision-2026-10-06.md)、原 OpenNGC 行、两父 getWCS 和已保存的小 FITS。只对两个官方原 i stack 取 `bytes=0-65535`：实际均返回 **206**，共 **131,072B**；没有下载完整 skycell。[原头收据](../../../../output/ps1-ngc884-parent-headers-1006-q1-r1/result.json)保存实际前缀、原头文本、URL及 hash。两个完整文件的响应总长度分别为65,450,880B和66,386,880B，未读部分不计作已下载数据。

原压缩图像头均未给 RADESYS/RADECSYS/EQUINOX/EPOCH/TIMESYS。实际大小6278×6311、同 TAN/CD/CRVAL、CRPIX y 差5831，与原 getWCS 数值相符。官方 [cutout 说明](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812251/PS1+Image+Cutout+Service)说明完整文件缺坐标系/时间标记，cutout 补 FK5/TAI 并逆 asinh 返回线性值。结合实际 cutout 的 FK5 和成熟库的默认 J2000 解释，本轮仅在诊断副本使用名义 FK5(J2000)，不改原头，不把 getWCS 的 ICRS 字符串当来源精度认证，也不二次逆变换。实际 stack NINPUTS 为26/24，各自跨多曝光；MJD不是全部像素/恒星的同一实时观测。

同 projection cell 的 [公开网格规则](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812317/PS1+Sky+tessellation+patterns)和本次18个实际头共同支持整数原格。使用现有 Astropy 的 [坐标转换](https://docs.astropy.org/en/stable/coordinates/transforming.html)旋转名义球面/切平面基，生成同一 native plane 的 ICRS TAN 参数，**图像没有重投影或拟合**。[几何结果](../../../../output/ps1-ngc884-seam-readback-1006-q1-r1/nominal-frame-geometry.json)49个方向与库直接转换最大差 `1.1517122477233692e-10`角秒，逆回原像素最大残差 `6.039044819772243e-10`像素。直接将原 FK5 数字改标 ICRS 在这组方向最多差0.030751角秒。数值一致只证明名义解释/转换，绝对天体测量和发布者真实坐标精度仍 **UNVERIFIED**；原 getWCS 标签差异保留于原证据。

## 一份真实接缝与显示尺度纠正

[实际供给收据](../../../../output/ps1-ngc884-seam-source-1006-q1-r1/result.json)绑定 2409.025 / 035 的 g/r/i science、weight、mask，18个 FITS均为一次实际200响应，合计 **38,188,800B**；串行请求，最大并发1，获取墙钟约51.094s。每片只取512×1024原像素，名义2.13′×4.27′，不是整个10.50′ NGC884、更宽区域或产品覆盖上限。请求的 `badvalue=-1e30,badpix=no`保零值，既存400/默认 mask NaN/裸 NaN JSON失败未重试或覆盖。

[原格读回](../../../../output/ps1-ngc884-seam-readback-1006-q1-r1/result.json)分别要求三通道 SCI有限、weight有限正、mask有限且未置 BLANK。其它原质量标记保留，未据其宣称科学优良。优先选025的完整三通道，035只补不足：524,288像素中025有382,271可支持、035有382,255、共有241,470、合并523,056；仍缺1,232。原 signed/zero/NaN数组和选择身份单独保存，没有颜色估计补源、插值、平均不同观测或 PSF修复。

首次直接使用 Astropy Lupton 默认 stretch=5，实际原线性计数的联合强度99.5百分位却为46,794.198。完整 R1图呈严重饱和色噪，判为 **FAILED_DEFAULT_STRETCH5_INPUT_UNIT_MISMATCH_PRESERVED**，不是全部 PS1 数据的失败。仅针对这个实证单位不匹配做一次 [共用显示尺度纠正](../../../../output/ps1-ngc884-display-scale-1006-q1-r2/result.json)：i/r/g映射红/绿/蓝，minimum=0、Q=8，两个片源全部通道共用实测 stretch=46,794.198。没有逐通道增益、扣背景、重新校准、改变 SCI/支持 mask或再次取源。映射是历史通带显示，不能冒自然真彩、线性 sRGB或校准表面亮度；原运行中 Astropy divide warning 保原日志。

已查看完整候选及两个同算子父片：R1/R2共6图，原文件保持。纠正后 [原格候选 PNG](../../../../output/ps1-ngc884-display-scale-1006-q1-r2/candidate-native-seam-measured-scale.png) 的大块空白和过度色噪消失，但顶部及左侧亮星核心仍有明显空洞/色环。共用尺度重叠区 RGB绝对差中位 `[0,0,0]`、p90 `[2,1,1]`，95,643像素存在至少一个通道差；这些是同名义网格的实际显示差，不是预设通过阈值、独立观测误差或完整接缝质量通过。

## 缺测、有效黑与当前适用性

[最终决定及原 mask抽查](../../../../output/ps1-ngc884-seam-decision-1006-q1-r1/result.json)只读6个已保存 mask在仍缺1,232像素处的原值，没有再生成图。1,232处均在至少一个来源/通道关联 BLANK与CONV_BAD，1,223处关联 SAT；两来源共有对应标记分别为568/568/559。bit 0x1未列在所查 [官方标记表](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812335/PS1+Pixel+flags+in+Image+Table+Data)，保 **UNKNOWN**，不猜含义。这些关联不等于精确确定每个空洞的物理成因，更不恢复缺失核心。

候选1,232个 alpha=0像素与保存的观测支持逐点一致；另有 **321,334个有效编码黑**，不是缺测，不能抠黑生成 mask。截图中的具体空洞位置也读回实际 alpha/支持。旧 R1/R2结果中的 `PENDING_WHOLE_SAVED_IMAGE_INSPECTION`保原，新的封闭决定单独记录 **FAILED_BRIGHT_CLUSTER_FIELD_COMPLETE_DISPLAY_UNADOPTED**，不回写旧证据时态。

[官方 PS1 FAQ](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812205/PS1+FAQ+-+Frequently+asked+questions)提醒亮点源的饱和/非线性和部分扩展天体图像限制，支持按实际对象/区域决定适用性，不能由本小样推出全天或所有暗弱目标失败。当前只退出 NGC884亮星团显示配置，不恢复已排除源、不开发逐星修补。源码生产者当前的成品 RGB、假定 ICRS和完整矩形 alpha合同不能把这份已转换名义坐标/部分观测 RGBA伪装成原 publisher AVM或 opaque照片；因为图质尚未通过，本轮不扩大生产合同或实际消费者。

## 处理与运行边界

本次新增源请求20个：2个206前缀＋18个200小 FITS，共 **38,319,872B**，前阶段11请求/10个200的1,058,066B另计。未重取完整源图、全库或旧月面；任务端 body并非网络计费/磁盘物理占用。没有许可付费、采购、外联、部署或发布；已核官方原数据权益仍保，具体完整署名/实际发布资格仍未通过。

两个独立离线进程的 OS PeakWorkingSet分别181,514,240B（原格/名义转换）和130,850,816B（一次显示尺度纠正）；PeakPagefileUsage分别537,640,960B/488,333,312B。函数 CPU/墙钟分别约0.547/0.578s、0.531/0.562s，不含获取/启动全部成本。它们不能相加成同时间峰，也不能证明测试4GB、生产4核16GB、全小程序200DAU或端上GPU容量已通过。复用原 Python/Astropy/Pillow/NumPy，无新运行环境。

产品源码、本代300个WEAPP文件、原515/173软件输入、112检查日志、原watch/BFF/IDE保持；无新 page/Scene、构建、SDK调用或活跃 helper。原图全幅/外围、科学有效性/绝对配准、真实消费者/恢复/可见来源、DevTools/Android/iOS/新版月面、修后独审、完整真实引用、物理资源与全部33项最终验收继续 **FAILED/UNKNOWN/MISSING**。有用增量是实际同源供给、原值/缺测边界、名义坐标转换及失败配置的可复用决定，不能当用户已获得合格新图。
