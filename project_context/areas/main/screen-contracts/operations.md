# Owner-Operations Screen Contracts: Starward

This on-demand Context holds the existing shared owner-operations Screen Contract and the two operations Surface/12 Control detail entries routed by `project_context/areas/main/screen-contracts.md`. It does not own cross-surface main/drilldown placement or visual-system values.

## Shared Owner Operations Screen Contract

- Platform: authenticated responsive desktop web; preferred 1440×900, compact below 1180, one-column/top navigation below 900, and 200% text without page-level horizontal overflow.
- Regions: workspace navigation; route heading/context; stable control composition; route-owned guarded dialog/drawer; redacted status/audit feedback.
- Interaction: every action is keyboard reachable; writes deny by default, preserve draft/input on error, use optimistic revision or idempotency identity, and require impact/confirmation where declared.
- State: loading, empty, no-results, fresh/populated, stale, partial, degraded, error, disabled, saving, success and edge appear only when applicable with source/version/last-success context.
- Owner operations uses authenticated apps/admin-web, backed by server application services. tools/miniapp/admin-operations.mjs is the operational CLI. Update the real UI and verify authorized writes; no prototype snapshot is required.
- Shared status material is `apps/admin-web/src/app/notice.tsx`, consumed by existing operations routes and the astronomical-event workspace. It owns icon/content columns, tone and alert/status semantics; consumers supply domain content. Do not apply its two-column CSS to a bare text node. Test identity belongs in data; there are no test-only product banners or explanations.

### Astronomical-event workspace

- `apps/admin-web/src/app/event-catalog-view.tsx` uses the existing authenticated request boundary and `/v2/admin/event-catalog`. Download the current package as a format reference; preview a JSON file locally, select its registered source, confirm provenance/rights, then create a candidate. The shared backend validator remains authoritative; importing is not publication.
- Show current-version differences, full source/precision data, candidate state and paginated newest-first history. Review requires a reason and binds the current catalog identity. If that identity changes, recalculate visible differences and require review again before publication. Pre-existing approvals without a recorded baseline also need review.
- Publication and rollback confirmations freeze target, reason and current version/hash. A stale confirmation is rejected; identical current contents cannot be restored again merely because their publication version differs. Rollback appends a publication/audit record and preserves user plans. Exact retired meteor baselines remain view-only.
- Manual source registration is create-only: a repeated ID cannot reset an existing automatic source. After writes, read durable state before reporting success. If the response is lost, reconcile the current directory; if reconciliation fails, preserve input and block further writes until a successful refresh. Normal conflict/error recovery must not turn into automatic mutation retries.
- Article editing reuses this workspace and the same candidate/publication owner. Select an event and registered publisher, read a reachable public HTTPS article or upload saved HTML bytes, then compare and edit the plain text. Manual text is available when extraction cannot read the source. Preserve original URL, author and the publisher's date precision; image/table omissions require editorial checking, not invented content. This does not promise access to arbitrary WeChat articles, login-only pages or overseas sources from the domestic service.
- Creating an article candidate requires explicit reuse evidence. The server binds that evidence, registered publisher, authenticated actor and time to the exact article and its independent source; uploaded audit fields cannot impersonate a confirmation. Article changes and removal always require manual review, including removal by a structured feed. Review exposes full text and internal evidence. The editor freezes its catalog baseline and retains input on failure; reapplying to a newer baseline is explicit. Repeated submission of the same candidate version reuses its confirmation instead of creating another candidate.

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
