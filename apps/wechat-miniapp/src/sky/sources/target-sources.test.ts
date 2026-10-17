import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { ObservationContext, SkyTarget } from "@starward/miniapp-contracts";
import { parseSkyTargetSourceSelection, skyTargetSourceContextMatches, skyTargetSourcesRoute } from "../../features/sky/sky-target-sources-route";
import { skyTargetInstantQueryKey } from "../../services/sky-target-instant-response";
import { sourceRecoveryTestScope } from "./source-recovery-test-support";

const context = { contextId: "ctx:source", revision: 2, contextFingerprint: "fp:2",
  location: { kind: "FORMAL_SPOT", spotId: "spot:source" } } as ObservationContext;
const sourceCredit = { id: "astronomy:event:v1", title: "Original source", sourceUrl: "https://example.org/original" };
const target = { targetId: "event:conjunction:2026-10-15", source: sourceCredit } as SkyTarget;
const at = "2026-10-15T13:00:24.087Z";
const params = () => Object.fromEntries(new URL(skyTargetSourcesRoute(context, "spot:source", "data:2", at, target), "https://example.invalid").searchParams);
const elements = (node: any): any[] => !node ? [] : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.children)];

test("report source route retains event identity, exact public time and the existing target-query owner", () => {
  const selection = parseSkyTargetSourceSelection(params())!;
  assert.ok(selection);
  assert.equal(selection.targetId, target.targetId, "events retain their own identity");
  assert.equal(selection.sourceId, sourceCredit.id);
  assert.equal(selection.at, at);
  assert.equal(skyTargetSourceContextMatches(selection, context), true);
  assert.deepEqual(skyTargetInstantQueryKey(selection, selection.dataRevision),
    ["spot-sky-target-instant", "ctx:source:2:fp:2", "data:2", at]);
  for (const change of [{ revision: 3 }, { contextFingerprint: "other" }, { contextId: "ctx:other" },
    { location: { kind: "FORMAL_SPOT", spotId: "spot:other" } }])
    assert.equal(skyTargetSourceContextMatches(selection, { ...context, ...change } as ObservationContext), false);
});

test("missing or mixed source-route identities do not enable a different publication family", () => {
  for (const change of [{ targetSources: "0" }, { contextRevision: "NaN" }, { contextRevision: "0" },
    { contextFingerprint: "" }, { at: "invalid" }, { sourceId: "" }, { targetId: "" },
    { reference: "HR:7001" }, { hipsPublicationHash: "a".repeat(64) }, { preparedPublicationHash: "a".repeat(64) }])
    assert.equal(parseSkyTargetSourceSelection({ ...params(), ...change }), null);
});

test("actual target source page keeps the selected credit, rejects replacement identities and fences queued retry", async () => {
  const source = ts.createSourceFile("target-sources.tsx", readFileSync(new URL("./target-sources.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SkyTargetSourcesPage")!;
  const scope = sourceRecoveryTestScope();
  let current = context, retries = 0, enabled = false, requests = 0, sourceId = sourceCredit.id;
  const query = { isPending: false, isError: false, refreshError: new Error("offline"),
    data: { dataState: "PARTIAL", data: { targets: [{ ...target, displayName: "两星相伴", reason: "原始完整活动说明", source: { ...sourceCredit } }] } },
    refetch: () => { retries++; } };
  const store = Object.assign((select: (value: unknown) => unknown) => select({ observationContext: current }),
    { getState: () => ({ observationContext: current }) });
  let queryFn: (() => Promise<unknown>) | undefined;
  const render = vm.runInNewContext(ts.transpileModule(component.getText(source).replace(/^export\s+/u, "") + "\nSkyTargetSourcesPage;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    ...scope.bindings, React: { createElement: (type: string, props: any, ...children: unknown[]) => ({ type, props: props ?? {}, children }) },
    View: "View", Text: "Text", ScrollView: "ScrollView", CustomNav: "CustomNav", Provenance: "Provenance", StatusPanel: "StatusPanel",
    useState: (value: unknown) => [value, () => {}], useDidHide() {}, useDidShow() {}, useThemeClass: () => "",
    useAppStore: store, parseSkyTargetSourceSelection, skyTargetSourceContextMatches, skyTargetInstantQueryKey,
    getSkyTargetInstant: async (binding: any) => { requests++; assert.equal(binding.at, at); assert.equal(binding.contextRevision, 2); return query.data; },
    useResourceQuery: (options: any) => { enabled = options.enabled; queryFn = options.queryFn; return query; },
  });
  const frame = () => elements(scope.render(render, { params: { ...params(), sourceId } }));
  const first = frame(); assert.equal(enabled, true);
  assert.deepEqual(first.find(n => n.type === "Provenance")?.props.source, sourceCredit);
  assert.ok(first.some(n => n.type === "Text" && n.children.includes("原始完整活动说明")), "full report explanation remains available with its selected source");
  assert.ok(first.some(n => n.type === "StatusPanel" && n.props.state === "PARTIAL"));
  assert.ok(first.some(n => n.type === "StatusPanel" && n.props.state === "STALE"));
  await queryFn!(); assert.equal(requests, 1, "use the original target transport, without an image request");
  const retry = first.find(n => n.type === "StatusPanel" && n.props.onRecover)!.props.onRecover;
  retry(); assert.equal(retries, 1);
  current = { ...context, revision: 3 }; retry(); assert.equal(retries, 1, "live Context replacement fences a queued callback before React commits");
  assert.equal(frame().some(n => n.type === "Provenance"), false); assert.equal(enabled, false);
  current = context; sourceId = "astronomy:event:v2";
  const replacement = frame(); assert.equal(replacement.some(n => n.type === "Provenance"), false);
  assert.ok(replacement.some(n => n.type === "StatusPanel" && n.props.state === "ERROR"));
  retry(); assert.equal(retries, 1, "returning to a page does not revive the previous selection callback");
  scope.dispose();
});
