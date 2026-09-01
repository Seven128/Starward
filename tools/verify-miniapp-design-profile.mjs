import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  contrastRatio,
  markdownSection,
  sha256File,
} from "./verify-miniapp-design-support.mjs";

function assertContrast(foreground, background, minimum, label) {
  const ratio = contrastRatio(foreground, background);
  assert(
    ratio + Number.EPSILON >= minimum,
    label + " contrast failed: " + ratio.toFixed(2) + ":1 < " + minimum + ":1",
  );
  return ratio;
}

async function listRelativeFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await listRelativeFiles(root, absolute));
    } else if (entry.isFile()) {
      paths.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  return paths.sort();
}

function adoptedProjection(source) {
  const start = source.indexOf("## 1. 设计意图");
  assert(start >= 0, "selected source is missing its design-system body");
  return source
    .slice(start)
    .replace(/\r\n/g, "\n")
    .trimEnd()
    .replace(/^### /gm, "#### ")
    .replace(/^## /gm, "### ")
    .replace("这张矩阵是候选的耐久设计上下文。", "这张矩阵是本系统的耐久设计上下文。")
    .replace("### 11. 与当前 Sky Canvas 语义的精确增量", "### 11. 相对上一版 Sky Canvas 的精确增量")
    .replace("`tokens.scss`：Taro/React/SCSS 候选合同", "`tokens.scss`：冻结来源中的 Taro/React/SCSS 投射")
    .replace("`index.html`：候选入口", "`index.html`：冻结来源的审查入口")
    .replace(
      "此候选只供审查。除非后续存在明确的选择与 authority closure 更新，否则不得把本文描述为“当前设计系统”或“已符合生产”。",
      "本节已于 2026-09-02 由 owner 明确选中并成为当前 Mini Program 设计系统；选择只建立设计权威，不证明生产实现、页面像素一致或运行时合规。",
    );
}

function compareCanonicalPaths(left, right) {
  const foldedLeft = left.toLowerCase();
  const foldedRight = right.toLowerCase();
  if (foldedLeft < foldedRight) return -1;
  if (foldedLeft > foldedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export async function verifyMiniappDesignProfile({ root, design }) {
  const activeResourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-design-system-2026-09-02-sky-canvas-field-signal",
  );
  const selectedRoot = path.join(activeResourceRoot, "selected-source");
  const selectedSourcePath = path.join(selectedRoot, "DESIGN.md");
  const manifestPath = path.join(activeResourceRoot, "artifact-manifest.json");
  const sourceIndexPath = path.join(activeResourceRoot, "source-index.md");

  const legacyConstraintRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-design-system-2026-08-25-sky-canvas",
  );
  const miniappHandoffPath = path.join(
    legacyConstraintRoot,
    "technical-binding-2026-08-29-compass",
    "handoff",
    "miniapp-sky-canvas-current.md",
  );
  const operationsHandoffPath = path.join(
    legacyConstraintRoot,
    "selected-handoff",
    "operations-sky-canvas-current.md",
  );
  const miniappManifestPath = path.join(
    legacyConstraintRoot,
    "selected-source",
    "miniapp-fact-manifest.json",
  );
  const operationsManifestPath = path.join(
    legacyConstraintRoot,
    "selected-source",
    "operations-fact-manifest.json",
  );
  const miniappFeasibilityPath = path.join(
    legacyConstraintRoot,
    "technical-binding-2026-08-29-compass",
    "miniapp-implementation-feasibility.json",
  );
  const operationsFeasibilityPath = path.join(
    legacyConstraintRoot,
    "selected-source",
    "operations-implementation-feasibility.json",
  );

  const expectedSourceHash =
    "a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e";
  const expectedManifestHash =
    "d719dd753422112c4759cd77d0d9da3b7d40d5dd87b38fd3d327835f739f8bde";
  const expectedPackageDigest =
    "253fbcbfaa083aa897eca2faf5e4eb6f3b99e69da7f485d485f89881adcc8276";
  const expectedSourceIndexHash =
    "727114ee2f72f6a68a8bd0d25c4d20470ae8b0d6a0ff2bcff6d0067e367543c1";
  const expectedSelectedResourceHashes = {
    miniapp_handoff: "17288e6ccc7092a5be6b1ea3bfc0ad73d0b7bea893b0e0bf1ffdc7c172426834",
    operations_handoff: "391d900dd35420bd33de29676b23a6767ba7b93fd3857bc3eec9b41bd971546f",
    miniapp_manifest: "78e569a26f268454ae968bf715ecec37d6dfa23af01b33b72479973e2f4ae3bb",
    operations_manifest: "9ad9a465ffd66dbd3d0f1b16d5cb533c6accf35838f6bf7f194604fa1acdf8f7",
    miniapp_feasibility: "48468b55e0f95fd50941761b4a7fb5dc0e39de244da6055281617bb671ff9875",
    operations_feasibility: "c63ee9eaab1322b630cb38a3438a64447d052a6cac7f31e8f7009669cd601e90",
  };

  assert.equal(
    await sha256File(selectedSourcePath),
    expectedSourceHash,
    "selected Field Signal source snapshot drifted",
  );
  assert.equal(
    await sha256File(manifestPath),
    expectedManifestHash,
    "selected Field Signal artifact manifest drifted",
  );
  assert.equal(
    await sha256File(sourceIndexPath),
    expectedSourceIndexHash,
    "selected Field Signal source index drifted",
  );

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schema_version, "starward-selected-design-system-source-v1");
  assert.equal(
    manifest.active_target,
    "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02",
  );
  assert.equal(manifest.package_digest, expectedPackageDigest);
  assert.equal(manifest.source.review_revision_status, "pending-noncanonical");
  assert.equal(manifest.files.length, 23, "selected Field Signal package file count drifted");
  const canonicalManifestPaths = manifest.files
    .map((file) => file.path)
    .slice()
    .sort(compareCanonicalPaths);
  assert.deepEqual(
    manifest.files.map((file) => file.path),
    canonicalManifestPaths,
    "selected Field Signal manifest paths are not canonically ordered",
  );

  const listedPaths = manifest.files.map((file) => file.path).sort();
  assert.deepEqual(
    await listRelativeFiles(selectedRoot),
    listedPaths,
    "selected Field Signal package membership drifted",
  );
  for (const file of manifest.files) {
    const absolute = path.join(selectedRoot, ...file.path.split("/"));
    assert.equal(await sha256File(absolute), file.sha256, file.path + " digest drifted");
    assert.equal((await stat(absolute)).size, file.bytes, file.path + " byte count drifted");
  }
  const packageDigest = createHash("sha256")
    .update(
      manifest.files
        .slice()
        .sort((left, right) => compareCanonicalPaths(left.path, right.path))
        .map((file) => file.path + "\0" + file.sha256 + "\0" + file.bytes + "\n")
        .join(""),
      "utf8",
    )
    .digest("hex");
  assert.equal(packageDigest, expectedPackageDigest, "selected Field Signal package digest drifted");

  for (const [label, resourcePath, expectedHash] of [
    ["Mini Program selected handoff", miniappHandoffPath, expectedSelectedResourceHashes.miniapp_handoff],
    ["Operations selected handoff", operationsHandoffPath, expectedSelectedResourceHashes.operations_handoff],
    ["Mini Program Fact manifest", miniappManifestPath, expectedSelectedResourceHashes.miniapp_manifest],
    ["Operations Fact manifest", operationsManifestPath, expectedSelectedResourceHashes.operations_manifest],
    ["Mini Program feasibility", miniappFeasibilityPath, expectedSelectedResourceHashes.miniapp_feasibility],
    ["Operations feasibility", operationsFeasibilityPath, expectedSelectedResourceHashes.operations_feasibility],
  ]) {
    assert.equal(await sha256File(resourcePath), expectedHash, label + " drifted");
  }

  const heading = "## WeChat Mini Program — Sky Canvas Field Signal";
  const section = markdownSection(design, heading);
  const selectedSource = await readFile(selectedSourcePath, "utf8");
  assert(
    section.trimEnd().endsWith(adoptedProjection(selectedSource)),
    "canonical Mini Program body no longer projects the immutable selected source",
  );

  for (const required of [
    "`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`",
    "“现在这套设计系统差不多了，就选中他吧”",
    "Open Design `0.21.1`",
    "`user:starward-mini-program-sky-canvas-field-signal-revision`",
    "`ds-starward-mini-program-sky-canvas-field-signal-revision`",
    "`0bcc669b-29b2-476b-b93d-f502d7b09917`",
    "`bccaa010-a3ef-4895-9fb0-4c874239fdac`",
    "Do not append version, date or revision labels in the handbook title, navigation, component specimens or ordinary product UI",
    "`" + expectedSourceHash + "`",
    "`" + expectedManifestHash + "`",
    "`" + expectedPackageDigest + "`",
    "`" + expectedSourceIndexHash + "`",
    heading,
  ]) {
    assert(design.includes(required), "missing Field Signal adoption identity: " + required);
  }
  assert(
    design.includes(
      "The superseded `target.system.wechat-miniapp-sky-canvas-2026-08-25` and its immutable provider source remain inactive rollback/reference material",
    ),
    "previous Mini Program system is not explicitly inactive rollback material",
  );

  for (const required of [
    "| canvas | `#FBFAF7` | 暖日光中性页面背景 |",
    "| sky / sky-soft / sky-strong | `#8799F6` / `#EFF1FF` / `#4859B8` |",
    "| meteor / meteor-soft / meteor-strong | `#F2C94C` / `#FFF7D6` / `#6F5500` |",
    "| trail / trail-soft / trail-strong | `#62C88B` / `#E9F8EE` / `#1F6B45` |",
    "| risk / risk-soft / risk-strong | `#E66F66` / `#FFF0ED` / `#973D37` |",
    "四层留白",
    "compact-choice | 12 / 24 | 17–18px | 500",
    "ordinary-action | 13 / 26 | 19px | 500",
    "final-commit | 15 / 30 | 21px | 500",
    "触摸点击不留下持续焦点框",
    "Choice Bar / View Switcher",
    "46×24px",
    "full-width 长对象卡",
    "160ms standard",
    "88rpx 行/单元命中",
    "Current page/interaction constraints remain `target-miniapp-sky-canvas-current-constraint` and `target-operations-sky-canvas-current-constraint`",
  ]) {
    assert(section.includes(required), "missing Field Signal canonical contract: " + required);
  }

  const componentFamilies = [
    "#### 7.1 Button / Icon Button",
    "#### 7.2 Search Field",
    "#### 7.3 Text Input / Textarea",
    "#### 7.4 Checkbox Group",
    "#### 7.5 Radio Group",
    "#### 7.6 Switch",
    "#### 7.7 Choice Bar / View Switcher",
    "#### 7.8 List / Cell / Action Row",
    "#### 7.9 Badge / Status Tag",
    "#### 7.10 Card / Containment",
    "#### 7.11 Progress / Loading / Skeleton",
    "#### 7.12 Empty / Error / Permission Recovery",
    "#### 7.13 Toast / Snackbar",
    "#### 7.14 Dialog / Bottom Sheet",
  ];
  for (const family of componentFamilies) {
    assert(section.includes(family), "missing Field Signal component family: " + family);
  }

  const contrastRatios = [
    assertContrast("#282B29", "#FBFAF7", 4.5, "day text-primary/canvas"),
    assertContrast("#5E655F", "#FBFAF7", 4.5, "day text-secondary/canvas"),
    assertContrast("#6D746D", "#FBFAF7", 4.5, "day text-tertiary/canvas"),
    assertContrast("#202332", "#8799F6", 4.5, "day on-sky/sky"),
    assertContrast("#3A2E00", "#F2C94C", 4.5, "day on-meteor/meteor"),
    assertContrast("#153B2A", "#62C88B", 4.5, "day on-trail/trail"),
    assertContrast("#F5F3EC", "#11120F", 4.5, "night text-primary/canvas"),
    assertContrast("#BEC2B8", "#11120F", 4.5, "night text-secondary/canvas"),
    assertContrast("#FF6B58", "#000000", 4.5, "observation text-primary/canvas"),
    assertContrast("#D84A3C", "#000000", 4.5, "observation text-secondary/canvas"),
    assertContrast("#A83229", "#000000", 3, "observation boundary/canvas"),
  ];

  const observationSection = markdownSection(section, "#### 2.3 观测模式");
  const observationPalette = new Set([
    "#000000",
    "#110000",
    "#190000",
    "#240000",
    "#5B1712",
    "#7A1E18",
    "#A83229",
    "#C23D32",
    "#D84A3C",
    "#FF6B58",
  ]);
  for (const match of observationSection.matchAll(/#[0-9A-Fa-f]{6}/g)) {
    assert(
      observationPalette.has(match[0].toUpperCase()),
      "observation palette escapes black/warm-red closure: " + match[0],
    );
  }

  for (const forbidden of [
    "## WeChat Mini Program — Sky Canvas v1",
    "## WeChat Mini Program — Sky Canvas Field Signal v2",
    "Primary Brand Accent: #536DFE",
    "rounded rainbow-gradient star",
  ]) {
    assert(!section.includes(forbidden), "superseded Mini Program styling leaked into Field Signal: " + forbidden);
  }

  return {
    source_digest: expectedSourceHash,
    manifest_digest: expectedManifestHash,
    source_index_digest: expectedSourceIndexHash,
    package_digest: expectedPackageDigest,
    modes: ["day", "night", "observation"],
    semantic_color_families: ["sky", "meteor", "trail", "risk"],
    semantic_base_component_families: componentFamilies.length,
    contrast_pairs: contrastRatios.length,
    observation_palette: "black-warm-red-closed",
    whitespace_model: "screen-group-internal-visual-weight",
    control_visible_ladder: "28-30/34-36/46-48px",
    touch_target: "44px-nonoverlapping",
    focus_model: "touch-none-input-caret-keyboard-inner-edge",
    switch_geometry: "46x24px-track-20px-thumb",
    choice_motion: "160ms-transform-indicator",
    previous_system_status: "inactive-rollback",
    screen_resource_status: "selected-implementation-constraints",
    selected_resource_hashes: expectedSelectedResourceHashes,
    app_profile_dependency: "forbidden-by-authority",
    runtime_projection: "not-claimed-conformant",
  };
}
