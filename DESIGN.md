---
version: "1.0"
name: "今晚去观星"
description: "A mobile-first stargazing trip decision system that turns weather, astronomy, place, route, and preparation data into one actionable journey."
colors:
  canvas: "#FFFFFF"
  surface: "#F7F8FA"
  surface-muted: "#EEF2F7"
  text: "#111111"
  text-muted: "#6B7280"
  border: "#D9DEE7"
  primary: "#1677FF"
  primary-hover: "#4096FF"
  primary-active: "#0958D9"
  on-primary: "#FFFFFF"
  success: "#52C41A"
  warning: "#FAAD14"
  error: "#FF4D4F"
  night-canvas: "#1D1D1D"
  night-surface: "#141414"
  night-surface-elevated: "#272727"
  night-text: "#DCDCDC"
  night-primary: "#3983DC"
typography:
  display:
    fontFamily: "Inter"
    fontSize: "2.375rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Inter"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.57
  label:
    fontFamily: "Inter"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
  data:
    fontFamily: "SFMono-Regular"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.57
rounded:
  sm: 5px
  md: 8px
  lg: 16px
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
- The experience should feel credible, calm, precise, exploratory, outdoors-oriented, and intelligent. Technology is expressed through clear information organization and continuous time/space graphics, not science-fiction decoration.
- Information follows progressive disclosure: first the conclusion, then an actionable plan, then the professional evidence.
- This file is the authored visual authority. Generated CSS, JSON, HTML kits, and previews under docs/design-system/ are downstream reference artifacts.
- This document is complete and normative on its own. `.codex/skills/uiux_design/SKILL.md` is the React Native implementation companion for applying these rules; it must read and obey this file and the Source Plan, and cannot redefine or override either one. This pointer is for discoverability, not a reciprocal authority dependency.

## Colors

- Planning mode uses 月白 canvas, 薄云 surfaces, 夜墨 text, 晨雾线 borders, and 航迹蓝 for the primary action, route, selected map node, and best observing window.
- 航迹蓝 is a high-signal color. Prefer one primary action and one key selected state per screen; do not use it as a large decorative background.
- Text-bearing primary controls use the darker primary-active token when normal-size white labels need WCAG AA contrast; the brighter primary remains available for routes, nodes, and non-text emphasis.
- Semantic green, yellow, and red communicate data meaning or operational state. They do not replace the brand roles.
- Night observing mode keeps the same information architecture while reducing luminance and using multiple dark surfaces with restrained cool-blue emphasis. Avoid a featureless pure-black product shell and broad glow.
- Red-light field mode preserves structure and navigation while switching to a very-low-luminance warm-red hierarchy. It must not introduce blue highlights, broad white surfaces, flashing, or ambient decoration.
- Text and controls must retain readable contrast in every mode; selection cannot rely on color alone.

## Typography

- Display and body use Inter at weights 400 and 700, falling back to system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, and sans-serif.
- Coordinates, time, azimuth, and dense professional data may use SFMono-Regular with Consolas, Liberation Mono, Menlo, Courier, and monospace fallbacks.
- Titles, place names, conclusions, and key numbers use strong weight. Labels, units, and explanations remain secondary but legible.
- Dense forecasts gain scanability from column alignment, row labels, and hierarchy; do not shrink text until it becomes difficult to read.
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
- Map markers, floating controls, and Bottom Sheets may use restrained elevation; avoid broad blurry shadows and glassmorphism.
- Image overlays sit in one safe corner on a solid surface. If no safe corner exists, place the information below the image.
- In night and red-light modes, depth comes from controlled luminance steps, not glow.

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
- A selected map node, place card, route segment, and detail screen must refer to the same place state. Route changes update distance, drive time, arrival, and risk together.
- Inputs, filters, and selectors provide loading, empty, no-results, validation, disabled, saving, success, and error feedback where applicable.
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
- Do use real place imagery, maps, sky data, and observing equipment when they help a decision.
- Do preserve the same task order across planning, night, and red-light modes.
- Do keep professional information available without allowing it to dominate the first screen.
- Do expose uncertainty, risk, and alternate options in user language.
- Don't copy a source application's logo, proprietary imagery, brand color, or exact screen layout.
- Don't use generic purple gradients, cyberpunk neon, meaningless particles, continuous flashing, large glass panels, or decorative glow.
- Don't use stacked nested cards, a first screen full of professional tables, or unsupported claims such as 完美观星, 绝对晴朗, or 保证可见.
- Don't invent a logo, illustration, or image that is not grounded in project evidence.
- Don't lock input until an animation finishes, animate from an obsolete target, use a gesture-only destructive action without recovery, or let motion mask stale/unknown data.
