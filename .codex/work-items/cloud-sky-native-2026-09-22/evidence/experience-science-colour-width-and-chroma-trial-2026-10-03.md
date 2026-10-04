# 科学色底、跨带星点资格与色度平滑否决

本轮从唯一PLAN的图质依赖直接推进。复用原校准科学母图、已独立读回的局部背景/处理标记、四个既有已查看紧凑点和新冻结zscale出版，不重投影/拼图，不下载源、二次扣sky、改母图/源/旧出版/普通registry。两个新任务是当前真实数据的因果诊断与单一有界处理试验，不是质量采用、独审或原生/完整发布验收。

## 复用入口和算法边界

- [原六字段质量投影](experience-sdss-mosaic-quality-diagnosis-2026-10-02.md)、[原局部重叠诊断](experience-sdss-local-overlap-diagnosis-2026-10-02.md)及其已有独立读回，不重跑这两个矩阵。
- [四个既有紧凑点](experience-hubble-m51-local-registration-2026-10-02.md)：仍是此前实际查看的SDSS局部对照，不是新增目录恒星身份或HST校准色参考。
- 原校准科学 `candidate.json` SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`，新冻结publication SHA `8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368`；原recipe的stretch `.6394959985261036` / Q8保持，不再fit。
- [Astropy RGB文档](https://docs.astropy.org/en/stable/visualization/rgb.html)解释共同强度和g/r/i→B/G/R；[库实现](https://docs.astropy.org/en/stable/_modules/astropy/visualization/lupton_rgb.html)的显示截负步骤与本机8.0.1实际库源分别核查。此映射不等于肉眼自然色，不应把星系的真实红带光与噪声色底混同。RGB通道增益不是本轮已确认的校准修复。
- 单次常规平滑复用已缓存Astropy8.0.1的[卷积工具](https://docs.astropy.org/en/stable/convolution/index.html)，无新增依赖或框架。Gaussian颜色试验是任务自有组合，并非引用库文件就获得天文质量保证。

## 新因果证据：零均值控制也产生偏红显示底

[诊断脚本](../scripts/experience-science-colour-and-width-2026-10-03.py)复用原 `[1968,2000]` 的两份33×33实际投影科学patch。原资格为全三带finite、全部10类flag为0、位于扩展目录椭圆外；它仍不是完整空天/深翼mask或全场noise模型。

| field | 原g/r/i的MAD scatter，nMgy/native pixel | 实际display mean RGB | F与−F成对后的mean RGB |
| --- | --- | --- | --- |
| 3699/6/99 | .009175 / .014956 / .028627 | 4.715 / 1.871 / 1.100 | 4.459 / 1.727 / .940 |
| 3699/6/100 | .009338 / .015117 / .028789 | 4.649 / 1.961 / 1.143 | 4.372 / 1.770 / .944 |

F和−F的每带逐样本和精确为0，但原固定显示仍输出正且偏红的RGB；这是显示截负的有作用控制，**不是测出了一个需要再扣的物理sky pedestal**。原六个通道排列控制与原RGB对应通道置换逐字节相同，最大误差0；没有发现库把某个RGB轴额外加红的错误。已有背景scatter中i显著大于g/r，而i映射R，支持该局部色底的输入/截负解释；不能外推整个星系棕色都是噪声或据此归一化三带科学值。

在实际coadd的同一32×32对齐区域 `[1952,1984,1984,2016]`，factor1/2/4的显示mean RGB分别为 `[4.693,1.872,1.090]`、`[3.066,1.203,.699]`、`[1.594,.672,.453]`。factor4与新冻结publication实际OV对应8×8 RGB/alpha精确相同；诊断确实连接新档位。先平均signed样本减轻此处底色，但没有消除它或证明整体去噪/弱结构通过。

已查看[原与sign-reflection对照](../../../../output/science-colour-width-1003-r1/real-and-sign-reflected-background.png)。该假想相反数仅在任务控制中出现，没有将它当作新源天体或把它加工进候选。解析弱常量 `[.02,.02,.02]`仍有等RGB非黑作用，zero显示black；这只是控制，不替代真实弱结构完整性。

## 新资格差异：r干净不能外推三色PSF

同一四个点的当前g/r/i实际科学patch复用已有annulus/positive-residual诊断centroid owner，半径4/6/8全部保存。半径6的radial RMS如下，它是孔径依赖的残差矩，不是FWHM、拟合/去卷积PSF或全场精度。

| 点 | g/r/i RMS，target px | 新读取的三带core事实 |
| --- | --- | --- |
| foreground-1 | 2.619 / 2.528 / 3.006 | i有32 SATUR和32 INTERP；g/r无这两类 |
| foreground-2 | 2.672 / 2.547 / 2.503 | 三带无SATUR/INTERP/CR，r有113 SUBTRACTED |
| foreground-3 | 2.607 / 2.524 / 2.498 | 三带无SATUR/INTERP/CR，r有113 SUBTRACTED |
| foreground-5 | 2.653 / 2.541 / 2.499 | i有2 INTERP和2 CR，r有113 SUBTRACTED |

OBJECT/BRIGHTOBJECT全保留，finite科学/alpha不改；SUBTRACTED不自动等于无观测/缺测。当前数据直接反证把这四个r-only已选点全当成三带无flag PSF/颜色校准样本。跨带centroid差另保原数值和孔径敏感性，不能按一个局部均值整体移动某带。四点全部在field100，小样本不供应跨run/全幅/绝对配准。

## 单一Gaussian色度试验：当前否决通用采用

[试验脚本](../scripts/experience-science-chroma-trial-2026-10-03.py)只处理三块真实完整joint区域及4px源halo：DETAIL512²、外围64²、foreground-2的65²。使用一个9×9/σ1 target-pixel正规化Gaussian；约.4″采样尺度是诊断选值，不是测得的matched PSF/noise参数。只在新显示路径平滑signed三带，用同固定recipe得到色度，再按原RGB的max通道缩放。每像素max(R,G,B)和原black集合逐字节保留；**不声称物理或感知luminance、通量、色义、颜色分辨率不变**。

| 实际区 | R−G std：原→试验 | B−G std：原→试验 | 保原色fallback像素 |
| --- | --- | --- | ---: |
| DETAIL | 13.831 → 12.811 | 12.247 → 11.703 | 0 |
| outer | 9.159 → 8.989 | 4.609 → 4.976 | 424 |
| foreground-2 | 9.120 → 4.795 | 7.614 → 5.450 | 0 |

这里的std是encoded色差，包含真实色结构，不是经过校准的纯噪声。外围蓝绿波动增加；424个原可见像素的平滑色度变黑，只能保留原色，不能给它们虚构新色或清掉真实样本。实际[DETAIL同尺度对照](../../../../output/science-chroma-trial-1003-r1/detail-comparison.png)已查看：局部彩色颗粒减轻，仍棕、软，没有完整质量通过。

常量色控制精确保持；红/蓝锐边控制从 `[79,0,0]` 和 `[0,0,79]` 的边邻像素变为 `[79,0,33]` / `[33,0,79]`，显示明显跨边传色，虽然最大通道仍79。该有作用反例说明“max图保持”不能替代弱结构/颜色分辨率证据。**否决将此方案直接作为通用修复或进入共享writer/新publication/default**；不继续无依据扫kernel参数或调gain只求某个std变小。未来不同方案须以实际噪声支持、跨带资格和真实弱结构/色边结果重新证明，而不是继承此试验通过。

## 绑定和下一直接依赖

- `output/science-colour-width-1003-r1/result.json` 53,156 B / SHA `e9d2d90ba2ba8b0d6e6fab0f6c72f52301fcfed142396ce7b9ef674906dcf665`。
- `output/science-chroma-trial-1003-r1/result.json` 11,051 B / SHA `5168f76c7a6d7d1465f3a7187e90953fd16cac94525b569d7f452f010fb20cc6`。
- 两目录保executed脚本、前后输入bindings、真实诊断PNG、控制、局部原科学NPY；前后源/母图/旧新publication/六项保护文件完全相同。任务脚本首次运行均成功，没有生产补丁、服务/工具重启、独立审查或普通采用。

下一可独立推进项是检查现有corrected frame附加SKY/CALIB与实际相机噪声元数据能否供应适用区域的noise支持，并将flag/finite/source-area分开；再决定必要共同显示处理，实际弱结构/颜色/源PSF结果通过后才进入版化publication。噪声置信度缺失不是全屏扣sky、临时white balance或遮掉资料的许可。实际page来源/Back/Context时间/native、必要独审、Prepared矩形FAILED、M82 OV/MED不足、Android+iOS、新月面手机、端云成本/10/20混合业务容量保持开放。Goal active，无预算、未完成。
