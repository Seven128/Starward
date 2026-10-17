# PS异常队列：原图局部真实结构恢复（2026-10-09）

已将此前验证的Photoshop COM/DOM执行迁入`data-pipelines/deep-sky/photoshop_host.py`、`photoshop_batch.ps1/.jsx`；旧测评入口转发到同一owner，原版本只保留为历史证据。新`photoshop_original_restore.py`按精确加工/复核join批量接收NEEDS_REPAIR的完整RGB结构误删，不执行SXT、滤镜、healing或生成填充。冻结窄路径蒙版保留原图核心、羽化接原SXT，其余像素严格不变；原图、原vendor去星/星层都保留。星团和covered region不冒此完整RGB合同。

一次实际PS27.10.0调用处理NGC5128和M81/M82；0新模型调用。`output/ps-original-restoration-2026-10-09-r1/result.json`、`native-report.json`是原执行，未改写。原输入清单sha256 `dfc8b866536b7edf53fb183aac19277211cb02172903cbe6a6878b62c20bb23e`；PS原exe为268665840B、sha256 `aff3d47dc1aac80df610a1c9bed69a12d90538d3fafd456226e860cabca3be8a`。Native工作22.781s、COM连接11.9307s、host34.9345s；RSS采样包括整个既有PS基线，仅为采样下界，GPU/物理峰UNKNOWN。开始/结束文档均0，任务PSD保存后重新打开验证3层/1alpha channel/真实可编辑user mask/完整几何，再关闭任务文档；应用及用户文档所有权不改变。

| 当前工作文件 | 真正改变的范围及读回 | 当前视觉决定 |
| --- | --- | --- |
| NGC5128 1024×1001 | 原图核心424像素、蒙版外1022326像素；核心/外部通道差均0，羽化最大码差0；仅1920像素改变 | 实看全图及原ROI，细红蓝丝已恢复，窄蒙版内也恢复少量原前景点；黄色残环ROI805,618–875,688仍FAILED，NEEDS_REPAIR |
| M81/M82 1024×572 | 原图核心333像素、蒙版外583613像素；核心/外部通道差均0，羽化最大码差0；仅594像素改变 | 原红臂结点已局部恢复，全图外围/M82保持原SXT；当前工作文件FILE_REVIEW_PASSED_SCENE_PENDING，不代表原始高分辨率、照片外连续背景或科学通过 |

文件硬检查不能替代实际Scene。原先5项复核和新区域的历史失败未改写；这里是2项新增局部修复决定。配准UNVERIFIED、科学UNKNOWN、普通Prepared空/HiPS关、照片边界FAILED、手机/物理/独审MISSING和33项义务保持。PS组合加工不能伪装已有SXT-only producer；新的postprocessor/区域出版合同与consumer仍待接通。

本轮发现真实复用缺陷：执行源代码作为可变live path写入job.dependencies，使新增读回校验后原成品因owner epoch变化被拒绝。原`r1/review-decided/review.json`的两HARD_CHECK_FAILED保留。现批处理在执行前一次保存精确execution-sources；共享`import_restoration_products`只允许四个声明的执行源同bytes/hash迁址，数据输入、输出、native report和像素证明仍全部检查。历史r1首owner仅撤回新增校验编辑恢复到原13282B/sha256 `c60fcc9e14de04a03edcd34aad02d54acdc2e961d750c8b524a59713cfe99f95`，其他三文件保持原字节；这些是在执行后保存的精确历史源，不声称当时已有snapshot。原receipt/key保留，新`output/ps-original-restoration-readback-2026-10-09-r2/result.json`显式记原key、parent及execution dependency relocation；0 PS/模型/成品编码，原输出完全复用。当前review决定绑定r2精确key与完整outputs，不用新hash冒原执行epoch。

当前机器证据：`output/ps-original-restoration-2026-10-09-evidence.json` 12441B，sha256 `2ec8dd649a329ace0095fdd8e8fb6a01f6302353efa1505dcde20ea0346894a7`。包含历史native与当前校验owner分离、实际完整输出/PSD、失败复核、决定、像素读回和检查范围。5项恢复owner测试通过（fixture非PS：外部篡改不能通过且好行保留、不可整图恢复、saved geometry/duplicate身份拒绝、同字节代码epoch迁址允许而数据迁址拒绝）；现image_quality13、SXT14、coverage3通过。旧PS admission9通过，不重跑关闭的工具测评；曾因旧epoch遮挡损坏输出用例的1失败保留，仅修fixture使当前epoch真实进入损坏检查。实际PS运行未重复。

当前唯一下一依赖仍见PLAN：明确加工区域坐标/provenance/content与ODbL合同、局部PS后处理语义，再进入原Scene/source/Back和连续背景/目录星/邻片质量复核。黄色环与M61亮源残晕保持异常；没有假造修复、采用、设备或独审结果。
