import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, realpath, access, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { redactDevelopmentValue } from './development-redaction.mjs';

const exec = promisify(execFile);
const fail = code => { throw new Error(`development_observer_official_${code}`); };
const publicErrorCodes = new Set(['MCP_TOOL_ERROR', 'MCP_INIT_ERROR', 'PROJECT_PATH_NOT_FOUND',
  'PROJECT_CONFIG_JSON_ERROR', 'APPID_ERROR', 'cli_token_required', 'mcp_token_required']);

export function decodeOfficial(stdout) {
  let envelope;
  try { envelope = JSON.parse(stdout); } catch { fail('invalid_response'); }
  const wrapped = envelope?.result ?? envelope?.data;
  const value = wrapped?.structuredContent ?? wrapped;
  if (envelope?.ok !== true || wrapped?.isError === true || value?.success === false || value === undefined) {
    fail(publicErrorCodes.has(envelope?.errorType) ? envelope.errorType : 'tool_failed');
  }
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
  if (!['status', 'text', 'tap', 'input', 'console', 'network', 'screenshot'].includes(command)) fail('unknown_command');
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!['--official-ide', '--project', '--selector', '--value', '--filter', '--expected-page', '--output'].includes(key)
      || typeof value !== 'string' || values.has(key)) fail('invalid_option');
    values.set(key, value);
  }
  const installation = values.get('--official-ide'), project = values.get('--project');
  if (!path.isAbsolute(installation ?? '') || !path.isAbsolute(project ?? '')) fail('absolute_paths_required');
  const root = await realpath(installation), projectPath = await realpath(project);
  const configPath = path.join(projectPath, 'project.config.json');
  const originalConfig = await readFile(configPath, 'utf8');
  if (JSON.parse(originalConfig).compileType !== 'miniprogram') fail('miniprogram_required');
  const skill = await readFile(path.join(root, 'resources/app.asar.unpacked/wechatide-skill/SKILL.md'), 'utf8');
  const version = skill.match(/^version:\s*["']?([0-9.]+)/mu)?.[1];
  if (!version) fail('skill_version_missing');
  const executable = path.join(root, '微信开发者工具.exe');
  const entry = path.join(root, 'resources/app.asar.unpacked/js/common/cli/skill-index.js');
  await access(executable); await access(entry);
  const run = dependencies.run ?? (async args => {
    const bootstrap = "const e=process.argv[1],a=process.argv.slice(2);process.argv=[process.execPath,e,'--electron'].concat(a);require(e)";
    try {
      const result = await (dependencies.exec ?? exec)(executable, ['-e', bootstrap, entry, '-c', 'Codex', ...args], {
        cwd: root, windowsHide: true, timeout: 40000, maxBuffer: 1024 * 1024,
        env: { ...process.env, cwd: process.cwd(), ELECTRON: executable, ELECTRON_RUN_AS_NODE: '1' },
      });
      return decodeOfficial(result.stdout);
    } catch (error) {
      if (/^development_observer_official_/u.test(error?.message ?? '')) throw error;
      // Nonzero exits can still carry a structured tool failure. Preserve only
      // its public classification, never raw stdout/stderr, messages or secrets.
      if (!error?.killed && error?.stdout) {
        let envelope;
        try { envelope = JSON.parse(error.stdout); } catch { /* no structured failure */ }
        if (envelope?.ok === false) fail(publicErrorCodes.has(envelope.errorType) ? envelope.errorType : 'tool_failed');
      }
      fail(error?.killed ? 'timeout_no_replay' : 'command_failed_no_replay');
    }
  });
  const readiness = await run(['check_wechatide_status', '--skill-version', version]);
  if (readiness.loginExpired !== false || readiness.cliTokenRequired === true || readiness.tokenRequired === true
    || !['equal', 'agent_ahead'].includes(readiness.versionRelation)) fail('readiness_required');
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
    if (!path.isAbsolute(output ?? '') || !/\.(png|jpg)$/iu.test(output)) fail('absolute_image_required');
    const originalPixels = /\.png$/iu.test(output);
    try { await access(output); fail('output_exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    // Let the official tool own its temporary file; publish exclusively after verification.
    const result = await run(['simulator_screenshot', ...args, '--optimize', String(!originalPixels)]);
    if (!path.isAbsolute(result.path ?? '') || !Number.isInteger(result.imageWidth) || result.imageWidth < 1
      || !Number.isInteger(result.imageHeight) || result.imageHeight < 1) fail('invalid_screenshot');
    const metadata = await stat(result.path);
    if (!metadata.isFile() || metadata.size > 16 * 1024 * 1024) fail('invalid_screenshot');
    const bytes = await readFile(result.path);
    if (originalPixels) {
      if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        || bytes.toString('ascii', 12, 16) !== 'IHDR'
        || bytes.readUInt32BE(16) !== result.imageWidth || bytes.readUInt32BE(20) !== result.imageHeight
        || !bytes.subarray(-12).equals(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]))) fail('invalid_screenshot');
    } else if (!bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      || !bytes.subarray(-2).equals(Buffer.from([255, 217]))) fail('invalid_screenshot');
    await assertPage();
    await writeFile(output, bytes, { flag: 'wx', mode: 0o600 });
    return { scope: 'development_observation', path: output, imageWidth: result.imageWidth, imageHeight: result.imageHeight };
  }
  const selector = values.get('--selector');
  if (!selector || selector.length > 240 || !/^[.#[]/u.test(selector) || /[\r\n]/u.test(selector)) fail('stable_selector_required');
  const actionArgs = ['automation_element_action', ...args, '--action', command, '--selector', selector];
  if (command === 'input') {
    const value = values.get('--value');
    if (value === undefined || value.length > 2000) fail('input_value_required');
    actionArgs.push('--value', value);
  }
  const matches = await run(['automation_page_action', ...args, '--action', 'querySelectorAll', '--selector', selector]);
  if (!Array.isArray(matches.elements) || matches.elements.length !== 1) fail('unique_element_required');
  await assertPage();
  const result = await run(actionArgs);
  if (command === 'text') await assertPage();
  return { scope: 'development_observation', action: command, value: redactDevelopmentValue(result) };
}
