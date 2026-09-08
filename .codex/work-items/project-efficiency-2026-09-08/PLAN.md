# Execution plan and full audit disposition

This is task-local planning requested by the user, not a new mandatory workflow, Context authority or product requirement. Do not drop an item during compaction. Update implementation decisions and actual checks in PROGRESS.

## H1 — Current verification workflow consistency

- Evidence: `project_context/areas/main/verification/acceptance-runtime.md:20` rejects retired Harness snapshot; :21 still demands it; `implementation-index.md:28` permits it; `tools/miniapp/run-wechat-devtools-session.mjs:488-521` accepts `isolated_harness_snapshot` under historical TEMP/TMP/path conditions.
- Inspect current callers/tests and owning workflow. Align the runner and documentation with the current project-owned canonical/isolated execution model; remove dead historical compatibility only where it is no longer a supported caller. Preserve candidate identity, physical-path safety, isolated TEMP/TMP, current-environment validation and process cleanup. Do not rebuild an old Harness or accept arbitrary snapshots.
- Verify relevant runner tests, canonical and rejected-path cases, context validation, existing session preservation. No design migration or blanket native acceptance matrix.

## H2 — Skill routing and persistent authorization

- `.codex/skills/uiux_design/SKILL.md:13` routes planned work to 599 KB native `docs/source-plan.md` before platform selection. Select Native versus Mini Program first; native reads relevant native Outcome; Mini Program reads its current Screen and relevant Source key. Preserve Design/Screen/adopted-resource authority and all actual gesture/accessibility requirements. Do not modify new design-resource Skill.
- `.codex/skills/starward-miniapp-release/SKILL.md:3,11-17,40` triggers on bare build, reads deployment README (40,649 B) unconditionally and requires mutation authorization in `current request`. Route ordinary local builds to build config/workflow without full release documentation. Release-specific requests retain exact target/environment and candidate checks; accept established authorization across the entire conversation. Avoid forcing human credential entry when a permitted existing local capability can do it; never disclose secrets or infer public-release authority.
- Review device Skill for the same authorization/lifecycle wording only where implicated; keep genuine phone/MFA/platform manual boundaries.
- Use global skill-creator instructions. Preserve UI metadata invocation policy; if changing openai.yaml read its creator reference. Test realistic routing cases and existing project Skill checks. Do not add tests that only enforce new prose. No generic new Skill or extra approval artifacts.

## H3 — Efficient discovery without modifying design history

- Default Context already 2,323 B; 47 Context bodies 427,478 B are on demand. Keep this; hooks/agents are empty. Do not add global auto-loads or uninstall plugins.
- Reuse current implementation index/Context maintenance to make active-code/current-owner searches bounded; historical long Source/retired workflow diagnostics only on explicit provenance need. Keep navigation short; no second requirements summary, full census or universal policy gate.
- `.codex/work-items/*long-task-input.md` is 9.44 MB and `.long-task/delivery-contract.yaml` 9.10 MB; broad rg produced huge truncated output. Improve relevant discovery guidance/command output if a concrete owner needs it, but do not move/delete these design-linked historical inputs in this Goal.
- Original Source obsolete skill names and 200% design-scope inconsistencies are deferred D1/D2; avoid routing ordinary execution through those outdated paragraphs.
- Verify actual affected links/commands and Context default list. Existing structural validation does not prove factual agreement.

## H4 — CI selection and duplicate check ownership

- `.github/workflows/harness.yml` runs full-root npm ci for every PR/main push, no cache/concurrency; Product CI runs full product/deployment/build/infra/Docker even for Context-only changes.
- Add bounded change selection at job/step level that keeps required check conclusions reliable. Pure prose/context/skill changes run their relevant checks; contracts, code, lockfiles/workflows, DESIGN/selected resources/tokens affecting build must not be skipped as ordinary docs. Check transitive inputs, manual dispatch/full mode and fail-safe behavior on diff failure. Prefer installed/mature GitHub tooling; no needless dependency.
- Reuse/cache dependency installation without weakening lockfile reproducibility. Measure what can be measured locally and do not invent GitHub CI time savings.
- `package.json prepare:miniapp:final-candidate` repeats `design:system:verify` already in `check:miniapp:fast`; `workflow-conformance.test.mjs:1205` requires repeated literal. Consolidate to one actual invocation unless an intervening input change warrants repeat. `workflow-conformance:411` and `verify-ui-contracts.mjs:8` duplicate probes checks: retain meaningful coverage once.
- `workflow-conformance:281` locks arrow whitespace; :1172-1189 locks names/loop shape despite actual-call tests at `run-wechat-devtools-session.test.mjs:114,189`. Replace implicated fragile assertions with behavior at existing owner, retaining meaningful no-H5/generated-template/cleanup invariants. Prove equivalent syntax is accepted and broken behavior is caught. Baseline 19/19 tests ~207 ms: benefit is maintenance, not a claimed huge test-speed win.

## R1 — Shared astronomy read computation, in-flight coalescing and bounded caches

- Owners: `workers/miniapp-api/src/{miniapp-service,astronomy-service,sky-scene-catalog,observation-context-service,cache}.ts`; relevant ports and tests. Map :1065, overview :1451 and getSky :1609 compute independently. Cache key currently includes context identity/revision; map-derived contexts use new UUIDs, so merely calling getSky is not enough for cross-map reuse.
- Inspect callers, publication versions/invalidations, actual weather expiry and selected-time axis. Put reusable calculation/cache responsibility at the current AstronomyService or smallest adjacent owner; do not merge native and Mini Program domain services. Reference native ForecastQueryService inFlight pattern only for semantics.
- Reuse common computation across map/overview/sky and same concurrent requests; separate pure astronomy/scene work from weather freshness as needed. Avoid constructing full star frames for map-only decisions if a coherent staged calculation preserves the public shape. No fake UNAVAILABLE scenes or lowered data truth just to save CPU.
- Cache identity must include all effective inputs: formal spot factual revision/data, timezone/night date, exact selected UTC time including off-cadence instant, target/event/profile, algorithm/catalog identity and relevant weather/run/official-alert validity; preserve current caller context in envelope. Never reuse private route/user context across identities. Preserve publication/deletion invalidation and fail-closed safety.
- Add bounded capacity/TTL and request coalescing with failure cleanup; cancellation must not abort other callers' shared work. No unlimited Maps as new infrastructure.
- Test map→layer→overview→sky reuse, same and differing inputs/users, exact time, catalog and spot version change, expiry, unavailable/partial/failed/retry, concurrent misses, repository lifecycle. Run existing numerical, decision, map exact-time tests and comparable baseline probe.
- Baseline real Gaia2048/20 frames, deterministic weather+memory repo/cache: 8 synthetic spots map cold 963–1076ms, cloud switch803–876ms; each 8 weather calls/160 projections; same cached map1–2ms. 1 spot4 simultaneous equal cold requests made4 weather/80 projections (~423ms). Real network/Postgres not included. Fixture duplicate geography means gzip result is not a realistic multi-place transfer estimate.

## R2 — Client response-cache persistence and byte limits

- Owner `apps/wechat-miniapp/src/services/api-client.ts:59,206,218,475`; related cache-policy, request lifecycle, QueryClient, auth/account/clear-cache paths. Maintenance boundary calls for extraction of response-cache adapter when changing transport policy: use a small coherent module, one current cache owner.
- Full sky baseline680,798 JSON chars/707,203 bytes/gzip~222.7KB, scene569.6KB/target frames96.1KB. Threshold300,000 chars rejects it from both response Map and durable storage, while React Query may retain current-session data. 8-spot cloud sample also exceeds. Every accepted GET currently serializes length then synchronously rewrites up to24 entries in a single storage key before resolving network Promise.
- Separate bounded in-memory conditional response reuse from persistent offline cache; actual UTF-8 byte accounting, total budget, per-item/storage-key limits, atomic manifest/entry or chunk writes, asynchronous/coalesced persistence and recovery. Keep implementation proportionate; reuse Taro storage primitives. Do not merely raise threshold or claim server offlineReady proves local persistence.
- Preserve exact representation keys, auth scope/session refresh, ETag/304 body matching, expiry/stale max30min, cancellation/supersession, mutation invalidation, logout/deletion/clear-cache semantics, privacy and schema migration from existing stored response cache. Async in-flight writes cannot restore deleted identities. Corrupt/full/partial writes must not invalidate good network results or fabricate data. Cleanup stale/orphan chunks and use bounded resource count/size.
- Test real-size sky >300k, unicode actual bytes, restart readback, manifest/chunk corruption, out-of-space, aborted/superseded request, concurrent writes, scope changes/account erasure/clear while writes pending, ETag/invalidation, expiry, bounded eviction. Relevant app tests/typecheck/build; real device storage/readback if tool capability allows. Honest distinction between mock platform and actual device evidence.

## R3 — Provider deadlines and shared-request lifecycle

- `weather-provider.ts:199/204` fetchJson has no application deadline; QWeather composition :1114 waits three paths; Astronomy :255 passes no signal; frontend request timeout10s doesn't cancel server upstream.
- Add bounded provider/overall deadlines and cancellation using existing transport boundary, with separately attributable partial/unavailable results. Integrate with R1 reuse/in-flight semantics; do not weaken official-alert hard blocking, select clearest model, invent weather or turn stale cache into fresh evidence. Respect CNY200/month personal-trial budget; tests use injected transports, not real remote quotas.
- Test a hanging provider, slow body, caller abort, each lane timeout while others valid, all timeout, cleanup timers/listeners, retry after failure, no cancellation of other active shared consumers. Ensure configured deployment request budgets and client10s are coherent; document exact owner defaults instead of duplicating values across Context.

## R4 — Viewport query path and factual read reuse

- `miniapp-service.ts:995` listSpots then :1020 listSpotsInRadius then ID intersection. PostgreSQL :382/:397 already enforces matching publication/status/visibility/freshness checks and GiST index exists in migration001.
- Query viewport candidates directly when viewport exists; preserve no-viewport behavior, PUBLISHED/TEMPORARILY_CLOSED restrictions, test-fixture exclusion, coordinate conversion, ranking/filter output/unknown behavior. Inspect per-spot getSpot/getDetail calls; batch or reuse fact reads where naturally supported without scope explosion/new source of truth or loose publication gate.
- Test both repository kinds and viewport/no viewport, visibility/status/assessment/version/freshness, search/filters, empty results and differing contexts. PostgreSQL meaningful test/EXPLAIN if local environment available; do not claim DB performance without it. Do not arbitrarily cap ranking inputs.

## R5 — Technical sky canvas scheduling (no redesign)

- `spot-sky-page.tsx:1096,1308` updates pose state; draw measures bounds and creates context per pose. Preserve current rendered content, visual rules and exact time frames; don't port adopted designs or alter page geometry/assets.
- Extract/cache canvas measurement/context in existing lifecycle where valid; coalesce pending sensor frames, use latest pose, separate high-frequency drawing from low-frequency state. Retain hidden/unmount cleanup, size/orientation changes, error/expiry clear, stale/denied sensors and revision cancellation. Read current UI Skill/Screen before edits. If optimization depends on new layout migration, explicitly leave that dependent portion D3, not guessed.
- Add meaningful scheduling/cleanup tests; perform WEAPP/runtime/device verification using existing project tools as available. No claim of FPS improvement from mocks/screenshots alone.

## R6 — Android release size without removing supported devices

- `apps/mobile/android/app/build.gradle:69,116-118`: release minify/shrink defaults false; gradle.properties:31 four ABIs; Hermes already true. Simulator verifier explicitly requests x86_64. No baseline release APK yet.
- Inspect Expo config/prebuild ownership/actual distribution/toolchain. Enable appropriate release R8/resource shrinking with necessary keep rules and preserved dev/debug behavior; assess AAB/ABI outputs without deleting supported architecture targets or changing signing/distribution. Prefer a bounded measured change; no guessed size savings.
- Build comparable release variants locally, inspect artifacts, run launch/native-module/regression validation with existing Android owner; preserve existing builds/devices. If SDK/Gradle/hardware unavailable, record actual blocker and keep required work pending, not silently complete.

## R7 — Docker install/cache layers

- `infrastructure/deployment/miniapp-api.Dockerfile:6` COPY all before npm ci invalidates expensive install on source/docs changes. Production-dependencies already manifest-first; source stage should do same, correct transitive workspace manifests included (astronomy-core recently involved). Build integrity takes precedence over caching.
- Use BuildKit npm cache, narrow required build context/copies and compatible CI external cache where justified. Do not touch design resources themselves; excluding non-runtime assets from backend Docker context is allowed if no required source dependency is lost. Keep pinned image digests/lockfile, production conditions, nonroot runtime, compiled code/migrations needed for startup, package licensing and atomic promotion boundaries.
- Verify Docker build/start/readiness with isolated local config if available, transitive workspace exports/artifact paths, source change versus lock change cache invalidation. Reuse deployment tests. No push/deploy or remote registry mutation.

## R8 — Deterministic project Node/npm entry

- Root engines>=24 but PATH selects Tencent Node16 and nvm npm24. First baseline Taro failed bundle.findLastIndex; Node24 succeeded13.665s.
- Implement a minimal project-owned runtime selection/preflight at existing launch/build owners or user-approved local developer entrypoint; use process.execPath/current npm runner correctly. Don't hardcode this user's nvm path in portable source, patch node_modules or change global PATH. Existing npm wrappers/config might already solve part; verify and document supported invocation.
- Test mismatch produces actionable early error, matching runtime works, child commands inherit chosen runtime on Windows and POSIX. Ordinary dev/build should not silently start wrong Node. Avoid spreading boilerplate into every file.

## R9 — Native API bounded forecast cache (lower priority)

- `apps/api/src/modules/forecast/forecast-query-service.ts:252` has inFlight dedup but Map no capacity/active expiry cleanup. Audit real service lifecycle; if cache remains unbounded across coordinates/nights, add proportionate max entries/expiry pruning at owner while retaining existing forecast semantics and inFlight lifecycle.
- Test eviction/expiry and different keys/provider failure. Don't conflate with Mini Program R1 cache or turn low traffic risk into unsupported large benchmark claims.

## R10 — WeChat / agent development best practices and low-latency tooling (added user request)

- User explicitly wants current research, including potentially unknown MCP, and actual improvement if current development/test workflow is suboptimal. Pain: frequent Computer Use to inspect DevTools feels slow. Preserve R1-R9/H1-H4 and design-resource freeze; no replacement objective.
- Use primary official WeChat/Taro/Tencent docs and maintained repository source; inspect installed tools before new dependencies. Compare official wechatide/DevTools Skills+MCP, existing miniprogram-automator/CLI, third-party MCP wrappers and CI capabilities. Check maintenance/license, actual Windows compatibility, process/session reuse/recovery, target binding, screenshots/element/runtime state/console/network, privacy, state mutations and cold setup latency. Don't call a wrapper faster only because it says MCP.
- Evidence so far: https://github.com/TencentCloudBase/skills/blob/main/skills/miniprogram-development/references/devtools-debug-preview.md says Nightly ships wechatide and built-in Skills/MCP. Official WeChat nightly page unavailable to web tool, so must verify local version/capabilities rather than assume. Local install C:/Program Files (x86)/Tencent/微信web开发者工具 contains wechatide.cmd/wechatidecli.cmd, not on PATH. Need inspect supported --help/registry and status without exposing account identity. No callable WeChat/plugin search tool in ALL_TOOLS; absence isn't proof no MCP exists.
- Other researched candidates (not installed/recommended yet): github.com/unclebadvip/wechat-devtools-mcp (CLI wrapper), github.com/Chaixueyuan/weapp-agent-mcp and sensen0326/wechat-devtools-mcp (automator wrappers), annopick/wechat-miniprogram-mcp (source showed some stubs). Prefer first-party installed capability if it satisfies requirements.
- Existing project has miniprogram-automator0.12.1, warm development runner and very heavy cold fixed-candidate runner. Keep development observations distinct from fixed-candidate verification. Reuse warm exact-project session for frequent scoped reads/actions; batch stable reads and wait on compile/observable conditions, not long blind sleeps or mouse-coordinate hunting. Validate actual render using native screenshots/layout when needed; Computer Use remains only for UI/capability gaps. Don't replace WEAPP with H5 or fake screenshots/physical GPS/sensors.
- Before changing session state inspect existing DevTools instances and owners; no broad cli quit, cache wipe, project reload or commandeering another task's preview. Tool-auth/manual UI approval only if actually required; use established permitted local sessions. Don't print tokens/cookies/openid/precise locations/network payload secrets. Discovery/read-only status may be sanitized in local scripts before model output.
- Save cited findings, actual local capabilities/version, comparative timings and selected integration/Skill/Context changes to R10-NOTES; run targeted smoke against project state or isolated task-owned fixture. If first-party capability is available but unsupported in client/tool list, use documented CLI or minimal integration rather than unnecessary third-party wrapper. Do not install an unrequested marketplace plugin via workaround; no cloudbase migration, public release or provider account setup implied.

## Explicit exclusions / deferred findings — preserve detail, do not execute

- D1: 200% font versus paused standard-font Context inconsistency, and other visual scope/geometry differences. User's design rebuild owns convergence; no DESIGN/Screen redesign in this Goal.
- D2: archival edits/dedup/compression/removal of old and new design packages, associated Source/census/handoffs, `docs/source-plan.md` historical design/workflow provenance. Seven old packages182.5MB (~181.1MB metadata), docs528.8MB, exact large-file duplicates176MB including active new Skill iterations, parking.jpg44 copies. Not an immediately deletable set; Git pack100.66MiB already compresses/deduplicates. Do not rewrite immutable hashes or original requirements.
- D3: geometry/visual redesign and new adopted-resource migration, new resource Skill, imagery/thumbnail generation, 442.2KiB three-photo main-package resource optimization (39% main) and asset relocation. R5 only technical rendering/lifecycle with unchanged appearance.
- D4: heavy mandatory workflow recreation, blanket snapshots/gates, global skill/plugin cleanup, proxy/UAC/security tuning, new feature branches/worktrees, public release/uploads/purchases/remote production tests.

## Verification baseline / final review

- Baseline context:validate + doctor passed,1 default2323B;62 Markdown/64 local file links no missing (not anchors/code snippets/factual correctness). Skill/workflow19 pass; Gaia/weather10 pass. Node24 WEAPP build static passed, total1,563,001B/main1,162,401/content245,933/spot76,830/sky77,837;0 sourcemaps. Not current completion evidence after edits.
- Run affected tests after changes; broad miniapp check once coherent where inputs warrant. Preserve source/lock/build identity and existing dev output. Failures must be repaired or accurately classified; no tests weakened to declare success.
- Before complete: inspect resulting dependency/state/public API/callers; verify cache freshness and safety, failure/cancel/cleanup, truthful performance evidence, forbidden-resource diff absence, no unrelated changes and updated Context only for durable changed facts. Record every command/result and remaining verification limitation in PROGRESS. No new machine acceptance system.

## Official reference pages already consulted

- https://learn.chatgpt.com/docs/build-skills (metadata first, focused triggering, optional references).
- https://docs.docker.com/build/cache/optimize/ (manifest-first install, cache mounts, external cache).
- https://developer.android.com/topic/performance/reduce-apk-size (code/resource shrinking, architecture/distribution considerations).
- https://docs.taro.zone/docs/apis/storage/setStorageSync (synchronous storage; consult installed target-compatible APIs for implementation).
