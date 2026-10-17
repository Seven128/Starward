# WEAPP package and delivery audit — 2026-10-18

## Result and measured scope

The merged application was close to the repository's 2 MiB main-package budget, but was not over it. The frozen merge candidate's files exactly matched its manifest (main 2,010,377 B; 86,775 B free). A new ordinary, production-optimized isolated build established the current baseline below. The eight-byte difference from the frozen candidate was project configuration, not a missing asset.

The delivered changes remove 39 duplicate bitmap copies (647,488 B) and move four Sky-only request operations and their validators out of the main API module. Images retain their original exact bytes, dimensions and display semantics. No CDN service, external URL, publication, pixel transformation, route, authentication or cache policy was introduced.

| Package | Fresh baseline B | Final isolated build B | Difference B |
| --- | ---: | ---: | ---: |
| main | 2,010,369 | 2,003,300 | -7,069 |
| sky | 1,460,047 | 1,296,736 | -163,311 |
| spot | 808,236 | 598,333 | -209,903 |
| content | 1,297,226 | 1,041,257 | -255,969 |
| Total | 5,575,878 | 4,939,626 | -636,252 |

The final main package has 93,852 B free under the existing 2,097,152 B repository limit. Root's concurrent Map/Sky lifecycle implementation is included in the final build, so the table is a combined source result, not an isolated timing or per-feature size comparison. The shared icon resolution adds 1,107 B to common.js; the client split then reduces common.js by 12,684 B (458,954 → 446,270 B). The four moved function bodies match HEAD exactly. No claim that bytes saved equal runtime milliseconds is made.

## Owners and decisions

### Duplicate packaged images

Before the change, byte-identical images duplicated between packages totaled 1,117,402 B. `src/components/main-b-icon-files.json` now provides one declaration for the existing main bitmap list and main-only derivative exceptions. The build stops copying those identical main images to ordinary child packages; `SemanticIcon` resolves them to the already resident main path. The remaining cross-child-only duplicates stay in their packages: putting them all in main would worsen cold startup and the limiting main budget.

The two main-only 96px parking/restroom variants remain independent from the larger spot/content derivatives. Native `spot/native/packaged-icon` keeps its existing deferred ornaments and original spot paths. Existing Tab variants, themes, image files and hit geometry remain unchanged. This is ordinary-subpackage reuse; future independent subpackages need their own ownership decision.

The asset comparison verified 261 retained image/style/WXML/WXS files were byte-identical and every removed duplicate had an exactly equal main replacement. All facility derivative and native deferred ornament inputs were retained. Evidence: [package-assets-verification.json](package-assets-verification.json).

### Shared main JavaScript

The baseline main package contains 1,023,078 B JavaScript, 643,913 B PNG, 226,769 B WXSS and 90,229 B WXML. Its largest files are common.js (457,847 B), Map index.js (234,401 B), taro.js (131,050 B) and Map index.wxss (103,864 B). These are actual emitted file sizes, not source sizes.

The approximately 79 KB concatenated API module included Sky-only operations because the main and Sky consumers imported the same module. `services/sky-celestial-client.ts` now owns `getSkyTargetInstant`, `getCelestialObjectInformation`, `searchCelestialObjects` and `getCelestialObjectPosition`. Every production consumer imports that owner. It still uses the original `requestOperation` and `invalidateApiCache`, and the adopted BSC report version remains one exported constant under `sky-report-catalog.ts`. Endpoints, private-proposal authentication, request cancellation, namespace/version keys and wrong-publication rejection did not change.

The roughly 85 KB contribution editor in common.js is currently a real Map dependency. Splitting it into a new asynchronous experience would affect the existing editor flow and recovery, so no forced relocation or speculative lazy framework was introduced. The main entry's public-image cache initialization and account cache clearing are also real lifecycle responsibilities; blindly moving those could break startup cleanup or erasure.

### CDN and loading

Actual astronomical catalogues and published Sky images already use hash-bound remote resource paths through `services/sky-resource-origin.ts`, with separate configurable `MINIAPP_SKY_RESOURCE_BASE`. Discovery and authenticated API requests remain on the business origin, and operator credentials are not sent to a separate resource origin. The existing encoded file owner already bounds cache and active I/O; compressed bytes do not establish decoded/GPU memory cost.

The isolated candidates deliberately use `https://api.starward-ci.invalid`, so they prove packaging and binding only. The existing deployment Context selects OSS/ESA but has no current deployment/throughput receipt. No actual CDN speedup was measured or asserted here. Moving required local controls to an unverified remote host would add network/error dependencies and would not remove their decoded-memory cost.

The 452,762 B of representative JPEGs in the Sky package have dynamic catalogue/fixture references (`packages/miniapp-contracts/src/catalog.ts`). They were not deleted on the basis of absent literal references in frontend components. Their ordinary-vs-fixture delivery contract needs explicit consumer/source retirement before removal. A bounded lossless PNG recompression probe could save only 210 B across all runtime icon inputs; it was not adopted because it adds processing and byte churn without useful benefit.

`lazyCodeLoading: "requiredComponents"` already exists. There is no new eager preload of the entire Sky package. The resource deduplication reduces bytes fetched for Sky/spot/content but does not by itself prove first-frame time; root's runtime entry/exit observation owns that claim. The final main budget remains tight and must be measured on each final candidate.

## Verification and limits

- Three existing SemanticIcon/native-loader behavior tests pass, including main reuse, preserved package variants and invalid native roles.
- Thirty-two existing celestial request/response, catalogue selection, cancellation, optical source, private proposal authentication and source-page tests pass after updating their function-owner paths.
- All four moved function declarations were compared against HEAD and are unchanged.
- Baseline, icon-only and final ordinary isolated WEAPP production builds pass. Existing build warnings remain; live `dist/weapp`, DevTools and frozen release candidates were not overwritten by this subtask.
- Typecheck passed after icon changes. The later full application typecheck reported only two concurrent lifecycle-test errors in `use-panel-return-position.test.ts` (top/left on never); root owns their repair and final rerun. This is not recorded as a final passing typecheck.
- `tools/miniapp/built-candidate.test.mjs` now verifies exact shared bitmap bytes and absence of child duplicates; its release-manifest-bound suite must run against root's final release candidate rather than the old frozen pre-optimization bundle.
- No whole-product/device visual acceptance or network/CDN timing was performed by this subtask. Root's runtime work and independent review must preserve those evidence boundaries.

Build invocation (three distinct slots, no shared live output): `MINIAPP_ISOLATED_CHECK_BUILD=1 MINIAPP_ISOLATED_CHECK_BUILD_SLOT=package-audit-1018[-after|-final] MINIAPP_API_BASE=https://api.starward-ci.invalid MINIAPP_SKY_RESOURCE_BASE=https://api.starward-ci.invalid npm run build:weapp --workspace @starward/wechat-miniapp`. Raw logs, file/module inventories and bounded probe scripts stay in this task's ignored `tmp/package-audit/` directory.
