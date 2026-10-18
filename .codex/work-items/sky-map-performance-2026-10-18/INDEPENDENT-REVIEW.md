# Independent review — Sky/Map and package optimization

## Current follow-up review packet — pending

No independent reviewer has reviewed the later shared overlay/clock and phone-driven repairs as a complete delivery. The historical review below remains limited to its own hashes. Current implementation checkpoint is7472659d;9e5c75ef adds evidence only, and Product CI39095632949 passed for that combined source, including the clean Linux tests, builds and isolated infrastructure checks. The root's investigation is self-review, not an independent verdict.

Review the new responsibilities against REQUIREMENTS, INHERITED-REQUIREMENTS and the unchanged PLAN:

- Terrain/shared reads: `workers/miniapp-api/src/shared-read-pool.ts`, terrain service/viewport/window renderers, night-light service/window and the client terrain coverage/query owners. Check last-reader cancellation, joined ownership, bounded advancing work, deadline/queue cleanup, cache publication identity and preservation of valid overlapping native coverage.
- Cloud validity: geographic sample-cell identity, independent missing/zero meanings, the forecast/resource-query receipt clock and `use-map-cloud-presentation` retention. Check actual selected hour, source age/expiry, account/context/layer/visibility retirement and late-query receipt association. Phone time alignment must not rewrite provider timestamps or extend declared validity.
- Current native and package consumers: reuse the earlier Map/Sky and package findings where hashes/behavior still match; review changed source/bitmap consumers, particularly the poster's mounting-page resolver. A package-size pass does not prove native decoding or user navigation.

Evidence entrypoints: OVERLAY-FIRST-REPAIR, OVERLAY-SERVICE-MEASUREMENTS, CLOUD-CLOCK-REPAIR, PHONE-GEN4-REVIEW, PHONE-GEN6-VERIFICATION, PHONE-VERIFICATION and REMOTE-CI-CHECKPOINT. Current frontend inputs/bytes are pinned in OVERLAY-SOURCE-SNAPSHOT/OVERLAY-CANDIDATE; backend measurement inputs retain their separate hashes. Private phone recordings/frames remain outside Git under the existing task review root; inspect actual frames/sequences before making visual or motion claims.

Material open limits must stay open in the review: no demonstrated stable cold/visible-gap speedup, no recovered original r6/fixed-terrain/database environment, remaining pinch/registration/finer/private/submitted-entry and iOS obligations, missing qualified photo metadata, desktop automation unavailable in the latest bounded attempt, no confirmed N05 identity on this environment, and no real recipient/export-file handoff. One actual SPOT poster save does not close H6. Reuse still-valid tests; request additional checks only for concrete findings or uncovered required behavior.

## Historical review

Review date: 2026-10-18 (Asia/Shanghai). Reviewer: delegated `performance_review`, independent of the implementation agents. Base: `32ec61a4f5321e571d499be6430a09918d65242e`. Review covers the working-tree changes identified below; it does not certify later edits automatically.

## Result

No remaining actionable code defect was identified in the reviewed scope after the two return-recovery findings below were repaired and locally reread. Native/runtime obligations remain explicitly unverified by this reviewer.

## Findings repaired during review

- **P2 — Late rejection of an old return could cancel its retry.** The initial exit catch unconditionally called `cancelReturn()`. After timeout and retry, a late rejection from the first `switchTab` could reset the second attempt's journey, losing restoration. The final lifecycle owner now returns a unique numeric ticket for every issued return, tracks outstanding requests, and only removes the ticket whose operation actually failed. Another pending return or an already mounted Map keeps the journey intact. This fixes the cross-attempt cancellation at its owner rather than relying on an unrelated UI flag.
- **P2 — Timeout could discard a still-issued native return.** The original `onTimeout` reset the journey even though native `switchTab` cannot be cancelled. A late success then caused the new Map to discard its saved panel and skip reveal. The final timeout only releases the UI lock; the outstanding native return remains available to the new Map. Map mount clears the outstanding tickets; definitive failure retires its own ticket. The reviewer reread both updated owners and the focused late-success/late-rejection regression cases. Root's saved current log reports 28 passing navigation/lifecycle tests. Both findings are closed for the hashes below.

## Reviewed behavior and evidence

- Entry uses `redirectTo` and saves only the current panel presentation. Map camera, selected observation Context, filters and account state remain with the existing app-store owner. The snapshot now explicitly picks four scope fields, does not retain the complete store/functions, invalidates on account/reset/selection/open-version change, and releases its subscription on take/discard. The formal-spot entry also refuses an outstanding Context edit. Scroll restoration waits for the corresponding panel content and rejects changed gallery identity.
- Entry/exit share one 220 ms blackout controller; successful navigation leaves the source shield until hide/unmount, failed navigation releases it, and pending preparation is fenced by current scope. Map reveal waits for an actual native Map update or reports its timeout/error. An `onUpdated` event is evidence of a native Map update, not proof that all tiles, reports, imagery and panel data are fully rendered.
- New Sky API ownership preserves all four moved function declarations exactly. The reviewer independently ran the AST comparison against HEAD: fine-time target, object information, search and object position bodies are unchanged. Production callers use the new owner; shared transport, cache, auth and catalogue identity remain the originals.
- Icon copy selection and runtime resolution share one declaration. Static consumer inspection found no removed child bitmap path still used by production code: other direct paths are main markers/selected stars/tabbar and the preserved native spot loader. Ordinary subpackages can consume the existing main resources; parking/restroom's different main variants remain separate. The package agent's recorded byte comparison accounts for all 39 removed copies, each with a byte-identical replacement, and retains the product images. No production file/content deletion is used to claim the reduction.
- Branch cleanup preserved main and the current worktree branch. The reviewer independently reran `git merge-base --is-ancestor` for both deleted remote tips against main; both returned 0. Current local/tracking refs preserve the two protected branches at the merge commit. The cleanup receipt records atomic remote deletion with exact per-ref SHA leases and remote readback. This reviewer did not perform another remote mutation.

## Verification boundaries

This is a code/contract and existing-evidence review. The reviewer did not build, restart services, operate DevTools, or run a whole repository test suite. Native `redirectTo` teardown, target-runtime black-frame composition, actual map/panel scroll restoration, physical Back/PageContainer behavior, GPU/native resource release, real first-frame timing, and CDN/network performance are **not independently verified here**. Root owns the current bound DevTools observations and the final candidate validation. Static CSS, hook harnesses, source assertions and package byte counts do not establish those runtime results. Review of the retained resource owners does not reopen whole-product design acceptance.

## Reviewed inputs (SHA-256)

Paths below are repository-relative. Hashes bind the material inputs read at this review checkpoint.

| Path | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/navigation/page-blackout-transition.ts` | `48a11dbf33a8b3a588cd6fe2da4642941f3f22e1c727ab76403d2e26786c1c28` |
| `apps/wechat-miniapp/src/navigation/sky-map-lifecycle.ts` | `296feb228df897de8f46c44411c75f780fee229645c79cde8b9800ad9c739788` |
| `apps/wechat-miniapp/src/navigation/sky-map-lifecycle.test.ts` | `90f9091f5e7f6b79b853cbd7b66810bd252ebae8af8597cfb298ad1270e623b3` |
| `apps/wechat-miniapp/src/pages/map/index.tsx` | `093e5d090596f621a717ff75fa01e935958b9db971b90177a77ca43dfcc8996c` |
| `apps/wechat-miniapp/src/pages/map/sky-return-state.ts` | `6de730928626867b688b4995d465b8aab11580971ff5889b0b7ad0aed034efef` |
| `apps/wechat-miniapp/src/pages/map/use-panel-return-position.ts` | `ff740851ab287d6a00ee6fbfb9775d744a234fe10fb9dd3a182b2924ce705645` |
| `apps/wechat-miniapp/src/features/sky/use-sky-page-exit.ts` | `cec2afcde08199ee870bd00901acc61567523665b02ea7c2dbb5364c7b8d040e` |
| `apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx` | `d752e66783f7d262ea2d0041305f1f7f5e41da97b3e373e4824354b961115bb8` |
| `apps/wechat-miniapp/src/features/sky/sky-page-navigation-ownership.test.ts` | `d81ae687bbd19db8ab5a7dd8c559a7ed45e01031c41a82adf9e8d29f6e6004d2` |
| `apps/wechat-miniapp/config/index.ts` | `af245c6a8be9a07c82e24cb1537ece55092d6595ae7b8517d32e65eddb699e25` |
| `apps/wechat-miniapp/src/components/semantic-asset.tsx` | `c3b6a6a6f547369ae547d2849dec9286bb46aa832003aeaa9f996f98ba7b3afc` |
| `apps/wechat-miniapp/src/components/main-b-icon-files.json` | `6a0983f1d84509c48ad32db00ede7c34a828e88b498f8c05adbe8631ff86e2cb` |
| `apps/wechat-miniapp/src/services/sky-celestial-client.ts` | `c4f24c7c22122b76ea5c293516a388f03c2e9a0bf9b932d476a5e72f1e4d561a` |
| `.codex/work-items/sky-map-performance-2026-10-18/BRANCH-CLEANUP.json` | `41ba9e0b95611558880fddf3f0eedb98d2532d6b146ca78ca6e78799068b0486` |
