# Physical development feedback candidate preparation

Scope: production-optimized current-source WEAPP bytes for this task's `development_feedback` session. No device interaction, official upload, live `dist/weapp` replacement, source edit or Git operation belongs to this preparation.

The 36 files recorded in `SOURCE-SNAPSHOT.json` matched their recorded SHA-256 values before preparation. Prior type/affected behavior results remain applicable; this is not a new source revision or settled-candidate acceptance.

## Build conditions

- Use the existing plain isolated-check lane with slot `sky-map-phone-1018`. The requested initial combination of an isolated-check slot and frontend fixture mode is rejected by `config/index.ts`; no bypass is permitted or used. Root selected the existing plain lane instead.
- Frontend fixture mode is false. It does not block the ordinary public Map/Sky navigation, stars, targets or published deep-sky resources. It excludes `SAMPLE_DATA` photos and the optional trial optical HiPS path, so this candidate cannot establish fixture-photo or trial-HiPS performance equivalence with a fixture build.
- The task-owned backend is the existing `MEMORY_TEST` development service. This is public sample-data feedback, not login/private-data or production-provider acceptance.
- API and Sky resources must share the observed current physical WLAN HTTP origin. Never record the actual address in this report.

## Preparation boundary

Initial readback found the known API worker listening only on loopback. Root explicitly retained that service and authorized a separate isolated `MEMORY_TEST` instance on port 8791. The new worker binds only the observed physical WLAN address; host `/v2/capabilities` returned HTTP 200. Its runtime owner is exec session `63092`, listener PID `18780` at preparation; root must confirm identity again before cleanup. Logs are private in ignored `tmp/phone-api-private.log`. The original port 8787 service was not changed.

Taro generates `project.config.json` in its output with `miniprogramRoot: "./"`. The device-feedback snapshot owner instead requires a source project whose bundle is a separate child directory. Root authorized a fresh task-local wrapper: its top-level config is a byte-exact copy of the canonical config, and its `dist/weapp` is a byte-exact complete copy of this one isolated output. The existing `sourceBinding` owner validated this structure. Both canonical and generated configurations remain untouched; there was no mixing with another generation.

## Prepared result

- Source wrapper for the existing feedback owner: `.codex/work-items/sky-map-performance-2026-10-18/tmp/phone-source-project`.
- Original coherent output: `apps/wechat-miniapp/dist/weapp-check-sky-map-phone-1018`.
- Bundle SHA-256 (both output and wrapper copy): `09ef4708fe64ac7a408c9ac967498816d1ea4924350140158c9d5185325f2353`.
- 338 files; 4,940,212 bytes total. Main: 2,003,732 bytes, 93,420 bytes headroom. Content: 1,041,257; spot: 598,333; Sky: 1,296,890. No source maps.
- All 11 existing static package checks passed. The physical-bundle safety check passed, and the compiled pure Sky address owner verified API/resource roles and absence of preview credentials.
- All 36 `SOURCE-SNAPSHOT.json` source files still matched before and after copying. Existing type/behavior evidence is reused; no product source changed and no additional type run was claimed.
- The build is optimized with frontend fixture mode false, and both API and Sky resource origins are the same observed physical WLAN HTTP service. No endpoint is retained in this report.

The root agent can pass the absolute wrapper path to the existing feedback owner, then open only that owner's prepared private generation. Phone Wi-Fi/firewall connectivity, actual runtime binding, loading duration and visual behavior remain unverified. This build preparation cannot establish physical acceptance. Root owns the eventual feedback stop and the task-created API process cleanup; the original live watch output and existing API remain intact.
