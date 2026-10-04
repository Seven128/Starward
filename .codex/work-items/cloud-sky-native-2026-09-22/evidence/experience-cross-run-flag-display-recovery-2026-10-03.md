# 实际跨扫描支持与有标记显示恢复（2026-10-03，开发候选）

Goal active、无预算、未完成；固定工作区/分支/HEAD，六项保护文件保持。此次复用全部已缓存源与旧共同显示估计；没有新影像下载、旧过滤重跑、统计重拟合、普通registry、发布或服务重启。独立审查 **MISSING**，整体图质 **UNVERIFIED**；M51原照片矩形 **FAILED**、M82完整输入不足、DevTools合成失败和手机义务不升级。

## 实际扫描支持及质量限制

[跨扫描执行结果](../../../../output/sdss-cross-run-structure-1003-r1/result.json) SHA256 `5ec55ef0e46956c31e4e07a4375ccfb2e9ae086129e385e4e53d14b5d7cb80a9`，853,268B。实际run3699的gri MJD范围52704.444286–52704.44843233，run3716为52709.43854549–52709.44269181；约五天差表示真实不同扫描，不能证明系统误差独立、PSF一致或天体无时变。同run相邻field仍为重复CCD采样。

2048²母图仅236,061像素同时有两run供应（约5.6281%），222,627有两run干净processing支持；16×16块只有381/16,384全部合格。[实际全图扫描/共同显示对照](../../../../output/sdss-cross-run-structure-1003-r1/actual-run-and-common-overviews.png)已查看，大部分星系为单扫描，双扫描区域只是对角窄带。未供应预览像素黑色不当科学零值，实际PNG保独立alpha。

381块g/r/i实际扫描均值差的p95绝对值为0.007345/0.010304/0.012677，旧显示相对原共同均值变化p95为0.000241/0.000322/0.000501；单位仍为原nMgy/native-pixel有符号均值，不是统一面亮度、空天空估计、SNR或置信界。资格边界垂直70,424/水平24,570对，实际梯度及显示修正跳变保存；这不证明接缝是假象，未猜测加feather或再扣sky。不能用该小范围证明全图弱结构保真。

成熟[CCDproc蒙版组合](https://ccdproc.readthedocs.io/en/2.5.0/image_combination.html)与[Astropy真实mask处理](https://www.astropy.org/ccd-reduction-and-photometry-guide/notebooks/08-05-incorporating-masks-into-calibrated-science-images.html)支持按合格供应忽略被标记样本，所有供应不合格时不能造测量。本次复用现有NumPy加权共同均值和源资格，无新CCDproc依赖/代码复制。算法说明不提供完整未知协方差或图质准入。

## 共享离线责任与真实执行

[sdss_display_recovery.py](../../../../data-pipelines/deep-sky/sdss_display_recovery.py)只负责已知标记像素的显式display替代：原共同候选未processable，某个实际正贡献run含INTERP/SATUR/GHOST/CR时，选时间范围不重叠的另一RUN，要求其全部正贡献gri采样/processing/PS_ID/flags和现有CALIB-SKY/CAS噪声资料资格成立。按原几何权重对合格替代贡献共同归一化。相同run重复field不算新扫描；未知日期/未知资料/全部标记/无贡献保原。黑色、负值、缺测、科学可用面积分开；缺测不能补造，取消不返回部分候选。

原`sdss_noise_display.py`的纯数值层级出口抽到其`_display_estimate_products`，旧consumer继续保持原资格/version/元数据；恢复consumer有独立`sdss-other-scan-flag-display-recovery-candidate-v1`、身份/中心/science/estimate/hash资格和排他写入。三个旧noise PNG字节实际完全一致。原noise加工snapshot仍保原代码；当前数值抽取的代码hash已改变，不能把旧snapshot写成当前执行。恢复packet显式同时绑定旧过滤父证据和新执行输入/code，未重过滤。

[共享实际执行](../../../../output/shared-flag-display-recovery-1003-r2/result.json)以及[保存输出读回与53样本原因](../../../../output/shared-flag-display-recovery-1003-r2/readback-r2/result.json)成立。早期仅flags试验有13,376样本，新资格恢复 **13,323**；两者原生flags投影完全相同，53个目标因部分正贡献源的SKY低分辨率网格插值越界，未通过原生noise资格，继续原值。逐带field100/117/118实际读取均为SKY geometry缺口，科学几何均成立；不是科学缺测、坏天体或可擅自外插。计数按field/band可重叠，具体坐标保存。

恢复贡献run3699为10,748、3716为2,575；其余4,180,981像素与旧候选一致，旧98,393个保原中剩85,070仍保原。已准入替代值与早期真实扫描试验逐带精确相同。旧母图/science/joint/几何权重/冻结recipe和六项保护输入前后完全一致。新增[加工输入packet](../../../../output/shared-flag-display-recovery-1003-r2/processing-inputs.json) SHA256 `45984cfa707fe7dd8056665ff71c447671f228aca980943e862cf9be0aac40f4`，2,388,851B，仅离线开发，不是普通来源route、权利信用审查或采用publication。

三级实际保存PNG从保存估计、共同有符号块均值及原冻结recipe精确推导，alpha与旧三级完全相同；相对旧RGB改变OV1,490、MED2,049、DETAIL629像素。OV485,094B，MED500,959B，DETAIL447,958B；新candidate.json15,765B SHA256 `46d4ac28173962d52d09c575f0559959644292fdd9582e80c5a73962f5ce0d76`。新总览及细图实际查看，早期六个真实替代局部对照已查看；暖色底与细档颗粒仍存在，局部替代不是整图改善证明，不采用。

此次共享执行45.8434秒、filter/fit/source requests均0，最大**单field**stencil数组40,894,464B，新candidate逻辑文件55,976,240B。这些不是完整进程峰值、物理磁盘、手机/native/GPU或端云容量；不把离线加工时延归用户请求。旧过滤205.24秒与旧峰值仍保原运行条件。

## 失败、回归及下一依赖

早期[flags试验r1失败](../../../../output/sdss-flag-alternative-1003-r1/failed.json)为task字段名receipt/admissionReceipt；r2完成数组/PNG/保护读回后最终NumPy int64 JSON序列化失败，原result.json为0B，[失败](../../../../output/sdss-flag-alternative-1003-r2/failed.json)及执行脚本保留。新[保存结果核对](../../../../output/sdss-flag-alternative-1003-r2/readback/result.json)不把r2改判成功，且明确有53个资格差异。共享r1盲要求全部试验掩码相同的[失败](../../../../output/shared-flag-display-recovery-1003-r1/failed.json)保留；r2记录真实资格差异并严格核子集和值，没有放宽原生条件。r1 owner随后按原pin精确重建，标明后来重建，不假称原执行快照。保存输出task初次把native_geometry读成geometry的[失败](../../../../output/shared-flag-display-recovery-1003-r2/readback/failed.json)保留，只修task字段后读回，不重跑共享处理。

恢复行为、旧noise/provenance、科学pyramid/出版的42项相关检查通过；新增真实SKY越界回归后，恢复/旧noise/provenance19项通过。新责任覆盖：真实signed/black共同替代、parent保原、chunk无差、partial缺测/alpha、零贡献未知中立、同run/日期缺失/未知camera/全部flag保原、SKY不能外插、身份/变更source/cancel前中、排他保存；有界缺RUN分组mutation会错误使用同扫描重复field，当前guard检出。测试计数不代表全图、目标运行时或最终验收；此次自审不是独立审查。

收口自审又补两项真实边界：已知bad扫描的fpM也必须有非空且匹配的实际PS_ID，否则未知processing不能授权恢复；导出必须与候选冻结recipe精确相同，不能保持estimate/version而换曲线。两个有界guard-removal mutation分别复现未知身份假恢复及换recipe后PNG改变；当前拒绝。最终五个受影响owner套件 **45项通过**。新增[当前守卫实际核对](../../../../output/shared-flag-display-recovery-1003-r2/guard-closeout/result.json) SHA256 `c8c9b7d5694599c90706ff533db89dd6f1df68fddcdbb9a8599fc7e115d98ef7`：当前owner只比原共享r2执行多这两项guard，原18个actualPS_ID全部已知匹配、当前冻结recipe相同，当前guarded producer消费保存estimate的三级PNG/元数据全部字节/值保持，其余原输入仍精确。原r2执行code snapshot不修改；新的guard-closeout分开绑定原执行/current owner，没有整图恢复或过滤重跑，旧当前输入报告只保当时执行条件。随后文档更新初次因默认GBK读取UTF-8失败，在首个写入前停止，[失败](../../../../output/shared-flag-display-recovery-1003-r2/guard-closeout/document-update-failed.json)保留；r22中间检查点保当时源码/旧文档状态，当前r23覆盖，不修改历史。

唯一下一依赖继续由[PLAN](../PLAN.md)控制：完整候选背景/弱结构/单扫描和配准质量仍需真实来源与成熟处理资格，不重复本次跨run矩阵、13k恢复或旧完整过滤，也不扫gamma/sigma/gain/空中心查询。通过全图质量及来源权利/信用/加工说明审查后，才接新的正式版本/批量出版/static/API/client/已绘source-route与旧版保留成本。Prepared/science普通registry保持空。实际Back/公共时间UI/native、Android/iOS/新版月面、独审、生产真实引用/物理保留/端云成本及200DAU混合容量继续开放。
