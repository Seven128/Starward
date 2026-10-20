# Staging host admission before image publication

The receiving checkout now checks the staging host before LFS preparation,
dependency installation and image build/push. It reuses the existing fixed
`host` mode in `tools/deployment/run-host-diagnostics.mjs`, the same protected
staging connection and the unchanged `host-preflight.sh`. A failed early
check stops the job before a new registry version can be published.

The original preflight immediately before remote transfer remains in place,
since the host can change during a build. This does not guarantee that every
published image reaches promotion. Registry-capacity admission, safe image
retirement, actual host capacity and the stopped API remain unresolved.
No CD flag, concurrency setting, 10 GiB guard, registry identity, backup,
writer lifecycle or promotion operation was changed.

## Verification and delivery scope

- The new workflow contract failed against the original workflow at
  `host readiness must gate image publication`, then passed with the gate.
- All 37 selected deployment/workflow/connection/preflight/bootstrap/SSH
  checks passed. Existing runner checks cover low-disk rejection, invalid
  connection and response, transport failure, pinned trust and temporary
  credential cleanup.
- `context:validate` and `git diff --check` passed for the implementation.
  Structural Context validation does not establish factual or runtime correctness.
- Independent read-only review found no P1/P2 or required repair. The reviewer
  loaded the runner under Node 24.19.0 while rejecting npm package resolution,
  confirming that the early step needs only tracked files and built-ins. An
  actual no-connection CLI invocation exited 1 without SSH; the new workflow
  regression also passed independently.
- No diagnostic or release workflow was manually dispatched for this change.
  Exact commit/CI/CD status must be read from Git and the workflow jobs after
  delivery; local tests and review do not establish remote execution, current
  host readiness or API recovery.

## Commit-bound inputs

The executable change consumes tracked workflow/host owners and existing
protected Environment Secrets; it adds no external data, credential system,
private export or runtime publication. The unchanged data lock and verified
Drive packet remain the recovery owners. The receiving machine's actual
9,234-file restoration is recorded in [the receiver receipt](RECEIVER-20261020.json).
The original private source files, downloads and unrelated local
`.codex/task-notes/` are preserved.

Map/Sky source, candidate bytes and performance conclusions are unchanged.
The overlay wait, complete normal Play and rapid six-field time interaction
still require the evidence retained by the same PLAN/HANDOFF.
