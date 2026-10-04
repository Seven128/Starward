# 实际部分覆盖与冻结全图参数出版开发

当前分支/HEAD保持 `codex/remote-main-20260908` / `72e65cf309d700cb7d40c5b7afd53660fd39fa35`。无预算 Goal active、未完成。新增源码只涉及共享 SDSS 离线 owner/出版入口及相关检查；默认 science/Prepared registry 仍空。此增量独立审查 **MISSING**，本记录不是独审或质量采用。

## 原单字段证据兼容及真实 partial

旧单字段 producer 的 binding 使用 `outputs`，准入 receipt 嵌于已绑定的 candidate，而后来的拼接 producer 使用 `candidateOutputs` / `sourceFrameReceipts`。原入口在这份真实缓存上报 `KeyError: candidateOutputs`。有界 namespace 回退重现该旧拒绝，不修改生产文件。现在只为匹配原 single-field version 的原证据格式提供兼容，保留 caller 对 candidate/binding 的外部 hash pin；原 acquisition input 的对象、三帧身份/URL/字节/hash及实际本地源字节逐一核对。没有重新取得或读取 FITS 科学数据、重投影、补缺测或重写旧证据。

输入为 `output/sdss-gri-tan-candidate-1002/`：candidate SHA `86596c0d7e4fa0709ec516ae96a37e07b2d41fd981dc46488ca57bdf48d315e4`，binding SHA `344cb3392d104ed65dca2a77e723b249f2eba83fa098d2a798a6aac5286a3c02`。复用原 stretch5/Q8 的 RGB 与解析 recipe，在实际 `publish_verified_candidate` / TS admission/hash 链写入独立 science-optical-v3。三帧仍仅科学结构准入，原单位/校准/已扣sky语义不变。

| 档位 | 有效母样本 | 有效输出像素 | 缺测输出像素 | 部分覆盖输出像素 | 有效黑色输出像素 |
| --- | ---: | ---: | ---: | ---: | ---: |
| OVERVIEW | 2,031,591 | 127,449 | 134,695 | 949 | 24,707 |
| MEDIUM | 874,142 | 218,693 | 43,451 | 315 | 1,225 |
| DETAIL | 262,144 | 262,144 | 0 | 0 | 0 |

直接解码真实 PNG：全部 alpha 与 `round(availableSampleCount*255/factor²)` 逐像素相同；缺测 RGBA 全零。每种非零占用数及有效黑样本，独立 gather 有效科学值计算 float64 mean→float32，与共享成熟 Astropy 固定映射及实际 PNG RGB 对比相同。未知值不进入分母；黑色不是缺测。总览实际约48.44%母样本覆盖。已查看实际总览 PNG，源边界仍明显；这不是配准、完整覆盖、颜色/弱结构或背景质量通过。

脚本：[真实 partial 出版](../scripts/experience-partial-science-publication-2026-10-03.py)。结果 `output/partial-science-publication-1003-r1/result.json` SHA `64169c426540c8b7fb2b6997f5d0d0983cad4d299ae07d2bec7c819404258489`；manifest 11,184 B / SHA `5a8696100a2ccc6e1279a720a731252a9262f378644f12aaa9ed919704962163`，publicationHash `12b07bb699f494abbb8ecc95a523d5f65f6cb511839bc7d18cb958a0d795129a`。writer receipt 16,060 B / SHA `db7b8d9575a569333a0903f9a93f91b776ec5a716bd894f0ab5569b1dc71d2f4`。

## 已缓存全图 zscale 的解析参数/参考 RGB 准入

复用原六字段完整 joint 的 `output/sdss-m51-shared-transfer-1002/` report、binding、`global-zscale-q8/rgb-master.npy`；不重跑旧三 transfer 矩阵，不新选参数。report SHA `6eb66308827aa35c1114f66689452354616da73ee1d5320d15778763b3821d8d`，binding SHA `0ecb0c72357dc019b792436678fe7d7344e23e9bcaa783532907e0c9d2b5c784`；RGB 12,583,040 B / SHA `3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6`。原 producer 的实际科学/joint inputs 与已准入母图身份吻合。

原 in-memory pyramid qualifier 只核全图 fit 的类别和几个数量，伪造统计样本 hash 仍通过；不得据此把任意参数称作已重现全图 zscale。新增共享 `verify_frozen_zscale_reference`，原 generation 和 frozen admission 共用同一 sample/receipt 定义：从实际共同有效 SCI 检查 float64 intensity、总/负/零样本、raster stride、统计样本及索引 hash、完整 Astropy 参数/版本；重放原 1,000 样本的 `ZScaleInterval.get_limits` 验证 stretch。用该已解析 stretch/Q 的固定映射核完整缓存 RGB。

这是 **一次原统计样本验证 fit**，不是“完全没有 fit”；实测 `get_limits` 输入只有 `[1000]`，全图 fit 0、LOD fit 0。实验禁用 `LuptonAsinhZscaleStretch` 新全图 fit；原 recipe/RGB 不变且不重写参考 NPY。显式 `reuse_frozen_zscale_reference` 保原 source/candidate bindings，复制解析 recipe，新增证据/参考 RGB 字节绑定；仅可走 v3、不覆盖固定参数，v2与直接旧 payload入口在写前拒绝。出版回执单列 frozen 验证，不冒称质量采用。伪样本 hash 在新入口实际拒绝；相关检查另覆盖错误解析 stretch、RGB、统计配置、字节 pin及 caller 后续 recipe mutation。

新真实三个 PNG：OV 502,482 B / SHA `db0de119fc15af45dbe986ba18cf59dca4af2f64b56c4229c3c0951b839a2547`，MED 537,547 B / SHA `681b544928f13c20d8b51ba02ec6c89cb535fb43847ad3fedd11a32a9f177595`，DETAIL 498,075 B / SHA `fe339181e8cca9a2c8112b4523c958ebf4c9a4bb2d42656893128be99146e801`。细档与原 zscale encoded 细档字节相同；粗档采用新科学均值顺序，其差异不自动是完整画质改善。

脚本：[冻结参数真实出版](../scripts/experience-frozen-zscale-publication-2026-10-03.py)。结果 `output/frozen-zscale-publication-1003-r1/result.json` SHA `0a9cb3de9070b4e5373bdfd45bdf340f0e665e4284a4dadb451c1c0fe3033473`；manifest 22,040 B / SHA `8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368`，publicationHash `3f98c194d5ab2ea8935a0eb87c37fbc23d4a8fee5f1f7539a72e7c9b0e7acf7b`。writer receipt 29,206 B / SHA `629f0c489471ed851561cdd122208032303517fa8547e3de742c3743bbad061e`。两次真实 writer 的输入和当时实现 before/after 相同；其后补直接 payload 的同一拒绝守卫，相关回归通过，不重复生成相同产品。

## 验证范围与保留失败

最终相关 Python `test_sdss_gri_tan` / `test_sdss_science_pyramid` / `test_publish_sdss_science` 43项通过，包含已有 single/mosaic generation/QC消费者与新边界。新实验第一次在 producer RGB identity 多了 shape/dtype 的字典比较处失败，未进入出版；改为比原 path/bytes/hash，未改数据。新增故意损坏参考 NPY 的检查首次因 Windows 仍映射该文件而失败，连带临时测试清理失败；测试在 reader 退休后关闭该映射再损坏，正确触发字节 pin 拒绝。不是生产图质修复、目标运行时故障或原失败升级。

真实 partial 为固定原参数，真实 frozen zscale 为完整 joint；两者的原覆盖边界保留，不能称真实 partial+zscale 组合全部验证。共享 synthetic partial zscale控制只属开发。未重复新 static 整包、Caddy HTTP、R5/DevTools矩阵；这两新 publication 没有据此取得它们自己的实际 HTTP/Scene/完整来源Back/native/完整质量验收。原显式版本消费者/static开发证据仍保各自 hash/条件。当前下一依赖是实际 LOD/背景/颜色/PSF/弱结构、已绘来源Back及增量独审；已知 Prepared矩形 FAILED、M82 OV/MED不足、WXML+Canvas FAILED_DEVTOOLS、手机/200DAU混合容量义务保持。
