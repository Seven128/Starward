# Cloud Deployment, Release, And Domain Context

This root-owned, on-demand deployment Context is the single durable owner for Starward's remote staging and production topology, release promotion, domain and public-endpoint binding, secret classes, database migration, backup/restore, rollback, and production observability. `project_context/development-workflow.md` continues to own Mini Program development, deterministic test, WeChat DevTools, and representative-device acceptance; those lanes may qualify a candidate but never deploy one. Product semantics remain in the owning Area, API contracts remain in `packages/miniapp-contracts/**`, and exact visual values remain in `DESIGN.md`.

## Backend And Static Delivery Dependencies

| Responsibility | What it supplies | Owning dependency |
| --- | --- | --- |
| Backend deployment | API, worker, PostgreSQL, Redis and the Caddy edge | Approved immutable application image, reachable and adequately provisioned host, environment configuration/data, migration/backup and runtime checks; see [pipeline and host](deployment/pipeline-and-host.md) |
| Container registry | The executable API/worker image used by deployment and rollback | TCR authentication, image/tag capacity, exact digest and retained-image availability; this is separate from public PNG/JPEG distribution |
| Static image distribution | Published Map/Sky image bytes from an origin, optionally accelerated by CDN | Actual object-store/origin, domain/routing, rights, quota and cache/header configuration; see [image delivery](deployment/decisions-and-verification.md#cloud-sky-image-delivery-and-cost) |

The existing backend and same-host asset routes can be deployed without an OSS/ESA purchase. This does not establish production image throughput or complete the adopted object-store/CDN delivery. A registry quota failure, host-space rejection or stopped API belongs to backend recovery; an unpurchased CDN does not explain or repair those failures. Database/source-data backups, OCI recovery and runtime image delivery retain their separate consumers and [data/recovery owners](deployment/data-and-operations.md).

## Context Routing

This stable root remains the single deployment owner and routes each task to the smallest complete registered node. Start with the selected operation and its actual failed boundary, then follow the relevant node and direct dependencies. Qualification in one node never substitutes for another node's evidence. Per-run status, candidate identities and unresolved actions stay with the current task handoff and operation receipts; historical Context milestones are not live health observations.

- [Current established, pending and unexercised deployment state](deployment/current-state.md)
- [Public-IP certificate, release identity, staging/production and runtime topology](deployment/release-and-environments.md)
- [Temporary operator-preview delivery lane](deployment/operator-preview.md)
- [Product CI, immutable image pipeline and host provisioning](deployment/pipeline-and-host.md)
- [Environment-bound WEAPP bundle, upload and promotion](deployment/miniapp-and-promotion.md)
- [Configuration, secrets, migration, backup/restore, rollback and observability](deployment/data-and-operations.md)
- [Blockers, provider/capacity decisions, external inputs and verification boundary](deployment/decisions-and-verification.md)
