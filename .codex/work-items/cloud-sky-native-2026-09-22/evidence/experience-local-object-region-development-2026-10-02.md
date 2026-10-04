# Shared catalog object region — bounded development

Started 2026-10-02; development checks completed after local midnight on 2026-10-03.
This stage implements the object-local **geometry prerequisite**, not a readability
decision, image repair, default science adoption or target-runtime acceptance.
The parent owns PLAN/Context and the companion optional-center contract/provider
change; this note does not close those or the full Goal.

## Input meaning and existing owners

The already acquired, pinned OpenNGC catalog has 51 rows. Its
[column guide](https://raw.githubusercontent.com/mattiaverga/OpenNGC/36cb178a0f69dba8bfc03a99c10512831edf1c6b/NGC_guide.txt)
defines full major/minor axes in arcminutes, position angle north eastwards, and
J2000 equatorial coordinates. Its
[source explanation](https://raw.githubusercontent.com/mattiaverga/OpenNGC/36cb178a0f69dba8bfc03a99c10512831edf1c6b/README.md)
includes different source contributions and some infrared dimensions. These fields
therefore define a catalog angular reference ellipse, not a segmentation of the
current SDSS optical or W3 image, nor a universal particular-band isophote. No new
imagery, license selection, acquisition or threshold was introduced here.

All 51 rows have major axes; 6 lack minor axes and 12 lack PA. Their union leaves
39 complete oriented geometries. M42 has 90/60 arcminute axes but no PA, so its
oriented region is unknown. M51 has center (202.46962499999998,
47.195166666666665), axes 13.71/11.67 arcminutes and PA 163 degrees. Its science
publication owns its separate, more rounded center and actual raw TAN fields;
the catalog axes never become an image WCS or alpha mask.

The existing cached report (`c5f0dc23…`) contains those M51 axes/PA but **does not
contain the new optional catalog center**. The real source pack provides it to the
new contract via the parent's provider responsibility. The local CPU replay and
continuous-time test explicitly supply that source-bound field to exercise the new
contract; they do not claim the historical cached API response already had it.
Old reports/cache entries remain usable with unknown region geometry.

Existing `sky-artwork-registration.ts` owns the raw affine plane and inverse UV.
`sky-observation-frame.ts` owns the actual row-major EQJ→ENU transform and exact
report-frame selection. `sky-sdss-science-registration.ts` owns each publication
descriptor's TAN/CRPIX sampling plane. `sky-view-projection.ts` owns the same ENU
camera ray used by artwork. These were reused without a new projection, GPU API,
brightness probe or registration approximation.

## Production boundary

`sky-deep-sky-region.ts` owns one frozen reference region at the supplied admitted
observation time. With catalog ICRS center `c`, local north/east basis `n/e`, and
PA `p`, its axes are `cos(p)n + sin(p)e` and `-sin(p)n + cos(p)e`. Full angular
diameters become tangent half axes `a = tan(major/2)` and `b = tan(minor/2)`.
The raw ray plane is `c + a*s*majorDirection + b*t*minorDirection`. It is rotated
with the **actual** report matrix without independently normalizing the affine
anchors. Existing raw-plane inverse produces `s/t` for the same ENU ray; membership
is `s²+t² ≤ 1`. The 180-degree full-axis restriction is the tangent chart's
hemisphere limit, not an image/readability or performance threshold.

Missing center/minor/PA, invalid dimensions/rotation, a degenerate plane or an
unrepresentable/reversed ray returns null. Null means unknown geometry, not absent
pixels, zero signal or an unreadable object. No circle or zero PA is fabricated.

The actual Scene calls `submitSkySceneScienceOptical` with only its exact selected
entry from an `ICRS J2000` catalog. The helper additionally requires its objectRef
to match the science frame and retains `submission.region|null` alongside the
actual draw. This binds a **future local observation domain to the real submitted
group**; no local GPU observation/decision consumes it yet. Existing original
expected fine/coarse, qualification, source completion and `allowInfrared` remain
unchanged. A missing region does not qualify EMPTY or enable W3. Scene skips the
catalog search altogether without explicit science port/image, preserving normal
default/legacy hot-path behavior. The ordinary page still has no science port.

`presentSkyTime` already retains the same static deep catalog while reprojecting
dynamic directions. The affected control now verifies its actual MODEL path keeps
the source center and registers it with the new exact observation, while the same
old cache/model remains without center and yields null. No time-model/image center
is used to reconstruct the missing catalog fact.

## Current-source observations and controls

The original task-only prototype remains separately saved in
`output/local-object-region-readonly-1002-r1/result.json` (`704a716a…`). Its counts
do not certify the later production implementation.

The **fresh current production** replay is
`output/local-object-region-production-1002-r1/result.json`, SHA256
`8273fa48499c9d826efe2781b79e5f67a5e5a08ff6ee578847c1414bbdfb05d9`.
It calls the actual `registerSkyDeepSkyRegion`, actual ray membership and shared
inverse/registration, with cached exact report at `2026-09-30T20:00:00.000Z`,
actual saved camera basis, and the unchanged three writer PNGs. The CRC/inflate/
PNG-filter decoder is extracted from the existing saved script's two decoder AST
nodes; the old GPU/script side effects are not executed. CPU selection uses the
actual four-neighbor full-alpha rule and fine-first fallback; RGB/brightness is
never a validity or region input.

For the 390×844 pixel-center rays at 2.8 degrees, the catalog region contains 3174:
296 select DETAIL, 2878 select OVERVIEW, and none lack both. Another **1530 coarse
selected rays are outside the catalog region**. At .18 degrees all 329160 rays
are inside: 71148 fine and 258012 coarse. At .05 degrees all are inside/fine.
This demonstrates an explicit local domain and real selected-support separation;
it establishes neither local readability nor a band segmentation. CPU doubles and
encoded alpha do not certify GPU Float32/filtering, physical native availability
or driver timing. A valid black fine sample still cannot be replaced by coarse;
positive coarse pixels outside the object do not certify its local appearance.

New actual-owner checks include full-axis units, north-east oblique PA, missing/
invalid fields, retained raw matrix weights, immutable captured geometry, 39/51
source status, and the actual Scene call expression into the real helper. The
callsite control has a controlled admitted structural science field/group boundary;
it uses a deliberately distinct catalog center and checks non-ICRS/ref/missing
inputs preserve qualification/W3 behavior. A throwing objectRef getter proves
no default catalog scan. This call-expression control is not full Scene rendering;
the adjacent actual Scene/page controls remain part of the affected batch.

Bounded in-memory mutations of the actual owner double the half-axis angle or
reflect the major PA direction. Independent north and oblique asymmetric ray
witnesses expose the wrong membership. No production file is mutated. Existing
actual Scene/page tests additionally retain common-opacity acceptance, HAS/black,
EMPTY, expected-ready failure, independent retirement and later-layer completion.

## Checks, failures and source generations

`output/local-object-region-development-1002-r1` saves the current internal static
import graph, external package entry bindings and seven execution source copies
before checks. Its 298 source/data bindings are equal before/after; the graph is
`e7ff8ba0e0b89c56b92a87863096c55aaeaea06772a51afab012a2c3b8e80b0c`.
It binds the actual page and affected tests even where tests execute selected page
AST. This is not complete vendor/platform transitive build reproduction.

Ten affected test files passed (75 cases): region, common auxiliary page, science
Scene/registration, optical completion/page/acceptance/legacy Scene, canvas time,
and science/legacy frame handoff. Their exact commands/output are in `checks.log`
and `check-results.json`. The initial app TypeScript 5.9.3 check failed with one
TS2379 in the new invalid-input test: explicit `icrsCenter:undefined` violated the
optional field's type. Production/contracts were not expanded to accommodate it.
The final test now genuinely omits the field. The original failing result/log stay
intact; `r2` reruns only the changed six region cases and app TS5.9.3, both exit 0.
Every other production/data input is unchanged, so the 75-case consumer pass and
production CPU replay are referenced in their original generation.

Final `output/local-object-region-development-1002-r2/check-results.json` SHA256:
`5c474d49fb72d04f929d2e0e3bfe862f105400fe4ae4d5f2d4a4b11c45e2ea94`.
Final equal before/after inputs SHA256:
`33f4cfe28869be86e2c5b2a4d32a815751747f32b5a9195af8bb24b950f1436a`.

The full canvas-time consumer file initially revealed three stale test assumptions/
bindings. `before-fixture.log`, result and exact old test/Scene/page copies retain
the actual failures. Only those fixtures changed: current full-sphere projection
draws a valid lower-hemisphere target but still excludes an away narrow viewport
and missing basis; actual invalidated callback clears pending/painted/presented
state and real canvas-size reducer state; actual `skySdssOpticalFrame` consumes
already-admitted structural exact primary/parent descriptors. The latter is not
transport/byte admission. The complete repaired file passes, with no dropped
boundary checks or production change for these test repairs.

Final production source SHA256:

| Owner | SHA256 |
| --- | --- |
| region | `2ded6d366f69a0a5c9fab82b6c6cef667b6b24b0f865ffcfc1f3b092bd23eb8b` |
| science submission | `6ab096521c0690c667bc42481162c03971ea524663d01457c09092300e7af145` |
| Scene | `53c5e70bbf27edf508fdb39f2273077e4b2ff6b6e7de23d29ed8a9a84f55188f` |
| unchanged page | `522d3ef3518ac9739a13ea019e7de68f8d21c14cd4629f1d9c74fd09ad3dbc88` |

The exact prior common-opacity Scene `e11b2bdb…` was copied from its already frozen
execution source **after** current checks for historical comparison; it was not
reconstructed. Old software-GPU Scene `2d9…` evidence remains historical and is
not upgraded to e11/current53c5 by this CPU/controlled-surface stage. The parent
retains separate provider/contract checks and the known outside-path worker TS
errors; this note neither reruns nor closes them. No IDE/watch/phone/GPU or external
image acquisition was performed.

The next dependency is a justified shared local observation/decision before aids,
using this domain with actual selected support and honest unknown/valid-black
semantics. Readability/opacity beyond the preserved legacy curve, full source
quality/PSF/color, full-scene resource/native budgets, science default adoption,
WEAPP/new Moon/physical-device and 200DAU delivery remain open. Independent review
of this frozen region change is a separate owner; this author note is not it.
