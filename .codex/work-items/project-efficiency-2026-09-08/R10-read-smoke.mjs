import { readFile, writeFile } from 'node:fs/promises';
import { startDevelopmentAutomation } from '../../../tools/miniapp/development-automation.mjs';
import { connectDevelopmentObserver } from '../../../tools/miniapp/development-observer.mjs';
const { project } = JSON.parse(await readFile(new URL('R25-native-fixture.json', import.meta.url), 'utf8'));
let launch, observer, status, stage = 'launch';
try {
  launch = await startDevelopmentAutomation(project, 19423);
  stage = 'connect'; const started = Date.now();
  observer = await connectDevelopmentObserver({ projectPath: project, automationPort: 19423, timeoutMs: 8000 });
  const attachMs = Date.now() - started;
  stage = 'status'; status = await observer.status();
  console.log(JSON.stringify({ stage, status }));
  if (status.path === null) {
    stage = 'explicit_fixture_navigation'; await observer.navigateTo('/pages/index/index');
  }
  stage = 'layout'; const before = Date.now();
  const layout = await observer.layout(['#native-probe'], { expectedPage: 'pages/index/index' });
  const layoutMs = Date.now() - before;
  stage = 'screenshot';
  const screenshot = await observer.screenshot(new URL('R10-read-smoke.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), { expectedPage: 'pages/index/index' });
  const result = { passed: true, scope: 'isolated_native_fixture_without_console_subscription', attachMs, status, layoutMs, layout, screenshot };
  await writeFile(new URL('R10-read-smoke.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  const result = { passed: false, stage, status, error: error.message, diagnostic: error.diagnostic };
  await writeFile(new URL('R10-read-smoke.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result)); process.exitCode = 1;
} finally { observer?.disconnect(); await launch?.cleanup(); }
