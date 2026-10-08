# Prepared影像：当前来源、覆盖与成本

更新于2026-10-06；替代本文件旧的累积进度摘要。这里记录库存和资格，不设对象数量、照片边界或像素上限。唯一执行顺序见[PLAN](../PLAN.md)，各代完整输出见下方证据；旧失败不因新输入或新版本自动升级。普通Prepared registry仍空。

## 已有真实输入与输出

|对象/层|可复用输入与语义|范围和有效细节|产物/状态|
|---|---|---|---|
|M51 Hubble heic0506a|4000×2776 JPEG，4,060,187B；保存XMP/政策，坐标约5″不确定性|约9.56×6.64′；旧2048²母图目标网格OV几何支持约34%、MEDIUM96.7%、DETAIL100%|旧三PNG 1,315,239B；矩形/背景接缝FAILED，完整外围及绝对配准未过|
|M82 Hubble heic0604a|4000×3116 JPEG，9,657,945B；历史B/V/H-alpha/I合成、sRGB ICC未知|参考9500×7400、TAN旋转50.1°，约7.91×6.17′；目标OV13.653′中几何支持26.134%/83.555%/100%|旧v1三PNG 1,152,395B；v2 512/1024/1024三PNG合4,357,051B；局部清晰度有改善，完整图质/边界/配准/运行连续性仍未过|
|M82 NOIRLab noao-m81m82|4000×2233/8315×4642 JPEG，1,163,247/9,250,383B；Mosaic I历史B/V/R/I/H-alpha|约58.87×32.87′；当前13.653′网格三档几何支持100%；512细档分别约232/482源像素；科学/实际PSF未知|4k raw/display三PNG 848,405/851,488B；大源1,213,030/1,208,058B。背景改善但主体软、颗粒明显，跨源颜色/结构不同；不作Hubble同母父层|
|M51 NOIRLab noao1309a|4000×3725 JPEG，1,162,674B；ODI历史蓝/绿/红，具体滤镜名未知|约33.22×30.98′；当前网格三档几何支持100%；细档约411源像素跨512输出|三PNG 1,151,313B；矩形/接缝FAILED，北晕/拼接不能当blank sky|
|M51/M63/M64 SDSS|已存各三层ImgCutout JPEG，分别64,352/57,894/49,114B|各OV/MEDIUM/DETAIL视野0.2275556°/0.1137778°/0.0568889°|保现有正式路径与各自限制；不是Prepared采用|
|NGC6752 ESO eso1323a密星区域|一次publication JPEG4000×3904/6,815,112B；原XMP/CC BY 4.0/ESO/sRGB，历史V-yellow/B-cyan|约32.60×31.82′名义TAN，全幅弱星/核心/光晕保持；绝对配准/science UNKNOWN，不认证完整星团边界|512×500/1024×999/2048×1999三JPEG2,664,164B；实际page/source Back/退休开发通过，矩形/密星断边FAILED退出、普通枚举0，见[决定](q1-ngc6752-prepared-decision-2026-10-06.md)|
|NGC891 NOIRLab iotw2023a完整星系区域|缓存4000×3154/3,570,760B，原XMP/完整credit/CC BY4.0/sRGB，历史U/B/R/H-alpha|约18.23×14.38′名义TAN，全照片/弱结构/星点保留；绝对/science/完整外围未验|512×404/1024×807/2048×1615三JPEG1,293,708B，现page/source Back/退休开发通过；矩形/星密度断层FAILED退出、普通0，未作正式导出，见[决定](q1-q2-ngc891-native-consumer-decision-2026-10-06.md)|
|M87匹配Legacy DR10 grz条件区域|新原JPEG59,253B/g FITS1,054,080B；原DETAIL复用、128/256降档，三图90,368B|名义中心与现M87 OV一致、宽13.653′；独立region/无RGBscience/绝对配准|实际三档/source Back/退休开发通过；明显矩形/亮星彩色饱和伪影FAILED退出，普通registry空，见[M87匹配小样/退出决定](q1-q2-m87-matched-region-decision-2026-10-05.md)|
|M81/M82/M87 SDSS|各三JPEG，48,611/62,314/53,959B|M81视野0.4551111°/0.2275556°/0.0568889°；另两同上|M82旧SCI/display条带/颗粒失败保留；替代库存尚未合格|
|广角2MASS|2048×1024历史近红外银河图，703,555B|保旧metadata/image URL和J/H/K语义，不是当前光学默认或全天高清|RGBA等效8,388,608B，版本/来源headers原样保留|
|广角Mellinger光学银河|固定随包原PNG2048×1024，1,003,398B；指定署名grant、名义J2000|已选低分辨率DISPLAY，不补一般区域/目标外围；producer/science UNKNOWN、绝对配准未验|普通owner/新发现入口与原page/static开发增量通过，target质量/运行时/生产未验；详[决定](q2-optical-milky-way-display-decision-2026-10-05.md)|
|广角W3|12张512² order0 JPEG合678,144B；另有51个目标切片|历史12μm红外低阶背景；不补光学全天缺口|12张逻辑RGBA合12MiB，非同时物理驻留值；51不是目标数上限|

上述支持率只是目标母网格中的离散几何支持，不是科学有效性、完整星系比例或安全可展示边界。4k照片的采样周界名义上界（M82约15.489′、M51约25.142′）也不作为图质/科学范围。弱外围、星点、喷流和尘埃不能为去矩形而直接扣除。

当前v2 hash为`69e8425904e3288624c9f77a1339574c3868f4a37540c2a5258f1942474e9d5a`，严格父v1为`c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c`。复用同源宽2048母图及独立1024细网格，不是完整4096同母。三PNG依次135,683/1,886,809/2,334,559B；v1+v2六PNG合5,509,446B，当前标准静态bundle逻辑86,075,579B。它们不是全机库存/流量/物理峰，也不是普通registry批准。

## 新候选：先作适用性决定

|候选|本次审查后要解决的实际问题|采用前缺口|
|---|---|---|
|ESO eso0932a公开6000×3000|广角可见光候选已缓存/查看；复用6k，不取受限800MP原作|现Galactic直接UV小样未配准，不采用；历史行星/真实Scene、接缝极区及完整credit仍保；详[Q1决定](q1-real-candidate-decision-2026-10-05.md)|
|Legacy DR10 observed / DR9 north、SDSS|有真实覆盖的区域和目标外围；cutout512限制不等于项目最高档|按正式产品路线选一个真实区域；有效波段、缺测、颜色/配准、外围、网络/加工/出版资格。M51/M104旧失败保持|
|Hubble/NOIRLab/ESO具体目标成品|高细节目标与同源外围，扩展合格覆盖|逐具体产品核权/观测含义及边界；优先复用缓存，缺口成立才取新源；不先全量批下载|
|PS1/SkyMapper及CDS派生HiPS|可能的更广光学覆盖或区域来源|原内容权利、服务获取、实际加工/分发和数据库义务分别闭合；不因non-transferable/ODbL误解直接排除，也不据开放元数据直接采用|
|真实NGC253＋Legacy Virgo小区域|原全幅8285×7510 JPEG/AVM与细0.8arcsec/pixel区域/g FITS推动独立object/region及原生矩形TAN合同|E1真实HTTP/cache/Hook/Scene/source Back有开发范围；普通registry空，完整图质/有效性/绝对配准/发布与目标验收未过，不能外推全库或一般区域|


具体官方页面、权利纠偏及审查范围见[2026-10-05归并](pro-review-reconciliation-2026-10-05.md)与[外部能力owner](../../../../project_context/external-capabilities.md)。代表性组合还须包含紧凑目标、弱外围、弥散结构、密星和缺边情况，可以由同一资源承担多个类型；样本不是永久范围上限。同类批量加工/审核负担应随共享链成熟下降，不能逐天体手工修图。

## 权利与显示事实

M82 Hubble的[具体图片页](https://esahubble.org/images/heic0604a/)、[政策](https://esahubble.org/copyright/)、原JPEG/XMP和请求回执已保存在`output/hubble-m82-prepared-source-1004-r1/`，不重复下载。完整credit：NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain (STScI) and P. Puxley (NSF).

原核查为具体CC BY 4.0产品及清楚关联的完整署名/许可链接/修改披露/不背书要求，不扩展至所有机构资源。B/V/H-alpha/I出版配色为蓝/绿/红/红，不是SDSS gri、实时肉眼颜色或定标流量；2006-04-24发布时间不能代替曝光时刻。AVM“Full”不等于独立配准通过。NOIRLab宽图继续绑定已有具体图片政策和原观测来源，不将网页DSS2查看器混入其源链。

背景估计/显示alpha、原几何支持、科学UNKNOWN和最终实际来源参与分别保有。ICC只约束该输入编码色域，不证明不同源颜色可互换；保raw/display/v2处理身份和兼容父版本。需要新混合时分别处理同源LOD、照片边界、跨源颜色三类问题。

## 成本核算与证据边界

- 客户端按需接收出版档，不默认接收9.66MB原JPEG或全6k纹理。当前512档逻辑RGBA1MiB，1024档4MiB，两1024 wanted为8MiB；2MiB非当前保留只是当前压力配置。R1已沿原owner保护一个ready备用项并保同帧失败回退，光学源RGBA等效9→5→9MiB；整场物理峰及设备仍未验，不为守旧数字允许空档，也不扩为通用缓存框架。
- 压缩传输、文件保留/租约、解码/native、GPU及上传/copy暂峰各记本身；逐层MAX不能相加冒同帧物理峰。PNG/JPEG、直接原生TAN采样与重采样均先在同一冻结输入作质量/字节/decode/upload对比；WebP另需真实WEAPP证据。
- 旧M82原JPEG和旧v1三PNG在12Mbps独占载荷下的理论下界约6.44/0.77秒，只是旧输入算例，不能套给v2或当实测等待。200DAU是全小程序，不是200并发；命中、访问、细化比例和重试需实测。10/20冷进入是初始突发场景，不是并发上限。
- 生产预期4核16GB、12Mbps、2000GB/月、180GB SSD；测试4GB。源与中间产物尽量留离线加工环境，生产核当前/兼容/回滚/暂存、镜像、DB、日志、备份与余量。E2复用sealed链保12图本地真实HTTPS/46请求核算，选定Windows链本机报告分配已有范围；这些不代真实云端/current/回滚/Sky备份/引用全集、Linux全盘或200DAU容量。已有静态/retention owner不重做。
- 已有NOIRLab大源六组离线输出逻辑144,447,521B、其中Float64背景NPZ79,513,803B只是历史开发产物；不是生产库存或RSS。旧21.652秒全试验/21.469秒CPU也不外推批量工时。现金、Agent/维护投入、机器时间、用户等待分列；批量异常率、库存最高档、混合容量和完整成本仍未知。
- 不新增无证据付费设施，不因单图免许可费填零总成本。现有原始SCI/噪声研究保留作为明确成品缺口的补充；不是默认重启路径。

## 可直接复用的证据入口

- [当前v2完整出版/实际消费者](experience-prepared-progressive-publication-2026-10-05.md)：版本、静态文件、实际page组合、同源档与暖过渡缺口。
- [当前未改loader缺口复现](prepared-transition-reproduction-2026-10-05.json)：换档先退休；只证明受控loader原因，不是所有source-null帧的完整根因。
- [M82 Hubble首代覆盖](experience-hubble-m82-prepared-2026-10-04.md)、[实际page组合](experience-prepared-m82-page-combination-2026-10-04.md)。
- [NOIRLab原宽图](experience-noirlab-prepared-wide-2026-10-04.md)、[大原源细节](experience-noirlab-m82-large-detail-2026-10-04.md)、[显示处理身份](experience-prepared-display-identity-2026-10-04.md)、[组合/迟到](experience-prepared-display-combinations-2026-10-04.md)。
- [实际对应点/线性光结果](experience-prepared-wide-compatibility-2026-10-04.md)、[完整照片与背景](experience-prepared-native-extent-and-background-2026-10-04.md)：不重复无变化重加工或闭合旧矩阵。
- 实际冻结源/产物目录、watch/服务状态、脚本及当前失败的完整导航见[CONTINUE](../CONTINUE-CLOUD-SKY.md)。源、开发验证、目标运行时、最终验收继续分开。

具体随包光学银河已采用低分辨率DISPLAY并接普通开发消费者，详[角色/版本兼容](q2-optical-milky-way-display-decision-2026-10-05.md)。原TRIAL和普通r1协议保原时态，当前新版/旧2MASS发现4HTTPS和标准enum两文件1,706,953B封存复用原1741 mount；不重复制全包。原条件delta+combined88,307,902B、普通r1额外89,311,300B均只是本机logical payload复制，当前新两文件另计，物理分配/去重未重测。一般区域/外围、全图重复/配准/完整图质、设备与生产资格仍缺，Prepared registry空。

## 2026-10-06有限照片合成责任更正

[NGC6752实际Scene合成边界/决定](q2-ngc6752-composition-decision-2026-10-06.md)：native原alpha可用不等于显示不透明；当前最大通道编码RGB贡献在实际1.34°Scene（galactic未绘）与线性光对照仍有完整矩形/密星断边。仅色彩路径退出，普通Prepared仍空。原星点/弱结构完整、source科学UNKNOWN保持。RGB临时copy987480组件B/1316640 RGBA等效B、各1创建删除，仅任务软件模型，无新母图/源下载/产品缓存或生产资源结论。更广可交付区域成品继续按PLAN最小小样，不以全库/PSF或旧SIAP核对替代。

## 2026-10-06具体PS1官方成品/相邻供给

[PS1 NGC884成品/相邻供给决定](q1-ps1-ngc884-finished-and-supply-decision-2026-10-06.md)：一个真实NGC884默认25′彩色cutout配置因35%顶部空白/星点伪影退出，不是PS1全面排除，也不统计成全库异常率。官方已处理stack公开显示授予与第三方CDS分开；北邻小i/权重和原mask保零有新实际供给，父同TAN整数5831px偏移但frame标签差异未解释。源端11次请求/10个200 body共1,058,066B；没有全CCD/全库、新出版资产或普通采用。400 body/机器物理峰/未来离线处理及生产费用未知，不填0；原缓存和六项业务保持，下一只按PLAN。

## 2026-10-06 PS1已处理邻片的实际小路径成本/退出

[PS1原格接缝/名义坐标与退出决定](q1-ps1-ngc884-native-seam-decision-2026-10-06.md)：新增2个206原头前缀131,072B与18个200原格小FITS38,188,800B（20请求38,319,872B），串行供给约51.094s；前阶段11请求/10个200共1,058,066B另计。现成熟库名义frame/原格选择闭合，不做重投影/PSF；一次单位错配纠正未消除1,232缺测及亮星洞，当前完整显示退出、合格覆盖扩大0。离线原格进程PeakWorkingSet181,514,240B/PeakPagefileUsage537,640,960B，显示纠正进程130,850,816B/488,333,312B，各自含库；非同时峰/整机/端上/生产容量。输入6科学/6权重/6mask只供应一份2.13′×4.27′接缝，不能外推全NGC884/全天质量、总费用或异常率。普通Prepared空，原服务/闭合矩阵/源图不重取，独立P1下一由PLAN拥有。

## 2026-10-06独立P1诊断与Q1新输入边界

[P1控制协议读回/决定](p1-control-protocol-decision-2026-10-06.md)：只读原安装/路径/监听及两个控制协议请求，heartbeat body96B、初始化四秒未得响应；不当截图/SDK/产品通过，服务端未确认取消。不重取已失败亮星团或加工旧照片；固定原表NGC0891 G型、13.03′×3.03′只是下一候选身份，不是外围裁框/覆盖上限或零异常保证；尚无新图/出版或普通Prepared采用，离线/生产机器与费用没有新增通过结论。

## 2026-10-06 NGC891供给与完整成品条件决定

[NGC891成品供给/下一消费决定](q1-ngc891-source-route-decision-2026-10-06.md)：PS1已发现两父片各缺已知目标一端，8请求/68,593B，未取彩图，供给退出而图质未验。NOIRLab同目标完整JPEG一次取得3,570,760B，原AVM/ICC与完整信用保留，现读取器无产品修改直接接受；目录范围名义余量充分，全幅观察仅支持一次实际page/Scene条件小样，未认证完整外围/目录重复/发布、普通采用或目标runtime。R1任务调用错误及失败R2启动日志保原，R2只用缓存补必需限额。 原源/全幅/名义读回与实际Scene资格分开，完整U/B/R/H-alpha成品未当PS1通带或校准RGB。一次JPEG保存量与8次PS1完成body分别计，Browser页面/协议费用未抓取，不冒计费、加工峰或可运营容量；没有新source bulk、产品采用或出版。

## 2026-10-06 NGC891实际成品消费退出

[NGC891实际page/Scene退出决定](q1-q2-ngc891-native-consumer-decision-2026-10-06.md)：原缓存JPEG/XMP/ICC沿现native whole-source producer，三档512×404/1024×807/2048×1615共1,293,708B；49名义方向/现plane、515/173输入原样、98 loopback/61 Scene，7暖帧null0/回细与source Back像素差0/退出活动资源0。实际概览明显照片矩形/密星断边FAILED，配置退出、普通枚举0，正式静态导出未开始。较暗延展源不补一般背景；三捕获帧照片内目录对象0只限局部、不闭合一般重复。源像素/20产品pins/原WEAPP未动、外网取图/SDK0，软件模型不冒设备/物理容量。 此次新外网源body为0，三图仅loopback1293708B，原源/JPEG总字节与本机模型不冒计费、物理内存或容量。整幅照片同类失败不再靠逐图重复修色处理；连贯区域成品具体供给/权益/几何核验是新的依赖，不代表已采用HiPS或建设巡天框架。

## 2026-10-06 PS1具体连贯HiPS内部子集

[PS1连贯HiPS源小样/现出版消费者决定](q1-ps1-contiguous-hips-source-decision-2026-10-06.md)：具体主站properties与旧缓存一致；一次12个200/1,364,424B，11原512 JPEG共1,360,243B，成熟HEALPix采样半度预览无明显照片矩形/密星断边，仅内部条件候选。原HiPS清单/索引/15真实loopback/缺tile与错hash404/production拒绝、名义mesh已读回；0.15/0.3°cell完整，0.45°缺38579、0.8°无order6，不冒已绘/科学有效。原JPEG/20产品pins/515与173输入/原服务/WEAPP保原，无新page/Scene/SDK或正式静态出口；普通Prepared空，商业公开内容与完整消费者未验。 原源JPEG1,360,243B；源端完成body1,364,424B与loopback影像body1,360,243B分别计，本地原tile复制不是第二次外网下载。当前ordinary合格覆盖扩大0；有限源预览只支持下一native消费者，不是全库异常率/绝对配准或运营容量。0.45°缺一参考单元与0.8°所需粗层缺失原样记录，不能靠缓存/限FOV解供给；无逐图PSF、科学重加工、alpha或公开出口。

## 2026-10-06 PS1实际HiPS消费者小样（不关闭整项）

[PS1实际page/Scene决定](q1-q2-ps1-hips-native-consumer-decision-2026-10-06.md)：r1文件名适配器/r2列表脚本失败保原，r3当前完整page 115请求/79帧，8暖帧null0/严格像素0/暖body0，hide/show/最终退休通过；0.45°可见细cell全有，0.8°名义可见17,279中心缺源且无所需粗层。来源同帧/独立Back与权利链接缺，仍未采用；无新产品/WEAPP/SDK，整场物理峰/最终验收未通过。 原33行/旧时态保留。

## 2026-10-06 PS1原粗层与同源LOD失败（不关闭整项）

[PS1九原粗层/实际同源LOD决定](q1-q2-ps1-hips-coarse-decision-2026-10-06.md)：原供给补0.8°，137请求/98帧/9暖null0/像素0/暖新增1body、细503保粗/重试/hide-show/退休开发通过；同相机细图+parent使304,918像素改变，粗细0.8 over合成FAILED先修。无产品/缓存扩展/WEAPP/SDK，普通Prepared空/HiPS关，完整消费者与验收保未完成。 九原粗JPEG1,331,625B+原细1,360,243B=2,691,868B，暖body1/生命周期14分开；GPU纹理模型14,680,064B/source RGBA17,367,040B峰不同时间不相加，物理容量未验。

## 2026-10-06 PS1同源LOD修复与剩余逐帧失败（不关闭整项）

[PS1同源LOD修复/逐帧失败](q1-q2-ps1-hips-lod-decision-r2-2026-10-06.md)：细图父贡献0像素差、负控65/恢复0、25检查及类型通过；实际115帧/156请求，71候选完成帧揭露暖wide局部洞约238.3ms/GPU重试整Canvas空窗/失败细线，仍FAILED，下一先修原交接与共享网格边界。暖像素5/max2/body5保原；普通Prepared空/HiPS关，完整消费者与33项未完成。

## 2026-10-06 PS1原alpha、局部重试与有界保留（不关闭整项）

[PS1原alpha/局部重试/实测保留](q1-q2-ps1-hips-handoff-decision-2026-10-06.md)：原alpha替代UV裁父，24检查及类型通过；当前114 Scene/140请求，9暖帧与3 GPU重试帧名义coverage齐，暖像素/新body0，Canvas/粗层身份保留。16/20MiB比较后仅光学source保留20MiB，旧细黑线未再见；冷/show/新wide仍11全null/19未齐，粗细失败边界/完整图质未过。下一补已绘来源/权益record/独立route Back/标准发布；普通Prepared空/HiPS关，完整33项仍未完成。

## 2026-10-06 HiPS完成帧来源与独立Back（不关闭整项）

[HiPS完成帧来源/独立Back](q1-e1-ps1-hips-source-consumers-2026-10-06.md)：原Scene成功提交→生命周期接受→同代caption/精确版本Sources，原图/HiPS许可分开、完整record/DOI/原notice保；19检查及固定TS5.9双类型通过。当前518/173输入，119请求/64 Scene、16来源帧43真实提交；既有自动重试耗尽后公开重试、四链接复制/Back像素0/退出退休。普通Prepared空/HiPS关，商业发布/完整图质/局部可见贡献/runtime/33项仍未过；下一标准静态出版实际消费者。
