import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { reportSkyImageError } from "../../services/sky-image-diagnostics";
import { sdssOpticalPresentation } from "./sky-sdss-optical-selection";
import { createSkyArtworkLoader } from "./sky-artwork-loader";
import { skyHasDisclosure } from "./sky-disclosure-commands";

test("image diagnostics report each live failure transition once and expose no error UI", () => {
  const source = ts.createSourceFile("feedback.ts", readFileSync(new URL("./sky-image-feedback.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(ts.isFunctionDeclaration)!;
  let previous: { current: unknown } | undefined;
  const errors: unknown[][] = [];
  const feedback = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") +
    "\nuseSkyImageFailureDiagnostics;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    useRef: (value: unknown) => previous ??= { current: value }, useEffect: (effect: () => void) => effect(),
    reportSkyImageError: (...args: unknown[]) => errors.push(args),
  });
  const rows = [{ resource: "moon", failed: true }, { resource: "selected-infrared", failed: true }];
  feedback(rows, false); assert.equal(errors.length, 0);
  feedback(rows, true); feedback(rows.map(row => ({ ...row })), true); assert.equal(errors.length, 2);
  rows[0]!.failed = false; feedback(rows, true); rows[0]!.failed = true; feedback(rows, true);
  assert.equal(errors.length, 3); assert.deepEqual(errors[2], ["availability", "moon"]);
});

test("load and render failures log safe causes once while retaining an independently usable coarse image", () => {
  const original = console.error, errors: unknown[][] = [];
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const starts: any[] = [], states: any[] = [], coarse = {}, detail = {};
    const loader = createSkyArtworkLoader({ start(asset, ready, fail) { starts.push({ asset, ready, fail }); return () => {}; }, changed: state => states.push(state) });
    const assets = ["coarse", "detail"].map(id => ({ id, sha256: id, width: 16, height: 16 }));
    loader.update(assets); starts[0].ready({ image: coarse, release() {} });
    starts[1].fail(new Error("sky_image_http_503")); starts[1].fail(new Error("sky_image_http_503"));
    assert.equal(errors.length, 1); assert.equal(states.at(-1).images.get("coarse"), coarse); assert.equal(states.at(-1).failed, true);
    assert.match(JSON.stringify(errors), /sky_image_http_503/u);
    loader.retry(); starts[2].ready({ image: detail, release() {} }); loader.failed(detail); loader.failed(detail);
    assert.equal(errors.length, 2); assert.equal(states.at(-1).images.get("coarse"), coarse);
    assert.match(JSON.stringify(errors[1]), /render/u);
    reportSkyImageError("load", "https://private.invalid/?token=not-a-real-token", new Error("native path with private fields"));
    assert.doesNotMatch(JSON.stringify(errors), /private|token|native path/u);
    loader.dispose();
  } finally { console.error = original; }
});

type Element = { type: unknown; props: any; children: unknown[] };
test("image diagnostics keep the same Hook order through Context loading, missing and ready states", () => {
  const source = ts.createSourceFile("page.tsx", readFileSync(process.env.SKY_IMAGE_FEEDBACK_PAGE_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
  const effect = page.body!.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === "useSkyImageFailureDiagnostics");
  const firstReturn = page.body!.statements.find(node => ts.isIfStatement(node) && /return\s*\(/u.test(node.getText(source)));
  assert(effect && firstReturn); assert(effect.getStart(source) < firstReturn.getStart(source), "a later Context restore cannot add a conditional Hook");
});

function visible(node: unknown): { text: string; buttons: Element[] } {
  const words: string[] = [], buttons: Element[] = [];
  function visit(value: any): void {
    if (value === null || value === undefined || value === false) return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (typeof value === "string" || typeof value === "number") { words.push(String(value)); return; }
    if (value.type === "Button") buttons.push(value);
    value.children?.forEach(visit);
  } visit(node); return { text: words.join(" "), buttons };
}

test("actual image status and display consumers stay silent on image failure, retaining painted credit and data recovery", () => {
  const source = ts.createSourceFile("page.tsx", readFileSync(process.env.SKY_IMAGE_FEEDBACK_PAGE_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const regions = new Map<string, ts.Expression>();
  function find(node: ts.Node): void {
    if (ts.isJsxElement(node)) for (const attribute of node.openingElement.attributes.properties) {
      if (ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "className" && attribute.initializer && ts.isStringLiteral(attribute.initializer))
        if (["sky-image-status-group", "sky-resource-recoveries"].includes(attribute.initializer.text))
          regions.set(attribute.initializer.text, ts.isConditionalExpression(node.parent) ? node.parent : node);
    } ts.forEachChild(node, find);
  } find(source); assert.equal(regions.size, 2);
  const noop = () => {};
  const bindings = { React: { Fragment: "Fragment", createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", Text: "Text", Button: "Button", SkyOpticalImageCredit: "Credit", SkyBodyImageRecovery: "BodyRecovery",
    mode: "NIGHT", selectedDeepSkyEntry: { objectRef: "M:51", displayName: "M51" }, verticalFovDeg: 1, deepSkyImagePresented: false,
    deepSkyRegistrationReady: true, deepSkyImageState: "ERROR", presentedSkyFrame: null,
    hipsImageCredit: null, preparedRegionCredits: [], opticalImageCredit: null, alignmentEditing: false, openOpticalSources: noop,
    preparedDiscovery: { failed: true, retry: noop }, preparedRegions: { bindings: [{ requested: true, failed: true, selection: { publicationHash: "publication" } }], retry: noop },
    sdssOptical: { failed: true, updateFailed: true, refreshFailed: true }, sdssOpticalCurrentImagePresented: false,
    sdssOpticalStatus: sdssOpticalPresentation({ requested: true, photoPresented: false, canvasVisible: true, failed: true, loading: false }),
    optical: { failed: true }, wideField: { failed: true }, galacticImage: { failed: true, refreshFailed: true },
    bodyImages: { resources: [{ profile: { kind: "moon" }, failed: true }] }, landscapeImage: { failed: true },
    solarLightUnavailable: true, landscapeUnavailable: true, landscapeEnabled: true, galacticBandUnavailable: true,
    sunDiscUnavailable: true, moonDiscUnavailable: true, planetDiscUnavailable: true, artworkContributionUnavailable: true,
    coordinateGrids: { equatorial: false }, coordinateGridFrame: null, constellationFailed: false, stellarSupplement: { failed: false },
    retryConstellations: noop, retryOptical: noop, retryWideField: noop, retryGalacticImage: noop, retryLandscapeImage: noop,
    retrySkyRendering: noop, retryReport: noop, retryBodyImage: noop, retryDeepSkyImage: noop, retrySdssOptical: noop, recoverSkyResource: noop,
    retryStellarSupplement: noop,
    skyHasDisclosure,skyControlPanel:null,orientationObjectListOpen:false,datePickerOpen:false,selectedCatalogObject:null,selectedTargetId:null,catalogPickChoices:[] };
  function render(name: string, patch: object = {}): ReturnType<typeof visible> {
    return visible(vm.runInNewContext(ts.transpileModule(`(${regions.get(name)!.getText(source)})`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, { ...bindings, ...patch }));
  }
  const missing = render("sky-image-status-group"); assert.equal(missing.buttons.length, 0); assert.doesNotMatch(missing.text, /失败|未加载|不可用|重试/u);
  const coarse = render("sky-image-status-group", { deepSkyImagePresented: true });
  assert.match(coarse.text, /NASA\/IPAC IRSA/u); assert.equal(coarse.buttons.length, 0); assert.doesNotMatch(coarse.text, /失败|未加载|重试/u);
  assert.equal(render("sky-resource-recoveries").buttons.length, 0);
  assert.equal(render("sky-resource-recoveries", { constellationFailed: true, stellarSupplement: { failed: true } }).buttons.length, 2);
  assert.equal(render("sky-resource-recoveries", { stellarSupplement: { failed: false, interrupted: true } }).buttons.length, 1,
    "bounded cancellation retains an explicit recovery action without being a data error");
  for(const disclosure of [{skyControlPanel:"menu"},{skyControlPanel:"layers"},{skyControlPanel:"time"},
    {skyControlPanel:"calibration"},{orientationObjectListOpen:true},{datePickerOpen:true},
    {selectedCatalogObject:{reference:"M:51"}},{selectedTargetId:"current-target"},{catalogPickChoices:[{}]}])
    assert.equal(render("sky-image-status-group",{deepSkyImagePresented:true,...disclosure}).text.trim(),"",
      "credit text must not compete with the current menu or dialog");
  assert.match(render("sky-image-status-group",{deepSkyImagePresented:true}).text,/NASA\/IPAC IRSA/u,
    "closing the disclosure restores attribution from the accepted pixels");
});
