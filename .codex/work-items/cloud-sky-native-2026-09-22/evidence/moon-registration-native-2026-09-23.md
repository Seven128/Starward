# C05 月面经纬方向与原生像素配准（2026-09-23）

这次检查复用此前官方微信开发者工具生成的原生 WEAPP 427×920 截图 `artifacts/miniapp/cloud-sky-native/moon-detail-21.png`（SHA-256 `fded08e91c0c4fe913c8f83bb773ed4c1a1b7f127c4af628f568e109d9584c52`），及正式 Mini API 发布的 USGS Clementine `uv_v2` 固定 2048×1024 JPEG `workers/miniapp-api/assets/moon/clementine-uv750-v2-wms-2048x1024.jpg`（SHA-256 `e071f796a1ec1f7c9f4d87660aabb1bb40adbfacc0ecb253919bee6c711efefb`）。截图记录的示例点、2026-09-22T13:00:00Z 时刻和月面加载流程见 `moon-texture-2026-09-23.json`；这些像素不是新生成的真机图。示例点 `SpotSummary.altitudeM=null`，计算采用服务的 0m 默认值。

可复算脚本 `../moon-registration-probe.mts` 直接调用当前 `astronomy-engine-adapter.ts` 计算该时刻/地点的 IAU 月球北极与零经线 ENU 轴；把 750nm WMS 正东经、北纬栅格投影到观测者可见半球。截图手动拖动后的相机滚转没有随旧截图保存，因此允许平面旋转角 0–359° 自由拟合，不移动经纬特征。先按圆心(244,453)、半径89.5px、亮度≥55且离盘缘有余量选择4,291个受光像素；源图及截图分别扣除二次空间亮度趋势，再比较纹理细节的相关系数。数据化结果见 `moon-registration-native-2026-09-23.json`。

| 源图投影 | 最佳旋转 | 残差相关系数 |
| --- | ---: | ---: |
| 正东经、北纬（当前 shader） | 351° | **0.8765** |
| 纬度翻转 | 232° | 0.2791 |
| 经度翻转 | 52° | 0.2388 |
| 经纬都翻转 | 183° | 0.4008 |

把圆心/半径改为(242,451)/88、(246,455)/91时，当前方向分别为0.6980、0.7672，仍高于各自最强翻转的0.3365、0.4852；只保留亮度≥85的3,652像素时为0.8742，翻转最高0.3936。官方 USGS/IAU地名中心给出 [Mare Tranquillitatis](https://planetarynames.wr.usgs.gov/Feature/3691) 8.35°N/30.83°E、[Mare Imbrium](https://planetarynames.wr.usgs.gov/Feature/3678) 34.72°N/14.91°W、[Mare Crisium](https://planetarynames.wr.usgs.gov/Feature/3671) 16.18°N/59.10°E；当前配准分别投到截图约(295,452)、(237,404)、(323,442)，均在可见半球。这些地名中心只作位置辅助，主要判据是整片纹理的对照；单点亮度不是光度标定。

结论范围：同一公开源影像、当前 BFF 本体轴、客户端正东经/北纬 shader 与该官方**桌面模拟器**截图之间的纹理方向得到独立像素配准证据，镜像/倒置解释不能同等拟合。脚本仍假定WMS元数据的经纬定义，拟合的相机旋转无法证明手机姿态校准、绝对屏幕北向、月面光度、其它时刻/地点、Android/iOS组合、纹理帧耗时或内存。无需修改正式代码，C05与整体 goal 保持开放；未使用手机/ADB/二维码、未触碰共享8787服务或发布。
