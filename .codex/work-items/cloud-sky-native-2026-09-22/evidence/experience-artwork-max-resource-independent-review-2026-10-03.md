# Independent shared MAX/resource review — 2026-10-03

No blocking production discrepancy found in this bounded change. This review
executed a Node saved-output reader and controlled actual-owner preflight only.
It did not launch a browser/GPU, decode original astronomical sources, fetch data,
run the broad suite, or alter production/Context/PLAN/protected files.

## Current source and exact change

Current `sky-gpu-artwork-contributions.ts`: 26,990 B,
SHA `bce43f58c32efbdcd20a14e327d5cb4df7037ae6d008b0176ee5362368b480da`.
The exact pre-change owner is R2's `executed-gpu-artwork-contributions.ts`.
Reversing only the shader-main/stride section, ceil divisors, and the actual loop
formatting reproduces that saved source byte-for-byte. R2/R3's 99 parser path
sets match and this is their sole changed parser input. Scene, renderer, ordinary
shader, publication/image alpha, source credit, policies and recovery are unchanged.

One static generated main serves both global/local shaders: every offset in
`[0,3] × [0,3]` is sampled with component-wise MAX. `ceil(w/4),ceil(h/4)` plus
clamped texel-center sampling partitions every original integer texel; duplicate
odd-edge samples are idempotent. The local first pass applies the same original
positive-branch/circle predicate separately to each original clamped pixel; later
passes are global MAX. Its zero stays UNKNOWN. No new area-absence, readability,
scientific-validity or arbitrary native/GPU precision certificate is implied.

The private-shader captured owner prefix plus the two declared accessor exports
matches current bytes exactly. Independently transpiled current source produces
the exact saved global and local GLSL strings, including their common main.

## Independent execution and actual saved outputs

[Reader result](../../../../output/artwork-max-resource-independent-1003-r2/result.json):
53,884 B, SHA `e47042940f0047a42b63846075892323bdff59d6b3b046cfc3efdd9d3f8dc499`.
Actual Node exit 0; 188 admitted inputs before/after exact, including all six
protected items. R2's historical owner/driver use their exact saved copies rather
than requiring those old identities to match current files. Saved launch/host and
parser receipts were checked; this does not invent a complete historical build-tool
or native dependency trace. The reader's TypeScript 5.9.3 source/package is bound.

I independently decoded three PNGs with CRC, zlib, all PNG filters and row reversal
against full bottom-up RGBA. All nine cold/warm/idle buffers and the three encoded
PNGs are byte-identical to old R2. Every saved completion, participating level,
credit string and exact versioned route agrees. Cold/warm have the same whole
pixels; idle has no optical completion. Diagnostic pixel copies are outside the
production allocation model.

All six old/new identity ledgers were rebuilt from create/storage/attach/detach/
delete-request events. Texture/buffer bytes, frame snapshots, draw/readback counts,
and final record state agree; all managed kinds have balanced create/delete
requests, attachments end empty, and same warm frames create nothing. One-byte-
insufficient policies create no auxiliary framebuffer and perform no receipt
readback; normal image rendering remains intact with no credit.

| Physical buffer | Old/new auxiliary bytes | Old/new intermediate bytes | Old/new normal draw calls |
| --- | ---: | ---: | ---: |
| 390×844 | 1,756,540 / 1,405,080 | 439,900 / 88,440 | 23 / 13 |
| 1170×2532 | 15,803,512 / 12,641,968 | 3,953,752 / 792,208 | 27 / 15 |

The ratio-3 reduction is 3,161,544 declared auxiliary bytes. Two source textures
remain 2,097,152 B; buffers peak at 144 B in this path. The full managed-texture
peak includes source plus auxiliary storage: 17,900,664 → 14,739,120 B at ratio 3.
These are declared storage/deletion requests, not physical VRAM or total-client
memory. Implicit canvas/depth/AA/alignment, driver residency/GC, decoded-native
images and file owners are not certified. One-off software timings are not a
phone performance or FPS result.

Independently recomputed saved actual controls: all 16 offsets (including a
1/255 channel), odd final texels at 61×93/1×17/17×1, linear-camera local circle
excluding the brighter exterior, and negative branch. Their 21 complete bytes
match direct CPU/MAX expectations and a 2×2 reference. Missing `(3,3)` produces
zero; averaging produces `[16,16,8,0]`, so both actual GPU mutants fail the MAX
oracle. All their managed primitive objects have matched deletion requests.
Additionally, 441 small dimensions cover every original texel and five
deterministic all-channel arrays match direct maxima. This is discrete algorithm
and saved-software evidence, not a new GPU execution or general region precision
proof.

Actual current-owner controlled GL checks independently establish: default/invalid
policies do no GL work; 3×5 requires 72 B; 71 B is refused before guarded setup
despite a later mutable-caller increase; exact 72 B enters setup; controlled setup
failure latches until explicit reset; ordinary GL error propagates; reset reopens
preflight. This scaffold deliberately stops before shader allocation and makes no
fake successful pixel or receipt claim.

## Finding, repair and historical failures

I found the old ordinary-error/reset test still used 95 B and explained refusal
using the former 96 B demand. Current demand is 72 B, so its allocation-zero result
was instead caused by the mock's failed setup. Root preserved old test
`reviewed-contribution-test-before-fix.ts` (SHA `7869037af2ea70e526e17b1a1885e23dabe1c5beee3ae6b16c0fbe1659365722`),
then changed only that case to 71 B and added explicit latched/reset preflight and
setup refusal assertions. Current test SHA
`e7e9a206f6dd63dda88981e2db0bcf065f223a5b0c8e1658a3518fc9f564edb0`.
I read the exact diff and actual eight-case passing log (SHA
`2aa59369ecb8e79087c8c6d6bbd4285795e2d82dac97eaeebb557082815d7afa`).
This final test binding is later than the reader's 188-input inventory and is
recorded separately; it is not backfilled into the historical GPU execution.

My reader R1 failed solely because its byte reversal omitted the ceil-loop
formatting change. Its failure and executed script remain immutable; R2 corrects
that exact formatting assertion and executes the full readback. Author's earlier
host-input/pre-GPU and atomic-patch failures remain historical. Neither is erased
or presented as product/native success.

## Remaining scope

One ready Prepared pair, controlled NIGHT and catalog UNAVAILABLE, explicit task
auxiliary limits, two software physical sizes. Normal Hook/accepted-page/full
catalog/complete native journey, native visible attribution/layout, driver support,
budget adoption, capacity and source-quality acceptance remain open. Prepared's
ordinary/default registry is empty. Unchanged pixels do not repair the known
photo rectangle/background, weak structure, colour/PSF or approximate AVM limits.
