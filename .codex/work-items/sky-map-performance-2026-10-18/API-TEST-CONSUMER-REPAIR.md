# API consumer compatibility repair

The six failures classified in API-CURRENT-TESTS.md were repaired only in their existing tests. No API or Sky production code changed.

- BSC HTTP and SAO consumers now compare all independent admitted catalog/tile positions, including real below-horizon rows. They retain identity/order, exact transformed coordinates, wrong-publication rejection and existing HTTP/detail checks.
- Mizar's neighbouring Alcor keeps its own exact HR/HD/HIP editorial source and licence; it cannot borrow Mizar's source, while the other unprovided neighbour still has no invented editorial record. Original facts/aliases and cross-component rejection remain.
- SDSS export distinguishes 24 image assets from the eight admitted source manifests, verifies every image and manifest's exact bytes/hash/headers, and still rejects internal master/receipt/binding routes and modified image bytes.
- Sun/Moon consumers retain both named scientific references and the separate adopted editorial attribution. Mutation isolation and unavailable/recovered lunar publication remain checked.
- Revisited stellar frames compare stable frame content and lazy display results rather than new function object identity. Same-time reuse, single-current-frame replacement, invalid time/catalog/observer rejection and compact wire data are retained.

The six affected existing files ran **20/20 passed, 0 skipped**. API typecheck passed after adding explicit presence assertions for the optional lazy-function type. Logs are ignored in `tmp/api-current-repair.log` and `tmp/api-repair-types.log`. TEST-CONSUMER-INDEPENDENT-REVIEW.md found no blocking issue or weakened boundary. These focused results do not re-certify the 38 environment-dependent skipped checks or remote CI; a coherent integrated run follows all shared fixture repairs.
