# M82 恢复源的实际外侧 halo

本代完成真实母图外源供样和共同系数/noise 责任，不过滤或重写任何候选。只改 Sky 离线 `sdss_noise_display` 与 `sdss_display_recovery`、相应回归/任务及文档；其他业务逻辑、六保护、服务/watch、原科学/current-v3/内部候选保持。

## 既有 owner 的复用

既有 real-halo 投影责任提取为 typed `RealSourceWindow`，返回实际逐 field 采样、物理源边几何权重、available/eligible、native stencils 与原 overlap 校验。旧 `_project_real_halo_window` 保留 tuple 与同 coadd 数值消费者契约。新增恢复 halo 入口复用该窗口，原 cached 与 real-window 共用 `_project_scan_samples` 和 `_effective_recovery_samples` 的完整 RUN/MJD/flags/native 准入、实际 raw alternative、最终系数及重复 native ID 噪声。原科学/单纯 availability、原处理资格和恢复后源资格分别保持，没有 `q|supply` 或 padding。原 coadd stencils 在 cohort 资格确定后退休，只保留最终有效 stencils。

`project_current_recovery_halo_region` 限原最大半径 8 的真实外支持窗，要求实际 cached overlap；母图内原 qualified/strong、供样及 raw 均值必须与保存父一致，日期变化、无 overlap/无界窗、取消均拒绝。没有重选库、下载、拟合、科学 mask/alpha 或出版改动。

旧代码缺接口先失败，补共享责任后 50 项受影响检查通过，包括真实外 native 供样、原 overlap/旧消费者、实际字段系数、same RUN/未知 MJD/native model 保原、科学及权重篡改拒绝、取消及窗边界；原未知 PS_ID escaped-defect mutation 随 scan projection 责任迁至新 helper，guard 存在且逃逸仍能被检测，不删减旧检查。

## 四个真实窗口与下一依赖

复用全部十八缓存帧和原 M82 科学/当前-v3/原 adaptive 父/内部候选，四原源窗一次执行，共 65,280 个不重叠 perimeter 目标。窗口重叠按真实全源数据核，不按统计相加冒唯一供样。

|边缘|外侧供样窗内数|原供样依赖|完整供样依赖|实际合格弱依赖|旧合格无孔径|新增完整第一圆弱中心|
|---|---:|---:|---:|---:|---:|---:|
|top|57|462|503|502|206|48|
|bottom|0|0|0|0|132|0|
|left|8|155|160|131|168|8|
|right|55|585|599|566|246|50|
|合计|120 唯一|1202|1262|1199|752|106|

完整依赖 1,262 比原已知 1,202 多 60；母图外 120 个唯一供样实际存在，原数量不能覆盖所有必要目标。实际新资格而非需求决定 1,199 个弱目标可进入共同孔径；旧 752 中 106 第一圆完整不等于 ratio 已达、最大有效半径或画质通过，其余不得桥接。Outside-source influence 只进入原母图最外八像素，原完整内部以距边≥8目标为范围；不把未知母图外供样倒填为上轮已经实测。实际角色图已查看，它不是新 RGB 或图质验收。

根原帧读回直接计算四窗口的原 WCS/native 四地址、真实物理边权重、原/替代 RUN cohort/MJD、flags/PS_ID/noise、最终系数和 source qualified/strong。全部 592,128 个 raw gri 标量（包含交角重复）、有效权重、eligible/qualified/strong、供样和第一圆支持均精确，四个交角全支持重叠精确；21 个原 native ID/系数/条件噪声/Cauchy 原帧均值见证一致，f32 原均值误差在实际贡献推导界内。没有重跑 producer projection、过滤或旧完整母图/内部候选；本次仍为自审，独立审查缺口保留。

初始执行 task 将一般 perimeter 完整源支撑见证误命名为 `previously-blocked-target`，它未按旧缺孔径 mask 选择。当前脚本只改该名称为 `perimeter-source-support`，实际旧执行 archive/原证据保留，读回逐项明确真实 role，未以这些见证宣称它们都是旧缺孔径；表中 106 则从正确旧 mask 和实际全第一圆核得。数值 owner/保存采样未变，不重复投影以改标签。

## 执行、资源和保护

完整四窗并保存/核验总 13.110829 秒、CPU 13.03125 秒；逐窗约 2.015663/1.415051/1.674943/1.614021 秒。Python peak working set 1,165,950,976 B、peak pagefile 947,118,080 B 为离线本地进程测量，不是客户端/服务或整体端云容量。

测量前实际新源窗口、见证、读回 44 文件、逻辑 2,974,977 B、Windows unique allocation 3,059,712 B；44 identity/link最大1，前后稳定。测量自身/后续 docs/checkpoints、旧科学/源/候选和文件系统内部/快照不在其中，不冒 Linux 物理 retention、180GB 剩余或全小程序 200DAU 混合容量通过。

实际处理前后 r83 378 原源码仅两个 Sky 离线 owner 与旧回归 mutation 归属改变，旧源码已 byte-exact archive；4,109 旧 evidence、6 保护精确。分支/HEAD 与既有进程启动时间保持，暂存0；无 source 获取、提交推送、原进程重启、普通 Prepared 采用、部署或发布。r84 后置 checkpoint-continuity 由下代 pin。

## 证据与当前状态

- [真实四窗消费者](../scripts/experience-m82-recovered-halo-sources-2026-10-04.py)、[直接原帧读回](../scripts/readback-m82-recovered-halo-sources-2026-10-04.py)、[资源/字节收口](../scripts/close-m82-recovered-halo-sources-2026-10-04.py)；执行源码在各 output archive。
- `output/sdss-m82-recovered-halo-sources-1004-r1/result.json` SHA256 `a33d941280a00732ce1257589bde10fe1641e141ba345a077d219a40bf3cc064`；四完整 sampling/NPZ 与21见证分别外部 pin。
- `output/sdss-m82-recovered-halo-sources-readback-1004-r1/result.json` 完整原帧/唯一外供样/重叠/历史 role 校正；`allocation.json` 记录真实测量。
- before/after、实际运行和 root-readback 日志保持本任务 evidence，缺接口失败不被后续通过覆盖。

下一步沿现有源窗口与 targeted 共同孔径 owner，对真实 1,262 依赖按实际资格处理，保 original strong/unknown/same RUN/no supply、未受影响当前值/完整内部、原科学 coverage/alpha/frozen recipe；补明确新 full candidate/processing 与当前内部父/真实外 MJD/coeff/noise lineage，原 candidate 不覆盖。完整孔径估计/诊断、三级 mean→f32→原 RGB、原 alpha/WCS 读回及实际全图再核，然后处理残余背景条带/弱结构、实际逐星逐带配准/PSF与来源权利/完整出版链。当前没有新 RGB，旧图質仍失败，Prepared 空、独审/W3暗区/strict SourcesBack/WXML手机/静态物理引用retention/混合成本容量及原33义务开放。唯一顺序见 PLAN。
