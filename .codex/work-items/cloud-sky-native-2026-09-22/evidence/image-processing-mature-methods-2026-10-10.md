# 天文图像背景与透明：成熟方法及经验回写

2026-10-10。用户指出NGC246持续迭代仍有矩形底色，要求调查成熟社区方案，并把能提效的方法主动沉淀到Context/skill。本记录回答该问题，不替代唯一PLAN或完整33项验收。用户提供的明显方框Scene附件已按原字节保存为`output/astro-image-methods-research-2026-10-10/user-provided-ngc246-scene.png`（1,709,955B，SHA-256 `f7e539507f0f5e1727c352eb9d257ab2bc00dcbf3e73d3597e3f6ecc211c0eb3`），不依赖临时剪贴板路径；它不是当前版运行证据。后续较轻残底候选同样没有图质通过，见[实际加工记录](image-background-and-denoise-2026-10-10.md)。

## 结论与本地诊断

完全不贡献背景可以实现，但不是给文件加一个alpha通道就完成。当前难点是从已拉伸的RGB照片中区分残余背景、噪声和弱天体结构，并让显示加工与真实合成一致。不能承诺任意成品照片都能自动做到所有弱结构无损、底色同时精确归零。

本地`sky-artwork-level-composition.ts`已经区分几何/有效性与显示贡献。旧路径按最大编码通道构造贡献，并非把完整照片不透明盖上；显式背景variant采用逆sRGB后相加再编码。有效黑仍供应细档，但其显示贡献为零。`optical_display_background.py`用Photutils估计平滑背景后扣除、将负残差截为零。正残差与噪声仍可留下方框；“正值截断导致偏亮”是可解释的机制，当前JPEG/模型残差不因此被认证为高斯噪声或唯一根因。

前序错误在于：在一个失败样本上持续完善处理顺序和出版接线，没有足够早把“背景估计是否正确”和“素材是否满足叠加显示要求”拆开，并用最小真实Scene决定方法是否值得扩展。已有代码、真实输出和失败全部保留；不把本轮资料阅读计为图像修复完成。

## 成熟参考及适用边界

| 责任 | 一手资料确认了什么 | 对Starward的判断 |
| --- | --- | --- |
| 显示素材与合成 | [Stellarium桌面指南](https://github.com/Stellarium/stellarium/blob/e0750c36b5becfe8704424edb6fd40e5c51531af/guide/ch_dso.tex#L450)要求为纹理准备纯黑背景，避免近黑方框；[实际图层代码](https://github.com/Stellarium/stellarium/blob/e0750c36b5becfe8704424edb6fd40e5c51531af/src/core/StelSkyImageTile.cpp#L289)在相应分支使用additive blend。 | 成熟流程也需要离线素材准备，并非渲染器自动认出星云。借鉴职责分离；不照搬其抹星、尺寸/裁图、PNG透明约定或将显示黑当科学缺测。 |
| 背景梯度 | [Siril 1.4.4文档](https://siril.readthedocs.io/en/stable/processing/background.html)提供RBF/多项式背景模型，强调样本避开天体；区分减法与除法，并提供命令入口。 | 当证据指出现模型有空间梯度误差时，是合适的对照候选。已拉伸RGB不等同其线性观测加工，去梯度不保证噪声或显示底色归零；没有本机试用/采用结论。 |
| 无样点AI或可编辑样点 | [GraXpert README，固定提交](https://github.com/Steffenhir/GraXpert/blob/c3bc2211f8a4bee864d301987e9a154ad4480969/README.md)列出RBF/Splines/Kriging与AI、CLI、固定模型版本、保存背景模型、preferences样点入口。 | 可以有界比较背景估计，不必先自建复杂拟合器；AI不等于已证明保弱结构。尚未安装/实测，不替代SXT或NXT决定。网站几个细节页仍是TODO，不能凭菜单宣称输入适用性。 |
| 现有成熟数值基础 | [Photutils 3.0背景文档](https://photutils.readthedocs.io/en/stable/user_guide/background.html)分别处理背景与RMS、源排除mask与缺覆盖mask；不存在适合所有天文场景的单一估计法。 | 当前已复用其网格/稳健统计，不是从零发明估计器。应该诊断剩余职责；背景模型mask只排除统计样本，不是保护目标像素不被扣除，也不是显示蒙版。 |
| 转成软透明 | [GIMP Color to Alpha](https://docs.gimp.org/3.2/en/gimp-filter-color-to-alpha.html)同时改颜色与透明度；提高透明阈值可以清掉近背景色，但不再保证重新合回原底色能精确复原原图。 | 它解决颜色分离，不识别天体语义。可作为显示贡献/软蒙版参考；直接全图抠近黑可能抹弱外围、暗区，不能作为默认放行或质量证明。 |

补核了[Stellarium Web renderer](https://github.com/Stellarium/stellarium-web-engine/blob/15cd08a266a9fed1081bb5cd8fe62984943a9286/src/render_gl.c#L1521)的普通透明与`PAINTER_ADD`分支及`photos.c`调用。仅这些代码不能证明其全部DSO/巡天使用同一配方、同一颜色空间或公开完整预处理，因此不以Web产品外观推定未知算法，也不复制引擎源码进入项目实现。

固定源码及GraXpert README只读副本在`output/astro-image-methods-research-2026-10-10/`，原许可头保留，供核对；生产实现没有引入其代码。官方文档按上述读取日期/页面版本记录。未采购、调用外部解算服务、上传图像或向社区发消息。

## 当前采用的工作方法与下一项判定

采用“**先区分背景模型、噪声、显示贡献与真实coverage，再用成熟同机制方法做有界对照**”；没有采用新的通用去底算法。维持SXT批处理、PS可编辑异常修复、NXT按需和原Prepared/Scene责任。

NGC246下一次相关试验应回答：在有证据的背景范围和已观察弱结构保护范围内，明确的显示黑位/贡献准备能否消除矩形且不引入可见结构损失？先复用已有整图、ROI和真实背景Scene作小对照，不先新增一套producer和完整E2E。若已知弱结构受损、背景判断无支持或仍有方框，保失败并换有依据的方法/来源；没有决定性新输入不重复同参数。只有诊断表明平滑模型本身错误，才转向Siril/GraXpert背景模型对照；它们不是“透明按钮”。这属于PLAN C/D内局部选择，未修改PLAN。

独立适用图像继续沿原批次。集中内容复核覆盖各自素材；来源、缓存、LOD和Back/退出仍按共享机制在批次节点验证，不变成逐图开发循环。

## 本轮已回写

- `.codex/skills/starward-astronomical-imagery/SKILL.md`：未知机制/无效迭代的主动调研触发；有界问题、反例、退出及扩批条件；按输入含义分流；避免先做完整接线；主动回写经验。
- `AGENTS.md`：图像工作自动路由到该技能。`agents/openai.yaml`允许implicit invocation；无需每次修改Goal才触发。
- `project_context/development-workflow/resources-and-artifacts.md`：确认的职责、适用限制、重评条件及入口；修正过时的NXT“无native variant”说法，仍不赋予采用资格。
- `project_context/external-capabilities.md`：成熟候选及原选择的边界；资料支持与实际采用分开。

经验按“输入/问题 → 方法/入口 → 观察收益 → 反例/限制 → 证据及重评条件”沉淀。稳定操作归技能，项目决定归Context，算法/参数归原代码/声明，实际运行归回执/证据/简短交接；没有新知识就不新增文档。Goal正文和全部33项保持，不要求用户再次覆盖。

## 检查与新增发现

在核实际批处理owner时发现`background_batch`的父加工阶段变量被首个成功job目录覆盖：后续job收到错误stage，最终回执可能因WindowsPath无法JSON序列化而失败。已将父阶段与输出目录分离，没有重新处理既有素材或修改历史回执。

`test_optical_display_background.py`新增同一回归覆盖两个允许父阶段，各跑“成功—坏mask失败—成功”，实际估计器、RGB/ICC、保存像素与最终回执均执行，仅已审父源资格用fixture替身。修复前两个子场景均实际报WindowsPath序列化错误；修复后相关三个测试文件共9项通过。日志`output/astro-image-methods-research-2026-10-10/batch-stage-before.log`与`batch-stage-after.log`。该检查证明批次控制/输出合同，不提供真实星云图质或实际NXT父资格证明。

Skill通过`skill-creator/scripts/quick_validate.py`。用户随后明确要求专门定义云观星素材提取目的、SXT的局部角色、技能主动维护自身、防膨胀及准确加载，本轮已归入同一技能与AGENTS/Context入口，未新增第二技能或方案。触发以实际生产链为准，包含只读诊断；自更新以改变后续动作的证据和复用价值为准，优先合并/替换。修改自身不取得改变目标、权限、质量标准或自动通过失败的权力。

人工语义走查采用以下正反例，不写一个复刻关键词规则的假自动测试：

| 任务场景 | 应有行为与当前规则核对 |
| --- | --- |
| 云观星星云照片叠上去有方框，请只调查原因；没提SXT | 加载；定位背景/噪声/合成等责任，已有假设不成立时查同机制成熟方案；只读请求不自动扩成加工授权 |
| 把同来源下一批ESO星系接入云观星 | 加载；先核适用性并批量复用，不能重新选型或逐图跑页面 |
| 去星后星系细颗粒丢失、亮星残环 | 加载；按真实结构与模型异常分流，有限证据不能推广成所有星系统一配方 |
| 图像加工缓存身份或NXT前后顺序错了 | 加载；修原处理链/声明/恢复，已知代码故障不启动无关算法调研 |
| 月球真实纹理的覆盖、重投影或接缝 | 加载共用图像方法并读取月球owner；不套SXT去星或深空照片合同 |
| 只查星表、坐标或时间/姿态计算 | 不自动加载；只有涉及图像生产/融合含义才转入 |
| 做星空宣传海报、封面或普通照片抠图 | 不自动加载；“星空/抠图”字面相同不构成本场景 |
| 只改云观星按钮排版或通用HTTP缓存 | 不自动加载；沿实际UI/通用服务owner |

维护规则走查：有证据的可复用显示贡献诊断→合并技能操作规则；项目采用NXT的具体条件→Context；单次NGC246数值/截图→本证据与回执；稳定批处理检查→既有代码；未证实的新方法→候选，不能改质量标准。规则的静态一致性与格式校验均不证明新对话模型的实际选择率或独立执行效果；未做独立Agent测试，独审MISSING保持。

## 现有操作知识迁移

用户随后要求把已有SXT等操作说明迁入该skill，选型背景保留Context。本次沿实际源码和已有README/Context迁移，没有重新选型或加工图像：

- [批量指南](../../../skills/starward-astronomical-imagery/references/batch-processing.md)：来源准备、完整/部分覆盖分流、SXT本机入口与组批、缓存/显式成品导入/review-only区别、集中复核、本地候选和Scene批次交接。
- [异常指南](../../../skills/starward-astronomical-imagery/references/exceptions-and-fusion.md)：误删/残环/噪声/底色/缺供给分流、PS冻结蒙版及实际重开PSD读回、NXT与背景有限顺序、方框/透明的实际消费者诊断。明确SXT完整RGB无需为了后续阶段额外经过PS，`SXT_ORIGINAL_RESTORED`是可覆盖两者的父阶段标签。
- SKILL正文保持83行，用两份单层按需引用；复用原AGENTS及implicit路由。README的对应区段移除操作命令/试验状态，保接口、producer与兼容合同；修正“所有NXT无publisher”的过时表述，仅旧coverage试验仍受该限制。Context移除重复操作与对象进度，保采用事实、理由/边界/重评条件及新入口，external-capabilities选型背景未修改。

核对了SXT、ESO、PS恢复、背景、native候选、派生区域及有界NXT共7个现有CLI的`--help`，并沿源码核参数、父阶段、复用及失败语义。技能quick_validate在现有图像Python加`-X utf8`后通过；PATH默认Python缺PyYAML及Windows默认GBK的前两次环境失败留检查记录，没有安装依赖或修改系统环境。135处本地链接/标题锚点均可解析，README/Context改动区段以外字节与迁移前完全一致；`git diff --check`通过。此次只改文档，未重复模型/PS、图像编码或前序9项代码回归；这些静态检查不增加图质、原生、容量或独审证据。

迁移前精确工作副本与hash在`output/astro-image-methods-research-2026-10-10/skill-operations-migration-before/`，结构检查为同目录上级`skill-operations-document-check.json`、`skill-operations-validation.log`。所有历史FAILED/UNKNOWN/MISSING及实际输出保留，Goal/PLAN/33项不变。
