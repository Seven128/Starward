---
name: Starward Stargazing Mini-Program
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#43474c'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#74777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#4e6073'
  primary: '#162839'
  on-primary: '#ffffff'
  primary-container: '#2c3e50'
  on-primary-container: '#96a9be'
  inverse-primary: '#b5c8df'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#002e1f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004631'
  on-tertiary-container: '#5bb893'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4fb'
  primary-fixed-dim: '#b5c8df'
  on-primary-fixed: '#091d2e'
  on-primary-fixed-variant: '#36485b'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#97f5cc'
  tertiary-fixed-dim: '#7bd8b1'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: '0'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  viewport-width: 390px
  safe-area-top: 44px
  wechat-capsule-height: 32px
  wechat-capsule-padding-right: 7px
  page-gutter: 16px
  card-padding: 14px
  gap-xs: 4px
  gap-sm: 8px
  gap-md: 12px
  gap-lg: 16px
  gap-xl: 24px
---

## Brand & Style

This design system establishes a quiet, scientific, yet inviting aesthetic tailored for observational astronomy within WeChat's ecosystem. Moving away from gimmicky neon galaxies or hyper-dark themes that compromise daytime outdoor legibility, it adopts a precise editorial and utilitarian personality: structured, contemplative, and optically calibrated.

The visual direction combines crisp Japanese-inspired editorial density with modern utilitarian minimalism:
- **Tone & Demeanor**: Deep nocturnal blue-slate grounds the interface with gravitas and scientific rigor, while amber starlight accents evoke the warmth of red flashlights and observational field lamps.
- **Emotional Response**: Clarity, quiet wonder, precision, and reliable utility in both outdoor field conditions and daytime planning sessions.
- **Surface Language**: Pristine chalk backgrounds paired with muted mist-grey structural surfaces, razor-thin hairlines, and featherweight elevation. No chunky drop shadows, garish alerts, or neon clutter.

## Colors

The palette is engineered for meticulous information density and readability under variable outdoor ambient light.

### Primary & Brand Core
- **Obsidian Slate (Primary Action & Brand)**: `#2C3E50` (Active state `#1E293B`, Soft tint `#334155`). Used for primary interactive actions, high-priority navigation states, and deep anchor elements.
- **Warm Amber / Starlight (Accent & Status)**: `#D97706` (Vibrant `#F59E0B`, Soft glow surface `#FEF3C7`). Applied sparingly to highlight critical astronomical events, celestial markers, review status, and edited data highlights.

### Neutrals & Structural Hierarchy
- **Canvas Base**: `#FFFFFF` for absolute clarity on mobile displays.
- **Grouped Containers & Recessed Wells**: `#F8FAFC` (Canvas secondary) and `#F1F5F9` (Nested panel/badge fill).
- **Subtle Borders & Hairlines**: `#E2E8F0` across containers, dividers, and card outlines.
- **Primary Typography**: `#0F172A` for headlines and key parameters; `#1E293B` for core readable body.
- **Secondary Typography**: `#64748B` for meta items, labels, descriptions, and equipment specs.
- **Tertiary & Micro Typography**: `#94A3B8` for timestamps, placeholders, coordinates, and unselected tab items.

### Semantic & Observation Workflow States
- **Draft / Inactive**: Background `#F1F5F9`, Text `#475569`, Border `#E2E8F0`.
- **In Review / Pending**: Background `#FEF3C7`, Text `#B45309`, Border `#FDE68A` (paired with an amber dot or sandglass glyph).
- **Approved / Published**: Background `#ECFDF5`, Text `#047857`, Border `#A7F3D0`.
- **Rejected / Alert**: Background `#FEF2F2`, Text `#B91C1C`, Border `#FECACA`.
- **Diff / Edited Highlight**: Background `#FFFBEB`, Border `#FDE68A`, Original value strike-through `#DC2626`.

## Typography

Typography prioritizes fast numerical scanning and high-density legibility within compact mobile viewports.

- **Primary Typeface**: `Plus Jakarta Sans` provides a clean, humanist geometric foundation that harmonizes with WeChat's native PingFang SC system font while maintaining distinct structural legibility in numerical charts, titles, and prose.
- **Data & Metric Display**: `JetBrains Mono` handles celestial coordinates (RA/Dec, Bortle scales, ISO settings, lunar phases, and observation logs) to prevent visual misalignment in multi-column tables.
- **Hierarchy Rules**:
  - Keep titles compact and dense (`headline-md` at 20px) rather than bloated hero type, reserving screen real estate for observational telemetry and data cards.
  - Apply `font-feature-settings: 'tnum' 1` globally across all telemetry readouts, timers, and celestial coordinates.

## Layout & Spacing

Designed primarily for the iPhone standard 390px viewport width used in WeChat Mini-Program production:

### Navigation & Top App Bar
- Reserved top safe margin: `44px` status bar clearance plus dynamic binding to `wx.getMenuButtonBoundingClientRect()`.
- The native WeChat top-right capsule requires a persistent `100px` horizontal clearance zone on the right edge of custom navigation headers. Custom header titles are left-aligned beside back targets or centrally balanced within the remaining span.

### Grid & Component Rhythm
- **Page Gutters**: Strict `16px` lateral margins across all scrollable lists and article containers.
- **Vertical Rhythm**:
  - `8px` between related elements inside cards.
  - `12px` between disparate fields within the same section.
  - `16px` between distinct standalone cards and modular groups.
  - `24px` section dividers with subtle `1px solid #E2E8F0` hairline rules.
- **Responsive Handling**: When rendering across larger tablet or desktop WeChat views, enforce a strict `max-width: 480px` centered column with a `#F1F5F9` outer ambient envelope.

## Elevation & Depth

This design system entirely avoids coarse, heavy drop shadows and high-contrast dark fills. Depth is constructed through precision micro-elevation and tonal layering:

1. **Base Tier (Ground)**: Pure white `#FFFFFF` page background or soft group canvas `#F8FAFC`.
2. **Surface Tier 1 (Card & Module)**: `#FFFFFF` resting on `#F8FAFC`, delimited by a single structural hairline `1px solid #E2E8F0` and micro-elevation: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
3. **Surface Tier 2 (Floating Action & Modals)**: Bottom sheets, tooltips, and floating observation logs use `box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)` bordered with `1px solid #E2E8F0`.
4. **Recessed Wells**: Search inputs, parameter logs, and nested equipment summaries employ `background: #F1F5F9` with no drop shadow, framed by an inner soft boundary to signal interactive readiness.

## Shapes

The geometric form factor balances technical instrumentation with organic tactility.
- **Card Containers**: Fixed `14px` corner radii, scaling to `16px` for primary summary tiles and hero imagery wrappers.
- **Status Tags & Capsules**: Fully pill-shaped (`9999px` border-radius) for quick glanceability and alignment with WeChat's own hardware capsule language.
- **Input Fields & Form Elements**: `10px` corner radii to distinguish actionable controls from parent cards.
- **Buttons**: `10px` for standard button bars, `9999px` for auxiliary floating controls and chip toggles.

## Components

### Buttons
- **Primary**: Background `#2C3E50`, active state `#1E293B`, text `#FFFFFF`, radius `10px`, height `44px`, typography `title-md`. Subtle tap scale feedback (`transform: scale(0.98)`).
- **Accent / Special Action**: Background `#D97706`, active `#B45309`, text `#FFFFFF`, used strictly for key stargazing alerts (e.g., "Join Tonight's Watch").
- **Secondary / Ghost**: Background `#F1F5F9`, border `1px solid #E2E8F0`, text `#1E293B`, active `#E2E8F0`.

### Status Badges & Pill Chips
- **Geometry**: Compact height `24px`, padding `2px 8px`, font size `11px` (`label-sm`), radius `9999px`.
- **Draft**: Background `#F1F5F9`, text `#475569`, border `1px solid #E2E8F0`.
- **Under Review**: Background `#FEF3C7`, text `#B45309`, border `1px solid #FDE68A`. Preceded by a `5px` circular pulsing dot in `#D97706` or micro hourglass icon.
- **Approved / Published**: Background `#ECFDF5`, text `#047857`, border `1px solid #A7F3D0`.
- **Rejected**: Background `#FEF2F2`, text `#B91C1C`, border `1px solid #FECACA`.

### Cards & Container Panels
- Surface `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 1px 3px rgba(15,23,42,0.04)`.
- Internal padding `14px` to `16px`. Header area includes a distinct title `title-md` (`#0F172A`) paired with a right-aligned pill chip or mono timestamp.

### Input Fields & Controls
- Height `44px`, background `#F8FAFC`, border `1px solid #E2E8F0`, focus state border `#2C3E50` with no loud glow.
- Checkboxes and Radios: Sized `20px x 20px`, neutral border `#CBD5E1`, checked state `#2C3E50` with an amber `#D97706` inner checkmark.

### Stargazing-Specific Components
- **Telemetry Parameter Bar**: Recessed well (`#F8FAFC`, border `1px solid #E2E8F0`) displaying Bortle Class, Cloud Coverage %, Seeing Index, and Lunar Phase in clean 3-to-4 column splits using `data-mono`.
- **Diff / Modification Row**: Used in edit logs and review workflows. Background `#FFFBEB`, border `1px solid #FDE68A`, radius `8px`, inner spacing `8px 12px`. Displays original value in strike-through text (`color: #DC2626; text-decoration: line-through`) paired with the new proposed value in `#1E293B` and an amber arrow indicator.
- **Target Observation List Tile**: Compact list row (`48px` minimum height), `#0F172A` target name, `#64748B` magnitude / altitude descriptor, and quick-toggle bookmark pin.