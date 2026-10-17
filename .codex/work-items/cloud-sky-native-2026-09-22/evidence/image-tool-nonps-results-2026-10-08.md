# 云观星图像工具实测：非 PS 阶段结论

测评开始 2026-10-08，非 PS 收尾 2026-10-09。依据用户最新要求，PS 自身与 PS＋SXT 插件暂缓，PS 授权由用户处理。本报告完成其余工具的实际比较，不代表五条方案已全部测完；云观星主 Goal 继续暂停。唯一执行及压缩恢复索引为 [当前计划](image-tool-full-comparison-2026-10-08.md)，历史过程及旧状态另存 [历史快照](image-tool-full-comparison-history-2026-10-08-before-nonps-close.md)。

## 选型结论

**当前没有一条无需修补即可大批量生成合格云观星成品的自动配方。**去掉照片里的星点只是一个步骤。实测还暴露了目标细丝、旋臂结点被误删，亮星残环，以及照片／覆盖区边界明显的问题。运行完成、像素确有变化、速度快，均不能越过这些质量门槛。

**下一阶段优先候选是 SXT CLI 的 GPU 多文件分星能力，配合可编辑的结构保护、例外修补和边缘融合。**这是对分星模块的有条件选择，不是成品质量冠军，也不授权直接生产全库、购买或发布素材。ML11 在本机已实际产生 starless 与 stars 两层；同一命令的三图新推理及格式读回都已验证。但 SXT 默认和 2x 均误删 NGC5128 细丝与 M81 的红色旋臂结点，不能把默认档当成已解决问题。后续须先让完整配方通过质量门槛，再测含修补和复核的总效率。PS 届时能否完成这些责任仍待实测。

|能力／工具|本轮实际结果|阶段决定|
|---|---|---|
|SXT CLI 2.6.9＋ML11|默认、0.5 overlap、完整图 2x 对照；三个保留输入；一次多文件 GPU 推理；NGC253 与 M8 实际 Scene|保留为优先分星候选。原始自动输出尚不合格；正式软件素材用途和最终授权仍须确认，试用测通不等于发布授权|
|nox 1.1.0|默认／2x；同样代表及三保留输入；NGC253 与 M8 Scene；保护回放|保留为代码及权重均 MIT 的备选。当前 CPU 路径较慢，M81 结点误删、亮星残环／平滑问题未解决，不选为现成主生产路径|
|StarNet2 2.6.2 build0242 ORT|默认／2x；DirectML；同样代表和保留输入；保护回放|本机机器时间较短，M81 2x 保留更多红结点，但弱结构完整保真未证实且有残环。所测包许可第5节禁止用输出制作软件产品资产、fixtures 或 reference results，连后处理及非商用也在范围内；因此当前不采用于产品，也没有送入产品 Scene|
|Siril 1.4.4＋官方 StarNet.py 1.1.1|正确 RGB16 交接、真实去星／星层导回；三个保留输入；与相同参数独立 StarNet 默认配对|提供格式和执行组织能力，调用的是同一个 StarNet 模型，没有实测出的独立模型质量优势；增加启动和转换成本，承继 StarNet 输出用途限制，当前不选为产品产物路径|
|PS 自身|27.11 已装，能查看同一原图；本轮未取得可编辑授权，用户正在处理|按用户要求暂缓，不评价无用，不算质量失败，不再操作订阅入口|
|PS＋SXT 插件|RC 插件2.6.9已安装验签；SXT官方零元试用已领取激活|插件加工、分层动作、人工修补及批处理未测；CLI 成绩不能替代插件组合成绩|

上述决定以本次测得的工具路径及本机为限。nox 测的是 CPU 路径，StarNet／SXT 使用 DirectML GPU；这是实际安装和执行能力的比较，不是等算力算法竞赛。没有将 nox 其他优化路径预先判为无效。

## 样本与对照

冻结样本及权利／元数据／参数由 [full-comparison manifest](../scripts/image-tool-full-comparison-samples.json) 管理，原始文件 bytes／SHA256 和每份 receipt 的 normalized original／processed／日志均绑定。没有裁切后推理、重投影、自动拉伸或改变原图视场。星系完整图统一宽1024，2x 配方对整幅 normalized 图 BICUBIC 放大后推理，再 LANCZOS 回原尺寸；星云使用真实 order6 原512瓦片。

|作用|输入|重点质量检查|
|---|---|---|
|代表|NGC253，ESO eso0902c，8285×7510→1024×928|弱盘、内部结点、背景星、完整照片边缘|
|代表|M8，Rubin order6 Npix28891，512×512|密星、弥漫发射、细尘纹、真实 HEALPix 几何|
|保留小批|NGC5128，ESO eso1221a，4000×3912→1024×1001|弱晕、离心细丝、密星、亮星月牙／环|
|保留小批|M81／M82，NOIRLab noao-m81m82，8315×4642→1024×572|双目标、旋臂红结点、弱盘、M82 细结构|
|保留小批|M8相邻原瓦片 Npix28892，512×512|同配方迁移、瓦片间处理差异|

ESO／NOIRLab 源图署名及 CC BY 4.0，Rubin 图像 CC BY 4.0／HiPS ODbL-1.0，具体来源由 manifest 及原 metadata 持有。未标 ICC 的全不透明 Rubin 发布 PNG 明确按网页 sRGB 显示解释；这不建立科学颜色校准。源有缺口的像素不套用全不透明规则。星团通用去星在工具载入前被禁止；NGC6752 的旧负例及当前 cluster 准入回归证明了拒绝路径，**没有实际制作星团保护加工成品，不能称星团加工已通过。**

## 质量证据

质量门槛先看目标核心、弱结构和星团成员是否保留，颜色与几何合同是否成立，目录恒星是否仍由目录绘制，以及成品在实际 Scene 中是否自然融合。以下分开记录，避免用机器通过掩盖成品失败。

- **格式／几何通过**：所列完成结果采用相同全图尺寸和显式 sRGB ICC，绑定 source／metadata／过程／输出。Siril 的 RGB8→RGB16 必须逐像素乘257，再由官方 wrapper 归一化；正确流程无改动往返 maxDiff=0。早先错误亮度／错误参数结果保留为 FAILED。Siril 与独立 StarNet 默认最终 RGB 平均绝对差0.528–1.139、最大38–45，不能宣称逐像素相同。
- **目标结构失败**：SXT default／2x 都明显削掉 NGC5128 的蓝／红细丝和 M81 的红旋臂结点；nox 也会误删目标结点。检查的 ROI 分别是 `(285,350,370,440)`、`(140,205,195,275)`，均来自完整图处理后的诊断裁切，4x nearest 只用于看图。实际对照和源绑定：[结构证据 JSON](../../../../output/image-tool-full-comparison-2026-10-08/sxt-structure-roi-comparison-r1.json)、[NGC5128 default／2x](../../../../output/image-tool-full-comparison-2026-10-08/ngc5128-sxt-structure-default-vs-2x-r1.png)、[M81 default／2x](../../../../output/image-tool-full-comparison-2026-10-08/m81-m82-sxt-structure-default-vs-2x-r1.png)。StarNet2x 的 M81 红结点保留较多，不据此推断所有弱结构无损。
- **成品边缘失败**：NGC253 Prepared Scene 的 nox2x 与 SXT default／2x 都仍有可见矩形边界和亮星残环；分星本身没有完成背景匹配／融合。M8 当前照片覆盖外缘的对角硬边也仍在。
- **细结构／科学／真机未验证**：M8 的主要低频颜色和尘纹视觉上仍在，但全部细丝／弱云保真、绝对天文配准、科学光度或颜色有效性、手机原生最终接受均未证明。蓝色扩展亮斑中可能有真实反射／发射结构，不能全部当作恒星光晕抹掉。

实际 Scene 路径使用当前渲染责任及实际输入，不以贴图缩略图代替消费者：

|消费者|完成证据|可支持的结论|
|---|---|---|
|NGC253 Prepared TAN|旧 output 下 `scene-nox-upsample-r3/`、`scene-sxt-r1/`，同相机 wide／detail 原图与处理图|真实提交、非空像素贡献和释放通过；最终矩形融合未过关|
|M8 HiPS 当前 Scene|[scene-hips-tools-r4/result.json](../../../../output/image-tool-benchmark-2026-10-08/scene-hips-tools-r4/result.json)、[四路实测拼图](../../../../output/image-tool-benchmark-2026-10-08/scene-hips-tools-r4/m8-comparison.png)|原图、nox2x、SXT default／2x，390×844 CSS、DPR1／2共8帧；没有把 HEALPix 当 TAN|

M8 每路实际画10瓦片，处理方法仅替换同样的28891／28892，其余8片保持源图（含已登记镜像28889）。**这是2／10瓦片的实际消费者对照，不是整个 M8 区域已经加工完成。**两档 original 完整 RGBA 都与冻结真实基准逐像素相同；处理方法确实改变当前画面。目录解析8404条，本视图实际绘出2个对象；关闭目录的控制帧改变109个像素，证明星目录层仍有贡献，不能说8404条全在此视图绘制。每帧10瓦片绘制、GL error0、完成1次、无failure，销毁后 GPU 所属纹理、buffer、program、framebuffer、depth 资源均为0。StarNet派生在载入像素之前 SKIPPED_LICENSE。

r4 绑定203项当前输入及109项 parsed-source；相对旧历史基准的2个探针／3个 Scene/GPU owner 文件有5项既有源码代次差异，已显式记录。本轮未改这些产品文件，且完整原图 RGBA 两种 DPR 严格相等支持本组对照；不能写成所有源码仍和历史基准字节相同。软件浏览器的 Scene 检查不能替代真机或全区域质量验收。

## 保护蒙版回拷：实际可行性与代价

使用同一个共享 `guard_mask`，对 manifest 中已冻结的星系椭圆恢复 original 像素，区外保留对应已测去星图。没有人工逐图画新蒙版、额外模型推理或改原始结果。nox2x／StarNet2x／SXT2x各3图、Siril＋StarNet默认2图，共11组合；NGC253×Siril 没有既有实测输入，明确 UNMEASURED，不补成已测。M8 无合格弥漫保护蒙版，入口拒绝，不发明整云遮罩。

[实际回放 result.json](../../../../output/image-tool-full-comparison-2026-10-08/protection-replay-r1/result.json) 保存每图 receipt、蒙版、全图拼图及绑定。11图原尺寸 RGB／ICC 不变，蒙版内=original、外=measured processed 全部逐像素通过；三样本保护像素分别247186／950272、471148／1025024、129897／585728。纯回放墙钟6.240s含全部输入校验及诊断，单图合成／编码／读回／诊断0.232–0.647s，**不含先前模型推理，也不是合格成品时间。**

实际看图后的判断：该方法可机械恢复覆盖区的目标结构，但把区内照片前景星也恢复了。NGC5128 与 M81 显示明显椭圆形星密度突变，区外亮星残环仍在；蒙版外的弱结构也没有保证。**本回放配方成品质量 FAIL，不能用保护区 maxDiff=0 宣称目标完整保护或整图去星合格。**

直观看图：[NGC5128 原图／SXT2x／回拷](../../../../output/image-tool-full-comparison-2026-10-08/protection-replay-r1/ngc5128-sxt-upsample/comparison.jpg)、[M81／M82 原图／SXT2x／回拷](../../../../output/image-tool-full-comparison-2026-10-08/protection-replay-r1/m81-m82-sxt-upsample/comparison.jpg)。本次证据把后续瓶颈定位到“区分目标结点与前景星、平滑且不丢弱结构的保护／融合”，而不是继续无边界地重试分星参数。回拷是有用的可复跑比较路径，不作为最终 recipe。

## 实际机器成本

硬件 i5-11400F（6核12线程）、32GiB、RTX3060 12GiB、驱动610.60。除明确标出的 smoke 单元格外，以下为该次新输入 `row.seconds`，包含读取／hash、whole resize、格式交接、处理、PNG与差异诊断编码；下载及首次依赖初始化另计。各方法对应参数如上，Siril列使用默认 StarNet，不能当成和2x列相同参数。后台安装／检查可能存在；没有独占硬件重复统计，不比较小数差异、不推全库吞吐。

|输入|nox 2x，CPU|StarNet 2x，DirectML|Siril＋StarNet 默认|SXT 2x，ML11／overlap0.2，DirectML|
|---|---:|---:|---:|---:|
|NGC253|67.70s|5.97s|未测|10.12s|
|M8 28891|24.32s|2.42s|smoke 工具墙钟5.81s（不含完整流程）|5.37s|
|NGC5128|65.44s|5.50s|9.37s|11.20s|
|M81／M82|38.38s|4.29s|10.57s|8.58s|
|M8 28892|30.28s|2.46s|7.28s|5.35s|

SXT 默认：代表NGC25314.422s（本轮首次推理）、M8 4.052s；保留3图6.073／5.639／3.845s。NGC253 overlap0.5 7.302s在首次之后，不能用14.422与7.302就推断0.5更快；未见足以解决结构缺失的质量突破。相同参数独立 StarNet 默认保留3图3.21／2.96／1.83s用于 Siril 配对。

SXT 的一次三文件原生小批是**新的真实推理，不是结果缓存命中**：

- 修复后的 [native r3](../../../../output/image-tool-full-comparison-2026-10-08/sxt-native-validation-r3.json) 工具调用墙钟7.616s，前置 staging/hash0.224s；NGC5128／M81／M8邻片的6个实际 vendor outputs及3个 final均绑定。每张 final 与独立逐张 processed 完整字节相同，含 ICC，maxDiff=0。
- 对应逐张工具调用墙钟合计17.227s是可比较的工具边界；逐张 receipt 全流程合计24.932s包含更多责任，不能直接与7.616s对比。原生批没有将源 normalization／最终修补／人工看图成本包进工具墙钟。
- 上次 r2 工具9.043s属另一探索读数，其 final RGB相同但ICC漏写；失败合同已保留，另有不重推理的 ICC修复文件，随后 r3 才完整重验通过。r1 adapter 输出名误判也保留失败。只有两次探索读数，不给统计加速率或每小时成品承诺。

三保留输入12项旧小批174.946s；当时 warm验证6.317s、12个已核验缓存命中，只用于幂等／恢复验证。runner后续修复使旧identity改变，不能拿缓存读回当新输入生产效率。Siril首次安装依赖约189s且该轮失败，不混入稳定单图成本。

当前未做逐项手工修补，记录0次／0秒；人工作业、看图与编排未可靠计时，`reviewSeconds=UNKNOWN`。未建立“合格成品数”分母，故不报有效成品／小时。进程树RSS每50ms抽样，属于观测下界且共享页可能重复；parent high water是累计值，GPU物理峰值 UNKNOWN，不能据此排资源优劣。

## 代码与审查

任务责任分别归 [tool runner](../scripts/benchmark-image-tools.py)、[Scene runner](../scripts/benchmark-image-scene.mjs)、[protection replay](../scripts/benchmark-image-protection.py)。保护 helper 复用当前 mask及策略 owner，不重复定义椭圆公式；它只回放已绑定结果，不加载模型。当前 sample／metadata／source／输出hash、同尺寸RGB及ICC必须先匹配，所有job准入通过才创建新输出；仅允许候选 methods 的历史新增，目标／保护／几何／权利／已撤销method不能变化。输出使用新run、排他写入；输出阶段失败保存 failed.json，准入拒绝不创建输出，7条拒绝回执由测试驱动保存。StarNet所有派生产物明确限定独立工具评论用途。

修复内容包括：Siril模型Done后wrapper仍失败的假成功与无依据mask FILTER误拒绝；SXT失败identity显式有界重试（同identity最多3次）、native真实输出命名、final ICC缺失、native绕过当前 sample/method/width策略。真实失败记录及修复后运行都保留。当前 [13条共享回归](../../../../output/image-tool-full-comparison-2026-10-08/regressions-sxt-r5.txt)通过；新增 [7条保护CLI检查](../../../../output/image-tool-full-comparison-2026-10-08/protection-admission-r2-test-log.txt)通过，包括cluster、无云蒙版、撤销method、变更recipe、变更metadata、实测像素被篡改和已存在run。六个非法新输入都未创建/stage输出，已有run未覆盖。测试入口：[test-image-tool-benchmark.py](../scripts/test-image-tool-benchmark.py)、[test-image-protection.py](../scripts/test-image-protection.py)。首次保护测试驱动误用 unittest.run 名称造成 TypeError，在执行用例前失败；已修名，未当成测试通过或模型失败，空证据目录保留。

独立审查 `nonps_completion_review` 已读回 M8当前203项输入、109项解析源码、8张实际帧及whole RGBA；native55项唯一绑定与actual程序／模型；保护77项唯一绑定并重算11张mask及内外像素／ICC；7条CLI拒绝证据及当前代码。已看全图与结构ROI，确认结构损失、保护回拷星密度边界。最终报告、审查时32个本地链接和5段PowerShell命令均已核对，收尾措辞／计时／跟踪入口问题已修正，当前无未关闭P1/P2；reviewer已结束并关闭。[完整独审记录](image-tool-nonps-independent-review-2026-10-09.md)。

本轮不改产品默认注册／覆盖／budget／shader，只增加任务脚本和证据；没有恢复主 Goal、全库生产、提交推送、发布部署或上传素材在线加工。`.gitignore`仅开放任务文件的跟踪入口，其余原有工作保留。

## 可重复路径

在 `E:/dev/worktrees/Starward/remote-main-20260908` 执行。每次使用新的小写字母／数字／横线run名，旧输出不覆盖。包版本锁见 [requirements](../scripts/image-tool-benchmark-requirements.txt)；具体工具／模型／配置哈希由 receipts 持有。更换原图、metadata、保护、参数、软件或模型后必须重验，不沿用旧质量结论。

1. 用当前 shared runner 对新输入做完整图分星。例如同保留三图 SXT2x；不加native选项时按单图处理及校验，可命中经过完整identity读回核验的缓存：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-tools.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --output 'output/image-tool-full-comparison-2026-10-08' --run nonps-sxt-next `
  --samples ngc5128 m81-m82 m8-tile-28892 --methods sxt-upsample
```

2. 已绑定normalized输入的原生三图新推理，当前工具／模型／sample／metadata策略必须与引用receipt匹配。此命令不走结果缓存，不代表修补后的完整配方：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-tools.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --output 'output/image-tool-full-comparison-2026-10-08' --run sxt-native-next `
  --methods sxt-upsample `
  --native-sxt-batch-from 'output/image-tool-full-comparison-2026-10-08/sxt-upsample-validation-r1.json'
```

3. 回放保护试验，仅使用既有结果，无新推理。这里示例只含SXT的三个星系，不能直接发布为合格成品；完整11项原命令在当前计划索引中：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-protection.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --from 'output/image-tool-full-comparison-2026-10-08/sxt-upsample-representative-r1.json' `
         'output/image-tool-full-comparison-2026-10-08/sxt-upsample-validation-r1.json' `
  --samples ngc253 ngc5128 m81-m82 --methods sxt-upsample --run protection-sxt-next
```

4. 重现M8的实际HiPS Scene。节点24.16.0及当前已安装esbuild／sharp／Playwright依赖由脚本使用；它依赖原基准及全部绑定，缺失／变更会失败并保留，不能退化为无效贴图后算通过：

```powershell
& 'C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs' `
  'scene-hips-nonps-next' `
  'output/image-tool-full-comparison-2026-10-08/scene-nonps-hips-input-r1.json' 'hips'
```

5. 有变更时重跑相应合同检查，不重复未变模型实验来填数量：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/test-image-tool-benchmark.py'
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/test-image-protection.py'
```

后续若用户解决PS授权：先同原图无改动格式往返，再实际测试PS自身蒙版／曲线／动作与PS＋SXT分层修补，冻结配方后用同保留三图，并计人工及复核时间。若开通此前已授权的月付7天带续费试用，测后立即取消并实际确认；本次agent操作未提交／开通PS订阅，用户接手后的自主账号操作未核查。本阶段到此保存后停止，不自动补PS、不恢复云观星主 Goal。

来源及许可核查入口：[nox官方代码及权重说明](https://github.com/charvey2718/nox)、[StarNet官方](https://www.starnetastro.com/)、[Siril官方脚本仓库](https://gitlab.com/free-astro/siril-scripts)、[SXT官方](https://www.rc-astro.com/software/sxt/)、[RC Astro许可](https://www.rc-astro.com/rc-astro-software-license-agreement/)。实际版本／参数／权利边界优先查看已绑定文件，不能仅用网页宣传替代本轮输出或最终用途授权。
