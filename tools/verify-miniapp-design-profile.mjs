import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalPrompt,
  contrastRatio,
  markdownSection,
  parseBacktickTableValues,
  parseMarkdownColorTable,
  parseMotionDurations,
  parseTypographyTable,
  sha256File,
} from "./verify-miniapp-design-support.mjs";

export async function verifyMiniappDesignProfile({ root, design }) {
  const resourceRoot = path.join(
    root,
    "docs",
    "design-resources",
    "miniapp-design-system-2026-08-05",
  );
  const candidatePath = path.join(resourceRoot, "candidate-design-brief.md");
  const sourceIndexPath = path.join(resourceRoot, "source-index.md");
  const expectedCandidateHash =
    "ab1faeb96a3e52125b19fdf8f224caf6cee0db79cf16a9a12f86c5af49991745";
  const expectedSourceIndexHash =
    "80cb69b9501b556ca8c186c770e5257ee5136e031e52ce54c42d7298eba3e3f7";
  const referenceHashes = {
    "01-card-and-bottom-nav.png": "b156309394810256f799cb7c146840f6a0cf37ecdcfbbf0653d4c9d0d3b00f54",
    "02-3d-icon-prompt-and-grid.png": "4473f5147bc70f1cd39187192954018298ab5b8f2d10230d0901abf0ee2ec8e7",
    "03-3d-telescope.png": "51eb5f517273b65d972d2f6c49ee6638855f3e49f81dbafd01c2f103b48c8b36",
    "04-3d-four-point-star.png": "712566bd533556a5ab711fa8085e82e49a77dc97300241c21e299d30b163e80d",
    "05-3d-five-point-star.png": "f38d4fcb147f6dc4a10925c6c56529ca089b496b3a1d589b3846014801cdc1ea",
    "06-day-mode-reference.png": "62d286b330ce48cac73e1b1351e6c35502aac46989af971ee502466842d49fe0",
    "07-night-mode-reference.png": "5d5ec492c02e8d67b502ed7f672f1b8976da61d56f2702fbd7a59bbcb1ee3b5d",
    "08-observation-red-mode-reference.png": "d8de918d08dab0f8d6f84bb097076671186a61a1494637f1e40b2fc7b97b8150",
  };

  assert.equal(
    await sha256File(candidatePath),
    expectedCandidateHash,
    "selected Mini Program candidate digest drifted",
  );
  assert.equal(
    await sha256File(sourceIndexPath),
    expectedSourceIndexHash,
    "selected Mini Program source-index digest drifted",
  );
  for (const [filename, expectedHash] of Object.entries(referenceHashes)) {
    assert.equal(
      await sha256File(path.join(resourceRoot, "references", filename)),
      expectedHash,
      `selected Mini Program reference digest drifted: ${filename}`,
    );
  }

  const candidate = await readFile(candidatePath, "utf8");
  const heading = "## WeChat Mini Program — Soft Instruments v1";
  const section = markdownSection(design, heading);
  for (const required of [
    "`target.system.wechat-miniapp-soft-instruments-2026-08-05`",
    "“采用此候选”",
    "Open Design `0.16.1`",
    "`user:soft-instruments`",
    "`ds-soft-instruments`",
    `\`${expectedCandidateHash}\``,
    `\`${expectedSourceIndexHash}\``,
    heading,
  ]) {
    assert(design.includes(required), `missing Mini Program adoption identity: ${required}`);
  }

  const modes = {
    day: {
      candidate: parseMarkdownColorTable(candidate, "### Day"),
      authority: parseMarkdownColorTable(section, "#### Day"),
    },
    night: {
      candidate: parseMarkdownColorTable(candidate, "### Night"),
      authority: parseMarkdownColorTable(section, "#### Night"),
    },
    observation: {
      candidate: parseMarkdownColorTable(candidate, "### Observation red"),
      authority: parseMarkdownColorTable(section, "#### Observation red"),
    },
  };
  const expectedRoles = [
    "accent-cyan",
    "accent-violet",
    "accent-warm",
    "border",
    "canvas",
    "danger",
    "focus",
    "on-primary",
    "primary",
    "primary-pressed",
    "success",
    "surface",
    "surface-elevated",
    "surface-subtle",
    "text-primary",
    "text-secondary",
    "text-tertiary",
    "warning",
  ].sort();
  for (const [mode, tables] of Object.entries(modes)) {
    assert.deepEqual(
      Object.keys(tables.candidate).sort(),
      expectedRoles,
      `selected Mini Program candidate ${mode} role set drifted`,
    );
    assert.deepEqual(
      Object.keys(tables.authority).sort(),
      expectedRoles,
      `Mini Program DESIGN ${mode} role set drifted`,
    );
    assert.deepEqual(
      tables.authority,
      tables.candidate,
      `Mini Program DESIGN ${mode} values no longer match the selected candidate`,
    );
  }

  const foundationTokenKeys = [
    "space-0",
    "space-1",
    "space-2",
    "space-3",
    "space-4",
    "space-5",
    "space-6",
    "space-8",
    "radius-xs",
    "radius-sm",
    "radius-md",
    "radius-lg",
    "radius-pill",
    "size-icon-glyph",
    "size-icon-box",
    "size-hit-min",
    "size-control",
    "size-control-lg",
    "size-nav-item",
    "border-hairline",
    "border-selected",
    "focus-ring",
  ];
  const authorityFoundation = parseBacktickTableValues(
    section,
    foundationTokenKeys,
    "Mini Program DESIGN foundation",
  );
  const candidateFoundation = parseBacktickTableValues(
    candidate,
    foundationTokenKeys,
    "selected Mini Program foundation",
  );
  assert.deepEqual(
    authorityFoundation,
    candidateFoundation,
    "Mini Program DESIGN foundation values no longer match the selected candidate",
  );
  const authorityTypography = parseTypographyTable(section, "Mini Program DESIGN");
  const candidateTypography = parseTypographyTable(candidate, "selected Mini Program");
  assert.deepEqual(
    authorityTypography,
    candidateTypography,
    "Mini Program DESIGN typography no longer matches the selected candidate",
  );
  const authorityMotion = parseMotionDurations(section, "Mini Program DESIGN");
  const candidateMotion = parseMotionDurations(candidate, "selected Mini Program");
  assert.deepEqual(
    authorityMotion,
    candidateMotion,
    "Mini Program DESIGN motion durations no longer match the selected candidate",
  );
  assert.equal(
    canonicalPrompt(section, "Mini Program DESIGN"),
    canonicalPrompt(candidate, "selected Mini Program"),
    "Mini Program DESIGN Tier-B prompt no longer matches the selected candidate",
  );
  for (const exactSelectedContract of [
    "0 12rpx 36rpx rgba(25, 61, 102, 0.10), 0 2rpx 8rpx rgba(25, 61, 102, 0.06)",
    "0 8rpx 24rpx rgba(21, 55, 94, 0.14)",
    '`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`',
    "four-point star, five-point star, tent, telescope, binoculars, camera, hiking backpack, and a gender-neutral avatar",
  ]) {
    assert(candidate.includes(exactSelectedContract), `selected Mini Program source lost: ${exactSelectedContract}`);
    assert(section.includes(exactSelectedContract), `Mini Program DESIGN lost selected contract: ${exactSelectedContract}`);
  }

  for (const [role, value] of Object.entries(modes.observation.authority)) {
    const red = Number.parseInt(value.slice(1, 3), 16);
    const green = Number.parseInt(value.slice(3, 5), 16);
    const blue = Number.parseInt(value.slice(5, 7), 16);
    if (red === 0) {
      assert.equal(green, 0, `Mini Program observation ${role} escapes black/warm-red closure`);
      assert.equal(blue, 0, `Mini Program observation ${role} escapes black/warm-red closure`);
    } else {
      assert(green / red <= 0.5, `Mini Program observation ${role} has excessive green`);
      assert(blue / red <= 0.5, `Mini Program observation ${role} has excessive blue`);
    }
  }

  const contrastChecks = [];
  for (const [mode, { authority }] of Object.entries(modes)) {
    for (const textRole of ["text-primary", "text-secondary", "text-tertiary"]) {
      for (const surfaceRole of ["canvas", "surface", "surface-subtle", "surface-elevated"]) {
        contrastChecks.push([mode, textRole, surfaceRole, 4.5, authority]);
      }
    }
    contrastChecks.push([mode, "on-primary", "primary", 4.5, authority]);
    contrastChecks.push([mode, "focus", "surface", 3, authority]);
    for (const statusRole of ["success", "warning", "danger"]) {
      contrastChecks.push([mode, statusRole, "surface", 3, authority]);
    }
  }
  for (const [mode, foregroundRole, backgroundRole, minimum, values] of contrastChecks) {
    const ratio = contrastRatio(values[foregroundRole], values[backgroundRole]);
    assert(
      ratio + Number.EPSILON >= minimum,
      `Mini Program ${mode} contrast failed: ${foregroundRole}/${backgroundRole} = ${ratio.toFixed(2)}:1`,
    );
  }

  for (const required of [
    "`750rpx`",
    "`88rpx × 88rpx`",
    "Tier A — functional symbols",
    "Tier B — semantic 3D subjects",
    "Canonical day master prompt:",
    "`≤72KB`",
    "`≤100ms`",
    "destination canvas first",
    "Normal text targets at least `4.5:1`",
  ]) {
    assert(section.includes(required), `missing Mini Program canonical contract: ${required}`);
  }
  for (const forbidden of [
    "#F3F7FF",
    "Bahnschrift",
    "packages/ui-system/src/tokens.ts",
    "target.system.starward-blue-skeuomorphic-2026-07-29",
  ]) {
    assert(
      !section.includes(forbidden),
      `native App design dependency leaked into Mini Program canonical profile: ${forbidden}`,
    );
  }
  for (const forbidden of ["Ghibli", "吉卜力"]) {
    assert(
      !candidate.includes(forbidden) && !section.includes(forbidden),
      `protected named-style imitation leaked into the Mini Program profile: ${forbidden}`,
    );
  }

  return {
    source_digest: expectedCandidateHash,
    reference_count: Object.keys(referenceHashes).length,
    modes: Object.keys(modes),
    foundation_tokens: foundationTokenKeys.length,
    color_roles_per_mode: expectedRoles.length,
    typography_roles: Object.keys(authorityTypography).length,
    motion_events: Object.keys(authorityMotion).length,
    contrast_pairs: contrastChecks.length,
    observation_palette: "black-warm-red-closed",
    tier_b_prompt: "selected-source-equal",
    app_profile_dependency: "forbidden-and-absent",
    runtime_projection: "absent-by-design",
  };
}
