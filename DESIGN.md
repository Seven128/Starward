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

### Design authority

- Authored exact-value token source: selected — this file. The YAML front matter is scoped to the native App profile; the exact Mini Program tables and contracts live only in the named Mini Program section below.
- Generation direction and generated token targets: App profile `DESIGN.md` YAML → `packages/ui-system/src/tokens.ts`; Mini Program profile `DESIGN.md#wechat-mini-program--sky-canvas-field-signal` → its single framework adapter. TypeScript, WXSS, CSS, JSON, HTML, kits, manifests, screenshots, and provider files are consumers, candidates or verification inputs, never co-equal token authorities.
- Mini Program reference interpretation: pure-white day canvas and restrained near-black night surfaces carry compact, clearly tiered information; sky/periwinkle owns time and selection, meteor yellow owns final commitment/celestial events and the translucent filter ornament, trail green owns route/opportunity, and risk coral stays semantic. Vitality comes from semantic color, aligned bands, calibrated draggable ticks, compact proportion and causal motion—not tinted page foundations, deep-blue slabs, oversized type, generic sliders, decorative ambient meteors or excessive padding. The same language governs the stationary Map/Search field, compact suggestions/titleless filters, one-document marker-to-medium information panel, mutually exclusive image-backed bottom layer sheet, objective astronomy facts, raised arrowless ruler, one three-state celestial mode track, headerless orientation canvas, restrained colored-icon My hub and cell-based compact Contribution intake; native App, App/Admin targets and provider/basemap/native-map styling remain excluded inputs.
- Product and Screen Contracts own page responsibilities, data and interaction meaning; this file owns the independent App and Mini Program visual profiles. Verify real runtime behavior separately.
- Edit current rules and their generated adapters directly within the authorized implementation scope. Historical, unadopted prototype packages, Open Design projects, handoffs and hashes are not required inputs or synchronized deliverables; explicitly adopted Mini Program resources are required under the owning Screen Contract. Preserve useful production assets and behavior checks. Resource adoption alone does not trigger production token generation.
- Mini Program work currently targets standard text at 320/375/390/430 logical pixels, day/night/observation modes, safe areas, 44px touch targets, reduced motion and actual loading/error/permission states. Large-text adaptation is paused by the user.

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

### Scope

- Display name: `Starward 微信小程序设计系统` / `Sky Canvas Field Signal`. Do not append version, date or revision labels in the handbook title, navigation, component specimens or ordinary product UI. The same rule applies to generated-candidate titles and design copy. Do not label a current route, component or resource as `old`, `new`, `legacy`, `vN`, `version`, `版本`, `旧版` or `新版`; stable target keys, protocol versions and source digests remain internal traceability metadata only and never become visible product/design labels.
- Third-party screenshots support only spatial proportion, density and interaction-class interpretation. They do not authorize copying brands, proprietary layouts/icons/basemaps, adding unsupported map layers, or inventing astronomy algorithms/provider styling.
- Map provider/basemap/tile/native-map styling, provider/legal chrome, native App and owner-operations surfaces remain excluded. Future production projection must independently verify real WeChat controls, devices, safe areas, accessibility, motion, map integration and data-state behavior.
- Current component and layout rules are maintained below with the owning Screen Contracts. Historical selection records are not development dependencies.

### 当前可执行令牌

2026-09-06 用户授权合并手机尺度重构与既有业务收尾。下列结构化段是当前小程序颜色、排版与通用几何的唯一精确值来源；生成器输出 SCSS 与原生 TS，禁止手改生成文件。逻辑 px 固定，不随窄屏缩小；Taro 保持 750 designWidth，生成的 Px 需经实际 WEAPP 编译确认。当前仅实施标准字号；大字号适配暂停。当前尺寸不从旧设计资源重新投射。组件章节的专用地图/手势几何仍适用，普通字级及通用命中下限统一使用这里的角色。该选择是实施起始尺度，尚不表示手机样板已获用户确认或全页面验证完成。

<!-- miniapp-tokens:start -->
```json
{
  "schema": 1,
  "unit": "logical-px",
  "fontFamily": "\"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei UI\", \"Microsoft YaHei\", system-ui, sans-serif",
  "type": {
    "page-title": {
      "size": 18,
      "line": 25,
      "weight": 600
    },
    "spot-title": {
      "size": 20,
      "line": 28,
      "weight": 600
    },
    "section": {
      "size": 16,
      "line": 23,
      "weight": 600
    },
    "body": {
      "size": 15,
      "line": 22,
      "weight": 400
    },
    "body-secondary": {
      "size": 14,
      "line": 21,
      "weight": 400
    },
    "action": {
      "size": 14,
      "line": 20,
      "weight": 500
    },
    "search": {
      "size": 16,
      "line": 23,
      "weight": 400
    },
    "metadata": {
      "size": 12,
      "line": 18,
      "weight": 400
    },
    "data": {
      "size": 18,
      "line": 25,
      "weight": 500
    },
    "article": {
      "size": 16,
      "line": 26,
      "weight": 400
    },
    "critical": {
      "size": 14,
      "line": 20,
      "weight": 500
    },
    "display": {
      "size": 20,
      "line": 28,
      "weight": 600
    }
  },
  "geometry": {
    "target-min": 44,
    "icon-small": 18,
    "icon-medium": 20,
    "icon-large": 24,
    "page-inset": 16,
    "map-inset": 12,
    "space-related": 4,
    "space-inline": 8,
    "space-group": 12,
    "space-section": 18,
    "radius-control": 8,
    "radius-panel": 12,
    "radius-sheet": 18,
    "switch-width": 46,
    "switch-height": 24,
    "switch-thumb": 20,
    "switch-inset": 2,
    "switch-travel": 22,
    "mode-track-height": 36,
    "mode-track-max-width": 320
  },
  "themes": {
    "day": {
      "canvas": "#ffffff",
      "surface": "#ffffff",
      "surface-subtle": "#f6f7f5",
      "surface-elevated": "#ffffff",
      "text-primary": "#282b29",
      "text-secondary": "#5e655f",
      "text-tertiary": "#6d746d",
      "text-muted": "var(--text-tertiary)",
      "border": "#e2e5dd",
      "border-strong": "#8a9088",
      "primary": "#8799f6",
      "primary-pressed": "#4859b8",
      "on-primary": "#202332",
      "accent-cyan": "#62c88b",
      "accent-violet": "#8799f6",
      "accent-warm": "#f2c94c",
      "success": "#1f6b45",
      "positive": "#1f6b45",
      "warning": "#6f5500",
      "danger": "#973d37",
      "focus": "#6174d8",
      "pressed-overlay": "rgba(135, 153, 246, 0.12)",
      "favorite-outline": "#4859b8",
      "favorite-active": "#f2c94c",
      "favorite-fill": "#f2c94c",
      "favorite-stroke": "#6f5500",
      "choice-selected-surface": "#f5f6ff",
      "choice-selected-border": "#8799f6",
      "choice-selected-label": "#4859b8",
      "choice-clipped-star": "#f2c94c",
      "icon-violet-soft": "#f5f6ff",
      "icon-green-soft": "#e9f8ee",
      "icon-gold-soft": "#fff7d6",
      "icon-coral-soft": "#fff0ed",
      "elevation-card": "none",
      "elevation-floating": "0 4rpx 16rpx rgba(40, 43, 41, 0.07)",
      "map-tint": "#ffffff"
    },
    "night": {
      "canvas": "#11120f",
      "surface": "#181a17",
      "surface-subtle": "#242720",
      "surface-elevated": "#181a17",
      "text-primary": "#f5f3ec",
      "text-secondary": "#bec2b8",
      "text-tertiary": "#989e94",
      "text-muted": "var(--text-tertiary)",
      "border": "#343830",
      "border-strong": "#666d62",
      "primary": "#a9b6ff",
      "primary-pressed": "#d1d7ff",
      "on-primary": "#202332",
      "accent-cyan": "#7ed7a1",
      "accent-violet": "#a9b6ff",
      "accent-warm": "#f6d56f",
      "success": "#b7eacb",
      "positive": "#b7eacb",
      "warning": "#ffe5a0",
      "danger": "#ffc0ba",
      "focus": "#b4beff",
      "pressed-overlay": "rgba(169, 182, 255, 0.14)",
      "favorite-outline": "#d1d7ff",
      "favorite-active": "#f6d56f",
      "favorite-fill": "#f6d56f",
      "favorite-stroke": "#ffe5a0",
      "choice-selected-surface": "#292d45",
      "choice-selected-border": "#a9b6ff",
      "choice-selected-label": "#d1d7ff",
      "choice-clipped-star": "#f6d56f",
      "icon-violet-soft": "#292d45",
      "icon-green-soft": "#1b3426",
      "icon-gold-soft": "#3a3118",
      "icon-coral-soft": "#452724",
      "elevation-card": "none",
      "elevation-floating": "0 8rpx 24rpx rgba(0, 0, 0, 0.28)",
      "map-tint": "#11120f"
    },
    "observation": {
      "canvas": "#000000",
      "surface": "#110000",
      "surface-subtle": "#190000",
      "surface-elevated": "#240000",
      "text-primary": "#ff6b58",
      "text-secondary": "#d84a3c",
      "text-tertiary": "#d84a3c",
      "text-muted": "var(--text-tertiary)",
      "border": "#7a1e18",
      "border-strong": "#a83229",
      "primary": "#d84a3c",
      "primary-pressed": "#ff6b58",
      "on-primary": "#000000",
      "accent-cyan": "#d84a3c",
      "accent-violet": "#d84a3c",
      "accent-warm": "#ff6b58",
      "success": "#ff6b58",
      "positive": "#ff6b58",
      "warning": "#ff6b58",
      "danger": "#ff6b58",
      "focus": "#ff6b58",
      "pressed-overlay": "rgba(216, 74, 60, 0.16)",
      "favorite-outline": "#d84a3c",
      "favorite-active": "#ff6b58",
      "favorite-fill": "#d84a3c",
      "favorite-stroke": "#ff6b58",
      "choice-selected-surface": "#190000",
      "choice-selected-border": "#a83229",
      "choice-selected-label": "#ff6b58",
      "choice-clipped-star": "#d84a3c",
      "icon-violet-soft": "#190000",
      "icon-green-soft": "#190000",
      "icon-gold-soft": "#190000",
      "icon-coral-soft": "#240000",
      "elevation-card": "none",
      "elevation-floating": "none",
      "map-tint": "#000000"
    }
  }
}
```
<!-- miniapp-tokens:end -->

### 1. 设计意图

《今晚去观星》以正式地点、路线、安全与天文事实帮助用户理解当前观测条件；当前 Mini Program 不由界面推导“是否出发”或推荐窗口。界面应像轻量、可信、有户外生命力的信息仪器：纯白日间画布承载高密度信息，活力来自语义色、连续轴、空间节奏、恰当的材质与图标以及连贯动效。克制约束视觉竞争和无用内容，不要求把界面降成素文字与默认控件；设计判断遵循§1.3。

#### 1.1 不变的产品层级

1. **地点与到达事实**：正式地点、距离、路线、开放/停车/设施和真实安全状态。
2. **天文与天气事实**：时间、云量、透明度、视宁度、光污染、月相、日月升落和可见目标。
3. **证据与恢复**：模型来源、更新时间、缺失/权限/失败影响与真实恢复路径；当前 panel 不展示推荐结论或最佳窗口。

设计系统只拥有视觉与组件表达；路线、状态责任和业务行为仍由 Context/Source 拥有。设计资源中的字段、状态、条件、来源与动作必须都是产品需要承载的正式信息结构，phone/product viewport 不显示“演示数据”、fixture、demo 或 review/debug disclaimer。代表值的非实时属性只在资源外部 metadata 中说明，绝不得被写成实时观测结论。

#### 1.2 明确排除

- 地图提供商、底图/瓦片、道路/地形/卫星内容、原生地图渲染外观及不可移除的 provider/legal chrome。App-owned Map/Search/spot-information-panel 产品 UI 由本节后续合同明确规范。
- 原生 App 与 owner-operations/运营端设计档案。
- 新的信息架构、业务流程、评分算法或未经权威定义的产品能力。

#### 1.3 设计判断与视觉表达

2026-09-08 用户明确：持续从新增资源、具体反馈和采用修订中完善项目的风格偏好与UIUX原则，使设计系统更准确地符合用户预期；设计判断依据随之更新。采用表示当前范围内接受该方案，不定义客观“完成度”、审美等级或新页面必须达到的比较门槛。按[Context校准规则](project_context/context-maintenance.md#持续校准设计系统与用户偏好)在原owner更新适用范围，避免只累积资源或复制上一页。“精致、适当丰富、小巧”是同时成立的默认要求；简洁指信息和操作清晰，不能解释成取消材质、卡片、图标、视觉重心和动效。除非明确要求线框或只讨论结构，不交付等待用户要求“再美化”的基础壳。

- **从任务和已确认原则形成设计判断。** 实际查看相关资源，理解具体比例、密度、材质和交互为什么适用于原场景，再判断哪些适用于当前任务。参考是有范围的实例，不是必须复刻的模板或质量刻度。不能只读颜色/圆角token，或把“白底、蓝灰、克制”当成全部风格。
- **完整的正向视觉目标。** 根据真实任务安排首屏重心、主次对比、组间节奏和对象辨识；需要卡片时把内部信息、图标、边缘、材质和状态作为整体设计。连续事实适合矩阵，完整可点击对象适合卡片；不把所有内容机械变成同款灰块、分隔线列表或嵌套卡片。
- **同一对象延续共同表达。** 按[跨场景一致性原则](project_context/product-profile.md#ux--screen-brief)，同一业务对象的卡片优先复用同一组件族的名称、区域/地址、图像处理、排版和按压反馈。场景附加信息放在明确的扩展区域，不另画一套无关的基础卡片。观星点记录卡以搜索卡为基础，在下方补充审核状态、原因与操作；这些状态不反向塞进搜索卡。只有真实任务或信息密度差异才调整变体，并保持可辨认的共同骨架。
- **已有表达是可复用能力。** 观星点的层次清楚的天文信息组、紧凑独立动作、共享曲线时间尺和连续状态动效；搜索的照片卡与轻筛选；My的淡色背景、玻璃计划卡和拟物可爱SUV；事件的微立体暖金流星与日期卡片，共同说明期望的设计细节水准。按新页面职责选择适用手法，不要求每页集齐，也不把玻璃或背景渐变直接铺到全产品。
- **有分量的细节，不靠加内容。** 图标应体现对象、风格与光照一致性，不能拿emoji、随手Unicode符号或默认素材敷衍核心视觉位置。材质、微高光、柔和边缘与小范围层次可以服务对象识别和触感；不得以虚构统计、教程段落、巨大插画、夸张留白或多余功能填满页面。
- **交互属于首稿设计。** 选中、按压、切换、展开、进入/退出及返回要与状态连续性一起考虑；适用的动效应能在交互原型中体验。静态工具无法表达时如实注明，不能把静态图宣称为动效完成。保留取消、减少动态效果和可访问性；不为了丰富增加阻碍阅读的循环动画。
- **交付前先处理整体。** 同视口对照采用稿，检查是否仍像线框、所有区块同一级、默认控件未经处理、容器空大或拥挤、关键图标缺乏设计、交互生硬。发现这些问题应在原请求范围内主动修订，并保留原始生成与修订记录；不能只验证按钮能点就把审美检查转交用户。

UIUX原则、审美偏好、项目视觉风格、设计系统与页面决定的定义和分工见[设计概念](project_context/product-profile.md#design-concepts-and-scope)。通用原则说明目的和适用条件；具体视觉技法与局部参数不能因页面被采用就自动成为通用要求。

本节用于解释小程序后续“克制”“紧凑”“不堆卡片”等规则。明确页面约束、事实准确性、原生App隔离、观测红光及可访问性继续有效；旧的概括性禁令不得用于否定已采用的视觉表达。用户最终审美判断仍是采用依据，本规范不把自检声明当成质量认证。

### 2. 色彩系统

当前已确认方向退出绿色主导：深中性正文、白色全宽圆角模块与极浅中性数据组承担信息主体，暖黄只点睛选择和天象；月相为亮黄/灰。黄绿仅在想去的火流星拖尾等已明确批准的局部装饰出现，不推导安全或出发建议。风险色继续表达真实限制。观星点三动作的浅蓝白云、浅夜空和暖杏背景是已采用组件例外，具体值见§5A.0。其他页面按已有角色及其采用状态处理，不自动铺绿色，也不把组件例外推广为全局装饰。夜间/观测模式保留各自低亮/暖红约束。

2026-09-08三档观星点组件已采用，具体视觉按§5A.0资源；上方可执行themes与生成tokens仍为尚未迁移的生产值。后续开发由同一token/component owner落实采用资源、校验对比度与主题映射，不建立平行主题。不恢复早期feedback-05的绿色候选，也不以本次文档采用宣称生产生成完成。原生App与运营端不在本次范围。

完整值只在当前可执行令牌的 themes 中维护，`tokens.scss` 与原生主题由此生成；下列旧来源表仅解释既有色彩角色。所有普通文本组合需达到 4.5:1；大文本和关键图形边界需达到 3:1。状态必须同时有文字、图标、形状或线型，不得只靠颜色。

#### 2.1 日间模式

| 角色 | 使用 |
|---|---|
| canvas | 纯白页面与 page-like panel 背景 |
| surface | 控件、内容面 |
| surface-subtle | 仅局部技术带、轨道、skeleton 与隐式分组 |
| text-primary | 炭黑主要文本，对 canvas 14.44:1 |
| text-secondary | 次级文本，对 canvas 6.08:1 |
| text-tertiary | 必要辅助信息，对 canvas 4.88:1 |
| border | 安静分隔线，不单独承担状态 |
| border-strong | 关键图形边界，对白 3.27:1 |
| sky / sky-soft / sky-strong | 时间、选择、信息焦点（迁移为绿色）；soft只作极浅选中面，状态另有边界/indicator/checked |
| meteor / meteor-soft / meteor-strong | 最终承诺、天象、稀缺窗口；strong 对 soft 6.56:1 |
| trail / trail-soft / trail-strong | 路线、地形、可行机会；strong 对 soft 5.89:1 |
| risk / risk-soft / risk-strong | 风险、失败；strong 对 soft 6.23:1 |
| focus | 可见组件边缘的 4rpx 内侧键盘焦点，对白 4.20:1 |
| on-sky / on-meteor / on-trail | 亮 common 填色上的深色文字，分别为 5.87:1 / 8.43:1 / 6.00:1；禁止白字 |

#### 2.2 夜间模式

| 角色 | 使用 |
|---|---|
| canvas | 中性近黑页面背景 |
| surface | 主要内容面 |
| surface-subtle | 低色度技术带/行 |
| text-primary | 主要文本，对 canvas 16.93:1 |
| text-secondary | 次级文本，对 canvas 10.38:1 |
| text-tertiary | 辅助说明，对 canvas 6.85:1 |
| border | 普通分隔线 |
| border-strong | 关键图形边界，对 canvas 3.52:1 |
| sky / sky-soft / sky-strong | 选择、时间（迁移为绿色）；strong 对 soft 9.56:1 |
| meteor / meteor-soft / meteor-strong | 最终承诺、天象、窗口；strong 对 soft 10.39:1 |
| trail / trail-soft / trail-strong | 路线、机会；strong 对 soft 9.99:1 |
| risk / risk-soft / risk-strong | 风险、失败；strong 对 soft 8.61:1 |
| focus | 内侧键盘焦点，对 surface 9.80:1 |

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

- Decision Summary：结论文字保持中性；建议用 trail、时间用绿色选择角色、稀缺窗口用 meteor，湿滑风险才用 risk；证据带分成局部子区遵守两强调色上限。
- Observing Window：轨道选中段用绿色选择角色；稀缺天象窗口可加入 meteor；不同时再加入 trail。
- Route/Elevation：trail 专属；风险标记可叠加 risk。
- Sun/Moon Event：meteor 专属；选中游标仍用绿色选择角色。
- Provenance/Freshness：默认中性色；stale 用 meteor 图标+“数据较旧”；offline 用 risk+“离线缓存”。
- 数据矩阵：同一模块共享白色圆角容器，内部每类一个语义图标，以对齐和必要细线分组；选择与异常单元另有明确状态，不把每行染成不同颜色。
- Map / Search：大面积 chrome 使用 neutral canvas/surface；未被采用稿覆盖的 query/selection 用绿色选择角色，机会用 trail，selected filter ornament 与稀缺天象用 meteor，失败/阻断用 risk。日间 Search 的浅蓝选中填色、文字与小星标以 §5A.2 采用稿为准。所有 filter 属于同一 Checkbox/Radio 语义家族；横条和分类弹层共享终端值与 committed store，不创建 quick/advanced 两套语义或状态。
- Marker / Spot panel：formal marker 的 neutral core、selected green boundary、锚点形状和 panel visible state 共同表达选择；marker 直接打开三档信息 panel，不保留 selected callout 或独立 Detail 页面。
- Analysis/Legend：独立`观测条件`Bar已退休；当前layer/metric位于`map-layer-selector` sheet的紧凑summary，日期时间由同一sheet中的共用组件呈现，summary不再复制。Active overlay legend同时使用色带与文字/形状，不混合多个layer legend。

### 3. 字体与图标

字体不依赖网络资源，也不声称打包字体。中文和界面统一使用：`"Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif`。Windows 优先使用可用的 Noto Sans SC，微信平台自然回退到 PingFang SC。数字/时间可使用 `"SFMono-Regular", Consolas, "Liberation Mono", monospace`，只用于对齐数据，不用于导航、分类标题或长文。

通用排版精确值在上方 `type` 令牌维护；§5A 已明确采用而尚未迁移的组件/页面按其 scoped profile，不能用旧生成值覆盖采用稿。page-title 为页面、spot-title 为地点身份、section 为章节、body 为核心事实、body-secondary 为说明、action 为全部普通操作/筛选、search 为搜索、metadata 为来源时效、data 为关键数值、article 为长文、critical 为影响操作的状态、display 为少量主要展示。旧 type-label/type-caption 等生产类分别投射 action/metadata，不保留另一套数值。核心值/动作/风险不得借用 metadata 缩小。

- 中文标题、按钮与标签字距均为 `0`，不得负字距或人为追踪。
- 正文与 helper 使用 400；普通标签/控件使用 400–500；标题使用 500–600；600 只保留给结论与关键时间。普通界面禁止 700，正文禁止脆弱 ultralight。
- 数字采用等宽数字 `font-variant-numeric: tabular-nums`；时间轴每列共享宽度。
- 导航与分类标题使用中文系统字体、自然字距，不使用 tracked uppercase 或等宽行政标签。
- 长中文按钮和字段标签需验证；允许换行，不以缩小字号维持单行。紧凑密度不得通过裁切、灰到不可读或全局机械缩放实现。
- 图标使用单一线性家族：22/24/28rpx 三档，默认 3rpx 描边；圆端点、圆连接，不混用填充图标集。实现通过项目 `SemanticIcon` adapter 本地化一小组 ISC 许可 Lucide path；产品专用天文几何与 rounded star 走同一资产管线。可见图标与 88rpx target 分离，不为命中面积同步放大图形。不得引入完整第二 UI 系统或运行时远程图标。
- 图标不单独表达关键含义；无可见标签的 icon action 必须有可访问名称。

### 4. 间距、密度、占用率与几何

#### 4.1 间距

以 8rpx 为主基线、4rpx 为微对齐：`0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64, 80, 96rpx`。320/375/390px 等效视口使用 `24rpx`（12 CSS px）页边距，430px 使用 `32rpx`；全屏 map/sky overlay 可使用 `16–24rpx` edge inset。紧凑不是把内容塞满，也不是机械缩小整页；它由以下四层留白共同控制：

1. **屏幕 / 布局留白**：12–16px 等效移动边距与安全区阻止内容贴边；不因追求“高级”制造空白列。
2. **组间节奏**：相关项 3–5px，普通组 6–8px，章节 11–14px；先删除无效说明，再靠距离表达关系，最后才考虑容器。
3. **组件内部留白**：文字、图标、thumb 与可见边缘之间必须保留稳定呼吸；compact 水平 6–8px、ordinary 8–10px、final 12–16px，卡片 6–8px compact / 8–10px normal。
4. **视觉重量留白**：字号、字重、行高、边框明度、填色面积与 thumb 比例共同限制“占满感”。默认文字 400、动作/选中 500、结论/主标题 600；不能用更粗字、更深边或更大填色补偿层级不足。

可见几何与命中几何分离：紧凑选择可见 `56rpx`，普通动作 60–68rpx，最终承诺 80–88rpx；交互包装始终至少 88rpx，扩展区不得与相邻目标重叠。不要为了命中合同把背景、描边、图标和文字一起撑到 88rpx。通用 text/search field 可见表面 `80rpx`，其 input wrapper/target 为 `88rpx`；日间 Map/Search 共用框采用 §5A.1 的36px可见面及至少44px独立命中区。textarea 自然更高。

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

分组使用间距、表面明度差和必要边界建立层级。完整对象/行动可使用精致卡片，连续事实优先共享表面，避免无意义嵌套或每字段独立成卡。浮层、拖起面具有空间高程；已采用对象材质所需的微高光/接触阴影按其资源处理，不等同于把所有内容浮起。新页面按§1.3设计恰当层次，不能把无阴影理解为无设计。

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
- Generic FloatingPanel 只有在其完整 dependency closure 与唯一 icon/state owner 相容，且真实 WEAPP 证明三 anchors、唯一滚动、nav-safe height、可中断 retarget以及仅当前全宽紧凑文档header热区均成立时才可替换现有实现。本次采用 Taro `ScrollView` + 当前 panel coordinator，遵循当前授权热区，不引入其他拖动入口。未来 library admission 仍须复核 version/license/lock/tree-shaking/bundle、WEAPP/IME/safe-area/a11y/gesture 与 day/night/observation 主题投射。
- 禁止并行引入两套通用 UI suite、复制 library brand defaults、让 library form store成为第二 draft/state truth、使用 runtime CDN/remote asset、或为了声称复用而用语义不等价组件。任何外部 suite 的升级或替换只能发生在 Starward owner/adapter 下方，并保持本系统的精确尺寸、层级、边距、语义与产品状态。

#### 4.6 八轴实践矩阵

这张矩阵是本系统的耐久设计上下文。跨平台基线只定义可迁移原则；Starward 列把原则翻译为户外观星决策界面；Do not 列用于评审时 fail closed。

| 轴 | 跨平台基线 | Starward 户外 / 天文决策应用 | Do not |
|---|---|---|---|
| Layout 布局 | 320/375/390/430px 按内容优先级 reflow，不缩放整页 | 结论、影响/行动、证据按纵向优先级连续；共享时间轴的标签列固定、数据列局部滚动 | 不按单一 390px 截图等比缩放；不让技术表制造页面级横滚 |
| Whitespace / density 留白密度 | 12–16px 移动边距；4/8px 节奏；屏幕、组间、组件内部、视觉重量四层分别控制 | 相关项 3–5px、普通组 6–8px、章节 11–14px；文字/图标/thumb 不贴边，先删除噪音，再用共享轴/divider 分组 | 不把 24–32px 当日常卡片 padding；不留空白列，也不把内容塞满模拟“紧凑” |
| Type hierarchy 字体层级 | 尺寸、字重、行高、间距和少量语义色共同建立层级 | 按当前结构化 type 角色投射，所有业务文字至少 metadata 下限；400/500/600 三档 | 不用全局粗黑、追踪大写、中文加字距或等宽导航；不全局机械缩放或把辅助字变得不可读 |
| Color 色彩 | 中性承担大面积；强调色按语义和局部焦点使用；状态不得只靠颜色 | sky=时间/选择，meteor=最终承诺/天象/稀缺窗口，trail=路线/机会，risk=风险；局部最多两强调色 + 必要 risk | 不以深蓝覆盖标题、边框和容器；不把语义色做成彩虹指标墙；不在亮 common 上习惯性用白字 |
| Cards / containment 卡片容纳 | 留白、字级、分隔线是默认容纳；卡片只包一个可独立识别的对象 | 重复事实使用行/带/矩阵；长卡可容纳一个观星点对象并用内部分隔行组织 | 不嵌套卡片；不把每个状态/指标/选择做成卡；卡内不放多个竞争 CTA |
| Buttons / actions 按钮动作 | 命中区至少 44px；可见面可更小但扩展区不重叠；一个局部主动作 | compact 28px、ordinary 30–34px、final 40–44px；只有最终承诺可全宽并使用 meteor | 不把每个按钮都做 44/48px 实心大面；不让普通重试/导航看起来像提交 |
| Visual focus 视觉焦点 | 触摸反馈、编辑态与键盘焦点分流；pressed/selected/disabled 各自有语义 | touch=80ms press 后恢复；input=光标+1px 浅变化；keyboard=`:focus-visible` 内侧下边缘 | 不把焦点当普通移动状态展出；不用完整深蓝框、offset 外环、双框、光晕或命中盒描边 |
| Mobile adaptation 移动适配 | 验证触控、键盘、读屏、长标签与安全区 | Search field 过渡前后保持同一可见面，日间采用 §5A.1 的36px框/至少44px target；large panel只填充主导航上方、名称/地点下方的轻量横向吸顶章节Tab、compact action rail与bottom layer sheet避让安全区 | 不以隐藏、裁切或压缩表格通过窄屏；不显示 scrollbar chrome；不把桌面栏位仅缩小后塞进 320px |

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
- 长标签换行，数据值可保持一行但标签列加宽或转为上下结构，不裁切有效信息。
- 每个移动 scroll owner 必须同时保留 touch/wheel/keyboard/programmatic/screen-reader reachability 并隐藏纵横 scrollbar chrome；不得用 `overflow:hidden` 或裁切正文代替。WEAPP/Taro 优先 `ScrollView enhanced + showScrollbar=false`；H5/prototype 同时覆盖 Firefox、旧 Edge 与 WebKit 的 scrollbar-hiding declarations。
- 不以色彩单独表达状态。Permission、risk、failure、partial/stale/unavailable 仅在具体状态改变当前结论、动作或恢复路径时可见，并直接说明受影响事实与结果；禁止常驻“部分数据”等泛化 badge。
- 普通 material surface/state change 使用可中断、从 live presentation retarget 的因果动效，不突然出现或消失。`prefers-reduced-motion` 移除大幅位移、惯性与装饰运动，保留直接操控、即时功能状态和焦点反馈。

### 5A. Map / Search / Spot Information 产品 UI 合同

本合同只规范小程序自有的 Map、Search、spot-information-panel chrome；Surface、Control、状态与 commit/cancel/recovery 仍由 Mini Program Screen Contract 拥有。地图 provider、basemap、tile、道路/地形/卫星内容、native rendering 与不可移除 legal chrome 不属于本设计系统。

#### 5A.0 已采用观星点信息组件（三档）

地图唯一采用入口为[ADOPTED.md](docs/design-resources/wechat-miniapp/map/ADOPTED.md)。2026-09-08用户确认small/medium/large组件完成，采用[三档资源](docs/design-resources/wechat-miniapp/map/adopted/spot-information/README.md)及最终动效；覆盖日间正式点位的基本信息、天文、相关媒体和底部操作。其具体几何/颜色/图标/动效替换本文件内该组件的旧rpx和中档静态表达，不自动推广到其他页面/主题。生产组件、接口和生成tokens尚未迁移；本次资源/规范采用不触发生产生成。

| 角色 | 采用表达（逻辑px，具体级联值以采用源文件为准） |
| --- | --- |
| 字体尺度 | 保持原B紧凑尺度；地点名18px，地区/事实正文12px；不因三档高度不同整体缩放 |
| 面板 | 同一保留文档、全宽白色紧凑身份区；无顶部图片时三档均保留顶部圆角；large有全幅顶部图片时沿用图片构图；最终档位基准及安全区映射见采用包 |
| 章节 | 首屏隐藏，天文边界出现；一级同文档定位、短圆头渐变滑动指示；第二章起标题位于卡片外 |
| 设施 | 停车/洗手间上下各一张无框无阴影照片卡，开放时间为文字；仅图片虚化/局部遮罩，无图为纯色事实卡 |
| 天文 | 全宽白色圆角模块，相关数据紧凑分组；内层底#FBFBFC、无框，月相亮黄/灰 |
| 导航 | 右向且居中的纯箭头，无文字/边框/背景；具名且完整44px命中区 |
| 三动作 | 想去/云观星/分享；等宽、可见32px、圆角7px、文字12px、图文间距6px、完整44px命中区，无边框 |
| 动作背景 | 想去浅蓝白云#DFEFFC→#F6FAFF；选中想去与云观星夜空#61697E→#535C71，星位不同；分享#FBEFE3、文字#70563E |
| 想去动效 | 主星顺时针360°/820ms、缩至.94；两副流星冲入渐显、不等待夜空；取消逆向接管live状态；主星黄绿拖尾避开副星头部 |

昼夜背景只原位交叉淡入淡出；夜空星点缓慢明暗，减少动态效果静止。几何、色彩与交互须严格按采用资源开发；业务/数据/失败恢复由Screen Contract约束。示意地图点位、假数据、模拟系统栏和微信胶囊不是生产数据或自有像素基准。跨屏适配保持字体和控件尺寸，以实际安全区/容器布局映射；可访问性颜色差异须显式记录核对，不得默默改变已确认尺度。

原2026-09-07地图外部Search/主导航尺度在未被明确替代部分继续有效；当前组件外的页面/图层及夜间、观测模式仍沿用其owner。

#### 5A.1 Map 主体与悬浮 Search

- 地图连续铺满 route 的可用内容区，是唯一地图对象。顶部只放一个 fixed floating Search field。日间 Map/Search 共用框沿用已采用地图的实测样式：左右16px、可见高36px、文字13px、圆角pill、浅边框、白色90%填色、无阴影，独立命中区至少44px；顶部按实际系统/微信安全区映射，资源中 top=90px 是示例设备值，不可硬编码到所有设备。两态使用相同位置与尺寸；其余具体组合见 Search 采用包。未覆盖主题仍沿用原 `24rpx` inset、`safe-top + 16rpx`、`80rpx` visible/`88rpx` target、`radius-panel` 和对应主题 surface/border/elevation。框不承载 filters、results、快捷入口或说明副标题；activation 进入专用 Search page。
- Location/layer edge actions 日间按已采用稿使用36px可见面、44px target、8px间距，glyph 16px；未覆盖主题沿用原 `52–56rpx` 可见面、`88rpx` target、`8rpx` 间距，glyph `24–28rpx`。Layer trigger 只打开第 5A.4 节的随内容伸缩 bottom sheet；原独立`观测条件`卡片并入sheet，不在地图右侧展开文字rail。普通底图、默认marker、卫星、交通、雷达、风、温度不得被补成choice。
- Formal marker 默认 `32rpx` neutral core + `2rpx border-strong` + 下锚点；selected 使用 `40rpx`、`sky-soft` core、`2rpx sky` boundary 和 panel-visible/programmatic state。禁止 glow、pulse、particle。真实 hit geometry 由 native adapter 另证，Search result list/semantic list 是完整非手势替代。
- Marker 直接以`medium`打开 `map-spot-information-panel`，不保留 selected callout、Finder Sheet 或独立 detail route。非 marker map tap 从 panel 当前 live position 执行 `220ms exit` 向下离场，完成后才移除 hit/semantics，不得瞬间消失。

#### 5A.2 Dedicated Search、统一 filters 与 results

搜索页唯一采用入口为[ADOPTED.md](docs/design-resources/wechat-miniapp/search/ADOPTED.md)。2026-09-08用户确认[搜索页资源](docs/design-resources/wechat-miniapp/search/adopted/search-page/README.md)完成，采用A方向的日间紧凑尺度及最终交互、地址对齐修正。下述组合替换该页旧全换行筛选、统一结果卡描边、固定半宽文字区及大号选中星标表达；未覆盖主题和状态保留原规则。具体页面级联值、图片与完整组合以采用包为准，生产页面、筛选/选点链路和生成tokens尚未迁移，本次采用不触发生产生成。

- 页面按 Search → titleless unified filters → `想去`/`其他观星点` partitions 排列，一个 keyboard-safe vertical scroll owner。Map entry 与 Search field 使用同一 visual frame和同一可见query/placeholder字符串：outer rect、fill、border、radius、shadow、text、type baseline、slot 与 caret origin不变；leading glyph只在相同`88rpx`slot内Search→Back交叉替换，两态均无trailing `x`/clear/chevron。Field默认autofocus；任意外部有效tap可blur、关闭suggestions/IME而保留route/query/filter/result/scroll，再次tap可重新focus。Back glyph、系统/微信Back与平台edge-back都pop Search child回Map。Field以下内容以clip/reveal + `translateY(-12px→0)` + opacity `0→1` / `180ms`向下展开，field自身不动；退出反向`160ms`。
- Query suggestion overlay紧贴field下沿，保持紧凑可读行和至少44px目标，不移动原框。筛选只展示一行，按Screen Contract的16个终端值可横向滑动，末端具名筛选图标固定；不分quick/more，不显示“筛选条件”标题或额外介绍带。日间胶囊、间距、轻分隔线与首分组距离沿用采用稿；横滑结束不误触选项。未覆盖主题的overlay保留4rpx贴边、72rpx可见行/88rpx目标、22rpx图标、16rpx水平内距与1rpx行分隔；胶囊保留44rpx可见/88rpx目标、10rpx内距、20rpx图标、4rpx图文间距、10.5/14.5px文字，以及原4–6rpx贴边与12–16rpx首分组距离。
- 筛选图标打开底部二级分类弹层，左侧五类为观测条件、到达方式、设施配套、场地偏好、资料更新，右侧为对应终端值，不再嵌套第三层。无参数横条项点击即时提交；驾车时长打开同一弹层的到达方式分类，按Screen Contract编辑启用状态、时间/距离模式及对应数值。弹层基于同一committed选择和参数建立draft，清空只改draft，确定一次提交，关闭/遮罩/Escape/系统Back取消并恢复入口焦点。具体分组与数据含义由Screen Contract约束；弹层局部draft不成为第二筛选事实源。2026-09-09业务修订后的局部资源待用户审查，现行采用包仍控制未变的视觉组合。
- 日间selected使用采用稿的浅蓝填色、边界、文字和小星标，几何保持稳定；原大号半透星标不再约束本页日间稿。未覆盖Night保留 `48rpx` 圆润实心 ornament、`right:-4rpx; top:-8rpx`、meteor opacity `.30`及原sky-soft/`2rpx sky`inset boundary/checked表达，不参与inline sizing且文字仍可读；Observation映射暖红，不保留黄色。未覆盖主题保留原select `scale(.42) rotate(-14deg) opacity(0)`→`scale(1) rotate(5deg)` /170ms、deselect→`scale(.56) rotate(-7deg) opacity(0)` /140ms。选中/取消均从live状态反向接管，减少动态效果只保留≤80ms颜色/透明度变化；精确日间表达见采用源文件。
- Result Card占满内容列。日间合法图片cover整卡，无边框、无阴影，leading白色到透明的可读性遮罩和名称宽度随采用稿，不再固定52%；图片仍可低对比透出，不用opaque slab、blur/glass。无图时只渲染安静纯色卡，不存在图片节点、placeholder、标签、固定高度空档或附加空间。地址图标与首行文本共用对齐槽，长地址换行仍贴齐首行。未覆盖主题保留原min-height`156rpx`、`radius-panel`、`1rpx border`及52%leading field和主题遮罩。
- Whole card是唯一selection action；右侧不出现“选择”或第二control。选择提交formal spot、返回现有Map、重定位该点并打开medium panel；重复选择同一spotId也必须执行恢复，不得因ID相同跳过。两个Partition各自拥有44px具名operable heading和expanded状态；展开/收起保留同一DOM/state tree，以measured live height/clip+opacity在`160ms`可中断retarget，完成后才移除hit/semantics，不得remount、`display:none`、reset scroll或产生抖动/闪烁。城市只作group heading。资源中地图为静态、卡片只有按压外观，不代表正式点选择与地图/信息组件联动已验证。

#### 5A.3 Spot Information Panel

- Panel 是 Map-parallel non-modal owner，状态为hidden + small/medium/large三个visible extents。三档具体高度/圆角/安全区构图以§5A.0采用资源为准，不恢复旧56vh或不同字号尺度。Large填满平台顶部chrome与Map/My主导航之间的可用区域，不覆盖或替换主导航；无顶部图片时small/medium/large均保留顶部两角；large全幅图片按图片构图，无外阴影。
- 三档始终挂载同一份、同序、同identity的客观document：有效media→地点identity→route/access/facility/safety→guides/field/source→卡片外天文标题→日期/时间尺→月相/气象/夜光/目标/来源。Small/Medium只是较短viewport裁剪；Large才启用唯一隐藏scrollbar chrome的internal vertical scroll。禁止按extent分别渲染、remount、重新排序或重复mapping。唯一presentation例外是合法media：small/medium不占media，medium→large时才在document顶部连续拉出；无图从不渲染media node/placeholder/空档。
- Handle 保留短细圆头提示，整条面板宽度的紧凑白色 identity-header band 为拖动热区，触控高度至少44逻辑px。名称上移并可进入热区下部，不靠额外空白撑开；操作按钮不与热区重叠。Band 跟随同一document滚动，绝不fixed/sticky在panel可视区；有图时位于相册之后，无图时为首区。滚出视口后无替代热区，靠系统/平台Back或可用的edge-back返回档位；滚回真实header才恢复拖动。Pointer down仅改变press反馈，未过方向/距离阈值的tap为no-op。
- Large左边缘`32rpx`edge zone右滑或handle下拉执行Back语义的`large→medium`，保留selected spot、section与meaningful scroll；具名extent controls提供非手势等价。普通Back/Escape顺序为owned disclosure→large→medium→small→hidden→route。中/大档除实际可见header band以外的Panel body/content/media或泛化viewport top-edge均不发起extent drag。小档裁切正文上拖展开到中档，下拖在小档硬边界不动、不关闭；中/大档正文均可滚动。
- Panel top/media/content size必须在每个direct-manipulation帧按live extent、safe area与actual media presence计算。有合法media时`mediaReveal=clamp((p-.50)/.28,0,1)`，clip-height从0到`clamp(300rpx,27dvh,420rpx)`，image从`translateY(-18rpx) scale(1.02)`到0/1；无图没有media phase。
- 只有panel top接近screen top才淡出Map chrome：`chromeFade=1-clamp((p-.82)/.12,0,1)`。Search、Location与Layer trigger共享该phase，opacity≤.08才移除hit/semantics；反向先恢复chrome，再收media。不得在图片刚拉出时提前隐藏chrome。
- Large采用全宽中性白色圆角模块与共享文字内距。章节导航遵循6.11：基本信息首屏隐藏，到天文章节出现并吸顶；仅一层同文档锚点，不恢复旧侧边rail。
- Bottom action bar沿用§5A.0的三档采用资源几何，顺序想去/云观星/分享；可见区域与44px命中区分别处理。Favorite星形由既有语义图标owner承接已采用矢量，不建立第二套关系状态。
- 只有handle hit region内的vertical panel drag从live position跟手；whole panel body/content/media不启动extent drag。Curved ruler的horizontal gesture获胜后panel不得抢占。Release使用nearest snap + velocity和bounded spring，≤280ms；tap handle为no-op。

#### 5A.4 图层、观测摘要、状态与模式

- 原独立`观测条件`Bar/Control已退休；`map-layer-selector` sheet表达整个地图的图层、图例与必要来源/覆盖范围，不显示观星点名称、单点值或虚构地图汇总值，不在Map左下另占surface。日期与时间由全小程序共用的日期选择+Curved Time Ruler组件呈现，沿用已采用观星点天文组件，总云量场景只省略月相图标；光污染是年度夜光数据，不显示整个日期时间区，不保留空位、不使用disabled状态；摘要不再复制日期/时间。
- Map analytical layer 使用 solid canvas/surface 与 dividers，不用 glass/card wall。Sheet overlay不remount或移动地图；同一物理地图、camera、selection与scroll coordinates保持连续。
- App-owned legend 只随 active analytical overlay 出现，使用 `radius-band` solid strip、`1rpx border` 与 label/value/shape；一次只有一个 layer legend。
- Day/Night 使用当前 roles；Night 不用 glow/neon。Observation 中 app-owned Search、marker、panel、rail、legend、loading、focus 和过渡只用 closed black/warm-red roles。不能主题化的 native/provider surface 必须在进入前提供 safe cancel/return 或 non-field alternative。
- `map-layer-selector`由紧凑Map-edge trigger与内容驱动高度bottom-sheet presentation组成，不新增第二Control key。Trigger active与地图定位/新增加号统一使用亮色边框和微弱柔雾阴影，缓慢呼吸且几何不变；减少动态效果时保持静态。无drag handle、`x`、Close row、多extent暗示或“关闭图层”。只列`光污染/云量`两张等宽、整卡可点的abstract image-backed单选卡；selected用极浅fill、inner boundary和checked state。有效选择即时切层，无额外确认；重复选择当前项保持选中，不产生全未选或叠加两层状态。“观测机会”已从小程序地图图层选择和对应摘要/图例中移除，原因是此处保留可直接理解的客观图层。原`332rpx + safe-bottom`主体不能裁切新共用日期时间组件；总云量高度须容纳正常字级、日期栏和独立44px触控区域；光污染使用紧凑高度及年度数据说明。底部选择卡与导航保持原位，顶边从当前呈现高度平滑伸缩，快速反向直接重定向，减少动态效果时直接切换；圆角由外层裁切保证白色子组件不溢出。日间采用稿由Map ADOPTED的layer-selector包给出：顶角18px且外层裁切，390×844视口下云量/光污染高度分别276px/134px，内容字号放大时按内容扩展，不硬裁切。
- Map只有一个`bottomPresentation = none | spot-panel | layer-sheet | spot-editor` coordinator。打开layer直接把spot presentation retarget为layer；panel hit/semantics/active在所有权切换时清除，只有旧视觉可完成退出，selected identity与previous extent保留为恢复历史。Layer open时marker/result intent直接把同一owner retarget为新spot medium，不先恢复旧panel。关闭layer只在没有更新intent时恢复prior extent。Editor未保存离开遵循Screen Contract的先确认后提交；取消保留输入、媒体、候选位置、相机和原上下文。任一时刻只有一个底部交互owner，不以并列active flag绕过协调器。
- Loading/empty/partial/stale/error/offline/permission 使用 `notification-feedback` 与 `page-state-recovery`，保留可信地图、点位、filter 和 panel state，不用 fixture 补值。只有具体影响判断/动作/恢复的状态可见并说明其影响；Search/filter/panel/layer/selection 的局部状态已是反馈，不另弹 floating notification，也不展示操作教程或实现说明。
- `320/375/390/430` 标准字号与 safe area 必须适配。每个 action 有 role/name/state/value/focus order；Search、filters、results、panel extents/sections/actions、layer/time/close 可 keyboard/assistive 操作。Back/Escape 先关闭 owning disclosure/panel，再返回逻辑 opener focus。

云观星采用[唯一资源入口](docs/design-resources/wechat-miniapp/sky/ADOPTED.md)：全屏星空、轻量标签及目标焦点卡参考、透明公共时间尺与日期栏、紧凑罗盘恢复浮层。星点来自星表与投影，不是装饰壁纸；采用包画外姿态控件仅用于演示。

### 5B. Settings 与 My

- Settings采用[唯一资源入口](docs/design-resources/wechat-miniapp/settings/ADOPTED.md)：紧凑日月星滑轨、浅灰分组、位置与隐私、提醒、数据操作。选点偏好与减少动态效果设置项已移除，系统减少动态效果适配仍遵循共享规则。底部确认层的蒙层独立随进退渐变透明度，退出露出原页面而非闪白，控件值与箭头保持垂直居中。
- 观星点创建与反馈采用[唯一资源入口](docs/design-resources/wechat-miniapp/contributions/ADOPTED.md)：沿用搜索公共观星点卡片，在卡片下扩展审核信息；一级Tab指示线按选中标签实际几何居中，切换与字体/容器变化保持对齐。

- Settings只保留一个`display-mode-switcher`，值域=`day|night|observation`且默认day；`observation-mode-control`不再是独立组件或页面底部CTA。该控件是single-choice三站滑轨而不是二值Switch：track max-width=`560rpx`、visible height=`72rpx`、三站等宽、每站target≥`88rpx`，thumb包含由`SemanticIcon`提供的Sun/Moon/Star与短label。
- Tap任意站直接选择；tap当前thumb在有next时前进一步。横拖越过8px后跟手，向右`day→night→observation`、向左反向，不wrap、不跳站；release按position+velocity snap。方向键/Home/End与screen-reader direct choice等价。
- Day↔Night使用`180ms`thumb transform与Sun/Moon scale/rotation/opacity交叉；Night↔Observation先原子绑定closed black/warm-red tokens，再做Moon/Star opacity/微旋转，过程中禁止白/蓝/黄/绿/中性灰闪现。Reduced motion即时snap并保留≤80ms icon opacity确认。
- My日间根页采用[唯一资源入口](docs/design-resources/wechat-miniapp/my/ADOPTED.md)：无顶部页名、可编辑头像昵称、唯一设置、观星计划玻璃主卡及已提交。该页明确允许淡色渐变与单张液态玻璃，覆盖本页旧纯白/无玻璃规则，不扩展到地图或其他页面。最终图标为暖米色朝左露营SUV，拟物且圆润可爱，与标题间隔8px；卡头无“全部”文字，箭头与计划行尾箭头同列。具体尺寸与材质以采用资源为准；其他主题使用安全不透明等效呈现。

### 5C. 观星点新增、草稿编辑与反馈

- 使用[统一采用表单](docs/design-resources/wechat-miniapp/feedback/ADOPTED.md)，复用已有 contribution/form/upload/notification owner。新增、编辑远端草稿、反馈完整回填共用字段文档：地点搜索与名称、开放与到达、设施与现场（含停车/洗手间图片）、现场照片、补充说明。字段语义和校验以 Map/Shared State Context 为准；移除旧 report kind/topics/到访时间表单构图。
- 地图非拖动弹层无顶部横杠；进入上滑、退出下滑，系统返回关闭。搜索和三个悬浮控件淡出，弹层顶位于原加号位置，地图仍可操作。候选点在剩余可视地图中心，名称来自地点名称。切换其他点按同一 coordinator 关闭表单、打开目标信息组件。
- 单一连续垂直文档，tab/标题分层，不用设施折叠。字段左对齐，设施组浅灰与观星点天文容器一致。真实必填以浅红星号标识，不重复“选填”；触摸焦点无装饰高亮，键盘 focus-visible 仍可识别。补充说明固定高度、内部滚动，不可拖拽缩放；图片上传进度/失败/删除留在原格。
- 仅新增/编辑草稿有手动存草稿，每次加号为空表单；多个远端草稿经成功请求回执更新。无自动/关闭保存或本地草稿权威。保存时间放标题右侧，不加高底栏；当天显示时间，跨日显示日期。保存操作不弹通知。
- 反馈入口为“我要反馈”文字加箭头，无边框背景。全部回填，偏离正式基线的字段浅黄，恢复即清除；底部汇总原文红色划线→新文，旧图灰化微倾斜加停用标记→新图。提交后冻结快照、无提交/存草稿；标题审核中。正式点“我的反馈”标签打开该只读快照。
- 提交使用按钮内 loading，并防重复及表单变更；失败保留输入和幂等身份，成功仅表达审核中。审核中提案信息组件无想去/分享；草稿无我要反馈。普通消息复用顶部小白底黑字无边框堆叠通知，3秒消失/手动关闭，上浮淡出。

### 5D. 观星计划与天文事件

- [计划采用资源](docs/design-resources/wechat-miniapp/plan/ADOPTED.md)确定列表、详情和编辑构图：观测时段与参考靠前，出行安排按时间串联，之后为关联事件、用户提醒清单和备注。蓝灰正文、浅灰信息区、暖金小图标；不把 My 的玻璃材质扩散至普通页面。
- [事件采用资源](docs/design-resources/wechat-miniapp/events/ADOPTED.md)以月份分组、日期票签和轻灰卡呈现具体年度记录。详情保留微立体暖金流星、活动日期轴、地点/日期联动、真实观测条件和来源。删除通用科普及准备建议填充段落，不编造天文或天气数值。
- 事件列表和详情共享同一具体记录身份；日期选择点轻滑，地点/来源弹层进退，按压反馈克制；减少动态效果取消位移。返回实际来源，不固定回 My。计划关联不覆盖用户既定日期与地点。

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

- **Anatomy**：共用日期栏与日历输入、唯一current-time表达、fixed center axis、Taro enhanced horizontal `ScrollView`承载的真实离散tick track、必要labels与可选月相槽。独立动作/操作区域至少44逻辑px。Scrollbar chrome始终隐藏；尺自身无outer card/border/shadow、说明文案或visible左右时间步进arrows，容器由消费者承载。
- **Variants**：可拖动、只读、partial、Map、spot-panel astronomy、Orientation overlay。Map/spot使用已采用天文资源的同一具体几何：日期栏44px，日期13px常规字；tick step66px，普通刻线2×9px，暖黄中心轴3×12px且top8px；相邻时间11px、当前12px，均常规字重。含月相的尺84px高、tick目标78px，图层无月相时仅移除18px图标槽，尺66px、tick目标60px。月相16px，位于时间标签后。当前隔离资源按30min切片演示，生产cadence与可用性只从真实domain重建；其他viewport保持这些字级并裁选邻近labels，不整屏缩放。
- **Curvature**：按已采用组件，令`d=abs(sliceIndex-liveIndex)`，`translateY=min(12,d²×3)px`、`opacity=max(.25,1-d×.22)`；刻度轨道以66px步长在固定中心下连续移动。中心标签以对比和小幅字号区分，两侧沿同一浅弧下沉、淡出。日期栏与中心轴共线，底部仅保留今晚/观测夜/历史时段及跨午夜起始观测夜的必要归属，不重复中心钟表时间。此具体资源替换此前34rpx步长与normalized-distance缩放的旧参数，不能混用。
- **Interaction**：拖动每帧preview nearest真实slice；scroll end/projected offset snap到最近valid slice并在≤120ms settle后commit；cancel回到committed offset。新手势从live offset接管，不排队。Horizontal intent获胜后parent panel不抢手势。不显示左右箭头按钮；programmatic increment/decrement只经键盘与辅助技术语义提供，也不显示“每次移动”“释放后对齐”等说明文案。
- **Color/radius**：center/selection sky；event/peak meteor；适用的良好窗口可 trail subordinate band；Observation 用暖红高度/实虚/shape 区分。
- **A11y**：adjustable/slider 暴露 min/max/current 与真实 step，提供键盘/辅助技术increment/decrement和文字摘要，不为此添加visible arrow chrome。320px只保留center与必要邻近/edge labels，不缩小current。Reduced motion保留直接跟手并即时snap，无额外inertia/spring。
小程序公共时间尺补充（2026-09-08）：松手提交最近有效刻度后，从实际拖动位置连续吸附至中心，曲率、透明度与横移使用同一呈现进度，不能先跳到整数刻度。吸附中重抓从当前画面接续，快速再次输入重定向，取消恢复原已提交值；隐藏/销毁清理动画，减少动态效果时直接归位。浏览器资源以220ms柔和减速展示，生产由共享Taro时间组件实现并在真机核验。日期栏显示所选时刻的地点当地日历日期，跨午夜同步日期、星期及日历高亮；内部观测夜分组保持不变。图层标签使用“云量”（TOTAL_CLOUD），光污染/云量分别配灯泡/云朵描线图标，勾选状态独立保留。

- **Composition / reuse**：一个 viewport 只有一个主时间尺。全小程序复用同一日期/时间公共组件实现与同一 Observation Context，而非各页面近似绘制；Map总云量图层和spot-panel astronomy使用相同的日期栏、日历、曲率、字级、刻度、中心轴、preview/commit/cancel与恢复规则。已采用观星点天文资源是当前组件的具体视觉依据，总云量场景仅不渲染月相图标及其空占位；日期选择不能因此省略。LIGHT 年度图层不呈现日期时间组件，保留共享已提交值，返回总云量恢复原日期时间。Orientation复用同一时间尺内核与提交状态。日期栏的前后日历日期按钮属于日期输入，不是被禁止的时间尺左右箭头；今晚入口不推移日期中心。能力、跨午夜与缺失规则见Spot and sky的Lunar Facts And Date Selection。实现复用Taro `ScrollView`的scroll physics/`scrollX`/`enhanced`/`showScrollbar=false`/`onScrollEnd`，共享组件位于小程序公共components层，页面提供真实可用日期/切片与事实，不让组件依赖Map页面或计算气象/月相；不引入第二UI system或React-Native-only尺。

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
- **Layout**：内容原位展开，保持共享时间轴；不弹出二级卡片墙。摘要尾部chevron在同一方形图标框垂直居中，随展开旋转，内容高度同步下拉/收起；快速反向从当前高度接管，焦点不跳转。
- **Color/radius**：中性分隔线；选中 sky；外接键盘 focus-visible 使用局部内侧下边缘；0–8rpx 技术容器。
- **A11y**：按钮同步 `aria-expanded`/`aria-controls`；焦点不跳转。
- **Composition**：结论首屏最多一个证据入口；展开后先核心行再扩展行。

#### 6.11 Stargazing Spot Information Panel

- **Anatomy**：随document滚出的全宽紧凑白色header drag zone、三档裁剪同一retained non-modal document、medium→large presence-driven licensed media、客观`基本信息 → 天文信息`顺序、到天文边界才出现的轻量横向吸顶 `基本信息/天文` 章节导航、short fixed `想去/云观星/分享` action bar。
- **Variants**：hidden、small、medium、large、dragging、settling、loading、partial、stale、error；hidden 与 visible extent 分开建模。
- **Geometry**：复用本文件 Map / Search / Spot Information 合同中的三档高度、圆角、把手和导航边界，不维护第二组尺寸。章节导航默认仅一级，基本信息首屏隐藏，滚到天文章节边界后出现并吸顶；靠左排列，不加图标、填色或等分整行。单一选中线短、稍厚、圆端，局部渐变按最新配色方向确认，切换时连续滑动且可反向打断；文字保持可读中性深色，不再要求绿色。点击定位同一文档并扣除导航高度，滚动回写章节；出现/隐藏不改正文几何。点击区域满足当前44px触控下限，正文模块为全宽白色圆角卡，卡内保留文字内距；同类指标以细线/对齐组织，可尝试一个极浅中性内层共同区域辅助比较，不给每个标量套彩色小卡。全小程序章节标题遵循 information-design：第一项可省略重复大标题，第二项及之后必须在内容起点显示章节标题，吸顶导航不替代它；章节标题统一在卡片外，地图“天文”位于日期时间首卡上方。动作栏使用当前令牌与共用动作规则。
- **Transition**：`mediaReveal=clamp((p-.50)/.28,0,1)`先拉出top media；`chromeFade=1-clamp((p-.82)/.12,0,1)`后淡出Search/Location/Layer trigger。Reverse先恢复chrome再收media。No-media没有media phase；紧凑白色header band位于真实document顶部，有图时在相册之后，随正文滚动而非悬浮。Panel vertical drag、medium/large content scroll与horizontal ruler通过direction-lock独占手势。
- **A11y / composition**：large左边缘`32rpx`右滑或handle下拉执行Back语义的large→medium；named extent controls提供等价路径。中/大档仅实际可见的全宽紧凑header band发起extent drag；正文滚动。小档正文上拖展开至中档，下拖在硬边界不动、不关闭。Small/medium/large不切换内容树，只裁剪同一document。普通missing值显示`暂无数据`但domain state不合并。不得恢复独立Spot Detail/Spot Night、切换独立内容树的tabs、推荐窗口、第二地图、nested full-height sheet或duplicate actions。

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

- **Anatomy**：范围标签、query input、搜索/返回glyph、必要helper/loading、suggestion/result region；日间Map/Search框按§5A.1采用值，未覆盖variant保留12px input与11–12px glyph。trailing clear/close只在不与Back重复且owner明确需要的其他variant中可选，当前Map/Search两态均无。
- **Variants / states**：idle、editing、query、loading、suggestions、result、empty、error，以及inline scoped/filter search；editing用光标与1rpx浅色调变化，不展示持续“焦点框”状态。
- **Geometry**：日间Map/Search使用§5A.1的36px可见框与至少44px独立target；未覆盖variant保留visible `80rpx`、wrapper/target `88rpx`。suggestion/result row≥`88rpx`；紧邻所筛选集合，不脱离上下文。Map→Search使用同一stationary frame；glyph在同一leading slot交叉替换，其余field几何不变。
- **A11y / composition**：永久说明搜索范围；有用placeholder不替代label；listbox/option或等价列表语义；输入、建议和Back均可键盘操作并播报结果数。Entry可autofocus，但outside tap必须能blur/收IME/关suggestions且不离开Search，随后可重新focus；系统/微信Back和edge-back与leading Back同义。
- **Do not**：不做无范围的全局搜索暗示；不把 search 藏进 generic Input；不以空白屏替代 empty/error 说明。

#### 7.3 Text Input / Textarea

- **Anatomy**：永久 label、field、value、按需 helper/error、可选字符计数；没有 helper/error 时不保留空槽。
- **Variants / states**：text、time、multiline；divider-backed cell row 与 complex-field top-label；normal/focus/error/disabled/readonly/loading。
- **Geometry**：单行 input visible `72–80rpx`、wrapper/target≥`88rpx`；cell horizontal padding=`16–20rpx`，label column=`144–176rpx`。Textarea visible min-height=`176–208rpx`并有内容上限；top-label gap=`8rpx`；control radius与neutral inset border。
- **A11y / composition**：helper/error 紧贴 affected field并通过 aria-describedby 关联，input mode 匹配；blur/submit后出现的错误不得引发页面跳顶。长中文 label 可将 horizontal cell 重排为 top-label stack，不横向裁切。
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

- 地点类详情的内容分组、容器选择和密度检查遵循 [信息设计 Context](project_context/areas/main/screen-contracts/wechat-miniapp/information-design.md)；该节点解释布局决策，本文件继续单独拥有精确视觉值。

- 信息密度按内容安排：短状态可并排、标量用共享列或分组指标、长说明自然展开；少量数据不逐项占满一行。使用留白、对齐和轻表面区分层次，避免统一卡片墙；保持标准字号与完整风险/缺失语义。

- **Anatomy**：一个 coherent object 的 heading、content、meta、最多一个局部 action。
- **Variants / states**：content/event card、saved-plan/action card、evidence/freshness card、compact metric/decision tile、full-width 长对象卡；implicit grouping 对照。
- **Geometry**：compact padding`10–14rpx`、normal`14–18rpx`、rare friendly最多`28rpx`；按职责使用panel/panel-lg/friendly，而非统一圆角。Search result占满内容列，日间几何按§5A.2采用稿，未覆盖主题保留min-height`156rpx`。
- **A11y / composition**：heading建立区域名；重复密集事实优先rows/dividers/shared-axis。Image-backed Search result的leading readable field及无框无阴影日间组合按§5A.2采用稿，未覆盖主题保留52% field与mode-correct gradient；整卡是唯一action，不再附“选择”。地址图标与首行对齐。无合法/可用media时不渲染media node、placeholder或空档。卡片可从周围内容独立识别才成立。
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
- **A11y / composition**：status/alert 按严重度；自动消失可暂停；重复事件按 owner/dedupe key 合并；小程序不同事件可顶部紧凑叠放最多3条，白底黑字无边框，3秒自动关闭或手动关闭，上浮淡出；重要错误同时保留行内恢复路径；一个 transaction 最多一个 floating feedback。
- **Do not**：selection、filter、expand/collapse、tab/segment、navigation、favorite success、time scrub、layer choice 和 mode state 不弹 toast/snackbar/modal，局部 visible state 就是第一反馈；重要错误不只靠 toast，不放多个动作，不遮挡主导航或最终承诺，不逐帧播报 direct manipulation。

#### 7.14 Dialog / Bottom Sheet

- **Anatomy**：title、body、actions；只有可拖动sheet/panel另有handle、停靠边与安全区。
- **Variants / states**：dialog confirm、sheet task、hidden/small/medium/full-screen-large/dragging/settling/loading/error。Map spot information panel使用三档visible extent；Search不使用Sheet；layer selector使用随所选图层内容伸缩的单一sheet且无drag/multi-extent暗示。
- **Geometry**：dialog radius24rpx；无顶部图片的三档spot panel保留顶部圆角（沿small/medium的采用几何）；有全幅顶部图片的page-like large才允许radius0；fixed layer sheet top radius28rpx；只在真实浮层使用elevation-2；动作遵守ordinary/final梯级。所有内部scroll owner隐藏scrollbar chrome。
- **A11y / composition**：Modal dialog使用focus trap；map-parallel non-modal panel不trap map semantic alternatives。Escape/返回按owning disclosure/extent逐级关闭并返回触发点；large另有左边缘Back gesture。Spot panel只有具名handle hit region可发起extent drag，tap handle为no-op；Layer sheet无handle/`x`/off row，与spot panel共用一个mutually-exclusive bottom-presentation owner并恢复此前panel extent。
- **Do not**：不把常规分组画成 sheet/dialog；不新增产品路线；不在浮层中堆卡或并列多个主动作。


### 8. 运动系统

所有运动均由明确操作或数据因果触发，可中断、可反向，除明确授权的按钮夜空星点明暗外无环境循环；normal motion下material route/surface/state不得突然出现或消失。基础缓动：standard `cubic-bezier(.2,0,0,1)`，exit `cubic-bezier(.4,0,1,1)`；press 80ms、short 120ms、medium 160ms、long 200ms，direct-manipulation panel使用280ms上限。bounded spring：mass 1、stiffness 420、damping 34、rest delta 0.5；禁止持续弹跳。

| Recipe | Trigger / current → target | Timing | Interruption / reverse | Reduced motion | Haptic | Observation |
|---|---|---|---|---|---|---|
| Press | pointer/key down；scale 1 → .985，抬起 → 1 | 80/120ms standard | 从当前值反向，不排队 | 仅边界/底色即时变化 | 可选 light | 只改暖红明度/边界，无白闪 |
| Selection | 选择变化；旧指示器位置 → 新位置；日间Search小星标按§5A.2采用稿，未覆盖主题保留原scale/rotation/opacity表达 | fill/border 160ms；日间filter按采用源文件；其余star select 170ms、deselect 140ms | 新选择从 live presentation 接管，不排队 | ≤80ms fill/opacity + 内侧 focus 边界 | 可选 selection | 同几何暖红 ornament，不保留黄色 |
| Content/Search reveal | retained disclosure或Search child；普通content live measured height/clip/opacity→target；Search field固定、下方clip height0/`translateY(-12px)`/opacity0→full | ordinary 160ms；Search 180ms / exit160ms | 使用当前height/opacity反转，不remount/reset scroll，field geometry不动 | 内容即时显隐，保留状态/焦点 | 无 | 不经过白/灰中间token，不抖动/闪白 |
| Panel extent/hide | marker/result/handle drag/edge-back/map tap；one retained document viewport→valid extent；media先拉出，近top后Search/Location/Layer淡出 | direct manipulation + bounded spring≤280ms；non-marker hide 220ms exit；section align 200ms | pointer down/tap不切档；只由实际可见的全宽紧凑header band越过threshold后拖动；新拖动接管live value | 跟手；release即时snap；section直接对齐 | 到达端点可选 light | 黑底暖红边界先于内容；无白闪 |
| Layer sheet | `bottomPresentation`在spot-panel/layer-sheet/none间从live值retarget | enter 220ms standard；exit 180ms | 单一枚举禁止双active；marker intent直接layer→new spot medium，不先恢复旧panel | 即时互斥切换并恢复 | 无 | 只用closed暖红surface/border |
| Curved time scrub | arrowless Taro horizontal ScrollView track 在fixed center下移动；ticks按距中心实时scale/opacity/arc | 每帧直接跟手，释放后≤120ms snap/settle | 新手势立即接管live offset；不节流造成滞后 | 保持native direct scroll、即时snap，无额外spring/inertia | 跨关键事件可选 tick | 暖红 tick/axis；无其他模式中间帧 |
| Favorite ritual | 用户点按：圆角主星恰好一整圈、微缩、填充，两颗副流星从左上向右下冲入并渐显，不等待夜空；主星黄绿火流星拖尾为视觉中心 | 单次可逆，一整圈；精确时长与位移见资源样例 | 再次点按接管live值回退，副星/拖尾渐隐；不排队，失败回权威状态 | 无旋转/位移；保留轮廓/填充与程序化选中状态 | 可选 success | 同几何全暖红；不循环 |
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

- 通用渐变、大面积光晕、玻璃拟态、环境粒子、循环流星、装饰 3D 天体。明确例外是 `spot-favorite-action` 的单次可逆主星与两颗副星黄绿拖尾，以及 `云观星` 与已选 `想去` 按钮内部稀疏、缓慢明暗变化的星点（最新用户明确例外）；不得扩散到页面背景或其他成功状态，观测模式仍只用暖红。
- 卡片套卡片、每指标一张卡、把所有选项做成 pill。
- 以行政仪表盘密度代替移动决策流。
- 用 generic linear slider或带框卡片代替Curved Time Ruler；重造scroll physics或引入flat React Native ruler作为第二基础；保留Finder Sheet、独立Spot Detail/Spot Night、quick/more split或稀疏tabs；用toast/snackbar/modal为每个普通点击重复反馈。
- Panel覆盖primary nav、按extent维护不同内容树、whole-panel拖动、tap handle切档、灰色/过高的handle空白带、把handle固定在已滚动内容上方、pressed handle位移、rail占content width/有内外gap或深蓝阴影、过大的底部action bar、单阶段提前隐藏Map chrome、右侧展开layer rail、Search text/field跳变、非marker tap瞬间隐藏。
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
- 当前视觉范围覆盖五个Mini Program Product Surfaces，以及stationary Map/Search field、compact suggestions/单行横滑筛选与二级弹层/stable disclosure/leading-readable image results、one-enum互斥image-backed layer selector、marker-to-medium one-document panel、presence-driven media/compact handle band、flush centered section rail/short action rail、objective basic-plus-astronomy facts、raised draggable arrowless Taro-ScrollView-backed Curved Time Ruler、one animated three-state display-mode track、headerless Full-Sky、colored-icon existing-duty My hub、compact cell-based Contribution intake、reuse-first library/component/adaptation binding和bounded Favorite ritual；provider/basemap/tile/native-map appearance仍不属于本系统。Surface用于界定页面职责；当前实施范围由用户需求及所属Screen Contract确定。
- 产品路线、Surface/Control ownership、interaction state、评分算法、数据来源、权限、安全、原生 App 与 owner-operations 权威均不因本视觉系统改变。

### 12. 实现与验证

- 页面资源的采用与严格还原遵循 [Context 中的小程序页面资源规则](project_context/context-maintenance.md#mini-program-page-design-resources)。开发必须读取并查看所属 Screen Contract 指向的已采用稿，按当前需求验证真实运行结果；页面具体布局由采用稿约束，共享视觉规则和精确 token 仍由本文件拥有，采用时同步消除差异。
- 当前令牌由 tools/miniapp/generate-design-tokens.mjs 生成到生产 SCSS/TypeScript；修改本文件中的令牌后更新生成文件，不维护浏览器原型镜像。
- 通过 design:system:verify 检查令牌一致性与对比度，通过 test:miniapp:ui-contracts 检查生产职责约束；图标和语义资产继续使用各自生成检查。
- 实际 WEAPP 验证标准字号的字体层级、信息密度、吸顶章节Tab可辨识度、44px 点击区、各面板档位及滚动章节同步、媒体和地图状态连续性、三模式、输入法和键盘、失败恢复及真实数据边界。真机和环境限制如实记录。
- 规则和自动检查不能证明页面视觉完成。仅在持久设计决策改变时更新其 owner，不为每次页面修改同步原型、快照、handoff 或历史 hash。

### 已采用组件的补充实现边界

观星点组件三档资源和搜索页日间资源已采用，见§5A.0–5A.2。图片/拖区、共享查看器、章节/日期、配色与想去动效，以及Search筛选提交/取消与整卡选点的完整语义由相应Screen Contract维护。既有生产tokens与组件尚未迁移，开发必须读取采用包并按真实WEAPP验证，不能把历史候选、Stitch原稿或网页检查当作生产完成证据。


### 小程序新增观星点采用覆盖
Map ADOPTED/add-spot 为新地点表单的日间构图依据，覆盖旧 contribution 全页构图/observed time 顺序；反馈页复用同一纵向表单语言，全量回填、变更对比及冻结语义以 Shared State 新合同为准。加号与定位、图层均36px视觉/至少44px命中；active亮边与柔雾呼吸。新增弹层无手柄、不可拖动，顶边锚定原加号位置，上下滑入退出；搜索与工具同步淡出。表单用一个滚动文档和章节Tab，浅灰分组、左对齐横向单选，照片入口和固定高度说明框无触摸高亮。保存状态位于大标题右侧，不增加底栏高度。轻量提交等待默认按钮内spinner，禁止重复提交且保留内容；不能伪造进度或成功回执。必填浅红星号按产品字段语义标记，不强制20字说明或到访时间。

新增草稿/审核地图状态：灰色草稿点展示本人的草稿信息组件，并经编辑入口回填表单；加号总是新空表单；审核中点沿用星形正式点针，右上角14px级钟表徽标（非成功勾选、非加载转圈），文字替代语义含审核中。信息组件继续使用同一正式组件几何，标题旁小型浅暖色“审核中”tag；审核中隐藏想去/分享，仅保留云观星并填充可用动作行。正式点恢复原三动作。

反馈编辑视觉修订：入口“我要反馈 ↗”纯文字；变化项浅黄底，文档末端旧文字红色删除线 → 新文字，旧照片灰度/微倾斜/禁用符号 → 新照片。没有反馈类型、到访时间、存草稿。提交后冻结，标题审核中tag，无提交按钮。正式信息组件本人“我的反馈”tag及右上时钟图标只表达私人待审状态，不覆盖正式资料。新增草稿只手动请求服务保存，多份草稿不在点击加号时恢复；不再自动保存或本地权威。

### 2026-09-09 局部审查偏好校准

Search 筛选可见底板、图标与留白略收紧，保持至少44px互不重叠的独立命中区，不缩放整页。My 进行中使用低饱和浅灰绿底、清晰深灰绿小字和舒展内边距，与时间形成轻层级；这不是全局绿色主题。省略入口用等大几何圆点，在完整点击区内双向居中，不依赖字体基线。计划清单用端正方框与居中等粗圆端SVG勾，外框不旋转、不被长文字挤压；长行按首行对齐，点击范围仍覆盖完整行。具体候选值与来源保留在各页候选包，待用户审查，未自动采用。


2026-09-09 user feedback calibration (Mini Program candidates, adoption remains separate): driving range uses a light two-row control with enable/name and time-distance choice above a natural numeric reading, avoiding the enclosing blue card and large boxed input. My ongoing status uses a low-saturation mist-green badge with slightly increased inner space; badge and end-time text share their visual center. Sky object information uses a centered dark liquid-glass modal explicitly related to My’s plan-card material: restrained reflected edges, high transmission, moderate background blur that softens fine detail while transmitting colors and broad shapes and backdrop edge refraction/reflection; smaller coherent type, contained scrolling and a reachable close action. It inherits observation-mode colors and has an opaque fallback. Scope is these controls, not a new global style.

2026-09-09 control proportion refinement: driving input is a subordinate parameter, not a highlighted metric; its visible face, numeral size, unit spacing and radius align with adjacent filters. Preserve independent hit targets instead of enlarging the colored input face. Sky modal candidate uses locally supplied Source Han Sans SC Regular; 14px title/parameter, 11px body are current celestial-modal review values, not an automatic global type-system change. Dark liquid glass is explicitly authorized here; it does not spread to unrelated pages.

2026-09-09 material correction: My plan card and celestial information use the same shared liquid-glass resource. Preserve the actual backdrop through a low-alpha center; use restrained edge refraction and reflection instead of a heavy frosted or opaque panel. Light/dark are theme parameters. Celestial modal is compact (current candidate max-width294px), and its typography is subordinate to the sky; font readability and increased-text settings remain verification requirements. Driving range is an ordinary small bordered numeric input, without a separate decorative base or oversized metric. Exact current candidate geometry lives in its resource.

2026-09-09 glass refinement: within the My/Sky shared-material scope, translucency is only one attribute. Seek smooth curved-edge lensing, directional fine highlights and restrained depth on both bright and dark real backgrounds; keep foreground type clear. A uniform bright outline or stronger blur alone does not meet this direction. Exact experimental values remain in the candidate; no Apple parity or target-device acceptance is implied.
