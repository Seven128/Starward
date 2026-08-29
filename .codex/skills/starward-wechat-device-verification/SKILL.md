---
name: starward-wechat-device-verification
description: "Orchestrate Starward WeChat Mini Program physical-device work when a task needs targeted development feedback, Android USB/ADB observation, official automatic preview or its manual fallback, permission/location interaction, or settled-candidate phone verification. Use it to select the correct evidence mode, run existing project commands, manage required human handoffs, invalidate stale sessions, clean owned artifacts, and report verified versus unverified scope without changing product behavior."
---

# Starward WeChat Device Verification

Keep this Skill thin. Context owns durable meaning, project scripts own execution, and each run owns only disposable evidence.

## Load authority before acting

From the repository root, read these current owners in order:

1. `project_context/development-workflow.md`
2. `project_context/areas/main/verification/wechat-device.md`
3. `project_context/areas/main/verification/development-loop.md` when deciding whether the changed boundary needs a phone
4. `package.json` plus the invoked `tools/miniapp/device-*.mjs` entry when command behavior matters

Also inspect `git status --short --branch`. Preserve unrelated dirty state. Do not edit product code merely to make a device run succeed, and do not turn findings from this workflow into repaired or closed product issues unless the user separately authorizes that work.

## Select one mode

- Choose **Development Device Feedback** for a first runnable physical-device boundary or a coherent batch affecting native map/gestures, capsule or safe area, permissions, GPS, compass/rotation, phone lifecycle, physical network/TLS/domain behavior, or a platform difference. Ordinary logic, copy, deterministic state, and simulated provider cases should stay in cheaper checks unless a physical invariant is at risk.
- Choose **Settled-Candidate Device Verification** only for one fixed clean candidate after cheaper checks and relevant targeted feedback are stable. Use this for the complete applicable phone journey and evidence-level observations.
- State why a phone is needed or why it is not. If the requested outcome depends on a genuine mode or authorization choice that cannot be inferred, ask one concise question before the side effect.

Never use targeted development feedback as fixed-candidate evidence. Never use simulation to prove GPS, physical direction, phone permissions, or hardware behavior. One Android device establishes only the declared owner-device sample.

## Development Device Feedback

1. Run the affected cheap project checks and wait for a coherent Taro WEAPP output.
2. Check readiness with `npm run miniapp:device:feedback -- doctor`.
3. Start with `npm run miniapp:device:feedback -- start --project <absolute-project>`. Treat the returned generation and bundle fingerprint as the candidate identity for this feedback run.
4. A completed public command establishes only official invocation, not delivery to the intended phone/account. If automatic delivery selected another account/device, or the command reports `manual_required`, run `preview --feedback <run>` to create the official ordinary-preview QR for the unchanged generation. Let the user inspect and choose `信任并运行` if prompted, then scan the returned `qrCode` from the intended authorized WeChat account. If the CLI path is unavailable, use the version-visible official Preview action for `preparedProject` (for example `预览` or `使用当前页进行真机预览`); never depend on one historical menu label or bypass trust with an undocumented flag. Run `bind --feedback <run> --confirm official_update_completed` only after the user explicitly confirms that this generation is visible on the intended phone. The owner removes QR bytes after binding and owns any refresh/stop cleanup; report a DevTools-locked stale generation as pending instead of hiding it.
5. Use the existing scoped `npm run miniapp:device -- capture|capture-permissions|capture-location|tap|swipe|back` commands with the returned session. When the selected development condition is official 真机调试, either use the visible official GUI QR or `remote --session <directory> --endpoint ws://127.0.0.1:<automation-port>` plus `inspect`; keep that result explicitly debug-attributed and development-only. Review a fresh screenshot before every input. The user performs login, QR scanning, USB trust, physical rotation, and any action outside the admitted Mini Program/permission scope.
6. After another coherent source batch, use `refresh --feedback <run>`. A refresh is a new generation and may restart the Mini Program or lose page-stack/in-memory state. The old ADB session, screenshot, and input authority are invalid; never reuse them even if an old file remains visible.
7. Finish with `stop --feedback <run>`. Confirm that only the feedback run, its private generations, scan material, and nested device session were removed; source project and phone data remain.

On official CLI absence, timeout, login/service failure, disconnect, non-foreground phone, or scan delay, stop at the reported boundary. Do not use private WeChat APIs, raw CDP, root, Appium, global TLS/VPN changes, or hidden endpoints as fallback.

## Settled-Candidate Device Verification

1. Use the existing build/deployment owner to prepare one settled external phone project. Record its revision/config/AppID lane/API origin/base-library/build inputs and WEAPP fingerprint without exposing secrets.
2. Use `npm run miniapp:device -- doctor`, then `start --project <absolute-external-phone-project>`.
3. Keep candidate inputs unchanged and automatic refresh off. Exercise the applicable cold-start, navigation, permission, GPS/map, Observation Context, weather/astronomy, network recovery, background/return, and state-recovery journeys described by Context.
4. Treat ordinary preview, phone development/debug state, desktop remote attachment, and instrumented builds as distinct conditions. A result observed under one condition cannot be relabelled as another.
5. Any relevant bundle/config/AppID/API-origin/base-library/build drift invalidates the session and dependent observations. Stop, create a new candidate, and rerun the complete applicable journey.
6. Finish with the existing `miniapp:device -- stop --session <directory>` and the separate bundle owner's cleanup.

Do not read chats, unrestricted logs, clipboard, storage, exact location, QR content, or device identifiers. Do not alter global phone permissions or WeChat data to manufacture a state.

## Report the run

Keep diagnostic-path status separate from product findings. Report exactly these headings, with no private artifact content:

- `Candidate identity`: mode, revision/build lane, generation where applicable, and bundle fingerprint
- `Invocation result`: official command/manual handoff and ADB/SDK stages actually completed
- `Observed product behavior`: visible behavior only, without interpreting it as broader evidence
- `Verified`: conditions directly established in this run
- `Unverified`: unobserved device/platform/debug/network/lifecycle conditions
- `Invalidated`: stale candidate, session, screenshot, or observation scope
- `Cleanup`: owned local resources removed and any user-owned phone/tool action still outstanding

Development feedback must remain labelled `development_feedback`; never report it as passed or accepted. Do not write screenshots, locations, identifiers, run receipts, or issue lists into this Skill or durable Context.
