# M51：实际六字段同母图拼接小路径

2026-10-02，`sphere_grid` 实现 shared science/RGB owner 及新 task generation。当前 PLAN 的公共影像质量责任下，复用已取得科学帧和字段几何，不下载、不部署、不采用新图片、不更改运行时或旧出版。全幅采样支持已经取得；颜色、清晰度、跨 run 配准/PSF 和实际天空融合仍开放。本记录不建立新计划，也不将 M51 当全部深空需求上限。

## 稳定代次与真实来源

- owner `data-pipelines/deep-sky/sdss_gri_tan.py` SHA `7dee99087fb3bda4c99064ee34944e2ce87b485addcce26a940cd731cd58e95f`。
- tests SHA `873218d4cf3539bbf55eb7b633c4aabfdcbf13977ac2d2dfac84ab61259f774c`；[实际脚本](../scripts/experience-sdss-m51-mosaic-2026-10-02.py) SHA `620e12d4f8cbe284e463b793941c1e96f3c23dfcd21fe6478f64c7f1ad65807a`。
- 新输出 `output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json` SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`；`binding.json` SHA `bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d`。绑定实际 reader admission、完整 source receipts、当前 owner/test/reader/quality/requirements 前后身份、catalog/旧 manifest、90 个实际输出和读回，不是仅路径列表。
- shared reader SHA `66eed21091c6d4c80d35c79d8bbb28467ba65ef90740342c727c13bbd812d17e`。原单字段 candidate 和它的独立审查保原 `330fc...` scope，不追溯升级为多字段结果。

实际选择为 `301/3699/6/{99,100,101}` 与 `301/3716/6/{116,117,118}`，每个 field 的 g/r/i 齐全，共 18 个不同 payload。直接复用 root 三份取得回执，selected raw 共 **57,308,910B**；一次各文件 HTTP200 的事实归 acquisition receipts，本次脚本没有网络请求。第七候选 `301/3716/5/117` 的 r 在前轮实际目标四邻 stencil 贡献为零，未选入；它不是缺测黑色，也没有为它另取 g/i。

原 CAS 25 点及 r-only 枚举只决定必要取得路径，不能认证目标全幅或 g/i。本轮逐文件实际结构准入后，用每个 band 原 primary TAN WCS 的 world→source pixel、四个邻点位置及有限值验证全 2048² 网格。各 field 的独立 source science、stencil/finite sidecars 和两种 aggregate coverage 明确保存。压缩帧总字节与原科学矩阵单位不变：每帧解压 **12,447,360B**，18 帧 **224,052,480B**；primary 1489×2048 float32、已校准/已减天空的 nanomaggies/pixel。不会二次乘 NMGY 或二次机械扣 ALLSKY。

首次代次 `output/sdss-m51-gri-mosaic-candidate-1002/` 已完整保存 arrays/PNG/diagnostics，但 final binding inventory 因相对 output 未 resolve 抛 ValueError，进程 exit1。该目录原样保留、不认证最终 binding 或它的耗时/峰值。task binding 改为实际绝对路径后，以新的 r2 路径重跑同一批本地输入。source 的 partial 资格也在 r2 前修复；不覆盖旧输出或以旧 full 输入掩盖 partial 契约缺口。

## 复用能力、拼接与有效资格

复用已有 Astropy WCS、Lupton 与 strict bilinear owner。已检查成熟 [reproject mosaic](https://reproject.readthedocs.io/en/stable/mosaicking.html) 与 [reproject_and_coadd API](https://reproject.readthedocs.io/en/stable/api/reproject.mosaicking.reproject_and_coadd.html)：它支持重投影/coadd、权重和可选背景匹配；本机 NumPy/Astropy/Pillow 已有，reproject/scipy 不在既有环境。采用 generic coadd 仍需要当前三波段共同资格、真实 missing/negative 和同母图发布的语义层。这里在既有重投影责任增加有限 display coadd，无新依赖安装。没有把文档 median residual/background-match 自动应用到含星系/星点的已减天空帧；之后若要求噪声/PSF/flux-conserving 科学 coadd，需重新审成熟能力与真实校准输入，本轮不声称 photometry。

`build_mosaic_master` 先按 numeric rerun/run/camcol/field 稳定排序，拒绝 duplicate band、缺 band、未准入单位/完整数组。每 field 独立三带重投影；**仅同一 field 三带四邻皆 finite 的像素贡献完整颜色**。common raw weight 为三带到真实 source stencil 边界的最小距离加 1，缺共同支持则 0；归一化后这一 field 对 g/r/i 用完全相同权重。只供应一个 field 时权重为 1，保原科学强度、zero 与 negative；不会用 edge feather 将真实外围淡成科学零。权重是几何偏好，不是 science confidence、PSF、noise、exposure 或显示 alpha。

重叠科学 flux 使用 float64 累加、最终 float32；保存 float32 normalized weights，因此 independent reconstruction 应以对应数值界核，不要求从量化 weights 逐 bit 重建原 raw64 累加。当前最大归一化和误差 **4.470348358154297e-8**。

partial 契约发现与修复：旧 mosaic owner `cd5cff...` 的 aggregate data 只在 coherent gri 存在时有限，但 `.footprint/.finite_neighbors` 却给独立 band union。消费者按两 mask 接纳数据可读到 NaN。独立实际 [before JSON](experience-sdss-m51-mosaic-partial-before-2026-10-02.json) 在 32² 控制例每带真实记录 **287** 个 mask=True/data=NaN；本实现的另一个 padded 64² 完整 independent union/partial coherent 反例也在修前实际 `AssertionError`，没有用 AttributeError 代替缺陷效果。

修后 aggregate `ProjectedBand.footprint` 是任意 field 的三带共同几何支持，`.finite_neighbors` 是实际 coherent coadd-data availability，与 `isfinite(data)` 一致。独立 band source unions 通过无 aggregate 测量的 `BandSourceUnion`/`GriMaster.independent_band_unions` 单独暴露，并存到 `report.mosaic.independentSourceUnions` 指定的六个 `.npy`。真实独立 band flux 仍在各 field sidecars，不将缺 coherent RGB 当 source 不存在。`require_complete=True` 拒绝 coherent partial，即使各 band independent union 都全幅。单字段 `build_master` 保原消费语义。

当前相关 14 项检查通过，包括真实不同 band WCS/互补 stencil、单供给 zero/negative、不完整/重复身份拒绝、一个 band 非有限仅退休该 field 颜色、共同 weights 保 band 比例、反序输入相同 master、full-band-union/partial-coherent 的失败前回归，以及原单字段/world-row/同母图/显示资格检查。不是以测试数认证画质。

独立 `mosaic_review` 已对本 r2 的实际输入/完整 sidecars/PNG/crop 与 source identity 读核，`output/sdss-m51-mosaic-independent-1002-r1/review.json` SHA `3cba4e774816b02a0e16e6dc8fcfc2dfb18917b8a93068aff8ca8aa68ee4a66a`。其低层独立 WCS/stencil 全像素 field masks 与新保存 masks 全等；以保存 normalized weights 重构 g/r/i coadd 最大差分别 **3.06469e-6 / 4.84912e-6 / 5.19870e-6 nanomaggies/pixel**。18 原 source 各 128² grid 的实际 available 采样最大差 **7.45058e-9**，并核全部 PNG 像素与 crop world 对应。其原32² partial fixture 真 before287→after0 mismatch，独立 source 知值保留；brightness-mask bounded mutation 丢掉有效 black/negative 被实际检测。独立读回同时核 201 原 assets、旧单字段 payload、6 保留文件不变。这是数据/重采样/输出机制审查，未升级 source scientific quality、PSF/fpM/fullasTrans、昼间 composition 或产品采用。

## 实际全像素与显示输出

这 18 帧的 independent g/r/i unions 和 coherent same-field gri union 均为 **4,194,304 / 4,194,304**；aggregate 每带 finite/data 资格相同。single contributor **3,519,537** 像素，overlap **674,767** 像素，最大 3 个 field。g/r/i coadd 保 negative 测量分别 **681,586 / 650,374 / 707,834**，真实 zero 本次均 0；这不把 finite 或 negative 数量解释成质量/缺测比例。

RGB 仅从一份 coherent science master 用 [Astropy Lupton](https://docs.astropy.org/en/stable/visualization/rgb.html) i/r/g、固定 vmin0/stretch5/Q8 生成一次。三档皆为 512²，来自同一 2048² 母图的 2048/1024/512 中心 crop、premultiplied integer box；MEDIUM/DETAIL 是有意窄视场，未承诺三档都包含整颗星系/伴星。精确 TAN fieldDegrees 为 **0.2275555555555556 / 0.11377788994540003 / 0.056888958993683895**，不靠直接场幅除2/4冒充几何。

availability family 每档全 262,144 个 opaque 像素，alpha 仅为科学共同可用面积资格。本代仍导出 RGBA 以复用既有试验流程；全幅 alpha255 后可以在后续 task encoding 比较中导出 RGB PNG/JPEG，不能直接继承旧 v1 identity。另一互斥 family 为既有 encoded-display contribution：alpha=max(encodedRGB)/255，straight RGB=RGB/max，再同母图 box。它不是 linear radiance，也不把可用黑色改成科学缺测；不能由其直视 RGB 推最终背景组合质量。

实际观看 r2 三档 availability PNG 和 dominant field map：overview 中北侧伴星与连接区域出现，原单字段上侧斜切未出现；窄档中心螺旋从同一主图连续放大。当前仍整体暗、偏棕，detail 的源 PSF/亮度/颜色以及 faint outer extent 无质量通过证据。512² 静图未见显眼的几何场边硬缝，**不等于跨 run PSF/配准/色彩 seam 已认证**，也不认证蓝底矩形已经消除。父任务将用同真实 scene/software GPU 输入核合成，正式运行时并未接这些图。

`overlap-diagnostics.json` 实际存 9 组有共同支持的 field pairs，含 5 组跨 run。每 band 保存原 calibrated science difference 的 median/p05/p95/MAD；NONE background correction。例如 `301/3699/6/100` − `301/3716/6/117` 在 137,547 overlap pixels 的 g/r/i median 为 **+0.0006501563 / +0.0024712104 / −0.0001643710 nanomaggies/pixel**。5 个跨 run pairs 都没有落在 1.25×catalog ellipse 外的共同像素，因此该诊断没有独立空天样本，outside stats 是 samples0/null，不能填零或当背景已相等。即便另外同 run 的 ellipse 外还有样本，也未排星点/伴星/真实外围/PSF，不给背景 offset prescription。保留 per-field science 和 normalized weights，后续可对真实接缝/颜色反例定位责任。

## 资源、保留与剩余依赖

一次 r2 本机实际离线路径：source admission **6.766s**、mosaic build **20.406s**、保存与 overlap **3.703s**，完整脚本约 **31.828s**。Windows `GetProcessMemoryInfo` 实读 peak working set **1,426,227,200B**，完成后 working set **965,021,696B**；peak private pagefile **1,818,329,088B**。retained known NumPy arrays 的去重模型 **886,456,320B**，不包含临时 arrays/Astropy/Pillow/OS/GPU。这些是本机离线 Python 构图过程，**不是 staging4GB/production16GB 容量、客户端总内存或 native 帧耗时认证**；离线 FITS/coadd 不发给每个用户。

90 个 candidate outputs 在 final binding 前共 **708,920,809B**，其中 `.npy` 科学/几何/权重 sidecars **704,653,184B**（per-field **553,655,808B**），其余为报告/候选和两张诊断 PNG。这是离线可审查数据，不是每 DAU 传输。客户端互斥三 PNG families 分别 **949,846B** 与 **2,069,743B**；旧三 JPEG **64,352B**。当前 PNG 字节明显较大，不采用为固定预算；编码、画质、alpha/显示混合需基于实际目标天空效果比较，不能靠归暗为零宣称质量改善。PNG/JPEG/native decode 资源也不能由同512²纹理逻辑直接推断。

实际 binding 中原 **201** 个 deep-sky assets 与原单字段 **22** 个文件前后 path/bytes/SHA 全相同。新 generation exclusive，没有修改旧 source payload、合同/出版、PLAN/Context、生产 renderer/loader/cache、IDE/手机或六个保留设置/outbox。最终独立审查及 root 的六文件/生产组合核对归各自证据，当前记录不会代替它们。

source scientific validity、fpM/artifact、noise/PSF、absolute/relative astrometry、颜色和全体影像质量仍 UNKNOWN/未验。完整 asTrans polynomial/DCR 保存未应用；[root 的限定 metadata audit](experience-sdss-astrans-approximation-audit-2026-10-02.md)声明 offset.5/color0 的17×13格点 primaryTAN/asTrans 最大差 g.174241″/r.169721″/i.145277″，不是绝对实测或全图最大值。有限目标全幅不代表无限背景，也不认证所有 faint outskirts。后续依赖是实际天空颜色/背景/encoding 与完整来源/科学资格审查，再按现 owner 处理出版版本/兼容、HTTP/file/decode/cache/scene 与目标质量/总资源；当前没有新 source adoption 或 native/手机/200DAU 最终验收。
