# WeChat Mini Program Screen Contract: Starward

## Authority And Product Boundary

- This Context owns the durable route, region, Control, state, navigation, interaction and accessibility responsibilities of the independent WeChat Mini Program delivery. Product and technical meaning originates in the accepted proposal closure indexed by `docs/wechat-miniapp-v2-1-1-source.md`, then is superseded where the owner explicitly changes current product responsibility in this Screen Contract and its Product Surface. Proposal filenames and labels identify immutable provenance, not parallel products. Exact visual values come from `DESIGN.md#wechat-mini-program--sky-canvas-field-signal`, including its scoped adopted-page profile and the concrete resources linked below.
- Owner direction on 2026-09-03 changes the current information architecture: the Map owns a floating Search entry, a dedicated point-search page and one three-extent spot information panel; retired detail/night/professional/target parents do not remain as compatibility routes. All panel extents now retain the same objective document and use extent only as viewport clipping, with valid media pulled out during medium-to-large. A compact no-media handle band, handle-only rectangular drag zone, media-before-chrome sequencing, flush/short rails, compact Search suggestions/rhythm, pale active surfaces, one `none | spot-panel | layer-sheet | spot-editor` presentation coordinator, raised draggable arrowless ruler, one `day | night | observation` Settings control and restrained colored-icon My hierarchy supersede the previous current expressions without altering formal-spot, weather, astronomy, safety, moderation or identity truth.

## Design And Implementation Boundary

2026-09-22用户要求隔离旧生成页面，避免后续设计误用。Stitch历史混合项目已退出当前迭代基线；资源状态与项目清单见[Stitch隔离状态](../../../../docs/design-resources/wechat-miniapp/stitch-status.md)，当前源仍经[各页唯一采用入口](../../../../docs/design-resources/wechat-miniapp/README.md)进入。隔离保留现行采用及必要依赖，不代表最新源已重新同步到Stitch，也不授权改变抽屉、Tab或现用3D图标。

2026-09-13本轮是一个完整需求，包含地形、B行图标、天文事件Modal，以及整体UI/UX校验与Context对齐补开发四个部分，产品/技术Context与对应资源必须同时保持一致。变更基于现有采用页面增量完成：地图完整基本信息、三档拖动/单文档/照片查看、原天文内容，以及计划完整地点/观测时间/出发路线/提醒清单/备注/保存与返回不因局部改动而重构或删减。简化宿主不能替代完整页面作为当前资源；本轮最终增量视觉已于2026-09-13获用户确认采用，浏览器验证不代表生产完成。统一审阅及修改范围见[完整资源入口](../../../../docs/design-resources/wechat-miniapp/shared/astronomical-event-modal/README.md)。

本轮owner导航：[地形同级章节与数据边界](wechat-miniapp/spot-and-sky.md#地形以可获得数据为边界)、[地图流星入口/地形叠加与计划单选](wechat-miniapp/map-and-finder.md)、[共享事件Modal与B行图标](wechat-miniapp/shared-state-and-recovery.md)。旧两章节和独立事件页面采用稿只在未修改范围继续有效；当前设计采用与生产迁移分别记录。

- DESIGN.md owns the independent Mini Program visual profile and tokens. This contract owns page, control, state and interaction meaning; production components own implementation.
- Follow [Mini Program Page Design Resources](../../../context-maintenance.md#mini-program-page-design-resources) for page resource adoption and faithful implementation. For covered pages, reading and visually inspecting the adopted resource is mandatory; ordinary fixes do not require regenerating it. Keep exact current page-resource links and their state/theme scope with the relevant page owner in this contract or its normative children. Historical resource packages are not current inputs merely because they exist.
- Keep product-facing content relevant to the user's decision. Internal resource identifiers, review notes and development explanations do not belong in production UI. Isolated fixtures must remain identifiable as test data without repeated explanatory content.
- Reuse existing Taro/Starward component and icon owners. Adopt a library only when it fits these boundaries; do not introduce another icon, state or design system.

- The carrier is WEAPP-only and independently completable under `apps/wechat-miniapp/**`. It does not replace, prove or inherit the native App. An explicitly adopted generated design may supply a visual reference, but its Web/H5 rendering is neither a product route nor evidence of WEAPP conformance. Shared domain/contracts/adapters are reused only through declared boundaries.
- Within the carrier there is one current implementation. Current changes replace owner-held routes, compositions, stores and acceptance lanes in place; parallel old/new page trees or compatibility products are forbidden. Protocol versions remain confined to protocol boundaries.
- A newly recorded location remains an incomplete operator candidate until the server-owned formal-spot completeness policy passes. User reports and media remain contributor-scoped provisional records; only authenticated operations can merge them into canonical evidence and rerun publication. Public Map Search receives only formal spots. The same Map information component also renders authorized private drafts and submitted pending proposals under the identity/capability rules in Map and Search; private records never enter public spot queries.
- Primary navigation is exactly Map and My. Astronomy information has no primary or standalone parent route. `sky/detail` is reachable from `云观星` in a visible formal-spot or current-account pending-proposal information panel, carrying a server-validated typed identity and Observation Context. Private drafts, ordinary POIs and current location do not synthesize this entry.
- Verification boundary: native map/canvas/sensor, production layout/pixel/accessibility/motion/interaction, real provider facts, coordinate authorization and real WeChat identity/isolation require independent final-candidate verification through their owning runtime lanes. Provider or screenshot success cannot close them.

## Route And Package Ownership

<!-- ty-context-controlling-source domain="design" path="docs/design-resources/wechat-miniapp/map/ADOPTED.md" -->
<!-- ty-context-controlling-source domain="design" path="docs/design-resources/wechat-miniapp/search/ADOPTED.md" -->
<!-- ty-context-controlling-source domain="design" path="docs/design-resources/wechat-miniapp/my/ADOPTED.md" -->

- Map's sole adopted resource entry is [current Map design resources](../../../../docs/design-resources/wechat-miniapp/map/ADOPTED.md). On 2026-09-08 the owner adopted the final small/medium/large formal-spot information component, including basic/astronomy composition, its media/viewer and three bottom actions. Covered visual composition and demonstrated motion must be implemented faithfully; old medium component and historical candidates are superseded. The scope is daytime app-owned UI, not provider geography, fixture facts, unrelated pages/themes or production migration. DESIGN.md §5A.0 resolves shared-rule differences; uncovered states retain their existing owners.

- On 2026-09-08 the owner also adopted Map's daytime layer selector through the same Map resource entry: LIGHT annual nightlight hides time input, TOTAL_CLOUD is labelled 云量 with the common date/calendar/ruler, bulb/cloud icons and exclusive checked cards. The bottom choices remain anchored during content-height transitions; Map layer/spot information is mutually exclusive. The shared ruler continuously settles and supports interruption; its date/calendar follows the sample's local civil date across midnight while retaining the domain night grouping. This replaces the old layer candidates, including their point summary and three-choice layout. Production now uses the adopted single-shell selector and the Map presentation coordinator; current simulator and Android WEAPP verification cover its open/Back path, while iOS and physical tablet verification remain separate runtime evidence.

- Search's sole adopted resource entry is [current Search design resources](../../../../docs/design-resources/wechat-miniapp/search/ADOPTED.md). On 2026-09-08 the owner adopted the compact daytime Search page, its stationary Map/Search field, single-line horizontal filter strip and two-level filter sheet, independently collapsible result partitions and aligned borderless image cards. This replaces the earlier wrap-all filter composition and rejected Search candidates; DESIGN.md §5A.1–5A.2 resolves its shared visual differences, and [Map and Search invariants](wechat-miniapp/map-and-finder.md) owns commit/cancel and formal-spot selection. The resource's map is static and cards demonstrate press feedback only; adoption does not establish production navigation, map recentering, filtering, token migration or WEAPP verification. Other pages and unrepresented themes/states keep their existing owners.

- Main package: `pages/map/index`, `pages/my/index`, `pages/auth/index`, permission rationale and error/recovery pages. Only Map and My appear in persistent primary navigation.
- Map/Search state owner: `pages/map/index` owns the one physical map, one selected typed location (formal spot or authorized private draft/pending proposal), information-panel extent, one `none | spot-panel | layer-sheet | spot-editor` bottom presentation and Observation Context. Spot package `spot/search` is a child Search/filter/results route; it reuses the Map query/filter/selection owner and returns a committed result to the existing map rather than mounting another map. `spot/guides`, `spot/field` and `spot/data-source` remain optional progressive evidence routes entered from the panel. `spot/detail` and `spot/sky` are retired.
- Sky package: only `sky/detail` remains current. It is the sensor-following `方位天空` child entered from `map-spot-information-panel` through `spot-cloud-stargazing-action`. It inherits the formal `spot_id` or authorized pending `proposal_id`, selected date/time, timezone and data/algorithm revision; missing or invalid context fails closed. `sky/professional` and `sky/targets` are retired because their content is now ordered in the panel's continuous astronomy section.
- Content/user package: the nine current registered routes are `article/detail`, `plan/detail`, `plan/list`, `plan/edit`, `event/list`, `event/detail`, `contribution/index`, `spot-feedback/index` and `settings`. Routine favorite browsing is the Search page's `想去` partition rather than a separate My/Favorites route. Profile Link and Import are retired from the current route topology; their retained storage/API responsibilities do not restore retired navigation.
- Permission settings report availability, never a successful position fix. Only an explicit one-shot location action acquires position. Returning to the default trial region restores the default viewport and removes the prior selected place, query, information panel, Observation Context, overlay and pending focus restoration through the Map state owner while retaining committed filters, preferences, favorites, plans and search history. Results from requests started before reset cannot restore stale context or publish stale success.
- Deep links activate Map or My before an allowed child route. Back closes route-owned overlays first, returns from Search/evidence/orientation routes to the same useful parent position and focus, then pops the stack; it never invents a third primary destination. Search's leading Back, WeChat/system Back and platform edge-back share one reversible transition and restore the stationary Map field. While the same Map-owned panel is at `large`, left-edge Back semantics and handle-only downward collapse both resolve to `medium` before any Map-route pop and retain the selected formal spot; a handle press/tap without a qualified drag is not a Back or extent command.

## Contract Detail Routing

This path is the stable Screen Contract root and owns Map/Search/My adoption. The registered children below own their respective adoption scopes and normative continuations; declare each resource at that owner only, and read every child whose Surface, Control, state or condition is affected.

- [地点详情的信息密度、层级与布局选择](wechat-miniapp/information-design.md)
- [Five stable Surfaces and complete material Control inventory](wechat-miniapp/surfaces-and-controls.md)
- [Map, Search, spot-information-panel and observation-context invariants](wechat-miniapp/map-and-finder.md)
- [Continuous spot information, astronomy, full-sky and source-lift invariants](wechat-miniapp/spot-and-sky.md)
- [Shared manipulation, accessibility, settings, import, notification and recovery invariants](wechat-miniapp/shared-state-and-recovery.md)

## Verification Ownership

- The real WEAPP route owners plus `tools/miniapp/run-wechat-devtools-session.mjs` own current-candidate production journeys and responsive/accessibility/fault checks; `tools/miniapp/**` owns isolated build, WeChat DevTools lifecycle, candidate fingerprinting, evidence collection and teardown. The removed browser/H5 acceptance directory has no successor proxy.
- Resource integrity inspection proves only resource identity/completeness. Production conformance requires current Taro build plus WeChat DevTools/runtime observations, deterministic data/adapter checks, and design/interaction/accessibility assertions on the same final candidate.
- Representative physical-device/sensor/field validation is useful external evidence but cannot silently replace the machine-verifiable current contract. Any truly unavailable external prerequisite is an explicitly unverified external prerequisite and cannot be hidden in a complete claim.

The adopted daytime My root is owned by the sole [My resource entry](../../../../docs/design-resources/wechat-miniapp/my/ADOPTED.md). Product rules are in [My account and plans](wechat-miniapp/map-and-finder.md#my-account-and-plans); production route inventories describe existing implementation and do not override the adopted topology.

## 整体UIUX与Context对齐补开发

2026-09-13用户因上一轮实现漂移，明确把完整小程序的UI/UX校验、产品逻辑/技术架构/技术实现逻辑对齐与缺失功能补开发纳入本次同一需求。范围包括当前Map、Search、My、计划、创建/反馈、Sky及其现行子页面、共享组件、账户/权限/错误恢复流程；不是只验本轮地形和Modal，也不自动扩展到独立Native App或运营后台。

以本Screen Contract及相关owner、DESIGN和各页面ADOPTED入口为依据，逐项核对现有实现和真实消费者，修复不一致与缺失功能，完成相关服务/契约/状态责任的必要补齐。核对记录服务于实际修复，不能仅交审计清单或用改写Context来掩盖缺失。已采用资源约束其声明范围；未展示主题/状态沿用所属Context，不能从日间截图推定已覆盖。既有完整基本信息、手势、媒体、时间、计划行程/提醒及身份隔离不得被局部重构删减。

检查必须覆盖代表性身份与加载/空/失败/取消/返回/重复开关/前后台恢复，核对共享组件的全部实际消费者；对比同等视口、数据与状态下的采用资源和当前WEAPP结果，发现漂移即修复。协议/数据/权限由相应服务及适配层保证，页面不复制业务真值。静态原型、源码标记、单一截图或历史检查通过不证明当前产品完成。真实数据覆盖、原生地图叠加、设备动效/传感器等未验证项须具体列明，不能以缺失外部条件为由停止可独立完成的工作。

需求说明与开发起点在[本轮开发说明](../../../../docs/requirements/miniapp-uiux-alignment-2026-09-13.md)；具体规则仍由上述既有owner持有。
