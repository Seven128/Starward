import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';
const p = await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function observe() {
  return p.evaluate(() => new Promise(resolve => {
    const page = getCurrentPages().at(-1);
    let visible = false;
    function scan(n) { if (!n || typeof n !== 'object') return; if (n.v === '暂时无法返回，请再点一次返回。') visible = true; for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
    scan(page.data);
    wx.createSelectorQuery().select('.custom-nav__error').boundingClientRect().select('.custom-nav__back-control').boundingClientRect().exec(rects => resolve({route:page.route, visible, errorRect:rects[0], backRect:rects[1], calls:globalThis.__backRecoveryProbe?.calls}));
  }));
}
async function tapBack() {
  return p.evaluate(() => {
    const page = getCurrentPages().at(-1); let sid;
    function scan(n) { if (!n || typeof n !== 'object') return; if ((n.ariaLabel === '返回' || n['aria-label'] === '返回') && n.sid) sid = n.sid; for (const v of Object.values(n)) if (typeof v === 'object') scan(v); }
    scan(page.data); if (!sid) throw Error('back_missing');
    const target = {id:sid,dataset:{sid}};
    page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
  });
}
let result;
try {
  await p.evaluate(() => { wx.switchTab({url:'/pages/my/index'}); }); await pause(1800);
  await p.evaluate(() => { wx.navigateTo({url:'/pages/auth/index'}); }); await pause(1800);
  const initial = await observe(); if (initial.route !== 'pages/auth/index') throw Error('auth_not_ready');
  await p.evaluate(() => {
    if (globalThis.__backRecoveryProbe) throw Error('probe_exists');
    const back = wx.navigateBack, tab = wx.switchTab;
    const state = {calls:[], restore(){wx.navigateBack=back;wx.switchTab=tab;}};
    globalThis.__backRecoveryProbe=state;
    for (const name of ['navigateBack','switchTab']) wx[name] = function(options) {state.calls.push(name);setTimeout(()=>{const error={errMsg:name+':fail isolated probe'};options.fail?.(error);options.complete?.(error);},0);};
    setTimeout(state.restore,15000);
  });
  await tapBack(); await pause(1000);
  const failed = await observe();
  await p.evaluate(() => globalThis.__backRecoveryProbe.restore());
  if (!failed.visible || failed.calls?.join(',') !== 'navigateBack,switchTab') throw Error('failure_not_observed');
  if (!failed.errorRect?.height || failed.backRect?.height < 44) throw Error('recovery_geometry_invalid');
  await tapBack(); await pause(1800);
  const recovered = await observe();
  if (recovered.route !== 'pages/my/index') throw Error('retry_not_returned');
  result = {lane:'9421-component-events-and-isolated-navigation-failure',initial,failed,recovered,nativeTapVerified:false};
} finally {
  await p.evaluate(() => {globalThis.__backRecoveryProbe?.restore();delete globalThis.__backRecoveryProbe;});
  await p.disconnect();
}
await writeFile('artifacts/miniapp/back-recovery-runtime.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
