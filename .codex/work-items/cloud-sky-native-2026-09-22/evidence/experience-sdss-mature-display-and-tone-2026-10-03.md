# SDSS成熟显示处理核查与一次色调假设否决

2026-10-03，root任务级研究和保存输出试验。没有重下载科学图、重复完整过滤、调参循环或生产采用；共同显示估计、原科学/权重/冻结recipe、旧publication和registry保持。新增量独立审查MISSING。

## 成熟处理的适用边界

[Lupton等2004原论文](https://arxiv.org/html/astro-ph/0312483)以共同强度映射保三带比例，并描述饱和亮核的邻域颜色恢复。后者需要真实饱和像素和超过共同映射亮度门槛，不能把输出255当SATUR，不能用颜色替代新测量。当前固定recipe的该门槛为60.765274967080025 nMgy/native-pixel。已有四处真实33²科学patch中，唯一有SATUR的foreground1最大共同强度55.83575；foreground3有4点超过门槛却没有SATUR。这四处不支持直接施用该恢复法；不代表全字段没有可修复饱和源。

[SDSS DR17官方JPEG流程](https://www.sdss4.org/dr17/imaging/jpg-images-on-skyserver/)说明FITS2JPEG在Lupton之外另有处理。已取得并实际查看其[原流程图](../../../../output/sdss-display-flow-1003-r1/FITS2JPEG3.jpg)：去噪、阈值资格、像素位置校正、传递函数、锐化、截负/asinh、gamma、饱和修复和缩放。图不提供算法参数、可复用当前源码或代码许可，不能猜每步效果后宣称复刻。页面HTML只找到此图，旧论文实现链接当前访问失败。源图73,121B，SHA256 `188d78ebf6bc059076e54e55fa88aa3bd1de441c7904261bb24b608727354071`，见[HTTP回执](../../../../output/sdss-display-flow-1003-r1/receipt.json)。没有复制未知许可源码。

[GNUastro暗部灰色方案](https://www.gnu.org/software/gnuastro/manual/html_node/Color-for-bright-regions-and-grayscale-for-faint.html)面向白底印刷，暗部灰度反转、强弱区分段；直接套用会改变黑底星空语义，故不采用，也未安装或复制代码。[作者SDSSIDL文档](https://people.ast.cam.ac.uk/~rgm/idl/sdssidl_doc.html)列出counts到energy及shift2r等职责；当前源已校准，不能再次按counts加权。文档和存在实现的描述不供当前数值参数或代码采用资格。

缓存官方OV/MED/DETAIL JPEG与当前实际三PNG已经在相同中心、相近名义视场并排查看：官方细图本身有暖灰/棕色背景与蓝臂，当前候选更偏橙且有绿色结。不能把全部棕色当作物理sky扣除。官方JPEG可能选不同字段，位置亦经其affine合成；它只是显示参照，不是同曝光科学真值、天然真彩或像素配准oracle。

## 唯一固定色调试验

[任务脚本](../scripts/experience-sdss-display-tone-2026-10-03.py)复用保存的三带共同估计和原joint，先按现有科学mean顺序生成三级floating Lupton结果，再施一条固定的[ICC sRGB曲线](https://registry.color.org/rgb-registry/srgb)。Lupton幅值尚未证明是物理线性sRGB，故本项仅是单调显示假设，不能称“补漏gamma”。未拟合官方JPEG、改band gain或再次扣sky，空间过滤/fit/科学请求均0。

初轮r1在“原三级PNG必须精确重现”的断言失败：脚本把float64 box mean直接交库，未遵守现有owner的float32输入净化。保留[失败](../../../../output/sdss-display-tone-1003-r1/failed.json)及当时executed-script；修正任务适配的输入类型后，r2先精确重现三个原RGB及alpha，再测试曲线，未放宽oracle或改生产。所有输入和六项保护字节前后相同。

[r2真实结果](../../../../output/sdss-display-tone-1003-r2/result.json)12,780B，SHA256 `bd8401846dea373e567b84bacdf15bf64e581ba7b9548a84aa6bcdb5911ab846`。已实际查看[三级对照](../../../../output/sdss-display-tone-1003-r2/three-level-tone-and-official-comparison.png)完整1536×1614：中列总览暗颗粒增强，细图被抬成浅奶色，未取得官方蓝臂关系。原三图和右列缓存官方JPEG均保持。

既有外围33²诊断点RGB均值由[3.2314,1.29385,0.75390]升为[20.19835,10.77961,8.06703]；R−G标准差5.39783→27.22479，B−G 2.80012→18.74401。这是一个声明区域的显示色差，不是完整天空或校准噪声。实际OV整图RGB均值[40.6103,29.4550,17.1297]→[87.5220,74.3527,56.2996]；零/负控制仍黑、单调和纯色不混合控制成立，不能抵消实际背景劣化。

**决定：REJECTED_TONE_ONLY。** 依据实际背景颗粒变差及线性输入前提未成立，否决本色调作为质量修复；没有因此否决全部成熟显示方法。r2原报告的UNVERIFIED保留发生时含义，[后续评定](../../../../output/sdss-display-tone-1003-r2/assessment.json)单独绑定真实结果，不倒填历史质量通过。

## 继续依赖

现存标记边界、弱结构、完整覆盖、相对/绝对配准与真实颜色仍待核。已有[asTrans声明假设诊断](experience-sdss-astrans-approximation-audit-2026-10-02.md)不重跑：下一步用真实已测星点/逐带颜色与源坐标资格核对原点、相对位置和实际保存图，避免从最小metadata residual选origin或对全图猜shift；扩展天体DCR不由星色替代。质量与来源权利/信用/加工说明过审后才能接新正式出版/批量链、静态/API/client/source-route及成本。无预算active Goal、DevTools已知失败、Android/iOS、新月面/全产品容量义务保持。
