import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const INPUT_PATHS = [
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-01-flow-route-map.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-02-spot-detail-prototype.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-03-spot-night-prototype.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-04-my-content-prototype.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-05-shared-component-control-atlas.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-06-cross-app-interaction-motion-accessibility.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-07-responsive-mode-state-matrix.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-08-semantic-asset-atlas.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/map-01-page-prototype.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/map-02-page-anatomy.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/map-03-component-control-atlas.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/map-04-interaction-motion-accessibility.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/design-system-snapshot.md",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/frozen-inspector.mjs",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/frozen-oracle.mjs",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/index.html",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-01-flow-route-map.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-02-spot-detail-prototype.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-03-spot-night-prototype.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-04-my-content-prototype.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-05-shared-component-control-atlas.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-06-cross-app-interaction-motion-accessibility.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-07-responsive-mode-state-matrix.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/app-08-semantic-asset-atlas.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/map-01-page-prototype.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/map-02-page-anatomy.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/map-03-component-control-atlas.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/metadata/map-04-interaction-motion-accessibility.artifact.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/proof-parameters.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/render-environment.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/resource-integrity.json",
  "docs/design-resources/miniapp-selected-source-2026-08-06-v1/selection-and-qa.md"
];
const root = resolve(process.argv[2] || process.cwd());
const rows = [];
for (const relativePath of INPUT_PATHS) {
  const bytes = await readFile(resolve(root, ...relativePath.split("/")));
  rows.push({
    path: relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
process.stdout.write(JSON.stringify({
  inspector: "starward-dra-frozen-inspector@1.0.0",
  traversal: "complete_enumeration",
  dynamic_discovery: "fully_enumerated",
  resources: rows,
}, null, 2) + "\n");
