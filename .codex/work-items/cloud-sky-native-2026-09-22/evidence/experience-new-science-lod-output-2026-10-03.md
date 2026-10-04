# 新版真实影像的 Scene 输出、层级与质量缺口

本轮前一步已开发真实 fixed partial 与完整 joint 冻结 zscale 出版；本轮直接使用这两个新 hash 的真实三级 PNG，通过当前 `skySdssOpticalFrame`、`drawSkyScene`、共同 target-optical join 和 GPU renderer 绘制。不是沿旧 publication 的测试替新图通过。普通 registry/default 未采用，生产 Scene/Shader/源图没有因此变更；增量独审 **MISSING**。

## 实际输出与已绘事实

原输入/hash见[partial/frozen出版](experience-partial-and-frozen-science-publication-2026-10-03.md)。复用已有实际 report/time，相机朝向 publication 原中心，显示390×844；控制OV→MED/OV→DETAIL/MED、同视场37°旋转、DETAIL native lifetime退休→独立MED、红光条件。浏览器先解码全部真实 PNG，再执行受控ready条件：不称冷暖加载时延、队列/文件缓存或真机旅程。

十二个普通条件均有实际完整 RGBA 变化，并在 finish 后发布正确 reference/publicationHash、实际参与档位、相同原 asset/图像身份。两份实际 DETAIL 退休画面分别与独立 MEDIUM 同视场结果逐字节相同；imageFailed报告DETAIL，已绘packet只保MEDIUM，而不是请求的细档。红光两个条件与无图baseline全字节一致、completed optical=null，符合当前[Sky红光隐藏两层契约](../../../../project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md)。此范围不是实际page资料/source route或Back完成。

该有界软件GPU序列逻辑RGBA纹理峰值3,502,232 B，两个renderer dispose后texture/framebuffer/buffer/program/shader登记全0。所有源图预解码且其它可选全景/地景/星座/行星图片缺席，不能外推全小程序/native总资源、实际cache冷暖或目标预算。

## 真实画面仍不满足质量采用

已实际查看 partial 总览、frozen zscale DETAIL+MED 与独立MED同视场 PNG。partial总览出现明确斜向原覆盖边缘；这是实际缺测，不可通过补天体或猜alpha当完整覆盖。完整joint zscale能呈现旋臂，但偏棕、噪声及完整颜色/PSF/弱结构质量仍未通过；冻结参数/科学均值和正确绘制不能替代此义务。

在37°旋转/.10°共同视场，实际DETAIL+MED减独立MED的最大通道差异，用当前CPU同shader模型定位细档范围：

| 候选 | 细档内部像素/变化像素 | 内部差异p50/p95/max | 内侧4源像素带p95/max | 远离细档外部变化像素 |
| --- | ---: | --- | --- | ---: |
| fixed partial | 187,736 / 159,768 | 1 / 2 / 69 | 2 / 4 | 0 / 136,104 |
| frozen zscale | 187,736 / 180,064 | 2 / 4 / 60 | 5 / 12 | 0 / 136,104 |

边外2源像素诊断带分别有6/7像素变化，其余近外区域差异p95均0。这些带宽只定位实际差异，不是物理配准容差、科学精度或图质通过阈值；变化可含细结构/亮星及重采样差异，不能直接全部命名为接缝。现证据不支持先加猜测性fade/新的LOD融合政策或以抹除弱结构解决色底。先用既有科学/quality数据继续核颜色、空间PSF与弱结构，再决定有依据的处理。

## 原失败、修正与绑定

实际运行R1因host实验误要求红光必须有影像像素作用，报 `real image must affect actual output` / exit1。所有28幅实际/baseline捕获已保存，GPU内部无error、所有条件完成。控制源规定红光抑制巡天并保意愿，因此是实验判定错误，没有改生产红光来迎合该断言。失败generation及 `failed.json` 保持；原host脚本保存为 `executed-host-script.mts`（8,370 B / SHA `48875d2f0e4d318e7e74b348637a6aaf6636b095a17f76c3cc577c93f8feb676`）。当前host只修此判定，**未再次运行**。

新[保存输出读回](../scripts/readback-new-science-lod-2026-10-03.mts)核全capture字节/hash、source inputs、正确红光与实际粗层回退；不重跑同组GPU。输入绑定只有已保存原host对应的当前判定修订发生差异，原browser及全部实际解析依赖/PNG/report/六项保护文件仍相同。该读回为root自审，不能冒充独立审查；R1总体failed状态未改写，结果只收口上述机制条件。

- [host](../scripts/experience-new-science-lod-2026-10-03.mts)与[browser](../scripts/experience-new-science-lod-browser-2026-10-03.ts)保存当前来源。
- `output/playwright/cloud-sky-new-science-lod-1003-r1/observations.json` 55,839 B / SHA `063946fba9e22e0b371e95bd787d1ba90976ecc6169574d46cdf4f719122a0fa`。
- 同目录`failed.json` SHA `7ab61ef8911c79baee1e7367c2a7bbc28ddb7461e2752584478b1cd38c199f08`；`executed-bundle.js` SHA `e959bd3a336de6d49c055ccb4ecabfd33438f162c50d592a2c688cc8585d07c0`。
- `output/new-science-lod-readback-1003-r1/result.json` 24,096 B / SHA `d59cdd7eca0628096a5cc95564bff32546901c418f25a880f9206ea475aceb35`。

当前B下一依赖为既有实际已绘packet→完整来源/Back，以及颜色/PSF/弱结构的有依据诊断和必要独审；不重复该无变化LOD/红光矩阵。新publication各自HTTP/source/cache/static完整链仍未借旧hash证据升级。Prepared矩形FAILED、M82 OV/MED不足、WXML+Canvas FAILED_DEVTOOLS、新版手机/Android+iOS、真实page完整体验、200DAU全产品容量/成本保持开放。BFF24040/watch18132当前仍live并未重启；新离线/任务脚本不证明它们加载了最新服务改动。
