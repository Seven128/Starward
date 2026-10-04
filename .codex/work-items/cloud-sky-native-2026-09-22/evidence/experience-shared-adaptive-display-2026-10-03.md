# 完整共同孔径候选、真实LOD及资源

沿唯一PLAN B，已把[批量算术资格](experience-sdss-adaptive-batch-display-2026-10-03.md)接到共享 `sdss_adaptive_display.py` 的完整母图消费者。固定过滤和自适应处理共用 `sdss_noise_display._project_display_region`，不维护第二个源准入/coadd规则；旧固定过滤的实际source/partial/恢复检查保持。新版显式候选没有进入普通registry/正式出版，独审MISSING。

## 责任与验证

真实来源/camera/SKY/fpM/几何权重由既有owner准入，统一核已缓存projected值与原coadd。分块使用真实父图八像素halo，跨块不用镜像/复制边缘；外八像素保原。原science/availability不修改，所有输出仍是有符号nMgy/native-pixel的显示估计，不是新测光。强单带保护整个颜色、共同支持、未知/flags保原、取消无半成品、分块资源退休保持。标量政策/尺度/冻结recipe不变。

新 `AdaptiveDisplayCandidate` 保存 qualified/radius/reached/protected；资格只覆盖处理内区，外halo不借此声明noise未知。报告明确原值保持、改变、未到共同门槛及遗漏误差。独立输出路径绑定source/availability/估计及诊断hash、对象/中心/朝向/recipe/政策；同几何改objectRef拒绝，篡改诊断/source拒绝，exclusive serializer不覆盖旧路径。数值LOD复用现有显示估计均值责任，共同原coverage计alpha，不将强度/噪声资格当缺测。

新实际投影消费者检查覆盖single/mosaic、chunk5/13/32、batch1/7/64、真实halo、partial非有限、零贡献未知中性/正贡献模型缺失保原、取消/coadd改变/PS_ID不一致、原有效黑/partial alpha及保存绑定。首次诊断mutation把半径赋为原本已有值，检查未检出变化；这是假mutation而非生产逃逸，已改为明确不同的99并实际检出。新master4项、受影响display14项、aperture9项通过，不拿检查数认证图质。

## 当前实际完整输出

[消费脚本](../scripts/experience-shared-adaptive-display-2026-10-03.py)复用原缓存完整母图准备路径，实际六field/18frame、fpM/CAS和2048²原coadd；冻结recipe stretch0.6394959985261036/Q8、i/r/g。科学请求0、旧filter0、fit0；没有重下载/重建旧mosaic或重跑旧矩阵。四个49²局部批量结果的内33²估计/半径/门槛/保护与完整输出逐值一致；当前source/原科学/权重/旧候选/旧出版/默认/六保护文件前后pin保持。

[结果](../../../../output/shared-adaptive-display-1003-r1/result.json)，31,358B，SHA256 `f7033de140d05d121c8b6ab8ae4067da2f8b067890d018b845911706fffc4c81`；candidate SHA256 `7a4e8f6dd8dbcbcf29520c378323e0e112c811e1904c44b87ddf7bd4e8e43bb7`。完整science有效4,194,304，处理内区资格4,047,878，强结构保护1,814,694，三带条件比值到达1,100,877，显示估计改变2,194,897、RGB改变2,130,715。门槛到达不是置信认证，未达仍不作科学缺测。DETAIL RGB改变0，不能据外围改善宣称完整细节质量。

实际kernel wall 861.55s、process CPU 858.56s；含缓存源准备/序列化/检查总wall 875.00s、CPU 871.91s。当前Python峰值working set 1,118,216,192B，包括retained FITS、mmap/master、输出和库临时资源；最多retained stencil153,354,240B，64个32行chunk。局部4.05倍不外推整链；新算法比旧固定算法更重，两个策略不同，不宣称整图加速。这不是目标手机、服务峰值或4GB/16GB生产容量验收，离线源处理不能按用户实时执行。

新候选11文件logical 68,590,158B，Windows FileStandardInfo按11 unique file identities的AllocationSize合计 68,628,480B，前后metadata一致。仅新数组/诊断/三PNG/JSON，不重扫旧库存；不含FS metadata/共享内部、全链输入/rollback/备份，不能作Linux180GB余量、删旧版授权或生产保留闭合。

## 保存读回与实际观感

[读回脚本](../scripts/readback-shared-adaptive-display-2026-10-03.py)只读保存输出，直接reshape/count/求和原signed显示估计再冻结RGB，三个512² PNG逐像素一致，原coverage alpha逐像素一致。原值回退、保护/半径/资格/未达语义和外halo保持。无filter/fit/下载。[读回结果](../../../../output/shared-adaptive-display-1003-r1/readback/result.json)，20,216B，SHA256 `87fa161257d1435cdd5d9d8300f70dc69e1b8602ca455970fd2270e2566c9bb0`。

已以original detail查看[原/固定/共同孔径三级](../../../../output/shared-adaptive-display-1003-r1/readback/actual-full-lod-comparison.png)和[结构/field边界/资格边缘](../../../../output/shared-adaptive-display-1003-r1/readback/actual-boundary-and-structure-pairs.png)。外围颗粒底减轻；旋臂暖底、绿晕和标记区域仍在，颜色本身不判伪影。资格边缘[24,0,152,128]可见外八像素保原颗粒与内部平滑的过渡，完整质量继续未通过。邻行梯度仅描述，不认证接缝/配准；实际来源边界与弱结构/PSF/现场天空组合还未完整验。

[视觉自审记录](../../../../output/shared-adaptive-display-1003-r1/readback/visual-self-review.json)只属root自审。独审MISSING、普通Prepared/science registry仍空；HST M51矩形FAILED、M82输入不足、WXML FAILED_DEVTOOLS、手机/新版月面/Android-iOS和全产品混合容量均不升级。

## 唯一下一依赖

先针对已看到的外八像素颗粒过渡核真实边缘支持：复用缓存frame/geometry/原权重与noise责任，以有界边缘小路径核可依法支持的真实halo或明确窗口内支持，保内部未知/flags拒绝和重复native covariance，不镜像/复制/补零作测量、不盲改alpha。证据成立后才决定必要政策变化和一次完整输出；不重跑无变化861秒母图或已闭合局部/15孔径/旧矩阵。之后继续完整背景/弱结构/配准/加工来源和必要独审，再接正式发布采用链。原生page/来源Back和端云成本义务保留。
