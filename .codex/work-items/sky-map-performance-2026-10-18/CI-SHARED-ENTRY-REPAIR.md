# Shared test entry and selector repair — 2026-10-18

This closes the two reproduced shared-step failures and the three workspace shell-discovery discrepancies identified in `CI-TRIAGE.md`. It does not certify the full product, native visuals, or remote CI.

## Changes and ownership

- `SkyMenuAction` now binds its supplied semantic key to native `id`, replacing dynamic `data-od-id` that Taro omits. Its click, disabled, expanded, icon and menu-disclosure behavior are unchanged. The five current keys are return, search, time, layers and the existing red-light toggle (`sky-red-toggle`). Production callers supply these props; no production reader depends on the old attribute. Existing menu command fixtures inspect the component's public `id` prop and continue to work.
- The existing workflow guard against dynamic `data-od-id` remains intact. Its safe-area check now follows `SkyNavigationMenu` → `SkyMenuAction id="sky-return"` → the existing disclosure leave command, plus the page's `NativeBackBoundary`. Native inset, generated chrome, Map safe-area, state, exact-time and completed-paint checks remain. The already changed canvas failure copy and its retry binding replace the stale copy expectation. No removed back button was restored.
- The three workspace `test` scripts quote `"src/**/*.test.ts"`. Required Node 24 receives and recursively expands the same literal pattern on Windows and POSIX shells. The shared Node launcher is unchanged; no new production runner was introduced.

## Verification

- The exact current Context/shared command passed **36/36**: `node --test tools/run-node.test.mjs tools/ci/*.test.mjs tools/miniapp/project-skills.test.mjs tools/miniapp/workflow-conformance.test.mjs`.
- Existing Sky navigation ownership, controls recovery, navigation path and disclosure command tests passed **43/43**. Existing page action ownership tests passed **27/27** from `apps/wechat-miniapp`, using its real TypeScript path-alias configuration. The initial action-ownership invocation from repository root failed before tests because `@/utils` was unresolved; correcting the working directory resolved that harness preparation error without source or assertion changes.
- `npm run typecheck --workspace @starward/wechat-miniapp` passed.
- A task-local representative fixture exercised the actual launcher and quoted pattern through Windows `cmd` and Git Bash's POSIX shell using Node `v24.16.0`. Both discovered and executed exactly the same three identities at root, one-level and deeper paths: `root`, `one`, `deep`, **3/3** each. This establishes shell argument/discovery equivalence on this host; it is not a Linux CI execution claim.
- Native Node discovery currently finds **496 / 222 / 21 test files** for Mini Program / API / contracts. These are file counts, not product test results. The parent task owns one integrated current-suite run and failure classification.
- `git diff --check` passed for the five edited source/config/test files and this record.

Bounded raw evidence and the reproducible discovery fixture are ignored in `tmp/shared-entry-*`. No IDE, ADB, device session, deployment or Git ref was changed by this work.

## Retained boundary

The old SDK journey in `tools/miniapp/run-wechat-devtools-session.mjs` still contains the removed `.sky-orientation-back` and `.sky-orientation-object-toggle button` paths. It is not the current official feedback path used by this task, and its broader menu journey was not revived or rewritten. Its old fallback could not select the current menu even before this native-ID correction. Any future reuse must migrate the journey to the current menu's visible open/action sequence; its source-presence conformance assertions cannot establish native journey success. Current official feedback can select `#sky-return` and `#sky-orientation-object-list-toggle` after opening the menu. Actual emitted/runtime ID verification remains with the parent task's next coherent build, not a claim from these source checks.
