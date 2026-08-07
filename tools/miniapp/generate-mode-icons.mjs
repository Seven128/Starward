import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";

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
  night: { regular: "#A9BCD2", selected: "#5AA7FF" },
  observation: { regular: "#E44A43", selected: "#FF514A" },
};
const MARKER_MODES = {
  night: { primary: "#5AA7FF", surface: "#102238" },
  observation: { primary: "#FF514A", surface: "#150303" },
};
const DAY_PRIMARY = [23, 105, 210];
const DAY_SURFACE = [255, 255, 255];

function rgb(value) {
  const normalized = value.replace(/^#/u, "");
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function distance(left, right) {
  return left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0);
}

const generatedAssets = new Map();

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
    await recolor(`tab-${icon}.png`, `tab-${icon}-${mode}.png`, () => rgb(colors.regular));
    await recolor(
      `tab-${icon}-selected.png`,
      `tab-${icon}-selected-${mode}.png`,
      () => rgb(colors.selected),
    );
  }
}

for (const [mode, colors] of Object.entries(MARKER_MODES)) {
  for (const selected of [false, true]) {
    const stem = `spot-marker${selected ? "-selected" : ""}`;
    await recolor(`${stem}.png`, `${stem}-${mode}.png`, (sourceColor) =>
      distance(sourceColor, DAY_SURFACE) < distance(sourceColor, DAY_PRIMARY)
        ? rgb(colors.surface)
        : rgb(colors.primary),
    );
  }
}

const assetNames = [
  "spot-marker.png",
  "spot-marker-selected.png",
  ...Object.keys(MARKER_MODES).flatMap((mode) => [
    `spot-marker-${mode}.png`,
    `spot-marker-selected-${mode}.png`,
  ]),
  ...["map", "my"].flatMap((icon) => [
    `tab-${icon}.png`,
    `tab-${icon}-selected.png`,
    ...Object.keys(TAB_MODES).flatMap((mode) => [
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
      authorityTarget: "target.system.wechat-miniapp-soft-instruments-2026-08-05",
      designSource:
        "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/map-03-component-control-atlas.html#atlas-markers",
      interpretation:
        "30x34 normal pin and 38x42 selected pin; selected state uses size, fill, outline, check and label rather than color alone. Marker and native TabBar night/observation variants preserve geometry while resolving every opaque pixel to their exact mode roles.",
      generatedAt: "2026-08-06",
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
