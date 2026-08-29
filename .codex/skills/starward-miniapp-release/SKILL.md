---
name: starward-miniapp-release
description: "Route Starward WeChat Mini Program build, AppID migration, owner-IP trial, staging, production, preview, upload, review, and public-release requests through existing project owners. Use it to begin with read-only or dry-run checks, preserve separate authorization boundaries, bind an exact candidate and environment, execute only explicitly authorized operations, recover without displacing the last healthy version, and report safe receipts without exposing secrets."
---

# Starward Mini Program Release

This Skill is an execution router, not a deployment system or policy owner. Durable semantics remain in Context and implementation remains in existing scripts/workflows.

## Load authority before acting

Read these current owners before selecting or invoking a path:

1. `project_context/deployment.md`
2. `project_context/development-workflow.md`
3. `infrastructure/deployment/README.md`
4. `package.json`
5. The exact existing owner under `tools/miniapp/**`, `tools/deployment/**`, or `.github/workflows/**` that the chosen path will invoke

Inspect `git status --short --branch` and the candidate revision. Preserve unrelated dirty state. Do not copy Context rules into this Skill, add a second deployment abstraction, or infer remote/public state from code, a CI bundle, a preview, or a historical receipt.

## Classify the requested operation

Keep these lanes distinct and name the selected one:

- **Owner IP trial**: the explicitly development-only operator-preview route and its declared domain/TLS/debug conditions.
- **Staging**: staging backend image/config/data migration, smoke checks, promotion receipt, and rollback owner.
- **Production**: separately authorized production candidate, immutable image/config, backup/migration, smoke checks, promotion, and rollback owner.
- **WeChat preview**: a preview artifact or QR for an exact WEAPP bundle; it is neither upload nor production.
- **WeChat upload**: an explicitly authorized platform upload for an exact AppID lane and bundle fingerprint; it is not review submission or public release.
- **Review submission** and **public release**: separate platform/human authority boundaries. Never submit either automatically.

If the user asks only to inspect, assess, plan, verify, or dry-run, do not mutate external state. Generic permission to “release” does not silently authorize AppID migration, database migration, upload, review submission, public release, DNS/certificate purchase, or another environment.

## Use the existing owner

1. Establish the exact intended environment and operation. Record candidate Git revision, immutable image digest when applicable, WEAPP fingerprint, AppID lane, and configuration/environment identity. Missing or conflicting identity blocks mutation.
2. Begin with existing read-only checks or the owner's dry/fake-driver mode. Inspect command help and source rather than guessing flags. Reuse, as applicable, the existing `check:miniapp:app-id`, release-bundle, platform-operation, `deployment:validate-env`, operator-preview, backup/recovery, promotion-request, release/promote, and workflow owners.
3. Verify prerequisites and authorization separately for build, AppID migration, infrastructure/data migration, remote deployment, platform upload, review, and public release. Ask only for the unresolved external choice or user action that changes authority.
4. Execute an external mutation only when the user explicitly authorized that exact operation and target in the current request, all owning preconditions are established, and the existing script preserves its lock/idempotency/rollback semantics.
5. On failure, stop at the safe stage, keep the previous healthy version serving, use only the owning rollback/recovery path, and report a fixed non-secret failure stage. Do not improvise a second uploader, migration runner, secret transport, or direct platform call.
6. Run the owner's current-candidate checks after the last relevant change. A local build or successful command invocation does not establish remote health without its attributable smoke/receipt boundary.

Never purchase a domain, service, or certificate. Never disable VPN/TLS checks, write a proxy, or bypass platform policy. Never generate, print, inspect beyond necessity, persist, or copy AppSecret, upload private keys, cookies, tokens, credentials, QR content, or secret-bearing command output. Use secret names/readiness only, and leave secret input with the established owner/human channel.

## Report the result

Report:

- `Requested operation` and selected lane
- `Candidate identity`: revision, image digest, WEAPP fingerprint, AppID lane, and environment as applicable
- `Authorization`: read-only/dry-run or the exact authorized mutation; list separately ungranted boundaries
- `Executed owner`: existing script/workflow and safe stage reached
- `Verified`: attributable local or remote conditions actually established
- `Unverified / external`: pending platform, DNS/filing, device, review, public-release, or human conditions
- `Failure / recovery`: non-secret stage, previous healthy version status, and owner-controlled recovery action
- `Receipts / cleanup`: disposable receipt locations and owned temporary cleanup, without copying receipt contents into Context or this Skill

Never describe owner-IP trial, development/debug traffic, CI output, preview, upload, review submission, or public release as another lane. Run records remain one-run evidence and do not become Skill or Context content.
