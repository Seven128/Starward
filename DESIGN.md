---
version: "2.0"
name: "今晚去观星"
description: "A blue, materially skeuomorphic mobile stargazing decision system with planning, night, and strict black-and-warm-red observation modes."
colors:
  canvas: "#F3F7FF"
  surface: "#FFFFFF"
  surface-muted: "#E8F1FF"
  surface-elevated: "#FFFFFF"
  text: "#0B1B35"
  text-muted: "#435A78"
  border: "#6F89AA"
  primary: "#1677FF"
  primary-hover: "#4096FF"
  primary-active: "#0958D9"
  on-primary: "#FFFFFF"
  success: "#52C41A"
  warning: "#FAAD14"
  error: "#FF4D4F"
  material-highlight: "#FFFFFF"
  material-body: "#6F89AA"
  material-seam: "#435A78"
  lens-core: "#0B1B35"
  lens-reflection: "#4096FF"
  rubber: "#0B1B35"
  equipment-paint: "#0958D9"
  fabric: "#E8F1FF"
  fabric-stitch: "#6F89AA"
  contact-shadow: "#0B1B35"
  night-canvas: "#020817"
  night-surface: "#07152B"
  night-surface-muted: "#0E2444"
  night-surface-elevated: "#122E52"
  night-text: "#EDF5FF"
  night-text-muted: "#A7BDD9"
  night-border: "#56779E"
  night-primary: "#1677FF"
  night-primary-hover: "#4096FF"
  night-primary-active: "#0958D9"
  red-canvas: "#050000"
  red-surface: "#170000"
  red-text: "#FF9B9B"
  red-text-muted: "#E77474"
  red-border: "#A63F3F"
  red-primary: "#FF5454"
typography:
  display:
    fontFamily: "Bahnschrift, DIN Alternate, Aptos Display, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Bahnschrift, DIN Alternate, Aptos Display, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
  section:
    fontFamily: "Bahnschrift, DIN Alternate, Aptos Display, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3125
  body:
    fontFamily: "Aptos, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.57
  label:
    fontFamily: "Aptos, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
  data:
    fontFamily: "Cascadia Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, Courier, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.57
  caption:
    fontFamily: "Aptos, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.5
  opsDisplay:
    fontFamily: "Bahnschrift, DIN Alternate, Aptos Display, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  opsTitle:
    fontFamily: "Bahnschrift, DIN Alternate, Aptos Display, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3125
  opsData:
    fontFamily: "Cascadia Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, Courier, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.58
rounded:
  sm: 5px
  md: 8px
  lg: 16px
  sheet: 24px
  pill: 999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  app-canvas:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
  surface-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 16px
  primary-action:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  map-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 16px
  data-matrix:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    typography: "{typography.data}"
    rounded: "{rounded.md}"
    padding: 8px
---

# 今晚去观星 Design System

## Overview

- Product promise: 从黄昏走入星夜。
- Starward is a mobile-first decision product, not a generic weather dashboard. It connects tonight's go/no-go conclusion, place choice, departure time, best observing window, route, risk, equipment, and on-site observation into one path.
- The native App profile uses a blue, professionally skeuomorphic outdoor-instrument system. The independently adopted WeChat Mini Program profile is defined later in this file and does not inherit App values, components, layouts, typography, motion constants, or targets.
- Information follows progressive disclosure: first the conclusion, then an actionable plan, then the professional evidence.
- This file is the sole authored visual authority and exact-value token source. Its YAML front matter owns the native App profile; `## WeChat Mini Program — Sky Canvas v1` owns the independent Mini Program profile. `packages/ui-system/src/tokens.ts` consumes only the App profile, and the Mini Program adapter may consume only the named Mini Program section.
- Design Authority status: configured and adopted for two independent owner-selected target profiles: native App and WeChat Mini Program. Surface ownership still belongs to `project_context/**`, and neither profile alone claims production/runtime acceptance.

### Design Authority Index

- Authored exact-value token source: selected — this file. The YAML front matter is scoped to the native App profile; the exact Mini Program tables and contracts live only in the named Mini Program section below.
- Generation direction and generated token targets: App profile `DESIGN.md` YAML → `packages/ui-system/src/tokens.ts`; Mini Program profile `DESIGN.md#wechat-mini-program--sky-canvas-v1` → its single framework adapter. TypeScript, WXSS, CSS, JSON, HTML, kits, manifests, screenshots, and provider files are consumers, candidates or verification inputs, never co-equal token authorities.
- Active target (native App): `target.system.starward-blue-skeuomorphic-2026-07-29`, selected by the owner on 2026-07-29 with the explicit instruction “选定这个候选”. It controls the native App visual language, tokens, three modes, physical-material rendering, component appearance, state posture, accessibility posture, and motion posture. It does not replace product semantics or claim native/runtime conformance.
- Active target (WeChat Mini Program): `target.system.wechat-miniapp-sky-canvas-2026-08-25`, selected by the owner on 2026-08-25 through the explicit choice “天空画布 Sky Canvas”. It controls the independent Mini Program canvas-first visual language, exact day/night/observation roles, density, geometry, component grammar, motion, accessibility, and asset posture defined below. It does not define Product Surface, route, data, service, runtime or acceptance truth.
- Mini Program selected source: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-provider-design-system.md` SHA-256 `03c300a6cfd1b23e0b84b72baaa26081eef0f958de515b75413be771029499b1`; source index `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/source-index.md` SHA-256 `a602a572b93d3aa1b0e51e320b4c25e14267d43b131109844c7accb4e5efbc2b`. The snapshot’s pre-selection lifecycle text is historical; this record owns its adopted interpretation without altering those bytes.
- Mini Program provider provenance: Open Design `0.20.1`, published design-system ID `user:starward-sky-canvas-candidate-c`, generation job `ee08bc8c-1014-407c-8ae5-fd0c7473be3d`, bound project `starward-sky-canvas-core-2026-08-25`, provider body SHA-256 `03c300a6cfd1b23e0b84b72baaa26081eef0f958de515b75413be771029499b1`.
- Mini Program reference interpretation: map, sky, aligned time evidence and the decision are the visual subject. Soft Instruments, its eight references, 3D object grammar and old selected page resource remain historical rollback/traceability only; their visual treatment is not mixed into Sky Canvas. Native App and App/Admin targets are excluded inputs.
- Mini Program condition coverage: day, night, and separately authored strict black/warm-red observation; 320/375/390/430 CSS-pixel equivalents with `750rpx` implementation mapping, safe-area/menu-capsule adaptation, enlarged text, `88rpx` minimum targets, reduced motion, focus/pressed/disabled/loading/empty/stale/partial/offline/error/success, mode-correct cold start and asset fallback. These are design contracts, not production conformance evidence.
- Mini Program editable upstream and update route: revise Open Design system `user:starward-sky-canvas-candidate-c`, create and review a new immutable candidate/digest, obtain explicit selection, then re-adopt its values and record here. Never edit a generated runtime adapter to change the system, overwrite the selected source, or import values from the native App profile.
- Provider: Open Design `0.16.1`; editable design-system ID `user:starward-2026-07-29`; bound workspace/project ID `ds-starward-2026-07-29`; selected provider body SHA-256 `280b1d3726e181591f19b6ddef96ab5d32fb61c5302af07fcee194b32f135f70`. The provider exposed no revision records at selection, so no revision ID could be accepted; the provider design-system metadata is published and this record owns project adoption.
- Selected package integrity: `validation-manifest.json` SHA-256 `ae9d23d7d2a127b5ea1feb1a86cebd1b5a33dc1294de0ad40c9e4803a8a9be8f`. The package contained 62 required files, 16 HTML entries, role-isomorphic planning/night/observation specimens, 122 audit anchors, six-value observation pixels, and no package audit error or warning. Audit anchors are traceability markers, not a count of product controls.
- Selection evidence was limited to the explicit owner brief and three supplied visual references: day image SHA-256 `62d286b330ce48cac73e1b1351e6c35502aac46989af971ee502466842d49fe0`, night image SHA-256 `5d5ec492c02e8d67b502ed7f672f1b8976da61d56f2702fbd7a59bbcb1ee3b5d`, and observation image SHA-256 `d8de918d08dab0f8d6f84bb097076671186a61a1494637f1e40b2fc7b97b8150`. Their logo, wording, poster/device composition, sample data, and proprietary imagery are not adopted.
- Condition coverage: planning/day, night, and strict black-and-warm-red observation/red-light; 390×844 primary, 360/430 responsive checks, 200% text, 44×44 minimum targets, reduced motion, focus/pressed/disabled/loading/empty/no-results/stale/partial/degraded/unknown/offline/saving/error/success specimens, and decision → action → evidence hierarchy.
- Editable upstream and update route: revise Open Design system `user:starward-2026-07-29` in project `ds-starward-2026-07-29`, review and validate the complete new package, record the new provider revision or immutable digest, and re-adopt it here. Never silently edit this authority from a generated export and never overwrite a previously selected source identity.
- Legacy rollback baseline `target.mobile-product-pages-v2`: files remain immutable at `docs/design-targets/mobile-product-pages-v2/index.html` SHA-256 `21838ed2a28f218fb4b37a05827b1be1d6993b23a02fa97847e78fdaa0af4271` and `coverage-manifest.json` SHA-256 `6f99c5a965f167db39babacb853c984aa01e7805095dc9350b7126e36a1ed46f`. Its historical composition is inactive as a current visual constraint and will be regenerated separately.
- Legacy rollback baseline `target.ops-product-pages-v1`: files remain immutable at `docs/design-targets/ops-product-pages-v1/index.html` SHA-256 `40510c23a88c00cb614cddeeaf9f4c895bc6d70c365b6ded7c5a2e286c4a55b5` and `coverage-manifest.json` SHA-256 `0362730488ec82620979a3ae317b8c3ad89081000071c6deb1901973e426d8e2`. Its historical composition is inactive as a current visual constraint and will be regenerated separately.
- Legacy rollback baseline `target.mobile-controls-v3`: files remain immutable at `docs/design-targets/mobile-controls-v3/implementation-contract.json` SHA-256 `01f4eae8bb5e01b126480669d79f168508fcf2c821b9edce916dc77fdaae12c4` and `index.html` SHA-256 `c29beac7c41549478544beadef96810fb662487480032c15be5db6e536991b2a`. Its 83 stable Control Keys, scenarios, and behavior semantics remain historical traceability data, but its visual values, geometry, and styling are inactive and were not used to author this system.
- Legacy rollback baseline `target.ops-controls-v2`: files remain immutable at `docs/design-targets/ops-controls-v2/implementation-contract.json` SHA-256 `13f0d0f50224e61045ad859bbd43d26da15689603121929907c44fe15fabb388` and `index.html` SHA-256 `dc82a4865b3f5fd235a1dadecc736430100a59599d1e439b406c23c18a9f645b`. Its behavior semantics remain historical traceability data, while its visual values, geometry, and styling are inactive.
- Legacy exports under `docs/design-system/**` are retained unchanged as rollback/reference material. They are not a source for current colors, typography, component styling, geometry, imagery, or fidelity checks.
- Target precedence is closed: Source/Context owns product, safety, privacy, information, interaction, route, and stable Control meaning; this file owns each explicitly scoped visual profile; a runtime token module may consume only its target profile. Legacy page/control resources may support rollback and semantic traceability only. Any conflict fails closed in favor of the upper owner and requires a new explicit adoption.
- This document is complete and normative on its own for the adopted visual profiles. `.codex/skills/uiux_design/SKILL.md` remains only the React Native App implementation companion; it is not a Mini Program source or dependency. A future Mini Program implementation companion may be created only after its runtime exists and must consume, never redefine, the Mini Program profile below.

## Colors

- Planning/day mode uses a cool `#F3F7FF` canvas, white reading surfaces, `#E8F1FF` route-field surfaces, ink-blue `#0B1B35` text, `#435A78` secondary text, `#6F89AA` borders, and 航迹蓝 for the primary action, route, selected map node, and best observing window.
- 航迹蓝 is a high-signal color. Prefer one primary action and one key selected state per screen; do not use it as a large decorative background.
- Text-bearing primary controls use the darker primary-active token when normal-size white labels need WCAG AA contrast; the brighter primary remains available for routes, nodes, and non-text emphasis.
- Semantic green, yellow, and red communicate data meaning or operational state. They do not replace the brand roles.
- Night mode uses near-black navy `#020817`, ink-blue `#07152B`, deep-navy `#0E2444`, and elevated `#122E52` surfaces with `#EDF5FF`/`#A7BDD9` text and `#56779E` borders. Limited route blue is allowed; neutral-charcoal fallback, blanket blue haze, neon outlines, and broad glow are forbidden.
- Observation/red-light mode is a strict six-value closed palette: `#050000`, `#170000`, `#FF9B9B`, `#E77474`, `#A63F3F`, and `#FF5454`. Every controllable surface, icon, map, route, selection, focus, status, loading state, transition, generated asset, and image treatment must resolve to those black/warm-red values.
- Observation mode must not introduce blue, white, green, yellow, neutral gray, bright flashes, whole-screen CSS filters, or unannounced OS/vendor handoffs. Meaning remains available through label, icon, shape, border, and position rather than hue alone.
- Text and controls must retain readable contrast in every mode; selection cannot rely on color alone.

### Physical material roles

- Skeuomorphism belongs to professional physical entities: telescope tubes and metal mounts, coated glass/lenses, rubber focus rings and grips, camera bodies and dials, binoculars, stitched camping backpacks, tent fabric and poles, and vehicle paint.
- `material-highlight`, `material-body`, and `material-seam` describe compact metal reflections and joints. Highlights remain localized and attributable; they never wash an entire card.
- `lens-core` and `lens-reflection` describe coated optical glass. Reflection is a small curved or angled cue, never a luminous halo.
- `rubber` describes eyecups, grip panels, focus rings, and protected edges through low-reflectance contrast and restrained texture.
- `equipment-paint` is reserved for controlled blue vehicle/tool surfaces; it does not turn the application canvas into product paint.
- `fabric` and `fabric-stitch` describe backpack panels, straps, tent cloth, seams, and edge reinforcement. Stitching must follow a plausible construction line.
- `contact-shadow` is compact and attributable to the object/control casting it. It cannot replace a missing border, create floating card stacks, or become blanket ambient blur.
- Use at most one decisive material moment per screen. Data surfaces remain planar, aligned, and legible.

## Typography

- Display, title, and section roles use Bahnschrift → DIN Alternate → Aptos Display → PingFang SC → Microsoft YaHei UI → Microsoft YaHei → system fallbacks.
- Body, label, caption, and control roles use Aptos → PingFang SC → Microsoft YaHei UI → Microsoft YaHei → system fallbacks.
- Coordinates, time, azimuth, units, and dense professional data use Cascadia Mono → SFMono-Regular → Consolas → Liberation Mono → Menlo → Courier → monospace.
- These are unbundled, platform-dependent, fallback-safe stacks. No font file, license, or guaranteed platform availability is implied.
- Titles, place names, conclusions, and key numbers use strong weight. Labels, units, and explanations remain secondary but legible.
- Dense forecasts gain scanability from column alignment, row labels, and hierarchy; do not shrink text until it becomes difficult to read.
- Display is 38/47.5 at 700; title 22/27.5 at 700; section 16/21 at 700; body 14/22 at 400; label 12/15.6 at 700; caption 11/16.5 at 400; data 14/22 at 400 with tabular numbers.
- At 200% text, the conclusion, next action, units, safety state, and sheet controls reflow without clipping or horizontal page scrolling.
- Voice is calm, concrete, and actionable. State uncertainty and alternatives instead of promising perfect visibility or guaranteed conditions.

## Layout

- Design mobile-first for a primary 390 × 844 viewport and account for safe areas.
- Use an 8px baseline grid. Page margins, module spacing, and internal spacing use deliberate grid multiples.
- Every primary touch target is at least 44px.
- First layer: tonight's recommendation, score, and best observing window.
- Second layer: main and alternate places, distance, drive time, arrival, route, facilities, and risk.
- Third layer: cloud layers, transparency, seeing, light pollution, moon phase, solar/lunar events, model comparison, and photography parameters.
- Maps, real place imagery, sky, and key decisions are the visual subject. Interface surfaces recede and avoid nested-card accumulation.
- Professional forecasts use continuous matrices, time bands, and aligned columns instead of turning every cell into an independent card.
- Fixed primary actions and five-item bottom navigation remain inside the safe area and never cover route, checklist, or hourly data.
- Reserve stable space for sheets, loading states, and scrolling so navigation and key actions do not jump.

## Elevation & Depth

- Establish hierarchy with whitespace, 1px borders, and surface contrast before shadows.
- Map markers, floating controls, Bottom Sheets, and physical-object specimens may use restrained elevation or compact contact shadows; avoid broad blurry shadows, blanket glow, and glassmorphism.
- Depth order is surface contrast → 1px border → localized material highlight → compact attributable contact shadow.
- Do not bevel every edge or make every container a raised object. The physical object may feel tactile; surrounding evidence remains planar.
- Image overlays sit in one safe corner on a solid surface. If no safe corner exists, place the information below the image.
- In night mode, depth comes from controlled navy luminance steps and localized reflection, not glow. In observation mode, depth must remain inside the six-value black/warm-red palette.

## Shapes

- Base controls use an 8px radius and 1px border.
- Large content layers and map Bottom Sheets may use 16px or another 8px multiple; high sheets expose a clear drag handle when dragging is supported.
- Pills are reserved for compact filters, segmented choices, and short statuses.
- Horizon arcs, orbital paths, map routes, round time nodes, and continuous observing windows share one graphic language.
- Map node size, border, fill, and label treatment distinguish selection without depending only on hue.

## Components

- Core decision components: tonight recommendation, observing score, best-time band, and weather/astronomy summary.
- Place and map components: real-place card, main/alternate place card, marker, score bubble, current location, route, Bottom Sheet, layer selector, and legend.
- Professional components: hourly forecast matrix, sun/moon event timeline, celestial position card, sky polar plot, and photography parameter card.
- Action components: fixed primary action, five-item bottom navigation, trip timeline, equipment grid, pre-trip checklist, and night field toolbar.
- Physical-object components: professional telescope, camera, binoculars, camping backpack, tent, and vehicle specimens use the registered material roles for metal, coated glass, rubber, fabric/stitching, paint, and compact contact shadow. They must be real generated/local project assets or honest vector constructions with recorded provenance, never emoji or a borrowed product image.
- Equipment tiles pair one materially credible object with its name, readiness/requirement state, and action. The object provides tactile character; the data surface stays quiet and planar.
- A selected map node, place card, route segment, and detail screen must refer to the same place state. Route changes update distance, drive time, arrival, and risk together.
- Inputs, filters, and selectors provide loading, empty, no-results, validation, disabled, saving, success, and error feedback where applicable.
- Every applicable component distinguishes pressed, focus, disabled, loading, empty, no-results, stale, partial, degraded, unknown, offline, saving, error, and success. Space is reserved so a state change does not unexpectedly move the primary action.
- Motion is fast, restrained, and continuous. Map and card selection synchronize; time changes continuously update sky and data; Bottom Sheets settle physically. Motion explains input, state, hierarchy, or continuity and never exists as ambient decoration.

## Interaction, Motion & Feedback

- Controls respond visually on press-in and commit only on a valid press-out or equivalent keyboard/accessibility activation. Cancelling, dragging away, disabling, or losing the gesture must not fire the action.
- Directly manipulated sheets, map overlays, time scrubbers, sky views, sliders, and reorderable items track the user's grab offset continuously. They remain interruptible and reversible while moving, beginning any retarget from the live presentation value.
- A release may hand its measured velocity into bounded settling and choose among valid snap points using position, direction, and velocity. Momentum never bypasses a safety boundary, confirmation, permission, or valid domain range.
- Gesture competition is designed explicitly. Sheet drag, nested scroll, map pan/pinch, iOS navigation gestures, Android system/predictive back, and assistive gestures must not silently steal one another's input.
- Entry and exit preserve spatial continuity and logical focus. A layer closes toward its source when appropriate, returns focus to the trigger, and never traps the user.
- Default UI settling is controlled and non-bouncy. Restrained overshoot is reserved for a momentum-driven physical gesture and stays inside safe visual bounds. Exact spring, threshold, projection, and timing values are centralized implementation tokens and require representative-device tuning; web or Apple sample constants are not production facts.
- Bottom Sheets define valid snap points, modal versus parallel ownership, handle/scroll regions, keyboard and safe-area behavior, loading/empty/error states, dismissal/back behavior, focus, interruption, and reduced-motion alternatives. Sheet state cannot diverge from the selected place, route, itinerary, or time state it represents.
- Haptics are short, optional, causal, and semantic: selection/snap, meaningful success, warning, error, or a clear physical boundary. They are never continuous decoration, never the only feedback channel, and must tolerate user disablement, unsupported hardware, low power, and camera/sensor conflicts.
- iOS and Android share task and state invariants while retaining platform-native navigation, back, touch feedback, accessibility, and haptic behavior. Android is not styled or animated as an iOS imitation.
- Honor system reduced motion by replacing large translation, parallax, depth, repeated motion, and elastic overshoot with an immediate state change or short fade; merely speeding up the same motion is insufficient. Honor reduced transparency with opaque surfaces and clear borders.
- Screen-reader feedback exposes role, name, state/value, selected-place/time/route changes, asynchronous completion/failure, stale or degraded data, and safety warnings without announcing every animation frame. Text scaling and reflow must not clip key decisions, units, actions, or sheet controls.
- Planning, night, and red-light modes keep the same interaction grammar and task state. Red-light transitions, pressed/loading/error states, keyboards, native overlays, and map/legal chrome must not introduce blue or bright-white flashes. If an OS- or vendor-owned surface cannot be themed, do not open it silently in field use: warn before the handoff and provide a safe cancel/return or non-field alternative.
- Interaction quality requires state/snap tests plus representative iPhone and Android real-device review for interruption, velocity seams, system-gesture competition, accessibility, haptics, frame pacing, and dark-environment luminance. Static screenshots, simulator-only review, or a nominal FPS number are not completion evidence.

## Do's and Don'ts

- Do lead with whether to go tonight, then the next action, then the supporting evidence.
- Do use real place imagery, maps, sky data, and materially credible professional equipment when they help a decision.
- Do concentrate skeuomorphism in physical objects and decisive controls; keep data surfaces planar and aligned.
- Do preserve the same task order across planning, night, and red-light modes.
- Do keep professional information available without allowing it to dominate the first screen.
- Do expose uncertainty, risk, and alternate options in user language.
- Don't copy a source application's logo, proprietary imagery, brand color, or exact screen layout.
- Don't use generic purple gradients, cyberpunk neon, meaningless particles, continuous flashing, large glass panels, decorative glow, leather/wood nostalgia, or universal toy-like bevels.
- Don't use old page/control target visuals as a style source. Their files are rollback artifacts and their stable keys retain semantic traceability only.
- Don't use stacked nested cards, a first screen full of professional tables, or unsupported claims such as 完美观星, 绝对晴朗, or 保证可见.
- Don't invent a logo, illustration, or image that is not grounded in project evidence.
- Don't lock input until an animation finishes, animate from an obsolete target, use a gesture-only destructive action without recovery, or let motion mask stale/unknown data.

## WeChat Mini Program — Sky Canvas v1

This section is the complete canonical visual-system profile for `target.system.wechat-miniapp-sky-canvas-2026-08-25`. It is independent from the native App profile above. Product semantics, route ownership, data truth and failure behavior remain owned by Context and the Mini Program Source; this section owns exact visual roles and their system-level projection.

### Adoption record

- Selection: owner-selected on 2026-08-25 through the explicit choice “天空画布 Sky Canvas”.
- Immutable selected source: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-provider-design-system.md`, SHA-256 `03c300a6cfd1b23e0b84b72baaa26081eef0f958de515b75413be771029499b1`.
- Source index: `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/source-index.md`, SHA-256 `a602a572b93d3aa1b0e51e320b4c25e14267d43b131109844c7accb4e5efbc2b`.
- Provider lineage: Open Design `0.20.1`, published design-system ID `user:starward-sky-canvas-candidate-c`, generation job `ee08bc8c-1014-407c-8ae5-fd0c7473be3d`, bound review project `starward-sky-canvas-core-2026-08-25`.
- The provider snapshot retains its pre-selection lifecycle text unchanged; this canonical record owns the selected/adopted interpretation.
- The prior `target.system.wechat-miniapp-soft-instruments-2026-08-05`, its selected source, and `target-miniapp-drift-correction-selected-constraint-v3` remain immutable historical rollback/traceability inputs. Their visual styling, exact geometry and fidelity constraints are inactive for current Mini Program work. Stable product, information and interaction meaning continues through the owning Context.
- Current selected screen/interaction constraints are `target-miniapp-sky-canvas-current-constraint` and `target-operations-sky-canvas-current-constraint`; their sole canonical adoption records live in `project_context/areas/main/screen-contracts/wechat-miniapp.md` and `operations.md`. They constrain declared composition, component/state grammar and interaction but are not pixel-exact targets, production truth or acceptance evidence; this system record retains only their stable keys and owner anchors.
- Owner-directed application amendment (2026-08-25): keep the selected Sky Canvas identity and exact mode-role palette, while making its in-scope Mini Program application distinctly outdoor, energetic, lightweight, concise and gently playful. Vitality comes from route/sky continuity, selective trail-green and lunar-gold emphasis, friendly rounded geometry, semantic icons and short causal motion—not from dense administrative panels, decorative type, childish illustration, gradients, glow or ambient particles. This amendment governs the selected current implementation constraints and later implementation without transferring token or Product Surface ownership to them.
- Editable update route: revise `user:starward-sky-canvas-candidate-c`, create a new immutable source version and digest, obtain explicit owner selection, then update this canonical record. Never overwrite the selected snapshot or change values in a generated WXSS/TypeScript adapter.
A map-and-sky-first canvas system: minimal chrome, spatial continuity and selective color for time, moon and opportunity.

### 1. Visual Theme & Atmosphere

The map and sky are the interface. Product chrome recedes to a few solid floating controls and an edge sheet. Day is cool neutral; night is deep blue-black with restrained indigo and lunar gold. It feels cinematic through scale, continuity and a few bounded semantic micro-interactions, never through ambient gradients, looping particles or glow.

This is the adopted visual-system profile for a 320–430 CSS-pixel equivalent mobile Mini Program. It must make a user feel that the interface is a trustworthy night-field decision instrument, not a generic weather dashboard, travel marketplace or decorative star poster.

Primary content priority:
1. map / sky / aligned time evidence;
2. the decision and next action;
3. supporting place detail and provenance.

Preserve the product topology and state semantics, but do not preserve the current Soft Instruments visual treatment.

### 2. Color

<!-- OPEN-DESIGN-PREVIEW-FOUNDATIONS -->
- Page Background: #F5F7FA
- Surface: #FFFFFF
- Heading Ink: #111827
- Primary Brand Accent: #536DFE
- Border Rule: #DCE2EA
- Muted Text: #667085
- Night Canvas: #050914
- Night Surface: #0B1222
- Night Text: #EEF2FF
- Night Accent: #7E8FFF
- Observation Canvas: #000000
- Observation Primary: #FF3B30

The first four swatches define the candidate's primary preview.

| Role | Day | Night | Observation |
| --- | --- | --- | --- |
| canvas | #F5F7FA | #050914 | #000000 |
| surface | #FFFFFF | #0B1222 | #120000 |
| text-primary | #111827 | #EEF2FF | #FF6A58 |
| primary-action | #536DFE | #7E8FFF | #FF3B30 |
| text-secondary | #667085 | #94A0B8 | #C54438 |
| border / grid | #DCE2EA | #1D2A45 | #551410 |
| positive | #23866A | #55C7A5 | #FF6A58 |
| warning | #A56A14 | #D8AA58 | #FF8A72 |
| blocker | #C53F48 | #F06A75 | #FF3B30 |
| focus | #3455DB | #9BA8FF | #FF8A72 |

Observation mode is a separately authored palette, not a color filter. Every background, placeholder, map control, modal, error and loading state stays inside black and warm-red roles. Selection and status never rely on color alone.

Solid `primary-action` label colors are exact derived accessibility roles: day `#050914`, night `#050914`, observation `#000000`. Day/night `text-secondary` may carry normal text; observation `text-secondary` is limited to large labels, short metadata or graphical boundaries, while normal-sized explanatory text uses `text-primary`. These restrictions keep normal text at `4.5:1` or better without changing the selected palette.

Indigo identifies selected place/time and primary action. Lunar gold is reserved for moon/sun events plus the narrowly scoped selected-choice and Favorite confirmation stars defined below; those stars cannot become ambient decoration. There is no generic purple gradient and no halo around ordinary controls. Large canvas areas remain quiet.

The outdoor-vitality composition uses the existing role set rather than inventing another palette: periwinkle/indigo carries selection and time, `positive` provides a restrained trail/terrain green, `warning` and the existing lunar-gold roles carry sun/moon warmth, and neutral canvas/surface roles keep the result light. A local region uses at most two chromatic accents in addition to semantic warning/error; every accent has an information or action job.

Compact-choice roles are exact component colors rather than a second palette:

| Compact choice role | Day | Night | Observation |
| --- | --- | --- | --- |
| selected surface | #F3F4FF | #12182B | #120000 |
| selected border | #AAB4FF | #7682D1 | #8A281F |
| selected label | #4254C7 | #DCE1FF | #FF8A72 |
| clipped star | #F1D58A | #F1D58A | #FF8A72 |

Selection remains legible without color: the border, clipped-star geometry, programmatic selected state and label state agree. Observation never imports the day/night yellow; its equivalent star remains inside the closed warm-red palette.

### 3. Typography

Display/body/control: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif. Data: 'SFMono-Regular', 'Roboto Mono', monospace. The Mini Program uses the native CJK system face rather than a downloaded display font; weight, size, line height and hierarchy—not a novel typeface—carry its character. Tight display tracking is limited to the single place/night identity. Body and controls stay compact; tabular numerics anchor the time layers.

Avoid the administrative tone created when every heading, action and field label uses the same heavy weight. Body and helper copy use 400–500, ordinary actions use 500–600, section headings use 600, and 650–700 is reserved for the one display identity, a decisive conclusion or a primary time value. The tabular data role extends consistently to local time, angles, percentages, distance and wind speed; it does not spread to ordinary Chinese prose. Outdoor character comes primarily from hierarchy, icons, spatial rhythm and motion, so Chinese text remains familiar and easy to render on both WeChat platforms.

Use at most five roles:
- display identity: one place/night title only;
- section heading;
- body/action;
- caption/source;
- tabular data / units.

At the 750rpx design width, ordinary controls use 24rpx/32rpx at weight 500, body uses 28rpx/42rpx at weight 400, section headings use 30rpx/42rpx at weight 600, and the one display identity uses 44rpx/52rpx at weight 650–700. Do not simulate hierarchy by repeating oversized bold text.

Chinese long labels, large text and numeric alignment must be tested. Units are visually subordinate but never detached from their values.

### 4. Spacing, Geometry & Density

Canvas-first. Radius scale 8/16/24rpx remains the compact base. The outdoor-vitality application adds 32rpx friendly information/permission panels and 48rpx top corners for edge sheets; pills remain reserved for short choices/status. Content inside a sheet stays mostly flat and grouped by spacing rather than a divider after every sentence. Shadows are restricted to the separation of one floating control layer from the map. Spacing 8/16/24/32rpx.

- Touch target: minimum 88rpx × 88rpx.
- Visible geometry may be smaller than its hit region: compact choices use a 60–64rpx visual capsule centered inside the 88rpx minimum hit height, with 18–20rpx horizontal visual padding, 12rpx visual gaps and a 16rpx capsule radius.
- No elevated card inside another elevated card.
- One local decision layer has one visually dominant action.
- Repeated data uses rows, bands, tracks or matrices rather than one card per value.
- Safe-area and WeChat capsule clearance are structural, not decorative padding.

### 5. Layout & Composition

Full-bleed map and sky canvases with edge-owned controls. A bottom sheet moves through peek, decision and evidence extents while preserving the visual position of the selected spot. Spot Night keeps the sky/arc visible and lets aligned conditions rise from the bottom.

### North-star surfaces

- Map: full visual work area; top search; a compact row of applied filters; one analysis-layer control; bottom spot callout.
- Finder: a map-parallel `closed → peek → expanded` bottom sheet. Quick filters live only beneath Search and commit immediately; the Sheet contains grouped advanced filters plus the two result partitions, never a duplicate quick-filter row or explanatory title block.
- Spot Detail: place identity and tonight decision above route, openness, safety, facilities and evidence.
- Spot Night: night ribbon, decision summary, shared time rail, aligned condition bands, targets, sky canvas and evidence drawer.
- Contribution: progressive form, upload state and review history; visually secondary to the main decision chain.

### 6. Component Grammar

Search is one prominent floating field; applied quick filters form one compact row below it. The Finder Sheet is absent on the clean default map, enters `peek` after the first quick-filter selection or committed query, and reaches `expanded` through direct drag or a tap on its named handle. The visible handle is quiet, while its 88rpx hit region and programmatic expanded state provide the non-gesture path. There is no visible “展开筛选” button and no “找今晚的观星点” heading inside the Sheet. Quick filters never repeat inside it. Marker selection expands one bottom callout, not a popup stack. Primary buttons are solid and compact; quiet rows and icon actions stay borderless when their larger hit region is already clear. Evidence appears in an edge drawer; secondary metadata stays off the primary canvas.

Compact choice chips keep an 88rpx minimum hit region while the visible capsule is only 60–64rpx high. Their 24rpx/32rpx, weight-500 labels, 18–20rpx horizontal padding and 12rpx gaps are shared across Finder and Observing Conditions. Selected day/night choices use the lighter periwinkle roles above. A 36–40rpx solid rounded five-point star is optically half-clipped at the visual capsule's top-right corner: its center stays at the corner, the visible mass occupies roughly one quarter of the capsule without covering the label, and overflow outside the capsule is clipped. It enters once in 180ms from 0 opacity, 0.55 scale and −18deg rotation; deselection reverses in 140ms. It never changes layout or hit geometry. Observation substitutes the warm-red star role. Reduced motion uses a ≤100ms color/opacity state change with no scale or rotation.

The Spot Favorite is a borderless 88rpx hit target containing a 48–52rpx star. Inactive night mode is a white outline with a transparent center; active is a solid pale-yellow star. A successful activation may run one interruptible, non-looping confirmation ritual within a 192rpx effect stage that does not intercept input: the main star rotates while easing to 0.92 scale and filling, a short arc tail appears, and at most three 12/16/20rpx satellite meteors enter on distinct curved paths and settle around it. The combined visible satellite area stays below roughly 45% of the main star, distance lowers their opacity, and each retains a short tapered static tail after settling so the main star remains dominant. Total activation is about 420ms; no element keeps rotating, glowing or orbiting while active. Deactivation takes 180–220ms, returns the main star to its base scale and fades the fill, tails and satellites. Rapid retargeting starts from the live presentation state and queues nothing. Observation uses only warm-red equivalents; reduced motion removes travel, rotation and meteors and completes fill/opacity in ≤100ms. A failed optimistic Favorite commit visibly retargets to the server state and uses shared notification feedback.

Spot Detail exposes the astronomy child once as a flat, whole-row `今晚夜空` entry immediately after the Tonight decision and before the segment tabs. The row is 104–112rpx high, has no large primary fill, and contains one Tier-A horizon/constellation icon, label, secondary selected-time summary and trailing chevron. The whole row is the action; the Favorite star is never reused for this route.

Required shared families:
- search field and suggestion/result rows;
- quick chip, grouped filter choice and committed-filter summary;
- sheet, dialog and persistent banner;
- map marker, selected marker, callout and layer legend;
- decision summary, primary/backup window and blocker;
- night ribbon, time rail, condition band, sun/moon events and evidence drawer;
- upload item, submission status and moderation feedback;
- orientation entry, calibration, accuracy, permission/recovery state and accessible celestial-object list. Direction-control semantics remain owned by the Screen Contract; the current Spot Night surface is sensor-follow-only.

Generic Search, Filter, Chevron, Clock, Compass, Route, Parking, Facility, Cloud, Rain, Wind and Moon symbols use one coherent Tier-A monoline icon source through the Mini Program semantic-icon adapter. Domain-specific moon-phase, horizon, galaxy and meteor-radiant resources may extend that adapter. A heavy second component system, emoji, text-symbol stand-ins, per-screen icon drawing and a second icon/token truth are prohibited. Icons improve scanning only where they name a real object/state/action; they are not sprinkled into prose as decoration.

Every component has default, pressed, selected, disabled, loading, stale/partial/error and permission states where applicable.

### 7. Map, Time & Astronomy Visualization

Use continuous arcs, tracks and narrow rounded color bands over a stable dark field. The active time is a precise indigo cursor; moon/sun events use lunar gold nodes. Sky objects are sparse and labeled only when relevant. Conditions can expand to a matrix without replacing the canvas context. Semantic 32–40rpx icon wells distinguish twilight, clouds, moon, precipitation and wind while aligned bands remain the data owner; do not turn each metric into a card.

The sensor-permission state keeps the sky as the primary work object. Its lower edge sheet uses one rounded permission panel with one compass/orientation icon, one friendly title, one concise privacy sentence and one compact primary action. “Not now” recovery and the accessible object-list alternative remain reachable without showing an always-expanded policy block, simulation warning or repeated permission explanation. Denied, calibrating and unavailable states reuse the same geometry and change only the necessary icon, copy and action. The top status is a short single-line state, never a two-line administrative badge.

Illustrative comparison content, not product truth:
- 地点：深圳市天文台
- 今晚结论：值得考虑
- 主时窗：21:40–23:50
- 备选时窗：00:20–01:10
- 条件带：天文黑夜、总云/低中高云、月亮高度与照明、降水、风、湿度/露点、可见度、机会分
- Targets：夏季银河、土星、英仙座流星雨辐射点
- Search copy：搜地点 / 区域 / 观星点
- Quick filters：今晚推荐、2 小时内、暗度、少步行、设施

A design-resource review canvas may use those fixtures only with an explicit non-live disclosure outside product chrome. Product-view examples still expose the intended source/update/completeness presentation; production must render attributable current data or truthful partial, stale and unavailable states, never a sample-data fallback.

Generated previews and production surfaces must show the product, not a SaaS dashboard, pricing page, marketing hero, CRM table or chat assistant.

### 8. Motion, Feedback & Accessibility

- Touch feedback starts immediately. Selection and time scrubbing stay interruptible.
- Pointer hover may change surface/opacity but never adds an outline or changes geometry. Keyboard `:focus-visible` remains mandatory and hugs the visible control rather than the larger invisible hit box. Review-canvas current-frame markers label the specimen outside product chrome and never wrap a phone or control in a misleading blue border.
- Compact sheet transition target: 180–240ms with no bounce; reduced motion uses immediate or ≤100ms opacity.
- Time scrubbing previews local frames continuously and commits once on release.
- Map pan/zoom remains direct; controls never steal the gesture field.
- Product-view scroll owners preserve scrolling while hiding vertical scrollbar chrome and reserving no scrollbar width; scrolling outside the phone on a review canvas is not product chrome.
- Sensor-following sky motion exposes permission, calibration, accuracy and recovery without fabricating heading. A manual direction fallback appears only where the owning Screen Contract explicitly permits it; the current Spot Night surface does not.
- Normal text contrast target ≥4.5:1; essential graphical boundaries ≥3:1.
- Focus/read order follows visible order; modal layers return focus/read position to the trigger.
- No shimmer or bright flash in night/observation modes.

### 9. Voice

Chinese-first, calm, direct and evidence-aware. Say “值得考虑 / 数据不足 / 暂不建议”, not absolute promises. Put the result before technical explanation. Provenance and limitations are concise but reachable.

### 10. Anti-patterns

- pale-blue and white card soup;
- oversized headings repeated inside every section;
- decorative 3D objects replacing functional icons;
- broad blur/glass, neon outlines, purple gradient fog, star-particle wallpaper, ambient glow or looping decorative meteors; the bounded selected-choice and Favorite feedback above are the only star-flourish exceptions;
- a card per metric, nested elevated surfaces or repeated pill badges;
- Tencent default marker/callout/chrome as the product identity;
- astronomy represented only as paragraphs or a dense table with no visual time alignment;
- administrative notice stacks, repeated divider rows, legalistic helper paragraphs or oversized permission CTAs that displace the map/sky work object;
- observation mode implemented by a red overlay on day assets;
- copied Ctrip/Taobao/perseids visual composition or branding;
- fabricated certainty, hidden missing data or “choose the clearest provider model”.
### 11. Adoption and verification boundary

This profile is selected visual authority. It does not claim that the current Mini Program runtime already conforms. A later selected screen-resource handoff must bind back to this target, preserve the Screen Contract, and pass production visual, interaction, accessibility, responsive, native-runtime and real-data checks on the final candidate.
