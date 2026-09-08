# Official native feedback — 2026-09-08

Actual signed extracted IDE2.02.2608070 and bundled Skill0.3.9, after user QR login. This supersedes earlier inability to verify the new official element/console/network path, but does not finish integration or certify Starward product behavior.

Entry: `npm run node -- .codex/work-items/project-efficiency-2026-09-08/R10-cli-probe.mjs run -c Codex <tool> <args>`. This task probe is intentionally restricted to the recorded isolated fixture for observation output. Do not promote its extraction path, fixture identity or raw output logic into general infrastructure unchanged. Official command schemas are in the extracted wechatide-skill/wechatide-tools/references/tools.yaml and tool --help.

Project: C:/Users/777/AppData/Local/Temp/starward-device-feedback-fixture-0sQGy3. Local urlCheck=false is confined to this synthetic fixture. Screenshot initial and completed paths: E:/dev/Starward/artifacts/miniapp/development-observer/R10-official-initial.jpg and R10-official-complete.jpg. Both were visually inspected at455x983.

## Actual sequential observations

- automation_runtime_info --action currentPage: first attempt timed out waiting for automator response. No inferred cause or blind retry loop.
- simulator_screenshot: success, actual page rendered count0 and network not_requested.
- get_simulator_console --command "grep -i error": empty matching output, not proof of an empty console.
- automation_element_action --action text --selector #probe-count:0.
- Same tool --action tap --selector #probe-tap:success; subsequent count text:1.
- Same tool --action input --selector #probe-input --value STARWARD_AGENT_PROBE_INPUT:success; text #probe-input-value equals that exact synthetic value.
- Same tool --action tap --selector #probe-network:success; text #probe-network-state:received.
- get_simulator_console --command "grep -i STARWARD_AGENT_PROBE": actual tap1, input and network200 info events.
- get_simulator_network --command "grep -i starward-agent-probe": actual HTTP_REQUEST GET and HTTP_RESPONSE200 for loopback /starward-agent-probe. No wx.request mock or host GET in this server run. Do not persist raw headers/bodies; receipt stores method/path-match/status only.
- R10-feedback-server-result.json: exactly one GET, matchingPath=true,status200. Owned tty server46266 stopped normally via stop command and exited0.
- Completed screenshot visually shows count1, input/echo string, received.

Measured shell wall time including npm/probe/CLI startup: tap2.024s, count read1.934s, input1.968s, echo read1.944s, request tap2.105s, network-state read2.110s, console2.006s, network2.119s, final screenshot2.719s. These single samples are fixture observations, not product latency benchmarks or warm socket timings.

## Integration remaining

Prefer this first-party path for supported element actions and filtered console/network; legacy warm SDK path remains useful for low-overhead repeated layout/screenshots. Reuse existing workflow owner instead of introducing another session controller. One controller per selected project. Select verified installation/project explicitly, readiness first; no automatic relogin/replay after action timeout. Parse structured success (shell exit alone is insufficient). Keep bounded output and remove network headers/body/account fields before persistence. Inspect actual project safely without rebuilding canonical dist/weapp or altering design resources. Existing tests need rerun only after corresponding implementation changes.
