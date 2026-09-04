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
- This file is the sole authored visual authority and exact-value token source. Its YAML front matter owns the native App profile; `## WeChat Mini Program — Sky Canvas Field Signal` owns the independent Mini Program profile. `packages/ui-system/src/tokens.ts` consumes only the App profile, and the Mini Program adapter may consume only the named Mini Program section.
- Design Authority status: configured and adopted for two independent owner-selected target profiles: native App and WeChat Mini Program. Surface ownership still belongs to `project_context/**`, and neither profile alone claims production/runtime acceptance.

### Design Authority Index

- Authored exact-value token source: selected — this file. The YAML front matter is scoped to the native App profile; the exact Mini Program tables and contracts live only in the named Mini Program section below.
- Generation direction and generated token targets: App profile `DESIGN.md` YAML → `packages/ui-system/src/tokens.ts`; Mini Program profile `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` → its single framework adapter. TypeScript, WXSS, CSS, JSON, HTML, kits, manifests, screenshots, and provider files are consumers, candidates or verification inputs, never co-equal token authorities.
- Active target (native App): `target.system.starward-blue-skeuomorphic-2026-07-29`, selected by the owner on 2026-07-29 with the explicit instruction “选定这个候选”. It controls the native App visual language, tokens, three modes, physical-material rendering, component appearance, state posture, accessibility posture, and motion posture. It does not replace product semantics or claim native/runtime conformance.
- Active target (WeChat Mini Program): `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`, selected by the owner and subsequently revised through explicit DRA requirement cycles. It replaces the prior Sky Canvas target and controls the independent Mini Program visual language, exact day/night/observation roles, compact information density, typography, semantic geometry, common/domain component grammar, app-owned Map/Search/spot-information-panel chrome, curved time ruler, objective astronomy presentation, full-sky orientation, feedback discipline, motion and accessibility posture defined below. It does not define Product Surface, route, data, service, provider/basemap/native-map styling, runtime or acceptance truth.
- Mini Program selected sources: exact-value base `docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md` SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`, complete manifest SHA-256 `d719dd753422112c4759cd77d0d9da3b7d40d5dd87b38fd3d327835f739f8bde`, package digest `253fbcbfaa083aa897eca2faf5e4eb6f3b99e69da7f485d485f89881adcc8276` and source index SHA-256 `727114ee2f72f6a68a8bd0d25c4d20470ae8b0d6a0ff2bcff6d0067e367543c1`; current component/layout source `docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md` SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`. Earlier Map/Finder, review-directed, Map/Search/spot-panel, fullscreen-density-motion, compact-continuity and unified-flow-modes source bytes remain immutable audit provenance only; they are not current generation dependencies, compatibility layouts, alternate UI or fallbacks.
- Mini Program provider provenance: Open Design `0.21.1`, design-system ID `user:starward-mini-program-sky-canvas-field-signal-revision`, reviewed project `ds-starward-mini-program-sky-canvas-field-signal-revision`, conversation `0bcc669b-29b2-476b-b93d-f502d7b09917`. Revision `bccaa010-a3ef-4895-9fb0-4c874239fdac` is recorded as noncanonical and pending because its proposed body predates the final reviewed project bytes.
- Mini Program reference interpretation: pure-white day canvas and restrained near-black night surfaces carry compact, clearly tiered information; sky/periwinkle owns time and selection, meteor yellow owns final commitment/celestial events and the translucent filter ornament, trail green owns route/opportunity, and risk coral stays semantic. Vitality comes from semantic color, aligned bands, calibrated draggable ticks, compact proportion and causal motion—not tinted page foundations, deep-blue slabs, oversized type, generic sliders, decorative ambient meteors or excessive padding. The same language governs the stationary Map/Search field, compact suggestions/titleless filters, one-document marker-to-medium information panel, mutually exclusive image-backed bottom layer sheet, objective astronomy facts, raised arrowless ruler, one three-state celestial mode track, headerless orientation canvas, restrained colored-icon My hub and cell-based compact Contribution intake; native App, App/Admin targets and provider/basemap/native-map styling remain excluded inputs.
- Mini Program condition coverage: day, night, and separately authored strict black/warm-red observation; 320/375/390/430 CSS-pixel equivalents with `750rpx` mapping, safe-area/menu-capsule adaptation, 200% text, non-overlapping `88rpx` targets with smaller visible controls, reduced motion, touch/keyboard focus separation, pressed/selected/disabled/loading/empty/stale/partial/offline/error/success/permission states, mode-correct cold start and asset fallback. These are design contracts and selected-resource QA, not production conformance evidence.
- Mini Program editable upstream and update route: revise Open Design project `ds-starward-mini-program-sky-canvas-field-signal-revision`, create and review a new immutable package/digest, obtain explicit selection, then replace the active target pointer and canonical section here. Never edit a generated runtime adapter to change the system, overwrite a selected source, or import values from the native App profile.
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

## WeChat Mini Program — Sky Canvas Field Signal

This section is the complete canonical visual-system profile for `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`. It replaces the previous Sky Canvas system for all current Mini Program visual-system work and remains independent from the native App profile above. Product semantics, route ownership, data truth and failure behavior remain owned by Context and the Mini Program Source; this section owns exact visual roles and their system-level projection.

### Adoption record

- Selection: owner-selected on 2026-09-02 through the explicit instruction “现在这套设计系统差不多了，就选中他吧”.
- Display name: `Starward 微信小程序设计系统` / `Sky Canvas Field Signal`. Do not append version, date or revision labels in the handbook title, navigation, component specimens or ordinary product UI. The same rule applies to generated-candidate titles and design copy. Do not label a current route, component or resource as `old`, `new`, `legacy`, `vN`, `version`, `版本`, `旧版` or `新版`; stable target keys, protocol versions and source digests remain internal traceability metadata only and never become visible product/design labels.
- Immutable selected sources: exact-value base `docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`, SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`; current component/layout source `docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md`, SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`. Prior Map/Finder, review-directed, Map/Search/spot-panel, fullscreen-density-motion, compact-continuity and unified-flow-modes component sources remain immutable audit provenance only and cannot seed current generation or remain as fallback behavior.
- Complete selected package: `docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/artifact-manifest.json`, SHA-256 `d719dd753422112c4759cd77d0d9da3b7d40d5dd87b38fd3d327835f739f8bde`; package content digest `253fbcbfaa083aa897eca2faf5e4eb6f3b99e69da7f485d485f89881adcc8276`.
- Source index: `docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/source-index.md`, SHA-256 `727114ee2f72f6a68a8bd0d25c4d20470ae8b0d6a0ff2bcff6d0067e367543c1`.
- Provider lineage: Open Design `0.21.1`, design-system ID `user:starward-mini-program-sky-canvas-field-signal-revision`, reviewed project `ds-starward-mini-program-sky-canvas-field-signal-revision`, conversation `0bcc669b-29b2-476b-b93d-f502d7b09917`.
- Provider revision `bccaa010-a3ef-4895-9fb0-4c874239fdac` remains a noncanonical pending lifecycle record because its proposed body predates the final reviewed project bytes. The immutable reviewed project snapshot above—not that stale revision body—is the selected source.
- The frozen source retains “未选择候选” and candidate-boundary wording as historical lifecycle text. This canonical record owns the selected/adopted interpretation without altering those bytes.
- The superseded `target.system.wechat-miniapp-sky-canvas-2026-08-25` and its immutable provider source are historical audit provenance only. They do not control, constrain, seed or scaffold current Mini Program generation, styling, composition, component grammar, motion or interaction presentation.
- Owner instruction on 2026-09-02 retires `target-miniapp-sky-canvas-current-constraint` from current use. Its immutable files remain historical evidence only; current Mini Program composition and interaction responsibility comes directly from the owning Product Surface and Screen Contract, while this section supplies the sole current visual system. New resources must not bind, cite or project the retired entry/handoff as an `exact-target`, `constraint`, inspiration or current-implementation substitute. `target-operations-sky-canvas-current-constraint` remains independently scoped to owner operations and outside this Mini Program system. No resource or Context record proves pixel-exact or production conformance.
- The owner explicitly authorized iterative DRA resource → requirement change → resource cycles, required every reusable change to enter the design system before regeneration, and on 2026-09-03 delegated selection and the complete remaining DRA lifecycle after this revision without another candidate-approval pause. The current revision makes all panel extents crop one retained document, reveals valid media only during medium→large, retains a compact no-media handle band, shortens the action rail, removes section-rail inner gaps, raises and enables the arrowless ruler, preserves Search text while compacting suggestions and vertical rhythm, stages media before late Map-chrome fade, replaces competing panel/layer flags with one bottom-presentation enum, lightens active surfaces, merges day/night/observation into one animated three-state track, normalizes ordinary missing-value copy to `暂无数据`, enriches My with restrained role-colored semantic icons, and rebuilds Contribution intake from compact divider-backed field cells, conditional complex groups and one final commit. The current component/layout source above owns those reusable expressions; corresponding product and screen responsibility remains in owning Context.
- Third-party screenshots support only spatial proportion, density and interaction-class interpretation. They do not authorize copying brands, proprietary layouts/icons/basemaps, adding unsupported map layers, or inventing astronomy algorithms/provider styling.
- Map provider/basemap/tile/native-map styling, provider/legal chrome, native App and owner-operations surfaces remain excluded. Future production projection must independently verify real WeChat controls, devices, safe areas, accessibility, motion, map integration and data-state behavior.

### 1. 设计意图

《今晚去观星》以正式地点、路线、安全与天文事实帮助用户理解当前观测条件；当前 Mini Program 不由界面推导“是否出发”或推荐窗口。界面应像轻量、可信、有户外生命力的信息仪器：纯白日间画布承载高密度信息，活力来自语义色、连续轴、空间节奏和因果动效，不来自装饰。

#### 1.1 不变的产品层级

1. **地点与到达事实**：正式地点、距离、路线、开放/停车/设施和真实安全状态。
2. **天文与天气事实**：时间、云量、透明度、视宁度、光污染、月相、日月升落和可见目标。
3. **证据与恢复**：模型来源、更新时间、缺失/权限/失败影响与真实恢复路径；当前 panel 不展示推荐结论或最佳窗口。

设计系统只拥有视觉与组件表达；路线、状态责任和业务行为仍由 Context/Source 拥有。设计资源中的字段、状态、条件、来源与动作必须都是产品需要承载的正式信息结构，phone/product viewport 不显示“演示数据”、fixture、demo 或 review/debug disclaimer。代表值的非实时属性只在资源外部 metadata 中说明，绝不得被写成实时观测结论。

#### 1.2 明确排除

- 地图提供商、底图/瓦片、道路/地形/卫星内容、原生地图渲染外观及不可移除的 provider/legal chrome。App-owned Map/Search/spot-information-panel 产品 UI 由本节后续合同明确规范。
- 原生 App 与 owner-operations/运营端设计档案。
- 新的信息架构、业务流程、评分算法或未经权威定义的产品能力。

### 2. 色彩系统

语义所有权：sky/periwinkle 负责时间、选择与信息焦点；meteor yellow 负责唯一最终承诺、天象事件和稀缺好窗口；trail green 负责路线、地形、可行机会和良好户外条件；risk coral 负责风险、阻断和失败。单一局部区域最多使用两种非中性色，另可加入必要风险色。日间大面积只使用纯白中性画布/表面，深色只承担可读文字；subtle neutral 仅用于局部分区和轨道，不得把页面重新染成米黄，也不得用任何强调色反复染标题、边界和普通容器。

完整值位于 `tokens.scss` 与 `colors_and_type.css`。所有普通文本组合需达到 4.5:1；大文本和关键图形边界需达到 3:1。状态必须同时有文字、图标、形状或线型，不得只靠颜色。

#### 2.1 日间模式

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#FFFFFF` | 纯白页面与 page-like panel 背景 |
| surface | `#FFFFFF` | 控件、内容面 |
| surface-subtle | `#F6F7F5` | 仅局部技术带、轨道、skeleton 与隐式分组 |
| text-primary | `#282B29` | 炭黑主要文本，对 canvas 14.44:1 |
| text-secondary | `#5E655F` | 次级文本，对 canvas 6.08:1 |
| text-tertiary | `#6D746D` | 必要辅助信息，对 canvas 4.88:1 |
| border | `#E2E5DD` | 安静分隔线，不单独承担状态 |
| border-strong | `#8A9088` | 关键图形边界，对白 3.27:1 |
| sky / sky-soft / sky-strong | `#8799F6` / `#F5F6FF` / `#4859B8` | 时间、选择、信息焦点；soft只作极浅选中面，状态另有边界/indicator/checked |
| meteor / meteor-soft / meteor-strong | `#F2C94C` / `#FFF7D6` / `#6F5500` | 最终承诺、天象、稀缺窗口；strong 对 soft 6.56:1 |
| trail / trail-soft / trail-strong | `#62C88B` / `#E9F8EE` / `#1F6B45` | 路线、地形、可行机会；strong 对 soft 5.89:1 |
| risk / risk-soft / risk-strong | `#E66F66` / `#FFF0ED` / `#973D37` | 风险、失败；strong 对 soft 6.23:1 |
| focus | `#6174D8` | 可见组件边缘的 4rpx 内侧键盘焦点，对白 4.20:1 |
| on-sky / on-meteor / on-trail | `#202332` / `#3A2E00` / `#153B2A` | 亮 common 填色上的深色文字，分别为 5.87:1 / 8.43:1 / 6.00:1；禁止白字 |

#### 2.2 夜间模式

| 角色 | 值 | 使用 |
|---|---:|---|
| canvas | `#11120F` | 中性近黑页面背景 |
| surface | `#181A17` | 主要内容面 |
| surface-subtle | `#242720` | 低色度技术带/行 |
| text-primary | `#F5F3EC` | 主要文本，对 canvas 16.93:1 |
| text-secondary | `#BEC2B8` | 次级文本，对 canvas 10.38:1 |
| text-tertiary | `#989E94` | 辅助说明，对 canvas 6.85:1 |
| border | `#343830` | 普通分隔线 |
| border-strong | `#666D62` | 关键图形边界，对 canvas 3.52:1 |
| sky / sky-soft / sky-strong | `#A9B6FF` / `#292D45` / `#D1D7FF` | 选择、时间；strong 对 soft 9.56:1 |
| meteor / meteor-soft / meteor-strong | `#F6D56F` / `#3A3118` / `#FFE5A0` | 最终承诺、天象、窗口；strong 对 soft 10.39:1 |
| trail / trail-soft / trail-strong | `#7ED7A1` / `#1B3426` / `#B7EACB` | 路线、机会；strong 对 soft 9.99:1 |
| risk / risk-soft / risk-strong | `#FF8F87` / `#452724` / `#FFC0BA` | 风险、失败；strong 对 soft 8.61:1 |
| focus | `#B4BEFF` | 内侧键盘焦点，对 surface 9.80:1 |

夜间不是观测模式。夜间仍可用四种语义色，但局部区域遵守“两种强调色上限”。

#### 2.3 观测模式

观测模式是独立作者模式，不是夜间主题覆层。它只允许纯黑与暖红家族：`#000000`、`#110000`、`#190000`、`#240000`、`#5B1712`、`#7A1E18`、`#A83229`、`#C23D32`、`#D84A3C`、`#FF6B58`。禁止蓝、白、黄、绿与中性灰闪现，包括加载、系统回退、图片占位、焦点环和切换过渡。

- 主要文本 `#FF6B58` / 黑：7.50:1。
- 次级文本 `#D84A3C` / 黑：4.96:1。
- `#C23D32` 只用于大文本或图形，不用于普通正文。
- 关键边界 `#A83229` / 黑：3.15:1。
- 错误仍用暖红，但必须附“阻断/失败”文字和图标；不新增其他色相。
- 切入前先准备观测模式令牌，再在同一帧替换整棵界面，避免过渡中出现白闪。

#### 2.4 组件映射

- Decision Summary：结论文字保持中性；建议用 trail、时间用 sky、稀缺窗口用 meteor，湿滑风险才用 risk；证据带分成局部子区遵守两强调色上限。
- Observing Window：轨道选中段用 sky；稀缺天象窗口可加入 meteor；不同时再加入 trail。
- Route/Elevation：trail 专属；风险标记可叠加 risk。
- Sun/Moon Event：meteor 专属；选中游标仍用 sky。
- Provenance/Freshness：默认中性色；stale 用 meteor 图标+“数据较旧”；offline 用 risk+“离线缓存”。
- 数据矩阵：中性底；只给当前选择列和真正异常单元着色，不把每一行染成不同颜色。
- Map / Search：大面积 chrome 使用 neutral canvas/surface；query/selection 用 sky，机会用 trail，selected filter ornament 与稀缺天象用 meteor，失败/阻断用 risk。所有 filter 属于同一 Checkbox/Radio 语义家族，不创建 quick/advanced 两套 token 或组件。
- Marker / Spot panel：formal marker 的 neutral core、selected sky boundary、锚点形状和 panel visible state 共同表达选择；marker 直接打开三档信息 panel，不保留 selected callout 或独立 Detail 页面。
- Analysis/Legend：独立`观测条件`Bar已退休；当前layer/metric和唯一时间值只在`map-layer-selector` sheet的紧凑summary中出现。Active overlay legend同时使用色带与文字/形状，不混合多个layer legend。

### 3. 字体与图标

字体不依赖网络资源，也不声称打包字体。中文和界面统一使用：`"Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif`。Windows 优先使用可用的 Noto Sans SC，微信平台自然回退到 PingFang SC。数字/时间可使用 `"SFMono-Regular", Consolas, "Liberation Mono", monospace`，只用于对齐数据，不用于导航、分类标题或长文。

| 角色 | CSS px / rpx | 行高 | 字重 | 说明 |
|---|---:|---:|---:|---|
| conclusion | 18 / 36 | 25px / 50rpx | 600 | 稀有且真实的一句结论；当前 spot panel 不使用 |
| page-title | 17 / 34 | 23px / 46rpx | 600 | 页面或 full document identity |
| section-title | 13.5 / 27 | 19px / 38rpx | 550–600 | 只有命名有助扫描/导航的主要章节 |
| body | 12 / 24 | 17px / 34rpx | 400 | 中文正文、核心列表值与 Search partition |
| ordinary-action | 11.5 / 23 | 16px / 32rpx | 500 | 普通按钮与行内动作 |
| compact-choice | 10.5 / 21 | 14.5px / 29rpx | 500 | 紧凑筛选、rail 与短值 |
| metadata | 10 / 20 | 14px / 28rpx | 400 | 距离、更新时间、次级证据 |
| final-commit | 12.5 / 25 | 17px / 34rpx | 550 | 唯一最终提交 CTA |
| snackbar | 12 / 24 | 18px / 36rpx | 400 | 消息；动作使用 11px / 16px、500 |
| status-tag | 9.5 / 19 | 13.5px / 27rpx | 500 | 仅改变使用的短状态词 |

- 中文标题、按钮与标签字距均为 `0`，不得负字距或人为追踪。
- 正文与 helper 使用 400；普通标签/控件使用 400–500；标题使用 500–600；600 只保留给结论与关键时间。普通界面禁止 700，正文禁止脆弱 ultralight。
- 数字采用等宽数字 `font-variant-numeric: tabular-nums`；时间轴每列共享宽度。
- 导航与分类标题使用中文系统字体、自然字距，不使用 tracked uppercase 或等宽行政标签。
- 200% 文本缩放与长中文按钮/字段标签必须单独验证；允许换行，不以缩小字号维持单行。紧凑密度不得通过裁切、灰到不可读或全局机械缩放实现。
- 图标使用单一线性家族：22/24/28rpx 三档，默认 3rpx 描边；圆端点、圆连接，不混用填充图标集。实现通过项目 `SemanticIcon` adapter 本地化一小组 ISC 许可 Lucide path；产品专用天文几何与 rounded star 走同一资产管线。可见图标与 88rpx target 分离，不为命中面积同步放大图形。不得引入完整第二 UI 系统或运行时远程图标。
- 图标不单独表达关键含义；无可见标签的 icon action 必须有可访问名称。

### 4. 间距、密度、占用率与几何

#### 4.1 间距

以 8rpx 为主基线、4rpx 为微对齐：`0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64, 80, 96rpx`。320/375/390px 等效视口使用 `24rpx`（12 CSS px）页边距，430px 使用 `32rpx`；全屏 map/sky overlay 可使用 `16–24rpx` edge inset。紧凑不是把内容塞满，也不是机械缩小整页；它由以下四层留白共同控制：

1. **屏幕 / 布局留白**：12–16px 等效移动边距与安全区阻止内容贴边；不因追求“高级”制造空白列。
2. **组间节奏**：相关项 3–5px，普通组 6–8px，章节 11–14px；先删除无效说明，再靠距离表达关系，最后才考虑容器。
3. **组件内部留白**：文字、图标、thumb 与可见边缘之间必须保留稳定呼吸；compact 水平 6–8px、ordinary 8–10px、final 12–16px，卡片 6–8px compact / 8–10px normal。
4. **视觉重量留白**：字号、字重、行高、边框明度、填色面积与 thumb 比例共同限制“占满感”。默认文字 400、动作/选中 500、结论/主标题 600；不能用更粗字、更深边或更大填色补偿层级不足。

可见几何与命中几何分离：紧凑选择可见 `56rpx`，普通动作 60–68rpx，最终承诺 80–88rpx；交互包装始终至少 88rpx，扩展区不得与相邻目标重叠。不要为了命中合同把背景、描边、图标和文字一起撑到 88rpx。text/search field 可见表面 `80rpx`，其 input wrapper/target 为 `88rpx`；textarea 自然更高。

#### 4.2 语义圆角

| 令牌 | 值 | 使用 |
|---|---:|---|
| radius-none | 0 | 表格、矩阵、长分隔线 |
| radius-data | 4rpx | 数据单元、轨道 |
| radius-band | 8rpx | 条带、矩阵外框 |
| radius-control | 12rpx | 输入、普通按钮 |
| radius-control-lg | 16rpx | 分段控件、icon action |
| radius-panel | 20rpx | 紧凑内容面板 |
| radius-panel-lg | 24rpx | 主内容面板 |
| radius-friendly | 32rpx | 权限、帮助、温和提示 |
| radius-sheet | 48rpx 48rpx 0 0 | 边缘 sheet，仅顶部 |
| radius-pill | 999rpx | 仅状态/筛选/紧凑值 |

分组优先顺序：先用间距，再用表面明度差，再用 1rpx 边界；只有浮层、临时拖起面和需与滚动内容脱离的元素使用阴影。禁止“每组一个卡片”。

#### 4.3 边界与高程

- 普通边界 1rpx；选中/关键边界 2rpx。触摸点击不留下持续焦点框；文本输入以光标与 1rpx 浅色调变化表示正在编辑。只有外接键盘、桌面小程序或辅助键盘触发 `:focus-visible` 时，才在可见表面内侧使用单一 4rpx 等效下边缘/局部边缘，禁止完整深蓝框、外偏移、双框、光晕、命中盒描边或几何变化；`pointer: coarse` 下不持久显示。
- elevation-0：无阴影，默认。
- elevation-1：`0 4rpx 16rpx #282B2912`，仅 sticky 控件/浮起行动栏。
- elevation-2：`0 16rpx 48rpx #282B2920`，仅 sheet/dialog。
- 夜间阴影降低可见度并依赖边界；观测模式禁止阴影光晕，以暖红边界区分层级。

#### 4.4 移动基线 → Starward 应用

| 场景 | Starward 应用 | 可见表面 | 命中与组合 |
|---|---|---:|---|
| 最终承诺 | 提交、确认加入计划；每个页面决策层只保留一个 meteor 主动作 | 80–88rpx，13px/18px，550；可按页面宽度展开 | target ≥88rpx；不与同级实心按钮并列 |
| 普通动作 | 查看证据、重试、保存调整、导航 | 60–68rpx，12px/17px，500；按内容收缩 | 外层目标 ≥88rpx；不伪装成最终 CTA |
| 重复选择 | Checkbox/Radio 的紧凑外观、Choice Bar 值 | 48–56rpx，10.5px/14.5px，500 | 88rpx 行/单元命中；相邻扩展区不重叠 |
| 图标 / 安静动作 | 更多、关闭、稍后、展开 | 48–56rpx 表面或无填充；24–32rpx 图标 | 88rpx 命中；必须有名称，安静于 selected；键盘焦点另走 fallback |
| 分组容器 | 普通内容靠留白、字级和分隔线；恢复/权限才用 friendly panel | 6/12rpx 节奏，24–32rpx 移动边距 | 先删除无效说明；矩阵、轨与带共享轴，不把每项包成卡片 |
| 决策 / 不确定性 | 结论 → 影响/行动 → 证据；新鲜度贴近受影响证据 | 明亮语义边缘 + 短因果动效 | 活力不依赖大字、深蓝板、过量 padding、渐变、光晕或装饰流星 |

基线依据只用于原则与结构翻译，不复制品牌视觉、页面编排或把任何单一平台数值当作 Starward 的普遍答案：WeUI/TDesign 的紧凑小程序动作层级用于校准文字与表面占比；Apple/Android 的命中意图用于分离 visible/hit geometry；WCAG 2.4.13 用于校验键盘指示可见性；Android 4/8dp 与 16dp 边距用于移动节奏；WMO/NOAA 的影响优先与不确定性表达用于“判断→影响/行动→证据/新鲜度”；NASA/AMS 的流星黄/绿来源只建立户外身份，不编码科学测量。来源：<https://github.com/Tencent/weui/blob/master/src/style/widget/weui-button/weui-button.less>、<https://tdesign.tencent.com/qq-miniprogram/components/button>、<https://developer.apple.com/design/human-interface-guidelines/buttons>、<https://developer.android.com/guide/topics/ui/accessibility/views/apps-views>、<https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html>、<https://developer.android.com/design/ui/mobile/guides/layout-and-content/content-structure>、<https://developer.android.com/design/ui/mobile/guides/layout-and-content/grids-and-units>、<https://wmo.int/media/news/impact-based-forecasting-informs-anticipatory-action>、<https://repository.library.noaa.gov/view/noaa/69977>、<https://www.nasa.gov/blogs/watch-the-skies/2023/12/05/gorgeously-green-geminids-peak-next-week/>、<https://www.amsmeteors.org/fireballs/faqf/>。

移动表单与组件衔接进一步吸收开源组件库的可迁移逻辑而不复制品牌表面：Ant Design Mobile 的 Form/List/Selector/ImageUploader 以原子字段、就地反馈、共享行节奏和单一提交减少重复容器；Ant Design proximity 以一致近邻表达归属；TDesign Mini Program、Vant Weapp、Taroify 与 NutUI Taro 共同证明紧凑来自 token 化的 label/value 轴、稳定目标、局部状态和少量 section gap，而非缩小可读性。当前生产实现使用 Taro `4.2.1` + React `18.3.1` primitives 与既有 Starward components/coordinators 作为 bounded generic substrate，并由现有 owners 投射本节精确 tokens。对 `@taroify/core@1.0.6` 的完整 package inspection 发现其 mandatory `@taroify/icons` dependency 与唯一 `SemanticIcon` owner 冲突，因此本次 implementation binding 不予引入；它与 Ant Design Mobile、TDesign、Vant Weapp、NutUI Taro 均只保留为结构研究证据，不成为第二 UI/icon/state owner。来源：<https://mobile.ant.design/zh/components/form/>、<https://mobile.ant.design/zh/components/list/>、<https://mobile.ant.design/zh/components/selector/>、<https://mobile.ant.design/zh/components/image-uploader/>、<https://mobile.ant.design/zh/guide/faq/>、<https://ant.design/docs/spec/proximity/>、<https://github.com/Tencent/tdesign-miniprogram>、<https://docs.taro.zone/en/docs/hybrid>、<https://github.com/taroify/taroify>、<https://taroify.com/components/form/>、<https://taroify.com/components/config-provider/>、<https://youzan.github.io/vant-weapp/>、<https://nutui.jd.com/taro/react/2x/>。

#### 4.5 开源组件复用与设计权威边界

- 设计资源只展示 Starward UI/UX、状态和动效；对应技术说明以“library / component / Starward adaptation”标注。组件库提供通用交互、表单连接、弹层、滚动和可访问性基础，不拥有 Product Surface、Control key、业务 state、exact token、文案、数据或验收真相。
- Current mapping：Primary navigation=`View/Button navigation rail`；Search=`Input + Button + ScrollView`；spot panel=`View + Button + ScrollView + bottom-presentation coordinator`；section/action rails=`View + Button`；layer sheet=`View + Button + bottom-presentation coordinator`；Settings/My=`Button + Input + Switch + existing Starward state owners`；Contribution=`Input + Textarea + Switch + Button + ScrollView + existing Starward form owner`。短暂异步反馈只由现有 `notification-feedback` owner 呈现。所有 glyph 仍通过现有 `SemanticIcon`，不得安装第二 icon family。
- Specialized mapping：Curved Time Ruler 继续使用 Taro enhanced horizontal `ScrollView`，因为 generic Slider/Picker 不具备 real-slice curved scrub语义；三态 display track由一个可访问的 Starward button/radio-equivalent owner 实现，不复用 binary Switch 外观；Search fixed-frame transition、panel same-document/media phase、handle-only hot region、panel/layer互斥、upload transport/idempotency等均由现有 Starward owner 包裹。
- Generic FloatingPanel 只有在其完整 dependency closure 与唯一 icon/state owner 相容，且真实 WEAPP 证明三 anchors、唯一滚动、nav-safe height、可中断 retarget以及仅`104×40rpx`header热区均成立时才可替换现有实现。本次采用 Taro `ScrollView` + 当前 panel coordinator，不扩大热区、不改变设计。未来 library admission 仍须复核 version/license/lock/tree-shaking/bundle、WEAPP/IME/safe-area/a11y/gesture 与 day/night/observation 主题投射。
- 禁止并行引入两套通用 UI suite、复制 library brand defaults、让 library form store成为第二 draft/state truth、使用 runtime CDN/remote asset、或为了声称复用而用语义不等价组件。任何外部 suite 的升级或替换只能发生在 Starward owner/adapter 下方，并保持本系统的精确尺寸、层级、边距、语义与产品状态。

#### 4.6 八轴实践矩阵

这张矩阵是本系统的耐久设计上下文。跨平台基线只定义可迁移原则；Starward 列把原则翻译为户外观星决策界面；Do not 列用于评审时 fail closed。

| 轴 | 跨平台基线 | Starward 户外 / 天文决策应用 | Do not |
|---|---|---|---|
| Layout 布局 | 320/375/390/430px 按内容优先级 reflow；200% 文本时重排而非缩放整页 | 结论、影响/行动、证据按纵向优先级连续；共享时间轴的标签列固定、数据列局部滚动 | 不按单一 390px 截图等比缩放；不让技术表制造页面级横滚 |
| Whitespace / density 留白密度 | 12–16px 移动边距；4/8px 节奏；屏幕、组间、组件内部、视觉重量四层分别控制 | 相关项 3–5px、普通组 6–8px、章节 11–14px；文字/图标/thumb 不贴边，先删除噪音，再用共享轴/divider 分组 | 不把 24–32px 当日常卡片 padding；不留空白列，也不把内容塞满模拟“紧凑” |
| Type hierarchy 字体层级 | 尺寸、字重、行高、间距和少量语义色共同建立层级 | conclusion 18/25、page 17/23、section 13.5/19、body 12/17、ordinary 11.5/16、compact 10.5/14.5、metadata 10/14、status 9.5/13.5；400/500/600 三档 | 不用全局粗黑、追踪大写、中文加字距或等宽导航；不全局机械缩放或把辅助字变得不可读 |
| Color 色彩 | 中性承担大面积；强调色按语义和局部焦点使用；状态不得只靠颜色 | sky=时间/选择，meteor=最终承诺/天象/稀缺窗口，trail=路线/机会，risk=风险；局部最多两强调色 + 必要 risk | 不以深蓝覆盖标题、边框和容器；不把语义色做成彩虹指标墙；不在亮 common 上习惯性用白字 |
| Cards / containment 卡片容纳 | 留白、字级、分隔线是默认容纳；卡片只包一个可独立识别的对象 | 重复事实使用行/带/矩阵；长卡可容纳一个观星点对象并用内部分隔行组织 | 不嵌套卡片；不把每个状态/指标/选择做成卡；卡内不放多个竞争 CTA |
| Buttons / actions 按钮动作 | 命中区至少 44px；可见面可更小但扩展区不重叠；一个局部主动作 | compact 28px、ordinary 30–34px、final 40–44px；只有最终承诺可全宽并使用 meteor | 不把每个按钮都做 44/48px 实心大面；不让普通重试/导航看起来像提交 |
| Visual focus 视觉焦点 | 触摸反馈、编辑态与键盘焦点分流；pressed/selected/disabled 各自有语义 | touch=80ms press 后恢复；input=光标+1px 浅变化；keyboard=`:focus-visible` 内侧下边缘 | 不把焦点当普通移动状态展出；不用完整深蓝框、offset 外环、双框、光晕或命中盒描边 |
| Mobile adaptation 移动适配 | 触控、键盘、读屏、长标签、安全区和 200% 文本一起验证 | Search field 过渡前后保持同一 40px 可见面/44px target；large panel只填充主导航上方、居中悬浮section rail、compact action rail与bottom layer sheet避让安全区 | 不以隐藏、裁切或压缩表格通过窄屏；不显示 scrollbar chrome；不把桌面栏位仅缩小后塞进 320px |

### 5. 布局、平台与可访问性

- 以 750rpx 设计宽度映射：375 CSS px = 750rpx；320/390/430px 等效视口必须重排而非缩放整页。
- 320px：24rpx 页边距；压缩列间距，弧形时间尺允许自身横向手势但整页不得横滚；优先显示结论、主窗口和主要行动，所有 scroll owner 保持可滚动但隐藏 scrollbar chrome。
- 375/390px：标准单列，技术矩阵使用固定标签列 + 可滚动时间列。
- 430px：使用 32rpx 页面边距，不无限拉宽单元；内容最大阅读宽度 820rpx。
- 每个触控目标至少 88rpx；重复选择可见 48–56rpx、普通动作 56–64rpx、最终承诺 76–84rpx；扩展命中区不得重叠，相邻目标可见间距至少 8rpx。
- 顶部内容避让微信菜单胶囊与 `env(safe-area-inset-top)`；底部主操作/导航加 `env(safe-area-inset-bottom)`。
- 键盘：所有交互可 Tab 到达；Choice Bar 支持方向键/Home/End；Escape 关闭 sheet/dialog；Enter/Space 激活。
- 状态：pressed/active 用 80ms 轻微 tonal/边界变化与 scale .985，抬起即恢复；selected 使用 soft 语义底 + 单一移动指示 + 程序状态。触摸不留下持续焦点；文本编辑态只用光标与 1rpx 浅变化；外接键盘/桌面/辅助键盘的 `:focus-visible` 使用组件内侧下边缘并与相邻颜色 ≥3:1；hover 仅供文档浏览器且弱于 selected；disabled 保持可读且不似选中。
- 屏幕阅读器：数据带提供可读摘要和表格语义；状态变化使用适度 `aria-live="polite"`；错误与字段通过 `aria-describedby` 关联。
- 放大文本至 200% 时不得截断；长标签换行，数据值可保持一行但标签列加宽或转为上下结构。
- 每个移动 scroll owner 必须同时保留 touch/wheel/keyboard/programmatic/screen-reader reachability 并隐藏纵横 scrollbar chrome；不得用 `overflow:hidden` 或裁切正文代替。WEAPP/Taro 优先 `ScrollView enhanced + showScrollbar=false`；H5/prototype 同时覆盖 Firefox、旧 Edge 与 WebKit 的 scrollbar-hiding declarations。
- 不以色彩单独表达状态。Permission、risk、failure、partial/stale/unavailable 仅在具体状态改变当前结论、动作或恢复路径时可见，并直接说明受影响事实与结果；禁止常驻“部分数据”等泛化 badge。
- 普通 material surface/state change 使用可中断、从 live presentation retarget 的因果动效，不突然出现或消失。`prefers-reduced-motion` 移除大幅位移、惯性与装饰运动，保留直接操控、即时功能状态和焦点反馈。

### 5A. Map / Search / Spot Information 产品 UI 合同

本合同只规范小程序自有的 Map、Search、spot-information-panel chrome；Surface、Control、状态与 commit/cancel/recovery 仍由 Mini Program Screen Contract 拥有。地图 provider、basemap、tile、道路/地形/卫星内容、native rendering 与不可移除 legal chrome 不属于本设计系统。

#### 5A.1 Map 主体与悬浮 Search

- 地图连续铺满 route 的可用内容区，是唯一地图对象。顶部只放一个 fixed floating Search field，左右 inset `24rpx`、top=`safe-top + 16rpx`、visible height `80rpx`、input/target `88rpx`、`radius-panel`、solid `surface`、`1rpx border`、`elevation-1`。它不承载 filters、results、快捷入口或说明副标题；activation 进入专用 Search page。
- Location/layer edge actions 使用 `52–56rpx` 可见面、`88rpx` target、`8rpx` 间距，glyph `24–28rpx`。Layer trigger 只打开第 5A.4 节的固定高度 bottom sheet；原独立`观测条件`卡片并入sheet，不在地图右侧展开文字rail。普通底图、默认marker、卫星、交通、雷达、风、温度不得被补成choice。
- Formal marker 默认 `32rpx` neutral core + `2rpx border-strong` + 下锚点；selected 使用 `40rpx`、`sky-soft` core、`2rpx sky` boundary 和 panel-visible/programmatic state。禁止 glow、pulse、particle。真实 hit geometry 由 native adapter 另证，Search result list/semantic list 是完整非手势替代。
- Marker 直接以`medium`打开 `map-spot-information-panel`，不保留 selected callout、Finder Sheet 或独立 detail route。非 marker map tap 从 panel 当前 live position 执行 `220ms exit` 向下离场，完成后才移除 hit/semantics，不得瞬间消失。

#### 5A.2 Dedicated Search、统一 filters 与 results

- 页面按 Search → titleless unified filters → `想去`/`其他观星点` partitions 排列，一个 keyboard-safe vertical scroll owner。Map entry 与 Search field 使用同一 visual frame和同一可见query/placeholder字符串：outer rect、fill、border、radius、shadow、text、type baseline、slot 与 caret origin不变；leading glyph只在相同`88rpx`slot内Search→Back交叉替换，两态均无trailing `x`/clear/chevron。Field默认autofocus；任意外部有效tap可blur、关闭suggestions/IME而保留route/query/filter/result/scroll，再次tap可重新focus。Back glyph、系统/微信Back与平台edge-back都pop Search child回Map。Field以下内容以clip/reveal + `translateY(-12px→0)` + opacity `0→1` / `180ms`向下展开，field自身不动；退出反向`160ms`。
- Query suggestion overlay紧贴field下沿`4rpx`；每行visible=`72rpx`、完整target=`88rpx`、icon=`22rpx`、水平padding=`16rpx`，行间只有`1rpx`divider。Filters从field或overlay下沿`4–6rpx`开始，不分quick/more，不显示“筛选条件”标题、介绍、分隔线、高级编辑、draft count、apply/revert或checkbox table。每个capsule visible=`44rpx`、target=`88rpx`、padding=`10rpx`；prefix icon=`20rpx`、gap=`4rpx`、label 10.5px/14.5px。Filter group到首个partition视觉距离=`12–16rpx`。
- Selected star 为 `48rpx` 圆润五角实心 ornament，`right:-4rpx; top:-8rpx`，不参与 inline sizing、不预留 trailing width。Day `meteor` opacity `.32`，Night`.30`；它可半透明覆盖 trailing text，但文字仍须可读。Selected另有`sky-soft`fill、`2rpx sky`inset boundary与checked state；Observation映射暖红而不保留黄色。
- Select star 使用 `scale(.42) rotate(-14deg) opacity(0)` → `scale(1) rotate(5deg) opacity(.32)` / `170ms standard`；deselect 反向到 `scale(.56) rotate(-7deg) opacity(0)` / `140ms exit`。从 live state retarget，不排队、不改尺寸；reduced motion只保留≤80ms fill/opacity。
- Result Card占满内容列，min-height`156rpx`、`radius-panel`、`1rpx border`。合法图片cover整卡；leading readable text field固定`52%`。Day overlay从leading edge `rgba(255,255,255,.82)`到52%为`.66`，于66%连续淡至transparent，因此图片在左半仍以低对比可见；不用opaque slab、blur/glass。无图时只渲染normal solid card，不存在图片节点、placeholder、标签、固定高度空档或附加空间。
- Whole card是唯一selection action；右侧不出现“选择”或第二control。选择返回现有Map、提交同一formal spot并默认打开medium panel。Partition heading只用body/600与44px operable row；展开/收起保留同一DOM/state tree，以measured live height/clip+opacity在`160ms`可中断retarget，完成后才移除hit/semantics，不得remount、`display:none`、reset scroll或产生抖动/闪烁。城市只作group heading。

#### 5A.3 Spot Information Panel

- Panel 是 Map-parallel non-modal owner，状态为 hidden + `small|medium|large` 三个 visible extents。`small=232rpx + bottom-safe`；`medium=clamp(500rpx,52dvh,700rpx)`；large填满`mini-primary-navigation`上方的primary content viewport：`top:0;left:0;right:0;bottom:nav-top`，不覆盖或替换Map/My导航。Small/Medium top radius`32rpx`，Large top radius`0`且无外阴影；所有extent铺满content width。
- 三档始终挂载同一份、同序、同identity的客观document：地点identity→route/access/facility/safety→guides/field/source→天文信息→sky geometry→ruler→matrices/targets/source。Small/Medium只是较短viewport裁剪；Large才启用唯一隐藏scrollbar chrome的internal vertical scroll。禁止按extent分别渲染、remount、重新排序或重复mapping。唯一presentation例外是合法media：small/medium不占media，medium→large时才在document顶部连续拉出；无图从不渲染media node/placeholder/空档。
- Handle visible=`52×5rpx`；physical hit region=`104×40rpx`，assistive semantic target≥`88×88rpx`。无media时保留结构handle band=`40rpx`，在drag中持续存在且不是大片空白；media开始拉出后handle overlay到image，band连续收为0。Pointer down只改tonal/opacity，不改变extent/top/height/transform；未越过8px阈值的tap/release为no-op。
- Large左边缘`32rpx`edge zone右滑或handle下拉执行Back语义的`large→medium`，保留selected spot、section与meaningful scroll；具名extent controls提供非手势等价。普通Back/Escape顺序为owned disclosure→large→medium→small→hidden→route。Panel body/content/media或泛化top-edge均不发起extent drag。
- Panel top/media/content size必须在每个direct-manipulation帧按live extent、safe area与actual media presence计算。有合法media时`mediaReveal=clamp((p-.50)/.28,0,1)`，clip-height从0到`clamp(300rpx,27dvh,420rpx)`，image从`translateY(-18rpx) scale(1.02)`到0/1；无图没有media phase。
- 只有panel top接近screen top才淡出Map chrome：`chromeFade=1-clamp((p-.82)/.12,0,1)`。Search、Location与Layer trigger共享该phase，opacity≤.08才移除hit/semantics；反向先恢复chrome，再收media。不得在图片刚拉出时提前隐藏chrome。
- Large content padding`24rpx`且不为section rail预留全局列。Rail absolute/fixed在panel visual viewport，`top:50% + translateY(-50%)`、right`10rpx`、visible width`60rpx`、outer height`104rpx`、padding=0、overflow clip、single `radius-pill` outline；两个`52rpx`items贴紧上下边、gap=0，中间仅共享divider。Active=`#F5F6FF`+indicator；无outer/drop/right shadow或item translate。
- Bottom action bar左右inset=`40rpx`、bottom=`safe-bottom + 8rpx`、outer interaction lane=`88rpx`、visible pill height=`52–56rpx`；三项等宽，顺序为icon-labelled`想去`、`分享`、`云观星`，visible icon=`22rpx`、label=`18–19rpx/26rpx`。Favorite与filter ornament共用同一rounded-star `SemanticIcon` source。
- 只有handle hit region内的vertical panel drag从live position跟手；whole panel body/content/media不启动extent drag。Curved ruler的horizontal gesture获胜后panel不得抢占。Release使用nearest snap + velocity和bounded spring，≤280ms；tap handle为no-op。

#### 5A.4 图层、观测摘要、状态与模式

- 原独立`观测条件`Bar/Control已退休；其local time、selected analytical layer与objective value只在`map-layer-selector` sheet内形成紧凑factual summary，不在Map左下另占surface。Time control复用Curved Time Ruler且只有一个current-time owner。
- Map analytical layer 使用 solid canvas/surface 与 dividers，不用 glass/card wall。Sheet overlay不remount或移动地图；同一物理地图、camera、selection与scroll coordinates保持连续。
- App-owned legend 只随 active analytical overlay 出现，使用 `radius-band` solid strip、`1rpx border` 与 label/value/shape；一次只有一个 layer legend。
- Day/Night 使用当前 roles；Night 不用 glow/neon。Observation 中 app-owned Search、marker、panel、rail、legend、loading、focus 和过渡只用 closed black/warm-red roles。不能主题化的 native/provider surface 必须在进入前提供 safe cancel/return 或 non-field alternative。
- `map-layer-selector`由紧凑Map-edge trigger与固定高度bottom-sheet presentation组成，不新增第二Control key。Trigger active只用极浅`sky-soft=#F5F6FF`+inset boundary且几何不变。Sheet=`332rpx + safe-bottom`，top radius`28rpx`，无drag handle、`x`、Close row、多extent暗示或“关闭图层”。只列`光污染/总云量/观测机会`三个Source-supported值，每项为本地生成/自有abstract image-backed矩形卡；selected同样只用极浅fill、inner boundary和checked state。
- Map只有一个`bottomPresentation = none | spot-panel | layer-sheet` coordinator。打开layer直接把spot presentation retarget为layer；panel hit/semantics/active在退出后清除，但selected spot与previous extent保留。Layer open时marker/result intent直接把同一owner retarget为新spot medium，不先恢复旧panel。关闭layer只在没有更新intent时恢复prior extent。任何帧不得同时存在panel/layer两个visible或active flag。
- Loading/empty/partial/stale/error/offline/permission 使用 `notification-feedback` 与 `page-state-recovery`，保留可信地图、点位、filter 和 panel state，不用 fixture 补值。只有具体影响判断/动作/恢复的状态可见并说明其影响；Search/filter/panel/layer/selection 的局部状态已是反馈，不另弹 floating notification，也不展示操作教程或实现说明。
- `320/375/390/430`、safe area 与 `200%` text 必须 reflow。每个 action 有 role/name/state/value/focus order；Search、filters、results、panel extents/sections/actions、layer/time/close 可 keyboard/assistive 操作。Back/Escape 先关闭 owning disclosure/panel，再返回逻辑 opener focus。

### 5B. Settings 与 My

- Settings只保留一个`display-mode-switcher`，值域=`day|night|observation`且默认day；`observation-mode-control`不再是独立组件或页面底部CTA。该控件是single-choice三站滑轨而不是二值Switch：track max-width=`560rpx`、visible height=`72rpx`、三站等宽、每站target≥`88rpx`，thumb包含由`SemanticIcon`提供的Sun/Moon/Star与短label。
- Tap任意站直接选择；tap当前thumb在有next时前进一步。横拖越过8px后跟手，向右`day→night→observation`、向左反向，不wrap、不跳站；release按position+velocity snap。方向键/Home/End与screen-reader direct choice等价。
- Day↔Night使用`180ms`thumb transform与Sun/Moon scale/rotation/opacity交叉；Night↔Observation先原子绑定closed black/warm-red tokens，再做Moon/Star opacity/微旋转，过程中禁止白/蓝/黄/绿/中性灰闪现。Reduced motion即时snap并保留≤80ms icon opacity确认。
- My root只重排现有account/profile/plan/contribution/profile-links/import/settings职责。Compact header min-height=`120rpx`、avatar=`72rpx`、gear visible=`48rpx`/target=`88rpx`；status strip与Plan/Contribution共享一次surface/divider，routine rows target=`88rpx`。Plan、Contribution、Profile link与Import/Settings使用`48rpx`语义色soft icon tile和`24rpx`统一stroke glyph；颜色辅助扫描，不新增商业模块、banner、假统计、Favorite副本或第二图标系统。

### 5C. Compact Contribution Intake

- Production composition使用第4.5节已选定的 Taro Input/Textarea/Switch/Button/ScrollView primitives 与既有 Starward form/upload/notification owners，并覆盖为本系统精确 token；这不是在 viewport 展示组件库说明，也不把 draft、transport 或业务 validation 交给 library。
- `content/contribution/index` 只有一个 keyboard-safe vertical scroll owner。顶部只保留 quiet Back 与 page-title，不设 hero、说明卡、重复 close 或卡片墙。从 spot panel 进入时以一条安静 context row 呈现已选 formal spot；从 My 进入时同一位置提供“选择观星点 / 新地点”值，不伪造 spot 或改写 route ownership。
- 信息顺序固定为 report kind + spot context → affected topics + observed time → concise evidence narrative → 仅 new-place proposal 出现的 location consent/location → bounded media + rights → one final submit；提交后的状态列表继续由 `contribution-status-list` 拥有。视觉分组不得发明 wizard、步骤 store、即时发布或新的业务字段。
- 简单字段使用 divider-backed cell row：wrapper/target≥`88rpx`，visible content=`72–80rpx`，horizontal padding=`16–20rpx`，label column=`144–176rpx`且不截断，value/input占余宽。Multiline、topic group 与 media 使用 top-label，label→control=`8rpx`；group gap=`8–12rpx`，section gap=`20–24rpx`。不为每个字段创建 outer card、nested surface、空 section title、重复说明或预留空 helper/error 高度。
- Label 使用 ordinary-action 或 body/500；value/body=`12/17px`；helper/error=`10/14px`；required mark 只标真实 required。Kind 为 single-choice compact rows/chips，topic 为 wrap-safe multi-select；visible=`48–56rpx`而 target=`88rpx`，selected 不改变尺寸。Observed-at 是普通 field row；textarea visible min-height=`176–208rpx`，counter 仅在存在真实上限时显示。
- Location consent 只在 new-place condition 挂载并明确 scope，不为 existing-spot report 请求当前定位。Media grid 在 390px 为三列、320px/200% text 可降两列；cell=`128–136rpx`、gap=`8–12rpx`，thumbnail/progress/retry/remove 在同一 cell；达到上限即移除 add affordance，不留占位。Privacy、rights、precise location 与失败说明只在其改变当前决定时贴近对应 control。
- Validation 在 blur 或 submit 后就地插入，不预留空错误区；提交时稳定 scroll/focus 第一个 invalid field，不能闪白或跳顶。200% text 时 horizontal cell 转 top-label stack，页面不横滚。Uploading/submitting 状态就地替换且不改变 owner；失败保留 draft、media identity 与同一 idempotency key。
- `contribution-submit` 是唯一 filled final commit：content-width、visible=`80–88rpx`、target≥`88rpx`。默认位于 document 末端；仅在真实 viewport/keyboard 验证不覆盖内容时，才可固定到单一`88rpx + safe-bottom` lane并给scroll owner等量bottom inset。不得同时显示正文与底部两个提交。Success 只表述“已提交，等待审核”等真实 pending 状态，不能声称已发布或已核验。

### 6. 领域组件合同

以下组件只规范视觉与组合表达；信息架构由 owning Context 决定。首轮候选审计后的新拓扑必须先写入 Context，再投射这些组件。

#### 6.1 Objective Place Summary

- **Anatomy**：正式地点 identity、距离/预计到达、开放/停车/设施、安全事实、必要数据状态与真实下一步动作。
- **Hierarchy**：地点与到达事实先于详细证据；不由UI生成出发建议、置信评分或最佳窗口。
- **Variants**：available、loading、meaningful partial、stale、offline、blocked；状态必须具体到受影响事实。
- **Layout**：相关事实按共享baseline/divider紧凑排列，禁止孤立圆形评分、松散空列或嵌套评分卡。320px可上下重排，375/390/430px保持一个连续分组。
- **Color/radius**：主体中性；time用sky、route用trail、真实risk才用risk；局部最多两种非中性色+必要risk。
- **A11y**：读屏顺序为identity→route/access/facility/safety facts→affected status→action/evidence。
- **Composition**：最多一个主CTA；Evidence Disclosure为次级，不恢复TripDecision/recommendation copy。

#### 6.2 Objective Astronomy Facts

- **Anatomy**：当前时间、云量、透明度、视宁度、光污染、月相/日月升落、正式目标与来源/新鲜度。
- **Variants**：available、unavailable、partial、event-bound、daily；只展示同一Source的客观facts，不重新评分或推导推荐窗口。
- **Layout**：短事实用aligned rows/shared axis，时间变化由唯一Curved Time Ruler和必要condition band表达；不画“最佳”rail、主/备选窗口或重复时间图。
- **Color/radius**：time用sky、celestial event用meteor、route/opportunity数据本身可用trail，真实异常用risk；事实不靠推荐色变成建议。
- **A11y**：图形可`aria-hidden`，等价文本按时间→客观条件→目标→来源/受影响状态读取。
- **Composition**：不把每项拆成卡，不显示“谨慎出发”“推荐窗口”“最佳窗口”或UI推导的行程建议。

#### 6.3 Risk Strip

- **Anatomy**：风险图标、明确标题、影响、可执行缓解动作。
- **Variants**：notice、warning、blocker、resolved。
- **Layout**：整宽条带；多风险按严重度纵向排列，不横向塞入小 chip。
- **Color/radius**：risk 仅用于图标/边界/阻断词；背景保持语义 soft 色；8rpx。
- **A11y**：`role="status"` 或阻断时 `role="alert"`；不得只显示叹号。
- **Composition**：位于主行动前，阻断时主按钮同步 disabled 并说明原因。

#### 6.4 Curved Time Ruler

- **Anatomy**：唯一 current value、fixed center axis、Taro enhanced horizontal `ScrollView`承载的真实离散 tick track、minor/major ticks、必要 labels、可选 factual event nodes，以及`88rpx`direct-manipulation lane；whole control target≥`88rpx`。Scrollbar chrome始终隐藏；组件没有outer card/border/shadow、解释文案或visible左右arrows。
- **Variants**：可拖动、只读、partial、Map、spot-panel astronomy、Orientation overlay。Visible block=`84rpx`并相对解释对象上移`16rpx`；tick step=`34rpx`；minor=`9rpx`、major=`20rpx`、center selected=`32rpx`；center axis=`2×34rpx`。当前30min cadence每slice一个tick、每2h一个major label；Source cadence变化时只从真实domain重建。
- **Curvature**：以tick中心到viewport中心的normalized distance`u=clamp(abs(x-center)/(viewportWidth/2),0,1)`计算：`scale=1-.56×u^1.2`、`opacity=1-.84×u^1.15`、`translateY=22rpx×u^1.55`。中心最大、最清晰且最高，两侧沿同一浅弧连续变小、变淡、下沉；track在fixed center下移动，不复制current value。
- **Interaction**：拖动每帧preview nearest真实slice；scroll end/projected offset snap到最近valid slice并在≤120ms settle后commit；cancel回到committed offset。新手势从live offset接管，不排队。Horizontal intent获胜后parent panel不抢手势。不显示左右箭头按钮；programmatic increment/decrement只经键盘与辅助技术语义提供，也不显示“每次移动”“释放后对齐”等说明文案。
- **Color/radius**：center/selection sky；event/peak meteor；适用的良好窗口可 trail subordinate band；Observation 用暖红高度/实虚/shape 区分。
- **A11y**：adjustable/slider 暴露 min/max/current 与真实 step，提供键盘/辅助技术increment/decrement和文字摘要，不为此添加visible arrow chrome。320px/200% text只保留center与必要邻近/edge labels，不缩小current。Reduced motion保留直接跟手并即时snap，无额外inertia/spring。
- **Composition / reuse**：一个 viewport 只有一个主时间尺；Map、spot-panel astronomy、Orientation 共享 component family 与同一 committed time store，不同时显示多个 current-time owner。实现复用Taro `ScrollView`的scroll physics/`scrollX`/`enhanced`/`showScrollbar=false`/`onScrollEnd`，project-local层只拥有curved tick projection、label pruning、window/event band与valid-slice snap；不引入第二UI system或把flat React Native ruler package移植为新基础设施。

#### 6.5 Condition Band

- **Anatomy**：指标名、单位、时间序列、异常/缺失标记、趋势摘要。
- **Variants**：云量、透明度、视宁度、风、降水等既有指标；live/partial/stale/offline。
- **Layout**：连续行/矩阵，不拆卡；数值右对齐，缺失用短横+“缺”。
- **Color/radius**：中性表面；选中列 sky；良好机会 trail；异常 risk。
- **A11y**：表头与单元格关联；颜色带同时显示数值/符号。
- **Composition**：3–5 条核心行默认展开，其余进入 Evidence Disclosure。

#### 6.6 Sun / Moon Event Node

- **Anatomy**：节点、事件名、时间、方向/高度（若已有数据）。
- **Variants**：日落、月升、月落、天文暮光等既有事件。
- **Layout**：锚在共享时间轴上；标签上下交错避免碰撞。
- **Color/radius**：meteor 节点与线；选中使用 sky 边界；键盘焦点仍为组件边缘单一 focus 内指示。
- **A11y**：事件列表作为图形后的文字等价；焦点顺序按时间。
- **Composition**：不以装饰天体图替代真实时间信息。

#### 6.7 Route / Elevation Summary

- **Anatomy**：预计到达、路程/海拔信息、路况/步行段、风险、设施。
- **Variants**：primary route、backup、partial、unavailable。
- **Layout**：一条连续摘要 + 可展开细节；海拔用填充面积/折线，不能只有空轮廓。
- **Color/radius**：路线/可行性 trail；风险 risk；20rpx panel 或直接分隔行。
- **A11y**：图表有起终点、最高点和文本摘要；不依赖线色。
- **Composition**：不展示或评价 provider/basemap/native-map 视觉；可链接到当前 Map owner，但不重定义地图、路线或数据责任。

#### 6.8 Provenance / Freshness

- **Anatomy**：受影响事实、具体结果、必要更新时间、按需来源/模型入口与覆盖范围。
- **Variants**：ordinary hidden、meaningful partial、stale、offline-cache、unavailable。
- **Layout**：ordinary provenance保持在existing disclosure内；只有状态会改变当前判断、动作或恢复时，才在受影响证据旁出现紧凑行并明确结果，不抢结论层级。
- **Color/radius**：默认中性，状态图标语义着色；pill 仅包状态词。
- **A11y**：相对时间附可访问绝对时间；状态变化礼貌播报。
- **Composition**：任何会改变判断的缺失/旧数据必须和其影响范围同屏；无决策影响的实现/管线说明不进入普通viewport。

#### 6.9 Partial / Stale / Offline State

- **Anatomy**：具体受影响事实、对当前结论/动作的影响、必要最后更新时间、仍可用内容、真实恢复动作。
- **Variants**：meaningful partial、stale、offline-cache、unavailable；不设置可脱离语境显示的通用“部分数据”状态词。
- **Layout**：局部影响就局部提示；全页影响才使用 friendly panel。
- **Color/radius**：partial 中性+缺口纹理；stale meteor；offline/error risk；32rpx 仅全页恢复。
- **A11y**：图标+具体结果文字共同编码；恢复按钮有进度与结果播报。
- **Composition**：保留仍可信的信息，不把全页替换为错误屏。

#### 6.10 Evidence Disclosure

- **Anatomy**：摘要按钮、展开状态、证据区、来源/新鲜度。
- **Variants**：collapsed、expanded、loading、partial。
- **Layout**：内容原位展开，保持共享时间轴；不弹出二级卡片墙。
- **Color/radius**：中性分隔线；选中 sky；外接键盘 focus-visible 使用局部内侧下边缘；0–8rpx 技术容器。
- **A11y**：按钮同步 `aria-expanded`/`aria-controls`；焦点不跳转。
- **Composition**：结论首屏最多一个证据入口；展开后先核心行再扩展行。

#### 6.11 Stargazing Spot Information Panel

- **Anatomy**：稳定quiet handle-only drag zone、三档裁剪同一retained non-modal document、medium→large presence-driven licensed media、客观`基本信息 → 天文信息`顺序、vertically centered flush `概览/天文` rail、short fixed `想去/分享/云观星` action bar。
- **Variants**：hidden、small、medium、large、dragging、settling、loading、partial、stale、error；hidden 与 visible extent 分开建模。
- **Geometry**：small=`232rpx + bottom-safe`，medium=`clamp(500rpx,52dvh,700rpx)`，large填满primary navigation上方content viewport；Small/Medium top radius`32rpx`，Large radius`0`。Handle visible`52×5rpx`、physical hit`104×40rpx`/semantic≥`88×88rpx`且absolute overlay；pressed/tap不移动、不切档。Content不为rail预留全局列；rail `top:50% + translateY(-50%)`、visible width`60rpx`、outer height`104rpx`、2×`52rpx`items无gap/阴影。Action pill visible`52–56rpx`/outer lane`88rpx`，icon`22rpx`。
- **Transition**：`mediaReveal=clamp((p-.50)/.28,0,1)`先拉出top media；`chromeFade=1-clamp((p-.82)/.12,0,1)`后淡出Search/Location/Layer trigger。Reverse先恢复chrome再收media。No-media没有media phase，但保留`40rpx`compact handle band。Panel vertical drag、large content scroll与horizontal ruler通过direction-lock独占手势。
- **A11y / composition**：large左边缘`32rpx`右滑或handle下拉执行Back语义的large→medium；named extent controls提供等价路径。Only `104×40rpx`handle region发起drag；whole panel body/media/content不启动。Small/medium/large不切换内容树，只裁剪同一document。普通missing值显示`暂无数据`但domain state不合并。不得恢复独立Spot Detail/Spot Night、tabs、推荐窗口、第二地图、nested full-height sheet或duplicate actions。

#### 6.12 Full-Sky Orientation Canvas

- **Anatomy**：全屏sky canvas、独立quiet Back action、锚定在天空中的真实目标mark/label、底部Curved Time Ruler，以及仅在影响可用性时出现的recovery/object disclosure。普通following成功没有可见sensor state行。
- **Variants**：permission required、calibrating、following、low accuracy、stale、denied、unavailable；day/night/observation；reduced motion/transparency。
- **Layout**：canvas 从 top safe area 延伸到 bottom safe area；chrome 覆盖而不把天空缩成 card。Ruler 左右 inset `24rpx`、bottom=`safe-bottom + 24rpx`，使用 Day `rgba(255,255,255,.92)`、Night `rgba(24,26,23,.92)`、Observation `rgba(17,0,0,.96)`；reduced transparency 改为对应 opaque surface，不使用 blur/glass。所有scroll owner隐藏scrollbar chrome。
- **Motion**：前台设备姿态 `alpha/beta/gamma` 连续控制朝向/俯仰/横滚，绝对方位需要时与 compass owner 组合；新姿态立即接管，不叠加 inertia/bounce/ambient animation。离开/隐藏停止监听，不记录轨迹。Reduced motion 移除插值/settle，保留功能性直接跟随。
- **A11y**：canvas targets 有同源文本语义；`sky-orientation-object-list` 只作 screen-reader equivalent、传感器降级或用户明确 disclosure，不是常驻主区。不可用状态不伪造 heading。
- **Composition**：只渲染当前SkyReport的targets；可有低对比地平线/坐标网格，不用装饰星点冒充数据，不添加AR或完整深空目录；顶部不显示boxed title/地点·时间card/右侧target action，不显示“方向跟随中”、手势教程、实现说明或通用“部分数据”badge。

### 7. 通用组件合同

基础目录固定为 **14 个语义家族**。每族必须独立命名、可直接定位，并分别说明 anatomy、variants/states、可见几何、命中几何、无障碍、组合方式与 Do not。领域组件不得替代这些基础家族。

**谱系判定树**：先问“它管理什么状态与职责”，再看形状。提交命令属于 Button；查询拥有 query/suggestion/result 生命周期，属于 Search；独立多选属于 Checkbox，单选属于 Radio，即使两者画成 chip；立即生效的布尔设置才属于 Switch；相关内容/视图的互斥切换属于 Choice Bar，Tabs 与 Segmented 只是其语义子型；重复事实属于 List/Cell，能独立成立的单一对象才属于 Card。不得因圆角、pill 或下划线形状另建家族。

#### 7.1 Button / Icon Button

- **Anatomy**：label、可选 leading icon、loading feedback；icon button 只有一个线性图标与可访问名称。
- **Variants / states**：compact choice、ordinary inline、final commit、tonal、outlined、quiet、destructive；default/pressed/selected/loading/disabled；键盘 focus-visible 仅为输入设备 fallback，不作为移动标本常态。
- **Geometry**：compact visible `56rpx`、11/15、padding `12–16rpx`；ordinary `60–68rpx`、12/17、padding `16–20rpx`；final `80–88rpx`、13/18、padding `24–32rpx`；字距0；全部命中≥`88rpx`。Generic visible glyph仅`24/28/32rpx`。文字、图标与可见边缘必须保留内部呼吸，不把视觉面撑满命中包装。
- **A11y / composition**：扩展命中区不得重叠；每个局部决策层只保留一个 dominant action，普通动作按内容收缩。
- **Do not**：不把所有动作做成大实心或全宽；不以 white-on-common 作为默认；不把 icon 当唯一关键含义。

#### 7.2 Search Field

- **Anatomy**：范围标签、12px query input、11–12px搜索/返回glyph、必要helper/loading、suggestion/result region；trailing clear/close只在不与Back重复且owner明确需要的其他variant中可选，当前Map/Search两态均无。
- **Variants / states**：idle、editing、query、loading、suggestions、result、empty、error，以及inline scoped/filter search；editing用光标与1rpx浅色调变化，不展示持续“焦点框”状态。
- **Geometry**：visible field `80rpx`、input wrapper/target `88rpx`；suggestion/result row≥`88rpx`；紧邻所筛选集合，不脱离上下文。Map→Search使用同一stationary frame；glyph在同一leading slot交叉替换，其余field几何不变。
- **A11y / composition**：永久说明搜索范围；有用placeholder不替代label；listbox/option或等价列表语义；输入、建议和Back均可键盘操作并播报结果数。Entry可autofocus，但outside tap必须能blur/收IME/关suggestions且不离开Search，随后可重新focus；系统/微信Back和edge-back与leading Back同义。
- **Do not**：不做无范围的全局搜索暗示；不把 search 藏进 generic Input；不以空白屏替代 empty/error 说明。

#### 7.3 Text Input / Textarea

- **Anatomy**：永久 label、field、value、按需 helper/error、可选字符计数；没有 helper/error 时不保留空槽。
- **Variants / states**：text、time、multiline；divider-backed cell row 与 complex-field top-label；normal/focus/error/disabled/readonly/loading。
- **Geometry**：单行 input visible `72–80rpx`、wrapper/target≥`88rpx`；cell horizontal padding=`16–20rpx`，label column=`144–176rpx`。Textarea visible min-height=`176–208rpx`并有内容上限；top-label gap=`8rpx`；control radius与neutral inset border。
- **A11y / composition**：helper/error 紧贴 affected field并通过 aria-describedby 关联，input mode 匹配；blur/submit后出现的错误不得引发页面跳顶。200% 文本与长中文 label 将 horizontal cell 重排为 top-label stack，不横向裁切。
- **Do not**：不靠 placeholder 充当 label；不通过更小可见输入伪造44px命中；不把每个字段包进卡片；不预留空 helper 高度；不把局部错误升级成整页警告。

#### 7.4 Checkbox Group

- **Anatomy**：group label、18–20px box、item label/description、可选计数与 select-all relation。
- **Variants / states**：unchecked、checked、indeterminate、disabled、max-selection feedback、select-all / partial relation；短筛选可使用 check-chip 外观，但状态与 `checkbox` 角色不变。
- **Geometry**：visible box 36–40rpx，整行 target ≥88rpx；每行独立命中且不重叠。Search Filter check-chip使用`48rpx` visible capsule/≥`88rpx` target/10.5px label，前置`22rpx` semantic icon；selected border向内，`48rpx`圆润半透明star绝对覆盖trailing text区但不占宽，状态变化不改变宽高或文字位置。
- **A11y / composition**：用于彼此独立的多选；fieldset/legend 或 group label；mixed 使用原生 indeterminate 或 aria-checked=mixed；达到上限时说明为何不可继续。
- **Do not**：不拿 radio/switch 替代独立多选；不因 chip 外观另建状态家族；不只给勾选框本身命中；不在选择上限后静默失效。

#### 7.5 Radio Group

- **Anatomy**：group label、radio、item label/description。
- **Variants / states**：unselected、selected、disabled、unavailable explanation；短值可使用 single-choice chip 外观，但状态与 `radio` 角色不变。
- **Geometry**：visible radio 36–40rpx，整行 target ≥88rpx；长标签换行不压缩控件。短 single-choice chip可复用`56rpx` capsule与prefix-icon rhythm，但不自动继承Search multi-select的overlapping star ornament。
- **A11y / composition**：只用于 one-of-many；同组 name/role、方向键与读屏位置提示。
- **Do not**：不用于可同时选择的条件；不用分段控件承载长说明；不让默认项只靠颜色可见。

#### 7.6 Switch

- **Anatomy**：setting label、结果说明、track/thumb、当前 on/off 状态。
- **Variants / states**：on、off、disabled、pending confirmation 仅在需要时；键盘 focus-visible 只作为外部输入 fallback。
- **Geometry**：visible track 92×48rpx（46×24px），thumb 40rpx（20px），内边距 4rpx（2px），行程 44rpx（22px）；整行 target ≥88rpx。开启使用 trail，关闭为中性，disabled 降对比；文字区与开关属于同一命中行。
- **A11y / composition**：用于立即生效的二元设置；清楚说明切换结果并同步 aria-checked。
- **Do not**：不把需要提交确认的多步动作做成 switch；不拿它代替 radio；不在危险操作上即时切换。

#### 7.7 Choice Bar / View Switcher

- **Anatomy**：2–4 个短 label、共享轨道、单一可移动 selected indicator、对应 value 或 panel。
- **Semantic subtypes**：Tabs 组织相关内容/视图并使用 `tablist/tab/tabpanel`；Segmented 选择局部值或紧密相关子视图并使用 radio 等价语义。二者共享布局与移动指示器 primitive，不共享业务职责。
- **Geometry / motion**：visible `56rpx`、11–12/15–17，单元target≥`88rpx`；指示器以transform在等分轨道间移动，160ms standard、可中断；reduced motion立即切换。
- **A11y / composition**：点击与方向键/Home/End 同步 `aria-selected` 或等价 checked 状态、tabindex 与 panel；状态不只靠颜色。
- **Do not**：不容纳长句或过多项；不让每项各自闪现边框；不把 filter chip、导航路由或多选混入 Choice Bar。

#### 7.7A Three-State Display Mode Track

- **Anatomy**：一个共享track、三个等宽single-choice stops、一个可拖动thumb、Sun/Moon/Star语义图标、短label和programmatic checked value。
- **Values / ownership**：唯一`display-mode-switcher`拥有`day|night|observation`，默认day；不是三个tabs、两个binary switch或一个另置“进入观测模式”CTA。
- **Geometry / motion**：max-width`560rpx`、visible height`72rpx`、每站target≥`88rpx`。Tap选择站点；thumb从live transform跟手并按position+velocity吸附相邻站，8px threshold，不wrap。Day↔Night为180ms Sun/Moon微缩放旋转交叉；Night↔Observation先原子绑定black/warm-red tokens再做Moon/Star交叉。
- **A11y / composition**：single-choice radiogroup/adjustable semantics；方向键、Home/End、screen-reader direct choice与drag等价。Thumb位置、label、icon、checked state和track treatment共同表达状态。
- **Do not**：不用native binary Switch语义；不循环、不发光、不跨过中间站；Observation过渡不出现白、蓝、黄、绿或中性灰帧。

#### 7.8 List / Cell / Action Row

- **Anatomy**：title、meta/value、leading status、trailing affordance；整行或尾部动作二选一。
- **Variants / states**：informational cell、navigation row、action row、disclosure row；default/selected/expanded/disabled。
- **Geometry**：row target ≥88rpx；靠共享 baseline 与 1rpx divider 组织，可根据内容自然增高。
- **A11y / composition**：整行可点时不得嵌套第二个主动作；disclosure 同步 expanded/controls；列表使用语义列表。
- **Do not**：不把重复事实拆成卡片；不同时让行和尾部按钮执行不同主要动作；不靠箭头猜用途。

#### 7.9 Badge / Status Tag

- **Anatomy**：短状态词、可选 shape/icon；必要时紧邻受影响对象。
- **Variants / states**：meaningful live、partial、stale、offline、success、risk；ordinary no-impact state stays hidden，badge与inline status line均不得脱离受影响事实。
- **Geometry**：只包短词，10–11px / 15–16px；非交互 badge 不伪装命中区。
- **A11y / composition**：色彩 + 文字/边型共同编码；动态状态按严重度使用 status/alert。
- **Do not**：不只显示色点；不让badge承载说明段落；不把每个普通标签做成pill；不显示泛化“部分数据”、实现状态或零决策价值标签。

#### 7.10 Card / Containment

- **Anatomy**：一个 coherent object 的 heading、content、meta、最多一个局部 action。
- **Variants / states**：content/event card、saved-plan/action card、evidence/freshness card、compact metric/decision tile、full-width 长对象卡；implicit grouping 对照。
- **Geometry**：compact padding`10–14rpx`、normal`14–18rpx`、rare friendly最多`28rpx`；按职责使用panel/panel-lg/friendly，而非统一圆角。Search result min-height`156rpx`并占满内容列。
- **A11y / composition**：heading建立区域名；重复密集事实优先rows/dividers/shared-axis。Image-backed Search result的leading readable field固定52%，使用仍可透出图片的mode-correct gradient；整卡是唯一action，不再附“选择”。无合法/可用media时不渲染media node、placeholder或空档。卡片可从周围内容独立识别才成立。
- **Do not**：不嵌套卡、不每指标/状态一卡、不放多个竞争 CTA、不用阴影代替信息层级。

#### 7.11 Progress / Loading / Skeleton

- **Anatomy**：状态文字、determinate value 或 indeterminate 状态、结构骨架。
- **Variants / states**：progressbar、inline loading、button loading、skeleton、data-arrival。
- **Geometry**：保留最终布局尺寸；进度轨道紧凑；skeleton对应真实行而非泛化大块。Presence-driven media skeleton只存在于真实请求期间；最终no-media时container与skeleton一起收起。
- **A11y / composition**：aria-busy/progressbar；超过短等待显示文字；数据到达礼貌播报并可被新请求中断。
- **Do not**：不做环境循环装饰、发光或旋转天体；不让 skeleton 改变布局；观测模式只黑/暖红。

#### 7.12 Empty / Error / Permission Recovery

- **Anatomy**：发生原因、影响范围、仍可用内容、真实恢复动作。
- **Variants / states**：empty、local error、offline、permission denied/recovery；局部扁平状态与全页 friendly panel。
- **Geometry**：局部状态靠行/带；仅权限或全页恢复可用friendly且padding最多`28rpx`；动作ordinary `60–68rpx`而非默认final。
- **A11y / composition**：错误关联受影响区域；恢复结果播报；拒绝权限后核心浏览仍可继续。
- **Do not**：不清空仍可信内容；不把每个状态做卡；不提供不存在的恢复按钮或用强迫式主 CTA。

#### 7.13 Toast / Snackbar

- **Anatomy**：短结果、可选单一 undo/action、关闭/超时策略。
- **Variants / states**：非当前对象可见的异步 success acknowledgement、copy/save acknowledgement、error、offline、undo；单行优先。
- **Geometry**：消息12px/18px、动作11px/16px；动作target≥88rpx；elevation-1；避让底部安全区与sticky final action。
- **A11y / composition**：status/alert 按严重度；自动消失可暂停；重复事件按 owner/dedupe key 合并而不堆叠；一个 transaction 最多一个 floating feedback。
- **Do not**：selection、filter、expand/collapse、tab/segment、navigation、favorite success、time scrub、layer choice 和 mode state 不弹 toast/snackbar/modal，局部 visible state 就是第一反馈；重要错误不只靠 toast，不放多个动作，不遮挡主导航或最终承诺，不逐帧播报 direct manipulation。

#### 7.14 Dialog / Bottom Sheet

- **Anatomy**：title、body、actions；只有可拖动sheet/panel另有handle、停靠边与安全区。
- **Variants / states**：dialog confirm、sheet task、hidden/small/medium/full-screen-large/dragging/settling/loading/error。Map spot information panel使用三档visible extent；Search不使用Sheet；layer selector使用单一固定高度sheet且无drag/multi-extent暗示。
- **Geometry**：dialog radius24rpx；small/medium spot panel top radius32rpx，page-like large radius0；fixed layer sheet top radius28rpx；只在真实浮层使用elevation-2；动作遵守ordinary/final梯级。所有内部scroll owner隐藏scrollbar chrome。
- **A11y / composition**：Modal dialog使用focus trap；map-parallel non-modal panel不trap map semantic alternatives。Escape/返回按owning disclosure/extent逐级关闭并返回触发点；large另有左边缘Back gesture。Spot panel只有具名handle hit region可发起extent drag，tap handle为no-op；Layer sheet无handle/`x`/off row，与spot panel共用一个mutually-exclusive bottom-presentation owner并恢复此前panel extent。
- **Do not**：不把常规分组画成 sheet/dialog；不新增产品路线；不在浮层中堆卡或并列多个主动作。


### 8. 运动系统

所有运动均由明确操作或数据因果触发，可中断、可反向、无环境循环；normal motion下material route/surface/state不得突然出现或消失。基础缓动：standard `cubic-bezier(.2,0,0,1)`，exit `cubic-bezier(.4,0,1,1)`；press 80ms、short 120ms、medium 160ms、long 200ms，direct-manipulation panel使用280ms上限。bounded spring：mass 1、stiffness 420、damping 34、rest delta 0.5；禁止持续弹跳。

| Recipe | Trigger / current → target | Timing | Interruption / reverse | Reduced motion | Haptic | Observation |
|---|---|---|---|---|---|---|
| Press | pointer/key down；scale 1 → .985，抬起 → 1 | 80/120ms standard | 从当前值反向，不排队 | 仅边界/底色即时变化 | 可选 light | 只改暖红明度/边界，无白闪 |
| Selection | 选择变化；旧指示器位置 → 新位置；Search filter star `scale(.42) rotate(-14deg) opacity(0)` → `scale(1) rotate(5deg) opacity(.32)` | fill/border 160ms；filter star select 170ms、deselect 140ms | 新选择从 live presentation 接管，不排队 | ≤80ms fill/opacity + 内侧 focus 边界 | 可选 selection | 同几何暖红 ornament，不保留黄色 |
| Content/Search reveal | retained disclosure或Search child；普通content live measured height/clip/opacity→target；Search field固定、下方clip height0/`translateY(-12px)`/opacity0→full | ordinary 160ms；Search 180ms / exit160ms | 使用当前height/opacity反转，不remount/reset scroll，field geometry不动 | 内容即时显隐，保留状态/焦点 | 无 | 不经过白/灰中间token，不抖动/闪白 |
| Panel extent/hide | marker/result/handle drag/edge-back/map tap；one retained document viewport→valid extent；media先拉出，近top后Search/Location/Layer淡出 | direct manipulation + bounded spring≤280ms；non-marker hide 220ms exit；section align 200ms | pointer down/tap不切档；只由`104×40rpx`handle region越过threshold后拖动；新拖动接管live value | 跟手；release即时snap；section直接对齐 | 到达端点可选 light | 黑底暖红边界先于内容；无白闪 |
| Layer sheet | `bottomPresentation`在spot-panel/layer-sheet/none间从live值retarget | enter 220ms standard；exit 180ms | 单一枚举禁止双active；marker intent直接layer→new spot medium，不先恢复旧panel | 即时互斥切换并恢复 | 无 | 只用closed暖红surface/border |
| Curved time scrub | arrowless Taro horizontal ScrollView track 在fixed center下移动；ticks按距中心实时scale/opacity/arc | 每帧直接跟手，释放后≤120ms snap/settle | 新手势立即接管live offset；不节流造成滞后 | 保持native direct scroll、即时snap，无额外spring/inertia | 跨关键事件可选 tick | 暖红 tick/axis；无其他模式中间帧 |
| Favorite ritual | 收藏成功；52rpx outline → fill，主星 `scale(.92) rotate(7deg)`，最多三颗 subordinate satellites 从外侧进入并停止 | 主星 180ms ease；satellites 420ms ease-out，delay 60/100/140ms；单次 | 取消/失败从当前 presentation retarget，不排队 | 去除 travel/rotation/satellites，≤80ms fill/opacity | 可选 success | 同几何暖红填充；不发光、不循环 |
| Loading/data arrival | 请求；skeleton → 真实行 | 最小 120ms crossfade，逐行最大错峰 16ms/总 160ms | 新请求取消旧 transition | 直接替换并播报 | 无 | 只在黑/暖红间切换 |
| Mode change | 三站thumb的tap/drag/keyboard；day↔night↔observation | thumb 180ms；Day/Night Sun/Moon交叉；Observation先原子绑定target tokens再Moon/Star交叉 | 新输入从live thumb/icon接管；不wrap、不跳站 | 即时snap + ≤80ms icon opacity | 可选 medium | 只在black/warm-red目标令牌内完成，不跨色淡化 |
| List/My group | result/filter/account group变化；旧flow→新flow+opacity | 160ms，stagger总计≤120ms | 新数据接管并取消旧stagger | 直接落位 | 无 | 同mode roles，不闪白 |

### 9. 语音与内容

语气平静、具体、客观。当前Mini Program先陈述地点/到达事实，再陈述天气与天文事实，证据按需展开；不确定性直接绑定受影响事实。

- 当前可用：“开放至 23:30”“停车：暂无数据”“总云量 18%”“猎户座 22:10 后升起”“云量数据较旧，当前数值可能变化”。当前panel不使用“今晚建议出发”“谨慎出发”“最佳/推荐观测窗口”。
- 避免：“完美观星”“绝对晴朗”“保证可见”“AI 神奇推荐”“梦幻星海”。
- 允许的可见状态必须具体到受影响事实与结果，例如“官方预警未更新，暂不建议出发”“云量数据较旧，今晚结论可能变化”。`实时`、`部分数据`、`数据较旧`、`离线缓存`、`暂无数据`不得作为脱离上下文的常驻通用badge或实现说明。
- 设计资源 viewport 只显示正式产品信息结构，不写“演示数据”或 review/debug disclaimer；代表值的非实时属性在资源外 metadata 说明，实际产品仍必须显示其真实 source/freshness/completeness 状态。
- 错误说明结构：发生了什么 → 影响什么 → 用户可以做什么。
- 普通viewport不显示“操作说明”“方向跟随中”“同一地图·一个分析图层·本地时间”、拖动/手势教程、生成方式、实现结构或审计说明；当前也不为这些内容新增通用`?`、hover tooltip或help row。

### 10. 反模式

- 通用渐变、大面积光晕、玻璃拟态、环境粒子、循环流星、装饰 3D 天体。唯一例外是 `spot-favorite-action` 的 owner-confirmed 单次、因果、最多三颗 satellite ritual；不得扩散到背景或其他成功状态。
- 卡片套卡片、每指标一张卡、把所有选项做成 pill。
- 以行政仪表盘密度代替移动决策流。
- 用 generic linear slider或带框卡片代替Curved Time Ruler；重造scroll physics或引入flat React Native ruler作为第二基础；保留Finder Sheet、独立Spot Detail/Spot Night、quick/more split或稀疏tabs；用toast/snackbar/modal为每个普通点击重复反馈。
- Panel覆盖primary nav、按extent维护不同内容树、whole-panel拖动、tap handle切档、无media时丢失compact handle band、有media时保留band、pressed handle位移、rail占content width/有内外gap或深蓝阴影、过大的底部action bar、单阶段提前隐藏Map chrome、右侧展开layer rail、Search text/field跳变、非marker tap瞬间隐藏。
- 在移动端显示任意纵向/横向scrollbar chrome；为missing media保留占位图/空白区/“暂无图片”；用`overflow:hidden`禁止真实内容滚动。
- 常驻“操作说明”“方向跟随中”“部分数据”“同一地图·一个分析图层·本地时间”或其他零决策价值实现/教程文案；为其新增长驻`?`或help chrome。
- 当前Search同时显示Back与trailing `x`、进入后改写query/placeholder、suggestion rows或filter gaps过大；filter group显示“筛选条件”标题/无意义divider；layer sheet显示`x`/“关闭图层”或独立观测条件卡；panel与layer双active；current panel显示“谨慎出发”/推荐窗口/“尚未核实”。
- 用day/night tabs加另一个observation button，或用native二值Switch冒充三态；时间尺保留左右箭头、外框或静态不可拖动track；My以无色大字号列表、彩虹卡片墙、商业banner或假数据填充视觉。
- 并行引入第二套通用UI suite、第二图标系统，或绕过Starward adapter直接让library defaults成为产品视觉/状态权威。
- 观测模式出现蓝、白、黄、绿、中性灰或模式切换闪屏。
- 状态只靠颜色、图标没有标签、命中区小于 88rpx。
- 任意圆角、所有面板同样软圆、没有语义的阴影。
- 复制 fixture 为“实时”事实，或在本系统内重新定义业务流程。
- 评价或仿造 provider/basemap/native-map 视觉；复制第三方品牌图标/布局；把 provider 专属外观误写成 app-owned Map/Search/spot-panel 规范。

### 11. 当前系统边界

- 本节只描述一个当前 Mini Program 视觉系统，不在 handbook、candidate 或产品 UI 中维护 old/new 双轨或显示版本标签。
- 当前视觉范围覆盖五个Mini Program Product Surfaces，以及stationary Map/Search field、compact suggestions/titleless filters/stable disclosure/half-field image results、one-enum互斥image-backed layer selector、marker-to-medium one-document panel、presence-driven media/compact handle band、flush centered section rail/short action rail、objective basic-plus-astronomy facts、raised draggable arrowless Taro-ScrollView-backed Curved Time Ruler、one animated three-state display-mode track、headerless Full-Sky、colored-icon existing-duty My hub、compact cell-based Contribution intake、reuse-first library/component/adaptation binding和bounded Favorite ritual；provider/basemap/tile/native-map appearance仍不属于本系统。五个Surface只是治理覆盖边界，本轮变更严格是owner列出的13项及其直接依赖，不是任意重做。
- 产品路线、Surface/Control ownership、interaction state、评分算法、数据来源、权限、安全、原生 App 与 owner-operations 权威均不因本视觉系统改变。
- 当前 component/layout source为`docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source/DESIGN.md`，SHA-256 `0fd87614b7d80c8d3f3c880fe39e81c9b7beda89f41e8492e4c113022eda4dd4`。它完整替代所有冲突的per-extent content、旧media/chrome phase、handle band/hit geometry、action/section rail、ruler arrows/position/drag、Search suggestion spacing/text、并行panel/layer flags、deep active、split mode controls、plain My表达、oversized/card-wall Contribution form与custom-only component implementation posture；先前source不能继续当generation dependency、fallback或compatibility path。
- 所有历史资源仅在 controlling protocol 要求时作为隔离的 immutable audit provenance；它们不得成为当前 layout、component、motion、compatibility 或 generation input。

### 12. 投射与审查

- `tokens.scss`：冻结来源中的 Taro/React/SCSS 投射；模式由根节点 `data-theme` 或等价状态切换。
- `colors_and_type.css`：浏览器预览镜像，不是第二权威；值须与 SCSS 同步。
- Base `index.html` / `preview/` 是既有 immutable foundation evidence；当前 generation 必须读取 current component/layout source，不得以任何历史 preview 画面覆盖它。
- 任何进入生产的实现都必须重新验证真实字体、微信系统控件、设备安全区、屏幕阅读器、放大文字、隐藏scrollbar但可滚动、IME/outside blur、edge-back/gesture arbitration、低性能设备运动和真实数据边界。
- 当前设计资源审查必须覆盖：Search text/frame continuity、compact suggestions/filter rhythm、Back/outside blur且无`x`；retained partitions无jitter；52% image/no-image results；marker默认medium；small/medium/large裁剪同一document；media先拉出、near-top才淡出Search/Location/Layer；no-media compact band/media overlay handle/only handle rectangle drag；flush section rail/short action rail；`none|spot-panel|layer-sheet`单一active及layer→marker无jump；极浅active；raised draggable arrowless ruler；day↔night↔observation三态track的tap/drag/keyboard及Observation无色闪；colored-icon compact My；Panel/My→Contribution context、compact field-cell rhythm、conditional location、media progress/failure/retry、keyboard/validation、single submit→pending与draft preservation；320/375/390/430px、100%/200% text、normal/reduced motion/transparency、touch/keyboard/screen-reader。

本节已由 owner 明确选中，并按连续 DRA 需求循环完成当前组件、布局与密度修订；选择只建立设计权威，不证明生产实现、页面像素一致、设备姿态质量或运行时合规。
