# WeChat Mini Program Screen Contract: Starward

## Authority And Product Boundary

- This Context owns the durable route, region, Control, state, navigation, interaction and accessibility responsibilities of the independent WeChat Mini Program delivery. Product and technical meaning comes from the immutable V2.0 product/technical plans indexed by `docs/wechat-miniapp-v2-source.md`; exact visual values come only from `DESIGN.md#wechat-mini-program--soft-instruments-v1`.
- The formal handoff `docs/design-resources/miniapp-selected-handoff-2026-08-06/miniapp-complete-product-selected-v1.md` and its complete frozen resource closure are selected `reference + constraint` inputs. They do not prove production conformance and cannot replace this Screen Contract, the V2.0 plans, or runtime checks.
- The Mini Program is an independently completable product carrier under `apps/wechat-miniapp/**`. It does not replace, prove, or inherit the native React Native App. Shared domain/contracts/adapters may be reused only through their declared boundaries.
- Primary navigation is exactly Map and My. Night Sky has no global destination and is reachable only from a formal Spot Detail context carrying a valid `spot_id`. An ordinary POI or current location cannot synthesize that context.

## Route And Package Ownership

- Main package: `pages/map/index`, `pages/my/index`, `pages/auth/index`, permission rationale and error/recovery pages. Only Map and My appear in the persistent primary navigation.
- Spot package: `spot/detail`, `spot/guides`, `spot/field`, `spot/sky`, `spot/photos`, and `spot/data-source`. `spot/detail` owns the fixed header and the Overview/Guides/Site/Night Sky segment contract; segment payloads load independently and preserve the same formal `spot_id`.
- Sky package: `sky/detail`, `sky/map`, `sky/observe`, and `sky/targets`. Every entry is delegated by `spot/sky` with the same `spot_id`, date/time, timezone and data/algorithm revision; missing or invalid `spot_id` fails closed.
- Content/user package: `article/detail`, `favorite/list`, `plan/detail`, `profile/links`, `content/import`, gated `submission/*`, and `settings/*`.
- Deep links activate the owning Map or My root before entering a subpackage route. Back closes route-owned overlays first, then pops the subpackage stack, and never invents a third primary destination.

## Stable Product Surfaces

### `miniapp-map-discovery`

- Primary question: Which formal stargazing spot fits the selected place, date, conditions and filters, and how can I proceed safely?
- Main surface owns: one-time location request with manual fallback, grouped search, viewport restoration, 27 flat terminal filters with draft/apply/cancel/reset semantics, source-dated light layer, marker/card/route shared selection, and explicit external-navigation handoff.
- It forbids: ordinary POIs masquerading as formal spots, stale draft restoration, straight-line distance described as a route, unlabelled sample facts, and filters split across competing stores.

### `miniapp-spot-detail`

- Primary question: Is this named formal spot suitable, reachable, trustworthy and safe tonight?
- Main surface owns: fixed identity/actions, Overview/Guides/Site/Night Sky segmentation, representative media first with source/license/site status, hard-blocker-aware Tonight conclusion, route/facility/provenance evidence, and favorite/navigation/plan actions.
- It forbids: safety blockers averaged into a positive recommendation, missing facts rendered as zero, unlicensed or non-site media presented as site truth, and duplicated static requests when only dynamic date context changes.

### `miniapp-spot-night`

- Primary question: What can be observed from this formal spot and how can the user orient and execute without losing dark adaptation?
- Main surface owns: understandable summary, professional aligned data, structured target recommendations, versioned 2D sky map and time scrubber, sensor quality/manual orientation fallback, and closed warm-red observation mode with offline freshness.
- It forbids: a global/current-location sky route, example targets presented as live facts, AR/full deep-sky catalogue in Demo, white flashes in observation mode, and sensor-only essential actions.

### `miniapp-my-library`

- Primary question: How can the user manage identity, favorites, plans and settings without mixing their responsibilities?
- Main surface owns: equal-width My/Favorites/Plan/Settings route tabs (2×2 under large text), concise profile home, medium-density favorites, recoverable plan editing, and settings/preferences that affect ranking/explanation only.
- It forbids: horizontal page scrolling for the four tabs, plan summary or official sample article cards on My home, a duplicate spot detail, and dynamic-provider failure deleting the static favorite relation.

### `miniapp-profile-content`

- Primary question: How can the user manage external profile links and import their own stargazing post while preserving rights, lineage, moderation and point identity?
- Main surface owns: neutral external link records, URL validation and copy-first fallback; `SOURCE → EDIT_DRAFT → ASSOCIATE_SPOT → PREVIEW → SUBMIT`; rights attestation; manual import; parser/license gates; editable draft protection; formal `spot_id` association or independent `spot_proposal_id`; moderation and EXIF/location sanitization.
- It forbids: platform affiliation claims, dangerous schemes, automatic parsing without allowlist/license/SSRF controls, parser retry overwriting edited fields, a proposal creating a formal `spot_id`, and unreviewed public UGC.

## Stable Control Inventory

The following keys are the complete material Control inventory for the selected Demo scope. Repeated list rows/markers reuse the owning family key rather than creating hidden semantics.

- Shell/shared: `mini-primary-navigation`, `display-mode-switcher`, `data-source-disclosure`, `page-state-recovery`.
- Map: `map-search-box`, `map-location-control`, `map-filter-entry`, `map-filter-sheet`, `map-layer-selector`, `map-marker-card-coordinator`, `map-selected-spot-card`, `map-ordinary-place-result`, `external-navigation-action`.
- Spot detail: `spot-header-actions`, `spot-segment-tabs`, `spot-media-gallery`, `spot-tonight-decision`, `spot-route-summary`, `spot-facility-evidence`, `spot-favorite-action`, `guide-article-viewer`.
- Spot Night: `sky-summary-tabs`, `sky-professional-matrix`, `sky-target-list`, `sky-time-scrubber`, `sky-map-canvas`, `sky-orientation-control`, `observation-mode-control`.
- My/library: `my-route-tabs`, `my-profile-home`, `favorite-list`, `plan-editor`, `settings-form`.
- Profile/content: `profile-link-editor`, `profile-link-open-copy`, `import-source-rights`, `import-draft-editor`, `import-spot-association`, `import-preview-submit`.

## Cross-Control And State Invariants

- `mini-primary-navigation` and `my-route-tabs` are distinct: the former owns only Map/My; the latter owns My/Favorites/Plan/Settings within the My branch.
- `map-filter-entry` and `map-filter-sheet` share one schema and one committed filter state. Cancel/gesture-dismiss returns to the last committed state; Apply commits atomically; Reset changes the draft until applied.
- `map-marker-card-coordinator`, `map-selected-spot-card`, route context and accessibility list expose one selected formal spot. Camera/gesture presentation may be transient, but the domain selection commits once and restores after route roundtrip/background recovery.
- `spot-segment-tabs` preserves the formal spot identity while each segment owns loading/error/retry. A date/time change refreshes Tonight/Sky dynamic data without re-requesting immutable facilities/media unless their freshness policy requires it.
- `spot-tonight-decision` applies independent hard blockers before scoring. Any applicable hard blocker produces an effective “不建议” conclusion; explanatory score/reasons cannot override it.
- `spot-favorite-action` is optimistic but must roll back visibly on failure. `favorite-list` retains the underlying relation when dynamic summaries are stale or unavailable.
- `sky-time-scrubber`, `sky-map-canvas`, `sky-professional-matrix` and `sky-target-list` share one versioned spot/time context. Sensor changes presentation orientation only; they do not alter astronomical truth.
- `display-mode-switcher` preserves route, focus order, selection and information hierarchy across day/night/observation. Observation mode is reachable only in the formal spot-night journey and exits to the exact prior mode/context.
- `profile-link-open-copy` always retains Copy when Try Open is gated, denied or fails. URL save and open reject dangerous schemes and invalid/unsupported destinations without losing the draft.
- Import controls preserve edited fields across parser failure/retry. `import-spot-association` treats `spot_id` and `spot_proposal_id` as disjoint states; submission of a proposal never creates a formal point before its independent review.
- `page-state-recovery` is the shared recovery family for INITIAL/LOADING/READY/EMPTY/PARTIAL/STALE/ERROR/PERMISSION_DENIED. It never substitutes realistic fake values for missing data and never hides usable static content because a dynamic layer failed.

## Responsive, Motion And Accessibility Contract

- The production surface consumes the 750rpx target with 320/375/430 CSS-pixel checks, safe areas and large-text 2×2 fallbacks. Page-level horizontal scrolling is forbidden; only an explicitly owned bounded row/matrix may scroll on its documented axis.
- Every actionable control owns at least an 88rpx/44px hit region, has a programmatic accessible name/role/state, communicates selection/risk with more than color, and has a keyboard/accessibility-list equivalent where the native map/canvas is not directly operable.
- Press, sheet, state and mode transitions follow the DESIGN target; gestures are interruptible and retarget from live position. Reduced motion replaces spatial travel with immediate or at-most-100ms opacity changes while preserving state feedback.
- Day/night/observation retain semantic role parity. Observation is a closed black/warm-red palette; media is opt-in, skeletons cannot flash white, and system/native boundaries must avoid an unowned bright transition.

## Verification Ownership

- `tests/acceptance/miniapp/**` owns current-candidate production journeys and responsive/accessibility/fault checks; `tools/miniapp/**` owns isolated build, WeChat DevTools lifecycle, candidate fingerprinting, evidence collection and teardown.
- Formal input preflight proves only resource identity/completeness. Production conformance requires current Taro build plus WeChat DevTools/runtime observations, deterministic data/adapter checks, and design/interaction/accessibility assertions on the same final candidate.
- Representative physical-device/sensor/field validation is useful external evidence but is not allowed to silently replace the machine-verifiable Demo contract. Any truly unavailable external prerequisite must be declared as an External Confirmation and cannot be hidden in a complete claim.
