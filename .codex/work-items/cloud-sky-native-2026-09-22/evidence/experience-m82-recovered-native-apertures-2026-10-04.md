# M82恢复后真实源系数与孔径协方差

本代沿r80唯一依赖完成有界前置；没有修改生产源码、科学母图、旧候选、coverage、recipe或普通registry。没有新的显示过滤或采用。两份task脚本复用十八缓存原帧和既有source/noise/aperture owner，未获取任何源、重建coadd、重跑全图过滤、halo或flags矩阵。

## 实际输入与职责

生产者：`scripts/inspect-m82-recovered-native-apertures-2026-10-04.py`。实际结果：[result.json](../../../../output/sdss-m82-recovered-native-apertures-1004-r1/result.json)。输入为原M82科学、已保存adaptive/real-halo父、r80真实current-recovery-v3，核全父诊断/估计及原十八source receipt。r80全368源/六保护/3975证据执行前后精确；已有原帧、源标记、噪声材料和候选未变。

五个既有128²窗口分别重读实际RUN共同正贡献、全gri native/SKY/flags、实际MJD与供给，重建的供给和原始替代均值逐值等于保存v3。4264与4294的MJD范围仍为`[52963.39881870995,52963.40296502998]`及`[52973.4152409,52973.41938722003]`；时刻分离不证明系统误差或PSF独立。

Raw display sampling view在原样本处用科学原值，在已准入供应处用原始替代均值；没有以父已过滤值作为新测量。供应处系数为真正选中RUN内原几何权重归一化，其他处保持原权重。按这些权重重新投影四邻native ID/噪声和flags，再计算conditional marginal与strong-signed gate；不是用`qualified|supply`提供资格。原ID保持，零贡献字段噪声中性；未供给处资格/strong map与父精确一致。该view不是新的科学coadd。

| 窗口 | 真实供给 | 本次窗口内区原受阻中心 | 重核后完整radius1 | 仍不完整 |
| --- | ---: | ---: | ---: | ---: |
| core | 0 | 0 | 0 | 0 |
| background | 503 | 423 | 302 | 121 |
| diffuse | 0 | 0 | 0 | 0 |
| field-transition | 0 | 287 | 0 | 287 |
| qualification-edge | 738 | 574 | 504 | 70 |

内区为窗口自身8像素边界内，不能将这些数量换算成全图39876中心的比例或覆盖。806中心取得真实共同第一圆支持，全为弱中心；仅说明可以进一步检查共同孔径，不表示已经平滑或完整质量通过。原752全图边外未归因位置仍未处理。1241供应样本若保原coadd系数，其均值全部不能吻合实际恢复结果，必须保留真实替代系数/时刻责任。

## 协方差与直接原帧读回

每个有新增支持的窗口取五个按坐标排序的确定性孔径，共10个；每孔径中心和四轴邻点完整合格，strong neighbour排除责任沿原owner。本代这些孔径五点均弱。

`aperture_variance_upper`与独立dictionary按native ID先合并系数后平方的计算一致。每field内重复native contribution非零，不能假设目标像素独立；跨field仍用Cauchy upper，未知sky/systematic/处理/PSF不作零或已认证误差。真实upper与错误目标独立算法的比值范围`1.6561341455926932–2.0279847014217824`。已过滤父均值与raw source均值在10孔径均不相同，不能拿前者重复作为测量。

根读回：`scripts/readback-m82-recovered-native-apertures-2026-10-04.py`，成功[r2 result.json](../../../../output/sdss-m82-recovered-native-apertures-readback-1004-r2/result.json)，SHA256 `e2de8da2d6b4ea25343acccdcc93659f9ea0f9afa102d291772d78de2d544c60`。直接按native ID索引原帧值，并核原WCS四地址/有效权重/实际SKY-camera noise；完整同ID两两协方差矩阵与孔径owner一致。直接原帧加权均值与保存f32 raw view均值最大差`6.210363993897072e-10`，在逐孔径原贡献推导的float32 roundoff界内；这不是像素/配准容差。

首版reader在不贡献的画幅外字段把负sentinel ID误当实际四地址而FAILED；[r1失败](../../../../output/sdss-m82-recovered-native-apertures-readback-1004-r1/failed.json)及执行脚本保留。r2只修task读回，以真实四邻geometry区分地址、零系数不索引raw；没有改变owner、数据、资格或主生产者，没有重投影五窗口或过滤候选。成功为根自审，不是独立审查。

实际[角色图](../../../../output/sdss-m82-recovered-native-apertures-1004-r1/actual-native-support-roles.png)已查看：新增绿点在两处真实跨RUN条带邻域，core/diffuse/单RUN交界保持。图展示source support，不展示修复后的RGB；旧全图斜向颗粒条带、暖底/细档颗粒仍未过。

## 资源与边界

五窗口读取/计算计`7.771284899907187s`、CPU`7.734375s`；Python peak working set`703897600B`、peak pagefile`862113792B`。同时记账的原/有效stencil及有效weight数组最多`31064064B`，不是进程总峰或端云内存。

[allocation.json](../../../../output/sdss-m82-recovered-native-apertures-readback-1004-r2/allocation.json)复用原Windows FileStandardInfo/FileIdInfo仅测本代生产者/两reader代（含失败）：31文件、logical`1716310B`、按31唯一identity reported allocation`1773568B`、最大link1、前后稳定。排除该报告、task/docs/checkpoint；未扫旧数据或删除，不认证Linux physical retention、180GB全盘或200DAU混合容量。

本代只新增Sky task读回及对应文档/Context/checkpoint，无生产代码或其他业务逻辑修改；原BFF PID24040与watch PID18132启动时刻保持、六保护文件精确、无staging/提交/推送/部署/发布。普通Prepared仍空；DevTools WXML Canvas失败、手机/newMoon、完整品质/配准PSF、来源权利与完整publication、strictBack、真实静态引用/保留/成本容量及必要独审等原33义务保持原状态。

当前推进只由PLAN顶部控制：真实系数/native协方差小路径已成立，下一将这份实际责任迁入已有恢复/共同孔径owner，对真实依赖改变的目标有界增量。不得把本诊断复制为第二套生产准入、重复过滤整图或用806作为需求上限。
