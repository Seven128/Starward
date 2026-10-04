# M51 完整目标输入：最小实际字段与取得边界

沿唯一 PLAN 第2步，复用[原中心三帧](experience-sdss-corrected-acquisition-2026-10-02.md)、已有数据与已采用 SDSS 商业来源。根据[实际字段几何](experience-sdss-m51-field-geometry-2026-10-02.md)而非猜相邻编号，root 完成一次25点 CAS 发现、六份新 r、唯一最小选中集合的十份 g/i。没有重取中心原帧、旧 JPEG、月面、其它来源；没有客户端源站请求、采购、部署或发布。

## 实际取得与必要范围

完整候选使用 rerun301 的六个字段：run3699/camcol6/field99、100、101，以及 run3716/camcol6/field116、117、118。已取得的 run3716/camcol5/field117 r 在真实 WCS 下对整个目标贡献0；它只服务字段发现，没有再取得该字段的 g/i，也没有加入母图。

| 实际输入 | 新 GET 数 | 新压缩字节 | 当前用途 |
| --- | ---: | ---: | --- |
| 原中心 field100 gri | 3 | 9,134,078 | 原始准入及当前复用 |
| CAS 候选的其余 r | 6 | 18,477,945 | 真实全目标几何与最小集合 |
| 最小集合的 g/i | 10 | 32,743,480 | 三带实际供给及离线拼接 |

19个实际 payload 总60,355,503B；排除只有发现用途的 camcol5 r 后，母图18个 source 文件57,308,910B。所有 GET 各执行一次、HTTP200、正常 TLS、无自动重试；不是客户端下载量或单DAU出口。请求脚本使用40秒单请求超时与16MiB响应体**读完后的准入上限**，没有声称流式传输上限。十个新 g/i 的取得脚本见 [acquisition.ps1](../scripts/experience-sdss-field-gi-acquisition-2026-10-02.ps1)。旧三帧 bytes/hash 已先核，所有新源拒绝覆盖现有路径。

原回执位于 `output/sdss-corrected-m51-1002/`：`field-r-acquisition.json` SHA `6bcb4b976b3ae33166435e49545f29212fcb18af51c1eeb43633e1c373a783d8`；`field-gi-acquisition.json` SHA `d04f8fc4d3c6b43f4aa23434bb8cfd1715e01ad90378db9dd92fac38d0c059bd`。其中 `RAW_ACQUIRED_UNCHECKED` 保留取得时的原语义，后续科学准入另有证据，未覆盖获取回执。

## 完整输入与科学质量分开

root 的只读 astrometry diagnostic 已经逐帧通过当前共享 reader 对18份完整 source 做 actual bytes/hash/identity、科学 HDU、ICRS/asTrans 的准入；它不改 WCS 或科学值。另由独立审查者直接读取 FITS primary 并逐值比对，保零、负数及已应用校准/sky，没有再乘 NMGY 或再减天空。

独立脚本对整个2048²北向目标逐像素计算每band真实 primary TAN/source 四邻有限 stencil：g、r、i **各4,194,304/4,194,304**可取。同一 field 内三带共同可取集合的并集也完整4,194,304，不借不同字段错配颜色来宣布齐全。去除任一选中字段会留下真实缺口，最小独供76,432像素。见[独立输入审查](experience-sdss-m51-mosaic-independent-review-2026-10-02.md)及 `output/sdss-m51-mosaic-source-independent-1002-r3/review.json`，SHA `93f5a517f22d32160060cef685f8283ab77ad23ccc0770331214f80f1bb4159f`；r1/r2未完成的复核代次不升级。

这些结果只证明这个2048²目标、当前 source primary-linear TAN 与四邻样本的供给完整。没有 fpM/PSF/置信度、未施用完整 polynomial/DCR、不认证绝对配准或无伪影。当前单 field 旧 candidate 仍是48.4369%，原文件保持；不能把新 input union 回写成旧 PNG 的完整覆盖。具体近似风险见[asTrans数值诊断](experience-sdss-astrans-approximation-audit-2026-10-02.md)。

## 下一实际依赖

在既有 `sdss_gri_tan.py` 中扩展共同有效字段权重/明确重叠责任，保各字段、各band和科学可取状态，再用同一科学母图做一次共同 RGB 映射及三级输出。不同 run 的重叠亮度、背景、颜色、接缝与完整伴星系必须看实际新图；不得从 finite 黑色猜坏像素、填缺源、重复扣 sky、逐对象手抠或生成天体细节。

新母图只写新 generation，并保旧201资产及既有 offer 不变；颜色、alpha、实际编码体积和真实天空组合仍需比较。此前 PNG 候选明显比旧 JPEG 大，不能因输入完整跳过客户端传输优化。正式版本合同/来源贡献绑定、持久缓存、目标运行时与手机、总资源和200DAU容量/成本仍开放。4GB测试环境与16GB预期生产资源不因此被认证，57.3MB原科学文件始终属于离线输入。
