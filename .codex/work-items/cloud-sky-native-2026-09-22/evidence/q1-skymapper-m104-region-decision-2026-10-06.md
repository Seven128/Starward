# SkyMapper M104 成品：有限原像素预览支持继续消费者试验

七张现成CDS DR4 i/r/g彩色HiPS PNG共4,357,637B；六新原图3,745,801B，一张611,836B复用既有M104缓存。完整512² RGBA解码，各源alpha全255，无生成、调色、拉伸、PSF、补洞、科学图重加工或产品改动。当前只支持进入有限原生消费试验，普通Prepared仍空/HiPS仍关。没有新出版、page/Scene或WEAPP构建；实际原生图质、科学支持、绝对配准、全景供给和最终验收仍未完成。

## 具体数据、许可和供给边界

[当前CDS记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FSkymapper%2FDR4%2Fcolor&fmt=html&get=record)确认具体creator_did、Boch T. (CDS)、CNRS/Unistra、ODbL-1.0及主站复制标记；生成时采用深/浅观测影像并拒强背景变化，i/r/g显示颜色不冒科学测量。当前可读记录未提供加工HiPS DOI；不要使用原DR4数据DOI代填或从别库借值。缓存properties保原。MOC是空间NUNIQ/C/order10、30,461项，名义天空比例0.6327091853；记录的ST-MOC标签与实际文件分开。历史观测时间不按2026模拟时刻过滤。完整库约6.34TB的估算仍不满足全机共享180GB镜像，不引入全域下载。

本轮Python默认证书验证一次实际[DataCite DOI元数据](https://api.datacite.org/dois/10.25914/5M47-S621)200，rightsList与9月缓存完全相同：原DR4数据CC BY4.0，原始数据版权ANU；原meta 11,839B和请求保在output/skymapper-rights-readback-1006-q1-r1。与加工数据库的[ODbL](https://opendatacommons.org/licenses/odbl/1-0/)分开；ODbL单独不授权图像内容。当前[官方引用页](https://skymapper.anu.edu.au/how-to-cite/)要求DR4论文与原数据DOI、完整SkyMapper/ANU/ARC/ASVO/NCI/AAL及相应基金署名；现缓存properties完整署名必须沿新消费者原样保留。官方policies链接重定向Protected Science Projects并明确DR4起不执行保护科学项目限制；这不是单独的内容再许可。DOI落地页浏览仍不可达，具体正面版权依据来自已取回原DataCite元数据；普通完整公开合规依然未完成。

两项具体授权支持当前有界内部原成品/消费者试验，是依来源作的判断，不宣称服务无限供给或普通发布准入。来源页、整版本机器可读子集、改动/通知/版权及真实下载消费者仍须闭合。受限SkyMapper SIAP原TPV片路径保持原限制，不把它套作CDS成熟HiPS禁用，也不去扫SIAP/全库或外联。

## 当前选择器与完整原像素

M104 ICRS [189.99763,-11.62305]，当前selectSkyHipsTiles在390×844、0.25°、最高order8的诊断相机选择[401307,401328,401329,401330,401331,401332,401334]。这是identity equatorial transform的当前几何owner需求小样，尚非实际公共地点时间/页面完成帧。0.15°选4格、0.4°选12格只是规划；未给0.4°或全景冒完整实际供给。当前0.25°名义329,160像素中心以及七完整order8单元的order10后代全部在缓存MOC内，但MOC不是科学或图像有效性mask。原图编码黑保持ENCODING_ONLY；无透明孔不证明观测完整或测光可信。

直接查看既有order0全图、LMC及M104全图；LMC既有黄绿色拼接带失败保持，order0主要覆盖区外不推成整库失败。旧PS1 M104全原JPEG本身有明显彩块，未为同一失败配置重复取邻图。仅从记录主站取六个必要PNG，原cache一图没有再取。首次curl/Schannel握手35、尚无图像body；失败r1保留，单次换现有Python默认TLS验证r2取得六图，零证书绕过/循环重试。

正确原像素采样预览[完整目标区域](../../../../output/skymapper-m104-region-inspection-1006-q1-r2/whole-target-square-nearest-original.png)与[规划纵向视图](../../../../output/skymapper-m104-region-inspection-1006-q1-r2/planned-portrait-nearest-original.png)，只用现unprojectSkyPoint和成熟healpix-ts order17索引按原RGB nearest取样；七原图全幅也均已看。112像素中心roundtrip、独立CDS child19 packaging和当前native mesh两项检查，确认column=NW、row=NE；全部视图所需原像素已供给，missing0，没有填充。完整0.2°square中目标两侧/暗带与外围保留，未见此前错误诊断的三角切断。原颜色有紫色光晕及明显底噪，未量化或认定完整图质通过；仅允许沿现native消费者继续实证。不因局部预览直接普通采用，也不保证所有SkyMapper区域/层阶质量。

初次任务诊断按旧原样报告误写column=NE,row=NW，自身roundtrip不能发现转置；核当前源码mesh/已有独立包装检查后发现并修正。原r1地图/两PNG/旧脚本完整保留，不能再作有效配准或决定依据。先前看到斜线突变的判断被修正；正确r2是本轮控制证据。另首次identity相机right轴手性错误被当前选择器拒绝INVALID_VIEW，没有请求；首次Python读取map用系统GBK失败在解码前，没有产品作用；UTF-8与轴修正后的记录分开保留。不是修产品geometry，也不把同库一致叫独立绝对天文配准。

## 实际消费者的唯一下一依赖

Q1 SkyMapper M104有限原生消费者：七张order8原PNG共4,357,637B（六新图/一缓存）与当前空间MOC/像素轴已核，正确完整区域原像素预览支持继续有界试验，未普通采用。先复用当前实际page/Scene/HiPS出版及完整来源消费者，核真实M104公共进入与相机wanted/支持范围；沿同源有限瓦片补最小LOCAL/TRIAL合同。具体缺口是原CDS记录/properties没有加工HiPS DOI，现合同/来源却强制非空DOI；以明确缺值及已有record/creator_did表示，保既有PS1字符串/旧URL消费者，绝不把原DR4 DOI冒加工DOI或造值。以真实PNG推动最小兼容扩展，完整原CC BY4.0/ANU署名与独立CDS ODbL/全版本子集说明必须绑定并读回，再测cold/warm、支持的缩放/来源Back、同帧资格、整场驻留/临时峰/取消/最终退休，未供给范围明确有限。原像素预览不是native图质通过；有新像素或供给理由才补必要邻格，不扩全库/PSF/缓存框架、不重取已缓存七图。LMC既有黄绿带失败、PS1等旧失败保原，其他区域不全否决。P1/Android-iOS/新版月面/完整广角图质/科学UNKNOWN/绝对配准/公开发布/物理200DAU容量/独审与33项独立开放；SDK/SkyServer无新根因不循环。普通Prepared空/HiPS关，Goal active无预算，不提交推送采购部署外联。

现api-shapes/后端validator/前端reader/rights/Sources把加工hipsDoi强制非空，真实SkyMapper成品没有该字段，必须在此最小边界保缺值并兼容原PS1；完整源record和creator_did有真实值，不为通过伪造DOI或削弱其它完整性。实际page使用公共M104搜索/同时间地点/原相机wanted后才决定必要源格，先试有限支持缩放/Back与来源，再按完整图质/生命周期/资源作采用或退出。仅预览通过不是完整原生体验，旧两Source Back null与首图/物理runtime依赖保持。

33项义务未缩减；Android/iOS/真实DevTools/新版月面、全应用物理峰及200DAU容量、公开合规/独审保未验。六保护项及原所有源码/WEAPP/原图/失败/未提交成果保留。Goal active无预算，无提交推送采购部署外联。
