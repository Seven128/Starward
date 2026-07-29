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
- The selected visual language is a blue, professionally skeuomorphic outdoor-instrument system. It feels credible, calm, precise, exploratory, and tactile without turning data surfaces into toys.
- Information follows progressive disclosure: first the conclusion, then an actionable plan, then the professional evidence.
- This file is the sole authored visual authority and exact-value token source. `packages/ui-system/src/tokens.ts` and any future CSS, JSON, HTML, platform adapter, kit, or preview are downstream consumers.
- Design Authority status: configured and adopted for the current owner-only target profile. Surface ownership still belongs to `project_context/**`, and production/runtime acceptance still belongs to the Delivery Contract and project verification.

### Design Authority Index

- Authored exact-value token source: selected — this file's YAML front matter.
- Generation direction and generated token targets: `DESIGN.md` → `packages/ui-system/src/tokens.ts` and platform adapters → optional exports under `docs/design-system/**`; TypeScript, CSS, JSON, target manifests, and screenshots are consumers or verification inputs, never co-equal token authorities.
- Active target: `target.system.starward-blue-skeuomorphic-2026-07-29`, selected by the owner on 2026-07-29 with the explicit instruction “选定这个候选”. It controls the system-level visual language, tokens, three modes, physical-material rendering, component appearance, state posture, accessibility posture, and motion posture. It does not replace product semantics or claim native/runtime conformance.
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
- Target precedence is closed: Source/Context owns product, safety, privacy, information, interaction, route, and stable Control meaning; this file owns the current visual system; the runtime token module consumes it. Legacy page/control resources may support rollback and semantic traceability only. Any conflict fails closed in favor of the upper owner and requires a new explicit adoption.
- This document is complete and normative on its own. `.codex/skills/uiux_design/SKILL.md` is the React Native implementation companion for applying these rules; it must read and obey this file and the Source Plan, and cannot redefine or override either one. This pointer is for discoverability, not a reciprocal authority dependency.

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
