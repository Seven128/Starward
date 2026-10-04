# M82 当前处理标志、原噪声与实际恢复供给闭合

2026-10-04，r106；Goal active、无预算。实时原工作区、分支 `codex/remote-main-20260908`、HEAD `72e65cf309d700cb7d40c5b7afd53660fd39fa35`；原 BFF/watch和六项 Settings/outbox 保持。只有5个新 Sky task 与4份归属文档，无production/其他业务/candidate/原SCI/recipe/出版修改、提交或发布。

## 新证据改变下一行动

直接复用 r91 实际 native stencil flags、r92 版本v2原来源 marginal/qualification及两个真实 recovery raw/supply、r94当前有效资格/protected/估计。在全部四窗，原 marginal 有限正值、没有 stencil geometry 缺口；**原不 qualified 精确等于正权重处理标志排除的并集**。没有再读帧、投影、生成variance、拟合/滤波/恢复或tone试验。

两个条带的 r92 实际 effective q/protected 与当前r94图精确；当前 q=原q∪实际supply。原 marginal 与原signed SCI重新读回 ratio/protected；只在没有替代supply的原身份上用于解释当前保护，**不能把原variance套到换过RUN的样本**。下方/暖核无替代供给，原q/protected=current。所有current unknown保原SCI、current strong保其实际raw来源，原科学资格与显示恢复资格没有混成一层。

| 实际128²窗 | 原处理排除 | 合格替代供给 | 仍无合格替代、保原SCI | 其中当前r占优 |
| --- | ---: | ---: | ---: | ---: |
| outer-stripe | 978 | 160 | 818 | 257 |
| upper-stripe | 969 | 122 | 847 | 470 |
| lower-galaxy-stripe | 1053 | 0 | 1053 | 0 |
| warm-core | 444 | 0 | 444 | 0 |

合计282个真实替代供给、3162个仍处理排除、其中727个r占优。上述未恢复点全部含INTERP，外围/上方另有8/2个CR，下方475 SATUR及15CR，暖核只INTERP；各plane可重叠，不能相加当不同点。它们是既有noise policy拒绝的处理标志，不证明每个点必然物理损坏；但其原值仍进入当前显示，不能把已知处理风险认作质量通过。

上方原来源qualified strong中的r占优6958点无这些排除标志；其中6336点r带达到现有条件ratio≥3（g4333、i485可重叠）。这不提供发射谱线分类、真实检测概率或SKY系统误差；足以否决“绿色一律属于INTERP坏样本”。外围另有7812个qualified弱点radius8未达目标，其中2365r占优，仍属另一恢复问题。当前绿色/颗粒/整体图质继续开放，不从四窗推出完整4M图的风险比例或采用范围。

四完整实际mask图已看：[外围](../../../../output/sdss-m82-current-source-classification-1004-r1/outer-stripe-actual-classification.png)、[上方](../../../../output/sdss-m82-current-source-classification-1004-r1/upper-stripe-actual-classification.png)、[下方](../../../../output/sdss-m82-current-source-classification-1004-r1/lower-galaxy-stripe-actual-classification.png)、[暖核](../../../../output/sdss-m82-current-source-classification-1004-r1/warm-core-actual-classification.png)。这是flags/供给/统计状态，不是自然彩色或星体质量图；现有样本不封顶。

## 供给查询的实质缺口

直接读取已有 [field request plan](../../../../output/sdss-m82-stock-and-fields-1004-r1/request-plan.json) 和取得的帧责任，原字段发现从25个TAN点的`sdssPolygons.primaryFieldID`选8个字段，实际6个参与母图。这个路径没有证明其他重复观测查全，不能把缓存中无替代泛化为所有SDSS无源；不重跑原查询或重下载18已有源。

新增一次官方 `fDocColumns('Field')` 查询，保存431列原CSV31327B、SHA `f080b1d4081a9ec23937b220d0f4e358dc6c054de90fdde236d25fcdcf08a31d`，直接确认fieldID是bigint、raMin/Max/decMin/Max为deg、MJD(TAI)及processing status含义。[schema receipt](../../../../output/sdss-m82-secondary-field-schema-1004-r1/receipt.json)。这只确认结构，不提供新帧或资格。

随后沿该结构查询不受primaryFieldID限制的Field边界候选：用原25点极值加1角分搜索护边，不冒精确TAN覆盖；SELECT TOP257、限200KB，若截断不得称完整。该HTTP读取**TimeoutError，26.110817s，状态UNAVAILABLE_OR_UNCHECKED_NOT_EMPTY**，没有取得rows/raw，不能记为0字段或无供给。[失败receipt](../../../../output/sdss-m82-secondary-field-candidates-1004-r1/receipt.json)。每次仅1请求/零自动重试/no redirects/TLS验证，source frame downloads=0。公开文档搜索/不可访问browser页面尝试另属研究查询，不宣称整轮全部网络仅两次。保存失败，不因超时循环同查询；下一核提供方空间索引/实际重复观测发现路径。

## 实际开发验证和资源

[producer](../scripts/experience-m82-current-source-classification-2026-10-04.py)保存四NPZ/状态/图；[result](../../../../output/sdss-m82-current-source-classification-1004-r1/result.json)26321B，SHA `d0c7933323438734d0b1b1c4f6eb3b8d42f1016583063dc8c9ce57821066eb79`。10.265651s、CPU10.1875、offline peak WS83910656B/pagefile438968320B，仅本机offline，不供端云/native物理总峰。

[scalar reader](../scripts/readback-m82-current-source-classification-2026-10-04.py)无producer import/模型重跑，逐点positive contributor bits重建flags并与源收据plane/count/当前maps精确；196608个比率采用math.sqrt读回精确，供给身份/原-effective边界、保强/保unknown全部精确。2.414235s，[结果](../../../../output/sdss-m82-current-source-classification-readback-1004-r1/result.json)。closure另从原CSV核431schema rows、完整字段含义、primary-only旧条件及无结果timeout状态，见[metadata readback](../../../../output/sdss-m82-current-source-classification-readback-1004-r1/metadata-discovery-readback.json)。自审不冒独审MISSING；成功数值不抵销metadata获取失败或图质缺口。

编辑前4文档按r105原绑定封存；499旧源允许这四owner外/9407旧证据/六保护精确。新development、classification/readback、schema/candidates五个Windows目录按文件身份实测，见[allocation](../../../../output/sdss-m82-current-source-classification-readback-1004-r1/allocation-and-observation.json)，排除后续文档/log/checkpoint/continuity、旧数据依赖、FS内部及真实Linux retention/端云容量。Context/diff及原分支/进程/暂存项见[r106 checkpoint](current-execution-state-2026-10-04-r106.json)和随后continuity，不倒填早代运行事实。

## 唯一下一依赖

先补真实重复观测发现责任：复用已取得官方schema和旧primary-only查询/缓存inventory，核提供方空间索引查询/未筛primary的实际source候选；不同HTTP或catalog结果仍须说明发现范围，空对象目录不等于无frames。只获取缺失且实际能覆盖风险区域的必要来源，保商业源边界、hash/processing身份、完整gri、native flags/current noise和RUN/MJD独立性；符合后才给共享recovery新真实供给。禁止重复下载已有数据、无依据新设施/源重加工，禁止以局部补色/减真实星系/alpha隐去缺测或生成细节填补原值。整体catalog/帧库覆盖或source quality未验证时保unknown。

已有处理flags/原-current资格关系本轮闭合，不重跑旧noise variance/PSF/146响应/coaddfit/矩阵或旧曲线。r103肩部和原SCI/alpha/WCS/recipe/publications保持；282替代已存在，不重复恢复当新进展。图质/完整批量出版/成本未过，普通registries仍空。高DPR正常完整来源/default预算/native物理、M51矩形FAILED、W3覆盖、strictBack历史失败、WXMLFAILED、手机不可用/newMoon未推、真实retention/混合200DAU、独审和原33义务全保。Goal未完成，不暂停/blocked；本次一次metadata超时不是整目标阻塞。
