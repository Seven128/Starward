# 云观星图像工具实测：五方案最终结论

测评 2026-10-08～09，用户要求质量先于时间；最后收窄为“先不用测PS RC插件速度，就看质量”。本报告合并已保存的非PS实际实验和当前PS补测，PS＋SXT不新增测速排名。执行与压缩恢复唯一索引：[当前计划](image-tool-full-comparison-2026-10-08.md)。本次测评保存后停止，云观星主Goal保持暂停。

## 选型结论

**当前没有一条已验证的自动流程能直接批量交付满足全部质量门槛的云观星成品。**实际障碍是目标细丝/结点被当成恒星删掉、亮星残环、保护区域恢复前景星，以及星图覆盖边缘/瓦片处理程度不一致。快和程序成功都不能补偿这些质量失败。

**能力组合的有条件选择是 SXT CLI GPU多文件分星＋PS可编辑保护/例外修补。**CLI已测通真实多文件处理；PS现在已实际证明能批量建立、保存、重新打开和继续编辑原图/处理图/保护蒙版。插件与同参数CLI的分星质量相同，因此不必逐张进入PS才能获得该模型输出。PS保留为质量处理宿主。但这不是已合格的生产配方：本次冻结椭圆保护没有分开目标结点与前景星，也没解决最终融合；不能以这个结论批准全库加工。

|用户指定方案|本次实际运行范围|实际质量判断|决定|
|---|---|---|---|
|PS自身|27.10.0；高光选择、Minimum、分层、8px羽化保护；2代表＋3保留；实际Scene和PSD重开/编辑|目标结构在所看ROI保留较多，但亮星halo、密集星点仍大量存在；有限的自动缩星配方不能独立完成分星|作为可编辑保护/局部修补宿主；不选这条自动配方作为独立成品路线；不推断所有PS手工方法无效|
|PS＋StarXTerminator|插件2.6.9/ML11/default overlap0.2，真实保存动作；2＋3；原始去星与保护合成分别保存|5份插件raw与CLI默认全图RGB逐像素相同；同样误删NGC5128细丝/M81红结点；保护可恢复目标，也把前景星恢复，密度边界仍在|有条件保留该分星能力＋PS编辑责任；没有插件画质更高的证据；按用户要求不作插件速度排名|
|StarNet2|所测2.6.2 build0242 ORT/DirectML，默认/2x；2＋3；独立离线保护对照|M81 2x保留部分更多红结点，弱结构完整保真仍未证明且有残环|所测包LICENSE修订2026-09-07第5节禁止将输出用于软件资产/fixture/reference，即便后处理或非商业；只作独立工具评论，不进入产品Scene/资产路线|
|nox|1.1.0，当前CPU路径，默认/2x；2＋3；Prepared/HiPS实际Scene|结点误删、残环/平滑问题仍在；没有通过成品门槛|代码和权重MIT，保留为许可清晰的备选；本机已测CPU路径更慢，其他优化路径未测|
|Siril＋去星工具|Siril1.4.4＋官方StarNet.py1.1.1；M8代表smoke及3保留；正确RGB16交接和同参数独立StarNet配对；NGC253代表未另跑|使用同一个StarNet模型，未见独立模型质量收益；与独立StarNet不是逐像素相同，最终RGB平均绝对差0.528～1.139/最大38～45|当前已有PS时不为该wrapper额外引入主资产路径；增加组织/格式交接成本且承继所测StarNet输出限制。Siril不是另一种独立去星模型|

以上评价限定本次版本、参数、来源和路径。没有把有限配方失败推断为软件全部能力失败，没有把非等算力结果当算法排行。SXT试用测通也不替代最终软件素材用途/发布授权；用户自行安装PS的授权来源未被本报告认证。

## 相同输入、冻结规则与实际画质

输入合同：[full-comparison manifest](../scripts/image-tool-full-comparison-samples.json)，6429B，SHA256 `10c8c3cd66ec408a2c94ff7d5cbb86faf43c3679c8c9bfe77026cb37764dad62`，本轮未改。原始bytes/hash、metadata、rights、geometry、准入methods和原保护椭圆均绑定。2x对照是完整归一化图放大后处理再回原尺寸，ROI只在全图处理后裁作诊断。

|作用|固定输入|尺寸/关注点|
|---|---|---|
|代表|NGC253，ESO eso0902c|8285×7510→1024×928，弱盘/核心/结点/完整照片边缘|
|代表|M8，Rubin order6 Npix28891|原512×512，密星/细尘纹/弥漫云，真实HEALPix瓦片|
|保留小批|NGC5128，ESO eso1221a|4000×3912→1024×1001，弱晕/离心细丝/亮星残弧|
|保留小批|M81/M82，NOIRLab noao-m81m82|8315×4642→1024×572，双目标/旋臂红结点|
|保留小批|M8相邻Npix28892|原512×512，同规则迁移与瓦片处理差异|

ESO/NOIRLab源图CC BY 4.0、Rubin图像CC BY 4.0/HiPS ODbL-1.0，原始署名与来源由manifest/metadata持有。全不透明、未标ICC的Rubin网页PNG显式按sRGB显示解释，不能据此声称科学颜色校准。通用分星对cluster在加工前被拒绝，星团成员没有被当作待删前景星；本轮没有星团加工成品验收。

PS代表配方冻结后，再用同样规则处理3保留输入，没有逐图画新蒙版或为保留图调新参数：

- PS自身：ColorRange Highlights fuzziness40、minimumBrightness170/maximum255；选择expand1px、feather1px；RGB component channels上的Minimum radius1px。存储可编辑高光alpha。未声称这是天文目标/恒星分类器。
- PS＋SXT：真实ATN内1个StarXTerminator步骤，ML11/default overlap0.2，通过`app.doAction`执行。保存原始处理图，再采用manifest原冻结星系椭圆、GaussianBlur8px软保护；M8没有合格弥漫云保护蒙版，未发明遮罩。
- PSD：Original、Processed及星系的Original target protection(layer mask)，PS自身另存高光alpha。`removed-diagnostic.png`仅是clipped RGB original−raw供看图，不是SXT原生unscreen星层或科学线性重建。

**关键诊断：**NGC5128 ROI `(285,350,370,440)` 的蓝/红细丝在原图与PS缩星图存在，在SXT raw中明显丢失；M81 ROI `(140,205,195,275)` 的红旋臂结点同样受损。保护层把它们恢复，同时恢复原图恒星。NGC5128亮星ROI `(805,618,875,688)` 中，PS缩小星芯但halo仍在，SXT留下黄色弧，保护恢复整颗亮星。4x nearest仅用于查看，源图实际处理分辨率没有改变。[诊断JSON](../../../../output/image-tool-full-comparison-2026-10-08/ps-quality-diagnostics-r1/result.json)。

![NGC5128真实细丝对照：原图、PS缩星、PS SXT原始输出、PS SXT保护后](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-quality-diagnostics-r1/ngc5128-roi-1.png)

![M81红结点对照](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-full-comparison-2026-10-08/ps-quality-diagnostics-r1/m81-m82-roi-1.png)

5个SXT插件raw与既有同参数CLI结果**全图RGB max/mean difference均为0**，由root及独立reviewer另行读回；不是比较JPEG缩略图或以CLI执行冒充PS插件。此前CLI default/2x都误删同结构，额外2x也未解决这个质量问题。M8低频颜色/主要尘纹视觉上保留，不等于所有弱云/细丝无损；扩展蓝色亮斑不能全部预判为恒星halo去抹。

## 可编辑与格式合同的实际证据

两条PS各2代表＋3保留共10份PSD，实际PS重开后导出全部合成图，完整RGB与各自final maxDiff0。NGC253 SXT保护层opacity100→0实际改变42704个像素，关闭时RGB=raw，再恢复100时RGB=final，源PSD hash始终未改；全部任务文档关闭后Documents=0。[原生重开/编辑](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-psd-audit-r1/native-result.json)、[像素读回](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-psd-audit-r1/pixel-readback.json)。

独立reviewer按公开PSD格式解析10份PSD的图层、PackBits通道、蒙版及合成数据：Original层=原图、Processed层=raw、6份星系保护层=原图且实际layer mask=完整保护PNG，全部composite=final；PSD ICC资源=原绑定ICC。Pillow对含多alpha的PS自身星系PSD合成解码存在差异，已由独立公开格式解析及原生PS重开共同确认是该解码路径限制，没有据此误判PSD损坏。[独立审查](image-tool-ps-independent-review-2026-10-09.md)。

无改动PS往返在当前最终driver实际验证NGC253/M8两图完整RGB maxDiff0、final ICC字节=bound original。原始PS PNG导出曾漏ICC；SaveForWeb后M8的内置sRGB标签由PS改为Adobe sRGB IEC字节。现保留vendor raw，经实际RGB8/sRGB文档、尺寸与PNG读回证明后，final受控嵌入原绑定ICC，再验证RGB未变。不能宣称vendor raw ICC始终字节相等。[最终往返](../../../../output/image-tool-full-comparison-2026-10-08/ps-roundtrip-final-r1/result.json)。

## 真实星图消费者与质量界限

当前任务Scene runner仅增加PS产物准入及严格finalICC核验，未修改产品renderer/注册/budget。调用当前Prepared/HiPS真实Scene与GPU责任，通过Chromium软件WebGL可重复运行，不是贴图拼接预览，也不替代手机真机。

- **M8 HiPS：**original/PS-only/PS-SXT、DPR1/2共6主帧＋1个catalog-off控制帧。每路画同10片，只替换28891/28892，另8片保留源图，因此是2/10局部对照。原图两DPR完整RGBA=冻结基准，PS-only改变45511/182130像素、PS-SXT改变102904/411599；catalog解析8404行但该视图实际画2对象，关闭目录改变109像素。每主帧10tile draws、GL0/无failed，dispose后所拥有GPU资源0。[当前严格ICC运行](../../../../output/image-tool-benchmark-2026-10-08/scene-ps-hips-quality-r2/result.json)。
- **NGC253/NGC5128 Prepared TAN：**2目标×2方法×wide/detail共8处理主帧＋4off控制，共12。实际贡献非空且清理通过。M81/M82不满足该TAN消费入口、M8为HiPS，没有强行当成TAN画。相同像素改动数量源于同照片覆盖面积，不代表两方法画面内容相同。[当前运行](../../../../output/image-tool-benchmark-2026-10-08/scene-ps-prepared-quality-r2/result.json)。
- 实际看图仍有照片矩形边缘、保护区星密度变化，以及M8处理/未处理区域差异和覆盖外缘对角硬边。8px羽化只软化蒙版边界，没有证明最终自然融合。以上成品质量**FAIL**。

![M8实际HiPS：原图、PS自身、PS＋SXT，局部2/10瓦片对照](E:/dev/worktrees/Starward/remote-main-20260908/output/image-tool-benchmark-2026-10-08/scene-ps-hips-quality-r2/m8-comparison.png)

弱结构全部完整性、科学光度/颜色、绝对天文配准、手机原生、全M8与星团成品仍**UNVERIFIED**。技术/数值保护通过不代表这些范围通过。

## 效率与成本：保留已测数据，不越过质量门槛

硬件i5-11400F6核12线程/32GiB/RTX3060 12GiB。非PS完整新输入机器成本、首启成本、失效缓存与RSS观测限制见[已保存非PS报告](image-tool-nonps-results-2026-10-08.md)，不重复实验：

|保留输入|nox 2x，CPU|StarNet 2x，DirectML|Siril＋StarNet默认|SXT默认，ML11/DirectML|
|---|---:|---:|---:|---:|
|NGC5128|65.44s|5.50s|9.37s|6.073s|
|M81/M82|38.38s|4.29s|10.57s|5.639s|
|M8邻28892|30.28s|2.46s|7.28s|3.845s|

这是所测路径含读取/hash/缩放交接/推理/PNG及诊断的单次流程读数，不是等参数等算力算法排行，不给统计吞吐承诺。SXT默认与2x不同；Siril对比同参数独立StarNet默认为3.21/2.96/1.83s，作用是看wrapper额外成本。

SXT CLI一次3个新输入的实际原生GPU批调用7.616s、staging0.224s，与对应逐张**同工具调用边界**合计17.227s相比减少启动/调用开销；最终3图与逐张processed完整字节相同含ICC。不能与24.932s逐张完整流程混排，也不包含最终人工修补。[实际native r3](../../../../output/image-tool-full-comparison-2026-10-08/sxt-native-validation-r3.json)。缓存命中时间只用于恢复验证，不当新输入吞吐。

按最后要求，本报告不列PS＋SXT滤镜速度或与CLI的速度排名，自动记录时间留在receipt作为追溯。未做逐项手工修补（0次/0秒），人工review/编排未可靠计时=UNKNOWN；本轮无完整合格成品分母，**有效成品/小时未知**，不能从去星调用秒数推出。

软件新增支出：本轮未购买/开通Adobe付费方案，SXT官方零元试用已领用。实际读取当前登录[Adobe计划页](https://account.adobe.com/plans)显示“您没有已付款的计划”，没有列出试用/可取消方案，因此没有可声称完成的订阅取消；该观察仅限当前网页账号，不认证其他账号或用户所装PS授权来源。[不含个人字段的读回](../../../../output/image-tool-full-comparison-2026-10-08/adobe-plan-readback-2026-10-09.json)。

## 可重复处理路径与代码质量

责任保持最小：共享[tool runner](../scripts/benchmark-image-tools.py)拥有准入/归一化/hash/guard_mask/native/ICC；[PS driver](../scripts/benchmark-image-photoshop.py)、[PowerShell host](../scripts/benchmark-image-photoshop-host.ps1)、[JSX](../scripts/benchmark-image-photoshop.jsx)只桥接本机实际PS；[recipe](../scripts/image-tool-photoshop-recipes.json)固定软件/model/ATN/规则；[Scene runner](../scripts/benchmark-image-scene.mjs)验证实际消费。新PS方法不修改原manifest的methods，不放松StarNet用途边界。

全batch1～5个输入先验证当前source/metadata/完整sample字段、原成功receipt、normalized RGB8/sRGB/geometry、vendor/action及recipe，才stage新run。输出排他写入，不覆盖历史；推理后重验所有依赖；失败保留failed.json，不能按退出0或只看history当成功。默认不复用输出；显式`--reuse-from`必须完整key＋所有输出hash匹配。实测当前roundtrip正向复用无PS调用，过期key/损坏binding被拒绝。[复用证据](../../../../output/image-tool-full-comparison-2026-10-08/ps-roundtrip-verified-reuse-r1/result.json)。

实际PS守卫在app.open前拒绝已打开的源/蒙版，避免PS复用用户文档后被finally误关闭；同名动作已有时拒绝，只卸载本次加载的任务set；保留displayDialogs/prior active document，channel.duplicate导入保护不使用用户剪贴板。实际dirty sentinel有改动像素，但被拒绝后RGB/ICC/history/layers/active doc原样保留，source未保存；动作碰撞未导出且原动作保留，测试最后只清理所创对象。[native拒绝](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-admission-r1/result.json)、[像素读回](../../../../output/image-tool-full-comparison-2026-10-08/ps-native-admission-r1/pixel-readback.json)。

[9条实际CLI边界检查](../../../../output/image-tool-full-comparison-2026-10-08/ps-admission-tests-r2.txt)PASS：cluster、撤销SXT准入、几何规则变化、duplicate IDs、failed original、metadata变化、过期adapter key、损坏输出binding、既有run。全部非法新输入未stage/调用PS，既有run不覆盖。原13条共享与7条保护检查保持已保存证据；未变化的模型不重复跑。

有意义的失败保留：PS自身r2曾在alpha上执行Minimum，history有“滤镜成功”但全RGB没变化，driver实际拒绝no-pixel-effect；改为RGB component channels后代表/保留成功。另有ICC漏写、encoding拼写、selection histogram受选区限制、mask rename active document错误。测试r1唯一FAIL是损坏缓存被正确拒绝后测试期待错误名，修断言后r2全部PASS，不记成实际缓存放行。独审指出的剪贴板副作用已改channel.duplicate，实际2代表新路径RGB/ICC/PSD=旧同配方。

10份质量输出绑定其真实当时脚本代次；后续mask导入/诊断字段修复不冒称当时用过新hash。当前最终代码另有实际2代表往返、正向cache与native守卫证据；当前Scene ICC guard已实跑r2。原生Action保存与独立重放已证明：先把last filter改GaussianBlur再重放仍是SXT；旧UUID裸descriptor失败不代表UUID过期，同UUID的保存动作可执行。没有重复另造模型抽象或修改产品代码。

独立审查覆盖实际输入/output绑定、10PSD、5插件与CLI逐像素、ROI/whole图/真实Scene、新导入路径、准入/cache/native guard、最终报告及命令/链接：[PS独审](image-tool-ps-independent-review-2026-10-09.md)。非PS审查保留[原记录](image-tool-nonps-independent-review-2026-10-09.md)。当前没有确认未修的P1/P2代码问题；已知画质失败明确保留为质量FAIL。

## 复跑命令

在 `E:/dev/worktrees/Starward/remote-main-20260908` 执行，保留已绑定源文件、工具版本、venv和历史Scene基准。每次使用新的小写run名，不覆盖。以下路径生成待审候选，不自动采用于产品；新素材要先补真实来源/权利/geometry和normalized original receipt，不能把未经门槛验证的素材混入现有manifest。

1. 用PS自身或PS＋SXT当前冻结规则一次处理代表＋保留5张，保存raw/final/可编辑PSD。将`--operation ps-sxt`改为`ps-only`即可跑另一条，必须更换run名：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-photoshop.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --from 'output/image-tool-full-comparison-2026-10-08/representative-review-r1.json' `
         'output/image-tool-full-comparison-2026-10-08/validation-batch-r1.json' `
  --samples ngc253 m8-tile-28891 ngc5128 m81-m82 m8-tile-28892 `
  --operation ps-sxt --run ps-sxt-quality-next
```

`--preflight-only`仅校验而不stage/调用PS；`--operation roundtrip`只验证格式；`--reuse-from <同一当前key成功result.json>`核验后复用，不作为速度测评。所测ATN由recipe固定，动作文件：[SkyBenchmarkSXT-20261009-r1.atn](../../../../output/image-tool-full-comparison-2026-10-08/ps-sxt-action-r1/SkyBenchmarkSXT-20261009-r1.atn)。保存新PS产物前先关闭自己正在编辑的相同输入，driver不会替用户关闭。

2. 批量候选能力的实际CLI多文件新推理路径；这里保留已测2x native合同，并不声称2x画质更好，默认单张路径及其他对照见非PS报告：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-tools.py' `
  --manifest '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json' `
  --output 'output/image-tool-full-comparison-2026-10-08' --run sxt-native-next `
  --methods sxt-upsample `
  --native-sxt-batch-from 'output/image-tool-full-comparison-2026-10-08/sxt-upsample-validation-r1.json'
```

3. 重现本次PS输出的真实消费者，合并输入已有sourceRuns绑定，不重跑PS/模型；每次更换Scene名：

```powershell
& 'C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs' `
  scene-ps-hips-next 'output/image-tool-full-comparison-2026-10-08/scene-ps-quality-input-r1.json' hips
& 'C:/Users/777/AppData/Local/nvm/v24.16.0/node.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs' `
  scene-ps-prepared-next 'output/image-tool-full-comparison-2026-10-08/scene-ps-quality-input-r1.json'
```

4. 对相关代码变化做必要边界检查；不重复未变模型来填测试数量：

```powershell
& 'output/image-tool-benchmark-2026-10-08/.venv/Scripts/python.exe' `
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/test-image-photoshop.py'
```

正式处理顺序应为：全batch准入→批量产生候选/原图/PSD→按结构损失/亮星异常/边缘对照审阅→只对明确异常作可编辑修补→同实际Scene质量门槛复核→通过后才计新输入、修补及人工review总时间。本次交付到了可重复测试/编辑/审阅路径，未替未来手工修补声称合格或编造人工吞吐。

官方能力/源码参考：[Adobe脚本自动化](https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/automate-photoshop-with-scripts.html)、[Adobe高光颜色范围](https://helpx.adobe.com/photoshop/desktop/make-selections/freehand-selections/select-a-color-range-in-photoshop.html)、[RC Astro SXT](https://www.rc-astro.com/software/sxt/)、[nox代码/权重](https://github.com/charvey2718/nox)、[Siril官方脚本仓库](https://gitlab.com/free-astro/siril-scripts)。本报告的画质判断依据实际已绑定输出，不以宣传代替实测。
