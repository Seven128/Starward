# 连续区域输入与标准出口开发增量（2026-10-09）

Goal active、无预算、未完成，指定工作区/分支未变。源码及所有原图、成品、失败原位保留；无提交推送、采购、部署发布或外联。33项完整义务不降级。

`hips_rgb_region.py`复用Astropy TAN和现有`hips_tan_lookup.mjs`的healpix-ts责任，在有界坐标交换、显式输出像素及decoded-tile LRU预算下组成一个连续工作区域。原alpha、未供给瓦片、有效黑与UNKNOWN科学支持分别保留；不下载、抠黑、补细节或生成LOD。原8/256/512平方lookup协议保留，新任意region使用同一坐标owner的分块接口，没有1024上限。相机方位转换沿已绑定observation matrix/basis；工作TAN不是实际Scene的立体投影像素，也不是原照片WCS。

统一task消费两份现有区域计划和已准入local-trial原片回执，一次得到M8 621×1342、M61 414×895全幅PNG及供给mask，原PNG像素/alpha与保存文件严格读回。尺寸由当前选定HiPS order的平均cell面积采样网格推得；此值不是仪器PSF或源有效清晰度。0新下载/0新区域模型调用；两份整图已实际查看。

M8共833382样本，缺瓦片0、原透明110582、原部分alpha0、不透明722800。实际原照片斜边仍可见，不能用RGB去星入口抹掉它。M61共370530样本，全部不透明、缺瓦片0；连续主体及外围已供给，但非全天背景。

`sxt_batch.stage_continuous_regions`复用整幅已保存区域，在实际RGBA与独立binary supplied-mask读回后仅将完整RGB子集归一化并送入既有SXT批次；部分覆盖留`COVERAGE_ADAPTER_REQUIRED`。随后增加独立mask验证及安全job ID/budget守卫，当前5区域owner/14原SXT行为检查通过；已生成输入没有重编码。实际旧staging源/mask再次读回一致，历史执行代码绑定未冒当前代码。

仅新完整M61输入实际调用一次SXT ML11/default overlap0.2 GPU，wall2.313s、50ms process-tree RSS采样428785664B；RSS为共享页可能重复的采样下界，GPU/设备/云容量未测。硬检查通过。完整/中央ROI实看，主螺旋可见，右侧亮源残晕和长条仍进入外场，判`NEEDS_REPAIR`，未出版/采用。不能从主体保留外推全部低亮结构保真，也不能将小伴星系盲删为恒星。M8没有调用SXT。

此前文件级通过的NGC253三档已沿原`approvedSkyPublicAssets`枚举及标准`writeSkyStaticBundle`本地出口读回，3 PNG共1128964B、图像hash/完整字节/HTTP等价响应头严格同一；普通Prepared枚举0。只写当前新producer的3条route，未重复导出其他未变化家族。没有TLS/部署/全release/设备容量认证。

原失败保留：静态task误读producer字段，在出口前失败；区域r1/r2漏接已有mirror恢复，r3误读canonical root中不存在的自hash字段，均在raster前退出。r1失败解释先误以为多边缘瓦片，实际为原primary的三份MISSING已在既有local-trial receipt恢复；原primary FAILED不改写。测试首次fixture错用WCS wrapper属性、V3对象及nside后修正通过，不冒产品 escaped defect。

机器证据：`output/continuous-hips-regions-2026-10-09-evidence.json`绑定真实区域r4、当前owner、旧执行owner epoch、SXT/result/tool log/受审队列、静态出口及所有失败。当前照片外连续背景FAILED、science UNKNOWN、absolute registration UNVERIFIED、Scene/device/physical/capacity及独审MISSING/未验。普通Prepared空、HiPS关、Mellinger低分辨DISPLAY、v72原样。

## 随后完成：显式binary coverage加工/显示

`covered_rgb_display.py`将opaque工作canvas与真实source alpha分开；仅binary alpha，绑定原RGBA与独立供给mask，源内RGB逐值不变、源外零padding只供模型，输出display PNG逐字节恢复原alpha并令透明隐藏RGB为零。部分alpha/放大variant暂拒绝，缺瓦片不允许不透明；不抠黑或feather。共享SXT执行/缓存/导入与image_quality实际复核均接同一责任；即使fresh hash/手工file-pass也不能将covered region送进原whole-photo native publisher。该拒绝已由反例检查。

仅M8新连续区域/coverage表示调用一次ML11/default GPU，2.773s；50ms process-tree RSS采样423862272B，非GPU/物理峰或容量。M61由stage显式`COMPLETE_RGB_NOT_REPROCESSED`，没有新工作图/model。实际621×1342共833382 alpha字节严格相同，新增coverage0、透明隐藏RGB非零0；722800不透明、110582原透明、0缺片保原。全图/主体ROI实看，云气/暗结构可见、分片各自加工接缝避免，密星场细颗粒和真实照片外沿仍存在；NEEDS_REPAIR，未出版/采用/Scene通过。未重取瓦片或重raster。

当前3个coverage owner检查覆盖成功实际alpha/RGB/ICC、缺测与有效黑分开、零vendor缓存复用、模型padding错误在vendor前拒绝、fresh-hash输出alpha突变与伪造proof在review拒绝、partial alpha/upsample拒绝，以及file-pass不能冒whole-photo准入；14原SXT影响检查与5区域owner检查通过。首次17数包含被import的14既有测试，已修test discovery为模块引用，当前coverage新检查实际3。无新产品UI/设备/物理验收。

最新机器证据`output/covered-continuous-sxt-2026-10-09-evidence.json`保存当前覆盖/输出与边界，之前的`output/continuous-hips-regions-2026-10-09-evidence.json`保持历史epoch。

下一依赖仅PLAN：显式区域加工成品的坐标/provenance/content＋ODbL出版合同→实际Scene/来源/Back，以及PS真实结构误删/残环/亮源异常。原whole-photo合同不适用，不能借旧AVM或声明UNCHANGED像素绕过。复用当前区域/成品，不重跑无变化raster、模型或闭合矩阵。
