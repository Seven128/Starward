import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { celestialInformationPartialDetail } from "../../services/celestial-information-presentation";
import { isDeepSkyObjectReference, isPreparedOpticalReference, preparedNativeOpticalSource, preparedNativeOpticalPublicationHash } from "@starward/miniapp-contracts";
import { preparedNativeOpticalFixture } from "../../../../../packages/miniapp-contracts/src/test-fixtures/prepared-native-optical-publication.ts";

const source = ts.createSourceFile("index.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "CelestialSourcesPage") as ts.FunctionDeclaration;
assert.ok(component);
const code = ts.transpileModule(`${component.getText(source).replace(/^export\s+default\s+/, "")}\nCelestialSourcesPage;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;

test("source route retains valid credit and offers recovery for a partial information publication", () => {
  let retries = 0;
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) =>
      ({ type, props: props ?? {}, children }) },
    View: "View", ScrollView: "ScrollView", CustomNav: "CustomNav",
    Provenance: "Provenance", StatusPanel: "StatusPanel",
    useRouter: () => ({ params: { reference: "HR%3A7001" } }),
    useState: (value: unknown) => [value, () => {}], useDidHide: () => {}, useDidShow: () => {},
    useThemeClass: () => "mode-night", isCelestialObjectReference: () => true, isDeepSkyObjectReference,
    useResourceQuery: () => ({ isPending: false, isError: false }),
    useCelestialInformation: () => ({ isPending: false, isError: false, refreshError: null,
      data: { dataState: "PARTIAL", data: { displayName: "织女星", sources: [{ id: "bsc", provider: "BSC" }] } },
      refetch: () => { retries++; return Promise.resolve(); } }),
    isProductSource: () => true, deepSkyManifestUrl: () => undefined,
    celestialInformationPartialDetail,
  }) as () => any;
  const tree = render();
  function find(node: any, predicate: (candidate: any) => boolean): any {
    if (Array.isArray(node)) {
      for (const child of node) { const found = find(child, predicate); if (found) return found; }
      return null;
    }
    if (predicate(node)) return node;
    for (const child of node?.children ?? []) { const found = find(child, predicate); if (found) return found; }
    return null;
  }
  const partial = find(tree, node => node?.type === "StatusPanel" && node.props.state === "PARTIAL");
  assert.ok(partial);
  assert.ok(find(tree, node => node?.type === "Provenance" && node.props.source.provider === "BSC"));
  partial.props.onRecover();
  assert.equal(retries, 1);
});

test("the source route reads the image-bound publication and rejects an invalid binding before enabling a request", () => {
  const hash = "a".repeat(64), opticalHash = "b".repeat(64),
    params: { reference: string; imagePublicationHash: string; opticalPublicationHash?: string } =
      { reference: "M%3A42", imagePublicationHash: hash, opticalPublicationHash: opticalHash },
    requests: unknown[][] = [], downloads: unknown[][] = [];
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props: props ?? {}, children }) },
    View: "View", ScrollView: "ScrollView", CustomNav: "CustomNav", Provenance: "Provenance", StatusPanel: "StatusPanel",
    useRouter: () => ({ params }), useState: (value: unknown) => [value, () => {}], useDidHide() {}, useDidShow() {},
    useThemeClass: () => "mode-night", isCelestialObjectReference: () => true, isProductSource: () => true, isDeepSkyObjectReference,
    useResourceQuery: () => ({ isPending: false, isError: false }),
    deepSkyManifestUrl: (...args: string[]) => { downloads.push(args); return `/manifest/${args[0]!.split(":").at(-1)}`; },
    celestialInformationPartialDetail,
    useCelestialInformation: (...args: unknown[]) => { requests.push(args); return { isPending: false, isError: false,
      data: { dataState: "FRESH", data: { displayName: "M 42", sources: [{ id: `imagery:painted:${hash}`, limitations: [] },
        { id: `optical-imagery:science:${opticalHash}`, limitations: [] }] } } }; },
  }) as () => any;
  const tree = render();
  assert.deepEqual(Array.from(requests[0]!), ["M:42", true, hash, opticalHash]);
  const stack = [tree]; const credits: any[] = [];
  while (stack.length) { const item = stack.pop(); if (Array.isArray(item)) stack.push(...item);
    else if (item?.type === "Provenance") credits.push(item); else stack.push(...(item?.children ?? [])); }
  assert.ok(downloads.some(args => args[0] === `optical-imagery:science:${opticalHash}` && args[1] === opticalHash));
  assert.ok(downloads.some(args => args[0] === `imagery:painted:${hash}` && args[1] === opticalHash), "W3 download identity remains its own hash");
  const infraredCredit = credits.find(credit => credit.props.source.id.startsWith("imagery:"));
  const opticalCredit = credits.find(credit => credit.props.source.id.startsWith("optical-imagery:"));
  assert.equal(infraredCredit?.props.downloadUrl, `/manifest/${hash}`);
  assert.ok(infraredCredit.props.source.limitations.some((value: string) => value.includes("非有限样本留空")));
  assert.equal(opticalCredit?.props.downloadUrl, `/manifest/${opticalHash}`);
  params.imagePublicationHash = "../outside";
  render();
  assert.equal(requests.at(-1)?.[1], false);
  params.imagePublicationHash = hash;
  params.opticalPublicationHash = "../outside"; render();
  assert.equal(requests.at(-1)?.[1], false);
  params.opticalPublicationHash = opticalHash; params.reference = "HR%3A7001"; render();
  assert.equal(requests.at(-1)?.[1], false);
  params.reference = "M%3A42"; delete params.opticalPublicationHash; render();
  assert.deepEqual(Array.from(requests.at(-1)!), ["M:42", true, hash, undefined]);
});

test("an independent region source route keeps exact credit/unknown meaning and cannot show retired metadata", () => {
  const publication = preparedNativeOpticalFixture(true), hash = preparedNativeOpticalPublicationHash(publication);
  let current = true, retries = 0, enabled = false, objectRequestEnabled = true;
  const params: any = { reference: encodeURIComponent(publication.reference), preparedPublicationHash: hash };
  const render = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: any, ...children: unknown[]) => ({ type, props: props ?? {}, children }) },
    View: "View", ScrollView: "ScrollView", CustomNav: "CustomNav", Provenance: "Provenance", StatusPanel: "StatusPanel",
    useRouter: () => ({ params }), useState: (v: unknown) => [v, () => {}], useDidHide() {}, useDidShow() {},
    useThemeClass: () => "mode-night", isPreparedOpticalReference, isDeepSkyObjectReference, isProductSource: () => true,
    preparedNativeOpticalSource, deepSkyManifestUrl: (_source: string, selectedHash: string) => `/manifest/${selectedHash}`,
    useCelestialInformation: (_reference: string, active: boolean) => { objectRequestEnabled = active; return {}; },
    useResourceQuery: (options: any) => { enabled = options.enabled; return { data: { publication: { ...publication, publicationHash: hash }, isCurrent: () => current },
      isPending: false, isError: false, refetch: () => { retries++; } }; },
  }) as () => any;
  const flatten = (tree: any): any[] => !tree ? [] : Array.isArray(tree) ? tree.flatMap(flatten) : [tree, ...flatten(tree.children)];
  const first = flatten(render()), credit = first.find(n => n.type === "Provenance");
  assert(credit); assert(enabled); assert.equal(objectRequestEnabled, false);
  assert.equal(credit.props.source.attribution.name, publication.source.credit); assert.equal(credit.props.downloadUrl, `/manifest/${hash}`);
  assert(credit.props.source.precision.includes("科学有效性和源分辨率未知"));
  current = false; const retired = flatten(render()); assert(!retired.some(n => n.type === "Provenance"));
  const error = retired.find(n => n.type === "StatusPanel" && n.props.state === "ERROR"); assert(error); error.props.onRecover(); assert.equal(retries, 1);
  params.opticalPublicationHash = hash; render(); assert.equal(enabled, false, "conflicting immutable routes cannot open another publication query");
});
