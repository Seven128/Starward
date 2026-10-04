# 当前 SDSS 来源配色说明与质量判定边界

本次修改实际共享 `SdssOpticalImageryService.source()` 的 `limitations`：i→红、r→绿、g→蓝是巡天波段处理合成色，并非肉眼自然色；不同来源可使用不同配色，不能仅凭绿色或棕色判定噪声、伪影或无观测。legacy 和显式 science 共用该说明，没有修改发布清单、图像、recipe、注册表或采用政策。

## 来源依据与适用范围

[SDSS 相机说明](https://www.sdss4.org/instruments/camera/)和[官方 2.5m imager 灵敏度表](https://classic.sdss.org/dr3/instruments/imager/filters/)支持不同巡天带的响应差异。6580Å 表格样本的 r 点源/大源响应为0.4852/0.4906，i为0.0003/0.0003；g表没有该波长样本，不能把未列表域外值填零。表的点源条件为 APO 1.3 airmass，大源列含探测器红外散射差异。它是2001年平均参考，不是本候选六个 field 的逐CCD/逐曝光实测响应或完整系统吞吐。

由 r→绿色的实际配色规则，可以推断某些较强 r 带结构会呈绿色；这仅解释为什么“绿色必为伪影”不成立。响应表不能证明 M51 某个具体绿点是 HII 区或给出实际谱线通量，也不能代替逐像素 flags、逐带配准、PSF、噪声、校准和弱结构证据。没有用表重标当前科学数组或反算线流量。

既有 HST [源页](https://esahubble.org/images/heic0506a/)描述 B/V/Hα+[NII]/I 处理图，与本候选 i/r/g 调色并非同一测量/处理基准。本次直接读缓存 `output/hubble-m51-source-quality-trial-1002-r1/source-page.html`，61,937B，SHA256 `56a9908293e798465a80dffc89e5292d8854074c06c55278aa36004aa97477c7`；没有重下载该页、JPEG 或完整 FITS。官方文档查询属于研究流量，不能记为全部网络零请求。

## 当前消费者结果

任务脚本：[当前来源/文本消费](../scripts/experience-sdss-source-colour-semantics-2026-10-03.mts)。[保存结果](../../../../output/sdss-source-colour-semantics-1003-r1/result.json)，33,368B，SHA256 `2496241bf49758143fa4c1c8691cb350ed72ba2e15d1dedcb02d8a99a8b68329`。

复用六个真实 legacy 出版和两个已封存显式 science 出版，当前 Nest/Fastify/controller 实际返回与共享 owner 一致；8个来源的版本身份、许可、精度、原限制保留。提取当前 `Provenance` 函数、用受控 JSX/hooks/time 执行，新增说明及全部限制出现在保存文本中。期间两个 science 清单、缓存HST源页和六项受保护修改前后 hash 一致；图像请求0、加工0。此文本消费者是受控开发验证，不是目标原生页面/Back、普通采用或完整视觉验收；未证明既有 BFF 已加载最新源码，新增量独审 MISSING。

受影响的既有 `sdss-science-optical-imagery.test.ts` 与 `celestial-source-recovery.test.ts` 在 worker 正确 cwd 下7项通过。首次从仓库根运行使用错误的 TS decorator 配置，celestial 测试文件在 bootstrap 时失败；science4项通过不能抵消该失败。改用原 worker tsconfig 对应 cwd，没有修改构建配置或掩盖历史失败，不重复完整来源链矩阵。

## 对唯一下一依赖的影响

整图质量继续开放：暖底/颗粒、低亮度插值、疑似绿色晕圈、单扫描资格、弱结构、完整配准及背景矩形均没有因说明文本而通过。后续须先区分真实波段颜色、已知 flags/插值和处理产生的偏色，再处理有实际源资格支持的缺陷；不能全图去绿、凭颜色扣背景、强行匹配 HST 配色或扩大亮核 SAT 规则。已知失败、缺源和 native/device 缺证维持原状态。
