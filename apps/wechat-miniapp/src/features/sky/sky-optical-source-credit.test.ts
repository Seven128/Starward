import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { after, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { assertPreparedOpticalManifest, type PreparedOpticalManifest, type SdssScienceOpticalManifest,
  sdssOpticalPublication } from "@starward/miniapp-contracts";
import { createSyntheticSdssSciencePublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";
import { celestialInformationSourceRoute } from "../../services/celestial-information-presentation";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { skyTargetOpticalFrame } from "./sky-sdss-optical-frame";
import { completeLegacySkyOptical, completeTargetSkyOptical, liveSkyOpticalCompletion,
  type SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";
import { skyOpticalSourceCredit, type SkyOpticalSourceCredit } from "./sky-optical-source-credit";

const fullHubbleCredit = "NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)";
const prepared = JSON.parse(readFileSync(new URL("./sky-prepared-optical-footprint.fixture.json", import.meta.url),
  "utf8")).publication as PreparedOpticalManifest;
assertPreparedOpticalManifest(prepared, "M:51", prepared.publicationHash);
const generated = mkdtempSync(join(tmpdir(), "starward-optical-credit-"));
const structural = createSyntheticSdssSciencePublication(generated);
const raw = JSON.parse(readFileSync(join(generated, "manifest.json"), "utf8"));
const science = { ...raw, publicationHash: structural.expectedHash } as SdssScienceOpticalManifest;
function freeze(value: unknown): void {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
}
freeze(prepared); freeze(science);
const retirements: Array<() => void> = [];
after(() => {
  retirements.forEach(retire => retire());
  assert.equal(dirname(realpathSync(generated)), realpathSync(tmpdir()));
  assert(basename(generated).startsWith("starward-optical-credit-"));
  rmSync(generated, { recursive: true }); // Verified owned, regeneratable fixture.
});

function world(publication: PreparedOpticalManifest | SdssScienceOpticalManifest = prepared) {
  const fine = {}, parent = {};
  const retireFine = registerSkyNativeImageLifetime(fine, () => true);
  const retireParent = registerSkyNativeImageLifetime(parent, () => true);
  retirements.push(retireFine, retireParent);
  const frame = skyTargetOpticalFrame({ publication, image: fine, renderedLevel: "DETAIL",
    renderedAsset: publication.levels.DETAIL,
    coarser: { image: parent, level: "MEDIUM", asset: publication.levels.MEDIUM } });
  assert(frame);
  const completion = completeTargetSkyOptical(frame,
    { submitted: true, finePrepared: true, coarsePrepared: true },
    { completed: true, qualification: { fine: "has", coarse: "has", any: "has" },
      finePhoto: "positive", coarsePhoto: "positive" });
  assert(completion);
  return { frame, completion, retireFine, retireParent };
}

test("full source-family credit and route belong to the painted publication, including surviving coarse", () => {
  const state = world();
  const credit = skyOpticalSourceCredit(state.completion);
  assert(credit && Object.isFrozen(credit));
  assert.equal(credit.credit, fullHubbleCredit);
  assert.equal(credit.reference, "M:51");
  assert.equal(credit.publicationHash, prepared.publicationHash);
  assert.equal(credit.sourceRoute, `/sky/sources/index?reference=M%3A51&opticalPublicationHash=${prepared.publicationHash}`);
  assert.match(credit.description, /历史.*非自然真彩/u);
  state.retireFine();
  assert.deepEqual(skyOpticalSourceCredit(state.completion), credit);
  state.retireParent();
  assert.equal(skyOpticalSourceCredit(state.completion), null);
  const sdss = world(science);
  assert.equal(skyOpticalSourceCredit(sdss.completion)?.credit, "Sloan Digital Sky Survey");
  assert.match(skyOpticalSourceCredit(sdss.completion)!.description, /g\/r\/i/u);
});

test("unknown/black, uncompleted, contradictory and foreign identities cannot borrow a caption", () => {
  const state = world();
  assert.equal(skyOpticalSourceCredit(null), null);
  assert.equal(skyOpticalSourceCredit({ ...state.completion, reference: "M:82" }), null);
  assert.equal(skyOpticalSourceCredit({ ...state.completion, publicationHash: "0".repeat(64) }), null);
  const unknown = completeTargetSkyOptical(state.frame, { submitted: true, finePrepared: true, coarsePrepared: true },
    { completed: true, qualification: { fine: "has", coarse: "has", any: "has" },
      finePhoto: "unknown", coarsePhoto: "unknown" });
  assert.equal(skyOpticalSourceCredit(unknown), null);
  for (const receipt of [
    { ...state.completion.receipt, completed: false },
    { ...state.completion.receipt, finePhoto: "unknown" },
    { ...state.completion.receipt, qualification: { fine: "empty", coarse: "has", any: "has" } },
  ]) assert.equal(skyOpticalSourceCredit({ ...state.completion, receipt } as SkyTargetOpticalCompletion), null);
  const legacyImage = {};
  const retire = registerSkyNativeImageLifetime(legacyImage, () => true); retirements.push(retire);
  const legacy = completeLegacySkyOptical({ reference: "M:51", publicationHash: sdssOpticalPublication("M:51")!.publicationHash,
    image: legacyImage, level: "OVERVIEW", fieldDegrees: .2275555555555556 }, legacyImage);
  assert.equal(skyOpticalSourceCredit(legacy)?.credit, "Sloan Digital Sky Survey");
  assert(legacy);
  assert.equal(skyOpticalSourceCredit({ ...legacy, publicationHash: prepared.publicationHash }), null);
});

interface Element { type: string; props: { children?: unknown; disabled?: boolean; onClick?: () => void } }
function jsx(type: string | ((props: object) => Element), props: object): Element {
  return typeof type === "function" ? type(props) : { type, props };
}
const componentCode = ts.transpileModule(readFileSync(new URL("./sky-optical-image-credit.tsx", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const moduleExports: Record<string, unknown> = {};
vm.runInNewContext(componentCode, { exports: moduleExports, require(name: string) {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name === "@tarojs/components") return { Button: "button", Text: "text", View: "view" };
  throw new Error(`unexpected_component_dependency:${name}`);
} });
const Credit = moduleExports.SkyOpticalImageCredit as (props: {
  credit: SkyOpticalSourceCredit | null; disabled?: boolean; onOpenSources: (credit: SkyOpticalSourceCredit) => void;
}) => Element | null;
function flatten(element: unknown): Element[] {
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (!element || typeof element !== "object" || !("type" in element)) return [];
  const current = element as Element;
  return [current, ...flatten(current.props.children)];
}

test("actual caption component renders the complete attribution and its captured exact-version action", () => {
  const original = skyOpticalSourceCredit(world().completion)!;
  let opened: SkyOpticalSourceCredit | null = null;
  const element = Credit({ credit: original, onOpenSources(value) { opened = value; } });
  const nodes = flatten(element);
  assert(nodes.some(node => node.type === "text" && node.props.children === fullHubbleCredit));
  const action = nodes.find(node => node.type === "button"); assert(action?.props.onClick);
  action.props.onClick();
  assert.equal(opened, original);
  assert.equal(Credit({ credit: null, onOpenSources() { assert.fail("no credit action"); } }), null);
});

test("calibration locks the actual caption action while retaining full attribution", () => {
  const original = skyOpticalSourceCredit(world().completion)!;
  const nodes = flatten(Credit({ credit: original, disabled: true, onOpenSources() { assert.fail("locked source action"); } }));
  assert(nodes.some(node => node.type === "text" && node.props.children === fullHubbleCredit));
  const action = nodes.find(node => node.type === "button"); assert(action?.props.onClick);
  assert.equal(action.props.disabled, true);
  action.props.onClick();
});

const page = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const initializers = new Map<string, string>();
let caption: string | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
      ["presentedSdssOptical", "opticalImageCredit"].includes(node.name.text))
    initializers.set(node.name.text, node.initializer.getText(page));
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === "SkyOpticalImageCredit") caption = node.getText(page);
  ts.forEachChild(node, visit);
}
visit(page);
assert(initializers.has("presentedSdssOptical") && initializers.has("opticalImageCredit") && caption);
const pageCode = ts.transpileModule(`const presentedSdssOptical=${initializers.get("presentedSdssOptical")};
const opticalImageCredit=${initializers.get("opticalImageCredit")}; result=${caption};`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
test("actual page caption consumer follows accepted frame, Canvas generation and liveness, not latest focus", () => {
  const state = world();
  for (const [sceneCurrent, mounted, generation, expected] of [
    [true, true, 7, true], [false, true, 7, false], [true, false, 7, false], [true, true, 8, false],
  ] as const) {
    const context = { exports: {}, require: () => ({ jsx, jsxs: jsx }), liveSkyOpticalCompletion, skyOpticalSourceCredit,
      SkyOpticalImageCredit: Credit, presentedSceneCurrent: sceneCurrent, nativeCanvasMounted: mounted,
      canvasSize: { width: 390, height: 844 }, canvasGenerationRef: { current: 7 },
      presentedSkyFrame: { nativeCanvasGeneration: generation, sdssOptical: state.completion },
      selectedDeepSkyEntry: { reference: "M:82" }, sdssOptical: { publication: science },
      alignmentEditing: false, openOpticalSources() {}, result: null as Element | null };
    vm.runInNewContext(pageCode, context);
    assert.equal(flatten(context.result).some(node => node.props.children === fullHubbleCredit), expected);
  }
});

test("modal and caption route formatting preserves both optional identities and escapes values", () => {
  assert.equal(celestialInformationSourceRoute("M:51"), "/sky/sources/index?reference=M%3A51");
  assert.equal(celestialInformationSourceRoute("M:51", "image&v=2", "optical#new"),
    "/sky/sources/index?reference=M%3A51&imagePublicationHash=image%26v%3D2&opticalPublicationHash=optical%23new");
});
