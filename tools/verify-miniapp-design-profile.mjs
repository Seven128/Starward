import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  contrastRatio,
  markdownSection,
  sha256File,
} from "./verify-miniapp-design-support.mjs";

function parseModeRoleTable(source, heading, firstColumnHeader = "Role") {
  const section = markdownSection(source, heading);
  const roles = {};
  const lines = section.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    return cells.length === 4
      && cells[0] === firstColumnHeader
      && cells[1] === "Day"
      && cells[2] === "Night"
      && cells[3] === "Observation";
  });
  assert(headerIndex >= 0, `missing ${firstColumnHeader} mode-role table under ${heading}`);
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.trim().startsWith("|")) break;
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|\s*$/);
    if (!match) continue;
    const role = match[1].trim();
    assert(!Object.hasOwn(roles, role), `duplicate Mini Program color role: ${role}`);
    roles[role] = {
      day: match[2].toUpperCase(),
      night: match[3].toUpperCase(),
      observation: match[4].toUpperCase(),
    };
  }
  assert(Object.keys(roles).length > 0, `missing mode-role table under ${heading}`);
  return roles;
}

function assertContrast(foreground, background, minimum, label) {
  const ratio = contrastRatio(foreground, background);
  assert(
    ratio + Number.EPSILON >= minimum,
    `${label} contrast failed: ${ratio.toFixed(2)}:1 < ${minimum}:1`,
  );
  return ratio;
}

export async function verifyMiniappDesignProfile({ root, design }) {
  const resourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-design-system-2026-08-25-sky-canvas",
  );
  const selectedSourcePath = path.join(resourceRoot, "selected-provider-design-system.md");
  const sourceIndexPath = path.join(resourceRoot, "source-index.md");
  const miniappHandoffPath = path.join(resourceRoot, "technical-binding-2026-08-29-compass", "handoff", "miniapp-sky-canvas-current.md");
  const operationsHandoffPath = path.join(resourceRoot, "selected-handoff", "operations-sky-canvas-current.md");
  const miniappManifestPath = path.join(resourceRoot, "selected-source", "miniapp-fact-manifest.json");
  const operationsManifestPath = path.join(resourceRoot, "selected-source", "operations-fact-manifest.json");
  const miniappFeasibilityPath = path.join(resourceRoot, "technical-binding-2026-08-29-compass", "miniapp-implementation-feasibility.json");
  const operationsFeasibilityPath = path.join(resourceRoot, "selected-source", "operations-implementation-feasibility.json");
  const expectedSourceHash =
    "03c300a6cfd1b23e0b84b72baaa26081eef0f958de515b75413be771029499b1";
  const expectedSourceIndexHash =
    "a602a572b93d3aa1b0e51e320b4c25e14267d43b131109844c7accb4e5efbc2b";
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
    "selected Sky Canvas provider snapshot drifted",
  );
  assert.equal(
    await sha256File(sourceIndexPath),
    expectedSourceIndexHash,
    "selected Sky Canvas source index drifted",
  );
  for (const [label, resourcePath, expectedHash] of [
    ["Mini Program selected handoff", miniappHandoffPath, expectedSelectedResourceHashes.miniapp_handoff],
    ["Operations selected handoff", operationsHandoffPath, expectedSelectedResourceHashes.operations_handoff],
    ["Mini Program Fact manifest", miniappManifestPath, expectedSelectedResourceHashes.miniapp_manifest],
    ["Operations Fact manifest", operationsManifestPath, expectedSelectedResourceHashes.operations_manifest],
    ["Mini Program feasibility", miniappFeasibilityPath, expectedSelectedResourceHashes.miniapp_feasibility],
    ["Operations feasibility", operationsFeasibilityPath, expectedSelectedResourceHashes.operations_feasibility],
  ]) {
    assert.equal(await sha256File(resourcePath), expectedHash, `${label} drifted`);
  }

  const selectedSource = await readFile(selectedSourcePath, "utf8");
  const heading = "## WeChat Mini Program — Sky Canvas v1";
  const section = markdownSection(design, heading);
  for (const required of [
    "`target.system.wechat-miniapp-sky-canvas-2026-08-25`",
    "“天空画布 Sky Canvas”",
    "Open Design `0.20.1`",
    "`user:starward-sky-canvas-candidate-c`",
    "`starward-sky-canvas-core-2026-08-25`",
    `\`${expectedSourceHash}\``,
    `\`${expectedSourceIndexHash}\``,
    heading,
  ]) {
    assert(design.includes(required), `missing Sky Canvas adoption identity: ${required}`);
  }

  const selectedRoles = parseModeRoleTable(selectedSource, "## 2. Color");
  const authorityRoles = parseModeRoleTable(section, "### 2. Color");
  const expectedRoles = [
    "blocker",
    "border / grid",
    "canvas",
    "focus",
    "positive",
    "primary-action",
    "surface",
    "text-primary",
    "text-secondary",
    "warning",
  ].sort();
  assert.deepEqual(Object.keys(selectedRoles).sort(), expectedRoles, "selected Sky Canvas role set drifted");
  assert.deepEqual(Object.keys(authorityRoles).sort(), expectedRoles, "Sky Canvas DESIGN role set drifted");
  assert.deepEqual(authorityRoles, selectedRoles, "Sky Canvas DESIGN palette no longer matches selected source");

  const compactChoiceRoles = parseModeRoleTable(section, "### 2. Color", "Compact choice role");
  assert.deepEqual(compactChoiceRoles, {
    "selected surface": { day: "#F3F4FF", night: "#12182B", observation: "#120000" },
    "selected border": { day: "#AAB4FF", night: "#7682D1", observation: "#8A281F" },
    "selected label": { day: "#4254C7", night: "#DCE1FF", observation: "#FF8A72" },
    "clipped star": { day: "#F1D58A", night: "#F1D58A", observation: "#FF8A72" },
  }, "Sky Canvas compact-choice roles drifted");
  for (const mode of ["day", "night", "observation"]) {
    assertContrast(
      compactChoiceRoles["selected label"][mode],
      compactChoiceRoles["selected surface"][mode],
      4.5,
      `${mode} compact-choice selected label`,
    );
  }

  for (const [role, values] of Object.entries(authorityRoles)) {
    const value = values.observation;
    const red = Number.parseInt(value.slice(1, 3), 16);
    const green = Number.parseInt(value.slice(3, 5), 16);
    const blue = Number.parseInt(value.slice(5, 7), 16);
    if (red === 0) {
      assert.equal(green, 0, `observation ${role} escapes black/warm-red closure`);
      assert.equal(blue, 0, `observation ${role} escapes black/warm-red closure`);
    } else {
      assert(green / red <= 0.6, `observation ${role} has excessive green`);
      assert(blue / red <= 0.5, `observation ${role} has excessive blue`);
    }
  }

  const contrastRatios = [];
  for (const mode of ["day", "night", "observation"]) {
    const primary = authorityRoles["text-primary"][mode];
    for (const surfaceRole of ["canvas", "surface"]) {
      contrastRatios.push(assertContrast(
        primary,
        authorityRoles[surfaceRole][mode],
        4.5,
        `${mode} text-primary/${surfaceRole}`,
      ));
    }
  }
  for (const mode of ["day", "night"]) {
    contrastRatios.push(assertContrast(
      authorityRoles["text-secondary"][mode],
      authorityRoles.surface[mode],
      4.5,
      `${mode} text-secondary/surface`,
    ));
  }
  const actionLabels = { day: "#050914", night: "#050914", observation: "#000000" };
  for (const mode of ["day", "night", "observation"]) {
    contrastRatios.push(assertContrast(
      actionLabels[mode],
      authorityRoles["primary-action"][mode],
      4.5,
      `${mode} primary-action label`,
    ));
  }

  for (const required of [
    "88rpx × 88rpx",
    "Radius scale 8/16/24rpx",
    "No elevated card inside another elevated card",
    "Time scrubbing previews local frames continuously and commits once on release",
    "the current Spot Night surface is sensor-follow-only",
    "Sensor-following sky motion exposes permission, calibration, accuracy and recovery without fabricating heading",
    "Product-view scroll owners preserve scrolling while hiding vertical scrollbar chrome and reserving no scrollbar width",
    "production must render attributable current data or truthful partial, stale and unavailable states, never a sample-data fallback",
    "Normal text contrast target ≥4.5:1",
    "Solid `primary-action` label colors are exact derived accessibility roles",
    "Current selected screen/interaction constraints are `target-miniapp-sky-canvas-current-constraint` and `target-operations-sky-canvas-current-constraint`",
    "their sole canonical adoption records live in `project_context/areas/main/screen-contracts/wechat-miniapp.md` and `operations.md`",
    "Visible geometry may be smaller than its hit region",
    "optically half-clipped at the visual capsule's top-right corner",
    "Rapid retargeting starts from the live presentation state and queues nothing",
    "immediately after the Tonight decision and before the segment tabs",
    "Keyboard `:focus-visible` remains mandatory and hugs the visible control",
  ]) {
    assert(section.includes(required), `missing Sky Canvas canonical contract: ${required}`);
  }
  for (const forbidden of [
    "rounded rainbow-gradient star",
    "soft instruments under three skies",
    "Tier B — semantic 3D subjects",
    "Sensor-following sky motion exposes accuracy and manual fallback",
    "orientation calibration, accuracy state and manual fallback",
  ]) {
    assert(!section.includes(forbidden), `superseded Mini Program styling leaked into Sky Canvas: ${forbidden}`);
  }

  return {
    source_digest: expectedSourceHash,
    source_index_digest: expectedSourceIndexHash,
    modes: ["day", "night", "observation"],
    color_roles_per_mode: expectedRoles.length,
    contrast_pairs: contrastRatios.length,
    observation_palette: "black-warm-red-closed",
    orientation_mode: "sensor-follow-only",
    phone_scrollbar_chrome: "hidden-with-scroll-preserved",
    compact_choice_geometry: "44px-hit-with-30-32px-visual-capsule",
    compact_choice_selection: "clipped-star-plus-border-label-and-programmatic-state",
    favorite_motion: "bounded-interruptible-one-shot",
    spot_night_entry: "after-decision-before-tabs",
    screen_resource_status: "selected-implementation-constraints",
    selected_resource_hashes: expectedSelectedResourceHashes,
    app_profile_dependency: "forbidden-by-authority",
    runtime_projection: "not-claimed-conformant",
  };
}
