# Main integration — 2026-10-17

## Intended result

Preserve all authorized branch work, merge current remote main by responsibility, reconcile design sources with current Stitch, then push the development branch and fast-forward remote main without rewriting history.

## Modules and order

1. Save the complete working state in Git and record the fetched branch/main/base identities. Preserve existing intentional retirements and independent changes in other checkouts.
2. Reconcile overlapping implementation, contracts, tooling and dependency changes. Review auto-merges as well as textual conflicts. Give special attention to copy constraints, code quality, proportionate testing, faithful design implementation and the Mini Program development skills.
3. Reconcile design ownership: current editable designs live in Stitch. Compare local/remote sources and migration evidence, sync any unique current local content before retiring repository copies, and preserve current production inputs and licenses.
4. Validate changed integration boundaries using existing checks, review the final delta against both parents, and push the development branch followed by main. Recheck the remote before publication to incorporate concurrent changes.

## Risks and completion evidence

- Long divergence can produce semantic conflicts even when Git merges cleanly: retain a concise resolution record and inspect shared owners/callers.
- Deleted designs may already have migrated: use actual Stitch source readback and current owner references; no blanket restoration/deletion or overwrite of newer remote screens.
- Existing cloud-sky product acceptance gaps do not become passes through a merge. Select integration checks from the actual delta and keep runtime/device obligations explicit.
- Require a clean final index/worktree, no unresolved conflict markers, passing relevant integration checks, and remote branch/main SHA readback. Obtain independent review if an authorized mechanism is available; otherwise retain that evidence gap.

## Current state

Initial checkout: `codex/remote-main-20260908` at `b73523f1`; local main in `E:/dev/Starward` at `755cd46f`, initially clean. Pending branch changes include 909 retired design-resource files and substantial cloud-sky implementation. Snapshot and remote comparison are next.
