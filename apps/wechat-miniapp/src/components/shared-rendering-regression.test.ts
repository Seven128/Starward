import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { semanticIconRenderer } from "./semantic-asset-test-support";

const componentStyles = new URL("./semantic-asset.scss", import.meta.url);
const mapStyles = new URL("../pages/map/index.scss", import.meta.url);

test("retained shared icons use main-package assets across owner and top-page routes", () => {
  for (const pagePath of ["/pages/map/index", "/content/plan/detail/index", "/spot/detail/index", "/sky/detail/index"]) {
    const icon = semanticIconRenderer(pagePath);
    for (const name of ["search", "location", "layers", "meteor", "arrow-left", "info"] as const) {
      const expected = `/assets/b-icons/${name}--day--default.png`;
      assert.equal(icon.render({ name }).props.src, expected);
      icon.navigate("sky/sources/index");
      assert.equal(icon.render({ name }).props.src, expected);
      icon.navigate("pages/map/index");
      assert.equal(icon.render({ name }).props.src, expected);
    }
  }
});

test("retained subpackage icons keep their own package across child and Back routes", async () => {
  for (const [path, prefix, name] of [["/sky/detail/index", "/sky", "horizon"],
    ["/content/plan/detail/index", "/content", "parking"], ["/spot/detail/index", "/spot", "parking"]] as const) {
    const asset = await readFile(new URL(`../../runtime-assets/b-icons/${name}--day--default.png`, import.meta.url));
    assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "use a real retained PNG, not a missing fixture");
    const icon = semanticIconRenderer(path);
    const expected = `${prefix}/assets/b-icons/${name}--day--default.png`;
    assert.equal(icon.render({ name }).props.src, expected);
    icon.navigate("sky/sources/index");
    assert.equal(icon.render({ name }).props.src, expected);
    icon.navigate("pages/map/index");
    assert.equal(icon.render({ name }).props.src, expected);
  }
  // Shared arrows/search now resolve to main regardless of route. A real
  // package variant still detects the retired top-page binding mechanism.
  const mutated = semanticIconRenderer("/content/plan/detail/index", "DAY", true);
  const expected = "/content/assets/b-icons/parking--day--default.png";
  assert.equal(mutated.render({ name: "parking" }).props.src, expected);
  mutated.navigate("spot/detail/index");
  assert.equal(mutated.render({ name: "parking" }).props.src, "/spot/assets/b-icons/parking--day--default.png");
  assert.notEqual(mutated.render({ name: "parking" }).props.src, expected);
});

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
