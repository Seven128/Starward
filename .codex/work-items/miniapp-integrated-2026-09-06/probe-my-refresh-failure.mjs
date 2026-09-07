import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';
const p = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function observe() {
  return p.evaluate(() => {
    const page = getCurrentPages().at(-1), labels = []; let rows = 0;
    function scan(n) { if (!n || typeof n !== 'object') return; if (n.cl === 'profile-summary') rows++; if (typeof n.v === 'string' && (/反馈审核状态|重试审核状态|条待处理|状态暂不可用|条草稿/.test(n.v) || n.v === '还没有保存的主页。')) labels.push(n.v); for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
    scan(page.data);
    return { route: page.route, rows, labels, intercepted: globalThis.__myRefreshProbe?.count ?? 0 };
  });
}
let result;
try {
  if ((await observe()).route !== 'pages/my/index') {
    await p.evaluate(() => { wx.switchTab({ url: '/pages/my/index' }); });
  }
  for (let attempt = 0; attempt < 12 && (await observe()).route !== 'pages/my/index'; attempt++) await pause(1000);
  if ((await observe()).route !== 'pages/my/index') throw new Error('my_baseline_route_not_ready');
  await pause(4000);
  const before = await observe();
  console.log(JSON.stringify({ phase: 'baseline', ...before }));
  await p.evaluate(() => { wx.switchTab({ url: '/pages/map/index' }); });
  await pause(14000); // Let the real 10-second query freshness expire; do not edit cache.
  await p.evaluate(() => {
    const original = wx.request, state = { count: 0, restore() { wx.request = original; } };
    if (globalThis.__myRefreshProbe) throw new Error('probe_already_present');
    globalThis.__myRefreshProbe = state;
    wx.request = function(options) {
      if (String(options.url).startsWith('http://127.0.0.1:8879/') && String(options.url).includes('/me/contributions') && (!options.method || options.method.toUpperCase() === 'GET')) {
        state.count++;
        const timer = setTimeout(() => { const error = { errMsg: 'request:fail isolated profile refresh probe' }; options.fail?.(error); options.complete?.(error); }, 0);
        return { abort() { clearTimeout(timer); } };
      }
      return original.call(wx, options);
    };
    setTimeout(state.restore, 15000);
  });
  await p.evaluate(() => { wx.switchTab({ url: '/pages/my/index' }); });
  await pause(6500);
  const failed = await observe();
  await p.evaluate(() => globalThis.__myRefreshProbe.restore());
  result = { lane: 'official-navigation-and-component-retry-with-transport-failure', before, failed };
  if (failed.labels.includes('重试审核状态')) {
    await p.evaluate(() => {
      const page = getCurrentPages().at(-1); let button;
      function scan(n) { if (!n || typeof n !== 'object') return; if (n.ariaLabel === '重试审核状态') button = n.sid; for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
      scan(page.data); if (!button) throw new Error('retry_entry_missing');
      const target = { id: button, dataset: { sid: button } };
      page.eh({ type: 'tap', timeStamp: Date.now(), target, currentTarget: target, detail: {} });
    });
    await pause(3000);
    result.recovered = await observe();
  }
} finally {
  await p.evaluate(() => { globalThis.__myRefreshProbe?.restore(); delete globalThis.__myRefreshProbe; });
  p.disconnect();
}
await writeFile('artifacts/miniapp/my-refresh-failure-runtime.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));



