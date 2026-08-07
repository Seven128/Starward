import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const sourcePath = path.join(root, "docs/design-resources/miniapp-selected-source-2026-08-06-v1/artifacts/app-02-spot-detail-prototype.html");
const outputDirectory = path.join(root, "apps/wechat-miniapp/src/assets/media");
const source = await readFile(sourcePath, "utf8");

const requested = [
  { id: "orion", output: "orion-constellation.jpg" },
  { id: "milky-way", output: "milky-way-night-sky.jpg" },
  { id: "star-trails", output: "star-trails.jpg" },
];

await mkdir(outputDirectory, { recursive: true });
const manifest = [];
for (const item of requested) {
  const expression = new RegExp(`\\{id:'${item.id}'[\\s\\S]*?src:'data:image/jpeg;base64,([^']+)'`, "u");
  const match = source.match(expression);
  if (!match?.[1]) throw new Error(`selected_media_not_found:${item.id}`);
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 10_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`selected_media_invalid_jpeg:${item.id}`);
  const target = path.join(outputDirectory, item.output);
  await writeFile(target, bytes);
  manifest.push({ id: item.id, file: item.output, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), source: path.relative(root, sourcePath).replaceAll("\\", "/") });
}
await writeFile(path.join(outputDirectory, "extraction-manifest.json"), `${JSON.stringify({ schema_version: "starward-selected-media-extraction-v1", generated_from_immutable_selected_resource: true, media: manifest }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputDirectory, media: manifest }, null, 2));
