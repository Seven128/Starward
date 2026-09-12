import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";
import { readDesignTokens } from "./generate-design-tokens.mjs";

const { PNG } = pngjs;
const checkOnly = process.argv.slice(2).includes("--check");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const iconRoot = path.join(
  root,
  "apps",
  "wechat-miniapp",
  "src",
  "assets",
  "icons",
);

const TAB_MODES = {
  day: { regular: "#5E655F", selected: "#4859B8" },
  night: { regular: "#989E94", selected: "#D1D7FF" },
  observation: { regular: "#D84A3C", selected: "#FF6B58" },
};
const MARKER_MODES = {
  day: { primary: "#111827", surface: "#FFFFFF", accent: "#F2C94C" },
  night: { primary: "#181A17", surface: "#A9B6FF", accent: "#F2C94C" },
  observation: { primary: "#110000", surface: "#D84A3C", accent: "#FFB34D" },
};
const DAY_PRIMARY = [17, 24, 39];
const DAY_SURFACE = [255, 255, 255];
const DAY_ACCENT = [242, 201, 76];

function rgb(value) {
  const normalized = value.replace(/^#/u, "");
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function distance(left, right) {
  return left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0);
}

const generatedAssets = new Map();
const tokens = readDesignTokens(await readFile(path.join(root, "DESIGN.md"), "utf8"));
const themedSvgNames = [];
for (const name of ["chevron-right", "download", "trash-2", "wifi-off", "images", "account-user", "pencil", "settings", "share", "eye", "bulb", "cloud"]) {
  const source = await readFile(path.join(iconRoot, `${name}.svg`), "utf8");
  if (!source.includes('stroke="currentColor"')) throw new Error(`source_icon_stroke_missing:${name}`);
  for (const mode of ["day", "night", "observation"]) {
    const target = `${name}-${mode}.svg`;
    themedSvgNames.push(target);
    generatedAssets.set(target, Buffer.from(source.replaceAll('stroke="currentColor"', `stroke="${tokens.themes[mode]["text-primary"]}"`)));
  }
}

async function recolor(sourceName, targetName, selectColor) {
  const source = PNG.sync.read(await readFile(path.join(iconRoot, sourceName)));
  for (let offset = 0; offset < source.data.length; offset += 4) {
    if (source.data[offset + 3] === 0) continue;
    const color = selectColor([
      source.data[offset],
      source.data[offset + 1],
      source.data[offset + 2],
    ]);
    source.data[offset] = color[0];
    source.data[offset + 1] = color[1];
    source.data[offset + 2] = color[2];
  }
  generatedAssets.set(targetName, PNG.sync.write(source));
}

for (const [mode, colors] of Object.entries(TAB_MODES)) {
  for (const icon of ["map", "my"]) {
    const suffix = mode === "day" ? "" : `-${mode}`;
    await recolor(`tab-${icon}.png`, `tab-${icon}${suffix}.png`, () => rgb(colors.regular));
    await recolor(
      `tab-${icon}-selected.png`,
      `tab-${icon}-selected${suffix}.png`,
      () => rgb(colors.selected),
    );
  }
}

for (const [mode, colors] of Object.entries(MARKER_MODES)) {
  for (const selected of [false, true]) {
    const stem = `formal-spot-marker${selected ? "-selected" : ""}`;
    const suffix = mode === "day" ? "" : `-${mode}`;
    await recolor(`${stem}.png`, `${stem}${suffix}.png`, (sourceColor) => {
      const roles = [
        { source: DAY_PRIMARY, target: colors.primary },
        { source: DAY_SURFACE, target: colors.surface },
        { source: DAY_ACCENT, target: colors.accent },
      ];
      roles.sort((left, right) => distance(sourceColor, left.source) - distance(sourceColor, right.source));
      return rgb(roles[0].target);
    });
  }
}

const assetNames = [
  ...themedSvgNames,
  "formal-spot-marker.png",
  "formal-spot-marker-selected.png",
  ...Object.keys(MARKER_MODES).filter((mode) => mode !== "day").flatMap((mode) => [
    `formal-spot-marker-${mode}.png`,
    `formal-spot-marker-selected-${mode}.png`,
  ]),
  ...["map", "my"].flatMap((icon) => [
    `tab-${icon}.png`,
    `tab-${icon}-selected.png`,
    ...Object.keys(TAB_MODES).filter((mode) => mode !== "day").flatMap((mode) => [
      `tab-${icon}-${mode}.png`,
      `tab-${icon}-selected-${mode}.png`,
    ]),
  ]),
];
const assets = [];
for (const assetPath of assetNames.sort()) {
  const bytes =
    generatedAssets.get(assetPath) ??
    (await readFile(path.join(iconRoot, assetPath)));
  assets.push({
    path: assetPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const manifestBytes = Buffer.from(
  `${JSON.stringify(
    {
      schemaVersion: 2,
      authorityTarget: "target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02",
      designSource:
        "DESIGN.md#wechat-mini-program--sky-canvas-field-signal",
      interpretation:
        "Formal-spot markers use the adopted circular star pin. Mode variants preserve fill, outline and star contrast; selected state also uses size and never relies on color alone.",
      generatedAt: "2026-09-10",
      assets,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (checkOnly) {
  const mismatches = [];
  for (const [assetPath, expected] of generatedAssets) {
    const actual = await readFile(path.join(iconRoot, assetPath)).catch(() => null);
    if (!actual?.equals(expected)) mismatches.push(assetPath);
  }
  const actualManifest = await readFile(
    path.join(iconRoot, "marker-manifest.json"),
  ).catch(() => null);
  if (!actualManifest?.equals(manifestBytes)) mismatches.push("marker-manifest.json");
  if (mismatches.length > 0)
    throw new Error(`mode_icon_drift:${mismatches.join(",")}`);
  process.stdout.write(
    `${JSON.stringify({ status: "passed", checked_assets: assetNames.length })}\n`,
  );
} else {
  for (const [assetPath, bytes] of generatedAssets)
    await writeFile(path.join(iconRoot, assetPath), bytes);
  await writeFile(path.join(iconRoot, "marker-manifest.json"), manifestBytes);
  process.stdout.write(
    `${JSON.stringify({ status: "generated", generated_assets: generatedAssets.size })}\n`,
  );
}
