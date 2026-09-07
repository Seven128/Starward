import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';
const p = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' });
async function observe() {
  return p.evaluate(() => {
    const page = getCurrentPages().at(-1), text = [];
    function scan(n) { if (!n || typeof n !== 'object') return; if (typeof n.v === 'string') text.push(n.v); for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
    scan(page.data);
    return { route: page.route, text, intercepted: globalThis.__sourceRefreshProbe?.count ?? 0 };
  });
}
async function tap(label) {
  return p.evaluate(label => {
    const page = getCurrentPages().at(-1); let button, parent;
    function scan(n) { if (!n || typeof n !== 'object') return; if (n.ariaLabel === label || n['aria-label'] === label) button = n.sid; if (n.cl?.startsWith('map-panel-layer')) parent = n.sid; for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
    scan(page.data); if (!button) throw new Error('entry_missing: ' + label);
    const target = { id: button, dataset: { sid: button } };
    page.eh({ type: 'tap', timeStamp: Date.now(), target, currentTarget: target, detail: {} });
    if (parent) page.eh({ type: 'tap', timeStamp: Date.now(), target, currentTarget: { id: parent, dataset: { sid: parent } }, detail: {} });
  }, label);
}
let result;
try {
  const before = await observe();
  if (before.route !== 'pages/map/index') throw new Error('requires_existing_map');
  await p.evaluate(() => {
    if (globalThis.__sourceRefreshProbe) throw new Error('probe_already_present');
    const original = wx.request, state = { count: 0, restore() { wx.request = original; } };
    globalThis.__sourceRefreshProbe = state;
    wx.request = function(options) {
      if (String(options.url).startsWith('http://127.0.0.1:8879/') && String(options.url).includes('/overview')) {
        state.count++;
        const timer = setTimeout(() => { const error = { errMsg: 'request:fail isolated source refresh probe' }; options.fail?.(error); options.complete?.(error); }, 0);
        return { abort() { clearTimeout(timer); } };
      }
      return original.call(wx, options);
    };
    setTimeout(state.restore, 15000);
  });
  await tap('查看完整来源与更新时间');
  await new Promise(resolve => setTimeout(resolve, 4500));
  const failed = await observe();
  await p.evaluate(() => globalThis.__sourceRefreshProbe.restore());
  result = { lane: 'component-event-with-temporary-transport-failure', before, failed };
  if (failed.text.some(t => t.includes('来源更新失败'))) {
    await tap('重新获取来源');
    await new Promise(resolve => setTimeout(resolve, 3500));
    result.recovered = await observe();
  }
} finally {
  await p.evaluate(() => { globalThis.__sourceRefreshProbe?.restore(); delete globalThis.__sourceRefreshProbe; });
  p.disconnect();
}
await writeFile('artifacts/miniapp/source-refresh-failure-runtime.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ route: result.failed.route, intercepted: result.failed.intercepted, failure: result.failed.text.filter(t => /更新失败|重新获取/.test(t)), recovered: result.recovered ? !result.recovered.text.some(t => t.includes('来源更新失败')) : false }));
