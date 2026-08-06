# Open Design focused scrollbar polish commission

## Scope

Modify only the existing `component-control-atlas.html` in project `starward-miniapp-map-page-2026-08-05`. Do not modify or create any other file or resource.

## Independently reproduced consistency defect

The repaired `.chips-line` now has the correct `overflow-x:auto` behavior and all chips are reachable, but Windows renders a persistent native horizontal scrollbar with arrow buttons. That host-browser chrome is visibly part of the production component specimen and increases the row's apparent height. It is not intended WeChat Mini Program UI and conflicts with the same component in authoritative `index.html`, where the horizontal chip owner keeps scrolling but uses `scrollbar-width:none` plus a WebKit scrollbar suppression rule.

## Required micro-repair

Keep the current real horizontal scrolling owner, touch semantics, focus reachability, 44 px chip targets, and first/last endpoint behavior. Suppress only the persistent host-browser scrollbar for `.chips-line`, using the existing prototype's cross-browser posture as the source of truth. Do not remove `overflow-x:auto`, do not wrap the row, and do not hide or clip chip content.

## Preserve and verify

- only `component-control-atlas.html` changes;
- 12 groups, three exact modes, pressed samples without whole-control scale, and the selected-card action area remain unchanged;
- at 320 / 375 / 430 CSS px, document/body do not overflow, `.chips-line` still has `overflow-x:auto`, `scrollWidth > clientWidth`, the first chip is exposed at origin, and the last chip becomes fully exposed at maximum/user-agent scroll;
- all seven chip heights remain at least 44 px and native button focusability remains;
- the persistent Windows/WebKit scrollbar is no longer visually present;
- no external dependencies and no new resource or handoff.

Finish with no unfinished work.
