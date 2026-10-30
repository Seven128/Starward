import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, mapCloudReadInstant } from "@starward/miniapp-contracts";
import { createAuthenticatedOperationRequester } from "../../services/authenticated-operation";
import { transportHarness } from "../../services/api-request-test-support";

const parse = (path: string) => ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const run = (source: string, scope: Record<string, unknown>) => vm.runInNewContext(ts.transpileModule(source,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
const page = parse("./index.tsx"), clientSource = parse("../../services/api-client.ts"), lightHook = parse("../../hooks/use-map-night-light.ts");
let cloud: ts.Expression | undefined, cloudReadAt: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(page) === "cloud") cloud = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(page) === "cloudReadAt") cloudReadAt = node.initializer;
  ts.forEachChild(node, visit);
}
visit(page); assert(cloud); assert(cloudReadAt);
const functions = clientSource.statements.filter(node => ts.isFunctionDeclaration(node) && ["getMapCloud", "getMapNightLight"].includes(node.name?.text ?? ""))
  .map(node => node.getText(clientSource).replace(/^export /u, "")).join("\n");
const light = lightHook.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useMapNightLight")!;
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

for (const layer of ["cloud", "night-light"] as const) test(`${layer}: switching off retires a query waiting for session as well as an active native request`, async () => {
  const transport = transportHarness();
  let finishSession!: (value: null) => void;
  const session = new Promise<null>(resolve => { finishSession = resolve; });
  const requestOperation = createAuthenticatedOperationRequester({ resolveSession: () => session,
    readStoredSession: () => null, clearStoredSession() {}, isPermissionDenied: () => false,
    request: transport.request as unknown as Parameters<typeof createAuthenticatedOperationRequester>[0]["request"] });
  const api = run(`${functions}; ({getMapCloud, getMapNightLight});`, { requestOperation, NIGHT_LIGHT_CONTRAST_DISPLAY, encodeURIComponent, mapCloudReadInstant });
  const viewport = { center: { latitude: 22.5, longitude: 114.5 }, zoom: 12,
    bounds: { west: 114.48, south: 22.48, east: 114.52, north: 22.52 } };
  const signals: AbortSignal[] = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const options = (enabled: boolean) => {
    const scope = { ...api, NIGHT_LIGHT_CONTRAST_DISPLAY, viewport, cloudEnabled: enabled,
      accountOwnerId: null, mapResetVersion: 0, activeContext: { contextId: "test-context", contextFingerprint: "one", revision: 1, weatherView: { cloudLayer: "TOTAL" } },
      nativeViewport: { bounds: viewport.bounds }, useEffect() {}, useResourceQuery: (value: unknown) => value,
      useMapCloudForecastQuery: (value: unknown) => value };
    const actual = layer === "cloud" ? run(`const cloudReadAt = (${cloudReadAt!.getText(page)}); (${cloud!.getText(page)});`, scope)
      : run(`${light.getText(lightHook).replace(/^export /u, "")}; useMapNightLight(viewport, ${enabled});`, scope);
    return { ...actual, staleTime: 60_000, queryFn: ({ signal }: { signal: AbortSignal }) => {
      signals.push(signal); return actual.queryFn(signal);
    } };
  };
  const observer = new QueryObserver(client, options(true));
  const unsubscribe = observer.subscribe(() => {});
  try {
    assert.equal(signals.length, 1);
    assert.equal(transport.calls.length, 0, "the session has not completed");
    observer.setOptions(options(false));
    assert.equal(transport.requests.cancel(`map-${layer}`), false, "no transport existed to cancel yet");
    assert.equal(signals[0]!.aborted, true, "closing must retire the Query reader itself");
    finishSession(null); await settle();
    assert.equal(transport.calls.length, 0, "late session completion must not dispatch closed-layer work");
    observer.setOptions(options(true)); await settle();
    assert.equal(transport.calls.length, 1, "the same active key can start again");
    observer.setOptions(options(false)); await settle();
    assert.equal(signals[1]!.aborted, true);
    assert.equal(transport.counts().aborts, 1, "an already dispatched request also retires");
    observer.setOptions(options(true)); await settle();
    transport.calls[1]!.success({ statusCode: 200, data: transport.response }); await settle();
    assert.equal(observer.getCurrentResult().status, "success");
    assert.equal(observer.getCurrentResult().data, transport.response);
  } finally { unsubscribe(); client.clear(); transport.queryClient.clear(); }
});
