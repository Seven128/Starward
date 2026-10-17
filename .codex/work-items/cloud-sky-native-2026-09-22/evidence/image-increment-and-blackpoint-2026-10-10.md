# 图像增量、融合反例与配准

2026-10-10，既有PLAN C/D实施，无方案修改。全部路径相对仓库根；输出为本地研究/候选，未采购、部署、发布、提交或普通采用。

## 增量批次

`output/eso-image-supply-2026-10-10-increment-r1/`复用已获取的M104 1870×1815、NGC3621 3530×3124原网格。`sxt-reviewed-regions-input.json`仅补充实际源结构与背景ROI；`processed/result.json`两行成功、一次原生SXT调用，vendor wall 9.3799124s，进程树抽样RSS 1,459,757,056B（下界，不是GPU/全机峰）。DirectML RTX3060、ONNXRuntime1.23.2、ML11，无处理警告；未重复下载。

完整6幅M104和8幅NGC3621三列图已集中检查，`file-decisions.json`经原review-only入口生成`reviewed/review.json`：M104 FILE_REVIEW_PASSED_SCENE_PENDING，连续尘带/两端/宽光晕保留；NGC3621 NEEDS_REPAIR，亮前景恒星空心彩环、红结和已分解旋臂结构进入星层。不能以恒星层存在推定去掉的都是前景恒星；不再原参数重复SXT，也不以整轮廓原图替换制造纹理岛。

M104 `background-exclusion.json`及`background-mask/`定义有实际图像依据的椭圆排除区，仅用于估计，不控制输出alpha。既有Photutils背景owner按234×234网格、9px源膨胀处理；所有8幅前后图已看，未见尘带/光晕轮廓被截断。背景文件细档4,057,098B，SHA256 `891cd1c00e050ce33b359d820fb277a9f159b65f14ceb0773be05338ca252d12`；模型数组67,791,659B，未超当前128MiB限制。

## 两个实际缺陷

- `sxt_batch.py`保存背景复核成功后无条件读取`result['counts']`，而saved display review不提供该字段。真实CLI混合一成功待Scene、一硬失败的回归修复前KeyError、修复后按实际row状态汇总。原已保存的`background-reviewed/review.json`及失败保留，修复后只读复核生成`background-reviewed-cli-r2/review.json`，未再模型/拟合。`test_reviewed_background_display test_sxt_processing test_reviewed_denoised_display`共23项通过。
- task `benchmark-image-scene.mjs`原以kind STAR认目录星，太阳亦属STAR，导致M104首轮`catalogue_had_no_effect`。改为以实际BSC/SAO objectRef集合计数，仍要求off零目录星且像素有变化，另报非目录STAR。首轮2张控制图与修复后字节相同。没有修改产品渲染器或削弱目录效果断言。

## 候选和实际Scene

原候选输出与保留输入重叠被preflight拒绝，`increment-r1/candidates/result.json`保FAILED。改独立兄弟输出`output/eso-image-supply-increment-candidates-2026-10-10-r1/result.json`后成功，publication `0fbdf6d07025b5fd928baad70b3c72bcefbefba76f5deff389e0d33bd611465e`。OVERVIEW/MEDIUM/DETAIL为256/935/1870宽，DETAIL精确复用上述背景PNG。名义ESO AVM是UNVERIFIED，未宣称绝对配准或测光。

`output/prepared-scene-batch-2026-10-09/eso-increment-background-r2/result.json`实际11帧、三个LOD/宽细尺度及照片/目录/银河off控制均运行通过，GL0、资源退休0、源字节精确。广域目录236颗对0，太阳各1；目录变化4,638像素、银河变化78,917像素。目标宽场2目录星、细场0，不证明照片星与目录星对应。完整contact及两幅DETAIL已实际看，390×844、1x未见明显方框，尘带/大光晕仍在；高DPR、原生、设备、完整星协调未验。Scene决定UNKNOWN，非PASSED。

## 黑位有限反例

NGC246固定保存的NXT-before-background细档（1,890,384B，SHA256 `dbdb007d340685e07b48a874b47bbef15c4208c7b10db841bb48004035844fa1`）和已有真实Scene照片off背景。公开方法依据：[GIMP Levels](https://docs.gimp.org/3.0/en/gimp-tool-levels.html)的黑位截断，以及[Siril stretch](https://siril.readthedocs.io/en/stable/processing/stretching.html)对亮度重映射/颜色保护的区分；没有采用新工具或宣称背景分位数就是物理噪声。

task `trial-image-blackpoint.py`按固定encoded14阈值在逆sRGB后逐通道扣常量、负值截零，再编码；同网格完整不透明RGB，原ICC保留，mask仅量测。`output/eso-image-blackpoint-trial-2026-10-10-r1/result.json` 39,657B，SHA256 `5c3af4e78595b678fb9d049ce5938a79d80f6d1a0ef3214452373b753626ae21`。一整图+6个ROI均已看。背景sample-positive从950,639降至1,233；源排除区有211,891像素新变黑，但排除区包含背景，不能把此数称结构损失率。

task `trial-image-contribution.mjs`用当前真实GPU artworkLevels/名义TAN，在已保存宽细Scene背景上作6帧有限对照。`output/eso-image-blackpoint-scene-2026-10-10-r1/result.json`39,565B，SHA256 `6c66a5cd641ef30ae7510ee8a2d00c81dd56fc50ae56951fcf972d8955ee5666`。copy-only与原背景RGBA完全一致；parent replay与原全Scene仍差34/33像素（原离屏目标标记），所以不是全Scene等价证明。四幅有图像贡献结果已看；GL/资源退休通过，未运行全页、源生产或模型。

**决定：NON_ADOPTED / FAILED_COLOR_WEAK_OUTER。** 此阈值使方框在上述实际对照中消失，但逐通道截黑使红/蓝饱和加重、弱外围红丝/蓝过渡变薄变暗。不能用无方框交换结构与颜色。该trial未包装候选、未扩producer、未清除原Scene FAILED；也不能宣称亮度/RGB比例保护法已验证。后续机制须先保这些实际弱结构再考虑接线。

## 唯一库存

第二有界对照的问题：固定原父图、encoded14阈值、完整供给与已有真实背景，仅将逐通道扣黑改为linear RGB统一比例`max(peak-blackpoint,0)/peak`。成熟依据仍是Siril对统一亮度映射/颜色保持与逐通道的区分；此处以最大通道作强度的有限公式是本地诊断推导，不冒Siril原生算法或测光。它保持前次最大通道结果和非零像素支持，只评能否解决已观察偏色；不能因此声称弱结构无损。原执行脚本已保同字节副本，当前脚本给后续输出另存执行快照。纯数值检查覆盖黑位边界、灰阶、峰值/非零支持、量化后色比和非法输入，随后看全部ROI及同一实际GPU背景；失败就退出，不扩producer或扫阈值。

`increment-r1/scene-decisions.json`绑定实际执行时保存的implementation/source/frames：NGC246最新顺序版FAILED，M104 UNKNOWN。`current-inventory-input.json`关联原4份批次、新背景/两种NXT顺序/M104候选及两源SXTstage，不重编码/推理/渲染。

`output/eso-image-supply-current-inventory-2026-10-10-r2`本身是309,299B的JSON文件，14epoch/8源，5出版候选/2对象、15张图片21,057,773B、5metadata 39,261B，总21,097,034B，ordinary/distributable均0。旧失败绑定变化后scene=STALE且recordedStatus=FAILED同时保留；不是重新通过。M104 SXT-only epoch SOURCE_RECIPE_MISSING只是未为中间图声明独立出版，背景候选单独存在。NGC3621与旧异常独立入队。

完整33项、最终权益、配准、原生/设备、全容量、旧reader FAILED、独审MISSING保持；局部运行通过不代完整Goal完成。

## 下一共享供给批次的准入依据

`output/eso-image-supply-2026-10-10-increment-r2/input.json`声明同入口的NGC1316/1317与NGC1365两源，非两套开发流程。[ESO eso1411a](https://www.eso.org/public/images/eso1411a/)为WFI B/V/R/H-alpha完整23.25×21.46′图，5862×5412；[ESO potw1037a](https://www.eso.org/public/images/potw1037a/)为Danish B/V/R完整23.40×17.62′图，2506×1887。使用各自large JPEG原网格，合36,453,966像素在既有40M组限内，不裁外围或缩小以逃质量复核。椭圆/透镜主体与较远棒旋提供不同于NGC3621分辨恒星臂的实际输入，但仍可能误删结、伴星系或产生残环，须检查原图/星层，不预先认合格。

2026-10-10实际读具体产品和[ESO政策](https://www.eso.org/public/copyright/)：无该图额外限制，按CC BY4.0保完整credit、修改及AI使用披露、不背书。获取owner还绑定原网页、政策、嵌入XMP/AVM和ICC，若不一致留FAILED并核已保存字节，不能改字段蒙混或重下载。不是最终产品采用许可审查完成。NGC3521候选的6.83′图可能不足目录长轴外围，NGC1365红外/中央视场和NGC1316超大巡天产品不作为本批完整可见光目标替代；未取这些文件。

本批先自动准入、预览定义源结构ROI、一次共享SXT与集中复核。对结构误删/空环异常仍不重跑原参数；文件合格子集继续现背景/候选链。NGC1316大图若进入背景阶段，现128MiB数组限制必须由原owner正确处理，不能因小图通过忽略资源边界。

## 第二批执行与有限修复

上述两源实际获取/原网格准入成功，一次SXT调用，两行输出通过硬检查。`increment-r2/processed/group-0/result.json`实测vendor wall 20.1509744s，50ms进程树抽样RSS下界3,558,162,432B，GPU峰UNKNOWN，不是端上/生产峰。两源共18幅完整/ROI三列图已实际看；`file-decisions.json`和`reviewed/review.json`均保NEEDS_REPAIR：主要尘带/棒/宽光晕/伴星系整体保留，NGC1317粉色核环和NGC1365多处蓝/红臂结仍入星层，细小场源也未全部辨明。没有用成功进程或主体保留掩盖这些差异。

NGC1317核环是可清楚隔开附近亮前景星的局部异常，故按既有PS原图恢复owner做一个有界修复，并非重复旧整轮廓恢复。声明`increment-r2/local-restoration.json`，preflight原图/恢复范围已看；`restored/result.json`绑定可编辑PSD（378,701,836B），实际重新打开PSD核层/蒙版/尺寸，核心27,363像素原样、外部31,667,631像素SXT原样，羽化差0，共6,131像素有改变。Photoshop单次host/app 13.2581551s、100ms应用RSS抽样下界3,135,262,720B，模型0。

复看完整图、伴星系ROI2和修复边界ROI9/10：粉色核环恢复、附近亮前景星未恢复，未见明显圆形纹理岛；其余区域按严格像素相等复用上次观察。`restoration-file-decisions.json`及`restored-reviewed/review.json`仍NEEDS_REPAIR，因全幅细小扩展/紧凑源的误删归属未闭。成功局部结果被保留，但未启动依赖文件全合格的背景/出版/Scene；既有128MiB背景验证限制也未被偷偷放大。

新增两SXT epoch与一PS epoch经原publisher队列和原inventory关联，`output/eso-image-supply-current-inventory-2026-10-10-r3.json`当前17epoch/10源、5候选出版/2对象，ordinary/distributable仍0；无新模型/编码/渲染。r2库存原文件保留，新入口为`increment-r2/current-inventory-input.json`。

## Linked黑位结果

`output/eso-image-blackpoint-linked-trial-2026-10-10-r1/result.json`39,954B，SHA256 `74cabf0b7e7ad951ae504250d17ef29a161f317a552ec61cd81f5ed89760d48b`；输出1,299,818B，SHA256 `e49f88f2469fb1213d77cd9bfb01bdd9392eb727767a1fede6cc8b8bffcc87be`。完整图+6 ROI均实际看。4数值测试通过；最初测试fixture被NumPy混合整型列表提升为int64，改回明确uint8，未放宽处理入口。所有峰值及非零支持与上版相同，样本positive仍950,639→1,233，排除区新黑仍211,891（不代表已知信号损失率）。

统一线性RGB比例改善了逐通道截黑的色偏，但淡蓝外围和弱红丝仍明显变暗，**NON_ADOPTED**。固定阈值仍无法从强度本身识别真实弱结构；这个新证据不支持继续扫阈值或重复背景/降噪。文件失败已决定退出，未再运行GPU/完整Scene，没有给新producer/候选接线。精确决定在`increment-r1/blackpoint-decisions.json`；旧单通道执行副本和新执行快照各保原身份。继续的入口是独立供给/合格子集资格，以及有新结构依据的显示贡献方法，不恢复该固定阈值假设。

## 独立位置参考的有界核验

`output/eso-image-registration-2026-10-10-r1/`使用一个声明式批次扫描四张完整原照片的现BSC/SAO，而非复用NGC253的空场结论。`local-catalogues-r2/result.json`得到M104、NGC1316/1317、NGC1365内BSC/SAO均0，NGC3621内SAO:202292一颗；第一版的重复SAO前缀是任务输出标签缺陷，已修，原结果保留。未知拍摄历元没有编造传播，未修改图像或配准。这意味着M104无当前本地目录重叠，不证明共享照片/目录星协调机制通过。

为M104补独立显示位置参照，按[IRSA Gator官方API](https://irsa.ipac.caltech.edu/onlinehelp/catalogs/catalogs/api.html)只取覆盖完整名义图角的516角秒2MASS PSC查询；262行原IPAC表已保存。原官方[全空发布说明](https://irsa.ipac.caltech.edu/data/2MASS/docs/releases/allsky/doc/sec6_1.html)明确描述公共领域数据，保[DOI/归因](https://www.ipac.caltech.edu/doi/10.26131/IRSA2)。这里不引入产品深星表、整库、源图上传或外联，不把图像公开许可外推目录；本次为合法有界本地诊断。

初始点测量固定原照片、原名义AVM及这一表，不拟合WCS或处理像素。依据[PSC字段](https://www.ipac.caltech.edu/2mass/releases/allsky/doc/sec2_2a.html)用实际ICRS坐标/观测jdate，保所有行及拒因，近红外星等不是V星等。先在无污染/不混叠/非扩展、J检测可靠的较亮点源中，以现源排除mask避开结构背景，并看原图对应；Photutils [find_peaks](https://photutils.readthedocs.io/en/stable/api/photutils.detection.find_peaks.html)与[centroid_2dg](https://photutils.readthedocs.io/en/stable/api/photutils.centroids.centroid_2dg.html)仅供局部峰/背景扣除后的孤立星点描述。JPEG已拉伸，局部统计不是科学噪声或置信度；饱和/多峰/弱信号/历元不确定保未决。空间分布与实际对应足够才能讨论显示误差，否则留UNKNOWN，不以最近峰自动批准。

## 独立参考接入与实际显示

首轮8点`points/result.json`及全部局部图已看：离名义位置最近的小峰常是错误对应，亮星截顶不能直接质心；没有把这些结果批准。`points-wing`沿同一个task测量器放到J≤16的合格未污染参考，固定73×73搜索/15×15翼部拟合、掩掉通道≥254的截顶核心。20点的全部局部图、两页contact与全幅分布已看，孤立主峰与系统性旋转偏差一致；不是自动最近邻配准。`points-wing/result.json`266,571B，SHA256 `a7b251b654e1d3b17857bc3d5c4fa3af18035525aecc63d6505ae4c67dc00334`；所有262条原查询及拒因保留。

固定检索顺序交替分为10训练/10留出后，复用[Astropy fit_wcs_from_points](https://docs.astropy.org/en/stable/api/astropy.wcs.utils.fit_wcs_from_points.html)作单一TAN显示拟合，没有SIP/高阶项、异常剪除、二次全部点拟合或原像素重采样。安装8.0.1实现内部使用origin=0，与API文档的FITS原点叙述不同；已知非整数TAN控制给最大0.0002357px误差，一像素原点变异超过1.4px而被测试拒绝。控制限0.001px用于区分优化器数值误差与像素原点，不是本图精度门槛。初次缺PYTHONPATH/SciPy及过紧1e-5控制失败均保留，没有篡改输入或重跑图像模型。

`fit-r3/result.json`22,412B，SHA256 `97d92c3e77524eccb19e9dabb44e50f0843d23c3be011921a585bd1840766658`：原名义RMS27.19111087px；训练RMS0.21092128/max0.43674512；留出RMS0.54027177/max1.17124946/median0.360689。拟合后20幅参考十字图已全看；4个任务控制测试通过。原网格1870×1815、原AVM及未知曝光历元保持。独立是相对原照片的外部目录/未参与拟合样本，不是独立代码审查或全球精度保证。

`fit-review.json`绑定精确测量/原图/划分/目录，状态MEASURED_DISPLAY_TAN_SAMPLE_REVIEWED。`prepared_display_registration.py`接入原native publisher，核保存点、参考历元、原源及复核、TAN头与残差读回，无再拟合。实际首次发布被FITS小数截位误判拦住：CD最大3.52e-19、CRVAL1.42e-12°、CRPIX3.38e-11px差；改成明确序列化容差，并重建只含合同字段的canonical WCS对全部参考读回，不能夹带未表示的畸变。6项owner回归覆盖小数读回、原点/残差/统计变异、参考位置/历元错配、留出混用、原文件与目录变更。

合同新增`prepared-native-optical-publication-v2`，保image family和像素producer。v1拒registration，v2必需绑定测量/source/父版本及范围说明，防旧reader静默用名义坐标画新版。`preparedOpticalDisplayGeometry`共供实际TAN plane、BFF的覆盖/fieldDegrees及库存，来源说明带目录权益、原像素单位残差和限制。旧hash/URL与原AVM不改。

`output/eso-image-registered-candidates-2026-10-10-r1/result.json`3,945B，SHA256 `4c53f5e11a433f87c73099741ccdbc4d5f3c4739d7a89656b1f6855c06d33089`。新publication `99b7542cea678006bade69daa63eefb84aa2a04fc176bd71adb0b85bc5dda544`，三LOD编码与旧候选完全相同；0新源全解码、编码、模型、下载及拟合。`output/eso-image-registered-warm-2026-10-10-r1/result.json`81,540B，SHA256 `49a0cbe30f865caae1181e42014b21869303012bd8188d1016821017c07427a5`，按当前owner精确暖读回通过。

同一Scene runner声明`registered-display-v1`，沿真实BFF/BSC/SAO/银河/观察帧，新增最大缩放和1/2绘图像素比，不创建逐图page旅程。复用当前`skyArtworkContributionFrameBudget`按实际drawing buffer给辅助显存额度，不能将旧1x固定2MiB当2x产品限制。`output/prepared-scene-batch-2026-10-09/eso-registered-display-r1/result.json`220,133B，SHA256 `cead356942bd393e9a0238b0471fefb830f8b5128b30d6afd09b8b42dbf0e8a1`，23帧，运行/输入最终读回通过，GL错误0、GPU对象退休残留0；全部14幅有图帧已集中看，三档宽/细及两最大缩放没有观察到明显矩形，尘带/大光晕保留，OVERVIEW较模糊但没有用它冒细节。

实际runtime plane在每LOD/ratio上将20个参考读回原图像素，和Astropy残差最大差1.954e-9px。宽/细视图的留出最大误差乘可见区域采样放大因子约0.175/0.444 CSS px；0.05°最大缩放约2.171 CSS px（2x为4.342 drawing px），不是任意尺度亚像素保证。最大缩放图已看，原图的像素/纹理限制明确；这只是局部样本与当前视场诊断，不推未采样畸变/自行运动或源有效分辨率。

shared合同/plane/service/inventory等22项通过；前一轮含新旧metadata静态/图片出口的12项通过，两组有重叠，不能相加成独立数量。三端typecheck均通过；App fixture先后缺可选值收窄及TS7022测试变量推断失败已保记录，最终用真实registration断言及明确UV类型修复，不改产品判断。没有重新跑完整页面、WEAPP/设备或科学矩阵。

`decisions.json`关联SCENE UNKNOWN、REGISTRATION UNKNOWN的**已测范围**及残余，非清除失败/自动采用；原生/昼暮、共享新来源消费者资格、未知历元和未采样区域仍未闭，M104原照片内BSC/SAO仍0，不能借画面宽场两颗目录星宣称照片星重叠机制通过。独审MISSING。唯一当前库存`output/eso-image-supply-current-inventory-2026-10-10-r4.json`18epoch/10源、6候选版次/2对象；18图像记录仅15独立图片21,057,773B，加6metadata48,174B总21,105,947B。新坐标版不算新对象或新图像覆盖；ordinary/distributable仍0，历史STALE同时保recorded FAILED。

技能批量指南新增可复用的对应/截顶/原点控制/留出/实际尺度边界；Context保采用方法和v2责任，README保接口。本次新增方法属于方案内C/D局部实施，PLAN不改；全33项及物理容量、手机、静态旧reader失败保持。当前诊断执行源的局部快照可用于精确复用；历史writer仍可能含共享task脚本原路径，后续确有共享脚本变更时需按同字节执行源恢复闭包，不能冒全部历史缓存已与可编辑源码解耦。

## 第三组供给与局部恢复

`output/eso-image-supply-2026-10-10-increment-r3/`新增两份完整官方RGB：[NGC1404](https://www.eso.org/public/images/potw1943a/) 1604×1637、VLT/FORS2 B/V/R、credit ESO；[NGC1532/1531](https://www.eso.org/public/images/ngc1532/) 1920×1744、Danish 1.5m B/V/R、credit ESO/IDA/Danish 1.5 m/R.Gendler and J.-E. Ovaldsen。官方页、XMP、原JPEG及[ESO政策](https://www.eso.org/public/outreach/copyright/)保留，CC BY 4.0归因/改动通知责任不变。两源不在现58项OpenNGC子集，不能由加工声明伪造产品对象成员；后续若合格须有真实区域合同或目录producer。M96来源视野与现轴径存在外缘疑问，本轮未下载/加工。

原JPEG合计1,041,981B；NGC1404 SHA256 `4fe45600b7a0e82acfb0d728ba39d6c570dc04b987bbd5294c5362b481128211`，NGC1532 `5d20266a428b3161e6c0cc58c1e9caea3005e3d0345eaee29fc90e312c04d7c9`。原网格共5,974,228像素，**一次SXT**，未裁边/放大。`processed/result.json`14,867B，SHA256 `ba385127b32ca2418cbb46cd3879c429ff5a2ba41617d9669d17f3c298415b4f`，两行成功；进程树wall4.867744s、50ms抽样RSS630,083,584B，仍是抽样下界，GPU峰UNKNOWN。

全部10幅整图/ROI比较及两原图、NGC1532整星层已看。NGC1404椭球/光晕保住，但HD22862残彩色空心晕和衍射结构；NGC1532尘带/伴星系/弱臂保留，但臂内红蓝亮结误删，弱右臂本来延伸至源边。两者NEEDS_REPAIR，`reviewed/review.json`30,908B，SHA256 `f7d05508f27efafae792ecdfd516c20eb539817e734dbd3edf5f308a08c67db4`。不靠背景mask抹残环，不因形状像点就认作前景恒星。

NGC1532按`local-restoration.json`冻结四个小圆和两段窄多边形，羽化3px，仅恢复原像素，未生成/修补/重去星。PS27.10一次执行wall3.393s（host3.51048s），实际PSD重开3层/1alpha、前后文档0。原核39,105像素、SXT外区3,269,808像素差0，羽化公式最大差0，改动8,971像素。输出`restored/result.json`15,185B SHA256 `99c9ddff582bdb3b9dea80244141b657ed6b0c38981407fca46485ec52fbba44`；恢复PNG2,594,326B SHA256 `579554b1fb33922e9393314d1445cf162b57b2536dedd04ef40d2d979e690d77`，可审PSD31,116,828B SHA256 `5e9a2c55e3533fb2cb23b99af2bc94836ec2acea5a12f848b751dbf7686a871c`。

全部10幅恢复复核图已看（含共享owner生成的一幅重复ROI）：粉红亮结/臂链恢复、未见明显纹理岛，邻近亮星多数仍移除；但约(847,854)恢复点的前景星/目标结构归属不确定，不能以形态推定。`restored-reviewed/review.json`30,232B SHA256 `6cf06e77f8f32586d0cef0d99e31b76dbf34788fbf2770928a19fe86b070589c`继续NEEDS_REPAIR，源边外无覆盖。两份stage只保三条复核epoch，无新候选/编码/背景/Scene；不为此猜测再跑PS。

## 昼暮实际融合补充

同一task runner新增声明式`illumination-display-v1`，用实际报告五种太阳高度、每时刻观察矩阵和ICRS相机，记录太阳/目标高度、日距、精确日期与时刻；仅补DETAIL宽/细DPR2的照片off/on。旧23帧中的目录/银河控制按相同publication、背景及未改产品/目录实现绑定复用，没有再画三LOD/maxzoom。Scene复用现在比较完整sceneChecks，旧回执可从精确input恢复声明，不只比较profile名。不是新增产品策略或逐对象页面路径。

`output/prepared-scene-batch-2026-10-09/eso-registered-illumination-r1/result.json`197,130B SHA256 `bbe045370ded351527c9acfdaf7ac761da9982e753cbc6db563dab341f292fa7`，20帧。10月9日接近太阳，昼视图几乎白，暮/夜目标在地平下；本组只算近太阳/地平下边界证据，不代普通地平上暮光。两张contact的20视图全看，旧执行快照保留。

补充组先按实际service预检时间，声明目标高度至少15°、日距至少45°（仅本次取样条件）。`output/prepared-scene-batch-2026-10-09/eso-registered-illumination-above-r1/result.json`200,731B SHA256 `7771a88d2787421cef3893ecac75f1379460ffd00c158113f88f6df5bde24ebd`，20帧。7月9日09:30/11:30/12:00/12:30/13:00 UTC分别昼/民用/航海/天文暮光/夜，太阳高度20.838/-4.974/-11.076/-16.964/-22.578°，目标55.247至32.825°，日距86.930至86.792°。两张contact全20视图及昼/民用/天文暮光三张原尺寸2x细图已看，所检无明显矩形边界，尘带/光晕保留；昼光对比弱不冒测光结论。

两组runtime PASSED、输入最终readback PASS，GL错误0、退出GPU资源残留0、无队列/浏览器异常。补充组每种光照宽/细照片均实际改变像素，范围154,572至1,056,860；20对应的runtime位置与Astropy残差最大差8.757e-9原像素。实际原照片内BSC/SAO仍0，不升级目录重叠协调。node语法检查通过；本轮未改产品实现，不重跑三端typecheck或完整页，未验原生/手机仍未验。

`decisions-illumination-r2.json`首次关联后，r5库存将M104 Scene标STALE：唯一变化是共享task runner新增光照profile。原夜run已保存同字节`executed-runner.mjs`，r3决定改绑定该实际执行快照，另保两次光照执行快照；其余129项产品/数据/源码绑定未改。不是把旧hash换成当前文件或重写旧回执；r5与旧决定保留，错误不清除。该按适用执行范围复用规则回写技能，其他历史writer的快照缺口仍保留。

当前`output/eso-image-registration-2026-10-10-r1/current-inventory-illumination-r3.json`关联最新决定及两stage，唯一当前库存`output/eso-image-supply-current-inventory-2026-10-10-r6.json`：21epoch/12源，6候选版次/2对象，15独立图21,057,773B、含metadata21,105,947B，exceptions空，ordinary/distributable0。已测M104 Scene/registration仍UNKNOWN；权益、共享新来源消费者、原生/设备、全尺度/全覆盖与独审不由40新帧自动关闭。其余历史STALE仍带recorded FAILED。
