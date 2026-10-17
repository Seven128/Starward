# 云观星图像工具实测：现有链路与五种工具的相对比较

测评 2026-10-08～09。2026-10-09用户进一步明确：比较各方案前段处理本身的相对画质和效率，现有云观星自研处理链也要参加；需要二次处理不构成淘汰理由，本次排序不纳入二次修补成本，也不以自动产出零缺陷成品为前提。“PS RC插件先只看质量、不测速度”仍有效。本报告据此修正结论，保留全部实际实验及缺陷证据。执行与压缩恢复唯一索引：[当前计划](image-tool-full-comparison-2026-10-08.md)。云观星主Goal保持暂停。

## 选型结论

**StarNet2与SXT同属第一梯队；现有证据不支持StarNet整体画质高很多，也不足以排出跨目标的唯一画质冠军。**三个保留输入同为全图2x处理时，StarNet为5.50／4.29／2.46s，SXT为11.20／8.58／5.35s；M81的部分红色旋臂结点，StarNet2x也比SXT保留得更多。这支持本机单张流程速度和该局部结构的优势，不足以推出整体画质或优化批量吞吐领先。此前“StarNet暂列技术首选”把这些有限优势合并成排名，表述偏强，现修正。SXT已有真实三文件GPU批处理证据，两款工具都明显比当前缩放/背景扣除链更能减少照片恒星。保留缺陷说明，不用“仍需修补”否定它们的相对价值。

**用户最终决定采用SXT CLI，StarNet暂不考虑。**原因是SXT已验证的原生GPU批处理、PS/CLI同模型衔接，以及StarNet的产品素材用途限制；不声称SXT绝对画质最高。简短背景已进入[外部能力Context](../../../../project_context/external-capabilities.md#云观星图像处理工具)，[流程采用与实际激活状态](image-processing-workflow-adoption-2026-10-09.md)持有追加工作。此前偏向StarNet/争取授权的建议已退役，[许可研究](starnet-asset-use-risk-2026-10-09.md)只保历史证据。PS＋SXT的5份原始输出与同参数CLI全RGB相同，按用户要求不评插件速度；修补成本不进入此前前段工具排序。选型不等于全库生产或主Goal恢复。

|比较方案|本次实际运行范围|直接输出质量与效率|相对结论|
|---|---|---|---|
|现有云观星处理链（自研编排＋库函数）|3个相同星系源图；整图缩放与既有Photutils背景配方；实际Scene对照|缩放约0.59～1.03s，保留原图内容但不减少恒星；背景配方成功2图约2.25～4.35s，NGC5128失败；M81弱盘变暗，星点依旧|保留尺寸/坐标/编码与按需背景处理责任；已测路径没有与专用工具相当的分星效果，不能只凭更短时间认定综合最佳|
|PS自身|27.10.0；高光选择、Minimum；2代表＋3保留，另有分层保护与Scene证据|所看ROI结构保留较多，但只缩小星芯，亮星halo和密星大量保留|本次自动缩星配方的去星效果落后于专用分星工具；不推断PS所有方法无效|
|PS＋StarXTerminator（另含CLI同模型对照）|插件2.6.9/ML11/default overlap0.2；2＋3；raw与保护图分别保存|5份插件raw与CLI默认全RGB相同；去星明显，但NGC5128细丝/M81红结点误删、亮星残弧仍在；CLI单张与原生批调用均有实测|技术第一梯队；用户已选择CLI为批量去星主入口，PS用于异常修复。没有插件画质高于CLI的证据，不作插件速度排名|
|StarNet2|2.6.2 build0242 ORT/DirectML，默认/2x；2＋3|同为2x的单张流程更快，M81部分红结点保留更多；仍有残环，全部弱结构保真未证明|技术第一梯队，已测单张速度有优势，整体画质胜负未定；所测LICENSE第5节限制软件资产/fixture/reference用途，后处理或非商业也在限制内，故尚不能据此进入产品路线|
|nox|1.1.0，当前CPU路径，默认/2x；2＋3|去星明显，但结点误删、残环/平滑仍在；三保留2x为65.44／38.38／30.28s，未见足以抵偿该时间差的画质优势|本机所测路径排在StarNet/SXT之后；MIT备选，其他优化路径未测|
|Siril＋去星工具|Siril1.4.4＋官方StarNet.py1.1.1；M8代表smoke及3保留；NGC253代表未另跑|同StarNet模型，未见额外画质收益；三保留9.37／10.57／7.28s，同参数独立StarNet默认为3.21／2.96／1.83s|已有独立调用路径时不优先引入该包装流程；输出非逐像素相同，平均绝对RGB差0.528～1.139、最大38～45；承继所测StarNet用途限制|

以上评价限定本次版本、参数、来源和路径。没有把有限配方失败推断为软件全部能力失败，没有把非等算力结果当算法排行。SXT试用测通也不替代最终软件素材用途/发布授权；用户自行安装PS的授权来源未被本报告认证。

## 社区对照、降噪组合与套装（2026-10-09补充）

用户追问StarNet是否明显优于SXT、是否有社区依据，以及RC Astro降噪/套装因素。本节是官方资料与用户亲自对照的研究补充，没有新增NoiseXTerminator推理、购买或全流程实测；主Goal继续暂停。

- [AstroBin 2025-02-21～23实际对照讨论](https://app.astrobin.com/forum/topic/160021/starnet2-vs-starx-and-the-winner-is)：发帖者对IC410的OIII采用相同后续步骤，结果明显偏向SXT；其他使用者也报告SXT误删微小星云/星系。属于个人样本和主观经验，不是统一多目标评测。
- [Photon Millenium约15图对照，StarNet v2与SXT AI10](https://millenniumphoton.com/starnet-v2-vs-starxterminator-v8-le-match-retour/)：总体接近，各有擅长对象，均可能过度平滑或丢失结构。模型代次早于本次SXT ML11，不能直接当当前版本排名。
- [Evan Tsai自有图像比较](https://www.astroimagetw.com/en/tutorials/star-removal-tools/)也报告结果随成像系统/星点尺度而变，并记录SXT后续改善。页面含历史和更新内容，不能把页面初始日期当成全部实验时间。

本轮未找到与本机StarNet2 2.6.2/具体权重、SXT ML11、同一批发布者RGB图片全部一致的社区成对基准。社区资料支持“各有优势、SXT常被作为默认工具”，不支持“StarNet总体显著更好”，也不证明SXT在我们的全部素材上胜出。摄影师常在处理后加回原星层；云观星若由目录星替代照片星，这类经验的残影容忍度不完全相同。

用户提及的去噪工具是[NoiseXTerminator](https://www.rc-astro.com/software/nxt/)，官方提供CLI、PS及PixInsight入口。其[AI3手册](https://www.rc-astro.com/noisexterminator-2-ai3-user-manual-pixinsight/)支持线性/拉伸数据、亮度/颜色及噪声尺度分开控制，同时说明过强降噪会过度平滑，多次迭代可能出现伪影。它可以处理StarNet或SXT的结果；按功能推断，降噪不能可靠恢复前一步已误删的真实结点/细丝。我们使用的发布者JPEG/RGB多数已调色，不能把新加一层降噪当作必然提升。

**SXT CLI已选定，NoiseXTerminator仍是按需降噪候选，PS保留可编辑责任；没有实测证明组合画质胜出。**既有批量入口可复用，SXT插件和CLI已测同画质。此前公平比较原则是给两种去星结果同等降噪机会；现用户暂不考虑StarNet，不据此自动启动新的跨工具对照。后续对SXT结果做有/无NXT的小样本对照，用残星、细节、噪声、色彩和新增机器时间决定按需加入。StarNet同系列也有[DeepSNR PS降噪工具](https://starnetastro.com/ps-plugins/deepsnr/)，本次未测，不能把“有降噪生态”说成RC独占。

用户补充套装销售：采购比较应计入实际套装价格与已有授权。2026-10-09官方[Photoshop Bundle](https://www.rc-astro.com/software/photoshop-bundle/)显示SXT、NXT、GradientXTerminator、StarShrink四工具共US$189.80，页面单品SXT/NXT各US$59.95；并明确其中SXT/NXT许可可用于PS、PixInsight和CLI。故存在套装优惠，也存在单买，不等于购买SXT自动赠送NXT或两者只能捆绑。此为公开目录价格，未下单、未确认账号补齐套装折扣或税费。套装改善成本/入口便利，不单独证明画质更好；GradientX/StarShrink本次未测。

## 当前自研链路的同输入基线

“当前方案”按真实责任核对，而不是假设项目已有自研去星模型：`publish_prepared_native.publish_native_recipe`保留完整照片、使用LANCZOS生成尺寸层级；已有背景实验采用Photutils估计，再按`publish_prepared_display.verify_display_pixels`持有的线性光扣除公式验证。运行时亮度相关合成可减弱暗底，但不是天体分割/去星。HiPS入口复用发布者瓦片。本次比较覆盖这些当前照片路径；SDSS原始科学图像实验的输入和责任不同，不冒充同一基线。

原始记录：[既有基线报告](image-tool-benchmark-2026-10-08.md)、[机器索引](image-tool-benchmark-2026-10-08.json)。只沿用其中真实实验数据，其旧“默认复用/PS未测”等阶段判断已被本报告取代。2026-10-09另做[基线同输入读回](../../../../output/image-tool-full-comparison-2026-10-08/current-baseline-readback-r1.json)：3个星系的新旧source identity相同、归一化RGB最大差0、ICC字节相同，支持将既有背景处理结果纳入同输入比较；没有重复模型推理。

|星系输入|整图缩放基线完整调用|Photutils背景配方完整调用|直接质量结果|
|---|---:|---:|---|
|NGC253|1.028s|4.349s|背景有所改善，密星与边缘问题仍存在|
|NGC5128|0.588s|失败，0.639s|固定保护/采样规则下无足够未遮挡背景网格，不能把失败时间当处理速度|
|M81/M82|0.750s|2.247s|弱盘变暗，恒星保留；没有完成星体分离|

这些是单宽1024的读入/hash/缩放/处理/编码诊断完整调用，不是三档发布总时间，也不是纯函数耗时。当前完整工具基准中三图原样调用为1.075／0.543／0.715s；两轮数量级一致，不按小数差异排名。M8没有同配方背景实测，不补成全五样本覆盖。先前结论漏列此基线，现已补正。

本次准则修订前的报告保存在[历史快照](image-tool-final-results-history-2026-10-09-before-relative-ranking.md)。已有独审证明的是其所读代码与原始证据；本次新增的解释/相对排序及基线读回由root完成，没有冒称它们已被旧独审再次审查。

## 相同输入、冻结规则与实际画质

输入合同：[full-comparison manifest](../scripts/image-tool-full-comparison-samples.json)，6429B，SHA256 `10c8c3cd66ec408a2c94ff7d5cbb86faf43c3679c8c9bfe77026cb37764dad62`，本轮未改。原始bytes/hash、metadata、rights、geometry、准入methods和原保护椭圆均绑定。2x对照是完整归一化图放大后处理再回原尺寸，ROI只在全图处理后裁作诊断。

|作用|固定输入|尺寸/关注点|
|---|---|---|
|代表|NGC253，ESO eso0902c|8285×7510→1024×928，弱盘/核心/结点/完整照片边缘|
|代表|M8，Rubin order6 Npix28891|原512×512，密星/细尘纹/弥漫云，真实HEALPix瓦片|
|保留小批|NGC5128，ESO eso1221a|4000×3912→1024×1001，弱晕/离心细丝/亮星残弧|
|保留小批|M81/M82，NOIRLab noao-m81m82|8315×4642→1024×572，双目标/旋臂红结点|
|保留小批|M8相邻Npix28892|原512×512，同规则迁移与瓦片处理差异|

ESO/NOIRLab源图CC BY 4.0、Rubin图像CC BY 4.0/HiPS ODbL-1.0，原始署名与来源由manifest/metadata持有。全不透明、未标ICC的Rubin网页PNG显式按sRGB显示解释，不能据此声称科学颜色校准。通用分星对cluster在加工前被拒绝，星团成员没有被当作待删前景星；本轮没有星团加工成品验收。

PS代表配方冻结后，再用同样规则处理3保留输入，没有逐图画新蒙版或为保留图调新参数：

- PS自身：ColorRange Highlights fuzziness40、minimumBrightness170/maximum255；选择expand1px、feather1px；RGB component channels上的Minimum radius1px。存储可编辑高光alpha。未声称这是天文目标/恒星分类器。
- PS＋SXT：真实ATN内1个StarXTerminator步骤，ML11/default overlap0.2，通过`app.doAction`执行。保存原始处理图，再采用manifest原冻结星系椭圆、GaussianBlur8px软保护；M8没有合格弥漫云保护蒙版，未发明遮罩。
- PSD：Original、Processed及星系的Original target protection(layer mask)，PS自身另存高光alpha。`removed-diagnostic.png`仅是clipped RGB original−raw供看图，不是SXT原生unscreen星层或科学线性重建。

**关键诊断：**NGC5128 ROI `(285,350,370,440)` 的蓝/红细丝在原图与PS缩星图存在，在SXT raw中明显丢失；M81 ROI `(140,205,195,275)` 的红旋臂结点同样受损。保护层把它们恢复，同时恢复原图恒星。NGC5128亮星ROI `(805,618,875,688)` 中，PS缩小星芯但halo仍在，SXT留下黄色弧，保护恢复整颗亮星。4x nearest仅用于查看，源图实际处理分辨率没有改变。[诊断JSON](../../../../output/image-tool-full-comparison-2026-10-08/ps-quality-diagnostics-r1/result.json)。

![NGC5128真实细丝对照：原图、PS缩星、PS SXT原始输出、PS SXT保护后](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-quality-diagnostics-r1/ngc5128-roi-1.png)

![M81红结点对照](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-quality-diagnostics-r1/m81-m82-roi-1.png)

5个SXT插件raw与既有同参数CLI结果**全图RGB max/mean difference均为0**，由root及独立reviewer另行读回；不是比较JPEG缩略图或以CLI执行冒充PS插件。此前CLI default/2x都误删同结构，额外2x也未解决这个质量问题。M8低频颜色/主要尘纹视觉上保留，不等于所有弱云/细丝无损；扩展蓝色亮斑不能全部预判为恒星halo去抹。

## 可编辑与格式合同的实际证据

两条PS各2代表＋3保留共10份PSD，实际PS重开后导出全部合成图，完整RGB与各自final maxDiff0。NGC253 SXT保护层opacity100→0实际改变42704个像素，关闭时RGB=raw，再恢复100时RGB=final，源PSD hash始终未改；全部任务文档关闭后Documents=0。[原生重开/编辑](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-psd-audit-r1/native-result.json)、[像素读回](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-psd-audit-r1/pixel-readback.json)。

独立reviewer按公开PSD格式解析10份PSD的图层、PackBits通道、蒙版及合成数据：Original层=原图、Processed层=raw、6份星系保护层=原图且实际layer mask=完整保护PNG，全部composite=final；PSD ICC资源=原绑定ICC。Pillow对含多alpha的PS自身星系PSD合成解码存在差异，已由独立公开格式解析及原生PS重开共同确认是该解码路径限制，没有据此误判PSD损坏。[独立审查](image-tool-ps-independent-review-2026-10-09.md)。

无改动PS往返在当前最终driver实际验证NGC253/M8两图完整RGB maxDiff0、final ICC字节=bound original。原始PS PNG导出曾漏ICC；SaveForWeb后M8的内置sRGB标签由PS改为Adobe sRGB IEC字节。现保留vendor raw，经实际RGB8/sRGB文档、尺寸与PNG读回证明后，final受控嵌入原绑定ICC，再验证RGB未变。不能宣称vendor raw ICC始终字节相等。[最终往返](../../../../output/image-tool-full-comparison-2026-10-08/ps-roundtrip-final-r1/result.json)。

## 真实星图消费者与质量界限

当前任务Scene runner仅增加PS产物准入及严格finalICC核验，未修改产品renderer/注册/budget。调用当前Prepared/HiPS真实Scene与GPU责任，通过Chromium软件WebGL可重复运行，不是贴图拼接预览，也不替代手机真机。

- **M8 HiPS：**original/PS-only/PS-SXT、DPR1/2共6主帧＋1个catalog-off控制帧。每路画同10片，只替换28891/28892，另8片保留源图，因此是2/10局部对照。原图两DPR完整RGBA=冻结基准，PS-only改变45511/182130像素、PS-SXT改变102904/411599；catalog解析8404行但该视图实际画2对象，关闭目录改变109像素。每主帧10tile draws、GL0/无failed，dispose后所拥有GPU资源0。[当前严格ICC运行](../../../../output/image-tool-benchmark-2026-10-08/scene-ps-hips-quality-r2/result.json)。
- **NGC253/NGC5128 Prepared TAN：**2目标×2方法×wide/detail共8处理主帧＋4off控制，共12。实际贡献非空且清理通过。M81/M82不满足该TAN消费入口、M8为HiPS，没有强行当成TAN画。相同像素改动数量源于同照片覆盖面积，不代表两方法画面内容相同。[当前运行](../../../../output/image-tool-benchmark-2026-10-08/scene-ps-prepared-quality-r2/result.json)。
- 实际看图仍有照片矩形边缘、保护区星密度变化，以及M8处理/未处理区域差异和覆盖外缘对角硬边。8px羽化只软化蒙版边界，没有证明最终自然融合。以上具体质量缺陷保留；历史成品检查标记为**FAIL**，不据此取消前段工具的相对排名，也不把所有问题归因于分星算法。

![M8实际HiPS：原图、PS自身、PS＋SXT，局部2/10瓦片对照](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/scene-ps-hips-quality-r2/m8-comparison.png)

弱结构全部完整性、科学光度/颜色、绝对天文配准、手机原生、全M8与星团成品仍**UNVERIFIED**。技术/数值保护通过不代表这些范围通过。

## 前段处理效率：保留已测数据，二次修补不参与排序

硬件i5-11400F6核12线程/32GiB/RTX3060 12GiB。非PS完整新输入机器成本、首启成本、失效缓存与RSS观测限制见[已保存非PS报告](image-tool-nonps-results-2026-10-08.md)，不重复实验：

|保留输入|nox 2x，CPU|StarNet 2x，DirectML|Siril＋StarNet默认|SXT默认，ML11/DirectML|SXT 2x，ML11/DirectML|
|---|---:|---:|---:|---:|---:|
|NGC5128|65.44s|5.50s|9.37s|6.073s|11.20s|
|M81/M82|38.38s|4.29s|10.57s|5.639s|8.58s|
|M8邻28892|30.28s|2.46s|7.28s|3.845s|5.35s|

这是所测路径含读取/hash/缩放交接/推理/PNG及诊断的单次流程读数，不是等参数等算力算法排行，不给统计吞吐承诺。SXT默认与2x不同；Siril对比同参数独立StarNet默认为3.21/2.96/1.83s，作用是看wrapper额外成本。

SXT CLI一次3个新输入的实际原生GPU批调用7.616s、staging0.224s，与对应逐张**同工具调用边界**合计17.227s相比减少启动/调用开销；最终3图与逐张processed完整字节相同含ICC。不能与24.932s逐张完整流程混排，也不包含最终人工修补。[实际native r3](../../../../output/image-tool-full-comparison-2026-10-08/sxt-native-validation-r3.json)。缓存命中时间只用于恢复验证，不当新输入吞吐。

按用户要求，本报告不列PS＋SXT滤镜速度或与CLI的速度排名，自动记录时间留在receipt作为追溯。未做逐项手工修补（0次/0秒），人工review/编排未可靠计时=UNKNOWN；二次处理不计入本次相对排序。**有效成品/小时未知**只限定吞吐声明，不阻止比较已测前段工具，也不触发追加修补测评。

软件新增支出：本轮未购买/开通Adobe付费方案，SXT官方零元试用已领用。实际读取当前登录[Adobe计划页](https://account.adobe.com/plans)显示“您没有已付款的计划”，没有列出试用/可取消方案，因此没有可声称完成的订阅取消；该观察仅限当前网页账号，不认证其他账号或用户所装PS授权来源。[不含个人字段的读回](../../../../output/image-tool-full-comparison-2026-10-08/adobe-plan-readback-2026-10-09.json)。

## 可重复处理路径与代码质量

责任保持最小：共享[tool runner](../scripts/benchmark-image-tools.py)拥有准入/归一化/hash/guard_mask/native/ICC；[PS driver](../scripts/benchmark-image-photoshop.py)、[PowerShell host](../scripts/benchmark-image-photoshop-host.ps1)、[JSX](../scripts/benchmark-image-photoshop.jsx)只桥接本机实际PS；[recipe](../scripts/image-tool-photoshop-recipes.json)固定软件/model/ATN/规则；[Scene runner](../scripts/benchmark-image-scene.mjs)验证实际消费。新PS方法不修改原manifest的methods，不放松StarNet用途边界。

全batch1～5个输入先验证当前source/metadata/完整sample字段、原成功receipt、normalized RGB8/sRGB/geometry、vendor/action及recipe，才stage新run。输出排他写入，不覆盖历史；推理后重验所有依赖；失败保留failed.json，不能按退出0或只看history当成功。默认不复用输出；显式`--reuse-from`必须完整key＋所有输出hash匹配。实测当前roundtrip正向复用无PS调用，过期key/损坏binding被拒绝。[复用证据](../../../../output/image-tool-full-comparison-2026-10-08/ps-roundtrip-verified-reuse-r1/result.json)。

实际PS守卫在app.open前拒绝已打开的源/蒙版，避免PS复用用户文档后被finally误关闭；同名动作已有时拒绝，只卸载本次加载的任务set；保留displayDialogs/prior active document，channel.duplicate导入保护不使用用户剪贴板。实际dirty sentinel有改动像素，但被拒绝后RGB/ICC/history/layers/active doc原样保留，source未保存；动作碰撞未导出且原动作保留，测试最后只清理所创对象。[native拒绝](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-admission-r1/result.json)、[像素读回](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-admission-r1/pixel-readback.json)。

[9条实际CLI边界检查](../../../../output/image-tool-full-comparison-2026-10-08/ps-admission-tests-r2.txt)PASS：cluster、撤销SXT准入、几何规则变化、duplicate IDs、failed original、metadata变化、过期adapter key、损坏输出binding、既有run。全部非法新输入未stage/调用PS，既有run不覆盖。原13条共享与7条保护检查保持已保存证据；未变化的模型不重复跑。

有意义的失败保留：PS自身r2曾在alpha上执行Minimum，history有“滤镜成功”但全RGB没变化，driver实际拒绝no-pixel-effect；改为RGB component channels后代表/保留成功。另有ICC漏写、encoding拼写、selection histogram受选区限制、mask rename active document错误。测试r1唯一FAIL是损坏缓存被正确拒绝后测试期待错误名，修断言后r2全部PASS，不记成实际缓存放行。独审指出的剪贴板副作用已改channel.duplicate，实际2代表新路径RGB/ICC/PSD=旧同配方。

10份质量输出绑定其真实当时脚本代次；后续mask导入/诊断字段修复不冒称当时用过新hash。当前最终代码另有实际2代表往返、正向cache与native守卫证据；当前Scene ICC guard已实跑r2。原生Action保存与独立重放已证明：先把last filter改GaussianBlur再重放仍是SXT；旧UUID裸descriptor失败不代表UUID过期，同UUID的保存动作可执行。没有重复另造模型抽象或修改产品代码。

独立审查覆盖实际输入/output绑定、10PSD、5插件与CLI逐像素、ROI/whole图/真实Scene、新导入路径、准入/cache/native guard、最终报告及命令/链接：[PS独审](image-tool-ps-independent-review-2026-10-09.md)。非PS审查保留[原记录](image-tool-nonps-independent-review-2026-10-09.md)。当前没有确认未修的P1/P2代码问题；已知画质失败明确保留为质量FAIL。

## 复跑命令

在 `E:/dev/worktrees/Starward/remote-main-20260908` 执行，保留已绑定源文件、工具版本、venv和历史Scene基准。每次使用新的小写run名，不覆盖。以下路径生成待审候选，不自动采用于产品；新素材要先补真实来源/权利/geometry和normalized original receipt，不能把未经门槛验证的素材混入现有manifest。

1. 用PS自身或PS＋SXT当前冻结规则一次处理代表＋保留5张，保存raw/final/可编辑PSD。将`--operation ps-sxt`改为`ps-only`即可跑另一条，必须更换run名：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-photoshop.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --from 'output/image-tool-full-comparison-2026-10-08/representative-review-r1.json' `
         'output/image-tool-full-comparison-2026-10-08/validation-batch-r1.json' `
  --samples ngc253 m8-tile-28891 ngc5128 m81-m82 m8-tile-28892 `
  --operation ps-sxt --run ps-sxt-quality-next
```

`--preflight-only`仅校验而不stage/调用PS；`--operation roundtrip`只验证格式；`--reuse-from <同一当前key成功result.json>`核验后复用，不作为速度测评。所测ATN由recipe固定，动作文件：[SkyBenchmarkSXT-20261009-r1.atn](../../../../output/image-tool-full-comparison-2026-10-08/ps-sxt-action-r1/SkyBenchmarkSXT-20261009-r1.atn)。保存新PS产物前先关闭自己正在编辑的相同输入，driver不会替用户关闭。

2. 批量候选能力的实际CLI多文件新推理路径；这里保留已测2x native合同，并不声称2x画质更好，默认单张路径及其他对照见非PS报告：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-tools.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --output 'output/image-tool-full-comparison-2026-10-08' --run sxt-native-next `
  --methods sxt-upsample `
  --native-sxt-batch-from 'output/image-tool-full-comparison-2026-10-08/sxt-upsample-validation-r1.json'
```

3. 重现本次PS输出的真实消费者，合并输入已有sourceRuns绑定，不重跑PS/模型；每次更换Scene名：

```powershell
& 'C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs' `
  scene-ps-hips-next 'output/image-tool-full-comparison-2026-10-08/scene-ps-quality-input-r1.json' hips
& 'C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs' `
  scene-ps-prepared-next 'output/image-tool-full-comparison-2026-10-08/scene-ps-quality-input-r1.json'
```

4. 对相关代码变化做必要边界检查；不重复未变模型来填测试数量：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/test-image-photoshop.py'
```

正式处理顺序应为：全batch准入→批量产生候选/原图/PSD→按结构损失/亮星异常/边缘对照审阅→只对明确异常作可编辑修补→同实际Scene质量门槛复核→通过后才计新输入、修补及人工review总时间。本次交付到了可重复测试/编辑/审阅路径，未替未来手工修补声称合格或编造人工吞吐。

官方能力/源码参考：[Adobe脚本自动化](https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/automate-photoshop-with-scripts.html)、[Adobe高光颜色范围](https://helpx.adobe.com/photoshop/desktop/make-selections/freehand-selections/select-a-color-range-in-photoshop.html)、[RC Astro SXT](https://www.rc-astro.com/software/sxt/)、[nox代码/权重](https://github.com/charvey2718/nox)、[Siril官方脚本仓库](https://gitlab.com/free-astro/siril-scripts)。本报告的画质判断依据实际已绑定输出，不以宣传代替实测。
