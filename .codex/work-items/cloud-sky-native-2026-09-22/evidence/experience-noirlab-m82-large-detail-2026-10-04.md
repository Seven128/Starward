# M82同照片较高分辨率输入：实测收益与当前限制

2026-10-04。继续唯一PLAN中约232源像素细档的实际缺口，仅云观星任务脚本/输出与所属文档；生产源码、普通registry、六保护文件、原BFF/watch及分支/HEAD不变。不核旧设计稿，不提交/部署/发布。Goal仍active、无预算。

## 新真实输入，未重复旧加工

有界盘点task输出中的资源ID/large/original名字、指定request/source identity JSON内的准确large URL与Downloads同名文件。既有下载为旧4k同哈希文件；未找到较高分辨率匹配，但这不是全机穷举。随后在实际[同照片官方页面](https://noirlab.edu/public/images/noao-m81m82/?lang=en)读取Large JPEG控制，仅下载一次；没有点击DSS查看器或取得86MB TIFF。

[保存源/头信息收据](../../../../output/noirlab-m82-large-source-1004-r1/result.json)：**8315×4642、9250383B**，SHA256 `71a539df75c8af574e98d3da13c1381e525093dd2e8814d9588f35b73b4e3479`。原嵌入AVM与4k **字节完全相同**，3144B sRGB ICC也与旧图相同。图像资源ID、完整credit和CC BY 4.0标签一致；既有具体图政策继续复用，不泛化机构科研数据许可。Browser下载未观察HTTP状态/headers，不把文件成功保存编成GET 200。头检查未RGB解码。

来源措辞更正：官方正文称KPNO 0.9m/Mosaic camera，颜色表称WIYN 0.9-meter/Mosaic I。不能把旧“KPNO/WIYN 0.9m”断言为错误；保两处原文差异，也不能混成M51的WIYN 3.5m ODI。[前阶段人读证据](experience-prepared-native-extent-and-background-2026-10-04.md)已修这项过强判定，旧机器收据及publication pins未改。

## 一次当前owner投影与同方法处理

[执行结果](../../../../output/noirlab-m82-large-detail-1004-r1/result.json)由当前Prepared观察源准入owner完整RGB解码一次，再由原TAN owner把这个**新输入**投影一次；旧JPEG解码/源RGB重投影为0。原照片、名义坐标、颜色、原raw母图/PNG分别保。当前同13.653333′母视野三级几何支持100%，不称科学覆盖；DETAIL名义原像素跨档 **482.109822**，原4k约231.922945，倍率2.07875只是采样密度，不是望远镜PSF/真实细节翻倍。

相同Hubble几何guard只作估计排除，重新在新照片样本检测源；仍为单源Photutils 3.0.0、同256²网格/3²filter/3σ×10/2σ检测/10px膨胀，不扫描参数、不混入Hubble RGB。估计mask1851643像素，每通道64格中54格有样本；几何alpha不改。编码显示背景转线性后相减/显示负值截零，计数[1673237,1119791,1070642]保存，不当真实弱结构无损证明。

三raw PNG合 **1213030B**，三派生PNG合 **1208058B**；原4k派生851488B。每PNG仍512²/1048576B RGBA逻辑等效，客户端无需取得9.25MB原图或115794690B源RGB。源解码+投影墙时约11.265秒，全试验墙时约21.652秒/CPU21.469秒，仅离线开发，未测物理峰或测试服容量。Float64背景以lossless NPZ保存 **79513803B**，原模型解压约100.66MB；压缩保留不减少运行分配。

已查看三级完整512²三栏：4k派生、较大图原采样、同方法派生。较大图有更多真实星点/结构和细颗粒，但主体仍软，未证明足以替代Hubble局部高清。处理不含锐化、去卷积或生成细节；不为扩大像素数再取同尺寸TIFF，除非后续定位明确JPEG损失。

## 当前完整Scene与保存像素

[3个新Scene帧](../../../../output/playwright/cloud-sky-noirlab-m82-large-detail-1004-r2/result.json)使用当前真实选档/相邻粗层/向北偏移，与前代三个条件一致。先核全部100个parsed Scene/GPU源绑定相同，再原样复用之前4k派生与无目标baseline，**新旧控制帧重跑0**。新PNG真实解码/实际draw，所有纹理创建/删除相等、最终live0；任务替换的最终来源刻意UNKNOWN，不能借旧Prepared v1身份认证处理像素。

[读回](../../../../output/noirlab-m82-large-detail-readback-1004-r2/result.json)独立sRGB公式核完整4M母RGB、原alpha、六个raw/派生PNG精确；新GL/PNG及复用控制精确，独立相机/TAN/stock合成模型p99/最大差1byte，错误使用4k raster的反事实误差更大。OV几何外部像素与baseline相同；MED/DETAIL无外部像素处明确NOT_APPLICABLE，粗层实际补108810像素。7576边界像素的细/粗采样p90最大通道差约 **3.129/3.073byte**，高于旧约1.605/.896，包含更多星点/颗粒/真实结构，不自动判仪器接缝或质量通过。

三个完整实际Scene对照已查看。暗底改善仍成立，细档颗粒更可见、主体细节收益有限；完整弱结构/边缘连续、绝对配准/不同来源兼容及整体图质未通过。不是实际Hook/page/Sources Back、WEAPP/WXML、手机、独审或容量验收。不能把旧FAILED升级为成功，也不把新图更多采样当全部高清义务完成。

失败保留：Scene R1在draw前因Python/JS序列化视野末位双精度差被task严格相等断言拒绝，未绘帧；改为一个相对double epsilon并保全部源pins，R2完成。Reader R1在像素核验前不能处理跨盘Node绝对路径，保原文件/失败说明；仅修reader绑定长度/hash处理，R2完成，未重投影、拟合或绘制。均为任务夹具问题，不是生产bug修复或质量通过。

## 收口与下一责任

本代六组输出（含失败）保留逻辑 **144447521B**，不是生产库存、物理磁盘/RSS、峰出流量或全机180GB余量。本代图片下载1次；没有新许可费、付费设施、外联、云部署或用户下发；未知工程投入/批量异常率/混合业务容量不填零。

具体成品尺寸/采样缺口已经核清，停止仅靠换更大相同照片反复加工。候选仍未采用、普通registry空。下一必要责任是为实际显示处理建立可真实披露的候选身份和完整出版/来源路径：现Prepared v1仅表示未改编码RGB重采样，不能伪装本显示估计。先读现有契约、writer、来源、消费者责任，再以已有具体产物走最小独立处理版本的真实小路径；保旧v1、原科学未知、几何/有效黑色、失败保粗、cache/租约/取消迟到及完整署名。是否能采用仍由真实质量/完整page/发布及成本证据决定，独审/原生/手机等原义务保持。唯一执行顺序只由[PLAN顶部](../PLAN.md)维护，不创建新多源或缓存框架。
