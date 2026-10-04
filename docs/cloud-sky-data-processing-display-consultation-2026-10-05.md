# 云观星数据获取、处理与展示方案：外部咨询材料

材料日期：2026-10-05。仓库：<https://github.com/Seven128/Starward>。**请查看 `codex/remote-main-20260908` 分支，不要以默认 `main` 的旧代码判断。** 这是一份开发中方案的完整咨询入口，不是发布或验收报告。本文与本次提交同一版本；提交号由提供材料的人附上。

## 给咨询方的任务

请结合仓库实际代码、本文、已保存的真实输出和官方来源，独立评价我们“云观星”的数据获取、商业合规、离线处理、原生展示和端云成本方案。重点判断：有没有选错主路线、把简单展示问题过度科研化、遗漏更成熟且合规的成品/工具、设置不必要的质量前置，或低估覆盖、融合、版权与运营成本。请不要仅复述当前计划，也不要只因代码已有就认可它。

我们希望得到一条**能以合理剩余投入交付高质量体验**的推荐路线及有证据的替代方案。允许指出需要结构调整的地方，但请区分“沿用合适现有模块”“必要改造”“应停止的投入”。不要默认重写引擎、采购服务、全库下载或降低有效产品要求。具体问题和期望答复格式在本文末尾。

## 1. 产品目标、范围与硬边界

Starward 微信小程序的“云观星”，目标是在商业合规、成本和自主代码边界内，对齐 Stellarium Web 的完整交互星空体验。它属于小程序现有地点业务：正式观星点或当前账号本人待审 proposal，通过共享地点/时刻进入星空；不是独立网页天文图库。

有效体验包括：完整天球及地平以下连续浏览/缩放，分层真实恒星与星座，日月及七行星位置/相位/角尺寸/适用外观，银河与合规光学影像，模拟大气/晨昏/地景，网格/红光模式，中文检索与别名、定位/点选、时间变化/跟踪、资料与来源、返回恢复。绘制、标签、拾取、来源必须属于同一已绘帧和对象身份。还保留以下具体义务：

- 地景接近视野中心平滑淡出并真实显露后方星空，离开恢复；遮挡、请求需求与拾取同步。浏览地平以下不改真实高度/升落，也不宣称肉眼可见。
- 手动/姿态跟随、总览固定进入朝向、回局部取最新有效姿态；完整旋转冻结校准，确认/取消/断流拒绝；公共时间预览/取消/提交/跨午夜；互斥披露、共享资料 modal、独立来源 route 和 Back。
- 选择呼吸十字、名称独立淡化、真正空白取消、面状圆环、已绘核心拾取、柔光星芒和渐进恒星密度；不能用随机星点或生成式细节补数量。
- 冷暖进入、浏览缩放、选中细化、细档失败保粗、重试、图层组合、时间/跟踪、来源 Back、hide/返回、取消迟到及最终资源退休均须工作。

**资源分层取舍已经明确：广角较低分辨率背景 + 合格目标/区域高清。** 没保留高清的区域放大后细节有限；不能承诺任意方向都达到最高精度。这项取舍不减少完整交互义务，局部高清成功也不等于全天光学覆盖完成。当前 51 个深空对象、6 个 SDSS 光学对象、M51/M82 试验都不是需求上限；完整对象/区域优先级和最高有效档尚须核定。

不自动纳入网页社区账户/日志、桌面望远镜插件、所有移动版付费能力。大字号工作暂停。用户已明确旧云观星设计稿落后，本阶段不核对旧稿；按有效需求与实际体验审查。只开发云观星及必要共享依赖，不改其它业务逻辑。

完整原始细则、33 项 C/I/D/K/V 义务和范围覆盖见任务目录的 `request-original.txt`、`REQUIREMENTS.md`、`SCOPE-CHANGE-2026-09-23.md`、`GOAL-CURRENT.md`。下文缩写不取消这些义务；历史状态表和旧 next 不覆盖 `PLAN.md` 顶部。

## 2. 技术与自主代码边界

当前路线是 **Taro/React 的原生 WEAPP 页面 + Canvas/WebGL + TWGL + Astronomy Engine + 自有 BFF/静态资源**。不嵌 Stellarium 网页/WebView，不把 AGPL 引擎复制后冒充可闭源代码。代码、数据、数据库、API 获取和再分发的许可分别处理；数据的署名/相同方式共享不一概扩成核心应用开源义务。许可通知和需要开放的派生数据独立交付。

服务端既有 Node/Nest/Fastify、共享契约与天文计算。Python 只承担离线数据加工，浏览时不处理原始大图；浏览端只请求本方已出版静态文件和业务接口。离线已使用或试验成熟的 Pillow、NumPy、Astropy、PyAVM、Photutils 等；按具体版本保留许可，适合复用的成熟标准/算法/工具优先采用。HiPS/HEALPix、AVM、FITS/WCS/TAN 是不同输入及投影责任，不应混成某个库能自动解决所有问题。

已有共享时间、相机、投影、已绘帧、对象身份、请求/文件/解码/GPU 生命周期，方案改进应先检查这些 owner。现有实现并非不可改，但需要实际瓶颈或正确性证据；不能为同一职责再建平行队列、缓存、renderer 或来源真值。

## 3. 商业边界与许可现状

以下是**有日期的项目决定及已保存研究**，请咨询方复核具体官方原文与适用版本；本文没有重新在线认证全部现行条款。免费可下载、公共 API 可调用、镜像写了许可证，均不足以单独证明我们的获取/加工/自托管/应用展示/再分发全链获权。

| 来源/能力 | 当前决定与原因 | 重评边界 |
|---|---|---|
| DSS | 商业版排除；保存的 MAST 政策指出营利使用需书面许可 | 不能因别家产品在用就恢复；不能把需许可写成必然昂贵 |
| 当前 Gaia DR3/EDR3、指定 ESA 银河成品 | 因具体非商业/不足的权利依据排除 | ESA/Hubble 某张 CC BY 图片不覆盖这些产品；不能泛化“ESA 全不能用/全能用” |
| ISS 等卫星实时位置、轨迹、过境；彗星/小行星动态位置 | 暂缓，实际产品方式的来源交付权未确认 | 有无需逐项申请且明确覆盖用途的公开条款才重评；算法可算不等于可交付 |
| PS1、SkyMapper 成品 HiPS | 广域候选，普通商业路径仍关闭 | 原影像权、HiPS 数据库义务、实际获取/节流、自托管与分发分别闭合；未结论为绝对禁止商用 |
| SDSS 官方 JPEG/公开 release | 已核具体图像政策 CC BY 4.0 与公开 release 数据条款；保署名、改动/波段说明 | 特定小样成功不保证公共 cutout 可持续批量承载、所有对象质量或全天覆盖 |
| ESA/Hubble、NOIRLab 特定观测成品 | M51/M82 具体图片已做本地候选与对应权利记录 | 逐图核例外/完整 credit/有效链接/加工/关联显示；机构名不是批量授权证明 |
| ESO 全天/目标成品 | 有公开 CC BY 条款与具体候选线索，未完成本项目采用 | 特别区分公开 6k 与作者持有的更高分辨率原版；不外推未取得原版 |

用户不安排新增逐项商业授权费，不要求逐家申请许可，不购买付费引擎；这不意味着加工、机器、开发、存储和流量没有成本。当前也未授权外联/询价/采购或云部署。若比较付费数据，请列作需用户另行放宽约束的可选项，不作为默认推荐。

**署名是真实交付责任。** 保存 manifest 还不够；需要与当前显示图关联的可见简短署名、完整来源/许可/改动和必要数据下载。特定图要求完整 credit 清晰关联时，不能全部藏进来源页。当前个人主体小程序的外部网页跳转有平台约束，复制链接不等于已满足必须可点击的条款；仍须按具体许可核清。

关键官方入口：

- [MAST 使用政策](https://archive.stsci.edu/publishing/data-use)、[Gaia DR3 权利记录](https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/DR3.html)、[CelesTrak](https://celestrak.org/usage-policy.php)、[JPL 小天体 API](https://ssd-api.jpl.nasa.gov/doc/index.php)。
- [SDSS 图像政策](https://www.sdss.org/collaboration/image-use-policy/)、[DR17 corrected frames](https://www.sdss4.org/dr17/imaging/images/)、[DR18 成像覆盖](https://www.sdss.org/dr18/imaging/)。
- [ESA/Hubble 条款](https://esahubble.org/copyright/)、[M51 heic0506a](https://esahubble.org/images/heic0506a/)、[M82 heic0604a](https://esahubble.org/images/heic0604a/)、[NOIRLab 条款](https://noirlab.edu/public/copyright/)、[ESO 条款](https://www.eso.org/public/copyright/)。
- [PS1 公共条款](https://registry.opendata.aws/mast-panstarrs/)、[SkyMapper HiPS 记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)、[HiPS 1.0](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf)、[Hipsgen](https://aladin.cds.unistra.fr/hips/HipsgenReferenceManual.html)、[ODbL](https://opendatacommons.org/licenses/odbl/1-0/)。

精确原通知、信用、版本和已拒绝理由以 `project_context/external-capabilities.md`、各资产 manifest/NOTICE 和任务研究为准。

## 4. 全部相关数据家族，不把星系照片当整个星空

| 家族 | 当前来源与做法 | 必须保留的含义/限制 |
|---|---|---|
| 恒星 | HEASARC BSC5P 基础 + SAO 分片补充；自行/历元、身份与显示分层 | 不恢复 HIP/Tycho 非商业数值，不宣称完整 Gaia 或统一深度；缺颜色/距离不编造 |
| 深空目录/中文名称 | 指定 OpenNGC Messier 子集 CC BY-SA 4.0；Wikidata CC0 中文别名等独立来源 | 目录权不授予照片权；样本数量不封顶，不称全部名称权威/完整 |
| 88 星座 | Stellarium 固定版本定义/英文名 CC BY-SA、插画 FAL 1.3；中文名指定维基版本；BSC/SAO 坐标 + SIMBAD 身份派生几何 ODbL | 713 锚点、系统代表点等是有说明的绘图几何，不称测量光心；分项通知和派生下载 |
| 天文位置 | Astronomy Engine MIT + 实际地点/时刻/身份 | 同一计算帧供应盘面、标签、拾取、定位/跟踪；不是用照片位置代替实时计算 |
| 广角银河 | 特定 2MASS 2048×1024 历史近红外全景，703,555B JPEG | 不是可见光全天高清/实测亮度/当前天气；单图 RGBA 等效 8MiB |
| W3 广角 | AllWISE 12µm、12 张 512² order0，678,144B JPEG；默认关闭 | 历史红外、仪器伪影/缺口；完整 12 图 RGBA 等效 12MiB，不代表光学；与广角银河按 owner 互斥 |
| W3 目标 | 51 个目录目标的分级切图，冻结来源/覆盖和版本 | 独立红外替代，不与成功光学混成伪彩；有效黑、未知和真实无图分开 |
| SDSS 光学目标 | M51/M63/M64/M81/M82/M87，现有三级 512 JPEG | 局部 gri 成品，部分条纹/饱和/色块已失败；不是 14,055 平方度数据自动全接或全天 |
| Prepared 目标 | Hubble/NOIRLab 有来源与 AVM 的出版 RGB → 共用 TAN/LOD/出版 | 真实观测成品而非科研测光；默认 registry 空，显式开发候选不等于产品采用 |
| 日月行星纹理 | USGS Clementine 750nm 月面、MESSENGER 水星灰阶、Viking 火星彩色化；HST OPAL 木/土/天王/海王历史纬度统计；金星等适用模型 | 月面新 coverage-v2 保缺测；OPAL 去经度特征只作历史色带，不冒实时云纹/自然真彩；本体轴/光行时/相位/尺度另算 |
| 地景/大气 | 合法全景素材与可解释晴空/晨昏模型、地景 LOD/渐隐 | 地景不要求普遍逐点 DEM 实测；也不冒当前站位山体/现场天气。素材自身 CC BY-SA 等通知独立保留 |

资产清单在 `workers/miniapp-api/assets/`、`packages/astronomy-core/data/`，加工入口在 `data-pipelines/`。请用实际 manifest 确认精确版次与署名，不能把表中摘要当所有文件共享一张许可。

## 5. 为什么当前不直接下载一张高清图就结束

**我们现在已经下载并复用高清成品，成品优先是当前路线。** 问题并非“高清图太贵所以拒绝用”。一张具体照片可能免许可费，但仍存在：

1. 照片只覆盖有限天区。目标细节清晰，不意味着能铺满总览或星系外围；放大低采样照片只会插值。
2. 出版图有旋转、裁剪、波段/颜色处理、未知或近似 WCS/AVM；必须对准当前天球和目标层，不能用矩形屏幕贴图替代天文几何。
3. 曝光后的背景不等于渲染天空的背景；照片矩形、弱尘埃/喷流、星点、噪声与缺测很难用一个透明阈值分开。随昼暮、缩放、粗细层变化会显露接缝。
4. 高分辨率源文件适合离线处理，不必每次发给手机。传输压缩字节、解码 RGBA、GPU、副本与多图共存成本不同；缓存只减少重复工作，不消除初次成本。
5. 成品许可/信用、派生处理说明、批量异常处理、版本/缓存/旧客户端兼容都须可追踪。

因此当前采用“保存一次原图与元数据 → 离线必要处理 → 按视野/屏幕需求发布多档 → 实际页面渐进显示”。希望咨询方重点判断这条链哪些步骤必要、哪些过重，以及有无更成熟的已配准/预处理/分级成品能省去剩余工作。

## 6. 当前离线处理与版本化出版

### 6.1 Prepared 成品路线（当前优先）

`prepared_rgb_observation.py` 保存并校验原 JPEG/XMP/credit/许可/波段/来源和具体元数据；`prepared_rgb_tan.py` 沿已记录 AVM/WCS 将 RGB 重采样到北上东左的目标 TAN 网格；`prepared_optical_levels.py` 从冻结输入产生多档。保源/母图/处理代码/输出 hash、像素几何、缺测与有效黑、来源和原精度限制。

这里的 RGB 是出版显示值，科学有效性仍可为 UNKNOWN。几何上落在照片内，不等于有科学有效观测；显示 alpha 不冒科学掩码。原始像素、缺测隐藏 RGB、有效黑不能因融合方便而混同。普通插值、平均、去噪或背景估计必须可解释、有记录，不能生成天体细节或删真实弱结构。

已有 `prepared-optical-v1` 严格限定一幅 2048² 母图和三级 512。`prepared-display-optical-v1` 是有实际处理谱系的显示估计，不能冒原 RGB 重采样。源/geometry/处理/canonical hash/HTTP 文件校验共用 owner；旧 hash/URL 与旧消费者保留。

**最新已实现 `prepared-optical-v2` 的一个实测配置：OVERVIEW 512、MEDIUM 1024、DETAIL 1024。** 它绑定同一 Hubble 原图/近似 AVM，但宽层来自已有 2048 母图、细层来自单独 1024 细网格；没有伪称一幅 4096 母图，也没有借旧 v1 hash 改尺寸。新合同绑定完整旧父出版、两个网格/原图身份、几何、处理回执和真实 PNG；旧 v1 不放宽。512/1024 是当前有证据的配置，不是所有来源的永久需求上限。

新的 `publish_prepared_progressive.py` 复用冻结宽母、已生成中档和细网格，核全值/支持/输入前后身份，再沿既有 publisher 打包；本次无需再次下载、JPEG 解码、投影、背景拟合或制造整幅 4096 网格。普通 Prepared registry 仍为空。

### 6.2 科学原始数据路线（保留，条件补缺）

此前为解决 SDSS 成品条带、颗粒、颜色/覆盖问题，开发了 corrected FITS 获取、WCS/原生采样、g/r/i 共同覆盖、mosaic、signed 科学值先平均再固定显示、冻结显示 recipe、fpM 质量、CALIB/SKY/CAS 噪声、同 RUN 重复 CCD/协方差、局部 PSF/配准和显示估计诊断。

这些成果有复用价值，但完整 M82 图质仍未过。已校准并扣 sky 的 SDSS 源不能再次默认扣 sky；负值不是无数据；nmgy/native-pixel 均值不冒粗像素总通量或跨源统一表面亮度；条件 variance、局部检测/PSF 和几颗对应星点不供应整图置信或绝对配准。不同波段的 Hubble 与 SDSS 不应被强迫同色。

研究中出现过 Gaussian 色度、线性光混合、OETF、局部 Wiener/PSF matching、robust 背景等小样；多项因真实劣化或资格不足未采用。当前停止无必要的重复扫描、PSF/噪声深入和反复调同一失败图；只有成品无法满足的明确缺口与可说明收益才恢复原始加工。不要把此前投入量当必须继续的理由，也不要要求每张展示照片先成为科研测光产品。

## 7. 实际样本、质量结果与最新进展

| 对象/来源 | 实际输入与覆盖 | 已知结果 |
|---|---|---|
| M51 Hubble heic0506a | 缓存 4000×2776 JPEG，4,060,187B；原参考 9.56×6.64′；AVM 备注约 5″位置不确定 | 2048 母图三级 PNG 1,315,239B；总览几何支持约34%、中档96.7%、细档100%。照片矩形/接缝 FAILED，未采用 |
| M82 Hubble heic0604a | 缓存 4000×3116 JPEG，9,657,945B；参考7.91×6.17′、原参考网格9500×7400；B/V/H-alpha/I 历史合成 | 目标总览13.653′时几何支持26.134%、中档83.555%、细档100%。原三级512共1,152,395B，总览矩形 FAILED |
| M82 Hubble 新渐进档 | 复用宽2048 + 中档1024精确裁片 + 细域1024重采样 | 三 PNG **4,357,051B**：135,683 / 1,886,809 / 2,334,559B。细节/父层采样清晰度改善，但真实照片外沿、弱结构、昼暮和绝对配准仍未通过 |
| M82 NOIRLab | 同照片4000×2233及8315×4642；原约58.87×32.87′，历史B/V/R/I/H-alpha | 广域几何支持充分，但细档原采样约232/482像素跨512输出。较大版原JPEG9,250,383B，raw三级1,213,030B、显示估计1,208,058B。暗底改善、主体仍软/颗粒可见，未采用 |
| M51 NOIRLab noao1309a | 4000×3725，约33.22×30.98′，细档约411原像素 | JPEG1,162,674B、三级1,151,313B；背景接缝 FAILED，配色不同，未采用 |
| 6个SDSS目标 | 三档原JPEG合计各约49–64KB，M81总览更宽 | 传输小不代表足够细节/覆盖/质量；已知条纹、饱和、色块不能靠淡出验收 |

以上“支持率”是指定方形目标网格的离散几何支持，不是科学有效率、完整天体率或所有视角覆盖。原片分辨率、输出像素、屏幕有效细节和 PSF 分辨率也不相等。

实际公开平移使细粗边界显露后，直接以 NOIRLab raw/display 作 Hubble 高清父层都有明显颜色/结构断层，当前否决直接替换。复用同源1024中档减少采样落差，但不能由一个边界统计宣布无缝或整图合格。此前四帧严格还原仍有两个 RGB 通道各差1、成因 UNKNOWN，原失败代次最终逻辑退休回执缺失；后代成功不倒填。

最新 v2 已经过显式出版 → 当前真实本地 HTTP controller/service → 原完整 Taro page/Hook/Scene → 实际软件 WebGL：两个1024档被真实加载/绘制；细档503时保中档，公开重试恢复；完整来源页/Back、hide 暖回；三PNG每路径只首传，当前代次还原像素精确，最终活动资源退休。**这仍是受控 native API/软件 GPU 的开发验证，未证明微信 WXML 组合或手机。** 显式 caller pin 只用于开发；默认用户路径没有偷偷开启候选。

最新标准静态导出已同时包含旧 v1 与新 v2，逐文件/hash/header 读回；6张 Prepared 共5,509,446B。本次完整导出资产逻辑86,075,579B，不是全机库存。**新版本实际 Caddy/TLS/公网出口、旧版/回滚/暂存保留和最终产品采用仍未闭合。** 此前其它版本的静态出口证据只保其原输入范围。

可在仓库直接查看的精选图、版本 manifest、开发结果、像素/资源读回及复制来源 hash，见 [咨询证据包](../.codex/work-items/cloud-sky-native-2026-09-22/evidence/consultation-2026-10-05/README.md)。图是实际 Canvas 输出，不是整页设计稿，不包含完整 WXML 视觉。Hubble 完整信用见证据包说明与 manifest。

## 8. 客户端如何加载、融合、保粗和释放

大致责任链：`SpotSkyPage` 的地点/时刻/相机/对象意图 → typed publication/resource → 共用 `useSkyTargetOptical` → `useSkyNativeImages`/文件 owner → TAN registration 与 scene frame → TWGL/WebGL 纹理及已绘来源 → 来源页/Back。

- 按实际视野/屏幕需求和有限 footprint 选择档位，相邻粗层供应细层以外的有效区域；细档未到或失败保留有效粗层。视野离开、对象/hash/Canvas 代次改变时取消、拒迟到并释放相应资源。
- 成功光学与 W3 的替代、有效黑、真正空范围、资格 UNKNOWN 分开。不能因为某次提交了一个 mesh、某处有亮像素或 source 请求200，就认定目标局部可辨认、允许隐藏目录辅助或把来源算成真正参与。
- 当前共享 GPU 参与资格/局部辅助透明度与最终已绘来源有相应 owner；pre-aid 观察和最终 credit 不混淆。图层/红光/地景遮挡/退休可能改变最终参与，不能拿上一帧身份冒当前帧。
- 图像文件以 immutable publication/content hash 去重、校验、原子写入和租约管理；压缩文件可跨页/启动复用，decoded/native/GPU 随页面/Canvas 活动释放。损坏、配额不足、清理/迁移、并发和迟到取消都保留恢复语义。
- 当前共享压缩文件目标32MiB、两条图像 I/O 槽；它们不等于所有 metadata/decode 都只有两并发。GPU16MiB是分配压力目标，当前正在绘制的工作集可超过，不能作为全机或帧末硬 cap。
- 光学 loader 的原2MiB值是**非当前资源的保留压力**，不会截断当前需要的两张1024图。最新已撤回未经实测支持的8MiB保留预算增加；暖缩放回看仍复用压缩文件，当前两1024逻辑8MiB、缩回概览时非当前大图退役。准确读回见证据包。

**刚补测发现的未解决过渡问题：** 稳定画面恢复0像素差、下载复用和最终退休成立，但暖缩回概览期间，实际 Scene 有一帧不带任何 Prepared 图；该阶段两次最终光学来源为 null，回细档还有一次来源 null。不能将“最终恢复成功”说成全程无闪烁或粗层从不断档。这里至少涉及退役、新档解码及实际参与资格的衔接；可见持续时间与完整因果仍未知，不能直接归因所有 null 或凭猜测扩大预算。下一开发需在既有 owner 核这一窄过渡，保留本次失败/缺证；咨询方可据此评价保粗策略。

还需核对：屏幕密度/最大有效档、预取/退档策略、瞬态旧新共存、CPU 解码与 GPU copy/归因 pass 成本、全家族实际共同参与、尾延迟与真实设备帧时。没有新瓶颈证据不大拆生命周期或扩大缓存。SAO突发请求去重须先复现；曾测到通用响应缓存24项容量压力导致三基础条目暖200，不能把所有暖请求问题统归图像字节缓存。

## 9. 生产资源、规模、成本账和保留义务

目标是**全小程序200 DAU，不是200同时在线**。生产预期一台 Linux 4核16GB、12Mbps 公网峰值、2000GB/月出流量、180GB SSD；测试服4GB保持。预期配置不是已采购/升级/部署，也不是容量通过。普通天气/地点/账户/数据库/媒体等业务共享资源；不得把全部盘或主机费分给星空。

优先离线出版、同机 HTTPS 静态直出、按需渐进加载、有界客户端缓存；没有实测瓶颈/成本证据不新增 CDN、对象存储或额外服务器。影像方案不豁免其它业务独立媒体存储责任。

已更正的重要事实：SkyMapper 某彩色 HiPS 官方 `hips_estsize=6336620843` 的单位是 KB，约 **6.34TB**，不是6.34GB；`hips_nb_tiles=10623303`。这是该库发布者估算，不是所有天文方案的最低库存。它不能全量装进180GB共享盘；渐进加载和客户端缓存不能消除全库存缺口。`clonableOnce` 表示从 master/指定实例复制的限制，不是终身只发一次请求；获取状态也不替代版权和数据库义务。

成本分开记录：数据/许可现金、Agent开发与研究、机器离线加工、项目方参与、外部等待、最终文件、原始/中间产物、传输、服务算力与持续维护。未知不填零，不编时薪，不把共享主机全费摊给星系，不声称已证明绝对最低成本。旧350元试用上限、0.25元/DAU/月和820/1080元情景都不是本方案现行上限；也没有 Goal token/时间预算。旧“1–2开发日”仅路线验证估计，不是交付承诺。

用于比较的算术，不是容量实测：200DAU×30天、每个活跃人日新增影像出口 S MB，则月影像约6S GB；若比例 f 使用云观星再乘 f。S须含真实访问、命中/失效与重试，不能取库存总大小。S=10/50/100MB对应60/300/600GB/月，另加普通业务。12Mbps理论载荷约1.5MB/s；10人各冷取2MB共20MB至少约13.3秒，20人约26.7秒；这不是每个首屏必等这么久，也未计协议、并发调度和其它业务。

新 M82 v2 三PNG共4.357MB，单独按12Mbps串行全取理论约2.90秒；只是全档载荷下界，不是首可用/解码时间。原9.658MB JPEG约6.44秒只是同口径对比。必须分别测压缩、native-RGBA、GPU纹理/buffer/copy、临时旧新峰值，不相加各时刻 maxima 当物理峰。

生产保留需覆盖当前、旧客户端兼容、回滚/备份、暂存、镜像、DB、日志与余量；源图/科研中间件可在离线环境另计。不能只按年龄删旧 immutable URL 或以当前导出总量声称180GB已验。10/20同时冷进入与正常混合业务、实际出口分类、首可用/细节完成/尾延迟/帧时/全机盘及资源尚须实测。

## 10. 已知失败、未验证与不应误读的证据

- **图质未通过：** M51/M82照片矩形、接缝；部分 SDSS 条带/饱和/暖底/颗粒；NOIRLab/Hubble跨源父层断层；弱结构、照片真实外沿、完整配准和昼暮组合仍有缺口。免责声明、粗层降级或测试数量不能替代质量成功。
- **普通 Prepared registry 空；新版本未产品采用/部署/发布。** 合同、publisher、HTTP、显式 page 路径存在和局部通过，不等于默认产品接入。
- **目标运行时有缺口：** WXML/Canvas 组合仍有 `FAILED_DEVTOOLS` 记录；当前手机不可用，Android/iOS义务保留，新月面未推手机，旧手机证据不能验新版。软件 WebGL 的真实像素/完整 page 状态不冒原生微信合成和物理性能。
- **独立审查未全闭合：** 旧共享机制有各自有限独审；最新处理/采样/渐进版本仍缺新的独立审查。自审和保存文件读回不是独审。此咨询本身只有真正核源/代码/输出并指出范围才构成其声明范围内的审查。
- **资源与运营未验收：** 已有多家族资源观察/实际 HTTP，仍未构成全部组合的物理峰、200DAU混合容量或生产保留通过。新 static 导出不等于新 static 网络出口。
- 历史失败、原代次缺回执、严格还原差异和任务脚本错误各保原状态。最新暖缩放最初因 FOV 最末浮点位差失败；图像实际0差，修正任务比较后同一代码/bundle的窄路径再核，未修改业务行为来迎合测试。

## 11. 已研究的成熟替代，不要从零再搜一遍

2026-10-04 已有成品优先调研及归并，见任务 `evidence/galaxy-imagery-time-money-research-2026-10-04.md` 和 `evidence/galaxy-imagery-direction-reconciliation-2026-10-04.md`。可对其结论质疑，但请区分已证实事实与尚未核源线索：

- Stellarium 桌面手册有照片、plate solving/WCS、纹理元数据和批处理工作流；不能据此推定其脚本/素材都可闭源商用或 WEAPP 可直接运行，也不照搬抹黑/删星的弱结构损失。
- WWT 支持 AVM JPEG/TIFF，说明展示成品路线成熟；可复用标准，不需要移植整套 WWT 引擎。
- Hipsgen 支持按最高阶/区域/格式部分镜像和节流；具体工具代码许可、图像权和数据库义务仍需核，不必另造全库爬虫。
- [ESO eso0932a](https://www.eso.org/public/images/eso0932a/)公开6000×3000全天照片（约7.8MB）可作光学广角候选；800M像素原版需另向作者取得，不能外推公开版许可。投影、历史行星、重复星点与目标图接续未验。
- [HITS/ESO Supernova 项目](https://gitlab.com/HITS_Supernova/1007_milkywaypanorama)的 MIT代码/CC BY清理图是研究线索，未核固定文件、清理方法和完整权利，不是已采纳资产。
- [Legacy 团队自制图层政策](https://www.legacysurvey.org/acknowledgment/)不自动覆盖站点第三方图层；已有失败小样不能当全库可用或全部不可用。
- Axel Mellinger高分辨率商业数据和Stellarium商业许可有入口，但没有报价、仅数据合同、终止后权利或合格样品；不默认购买更便宜/更贵。

## 12. 仓库阅读路线、证据可见性与完整索引

先读本文与证据包，再按问题读 owner；不需要全部旧聊天、几千个脚本和递归交接。以下路径相对仓库根：

| 要核的问题 | 直接入口 |
|---|---|
| 最新状态与唯一下一依赖 | `.codex/work-items/cloud-sky-native-2026-09-22/PLAN.md` 顶部、`CONTINUE-CLOUD-SKY.md`、`GOAL-CURRENT.md` |
| 原始要求与范围 | 同目录 `request-original.txt`、`REQUIREMENTS.md`、`SCOPE-CHANGE-2026-09-23.md`、`USER-UPDATES.md` |
| 商业依据与已否决项 | `project_context/external-capabilities.md`；任务 `OPTICAL-DATA-RESEARCH.md`、上述两份10-04调研与来源/覆盖/成本表 |
| 产品与同帧/来源/恢复 | `project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md`、`shared-state-and-recovery.md` |
| 架构与缓存/资源归属 | `project_context/architecture/runtime-and-domain.md`、`maintenance-boundaries.md` |
| 端云容量与静态出口 | `project_context/deployment/decisions-and-verification.md`；`tools/deployment/sky-static-bundle.mjs`、`infrastructure/deployment/` |
| 原图准入/名义AVM/TAN/多级/出版 | `data-pipelines/deep-sky/prepared_rgb_observation.py`、`prepared_rgb_tan.py`、`prepared_optical_levels.py`、`publish_prepared_optical.py`、`publish_prepared_display.py`、`publish_prepared_progressive.py`、`optical_publication_io.py`、`README.md` |
| 精确版本/尺寸/来源/信任边界 | `packages/miniapp-contracts/src/prepared-optical-common.ts`、`prepared-optical-publication.ts`、`prepared-display-optical-publication.ts`、`prepared-progressive-optical-publication.ts`、`prepared-rendered-optical-publication.ts` 及相应测试 |
| BFF准入/图片/资料 | `workers/miniapp-api/src/prepared-optical-imagery.ts`、`target-optical-image-file.ts`、`controller.ts`、`celestial-object-information.ts` |
| 原生页面与真正消费者 | `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx`、`use-sky-target-optical.ts`、`use-sky-artwork.ts`、`sky-artwork-loader.ts`、`sky-tan-optical-registration.ts`、`sky-sdss-optical-frame.ts`、`sky-target-optical-visibility.ts`、`sky-scene-render.ts`、`sky-gpu-renderer.ts`、`sky-gpu-textures.ts` |
| 公共文件与版本缓存 | `apps/wechat-miniapp/src/services/sky-public-image-cache.ts`、`sky-public-image-runtime.ts`、`sky-publication-resource.ts`、`prepared-optical-resource.ts`、`prepared-optical-client.ts`、`sky/sources/index.tsx` |
| 原始科学加工，只有必要时深读 | `data-pipelines/deep-sky/sdss_corrected_frame.py`、`sdss_gri_tan.py`、`sdss_frame_quality.py`、`sdss_frame_noise.py`、`sdss_noise_display.py`、`sdss_noise_model_increment.py`、各 `publish_sdss_*`；任务对应具体证据 |

本次提交包括当前 Git 管理/未忽略的全部改动，六项原有 Settings/outbox 修改单独提交；它们与本咨询影像方案无关，勿从提交混合推断云观星改了这些业务。未提交 `output/` 下被既有规则忽略的大批下载、构建、原始设备/临时产物；它们不在远端可见，不能假装 Web GPT 已读到。为本咨询复制了少量必要非私密图与结构化回执到上述证据包，附原路径/字节/SHA256。其余本地输出链接不可访问时请明确记缺证，向材料提供者列最小补充项，不要根据日志文字编造图像结论。

## 13. 请回答的核心问题与交付格式

1. **总体方向：** 广角低分辨率光学背景 + 目标/区域高清是否适合我们的完整交互目标、商业边界与180GB/12Mbps？有哪些用户可见损失必须明确，怎样定义覆盖和最高有效档才可验收？
2. **数据获取：** 还有哪些成熟、质量稳定、条款明确覆盖商业加工/自托管/再分发的成品、开放巡天、图库或分级数据更适合？请给具体产品/版本/条款与获取限制，分别评估全天、目标、区域，不只列机构名。
3. **合规判读：** 现有排除和候选判断是否错误、过严或漏项？PS1/SkyMapper/CDS ODbL/图像内容权到底还缺哪一步？如果认为可用，请给覆盖实际链路的官方依据；不要用“开放数据”三个字跳过它。
4. **处理强度：** 成品图需要哪些最低必要的几何/质量/来源检查？哪些科研处理前置可删或推迟？已有原始科学路线哪些应保留作补缺、哪些应停止投入？
5. **真实融合：** 当前矩形、背景、细粗接续、跨源颜色、弱结构与双重星点问题的根因和优先解法是什么？是换源、限定适用视场、统一多级采样、某种成熟显示/合成方法，还是某个 renderer 责任有误？请结合实际图和代码，不给泛化“抠黑/羽化/加法混合”。
6. **分辨率与格式：** 当前512/1024分层是否合理？如何用源有效采样、手机屏幕/DPR、角视场、解码/上传成本选择档位/预取/退档/压缩格式？更大源图何时值得，何时只是放大低清或增加库存？
7. **架构与资源：** 共享文件、decode、GPU owner、资格/已绘来源是否正确且成本合适？是否存在足以纠偏的重复工作、同步点、过度归因、缓存或队列瓶颈？请提出针对现有 owner 的具体改造与验证，不默认造框架。
8. **批量出版：** 怎样建立能扩展到更多星系/星云/区域的共享流程与异常复核，避免逐对象手工修图？如何分类不适合的源、保留不可变版本和旧URL、估计异常率与维护成本？
9. **总成本和优先级：** 按现有资源分清开发/机器/现金/外部等待，估计可解释的区间及前提。哪条路线的剩余成本更低、如何低成本证伪？不要虚构报价、工时、命中率或将200DAU当并发。
10. **下一步：** 请给一份依赖顺序明确的最小修正计划、停止条件、需要的代表性输入与验收指标；保留完整要求，但不要重跑已有闭合矩阵或循环下载/调同一失败图。

建议答复结构：先给结论与最高优先级问题；再给“当前方案/推荐方案/条件替代”的对照表（覆盖、商业权、画质、处理、WEAPP支持、存储/流量/活动资源、维护与证据置信）；逐项列应保留/应改/应停；最后给最小验证计划、官方引用、尚缺证据和必要补充材料。明确区分事实、推断、建议和未知，不以免责声明或成功降级替代承诺能力。
