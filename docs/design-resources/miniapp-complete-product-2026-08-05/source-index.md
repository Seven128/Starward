# 《今晚去观星》微信小程序全产品设计资源 Source Index

Status: task-local, unselected design-resource commission source. This file is not Design Authority, Product Surface, Screen Contract, implementation handoff, production acceptance, or a rewrite of either attached plan.

Goal thread: `019fd140-810a-74b0-82c3-64d63c9e8440`

Authoring date: `2026-08-05`

## 1. Commission ceiling and audit checkpoint

The commission covers the complete **user-facing WeChat Mini Program** described by the product plan and the technical architecture/implementation plan, across the Demo baseline and the named commercial enhancements. It preserves the already generated map-page suite and closes every remaining material page, flow, control, state, mode, responsive, motion, accessibility, privacy, degradation, and provenance decision needed for a greenfield product team to review the UI/UX without inventing the missing detail.

The requested stopping point is after the complete minimum-sufficient design-resource suite has been generated and independently checked, but before any formal implementation handoff text or selected-source fact manifest is authored. Human review at that point does not adopt the candidate.

In scope:

- Global Mini Program shell, navigation, context propagation, capsule/safe-area behavior, and all user-facing routes.
- Map family, including the already completed and reviewed-as-candidate four-resource map-page package.
- Spot detail family: overview, field, sky, guides, photos, source/provenance, route/facility detail, and external navigation chooser.
- Night family: summary, professional data, target list, simplified sky map, observation-red mode, and location/date/time context selection.
- My/user/content family: favorites, lightweight observation plan, profile, settings, authentication, permission/privacy/protocol surfaces, article detail, submissions/corrections/field reports/media upload, moderation status, and commercial-only user records.
- Shared component/control grammar, all material interaction and motion rules, all visual modes, responsive/adaptive rules, enlarged text, focus/read order, and accessibility consequences.
- Demo and commercial conditions, feature-gated differences, honest degradation, technical state consequences, privacy/coordinate constraints, and source/freshness semantics.

Explicitly not in this visual commission:

- A styled operations/admin console. The plans require one, so its responsibilities and Mini Program dependencies are indexed as a supporting boundary, but the adopted Mini Program design system is not authority for a desktop admin surface. A separate admin Design Authority and separate commission are required before styling it.
- Backend dashboards, observability consoles, deployment UI, database tooling, provider portals, or moderation-vendor UI.
- Payment, SMS, public comments/ratings in Demo, complex social graphs, multi-point trip planning, continuous location tracking, complete AR, or in-Mini-Program turn-by-turn navigation.
- Production code, API implementation, runtime packages, WeChat project bootstrap, tests, Context adoption, `DESIGN.md` edits, Product Surface/Screen Contract adoption, or edits to the two attached plans.
- Formal handoff text, formal selected-source Expected Fact Universe, canonical acquisition manifest, or production conformance claims.

## 2. Frozen input identity and authority roles

| Input | Frozen identity | Role |
| --- | --- | --- |
| Product plan | `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_Demo基线与商用增强版.md`; 50,220 bytes; 1,768 lines; SHA-256 `641F11B9BC000278040D35CC895FBBF5B45F85194E4566E0B9F05081EBBE0BF2` | Task-local product meaning and requested candidate scope |
| Technical plan | `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_Demo基线与商用增强版_V1.0.md`; 75,935 bytes; 2,425 lines; SHA-256 `7D48822A49A2FD1E93344F1FE31D9B144F4D0C79D9E42C47435E16FAF220F122` | Feasibility, visible state, degradation, route, security, data, and lifecycle constraints; product plan wins product conflicts |
| Root Design Authority | `DESIGN.md`; 45,277 bytes; 513 lines; SHA-256 `45DDFECF8AD3C9DA7EDC94312F15D3684D513603B5F317A91ADE1DE264E4CEB0` | Durable authority routing; owns the adopted Mini Program visual target below |
| Adopted Mini Program target | `DESIGN.md#wechat-mini-program--soft-instruments-v1`; target key `target.system.wechat-miniapp-soft-instruments-2026-08-05` | Exact visual-system target for this platform |
| Canonical Mini Program source | `docs/design-resources/miniapp-design-system-2026-08-05/candidate-design-brief.md`; 28,427 bytes; 374 lines; SHA-256 `AB1FAEB96A3E52125B19FDF8F224CAF6CEE0DB79CF16A9A12F86C5AF49991745` | Adopted target interpretation and exact token/component/asset/motion posture |
| Open Design system binding | `user:soft-instruments`; prior verified provider digest `5DD2E7ACF43973793A8AE70BD0DB8266C7253F27EBDEB6D944657B83E3A855E6` | Mandatory style-bearing generation binding |
| Project Context | `project_context/global.md`, `architecture.md`, `context.toml`, `areas/main.md`, `development-workflow.md`, `areas/main/verification.md`, plus bounded Mini Program/Surface/permission/content search | Authority, privacy, no-full-App-parity, truthfulness, and current adoption boundary |
| Existing map suite | `docs/design-resources/miniapp-map-page-2026-08-05/**` and its recorded Open Design identities | Existing-covered part of the complete suite; retain exact current versions |
| Native App and inactive admin resources | Current React Native/App resources, inactive selected targets, legacy `docs/design-system/**` exports | Background only; forbidden as Mini Program visual input |

Authority order for this commission:

1. Explicit user corrections and review deltas own the affected task-local requirement.
2. Product/safety/privacy meaning comes from the product plan and controlling project Context.
3. The technical plan supplies visible feasibility and lifecycle consequences and explicitly yields to the product plan on product conflicts.
4. `target.system.wechat-miniapp-soft-instruments-2026-08-05` owns exact Mini Program styling, visual tokens, mode palettes, component posture, motion posture, and semantic asset rules.
5. Existing runtime/native App appearance does not redefine the Mini Program.

Current durable-boundary conflict: project Context says no Mini Program Product Surface, Screen Contract, runtime, workspace, or CI has been adopted, and a future Mini Program cannot be treated as full native-App parity. The attached plans nevertheless specify a rich Mini Program candidate. Therefore every generated artifact must remain visibly task-local and unselected; it may represent the plans completely but may not claim project adoption or App completion.

## 3. Product promise, users, and invariant decision path

Product promise: help a user answer, with understandable evidence, **where to go, whether tonight is worth going, how to arrive safely, and what to observe on site**.

Primary audiences:

- Newcomers who need a simple conclusion and safe next action.
- Practiced field observers who need reliable field, route, weather, darkness, and target information.
- Astrophotographers who need light-pollution direction, obstruction, lunar/darkness windows, target direction, foreground, and equipment-relevant evidence.
- Advanced users who need professional data, source/provenance, confidence, and explicit uncertainty without overwhelming the first decision layer.

Canonical decision path:

1. Enter a usable map region, with or without location permission.
2. Search, browse, filter, and compare spots.
3. Select one spot and inspect a concise synchronized card.
4. Open the full spot detail and judge tonight, field, route, facilities, risks, source, and freshness.
5. Enter Night in the selected spot context or choose a location/date/time directly.
6. Inspect the best window, detailed sky/weather evidence, target direction, and simplified sky map.
7. At the site, manually enter observation-red mode and use only essential field information.
8. Save/favorite, optionally create a lightweight plan, read guidance, or hand the reviewed destination to an external map.

No confidence score, average, AI narrative, or attractive visual may override a hard safety blocker. Missing data is never zero. Estimated/sample/stale/partial data remains explicitly marked. Beyond hard expiry, a stale decision cannot continue to appear as `推荐`.

## 4. Global shell and navigation responsibility

The proposed fixed global navigation has exactly three destinations in this order:

- `夜空` — location/date/time-based observing conditions, professional data, sky map, and field observation mode.
- `地图` — default entry; browse, compare, filter, and select spots. It is the central, visually dominant destination.
- `我的` — favorites, profile, submission records, preferences, and settings.

Global rules:

- The bottom bar is global shell responsibility, not a local map control.
- Position and selected semantics remain consistent across the three first-level modules.
- Selection is never color-only; use icon/label/weight/fill/indicator or another redundant cue.
- A detail route may hide or suppress the global bar when needed, but back navigation must restore the originating first-level context and state.
- Spot detail → Night carries `spot_id` and the same location/date/time context.
- Bottom-nav → Night uses one-time location only after a clear user action or allows manual location selection.
- All three visual modes preserve current route, selected spot/location, date/time, unsaved safe work, and relevant local state.
- Mini Program top geometry reserves WeChat capsule/status safe space; no title, action, sheet close control, or focus ring can collide with it.

## 5. Complete user-facing surface census

The following census is the scope ceiling. A “surface” may be a route, modal/sheet, major segment, or stateful subflow; it does not require one output file per row.

| ID | Route/surface | Responsibility and material content | Availability |
| --- | --- | --- | --- |
| G-01 | Global shell | capsule/safe area, current route title/context, three-item nav, mode persistence, return restoration | Demo + commercial |
| M-01 | `pages/map/index` | default map, search, filters, layers, markers/clusters, selected card, route overview, permission/manual region, recovery | Demo + commercial; existing-covered |
| S-01 | `spot/detail` shell | fixed back/name/favorite/address/navigation header; sticky Overview/Field/Night/Guide segments; lazy segment loading | Demo + commercial |
| S-02 | Spot Overview | tonight conclusion, best window, reasons, risks, confidence, route summary, facilities, representative media, guide summary, source/update | Demo + commercial |
| S-03 | `spot/field` | arrival, last road, parking/stay, facilities, observing environment, obstruction/light direction, safety, seasonal/unknown facts | Demo + commercial |
| S-04 | `spot/sky` | same SkyContext; understandable conclusion first, weather/darkness/moon/galaxy/targets, entry to pro data/sky map | Demo + commercial |
| S-05 | `spot/guides` | official/author/user guidance, route/parking/season/photo/safety content, source labels and freshness | Demo + commercial, source mix differs |
| S-06 | `spot/photos` | full gallery, source/uploader/verification, example/pending/failed media states, no false real-place implication | Demo + commercial |
| S-07 | `spot/data-source` | sources, licenses/attribution, last update, estimate/confidence/coverage, conflict handling, freshness and unavailable facts | Demo + commercial |
| S-08 | Route & facility detail | complete last-mile and facility evidence, seasonal/unknown states, selected external destination, safety note | Demo + commercial |
| S-09 | External-map chooser | destination preview, available vendor/system choices, unthemeable-surface warning in observation mode, cancel/return | Demo + commercial |
| N-01 | `pages/night/index` | location/date/time header; tonight conclusion; best window; weather/cloud; moon/darkness; galaxy/targets; sky-map/pro-data entry | Demo + commercial |
| N-02 | Location/date/time picker | current/spot/manual city/ordinary place context; calendar/time; timezone/cross-midnight ownership; permission/manual path | Demo + commercial |
| N-03 | `sky/detail` | professional hourly matrix and derived windows with units, legends, source, update, missing/stale/partial treatment | Demo + commercial |
| N-04 | `sky/targets` | target list, visibility/window/direction/altitude, reason and difficulty, filter/search; no fabricated precision | Demo + commercial |
| N-05 | `sky/map` | simplified 2D/hemisphere sky map, direction ring, horizon, constellation lines, bright stars, planets, Moon, Milky Way center, target, time slider | Demo; enhanced commercially |
| N-06 | Sky-map sensor state | calibrated/low-precision/unavailable/manual direction, explicit accuracy and recovery | Demo + commercial |
| N-07 | `sky/observe` | manual black/warm-red field mode, essential time/direction/target/weather-change/return data, keep-awake notice, offline cache | Demo + commercial |
| Y-01 | `pages/my/index` | profile summary, favorites, lightweight plan, preferences, settings, commercial contributions/status entry | Demo + commercial |
| Y-02 | `favorite/list` | medium-density spot cards, distance/favorite-time/recent-condition sorting, tonight state, open detail, optimistic unfavorite/rollback | Demo + commercial |
| Y-03 | `plan/detail` | lightweight saved observation plan: spot, date/window, route/safety summary, reminders and state freshness | Demo-limited + commercial |
| Y-04 | Profile | avatar/nickname/counts/basic preferences; commercial author/contributor status, uploads, records | Demo + commercial delta |
| Y-05 | `settings/*` root | grouped modes, units, location, permissions, source, notifications, privacy, storage, account, about/protocol/feedback | Demo + commercial |
| Y-06 | Mode settings | automatic/default day/night choice and explicit observation entry rules; no surprise auto observation switch | Demo + commercial |
| Y-07 | Unit settings | temperature, distance, wind-speed units; preview and immediate semantic update | Demo + commercial |
| Y-08 | Location & permission settings | default location, permission state, point-of-use explanation, system settings route, manual alternative | Demo + commercial |
| Y-09 | Data source & update settings/info | source categories, update policy, estimate/sample explanation, attribution links | Demo + commercial |
| Y-10 | Notifications/subscriptions | reminder value explanation, WeChat subscription request at point of use, subscribed/declined/expired states | Commercial; Demo may show unavailable/hidden |
| Y-11 | Privacy/account/data | privacy controls, location handling, cache clear, export/delete data, account deletion confirmation and progress | Commercial; policy pages in Demo |
| Y-12 | About/protocol/feedback | version/build provenance, service/privacy protocols, licenses/attribution, feedback entry | Demo + commercial |
| A-01 | `pages/auth/index` | guest value preview, WeChat login rationale, consent, success/cancel/failure, resume originating task | Commercial/auth-gated actions; guest Demo path |
| C-01 | `article/detail` | title/source/author/verification/date/update/related spot; rich content; useful next action; loading/failure/offline | Demo + commercial |
| C-02 | Submission hub/record | draft, submitted, pending, approved, rejected, published, hidden, disputed, archived; correction and appeal/history | Commercial or whitelist |
| C-03 | Submit/correct spot | location sensitivity, field/facility facts, evidence, source, consent, save draft, validation, review notice | Commercial or whitelist |
| C-04 | Field report/correction | structured current road/facility/season/safety observation, effective date, evidence, moderation notice | Commercial or whitelist |
| C-05 | Media upload | choose/compress/upload/retry/remove/reorder/caption/source; EXIF GPS removal notice; moderation status | Commercial or whitelist |
| C-06 | Article submission | title/body/media/spot association/source/rights/preview/draft/submit/rejection recovery | Commercial or whitelist |
| C-07 | User contribution profile | own public/pending/hidden content, contributor status, correction history | Commercial |
| P-01 | Permission explanation | location, photos/camera, sensor, notifications; why/when/what remains without permission | Demo + commercial as applicable |
| P-02 | Privacy/protocol | concise summary plus complete policy, consent version, effective date, external-link state | Demo + commercial |
| P-03 | Data provenance explainer | official/verified author/user/provider/calculated/estimated/sample distinctions and update/conflict posture | Demo + commercial |
| P-04 | Common error page | recoverable explanation, retry/back/manual alternative/contact, reference ID only when useful | Demo + commercial |
| P-05 | Global offline/update feedback | cache age, last update, background refresh, refresh failure, restored online state without geometry jump | Demo + commercial |

Supporting non-Mini-Program boundary, indexed but not visually styled here:

- Operations/admin must manage spot lifecycle and coordinates, content, data freshness, source/license, user reports/corrections, moderation, audit history, feature flags, and commercial review. Mini Program designs may show the resulting status and recovery path, but they do not define the admin interaction model.

## 6. Spot detail family requirements

### 6.1 Shared shell

- Fixed header: back, spot name, favorite, address/approximate-location posture, and navigation entry.
- Sticky segments: `概览 / 场地 / 夜空 / 攻略`; segment changes preserve header context and scroll restoration.
- Initial request loads header + Overview only. Other segments load on first entry, cache independently, expose independent failure/retry, and never erase still-usable sibling content.
- Changing date/time refreshes only tonight/sky dynamic content; static facilities/field data do not reload or visually reset.
- Bottom action layer has a single dominant next action appropriate to context; favorite and navigation remain distinct actions.

### 6.2 Overview

- Tonight conclusion: `推荐 / 可考虑 / 不建议 / 数据不足` with redundant icon/text/shape cue.
- Best observation window, two-to-four understandable reasons, explicit risks/hard blockers, confidence, update time, and source-summary entry.
- Route summary: distance, driving time, walking tail when material, last-road/parking note, and failure/stale posture.
- Core facilities: available/unavailable/unknown/seasonal, never color-only.
- Representative media: authentic supplied media or clearly persistent `示例 / 实景待补 / 审核中` state.
- Guide summary and entry to complete guide content.

### 6.3 Field

- Arrival: route class, drive accessibility, public transit if known, walking/climbing tail, last-road condition, restricted/closed destination posture.
- Parking/stay: location relative to observing area, capacity/uncertainty, overnight/season limits, camping posture.
- Facilities: toilet, charging, power, signal, shelter/platform, water/food when known; unknown is explicit.
- Observing environment: elevation, open-sky/obstruction percentage and direction, light-pollution grade/estimate/direction, ground/wind exposure, foreground suitability.
- Safety: severe weather, road, wildlife, cliff/water, fire/camping, access-hours/closure, emergency/return reminders. Hard blockers are visually prominent but not sensational.

### 6.4 Sky and guides

- Spot Sky and top-level Night use one `SkyContext`; the same spot/date/time may not display contradictory calculations.
- First layer remains understandable; professional tables are a drilldown.
- Guides clearly mark official/verified author/ordinary user, publish/update, related spot, field-tested status, and platform verification.

## 7. Night, professional data, sky map, and observation mode

Every astronomy view is parameterized by `location + local date + time + timezone`, optionally `spot_id` and target profile. Cross-midnight attribution belongs to the shared SkyContext and must not be reinterpreted per screen.

Night home order:

1. Location/date/time selector.
2. Tonight conclusion and best window.
3. Weather/cloud/precipitation/wind visibility summary.
4. Moon and darkness window.
5. Milky Way and recommended targets with direction.
6. Simplified sky map entry.
7. Professional data entry and source/update.

Professional data must cover, when available:

- Hourly cloud/precipitation/wind/temperature/humidity/visibility.
- Sunset, twilight boundaries, darkness, Moon rise/set/phase/altitude/interference, moonless interval.
- Milky Way center/visibility window/direction and target altitude/azimuth/window.
- Consistent units, sticky row/column help as needed, legends, selected hour, missing cells, partial hours, stale rows, estimated/sample labels, source and update time.

Sky map:

- Demo uses a simplified 2D or hemisphere representation, not a complete star catalogue or camera AR.
- Show orientation ring, horizon, principal constellation lines, bright stars, planets, Moon, Milky Way center/region, selected target, legend, and a date/time slider.
- Support target selection/find, current-time reset, manual orientation, and a clear sensor state: available/calibrated, low precision, unavailable, or manual.
- Sensor motion is not required for understanding; manual controls remain fully usable.
- Commercial enhancements may add richer catalogue, device alignment, 360 navigation, target filters, field-of-view frame, or WebGL, while retaining the same semantic controls.

Observation mode:

- Manual enter and manual exit; never surprise-switch based on time or ambient light.
- Exact controlled palette is black plus warm red only. No white/cool pixel, white image placeholder, white flash, bright skeleton, unthemeable modal, or whole-screen filter.
- Show only essential time, direction, selected target, next window, weather-change alert, offline/update age, return/navigation action, and optional keep-awake state.
- Cache the relevant next hours before entry when possible. Offline preserves last-known values with age and never claims freshness.
- Images do not auto-open. An external vendor/system surface requires a pre-handoff warning and cancel path.
- Large targets, reduced animation, no decorative glow/particles, and no color-only urgency.

## 8. My, favorites, settings, auth, and content

Favorites:

- Medium-density spot cards show name, tonight state, distance or selected location relation, saved time/recent condition, compact facilities/freshness, and detail entry.
- Sorting supports distance, favorite time, and recent conditions.
- Favorite mutation is optimistic but failure restores the previous state and explains recovery. Dynamic-summary failure never deletes the favorite.

Lightweight observation plan:

- Spot, date/window, selected target/profile, route/last-mile and safety summary, reminder state, saved update time, and source freshness.
- It is not multi-user project planning and does not become complex itinerary optimization.

Profile/settings:

- Demo profile stays concise. Commercial profile may add articles, uploaded spots/photos, observing/photo records, moderation status, and contributor identity.
- Settings must expose modes, units, default location/permission, data source/update explanation, notification/subscription, privacy, cache clear, account/data deletion/export, about/protocols, and feedback.
- Destructive account/data actions require explicit confirmation, consequence explanation, progress/result, and failure recovery; no deceptive dark pattern.

Authentication:

- Guest users can browse public map/spot/night/content value.
- Ask for WeChat login only at an action that requires identity, explain the benefit, minimize data, preserve the originating task, and provide cancel/failure/retry.
- Login state cannot silently broaden location/media/notification consent.

Content and UGC:

- Content types include spot introductions, route/parking guidance, field status, seasonal advice, Milky Way/star-trail/phone/camera guidance, observing records, and safety.
- Always label source class, author, publish/update, related spot, field-tested status, and platform verification.
- Demo is official/whitelist-led; user suggestions/corrections are private pending review and not auto-published.
- Commercial adds spot/photo/article submissions, review/report/takedown/correction/version/appeal history, and coordinate protection. Comments/ratings are supplementary evidence, never a replacement for official/realtime data.
- Media flow exposes choosing, validation, compression, upload progress, pause/failure/retry/remove/reorder, caption/source/rights, EXIF GPS removal, moderation, and resulting content state.

Moderation status mapping:

- `DRAFT` → `草稿`
- `PENDING_REVIEW` → `审核中`
- `APPROVED` → `已通过，待发布` when the distinction is user-relevant
- `REJECTED` → `未通过` with reason and edit/resubmit path
- `PUBLISHED` → `已发布`
- `HIDDEN` → `已隐藏/已下架` with reason when allowed
- `DISPUTED` → `处理中/申诉中`
- `ARCHIVED` → `已归档`

## 9. Shared component and control census

The complete suite must make exact anatomy, dimensions, variants, state feedback, copy, focus/read order, and mode consequences inspectable for these app-specific families. Generic repetitions may be grouped; unique semantic controls may not be replaced by a label-only list.

1. Global shell: capsule-safe header, back/title/actions, three-item bottom navigation, badge/indicator, mode-aware safe areas.
2. TonightDecision: four outcome states, best window, reason/risk/confidence, hard-blocked and expired consequences.
3. Source/Freshness: source class, update time, fresh/stale/partial/expired/unavailable/estimated/sample; compact and detailed forms.
4. Spot cards: map compact, favorite medium, full-detail modules; favorite, closed/suspended/restricted, loading/media placeholder.
5. Facilities/field facts: available/unavailable/unknown/seasonal; grouped summary and row/detail forms.
6. Route/navigation: route summary, last mile, cached route, straight-line fallback, restricted destination, external vendor chooser/warning.
7. Segmented navigation: sticky `概览/场地/夜空/攻略`, overflow and enlarged-text behavior, independent loading/error.
8. Location/date/time: current/spot/manual source, permission state, calendar/time slider, timezone/cross-midnight label, reset.
9. Hourly/professional data matrix: selected hour, frozen header/labels as needed, legends, missing/partial/stale cells, units.
10. Target controls: target card/list, search/filter, altitude/azimuth/direction/window/difficulty, selected target.
11. Sky-map controls: direction ring, horizon, legend, selected target, time scrubber, play/step/current-time, sensor/manual calibration.
12. Observation controls: manual enter/exit, essential alert, keep-awake, offline/update age, vendor warning.
13. Favorite/saved-plan controls: optimistic state, rollback, sort, reminder subscription state.
14. Settings rows: navigation/toggle/choice/status/destructive row, permission status, inline explanation and validation.
15. Authentication/consent: login value card, consent acknowledgment, cancel/retry/success and task resume.
16. Article/media: source header, rich media placeholder, gallery, upload tile, progress/retry/remove/reorder, moderation overlays.
17. Submission form: section/group, required/optional/help/error, draft save, coordinate sensitivity, source/rights, submit/review result.
18. Common feedback: skeleton, empty, partial, stale, offline, error, permission denied, toast/banner/inline error, destructive confirmation.
19. Semantic Tier-A icons: navigation, search, filter, favorite, location, route, facility, weather, moon, target, time, source, warning, upload, settings.
20. Tier-B subjects only where semantically justified by the adopted system: four/five-point stars, tent, telescope, binoculars, camera, backpack, neutral avatar. No extra decorative vocabulary.

## 10. Complete state, freshness, and error model

Every major surface must have an explicit disposition for the technical page states:

- `INITIAL`
- `LOADING`
- `READY`
- `EMPTY`
- `PARTIAL`
- `STALE`
- `ERROR`
- `PERMISSION_DENIED`

Freshness states:

- `FRESH`
- `STALE_USABLE`
- `PARTIAL`
- `EXPIRED`
- `UNAVAILABLE`
- `ESTIMATED`
- `SAMPLE_DATA`

State rules:

- Skeleton geometry matches the final content and never flashes white in observation mode.
- `PARTIAL` names the unavailable portion and retains usable facts.
- `STALE` names data age and permits refresh without clearing geometry.
- `EXPIRED` cannot retain a positive tonight recommendation.
- `UNAVAILABLE` does not fabricate a fallback value.
- `ESTIMATED` and `SAMPLE_DATA` remain persistent labels, not momentary notices.
- Permission denial explains what still works and provides manual/alternative action.
- Offline/cache-only shows last update and pending refresh; reconnection updates without unexpected focus or layout movement.

Spot lifecycle presented in user language:

- draft (not public), published, suspended, closed, archived.

Facility states:

- available, unavailable, unknown, seasonal.

Coordinate visibility:

- exact, approximate, restricted, hidden. Exact coordinates and external navigation are withheld when the state does not permit them.

Visible error families, translated to calm user language rather than raw codes:

- `AUTH_REQUIRED`
- `LOCATION_PERMISSION_DENIED`
- `INVALID_COORDINATE_SYSTEM`
- `SPOT_NOT_FOUND`
- `SPOT_COORDINATE_RESTRICTED`
- `WEATHER_UNAVAILABLE`
- `WEATHER_EXPIRED`
- `ASTRONOMY_COMPUTE_FAILED`
- `ROUTE_UNAVAILABLE`
- `DECISION_BLOCKED`
- `INSUFFICIENT_DATA`
- `UPLOAD_REJECTED`
- `MODERATION_PENDING`
- `RATE_LIMITED`
- `BUDGET_GUARD_TRIGGERED`
- `PROVIDER_DEGRADED`

## 11. Mode, visual, motion, responsive, and accessibility anchors

Mandatory Open Design system: `user:soft-instruments`.

Core exact anchors:

- `750rpx` reference canvas; `8rpx` base step; `32rpx` page inset; `24rpx` compact inset; `40rpx` section gap; `24rpx` grid/card gap; `28rpx` card padding.
- Minimum interactive region `88rpx / 44 CSS px`; functional glyph target around `40rpx`.
- Day: canvas `#F5F8FC`, surface `#FFFFFF`, primary `#1769D2`.
- Night: canvas `#050A14`, surface `#0B1626`, primary `#5AA7FF`.
- Observation: canvas `#000000`, surface `#0B0101`, primary `#FF514A`; controlled output contains no cool/white pixel.
- Press feedback begins within `<=100ms`; release/cancel recovery `120ms`; ordinary state `160ms`; sheet `220ms`; mode transition `240ms`; reduced motion `0–100ms`.
- No broad glass/blur, bloom/glow, particle field, generic gradient spectacle, or whole-control pressed scaling.
- Tier A functional icons dominate. Tier B is restricted to the adopted eight semantic subjects.

Responsive/adaptive conditions to expose:

- CSS widths around `320`, `375`, and `430`; primary geometry remains understandable at all three.
- WeChat capsule/status/safe-area variations and bottom home-indicator area.
- Enlarged Chinese text with no clipped primary action, overlapping capsule, hidden state label, or inaccessible segment.
- Portrait is primary. Landscape or short-height posture must be explicitly constrained for sky map/observation/data matrix rather than silently broken.
- Scroll ownership is explicit: page versus sticky header versus horizontal segment/chip/data region versus bottom sheet.
- Keyboard/focus-visible behavior is represented for review even though final Mini Program accessibility proof needs the native runtime.

Accessibility requirements:

- Every status uses text/shape/icon/weight in addition to color.
- Logical read order follows visual task order; sheet/modal traps focus conceptually and returns focus to its trigger.
- Controls have accessible names that include object and state, not icon names alone.
- Minimum hit size and spacing remain valid under enlarged text.
- Motion is non-essential and has reduced-motion substitution.
- Charts, sky map, and hourly matrix provide textual summaries/legends; essential information is not canvas-only.
- Observation mode low luminance does not justify unreadable contrast; its exact red hierarchy remains distinguishable without adding white.

## 12. Interaction and state-ownership invariants

- One source of truth owns selected spot, SkyContext, favorite state, filter draft/commit, and submission state. Parallel panels do not diverge.
- Touch-down feedback does not equal commit; drag-away, cancel, disable-before-release, or interrupted gesture cannot trigger the action.
- Bottom sheets and time scrubbing are interruptible and retarget from live state. Reduced motion replaces large translation with immediate or short-fade state change.
- Sticky segment changes preserve each segment’s scroll position and load state.
- Leaving and returning restores the relevant first-level context. Map restoration includes center, zoom, committed filters, selected spot, layer, loaded viewport, and card state.
- Mode changes preserve route and safe task state. Observation mode entry/exit does not change selected place/date/time.
- Date/time changes update every dependent tonight/sky view through the shared context; static field facts remain stable.
- External vendor/system surfaces are a handoff boundary; observation mode warns before an unthemeable transition.
- Destructive/account actions and content submission require explicit commit and result feedback.
- Haptics are supplemental only and never required for understanding.

## 13. Demo and commercial condition matrix

Demo baseline must visibly support:

- 20–50 curated pilot spots and the complete find → decide → route/site → external navigation/observe loop.
- Map/search/filters/layers/markers/card/detail, TonightDecision, field/route/facility evidence, Night summary, professional data, simplified sky map, observation-red mode, favorites, official/whitelist content, settings, source/freshness, privacy/permission, offline/degradation.
- User correction/suggestion may be private pending review; it is not auto-published.
- Trial-region/sample/estimated data is persistently labelled. No nationwide or realtime entitlement is implied.

Commercial enhancements are rendered as explicit gated states or variants, not assumed present in Demo:

- WeChat user identity and self-owned records.
- User spot/photo/article submission, correction, report, appeal/history, moderation and takedown states.
- Subscription reminders and notification preference.
- Personalization/target profiles and richer saved plans.
- Protected coordinates and differentiated public/approximate/restricted/hidden behavior.
- Richer sky catalogue/sensor alignment/filters and optional advanced rendering while preserving the base semantics.
- Broader provider redundancy and degradation messages; the UI never exposes provider secrets or internal cost controls.

Commercial degradation examples to represent:

- Map search provider failure → keep current map/known spots/history/manual region; label search temporarily unavailable.
- Weather primary failure → show valid cached/secondary normalized data with source/time, or unavailable; never fabricate.
- Light-pollution layer failure → hide unavailable overlay while preserving valid spot-level estimate and label the limitation.
- Image/moderation failure → preserve draft/upload state, explain retry/pending; do not silently publish or discard.
- AI failure → retain deterministic data/rules; no invented narrative or decision.

## 14. Map-page existing-covered binding and exact review delta

The complete suite incorporates, without silent regeneration, the four existing Open Design map resources:

| Artifact | Role | Current SHA-256 |
| --- | --- | --- |
| `miniapp-map-page-2026-08-05/index.html` | Interactive high-fidelity map prototype and twenty page scenarios | `58775ED37ACDD7B5E56D96CF1299ADD42AA8FEB18FA9569F04E8A9F8116E745F` |
| `miniapp-map-page-2026-08-05/page-anatomy.html` | 320/375/430 anatomy, z-order, safe area, gesture ownership | `12C7E1F54FE28992C95C38752D51B391EC707A7045D315B0D75F65A29C4E9F3B` |
| `miniapp-map-page-2026-08-05/component-control-atlas.html` | Map-specific component/control states and measurements | `939502E4383B0515CC564E2C25775340116F93B2F6A38AE3027B24C946074FF8` |
| `miniapp-map-page-2026-08-05/interaction-motion-accessibility.html` | Map interactions, motion, focus, restoration, accessibility | `512675134320375895FF62220243B674F4A0119E798199AAF3A177316F17729C` |

Canonical provider identity:

- Open Design project `starward-miniapp-map-page-2026-08-05`.
- Main filter-revision run `8f1eec5f-419b-4a92-b91b-bec1b7e1bec6`.
- Final focused repair `4b97c29d-9c18-487a-81f4-61a5837c4d52`.
- Repair conversation `37c11529-9de5-4c4b-8f74-dd5152263492`.

Exact filter hierarchy supplied by the user and already present in the map suite:

- `观星条件`
  - `光害等级`: `2级以下`, `3级以下`, `4级以下`, `5级以下`, `6级以下`
  - `遮挡`: `遮挡面积 50% 以下`, `遮挡面积 30% 以下`, `无遮挡`
  - `光害方向`: `全部无光害`, `西边无光害`, `东北无光害`
- `观测点`
  - `驾车时间`: `2小时内`, `4小时内`, `6小时内`
  - `行程信息`: `驾车直达`, `公共交通`, `不要徒步`, `不要登山`
  - `海拔`: `1000米以下`, `2000米以下`, `3000米以下`, `4000米以下`, `6000米以下`
- `场地信息`: `有停车`, `有厕所`, `可充电`, `能露营`

Pending review assumptions remain unadopted:

- Light grade, obstruction, light direction, drive time, and elevation are single-select/deselectable.
- Journey and site information are multi-select.
- `全部无光害` is exclusive with directional choices.
- One expandable parent is open at a time.
- Filter editing uses draft versus committed state; Apply commits, close/back/cancel discards, Reset affects the draft until Apply.

Exact boundaries/calculation/provenance/API mapping for filter values remain decision-required before adoption; design resources must not invent a backend formula.

## 15. Technical feasibility constraints with visible impact

- Client target is Taro + React + TypeScript, with WeChat native map/sensors/upload/share behind platform adapters. The resources remain implementation-independent and do not represent a WebView map as the primary Demo path.
- Page/BFF boundaries aggregate normalized data. UI never exposes raw QWeather/map/COS/provider fields or reimplements the tonight score.
- Map viewport uses `bbox + zoom + selectedDate + filters + layerVersion`, buffered requests, 200–350ms pan-end debounce, previous-request cancellation, cluster/spot level-of-detail, stable restoration, and no spinner on every pan frame.
- Spot shell loads Overview first; Field/Sky/Guides load and recover independently. Media is lazy and non-blocking.
- Simplified sky map uses Canvas 2D in Demo with manual fallback when sensors are unavailable/low precision. A textual summary remains available.
- Observation mode uses independent tokens and cached critical data; no white flash or default image auto-open.
- Upload flow has a durable session/progress model, EXIF GPS removal, moderation, retry, and preserved draft state.
- Client cache may restore stale usable data immediately and revalidate in the background. Refresh cannot clear the selected spot or shift stable controls unexpectedly.
- Any performance target, provider availability, native safe area, accessibility service, haptic, compass precision, or real-device behavior remains unproven until implementation/device checks.

## 16. Decision-required and deliberately unresolved items

The candidate may show a coherent review assumption but must label or record these as unresolved rather than silently turning them into product truth:

- Adoption of the three-item global navigation and Map as durable default Product Surface.
- Exact Bortle/light-grade mapping, threshold inclusivity, obstruction algorithm, directional reference frame, and data provenance for the revised filters.
- Exact hard-blocker thresholds, confidence thresholds, time-window rounding, and when an expired decision changes to data-insufficient.
- Exact provider entitlements, map/vendor availability, nationwide layer coverage, license/attribution copy, and commercial rollout regions.
- Exact content/report/appeal policy, moderation SLA, contributor levels, and publication/legal copy.
- Exact account deletion/export SLA, retention, notification cadence, and personalized recommendation rules.
- Whether commercial sky rendering uses richer Canvas, WebGL, or another approved path after device testing.
- Separate operations/admin Design Authority and design-resource commission.

No fabricated approval number, provider entitlement, legal certification, SLA, real location coordinate, real-place photograph, or performance result may appear.

## 17. Architecture deliberation and workflow boundary

Affected owners: task-local Mini Program design-resource candidate; adopted Mini Program Design Authority; product/technical plans as task-local constraints; future Mini Program Product Surface, runtime, BFF, domain, platform adapters, content/moderation, and operations remain upstream/downstream owners and are not edited.

Current extension points and sources of truth:

- Visual truth: `target.system.wechat-miniapp-soft-instruments-2026-08-05` / `user:soft-instruments`.
- Product meaning for this candidate: attached product plan plus explicit user deltas.
- Feasibility/state boundary: attached technical plan.
- Durable project authority/adoption: existing `project_context/**` and `DESIGN.md`; neither changes in authoring.
- Existing map truth: the exact four retained Open Design artifacts and hashes above.

Selected design: one coherent Mini Program candidate expressed through the smallest grouped artifact count that still exposes every material screen/control/state/interaction fact. Alternatives rejected: one screenshot per page (too duplicative and weak on behavior), one enormous prototype alone (insufficient component/state inspectability), Figma duplication before selection (second representation), and borrowing native App/admin visuals (wrong authority).

Future-change challenge: commercial UGC, richer sky rendering, or provider/coordinate policy may expand. The candidate isolates these as gated variants and shared semantic components so changes do not require a parallel visual system or duplicate decision truth.

Quality preservation:

- Correctness/invariants: shared selected spot, SkyContext, freshness, and moderation meanings are explicitly centralized across resources.
- Maintainability/changeability: grouped resources reuse the adopted token/component grammar; page specimens do not create competing local tokens.
- Reliability/lifecycle: loading/partial/stale/offline/permission/provider/upload/moderation recovery is first-class.
- Security/privacy/safety: minimum permission, coordinate visibility, EXIF removal, hard blockers, external-vendor boundaries, and no secret/provider fabrication are explicit.
- Performance/capacity/cost: designs avoid unbounded map overlays, full-catalogue Demo rendering, blocking media, and reload churn, but make no runtime performance claim.
- Compatibility/accessibility: 320/375/430, capsule/safe area, enlarged text, reduced motion, non-color cues, and manual sensor fallback are explicit; real-device proof remains pending.
- Operability/testability: named state/scenario switches and deterministic sample labels support later implementation checks without claiming them now.

Forbidden shortcuts: changing the original plans during audit, adopting the candidate, writing formal handoff text, inventing missing policy/data, using a generic/local design system, collapsing all failure states to one error screen, using observation as a screen filter, omitting commercial-only surfaces, or treating a gallery label as component detail.

`Context Delta: none` — generating an unselected, task-local design candidate changes no durable project fact.

## 18. Review and non-claims

The final pre-handoff review promise is to:

- Render every retained and newly generated artifact.
- Exercise every interactive prototype’s local navigation, state, mode, sheet/form, date/time, sensor/manual, upload/moderation, and recovery controls.
- Check 320/375/430 widths, enlarged text, short-height/landscape constraints where relevant, hit regions, scroll ownership, focus/read order, reduced motion, and observation palette closure.
- Check every surface/control/state row in the separate coverage matrix has one exact artifact disposition.
- Cross-check shared values and state language across prototypes, atlases, and the existing map suite.
- Verify no external network/font/media dependency, no corrupt/overflowing output, no obvious console/runtime errors, and no realistic unlabeled sample data.
- Preserve exact Open Design project/conversation/run/artifact identities and byte hashes in this source index after generation.

This candidate cannot prove WeChat native behavior, real provider data, legal acceptance, licensed media, performance, device/sensor precision, production accessibility, Product Surface adoption, implementation readiness, or native App parity. Those claims remain outside this pre-handoff audit checkpoint.

## 19. Open Design generation and independent-audit ledger

This ledger is task-local recovery state for the pre-handoff audit checkpoint. It is not an implementation handoff and does not adopt any candidate.

Provider binding:

- Open Design project: `starward-miniapp-complete-product-2026-08-05`.
- Conversation: `92c8ae92-241e-492a-95f7-d0666ce30e3d`.
- Design system: `user:soft-instruments`.
- Design-system digest: `5dd2e7acf43973793a8ae70bd0db8266c7253f27ebdeb6d944657b83e3a855e6`.
- Agent/model/reasoning: `codex` / `gpt-5.6-sol` / `xhigh` (`xhigh` is the highest reasoning level exposed by this Open Design Codex agent).
- Session mode: `design`.

Generation runs:

- `246f8763-8562-4d93-8ab0-52c4966809fe`: succeeded; APP-01 and APP-02; exit `0`; no unfinished work.
- `009a913c-2bdb-4a99-89d8-80f259b6f4f8`: succeeded; APP-03 and APP-04; exit `0`; no unfinished work.
- `0f74527e-6c41-41a7-bc45-96100e6a6d60`: succeeded; APP-05 and APP-06; exit `0`; no unfinished work.
- `4ce5b94b-33b9-477d-89a1-3b9aaa51eab1`: succeeded; APP-07 and APP-08; exit `0`; no unfinished work. During its own browser QA it repaired APP-07's ambiguous abbreviated combination key and APP-08's Tier-B audit selector plus unbound scale-sample color roles, then reran the affected checks.
- `e3a3da2a-070a-42c7-ad01-3e099fc5552f`: canceled before edits because its start metadata exposed `reasoning: null`; artifact count `0`. It is not a candidate-producing run.
- `88340e0f-e022-4588-9e0e-31e9d5defc22`: succeeded; focused APP-01 through APP-06 repair; exit `0`; artifact count `6`; no unfinished work. Start/final state confirms `gpt-5.6-sol` / `xhigh`, the exact design-system digest above, and the same project/conversation.
- `e55567af-215c-4b89-9ac4-0ec0a8872d56`: succeeded; MAP-01 review-chrome repair; exit `0`; unfinished flag `true` because the provider-local Browser surface was unavailable. The repaired artifact remained complete and was verified independently below.
- `1c126cc2-4881-4756-8038-18c2236cff1f`: succeeded; final MAP-01 observation-ring repair; exit `0`; artifact count `1`; `gpt-5.6-sol` / `xhigh`; unfinished flag `true` only because the provider-local Browser surface was again unavailable. Independent current-file Browser verification below closes the artifact review, without rewriting the provider run state.
- Final independent cross-suite audit: complete on the exact hashes below; human selection remains pending.

Canonical generated-resource state for user audit:

- APP-01 `app-flow-and-route-map.html`: generated.
- APP-02 `spot-detail-prototype.html`: generated.
- APP-03 `night-sky-prototype.html`: generated.
- APP-04 `my-content-prototype.html`: generated.
- APP-05 `shared-component-control-atlas.html`: generated.
- APP-06 `cross-app-interaction-motion-accessibility.html`: generated.
- APP-07 `responsive-mode-state-matrix.html`: generated.
- APP-08 `semantic-asset-atlas.html`: generated.

Independent audit facts already established:

- MAP-01 through MAP-04 contain every exact revised filter label listed in §14.
- APP-01 has all 43 route/surface entries and all 12 named journeys; no duplicate IDs, external dependencies, console warning/error, or document-level overflow in checked widths.
- APP-02 preserves restricted-coordinate navigation blocking and favorite optimistic rollback; no duplicate IDs, external dependencies, console warning/error, or document-level overflow in checked widths.
- APP-03 has no duplicate IDs or external dependencies; 320/375/430 have no document-level overflow or visible sub-44px product targets; sensor-unavailable/manual fallback and time-step/reset work; observation colors are black plus warm-red roles only.
- APP-04 has no duplicate IDs or external dependencies; 320/375/430 have no document-level overflow or visible sub-44px product targets; Demo/commercial/auth gates, all eight moderation states, and observation palette closure are present.
- APP-05 exposes 20/20 component families, no duplicate IDs or external dependencies, no console errors, no document-level overflow or uncovered sub-44px targets at 320/375/430 and enlarged 320px, and correct modal focus return in the checked external-map sample.
- APP-07 exposes the complete deterministic axis product `3 widths × 3 postures × 2 text scales × 3 modes × 7 page families × 8 technical states × 7 freshness states × 10 special scenarios = 211,680` dispositions. Independent checks found no duplicate IDs, external dependencies, console errors, document-level overflow, or visible sub-44px targets at 320/375/430 and enlarged 320px. A non-default Night/landscape/large-text/error/expired/provider-degraded combination updated its live specimen and audit log coherently. Observation computed colors were black plus warm-red roles only, and native range/checkbox geometry is explicitly authored.
- APP-08 renders 35/35 Tier-A icons across seven functional groups and exactly eight Tier-B subject cards, with 400 inline SVG instances and no external assets. Independent checks found no duplicate IDs, external dependencies, console errors, document-level overflow, or visible sub-44px targets at 320/375/430 and 140% text scale. Its interactive state inspector works; day/night/observation switching preserves geometry; observation computed colors and repaired scale samples are black plus warm-red roles only. The repaired built-in audit reports Tier-A `35`, Tier-B `8/8`, external dependencies `0`, sub-44px targets `0`, overflow `无`, and observation shadow `无`.

Repair history, all resolved before user audit:

- MAP-01: review buttons/select are now at least 44px; the motion switch is 46×44; the product observation ring no longer uses an inset shadow; the four map artifacts retain every exact revised filter label. MAP-03's short search input remains correctly owned by a 44px clickable field label.
- APP-01: every top journey tab and visible route/review action is at least 44×44.
- APP-02: every visible link-style action is at least 44×44; restricted-coordinate external navigation and favorite rollback still work.
- APP-03: stable logical focus keys restore a live visible trigger after observation exit and context/sensor/vendor sheet close-plus-render paths.
- APP-04: commercial reminder state no longer inherits Demo unavailability; login resumes only after signed-in commercial identity renders; reminder, destructive, route, edition, observation and close-plus-render paths restore logical focus.
- APP-05: WebKit/Firefox range track and thumb use controlled semantic roles; observation is black/warm-red with no visible shadow/filter.
- APP-06: native range styling, favorite state/accessibility/two-consumer rollback, semantic trapped Sheet, named segment retry, filter draft/committed/two-consumer synchronization, upload/subscription/moderation/destructive/permission/offline recovery and focus behavior are coherent.
- APP-07 and APP-08: generation-time combination-key, Tier-B audit-selector and scale-sample lineage issues remain repaired and independently verified.

Current Open Design managed resource identities:

- Complete-product managed root: `C:/Users/777/AppData/Roaming/Open Design/launcher/channels/stable/namespaces/release-stable-win/versions/0.16.1/payload/resources/app/prebundled/.od/projects/starward-miniapp-complete-product-2026-08-05/`.
- Map managed root: `C:/Users/777/AppData/Roaming/Open Design/launcher/channels/stable/namespaces/release-stable-win/versions/0.16.1/payload/resources/app/prebundled/.od/projects/starward-miniapp-map-page-2026-08-05/`.
- The repository-retained MAP-01 snapshot in §14 remains the earlier audit baseline. The current user-audit candidate is the managed MAP-01 hash below; no unselected candidate was silently exported over the retained repository snapshot.

| ID | Managed file | Bytes | Current SHA-256 |
| --- | --- | ---: | --- |
| APP-01 | `app-flow-and-route-map.html` | 45,465 | `215F4D90209354B367F2D176C4EE84B003D15B3E1EFC5BE2015F272C4A14F189` |
| APP-02 | `spot-detail-prototype.html` | 56,162 | `1AFF72A2DA6968C7B80459B86D3393AF9D91FE41F8B4466007816601D4EFA430` |
| APP-03 | `night-sky-prototype.html` | 57,016 | `5A324D98EE8F1E2F1D1FEE1FB73B29F02E80698BC41E58DDD93FB743BF52CAF5` |
| APP-04 | `my-content-prototype.html` | 81,436 | `91EEB80BCFB2898EA77167D8D9EBA92C749C0459464FDB9FBDD01B92659A9897` |
| APP-05 | `shared-component-control-atlas.html` | 82,711 | `E95FA701B555DBC301DA8E1503948EE232B4E45BFA3C34120D73B365D641FD24` |
| APP-06 | `cross-app-interaction-motion-accessibility.html` | 92,159 | `F4B6FBD3E43C4F3D9F26AE5731F1A84614B1C2F52362578723767A52CF4AD700` |
| APP-07 | `responsive-mode-state-matrix.html` | 52,314 | `2F7248DCAB357F92D994FAB4A2A51A174828D588A7B35354CF96E0DFA9BED041` |
| APP-08 | `semantic-asset-atlas.html` | 49,841 | `971DD45581561B180D70D7FD42652859B183BFB6C7DA47039CA39C8C914635F0` |
| MAP-01 | `index.html` | 76,559 | `96E9D8F12C9A8A52ACE49213D9BEA2B7E44DAE277A2E3CBEB1E9685DD72F7E66` |
| MAP-02 | `page-anatomy.html` | 39,644 | `12C7E1F54FE28992C95C38752D51B391EC707A7045D315B0D75F65A29C4E9F3B` |
| MAP-03 | `component-control-atlas.html` | 59,969 | `939502E4383B0515CC564E2C25775340116F93B2F6A38AE3027B24C946074FF8` |
| MAP-04 | `interaction-motion-accessibility.html` | 58,820 | `512675134320375895FF62220243B674F4A0119E798199AAF3A177316F17729C` |

Final independent current-snapshot audit:

- Exact selected audit set: twelve standalone HTML resources, comprising eight complete-product resources and four retained/repaired map resources. No handoff text, README, gallery, screenshot pack or unrequested HTML is part of the selected audit set.
- Structural matrix: `12 resources × 3 widths = 36` checks at 320/375/430; duplicate IDs `0`, external dependencies `0`, document horizontal overflow `0`, visible effective targets below 44×44 `0`, and console errors `0`.
- Enlarged-text matrix: APP-01 through APP-06, APP-07 at 118%, APP-08 at 140%, and MAP-01's large-text scenario all pass at 320px with zero overflow, duplicate IDs, external dependencies or sub-44px targets.
- Observation pixels: APP-03 through APP-08 and the MAP-01 product layer use only black/dark-warm-red/warm-red computed colors; visible box-shadow, filter and text-shadow counts are `0`. Review infrastructure outside MAP-01 `#miniapp` remains ordinary audit chrome and is not production observation output.
- Interaction closure: APP-03/04 close-plus-render and observation paths restore a connected, visible logical trigger; APP-04 commercial login→reminder resumes with signed-in identity before the sheet; APP-06 favorite rollback, Sheet trap/Escape/opener return, segment retry and filter synchronization pass live checks.
- Coverage closure: APP-01 = 43 route/surface nodes and 12 journeys; APP-05 = 20/20 component families; APP-06 = 16/16 runnable labs; APP-07 = 211,680 exact axis dispositions; APP-08 = 35/35 Tier-A symbols, exactly 8 Tier-B subjects and 400 inline SVG instances; MAP-01 = 20 scenarios.
- Map delta closure: all 36 exact revised filter labels are present in each of MAP-01 through MAP-04; the MAP-01 filter scenario renders the visible filter sheet; final defaults are Day + ready + full motion.
- Artifact readiness: complete, retrievable and independently scope-sane for human audit. Human selection/adoption is intentionally pending; this is not an implementation handoff or production-conformance claim.

Open limitations and non-claims remain those in §16 and §18. Browser checks establish the standalone resource behavior only; they do not prove WeChat native rendering, device sensors, provider data, legal policy, runtime performance, production accessibility or implementation conformance.

## 20. Final selection, reconciliation and formal handoff — supersedes the §19 audit checkpoint

The owner subsequently completed the design audit, supplied MAP/SPOT/NIGHT/MY requirement changes, and explicitly authorized uninterrupted DRA completion. The “human selection pending / no handoff / original plans untouched” status in §19 is therefore historical and no longer current.

Final generation and consistency runs:

- APP-01—APP-04: `053f8cb4-43c8-4eb7-a518-26b894d06193`, succeeded.
- MAP-01—MAP-04: `0f1ba422-9844-419b-aa59-f022c8b82986`, succeeded.
- APP-05—APP-08: `efa214cb-d7bd-4d54-b031-28abd442d1ef`, succeeded with `gpt-5.6-sol` / `xhigh`.
- Cross-resource final repair: `2039ada0-c911-4396-87a8-d2008392cba6`, succeeded, exit `0`, no unfinished work. It repaired APP-02's whole-page horizontal overflow while preserving local gallery scrolling and revalidated APP-01—APP-06.

Final canonical Open Design artifact identities:

| ID | Managed file | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| APP-01 | `app-flow-and-route-map.html` | 47,216 | `6BAE53ABB1182F7ED88402A677996EB45902331F5B8D40B9EEA1F3ECE01498EA` |
| APP-02 | `spot-detail-prototype.html` | 665,614 | `38AD5BBAFBCEC0FB3F0FCCD70828758E3680EF50BEAA0E70C9422664634FA414` |
| APP-03 | `night-sky-prototype.html` | 56,980 | `BA24315112FB385AD61602FE0436829F2F92C3C681B418010859519C08103CE0` |
| APP-04 | `my-content-prototype.html` | 108,759 | `34AF973CD4ECE4AD000DA63FC456F0F6F4E57C93A0F27F6A5BCF3EB16CD2E59C` |
| APP-05 | `shared-component-control-atlas.html` | 955,293 | `FE9674EB2A304BA0A530045F194DB1B9217171AA3EDABAB62D701BBA76FC9D44` |
| APP-06 | `cross-app-interaction-motion-accessibility.html` | 369,691 | `C3B827B8700A21F3D04A5079E91F78187615DDF7E50AA9818517C491D1478615` |
| APP-07 | `responsive-mode-state-matrix.html` | 305,027 | `B043C46AE6DBDE8D83D1AE1E7A12CCD80BB781F02D81AA5DC7D5B6E255108319` |
| APP-08 | `semantic-asset-atlas.html` | 53,400 | `09FE77BC7D6F52A84FEA96FAFC8D85ADC1AB976FC5F43B58B16C50458BAD8534` |
| MAP-01 | `index.html` | 78,167 | `F079FA7D4FF5277E89EE2FA75413CF9471D52D2BD64DA2793D9F6908293D32D2` |
| MAP-02 | `page-anatomy.html` | 42,860 | `CA8F635966A7827CF914985132D13B52857D36E25529C70559A42E4BBDE12F9F` |
| MAP-03 | `component-control-atlas.html` | 60,577 | `27A25286F48D8A8746F98849CB8FA602A0D18610D6AE24B1E88090C90CC14CC0` |
| MAP-04 | `interaction-motion-accessibility.html` | 59,563 | `60263D4D398299CCDECDA8AA2E81AB2C511082D01F3AD23B6B6D51DFD95ED198` |

The immutable selected copy and formal outputs are:

- Selected resource package: `docs/design-resources/miniapp-selected-source-2026-08-06-v1/`.
- Formal handoff: `docs/design-resources/miniapp-selected-handoff-2026-08-06/miniapp-complete-product-selected-v1.md`, SHA-256 `d1e9513b93dc75319f6c2c2d37a242898803c16bf2266fabbecf44aa330d5ba3`.
- Canonical V1 manifest: `docs/design-resources/miniapp-selected-source-2026-08-06-v1/fact-manifest.json`, SHA-256 `91b4261b8bb0572473bf179cabf1af3992b3d0be3639a4ac9c397665b2df92b3`.
- Preflight: passed with one `constraint` target, 33 resources, 15 subjects, 218 properties, 3,270 fact cells, 15 exact whole-resource digest facts/proofs and zero acceptance blockers.
- The target is intentionally `reference + constraint`, not a deployable Web build or pixel-exact WeChat production target.

Proposal reconciliation is complete in:

- `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_Demo基线与商用增强版_V2.0.md`, SHA-256 `602592E4143050FF93987DA3259833F4E642830B85E885C0E28D30162CA69058`.
- `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_Demo基线与商用增强版_V2.0.md`, SHA-256 `BD15C4159C9B72CA31BE3418816EFBC6619B0C4AE9DED552A2BBEF82BD35E190`.

The two original plan files remain byte-identical to their indexed input hashes. `DESIGN.md`, `project_context/**`, production code and tests were not changed by DRA.
