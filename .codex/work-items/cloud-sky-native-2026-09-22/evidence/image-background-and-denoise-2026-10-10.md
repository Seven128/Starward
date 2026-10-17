# 完整RGB背景、降噪顺序与实际Scene

2026-10-10当前有界记录，补齐已完成实施的恢复入口；不替代方案或验收。工作区/分支不变，全部原始输出和FAILED保留，普通采用0。更早六源/SXT/PS/当前银河背景的证据沿[原批次记录](image-batch-repair-and-scene-2026-10-09.md)，不重做该批次。

## 实施结果

- `optical_display_background.py`以现Photutils源排除/稳健网格估计提供完整RGB显示背景处理；`reviewed_background_display.py`核原输入、排除mask、背景数组和最终全像素公式。完整coverage与显示黑分开，科学有效性UNKNOWN。
- `reviewed_denoised_display.py`核NXT实际vendor/output/ICC及父阶段；`reviewed_restored_display.py`统一原SXT/PS父资格。现有`image_quality`复核、native出版、合同、库存及Scene消费者共同支持背景、背景→NXT、NXT→背景三种明确有向含义；不把后处理冒SXT-only或未修改原图。
- 细档复用已经看审的精确PNG，仅生成两粗档；暖读回验证精确结果，不再解原JPEG/推理/拟合/编码。NXT→背景诊断已生成的结果通过实际像素证明导入一次，没有为统一格式再做模型或拟合。
- 共享Scene的显式背景variant在线性sRGB显示域相加，再编码；没有称为观测物理叠加。实际alpha:false WebGL默认缓冲的RGBA复制曾报1282，已按ALPHA_BITS选择RGB/RGBA，并在复用纹理为信号缓冲前恢复RGBA，保同资源预算、失败围栏和释放。实际软件Scene修复前失败、修复后完成；仍不提供目标WEAPP/手机资格。

## 精确结果入口

| 加工 | 实际结果/复核 | 本地候选与实际Scene |
| --- | --- | --- |
| PS恢复完整RGB→背景估计 | `output/eso-image-supply-2026-10-10-background-r1/products/result.json`；同根`reviewed/review.json` | `output/eso-image-supply-background-candidates-2026-10-10-r1/result.json`；`output/prepared-scene-batch-2026-10-09/eso-background-r4-linear-fixed/result.json` |
| 背景后固定NXT | `output/eso-image-supply-denoise-2026-10-10-r1/result.json`；`output/eso-image-supply-denoise-reviewed-2026-10-10-r1/review.json` | `output/eso-image-supply-denoise-candidates-2026-10-10-r1/result.json`；`output/prepared-scene-batch-2026-10-09/eso-denoise-r1-linear/result.json` |
| 固定NXT后同配方背景 | `output/eso-image-supply-denoise-before-background-2026-10-10-r1/result.json`；`output/eso-image-supply-background-order-diagnostic-2026-10-10-r1/result.json`；导入`output/eso-image-supply-denoise-before-background-estimate-2026-10-10-r1/result.json`；复核`output/eso-image-supply-denoise-before-background-estimate-reviewed-2026-10-10-r1/review.json` | `output/eso-image-supply-denoise-before-background-candidates-2026-10-10-r1/result.json`；`output/prepared-scene-batch-2026-10-09/eso-nxt-before-background-r1/result.json` |

三候选publicationHash分别为`a3342de5b0845b343a5116c5b71a85c81c7d84c909d75f6daa2a10205c0e11ae`、`086d77b3266483d29c4a01a6c117d72c6a40dda3e456561adc5283596fb52250`、`65ee5bce4965012c1bfa8d2035f36907cefba5eb00d91dc5561bce06a7ab9da2`。它们是同一NGC246源的不同加工epoch，不是新增三幅图。

两次NXT各一幅/一次GPU调用，沿已冻结ML3.1、0.9配方，耗时约5.75s和4.50s；同配方背景拟合约11.82s和13.14s。NXT采样进程RSS约537/541MB只为下界，GPU峰UNKNOWN，不作为全机容量结论。原粒度/顺序对照整图及关键ROI已看审，显示结构保留只是对应对照观察，不是物理弱信号完备证明。

实际Scene三版每版11帧运行完成，GL/退休检查通过；视觉均保留**FAILED_VISIBLE_RECTANGLE**。NXT在前使多数已量角区残底更低，一角蓝通道并未改善；最后仍有很浅方框，不能把“较好”记为完成。最近一版已看宽/细DETAIL及off对照，不能声称所有LOD图逐一视觉看审。该区域目标目录星计数为0，不能据此证明照片/目录星协调。

前两版失败决定在`output/eso-image-supply-2026-10-10-background-r1/scene-decisions-linear-failures.json`；旧实现绑定后续可失效，原FAILED保留。最新顺序版Scene的独立决定尚未封存，全部新epoch尚未合入唯一全量库存；旧8epoch/6源库存只代表其原范围。后续应复用真实结果完成关联，不为补记录重新渲染/处理。

## 检查与剩余边界

同根`order-contract-tests-r1.log`为5项native合同，`order-inventory-tests-r1.log`为7项实际库存测试，`order-owner-tests-r2.log`为6项saved-proof/队列检查；它们不是一次12项命令。合同、miniapp和API按各包固定TS5.9的typecheck进程均exit0。共享GPU/融合此前相关16项通过；独立数值shader像素回归尚缺，不外推目标设备。

实际错误recipe pin的native批次在decode/encode/inference前退出2，回执保FAILED：`output/eso-image-supply-native-negative-2026-10-10-r1/result.json`。两顺序暖缓存分别在`output/eso-image-supply-denoise-warm-2026-10-10-r1/result.json`与`output/eso-image-supply-denoise-before-background-warm-2026-10-10-r1/result.json`读回为REUSED_VERIFIED_LOCAL_CANDIDATE。旧TS6/SCSS和驱动失败日志保留，未为绕过它们改配置。

本次研究时发现并修复背景batch父stage被job目录覆盖的缺陷，两个父阶段的真实小型估计/回执路径有失败前复现和9项检查通过，详[研究记录](image-processing-mature-methods-2026-10-10.md)。该修复不改已冻结执行代码或历史输出。

仍需：真实融合图质、目录星协调、科学/绝对配准、普通采用与静态分发、完整库存/供给覆盖、目标原生/手机、物理容量及独审。现128MiB背景NPZ读回边界没有证明适合未来大图；新增阶段的批次假数据检查不代完整真实父资格端到端。未来模型执行快照须核新增共享依赖闭包；既有快照按真实旧执行保持，不能补写成历史执行。

## 独立供给和在途操作

上一阶段启动的ESO两源获取session73607本轮确认exit0；`output/eso-image-supply-2026-10-10-increment-r1/acquired/result.json`两行均SOURCE_PREPARED_PROCESSING_PENDING：M104历史B/V/R 1870×1815，NGC3621历史B/OIII/V/R/H-alpha 3530×3124。原JPEG/XMP/页面/CC BY4及精确credit已由既有owner保存绑定，名义AVM仍UNVERIFIED。两行未跑SXT、未复核采用，不能增加可用图像数。

`output/eso-image-supply-2026-10-09-r1/current-operations.json`已收敛active为空，并补实际candidate74801完成状态。最新用户要求先调研与沉淀，本轮没有继续推理或重加工NGC246；共享测试的小型合成数据不计真实加工量。
