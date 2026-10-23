# r24: annual-light release metadata scheduling

2026-10-21. This is a local implementation/evidence result, not device acceptance or a replacement plan. The active services, PostgreSQL, IDE, phone, VPN, pairing and delivered candidates were not operated. No source data was uploaded and no Git operation was performed.

## Current implementation, rather than the historical hypotheses

| Responsibility | Current implementation | Remaining boundary |
| --- | --- | --- |
| Annual-light window identity/concurrency | `NightLightService` already shares in-flight work by dataset version, inventory SHA and canonical display window. Completed images retain the existing 8-window / 16-MiB limits; binary admission remains two active reads. The old research claim that identical windows compose independently is superseded. | Actual first activation and native image replacement under rapid pan/zoom, with resource retirement, still need target evidence. |
| Annual-light client query | The client still keys actual viewport centre/zoom/bounds. The server selects the published numerical LOD, supports the historical schema-1 centre/radius adapter, and derives completeness against the actual requested bounds. | No speculative client-key coarsening was applied: equal image identity alone does not establish equal complete/partial response semantics. |
| Cloud acquisition/presentation | Actual viewport samples, full-hour source reuse, original source/retrieval/valid times, missing-cell masks and retained public acquisition are already implemented. Selected-hour projection uses those samples; retained imagery is not stretched into unqueried coverage. | Real-provider and target selected-hour/viewport behavior remain unverified. MapScene cancellation does not currently cancel all service work, but QWeather intentionally permits its shared source acquisition to finish/cache; this was not reclassified as a proven defect or changed without a scoped comparison. |
| Terrain supply | Shared source reads, two advancing cell readers, stable client window identity, retained coverage and published parent preview are already present. Parent preview does not complete the final fine request. | The existing actual fine-source I/O cost and final-detail visible wait remain. This task did not repeat uncontrolled source-network runs, expand preproduction coverage, or change detail/parent semantics. |
| File/native resources | The independently reviewed r23 unlink-recovery repair and prior native replacement/controlled retirement changes remain separate. | This task neither changed those owners nor certifies native/JS/GPU leak freedom. |

## Located cost and narrow repair

The real restored r6 release contains 509 hash-bound proof files. A fresh local `NightLightService` with four concurrent consumers of its existing prepared z11 2×1 window spent 345.81 ms overall: 327.40 ms before entering the prepared-image reader, then 18.14 ms in that reader. There was exactly one prepared read; four asset consumers together took 0.60 ms and a subsequent layer call 0.18 ms. This establishes a first-release metadata bottleneck for this local path, while confirming that same-window sharing and completed reuse already work.

`night-light-service.ts` now runs at most two proof readers **per release**, writing results in inventory order. The release cache receives a value only after every proof validates. The first failure aborts the peer signal and stops further admissions; both readers settle before the failed shared release retires, allowing a later request to retry the whole inventory. The same validation, proof identities, source/quality semantics, completed-release cache and consumer cancellation policy remain in force. No additional pool, dependency, configuration option or endpoint was added.

The two-reader limit is not a service-global metadata limit. The existing `ComputationCache<Release>(8)` bounds retained values/shared active identities; excess identities compute without retention. Ordinary Map/Spot consumers select the configured current dataset, while old immutable asset URLs may request other published versions. That existing multi-version admission behavior is unchanged and is not presented as a global two-read or leak-free guarantee. Image/window binary admission remains unchanged.

## Bounded comparison and checks

After the separate Sky timing run completed, four independent processes ran in A → B → B → A order against the same real r6 files and sealed publication. A uses the preserved pre-edit source with only imports relocated in a private ESM loader; B uses current repository source. OS filesystem caches were not flushed. These are fresh owner instances, **not source-cold storage measurements**.

| Local elapsed measurement | A1 before | B1 after | B2 after | A2 before |
| --- | ---: | ---: | ---: | ---: |
| Release/selection before prepared read | 304.93 ms | 152.83 ms | 151.40 ms | 295.84 ms |
| Four concurrent layer consumers complete | 321.67 ms | 168.30 ms | 167.17 ms | 311.84 ms |
| Prepared read count | 1 | 1 | 1 | 1 |
| Prepared image read | 16.46 ms | 15.22 ms | 15.51 ms | 15.76 ms |

All four samples returned the same metadata and 4,276-byte PNG SHA-256 `b6f09db480cb146e50acdb7a16e4d9567fb2751727136cbb6d6aa0288047be7a`; four asset consumers took 0.52–0.57 ms and the warm layer took 0.15–0.19 ms. The finite comparison answers the metadata scheduling question and stops here. It does not establish phone touch-to-image improvement, network latency, broad-area behavior, sustained resource growth or no leaks.

The local observer projects the pinned public manifest/proof into the repository port. It performs no DB access and makes no new DB-activation claim. Input inventory SHA-256 is `d91fd8f7fcdd68d63f9a219df11fdad13673fefa2e1a99e313a148e29676c5bd`; selected sealed Map publication is `89f3491ed136bb24c18a49ce8b92cd484dd2378bf889610153ab8f52cff514d0`. It changes no publication files.

- `node ../../tools/run-node.cjs --import tsx --test src/night-light-window.test.ts src/night-light-prepared-window.test.ts`: 14/14 pass, no skips. The new gated filesystem case observes only two active proof reads, forces a hash failure while its peer remains live, verifies no third proof starts and no consumer receives a partial release, then drains all four failed consumers and recovers on the same service. Existing immutable URL, pixel/quality, missing/corrupt prepared-image, source disabling, publication identity and cancellation cases remain.
- `npm run typecheck --workspace @starward/miniapp-api`: pass.
- Independent review, restored-lane HTTP readback and any service rollout belong to the parent integration task. This child did not start/restart a service or rebuild a Mini Program candidate.

Two initial private comparison-loader attempts failed at module resolution and ESM/CJS class instrumentation respectively. Neither produced an accepted timing sample; the loader was corrected to resolve the same repository modules as the actual service before the four runs above. No failed tool route was retried beyond resolving those concrete local harness boundaries.

## Preservation and delivery

Private local directory: `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r24-independent-20261021/overlay/`. It retains the original service source, the read-only observer and comparison driver, baseline JSON and the four `night-light-owner-before/after-1/2.json` samples. No upload was performed.

Changed source identities:

- `workers/miniapp-api/src/night-light-service.ts`: before `6c1beb6394da567047a21697b08450851f3044d8ce4535e15a7b8b51f757c5ae`, after `b1be19128557997607582128f22dfdd1371b0f77811f766d85105d7187920334`.
- `workers/miniapp-api/src/night-light-prepared-window.test.ts`: `73e435de7d8aa728144b562c9e30ef5a67c8bd8c86fc3c4288ffedf803b59b00`.

No change to PLAN, HANDOFF or durable Context was made by this child; the parent owns integration. User intervention is not needed for this local repair. The two requested product outcomes and full Goal remain open.
