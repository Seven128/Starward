---
name: Luminar Minimalist Stargazing
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001a42'
  on-tertiary-container: '#3980f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  mono-data-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  mono-data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  mono-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  viewport-width: 390px
  edge-margin: 16px
  gutter-sm: 8px
  gutter-md: 12px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 12px
  stack-lg: 16px
  stack-xl: 24px
  stack-2xl: 32px
  card-pad-sm: 12px
  card-pad-md: 16px
---

## Brand & Style

This design system establishes a restrained, scientific, and contemplative visual language engineered specifically for mobile astronomical field observation and celestial scheduling. Moving deliberately away from cliché neon galaxies and pitch-black skeuomorphism, the aesthetic embraces an editorial daylight discipline: clean paper-toned backgrounds, precise tabular data structures, razor-sharp architectural borders, and deliberate micro-accents of warm amber light.

The emotional signature is quiet certainty, optical precision, and natural breathability. Interfaces balance high-density observational telemetry (Bortle scale indices, moon phase percentages, cloud-cover percentages, and transit times) with calm, intentional negative space. Tactility comes through microscopic 1px tonal borders, refined hairline dividers, and deliberate type rhythm rather than heavy drop shadows or glassmorphic blurs.

## Colors

The palette is constructed around precise optical layers that maintain readability in ambient outdoor daylight while preventing glare before night-adaptation kicks in:

- **Canvas & Surfaces:**
  - Base Background: `#F8F9FA` creates an unbleached, paper-like surface that avoids stark clinical white.
  - Card & Container Fill: Pure white `#FFFFFF` provides structured separation without physical projection.
  - Sub-surfaces & Hover fills: `#F3F5F7` and `#EDF1F4` form muted backplates for badge groups, telemetry strips, and recessed sensor modules.
- **Typography & Hierarchies:**
  - Primary Slate-Ink: `#1A202C` delivers authoritative, crisp rendering on small mobile screens.
  - Secondary Cold Slate: `#64748B` handles descriptions, units of measurement, and observational headers with reduced optical weight.
  - Tertiary / Muted Ghost: `#94A3B8` reserves for inactive states, coordinate axes, and non-critical calendar grids.
- **Astronomical Highlights (Amber & Solar Gold):**
  - High-impact indicators (Golden Hour, Moon Transit, ISS Passes): `#D97706` and `#B45309`.
  - Amber chip backplates & status highlights: `#FEF3C7` (base) and `#FDE68A` (border accent).
- **Functional Interactive & Outlines:**
  - Primary Actions & Capsule lines: Deep Slate `#0F172A`.
  - Real-time Satellite & Target Trajectory Indicator: Instrument Blue `#3B82F6`.
  - Micro-dividers & Card Outlines: Subtle hairlines `#E2E8F0` and `#EDF2F7`.

## Typography

Typography prioritizes structural clarity and instantaneous scanning over decorative flair. The type stack coordinates **Inter** for structural headers, contextual text, and system controls with **JetBrains Mono** for numerical coordinate telemetry, timestamps, optical magnitudes, and azimuth readouts. In Mini Program runtimes, fallback font stacks ensure graceful platform rendering: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`.

Numbers and units are strictly monospaced or tabular-lined (`tnum`) to ensure crosshair-like vertical alignment across timeline grids, Bortle indexes, and lunar phase percentages. Micro-labels employ tight uppercase or small-caps styling with generous tracking (`+0.04em` to `+0.06em`) to anchor scientific data tables.

## Layout & Spacing

The layout is optimized for the standard 390px WeChat Mini Program viewport, incorporating strict WeChat Capsule navigation clearance (`top: env(safe-area-inset-top)` + 44px capsule block).

- **Grid & Margins:**
  - Global horizontal screen inset: `16px`. Content cards stretch across the remaining 358px.
  - Multi-metric grids use a symmetrical 2-column or 3-column split with an `8px` or `12px` inner gutter.
- **Rhythm & Stacking:**
  - Data point clusters stay compact: `4px` gap between label and value.
  - Semantic sections flow vertically with `24px` margins to give open sky room between telemetry modules.
  - Internal card padding is locked at `16px` for standard inspection cards and `12px` for nested condition blocks.

## Elevation & Depth

This system intentionally rejects heavy raster drop shadows, diffuse glows, and pseudo-3D skeuomorphism. Spatial separation is managed via calibrated 2D plane layering and crisp micro-outlines:

1. **Level 0 (Canvas):** `#F8F9FA` matte base canvas.
2. **Level 1 (Card Plate):** Pure `#FFFFFF` surface bordered by a clean 1px hairline (`border: 1px solid #E2E8F0`). Zero shadow or an imperceptible ambient bleed (`box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03)`).
3. **Level 2 (Active Focus / Floating Capsule):** Pure `#FFFFFF` backed with a subtle boundary (`border: 1px solid #CBD5E1`) and a directional micro-offset (`box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.06)`).
4. **Recessed Wells (Telemetry Wells):** Built using `#F3F5F7` or `#EDF1F4` without inner shadows, delineated strictly by contrasting background tones.

## Shapes

The geometric framework follows an architectural soft-radius logic (Level 1), balancing clean modern precision with pocketable utility:

- Primary structural cards and dashboard containers use `8px` (`0.5rem`) corners.
- Nested telemetry badges, data inputs, and segment toggles use `6px` (`0.375rem`) corners.
- Small indicator pips, focal tags, and pill actions (e.g., Mini Program WeChat capsule mirrors and condition chips) use full pills (`9999px`) or `4px` precision fillets.

## Components

### 1. Buttons & Primary Triggers
- **Primary CTA:** Deep slate background (`#0F172A`), crisp white text (`#FFFFFF`), `8px` corner radius, `44px` touch-target height. In active press states, shifts to `#1E293B` with a gentle 0.98 scale transition.
- **Secondary Ghost Button:** `#FFFFFF` fill with `1px solid #E2E8F0`, slate-ink text (`#1A202C`). Pressed: `#F8F9FA`.
- **Amber Action (Observation Window Alert):** Subtle amber background (`#FEF3C7`), deep amber label (`#B45309`), bordered in `#FDE68A`.

### 2. Observation Telemetry Cards
- Flat `#FFFFFF` container with `1px solid #E2E8F0` and `8px` border radius.
- Includes a dedicated header strip: Section title in `Inter 13px/600 (#1A202C)` with status chip aligned flush right.
- Metrics arranged in horizontal data cells separated by vertical hairline borders (`#EDF2F7`).
- Values set in `JetBrains Mono` with unit indicators in cold slate (`#64748B`).

### 3. Astro Chips & Status Pills
- **Active Stargazing Window Chip:** `#FEF3C7` background, `#B45309` text, `4px` or pill radius, accompanied by a 6px circular amber pulse pip (`#D97706`).
- **Cold Metric Chip (Seeing Index / Bortle Class):** `#F1F5F9` background, `#475569` text, `1px solid #E2E8F0`.
- **Target Tracking Active:** `#EFF6FF` background, `#2563EB` text, `1px solid #BFDBFE`.

### 4. Input Fields & Search Bars
- Background `#FFFFFF` with `1px solid #E2E8F0`. Focused state switches border to `#0F172A` with no glow ring.
- Placeholder text rendered in `#94A3B8`.
- Height locked at `40px` with integrated right-aligned action buttons (e.g., GPS locate icon in cold slate).

### 5. Lists & Hourly Timeline Strips
- Horizontal scroll rail featuring segmented hourly cards (`64px` width, `80px` height).
- Clean vertical dividing rules (`#EDF2F7`) between steps.
- Clear distinction between past hours (muted `#94A3B8`), current target hour (encased in `#0F172A` hairline border with amber dot), and dawn transits.

### 6. Micro Elements & Dividers
- Hairline dividers are strictly `1px` high with no blur, tinted `#E2E8F0`.
- In-line dots between items (e.g., "Bortle 3 • 22.4 MPSAS • 18°C") use `#CBD5E1`.