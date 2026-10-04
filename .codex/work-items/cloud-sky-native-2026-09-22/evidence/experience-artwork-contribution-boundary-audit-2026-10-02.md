# Shared artwork contribution / completed-frame boundary — read-only audit

2026-10-02. No rendering, HTTP, device, service, download, package installation,
production, asset, PLAN or Context changes. Root requested a minimal responsible
path; this note does not adopt a CPU or GPU implementation or certify native use.

## Current facts and requirements

- `sky-artwork-level-composition.ts` SHA `35aad62d496cd244846a63c9c27764cdf36572ba934175f7c872f1c470abe473`
  separates four-original-texel alpha eligibility from display contribution.
  The shader selects eligible fine first, otherwise eligible coarse; RGB maximum
  becomes display alpha only after selection. A valid black fine sample blocks
  coarse at that ray while providing zero photo contribution. Alpha fraction is
  joint sample availability, not scientific quality, brightness or foreground opacity.
- `sky-gpu-renderer.ts` SHA `8c701c57378b5e0b3e6527da6b1cd0a40e622face04d5a9c0e8a53a92e710c6b`
  at `artworkLevels` returns submission and independently prepared slot flags.
  Those do not establish any contributing fragment or source credit. Actual failed
  fine preparation must keep the valid coarse path. Same-image two-slot preparation
  keeps a full texture; the shared `withPinned` owner protects both actual sources.
- The newly written `sky-sdss-optical-frame.ts` SHA
  `1d9b99447b47c21311797bf22bf9d712862bfd5c9ac5fd41c0e323e08e7f5422`
  preserves actual ready descriptors and the immutable science publication/common
  master. `sky-scene-render.ts` SHA `9d4343b3f3fae121ee4fc2b244112ad8cf7d886c949ffbf869746535f9a1e4f7`
  explicitly excludes this frame from the old independent JPEG passes. Normal
  science group draw/source credit remains an open dependency, not silently enabled.
- The existing normal scene's legacy photo credit follows submitted fields and
  conservative viewport/field hull exclusion. A hull that is not fully covered is
  not proof of a visible photo fragment. `skyLandscapeMaskAlpha` models alpha of
  actual successful procedural, panorama or transition material passes; its
  `254.5/255` occlusion predicate is not an exact “no surviving contribution” test.
- Selected imagery precedes further HiPS, celestial bodies and auxiliary primitives.
  A later fully opaque body/overlay can erase all of a photo footprint. Landscape
  alone is therefore insufficient for generic completed-frame credit. `finish()`
  also clears the actual framebuffer's navigation rows opaquely. Any new completion
  receipt must account for successful later coverage and this final clear, then
  be committed only after finish succeeds and the same source/Canvas generation
  remains current. Missing or uncertain coverage must not be rewritten as NONE.

Eligibility, selected fine/coarse identity, positive photo contribution before
foreground, and surviving contribution after the completed frame are different
facts. Fine black must never become missing data or permission to substitute
coarse/W3. Both same-publication fields may contribute in different exposed areas;
credit must retain the actual contributing identities instead of the latest query
or the requested finer level. GPU/resource failure retains independent valid coarse
and independent factual/catalog results. Target total resources and quality remain open.

## Existing capabilities and their limits

The real file/native owners (`sky-artwork-request.ts`, `sky-artwork-loader.ts`,
`sky-public-image-cache.ts`) already validate exact encoded length/hash/geometry,
lease immutable files and fence native images by lifetime. Their public handles
expose file path/decode/currentness, not CPU RGBA samples. A native bitmap alone is
not an encoded RGB/availability plane. Existing RGB runs/cells are display support;
occupied conservative cells cannot prove contribution and cannot supply availability.
Existing landscape alpha RLE supplies a useful bounded/hash-bound decoder pattern,
not an automatically transferable optical validity contract.

The current page requests WebGL1. Core WebGL1 supplies framebuffer attachment and
`readPixels`, including RGBA/UNSIGNED_BYTE and current drawing-command results.
It supplies no core occlusion-query API; WebGL2 specifies that query mechanism.
Timer-query extensions do not establish surviving photo fragments. No optional
WeChat extension or WebGL2 support is assumed here. See the official
[WebGL1 specification](https://registry.khronos.org/webgl/specs/latest/1.0/) and
[WebGL2 query specification](https://registry.khronos.org/webgl/specs/latest/2.0/).

The installed Taro declarations include 2D offscreen image/readback and an options
API documented from 2.16.1. Tencent's two requested API pages failed to read in this
audit; declarations are not actual target proof. Separate 2D decoding, alpha/color
preservation and memory were not measured. Existing `pngjs` 7 provides a bundled
browser distribution (572,711 source bytes, MIT), but this is not a tested WEAPP
dependency or its final package cost. No decoder/framework was selected or installed.

## Options and current decision

**CPU encoded support, not adopted.** A generic offline producer could derive two
exact per-texel bits from each final PNG: alpha==255 and maxRGB>0, bound to that
PNG hash/dimensions. They would preserve valid black and allow the same fine-first
four-stencil rule. Each 512² pair costs 64 KiB packed; fine+coarse costs 128 KiB
before transport encoding/JSON/object overhead. Building it from RGBA temporarily
needs 1 MiB per level plus encoded/parser storage. Existing v2 has no such fields;
adding them would require admitted new metadata/publication identity and no rewriting
the frozen r1 or default v1. Root explicitly did not adopt this new contract now.

CPU projection/mask witnesses could certify some positive or empty cases, with
Float32/raster-boundary/coverage uncertainty retained as UNKNOWN. They are not
exact GPU pixels or final source certification. Dense framebuffer scans, repeated
PNG decoding and unbounded per-publication caches would add unmeasured hot-path
CPU/memory; they are not justified by a conservative occupied cell or hull.

**Minimal WebGL1 contribution experiment, pending.** Root chose this as the next
bounded feasibility dependency, not production adoption: reuse the very same
prepared texture identities/windows and fine-first four-stencil shader selection;
retain eligibility separately from photo strength; evaluate a ROI contribution
FBO, actual subsequent alpha attenuation with `ZERO, ONE_MINUS_SRC_ALPHA`, explicit
max reduction and a one-pixel readback. Successful actual later draw coverage and
finish/navigation must be represented; copying only an assumed terrain silhouette
or rerunning unrelated shader variants would not close the required boundary.

The receipt must separately preserve fine-black eligibility and each slot's photo
signal. Ordinary LINEAR downsampling/mipmaps are not an OR/max reduction: an isolated
real fragment can disappear. An RGBA8 carrier can also quantize a positive signal
to zero after partial-alpha passes. Binary initial one is not actual photo strength;
the experiment must define signal format, group `maxRGB*opacity`, reduction and
quantization meaning before interpreting zero as absence. It cannot equate a signal
buffer with counterfactual final-color difference without evidence. Unsupported,
lost or failed operations must retain unavailable/unknown rather than grant credit.

Resource feasibility needs measurement: RGBA8 ROI storage is 4*N bytes, where N is
actual framebuffer ROI pixels; ping-pong max-reduction storage/draws and synchronous
WebGL1 readback add costs. No full-screen allocation, unlimited cache, fixed FPS
claim or new memory budget is authorized by this audit. Restore actual framebuffer,
viewport/scissor/blend/color-mask state and retire all auxiliary resources with the
GPU owner, including failures/context loss. Native capability/performance and full
product acceptance remain separate even if the next software path succeeds.

Entrypoints: `sky-artwork-level-composition.ts:46`, `sky-gpu-renderer.ts:1000/1074`,
`sky-sdss-optical-frame.ts:35`, `use-sky-sdss-optical.ts:37/67`,
`sky-artwork-loader.ts:9/48`, `sky-artwork-request.ts:22`,
`sky-scene-render.ts:212/473`, `sky-landscape-mask.ts:44/105`,
`packages/miniapp-contracts/src/sky-image-display-support.ts:52`, and
`packages/miniapp-contracts/src/sky-landscape-publication.ts:80`.
