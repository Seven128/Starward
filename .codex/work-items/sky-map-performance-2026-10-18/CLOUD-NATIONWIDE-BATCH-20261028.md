# ECMWF 全国云量：首个真实批次与离线显示路径

归唯一 PLAN P2/D1。当前已落实真实单run数值批次、共用采样及3窗口×3时次的离线图片。现用HTTP、Map/详情/Sky消费者、定时批次切换、后台补图队列、OSS/ESA和容量/手机验收仍未接通；不能据此关闭全国迁移。

## 输入、资格与时间

2026-10-28从[ECMWF官方开放入口](https://www.ecmwf.int/en/forecasts/datasets/open-data)和[官方Python客户端](https://github.com/ecmwf/ecmwf-opendata)核实：0.1°于10-20上线，独立sfc文件，发布时间约比0.25°晚2小时；00/12 UTC的oper/fc目前到360h。实际使用官方客户端0.3.35和ecCodes2.50.0，仅获取tcc，不下载全部气象变量。CC BY 4.0与修改/署名义务保留，不推断新的订阅/采购授权。

真实run为2026-10-27T00:00Z；71原生帧为0..144每3h、150..276每6h。以2026-10-27T18:50Z为本批查询基点，计入run年龄、未来240h及00/12供给周期的12h准备余量。最后有效时刻2026-11-07T12:00Z，完整未来240h可支持至查询时刻2026-10-28T12:00Z；此后需要新合格批次，不能拿配置值或外推维持承诺。

源头实读ecmf/od/oper/fc、GRIB2、instant tcc参数164、0–1、0.1°规则经纬网，3600×1801；首经度180°、末179.9°，不是默认0°起点。裁剪70–140°E、0–55°N的矩形数据包络，包含中国但不是行政边界。每帧701×551原生点；保存float32之前逐值核与ecCodes双精度解码完全相同，缺测独立mask，真实零仍有效。

首批独审发现来源头未严格校验及半格原点可能被round成十分位两项准入缺陷。已修并新增反例；错误enfo流现在被拒，非十分位origin不冒支持。本批实际原件符合预期，没有重下载：71原件及其获取回执硬链接复用后重新准入，旧初稿保留。

## 当前产物与资源

根：`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud`。

- 当前数值批次：`batch-2026102700-qualified`；manifest SHA256 `0569b5777aa8c6aef3f0ad61a9832902b1e47bb8ddddaebf39a33badd9bdc26c`。
- publicationId：`ecmwf-tcc:5eeb59e648e63d6c847b6674e6dc4d37795623e19892136e13a73c64f7a06f5d`。内容身份包含逐原生消息、加工版本、processor SHA与所有数值/mask摘要。它是实际内容修订，不冒供应商另有原子revision号。
- 71原件154,062,271B；完整数值+mask 137,119,105B；manifest 103,012B。测量时286文件共291,294,128B，随后另保存匹配manifest的processor.py。旧批次/硬链接、运行环境及日志不算成新的独立原件。
- 首轮顺序获取+数值处理171.70s、进程CPU12.58s、50ms采样RSS峰值188,047,360B。修正后的本地全量重新准入8.44s、CPU8.34s、峰值184,766,464B；没有再次网络获取。

离线显示首轮为`display-pilot-spec.json`及`display-pilot/`，复用同一采样和项目GCJ逆变换。3个窗口为z5广域、z10沿海和z9内陆；时次18:00、19:30及跨144→150h原生间隔的147.5h，共9图。实际PNG合计583,085B；首轮3.565s wall、3.750s进程CPU、阶段边界/50ms采样RSS峰值120,848,384B。两张宽/细窗口已目视为非空真实分级；内陆前两图为有效零的有色图，不是缺测透明图。

当前源码绑定的图像在`display-pilot-current/`、spec为`display-pilot-current-spec.json`，inventory `cloud-display-inventory:87b93ad13a1abc53b942b1f15951b75e3afb9a1897ba1f40f01c59972aa8aa28`。3.628s wall、3.844s CPU、阶段/50ms RSS峰值120,995,840B；9份PNG与初版逐字节相同，原54点数值/像素证据可复用。每图同时绑定源manifest、run、两端有效时刻/数值hash、精确selectedAt、display window、坐标/采样源码hash和PNG身份。先数值插值再着色，不能混合两幅色图代替。样本未证明基础图规格已足够所有缩放，也未证明全部全国窗口/小时已预制。

全部为本机Windows离线开发测量，存在同时开发活动；RSS采样可能漏短暂峰值，逻辑字节不是生产磁盘分配。没有普通API/DB与多冷窗口/批次重叠测试，不能外推4核16GB、4GB、200DAU或月费。没有上传数据。

## 实际检查及剩余接入

- Python批次8项检查通过；独审实际错误stream反例失败、正确原件通过。独立ecCodes最近格点算法对0/144/150/276h四帧的12个西北/东南/内部点核对，坐标/数值完全一致，原件和数值摘要相符。
- 共用采样及文件reader最终8项检查通过并获新独立审阅：3→6h、精确时刻、零/缺测、边缘/禁止外推、pin、损坏、缺帧、错误来源、路径和失败读取排空。独立9份PNG完整hash/尺寸/有效mask及54个代表像素与数值核对一致，共2,752,512个有效像素非透明。
- 独审发现并修复：双文件read一项失败后须abort并等全部settled再释放名额；时间拒无offset/非法日历并规范同一instant的身份。排空回归先用真实文件存在性模拟产生夹具竞态，已改为显式entered barrier后失败，独审8/8通过。共享source-instant复用原QWeather校验，没有改其天气含义；QWeather受影响检查也通过。规范化一度进入逐像素热循环，现已由共用cloudSamplePercent将时间处理留在每帧入口，point evidence与图片复用同一数值算法。
- 批次processor身份已改为开始捕获、保存原字节、封存前核未变；当前已核批次保存的是其实际运行源码，未重写旧manifest。

下一接入仍归PLAN：发布权威和统一版本pin、全部现用总云量消费者、数值与QWeather其它字段分责、预制基础图与必要有界补图、正式静态分发及失败回滚。当前reader两并行读取/四帧缓存只是可测初版；真正不同冷窗口的排队/取消/过载需在API接入前落实，不能以busy重试或放宽上限替代。不要把这个开发reader直接作为现用迁移已完成。

## 已核现用消费者边界（只读独立追踪）

- `observation-context-service.ts`已是resolve/get/CAS及fingerprint owner；同Context的云量发布pin应放版本化weatherView，普通时间编辑保持，换批通过同Context更新。`miniapp-service.ts`为Map每个候选另resolve时必须继承父pin。`app-store.ts::usableObservationContext`和`observation-context-recovery.ts`重建旧QWEATHER字段，需一起维护兼容，否则会丢pin。现有Query contextId/fingerprint/revision可复用。
- `weather-provider.ts`保和风其它小时/预警；`weather-hour.ts`现小时选取与新增总云量精确投影分责。`astronomy-service.ts`两处天气投影、weather cache key、HTTP `spot-sky:v4:extended`隔离均须含发布/新合同身份。`weatherAt`继续表示和风小时，不能伪造为ECMWF selectedAt。云量允许独立于其它字段有效。
- `forecast-presentation.ts`目前按weatherAt过期同时清cloud；`sky-time-presentation.ts`把同一和风小时内cloud值不同当冲突；`plan-reference-model.ts`先筛weatherAt再统计云量。这些实际读者都需独立云量证据/时效，连续Play还需保同版原生端点。Map少云筛选、地点信号及共享outbox天气快照也是消费者；本次不启worker、不重放提醒。
- 独立`getMapCloud`已存在，应原位接绑定数值/成品，停止新grid分支九次和风点请求。旧`MapCloudSnapshot` v1及夜光字段的`MapLayerRaster`不能伪装连续云网格；需要显式版本合同/云量raster来源。`map-time-frame.ts`与`map-cloud-presentation.ts`旧polygon/hour逻辑一起迁移。原`useRasterImage`/`useMapRasterInstallation`可复用，且须接suspend/全关/退出/故障退休；cloud retained scope须含publication。

这些是实际依赖和兼容证据，不是另一份实施计划；接入顺序与剩余义务只沿唯一PLAN/HANDOFF。

## 后续栅格合同接线

2026-10-28已完成原proof/inventory的共享类型、producer构造/准入及只读成品owner，见[云量栅格边界](CLOUD-RASTER-BOUNDARY-20261028.md)。实际4项producer→reader检查、原9pilot只读及完整CRC/像素数量通过，contracts/API类型通过；独审仍交Root。新reader只返回无URL的prepared描述，新Map仍503，原数值ready未升级。正式静态family/OSS/ready、全国规格、客户端第三安装及全部剩余义务保留。
