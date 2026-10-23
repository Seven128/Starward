# R19 legacy primary bar retirement — 2026-10-23

## Scope and authority

The adopted 2026-10-22 no-bottom-bar navigation requires retiring the old custom TabBar after its real consumers migrate. This batch follows the current Mini Program Screen Contract, including its explicit boundary that modal Back, native chrome, photo-viewer restoration and actual safe areas remain owned by their existing implementations. The root agent owns the Map-hosted My presentation, routes, page lifecycle and full-window layout migration. This batch did not change those production owners, Map/My pages, shared Page/Back components, or design resources.

## Original bytes and exact retirement

Before editing or deletion, copied the 13 scoped current files, including dirty source/tests, into the new private directory:

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/legacy-tabbar-originals-20261023`

Each relative path, byte length, SHA-256 and readback SHA-256 is in `manifest.json`. All 13 originals total **98,013 bytes**; every original was read back and rechecked before deletion and again after the edits. Manifest SHA-256: `20aad035c8c616f63cead29eb060160a6c2d07effe0b6062c13376ae85fac2ea`.

Precisely retired these seven files after the remaining production references were reduced to the old bar and cover themselves:

- `apps/wechat-miniapp/src/custom-tab-bar/index.ts`
- `apps/wechat-miniapp/src/custom-tab-bar/index.test.ts`
- `apps/wechat-miniapp/src/custom-tab-bar/index.scss`
- `apps/wechat-miniapp/src/custom-tab-bar/index.wxml`
- `apps/wechat-miniapp/src/custom-tab-bar/index.json`
- `apps/wechat-miniapp/src/navigation/primary-navigation-cover.ts`
- `apps/wechat-miniapp/src/navigation/primary-navigation-cover.test.ts`

Deletion used seven exact `Remove-Item -LiteralPath` calls after checking the resolved paths remained in the repository and source hashes still matched the preserved originals. No recursive directory deletion was used. The emptied directory was not recursively removed. Ordinary Map/My icon bitmap resources and `primary-navigation-day-icons.json` were not edited or deleted.

The removed tests belonged to the retired native bar/cover implementation: bar component lifecycle/theme/layout/cover/blackout and instance-scoped cover leases. The actual page/navigation/transition/return obligations continue with the current primary owners; they were not marked complete by deleting these tests. No obsolete fields or hidden bar were introduced to satisfy their previous assertions.

## Retained consumers and test boundary

`astronomical-event-modal.tsx`, `spot-image-viewer.tsx` and `wechat-login.tsx` only lose their old cover import/acquisition/release. Login also loses the now-unused `useEffect` import. A byte comparison against the preserved originals verified that these three production files contain exactly those declared edits.

The event's selection, query, close/Back and notification lifecycle are unchanged. The photo viewer still acquires/releases `retainPhotoViewerNativeChrome`, retains its existing Back-handler registration, full-screen geometry, flight cancellation, close-once and restoration paths. Login retains its privacy-first Back logic and native Back boundary.

`event-modal-motion.test.ts` drops only the retired cover test port. `spot-image-viewer-motion.test.ts` drops its fake bar cover counter and replaces the cover-lifetime assertion with the still-required native-chrome lifetime through system-motion changes and actual unmount. Existing flight/geometry/cancel/close assertions remain.

`use-primary-navigation.test.ts` now executes the **production hook, actual controller and actual primary dispatcher**, replacing only React scheduling, time and Taro native ports. It tests:

- Exact Map ownership across hidden child/empty native stacks, resize and real show recovery; logical My activation survives child Back and its Map return remains actionable.
- Actual native `windowHeight`, without old bar/safe-area-derived reservation, including resize and unavailable/invalid metric fallback.
- Reverse intent replacing the transition ticket, canceled timers, forced late completion, system reduced motion and restoration of normal motion.
- A transition settling while a native child is foreground without resuming hidden Map/My consumers, followed by show recovery with the original logical identity.
- Disposal releasing the actual Map registration, native ownership and timer once; late callbacks cannot revive the disposed controller.

The new fixture has no `getTabBar` port, fake native bar, blackout handle or old pending/failed-bar fields. The production controller/dispatcher behavior is not reimplemented in the test.

## Verification

Final targeted owner command:

```powershell
node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/hooks/use-primary-navigation.test.ts apps/wechat-miniapp/src/navigation/primary-navigation-controller.test.ts apps/wechat-miniapp/src/components/astronomical-event-modal.test.ts apps/wechat-miniapp/src/components/event-modal-motion.test.ts apps/wechat-miniapp/src/components/spot-image-viewer-motion.test.ts apps/wechat-miniapp/src/components/spot-image-viewer-gesture.test.ts
```

Result: **44 passed, 0 failed, 0 skipped**, 1,913.6019 ms. This includes event selection/confirmation/Back, hidden query suspension, article/source behavior, viewer gestures/native-chrome/geometry/cancellation and current hook/controller behavior.

`npm run typecheck --workspace @starward/wechat-miniapp` exited **0**. `rg` over `apps/wechat-miniapp/src` finds no remaining `primary-navigation-cover`, `retainPrimaryNavigationCover`, `PRIMARY_NAVIGATION_BLACKOUT`, `getTabBar` or `custom-tab-bar` references.

Preparation failures were resolved at their actual boundaries:

- One direct root `tsc` invocation used the root TypeScript 6 installation and stopped at its existing `baseUrl` deprecation (`TS5101`). No compiler/configuration change was made; the repository workspace command selects the intended compiler.
- The first proper workspace typecheck found five `TS7053` diagnostics in the new test's CSS custom-property reads. The test now reads own style properties through a typed helper. No production field was added and no typecheck assertion was weakened. The final workspace typecheck passed.

Private verification files beside the originals:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `verification-owner-tests.log` | 4,659 | `8e06f7ac480b58e1729a1949bd82c7b81b46edbf8abd71f743455b4591c840eb` |
| `verification-typecheck.log` | 144 | `1e7137e434d0121bb69677a53d7a32442466d7dde41d1b63d2e7fd29cbb361e7` |
| `retirement-verification.json` | — | `11d12f1698103b94e8c1b311964a4a5442d3e4f1b620063f49f491c4d0fcac28` |

## Remaining delivery boundary

These are source, Node behavior and TypeScript checks. They do not establish actual WEAPP motion, native PageContainer/system Back behavior, rendered full-window geometry, My left entry/exit, Map state restoration or current-candidate device acceptance. Those remain with the root agent's combined navigation delivery. No build, service mutation, official preview/device operation, Git commit or upload was performed in this batch.
