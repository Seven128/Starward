# Pre-aid local observation: bounded implementation proposal

This task-local note closes a read-only prerequisite. No production, PLAN,
Context, budget or default was changed. No imagery acquisition, GPU/IDE/watch or
native run occurred. The next implementation is **facts before aids**, followed
by one small actual-output display-policy trial; this note adopts no fade number.

## Product meaning and direct reference

The user asks for scale-dependent fading and reverse restoration of area aids,
with selection and actual imagery preserved. This does not require automatic
recognition of astronomical objects. Previously saved M31/M42 views retain and
enlarge science textures; a perimeter/name leaving the viewport is not measured
alpha fading. The existing eight user images and Altair capture sequence also
separate illustration, lines, names, selection and background imagery.

Here **local readability** is shorthand for an aid's display eligibility under
the adopted interaction policy. It is not a generated/object-recognition result
or certification of scientific image quality. The name/ring natural fade and
reverse-restoration obligation stays intact; an absent classifier is not a new
dependency or reason to leave that obligation unfinished.

The already researched official commit's [dso.c](https://github.com/Stellarium/stellarium-web-engine/blob/29870744c470ddc62fa869e153178c82a7824fa4/src/modules/dso.c)
was read through the web tool, without importing/copying engine code. Its DSO
symbol policy uses projected size, magnitude, visibility intent and clipping;
selected symbols have a different size fade. Hit areas are registered before
hint suppression. The label function has separate colors and perimeter-relative
placement, rather than applying the symbol's opacity. No local image/readback
gate appears in these functions. This is pinned source behavior, not a binding
to the deployed website binary or permission to copy its numbers/code.

The smallest project direction is therefore **scale display policy plus a local
no-effect/unknown restoration guard**. Source participation, local surviving
photo and permission to replace an aid are three different facts. Existing
24–96 legacy tuning can remain a candidate to inspect, not a newly validated
threshold. Selected breathing reticle/name behavior remains with its existing
owner and the user's separate instruction.

## Real current inputs and the small CPU read

`output/pre-aid-local-samples-1003-r1/result.json`, SHA256
`c014068779f1fe2db46f5629f1477ec58ffe6754d100ff2fb2613cbdb57f6685`,
reads exactly the existing three writer PNGs and thirteen declared rays in one
saved 390×844, 2.8° camera. It does not replay the prior view grid. Actual current
region, TAN registration, inverse, exact observation, projection and legacy
opacity owners are bundled without transforms; 69 source/tool/data identities
are equal before/after. The old cached report lacks center: the new optional
field is explicitly supplied from the pinned original catalog, not claimed to
have been in that response. DETAIL/OVERVIEW is an explicit diagnostic pair,
not normal request policy. MEDIUM is read independently.

Five interior probes select DETAIL, four select OVERVIEW. Their encoded max-RGB
ranges are approximately .277–1 and .0315–.0936 respectively. These are sampled
source values, not current GL attenuation, area proportions, contrast, quality or
recognition. Four declared exact ellipse-edge probes remain UNKNOWN despite the
CPU inverse's near-unit rounding. No probe count licenses local EMPTY. The legacy
scalar is .3190884173395092; science currently keeps its aid at 1. Neither number
was adopted through this read. The unchanged overview/detail PNGs and two old
M31 reference images were also actually viewed; new source quality/default remain
unadopted.

The execution receipt is `output/pre-aid-local-samples-execution-1003-r2/result.json`
(`e23bde80…`, exit0); raw output is `raw.log` (`3b57bc9b…`). First execution
`…execution-1003-r1` retains the exact parser failure/raw receipt and old script
`b63a117c…`; a task-only expression whitespace correction preceded the successful
execution. It failed before executing the observation script or creating its
output. TypeScript 6.0.3 here only extracts the saved decoder AST; it is not the
App/worker typecheck, whose correct 5.9.3 results remain separately owned.

## Minimal optional API and direction

Keep the direction: shared admitted source/region → renderer facts → Scene display
decision → accepted Canvas/DOM record. Do not make a low-level observation depend
on page state, catalog entries or the final source modal.

Add an optional contribution-capability method, names illustrative:

```ts
artworkLevelsObserveRegion(draw, frozenRegionRegistration): LocalObservation
// copied immutable result, not a live renderer getter:
// { signalRevision, fine: { selection, photo }, coarse: { selection, photo } }
// selection: "has" | "empty" | "unknown"
// photo: "positive" | "unknown"
```

It belongs to the exact current submitted draw and frozen region registration.
The science submission already owns exact reference/publication/frame and
`region|null`; it supplies only the matching region to this capability. The
first implementation should measure clearly interior **pixel-center** facts,
not area coverage, object absence or semantic readability. Region null, foreign
draw, unsupported/uncertain branch, insufficient numerical assurance, denied
budget and unusable auxiliary state return UNKNOWN without invented geometry.
Positive requires a measured component from that slot inside the admitted local
domain. A CPU strict contains Boolean is not the GPU mask certificate.

Use the existing same-prepared contribution target: R/G are surviving fine/coarse
photo, B/A are fine/coarse selected-sample facts. Apply the region test to source
sample coordinates during the first existing MAX reduction pass, then reuse
the existing scratch chain and one-pixel readback. Do not allocate a new full
plane, generate/upload a CPU PNG mask each frame, reread source images, or loop
getters. Store only the captured camera/numerical uniform facts needed by the
group; no new source/native lease is retained. The observation uses the actual
group camera/backing size, including center/DPR, rather than React's latest view.

Local readback zero remains UNKNOWN. The initial positive-only path does **not**
manufacture local EMPTY from skipped edges or zero interior centers. An actually
absent coarse slot, or the existing complete prepared group's whole-buffer
selected-coarse EMPTY, can establish that it is unselected for this domain;
that is a neutral slot, not a required photo-positive slot. A future genuinely
local EMPTY would require complete domain/edge/expected-preparation assurance,
which the first path does not supply. Existing global qualification and optical/W3
selection remain unchanged.

| Actual local selected facts | Photo facts | Meaning for the next scale policy |
| --- | --- | --- |
| fine HAS; coarse established unselected | fine positive; coarse unknown | Coarse is neutral. Fine provides local effect; no recognition claim. |
| fine HAS; coarse HAS | fine positive; coarse positive | Both effects are recorded independently; size policy still requires actual-output adoption. |
| fine HAS; coarse HAS | fine unknown/black; coarse positive | Preserve aid: exterior coarse cannot override unknown fine core. Do not OR the slots. |
| fine established unselected; coarse HAS | fine unknown; coarse positive | Independent coarse effect remains usable for the same display-policy trial. |
| selected slot HAS | its photo zero/unknown | Preserve aid without declaring missing source, EMPTY or failed image. |
| geometry/selection/precision/edge incomplete | any/global positive | Preserve aid for this unresolved decision; global participation cannot fill the gap. |

These are fact/guard boundaries, not a final image-recognition algorithm or a
claim that two positive bytes prove an aid can disappear. The first formal step
can deliver the optional observation while leaving the science scalar unchanged.
Then one small task-only actual Scene path can evaluate the existing size-curve
candidate against these guards before adopting any new common scalar policy.

## Pre-aid ordering, revision and accepted lifetime

The renderer wrapper must `assertAvailable → flush → assertAvailable → observe`.
Scene calls it once immediately before its first deep-catalog aid, after preceding
stars/bodies/lines have actually flushed, not after finish and not once per object.
Calling finish or moving terrain/navigation earlier would change the intended
image and final provenance. Later aids and terrain may attenuate final photo;
they do not retrospectively rewrite the copied pre-aid decision.

Cache by exact draw + immutable region identity + actual signal revision. Capture
establishes a revision; successful R/G replay/clear and photo invalidation change
it. Truly additive draws that do not modify the target need not change it. Begin,
reset, resize, loss, dispose and foreign draws revoke all eligibility/cache entries.
An unfinished observation is distinct from completed provenance. Repeated queries
at unchanged signal can return the copied result without GL; a real changed signal
needs one fresh reduction. This is explicit extra work/cost, not a cheap getter.
Ordinary renderer errors propagate; auxiliary failure returns UNKNOWN and retains
the existing bounded explicit-reset behavior.

Scene's existing frozen `{reference, opacity}` records remain the common actual
draw authority. Only accepted lifecycle completion publishes them. Native-current
and Canvas-generation fences apply at decision/acceptance; retirement/clear must
drive a real replacement paint through existing Hook/dependency/request owners.
DOM must not recalculate from final/latest source or restore alone. Hide, failed
completion, resize and remount clear presentation, while catalog/picking identity
continues independently. No science/default capability or extra budget is enabled.

## Next bounded implementation and decisive checks

1. Implement only the optional exact-group observation, signal-revision cache,
   flush wrapper and matching science-submission caller. Reuse contribution
   resources; expose positive facts and zero/edge UNKNOWN first.
2. Use one existing M51 actual Scene view/publication and its real fine/coarse
   pair. Keep its full original output, raw local observations, same-frame scalar
   and method/resource ledger. Reuse existing black-core, late-foreground and
   retirement controls; a coarse-unselected control must not demand coarse photo.
3. Demonstrate a useful ordering/cache defect control: a buffered prior draw must
   affect the observation after flush; unchanged revision avoids another reduction;
   later draw alters final provenance without changing the earlier scalar. Complete
   failure/resize/retirement cannot publish the new record.
4. Only then adopt a display policy from actual comparable output and reverse
   restoration. No automatic full matrix, new source acquisition, parameter search
   or upgrade of historical GPU/native evidence is implied.

The likely touched owners are `sky-artwork-level-composition`,
`sky-gpu-artwork-contributions`, renderer, science submission and Scene; the
existing common-opacity/accepted page contract is reused rather than replaced.
The forthcoming actual capability change needs its own import graph and affected
checks. This read's CPU bundle graph is not proof of the full renderer/native
toolchain. Ordinary defaults remain zero auxiliary budget. Native GPU precision,
cost, overall quality, natural fade delivery and final 200DAU acceptance stay OPEN.

Edge details and exact prior boundary witnesses are independently recorded in
[the edge note](experience-local-observation-edge-semantics-independent-2026-10-03.md).
The existing resource R2 remains MEASURED_WITH_FAILURES/exit1 with diagnostic
image26's historical membership UNKNOWN; this proposal does not upgrade it.
