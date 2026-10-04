# C：M42 原始强度／覆盖实证与出版有效性边界

本轮沿唯一 PLAN 继续 C 的真实输入缺口。保留原生 WEAPP／TWGL／Astronomy Engine、自有服务、全部商业排除与完整交互旅程；未更换生产源、修改出版 JPEG、增加掩码或重发候选。Goal active、无预算。新成果是取得同一 AllWISE 官方档案的成对原始输入，改变了质量处理的下一步，**不是 M42 质量已修或整张图有效性已验**。

## 用户结果及决定

M42 的核心黑条纹在现有原始 JPEG 中，不能靠改相机原点或共享矩形背景透明度消除。新原始样本进一步区分：

| 责任／实际输入 | 结果 | 对下一步的影响 |
| --- | --- | --- |
| 原始 W3 强度与对应 coverage | 同 coadd、同 BAND、同 WCS／尺寸；存在 NaN 强度与明确零 coverage 区，也有仍具 coverage 的低响应条带 | 不把 NaN、低亮度、零 coverage、条带混为一种状态；正 coverage 不证明没有伪影 |
| 已发布 M42 DETAIL JPEG | 在相同天空位置的局部映射中，NaN 对应区并非全黑，映射到该区的 JPEG 灰度中位数为255 | 禁止用 JPEG 黑色阈值生成“有效性mask”；亮度透明处理也不能修复已知源缺测或低响应伪影 |
| 独立源 WCS | 原始 Atlas 是 SIN，CRPIX不在小切片内；出版切图是 TAN | 原始数据核查必须按各自完整 WCS 转换，不直接套 TAN或把头部CRPIX改成中心 |
| 既有客户端／出版 | v2 保留 `NOT_MEASURED`／`null`，现有JPEG及v1兼容仍不变 | 此局部样本不能回填153张成品覆盖率或未经核实的mask；版本化像素／mask需由同一出版owner保持出处、几何与旧offer |

[官方 AllWISE 警示说明](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec4_4.html)分别描述饱和剔除形成 NaN／零coverage、漏标饱和以及W3/W4低响应条带，并在Figure6专门举猎户座星云。它也说明Atlas与星表的绝对天文位置可有系统差异；取得WCS不自动等于绝对配准已通过。[coverage物理定义](https://irsa.ipac.caltech.edu/data/WISE/docs/release/All-Sky/expsup/sec2_3d.html)是经PRF加权的有效观测深度，允许非整数，不能当质量置信度。

## 有界获取与真实数值

依据[官方AllWISE IBE产品文档](https://irsa.ipac.caltech.edu/ibe/docs/wise/allwise/p3am_cdd/)及[cutout文档](https://irsa.ipac.caltech.edu/ibe/cutouts.html)，只查询已有M42中心、W3一次：返回1行`0835m061_ac51`，3086B，SHA256 `63872d21eabb8996c86fc2c4aa76a22f8a9e24228733ba85b25c1a1e7df0951c`。[查询脚本](../scripts/experience-w3-atlas-input-2026-09-29.py)、[日志](experience-w3-atlas-query-2026-09-29.log)、[原元数据](../../../../output/allwise-w3-atlas-0929/atlas-metadata.tbl)保留。

随后对该coadd中心请求512原生像素强度／coverage。服务按圆整后的闭区间返回**513×513**，不是生产图片尺寸错误；官方[实际文件目录](https://irsa.ipac.caltech.edu/ibe/data/wise/allwise/p3am_cdd/08/0835/0835m061_ac51/)列coverage为`.fits.gz`。Astropy负责FITS、IPAC表和SIN／TAN转换，未自制通用解析器，库只安装于ignored任务输出，不加入生产依赖或修改月面环境。

| 原始输入 | 体字节 | SHA256 |
| --- | ---: | --- |
| INT，BITPIX=-32，513² | 1,059,840 | `9d6b40cd400a6a6c6c498334e62d7182f13f9f8a165b160d21b9424596d5003e` |
| COV，BITPIX=-32，513² | 1,059,840 | `e121a8761c6f2d49e125a540fb6700f3316b721433ff30c6b1c8a8ce2afd9df7` |

该**局部原始采样**263169像素中：非有限INT102458；零coverage99949，全部同时非有限；另有2509非有限INT对应非零coverage；coverage≤4为143128。其coverage范围0–14.22265625，有限INT范围−184.2723–10612.8398 DN。上述数字不是当前JPEG的有效比例，也不证明原生样本每个正coverage点都正确。

WCS为`RA---SIN/DEC--SIN`，CRVAL=(83.544613,−6.057778)，CRPIX=(971,−1492)，CDELT=(−/+0.0003819444391411°)，CROTA2=0。独立转换到既有M42 DETAIL TAN坐标时，只取原始切片内最近样本：覆盖12321个JPEG像素，其中对应非有限4819、零coverage4716；前者JPEG灰度中位数／最大值为255。JPEG自身hash `965ed61ae40bd1b4277244e6463babdb6ec7e064b8c8f585b59dcdac756f9b72`未变。

这里沿用已测CDS切图的TAN半像素约定来比较天空位置；**新取得的是原始Atlas头，不是与该JPEG配对的CDS成品头，也不是HiPS精确重采样和全部输入瓦片的清单**。最近点采样仅用于源质量定位，不能直接转成产品掩码。原始coadd、HiPS加工、TAN成品、客户端显示是不同边界，仍须核确切成品关联／重采样后才能发布新像素或mask。此前CDS主／备用同请求超时未重试。

[完整成对结果](../../../../output/allwise-w3-atlas-0929/pair-result-r2.json)、[成功日志](experience-w3-atlas-pair-r2-2026-09-29.log)、[获取／诊断脚本](../scripts/experience-w3-atlas-pair-2026-09-29.py)保留。两张诊断图已实际查看：[原始INT／零coverage品红标记](../../../../output/allwise-w3-atlas-0929/m42-atlas-intensity-coverage-diagnostic.png)、[JPEG局部位置诊断](../../../../output/allwise-w3-atlas-0929/m42-jpeg-source-samples-diagnostic.png)。品红仅是任务分析标记，未进产品；诊断图不是修后画面。

## 未通过的试验与恢复

首轮脚本错误地断言请求512只能返回≤512，INT收到513²后失败；又把文档generic coverage名推成实际存在的未压缩URL，得到404。该轮[日志](experience-w3-atlas-pair-2026-09-29.log)和[结果](../../../../output/allwise-w3-atlas-0929/pair-result.json)保留为未完成，不计产品缺陷或源不可用。随后**新的只读头部／目录输入**确认513边界与真实`.fits.gz`文件后，只做一轮对应修正；此后所有成对结果成功。修正脚本先保留收到的字节，再验证，不因分析断言错误丢输入；不重跑这次已取得的请求。

没有云／BFF／Mini生产改动，不需为这一研究输入重复构建。当前最新准备候选仍为未打开的clean-v16，旧v12原生Frame／Context和4B夹具状态依然未知。本轮没有调用失去响应的原生RPC、重试被取消提权、开新窗口、推手机或轮询手机。已有源码新月面仍没有新版手机验收。独立审查、B3/C整体质量、完整旅程、目标资源／包体／费用及Android/iOS义务保留。

## 唯一下一依赖

在原出版责任内处理M42的成品有效性／源质量差距：复用这次输入，先厘清成品与原始coverage的确切关联和适用降级，再决定需要的版本化资源；不能凭局部最近点或JPEG颜色补全mask、填洞或调CRPIX。测量全153张科学mask不是新增普遍完成条件；已知缺测、错误位置或失真合成仍必须按实际消费者修复。没有新输入时转同阶段的组合／恢复差距，避免继续纹理微调或重复下载。

已有原生会话可安全恢复后，先退休旧v12，再以**一个v16**核既定A/D/C09/提交回复组合；否则其证据保持未验，不开窗口绕过。执行只按PLAN，本文是过程证据，不是第二方案。

## 收尾核对

[绑定核对](experience-w3-atlas-close-2026-09-29.json)确认原W3 v2清单hash、153张出版JPEG的原hash／字节和`null/NOT_MEASURED`都未变，两份新FITS与成对结果hash匹配，未打开v16指纹仍为`1123034a5afeee5731523aa95278997e88c81ff1eab70da42c23299b9250d032`；核对当时任务入口／报告268个本地链接存在，PLAN只有一个当前依赖。新科学输入／Python依赖均在ignored output，未入发布包。Context维护[结构检查](experience-w3-atlas-context-2026-09-29.log)和受影响tracked文档diff检查退出0；结构／链接／hash检查不证明体验质量、原生合成或独立审查。没有因纯数据核查重跑已通过的消费者／构建；Goal状态读回active、无预算。
