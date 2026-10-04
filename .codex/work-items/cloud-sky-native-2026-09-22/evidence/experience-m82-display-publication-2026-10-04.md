# M82 显式显示出版准入与实际封包

2026-10-04，r95。Goal active、无预算。仅云观星共享离线影像/合同/回归/任务与对应文档，未改其他业务逻辑或六保护文件；workspace/branch/HEAD、原 BFF/watch 保持。没有新天文获取、原 noise/variance/投影/coadd/孔径选择/PSF-fit 重跑，没有默认采用、提交、推送、部署或网络发布。

## 实际责任与兼容

新增 `sdss-display-optical-v1` / `sdss-dr17-display-optical-publication-v1`，由 [共享合同](../../../../packages/miniapp-contracts/src/sdss-display-optical-publication.ts) 准入并拥有内容 hash。原科学母图 SCI/availability/RGB参考/冻结 recipe 与 source frames 仍是原身份；三级另行绑定 display estimates，明确不是新科学测量或测光。

新版绑定 actual candidate、旧 complete 父、scientific candidate、execution、dependency plan、原 before input inventory、11 份实际执行实现、估计及六诊断 NPY 身份。保存原/new noise model 与 parent/plan canonical SHA，固定真实8px halo/radii/ratio、RUN-MJD-known-bad 供给、重复 native IDs 先合系数再算 variance、跨 field 未知 covariance 的保守界、signed强信号与true-unknown保 raw/不跨未知孔洞等实际策略。计数及原覆盖与三个精确中心 TAN crop一致，不从显示亮度/处理资格推断科学可用度。

已有 [science 合同](../../../../packages/miniapp-contracts/src/sdss-science-optical-publication.ts) 只提取双方真正共同的原 SDSS 来源/母图/三级几何准入到同一 owner，原 v2 encoded 与 v3 原科学均值规则保持；它们拒绝新版及以 `display` 假装原科学层的声明。Prepared v1 的出版方 JPEG/AVM 重采样意义保持，不能用它包装新的 SDSS 显示估计。新版尚未增加到 package barrel/API/client/Hook/Scene；运行时仍不支持此新版本，这个依赖没有标为完成。

[离线 writer](../../../../data-pipelines/deep-sky/publish_sdss_display.py) 以 caller-pinned 原实际 producer result 准入，原档/执行 source pins、SCI与旧 typed父/raw强/无依赖保留、recipe、diagnostics和三 PNG重新读回；不重新选择噪声/孔径或 fit。输出 exclusive、拒绝覆盖任何保留目录，代码/输入事务前后绑定，late cancellation/source变化不产生可接受 manifest；失败目录原样保留。内存 report/inventory/来源冻结 byte snapshot，修改临时对象不能伪造已验证报告。

共同 [optical_publication_io](../../../../data-pipelines/deep-sky/optical_publication_io.py) 拥有原 Prepared 字节绑定、限长同-buffer decoder pin、pinned JSON 和固定 NPY header/shape/dtype/order/精确payload分配前准入。Prepared 与新显示 writer 已迁移至此 owner；Prepared 原 public errors 保持。IO导入不加载 AVM source adapter；SDSS 路径实际没有加载 pyavm，无新安装。新数组仍需 domain caller 的实际固定形状/类型，不信任 NPY 自述形状。

## 实际封包与读回

入口 [experience](../scripts/experience-m82-display-publication-2026-10-04.py)，成功 [r2 result](../../../../output/sdss-m82-display-publication-1004-r2/result.json) SHA256 `96bfe2aee05bdd3c65c0398e1edd5f321e4cb67a5e5e610a989381befd798516`。离线 [manifest](../../../../output/sdss-m82-display-publication-1004-r2/publication/manifest.json) 26,384B、SHA256 `398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a`；publication hash `74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab`，由共享 TS 准入/hash生成，无 Python 自创 hash。

保存 [TS reader](../scripts/readback-m82-display-publication-2026-10-04.mts) 实际核全部三个新 PNG、原科学/旧父/执行/计划/input收据及18原source admission/header/身份/源URL/bytes，11executed implementation bytes精确，hash绑定语义且旧science/Prepared拒绝新类型。三级 PNG与 r94新版 candidate完全同字节，516,783/606,174/546,719B；无需再次取得/滤波图像。它们与前一轮实际查看的完整OV/MED/DETAIL相同，仍存在暖核/颗粒/绿色结构/条带，不能将封包通过升级为图质通过。

之后增强并共享 NPY 分配前守卫；[当前 admission reader](../scripts/readback-m82-display-admission-2026-10-04.py) r2 以最终守卫重新准入实际新候选，三完整 saved/published PNG仍精确，另原 Prepared 2048² RGBA16,777,216B decoded payload/hash精确。仅读取已存母图，未重新跑 AVM/JPEG/source投影/Prepared pyramid。最新 guard与成功封包r2 archived owner有区别，分别保留执行事实；保存读回不冒后一版 writer另一次完整封包、HTTP/Scene/native结果。

原输入/源码 byte archive、producer/reader executed sources、原失败和 successful exclusive generations均保存。新 publication引用的源/母图/实现仍具有外部离线 dependency pins，标准静态出口只应服务已登记实际图片；这轮没有闭合跨目录保留/回滚/180GB物理预算。

## 开发检查、已知失败与资源

- [11 合同回归](m82-display-publication-contracts-r1-2026-10-04.txt) 与 package TS typecheck通过，包含原六 JPEG/v2/v3/Prepared兼容和新实际策略/cover/crop/recipe/来源/采用拒绝；结构 fixture不供真实图质。
- [30 受影响 Python 检查](m82-display-publication-affected-r2-2026-10-04.txt) 通过：共享 IO实际迁移、旧science writer、新事务/取消/覆盖/内存报告、新model owner；同大小JSON在读buffer时被换且磁盘恢复，去掉buffer pin的有界 mutation返回伪造credit，完整owner拒绝。畸形/巨大/object/Fortran/缺/多payload header在np.load前拒绝，signed负/零/NaN保留。
- 首次 [writer import失败](m82-display-publication-writers-r1-2026-10-04.txt) 因经Prepared加载pyavm，已通过共同IO责任消除耦合；旧Prepared源码完整archive不改原记录。
- actual packaging r1因错用循环残留i波段匹配所有收据而FAILED；r2仅修每receipt实际band，18原收据逐值一致，不放宽或替换science/source。旧失败/执行源保持。
- current admission reader r1在已完成new候选准入后错用task `metadata` key读取Prepared原record而失败；r2仅修成实际 `masterMetadata`，旧失败保持。没有修改Prepared master或产品逻辑来使其通过。

实际 r2保存候选验证4.8658851s、封包10.4043562s、完整task22.8323818s/本Python CPU22.453125s，peakWorkingSet605,966,336B/peakPagefile963,416,064B。Node child CPU/RSS不在这些Python峰内，不能相加或外推端云容量。TS saved reader .0484025s、最终guard reader5.0128798s，各自峰未测。

六个新本机 offline output目录，共73files、6,185,241 logical B/6,324,376 Windows reported allocation B，73独立file identities/max link1、before-after稳定；含executed-close，排除随后allocation JSON、文档、日志/checkpoints、旧缓存/候选/依赖/FS内部/Linux保留/client-server200DAU。见 [allocation](../../../../output/sdss-m82-display-publication-readback-1004-r1/allocation-and-observation.json)。这些均非目标运行时、最终质量、生产部署/容量或180GB保留验收。

r94的428sources中只两个必要共享影像源改变（原science合同、Prepared writer，各有r94精确原字节archive），其余production保持；5Sky文档/索引按本代推进。6protected、6,786旧证据和原process start保持，暂存0。当前capture/post-checkpoint continuity从独立入口直接核，不倒填旧运行。独立审查MISSING，普通Prepared/defaultscience registry空；strict SourcesBack旧像素失败、WXMLFAILED、手机/新版Moon、M51/W3图质、成本/物理保留/混合200DAU及全部33义务仍开放。

## 下一依赖

仅按PLAN顶部推进：复用既有 SDSS hash-keyed/API/来源/静态出口与 target-optical 家族的 metadata/cache/Hook/Scene，引入显式 display 版本完整 opt-in消费者及旧兼容；实际核三档资产/来源当前packet/退休/Back，不能建立第二套请求/缓存/渲染或默认注册。共享图质、来源完整链、成本通过前仍未采用。本轮封包及兼容检查不代完整体验。
