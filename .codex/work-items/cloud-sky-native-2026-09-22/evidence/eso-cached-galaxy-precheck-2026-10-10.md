# 五份既有完整照片的集中预检

本批复用既有ESO NGC300、NGC6744、NGC1232缓存、来源回执、公共许可及原AVM；新增来源/下载/模型/PS均0，不占第五份输入或启动30–50扩批。结果是三份整幅照片均不能直接用于当前星空显示，新增合格与普通采用均0。四份新增/替换输入试点额度、唯一PLAN及全部33项义务不变。

随后以同一入口复用既有NGC7293/NGC2359，验证弥散星云的弱外围/真实气体到源边缘这一内容机制，而非按对象复制开发。两项也在粗档决定性失败；现五项全部保FAILED，不再因更换同机制对象扩跑完整实验。

共享whole-source publisher保持完整矩形、真实结构、颜色与名义几何，仅生成声明的JPEG三档，无裁边、alpha、去星、降噪或填补。实际看审原图、全部LOD及原分辨率ROI；文件在声明分辨率通过，JPEG并非像素相同。名义AVM、文件通过不能证明独立配准或科学资格。

## 实际Scene与决定

原批次runner新增有明确范围的`full-source-precheck-v1`：普通区域集合、原Scene/GPU/目录星和当前银河背景，DPR1宽/细视角、OVERVIEW/MEDIUM及照片off。21新帧、0复用，runtime PASS、browser errors/queued/GL错误0、最终GPU资源0。太阳高度−32.683822°；三个目标高度75.30295°、49.50270°、44.17816°，日距136.0628°、85.6333°、138.0656°。这些是软件Scene及声明观察条件，不是原生或物理峰验收。

实际原尺寸查看宽/细两份集中图后，按sky-display-quality-v1三项均FAILED：NGC300明显照片矩形与星场断边，NGC6744密前景星矩形，NGC1232蓝色/噪声底矩形与真实弱外围、近边紧致伴体。停止最大缩放、DETAIL、高DPR和昼暮Scene扩跑；其范围明确NOT_RUN。保完整原图和弱结构，转换源/待获准连续覆盖队列，不靠删外围、去星或参数扫描改判。预检不建立最终Scene、权益、科学、原生或采用资格。

| 完整来源候选 | 新版次 | 预检 |
| --- | --- | --- |
| NGC300 | cf99a0adb37a5e1eb6e12f3f309337145bd16916e4b3c4bf46217471a0c44cac | FAILED |
| NGC6744 | c5be27a70c2e401f353306c5853b8a75a639266c2ea4e39d4c0c422b88985dc7 | FAILED |
| NGC1232 | 8f8e286b188854f666da8f76c971cf5b773a850b12cc79e231a7cbd170521d6b | FAILED |

## 弥散星云沿同入口追加预检

既有NGC7293原件7059×6535/10,383,681B、NGC2359原件3424×3437/4,076,469B。原图、三档整幅及原分辨率ROI实际集中看审，结构、紧致点与弱外围在声明分辨率保留；文件PASSED。沿同一whole-source publisher和Scene预检，新增15实际帧、0复用，runtime PASS、错误/排队/最终GPU资源0。观察时刻2026-10-09T16:00Z，太阳高度−26.65450°，目标高度28.12524°/28.23064°、日距134.39977°/83.83262°；仍为受控软件观察条件，不是原生或科学测量。

实际原尺寸宽/细集中图：NGC7293明显底色矩形和照片星场截止，弱晕不能删除；NGC2359明亮矩形和密星断边，真实气体延伸到源边缘，裁边/alpha/默认去星不补连续覆盖。两项均按sky-display-quality-v1 FAILED，只支持换源/待获准连续覆盖队列。最大缩放、DETAIL、高DPR和昼暮Scene NOT_RUN，新增合格/采用0。

| 完整来源候选 | 新版次 | 预检 |
| --- | --- | --- |
| NGC7293 | aa3cf4f6ae0ed560e67d621b2525722f561680a9c51417d46d0d1cfe5a8aa4f5 | FAILED |
| NGC2359 | f260e871b1d259fb7fb77625e3d4482ff2518f7b675105922328017d57773aa8 | FAILED |

追加6 JPEG为8,462,907B，全部LOD逻辑RGB解码和88,350,624B，不是同时物理峰。publisher累计5,882ms包含失败尝试；原NGC2359细档4096超过源宽3424，被原guard拒绝且未生成。保持guard，仅该项以真实源宽重试，NGC7293成功版次/LOD不重做。同一task helper接受批声明与显式看审理由，保存各执行快照；源宽受原图约束，没有扩大源分辨率或改生产合同。

当前只读r17由v8输入派生，exceptions 0：22候选版次、2对象/15区域、63独立图片86,999,740B，含metadata的85独立payload为87,130,248B。新五项scene及recordedScene均FAILED，既有processed失败/UNKNOWN/MISSING与旧Scene机械STALE原样保留；普通采用/可分发仍0。标准静态出口不增加这五份失败候选。

## 成本、库存与失败保留

三份原缓存49,742,120B；新增9 JPEG为19,079,440B。publisher实测10,657ms，全部LOD逻辑RGB解码和152,950,272B不是同时工作集或物理峰。准备、人工集中复核、既有取得和端到端吞吐另列，不从这次机器时间推算每合格工时。实际图片环境为`output/prepared-candidate-python-1005-r2/Scripts/python.exe`，复用Pillow/Astropy/Numpy，不重装。

第一子批次r16沿v7输入派生，exceptions 0；20候选版次、2对象/13区域、57独立图片78,536,833B，含metadata的77独立payload为78,658,099B。当前入口已接上述r17/v8；这些增量是失败候选，不是可用覆盖。已有Scene的recorded PASSED/FAILED保留；当前实现指纹变化引起的机械STALE不改写历史，也不冒新的完整准入。

首轮recipe/output同父目录触发保护，昂贵生成前停止，未放宽guard。首次决定helper把共享控制计入单源帧，后以真实视角修正且未重跑Scene；r15因helper读不存在的`inputsBefore`而缺实现绑定，被库存拒绝。修正为实际`inputBindings`与`parsedSourceBindings`的159份绑定，另写r2决定/v7输入/r16库存；原脚本、决定、r15和Pillow大原图警告均保留。工具失败不混成素材通过。

## 精确证据入口

- [批次、成本及全部证据pins](../../../../output/eso-cached-galaxy-precheck-2026-10-10-r2/review-summary-r2.json)
- [文件集中图](../../../../output/eso-cached-galaxy-precheck-2026-10-10-r2/all-source-levels.png)及[原图与细档ROI](../../../../output/eso-cached-galaxy-precheck-2026-10-10-r2/detail-reference-rois.png)
- [实际Scene结果](../../../../output/prepared-scene-batch-2026-10-09/cached-galaxy-precheck-1010-r1/result.json)、[宽场](../../../../output/prepared-scene-batch-2026-10-09/cached-galaxy-precheck-1010-r1/wide-precheck-contact.png)、[细场](../../../../output/prepared-scene-batch-2026-10-09/cached-galaxy-precheck-1010-r1/detail-precheck-contact.png)
- [绑定后的失败决定](../../../../output/eso-cached-galaxy-precheck-2026-10-10-r2/scene-decisions-r2.json)，SHA256 `8b8dc0520d86d82aacd9142ba8e5941f56c93a32369217cce464c0d5cd8d6e1b`
- [第一子批次v7库存输入](../../../../output/eso-cached-galaxy-precheck-2026-10-10-r2/current-inventory-v7-input.json)，SHA256 `66f83399daaba12d561189d5da6c248d153deb1b43099e366c0fa6b4e5e66625`；[r16](../../../../output/eso-image-supply-current-inventory-2026-10-10-r16.json)及[失败r15](../../../../output/eso-image-supply-current-inventory-2026-10-10-r15.json)
- [弥散星云追加批次、成本及精确pins](../../../../output/eso-cached-nebula-precheck-2026-10-10-r2/review-summary.json)，[源宽守卫失败](../../../../output/eso-cached-nebula-precheck-2026-10-10-r1/batch-result.json)
- [弥散星云实际Scene](../../../../output/prepared-scene-batch-2026-10-09/cached-nebula-precheck-1010-r1/result.json)、[宽场](../../../../output/prepared-scene-batch-2026-10-09/cached-nebula-precheck-1010-r1/wide-precheck-contact.png)、[细场](../../../../output/prepared-scene-batch-2026-10-09/cached-nebula-precheck-1010-r1/detail-precheck-contact.png)
- [当前v8库存输入](../../../../output/eso-cached-nebula-precheck-2026-10-10-r2/current-inventory-v8-input.json)，SHA256 `7960230f4bfc2e1140dbd8db222444399bd287a3567b6e3a3c8e9e1e9a9c30d5`；[当前r17](../../../../output/eso-image-supply-current-inventory-2026-10-10-r17.json)

原生Sky组合/credit仍FAILED_DEVTOOLS_OUTPUT、原因UNKNOWN_PRODUCT_VS_DEVTOOLS；权益PARTIAL、手机/完整配准与科学/全机资源/独审缺口不提高。原生问题无新输入时不重复旧诊断，继续方案内独立责任。
