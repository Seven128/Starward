import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentStyles = new URL("./semantic-asset.scss", import.meta.url);
const mapStyles = new URL("../pages/map/index.scss", import.meta.url);

test("B bitmap icons retire the shared CSS pseudo-element drawing layer", async () => {
  const source = await readFile(componentStyles, "utf8");
  const sharedDrawing = source.indexOf(".semantic-icon::before,");
  const bitmapRetirement = source.indexOf(".semantic-icon.semantic-icon--b::before,");
  assert(sharedDrawing >= 0, "shared fallback drawing rule is missing");
  assert(
    bitmapRetirement > sharedDrawing,
    "the B bitmap retirement rule must follow the shared drawing rule so the final cascade cannot restore old glyphs",
  );
  assert.match(
    source.slice(bitmapRetirement),
    /content:\s*none;[\s\S]*?display:\s*none;/u,
    "B bitmap icons must remove pseudo-element content as well as paint",
  );
});

test("the layer active state paints only the circular visual surface", async () => {
  const source = await readFile(mapStyles, "utf8");
  const outerRule = source.match(/\.map-tool--layer-active\s*\{([^}]*)\}/u)?.[1] ?? "";
  const surfaceRule = source.match(/\.map-tool--layer-active::before\s*\{([^}]*)\}/u)?.[1] ?? "";
  assert.doesNotMatch(outerRule, /(?:^|;)\s*(?:background|border(?:-color)?)\s*:/u);
  assert.match(surfaceRule, /background:\s*#eef4ff/u);
  assert.match(surfaceRule, /border-color:\s*#c8d5ef/u);
});
