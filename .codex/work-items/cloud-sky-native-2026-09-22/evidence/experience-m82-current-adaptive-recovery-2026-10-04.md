# M82 当前 adaptive 父图的真实供应恢复与残余孔径边界

**真实另一次扫描在完整 M82 范围提供 13,096 个合格恢复位置，原 qualified/强结构、其余父值、科学、alpha 和冻结配方保持；完整图质仍未过。** 本代只扩展云观星离线 `sdss_display_recovery` 及相应回归/任务/文档，未改其他业务逻辑、六保护、原服务/watch、旧素材/科学/普通 registry。Goal active、无预算、未完成。

## 先核真实供应

复用十八实际原帧、相机/SKY、已核 fpM flags、保存的 per-field science/共同权重和当前 adaptive/halo 父图。五个既有实际 patch 通过原 `_project_field`：实际 raw science 四邻与保存 projected 值逐值相同，native variance 可用性、处理关联 flags、同 RUN 全部正贡献及三带共同供给均须成立。

实际 RUN 4264 的 MJD 范围为 `[52963.39881870995, 52963.40296502998]`，4294 为 `[52973.4152409, 52973.41938722003]`，十八值均已知，范围不重叠。background/qualification-edge 的 503/738 个可能点全部通过本次完整 per-target native/RUN/时刻资格；核心、弥散和字段过渡仍无另一 RUN 供应。两 patch 有重叠，不相加、不当完整范围上限；也不把四邻模型等同于滤波后误差或绝对配准。任务 `output/sdss-m82-boundary-other-scan-qualification-1004-r1/` 保存五处供给/三带 conditional means 及真实输入；没有源请求、native flags 全矩阵重建或科学 coadd。

## 既有恢复责任的必要适配

原入口只会把父图交给 fixed-noise-v1 的 `noise_display_pyramid`，不支持真实 adaptive 父图。新能力回归在改前失败，记录 `current-adaptive-recovery-before-2026-10-04.txt`；这是新能力入口的前后验证，不把旧行为倒填为当时成功。

`recover_other_scan_display` 现在按真实 typed parent 在原 owner 验证：fixed-noise 分支和保存旧 supply 的 v2 分支保持；当前 adaptive/halo 由 `_validate_adaptive_candidate` 核来源、估计、诊断、对象、配方和策略，并明确用 qualified 保原边界。新执行输出独立 `sdss-current-adaptive-other-scan-flag-display-recovery-candidate-v3`，绑定实际父版本/估计/qualified/四诊断 hash，标明 `CURRENT_NATIVE_SUPPLY_ON_CURRENT_ADAPTIVE_PARENT`；不伪造旧 noise 或 saved supply 执行。

原 native/RUN 资格、坏贡献关联、实际不重叠 MJD、三带同权重重归一、signed/zero/negative、未知/同 RUN/无供应保原和取消规则继续使用。当前父的 qualified/强结构不被替换，未 qualified 原值回退也须匹配原科学；改 hash 不能绕过这个回退。v3 exporter 拒绝错误父版本/qualified hash/执行角色和伪造 saved-supply 字段，版本身份明确。新入口没有重复 adaptive filtering。

受影响检查最后 20 项通过：真实当前父路径/保强结构/原科学、negative/zero、原 alpha、原 fixed-noise 和旧 saved-supply 消费者、坏父 hash/诊断/recipe/身份、未知 native/SKY、相同 RUN/缺失或重叠日期、取消及错误谱系输出。初轮 18 项结果与追加两个边界后的 20 项结果分开保留；不覆盖失败，不重复旧 M51 全图/PSF/科学矩阵。根自审与测试不是独立审查。

## 实际完整输出与读回

真实 M82 2048² 当前父图通过新 shared entry，仅新执行一次 recovery。全域 flags-only 可能供应 13,138，实际 native-qualified 13,096；另 42 不因 clean flags 被错误使用。报告只把差值记为执行统计，没有将未保存的 flags-only 全域位置图冒为独立读回。所有 supply 外/当前 qualified 位置保持最新父数组，原科学/权重/原 alpha/冻结 recipe 保持。

结果 `output/sdss-m82-current-adaptive-recovery-1004-r1/result.json` SHA256 `c66c353fe2b0504fc87bbd5c02e846d0e664097d2654bc10918a24a1975f509a`。父图仍是已保存 r79 real-halo 候选，没有重建母图、获取旧源或重过滤。原 r79 当前源只允许此次 offline recovery owner 变化，并通过已存资格任务的旧 owner archive 核旧 bytes；所有其他原源/六保护/旧证据保持。实际新输入前后绑定精确，新的代码 archive 只归于新执行。

root saved readback 核完整供给 map/13,096 个估计变化、全域 outside-supply/qualified 父值、原 science hash/recipe、父四诊断谱系及三档 signed means→float32→冻结 RGB/原 alpha/WCS。五处供给及真实原样本共同权重 mean 与之前保存的资格输出精确，core/diffuse/field-transition 均零变化。OV/MED/DETAIL 分别有 2,117 / 1,865 / 857 个 RGB 像素较父图变化。

完整三档和五处实际成对图已经查看，位于 `output/sdss-m82-current-adaptive-recovery-readback-1004-r1/`。恢复只作用实际有替代的点；斜向颗粒条带仍明显，暖底/细档颗粒/完整弱结构/颜色/PSF/配准未通过。新候选不进普通 registry，不以数值正确或局部恢复取代完整图质。

## 残余条带的实际孔径责任

只读保存 radius/qualified/supply 的分类及实际 RGB 对照，未改 source/science mask 或图像。40,628 个中心本身 qualified、radius 仍负；其中原 real-halo 外八像素内区 39,876 个，全部有真实半径 1 圆内至少一个未 qualified 邻点。半径 1 的五点正是原 owner 的中心/四轴邻点，不填外侧或猜 covariance。752 个外边缘位置未在这个纯保存图诊断中归因，不能外推其原窗口资格。

恢复后还保原 72,489 个未 qualified 中心；合计 113,117 个负 radius 位置保原。background 的残余包括 465 个未 qualified 中心和 557 个中心合格但第一孔径被阻断；qualification-edge 分别 458/729，后者仅内区 682 已按保存邻点归因、47 外侧不猜。field-transition 的 323 个合格受阻中心旁有 375 个未 qualified 中心，且无另一 RUN 供应。

`output/sdss-m82-remaining-aperture-boundaries-1004-r1/actual-rgb-and-saved-roles.png` 已实际查看，斜向颗粒与这些原角色边界对应。现恢复是合格 raw alternate centre means，不重新计算周围 aperture 的实际源权重/native ID/covariance；这个保存图诊断证明当前半径被阻断，却不自动证明恢复后的整孔径可用、真实天体质量或新 filter 的效果。不可把当前已处理估计冒作新 native measurement，也不能从简单 `qualified | supply` 填造 covariance。

## 新增离线成本

完整 recovery 29.376633 秒、CPU 29.281250 秒；同 Windows Python peak working set 1,167,933,440B、peak pagefile 1,036,390,400B，包括真实源/保存 master/父/输出和临时 stencil。前置原源/证据核验和 raw parsing 另计，非整条工作时间、客户端/服务端容量或测试服/预期生产验收。

本代资格/recovery/readback/残余孔径诊断共 43 文件，logical 58,963,178B、按 distinct FileId 的 Windows reported allocation 59,060,400B，43 distinct/maxlink1/前后稳定。只测新增范围，原 science/adaptive/source/tool 不重复扫描，测量自己的后建记录排除；没有清理。不是 Linux 180GB 物理可回收保留、全工作盘或全小程序 200DAU 成本容量结论。

## 下一唯一依赖与保留义务

由 PLAN 顶部控制：复用保存 original science/current recovery/真实源，在实际残余条带先核恢复后的共同源权重、native ID 和实际噪声/协方差小路径；完整真实 support 成立才沿已有 common-aperture/halo 责任做必要目标的有界增量，保强 signed 结构、未知/无供给/真实 coverage/science，并绑定不同观察与旧/新显示语义。不可把 raw alternate centres 或已过滤估计当相互独立噪声、邻域填值或自动合格，不重过滤完整图/旧科学矩阵/母图/源获取、调参 sweep 或另建框架。

目前 `pending-m82-processing-source-binding-2026-10-04.json` 是 r79 前的只读历史差异记录。现在 M82 有真实新 v3 执行，但完整 processing/source packet 仍须按真实角色适配，不伪造旧 M51 supply/rebase。实际星点/逐带配准、PSF/完整图质、credit/rights、完整 API→registry→标准 static/cache→已绘 Sources Back 和必要独审未闭合。Prepared 普通空、W3 暗区、strict Back/WXML 失败、Android/iOS/newMoon、真实引用/物理 retention、全小程序 200DAU 混合成本容量与原 33 项义务继续保持，预期配置未部署或验收。
