# Sky Canvas Current DRA Resource

Status: current design direction selected and formally packaged as a Mini Program + Operations `implementation constraint`; both handoffs pass DRA preflight. It is not a pixel-exact target, production implementation or acceptance result.

## Resource decision

- Current owner decision: Sky Canvas is the accepted visual direction for the ongoing redesign.
- Canonical design authority: `DESIGN.md`, target `target.system.wechat-miniapp-sky-canvas-2026-08-25`.
- Product-surface authority: `project_context/areas/main/screen-contracts/wechat-miniapp.md` and `project_context/areas/main/screen-contracts/operations.md`.
- One current DRA project: Open Design project `starward-sky-canvas-core-2026-08-25`.
- Selected immutable Source: `selected-source/**`.
- Published handoffs: `selected-handoff/miniapp-sky-canvas-current.md` and `selected-handoff/operations-sky-canvas-current.md`.
- Human development handoff: `implementation-handoff.md`; complete machine-readable page/component/state/data mapping: `selected-source/implementation-handoff-spec.json`.
- Retention: edit the current resource in place. No superseded page, old contribution board, alternate admin mockup or dated preview is retained. Open Design provider history (`.file-versions`) is removed from the current project; provider authoring internals (`.od-skills`) and history are excluded from `selected-source`, whose dependency closure contains only the runnable resource and formal handoff inputs. The immutable selected provider snapshot remains a design-protocol exception and is not a parallel product UI.
- External cloning: none. Outdoor vitality, lightness and friendly rounded geometry are a product direction, not permission to copy another product's composition or branding.

## Current entry set

1. `index.html` — Map/Finder, Spot Detail, astronomy information and sensor-following orientation.
2. `supporting.html` — My, Tonight Plan, Settings and the feature-gated content-import flow.
3. `contribution.html` — three contribution kinds, progressive fields, durable draft/upload recovery and user-visible state history.
4. `operations.html` — authenticated Queue, Case, media review, merge preview/commit, publication assessment, publish/suspend/unpublish, replacement/retirement and audit.
5. `workbench.html` — shared tokens, typography, icon, selection, notification, Sheet, status and implementation-consumption specimens.

The five entries are one current resource. Their top navigation is the review index; it is not Mini Program product navigation. Inside the Mini Program frames, primary navigation remains exactly Map and My.

## Product and engineering solution binding

- Current implementation proposal: `docs/architecture/wechat-miniapp-product-technical-solution.md`.
- The proposal incorporates the accepted decisions from the full DRA feedback loop: Finder extent and content, compact choices, whole-callout navigation, Favorite motion, astronomy hierarchy, sensor-follow-only orientation, My/Plan/Settings, contribution state separation and authenticated operations governance.
- The proposal references this one current resource and does not create a second screen direction. Product/data/security/state truth remains in Context and Screen Contracts; exact system values remain in `DESIGN.md`. The current page resource is now selected as an implementation constraint, while pixel-exact fidelity and production acceptance remain explicitly outside its role.
- Local review entry while the current HTTP server is running: `http://127.0.0.1:8765/index.html`.

## Experience posture

- Product character: an outdoor companion that is astronomically precise, not an administrative form, travel marketplace, generic weather dashboard or toy.
- Visual priority: map or sky first; current decision and next action second; professional evidence and provenance third.
- Lightweight: remove repeated headings, explanatory chrome, duplicate filters and divider walls before reducing useful content.
- Lively: periwinkle selection/time, path green, lunar gold and risk coral provide restrained semantic energy. Motion explains selection, confirmation, time change or sensor state.
- Slightly cute: friendly 13–30px radii, compact icon wells, clipped star corners and short causal motion. No mascots, bubble typography, glitter, glow, looping particles or decorative card walls.
- Typography: license-safe native CJK stack. Use the mono instrument face only for time, angle, percentage, distance and wind.
- Icons: local Lucide Static `1.33.0` files for generic concepts; the Favorite meteor remains the single Font Awesome exception. Production resolves all icons through the existing semantic-asset adapter.
- Input/accessibility: actions retain at least a 44px hit region, visible focus does not enlarge geometry, selection is not color-only and reduced motion preserves the state graph.
- Scroll: phone scroll owners retain scrolling while hiding scrollbar chrome; the external review canvas may show its own scrollbar.

## Product coverage

### Map, Finder and observing conditions

- Clean default is `closed`: no Bottom Sheet surface, redundant heading, duplicate quick conditions or “展开筛选” text action.
- First committed Search or first unselected→selected quick choice may open `peek`; the quiet 44px handle reaches `expanded`.
- Back/Escape/downward drag traverses `expanded → peek → closed`; `extent` and `open_reason` remain separate.
- Advanced choices are adaptive and live only in the Sheet; quick choices remain under Search.
- The selected state uses the light periwinkle capsule, non-color text/border state and one large lunar star clipped at the upper-right corner.
- The entire map callout enters Detail. No “查看地点判断” line remains.
- `观测条件` continues to operate on one physical map, one selected time and at most one analysis overlay.

### Spot Detail and Favorite

- Identity, route, Tonight decision, Night entry, segment tabs and evidence use flat/lightly grouped hierarchy rather than divider-heavy administrative rows.
- `今晚夜空` is one compact whole-row route between the decision and segment tabs.
- Favorite keeps the main star dominant. At most three smaller meteors enter once and stop; main/satellite tails remain faint and static while active. There is no orbit, glow or loop.
- Deactivation reverses from the live visual state; reduced motion uses fill/opacity only.

### Astronomy information and orientation

- Sky, conclusion windows, time rail, condition bands, target list and orientation child share one formal spot/time/revision context.
- Twilight, cloud, moon, rain, wind, source and target icons improve scanning while aligned bands and matrices retain value ownership.
- Time preview changes the shared cursor, applicable sky objects and aligned values together.
- Orientation is sensor-follow-only. It has permission, calibrating, ready, denied and unavailable states but no manual direction button, stepper, slider or drag-to-heading.
- Recovery uses one concise stable rounded panel while the sky stays dominant; untrusted direction is never fabricated and the object-list fallback remains available.

### My, Plan, Settings and content import

- My is a conventional account root with one Settings gear, concise profile state and a small routine-entry list.
- It has no Favorite count/list/route, no peer My/Plan/Settings tabs, no commerce modules and no duplicate Spot Detail.
- Plan owns departure readiness, route nodes and recoverable dynamic-condition feedback without copying place facts.
- Settings owns display mode, closed observation-red entry/exit, permissions, reminders and data actions.
- Content import is labelled feature-gated and absent from the My route while disabled. When enabled it follows `SOURCE → EDIT_DRAFT → ASSOCIATE_SPOT → PREVIEW → SUBMIT`, preserves edited fields, keeps Copy available and separates `spot_id` from `spot_proposal_id`.

### Contribution lifecycle

- Intake exposes all three kinds: `FIELD_REPORT`, `CORRECTION`, `NEW_SPOT_PROPOSAL`.
- Existing-spot reports use the supplied formal `spot_id`/label and do not request current location. New-place precision requires separate consent.
- Fields appear progressively by kind. Media rights are explicit; unsupported/unsafe media and raw EXIF never become public evidence.
- Draft revision, upload session and idempotent submit identity are visible. Upload failure resumes from the retained progress and never re-creates completed media.
- The user UI separates:
  - `submissionState`: DRAFT / PENDING_REVIEW / CHANGES_REQUESTED / ACCEPTED / REJECTED / WITHDRAWN;
  - `mergeState`: NOT_STARTED / READY / MERGED / SUPERSEDED;
  - `publicationImpact`: NONE / CANDIDATE_UPDATED / ACTIVE_REVISION_UPDATED / SPOT_PUBLISHED.
- “Accepted” is never presented as “published”. A proposed place remains a candidate rather than a formal point.

### Authenticated operations lifecycle

- The responsive desktop Web is a separate owner-authenticated carrier, not a Mini Program demo console.
- Queue and Case decide the submission; media review separately checks format, rights, sanitation and inclusion.
- Merge Preview chooses canonical values per fact. Commit requires current submission/spot revisions, one idempotency identity, backend receipt and audit entry; it creates a candidate revision without publishing it.
- Publication Assessment rechecks completeness, provenance/validity, safety, concurrency and public read-model projection before publish is enabled.
- Publish, suspend and unpublish expose distinct impact. Replacement/retirement preserves history and relationships, previews affected plans and prevents successor cycles.
- Audit events are redacted and append-only; recovery uses the operation recovery point and readback rather than editing history.

## Shared component/state closure

`workbench.html` demonstrates the families used by the current pages:

- semantic color and typography roles;
- radius/density and 44px input boundary;
- compact selected chip with clipped star;
- Finder Sheet `closed/peek/expanded` state;
- inline/floating notification anatomy and recovery priority;
- Night aligned condition bands and instrument numerals;
- three-axis contribution status;
- high-impact operation disclosure/action;
- accessible switch and mode control;
- real local icon assets;
- implementation-owner mapping.

This is a visual/interaction resource, not a production UI-kit package or a second token owner.

## Implementation feasibility and consumption

- Mini Program token owner: `apps/wechat-miniapp/src/styles/tokens.scss`.
- Shared Mini Program component extension point: `apps/wechat-miniapp/src/components/**`.
- Icon extension point: the existing semantic-asset component/adapter.
- Route owners: `apps/wechat-miniapp/src/pages`, `src/spot`, `src/sky` and `src/content/contribution`.
- Operations owner: `apps/admin-web/src/app`.
- Reuse/build/buy boundary: existing owners and adapters are the selected integration path. A mature lightweight UI/icon dependency or bounded self-implementation remains allowed only after WEAPP/Admin compatibility, theming, package size, accessibility and exit-cost evidence. A heavy second design system, per-screen icon drawing, duplicate reducer/store or second token truth is prohibited.
- DRA fixture values must not be copied as live astronomy, weather, route, safety, moderation or publication truth.

## Current verification record

- Browser navigation: all five entries load from the current local HTTP resource and link to one another.
- Assets: current HTML pages reported no broken local image assets; browser consoles were clean after adding the local favicon.
- Mobile sizing: focused resources were checked at 320, 390 and 430 CSS px with no page-level horizontal overflow.
- Large text specimen: the 430px contribution-history fallback reflows rows and notifications into a single column with hidden scrollbar chrome and no horizontal overflow.
- Touch target audit: visible product buttons/links in the focused mobile frames and operations workspace reported no height below 44px.
- Phone scroll audit: `clientWidth === offsetWidth` with `scrollbar-width: none` for current phone scroll owners; scrolling remains enabled.
- Operations responsive audit: 1440px uses the side workspace; 820px uses top navigation and single-column content with no page-level horizontal overflow.
- Interactive audit: contribution type/state, draft notification, upload resume, media decisions, merge gating/commit, publish feedback, replacement impact and audit navigation produced the intended current states.
- Core regression: Map/Detail/Astronomy/Orientation still load, retain their existing state controls and show no console error after current-resource navigation was added.
- Current preview: `current-preview.png` is replaced from the current core resource and labels the direction as current rather than Candidate C.
- Formal DRA closure: Mini Program preflight covers 33 subjects and 20 implementation component-family cells; Operations preflight covers 18 subjects and 10 implementation component-family cells. Both report one feasibility input, zero feasibility blockers, no limitations and `Production conformance: not evaluated`.

These checks are DRA-resource verification only. They do not prove WEAPP rendering, Tencent Map/native layer behavior, real sensor lifecycle, production accessibility/security/performance, authenticated API writes, data correctness, publication side effects/readback or formal selected-design conformance.

## Formal handoff status

The DRA loop is formally complete for the selected `implementation constraint` role:

- canonical Open Design entries and package-contained dependencies were acquired into one immutable selected Source;
- each target has a frozen Inspector, Fact manifest, structured component/state handoff and real-repository implementation-feasibility input;
- the formal publisher emitted exactly two current handoffs, one for the Mini Program and one for Operations;
- the temporary draft directory was removed after publication, so no parallel draft/old current resource remains;
- both published handoffs must continue to pass `ty-context design-resource preflight` before downstream implementation consumes them.

This classification is deliberate. The resource constrains page composition, component families, state matrices, interaction, feedback, data binding and feasible owner boundaries, while `DESIGN.md` owns exact system values. It does not assert full-target layout/pixel Facts, WEAPP/native behavior or production conformance. A future request for machine-bound pixel-exact fidelity would require a new explicitly selected exact-target closure and real render/geometry evidence rather than relabelling this constraint package.
