# 三带共同噪声条件显示候选

沿PLAN B复用校准SDSS母图、三带fpM、CALIB/SKY、实际CAS gain/darkVariance和冻结RGB参数，执行一次固定5×5共同双边权重试验。这里只改变任务目录输出的显示估计，科学测量/availability/alpha/旧母图/权重/出版/服务/普通registry全部保持。没有科学源请求、完整重投影、参数遍历、新包安装、手机推送或默认采用。增量独审MISSING，完整图质UNVERIFIED。

## 成熟能力和适配边界

[ADAPTSMOOTH原作者论文](https://arxiv.org/html/0911.4956)提供多带共用平滑尺度的思路，但其局部SNR/独立噪声假设不能直接覆盖当前重采样和同run重叠，也明确涉及亮结构向外传播及弱纹理损失。原作者仓库未取得足以核定复用源码的许可文本，不能宣称它不可商用，亦未复制/安装。ASMOOTH与[CIAO csmooth](https://cxc.cfa.harvard.edu/ciao/ahelp/csmooth.html)针对的统计输入也不能直接替代已扣sky的signed校准三带处理。

[Tomasi/Manduchi双边过滤原作者说明](https://homepages.inf.ed.ac.uk/rbf/CVonline/LOCAL_COPIES/MANDUCHI1/Bilateral_Filtering.html)给出空间与数值相似度的共同归一权重；保边机制仍可能损失纹理，摄影色空间并非校准天文颜色。[OpenCV官方API](https://docs.opencv.org/4.13.0/d4/d86/group__imgproc__filter.html)及[4.13.0实现](https://raw.githubusercontent.com/opencv/opencv/4.13.0/modules/imgproc/src/bilateral_filter.dispatch.cpp)已检查；单个sigmaColor接口不能表达此处每对样本的空间方差/共享原生像素和未知资格。故只用既有NumPy/Astropy实现一个任务级公式适配，没有复制其源码、引入OpenCV或先建生产框架。

本次固定空间σ1、rangeσ1、半径2、单次处理。每个邻域共用同一三带权重：signed gri差值平方除以每对样本的条件Var(A−B)，三带相加，再与空间高斯权重相乘归一。原生对角噪声模型下，两次双线性采样使用相同native像素时计入协方差。三带共用权重避免分带选出不同邻域，但不保证滤后颜色/光度无偏；噪声相关权重依赖实际含噪值，不能用线性固定系数方差声称滤后置信度。

## 输入和资格修正

脚本为[共同显示试验](../scripts/experience-science-noise-bilateral-2026-10-03.py)。绑定六字段candidate SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`、完整joint冻结publication SHA `8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368`、原完整RGB及实际301/3699/6/100三带frame/fpM/psField/CAS。全部输入和六保护文件运行前后hash一致。两个128²旋臂区、两个紧凑源区的真实2px halo中该field几何归一权重均为1；原投影科学值与缓存逐字节一致，固定RGB与当前coadd同区域逐字节一致。外围33²是混合区，只比较单field原样本，未给整个coadd套单field噪声。

R1最初把fpM bit2 NOTCHECKED连同INTERP/SATUR/GHOST/CR一起排除，导致第二旋臂区全部16,384像素保持原样。这是试验资格错误，不是弱结构改善。根据[原作者fpM语义](https://www.astro.princeton.edu/~rhl/flags.html)、[DR17 sky处理说明](https://www.sdss4.org/dr17/algorithms/sky/)以及已有[完整贡献质量独审](experience-sdss-contributing-mosaic-quality-independent-review-2026-10-02.md)，NOTCHECKED表示未检查对象检测，不等于科学缺测/坏像素；对象flags与fpM bits也不能混用。SUBTRACTED/BRIGHTOBJECT按原标记保留，不猜局部模型起因、重加模型、重设权重/alpha或改原生噪声公式。

R2修正为只排除处理bit0/1/8/9，并只重跑受影响的arm/diffuse-arm，未重跑未变化的其他区域。三带有限值、完整原生noise支持和四邻质量共同决定处理资格；坏中心、缺带或未知noise保原signed测量/显示，不补值。标记资格只控制本候选处理，不撤销科学有效测量。

## 实际结果与反例

R1输出[result](../../../../output/science-noise-bilateral-1003-r1/result.json)339,609B/SHA `4d61f778b2886a55d8fcef853ca60e24fe6cb55ed93bf5c3724877147b6f8223`，错误NOTCHECKED资格及全区无处理结果保留。R2输出[result](../../../../output/science-noise-bilateral-1003-r2/result.json)329,919B/SHA `c29e595f356564004ff45670fe5ed496ad04298970b5316c09c7e719835c9fc5`；两次执行exit0，但R1资格失败不因退出码升级。

| 区域/记录 | 原→候选R−G标准差 | 原→候选B−G标准差 | 保原中心 | 实际改变RGB像素 |
| --- | --- | --- | --- | --- |
| arm/R2，128² | 10.0542→9.6081 | 8.8595→8.6289 | 280 | 12,199 |
| diffuse-arm/R2，128² | 12.2513→11.6213 | 7.6065→7.1346 | 250 | 14,659 |
| foreground-2/R1，65² | 9.1199→7.0135 | 7.6142→6.6129 | 51 | 3,905 |
| flagged-foreground-1/R1，33² | 32.9545→32.5821 | 27.7258→27.5693 | 32 | 830 |
| 单field外围/R1，33² | 7.8333→5.4401 | 4.1315→2.8710 | 0 | 654 |

旋臂区RGB均值最大改变分别约0.0024/0.0117 code；保存256份/区8×8signed块均值，最大绝对变化分别0.002382/0.002299 nMgy/native-pixel。颜色差标准差含真实结构，不能全部称噪声或用其下降验收。外围原RGB均值[4.6492,1.9614,1.1433]变为[3.2158,1.3260,0.8173]，底色有所减轻；非黑像素592→631是显示重分布，不是新观测覆盖。两旋臂实际比较图[arm](../../../../output/science-noise-bilateral-1003-r2/arm-comparison.png)、[diffuse-arm](../../../../output/science-noise-bilateral-1003-r2/diffuse-arm-comparison.png)，以及R1外围/foreground-2实际图已查看；右图色粒略减、原有结构仍可辨，不能由局部图证明所有弱结构/颜色正确，棕色底未解决。

foreground-2同旧半径6诊断的g/r/i中心改变小于0.00018px，RMS半径改变小于0.00138px；这不是PSF/FWHM或绝对天体测量验收。带INTERP/SATUR/CR的中心逐字节保持原科学值和RGB。共同常量、有效零/负值控制完全保持；缺g未填补并保其他中心值；unknown-noise/flags保原。旧Gaussian跨红蓝边串色反例在本次固定控制中RGB逐字节保持；该控制不是实际天体颜色证据。

R2在每区三带、六个偏移、三个实际位置，直接将A的四个native系数与B的四个负系数按native ID合并，再对合并系数平方求方差，与pair-covariance公式核对到rtol1e−12/atol1e−16；A−A为0。忽略共享noise的mutation相对错误最高约88.3%/92.9%，可被此核算检出。右邻Var(A−B) / 独立方差和中位数约0.710，而非1。此为独立代数路径的自核，不是独立人员审查，也不证明完整原生/sky系统协方差已建模。

每128²patch处理约0.094/0.097s（本机Python，仅kernel；不含全部I/O、原生noise采样/质量准入等），不外推批量出版/客户端帧时或端云成本。没有完整全幅处理、PSF匹配、同run跨field协方差、滤后误差、完整LOD/partial边缘及来源发布链验证。新图仅任务输出，不改现有v3recipe/版号。

## 决定与下一依赖

固定候选避免了已知强色边串色反例，真实局部色粒有改善，值得保留其共同权重和明确失败保原边界；没有解决完整质量，也不作为新默认。不能将单field noise覆盖混合coadd区域；不能在按field处理结果之间直接切换而造成新接缝。下一直接小路径应先核真实跨field共享观测/native身份能否支持共同混合区域的噪声边界，然后才决定候选能否进入完整共享显示/出版；不为本局部结果先建立整图confidence/权重框架，不循环σ调参，不重新扣sky或重下载。

原生噪声owner开发检查保原38项结果，本次未改生产reader/noise owner，不重跑其无变化套件。此次任务控制和协方差核算执行通过，独审MISSING保留。普通science/Prepared registry仍空，照片M51矩形FAILED、M82 OV/MED输入不足、实际page/来源Back/公共时间/native/Android/iOS与200DAU整产品容量均未升级；准确唯一顺序仍由PLAN顶部维护。
