# Mini Program runtime assets

`b-icons/` and `tabbar/` are the product PNG inputs used by the existing config copy owner. They are the exact bytes recovered from the verified ordinary r370 bundle, fingerprint `feb8a6ce68de936dacbf440065a3a40b8c039b43b704a3179a454a586f3401a6`. The recovery receipt is `output/cloud-sky-native-updated-ide-2026-10-12-r1/menu-runtime-icons-recovery.json`. These product assets are independent of retired design review exports.

`sky-controls/` contains the adopted inline control paths from [the current Sky menu resource](https://stitch.google.com/projects/7144519510537620825?node-id=5385664345158066168), project `7144519510537620825`. The adopted HTML remains hosted by the provider; the repository stores only the runtime SVGs needed by `SemanticIcon`. Normal controls use the adopted night palette even when entering Sky from daytime Map; observation mode uses warm red, with the eye/star toggle as the sole white exception. Primary action glyphs retain their dark foreground.

`config/index.ts` copies these inputs into their existing main/subpackage asset destinations. `sky-controls` belongs only to the Sky subpackage. The Sky screen contract owns their design scope and the app store owns observation mode; this directory contains no design preview, HTML mirror, astronomy imagery or alternative design candidate.
