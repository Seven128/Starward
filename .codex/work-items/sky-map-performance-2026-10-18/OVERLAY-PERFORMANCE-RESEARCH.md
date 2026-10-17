# 地形、云量与年度夜光叠层性能：链路核查与有界试验

2026-10-18。本记录是只读代码审查和官方资料核对；没有运行手机、压测、部署、读取私人位置或修改生产代码。用户报告的拖动/缩小后缺口等待 2–3 秒是待定位的实际体验，下面的耗时成因是代码支持的假设，不是本次测量结果。root 负责把选定试验加入唯一 PLAN，本文不建立并行计划。

## 结论

现有实现已经有固定网格、缓存、共享下载、旧图保留、双原生槽切换和迟到安全，不能把任务描述为“补一个缓存”。最值得先测的三个边界是：

1. 地形前端随精确相机变化请求 metadata，服务端才归一到固定窗口；越界后仍需等待新整窗拼图、整张传输和原生安装。当前缓冲较小，没有客户端邻域预取、覆盖滞回或父级覆盖选择。
2. 云量以 MapScene 的 polygons 呈现，换 query key 时没有跨 key 的前帧保留；新 scene 尚未回来时，旧的有效采样格可能直接从组件数组中消失。云量的未采样空白是产品真实含义，必须与刷新造成的暂时消失区分。
3. 年度夜光虽不依赖逐小时天气，其地图入口仍被完整 MapScene 的地点天气/天文计算链包围；需要确认这是不是比 PNG 下载更大的前置等待。

先把这些边界测清并减少重复/无关工作，再决定扩大缓存、低优先级预取、CDN 或多图片分块显示。不要先采购新地图能力或把 MapLibre 的 WebGL 渲染器替换进微信原生 map。

## 当前链路和已有保护

### 原生视野与地形请求

- `apps/wechat-miniapp/src/pages/map/index.tsx`：`useNativeMapRegion` 统一提供实际 `getRegion`；Map `onUpdated`、区域结束和相机/布局更新触发读取。用户拖动结束先保存相机，再以 250 ms 延迟解析新的观测 Context。这 250 ms 是观测条件 debounce，不是地形下载固定延时。
- `pages/map/use-native-map-region.ts`：视野按 mapId、中心、zoom、loadedViewport、布局、高度及 expectedScale 归属。新相机不会使用旧 bounds；回调做当前代校验，有 10 秒读取 deadline 和有限重读。正常期间不能用编造视窗替代读取失败。
- `pages/map/terrain-geometry.ts:bufferTerrainBounds`：从实际 Mercator 视野向每边扩展约原跨度的 10%（宽高合计为 1.2 倍），不是没有缓冲。
- `hooks/use-terrain-overlay.ts`：metadata key 包含 purpose、中心经纬度 7 位、bounds 7 位；成功数据 staleTime 为 24 小时，部分失败为 0，失败最多补一次 1 秒后的恢复。图片另以 publicationId+immutable URL 识别。
- `workers/miniapp-api/src/terrain-service.ts`：Map 请求先 `terrainWindowViewport` 再 normalize；固定网格 key 缓存 16 个计算结果，重叠消费者共用进行中结果，最后消费者取消才 abort。固定发布目录优先，其次 24 小时可再生磁盘缓存，再次生成。地图窗口组合与源渲染各有最多 2 个活动任务、16 秒 deadline。
- `packages/coordinate-system/src/raster-grid.ts:displayRasterWindowForBounds`：以较长维度约 512 个显示像素选择现有 LOD，固定 256 像素小格；当前算法生成不超过 3×3 的整窗。它与 4 km 选点视野校准是不同责任。
- `terrain-window-renderer.ts`：逐格 resolve 和逐字节复制已有同级阴影图，不重算地形数值；完成后同步 PNG 编码和 SHA，返回一张新整窗。循环顺序读取各格，旧格可以命中服务缓存/磁盘，新增格可能需源获取/计算。窗口仍受聚合 24 MiB 来源预算限制。
- `terrain-viewport-renderer.ts`：已有源瓦片完成态 LRU（64 个、约 16 MiB 高程数组）、单格最多 12 个源瓦片/24 MiB、并行取当前格所需源。已有 `TerrainRenderMeasurement` 分解 projection、source I/O/decode、sample、shade、encode、total 和 imageBytes；不需再造一套测量框架。

### 共享文件与原生安装

- `services/map-raster-files.ts` / `raster-image-resources.ts`：地形和年度夜光共用 8 个文件、16 MiB 编码字节、最多 2 个下载；相同 key 共用 in-flight 与已完成文件，LRU 淘汰只碰无 reader、无 native pin 的文件；SHA/字节检查、取消、失败删除和 path alias 均有归属。下载队列是插入顺序，没有 foreground/prefetch 优先级。
- `raster-file-adapter.ts`：`Taro.downloadFile` 18 秒 timeout；下载完成后 stat/hash 才交文件。所有当前 raster URL 通过 API base 构造，同域相对 `/v2/terrain/assets/` 与 `/v2/night-light/assets/`，没有独立 raster CDN origin 配置。
- `hooks/use-raster-image.ts`：每次启用/图片身份改变先进入 path=null 的 pending 状态，然后向共享文件 owner acquire。已缓存文件可重获，停用或改身份释放 reader；无剩余消费者的未完成下载会取消。
- `pages/map/use-map-raster-installation.ts`：新 src/bounds/data 尚未齐时保留已选 target；metadata/download 完成并不直接改变已呈现 source。明确 unavailable 才清目标，失败与 unavailable 分开。
- `pages/map/map-ground-overlay.ts`：每个产品占 2 个 id；旧图保持原 bounds，备用 id add 新图，原生 success/Promise ack 后才切 displayed/source 并移除旧图。过期 generation 不能接管，超时 id 不立即复用，native pin 直到确认移除才释放。它有意不用 update 改当前可见图的 bounds。
- 因此跨出旧图 bounds 出现缺口并不自动意味着“代码先删旧图”：旧图仍在原来正确范围，新区域直到新图准备完才出现。原生 add ack 也不等于手机屏幕上已完成合成，需要视频/帧证据区分。

### 年度夜光

- `night-light-service.ts`：DB 激活记录是 authority；release 按 version+inventory hash 缓存，第一次 release 要依次读取所有 fixed proofs。窗口只缓存完成结果，最多 8 个/16 MiB；本地 binary read 最多 2 个。
- `night-light-window.ts`：在已发布数值 LOD 选择窗口，最多 3×3；命中已发布完整窗口可直接读，否则读取所需固定格，复制既有已着色像素后 PNG 编码；质量/零值统计按既有 proof 汇总，不编造格子。不同视窗需新的整窗 URL，即使多数格已重复。
- 进行中的同 key night-light window composition **没有**像 terrain sharedRead 那样合并；相同新窗口的重叠请求可以重复构建，占满 activeReads。代码明确为取消隔离而只共享完成结果；如优化，必须保留每消费者取消语义。
- `miniapp-service.ts:getMapScene`：先枚举地点并按每批 4 个 await `computeDecision`，再查最终 MapScene 缓存；年度夜光 `nightLight.layer` 在这些工作后才执行。静态夜光可能等待无关的地点天气/天文工作。不能未经 measurement 就把它断言为目前 2–3 秒的主因，但应优先分阶段计时。
- `controller.ts`：地形/夜光 asset 路由已有 `public, max-age=604800, immutable`。有 HTTP 缓存头不证明真实边缘 CDN 配置或命中。进一步核对 origin→edge 的已有部署映射及实际响应头/字节/时间，而非重复给文件加缓存头。

### 云量及时间切换

- 云量当前是原生 polygon 数组，**不走 raster 文件下载与 GroundOverlay**。`map-cloud-forecast.ts` 按视野 1/4、1/2、3/4 的位置量化成最多 9 个真实 0.01°采样格，各格独立读逐小时序列；缺失/未查询处不涂色。
- QWeather owner `weather-provider.ts` 已以实际四舍五入 GCJ02 点及 provider 配置复用完整逐小时响应（128 个、成功最长 30 分钟），同 key 请求在 `ComputationCache` 合并；不随选中日期/小时重复获取同一上游序列。当前时刻之外的数据按 validity owner 失效。
- MapScene 云采样已经先启动，与地点计算重叠；但响应仍需等完整 scene 路径结束。最多 9 个 Promise.all，不是逐格串行。
- 前端 `scene.queryKey` 含中心、zoom、native bounds、Context/revision、filters等。`useResourceQuery` 没有跨 key placeholder/previous data；`projectedPolygonSource` 在无新 scene 时返回空数组。光害/地形有 native retained target，云量没有对应已呈现格保留层。
- `use-forecast-query.ts` 已拥有来源有效期、到期重验和所选小时投影；新增暂存不得绕过它。可以保留仍有效的旧采样格原坐标，不能让它们随相机移动，不能把低密度采样扩成满屏连续云图，也不能用上一小时冒充当前小时。

## 优先假设与最小观测

| 要区分的机制 | 最小观测 | 能改变的实现决定 |
| --- | --- | --- |
| 前端同一固定窗口重复 metadata | 一次小幅拖动前后：相机意图序号、canonical grid key、metadata 开始/结束、实际返回 publication hash；不记录私人坐标 | 对齐稳定网格身份、coverage/LOD滞回，避免在仍被有效窗口覆盖时重取/反复loading |
| 跨边界冷源/整窗编码慢 | 复用 renderer measurement，加/读组合开始结束和缓存 HIT/JOIN/MISS；比较已发布目标区域一次跨窗与回拖 | 修正漏发布/漏命中；必要时预生成固定单元/常用窗口或有限并行组装；不是先提高全局并发 |
| 传输还是原生 install 慢 | metadata ready → download start/end → stat/hash end → add submit/ack → 首个真实覆盖帧 | 下载主导才优先 CDN/压缩/传输复用；native主导才评估少量分块/更小图片/调度 |
| MapScene 扇出阻塞静态层 | 地点查询/decision批次/cloud work/nightlight composition/响应各阶段 wall time；记录数目而非位置/身份 | 共享模型保持不变，解除静态层等待无关数据的依赖或并行启动；不粗暴缓存私人 MapScene |
| 云层刷新主动清空 | 一次同小时小幅拖动：旧有效格数、scene key切换、polygon数组长度、屏幕空白时段 | 给云 layer 建立同时间/来源有效期约束的已呈现集合，保留旧有效格直到新集合就绪 |
| 快速逆向造成重复下载/取消 | 同一路径前进→反向一次，记录取消次数、下载字节、ready hit、native add/remove数量与排队延时 | 低优先预取/保留完成态的取舍，foreground优先和有界滞回；不把所有取消关掉 |

每项先用一个代表路径辨别机制；不要做地区×主题×日期组合矩阵。分别记录冷/暖状态、实际网络和有效发布版本。现有 fixtures 可证明生命周期/缓存逻辑，不能证明真实地形/云层读数、手机速度或 CDN 收益。

## 推荐的有界试验顺序

1. **先复用当前候选和现有诊断做一条链路基线。** 已选择地形、同小时云量或夜光，拖动跨一条窗口边界，再缩小一级，再逆向回拖。三种层共享调度测量方式，但云量与静态栅格必须分开归因。测缺口持续时间、首次有效覆盖、完全目标覆盖、请求/字节、临时/decoded/native资源和输入响应；不能只以 API 成功结束等待。
2. **先消除重复身份与清空。** 用共享坐标模块导出的固定网格语义对齐 terrain request/cache，保留正确 request center 和返回覆盖披露，按当前实际 bounds+所需LOD决定是否必需新窗。为云量保留时间/版本/年龄仍有效的原坐标样本；失效与未查区域仍空白。改动后只重验受影响的取消、有效期和 native呈现路径。
3. **再处理首要等待阶段。** 若服务端前置工作大，先解除静态夜光与 MapScene unrelated report 的串行关系；若拼图/传输大，先复用现有发布/固定格/immutableURL和边缘缓存。对 night-light 同 key in-flight 合并只在测到重复构建时实施，保留独立取消。
4. **预取/父级仅在收益可量化时引入。** 邻域预取必须低于可见需求优先级，不能占满现有 2 下载槽造成当前视窗等后台；以当前预算内的命中率、额外字节和内存决定范围。父级覆盖必须是真实已发布同 dataset/style/quality 的较粗级，保持其原地理范围和缺测mask，目标细级就绪再替换；不能把旧图拉伸到新bounds，不把较粗图称为已达到细节验收。
5. **多 GroundOverlay 是条件试验。** 若整窗重复下载仍是主瓶颈，做有限原生能力试验，观察相邻图 seams、混合层opacity、道路/地名、原生 add/remove耗时和资源释放，再决定小块常驻调度。现有两槽可控实现应作为对照；未经真机能力及资源证据，不推进 9+9 地形/夜光图块及双缓冲倍增。

优化边界：4 km选点范围、地形细节/坐标、夜光五档数值/质量/有效零与缺测、云量实际位置/小时/来源年龄、路名/交互、过期结果保护和既有内存/并发预算均不可被静默削弱。以真实基线证明明显改善，按证据制定目标，不编造“100 ms所有网络必达”。云幕是Map/Sky转场的另一个候选降级，不用它遮盖地图叠层性能问题。

## 原生微信能力与官方资料核对

2026-10-18查阅；只使用产品/项目官方来源。微信文档本次 web 获取失败，以下 Taro 官方文档提供可读 API 和平台支持表；没有把非微信平台的腾讯云 Super App 文档当微信能力证据。

- [Taro MapContext](https://nervjs.github.io/taro-docs/docs/apis/media/map/MapContext/) 明确微信支持 add/update/removeGroundOverlay；add、update以 id、src、bounds定位，支持网络/临时/包内图片，含visible/zIndex/opacity和成功/失败回调。remove按id。文档没有承诺原子显示切换、回调等于最终屏幕合成、图片最大尺寸或最多可同时显示几张；这些边界仍未验证。按不同id管理多图有API表达能力，不能据此推导任意图块数量稳定可用。
- [Taro Map平台支持表](https://nervjs.github.io/taro-docs/docs/components/maps/map/) 的 `tileOverlay` 与 `groundOverlays` **组件属性**仅勾选支付宝，没有微信支持；不能因为Taro类型列出属性就认为微信可直接使用URL模板tile layer。当前微信项目继续通过MapContext处理图片。
- [腾讯位置服务微信组件指南](https://github.com/TencentLBS/tencentmap-miniprogram-skill/blob/main/references/map_component_guide.md) 是腾讯官方针对微信组件的指南；它没有提供本次所需的通用XYZ瓦片调度器或任意多图资源上限。个性化/可视化 layerId能力属于平台配置与资格，不等价于可随意接入自有XYZURL；本任务未购买/启用。
- [微信 addGroundOverlay官方页](https://developers.weixin.qq.com/miniprogram/dev/api/media/map/MapContext.addGroundOverlay.html)、[updateGroundOverlay](https://developers.weixin.qq.com/miniprogram/dev/api/media/map/MapContext.updateGroundOverlay.html)、[removeGroundOverlay](https://developers.weixin.qq.com/miniprogram/dev/api/media/map/MapContext.removeGroundOverlay.html) 是继续核查的直接入口。本次读取失败，不能填写未读到的微信数值限制。

MapLibre/Mapbox成熟调度策略由root同期官方调研补充。可借鉴的是稳定网格/LOD、缓存、已加载父级保留、受限预取和可见任务优先；SDK代码可用性、WebGL图层与微信原生组件是不同事实，不能直接移植假定兼容。

## 后续交接

本轮仅新增本记录。没有测得新的设备延迟，没有运行额外测试，没有改业务/测试/Context/PLAN。root应以当前真实发布和同一手机候选取得上表最小证据，再决定实现批次；相关性能结果写现有验证owner，采用的长期规则写现有地形/夜光/天气owner。
