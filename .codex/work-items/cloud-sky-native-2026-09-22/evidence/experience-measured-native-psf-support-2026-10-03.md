# 真实原生PSF对应、成熟子像素与中心诊断

沿[唯一PLAN](../PLAN.md)质量材料缺口，复用既有已核六字段psField、fpM/CAS和实际目录，补**原生测量对空间模型**，不重复旧17×17 PSF/宽度矩阵、173条坐标诊断或查询。没有科学源下载、科学/候选/权重/WCS/recipe/PNG加工变化；不是完整PSF匹配、背景修复、图质通过或普通采用。

## 真实数据与原native模型

[原15检测](experience-sdss-measured-star-registration-2026-10-03.md)是在当前2048²目标内已qualified的检测，不是15独立恒星/曝光或需求上限。本轮沿原实际objID/field和逐带目录中心减0.5取原生41×41有符号样本；实际只有3699/99、101和3716/116、118四字段，分别3/6/4/2条。中心3699/100与3716/117仍没有被原查询供应的星点，未重查已知空表。真实camera/SKY模型、原四类processing拒绝、matched actualPS_ID、field-specific signed51×51全部basis由既有owner消费。

空间相对kernel归一化只用于诊断幅值，保负瓣；这是有限模型样本，不认证总通量、FWHM、目标coadd PSF或真实扩展源颜色。当前诊断radius12内45带cut都finite、noise-model可用且无INTERP/SATUR/GHOST/CR排除；这只是当前选定点的小支持。采用现有四邻采样器以实际分数中心采样template，NumPy weighted linear least squares拟relative PSF幅值及局部常数/x/y平面。平面是小窗口nuisance，**没有从科学/星系/完整背景扣除**；固定noise仅条件原生对角模型，PSF/sky/centroid/系统/混叠误差不含。

[首次task r1失败](../../../../output/sdss-measured-native-psf-1003-r1/failed.json)因误用不存在`PsfField.kernel`，在首个fit前停止；原已读source/input与executed-script保留，不把工具成功升级。修任务为现有`reconstruct`API，不改生产reader。独占[r2消费](../scripts/experience-sdss-measured-native-psf-r2-2026-10-03.py)及[结果](../../../../output/sdss-measured-native-psf-1003-r2/result.json)：251,526B，SHA256 `d1e4d98f6c2c02ba34fc34bc84c2f4b4ebe858c3a38d32f0634e88442b09a804`；原科学/source/default/六保护before-after pin保持；7.405秒仅本机读cache/诊断，不作服务/手机容量。

已查看[actual native/model/residual](../../../../output/sdss-measured-native-psf-1003-r2/actual-native-model-residuals.png)，模型 broadly对应点源，但几颗亮星有核心残差，不能把双线性采样误差一并归因给真实源缺陷。

## 成熟工具与有界对照

[Photutils PSF matching说明](https://photutils.readthedocs.io/en/stable/user_guide/psf_matching.html)要求共同grid/scale、输入模型及处理近零OTF；窗函数会抑制真实高频，不能从旧noise-effective宽度标量或现成kernel倒推已匹配。当前不装自造匹配器/不直接做全图反卷积。[ImagePSF](https://photutils.readthedocs.io/en/stable/api/photutils.psf.ImagePSF.html)提供fractional-location的三次RectBivariateSpline模型，有限模型归一化仍有通量边界。

一次在隔离`output/sdss-psf-tools-1003-r1/python-deps`安装Photutils3.0.0/SciPy1.17.1 wheel（`--only-binary --no-deps`），沿原NumPy2.5.3/Astropy8.0.1。没有替换原依赖目录/修改产品package或生产模块。[实际pip报告](../../../../output/sdss-psf-tools-1003-r1/pip-report.json) SHA256 `2ab7ef4a01944232c5aba576198709102f55c764bb2b802e4c3991ab9bbb6d45`保源URL、wheel SHA、版本。实际METADATA/许可证含Photutils BSD-3-Clause和SciPy及其binary vendor许可，安装完整保留；代码以标准公开API复用，没有复制旧SDSS GPL/权利未知archive算法源。两wheel pip显示下载约36.5+1.1MB，近似进程输出，不冒精确网络/计费字节。新tool2973文件logical144,362,206B；不含pip缓存/全库存/Windows物理分配或Linux180GB结论，没有清理/新增付费设施。产品依赖/普通registry/权益采用未变。

[一次成熟采样对照](../scripts/experience-sdss-imagepsf-interpolation-2026-10-03.py)直接复用保存45组native/kernel/variance/support，未重读或重投影frames；固定原目录中心、相同四linear参数，只换成ImagePSF cubic。整数位置与kernel精确到roundoff、越过kernel显式NaN不外推，已知signed nuisance-plane控制成立。[结果](../../../../output/sdss-imagepsf-interpolation-1003-r1/result.json) SHA256 `9a0477e9b21ea9dfc918b2ee82381a7ce271af0c6cb14aca64aa4c29f25b6ad2`；0.442秒本机后续采样/fit。多数点改善，部分亮核仍高残差，不能无限选插值/参数。

因实际残差持续，新增一次[局部中心nuisance诊断](../scripts/experience-sdss-imagepsf-centering-2026-10-03.py)，复用ImagePSF+Astropy Planar2D/[TRFLSQFitter](https://docs.astropy.org/en/stable/api/astropy.modeling.fitting.TRFLSQFitter.html)。同radius12/source/noise/support，中心仅同一原像素cell[-0.5,+0.5]、max100评估，拟PSF幅值/xy与plane，无sigma/shape/原点搜索、无全场WCS shift。45个fit正常收敛、没有达到中心边界；已知signed-plane/真实kernel/分数中心的算术控制成立，不是新真实星点。

[中心诊断结果](../../../../output/sdss-imagepsf-centering-1003-r1/result.json)：69,211B，SHA256 `fc4eafae57fb2993c1339135c974d0923328689d8244877341110fa8932952b7`，0.988秒。本轮条件χ²/dof的min/median/max如下，前三列4参数、后一列6参数，增加自由度和native模型遗漏意味着**不是质量阈值、独立PSF真值或置信验收**：

| band | bilinear固定中心 | cubic固定中心 | cubic局部中心 |
| --- | --- | --- | --- |
| g | 0.922/1.275/7.033 | 0.880/1.136/7.901 | 0.880/1.011/7.657 |
| r | 0.932/1.721/24.782 | 0.913/1.450/24.038 | 0.910/1.070/13.952 |
| i | 0.867/1.491/23.458 | 0.861/1.174/26.225 | 0.835/1.033/6.731 |

两颗3699/101亮星r条件统计仍13.952和8.808，3716/118亮星i仍6.731，核心残差仍见[actual local-center model/residual](../../../../output/sdss-imagepsf-centering-1003-r1/actual-local-center-model-residuals.png)。这说明在当前模型/采样/局部背景/未知blend等假设下仍有差异，**没有定位唯一源缺陷**。不能据其颜色重写源/全图去绿、把center nuisance当DCR修正，或推广到未被测的中心/其他曝光/扩展结构。

## 保存读回与当前决定

[读回](../scripts/readback-sdss-native-psf-2026-10-03.py)未导入生产fit/helper或ImagePSF类、未重跑optimizer；用row-first SciPy spline独立核采样/局部模型/残差，normal equations核固定中心四参数，保存条件统计一致。wrong-kernel-axis控制最大模型差6.734，不能用“恰好kernel对称”掩盖索引错。[结果](../../../../output/sdss-imagepsf-centering-1003-r1/readback/result.json) SHA256 `8d8996e2eb24dc7982752218db5b7b12013144169d1a76832b3a4467df50a0ff`。这是root另一算术路径，非独立人员审查；[actual自审](../../../../output/sdss-imagepsf-centering-1003-r1/readback/visual-self-review.json) MISSING独审、NOT_PASSED整体质量。

**当前决定：** 已有成熟kernel工具与真实非中心对应，仍不批准整幅PSF matching或背景/配准通过；中心/扩展PSF与目标网格/混合贡献模型缺口保留。没有再查询旧目录/重跑45fit或调sigma阈值的依据。接着先补当前adaptive-real-halo→known-supply recovery的完整加工来源packet：明确原科学、显示处理和科学mask/alpha、父/供应/当前code/版本/模型/epoch、不可忽略的PSF/背景/配准限制及来源信用/权利/加工说明，再接后续有实证的质量处理及正式批量链。当前noise-v1 packet不是新v2链的完整出口，不能只换名/adopt flag。

完整背景/弱结构/绝对和逐像素配准、来源出版/必要独审/端云成本、HST矩形FAILED/M82缺输入、空registry、DevTools FAILED_DEVTOOLS、Android/iOS/新版月面/实际page Back均保原状态。原Goal active无预算，原工作区/分支/HEAD与有效服务watch保持，没有提交/推送/云部署/发布。
