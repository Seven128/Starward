# Owner-Operations Screen Contracts: Starward

This on-demand Context holds the existing shared owner-operations Screen Contract and the two operations Surface/12 Control detail entries routed by `project_context/areas/main/screen-contracts.md`. It does not own cross-surface main/drilldown placement or visual-system values.

## Shared Owner Operations Screen Contract

- Platform: authenticated responsive desktop web; preferred 1440×900, compact below 1180, one-column/top navigation below 900, and 200% text without page-level horizontal overflow.
- Regions: workspace navigation; route heading/context; stable control composition; route-owned guarded dialog/drawer; redacted status/audit feedback.
- Interaction: every action is keyboard reachable; writes deny by default, preserve draft/input on error, use optimistic revision or idempotency identity, and require impact/confirmation where declared.
- State: loading, empty, no-results, fresh/populated, stale, partial, degraded, error, disabled, saving, success and edge appear only when applicable with source/version/last-success context.
- Operations visual archives: `target.ops-product-pages-v1` and `target.ops-controls-v2` retain workspace/control semantics and rollback identity only; their historical composition and styling are inactive pending separate regeneration.
- Current screen/interaction resource: `target-operations-sky-canvas-current-constraint`, interpretation `constraint`, selected by the owner on 2026-08-25. Canonical entry `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-source/operations.html` SHA-256 `cf9fc19b247ba4f2434e5aac1ac2b6dd2bddf283cc13ef13e37a09734c015c2d`; immutable handoff `docs/design-resources/miniapp-design-system-2026-08-25-sky-canvas/selected-handoff/operations-sky-canvas-current.md` SHA-256 `391d900dd35420bd33de29676b23a6767ba7b93fd3857bc3eec9b41bd971546f`; Fact manifest SHA-256 `9ad9a465ffd66dbd3d0f1b16d5cb533c6accf35838f6bf7f194604fa1acdf8f7`; feasibility SHA-256 `c63ee9eaab1322b630cb38a3438a64447d052a6cac7f31e8f7009669cd601e90`. It constrains Queue/Case/media/merge/publication/replacement/retirement/audit composition and state matrices without becoming server authority, exact pixels or production acceptance.
- Editable upstream is the one current Open Design project `starward-sky-canvas-core-2026-08-25`; any future visible change creates a reviewed immutable selection identity and updates this record rather than overwriting the current Source or retaining an ordinary old candidate.
- The Mini Program-specific demo Web console has been removed. The selected Operations resource is consumed only by the authenticated owner Web owner under `apps/admin-web/**`; contribution/candidate moderation remains backed by the same server application services, while `tools/miniapp/admin-operations.mjs` remains an operational CLI carrier rather than UI/UX authority. Resource selection does not prove that the authenticated Web implementation or its writes are complete.

## `admin-data-operations`

- Workspaces / Entry: `data-operations`, `moderation`, `recommendation`; authenticated owner deep links only.
- Primary judgment: which data/job/moderation/rule action is allowed, what it affects, and how it can be recovered.
- Composition: data operations owns revision edit, source state, job operation and audit; moderation owns user/admin evidence intake review, sanitized media inspection and the explicit merge handoff into the canonical spot record; recommendation owns replay then rule lifecycle.
- Material controls: `admin-spot-editor`, `admin-evidence-intake`, `moderation-queue`, `moderation-media-review`, `moderation-canonical-merge`, `data-source-dashboard`, `job-operations-console`, `recommendation-replay-console`, `rule-release-control`, `admin-access-audit`.
- Commit / Exit: guarded writes bind revision, permission, impact, exact confirmation when declared, one idempotency key, backend receipt, audit ID and recovery point; leaving the screen does not erase pending/history state.
- Verification emphasis: real owner authentication/authorization, contributor isolation, upload MIME/size/expiry and metadata sanitization, moderation state/readback, no review-to-publication shortcut, REV-43 conflict path, backend side effect/readback, job replay dedupe, redacted immutable audit, provider budget/degradation.

## `quality-release-observability`

- Workspaces / Entry: `release-quality`, `recovery`, `metrics`; authenticated owner deep links only.
- Primary judgment: whether the declared owner-only target is usable now and which exact machine/external blocker remains.
- Composition: release quality owns promotion plus technical/data evidence; recovery owns isolated restore exercise; metrics owns consented aggregate product evidence.
- Material controls: `release-promotion-gate`, `technical-observability-dashboard`, `data-quality-dashboard`, `backup-restore-exercise`, `product-metrics-dashboard`.
- Commit / Exit: promotion cannot outrun its current target; restore success requires validated readback from an isolated instance; run history and blockers remain immutable and redacted.
- Verification emphasis: current-execution target-runtime proof, budget 70/90/100% degradation, backup/RPO/RTO/data consistency, telemetry correlation, no public-production claim.
