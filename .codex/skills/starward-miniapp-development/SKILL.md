---
name: starward-miniapp-development
description: Develop and debug Starward's WEAPP Mini Program with the matching official WeChat DevTools skill, scoped runtime observations and an existing warm session. Use for WXML/style/state inspection, Console/Network diagnosis and development-tool maintenance; device work and release have separate project skills.
---

# Starward Mini Program development

Read `project_context/global.md`, [development feedback](../../../project_context/development-workflow/development-feedback.md), and the affected owner. For UI, follow the adopted Screen Contract and `starward-interaction-design`; this skill does not select a new design or renderer. Acceptance/device obligations remain with `project_context/development-workflow.md`.

## Match the official tool and reuse the session

- At the first WeChat operation in a task, use `npm run miniapp:devtools:sync` to synchronize the installed official package into the existing agent skill root. An explicit `--official-ide <installation>` or `--skills-root <agent-skills-directory>` selects non-default environments. No network download or IDE restart occurs. Read [maintenance](references/official-skill-maintenance.md) only for setup, an update, or a synchronization conflict.
- Read the resulting official `wechatide-skill/SKILL.md` and required scene. After `reloadRequired`, refresh skill discovery using the available client mechanism and reread affected instructions before business calls; if the client cannot reload, preserve task state and reload the client/session. Copying files alone is not a completed reload. Keep the installation and managed agent package unmodified.
- Reuse the official version/login/authorization result for the confirmed session. MCP and `wechatide -c` have different token rules: follow the matching official package. Do not feed an MCP token to CLI merely because it exists. A registered MCP transport failure need not block an already permitted official CLI route.
- Carry the exact compiled project, route, simulator/phone scene, build identity and connection owner in existing task state. Reuse the working project/window/watch process. IDE restart/update, scene/project change, rejected authorization or lost connection invalidates affected readiness, not unrelated evidence.
- Prefer registered official tools. The existing [observer](../../../tools/miniapp/development-observer.md) provides `batch`, WXML/style/geometry reads and filtered logs. Steps run serially with one readiness check; they are not atomic or guaranteed to describe one frame. An existing owned SDK observer remains suitable for repeated supported reads; do not launch another scene just to obtain it.

## Select evidence that distinguishes the cause

Use only relevant rows; this is not an every-edit checklist.

| Question | First useful evidence |
| --- | --- |
| Wrong size, missing control or wrong style | Current route, scoped `outerWxml`, `style`, `size`/`offset`, and a readable actual frame when visibility matters. Inspect a relevant ancestor if clipping/stacking remains unresolved. |
| Wrong state, event or navigation | Relevant page-data field and one real action followed by route/state readback; Console for attributable exceptions. Calling a handler is not proof of a working visible control. |
| Failed or stale request | Filtered Network for the endpoint and related error/state; confirm origin and source/runtime identity. Empty filtered output does not prove no requests. |
| Compiled output differs from source | Current build/watch result and changed emitted value. `compile_wxml`/`compile_wxss` are summaries, not rendered-page proof. Preserve storage during justified refresh/reopen. |
| Concrete latency, allocation or frame problem | Measure one representative operation at its owner. Use available debugger profiling, Sources/source maps or scoped SDK/API measurements when they answer that question. A GUI panel does not imply an agent-callable API. |
| Canvas/native layer disagrees with WXML | Separate node/style facts from composition/capture facts; inspect the declared runtime/display boundary. WebView structure or H5 pixels cannot establish native visibility. |

For startup or SDK timeouts, read [bounded recovery](references/startup-recovery.md). Stop queuing operations on a failed channel. Performance traces, memory snapshots and third-party CDP bridges are optional gap-driven tools, not routine gates. Before adoption, check current compatibility, target/scene identity and restart/storage effects; do not install duplicate automation stacks or enable debug ports speculatively.

## Complete the changed responsibility

Batch coherent repairs, then observe changed behavior and affected consumers. Reuse valid evidence and stop under `AGENTS.md`; imagined edge cases or reassurance do not justify broader checks. Document changes need document checks, and skill updates need package/loading checks, not whole-product reruns.

Keep logs bounded/redacted, stop on unexpected results and never automatically replay a possibly completed mutation. Close only owned connections/processes. Keep device, service and product failures explicit. Use `starward-wechat-device-verification` for physical behavior and `starward-miniapp-release` for environment-bound delivery without duplicating their workflows.
