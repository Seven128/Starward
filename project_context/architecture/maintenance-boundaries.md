# Existing Maintenance Boundaries

The former modularity configuration recorded these project-specific ownership and extraction concerns. They are retained as design rationale, not line-count waivers or a mandatory refactor gate. Inspect the current owner before acting; a historical size waiver is not evidence that the debt is still present. Retired authoring generators and immutable preview snapshots do not require refactoring.

## Cloud Sky shared implementation boundaries

Owner: wechat-miniapp-maintainers, miniapp-api-maintainers and miniapp-data-maintainers within their existing packages. Tracking: WECHAT-MINIAPP-MOD-006.

This section owns the cross-module implementation direction for Cloud Sky. Product meaning stays in the [Sky contract](../areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md); existing algorithm and lifecycle details stay in [runtime architecture](runtime-and-domain.md#cloud-sky-progressive-imagery). Task status, experiments, current pins and acceptance belong to the task, not this Context. The boundaries below describe how to converge existing consumers; they do not certify delivery.

### Image-independent catalog and staged supply

Follow the [staged image and no-image contract](../areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md#分阶段影像交付与缺图显示). Catalog identity, positions, search, selection, tracking and information remain usable independently of optional photographic supply. Reuse sky-scene-render.ts and sky-deep-auxiliary-visibility.ts for actual-painted image versus catalog-aid decisions, and the existing catalog/solar calculations for stars and bodies; do not create a second fallback catalog, synthetic stars or a parallel image-less renderer. Deferred or unpainted imagery must not suppress otherwise eligible catalog content or acquire painted-source credit. Source metadata and accepted-frame presentation retain their distinct owners.

Freezing acquisition and pixel processing does not freeze the common runtime: fix native controls, admission/cache/recovery, attribution and delivery against the fixed eligible resource set. Preserve exact usable image bytes and failed candidates; photo/catalog coordination requires applicable, verified source contributions. Keep no-supply, pending/retryable failure and retained-coarse states distinct at their existing owners. These are implementation requirements; existing paths alone do not establish the full no-image journey or native acceptance.

### Data declarations, publication and delivery

- Keep reviewed instance identity, source/rights, projection, format and immutable file declarations with the existing publication contracts. Frontend and BFF consume the same declarations and validators; platform transport and filesystem I/O stay separate. Never let untrusted metadata enroll its own source.
- `utf8-content-integrity` supplies exact UTF-8 byte length and SHA-256 without requiring a global TextEncoder. Catalogue JSON, optical content and fixed SDSS publication callers retain their own serialization and admission rules; raw lone surrogates use the original replacement-character semantics. Runtime portability must not change existing publication hashes, image bytes or source qualification.
- Resource path building/parsing and publication identity should have one pure contract owner, consumed by client admission, HTTP delivery and static export. These boundaries enforce different policies (origin, trial/adopted scope, local files, immutable headers); keep those checks at their enforcing layer. Share path meaning, not one permissive validator for every layer. Preserve old supported paths and reject mixed, malformed or foreign identities.
- Public SDK wire shapes follow the real response owner: body/Prepared/HiPS metadata and SAO immutable file JSON are bare responses, image bodies are binary, and regular SAO index/tile APIs retain their envelope. The operations declaration and generated SDK distinguish these paths; the envelope requester excludes bare operations. Shared body routes expand only the existing admitted body enum for contract checks, without enrolling new families or fabricating metadata for image-only aliases.
- Discovery selects a current edition. A rendered bitmap and its accepted publication carry an exact edition through source links, metadata, export and retention. Missing selected metadata must not fall back to discovery. Retained editions require explicit reviewed inputs and compatible validators/consumers; adding a hash endpoint or a base-class parameter alone does not establish historical availability. Do not fabricate metadata for image-only compatibility aliases.
- Retained declarations own the original edition's files and compatible metadata semantics; current discovery pins are not a universal historical validator. Keep public compatibility while migrating real consumers, then retire displaced internal paths. A selected-source contract must bind the family, object/region where applicable, and edition together rather than accepting independent mixed hash parameters.
- Existing owners: packages/miniapp-contracts; services/body-image-client, prepared-optical-client, sdss-optical-client, bare-sky-resource; workers publication services/controller/sky-public-asset-export; tools/deployment/sky-static-bundle and sky-static-release. The object-store package/verification/upload adapters derive from that same sealed export and original preparation lease; sky-static-http owns bounded public byte transport, while sky-oss-client adapts the official SDK for authenticated operator I/O and owns its agents/deadline/disposal. Their callers retain distinct source admission, authentication and acceptance policies. Upload journals are execution evidence, never a second publication registry or adopted/current pointer. Migrate affected consumers together; do not add a second publication registry or exporter.
- `sky-source-selection` owns the pure selected-source codec: object facts may bind infrared and target-optical editions for one object; body, Prepared-plane and HiPS identities are mutually exclusive with other families. Route builders and native Sources admission consume the same meaning. Fixed-body HTTP and standard export obtain file/format from the selected publication owner; image routes must not shadow immutable metadata. Image-only aliases supply no invented historical metadata.
- Fixed-body publication responses copy their complete stored metadata. Consumer annotations cannot mutate the provenance, geometry or limitations subsequently served under the same immutable edition hash.
- Galactic current optical display and retained 2MASS editions expose exact hash-bound metadata through the publication owner, HTTP and the standard static export. The native source panel uses its accepted edition's metadata URL. Selected client reads never fall back to current discovery; old unversioned infrared discovery and display discovery retain their separate compatibility roles.

### Resource state and page orchestration

- Sky entry validates the complete route before starting a missing-Context lookup. Failed live lookups offer retry/revalidation through the existing Query owner; malformed routes return to the entry. A queued retry checks the Context session again, and accepted readback remains fenced by visibility and current selection. Context failure does not assert a genuine absence of sky data.
- `sky-context-session` fences new Context commands and manual report recovery against the original location selection tokens, current Context identity/version, visibility and its in-flight command. A location change can precede the store's Context replacement. Report, selected-object, weather, registration and landscape callers use the page's current recovery callback; missing report data remains recoverable, and an obsolete action cannot re-arm Context restoration or reset Canvas.

- Existing shared owners remain useSkyFixedImage/useSkyNativeImages, useSkyTargetOptical, sky-publication-resource, the Sky encoded cache and native/GPU lifetime owners. Typed body profiles supply data variation; one hook owns manifest/status/retry policy. React Hook order stays fixed. Geometry, lunar coverage, latitude profiles and rings remain domain adapters, not configuration flags in a universal renderer.
- The page composes observation/camera/time and user intent. Converge repeated report-validity/visibility/pause inputs, resource feedback and recovery presentation into their responsible shared boundaries. Recovery actions remain explicit: retry metadata or bytes, reset the affected optional shader, or rebuild a failed Canvas. A common Boolean “failed” must not turn every retry into a global reset or discard valid independent layers.
- spot-sky-page owns shared report/visibility eligibility (`skyResourcesActive`), image-mode eligibility (`skyImageryActive`) and Sources pause (`skyResourcesPaused`). Families add only their demand differences. Body image recovery resets the renderer's optional body shader through `resetBodyImages`, preserving the current Canvas and independent images; global Canvas failure remains with the existing Canvas lifecycle. Shared notifications/recovery buttons live in sky-body-image-feedback and use the corresponding resource callback.
- `useSkyImageRecovery` owns current-demand retry dispatch across body, Galactic, W3, exact optical, HiPS, landscape, constellation and direct-image callers. Queued callbacks check the latest eligibility and mounted lifetime before restarting resource work; hidden/paused demand cannot manually refetch a disabled Query. The native image retry separately checks current Canvas, revision, publication and actual effect owner, including the render/effect gap. The existing loader applies the latest wanted set before recovery pumps requests while preserving the preceding GPU-reset requirement; update and retry share that demand transition. Domain mask/index refresh and shader-reset meaning stay with their existing consumers.
- The SAO supplement keeps its bounded ready CPU view across hide, with a loader bound to the delivered index capability. Manual retry checks current eligibility and mounted lifetime, uses only the matching delivered capability, and updates current selected tiles before pumping recovery. Missing index or an unmeasured view can still recover metadata; they cannot trigger obsolete tile work. This lifecycle stays separate from native image/GPU recovery.
- Keep frame assembly/accepted completion separate from requested/query state. Labels, picking, source navigation and displayed resource identities consume the same accepted scene; a successful download or upload is insufficient. Body, target optical and HiPS participation receipts have different meanings and remain typed. Share acceptance coordination, not a generic flag that erases these differences.
- `sky-disclosure-commands` coordinates page-level list/time/calibration/layers, date and object entry/close/Back by reading the page's live refs. It owns no parallel state: time cancellation and frozen calibration remain with observation-time and sky-orientation-controller; Context/visibility guards remain with sky-context-session. Explicit close names its disclosure so a retired close cannot switch a replacement panel. System and explicit Back share this command path. Do not split the page merely by line count, clone controller state into new hooks, or equate inline credit disclosure with every modal's lifetime.
- Existing entry: features/sky/spot-sky-page.tsx; completion/frame/source-credit modules; services/celestial-information-presentation and sky/sources. Source-route construction and parsing should share a discriminated selected-source identity; family adapters retain exact rights and scientific/display semantics. A generic source presenter must not substitute static default credit for a selected image.
- Source-page metadata recovery has its own visible/mounted/selected-edition lifetime, owned by `sky/sources/use-sky-source-recovery.ts`. Body, object, Prepared and HiPS root/rights retries use that shared execution guard, including immediate hide events, unmount and retired selection tokens (also A-to-B-to-A); Query `enabled` governs automatic observation and is not a manual-retry guard. Consumers retain their distinct metadata admission and same-edition stale content. Metadata retry does not reset Canvas or GPU, and image/CPU recovery helpers do not by themselves establish this consumer's behavior.

### Batch supply, review and adoption

- Text entity acquisition uses `collect_introduction_entities` with the existing article collector's create-only execution copy and before/after input binding. Bind the entity producer, shared Wikimedia protocol and qualified-HR producer as well as the declaration and actual response bytes. The shared text transport receipt parser preserves malformed/absent curl metadata as failure; a failed batch stops new requests while retaining independent inspected inputs. Changed execution inputs produce a failed qualification record rejected by article acquisition. This does not reconstruct missing historical execution copies or authorize retrying an unavailable external service.

- Keep the existing owners: validated compliant source → early actual-Scene preflight → direct reuse or necessary processing → hard checks and concentrated quality review → explicit adopted publication → ordinary registry/static export. Preflight rejects unsuitable inputs before expensive processing; it neither enrolls candidates nor supplies final qualification. Branch selection and rationale belong to the [processing workflow](../development-workflow/resources-and-artifacts.md#cloud-sky-image-processing), not a second pipeline or adoption registry.
- Source intake owns acquisition, applicable rights/credit, geometry, colour and real coverage; source-family rules are reused while each asset binds its actual rights and exceptions. It supplies declarations to existing whole-source, prepared-texture or HiPS/region adapters. Catalogue/photo-star draw coordination stays in the Scene owner without deleting catalogue identity or search/picking/tracking. Source, free-permission and repair queues remain unresolved input work; the derived inventory reads actual receipts and declarations and cannot substitute for obtaining qualified coverage.
- Attribution is a downstream shared delivery responsibility: map provider/rights metadata into existing SourceSummary, source-credit and Provenance consumers. Add data mappings for ordinary assets and narrow types/adapters only for genuinely different obligations. Verify templates/rendering by mechanism and field/edition bindings in batches; no per-image manual credit transcription, source-page proofreading or full journey. Missing/conflicting metadata and explicit asset-specific terms enter the exception queue; a shared presentation gap gates affected adoption, not independent lawful intake/processing.
- sxt_processing/sxt_batch own execution and reuse; image_quality owns file-review decisions/exceptions; existing Prepared writers and services own contract admission and delivery. Join their receipts with Scene decisions and adoption declarations to derive a batch inventory. Introduce no parallel workflow database. Processing or file review success never automatically enables ordinary discovery.
- Joins bind exact input/output content and applicable Scene implementation, not mutable names alone. Preserve duplicate, orphaned and stale decisions as exceptions. Read development registration, ordinary adoption and exported assets from their actual owners as distinct facts; a derived inventory must never enroll candidates itself. File review, registration accuracy, Scene quality and applicable rights are independent adoption conditions.
- Visual decisions use the [display-quality standard](../development-workflow/resources-and-artifacts.md#cloud-sky-display-quality) and bind its viewing scope; diagnostics do not impose pixel-perfect or scientific-qualification gates on display assets. A newly authorized standard can reuse exact saved outputs for a new review, preserving earlier failures. Identity, coverage, rights and known structural-loss checks remain distinct and unchanged.
- Inventory separates objects/regions, publication editions, actual image/LOD files, metadata/support files, true footprint/effective detail and unique bytes. Include rejected, missing and pending joins; do not count every exported record as a usable image or count three LODs as three targets. Licence/adoption eligibility remains distinct from technical delivery and capacity.
- Reuse unchanged source/recipe/output identities. Recipe variants are introduced for meaningful semantics (SXT, original-image restoration, supported coverage), not object names. One shared defect changes its responsible rule and affected group; only real quality exceptions receive local repair. Tool choices and reassessment conditions remain with external-capabilities and the [processing workflow](../development-workflow/resources-and-artifacts.md#cloud-sky-image-processing).

### Composition and resource accounting

- Reuse TAN/observation transforms, target-optical identity/Scene/level composition and GPU contribution owners. Separate same-source LOD sampling, finite photo footprint/background, cross-source colour/band differences and catalogue/photo star coordination. Share a corrected rule across eligible data; do not hide a failed border by discarding real weak structure or inventing outside coverage. Source-valid black, geometric support, display alpha and scientific unknown remain distinct.
- LOD demand uses actual drawing-buffer projection, source pixels/extent and known limits with hysteresis. Existing optical selectors already own this policy; do not replace it with per-object zoom constants. Decoder/GPU window changes require measured whole-scene benefit and actual output comparison.
- Encoded files, in-flight/staging bytes, native decode, masks, GPU textures/windows and temporary copies keep their existing lifecycle and budgets. A shared scene demand/accounting view may observe these owners; it must not become a competing cache or sum unrelated maxima as physical memory. Retained/visible image ownership and failure fallback outrank an unmeasured pressure-number adjustment.
- Derive server disk/transfer counts from the same adopted static inventory plus retained editions, staging/rollback/backups and non-Sky obligations. Existing static retention inspection remains read-only. Resource counts and modelled RGBA are not cloud capacity or device-memory acceptance; use the deployment owner's actual configuration and mixed-load criteria.
- Static compatibility belongs to the existing publication/release owners across application clients, writer/reader, recovery controls and bundle capabilities. Application rollback and control-tool rollback are separate decisions. Preserve supported immutable URLs and original packages; reject an unsupported switch rather than removing required support assets or weakening record admission. Exact API fallback, where supported, must serve the same edition. The [deployment owner](../deployment/decisions-and-verification.md#static-sky-disk-retention) holds migration and retention policy.

### Verification boundaries

- Verify shared behavior at its real owner, with parameterized data admission and meaningful success/failure/cancellation/retirement checks. Public page/native/API integration must cover the actual production consumers. Existing AST/VM probes can retain useful regression cases, but tests coupled to duplicated variable/function names should migrate with the owner instead of forcing obsolete wrappers or per-object copies to survive.
- Choose representatives for distinct mechanisms, contracts and native boundaries; expand only for changed risk. Review resulting output and full user journeys at module milestones. Software fixtures, DevTools, target devices, physical resource measurements and independent review remain separate evidence levels. Preserve all failed and unverified obligations.

Revisit when: Before extending any affected shared policy or enabling more adopted imagery, trace the policy through its existing consumers and close the corresponding boundary. Routine data additions reuse these owners; they do not reopen the whole architecture.

## apps/wechat-miniapp/src/features/spot/spot-detail-page.tsx

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The current Spot Detail surface keeps context validation and section states visible in one owner. Map, Spot Detail and Plan native map/clipboard commands share `navigation/spot-navigation-controller.ts` and `hooks/use-spot-navigation.ts`; consumers supply their current query publications and precise feedback placement. Detail section extraction remains explicit bounded debt and does not retain a superseded product path.

Revisit when: Extract Detail section presenters and action orchestration before adding another segment or materially changing context recovery.

## apps/wechat-miniapp/src/pages/map/index.tsx

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The single current Map owner coordinates observation context, Finder, viewport, selection and source-lift recovery while their repaired cross-control invariants are verified; controller extraction remains explicit bounded debt.

Revisit when: Extract observation-context, Finder and viewport-selection controllers before adding another Map control family or state transition.

## apps/wechat-miniapp/src/services/api-client.ts

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The BFF client composes transport and account session storage/login. `response-cache.ts` owns bounded response persistence, representation identity and storage cleanup; `request-lifecycle.ts` owns request cancellation. `authenticated-operation.ts` owns generated endpoint projection and account-bound permission-retry orchestration through injected transport/session functions; all existing endpoints use it. `account-profile-client.ts` owns profile read/write intent, same-runtime retry and pre/post request account fences. Native request transport and session establishment remain in the client and should be inspected before materially extending those policies.

`services/runtime-error.ts` owns safe console output for real failures. The common transport reports failed attempts even when stale data remains usable; Query/Mutation caches cover handled business/admission failures, App hooks cover uncaught native/runtime events, and Canvas/GPU owners report failures before their existing fallback or retirement. The shared compass lifecycle reports native startup, stop and listener-release failures, including an optional compass failure while a valid motion stream remains usable; it retains uncertain stream ownership for the existing cleanup retry. Already-active recovery and normal cancellation remain quiet. The same Error identity is reported once across boundaries without a strong retained history. Numeric HTTP/native/GL codes remain observable; raw request keys, bodies, credentials and native messages/stacks are not logged. Image logging delegates to this output owner while its silent degradation and per-resource latches stay with the image owners. This is not a second request, recovery, persistent logging or telemetry system.

`sky-catalog-api.ts` composes the existing BSC, SAO and constellation admission clients and immutable source links for Sky consumers. It imports the same instantiated `requestOperation`, cache invalidation and published-file generation owner; it creates no second transport, session or cache. The common client must not import or reexport this Sky-only facade, which would move its validators back into the main package. Map's Sky report remains with its actual shared consumer.

Handled Sky navigation and shared `CustomNav`/`Provenance` native failures report through the same console owner before their existing route fallback, return recovery or copy feedback. A successful fallback does not hide the failed attempt. Guarded exits, declined Back and a normal root-page fallback stay quiet; route URLs, clipboard content and raw native text are not logged.

The encoded-file cache reports recovered corruption, invalid existing inventories, failed abort/unlink/stat and retirement callbacks through the same image diagnostics. A missing cold inventory and normal cancellation remain expected states. Propagated acquisition/transport failures retain native causes for their existing caller boundaries; logging does not change file leases, byte reservations, uncertain cleanup ownership or retry policy.

SAO's tile loader is the terminal error boundary for published-file tiles that do not pass through Query; it reports actual acquisition/read/admission failures while expected cancellation and retired generations stay quiet. Its Hook reports scientific selection/projection failure transitions per delivered publication and stage after commit, retaining the latch across page hide so camera/time recomputation cannot flood Console. Optional GPU copy and draw checks preserve consumed GL codes before their existing fallback/latch, including a successful copy fallback; no error is inferred from an ordinary `false` result. Bare resource metadata transport retains native causes and records abort-operation failures without changing cancellation settlement.

The same response-cache request fence owns the conditional body captured for its exact origin/path/account and the latest accepted reply for that key while the request is live. Memory/disk capacity eviction does not revoke that body; explicit invalidation, account removal, a conflicting newer reply or a released fence does. Equivalent concurrent photo replies retain their existing validity/content comparison. A fresh upstream 304 may finish with the captured body; offline fallback still enforces the original stale-age limit. Transport completes the callback before releasing these references, and cache-disabled reads do not capture a body. These temporary request references do not expand persisted retention or certify native total memory; no second response cache is introduced.

Session establishment shares only the current in-flight login and releases that attempt on success or failure; invalidation and a newer native identity prevent an old attempt from acquiring a code or committing a session. Missing, malformed, expired or unreadable native identity hides the active private projection through the existing account store while preserving its scoped recovery snapshot. A valid session remains active on a network failure. If native deletion of a rejected session fails, the client keeps an in-memory fence for that token; an unreadable record stays fenced until a current successful login writes its new session. This does not revoke the whole account or erase its drafts/cache, and a failed renewal write cannot reactivate the residual session. Permission retries carry the rejected session identity: a late rejection cannot clear a newer same-account token or retire its successor login, and concurrent old rejections join that login. An anonymous optional request has no session to invalidate. The retry stays bounded to one attempt and the initiating account.

Contribution, profile and plan editor commands share the operation owner in `hooks/account-operation.ts`; `hooks/use-account-operation.ts` owns its React/Taro subscriptions and native page handoff, not account storage, drafts or business retry records. Existing write clients accept the service-owned `RequestOperationScope` and check it at actual dispatch and permission retry. Its bounded same-account renewal handshake preserves normal session recovery without making arbitrary reset/account changes acceptable. Profile editors stay mounted through this known renewal but expose drafts only under their current account/reset ownership; genuine page unmount still retires the operation. PlanEditor shares one operation across save, delete, checklist and confirmed recovery cleanup. Its route target stays stable when a successful new save installs its own plan ID. Plan save-client retains the durable journal, original payload/key/revision, FRESH reconciliation and exact receipt acknowledgement; checklist retains its separate existing same-runtime retry. Keyed current account cache, editor effects and author draft acknowledgement remain distinct. Dependency direction stays UI→service, and already dispatched mutations retain their existing uncertain-result recovery identities.

Immutable contribution-photo GETs allow simultaneous cover/gallery readers under the existing registry and cache identity. Each reader owns its cancellation signal; key/global cancellation still reaches all matching readers. Conditional responses may reuse an equivalent photo envelope after another reader refreshes retrieval metadata, while invalidation, account scope, content, explicit validity and ETag checks remain enforced. Other endpoint families retain latest-request supersession.

Revisit when: Review the existing response-cache and request-lifecycle adapters, then extract the affected remaining transport or identity-recovery responsibility before adding another endpoint family or transport policy. Do not create a second cache owner.

## packages/miniapp-contracts/src/catalog.ts

Owner: miniapp-contract-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

Explicit deterministic test fixtures and their attributable source records remain co-located behind test-only builders; production composition cannot import them, and catalog partitioning remains bounded test-support debt.

Revisit when: Partition catalog data by domain before adding or materially changing catalog entries.

## packages/miniapp-contracts/src/filters.ts

Owner: miniapp-contract-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

The current implementation co-locates the 14-condition vocabulary and compact static predicates. Map/Search owns the five-category editing interaction; the BFF owns dynamic evaluation. The external-capability adoption removes low-cloud and driving-range filters and their parameters; cloned persisted filters project only current keys. The retired 10+8 vocabulary and recommendation filters were removed in the 2026-09-10 migration. No current Mini Program/BFF caller of shared `filterSpots` was found in the 2026-09-09 audit.

Revisit when: Separate filter vocabulary from predicate evaluation before adding or changing a filter dimension.

## packages/miniapp-contracts/src/types.ts

Owner: miniapp-contract-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

The current public contract surface remains centralized for review across the single client and BFF; domain type modules behind a compatibility re-export facade remain bounded debt.

Revisit when: Split domain types behind a compatibility re-export facade before adding another public contract family.

## tools/miniapp/verify-miniapp-target.mjs

Owner: miniapp-verification-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

Current-candidate evidence collection is intentionally one executable authority entry; internal check adapters need a bounded post-baseline split without changing acceptance semantics.

Revisit when: Extract check adapters before adding a new evidence method or changing acceptance semantics.

## workers/miniapp-api/src/astronomy-engine-adapter.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

Capability gating, validation and fail-closed astronomy fallback branches remain co-located so current production failure semantics stay explicit.

Revisit when: Extract provider validation and fallback policy before enabling a production astronomy provider.

## workers/miniapp-api/src/miniapp-service.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

The current BFF use-case orchestration keeps cross-domain transaction and failure semantics visible behind one facade; domain-service extraction remains bounded follow-up work and does not preserve a superseded product implementation.

Account plan aggregates read the repository directly, as does My's user library. A private TTL result cache with write-time invalidation was removed because an older in-flight read could repopulate deleted or superseded plans as fresh. Preserve the existing client request-generation and mutation-invalidation owners; do not restore the server cache without a cross-process consistency contract and measured need.

Revisit when: Split catalog, observation, profile and import services before adding another BFF use case.

## apps/wechat-miniapp/src/content/plan/detail/index.tsx

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The current Plan detail state machine keeps editing, import, validation and recovery branches together while their repaired semantics are verified; presenter and command extraction remains explicit bounded debt.

Revisit when: Extract Plan presentation and command orchestration before adding another Plan action or import state.

## apps/wechat-miniapp/src/state/app-store.ts

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The current application store centralizes persisted preferences, identity-scoped content and session-only observation context while repaired hydration/privacy invariants are verified; slice extraction remains explicit bounded debt.

Revisit when: Split persisted preferences, user content and session-only observation context behind the existing facade before adding another state domain or persistence rule.

## database/miniapp/migrations/001_demo_baseline.sql

Owner: miniapp-data-maintainers. Tracking: WECHAT-MINIAPP-MOD-003.

The immutable historical initial schema, constraints and policy setup remain one auditable migration identity; it is not a selectable product implementation and future schema work must use a new focused migration.

Revisit when: Never append functional schema changes here after baseline acceptance; create a new focused migration for every subsequent schema change.

## tools/miniapp/run-infrastructure-check.mjs

Owner: miniapp-verification-maintainers. Tracking: WECHAT-MINIAPP-MOD-004.

`infrastructure-runtime.mjs` owns explicit compose/external-local selection, service boot, native PostgreSQL command targeting and owned API-process teardown. The baseline runner retains the common migration, database/namespace lifecycle and failure-semantics assertions. `backup-restore.mjs` uses the same target owner for dump, restore and SQL fingerprint reads; external mode does not change service ownership or widen acceptance claims.

Revisit when: Extend the existing runtime/lifecycle boundaries before adding another infrastructure target or lifecycle phase; do not fork the acceptance assertions or substitute a compatible runtime for deployment evidence.

## tools/miniapp/run-wechat-devtools-session.mjs

Owner: miniapp-verification-maintainers. Tracking: WECHAT-MINIAPP-MOD-004.

One native DevTools authority runner currently owns deterministic setup, success and degradation evidence plus quiescent teardown; its verified protocol must be split without changing acceptance semantics.

Revisit when: Extract session transport, setup, evidence-phase and teardown owners before adding another native journey or changing the evidence protocol.

## tools/miniapp/workflow-conformance.test.mjs

Owner: miniapp-verification-maintainers. Tracking: WECHAT-MINIAPP-MOD-004.

Workflow anti-degradation assertions are co-located to review the complete authority protocol; fixture-family extraction remains bounded test debt.

Revisit when: Split authority, population and native-runner conformance fixtures before adding another verifier mechanism family.

## workers/miniapp-api/src/admin.controller.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-005.

Admin allowlist, validation and explicit denial semantics are co-located for the current gated operations boundary; command extraction remains bounded debt.

Revisit when: Extract allowlist policy and admin commands before adding another privileged operation.

## workers/miniapp-api/src/controller.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-005.

The current BFF request router keeps endpoint validation and stable error mapping visible in one owner; route-family extraction remains bounded debt.

Revisit when: Split route families behind the current controller contract before adding another public endpoint.

## workers/miniapp-api/src/miniapp-infrastructure.test.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-005.

End-to-end infrastructure setup and recovery assertions remain one baseline scenario test; fixture extraction is deferred without reducing coverage.

Revisit when: Extract infrastructure fixtures before adding another database or worker lifecycle scenario.

## workers/miniapp-api/src/outbox-worker.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-005.

Transactional outbox claiming, retry, idempotency and failure recovery are co-located so baseline lifecycle invariants remain auditable; internal owner extraction is bounded debt.

Revisit when: Extract claim, delivery and retry-policy owners before enabling another outbox destination or delivery policy.

## workers/miniapp-api/src/postgres-repository.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-005.

The current PostgreSQL repository centralizes transactions, row mapping and fail-closed persistence semantics behind one interface; aggregate-specific repository extraction remains bounded debt.

Revisit when: Split aggregate repositories behind the current interface before adding another persisted aggregate or materially changing transaction boundaries.

## data-pipelines/dark-sky/publish_eog_viirs.py

Owner: miniapp-data-maintainers. Tracking: WECHAT-MINIAPP-MOD-007.

The operator command owns PostGIS publication, ordered row locks, immutable spot revisions and transactional rollback. `eog_raster.py` owns hash-pinned manifest/input validation and the existing relative-AOI numerical preparation. Fixed annual-radiance policy and area aggregation belong to `eog_fixed_method.py`, with its shared policy in miniapp-contracts; `eog_fixed_raster.py` owns numerical display derivation, using geometry produced through the coordinate package. `prepare_fixed_eog.py` seals assets without activating them; `eog_fixed_publication.py` validates schema-2 inventory, image/numeric identities and full-footprint spot samples before the same transaction. The API publication reader and `NightLightService` consume only matching database-published identities. The command retains its existing import/CLI surface. Splitting these stages does not change publication assessments or permit rewriting an existing dataset's meaning.

Revisit when: Another persistence or publication contract changes the database transaction. Keep numerical/coordinate derivation out of that transaction and preserve the ordered-lock/revision boundary.

## packages/miniapp-contracts/src/api-shapes.ts

Owner: miniapp-contract-maintainers. Tracking: WECHAT-MINIAPP-MOD-008.

The current API envelope and endpoint payload shapes remain in one reviewable contract carrier shared by the generated client and BFF; domain-family extraction behind the existing re-export surface remains bounded debt.

Revisit when: Split API shapes by stable endpoint family before adding another public endpoint family or changing envelope ownership.

## workers/miniapp-api/src/astronomy-service.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-009.

The current astronomy service keeps observation-night projection, attributable event/target calculation and decision input assembly together while numerical and failure invariants are independently tested; computation-stage extraction remains bounded debt.

Revisit when: Extract event-target projection and decision-input assembly before adding another astronomy dataset family or calculation stage.

## workers/miniapp-api/src/meteor-event-catalog.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-009.

The reviewed IAU and IMO seed population plus its attributable historical activity profile remain immutable reference content. Selectable published occurrence versions are now owned by `astronomical-event-catalog-owner.ts`; this file continues to own the source-specific historical activity curves used by meteor projection.

Revisit when: A second activity-profile authority or materially different activity model requires source-specific profile versioning.

## workers/miniapp-api/src/astronomical-event-catalog-owner.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-009.

This is the single active astronomical-event catalog responsibility for built-in fallback, bounded package validation, source-specific candidate diff/review policy, publication history and the synchronous snapshot consumed by public reads, plans, Observation Context and astronomy caches. PostgreSQL storage and atomic publication remain behind its dedicated store; source adapters produce its documented package instead of creating another runtime catalog.

Revisit when: A new event family changes the public occurrence schema, or a source needs a parser whose validation and critical-change policy cannot be expressed by the current package boundary.

## workers/miniapp-api/src/observation-context-service.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-010.

The one current Observation Context owner co-locates creation, recovery, revision and observation-night validation so cross-surface invariants stay explicit; internal command/query extraction remains bounded debt.

Revisit when: Extract context validation and persistence commands before adding another context kind, privacy class or revision transition.

## workers/miniapp-api/src/route-provider.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-010.

The current AMap route adapter keeps request normalization, provider failure classification and attributable response mapping together; helper extraction remains bounded debt without creating another route owner.

Revisit when: Extract provider request and response normalization before adding another travel mode, provider or route response family.

## workers/miniapp-api/src/runtime-config.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-010.

Startup configuration validation intentionally fails closed across identity, providers, persistence and development-fixture composition in one current owner; domain validator extraction remains bounded debt.

Revisit when: Extract provider and persistence configuration validators before adding another startup mode, provider or secret family.

## workers/miniapp-api/src/sky-opportunity-engine.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-009.

The current Sky Opportunity engine keeps normalization, scoring, confidence and continuous-window extraction together so one rule set and its invariants remain auditable; stage extraction remains bounded debt.

Revisit when: Extract normalization and window segmentation before adding another scoring factor, confidence rule or window policy.

## workers/miniapp-api/src/spot-completeness-policy.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-010.

The publication assessment remains one server-owned review surface. Its intended boundary is the core-readiness policy in runtime-and-domain.md; the implementation still requires optional enrichment and must be migrated without weakening attributable core safety evidence, identity or visibility checks. Rule-family extraction remains bounded debt.

Revisit when: Extract evidence-family validators before adding another publication fact, visibility policy or review transition.

## workers/miniapp-api/src/trip-decision-engine.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-009.

The current Trip Decision engine keeps blocker precedence, confidence and explanations together so it cannot be conflated with Sky Opportunity; helper extraction remains bounded debt.

Revisit when: Extract blocker evaluation before adding another decision factor, blocker class or explanation family.

## workers/miniapp-api/src/weather-provider.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-010.

The current weather adapter keeps QWeather request, total-cloud/hour normalization, official-alert composition, attribution and fail-closed error mapping together while the single-provider boundary is tested; request/normalization extraction remains bounded debt. The retained `LAYERED_CLOUD_ENABLED=false` compatibility flag cannot activate a provider or product field.

Revisit when: Extract provider request and forecast normalization before adding another weather field family or materially changing the selected provider boundary.
