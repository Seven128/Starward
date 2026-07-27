# Starward 全量补开发方案

> 方案版本：2026-07-26 navigation refresh
> 仓库基线：`main@a569b889a2c15b19efc933f774aa0f11848f0528` 加方案编写前既有工作区
> 目标：在当前已有实现上，完成《今晚去观星》初版产品大纲和技术方案的全部机器内产品能力
> 当前 profile：`individual-personal-trial`，owner-only、非商业内部安装
> 外部服务硬上限：CNY 200/月、CNY 2,400/年；未经逐项批准 paid budget 为 CNY 0
<!-- ty-source-item:start key=ncomp-supplemental-plan-not-contract-or-proof kind=non_completing -->
> 本文性质：实施 Source 和架构/验收编排，不是 Design Authority、Delivery Contract 或完成证明
<!-- ty-source-item:end -->

## 1. 方案结论

这次工作不应做成“补几个页面”或“把现有 demo 连起来”，也不应重写整个仓库。正确目标是：

> 保留当前可复用的领域算法、provider adapters、设计目标、测试和个人版基础设施，清除平行入口、固定场景、通用 receipt 和代理证据，把 14 个 Outcome 逐个收敛成从原生入口可达、真实输入驱动、typed persistence、重启可恢复、失败诚实、设计可核对的产品闭环。

完整交付包括：

- 初版 MVP 16 项全部完成。
- V1、V2、V3 的全部产品能力按原顺序完成。
- 当前个人试用版不预建公众生产基础设施，但保留明确迁移 ports 和 future gates。
- 14 个 Surface、95 个 Control 按已采纳设计目标实现。
- Android 是当前 required native runtime；iOS 的代码、原生工程、适配器和 build readiness 必须完成，iOS live build/runtime 证据保持显式 deferred/unverified。
- 任何外部服务都不能绕过 CNY 200/月硬停、paid=0 默认和 owner approval。

当前严格基线见 `docs/architecture/implementation-gap-audit.md`：

- 16 MVP：0 complete / 10 partial / 6 demo-or-missing。
- 14 Outcome：0 complete。
- 设计 Authority：14/14 Surface、95/95 Control 已覆盖；residual handoff 已建立并通过 preflight，仍缺下游 blocker closure 与生产实现一致性。
- 完整移动浏览器验收：69/74，通过之外的 5 项均暴露 shooting idempotency/数据隔离缺陷。

## 2. 成功定义与非目标

### 2.1 最终成功定义

补开发完成时，owner 可以从安装后的 Android APP 冷启动完成以下完整闭环：

```text
设置个人偏好、设备、出行条件
→ 使用真实位置或手动地点和观星夜
→ 得到可解释的今晚结论、小时条件、天文窗口与主备地点
→ 在真实地图比较地点、筛选、路线、到达和风险
→ 查看地点详情并创建、编辑、离线保存行程
→ 到现场使用离线包、红光、天空方向、摄影参数和安全工具
→ 提交地点、实况、评价、纠错和媒体
→ 订阅提醒并在个人中心管理设备、内容、导出和删除
→ owner 在受保护管理面治理地点、来源、成本、任务、审核、质量和恢复
```

每一步必须有：

- 两组以上可变输入；
- 明确的 product/domain owner；
- typed state transition 或真实 adapter invocation；
- 对应 SQLite/文件/系统/外部 sink；
- restart readback；
- loading/empty/stale/degraded/error/permission-denied；
- duplicate/idempotent retry 和 conflict；
- 可使拥有该行为的 Check 失败的 counterfactual。

### 2.2 当前不要求证明

以下不是当前 owner-only 完成条件，但必须以 `pending`、`deferred` 或 future profile 明示：

- ICP 备案、公众域名和公众 CDN。
- App Store/公众应用商店生产发布。
- 商业合同、公众隐私政策签署和面向公众的运营证明。
- 多区域、多副本、WAF、公众高可用和自动扩容。
- 公众社区审核人力与大规模反滥用。
- 代表性 iOS live build/runtime、完整户外或专家背书。

### 2.3 禁止被简化掉

- 原生根入口、导航、共享状态和返回/深链。
- 地图、定位、传感器、通知、相机/相册、文件、分享等真实 native port。
- typed domain persistence、migration、job/outbox、backup/restore。
- 天气/天文/地点/路线/光污染的数据 lineage、质量、时效与诚实降级。
- 位置、坐标、时区、观星夜、隐私、EXIF、secret 和删除边界。
- 成本调用台账与 70/90/100% 硬门。
- selected-design conformance 和强验收。

## 3. 输入、优先级与可追溯性

### 3.1 直接输入

| ID | 路径 | SHA-256 | 作用 |
| --- | --- | --- | --- |
| `S-ARCH-INITIAL` | `C:\Users\777\.codex\attachments\c27e0f73-3a63-4355-b713-45759e60fe8e\pasted-text.txt` | `1de938f5a16c1e3040ec967457479031d576b00c25d3b34c85ebb69d555b38b3` | 完整技术目标、模块、数据、部署、测试和工程顺序 |
| `S-PRODUCT-INITIAL` | `C:\Users\777\.codex\attachments\2b04420e-d962-47fb-89bc-bfa9926cb096\pasted-text.txt` | `bd537db472da2b5baa06effc3769b837363e3489901034cb338a30af4a3e62ba` | 完整产品目标、用户、场景、页面、MVP/V1/V2/V3 和指标 |
| `S-SOURCE-PLAN` | `docs/source-plan.md` | 以当前文件为准 | 已细化的产品/技术/验收 Source，稳定 requirement/obligation/acceptance 索引 |
| `S-GAP-AUDIT` | `docs/architecture/implementation-gap-audit.md` | 以本次刷新文件为准 | 当前实现证据、0/10/6 和 14 Outcome 差距 |
| `S-DATA-RESEARCH` | `docs/technical-data-source-decisions.md` | `30ae0a0968260b4dc5a62fb8d3d2909b3b5578d1f16ca0b6368aa00b99a57e64` | 官方/一手数据源、许可、质量、成本和门 |
| `S-CONTEXT` | `project_context/**` | 各文件独立 | durable profile、产品表面、架构和验证边界 |
| `S-DESIGN` | `DESIGN.md` | `b973880891c71d5242f9263ef88b2a7196c2ba189372da17ee4cdac06f352106` | visual system 和 selected target canonical registry |

### 3.2 决策优先级

1. 用户后续明确的 owner-only、CNY 200/月、paid=0 默认和当前不做公众发布，高于初版方案中冲突的商业/公开拓扑。
2. `project_context/**` 控制 durable profile、surface ownership、架构和验证边界。
3. `docs/source-plan.md` 控制完整产品含义、MVP/V1/V2/V3 和可观察验收。
4. `DESIGN.md` 控制系统 token 与 selected target adoption；Screen Contracts 控制页面/控件 ownership。
5. 初版产品/技术方案保留所有未被后续决定覆盖的需求。
6. 当前代码只说明“现在是什么”，不能反向删需求。
7. 本方案的 carrier/顺序选择是当前交付提案；若改变 durable 语义，先更新 owning Context。

### 3.3 Disposition 词汇

| Disposition | 含义 |
| --- | --- |
| `keep` | 当前实现/架构可直接保留并强化 |
| `integrate` | 代码存在但未进入真实生产路径 |
| `replace` | 固定、平行、通用或错误 owner 必须替换 |
| `simplify-current-profile` | 当前个人版使用更小但真实的 carrier |
| `defer-external-gate` | 只延期外部证明，不删除实现义务 |
| `remove-debt` | 删除第二真值、死入口、误导 receipt 或重复壳 |

## 4. 产品范围完整性

### 4.1 初版 MVP 16 项

全部 16 项必须在 Stage 4 结束前达到严格端到端完成：

1. 当前位置与日期/观星夜。
2. 今晚综合结论。
3. 基础天气。
4. 基础天文。
5. 光污染地图。
6. 人工核验的初始观星点。
7. 地点详情。
8. 地点筛选。
9. 地点推荐与理由。
10. 主地点与备选地点。
11. 外部地图导航。
12. 简单行程卡片。
13. 手机摄影基础预设。
14. 上传新地点。
15. 评论、评分与现场实况。
16. 基础 consent telemetry 和核心漏斗。

逐项当前证据与缺口由 `docs/architecture/implementation-gap-audit.md#5-初版-mvp-16-项差距` 控制；实施不得只更新该表的状态，必须执行拥有该项的 Outcome Checks。

### 4.2 V1

Stage 5 完成：

- 完整小时预报、多模型、15 日、昼夜/蒙影、地图型气象数据。
- 完整路线/行程、动态主备、现场模式和离线包。
- 360°通用天空、时间 scrub、现场方向、轨迹、FOV。
- 手机与相机摄影助手、版本化预设和清单。
- 出发/窗口/风险通知。

### 4.3 V2

Stage 6 完成：

- 私有邀请协作、复制/分享、多人装备分工。
- 全景/地平线/遮挡。
- 贡献等级、可信度、评价与纠错。
- 拥挤/热度实验。
- 用户主动导入图文并逐字段确认。

公众社区和大规模运营保持 future external gate；功能本身在隔离的多 actor 环境中真实运行。

### 4.4 V3

Stage 7 完成：

- 可选相机 AR、FOV/构图。
- ISS/卫星、流星雨、彗星、极光、日月食。
- 天体轨迹、天象日历、位置/摄影/天文计算器。
- 分层教育内容。

每项必须声明数据源/算法版本、适用范围、质量和 unavailable/degraded；“AI 推荐”只可解释确定性规则或经明确批准的模型，不能成为核心正确性 owner。

### 4.5 14 Outcome 交付索引

| Outcome | 版本责任 | 主要工作包 | 首个 owning Stage | 最终闭环重点 |
| --- | --- | --- | --- | --- |
| `mobile-shell-and-preferences` | MVP foundation | NAV、UI、STATE、ID | 1 | 原生根入口、偏好/权限、五入口、恢复 |
| `tonight-decision` | MVP | SOURCE、SPOT、MAP、NIGHT | 3 | 两地点/日期/profile、主备、窗口、风险、持久化 |
| `forecast-and-astronomy` | MVP→V1→V3 | SOURCE、NIGHT、SKY | 2 | 天气/天文 lineage、小时/15日、专业天象 |
| `map-route-discovery` | MVP→V1 | STATE、SPOT、MAP | 3 | MapView、筛选、marker/sheet、路线/导航 |
| `spot-detail-and-trust` | MVP→V2 | SOURCE、SPOT、CONTRIB | 3 | seed facts、详情、核验、媒体/遮挡/信任 |
| `itinerary-and-collaboration` | MVP→V2 | PLAN、ID、FIELD | 3 | 用户创建、revision、offline、分享/协作/冲突 |
| `sky-orientation-ar` | V1→V3 | SKY、SOURCE、UI | 5 | 天空、time scrub、方向、FOV、AR/fallback |
| `shooting-assistant` | MVP→V1 | SHOOT、NIGHT、PLAN | 3 | 器材/条件、规则版本、幂等、保存/离线 |
| `field-offline-safety` | V1 | FIELD、PLAN、MAP | 5 | bytes/checksum/activation、飞行模式、红光/安全 |
| `community-contribution` | MVP→V2 | CONTRIB、SPOT、ID | 4 | 地点/实况/评价/纠错/媒体/审核/TTL |
| `notifications-and-toolbox` | MVP→V3 | NOTIFY、SOURCE、PLAN | 4 | rule/event/schedule/cancel/receipt、专业工具 |
| `identity-profile-privacy` | MVP foundation | ID、DATA | 2 | owner auth、session、设备/内容、导出/删除 |
| `admin-data-operations` | 全阶段支撑 | ADMIN、COST、SOURCE、CONTRIB | 2/8 | protected endpoint、真实 mutation、回滚/审计 |
| `quality-release-observability` | 全阶段支撑 | QUALITY + all | 0/8 | 当前候选 verification、native、restore、SLO/trace |

## 5. 初版技术方案完整映射

| 初版技术域 | 当前交付选择 | 主要工作包 | 当前缺口关闭标准 |
| --- | --- | --- | --- |
| 架构总论 | Expo/RN + Fastify 模块化单体；不双端纯原生、不微服务起步 | NAV、DATA、QUALITY | 单一生产入口/事实源，module/port 边界可验证 |
| 移动技术栈/分层 | 保留 Expo/RN/TS、自定义 native modules；统一 navigation/state/data layers | NAV、UI、STATE | 根入口可达、依赖方向正确、无平行 route/state |
| 本地存储 | Expo SQLite + FileSystem + SecureStore | DATA、FIELD、ID | schema/migration、加密/权限、restart readback |
| 离线现场包 | manifest + byte assets + checksum + atomic activation + replay queue | FIELD | 飞行模式/杀进程可用，恢复只 replay 一次 |
| 定位/后台 | foreground location；后台能力按安全需要和平台许可 | NAV、STATE、FIELD | 真坐标、拒权/精度/过期、前后台 lifecycle |
| 指南针/方向 | Expo sensors + platform adapter + calibration | SKY | 原始读数、精度、校准、降级和设备证据 |
| 360 天空/AR | 通用天空必须；AR 作为 capability-gated 增强 | SKY | GPU/Skia 或等价、星表/FOV/时间/方向；相机 AR 或 honest fallback |
| 地图 | 原生地图 adapter；当前 profile 只启用合法可用 provider | MAP | 真 MapView/camera/marker/cluster/sheet/route |
| 坐标 | WGS84 domain truth，GCJ-02 只在 provider boundary | MAP、DATA | 存储/API 不混坐标，往返误差和标记可观测 |
| 空间数据 | SQLite RTree/区域资产；PostGIS 为 future repository port | DATA、SPOT、MAP | 目标区查询、索引、迁移、备份；无双写 |
| Identity/Profile | 单 owner/device credential，可撤销 session | ID | authn/authz、SecureStore、未授权拒绝、actor 真实传播 |
| Spot | typed spot/fact/status/media/horizon/verification | SPOT、CONTRIB | seed/编辑/审核/版本/坐标披露/重启 |
| Weather | ProviderGateway + normalized model + local durable cache | SOURCE | 质量/来源/时效/成本/失败/目标区验证 |
| Astronomy | Astronomy Engine + versioned catalogs | SOURCE、SKY | 黄金数据、地点/时区/观星夜、目标/银河/天象 |
| Geo environment | VIIRS/DEM/horizon region assets | SOURCE、SPOT、MAP | checksum/carrier/许可、点查询/图层/回滚 |
| Route | route adapter + snapshot/cache + external handoff | MAP | 成功/超时/无 key/缓存/直线参考语义分离 |
| Recommendation | deterministic layered scoring + hard blockers | NIGHT | 输入 lineage、profile 权重、解释、counterfactual |
| NightReport | immutable typed aggregate + durable repository | NIGHT | 两地点/两日期、重放、主备/路线/风险一致 |
| Itinerary/Collaboration | typed revision/event/patch；V2 private realtime | PLAN | 用户输入、持久化、offline、冲突、多 actor |
| Field Report | 长期事实与临时实况分离，TTL job | CONTRIB、FIELD | expiry 不污染长期事实，重启/worker/审计 |
| Shooting | deterministic versioned rules，AI 只解释 | SHOOT | 器材/条件耦合、稳定幂等、保存/恢复/校准 |
| Notification | subscription/rule/event/delivery receipt | NOTIFY | local schedule/cancel、inbox、deep link、去重/冷却 |
| Admin | 当前采用 Vite owner SPA + protected Fastify API；不为无 SSR 需求强换 Next | ADMIN | 真实 endpoint/authz/mutation/audit/rollback |
| 数据源 | 以 `technical-data-source-decisions.md` 的许可/质量/成本门为准 | SOURCE、COST | 真实或合法 POC；每个来源有 lineage 和退出策略 |
| 核心数据模型 | typed entities + UTC/IANA/WGS84/version/provenance | DATA + 全域 | schema/API/state 一致，generic receipt 不代替实体 |
| 推荐/指数 | hard blocker → window → layered score → explanation | NIGHT | 安全不可被总分覆盖；unknown 不变成 0/好 |
| API 聚合 | REST/OpenAPI；V2 collaboration 可用 WS | DATA + 各域 | typed error/data status/idempotency/authorization |
| 缓存 | device/memory/SQLite/static asset 四层按事实 owner | DATA、SOURCE | TTL/version/stale、stampede protection、非唯一真值 |
| 采集/调度 | SQLite job/outbox + 单 worker/system scheduler | DATA、SOURCE | lease/retry/backoff/dedup/dead-letter/replay |
| 图片/全景/EXIF | 私有 content-addressed file store | CONTRIB | 原图保护、扫描、派生、EXIF policy、失败恢复 |
| 环境/部署 | dev/test/owner-internal 隔离；单实例私有部署 | QUALITY | 独立 DB/file/secret/ports、可备份恢复 |
| 生产拓扑 | CDN/WAF/LB/PostGIS/Redis/S3/多副本 deferred | QUALITY | migration ports + triggers；当前无双部署 |
| 构建发布 | Android internal required；iOS build-ready | NAV、QUALITY | reproducible build、signing boundary、cold start、rollback |
| 安全隐私 | owner credential、least privilege、coordinate/EXIF/secret policies | ID、CONTRIB、ADMIN | authz、audit、export/delete、TLS 非 loopback |
| 可观测/质量 | trace/metric/log + provider/data quality + replay | QUALITY | 真实 sink 与 measured result；不硬编码“passed” |
| 测试体系 | unit/contract/integration/browser/native/device/restore/counterfactual | QUALITY | 同一候选、可归因、失败路径和目标运行时 |
| 性能 | 以可测目标和代表设备建立基线 | QUALITY | start/map/sky/sheet/offline/battery 指标与退化门 |
| 技术风险 | 天气、光污染、坐标、时区、指南针、Android fragmentation、地点失真、lock-in、复杂度 | 全域 | 每项 owner、监测、降级、测试与退出策略 |
| Monorepo/顺序 | 保留当前 workspace，按依赖层和垂直 Outcome 交付 | AUTH、QUALITY | 一条 Contract、无第二调度/权威 |

## 6. 目标架构

### 6.1 总图

```text
Expo React Native APP
├─ one native root navigation
│  ├─ persistent Tabs: /tonight /map /trips /sky /me
│  ├─ one nested Stack + scroll/canvas owner per Tab
│  └─ route-owned sheet / immersive routes / deep links / native Back
├─ DecisionContext
│  └─ origin + observingNight + moment + target + selectedSpot
│     + primary/backup + route + itineraryRevision + freshness + risk
├─ query/cache adapters
├─ Expo SQLite + FileSystem + SecureStore
└─ Native ports
   ├─ Location / Map / Sensors / Camera / Notifications
   └─ Share / File / Background lifecycle
             │
             ▼
Private Fastify modular monolith
├─ owner auth and protected APIs
├─ typed domain modules and repositories
├─ SQLite WAL + RTree
├─ SQLite jobs/outbox + one worker
├─ private content-addressed files
├─ ProviderGateway
│  ├─ quality / provenance / cache / retry
│  └─ usage / rate / monthly budget / 70-90-100 gate
└─ admin/observability/backup endpoints
             │
             ├─ legal noncommercial POC providers
             ├─ local Astronomy Engine
             ├─ versioned VIIRS/DEM/catalog assets
             │  └─ locked Python offline processing toolchain
             └─ disabled/degraded adapters when gates are unmet
```

### 6.2 Architecture Decisions

#### ADR-SUP-01：保留模块化单体

- 选择：Fastify modular monolith。
- 原因：当前规模和预算不需要微服务；同进程仍可通过 domain/repository/job/provider ports 隔离。
- 拒绝：为了贴合初版生产拓扑而预建 Kafka/Kubernetes/多服务。
- 迁移触发：有测量的 CPU/内存/吞吐或故障隔离需求。

#### ADR-SUP-02：当前服务端事实源用 SQLite

- 选择：SQLite WAL + RTree + private file store。
- 原因：个人 owner-only、低并发、CNY 200 上限；可真实持久化、事务、备份和恢复。
- 约束：每个领域有 typed repository/migration；禁止 generic token 充当领域事实；禁止与 Postgres 双写。
- 迁移触发：多人并发、空间查询/写入、可用性或数据量达到已测阈值。

#### ADR-SUP-03：统一原生导航而非重写 UI 栈

- 选择：保留现有 Expo/RN app，以 Source Plan 已批准的 Expo Router Tabs（或同等 native-backed navigator）将 root Tab、Feature Screen、deep link 合并成一个 route graph；规范根路由固定为 `/tonight`、`/map`、`/trips`、`/sky`、`/me`，每个 Tab 拥有独立 Stack 和主滚动/沉浸画布状态。
- 状态边界：共享 DecisionContext 位于 navigator 外部；每 Tab 的 nested route、scroll/canvas position 属于 navigator/route owner。现有 route store/`activeDestination` 只可作为有期限的迁移或恢复 adapter，完成后不得继续拥有第二套路由或页面身份真值。
- Back/deep link：深链先激活归属 Tab 再进入嵌套路由；Back 先关闭 route-owned layer，再弹出该 Tab 栈。Tab 切换不生成跨 Tab Back 历史；旧 `/plans` 仅可临时重定向到规范 `/trips`。
- 禁止：同时保留 `MobileShellScreen` 静态 destination 与另一套 feature pathname 作为两个产品入口；禁止在共享根 `ScrollView` 中按高度/锚点滚动或条件替换内容来模拟五个页面。

#### ADR-SUP-04：ProviderGateway 是唯一外部调用边界

- 任何 provider 请求必须经过 permission/contract、quality、rate、budget、cache、retry、provenance 和 health。
- 直接 `fetch` 只允许在 gateway adapter 内。
- 静态数据下载也写 usage/lineage，免费不等于零成本。

#### ADR-SUP-05：WGS84 和观星夜是 domain truth

- 所有位置存 WGS84；GCJ-02 只在高德等 provider boundary 转换。
- 所有事件存 UTC + IANA timezone + observing-night identity。
- 跨午夜、DST/时区、到达时间和月相窗口不能只存 display date。

#### ADR-SUP-06：Vite owner admin 保留

- 当前 profile 不需要 SSR；现有 Vite SPA 可满足 owner operations。
- 初版 Next.js 被替换为“可运行 owner web surface + protected API”的功能目标。
- 未来公众运营或 SSR/edge/auth 框架需求出现时再评估迁移，不双建管理端。

#### ADR-SUP-07：AI 不是产品正确性 owner

- 今晚结论、评分、窗口、路线风险、摄影参数和安全规则保持确定性、版本化和可解释。
- AI 只能在有批准的成本/隐私/质量门时解释或生成可编辑建议。
- AI unavailable 不得阻塞核心闭环。

#### ADR-SUP-08：Python 只拥有重数据加工边界

- 初版技术方案中的 Python 用于 VIIRS/DEM/catalog、栅格/CRS、地形/遮挡和需要相应生态的离线批处理。
- 建立锁定依赖、可复现 CLI/job entry、fixture/golden、input/output manifest 和 checksum；产物进入同一 content-addressed asset release。
- 在线 API/domain 继续由 TypeScript/Fastify 拥有；没有测量的隔离需求时，Python 不成为第二业务服务或第二事实源。

### 6.3 未来变化挑战

若未来转为多人公开商业版：

- repository port 可从 SQLite 切 PostgreSQL/PostGIS；
- job port 可切 BullMQ/托管队列；
- storage port 可切 S3-compatible object storage/CDN；
- owner auth 可切 OAuth/OTP/MFA；
- notification channel 可切 APNs/FCM/国内厂商；
- deployment 可加 WAF/LB/multi-replica。

迁移必须通过一次新的 profile authority 和数据迁移/回滚验证；当前不预建第二事实源。

## 7. 数据、状态与生命周期

### 7.1 单一 DecisionContext

最小协调字段：

| 字段 | Owner | 变更后必须失效/重算 |
| --- | --- | --- |
| `origin` | location/profile | route、arrival、travel risk、nearby spots |
| `observingNight` | user/time | forecast、astronomy、NightReport、itinerary windows |
| `moment` | time scrub/field | sky position、hour cell、target visibility |
| `profile` | profile | filters、scoring weights、equipment/safety |
| `target` | user/sky | astronomy window、spot suitability、shooting |
| `selectedSpot` | map/recommendation | detail、route、itinerary、field/sky/shooting |
| `primaryBackupRole` | NightReport/user | map marker、plan、field switch |
| `route` | route module | arrival、risk、itinerary timeline |
| `itineraryRevision` | itinerary | offline pack、share、notifications |
| `freshness` | data owners | stale/degraded labels and action eligibility |
| `risk` | safety owners | blocker, warning and confirmation |

所有 Surface 只消费这份 state 或有版本标识的投影。任何局部 Screen store 都必须声明 owner 和同步/失效规则。

### 7.2 必须成为 typed facts 的实体

- Identity：owner、device credential、session、role/grant、audit actor。
- Profile：observer type、transport、facility/safety needs、targets、equipment、consents。
- Spot：geometry、visibility、facts、facilities、access/safety、verification、media、horizon、reviews。
- Forecast：provider run、normalized hourly values、quality、warning、freshness、lineage。
- Astronomy：site/time/target window、event、ephemeris/catalog version、uncertainty。
- Geo asset：VIIRS/DEM/catalog manifest、checksum、CRS/nodata/coverage/version/current pointer。
- Route：origin/destination、provider/coordinate systems、distance/duration/arrival/risk/polyline/freshness。
- NightReport：immutable input snapshot、hard blockers、window, score, explanation, primary/backup, evidence refs。
- Itinerary：plan、stop、event/timeline、route/weather snapshots、revision/patch/share/offline refs。
- ShootingPlan：equipment/conditions/rule version/output/checklist/revision。
- OfflinePack：component manifests、bytes/checksum、activation version、queue/replay cursor。
- Contribution：spot submission、field report、review、correction、media original/derivative/moderation。
- Notification：subscription、rule、event、delivery attempt/receipt/deep-link target。
- Provider cost：usage event、rate snapshot、budget month、gate、health。
- Operations：job/run/replay、moderation case、dataset release、admin action/audit。
- Quality：release candidate identity、backup/restore drill、trace/metric references、SLO measurement。

通用 runtime 可保留为基础库，但不能作为上述实体的替代读取模型。

### 7.3 Cache 与 freshness

- Memory cache：仅优化，不是事实源。
- Mobile SQLite：用户状态、离线快照、queue 和 last-known data。
- Server SQLite：domain facts、provider runs、jobs、cost 和 current pointers。
- Static asset store：不可变 raw/derived files，manifest 控制 active version。
- 每个响应提供 `capturedAt`、`validFrom/validTo`、`source`、`quality`、`freshness`、`degradation`。
- stale 可用和 unknown 必须分离；cache miss 不得填入深圳/西涌固定结果。
- 同 key 幂等请求只由语义输入决定，采集时间等 freshness 字段不能制造无意义冲突。

### 7.4 Jobs 与恢复

job/outbox 至少包含：

- typed payload/version；
- unique/idempotency key；
- state、attempt、lease owner/expiry；
- next run、backoff、dead-letter reason；
- result/entity references；
- trace/audit；
- restart recovery 和 replay。

必须覆盖 weather ingest、static asset release、media processing、field TTL、notification evaluation/delivery、export/delete、backup/restore 和 maintenance。

## 8. 数据源与成本实施

### 8.1 选择顺序

每项能力先通过：

1. 真实性/完整性；
2. 目标区稳定性；
3. 许可、归属和可运营性；
4. 降级与退出；
5. 在合格候选中比较 12 个月总成本。

“免费”不能绕过加工、存储、出网、监控、重试和工程成本。

### 8.2 当前 provider disposition

| 能力 | 当前路径 | 完成前门 |
| --- | --- | --- |
| 天气 | Open-Meteo noncommercial POC；保留其他 adapter | 条款、目标区质量、归一化、缓存、成本、失败 |
| 天文 | Astronomy Engine 本地 | package/version、黄金数据、时间/坐标、适用范围 |
| 路线/POI | adapter；Overpass 仅候选；AMap 未授权时 disabled | 合法 key/条款/配额、目标设备/地区、坐标、超时 |
| 光污染 | EOG VIIRS 区域静态资产 | 下载许可、checksum、CRS、点查询/瓦片、校准 |
| DEM/遮挡 | Copernicus DEM 或批准等价源 | 获取流程、区域裁切、horizon 算法、版本 |
| 星表/卫星 | 版本化 catalog/CelesTrak 等 | 许可、更新时间、checksum、算法版本 |
| 专业天象 | 官方/一手数据或本地计算 | 每类来源、适用地区、置信度和 unavailable |
| 媒体 | owner 私有文件；用户授权贡献 | 文件安全、EXIF、扫描、版权/许可 |
| 通知 | 本地系统通知 + inbox | 权限、schedule/cancel、receipt；远端 channel 后置 |

### 8.3 预算硬门

必须实现：

- 按 request 和有效输出记录 usage。
- 费率快照版本化，币种转换有来源和时间。
- 月份按 `Asia/Shanghai` rollover，延迟账单可调整但不能使未来调用穿透。
- 70/90/100% 原子策略。
- 并发 reserve/commit/release，重试只计真实请求。
- 测试 paid=0、CNY 200、跨月、费率上调、retry storm、cache miss 和多个 provider。
- owner operations 显示预算、实际、预测、来源、健康和 gate，危险操作二次确认并审计。

## 9. UI/UX 设计资源补齐方案

### 9.1 当前已选资源

| Stable key | Canonical files | Hash |
| --- | --- | --- |
| `target.mobile-product-pages-v2` | `docs/design-targets/mobile-product-pages-v2/index.html` / `coverage-manifest.json` | `21838ed…af4271` / `6f99c5…ed46f` |
| `target.ops-product-pages-v1` | `docs/design-targets/ops-product-pages-v1/index.html` / `coverage-manifest.json` | `40510c…55b5` / `036273…e8e2` |
| `target.mobile-controls-v3` | `docs/design-targets/mobile-controls-v3/implementation-contract.json` / `index.html` | `01f4ea…12c4` / `c29bea…1b2a` |
| `target.ops-controls-v2` | `docs/design-targets/ops-controls-v2/implementation-contract.json` / `index.html` | `13f0d0…388` / `dc82a4…45b` |

完整 hash 以 `DESIGN.md` 和文件本身为准。

### 9.2 不再生成一套“全量 UI”

现有资源已经定义：

- 12 个移动 Surface、2 个 ops Outcome；
- 83 个移动 Control、12 个 ops Control；
- 390×844 主视口、desktop ops；
- planning/night/red-light；
- 主要 data states、A–F、REV-43、208+32 scenario；
- 组件 anatomy、API、logic/data、motion、a11y、platform、content、assets 和 acceptance。

重复生成页面会创建冲突候选和第二真值。后续 authoring 的产品是 **residual implementation handoff**。

本次“五个一级菜单对应五个独立页面”的修订不增加新视觉资源：现有 page target 已分别覆盖五个目的地，`primary-tab-bar` exact target 已声明点击/深链切换及标签内导航状态保留。需要刷新的是 handoff 的产品 lineage、规范 route/Screen 与独立 stack/scroll/back 语义，以及受影响 Source/Context 文件 digest；四套冻结 target 不变。

### 9.3 design-resource-authoring 委托规格

输入：

- `DESIGN.md`。
- Product/Screen Contracts。
- 四个 repo-local immutable targets。
- `docs/source-plan.md`。
- 本方案与 gap audit。
- 当前 production routes/components 和 9+12 blocker。

前置治理（已完成，后续只保持）：

- `context:doctor` 已能发现 `DESIGN.md` 的 canonical Design Authority Index 和 selected token source；后续修订不得退化该发现路径。
- 治理只允许 harness 指向 `DESIGN.md` 的 canonical token/target owner，不得复制 token、改写冻结 target 或创建第二 Design Authority。
- `design-resource-authoring` 本身不得修改 Context、`DESIGN.md` 或生产代码。

输出必须是一个 project-native Markdown handoff：

- 使用 `ty-source-item` markers 标识可消费的 source items。
- 恰好一个 fenced `design-resource-handoff-v1` block。
- source/profile/dependency closure 完整。
- 每个 locator 机器可解析并绑定 immutable hash。
- `subject × target × condition × dimension` 完整核算。
- 14 Surface、95 Control 的 coverage/disposition。
- 每个 verification method 独立列出，不能只写“visual compare”。
- 9 个移动 blocker 和 12 个 ops blocker 保留原始 item/method lineage。
- 9 个移动 blocker 的精确集合为：
  - `map-filter-sheet`
  - `map-marker-density-surface`
  - `selected-spot-sheet`
  - `spot-media-gallery`
  - `observation-timeline-editor`
  - `sky-time-scrubber`
  - `orientation-follow-toggle`
  - `orientation-calibration-sheet`
  - `ar-mode-toggle`
- `spot-media-gallery` 的生产媒体/许可作为外部资产 blocker，不能生成替代品后宣称关闭。
- 8 个原生交互项标明 representative Android/iOS device、sensor/camera/map、haptic、gesture、a11y 和 performance 证据。
- ops 项标明 endpoint/authn/authz/confirmation/idempotency/audit/rollback/recovery。
- 写明 editable upstream update route；不得修改冻结 baseline。

验收：

```text
ty-context design-resource preflight <handoff.md>
```

必须通过后，handoff 才能进入 Long-Task `task.source_paths` 和 target Check `verification_inputs`。

## 10. 工作包

### 10.1 总依赖

```text
AUTH
├─ NAV ─ UI ─ STATE
├─ DATA ─ COST ─ SOURCE
└─ ID
     │
     ├─ SPOT ─ MAP ─ NIGHT ─ PLAN
     │                    ├─ SKY
     │                    ├─ SHOOT
     │                    └─ FIELD
     ├─ CONTRIB ─ NOTIFY
     ├─ ADMIN
     └─ QUALITY（贯穿并最终收口）
```

### 10.2 工作包清单

| ID | Depends | 生产 owner/主要路径 | 输出 | 必须通过的完成证据 |
| --- | --- | --- | --- | --- |
| `DEV-AUTH-001` | — | Source/Context/DESIGN/handoff | 刷新 Source 索引；修复 Design Index/token-source discoverability；residual handoff；14/95 accounting；新 Contract draft | context doctor 可发现 canonical design owner；design preflight；所有外部约束有 disposition；无第二 Authority |
| `DEV-NAV-001` | AUTH | mobile root/shell/routes | 单一 native route graph；五个独立 Tab 根 Screen；每 Tab nested stack/scroll/canvas；sheet、deep link/back/restore | Android 冷启动逐一观察五个规范 route/Screen；独立状态恢复；移除共享 `ScrollView`/条件 destination 与 feature 平行真值 |
| `DEV-UI-001` | AUTH,NAV | UI system/components/screens | DESIGN token projection、组件族、三模式、状态、motion/a11y | selected-target methods；large text/reduced motion/reader；representative device |
| `DEV-STATE-001` | NAV | DecisionContext/query invalidation | origin/night/target/spot/route/itinerary 单一协调状态 | 地图/时间变更使所有相关 Surface 更新或明确 stale |
| `DEV-DATA-001` | AUTH | mobile/server schemas/repos/jobs/files | SQLite schemas/migrations、typed repos、job/outbox、backup | 实体写入、restart readback、migration/rollback、restore drill |
| `DEV-COST-001` | DATA | ProviderGateway/cost/admin | usage/rate/budget/gate/health；70/90/100 | paid=0、跨月、并发、retry storm 不越硬顶 |
| `DEV-SOURCE-001` | DATA,COST | provider adapters/pipelines | weather/astronomy ingest；锁定的 Python VIIRS/DEM/catalog 离线加工；quality、lineage、asset release | 两地点/两日期；Python fixture/golden；asset checksum/rollback；provider failure |
| `DEV-ID-001` | DATA | identity/profile/mobile SecureStore | owner/device credential、session、authorization、export/delete | 未授权拒绝、revoke、restart、真实 export file/delete job/audit |
| `DEV-SPOT-001` | DATA,SOURCE,ID | spot/trust/admin/contribution | ≥30 目标区 seed spots、facts/media/horizon/verification | 搜索/详情/编辑/核验同一事实；坐标披露；restart |
| `DEV-MAP-001` | NAV,STATE,SPOT,SOURCE | native map/route | MapView、camera/marker/cluster/sheet/layer/filter/route/handoff | 原生 map interaction；route success/timeout/no-key/cache；WGS84/GCJ02 |
| `DEV-NIGHT-001` | STATE,SOURCE,SPOT,MAP | NightReport/recommendation | durable report、hard blockers、windows、score/explanation、primary/backup | 两地点×两日期×两 profile；replay；blocker counterfactual |
| `DEV-PLAN-001` | NIGHT,ID,DATA | itinerary/mobile/offline | create/edit/timeline/route/snapshot/revision/share/collaboration | 用户输入、restart、refresh、offline、conflict、multi-actor |
| `DEV-SKY-001` | STATE,SOURCE,UI | sky/sensors/native AR | sky render/catalog/time/track/FOV/calibration/horizon/AR | 时间/地点变化、sensor invocation、permission/error、fallback |
| `DEV-SHOOT-001` | STATE,NIGHT,PLAN | shooting rules/repo/mobile | equipment input、rule version、preset/checklist/history | 两套器材/条件、stable idempotency、save/restart/offline |
| `DEV-FIELD-001` | PLAN,MAP,SKY,SHOOT | offline storage/field/native | real packs、atomic activation、queue、red light、安全会话 | bytes/checksum、airplane/kill/restart、single replay、background |
| `DEV-CONTRIB-001` | ID,SPOT,DATA | community/media/jobs/admin | spot/report/review/correction/media/moderation/TTL | real form/file、EXIF derivative、restart、expiry、audit |
| `DEV-NOTIFY-001` | ID,NIGHT,PLAN,DATA | subscriptions/jobs/native notifications | rules/events/local schedule/inbox/deep links/receipts/tools | schedule/cancel、deny、dedup/cooldown、restart/deep link |
| `DEV-ADMIN-001` | ID,DATA,COST,SOURCE,SPOT,CONTRIB | Vite admin/protected APIs | source/cost/job/spot/moderation/release/quality operations | authz、preview/confirm、typed mutation、rollback/restart/audit |
| `DEV-QUALITY-001` | all | scripts/tests/CI/telemetry/release | root verification、isolated acceptance、native gates、SLO/restore | same-snapshot all checks、counterfactual、no hard-coded evidence |

### 10.3 技术债处置

| 当前债务 | 处置 |
| --- | --- |
| Root shell 单 `ScrollView` 条件 destination 与 Feature Screens 平行 | `DEV-NAV-001` 迁移为五个独立 Tab 根 Screen + 每 Tab Stack；删除不再拥有产品行为的静态 destination path、第二 route store 和 `/plans` 非规范页面身份 |
| 默认深圳坐标/固定西涌日期 | fixture 只能在 tests；生产无输入时返回 permission/manual/unknown |
| demo actor | `DEV-ID-001` 传播真实 session actor |
| InMemory/Poc repositories | typed SQLite repository；POC adapter 只在明确 POC source 内 |
| Generic durable receipt | 降为基础日志/outbox；业务读取从 typed entities |
| Styled View 地图/天空 | MapView 与 GPU/Skia/等价渲染；不可用时 honest state |
| 未接入 offline primitives | 由 Field/Plan production owner 接入或删除死代码 |
| 历史 overclaim receipts | 限定 scope；最终检查只消费当前候选执行证据 |
| shooting idempotency/test data 泄漏 | 语义 key、freshness 分离、run-unique data root/reset |
| design resource candidate 文案与 adoption 冲突 | 不改冻结 target；residual handoff 记录 canonical adoption 和 update route |

## 11. 分阶段实施与 Gate

### Stage 0：Authority 与 Contract 就绪

范围：

- `DEV-AUTH-001`
- 保持已完成的 Design Authority discoverability，不得建立第二 Authority
- 消费并重新校验现有 design-resource-authoring residual handoff
- 本方案、gap audit、Source Plan、Context/DESIGN 索引一致
- 新 `long-task-delivery-v2` Contract draft

Gate：

- design-resource preflight 通过。
- `context:doctor` 能发现 canonical Design Authority Index 和已选 token source；不得以新副本消除 warning。
- 14 Outcome、95 Control、16 MVP、19 work package 全部进入 source/claims/checks。
- 每个 Control 绑定 owner surface、required product target、现有 route/component carrier 和 root-entry success journey。
- 每个 design verification method 有独立 positive Assertion。
- 9+12 blockers 有精确 lineage 和解除条件。
- Contract preflight ready 后 compile/Authority Lock。

注意：首次 Authority Lock 后触发 execution model checkpoint。必须按工作流结束当轮，请用户明确选择 `continue_current_model` 或切换模型，之后才开始产品实现。

### Stage 1：原生骨架与设计系统

范围：

- `DEV-NAV-001`
- `DEV-UI-001`
- `DEV-STATE-001`

输出：

- 五个真实且独立的主入口：Tonight `/tonight`、Map `/map`、Trips `/trips`、Sky `/sky`、Me `/me`；每个入口拥有自己的 Screen、Stack 和滚动/画布状态。
- 详情/预报/路线/摄影/现场/贡献/工具/设置使用 stack/sheet/immersive route。
- 唯一 DecisionContext、query invalidation 和 cold-start restore。
- DESIGN token projection、基础组件、planning/night/red-light、数据状态、a11y/motion。

Gate：

- Android 冷启动走完每个主入口，逐次观察五个规范 route/Screen；feature 不依赖 detached deep link。
- 在至少两个 Tab 建立不同 nested route 与滚动/画布位置，切换后分别恢复；共享根 `ScrollView`、锚点跳转、条件伪页面和跨 Tab Back 历史均使 Gate 失败。
- 深链先激活归属 Tab，invalid/stale target 回到该 Tab 根页；Back 先关 layer 再弹所属 Tab 栈。
- selected target 的基础页面和共享控件在 production route 可观察。
- 无真实数据时显示对应状态，不填固定成功样例。

### Stage 2：可信数据、身份与成本底座

范围：

- `DEV-DATA-001`
- `DEV-COST-001`
- `DEV-SOURCE-001`
- `DEV-ID-001` owner baseline

输出：

- mobile/server typed SQLite、private files、jobs/outbox、migration/backup。
- owner/device auth 和 protected API。
- ProviderGateway、成本硬停、weather/astronomy/static asset pipelines。
- 锁定依赖且可重现的 Python 栅格/地形/catalog 离线 pipeline；它输出 manifest/checksum，不拥有在线业务状态。

Gate：

- 两组真实输入产生不同持久化结果。
- API/worker/app 重启后读回。
- paid=0/70/90/100/跨月/并发/重试测试通过。
- 无 provider 直连绕过 gateway。

### Stage 3：MVP 主决策闭环

范围：

- `DEV-SPOT-001`
- `DEV-MAP-001`
- `DEV-NIGHT-001`
- `DEV-PLAN-001` MVP subset
- `DEV-SHOOT-001` phone baseline

旅程：

```text
定位/手动地点 + 日期
→ 真实天气/天文/光污染
→ 今晚结论 + 主备
→ 原生地图筛选/地点详情/路线
→ 简单行程
→ 外部导航
→ 手机摄影预设
```

Gate：

- MVP 1–13 端到端。
- ≥30 个有 provenance 的核验 seed spots。
- provider unavailable 时没有假路线、假 Bortle 或固定地点。
- state/revision 在 Tonight/Map/Spot/Plan/Shooting 一致。

### Stage 4：MVP 贡献、通知与质量

范围：

- `DEV-CONTRIB-001` MVP subset
- `DEV-NOTIFY-001` local/inbox subset
- `DEV-QUALITY-001` baseline

输出：

- 新地点、评论、评分、实况、纠错、真实媒体。
- consent telemetry/core funnel。
- 本地/inbox 提醒。
- root product verification 和 CI。

Gate：

- MVP 14–16 完成，因此 16/16 MVP 全部闭环。
- 实际文件、typed rows、TTL job、event sink、system notification 均可验证。
- 同一候选的 browser + Android native + persistence + failure/counterfactual 通过。

### Stage 5：V1 完整决策与现场

范围：

- forecast/astronomy professional layers
- 完整 `DEV-PLAN-001`
- `DEV-SKY-001`
- 完整 `DEV-SHOOT-001`
- `DEV-FIELD-001`
- 完整 `DEV-NOTIFY-001`

Gate：

- 15 日、小时矩阵、天文窗口、天空、摄影、行程、离线现场共享同一 state/revision。
- 真离线包在飞行模式和杀进程后可用。
- 传感器/通知/文件/系统返回在 Android native runtime 有证据。
- AI/远端推送/未批准 provider unavailable 不破坏核心。

### Stage 6：V2 私有协作与信任

范围：

- private invitation、copy/share、multi-actor collaboration
- equipment assignment
- panorama/horizon、trust/review/correction
- crowding experiments、confirmed import

Gate：

- 两个隔离 actor 的真实 authz、持久化、断线恢复和冲突。
- 贡献数据与长期事实/临时实况/审核证据严格分层。
- 不因私有 profile 把协作做成固定 demo。

### Stage 7：V3 专业能力

范围：

- AR/FOV/composition
- ISS/satellite/meteor/comet/aurora/eclipse
- tracks/calculators/calendar/content

Gate：

- 每项绑定真实算法/数据/version/license/适用范围。
- 支持设备执行真实 capability；不支持/无数据时明确 unavailable。
- 专业层通过 progressive disclosure，不破坏新手主闭环。

### Stage 8：Owner 运维与 Final Gate

范围：

- 完整 `DEV-ADMIN-001`
- 完整 `DEV-QUALITY-001`
- all Outcomes regression

Gate：

- 管理操作影响真实 source/spot/job/cost/moderation/release data，并可预览、确认、审计、回滚。
- 实际 backup → isolated restore → reference/permission/tombstone 校验。
- trace/metric/log 和 SLO 来自当前执行，不是固定文案。
- Android internal candidate 从 root cold start 完成全部 required journeys。
- iOS code/native/build readiness 完成，runtime evidence 明确 deferred/unverified。
- Final Gate 资格为 `owner-only personal trial usable`；公众生产门不被误报。

## 12. 验证架构

### 12.1 反馈层级

1. changed-module type/unit/contract。
2. API/domain/persistence integration。
3. warm Expo Web/dev client 交互反馈。
4. deterministic browser journeys。
5. selected-design comparison/state/motion/a11y checks。
6. packaged Android release install/cold start/scenario。
7. representative device/field/manual external confirmation。
8. same-snapshot Final Gate。

Web/截图不能替代 native；native build 存在不能替代行为；Context/receipt 不能替代执行。

### 12.2 每个 Outcome 的 Check 模板

```text
Given:
  run-unique environment/data root
  root cold start
  explicit actor/profile/permission/provider state
  at least two materially different inputs
When:
  user traverses the production route and commits the action
Then:
  visible result is input-dependent
  typed domain/native/external sink is observed
  restart readback preserves identity/revision
  failure/degradation is truthful
Counterfactual:
  remove input dependency/write/adapter/readback
  owning assertion fails distinctly
```

### 12.3 必须执行的端到端旅程

1. Onboarding/profile/equipment/consent 保存与重启；五个独立 Tab 根 route/Screen、每 Tab stack/scroll 恢复、deep-link 归属激活与 native Back。
2. 两地点×两日期×两 profile Tonight decision。
3. forecast/astronomy 时效、模型分歧和 unavailable。
4. 原生地图选点、筛选、sheet、route、external handoff。
5. 地点详情、坐标披露、核验编辑与版本。
6. 行程创建、编辑、刷新、离线引用、分享/冲突。
7. 天空 time scrub、方向跟随、校准、FOV/AR fallback。
8. 摄影两器材/条件、stable idempotency、保存/恢复。
9. 离线 pack byte/checksum/activation、airplane/kill/replay。
10. 媒体 EXIF 去敏、审核、TTL、纠错。
11. 通知 schedule/cancel/deny/inbox/deep link。
12. owner auth、session revoke、export file、delete/retention。
13. admin preview/confirm/mutation/rollback/audit。
14. budget 70/90/100、跨月、retry storm。
15. backup/restore、trace/metric/log、release candidate。
16. selected design 的 planning/night/red-light、all data states、large text、reduced motion、screen reader、gesture interruption。

### 12.4 测试隔离与幂等

- 每次 formal browser/API/native run 使用 run-unique DB/file root 或显式可验证 reset。
- runner 拥有 server/port/process tree，取消后关闭精确 task-owned 子进程。
- warm health 同时校验 Starward surface、session 和 source/config fingerprint。
- idempotency key 只由业务语义身份决定；freshness/captured-at 若不改变业务请求，不得导致冲突。
- retry、duplicate、conflict 的结果分离，HTTP/status/UI 状态一致。
- 当前 shooting 5 个失败必须在 Stage 0/2 最早修复并加入回归。

### 12.5 设计一致性

- 每个 exact/constraint target 绑定 immutable input。
- 每个 condition 有 actual/comparison artifact。
- 每个 declared verification method 有可独立失败的 assertion。
- Map/sheet、time/sky、mode、gesture、haptic、a11y、native capability 不以静态 render 代替。
- 生产媒体 blocker 只能由真实合法资产或明确外部确认解除。

### 12.6 项目命令基线

当前已知：

- `npm run context:validate`
- `npm run design:targets:verify`
- `npm run test:mobile:fast`
- API TypeScript/Vitest workspace checks
- `npm run test:verification:fast`
- `npm run test:acceptance:mobile`
- admin workspace build

`DEV-QUALITY-001` 应建立一个明确 root product verify，而不能继续让根 `npm test` 只代表 Context。

## 13. 风险、外部门与触发器

| 风险 | 当前控制 | 升级/阻断条件 |
| --- | --- | --- |
| 天气质量 | provider quality/lineage/模型分歧/unknown | 目标区 POC 不达标则换源或降级 |
| 光污染误读 | VIIRS 来源/日期/分辨率/地面校准说明 | 无资产/校准不得给假 Bortle |
| 坐标错误 | WGS84 truth + boundary conversion tests | provider/system 不明则 fail closed |
| 时区/跨午夜 | UTC + IANA + observing-night | 任何只存 display date 的实现阻断 |
| 指南针漂移 | accuracy/calibration/horizon/fallback | 设备精度不足时关闭方向跟随 |
| Android fragmentation | capability adapter + representative device | 关键 capability 无目标设备证据阻断 |
| 地点失真/安全 | seed verification、source/conflict、coordinate levels | 高风险信息不确定时阻断行动 |
| provider lock-in | ports、normalized models、exportable raw/derived assets | 第二源只在质量/预算触发且 owner 批准 |
| 架构过度复杂 | modular monolith/SQLite/single worker | 无测量证据不得拆服务或加第二数据面 |
| 媒体版权/隐私 | owner/private、license、EXIF derivative | 未取得许可不进入 gallery baseline |
| 成本穿透 | reserve/commit + hard stop | 任一绕过 gateway 的调用阻断 |
| iOS 环境 | code/build readiness now，runtime deferred | 恢复 iOS usability claim 前必须重开 runtime checks |
| 公众合规 | future profile | 公开分发/商业化前新 Authority |

## 14. Long-Task 工作流使用方式

### 14.1 当前审计/方案阶段

本阶段不需要 Long-Task：

- 目标是刷新 Source、Context 和计划，不是实施全部产品。
- 不创建或修改活动 Delivery Contract。
- 不复用历史 `tmp/ty-context/long-task-runs/starward-complete-react-native-app/` 的 Progress/receipt。

### 14.2 全量补开发阶段

需要显式 `/long-task-workflow`，原因不是“任务很长”，而是用户要求一个跨 14 Outcome、完整 Source/设计/验证闭环的单一交付：

1. 使用已生成且针对当前 Source/Context digest 重新通过 preflight 的 residual design handoff。
2. 用一个 native Goal、一个 workspace、一个 `long-task-delivery-v2` Contract。
3. Source 至少包含：
   - 两份初版方案；
   - `docs/source-plan.md`；
   - gap audit；
   - 本补开发方案；
   - residual design handoff；
   - `DESIGN.md`/Context 的 canonical anchors。
4. Contract 采用本方案 Stage 0–8 和 14 个垂直 Outcome，不按“前端/后端/测试”拆成互相不可验收的横向任务。
5. Preflight ready 后 Compile/Authority Lock。
6. 首次 lock 后遵守 model checkpoint，用户明确选择继续当前模型或切换后再实现。
7. 实施中按 frontier/Stage 推进；targeted verify 只作修复证据，Final Gate 在一个干净当前快照重跑全部 Checks。
8. Authority 语义变化走 revision，不在代码中静默改目标。
9. Final Gate 是架构一致性和 selected-design closure 的唯一 Long-Task owner。

### 14.3 不采用的流程

- 不再使用 retired `source-plan-authoring` 作为独立阶段。
- 不创建第二 Source Plan、第二矩阵、第二验收账本或多个互相竞争的 Goal。
- 不把 design authoring、Contract authoring、实现和验收混成一次无 checkpoint 的长执行。

## 15. 信息索引

### 15.1 核心方案

- 当前 Source Plan：`docs/source-plan.md`
- 当前实现差距：`docs/architecture/implementation-gap-audit.md`
- 本补开发方案：`docs/architecture/gap-driven-supplemental-development-plan.md`
- 数据源/成本研究：`docs/technical-data-source-decisions.md`

### 15.2 Context 与设计 Authority

- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/context.toml`
- `project_context/areas/main.md`
- `project_context/areas/main/product-surface-contract.md`
- `project_context/areas/main/screen-contracts.md`
- `project_context/areas/main/verification.md`
- `DESIGN.md`

### 15.3 设计目标

- `docs/design-targets/mobile-product-pages-v2/`
- `docs/design-targets/mobile-controls-v3/`
- `docs/design-targets/ops-product-pages-v1/`
- `docs/design-targets/ops-controls-v2/`

### 15.4 当前实现入口

- Mobile root：`apps/mobile/index.js`
- App route owner：`apps/mobile/src/shell/WebApplication.tsx`
- Root shell：`apps/mobile/src/shell/MobileShellScreen.tsx`
- Deep-link route：`apps/mobile/src/shell/application-route.ts`
- Feature Screens：`apps/mobile/src/features/**`
- Offline primitives：`apps/mobile/src/data/offline/offline-storage.ts`
- API composition：`apps/api/src/start.ts`
- Feature routes：`apps/api/src/feature-routes.ts`
- Domain/modules：`apps/api/src/modules/**`、`packages/domain/**`
- Generic runtime：`packages/contracts/src/runtime/durable-business-runtime.ts`
- Admin：`apps/admin-web/src/main.tsx`
- Workers/pipelines：`workers/**`、`data-pipelines/**`

### 15.5 证据与检查

- Browser acceptance：`tests/acceptance/**`
- Verification tools：`tools/verification/**`
- Historical artifacts：`artifacts/verification/**`
- Package scripts：`package.json`
- Historical inactive run：`tmp/ty-context/long-task-runs/starward-complete-react-native-app/`，只作历史审计，不作本次 Authority

## 16. Ready / Done 判定

### 16.1 Design-resource-authoring 状态

已完成。四个 selected target、14/95 coverage、9+12 blockers、production entrypoints 已进入唯一 residual handoff；本次导航权威修订只刷新 lineage/digest，不生成新视觉资源。

### 16.2 Ready for complete Long-Task Contract authoring

是，但启动时必须对当前快照复核：

- residual design handoff 仍通过 preflight，且 Source/Context digest 与本次导航修订一致；
- `context:doctor` 仍能发现 canonical Design Authority Index/token source；
- handoff/source profile/dependency closure 完整；
- Contract 将 14 Outcome 的 root-entry surface bindings、每个 declared design method 的独立 assertion、9+12 blocker lineage 和本次刷新的 Source Plan markers 全量编译入 Authority。

这些完成后，应显式启动一个新的 Single-Goal Long-Task Contract；旧 run 不复用。

### 16.3 Product Done

只有满足以下全部条件才完成：

- 初版 MVP 16/16。
- V1/V2/V3 所有机器内能力完成；外部 gate 状态诚实。
- 14/14 Outcome 在 production root journey 通过。
- 95/95 Control 完成适用 selected-design conformance。
- Android native required checks 通过。
- iOS code/native/build readiness 通过，live runtime 明确 deferred/unverified。
- typed persistence、restart、failure、idempotency、conflict、budget、backup/restore、auth/privacy 全部通过。
- Final Gate 在一个当前干净候选上重跑全部声明 Checks。
- Goal 只有在机器验收、外部阻断状态和用户所需交付都已准确报告后才完成。

## 17. 推荐的下一步

```text
本次 gap audit + 本补开发方案 + 刷新的 Source Plan + UI/UX authoring brief
→ 已生成的 residual implementation handoff + 四套 immutable target 完整闭包
→ design-resource preflight
→ 显式 /long-task-workflow
→ Draft / Preflight / Compile / Authority Lock
→ model checkpoint
→ Stage 1～8 实施与滚动验证
→ one-snapshot Final Gate
→ owner-only personal trial handoff
```

这条路径既保留初版方案的完整产品目标，也把 CNY 200/月、个人 owner-only、现有实现和现有设计资源变成可执行、可验证、不会重复造 Authority 的补开发交付。
