# Starward 项目背景与实现阅读地图

整理日期：2026-10-23。审查基准为 `4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0`：
https://github.com/Seven128/Starward/tree/4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0

本附件用于帮助外部审查者快速进入项目。主任务是全项目架构与代码质量审查，地图叠层和云观星性能是两个重点专题。以下“已实现”指代码中有相应责任或本地已整合，不等同于所有真实业务、设备、供应商、部署及长期性能均已验收。

## 1. 产品和当前阶段

Starward 是《今晚去观星》的 monorepo。它涉及观星地点、天气与天文资料、出行计划、现场信息、星图与素材、用户投稿/反馈、审核发布和相关运营。

仓库有两个需要区分的用户产品：

- **React Native App**：强调从“今晚是否出发”的判断，进入地点、时段、路线、风险、准备和现场使用。现有主要路由为 Tonight、Map、Trips、Sky、Me。
- **微信小程序**：独立的地点与观测资料工具，当前主要目的地是 Map 和 My，含地点资料、搜索、计划和云观星等子页面。它向用户提供事实与不确定性，由用户决定是否去；不展示 App 式的综合出发建议。不要因为仓库共用名称或部分数据，就把两个产品的 UI、状态和业务结论强行合一。

目前仍是持续开发与本人内测阶段，近期实现密集集中在小程序。已有真实业务模块、自动检查、真机开发反馈和独立审查，同时存在已明确保留的外部条件及验收缺口。我们希望本次审查检验现有架构是否继续适合演进，并找出局部修补累积后的共同根因。

## 2. 技术栈与目录

版本来自本次源码的 package manifests，实际解析以 `package-lock.json` 为准；它们不是对“市场最新版本”的声明。

| 目录 | 责任与当前技术 |
| --- | --- |
| `apps/wechat-miniapp` | Taro/WEAPP，Taro 4.2.1、React 18.3.1、TypeScript、SCSS、TanStack Query 5.90.21、Zustand 5.0.14；Sky使用Canvas/WebGL与twgl.js，另有HEALPix/四元数相关依赖。 |
| `workers/miniapp-api` | 小程序独立BFF及后台任务，Node.js、NestJS 11/Fastify 5、PostgreSQL/PostGIS、Redis/ioredis、BullMQ等；目录叫workers不意味着它是Cloudflare Workers应用。 |
| `packages/miniapp-contracts` | 小程序共享契约、校验与生成客户端边界，供小程序和Mini API消费。 |
| `apps/mobile` | Expo 57、React Native 0.86、React 19.2、Expo Router；TanStack Query、Zustand、React Hook Form、Reanimated、Gesture Handler等。 |
| `apps/api` | 原生App的独立API组合，Fastify、PostgreSQL及领域/供应适配；与Mini API不是同一个运行时入口。 |
| `apps/admin-web` | React/Vite管理端，消费共享契约，服务运营/审核等入口。 |
| `packages/domain`, `packages/contracts` | 原生App及相关服务的领域/契约责任；与miniapp-contracts需按实际语义判断共享或隔离。 |
| `packages/astronomy-core` | 天文计算和产品范围内的静态星表；含Astronomy Engine、satellite.js等，原生App和小程序有不同星表/分发入口。 |
| `packages/coordinate-system` | 坐标转换与坐标边界。 |
| `packages/data-source-runtime`, `weather-schema`, `telemetry`, `ui-system` | 数据源运行、天气schema、诊断及原生App设计token等共享能力；不要仅凭名字假定所有端都消费它们。 |
| `data-pipelines` | 星表、深空素材、行星纹理、气象/事件、地形、年度夜光及运行数据准备等管线。 |
| `infrastructure`, `infra`, `tools/deployment` | API/worker/静态服务的基础设施、构建发布、环境、迁移、备份和恢复。 |
| `tools/miniapp`, `tools/resources`, `tools/ci` | 小程序生成/构建/设备/平台操作、资源锁与准备、CI职责。 |
| `tests`, 各源码旁的 `*.test.*` | 单元、契约、行为、基础设施及目标运行时验证；不同证据层级不能互相替代。 |
| `project_context`, `DESIGN.md`, `AGENTS.md` | 产品语义、架构/职责、设计和工程约束。 |
| `.codex/work-items` | 任务计划、进度、调查和诊断代码/证据索引；不是全部都属于生产运行路径。 |

工程使用 npm workspaces、锁文件及 Node.js 24+。原生App与小程序React版本不同是当前运行时组合，需要核依赖隔离与实际peer要求；不宜看到版本不同就机械统一。

## 3. 建议阅读顺序

先看以下入口建立全仓图，再沿具体源码/调用方展开：

1. `README.md`、根及各workspace的`package.json`、`package-lock.json`。
2. `project_context/global.md`、`product-profile.md`、`architecture.md`。
3. `project_context/architecture/runtime-and-domain.md`、`maintenance-boundaries.md`、`assurance-and-lifecycle.md`，以及`areas/main/implementation-index.md`。
4. `project_context/areas/main/screen-contracts/`、`DESIGN.md`，用于辨认产品差异和既有UI约束。
5. `project_context/development-workflow.md`、`deployment.md`、`development-workflow/resources-and-artifacts.md`，再看对应工具和运行入口。

文档中有历史描述、技术债记录和不同产品的条款，必须对照当前代码，不能照抄为当前缺陷或已完成事实。不要先通读全部历史任务日志而耗尽审查时间；任务记录用于验证某个具体决定、测量或失败边界。

## 4. 小程序主要实现责任

### 页面、导航与共享交互

近期按已采用的Stitch增量做了以下整合：Map搜索改为右侧竖排按钮；去除旧底栏；默认Map、左上My入口；My从左侧进出；其他新页右入，原底部抽屉下入；公共按压反馈与紧凑资料排版。

这不仅是样式变化。旧`switchTab`/TabBar消费者、有效前台、原生Back、Map隐藏与Sky卸载返回、滚动位置和安全区也发生迁移。当前实现用保留Map的主导航协调My呈现，并保真实子页面与直接入口语义。请核其职责、注册/释放、故障恢复与真实消费者，不要从一个UI截图推断生命周期正确。

代表入口：

- `apps/wechat-miniapp/src/app.config.ts`, `app.tsx`
- `src/navigation/primary-navigation.ts`, `primary-navigation-controller.ts`, `primary-page-navigation.ts`, `page-presentation.tsx`
- `src/hooks/use-primary-navigation.ts`, `use-page-navigation.ts`
- `src/pages/map/index.tsx`, `src/pages/my/index.tsx`, `src/features/my/`
- `src/components/native-back-boundary.tsx`, `shared-button-press.tsx`

来源信息已收敛到公共按钮、真实来源阅读页及有限内容模板，使用原生EventChannel传递与页面绑定的信息；不同来源只保内容/模板差异。相关入口为`source-button`、`source-entry`、`source-document-content`、`source-page`、`services/source-navigation.ts`、`utils/source-document.ts`以及各实际调用方。请审查统一是否贯穿跳转、身份、恢复和呈现策略，而不只是外观复用。

UI设计已采用，未涉及区域保留原样。此次代码审查可指出实现与责任问题，但不以重新设计界面代替代码改进。历史候选与旧导出不等于当前设计权威。

现有架构记录过通用UI库的选择：小程序当前复用Taro基础能力和Starward共享组件；曾因强制图标依赖与唯一SemanticIcon责任冲突而拒绝`@taroify/core@1.0.6`。这是待审查的既有取舍，不代表所有成熟库都不可用，也不证明自研一定更好。请核实实际依赖/可裁剪性、组件覆盖、WEAPP行为和维护代价；原生App已有成熟手势、动画和表单库，不能套用小程序的选择理由。

### 状态、请求与契约

小程序使用Zustand状态与TanStack Query；公共请求、取消/恢复、账户边界和资源查询另有各自owner。Observation Context关联地点、时刻、路线等事实，并携带版本/指纹/修订语义。预览意图与已提交公共Context有区别，取消和显式应用不能混同。

重点入口包括`src/state/`、`services/api-client.ts`、`services/query-client.ts`、`services/request-lifecycle.ts`、`hooks/use-resource-query.ts`和`packages/miniapp-contracts/`。Sky专用细时刻/天体操作由`services/sky-celestial-client.ts`消费公共传输；包体边界不能通过另造一套鉴权/缓存传输来维持。

### 业务和资料

地点、正式点/待审投稿、三档资料面板、媒体、天气/天文、山体遮挡、收藏、计划/提醒、成就/公开分享、来源、贡献/反馈和账户操作都有相应入口。重点看`src/content/`、`features/spot/`、`features/my/`、`pages/map/spot-panel*`及后端对应责任。

应审查“公开/私有/草稿/待审/正式发布”等身份与状态是否贯穿UI、请求、缓存和数据库。不能把能显示卡片、能生成文件或请求返回200等同于完整业务副作用已经成功。

## 5. 后端、领域、持久化与数据管线

Mini API是模块化单体，入口包括`workers/miniapp-api/src/main.ts`、`app.module.ts`、`controller.ts`、各领域service、repository、provider adapter及`worker.ts`。`apps/api/src/start.ts`则是原生App的独立组合入口。请评估两者共享/分离的实际理由、重复规则与依赖方向，不默认应该合并或拆成微服务。

主要责任包括：

- 地点正式记录、来源与发布资格；投稿/上传、审核、事实合并和正式发布是不同阶段。
- 天气/天文、地形、年度夜光、云量、地图视野和Sky供给；供应资格、来源、质量、时空覆盖和版本必须保留。
- Observation Context、用户资料/偏好/收藏、计划、提醒订阅与后台任务。
- 公开分享、账户数据导出/删除、去标识化与需要保留的审计记录。
- PostgreSQL事务/锁、幂等回执、outbox/队列、缓存以及可恢复的外部副作用。

请特别核查`postgres-repository`及分职责store、controller与service授权边界、账户删除与迟到写入、媒体对象存储/上传补偿、提醒与outbox顺序、发布版本和不可变历史。源码里已有相关防护与测试，但这不是要求审查者预先认为它们充分。

数据管线不是只下载文件：它们还涉及来源/许可、归一化、数值与质量含义、不可变版本/哈希、发布清单、运行时分发和跨机恢复。`data-pipelines/runtime-data/current.lock.json`与`tools/resources/backend-data.mjs`是运行数据锁及共享准备入口；资源/LFS不是数据库备份或运行时CDN。原始全球TIFF、私有数据库/凭据和原始设备证据不在这次代码附件中。

## 6. 地图叠层：现状与待解决问题

主地图使用微信原生Map。当前地形、年度夜光主要沿已发布的栅格/稳定窗口和原生ground overlay链路；云量有实际采样格、小时序列和空间覆盖语义。它们不能简单套同一个“换贴图”模型。

代表源码：

- `src/pages/map/use-native-map-region.ts`及Map的相机/手势owner
- `src/hooks/use-terrain-overlay.ts`, `terrain-overlay-coverage.ts`
- `src/pages/map/map-ground-overlay.ts`, `use-map-raster-installation.ts`
- `src/hooks/use-raster-image.ts`及共享图片/文件资源owner（以实际目录搜索为准）
- `workers/miniapp-api/src/terrain-service.ts`, `terrain-request.ts`, `terrain-publication.ts`, `terrain-fixed-publication.ts`
- `workers/miniapp-api/src/night-light-service.ts`及Map/云量查询与缓存入口
- `data-pipelines/terrain/`, `data-pipelines/dark-sky/`

已有工作包含稳定请求/复用、父图与细图、共享下载/文件pin、原生更新/替换/清理、取消及受控Map→Sky离开。发生过文件unlink失败后失去后续清理资格等实际问题，并已有修复。原生操作超时/不回调、外部销毁与实际native/GPU回收仍有未解决的证据或平台边界。

历史真机曾看到跨覆盖后的局部空缺持续约2–3秒。一个后续样本中父图先补覆盖，细图约1.91秒后到达；相应细图源读取约占1.86–2.10秒，但这是特定样本的关联结果，不是所有场景的固定瓶颈。近期本机已接入原有完整成品，避免重取源；尚不能把本机接线/首读收益直接当作手机链路收益。

当前仍关心连续缩放/拖动、加载中接管、My隐藏与Sky卸载的不同语义、最终正确细节、真实云供给及长期资源成本。最近一次8秒公共手势请求没有取得可辨位移；唯一1.8秒对照有实际pan。它只限制“当前Map不能拖动”的解释，不能验收长持续跟手，也不能据此诊断地图被锁。

审查者可以提出更好的稳定窗口、分块、缓存、预取、渐进覆盖或分发方案，但需说明微信原生平台中的实际落点，以及配准、透明度、缺测、内容有效性和资源成本。请求完成、原生API回调与可见正确覆盖是不同边界。

## 7. 云观星：现状与待解决问题

Sky在WEAPP中有自己的Canvas/WebGL渲染与生命周期。它包含时间/相机、地景、BSC基础星与按需SAO补充星表、星座/目标、名称与选中/拾取、天体/深空图片及相关来源；目标呈现不能仅用“星点画出来”定义。

代表源码位于`apps/wechat-miniapp/src/features/sky/`：

- `spot-sky-page.tsx`、`sky-observation-time.ts`、`use-sky-time-geometry.ts`、`sky-time-presentation.ts`
- `sky-canvas-lifecycle.ts`、`sky-canvas-surface.ts`、`sky-scene-render.ts`、`sky-gpu-renderer.ts`
- `sky-stellar-scene.ts`、`sky-stellar-transform.ts`、`sky-stellar-supplement-scene.ts`、`use-sky-stellar-supplement.ts`
- `sky-star-draw-preparation.ts`、`sky-star-transition.ts`、`sky-name-layout.ts`以及选择/图像等真实消费者

服务端负责地点/时间模型和星表/目标供给，客户端负责观测方向到相机的投影、渲染和交互。两端契约包含来源、版本与有效范围。跨当前报告时段会按需求获取有边界的几何窗口；普通Play不能因局部优化获得人为缩短的播放范围。

已有修复/候选包括时间输入回跳、等待新供给时保留正确的accepted呈现、只允许当前需求发起/接纳请求、取消不错误重试，以及单个当前精确视图的恒星绘制准备复用。另一个“首遇先流式、第二次再建表”的变体，在完整Scene比较中更慢，已拒绝。审查者可以核实这些决定是否仍合理，不应将已拒变体误当当前实现。

已知性能证据与限制：

- 曾有最大/全天空快速调时或正常播放附近的明显卡顿和退出，Android关联记录包含V8 allocation failure/长GC及SIGABRT；**真实OOM问题尚未被定位并修复**。
- 已有正常Sky CPU、存活分配样本、阶段/输入关联、普通预览与Perfetto/进程内存观察。它们可定位成本/内存域，不能直接给出完整retaining path或GPU所有权。
- 较早的高负载远程调试会在进入Sky后变慢/断连，Stable对照在请求Heap之前也已断开；这不等于手机产品崩溃，也不证明所有支持的观察方式都不可用。不要无条件重跑同一失败路径。
- 一个R23修后样本中17/17 geometry调用、5/5准入属于当时当前意图；五条首accepted为111–289ms。分组draw成本尚不能解释这些具体首帧；不能仅凭总体平均重写调度。
- 正常全天空观察曾实际处理BSC8404、加载SAO2842和105个选择tile范围；这些是特定样本的工作量，不能外推所有时刻/视角，也不能成为减星的目标值。
- R27观察中8个特定旧Query wrapper被收集，而5个aggregate与对应page callback仍活。共同存活不证明两者间强边，更没有定位最终根；不能因此宣称Query GC、某个闭包或某缓存就是泄漏原因。
- 最新R28只补“真实首accepted身份与已有阶段成本”的有限标量关联，保存最近8行，区分BSC/SAO build/replay/bypass。generation34已完整本地编译并冻结，**未推送/未真机采样**；本机测试不等于成本结论或产品修复。

请分别评估响应A和持续内存B，保完整正常消费者、最大/全天空与地景、精确时刻、星位/名称/拾取和实际所需SAO。已知资料只是起点，期待有针对性的架构/算法思路和能真正区分原因的实验。

## 8. 原生App、管理端和跨workspace审查

请同时阅读`apps/mobile/app/`及`src/`的路由/状态/feature、`apps/api/src/modules/`、`apps/admin-web/src/`及它们依赖的`packages/domain`、`contracts`、`data-source-runtime`等。

值得检查的横向问题包括：

- 原生App路由与持久状态是否有竞争事实来源；App的Decision Context与小程序Observation Context是否被错误混用。
- App API与Mini API是否重复了本应共享的纯规则，或反过来共享了本应独立的产品/权限策略。
- 管理端的声明、后端实际权限/审计及持久化效果是否一致。
- 供应商adapter、天气/天文归一化、坐标、错误、日志和数据源权利是否在多处漂移。
- 不同测试框架、生成入口、依赖版本及发布边界是否带来隐性耦合和维护成本。

当前没有要求新增企业级规模、全面微服务化、引入新付费服务或重做视觉稿。可以提出证据充分的较大替代方案，但应与当前架构内可执行的修复分开说明。

## 9. 证据、测试与本次快照状态

- 本次为用户要求的审查checkpoint，完整实施Goal已暂停；发布源码快照不代表Goal完成或正式环境发布。
- 本地私有原件、冻结构建、手机截图/录像、原始profile、账户/数据库及历史临时目录没有随本次提交上传。部分任务脚本依赖本地/私有或ignored的输入，不能把仓库地址当作完整运行现场。
- 正常UI候选的实际设备反馈与R28诊断候选不同；不能用一个候选的截图/计量验证另一个。
- R28本机helper10/10、协议7/7、集成及受影响历史45/45、30正常语义检查、严格类型及完整WEAPP构建已通过；独立源审初步无确认P1/P2，但用户暂停时最终独审报告未完成。
本次交付检查结果：

| 检查 | 实际结果 |
| --- | --- |
| SDK生成一致性、miniapp-contracts / miniapp-api / wechat-miniapp类型 | 通过 |
| miniapp-contracts测试 | 88/88通过 |
| wechat-miniapp测试 | 2792项，2791通过、0失败、1跳过 |
| miniapp workflow | 177/177通过 |
| Mini API测试 | 1010项，618通过、354失败、38跳过；共同根因尚未定位 |
| design system、图标、semantic assets | 通过 |
| UI contracts | 失败：field-signal-native-chrome缺少期望的color: NATIVE_CHROME_THEME.DAY.color文本 |
| Context结构、staged diff whitespace | 通过；不代替普通链接和事实校验 |
| catalogs / images本地资源 | MATERIALIZED；不代替发布owner的哈希、格式、身份和许可验证 |

后端失败集中在星体资料/中文介绍与搜索/来源恢复、部分影像和月日资料；多处出现PARTIAL与期望FRESH不符。354不是已确认的354个独立产品缺陷，也未归因为某一项性能修复。代表文件为celestial-information-cache.test.ts、celestial-object-information.test.ts、chinese-tianyue-publication.test.ts、prepared-optical-information.test.ts和sky-luminary-consumers.test.ts。本次没有为了交付审查材料修复或掩盖这些失败。原生App/管理端全量、完整CI和外部/真机验收未在本次快照交付中重新执行。

该提交中的`.codex/work-items/external-code-review-2026-10-23/CHECKPOINT.md`保存验证范围和已知限制。
- `npm run check:miniapp:fast`首先在AppID扫描退出：该扫描匹配所有tracked文本中的AppID字样，当前命中两个历史云观星文档和正式project.config，报`wechat_app_id_tracked_identity_ambiguous`。这是一项实际未通过的检查；其余源码检查另行运行，不把总入口写成通过，也未为通过而改历史原件或AppID。
- CI工作流与自动发布有不同准入：本次只推开发分支，没有推main或执行部署。远端默认分支可能落后于审查commit。

真实供应、部分账户/原生Picker、双指操作、native/GPU回收、完整长期播放和其他业务验收仍有未完成项。请将代码确认的问题与需要目标运行时/外部条件验证的假设分开。

## 10. 具体决定与历史证据入口

只在对应问题需要时查阅：

- `.codex/work-items/sky-map-performance-2026-10-18/PLAN.md`、`REQUIREMENTS.md`、`INHERITED-REQUIREMENTS.md`、`HANDOFF.md`
- 同目录的`OVERLAY-INTERACTION-DECISION-20261022.md`、`PERFORMANCE-STATUS.md`、`RECEIVER-PERFORMANCE-20261020.md`及按问题引用的实际结果
- `R19-REMAINING-UI-SCOPE-20261023.md`、`R19-MAP-MY-INTEGRATION-20261023.md`、`R19-SOURCE-PAGES-IMPLEMENTATION-20261022.md`
- `R27-GEN33-TARGET-RESULT-20261023.md`、`R28-FIRST-ACCEPTED-COSTS-20261023.md`
- `.codex/skills/starward-miniapp-development/references/performance-investigation.md`
- `project_context/external-capabilities.md`、`data-pipelines/runtime-data/README.md`及各管线README

这些记录中的历史成功、失败、哈希和机型均有各自范围。它们不是要求你重复全部实验，也不是要求你沿用原判断；请以当前审查commit的源码和可取得证据形成独立结论。
