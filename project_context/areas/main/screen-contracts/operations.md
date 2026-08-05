# Owner-Operations Screen Contracts: Starward

This on-demand Context holds the existing shared owner-operations Screen Contract and the two operations Surface/12 Control detail entries routed by `project_context/areas/main/screen-contracts.md`. It does not own cross-surface main/drilldown placement or visual-system values.

## Shared Owner Operations Screen Contract

- Platform: authenticated responsive desktop web; preferred 1440×900, compact below 1180, one-column/top navigation below 900, and 200% text without page-level horizontal overflow.
- Regions: workspace navigation; route heading/context; stable control composition; route-owned guarded dialog/drawer; redacted status/audit feedback.
- Interaction: every action is keyboard reachable; writes deny by default, preserve draft/input on error, use optimistic revision or idempotency identity, and require impact/confirmation where declared.
- State: loading, empty, no-results, fresh/populated, stale, partial, degraded, error, disabled, saving, success and edge appear only when applicable with source/version/last-success context.
- Operations visual archives: `target.ops-product-pages-v1` and `target.ops-controls-v2` retain workspace/control semantics and rollback identity only; their historical composition and styling are inactive pending separate regeneration.

## `admin-data-operations`

- Workspaces / Entry: `data-operations`, `moderation`, `recommendation`; authenticated owner deep links only.
- Primary judgment: which data/job/moderation/rule action is allowed, what it affects, and how it can be recovered.
- Composition: data operations owns revision edit, source state, job operation and audit; moderation owns the queue; recommendation owns replay then rule lifecycle.
- Material controls: `admin-spot-editor`, `moderation-queue`, `data-source-dashboard`, `job-operations-console`, `recommendation-replay-console`, `rule-release-control`, `admin-access-audit`.
- Commit / Exit: guarded writes bind revision, permission, impact, exact confirmation when declared, one idempotency key, backend receipt, audit ID and recovery point; leaving the screen does not erase pending/history state.
- Verification emphasis: real owner authentication/authorization, REV-43 conflict path, backend side effect/readback, job replay dedupe, redacted immutable audit, provider budget/degradation.

## `quality-release-observability`

- Workspaces / Entry: `release-quality`, `recovery`, `metrics`; authenticated owner deep links only.
- Primary judgment: whether the declared owner-only target is usable now and which exact machine/external blocker remains.
- Composition: release quality owns promotion plus technical/data evidence; recovery owns isolated restore exercise; metrics owns consented aggregate product evidence.
- Material controls: `release-promotion-gate`, `technical-observability-dashboard`, `data-quality-dashboard`, `backup-restore-exercise`, `product-metrics-dashboard`.
- Commit / Exit: promotion cannot outrun its current target; restore success requires validated readback from an isolated instance; run history and blockers remain immutable and redacted.
- Verification emphasis: current-execution target-runtime proof, budget 70/90/100% degradation, backup/RPO/RTO/data consistency, telemetry correlation, no public-production claim.
