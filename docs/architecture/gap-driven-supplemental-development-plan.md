# Starward 基于缺口的补开发方案

> 文档性质：供后续 `source-plan-authoring` 使用的普通上游 Source 候选。  
> 本文不是 Source Plan、Context、DESIGN Authority、Delivery Contract 或完成证明，也不修改它们。  
> 审计日期：2026-07-22。  
> 代码基线：`main@a88c1b0` 加当前工作区；当前未提交差异集中在 Tiny Context、`docs/source-plan.md` 和依赖清单，没有发现生产功能代码的未提交增量。

## 1. 结论

用户的判断成立：当前项目与两份初版方案的目标形态仍有实质性距离。

当前仓库不是空项目。它已经具备 Expo/React Native 壳、Fastify API、若干领域类型与算法、Open-Meteo 非商业 POC、Astronomy Engine 封装、坐标转换、部分 SQLite/FileSystem 代码、Android 构建痕迹和较多自动测试。问题在于这些能力尚未形成一个从原生 APP 入口可连续使用、以真实输入驱动、能持久化和重启恢复、能调用真实原生或外部边界的完整产品。

最关键的事实如下：

1. `apps/mobile/index.js` 在原生端注册 `WebApplication`；`WebApplication` 在非 Web 平台把路径固定为 `/`，所以安装包实际只进入 `MobileShellScreen`。五个 tab 只切换壳层文案，`TonightScreen`、`MapScreen`、`ItineraryScreen`、`SkyScreen` 等独立页面没有被原生主导航接通。
2. 当前 Android 截图中的“观星地图”是无数据说明卡，不是真实地图。`MapScreen` 自身也用普通 `View` 模拟地点分布画布，没有高德或其他真实 MapView。
3. `apps/api/src/start.ts` 明确把路线 provider 配置为抛出 `amap_route_key_not_configured`；NightReport 使用进程内 repository，地点来自低置信度 Overpass POC，光污染、经核验地点和真实路线没有闭环。
4. 行程、现场、社区、通知、账号、后台、恢复演练等服务大量使用 `user-demo`、固定日期、固定地点、固定结果和进程内 state。通用 `durable-business-runtime.ts` 主要把 command token 写入 SQLite 并生成通用 receipt，不能代替行程、媒体、通知、账号等各自的真实领域写入和副作用。
5. 离线 SQLite/FileSystem 函数、传感器适配器和外部地图深链中有真实局部代码，但多处没有接入当前原生产品路径；AR 仍是 capability 选择函数，媒体上传没有选图、对象写入、派生物和审核闭环。
6. 当前 UI 主要是“动作按钮 + 证据卡片”，与 Source Plan 的页面层级以及后续生成的页面/控件设计资源还没有形成 selected-target → 实现的保真链。`packages/ui-system/src/tokens.ts` 与 `DESIGN.md` 的基础颜色也存在漂移。
7. 当前 mobile/API typecheck 通过；mobile 14 个测试文件、25 个测试通过，API 25 个测试文件、85 个测试通过。这证明代码可编译且局部逻辑被覆盖，不证明产品完成。现有浏览器验收的核心仍是点击动作后检查 testID 和文字可见；通用 runtime probe 证明的是 token 能写入和读回，不是对应业务闭环。
8. 长任务 Final Receipt 虽记录 `machine_accepted`，但其 `authority_scope` 是 `audit_only`、`reusable_for_acceptance=false`。它不能替代本次按初始方案和当前代码进行的产品完成性判断。

按初始产品稿“16 项 MVP 必做功能”逐项采用严格端到端标准检查，目前：

- 完整端到端：0 项；
- 有真实局部实现但未闭环：10 项；
- 仍以固定演示、声明或缺失为主：6 项。

这不是代码完成百分比，而是说明当前尚没有一条 MVP 能力可以同时满足“原生可达、真实输入、真实数据/副作用、持久化、失败恢复和可执行验收”。

## 2. 输入与可追溯性

| 输入 | 身份 | 用途 |
| --- | --- | --- |
| 初版产品方案 | `C:/Users/777/.codex/attachments/62ece93a-1736-4d7b-8888-c747e78816fa/pasted-text.txt`；SHA-256 `76fd0201aacd63f74dd87c4ca362cd59bf76f6ceea0cdb5346f1d38d4222f6a0` | 产品目标、MVP/V1/V2/V3、页面、功能、数据模型和风险 |
| 初版技术方案 | `C:/Users/777/.codex/attachments/d8874db0-6c8f-4270-98d8-d89a6d4422fd/pasted-text.txt`；SHA-256 `1de938f5a16c1e3040ec967457479031d576b00c25d3b34c85ebb69d555b38b3` | 原始架构、模块、数据源、部署、测试和工程顺序 |
| 当前 Source Plan | `docs/source-plan.md`；审计时 SHA-256 `439dafc17a9a1b1aa4134df1789d40d5a75ed8ac651c2b97a57a79ce1631ca3a` | 已记录的产品细化、批准决策、真实闭环约束和 UI Authority 语义 |
| 当前 Context | `project_context/global.md`、`architecture.md`、`areas/main.md`、`areas/main/verification.md` | 当前个人试用边界、产品责任和验证原则 |
| 视觉系统 | `DESIGN.md`；审计时 SHA-256 `3ccd7211333b48bdc10eb4ee77b34058f7433a8ff80aaacea212f547754a3836` | 长期 token、视觉语法、交互和模式约束 |
| 数据源研究 | `docs/technical-data-source-decisions.md`；审计时 SHA-256 `30ae0a0968260b4dc5a62fb8d3d2909b3b5578d1f16ca0b6368aa00b99a57e64` | 当前数据源、许可、成本和 POC 门 |
| 当前实现 | `apps/`、`packages/`、`workers/`、`data-pipelines/`、`infrastructure/`、`tests/`；`main@a88c1b0` | 当前实现事实 |
| 设计资源 | 后续与本文一起传入的原型、页面稿、组件/控件状态稿、动态交互说明和资源索引 | 页面/控件的 authored target 候选；未选定前不自动成为 Authority |

若设计资源目前只存在于会话图片中，后续 Source authoring 前必须重新附加或保存为稳定文件，并提供资源 ID、版本、哈希、覆盖页面/viewport/mode/state 和选择状态。仅靠“上文那张图”无法抵抗会话压缩或文件丢失。

## 3. 控制本方案的需求变更

下列后续用户决定高于两份初版方案中冲突的商业化或公开部署描述：

- 当前运营主体是个人。
- 当前分发是 owner-only、非商业个人试用/内部安装。
- 全部外部经常性服务成本硬上限为 CNY 200/月、CNY 2,400/年。
- 未经 owner 单独批准，实际可支出的 paid budget 默认为 CNY 0；预算内也不得自动购买、升档或增加第二付费源。
- 当前不考虑 ICP 备案、公众运营、生产商店发布、公开 CDN、商业合同和面向公众的合规发布证明。
- MVP、V1、V2、V3 的产品能力没有因为个人使用而自动删除。机器内可实现的真实功能不能退化为静态卡片；缺少外部许可、专家或现场背书的能力应标 experimental、pending、unknown、disabled 或诚实降级。

### 3.1 因需求变更而不再是当前缺口的内容

- ICP 备案、公众网站/域名/CDN 上线。
- 公开应用商店生产发布和商业推广。
- 多区域、多副本、WAF、大规模高可用和面向公众的生产 SLO。
- 商业供应商合同、付费冗余和自动扩容。
- 面向公众的大规模社区运营与审核人力证明。
- 法务、商店、商业合同、领域专家和代表性户外背书的“已完成”状态。

这些可以作为未来升级门保留，不应重新混入当前完成条件。

### 3.2 可以简化、但必须真实实现的内容

- 账号：可改为单 owner、设备绑定或私有访问凭据，不必先做完整公众 OAuth；但远程 API 不能继续匿名使用 `user-demo`。
- 数据库：个人版可以采用 SQLite/WAL + RTree/预计算索引，不必先运行高可用 PostgreSQL/PostGIS；但领域数据必须真实持久化且有迁移、备份和恢复。
- 任务：可以采用 SQLite job table + 单 worker/系统调度，不必先上 Redis/BullMQ；但任务必须真实执行、重试、去重和留痕。
- 媒体：可以采用设备文件 + 私有服务端文件目录，不必先有公开对象存储/CDN；但选图、原图保护、派生物、EXIF 清理、失败恢复必须真实。
- 管理后台：可做 owner-only 的轻量 Web/本地控制台，不必构建公共运营平台；但数据源、地点、审核、成本和任务操作不能只是固定说明。
- 协作和社区：当前可标 experimental，并在私有邀请/隔离环境中实现；不能用一个 command 按钮和固定结果声称已完成。

### 3.3 需求变更没有豁免的内容

- 原生 APP 的真实导航和所有页面可达性。
- UI/UX 页面稿、控件稿、动态状态和交互逻辑的忠实实现。
- 真实天气/天文/地点/路线/光污染数据链及诚实降级。
- 本地与服务端持久化、离线文件、重启恢复和冲突处理。
- 地图、定位、传感器、通知、相机/相册、分享等原生调用。
- 成本统计、调用配额和 CNY 200/月硬停。
- 权限、secret、位置、EXIF、备份和删除等基础安全隐私。
- 可变输入、真实 sink、失败路径和原生目标验证。

## 4. 初始 MVP 逐项缺口

| MVP 必做项 | 当前状态 | 当前证据与缺口 |
| --- | --- | --- |
| 当前位置与日期选择 | 局部实现 | 壳层可请求前台定位和保存手动位置；日期选择在未接入原生主导航的 Tonight 页面，文本地点不解析为坐标。 |
| 今晚综合结论 | 局部实现 | 有 NightReport POC 和解释性 UI；原生入口不可达、route/light pollution/curated spot 不完整，report repository 为进程内。 |
| 基础天气 | 局部实现 | Open-Meteo 非商业 POC 可取实时数据；缺少目标区长期质量门、持久化 ingest、成本台账和完整 warning/AQI 生产组合。 |
| 基础天文 | 局部实现 | Astronomy Engine 封装可计算部分日月/目标信息；缺少完整银河/行星/特殊天象验证、版本化星表和多地点黄金数据闭环。 |
| 光污染地图 | 缺失 | 只有“暂无校准数据/不可伪造 Bortle”的说明；没有 VIIRS 区域资产、点查询、瓦片、图例和版本回滚。 |
| 人工初始观星点 | 缺失 | 当前以 Overpass POI 作为候选 POC；没有已批准的深圳/大湾区 30 个核验 seed spot 数据集。 |
| 地点详情 | 局部实现 | 有 trust/visibility contract 和 POC detail；缺照片、遮挡、光环境、设施/开放/风险的持久化权威数据和真实核验工作流。 |
| 地点筛选 | 局部实现 | 有有限 radius/选择动作；没有完整天空、出行、设施、用户适配筛选和地图联动。 |
| 地点推荐与理由 | 局部实现 | 有规则和解释框架；候选评分使用 POC 固定基线，缺真实地点级天气、光污染、路线、遮挡、设施和校准。 |
| 主地点与备选地点 | 局部实现 | NightReport 可输出角色，但真实天气备选证据不足，跨地图/详情/行程状态没有原生连续闭环。 |
| 外部地图导航 | 局部实现 | 有高德深链函数；真实路线 provider 被禁用，触发页面未接入原生入口，未验证设备返回与失败恢复。 |
| 简单行程卡片 | 固定演示 | `ItineraryWorkflowService` 使用固定“西涌银河观测夜”、固定时间和进程内 plan；通用 runtime 日志不保存真实行程实体。 |
| 手机摄影基础预设 | 局部实现 | 确定性曝光规则有价值；设备/镜头输入、条件耦合、计划引用、离线版本和实拍校准未闭环。 |
| 上传新地点 | 固定演示 | 社区 command 生成固定经纬度和固定审核对象；没有表单、选点、媒体、持久化和审核。 |
| 评论、评分与实况 | 固定演示 | 固定 command 生成预设评价/实况；没有真实用户输入、时间/位置证据、TTL job 和历史读取。 |
| 基础埋点 | 缺失 | 只有 policy/固定漏斗文案和 telemetry 类型；没有 consent 后的真实事件写入、查询和留存任务。 |

## 5. 全系统 14 个 Outcome 缺口

状态定义：

- “局部实现”：存在真实算法、适配器或局部持久化，但 owner 从原生主路径无法完成完整结果。
- “验收脚手架”：主要行为由固定输入、固定状态、通用 command token 或证据卡构成。
- “当前不要求生产门”：功能可以开发，但不要求公众/商业发布证据。

| Outcome | 当前判断 | 已有资产 | 主要补开发缺口 |
| --- | --- | --- | --- |
| `mobile-shell-and-preferences` | 局部实现 | Expo/RN、SQLite preferences、定位权限、五 tab 外观 | 修复真实 Expo Router/native entry；五入口进入实际页面；统一 stack/deep link/back；主题、字体、无障碍、设计 target 全量落地；iOS/Android 验证。 |
| `tonight-decision` | 局部实现 | NightReport contract/service、天气/天文 POC、评分/阻断框架 | 真实候选、地点级条件、路线、光污染、缓存/持久化、profile/state 联动；消除默认深圳坐标和进程内 report；按设计稿重构首屏与行动链。 |
| `forecast-and-astronomy` | 局部实现 | Open-Meteo adapter、QWeather client、Astronomy Engine 包 | provider ingest/store/quality/cost；小时矩阵、15 日、模型分歧、昼夜轴、地图图层；银河/行星/天象、黄金校准和实验性指标边界。 |
| `map-route-discovery` | 局部实现 | 坐标转换、Overpass POC、route adapter/deep link | 真实 MapView、marker/cluster/camera/sheet、全部筛选/图层、真实 route snapshot、主备/路线同步、取消/超时/配额；当前路线启动配置必须替换。 |
| `spot-detail-and-trust` | 局部实现 | 坐标可见性和事实冲突规则、SQL migration | 核验 seed spots、完整实体/HTTP/client、媒体、光环境、地平线、设施/开放/安全、评价、纠错、事实版本和 owner 编辑。 |
| `itinerary-and-collaboration` | 验收脚手架 | patch/revision/merge 领域函数 | 用真实表单创建计划；持久化 itinerary/stop/stage/route/weather snapshot；地图/时间线/候选/版本/分享/离线；V2 私有邀请 WebSocket 和冲突。 |
| `sky-orientation-ar` | 局部实现 | 部分天空模型、简单画布、Expo Sensors adapter、AR mode resolver | GPU/Skia 或等价天空、星表分包、时间 scrub、轨迹/FOV/遮挡；传感器精度与校准；真实相机 overlay/ARKit/ARCore 或诚实 disabled；主路径接入。 |
| `shooting-assistant` | 局部实现 | 确定性曝光规则和部分本地版本 | 完整设备/镜头输入、目标和条件耦合、预设/清单/历史、行程与离线引用、规则校准；AI 保持 disabled 或仅解释。 |
| `field-offline-safety` | 验收脚手架 | 离线 manifest/queue 算法、未接入的 Expo SQLite/FileSystem/SecureStore 函数 | 真正下载组件、校验字节和原子激活；飞行模式/杀进程恢复；离线地图许可边界；现场状态、停车、主备、红光、前后台安全会话和本地分享。 |
| `community-contribution` | 验收脚手架 | 贡献/TTL/评分纯函数、media sanitize helper | 真实表单、相机/相册、文件写入、EXIF 派生、地点/实况/评价/纠错持久化、审核状态、TTL worker；个人版保持私有/owner-only。 |
| `notifications-and-toolbox` | 验收脚手架 | batch/edge/dedup 函数和 channel interface | 订阅表、规则编辑、事件 worker、SQLite queue、本地通知实际排程/取消/深链/receipt；专业工具逐个使用真实算法/数据，不返回固定对象。 |
| `identity-profile-privacy` | 验收脚手架 | 本机 guest preferences、隐私投影函数 | 单 owner 认证/设备凭据、真实 session/token、受保护 API、设备/内容管理、导出文件、删除/retention job、SecureStore 和审计。 |
| `admin-data-operations` | 验收脚手架 | 一个静态 Next page、若干 admin 纯函数 | 建立可运行 admin workspace；owner auth；真实地点/来源/任务/审核/成本/规则数据；预览、执行、回滚和审计。 |
| `quality-release-observability` | 验收脚手架 | unit tests、Android 构建痕迹、Context CI、telemetry 类型 | 根级 verify/build scripts；完整 CI；真实 trace/metric/log sink；备份恢复演练；原生 E2E/离线/故障/性能；移除硬编码 RPO/RTO/二进制“证据”。 |

## 6. 横切架构缺口与处置

### 6.1 原生产品入口

缺口：

- `package.json.main = ./index` 绕开了 Expo Router 的正常入口。
- 自定义 `WebApplication` 以 URL pathname 分派页面，原生端 pathname 恒为 `/`。
- tab 只改变壳层 destination，不执行 route transition。

处置：

- 统一采用 Expo Router 作为 iOS/Android/Web 的真实路由入口，删除并行路由真相。
- 五个一级 tab 使用真实 tabs layout；详情、预报、路线、摄影、贡献、隐私采用 stack/sheet。
- 共享 `DecisionContext` 只保留一份 location/date/profile/target/spot/route/itinerary/version 状态。
- 验证 deep link、Android predictive back、iOS swipe back、冷启动恢复和 tab history。

### 6.2 数据与持久化

缺口：

- PostgreSQL migration 和 repository 文件存在，但启动组合仍大量使用 in-memory/fixed service。
- 通用 durable runtime 只记录命令 token，领域读取仍从进程内 service 返回。
- worker/data-pipeline/admin-web 多数没有独立 package、build、start 或 deployment entry。

个人版建议：

- 移动端：Expo SQLite + FileSystem + SecureStore 作为用户状态、缓存、离线包、队列和敏感 key 的事实源。
- 私有 API：先采用单实例 Fastify + SQLite/WAL；空间搜索使用 RTree/预计算 GeoJSON。通过 repository interface 保留未来 PostgreSQL/PostGIS 迁移，但当前只允许一个活动事实源。
- 后台任务：SQLite job/outbox table + 单 worker/系统 scheduler；不为个人版引入 Redis/BullMQ。
- 媒体：本机和私有 API 的 content-addressed 文件目录，默认不公开；如果以后批准 S3-compatible storage，只替换 storage port，不改变业务契约。
- 备份：SQLite online backup/快照 + 私有媒体目录增量备份；执行真实 restore drill。

该简化偏离初版 PostgreSQL/PostGIS + Redis/BullMQ + S3/CDN 的生产拓扑，必须在后续 Source Plan 中标为“个人版有意替代”，而不是无说明漂移。

### 6.3 数据源与成本

缺口：

- 当前只允许 `noncommercial-poc`，但没有统一的实际调用、字节、缓存命中、账单和硬停执行链。
- 外部服务预算常量存在，不能证明不会超支。
- route、light pollution、DEM、satellite、media 等尚未形成可运行 source pipeline。

处置：

- 所有外部调用必须经过 `ProviderGateway`，没有直接绕行。
- 建立 `provider_usage_event`、`provider_budget_month`、`provider_rate_snapshot`、`provider_gate` 和 `provider_health`。
- 区分 `external_service_ceiling_cny=200` 与 `approved_paid_budget_cny=0`；只有 owner 配置的批准金额可实际使用。
- 70%：停止预热、非必要刷新和大范围候选；90%：关闭可选多模型、动画图层和自动媒体同步；100%：阻断全部新增付费调用，回到合法缓存、本地计算或 unknown。不得自动充值。
- 成本以供应商账单/配额和实际有效输出回填；测试需要模拟跨月、重试风暴、缓存失效和并发。
- 本地优先：天文计算本地执行；VIIRS/DEM/星表采用区域裁切、版本化静态资产；媒体默认私有本地；通知 MVP 使用本地通知和 APP inbox。
- 不在本方案内批准具体购买或固定供应商价格。

### 6.4 UI/UX 与设计资源

缺口：

- `DESIGN.md` 只提供全局系统，当前 Source Plan 明确没有 selected design target。
- 当前实现以通用证据卡为主，未按页面原型、控件状态稿和动效规格实现。
- runtime token 与 `DESIGN.md` 不一致。

处置：

- 后续 Source authoring 必须给每份资源稳定 ID，例如 `DR-SURFACE-TONIGHT-001`、`DR-CONTROL-MAP-SHEET-001`、`DR-MOTION-TIME-SCRUB-001`。
- 每个页面稿记录 route、viewport、mode/theme、data state、content stress、covered controls、资源哈希和 exact/constraint/inspiration 分类。
- 每个控件/控件组设计至少包含：
  - anatomy、尺寸、间距、字体、颜色、边框、圆角、阴影/层级和图标；
  - default、pressed、focused、selected、disabled、loading、saving、success、empty、no-results、stale、partial/degraded、error、permission-denied；
  - trigger、输入、校验、提交点、取消、回滚、导航结果和反馈；
  - motion timeline、easing/spring、snap、velocity、interrupt/reverse、gesture ownership 和 reduced-motion variant；
  - haptic、声音/视觉替代、screen-reader role/name/value/live-region、200% text、44px target、安全区和键盘；
  - planning/night/red-light 与长文本、缺图、极值、弱网/离线条件。
- 将 `DESIGN.md` token 生成或手工同步到唯一运行时 token source；禁止维护两套不同颜色真相。
- 设计稿只约束其声明 coverage；未覆盖状态仍由 Source/Context/DESIGN 控制，不从单张 happy-path 图片外推。

### 6.5 验证体系

缺口：

- root `npm test` 只运行 Context validation。
- CI 只跑 harness gate，没有产品 typecheck、unit、integration、native build 和 E2E。
- Browser UI 验收主要检查文字可见；结构化 probe 可由通用 token runtime 通过。

处置：

- 建立根级 `verify`：format/lint → typecheck → unit → database migration → API integration → provider contract fixture → mobile component → native build → E2E → design/resource integrity。
- 每个 Outcome 至少使用两组 materially different 输入，并验证输出与输入相关。
- 写操作必须检查对应领域表/文件/系统队列/原生 invocation；关闭并重建服务或重启 APP 后读回。
- 失败、超时、拒权、重复、冲突和预算硬停不得显示成功。
- Browser 只证明 Web surface；Android/iOS 必须从安装包真实入口验证。
- UI 操作测试必须跨越 UI → API/domain → sink → reload/restart，而不是只检查 testID。
- Counterfactual 应关闭真实写入、channel、native adapter 或 provider dependency；不能只删除一个文件。
- 视觉验证以 selected design target 为基准，保存实现截图/视频/diff 为 evidence，但实现产物不能为自己授权。

## 7. 目标架构：个人 owner-only 版

```text
Expo React Native APP
├─ Expo Router：五 tab + stack/sheet/沉浸路由
├─ DecisionContext：地点/日期/目标/选中地点/路线/行程 revision
├─ SQLite：偏好、缓存、行程、离线 manifest、队列、历史
├─ FileSystem：离线资产、媒体草稿、导出
├─ SecureStore：owner/device credential、加密 key
└─ Native ports：Location / Map / Sensors / Camera / Notifications / Share
          │
          ▼
Private Fastify API（单实例）
├─ Owner auth 与受保护 API
├─ NightReport / Forecast / Spot / Route / Itinerary
├─ Community / Notification / Admin / Quality
├─ SQLite WAL + RTree + domain repositories
├─ SQLite jobs/outbox + single worker
├─ private content-addressed media store
└─ ProviderGateway + budget/cost/health ledger
          │
          ├─ 非商业个人 POC 数据源（在条款和质量门内）
          ├─ 本地 Astronomy Engine
          ├─ 版本化 VIIRS / DEM / catalog 区域资产
          └─ 地图/路线 adapter；未获准时诚实 disabled/degraded
```

保留未来迁移口：

- SQLite repository → PostgreSQL/PostGIS。
- SQLite jobs → BullMQ/其他队列。
- 私有文件目录 → S3-compatible object storage。
- 单 owner auth → OAuth/多用户。
- 本地/inbox notification → APNs/FCM/厂商通道。

未来迁移口不是当前双写、双部署或第二事实源。

## 8. 补开发工作包

| ID | 工作包 | 主要输出 | 完成证据 |
| --- | --- | --- | --- |
| `DEV-AUTH-001` | Source/设计权威修订 | 修订同一 `docs/source-plan.md`；设计资源 registry；stable Surface/Control/Target key；Context/DESIGN delta 判定 | 所有资源有 disposition/coverage/hash；没有 candidate 冒充 selected target |
| `DEV-NAV-001` | 原生入口与导航 | Expo Router 真正接管 native；五 tab、stack、deep link、back、恢复 | Android/iOS 安装包从冷启动可走所有主页面；移除 Web 路由替代 |
| `DEV-UI-001` | 设计系统与组件 | 唯一 token source；基础/复合控件；planning/night/red-light；动效、无障碍 | 组件状态矩阵、目标截图/交互对比、文本放大/reduced motion/reader 测试 |
| `DEV-STATE-001` | 共享决策上下文 | location/date/profile/target/spot/route/itinerary 单一状态与 stale/invalidation | 地图切主地点或时间后，今晚/详情/计划/天空/摄影/现场一致 |
| `DEV-DATA-001` | 个人版持久化和任务 | SQLite domain schema、migration、repository、job/outbox、backup/restore | 真实实体写入；重建进程后读回；迁移和 restore drill |
| `DEV-COST-001` | 成本与配额硬门 | usage/rate/budget ledger、70/90/100 降级、owner approval、账单回填 | 模拟跨月和重试风暴仍不越过 200；默认 paid=0 |
| `DEV-SOURCE-001` | 数据源管线 | weather ingest、astronomy、VIIRS/DEM/catalog、source provenance/quality | 两地点/两日期真实变化；缺失/过期/许可状态诚实；静态资产可回滚 |
| `DEV-SPOT-001` | 核验地点底座 | 至少 30 个首发 seed spot、设施/开放/风险/图片来源/核验版本 | 地点列表、详情、筛选和推荐从同一持久化事实读取 |
| `DEV-MAP-001` | 地图与路线 | 真实 MapView、图层、marker/sheet、route snapshot、外部导航 | 原生相机/marker/route 交互；provider fail 后缓存/直线降级准确 |
| `DEV-NIGHT-001` | 今晚决策闭环 | 真实 NightReport、主备、窗口、出发/到达、解释和风险 | 两位置/两日期/两 profile 输出不同；报告持久化/重放；安全阻断不可被分数覆盖 |
| `DEV-PLAN-001` | 行程闭环 | 新建/编辑/时间线/路线/版本/分享/候选/离线引用 | 用户真实输入生成计划；重启恢复；冲突/刷新保留用户编辑 |
| `DEV-SKY-001` | 天空与方向 | 天空渲染、时间 scrub、轨迹、FOV、传感器、遮挡、可选 AR | 目标随时间/地点变化；真实 sensor invocation；不支持设备可用 fallback |
| `DEV-SHOOT-001` | 摄影助手 | 设备输入、规则、预设、清单、版本、计划/离线耦合 | 两组器材/条件输出不同；保存/恢复；AI disabled 不影响核心 |
| `DEV-FIELD-001` | 离线现场 | 真离线包、原子激活、队列、红光、停车/备选、安全会话 | 下载实际字节；飞行模式+杀进程后可用；恢复网络只提交一次 |
| `DEV-CONTRIB-001` | 贡献与媒体 | 新地点/实况/评价/纠错表单、选图、EXIF 派生、审核、TTL | 文件 sink 可读回；公开副本无敏感 EXIF；TTL job 不改长期事实 |
| `DEV-NOTIFY-001` | 通知与工具 | subscription/rule/event、local schedule、inbox、deep link、tool algorithms | 真实系统排程/取消或明确拒权；去重、冷却、重启和回执 |
| `DEV-ID-001` | 单 owner 身份与隐私 | device credential/session、SecureStore、导出、删除、retention、审计 | 未授权请求拒绝；导出文件真实；删除任务可恢复且有审计 |
| `DEV-ADMIN-001` | 私有管理面 | 可运行 admin app；地点/来源/成本/任务/审核/规则操作 | owner auth；操作影响真实数据且可预览、回滚、追溯 |
| `DEV-QUALITY-001` | 产品验证与运维 | root verify、CI、native E2E、telemetry、backup/restore、performance | 当前执行产生真实记录；不存在硬编码 RPO/RTO 或“证据文案”替代 |

## 9. 分阶段实施

### Stage 0：修订权威，阻止第三次“按弱验收完成”

范围：`DEV-AUTH-001`。

输出：

- 将本文、两份初版方案、当前变更和设计资源传给 `source-plan-authoring`。
- 修订现有 `docs/source-plan.md`，不创建竞争性 Source Plan。
- 对每个 gap 设 `keep/simplify/replace/defer-current-production-gate` disposition。
- 选择并版本化页面/控件 design target；未选择项保持 decision-required/candidate。
- 解决 runtime token 与 `DESIGN.md` 的漂移。
- 对活动 Delivery Contract 走受保护 authority revision，并替换通用 token/文字可见性验收。

Gate：

- 14 Outcome、16 MVP 项、设计 Surface/Control/Target 和工作包全部有映射。
- 个人试用变化只移除生产门，不削弱机器内功能。
- Contract 的 required native entry、领域 sink、restart readback 和 failure path 已在实现前锁定。

### Stage 1：原生 APP 和 UI 系统

范围：`DEV-NAV-001`、`DEV-UI-001`、`DEV-STATE-001`。

输出：

- Android/iOS 真实原生入口、五 tab、stack/sheet、deep link。
- 页面结构按 selected prototypes；控件按组件状态稿。
- 共享 DecisionContext、数据状态、权限、主题和无障碍基础。
- 先接空/加载/错误/disabled 的真实状态，不用固定成功内容填充页面。

Gate：

- 冷启动能访问所有主 surface；tab 不再只切换壳层文案。
- UI target coverage 的 representative combinations 通过 Android/iOS 检查。
- 设计资源未覆盖处没有被实现自行外推为新视觉 Authority。

### Stage 2：个人版数据、成本和来源底座

范围：`DEV-DATA-001`、`DEV-COST-001`、`DEV-SOURCE-001`、`DEV-ID-001` 的 owner baseline。

输出：

- 单 owner auth、API 安全、SQLite domain repositories、job/outbox、备份。
- ProviderGateway、实际 usage/cost ledger 和硬停。
- 天气、天文、静态数据 pipeline 和 provenance。

Gate：

- 两组真实输入变化、领域持久化、进程重启和预算硬停全部通过。
- 没有直接 provider 调用绕过 cost/quality gate。

### Stage 3：MVP 主闭环

范围：`DEV-SPOT-001`、`DEV-MAP-001`、`DEV-NIGHT-001`、`DEV-PLAN-001` 的 MVP 子集、`DEV-SHOOT-001` 基础预设。

用户旅程：

```text
定位/手动选点与日期
→ 得到真实今晚结论
→ 比较主地点与备选地点
→ 在真实地图查看地点、路线和风险
→ 查看完整地点详情
→ 创建简单行程
→ 发起外部导航
→ 查看手机摄影基础预设
```

Gate：

- 16 项 MVP 中与该旅程相关的前 13 项先达到真实端到端。
- 任何 provider 缺失都有 honest degradation，不回退到固定深圳/西涌样例。
- 计划和选择在 APP/API 重启后保留。

### Stage 4：MVP 贡献、现场反馈和基础质量

范围：`DEV-CONTRIB-001` MVP 子集、`DEV-NOTIFY-001` 本地/inbox、`DEV-QUALITY-001` 基线。

输出：

- 新地点、实况、评价、纠错、媒体和 owner 审核。
- 基础 consent telemetry。
- 本地通知、APP inbox 和出发/窗口提醒。

Gate：

- MVP 16 项全部达到真实端到端。
- 图片、实况、评论有真实输入/sink/重启读取；没有固定 command 结果。
- 根级 CI 对产品代码而非只对 Context 生效。

### Stage 5：V1 完整决策与现场执行

范围：专业 forecast/astronomy、完整 itinerary、`DEV-SKY-001` 通用天空、`DEV-SHOOT-001`、`DEV-FIELD-001`、动态主备和通知。

Gate：

- 小时矩阵、15 日趋势、天空、摄影、离线现场和动态切换共享同一地点/时间/route revision。
- 飞行模式与杀进程恢复通过。
- AI/远端推送/未批准数据源 disabled 不影响 V1 核心。

### Stage 6：V2 私有协作与贡献信任

输出：

- owner/editor/viewer、邀请、WebSocket/游标、字段冲突、装备分工。
- 全景/遮挡、贡献等级、完整评价、热度/拥挤实验。
- 图文导入只接受用户主动输入并逐字段确认。

Gate：

- 至少两个隔离 actor 的真实授权、持久化、断线恢复和冲突测试。
- 仍不开放公众社区或自动抓取。

### Stage 7：V3 专业能力

输出：

- FOV/构图、AR/camera overlay、空间站、流星雨、彗星/极光/日月食、轨迹、计算器、天象日历和内容。

Gate：

- 每项有真实数据/算法、版本、许可、适用范围和 disabled/degraded 状态。
- AR 不成为通用天空的唯一入口；设备不支持时不显示假叠加。

### Stage 8：私有运营、恢复和 owner-usable Final Gate

范围：`DEV-ADMIN-001`、`DEV-QUALITY-001` 完整版。

输出：

- owner-only 管理面、来源/成本/任务/地点/审核/规则治理。
- Android/iOS internal build、备份恢复、trace/metric/log、SLO 基线和完整回归。

Gate：

- 目标资格是 `owner-only personal trial usable`，不是 production release ready。
- ICP、公众商店、商业合同和公众运营保持 future gate。
- Final Gate 后仍需独立对照两份初版方案和当前 Source Plan，不得仅凭 Contract 的 `machine_accepted` 关闭产品目标。

## 10. 必须重写的验收旅程

至少建立以下端到端场景：

1. **两地点/两日期夜报**：深圳与另一经核验地点、今晚与未来日期产生不同天气/天文/主备/窗口；重启 API 后报告可重放。
2. **地图选择一致性**：地图选择 B、切时间，Tonight/Spot/Route/Itinerary/Sky/Shooting/Field 都使用 B 和同一 revision，或明确 stale。
3. **真实路线失败**：真实 adapter 成功时保存路线快照；超时/无 key 时只显示缓存或直线参考，不显示“已规划路线”。
4. **真实行程恢复**：用户填写表单并编辑时间线，关闭 APP/API 后重新打开，内容、版本和离线引用仍存在。
5. **离线文件闭环**：下载实际文件、校验 SHA-256、原子激活，飞行模式和杀进程后仍能看路线/天气快照/天空/清单并记录草稿。
6. **媒体贡献闭环**：选择一张含 EXIF 的测试图片，写入私有 sink、生成去敏派生物、进入审核；重启后原图权限和公开副本仍正确。
7. **本地通知闭环**：订阅后实际调度系统本地通知；修改/取消规则同步取消；拒权时进入 inbox 而不声明系统已送达。
8. **owner auth 与删除**：未授权 API 拒绝；凭据在 SecureStore；导出生成真实文件；删除按 retention 执行并可审计。
9. **成本硬停**：注入费率和调用量到 70/90/100%，观察分级降级；任何并发/重试都不能越过批准预算或自动购买。
10. **设计保真和交互**：按 selected page/control target 覆盖 happy、loading、empty、stale/partial、error、permission-denied、night/red-light、large text、reduced motion；拖拽可中断、返回/焦点正确。

## 11. 风险与待后续 Source Plan 明确的决策

| 风险/决策 | 本方案建议 |
| --- | --- |
| 个人版数据库是否正式用 SQLite 替代 PostgreSQL/PostGIS | 建议当前采用 SQLite/WAL + RTree，保留 repository migration port；需在 Source Plan 中明确批准。 |
| 地图/路线真实 provider | 保持 adapter；先完成一个个人非商业条款和目标区质量合格的真实 POC。没有授权时该能力诚实 disabled，不用假 route 过关。 |
| iOS 构建与真机 | Windows 可完成代码和 Android；iOS internal build/真机仍需可用 Apple build/signing 环境，不能由 Web 或 Android 替代。 |
| 设计资源是否已 selected | 用户满意不等于文件已形成可追溯 selected target；Source authoring 需记录选定依据、hash、coverage 和未覆盖状态。 |
| 全功能范围过大 | 不删除能力，严格按 Stage Gate 先完成 MVP，再进入 V1/V2/V3；禁止并行堆空壳页面。 |
| 数据质量和首发地点 | 先以已批准的深圳/大湾区至少 30 个核验地点形成深覆盖；区域外只给有来源的天气/天文和“地点资料不足”。 |
| 社区/协作与个人使用冲突 | 当前以私有、邀请制、experimental 运行；保留真实多 actor 测试，不启动公众运营。 |
| 备案取消后媒体/分享部署 | 默认不提供公开 CDN/域名；私有文件和可撤销私有链接优先。将来公开再触发新发布权威。 |

## 12. 作为 `source-plan-authoring` 输入的正确方式

后续输入包建议固定为：

1. 两份初版方案原文及哈希。
2. 本补开发方案。
3. 当前 `docs/source-plan.md`，要求“修订同一文件”，不创建第二份 Source Plan。
4. 当前 Context、`DESIGN.md` 和 `docs/technical-data-source-decisions.md`。
5. 设计资源 bundle：
   - 页面原型/高保真稿；
   - 控件/控件组静态状态稿；
   - 动态交互、动效、手势、触觉和状态逻辑；
   - resource manifest：ID、版本、hash、路径、selection status、surface/control/target coverage。
6. 当前实现证据：`main@a88c1b0`、关键 Android 截图和本文件的 gap matrix。

Source authoring 时的 disposition 规则：

- 用户的个人试用/成本/不备案决定是 direct controlling constraint。
- 两份初版方案仍控制完整产品功能，冲突的公开生产拓扑由后续决定覆盖。
- 本文中的代码现状是 derived implementation evidence，不是产品 Authority。
- 本文的架构简化建议是 delegated proposal；涉及 SQLite/PostGIS、provider 和 target selection 的内容需在 Source Plan 中明确采纳或保留 decision-required。
- 设计资源只有在有稳定身份并被选定后才能成为 exact/constraint target；候选图仍是普通 Source。
- 现有实现截图只能作为 before evidence，不能成为自己的设计 baseline。

Source Plan 修订完成后还需要：

- 执行 UI Authority Closure，按 stable Surface/Control/Target key 决定 Context、`DESIGN.md` 和 selected target 的归属。
- 如采纳新的个人版架构，更新 owning Context。
- 对当前活动 Delivery Contract 走 protected authority revision，重写 checks，再实施。
- 不能把“生成了 Source Plan”或“设计稿满意”误报成代码、Contract 或产品完成。

## 13. 最终建议

本次补开发应被视为“从广覆盖 POC/验收载体收敛为真实 owner-usable 产品”，不是普通 UI 换皮，也不是继续补更多证据卡。

正确顺序是：

```text
两份初版方案
+ 当前个人试用变更
+ 本缺口补开发方案
+ 已稳定保存并选定的页面/控件/交互设计资源
→ source-plan-authoring 修订同一 Source Plan
→ UI/Context Authority Closure
→ 受保护的 Delivery Contract revision 与强验收
→ 按 Stage 逐个完成真实产品闭环
```

这个输入组合是正确的。前提是设计资源不能只停留在会话图片，且后续必须修订现有 Source Plan 和活动 Contract，而不是把本文直接当成新的完成权威。
