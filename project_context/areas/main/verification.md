# Verification Context: main

## Owner

- Owning area: main.

## Verification Paths

- npm run context:sync refreshes package-managed Tiny Context surfaces after package/config changes.
- npm run context:validate checks Context graph structure and recoverability.
- npm run context:doctor checks installation health and reports advisory Context footprint findings.
- npx --yes @google/design.md lint DESIGN.md checks the authored visual-system document structure.
- npx --yes impeccable detect docs/design-system/brand.html performs an auxiliary visual-design scan when the CLI can inspect the static page.

## Required Preparation

- Run npm install from the repository root before Tiny Context commands.
- Network access may be required the first time the Google design.md or Impeccable CLIs are resolved through npx.

## Expected Signals

- Tiny Context validation completes without structural errors.
- Doctor reports the installed package and managed surfaces as healthy; advisory findings must be reviewed rather than silently ignored.
- Design lint completes without schema/structure errors.
- Imported brand, light-kit, and dark-kit HTML files can resolve their local font and supporting artifact paths.

## Acceptable Warnings

- Impeccable findings are review signals, not a Tiny Context gate.
- Static Open Design kits are reference surfaces and cannot by themselves prove production application behavior.

## Excluded Dead Ends

- Do not treat static preview appearance, Context prose, or a command exit code as proof of live weather, routing, deployment, or human acceptance.

## Forbidden Content

- Do not store one-off logs, screenshots, generated reports, secrets, tokens, cookies, device identifiers, or pass/fail history in Context.
