# SXT共享加工与集中复核接线（2026-10-09）

工作区/分支仍为授权目录及codex/remote-main-20260908，HEAD b73523f1。完整Goal active、无预算、未完成；不提交推送或发布。这里只关闭共享加工/复核的开发增量，不关闭完整影像供给、Scene或33项验收。

## 已实施责任

- `data-pipelines/deep-sky/sxt_processing.py`接管既有CLI模型/工具身份、GPU实际使用回执、多文件调用、原图私有staging、颜色恢复、超时/取消及进程树退休。原benchmark调用者迁往该owner，不再保留第二套批执行/ICC实现。
- `sxt_batch.py`提供绑定manifest的预检、按显式像素工作量分组、已有结果导入/当前结果复用和行级故障隔离。原来源、权利、几何仍由既有来源owner负责；这里只接已准入的完整normalized RGB工作图。星团拒绝通用去星，alpha工作图拒绝静默抹掉coverage；无1024生产上限。
- `image_quality.py`接共享结果形成完整图+ROI对照、自动字节/尺寸/ICC/输出层检查与集中异常队列。自动图像指标只告警；决定绑定精确配方和输出。`FILE_REVIEW_PASSED_SCENE_PENDING`仍不是publication/Scene采用。
- 输入改变才重新执行；损坏缓存拒绝、保留失败，不静默重复推理。vendor报错但独立完整输出仍保留为待审，不能自动通过。最终封存前再检查原图/元数据/决定，避免迟到变更被认证。

## 当前真实子批次

复用先前SXT ML11/default overlap0.2的NGC253、NGC5128、M81/M82和M8两瓦片，共5项。工具/model/输入/原回执/三输出仍逐字节绑定，**新nativeInferenceCalls=0**；没有下载原图、重跑模型或改写旧回执。旧recipe未写inputUpsample=1的兼容仅限默认未放大方法及全部实际工具/参数相同。

最新结果`output/sxt-pipeline-integration-2026-10-09/import-r2/result.json`：34,868B，SHA256 `7fa3790294c0388fb4390c98ad019a6ee1d1728a20ec9106f5a569f5316c80ea`。输入manifest 23,685B，SHA256 `d0147991f706b1a4f972d9f3c25fb42ed0aebd56b661edaec6e0e5c04097a095`。

实际查看完整/关键ROI后：NGC253当前1024工作图文件级通过，原外围背景/绝对配准及更高分辨率未通过；NGC5128喷流细丝误入stars层且有黄色残环，M81红结点误删，M8两片仍有密星细颗粒且连续区域/Scene接缝未闭合，4项`NEEDS_REPAIR`。这是当前agent复核，**不是独立审查**。

最新决定队列`import-r2/review-decided/review.json`：40,987B，SHA256 `803d9c1e3732579f8660bee5f2f2868ca52318db66eb3c96f577e3851c423879`。1项文件级通过、4项待修、0项硬检查失败；所有Scene=MISSING、science=UNKNOWN、absoluteRegistration=UNVERIFIED、ordinaryAdoption=false。r2与已查看r1的三输出和contact图hash逐项相同，复用视觉证据，不重复看审。

## 验证与实际缺陷

共享owner新10项行为检查通过，覆盖一次多文件调用、来源不变/ICC、坏输入隔离、缺输出保独立结果、精确复用/损坏不重跑、在途依赖变化拒绝、vendor失败禁止放行、旧recipe窄兼容、决定身份、2050宽工作图及分组；实际子进程timeout/cancel检查曾失败：父进程退出后子pid仍存在。补`psutil.wait_procs`及drain后同反例通过，失败保持在开发记录。

原benchmark 13项及image_quality 13项影响检查通过；Context结构校验通过。fake vendor检查验证执行边界，不冒真实GPU再次运行或全库速度；真实GPU证据沿原已验证批次复用。没有再跑无变化工具比较、原Scene大矩阵或手机检查。

当前源码绑定：sxt_processing.py 25,457B / `3a8aaf8a64e5f68b24b80ef89df06a2367efd7c8f1b636873278bf39b8bacc81`；sxt_batch.py 5,539B / `79b4981c9a642d0af5af6db03344f388752b98ca4c1a5d155efb97a0c930d919`；image_quality.py 34,592B / `2e8632f762b314c1745ab4b2eeb22f071abeca48b9ebe99e6f118bcb9ba13bdd`。

## 当前下一依赖

已准入工作图→共享加工→复核/异常队列已有真实消费者。完整来源normalization、批准子批次→原Prepared/HiPS publication、实际Scene仍未接通；不能把这一步称全生产流水线完成。异常按公共原因批处理，M8先建立连续区域再加工/裁LOD；PS只修已定位局部。高DPR/原贡献owner按独立依赖推进，并先补最新任务适配器类型检查。普通Prepared空、HiPS关、v72及全部FAILED/UNKNOWN/MISSING保持。
