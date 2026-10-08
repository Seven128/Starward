import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const componentStyles = new URL("./semantic-asset.scss", import.meta.url);
const mapStyles = new URL("../pages/map/index.scss", import.meta.url);

async function retainedIcon(pagePath: string, useStackRoute = false) {
  const source = await readFile(new URL("./semantic-asset.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("icons.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const body = ast.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getText(ast).replace(/^export /u, "")).join("\n");
  let topRoute = pagePath.replace(/^\//u, "");
  let ownedRouter: { path: string } | undefined;
  const component = vm.runInNewContext(ts.transpileModule(body + "\nSemanticIcon;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    // The installed Taro default hook memoizes Current.router at mount.
    useRouter: () => useStackRoute ? { path: `/${topRoute}` }
      : (ownedRouter ??= { path: pagePath }),
    useAppStore: (select: (state: { mode: string }) => unknown) => select({ mode: "DAY" }),
    Image: "Image", View: "View",
    React: { createElement: (type: string, props: Record<string, unknown>) => ({ type, props }) },
  }) as (props: { name: string }) => { props: { src: string } };
  return { render: (name: string) => component({ name }).props.src,
    navigate: (route: string) => { topRoute = route; } };
}

test("retained Map icons keep main-package assets after Sky opens", async () => {
  for (const name of ["search", "location", "layers", "meteor"]) {
    const icon = await retainedIcon("/pages/map/index");
    const expected = `/assets/b-icons/${name}--day--default.png`;
    assert.equal(icon.render(name), expected);
    icon.navigate("sky/detail/index");
    assert.equal(icon.render(name), expected);
  }
  // Bounded mutation of the route-binding mechanism reproduces the escaped
  // defect without editing source or manufacturing missing package assets.
  const mutated = await retainedIcon("/pages/map/index", true);
  mutated.render("search");
  mutated.navigate("sky/detail/index");
  assert.throws(() => assert.equal(mutated.render("search"), "/assets/b-icons/search--day--default.png"));
});

test("retained subpackage icons keep their own package across child and Back routes", async () => {
  for (const [path, prefix] of [["/sky/detail/index", "/sky"],
    ["/content/plan/detail/index", "/content"], ["/spot/detail/index", "/spot"]] as const) {
    const icon = await retainedIcon(path);
    const expected = `${prefix}/assets/b-icons/arrow-left--day--default.png`;
    assert.equal(icon.render("arrow-left"), expected);
    icon.navigate("sky/sources/index");
    assert.equal(icon.render("arrow-left"), expected);
    icon.navigate("pages/map/index");
    assert.equal(icon.render("arrow-left"), expected);
  }
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
