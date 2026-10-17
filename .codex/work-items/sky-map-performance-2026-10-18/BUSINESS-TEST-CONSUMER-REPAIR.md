# Non-Sky business consumer test repair

2026-10-18. Scope: the six test files assigned under H7. No production, Context, plan, device, IDE or Git mutation.

## Classification and change

- `content/contribution/editor-readonly.test.ts`: the editor now always renders the shared `ContributionSubmitRecovery` child. Added that child to the existing shallow-render component adapter. The test still executes the production editor's record identity/read-only branching, preserves its negative regression countercheck, and asserts pending/terminal/rejected behavior. The recovery component's internal submit behavior is outside this test's scope.
- `content/contribution/local-draft-storage.test.ts`: production `applyDraft` now clears `submissionRetryAvailable`. Added that real state setter to the existing field-state adapter. Saved-baseline, incomplete legacy drafts, true later edits, and persistence/reversion assertions are unchanged.
- `content/spot-feedback/formal-image-selection.test.ts`: production media selection now rejects activity while an original submission is pending. Supplied the ordinary no-pending-submit state. The production media handler and actual account-operation owner still execute; native chooser is the controlled platform boundary. Cancellation, upload completion, preview/proposal effects, upload errors, A-B-A account retirement, native hide/show and late feedback assertions all remain.
- `content/plan/detail/plan-reminder-render.test.ts`: the adopted day heading now consumes display mode and `SemanticIcon`. Provided DAY plus the existing shallow icon boundary. Saved reminder title/offset/checklist/count and notification explanation click assertions remain.
- `features/my/navigation.test.ts`: the private entry now goes through login and delegates to `navigatePage`; settings directly uses the same navigation owner. Extracted these current production consumers together. The logged-in account gate adapter dispatches its authenticated identity; an observer awaits the actual production navigation Promise even though the event adapter deliberately returns void. Real `useAccountNavigation` and `usePageNavigation` remain under test. Competing-entry serialization, failed navigation retry, notification cleanup and renewed-notification identity retention remain asserted; settings is explicitly checked not to invoke the private account gate.
- `features/spot/spot-plan-route.test.ts`: current plan entry consumes `useAccountPlans` and `useAccountOperation`, replacing the obsolete generic-query fixture. The controlled query exposes the real account-bound shape and the operation adapter returns the production `createAccountOperationOwner`. Existing actual component rendering and layout-effect observations retain loading, empty/populated plans, error/recovery and no-repeated-layout assertions. Route and per-spot local draft identity checks are unchanged.

All assigned failures were stale test-consumer adapters. No product defect was identified within this limited repair.

## Verification

From `apps/wechat-miniapp`:

```text
node ../../tools/run-node.cjs --import tsx --test src/content/contribution/editor-readonly.test.ts src/content/contribution/local-draft-storage.test.ts src/content/spot-feedback/formal-image-selection.test.ts src/content/plan/detail/plan-reminder-render.test.ts src/features/my/navigation.test.ts src/features/spot/spot-plan-route.test.ts
```

28 passed, 0 failed, 0 skipped. The original current-run inventory contained 19 failures among these files; all six files' existing 28 cases now pass.

`npm run typecheck --workspace @starward/wechat-miniapp` passed. Targeted `git diff --check` passed. No full suite was rerun by this subtask; these are local behavior checks, not native-device or end-to-end business acceptance.
