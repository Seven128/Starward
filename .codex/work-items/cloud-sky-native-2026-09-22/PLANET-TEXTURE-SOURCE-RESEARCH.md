# C05 行星贴图候选的权利边界（2026-09-23）

本轮为木星寻找可固定发布、可商用、完整球面且无需逐项申请的影像。NASA Science 的 Cassini [PIA07782 木星柱面图](https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/)在形状和覆盖上适合作候选，但其署名同时包含 NASA/JPL/Space Science Institute。JPL 的[影像使用政策](https://www.jpl.nasa.gov/jpl-image-use-policy/)说明第三方拥有的影像商业使用需向权利人取得许可；[NASA 媒体准则](https://www.nasa.gov/nasa-brand-center/images-and-media/)也不转让第三方素材权利。无法由“公开可下载”或 JPL 一般许可推定此张图可自行加入商业版。因此未下载、未打包、未接入，C05 的其它行星纹理仍开放。

另一个 [PIA02864 木星图](https://science.nasa.gov/resource/full-jupiter-map/)只覆盖约南北纬 60°，不能当作完整球面图。后续若找到单一权利主体明确 public domain／兼容商用的完整木星图，再核经纬方向、接缝、分辨率和交付成本；不要因为已有月/火纹理管线而放松来源审查。

后续找到 Voyager 1 的 [PIA00011 原始编目](https://photojournal.jpl.nasa.gov/catalog/PIA00011)及[NASA 图片页](https://science.nasa.gov/photojournal/cylindrical-projection-of-jupiter/)：署名仅 NASA/JPL，按上述 JPL 一般政策，权利条件较 PIA07782 明确；编目声明 2000×536、Voyager 1979年照片的柱面图，木星大红斑约在经度75°，经度基于磁场方向。为检验生产适用性，从官方NASA下载 JPEG 到任务证据 `evidence/jupiter-pia00011-source.jpg`（97739 B、SHA256 `c4781fc491e59e6996cc402ae6f1beeb9dfb4faa763da625a480facc5ceb5cf2`）并查看原图：下方有黑色边带、右缘有色边，长宽比不等于完整球面简单柱状采样；公开记录未给出可直接映射到当前 IAU 本体轴的全纬度/左右经度栅格定义。它是较清晰的权利候选，**不是已准入的球面纹理**；没有加工、打包或加入商业运行路径。需取得足够的图像坐标标定或可直接采样的完整地图，才可依当前月/火纹理 owner 接入。

## 2026-09-24 USGS MESSENGER 水星源准入

[USGS MESSENGER MDIS 彩色 v3](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_color_mosaic_665m)虽列 Public domain、Please cite authors、正东经/星心纬度，官方 `MESSENGER_Color` WMS 导出在极区有明显大片空白；未把白缺片贴为完整水星。改用 [2013 250m 灰阶全球拼图](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m)：官方产品明确 Public domain、Please cite authors、100% coverage，记录极区补图与 `[-180,180]` 正东经简单柱状图。对应 `MESSENGER_May2013` WMS 实际 1024×512 JPEG 已加入固定发布链，清单和完整 GetMap URL 在 `workers/miniapp-api/assets/mercury/manifest.json`。权利、样本、像素缺陷、测试和未验证项见 [水星证据](evidence/mercury-texture-2026-09-24.md)。该资料不是自然颜色／当前可见外观，设备配准仍需实测。

## 2026-09-24 NASA/JPL 3D 木星贴图再核

[NASA Science 3D 资源](https://science.nasa.gov/3d-resources/jupiter/)把 `Jupiter.jpg`列为球体模型纹理，来源 Voyager、JPL/Caltech 制图，署名 JPL & Caltech；[JPL 原始纹理目录](https://space.jpl.nasa.gov/tmaps/jupiter.html)列木星地图 720×360、2 px/degree、所有者 JPL/Caltech，但称该 Voyager 图处理欠佳。[JPL 图像政策](https://www.jpl.nasa.gov/jpl-image-use-policy/)允许无特别注明的其公开站点图像用于任何目的，要求署名且禁止暗示背书；该目录未标第三方拥有。NASA 3D 页的同名 JPEG 下载至任务证据 `evidence/jupiter-nasa-3d-source.jpg`，720×360，SHA-256 `ac2d387f8ea56a59f45dea37993c779a730f49d7d9fdbc8d36c307a351b1f1a1`；未复制进生产资产。

图像在纬度方向可见木星云带和大红斑，适合**代表性历史外观**；[JPL 地图总说明](https://maps.jpl.nasa.gov/tmaps/)明确气态巨行星贴图并非当前实际云形，因为大气会逐日变化。现有正式球面 shader 需要以同一时刻的本体轴确定经纬度，且原月/火图使用正东经 `[-180,180]`。此 3D 图及目录没有可证实的左右经度方向、本初子午线像素与观测年代的云系经度；PIA00011 是另一张尺寸/色彩不同的柱面图，不能把它的“红斑约75°”直接赋予本图。因而本轮**不加入正式木星旋转纹理**，以免历史图在当前时刻显示看似精确而未经配准的红斑经度。后续需找官方图的坐标定义或独立地标/本体轴配准，并在产品中标明历史代表性和精度上限；权利来源候选与时间配准是两个不同准入条件。

2026-09-24 后续仅采用 [NASA NSSDCA Jupiter Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html) 的 1-bar 赤道／极半径做扁球轮廓，并在报告和资料页注明来源；此几何改动不放宽上述历史云图准入。实现、组合测试和未完成的微信原生观察见 [木星扁球证据](evidence/jupiter-oblate-2026-09-24.md)。

## 2026-09-24 HST OPAL 纬度条带准入（覆盖此前“无木星纹理”的状态）

[MAST OPAL](https://archive.stsci.edu/hlsp/opal) 对 HLSP 明确标注 CC BY 4.0，[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)指出许可随第三方分发；这与 DSS 单独限制不同。[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)允许商用改作和再分发，但须署名、链接许可、说明修改且不得暗示背书。[Cycle 31 2024c](https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31)正式三滤镜合成 TIFF 的经纬定义结合[官方 README](https://archive.stsci.edu/missions/hlsp/opal/cycle31/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2024-2_all_v1_readme.txt)与[Wong 等对 GLOBALMAP 格式的论文](https://stsci-opo.org/STScI-01EVSQQQA3VQ9Y32GQKZ0ADZ9A.pdf)核定：360°西经、180°行星图纬度。README 中“0 到 +90 纬度”一句与格式论文、3600×1800 全图及南半球图像相矛盾，应视为该 README 的笔误；不把这推断用于经度特征定位。

正式路径**只采用每个纬度的有效经度中位 RGB**，丢弃所有经度变化，所以 2024 年大红斑和其它云系位置不会被映射到 2026 年同刻本体轴。源图和小 PNG 的固定 SHA、加工命令、来源归因及不确定性见 [OPAL 证据](evidence/opal-jupiter-bands-2026-09-24.md)、[加工说明](../../../data-pipelines/planet-textures/README.md)和 `workers/miniapp-api/assets/jupiter/manifest.json`。原 NASA/JPL 整图候选仍未准入；本新条带不等于今天的天气、自然真彩或全天高清星图。目标微信原生像素、设备性能及云成本仍开放。

## 2026-09-24 进阶外观再核（未采用新素材）

[NASA Science 当前 Saturn 3D 纹理页](https://science.nasa.gov/3d-resources/saturn/)把该贴图明示为 `Fictional`。即使图片可取得，也不能贴到本产品真实时刻土星盘面当作观测外观。[USGS Venus Magellan SAR 全球拼图](https://astrogeology.usgs.gov/search/map/venus_magellan_sar_fmap_left_look_global_mosaic_75m)虽列 public domain/use constraints none，却是雷达地表图；金星厚云遮盖地表，不能直接充当可见光圆面云纹理。本次没有下载、加工、打包这两项。

现有报告给土星环观察者极轴与倾角、相位，但不含土星位置处太阳照射方向或环面遮蔽几何；现有 `sky-planet-disc` 的环带为主环径向几何，`sky-gpu-renderer` 盘面做相位/本体贴图。直接给圆面画任意暗带会混淆阴影和固定云纹，不能算时间正确的环影。若要做随时刻变化的环影，应先确定服务端同刻且考虑光行时的土星→太阳方向、报告合同和对照基准，再验证盘面/环/点选的共同投影及无效数据回退；这是 B2 待评估实现，不因找到图片就绕过。此处是从当前代码字段与可见资源推断，尚未运行目标微信画面。

## 2026-09-24 HST OPAL 土星历史纬度条带

[MAST OPAL](https://archive.stsci.edu/hlsp/opal) 对高阶产品明确标注 CC BY 4.0，[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)允许按产品许可分发，与 DSS 的限制分开。[Cycle 32 土星产品](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32)公开 2025a F395N/F502N/F631N 全图、DOI 10.17909/T9G593。官方 README 在 `evidence/saturn-opal-2025-readme.txt`：2025-08-29 观测、1800×900、行星图纬度 −90°～+90°、System III 西经从左边 360° 向右递减、三滤镜任意尺度合成、拼图中含环/卫星阴影。经度定义只用于解释原图；派生条带完全弃用经度。

源 TIFF `evidence/saturn-opal-2025a-source.tif` SHA-256 `c34a13a8253a39bcc1f8376b24c077b89f05ce0b5202706f535ded20314440d7`。`publish_opal_saturn_bands.py` 只接受此源与 1800×900 RGB，沿用 `opal_latitude_profile.py` 的每纬度有效经度 RGB 中位数；有效覆盖少于 90% 的行（含环遮挡）透明。822/900 行有效，成品 8×512、1003 B，SHA-256 `68da69457db865d4f0f517ecb034d0a208925b9fe5595ee8ac1e9a54ba43869c`。原图、加工预览及重算文件均在 `evidence/`；正式资源/清单在 `workers/miniapp-api/assets/saturn/`，来源、许可、加工、历史局限及版本哈希由 BFF 和 Mini 校验。详 [B2 土星条带证据](evidence/b2-saturn-opal-bands-2026-09-24.md)。

这是**历史云带纬向色彩示意**，不是自然真彩、实时天气、经度云纹、当前卫星阴影或时间正确的环投影阴影。普通模式下仅在同刻报告环极轴有效且土星盘面足够大时加载，图缺失、环遮挡纬度或坏极轴保留计算盘面/位置/相位。当前几何环影由后续独立报告字段计算，不以此图替代；目标微信像素与实际资源峰值待验。

## 2026-09-24 环影独立基准入口（研究时状态，后续见执行证据）

本地锁定 Astronomy Engine 的 `HelioVector(Body.Saturn, time)` 可取 Sun→Saturn 的 J2000 向量，`RotationAxis` 可取极轴；当前 BFF 只向 Mini 发送环极轴、观察者环倾角、相位，并未发送 Saturn→Sun 方向。该库的 `Illumination().ring_tilt` 是面向观察者的开角而非环影位置；直接把现有 OPAL 原图黑带或观察者环倾角用作今日阴影是错误路径。

[PDS Rings Saturn Viewer 3.1 帮助](https://pds-rings.seti.org/tools/viewer3_sat_help.shtml)给出可指定 UTC 的土星图，说明结果含次太阳/次观察者经纬度与相位，A/B/C 环有透明/不透明/半透明三类影子模型，且不表示半影。研究后已取得 2017/2026 两季具体输出并补报告与绘制；当前状态、误差及目标未验范围见 [B2 环影证据](evidence/b2-saturn-ring-shadow-2026-09-24.md)。前段“当前 BFF 不含”的表述仅记录研究时旧状态，不再驱动当前方案。

## 2026-09-24 OPAL 天王星／海王星候选（未接生产）

[MAST OPAL](https://archive.stsci.edu/hlsp/opal) 标注 CC BY 4.0，2025 年 Uranus Cycle 33、Neptune Cycle 32 的官方 README 给出行星图坐标和增强色三滤镜拼图，但下载核验的单幅彩色 TIFF 存在纬度缺测。按现有纬度条带有效行判据，天王星 207/361 行，海王星 302/361 行；缺测区不能填成当前球面云图。两份源、README、哈希、具体覆盖及生产准入条件见 [B2 其余外观来源证据](evidence/b2-remaining-appearance-sources-2026-09-24.md)。原图只保存在任务证据，没有进入服务/小程序包，也不改变 C05 未完成状态。
