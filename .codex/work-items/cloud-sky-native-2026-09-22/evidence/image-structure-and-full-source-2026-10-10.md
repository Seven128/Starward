# 紧致结构、整幅原图与来源恢复

当前Goal active、无预算、未完成。仅指定worktree/branch；PLAN未变，无提交、推送、部署或普通采用。本记录承接[前批次](image-increment-and-blackpoint-2026-10-10.md)，不覆盖旧证据。

## M104真实误删与一次集中恢复

新问题来自[ESO原说明](https://www.eso.org/public/images/sombrero/)中的光晕球状星团，而不是再次调SXT参数。[SXT官方用法](https://www.rc-astro.com/starxterminator-usage-notes/)说明少量非恒星小结构也可能被去掉。采用[Bridges等2007光谱分类](https://arxiv.org/abs/astro-ph/0611896)、VizieR `J/ApJ/658/980` table2/table3作本地质量参考，不作为产品目录或取得其商业再分发资格。

根目录 `output/eso-image-compact-structure-review-2026-10-10-r1/` 的input保存问题、方法、退出条件和全部URL。两个原VOTable各108行，分别29182B/19834B，SHA `29f8d761326bee2b7d697b14904b066ecd02b8e3b73cd88dbedfc4ff29803e22` / `7b79e8dadb72fe067880d66e3d4cfc4afe8d0267ac53501707d83ae001bf2f47`。重用既有M104原图、SXT/星层及fit-r3 TAN，不新拟合、质心、重采样或模型调用。按原点0与top-first转换投影；保全部表行，缺RZ编号不以行号伪造天体ID。

先按预定星等顺序查看6个最亮确认成员和4个前景控制，六个目标均清楚移进星层。随后看完全幅内可取完整41像素窗口的78个成员和7个前景点，共15张集中联系表。明亮成员误删明确，较暗高背景点的逐点可见性有界，不声称每个弱点单独达到科学显著性。`all-classified-review/result.json` 114781B，SHA `f4a976874371df734cafa4b10476dd429c0dddf3d86fd34c1aab171dc3e1ab49`。

旧SXT FILE_PASS保留历史，新`corrected-file-review/review.json`判NEEDS_REPAIR，39944B，SHA `44ff21970a62b0f1c245623e6ac663a3c651665941db54dae66c4bb923fb20c9`。旧背景/注册候选仍使用误删像素，新superseding-candidate-decisions明确记录FAILED；实现变化导致库存STALE时仍保recorded FAILED，不能借失效隐藏质量错误。

一次既有PS批次恢复78个已分类位置的小支持，通常半径6原像素，RZ2449/RZ2129拥挤处半径4，羽化1。实际重开PSD：3层、1alpha、原尺寸1870x1815、可编辑蒙版，前后文档0。2822核心像素与原图精确相等，3373296外部像素与SXT精确相等，6287像素改变，羽化量化差0。host/application 5.233s，Photoshop wall3.522s，100ms采样RSS峰1097531392B为含应用基线的下界，GPU UNKNOWN。

- `restored/result.json` 15370B，SHA `fb0944b12c1bc91c41059f9d2acbeabf0e5995094792cb22afe9fed3b386abb2`。
- 恢复PNG 4224316B，SHA `c7b25aa31fd637f9be9892e3ca3179b9d3bcd0f0267dbaaf1f51d296154056d9`；PSD40914398B，SHA `974378f190f18f76779f4e515ef4f3c0697044020864be9400b7410ab5c4ff2c`。
- 全部85个四路对照、整图及原/修复ROI均看过，成员恢复、七前景控制未带回，未见明显圆形纹理岛；RZ2129邻近亮点仍去除。很小的旧review ROI标题挤在一起，实际点细节由完整四路面板复核，不把标题可读性当图质证据。
- `restored-classified-review/result.json` 115544B，SHA `50bb257c5d412813ed4fe5a8b4e48224b71666926ffe2f81fb5d84d4a025e123`。
- 最终 `restored-file-review/review.json` 30112B，SHA `ddea0d26af53981f322b17636eb6a7b4f36cc4795320439d8ed5dabc8de210b3`，仍NEEDS_REPAIR：参考表不完整，未分类光晕点的去除不能认证。局部恢复确有收益，但未做新的背景/LOD/Scene，不重复这一批PS或SXT。

`review-image-catalogue-structures.py`是声明化有界诊断，支持原/处理/星层和可选恢复图，表与图、已有位置测量及执行快照均绑定；不是成员分类器、自动蒙版或新producer。有限修复不能被升级成全场完整性。

## 第四批与完整原图路径

`output/eso-image-supply-2026-10-10-increment-r4/`新增[ESO NGC2899](https://www.eso.org/public/images/eso2012a/)与[ESO NGC7009](https://www.eso.org/public/images/eso1731a/)，原JPEG合1021495B，1720x1730与735x746；保原页/XMP/ICC/政策。只用观测图，排除其DSS周边图、示意或三维艺术版本。

原图先看，按机制分流而非统一套去星：NGC2899走一次SXT，2975600像素、3.556s，50ms采样进程树RSS595505152B下界，GPU UNKNOWN；5幅原/无星/星层对照已看。双瓣和内蓝/红缘大体保住，场中弱彩残与边缘衍射残留、中心系统点身份仍未闭，NEEDS_REPAIR，无猜测PS蒙版或无变化模型重跑。`processed/result.json` 8405B SHA `f44e900dc3fabd9042fe1fb880f360907d932c54c299fe7e6999d4cb21444bd8`；`reviewed/review.json` 16537B SHA `c2060ddade05c9f5c3d42a40a18cc2c304012076d14a3d7ecc55a5be308e8c6d`。

NGC7009原图主要是中心星、壳层、ansae与蓝色外围，没有明显需要去除的前景场星；不调用SXT/NXT/PS、不扣背景、不增加alpha或抠黑。沿现whole-source publisher生成184/368/735宽三档PNG，region身份不虚构当前OpenNGC成员。最细档与原JPEG解码RGB零通道差、ICC相同；原图548310像素中298139为有效全黑，不是缺测。原图和三档全看，弱蓝晕、亮结和中心星均在。

候选 `output/eso-image-full-source-candidates-2026-10-10-r1/ngc7009/`，publication `3afb1bcf130b043f611ee83c190b117fc589e66ee1264ee9fb3630a568e7c9fd`。DETAIL225595B/medium80100B/overview27171B，三档332866B；manifest文件5738B SHA `68b26a5a15841d65bc12845c9cf8274eb9f66669f8e7551eb889c9d44ba974dd`。首次输出目录与输入父目录重叠，被既有守卫拒绝；改为独立候选目录后成功，没有删除或放宽守卫。

现库存原先没有未加工原图的文件复核入口，不能制造SXT回执。只在原`prepared_inventory.mts`增加`FILE`决定，限`prepared-native-full-source-v1`且无processing reviewSpec；原编码源和所有IMAGE档必须精确在证据中。失败仍NEEDS_REPAIR、未知仍pending；SXT/PS/背景/NXT不得借此覆盖。原清单/Scene消费者直接复用，不新增采用表。

新增回归修复前真实失败（FILE orphan），修复后8项库存检查通过，含原源/各档缺证、重复/混合manifest、未知/失败、分发与普通采用分离及已有异常保留。一次TypeScript源联合类型错误已修为显式encoded-source收窄，API类型检查通过。实际新源单独库存和全库存均无异常。

## 实际Scene

沿同一个批次runner用真实service/Scene/GPU/银河/BSC/SAO，未重走完整页面。小源视角现在遵守产品minFOV：wide0.0610320721deg、detail0.05deg，不以0.0239deg越界放大冒实际用户尺度。

`output/prepared-scene-batch-2026-10-09/eso-full-source-r1/result.json` 92617B SHA `2a507db5ba75f9530649da52b0d557c3b727380111a5bd37349f57c8bb00dd5c`；执行快照67787B SHA `91a70d7f75574d93ee03ceca1dae126378582b3a99f0db1a5c89c9df3f1fbc75`。11帧共3控制及两视角off/三LOD；六张有图及两张off通过联系表集中看，未见明显矩形，外围与ansae保留、档间位置不变。光照是实际2026-10-09T13:00Z夜间：太阳-41.7455deg，目标54.4865deg，日距119.117deg。

runtime PASSED、inputReadback PASS、GL0、错误/queue空、资源退休全部0；照片效果35943..53882像素。目标视角目录星0不证明照片/目录星协调，三个公共控制只证明对应层有实际作用。此组DPR1夜间不是高DPR/昼暮、独立配准、原生/手机或完整Scene验收，当前SCENE UNKNOWN、registration/rights UNVERIFIED、ordinary false。

NGC7009另补DPR2、两视角、五个实际地平上/远太阳光照的off/on共20帧，沿同一`full-source-illumination-v1`机制复用原公共控制，未重跑三LOD基线。`eso-full-source-illumination-r1/result.json`115758B SHA `21376fb61a76d9a8f4132d1ddb19066d2fd261163080d696f4ccad5b37f26d7b`，执行快照68279B SHA `0bd6d9d37b0777d85e49abad871a03bc8c0cea9f434ac51cde44b0cbdec5d196`。实际太阳13.32/-0.34/-7.25/-14.17/-41.75deg，目标31.44..54.49deg、日距119.12..119.28deg；两组联系表十个有图条件全看，未见明显方框，中心/ansae/弱蓝外围在。GL/退休通过，5618024B仅逻辑辅助预算，不是物理内存或手机性能。

固定原AVM另对CDS `J/A+A/620/A169` 的NII6583/OIII4959 MUSE FITS作原网格对照，不拟合/重心移动或改变像素。两图250x310、0.2arcsec/spaxel、2014-06-24，同一MUSE观测父源，不能冒独立绝对参考。`r4/reference-map-check/result.json`10480B SHA `8281d26647f13dc1c1568e58b38ea8944b3a8f75791442222e01f8603b943844`；四幅联系表全看，相对方向/尺度/形态大体一致，未做独立恒星残差资格。显示采样约0.098666arcsec/pixel不等于约0.6arcsec仪器seeing；sourceResolution仍UNKNOWN。[原论文](https://discovery.ucl.ac.uk/id/eprint/10064859/1/aa33445-18.pdf)文字读取，web截图工具未返回可视像素，不声称论文图已看。新`r4/scene-and-map-decisions.json`合并适用证据，SCENE仍UNKNOWN；旧决定不改写。

## 第五批、局部恢复和大图背景

`output/eso-image-supply-2026-10-10-increment-r5/`新增[Abell33](https://www.eso.org/public/images/eso1412a/)、[ESO378-1](https://www.eso.org/public/images/eso1532a/)与[Fleming1](https://www.eso.org/public/images/eso1244a/)整幅真实照片，3446x3460、3188x2950、1382x592，共22145904像素，一组SXT、nativeInferenceCalls1，失败0。14幅原/处理/星层面板全看：Abell33大空心彩色衍射环叠弱蓝缘，ESO378上红缘/中心误删，Fleming中心与左喷流混合紧致点异常，均NEEDS_REPAIR；没有猜测重绘或重复SXT。`processed/result.json`23685B SHA `103e02ba8824b8d6d72afd3d7d9d879cb1881635329d2406444076979bd3ece2`，原复核44733B SHA `58a6d1aff0475bb84e6669b836380f3c77e812bea7e0177b283819068c90942f`。

[Ciardullo等1999](https://arxiv.org/abs/astro-ph/9904043)第6.1节确认K1-22中心三点最亮者是真核，并有未分辨近伴；不恢复另两颗场星。原像素ROI及六幅冻结蒙版预检均看过。一次既有PS批次恢复两源：ESO378已识别中心及上红壳、Fleming中心binary；无healing/生成/模型重跑。实际PSD重开、核心/外部/羽化差均0，保原网格/ICC。`restored/result.json`28467B SHA `7ed1806b130dd49fb688e0c9b8f81a418e7e4827551430cb4f4ced1823316fac`。16幅恢复整图/ROI全看：ESO378 FILE_PASS、局部壳/中心恢复，无明显纹理岛；Fleming左喷流混合点归属未闭，整幅仍NEEDS_REPAIR。复核50803B SHA `90a0577668971f2a4d52dba9e6a243b1f48fca16b16cbd7fbd9d450b79417edd`。

ESO378原恢复候选 `e8cd93389edc2f97daca0555e25e591fb06b69728239d8e39bd75f2182cc55fb`沿现publisher生成两粗档、精确复用最细PNG。首次输出在保留输入父目录下，被保护守卫拒绝；旧`restored-stage/result.json`保留FAILED，改独立兄弟输出成功，无放宽守卫。实际Scene `eso3781-restored-r1/result.json`95743B SHA `9e4456d0d4908cb3f1b2fa3000f538bca3df40e89e744a6f8d65814352155cbd`，11帧；两off/六有图联系表及两张原尺寸DETAIL全看，全部LOD明显矩形，SCENE FAILED。实际April1 13Z：太阳-32.9187deg、目标25.1576deg、日距145.4162deg；GL/运行/退休通过，目标目录星0不证明协调。

这幅原网格9404600像素的float64 RGB背景需225710400B，超过旧128MiB整数组入口。真实保存模型回归修复前准确复现`prepared_display_background_shape_invalid`；原owner增加显式batch字节预算和大数组有界临时mmap，旧解码/通用NPY上限不放宽，每通道仍不超过128MiB。固定ZIP成员/加密/压缩、调用者尺寸/f8/C行序、头长在读取正文前、完整payload/CRC、成功/异常map关闭和临时清理均校验；中间色彩转换逐128行，模型逐通道释放，像素公式/精度不变。普通旧多行batch仍是每模型默认限制，显式新预算才核合计，不把默认128MiB错误套成整批总额。

沿已用1/8-grid配方，只拟合一次。`background-preflight`七幅原网格蒙版对照全看；保守椭圆围住可见弱蓝外围/红壳，排除仅控制估计，非alpha也不保护目标免扣。`background/result.json`42103B SHA `fd32822cc436a6f4714f7a02a94523122f45fb51553ca1ada535c40bde98a8ab`；原/后七幅整图/ROI全看，弱蓝西/东南缘、红壳与中心在，底色减弱。display10374947B SHA `4ee0dfa37124ccc7a190cfdfe68b5d517967a94a23605a57d5314bb4f4098d07`，NPZ172177516B SHA `0e194e9e2a57fd7165be52a0d6e0d0898a8dbb58777c117657a61883c5919fa5`；全幅公式/ICC/支持与mask/统计读回通过，FILE_PASS。复核23683B SHA `0d1f954a832eacb50757c15fcec55bd5030a3f81553633ed89dabb7b5cec2982`。

实际拟合27.875s、50ms采样进程树RSS857657344B；保存证明9.883s/785133568B；现publisher21.960s/849899520B，两个操作不重拟合/模型，见`background-operation.json`、`background-verification-operation.json`、`background-publication-operation.json`。本机约34.1GB RAM、E盘1378403414016B余量，仅局部采样下界，不当全机/Linux/手机容量。预算、源快照和部分异常责任回原owner，无新增格式/producer或PLAN修订。

新背景候选 `196a5e3f01df9e518e65b69ab58e54a50a63944a21136b365d7a4d5ddf7e47a7`三图14117153B，最细精确复用。第一次Scene声明误写schema被GPU前拒绝，旧input/目录及`background-scene-input-failure.json`保留，不冒图质失败。校正后实际Scene `eso3781-background-r2/result.json`97927B SHA `a7742b6fd6c8063c7f5ec671d4823d235d2b20113223ec23eedc8f95232a532d`，11帧；八路contact及原尺寸wide/detail全看，复看原恢复wide细图。矩形大幅减弱，但宽/细视角仍有淡矩形颗粒底色及细视角下边，因此新SCENE仍FAILED_VISIBLE_RECTANGLE_REDUCED。壳/弱晕/中心在，运行和退休成功不消除图质；没有再扫阈值、NXT顺序或重复模型/背景。

背景/保存证明8项、display/stream8项、共享IO3项通过；新头长保护后再核真实大尺寸保存模型回归通过，6个相关Python源码compile通过。回归保未改结果/错误formula拒绝、无预算/错误预算、dtype/Fortran/对象/超长头/额外payload和成功/异常清理；旧批次“成功—坏mask—成功”隔离保持。独审MISSING，当前仅PR/CI读取工具，不能替本地未提交变更独审。

## 先前未落档的共用来源修复

`useSkySourceRecovery`给object/Prepared、body、HiPS root/rights的metadata按钮共享当前visible/mounted/selected-token围栏；直接hide事件覆盖渲染前空窗，A-B-A不复活旧token，同选择用最新query动作。只重试metadata，不重置Canvas/GPU。实际五类JSX消费者新回归修复前5项因hide后仍调用失败，随后6项（含ABA/最新动作）通过；原fixture跟随真实hook，不复制守卫。相关22项通过。fixture初次HiPS缺注入以及测试wrapper/可能undefined类型错误已修，不当作产品缺陷掩盖。

原native/derived来源attribution与accepted-frame短信用加入明确AI/SXT（适用时NXT）说明，原图不伪标AI，完整ESO原credit不改。依据[ESO条款](https://www.eso.org/public/outreach/copyright/)的改动/AI披露要求；此变更不是最终法务或原生可见信用验收。校正后的缺AI基线3项失败，修复后native/derived、source-credit、实际native frame及来源恢复相关共41项通过。App类型检查通过；本段contract/API类型检查也通过。

`publish_prepared_native.py`及derived原出口补适用AI/SXT/NXT披露，注册元数据版沿真实已有处理补入但不重复句子；新ESO378恢复与背景manifest实际读回都含SXT AI说明，编译通过。原不可变候选manifest没有就地改写，旧版再发行及最终可见信用仍须在实际交付边界闭合。未重跑41项无变化来源UI矩阵，不声称当前derived实际再发行/原生通过；source代码更新不把历史构建/截图变成当前证据。独审MISSING。

## 当前库存与边界

最新输入为`output/eso-image-supply-2026-10-10-increment-r5/current-inventory-input.json`，输出`output/eso-image-supply-current-inventory-2026-10-10-r8.json`：34epoch/17来源，9候选版次、2对象/2区域，27图片记录/24独立图51141123B，9metadata合67858B，去重payload51208981B，exceptions空，ordinary/distributable均0。r7保历史；r5原SXT/PS、两候选及输出保护FAILED均进入库存。NGC7009新DPR2/maps决定替当前join中的旧SCENE项，旧文件不改写；两ESO378新SCENE FAILED。

M104旧file-pass epoch保留，新纠正/恢复epoch NEEDS_REPAIR；两个未纠正候选的SCENE记录FAILED，当前实现更改使STALE。NGC7009 FILE_PASS、SCENE UNKNOWN；其它FAILED/UNKNOWN/MISSING不升级。完整33项、Android/iOS、全机成本和最终采用未完成。没有把有限原图、光谱样本或软件Scene转成全星空、全场分类或科学精度声明。
