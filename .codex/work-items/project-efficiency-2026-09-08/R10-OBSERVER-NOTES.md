# R10 lightweight observer implementation handoff

Status: implemented and tested; root's first actual isolated A/B launch established a native port and exact fixture watcher, but the initial binding classifier rejected the renderer's internal data watchers. The failure is preserved and the classifier has been repaired with actual read-only verification, as detailed below. Root owns the clean full smoke retry. No IDE, simulator, preview, upload, provider call or canonical `dist/weapp` build was started by this implementation subtask. Package edits were completed and released to root before its Docker manifest build.

## Files and responsibility

- New `tools/miniapp/wechat-protocol.mjs`: exact extraction of the existing bounded SDK protocol and connection functions. Cold `run-wechat-devtools-session.mjs` imports and re-exports them, preserving its current callers/tests. The warm observer never imports the cold runner, its fixture/spec census, BFF/database dependencies or source loaders.
- New `development-automation.mjs`: explicit option parsing, free-port check, official CLI selection reuse, scoped `auto --project ... --auto-port ... --trust-project` launch, short connection ownership receipt, physical project/config identity, Windows owner/listener PID+creation identity and actual project watcher-family binding. A receipt's tool root is independently compared with the current resolved official CLI, not trusted merely because it is in JSON.
- New `development-observer.mjs`: importable persistent official SDK observer plus read-only CLI. One connection is reused per live receipt in a Node process, including concurrent attaches. Top-level helper import and CLI `--help` are side-effect-free; the SDK is loaded only when connecting.
- `start-development-session.mjs`: optional `--automation-port`, rejected with `--no-open` or conflicting API port. Both ports are checked before startup. API/worker/compiler and optional short-lived official CLI/receipt clean up on startup failure or signal; the helper does not close the user's IDE or commandeer a listening port. Generated-output deletion now checks the exact physical owned output path first. Existing ordinary watch/open behavior remains available.
- New `development-observer.test.mjs`, `development-automation.test.mjs`, and tool-local usage guide `development-observer.md`.
- Root package changes only: `miniapp:observe` command and the two new tests appended to existing `test:miniapp:workflow`. No dependency or lock change.

## API and limits

- `connectDevelopmentObserver({projectPath, automationPort})` validates the launch ownership before and after the official socket/version handshake. `status()` explicitly revalidates full PID birth/listener/project identity. Ordinary operations verify the same receipt ID/phase, owner liveness and public-config hash on the retained socket; they never reconnect or retarget a socket automatically.
- `snapshot([{selector,text,size,attributes}], {expectedPage})`: bounded selector reads on one stable page, up to 8 selectors / 8 elements per selector / 32 elements total / 6 selected attributes. No full page-data/network dump, arbitrary evaluate, wx-method passthrough or cloud/upload API.
- `waitFor({selector,attribute,equals,minimum,expectedPage,timeoutMs})`: condition polling with an overall deadline. Empty/not-yet-active pages may be awaited; no automatic startup navigation. Defaults and hard caps live in code.
- `tap` / `input` require one matching stable selector and the expected current page. An explicit `navigateTo('/known/local/route')` may be requested, including by the smoke owner for an empty initial stack. No automatic reLaunch, reload, action replay or hidden retry after disconnect/failure.
- All top-level operations are serialized, including screenshots; selected independent reads within a snapshot are batched. PNG captures save exclusively to a new absolute path. Native screenshot data is not synthesized or downloaded from another surface.
- Console/exception listeners are enabled once and retain a bounded, redacted in-memory ring (80 events, per-event serialized cap). Tokens, bearer/cookie/password/identity fields, common email/phone strings and coordinate pairs are masked. SDK protocol wildcard/automator DEBUG logging is rejected so it cannot bypass that boundary. No raw CLI output is retained; only output byte limits and safe failure codes are used.
- `disconnect()` removes listeners and closes only the socket. Launch `cleanup()` revokes only its own receipt and short-lived CLI process. IDE window lifetime remains with its owner. A dead/reused owner PID, replaced listener, changed config/tool, ambiguous project watcher family or occupied port fails closed.
- Receipts live only under ignored `artifacts/miniapp/development-observer/` (or a supplied task-local receipt file in tests). They are volatile connection ownership, not a new task system or candidate-acceptance artifact. Keep one controller per selected development session; separate processes are not an invitation to concurrent UI mutation.

## Checks actually completed

- New observer/automation suite: **16/16 passed** after native-binding corrections; `R10-observer-tests.log`.
- Existing protocol/late-connect regressions after extraction: **2/2 passed**, through the original runner test imports; no native collector execution.
- Tests execute the actual warm entry code under injected process/filesystem/clock boundaries for API-start failure, automation-start failure and signal cleanup. They verify owned child/receipt cleanup and removal of signal handlers. Other cases cover free-port/no-takeover behavior, PID birth reuse, wrong listener, config/ambiguous project drift, one-client concurrent attach, exact action target, dropped mutation retries, operation deadlines, batch reads, condition waiting, serialized exclusive screenshot writes, log bounds/redaction and help/no-cloud surface.
- Node24 syntax checks and `npm run miniapp:observe -- --help`: passed. Earlier accidental bare-Node syntax probes hit the known Tencent Node16 path; final checks used the project-supported runtime.
- Actual read-only `inspectDevelopmentHost` ran on Windows against this task's own Node PID and port 65530: owner PID+creation identity available, no listener, `projectBound=false`. This validates the native inspection path/parser, not an actual DevTools binding. No port was opened.
- Final `git diff --check` on relevant tool files passed before handoff. Actual attach/query/action/capture latency and real native watcher-family compatibility remain for root's smoke.

## Root's prepared isolated fixture smoke

Use the existing `device-feedback-fixture` output from PROGRESS; its real route is `pages/index/index`, readable labels `.candidate`, `.eyebrow`, action `.page button`, and result `.observed`. Keep this Node owner alive for the whole sequence:

```javascript
const { startDevelopmentAutomation } = await import('./tools/miniapp/development-automation.mjs');
const { connectDevelopmentObserver } = await import('./tools/miniapp/development-observer.mjs');
const launch = await startDevelopmentAutomation(fixturePath, 19420);
let observer;
try {
  observer = await connectDevelopmentObserver({ projectPath: fixturePath, automationPort: 19420, timeoutMs: 8000 });
  const status = await observer.status();
  if (status.path === null) await observer.navigateTo('/pages/index/index'); // explicitly selected fixture route
  await observer.snapshot([{ selector: '.candidate', text: true }, { selector: '.page button', text: true }], { expectedPage: 'pages/index/index' });
  await observer.tap('.page button', { expectedPage: 'pages/index/index' });
  await observer.waitFor({ selector: '.observed', expectedPage: 'pages/index/index' });
  await observer.screenshot(newAbsolutePngPath, { expectedPage: 'pages/index/index' });
} finally {
  observer?.disconnect();
  await launch.cleanup();
}
```

Record actual timings for attach and repeated batch reads separately from initial IDE startup. Report this as isolated native tool feedback, not full product validation, phone delivery, provider truth or FPS. Root may separately load the compiled actual R5 lifecycle owner into an explicitly marked isolated native Canvas fixture to check completion while hidden, resize and callback invalidation; that is narrower than a production-page journey. Do not modify canonical `dist/weapp` to perform this smoke.

## Proposed minimal owner/Skill updates for root to apply

No Context or Skill file was edited by this R10 implementation agent.

1. `project_context/development-workflow/development-feedback.md`, Development entry after the existing `dev:miniapp` paragraph:

   “For repeated simulator inspection, `dev:miniapp -- --automation-port <free port>` explicitly enables the project's owned automation mode. `tools/miniapp/development-observer.mjs` keeps one bounded official connection for stable-selector reads, condition waits, scoped actions and serialized native screenshots; its [usage guide](../../tools/miniapp/development-observer.md) owns command detail. Reuse that connection for the coherent edit batch; desktop Computer Use remains for unsupported GUI affordances. This is development feedback and cannot replace the cold collector or physical-device evidence.”

2. In that same file's remote-trial paragraph, replace only “The user owns login, security-setting changes and phone operations.” with:

   “Reuse permitted local login sessions and configure the needed local CLI/service capability within the conversation's existing authorization. Keep credentials/account values out of output. A real phone scan/permission interaction, MFA or unavailable remote approval remains an explicit human boundary; local sensitivity alone does not require another approval.”

3. `project_context/areas/main/verification/development-loop.md`, Development Verification Paths: add a short Mini Program pointer to the root-owned development-feedback paragraph and the observer usage guide. Keep native App/Metro rules separate and do not copy the complete observer API or its limits into Context.

4. `.codex/skills/uiux_design/SKILL.md`, Taro/WEAPP paragraph: add only a pointer to that development-feedback owner for warm official simulator observation before falling back to desktop automation; retain actual Screen/Design/adopted-resource authority and physical-device limitations.

5. `.codex/skills/starward-wechat-device-verification/SKILL.md`, routing/failure boundary: simulator-readable checks first route to the same warm owner; actual phone work stays in this Skill. For CLI login/service failures, allow authorized local readiness diagnosis/repair and resume only after readiness is observed; pause for real scan/MFA/remote/manual prerequisites. Retain the existing exclusions for private WeChat APIs, raw CDP, device rooting, Appium and global TLS/VPN changes.

Keep the above as routing and an existing authorization clarification. No new Skill, MCP daemon, broad installation, workflow gate, or duplicate acceptance definition is needed.

## Native-binding diagnosis and correction

Root's first smoke reached a live official automation listener and an exact fixture watcher, then failed `development_observer_automation_binding_timeout` before observer steps. This was a binding-classification failure, not evidence that the CLI failed to open the fixture. Root preserved `R10-observer-binding-failure.json`; the implementation agent did not overwrite it or adopt the occupied port.

The current renderer also owned a watcher for its native WeappLocalData. Initial code incorrectly classified it as another project. The inspector now derives exactly one `WeappLocalData` path from that listener renderer's actual `--user-data-dir` argument, verifies the directory is physical, and admits only that exact path. It does not enumerate/allow all profiles, an AppData prefix, nested paths or arbitrary tool-directory projects. PowerShell5.1 output also needed explicit UTF-8 so Chinese path components survive Node decoding; the cold collector already used this technique.

Root then identified the multi-window consequence of scanning the whole IDE family. The runtime classifier now traces watcher parents only into the actual listener's subtree. A separate renderer's project does not affect this connection. Another project under the same listener remains unknown/rejected; a global-main listener with ambiguous projects also remains rejected. Its executable provenance is independently checked against the resolved official tool.

Actual read-only classification of the still-running reserved port 19420 after the final correction returned `projectBound=true`, candidate=1, internal=1, unknown=0. No profile hash or full internal user-data directory was printed. New regression inputs run the exact production parent-tree classifier for separate-window, same-renderer and global-main cases. Root will close/release only its accurately bound fixture through the official SDK, then rerun from a free port; startDevelopmentAutomation retains its no-adoption rule.
