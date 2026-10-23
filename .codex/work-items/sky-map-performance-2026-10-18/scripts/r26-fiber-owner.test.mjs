import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const miniRequire = createRequire(new URL('../../../../apps/wechat-miniapp/package.json', import.meta.url));
const ts = miniRequire('typescript');
const source = await fs.readFile(new URL('./r26-fiber-owner-observer.ts', import.meta.url), 'utf8');
function load(source, require = () => { throw Error('unexpected import'); }, environment = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,require,module){' + compiled.outputText + '\n})', environment)(module.exports, require, module);
  return module.exports;
}
const { inspectR26FiberOwners: inspect, R26_FIBER_POLICY: policy } = load(source);
const key = '__reactFiber$localfixture';
const plain = value => JSON.parse(JSON.stringify(value));
const hook = state => ({ memoizedState: state, baseState: state, queue: { lastRenderedState: state, pending: null, interleaved: null }, baseQueue: null, next: null });
function entrance(state, alternateState = null) {
  const component = { tag: 0, memoizedState: hook(state), return: null, alternate: null };
  if (alternateState) component.alternate = { tag: 0, memoizedState: hook(alternateState), return: null, alternate: component };
  const node = { props: { id: 'spot-night-sky-scene' } };
  node[key] = { tag: 5, stateNode: node, return: component, alternate: null };
  return { node, component };
}

test('known descriptor paths identify exact aggregate objects and distinguish linked from alternate', () => {
  const a = {}, b = {}, ids = new WeakMap([[a, 1], [b, 2]]);
  const { node } = entrance({ stellarSupplement: a }, [{ frame: b }, []]);
  let clock = 100;
  const r = inspect({ nodes: [node, undefined], fiberKey: key, aggregateId: value => ids.get(value) ?? null, now: () => clock++ });
  assert.equal(r.status, 'matched'); assert.equal(r.capability, 'available'); assert.equal(r.clock.elapsedMs, 1);
  assert.equal(r.coverage.hostFibers, 1); assert.equal(r.coverage.functionFibers, 2);
  assert.equal(r.currentCommit, 'unresolved-host-linked-is-not-current');
  assert(r.matches.some(m => m.aggregateId === 1 && m.branch === 'host-linked' && m.field === 'memoizedState' && m.valuePath.join('.') === 'stellarSupplement'));
  assert(r.matches.some(m => m.aggregateId === 2 && m.branch === 'alternate' && m.valuePath.join('.') === '0.frame'));
  assert(r.matches.every(m => m.entrance === 'sky-canvas' && m.ancestorDepth === 1 && m.hookIndex === 0));
  assert(Object.isFrozen(r.matches[0].valuePath));
});

test('eager queue paths are actual strong fields and circular update lists terminate', () => {
  const aggregate = {}, state = { current: null }, { node, component } = entrance(state);
  const update = { eagerState: { frame: aggregate }, next: null }; update.next = update;
  component.memoizedState.baseQueue = update;
  component.memoizedState.queue.pending = update;
  const r = inspect({ nodes: [node], fiberKey: key, aggregateId: value => value === aggregate ? 7 : null, now: () => 100 });
  assert.equal(r.coverage.queueUpdates, 2);
  assert.deepEqual(plain(r.matches.map(m => [m.field, m.updateIndex, m.valuePath])),
    [['baseQueue.eagerState', 0, ['frame']], ['queue.pending.eagerState', 0, ['frame']]]);
  assert.equal(r.clock.status, 'below-resolution'); assert.equal(r.clock.elapsedMs, null);
});

test('accessors and unapproved objects are not read or serialized; unavailable remains explicit', () => {
  let calls = 0; const aggregate = {}, state = { privateText: 'PRIVATE-USER-TEXT' };
  Object.defineProperty(state, 'current', { get() { calls++; return aggregate; } });
  const { node } = entrance(state);
  const r = inspect({ nodes: [node], fiberKey: key, aggregateId: value => value === aggregate ? 1 : null, now: () => 1 });
  assert.equal(calls, 0); assert.equal(r.status, 'no-match-in-covered-fields'); assert(r.coverage.accessorSkipped > 0);
  assert(!JSON.stringify(r).includes('PRIVATE-USER-TEXT'));
  const foreign = { props: { id: 'unrelated-page' } }; Object.defineProperty(foreign, key, { get() { calls++; } });
  const no = inspect({ nodes: [foreign, undefined], fiberKey: key, aggregateId: () => null, now: () => NaN });
  assert.equal(calls, 0); assert.equal(no.capability, 'unavailable'); assert.equal(no.clock.status, 'invalid');
  assert.equal(inspect({ nodes: [], fiberKey: 'unapproved', aggregateId: () => null }).status, 'invalid-configuration');
  const invalidKey = entrance({}); invalidKey.node[key].stateNode = {};
  assert.equal(inspect({ nodes: [invalidKey.node], fiberKey: key, aggregateId: () => null }).capability, 'unavailable');
});

test('every expansion is bounded and omissions stay explicit', () => {
  const aggregate = {}, { node, component } = entrance({ stellarSupplement: aggregate });
  let tail = component.memoizedState;
  for (let i = 1; i <= policy.hooksPerFiber; i++) { tail.next = hook({ stellarSupplement: aggregate }); tail = tail.next; }
  const r = inspect({ nodes: [node, node, node], fiberKey: key, aggregateId: value => value === aggregate ? 1 : null });
  assert.equal(r.matches.length, policy.matches); assert(r.truncated.matches); assert(r.truncated.hooks); assert(r.truncated.entrances);
  assert(r.coverage.descriptorReads <= policy.descriptorReads); assert(r.coverage.valueObjects <= policy.valueObjects);
  assert(Buffer.byteLength(JSON.stringify(r)) < 12000);
  let deep = { frame: aggregate }; for (let i = 0; i < 10; i++) deep = { current: deep };
  const nested = entrance(deep);
  const depth = inspect({ nodes: [nested.node], fiberKey: key, aggregateId: () => null });
  assert(depth.truncated.depth);
  const wide = entrance(Array.from({ length: 40 }, () => ({})));
  assert(inspect({ nodes: [wide.node], fiberKey: key, aggregateId: () => null }).truncated.arrayItems);
  const q = entrance(null); let update = null;
  for (let i = 0; i < 50; i++) update = { eagerState: null, next: update };
  q.component.memoizedState.baseQueue = update;
  const updates = inspect({ nodes: [q.node], fiberKey: key, aggregateId: () => null });
  assert(updates.truncated.updates); assert.equal(updates.coverage.queueUpdates, 32);
});

test('returned scalar receipt does not become a strong holder after the observation job', { skip: typeof global.gc !== 'function' }, async () => {
  const { receipt, weak } = (() => {
    const aggregate = {}, ids = new WeakMap([[aggregate, 1]]), { node } = entrance({ stellarSupplement: aggregate });
    return { receipt: inspect({ nodes: [node], fiberKey: key, aggregateId: value => ids.get(value) ?? null }), weak: new WeakRef(aggregate) };
  })();
  let collected = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setImmediate(resolve)); global.gc();
    await new Promise(resolve => setImmediate(resolve));
    if (weak.deref() === undefined) { collected = true; break; }
  }
  assert(collected); assert.equal(receipt.matches[0].aggregateId, 1);
});

test('complete installed Taro renderer exposes real hook ownership, updates and removes the owned entrance', async () => {
  const expected = { '@tarojs/react': '4.2.1', '@tarojs/runtime': '4.2.1', react: '18.3.1', 'react-reconciler': '0.29.0' };
  for (const [name, version] of Object.entries(expected)) assert.equal(miniRequire(name + '/package.json').version, version);
  const previousEnv = { NODE_ENV: process.env.NODE_ENV, TARO_PLATFORM: process.env.TARO_PLATFORM, TARO_ENV: process.env.TARO_ENV };
  const flags = ['ENABLE_INNER_HTML', 'ENABLE_ADJACENT_HTML', 'ENABLE_CLONE_NODE', 'ENABLE_CONTAINS', 'ENABLE_SIZE_APIS', 'ENABLE_TEMPLATE_CONTENT', 'ENABLE_MUTATION_OBSERVER'];
  const previousFlags = new Map(flags.map(flag => [flag, Object.getOwnPropertyDescriptor(globalThis, flag)]));
  process.env.NODE_ENV = 'production'; process.env.TARO_PLATFORM = 'mini'; process.env.TARO_ENV = 'weapp';
  for (const flag of flags) globalThis[flag] = false;
  try {
    const runtime = miniRequire('@tarojs/runtime'), React = miniRequire('react');
    const rendererSource = await fs.readFile(miniRequire.resolve('@tarojs/react'), 'utf8');
    const renderer = load(rendererSource, miniRequire, { process, console, setTimeout, clearTimeout, queueMicrotask, performance });
    const root = runtime.document.createElement('root');
    let setState;
    const a = {}, b = {}, ids = new WeakMap([[a, 1], [b, 2]]);
    function Fixture() {
      const [state, update] = React.useState({ stellarSupplement: a }); setState = update;
      return React.createElement('canvas', { id: 'spot-night-sky-scene', 'data-state-bound': Boolean(state) });
    }
    root.ctx = { setData(_data, callback) { callback?.(); } };
    renderer.render(React.createElement(Fixture), root);
    await new Promise(resolve => setTimeout(resolve, 0));
    const node = runtime.eventSource.get('spot-night-sky-scene'); assert(node);
    const first = inspect({ nodes: [node], fiberKey: renderer.internalInstanceKey, aggregateId: value => ids.get(value) ?? null });
    assert.equal(first.status, 'matched'); assert(first.matches.some(m => m.aggregateId === 1 && m.field === 'memoizedState'));
    renderer.flushSync(() => setState({ stellarSupplement: b }));
    const second = inspect({ nodes: [runtime.eventSource.get('spot-night-sky-scene')], fiberKey: renderer.internalInstanceKey, aggregateId: value => ids.get(value) ?? null });
    assert(second.matches.some(m => m.aggregateId === 2));
    assert(second.matches.some(m => m.branch === 'alternate'));
    renderer.unmountComponentAtNode(root);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(runtime.eventSource.get('spot-night-sky-scene'), undefined);
    const retired = inspect({ nodes: [runtime.eventSource.get('spot-night-sky-scene')], fiberKey: renderer.internalInstanceKey, aggregateId: value => ids.get(value) ?? null });
    assert.equal(retired.capability, 'unavailable'); assert.equal(retired.matches.length, 0);
    assert.equal(first.currentCommit, 'unresolved-host-linked-is-not-current');
  } finally {
    for (const [name, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    for (const [name, descriptor] of previousFlags) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});
