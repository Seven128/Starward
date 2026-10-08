# PS1 45°原成品退出与静态路径冲突修复

当前PS1低阶广角显示配置退出，不扩大order0/90°/180°或逐图颜色/PSF工程。原44图有限区域的条件图质与有界保粗结果保留；普通Prepared空、HiPS关。Goal active、无预算、未完成。

按实际相机取12原order1 JPEG [0,1,2,3,7,11,13,15,17,19,22,23]，总1,447,349B，一次上游下载；不重复下载旧44图。新56图精确root为41c99991f705944a510e59426145705b1ec93f37a848939e49340382e7d716b0，总6,725,040B。原像素未改，完整rights/原properties/机器可读本子集及复现信息均随版本保留，非生产采用或完整公开合规。

实际521 frontend/174 backend输入、Map→Sky→8°→45°→.15°→45°→Sources→Back→Map，110 Scene/179请求。Sources精确root及完整原署名、处理/复制链接通过，三个45°终态相同相机/时刻raw RGBA差0，退出native/GPU/source活动资源0。返回45°有三partial完成帧，到名义全格完整约340.1ms；Source Back三null/八partial约1149.4ms。它们是软件完成区间，非原生compositor可见时长；名义全格覆盖不是科学逐像素支持。Source压力仍20MiB；全场all-source逻辑RGBA峰38,338,560B、GPU纹理模型峰17,485,976B在各自时间点，不相加冒物理内存，200DAU容量未验。

已查看完整45°、返回45°及.15°实际图像，并查看原Npix0/2/3 JPEG。45°明显彩色方块/底色拼块，原Npix2存在同类绿块、Npix3红块，当前原图直接显示不满足完整图质，FAILED。星座插画正常叠加参与画面；其他斜边/黑线的具体归因未隔离，仍UNKNOWN，不全归给PS1，也不拿关插画替代完整体验。没有修补黑、抠星、羽化、生成细节。科学支持、绝对配准仍UNKNOWN/UNVERIFIED，不否定所有PS1及旧区域结果。

标准静态出口首次失败为真实EEXIST：瓦片URL /1/0 本身是索引URL /1/0/index 的文件前缀。原共享writer对实际碰撞使用物理.tile后缀，最终非碰撞布局仍原路径；公共URL/头/索引schema不改。validator/merge/原归档恢复和Caddy都消费同一映射，缺文件仍API fallback，流式写不积累整个影像库。新增回归修前失败、修后46影响检查通过，原有效布局/原包保留。

实际新56原图标准64文件通过；cached Caddy digest本机隔离TLS瓦片/索引GET、HEAD与移走任务私有文件后的418 API fallback通过，GET SHA精确、无redirect。首次任务Caddyfile单行block语法失败、第二次Windows Schannel私有CA缺CRL失败保原；第三次仅针对私有CA允许无CRL信息，仍验证链/主机名，未用-k或修改全局信任。新64真实文件经原backup/managed restore消费者精确还原；身份明确fixture，不冒真实OCI/GCM/Compose/PG或部署。恢复R1误把create返回wrapper当record的任务失败保留，R2正确消费.record通过。

下一唯一依赖：Q1 Legacy DR10加工HiPS小样——PS1实际45°低阶原图/现显示配置因上游彩色块及可见图质退出，原44图有限区域条件结果和已修有界保粗保留；新56图/精确rights/64静态文件及110 Scene/179请求、来源Back/终态0像素差/退休仅是开发结果。静态瓦片与索引路径冲突已沿原writer/merge/恢复/Caddy修复，46影响检查和本机HTTPS/64文件归档恢复通过，旧URL/有效布局保留。下一复用现HiPS合同/选择器/page/Scene，先按封存45°相机取CDS DESI-Legacy-Surveys DR10 color的必要原PNG小样，核真实缺测/色带/密星/边沿，尽快留或退出；2026-07产品/原图CC BY4与CDS ODbL身份须分层保，并明确混合DR10南天与DR9北天，不把67%名义MOC当完整天球或有效图质。先核缓存/MOC和实际必要格，不全库镜像、扩大所有阶或建新巡天框架；旧Legacy粗cutout/ESO直接UV失败不复跑。PS1暖回45°三partial帧约340.1ms、Source Back三null/八partial至约1149.4ms仍FAILED；20MiB只为原压力，all-source逻辑峰38,338,560B/GPU纹理模型峰17,485,976B不冒物理容量，不为已退出配置扩缓存。普通Prepared空/HiPS关，P1独立无新根因不循环SDK，科学UNKNOWN/完整图质/设备月面/容量/公开合规/独审及33项开放。Goal active无预算，无提交推送采购部署外联。

新信息依据：[CDS具体产品记录](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FDESI-Legacy-Surveys%2FDR10%2Fcolor&fmt=html&get=record)描述2026-07新增北天，当前equatorial/order11/512 PNG及有限MOC；[Legacy图像条款](https://www.legacysurvey.org/acknowledgment/)要求可见原文信用，CDS加工数据库层另受ODbL。原metadata三份保存于output/legacy-wide-next-primary-1006-q1-r1，此时该候选图像下载0、图质/实际覆盖/发布消费者未知。不是重跑旧粗cutout或既有Mellinger普通银河采用；后者事实和原ESO直接UV失败保持。

证据目录：output/ps1-wide-region-source-1006-q1-r1、publication-1006-q1-r1（均以ps1-wide-region前缀）、output/ps1-wide-region-static-1006-q1-r1（原失败）、r2（修后）；output/playwright/ps1-wide-region-native-page-1006-q1-r1（旧checkpoint拒绝）/r2（实际）；output/ps1-wide-region-page-readback-1006-q1-r1（任务pin路径失败）/r2（修后）；output/ps1-low-order-static-https-1006-q1-r1/r2/r3及restore-1006-q1-r1/r2。失败日志/脚本和旧图/旧资产/服务/watch均保，不复跑闭合矩阵或SDK。修后独立审查MISSING，DevTools/Android/iOS/新版月面/完整图质/公开发布/真实引用和物理容量仍未验；33项账原行完整保持。
