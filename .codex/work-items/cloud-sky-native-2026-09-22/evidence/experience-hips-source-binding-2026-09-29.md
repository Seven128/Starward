# C／B3：共享 HiPS 坐标修复与 M42 缺测候选

本轮取得实际采用的同一 HiPS FITS／JPEG，核出了共享网格两轴接反，已在 `sky-hips-tile-mesh.ts` 修复，红外广域层和光学候选同用一个 owner。另制备 M42 三档源绑定 PNG／TAN FITS 候选并核实际 GPU 缺测呈现；**尚未接入版本化出版／BFF／小程序加载链**，当前生产153张JPEG及v2清单均未替换。当前唯一方案仍是PLAN；完整旅程、商业范围、排除理由、原生路线及目标交付义务保持，Goal active、无预算。

## 已实现与检查

### 真实来源和坐标问题

采用源的[实际properties](https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3/properties)列512²、equatorial、最大order8、FITS和JPEG；只取M42中心的一个order8瓦片 `343034`，不是重做选型或全星空镜像。[取样脚本](../scripts/experience-w3-hips-input-2026-09-29.py)、[原结果](../../../../output/allwise-w3-hips-0929/input-result.json)、[日志](experience-w3-hips-input-2026-09-29.log)保留。

| 输入 | 字节 | SHA256 |
| --- | ---: | --- |
| properties | 2,804 | `eddbd837ee09ded51a44dbebfbcb58b86869353acb022aa6376a6c5eb5662ac1` |
| [FITS tile](https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3/Norder8/Dir340000/Npix343034.fits) | 1,051,456 | `64113e5b8e0846299db812f9515b6c3c34a4e8cc3d714edcde06efa1a9980f49` |
| [JPEG tile](https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3/Norder8/Dir340000/Npix343034.jpg) | 33,885 | `8115dabc9503fa2ad0ea1c3fc8794ae0d0686ff3f633d803807f144f512c32be` |

FITS数据数组完整：2880B头加1,048,576B浮点数组，尾部缺2624B标准块填充。Astropy警告保留，不能写源完全符合FITS格式，也不能把尾部填充不足写成科学数组丢失。该瓦片没有单独WCS头；几何由HiPS目录身份与NESTED包装定义。80331非有限样本，有限值−351.7904–10439.9189；这些是HiPS强度样本，不是原Atlas的coverage观测深度。

[HiPS规范](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf)规定JPEG／PNG行方向与FITS相反；[CDS作者的包装映射](https://gist.github.com/tboch/f68cd1bb1529d8ac12184b40e54ba692)确定JPEG列对应NW、行对应NE。原实现把列作为NE、行作为NW。只翻FITS行后同瓦片所有非有限像素的JPEG灰度≤7；错误行方向有31133个超7，证明相同瓦片的配对关系。[成对分析](../../../../output/allwise-w3-hips-0929/paired-analysis.json)、[诊断图](../../../../output/allwise-w3-hips-0929/m42-paired-hips-missing-diagnostic.png)保留，品红只是分析标记。

进一步复用上轮独立Atlas SIN WCS：2706个落在原切片内的方向，正确轴下有限／缺测一致率0.989283，1538个双方有限样本的强度相关0.999712；原轴仅0.761271。局部最近原始样本不能证明精确Atlas→HiPS重采样、绝对天文位置或全图科学质量，但与CDS包装规范共同证实本次轴错误。[正确轴原始核对](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/source-geometry.json)、[错误轴对照](../../../../output/allwise-w3-hips-0929/atlas-geometry-check.json)保留。

共享修复只改网格的图像轴顺序；图像身份、当前观察帧、相机、选择／裁切、GPU资源、失败派发仍归原owner。新增基于CDS子单元包装的回归覆盖各base face与低／中／高order，修前真实失败、修后及两类消费者检查通过：[修前](experience-hips-axes-before-2026-09-29.log)、[修后](experience-hips-axes-after-2026-09-29.log)。旧Sombrero断言复制了错误轴，其“源图位置”备注已纠正；旧HiPS位置证据不能继续认证新版，TAN目标图、银河全景和其他独立模块证据保其实际条件。

实际软件GPU使用原M42瓦片和**已出版**W3 order0 face5，在相同观察地点／时刻下核0°／57°画面旋转：[脚本](../scripts/experience-hips-axes-webgl-2026-09-29.mts)、[结果](../../../../output/playwright/cloud-sky-hips-axes-0929/result.json)、[日志](experience-hips-axes-webgl-2026-09-29.log)。独立NESTED采样与当前GPU平均通道差0.089–0.318／255、p95≤0.827；旧轴对照平均差7.43–59.09。详细源边缘个别最大差16.50仍记录，不宣称逐像素无差。四张输出取得，代表[广域旋转输出](../../../../output/playwright/cloud-sky-hips-axes-0929/order0-roll57.png)和[详细瓦片输出](../../../../output/playwright/cloud-sky-hips-axes-0929/order8-roll0.png)已实际查看。这里是组件真实WebGL输出，不是Taro整页、原生运行、合法光学源准入或手机验收。

### M42 三档源绑定候选，待接入

沿既有目标中心、场宽、尺寸及TAN半像素约定，使用Astropy WCS／FITS和既有healpix-ts，不新增生产依赖或自制通用解析／球面系统。每档选不比目标像素更粗的原HiPS层，全部输入有界于**20瓦片、21,029,120B**：OVERVIEW order3四片、MEDIUM order5六片、DETAIL order7十片。逐个25秒上限、无自动重试；所有实际返回完整科学数组，尾部填充警告分别记录。原始输入／几何／采样／hash在[候选结果](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/candidate-result.json)及其[计划参数](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/candidate-plan.json)、[查找身份](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/candidate-lookup.json)，只是一次试验参数，不是竞争项目计划。

[生成脚本](../scripts/experience-w3-hips-materialize-2026-09-29.py)、[几何脚本](../scripts/experience-w3-hips-candidate-2026-09-29.py)、[HEALPix采样](../scripts/experience-w3-hips-candidate-2026-09-29.mjs)、[成功日志](experience-w3-hips-candidate-2026-09-29.log)保留。首次坐标参数按旧轴生成，原结果保留为未采用反例；新独立输入确认正确轴后在独立 `candidate-axes-corrected/` 重建，没有重请求已取得输入或覆盖原试验。此前两CDS成品头超时没有重复。

| 候选 | 场宽／尺寸 | PNG字节 | 非有限→透明样本 | 有限但黑色且保不透明样本 |
| --- | --- | ---: | ---: | ---: |
| [OVERVIEW](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/m42-overview-finite.png) | 4°／256² | 41,082 | 22 | 1,095 |
| [MEDIUM](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/m42-medium-finite.png) | 2.25°／512² | 124,865 | 648 | 4,016 |
| [DETAIL](../../../../output/allwise-w3-hips-0929/candidate-axes-corrected/m42-detail-finite.png) | 0.9°／512² | 145,243 | 5,095 | 4,206 |

三档原图均实际查看。每个PNG alpha与自己TAN FITS非有限位置逐像素一致，有限黑色不冒充缺测；自身完整WCS绑定CRPIX128／256、源中心、尺度和方向。有限比例只说明该**自有采样**的有限像素，不能改名为无伪影的科学有效覆盖率、原Atlas观测深度或现有153张JPEG覆盖率；源条带仍在，没有填洞、美化修补或冒称真实完整核心。

沿原共享 `registerSkySurvey`／纹理／`infrared-cutout` GPU测试三档：[脚本](../scripts/experience-w3-finite-webgl-2026-09-29.mts)、[结果](../../../../output/playwright/cloud-sky-w3-finite-0929/result.json)、[日志](experience-w3-finite-webgl-2026-09-29.log)。缺测内部21／884／8206实际采样点保留背景、变化0；填白反例变化235／255；三档真实亮部1239／1706／5419采样全部保留，没有隐藏天体凑通过。[DETAIL实际注册输出](../../../../output/playwright/cloud-sky-w3-finite-0929/m42-detail-registered.png)已查看。它证明共享渲染可承接真实alpha，**不证明已发表、原生加载、整体质量／天文配准或目标验收**。

## 候选与剩余交付

Mini类型／生产构建退出0：[类型](experience-hips-axes-typecheck-2026-09-29.log)、[构建](experience-hips-axes-build-2026-09-29.log)，原三个Webpack体量建议仍在。prepared clean-v17：[记录](experience-combined-clean-v17-candidate-2026-09-29.json)，SHA256 `79fc7b725f35190c094862b58a34fa35cf57e602e8de5a60a9303194ceac7a9e`，257文件／4,476,370 rawB，main2,084,707／content1,012,055／sky955,991／spot423,617B；与v16字节量相同但内容不同，无诊断、mock、vConsole或maps，loopback8791只用于开发者工具。**v17仅含共享坐标修复；M42 PNG仍在ignored候选目录，尚未接入该包。** v16及旧候选原指纹保留，没有打开v17、新增原生窗口、常驻服务、重试取消提权、推手机或云部署。

版本化出版接入须由原影像owner保持新像素身份、自己的完整几何／处理说明、科学缺测与未知的区别，以及v1／v2清单和JPEG旧offer。不能把已选定的同源PNG反过来作为整个C的需求上限，也不新增全153科学mask门槛。当前依赖仅[PLAN](../PLAN.md)，已有窗口可安全恢复时先退休v12，再核一个最新候选，不能使用旧Frame／Context或进程存在充新版绑定。

当前没有独立审查，不能将此自审／软件检查当独立意见。完整用户旅程、B3/C质量和合法覆盖、真实姿态／校准／后台、Android/iOS、目标资源性能／官方包体／费用义务均保持未完成。用户禁用真机的指令继续有效，新月面仍没有本代手机验收。

## 收尾绑定

[核对记录](experience-hips-source-close-2026-09-29.json)确认原v2清单及153张JPEG、12张已出版广域原图都未改，20个新FITS与候选PNG逐字节身份匹配，v16及v17指纹保持；核对时任务入口／报告333个本地链接存在，PLAN仅一个当前依赖。三档保存后的TAN FITS非有限位置再次与PNG alpha读回一致。原始瓦片、任务Python依赖和全部候选仍在ignored output，未进发布包。Context[结构检查](experience-hips-source-context-2026-09-29.log)与受影响tracked文档diff检查通过，均不证明体验／原生／目标验收或独立审查。Goal状态读回active、无预算。
