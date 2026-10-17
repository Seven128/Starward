# PS 补测独立审查（2026-10-09）

审查人 `/root/ps_quality_completion_review`，与主线程分开。用户最新要求是 **PS＋RC/SXT 插件先看质量，不追加速度比较**。本审查没有调用 COM、Photoshop、原生 UI、模型推理或新渲染，只读取真实代码、既有输出、PSD 和 Scene 证据；获主线程明确授权后仅写本独审文档及独审产物。主云观星 Goal 仍暂停，本文件没有恢复或生产采用授权。

这是当前独审记录，不是第二份执行计划。唯一调度/恢复索引仍为 [当前计划](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-tool-full-comparison-2026-10-08.md)。最终报告、当前桥接修复、严格 ICC 的 Scene r2 及真实准入/复用边界已完成补核；本记录明确保留未通过的成品质量与未验证的使用范围。

## 已审查范围与证据

处理代码：`benchmark-image-photoshop.py`、同名 `.jsx`、`benchmark-image-photoshop-host.ps1`、`image-tool-photoshop-recipes.json`、固定 `image-tool-full-comparison-samples.json`；消费者增量为 `benchmark-image-scene.mjs` 的 PS 准入及 Prepared/HiPS 分支。

实际输出：`ps-only-representative-r3`、`ps-only-validation-r1`、`ps-sxt-quality-representative-r1`、`ps-sxt-quality-validation-r1`，共 **5 个输入 × 2 种配方 = 10 份结果**。PS 自身仅指本次冻结的高光选择/1px 最小值缩星/目标保护配方；不能由它推论所有 Photoshop 工具、动作、蒙版或手工修补的能力上限。

- [离线独审脚本](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/audit.py)、[机器读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/readback.json)、[完整绑定读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/bindings.json)。脚本独立解码公开 PSD 层记录、RGB/alpha/蒙版以及 PackBits composite，不调用生产适配器的处理函数。
- [Scene 独审脚本](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/audit_scene.py)、[Scene 机器读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/scene-readback.json)。仅验证已有帧，不重新测插件或渲染速度。
- [收尾补核脚本](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/audit_closing.py)、[当前 Scene/原生边界/复用机器读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/closing-readback.json)、[最终报告链接/命令及目录控制帧读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/report-links-readback.json)。全是离线读回，不调用原生 PS 或模型。
- 已逐张看 10 张 `comparison.jpg` whole 图，直接读取 lossless PNG 的结构 ROI；已看 M8 当前 HiPS 对照及 NGC253/NGC5128 Prepared 宽视/细节对照。

## 像素、PSD、ICC 与绑定

机器独审通过以下 **技术合同**，这不等于成品质量合格：

1. 10 份最终 PNG 都是完整 RGB8，尺寸与绑定原图一致；最终 RGB 与各自 Photoshop 原始最终导出逐像素最大差 **0**，ICC 字节与绑定 normalized 原图相同。
2. 6 份有目标保护的星系结果，mask=255 的核心逐像素等于原图，mask=0 的外围逐像素等于原始处理图。0–255 的羽化过渡与 gamma RGB 混合读回最大差小于 **0.5 个 8bit 色阶**。该等式证明叠加效果，不能证明椭圆就是科学正确的目标/前景分割。
3. 10 份保存的 PSD 确实包含独立 `Original (unmodified source)` 和 `Processed candidate` 层；星系另含保护原图层、独立 `-2` 蒙版通道。所有原图/保护层 RGB 等于原图、处理层 RGB 等于 `raw-processed.png`，最大差均 **0**；6 个蒙版还原存储裁切 bbox 后全图等于保护 PNG，最大差 **0**。
4. 全部 PSD composite RGB 等于最终 PNG，最大差 **0**；PSD 内嵌 ICC 等于原图字节。PS 高光选择另保存 alpha 通道，使 3 份星系 PSD 头部为 5 通道。Pillow 单独读取它们的 merged RGB 有假差异；独立按全部通道行长正确解码后无差异，不能把该读法限制误报为 PSD 错误。
5. **5 个 SXT 插件 raw 结果与此前实际运行的 SXT CLI 默认结果完整 RGB 最大差都为 0**。这是同输入/当前参数下的像素证据，不代表所有参数或未来模型都会相同，更不能用 CLI 时间冒充插件时间。
6. 首次实时读回的 **108 个唯一文件绑定全部匹配**。随后主线程修复剪贴板副作用，保存审计重放时 107 个当前匹配、1 个旧 JSX 指纹变更单独声明；数据、metadata、模型、工具、动作及产物没有绑定差异。旧处理证据绑定的 JSX 是 `e54c77a4e1610a1ca08f2c242d4af370b311d1e7f5c06b1faadf73c07eecb5fc`，不能说旧结果实际执行了后来修复版本。
7. 4 次既有批次均 `documentIdsBefore=[]`、`documentIdsAfter=[]`。这能证明这些运行没有遗留任务文档，不能单凭空集合证明已经保护了用户正在编辑的 dirty/unsaved 文档。

## 独立视觉结论

|实际观察|PS 自身冻结配方|PS＋SXT raw|PS＋SXT 8px 羽化保护后|
|---|---|---|---|
|NGC253 whole|缩星有真实效果，但只改变少量亮星；星场仍在|分离明显，盘面主体仍在|目标可编辑恢复，目标区前景星也回来；外围低密度和目标高密度差异可见|
|NGC5128 细丝 ROI `(285,350,370,440)`|蓝红细丝仍在|细丝几乎全被删掉，结构门槛 **FAIL**|细丝精确恢复，也恢复 ROI 内全部前景星；不是语义分割成功|
|M81 红结点 ROI `(140,205,195,275)`|红色结点仍在|主要红色结点被删，结构门槛 **FAIL**|结点精确恢复，但同样把前景星恢复|
|NGC5128 亮星 ROI `(805,618,875,688)`|主要缩核心/星芒，宽光晕仍保留|有淡黄弧残留|该前景亮星被完整恢复；其他 mask 外异常仍需要复核|
|M8 两原 tile whole|密集星仍显著，未完成分星；高光选择也会触及亮云区，不能当结构保护证据|去星明显，宏观发射云和尘带大体可见|本次没有合格目标蒙版，等于 raw；局部形态或小亮斑的科学有效性仍 **UNVERIFIED**|

局部证据：

- [NGC5128 细丝](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/ngc5128-filament-roi.png)
- [M81 红结点](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/m81-red-knots-roi.png)
- [NGC5128 保护区亮星](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/ngc5128-bright-star-roi.png)
- [NGC5128 外围亮星](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/ngc5128-exterior-star-roi.png)

羽化改善了原硬椭圆切换，但没有解决目标结构与前景星共存的问题。NGC5128/M81 whole 图仍呈明显星点密度轮廓。当前配方没有直接通过完整自动成品门槛；这不是“PS 或 SXT 没有用”，而是 **SXT 分层候选＋PS 可编辑修补载体** 有实际价值，自动保护规则还不能直接大批生产。没有实测人工修补/复核时间，不能声称合格成品/小时。

## 当前 Scene 证据及边界

**HiPS：**`scene-ps-hips-quality-r1` 共 6 主帧（原样/PS/PS＋SXT × DPR1/2），205 输入绑定、109 实际解析源码绑定。所有保存 PNG/hash/full RGBA 读回有效，原样两 DPR 等于既有冻结 baseline；每帧实际绘 10 tile、2 个目录对象，GL0/完成1/无失败/释放后资源0。目录关闭对照改变109pixels。只替换已测的28891/28892，另8片原样，即 **2/10局部集成**。

M8 实际对照可见：PS 缩星弱，SXT 处理片与未处理片之间星点密度差异突出。本次局部接缝是局部组合的质量问题；不能据它推论完成全部M8加工后的接缝必然相同。全区域、手机/小程序真机、科学细节和绝对配准仍未验收。

**Prepared：**`scene-ps-prepared-quality-r1` 共12帧=NGC253/NGC5128 × wide/detail × 两处理配方的8帧＋4个off对照。110源码绑定当前匹配，真实PNG/hash/完成source/GL/释放合同有效。对照中不透明照片矩形边缘仍清晰，NGC5128的保护星场轮廓也可见，因此技术集成通过不能代替自然融合通过。M81/M82因没有绑定whole TAN模板跳过Prepared，其处理图本身仍已验证。

HiPS后Prepared前 Scene runner改版使HiPS r1保存的runner指纹与当前不同；独审机器记录单独声明该任务脚本代次，产品源码/输入/输出未变。当前 Scene 新增 PS 准入确实验证 fixed sample、对应 base 方法、recipe指纹/内容/id、原source/metadata/normalized/tool/action，以及 processed artifact hash；StarNet 路径在读取像素前明确跳过，没有把它混入产品消费者。

**当前严格 ICC r2已补核：**HiPS 205项输入/109项实际解析源码全部当前匹配，Prepared110项全部当前匹配；两路runner指纹均匹配当前 `513cafbfac6ff00239e2aae139edd7fb2316174e03430a4aaf3429b252e04f92`。HiPS6主帧、Prepared8处理＋4off共18帧与各r1完整RGBA最大差0；HiPS额外catalog-off控制帧也逐像素差0。GL/实际完成source/释放后所拥有GPU资源合同继续通过。当前代码实际验证 final ICC 字节等于 bound normalized 原图且 hash=receipt.finalICC，并严格验证RGB8/完整几何；旧“仅ICC存在”的待办已退休。

剩余消费者证据强度区别：Prepared记录源码是在构建后读绑定，HiPS绑定实际 onLoad 源码。所有当前绑定确实匹配，没有由此发现输出污染；不能把Prepared绑定机制描述为与HiPS完全相同的运行时解析源码截获。r2像素未变，所以此前独立看到的矩形边缘、星点密度轮廓、局部2/10瓦片差异仍为质量失败。

## 代码发现与边界收口

- **P2已修复关闭：保护蒙版导入覆盖全局剪贴板。**旧 JSX `importProtection`（原45–54行）使用 `selection.copy()/doc.paste()`，没有恢复用户剪贴板。主线程改为 `mask.channels[0].duplicate(doc)`，首次 `ps-only-no-clipboard-r1` 实际FAILED、8100、rows0，失败保留且文档前后仍0；随后 **r2实际完成NGC253/M8两代表**。独审再次验证其32唯一绑定，raw/final相对旧配方RGB最大差0、ICC字节相同、PSD各层/composite/mask读回通过；当前代码不再有copy/paste。没有为修复调用SXT或追加插件速度测评。[修复独审脚本](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/audit_fix.py)、[修复机器读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-independent-audit-r1/no-clipboard-readback.json)。
- **用户文档/动作保护已补真实拒绝读回。**[原生守卫](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-native-admission-r1/result.json)实际使用已有dirty源文档：GaussianBlur改动645053个像素，拒绝前后完整RGB最大差0、ICC字节相同，doc ID546/history5/最后高斯模糊/layers2/saved=false、active doc和displayDialogs全部保留，normalized源hash未改；无导出/插件调用。已有同名任务动作set时，在preflight拒绝且动作仍在，没有新导出；测试最终只清理自己创建的set，Documents0。独审读了实际check.ps1/JSX及before/after PNG，没有拿两个相同未修改原图当dirty证据。[root原生像素读回](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-native-admission-r1/pixel-readback.json)与独审相符。
- **失败/缓存/准入已补必要检查。**[9条实际CLI检查r2](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-admission-tests-r2.txt)PASS，覆盖cluster、撤销SXT准入、变保护geometry、duplicate IDs、failed original、变metadata、旧adapter key、损坏输出绑定、已有run。非法新输入均在stage/PS前拒绝，既有run及原输入hash不改。r1唯一FAIL是正确拒绝损坏cache后测试期待错误名；保留失败并修断言，不能写成实际缓存放行。当前最终driver [两代表roundtrip](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-roundtrip-final-r1/result.json)完整RGB0/ICC精确，随后 [正向复用](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-roundtrip-verified-reuse-r1/result.json)所有完整key和output hash读回有效，cacheHit=true/freshPhotoshopExecution=false。旧PS r2“alpha操作而RGB无效果”已被像素无效检查真实拒绝，是有效escaped defect证据，不需要实现镜像测试。
- **最终结论需保持范围。**仅一份传统PS自动缩星配方、同ML11/0.2 SXT和冻结粗保护规则，不能包装成试尽所有PS修补/颜色/边缘融合能力；也不能把源码/PNG/PSD/Scene合同PASS写成结构和成品PASS。最新“插件先看质量”必须体现为没有新增速度排行。

当前独审没有未关闭的已确认P1/P2，也没有发现既有10份输出伪造、来源/ICC/几何污染或PSD不可编辑。上述必要边界已读回；没有重跑模型来重复验证已不变规则。

## 最终报告、复跑路径与完成结论

[五方案最终报告](E:/dev/worktrees/Starward/remote-main-20260908/.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-tool-final-results-2026-10-09.md)与本次真实输入/输出、质量观察和可编辑证据相符。28个本地Markdown链接、3个inline绝对图片路径、18处命令文件路径都存在；当前计划18个本地链接有效。检查了真实parser的PS参数、native-SXT参数及Scene3个位置参数，文档的新run名当前未占用；未执行这些命令触发新的处理。报告链接检查读回持有审查当时报告/计划的sha，后续计划仅作状态收口不冒称仍是同一版本。外部官方能力链接在这次离线脚本中没有重新联网验证，实际画质结论不依靠那些宣传页面。

SXT native receipt明确是 `sxt-upsample`，已归一化的3个新输入一次真实GPU调用7.616s、staging/hash0.224s；独审另读3份逐张receipt，工具边界合计17.227s、receipt全流程合计24.932s，3份native final与各自逐张processed完整文件bytes相同含ICC。报告正确分开工具/完整流程/缓存/人工责任，没有把这批2x调用当默认或插件的时间。按最新指令未新增PS＋SXT速度比较。

报告明确：PS自身只测一份有限传统自动配方；5插件raw=同参数CLI；Siril已测M8代表smoke及3保留，NGC253代表未另跑；五方案当前均没有已验证的全自动合格成品路线。SXT CLI分星＋PS编辑只作为有条件的能力组合，没有冒称已合格生产配方，也未批准全库加工。StarNet输出没有进入当前产品Scene/资产路线。未可靠计时的人工review与有效成品/小时保持UNKNOWN。

当前Adobe账户计划页的公共读回仅显示无已付款、未列试用/可取消方案；报告没有冒称取消不存在的订阅，也没有认证用户自行安装PS的授权来源。未记录个人字段。这里审查的是已保存读回与文字是否一致，没有另开账户操作。

未验证仍保留：正常成功路径中其他非任务dirty文档/非任务动作的现场运行、插件挂起/外部退出的原生恢复、全部弱结构/科学光度颜色/绝对天文配准/手机原生/全M8/星团成品。代码有保留既有文档、只关任务对象及不强杀用户PS的设计，但本次拒绝守卫通过不等于所有生命周期已经实际测试。已看到的结构误删、残环、保护星密度轮廓和Scene边缘仍是已知FAIL，不能降为UNVERIFIED。

**独立审查完成，可以收尾本次测评。**可重复批量候选/编辑/审阅路径已有实际证据；无未关闭P1/P2代码或报告问题。成品质量门槛仍没有通过。本次到此停下，云观星主Goal继续暂停，恢复/后续配方改进及生产采用须等待用户明确授权。
