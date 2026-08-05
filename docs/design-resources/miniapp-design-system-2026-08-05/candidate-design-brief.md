# 《今晚去观星》微信小程序设计系统候选 Brief

Status: delegated candidate brief; not selected and not Design Authority.

Candidate version: `0.2`.

Source index: `source-index.md`

## 1. Product feeling

The miniapp should feel calm, trustworthy, compact, and gently tactile. It should help a user read an outdoor/astronomy decision quickly without becoming a generic weather dashboard or a toy-like 3D interface.

The visual concept is **“soft instruments under three skies”**:

- **Instrument clarity** for maps, conditions, times, routes, states, and actions.
- **Soft collectible objects** for selected astronomy/outdoor subjects such as telescopes, binoculars, cameras, backpacks, tents, stars, and a neutral avatar.
- **Three skies**—day, night, and observation red—sharing one semantic component grammar.

The 3D tier provides character. The functional tier provides speed and precision. Data, states, and navigation always stay in the functional tier.

## 2. Foundations

### Units and layout rhythm

- Author Mini Program geometry in `rpx`; use a base step of `8rpx`.
- Primary reference canvas: `750rpx` wide. Layout must reflow for narrower and wider supported phones and must use runtime safe-area/menu-capsule measurements rather than hard-coded status-bar offsets.
- Page horizontal inset: `32rpx`; compact inset: `24rpx` only where the content owner requires extra density.
- Section gap: `40rpx`; card/grid gap: `24rpx`; card padding: `28rpx`; dense-row padding: `20rpx 24rpx`.
- Minimum interactive hit region: `88rpx × 88rpx`, even when the visible icon is smaller.
- Content must reflow without clipping when system text is enlarged. Critical labels, values, units, actions, and mode warnings cannot be fixed to a single-line height.

### Spacing tokens

| Token | Value | Use |
| --- | ---: | --- |
| `space-0` | `0` | Reset only |
| `space-1` | `8rpx` | Icon/internal micro-gap |
| `space-2` | `16rpx` | Related label/value gap |
| `space-3` | `24rpx` | Grid gap and compact padding |
| `space-4` | `32rpx` | Page inset and standard group padding |
| `space-5` | `40rpx` | Section separation |
| `space-6` | `48rpx` | Large internal separation |
| `space-8` | `64rpx` | Major content break |

### Radius tokens

| Token | Value | Use |
| --- | ---: | --- |
| `radius-xs` | `12rpx` | Tags and small indicators |
| `radius-sm` | `20rpx` | Inputs, buttons, compact panels |
| `radius-md` | `28rpx` | Standard cards |
| `radius-lg` | `40rpx` | Hero cards and large sheets |
| `radius-pill` | `999rpx` | Short filters and segmented choices only |

### Size, border, and state tokens

| Token | Value | Use |
| --- | ---: | --- |
| `size-icon-glyph` | `40rpx` | Tier-A visible glyph |
| `size-icon-box` | `48rpx` | Tier-A optical grid |
| `size-hit-min` | `88rpx` | Minimum interactive region |
| `size-control` | `88rpx` | Standard button and compact field |
| `size-control-lg` | `96rpx` | Primary page action and full field |
| `size-nav-item` | `112rpx` | Bottom-navigation content height before safe area |
| `border-hairline` | `1rpx` | Decorative/group boundary |
| `border-selected` | `2rpx` | Selected/focused structural boundary |
| `focus-ring` | `4rpx` | Focus-visible ring with `4rpx` offset |

- A compact visible chip may be `64rpx` high only when its owning wrapper still supplies an `88rpx` hit region and adjacent hit regions remain separated.
- Disabled controls keep full layout and readable text: use `surface-subtle`, `text-tertiary`, a visible boundary, and no elevation. Do not make essential disabled labels unreadable through global opacity.
- Pressed overlays use the local `primary` at `8%` in day, `12%` in night, and `16%` in observation mode. Loading preserves the control width and label position.

### Responsive layout contract

- Default content is one readable column. A two-column feature grid requires at least `304rpx` per tile after gaps and collapses to one column when text growth or available width would clip content.
- Center expanded phone/tablet content inside a maximum readable width of `960rpx`; maps and owned data matrices may use the full safe width.
- Horizontal page scrolling is forbidden. Only an explicitly owned time-series matrix may scroll horizontally, with its row labels and units remaining identifiable.
- Use flow layout and runtime safe-area/menu-capsule measurements. Absolute positioning is limited to bounded overlays whose anchor and collision behavior are defined.

### Elevation tokens

- Day standard card: `0 12rpx 36rpx rgba(25, 61, 102, 0.10), 0 2rpx 8rpx rgba(25, 61, 102, 0.06)` plus a `1rpx` cool border.
- Day floating control: `0 8rpx 24rpx rgba(21, 55, 94, 0.14)`.
- Night uses surface luminance and a border before shadow; any shadow remains compact and dark, never a blue glow.
- Observation mode uses no ambient shadow. Depth comes from black/dark-red surface steps and a warm-red border.
- Do not stack more than one elevated card layer inside another card. Use whitespace, headings, dividers, and grouped rows first.

## 3. Color modes

All three modes expose the same semantic roles. Mode switching changes values and asset variants, not role names.

### Day

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

### Night

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

### Observation red

This is a closed low-luminance palette for all controllable UI, including loading, focus, error, pressed, map overlays, and authored image/icon variants.

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

Observation-mode rules:

- Do not render blue, green, cyan, violet, yellow, neutral gray, or white on controllable surfaces.
- Semantic role names stay identical across all three modes. In observation mode, the `accent-*`, `success`, `warning`, and `danger` names are compatibility roles whose values remain warm red; meaning must come from icon, label, shape, and position rather than hue.
- Do not apply a blanket filter to a day/night screenshot. Supply authored red/black vector, map, chart, photo, and 3D-asset variants.
- Status meaning uses label, icon, shape, border, and position as well as intensity. Success and error cannot be distinguished only by two reds.
- Set the correct background before the first visible frame and preload required mode assets. A controllable transition cannot flash the day canvas.
- A system/vendor surface that cannot follow the palette needs a visible advance warning and a safe cancel/return path; the design system does not claim control over it.

### Color-use contract

- `text-*` roles own readable text. Accent and status roles may color an icon, chart mark, short emphasis, or boundary, but body copy does not switch to an accent color.
- Status text stays `text-primary` or `text-secondary`; `success`, `warning`, and `danger` reinforce it with an icon, label, shape, and position. This rule also preserves status meaning in the red-only observation palette.
- `border` is a grouping aid, not the only boundary for an essential control. Focus uses the mode's `focus` role and a non-color structural change.
- Charts may use `accent-cyan` + solid/circle, `accent-violet` + dashed/diamond, and `accent-warm` + dotted/triangle. Legends repeat the label, mark shape, and line style. Observation mode keeps those semantic names but renders their red values and the same non-color encodings.
- Photographs and maps are content, not palette tokens. Day/night media may retain informative color; observation media needs a separately authored red/black treatment or a clearly labeled unavailable state. A global CSS/canvas color filter is forbidden.

## 4. Typography

Use a Mini Program-native, license-safe system stack: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`. Do not depend on a bundled display font for core readability.

| Role | Size / line | Weight | Use |
| --- | --- | ---: | --- |
| `display` | `48rpx / 64rpx` | 700 | One short recommendation or hero value |
| `page-title` | `36rpx / 48rpx` | 700 | Page title |
| `section-title` | `30rpx / 42rpx` | 600 | Section heading |
| `body` | `28rpx / 42rpx` | 400 | Primary reading text |
| `label` | `24rpx / 34rpx` | 500 | Controls, nav labels, compact metadata |
| `caption` | `22rpx / 32rpx` | 400 | Secondary explanation and timestamps |
| `data` | `28rpx / 40rpx` | 500 | Time, percentages, angles, distance, and aligned values |

- Use tabular numerals when supported for time-series and aligned data.
- Do not shrink dense data below the caption role. Reformat, scroll an owned matrix, or progressively disclose instead.
- Keep labels concise, concrete, and uncertain when data is uncertain. Do not promise perfect visibility.

### Type and content behavior

- Chinese text is the primary copy baseline. English, coordinates, catalogue names, and units may appear inline without changing the family stack.
- Values and units remain separate semantic spans: `28 km`, `45 分钟`, `20:30`, `86%`. Do not bake units into an image or rely on letter spacing to align data.
- Page and section titles wrap to two lines before truncation. Body and explanatory text reflow without line clamps when it carries a decision, warning, or recovery action.
- Use `预计`, `可能`, `数据更新于`, and an explicit confidence/source when conditions are uncertain. Avoid unsupported absolutes such as `一定可见` or `最佳`.
- Empty, stale, offline, permission-denied, and partial-data copy states name what happened, what remains available, and the next safe action.

## 5. Icon architecture

### Tier A — functional symbols

- Use for navigation, back, close, search, filter, location, layers, share, favorite, refresh, state, and form actions.
- Base grid: `48rpx`; visual glyph: `40rpx`; rounded outline stroke: `3rpx`; round caps/joins; simple geometry with a consistent optical center.
- Selected navigation may combine a filled focal shape with an outline shell. Inactive icons remain outline-only.
- Bottom navigation supports three to five primary destinations only after a Product Surface defines them. Icon plus text is required; selected state uses color plus weight/fill/indicator, never color alone.
- Functional symbols do not use 3D perspective, gloss, cast shadows, or texture.

### Tier B — semantic 3D subjects

- Allowed subjects: four-point star, five-point star, tent, telescope, binoculars, camera, hiking backpack, and a gender-neutral avatar; future additions must pass the same subject test.
- Use for category entry, equipment recommendation, empty-state focal art, onboarding, or a single hero moment—not for back/close/filter/status and not for every row.
- Visual recipe: large readable silhouette; three-quarter/isometric view; subtle perspective; rounded construction; smooth polymer/enamel with localized highlights; soft top-left key light; blue-white body with restrained cyan/deep-blue/beige/violet accents; one compact contact shadow; no neon halo.
- Keep one dominant object. Small orbiting stars/dots are optional inside illustration bounds but cannot become ambient particles in production UI.
- Do not imitate a protected character/franchise or reproduce a real branded product. The intended feeling is warm, handcrafted, and animation-friendly—not a copy of a named studio style.
- Day master: transparent background with a neutral contact shadow. Night variant reduces white area/luminance and shifts the shadow/background treatment. Observation variant is separately authored in black/warm red with no day-color pixels.
- Tile display target: `128rpx–176rpx`; export a verified `2x` raster master and load only the size required by the component. Default internal budget: `≤ 72KB` per tile asset and `≤ 160KB` per hero asset after visual QA; exceeding it requires an explicit quality reason and loading placeholder.

### Tier-B subject grammar

| Subject | Silhouette requirement | Avoid |
| --- | --- | --- |
| Four-point star | one broad compass-like sparkle with a small inset sparkle | thin needles or lens-flare rays |
| Five-point star | rounded five-point badge with one clear center plane | sharp military badge geometry |
| Tent | single readable A-frame entrance and short ground contact | detailed campsite scene inside a tile |
| Telescope | angled optical tube on a stable three-leg mount | branded hardware or fragile thin legs |
| Binoculars | two joined barrels with a clear bridge | photoreal product engraving |
| Camera | compact body and one dominant circular lens | brand marks, tiny controls, or text |
| Hiking backpack | rounded pack, lid, straps, and one readable front pocket | tactical styling or excessive attachments |
| Neutral avatar | simple head-and-shoulders form without gender-coded hair, makeup, or clothing | biometric realism or a named character style |

Canonical day master prompt:

> Create one isolated minimalist 3D **[SUBJECT]** icon for a friendly astronomy/outdoor Mini Program. Use a large unmistakable silhouette, rounded construction, subtle three-quarter/isometric perspective, smooth polymer-and-enamel material, soft top-left key light, restrained blue/white body with cyan, deep-blue, beige, or blue-violet accents, one compact contact shadow, transparent background, centered composition, and generous clear space. Warm, handcrafted, modern digital rendering; no text, logo, brand, interface frame, character franchise, or scenery.

Variant instructions:

- **Night:** keep geometry and camera identical; reduce bright-white area and highlight intensity, deepen the blue body, and use a compact dark contact shadow. Do not add neon glow.
- **Observation:** rerender the same geometry using only black and warm reds from the observation palette. No inherited blue/white pixels, bright background, bloom, or global color filter.
- **Negative prompt:** photorealism, metal scratches, glass glare, product branding, text, watermark, busy background, multiple dominant objects, thin fragile details, neon, outer glow, lens flare, ambient particles, hard black shadow, or a protected studio/character imitation.

## 6. Components

### Cards

- Standard card: `radius-md`, `28rpx` padding, `1rpx` border, mode-specific surface/elevation.
- Feature tile inspired by Reference 01: one centered Tier-B object, generous breathing room, and a short strong label below; optional secondary text is limited to two lines.
- Pressable cards use the whole card as one semantic target. Nested buttons inside a pressable card are forbidden unless event ownership and focus semantics are explicit.
- Dense weather/astronomy evidence uses grouped rows, aligned columns, timelines, or matrices rather than a card per datum.
- Loading/empty/stale/degraded/error/success reserve stable space and cannot make the main action jump unexpectedly.

### Buttons and icon actions

- Primary button: one per local decision layer, `radius-sm`, minimum `88rpx` height, label plus optional leading Tier-A icon.
- Secondary button: quiet surface/border treatment. Destructive action never borrows the primary brand treatment.
- Icon action: visible `48rpx` glyph inside at least `88rpx` hit region; accessible name is mandatory.
- Press feedback begins on touch-down; the action commits once on valid release. Drag-away/cancel/disabled states cannot commit.

### Navigation and Mini Program chrome

- Prefer native navigation when it can satisfy the surface. If custom navigation is selected later, derive status/menu-capsule/safe-area geometry at runtime and preserve the top-right capsule clearance.
- Bottom navigation is solid and quiet, not glass. It reserves safe-area space, uses Tier-A icons plus labels, and never covers content.
- Mode switching preserves route, scroll/task position, selection, and pending work. Observation mode requires an explicit label and a low-luminance transition.

### Maps, data, and equipment

- Map controls use solid, high-contrast circular or rounded-square surfaces with Tier-A icons. Selected markers use shape/scale/label as well as color.
- Forecast/astronomy data uses aligned time bands, row labels, units, and legends; a tap/press on a variable opens a concise explanation rather than crowding the matrix.
- Equipment tiles use Tier-B subjects with a functional readiness/required state and a short label. The 3D object is decorative/semantic; the surrounding card owns interaction and state.

### Component contract matrix

| Component | Required variants/anatomy | Required states and behavior |
| --- | --- | --- |
| Page shell | native/custom navigation boundary, safe top/bottom, page inset | initial, offline banner, permission boundary; no first-frame mode flash |
| Standard card | title, optional metadata, content, optional single owned action | static or whole-card pressable; default, pressed, disabled, loading, stale, error |
| Feature tile | one Tier-B subject, short label, optional two-line explanation | whole tile owns the hit region; selected uses border/indicator as well as color |
| Button | primary, secondary, quiet, destructive; optional leading Tier-A icon | default, pressed, focus-visible, disabled, loading, success/error acknowledgement |
| Icon action | `40rpx` glyph inside `88rpx` hit region; accessible name | default, pressed, selected, disabled, loading; tooltip/help text where meaning is unfamiliar |
| Chip/segment | single- or multi-select label; optional count/check | selected never color-only; horizontal scrolling cannot hide the active value without affordance |
| Field/list cell | label, value/input, helper/error text, optional trailing action | empty, focused, filled, disabled, error, success; helper/error space prevents layout jump |
| Bottom navigation | three to five destinations after Product Surface approval; icon + label | selected uses fill/weight/indicator; safe-area reserved; badges have spoken text equivalents |
| Sheet/dialog | title, content, explicit actions, close/recovery route | focus/read order contained; destructive confirmation explicit; sheet drag is interruptible |
| Banner/toast | icon, concise message, optional action | banner for persistent/actionable state; toast only for non-critical acknowledgement and never the sole error recovery |
| Empty/skeleton | reserved final geometry; optional one Tier-B focal object | mode-correct static skeleton; no bright shimmer in night/observation; action remains reachable |
| Data matrix | row labels, time columns, values, units, legend/source/update time | owned horizontal scroll, current-column marker, stale/partial/missing cells, variable explanation drilldown |
| Map controls/callout | solid control surfaces, Tier-A icons, labeled marker/card | pan/zoom remain direct; marker selection synchronized by shape/label; loading/offline/permission states explicit |
| Equipment tile | Tier-B subject, name, requirement/readiness label | optional/required/packed/missing cannot rely on color; surrounding card owns selection |

Component density rules:

- One local decision layer has at most one visually dominant primary action.
- A standard card should not contain another elevated card. Use grouped rows or a flat inset surface.
- A row supports at most one persistent trailing action; additional actions move to an explicit menu or owned detail layer.
- Decorative Tier-B art cannot displace critical values, units, warnings, or actions below the initial readable region.

## 7. Motion, feedback, and accessibility

- Press-in visual response: start in the same frame where possible and finish within `100ms`; use a small surface/tint change and optional `scale(0.985)` only for non-map, non-destructive cards/buttons.
- Press release/cancel: `120ms`; state/content crossfade: `160ms`; compact panel/sheet entry: `220ms`; mode transition: `240ms` with the destination background established first.
- Default curve: `cubic-bezier(0.2, 0.8, 0.2, 1)` for bounded UI transitions; opacity uses a simple ease-out. Avoid bounce, elastic overshoot, parallax, idle floating, icon spinning, and decorative particles.
- Reduced motion removes scale, depth travel, and large translations. Use an immediate state change or `≤ 100ms` opacity transition.
- Optional short haptics may reinforce a discrete selection, meaningful success, warning, or error only when a future platform adapter verifies capability and user preference. Haptics are never required to understand an event.
- Every control has a visible pressed, focus, disabled, loading, error, and success treatment when applicable. No state relies on color alone.
- Normal text targets at least `4.5:1` contrast; large text and essential graphical boundaries target at least `3:1`. Observation mode is checked separately and may not trade away essential legibility merely to become dimmer.
- Avoid transient messages for actions that require a decision. Use an inline state or dialog/action sheet with enough time and a clear recovery action.

### Motion contract

| Event | Duration | Property | Curve/constraint |
| --- | ---: | --- | --- |
| Press-in | `≤100ms` | surface/tint; optional `scale(0.985)` | same-frame start; no scale on map/destructive controls |
| Release/cancel | `120ms` | surface/tint/scale return | ease-out; cancelled press never commits |
| State/content swap | `160ms` | opacity | stable container geometry |
| Compact sheet/panel | `220ms` | translate + opacity | `cubic-bezier(0.2, 0.8, 0.2, 1)`; interruptible |
| Mode transition | `240ms` | destination-safe color/media crossfade | destination canvas applied before first visible transition frame |
| Reduced motion | `0–100ms` | opacity or immediate | no scale, parallax, depth travel, or large translation |

- Swipes and drags expose visible handles or direct-manipulation affordances. Critical actions cannot exist only behind an undisclosed swipe.
- Scroll, selection, route, form input, and pending task state survive a mode change. Mode transition cannot block input after the destination state is logically ready.
- Day/night may follow the system or an explicit user preference. Observation mode is explicit, never inferred only from sunset. If the previous field session ended in observation mode, bootstrap on black/red until the user deliberately exits, preventing a cold-start white flash.
- Observation-mode exit remains clearly labeled and reachable in red; entering a vendor/system surface that cannot remain red requires a warning before the transition.

### Accessibility contract

- Every interactive element exposes a role, concise name, current value/state, and disabled/expanded/selected semantics when applicable. Decorative Tier-B art is hidden from assistive reading unless it carries unique content.
- Reading/focus order follows visible order. Modal layers contain focus/read order and return it to the invoking control on close.
- Minimum hit region is `88rpx × 88rpx`; adjacent independent controls retain enough separation to prevent accidental activation.
- Text enlargement, landscape, safe-area changes, and long Chinese labels must not hide the primary decision, warning, or recovery action.
- Color, vibration, animation, and sound are never sole carriers of state. Reduced-motion and muted/no-haptic operation preserve equivalent feedback.
- Night and observation modes are display modes, not substitutes for contrast, screen-reader, magnification, or color-vision accessibility.

## 8. Asset and performance posture

- Functional icons should be code-native/vector where the selected Mini Program stack supports them safely; 3D subjects are optimized raster assets with explicit day/night/observation variants.
- Do not ship the 1254×1254 reference files as runtime tiles. Crop transparent bounds, export only required densities, remove metadata, and verify visual quality after compression.
- Lazy-load below-the-fold Tier-B art; render a mode-correct solid placeholder with the final geometry to avoid layout shift or a luminance flash.
- Do not create a single oversized sprite containing unrelated 3D subjects. Cacheability and update isolation are more valuable than one large decode.
- Any future framework/component-library adapter consumes these semantic roles; it cannot originate competing visual values.

### Asset naming and validation

- Candidate naming pattern: `icon3d-[subject]--[day|night|observation]@[density].[webp|png]`; functional icons use `icon-[name].svg` or the selected stack's code-native equivalent.
- All three variants of one Tier-B subject share silhouette, camera, crop, transparent bounds, and displayed size so a mode swap cannot shift layout.
- Export in sRGB, remove metadata, inspect transparent edges at `1x` and `2x`, and verify observation assets contain no unintended cool/white pixels.
- A mode-correct placeholder reserves the final aspect ratio. Failed asset loading falls back to a Tier-A symbol plus text rather than an empty or wrong-mode box.

## 9. Anti-patterns

- Copying or adapting the existing App design system, tokens, components, page targets, or React Native motion constants.
- Using the reference posters, example data, logo, phone frames, branded photographs, or exact layouts as production UI.
- Applying skeuomorphism to every card, button, functional icon, status, or data point.
- Broad glass blur, neon borders, ambient glow, purple gradients, star-particle backgrounds, glossy bevels on data panels, or multiple stacked shadows.
- A whole-screen red filter, day assets hidden under red opacity, or a blue/white loading/error flash in observation mode.
- Low-contrast inactive navigation, color-only selection, unlabeled icon actions, undersized hit targets, clipped large text, or motion that must finish before input is accepted.
- Treating a future Mini Program as full App parity or inventing its navigation/product responsibilities inside this visual-system candidate.

## 10. Candidate acceptance checklist

- References 01–08 remain readable and hash-identical to the source index.
- Open Design can read the candidate body and produce retrievable package files and a showcase.
- Day/night/observation expose identical semantic roles; observation values and assets are closed to black/warm red.
- Tier-A and Tier-B icon responsibilities are unambiguous, and the eight requested Tier-B subjects are indexed.
- Cards, spacing, typography, navigation, motion, state feedback, accessibility, safe-area behavior, asset budgets, and anti-patterns are specified with implementable values.
- The candidate contains no App design-system dependency and does not claim a Mini Program Product Surface, runtime, implementation, or acceptance result.
- Explicit user selection is still required before authority adoption.
- The candidate verifier proves reference integrity, role-set equality, key contrast pairs, requested Tier-B subject coverage, and the App-design-system exclusion. It does not prove production rendering or a future page's Product Surface.
