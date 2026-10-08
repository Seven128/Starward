# 2026-10-08 成熟成品批次与 FDS 代表退出

初始FDS阶段只核 color 名称查询返回的 77 条登记：3 目录、74 图像，其中 34 标注 Optical。这不是完整光学源目录，未验项没有被判为全局不可用。该阶段证据见同名 JSON（78 个有限文件绑定）；最新区域/治理结果见本文末段及 JSON 的 peripheryOwnerReadback，当前行动只按 PLAN。前述供给阶段的next仅保当时调查理由，现动作以PLAN和本文末段为准。

重复工作按责任批量化：原 inspect-legacy-regions.py 统一 MOC 子像素判断和原瓦片下载/缓存读回；现 inspect-noirlab-scene.mts 统一当前相机、选片和完整 Scene/GPU。没有复制版本 runner、逐对象加文案、重新跑 C03 原全体画面或重新加工旧失败照片。

FDS 成品元数据明确等赤道、512 PNG、ODbL-1.0，原 ESO archive/精确 DOI 的 CC BY4.0 与归属义务单独保留。元数据与许可不是图质、绝对配准或产品采用。producer 初始 RA50.694125/Dec-36.8862186 是 region:fds-initial，未冒 catalogue 对象或搜索定位结果。

三条 HTTPS 覆盖获取失败保留。官方单 ID 的公开 HTTP registry SMOC JSON 成功，2522 个 order5..12 单元精确转为 NUNIQ FITS；不降阶扩大子像素，也不冒 master 代次、实际 raster 支持或科学 mask。原 Astropy 环境复用，零新依赖安装。新 order12 子像素/旧 parent 区间、空/超阶拒绝、Legacy/ZTF 下载前失败 guard 均有有限验证。

2.1°/0.4° 名义 TAN 65536 中心均在覆盖内。首原瓦片默认 HTTPS 握手 FAILED，唯一 TLS1.2/HTTP1.1 对照得到合法 PNG；保原失败、只按成功协议补其他原件，不关校验、不改系统网络。两张原像素预览已有 14 瓦片。

第一次当前 Scene 选片预检缺邻接瓦片，保 FAILED 且零渲染。实际正常 minOrder1/maxTiles12 选出 order5 的7张和 order8 的11张；256平方采样涵盖390×844实际立体投影视域，65536中心各自通过名义 MOC。仅补4张边缘原片，不改选片器或重做预览。最终18原PNG共6,067,030字节，全部固定 HTTPS URL、HTTP200、无redirect、512 RGB/RGBA和原hash读回；这不是全巡天镜像。

当前实际完整 Scene 绘出两张390×844 PNG，光学有效提交4/6组；各自 GL0、completed1、纹理创建/释放4/4和6/6、最终live0。渲染时167输入前后相同。原批次末尾“必须画至少一颗BSC”的断言 exit1保为 FAILED。当前真实 BSC v3 publication/当前解码 owner 解出8404颗，两个视域原始投影点确实都为0。脚本只纠正此有限验收假设，保持 publication/精确帧与空星表拒绝；不重渲已有照片。修后唯一变化是任务 verifier 自身，不声称原批次 exit0，也不把零星数当星表故障。

已实际看过两张 TAN 与两张 Scene。2.1° 背景和星系外围连续，但亮源明显彩色大晕与核心彩色拖带：**FAILED_REPRESENTATIVE_WIDE_COLOUR_HALOS_AND_CORE_STREAKS**。0.4° 只见有限连续细区域，不能验完整外围或对象配准。batch-decision 守卫阻止原配置无变化扩批/重加工；不全局排除其它 FDS 角色/版本。没有抠除恒星、抹晕、抠黑、生成细节或做新 PSF 扫描。

下一具体新输入为 VPHAS+ DR4。现主元数据明确 Montage 全局背景处理、原 ESO 精确 DOI 和 ODbL，可能改变银河区域连续背景缺口；同批 DECaPS2 的具体原内容权利尚待，CTA-FRAM、MATLAS、KiDS的不同权利缺口分别保留。VPHAS registry 名义范围与当前 properties 的值冲突，必须核具体 MOC，不能沿旧范围扩片。其 Ha/u/g/r/i处理色不是 FDS i/r/g 或当晚实景。

普通 Prepared 仍空、HiPS OFF、Mellinger低分辨率DISPLAY，FDS未出版/未采用；science UNKNOWN、绝对配准 UNVERIFIED。P1控件 FAILED/root与cache UNKNOWN，手机/真实Linux与provider/完整保留引用和独审、全部33项义务不变。

## 后续 VPHAS+ DR4 的代表提前退出

精确主成品/ESO动态DOI、producer DR4原发行、known-issues和MOC已读。HTTP200原MOC order11共28179单元，名义面积0.048596858978271484与registry0.0486近似一致；properties0.01007过旧/代次冲突保UNKNOWN，不强行改源值。

复用唯一入口一次52对象/104档，19.846秒，M8/M16/M17/M20各两档共8档65536中心全在名义MOC，其余96档零中心。只取M8代表两档8原PNG共4036381字节，2预览alpha0均0；实际看过两预览及order4/1807、order7/115563原片。宽图M20附近硬色块界，细图反复彩色饱和拖带，原片直接确认，**FAILED_REPRESENTATIVE_M8_COLOUR_BLOCK_BOUNDARY_AND_SATURATION_STRIPES**。producer背景修正不是成品验收，停止配置扩批/Scene/无变化加工；另外6档图质NOT_ASSESSED，不外推全源。原条带/反光/波段footprint caveat仍有效；没有安装依赖、建新版本runner或改产品。

DECaPS2的原Legacy自制JPEG授权及NGC3532当前配置FAILED已在既有责任账，复用该决定；新的CDS成品仍须其具体原内容与加工分发权闭合，不能借其它接口许可。E1条件消费者和E2电脑2/10客户端开发范围已闭合部分复用，不重跑。下一只核尚可能补全天背景的CTA-FRAM**具体颜色成品**的新公开权益材料；其它FRAM大气数据或论文许可不代替图像许可。

## CTA-FRAM 具体颜色成品权益有界后查

主元数据有全天天区/等赤道order5/512PNG，却未给出具体图像与成品分发许可。新找到的 [作者Zenodo数据](https://zenodo.org/records/17304761)列明6份大气光深测量文件，并非2022颜色HiPS；不能移借论文或这批测量数据许可。记录提及2026未来原FITS仓库，不证明已发布替代成品。API一次403保UNKNOWN，未循环/取图/联系或购买，具体颜色权益仍NOT_ESTABLISHED，不外推全FRAM。当前该供给研究阶段退出，沿其余可行动电脑责任继续。

## MATLAS / KS4 精确元数据追加

两项沿原有限登记批读，仅metadata，不扩inspector preset、不取MOC或图。MATLAS原HiPS ODbL存在；根135字节只是refresh。本次保web内部错误、原301零body、HTTPS-only redirect拒绝HTTP后文件MISSING，再按真实公开WP斜杠redirect取200原页及两个直接数据库/发行页。原[发行页](http://matlas.astro.unistra.fr/WP/?cat=6)确认2020成品/2021HiPS；本次尚未确认Duc/CFHT/Coleum等原内容加工分发权益，公共可访与一平方度ETG字段不代替全天底图或获权。

KS4 BVI properties一次200/3768B，无hips_license，SNU版权保原；PNG/512/eq/order10与真实I/V/B Asinh映射已读。[作者发行说明6.1](https://arxiv.org/html/2603.28089v1#S6.SS1)绑定同一HiPS，完整原片批量下载需另行申请。arXiv稿CC BY-NC-SA与HiPS权利分别保留；[Data Lab服务条款](https://datalab.noirlab.edu/about/disclaimers)没有闭合这份第三方颜色HiPS的分发许可。本次具体权益未确认，科学/图质UNKNOWN/NOT_ASSESSED，无联系、取图或加工。

[具体读回](../../../../output/optical-hips-registry-research-2026-10-08/matlas-ks4-metadata-decision.json)绑定8份已有metadata并保1个失败输出MISSING；首次pin对该缺文件的ENOENT也保留。两项仍是未采用候选，非全球禁用。名称color筛查不是全光学供给清单，下一只按PLAN。


## Optical/image 属性登记与 Rubin 成品代表批次（2026-10-08）

原77条名称查询不是完整供给目录；复用 [MocServer API 示例](https://alaskybis.cds.unistra.fr/MocServer/example) 和 [官方手册](https://alasky.cds.unistra.fr/MocServerDoc/MocServerManual.pdf) 的实际属性过滤，先id后有界字段记录，261唯一id与261记录集合逐项相等，实际均为Optical/image，MAXREC2048未到上限。193缺subtype、51color、6live、11color live分别保留；颜色含义62条，其中28条未在原77名称记录中，17纯color和11color live，不能遗漏live或把名称当产品性质。[完整有限登记/批量决定](../../../../output/optical-hips-registry-research-2026-10-08/optical-property-registry-decision.json)保18未评估、既有DES商用授权缺口、用户排除Gaia DR3、Mars地表角色和5份NSNS NC条款；不把未评估当不存在或自动禁用全源。一次HTTPS握手失败、缺body MISSING及初始ENOENT保留；复用此前已确认的公开HTTP metadata入口，无凭证，图片仍严格HTTPS。

Rubin First Look来自两张已加工成品，非全天背景。具体 [Cosmic Treasure Chest 条目](https://rubinobservatory.org/gallery/collections/first-look-gallery/mlis3sriah6pn6nfr5ecp46h3i) 和 [Trifid/Lagoon 条目](https://rubinobservatory.org/gallery/collections/first-look-gallery/n4kvj0cemd5pbdqgtjdgp2jg2t)的结构化图片信息均署名 NSF–DOE Vera C. Rubin Observatory 并明确链接 [现行媒体政策](https://rubinobservatory.org/gallery/media-policy)，内容CC BY4.0，成品HiPS单独ODbL/CNRS-Unistra；加工说明、署名、许可和数据库通知仍须随任何真实出版保留，不冒机构背书。原NOIRLab两页面读出验证页，无绕过或重试。CDS具体properties PNG/WebP512/eq/order12及原MOC已获取；实际2693 NUNIQ/order5..12的名义比例0.00070717434，registry0.0007068、properties0.0005663不一致保epoch UNKNOWN。两张历史复合展示图约29平方度，科学支持UNKNOWN，观测时刻不冒实时。

复用同一 inspect-legacy-regions.py 固定Rubin preset及既有TAN/HEALPix规则，一次52对象104档筛查，仅M8/M20/M49/M61的0.4°档65536中心全内，全部4°宽档在下载前拒绝。只增加“已有计划档位子集”选择，不绕过全覆盖检查或source FAILED guard。原瓦片23次有界请求、22成功13,516,239B、并发1、0重试；M49一块Norder7/Npix110922握手35/body MISSING，该对象完整预览MISSING，其余有效结果保留。M8/M20/M61三份512² TAN完成、alphaZero/opaqueBlack均0，已直接看原片及预览，无原失败的大色块/网格或穿核带；不据此外推全源科学、HDR、配准或高清完成。

两份公开完整原图缩略预览先取得100px版本，具体条目的2050px源在15秒总截止处退出28，原部分响应保留。实际Accept-Ranges/ETag给出新可恢复依据，各只请求缺尾段；206/Content-Range/ETag/长度全部一致才另存完整2050×1079和2050×1257原PNG。原超时不改判；未重取全body或修改像素，未下载14.1/24.14GB原TIFF。4份302原header的临时签名访问值已移除，状态/内容header、原body和非敏感range回执保留；不会写入长期凭证。两份全幅已实际看过，只是生产者缩略图，未据此借用原WCS。

现 inspect-noirlab-scene.mts 成熟区域责任沿原FDS入口共用，多对象用各自已固定目录坐标/basis，真实当前 selector minOrder1/maxTiles12选6/7/6片，各实际立体视口256²中心全在名义MOC；只补7块所需边片。三个完整当前 Scene/GPU/BSC软件帧一次完成，实际绘4/1/2片、纹理4/1/2创建删除对应、退休0、GL0；真实目录投影1/0/0，拾取对象1/0/0，星帧AVAILABLE，零值未伪造恒星。181前后输入严格相等，Scene0网络，模型/原代码mesh/shader/blend未修改，普通Prepared空/HiPS关。已实际看三帧；不是WXML/DevTools/手机、容量、绝对配准或最终采用证据。[来源批次决定](../../../../output/rubin-region-batch-2026-10-08/batch-decision.json)固定全部回执与局部范围。

缓存22份原PNG统一读回均RGBA，3片有171902/175709/173742真实透明外沿，另有少量不透明RGB全黑；几何alpha、有效黑、科学支持分别保留，不抠黑或feather。这是继续完整外围/同源LOD验证的新材料，尚未完成完整原生region footprint或连续广角背景。输入绑定曾正确拒绝修改后旧task源码（0下载/未启动browser）；旧配方和3射线归档FAILED，最终配方重新绑定且3射线字节严格相等，未重加工已绘像素。一次临时alpha读回代码SyntaxError未执行/无输出，改为可读有界读回后PASS，原瓦片不变。TS5.9.3 strict task/import类型PASS（Node adapter noUncheckedIndexedAccess=false，不冒App整体类型或设备）；两task源码无尾空白/合并标记。Git diff检查退出0但它们为untracked，不冒有效diff证据。

原registry/FDS/VPHAS/MATLAS-KS4源码epoch冻结不重写；本轮只改两既有task适配器/同一来源记录，无新产品版本/脚本或E2矩阵复跑。v72、实际miniapp project.config及33账SHA原样；本地/授权真实远端e2136e…、main5cc674…不相同，不迁分支/合并。owned来源/Scene进程读回0，无新服务、外部写入、联系、提交推送或部署。独审MISSING；该原窄档阶段读回active无预算仅属历史时态，治理后实时Goal见本文末段，当前执行仅PLAN。

## 治理后继续：完整区域与实际来源（2026-10-08）

用户此前暂存阶段只保存 periphery-plan.json；本次核新治理后已同意继续，get_goal仍实际paused、无预算、未完成，工具无resume枚举，保实际状态、不重建或伪造active。新资源事实源已完整读取：raw/临时TRIAL/帧/日志沿 ignored output，运行资产按现LFS规则、源代码和license/provenance沿普通Git；原治理暂存未动。assets:verify离线2012实体/171170429B通过，不冒远端LFS往返或额度通过，未推送/部署/采购/外联。

复用两个现入口与已保存MOC/相机规则，只新取 order2 的102/108/112/113四原PNG共101785B、严格HTTPS/200/无redirect/零重试；全部原RGBA/真alpha直接读回。与缓存order7/105213组成五片311308B的本地v2 TRIAL，hardlink原字节、两索引和权利说明由实际worker root/index/tile/rights逐项读回；producer order12只声明有限max7子集，没有虚构DOI或科学支持。两精确原图CC BY4.0与HiPS ODbL/署名/加工声明各守责任。manifest/source通路只是本地有限开发结果，未采用或发布。

实际现selector/resolver及Scene一次七条件：[结果](../../../../output/rubin-region-batch-2026-10-08/periphery/current-scene/result.json)和当前153冻结输入相等。390×844/20°两完整保守区域各绘两祖先片，真实BSC投影24/46；order7原alpha边片按现PNG行列约定定位，细档使164357像素变化，受控细mesh提交失败回调保留且粗档RGBA变化0；最后纹理全部退休、GL0。原alpha/有效黑/名义MOC/科学支持仍分离，父格有限样点不是raster mask或全边界证明。关闭贡献探针与空图像的负例无credit；实际完成group绑定publication/sourceId后才产生现Source route/署名。首次任务调用遗漏显式贡献策略而断言FAILED保在 failed-no-contribution-policy/；按现Page/Scene可选策略为单source设2MiB辅助预算后再验，未改默认或影像缓存，也非物理峰证据。

四原片、两个整区和粗细边片已实际查看：完整照片漂浮外界仍有硬矩形边界，**照片外连续背景FAILED**；细档局部有作用不等于平滑完整LOD或全图质通过。没有合格 coarse-quality gate，剩余17候选片不下载，不裁边/抠黑/feather/小改色，不重渲旧三无变化细档或重试M49。原181输入只属其冻结task源码epoch；两个适配器现有意变更，不声称181当前仍相等。完整原生loader/Source Back/设备/容量/科学和绝对配准仍未验。

治理留下的 sky-canvas-time.test.ts FAILED 已独立定位为VM夹具漏现 readHipsTiles 和 latestPresentation；仅补原夹具及实时getter、姿态清除和无效输入断言，修后该文件16PASS、实际App TS5.9.3 PASS，生产Canvas/Page/render owner未改。原失败回执和两task类型修前诊断均留 ignored output，有限审查集合引用现结果，不复制产品/脚本/源树或嵌套全部旧hash。

唯一执行仍由PLAN最新画质/效率纠偏控制：粗阶边缘瓦片不能判母图或高清质量；恢复后先补已有合规高清材料的完整目标实际画质证据，外围连续背景与原生/其它电脑责任独立推进，最终联合验收。该先前纠偏暂停已结束，最新用户继续后Goal实际active、无预算、未完成；本段只保此前成果，当前执行见下段。普通Prepared空/HiPS关、Mellinger低分辨率银河DISPLAY、v72/33账和FAILED/UNKNOWN/MISSING保持，独审MISSING；所有源码/旧失败保留，无提交推送或分支迁移。


## 当前完整目标尺度与实际细节（2026-10-08继续Goal）

get_goal实际active、无预算、未完成，当前只沿PLAN。复用两原owner及已有完整2050官方参照，M8 2.4°先得390×844/780×1688真实Scene，补九order5原图2,965,994B；目录45′包围范围有边距，主体和弱结构可见，但2×偏软、照片斜边仍在。来源原片不是之前四个祖先边缘片的缩略质量。

真实几何找到可复现选档缺陷：该视角圆形cap order5有9格仅5格能绘，order6 cap有18格但实际mesh只10格。原selector现复用已有mesh footprint，仅正order排除已证空格、保未知几何/相机中心，最多额外试一细阶，原12格上限和order0/W3消费者约定保持；不按PNG alpha撤销需求。修前回归5≠6保留；初次一般化消耗W3原overfetch测试，已限定正order，最终32影响检查、实际App及task TS5.9.3通过。无缓存增容、shader/blend/像素改造或普通入口采用。

同一规则一次处理M8星云2.4°与M61星系0.4°、1×/2×四帧：前者order6/10原格、后者order8/5原格，GL0/纹理均退休、177当前输入读回相等。直接看两张2×实际图，M8细暗纹/星点更清楚，M61主体旋臂与弱外围可见；仅目录标注包围范围，不冒完整弱结构/科学支持/配准或native图质接受。既有三细档和20°整区直接复用，没有无变化重渲。

15新原入口请求有3份TLS35/无正文，原FAILED acquisition和回执保留；不是原照片图质FAILED。完整官方登记给出alaskybis镜像，属性只master/mirror角色不同；一份成功原PNG控制逐字节相等后，只补三个新缺片，原URL未重试、M49旧失败未重开。新镜像回执、唯一控制和实际来源分别绑定，不能凭元数据外推全源代次一致性。

复用现v2合同/实际worker，将15细原片及7已有粗祖先hardlink为22片11,977,994B、4索引的本地TRIAL，publicationHash `cf72854f5b88fa8c5aac98b21d8ce60ca752f2d076e29b566832541265c1fd54`。真实root/index/22 tile/rights读回通过，现resolver实际细10/5和fine index缺席时粗5/2均保已出版cell覆盖；这不是raster alpha/science认证或native decode/upload失败验收。首次rights候选误把actual mirror transport写入规范originalMaster来源字段，被原严格合同拒绝并留原JSON；只修候选数据，规范源地址和实际镜像URL/hash/原失败分开披露，未改校验或schema。

[当前细节结果](../../../../output/rubin-region-batch-2026-10-08/quality/refined/current-scene/result.json)、[正式合同与原字节读回](../../../../output/rubin-region-batch-2026-10-08/quality/refined/local-trial-readback.json)和[indexed消费者](../../../../output/rubin-region-batch-2026-10-08/quality/refined/indexed-consumer-readback.json)分别持有有限输入；旧181/153表属冻结epoch，当前selector/task已变化，不倒填仍与当前相等。照片外连续背景仍FAILED；完整弱外围、绝对配准、该新供给的已绘source/native/cache/Source Back见下方当前开发结果；目标设备/物理容量及独审仍开放。普通Prepared空/HiPS关、v72/33账和全部旧失败保持。当前唯一下一依赖只读PLAN，不再重复搜索/下载/重渲当前已证明结果。

## 当前正式来源与整页缓存/返回开发结果

复用同一Scene入口，正式22原片/4索引供给一次九条件：M8、M61粗/暖细/细提交失败/空，以及贡献策略关闭。真实已绘source credit匹配精确publication/source；细提交失败时完整RGBA与各自粗基线差0，空/探针关无credit，GL0/纹理全退休。原四幅1×/2×图质帧没有重渲；177输入属于冻结图质epoch，task适配器后续扩展不冒仍全与当前相等。见[正式Scene结果](../../../../output/rubin-region-batch-2026-10-08/quality/refined/published-scene/result.json)。

随后复用已有完整Taro构建/整页runner，以原公共Map入口、搜索定位、Canvas手势、来源route/Back完成M8 4.8°↔2.4°和M61 0.8°↔0.4°同场批次。原523前端/176后端、91实际读取资产及有限task/current baseline前后字节一致；139请求、88已绘Scene。两Source Back完整RGBA严格差0，每个Back完成帧有精确源，新增光学binary body0；真实browser WebGL→2D已显示字节与GL严格一致。最终原Sky Back回Map，owner/decoded/GPU均退休，唯一离屏与2D backing尺寸0、AppHide监听0。见[整页结果](../../../../output/playwright/rubin-complete-target-native-current/result.json)和[有限资源读回](../../../../output/playwright/rubin-complete-target-native-current/native-surface-readback.json)。

四个旧task夹具/执行epoch失败均保留：当前Hook不再含旧可选时序探针文本、tsx误用根配置、controlled port漏onAppHide/实际2D入口、旧测试只认SoftButton ariaLabel而当前原Button使用aria-label。仅修现task平台适配和实际Button选择，产品源码未为这些失败修改；原bundle逐字节复用，最终同两目标通过。它是受控平台端口的真实当前Taro/HTTP/cache/原生命周期、实际浏览器GL/2D开发证据；样式未合成，不能覆盖真实微信WXML/控件FAILED、手机/物理峰、完整商用公开链或独审MISSING。照片外连续背景FAILED、完整弱外围/绝对配准/科学UNKNOWN、普通空/关/v72/33账均保持。唯一下一只读PLAN。

## 同区域PS1外围背景代表：原成品失败

复用原已核具体PS1授予/主站/clonableOnce/ODbL消费者与95,040B原MOC，唯一批处理只加固定JPEG preset与可指定目录子集，不另造投影/下载/版本脚本。两对象四预定档一次名义筛查均全内；首次选错旧Python缺Lupton入口，另两现成环境无Astropy，零图像请求的失败保留；找到本工作区已有固定Python3.12.14/Astropy8.0.1/Pillow12.3.0/numpy2.5.3环境复用，零安装、零产品改动。

只取M8 4°/order4四原JPEG，共748,941B，HTTPS200、无redirect、零重试，完整RGB/512与hash读回。现TAN/HEALPix采样原RGB预览alphaZero0/opaqueBlack11，黑不作缺测。实际看整幅和原1805/1806/1807：M8/M20核心强绿紫结构在原1805直接存在，原1807另有硬绿菱形块。当前同区域外围背景配置**FAILED_REPRESENTATIVE_M8_WIDE_SOURCE_COLOUR_RINGS_AND_BLOCK**，停止其细档/其它对象/Scene/出版扩批及无变化加工；其余三个预定档NOT_ASSESSED，不全局否决PS1或改判旧NGC891合格局部。原图不修色、抠黑、删星或羽化。见[有限原供给与决定](../../../../output/ps1-region-batch-2026-10-08/batch-decision.json)。

本轮没有使用Rubin原照片以外的伪造背景，照片外连续背景仍FAILED；正式图像已绘消费者及真实微信/设备/物理/独审各守原范围。后续只按PLAN补能改变缺口的明确新权益或输入，停止同机制盲试。

## 精确权益与原生产者坐标元数据后查

DECaPS2具体CDS色成品已有ODbL/NOIRLab身份；本次有限官方发行/平台条款及历史NOAO数据手册查询，没有获得足以改变原内容/加工分发缺口的新grant。直接作者页timeout、官方PDF返回验证HTML保UNKNOWN，不冒当前PDF已读；零MOC/图像请求，旧Legacy自制CC BY4与NGC3532 FAILED不改判。见[本次权益读回](../../../../output/optical-hips-registry-research-2026-10-08/decaps2-rights-followup-decision.json)。

原Rubin两缓存生产者HTML没有AVM/WCS字段，已有无query的GCS公开原TIFF地址。Virgo主文件HEAD200/Accept-Ranges及固定ETag/generation成立后，仅读64B头、408B目录余段和26,089B XMP，共26,561B；全部206/Content-Range/同ETag/准确长度，原文件15,142,805,372B未下载。BigTIFF顶目录22项，原XMP是合法XML但没有AVM/WCS映射；这不是所有EXIF/IPTC/IFD都无坐标，也不把已有2050预览变成WCS。Nebula HEAD连接失败UNKNOWN，未请求body或重试。见[有界原元数据读回](../../../../output/rubin-region-batch-2026-10-08/quality/refined/producer-metadata/decision.json)。该补查不能关闭绝对配准；后续只按PLAN对现清晰素材与真实固定目录做有界坐标诊断，不拟合/shift原照片。

## 缓存目录坐标诊断与透明PNG档位边缘

复用原BSC/SAO raw、现已绘M8目录参照、HEALPix和已有固定半径正残差矩，一次46行缓存坐标诊断；40行可测，4行原透明外沿、2行格边跳过，M61当前亮星目录无参照。原像素中位0.630px、p95 2.330px；翻转反例38行中位1.566px且也能给合理矩，不能用这批结果反调阈值或宣布绝对配准。零图像请求/shift/PSF/新源加工；[原读回](../../../../output/rubin-region-batch-2026-10-08/quality/refined/coordinate-diagnostic/result.json)保source epoch与科学UNKNOWN。

新同源alpha机制只新增两个fine-only帧，与冻结parent＋fine完整RGBA比较：218项渲染/数据输入相等，两task适配器的独立出处变化明示；第一次旧Python配方绑定拒绝发生在浏览器启动前并保FAILED，不改旧SHA冒当前代码。M61像素差0；M8差709，708处原细格CPU插值alpha为零/部分，1处CPU认为不透明但红通道差1仍未解释；不把CPU浮点采样冒GPU认证或全部差异已闭合。主体细节不变，真实照片外背景FAILED不变。

复用同一runner的现24位默认深度缓冲，四个最小image-only反事实帧已证明几何优先：细格成功严格等fine-only，细格全部失败严格等原粗格，均0像素差、GL0、纹理创建/释放相等、逐mesh恢复depth state，无新增image/FBO或源像素修改。[读回](../../../../output/rubin-region-batch-2026-10-08/quality/refined/fine-depth-scene/result.json)不作采用：现贡献owner明确拒绝DEPTH_TEST绘制，因此本对照显式关闭探针、credit为null，不冒正式来源/跨源/部分失败/native通过。下一实现依赖必须同时解决来源贡献、原显式预算和资源恢复，不可仅排序细格或关闭探针接入产品。当前task TS5.9.3通过；长期Node REPL类型检查堆耗尽属诊断运行FAILED，后用短进程完成检查。原四画质帧/九正式条件/native矩阵未重跑。

来源接线预检沿现owner完成：直接depth绘制会让afterDraw/credit UNKNOWN；分别给旧entry挂depth也无法代表新来源的遮挡，因此不能这样局部补丁。单source-group工作RGBA与贡献必须共用owner/target，经完成后整体source-over进入Scene。现stride4下390×844的RGBA＋depth16＋归约逻辑2,063,400B可落原2MiB；780×1688为8,251,304B、原2MiB不满足，双全幅target亦不满足。只是有界存储算术，未新增GPU分配，不冒物理资源或平台能力通过。后续唯一实现依赖见PLAN；不自动增预算或采用。

## 当前暂停点：同源PNG几何优先接线（2026-10-08）

用户明确暂停开发并要求保存状态，Goal实际paused、无预算、未完成。当前代码/原图与所有未提交和FAILED/UNKNOWN/MISSING原位保留；下文仅记录已经完成的开发，不授权继续。有限代码/结果绑定、原失败路径和恢复依赖在同名JSON的`pausedCheckpoint`；唯一执行顺序仍在PLAN。

原Scene/GPU/贡献owner现在以一份工作RGBA＋depth做同源细→粗几何优先，完成后整体source-over，复用工作目标A通道测实际来源参与；未引入双全幅信号、修改原像素或扩大默认预算。8原图条件通过细成功、局部/全细失败、预算拒绝、深度分配失败和最终退休；全细失败保粗，拒绝严格等原独立画面。首次预算拒绝重复组尝试FAILED保于`quality/refined/failed-grouped-policy-repetition`，修为每组一次；旧receipt路径需按JSON locator前缀映射到该目录，不改冻结字节。12实际WebGL控制证明有效黑、透明细格、跨源遮挡、原RGBA目标加depth/暖复用、resize和显式恢复，纹理/FBO/depth/program/buffer全退；context-loss是显式受控flag，不冒原生丢失。部分失败差异均在失败细格Float32投影的保守像素范围内。M8完整细图对fine-only差201像素/max1，200个已有CPU样本为部分alpha、1个未在缓存样本内仍未核；旧opaque采样争议不抹除。

当前完整Taro、真实本地HTTP/cache/来源Back沿原runner已复跑受影响范围：523前端输入、139请求/88呈现、M8/M61两个Back完整RGBA严格相同、额外光学body0；真实GL→2D字节一致，退出backing/监听/owner退休，自建浏览器/API已关闭。该端口使用既有显式4MiB/two-group、DPR1政策，不是真微信WXML/设备/物理验收。

DPR2的780×1688原2MiB政策已实际拒绝，零辅助分配、独立完整RGBA不变、credit UNKNOWN，无fault，仍不能供新LOD正常结果；已有显式8MiB图质任务政策下两原图帧通过（M8差816像素/max1，M61差0、来源与退休成立），不授权生产增预算或证明物理容量。当前app严格TS5.9.3及20影响检查通过；taskTS只在89433B适配器epoch通过，后续DPR/scale补充尚未重新类型检查，最新源码有限绑定已保存。恢复后先按PLAN补这一类型/高DPR资源约束，不重渲无变化证明。普通Prepared空/HiPS关/v72、背景FAILED/绝对配准未验/科学UNKNOWN、P1控件FAILED/设备物理未验/独审MISSING和33项全保留。
