# 真实外侧halo与仅边缘更新

沿唯一PLAN B，上一代[完整候选](experience-shared-adaptive-display-2026-10-03.md)已看到强制外8px保原颗粒带。本轮复用现有缓存frame、原WCS及物理CCD边界权重，取得真实外侧支持并更新整个65,280目标的裁边环；没有重新执行861秒整幅过滤、镜像/复制/补零或改变alpha。普通registry/default/正式发布未采用，独审MISSING。

## 共享责任和失败修复

`sdss_gri_tan.project_frame_window`负责原目标坐标（可负/越过裁边）到真实源四邻采样；保存行仍以原master尺寸翻转FITS y。旧`reproject_band`已迁移此责任。`geometric_field_weight`负责共同gri有限支持和到真实源CCD边界的最小距离+1，旧mosaic与新halo共同使用；该权重不是目标窗口边界、亮度/置信或噪声权重。没有新WCS缩放、配准shift、扣sky或源下载。

`sdss_noise_display._project_real_halo_window`沿原source/camera/SKY/fpM准入，将外侧真实样本coadd；每个窗口重叠内的projected数据/footprint/finite、共同权重/科学/availability逐值核原cache，冲突拒绝。重复native ID及跨field Cauchy条件上界保持；外侧科学或模型/flags缺失不能当零、复制图内边缘或桥接孔径。原source/科学/weights不覆盖。

首次新检查复现single partial错误：共同coadd缺带时清掉其他带已存在的独立样本，触发`science_overlap_mismatch`、3项中1错误/exit1。已区分single独立样本保存与共同颜色资格，保已有带、仍拒不完整颜色；修后5项real-halo检查通过。检查另覆盖真实外侧非复制、flags外侧阻止平滑、源权重错、edge-only内部保持/原alpha、取消无半成品、假标v2政策拒绝/重复refine拒绝。旧gri19/display14/master4受影响检查通过，不替代真实图质。

统计勘误：已执行consumer结果的scope文字仍有64896笔误，保持执行文件和hash不改；实际代码按2048²−2032²计算，candidate.edgeTargetPixels及数值读回edgeTargets均为65,280。先前进度中的数字同步纠正，无需重新加工。

## 九处实际资格

[消费](../scripts/experience-sdss-real-halo-2026-10-03.py)用实际六field/18frame/fpM/CAS与原2048²coadd，九处实际边/角窗口包括已观察[24,0,152,128]及四角/四边中部。缓存重叠逐值精确、窗口内原内区估计/半径/门槛/保护与父候选精确，科学请求0/fit0/旧filter0/整幅filter0。来源/保护文件before-after pin精确。

[九处结果](../../../../output/sdss-real-halo-1003-r1/result.json)，27,890B，SHA256 `ea6ab2bb96e70e2d781f066d1a11d86d869d650edcd8f5275382c5c5c563598d`。观察到的top窗口1024边中心中979估计/787RGB改变，top-mid原样，其他窗口实际改善与保原分开。已查看[三列实际边缘](../../../../output/sdss-real-halo-1003-r1/actual-edge-comparison.png)：原强制颗粒条带消除，真实资格不足处仍有原grain，不能据此认证全部边/完整弱结构或“更黑=无天体”。

[外侧真实支持读回](../scripts/readback-real-halo-noise-2026-10-03.py)使用保存window/stencil，在三个当前边中心直接累计均值并形成dense H diag(V) Hᵀ，确有裁边外真实样本参与；已选均值float32与保存输出精确，三带条件比值到达与保存reached一致。无生产helper导入/重新filter/源请求。这是root独立算术路径而非独立人员审查。[结果](../../../../output/sdss-real-halo-1003-r1/readback/result.json)，4,653B，SHA256 `3d47c735847483133ec86b47f30c8cfa7fd0a94c090203c5156b6d755fb99ce7`。

## 完整边缘增量

共享 `refine_adaptive_real_halo`从已绑定v1候选开始，四个真实halo窗口top/bottom含角、left/right除角；环每个目标一次，内部不再过滤。未知外侧阻止扩大并保最后真实有效结果/原值；gri同支持、强正负单带全色保护、取消无半成品、science/alpha保持。新显式版本`sdss-common-adaptive-real-halo-display-candidate-v2`记录父估计/诊断hash、来源、政策、4窗口、原内区精确和whole filter0；旧v1仍可读，假标v2缺政策拒绝，已v2不能重复refine。不是旧科学出版冒充新测量。

[实际四边消费](../scripts/experience-shared-adaptive-real-halo-2026-10-03.py)与[结果](../../../../output/shared-adaptive-real-halo-1003-r1/result.json)，25,908B，SHA256 `551e63490d6369f436d82a0666f8f0980000e00abda3923e19ff665d3c48ea2e`；candidate SHA256 `110462fb0d487009b03f221a013f1387f7ab27812ed9c7394bece1aab05bc1ee`。65,280目标中54,514估计对父版改变；父版内部全部估计/四诊断精确、九处小路径输出精确、所有原输入与六保护pin保持。ring内64,119中心noise资格、8,637强结构保护，1,161真实中心资格不足；还有965已qualified中心第一有效孔径被邻域缺口阻止（非虚构外侧支持）。旧science availability仍4,194,304。

实际refine wall 22.53s/CPU 22.44s；含缓存准备/保存/读回前核查wall 36.03s/CPU 35.86s。Windows Python峰值working set 1,119,002,624B包含sources/master/父和新output/库，不是手机、服务或生产容量。当前最大retained stencil46,365,696B，仅4窗口；不把它当整个进程或全产品峰值。

新候选11文件logical 68,591,336B，API-reported按unique identity allocation 68,628,480B。只测新候选不重扫旧库存，不含FS metadata/全链/回滚备份，不作Linux180GB余量或旧版回收许可。

[保存数值读回](../scripts/readback-shared-adaptive-real-halo-2026-10-03.py)不filter：完整内区估计及诊断精确，saved signed mean→冻结RGB三级PNG逐像素精确，原alpha精确。对父版OVERVIEW3227 RGB变、MEDIUM/DETAIL0；source science/recipe/default保持。[结果](../../../../output/shared-adaptive-real-halo-1003-r1/readback/result.json)，21,996B，SHA256 `e42f68dd374a272ab59030bc3a0fb5ec5d97051e20358966ca4244ce62453b6b`。已查看[完整三级](../../../../output/shared-adaptive-real-halo-1003-r1/readback/actual-full-lod-comparison.png)和[结构/边界](../../../../output/shared-adaptive-real-halo-1003-r1/readback/actual-boundary-and-structure-pairs.png)，原强制grain条带的修复有实际输出；暖底/绿晕/标记区域和完整配准/弱结构质量仍开放。色本身不判伪影，中心照片未改不能宣称中心质量通过。[自审](../../../../output/shared-adaptive-real-halo-1003-r1/readback/visual-self-review.json)不是独审。

## 下一依赖与保留状态

当前强制外8px颗粒条带责任已在上述实际源支持范围修复。下一项核最新adaptive-real-halo baseline消费既有已qualified other-RUN flag alternative，先校旧源/science/recipe/epoch及保存supply pin与新父一致，再以共享恢复责任更新已知flags；复用原13k supply而非重跑旧跨run/恢复矩阵，保53 native资格缺口/同run/未知/无供应及不相关值、取消和完整来源谱系。它只修真实有供应的flags，不支持全图弱结构或de-green。随后继续背景/弱结构/PSF/配准、加工来源完整合同和必要独审，再接正式采用链。

普通Prepared/science registry仍空，完整质量NOT_PASSED/独审MISSING；HST M51矩形FAILED、M82输入不足、WXML FAILED_DEVTOOLS、设备/新版月面/Android-iOS、实际page/Source Back和端云/200DAU混合容量均不升级。原分支/HEAD/服务watch未迁移或重启，没有提交/推送/发布。
