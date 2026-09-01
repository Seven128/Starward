# Cloud Deployment, Release, And Domain Context

This root-owned, on-demand deployment Context is the single durable owner for Starward's remote staging and production topology, release promotion, domain and public-endpoint binding, secret classes, database migration, backup/restore, rollback, and production observability. `project_context/development-workflow.md` continues to own Mini Program development, deterministic test, WeChat DevTools, and representative-device acceptance; those lanes may qualify a candidate but never deploy one. Product semantics remain in the owning Area, API contracts remain in `packages/miniapp-contracts/**`, and exact visual values remain in `DESIGN.md`.

## Context Routing

This stable root remains the single deployment owner and routes each task to the smallest complete registered node. Read every linked node touched by a release or recovery path; qualification in one node never substitutes for another node's external gate or receipt.

- [Current established, pending and unexercised deployment state](deployment/current-state.md)
- [Public-IP certificate, release identity, staging/production and runtime topology](deployment/release-and-environments.md)
- [Temporary operator-preview delivery lane](deployment/operator-preview.md)
- [Product CI, immutable image pipeline and host provisioning](deployment/pipeline-and-host.md)
- [Environment-bound WEAPP bundle, upload and promotion](deployment/miniapp-and-promotion.md)
- [Configuration, secrets, migration, backup/restore, rollback and observability](deployment/data-and-operations.md)
- [Blockers, provider/capacity decisions, external inputs and verification boundary](deployment/decisions-and-verification.md)
