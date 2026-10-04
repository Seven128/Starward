# 全母图亮核饱和资格与一次成熟色比试验

2026-10-03，Goal active、无预算、未完成；固定工作区/分支/HEAD及六项保护保持。任务直接沿唯一PLAN共享完整图质依赖推进，复用旧science/fpM/projected flags、共同估计、另一扫描恢复和冻结recipe，不重新过滤/fit/下载/投影。没有新增库、生产owner、默认registry、出版、服务或DevTools重启；独审 **MISSING**。当前已知照片矩形FAILED/源不足、原生合成失败、Android/iOS与新版月面、容量未验均保持。

## 成熟处理边界与新的真实供应

重新核[Lupton原论文第III节](https://arxiv.org/html/astro-ph/0312483)：饱和核心的RGB色比可能失真，可用相邻像素平均颜色作显示处理；必须是真实SAT，且仅作用于强度高于映射上限的饱和像素，避免处理低亮度拖尾。这是邻域颜色插值，不供应新测光、PSF/时变或饱和核心真实颜色。原四个局部点未满足两条件的证据仍正确，但不能代替全母图；本次实际全图核新增60个符合SAT+亮度初门槛的样本。

[SDSS官方JPEG](https://www.sdss4.org/dr17/imaging/jpg-images-on-skyserver/)另含修改的多步转换；本次没有复制未知许可MATLAB或假称它提供完整参数。[LSST makeRGB API](https://pipelines.lsst.io/v/d_2026_08_31/api/lsst.afw.display.makeRGB.html)也把饱和处理与实际MaskedImage及边界参数相连，不能拿普通RGB的255作源SAT。未安装/采用/复制LSST代码；其API不是当前SDSS质量或可商业复制源码资格。当前任务从论文颜色定义独立使用已有NumPy/Astropy8.0.1及现有共享数值LOD owner。

当前固定recipe stretch0.6394959985261036/Q8的实际Astropy上限为60.765274967080025 nMgy/native-pixel。按该库伸展归一化解析反函数求得，并实际代库得到f(I)=1；不是把`sinh(Q)`盲套为同一实现，也没有调曲线。真实正贡献union SAT+joint为475样本，超过上限60样本，最大强度105.2559102376302；当前另一扫描恢复不覆盖这60点。

## 全SAT连通区域与资格修正

初轮[r1结果](../../../../output/sdss-bright-saturation-qualification-1003-r1/result.json)，13,596B/SHA `61a01ea9578b46991d987bb6ad709cb521a257149e3c0b21479682442719708e`，用仅超过上限的子集定义连通区域，触边还包含较暗SAT像素，得到0个完整合格ring。r1原数据/图保持；[独立评定](../../../../output/sdss-bright-saturation-qualification-1003-r1/assessment.json)明确范围不适合作完整SAT外边界供应，不能把0供应用作方法已否决。

[r2结果](../../../../output/sdss-bright-saturation-qualification-1003-r2/result.json)，43,181B/SHA `42aee0dd268f017cf3307cf641ee1eb5e676ef035781f4d3335a217348f0d739`：以完整实际SAT区域按8邻接识别连通，再选其超过上限的子集作为可替代核心；只用紧邻外边界，不扩大半径寻找任意颜色。连通选择与完整边界资格是本任务的明确策略，不假称论文规定所有离散细节。

| 源SAT区域XY范围 | 整SAT样本 | 高亮核心 | 触边合格/总数 | 结果 |
| --- | ---: | ---: | ---: | --- |
| [845,381,855,390) | 70 | 56 | 42/42 | 真实边界颜色可作显示试验 |
| [2016,634,2041,645) | 183 | 1 | 83/83 | 同上；较暗SAT拖尾不改 |
| [1189,1157,1199,1166) | 66 | 1 | 43/43 | 同上 |
| [453,1207,464,1217) | 82 | 2 | 44/48 | i带4个边界INTERP/CR等processing不合格，保原 |

资格继承原真实gri供应、processing PS_ID、fpM与现有CALIB/SKY/CAS采样支持；黑色/缺测/科学area仍分别处理。全部实际外围颜色也必须可定义（RGB和>0），有效黑不假称不存在，而是无法供应颜色插值。原18份处理身份与元数据packet仍保原pin。场内连通边界有实际处理资格不等于核心颜色恒定、真彩/全图质量。

## 一次真实显示色比试验及已查看结果

[任务试验](../../../../output/sdss-bright-sat-colour-trial-1003-r1/result.json)，14,624B/SHA `fa6dc9f994da65f001cf5ae83136e8fc80a743bd5ac47b0fe9d5d70d5b84a692`。对合格外边界逐样本计算原固定floating Lupton RGB，再以RGB总和归一化为色比、平均色比；把58个亮核心的旧共同强度乘该邻域色比，形成独立display-only估计。不平均边界亮度、不替换原科学值；这是来自真实邻域的颜色插值，**不是实测/恢复光子通量、感知luminance或原核心真实颜色**。

三个平均R/G/B色比为[0.558268,0.327524,0.114208]、[0.524758,0.354532,0.120709]和[0.382780,0.352156,0.265063]。高亮原floating RGB的max逐样本精确保持；旧共同强度在float32显示估计的表示误差内保持，最大差2.5431315151536182e-6。这个max控制不认证颜色结构、物理亮度或弱结构保真。

全部其他4,194,246像素与父估计逐值相同，较暗SAT拖尾与另两未合格亮核保原。三个新的PNG仍用现有signed共同均值→原冻结RGB数值owner，不反过来缩encoded RGB；OV/ MED/DETAIL仅9/1/1个输出RGB像素改变，alpha全部精确保持。版号仅`sdss-qualified-lupton-bright-sat-colour-trial-v1`，不接普通writer/registry或来源route。

实际查看[四个源区同尺度对照](../../../../output/sdss-bright-sat-colour-trial-1003-r1/actual-sat-colour-pairs.png)及[完整总览](../../../../output/sdss-bright-sat-colour-trial-1003-r1/overview-trial.png)：56像素亮区颜色被邻域替代，两处单像素核心改变很局部，绿色晕圈仍明显；第四处完全保原。暖底、细档颗粒/原插值色缺陷和单扫描弱结构未解决。没有以颜色更接近邻域宣称物理真彩或全图改善。

**决定：UNADOPTED_LOCAL_COLOUR_INTERPOLATION。** [评定](../../../../output/sdss-bright-sat-colour-trial-1003-r1/assessment.json)分开保存并绑定实际输出，未倒改原UNVERIFIED报告。此路径保留作局部显示候选，暂不迁入共享生产owner，不扩大SAT/强度门槛去修低亮度绿晕，也不把它当作背景/弱结构修复。

## 保存结果、失败与下一依赖

[保存数组/PNG读回](../../../../output/sdss-bright-sat-colour-trial-1003-r1/readback/result.json)用保存NPY、显式reshape/signed块求和与现有Astropy重新推导实际三个PNG，不重跑资格/原过滤；58 mask等于真实完整合格区域的高亮子集、其他值/原alpha精确、共同强度表示误差成立。有界单个保存估计copy mutation会改变实际RGB，检查不是空数据或旧结果无效通过。又核全部58个保存核心等于原真实边界来源色比公式，并保存[输出数组receipt](../../../../output/sdss-bright-sat-colour-trial-1003-r1/readback/output-receipt.json)，避免仅保持强度/PNG自洽就借别的色比冒充。补核初轮task未展平库1×N×3输出的[形状失败](../../../../output/sdss-bright-sat-colour-trial-1003-r1/readback/core-verifier-task-failed.json)发生在任何写入前，只修任务适配。该另写数值读回是root自审，**不是独立审查**。

现有science/joint/几何权重/recipe、原noise/另一扫描candidate、旧publication/default和六项保护前后精确。又读全部18原生源的当前实际字节，均与原投影source receipt精确，[当前raw-source读回](../../../../output/sdss-bright-sat-colour-trial-1003-r1/readback/current-native-source-receipt.json)明确是此时核对，不倒填task此前bindings包含了原生文件。试验根目录逻辑文件56,072,941B，不含readback子目录，不作物理磁盘/进程峰值、手机、用户请求时延或端云容量。fit/filter/科学source requests0；两次新的官方文档读取仅研究请求，不写成零网络。

[task失败记录](../../../../output/sdss-bright-saturation-qualification-1003-r2/task-attempt-failures.json)保临时probe的NumPy int64 JSON错误与一次r2路径替换没命中、排他mkdir拒绝已有r1；均未覆盖旧结果或改生产。r1范围资格修正属于真实发现，历史成功产物不改成r2，也不把r1错误范围的0完整ring当质量结论。

下一依赖仅由[PLAN](../PLAN.md)控制：完整背景/弱结构、低亮度插值/绿色晕圈和单扫描/配准仍需真实来源与成熟处理资格；不重复此完整亮核资格/58像素试验或旧完整过滤，不扫参数、二次扣sky/gain或扩大到无SAT低亮度。达到完整图质及来源信用/权利/加工说明条件后，才正式版化/批量出版/static/API/client/已绘source-route与成本/保留审查。Prepared/science普通registry继续空，目标runtime/独审和全产品容量义务不变。
