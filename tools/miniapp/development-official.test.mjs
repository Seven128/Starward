import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeOfficial, networkSummary, officialObserverCli } from './development-official.mjs';
import { mkdtemp, mkdir, writeFile, rm, readFile, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('official envelopes preserve primitive results and reject business failure', () => {
  for (const result of [0, '', false]) assert.equal(decodeOfficial(JSON.stringify({ ok: true, result })), result);
  assert.deepEqual(decodeOfficial(JSON.stringify({ ok: true, result: { structuredContent: { success: true } } })), { success: true });
  for (const input of ['not json', '{"ok":false,"result":0}', '{"ok":true,"result":{"success":false}}', '{"ok":true}']) {
    assert.throws(() => decodeOfficial(input), /development_observer_official_/);
  }
});

test('official failure codes survive without leaking messages or treating MCP errors as success', () => {
  assert.throws(() => decodeOfficial(JSON.stringify({ ok: false, errorType: 'MCP_TOOL_ERROR',
    message: 'private credential', detail: { token: 'secret' } })),
  { message: 'development_observer_official_MCP_TOOL_ERROR' });
  for (const result of [{ isError: true, content: [] }, { success: false }]) {
    assert.throws(() => decodeOfficial(JSON.stringify({ ok: true, result })), /tool_failed/);
  }
  assert.throws(() => decodeOfficial(JSON.stringify({ ok: false, errorType: 'private secret' })),
    { message: 'development_observer_official_tool_failed' });
});

test('network summaries omit credentials, query, headers, bodies and malformed lines', () => {
  const line = JSON.stringify({ type: 'HTTP_RESPONSE', detail: { method: 'GET',
    url: 'https://user:pass@example.com/api?token=private#fragment', status: 200,
    headers: { Authorization: 'Bearer confidential' }, data: { phone: 'secret-body' } } });
  const result = networkSummary(`${line}\nmalformed confidential\n`);
  assert.deepEqual(result.events, [{ type: 'HTTP_RESPONSE', method: 'GET', url: 'https://example.com/api', status: 200 }]);
  assert.equal(result.matchedLines, 2);
  assert.doesNotMatch(JSON.stringify(result), /private|pass|confidential|secret-body|Authorization/);
  assert.equal(networkSummary(Array(100).fill(line).join('\n')).events.length, 80);
  assert.equal(networkSummary(Array(100).fill(line).join('\n')).truncated, true);
});

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'starward-official-test-'));
  t.after(async () => { if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('starward-official-test-')) throw Error('unexpected cleanup path'); await rm(root, { recursive: true }); });
  for (const folder of ['resources/app.asar.unpacked/wechatide-skill', 'resources/app.asar.unpacked/js/common/cli']) await mkdir(path.join(root, folder), { recursive: true });
  await writeFile(path.join(root, 'resources/app.asar.unpacked/wechatide-skill/SKILL.md'), 'version: 0.3.9\n');
  await writeFile(path.join(root, 'resources/app.asar.unpacked/js/common/cli/skill-index.js'), '');
  await writeFile(path.join(root, '微信开发者工具.exe'), '');
  await writeFile(path.join(root, 'project.config.json'), JSON.stringify({ compileType: 'miniprogram' }));
  const args = ['--official-ide', root, '--project', root, '--expected-page', 'pages/index/index'];
  return { root, args };
}

test('CLI readiness uses CLI authorization, independently of MCP authorization', async t => {
  const { args } = await fixture(t);
  for (const fields of [{ cliTokenRequired: false, mcpTokenRequired: true }, { tokenRequired: false }, {}]) {
    const result = await officialObserverCli(['status', ...args], {
      run: async () => ({ loginExpired: false, versionRelation: 'equal', ...fields }),
    });
    assert.equal(result.ready, true);
  }
  for (const fields of [{ cliTokenRequired: true, tokenRequired: false }, { tokenRequired: true },
    { loginExpired: true }, { versionRelation: 'tool_ahead' }]) {
    await assert.rejects(officialObserverCli(['status', ...args], {
      run: async () => ({ loginExpired: false, versionRelation: 'equal', ...fields }),
    }), /readiness_required/);
  }
});

test('nonzero process exits retain only public tool codes; timeouts never replay', async t => {
  const { args } = await fixture(t);
  for (const [error, expected] of [
    [{ stdout: JSON.stringify({ ok: false, errorType: 'MCP_TOOL_ERROR', message: 'secret' }) }, 'MCP_TOOL_ERROR'],
    [{ stdout: 'secret', stderr: 'private' }, 'command_failed_no_replay'],
    [{ killed: true, stdout: 'secret' }, 'timeout_no_replay'],
  ]) {
    let calls = 0;
    await assert.rejects(officialObserverCli(['status', ...args], {
      exec: async () => { calls++; throw error; },
    }), { message: `development_observer_official_${expected}` });
    assert.equal(calls, 1);
  }
});

test('PNG capture requests original pixels and publishes only matching current-page bytes', async t => {
  const { root, args } = await fixture(t);
  const { PNG } = await import('pngjs');
  const png = PNG.sync.write(new PNG({ width: 3, height: 2 }));
  const temporary = path.join(root, 'temporary.png');
  await writeFile(temporary, png);
  const calls = [];
  let imageWidth = 3, drift = false, pages = 0;
  const run = async ([tool, ...flags]) => {
    calls.push([tool, ...flags]);
    if (tool === 'check_wechatide_status') return { loginExpired: false, tokenRequired: false, versionRelation: 'equal' };
    if (tool === 'automation_runtime_info') return { currentPage: { path: 'pages/index/index', pageId: drift ? ++pages : 1 } };
    return { path: temporary, imageWidth, imageHeight: 2 };
  };
  const output = path.join(root, 'output.png');
  const aliasArgs = args.map(value => value === root ? root.replaceAll('\\', '/') : value);
  const result = await officialObserverCli(['screenshot', ...aliasArgs, '--output', output], { run });
  assert.deepEqual(await readFile(output), png);
  assert.equal(result.imageWidth, 3);
  const capture = calls.find(([tool]) => tool === 'simulator_screenshot');
  assert.equal(capture[capture.indexOf('--optimize') + 1], 'false');
  assert.equal(capture[capture.indexOf('--project') + 1], await realpath(root));
  imageWidth = 4;
  await assert.rejects(officialObserverCli(['screenshot', ...args, '--output', path.join(root, 'wrong-size.png')], { run }), /invalid_screenshot/);
  imageWidth = 3; drift = true;
  await assert.rejects(officialObserverCli(['screenshot', ...args, '--output', path.join(root, 'drift.png')], { run }), /page_instance_changed/);
  await assert.rejects(readFile(path.join(root, 'drift.png')), { code: 'ENOENT' });
  await assert.rejects(officialObserverCli(['screenshot', ...args, '--output', output], { run }), /output_exists/);
});

test('ambiguous targets, page drift and action errors never replay a mutation', async t => {
  const { args } = await fixture(t);
  for (const mode of ['ambiguous', 'page-drift', 'action-error']) {
    let pages = 0, actions = 0;
    const run = async ([tool]) => {
      if (tool === 'check_wechatide_status') return { loginExpired: false, tokenRequired: false, versionRelation: 'equal' };
      if (tool === 'automation_runtime_info') return { currentPage: { path: 'pages/index/index', pageId: mode === 'page-drift' ? ++pages : 1 } };
      if (tool === 'automation_page_action') return { elements: mode === 'ambiguous' ? [{}, {}] : [{}] };
      actions++; throw Error('action failed');
    };
    await assert.rejects(officialObserverCli(['tap', ...args, '--selector', '#button'], { run }));
    assert.equal(actions, mode === 'action-error' ? 1 : 0);
  }
});

test('screenshot checks actual bytes and never overwrites an existing output', async t => {
  const { root, args } = await fixture(t), output = path.join(root, 'output.jpg'), temporary = path.join(root, 'temporary.jpg');
  await writeFile(temporary, 'not jpeg');
  const run = async ([tool]) => tool === 'check_wechatide_status'
    ? { loginExpired: false, tokenRequired: false, versionRelation: 'equal' }
    : tool === 'automation_runtime_info' ? { currentPage: { path: 'pages/index/index', pageId: 1 } }
    : { path: temporary, imageWidth: 1, imageHeight: 1 };
  await assert.rejects(officialObserverCli(['screenshot', ...args, '--output', output], { run }), /invalid_screenshot/);
  await writeFile(output, 'preserve');
  await assert.rejects(officialObserverCli(['screenshot', ...args, '--output', output], { run }), /output_exists/);
  assert.equal(await readFile(output, 'utf8'), 'preserve');
});
