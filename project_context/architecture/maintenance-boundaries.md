# Existing Maintenance Boundaries

The former modularity configuration recorded these project-specific ownership and extraction concerns. They are retained as design rationale, not line-count waivers or a mandatory refactor gate. Inspect the current owner before acting; a historical size waiver is not evidence that the debt is still present. Retired authoring generators and immutable preview snapshots do not require refactoring.

## apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The current Spot Night surface keeps route-context validation, time selection, compass lifecycle and the selected presentation together while drift repair is verified; controller and presentation extraction remains explicit bounded debt and does not define another product version.

Revisit when: Extract route-context and compass lifecycle owners before adding another Spot Night interaction or changing its observation-state model.

## apps/wechat-miniapp/src/features/spot/spot-detail-page.tsx

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The current Spot Detail surface keeps context validation, section states and attributable actions visible in one reviewed owner while drift repair is verified; section extraction remains explicit bounded debt and does not retain a superseded product path.

Revisit when: Extract Detail section presenters and action orchestration before adding another segment or materially changing context recovery.

## apps/wechat-miniapp/src/pages/map/index.tsx

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The single current Map owner coordinates observation context, Finder, viewport, selection and source-lift recovery while their repaired cross-control invariants are verified; controller extraction remains explicit bounded debt.

Revisit when: Extract observation-context, Finder and viewport-selection controllers before adding another Map control family or state transition.

## apps/wechat-miniapp/src/services/api-client.ts

Owner: wechat-miniapp-maintainers. Tracking: WECHAT-MINIAPP-MOD-006.

The one current BFF client co-locates request ownership, cancellation, cache policy, identity recovery and generated endpoint projection so failure semantics stay reviewable during drift repair; transport-family extraction remains explicit bounded debt.

Revisit when: Extract transport, response-cache and identity-recovery adapters before adding another endpoint family or transport policy.

## packages/miniapp-contracts/src/catalog.ts

Owner: miniapp-contract-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

Explicit deterministic test fixtures and their attributable source records remain co-located behind test-only builders; production composition cannot import them, and catalog partitioning remains bounded test-support debt.

Revisit when: Partition catalog data by domain before adding or materially changing catalog entries.

## packages/miniapp-contracts/src/filters.ts

Owner: miniapp-contract-maintainers. Tracking: WECHAT-MINIAPP-MOD-001.

The complete current filter vocabulary and predicates remain co-located so the exact 10+8 closure is reviewable; predicate extraction is deferred until a real filter evolution requires another stable owner.

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

Infrastructure boot, migration and failure-semantics assertions share one baseline runner; adapter extraction is deferred without reducing current coverage.

Revisit when: Extract database and worker lifecycle adapters before adding another infrastructure target or lifecycle phase.

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

The current operator-run publisher keeps manifest validation, raster sampling, PostGIS publication and transactional rollback in one auditable command while the first real dataset lane is established; internal stage extraction remains bounded debt.

Revisit when: Extract manifest/raster and database-publication stages before adding another night-light product, projection or publication mode.

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

The reviewed IAU and IMO occurrence population plus its attributable historical activity profile are kept together for atomic provenance review; data partitions remain immutable reference content rather than a selectable product version.

Revisit when: Partition reviewed occurrence data from profile projection before adding another event catalog authority or materially revising the population.

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

The current publication policy keeps every attributable spot fact and blocker in one fail-closed review surface so no incomplete record can bypass publication; rule-family extraction remains bounded debt.

Revisit when: Extract evidence-family validators before adding another publication fact, visibility policy or review transition.

## workers/miniapp-api/src/trip-decision-engine.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-009.

The current Trip Decision engine keeps blocker precedence, confidence and explanations together so it cannot be conflated with Sky Opportunity; helper extraction remains bounded debt.

Revisit when: Extract blocker evaluation before adding another decision factor, blocker class or explanation family.

## workers/miniapp-api/src/weather-provider.ts

Owner: miniapp-api-maintainers. Tracking: WECHAT-MINIAPP-MOD-010.

The current weather adapter keeps real-provider request, layered-cloud normalization, attribution and fail-closed error mapping together while provider parity is tested; request/normalization extraction remains bounded debt.

Revisit when: Extract provider request and forecast normalization before adding another provider, forecast model or weather field family.
