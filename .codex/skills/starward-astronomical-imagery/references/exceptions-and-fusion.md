# 异常修复、背景与实际融合

仅在相关异常或环节读取。通用输入/环境、批处理与决定交接见[批量指南](batch-processing.md)；本文件持有操作方法，选型与采用理由仍在[外部能力Context](../../../../project_context/external-capabilities.md#云观星图像处理工具)，当前显示含义在[背景Context](../../../../project_context/development-workflow/resources-and-artifacts.md#astronomical-background-and-display)。不要从历史候选运行成功推定现已合格。

## 先判断要修什么

固定同一原输入、工作尺寸、颜色状态、实际合成及异常ROI，读已有原图/处理/星层/差异和Scene，避免又跑一轮模型才判断问题。

| 观察 | 下一步与退出条件 |
| --- | --- |
| 星云结、星系颗粒/中心等真实结构进了星层 | 核源中实际结构和尺度，判断是否整组去星机制不适用；有限局部误删可做原图恢复。无法分离时换配方/来源，不能统一抹掉亮小点。 |
| 残环、纹理/星密度岛、可见局部接缝 | 同看恢复区和外部；原图恢复会带回恒星/噪声。共享规则先修，需新滤波/模型时按主技能调研；像素相等不等于修复好看。 |
| 平滑空间梯度，背景模型明显偏差 | 核模型样本是否含目标、mask/mesh与颜色空间；有根因证据才对照成熟估计法，不为方框自动更换估计器。 |
| 模型平滑但残余颗粒/近黑方框 | 分开检查噪声、正残差截断与显示贡献。NXT可降噪但不保证底色为零；转到下面的实际融合诊断。 |
| 缺外围、缺覆盖、位置/尺度不符 | 回来源、coverage/几何owner。补源/换源或修合同；不以羽化、裁边、插值和生成内容补造供给。 |
| 文件检查通过，Scene仍失败 | 先查实际消费者、颜色/合成、采样/LOD及真实背景，再定最小对照；不继续只看黑底文件预览。 |

已确认的普通代码/格式错误直接修原owner，无需重启工具选型。原因未知、假设被反驳或下一步只剩盲调时，执行SKILL的主动调研与有界试验；独立适用批次继续。

## PS恢复被误删的真实结构

[photoshop_original_restore.py](../../../../data-pipelines/deep-sky/photoshop_original_restore.py)只接受精确绑定的完整RGB SXT `NEEDS_REPAIR`行。先join原加工/复核key与全部outputs，再声明`photoshop-original-restoration-batch-v1`；它不是任意图片重绘入口。

1. 以实际源图定义要恢复的结构，加入修复内外/边界`reviewRois`。蒙版用有界圆/笔划、多边形及`featherPixels`，或提供同网格L8 PNG `frozenMask`的bytes/hash，二者互斥。外部mask无alpha/ICC且须有0与255区域，255核心恢复原图、0外部保SXT；灰阶仅定义过渡。目录轴径不能直接当真实弱结构轮廓。
2. 绑定本机Photoshop执行文件身份及版本；声明正的`maxBatchPixels`。当前COM批次容纳1..5项，只是现host边界，不能据此逐对象开发或降低产品容量目标。`pngExport`支持`save-for-web-profile`与`save-as-png`；按既有合格出口使用，换出口仍需真实读回。
3. 通过同一host/batch执行。保原图、SXT基底、冻结mask和可编辑PSD；不调用healing、生成填充或重跑模型。

```powershell
$manifestPin = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant()
& $imagePython data-pipelines/deep-sky/photoshop_original_restore.py `
  --manifest $manifest --pin $manifestPin --output $restoredDirectory
```

共享[photoshop_host.py](../../../../data-pipelines/deep-sky/photoshop_host.py)与[batch PS1](../../../../data-pipelines/deep-sky/photoshop_batch.ps1)/[JSX](../../../../data-pipelines/deep-sky/photoshop_batch.jsx)保存并**重新打开实际PSD**，核真实层mask/几何，再核最终整图：核心原像素精确相等、外部SXT像素精确相等、羽化量化符合owner容差。输入和工具身份在COM前后核验，执行源码在派发前另存快照；不以导出成功或截图替代读回。

随后走原review-only队列，原SXT异常与组合输出复核是不同epoch，均保留。集中看弱结构、恒星/纹理连续性与接缝；必要时按真实Scene判断。组合细档必须走`reviewed_restored_display.py`，不覆盖SXT-only产物。已有精确产品用`import_restoration_products` **Python API**核像素和同字节执行快照，免PS/编码；允许原执行源码同内容迁址读回，不能迁址数据输入、改写旧执行身份。

PS host另有`local-residual-median`诊断：保护mask与整数半径1..100须在COM前绑定，保实际滤波层、候选和重开的PSD。它是局部显示估计，**未有准入批次/producer**，不能装作原图恢复。参考[有限诊断证据](../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/ps-local-residual-median-2026-10-09.md)复用失败边界；无新根因不循环半径。

星系光晕的球状星团等紧致成员可与前景星外形相似，不能因整图尘带/光晕保住就放行全部小点。已有可信分类表时，用已核几何投到原网格，集中对照原图/SXT/星层和前景反例；表的缺项、历元/配准限制与图上混合另保UNKNOWN。`review-image-catalogue-structures.py`任务诊断可复用精确表、原处理及已测TAN，并加入恢复图作集中读回；它不自动识别成员、不拟合或批准蒙版。有限且可分离的恢复支持汇入一次现PS批次，拥挤邻点与外部一起看；有限表的成功不能证明整个场无误删。真实反例与边界见[结构复核证据](../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-structure-and-full-source-2026-10-10.md)。

## 完整RGB的背景估计与可选NXT

先说清待解的是梯度还是颗粒，以及必须保留什么。当前入口针对已拉伸sRGB显示图，逆sRGB并不恢复观测线性/动态范围；科学有效性仍UNKNOWN。父阶段标签`SXT_ORIGINAL_RESTORED`可承接文件合格的完整SXT图或PS原图恢复组合，由实际job区分，不要求给普通合格SXT额外做PS。原恢复核心的像素证明属于父阶段，后续背景/NXT会改变最终像素，不得把旧证明套到最终图。

背景走[optical_display_background.py](../../../../data-pipelines/deep-sky/optical_display_background.py)；`optical-display-background-batch-v1`绑定父加工/复核、各行`exclusionMask`、`boxSize`、`sourceDilation`和预算。exclusionMask是有真实图像依据的同网格二值L PNG，表示不用于估计；**它不阻止对目标像素扣背景，也不是显示alpha**。

```powershell
& $imagePython data-pipelines/deep-sky/optical_display_background.py `
  --manifest $manifest --pin $manifestPin --output $backgroundDirectory
```

核`display.png`、`background.npz`、`estimation-mask.png`及整图/ROI。实际算法/资源限值由owner持有：源排除和稳健网格估计、逆sRGB扣背景、负值截零再编码。看模型是否吃掉弱外围、样本/边缘网格是否有偏差；文件/公式通过不能证明剩余噪声零均值或无方框。

大图在拟合前按真实原网格核未压缩背景数组及工作/验证资源，不只看压缩文件大小。当前batch可显式声明`maxBackgroundBytes`，保存结果沿owner的有界映射读取与逐通道/逐行核验；旧内存读取上限不因此放开。预算或已支持表示不够时先解决该责任或保队列，不缩图、降精度或跳过公式证明绕过；独立适用小图继续。用真实加工和读回采样验证新规模，但本机进程峰值不冒全机或生产容量。

完整RGB NXT使用当前[有界任务runner](../../../../.codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-denoise.py)，它尚不是任意参数/任意输入的通用NXT批处理器。`background-display-nxt-trial-batch-v1`要求`question`、`transition`、绑定父阶段、有效ROI与预算；`recipe`必须等于[reviewed_denoised_display.py](../../../../data-pipelines/deep-sky/reviewed_denoised_display.py)及runner的固定`RECIPE`，不能凭“看起来差不多”放宽。`colourBoundary`须绑定适用的有界sRGB数值/metadata对照及精确CLI/模型身份，不能拿SXT的ICC经验自动证明NXT。

```powershell
$nxtPin = (Get-FileHash -LiteralPath $nxtInput -Algorithm SHA256).Hash.ToLowerInvariant()
& $imagePython .codex/work-items/cloud-sky-native-2026-09-22/scripts/benchmark-image-denoise.py `
  --input $nxtInput --input-sha256 $nxtPin --output $denoisedDirectory
```

保raw vendor、实际模型输入、最终RGB/ICC、事件及费用/资源相关计量；成功但无可见收益不加入组默认配方。当前有限阶段为：

| 动作 | 可用父阶段 | 后续限制 |
| --- | --- | --- |
| 背景估计 | `SXT_ORIGINAL_RESTORED`或`NXT_SXT_ORIGINAL_RESTORED` | 输出走背景复核owner；NXT前后背景是不同顺序/producer。 |
| 完整RGB NXT试验 | `SXT_ORIGINAL_RESTORED`或`BACKGROUND_DISPLAY` | 仅准入既有有限链，不能递归NXT/背景循环。先NXT但尚未扣背景的结果可作父输入，不因此有独立可出版variant。 |

[reviewed_background_display.py](../../../../data-pipelines/deep-sky/reviewed_background_display.py)与`reviewed_denoised_display.py`的复核入口验证保存结果，沿父级`reviewed_restored_display.py`资格。背景后NXT与NXT后背景保各自精确处理/复核链、颜色意义及最终细档；已有输出复用，不为统一格式再拟合、调用模型或编码。初始trial回执中的未接线状态属于当时事实，现候选资格由当前validator、决定与publication实际join给出，不能改写旧回执。

旧**部分coverage NXT grain trial**仍由[nxt_review.py](../../../../data-pipelines/deep-sky/nxt_review.py)只读核完整父链/ICC/供给，沿`sxt_batch.py --review-from … --decisions … --output …`生成`nxt-review-queue-v1`。该路线仍无对应publisher；不能借完整RGB的新variant放行，也不能把这一限制写成“所有NXT都没有接线”。

## 方框、透明与真实融合的诊断

1. **读实际合成。** 沿[sky-artwork-level-composition.ts](../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts)及消费者查颜色空间、RGB/alpha、显示贡献与覆盖，不凭文件扩展名猜合成方式。RGBA、Screen/Add或降低整图opacity都不自动清除非零背景；有效黑仍有源支持。
2. **分开三类mask。** 缺测/供给决定是否有数据；背景排除决定估计样本；显示软蒙版/贡献决定画面影响。单纯把背景估计mask当“保目标”或把显示透明改成缺测，会分别损失结构或错误回退LOD。
3. **用最小真实显示对照决定下一步。** 复用整图和ROI，对照照片off/on、真实背景、宽/细尺度、边界和已观察弱结构；需要照片星与目录星协调时选确有相关目录星的代表。比文件黑底预览更早查明是否仍有方框、halo被吞、暗尘带消失或局部纹理岛。固定输入和背景才能比较方法；有新合成机制时先证明收益，再扩producer/全批接线。
4. **按失败责任调研。** 模型有空间偏差才对照成熟背景估计器；颗粒和正残差需另评噪声/黑位/贡献。颜色转alpha会改变RGB及近底色结构，不是语义抠星体。若评软蒙版，只在有依据的背景和受保护结构范围内试，保原支持、可审编辑层及实际Scene反例；不能以“更透明”单独判优。
5. **退出与沉淀。** 既有弱结构受损、无可靠背景范围或实际Scene仍失败时保FAILED/UNKNOWN，回到有依据的新方法或来源；不重复相同假设。把能改变后续动作的操作合并到本指南，采用理由回Context，数值/截图/本次下一步留任务证据。

已验证的黑位反例：逐通道扣黑/截零能压低方框，也会不同比例截断RGB、提高饱和并削薄弱外围；统一RGB比例的固定黑位虽改善色比，仍未保住该对照的弱外围。背景分位数不能证明被截像素没有目标，色比保持不能代替结构保留。只有新的结构/背景依据或来源才重开，不在同一反证后继续扫阈值。文件反例已决定失败时停止昂贵下游；需实际融合判定时，可用task `trial-image-contribution.mjs`复用精确绑定的实际Scene照片off背景和当前GPU组合做廉价局部对照，核copy-only像素完全一致、parent replay差异及坐标/颜色/资源状态。它不执行完整Scene状态机或出版路径，不替代批次节点验收。具体输入、反例和限制见[增量与黑位证据](../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-increment-and-blackpoint-2026-10-10.md)。

具体成熟参考及其已验证/候选边界沿[背景Context](../../../../project_context/development-workflow/resources-and-artifacts.md#astronomical-background-and-display)和[研究证据](../../../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/image-processing-mature-methods-2026-10-10.md)读取，不另堆工具大全。上述诊断不等于每张图重走页面；方法成立后返回批量准入、集中内容复核与共享消费者代表验证。
