# 完整地图增量修订

[地图入口](preview/index.html?map=1&browse=1) · [观星点信息](preview/index.html?map=1) · [统一审阅](../../../shared/astronomical-event-modal/review.html)

基线为[2026-09-09当前采用源](../../candidates/context-audit-2026-09-09/CURRENT.md)。保持原Map与完整信息组件、手势、照片、天文内容、表单及底栏，在原owner中增加地形章节和三项导航、独立地形checkbox、meteor入口及对应B图标。preview/panel-gestures.js保持基线原文；preview/chapters.js扩展原章节导航，terrain.js只持有新增图形。layers.html保留原完整图层源与时间控件。

新视觉已采用；本目录地图图层、地形与光污染仍只是设计fixture。生产已接入Copernicus GLO-30派生地形、既有真实VIIRS边界和微信原生GroundOverlay，发布清单记录覆盖、缺测、坐标转换与约110.7m派生分辨率。源差异见[source-diff.json](source-diff.json)。

2026-09-15外部能力方案更新其中的数据语义：底图不再提供主题选择；天气只使用和风实际返回的小时与总云量，分层云、模型一致性与Open-Meteo均退出；无覆盖显示统一暂无数据，异常接入共享顶部通知并保留局部重试。地图及面板按真实viewport伸展并设置媒体/面板上限。上述确认规则覆盖本资源中更早的静态天气示意，未变的构图和地形增量继续采用。
