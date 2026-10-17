# 合规供给与加工提效归并

范围：用户明确授权把合规来源获取和Pro建议整合进既有唯一PLAN/相关Context，并补充“署名是公共文案映射与渲染的后续工序，不逐图人工校对”。本记录保存选择依据与边界，不是第二方案、运行日志或新采用清单。完整要求见[REQUIREMENTS](../REQUIREMENTS.md)，实施方法/试点界限只见[PLAN](../PLAN.md)。

## 研究输入与本项目背景

- 用户指定[云观星素材调研](https://chatgpt.com/c/6ac97df1-8bf0-83ea-b6c0-fdd555d421d9)。read_thread的单条20,000字符输出曾截断；本次从用户已有Chrome页面读取完整研究及第八、九节试点/最终推荐。研究建议不是项目实测或许可证明，未照单引入其未检查的依赖。
- 用户观察当前约每小时3–4张仍难直接用，不能由此把1,000份换算成可接受的300小时计划。现有[图库核对](image-existing-library-reconciliation-2026-10-10.md)包含51目标W3、重叠SDSS及其它资源，17源仅是新加工增量；候选、文件通过、Scene合格和实际采用必须分开。此前失败与有效原图都保留。
- 当前已有完整原图producer、Prepared/HiPS、TAN/显示位置、批次Scene、精确来源与静态出口，不能把Pro提出的路线误当从零重建巡天引擎。实际源码入口为`publish_prepared_native.py`、`prepared_inventory.mts`、`benchmark-image-scene.mjs`、`PreparedOpticalImageryService`、现SourceSummary转换器和`sky/sources`的Provenance消费者。
- NGC7009支持直接原图路线的有限收益，但配准/权益等未齐；M104有限成员恢复不证明结构完整；NGC246/ESO378仍有底色/弱外围难题。旧PS1/Legacy/SkyMapper等源已有不同尺度的明确反例，不因换策略名称改判或复跑。

## 采用的判断

| 问题 | 本次取舍及原因 |
| --- | --- |
| 成熟方案是否等于买回就能用 | 否。Stellarium已准备纹理可省部分处理，但适用清晰度、结构、位置与许可不统一；WWT式生产链复用机构照片和元数据，自动获取/分级后审核；HiPS解决连续坐标/分级组织，不自动解决照片质量或内容权。复用这些能力，仍在本Scene判适用性。 |
| 合规来源怎样进入主线 | 来源级公共许可及获取条件核一次，按元数据和特殊条款自动分流；免许可费且适用的机构成品优先，Stellarium仅合格资产白名单，HiPS仅具体合格产品/区域。免费申请可尝试，等待/收费回复留独立队列；暂不采购，也不自动恢复既有排除源。 |
| 署名是否逐图审核 | 不做。获取前判可用权利，后续公共映射将credit、许可链接、修改/AI说明和适用数据获取入口送入现有来源/credit渲染。普通新增只增数据；只有真正新语义扩type/适配。全批机器核字段/版次/关联，共享模板和消费者按机制验证，人工只看缺项、冲突、明确单图例外。 |
| 为什么改变加工顺序 | 对未经预检的所有图先去星，可能制造成员误删、恢复岛和后期底色失败。改为实际Scene先判直接复用，星系/星团/密星保完整观测或连续区域，SXT留适用分支；已定PS/NXT不因此默认增加。 |
| 复杂图怎样控投入 | 共性规则按组修，普通例外有限修复/一次换源，保失败和成本；无新假设不继续黑位、降噪顺序或逐点分类。遮挡关键结构、无背景样本、缺外围优先补源/保缺口，不能生成或抹弱结构。 |
| 什么才算提效 | 去重合格成品与实际采用覆盖增加、重复生产有效工时下降。失败/返工不能从分母隐去；机器、等待、一次性适配、历史存量解锁分开。新增候选、LOD、截图或测试数不是新增交付。 |

## 未直接采用的推论

- 没有承诺通用自动去星/透明、全天统一高清或某个确定提速倍数。Pro的约7/17/36份每有效工时及千图工期是含合格率假设的模型，不是本机实测，未写成Context能力或排期承诺。
- 不为“保原照片”自动接受孤立矩形、新观察照片模式或取消原星空结构要求。照片/目录星协调只作用于绘制职责，目录身份、查询、点选、跟踪保留。
- Pro的1–2物理像素配准建议仅能作为特定显示条件试验参照，不是全局新容差；先按最大承诺缩放/DPR及局部重影判适用性，不能凭平均误差自动通过。
- 采纳有界试点、例外投入和分阶段扩批方法，界限集中在PLAN；它们不设置整个Goal预算，单图/试点退出不冻结独立批次。
- 付费素材暂不考虑；CC BY-SA图片或ODbL派生数据库自身的开放义务不一概排除，但不是对整个自有代码或业务数据的开放授权，也不是任意物理隔离即合规的保证。

## 主要一手依据

- [Stellarium纹理准备指南，固定提交e0750c3](https://github.com/Stellarium/stellarium/blob/e0750c36b5becfe8704424edb6fd40e5c51531af/guide/ch_dso.tex)描述背景准备、坐标和实际引擎查看；[项目CREDITS](https://github.com/Stellarium/stellarium/blob/master/CREDITS.md)是资产追溯入口，实际取用需绑定所选版本及具体文件，不以程序许可推定素材许可。本次复核尝试的`nebulae/default/CREDITS.md`地址返回404，不将该路径当已核依据。
- [WWT Toasty pipeline](https://toasty.readthedocs.io/en/latest/pipeline.html)支持增量获取、处理、审核后发布；该文档也明确AstroPix适配器需更新，故采用生产职责而非假定旧工具即装即用。[AstroPix官方开发入口](https://www.astropix.org/page/developers)提供结构化发现/AVM资料，图片权益仍回具体来源。
- [ESO使用政策](https://www.eso.org/public/outreach/copyright/)的默认CC BY 4.0及例外、完整可见credit/有效链接、修改与AI说明适用其具体材料；明确公开许可足够时不需要逐位联系credit作者。[Legacy许可/署名](https://www.legacysurvey.org/acknowledgment/)只覆盖其所述自制图层，不能外推查看器中所有第三方图层。
- [CC FAQ的集合与改作区别](https://creativecommons.org/faq/#if-i-create-a-collection-that-includes-a-work-offered-under-a-cc-license-which-licenses-may-i-choose-for-the-collection)、[BY-SA兼容许可](https://creativecommons.org/compatible-licenses/)和[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)支持分别处理素材、派生物与数据库责任；具体交付仍按真实授权及组合关系落实。

既有官方研究、HiPS权益/显示反例继续沿[外部能力owner](../../../../project_context/external-capabilities.md#云观星合规图像供给)及其引用复用，不重新普查全部来源。本次只修订文档，未申请许可、下载素材、重加工、改产品代码或普通采用；全部33项验收未升级，适用独立审查仍MISSING。

文档检查：`npm run context:validate`及限定文件`git diff --check`通过；相关本地Markdown路径已检查，33个验收ID完整且无重复。结构/链接检查不认证图质、署名渲染实现或完整Goal完成。原dirty工作区保持，工具Goal仍paused/无预算，未重建、修改内部状态或标完成。
