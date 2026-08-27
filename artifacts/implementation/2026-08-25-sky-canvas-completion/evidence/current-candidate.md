# Current candidate evidence index

- Final native candidate: `a587d41aca2997cc1019c7b9ad8441f21c4e05750b69843a601b45c402e7e961`; candidate-before and candidate-after are identical.
- Final complete-current session: `artifacts/miniapp/native/runs/wechat-devtools-2026-08-27T13-35-53-321Z-d3f8a03e/session.json`.
- Native result: passed; 9/9 production journeys; every `injected_fixture:null`; 0 unexpected console errors; 0 exceptions; 2 exact known WeChat Automator opaque envelopes; final quiescence and cleanup passed.
- Durable runtime: run-unique PostgreSQL/PostGIS, run-unique Redis namespace and run-unique private media filesystem; `fixture_mode:false`; `memory_test_mode:false`; database, Redis namespace and media cleanup passed.
- Native visual probes: child-route back arrow exists in the native tree as a visible source-derived PNG; Sky header reports `padding-top: 47px` and remains below iPhone 12/13 simulator status chrome in Astronomy and Orientation screenshots.
- Visual audit: `artifacts/design-audit/2026-08-25-sky-canvas/REPORT.md`.
- Visual comparisons: `artifacts/design-audit/2026-08-25-sky-canvas/comparison/`; 12 Mini Program frames (Profile Import is explicitly gated) and 7 Operations frames were reviewed side by side.
- Fast contracts/API/Mini Program/design checks: `npm run check:miniapp:fast` passed on the final candidate; contracts 8/8, API 56 passed + 1 infrastructure-lane skip, Mini Program 23/23, workflow 16/16, design system/icons/semantic assets/design bindings passed.
- Infrastructure: `npm run test:miniapp:infrastructure` passed as run `verify_9f15b14fe599443c`; PostgreSQL/PostGIS, Redis, restart/readback, backup/restore, HTTP and cleanup passed.
- Operations build: `npm run build --workspace @starward/admin-web` passed; the build includes `tsc --noEmit`.
- Operations production-data launcher smoke: authenticated production APIs created local user/submissions/media in a run-unique PostgreSQL database and private filesystem; ready state reported `fixture_mode:false` and `memory_test_mode:false`; cleanup dropped the database and Redis namespace.
- Context: `make validate-context` and `make validate-harness` passed on the final candidate; touched warning count 0 and 9 bounded owner/expiry waivers remain visible.
- `ty-context doctor` completed on 2026-08-27. Formal preflight remains fail-closed only at stale immutable feasibility bindings: Mini Program `source.miniapp.tokens` expected `5e11c083fc2ce19bbd905eb742f07a36dc763cdb0988d8c3d58cb7e1fc40add5`, current `337096210e1a6cfa3a68e8db14893c350a344c85eba4724c0e70517f5e85e286`; Operations `source.operations.platform` expected `e6b03df4260f175565a41f3df287e0bc4a2daec3c9e487a753ba479a7d7adbc4`, current `2fcb45020926aee1118a1ce5ff731f15db4447b751a916c4f1ab698e08c411ee`. Immutable selected handoffs were not overwritten.
- Production-data boundary: no Mini Program or API non-test owner imports `@starward/miniapp-contracts/test-fixtures`; explicit acceptance fixture mode remains isolated and visibly marked. Production publication policy rejects sample sources.
- Remaining external device-only conditions: real phone compass stream, haptics, outdoor brightness, reduced-motion and low-end device performance. These are not claimed by DevTools evidence.
