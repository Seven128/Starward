# 显示质量v1集中重判

本次明确恢复实施后，仅复用精确已有像素、实际Scene和适用实现证据，按[当前质量标准](../../../../project_context/development-workflow/resources-and-artifacts.md#cloud-sky-display-quality)集中重判。无新下载、模型调用、编码或Scene帧；旧FAILED/UNKNOWN及原决定保留，新决定绑定标准、观看条件和原证据。

## 结果与边界

| 素材/版次前缀 | 当前Scene结论 | 依据及未闭范围 |
| --- | --- | --- |
| Fleming1整幅 `356146b7` | FAILED | 两视角三档及off对照存在明显旋转矩形、照片星密度断边；喷流/核心保留不消除融合问题。 |
| Abell33整幅 `fec46ec8` | FAILED | 方形背景、密度边缘和原照片亮前景星衍射明显；不以擦掉弱壳换通过。 |
| NGC2899整幅 `bd72b4fd` | FAILED | 密星方块和背景亮度边缘在正常观看中明显。 |
| M104整幅 `fa72aeb8` | FAILED | 旋转非零底色矩形及照片星场边缘明显；本版保原光晕/紧致成员，不继承去星版内容错误。 |
| NGC7009整幅 `3afb1bcf` | PASSED（软件Scene范围） | 全看DPR1夜间11帧、DPR2两视角五光照20帧：壳、中心、ansae及弱蓝晕保留，无明显矩形/接缝/重影/换档跳动。五组真实太阳高度约13.32、−0.34、−7.25、−14.17、−41.75°，目标高度31.44–54.49°、日距119.12–119.28°。同父MUSE线图只证相对方向/尺度；绝对配准、权益交付、原生/手机及独审分别未闭。 |
| ESO378背景版 `196a5e3f` | UNKNOWN | 已看精确DPR1夜间contact及原尺寸细图；轻微颗粒/淡底在新标准下不单独构成明显问题。DPR2/昼暮尚缺，不以夜间有限范围直接判全Scene通过。旧FAILED_VISIBLE_RECTANGLE_REDUCED仍保留。 |

NGC7009本次通过的是显示质量维度，不能改写独立配准和发行权益为通过。小视场无BSC/SAO目标星不建立通用照片/目录星协调证据。普通采用和可分发仍为0。

## 精确入口与身份

- 新决定、标准及原决定依赖：`output/eso-quality-v1-reassessment-2026-10-10-r1/{whole-source-scene-decisions,ngc7009-scene-decisions,eso378-scene-decisions,review-summary}.json`。
- 库存输入：同目录`inventory-input.json`，9313B，SHA-256 `4f30430d02ce91be014c03f2a9b9d7c55390e98f7ec5c93ae75061870007cda3`。
- 原库存owner读回：`output/eso-image-supply-current-inventory-2026-10-10-r9.json`，exceptions空；13候选版次、2对象/6区域，36独立图片58,657,055B；连metadata去重payload58,743,501B。同一对象的新旧版次不重复算目标，候选增长不是实际采用增长。
- 四整幅原Scene：`output/prepared-scene-batch-2026-10-09/full-source-quality-v1-r1/`，35帧。NGC7009两组为`eso-full-source-r1/`与`eso-full-source-illumination-r1/`；ESO378为`eso3781-background-r2/`。
- 全量读回各组输入/实际解析生产依赖及帧hash。四组分别186/153/152/151个唯一绑定；生产依赖和全部帧保持。两组NGC7009的活跃runner后来扩展，但当次执行快照同字节可读，复用该快照；不把无关profile扩展当生产实现变化，也不改旧回执。

本次没有重开已被反证的黑位/NXT/不完整成员恢复。后续沿唯一PLAN补合格来源及实际缺失条件，公共署名沿现映射/渲染处理。
