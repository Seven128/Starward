import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';
const p = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' });
const observe = () => p.evaluate(() => {
  const page = getCurrentPages().at(-1), text = [];
  function scan(n) { if (!n || typeof n !== 'object') return; if (typeof n.v === 'string') text.push(n.v); for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
  scan(page.data);
  return { route: page.route, text, intercepted: globalThis.__mapStaleEnvelopeProbe?.count ?? 0 };
});
const tap = () => p.evaluate(() => {
  const page = getCurrentPages().at(-1); let button;
  function scan(n) { if (!n || typeof n !== 'object') return; if (n.ariaLabel === '刷新当前区域' || n['aria-label'] === '刷新当前区域') button = n.sid; for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
  scan(page.data); if (!button) throw new Error('refresh_entry_missing');
  const target = { id: button, dataset: { sid: button } };
  page.eh({ type: 'tap', timeStamp: Date.now(), target, currentTarget: target, detail: {} });
});
let result;
try {
  const before = await observe();
  if (before.route !== 'pages/map/index') throw new Error('requires_existing_map');
  await p.evaluate(() => {
    if (globalThis.__mapStaleEnvelopeProbe) throw new Error('probe_already_present');
    const original = wx.request, state = { stale: true, count: 0, restore: () => { wx.request = original; } };
    globalThis.__mapStaleEnvelopeProbe = state;
    wx.request = function(options) {
      if (String(options.url).startsWith('http://127.0.0.1:8879/') && String(options.url).includes('/map/scene')) {
        const header = { ...options.header };
        delete header['If-None-Match'];
        return original.call(wx, { ...options, header, success(response) {
          if (response.statusCode === 200 && response.data?.dataState) {
            state.count++;
            options.success?.({ ...response, data: { ...response.data, dataState: state.stale ? 'STALE_USABLE' : response.data.dataState } });
          } else options.success?.(response);
        } });
      }
      return original.call(wx, options);
    };
    setTimeout(state.restore, 15000);
  });
  await tap();
  await new Promise(resolve => setTimeout(resolve, 4500));
  const failed = await observe();
  await p.evaluate(() => { globalThis.__mapStaleEnvelopeProbe.stale = false; });
  await tap();
  await new Promise(resolve => setTimeout(resolve, 3500));
  const recovered = await observe();
  result = { lane: 'component-event-with-synthetic-stale-envelope-on-real-fixture-response', before, failed, recovered };
} finally {
  await p.evaluate(() => { globalThis.__mapStaleEnvelopeProbe?.restore(); delete globalThis.__mapStaleEnvelopeProbe; }).catch(() => {});
  p.disconnect();
}
await writeFile('artifacts/miniapp/map-stale-envelope-runtime.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ intercepted: result.failed.intercepted, failure: result.failed.text.filter(t => /刷新|更新失败|预报待更新|尚未获取/.test(t)), recovery: result.recovered.text.filter(t => /刷新|更新失败|预报待更新|尚未获取/.test(t)) }));


