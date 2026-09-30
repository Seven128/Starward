# 地形章节与地图叠加 · 2026-09-13

[交互审阅入口](../../shared/astronomical-event-modal/review.html) · [完整观星点中的地形](../revisions/three-requirements-2026-09-13/preview/panel.html?extent=large&section=terrain) · [地图图层](../../shared/astronomical-event-modal/preview.html?view=layers)

用户要求已进入产品及技术Context；本次新增视觉已于2026-09-13确认采用。生产实现复用原地图组件、三档拖动、完整基本信息及天文区，加入地形同级章节、半径轴和地图复选/单选；真实Copernicus DEM GLO-30发布样本经BFF进入点位地形图，并通过WEAPP `MapContext.addGroundOverlay`进入原生主地图。服务响应同时携带来源、DOI、许可链接、派生方式和Copernicus WorldDEM-30 专属加工声明（准确原文由地形发布 manifest 保存，不能套用 Sentinel 声明），消费者通过统一来源组件公开展示。既有主导航、独占底部呈现与其他区域继续遵循Map当前采用入口；覆盖范围和验证限制见技术owner与任务记录。

参考：[地形390px](reference/terrain.png)、[地形+光污染](reference/layers.png)。所有地形形状、光污染强弱、查看半径和底图叠加均是设计示例，不声称来自该地点实际分析；源信息不完整的示例也不构成精度评价。

## 数据及准确性边界

按照用户“以能拿到的数据为准”，首版按有来源的俯视地形和年度卫星光污染估算分布推进；用户已移除角度分析要求。高程模型的采样间隔不等于垂直误差，更不等于遮挡角误差；目前没有实样验证支持全部角度相对误差<20%的保证。接近0°不使用相对误差承诺，后续按角度绝对误差、定位/近山敏感性、覆盖与实际检核说明质量。

既有研究继续有效，见[研究来源与方案](../../terrain-icon-exploration-2026-09-12/research.md)。本轮复核：[Copernicus官方DEM说明](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)给出产品统计高程精度；这不是任意点位山脊角度的保证。[EOG年度夜光](https://eogdata.mines.edu/products/vnl/)提供辐亮度及有效覆盖，不能直接当作观测朝向的天空亮度/SQM/Bortle。山脊背阴也不是VIIRS缺测判据，缺测以源产品掩膜与有效覆盖为准。

DEM当前采用Copernicus DEM GLO-30，并按其许可与归属要求公开来源；SRTM只在重新评估覆盖或获取条件时作为备选。此前r.horizon研究不再是本轮前置，当前只要求地形/光污染图层的配准、尺度、覆盖与来源质量。生产责任由[技术owner](../../../../../project_context/architecture/runtime-and-domain.md#mini-program-terrain-and-directional-light-evidence)维护。

地图保留LIGHT/TOTAL_CLOUD单选，额外地形复选。日间地图阴影/透明灯光/原生marker的正确叠加仍需WEAPP试片验证；不宣称enable3D能够显示真实山地，也不把静态夜光接小时播放。不可用层禁用并说明原因，不显示虚假的可用地形。

## Stitch与精修

旧 Stitch 项目（已删除；ID `13338420663663046308`）中当时的地形/图层废案清理与精确参考同步见[历史记录](../../shared/astronomical-event-modal/stitch-sync.md)。当前可编辑源仍为上方完整增量消费者，不把 Stitch 静态截图当作可运行交互源。

原稿有额外四项导航、推荐指数、实时相机、虚构天气和山脊背阴即夜光缺测等偏差，均未采用。最新修订在原完整地图源上增量接入地形章节、真实B图标及独立图层状态，之前简化宿主被用户否定，已退出当前入口；现按本轮反馈改为俯视地形图，地形/夜光分项保留缺测与开关。半径拖动实时改变范围；已移除方向选择、射线及角度分析。浏览器资源不证明精度或原生地图交互完成。

## 俯视图尺度与本轮修订

本轮保留方形地理图、中心固定/北向上、东南西北/距离圈/比例尺。外圈表示当前半径的完整范围，内圈表示半径的一半；比例尺线段宽度按 `比例尺公里数 / (2 × 当前半径公里数)` 占整张方形图的比例计算，因此5 km半径配1 km、50 km半径配10 km时都显示为图宽10%。默认半径5 km，顶部改为2–50 km拖动轴，标注2/5/10/20/50刻度和当前值；近距离段保留更多可操作空间。下方方向轴、方向线、角度数值和分析文案全部移除。两个独立多选项统一名为“地形/光污染”，使用B图标、轻填色/细边界和圆形勾选标记，44px以上整项热区；关闭某层同步隐藏其图例。

[EOG年度VIIRS说明](https://eogdata.mines.edu/products/vnl/)给出15角秒、赤道约500m格网；可看光源分布，不能识别单盏路灯或直接给方向天空亮度。[NPS光污染说明](https://www.nps.gov/subjects/nightskies/lightpollution.htm)指出城市辉光可在很远处仍被观察到，因此1–2 km无源不足以判定拍摄无光害。[GRASS r.horizon](https://grass.osgeo.org/grass-stable/manuals/r.horizon.html)提供最大分析距离等参数及距离输出能力，须核对其角度/距离输出语义；此计算属于历史研究，不再是本轮交付项。

本轮同时修复large无图/草稿等身份外框为方角、图层sheet单一方角外壳。图中的椭圆山体和夜光格网只是可缩放交互fixture，没有取到该地点真实高程。Stitch本轮旧节点已清理，采用状态、精确参考与可编辑来源通过上方同步记录衔接。
