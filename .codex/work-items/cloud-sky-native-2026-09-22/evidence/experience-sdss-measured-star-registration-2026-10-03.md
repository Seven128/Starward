# 真实星点目录、逐带asTrans与保存输出的有界配准核查

2026-10-03，root。沿当前质量依赖补实际星点和颜色输入；不重复旧origin/color假设矩阵。无新科学影像下载、重投影、过滤、fit、全场shift或生产修改；新增量独审MISSING。

## 数据及资格

[实际一次六字段查询](../../../../output/sdss-registration-stars-1003-r1/query.sql)取得173条type6、mode1/2、clean1、nChild0、r PSF magnitude14..20的检测，保objID/fieldID/flags为十进制字符串，不经过JS浮点。54,988B CSV SHA256 `04a1a37273d3d08783454b19da9272c8735e94b3bdd771de6988123c0c6a91e7`，HTTP200、9.364秒，见[原回执](../../../../output/sdss-registration-stars-1003-r1/receipt.json)。取得回执始终RESPONSE_UNVERIFIED；另由分析脚本核列、非截断、唯一ID、实际field绑定和筛选条件，不能把HTTP200直接当目录资格。脚本首次console把hashtable交Select-Object导致显示null，实际CSV/回执正确；后修console并保executed-script，没有重发原查询。

3699/99、100、101和3716/116、117、118分别45/0/45/43/0/40条。两个中心字段不是完整星点覆盖；新增[仅中心遗漏记录的补查询](../../../../output/sdss-registration-stars-center-supplement-1003-r1/query.sql)保模式/type/亮度范围、放开clean/nChild，逻辑排除旧入选集。实际200响应只有264B表头、零行，SHA256 `ff1172f49a6461ca7061925307ea63b2b72c30adbf6f13b48ed3bcd8b6bc39cf`，1.411秒；不轮询、不重复下载旧173条。零行只表示该明确筛选未供应记录，不能当中心区没有恒星或物理零值。已有[Field质量核查](experience-sdss-field-quality-independent-review-2026-10-02.md)正记录这两个field的photoStatus=3/TOO_LONG、score0；相符的处理资格风险不证明本次缺行的唯一根因，也不授权改科学像素或恢复猜测模型。

## 真实坐标与保存图

[分析脚本](../scripts/experience-sdss-measured-star-registration-2026-10-03.py)字节绑定原六字段18个frame、旧asTrans审计/取得回执、真实科学/共同显示/flags/joint和六项保护；用当前reader准入原18份缓存，将完整asTrans逐值与旧保存metadata核对。当前输入前后相同。第一次启动引用了不存在的private RGB helper，在读取输入/分配输出之前失败；[失败和原脚本](../../../../output/sdss-measured-registration-1003-bootstrap/failed.json)保留。修任务适配为实际make_rgb_display API，生产不改。

[官方坐标说明](https://www.sdss4.org/dr17/algorithms/astrometry/)规定目录中心整数为像素边缘、band-specific DCR色值和r参考坐标。本次直接把实际目录rowc/colc输入公式，转换到FITS零原点中心时减0.5；g使用实测PSF g−r，r/i使用r−i。没有以最小residual在旧0/.5/1中选参数。沿旧quadrant-safe公式计算，未引入第三方解算器：PyDL[astrom尚未实现](https://pydl.readthedocs.io/en/latest/photoop.html)，无理由安装；整套Astrometry.net另有[GPL整体分发边界](https://github.com/dstndstn/astrometry.net/blob/main/LICENSE)，未复制或采用。

[结果](../../../../output/sdss-measured-registration-1003-r1/result.json)425,494B，SHA256 `2b1d33729c1d10550860bc67cc146d1fa464858ea0ac68b0962e88606862371d`。全部173检测的公式与目录差异：

| band | 完整asTrans→目录 median/p95/max ″ | primary TAN→目录 median/p95/max ″ |
| --- | --- | --- |
| g | 0.027282 / 0.079894 / 0.114115 | 0.048996 / 0.119394 / 0.166734 |
| r | 0.0000716 / 0.0001877 / 0.0002117 | 0.017733 / 0.067316 / 0.110427 |
| i | 0.021118 / 0.051722 / 0.526625 | 0.033428 / 0.092095 / 0.538411 |

这是实际目录中心/色值与metadata的一致性，包含逐带误差不同的检测；r相符不认证全部band。目录和frame共用上游解算，不能称独立绝对精度或完整母图配准；未取得扩展天体逐像素颜色，不施全图DCR。

153条在保存目标范围外；另外1条中心误差/源范围不合格，4条共同核心处理flags/availability不合格。其余15条检测可对照实际保存science与display-estimate。要求逐带centroid error≤0.1像素、PSF magnitude error≤0.1mag、joint存在、radius7内无INTERP/SATUR/GHOST/CR；NOTCHECKED不当坏像素。查已取得目录中的近邻，但未取得的暗星/星系混叠仍未知。15是检测数，含跨run重复，不是15独立恒星/曝光或覆盖上限。

radius7正残差矩与10..12环median仅用于对比：raw→目录最大差g/r/i为0.3561/0.3155/0.2919目标像素，共同显示造成的中心移动最大0.01126/0.01548/0.02018像素；i的新输出最大差0.31210并非所有指标改善。不能当PSF拟合、测光真值或完整显示质量通过。[实际分布星点patch](../../../../output/sdss-measured-registration-1003-r1/distributed-actual-star-patches.png)已查看八个目标格中的raw/estimate：中心/色核大体保留，细颗粒减少，但局部有暖边，未取得完整弱结构/色彩改善结论。未抹背景或生成细节。

## 当前决定和继续依赖

真实星点输入补上了旧声明假设诊断缺口，支持按官方中心约定处理这些目录星点；primary TAN确有小而非零的差异，完整公式不能单独解释或修复目前大片棕底/中央处理缺口。**不采用新WCS或整体shift，不把本轮15检测冒完整质量验收。** 中心字段星点供给和处理资格保UNKNOWN/有风险。

按PLAN继续完整候选的背景/弱结构/flags支持边界与真实源资格，避免继续色调/原点扫描；中心缺口需要真实可用源/处理依据，有限catalog不供应中心颜色/PSF或恢复被扣模型。当前显式候选、原v2/v3和default不变。新的正式出版、来源信用/权利、独审及端云成本仍待质量之后；native/Android/iOS/新版月面与完整旅程义务保持。
