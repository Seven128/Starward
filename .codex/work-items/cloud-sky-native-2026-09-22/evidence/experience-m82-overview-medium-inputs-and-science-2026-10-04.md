# M82 OV/MED 实际缺源、共同科学采样与完整两级诊断

九项真正缺失的 AllWISE W3 FITS 已单次获取，原计划两级科学网格已通过现有共同 sampler 生成，保存值由直接 FITS 标量读回核对。只补齐来源/采样前置；**完整图质未过、普通 Prepared registry 仍空，未采用或出版。** 未改生产源码、云观星以外业务、六项设置/outbox、原 BFF/watch、预算或部署。

## 实际来源与边界

原 `output/allwise-w3-m82-source-0930/candidate/candidate-plan.json` 中 OVERVIEW 为 Norder4 的 `Dir0/Npix475.fits`；MEDIUM 为 Norder7 的 `Dir30000/Npix30415,30424,30425,30426,30427,30448,30449,30450.fits`。入口 properties 保原 SHA `eddbd837ee09ded51a44dbebfbcb58b86869353acb022aa6376a6c5eb5662ac1`，来源为原已确认 `https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3`，历史红外 12µm，不是光学自然色。

新库存遍历实际 output 科学缓存并包含 ignored 文件；请求前九个精确 basename 均无库存。任何同名库存将停止获取并先核身份/回执，不自动覆盖或重复下载。沿用原 DETAIL 有界获取 helper，仅映射这九个 canonical path：每项一次 GET、禁重定向、默认 CA/hostname 验证、30 秒 socket/38 秒全子进程/1,100,000B 准入界；无自动重试。每个独立结果在原始传输、准入之前与之后持久化；失败/部分原始流不能成为科学缺测或零值。

九项全部 HTTP200/CHECKED，**各 1,051,456B，合计 9,463,104B**，实际九个请求 elapsed 合计约 23.313 秒（不是首个可用画面或性能验收）。各科学数组 512² float32 完整，FITS 尾部缺 2,624B 填充的 warning 明确保留，不冒完整填充容器。只有 Npix30426 有三个 native 非有限标量，其余八源无非有限值。BUNIT 全缺，物理单位 UNKNOWN；旧 recipe 的 `finiteCutsDN` 名称不供应 DN 资格。

来源结果：`output/allwise-w3-m82-overview-medium-inputs-1004-r1/acquisition.json`；对应 `binding.json`、`live-cache-inventory.json`、九个 request 回执/原始 FITS、原计划两级投影和执行脚本保存。原 DETAIL 六源没有重取，旧科学/图像/历史失败没有覆盖。

## 原科学 owner 的实际消费者与保存读回

`allwise_finite_tan.sample_cached_tan` 未改。新消费者仅取原计划 OVERVIEW/MEDIUM 两个 profile，使用原 manifest 的 M:82 中心/尺寸/视场，完整集九输入、当前 properties/hash、完整准入回执及实际文件 hash；原 WCS/world/lookup hashes 全保。观察器只保存原 helper 实际 world 输入与 lookup 返回，不改采样输入或输出。生成：

| 原级别 | 保存科学网格 | 有限 | 非有限 | 实际来源数 |
|---|---|---:|---:|---:|
| OVERVIEW | 256²、2°、原 CRPIX128 | 65,536 | 0 | 1 |
| MEDIUM | 512²、0.75°、原 CRPIX256 | 262,143 | 1 | 8 |

两个网格均无有限零/负值；这不等于全部有效科学信号或消除 detector artifact。可用性只表示选中的真实标量 finite，不按亮度或 JPG 黑色决定。

科学结果 `output/allwise-w3-m82-overview-medium-science-1004-r1/result.json`：一次约 9.749 秒本机离线执行，非手机/服务器容量。OV science/availability SHA 分别 `6ab84942ebd53478e11d92e8304e94772d1f8a0792f458284cd5603ce1a5d7cb` / `72bf42bd9c376d68820d774b6ce353f9fd4f71523379d25ad5aca0af4510e04e`；MED 为 `7c65c398c772a497e1704ea70258c28b3bae84619e0fd558194bebd8fd48b7a3` / `ebcc811416f4808f820828ce8d9898f81aa9c820b75d05a0d3f3cd146ee21898`。

Root 单独 readback 不导入或重跑共同 sampler，按保存的实际 lookup 直接访问原 FITS row/column，逐值比较 327,680 个保存科学标量和 availability；全部精确，非有限也按其真实含义比较。源、脚本、geometry/hash、旧 checkpoint 330 source/6 protected/3376 evidence 在前后精确。见 `output/allwise-w3-m82-overview-medium-readback-1004-r1/result.json`。这是自审，**独立审查 MISSING**。

## 两张新诊断与旧 DETAIL 实际对照

只给新 OV/MED 运行一次现有完整域 `finite_rgba`：finite-only 1/99.7 percentile、asinh scale .1、gray；没有重生成旧 DETAIL 图或科学网格，没有参数搜索。完整保存 PNG 经 verify/load，所有 RGBA 与原共享 transfer 精确，alpha 全等真实 availability；共同 `inspect_image` 检查实际 PNG/声明几何/科学 mask，不认证画质。

- OV cuts `[269.5048583984375,309.06039901733357]`，697 个有限 opaque RGB0、无透明非有限；PNG 61,714B、SHA `02cd02fc8948a3fd322b5955e953206a17f7bdac5b4846a1684fa0d343fe4e10`。
- MED cuts `[269.0418603515625,556.4630656738253]`，5,141 个有限 opaque RGB0、1 个非有限透明；PNG 129,639B、SHA `5a03f9d3937b8c8a3ca19115c408cc08dbbc86c5e027fe5cc1f7bbfcb8c60d2a`。
- 旧 DETAIL PNG 原 cuts `[269.85169921875,2949.9394130859314]` / 41,297B / SHA `25a55dc09778e5e8220652a8772e5e3a1788d680232b93890cacc4b713c11144` 只读复用。

三张实际已查看，视場不同不能把显示尺寸相同冒配准比较。OV 背景明显更亮、MED/DETAIL 背景较暗；DETAIL 暗核心依然可见，柔软/弱结构没有修复。不同域 percentile 导致不同 transfer 是已保存事实，视觉不同不能仅归因于真实信号/分辨率或先断定全来自该机制。**这些独立 cuts 不作为共同三级配方采用**，未作 native 合成、接缝/绝对配准、PSF或完整科学/图质通过。

新两级图与 metadata/QC/result/binding 位于 `output/allwise-w3-m82-overview-medium-display-1004-r1/`；17 个旧 DETAIL 有限暗核心、19 个非有限位置原科学/显示证据保持，不能用填源/PNG/alpha 保真替代修复。

## 当前下一依赖

只由 PLAN 顶部控制：复用这两级和已存 DETAIL 科学数据，以来源已声明 `hips_pixel_cut=260 1000` 的固定显示范围做一次共同三级有界对照；先核现有 transfer/recipe owner 与身份，保持 finite opacity/非有限缺测，记录固定范围仅显示、不供应物理单位/校准/质量，不手修暗点/猜 sky/扫参数或重采样 DETAIL。按真实输出决定是否进入共同显示/来源质量处理及完整版本出版，不先采用。全背景/接缝/弱结构/PSF/配准、来源权利与出版链、空 Prepared、native/手机、strict SourceBack FAILED、静态真实保留引用/全200DAU成本容量与独审等原范围继续开放。
