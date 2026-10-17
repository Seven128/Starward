# Current API test classification — 2026-10-18

This is a read-only classification of the current integrated run, not a rerun or repair receipt. The inherited historical 1,824/52 figures are not used as the current result.

## Candidate and observed result

- Repository HEAD: `32ec61a4f5321e571d499be6430a09918d65242e`, with the existing uncommitted task changes. The relevant test and production files below had no working-tree differences; the API package entry has the current quoted recursive test pattern.
- Log: `tmp/release-code-current.log`, SHA-256 `f8afff9617329055f17575d7a5446c4431037e837a9bf37d9e23b933b19f7e74`.
- Command in the API workspace: `node ../../tools/run-node.cjs --import tsx --test "src/**/*.test.ts"`.
- API: **994 tests, 950 passed, 6 failed, 38 skipped, 0 cancelled**, duration 229,708.031 ms. The log's lines 1130–1137 contain the complete summary; lines 1141–1303 contain all six failure details.
- Contracts immediately before API: 84/84 passed. The enclosing release-code entry stopped at the failing API workspace; it did not establish a Mini Program test result. Mini Program is being evaluated independently by the parent task.

## Six failures and responsibility

| Test / first failing assertion | Actual vs old expectation | Classification and decisive evidence | Repair boundary |
| --- | --- | --- | --- |
| `workers/miniapp-api/src/bsc5p-http.test.ts:74` — real BSC catalog through HTTP and Mini renderer | 8,404 vs 4,255 points | **Stale consumer assertion, Sky full-sphere geometry owner.** The test still filters independent `positionBsc5pCatalog` output to `visible`, while `sky-stellar-scene.ts:103–105` intentionally retains every real catalog position. The removal of the horizon filter predates this merge (`e2136ebf5`). Full-sphere browsing and below-horizon truth are retained product behavior; `sky-full-sphere.test.ts` contains the direct owner coverage. | Compare all independent source positions, identity/order and exact coordinates, including below-horizon positions; retain the actual HTTP, catalog/detail identity and payload-budget assertions. Do not restore a visibility filter in production to satisfy this older test. |
| `workers/miniapp-api/src/chinese-mizar-publication.test.ts:18` — original neighboring identities | Wikipedia source present where the test forbids any | **Stale negative fixture expectation, Sky Chinese introduction owner.** Current admitted v79 has the independently identified HR:5062 Alcor introduction (`HD 116842`, `HIP 65477`), with its own fixed English-source translation and alias `開陽增一`. HR:5142 has no row in this publication. The failure is not evidence that Mizar A/B identity or prose leaked to Alcor. The earlier exact facts/alias/Mizar identity assertions passed before the negative-source check. | Preserve the distinction from HR:5054/5055; assert independent source/identity for newly supplied HR:5062 and retain honest absence for HR:5142. Never delete the admitted Alcor material to make the historical absence assertion pass. |
| `workers/miniapp-api/src/sdss-science-static-export.test.ts:46` — static optical export | 32 vs 24 routes | **Stale static-export consumer assertion, Sky asset/publication owner.** `publishedAssets()` still yielded the expected 24 images (the preceding assertion passed). `sky-public-asset-export.ts:121–124` additionally exports one public source manifest for each of six ordinary + two explicitly admitted science publications: eight more routes. This source-manifest export was added before merge in `18cf17d3e`. The current dedicated `sky-public-asset-export.test.ts` source-manifest test passed in this same log. | Separate exact image records from source-manifest records while preserving hash, bytes, headers, delivery fragment, invalid-byte rejection/recovery and prohibition on private scientific internals. The later blanket `/manifest/` prohibition in this older test is also obsolete and was not reached. Public source manifests must not be removed. |
| `workers/miniapp-api/src/sky-luminary-consumers.test.ts:67` — information sources | 3 vs 2 sources | **Stale source-count assertion, Sky luminary/Chinese introduction owner.** `celestial-object-information.ts:130–131` combines the two scientific/reference sources with the admitted body introduction's distinct editorial source. Current v79 contains both SOLAR:SUN and SOLAR:MOON introductions. Recovery and source-credit assertions before this loop passed. | Assert the required scientific/publication sources and independent editorial source according to actual supplied content, preserving mutation isolation, content revision and missing/recovered lunar publication behavior. Do not discard attribution or regress valid content to meet a fixed count. |
| `workers/miniapp-api/src/sky-scene-catalog.test.ts:118` — BSC v3 + SAO composition | 414 vs 4 points | **Stale consumer assertion, Sky full-sphere supplementary catalog owner.** `sky-stellar-supplement-scene.ts:38–40` retains every real row of the delivered tile and its exact transformed position, including below-horizon rows. The horizon-filter removal also predates merge (`e2136ebf5`). Catalog version/time geometry assertions passed before this old count. | Verify against the actual admitted tile rows and independent transform, retaining base-catalog mismatch and publication identity rejection. The old-version rejection below the failed line was not executed in this run. |
| `workers/miniapp-api/src/stellar-scene-client.test.ts:24` — revisited exact-time frame | Whole objects are structurally alike but not deeply reference-equal | **Stale internal-shape assertion, Sky render-frame memo owner.** The implementation now adds `displayTransmission` and `displayDirection` lazy closures per resolved frame (`sky-stellar-scene.ts:110–120`, introduced in pre-merge `18cf17d3e`). On time revisit, the single-frame policy deliberately creates a new frame with new closures; `deepStrictEqual(revisited, first)` therefore fails on function identity, while the earlier same-frame gesture reuse and changed-time coordinates passed. | Compare stable frame data and relevant returned display values instead of function identity; retain same-time object reuse, single-current-frame replacement, invalid-time/catalog/observer rejection and compact wire-frame assertions. Assertions after the current failure remain unexecuted. |

These are six failures, with five obsolete content/count/geometry expectations and one obsolete function-bearing object comparison. They are test-consumer maintenance within cloud-sky internals. This inspection found **no direct failure attributable to the current Map↔Sky lifecycle changes, selected-point focus, terrain, annual light, or cloud Map work**. It does not prove that all product behavior is correct; no failed test is relabeled passed, and unreached assertions still need the owner's focused rerun after repair. The Sky owner is responsible for the actual fixes. If the parent task elects to maintain these tests as a shared entry responsibility, changes should remain within the exact behaviors above rather than expanding Sky features.

## Evidence directly relevant to this task

Current passing API tests include public Map weather/cell/time coherence; annual-light image continuity; terrain registration contract and range gates; Map/Spot shared terrain source ownership; horizon public-route recovery, source-bound sectors and shared cancellation/download limits; independent terrain/light absence vs real zero; exact context expiry and Map/Sky selected time; published photo group/ownership rules. Examples appear at log lines 775–779, 814–816, 843, 1038–1073 and 1083–1114.

Those passing software checks support keeping their existing implementation/evidence. They do **not** close the inherited physical-device duties: actual 4 km coarse-to-selected focus/centering, native continuous pinch and terrain registration/detail, readable horizon/photo presentation, real share reception/file handoff, or missing device environments.

## Skipped environment-dependent scope

The 38 skipped tests are explicitly gated PostgreSQL/PostGIS, Redis and/or published-data integration tests, not part of the six failures. They cover account erasure/write races, contribution/media persistence, event publication, plan/reminder persistence, repository/runtime recovery, context concurrency, and fixed annual-light publication. This run cannot certify them.

The most immediate inherited H4/H8 gap is `workers/miniapp-api/src/night-light-http.test.ts:21`: it requires both `MINIAPP_EOG_FIXED_TEST_ROOT` and `DATABASE_URL`. The root supplies `fixture.json` and a genuinely published fixed dataset; the test requires an isolated local `starward_eog_test_*` database. It was skipped in this run. Keep the prior r6 509-cell/5-level publication evidence valid within its original scope, recover the needed environment by existing owners when a current dependent check requires it, and never treat a Git merge or a generic API pass as migrated publication/database evidence. Do not print credential values or substitute synthetic fixtures for the required real publication.

No tests were rerun and no production or test source was edited during this classification. Only this task record was created.

## Source binding (SHA-256)

```text
8f8f031cd5fa85679ea08ad68e197b25de1e05d9e7d6831e549658234d4b2e9c  workers/miniapp-api/package.json
5f6c4c5976428d167f25d0cc653823ab7daa955ca17a6abbcc2ec04168c6a1be  workers/miniapp-api/src/bsc5p-http.test.ts
ec517e32031c3b5eabac5e4b19109059f0bbaf235f863cc59ef7c09a0209e474  workers/miniapp-api/src/chinese-mizar-publication.test.ts
ef575fcf6d64de780d476262258321549a0c823c2f3250a71f7b5b6b46d75b36  workers/miniapp-api/src/sdss-science-static-export.test.ts
3c6970d034be0dabcd13d724eb8eaf2435e0506bfc5c40447203b4428ea64419  workers/miniapp-api/src/sky-luminary-consumers.test.ts
36b4713462b037e299e716ef1978d8ac4eb61a6f94f21a4cc03ed4e80e8a4a6b  workers/miniapp-api/src/sky-scene-catalog.test.ts
0a49cc7b521ce92f8afa573da7edd8199d0c46990514b342dd8d6953aea1632d  workers/miniapp-api/src/stellar-scene-client.test.ts
28ff1b90a969be1545d87e77d648d5b360015801444420678ce1862a84a74107  apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts
ed05a7d0d83bc439ca01173cd5ab58aca17d77e2bc722004a9582e87ae26b895  apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts
51638b1434fed1f53e31b7950300071f9afc8e34c4bfc689ca399e84cb1f6b36  workers/miniapp-api/src/celestial-object-introductions.ts
ec640a1a5297edac7f8070474aa116d66aef75684b2d2c5ca605e9658703c059  workers/miniapp-api/assets/celestial-object-introductions.zh-cn.v79.json
19d0d9295ada5fa47a24a845b3826bbbfa165eefa026d9f8bdadf9ff636725d7  workers/miniapp-api/src/celestial-object-information.ts
29d50783bfd2ca619fa53943291d5859f8c9f302a4e7be5e9b6878b82667d42b  workers/miniapp-api/src/sky-public-asset-export.ts
```
