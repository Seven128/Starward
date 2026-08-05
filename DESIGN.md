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
- This file is the sole authored visual authority and exact-value token source. Its YAML front matter owns the native App profile; `## WeChat Mini Program — Soft Instruments v1` owns the independent Mini Program profile. `packages/ui-system/src/tokens.ts` consumes only the App profile, and any future Mini Program adapter must consume only the named Mini Program section.
- Design Authority status: configured and adopted for two independent owner-selected target profiles: native App and WeChat Mini Program. Surface ownership still belongs to `project_context/**`, and neither profile alone claims production/runtime acceptance.

### Design Authority Index

- Authored exact-value token source: selected — this file. The YAML front matter is scoped to the native App profile; the exact Mini Program tables and contracts live only in the named Mini Program section below.
- Generation direction and generated token targets: App profile `DESIGN.md` YAML → `packages/ui-system/src/tokens.ts`; future Mini Program profile `DESIGN.md#wechat-mini-program--soft-instruments-v1` → one framework adapter only after an explicit runtime bootstrap. TypeScript, WXSS, CSS, JSON, HTML, kits, manifests, screenshots, and provider files are consumers or verification inputs, never co-equal token authorities.
- Active target (native App): `target.system.starward-blue-skeuomorphic-2026-07-29`, selected by the owner on 2026-07-29 with the explicit instruction “选定这个候选”. It controls the native App visual language, tokens, three modes, physical-material rendering, component appearance, state posture, accessibility posture, and motion posture. It does not replace product semantics or claim native/runtime conformance.
- Active target (WeChat Mini Program): `target.system.wechat-miniapp-soft-instruments-2026-08-05`, selected by the owner on 2026-08-05 with the explicit instruction “采用此候选”. It controls the independent Mini Program visual language, exact role-isomorphic day/night/observation tokens, card/icon grammar, layout rhythm, component states, motion, accessibility, and asset posture defined in this file. It does not define a Mini Program Product Surface, Screen Contract, framework, navigation destinations, service boundary, runtime, or acceptance result.
- Mini Program selected source: `docs/design-resources/miniapp-design-system-2026-08-05/candidate-design-brief.md` SHA-256 `ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`; source index `docs/design-resources/miniapp-design-system-2026-08-05/source-index.md` SHA-256 `80cb69b9501b556ca8c186c770e5257ee5136e031e52ce54c42d7298eba3e3f7`. The candidate snapshot's pre-selection status line is historical lifecycle text; this canonical record owns its selected/adopted interpretation without altering the selected candidate bytes.
- Mini Program provider provenance: Open Design `0.16.1`, design-system ID `user:soft-instruments`, review workspace/project `ds-soft-instruments`, provider body SHA-256 `ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745`. The earlier generic desktop showcase/UI-kit/token scaffold and rejected revision `01e159b2-6529-4f8b-8916-67a65576a3e1` are not selected resources. After owner selection, the provider body was synchronized exactly and published; the project binding reports the matching design-system ID.
- Mini Program reference interpretation: all eight user-supplied images are inspiration, not exact targets or constraints. Their card softness, quiet bottom-navigation symbol posture, selective friendly 3D-object grammar, and day/night/red condition themes inform the system; their logos, poster/device composition, sample data, phone frames, branded photography, wording, and exact layouts are not adopted. The App design system and every App/Admin target are explicitly excluded as Mini Program inputs.
- Mini Program condition coverage: day, night, and strict black/warm-red observation; `750rpx` reference geometry with safe-area/menu-capsule adaptation; responsive one/two-column composition; enlarged text; `88rpx` minimum targets; reduced motion; focus/pressed/disabled/loading/empty/stale/offline/error/success; mode-correct cold start and asset fallback. These are design contracts, not production conformance evidence.
- Mini Program editable upstream and update route: revise Open Design system `user:soft-instruments` in project `ds-soft-instruments`, create and review a new immutable candidate/digest, obtain explicit selection, then re-adopt its values and record here. Never edit a generated runtime adapter to change the system, overwrite the selected candidate, or import values from the native App profile.
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

## WeChat Mini Program — Soft Instruments v1

This section is the complete canonical visual-system profile for `target.system.wechat-miniapp-soft-instruments-2026-08-05`. It was independently authored from the eight indexed user references, the explicit Mini Program brief, and bounded platform/product research. It does not inherit from or adapt the native App profile above. Where a shared English role name happens to exist in both profiles, identity of the name does not imply identity of its value or implementation.

The concept is **soft instruments under three skies**:

- **Instrument clarity** for maps, conditions, time, route, state, and action.
- **Soft collectible objects** for selected astronomy/outdoor subjects.
- **Three skies**—day, night, and observation red—using one semantic component grammar.

The Mini Program should feel calm, trustworthy, compact, and gently tactile. Functional information remains precise and planar; 3D character is selective. It must not become a generic weather dashboard, a desktop SaaS surface, or a toy-like all-skeuomorphic interface.

### Mini Program foundations

- Author geometry in `rpx` against a `750rpx` reference canvas, then reflow for actual supported phones and runtime safe-area/menu-capsule geometry.
- Base step: `8rpx`; page inset: `32rpx`; compact inset: `24rpx`; section gap: `40rpx`; card/grid gap: `24rpx`; card padding: `28rpx`; dense-row padding: `20rpx 24rpx`.
- Default content is one readable column. A two-column feature grid requires at least `304rpx` per tile after gaps and collapses when available width or enlarged text would clip content.
- Center expanded content within `960rpx`; maps and owned data matrices may use the full safe width. Horizontal page scroll is forbidden; only an explicitly owned data matrix may scroll horizontally with identifiable row labels and units.
- Minimum interactive region: `88rpx × 88rpx`. A visibly compact `64rpx` chip is allowed only inside an `88rpx` wrapper with safe separation from adjacent controls.

| Spacing role | Value |
| --- | ---: |
| `space-0` | `0` |
| `space-1` | `8rpx` |
| `space-2` | `16rpx` |
| `space-3` | `24rpx` |
| `space-4` | `32rpx` |
| `space-5` | `40rpx` |
| `space-6` | `48rpx` |
| `space-8` | `64rpx` |

| Radius role | Value |
| --- | ---: |
| `radius-xs` | `12rpx` |
| `radius-sm` | `20rpx` |
| `radius-md` | `28rpx` |
| `radius-lg` | `40rpx` |
| `radius-pill` | `999rpx` |

| Size/border role | Value | Constraint |
| --- | ---: | --- |
| `size-icon-glyph` | `40rpx` | Tier-A visible glyph |
| `size-icon-box` | `48rpx` | Tier-A optical grid |
| `size-hit-min` | `88rpx` | minimum interactive region |
| `size-control` | `88rpx` | standard button and compact field |
| `size-control-lg` | `96rpx` | primary page action and full field |
| `size-nav-item` | `112rpx` | bottom-navigation content height before safe area |
| `border-hairline` | `1rpx` | decorative/group boundary |
| `border-selected` | `2rpx` | selected/focused structural boundary |
| `focus-ring` | `4rpx` | `4rpx` offset |

Elevation is condition-specific:

- Day standard card: `0 12rpx 36rpx rgba(25, 61, 102, 0.10), 0 2rpx 8rpx rgba(25, 61, 102, 0.06)` plus a `1rpx` cool border.
- Day floating control: `0 8rpx 24rpx rgba(21, 55, 94, 0.14)`.
- Night uses surface luminance and border before any compact dark shadow; blue glow is forbidden.
- Observation uses no ambient shadow. Depth comes from black/dark-red surface steps and a warm-red border.
- Do not stack elevated cards. Use whitespace, headings, dividers, grouped rows, or one flat inset surface.

Disabled controls retain readable text and full geometry through `surface-subtle`, `text-tertiary`, a visible boundary, and no elevation; essential labels are not dimmed with global opacity. Pressed overlays use the local `primary` at `8%` in day, `12%` in night, and `16%` in observation. Loading preserves control width and label position.

### Mini Program colors

All three modes expose exactly the same eighteen semantic roles. A mode changes values and asset variants, never the role set.

#### Day

| Role | Value |
| --- | --- |
| `canvas` | `#F5F8FC` |
| `surface` | `#FFFFFF` |
| `surface-subtle` | `#EEF4FA` |
| `surface-elevated` | `#FFFFFF` |
| `text-primary` | `#10233F` |
| `text-secondary` | `#526A84` |
| `text-tertiary` | `#5C7186` |
| `border` | `#D4E1EE` |
| `primary` | `#1769D2` |
| `primary-pressed` | `#0F56AE` |
| `on-primary` | `#FFFFFF` |
| `accent-cyan` | `#69C7F5` |
| `accent-violet` | `#707CF2` |
| `accent-warm` | `#EED7B1` |
| `success` | `#238B62` |
| `warning` | `#B86A12` |
| `danger` | `#C83F49` |
| `focus` | `#0B63CE` |

#### Night

| Role | Value |
| --- | --- |
| `canvas` | `#050A14` |
| `surface` | `#0B1626` |
| `surface-subtle` | `#102238` |
| `surface-elevated` | `#162B45` |
| `text-primary` | `#EEF5FF` |
| `text-secondary` | `#A9BCD2` |
| `text-tertiary` | `#7F96AF` |
| `border` | `#29425F` |
| `primary` | `#5AA7FF` |
| `primary-pressed` | `#3389EA` |
| `on-primary` | `#03101F` |
| `accent-cyan` | `#67C4E9` |
| `accent-violet` | `#8A8EF4` |
| `accent-warm` | `#D8BE94` |
| `success` | `#5CC99A` |
| `warning` | `#F0B55B` |
| `danger` | `#FF7B82` |
| `focus` | `#82BCFF` |

#### Observation red

| Role | Value |
| --- | --- |
| `canvas` | `#000000` |
| `surface` | `#0B0101` |
| `surface-subtle` | `#150303` |
| `surface-elevated` | `#200505` |
| `text-primary` | `#F4554E` |
| `text-secondary` | `#E44A43` |
| `text-tertiary` | `#D84A43` |
| `border` | `#4D1716` |
| `primary` | `#FF514A` |
| `primary-pressed` | `#D83B36` |
| `on-primary` | `#000000` |
| `accent-cyan` | `#B83A35` |
| `accent-violet` | `#C4403A` |
| `accent-warm` | `#D94842` |
| `success` | `#D84A43` |
| `warning` | `#F05A52` |
| `danger` | `#FF6A62` |
| `focus` | `#FF776F` |

Observation is a closed black/warm-red condition for every controllable surface, icon, focus, status, loading/error state, map overlay, transition, and authored image/3D variant. Do not render blue, green, cyan, violet, yellow, neutral gray, or white; do not hide day assets under red opacity or apply a blanket filter. Set the destination canvas before the first visible frame. An unthemeable OS/vendor surface needs a warning and safe cancel/return path before handoff.

`text-*` owns readable text. Accent and status roles may reinforce an icon, chart mark, short emphasis, or boundary but never replace body text. Success, warning, and danger always include label/icon/shape/position; the observation aliases intentionally stay red and cannot communicate meaning by hue. Charts pair `accent-cyan` with solid/circle, `accent-violet` with dashed/diamond, and `accent-warm` with dotted/triangle; legends repeat label, shape, and line style.

### Mini Program typography and content

Use the license-safe native stack `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`. No bundled display font is required for core readability.

| Role | Size / line | Weight | Use |
| --- | --- | ---: | --- |
| `display` | `48rpx / 64rpx` | 700 | one short recommendation or hero value |
| `page-title` | `36rpx / 48rpx` | 700 | page title |
| `section-title` | `30rpx / 42rpx` | 600 | section heading |
| `body` | `28rpx / 42rpx` | 400 | primary reading text |
| `label` | `24rpx / 34rpx` | 500 | controls, navigation, compact metadata |
| `caption` | `22rpx / 32rpx` | 400 | explanation and timestamps |
| `data` | `28rpx / 40rpx` | 500 | time, percentage, angle, distance, aligned values |

- Use tabular numerals where supported. Keep values and units as separate semantic spans such as `28 km`, `45 分钟`, `20:30`, and `86%`.
- Titles wrap before truncation. Decision, warning, uncertainty, source/update time, and recovery text reflow without line clamps or font shrinking.
- Use calm, concrete uncertainty language such as `预计`, `可能`, and `数据更新于`; never promise perfect visibility.
- Empty, stale, offline, permission-denied, and partial states name what happened, what remains available, and the next safe action.

### Mini Program icon architecture

#### Tier A — functional symbols

- Use for navigation, back, close, search, filter, location, layers, share, favorite, refresh, state, and form actions.
- Base grid `48rpx`; visible glyph `40rpx`; rounded outline stroke `3rpx`; round caps/joins; optically centered simple geometry.
- Selected navigation may combine one filled focal shape with an outline shell. Inactive stays outline-only. Icon plus text is required, and selection changes weight/fill/indicator as well as color.
- Functional symbols never use 3D perspective, gloss, cast shadows, or texture.

#### Tier B — semantic 3D subjects

Allowed subjects are four-point star, five-point star, tent, telescope, binoculars, camera, hiking backpack, and a gender-neutral avatar. They are for category entry, equipment recommendation, empty-state focal art, onboarding, or one hero moment—not back/close/filter/status and not every row.

The grammar is a large readable silhouette; subtle three-quarter/isometric view; rounded construction; smooth polymer/enamel; localized highlights; soft top-left key light; blue-white body with restrained cyan/deep-blue/beige/blue-violet accents; one compact contact shadow; transparent bounds; no neon halo. One icon has one dominant object. Four/five-point stars remain broad and rounded; tent is a readable A-frame; telescope has a stable three-leg mount; binoculars retain two joined barrels; camera has one dominant lens; backpack retains lid/straps/front pocket; avatar avoids gender-coded hair, makeup, clothing, and biometric realism.

Canonical day master prompt:

> Create one isolated minimalist 3D **[SUBJECT]** icon for a friendly astronomy/outdoor Mini Program. Use a large unmistakable silhouette, rounded construction, subtle three-quarter/isometric perspective, smooth polymer-and-enamel material, soft top-left key light, restrained blue/white body with cyan, deep-blue, beige, or blue-violet accents, one compact contact shadow, transparent background, centered composition, and generous clear space. Warm, handcrafted, modern digital rendering; no text, logo, brand, interface frame, character franchise, or scenery.

- Night keeps geometry/camera identical, reduces white/highlight luminance, deepens blue, and uses a compact dark contact shadow without glow.
- Observation rerenders identical geometry only in the observation black/warm-red palette. No inherited cool/white pixels, bloom, or filter.
- Negative prompt: photorealism, scratches, glare, brand, text, watermark, busy background, multiple dominant objects, fragile details, neon, glow, lens flare, particles, hard shadow, or protected studio/character imitation.
- Display target `128rpx–176rpx`; verified `2x` master; default budget `≤72KB` per tile and `≤160KB` per hero after visual QA.

### Mini Program component and interaction contracts

| Component | Required contract |
| --- | --- |
| Page shell | safe top/bottom and capsule clearance; mode-correct first frame; loading/offline/permission boundary |
| Standard card | `radius-md`, `28rpx` padding, `1rpx` border; static or whole-card target; no nested elevation |
| Feature tile | one Tier-B object, short label, optional two-line explanation; whole tile owns interaction |
| Button | primary/secondary/quiet/destructive, optional Tier-A icon; default/pressed/focus/disabled/loading/success/error |
| Icon action | `40rpx` glyph in `88rpx` hit region with accessible name; selected is not color-only |
| Chip/segment | single/multi select with label and optional count/check; active value stays discoverable |
| Field/list cell | label, value/input, helper/error, optional one trailing action; state space reserves geometry |
| Bottom navigation | three to five destinations only after Product Surface approval; icon + label; safe-area reserved |
| Sheet/dialog | title/content/actions/close route; contained read/focus order; interruptible sheet drag; explicit destructive confirmation |
| Banner/toast | banner for persistent/actionable state; toast only for non-critical acknowledgement, never sole recovery |
| Empty/skeleton | final geometry reserved; optional one Tier-B object; no bright shimmer in night/observation |
| Data matrix | aligned rows/time columns/values/units/legend/source/update time; owned scroll; stale/partial/missing cells |
| Map | solid controls and Tier-A icons; marker selection uses shape/label; loading/offline/permission are explicit |
| Equipment tile | Tier-B subject plus name and required/readiness label; optional/required/packed/missing is non-color encoded |

One local decision layer has at most one visually dominant primary action. One row has at most one persistent trailing action. A press begins feedback on touch-down, commits once on valid release, and never commits after drag-away/cancel/disable. Cards cannot contain nested pressable actions without explicit event/focus ownership. Critical actions cannot exist only behind a hidden swipe.

Day/night may follow system or an explicit preference. Observation is explicit and never inferred only from sunset. If a field session ended in observation mode, bootstrap black/red until deliberate exit to prevent a cold-start white flash. Route, scroll, selection, input, and pending task state survive mode changes.

### Mini Program motion and accessibility

| Event | Duration | Property / constraint |
| --- | ---: | --- |
| Press-in | `≤100ms` | same-frame surface/tint; optional `scale(0.985)` outside map/destructive controls |
| Release/cancel | `120ms` | surface/tint/scale return; cancelled press never commits |
| State/content swap | `160ms` | opacity with stable geometry |
| Compact sheet/panel | `220ms` | interruptible translate + opacity using `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| Mode transition | `240ms` | destination-safe color/media crossfade; destination canvas first |
| Reduced motion | `0–100ms` | immediate or opacity only; no scale/parallax/depth/large translation |

- Avoid bounce, elastic overshoot, idle floating, icon spinning, decorative particles, and motion that must finish before input is accepted.
- Optional haptics may reinforce a discrete selection, meaningful success, warning, or error only when a future adapter verifies capability and preference. Haptics are never required for understanding.
- Every control exposes role, concise name, value/state, and disabled/expanded/selected semantics as applicable. Decorative Tier-B art is hidden from assistive reading unless it carries unique content.
- Reading/focus order follows visible order. Modal layers contain it and return it to the invoking control.
- Normal text targets at least `4.5:1`; large text and essential graphical boundaries target at least `3:1`. Color, motion, vibration, and sound are never sole state channels.
- Enlarged text, landscape, safe-area changes, and long Chinese labels cannot hide the primary decision, warning, or recovery action.
- Night and observation are display modes, not substitutes for contrast, screen reading, magnification, motor access, or color-vision accessibility.

### Mini Program assets, performance, and exclusions

- Functional icons are code-native/vector when the chosen Mini Program stack safely supports them. Tier-B subjects are optimized raster assets with authored day/night/observation variants.
- Naming direction: `icon3d-[subject]--[day|night|observation]@[density].[webp|png]`; Tier-A uses `icon-[name].svg` or the selected stack's equivalent.
- All variants share silhouette, camera, crop, transparent bounds, and display size. Export sRGB, strip metadata, inspect edges at `1x`/`2x`, and verify observation assets contain no unintended cool/white pixels.
- Do not ship the `1254×1254` references as tiles. Lazy-load below-fold Tier-B art with a mode-correct fixed-geometry placeholder. Failure falls back to a Tier-A symbol plus text.
- Do not create a giant unrelated sprite. A future component-library/framework adapter consumes these semantic roles and cannot originate a competing value.
- Do not copy the reference posters, logos, sample data, phone frames, branded photography, exact layouts, the native App system, App/Admin targets, or React Native interaction constants.
- Do not apply skeuomorphism to every card/button/status/data point; use broad glass blur, neon, purple gradients, ambient stars, glossy data bevels, stacked shadows, or a whole-screen red filter; invent full App parity or navigation ownership; or claim production fidelity/accessibility merely from this authority.
