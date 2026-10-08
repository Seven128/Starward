# Q1：NGC 6752 密星成品小样与退出决定

新 ESO 成品完成一条有界开发路径，**当前有限全幅显示配置不采用**。实际软件 Scene 概览有清楚的斜置照片外框，密集星点在边界骤停；细档中央可辨认星团，不完成完整外围或连续背景。普通 Prepared registry 和普通静态枚举仍为 0。本轮产品源码零变化，原目录、缓存压力、源像素和既有失败不变。

唯一执行顺序见 [PLAN](../PLAN.md)。Q1 新输入决定已交付；随后Q2同原实际Scene对照已退出仅颜色路径；当前唯一下一只按PLAN顶部，不重复相同照片加工或盲目更换同类输入。全部 33 项、设备/独审/实际发布引用/物理资源/200DAU 仍开放。

## 原源与商业资格

从 [ESO 原图页面](https://www.eso.org/public/images/eso1323a/)直接取得其 publication JPEG。该页面给出 WFI 历史光学观测、ESO credit、约 32.60×31.82′ 名义视野和原 8221×8023 参考网格。具体公开照片适用 [ESO CC BY 4.0 条款](https://www.eso.org/public/outreach/copyright/)；使用须清楚关联完整信用及在线链接，披露加工，不暗示背书。这个决定不授予页面中其他 DSS/艺术图或全部 ESO 产品的权利，没有外联或采购。

| 记录 | 实际读回 |
| --- | --- |
| 一次正式 JPEG GET | 200、6,815,112B、3.141s、无重定向/重试 |
| 原编码 SHA256 | `8efc5df18d0c6c2124fa41751e5a85761f0924ebc70446303ac0adaabc1ce238` |
| 完整解码 | JPEG RGB、4000×3904、EXIF orientation 1；46,848,000 原 RGB 字节 |
| 原内嵌 XMP | 5,717B；ESO/原页/CC BY 4.0 精确匹配 |
| 原 ICC | 3,144B，sRGB；没有跨滤镜色彩可互换的推论 |
| 波段显示含义 | 发布者 V→yellow、B→cyan；历史显示合成，不是校准 RGB、天然真彩或当前观察 |

原输入/请求收据在 `output/prepared-ngc6752-source-1006-q1-r1/`，名义几何/原 XMP/recipe 在 `output/prepared-ngc6752-inspection-1006-q1-r1/`。仅一次全幅 LANCZOS 分档，保弱星、完整矩形、核心和亮星光晕；无抠黑、羽化、裁框、PSF、修图、生成细节或坐标拟合。

## 名义几何和独立区域

复用 `prepared_rgb_observation`、PyAVM 0.9.9、Astropy/Pillow 与既有全幅 native writer。原 ICRS/J2000/TAN 参考值 `[287.716945,-59.984486]`、CRPIX/CD/旋转和原网格保留；publication JPEG 的缩放继续遵循现有 PyAVM common-x 约定。49 个完整像素外沿/内部方向与成熟 WCS、实际 native plane/TAN inverse 一致，精确误差见 [读回 result](../../../../output/prepared-ngc6752-readback-1006-q1-r1/result.json)。AVM `Quality=Full` 只是来源标签，绝对配准和科学有效性仍 UNKNOWN/UNVERIFIED。

复用已缓存固定 OpenNGC CSV 中真实 `NGC6752` 行，只核目录中心落点；未重复下载 CSV，未改普通 51/扩展 52 行目录。试验是 `REGION:eso-ngc6752-field`，没有把照片参考点冒成天体中心或新增可搜索天体。实际页面先检索/定位真实 `HR:7127`，再以公开一指拖动对准照片区域，最终名义中心屏幕误差约 1e-12px。区域不取得 HR 或 NGC 的天体资料/拾取身份。

## 原页面、来源与出口消费者

`output/playwright/prepared-native-ngc6752-page-1006-q1-r1/`复用完整 Taro/React/Query/Map→Sky 执行器，515 个 frontend、173 个 backend 输入前后精确相同。104 个实际 loopback HTTP 请求、64 次 Scene；没有修改共享 BFF、普通调用方或模拟相机 setter。新 task profile/checkpoint/执行器复制均单独封存，旧执行脚本/收据未覆盖。

| 全幅档级 | 完整矩形 | JPEG body | 初次 Prepared decoded RGBA 逻辑合计 |
| --- | --- | --- | --- |
| OVERVIEW | 512×500 | 137,181B | 1,024,000B |
| MEDIUM | 1024×999 | 541,483B | 5,115,904B |
| DETAIL | 2048×1999 | 1,985,500B | 21,491,712B |

新 canonical hash `699abb74bbd6435e79a8652510beadcc73fa6cbeb9d0ff4fe0af15caf39d0fdd`。三档各取得一次，暖往返/来源 Back 无新增这三图 body；7 个暖完成帧都保同一真实来源/hash，null 0，DETAIL 暖回原视角 framebuffer 差 0。来源 caption/route 完整保 ESO、许可/原页、修改、有限覆盖、名义 TAN 和 UNKNOWN；退出活动 decode/纹理/buffer 模型皆 0。

既有 `PreparedOpticalImageryService.publishedAssets`、真实文件准入/headers 与标准 sealed writer读回条件三文件，共 2,664,164B。输出在 `output/prepared-ngc6752-readback-1006-q1-r1/conditional-three-file-export/`；普通枚举仍 0。这不证明实际 Caddy/TLS、生产挂载、回滚/备份、新旧客户端引用全集或部署。

## 资源与图质决定

实际软件轨迹中，全场 GPU texture 上传/复制模型峰 25,374,872B，发生在新 DETAIL 的临时 copy；同时间点 decode RGBA 等效 21,491,712B。encoded ready 模型峰 4,958,387B，FS 逻辑峰 5,010,293B，分别保原时刻。它们不是物理总内存、手机帧时、磁盘分配或容量证明，不把各自 MAX 相加。本小样 2048 档不是需求上限；未扩大通用缓存或预算。

已查看完整原图，以及实际 [概览](../../../../output/playwright/prepared-native-ngc6752-page-1006-q1-r1/software-native-overview.png)/[细档](../../../../output/playwright/prepared-native-ngc6752-page-1006-q1-r1/software-native-detail.png)。密集核心/外围有真实内容，原图没有粗 Legacy 的横向拖带；概览仍有明显整片矩形和星点密度断边。细档 viewport 裁出外沿不能关闭此失败。**退出当前有限全幅显示配置；完整外围/背景 FAILED，普通采用增量 0。** 成品权益/名义线性几何可复用，不因此重开旧 ESO6k 直接 UV、NGC253/M87 旧配置或逐图 PSF。

初始 Python 脚本已完成实际 writer 及 inputs-after，末尾报告误把 writer receipt 当作含 levels 的 manifest，发生 `KeyError: levels`；[原失败日志](../tmp/ngc6752-inspect-publish-2026-10-06-r1.log)保留。随后只读取已产完整 manifest/三 JPEG 和原前后 pins，没有重下、重新解码/编码或覆盖原脚本。本次 [读回](../tmp/ngc6752-prepared-readback-2026-10-06-r1.log)通过，不倒填初始脚本为一次完整成功。

受控 native FS/image callbacks、软件 WebGL、未合成 styles 仍只供开发判断，WEAPP/WXML/DevTools、Android/iOS、新版月面、完整旅程、目标物理峰及修后独审未验。此前 release 112 检查沿原封存日志，本轮没有产品改动故不重复矩阵；原 source-null/严格失败、完整 33 项不升级。有效 watch/服务/官方会话保留，无提交推送、分支迁移、部署、发布或外联。

2026-10-06归因更正见[Q2原Scene决定](q2-ngc6752-composition-decision-2026-10-06.md)：几何alpha完整不等于最终显示不透明，原shader已按编码RGB最大通道贡献组合。原图质FAILED和封存raw收据不改；旧OPAQUE标签仅为历史错误解释，不作为新显示机制事实。
