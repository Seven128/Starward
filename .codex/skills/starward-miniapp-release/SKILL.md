---
name: starward-miniapp-release
description: "Route Starward WeChat Mini Program release bundles, AppID migration, official preview/upload, backend deployment and platform release requests through existing owners. Use for environment-bound release operations; ordinary local compilation and watch builds use the development workflow."
---

# Starward Mini Program Release

This Skill is an execution router, not a deployment system or policy owner. Durable semantics remain in Context and implementation remains in existing scripts/workflows.

## Select the path before expanding references

Start with the requested operation and `package.json`, then inspect the exact existing script/workflow before invoking it. Read only the relevant owner branches:

- **Ordinary local build/watch:** route to `project_context/development-workflow.md` and its applicable build/path node, the app package and Taro config. A local compile is not a release operation and needs no deployment-document preload.
- **Release bundle, AppID migration, official preview or upload:** use `project_context/development-workflow.md`, its implicated candidate/path nodes and the invoked owner under `tools/miniapp/**`. Follow `project_context/deployment.md` when the chosen lane binds a remote environment, API origin or protected release identity.
- **Owner IP trial, staging or production backend:** use `project_context/deployment.md` and its implicated nodes, then locate the selected operation's section in `infrastructure/deployment/README.md` and the owner under `tools/deployment/**` or `.github/workflows/**`. The full deployment runbook is not needed for an unrelated lane.

Inspect `git status --short --branch` and the candidate revision when preparing or acting on a candidate. Preserve unrelated dirty state. Do not copy Context rules into this Skill, add a second deployment abstraction, or infer remote/public state from code, a CI bundle, a preview, or a historical receipt.

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
4. Execute an external mutation only when the user explicitly authorized that operation and target in the conversation, the authorization still covers the current scope, all owning preconditions are established, and the existing script preserves its lock/idempotency/rollback semantics. Reuse established authorization across turns; ask only for a genuinely unresolved target, changed scope or required external action.
5. On failure, stop at the safe stage, keep the previous healthy version serving, use only the owning rollback/recovery path, and report a fixed non-secret failure stage. Do not improvise a second uploader, migration runner, secret transport, or direct platform call.
6. Run the owner's current-candidate checks after the last relevant change. A local build or successful command invocation does not establish remote health without its attributable smoke/receipt boundary.

Release authorization does not imply purchases or global VPN/proxy/TLS changes, and cannot bypass platform policy. Use the existing permitted local session or secret-loading capability when it is already authorized; request human input only for an actual unavailable capability, external MFA or platform approval. Inspect sensitive values only as needed for the authorized owner and keep them out of replies, logs, Context and source. Preserve the owner's private materialization and cleanup for upload keys or QR artifacts; report names/readiness, never their contents.

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
