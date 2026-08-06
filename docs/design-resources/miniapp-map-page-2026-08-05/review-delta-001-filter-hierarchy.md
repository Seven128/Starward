# MAP-R01 · 地图筛选层级与条件重构

Status: `pending-user-review`  
Recorded: `2026-08-05`  
Scope ceiling: 微信小程序地图页的“筛选观星点”Sheet、受其影响的快捷筛选表示、筛选状态说明与交互规格；不扩展到其他页面。  
Iteration intent: 更新同一套四份 Open Design 候选资源供继续审计；不生成 handoff，不回写原始产品/技术方案。

## 1. Source and baseline

Source: 当前对话中的用户审查意见。该意见是本轮候选生成的显式约束，但在用户选定最终资源前仍是 task-local pending delta，不是已回写产品 Authority。

Baseline Open Design project: `starward-miniapp-map-page-2026-08-05`，design system `user:soft-instruments`。

| Baseline canonical artifact | SHA-256 |
| --- | --- |
| `index.html` | `CBCD6DCF1550B4C399861144766E1BD2C5BD2CA187846A30129AE5E72A905A79` |
| `page-anatomy.html` | `68825CAEC4527E38FBE2726E0194A683636B15B4EAAE98A2D9E91F8BB317C6C9` |
| `component-control-atlas.html` | `F2CA47C57D314DE72B325117507068BE9DBD1601B6CF0C71FC6BA0361ACFE2F4` |
| `interaction-motion-accessibility.html` | `CE024DD35B33D98074C0C09EB1BA144F51D37690CAFC7D42BC2B8E05A350EC19` |

Controlling background remains:

- Product proposal SHA-256 `641F11B9BC000278040D35CC895FBBF5B45F85194E4566E0B9F05081EBBE0BF2`.
- Technical proposal SHA-256 `7D48822A49A2FD1E93344F1FE31D9B144F4D0C79D9E42C47435E16FAF220F122`.
- `DESIGN.md#wechat-mini-program--soft-instruments-v1`, repository SHA-256 `45DDFECF8AD3C9DA7EDC94312F15D3684D513603B5F317A91ADE1DE264E4CEB0`.
- Selected Mini Program design brief SHA-256 `AB1FAEB96A3E52125B19FDF8F224CAF6CEE0DB79CF16A9A12F86C5AF49991745`.

## 2. User feedback, preserved verbatim

> 在地图筛选观星点这个标签页下，目前有3个一级选项。首先，第一个1级选项，把名称从今晚条件改成观星条件。下面的可选项点击后需要出现2级可选标签，第一行第一个的今晚可考虑改成光害等级，光害等级下的二级标签分别是2级以下、3级以下、4级以下、5级以下和6级以下。第二个目前是光害较低的一级标签，改成遮挡，这个遮挡的二级标签下面写遮挡面积百分之50以下、30以下、无遮挡。第三个选项目前是适合摄影。把它改成光害方向。下面的二级标签分别是全部无光害、西边无光害、东北无光害。然后到第二行的到达与设施名字改成观测点一级标签第一个驾车时间，二级标签是两小时内，4小时内，6小时内。第二个一级标签写行程信息二级标签是驾车直达、公共交通、不要徒步、不要登山。第三个一级标签是海拔，二级标签是1000以下、2千以下，3000以下，4000以下，6000以下。第三个一级标签。首先把。名字同辅助图层改成场地信息，只有一级标签分别写着有停车、有厕所、可充电、能露营。

## 3. Normalized pending requirement

The Sheet has three top-level groups. “分组” is a visual section; “一级筛选项” is an expandable criterion inside a group; “二级标签” is a selectable terminal value.

### 3.1 分组一：`观星条件`

Rename the current group `今晚条件` to `观星条件`.

| 一级筛选项 | 二级标签，按此顺序 |
| --- | --- |
| `光害等级` | `2级以下`、`3级以下`、`4级以下`、`5级以下`、`6级以下` |
| `遮挡` | `遮挡面积 50% 以下`、`遮挡面积 30% 以下`、`无遮挡` |
| `光害方向` | `全部无光害`、`西边无光害`、`东北无光害` |

The old filter-parent labels `今晚可考虑`、`光害较低`、`适合摄影` are removed only from this filter taxonomy.

### 3.2 分组二：`观测点`

Rename the current group `到达与设施` to `观测点`.

| 一级筛选项 | 二级标签，按此顺序 |
| --- | --- |
| `驾车时间` | `2小时内`、`4小时内`、`6小时内` |
| `行程信息` | `驾车直达`、`公共交通`、`不要徒步`、`不要登山` |
| `海拔` | `1000米以下`、`2000米以下`、`3000米以下`、`4000米以下`、`6000米以下` |

`2千以下` is normalized only typographically to `2000米以下`; the threshold meaning is unchanged.

### 3.3 分组三：`场地信息`

Rename the current filter group `辅助图层` to `场地信息`. This group has no second level. Its first-level selectable tags, in order, are:

`有停车`、`有厕所`、`可充电`、`能露营`。

The disabled `实时云图 · 商用版待接入` item is removed from the filter Sheet. The separate `地图图层` Sheet, its light-pollution layer, legend, source, update time and failure behavior remain unchanged.

## 4. Provisional interaction interpretation for this review candidate

These choices make the feedback operable without treating unexpressed product semantics as final. They remain explicitly reviewable:

1. `光害等级`、`遮挡`、`光害方向`、`驾车时间`、`海拔` are deselectable single-choice sets within their own criterion because their threshold/direction values are mutually exclusive.
2. `行程信息` and all four `场地信息` tags are multi-select. `全部无光害` is mutually exclusive with directional light-pollution values.
3. Tapping an expandable first-level criterion toggles one inline second-level region. Only one criterion is expanded at a time across the Sheet; collapsing it never clears its selected value.
4. A collapsed parent keeps the selected value discoverable as text, for example `光害等级 · 4级以下`; multi-select parents use the selected labels when space permits and a readable count under pressure.
5. Expansion is presentation state, not a filter. The selected-count label counts selected terminal values only.
6. Sheet edits remain draft state. `应用筛选` commits once and closes; close/back/cancel discards uncommitted edits; `重置` clears every terminal selection but does not commit until Apply.
7. Applying filters preserves map center/zoom, selected spot, visual mode and other page state, then requests the filtered scene. A true zero-result result is distinct from missing/stale/provider-degraded data.
8. First-level disclosure controls expose expanded/collapsed state and own their second-level region. Terminal tags expose selected state. Every target remains at least `88rpx × 88rpx` (`44 × 44 CSS px` in the browser candidate), supports long Chinese text, visible focus and non-color selection.
9. Press-in feedback is same-frame/`≤100ms`, release/cancel `120ms`, second-level content swap `160ms`; reduced motion is immediate or `≤100ms` opacity only. No whole-control scale is used for map/filter controls.

## 5. Non-global replacement rules

- Do not globally replace `今晚可考虑`; it remains a legitimate map-card tonight status or layer label where the original product Source still uses it.
- Do not globally replace a spot/card's light-pollution summary such as `光害较低`; only the old filter-parent chip changes to `遮挡`.
- Do not remove or rename the separate map-layer affordance merely because the old filter group was named `辅助图层`.
- `驾车时间` remains valid in route/card metrics and is also the new expandable filter criterion.
- Existing map, marker, card, route, search, layer, permission, offline, stale, error, three-mode and restoration behavior remains in scope and must not regress.

## 6. Product/technical implications held pending selection

- The original product proposal still marks the exact light-pollution scale/Bortle mapping as unresolved. The candidate must call the values `产品估算等级` or otherwise avoid claiming measured Bortle truth.
- `遮挡面积百分比` is a new semantic compared with the technical proposal's directional obstruction-height model. Its calculation, source, freshness and relation to directional obstruction remain `decision-required` for later product/technical reconciliation.
- `光害方向` is a new derived field. The meaning and data source for `全部无光害`、`西边无光害`、`东北无光害` remain `decision-required`; the design may show the requested user language but cannot claim the algorithm exists.
- Public-transport availability, driving access, walking/climbing requirements and altitude thresholds imply new structured `/v1/map/scene` filter semantics. Exact API names, enum values and AND/OR composition are not authored by the visual candidate.
- If this direction is selected, accepted effects will later reconcile once into product proposal section 7.5 and related field/acceptance text, and into the technical proposal's filter query/state/domain/data model. Until then neither original proposal is edited.

## 7. Architecture Deliberation

- Affected owners: task-local DRA delta owns pending interpretation; the product and technical proposals remain product/data/algorithm owners; `DESIGN.md#wechat-mini-program--soft-instruments-v1` remains visual-system owner; the existing Open Design project owns editable candidate artifacts.
- Current extension point/source of truth: revise the same four addressable HTML resources in `starward-miniapp-map-page-2026-08-05`; preserve the four baseline digests above and do not create another gallery, prototype family or design-system source.
- Dependency and state boundaries: expansion is local presentation state; terminal selections are Sheet draft state; Apply is the only commit into map filter state; the map-scene query/data truth remains outside visual resources. Mode, map viewport, selected spot and restoration state remain orthogonal.
- Selected candidate design: progressive inline disclosure with one expanded criterion and persistent selected summaries. Alternatives considered were showing every second-level tag at once, which overloads 320px/large-text Sheet height, and opening a nested modal per criterion, which adds navigation/focus overhead. Both are rejected for this candidate, not as universal product rules.
- Plausible future change: more directions, localized labels or saved presets can grow the taxonomy. The interaction therefore binds values to stable criterion groups and summaries instead of relying on chip position or copied label strings.
- Technical debt disposition: absent product definitions for percentage obstruction and directional light pollution are not hidden or implemented as facts; they remain bounded pending decisions for final proposal reconciliation.
- Forbidden shortcuts: global find/replace; losing untouched scenarios; making parent expansion itself a filter; committing on close; using realistic fabricated data; calling product estimates measured Bortle; duplicating filter truth across boards; editing Context, `DESIGN.md`, original proposals, code, tests or handoff during candidate iteration.
- Project-owned/current-candidate checks: exact option inventory and order; disclosure/selection/reset/apply/cancel behavior; no old taxonomy inside filter Sheet; 320/375/430 overflow and 44px target checks; long-text and reduced-motion branches; day/night/observation token parity; no external dependency or console error; unchanged map/card/route state invariants.
- Quality preservation: correctness and maintainability require one filter model and exact labels across all four resources; reliability requires draft/commit/cancel recovery and honest missing/degraded distinctions; performance requires no request on mere expansion; accessibility requires roles, expanded/selected states, focus order, non-color cues and large-text reflow. No runtime, capacity, security or production compatibility claim is made by these browser resources.

## 8. Reconciliation status

`pending-user-review`. No user selection, proposal reconciliation, Design Authority adoption, implementation handoff or production acceptance is implied.
