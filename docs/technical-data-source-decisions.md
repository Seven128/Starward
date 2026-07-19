# Starward 技术选型与数据源决策包

> 状态：前置调研基线，供 `docs/source-plan.md` 与后续 `/long-task-workflow` 使用。
>
> 证据日期：2026-07-20。价格、配额、版本、许可和服务可用性会变化，实施与生产发布必须按本文的复核门重新取证。
>
> 非完成声明：本轮没有购买服务、创建生产账号、接受商业合同、取得法务意见、下载全量生产数据、完成真机/户外 POC、校准模型或部署基础设施。

## 1. 决策语言和权威边界

本文把“已经由产品/架构来源确定”和“本轮调研推荐”分开：

- `source_baseline`：两份上游方案已明确的方向，后续实现应保留，但精确版本/供应商合同仍可能待决。
- `recommended`：基于当前官方资料的首选落地路径；必须在 Source Plan 对应 DEC 被确认后才能升级为批准的生产决定。
- `contract_gate`：能力可行，但商业许可、配额、SLA、地域、归属或再分发条款必须由真实合同/法务证据确认。
- `poc_gate`：不能仅靠文档证明，需要可重复样本、真机、性能或算法校准结果。
- `external_confirmation`：需要商务、法务、商店、现场或专业人员确认，Agent 不得代签或伪造。
- `defer`：不进入当前阶段的生产关键路径。

本文件是研究与决策输入，不取代 `DESIGN.md`、`project_context/**` 或唯一 Source Plan；它也不表示 DEC 已被用户批准。

## 2. 执行摘要

### 2.1 推荐的 MVP 技术基线

| 领域 | 推荐基线 | 状态 | 进入生产前的硬门 |
| --- | --- | --- | --- |
| 移动端 | Expo Development Build + React Native + TypeScript，新架构；Expo Router、TanStack Query、Zustand、RHF/Zod | source_baseline | 锁文件、双端 Development Build、原生模块兼容矩阵和升级/回滚演练 |
| 交互 | Gesture Handler + Reanimated；Skia 仅承担天空/连续绘制；原生地图与传感器适配器隔离 | source_baseline + recommended | 真实 iOS/Android 手势竞争、帧时间、低端机、reduced motion 与红光模式 POC |
| 中国天气 | QWeather 作为中国首要聚合源，服务端调用和缓存 | recommended + contract_gate | 商业许可、逐 API 价格/免费量/QPM/SLA、归属、缓存和历史保留书面确认 |
| 分层云/多模型 | Open-Meteo 商业端点作为候选补充和模型比较层 | recommended + contract_gate + poc_gate | 商业订阅、到中国链路、变量/模型新鲜度、归属链和与 QWeather 的样本比较 |
| 卫星云图 | NSMC FY-4B/后续业务星作为中国首要调查对象；无获准自动化源则延期实况图层 | recommended + contract_gate + poc_gate | 账号资格、产品/通道、自动化、时效、费用、缓存/派生/再展示许可及 30 天管线 POC |
| 地图/路线 | 高德 Android/iOS 原生 3D 地图 +服务端 Web Service 路线；外部导航深链 | source_baseline + contract_gate | 法人技术服务许可、各端 key/包名签名、配额/价格、隐私告知、双端离线范围确认 |
| 地点真值 | Starward 自有 Spot/Facility 数据，地图 POI 只作候选线索 | recommended | 现场核验、贡献/审核、敏感坐标和更新责任 |
| 光污染 | EOG VIIRS Annual VNL v2.2 原始 GeoTIFF → 自有版本化 COG/金字塔/瓦片；显示 radiance/年份/方法 | recommended + poc_gate | CC BY 4.0 标注、下载校验、区域裁切、云覆盖质量、SQM/现场校准；禁止无证据直译 Bortle |
| 地形 | Copernicus DEM GLO-30，GLO-90 作许可/缺片/访问降级；生成地平线派生物 | recommended + contract_gate | CCM 注册/许可接受、2026-07-28 访问变化复核、归属、缺片/海域、地平线精度 POC |
| 日月行星 | Astronomy Engine 本地确定性计算 | source_baseline + recommended | 固定版本、黄金集、时区/折射/海拔约定，与 JPL Horizons 的容差验证 |
| 星表 | Gaia DR3 按可见星等与字段裁剪、HEALPix 分块的版本化离线资产候选 | recommended + poc_gate | credits/引用、已知问题、字段选择、包体/绘制性能、增量版本策略 |
| 人造卫星 | CelesTrak OMM JSON/CSV + SGP4，服务端最多按上游更新节奏缓存 | source_baseline + recommended | 使用政策、非 200 停止重试、六位 catalog number、过期轨道显式降级、再分发复核 |
| 专业天象 | 可本地计算者优先；JPL/NOAA/其他远端源只由服务端采集和缓存 | recommended + contract_gate | 每类工具单独确认 API 公平使用、许可、时效、可用性和实验标签 |
| 推送 | 本地提醒 + 服务端通道抽象；iOS APNs；Android 按发行渠道接 FCM/国内厂商；Expo Push 仅非关键早期通道 | recommended + poc_gate | 渠道覆盖、证书、收据/失效 token、重复/延迟基准；任何推送均不作安全保证 |
| 对象存储/CDN | S3 语义抽象；中国主场景优先选境内 OSS/COS 一家，原始/派生/公开分层 | recommended + contract_gate | 实名/备案/域名、区域、加密、生命周期、版本、出网/CDN/请求成本和数据跨境确认 |
| 后端 | NestJS/Fastify 模块化单体 + Python GIS workers + PostgreSQL/PostGIS + Redis/BullMQ | source_baseline | 版本锁、任务幂等/重放、数据库/对象真值边界、负载和恢复 POC |

### 2.2 不应在启动长程开发前伪装成“已解决”的事项

1. QWeather、高德、Open-Meteo、对象存储/CDN、国内 Android 推送的正式合同、账号、价格和配额。
2. QWeather、Open-Meteo 与获准卫星云图源在首发地区的逐时/逐帧字段完整度、延迟、误差和故障降级。
3. VIIRS radiance/SQM/天空亮度/Bortle 的区域校准公式与可信区间。
4. DEM 地平线遮挡算法在山地、建筑/树林和不同采样距离下的误差。
5. 通透度、视宁度、推荐权重、硬阻断、安全阈值、观察窗口和缓存 TTL 的正式产品阈值。
6. Expo/React Native/高德/Skia/Reanimated 在锁定版本和真实设备上的兼容性。
7. 中国生产备案、地图许可、个人信息、数据跨境、商店和内容版权确认。

## 3. 移动端和交互技术栈

### 3.1 版本策略

- 采用“实施开始时最新、官方支持、同一 Expo SDK 兼容矩阵内的稳定组合”，不用 Source Plan 把今天的版本永久钉死。
- 2026-07-20 的官方/注册表快照显示 Expo SDK 57/RN 0.86 已出现，SDK 56/RN 0.85 仍是近期稳定发布；具体选择必须以正式 Expo release notes、`expo install --check`、原生依赖兼容和双端构建证据决定。
- Expo SDK 55+ 只支持 React Native 新架构；Reanimated 4 也要求新架构。不得设计旧架构回退路径后再宣称符合当前基线。
- Gesture Handler、Reanimated、Skia、高德原生模块、Expo modules 必须由一个兼容矩阵锁定，不手工混装“看起来最新”的版本。
- 原生模块变化意味着新二进制/runtimeVersion；EAS Update 只承担兼容的 JS/样式/资源更新。

### 3.2 交互实现结论

- 项目级执行规范位于 `.codex/skills/uiux_design/SKILL.md`，它必须读取并服从 `DESIGN.md`/Source Plan，不反向定义品牌或验收。
- Press 用可访问原生语义控件；连续手势由 Gesture Handler；手势关联动画在 Reanimated UI 线程；Skia 不成为普通布局/表单框架。
- Bottom Sheet、地图/卡片联动、时间 scrubber、天空拖拽必须支持中断、取消、速度衔接、边界和系统手势竞争。
- 动画 token 先作为 POC 候选；上游 web Skill 的 `10px`、`0.3–0.4s`、damping/response 或投影常数不直接成为 React Native 生产常量。
- Apple 风格的透明材质和系统字体不采纳：Starward 保留 Inter、实体表面、细边框、受控亮度层级、非玻璃拟态，以及 Android 原生惯例。

### 3.3 技术 POC

必须在完整功能开发前建立一个双端 vertical slice，覆盖：

1. 原生高德 MapView、可选地点、卡片/Sheet、路线线条和 React Native 导航。
2. Map pan/pinch 与 Sheet pan/scroll、iOS back swipe、Android predictive/system back 的竞争。
3. Reanimated 运行中重新抓取、反向、速度传递、reduced motion。
4. Skia 星空/极坐标图在代表性低端与高刷新设备上的 CPU/GPU/内存/电量。
5. 红光模式进出、系统弹窗/键盘/原生地图法务标识和错误态无蓝白闪烁。
6. VoiceOver/TalkBack、200% 文本、44px 目标、触觉关闭/不可用。

## 4. 天气与环境数据

### 4.1 QWeather

推荐用途：首发中国区域的当前天气、小时/日预报、预警、空气质量及其稳定中文产品语义。

已证实的官方事实：

- 商业使用须遵守 Developer License；所有许可模式都要求归属，天气预警还必须显示响应中 `refer.sources` 的完整来源。
- 当前为按请求、按月累计的阶梯计费；中国大陆价格含税，最小账单金额为 CNY 0.01。官网示例、本文快照都不能替代采购日价格表和登录后的成本计算器。
- 2026-07-20 官方快照中，pay-as-you-go 项目共享 3,000 QPM，Premium 为 50,000+ QPM；QPM 按项目计算，该项目全部 data key 共享。具体项目配额仍须在控制台/合同复核。
- QWeather 推荐 JWT；官方已公告自 2027-01-01 起限制使用 API KEY 认证的每日请求量，因此生产服务端不得把长期 API KEY 作为无迁移方案的默认。
- 天气数据可缓存；GeoAPI 数据不得批量缓存、下载或建立索引。批量数据需联系商务。
- 覆盖因数据类型而异；天气/海洋/太阳辐照/天文为全球，预警/AQI 按支持区域，分钟降水/台风等存在区域限制。
- 免费、标准和企业能力/SLA/QPM 不同，必须以签约时控制台/合同为准。

2026-07-20 官方公开阶梯快照（每月按表中区间顺序累计，单位为 CNY/请求）：

| 价格组 | 月请求区间 | 单价 |
| --- | ---: | ---: |
| Weather and Essential Services | 前 50,000 | 0 |
| Weather and Essential Services | 后续 950,000 / 4,000,000 / 5,000,000 / 40,000,000 / 50,000,000 | 0.0007 / 0.0005 / 0.00035 / 0.00015 / 0.0001 |
| Weather and Essential Services | 再到 100,000,000 | 联系商务 |
| Storm and Ocean | 1,000,000 / 4,000,000 / 5,000,000 | 0.003 / 0.0025 / 0.0015 |
| Storm and Ocean | 再到 10,000,000 | 联系商务 |
| Solar Radiation | 100,000 / 400,000 | 0.3 / 0.2 |
| Solar Radiation | 再到 500,000 | 联系商务 |

官方示例中，单月 1,000,000 次 Weather 请求约 CNY 665；1,000,000 次 Weather 加 1,000,000 次 Warning 约 CNY 1,165。超过平均 1,000,000 次/日（太阳辐照为 500 次/日）应联系商务。成本模型必须按实际 API 所属价格组聚合，而不是把“一个用户刷新”当成一次请求。

落地约束：

- 只由 Starward 服务端持有 key/JWT 和调用；客户端只访问规范化 Forecast API。
- 缓存键至少含供应商、模型/产品、标准化格点、run/issuedAt、时区、变量集和单位版本。
- 原始响应按合同允许的最短必要期限保留；GeoAPI 不进入自有可搜索地名库。
- 每个产品页保留 QWeather 和上游预警来源归属，失败时不得隐藏来源或沿用过期预警为当前状态。
- 合同表必须逐项确认 current/hourly/daily/grid/warning/AQI/astronomy 的价格、免费量、QPM、SLA、缓存、历史保留、衍生、展示和终止后处理。

### 4.2 Open-Meteo

推荐用途：分层云量、能见度、阵风、多模型对比和历史/模型验证候选；不作为未经 POC 的唯一中国生产源。

官方事实：

- 免费公共 API 只允许非商业用途，并限制为 600 次/分钟、5,000 次/小时、10,000 次/日和 300,000 次/月，无 uptime 保证。
- 商业订阅提供 customer endpoint、商业使用许可和 99.9% uptime target；当前公开调用预算为 Standard 1M/月、Professional 5M/月、Enterprise 50M+/月，付费档表内不设分钟/小时/日限制；特定历史/集合/卫星产品要求 Professional 或更高。
- 付费档是固定月费、无逐次超额价；金额由官网嵌入的 Stripe 价格表/结账币种动态展示，采购证据必须保存当日套餐、币种、税费、调用预算和订单，而不能把本文写成报价。
- API 数据以 CC BY 4.0 提供，使用和再分发需要归属并说明修改；服务器代码为 AGPLv3，自托管会触发独立的软件合规和运维评估。
- 多变量、长时间范围可按分数计为多次调用，不能把 HTTP 请求数简单等同账单调用数。

落地约束：

- MVP 先通过商业试用/订阅 POC；禁止把免费端点用于有广告/订阅/商业发行的生产 APP。
- 保存每个模型、run、变量、归属链和修改说明；`best_match` 不能抹掉实际模型来源。
- 对首发地点做 QWeather/Open-Meteo/现场样本对比，分别统计总云、低/中/高云、能见度、湿度、风和降水。
- 中国访问延迟与可用性必须实测，不能从欧洲/北美保留服务器的描述推断。

### 4.3 ECMWF Open Data

- IFS/AIFS 的公开子集按 CC BY 4.0 可商业使用和再分发，但须归属并遵守 ECMWF Terms；托管交付可能另有服务费/协议。
- 作为供应商独立性、离线批处理和模型基准候选，不建议 MVP 直接在移动请求路径解析 GRIB。
- 如采用，Python worker 负责下载 manifest/checksum、run 完整性、GRIB 解码、变量/层裁切、单位标准化、空间重采样和过期清理。

### 4.4 通透度、视宁度与推荐评分

- 目前没有被批准的直接生产“视宁度”供应商。
- 通透度/视宁度可以由云、湿度、温差、风层、气溶胶/能见度等构造解释性估计，但公式、权重和阈值属于 POC/DEC，不是客观观测真值。
- 每个评分输出必须保存输入 run、规则版本、缺失字段、置信度、解释和硬阻断；现场实况只用于经过样本治理的校准。
- 建立区域/季节分层回测，防止只用全国汇总平均掩盖山区、沿海、盆地和高原差异。

### 4.5 卫星云图

推荐路径：以国家卫星气象中心（NSMC）FY-4B/后续业务星产品作为中国主场景的首要调查对象，但在自动化下载、商业再展示、派生瓦片和归档条款确认前标记 `contract_gate + poc_gate`；没有合规实时源时，MVP 只展示有来源的预报云量图层，不用抓取网页云图冒充生产数据。

官方事实与边界：

- FY-4B 自 2024-03-05 起在 105°E 恢复业务服务，国家卫星气象中心公告列出风云地球、CMACast 和风云卫星遥感数据服务网等获取途径。
- NSMC 数据服务网提供 FY-4B 1 级数据、图像/大气等产品以及最新/全球云图；在线下载需中国气象数据网会员注册，官方页面建议个人实名，注册资料经审核后方可下载。
- 公开网页可看/可人工下载不等于取得稳定批量 API、商用 APP 再展示、缓存、派生瓦片或 CDN 再分发权；产品目录、账号类别、自动订购、时效、配额、费用、署名和终止后处置必须向 NSMC/CMA 书面确认。
- JMA HimawariCloud 只面向覆盖区内 NMHS（国家气象水文机构）注册用户，不是可直接假定取得的商业备份；全圆盘标准数据约 103 GB/日、PNG 约 12 GB/日、10 分钟一帧，服务端仅保留约 72 小时并建议至少 20 Mbps。JMA 历史档案另有购买或研究/教育 best-effort 渠道，角色与许可需逐项确认。

如获准生产使用，服务端管线必须：

1. 只拉取获批产品/通道/区域；保存平台/仪器/产品级别、观测开始结束、生成/获取时间、投影/CRS、覆盖、通道/合成算法、质量标记、许可版本、checksum 和缺帧原因。
2. 区分“卫星实况图像”和“数值预报云量”，UI 显示观测时间、延迟、白天可见光/夜间红外或合成类型，不把图像纹理称为未来确定天气。
3. 保留获准的 immutable raw 或仅保留允许期限内的缓存；完成投影校正、区域裁切、颜色/夜间合成、overviews、版本化瓦片/动画 manifest 和可回滚发布，禁止抓取官网展示图或绕过账号下载限制。
4. 以至少 30 天、多天气过程样本测量发布时间到可用延迟、缺帧/补帧、地理配准、昼夜切换、云边界与地面报告差异、单帧/动画体量、worker CPU/内存/存储/CDN 成本。
5. 当帧过期、通道不一致或权限中止时隐藏/标记图层并回退到预报云量；不得循环最后一帧制造“实时”错觉。

## 5. 地图、路线、地点与坐标

### 5.1 高德

推荐用途：中国境内双端地图展示、定位、路线和外部导航衔接。

官方事实：

- Android/iOS 3D SDK 支持地图、覆盖物、路线相关能力和离线地图；Android 2D SDK 已下线。
- 法人或非法人组织正式上架、公开、收费/广告、内部上线或长期/大量调用前，必须购买技术服务许可；未购买 key/配额仅用于短期少量测试。
- 隐私合规状态必须在 MapView/OfflineMapManager 等初始化前设置；SDK 会涉及位置、搜索词、网络/设备/传感器等信息，须在隐私政策披露并按任务申请权限。
- 高德 logo 不可移除；地图 night/satellite/normal 等模式不能被 Starward 样式遮挡法务标识。
- 3D SDK 的离线组件按城市下载/暂停/更新/删除；这不自动证明 iOS 与 Android 能提供相同离线粒度，也不等于允许服务端抓取瓦片。

生产合同/POC 必须确认：

- Android/iOS Map/Location/Search/Navigation 与 Web Service 的 SKU、价格、日/QPS/QPM、超额、SLA和地域。
- 路线类型、途经点、备选路线、交通、限行、山区/最后一公里、返回字段、缓存/存储和展示归属。
- 离线城市包在双端的许可、体积、更新、样式、使用边界和是否可纳入 Starward 行程包。
- key 按包名/签名/bundle id/服务端 IP 或签名隔离，客户端 key 的授权范围最小化。

### 5.2 路线降级

- 正常：高德路线快照包含 provider、route id/hash、issuedAt、distance、duration、traffic assumptions、polyline、warnings 和坐标系版本。
- 超时/限额：返回明确标记的缓存路线或直线距离，不把直线距离称为驾车方案；后台可重试但不会静默改写已确认行程。
- 无网：行程包只使用已许可离线地图/路线快照；外部导航是否可用由设备 App 决定。
- 路线变更必须原子更新距离、时长、到达、风险和受影响的观星窗口。

### 5.3 地点与 POI

- 高德/QWeather GeoAPI/公开 POI 不成为停车、厕所、露营、门禁、安全和观景平台的权威真值。
- Starward Spot/Facility 保存来源、核验者、核验时间、有效期、争议、敏感坐标级别和撤回记录。
- 自动导入只产生候选；设施和最后一公里必须通过现场/可信贡献/运营确认。

### 5.4 OSM 的边界

- OSM 数据许可与 OSM 公共瓦片服务是两回事。`tile.openstreetmap.org` 无 SLA，禁止 bulk/offline/prefetch 和构建 MBTiles；正常交互也须归属、有效 User-Agent 和缓存。
- 如未来采用 OSM 离线地图，必须自行托管或购买明确允许离线/预取的 provider，并单独履行 ODbL/归属；不得拿公共 tile server 当高德免费备份。

### 5.5 坐标

- 原始地理/天文/栅格计算使用 WGS84；高德显示/路线适配到 GCJ-02；类型系统区分两者。
- 每次转换保存来源坐标系、目标坐标系、算法版本和误差；禁止重复转换。
- 敏感地点的 approximate/verified/restricted 等政策由产品 DEC 决定，地图 SDK 能显示精确点不等于用户有权看到精确点。

## 6. 光污染与地形管线

### 6.1 EOG VIIRS Annual VNL v2.2

官方事实：

- 当前页面把 Annual VNL v2.2 标为最新；GeoTIFF、EPSG:4326、15 arc-second（赤道约 500m），单位为 `nW/cm²/sr`，提供 average/median/coverage 等层。
- 月度/夜间产品受云、太阳照明、杂散光和覆盖影响；零值不能直接解释为没有灯光，必须结合 cloud-free coverage。
- VNL 属于 EOG 公开的 CC BY 4.0 产品，可复制、修改、商业使用和分发，但须明确归属、标注修改，图形/产品需使用规定 notice/credit；大格式图形的 logo 规则需法务/设计确认。

推荐生产流程：

1. 下载 raw 文件、readme、许可和引用；保存 URL、版本、发布日期、大小、校验和、获取时间和工具版本。
2. raw bucket 不可变且只读；解压/验证 CRS、nodata、coverage、范围和统计。
3. 保留 radiance 与 coverage；按中国/运营区域裁切、压缩成 COG，生成 overviews 和版本化 tile manifest。
4. 以稳定采样/重采样算法生成地图层和点查询，不把地图配色写回数值。
5. 在 UI 显示数据年份、EOG 来源、修改说明、原始 radiance/估计类型和置信度。
6. 新版本并行发布、抽样 diff、可回滚；旧行程/报告可按 manifest 重现。

禁止：

- 直接把 VIIRS radiance 映射为“实测 Bortle”或保证银河可见。
- 忽略 coverage、背景/瞬态灯光、雪/云/气溶胶、地形遮挡、局部灯源和数据年份。
- 用日/夜 near-real-time 图层替代经过质量控制的年度基线而没有独立 POC。

校准 POC：收集有时间、天气、仪器/方法、方向和位置质量的 SQM/现场样本；按区域/地貌/季节拆分训练/验证；报告误差、偏差、样本量和适用范围；只在证据足够区域显示校准区间。

### 6.2 Copernicus DEM

官方事实：

- GLO-30 和 GLO-90 提供全球 30m/90m 表面模型；可通过 CDSE OData 或 S3 方式批量获取，下载能力取决于用户类别。
- GLO-30/90 的 Full Free & Open 实例有专门许可；必须接受并保留适用条款/归属。
- CDSE 已公告 2026-07-28 起 GLO-30 view service 要求 CCM 用户类别注册；本项目应注册并在实施日复核下载/view 权利，不能根据旧教程假设匿名永久访问。
- GLO-30 可能由 GLO-90 补缺；海域等无数据区域可返回 0，必须区分真实海平面与 nodata/补值。

推荐生产流程：

1. 按首发区域获取原始 tile、许可、metadata 和校验和，raw 不可变。
2. 合并/裁切为分析栅格，显式保留 DSM、分辨率、补缺与 nodata provenance。
3. 对地点按方位角射线采样生成 horizon profile；缓存算法版本、采样半径/步长、DEM 版本和误差。
4. 生成面向移动的紧凑 profile/遮挡角，不把全量 DEM 放进普通行程包。
5. 与山谷、山脊、海边、城市建筑/树木场景现场对比；DEM 只覆盖地表模型，局部建筑/树林另作未知/贡献层。

## 7. 天文、星表、卫星和专业工具

### 7.1 Astronomy Engine

- 适合端侧/服务端统一计算太阳、月亮、行星、升落、暮光、月相、食、坐标变换和星座；项目说明目标精度约 1 arcminute，适合多数业余用途但不适合航天器导航。
- 固定 JS/服务端版本和 wrapper API；统一 UTC、IANA 时区、地点海拔、折射开关、地平线定义和观星夜。
- 用 JPL Horizons 做离线黄金验证，不从客户端并发轰击 JPL。JPL API 要求一次一个请求、best effort、格式可能变化并应检查 `version`。
- 黄金集覆盖纬度/半球/高海拔/极区/DST/跨午夜、日月升落、行星和银河相关派生，记录容差和上游版本。

### 7.2 星表

- Gaia DR3 可批量下载，官方目录包含分片、MD5、disclaimer/citation 和已知问题；近 20 亿源不适合直接入包。
- 候选构建：选择肉眼/双筒/摄影所需字段与亮度阈值，处理 proper motion/epoch，按 HEALPix 分块，生成版本化二进制索引和分层细节。
- 保留 ESA/Gaia/DPAC credit、release DOI/引用和字段/过滤说明；对已知问题和未来 release 做可回滚版本更新。
- 包体、启动、视锥查询、Skia 绘制和低端机内存必须 POC；未选定字段/阈值前 Source Plan 继续保留 DEC。

### 7.3 CelesTrak OMM + SGP4

- 使用 OMM JSON/CSV，不以 TLE 固定字段作为长期真值；2026 年 catalog 已进入六位编号，TLE 无法表示新增 100000+ 对象。
- CelesTrak 使用政策要求只下载所需数据、每次更新只取一次；GP/SupGP 建议最短 2 小时，非 200 必须停止并告警，重复错误会被防火墙封禁。
- 服务端集中获取、ETag/内容 hash 去重、保存 epoch/获取时间/格式版本；客户端不直接轮询。
- 轨道过期、缺失或传播误差高时隐藏/降级通行和凌日月结果，不显示精确倒计时假象。
- CelesTrak/Space-Track 再分发和商业使用边界需法务复核；缓存策略不能被误解为自动获得数据再许可。

### 7.4 JPL、NOAA 与其他专业工具

- JPL Horizons/SBDB 用于服务端低频验证、彗星/小天体候选和黄金集，不嵌入客户端请求；遵守一次一请求、best effort、版本检查和无永久可用保证。
- NOAA SWPC OVATION/空间天气 JSON 可作为极光实验数据候选；必须确认字段定义、时效、归属/免责声明、区域适用和故障状态。
- 日月食、暮光、月相和常规行星事件优先本地确定性计算；流星雨数量、彗星亮度、极光、APOD/机构内容和空间站凌日月分别建 provider contract。
- NASA/APOD 页面可能包含第三方版权图片；NASA 名称不表示所有媒体均可商业再发布，必须逐项读取 credit/copyright，不满足许可时只链接或使用自有/明确开放素材。

## 8. 推送与提醒

### 8.1 通道结论

- 本地、时间确定且无需最新服务端状态的提醒优先本地调度，并在数据变化时显式重算/撤销。
- iOS 远端通过 APNs；Android 国际渠道可用 FCM，面向中国主流设备必须评估发行渠道和华为/小米/OPPO/vivo 等厂商通道，不能假设 FCM 覆盖。
- Expo Push 免费、每项目 600 通知/秒、无 SLA、至少一次交付到 APNs/FCM 且可能重复或丢失；receipt 只证明下游服务接收，不证明用户设备收到。
- Expo Push 可用于开发和非关键 MVP POC；后端必须有 provider abstraction、幂等 notification id、收据、token 失效、退避和切换能力。
- APNs/FCM 也不保证最终到设备；天气/路线/安全信息必须在打开 APP 时重新验证，推送不得被描述为救援或生命安全保证。

### 8.2 可靠性合同

- 规则计算保存 rule version、input snapshot、edge transition、cooldown、scheduledAt 和 idempotency key。
- 发送队列按 provider/project/channel 限流；429/5xx 指数退避和抖动，永久 4xx 不盲重试。
- Expo receipt 约 15 分钟后检查并在 24 小时清理前完成；`DeviceNotRegistered` 停发并等待重新注册。
- payload 不含精确敏感位置、完整行程或 secret；打开后用授权 API 取新数据。
- 同一事件/网格/用户去重，免打扰/权限/偏好/时区变更即时生效；具体默认和 cooldown 留给 DEC。

## 9. 对象存储、CDN 与离线资产

### 9.1 生产候选

- 中国主场景推荐在阿里 OSS 与腾讯 COS 中选一家作为首发主存储，使用项目内部 object-store interface 隔离签名、生命周期和事件差异；不要同时经营两家作为 MVP 伪高可用。
- 当前阿里 OSS 官方计费由容量、请求、公网流出以及 CDN/处理等增值项组成，标准本地冗余示例价为 0.12 元/GB/月，但所有单价/优惠/地域必须在采购日计算器复核。
- 腾讯 COS 同样按容量、流量、请求、取回和管理功能计费；请求成功或失败都可能计费，不能依赖重试风暴。
- 中国境内 CDN 域名必须完成 ICP 备案；未备案或备案失效会停止加速/下线。选择境外源站给境内 CDN 还会引入回源延迟和跨境边界。

### 9.2 Bucket/对象分层

- `raw-restricted`：供应商原始文件、许可、manifest、checksum；不可变、最小访问、版本保留。
- `derived-private`：COG、地平线、星表分片、路线/报告等内部派生；记录 lineage 和可重建性。
- `public-assets`：明确可公开的瓦片、缩略图、帮助素材；CDN、归属和内容安全。
- `user-media`：用户上传与处理版本；短期上传凭证、病毒/内容检查、EXIF 分离、删除/撤回任务。
- `proof/audit`：许可接受、发布 manifest 和操作审计；不和公开内容混用。

所有对象使用不可变版本 key、内容 hash、metadata、加密、最小权限和生命周期；数据库保存引用和当前指针，Redis 不保存唯一真值。

### 9.3 离线包

- 行程包 manifest 列出 schema、app/runtime 最低版本、每组件来源/许可/版本/hash/大小/有效期/敏感等级和依赖顺序。
- 动态数据（天气、路线、预警）与静态数据（地点、星表、光污染、地平线）分层过期；离线可读不等于仍可称 fresh。
- 下载支持断点、临时文件、校验后原子激活、空间预检、Wi-Fi/蜂窝选择、增量更新、旧版本回滚和账号/敏感点撤权清理。
- 高德离线地图只通过获许可的原生 SDK 能力；禁止把高德或 OSM 公共瓦片抓取进自建包。
- 包体/并发/保留/自动下载/加密默认仍由 DEC offline-pack-policy 决定。

## 10. 成本与容量模型

采购前使用可审计变量计算，不用“免费 API”假设：

- 天气：`活跃用户 × 每用户独特格点 × 每日刷新批次 × 每批产品调用数 × 缓存未命中率`，另算多变量/长区间的加权调用。
- 路线：`请求路线的行程 × 起终点/途经点变体 × 重算次数 × 备选方案`；地图 SDK、Web Service、搜索和导航 SKU 分开。
- 卫星云图：`获批区域 × 每日帧数 × 通道/合成数 × raw 单帧体量 × 保留天数`，再分解下载流量、投影/裁切 CPU、临时盘、瓦片/动画对象数和 CDN 出流；JMA 全圆盘体量只作量级警示，不能代替 FY-4B 实测。
- 推送：`订阅规则 × 条件边沿触发率 × 用户设备数 × 重试/重复系数`，按 provider 通道拆分。
- 存储：raw、derived、public、media 分别计算 GB-month；请求、处理、取回、跨区复制、公网出流/CDN 流量分开。
- GIS worker：按全量重建与增量运行分别计算 CPU、内存、临时盘、出网和失败重跑。
- 数据库/Redis：按热点查询、地理索引、ProviderRun/NightReport 保留、队列峰值和 PITR 计算。

成本 POC 至少模拟 1k/10k/100k MAU、典型和恶劣缓存命中、供应商故障重试、地图高峰与离线大包。预算由业务批准，本文不替代报价。

## 11. 必须执行的 POC 与批准门

| Gate | 最小证据 | 失败时的安全降级 |
| --- | --- | --- |
| Weather contract | 首发地区 30+ 地点、多个天气过程、逐字段/模型/run/延迟/缺失/价格/归属 | 单供应商保守字段；隐藏无证据视宁度/分层结论 |
| Satellite imagery | 获准 FY-4B/其他源连续 30 天的账号/许可、产品/通道、延迟/缺帧、昼夜合成、配准、体量/成本和瓦片回滚 | 延期实况云图，仅保留明确来源的预报云量 |
| AMap native | 双端地图、路线、离线、隐私、key、配额和外部导航真机 | 无离线/无备选路线；显示直线/缓存且明确标记 |
| VIIRS pipeline | raw checksum → COG/tiles → 点查询 → 归属 → 版本回滚 | 只显示 radiance/年份，不显示 Bortle/可见性承诺 |
| DEM horizon | 山谷/山脊/海边/城市样本，算法参数、误差和性能 | 显示“地形估计不可用/仅 DEM”，不伪造遮挡 |
| Astronomy golden | Astronomy Engine 与 JPL 多地点/时段容差 | 阻止受影响工具发布，保留基础已验证功能 |
| Satellite | OMM 六位 ID、缓存节奏、过期/非 200/传播测试 | 隐藏过期通行/凌日月，不沿用旧倒计时 |
| Interaction | 地图/Sheet/时间/天空、反向/中断/系统手势/a11y/红光双端真机 | 采用静态/系统过渡，关闭未达标复杂手势 |
| Offline pack | 断点、空间、hash、原子激活、过期、撤权、弱网/断电 | 只保留在线+明确缓存，不称完整离线 |
| Push | APNs/Android 渠道矩阵、延迟/重复/收据/失效 token | APP 内收件箱/打开时刷新；不承诺送达 |
| Storage/CDN | 地域/备案、成本、权限、生命周期、恢复、删除 | staging 本地/单区域，禁止生产公开 |

## 12. 商务、法务和外部确认清单

生产前必须取得可追溯证据：

1. QWeather 每个 API SKU 的商业许可、归属、缓存/衍生/保留、终止处理、价格、配额和 SLA。
2. Open-Meteo 商业计划、数据 attribution chain、自托管 AGPL 评估（若采用）和中国链路。
3. NSMC FY-4B/后续业务星或其他卫星云图源的账号资格、产品目录、自动化/配额/费用、时效、缓存/归档、派生/再展示/再分发和署名；Himawari 等备用源不得越过用户资格与许可。
4. 高德法人技术服务许可、地图/搜索/路线/定位/离线/导航 SKU、隐私清单、配额、价格和 logo/归属。
5. EOG VNL、Copernicus DEM、Gaia、CelesTrak、JPL、NOAA 和任何机构内容的适用版本许可/信用/再分发。
6. 对象存储/CDN 中国区域、域名/ICP、跨境、加密、日志、删除和恢复。
7. iOS/Android 商店、定位/后台/相机/通知/联系人/AR 权限、国内 Android 推送厂商和证书。
8. 地点土地/通行/露营/停车/设施/安全与敏感坐标现场核验。
9. SQM/摄影/天文专业校准和真实户外设备结果。

任何一项缺失只能标 `pending`、`unknown` 或降级，不能写成“已获许可/已验证”。

## 13. 官方证据索引

### 移动端与交互

- Expo SDK/reference：https://docs.expo.dev/versions/latest/
- Expo SDK 56 release：https://expo.dev/changelog/sdk-56
- Expo development builds：https://docs.expo.dev/develop/development-builds/introduction/
- React Native releases：https://reactnative.dev/versions
- Reanimated compatibility：https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- Reanimated `withSpring`/reduced motion：https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/
- Gesture Handler：https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/introduction/
- Expo Haptics：https://docs.expo.dev/versions/latest/sdk/haptics/
- React Native AccessibilityInfo：https://reactnative.dev/docs/accessibilityinfo
- React Native Skia installation：https://shopify.github.io/react-native-skia/docs/getting-started/installation

### 天气

- QWeather start/finance：https://dev.qweather.com/en/docs/start/
- QWeather billing：https://dev.qweather.com/en/docs/finance/billing-and-payment/
- QWeather pricing：https://dev.qweather.com/en/docs/finance/pricing/
- QWeather QPM glossary：https://dev.qweather.com/en/docs/resource/glossary/
- QWeather authentication：https://dev.qweather.com/en/docs/configuration/authentication/
- QWeather attribution：https://dev.qweather.com/en/docs/terms/attribution/
- QWeather cache：https://dev.qweather.com/en/docs/best-practices/cache/
- QWeather restrictions：https://dev.qweather.com/en/docs/terms/restriction/
- Open-Meteo pricing：https://open-meteo.com/en/pricing
- Open-Meteo license：https://open-meteo.com/en/license
- Open-Meteo terms：https://open-meteo.com/en/terms
- ECMWF Open Data：https://www.ecmwf.int/en/forecasts/datasets/open-data
- NSMC FY-4B service notice：https://www.nsmc.org.cn/nsmc/cn/news/153152.html
- NSMC satellite data portal：https://data.nsmc.org.cn/portalsite/default.aspx
- JMA HimawariCloud：https://www.data.jma.go.jp/mscweb/en/himawari89/cloud_service/cloud_service.html
- JMA satellite archives：https://www.data.jma.go.jp/mscweb/en/product/library_data.html

### 地图、栅格与存储

- 高德 Android SDK 概述：https://lbs.amap.com/api/android-sdk/summary
- 高德 Android SDK 下载/隐私清单：https://lbs.amap.com/api/android-sdk/download/
- 高德离线地图：https://lbs.amap.com/api/android-sdk/guide/create-map/offline-map/
- OSM tile policy：https://operations.osmfoundation.org/policies/tiles/
- EOG VNL products：https://eogdata.mines.edu/products/vnl/
- EOG licensing：https://eogdata.mines.edu/files/EOG_products_CC_License.pdf
- Copernicus DEM docs：https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM.html
- Copernicus bulk download FAQ：https://documentation.dataspace.copernicus.eu/FAQ.html
- Copernicus DEM access notice：https://dataspace.copernicus.eu/news/2026-7-17-copernicus-dem-30m-view-service-license-acceptance
- Alibaba OSS billing：https://help.aliyun.com/zh/oss/billing-overview/
- Tencent COS request billing：https://cloud.tencent.com/document/product/436/53861
- Tencent CDN filing requirement：https://cloud.tencent.com/document/product/228/43672

### 天文、卫星与通知

- Astronomy Engine：https://github.com/cosinekitty/astronomy
- Gaia DR3：https://www.cosmos.esa.int/web/gaia/data-release-3
- Gaia bulk extraction/checksums：https://www.cosmos.esa.int/web/gaia-users/archive/extract-data
- CelesTrak OMM formats：https://celestrak.org/NORAD/documentation/gp-data-formats.php
- CelesTrak usage policy：https://celestrak.org/usage-policy.php
- JPL SSD API fair use：https://ssd-api.jpl.nasa.gov/doc/index.php
- JPL Horizons：https://ssd-api.jpl.nasa.gov/doc/horizons.html
- NOAA SWPC JSON：https://services.swpc.noaa.gov/json/
- Expo Push FAQ：https://docs.expo.dev/push-notifications/faq/
- Expo Push delivery/SLA：https://docs.expo.dev/push-notifications/sending-notifications/
- FCM quotas：https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas
- Apple notifications：https://developer.apple.com/documentation/usernotifications/

### 设计来源

- Upstream Apple Design Skill：https://github.com/emilkowalski/skills/blob/6bf24434f7730ad169077756cf9c7cd7bd675fc6/skills/apple-design/SKILL.md
- Upstream MIT license：https://github.com/emilkowalski/skills/blob/6bf24434f7730ad169077756cf9c7cd7bd675fc6/LICENSE
- Apple motion：https://developer.apple.com/design/human-interface-guidelines/motion
- Apple accessibility：https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple haptics：https://developer.apple.com/design/human-interface-guidelines/playing-haptics
