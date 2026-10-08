import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const policy = JSON.parse(fs.readFileSync(new URL('./lfs-policy.json', import.meta.url), 'utf8'));
const marker = '# Starward managed resource LFS rules';
const pointerPrefix = 'version https://git-lfs.github.com/spec/v1';

export function resourcePatterns(profile = 'all') {
  if (profile !== 'all' && !Object.hasOwn(policy.profiles, profile)) throw Error('Unknown resource profile');
  return profile === 'all' ? Object.values(policy.profiles).flat() : policy.profiles[profile];
}

export function attributesBlock() {
  return [marker, ...resourcePatterns().map(p => `${p} filter=lfs diff=lfs merge=lfs -text`),
    '# Current authored text remains reviewable; old immutable publications use LFS.',
    ...policy.ordinaryGit.map(p => `${p} !filter !diff !merge -text`), '# End Starward managed resource LFS rules', ''].join('\n');
}

function git(cwd, args) {
  return execFileSync('git', args, {cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
}

function selectedFiles(cwd, profile) {
  const patterns = resourcePatterns(profile);
  const names = new Set();
  for (const pattern of patterns) for (const p of fs.globSync(pattern, {cwd})) names.add(p.replaceAll('\\', '/'));
  // Index entries also expose missing files, unlike a filesystem-only walk.
  if (fs.existsSync(path.join(cwd, '.git'))) {
    for (const p of git(cwd, ['ls-files', '-z', '--', ...patterns]).split('\0').filter(Boolean)) names.add(p);
  }
  for (const p of policy.ordinaryGit) names.delete(p);
  return [...names].sort();
}

function verifyPolicy(cwd) {
  const attributes = fs.readFileSync(path.join(cwd, '.gitattributes'), 'utf8').replaceAll('\r\n', '\n');
  if (!attributes.endsWith(attributesBlock())) throw Error('LFS policy and .gitattributes differ; run assets:rules');
}

export function verifyResources(cwd = root, profile = 'all') {
  verifyPolicy(cwd);
  const names = selectedFiles(cwd, profile);
  if (!names.length) throw Error('No resources found for selected profile');
  const errors = [];
  let bytes = 0;
  for (const name of names) {
    let fd;
    try {
      const full = path.join(cwd, name);
      if (!fs.statSync(full).isFile()) throw Error('not a regular resource');
      fd = fs.openSync(full, 'r');
      const header = Buffer.alloc(200);
      const length = fs.readSync(fd, header, 0, header.length, 0);
      if (header.subarray(0, length).toString().startsWith(pointerPrefix)) throw Error('LFS pointer needs hydration');
      if (length === 0) throw Error('empty resource');
      bytes += fs.fstatSync(fd).size;
    } catch (e) { errors.push(`${name}: ${e.code === 'ENOENT' ? 'missing' : e.message}`); }
    finally { if (fd !== undefined) fs.closeSync(fd); }
  }
  if (errors.length) throw Error(`Resources unavailable (${errors.length}):\n${errors.slice(0, 12).join('\n')}\nRun npm run assets:prepare -- ${profile}.`);
  return {status: 'MATERIALIZED', profile, files: names.length, bytes,
    meaning: 'Local bytes available; publication owners still validate source hashes, licenses and format.'};
}

export function auditResources(cwd = root, profile = 'all') {
  const verified = verifyResources(cwd, profile);
  const unique = new Map();
  for (const name of selectedFiles(cwd, profile)) {
    const raw = fs.readFileSync(path.join(cwd, name));
    unique.set(createHash('sha256').update(raw).digest('hex'), raw.length);
  }
  return {...verified, uniqueObjects: unique.size, uniqueBytes: [...unique.values()].reduce((a, b) => a + b, 0),
    freeAllowanceGiB: policy.freeAllowanceGiB, accountRemainingStorage: 'UNKNOWN', monthlyRemainingDownloads: 'UNKNOWN',
    upload: 'NOT_REQUESTED'};
}

export function prepareResources(cwd = root, profile = 'all') {
  resourcePatterns(profile);
  verifyPolicy(cwd);
  // Warm working copies are offline. No unconditional fetch on each dev run.
  try { return {...verifyResources(cwd, profile), networkRequested: false}; } catch { /* Fetch only the selected current-ref group. */ }
  git(cwd, ['lfs', 'pull', '--include=' + resourcePatterns(profile).join(','), '--exclude=' + policy.ordinaryGit.join(',')]);
  return {...verifyResources(cwd, profile), networkRequested: true};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [action = 'verify', profile = 'all', ...extra] = process.argv.slice(2);
    if (extra.length) throw Error('Usage: assets.mjs verify|audit|prepare|rules [all|images|catalogs|text-history]');
    if (action === 'rules') {
      const p = path.join(root, '.gitattributes');
      const old = fs.readFileSync(p, 'utf8');
      const start = old.indexOf(marker);
      const preserved = start < 0 ? old : old.slice(0, start);
      if (start >= 0 && !old.slice(start).trimEnd().endsWith('# End Starward managed resource LFS rules')) throw Error('Unexpected content after managed LFS rules');
      fs.writeFileSync(p, preserved.trimEnd() + '\n\n' + attributesBlock());
      console.log('LFS rules synchronized; no index, source bytes, network or history changed.');
    } else if (action === 'verify') console.log(JSON.stringify(verifyResources(root, profile)));
    else if (action === 'audit') console.log(JSON.stringify(auditResources(root, profile)));
    else if (action === 'prepare') console.log(JSON.stringify(prepareResources(root, profile)));
    else throw Error('Unknown resource action');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
