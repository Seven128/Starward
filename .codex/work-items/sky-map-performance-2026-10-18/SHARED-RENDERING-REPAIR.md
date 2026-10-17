# Shared rendering test repair — 2026-10-18

## Scope and diagnosis

- Tests only; no production, design resources, IDE/device, Git or plan changes.
- `shared-rendering-regression.test.ts` stripped all imports before evaluation. The current real component imports the shared main-package bitmap declaration, so the old extraction failed with `mainBIcons` undefined before testing any icon behavior.
- The retained-subpackage assertions expected `arrow-left` under each subpackage, but identical shared bitmaps now deliberately resolve to the main package. The former `search` route-binding mutation could therefore no longer distinguish a broken router binding.
- `native-back-boundary.test.ts` expected Sky's boundary only while disclosures are present. The current Map unload/recreation flow requires one boundary whenever the Sky page is visible, including empty-disclosure and loading/recovery states.

## Repair

- Added `src/components/semantic-asset-test-support.ts`; both icon test consumers now load the full actual TSX module through one CommonJS adapter. It preserves the real JSON asset declaration, substitutes only component/router/store ports, and rejects unknown dependencies by exact import name.
- Shared icons, including the deduplicated arrow/search, assert main-package paths across mounting and current top-page routes.
- Retained-package coverage uses the existing `horizon` and `parking` assets and reads their actual PNG signatures. The original mounting page continues to own those paths through child and Back route changes. A bounded top-page-binding mutation demonstrably changes the `parking` package from content to spot, retaining the regression's discriminating power without inventing missing assets.
- Sky source-contract checks now require its unique `active={pageVisible}` boundary in loading, recovery and ready branches, preserve the closing-overlay guard, and retain asynchronous `goBack` delegation. Existing navigation ownership tests continue to establish disclosure-first Back, blackout before navigation, Map recreation, stale callbacks and retry behavior; no duplicate behavioral harness was introduced.

## Checks

Run from `apps/wechat-miniapp`:

```text
node ../../tools/run-node.cjs --import tsx --test src/components/shared-rendering-regression.test.ts src/components/semantic-asset.test.ts src/components/native-back-boundary.test.ts src/components/native-back-boundary-lifecycle.test.ts src/features/sky/sky-page-navigation-ownership.test.ts
```

Result: **42 passed, 0 failed, 0 skipped**. This includes existing real React mount/effect boundary tests and the current Sky command/navigation tests.

`npm run typecheck`: **passed** (exit 0).

These are development checks. They do not replace the root task's pending native-device, visual or complete delivery evidence.
