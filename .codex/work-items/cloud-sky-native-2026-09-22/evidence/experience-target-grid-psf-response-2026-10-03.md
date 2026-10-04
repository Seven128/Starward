# 真实目标网格 PSF 响应小路径（未采用）

Goal 仍 active、无预算、未完成。位置/分支/HEAD及六保护文件保持；原 BFF/watch 进程仍在。此增量只新增离线任务脚本、模型诊断输出和对应文档，不改变生产代码、科学图、当前显示候选、recipe、alpha或普通 registry。不是整图质量、原生运行时或独立审查通过。

## 实际输入与责任

沿原 `sdss_gri_tan.py`/`sdss_source_stencil.py` 的真实目标 TAN、北上行序、native WCS、所有四邻有限才可采样、float32 bilinear和共同 gri 几何权重。原六 field 的完整 header/尺寸、已保存 footprint/finite-neighbors/normalized-weight及六 psField 精确绑定。复用已安装隔离 Photutils `ImagePSF`，实际每位置每带51×51有符号空间模型归一有限核和，再在原生整数像素采样，经过实际重采样/共同权重求目标响应。模型不可用的正权重保持未知，零权重中立；不外推 CCD 外的空间 PSF。

87个位置取自当前 DETAIL 内全部已保存 image triplets，使用各自 r 检测的同一近似 ICRS anchor，不暗加逐带拟合中心或新 WCS shift。它们仍含星系/extended/blend，不能称87颗恒星。不是重跑检测、261诊断拟合、旧45拟合/15孔径或整幅滤图。两次脚本失败各保原执行脚本/错误记录：r1把换行 FITS cards 当无分隔解析；r2先 float32 累加几何权重导致与生产路径不符；r3按源 header 格式和 float64 累加后 float32 保存，归一权重逐位置逐 field 精确一致。

## 真实结果与缺口

[主结果](../../../../output/target-psf-response-1003-r3/result.json)：227209B，SHA256 `bd5e6755e8552866298757dab8eb91ec2bbb9eacefeb7217c78def661a056041`，离线执行3.011秒。74个位置单 field/单 RUN，13个位置两 field/不同 RUN。全41²响应5775个 band-pixel未知，其中5361来自正权重参与 field 的 anchor 在CCD外；半径12核心共118209个 band-pixel中843未知，集中于位置9/67/74。它们不是科学零值，也不批准以零补全模型。

另从真实保存权重中选距母图中心最近且3699/99与100均权重大于0.1的位置，单独做一次[同 RUN 几何控制](../../../../output/target-psf-same-run-control-1003-r1/result.json)。这是一个明确声明的数学响应位置，没有声称那里检测到恒星。两 field/同 RUN，不当两个独立曝光；两个角部模型支持未知，核心1323个 band-pixel均有完整模型支持，执行1.276秒。

[算术读回](../../../../output/target-psf-response-1003-r3/readback-r2/result.json)和[同 RUN 读回](../../../../output/target-psf-same-run-control-1003-r1/readback-r2/result.json)未导入 producer、ImagePSF、共享 sampler、检测器或拟合器。逐行 SciPy spline、显式四邻和保存权重重建，源67/66项 before/after一致；最大 native spline差5.552e-17，最终 float32采样和coadd一致。错误转置核改变响应0.00870；把正权重未知置零会错误接纳真实5775/2个未知响应位置。模型负值保留，主路径178408个signed-negative model-pixel不是科学图噪声数或真实负星。

同一 field/band内部，半径12的不同 target样本实际复用native整数样本：主路径379660次重复邻居使用、同 RUN控制7489次。计数明确限于 field/band身份，未宣称跨field物理重复来源已统一或独立。不能把target pixels当独立噪声，既有native-ID孔径聚合及跨field Cauchy上界边界不变。

根实际查看主输出第1/6页（23/87行）及一页同RUN控制，未全页视觉验收。图左侧为原真实 r 科学cut，右侧为三带数学 unit响应，分别归一显示；未知在图中显示黑色，须以保存support/数值状态判读，不把它当有效零。扩展/混合结构仍见，数学模型不供应真实天体细节或标定总flux。既有43 center-bound与高残差保原。根算术自读回不是独立review，MISSING。

## 对当前显示与下一处理的决定

本次响应只描述**原线性科学coadd**。有限native核归一和target patch sum不是总测光/flux-conserving响应；原primary TAN不实现完整asTrans/DCR/绝对配准。当前自适应median/共同radius/flag恢复是非线性显示估计，不能将原science-parent响应直接称作其有效PSF或给当前显示反卷积。没有全图 PSF matching、plane/sky/gain/shift处理或来源采用。

原科学上的有界成熟匹配试验须从共同完整模型支持及真实halo开始，核模型和实际原样本的处理效果及颜色/细节/负值/边缘，对照当前完整候选的相同冻结recipe；不足就保持候选和明确拒绝扩张。不能据本记录跳过完整背景/绿晕/弱结构/覆盖、同母图三级显示、来源权利/信用/加工说明和必要独审。实际page/router Back/native总资源、Android/iOS、新月面、批量出版与200DAU混合容量仍未验；Prepared registry空，HST矩形FAILED、M82完整输入缺口保持。

## 新增工作盘范围

[Windows分配记录](../../../../output/target-psf-response-1003-r3/readback-r2/owned-output-allocation.json)使用`GetFileInformationByHandleEx(FILE_STANDARD_INFO.AllocationSize)`，逐handle关闭。四个新增任务树（包括两个失败阶段、保存读回）分别为12488、1871960、20959232、462848B本机分配。枚举不含随后写入的本ledger；不是旧科学源/工具全盘、Linux180GB余量或生产保留策略，不清理任何输出。压缩/逻辑字节不冒native/GPU或全产品峰值。
