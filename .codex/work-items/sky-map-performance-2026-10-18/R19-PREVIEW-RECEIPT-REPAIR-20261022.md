# R19 official preview process receipt repair — 2026-10-22

The R19 generation-2 investigation exposed a tool-owner loss: `runOfficialProcess` discarded stderr entirely and discarded stdout on a nonzero exit. The root task owns that generation's independent log evidence and any state recovery. This repair changes neither its saved state nor its interpretation.

## Changed responsibility

- `tools/miniapp/device-feedback-official.mjs` retains each preview process's bounded stdout and stderr in a unique `.official-process-<uuid>.json` inside the existing generation directory. The receipt stores original bytes as base64, start/end times, process exit code, safe process error code, total observed/retained byte counts and truncation. The existing combined output limit remains in effect; the retained prefix now includes the part of a chunk that reaches the limit.
- The file is exclusively opened before launching the process. Failure to create it is a pre-invocation error, so it cannot imply that a remote mutation happened. Write failure after invocation is reported as failed diagnostic retention without replacing the actual business/transport result. No subprocess arguments, environment, account data or output excerpts are added to the command summary.
- `OfficialWechatDevtools` forwards the generation's diagnostic directory for both automatic and ordinary QR preview. `invokeOfficial` and the existing classifier retain only the receipt path, retention status, exit code and safe error code in `official.diagnostic`; CLI output exposes this as `officialDiagnostic`.
- The ordinary QR artifact-validation path and the original pending-task result preserve the same diagnostic pointer. Successful `runOfficialProcess` callers still receive a stdout `Buffer`, preserving the shared runner's existing contract.

The process receipt is diagnostic evidence, not a preview outcome. A nonzero process exit, timeout, output overflow or transport error still produces an unresolved `error`/`unknown` business result, even when its raw output contains a failure-shaped JSON object. No automatic retry, fallback, task-handle invention, state-recovery command or new confirmation flag was added. Existing unknown/pending no-replay and no-bind guards are unchanged. The original official failure code, if present in raw stdout/stderr, is recoverable from the private receipt; it is not inferred from the process exit code.

## Verification

`node --test tools/miniapp/device-feedback-preview.test.mjs tools/miniapp/device-feedback-boundaries.test.mjs tools/miniapp/device-feedback-official-diagnostic.test.mjs`

Result: **39 passed, 0 failed**. Six new focused tests use local Node child processes and the existing isolated feedback fixture. They establish:

- Nonzero automatic and QR calls preserve exact stdout/stderr, expose only bounded metadata, and remain unbindable/unreplayable.
- A pending call retains its receipt after the original task's explicit result is recorded.
- A valid legacy QR artifact retains its diagnostic pointer through the existing artifact-validation path.
- Successful callers still receive stdout buffers, and separate explicit invocations receive separate receipt files.
- Combined output overflow retains a bounded prefix; a timeout retains output emitted before it.
- An unavailable diagnostic destination prevents process invocation.

`node --check tools/miniapp/device-feedback-official.mjs` also passed. The old preview/binding/lifecycle regression suite remains green. These checks use synthetic child processes and do not establish an actual DevTools preview outcome.

No IDE, phone, installed official package, environment, Goal, PLAN, HANDOFF or existing feedback state was changed by this repair. No raw evidence was uploaded and Git state was not changed.
