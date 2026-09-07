import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';
const p = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function observe() {
  return p.evaluate(() => {
    const page = getCurrentPages().at(-1), labels = []; let rows = 0;
    function scan(n) { if (!n || typeof n !== 'object') return; if (n.cl === 'profile-link-row') rows++; if (typeof n.v === 'string' && (/更新失败|重新获取链接|正在加载主页|主页链接暂时无法加载/.test(n.v) || n.v === '还没有保存的主页。')) labels.push(n.v); for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
    scan(page.data);
    return { route: page.route, rows, labels, intercepted: globalThis.__profileRefreshProbe?.count ?? 0 };
  });
}
let result;
try {
  if ((await observe()).route !== 'content/profile/links/index') {
    await p.evaluate(() => { wx.navigateTo({ url: '/content/profile/links/index' }); });
  }
  await pause(1500);
  const before = await observe();
  console.log(JSON.stringify({ phase: 'baseline', ...before }));
  await p.evaluate(() => { wx.navigateBack(); });
  await pause(31000); // Let the real 30-second query freshness expire; do not edit cache.
  await p.evaluate(() => {
    const original = wx.request, state = { count: 0, restore() { wx.request = original; } };
    if (globalThis.__profileRefreshProbe) throw new Error('probe_already_present');
    globalThis.__profileRefreshProbe = state;
    wx.request = function(options) {
      if (String(options.url).startsWith('http://127.0.0.1:8879/') && String(options.url).includes('/me/profile-links') && (!options.method || options.method.toUpperCase() === 'GET')) {
        state.count++;
        const timer = setTimeout(() => { const error = { errMsg: 'request:fail isolated profile refresh probe' }; options.fail?.(error); options.complete?.(error); }, 0);
        return { abort() { clearTimeout(timer); } };
      }
      return original.call(wx, options);
    };
    setTimeout(state.restore, 15000);
  });
  await p.evaluate(() => { wx.navigateTo({ url: '/content/profile/links/index' }); });
  await pause(6500);
  const failed = await observe();
  await p.evaluate(() => globalThis.__profileRefreshProbe.restore());
  result = { lane: 'official-navigation-and-component-retry-with-transport-failure', before, failed };
  if (failed.labels.includes('重新获取链接')) {
    await p.evaluate(() => {
      const page = getCurrentPages().at(-1); let button;
      function scan(n) { if (!n || typeof n !== 'object') return; if (n.ariaLabel === '重新获取链接') button = n.sid; for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
      scan(page.data); if (!button) throw new Error('retry_entry_missing');
      const target = { id: button, dataset: { sid: button } };
      page.eh({ type: 'tap', timeStamp: Date.now(), target, currentTarget: target, detail: {} });
    });
    await pause(3000);
    result.recovered = await observe();
  }
} finally {
  await p.evaluate(() => { globalThis.__profileRefreshProbe?.restore(); delete globalThis.__profileRefreshProbe; });
  p.disconnect();
}
await writeFile('artifacts/miniapp/profile-refresh-failure-runtime.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
