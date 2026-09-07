// Read-only diagnostics for the already-running trusted DevTools snapshot.
import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';

let program;
const timeout = setTimeout(() => {
  console.error('panel_geometry_timeout');
  process.exit(2);
}, 15000);
try {
  program = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9421' });
  const result = await program.evaluate(() => new Promise(resolve => {
    const selectors = [
      '.spot-panel', '#spot-panel-overview', '.spot-panel__title', '.spot-panel__scroll', '.spot-panel__action-bar',
      '.spot-panel__extent-button', '.spot-panel__action',
      '.spot-panel__section-tab', '.spot-panel__handle',
      '.spot-panel__snap-small', '.spot-panel__snap-medium', '.spot-panel__snap-large',
      '.map-tool', '.map-tool > .semantic-icon',
      '#spot-panel-document-start', '#spot-panel-astronomy',
      '.spot-panel__section-tab--active', '.spot-panel__text-action',
    ];
    const query = wx.createSelectorQuery();
    selectors.forEach(selector => query.selectAll(selector).boundingClientRect());
    query.exec(rows => {
      const info = wx.getWindowInfo();
      resolve({
        viewport: { width: info.windowWidth, height: info.windowHeight },
        elements: selectors.map((selector, index) => ({
          selector,
          rects: (rows[index] ?? []).map(rect => ({
            top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
            width: rect.width, height: rect.height,
          })),
        })),
      });
    });
  }));
  const receipt = { observedAt: new Date().toISOString(), lane: 'local-fixture-devtools', ...result };
  await writeFile(new URL('../../../artifacts/miniapp/panel-geometry-current.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
} finally {
  clearTimeout(timeout);
  program?.disconnect();
}
