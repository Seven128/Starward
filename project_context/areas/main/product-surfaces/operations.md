# Product Surfaces: Owner Operations

This on-demand contract node continues the owner-operations responsibility portion of `product-surface-contract.md`; Screen Contract detail remains in the operations Screen Contract.

## Owner Operations Surfaces

### `admin-data-operations`

- Surface: authenticated desktop workspaces `data-operations`, `moderation`, and `recommendation`.
- Surface Platform: responsive desktop web, 1440×900 preferred.
- Primary User Question: What owner action can safely inspect or change place, moderation, provider, job, replay, rule, and audit state?
- Main Surface Allows: stable revision editing, moderation queue, source health, job operations, deterministic replay, rule lifecycle, redacted audit history.
- Astronomical-event operations reuse this surface: inspect source/update health, rerun ingestion, compare candidate changes, review first-source onboarding or exceptional changes, import attributable data as a fallback, and inspect/roll back published catalog versions. Stable structured sources may auto-publish under the [event ingestion contract](../../../architecture/runtime-and-domain.md#astronomical-event-ingestion-and-network-boundary); operators do not manually upload every routine update. Import and scheduled retrieval share validation and publication, so an upload cannot bypass review rules. These are product responsibilities, not a claim that a new administrative UI or ingestion service has shipped.
- Spot modification history belongs to this future management surface, not the Mini Program: browse canonical revisions, compare field/media changes, identify attributable contribution and review/merge/publication events, and inspect reasons under actor-detail permissions. Rejected submission snapshots remain review evidence, not applied spot changes. Rollback creates a new auditable revision. Technical ownership stays with [contribution and spot audit](../../../architecture/runtime-and-domain.md#rejected-resubmission-and-spot-modification-audit); this defines required behavior and does not claim this backend UI is implemented.
- Main Surface Forbids: anonymous access, raw secrets/EXIF/precise trajectories in ordinary logs, unguarded bulk writes, silent conflict overwrite, or success without backend receipt.
- Drilldown Ownership: technical payloads and sensitive-field access require separate permission and audit; the mobile product receives only user-relevant status.
- Long Task State Requirement: every mutating or long-running action has operation/idempotency identity, impact preview, progress, duplicate protection, retry, recovery point and immutable audit history.

### `quality-release-observability`

- Surface: authenticated desktop workspaces `release-quality`, `recovery`, and `metrics`.
- Surface Platform: responsive desktop web, 1440×900 preferred.
- Primary User Question: Is the owner-only target usable, recoverable, observable, within budget, and truthfully bounded?
- Main Surface Allows: promotion gate for the selected target only, technical/data quality, isolated backup/restore exercise, consented product metrics and exact blockers.
- Main Surface Forbids: claiming public production readiness, equating backup presence with restore success, hiding stale/partial evidence, or allowing a future external gate to masquerade as current machine acceptance.
- Drilldown Ownership: detailed traces, quality samples and recovery evidence remain operations detail; consumer surfaces receive concise degradation and provenance.
- Long Task State Requirement: gate runs, recovery exercises and rollbacks have run identity, current evidence, progress, cancel/retry, validated result, history and isolated recovery targets.
