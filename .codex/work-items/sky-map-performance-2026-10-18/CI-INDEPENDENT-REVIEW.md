# H7 shared CI independent review — 2026-10-18

Reviewer: `/root/ci_independent_review`, separate from both implementation agents. Reviewed the current edits, their callers and the recorded bounded evidence. No production source, test, package, plan, Git ref, phone or IDE state was changed by this review.

## Conclusion

No blocking code or test-integrity finding in the reviewed repair. The portability change removes reliance on ignored historical output without relaxing the deployment boundary; the selector change keeps the component's behavior; quoted patterns let Node own recursive test discovery in all three workspaces. This review supports integrating these repairs, not declaring all H7/product/device obligations complete.

One nonblocking evidence-record correction was sent to the parent: `CI-SHARED-ENTRY-REPAIR.md` says four current `SkyMenuAction` keys. The current source has five: return, search, time, layers **and red-light (`sky-red-toggle`)**. The generic native `id` change applies to all five without changing their handlers or expanding night-theme scope.

## Reviewed boundaries

- `sky-static-test-support.mjs` uses the existing root `pngjs` dependency (lockfile version 7.0.0). Both generated 2×2 PNGs are distinct, nonempty declared inputs. Expected file/byte totals come from those original inputs, not the restored output. `assertSkyStaticFixtureBytes` compares both expected routes with original bytes, so omission, substitution or payload corruption cannot pass merely because generated metadata agrees with itself.
- The helper invokes `writeSkyStaticBundle` and the real `prepareSkyStaticDelivery` with distinct revision, image digest and publication inputs. It preserves the retained two-generation URL union and disposes each preparation lease. Only Docker inspection/extraction is simulated; its step names match the existing process boundary. Temporary roots and `path.join` follow the existing tests' isolated fixture/cleanup owners; no host-specific output or live service is required.
- The three deployment diffs retain authentication and tamper rejection, original source identity, old URL preservation, ordering before DB/migration actions, occupied-path protection, lease retirement and rejection-before-side-effects checks. No test or assertion was skipped or deleted. Replacing 6,838 with declared fixture size is appropriate; added exact payload readback strengthens the positive paths. Producer/archive functions remain production owners rather than synthetic hand-built substitutes for the behavior under test. Docker, PostgreSQL and HTTP are still explicit controlled boundaries, not live-deployment evidence.
- `SkyMenuAction` changes only dynamic `data-od-id={id}` to native `id={id}`. Icon, click, disabled and expanded behavior remain unchanged. Current callers supply stable semantic keys. The shared dynamic-attribute guard remains; obsolete back-layer assertions now follow `SkyNavigationMenu`, its leave action and `NativeBackBoundary`. Existing safe-area and painted-state checks remain. The copy check follows current recovery text and additionally checks its retry action. These source checks alone do not prove emitted/native behavior.
- Each workspace now supplies the same quoted literal `src/**/*.test.ts`. `tools/run-node.cjs` forwards the argument without another shell and enforces the root Node >=24 requirement. The retained representative probe exercises the actual launcher through Windows cmd and Git Bash, checks root/one-level/deeper identities individually and reports the same three tests in each lane. The shell fix removes the observed shell-depth dependency; no assertion, file extension or discovery root was narrowed.

## Evidence and limits

Read `CI-TRIAGE.md`, `CI-DEPLOYMENT-REPAIR.md`, `CI-SHARED-ENTRY-REPAIR.md`, the discovery probe and its JSON result, and the recorded suite tails: deployment 248 passed / 0 failed / 0 skipped; shared step 36 passed / 0 failed / 0 skipped. These are implementation-run results inspected by the reviewer. No broad suite was rerun; the parent owns one integrated current-code run and classification of any newly reached failures.

The two shell lanes ran on this Windows host; they establish argument/discovery equivalence, not an executed Linux CI claim. Remote CI, final emitted/native IDs and product/device results remain with their respective owners. The documented retired SDK journey still contains obsolete menu/back selectors; it was not made valid by these changes and must not be used as current native evidence. No original N01–N06 or historical 1,824/52 result is re-certified here.

## Reviewed file identity

SHA-256 values bind this review to the current files before subsequent edits:

| File | SHA-256 |
| --- | --- |
| `tools/deployment/sky-static-test-support.mjs` | `32061ec4ed413461e56b6e55f47bd3d717162c795221f355f50ed385dcf30afe` |
| `tools/deployment/promote-release-candidate.test.mjs` | `55c3f5384cae76b998b6e267acd54ecf5fb17ed8b6bfcebd3d4aa7b2e7048a78` |
| `tools/deployment/recover-database.test.mjs` | `6101a26835b7ce0014c5b83e95fabd6e6b8e0ec8cf65d7854ca6e048202b9cb6` |
| `tools/deployment/sky-static-consumer.test.mjs` | `0029ea4378ab49e30a350831090399ca3f044ffb0ced876af4d3c5274cb3e520` |
| `tools/miniapp/workflow-conformance.test.mjs` | `9139eda86f3ffb6f7b1d3b69ed7075639da35e4314a4534907564a1a72638dd3` |
| `apps/wechat-miniapp/src/features/sky/sky-menu.tsx` | `6f2e29068a3e50f397d92c1a50c58e1eb403579c6d1ad633374f1789418668e9` |
| `apps/wechat-miniapp/package.json` | `ca09e47bfb26d2459ff973ae6e6696ce65df17cb5074d1fbcbb04492e39c68c5` |
| `workers/miniapp-api/package.json` | `8f8f031cd5fa85679ea08ad68e197b25de1e05d9e7d6831e549658234d4b2e9c` |
| `packages/miniapp-contracts/package.json` | `6ac68ac6dad3eff89eae60c238cceb730af0c91936d41a322f188a662779c3c0` |
