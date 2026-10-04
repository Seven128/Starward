# M82 真实重叠源的平面背景假设：未取得可用校正

2026-10-04，r105；Goal active、无预算，原工作区/分支/HEAD与六项 Settings/outbox 保护保持。本轮仅三个新 Sky task 与四份归属文档，无 production、其他业务、候选、原科学、recipe 或出版改动。

## 本轮完成的责任

直接检查 corrected-frame/noise/adaptive owners 与已有科学背景/来源色义证据：SDSS corrected frame 已扣 SKY；保留的 SKY 仅供 noise counts variance，不能再次从科学图扣除。`_display_support` 的 protected 是任一带条件 ratio≥3 的统计门槛，不是背景或真实发射分类。先前 Photutils 整图 clipped-median 反例、完整 source/coadd/variance/PSF/146 响应链已闭合，没有重跑。

本轮查询并直接读 [Montage 算法](https://irsa.ipac.caltech.edu/Montage/docs/algorithms.html)、[mBgModel](https://irsa.ipac.caltech.edu/Montage/docs/mBgModel.html)与[Photutils 背景指南](https://photutils.readthedocs.io/en/stable/user_guide/background.html)。Montage 的 overlap 平面匹配依赖同坐标、已校准及低频仪器背景假设，快速变化的污染需要数据特定处理；Photutils 的源排除和真空天供给仍是必要输入。这里复用成熟的低频差异检验思路和已有 NumPy `lstsq`，没有安装依赖、复制 Montage 实现或采用其校正。公开说明研究查询不是天文源获取。

复用 r104 保存的同坐标两 RUN 差值和 flags-clear overlap，只在来源重叠区对差值拟合 offset/x/y；没有拟合 SCI、源 coadd 或当前 display。训练/留出按有效供给的局部 y 中位数拆为互斥上下半，两个方向均检验，选择不看颜色/强度/protected。外围训练/留出3131/3111，上方2631/2566；每次三波段，实际四次 vector fits、12个 band cases。没有新的噪声概率、PSF等价、sky mask 或背景修正。

| 留出方向 | g：原差值→平面残差 RMS | r：原差值→平面残差 RMS | i：原差值→平面残差 RMS |
| --- | ---: | ---: | ---: |
| 外围 upper→lower | .05412274→.05403804 | .18555960→.18552660 | .19210333→.19206618 |
| 外围 lower→upper | .01656165→.01668893 | .02744868→.02823925 | .04732363→.04959817 |
| 上方 upper→lower | .01900254→.01829248 | .03215848→.03042982 | .04915710→.04937675 |
| 上方 lower→upper | .01789825→.01693086 | .03025659→.02854866 | .04803117→.04804465 |

单位保原 nMgy/native pixel。5/12 个平面留出误差比 null 不校正大，8/12 比训练区单一常量大；即使改善，仍有大量原差值残留。没有稳定统一的真实背景校正证据，**不能直接采用平面扣除**。这里只否决本次 plain affine overlap matching 的交付依据，不否定所有 Montage/robust/masking 方法，也没有证明差值就是天体、背景或哪一种仪器伪影。外推区几何、星体/PSF/噪声及被排除 flags 都可能影响结果；没有新增阈值或把样本数当需求上限。暖核/下方没有第二 RUN，保持 NaN，无 fits、更不作零对照。

## 实际产物与读回

[任务脚本](../scripts/experience-m82-overlap-plane-2026-10-04.py)与[完整结果](../../../../output/sdss-m82-overlap-plane-1004-r1/result.json)保存两个真实诊断 NPZ 和[外围](../../../../output/sdss-m82-overlap-plane-1004-r1/outer-stripe-actual-plane-residuals.png)/[上方](../../../../output/sdss-m82-overlap-plane-1004-r1/upper-stripe-actual-plane-residuals.png)完整图页，根代理均已查看。结果17684B，SHA `53a39c0b2646dac749e13ff1cf1d37bed2f92d3e2075986e9dcf8b1174b360db`。实际10.111762s，CPU10.09375，offline peak WS86560768B、peak pagefile475729920B。没有 native frame读取/请求、旧 projection/coadd/variance/PSF/noise/recovery/tone trial 重做。

图页使用每带共同比例的 signed 正负显示；粉色为不可比较区域。右侧残差图保训练和留出全部有效区，虽然标题含 heldout，**不能把整幅图当仅留出结果**；部分长标题被格边裁掉，呈现限制保留。真正 heldout 误差只取保存的互斥 test mask。星体极值决定标度的暗处不等于 residual=0。这些诊断页不是出版/自然彩色图质或显著性证据。

[分离算术读回](../scripts/readback-m82-overlap-plane-2026-10-04.py)不导入 producer、不重新拟合；从原 r104 差值和保存 coefficients 逐点预测，核正规方程 stationarity、几何选择和34317个实际 heldout band values的 math.fsum error。所有原差值/valid/test masks和残差数组精确；独立浮点运算仅用 float64 machine bounds，不放宽数据身份。12case及5/8较差分类一致。[读回结果](../../../../output/sdss-m82-overlap-plane-readback-1004-r1/result.json)，0.14295s。一个精确 affine 数学控制例通过，不是生成天体、真实背景有效性或产品完成。根自读回不替代独审，MISSING 保留。

编辑前四 owner 文档按 r104 原字节封存，496旧源允许这四归属文档外、9382旧证据及六保护精确；原 BFF/watch保持。三个新Windows目录14files、3916480 logical、3944448 reported allocation、14 identities/maxlink1、前后稳定，见[分配事实](../../../../output/sdss-m82-overlap-plane-readback-1004-r1/allocation-and-observation.json)。不含后续logs/docs/checkpoint/continuity、旧数据依赖、FS内部、真实Linux retention和端云总资源；不能供200DAU/生产配置容量。Context/diff验证与实时最终清单见[r105 checkpoint](current-execution-state-2026-10-04-r105.json)及其随后 continuity，不倒填前代事实。

## 唯一下一依赖

回 B 的数据特定来源/恢复责任：复用 r91 native 坐标/真实 processing flags、r92 当前版本 marginal/资格与 r94 当前估计/恢复供给，先验证当前原与effective资格的适用关系，再将残留按 known-bad、无另 RUN供给、强信号保留和弱恢复未达目标区分。不把旧 marginal 或 noise masks 冒当前 effective model；可复用保存数组，不重算闭合母图/拟合/旧曲线或循环泛用背景方法。实际强信号、校准色义与缺测边界保留；修共享 owner 以新实测为依据。

平面假设不通过不授权全图 sigma-clip 再扣 sky、逐个手抠色或抹真实星系；candidate/registry不变不采用。原 SCI/alpha/WCS、r103有限高亮函数、旧recipe/publications保持。完整画质/来源批量出版/成本、高DPR正常完整来源/default预算/native物理、M51矩形FAILED、W3覆盖、strictBack历史失败、WXMLFAILED、手机不可用/newMoon未推、实际retention/混合200DAU、独审和原33义务全部继续。无提交、推送、采购、部署或发布；Goal未完成。
