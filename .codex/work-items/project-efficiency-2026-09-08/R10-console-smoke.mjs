import { readFile, writeFile } from 'node:fs/promises';
import { startDevelopmentAutomation } from '../../../tools/miniapp/development-automation.mjs';
import { createBoundDevelopmentObserver } from '../../../tools/miniapp/development-observer.mjs';
import { boundedWechatConnect, boundWechatProtocol } from '../../../tools/miniapp/wechat-protocol.mjs';
import automator from 'miniprogram-automator';
const { project } = JSON.parse(await readFile(new URL('R25-native-fixture.json', import.meta.url), 'utf8'));
const launch = await startDevelopmentAutomation(project, 19421);
let program, observer;
try {
  program = await boundedWechatConnect(() => automator.connect({ wsEndpoint: 'ws://127.0.0.1:19421' }), 6000);
  boundWechatProtocol(program, 6000);
  observer = await createBoundDevelopmentObserver(program, { projectPath: project, port: 19421 });
  await observer.enableConsole();
  await program.evaluate(function () { console.info('starward-task-console-probe token=fixture-private-value'); });
  const until = Date.now() + 3000;
  while (Date.now() < until && !JSON.stringify(observer.console()).includes('starward-task-console-probe')) await new Promise(resolve => setTimeout(resolve, 50));
  const logs = observer.console();
  const passed = JSON.stringify(logs).includes('starward-task-console-probe') && !JSON.stringify(logs).includes('fixture-private-value');
  const result = { scope: 'isolated_native_console_transport', passed, events: logs.length, logs };
  await writeFile(new URL('R10-console-smoke.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (!passed) process.exitCode = 1;
} catch (error) {
  const result = { scope: 'isolated_native_console_transport', passed: false, error: String(error.message).slice(0, 200) };
  await writeFile(new URL('R10-console-smoke.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result)); process.exitCode = 1;
} finally { observer?.disconnect(); if (!observer) program?.disconnect(); await launch.cleanup(); }
