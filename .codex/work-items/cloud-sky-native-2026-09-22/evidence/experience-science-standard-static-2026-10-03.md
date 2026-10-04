# 科学v2/v3接标准静态导出，未采用

2026-10-03，固定worktree/branch/HEAD，Goal active无预算。承接[新版出版/消费者](experience-signed-science-publication-and-consumers-2026-10-03.md)唯一依赖，保既有所有成果及六项设置/outbox字节。无下载/重投影/源重加工、默认登记、提交/推送或云部署。

`SdssOpticalImageryService.publishedAssets()`统一枚举原六对象18JPEG和constructor显式登记的科学版本，逐张复用manifest/hash/目录身份/完整容器/原bytes校验与`getByFile`。默认仍仅六旧JPEG，无science目录扫描或隐式采用。标准`approvedSkyPublicAssets(prepared, sdss)`和`exportSkyPublicAssets(output, revision, prepared, sdss)`接此owner；退役exporter中独立JPEG枚举路径，由源owner唯一维护允许版本。metadata仍API，科学母NPY/FITS/receipt不进入静态枚举。

headers、canonical static bundle/union/release机制不新增另一套；v2/v3 PNG使用原`sdss-optical`来源/field/content-type，原`/v2/sky/sdss-optical/{hash}/{file}`，原`optical_published`日志matcher已覆盖。不重复Caddy/HTTP/闭合inventory/磁盘分配实验，不新增时延或出口收益结论。

受影响static export检查包括原Prepared和新增science两个完整seal路径，通过；worker TS5.9.3通过。新增检查保六旧JPEG+显式v2/v3、headers/实际导出PNG/生成fragment、无raw/manifest/receipt、改原PNG末字节被拒绝及恢复可读。v3 synthetic transport是结构fixture，声明不验科学来源/真实派生。无效PNG不会进入一个成功seal或污染后续恢复。

真实脚本[experience-science-standard-static-2026-10-03.mts](../scripts/experience-science-standard-static-2026-10-03.mts)显式复用已有实际v2 publication hash `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`、v3 `dddc454058cd1dc464ab0f726b78d0af5df130d4a6c51c41d8a83e4bfcf5e2af`，以及原Prepared `8eb8336a…`。标准exporter新exclusive generation输出，`validateSkyStaticBundle`核完整seal/file/hash/fragment。

`output/science-standard-static-1003-r1/result.json`13,939B SHA256 `83b21b0db14c354b474a6bd401ca72ddb114b66c30fb47bd9cfb603c7cae0426`。新完整包910路由/49,074,115B payload，publication hash `8a8ea1a297c0ffbfea8bfb443492f322f682af5c72da97fa37ee722f808e5977`。与原904路由包index pin `7bba7336…`逐record精确比较，旧route/hash/bytes/header保持；新增6PNG/2,507,571B，v2=949,846B、v3=1,557,725B；旧包46,566,544B未改。这不包含metadata/目录/文件分配/协议开销，也不是手机首次进入流量、客户端峰值、云180GB余量或200DAU运营量。

实际源PNGs与新seal文件/headers/direct source owner再读相同。所有源输入/源码/六保护文件before-after绑定精确相同。旧Prepared图质FAILED和默认registry空保持；新包显式owner是开发候选，非image build生产采用/已部署。

有界namespace mutation仅将当前export函数`approvedSkyPublicAssets(prepared, sdss)`替换为丢失sdss入参；实际枚举只剩18JPEG，新science route0，正向24 optical/910总route均有实际导出文件。mutation只枚举、不产生第二静态包或写payload，不改生产文件。可有效检出旧exporter忽略显式science owner的遗漏，不拿测试计数或原图片占位当完成。

本增量独审MISSING。下一依赖为新版partial/冻结全图参数候选的出版资格与重现边界，再核真实LOD/旋转/天背景/颜色/PSF/弱结构、已绘来源Back、必要独审与普通采用。原A完整交互/原生WXML FAILED_DEVTOOLS/手机Android-iOS新版月面未验、M51照片矩形FAILED/M82OV-MED输入不足、D真实引用/生产磁盘/全小程序成本与200DAU混合容量均不升级。当前服务/watch原进程复用，常驻BFF是否加载最新源码仍未证。
