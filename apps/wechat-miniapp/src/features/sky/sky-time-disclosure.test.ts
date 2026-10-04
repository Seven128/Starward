import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createSkyObservationTime } from "./sky-observation-time";

const committedAt = "2026-09-30T15:59:58.000Z";
const source = ts.createSourceFile("sky.tsx", readFileSync(process.env.SKY_TIME_DISCLOSURE_SOURCE ??
  new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function pageDeclaration(name: string) {
  const matches: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) matches.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(matches.length, 1);
  return matches[0]!;
}

// Exercise the actual page's public dock callbacks with its existing time
// owner. Ruler unmount cancellation only covers an active drag; playback and
// located previews must also be dismissed by the enclosing time disclosure.
function dockAction(kind: "time" | "list") {
  const callbacks: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "Button") {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const className = attributes.find(attribute => attribute.name.getText(source) === "className")?.initializer;
      const marker = attributes.find(attribute => attribute.name.getText(source) === "data-od-id")?.initializer;
      const matches = kind === "time" ? className?.getText(source).includes("sky-control-dock__button--time") :
        marker?.getText(source) === '"sky-orientation-object-list-toggle"';
      if (matches) {
        const callback = attributes.find(attribute => attribute.name.getText(source) === "onClick")?.initializer;
        assert.ok(callback && ts.isJsxExpression(callback) && callback.expression);
        callbacks.push(callback.expression.getText(source));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(callbacks.length, 1, "one public dock action owns this disclosure");
  return callbacks[0]!;
}

function render(kind: "time" | "list", panel: "time" | "calibration" | null = "time", editing = false) {
  const time = createSkyObservationTime();
  time.bind("context:revision1", committedAt, { startAt: committedAt, endAt: "2026-09-30T17:00:00.000Z" });
  let listOpen = false;
  let disclosureClosed = 0;
  let dateOpen = true;
  let nextPanel = panel;
  const update = (previous: any, change: any) => typeof change === "function" ? change(previous) : change;
  const scope = vm.createContext({
    skyControlPanel: panel,
    observationTime: time,
    setTimeIntent: (value: ReturnType<typeof time.snapshot>) => assert.strictEqual(value, time.snapshot()),
    orientationController: { snapshot: () => ({ alignment: { mode: editing ? "editing" : "auto" } }) },
    closeSkyObjectDisclosure: () => { disclosureClosed++; },
    setOrientationObjectListOpen: (value: unknown) => { listOpen = update(listOpen, value); },
    setDatePickerOpen: (value: boolean) => { dateOpen = value; },
    // React setters enqueue the next render; this callback retains the
    // panel value from the render that created it for its entire execution.
    setSkyControlPanel: (value: unknown) => { nextPanel = update(nextPanel, value); },
  });
  const action = vm.runInContext(ts.transpileModule(`${pageDeclaration("setPreviewIndex")}\n${pageDeclaration("pauseSkyTime")}\n(${dockAction(kind)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, scope) as () => void;
  return { time, action, panel: () => nextPanel,
    listOpen: () => listOpen, disclosureClosed: () => disclosureClosed, dateOpen: () => dateOpen };
}

for (const kind of ["time", "list"] as const) {
  test(`${kind} closes a paused cross-midnight playback preview and fences its late timer`, () => {
    const page = render(kind);
    page.time.play(1000);
    const preview = page.time.tick(4500).at;
    assert.equal(preview, "2026-09-30T16:00:01.500Z", "the preview has crossed local midnight at UTC+8");
    page.time.pause();
    page.action();
    assert.equal(page.time.snapshot().at, committedAt,
      "closing time disclosure must restore the committed instant, including previews with no active ruler gesture");
    assert.equal(page.time.snapshot().mode, "FIXED");
    assert.equal(page.time.tick(9000).at, committedAt, "a retired playback callback cannot revive the hidden preview");
    assert.equal(page.panel(), null);
    assert.equal(page.listOpen(), kind === "list");
    assert.equal(page.disclosureClosed(), 1);
    assert.equal(page.dateOpen(), false);
  });

  test(`${kind} also dismisses active playback and a located preview`, () => {
    for (const intent of ["playing", "located"] as const) {
      const page = render(kind);
      if (intent === "playing") { page.time.play(1000); page.time.tick(4500); }
      else page.time.preview("2026-09-30T16:30:00.000Z");
      page.action();
      assert.equal(page.time.snapshot().at, committedAt, intent);
      assert.equal(page.time.tick(9000).at, committedAt, intent);
    }
  });

  test(`${kind} preserves a newly committed Context when the time disclosure closes`, () => {
    const page = render(kind);
    const selectedAt = "2026-09-30T16:30:00.000Z";
    page.time.preview(selectedAt);
    page.time.bind("context:revision2", selectedAt, { startAt: committedAt, endAt: "2026-09-30T17:00:00.000Z" });
    page.action();
    assert.equal(page.time.snapshot().binding, "context:revision2");
    assert.equal(page.time.snapshot().at, selectedAt);
    assert.equal(page.time.snapshot().committedAt, selectedAt);
  });

  test(`${kind} cannot dismiss the frozen calibration through a late dock callback`, () => {
    const page = render(kind, "calibration", true);
    page.action();
    assert.equal(page.panel(), "calibration");
    assert.equal(page.disclosureClosed(), 0);
    assert.equal(page.listOpen(), false);
    assert.equal(page.dateOpen(), true);
  });
}

test("opening the time disclosure retains its current preview", () => {
  const page = render("time", null);
  page.time.preview("2026-09-30T16:30:00.000Z");
  page.action();
  assert.equal(page.panel(), "time");
  assert.equal(page.time.snapshot().at, "2026-09-30T16:30:00.000Z");
});

test("opening the list without closing time pauses playback at its current reading", () => {
  const page = render("list", null);
  page.time.play(1000);
  const at = page.time.tick(4500).at;
  page.action();
  assert.equal(page.time.snapshot().at, at);
  assert.equal(page.time.snapshot().mode, "PAUSED");
});
