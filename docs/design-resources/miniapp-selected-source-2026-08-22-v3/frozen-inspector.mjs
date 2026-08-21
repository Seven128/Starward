import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const INPUT_PATHS = [
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/README.md",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/design-system-snapshot.md",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/frozen-inspector.mjs",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/frozen-oracle.mjs",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/index.html",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/proof-parameters.json",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/proposal-reconciliation-index.md",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/provider/README.md",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/provider/brand-spec.md",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/provider/index.html.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/provider/resource-manifest.json",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/render-environment.json",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/resource-integrity.json",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/selected-requirement-dispositions.json",
  "docs/design-resources/miniapp-selected-source-2026-08-22-v3/selection-and-qa.md"
];
const root = resolve(process.argv[2] || process.cwd());
const resources = [];
for (const relativePath of INPUT_PATHS) {
  const bytes = await readFile(resolve(root, ...relativePath.split("/")));
  resources.push({
    path: relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
process.stdout.write(JSON.stringify({
  inspector: "starward-dra-frozen-inspector@3.0.0",
  traversal: "complete_enumeration",
  dynamic_discovery: "fully_enumerated",
  resources,
}, null, 2) + "\n");
