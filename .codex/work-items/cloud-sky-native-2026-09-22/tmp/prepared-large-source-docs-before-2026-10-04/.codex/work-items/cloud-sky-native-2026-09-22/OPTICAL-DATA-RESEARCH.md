# 光学巡天实质缺口：2026-09-22

**当前成品供给与背景判断（2026-10-04）：** [完整4k照片范围与单源小样](evidence/experience-prepared-native-extent-and-background-2026-10-04.md)已核24原像素窗、名义范围上界和实际相邻层接续。M51北晕/拼接未分类，不视为空背景；M82一次Photutils BSD-3 source-masked显示估计降低暗底但细节仍软，完整弱结构/处理版本/来源出版及page/native未通过、不采用。几何alpha与估计mask分别保持，原成品/母图/出版pins不变；M82 15.489′/M51 25.142′只为采样几何供给，非科学/安全范围或需求上限。官方同照片Large JPEG（页面标8.8MB）是现4k约232源像素细档缺口的具体候选，真实下载尺寸/有效细节未验证，执行只由PLAN顶部控制。[具体成熟纹理权利检查](evidence/prepared-texture-rights-check-2026-10-04.json)未闭合Peter Vasey M51/M82图片许可链，未复制/外联；不按混合资源清单恢复DSS或泛化所有Stellarium图片许可。

**当前源兼容性与显示合成（2026-10-04）：** [真实对应点/线性光小样](evidence/experience-prepared-wide-compatibility-2026-10-04.md)复用缓存，不新增源请求/投影。M51四个/M82两个孤立对应点的留出未支持通用全图修正，原坐标/配色保持；相同sRGB ICC不证明跨滤镜颜色兼容，M82 Hubble无ICC保UNKNOWN。两NOIRLab有明确sRGB ICC的单源线性光Scene合成6帧降低白天接缝，夜矩形仍FAILED、不采用；不是旧统一曝光重跑，不创建混合母图/普通registry。完整原成品/现裁片边缘的真实结构和背景供给按唯一PLAN继续核，不把现裁片、4k/六样本当上限，不以透明化冒融合成功。生产无本代变化，六保护、原BFF/watch和目标运行时/质量缺证保持。

**当前补覆盖实测（2026-10-04）：** [NOIRLab宽视野具体源](evidence/experience-noirlab-prepared-wide-2026-10-04.md)已有实际图片/政策/AVM/标准本地writer/当前Scene证据，不是采用。两具体图公开CC BY 4.0并保完整credit；与页面DSS查看器及NOIRLab科研数据授权分开。新源空Spatial.Notes已窄修，不改原字节/坐标；现有总览三档几何支持100%仍不能称科学覆盖，Scene方形背景及宽图细档/跨源颜色配准未通过。执行只看PLAN顶部，不重Hubble加工或旧闭合矩阵。

**2026-10-04时间/现金复核：** 见[本次调研](evidence/galaxy-imagery-time-money-research-2026-10-04.md)。下文SkyMapper规模已按HiPS规范KB单位更正为约6.34TB，`clonableOnce`更正为仅从主站复制；两项修正不解除原商业交付/画质门禁。本文件的旧试验下一步是历史，不覆盖唯一PLAN；成品优先建议已在用户后续授权下归入唯一PLAN的当前开发方向，见[归并决定](evidence/galaxy-imagery-direction-reconciliation-2026-10-04.md)；本次仅文档采用，尚未实施新图接入或通过质量验收。

**继续执行更新：** Hubble M82具体图片/政策已实际取得，完成三级覆盖、现有writer打包与当前Scene；发现并修复Prepared契约错误等轴尺度限制。现在同SpotSkyPage显式Prepared kind/ref/hash沿共同owner接通，三级失败保粗/重试、完整原credit Sources/Back，以及提交时间后的全景/W3/地景/暖返回有[实际页面组合](evidence/experience-prepared-m82-page-combination-2026-10-04.md)开发证据；未重下载/投影。矩形边界仍FAILED，普通registry空，不是图质/微信原生/容量采用。源事实见[实际路径](evidence/experience-hubble-m82-prepared-2026-10-04.md)和[来源覆盖成本表](evidence/prepared-imagery-source-coverage-cost-2026-10-04.md)；上段“仅文档”仅指调研归并当时，当前唯一下一以PLAN顶部为准。

任务过程研究，未采用新数据源、未下载巡天、未发布。保持原生引擎技术选择。只为关闭全空域光学输入与分发权益缺口；不能把当前 AllWISE W3 红外 51 个目标变成光学全空域。

> 开头描述是 2026-09-22 初始阶段；后续有界真实样本和当前结论以末尾日期小节为准。

## SkyMapper DR4

- 官方发布：https://skymapper.anu.edu.au/data-release/ （2024-02-05 DR4）；现行站点描述 26,000 deg²、400,000 images、700M objects、15B detections，uvgriz 光学，图像 WCS TPV。
- 访问：https://skymapper.anu.edu.au/how-to-access/ ，全球开放 DR4，catalog cone/TAP、image SIAP/cutouts。访问权与批量抓取、自托管、商业分发及服务成本须分别落实。
- 引用：https://skymapper.anu.edu.au/how-to-cite/ ，Onken 2024、DOI 10.25914/5M47-S621 和项目致谢。
- 科学项目策略：https://skymapper.anu.edu.au/science-projects/ ，DR4 以后没有 protected science projects；这不单独证明版权许可。媒体图库 CC BY 3 AU 也不外推到科学数据。
- DataCite 权威元数据 https://api.datacite.org/dois/10.25914/5M47-S621 已实际读取，原字段保存在 evidence/skymapper-dr4-rights-metadata.json。数据集标题 SkyMapper Southern Survey (SMSS) Data Release 4 (DR4)，rightsList 明确 Creative Commons Attribution 4.0 International；落地页 https://pid.nci.org.au/doi/f8385_1384_4572_2327 。NCI 网页工具未成功访问，不能声称已读落地页全部条款。
- 元数据摘要与当前站点的数字/时间不同：南极至最高 +28°，2014-03 至 2022-11、>16B detections、>24,000deg²、>700M objects、AB8–22；摘要对深叠加 tile/native及PSF homogenized/整半球假彩色图用未来式 will include。不能把这些当现已可取得的完整产品。下一步验证实际 SIAP 产品、覆盖/缺带/质量/配准、发行物许可适用范围及批量服务政策。
- 2026-09-23 官方[访问文档](https://skymapper.anu.edu.au/how-to-access/)实读：DR4 SIAP `https://api.skymapper.nci.org.au/public/siap/dr4/query?` 只列出切片，不直接返回图像；`get_image` 字段再取实际 PNG/FITS/bitmask。切片每边 **<10角分**，`INTERSECT=CENTER` 可返回不完整覆盖，需用 `COVERS` 或读实际切片中心/footprint；PA=180 的 PNG 已旋成北上东左，但 FITS 保留原方向和 WCS，不能混用。官方明确因带宽不提供完整 CCD（38×19角分、4096×2048）下载，完整图或批量下载须另行联系。开放访问与 DOI 元数据中的 CC BY 4.0 都不能自行推出该公共在线服务可支撑用户逐视角全天瓦片请求、无限批量抓取或可得全量自托管图像；生产采集权利/服务承载/真实覆盖均未闭合。未向供应方联系、未下载影像、未接产品。2026-09-23 [DR4发布文档](https://skymapper.anu.edu.au/data-release/)确认该服务为逐次观测 reduced image 与 TPV WCS，417223张跨不同深度/质量；其目录面积及纬度最高值仍不证明无洞全天马赛克。

## Pan-STARRS1

- STScI 官方入口 https://outerspace.stsci.edu/spaces/PANSTARRS/overview ：DR2（2019-01-28），grizy，3PI 约四分之三天空，stack 图像与目录。
- 图像接口 https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812251/PS1%2BImage%2BCutout%2BService 。FAQ 页面读取失败，不能称完整核查。
- 文档列出的机制差异：目录约 4.9deg²/0.016% 源缺失不等于同范围图像缺失；stack与mean-epoch天体测量精度不同；旧图像header和更新目录校准可不同；极区>85°约0.5″WCS误差/重影；FITS tilecompression、旧PC001001关键字、asinh flux、整skycell缺RADESYS需文档FK5处理、TIMESYS TAI。实际选图和配准需读取产品header确认。
- MAST 数据使用 https://archive.stsci.edu/publishing/data-use ：大部分归档数据 public domain，部分HLSP为CCBY4；DSS/GSC明确版权例外，营利商业用途需书面许可。PS1没有出现在该例外列表，可作为候选依据，但仍须核实PS1具体权益/引用/再分发，不直接宣布全量商用已获权。

## 候选方向与未决

PS1 北天 + SkyMapper 南天可能形成光学覆盖，尚未采用。必须取得真实 footprint/MOC、缺带/缺片、深度和色彩差异、接缝/校准、历元版本、可更新性、服务与自有存储分发成本。目录面积相加不能证明所有方向和分辨率均有有效图像。只在当前产品实际可取、权利适配且投影/渐进链路实测后才把采用结论写回 external-capabilities owner。DSS 商业权益仍未解决。

## Gaia 银河/深星候选：2026-09-23 权益和可配准性核查

- [ESA Gaia EDR3 官方 DOI](https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/EDR3.html) 与 [DR3 官方 DOI](https://esdcdoi.esac.esa.int/doi/html/data/astronomy/gaia/DR3.html)均在 Rights 明列 ESA Space Science Archives 数据按 CC BY-NC 3.0 IGO 分发。公开档案、约18亿源、G/BP/RP字段和全天覆盖不等于当前商业小程序可再处理/自托管分发；不能把论文自身CC BY或第三方镜像当作数据授权。没有采用Gaia新数据、没有批量下载/生产或迁移既有星表。若获得合适单独许可、明确不同源数据权利，或选非商业场景，才重评该具体输入。
- [ESA Gaia EDR3 全天色图](https://www.esa.int/ESA_Multimedia/Images/2020/12/The_colour_of_the_sky_from_Gaia_s_Early_Data_Release_3)及其[等距柱状版本](https://www.esa.int/ESA_Multimedia/Images/2020/12/The_colour_of_the_sky_from_Gaia_s_Early_Data_Release_32)是由位置/亮度/颜色汇聚的观察者全天图，有银河带，可作为低分辨率银河层候选；页面明确著名和CC BY-SA 3.0 IGO或ESA Standard Licence二选一。但[ESA图像通用条款](https://www.esa.int/ESA_Multimedia/Terms_and_conditions_of_use_of_images_and_videos_available_on_the_esa_website)既令CC图按CC条件用，又称所有商业图片使用须另获书面授权；具体适用关系未定，不可直接作为本产品上线素材。还未核原图像素分辨率、经纬起点/手性/色彩处理、WCS/与现有BSC-ENU对齐、压缩后包/流量及改作后ShareAlike具体履行。当前没有下载图像、接Canvas或发布。
- [ESA 2025 Gaia银河图说明](https://www.cosmos.esa.int/web/gaia/milky-way)经搜索结果显示为基于Gaia数据的外部俯视/侧视艺术印象，而非从地球看全天空间方向；ESA页面当前浏览返回451，不能凭图像漂亮或CC标签贴到本观测相机。此类对外视角图适合资料科普，不是C04天空背景数据。
- C04银河/大气/地景及C02深星、C06光学巡天仍需独立可用的真实输入。早前PS1北天+SkyMapper南天候选还需真实产品/覆盖/权益/配准核实；此次Gaia限制不自动否定它们。暂不联系ESA/供应方，因为用户尚未授权对外联络；可继续本机格式/投影研究或调查别的官方明确许可数据。Durable tradeoff 已写回 `project_context/external-capabilities.md`。

## 2026-09-23 实际 SIAP 与现成彩色 HiPS 试验（覆盖上文“未下载/只有切片”的历史状态）

- SkyMapper 公共 DR4 SIAP 在 Sombrero 方向 `POS=189.99763,-11.62305&SIZE=0.05&BAND=g&FORMAT=image/fits&INTERSECT=COVERS&VERB=3&RESPONSEFORMAT=CSV` 返回 HTTP 200、6,873 字节的 7 条 g 波段逐次观测清单；原始元数据保存在 `evidence/skymapper-dr4-sombrero-siap-metadata.csv`。记录各有 image_name、get_image/preview/get_fits/get_mask、ra_cntr/dec_cntr、曝光、MJD、图幅、CRPIX/CRVAL/CD/PV 等，5s 与 100s 观测跨 2014–2021，质量不同，非深度一致的拼合图。仅有界下载其中 2018 年 100s 的 282,240 字节 FITS 与 57,961 字节 PNG 到 ignored `artifacts/miniapp/cloud-sky-native/skymapper-dr4-sombrero-g-2018-{cutout.fits,preview.png}`；PNG 已目视，中心过曝。FITS 为 `RA---TPV`/`DEC--TPV` 且有 PV 畸变；CRPIX1=574/CRPIX2=1189 在切片外，不可直接套用当前固定中心 TAN 注册，也不能把 PNG 北上与 FITS 像素同向。此前“未下载”只描述当时阶段。
- 更关键的是 CDS 已发布加工好的[SkyMapper DR4 i/r/g 彩色 HiPS](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)，非 NCI 小切片服务：`CDS/P/Skymapper/DR4/color`、ICRS/equatorial、512px PNG、max order10、2025-07 发布、63.27% MOC，CDS 库层 ODbL-1.0，原图 ANU；声称由深/浅图组成并剔除强背景变化。官方记录 `hips_estsize=6336620843` 的单位为 KB，约 6.34TB / 10,623,303 张瓦片（2026-10-04更正旧6.34GB单位错误；仅发布者估算），仅是该 HiPS，不代表终端发布包或应全量抓取。另有[PS1 DR1 i/r/g 彩色 HiPS](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-i-r-g&fmt=html&get=record)：ICRS/equatorial、512px JPEG、max order11、76.39% MOC、2019-11、CDS ODbL-1.0、PS1 Science Consortium/MAST 原图。
- 对两个 CDS `properties`、`Moc.fits`、`Norder0/Dir0/Npix0` 做有界 HTTP 试取均 200；PS1 错格式 `.png`、SkyMapper 错格式 `.jpg` 均 404，实际像素分别 JPEG/PNG 512²。文件仅在 ignored `artifacts/miniapp/cloud-sky-native/optical-hips-{ps1,skymapper}-{properties,moc,tile0}.*`，两张底层瓦片已目视；SkyMapper tile0 大部无覆盖，不能拿单张空白推断总体不可用。未加入小程序生产资产/网络请求。
- 按 FITS BINTABLE `UNIQ` NUNIQ 读取实际 MOC：PS1 order11 22,221 个条目，SkyMapper order10 30,461 个；展开至 HEALPix nested order11（50,331,648 cells），两者 0.7638629675/0.6327091853，与 CDS 独立声明相符；交叠 0.3966745933、**并集 0.9998975595，仍缺 0.0001024405，即约 4.23 平方度**。这是两个出版覆盖多边形的并集，不证明每张图质量、接缝、角分辨率或各放大层可靠，更不能称完整 100% 全天。计算输入保留上述 FITS；摘要见 `evidence/optical-hips-candidate-2026-09-23.json`。
- [STScI PS1 AWS 开放数据登记](https://registry.opendata.aws/mast-panstarrs/)明列免版税的使用、复制和公开展示 PS1 数据权利（non-transferable），与原[MAST使用条款](https://archive.stsci.edu/publishing/data-use)并读；CDS 加工 HiPS 的 ODbL、归因、加工/可读数据库提供和原始观测权益需分别履行，`clonableOnce` 服务状态不单独给无限在线服务/抓取权。SkyMapper DR4 DOI 元数据 CC BY4 也不直接覆盖 CDS 加工层。两者批量镜像/生产分发带宽和规模、授权细则、成本、MOC 边界像素/接缝与原生瓦片投影均待验证。现已找到技术上适合的可运行候选，不把之前 NCI SIAP 的小切片限制错误外推到 CDS HiPS。
- 实际高阶复核：用 [Development Seed `healpix-ts` 1.1.0](https://github.com/developmentseed/healpix-ts) MIT 库仅安装在 ignored 任务试验目录，按 ICRS RA/Dec 算 HEALPix NESTED order8。Sombrero 的 ipix401329 在 PS1/SkyMapper 均 HTTP200（110,318/611,836 bytes）；M31 ipix43345 只有 PS1（141,203 bytes）、SkyMapper404；LMC ipix529551 只有 SkyMapper（702,322 bytes）、PS1 404。四张512²真实图已目视；Sombrero 同场 PS1 色偏/拉伸与 SkyMapper 明显不同，LMC SkyMapper 图有显著黄绿色拼接条带，不能由 MOC 面积宣布色彩/品质已可用。
- 三点平面配准不能直接承担低阶瓦片。用库 `pixcoord2VecNest` 在21×21规则点比较 HEALPix 真实球面方向与现有 `registerSkyArtwork` 所需三角平面方向，阶0/2/4样本约偏 87/17/2 个**瓦片**像素（用平均角尺度估算），阶8 Sombrero/M31约0.12/0.77。图片上的 Sombrero/M31位置与 `ne`→图像x、`nw`→图像top-down y 的试验映射相符，但还需对照规范/高阶星场精确验证。低阶必须细分网格或等效正确HEALPix逆映射，并复用既有报告 `geometry.equatorialToEnu`、相机/纹理生命周期；不把HiPS当一张TAN图贴、也不引入第二天空引擎。这是技术方向而非已接入能力，正式库依赖尚未加入。
- 后续有界mesh误差试验：以每tile规则 8×8 子格、两三角的球面方向线性归一化，对阶1三种基面 worst约0.62个源tile像素；阶2三种基面worst约0.18–0.32；阶3约0.05–0.16。阶0极区单tile即使32×32仍可偏3.74源像素，建议最低显示阶1；这不是目标手机screen误差/帧耗时证明。多三角纹理必须用当前相机投影、日时变换、原GPU纹理预算和地平遮挡；图像内显著黑底/拼接带不靠几何修正。实验记录见证据JSON。

## 2026-09-23 后续权利与阶0结论（覆盖上文最低阶建议）

- [CDS SkyMapper 主站记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)与相应 PS1 记录同时列 ODbL-1.0 和 `public master clonableOnce`。[IVOA HiPS 1.0 规范](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf)把后者解释为允许复制，但**仅从主站取得**（不是只能下载一次）的服务状态，不是无限抓取承诺，也不替代原始观测权利。[ODbL 1.0 正文](https://opendatacommons.org/licenses/odbl/1-0/)允许商业使用和数据库分发，但区分数据库与独立内容权利，并要求公开使用加工数据库时履行通知、归因、相应派生数据库和机器可读数据义务。SkyMapper DOI 元数据的 CC BY 4.0 与 PS1 的 [STScI 开放数据登记](https://registry.opendata.aws/mast-panstarrs/)是原始层证据；尚未完成具体瓦片加工、镜像、分发及署名/派生数据库义务的逐项落实，生产发布继续关闭。这是数据来源适配判断，不声称法律意见或整套影像已获交付权。
- 上文“建议最低阶1”来自**源瓦片像素**的局部线性近似试验，不等于当前目标屏幕误差。新任务脚本 `hips-wide-mesh-probe.mts` 在390.4×844、267.8°、正顶朝向复算阶0十二面：768个可见三角中心回投到对应 HEALPix 身份，错配0；16分格源方向投屏后，所采可见单元中点的最大屏幕线性误差约0.915px。45°/60°/120°/180°/240°独立方向的16分格样本最大约3.116/2.313/3.266/1.958/1.130px。原始结果 `evidence/optical-order0-mesh-probe-2026-09-23.jsonl`。这只支持把**已在真实出版索引列出的**阶0作为有界宽视场回退；不证明全部像素、任何手机GPU帧耗时、接缝、亮度、实际完整覆盖或可发布的光学影像。

## 2026-09-24 PS1 权利文本再核（不改变生产准入）

- [STScI 管理的 AWS PS1 登记](https://registry.opendata.aws/mast-panstarrs/)对所列 DR1/DR2 image files 明确授予非独占、免版税、全球、不可转让的 PS1 数据使用、复制与各种媒体公开展示许可；[MAST 数据使用政策](https://archive.stsci.edu/publishing/data-use)的营利限制明确列举 DSS 和由 DSS 衍生的 Guide Star Catalog，不能错误套给 PS1。由此，PS1 原始图像的商用展示/复制依据比“公开可下载”更强，但登记文字没有单独写明加工瓦片的再分发/第三方托管、CDS 加工 HiPS 所含独立权益、ODbL 派生数据库履行或批量镜像服务边界。用户要求的具体自托管及分发条件仍未逐项核完，不能据此发布当前 CDS PS1 TRIAL 或宣称全天高清。
- [MAST PS1 影像获取文档](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812239/How%2Bto%2Bretrieve%2Band%2Buse%2BPS1%2Bdata)说明 stacked/warp 原图及可脚本下载的 cutout/full FITS；[AWS 登记](https://registry.opendata.aws/mast-panstarrs/)本身列有公开 S3 原始 image files。这是自建加工输入的可行入口，不等于已有可运营的批量方案或云费用上限。`PS1 Dec > -30°` 也不支持单独全天覆盖。此轮未下载/镜像新增巡天数据、未改变生产开关或 Context 采用决定。

## 2026-09-24 SkyMapper 原始图像与 CDS 加工层再核

- 直接读取 [DataCite DR4 DOI 元数据](https://api.datacite.org/dois/10.25914/5M47-S621)：rightsList 为 CC BY 4.0，摘要明确把 deep/large co-added sky tiles 和整半球 false-colour images 列为**该数据发行拟包括的内容**。因此不能把这一 DOI 只按星表数据理解；但摘要使用未来式，不证明每个影像制品已公开、可以批量取得或 CDS 合成图的全部独立加工权益。许可义务参照 [CC BY 4.0 正文](https://creativecommons.org/licenses/by/4.0/legalcode)。
- [SkyMapper 原站 Protected Science 页面](https://skymapper.anu.edu.au/policies/)现说明 DR4 起不再实行受保护科学项目；这是访问/科研保护状态，**不替代** DOI 具体数据许可。原站 [How to Access](https://skymapper.anu.edu.au/how-to-access/)仍限单边小于 10 角分的公开切片，完整 CCD/批量需联系；原始影像自建全天 HiPS 的输入获取和加工成本因此尚未闭合，不能从 CC BY 推导无限量 API 服务权。
- [CDS 对应 HiPS 登记](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)同时列 `hips_license=ODbL-1.0`、`hips_copyright=CNRS/Unistra`、`obs_copyright=ANU`、`public master clonableOnce`。[HiPSGen 参考手册](https://aladin.cds.unistra.fr/hips/HipsgenReferenceManual.html)把 `clonableOnce` 定义为允许复制，但仅从该实例取得，[ODbL 正文](https://opendatacommons.org/licenses/odbl/1-0/)的 2.4 节不单独授予图像内容权。现有公开文本使原始 DR4 的商业使用依据更明确，但要把 CDS 成品整套自托管并持续分发，还须落实 CDS 与 ANU 的归因/许可通知、加工/派生数据库可读交付、实际镜像节流与供给成本；这一步仍是候选，不改变商业生产开关。优先对**少量实际拟交付的成品瓦片**核对原始制品归属与完整通知链，再按产物形式确定发布义务，不因 `clonableOnce` 一词直接宣布全天商业影像获权。

## 2026-09-24 有界成品瓦片权利链核对

复读已存的两套 CDS `properties` 和 Sombrero/M31/LMC 有界样本，不扩大瓦片下载：PS1 成品写 `hips_copyright=CNRS/Universite de Strasbourg`、`hips_license=ODbL-1.0`、`obs_copyright=PS1 Science Consortium`、`prov_progenitor=MAST/STScI`；SkyMapper 成品相应为 `CNRS/Unistra`、`ODbL-1.0`、`Australian National University` 与 DR4 DOI。两份都标 `public master clonableOnce`，但没有额外逐瓦片图像内容许可字段。按 [ODbL 1.0 §2.4](https://opendatacommons.org/licenses/odbl/1-0/)，数据库许可不单独覆盖每张图像内容；按其 §4.2–4.6，若后续公开传送/改作数据库，还需通知、同许可或相容共享、提供数据库或变更文件等义务。不能只在 UI 贴一句 ODbL 就把整套图像版权和交付义务判完。

[STScI PS1 AWS 登记](https://registry.opendata.aws/mast-panstarrs/)目前明确列出 PS1 DR1/DR2 image files 的使用、复制、公开展示许可，但未单列第三方 CDS 彩色加工成品的再分发授权；[MAST 总政策](https://archive.stsci.edu/publishing/data-use)排除 DSS/GSC 商业使用，不能把它当 PS1 的积极授权补句。SkyMapper [DataCite DR4](https://api.datacite.org/dois/10.25914/5M47-S621) 对原始发行列 CC BY 4.0，而 [原站获取规则](https://skymapper.anu.edu.au/how-to-access/)仍要求批量/完整 CCD 另行联系；它们不自动给出 CDS 成品的全部版权和无限镜像供给。结论是这两个**具体 CDS 彩色 HiPS** 的自托管商业交付链依然未闭合，普通 Mini 的 TRIAL 门禁维持关闭；下一次只有发现明确覆盖成品内容/分发的条款或形成无需逐项申请且可承受的原图自加工路线，才继续生产接入。本核查没有供应方联络、生产下载或发布。

## 2026-09-25 Legacy Surveys 自制图层的有界新候选

- [官方 Sky Viewer 图片使用说明](https://www.legacysurvey.org/acknowledgment/)把第三方图层与 Legacy Surveys / DECaLS / MzLS+BASS / DECaPS 等团队自制图层分开，后者明确给图像 **CC BY 4.0**，并要求影像旁向所有用户清晰可见、原文不改的 `Legacy Surveys / D. Lang (Perimeter Institute)`；在线署名链接须可用，不能藏在独立来源页。按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 的复制、改作、商业分享条款，**仅限准确属于这些自制图层的成品影像**，比现有 CDS PS1/SkyMapper 加工瓦片更有直接的自托管候选依据。实际投产仍须记录原图/加工变更及许可链接，不能借此使用同站 SDSS、DES、DSS 等第三方图层。
- [DR10 官方说明](https://www.legacysurvey.org/dr10/description/)给 `ls-dr10` 官方 JPEG/FITS cutout、脚本多切图入口和单张至多 512px 的限制；南部 DR10 与北部 DR9 在 Dec 32.375° 拼接，彩色波段映射不同。光学覆盖约 2 万多平方度而非全天，g/r/i/z 至少一次的交集约 15,342 平方度；[已知问题](https://www.legacysurvey.org/dr10/issues/)明确高源密区如 LMC 完全缺失。60 TB coadd 是源发布规模，不能作为我们本次要存储或能负担的大小。官网没有在上述页面给实际产品持续批量抓取配额、运营吞吐/费用或全空域分层服务保证。
- 已对官网公开 `ls-dr10` 图层做**单方向、非生产**小样：M104 中心取本项目 OpenNGC `M:104`（189.997625°, -11.62305556°）近似值，256px/1.4″ JPEG 11,910 B、SHA-256 `7dbe0a901a045ef53f0810571225a564fb0a952f919a1f94a62df02da79b1a5e`；512px/0.7″ JPEG 42,949 B、SHA-256 `f1f304f1bfa169924cd91802548083c40efadb01aefa8ec16b1d14dcc7d689d9`。均为实际 256/512 正方 JPEG，目视显示草帽星系/周边星点，但中央过曝且缩放差异主要来自像素数量；不可由两张样图声称影像质量整体合格。对应 256px g 波段 FITS 267,840 B、SHA-256 `e6bf19e2728a119fe4ff994563f826e8f42132074c773db5721d0e960b221293`，实际头为 `RA---TAN/DEC--TAN`、CRVAL=(189.99763,-11.62305)、CRPIX=(128.5,128.5)、CD 对角=(-/+1.4″/px)，与现有 `registerSkySurvey` 的 CDS W3 假设 **CRPIX=N/2** 不同（本图是 `(N+1)/2`）；后续必须在同一 TAN 注册 owner 内显式处理原点差异，不能原样调用，否则中心偏半个源像素。尚未以真实星点/目标手机像素复核 JPEG 方向与配准精度。样图及 URL/哈希/响应元数据仅在 ignored `artifacts/miniapp/cloud-sky-native/legacy-surveys-trial/`，未进包/服务。
- [DR10 文件说明](https://www.legacysurvey.org/dr10/files/)中的亮星 mask/Tractor 目录包含 Gaia EDR3 辅助字段；不得把该目录当成本产品合法深星输入，也不能把“观察图层 CC BY”外推到任何单独目录。具体 cutout 的原图、加工链和许可声明仍须逐产品审视。后续若选该候选，先用单个自制 `ls-dr10` 成品建立来源/可见署名、失覆盖透明回退和旧 W3 独立保留的端到端路径，再量化准入区域、官方获取节奏与真实自托管/流量成本；不承诺 Stellarium 式全天高清。本次没有打开普通商业客户端的光学 TRIAL 门禁。
- 对**同一 M104 方向**的 256px g 波段 FITS 与官方 JPEG 做实际像素方向复核：大端浮点 FITS 的 asinh 图和 JPEG 灰度各减半径3模糊后，在排除 JPEG 近黑/饱和像素的有效区做 Pearson 相关；FITS 原样/上下反转/左右反转/双反转分别约 -0.027/0.432/-0.013/0.058。上下反转的整数平移 ±2px 内峰值在 (0,0)，近邻峰值更低，符合 FITS 底向上与 JPEG 顶向下的行反转；没有观察到整像素平移。实测细节与源哈希见 [样本方向证据](evidence/legacy-surveys-tan-sample-2026-09-25.json)。这证明该样本的像素方向，不证明整个来源同质、TAN 注册 shader 实际像素或手机精度；CRPIX 的半像素差异仍必须显式处理。

## 2026-09-25 Legacy DR10/DR11 实图质量与波段缺口

对 M104 的正确总览/中层/细层视场和北天 M51 取官网自制图层的有界 JPEG；DR10 M104 中/细层均见过曝核心、粉红矩形/块边，M51 见青色与拼缝。切换 DR10 `grz` 色映射仍见 M104 色块。按官方 FITS 接口比对同方向、同尺寸的 DR10 与新 DR11 `griz` **2″/px 切图**：DR10 小矩形 `r` 波段连续16×23零像素，DR11 同区域 `i` 波段全零；DR11 官网 JPEG 的色块形状变化而非消失。另取该处0.262″/px原生图与逆方差：DR10 `r` 主图/权重同为零，DR11 `i` 主图/权重均有值。因此 DR11 的零值是当前粗切图/拼接成品问题，**不能称原生未观测**。这些是当前直接采用官网彩色图的真实质量障碍，不是客户端 TAN 原点或请求成败；原生自加工仍有待核空间和成本。URL、尺寸、哈希、局部坐标、图像观察与未测边界见 [C 实图质量证据](evidence/c-legacy-cutout-quality-2026-09-25.md)。

Legacy Surveys 自制层的明确 CC BY 4.0 与随图可见署名仍是积极的权益依据；其商业光学成品尚未达到可用画质/覆盖/自托管成本条件。后续原生512px与逆方差复核表明：粗色块对应的 DR11 原生 `i` 可用、单处相邻重叠基本一致；但真正 M104/M51 中心有聚集的无权重像素，M101 中心可用而外围缺测/块边明显。单张原生四带+权重约8.4 MB、最大512px，0.05°纵向视场至少两张。不能直接把官网彩色 JPEG 或未经质量门禁的自加工图接入普通 Sky；下一项须按目标中心、整片与彩色输出分别准入、可解释地缺片降级，再核其它方向和加工/分发成本。详 [三目标原生实图与负载](evidence/c-legacy-cutout-quality-2026-09-25.md)。PS1/SkyMapper CDS TRIAL 门禁不变。

追加的北区方向使上述准入更明确：M57/M76 小目标的官方 cutout 返回500（同接口已知 M51 为200），可用性不能从角尺寸推；M97 原生中心64²权重全有效，但官方 JPEG 在该尺度连中心星云都不可辨、外围有缺带与色差。HTTP、局部逆方差与实际视觉各只证明一层，且 M97 的3.58′目标大于单张2.2357′原生切图。未把任一新样本出版或重开光学门禁；详同一 [实图质量证据](evidence/c-legacy-cutout-quality-2026-09-25.md)。

## 2026-09-25 SkyMapper DR4 获取规则的新实证

[官方 cutout 页](https://skymapper.anu.edu.au/image-cutout/)明示禁止用服务系统性抓取大片天空；这比先前“单边 <10′、批量需联系”更确定地排除了将公开 SIAP 当生产广域瓦片采集器。DR4 DOI DataCite 的 CC BY 4.0 是数据权利线索，**不授权违反源站服务使用规则**；CDS 加工 HiPS 的独立权利仍未完成。[小样本](evidence/c-skymapper-dr4-source-boundary-2026-09-25.md)按官方示例对 M104 0.05° 查询到22张 g/r/i 独立观测，只下载同夜三带 FITS+bitmask 六文件，总1,270,080 B；原图各自有 TPV WCS，不是自动拼好的彩色成品。当前没有可规模化、自托管且无需另行申请的 SkyMapper 原始影像取得路径，故不扩大 SIAP 样本、不上线普通客户端。若没有新的公开生产入口，C 继续比较其他合法来源/明确可交付的局部范围，而不以“可下载”填补获取条件。

## 2026-09-25 SDSS 定点 M51 候选

[SDSS 官方图像政策](https://www.sdss.org/collaboration/image-use-policy/)直接允许官网 SDSS 影像用于任何目的，按 CC BY 保持署名；[官方 JPEG 构建说明](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/)确认 SkyServer ImgCutout 来源为官方 g/r/i FITS，拼合后以请求坐标为中心。实际 DR17 M51 的 0.4/0.8/1.6″ 每像素 512² 三张 JPEG 已有界下载、解码目视及中心偏移相关核对，影像较本轮 Legacy M51 候选更清晰。确切 URL、哈希、字节和局部配准结果见 [SDSS 目标证据](evidence/c-sdss-target-source-2026-09-25.md)。此结论只支持 **M51 单目标三级光学影像**；现已在本地普通客户端与自有服务中做限此目标的有界接入、正式隔离构建通过，但尚未部署或目标微信画面验收。[DR18 成像说明](https://www.sdss.org/dr18/imaging/)给历史唯一覆盖 14,055 平方度，无新 DR18 成像，且公共 ImgCutout 的批量/生产容量尚未核定，不宣称全天高清或批量抓取权限。接入保留源哈希/版本和随图署名，失败时保留独立 W3；广域须按 [官方获取替代](https://www.sdss.org/dr18/imaging/tools/)另核 CAS/SAS 原始帧、容量与加工费用。PS1/SkyMapper 商业 TRIAL 仍关闭。

获取/费用续核：[SDSS DR17 官方批量页](https://www.sdss4.org/dr17/data_access/bulk/)把成像扩量的字段定位（SkyServer 查询或 `window_flist.fits`）与 SAS 校准帧下载连起来，[官方 FITS 教程](https://www.sdss4.org/dr15/tutorials/retrievefits/)建议大量字段使用批量工具。当前 M51 已固定的三张图只在离线出版时取源，运行时不访问 SkyServer；扩大目标应另估 SAS 原帧获取、g/r/i 加工及目标质量，不把三次 ImgCutout 当高吞吐额度。当前服务拓扑是镜像内图经 Lighthouse 直出，无 COS/CDN；共享流量包、公开超额单价与无法得出实际月费的边界见 [C/P4 成本证据](evidence/c-sdss-acquisition-cost-2026-09-25.md)。
