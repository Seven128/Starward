import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { art } from "./semantic-art.mjs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const sourceRelative =
  "tools/miniapp/semantic-art.mjs";
const sourcePath = path.join(root, ...sourceRelative.split("/"));
const outputDirectory = path.join(
  root,
  "apps/wechat-miniapp/src/assets/semantic",
);
const checkOnly = process.argv.includes("--check");

const subjects = [
  "four-point-star",
  "five-point-star",
  "tent",
  "telescope",
  "binoculars",
  "camera",
  "backpack",
  "neutral-avatar",
];

const modes = {
  day: {
    base: "#FFFFFF",
    edge: "#1769D2",
    accent: "#69C7F5",
    highlight: "#EEF4FA",
    shadow: "#D4E1EE",
  },
  night: {
    base: "#162B45",
    edge: "#5AA7FF",
    accent: "#8A8EF4",
    highlight: "#29425F",
    shadow: "#050A14",
  },
  observation: {
    base: "#150303",
    edge: "#F4554E",
    accent: "#FF514A",
    highlight: "#4D1716",
    shadow: "#200505",
  },
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function standaloneSvg(fragment, palette) {
  const style = `<style>.obj-base{fill:${palette.base};stroke:${palette.edge};stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.obj-edge{fill:none;stroke:${palette.edge};stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.obj-accent{fill:${palette.accent};stroke:${palette.edge};stroke-width:2.5;stroke-linejoin:round}.obj-hi{fill:${palette.highlight}}.obj-shadow{fill:${palette.shadow}}</style>`;
  return `${fragment
    .replace(
      "<svg ",
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" ',
    )
    .replace(">", `>${style}`)}\n`;
}

const source = await readFile(sourcePath, "utf8");
const sourceSha = sha256(source);

const expectedFiles = new Map();
for (const subject of subjects) {
  const fragment = art(subject);
  if (
    typeof fragment !== "string" ||
    !fragment.startsWith("<svg ") ||
    !fragment.includes("obj-shadow")
  )
    throw new Error(`selected_semantic_asset_invalid:${subject}`);
  for (const [mode, palette] of Object.entries(modes)) {
    const file = `${subject}-${mode}.svg`;
    expectedFiles.set(file, standaloneSvg(fragment, palette));
  }
}

const manifest = {
  schema_version: "starward-selected-semantic-assets-v1",
  source: sourceRelative,
  source_sha256: sourceSha,
  subjects,
  modes: Object.keys(modes),
  assets: [...expectedFiles].map(([file, bytes]) => ({
    file,
    sha256: sha256(bytes),
    bytes: Buffer.byteLength(bytes),
    representation: "source-derived-local-svg",
  })),
};
const expectedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const mismatches = [];
  for (const [file, expected] of expectedFiles) {
    const actual = await readFile(path.join(outputDirectory, file), "utf8").catch(
      () => null,
    );
    if (actual !== expected) mismatches.push(file);
  }
  const actualManifest = await readFile(
    path.join(outputDirectory, "semantic-asset-manifest.json"),
    "utf8",
  ).catch(() => null);
  if (actualManifest !== expectedManifest)
    mismatches.push("semantic-asset-manifest.json");
  if (mismatches.length)
    throw new Error(`selected_semantic_assets_stale:${mismatches.join(",")}`);
  process.stdout.write(
    `${JSON.stringify({ status: "passed", assets: expectedFiles.size, source_sha256: sourceSha })}\n`,
  );
} else {
  await mkdir(outputDirectory, { recursive: true });
  for (const [file, bytes] of expectedFiles)
    await writeFile(path.join(outputDirectory, file), bytes, "utf8");
  await writeFile(
    path.join(outputDirectory, "semantic-asset-manifest.json"),
    expectedManifest,
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify({ status: "generated", assets: expectedFiles.size, output_directory: path.relative(root, outputDirectory).replaceAll("\\", "/") })}\n`,
  );
}
