# 139° 原图平面与视野包围锥求交：有界数学候选

日期：2026-10-02。只处理首条真实资源路径已冻结的同一 139° 条件和 28 张实际星座图；没有新数据、图片处理、source/coverage合同、生产代码或预算改动。alpha 外矩形候选因 0B 收益已由同资源 owner 否决，不沿用它作本候选依据。

输入为 `output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json`，SHA `548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b`，138 个原生产依赖、实际本地 published PNG、report/元数据沿该输入冻结。当前纯窗口 owner 在 28 张图上均退回 full，26 个图的 viewport hull 顶点有原注册平面的 behind-plane UV，这不证明实际 source 与 viewport 不相交。

## 算法和恢复方向

令原 3 个锚方向组成列矩阵 D，`d=registration.determinant`，`R=registration.rows`，则 R=d·D⁻¹，因此 **D=d·R⁻¹**，不是 det(R)·R⁻¹（det(R)=d²）。当前 task 使用 A=[1; anchorU; anchorV]，由 t=A⁻¹[1,u,v] 得原平面向量 s(u,v)=D·t。这与 A=[anchorU;anchorV;1] 的 [u,v,1] 排列等价。

sum(t)=1，所以 R·s=d·t、sum(R·s)=d；归一化后原 inverse UV 返回相同 (u,v)，d/sum(R·normalize(s))=|s|>0，符合原 shader 的正向分支。N=sum(R 的行) 满足 N·s=d，全 source UV 平面的 |s|≥|d|/|N|，不从角点采样声称 minnorm。

当前已有 `skyArtworkViewRayHull` 在这一个 viewport 有效，按其原证书包围连续弯曲的 stereographic viewport。各条 oriented cone edge normal n 把包含条件写为 n·s(u,v)≥0，是 u/v 的线性半空间。先在原 UV 方形上做 Sutherland–Hodgman 求交，后取 polygon 顶点 UV extrema，就能给理想 double 几何的保守 AABB，不需要在 viewport hull 的无效 behind-plane UV 处做除法。保持原 source UV/texels/alpha 不变；它是驻留几何，不能宣称裁小科学 source 或新增真实 coverage。

原无正向 viewport hull、matrix/UVarea/尺度残差不可靠、source minnorm/正向分支不可靠、normal/clip交点近退化或 empty 均返回全源。Empty 没有被用作新的请求/可见性拒绝。

## 实际收益与补证

入口 `scripts/experience-source-plane-window-candidate-2026-10-02.mts`，冻结 SHA `191db39c94f604fda03a2c1ab82f115bb5eb75c32a61c9b7a43b98e6ad95c78c`。r1 保留初代数值约定，不回写；补证 r2 输出：

`output/playwright/cloud-sky-source-plane-window-candidate-1002-r2/result.json`，281,456B，SHA `307fdafeea493f676fce698b7b56a49ee9a5e38e9c92a75d3d7d3f5631ef07c8`。每图 actual registration、原三锚 hip/UV/direction、恢复矩阵、condition、det/area、halfspace coefficient/tolerance、polygon 和最终 window 均保存。

从原冻结星座 catalog 与 actual instant stellar geometry 重算 3 个输入方向，在 registration 形成前供给独立交叉核，而非以 inverse 自证。28 图最大 D 原锚方向误差 4.6629367034256575e-15；UV roundtrip 最大 8.659739592076221e-15；N·s−d 残差最大 1.1102230246251565e-16；source 全域 minnorm 下界最小 0.9110908266130937。归一化前正向 branch 角点诊断 0.9999999999999964..1.0000000000000013；正向全域理由是 N·s=d 恒定。

11 图可缩为 partial rectangle、17 图 full、0 个实际未知 fallback；原 art 21,495,808B→候选 16,506,880B，省 4,988,928B（23.2088%）。加现有银河/地景驻留 9,437,184B 后仍 **25,944,064B>16,777,216B**，不消除 warm thrash。假设没有复制失败且这些原 texel rectangles 可用，该数仅为驻留候选，不包括源上传和 FBO copy 重叠、driver 分配或 native 解码。

28×390×844 原 framebuffer 中有效 source 采样点的两侧 LINEAR 邻居全部在候选内，作为有界 discrepancy guard 保存；连续包围理由来自原 view hull 与 affine halfspaces，不能把这些离散点升级为曲边覆盖证明。

## 未闭合的数值/像素责任

候选使用沿当前 owner 的 64ulp 全域 UV/world 外扩、3 原 texel 的滤波 pad 与 32 texel outward alignment，并显式记录各项数值。该约定尚不能证明 actual float32 rows/anchors/camera/arithmetic 的普遍误差界。CPU polygon clip/矩阵恢复条件已受 guard，但不存在因此自动成立的 WEAPP shader/driver 证书；正式数值审查与真实 bounded GPU A/B 仍是采用前提。任何真实差异/护栏未知必须保 full，不为截图通过而调容差。

139° 实际 artwork opacity 仅 0.0002368，单次 source RGB 理论上限约 0.06 个 RGBA8 byte；整帧 candidate/baseline exact 无法自动排除无效果或坏裁剪。后续已按 root 授权做原 45→85→139 的有界 4 变体 GPU 对照，结果如下；没有扩大视角、调产品 opacity 或修改数值候选。

## 真实 GPU A/B：有像素差异，未采用

入口 `scripts/experience-source-plane-window-gpu-ab-2026-10-02.mts`，实际输出 `output/playwright/cloud-sky-source-plane-window-gpu-ab-1002-r4/result.json`，6,126,462B，SHA `a8bcd380aea334391ccc6a7c8b92e02e4efba8a22946a8833bb396d883432d7a`。复用原 r4 冻结的完整 Hook/cache/解码/GL 执行器与 138 模块 bundle；只有窗口函数换成冻结数学候选，noart 仅跳过艺术 draw，badcrop 仅换为明显错误的 32² 原图窗口。所有实际上传输入和相机不变。片元 HIGH_FLOAT 实际 precision=23、rangeMin/rangeMax=127；RGB channel bits 为 8，**alphaBits=0**（opaque canvas 的 RGBA readback alpha=255，不是 alpha attachment 8bit 的证据）。属于桌面 SwiftShader，不认证 WEAPP。前版 note 误写四通道均 8，按实际 receipt 修正，原 receipt 未改。

任务 r1/r2 是执行器抽取/调用的启动失败，未完成 scene；r3 已完成 baseline/noart 六条，candidate 首调用因任务 helper 未绑定断言而失败。r4 修正同语义断言，仅重跑 candidate/badcrop 六条，之前已完成的 baseline/noart 原样复制并保存逐文件 `reusedInputs`；baseline 三个完整 RGBA 与原 full-hook r4 精确相等。数学 owner SHA/参数未变。没有把 failed generations 升格为通过。

逐帧实际 PNG 解码与原 bottom-up RGBA、完整 GL source-upload/copy/delete ledger 读回在 `output/source-plane-window-gpu-readback-1002-r1/result.json`（396,252B，SHA `2ab3d389c4883de60056fd6c0134c09480b0672f219920323502960e52f7a9fd`）；12 张 PNG 全部 390×844，逐像素完全对应，138 生产源、201 旧资产与 6 保留文件身份未变。

| 原条件 | noart 像素差 / 最大 byte 差 | badcrop 像素差 / 最大差 | candidate 像素差 / 最大差 |
|---|---:|---:|---:|
| 45° | 121,717 / 32 | 128,725 / 32 | **3 / 1** |
| 85° | 101,155 / 32 | 131,287 / 32 | **1 / 1** |
| 139° | 0 / 0 | 0 / 0 | 0 / 0 |

45°/85° 的实际可见艺术贡献与错误裁剪检测力成立，候选单字节差也是真差，未被抹除或归咎科学 source 缺口。139° 三个变化变体均 0 差，像素 oracle 无检测力，只能报告资源机制；它不能认证 28 图窗口正确。独立数学 probe 的 Boo/Cet 没有有效 139 framebuffer lattice fragment，与其余图因低 opacity 没有 RGBA8 贡献是不同事实。

差异原 PNG 坐标：45° `(212,415)` G28→27、`(234,375)` B40→39、`(158,264)` R18→19；85° `(42,526)` B36→37。原双精度 inverse-ray/UV membership 指向 45° Cep 与 85° Dra，所有原 LINEAR 两侧邻居在候选内；完整 registration UV/window/坐标保存在 `output/source-plane-window-difference-membership-1002-r1/result.json`（6,162B，SHA `fe24fab00b4776c39e71a40b0f7ff578decd5b0db65b0c7ce90be5d07f729523`）。这只是原 CPU source membership，不是实际 float32 的唯一因果证明。没有因此断言误差来自漏 texel、shader 舍入或 driver。

| 条件 / 变体 | 最大实际 logical peak B | 暖帧末 B | 第三暖帧 source-upload B |
|---|---:|---:|---:|
| 45 baseline / candidate | 8,798,208 / 8,798,208 | 3,432,448 / 2,281,472 | 0 / 0 |
| 85 baseline / candidate | 12,738,560 / 11,587,584 | 11,812,864 / 9,039,872 | 0 / 0 |
| 139 baseline / candidate | 30,932,992 / 26,730,496 | 16,777,216 / 16,244,736 | 14,155,776 / 9,699,328 |

实际候选降低一部分逻辑驻留/峰值，但暖帧仍重新上传纹理，不能声称解决 16MiB 压力；这是 source-upload 到 GPU，encoded 暖缓存没有网络传输。完整 source texels、encoded 文件、decode objects、shader/source route 均未改。人工保留 HTMLImage 的 probe 不认证 GC；logical GL 也不认证 native/driver/OS 总内存、云容量、帧时或最终体验。

**当前决定：窗口候选未采用，生产继续原窗口。** 不调 pad/容差使截图通过，也不扩图/opacity 或建立新 source bounds 合同。独立 r2 数学审查只支持此 bounded 理想几何收益，不能替代这里的真实像素失败。下一独立候选为 root 授权的当前帧纹理保留 A/B，保持原窗口，不把两个机制合并。
