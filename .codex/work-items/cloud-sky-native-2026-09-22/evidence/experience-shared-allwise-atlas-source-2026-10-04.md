# AllWISE Atlas 三源共享准入与实际消费者

**云观星离线源 reader 已实现，原 M82 实际消费者已迁入；没有修复暗区或采用新图片。** 本代生产变更仅 `data-pipelines/deep-sky/allwise_atlas_source.py` 和对应回归检查；另维护云观星任务、README 和 Context。小程序/worker/其他业务逻辑未改，六项保护文件、原 BFF/watch、旧源/科学/图片保持；不请求新数据、不重加工母图、不提交推送或部署。

## 责任与边界

`read_cached_atlas_triplet` 复用 `image_quality.checked_source_files` 完整计划集、CHECKED/完整数组回执、路径边界、bytes/hash责任，复用 Astropy FITS/WCS。固定当前已资格的 AllWISE W3 native int/cov/unc 三产品，校验实际 COADDID/BAND/FILETYPE/BUNIT、plain float32 完整数组、同 SIN-grid/shape/MAGZP；未资格的压缩/scaling/distortion不静默转换。支持不同实际数组尺寸，129²是本次返回，不是需求上限。读取前后核整个输入集，取消/无效/变化不返回部分 bundle；缺数据不补零。完整科学数组与末尾 FITS padding 缺口分别报告。

原科学值包括有效黑/负值、NaN、低正coverage，均不修改。`intensity_finite`、`coverage_known`、`uncertainty_known`、`positive_contribution` 和 `supported` 分开持有；supported 仅表示有限强度、正有效贡献和已知非负unc量同时存在，不表示探测器质量、alpha、confidence、独立噪声或完整SNR。数组只读，WCS只读；不获取、不重采样、不猜sky、不创建请求/缓存框架。HiPS fixed512 reader保持自己的源意义，不套Atlas单位或native合同。

## 实际消费者效果

任务 `experience-m82-atlas-core-support-2026-10-04.py` 已删除自己的 FITS/grid/单位准入重复逻辑并消费此 owner。沿原 acquisition 的真实 CHECKED_NATIVE_ARRAY/completeArrayReceived 转入现有完整性合同，无回执就不准入。相同三缓存 FITS、同原36 ICRS TAN坐标，输出独占 `output/allwise-w3-m82-atlas-core-support-1004-r2/`；r1和所有失败字节保留。

整个129²真实patch：positive contribution 16,616，supported 16,591；**25个COV>0但int/unc非有限像素不被冒称可用科学数据**。原17有限暗核心的低正coverage不变missing，原19HiPS非finite及最近/四邻对应保持。根不同origin/显式frame计算reader复用，direct FITS masks另读回；36坐标/最近四邻JSON值完全相同，source inspection PNG字节与旧消费者相同。

实际结果见 `output/allwise-w3-shared-atlas-source-readback-1004-r1/result.json` 和 `shared-owner-effects.json`。此为root自审，不是独立审查或完整科学质量验收。

## 检查与可检出缺陷

新owner八项针对科学意义、缺产品/完整回执/hash、身份/单位/grid/calibration/scaling、科学截断与末尾padding、取消/变化的开发检查通过。仅对新机制做两项内存mutation：supported退回COV-only，以及跳过结束全输入guard，分别令对应回归failure1/errors0；恢复后两项影响检查通过。真实原129²三源也核COV-only假设会多接纳25个缺失强度/unc像素。未修改生产文件或原数据来制造变异。记录 `output/allwise-w3-shared-atlas-source-mutation-1004-r1/result.json`、两个mutant日志和恢复日志。

本代读取原 r73 checkpoint：仅显式迁移的 task producer源发生预期改变，其余源/六保护/3,472证据精确。新owner/test单独绑定。没有App/worker变更，未重复App构建、旧矩阵、DevTools启动或手机操作；已有运行时失败仍有效。

## 当前质量与下一依赖

native源检查图暗核心仍在；本共享支持规则不提供质量改善。原因/PSF/确切CDS-HiPS谱系/物理HiPS单位未知，129²不能认证完整DETAIL/三层级/全图背景或配准。普通Prepared/science registry仍空，未采用；权利信用、完整出版链、端云成本/容量、strict Back、WXML/手机/新版Moon、静态真实引用/物理保留及必要独立审查等原33义务保持。

按唯一PLAN继续B实际来源质量：复用已有SDSS M82三层成品、许可/适配与所有缓存，先核其原图/中心及完整范围、实际frame供应和加工谱系，直接比较当前source而不是再扫W3显示参数。没有完整有效供应时保缺口；已有公开成熟处理与共同owner优先，不能借光学替换认证历史12µm W3、不能恢复排除来源或凭局部好图采用普通registry。Goal active、无预算、未完成。
