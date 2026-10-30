const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../apps/wechat-miniapp/node_modules/typescript');
const { QueryClient, QueryObserver } = require('@tanstack/query-core');
const clients = [];
const collect = async () => { await new Promise(setImmediate); global.gc(); await new Promise(setImmediate); global.gc(); };
function prepare() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  const weak = {}, observers = [], unsubscribe = [], effects = [];
  const noop = () => {};
  const adapters = {
    react: { useRef: value => ({ current: value }), useEffect: effect => effects.push(effect()) },
    '../../hooks/use-resource-query': { useResourceQuery: options => {
      const queryFn = options.queryFn;
      const observer = new QueryObserver(client, { ...options, queryFn: ({signal}) => queryFn(signal) });
      observers.push(observer); unsubscribe.push(observer.subscribe(noop));
      return observer.getCurrentResult();
    } },
    '../../services/sky-celestial-client': { getSkyTargetInstant: () => Promise.resolve({ data: { at: '2026-10-26T20:00:00.000Z' } }) },
    '../../services/sky-target-instant-response': { skyTargetInstantQueryKey: b => b ? ['spot-sky-target', b.at] : ['spot-sky-target', 'inactive'] },
    '../../services/request-lifecycle': { MiniappRequestCancelled: class MiniappRequestCancelled extends Error {} },
  };
  const runtime = { exports: {}, require: name => { assert(name in adapters, name); return adapters[name]; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/wechat-miniapp/src/features/sky/sky-time-target-query.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, runtime);
  (() => {
    const pageOwner = { marker: 'retired-page-frame-owner' };
    weak.pageOwner = new WeakRef(pageOwner);
    const readCurrent = () => Boolean(pageOwner.marker);
    weak.readCurrent = new WeakRef(readCurrent);
    runtime.exports.useSkyTimeTargetQuery({ at: '2026-10-26T20:00:00.000Z' }, 'v1', true, readCurrent);
  })();
  return { weak, client, retire() { effects.splice(0).forEach(fn => fn?.()); unsubscribe.splice(0).forEach(fn => fn());
    observers.splice(0).forEach(o => o.destroy()); } };
}
(async () => {
  const h = prepare(); await new Promise(setImmediate); h.retire(); await collect();
  const cache = h.client.getQueryCache().getAll();
  console.log(JSON.stringify({ stage: 'retired-cache', queries: cache.length, observers: cache.map(q=>q.getObserversCount()),
    gcTimes: cache.map(q=>q.gcTime), pageOwner: Boolean(h.weak.pageOwner.deref()), readCurrent: Boolean(h.weak.readCurrent.deref()) }));
  h.client.clear(); cache.length = 0; await collect();
  console.log(JSON.stringify({ stage: 'cache-clear-control', pageOwner: Boolean(h.weak.pageOwner.deref()), readCurrent: Boolean(h.weak.readCurrent.deref()) }));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(()=>clients.forEach(c=>c.clear()));
