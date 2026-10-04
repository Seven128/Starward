# 校准科学值先缩小、后固定显示的小路径（未采用）

本轮沿 PLAN B 解释背景与弱结构责任。复用已有完整 SDSS 六字段科学母图，不重新取得/准入 FITS、重投影、拼接、修改旧 RGB/LOD/出版或默认；HST 原科学横条不被用作 sky 拟合。新增均为 task-only 候选/自读回，独立审查和图质采用仍缺。

## 不把统计值当背景

[Photutils 背景指南](https://photutils.readthedocs.io/en/stable/user_guide/background.html)明确源会偏置全图统计，box 尺度/源排除和无覆盖区域需实际区分；`mask` 与 `coverage_mask`不是同一角色。M51 原 HST README 因星系填满画面关闭 sky subtraction，成对 EXP 贡献资格不能提供空天区域。当前没有依据下载2.52GB全套后自动拟合黑点；也不把现成 Background2D 当作自动质量保证。

[反例脚本](../scripts/experience-background-qualification-2026-10-03.py)直接复用既有 SDSS g/r/i 和 coherent joint，原单位 nanomaggies/native-pixel、sky 已扣、校准已完成，源全字节保持。Astropy `sigma_clipped_stats` 固定 sigma3/maxiters5 仅诊断，不生成背景/改图。所得全图 clipped median g/r/i 为0.01248519/0.02229974/0.03417485；若误当 sky 再减，将使1,056,760/1,098,034/1,049,444个原正测量变为非正。这些可能含噪声与源信号，不能宣称全部是弱天体结构，但已足以否决“robust statistic 就是可减背景”。[结果](../../../../output/background-qualification-1003-r1/result.json)3,396B，SHA `515e4761f620e9e2320106ec0761962565aa23bd15610e3b76320c9d11de898f`。它不是新 sky 估计或科学有效性判定。

## 处理顺序的实际候选

现有 `sdss_gri_tan.py` 的 pyramid 对已经 Lupton 映射、显示负值裁零的 RGB 做整数 box mean。这个顺序保既有图/合同语义，但负噪声先被显示裁掉后，粗档无法再由正负样本相抵。新的候选只交换缩小与固定显示的先后：同一 signed science master→实际同一裁切/平均→同一固定 Lupton .5/Q10、i/r/g、vmin0→PNG。参数来自已冻结的文档示例试验；没有新曝光拟合、逐档黑点/白平衡、去噪/去卷积或生成式细节。科学单位保为原样本量的平均，不称粗像素总 flux或额外校准。

[执行脚本](../scripts/experience-signed-science-lod-2026-10-03.py)绑定旧 candidate SHA `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52`、旧 transfer SHA `3878ac009819d182c5399cc4f8dca8ece460b9aa15c068d4b46bbcb015e0c068`和具体science/RGB/PNG；来源/保护文件前后同字节。旧三级PNG读回与既有RGB box逐像素一致。新mean先保float64有符号，三带各档求和乘factor²与原裁切求和差小于1e-7；仅固定显示输入转float32。所有源joint完整，alpha仍255；不从亮度产生缺测mask。当前试验没有验证partial/coherent失败恢复，不能直接扩为通用生产pyramid。

[结果](../../../../output/signed-science-lod-1003-r1/result.json)13,286B，SHA `178dc73b819ea1600eabbc6532c403fade534a0f2f8c148363de115e3e57d293`。总览/中档变化181,376/116,503像素，channel max差67/25；细档factor1完全一致。总览四64px角区原/新RGB均值分别(8.585,4.688,2.281)/(5.208,3.188,1.481)，max-channel中位7→4；中档角区差较小且不是空天区域。不能把角区统计解释成真实 sky 或以黑像素数认证弱结构。

新三PNG合1,557,725B，旧1,543,530B；底色较少没有带来编码变小，不能声称端云字节优化。Detail新PNG SHA `7c63d6564b260e14fc2fdebaa2cd8c9f18d4fc449844cb7bcb9bdc75755f09fb`，像素与旧细档一致。每档仍512²、原TAN field/crop不变；具体新像素和署名/色义将需要自己的出版责任，不能覆盖旧immutable URL。

## 控制例、真实图和限制

[读回脚本](../scripts/verify-signed-science-lod-2026-10-03.py)核新mean/PNG身份和共同裁切：OV中心=MED再平均，MED中心=DETAIL再平均，三带最大差均0。balanced ±.03 的有效16样本、原均值0，旧显示后box=[8,8,8]、新科学先box=[0,0,0]；加入真实类型的弱常量.02，新仍显示[11,11,11]且8个负输入保为有效测量。这只是合成噪声边界控制，不是生成天体或真实噪声模型；显示黑不等于科学缺测。库在零强度处的正常 divide RuntimeWarning 保留，输出finite。

R1读回保留；R2补把用于边界对照的旧overview PNG也明确绑定，不重做scientific generation。[R2结果](../../../../output/signed-science-lod-readback-1003-r2/result.json)5,796B，SHA `b90419f2acd72f840f47b91be4abc3db776df0b72e5daed80680d4222b729689`。这是自读回，不是独审。

实际查看[overview](../../../../output/signed-science-lod-1003-r1/overview-comparison.png)、[medium](../../../../output/signed-science-lod-1003-r1/medium-comparison.png)与[含外部背景边界](../../../../output/signed-science-lod-readback-1003-r1/overview-boundary-comparison.png)。固定黑/(3,7,16)背景、1:1像素及64px外边距下，总览偏亮颗粒底减少，伴星/连接区/外围仍可辨，中档变化小。棕橙色调、细档源清晰度和噪声仍未解决；不能从签名求和守恒或此静态比较认证所有弱结构、完整图质/PSF/来源Back/native。背景对照复用已有 encoded contribution helper，非物理线性radiance或真实Scene。更不意味着 HST JPEG 矩形修好：该未经校准照片没有有符号科学输入。

首轮误用系统Python3.10遇缓存cp312 NumPy导入失败，未建立输出；随后复用此前已用的 bundled Python3.12，不安装依赖。失败脚本和原因在[初始记录](../../../../output/background-allocation-initial-attempts-1003-r1/observed-failures.json)。生产代码/默认/旧源不变，不重跑无变化TS/GPU全旅程。

下一项是将这个有证据的顺序明确为校准科学源的候选责任：共同资格/partial/有效黑与negative、固定全局recipe/源面积色义、single/mosaic实际调用和出版重现边界，再核真实层级/背景/颜色/PSF与消费者。若扩大能力，须保持旧encoded RGB合同，不能无版改其pyramid。HST空天/具体权益/完整科学处理、M82输入、普通采用和完整整场质量继续开放。

更新后 `npm run context:validate` 通过，仅核manifest路径/声明；两份新证据14个本地链接存在，当前tracked影响范围 `git diff --check` 通过，CRLF提示保留。R2边界对照与已实际查看的R1 PNG同SHA，不重拍/重加工。生产源码未改，不重复TS/旧GPU矩阵；本轮自读回不替代必要独审或Goal完成。
