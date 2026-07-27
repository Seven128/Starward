# Starward 当前实现全量缺口审计

> 审计日期：2026-07-25；Source 元数据刷新：2026-07-26
> 仓库基线：`main@a569b889a2c15b19efc933f774aa0f11848f0528` 加审计前既有工作区
> 产品范围：《今晚去观星》初版产品大纲与初版技术架构的完整目标形态
> 当前交付配置：`individual-personal-trial`，owner-only、非商业内部安装
<!-- ty-source-item:start key=ncomp-gap-audit-not-product-authority-or-proof kind=non_completing -->
> 本文性质：当前实现快照和差距证据，不是产品 Authority、DESIGN Authority、Delivery Contract 或完成证明
<!-- ty-source-item:end -->

## 1. 审计结论

Starward 已经有相当多可复用实现：Expo/React Native 应用、Fastify API、管理端、领域包、SQLite/FileSystem/SecureStore 基础设施、Open-Meteo 非商业 POC、Astronomy Engine、Overpass 地点候选、坐标转换、深链导航、部分传感器调用、设计目标和自动化测试。

但这些实现仍主要是“广覆盖 POC + 可交互验收载体”，没有收敛成从原生根入口可连续使用、由真实用户输入驱动、写入真实领域事实源、重启后可读回、失败时诚实降级、并在目标运行时可反事实验证的完整产品。

严格按初版产品稿和当前 Context 判断：

| 口径 | 当前结果 |
| --- | --- |
| 初版 MVP 16 项 | `0` 项严格端到端完成；`10` 项有真实局部实现；`6` 项仍以固定演示、声明或缺失为主 |
| 系统 14 个 Outcome | `0` 个完成；14 个均存在生产路径、持久化、原生/外部边界或强验证缺口 |
| UI/UX Authority | 14/14 Surface、95/95 Control 已有被 `DESIGN.md` 采纳的设计目标，但生产实现尚未完成 selected-design conformance |
| 设计资源下游闭环 | 唯一 `design-resource-handoff-v1` implementation handoff 已生成并通过 preflight；10 个 mobile blocker item（覆盖 9 个控件）与 12 个 ops backend-authority blocker 仍完整保留 |
| 当前机器验证 | 移动快测、API 测试、native verifier 单测、设计目标校验、管理端构建和 Context 校验通过；完整移动浏览器套件 74 项中 69 项通过、5 项失败 |
| 当前可交付资格 | 产品尚未完成；设计输入已就绪，但尚未创建 Goal、Delivery Contract、生产 owner/path/runner/proof 映射或 Authority Lock |

“0 项完成”不是代码完成度为零。它表示没有一项能力同时满足本文第 2 节的完整闭环标准。

## 2. 完成判定标准

一个功能或 Outcome 只有同时满足以下条件，才可标为完成：

1. **真实入口**：从 Android 原生冷启动根入口可达；iOS 代码、原生工程、适配器和 build readiness 完整。Web、深链 specimen 或独立路由只能作为补充证据。
2. **真实可变输入**：至少两组 materially different 的用户、位置、日期、目标、设备或策略输入能改变结果；不得依赖固定深圳、西涌、固定日期或 demo actor。
3. **生产所有者**：调用当前 profile 的真实 domain service、repository、provider/native port；fixture 必须注入同一个边界，不能取代生产路径。
4. **真实副作用**：写操作落到对应的领域表、文件、系统队列、通知、原生调用或外部 adapter，不以通用 token/receipt 代替。
5. **重启读回**：关闭并重建 API、worker 或 APP 后仍能读回同一业务实体、revision 和结果。
6. **失败与降级**：覆盖拒权、离线、超时、配额、重复、冲突、过期和部分数据；不得用貌似真实的 fallback 值掩盖未知。
7. **可归因验证**：删除输入依赖、真实写入、adapter 调用或 restart readback 后，拥有该能力的 Check 必须失败。
8. **设计一致性**：适用的 selected target、condition 和 verification method 全部映射到生产 owner 与当前候选证据。
9. **目标运行时**：当前 profile 必须有 Android native runtime 证据；浏览器证据不能代替地图、传感器、通知、相机、文件、后台和系统导航行为。

## 3. 审计输入与身份

| ID | 输入 | 当前身份 |
| --- | --- | --- |
| `S-ARCH-INITIAL` | `C:\Users\777\.codex\attachments\c27e0f73-3a63-4355-b713-45759e60fe8e\pasted-text.txt` | 53,663 bytes；SHA-256 `1de938f5a16c1e3040ec967457479031d576b00c25d3b34c85ebb69d555b38b3` |
| `S-PRODUCT-INITIAL` | `C:\Users\777\.codex\attachments\2b04420e-d962-47fb-89bc-bfa9926cb096\pasted-text.txt` | 44,172 bytes；SHA-256 `bd537db472da2b5baa06effc3769b837363e3489901034cb338a30af4a3e62ba` |
| `S-SOURCE-PLAN` | `docs/source-plan.md` | 产品/技术/验收的完整上游 Source Plan；当前实现不因写入计划而完成 |
| `S-CONTEXT` | `project_context/**` | 当前 owner-only profile、预算、产品表面、架构和验证的 durable Authority |
| `S-DESIGN` | `DESIGN.md` | 视觉系统与四个 selected design target 的 canonical adoption record |
| `S-DATA-RESEARCH` | `docs/technical-data-source-decisions.md` | 数据源、许可、成本、POC 和外部门研究；推荐不等于采购或生产批准 |
| `S-IMPLEMENTATION` | `apps/**`、`packages/**`、`workers/**`、`data-pipelines/**`、`tests/**` | 当前代码事实 |
| `S-EVIDENCE` | `artifacts/verification/**` 与本次实际命令 | 有范围和时效的实现证据；不能越界证明未执行行为 |

控制当前交付的后续需求变更：

- 全部外部经常性服务成本硬上限为 CNY 200/月、CNY 2,400/年。
- 未经 owner 逐项批准，实际 paid budget 默认为 CNY 0。
- 当前是 owner-only、非商业个人试用/内部安装。
- ICP、公众商店、公开 CDN、商业合同、公众运营和公众高可用属于未来发布门。
- 这些变更只简化 carrier 和外部发布证明，不删除 MVP/V1/V2/V3 的机器内产品能力。

## 4. 当前架构事实

### 4.1 移动端入口与共享状态

- `apps/mobile/index.js` 注册 `WebApplication`。
- `apps/mobile/src/shell/WebApplication.tsx` 同时维护根 `MobileShellScreen` 和 `/tonight`、`/map`、`/spots`、`/plans`、`/sky` 等 feature route。
- 根五 Tab 只更新并持久化 `activeDestination`；`MobileShellScreen` 在同一个纵向 `ScrollView` 内用 `DestinationContent` 条件替换底部内容。当前没有按页面高度/锚点执行 `scrollTo`，但也没有发生真实 Tab route/Screen 切换，滚动偏移会由同一个容器继承或裁剪。
- Feature Screen 可通过 application-route/deep link 进入，因此“页面存在”和“主产品旅程可达”是两件事。
- 手动地点只保存 label；定位成功仍可能写入“当前位置”与 `0,0`，而多个 Feature Screen 回退到深圳 `22.529,113.9468`。
- `decisionContext`、地图选择和各 Feature Screen 尚未形成 location/date/target/spot/route/itinerary revision 的单一协调状态。

结论：生产入口已建立，但当前是“单页条件换内容 + 分离 feature route”的平行真值。它不符合五个独立一级页面、每 Tab 独立 stack/scroll、原生 Back/deep-link 的已刷新产品与技术契约，不能判为产品导航完成。

### 4.2 API 与 provider 装配

- `apps/api/src/start.ts` 强制当前天气模式为 `noncommercial-poc`，并可通过 Open-Meteo 获取真实 POC 数据。
- 地点候选使用 Overpass HTTP，但 `PocSpotTrustRepository` 仍以当前候选和固定基线生成信任信息。
- AMap route adapter 在当前启动组合中直接抛出 `amap_route_key_not_configured`。
- NightReport 启动时使用 `InMemoryNightReportRepository`；仓库中的 PostgreSQL repository/migration 并未成为当前 profile 的活动事实源。
- identity、itinerary、field、community、tools、admin、quality 路由仍传播 `user-demo`、`admin-demo` 或 `operator-demo`。
- 多个模块通过 `durable-business-runtime` 持久化 command token、payload 和 receipt，但服务读取仍可来自固定内存状态；这不是相应领域实体的持久化。

结论：真实 POC provider 和领域算法可保留，但必须统一经过 ProviderGateway、typed repositories 和 authenticated actor；当前装配不满足该条件。

### 4.3 原生与本地能力

- 外部地图深链包含 WGS84 → GCJ-02 边界，可作为真实局部资产。
- Sky 使用 Expo DeviceMotion/Magnetometer adapter，并持久化部分 resolution；当前天空画布仍是普通 View/Text，不是 GPU/Skia/相机 AR。
- `apps/mobile/src/data/offline/offline-storage.ts` 有 SQLite/FileSystem/SecureStore pack/queue primitives，但没有被生产 Feature Screen 引用。
- 当前无真实 native MapView 依赖；`MapScreen` 的“地图”是 styled View 和 marker card。
- 未形成完整的相机/相册 → 原始文件 → 去敏派生物 → 审核/发布、系统通知 schedule/cancel/receipt、离线包 byte/checksum/atomic activation 生产链。

### 4.4 管理与数据管线

- `apps/admin-web` 已是可构建的 Vite 管理端，不再是“无运行入口”；但数据、命令、授权和审计仍以固定投影为主。
- 静态 ingest、Copernicus、CelesTrak 等代码存在，`source-run.ts` 只执行 quality gate；没有被调度的 VIIRS/DEM/Gaia 真实区域资产发布链。
- 初版技术方案保留 Python 气象/遥感/栅格/地形处理，但仓库当前除 `tools/validate_context.py` 外没有 production Python package、依赖锁或数据 pipeline entry；VIIRS/DEM/catalog 的离线加工环境仍须建立，且不应为了满足技术名词拆成常驻微服务。
- 当前成本配置能拒绝高于 CNY 200 的配置，却没有实际调用事件、费率快照、月累计、70/90/100% 分级、跨月与并发硬停。
- 历史 release/SLO/data integration receipt 多数证明 contract fixture 或实现存在，不能证明生产启动组合和真实外部流量。

## 5. 初版 MVP 16 项差距

状态：

- `partial`：有真实算法、adapter、数据或局部持久化，但不满足完整闭环。
- `demo/missing`：主要由固定场景、通用 receipt、声明或缺失构成。

| # | 初版 MVP 必做项 | 状态 | 可复用实现 | 仍须完成 |
| --- | --- | --- | --- | --- |
| 1 | 当前位置与日期选择 | partial | 权限请求、偏好存储、部分日期控件 | 真实坐标/手动 geocode、观星夜时区、主路径接入、跨页同步、拒权/重启 |
| 2 | 今晚综合结论 | partial | NightReport、天气/天文 POC、规则与证据 | typed repository、真实候选/路线/光污染、用户 profile、重放与主备闭环 |
| 3 | 基础天气 | partial | Open-Meteo POC、normalizer、来源/警告 | ingest/store、目标区质量门、模型/缓存/过期、成本计量与合法降级 |
| 4 | 基础天文 | partial | Astronomy Engine 日月/目标计算 | 完整目标/银河/行星校验、地点时间同步、版本/黄金样本、专业边界 |
| 5 | 光污染地图 | demo/missing | 诚实 unknown 文案 | VIIRS 区域资产、点查询/瓦片/图例、版本/许可/checksum/回滚 |
| 6 | 人工初始观星点 | demo/missing | Overpass 候选 POC | 至少 30 个目标区核验 seed spot、来源/设施/风险/核验版本 |
| 7 | 地点详情 | partial | trust/visibility 规则、HTTP 局部链 | typed durable facts、媒体/地平线/光环境/设施/开放/安全、真实编辑核验 |
| 8 | 地点筛选 | partial | radius 和有限交互 | 天空/路线/设施/适配筛选、地图 camera/marker/sheet 同步、no-results |
| 9 | 地点推荐与理由 | partial | 排序/解释框架 | 地点级真实天气、光污染、路线、遮挡、设施、校准与 profile 权重 |
| 10 | 主地点与备选地点 | partial | NightReport role 投影 | 同一 revision 的地图/详情/路线/行程/现场联动与动态切换 |
| 11 | 外部地图导航 | partial | 高德深链、坐标边界 | 可达触发、真实 route snapshot、设备往返、失败/红光警告 |
| 12 | 简单行程卡片 | demo/missing | revision/conflict 函数、API/Screen 壳 | 用户表单、typed itinerary/stop/timeline 持久化、重启/刷新/冲突 |
| 13 | 手机摄影基础预设 | partial | 确定性规则、本地清单版本 | 真实器材输入、天气/天文/地点耦合、计划/离线引用、校准与稳定幂等 |
| 14 | 上传新地点 | demo/missing | 贡献/隐私纯函数 | 表单/地图选点、相机相册、文件 sink、去敏、typed submission、审核 |
| 15 | 评论、评分与实况 | demo/missing | review/TTL 纯函数 | 用户输入、持久化、现场证据、读取/编辑、TTL worker、纠错升级 |
| 16 | 基础埋点 | demo/missing | consent/telemetry 类型和固定漏斗 | 真实事件 sink、查询、隐私裁剪、留存/删除、可观测产品指标 |

## 6. 14 个系统 Outcome 差距

| Outcome | 当前可复用资产 | 阻止完成的关键缺口 | 第一条完成旅程 |
| --- | --- | --- | --- |
| `mobile-shell-and-preferences` | Expo/RN、偏好 SQLite、权限 gateway、深链 route map | 根 Tab 在同一 `ScrollView` 内条件换内容并与 Feature Screen 脱节；无五个独立 route/screen、每 Tab stack/scroll 恢复；地点坐标不真实；导航/返回/设计一致性不闭环 | 冷启动 → 五个规范根路由 → 独立滚动/栈恢复 → feature → back/deep link → 杀进程恢复 |
| `tonight-decision` | NightReport contract/service、Open-Meteo、Astronomy Engine、安全排序 | 默认坐标、POC 候选、无真实路线/光污染、内存 report、profile/state 未贯通 | 两地点×两日期产生不同结论并持久化重放 |
| `forecast-and-astronomy` | provider normalizer、来源链、日月/目标计算 | ingest/store/quality/cost、15 日/专业矩阵、模型分歧、完整天象与校准 | 改地点/时间后小时曲线与天象同步，离线显示带时效快照 |
| `map-route-discovery` | 坐标转换、Overpass、route contract、外部深链 | 无 MapView；marker/sheet 为 View；route adapter 禁用；状态不同步 | 原生地图选点 → 路线 → 到达/风险 → 外部导航或诚实降级 |
| `spot-detail-and-trust` | disclosure、事实冲突、安全 gate、部分 HTTP | POC repository；无 seed truth、媒体/光环境/地平线/审核实体 | 真实地点从搜索进入详情，编辑/核验后重启读回版本 |
| `itinerary-and-collaboration` | revision/patch/conflict 投影、API/Screen | 固定 `2026-08-12`/西涌/用户；generic receipt；无 typed repository | 用户建计划 → 编辑时间线 → 刷新路线 → 重启恢复 → 冲突处理 |
| `sky-orientation-ar` | Astronomy Engine 位置、Expo sensors、fallback、局部存储 | View/Text 天空、固定 FOV、无星表/GPU/相机 AR、校准/遮挡不足 | 时间 scrub + 方向跟随 + 校准；不支持设备有明确 fallback |
| `shooting-assistant` | 确定性曝光规则、本地 checklist | 设备条件固定、未接行程/离线、幂等 key 与 freshness 冲突 | 两套器材/条件 → 保存版本 → API/APP 重启读回；重复请求稳定 |
| `field-offline-safety` | pack/queue 纯函数、未接入 offline storage primitives | server 固定 bytes/route/session；无真实下载/激活/飞行模式/前后台 | 下载字节 → 校验原子激活 → 飞行模式/杀进程 → 单次 replay |
| `community-contribution` | 贡献/TTL/trust/media sanitizer 纯函数 | 固定命令、无实际 upload/storage/worker/moderation | 含 EXIF 图片 → 私有原图/去敏派生 → 审核 → 重启读取 |
| `notifications-and-toolbox` | batch/dedup/channel policy、工具壳 | 无 subscription 持久化、系统 schedule/cancel/receipt/deep link；固定工具结果 | 建规则 → 系统排程 → 修改取消 → 拒权 inbox → 冷启动 deep link |
| `identity-profile-privacy` | privacy transform、guest merge/session policy | demo actor、无 auth/SecureStore session、导出/删除是投影 | 未授权拒绝 → owner 登录 → 导出真实文件 → 删除 job/审计 |
| `admin-data-operations` | Vite 管理端、admin 纯函数 | 12 控件无真实 auth/authz/endpoints；命令不改真实数据 | owner 登录 → 预览/确认操作 → typed mutation → 回滚/审计读回 |
| `quality-release-observability` | 测试、native verifier、历史 artifacts、telemetry 类型 | 根 verify/CI 不完整；SLO/restore/trace 固定；native/field 证据不足 | 同一候选执行 build/install/journey/restore/telemetry，反事实可归因 |

## 7. UI/UX 与设计资源差距

### 7.1 已经具备

`DESIGN.md` 已正式采纳四个 repo-local target：

| Target | 类别 | Canonical entry | 覆盖 |
| --- | --- | --- | --- |
| `target.mobile-product-pages-v2` | constraint | `docs/design-targets/mobile-product-pages-v2/index.html` | 12 个移动 Surface、五 Tab、主要 mode/state、沉浸 Map/Sky |
| `target.ops-product-pages-v1` | constraint | `docs/design-targets/ops-product-pages-v1/index.html` | 2 个 ops Outcome、7 个 workspace composition |
| `target.mobile-controls-v3` | exact within declared coverage | `docs/design-targets/mobile-controls-v3/implementation-contract.json` | 83 个移动 Control、208 个 scenario、A–F flows |
| `target.ops-controls-v2` | exact within declared coverage | `docs/design-targets/ops-controls-v2/implementation-contract.json` | 12 个 ops Control、32 个 scenario、REV-43 |

`npm run design:targets:verify` 已校验 14 个目标文件、14 个 Outcome、95 个 Control，以及页面/控件集合相等。

`DESIGN.md` 的 parser-readable Design Authority Index/token source 已可发现，`docs/design-resources/starward-residual-implementation-handoff.md` 已形成唯一 strict handoff 并通过 shared preflight。导航修订未发现新的设计 cell：现有 page target 已把 Tonight/Map/Trips/Sky/Me 定义为五个目的地，`primary-tab-bar` exact contract 已要求 route/deep link 和标签内导航状态保留。

### 7.2 仍未关闭的设计下游与运行时缺口

1. 9 个移动控件仍有下游 blocker：
   - `map-filter-sheet`
   - `map-marker-density-surface`
   - `selected-spot-sheet`
   - `spot-media-gallery`
   - `observation-timeline-editor`
   - `sky-time-scrubber`
   - `orientation-follow-toggle`
   - `orientation-calibration-sheet`
   - `ar-mode-toggle`
2. 其中 `spot-media-gallery` 缺合法生产媒体/许可；不能用生成图或样例图伪造真实地点媒体。
3. 其余 8 项主要缺代表设备上的原生 capability、手势物理、系统竞争、触觉、性能或相机/传感器证据，通常是实现与验证缺口，不应无理由再生成一整套重复设计。
4. 12 个 ops 控件全部是 `backend_authority_pending`：需要真实 endpoint、auth、authorization、confirmation、idempotency、audit、rollback 和 recovery 行为。
5. 五个独立一级页面当前是实现与原生运行验证缺口，不是视觉资源缺口；现有冻结 target 不得因为生产代码落后而被改写。

### 7.3 本次导航修订的 design-resource 处置

- 不生成新页面、wireframe、高保真候选或新 Tab 样式；继续采用四个 immutable target。
- 刷新 residual handoff 中 `dr-control-primary-tab-bar` 的产品 lineage，加入五个规范根路由、独立 Screen、每 Tab stack/scroll、deep-link/back 语义。
- 刷新本次已修改 Source/Context/方案文件的 digest，不改变 selected target identity、locator、condition、八维 coverage 或 blocker 集合。
- 重新运行 `ty-context design-resource preflight docs/design-resources/starward-residual-implementation-handoff.md`；只有 preflight 新发现未定义设计 cell 时才允许窄范围 grouped study。

## 8. 数据、成本与安全差距

### 8.1 CNY 200/月不是一个配置常量

完整预算实现必须包含：

- `provider_usage_event`：provider、capability、request class、units/bytes、retry、cache hit、成功/失败、发生时间。
- `provider_rate_snapshot`：费率、币种、税费/出网/存储假设、有效期、来源。
- `provider_budget_month`：批准预算、已发生、已承诺、预估、月份、时区、结转状态。
- `provider_gate`：capability/provider 的启用、POC、disabled、contract gate、budget gate。
- `provider_health`：质量、延迟、错误、数据时效和目标区适用性。
- 70%：停止非必要预热/刷新。
- 90%：关闭可选多模型、动画图层和自动媒体同步。
- 100%：原子阻断所有新增付费调用，只允许合法缓存、本地计算或 `unknown`。
- 并发、重试、跨月、延迟账单和费率变更不得穿透硬停。
- paid budget 默认 0；预算内购买、升档、第二付费源仍需 owner 逐项批准。

当前实现仅覆盖配置上限和部分 provider mode，尚无上述运行闭环。

### 8.2 当前允许的低成本路径

- 天文：Astronomy Engine 本地计算；需要外部 catalog 时采用版本化、可追溯区域资产。
- 天气：Open-Meteo 只作为非商业 POC，必须保留条款、来源、质量和降级标记；不得自动视为长期生产授权。
- 光污染/DEM/星表：下载允许的区域静态资产，checksum/content-addressed 保存，运行时本地查询。
- 地图/路线：通过 adapter 隔离；未取得合法凭据/配额时可 disabled 或只显示直线参考，不能伪装路线。
- 媒体：当前使用私有文件目录，不预建公众 CDN。
- 通知：MVP 优先本地通知和 APP inbox，不以付费推送通道阻塞个人试用闭环。

### 8.3 身份、安全和隐私

当前固定 actor 和匿名 API 必须被替换为 owner/device credential、可撤销 session、对象/字段授权、幂等/重放保护、限流和审计。位置、原始 EXIF、secret、导出、删除墓碑、备份和恢复必须有明确 owner；公众 WAF/MFA 可保持 future gate，但不能成为匿名危险操作的理由。

## 9. 本次执行证据

| Check | 结果 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| `npm run test:mobile:fast` | 通过；17 files / 29 tests | 移动 TypeScript 与局部逻辑 | 原生入口、MapView、传感器/通知/相机、完整旅程 |
| API TypeScript + Vitest | 通过；25 files / 85 tests | API/domain 局部逻辑和 contract | 当前 startup 的 typed persistence、真实 auth/provider/worker |
| `npm run test:verification:fast` | 通过；12 tests | native verifier 指纹/缓存/preflight 局部规则 | Release 安装与全部 Outcome native 行为 |
| `npm run design:targets:verify` | 通过 | 4 target、14 Outcome、95 Control 的静态完整性 | 生产 UI 保真或设备行为 |
| `apps/admin-web` build | 通过 | Vite 管理端可编译 | 真实受保护 endpoint 和 mutation |
| `npm run context:validate` | 通过 | Context 图可恢复 | 产品实现或验收 |
| `npm run context:doctor` | 完成；有 advisory | harness 安装健康；发现 Design Index/token source discoverability 与 Context footprint 提示 | advisory 本身不证明设计或产品失败 |
| `npm run test:acceptance:mobile` | 69/74 通过；5 个 shooting case 失败 | 大部分浏览器旅程可运行；暴露真实重试/隔离缺陷 | native runtime 或全产品完成 |

5 个 shooting 失败的直接原因：

- `shooting-assistant.sqlite` 保留了前一次中断/运行的数据。
- idempotency key 只按 weather run、location 和取整 scheduled hour 构造。
- input digest 又包含不断变化的 `conditionsCapturedAt`。
- 后一次请求命中同 key、不同 digest，触发 `runtime_idempotency_conflict`，HTTP 500，UI 显示“拍摄条件暂不可用”。
- acceptance lifecycle 没有给每次运行设置独立 `STARWARD_DATA_DIR` 或显式 reset。

这是一个必须修复的重试/重启语义和测试隔离缺口，不是简单增加等待时间即可解决的 flaky test。

## 10. 历史证据的适用边界

- `artifacts/verification/android/android-emulator-evidence.json` 只证明 2026-07-20 的根 shell、静态地图占位和有限冷启动；不是实际 MapView、离线、provider 或真实设备证明。
- `artifacts/verification/release-matrix.json` 仍有 native/field pending 且测试计数已过期。
- `artifacts/verification/slo-report.json` 的生产 measurement 仍 pending。
- `artifacts/verification/production-data-integration.json` 主要证明 contract fixture/carrier，`production traffic=false`；其中“complete product implementation path”不能按字面外推。
- `artifacts/verification/dependency-audit.json` 记录 10 个 moderate、上游 build-time advisory；需要在交付前处置或建立有界例外。
- 旧 `tmp/ty-context/long-task-runs/starward-complete-react-native-app/` 不是当前活动 Authority；历史 `machine_accepted`、receipt 或 Progress 不得复用为本次完成证据。

## 11. 缺口优先级

### P0：实施前必须保持或关闭

- 保持现有 residual design handoff 与当前 Source/Context digest 一致，并在每次权威修订后重新通过 design-resource preflight。
- 保持 `context:doctor` 可定位 canonical Design Authority Index/token source；不得建立第二 Authority。
- 以五个独立根 route/Screen 修正根 Tab → Feature Screen 的真实导航：每 Tab 独立 stack/scroll，禁止共享 `ScrollView`/锚点/条件伪页面，并接入单一 DecisionContext。
- 明确每个 Outcome 的 typed owner、repository、job/native/provider boundary。
- 建立 owner auth、环境/数据隔离、稳定 idempotency 和真实预算硬停。
- 为后续 Long-Task Contract 建立 14 Outcome 的 surface bindings、root-entry journey、verification method 和 blocker lineage。

### P1：形成完整 MVP

- 真实地点/观星夜、天气/天文 ingest、核验 seed spot、VIIRS、地图/路线、NightReport。
- 地点详情/筛选/主备、简单行程、外部导航、基础摄影。
- 新地点/评论/评分/实况、基础 consent telemetry。
- 全部能力具备 typed persistence、重启读回、失败/降级和 Android native evidence。

### P2：完成 V1

- 15 日/专业预报、完整天象、完整行程、动态主备。
- 天空/方向/FOV、摄影助手、离线现场、安全会话、真实通知。

### P3：完成 V2/V3 与 owner 运维

- 私有协作、贡献信任、遮挡/全景、装备共享、导入。
- AR、专业天象、轨迹、计算器、日历和内容。
- owner 管理、数据管线、成本、备份恢复、观测性、release matrix。

### Future external gates

ICP、公众域名/CDN、商店发布、商业合同、公众社区运营、多区域/多副本、完整 iOS 运行证明、法务/专家/代表性户外背书可以保持 pending；状态必须明确，不能伪造成通过。

## 12. 信息索引

### 产品与技术 Authority

- `docs/source-plan.md`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/main.md`
- `project_context/areas/main/product-surface-contract.md`
- `project_context/areas/main/screen-contracts.md`
- `project_context/areas/main/verification.md`
- `DESIGN.md`
- `docs/technical-data-source-decisions.md`

### 生产入口

- Mobile：`apps/mobile/index.js`、`apps/mobile/src/shell/WebApplication.tsx`
- Root shell：`apps/mobile/src/shell/MobileShellScreen.tsx`
- Route/deep link：`apps/mobile/src/shell/application-route.ts`
- API：`apps/api/src/start.ts`、`apps/api/src/feature-routes.ts`
- Admin：`apps/admin-web/src/main.tsx`
- Offline primitives：`apps/mobile/src/data/offline/offline-storage.ts`
- Generic runtime：`packages/contracts/src/runtime/durable-business-runtime.ts`

### 设计资源

- `docs/design-targets/mobile-product-pages-v2/`
- `docs/design-targets/mobile-controls-v3/`
- `docs/design-targets/ops-product-pages-v1/`
- `docs/design-targets/ops-controls-v2/`

### 验证入口

- `package.json`
- `tests/acceptance/playwright.mobile.config.mjs`
- `tests/acceptance/mobile.spec.mjs`
- `tools/verification/`
- `artifacts/verification/`

## 13. 审计关闭条件

本文的差距审计在以下意义上完成：初版 16 MVP、14 Outcome、横切架构、UI/UX、数据/成本、安全、验证和外部门均有当前证据与 disposition。`verification.md` 当前超过 doctor 的 16 KiB 单文件 soft budget；这是非阻断维护项，只能在不丢失 required facts、owner 和读取路径的前提下后续拆分。

它不表示产品已完成。下一份控制实施顺序与验收的文档是 `docs/architecture/gap-driven-supplemental-development-plan.md`；现有 residual handoff 在每次 Source/Context 权威修订后须刷新 digest 并通过 preflight，之后才可显式启动一次新的 Single-Goal Long-Task Contract authoring。
