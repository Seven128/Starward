# M82 显式新版 noise 增量与完整三级读回

2026-10-04，r94。仅云观星共享离线科学/显示责任、回归、任务与对应文档。Goal active、无预算；没有修改其他业务逻辑、六项保护文件、分支/HEAD、既有 BFF/watch、默认 registry；无提交、推送、采购、部署、发布或新天文数据获取。

## 完成的责任

新增共享 owner `data-pipelines/deep-sky/sdss_noise_model_increment.py`，显式类型/version 为 `sdss-retained-sky-noise-model-increment-candidate-v1`，model 为 `sdss-retained-sky-idl-bilinear-constant-edge-v2`。旧 complete-grid model、真实 typed complete 父、原科学母图和旧候选保持原字节，未将新版资格塞进旧 typed v3 或绕过旧父真实性守卫。

实际绑定 r93 整图/真实边外依赖、旧父 canonical report、旧/新 noise 实现及本次执行源码。准入检查完整最大 radius=8 circle 依赖、几何/资格与保护变化，source snapshot 包括实际 SCI、FITS receipt、WCS/PS_ID、CALIB/SKY、camera 与 native flags。每块实际消费原 RUN/MJD/known-bad 合法供给、有效系数、native-ID covariance 和 signed 共同孔径；边缘使用真实 8px source halo，与 cached SCI/availability/共同权重一致。每块实际原资格/恢复资格/强信号核对整个重叠域；source/代码前后与取消/迟到准入守卫仍有效。

完整必要 90,746 targets、23 个真实 source regions 完成，35,018 estimates 像素改变。新 qualified=4,138,282、protected=1,025,765；radius -1/0/1/2/4/8 分别 88,258/1,025,765/42,728/205,871/621,736/2,209,946。两条 r92 实际 bounded consumers 的 2,974/2,827 requested estimates、radius、reached 精确相同。所有未请求 estimates/diagnostics、旧强信号和实际新强/true-unknown compact raw 保持；科学 SCI signed/unknown、availability-alpha/WCS/原冻结 recipe 不变。

执行入口：

- [实际新版生产](../scripts/experience-m82-noise-v2-increment-2026-10-04.py)
- [保存结果三级读回](../scripts/readback-m82-noise-v2-increment-2026-10-04.py)
- [本机 allocation 与当前连续性](../scripts/close-m82-noise-v2-increment-2026-10-04.py)

生产 [result.json](../../../../output/sdss-m82-noise-v2-increment-1004-r1/result.json) 43,876B、SHA256 `806e1432da5baa543c50ec7c5cd962276bddc7d6422c5e38b50874261f03d01a`；独立 [candidate.json](../../../../output/sdss-m82-noise-v2-increment-1004-r1/candidate/candidate.json) 2,180,492B、SHA256 `fc8546dca3b06ac9aef36346598da8dc49f84b97ff425aa974abdaddf577c11b`。完整 bound dependency plan canonical SHA256 `e075c4611c2630cd8f291deb12930e4dca25d32be40b2f677601e7c033c26f7e`。executed 源/测试及关键共享依赖、23 行进度、原输入身份与新 arrays/PNG 都保存在本代目录。

## 开发验证与实际输出

新 owner 回归和受影响 complete recovery/noise provenance/source stencil/frame noise 共 30 项检查通过，见 [原日志](m82-noise-v2-increment-consumers-2026-10-04.txt)。覆盖实际新 raw/共同孔径、旧父与 model 绑定、完整真实 halo、错误强资格、source 变化、late cancellation、不覆盖旧输出和 typed 三级消费。旧 verifier 拒绝新版类型。

有界 mutation 实际移除完整 halo 守卫后，漏掉一个已 qualified、但均值应改变的弱邻目标会错误保留旧值；完整实现提前拒绝该需求遗漏。不是以 fixture 的旧 q 或空输出冒新版效果。早期五项已通过的源码/测试另存 development 目录；没有擦除旧失败或补写旧运行结果。

保存结果读回完全使用原数组，无 native noise/fit/filter/孔径重选。全 90,746 demand、新 q/strong 与旧无依赖/强信号逐值核对；三档均以 signed available means 的 float64 sum/divisor→float32→Astropy RGB 重建，完整 512² RGBA 精确。原 alpha、WCS、crop、field 和冻结 stretch=0.2358548697680099/Q=8 相同。

| 完整档位 | 改变 RGB 像素 | 新 PNG 字节 |
| --- | ---: | ---: |
| OVERVIEW | 3,300 | 516,783 |
| MEDIUM | 1,496 | 606,174 |
| DETAIL | 3 | 546,719 |

三级全页 [OV](../../../../output/sdss-m82-noise-v2-increment-readback-1004-r1/overview-complete-comparison.png)、[MED](../../../../output/sdss-m82-noise-v2-increment-readback-1004-r1/medium-complete-comparison.png)、[DETAIL](../../../../output/sdss-m82-noise-v2-increment-readback-1004-r1/detail-complete-comparison.png) 与 [全部20目录星](../../../../output/sdss-m82-noise-v2-increment-readback-1004-r1/all20-catalog-star-comparison.png) 已实际查看。20 个 OV stamps 中两处变 30/6 像素，全部原/新 maximum channel 保持；唯一 MED stamp不变，目录未覆盖 DETAIL，不能冒中央恒星/全 PSF 或绝对配准验收。

实际边缘条带部分改善，但暖核、颗粒、绿色结构及其他条带仍存在。DETAIL 仅 3 个 RGB pixels 改变，更不支持中央或整幅画质已修复。`UNVERIFIED`、`ordinaryAdoption=false`、独立审查 `MISSING` 保持；这是一份实际完整新版处理候选，不是原始 science 新测量或完整产品验收。既有完整平滑范围试验整体变暗，仍未提升默认。

## 资源与范围

实际必要增量 26.5487014s、CPU 26.46875s，offline process peak WorkingSet=1,069,813,760B、peak Pagefile=995,950,592B。18 原缓存帧复用，无新的天文请求、完整 variance/science coadd、旧 detector/PSF/native fit/146 profile/旧孔径矩阵重跑。保存 reader 1.8492952s、峰值未测；不倒填 producer 峰或把两进程资源相加。

三个新目录（development/increment/readback）共 43 files，91,746,282 logical B、91,853,248 Windows reported allocation B，43 distinct file identities、link maximum=1、before/after 稳定。包括 executed-close，排除后来 allocation JSON、本文、日志/checkpoints、旧输入/候选/deps、FS 内部、Linux 实际磁盘与保留。这不是客户端内存/目标运行时/180GB 物理保留或 200DAU 混合业务容量。

r93 的 423 source 中旧 production 均精确保持；5 个当前 Sky 文档/索引按本代推进更新，新增共享 owner/回归及3 task入口。6 protected、6,737 旧证据、workspace/branch/HEAD 和原 process start times 保持，暂存 0。具体当前 checkpoint 与 post-checkpoint continuity 见独立入口。旧失败、自审不等于独审、WXML FAILED、Android/iOS 新版 Moon、strict SourcesBack、M51/W3 图质、实际版本保留与端云容量/成本缺口均保持。

## 唯一下一依赖

执行顺序仅由 PLAN 顶部维护。本次必要完整增量已完成，不再重跑。沿已有显式离线 writer/共享出版合同接新版显示候选的小路径，先核估计层与原 science-v2/v3 的不同责任、实际 source/noise/共同孔径/recipe 谱系与旧兼容，再按实证缺口扩展；完整三级 source→API/registry opt-in→standard static→cache/Scene/rendered SourcesBack 尚未闭合。普通 registry 在完整图质/科学保真/弱结构/星体/配准、来源链与成本通过前保持空；不能用接入或降级成功替代质量。
