# Warm WeChat development observation

For a verified newer official IDE with its bundled `wechatide-skill`, use this same entrypoint with `--official-ide <absolute installation directory>` and `--project <absolute project directory>`. It selects the official structured tools against the already open project; it does not launch, replace, log in to or close the IDE. Windows currently uses the installation's Electron runtime and bundled CLI entry, with no additional dependency or global PATH change. Read the bundled Skill for login/setup when readiness fails.

```powershell
npm run miniapp:observe -- status --official-ide <installation> --project <project>
npm run miniapp:observe -- text --official-ide <installation> --project <project> --expected-page pages/map/index --selector '#observed-id'
npm run miniapp:observe -- tap --official-ide <installation> --project <project> --expected-page pages/map/index --selector '#observed-id'
npm run miniapp:observe -- input --official-ide <installation> --project <project> --expected-page spot/search/index --selector '#observed-input' --value 'search text'
npm run miniapp:observe -- console --official-ide <installation> --project <project> --filter specific_marker
npm run miniapp:observe -- network --official-ide <installation> --project <project> --filter endpoint_segment
npm run miniapp:observe -- screenshot --official-ide <installation> --project <project> --expected-page pages/map/index --output <new-absolute.jpg>
```

Use actual current selectors/routes. Each invocation verifies official readiness; page operations check the expected route before acting. Timeouts are reported without replaying the action or reopening the project. Network output contains only bounded method/URL-without-query/status summaries; headers and bodies are omitted. Filtered empty results mean no matching events. The current official grep implementation was verified with `-i`; `-F` silently returned empty in the evaluated version. Filters accept a bounded marker or path segment, not arbitrary grep syntax. Screenshots contain rendered data and belong in authorized local artifacts. One controller should operate a project at a time. Official per-command startup costs more than the persistent SDK's warm layout calls below; choose based on the needed capability.

This helper reuses the installed official `miniprogram-automator` connection for short development observations. It does not run the cold candidate collector, modify product source, load H5, preview/upload, or establish physical-device/final-candidate acceptance.

Use `layout` for native element bounds when the installed IDE's `Page.*` element APIs time out. It executes only a fixed `wx.createSelectorQuery` read through the official SDK, requires the expected active route, and returns bounded rectangles without page data. It cannot read text or pierce every custom-component boundary. `snapshot`, default element-based `waitFor`, `tap` and `input` still require working Page/Element APIs; they do not silently fall back to calling event handlers. A failed operation closes the connection and requires explicit reattachment.

```javascript
await observer.layout(['#known-element'], { expectedPage: 'pages/known/index' });
await observer.waitFor({ selector: '#known-element', read: 'layout', minimumWidth: 1, minimumHeight: 1,
  expectedPage: 'pages/known/index', timeoutMs: 10000 });
```

For a single read: `npm run miniapp:observe -- layout --project <absolute-project> --automation-port <owned-port> --selector '#known-element' --expected-page pages/known/index`. Use selectors observed in the actual target. Native screenshots remain the visual check; a rectangle alone does not establish appearance or interaction correctness.

Start the normal development owner with an explicitly selected unused automation port:

```powershell
npm run dev:miniapp -- --automation-port 9420
```

`--automation-port` is opt-in: it opens/trusts the exact local project's official automation mode, which may change that development window's interaction mode. Ordinary `dev:miniapp` behavior remains interactive. `--no-open` cannot be combined with automation. The API port and automation port must differ and be free. The existing installed official CLI and its permitted local session/service configuration are reused. A live port is never adopted automatically.

The warm process writes a short connection receipt beneath ignored `artifacts/miniapp/development-observer/`. This holds project/config identity plus owner/listener PID and creation time, never account state or credentials. It is a temporary ownership record, not an acceptance receipt. Connection checks physical project, unchanged public configuration, process birth identity, listener identity and the selected project's native watcher family. Ambiguous project binding fails; the helper never fixes it by closing other IDE windows.

For repeated work, start an ordinary persistent Node terminal with `npm run node -- --experimental-repl-await --interactive`, import once and keep the returned observer. A long-running Node script is also supported. The Computer Use plugin's restricted Node REPL has no `process` global and cannot load this module; use the project Node entrypoint instead.

```javascript
const { connectDevelopmentObserver } = await import('file:///E:/Dev/Starward/tools/miniapp/development-observer.mjs');
const observer = await connectDevelopmentObserver({
  projectPath: 'E:/Dev/Starward/apps/wechat-miniapp', automationPort: 9420,
});
await observer.status();
await observer.layout(['.map-page'], { expectedPage: 'pages/map/index' });
await observer.screenshot('E:/Dev/Starward/artifacts/miniapp/map-observation.png');
// The following element reads/actions require working Page/Element APIs.
await observer.snapshot([
  { selector: '[data-control="map-search-entry"]', text: true, size: true },
  { selector: '.map-page', attributes: ['data-state'] },
], { expectedPage: 'pages/map/index' });
await observer.tap('[data-control="map-search-entry"]', { expectedPage: 'pages/map/index' });
await observer.waitFor({ selector: '.spot-search-field', expectedPage: 'spot/search/index', timeoutMs: 10000 });
// Use selectors and paths actually observed in the current project/runtime.
await observer.enableConsole(); // Optional; subscribe before reproducing the issue.
observer.console();
await observer.screenshot('E:/Dev/Starward/artifacts/miniapp/search-observation.png');
observer.disconnect();
```

The example selectors are illustrative; inspect the current rendered route's actual stable selectors. `snapshot` accepts up to eight selectors, six attributes per selector and 32 matched elements total. It returns selected text, attributes and dimensions, never an entire page-data or network-body dump. `waitFor` polls the same bounded reads until count/attribute conditions hold; it does not blindly sleep for a fixed compile duration. Screenshots and operations are serialized and screenshots write a new absolute PNG path without overwriting an existing file.

`tap` and `input` require `expectedPage` and exactly one matching element. Explicit `navigateTo('/known/local/route')` is available when the requested journey needs it, including an empty initial page stack. Connecting, status and failed actions never relaunch or replay an action. A timeout/closed connection requires explicit reattachment; it does not silently create a new window. `disconnect` closes only the automation socket and log listeners, leaving the IDE open. Use one controller at a time for a selected development session.

Console output is a bounded in-memory, redacted ring. Subscription is opt-in through `enableConsole()` and should precede the action being diagnosed; connection/layout/screenshots do not wait for the log service. A log-subscription timeout is reported and requires explicit reattachment like other operation timeouts. Protocol `DEBUG=automator:*`/wildcard logging must be disabled to prevent the SDK from bypassing redaction. Do not persist or print raw SDK objects. Native screenshots may show current product data; keep them within the authorized task's local artifacts.

For occasional read-only use without a persistent Node session:

```powershell
npm run miniapp:observe -- status --project E:/Dev/Starward/apps/wechat-miniapp --automation-port 9420
npm run miniapp:observe -- snapshot --project E:/Dev/Starward/apps/wechat-miniapp --automation-port 9420 --selector '.map-page'
npm run miniapp:observe -- wait --project E:/Dev/Starward/apps/wechat-miniapp --automation-port 9420 --selector '.map-page' --attribute data-state --equals ready
npm run miniapp:observe -- screenshot --project E:/Dev/Starward/apps/wechat-miniapp --automation-port 9420 --output E:/Dev/Starward/artifacts/miniapp/map-observation.png
```

Each CLI call attaches and disconnects once, so persistent import is preferable for repeated queries/actions. An already existing manually opened automation port lacks this helper's verifiable launch ownership and is intentionally rejected. Start an explicitly owned session instead; never infer ownership from port liveness or a login avatar.

An isolated existing project fixture may use `startDevelopmentAutomation(projectPath, port)` directly, keep that owner process alive, attach with `connectDevelopmentObserver`, and finally disconnect plus call the launch's `cleanup()`. This does not invoke the canonical watch compiler or overwrite `dist/weapp`. Reuse permitted local login and service configuration under the conversation's authorization. Phone scanning, MFA, unavailable remote permissions or a real platform/manual requirement stay explicit human boundaries.
