# Q2：成熟产品随包光学银河纹理小样

新增一个可决定的现成输入，没有重新选择星空引擎、取得排除源、联系作者或采购。固定Stellarium提交`608db95859f2393d5cc5067d90850ab2d7560c0c`的`textures/milkyway.png`为1,003,398B、2048×1024、8-bit opaque RGB，SHA256 `95ca887ae2fd6811a202f83bccb1376819957d074eed92e4df17f9cbea83df97`，Git blob`1febeacf5ae3e7a3dc5b53e5fa14a456ca865f54`。只获取一次这个PNG与三个小文本；raw源读取曾transport EOF，改用同固定提交公开API/base64并核Git blob，不重下载原ESO/月面/旧数据。见[采集脚本](../scripts/acquire-stellarium-background-metadata-2026-10-05.ps1)和`output/stellarium-background-asset-1005-q2-r1/acquisition.json`。

## 权益与适用范围

[该提交CREDITS 4.4](https://github.com/Stellarium/stellarium/blob/608db95859f2393d5cc5067d90850ab2d7560c0c/CREDITS.md#full-reference--credits)将银河全景单独归Axel Mellinger，并记录署名条件下的修改/再分发许可；它与程序GPL、其它图片和数据各守独立边界。该例外是本随包bitmap的条件依据，不能变为作者所有全景产品的免费通用授权。

[作者新版Panorama2.0页面](https://milkywaysky.com/licenses.html)说明商业/教育/更高分辨率产品通常需付许可费；没有下载其FITS/高分辨率产品、询价或外联，也不能用这页反推旧随包例外已撤销。[旧胶片全景说明](https://milkywaysky.com/mwpan_old.html)有原拍摄历史，但当前PNG精确源版本、完整星点削减/颜色/人工位置处理链仍UNKNOWN。固定路径最近三次commit含NGC104位置修正/恢复、无损压缩；不把当前bitmap冒未修改的科学原图。最终采用需保具体作者/来源、许可依据、制作方处理及本项目改动；普通registry不登记该候选。

## 几何与真实观察

固定[实际producer模块](https://github.com/Stellarium/stellarium/blob/608db95859f2393d5cc5067d90850ab2d7560c0c/src/core/modules/MilkyWay.cpp)采样J2000赤道方向。转换到本项目unflipped、源top-v0约定后是`u=wrap(.25-RA/360)`、`v=.5-Dec/180`，不是当前2MASS的Galactic UV。[检查脚本](../scripts/inspect-stellarium-background-geometry-2026-10-05.mts)直接复用现`galacticEquirectUv`的数学责任，用north=[0,0,1]、center=[0,-1,0]名义轴；没有复制/翻译GPL引擎实现或套用新纹理到旧Galactic字段。

完整PNG实际查看；M31、M42与大小麦哲伦云在名义预测区域可辨，银河带结构可见，大片离带区域较暗，整体是明显制作过的蓝色显示纹理。名义源像素中心：M31(450.72,276.73)、M42(34.65,542.17)、LMC(51.30,908.33)、SMC(436.64,925.65)。这些是数学/肉眼小样，不是独立plate solving或完整配准通过。PNG无alpha/质量mask；黑像素不建立有效科学coverage、缺测或真实零亮度。

NGC253中心约(443.86,655.34)、M82约(1712.03,115.10)，位于暗离带区域；这个低分辨率银河显示资产不能提供两照片外沿所需的完整外围/一般区域细节，也不补现矩形/颜色/真实弱结构失败。初始决定进入条件消费者；后续实际page/GPU/来源/最大视域及生命周期见[消费者决定](q2-optical-milky-way-consumer-2026-10-05.md)，重复星点/完整图质/目标runtime仍未验。**决定：保留条件银河显示角色；未普通采用，不能当所有目标的通用高清底图。**

[初始名义几何回执](../../../../output/stellarium-background-asset-1005-q2-r1/geometry-decision.json)保actualPhotoAstrometry UNVERIFIED、producer processing/off-plane coverage UNKNOWN；该初始epoch的page/GPU为NOT_RUN，不能当后续当前状态。1MB encoded/8MiB逻辑RGBA不等于整场native/driver物理峰，不据此扩缓存。既有2MASS、W3和native/M82默认路径保持；新bitmap未写workers默认assets，原字节未重新加工。后续任务内硬链接准备/标准sealed与实际消费已完成，但未正式发布/普通采用；执行下一只看唯一PLAN，不生成细节、抠黑/feather或重启巡天框架。

以上 NOT_RUN、未打包及最小消费者下一步描述属于初始名义几何 epoch；原 geometry-decision.json 保原。后续已硬链接准备这个具体TRIAL输入并完成实际软件page/同帧来源/退出、M8和真实最大视域、错轴反例以及新增一PNG标准静态/HTTPS消费，见[当前消费者决定](q2-optical-milky-way-consumer-2026-10-05.md)。仍未写默认assets/普通采用；完整科学/绝对配准/producer processing、图质/重复星点与目标runtime未验，角色不补一般外围。

## 2026-10-07 纠偏后的新独立供给：NOIRLab 全天全景（仅小调研）

新具体输入[noirlab2430b](https://noirlab.edu/public/images/noirlab2430b/)为官方40000×20000、360°×180°全天光学全景，署名NOIRLab/NSF/AURA/E. Slawik/M. Zamani。[官方许可](https://noirlab.edu/public/copyright/)及具体JPEG嵌入XMP均为CC BY 4.0；保明确可见署名、许可链接/改动说明和不暗示背书。不是Mellinger付费产品或被排除DSS。浏览器直接读到页面，官方HTML亦已保存；web读取遇JS拦截的旧结果不冒网页不可达。

取官方4K无标注JPEG3,682,194B及同尺寸带标注JPEG4,017,388B，原字节与嵌入XMP保留。实际ICC为sRGB IEC61966-2.1，XMP历史Adobe RGB文字不能覆盖实际ICC。GPano明确等距全景及原40000×20000无裁切，但AVM仅尺寸，未给完整天文frame/reference/rotation。原图与联系图已查看，未调色、填缺或删除恒星。

复用现有Python/Astropy环境及BSC v3，批量取全部vMag≤2的50行，ICRS→Galactic，假设x=wrap(.5-l/360)×W-.5、y=(.5-b/180)×H-.5；固定41²邻域平均RGB最高像素作初筛，无拟合/修图。47行峰距名义位置≤2px；该2px仅统计分箱，不是验收阈值或确认身份。三项Aldebaran/Alsephina/Blaze Star是待复核的匹配例外，联系图显示颜色/邻星/原位置无亮目标等问题，不能直接宣布配准失败或通过；变量星与双星保目录真实含义。保存JSON和原样联系图，不扩成逐星开发。

官方Large JPEG 207,111,569B已到齐，与HTTP Content-Length一致，SHA256 b7343a1e03f02696fcc6d8c967b556986e879ed52194ad9dd3f16bd52aef3b75；用户要求本轮准备后停下，故未完整解码、切区或出版。权利/源身份、所有文件pins与初筛方法见`output/noirlab-allsky-source/research-receipt.json`。下一次依PLAN有界验证完整解码/实际ICC/几何例外，再批量检查接缝、极区、不同星密度和目标外围，合格才复用原出版/Scene比较；不先把整张40K常驻到客户端。

结论：RESEARCH_ONLY_NOT_ADOPTED，scientific/absolute registration仍UNKNOWN/UNVERIFIED，实际Scene NOT_RUN，普通Prepared空/HiPS关及全部失败不变。新输入足以安排可行动的下一步，不等手机；当前Goal已按用户明确要求paused、无预算、未完成。没有新产品代码、资产默认注册、提交推送或发布。

## 2026-10-07 继续后的原图与当前 Scene 批量验证

本轮“继续”后get_goal实读active、无预算、未完成，上一节paused和NOT_RUN均保留其历史时态。复用完整Large源和现有Python/Astropy、TAN/双线性/字节绑定owner；唯一`inspect-noirlab-panorama.py`完整解码一次，RGB40000×20000、实际ICC sRGB均通过，源前后SHA不变。完整解码3.89s，全部批量检查32.35s，本机该Python进程峰工作集3,583,324,160B；不是客户端/生产物理峰。50亮星原分辨率小窗与三例外实图、原经度接缝/极区条带、52对象×4°/0.4°共104名义TAN预览均已保存并实际查看联系图。Aldebaran/Alsephina名义中心有对应颜色/近邻，Blaze Star仅有较暗点；不以局部最高像素确认身份、修改目录或声称绝对配准。几何插值缺邻居1像素保缺失，不填极区。结果在`output/noirlab-allsky-source/inspection/result.json`；科学UNKNOWN、绝对配准UNVERIFIED不变。

104档原图检查证明4°范围有连续照片背景/目标外围，0.4°只有约44原像素跨幅，明显柔化；不计104张合格高清。复用当前完整Scene/GPU、真实BSC v3发布和既有真实观察时刻/矩阵，`inspect-noirlab-scene.mts`一次28帧对照：目录星启用的银河中心/反中心接缝/双极/M31/M42/M87，当前0.24加亮显示与明确的照片source-over反事实，以及三幅同源4°区域。软件GL零错误、所有该轮纹理退休；不是WXML/DevTools/手机/独立验收。照片反事实仅在任务端替换唯一shader alpha及混合调用，不伪造Mellinger/2MASS合同或改默认产品。另1帧关闭目录仅做来源归因，不能当产品采用。

实际画面：广角丰富连续，但2048全景在25°/10°块状明显；覆盖512²同源4°区域仍有非常清楚的清晰度矩形边界。北银河极区有放射状采样痕迹，尚未区分低分辨率/投影采样与原图问题。这些具体失败保留，停止孤立目标贴片/同类调色；新输入仍值得核成熟多级瓦片路径，不全源否决也不普通采用。Scene结果及全部对照在`output/noirlab-allsky-source/scene-inspection/result.json`。

该阶段下一依赖随后已执行，见下节；不再重复原代表批次。

## 2026-10-08 成熟 HiPS 加工与完整 Scene 的代表性结果

CDS Hipsgen 原工具与本机 Java21已复用，唯一 jar SHA256 `26c6b303c005ccdbc3c0103cbbd590f420ac5609ff69807a4c42a461fd8d3466`，实际版本 Aladin12.677。4K源的12个 order0脸面小样先接当前原 HiPS mesh/shader/混合与 BSC v3，10帧仅确认可行动方向，未采用。随后同一 `prepare-noirlab-hips.mts` 从40K缓存源生成六代表视域所在30个 order2区、480个 order4最高瓦片及祖先，one-thread / 6GiB heap / 8192输入分块 / mean hierarchy，214.236s；源和输入前后pins一致。生成MOC覆盖0.1562仅是该批供给范围。运行中一次工作集采样3,797,098,496B不是峰值、客户端或生产容量。自建名义 Galactic CAR HHH仍不是作者声明的绝对天文配准。

原 `inspect-noirlab-scene.mts` 完成15个当前完整 Scene 视域：M31/M42/M87的10°、4°、0.4°，双极/经度接缝的10°、4°；保真实 BSC v3目录、同一个既有观察矩阵/时刻，GL错误0，48纹理创建/48退休、逐帧剩余0。M31等0.4°可能没有可绘亮星；初始任务把零计数误判为目录不可用，失败记录及已完成2帧保留，改为校验真实 resolved stellar frame AVAILABLE并要求整批确有目录星已绘；只补剩余帧，没有重加工源图或放宽图质。任务恢复时的输入顺序/JSON可选undefined读回错误亦保留，不冒图源缺陷。全批预解码把手不冒native缓存或物理峰。

实际查看六组宽窄画面及三组原瓦片：同源多级图消除了孤立TAN贴片的清晰度矩形边界，但4°仍柔化，0.4°不能供一般高清；经度接缝有细线，南银河极附近有三角缺口。alpha缺失已在原加工PNG确认，例如 order4/1040有9,805透明像素，1528有330个，1529有331个，故不是当前Scene漏画。北极原条带及生成视域仍有采样/星点痕迹，未确认原图缺陷或独立配准。

只对1040/1528启动关闭分块的不同机制探针，INDEX在瓦片加工前因 `[40000x20000x1 x32]>2^31` 输入cell限制拒绝；Java exit0不冒成功。失败/日志/源/旧480图均保留。**当前Hipsgen全景CAR加工配置FAILED，停止扩批与同参数重试；不外推整张原照片或整个工具不可用。** 汇总、实际帧与alpha原片pins见 `output/noirlab-allsky-source/projection-decision.json`，SHA256 `7107b427f2f83c1576690db11960c12700013408d002eaddaa4648af3735f25a`。

后续若处理该源，只允许针对已定位的周期经度/极区几何边界，复用现有成熟HEALPix/Astropy与原采样owner做有限原像素对照，证明不同机制后再扩批。不以填透明、抹星、调色或孤立矩形修图遮缺口，不把0.4°柔图冒高清。普通Prepared空、HiPS关、scientific UNKNOWN、absolute registration UNVERIFIED及33账保持。当前独立P1最小原生节点调查按PLAN推进，手机继续留最后。

## 2026-10-08 周期原像素规则验证与一次例外扩批（连续性修复，未采用）

同一两个脚本增加有限模式，复用当前Scene的healpix-ts NE/NW轴、Astropy ICRS→Galactic、原`bilinear_source_samples`和周期经度crop。1040/1528共524288像素中心经mature HEALPix parent/行/列往返0差；原JPEG一次解码，纬度只保四真实邻点、没有极区外推/透明填充/抹星/调色。分别恢复原加工9805/330透明像素，新缺测0；两片共同有效区域RGB中位/P95差0，max1/27。1040保84311有效黑像素为alpha255，黑与missing未混同。

两瓦片实际当前Scene四帧原/新对照，真实BSC目录、同刻/相机/mesh/shader/blend保持；南极三角缺口消失，经度单片改善但邻片仍有细线。实际完成帧改动22789/263像素，GL错误0、纹理18创建/18退休、remaining0。这里只证明具体修复能被原消费者绘出，不外推全部视域、配准、高清或原生验收。

规则验证后机械扫描原480最高片，26片共13616 alpha0像素；既有两修片复用，余24片一次生成6291456坐标/往返0差并原像素采样，恢复3481透明像素、新缺测0。共同有效区域P95仍0，max29保真实差异而不宣称逐像素完全等价。新批源解码3.532s、总10.634s、Windows进程实测peak3473223680B，仅本机离线加工，不是客户端/生产容量。原40K/JPEG SHA未变，source science UNKNOWN/absolute registration UNVERIFIED。

使用[官方Hipsgen TREE](https://aladin.cds.unistra.fr/hips/HipsgenReferenceManual.html)从已加工最高片重建，未重跑INDEX/源全批，也未自建金字塔。单次派生树只复制454个原字节最高片和26个修片，原祖先0复制；不用可写hardlink，以免工具污染原失败。TREE15.947s完成，最高480片输入/结果0差，父层为order3/120、order2/30、order1/14、order0/8；供给仍仅原30个order2区域，不是全天完成。旧树、具体CAR失败、两例外小样及工具日志均保留。

六代表区域10°/4°共12个当前Scene新帧已实际查看，原已完成PNG/已绘RGBA身份按当前产品/库pins复用，不重画旧基线。M31/M42/M87六帧全部RGBA严格不变；双极/经度六帧有改动，经度细线与南极三角缺口在两档均消失。42纹理创建/42退休/remaining0，GL/页面错误0；所有同视域目录对象数量保持。北极放射/星点痕迹仍在，原极区条带与原/新片均保留，内容/投影真实性尚未闭合，不能以透明修复冒其修复。0.4°不再重复已知软图试验，不能作为一般高清。

证据入口：`output/noirlab-allsky-source/hips-geometry/result.json`、`hips-alpha-scan.json`、`hips-continuity-pixels/result.json`、`hips-continuity-input/tree-result.json`和`scene-hips-continuity/result.json`（六组原/新宽窄contact）。一次Scene adapter括号解析失败发生于任何帧/加工前，已修语法而保断言，记录`continuity-scene-adapter-failure.json`保留。该阶段连续性规则已验证，可复用扩批，但原图极区质量/名义绝对配准、完整全天供给、合格目标高清、正常供给合同/署名、原生/设备/物理/独审仍开放；普通空/关及全部33项不改判。下一动作只按PLAN，先处理仍有独立输入的电脑义务，未证明质量前不盲扩全源。


## 2026-10-08 直接极区原像素与当前配置退出

北极原/修复HiPS视图仍有扇状放射与星点拉长。沿同一个Python sampler增加有限polar-source模式，绕过HiPS父层、GPU、目录星和合成，直接由原40K JPEG生成双极4°/2°TAN共四图；源前后SHA仍b7343a1e03f02696fcc6d8c967b556986e879ed52194ad9dd3f16bd52aef3b75、sRGB ICC保持。完整解码3.714s，总5.261s，Windows此进程实际peak3,420,798,976B，不是客户端/生产容量。四图与原极区条带、原/修复Scene实际查看。

初始10°请求被原sdss target_tan的≤4°守卫拒绝，发生在第一图采样前；未放宽共用owner或断言，改为支持的4°/2°。空目录检查遭Node REPL跨realm数组原型断言，失败收据未写时resume守卫亦拒绝，均发生于任何图片前；修正准确的空目录length检查，保留failure-before-sampling.json并仅恢复该未采样任务。此修复没有执行旧10°/旧480片或另复制脚本。

直接北极4°与2°均有原Scene相同蓝色扇形、径向条纹和星形不连续；南极没有同类扇形。由此在当前名义Galactic映射下，伪影已存在于HiPS/GPU/目录星以前的原像素投影，连续性修片不能解决它；不能把具体源投影显示失败归罪于native缓存或继续同输入调色/抹星/填透明。两4°几何缺邻0；两2°各保留最近极点4像素真实四邻不足为alpha0，不外推补极点，所有有效黑继续有效。

决定NOMINAL_NORTH_POLAR_DISPLAY_QUALITY_FAILED：停止该配置北极无变化加工与盲扩全天，只在决定性producer几何或不同合格源到来时重开；原源、全部候选/失败及规则可复用。该直接诊断没有新Scene/native或普通采用，科学UNKNOWN/绝对配准UNVERIFIED、全天供给/一般高清、33项和普通空/关仍保开放。新证据output/noirlab-allsky-source/polar-source/result.json、contact.png及decision.json，前两阶段原收据/树/图均不改。当前独立下一只见PLAN。


## 2026-10-08 生产者坐标与区域原件元数据有界核查

沿现有官方链接完成8次有界HTTP读取：88星座项目/AVM说明/原发布、Andromeda教育页、两原件页及两JPEG Range前缀。每份前缀196608B、HTTP206且Content-Range与SOF尺寸一致，总393216B；没有下载完整区域JPEG、TIFF或ZIP，也没有重做原40K加工。Commons只用于发现官方piece原件URL，结论与权利只取官方页面及嵌入XMP。入口`output/noirlab-allsky-source/producer-metadata/decision.json`绑定10个实际输入文件，前缀hash不冒完整原件hash。

[官方项目](https://noirlab.edu/public/education/constellations/)和[原发布](https://noirlab.edu/public/news/noirlab2430/)明确胶片面板由带/未带扩散滤镜两曝光组合；这补充producer显示处理边界，不建立科学亮度资格。[piece原件](https://noirlab.edu/public/images/13h25m0-1693-CC/)5031×9699，GPano给65748×32876全景及left30318/top11754裁切，但AVM只有ReferenceDimension/空Notes，没有celestial frame/reference sky位置/rotation。[Andromeda原件](https://noirlab.edu/public/images/andromeda/)5556²，AVM仅空Spatial.Notes；两份具体XMP均记录CC BY4.0，不能由此补配准。官方AVM通用说明有WCS能力，不等于这些资产提供了WCS。

决定BOUNDED_PRODUCER_RESEARCH_CLOSED_NO_DECISIVE_CELESTIAL_GEOMETRY_NOT_ADOPTED：这些元数据不足以改变当前名义北极显示FAILED或扩大合格供给；不以较高全景像素数/裁切坐标代替完整天文映射，不扩抓同类照片、不再无变化加工。原源、26片规则、树、失败全部保留；scientific UNKNOWN/absolute registration UNVERIFIED、普通Prepared空/HiPS关及33账不改。当前转R/E/A代码边界和失败恢复剩余检查，只有新的决定性输入再回Q。

## 2026-10-08 独立 Photopic 全天全景的准入核查

当前 owner/Context/PLAN 中没有这项已处理决定，故只作有界生产者材料核查。沿 [NASA 具体 APOD](https://science.nasa.gov/image-article/apod-2011-may-20-a-journey-through-the-night-sky/) 的原作者链接，6次直接HTTP读取中5次取得正文；作者HTTPS失败保留，实际HTTP作者页与原interactive元数据可读。作者[原文章](http://skysurvey.org/blog/2011/2/17/for-all-the-nights-stars)记述使用AstrOmatic计算镜头姿态/畸变并拼接全天，这提供成熟方法线索，不能替代合格坐标产品、精度或图质证据。

具体APOD将该图copyright归于Nick Risinger；[NASA版权说明](https://science.nasa.gov/apod/apod-about/)明确NASA不能替第三方授予使用许可。这5份实际正文未找到适用于本产品获取、加工、自托管和商业分发的明确开放授权；公开viewer及ESO视频中的署名均不能补该授权。原interactive HTML仅作元数据保存，未执行或抓图/瓦片，也没有验证可准入的天文映射。此结论限定当前公开获取路径，不能扩大为该作者永远禁止商用或断言所有可能授权均不存在。

当前路径退出：RIGHTS_NOT_ESTABLISHED / PUBLISHED_COORDINATE_PRODUCT_NOT_ESTABLISHED，未采用。入口 `output/photopic-sky-source-research/decision.json` 绑定5个正文，记录6次读取及HTTPS失败；零图像下载、零加工、零产品代码/版本/出版。只有新的具体资产开放授权及坐标材料才能重开，不采购或外联。原NOIRLab北极FAILED、所有原候选和失败、scientific UNKNOWN/absolute registration UNVERIFIED、普通空/关及33义务保持。

## 2026-10-08 成熟成品批次与 FDS 代表退出

一次 color 名称登记77/74图像/34光学有限分流及新 FDS 18原瓦片、两完整Scene的当前证据见 [本次责任账](q1-mature-hips-batch-2026-10-08.md) 与同名JSON。FDS宽视域彩色星晕/核心拖带 FAILED；原MOC/TLS/选片及末尾BSC断言失败保留，真实8404颗解析后两视域0属有效零，未重渲或采用。当前转 VPHAS+ DR4 的精确原发行/MOC准入，其新背景处理元数据是可行动不同输入；不回头加工NOIRLab极区、Photopic或Legacy/ZTF原失败。
