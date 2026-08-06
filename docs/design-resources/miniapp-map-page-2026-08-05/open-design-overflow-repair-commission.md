# Open Design focused overflow repair commission

## Scope

Repair exactly one existing resource in project `starward-miniapp-map-page-2026-08-05`:

- `component-control-atlas.html`

Do not modify `index.html`, `page-anatomy.html`, `interaction-motion-accessibility.html`, any source commission, or any project/design-system file. Do not create a new artifact, gallery, handoff, explanation file, screenshot, or alternate atlas.

## Independently reproduced defect

The quick-filter specimen in `atlas-filters` promises horizontal scrolling and preservation of reachable active values, but `.chips-line` currently uses `overflow:hidden`. Its later controls extend beyond the group and are clipped by the group's own `overflow:hidden`:

- 320 CSS px: `实时云图 · 待接入`, `有停车`, and `有厕所` extend past the group;
- 375 CSS px: the same later controls remain clipped;
- 430 CSS px: `有停车` and `有厕所` remain outside the visible group.

This is a material UI/UX accuracy defect, not a request for another resource.

## Required repair

Make the quick-chip owner a real horizontal scrolling region so every chip is reachable at 320 / 375 / 430 CSS px. Preserve the compact single-row chip family, 44 px owned targets, visible selected/non-color cues, disabled state, and the stated gesture ownership. A bounded `overflow-x:auto` treatment with vertical clipping/containment and appropriate touch scrolling is acceptable; do not wrap the quick-chip row into a different component.

The last chip must be reachable at maximum scroll, the first chip must be reachable at scroll origin, keyboard focus must not be hidden permanently, and the page itself must not gain horizontal overflow.

## Preserve exactly

- all 12 component/control groups and their order;
- all three exact day/night/observation-red token sets and exactly one selected mode;
- no whole-control scale on atlas pressed specimens;
- the normal selected-card action area, one secondary `回到点位`, one primary `查看详情`, each at least 44 px and inside the card at 320 / 375 / 430;
- all candidate/sample-data/non-production labels;
- Tier-A icon posture, measurements, state copy, motion, focus/accessibility information, and zero external dependencies.

## Verification before finishing

At 320, 375, and 430 CSS px, verify all of the following in the actual rendered file:

1. document/body have no horizontal overflow;
2. `.chips-line` has horizontal scrolling semantics when its content exceeds its client width;
3. `scrollWidth > clientWidth` where expected, `scrollLeft = 0` exposes the first chip, and `scrollLeft = scrollWidth - clientWidth` exposes the last chip within the owner;
4. every chip retains at least 44 px height and is keyboard-reachable;
5. group count, mode state/tokens, pressed transforms, and selected-card actions remain unchanged.

Finish with only `component-control-atlas.html` modified and no unfinished work.
