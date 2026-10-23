# R19 My presented content — 2026-10-23

## Scope and current result

This work implements the one My content component consumed by the native My wrapper and the Map-owned presentation selected under R19 B. `MyLibraryPage` now accepts optional `onReturnMap(): void | Promise<void>`; its default delegates to `openPrimaryPage('/pages/map/index')`. It does not introduce a second My body or a new native Back container. Map host/wrapper wiring, primary controller/dispatcher, account and page operation hooks, notification routing and the single native Back owner remain with the root integration work.

The My content no longer consumes `usePrimaryNavigation`, its inline bar style or `--primary-nav-height`. The original ScrollView and body remain in place, with bottom content padding retaining the real `env(safe-area-inset-bottom)`. Avatar/nickname, gradient, glass plan-card material, headings, data, saved plans and existing red-light media policy have not been replaced. The removed `retainPrimaryNavigationCover` consumers belonged to the retired bottom-bar cover mechanism; the existing editor `NativeBackBoundary` consumers remain for the shared context to delegate.

## Adopted reference inspected

The adopted local readback was used without regeneration or editing:

- Stitch project `7144519510537620825`, adopted node `3995519477980461148`, full dependency node `5205988829884632961`.
- `C:/Users/momoooo/AppData/Local/Temp/starward-design-20261022/implementation-input-20261022/review-images/my.png`, `map.png`, `press.png` were actually viewed.
- The same package's `source/candidate-preserved/review.mjs` was read at `adaptMy` and its shared button/press styles. Its My map action specifies left 16px, top 44px in the prototype, minimum height 44px, horizontal padding 8px, label 14px, arrow `‹` at 26px and map icon 22px. Production keeps the existing native safe-top geometry instead of hardcoding the prototype's status-bar position or drawing its home indicator.

`CustomNav` adds only the `backPresentation='map'` variant: the source arrow, existing map role/asset and “地图” text use the existing SoftButton/SharedButton feedback. The shared map asset-role mapping remains with the root. Existing back/dismiss variants keep their structure and state path.

## Lifecycle and recovery

- My clock and stale-summary foreground refresh use `usePresentedPageLifecycle`; hide stops the interval and unmount still clears it.
- Library, account-profile and avatar queries are enabled only while the presented page is visible. Hidden content stays mounted; this component does not reset or replace its ScrollView.
- Navigation, account entry, avatar/nickname editing, saves, sliders, retry and plan actions check the immediate `page.isCurrent()` boundary. Hidden buttons are disabled as well.
- The retained My plan press uses presented show/hide and captures the accepted presentation identity with its native geometry request. A retired result cannot create a highlight in a later My activation, including before another render. Existing account/layout/clock/resize/touch cancellation remains.
- Avatar native selection still runs through `operation.native()` and the shared account operation owner; its expected native hide/show is not replaced by a blanket post-await foreground check. Renewal, draft/revision checks, red-light handoff and explicit server save remain.
- `CustomNav.backAction` dispatches after its existing begin/guard/authorization checks. It replaces native Back for this action; it does not run callback plus another Back. Rejection still reports through the existing recovery/error/retry path.

## Verification

Final scoped command:

```text
node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/components/custom-nav.test.ts apps/wechat-miniapp/src/features/my/navigation.test.ts apps/wechat-miniapp/src/features/my/my-avatar-display.test.ts apps/wechat-miniapp/src/features/my/my-plan-card-press.test.ts
```

Result: **30 tests, 30 passed, 0 failed, 0 skipped**, duration 1446.1368ms. These run production CustomNav dispatch, actual page navigation/primary dispatcher/controller, production My adapters/avatar/plan card at their replaced React/native ports. They establish bounded local behavior, not WEAPP appearance or phone acceptance.

The checks retain ordinary Back, declined guard, serialization, failed return/retry, stale completion, account entry and existing media/press assertions. New coverage distinguishes native relaunch acceptance from a real Map host show, retains the persistent unreadable-stack failure instead of inventing a destination, proves a custom My return causes no extra native Back, and rejects hidden/replaced presentation actions/press geometry. The old test's two independent fallback-native operations were not retained as a product requirement; CustomNav finalizer isolation now uses its actual custom-action port, while the real primary owner separately verifies one native handoff and actual arrival.

Failure history: the initial scoped run had 16 passes and 12 loader failures while the primary-owner file was in its replace window; no product assertion was reached. Once the owner stabilized, four old switchTab-only fixture assumptions failed. They were migrated to the real `reLaunch`/actual host-show boundary and all assertions above passed. One intermediate retry test called show before its deliberate rejection and was repaired at the fixture; no production condition was weakened.

`git diff --check` for these 11 source/test files exited 0 (only the pre-existing CRLF-to-LF notice on MyLibraryPage).

The concurrent workspace typecheck ran before shared integration finished. This scope initially exposed the missing semantic `map` role, reported to its root owner; other diagnostics were in the retiring custom-tab/use-primary-navigation consumers and the new page-presentation native Page type adapter. A complete post-integration typecheck/build and independent review remain the root's batched checks. No native build, preview, phone, service, Git mutation or candidate replacement was performed here.

## Remaining target acceptance

The mounted Map host and native wrapper must still be checked together with the root wiring. Actual WEAPP layout, 240ms left entry/exit, unchanged My scroll after native child return, correct editor/system Back order and runtime press appearance remain unverified by this scoped local test. The retained gen8 candidate does not contain this work.

## Scoped source identity

SHA-256 after the final scoped pass:

```text
7c4f9c0d92610062e04679f4c9f6ec558edf6d355fdea3e541b8db53aef92a0c apps/wechat-miniapp/src/components/custom-nav.tsx
2d8ba338f89f9b760162253b86dbc979214f6bdf55cfc5f4dade8fe911a5c679 apps/wechat-miniapp/src/components/custom-nav.scss
f53c16c916de51a818ff0b5262ef6ae36551c0b1519ba11a0338e658fa3cdb79 apps/wechat-miniapp/src/components/custom-nav.test.ts
a5caef388693100628b30a04a2849ebb59b38a5b97fcc8ac4f848209a8b04842 apps/wechat-miniapp/src/features/my/my-library-page.tsx
ae9fed7f4f2f1c46ca1da7d9414d35f04ef45627b7eddcdafb589412a0cdae8c apps/wechat-miniapp/src/features/my/my-library-page.scss
cf54c86c6b1bdad704e3557c344ad6c8001c52a987b7a1821614d763092bff39 apps/wechat-miniapp/src/features/my/my-avatar.tsx
6a5cda17f101f15cf0240dfaa60750cf7b38c5f5be51bbb5905d2e3ab76a4862 apps/wechat-miniapp/src/features/my/my-nickname.tsx
869c31fbae5f23a042ec6b81727b87fdfeb4ce0a1ef6c9fe366ffdc277823136 apps/wechat-miniapp/src/features/my/my-plan-card.tsx
fab8f6b6f70bd81df70c5c8b5d1b1962cd583110b0f7bfe30606837b816c0d07 apps/wechat-miniapp/src/features/my/my-avatar-display.test.ts
89ccf91ebe5419277d01d156611d2f80e96ae3ac6e0dbc843e9d5a9119defee5 apps/wechat-miniapp/src/features/my/my-plan-card-press.test.ts
69dd6aacbbc118863a6da0403bb49f43be4448231daa71fc279563ed654160b4 apps/wechat-miniapp/src/features/my/navigation.test.ts
```
