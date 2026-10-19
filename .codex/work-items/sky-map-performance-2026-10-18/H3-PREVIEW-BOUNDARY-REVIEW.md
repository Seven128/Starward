# H3 gen26 preview boundary review — 2026-10-19

Scope: read-only inspection of installed official Skill/docs, public CLI code, the task adapter, and non-sensitive package/config fields. No DevTools, phone, API, browser, preview, build, credential/private-config read, or authority-document edit was performed.

## Confirmed facts

- Installed and agent-copy official Skill v0.3.11 files match byte-for-byte for the root, previewer, initializer, async guide, and tools registry.
- The official registry accepts `auto_preview` with required `project` and optional string `page-path`, `query`, and `scene`. The invocation spelling `page-path: pages/h3-component/index` is correct. The previewer explicitly says no prior `open_project_window` is required.
- The official async guide explicitly includes `auto_preview` among operations that can return `status: pending` plus `taskId`; this is an initiated operation, not a terminal success. Preserve the original task and do not resend while its status is unknown. See `C:/Users/777/.codex/skills/wechatide-skill/references/async-task-polling.md:5`, `:35`, and `:57`.
- Public `js/common/cli/skill-index.js` wraps a non-failed tool result in `{ok:true, result:...}` and exits 0. Its business-result classifier accepts `success:true`; a string status `pending` is not treated as failure. The CLI also has an explicit authorization-pending branch that returns `{success:true,status:'pending',taskId,taskType:'auth'}`. Therefore CLI exit 0 / envelope `ok:true` does not distinguish completed preview from pending confirmation/authorization.
- The task wrapper `tmp/wechat.mjs:13–15` parses the envelope and **returns** `envelope.result`. It does not itself discard that result. Its rejection check does not reject a valid pending result, consistent with pending being a separate state rather than an error.
- The actual information loss is downstream: `tmp/select-h3-phone.mjs:31` awaits `call(...)` but its injected `autoPreview` callback returns no value. `tools/miniapp/device-feedback-official.mjs:245–253` then labels any resolved callback `disposition: completed`. Thus this gen26 feedback state proves that the call resolved, but does not retain terminal/pending status, task type, taskId, or preview payload. Adding `return` alone would not fix the consumer, which also discards the return value.
- Current feedback gen26 points to its own generation project and records `completed`. Its actual bundle SHA-256 is `1ee545f004155d693e0d7384240da558b1de20a4a22cb67c300d2f9368d77941`, matching the reviewed H3 receipt. Its public config has `compileType: miniprogram`, `miniprogramRoot: weapp/`, and the same AppID as the reviewed source. `app.json` has `pages/h3-component/index` as both a declared page and the first/default page; JS/JSON/WXML/WXSS files all exist. Public config launch-condition entries are empty. No bundle/route substitution was found in this static check.

## Possible causes, not established

- The original result may have been a pending preview or authorization task whose handle was discarded. This is permitted by the official contract, but the original result was not available to this review, so pending is **not** asserted as the actual state.
- The push may have completed at the tool boundary without a corresponding phone update/entry. The reported old phone pixels establish that H3 is not yet verified on the device; they do not identify transport, account, task-confirmation, or WeChat-entry cause.
- The public CLI passes an explicit project path; the official docs do not promise that opening another window or reusing the same AppID resolves a stale phone entry. No evidence here establishes an AppID/path collision or an official routing bug. The separate legacy CLI uses `compileCondition`; that is a different interface and is not a reason to replace the correctly registered Skill `page-path` argument.

## Narrow next read-only action

Inspect the **original invocation's already-retained** stdout / structured tool result / live parent handle, if any, for `result.status`, `result.taskId`, `result.taskType`, `result.success`, and a non-sensitive outcome summary. Do not search credentials or private IPC to reconstruct it. If an original taskId is recovered, root can query that exact task with the registered `polling_task_result` under the async guide; this review made no such call.

If the original result was never retained, record the official outcome as unknown (command resolved, phone delivery unverified); do not bind gen26 or resend solely because the current adapter says `completed`. Before any future authorized preview, preserve/classify the official returned state at the adapter and feedback consumer so pending can carry its original taskId across a handoff. This review changes no adapter or authority state.
