# Science caller auxiliary policy — read-only boundary

2026-10-02. Read current PLAN dependency, receipt development closure and actual
factory/renderer/page callers. No production, PLAN/Context, registry or asset
edits; no new GPU, IDE, HTTP, device, watch, test, installation or acquisition.
The root accepted the bounded task policy below as limited development in its
2026-10-02 follow-up. This is not a normal-production/native budget adoption.

## Existing policy, correctly separated

| Existing parameter / entry | Meaning; cannot supply |
|---|---|
| `sky-gpu-textures.ts:9`, `SKY_GPU_TEXTURE_PRESSURE_BYTES=16MiB`; renderer `textureByteBudget` | Source-texture allocation pressure. Active current-frame set may exceed it. Not an auxiliary allocation allowance or total GPU cap. |
| `sky-artwork-loader.ts:58` default16MiB; `use-sky-sdss-optical.ts:51` two512²RGBA=2MiB | Per-owner source-equivalent image/file retention; SDSS pair. Not actual decoder/driver/physical RAM or all owners combined. |
| `sky-public-image-runtime.ts:9–10` encoded32MiB/max file8MiB | Compressed files/staging; index separately bounded. Not auxiliary textures, native RAM or whole-app storage certification. |
| `sky-artwork-level-composition.ts:61`, `SkyArtworkContributionBudget` | Explicit separate `auxiliaryBytesLimit` and `maxGroups`. No adopted normal/native values were found. |
| `sky-gpu-artwork-contributions.ts:55–57` | Missing/invalid policy disables allocation and GL work. Constructor captures values once; caller mutation does not enlarge its budget. |
| `spot-sky-page.tsx:1360–1380,1894` | One WebGL Canvas; backing size is rounded measured logical size×actual DPR. Only normal constructor caller; no receipt budget or science publication hash supplied. |

The source search found no adopted memory-size/device-benchmark-to-auxiliary
policy or native frame-time threshold. `getDeviceInfo().platform` in orientation
serves its own platform semantics. Server4GB/expected16GB, 200DAU and encoded-file
quotas cannot establish client GPU headroom.

## Minimum caller policy before normal enablement

1. **Explicit intent and separate opt-in policy.** A science publication hash and
   `artworkContributions` must be intentionally supplied together to the same
   existing renderer. GPU method presence alone is insufficient. Ordinary default
   caller and v1 discovery/registration remain unchanged. Unsupported auxiliary
   capture yields UNKNOWN, not image failure or EMPTY.
2. **One group for one selected target.** Recommend `maxGroups=1` for this bounded
   normal-consumer path: actual primary+parent are the two slots of one group, not
   two groups. This follows current Scene's one selected cutout responsibility;
   it is not a guessed capacity ceiling for future imagery. Extra group capture
   refusal stays UNKNOWN, and its actual later draw still affects earlier photo.
3. **Budget actual backing pixels, not source dimensions or logical viewport.**
   For W×H backing pixels and G retained groups, logical RGBA8 need is
   `4*G*W*H + 4*sum(ceil(W/2^i)*ceil(H/2^i))`, stopping when both dimensions are1.
   The MAX chain is one shared scratch chain, not one chain per group. This omits
   framebuffer/program/driver overhead and ordinary textures/decode/Canvas.
   Existing owner already checks safe arithmetic, the separate total budget,
   `MAX_TEXTURE_SIZE`, `MAX_VIEWPORT_DIMS`, default framebuffer, RGB writes,
   depth/stencil conditions and actual FBO completeness. Texture-attached FBOs do
   not require inventing a renderbuffer-size policy. Hardware dimension limits
   are validity guards, not a claim of available memory or good performance.
4. **Deny rather than silently weaken the proof.** Keep complete actual-buffer
   qualification/MAX; do not downsample probes, crop to an arbitrary ROI, reduce
   overall DPR/source quality or raise source pressure to force a receipt. Budget
   denial gives UNKNOWN. After successful optical submission, UNKNOWN does not
   authorize W3 on top; confirmed no submission has the separate whole unavailable
   fallback already recorded in the consumer design. Keep black/zero distinct.
5. **Bound lifetime/recovery with this owner.** Reuse same-size pool/scratch; retire
   on Canvas/context release. Auxiliary failure latches; only explicit retry calls
   `resetArtworkContributions`, not every frame. Resize checks actual new dimensions
   against the original cap. Do not dynamically expand the cap until it always fits.

A shipped normal budget is currently a real gap. It needs target full-scene
resource/frame-time evidence, including actual backing DPR, source-active set,
Canvas/native decode/driver overhead and relevant lifecycle/foreground layers.
There is no justified new byte ceiling or FPS deadline to adopt from this read.

## Can development proceed before that gap closes?

**Yes, with a task-scoped opt-in through the actual Scene and existing renderer.**
Do not create a second renderer/receipt or a public/default candidate registration.
A task entry can inject the existing hash-resolved admitted test publication,
actual ready frame and the constructor's existing budget. Bind its viewport/DPR,
publication, required complete-chain bytes and maximum group count as explicit
test inputs. Ordinary page/default stays closed.

The saved1170×2532 software condition used15,803,512B auxiliary for one group;
that exact existing cost can bound a task case at that measured condition, without
claiming it is safe on phones. A task may explicitly refuse conditions requiring
more than that fixed case allowance; a too-small cap honestly produces UNKNOWN.
The arithmetic is not authorization to auto-size unbounded allocations for every
device. It also cannot guarantee successful allocation even within that cap.

Independent work available now: implement whole-cutout decision and immutable
completion/current-source owner, explicit Scene capability input, actual primary/
parent registration and all page source/status/modal/sameScene consumers using
the same code path under task opt-in. These do not require pretending a production
budget exists. In particular stabilizing the completion union/live helper does not
enable normal science, publish/adopt a candidate or close/reduce aid obligations.
The same-frame aid decision remains a real dependency: qualification
HAS includes black, and final photo cannot decide an earlier Canvas aid draw.
Keeping aids visible as an interim diagnostic is not delivery of required fading.

## Cost and evidence limits

Current software evidence can establish supported-case shader/selection behavior,
display output equality at saved conditions, logical allocation/release and guarded
budget/failure/receipt lifecycle. Source/core218 and getter874 evidence remain
separate; reuse their closure rather than rerun their matrix. Saved cases do not
establish arbitrary inputs, target driver setters/samplers, physical RAM, real
OOM recovery, native frame time, sustained gestures/time/pose or complete quality.

The hot-path risk is substantial even for a tiny photograph: full-buffer signal,
full MAX qualification, full MAX completion and **two synchronous readPixels per
group per ordinary frame**. Later alpha/ZERO draws replay their current shader/
VBO into each usable group target; ONE can skip attenuation. State query/restoration
also occurs. Returning1pixel does not avoid synchronization or all that work.
Multiple groups add full targets/replays/readbacks. A pre-aid decision requiring
another reduction/readback would add cost and must be measured, not hidden by a
test-only estimate. Cache reuse prevents repeated allocations, not these per-frame
GPU work and CPU/GPU stalls.

These risks block claiming normal WEAPP performance/readiness; they do not block
task-only integration and pure caller/source behavior. Default off is a development
scope boundary, not final delivery or a reduction of the user's high-performance
and complete-experience requirements.

## Accurate navigation and bindings

- PLAN current shared dependency: first shared-imagery progress paragraph.
- `sky-gpu-artwork-contributions.ts:53,103,112,210,296,307,335,369,387`:
  capture policy; real dimensions/MAX chain; allocation; group preflight;
  synchronous later draw replay; finish/readback; retired getters.
- `sky-gpu-renderer.ts:471–484,571,1017,1078,1099`:
  existing policy injection; actual submit join; pair preparation/capture; finish.
- `spot-sky-page.tsx:1360,1365,1894`:
  measured actual Canvas/DPR; sole ordinary constructor; normal hook still legacy.
- Consumer API/call sites:
  `experience-sdss-science-consumer-design-2026-10-02.md`.

Read snapshot SHA256: PLAN `4151be724c00220a5c38f16a59d6158fc5f7a227a065a382a88374f5e3a525cd`;
receipt closure `272d4066a85d7ec1f12221deb9b7dacc1c7567b0091d3b0915db2ec6a9e813a6`;
owner `87467f231b709599befc57113e30d4c69c3d34d8782a95c1ecdeb2505b61c4dc`;
renderer `45421d09a212aac3d4704afa266250221a6e4b954407c9e8994097d96762d7ff`;
page `f2005524cac532ab8af8d1fde65815ec7cfcf243abe305ae85b27b470e0831f3`;
GPU textures `a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3`;
encoded runtime `b8ebb9b6fc6caaa93660aa3bdc418e48301ba23210c98e25cc6f4c308aeffb6f`.
