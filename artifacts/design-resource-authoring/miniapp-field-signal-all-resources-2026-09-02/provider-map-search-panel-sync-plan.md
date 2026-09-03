# Open Design current-system sync plan

> Task-local execution record. This file is not Design Authority, selected Source, a candidate, or acceptance evidence.

## Purpose

Synchronize the already published Open Design identity
`user:starward-mini-program-sky-canvas-field-signal-revision` to the exact current
Mini Program design-system section after the owner's accumulated eleven-point review and
the subsequent seven requirement groups. The linked system project and the bounded DRA
task Commission must receive the same current inputs before a new candidate run starts.

## Exact repository inputs

- Stable target: `target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`.
- Canonical section: content after the exact H2
  `## WeChat Mini Program — Sky Canvas Field Signal`, stopping before the next heading of
  level two or above, heading excluded.
- Canonical section SHA-256: `8ef768c6b9f1fb0e09bf4ca9835d5825b24d5a2a49f2c11eab985d9be7368bfe`.
- Provider body: exact H2 + LF + canonical section, normalized with `trim + one LF`.
- Provider body SHA-256: `98218fd2a884373222a1b0e9e7892c133bbb4f78aeedec2c17a2ccc1fd9eae41`;
  41,265 characters / 62,689 UTF-8 bytes.
- Current component/layout Source:
  `docs/design-resources/miniapp-field-signal-map-search-spot-panel/selected-source/DESIGN.md`,
  SHA-256 `52104dfa7d34e27c95f3b971c6f1e306d95aba2a5d2f1edc5c414fb51073aae4`.
- Current Commission:
  `artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/commission-brief.md`,
  SHA-256 `d243ea93fd68d74405ed56f2e1500c5a8d7070b5bf4832b87410abba1a9050ad`.

The former Map/Finder and review-directed component Sources remain immutable historical
audit inputs only. They are not concatenated into the current body and may not provide a
fallback path.

## Bound identities

- Design-system identity: `user:starward-mini-program-sky-canvas-field-signal-revision`.
- Linked system project: `ds-starward-mini-program-sky-canvas-field-signal-revision`.
- DRA task project: `starward-miniapp-field-signal-all-resources`.
- Task conversation: `4f290527-9979-4b24-b92c-8365b470bf9d`.
- Candidate run profile: Codex / `gpt-5.6-sol` / `xhigh` / `frontend-design` /
  `sessionMode=design`, with no plugin or applied snapshot.

## Allowed provider mutations

1. `PATCH /api/design-systems/:id` with only `status=published`,
   `artifactMode=agent-managed`, and the exact current body.
2. `POST /api/projects/ds-starward-mini-program-sky-canvas-field-signal-revision/files`
   to overwrite only `DESIGN.md` with that exact body.
3. After both system paths verify, overwrite only the DRA task project's `COMMISSION.md`
   with the exact current Commission.

No supporting design-system file, project identity/binding, existing candidate file,
pending revision, plugin binding, snapshot, production file, or selected immutable Source
may change during this sync.

## Preconditions and postconditions

- Open Design health is `ok`, provider version is `0.21.1`, and live workspace authority
  resolves without persisting the member identifier.
- The design-system remains `published`, editable, `agent-managed`, and linked to the exact
  system project.
- A mutation may start only when no run for the task project is active and every existing
  candidate file matches its pre-mutation byte hash.
- Registry structured body, provider root `DESIGN.md`, and linked project `DESIGN.md` must
  all end at `98218fd…`.
- The registry supporting-file byte manifest, linked-project non-`DESIGN.md` byte manifest,
  and all five candidate files must be identical before and after the sync.
- The task project's identity, kind, intent, skill, design-system binding, entry file, and
  null plugin/snapshot bindings must remain unchanged.
- The post-sync report must exclude workspace IDs, member IDs, credentials, cookies, and
  tokens. Any failed postcondition stops the workflow before style closure or generation.

## Downstream stop

After sync, run a read-only style-application closure and then one material revision of the
same bounded interactive prototype. The new candidate covers all five stable Product
Surfaces and all 66 current material Controls; the accumulated owner changes are the diff,
not a page-count-based redesign instruction. After repository parity and Browser checks,
stop at Design Resource Review & Selection. Selection, snapshot, handoff, Authority Delta,
proposal reconciliation, and product implementation remain forbidden until explicit owner
approval.
