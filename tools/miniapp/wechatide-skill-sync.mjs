import { access, cp, lstat, mkdir, readFile, readdir, realpath, rename, rmdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveOfficialCli } from './device-feedback-official.mjs';

const name = 'wechatide-skill';
const fail = code => { throw new Error(`wechatide_skill_sync_${code}`); };
const exists = value => access(value).then(() => true, error => {
  if (error.code === 'ENOENT') return false;
  throw error;
});
const within = (parent, child) => {
  const relative = path.relative(parent, child);
  return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

export async function officialSkillSource(installation, resolveCli = resolveOfficialCli) {
  const invocation = installation ? null : await resolveCli();
  const entry = invocation?.prefix?.[0] ?? invocation?.file;
  let root = await realpath(installation ?? invocation?.cwd ?? path.dirname(entry));
  for (;;) {
    for (const suffix of ['resources/app.asar.unpacked', 'Contents/Resources/app.asar.unpacked']) {
      const candidate = path.join(root, suffix, name);
      if (await exists(path.join(candidate, 'SKILL.md'))) return realpath(candidate);
    }
    if (installation || path.dirname(root) === root) break;
    root = path.dirname(root);
  }
  fail('official_package_missing');
}

// Resolve existing ancestors before creating a new tail, including Windows junctions.
async function futurePhysicalPath(directory) {
  let ancestor = path.resolve(directory);
  while (!await exists(ancestor)) {
    if (path.dirname(ancestor) === ancestor) fail('path_ancestor_unavailable');
    ancestor = path.dirname(ancestor);
  }
  return path.resolve(await realpath(ancestor), path.relative(ancestor, directory));
}

export async function agentSkillsRoot(explicit, environment = process.env) {
  if (explicit) {
    if (!path.isAbsolute(explicit)) fail('absolute_skills_root_required');
    return explicit;
  }
  const codexRoot = path.join(environment.CODEX_HOME || path.join(os.homedir(), '.codex'), 'skills');
  const agentsRoot = path.join(os.homedir(), '.agents', 'skills');
  const existing = [];
  for (const root of [codexRoot, agentsRoot]) if (await exists(path.join(root, name))) existing.push(root);
  if (existing.length > 1) fail('multiple_agent_copies_choose_skills_root');
  return existing[0] ?? codexRoot;
}

// Hash relative names and bytes, never credentials or IDE user-data directories.
export async function skillSnapshot(directory) {
  if ((await lstat(directory)).isSymbolicLink()) fail('linked_package_not_managed');
  const files = {};
  async function walk(relative = '') {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const key = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) fail('linked_package_entry');
      if (entry.isDirectory()) await walk(key);
      else if (entry.isFile()) files[key] = createHash('sha256').update(await readFile(path.join(directory, key))).digest('hex');
      else fail('unsupported_package_entry');
    }
  }
  await walk();
  const text = await readFile(path.join(directory, 'SKILL.md'), 'utf8');
  if (!/^name:\s*["']?wechatide-skill["']?\s*$/mu.test(text)) fail('unexpected_skill_identity');
  const version = text.match(/^version:\s*["']?(\d+\.\d+\.\d+)["']?\s*$/mu)?.[1];
  if (!version) fail('version_missing');
  return { version, files, digest: createHash('sha256').update(JSON.stringify(files)).digest('hex') };
}

function compareVersions(a, b) {
  const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
}

export async function syncWechatideSkill({ installation, skillsRoot, apply = true, adoptLocalChanges = false } = {}) {
  const source = await officialSkillSource(installation);
  const installationRoot = path.resolve(source,
    source.endsWith(path.join('Contents', 'Resources', 'app.asar.unpacked', name)) ? '../../../..' : '../../..');
  const selectedRoot = await futurePhysicalPath(await agentSkillsRoot(skillsRoot));
  if (within(installationRoot, path.resolve(selectedRoot))) fail('destination_inside_installation');
  if (!apply && !await exists(selectedRoot)) {
    const upstream = await skillSnapshot(source);
    return { status: 'install_available', source, destination: path.join(selectedRoot, name), version: upstream.version };
  }
  await mkdir(selectedRoot, { recursive: true });
  const root = await realpath(selectedRoot), destination = path.join(root, name);
  if (within(installationRoot, root)) fail('destination_inside_installation');
  if (within(source, destination) || within(destination, source)) fail('overlapping_source_destination');
  const stateRoot = path.join(path.dirname(root), 'skill-sync', name);
  if (await futurePhysicalPath(stateRoot) !== stateRoot) fail('state_must_be_physical');
  await mkdir(stateRoot, { recursive: true });
  if (await realpath(stateRoot) !== stateRoot) fail('state_must_be_physical');
  const lock = path.join(stateRoot, 'lock');
  try { await mkdir(lock); } catch (error) { if (error.code === 'EEXIST') fail('busy_or_interrupted_lock'); throw error; }
  try {
    const upstream = await skillSnapshot(source);
    const current = await exists(destination) ? await skillSnapshot(destination) : null;
    const stateFile = path.join(stateRoot, 'current.json');
    const state = await exists(stateFile) ? JSON.parse(await readFile(stateFile, 'utf8')) : null;
    const base = { source, destination, version: upstream.version, digest: upstream.digest };
    const changedFiles = current ? [...new Set([...Object.keys(current.files), ...Object.keys(upstream.files)])]
      .filter(file => current.files[file] !== upstream.files[file]) : Object.keys(upstream.files);
    if (current && compareVersions(current.version, upstream.version) > 0)
      return { ...base, status: 'agent_ahead', agentVersion: current.version, changedFiles, reloadRequired: false };
    if (current?.digest !== upstream.digest && current && current.digest !== state?.digest && !adoptLocalChanges)
      fail('local_changes_preserved_use_explicit_adoption_after_migration');
    if (!apply) return { ...base, status: changedFiles.length ? 'update_available' : 'current', changedFiles, reloadRequired: false };
    let backup = null;
    if (current?.digest !== upstream.digest) {
      const id = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomUUID()}`;
      const staging = path.join(stateRoot, `incoming-${id}`);
      await cp(source, staging, { recursive: true, errorOnExist: true, force: false });
      if ((await skillSnapshot(staging)).digest !== upstream.digest || (await skillSnapshot(source)).digest !== upstream.digest)
        fail('source_changed_during_copy_staging_preserved');
      if (current) {
        if ((await skillSnapshot(destination)).digest !== current.digest) fail('agent_changed_during_copy');
        backup = path.join(stateRoot, `backup-${id}`);
        // Both exact paths are derived from the canonical skills/state roots. No deletion.
        await rename(destination, backup);
      }
      try { await rename(staging, destination); }
      catch (error) { if (backup) await rename(backup, destination); throw error; }
    }
    if (state?.digest !== upstream.digest || state?.source !== source) {
      const temporary = path.join(stateRoot, `state-${randomUUID()}.json`);
      await writeFile(temporary, JSON.stringify({ source, destination, version: upstream.version, digest: upstream.digest,
        syncedAt: new Date().toISOString(), backup }, null, 2), { flag: 'wx' });
      await rename(temporary, stateFile);
    }
    return { ...base, status: changedFiles.length ? 'synced' : 'current', changedFiles, backup,
      reloadRequired: changedFiles.length > 0 };
  } finally { await rmdir(lock); }
}

export async function skillSyncCli(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--check') options.apply = false;
    else if (flag === '--adopt-local-changes') options.adoptLocalChanges = true;
    else if (['--official-ide', '--skills-root'].includes(flag) && argv[i + 1] && !argv[i + 1].startsWith('--'))
      options[flag === '--official-ide' ? 'installation' : 'skillsRoot'] = argv[++i];
    else fail('invalid_option');
  }
  return syncWechatideSkill(options);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  skillSyncCli(process.argv.slice(2)).then(result => process.stdout.write(`${JSON.stringify(result)}\n`), error => {
    process.stderr.write(`${error.message.startsWith('wechatide_skill_sync_') ? error.message : 'wechatide_skill_sync_failed_no_raw_output'}\n`);
    process.exitCode = 1;
  });
}
