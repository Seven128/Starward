# WeChat Mini Program Physical-Device Testing

## Owner and boundary

This on-demand verification Context owns repeatable physical-phone diagnostic operations under `tools/miniapp/device-*`. `project_context/development-workflow.md` remains the sole owner of environment isolation, candidate promotion and formal acceptance; `project_context/deployment.md` owns the operator-preview IP backend and formal releases. This is a supplemental diagnostic entry, not a replacement native acceptance runner or a production feature.

- Primary low-cost route: an owner-authorized Android connected by USB, official Android Platform Tools ADB, and the installed official `miniprogram-automator` SDK attached to WeChat DevTools. ADB observes the actual display and injects deliberate taps/swipes; SDK remote debugging is a separate, capability-checked channel for public runtime observation when the target supports it. A remote connection alone does not establish successful runtime reads, and neither connection implies the other is ready.
- Reuse the settled external phone project prepared through the existing build/deployment owners. Do not rebuild, change AppID, inject location, mutate generated files, fetch credentials or deploy as a side effect of device diagnostics. Reuse `fingerprintBundle` for local bundle freshness. A local hash does not prove that the phone is running those bytes: ADB-only observations require operator confirmation of the opened candidate; SDK checks add runtime AppID/platform verification, not byte-level identity proof.
- The owner-only IP lane remains available without a domain under deployment's existing conditions. USB is a control/observation channel, not a network tunnel or a way to bypass platform origin/TLS rules. Do not enable `adb reverse`, Wi-Fi ADB, install trust certificates, disable VPN/TLS checks, or retry a policy-blocked SSH/browser operation through another channel.

## Verification Detail Routing

This root remains the physical-device diagnostic owner and entry point. The registered children preserve the two proof-strength lanes and their shared privacy/evidence boundaries; development feedback never promotes itself into settled-candidate acceptance.

- [Development Device Feedback scope, triggers and diagnostic limits](wechat-device/development-feedback.md)
- [Settled-Candidate Device Verification and repeatable preparation/commands](wechat-device/settled-candidate.md)
- [Privacy/lifecycle, required journeys and evidence interpretation](wechat-device/journey-and-evidence.md)

## Alternatives and verification

Allowed alternatives are direct official GUI + user screenshots, ADB + official SDK, and optional official scrcpy for continuous display/control. Select ADB + SDK for scoped machine observations and reuse of installed tools. scrcpy is optional; if adopted later disable audio and clipboard synchronization, scope it to the authorized device and own its process lifecycle. Appium/Android Studio are unnecessary dependencies for the present bounded route. Rooting, hidden super-app APIs and browser-policy workarounds are not alternatives.

`npm run test:miniapp:device-tools` checks selection, failure/redaction, freshness, bounded input, session cleanup and SDK adapter boundaries with injected drivers. Run `doctor` against the actual host, then `capture`/input/remote/inspect against the actual connected phone before claiming functioning physical integrations. Driver tests are not device evidence. Finish with Context validation and touched-source modularity. Product changes still run their existing owning checks and final-candidate journey.

Primary references: [Android ADB](https://developer.android.com/tools/adb), [Platform Tools](https://developer.android.com/tools/releases/platform-tools), [official scrcpy](https://github.com/Genymobile/scrcpy). The installed locked `miniprogram-automator` public declarations/implementation define the usable SDK adapter. SDK availability is not a claim that the connected phone supports every method.
