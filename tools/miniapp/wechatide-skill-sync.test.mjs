import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { officialSkillSource, skillSnapshot, syncWechatideSkill } from './wechatide-skill-sync.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'starward-skill-sync-'));
  t.after(async () => {
    if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('starward-skill-sync-')) throw Error('unexpected cleanup path');
    await rm(root, { recursive: true });
  });
  const installation = path.join(root, 'ide'), skillsRoot = path.join(root, 'agent', 'skills');
  const source = path.join(installation, 'resources/app.asar.unpacked/wechatide-skill');
  await mkdir(source, { recursive: true });
  const publish = async version => writeFile(path.join(source, 'SKILL.md'), `---\nname: wechatide-skill\nversion: ${version}\ndescription: fixture\n---\n`);
  await publish('0.3.11');
  return { installation, skillsRoot, source, publish, destination: path.join(skillsRoot, 'wechatide-skill') };
}

test('whole package sync preserves a recoverable prior copy and removes retired files from discovery', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.source, 'retired.md'), 'prior official reference');
  const first = await syncWechatideSkill(f);
  assert.equal(first.status, 'synced');
  assert.equal(first.reloadRequired, true);
  const same = await syncWechatideSkill(f);
  assert.equal(same.status, 'current');
  assert.equal(same.backup, null);
  assert.equal(same.reloadRequired, false);
  await f.publish('0.3.12');
  await rm(path.join(f.source, 'retired.md'));
  await writeFile(path.join(f.source, 'new.md'), 'new official reference');
  const next = await syncWechatideSkill(f);
  assert.equal(await readFile(path.join(next.backup, 'retired.md'), 'utf8'), 'prior official reference');
  await assert.rejects(access(path.join(f.destination, 'retired.md')), { code: 'ENOENT' });
  assert.equal((await skillSnapshot(f.destination)).digest, (await skillSnapshot(f.source)).digest);
  const dry = await syncWechatideSkill({ ...f, apply: false });
  assert.equal(dry.status, 'current');
});

test('local instructions survive both initial adoption and later upstream updates', async t => {
  const f = await fixture(t);
  await mkdir(f.destination, { recursive: true });
  await writeFile(path.join(f.destination, 'SKILL.md'), await readFile(path.join(f.source, 'SKILL.md')));
  await writeFile(path.join(f.destination, 'local.md'), 'retain this project experience');
  await assert.rejects(syncWechatideSkill(f), /local_changes_preserved/);
  assert.equal(await readFile(path.join(f.destination, 'local.md'), 'utf8'), 'retain this project experience');
  const adopted = await syncWechatideSkill({ ...f, adoptLocalChanges: true });
  assert.equal(await readFile(path.join(adopted.backup, 'local.md'), 'utf8'), 'retain this project experience');
  await writeFile(path.join(f.destination, 'local.md'), 'new local edit');
  await f.publish('0.3.12');
  await assert.rejects(syncWechatideSkill(f), /local_changes_preserved/);
  assert.equal(await readFile(path.join(f.destination, 'local.md'), 'utf8'), 'new local edit');
});

test('same-version upstream changes sync, while an older source never downgrades the agent', async t => {
  const f = await fixture(t);
  await syncWechatideSkill(f);
  await writeFile(path.join(f.source, 'correction.md'), 'same-version official correction');
  assert.equal((await syncWechatideSkill(f)).status, 'synced');
  await f.publish('0.3.10');
  assert.equal((await syncWechatideSkill(f)).status, 'agent_ahead');
  assert.equal((await skillSnapshot(f.destination)).version, '0.3.11');
  await assert.rejects(syncWechatideSkill({ ...f, skillsRoot: path.join(f.source, 'skills') }), /destination_inside_installation/);
  await assert.rejects(syncWechatideSkill({ ...f, skillsRoot: path.join(f.installation, 'skills') }), /destination_inside_installation/);
});

test('entry-based discovery works without cwd and an alias cannot create directories inside the IDE', async t => {
  const f = await fixture(t);
  assert.equal(await officialSkillSource(undefined, async () => ({ file: path.join(f.installation, 'tool.exe'), prefix: [] })), f.source);
  const cliFolder = path.join(f.installation, 'resources/app.asar.unpacked/js/common/cli');
  await mkdir(cliFolder, { recursive: true });
  assert.equal(await officialSkillSource(undefined, async () => ({ file: process.execPath, prefix: [path.join(cliFolder, 'index.js')] })), f.source);
  const alias = path.join(path.dirname(f.installation), 'alias');
  await symlink(f.installation, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(syncWechatideSkill({ ...f, skillsRoot: path.join(alias, 'must-not-create', 'skills') }), /destination_inside_installation/);
  await assert.rejects(access(path.join(f.installation, 'must-not-create')), { code: 'ENOENT' });
  await rm(alias);
});
