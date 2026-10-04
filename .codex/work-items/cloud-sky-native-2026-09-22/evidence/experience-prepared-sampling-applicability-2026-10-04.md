# Prepared来源采样、出口限制与实际页面细档

2026-10-04。本代只新增云观星任务证据及更新所属文档，没有生产业务源码改动。原工作区、分支、HEAD、六项保护和BFF/watch保留；Goal active、无预算。不核对旧设计稿。1024细图是未出版小样，普通Prepared registry仍空。

## 来源与当前出口应分开判断

复用保存的Hubble M82与NOIRLab M82处理版真实页面帧。两帧的相机、390×844画布、0.05°视场、2026-10-04T13:00:00Z时刻**完全相同**，不是近似条件。[当前投影owner测量](../../../../output/prepared-sampling-applicability-1004-r1/result.json)使用原`unprojectSkyPoint`/`skyProjectionScale`，中心每逻辑像素约0.2132701456″。512细档的中心采样约0.400000031″，每纹理像素被放大约1.875558屏幕像素；同视野1024档约0.937779。

|缓存来源|名义原像素间隔|当前DETAIL 0.056888959°内名义源采样|当前出口|
|---|---:|---:|---:|
|Hubble M82 heic0604a|0.118679/0.118794″|1725.67/1724.00|512²|
|NOIRLab M82 Large noao-m81m82|0.4248″|482.11/482.11|512²|
|Hubble M51 heic0506a|0.143425″|1427.93/1427.93|512²|
|NOIRLab M51 4k noao1309a|0.49824/0.49896″|411.05/410.45|512²|

这些是AVM名义TAN采样，**不是PSF分辨率、可辨结构数量、绝对配准或质量通过**。M51只核同尺寸/字段的采样表，没有新M51页面验收。原源的软细节与出口欠采样不能混为同一原因；提高输出不能补NOIRLab原片不存在的细节。宽场与目标高清的适用范围仍需真实图质、覆盖和接续决定，不以本四样本限制对象范围。

## 一个有依据的新细档

[生产owner小样执行](../../../../output/prepared-hubble-fine-sampling-1004-r1/result.json)沿已缓存JPEG/AVM和现有`build_prepared_rgb_tan_master`，仅对原DETAIL相同名义视野新采样一次1024²网格；不是把旧512图放大，也没有重建整幅4096母图。源RGB解码1次/新细网格投影1次/下载0；旧母图和三级重算0，没有背景fit、锐化、调色、PSF/noise工作或生成细节。源解码RGB仍37,392,000B逻辑；新增RGBA4,194,304B，PNG **2,334,559B**（旧细PNG586,384B），本机约2.498秒墙时/2.469秒CPU，不供RSS峰或服务器容量。

新细图一百万余网格全部具有完整几何stencil支持，科学availability和源AVM绝对精度仍UNKNOWN/未验。原v1合同严格2048母图/512三级；新细图没有v1出版身份，不能修改旧hash/尺寸字段冒兼容。已有离线owner支持较大网格，实际采用须沿现有多级责任制定有证据的尺寸/版本，不能为所有来源统一加像素或另建渲染系统。

## 同一实际页面与真实资源

[r1](../../../../output/playwright/cloud-sky-prepared-hubble-sampling-1004-r1/result.json)由当前510前端输入、167后端输入及原Map→Sky公开入口/搜索/pinch到细档取得控制帧。在原Scene输入边界明确换成1024任务bitmap，旧raw publication仅供归一化名义footprint；原Hook、粗图、renderer策略不变。小样最终来源completion=null，不能借旧出版声称正确署名/发布链通过。

r1跳过`artworkLevelsContribution`查询，因此另外的[r2](../../../../output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2/result.json)原样复用bundle，只先执行原GPU归因查询、保存实际`completed/qualification/finePhoto`后抑制 unsupported 出版声明。实际两次查询为completed=true、fine=`has`、photo=`positive`，这仅证当帧颜色参与。r1已经包含绘制期间copy分配；r2未发现新增分配峰，不能臆造两者显存差。两代全部细图/还原像素完全相等；没有第二次JPEG解码/新网格或前端build。

完整512/1024/还原图已查看：1024能辨认更细的尘带和纹理，原512恢复完全相等。此中心近景没有显露細图边界，不能据此宣布完整弱结构、粗细/跨源接缝、昼暮亮部或全图质通过。实际比较图：[512](../../../../output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2/software-prepared-fine.png)、[1024](../../../../output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2/software-prepared-fine-1024.png)。

每代89个本机HTTP请求、response body5,776,962B，旧三PNG各一次合1,152,395B。新细PNG由task data URL解码一次，**没有**通过标准静态HTTP、公共file cache/租约或新出版链；这些仍待实现验证。原真实参与家族为galactic、constellation-artwork、deep-sky-image、prepared-optical，不能冒全Goal家族/组合。

正常512完成帧GPU texture模型2,846,872B；1024完成帧4,681,880B；1024阶段保存的copy观察最高9,662,616B，不是仅用完成帧差值估计临时峰。新1024bitmap与原三张512bitmap共同登记，4 handles、RGBA等效 **7,340,032B**，其中小样额外4MiB；普通替换时单图理论增加3MiB，不能把这一理论替换量冒本次共存峰。还原之后原图仍绘、小样随后显式注销，最后全部native/GL/租约/encoded活动与退休清理均归零。两代全程模型MAX texture11,800,576B/native RGBA等效13,369,344B，受前面的广角家族影响；不相加各MAX为物理内存。

## 保存读回与边界

[r2保存读回](../../../../output/prepared-hubble-sampling-readback-1004-r2/result.json)核完整1024PNG/NPY精确、12个真实原像素四邻/四quadrature证人逐值一致；独立笛卡尔TAN公式对48个坐标最大误差1.24214e-9源像素，低于按双精度条件数计算的2.46986e-8算术界，不是绝对天文精度。8组GL→PNG→GL全像素精确，r1/r2控制/小样/还原完全一致，真实source/asset pins保持。自读回不是独立审查。

首次reader误用`present`而非当前owner的`positive`，在写完整收据之前失败：[原失败](../../../../output/prepared-hubble-sampling-readback-1004-r1/failed.json)。原脚本/输出保留，新r2只改任务枚举检查，无source/runtime重跑或生产修复。

四主输出组逻辑44,722,516B，不含两reader及最后scope/doc收据，含两bundle/GL诊断和新fine；不是生产库存、Windows实际分配、全机磁盘余量或公网wire。新增外部图源下载/付费设施/许可费/采购/部署/发布均0；工时、批量异常率、完整库存/出口保留及200DAU混合容量仍未知。

当前执行仅由[PLAN顶部](../PLAN.md)维护。下一复用所有缓存，最小实际平移显露细图边界，先核同源粗细与宽场/高清的几何、颜色、背景接续，再据结果决定有版本的出版尺寸及必要处理；不重跑本中心采样/组合矩阵、无变化源投影/背景fit，不以盲锐化或透明化升级失败。M51矩形、NOIRLab软/颗粒/昼暮偏白、完整配准/弱结构、WXML FAILED_DEVTOOLS、独审MISSING、手机/Android/iOS与全部33义务保留。
