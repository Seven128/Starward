# PS原图恢复组合 producer 与实际 consumer（2026-10-09）

当前 full-native 复核批次已接通 `prepared-native-sxt-ps-restored-display-v1`，不借原未修饰或 SXT-only producer。Goal active、无预算、未完成；普通 Prepared 空、HiPS 关、v72 不变，33 项状态保持。

`reviewed_sxt_display.py` 共享精确 processing/review/manual-decision 选行责任；新 `reviewed_restored_display.py` 加入原 baseline NEEDS_REPAIR、原照片 normalization/vendor/ICC、当前组合 review PASSED、冻结 mask/native PSD 和真实恢复像素 join。`publish_prepared_native.py` 原单配方与复核子批次共用同一 publisher，原 AVM/FITS/TAN、geometry、hash、writer、静态/API/Hook/Scene/来源责任保持；旧版本明确拒绝 PS 字段。新协议分开 `separation` 与 `restoration`：baseline 不是通过，当前组合通过也不建立 Scene/配准/科学通过。

真实批次 `output/ps-restored-native-publication-2026-10-09-r1/result.json` 保两行：NGC5128 仍 QUEUED_REVIEW_EXCEPTION/NEEDS_REPAIR 黄色环；M81/M82 完整区域通过文件准入，仅本地审查候选。独立 REGION 身份 `REGION:noao-m81-m82-complete-display` 不提供对象事实或取代 M81/M82 目录身份。使用原 8315×4642 JPEG 与其原内嵌 AVM，nominal-source-join 只读回已有 header 身份，不声称独立绝对校准。

组合 publication hash `937c81960c41bfc38e2dad25544e0f88a101af55f10b827e8f857425260aed80`，manifest 8294B/SHA `3b3d2a70c86a7372cfcfdc60e1e8a4d9ea0f1b6b778ae30ab15e3342982bc0d5`。原恢复细档 1024×572，589429B/SHA `83eabf23122cc3a06c14bcb84fa24f688d8dd089e04c7624685e4088a44d1378` 精确复用；新增 overview/medium 两 PNG，30696B/126499B，完整同源 LANCZOS，不裁图或补覆盖。0 新 PS/模型/源图下载/栅格化，初次 publisher 读原图及 normalization、只生成两粗档。工作尺寸是原缓存结果限制，不是生产分辨率上限。

标准 static enumerator/writer 真正输出 3PNG/746624B，原 body/hash/header readback 通过；bundle hash `00677ee1f9ca67b453836b4a309d4ba99e4ef18d770325f6c3801605bb7466aa`。实际当前完整 DPR2 page `output/playwright/ps-restored-pair-2026-10-09-r1`：525 前端输入、53 Scene、94 native 请求，原公共进入、M81 搜索、三档、来源披露、两 Back 完整 RGBA 一致/额外 Prepared body0、退出解码/source-RGBA等价量及 GPU texture/buffer 模型0；API/browser已关闭。真实软件 WebGL 780×1688 与实际2D显示逐字节一致。照片贡献321574像素/max238，完整 Scene/Back SHA `f85307687219d4419fb37563525ee98b418d878e2af956ede4b08e9c9881e2cc`。这不单独量化594个修复文件像素在屏幕上的贡献，也不证明设备/物理性能。

已查看 actual medium：完整双星系与有限照片边界都保留，矩形边界仍明显。既有 mask 原图核心333/外部583613、改变594像素文件证明经当前 producer 复核；没有重新进行 PS 或全图视觉采用。源 page 实际显示 NOIRLab作者/原图/许可/加工说明、1024×572工作尺寸、Photoshop原图局部恢复、原SXT仍需修复、组合文件通过且Scene尚未验收。

真实反例：仅改原恢复输出(0,0)一个外部通道，并新写 matching processing/review/decision/hash，当前生产 admission 仍拒绝 `ps_restoration_changed_core_or_exterior`，发生在LOD/出版之前。1 个 counterfactual PNG 编码不作生产图片；原成功PNG不变。随后缓存读回重用同一反例，0 新编码、原大图decode、PS/模型：当前共享 restored-row（也供缓存）重新读核心/外部像素而非只看元数据。原 publication 创建时与后来缓存守卫 epoch 分开记录，不改历史 owner/receipt/hash或再生成图像。

4个 native合同检查（含新 PS variant 与旧字段/意义边界）、15个影响到的 SXT owner 检查、contracts/BFF/App实际5.9.3类型与Python编译通过。初始旧测试宽 union spread 的 `restoration?:never` 类型冲突保留，明确旧fixture的full-source类型后通过；未放松生产guard。独立审查仍 MISSING，非自审代替。

科学 UNKNOWN、绝对配准 UNVERIFIED、弱结构/halo/矩形外沿/连续融合 FAILED，真实 WEAPP/WXML、手机、物理峰/容量与最终独审 MISSING。不提交推送、发布部署、采购或外联。下一按唯一 PLAN 转电脑端原生运行链和控件实际验证/修复，质量异常仍留原owner，不重跑相同输入加工或闭合矩阵。
