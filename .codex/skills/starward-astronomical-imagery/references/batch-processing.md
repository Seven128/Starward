# 批量素材加工与复核

用于合规来源供给、提前预检与分流、按需加工及批量复核/接入。异常修复读同层的[异常与融合指南](exceptions-and-fusion.md)；来源/工具选择及许可边界留在[外部能力Context](../../../../project_context/external-capabilities.md#云观星合规图像供给)。字段、状态和生产者合同以[流水线接口说明](../../../../data-pipelines/deep-sky/README.md#sxt-batch-processing-workflow)及其源码为准，不在技能另维护一份schema。

## 供给、预检与分流

1. **按缺口选来源。** 先核已有库存、缓存和成品，按目标/天区、真实覆盖及适用清晰度选批次。沿Context核来源/版本公共许可与取得条件，区分资产、数据库和服务权利；同规则复用，缺项/冲突/特殊条款入例外，不因一个来源待许可阻塞已获权组。
2. **分批获取或复用。** 经现来源适配器批量绑定原文件、元数据、身份/hash、几何/颜色及许可字段，保完整原件。按实际增量容量推进，不无差别囤图或等待全部来源下载完；声明就绪的批次即可进入下游。
3. **先看实际显示。** 用最低必要准备把完整原图/成品放进现Scene预检，按产品显示范围看边界、真实结构、点源协调、位置及换档。此时不先跑SXT/PSD/NXT、完整精修或逐图页面旅程；已有适用Scene证据直接复用。
4. **仅做必要加工。** 可直接用的走原图/成品分档；有依据且值得修的按机制批量处理；不适用或触及投入边界的换源/保缺口。真实点源保留不自动要求去星，原样未知小点不逐点分类。各组独立推进，局部成功不替代本图质量结论。
5. **集中复核后接入。** 全量硬检查、内容/实际融合复核和共享消费者验证分责，采用[当前质量标准](../../../../project_context/development-workflow/resources-and-artifacts.md#cloud-sky-display-quality)。来源许可先成立，署名呈现由下游公共元数据/文案映射及渲染落实，不逐图人工校对。合格子集通过原采用/出版owner接入；下载成功、预检或文件通过均不等于普通采用或获准发布。

## 工作输入与本机入口

从当前任务交接和回执找已验证的图像Python、RC-Astro执行文件、模型、原图和输出；不能假定PATH中的`python`具备同一依赖。复用已有环境，先检查缺项，不重复安装/激活。以下PowerShell命令均从仓库根目录运行，`$imagePython`指该Python可执行文件，其他变量指本次已准备的声明或仓库内新输出目录；它们是调用模板，不是新增命令行参数。选好真实文件后计算pin，pin只固定字节，不能替代内容/来源审核：

```powershell
$manifestPin = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant()
```

首次使用或接口变化时核对应`--help`与源码。声明绑定实际路径、bytes、SHA-256和原来源依赖；保留原图及历史回执，新阶段写新目录，不覆盖旧结果。单行失败隔离，任务取消/超时沿原执行owner退休进程并保留已完成结果。

## 来源准备与分组

- 先按完整RGB照片、连续天区/部分coverage、恒星主体等机制分流，再按结构类别、真实工作尺度和处理状态分组。星团、已分辨恒星结构、月球/行星不能直接套普通去星。旧小样本尺寸不是生产分辨率上限。
- 来源owner记录许可/credit、颜色含义、原字节、几何/视野和资源上限，提供依赖；需要加工的完整RGB由[normalized_rgb_source.py](../../../../data-pipelines/deep-sky/normalized_rgb_source.py)统一全幅LANCZOS归一化，直接复用路线不强加工作图转换。不得隐式指定颜色、压平部分alpha或把插值当新细节；需上下文的加工在整幅/连续区域完成后再生成LOD。
- 同机制配方已适用时直接扩批；新结构/分辨率可能改变误删行为，只用有明确问题的代表验证差异。按声明像素预算分组，不把它当GPU峰值保证，不把2x/高overlap或NXT默认加给所有图。

ESO来源走[prepared_eso_source_batch.py](../../../../data-pipelines/deep-sky/prepared_eso_source_batch.py)，声明为`eso-prepared-source-batch-v1`：精确官方页/大图、已核用途/credit、工作宽度、工具及编码/解码/批次资源上限。已有`cached.page`/`cached.jpeg`按字节绑定复用；不把半截下载准入为完整图。

```powershell
& $imagePython data-pipelines/deep-sky/prepared_eso_source_batch.py `
  --manifest $manifest --manifest-pin $manifestPin --output $acquiredDirectory
```

读`result.json`中每行状态及保留的JPEG/XMP/页面/政策依赖；`sxt-input.json`只含就绪项。名义AVM、成功下载或归一化不建立科学/配准、Scene或采用结论。

### 名义位置与显示配准

先查完整原图内是否确有当前目录参考；空场不能证明照片星协调。名义AVM可能存在显示级系统偏差，疑似错位时保原像素/元数据，按现Context采用的独立参考与成熟点测量/TAN路径核验。参照目录的权益、frame、实际观测历元与污染字段单独查，不能从照片许可外推，也不能把近红外星等当可见光星等。

- 对应核验用原图，不用去星层。最近峰可能是噪声/邻源；完整看空间分布与局部图，再固定训练/留出划分。饱和核心不能直接做普通质心；适用的翼部点测量须掩掉实际截顶核心并保诊断，不能推成科学PSF或测光。
- 拟合前用已知几何控制核像素原点和上下行序，尤其库文档与安装实现的原点表述不一致时；一像素偏移负向控制比往返同一个错误约定更有效。留出点不参与拟合，不用裁异常或增加高阶畸变隐藏误差。
- 报原图像素残差及其在实际最大缩放/DPR下的含义；局部样本不等于全幅精度保证，未知历元/自行运动/未采样畸变继续保留。只改显示坐标时走原publisher的绑定registration合同，复用精确LOD，既有SXT/背景成果不重加工。

字段和兼容规则沿[流水线合同](../../../../data-pipelines/deep-sky/README.md#sxt-batch-processing-workflow)，原AVM、测量、复核和实际Scene证据分别保留。纯目录任务仍不由本技能接管。

连续HiPS区域走[hips_rgb_region.py](../../../../data-pipelines/deep-sky/hips_rgb_region.py)与既有lookup，读取已绑定本地cell、组成整区TAN；该入口不补下载/缺测，声明解码tile缓存上限。再由`sxt_batch.stage_continuous_regions`这个**Python API**分流，不能编造同名CLI开关：

| staging模式 | 处理动作与例外 |
| --- | --- |
| `complete-only` | 核真实RGBA和独立供给mask，只有完整opaque RGB进入普通归一化；部分coverage留队列。 |
| `binary-covered-only` | 经[covered_rgb_display.py](../../../../data-pipelines/deep-sky/covered_rgb_display.py)绑定原RGBA及供给mask；零padding仅给模型画布，最终逐字节恢复源alpha且隐藏RGB归零。跳过完整区域，拒绝fractional alpha及covered upsample。 |

源有效黑、缺瓦片和缺测alpha不同；区域网格不是仪器PSF/有效分辨率。covered产品交独立区域publisher，不借完整照片入口。

## SXT运行、复用与恢复

用来源owner输出的`sxt-batch-input-v1`声明。它的`method`、`tools`、`maxBatchPixels`与`jobs`由[sxt_batch.py](../../../../data-pipelines/deep-sky/sxt_batch.py)验证；每job含唯一ID、subject kind、绑定的RGB8/sRGB PNG、输出尺寸、来源/准入依赖、sourceContext和可选整数ROI。当前普通输入kind支持galaxy、galaxy-pair、nebula、region，不接受cluster或未经专用适配的alpha图。

本机SXT执行由[sxt_processing.py](../../../../data-pipelines/deep-sky/sxt_processing.py)唯一负责：`tools.sxt`指已核CLI，`tools.sxtModel`必须是当前owner指定的`%APPDATA%/RC-Astro/StarXTerminator.11.onnx`；exe、伴随DLL/资源和模型进入身份。许可证/凭据不写入文档或自制日志。当前owner调用`rc-astro sxt`的实际参数是ML11、GPU、8U、`--stars --json`，按`SXT_OVERLAP`选择普通/高重叠方法；`sxt-upsample`要求上游已经提供双倍工作图，是诊断插值，不是工具补造分辨率。参数变化应改原owner/声明及受影响合同，不另写一套裸CLI循环。

```powershell
& $imagePython data-pipelines/deep-sky/sxt_batch.py `
  --manifest $manifest --manifest-pin $manifestPin --output $processedDirectory
```

owner按像素预算串行分组GPU多文件调用，复制到私有输入目录，保存原始无星/星层、事件、ICC及最终输出，执行有界超时和进程树退休。结束后检查`result.json`的每行、`groupReceipts`、实际设备事件、输出层和`nativeInferenceCalls`；**进程exit 0也可能含FAILED行**。缺输出、未解析/失败vendor调用或错误颜色不能因为部分文件存在就通过。初次整批对照位于输出的`review/`。

按变化类型恢复，先复用再决定哪些行需要模型：

| 变化 | 使用方式 |
| --- | --- |
| 原输入、依赖、owner、工具/模型、配方和完整输出未变 | 上述命令加`--reuse-from $priorResult`。只复用精确匹配key且通过当前读回的行；不匹配的行会进入新推理，不能宣称整个命令是只读。匹配但缓存损坏时保失败，不偷偷重跑。 |
| 只纠正来源声明或增加复核ROI，既有模型输入/输出与实际参数仍适用 | 由来源适配器提供显式`existingProducts`，完整覆盖此次jobs ID。原执行owner导入vendor/final/事件和回执，验证ICC及精确像素，记录历史推理出处和零新调用；不伪造旧key为新实现。 |
| 仅质量决定变化 | 使用下面的review-only入口；不重推理、归一化或编码。 |
| 像素、尺寸、coverage或结构机制实质变化 | 重新准入受影响声明，保留旧结果与失败，不能借元数据更正路径套用旧成品。 |

## 集中复核与异常队列

[image_quality.processing_review](../../../../data-pipelines/deep-sky/image_quality.py)统一生成`review.json`和HTML：原图/无星/星层/差异、整图及关键ROI。先核全批身份、解码、尺寸、颜色、coverage、vendor执行与恢复，再集中看残星/误删、弱外围、颜色/亮度跳变。指标用于排序和告警，不能凭未经校准的分数宣称细丝保真。首次同组逐素材集中看审；以后只有经真实样本校准的规则才能支持低风险抽审，高风险项仍全审。

从实际review生成决定，绑定`processingReceipt`以及各行`processingKeySha256`、完整`outputs`与理由，不手改hash来通过。保留三类：`NEEDS_REPAIR`、`REPLACE_SOURCE`、`FILE_REVIEW_PASSED_SCENE_PENDING`。后者仅代表文件层通过。

```powershell
& $imagePython data-pipelines/deep-sky/sxt_batch.py `
  --review-from $processedResult --decisions $decisions --output $reviewedDirectory
```

误删/残环、噪声、底色/颜色、源缺口和几何问题按[异常指南](exceptions-and-fusion.md)分流。先修同组共享原因，只复跑受影响项；一个异常不冻结独立有效批次。

## 本地候选、库存与实际Scene

文件合格行通过一份`prepared-native-reviewed-batch-v1`声明，把加工、复核和来源recipe按ID交给[publish_prepared_native.py](../../../../data-pipelines/deep-sky/publish_prepared_native.py)。SXT、PS组合、背景及NXT顺序使用其真实producer，不能把后处理图塞回SXT-only细档；未批准、缺recipe及失败保持队列。`existing`绑定旧writer/manifest时按当前owner读回，可免源重解码、推理和编码。

原发布图适合整幅保留时，复用同writer的whole-source recipe，不强加SXT或背景处理；照片中有点源不自动拒绝，实际Scene再判断密度断边、重影和协调。已有成品按其专用来源适配器绑定原像素与几何，不能伪造AVM或把上游未知加工写成未加工观测；Stellarium小场四角入口及准入边界沿[原publisher合同](../../../../data-pipelines/deep-sky/README.md#sxt-batch-processing-workflow)。实际看原图和全部LOD后，库存的`FILE`决定绑定原编码源及每档图片；此入口接受Starward未加工full-source/ready-texture且无processing reviewSpec，不能覆盖加工异常。原有效黑不转成缺测。成品低分辨率和照片星场边缘仍须提前检查；实际Scene的小天区视角及最大缩放均遵守产品边界，不能把插值当细节或临时缩小验收范围。

whole-source分档先按真实原图尺寸准入，不能给较小原件统一声明更大的细档；超源宽由原publisher拒绝，不放宽guard或上采样。批内有效版次保留，修正声明后只重试失败行，再把结果合并交同一复核/Scene入口。

```powershell
$batchPin = (Get-FileHash -LiteralPath $publicationManifest -Algorithm SHA256).Hash.ToLowerInvariant()
& $imagePython data-pipelines/deep-sky/publish_prepared_native.py `
  --batch $publicationManifest --batch-sha256 $batchPin --output $candidateDirectory
```

covered/派生区走[publish_prepared_derived_region.py](../../../../data-pipelines/deep-sky/publish_prepared_derived_region.py)的`--manifest $manifest --pin $manifestPin --output $candidateDirectory`。它可封装明确的LOCAL待修候选供检查，不赋予普通采用资格。原RGBA/供给mask是support，不能当运行时LOD；加工内容、CC BY/ODbL通知和完整改动数据交付沿现合同。

候选封装只为本地消费者读回。将整批交原[只读库存入口](../../../../data-pipelines/deep-sky/README.md#read-only-prepared-inventory)关联素材、决定、实际registry和静态响应；不要再建一份采用表。真正发布/部署沿用户授权和原流程。运行时需要同版本裸manifest及全部声明资产，图片或backup sidecar不能替代metadata。

当前[Scene批次runner](../../../../.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs)沿同一`prepared-optical-inventory-input-v1`输入运行：

```powershell
$env:TSX_TSCONFIG_PATH = 'workers/miniapp-api/tsconfig.json'
$inventoryPin = (Get-FileHash -LiteralPath $inventoryInput -Algorithm SHA256).Hash.ToLowerInvariant()
node tools/run-node.cjs --import tsx `
  .codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-scene.mjs `
  $freshRunName $inventoryInput prepared $inventoryPin
```

它批量收集真实BFF/BSC/SAO、Scene/GPU、当前银河背景下的宽/细三LOD和off对照，不编码图片或建逐对象page profile。查看非零照片/背景效果、供给完成及退休，同时集中判各素材融合与配准；渲染成功不自动判视觉。部分失败保帧/结果并exit 2；已决定或排队的全部行无需再启renderer。旧Scene结论仅在精确publication/background、完整场景声明和适用实现相同时复用；执行脚本身份使用当次已保存的同字节快照，不能让后续无关profile扩展使旧证据丢失，也不能改写旧回执来假装同实现。

完整原图的早期淘汰可声明runner已有`sceneChecks.profile: "full-source-precheck-v1"`，用DPR1宽/细视角、OVERVIEW/MEDIUM和off控制集中查明显矩形、星场断边及结构问题。按实际太阳/目标高度与日距确认条件；保存执行快照、原图/各档及真实渲染结果。明确的粗档失败即可停止后续细档、高DPR和昼暮扩跑，转异常/换源；报告预检范围及未跑部分。预检通过只支持继续复核，不能标成最终Scene/最大缩放、高DPR、完整配准、原生或普通采用合格，也不能改小产品最终范围。已判定同机制不再因更换对象重复完整试验；新机制或具体异常才增补相关检查。

昼暮取样先核实际太阳高度、目标高度和日距，再固定日期/时刻与相机。近太阳或地平下的亮底/边界组是独立条件，不代替地平上、远离太阳的融合检查；固定profile名不能代替这些条件的身份。补新条件时复用适用的精确旧目录/银河控制，只跑新增光照的照片off/on与受影响几何读回。示意天空背景的亮度不冒定量测光。

来源说明、cache/LOD调度、Back/退出等**共享消费者机制**只在模块/批次节点选代表验证，新增同类对象不逐一重跑完整页面。owner/机制/规模边界变更或真实失败才重验相关范围；软件或受控背景结果不代原生设备、物理容量和最终验收。

区域集合的新共享机制可用同runner的`region-collection-lifecycle-v1`验证同一Canvas/GPU的视野组数变化、局部退休/重解码及空需求返回；全景中subpixel影像即使submitted也可能没有可见贡献，需读实际completion，并查看聚焦的非零结果，不把无变化全景当多图可见证明。实际公共加载另沿[真实React/Taro入口](../../../../.codex/work-items/cloud-sky-native-2026-09-22/scripts/prepared-region-lifecycle.mts)运行项目React/Query/immutable resource/cache/native-image owner与真实HTTP，只适配平台请求/FS/Canvas端口，集中检查独立延迟、失败、retry、Canvas代次和退休。受控paused不等于原生Sources Back，句柄/寿命与逻辑预算不等于物理峰；清空按cache实际状态与空版本索引读回，保留故意404网络诊断及harness失败。适用机制通过后复用，不按对象重跑。
