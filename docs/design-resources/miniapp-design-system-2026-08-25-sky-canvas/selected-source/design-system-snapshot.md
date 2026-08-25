# Starward Sky Canvas — Candidate C

> Category: Product UI
> Surface: web
> Candidate: unselected
> Provider direction: modern-minimal

A map-and-sky-first canvas system: minimal chrome, spatial continuity and selective color for time, moon and opportunity.

## 1. Visual Theme & Atmosphere

The map and sky are the interface. Product chrome recedes to a few solid floating controls and an edge sheet. Day is cool neutral; night is deep blue-black with restrained indigo and lunar gold. It feels cinematic through scale and continuity, never through gradients, particles or glow.

This is a design-system candidate for a 320–430 CSS-pixel equivalent mobile Mini Program. It must make a user feel that the interface is a trustworthy night-field decision instrument, not a generic weather dashboard, travel marketplace or decorative star poster.

Primary content priority:
1. map / sky / aligned time evidence;
2. the decision and next action;
3. supporting place detail and provenance.

Preserve the product topology and state semantics, but do not preserve the current Soft Instruments visual treatment.

## 2. Color

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

Indigo identifies selected place/time and primary action; lunar gold is reserved for moon/sun events. There is no generic purple gradient and no halo around ordinary controls. Large canvas areas remain quiet.

## 3. Typography

Display/body: -apple-system, 'SF Pro Display', 'PingFang SC', system-ui. Data: 'SFMono-Regular', 'IBM Plex Mono', monospace. Tight display tracking only for the single place/night identity. Body and controls stay compact; tabular numerics anchor the time layers.

Use at most five roles:
- display identity: one place/night title only;
- section heading;
- body/action;
- caption/source;
- tabular data / units.

Chinese long labels, large text and numeric alignment must be tested. Units are visually subordinate but never detached from their values.

## 4. Spacing, Geometry & Density

Canvas-first. Radius scale 8/16/24rpx only for floating controls and edge sheets; content inside the sheet uses flat sections and dividers. Shadows are restricted to the separation of one floating control layer from the map. Spacing 8/16/24/32rpx.

- Touch target: minimum 88rpx × 88rpx.
- No elevated card inside another elevated card.
- One local decision layer has one visually dominant action.
- Repeated data uses rows, bands, tracks or matrices rather than one card per value.
- Safe-area and WeChat capsule clearance are structural, not decorative padding.

## 5. Layout & Composition

Full-bleed map and sky canvases with edge-owned controls. A bottom sheet moves through peek, decision and evidence extents while preserving the visual position of the selected spot. Spot Night keeps the sky/arc visible and lets aligned conditions rise from the bottom.

### North-star surfaces

- Map: full visual work area; top search; a compact row of applied filters; one analysis-layer control; bottom spot callout.
- Finder: staged bottom sheet with quick filters, grouped advanced filters, two result partitions and one commit action.
- Spot Detail: place identity and tonight decision above route, openness, safety, facilities and evidence.
- Spot Night: night ribbon, decision summary, shared time rail, aligned condition bands, targets, sky canvas and evidence drawer.
- Contribution: progressive form, upload state and review history; visually secondary to the main decision chain.

## 6. Component Grammar

Search is one prominent floating field; applied filters are a short scroll row below it. Marker selection expands one bottom callout, not a popup stack. Buttons are solid, compact and icon-labeled. Evidence appears in an edge drawer; secondary metadata stays off the primary canvas.

Required shared families:
- search field and suggestion/result rows;
- quick chip, grouped filter choice and committed-filter summary;
- sheet, dialog and persistent banner;
- map marker, selected marker, callout and layer legend;
- decision summary, primary/backup window and blocker;
- night ribbon, time rail, condition band, sun/moon events and evidence drawer;
- upload item, submission status and moderation feedback;
- orientation calibration, accuracy state and manual fallback.

Every component has default, pressed, selected, disabled, loading, stale/partial/error and permission states where applicable.

## 7. Map, Time & Astronomy Visualization

Use continuous arcs, tracks and narrow color bands over a stable dark field. The active time is a precise indigo cursor; moon/sun events use lunar gold nodes. Sky objects are sparse and labeled only when relevant. Conditions can expand to a matrix without replacing the canvas context.

Illustrative comparison content, not product truth:
- 地点：深圳市天文台
- 今晚结论：值得考虑
- 主时窗：21:40–23:50
- 备选时窗：00:20–01:10
- 条件带：天文黑夜、总云/低中高云、月亮高度与照明、降水、风、湿度/露点、可见度、机会分
- Targets：夏季银河、土星、英仙座流星雨辐射点
- Search copy：搜地点 / 区域 / 观星点
- Quick filters：今晚推荐、2 小时内、暗度、少步行、设施

The preview must show the product, not a SaaS dashboard, pricing page, marketing hero, CRM table or chat assistant.

## 8. Motion, Feedback & Accessibility

- Touch feedback starts immediately. Selection and time scrubbing stay interruptible.
- Compact sheet transition target: 180–240ms with no bounce; reduced motion uses immediate or ≤100ms opacity.
- Time scrubbing previews local frames continuously and commits once on release.
- Map pan/zoom remains direct; controls never steal the gesture field.
- Sensor-following sky motion exposes accuracy and manual fallback.
- Normal text contrast target ≥4.5:1; essential graphical boundaries ≥3:1.
- Focus/read order follows visible order; modal layers return focus/read position to the trigger.
- No shimmer or bright flash in night/observation modes.

## 9. Voice

Chinese-first, calm, direct and evidence-aware. Say “值得考虑 / 数据不足 / 暂不建议”, not absolute promises. Put the result before technical explanation. Provenance and limitations are concise but reachable.

## 10. Anti-patterns

- pale-blue and white card soup;
- oversized headings repeated inside every section;
- decorative 3D objects replacing functional icons;
- broad blur/glass, neon outlines, purple gradient fog, star-particle wallpaper or ambient glow;
- a card per metric, nested elevated surfaces or repeated pill badges;
- Tencent default marker/callout/chrome as the product identity;
- astronomy represented only as paragraphs or a dense table with no visual time alignment;
- observation mode implemented by a red overlay on day assets;
- copied Ctrip/Taobao/perseids visual composition or branding;
- fabricated certainty, hidden missing data or “choose the clearest provider model”.

## 11. Candidate Status

This package is an unselected visual-system candidate. Provider success and preview readiness do not mean selection, authority adoption, downstream project binding or production acceptance.
