# Opt-in SDSS science metadata epoch — author evidence, 2026-10-02

This responsibility provides one immutable publication snapshot and a read-only
public-file-cache generation capability. Pending requests own cancellation
subscriptions; a settled query retains no demand subscription. It does not
authorize acquisition after retirement, supply native decoding, or adopt the
science images into the ordinary scene. The Hook must still check this stamp
before handing metadata to its image loader; Root and Sphere own that review.

## Actual failing-before and correction

The new helper at SHA `77e596ea067e4eb0a244002b9343fecb3ad6ac014b57ae2989e07fd8ce7f3e03`
froze its copied publication recursively but returned a mutable outer object.
The actual focused test failed `Object.isFrozen(resource)` with `false`. One
observer could otherwise replace `publication` or `isCurrent` on a shared result.
This is a defect found during this new module's development, not evidence of a
historical deployed defect. Root corrected only the outer return using
`Object.freeze`; corrected helper SHA is
`daafee434d960fba8681b01e9ca549f4cf55fb71fe74261e24df4cddaa616466`.

Before evidence remains in `output/sdss-science-optical-resource-before-1002-r1`:
the exact original helper and runtime sources, failure log SHA `361e57628d2addbcad326773d249281e59e64ae21da1fa931833819c8b7f53f1`,
and observation JSON SHA `ec1b5c3c7e8ef5388f95b9b7273cb990926cd447126d9fa74d1bd7e4dba8d5e3`.
The failing case also observed the nested snapshot protected from borrowed-body
mutation and the settled request subscription already removed.

## Actual real-publication run

`output/sdss-science-optical-resource-after-1002-r2` executed current test SHA
`cb4b3a5ce078eb929ac3d02135ad7bd6611a6a36b6af8692d89b25d96c415d29`
with `CLOUD_SKY_SCIENCE_PUBLICATION_PATH` explicitly pointing to
`output/sdss-science-optical-writer-1002-r1/publication`. Its manifest was the
frozen actual file SHA `3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5`,
with optical publication hash `34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0`;
all three saved PNG files were read and checked in full. Six focused cases pass.

The full helper, client, bare request module and runtime were transpiled and
executed; the real shared file-cache factory was used. The controlled adapters
were Taro callback requests, in-memory filesystem callbacks, and AbortController
faults. A single appended read-only runtime tap exposed the actual pending-demand
Set size. This is software owner evidence, not a WEAPP/native, HTTP or GPU run.
Bindings cover 11 named source files, the real manifest and three PNGs, and all
six preserved settings/outbox files. These 21 before/after rows are identical,
SHA `2455b746dfee1f60115a9334ef639a1510ba248f6d89bd7bae82cdfcec3b09db`.
This bounded list is not an entire Node loaded-module graph or package audit.

Observed obligations:

- Pre-aborted query creates no request and no cache owner. Settlement, metadata
  rejection and query cancellation remove request subscribers and signal listeners.
- Pending clear rejects the resource before late response delivery. Taro abort
  throwing does not fabricate its callback. When AbortController abort itself
  throws, the underlying bare signal listener stays at one until actual late
  response settlement, then becomes zero; the resource stays rejected throughout.
- A response completed in the same turn as clear cannot cross the generation
  fence. An already resolved resource becomes stale after clear, without starting
  requests. Releasing an independent demand or cancelling its settled query does
  not invalidate other observers of the same resource.
- Explicit retry produces a current new-generation capability. Two file consumers
  share one exact real DETAIL transfer, 366,884 bytes, SHA
  `eb847b30d92fada60ccc213df57b614fe37f142038b35b40a8afa623b92d3d91`,
  and retain independent leases. Clear reports partial while a retired lease owns
  that file. Release followed by cleanup yields zero bytes, leases, pending,
  running, reserved and retired file entries. This is not a native bitmap/GC claim.

Actual observation JSON SHA is
`ff4ecd3f4995ddb255d0f234998ab6fd84e5ac10152b68535dd598bb0c967a4b`;
actual test log SHA is `ff61316673bee08a11395e0a36131772ffc139730e835c3a14690f6a234a2182`.
Executed test and production source snapshots are retained alongside these files.
The previous actual r1 remains unchanged: executed test SHA `6757e0876271aafb77c90b6a5c7abcd6b9f751549769b762ae2fa0404c4ee5ad`,
binding SHA `966a7a6d94a8303516c8bfb465006eeec9ba9be79394ad950c7fe52974581b6d`,
and test log SHA `56bf3b0021147320e9ddc89aad76983561ae3380add31519922c295986bf753b`.
After the binding-only portable repairs below, Root authorized the same six cases
once more against the same actual publication. R2 observations independently
serialize to the identical r1 observation SHA; each generation keeps its own
executed source, actual run log and before/after bindings.

## Portable test delivery and scope

The current test at `apps/wechat-miniapp/src/services/sdss-science-optical-resource.test.ts`
is SHA `cb4b3a5ce078eb929ac3d02135ad7bd6611a6a36b6af8692d89b25d96c415d29`.
Its portable default builds the existing explicitly synthetic structural/transport
fixture; it does not require an ignored task output or certify science imagery.
Two binding-only corrections followed the original real r1 run: task preserved-file checks are
enabled only for explicit actual-publication mode, and Windows cross-drive
absolute input paths are read as absolute. The complete diff and source are in
`output/sdss-science-optical-resource-source-closure-1002-r1`.

Portable r1 failed before any case because a C-drive generated input was incorrectly
joined to the E-drive workspace. The failure log remains in
`output/sdss-science-optical-resource-portable-1002-r1`; its generated temporary
fixture was verified by absolute parent and prefix, then moved to the recycle bin.
Portable r2 passes the same six cases; its log SHA is
`a53bee35a9ffa6da4d241e1810fc2a0a4cba21bb4895b02cecfa5d75f8ea250f`.
Current package-local TypeScript 5.9.3 check passes, with exit receipt in the source
closure directory. The earlier note SHA `0cf96e0f0d42ea82ec68b932b4a981482b0fdfdf8ead502509ba6881039eb531`
is preserved as `author-note-before-r2.md` in that directory. No old observation,
source snapshot, binding or failure log was rewritten.

Sphere independent review is pending at this note freeze. Source-frame admission,
renderer one-pass composition/foreground semantics, ordinary scene integration,
optical image quality, native total resources and final product acceptance remain
separate open obligations. No publication/source/asset, production owner, default
registry, PLAN, Context, service, device or GPU was changed by this test author.
