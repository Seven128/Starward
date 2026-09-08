import { readFile, writeFile } from 'node:fs/promises';
import { startDevelopmentAutomation } from '../../../tools/miniapp/development-automation.mjs';
import { connectDevelopmentObserver } from '../../../tools/miniapp/development-observer.mjs';
const { project } = JSON.parse(await readFile(new URL('R25-native-fixture.json', import.meta.url), 'utf8'));
let launch, observer, stage = 'launch';
try {
  launch = await startDevelopmentAutomation(project, 19424);
  stage = 'connect';
  observer = await connectDevelopmentObserver({ projectPath: project, automationPort: 19424, timeoutMs: 8000 });
  stage = 'waitFor_native_layout'; const start = Date.now();
  const result = await observer.waitFor({ selector: '#native-probe', read: 'layout', minimumWidth: 1, minimumHeight: 1,
    expectedPage: 'pages/index/index', timeoutMs: 15000 });
  const evidence = { passed: true, scope: 'isolated_native_geometry_condition_only', elapsedMs: Date.now() - start, result };
  await writeFile(new URL('R10-layout-wait-smoke.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} catch (error) {
  const evidence = { passed: false, stage, error: error.message, diagnostic: error.diagnostic };
  await writeFile(new URL('R10-layout-wait-smoke.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence)); process.exitCode = 1;
} finally { observer?.disconnect(); await launch?.cleanup(); }
