# WeChat Mini Program Screen Contract: Starward

## Authority And Product Boundary

- This Context owns the durable route, region, Control, state, navigation, interaction and accessibility responsibilities of the independent WeChat Mini Program delivery. Product and technical meaning originates in the accepted proposal closure indexed by `docs/wechat-miniapp-v2-1-1-source.md`, then is superseded where the owner explicitly changes current product responsibility in this Screen Contract and its Product Surface. Proposal filenames and labels identify immutable provenance, not parallel products. Exact visual values come only from `DESIGN.md#wechat-mini-program--sky-canvas-field-signal`.
- Owner direction on 2026-09-03 changes the current information architecture: the Map owns a floating Search entry, a dedicated point-search page and one three-extent spot information panel; retired detail/night/professional/target parents do not remain as compatibility routes. All panel extents now retain the same objective document and use extent only as viewport clipping, with valid media pulled out during medium-to-large. A compact no-media handle band, handle-only rectangular drag zone, media-before-chrome sequencing, flush/short rails, compact Search suggestions/rhythm, pale active surfaces, one `none | spot-panel | layer-sheet` presentation coordinator, raised draggable arrowless ruler, one `day | night | observation` Settings control and restrained colored-icon My hierarchy supersede the previous current expressions without altering formal-spot, weather, astronomy, safety, moderation or identity truth.

## Design And Implementation Boundary

- DESIGN.md owns the independent Mini Program visual profile and tokens. This contract owns page, control, state and interaction meaning; production components own implementation.
- No prototype, selected resource, Open Design project, snapshot or hash needs to be created, read or synchronized for ordinary UI work. Verify the real WEAPP screens directly.
- Keep product-facing content relevant to the user's decision. Internal resource identifiers, review notes and development explanations do not belong in production UI. Isolated fixtures must remain identifiable as test data without repeated explanatory content.
- Reuse existing Taro/Starward component and icon owners. Adopt a library only when it fits these boundaries; do not introduce another icon, state or design system.

- The carrier is WEAPP-only and independently completable under `apps/wechat-miniapp/**`. It does not replace, prove or inherit the native App, and a generated Web/H5 page is not a product route or visual baseline. Shared domain/contracts/adapters are reused only through declared boundaries.
- Within the carrier there is one current implementation. Current changes replace owner-held routes, compositions, stores and acceptance lanes in place; parallel old/new page trees or compatibility products are forbidden. Protocol versions remain confined to protocol boundaries.
- A newly recorded location remains an incomplete operator candidate until the server-owned formal-spot completeness policy passes. User reports and media remain contributor-scoped provisional records; only authenticated operations can merge them into canonical evidence and rerun publication. Map Search and the information panel receive only formal spots.
- Primary navigation is exactly Map and My. Astronomy information has no primary or standalone parent route. `sky/detail` is reachable only from `云观星` in a visible formal spot information panel carrying valid `spot_id` and Observation Context; ordinary POIs or current location cannot synthesize it.
- Verification boundary: native map/canvas/sensor, production layout/pixel/accessibility/motion/interaction, real provider facts, coordinate authorization and real WeChat identity/isolation require independent final-candidate verification through their owning runtime lanes. Provider or screenshot success cannot close them.

## Route And Package Ownership

- Main package: `pages/map/index`, `pages/my/index`, `pages/auth/index`, permission rationale and error/recovery pages. Only Map and My appear in persistent primary navigation.
- Map/Search state owner: `pages/map/index` owns the one physical map, selected formal spot, information-panel extent, one `none | spot-panel | layer-sheet` bottom presentation and Observation Context. Spot package `spot/search` is a child Search/filter/results route; it reuses the Map query/filter/selection owner and returns a committed result to the existing map rather than mounting another map. `spot/guides`, `spot/field` and `spot/data-source` remain optional progressive evidence routes entered from the panel. `spot/detail` and `spot/sky` are retired.
- Sky package: only `sky/detail` remains current. It is the sensor-following `方位天空` child entered from `map-spot-information-panel` through `spot-cloud-stargazing-action`. It inherits the formal `spot_id`, selected date/time, timezone and data/algorithm revision; missing or invalid context fails closed. `sky/professional` and `sky/targets` are retired because their content is now ordered in the panel's continuous astronomy section.
- Content/user package: `article/detail` remains a supporting evidence route; the nine current product routes include `plan/detail`, `contribution/index`, `settings`, `profile/links` and `content/import`. Routine favorite browsing is the Search page's `想去` partition rather than a separate My/Favorites route. Profile Link and Import are current `miniapp-profile-content` drilldowns from My; they retain the shared API/state owners and must not survive as versioned compatibility products if a later selected topology retires them.
- Permission settings report availability, never a successful position fix. Only an explicit one-shot location action acquires position. Returning to the default trial region restores the default viewport and removes the prior selected place, query, information panel, Observation Context, overlay and pending focus restoration through the Map state owner while retaining committed filters, preferences, favorites, plans and search history. Results from requests started before reset cannot restore stale context or publish stale success.
- Deep links activate Map or My before an allowed child route. Back closes route-owned overlays first, returns from Search/evidence/orientation routes to the same useful parent position and focus, then pops the stack; it never invents a third primary destination. Search's leading Back, WeChat/system Back and platform edge-back share one reversible transition and restore the stationary Map field. While the same Map-owned panel is at `large`, left-edge Back semantics and handle-only downward collapse both resolve to `medium` before any Map-route pop and retain the selected formal spot; a handle press/tap without a qualified drag is not a Back or extent command.

## Contract Detail Routing

This path remains the sole canonical adoption record and stable Screen Contract owner. The registered children below are normative continuations of this contract, not separate authorities; read every child whose Surface, Control, state or condition is affected.

- [地点详情的信息密度、层级与布局选择](wechat-miniapp/information-design.md)
- [Five stable Surfaces and complete material Control inventory](wechat-miniapp/surfaces-and-controls.md)
- [Map, Search, spot-information-panel and observation-context invariants](wechat-miniapp/map-and-finder.md)
- [Continuous spot information, astronomy, full-sky and source-lift invariants](wechat-miniapp/spot-and-sky.md)
- [Shared manipulation, accessibility, settings, import, notification and recovery invariants](wechat-miniapp/shared-state-and-recovery.md)

## Verification Ownership

- The real WEAPP route owners plus `tools/miniapp/run-wechat-devtools-session.mjs` own current-candidate production journeys and responsive/accessibility/fault checks; `tools/miniapp/**` owns isolated build, WeChat DevTools lifecycle, candidate fingerprinting, evidence collection and teardown. The removed browser/H5 acceptance directory has no successor proxy.
- Resource integrity inspection proves only resource identity/completeness. Production conformance requires current Taro build plus WeChat DevTools/runtime observations, deterministic data/adapter checks, and design/interaction/accessibility assertions on the same final candidate.
- Representative physical-device/sensor/field validation is useful external evidence but cannot silently replace the machine-verifiable current contract. Any truly unavailable external prerequisite is an explicitly unverified external prerequisite and cannot be hidden in a complete claim.
