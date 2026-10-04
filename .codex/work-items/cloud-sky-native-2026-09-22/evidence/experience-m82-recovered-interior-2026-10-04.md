# M82 当前恢复源的完整内部增量

本代只修改既有云观星离线 `sdss_display_recovery` 的内部调度与不完整候选导出责任，新增相关回归、实际消费者、读回及任务记录。未改其他业务逻辑。普通 Prepared 仍为空，未采用、发布或部署。

## 实际实现与输出

`refine_current_recovery_interior` 复用现有真实 RUN/MJD/flags/native 供应、raw sampling 和共同孔径 regional owner，以已有 64 行块遍历保存供样在母图内的最大圆依赖；需求用于调度，不能作为资格或新科学 coverage。每块 source stencil 随 regional 调用释放，仅保存数值报告和目标估计/诊断。新候选版本为 `sdss-current-recovered-source-aperture-interior-candidate-v1`，旧 current-v3、原科学、权重、冻结 recipe 与真实日期谱系保持。

- 实际内部需求 96,349、23 非空块，与 r82 保存块边界及数量逐项一致。母图内 supply 仍 13,096；没有重做原 4M 全域过滤、coadd、拟合或源获取。
- 实际合格弱目标 82,999，改变 52,876 个估计位置。80,772 个有正半径的真实共同 raw 均值、2,227 个保粗 raw 结果全量读回一致；未受影响及原强 signed 估计精确保原。
- 全候选实际诊断 qualified 4,121,691、protected 1,019,966、reached 1,164,632；半径 `-1/0/1/2/4/8` 分别 `107346/1019966/44937/209277/621767/2191011`。这些是本次版本下的诊断，不是全面源资格或质量完成结论；外围诊断明确保留父历史状态。
- 三级 mean→f32→原 frozen RGB、原 alpha 与同 WCS 完整读回；对 current-v3 的 RGB 改变为 OVERVIEW 5,021、MEDIUM 1,879、DETAIL 0。中心/漫散/field-transition 原 patch 无供样、无变化；background/qualification-edge 完整 patch 分别 3,740/5,683 RGB 改变，不能把旧 112² regional 数量直接当新 128² 数量。
- 十个按实际新孔径分层选取的原帧 native 证据，以直接 WCS/四地址、重复 native ID 字典聚合、真实条件噪声与跨 field Cauchy 重核均值、RADII/abs-ratio 停止与 reached，精确一致。raw 原帧和保存 f32 均值差异在从实际贡献推导的舍入界内。

候选完整数组与三级图存在独立输出目录；“完整内部”只指当前母图内已保存 supply 的依赖完成。母图外供样尚未实测，若真实外窗口发现新的恢复供样，还须处理它真实影响的内边缘，不能以当前 96,349 或外侧 1,202 为上限。

## 已知失败及修复界限

新接口在旧代码先失败。本次提取既有圆影响责任时遗漏区域 `shape`，相关测试出现 5 个 NameError；修复局部变量后 38 项影响检查通过。失败日志均保持，未改变测试预期规避实际错误。

首次整图读回错误地把候选外围保留的历史 q 当成孔径使用的真实源资格，465 个内部孔径因此失败，全部缺口位于保留历史诊断的外八像素。此为读回混淆责任：内部目标可以使用母图内边缘的真实 native 支撑，而未处理外侧目标的诊断不能被冒充为更新。r2 只修任务读回，重新投影 23 个已执行的有界源支持窗、验证原 sampling/权重 hash 与跨窗重叠，获得实际 source q/protected；另十个 17² 窗口作原帧噪声见证。未重过滤候选，未覆盖初版失败输出，未用 `q|supply` 假补资格。

实际全三级对照及五 patch 对照已查看：部分有供样条带颗粒减轻，无供样条带、暖底与细档颗粒仍在，完整质量保持未过。DETAIL 无改变不能代表它通过。绝对配准、实际逐星逐带配准与 PSF、弱结构/背景、完整来源/rights/出版链和独立审查仍缺；本次为根 agent 读回与自审，不能代替独立审查。

## 时间、资源与保护

实际内部处理 45.481013 秒、CPU 45.296875 秒，Python peak working set 1,145,786,368 B、peak pagefile 1,027,629,056 B。单块所留有效 stencil 数组最大 26,357,760 B，仅是该数组账，不等于处理临时峰、native/GPU 内存或端云容量。逐块日志记录了进度及进程内存；没有根据离线数字修改客户端预算、队列或缓存框架。

本代新候选/旧失败和当前读回在测量前共 33 个文件、逻辑 75,379,759 B、Windows unique identity 报告 allocation 75,452,608 B，identity 33、最大 link 1、前后稳定。测量输出自身及后续 checkpoint/docs 不在该数中；不含旧源/旧代、文件系统快照元数据、Linux 物理 retention 或全盘余量，不作生产 180GB 或全小程序 200DAU 容量验收。

实际处理前后 r82 的 374 原源码中只有 Sky 离线 owner 改变，旧 owner 从 r82 guard-close archive 核验；6 保护及 4,063 旧证据精确。原分支/HEAD、BFF/watch 进程及启动时间保持，无暂存、提交、推送、服务重启、源下载、部署或普通采用。收口后的 r83 字节归因另见 checkpoint-continuity，后代须 pin 该后置 sidecar。

## 直接证据

- [实际执行脚本](../scripts/experience-m82-recovered-interior-2026-10-04.py)、[完整读回](../scripts/readback-m82-recovered-interior-2026-10-04.py)、[资源与边界收口](../scripts/close-m82-recovered-interior-2026-10-04.py)。每次实际运行的源码在对应 output 独立 archive。
- `output/sdss-m82-recovered-aperture-interior-1004-r1/result.json` SHA256 `5f0bc5b10e1a9edb7d8adfa6feedb5f807868b1d44a3a29bba51f80030eaf06e`；其 candidate/report/三数组、五诊断、三 PNG 与输入 before/after 分别绑定。
- `output/sdss-m82-recovered-aperture-interior-readback-1004-r2/result.json` SHA256 `81b47baf91d8e729984d70b697b1799df9539d5f7549c83640d73616d7bb4f00`；实际对照为 `actual-full-lod-pairs.png`、`actual-patch-pairs.png`，资源 `allocation.json`。
- 失败读回目录 `output/sdss-m82-recovered-aperture-interior-readback-1004-r1`、`recovered-interior-before/after/after-r2-2026-10-04.txt`、真实执行/读回 r1/r2 与 support-diagnosis 日志均在本任务 evidence。

## 当前依赖

下一责任沿既有 real-halo/source-window 完成真实外侧 native 原源、完整 cohort/MJD/flags/noise 与几何共同系数。外侧 1,202 个已知依赖位置、旧 752 原 qualified 无孔径为不同集合；实际母图外供样和其向内依赖未核，必须由真实源发现，不 padding、猜资格或设样本上限。当前内部 candidate 作为精确父增量复用，不重过滤原内部或原母图；真实新依赖仍需核其受影响估计。原 33 义务、W3 暗区、strict Sources Back、WXML/手机新月面、静态物理引用/retention、混合成本容量和独审保持原缺口。唯一执行顺序见 PLAN。
