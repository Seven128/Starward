# 多尺度共同显示前的实际孔径噪声资格

本轮沿 B 完整候选质量依赖，检查新的多尺度方法，未重跑固定双边过滤、SAT/跨run/旧重叠矩阵、gamma/gain或背景拟合。原frame/科学/显示候选/冻结recipe/出版/default与六项保护字节保持；源码新增共享线性孔径方差职责，但没有生成/采用新显示候选。独审 MISSING。

## 成熟方法及当前适用性

[ADAPTSMOOTH原论文](https://arxiv.org/html/0911.4956)提供多带共用平滑尺度的路径，并指出独立噪声、局部RMS误抹真实锐结构、亮点向低亮区传染及正向选择偏差等边界。其均值/中位数与噪声模式须分别对待。当前coadd已有重采样相关性及未知跨field协方差，不能直接用独立像素sqrt(N)、全图常数gain/noise或局部源波动作为噪声。公开作者源码入口本次访问失败，代码rights未知；未下载/安装/复制代码。[CIAO csmooth官方文档](https://cxc.cfa.harvard.edu/ciao/ahelp/csmooth.html)也警告扩展源不能自动用其局部源发光当背景。没有据此扣当前科学sky或选择自动Background2D。

这里只复用成熟多带同尺度的数学责任，先核真正线性孔径noise算术。它不是原ADAPTSMOOTH完整实现、median噪声模型或其论文性能/测光结论的本项目证据。

## 共享owner与边界

[sdss_noise_aperture.py](../../../../data-pipelines/deep-sky/sdss_noise_aperture.py)消费已有准入/projected source stencil，在一个共同uniform aperture内，先把相同native ID的实际空间field贡献系数合并，再平方乘原生方差：`Var(mean_f)=sum_j[(sum_p a_fpj/N)^2 V_fj]`。不是先平方每个target然后当其独立平均。每个native ID在同模型内须有相同variance；正贡献缺geometry/noise保未知，零贡献未知中性。跨field仍复用现有Cauchy条件上界，不指定独立或把同run重复误当新曝光。field/source/处理/几何准入依赖已有owner，import方向 aperture→display/noise，没有反向依赖。

这个结果只以原生对角边际模型成立为条件，遗漏sky/系统/processing误差；不是完整置信、真实探测、PSF匹配或过滤后估计的variance。它仅适用于线性均值，不能用在median或已有非线性双边显示估计上。科学有符号值、availability/flags/显示透明度职责仍分开。

受影响新owner六项检查通过：共同native像素的两个target不获得sqrt(2)改进、不同native/空间field权重、零/正贡献未知差别、重复native不同variance拒绝、未知跨field与相关上界、空孔径/负权重拒绝。共享ID控制明确会拒绝“target独立、variance=2而非4”的错误替换；不是仅检查实现返回finite。

## 实际源与保存消费者

[任务消费者](../scripts/experience-sdss-aperture-noise-2026-10-03.py)复用当前已绑定科学coadd/几何权重、18缓存frame/CAS/fpM及原处理身份，在既有旋臂、diffuse-arm和外围声明区域中心各取17²真实支持。半径0/1/2/4/8分别1/5/13/49/197样本，是一组不同空间尺度的算术资格检查，不是按外观寻找最佳sigma/强度参数。只读取实际正贡献field，原reader准入及同PS_ID、projected值/coadd权重重建保持；三处本次孔径均具现有native-noise/flags支持。声明patch名不认证最弱臂或空天，三处不当整图上限。

[实际结果](../../../../output/sdss-aperture-noise-1003-r1/result.json)，16,085B，SHA256 `6796b1bc1216d960f09d828c2cc4c79470daafd538d1a5f2c1239393e1a461a9`。旋臂和diffuse-arm中心的均值/条件σ分别约g/r/i 45.89/45.36/60.02及26.99/32.70/37.99；说明这两声明中心不需要被凭“有纹理”视作低SNR噪声。不是完整有效颜色/弱结构结论。

外围 `[1968,2000]` 实际由3699/99与100两个field混合。半径8孔径的正确条件variance上界相对“错误target独立后再保field Cauchy”比值g/r/i为2.10150/2.11354/2.09598。g带正确均值/σ=2.11884，错误值约3.07；假定3σ的选择条件会误把该带判达标。i带正确约0.25981，未支持该孔径真实颜色探测。均值随尺度有正/负变化，保持为科学有效测量，不把负值填缺测、把未达门槛判零或用其拟合sky。

[保存算术读回](../scripts/readback-sdss-aperture-covariance-2026-10-03.py)不用新生产helper，直接在保存的真实NPZ按逐target/逐native建立H，并计算`H diag(V) Hᵀ`及trace-only错误路径；15孔径分别与保存条件上界/错误oracle在2e−13相对容差内一致，12个非单点孔径均有非零跨target covariance贡献。读回[result](../../../../output/sdss-aperture-noise-1003-r1/readback/result.json)，7,667B，SHA256 `675019f71ad9b3e33ba7b36a74f9e837da5704c92fbf681b4400e869c56d2070`。这是root独立算术路径的自读回，不是独立审查或原边际物理模型验证。

## 下一直接项

具备继续共同多尺度**显示候选**的线性noise责任；先核同带同尺度、实际flags/未知支持保原、原科学与冻结recipe、锐结构跨尺度传染/选择偏差、取消/有界内存及真实整图/LOD结果。不能直接套median/后滤noise或以参数循环、全图去绿、第二次sky代质量；不重跑这15孔径或旧矩阵。当前仅资格与新owner开发，没有新的平滑图、正式publication或普通采用。背景/疑似晕圈/弱结构/单扫描/完整配准、来源权利信用加工/独审及原生/手机/全产品容量义务均保持未完成。
