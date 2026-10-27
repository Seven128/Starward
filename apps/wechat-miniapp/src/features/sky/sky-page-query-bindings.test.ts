import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const page = ts.createSourceFile('page.tsx', readFileSync(new URL('./spot-sky-page.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['contextLookup', 'overview', 'reportQuery', 'stellarCatalog', 'constellationCatalog'] as const;
const queries = new Map<string, string>();
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(page) as typeof names[number])
    && node.initializer && ts.isCallExpression(node.initializer)) {
    const options = node.initializer.arguments[0];
    if (options && ts.isObjectLiteralExpression(options)) {
      const fn = options.properties.find(value => ts.isPropertyAssignment(value) && value.name.getText(page) === 'queryFn');
      if (fn && ts.isPropertyAssignment(fn)) queries.set(node.name.getText(page),
        ts.transpileModule(`(${fn.initializer.getText(page)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
    }
  }
  ts.forEachChild(node, visit);
}
visit(page);
assert.deepEqual([...queries.keys()].sort(), [...names].sort());

test('cached Sky requests keep their own spot, Context, catalog and cancellation signal across later renders', async () => {
  const calls: { service: string; args: unknown[] }[] = [];
  const response = Promise.resolve({ received: true });
  const service = (name: string) => (...args: unknown[]) => { calls.push({ service: name, args }); return response; };
  const services = { getSpotOverview: service('overview'), getSkyReport: service('report'),
    getSkyPageObservationContext: service('context'),
    getStellarCatalog: service('stars'), getConstellationCatalog: service('constellations') };
  const render = (spotId: string, contextId: string | null, routeId: string) => {
    const catalog = { catalogVersion: 'bsc5p-bright-stars.v3', catalogHash: 'a'.repeat(64) };
    const contextSession = { contextId: contextId ?? routeId }, setObservationContext = () => {};
    const bindings = { ...services, routeContext: { spotId, contextId: routeId },
      activeContext: contextId ? { contextId } : null, stellarReference: catalog, contextSession, setObservationContext };
    return { catalog, contextSession, setObservationContext, queries: Object.fromEntries([...queries].map(([name, code]) =>
      [name, vm.runInNewContext(code, bindings) as (signal: AbortSignal) => Promise<unknown>])) };
  };
  const a = render('spot-a', 'ctx:a', 'ctx:route-a'), b = render('spot-b', null, 'ctx:route-b');
  const signal = new AbortController().signal;
  for (const [entry, spot, context] of [[a, 'spot-a', 'ctx:a'], [b, 'spot-b', 'ctx:route-b'], [a, 'spot-a', 'ctx:a']] as const) {
    calls.length = 0;
    for (const name of names) assert.equal(entry.queries[name]!(signal), response, 'the native request promise remains owned by its service');
    assert.deepEqual(calls, [
      { service: 'context', args: [entry.contextSession, entry.setObservationContext, signal] },
      { service: 'overview', args: [spot, context, signal] },
      { service: 'report', args: [spot, context, signal] },
      { service: 'stars', args: [entry.catalog, signal] },
      { service: 'constellations', args: [signal] },
    ]);
  }
  await response;
});

test('cached SAO index request preserves its service receiver, signal and original Promise', () => {
  const source = ts.createSourceFile('supplement.ts', readFileSync(new URL('./use-sky-stellar-supplement.ts', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest, true);
  const binding = source.statements.find(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(value => value.name.getText(source) === 'getSaoIndex'))!;
  assert(binding);
  const response = Promise.resolve({ index: true }), calls: unknown[] = [];
  const client = { getIndex(this: unknown, signal?: AbortSignal) { calls.push(this, signal); return response; } };
  const getSaoIndex = vm.runInNewContext(ts.transpileModule(`${binding.getText(source)}; getSaoIndex;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { saoCatalogClient: client }) as (signal?: AbortSignal) => Promise<unknown>;
  const controller = new AbortController();
  assert.equal(getSaoIndex(controller.signal), response); controller.abort();
  assert.equal(getSaoIndex(controller.signal), response); assert.equal(getSaoIndex(), response);
  assert.deepEqual(calls, [client, controller.signal, client, controller.signal, client, undefined]);
});
