// Bounded browser layout regression; this is not WEAPP composition evidence.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../..');
const out = path.join(root, 'artifacts/miniapp/cloud-sky-native/credit-layout-0928');
fs.mkdirSync(out, { recursive: true });
const current = fs.readFileSync(path.join(root, 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'), 'utf8');
assert.ok(current.indexOf('<View className="sky-image-status-group">') > current.indexOf('<View className="sky-quick-settings">'));
const text = ['NASA/IPAC IRSA · AllWISE W3 12 μm · 处理后红外影像',
  'Sloan Digital Sky Survey · CC BY 4.0 · 历史 g/r/i 光学影像'];
text.forEach(value => assert.ok(current.includes(value)));
const rules = slot => fs.readFileSync(path.join(root, `apps/wechat-miniapp/dist/weapp-check-${slot}/sky/detail/index.wxss`), 'utf8')
  .match(/\.sky-(?:image-status(?:-group)?|quick-settings|view-mode(?:__button)?|zoom-status(?:--feedback)?)[^{}]*\{[^{}]*\}/g).join('\n');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  for (const width of [320, 393, 430]) for (const scale of [1, 1.5]) for (const repaired of [false, true]) {
    await page.setViewportSize({ width, height: 880 });
    const css = rules(repaired ? 'sky-batch-0928' : 'sky-rings-0928')
      .replace(/([\d.]+)rpx/g, (_, n) => `${Number(n) * width / 750 * scale}px`);
    const credits = text.map(value => `<div class="sky-image-status"><span>${value}</span></div>`).join('');
    await page.setContent(`<style>body{margin:0;background:#07101b;color:#b4c3d6;--sky-controls-top:88px;--target-min:44px;--type-action-size:14px;--type-action-line:20px;--text-secondary:#b4c3d6;--text-primary:#edf5ff;--surface:#101e2c}button{border:0} ${css}</style>
      <div class="sky-zoom-status sky-zoom-status--feedback"><span>验证 P1BATCH28B</span><span>m2 end0 最小0.05° 取消0</span><span>0.20°</span></div>
      <div class="sky-quick-settings"><div class="sky-view-mode">${['星座：开','红外：关','手动视角','跟随手机'].map(s => `<button class="sky-view-mode__button">${s}</button>`).join('')}</div>
      ${repaired ? `<div class="sky-image-status-group">${credits}</div>` : ''}</div>${repaired ? '' : credits}`);
    const boxes = await page.locator('.sky-image-status').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, height:r.height };
    }));
    const overlap = boxes[0].y < boxes[1].bottom && boxes[1].y < boxes[0].bottom;
    assert.equal(overlap, !repaired, 'old compiled rules overlap; new normal flow separates actual credit boxes');
    assert.ok(boxes.every(r => r.x >= 0 && r.right <= width && r.height > 0));
    results.push({ width, scale, repaired, overlap, boxes });
    if (width === 393 && scale === 1) await page.screenshot({ path:path.join(out, repaired ? 'after.png' : 'before.png') });
  }
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ scope:'Compiled WXSS browser subset, not native acceptance', results }, null, 2));
  await browser.close();
  console.log(JSON.stringify({ cases:results.length, beforeOverlapCases:6, afterSeparatedCases:6 }));
})().catch(error => { console.error(error); process.exitCode = 1; });
