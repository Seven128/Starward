# Q1 PS1 成品连贯区域：本地小样与现 HiPS 出版消费者

具体 `ivo://CDS/P/PanSTARRS/DR1/color-i-r-g` 发布彩色 HiPS 在 NGC891 周围的一份半度小样，已支持继续现原生消费者试验。实际源图跨 11 张原观测瓦片，查看无上一轮孤立 NOIRLab 照片的矩形边界或星密度突变；这只是有限源预览，尚未采用，普通 Prepared registry 空、普通光学 HiPS 关闭。旧 PS1 单父片供给失败、NGC884 缺测/亮核洞、NOIRLab/ESO 照片边界失败均保原。

## 具体源、权利和获取边界

通过 Browser 直接读 [STScI/AWS PS1 条款](https://registry.opendata.aws/mast-panstarrs/)、[MAST data-use](https://archive.stsci.edu/publishing/data-use)、[具体 CDS 记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-i-r-g&fmt=html&get=record)、[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)及 [HipsGen 服务标记](https://aladin.cds.unistra.fr/hips/HipsgenReferenceManual.html)。未外联、接受合同、登录或从镜像取图。原内容的复制/公开显示授予不因 non-transferable 推成绝对禁商用；ODbL 的数据库使用与独立内容权分开，未来公开消费者须保通知、归因及适用机器可读派生子集/变更供给，不要求应用源码或整母库镜像。

实际主站 `properties` 4,181B/hash `fa840c1f6e09c4235825497941d580f94f11949300ed841a00da0112fced5380` 与旧缓存逐字节相同：原版权 PS1 Science Consortium，加工库 CNRS/Universite de Strasbourg、ODbL-1.0、DOI `10.26093/cds/aladin/598a-0e`，equatorial、512 JPEG、最高 order11、`public master clonableOnce`。主站复制与可公开浏览支持此次有界内部试验；`clonableOnce` 不是一生只下载一次，也不授无限供给/容量。当前记录另列 MAST/S3 同产品 `public mirror unclonable`，未从该镜像复制；登记本身不当完整再分发批准。当前自托管商业内容/完整公开消费链继续 UNVERIFIED，未以 ODbL 或镜像泛化授权。

[本轮来源/条款读回](../../../../output/ps1-ngc891-contiguous-hips-1006-q1-r1/source-and-rights-readback.json)区分已读事实与该内部试验判断。原 properties/MOC/代表照片、旧失败、源代码和六项业务字节均保原；不重取月面/旧源，不恢复 DSS/Gaia/ESA 排除输入。

## 一份连贯观测小样

实际 OpenNGC `NGC0891` 的 ICRS `[35.63920833333333,42.34913888888889]` 为中心，0.5°×0.5°、512² 是一次预览配置，不是需求上限或完整外围判定。Astropy 只构造并明确记录本地 TAN 采样网格，现 `hips_tan_lookup.mjs` 与已用 `healpix-ts@1.1.0` 查原 HEALPix 源像素；JPEG column=NW、top row=NE，helper 的 FITS row 仅翻回一次。原图无再配准/修色/生成 alpha/抠黑/feather/删星/PSF 或人工补观测，nearest 采原 encoded RGB。

主站实际 12 次完整 200（properties 加 11 新区域瓦片）、零重试，完成 body 1,364,424B，原 JPEG 1,360,243B；每源完整 Pillow decode、512²/RGB/JPEG 与 hash 校验。缓存 MOC 包住这 11 个单元只指几何，不证明逐像素观测有效性、深度或接缝。colour JPEG 无科学 mask，science UNKNOWN；2 个 encoded black 像素不作缺测。没有科学 FITS 或另造测量。

已实际查看 [原观测采样预览](../../../../output/ps1-ngc891-contiguous-hips-1006-q1-r1/ngc891-contiguous-source-preview.png)和[瓦片身份诊断](../../../../output/ps1-ngc891-contiguous-hips-1006-q1-r1/tile-boundaries-diagnostic.png)。NGC891 延展穿过多个源单元，样本内无明显源单元外框/星密度断层；品红只画身份边界，永不进入产品源。这不能外推源全库/别处饱和、科学支持、细档/目标渲染或照片目录星重复。九个 nominal source centre 与现 native mesh 轴对应，最大离散偏移 0.88812″；同库一致是名义像素检查，不是独立绝对天文配准。

## 现有消费者与已测空缺

11 张缓存 JPEG 原字节复制为 [LOCAL/MEMORY_TEST TRIAL](../../../../output/ps1-ngc891-hips-publication-1006-q1-r1/manifest.json)，publication/hash `a32d5c214ac7c6a9ef8c07fd56ce703a4d7d36f303a2c24f7f3b1e1586c6d9f4`。本地 PNG 预览没有出版。原 BFF `OpticalHipsPublicationService`/controller、小程序 manifest/index 严格读取、真实 TCP loopback 15 请求已闭合：11 JPEG 共 1,360,243B 与原源逐字节相同，未列 tile 和未知版本 404；无默认配置仍 unavailable、production injection 拒绝。临时 loopback 服务在结果前关闭，原 BFF/watch/IDE 未重载。

原 `selectPublishedOpticalCandidates`/`resolvePublishedOpticalTiles` 仅从索引列出的真实 tile 选择，390×844 的显式 ICRS nominal 控制视场结果：0.15° 七个、0.3° 十个参考单元均供应；0.45° 十二参考单元缺 `38579`，0.8° 选择需要 order6 而清单只有 order8，结果无源。此处参考覆盖是保守球冠单元判断，不冒当前 page 可见像素完整/逐像素科学有效；mesh triangle 是几何模型，尚未实际绘制。它明确下一消费者需要真实可见需求和适用同源粗层，不靠改 maxOrder、扩大缓存或限 FOV 冒连续体验。

完整 [source readback](../../../../output/ps1-ngc891-contiguous-hips-1006-q1-r1/result.json)、[HTTP/选片读回](../../../../output/ps1-ngc891-hips-publication-1006-q1-r1/result.json)及原日志封存；前者 PENDING visual 字段留原，新人工判读由本文及[决定 JSON](ps1-contiguous-hips-source-decision-2026-10-06.json)承担，未覆写旧描述。

## 当前决定及唯一下一

候选进入一份实际 current page/Hook/Scene 条件消费者试验，先复用上述原 tile/清单、真实 frame、HTTP/cache/native lifetime/mesh。按实测可见需求补必要同源较粗单元，沿现 publication owner、来源页/Back补最小消费者；不得凭 nominal 球冠缺一格马上扩采全库，或先造通用巡天框架。现在 HiPS 仍 fixture-only，页面旧来源展开是 publication 资料，尚无随完成帧、实际 tile 资格的独立来源/Back；源码线索不能当已绘证明，下一由 actual page 验证并补受影响 owner。

此次 product edits/新 WEAPP/小程序 SDK/Scene/正式静态导出均 0，没有源端运行代理或生产部署。计量只有完成 HTTP body 与本地文件，不冒费用、客户端物理峰、Linux 全机盘或 200DAU；后续适用静态出口/发布/引用/恢复仍需实证。原 33 项、P1根因/IDE侧 UNKNOWN、历史第三 null/strict FAILED、Android/iOS/新版月面、修后独审 MISSING/真实引用/物理容量保留。Goal active 无预算，未完成；无提交推送、采购、云部署、发布或外联。
