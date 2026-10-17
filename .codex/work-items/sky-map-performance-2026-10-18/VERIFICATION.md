# Delivery evidence — 2026-10-18

The user selected code/package delivery now and physical-device verification later. This task does not complete the older cloud-sky product Goal, deploy a backend, upload a phone candidate, or certify full-product acceptance. Source changes remain uncommitted in the current worktree.

## Implemented result

Map fades to black and enters Sky with `redirectTo`. Sky fades to black and returns with `switchTab`; Map is recreated and reveals after a native Map update. Existing store and query owners retain camera, selection and Observation Context. The bounded presentation snapshot retains panel extent and both scroll axes, rejects changed account/reset/selection, and releases its subscription when consumed or invalidated. Explicit navigation failures and uncancellable late completion are handled by the shared blackout and route owners. Pending Context edits cannot start replacement entry.

Independent review found two return races: an old failed return could cancel a newer one, and timeout could discard a native return that later succeeded. Both were repaired with per-request return tickets and preservation of outstanding native intent, then independently reread. See [review](INDEPENDENT-REVIEW.md) and [Map responsibility](MAP-LIFECYCLE.md).

## Actual WEAPP runtime observations

The official DevTools 0.3.11 CLI operated the canonical project with the current development watch output and a local MEMORY_TEST API. Public fixture data and native platform rendering were used; no real account/storage reset was performed. These measurements are desktop development observations, not production phone/CDN measurements.

- First observed entry replaced Map page 15 with the sole Sky page 16. The return created Map page 18; the old Map was absent from the native page stack while Sky ran.
- A later final-source journey replaced Map page 37 and returned to a new Map page 40. The large panel, selected marker, exact map center and zoom were retained. Actual element geometry measured document scroll at about 420 px and photo-strip offset at about 378.4 px before and after; both differences were exactly zero. This establishes rendered offsets, not merely a saved command or success response.
- First cold entry: native dispatch to Map unload 1,550 ms; Sky mount 1,560 ms; first accepted Sky paint 2,319 ms. First return: Map mount 355 ms; native Map update 1,739 ms; reveal completion 1,966 ms.
- A cached entry measured 287 ms to Map unload, 305 ms to Sky mount and 909 ms to accepted paint. The final large-panel journey measured 1,665 ms to accepted Sky paint and 1,646 ms from return dispatch through Map reveal. These are individual samples under different development/cache conditions, not averages or a before/after phone benchmark.
- `onUpdated` records a native Map update; it does not establish that every map tile, image and report is ready. Accepted Sky paint is likewise scoped to its existing renderer receipt.

Raw bounded receipts remain ignored under `tmp/`: `entry-native.json`, `sky-ready-native.json`, `first-return-native.json`, `warm-entry-native.json`, `final-sky-native.json`, and the two `scroll-*-native.json` files. Current source hashes are in [SOURCE-SNAPSHOT.json](SOURCE-SNAPSHOT.json).

## Loading and visual decision

The supported [WEAPP predownload mechanism](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/preload.html) is declarative. Map now permits Sky package predownload on Wi-Fi; cellular remains on demand. No unsupported panel-triggered `loadSubPackage` or private `preDownloadSubpackage` API is used. This does not claim a measured phone speedup.

The cloud-closing/opening fallback was considered but not added. The cached path was materially shorter, a supported package-prefetch improvement is available, and production phone loading/composition has not been measured. A cloud curtain would mask waiting without resolving those unknowns. Retain the required inverse black transition and existing bounded failure/retry behavior; reassess the optional cloud treatment from representative phone timing after this delivery.

The official simulator screenshots omitted observer/menu WXML despite their correct native geometry and opacity. Removing only the new Back boundary did not restore those pixels. In a second controlled diagnostic, the main Canvas's runtime computed visibility was `hidden`, but the screenshot still included its star image. Therefore the screenshot cannot establish normal visual composition or normal-speed fade coverage. All temporary diagnostic source changes were restored byte-for-byte; `tmp/diagnostic-boundary.json` records the restored hash and inactive flag. No speculative renderer or CoverView rewrite was introduced. [COMPOSITION.md](COMPOSITION.md) records the bounded source investigation.

The already paired NIO phone's wireless transport was recovered and verified by the project doctor. A duplicate host connection to the same physical device was identified privately and only the task-created duplicate was disconnected. The user deferred phone verification; no QR, preview upload, phone input, phone data change or feedback generation was performed. Pairing and the single working transport remain available.

## Final package and checks

The final production-optimized isolated build is pinned by [FINAL-CANDIDATE.json](FINAL-CANDIDATE.json):

| Package | Fresh merged baseline B | Final B |
| --- | ---: | ---: |
| main | 2,010,369 | 2,003,762 |
| sky | 1,460,047 | 1,296,896 |
| spot | 808,236 | 598,333 |
| content | 1,297,226 | 1,041,257 |
| Total | 5,575,878 | 4,940,248 |

Main remains below 2 MiB with 93,390 B free. Total reduction is 635,630 B, including the added lifecycle/recovery code. Main reduction is 6,607 B; it is still the limiting package. Thirty-nine redundant bitmap copies independently account for 647,488 B, with exact-byte main replacements and distinct facility variants retained. Four Sky-only request/validator responsibilities left the main API module without changing their function bodies, authentication, cache or endpoint semantics. [PACKAGE-AUDIT.md](PACKAGE-AUDIT.md) explains CDN and remaining code ownership costs; no unavailable remote asset URL was substituted.

- Final integrated affected checks: 49 passed, including entry, return, late-result recovery, snapshot isolation, scroll restoration and shared icon resolution.
- Separately completed affected checks: 32 Sky client/identity/authorization cases and 14 existing Map camera/map-point cases passed. Counts are not a full-suite claim.
- Final Mini Program typecheck, Context declaration validation and whitespace diff checks passed.
- Final isolated WEAPP production build passed with existing webpack warnings; all 11 existing static candidate checks passed, including routes and every package budget. The compiled Wi-Fi preload declaration and its Sky package budget were read back.
- Older source-extraction fixtures with missing pre-existing owners remain documented in MAP-LIFECYCLE.md. The whole repository suite was not declared green or rerun for reassurance. Real device/system Back, normal-speed visual composition, production network/CDN throughput and iOS remain unverified as agreed.

## Branches and retained local work

Two remote branches already contained in main were deleted atomically with exact expected-SHA leases; main and `codex/remote-main-20260908` remain locally and remotely. Both worktrees were preserved. [BRANCH-CLEANUP.json](BRANCH-CLEANUP.json) contains full recovery SHAs and remote readback. No code commit/push occurred in this task.

The task-owned canonical development watcher and local fixture API remain available for review. The canonical DevTools window is retained; unrelated historical imports were not removed. Temporary diagnostics and build inputs remain ignored task material, not design-source mirrors.
