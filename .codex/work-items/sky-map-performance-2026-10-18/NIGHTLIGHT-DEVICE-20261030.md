# 当前 r6 夜光可见性与两层合成

本记录归唯一PLAN的D0/P1/P2；不替代全国迁移、正式分发或完整Goal验收。

## Candidate identity

复用普通候选effa83c7/source binding48026264、已连接NIO N2401/Android14/微信8.0.78；与[P3候选](SKY-P3-DEVICE-20261030.md)相同。当前真机`wx.getAccountInfoSync`返回的AppID与该候选project.config相同，envVersion=develop；回执在私有`sky-time-compact/runtime-appid.json`。这不是手机全部包字节的独立证明。

本项私有根为 `E:/Dev/Starward-data/development/d1-d2-targeted-20261030/nightlight-target`；8张手机原图/回执及SHA归`phone-evidence.json`。没有新构建、特殊注入或性能采集。

## Invocation result

在原实际相机开启光污染，进入来源页再返回；随后三项同时开启，当前历史日期没有合格云量，停止将其当三张图合成。再关闭云量/光污染/地形核全关，最后还原仅地形并关闭层叠。所有效果均从真实手机画面核对，原地点/日期/N05/R6未改。

同一实际视窗只读`/v2/map/night-light`为200/FRESH，读取其公开PNG共9868B并核SHA `20c7a490d57672b2d1dd8a3d7f8147c810e9f8b059b7f15c19245b1a2a589096`。该HTTP读回与手机画面分别记录，不冒原生已安装文件hash的独立读回。

## Observed

- 夜光颜色与地形阴影同时实际可见；来源页显示EOG Annual VNL V2.2 2025 median-masked、CC BY 4.0及原修改/估算说明，返回后两层保持。图例为2025年度估算、nW/cm²/sr和原五档阈值，不随当前小时伪更新。
- API实际dataset为`eog-vnl-v22-2025-gba-fixed-20261017-r6`、style为`starward-vnl-contrast-bands-v1`，GCJ Mercator图512×512；262144像素均可用。原r6/URL未改，全国新数据仍未激活。
- 三项按钮均读回已开启时，当前2025-10-28页面明确显示“所选日期暂无云量预报”“暂无可用预报时段”；地形和夜光仍可见。这是无合格云量时的独立呈现，不是三张有效图合成或特定503恢复证据。
- 全关后实际纯底图可见，三个按钮均关闭，图例/时间/图层来源入口退场；随后仅地形恢复，原地标/相机保持。没有由可见清除推断物理GPU/native释放。

## Verified

有界像素分析只消费已保存原图，不再操控手机。按实际native bounds及发布范围生成唯一声明Mercator映射，比较共同地图内部色块，没有拟合位置/色标/alpha。三个实际出现色档的73318个源内部采样中73224个最近色档匹配（99.8718%）；其余94点均与无夜光基线完全相同，保留为原生标注例外。声明投影的近似合成RGB MAE为5.76093，固定水平/垂直翻转为10.46240/11.63379；这是排除所测显著错位的辅助证据，不是新质量阈值。

Root已完整读分析脚本/方法、实看实际/预期/差异诊断图、独立核3份原图SHA和27个内部控制点。`analysis/result.json` SHA `f8c2ae74f81a7375b434032339ba8d14fe85a1b1a1abf590d973bbf68afc2811`，Root回执`pixel-root-verification.json`。结果支持此r6图在声明地理位置下的可见色块、方向及两层合成；D0“夜光无可见表现”的这一目标缺口已补证。

## Unverified

约3–7 RGB字节的稳定残差仍存在，不能声称逐像素颜色完全相同、特定滤波实现、亚源像元配准或科学辐亮度精度。该局部样本不覆盖两个最低色档、全国EOG、正式OSS/CDN、有效云量三层合成、iOS或资源容量。没有具体新故障或独立成本，停止相邻采集和shader追查。

## Invalidated

一次带`nth-child(2)`的自动化selector实际命中光污染并将其关闭，已由截图/开关读回识别，不能记云量已操作；改用实测坐标后才核三项开启。另一次ADB输入被fresh-capture guard拒绝，实际没有发送；后续官方坐标输入有独立状态读回。Root全分析VM复算触发自定15秒观察上限，无文件改写；随后只核原始控制点，不伪称聚合统计第二次全量复算通过。

## Cleanup

当前恢复仅地形开启及正常中档地点面板；临时图片只保存在私有证据目录，不改手机缓存、原件或发布文件。分析agent已结束。没有改数据库、启动提醒/队列、上传或新建云量批次；完整Goal继续active。
