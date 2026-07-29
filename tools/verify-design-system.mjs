import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const design = await readFile(path.join(root, "DESIGN.md"), "utf8");
const {
  colors,
  fontStacks,
  minimumTouchTarget,
  modeAliases,
  radii,
  spacing,
  type,
} = await import("../packages/ui-system/src/tokens.ts");

const frontmatterMatch = design.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert(frontmatterMatch, "DESIGN.md must contain YAML front matter");
const frontmatter = frontmatterMatch[1];

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function flatSection(section) {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${section}:`);
  assert.notEqual(start, -1, `missing frontmatter section: ${section}`);
  const values = {};
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const match = line.match(/^  ([a-zA-Z0-9-]+):\s*(.+)$/);
    if (match) values[match[1]] = unquote(match[2]);
  }
  return values;
}

function typographyFamily(role) {
  const pattern = new RegExp(
    `^  ${role}:\\r?\\n(?:^    .+\\r?\\n)*?^    fontFamily:\\s*(.+)$`,
    "m",
  );
  const match = frontmatter.match(pattern);
  assert(match, `missing typography family: ${role}`);
  return unquote(match[1]);
}

function numberFromCss(value) {
  const parsed = Number.parseFloat(value);
  assert(Number.isFinite(parsed), `invalid numeric token: ${value}`);
  return parsed;
}

function normalizeStack(value) {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^"(.*)"$/, "$1"))
    .join(",");
}

const authoredColors = flatSection("colors");
const projection = {
  planning: {
    canvas: "canvas",
    surface: "surface",
    surfaceMuted: "surface-muted",
    surfaceElevated: "surface-elevated",
    text: "text",
    textMuted: "text-muted",
    textSecondary: "text-muted",
    border: "border",
    primary: "primary",
    primaryHover: "primary-hover",
    primaryActive: "primary-active",
    onPrimary: "on-primary",
    anchor: "text",
    success: "success",
    warning: "warning",
    danger: "error",
    materialHighlight: "material-highlight",
    materialBody: "material-body",
    materialSeam: "material-seam",
    lensCore: "lens-core",
    lensReflection: "lens-reflection",
    rubber: "rubber",
    equipmentPaint: "equipment-paint",
    fabric: "fabric",
    fabricStitch: "fabric-stitch",
    contactShadow: "contact-shadow",
    imageBackdrop: "surface",
  },
  night: {
    canvas: "night-canvas",
    surface: "night-surface",
    surfaceMuted: "night-surface-muted",
    surfaceElevated: "night-surface-elevated",
    text: "night-text",
    textMuted: "night-text-muted",
    textSecondary: "night-text-muted",
    border: "night-border",
    primary: "night-primary",
    primaryHover: "night-primary-hover",
    primaryActive: "night-primary-active",
    onPrimary: "on-primary",
    anchor: "night-text",
    success: "success",
    warning: "warning",
    danger: "error",
    materialHighlight: "night-text",
    materialBody: "night-border",
    materialSeam: "night-text-muted",
    lensCore: "night-canvas",
    lensReflection: "night-primary-hover",
    rubber: "night-canvas",
    equipmentPaint: "night-primary-active",
    fabric: "night-surface-muted",
    fabricStitch: "night-border",
    contactShadow: "night-canvas",
    imageBackdrop: "night-surface",
  },
  redLight: {
    canvas: "red-canvas",
    surface: "red-surface",
    surfaceMuted: "red-surface",
    surfaceElevated: "red-surface",
    text: "red-text",
    textMuted: "red-text-muted",
    textSecondary: "red-text-muted",
    border: "red-border",
    primary: "red-primary",
    primaryHover: "red-primary",
    primaryActive: "red-primary",
    onPrimary: "red-canvas",
    anchor: "red-text",
    success: "red-text",
    warning: "red-text",
    danger: "red-primary",
    materialHighlight: "red-text",
    materialBody: "red-border",
    materialSeam: "red-text-muted",
    lensCore: "red-canvas",
    lensReflection: "red-primary",
    rubber: "red-canvas",
    equipmentPaint: "red-primary",
    fabric: "red-surface",
    fabricStitch: "red-border",
    contactShadow: "red-canvas",
    imageBackdrop: "red-primary",
  },
};

const roleKeys = Object.keys(colors.planning).sort();
for (const [mode, roleMap] of Object.entries(projection)) {
  assert.deepEqual(Object.keys(colors[mode]).sort(), roleKeys, `${mode} role set drifted`);
  assert.deepEqual(Object.keys(roleMap).sort(), roleKeys, `${mode} projection is incomplete`);
  for (const [role, authoredKey] of Object.entries(roleMap)) {
    assert.equal(
      colors[mode][role],
      authoredColors[authoredKey],
      `${mode}.${role} must project colors.${authoredKey}`,
    );
  }
}

const observationValues = new Set(Object.values(colors.redLight));
const registeredObservationValues = new Set(
  ["red-canvas", "red-surface", "red-text", "red-text-muted", "red-border", "red-primary"].map(
    (key) => authoredColors[key],
  ),
);
assert.deepEqual(
  [...observationValues].sort(),
  [...registeredObservationValues].sort(),
  "observation mode must use exactly the registered six black/warm-red values",
);
assert.deepEqual(modeAliases, {
  day: "planning",
  observation: "redLight",
  "red-light": "redLight",
});

const authoredSpacing = flatSection("spacing");
for (const key of ["xxs", "xs", "sm", "md", "lg", "xl", "xxl"]) {
  assert.equal(spacing[key], numberFromCss(authoredSpacing[key]), `spacing.${key} drifted`);
}
const authoredRounded = flatSection("rounded");
for (const [runtimeKey, authoredKey] of Object.entries({
  compact: "sm",
  control: "md",
  layer: "lg",
  sheet: "sheet",
  pill: "pill",
})) {
  assert.equal(radii[runtimeKey], numberFromCss(authoredRounded[authoredKey]), `radii.${runtimeKey} drifted`);
}
assert.equal(minimumTouchTarget, 44);
assert.match(design, /44(?:px|×44)/, "DESIGN.md must retain the 44px target contract");

for (const [role, stack] of Object.entries({
  display: fontStacks.display,
  body: fontStacks.body,
  data: fontStacks.data,
})) {
  assert.equal(
    normalizeStack(stack),
    normalizeStack(typographyFamily(role)),
    `${role} font stack drifted`,
  );
}
assert.equal(type.displayFamily, "Bahnschrift");
assert.equal(type.bodyFamily, "Aptos");
assert.equal(type.dataFamily, "Cascadia Mono");

for (const required of [
  "`target.system.starward-blue-skeuomorphic-2026-07-29`",
  "Open Design `0.16.1`",
  "`user:starward-2026-07-29`",
  "`ds-starward-2026-07-29`",
  "`280b1d3726e181591f19b6ddef96ab5d32fb61c5302af07fcee194b32f135f70`",
  "`ae9d23d7d2a127b5ea1feb1a86cebd1b5a33dc1294de0ad40c9e4803a8a9be8f`",
]) {
  assert(design.includes(required), `missing active-system adoption identity: ${required}`);
}
for (const legacyTarget of [
  "target.mobile-product-pages-v2",
  "target.ops-product-pages-v1",
  "target.mobile-controls-v3",
  "target.ops-controls-v2",
]) {
  assert(
    design.includes(`Legacy rollback baseline \`${legacyTarget}\``),
    `legacy target is not explicitly rollback-only: ${legacyTarget}`,
  );
}

process.stdout.write(
  `${JSON.stringify({
    schema_version: "starward-design-system-verification-v1",
    status: "passed",
    authority: "DESIGN.md",
    active_target: "target.system.starward-blue-skeuomorphic-2026-07-29",
    modes: Object.keys(colors),
    color_roles_per_mode: roleKeys.length,
    observation_unique_values: observationValues.size,
    legacy_visual_targets: "rollback-only",
  })}\n`,
);
