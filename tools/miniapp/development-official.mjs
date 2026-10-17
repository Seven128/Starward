import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, realpath, access, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { redactDevelopmentValue } from './development-redaction.mjs';
import { syncWechatideSkill } from './wechatide-skill-sync.mjs';

const exec = promisify(execFile);
const fail = code => { throw new Error(`development_observer_official_${code}`); };

export function decodeOfficial(stdout) {
  let envelope;
  try { envelope = JSON.parse(stdout); } catch { fail('invalid_response'); }
  const wrapped = envelope?.result ?? envelope?.data;
  const value = wrapped?.structuredContent ?? wrapped;
  if (envelope?.ok !== true || value?.success === false || value === undefined) fail('tool_failed');
  return value;
}

// Do not emit request/response headers, bodies, URL queries or unparseable lines.
export function networkSummary(value) {
  if (typeof value !== 'string') fail('invalid_network_response');
  const lines = value.split(/\r?\n/u).filter(Boolean);
  const events = [];
  for (const line of lines.slice(0, 80)) {
    try {
      const event = JSON.parse(line), detail = event.detail;
      if (!['HTTP_REQUEST', 'HTTP_RESPONSE'].includes(event.type) || !detail) continue;
      const url = new URL(detail.url);
      events.push({ type: event.type, method: String(detail.method).slice(0, 12),
        url: redactDevelopmentValue(`${url.origin}${url.pathname}`),
        ...(Number.isInteger(detail.status) ? { status: detail.status } : {}) });
    } catch { /* Raw failed parsing must never bypass redaction. */ }
  }
  return { events, matchedLines: lines.length, truncated: lines.length > 80 };
}

export async function officialObserverCli(argv, dependencies = {}) {
  const command = argv[0], values = new Map();
  const commands = ['status', 'text', 'wxml', 'style', 'size', 'offset', 'tap', 'input', 'console', 'network', 'screenshot'];
  if (![...commands, 'batch'].includes(command)) fail('unknown_command');
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!['--official-ide', '--project', '--selector', '--value', '--filter', '--expected-page', '--output', '--name', '--steps-file'].includes(key)
      || typeof value !== 'string' || values.has(key)) fail('invalid_option');
    values.set(key, value);
  }
  const installation = values.get('--official-ide'), project = values.get('--project');
  if (!path.isAbsolute(installation ?? '') || !path.isAbsolute(project ?? '')) fail('absolute_paths_required');
  const root = await realpath(installation), projectPath = await realpath(project);
  const configPath = path.join(projectPath, 'project.config.json');
  const originalConfig = await readFile(configPath, 'utf8');
  if (JSON.parse(originalConfig).compileType !== 'miniprogram') fail('miniprogram_required');
  let requests = [{ command, values }];
  if (command === 'batch') {
    const file = values.get('--steps-file');
    if (!path.isAbsolute(file ?? '') || (await stat(file)).size > 64 * 1024) fail('bounded_steps_file_required');
    const steps = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(steps) || steps.length < 1 || steps.length > 12) fail('bounded_steps_required');
    const keys = { selector: '--selector', value: '--value', filter: '--filter', expectedPage: '--expected-page', output: '--output', name: '--name' };
    requests = steps.map(step => {
      if (!step || !commands.includes(step.command) || Object.keys(step).some(key => key !== 'command' && !Object.hasOwn(keys, key))) fail('invalid_step');
      const options = new Map();
      for (const [key, value] of Object.entries(step)) {
        if (key !== 'command') { if (typeof value !== 'string') fail('invalid_step'); options.set(keys[key], value); }
      }
      return { command: step.command, values: options };
    });
  } else if (values.has('--steps-file')) fail('unexpected_steps_file');
  // A real CLI invocation synchronizes once. Test transports never modify user skills.
  const skillSync = dependencies.run ? null : await syncWechatideSkill({ installation: root });
  if (skillSync?.reloadRequired) return { scope: 'development_observation', status: 'skill_reload_required', skillSync };
  const skill = await readFile(path.join(root, 'resources/app.asar.unpacked/wechatide-skill/SKILL.md'), 'utf8');
  const version = skill.match(/^version:\s*["']?([0-9.]+)/mu)?.[1];
  if (!version) fail('skill_version_missing');
  const executable = path.join(root, '微信开发者工具.exe');
  const entry = path.join(root, 'resources/app.asar.unpacked/js/common/cli/skill-index.js');
  await access(executable); await access(entry);
  const run = dependencies.run ?? (async args => {
    const bootstrap = "const e=process.argv[1],a=process.argv.slice(2);process.argv=[process.execPath,e,'--electron'].concat(a);require(e)";
    try {
      const result = await exec(executable, ['-e', bootstrap, entry, '-c', 'Codex', ...args], {
        cwd: root, windowsHide: true, timeout: 40000, maxBuffer: 1024 * 1024,
        env: { ...process.env, cwd: process.cwd(), ELECTRON: executable, ELECTRON_RUN_AS_NODE: '1' },
      });
      return decodeOfficial(result.stdout);
    } catch (error) {
      if (/^development_observer_official_/u.test(error?.message ?? '')) throw error;
      // exec errors contain raw stdout/stderr; do not forward them or replay actions.
      fail(error?.killed ? 'timeout_no_replay' : 'command_failed_no_replay');
    }
  });
  const readiness = await run(['check_wechatide_status', '--skill-version', version]);
  if (readiness.loginExpired !== false || (readiness.cliTokenRequired ?? readiness.tokenRequired) !== false
    || !['equal', 'agent_ahead'].includes(readiness.versionRelation)) fail('readiness_required');
  async function observe({ command, values }) {
    if (await readFile(configPath, 'utf8') !== originalConfig) fail('project_changed');
    if (command === 'status') return { scope: 'development_observation', ready: true, skillVersion: version };
    const args = ['--project', projectPath];
    const expected = values.get('--expected-page');
    let pageId;
    const assertPage = async () => {
      if (!expected || !/^[a-zA-Z0-9_/-]+$/u.test(expected)) fail('expected_page_required');
      if (await readFile(configPath, 'utf8') !== originalConfig) fail('project_changed');
      const result = await run(['automation_runtime_info', ...args, '--action', 'currentPage']);
      if (result.currentPage?.path !== expected) fail('page_mismatch');
      if (pageId !== undefined && result.currentPage.pageId !== pageId) fail('page_instance_changed');
      pageId = result.currentPage.pageId;
    };
    if (['console', 'network'].includes(command)) {
      const filter = values.get('--filter');
      if (!filter || !/^[a-zA-Z0-9_][a-zA-Z0-9_:/-]{0,119}$/u.test(filter)) fail('bounded_filter_required');
      const value = await run([`get_simulator_${command}`, ...args, '--command', `grep -i ${filter}`]);
      return { scope: 'development_observation', ...(command === 'network' ? networkSummary(value)
        : { lines: String(value).split(/\r?\n/u).filter(Boolean).slice(0, 40).map(line => redactDevelopmentValue(line)) }) };
    }
    await assertPage();
    if (command === 'screenshot') {
      const output = values.get('--output');
      if (!path.isAbsolute(output ?? '') || !/\.jpg$/iu.test(output)) fail('absolute_jpg_required');
      try { await access(output); fail('output_exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      // Let the official tool own its temporary file; publish exclusively after verification.
      const result = await run(['simulator_screenshot', ...args]);
      if (!path.isAbsolute(result.path ?? '') || !Number.isInteger(result.imageWidth) || result.imageWidth < 1
        || !Number.isInteger(result.imageHeight) || result.imageHeight < 1) fail('invalid_screenshot');
      const metadata = await stat(result.path);
      if (!metadata.isFile() || metadata.size > 16 * 1024 * 1024) fail('invalid_screenshot');
      const bytes = await readFile(result.path);
      if (!bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
        || !bytes.subarray(-2).equals(Buffer.from([255, 217]))) fail('invalid_screenshot');
      await assertPage();
      await writeFile(output, bytes, { flag: 'wx', mode: 0o600 });
      return { scope: 'development_observation', path: output, imageWidth: result.imageWidth, imageHeight: result.imageHeight };
    }
    const selector = values.get('--selector');
    if (!selector || selector.length > 240 || !/^[.#[]/u.test(selector) || /[\r\n]/u.test(selector)) fail('stable_selector_required');
    const actionArgs = ['automation_element_action', ...args, '--action', command === 'wxml' ? 'outerWxml' : command, '--selector', selector];
    if (command === 'style') {
      const name = values.get('--name');
      if (!name || !/^[a-z][a-z-]{0,79}$/u.test(name)) fail('style_name_required');
      actionArgs.push('--name', name);
    }
    if (command === 'input') {
      const value = values.get('--value');
      if (value === undefined || value.length > 2000) fail('input_value_required');
      actionArgs.push('--value', value);
    }
    const matches = await run(['automation_page_action', ...args, '--action', 'querySelectorAll', '--selector', selector]);
    if (!Array.isArray(matches.elements) || matches.elements.length !== 1) fail('unique_element_required');
    await assertPage();
    const result = await run(actionArgs);
    if (!['tap', 'input'].includes(command)) await assertPage();
    return { scope: 'development_observation', action: command, value: redactDevelopmentValue(result) };
  }
  if (command !== 'batch') return observe(requests[0]);
  const completed = [];
  for (let i = 0; i < requests.length; i++) {
    try { completed.push(await observe(requests[i])); }
    catch (error) {
      return { scope: 'development_observation', success: false, completed, failedStep: i,
        error: /^development_observer_official_[a-z_]+$/u.test(error.message) ? error.message : 'step_failed_no_replay' };
    }
  }
  return { scope: 'development_observation', success: true, completed };
}
