import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const INPUT_PATHS = [
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/README.md",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/artifact-manifest.json",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/assets/app.js",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/assets/styles.css",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/authority-delta.json",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/coverage.json",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/design-system-snapshot.md",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/implementation-handoff-spec.json",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/index.html",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/miniapp-contract-values.json",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/miniapp-resource-integrity.json",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/open-design-readme.md",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/proposal-reconciliation-index.md",
  "docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r2/selected-source/selection-and-qa.md"
];
const root = resolve(process.argv[2] || process.cwd());
const resources = [];
for (const relativePath of INPUT_PATHS) { const bytes = await readFile(resolve(root, ...relativePath.split("/"))); resources.push({ path: relativePath, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }); }
process.stdout.write(JSON.stringify({ inspector: "starward-field-signal-i21-miniapp-constraint-inspector@1.0.0", traversal: "complete_enumeration", dynamic_discovery: "fully_enumerated", resources }, null, 2) + "\n");
