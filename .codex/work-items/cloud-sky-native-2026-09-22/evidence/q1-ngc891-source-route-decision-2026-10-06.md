# Q1：NGC891 完整成品供给与下一消费路径

**PS1 已发现的单父片路径退出；NOIRLab 同一目标的完整成品进入一次现有 page/Scene 条件小样。** 新照片已取得、全幅查看，现有 `prepared_rgb_observation` 能直接接受其原 JPEG/AVM。尚无产品源码改动、出版、合格覆盖扩大或普通 Prepared 采用。唯一下一只按 [PLAN](../PLAN.md)；这次源图结果不关闭 33 项或任何目标运行时验收。

## PS1 单片供给不能缩掉已知目标

复用固定 [OpenNGC 原表](../../../../output/opengc-pinned-source-1005-e1/NGC.csv)，真实非 Messier `NGC0891`：`02:22:33.41 / +42:20:56.9`，目录长短轴 13.03′×3.03′、位置角22°。积分星等不作为像素饱和或成品资格依据；目录椭圆也不是完整外围上限。

首次实际发现 `2164.057`，g/r/i 三个 getWCS 网格一致，原 i 父片206前缀确认尺寸6320×6284及真实压缩 FITS 头。保留原无 frame 字段，沿前阶段官方 FK5/J2000 名义解释作规划；元数据 ICRS 标签不冒绝对认证。请求窗口选在父片内最靠近目标的位置，目录椭圆仍超出北边 **556.691原像素（约2.32′）**，因此在取彩图前停止。原 [失败回执](../../../../output/ps1-ngc891-finished-source-1006-q1-r1/failed.json)与 [几何规划](../../../../output/ps1-ngc891-finished-source-1006-q1-r1/geometry-before-image.json)不覆盖，不把该失败改称 PNG 图质失败。

根据 [官方 skycell 命名与共享网格说明](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812317/PS1+Sky+tessellation+patterns)，只核实际北邻 `2164.067` 的 g/r/i getWCS，未扫描其它投影片/全天。三个回复共同确认相同 TAN/CRVAL/CD/横向原点，纵向差5804原像素、矩形重叠480行。邻片本身缺目标南端 **1858.204原像素（约7.74′）**。两矩形并集覆盖72个名义目录边界点，仅是几何供给，不是已观测全支持、已拼彩图或完整弱外围。原片及邻片任一不能单独完整供给这个已知目标。

[官方 cutout 文档](https://outerspace.stsci.edu/spaces/PANSTARRS/pages/298812251/PS1+Image+Cutout+Service)说明单片越界会留空且不自动补邻片。此次关闭 **已发现057/067单父片成品路线**，不扩成“所有 PS1 不适用”。既有原格接缝能力保留，不为这张小样重取18通道、搭通用拼接框架或裁短星系。[邻片读回](../../../../output/ps1-ngc891-adjacent-grid-1006-q1-r2/result.json)绑定首轮全部14个文件 before/after不变。8次数据端请求：7×200、1×206，完成 body 共 **68,593B**，零重试、单并发，未取 PS1 彩图或完整父片。网页调研和下文 Browser 页面流量另计。

## 同目标 NOIRLab 成品与具体权利

实际在 Browser 官方图库搜索 `NGC 891`，只有一个相关周图入口：[Silver Galactic Sliver / iotw2023a](https://noirlab.edu/public/images/iotw2023a/)。搜索索引标签 `iotw2023` 是周图编号，直接无 `a` 的图页404；转实际站内入口纠正后只下载一份明确链接的 **Publication JPEG**，没有猜测图像URL、重复取 JPEG、原 TIFF或壁纸。

[公开图像政策](https://noirlab.edu/public/copyright/)在实际 Browser 中读回：具体公开图像若无单独例外，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，须清晰可见信用、不暗示机构背书；logo/代码/论文等范围不同。本图为 Mayall 4m/Mosaic I 观测，页面和原 XMP均未见独立例外；网页内 DSS2 查看器与下载的照片分开，未把其像素用于项目。完整信用由 [Browser 读回](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r2/browser-source-policy-readback.json)及原 XMP保持，包括 `KPNO/NOIRLab/NSF/AURA`、PI M.T. Patterson及三名图像处理者；不能以机构名称外推所有科研输入获权。

| 原始资产 | 实际字节与 SHA-256 | 含义 |
| --- | --- | --- |
| [Publication JPEG](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r1/iotw2023a-publication.jpg) | 3,570,760B / `d8781cb70d187ffa1baf80304f379658bb785a2d1806c62893ba9ce5d0491fcb` | 浏览器一次下载，原字节复制留存；完整4000×3154 RGB解码，无重处理 |
| [原嵌入 XMP](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r1/embedded-xmp.xml) | 9,457B / `cc5c5f7feca75e71f1f5976099c0171a32707e5c78cf0843e7abfda02102088b` | ResourceID/ReferenceURL/完整Credit/Rights精确绑定；不能伪造发布者AVM |
| [原 ICC](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r1/embedded-icc.icc) | 3,144B / `2b3aa1645779a9e634744faf9b01e9102b0c9b88fd6deced7934df86b949af7e` | 原 profile保留，未做色彩转换或以存在ICC冒与其它图通带兼容 |

页面原尺寸4179×3295、名义视野18.23′×14.38′；Publication版本只是同全幅分辨率调整，壁纸未采用。页面滤镜和原 AVM一致列 U/B/R/H-alpha，成品是历史编码彩色展示，不是校准RGB/当前天空；滤镜名单不单独认证各 RGB通道的精确映射。没有把它当 PS1 gri 或 Hubble父层。

## 复用原几何 owner 与全幅观察

原 AVM明确 ICRS/J2000/TAN、rotation −90.02°；ReferenceDimension与原页一致，原 Quality字段为 `Full`，仍不认证绝对配准或科学支持。现有 [读取器](../../../../data-pipelines/deep-sky/prepared_rgb_observation.py)以完整源身份及资源限额直接通过，复用已实现的空 Spectral/Spatial Notes解析处理；未改原 XMP/照片，未扩大生产合同或重做原代码。

[当前 R2读回](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r2/result.json)：49名义网格方向逆回最大差 `3.61979e-10`原像素，仅是成熟库解释一致性。目录椭圆到四边的名义余量约 `[692.137,644.504,1013.845,904.566]`原像素，完整落在照片内；此为已知范围必要检查，不能据其边界取消更弱外围义务。19个全黑/419个全白编码像素只描述字节，不是missing mask、真实零或饱和科学认证；scientific availability仍UNKNOWN。

本轮实际查看保存的原 JPEG全幅工具缩放视图。星系两端、尘埃带和周边星场可见；未在该视图观察到旧 PS1星团那类大块父片空白或成片空心亮星。照片仍有亮星晕/星芒及自身背景、矩形边界。这支持 **CONDITIONAL_COMPLETE_FIELD_SOURCE_CANDIDATE_FOR_ONE_EXISTING_PAGE_SCENE_TRIAL**，不支持完整外围/连贯底图、照片与目录星重复、绝对配准或手机图质通过。不是每个原像素逐点认证；[独立新决定](../../../../output/noirlab-ngc891-finished-decision-1006-q1-r1/result.json)拥有当前视觉结论，旧 R2的PENDING字段保原。

第一任务读取器调用漏传强制资源限额，报 TypeError；原 [R1失败](../../../../output/noirlab-ngc891-finished-readback-1006-q1-r1/failed.json)及日志封存。R2仅补调用参数，用缓存原 JPEG/XMP/ICC，源 before/after不变，无新下载/复制。另一次 Node stdin启动漏 `-` 未创建R2脚本，随后 Python文件不存在的调用退出2；该 [失败调用日志](../tmp/noirlab-ngc891-finished-readback-2026-10-06-r2.log)保留，之后 [实际R2日志](../tmp/noirlab-ngc891-finished-readback-2026-10-06-r2-actual.log)退出0。两项是任务诊断错误，不改判为产品缺陷或图像失败。

## 当前决定与下一最小路径

复用已取得的**这份 JPEG/XMP**、原 native whole-source producer/PNG-JPEG合同与实际 page/Scene，作一次完整非 Messier/周边区域小样；先比较概览/外围/照片边界及目录星，再决定是否值得普通发布消费者。来源身份、波段/历史/处理、可见完整信用、source Back及正常/失败退休继续使用原owner，不造平行路径。若实际Scene失败，按新反例退出，不再靠抠黑、feather、单张调色或PSF补观测缺口。

当前无新产品源码、加工母图/分档/出版、构建、DevTools SDK或Scene试验；20产品源 pin不变。一次 Browser成品保存3,570,760B，浏览器请求头/HTTP状态/协议计费字节未抓取，不能用文件大小冒网络账单、端到端机器峰或200DAU容量。原 BFF/watch/IDE不重启，P1无新可行动状态，实际 native page仍UNKNOWN；Android/iOS、独审、生产引用全集、物理资源及33项仍未完成。普通 Prepared registry保持空，Goal active无预算，无提交推送、采购、部署、外联或发布。
