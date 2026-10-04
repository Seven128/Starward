# M51 官方校准科学帧：一次有界真实取得（2026-10-02）

服务唯一 PLAN 第 2 步。本轮依据已采用 SDSS 来源与[只读原帧路径审计](experience-sdss-m51-raw-path-audit-2026-10-02.md)，新增一次 CAS 中心字段读取、一次对应 g/r/i 三帧取得。没有重复既有 JPEG、月面或其它候选下载；没有源站运行时请求、产品发布、云部署、采购或联系来源。旧资产/出版/SDK/手机证据不由此次获取升级。

## 官方来源与权利

[SDSS 官方政策](https://www.sdss.org/collaboration/image-use-policy/)明确公开 data releases 数据为 public domain；网站影像另按 CC BY 并保留署名。本轮来自官方 SAS 的 DR17 corrected frames，不是第三方图层或相机未处理原始曝光。新派生品仍需实际源/处理/信用与不可变身份，不能借旧 JPEG 的 v1 清单声称新产品已经采用。来源信用为 Sloan Digital Sky Survey，不暗示其背书。

[DR17 imaging files](https://www.sdss4.org/dr17/imaging/images/)与[frame 数据模型](https://data.sdss.org/datamodel/files/BOSS_PHOTOOBJ/frames/RERUN/RUN/CAMCOL/frame.html)说明校准、天空扣除已经施用；不要再次乘校准或减天空。header 的线性 TAN 变换不包含完整多项式/DCR；原文件的 HDU3 asTrans 必须保留。有限科学样本不等于无坏像素、无饱和或科学质量合格。

## 实际取得与完整性边界

原请求与原响应保存于 ignored `output/sdss-corrected-m51-1002/`，脚本在任务 `scripts/experience-sdss-corrected-fields-2026-10-02.ps1` 与 `scripts/experience-sdss-corrected-acquisition-2026-10-02.ps1`。固定第一次尝试，已有文件拒绝重取；每个请求没有重试。使用正常 TLS 校验，未切换镜像或跳过证书。

CAS 实际返回一个中心 primary field：十进制身份字符串 `1237661362908561408`，rerun/run/camcol/field 为 `301/3699/6/100`。原 CSV 为 74 bytes，SHA256 `d38a50e4747533188b916ac0be66b84dbafb2124365c4763d99c96d5fdde2612`，HTTP 200；耗时 15,816 ms。查询只证明本次中心字段返回，不证明全方形或每波段有效覆盖。

| band | 官方 SAS 路径尾部 | HTTP | 实收压缩 bytes | SHA256 | 请求耗时 ms |
| --- | --- | --- | --- | --- | --- |
| g | `301/3699/6/frame-g-003699-6-0100.fits.bz2` | 200 | 2,880,390 | 53374522cb666e0c32a57376a3bd4b53c1a9a2140c2c5111a66a77598a54ca64 | 10,795 |
| r | `301/3699/6/frame-r-003699-6-0100.fits.bz2` | 200 | 3,056,156 | 80fb916ec554f7e6538690ba19da16249f69d4a5d2b0c79647fa84b8efb1a351 | 4,654 |
| i | `301/3699/6/frame-i-003699-6-0100.fits.bz2` | 200 | 3,197,532 | 1d554a9b1753c746efd3632d13bd7f976c12e315b52bd2d4d449645b74b35ade | 9,225 |

三帧实际合计 **9,134,078 bytes**。`frame-acquisition.json`逐项绑定完整 URL、身份、HTTP、bytes、SHA与取得时间。当前取得脚本只准入 bzip2 签名/原字节，状态明确 `RAW_ACQUIRED_UNCHECKED`；它不证明解压后科学数组、HDU身份、配准或质量。共享 reader 的后续报告另行验证，不能把 raw 回执原地伪改为原先已验。

一个 2048×1489 源帧不能覆盖当前 13.65′北向概览方形；完整 target 的 field 集合和实际覆盖必须按真实 WCS/样本求交。三波段 acquisition 齐全也不等于母图范围齐全。新 science master、显示映射和 PNG 候选仅在 ignored output 小实证；旧 served JPEG/清单及所有历史兼容品保持。

## 成本与执行边界

上述为本机离线一次真实获取的 body bytes 和网络请求耗时，不是客户端人均出口、正式服务器 RSS/流量或200 DAU容量。未购买任何服务、要求定制授权或新付素材费用；运营网络、离线加工、存储和持续批量获取容量/费用仍需各自实测，未知不填零、不将 agent 请求耗时折算时薪。FITS 母图不会按用户请求传给手机。

后续沿单一 shared owner 核完整数组/身份、实际 footprint/非有限与未知 detector-quality，保有限零/负科学值；从同一已配准母图固定颜色映射与层级，科学 availability 独立于展示 alpha。新产品兼容依赖见[接口审计](experience-sdss-corrected-frame-owner-audit-2026-10-02.md)。完整范围、颜色、背景矩形、真实清晰度/配准、生产新合同、微信原生与最终体验均未验收。
