# Miniapp design-system source index

Status: candidate input only; not selected and not Design Authority.

Goal thread: `019fd0e3-4eaa-7851-8e8f-a4d427fca072`

Scope: a fresh WeChat Mini Program visual system for 《今晚去观星》. The existing App design system, App runtime tokens, App page targets, and React Native interaction rules are explicitly excluded as design inputs. They were inspected only to establish that exclusion and must not be copied, adapted, or treated as a baseline for this candidate.

## User-owned requirements

- Keep the system concise and comfortable: generous but efficient spacing, clear hierarchy, immediate feedback, restrained motion, and stable layouts.
- Cards should take their rounded shape and light, compact shadow character from Reference 01.
- Functional icons, especially bottom-navigation icons, should use the simple outlined language shown in Reference 01.
- Selected subject/category icons may use a friendly 3D skeuomorphic language. Candidate subjects include a four-point star, five-point star, tent, telescope, binoculars, camera, hiking backpack, and gender-neutral avatar.
- The 3D language should feel minimal and modern: soft shadows, smooth polymer/enamel material, blue-white with restrained cyan/deep-blue/beige/blue-violet accents, soft lighting, a slightly isometric three-quarter view, subtle perspective, and a cute, welcoming character. It must not copy a protected character, franchise, product, or another application's icon.
- References 06, 07, and 08 establish three distinct but role-isomorphic modes: day, night, and low-luminance observation/red mode. A mode switch changes luminance, color, assets, and emphasis without changing the component grammar or task position.
- Observation mode is for dark-site use. It must prevent controllable blue/green/white flashes and must use purpose-authored red/black assets rather than a whole-screen filter.
- The user delegated unspecified design-system details to Codex and authorized research into relevant astronomy, weather, map, and outdoor products.
- The user explicitly instructed: do not reference the App design system.

## Immutable supplied references

All files below are byte-for-byte copies of the supplied temporary files. Paths in this table are repository-relative and stable; the original temporary paths are intentionally not treated as durable locators.

| Ref | File | Dimensions | Bytes | SHA-256 | Classification | Extracted design evidence |
| --- | --- | ---: | ---: | --- | --- | --- |
| 01 | `references/01-card-and-bottom-nav.png` | 1179×2556 | 836896 | `b156309394810256f799cb7c146840f6a0cf37ecdcfbbf0653d4c9d0d3b00f54` | inspiration | Two-column white cards; generous internal whitespace; visibly rounded corners; soft compact elevation; one 3D subject per card; strong label below; bottom navigation uses thin rounded outline icons, text labels, blue selected state, and quiet gray inactive states. The orange header, page name, menu capsule, exact navigation labels, and content are not selected. |
| 02 | `references/02-3d-icon-prompt-and-grid.png` | 1060×880 | 511557 | `4473f5147bc70f1cd39187192954018298ab5b8f2d10230d0901abf0ee2ec8e7` | inspiration | Records the user's prompt vocabulary and a coherent icon family: four-/five-point stars, tent, telescope, binoculars, camera, backpack, and neutral avatar; soft blue-white-beige-violet palette; smooth plastic/enamel; top-left soft light; rounded silhouettes; contact shadow; slightly isometric presentation. The surrounding chat UI is excluded. |
| 03 | `references/03-3d-telescope.png` | 1254×1254 | 1801537 | `51eb5f517273b65d972d2f6c49ee6638855f3e49f81dbafd01c2f103b48c8b36` | inspiration | Telescope hero icon with a consistent three-quarter view, large readable silhouette, localized highlights, cream joints/feet, blue optical accents, and one grounded contact shadow. It supports the physical-subject icon tier, not universal control chrome. |
| 04 | `references/04-3d-four-point-star.png` | 1254×1254 | 1433938 | `712566bd533556a5ab711fa8085e82e49a77dc97300241c21e299d30b163e80d` | inspiration | Four-point star built from large rounded lobes, alternating blue-white faces, cyan perimeter, violet center, small orbiting accents, and a grounded shadow. Peripheral particles are illustrative and must not become ambient UI animation. |
| 05 | `references/05-3d-five-point-star.png` | 1254×1254 | 1552550 | `f38d4fcb147f6dc4a10925c6c56529ca089b496b3a1d589b3846014801cdc1ea` | inspiration | Five-point star with a compact symmetric silhouette, alternating blue-white faces, cyan edge, violet center, and soft contact shadow. It establishes family consistency with Reference 04. |
| 06 | `references/06-day-mode-reference.png` | 941×1672 | 2524448 | `62d286b330ce48cac73e1b1351e6c35502aac46989af971ee502466842d49fe0` | inspiration | Day mode: cool blue-white canvas, bright but calm surfaces, deep-blue type, one high-signal blue action, pale blue grouped panels, real sky/map imagery, concise icons, clear decision/data hierarchy, and equipment imagery. Poster composition, logo, sample data, phone frames, exact screens, and branded imagery are excluded. |
| 07 | `references/07-night-mode-reference.png` | 941×1672 | 2590279 | `5d5ec492c02e8d67b502ed7f672f1b8976da61d56f2702fbd7a59bbcb1ee3b5d` | inspiration | Night mode: near-black navy canvas, stepped navy surfaces, crisp blue emphasis, pale text, compact borders, restrained luminous cues, and the same information roles as day mode. Broad neon glow, poster staging, phone frames, logo, and sample data are excluded. |
| 08 | `references/08-observation-red-mode-reference.png` | 941×1672 | 2343170 | `d8de918d08dab0f8d6f84bb097076671186a61a1494637f1e40b2fc7b97b8150` | inspiration | Observation mode: black field, dark red surfaces, warm-red text/icons/routes/actions, reduced decorative content, and mode-isomorphic layout. The candidate adopts low-luminance red/black semantics, not the poster, logo, exact pages, sample data, or claim that color alone guarantees dark adaptation. |

## Research inputs

Research sources are inspiration and platform context, not exact targets. Only the transferable lesson listed here enters the candidate.

| Source | URL | Transferable lesson | Excluded |
| --- | --- | --- | --- |
| Stellarium Labs night-mode explanation | <https://stellarium-labs.com/blog/nightmode/> | A dedicated red display mode is a real astronomy-field pattern intended to reduce disruption to dark adaptation; low luminance and complete continuity matter. | Medical guarantees, Stellarium styling, layouts, assets, and terminology. |
| Stellarium Mobile product page | <https://www.stellarium-labs.com/stellarium-mobile-plus/> | Keep field chrome minimal around immersive sky content; support offline/degraded use and night-mode discoverability. | Sky simulation implementation, catalogs, AR behavior, and product identity. |
| Astrospheric detailed forecast | <https://www.astrospheric.com/DynamicContent/forecast.html> | Dense astronomy variables scan better as aligned hourly bands/matrices with a concise legend and drilldown explanations. | Its blue scale, data sources, geographic coverage, pricing, and layout. |
| Astrospheric map guidance | <https://www.astrospheric.com/dynamiccontent/map.html> | Map overlays should expose layer identity and support a map-first assessment without hiding uncertainty. | Its tiles, layer colors, data, and interaction details. |
| AllTrails outdoor product | <https://www.alltrails.com/welcome> | Outdoor planning benefits from a clear map/action hierarchy, practical conditions, and confidence-building next actions. | Brand, commerce, trail taxonomy, imagery, and page composition. |
| AllTrails offline-area help | <https://support.alltrails.com/hc/en-us/articles/37758009767444-Download-custom-areas-for-offline-use> | Long-running/offline operations need visible progress, storage/limit feedback, recovery, and an explicit offline state. | Subscription rules, limits, platform-specific behavior, and content model. |
| Tencent WeUI | <https://github.com/Tencent/weui> | Use familiar WeChat interaction primitives for buttons, cells, dialogs, actionsheets, progress, toast, and icons; custom styling must preserve platform clarity. | WeUI's visual values as a mandatory skin and any assumption that a library version is already selected. |
| Tencent TDesign MiniProgram | <https://github.com/tencent/tdesign-miniprogram> | A tokenized component layer and native Mini Program component implementation are viable future adapters; component semantics should be library-agnostic. | TDesign's token values, component APIs, current version, and adoption decision. |

## Input handling and non-claims

- References 01–08 are inspiration, not exact targets. No pixel-fidelity or page-reproduction claim is authorized.
- This index preserves the entire user-supplied visual input and the extracted bounded meaning needed after context compaction.
- No miniapp Product Surface, Screen Contract, framework, package, component library, runtime, or acceptance environment is created by this source index.
- No App Design Authority, App token, App component, or App interaction constant is a source for this candidate.
- Candidate values in `candidate-design-brief.md` remain reviewable proposals until an Open Design candidate is generated, inspected, and explicitly selected.
