---
name: starward-miniapp-development
description: Develop, debug and investigate performance in Starward WEAPP (小程序开发、调试与性能分析), including required runtime-data preparation after code synchronization and recovery of missing local inputs. Use for slow launch, interaction/rendering delays, memory growth, WXML/style/state or request failures, and development-tool maintenance. Match the official WeChat DevTools skill and reuse the existing session; device operation and release have separate project skills.
---

# Starward Mini Program development

Read `project_context/global.md`, [development feedback](../../../project_context/development-workflow/development-feedback.md), and the affected owner. For UI, follow the adopted Screen Contract and `starward-interaction-design`; this skill does not select a new design or renderer. Acceptance/device obligations remain with `project_context/development-workflow.md`.

## Synchronize required data and recover missing inputs

- After an authorized code pull/sync or a move to another computer, follow the [data synchronization owner](../../../project_context/development-workflow/resources-and-artifacts.md#receive-required-data-with-code-and-recover-missing-inputs) and [existing commands](../../../data-pipelines/runtime-data/README.md). Inspect the selected lock and current consumers; run `npm run backend:data:status` and actually prepare missing runtime products with `npm run backend:data:prepare`. Reuse valid bytes without another transfer. Use optional Map distribution data only when consumed, and large source inputs only for actual rebuilding.
- Include the existing resource profiles required by those consumers. The current Mini API also loads catalogue and image assets: use `assets:verify -- catalogs` / `assets:verify -- images` and prepare only missing selected groups with `assets:prepare`. Passing the Map runtime-data check alone does not establish that Sky assets or locked npm dependencies are present.
- If the selected LFS group is unavailable, acquire the exact locked Drive objects through the authorized connector, then use the existing assembly/import/verification path. Do not stop at listing missing files when an authorized recovery route works. Use raw downloads with base64 disabled; report status and paths, never keys or temporary authenticated URLs. Do not add a parallel sync script or custom Git/npm hook.
- If local startup or a real consumer later reports missing data, identify the required version and first failed boundary, acquire only that missing input, verify it and retry the affected operation. Wrong hashes or permissions are not missing files to overwrite. Keep unavailable access explicit, continue independent work, and do not repeat unchanged failures or substitute MEMORY_TEST for required published data.
- Reuse a compatible existing database. When initial restoration is needed, use the private recovery owner and a fresh owned database; `backend:data:check-db` binds it to the code/publication before `dev:miniapp:published`. Preserve running sessions, accounts and drafts. Data preparation does not establish database restoration or service readiness.

## Match the official tool and reuse the session

- At the first WeChat operation in a task, use `npm run miniapp:devtools:sync` to synchronize the installed official package into the existing agent skill root. An explicit `--official-ide <installation>` or `--skills-root <agent-skills-directory>` selects non-default environments. No network download or IDE restart occurs. Read [maintenance](references/official-skill-maintenance.md) only for setup, an update, or a synchronization conflict.
- Read the resulting official `wechatide-skill/SKILL.md` and required scene. After `reloadRequired`, refresh skill discovery using the available client mechanism and reread affected instructions before business calls; if the client cannot reload, preserve task state and reload the client/session. Copying files alone is not a completed reload. Keep the installation and managed agent package unmodified.
- Reuse the official version/login/authorization result for the confirmed session. MCP and `wechatide -c` have different token rules: follow the matching official package. Do not feed an MCP token to CLI merely because it exists. A registered MCP transport failure need not block an already permitted official CLI route.
- Carry the exact compiled project, route, simulator/phone scene, build identity and connection owner in existing task state. Reuse the working project/window/watch process. IDE restart/update, scene/project change, rejected authorization or lost connection invalidates affected readiness, not unrelated evidence.
- Follow the user's current-source and single-window rule in [project source, snapshots and windows](../../../project_context/development-workflow/development-feedback.md#project-source-snapshots-and-windows): synchronize repository source into the current build before closing, keep only current necessary entries/windows, and retire superseded snapshots. Never reverse-sync generated files into source. When a page looks old, compare its actual mode, adopted resources and loaded asset path as well as source/build identity; matching hashes do not establish design conformance.
- Prefer registered official tools. The existing [observer](../../../tools/miniapp/development-observer.md) provides `batch`, WXML/style/geometry reads and filtered logs. Steps run serially with one readiness check; they are not atomic or guaranteed to describe one frame. An existing owned SDK observer remains suitable for repeated supported reads; do not launch another scene just to obtain it.

## Select evidence that distinguishes the cause

Use only relevant rows; this is not an every-edit checklist.

| Question | First useful evidence |
| --- | --- |
| Wrong size, missing control or wrong style | Current route, scoped `outerWxml`, `style`, `size`/`offset`, and a readable actual frame when visibility matters. Inspect a relevant ancestor if clipping/stacking remains unresolved. |
| Wrong state, event or navigation | Relevant page-data field and one real action followed by route/state readback; Console for attributable exceptions. Calling a handler is not proof of a working visible control. |
| Failed or stale request | Filtered Network for the endpoint and related error/state; confirm origin and source/runtime identity. Empty filtered output does not prove no requests. |
| Compiled output differs from source | Current build/watch result and changed emitted value. `compile_wxml`/`compile_wxss` are summaries, not rendered-page proof. Preserve storage during justified refresh/reopen. |
| Concrete latency, allocation or frame problem | Use the [performance investigation method](references/performance-investigation.md) to select a measurement or control that distinguishes the remaining causes. |
| Canvas/native layer disagrees with WXML | Separate node/style facts from composition/capture facts; inspect the declared runtime/display boundary. WebView structure or H5 pixels cannot establish native visibility. |

For tool startup or SDK timeouts, read [bounded recovery](references/startup-recovery.md). Stop queuing operations on a failed channel.

## Performance investigations

For slow launch, requests, data updates, interactions, rendering or memory growth, read the [performance investigation method](references/performance-investigation.md) before choosing measurements, diagnostic changes or substitute observations. It owns measurement selection, metric interpretation, capability checks and recovery of blocked investigations. Project requirements and adopted decisions stay with the linked Context owners; current sessions, samples and unfinished observations stay with the task. A performance question does not require every profiling tool or a new acceptance suite.

## Complete the changed responsibility

Batch coherent repairs, then observe changed behavior and affected consumers. Reuse valid evidence and stop under `AGENTS.md`; imagined edge cases or reassurance do not justify broader checks. Document changes need document checks, and skill updates need package/loading checks, not whole-product reruns.

Before committing/delivering changes or handing work to another computer, follow the [commit-bound input responsibility](../../../project_context/development-workflow/resources-and-artifacts.md#each-commit-binds-the-required-development-inputs): identify the changed consumers' required data and the evidence still needed for unfinished diagnosis, reuse valid unchanged remote objects, and bind new/changed inputs through the existing publication/recovery owners and same-commit lock/manifests. Git/CI success does not establish Drive, private-state or diagnostic-evidence synchronization.

Keep logs bounded/redacted, stop on unexpected results and never automatically replay a possibly completed mutation. Close only owned connections/processes. Keep device, service and product failures explicit. Use `starward-wechat-device-verification` for physical behavior and `starward-miniapp-release` for environment-bound delivery without duplicating their workflows.
